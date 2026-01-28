import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { Chain, Flow } from '@/types/flows';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Fund Movements - chains:', chains);

  try {
    const client = getNansenClient();
    const allFlows: Flow[] = [];

    // Fetch large transfers that might be from funds
    for (const chainParam of chains) {
      const chain = chainParam.toLowerCase() as Chain;
      const popularTokens = client.getPopularTokens(chain);

      if (popularTokens.length === 0) {
        console.log(`[API] No popular tokens configured for ${chain}`);
        continue;
      }

      // Get very large transfers (typical for institutional funds)
      for (const tokenAddress of popularTokens.slice(0, 2)) {
        try {
          console.log('[API] Fetching fund transfers for:', tokenAddress.substring(0, 10) + '...');

          const response = await client.getTokenTransfers(chain, tokenAddress, {
            minValueUsd: 1000000, // $1M+ for institutional funds
            limit: 50,
          });

          if (response.data && response.data.length > 0) {
            // Filter for transfers involving funds (based on labels)
            response.data
              .filter(transfer =>
                (transfer.from_address_name &&
                 (transfer.from_address_name.toLowerCase().includes('fund') ||
                  transfer.from_address_name.toLowerCase().includes('capital') ||
                  transfer.from_address_name.toLowerCase().includes('grayscale') ||
                  transfer.from_address_name.toLowerCase().includes('blackrock') ||
                  transfer.from_address_name.toLowerCase().includes('fidelity') ||
                  transfer.from_address_name.toLowerCase().includes('ark') ||
                  transfer.from_address_name.toLowerCase().includes('paradigm') ||
                  transfer.from_address_name.toLowerCase().includes('a16z'))) ||
                (transfer.to_address_name &&
                 (transfer.to_address_name.toLowerCase().includes('fund') ||
                  transfer.to_address_name.toLowerCase().includes('capital') ||
                  transfer.to_address_name.toLowerCase().includes('grayscale') ||
                  transfer.to_address_name.toLowerCase().includes('blackrock') ||
                  transfer.to_address_name.toLowerCase().includes('fidelity') ||
                  transfer.to_address_name.toLowerCase().includes('ark') ||
                  transfer.to_address_name.toLowerCase().includes('paradigm') ||
                  transfer.to_address_name.toLowerCase().includes('a16z')))
              )
              .forEach((transfer) => {
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
                    category: 'Institutional Flow',
                  },
                });
              });
          }
        } catch (error) {
          console.error(`[API] Error fetching fund movements for ${chain}:`, error);
        }
      }
    }

    // If no fund activity found, show very large general transfers
    if (allFlows.length === 0) {
      console.log('[API] No fund activity found, showing very large transfers');

      for (const chainParam of chains) {
        const chain = chainParam.toLowerCase() as Chain;
        const popularTokens = client.getPopularTokens(chain);

        if (popularTokens.length > 0) {
          try {
            const response = await client.getTokenTransfers(chain, popularTokens[0], {
              minValueUsd: 2000000, // $2M+ as fallback
              limit: 20,
            });

            if (response.data) {
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
                    category: 'Large Institutional Transfer',
                  },
                });
              });
            }
          } catch (error) {
            console.error('[API] Error fetching fallback transfers:', error);
          }
        }
      }
    }

    // Sort by timestamp DESC (most recent first)
    allFlows.sort((a, b) => b.timestamp - a.timestamp);

    console.log('[API] Total fund movements:', allFlows.length);

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
    console.error('[API] Fund movements error:', error);

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
