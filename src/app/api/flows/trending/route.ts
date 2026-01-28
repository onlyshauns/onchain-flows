import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { Chain, Flow } from '@/types/flows';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum', 'solana', 'base'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Trending - chains:', chains);

  try {
    const client = getNansenClient();
    const allFlows: Flow[] = [];

    // Fetch high-volume transfers for each chain
    for (const chainParam of chains) {
      const chain = chainParam.toLowerCase() as Chain;
      const popularTokens = client.getPopularTokens(chain);

      if (popularTokens.length === 0) {
        console.log(`[API] No popular tokens configured for ${chain}`);
        continue;
      }

      // Get transfers for multiple tokens to show trending activity
      for (const tokenAddress of popularTokens.slice(0, 3)) {
        try {
          console.log('[API] Fetching trending transfers for:', tokenAddress.substring(0, 10) + '...');

          const response = await client.getTokenTransfers(chain, tokenAddress, {
            minValueUsd: 100000, // $100k+ for trending
            limit: 30,
          });

          if (response.data && response.data.length > 0) {
            response.data.forEach((transfer) => {
              allFlows.push({
                id: transfer.transaction_hash,
                type: 'whale-movement',
                chain,
                timestamp: new Date(transfer.block_timestamp).getTime(),
                amount: parseFloat(transfer.transfer_amount),
                amountUsd: transfer.transfer_value_usd,
                token: {
                  symbol: transfer.token_symbol,
                  address: transfer.token_address,
                  name: transfer.token_name,
                },
                from: {
                  address: transfer.from_address,
                  label: transfer.from_address_name || 'Unknown Wallet',
                },
                to: {
                  address: transfer.to_address,
                  label: transfer.to_address_name || 'Unknown Wallet',
                },
                txHash: transfer.transaction_hash,
                metadata: {
                  category: 'Trending',
                },
              });
            });
          }
        } catch (error) {
          console.error(`[API] Error fetching trending for ${chain}:`, error);
        }
      }
    }

    // Sort by timestamp DESC (most recent first)
    allFlows.sort((a, b) => b.timestamp - a.timestamp);

    console.log('[API] Total trending flows:', allFlows.length);

    return NextResponse.json(
      {
        flows: allFlows.slice(0, limit),
        total: allFlows.length,
        source: 'Nansen',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('[API] Trending error:', error);

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
