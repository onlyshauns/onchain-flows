import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { Chain, Flow } from '@/types/flows';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Whale movements - chains:', chains);

  try {
    const client = getNansenClient();
    const allFlows: Flow[] = [];

    // Fetch token transfers for each chain
    for (const chainParam of chains) {
      const chain = chainParam.toLowerCase() as Chain;
      const popularTokens = client.getPopularTokens(chain);

      if (popularTokens.length === 0) continue;

      const tokenAddress = popularTokens[0];

      try {
        const response = await client.getTokenTransfers(chain, tokenAddress, {
          minValueUsd: 1000000, // $1M+ for whales
          limit: 30,
        });

        if (response.data && response.data.length > 0) {
          response.data.forEach((transfer) => {
            allFlows.push({
              id: transfer.transaction_hash,
              type: 'whale-movement',
              chain,
              timestamp: new Date(transfer.block_timestamp).getTime(),
              amount: transfer.transfer_value_usd,
              amountUsd: transfer.transfer_value_usd,
              token: {
                symbol: transfer.token_symbol,
                address: transfer.token_address,
              },
              from: {
                address: transfer.from_address,
                label: transfer.from_address_name || 'Whale Wallet',
              },
              to: {
                address: transfer.to_address,
                label: transfer.to_address_name || 'Unknown',
              },
              txHash: transfer.transaction_hash,
            });
          });
        }
      } catch (error) {
        console.error(`[API] Error fetching whale movements for ${chain}:`, error);
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

    throw new Error('No whale movement data available');
  } catch (error) {
    console.error('Whale movements API error:', error);

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
