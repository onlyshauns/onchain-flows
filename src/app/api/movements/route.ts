import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/server/nansen/client';
import { normalizeTransfer, normalizeDEXTrade } from '@/server/nansen/normalizers';
import { EntityEnricher } from '@/server/enrichers/entity-enricher';
import { enrichTags } from '@/server/enrichers/tag-enricher';
import { Deduplicator } from '@/server/deduplicator';
import { MovementCache } from '@/server/cache';
import { calculateConfidence } from '@/server/utils';
import { Movement, Chain } from '@/types/movement';
import { NansenTransfer } from '@/lib/nansen/types';

// Singletons (instantiated once per server instance)
const entityEnricher = new EntityEnricher();
const deduplicator = new Deduplicator();
const cache = new MovementCache();

// Fixed chains (no user selection)
const SUPPORTED_CHAINS: Chain[] = ['ethereum', 'solana', 'base'];

// Thresholds per chain ($USD minimum)
const THRESHOLDS: Record<Chain, number> = {
  ethereum: 5_000_000,      // $5M minimum
  solana: 1_000_000,        // $1M minimum
  base: 1_000_000,          // $1M minimum
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

    console.log('[API] Starting data fetch...');

    // Fetch from all supported chains
    const fetchPromises = SUPPORTED_CHAINS.map(async chain => {
      try {
        console.log(`[API] Fetching ${chain}...`);
        const chainTransfers = await client.getTransfers({
          chains: [chain],
          minUsd: THRESHOLDS[chain],
          since,
        });
        console.log(`[API] ${chain}: ${chainTransfers.length} transfers`);

        // Normalize with correct chain
        return chainTransfers.map(t => normalizeTransfer(t, chain));
      } catch (err) {
        console.error(`[API] ${chain} fetch error:`, err);
        return [];
      }
    });

    // Wait for all fetches
    const chainResults = await Promise.all(fetchPromises);

    // Flatten all transfers
    const normalizedTransfers: Movement[] = chainResults.flat();

    console.log(`[API] Total normalized: ${normalizedTransfers.length} transfers`);

    // Enrichment pipeline
    let movements = normalizedTransfers
      .map(m => entityEnricher.enrichMovement(m))
      .map(m => enrichTags(m))
      .map(m => ({ ...m, confidence: calculateConfidence(m) }));

    console.log(`[API] Enriched ${movements.length} movements`);

    // Deduplication (removes duplicates and same-entity movements)
    movements = deduplicator.deduplicate(movements);

    console.log(`[API] After deduplication: ${movements.length} movements`);

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
