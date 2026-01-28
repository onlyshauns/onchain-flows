import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { Chain, Flow } from '@/types/flows';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] DeFi Activities - chains:', chains);

  let allFlows: Flow[] = [];
  let dataSource = 'None';

  try {
    const client = getNansenClient();

    for (const chainParam of chains) {
      const chain = chainParam.toLowerCase() as Chain;

      // Get DeFi activities for popular tokens
      const popularTokens = client.getPopularTokens(chain);

      if (popularTokens.length === 0) continue;

      for (const tokenAddress of popularTokens.slice(0, 3)) {
        try {
          // Get transfers involving DeFi protocols
          const response = await client.getTokenTransfers(chain, tokenAddress, {
            minValueUsd: 50000, // $50k+ for DeFi activities
            limit: 30,
          });

          if (response.data && response.data.length > 0) {
            dataSource = 'Nansen DeFi';

            response.data.forEach((transfer) => {
              const fromLabel = transfer.from_address_name || 'Unknown Wallet';
              const toLabel = transfer.to_address_name || 'Unknown Wallet';

              // Include all large transfers with labeled addresses
              // DeFi activities often show up as Unknown → Protocol or Protocol → Unknown
              const fromKnown = fromLabel !== 'Unknown Wallet';
              const toKnown = toLabel !== 'Unknown Wallet';

              // Filter out exchange-to-exchange transfers
              const isExchange = (label: string) => {
                const l = label.toLowerCase();
                return l.includes('binance') || l.includes('coinbase') || l.includes('kraken') ||
                       l.includes('bybit') || l.includes('okx');
              };

              const bothExchanges = isExchange(fromLabel) && isExchange(toLabel);
              const sameLabel = fromLabel === toLabel;

              if ((!fromKnown && !toKnown) || bothExchanges || sameLabel) {
                return;
              }

              allFlows.push({
                id: transfer.transaction_hash,
                type: 'defi-activity',
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
                  label: fromLabel,
                },
                to: {
                  address: transfer.to_address,
                  label: toLabel,
                },
                txHash: transfer.transaction_hash,
                metadata: {
                  category: 'DeFi Activity',
                },
              });
            });
          }
        } catch (error) {
          console.error(`[API] Nansen error for ${chain}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('[API] Nansen client error:', error);
  }

  // Sort by USD value and timestamp
  allFlows.sort((a, b) => {
    if (Math.abs(a.amountUsd - b.amountUsd) > 50000) {
      return b.amountUsd - a.amountUsd;
    }
    return b.timestamp - a.timestamp;
  });

  console.log('[API] Total DeFi activities:', allFlows.length, 'Source:', dataSource);

  return NextResponse.json(
    {
      flows: allFlows.slice(0, limit),
      total: allFlows.length,
      source: dataSource,
    },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}
