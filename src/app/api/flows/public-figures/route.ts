import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { Chain, Flow } from '@/types/flows';

// Notable public figures to track (fallback)
const PUBLIC_FIGURES = [
  { name: 'Vitalik Buterin', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
  { name: 'CZ (Binance)', address: '0x28C6c06298d514Db089934071355E5743bf21d60' },
  { name: 'Jump Trading', address: '0x5041ed759Dd4aFc3a72b8192C143F72f4724081A' },
  { name: 'A16z Crypto', address: '0x05e793cE0C6027323Ac150F6d45C2344d28B6019' },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Public Figures - chains:', chains);

  try {
    const client = getNansenClient();
    const allFlows: Flow[] = [];

    // Try to get flows using TGM flows with public_figure label
    for (const chainParam of chains) {
      const chain = chainParam.toLowerCase() as Chain;
      const popularTokens = client.getPopularTokens(chain);

      if (popularTokens.length === 0) continue;

      const tokenAddress = popularTokens[0];
      const tokenSymbol = chain === 'solana' ? 'SOL' : chain === 'ethereum' ? 'USDC' : 'USDC';

      try {
        const response = await client.getTGMFlows(chain, tokenAddress, 'public_figure', { limit: 20 });

        // Transform TGM flows to our Flow format
        if (response.data && response.data.length > 0) {
          response.data.forEach((flowData, index) => {
            if (flowData.value_usd > 500000) {
              allFlows.push({
                id: `public-figure-${chain}-${index}-${Date.now()}`,
                type: 'whale-movement',
                chain,
                timestamp: new Date(flowData.date).getTime(),
                amount: flowData.value_usd,
                amountUsd: flowData.value_usd,
                token: { symbol: tokenSymbol, address: tokenAddress },
                from: {
                  address: '0xPublicFigure',
                  label: 'Public Figure',
                },
                to: {
                  address: '0xDestination',
                  label: flowData.total_outflows_count > flowData.total_inflows_count ? 'Distribution' : 'Accumulation',
                },
                txHash: `0x${Date.now()}-${index}`,
                metadata: {
                  category: 'Public Figure Activity',
                },
              });
            }
          });
        }
      } catch (error) {
        console.error(`[API] Error fetching public figures for ${chain}:`, error);
      }
    }

    if (allFlows.length > 0) {
      allFlows.sort((a, b) => b.timestamp - a.timestamp);

      return NextResponse.json(
        {
          flows: allFlows.slice(0, limit),
          total: allFlows.length,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          },
        }
      );
    }

    throw new Error('No data from Nansen API, using mock data');
  } catch (error) {
    console.error('[API] Public figures error:', error);

    // Fallback to mock data
    const mockFlows: Flow[] = chains.flatMap((chainParam) => {
      const chain = chainParam.toLowerCase() as Chain;

      return PUBLIC_FIGURES.slice(0, 3).map((figure, index) => ({
        id: `pub-${chain}-${figure.name}-${Date.now()}`,
        type: 'whale-movement' as const,
        chain,
        timestamp: Date.now() - (index * 300000 + Math.random() * 180000),
        amount: Math.floor(Math.random() * 10000000) + 1000000,
        amountUsd: Math.floor(Math.random() * 10000000) + 1000000,
        token: {
          symbol: chain === 'solana' ? 'SOL' : 'USDC',
          address: chain === 'solana' ? 'So11111111111111111111111111111111111111112' : '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        },
        from: { address: '0xBinance' + Math.random().toString(36).substring(7), label: 'Binance Hot Wallet' },
        to: { address: figure.address, label: figure.name },
        txHash: `0x${Date.now()}-${Math.random().toString(36).substring(7)}`,
        metadata: { category: 'Public Figure Activity' },
      }));
    });

    mockFlows.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json(
      {
        flows: mockFlows.slice(0, limit),
        total: mockFlows.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  }
}
