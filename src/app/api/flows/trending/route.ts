import { NextRequest, NextResponse } from 'next/server';
import { getDexScreenerClient } from '@/lib/dexscreener/client';
import { Chain, Flow } from '@/types/flows';

// Map DexScreener chains to our chain types
const CHAIN_MAP: Record<string, Chain> = {
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

  console.log('[API] Trending - chains:', chains);

  try {
    const client = getDexScreenerClient();

    // Map to DexScreener chain names
    const dexChains = chains
      .map(c => CHAIN_MAP[c.toLowerCase() as Chain])
      .filter(Boolean);

    // Get trending pairs with high volume
    const pairs = await client.getTrendingPairs(dexChains);

    if (pairs.length === 0) {
      throw new Error('No trending pairs found from DexScreener');
    }

    // Transform to our Flow format
    const flows: Flow[] = pairs.map(pair => ({
      id: `trending-${pair.pairAddress}`,
      type: 'defi-activity',
      chain: pair.chainId as Chain,
      timestamp: pair.pairCreatedAt || Date.now(),
      amount: pair.volume?.h24 || 0,
      amountUsd: pair.volume?.h24 || 0,
      token: {
        symbol: pair.baseToken.symbol,
        address: pair.baseToken.address,
        name: pair.baseToken.name,
      },
      from: {
        address: pair.dexId,
        label: `Trading on ${pair.dexId}`,
      },
      to: {
        address: pair.pairAddress,
        label: `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`,
      },
      txHash: pair.pairAddress,
      metadata: {
        category: 'Trending',
        liquidity: pair.liquidity?.usd,
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
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('[API] Trending error:', error);

    // Return empty array when no data available
    return NextResponse.json(
      {
        flows: [],
        total: 0,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  }
}
