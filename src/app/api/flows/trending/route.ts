import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { Chain, Flow } from '@/types/flows';

// Transform Nansen flow intelligence data to flows
function transformFlowIntelligenceToFlows(
  chain: Chain,
  tokenAddress: string,
  tokenSymbol: string,
  data: any
): Flow[] {
  const flows: Flow[] = [];
  const baseTimestamp = Date.now();

  // Whale flows
  if (data.whale_net_flow_usd && Math.abs(data.whale_net_flow_usd) > 1000000) {
    flows.push({
      id: `trending-whale-${chain}-${Date.now()}`,
      type: 'whale-movement',
      chain,
      timestamp: baseTimestamp - 60000,
      amount: Math.abs(data.whale_net_flow_usd),
      amountUsd: Math.abs(data.whale_net_flow_usd),
      token: { symbol: tokenSymbol, address: tokenAddress },
      from: {
        address: data.whale_net_flow_usd > 0 ? '0xWhaleWallet' : '0xExchange',
        label: data.whale_net_flow_usd > 0 ? 'Whale Accumulation' : 'Whale Distribution',
      },
      to: {
        address: data.whale_net_flow_usd > 0 ? '0xWallet' : '0xExchange',
        label: data.whale_net_flow_usd > 0 ? 'Wallet' : 'Exchange',
      },
      txHash: `0xtrending-whale-${Date.now()}`,
      metadata: {
        category: 'Trending',
        anomalyScore: 90,
      },
    });
  }

  // Public figure flows
  if (data.public_figure_net_flow_usd && Math.abs(data.public_figure_net_flow_usd) > 500000) {
    flows.push({
      id: `trending-figure-${chain}-${Date.now()}`,
      type: 'whale-movement',
      chain,
      timestamp: baseTimestamp - 120000,
      amount: Math.abs(data.public_figure_net_flow_usd),
      amountUsd: Math.abs(data.public_figure_net_flow_usd),
      token: { symbol: tokenSymbol, address: tokenAddress },
      from: {
        address: '0xPublicFigure',
        label: 'Public Figure',
      },
      to: {
        address: '0xDeFi',
        label: 'DeFi Protocol',
      },
      txHash: `0xtrending-figure-${Date.now()}`,
      metadata: {
        category: 'Public Figure Activity',
        anomalyScore: 85,
      },
    });
  }

  // Exchange flows
  if (data.exchange_net_flow_usd && Math.abs(data.exchange_net_flow_usd) > 2000000) {
    flows.push({
      id: `trending-exchange-${chain}-${Date.now()}`,
      type: 'whale-movement',
      chain,
      timestamp: baseTimestamp - 180000,
      amount: Math.abs(data.exchange_net_flow_usd),
      amountUsd: Math.abs(data.exchange_net_flow_usd),
      token: { symbol: tokenSymbol, address: tokenAddress },
      from: {
        address: '0xBinance',
        label: data.exchange_net_flow_usd > 0 ? 'Binance' : 'User Wallet',
      },
      to: {
        address: '0xWallet',
        label: data.exchange_net_flow_usd > 0 ? 'Accumulation' : 'Binance',
      },
      txHash: `0xtrending-exchange-${Date.now()}`,
      metadata: {
        category: 'Institutional Flow',
        anomalyScore: 88,
      },
    });
  }

  return flows;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Trending - chains:', chains);

  try {
    const client = getNansenClient();
    const allFlows: Flow[] = [];

    // Fetch flow intelligence for popular tokens on each chain
    for (const chainParam of chains) {
      const chain = chainParam.toLowerCase() as Chain;
      const popularTokens = client.getPopularTokens(chain);

      if (popularTokens.length === 0) {
        console.log(`[API] No popular tokens configured for ${chain}`);
        continue;
      }

      // Get the first token (usually USDC or main token)
      const tokenAddress = popularTokens[0];
      const tokenSymbol = chain === 'solana' ? 'SOL' : chain === 'ethereum' ? 'USDC' : 'USDC';

      try {
        const response = await client.getFlowIntelligence(chain, tokenAddress, '1h');

        if (response.data && response.data.length > 0) {
          const flows = transformFlowIntelligenceToFlows(chain, tokenAddress, tokenSymbol, response.data[0]);
          allFlows.push(...flows);
        }
      } catch (error) {
        console.error(`[API] Error fetching flow intelligence for ${chain}:`, error);
      }
    }

    // If we got real data, return it
    if (allFlows.length > 0) {
      allFlows.sort((a, b) => b.amountUsd - a.amountUsd);

      return NextResponse.json(
        {
          flows: allFlows.slice(0, limit),
          total: allFlows.length,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          },
        }
      );
    }

    // Fall back to mock data
    throw new Error('No data from Nansen API, using mock data');
  } catch (error) {
    console.error('[API] Trending error:', error);

    // Return mock data as fallback
    const mockFlows: Flow[] = chains.flatMap((chainParam, chainIndex) => {
      const chain = chainParam.toLowerCase() as Chain;
      const trendingMoves = [
        { label: 'BlackRock IBIT', amount: 85000000, token: 'WBTC' },
        { label: 'Binance Hot Wallet', amount: 45000000, token: 'USDC' },
        { label: 'Jump Trading', amount: 32000000, token: 'SOL' },
        { label: 'Vitalik Buterin', amount: 15000000, token: 'ETH' },
      ];

      return trendingMoves.slice(0, 3).map((move, index) => ({
        id: `trending-${chain}-${index}-${Date.now()}`,
        type: 'whale-movement' as const,
        chain,
        timestamp: Date.now() - ((chainIndex * 3 + index) * 180000),
        amount: move.amount,
        amountUsd: move.amount,
        token: {
          symbol: move.token,
          address: chain === 'solana' ? 'So11111111111111111111111111111111111111112' : '0x...',
        },
        from: { address: '0x...', label: move.label },
        to: { address: '0x...', label: index % 2 === 0 ? 'DeFi Protocol' : 'CEX Deposit' },
        txHash: `0x${Date.now()}-${Math.random().toString(36).substring(7)}`,
        metadata: { category: 'Trending', anomalyScore: 85 + Math.floor(Math.random() * 15) },
      }));
    });

    mockFlows.sort((a, b) => b.amountUsd - a.amountUsd);

    return NextResponse.json(
      {
        flows: mockFlows.slice(0, limit),
        total: mockFlows.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  }
}
