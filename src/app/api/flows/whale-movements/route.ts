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

    // Fetch large token transfers for each chain
    for (const chainParam of chains) {
      const chain = chainParam.toLowerCase() as Chain;
      const popularTokens = client.getPopularTokens(chain);

      if (popularTokens.length === 0) {
        console.log(`[API] No popular tokens configured for ${chain}`);
        continue;
      }

      // Get transfers for the top 2 tokens (usually USDC, USDT, or WBTC)
      for (const tokenAddress of popularTokens.slice(0, 2)) {
        try {
          console.log('[API] Fetching transfers for token:', tokenAddress.substring(0, 10) + '...');

          const response = await client.getTokenTransfers(chain, tokenAddress, {
            minValueUsd: 500000, // $500k+ for whale movements
            limit: 50,
          });

          if (response.data && response.data.length > 0) {
            console.log('[API] Found', response.data.length, 'transfers');

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
                  category: 'Whale Movement',
                },
              });
            });
          }
        } catch (error) {
          console.error(`[API] Error fetching whale movements for ${chain}:`, error);
        }
      }
    }

    // Sort by timestamp DESC (most recent first)
    allFlows.sort((a, b) => b.timestamp - a.timestamp);

    console.log('[API] Total whale movements:', allFlows.length);

    return NextResponse.json(
      {
        flows: allFlows.slice(0, limit),
        total: allFlows.length,
        source: 'Nansen',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('[API] Whale movements error:', error);

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
