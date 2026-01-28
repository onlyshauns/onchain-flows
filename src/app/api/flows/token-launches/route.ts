import { NextRequest, NextResponse } from 'next/server';
import { getDexScreenerClient } from '@/lib/dexscreener/client';
import { Chain, Flow } from '@/types/flows';

// Map our chains to DexScreener chain IDs
const CHAIN_MAP: Record<string, string> = {
  ethereum: 'ethereum',
  solana: 'solana',
  base: 'base',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  polygon: 'polygon',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum', 'solana', 'base'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Token Launches - chains:', chains);

  try {
    const client = getDexScreenerClient();

    // Map to DexScreener chain names
    const dexChains = chains
      .map(c => CHAIN_MAP[c.toLowerCase()])
      .filter(Boolean);

    // Get latest pairs (token launches)
    const pairs = await client.getLatestPairs(dexChains);

    if (pairs.length === 0) {
      throw new Error('No pairs found from DexScreener');
    }

    // Transform to our Flow format
    const flows: Flow[] = pairs.map(pair => ({
      id: `launch-${pair.pairAddress}`,
      type: 'token-launch',
      chain: pair.chainId as Chain,
      timestamp: pair.pairCreatedAt,
      amount: pair.liquidity.usd,
      amountUsd: pair.liquidity.usd,
      token: {
        symbol: pair.baseToken.symbol,
        address: pair.baseToken.address,
        name: pair.baseToken.name,
      },
      from: {
        address: pair.dexId,
        label: `Launched on ${pair.dexId}`,
      },
      to: {
        address: pair.pairAddress,
        label: `Pair: ${pair.baseToken.symbol}/${pair.quoteToken.symbol}`,
      },
      txHash: pair.pairAddress,
      metadata: {
        category: 'Token Launch',
        liquidity: pair.liquidity.usd,
        volume24h: pair.volume?.h24,
        priceChange24h: pair.priceChange?.h24,
        marketCap: pair.marketCap,
        fdv: pair.fdv,
      },
    }));

    return NextResponse.json(
      {
        flows: flows.slice(0, limit),
        total: flows.length,
        source: 'DexScreener',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('[API] Token launches error:', error);

    // Fallback to mock data
    const mockFlows: Flow[] = chains.flatMap((chainParam) => {
      const chain = chainParam.toLowerCase() as Chain;

      const launches = [
        { name: 'PepeCoin 2.0', symbol: 'PEPE2', liquidity: 850000, volume: 2400000 },
        { name: 'AI Trading Bot', symbol: 'AIBOT', liquidity: 1200000, volume: 3100000 },
        { name: 'DegenDAO Token', symbol: 'DEGEN', liquidity: 680000, volume: 1900000 },
      ];

      return launches.map((launch, index) => ({
        id: `launch-${chain}-${index}`,
        type: 'token-launch' as const,
        chain,
        timestamp: Date.now() - (index * 3600000 + Math.random() * 1800000),
        amount: launch.liquidity,
        amountUsd: launch.liquidity,
        token: {
          symbol: launch.symbol,
          address: `0x${Math.random().toString(36).substring(7)}`,
          name: launch.name,
        },
        from: {
          address: '0xUniswap',
          label: 'Launched on Uniswap',
        },
        to: {
          address: '0xPair',
          label: `Pair: ${launch.symbol}/USDC`,
        },
        txHash: `0x${Date.now()}-${Math.random().toString(36).substring(7)}`,
        metadata: {
          category: 'Token Launch',
          liquidity: launch.liquidity,
          volume24h: launch.volume,
        },
      }));
    });

    return NextResponse.json(
      {
        flows: mockFlows.slice(0, limit),
        total: mockFlows.length,
        source: 'Mock Data',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        },
      }
    );
  }
}
