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
import { movementsToFlows } from '@/server/flows/mapper';
import { rankFlows } from '@/server/flows/scorer';

/**
 * Add tags to movements based on fetch source
 * This bypasses the label-matching problem in enrichTags
 */
function addSourceTags(movements: Movement[], source: {
  type: 'smart-money' | 'public-figure' | 'whale' | 'exchange';
  tier: number;
}): Movement[] {
  return movements.map(m => {
    const newTags = [...(m.tags || [])];

    // Add source-based tags
    if (source.type === 'smart-money' && !newTags.includes('smart_money')) {
      newTags.push('smart_money');
    }
    if (source.type === 'public-figure' && !newTags.includes('public_figure')) {
      newTags.push('public_figure');
    }
    if (source.type === 'exchange' && !newTags.includes('exchange')) {
      newTags.push('exchange');
    }

    // Tier 1 DEX trades are always smart money
    if (source.tier === 1 && m.movementType === 'swap' && !newTags.includes('smart_money')) {
      newTags.push('smart_money');
    }

    return { ...m, tags: newTags };
  });
}

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
    // Convert cached movements to flows and rank them
    const flows = movementsToFlows(cached);
    const rankedFlows = rankFlows(flows);
    return NextResponse.json({
      flows: rankedFlows,
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
      const normalized = trades.map(t => ({ ...normalizeDEXTrade(t), tier: 1 as const }));
      // Tag these as smart money since they're from Smart Money API filter
      return addSourceTags(normalized, { type: 'smart-money', tier: 1 });
    }).catch(err => {
      console.error('[API] Tier 1 error:', err);
      return [];
    });

    // PUBLIC FIGURES: Special fetch at $1K+ threshold
    console.log('[API] Fetching public figure movements at $1K+...');
    const publicFigurePromises = SUPPORTED_CHAINS.map(async chain => {
      try {
        const publicFigures = await client.getTransfers({
          chains: [chain],
          minUsd: 1_000,  // $1K threshold for public figures
          since,
          // Public figure and influencer labels
          fromIncludeSmartMoneyLabels: ['Public Figure', 'Influencer'],
          toIncludeSmartMoneyLabels: ['Public Figure', 'Influencer'],
        });
        console.log(`[API] Public figures ${chain}: ${publicFigures.length} movements`);
        const normalized = publicFigures.map(t => ({
          ...normalizeTransfer(t, chain),
          tier: 1 as const  // Treat as Tier 1 for high priority scoring
        }));
        // Tag these as public figures
        return addSourceTags(normalized, { type: 'public-figure', tier: 1 });
      } catch (err) {
        console.error(`[API] Public figures ${chain} error:`, err);
        return [];
      }
    });

    // TIER 2: Labeled Entity Transfers ($500K-$5M) - MEDIUM PRIORITY
    // Fetch transfers involving smart money, public figures, funds
    console.log('[API] Tier 2: Fetching labeled entity transfers...');
    const tier2Promises = SUPPORTED_CHAINS.map(async chain => {
      try {
        const labeledTransfers = await client.getTransfers({
          chains: [chain],
          minUsd: TIER_2_THRESHOLD,
          since,
          // Include transfers from/to labeled entities
          fromIncludeSmartMoneyLabels: SMART_MONEY_LABELS,
          toIncludeSmartMoneyLabels: SMART_MONEY_LABELS,
        });
        console.log(`[API] Tier 2 ${chain}: ${labeledTransfers.length} labeled transfers`);
        // Filter to avoid overlap with Tier 3 (only $500K-$5M range)
        const normalized = labeledTransfers
          .filter(t => t.transfer_value_usd < 5_000_000)
          .map(t => ({ ...normalizeTransfer(t, chain), tier: 2 as const }));
        // Tag these as smart money (fetched with Smart Money labels)
        return addSourceTags(normalized, { type: 'smart-money', tier: 2 });
      } catch (err) {
        console.error(`[API] Tier 2 ${chain} error:`, err);
        return [];
      }
    });

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

    // Wait for all tiers including public figures
    const [tier1Results, publicFigureResults, tier2Results, tier3Results] = await Promise.all([
      tier1Promise,
      Promise.all(publicFigurePromises),
      Promise.all(tier2Promises),
      Promise.all(tier3Promises),
    ]);

    // Flatten all transfers
    const normalizedTransfers: Movement[] = [
      ...tier1Results,
      ...publicFigureResults.flat(),
      ...tier2Results.flat(),
      ...tier3Results.flat(),
    ];

    console.log(`[API] Total normalized: ${normalizedTransfers.length} transfers`);

    // Enrichment pipeline
    let movements = normalizedTransfers
      .map(m => entityEnricher.enrichMovement(m))
      .map(m => enrichTags(m))
      .map(m => ({ ...m, confidence: calculateConfidence(m) }));

    console.log(`[API] Enriched ${movements.length} movements`);

    // Debug logging to see tag distribution
    const tagStats = movements.reduce((acc, m) => {
      m.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    console.log(`[API] Tag distribution:`, tagStats);

    // Debug: Check for $10M+ exchange movements
    const largeExchangeDeposits = movements.filter(m =>
      m.tags.includes('exchange_deposit') && m.amountUsd >= 10_000_000
    );
    const largeExchangeWithdrawals = movements.filter(m =>
      m.tags.includes('exchange_withdrawal') && m.amountUsd >= 10_000_000
    );
    console.log(`[API] Large ($10M+) deposits: ${largeExchangeDeposits.length}, withdrawals: ${largeExchangeWithdrawals.length}`);

    // Log sample movements with their tags
    console.log('[API] Sample movements with tags:', movements.slice(0, 3).map(m => ({
      from: m.fromLabel || 'unlabeled',
      to: m.toLabel || 'unlabeled',
      amount: m.amountUsd,
      tags: m.tags,
      type: m.movementType
    })));

    // Debug: Check for any movements with ENS names or interesting labels
    const ensMovements = movements.filter(m =>
      m.fromLabel?.includes('.eth') || m.toLabel?.includes('.eth')
    );
    console.log('[API] Movements with .eth ENS names:', ensMovements.length);
    if (ensMovements.length > 0) {
      console.log('[API] Sample ENS movement:', {
        from: ensMovements[0].fromLabel,
        to: ensMovements[0].toLabel,
        tags: ensMovements[0].tags,
      });
    }

    // Debug: List unique labels to see what Nansen actually returns
    const allLabels = new Set<string>();
    movements.forEach(m => {
      if (m.fromLabel) allLabels.add(m.fromLabel);
      if (m.toLabel) allLabels.add(m.toLabel);
    });
    console.log('[API] Total unique labels found:', allLabels.size);
    console.log('[API] Sample labels:', Array.from(allLabels).slice(0, 20));

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

    // Convert movements to flows with proper type classification
    const flows = movementsToFlows(movements);

    // Rank flows by interestingness score (adds score to metadata and sorts)
    const rankedFlows = rankFlows(flows);

    // Cache result (cache movements, not flows, to preserve enrichment data)
    cache.set(cacheKey, movements);

    console.log(`[API] Returning ${rankedFlows.length} flows`);
    console.log(`[API] Flow types: Smart Money=${rankedFlows.filter(f => f.type === 'smart-money').length}, Whale=${rankedFlows.filter(f => f.type === 'whale-movement').length}, DeFi=${rankedFlows.filter(f => f.type === 'defi-activity').length}`);
    console.log(`[API] Top 3 scores: ${rankedFlows.slice(0, 3).map(f => f.metadata?.score || 0).join(', ')}`);

    return NextResponse.json({
      flows: rankedFlows,
      cached: false,
      source: 'nansen',
      dataHealth: {
        lastFetch: new Date().toISOString(),
        counts: {
          ethereum: rankedFlows.filter(f => f.chain === 'ethereum').length,
          solana: rankedFlows.filter(f => f.chain === 'solana').length,
          base: rankedFlows.filter(f => f.chain === 'base').length,
        },
      },
    }, {
      headers: {
        // Cache for 2 minutes on CDN, allow stale content for 5 minutes
        // Shorter cache for more frequent updates of transactional data
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
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
        error: 'Failed to fetch flows',
        flows: [],
        source: 'error',
      },
      { status: 500 }
    );
  }
}
