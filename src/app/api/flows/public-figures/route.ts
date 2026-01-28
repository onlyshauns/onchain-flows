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

    // Fetch transfers from public figures for each chain
    for (const chainParam of chains) {
      const chain = chainParam.toLowerCase() as Chain;
      const popularTokens = client.getPopularTokens(chain);

      if (popularTokens.length === 0) {
        console.log(`[API] No popular tokens configured for ${chain}`);
        continue;
      }

      // Get transfers for the main tokens
      for (const tokenAddress of popularTokens.slice(0, 2)) {
        try {
          console.log('[API] Fetching public figure transfers for:', tokenAddress.substring(0, 10) + '...');

          // Lower threshold to catch more public figure activity
          const response = await client.getTokenTransfers(chain, tokenAddress, {
            minValueUsd: 50000, // $50k+ for public figures
            limit: 50,
          });

          if (response.data && response.data.length > 0) {
            // Filter for transfers involving public figures (based on labels)
            response.data
              .filter(transfer =>
                (transfer.from_address_name &&
                 (transfer.from_address_name.toLowerCase().includes('vitalik') ||
                  transfer.from_address_name.toLowerCase().includes('buterin') ||
                  transfer.from_address_name.toLowerCase().includes('founder') ||
                  transfer.from_address_name.toLowerCase().includes('cz') ||
                  transfer.from_address_name.toLowerCase().includes('sun'))) ||
                (transfer.to_address_name &&
                 (transfer.to_address_name.toLowerCase().includes('vitalik') ||
                  transfer.to_address_name.toLowerCase().includes('buterin') ||
                  transfer.to_address_name.toLowerCase().includes('founder') ||
                  transfer.to_address_name.toLowerCase().includes('cz') ||
                  transfer.to_address_name.toLowerCase().includes('sun')))
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
                    category: 'Public Figure Activity',
                  },
                });
              });
          }
        } catch (error) {
          console.error(`[API] Error fetching public figures for ${chain}:`, error);
        }
      }
    }

    // If no public figure activity found, show general large transfers
    if (allFlows.length === 0) {
      console.log('[API] No public figure activity found, showing general large transfers');

      for (const chainParam of chains) {
        const chain = chainParam.toLowerCase() as Chain;
        const popularTokens = client.getPopularTokens(chain);

        if (popularTokens.length > 0) {
          try {
            const response = await client.getTokenTransfers(chain, popularTokens[0], {
              minValueUsd: 200000,
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
                    category: 'Large Transfer',
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

    console.log('[API] Total public figure flows:', allFlows.length);

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
    console.error('[API] Public figures error:', error);

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
