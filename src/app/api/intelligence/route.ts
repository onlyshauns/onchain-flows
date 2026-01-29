import { NextRequest, NextResponse } from 'next/server';
import { fetchFlowIntelligence } from '@/server/flows/intelligence';
import { Chain } from '@/types/flows';

const SUPPORTED_CHAINS: Chain[] = ['ethereum', 'solana', 'base'];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Parse chain filters from query params
  const chainsParam = searchParams.get('chains');
  const chains = chainsParam
    ? (chainsParam.split(',').filter(c =>
        SUPPORTED_CHAINS.includes(c as Chain)
      ) as Chain[])
    : SUPPORTED_CHAINS;

  try {
    console.log('[Intelligence API] Fetching flow intelligence for chains:', chains);

    const intelligence = await fetchFlowIntelligence(chains);

    console.log('[Intelligence API] Successfully fetched intelligence');
    console.log('[Intelligence API] 1h - Whale net flow:', intelligence.aggregated['1h'].whale.netFlowUsd);
    console.log('[Intelligence API] 1h - Smart trader net flow:', intelligence.aggregated['1h'].smartTrader.netFlowUsd);
    console.log('[Intelligence API] 1h - Exchange net flow:', intelligence.aggregated['1h'].exchange.netFlowUsd);
    console.log('[Intelligence API] 24h - Whale net flow:', intelligence.aggregated['24h'].whale.netFlowUsd);
    console.log('[Intelligence API] 24h - Smart trader net flow:', intelligence.aggregated['24h'].smartTrader.netFlowUsd);
    console.log('[Intelligence API] 24h - Exchange net flow:', intelligence.aggregated['24h'].exchange.netFlowUsd);

    return NextResponse.json(intelligence, {
      headers: {
        // Cache for 10 minutes on CDN, allow stale for 20 minutes
        // Aggregate data changes slower than transactional data
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });
  } catch (error) {
    console.error('[Intelligence API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch flow intelligence',
        chains,
        metrics: [],
        aggregated: {
          '1h': {
            whale: { netFlowUsd: 0, walletCount: 0 },
            smartTrader: { netFlowUsd: 0, walletCount: 0 },
            exchange: { netFlowUsd: 0, walletCount: 0 },
            freshWallets: { netFlowUsd: 0, walletCount: 0 },
          },
          '24h': {
            whale: { netFlowUsd: 0, walletCount: 0 },
            smartTrader: { netFlowUsd: 0, walletCount: 0 },
            exchange: { netFlowUsd: 0, walletCount: 0 },
            freshWallets: { netFlowUsd: 0, walletCount: 0 },
          },
        },
        lastUpdated: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
