import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/server/nansen/client';
import { normalizeTransfer, normalizeDEXTrade } from '@/server/nansen/normalizers';
import { EntityEnricher } from '@/server/enrichers/entity-enricher';
import { enrichTags } from '@/server/enrichers/tag-enricher';
import { Deduplicator } from '@/server/deduplicator';
import { MovementCache } from '@/server/cache';
import { calculateConfidence } from '@/server/utils';
import { fetchHyperliquidMovements } from '@/server/hyperliquid/client';
import { Movement, Chain } from '@/types/movement';
import { NansenTransfer } from '@/lib/nansen/types';

// Singletons (instantiated once per server instance)
const entityEnricher = new EntityEnricher();
const deduplicator = new Deduplicator();
const cache = new MovementCache();

// Fixed chains (no user selection)
const SUPPORTED_CHAINS: Chain[] = ['ethereum', 'solana', 'base', 'hyperliquid'];

// Thresholds per chain ($USD minimum)
const THRESHOLDS: Record<Chain, number> = {
  ethereum: 5_000_000,      // $5M minimum
  solana: 1_000_000,        // $1M minimum
  base: 1_000_000,          // $1M minimum
  hyperliquid: 1_000_000,   // $1M minimum
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Optional filters (applied client-side, but we can optimize)
  const filter = searchParams.get('filter'); // 'exchanges', 'funds', etc.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24h

  // Check cache
  const cacheKey = cache.getCacheKey({
    chains: SUPPORTED_CHAINS,
    filters: filter ? [filter] : undefined,
    since,
  });

  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('[API] Cache hit:', cacheKey);
    return NextResponse.json({
      movements: cached,
      cached: true,
      source: 'cache',
    });
  }

  console.log('[API] Fetching fresh data...');

  try {
    const client = getNansenClient();

    // DEX Trades endpoint only supports these chains
    const dexChains: Chain[] = ['ethereum', 'base'];

    // Fetch DEX trades (supports multiple chains in one call)
    const dexPromise = client.getDEXTrades({
      chains: dexChains,
      minUsd: Math.min(...Object.values(THRESHOLDS)),
      since,
      limit: 100,
    }).catch(err => {
      console.error('[API] Error fetching DEX trades:', err);
      return [];
    });

    // Fetch transfers (parallel across supported chains)
    // Note: Only ethereum and base have popular tokens configured
    const transferChains: Chain[] = ['ethereum', 'base'];
    const transferPromises = transferChains.map(chain =>
      client.getTransfers({
        chains: [chain],
        minUsd: THRESHOLDS[chain],
        since,
      }).catch(err => {
        console.error(`[API] Error fetching ${chain} transfers:`, err);
        return [];
      })
    );

    // Fetch Hyperliquid separately (custom adapter)
    // For now, return empty array as placeholder
    const hlPromise = fetchHyperliquidMovements(since, THRESHOLDS.hyperliquid)
      .catch(err => {
        console.error('[API] Error fetching Hyperliquid:', err);
        return [];
      });

    // Parallel execution - fetch all data sources
    const [dexResults, ...transferAndHLResults] = await Promise.all([
      dexPromise,
      ...transferPromises,
      hlPromise,
    ]);

    // Split transfer results and Hyperliquid results
    const hlResults = transferAndHLResults[transferAndHLResults.length - 1] as Movement[];
    const transferResultsOnly = transferAndHLResults.slice(0, -1) as NansenTransfer[][];
    const allTransfers = transferResultsOnly.flat();

    console.log('[API] Data fetched:', {
      dex: dexResults.length,
      transfers: allTransfers.length,
      hyperliquid: hlResults.length,
    });

    // Normalize all data to Movement format
    const normalizedTransfers: Movement[] = allTransfers.map(t => {
      const chain = t.chain.toLowerCase() as Chain;
      return normalizeTransfer(t, chain);
    });

    const normalizedDexTrades: Movement[] = dexResults.map(t => normalizeDEXTrade(t));

    let movements: Movement[] = [
      ...normalizedTransfers,
      ...normalizedDexTrades,
      ...hlResults,
    ];

    // Enrichment pipeline
    movements = movements
      .map(m => entityEnricher.enrichMovement(m))
      .map(m => enrichTags(m))
      .map(m => ({ ...m, confidence: calculateConfidence(m) }));

    // Deduplication (removes duplicates and same-entity movements)
    movements = deduplicator.deduplicate(movements);

    // Sort by timestamp (most recent first)
    movements.sort((a, b) => b.ts - a.ts);

    // Cache result
    cache.set(cacheKey, movements);

    console.log(`[API] Returning ${movements.length} movements`);

    return NextResponse.json({
      movements,
      cached: false,
      source: 'nansen',
      dataHealth: {
        lastFetch: new Date().toISOString(),
        counts: {
          ethereum: movements.filter(m => m.chain === 'ethereum').length,
          solana: movements.filter(m => m.chain === 'solana').length,
          base: movements.filter(m => m.chain === 'base').length,
          hyperliquid: movements.filter(m => m.chain === 'hyperliquid').length,
        },
      },
    }, {
      headers: {
        // Cache for 5 minutes on CDN, allow stale content for 10 minutes
        // This reduces API load while keeping data reasonably fresh
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });

  } catch (error) {
    console.error('[API] Fatal error:', error);
    if (error instanceof Error) {
      console.error('[API] Error message:', error.message);
      console.error('[API] Error stack:', error.stack);
    }
    return NextResponse.json(
      {
        error: 'Failed to fetch movements',
        movements: [],
        source: 'error',
      },
      { status: 500 }
    );
  }
}
