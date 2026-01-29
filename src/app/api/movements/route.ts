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

// Multi-tier thresholds for signal quality
const TIER_1_THRESHOLD = 1_000;     // $1K+ for smart money DEX trades
const TIER_2_THRESHOLD = 500_000;   // $500K+ for labeled entity transfers
const TIER_3_THRESHOLD: Record<Chain, number> = {
  ethereum: 5_000_000,              // $5M+ whale movements (fallback)
  solana: 2_000_000,                // $2M+ whale movements
  base: 2_000_000,                  // $2M+ whale movements
};

// Nansen Smart Money labels to track (Tier 1)
const SMART_MONEY_LABELS = [
  'Smart DEX Trader',
  'Smart LP',
  'Smart NFT Trader',
  'Smart Money',
];

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

    console.log('[API] Starting multi-tier data fetch...');

    // TIER 1: Smart Money DEX Trades ($100K+) - HIGHEST PRIORITY
    console.log('[API] Tier 1: Fetching smart money DEX trades...');
    const tier1Promise = client.getDEXTrades({
      chains: SUPPORTED_CHAINS,
      minUsd: TIER_1_THRESHOLD,
      since,
    }).then(trades => {
      console.log(`[API] Tier 1: ${trades.length} smart money DEX trades`);
      return trades.map(t => ({ ...normalizeDEXTrade(t), tier: 1 as const }));
    }).catch(err => {
      console.error('[API] Tier 1 error:', err);
      return [];
    });

    // TIER 2: Labeled Entity Transfers ($500K+) - MEDIUM PRIORITY
    // TODO: Implement proper label-based filtering via Nansen profiler API
    // For now, using lower threshold on tier 3 to capture more movements
    console.log('[API] Tier 2: Skipped (label filtering not yet implemented)');

    // TIER 3: Large Whale Movements ($2M+) - FALLBACK with LOWER threshold
    console.log('[API] Tier 3: Fetching whale movements...');
    const tier3Promises = SUPPORTED_CHAINS.map(async chain => {
      try {
        // Lower thresholds to capture more data until Tier 2 is implemented
        const threshold = chain === 'ethereum' ? 2_000_000 : 1_000_000;
        const transfers = await client.getTransfers({
          chains: [chain],
          minUsd: threshold,
          since,
        });
        console.log(`[API] Tier 3 ${chain}: ${transfers.length} whale movements`);
        return transfers.map(t => ({ ...normalizeTransfer(t, chain), tier: 3 as const }));
      } catch (err) {
        console.error(`[API] Tier 3 ${chain} error:`, err);
        return [];
      }
    });

    // Wait for all tiers
    const [tier1Results, tier3Results] = await Promise.all([
      tier1Promise,
      Promise.all(tier3Promises),
    ]);

    // Flatten all transfers
    const normalizedTransfers: Movement[] = [
      ...tier1Results,
      ...tier3Results.flat(),
    ];

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
    console.log(`[API] Tier breakdown: T1=${movements.filter(m => m.tier === 1).length}, T2=${movements.filter(m => m.tier === 2).length}, T3=${movements.filter(m => m.tier === 3).length}`);

    // Sort by tier first (1=highest priority), then by timestamp (most recent)
    movements.sort((a, b) => {
      if (a.tier !== b.tier) {
        return a.tier - b.tier; // Lower tier number = higher priority
      }
      return b.ts - a.ts; // Within same tier, most recent first
    });

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
