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
          // Get DeFi range transfers
          const response = await client.getTokenTransfers(chain, tokenAddress, {
            minValueUsd: 25000, // $25k+ for DeFi activities (lower than smart money)
            limit: 100,
          });

          if (response.data && response.data.length > 0) {
            dataSource = 'Nansen (DeFi/DEX)';

            response.data.forEach((transfer) => {
              // Filter to $25k-$200k range for DeFi (avoid overlap with smart money and whales)
              if (transfer.transfer_value_usd > 200000) {
                return; // Skip larger transfers
              }

              const fromLabel = transfer.from_address_label || 'Unknown Wallet';
              const toLabel = transfer.to_address_label || 'Unknown Wallet';

              // Prioritize DEX transactions or DeFi protocol interactions
              const isDeFiRelated = (label: string) => {
                const l = label.toLowerCase();
                return (
                  l.includes('dex') ||
                  l.includes('uniswap') ||
                  l.includes('curve') ||
                  l.includes('aave') ||
                  l.includes('compound') ||
                  l.includes('maker') ||
                  l.includes('liquidity') ||
                  l.includes('pool') ||
                  l.includes('defi') ||
                  l.includes('swap') ||
                  transfer.exchange_type === 'DEX'
                );
              };

              // Only include DeFi-related transactions
              if (!isDeFiRelated(fromLabel) && !isDeFiRelated(toLabel) && transfer.exchange_type !== 'DEX') {
                return;
              }

              // Filter out same-entity transfers
              if (fromLabel === toLabel && fromLabel !== 'Unknown Wallet') {
                return;
              }

              // Filter out exchange-to-exchange transfers
              const isExchange = (label: string) => {
                const l = label.toLowerCase();
                return l.includes('binance') || l.includes('coinbase') || l.includes('kraken') ||
                       l.includes('bybit') || l.includes('okx');
              };

              if (isExchange(fromLabel) && isExchange(toLabel)) {
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
                  symbol: transfer.token_symbol || 'Unknown',
                  address: transfer.token_address || '',
                  name: transfer.token_name || transfer.token_symbol || 'Unknown Token',
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
