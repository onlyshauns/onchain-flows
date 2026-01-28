import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { Chain, Flow } from '@/types/flows';

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

    throw new Error('No public figure data available');
  } catch (error) {
    console.error('[API] Public figures error:', error);

    // Return empty array when no data available
    return NextResponse.json(
      {
        flows: [],
        total: 0,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  }
}
