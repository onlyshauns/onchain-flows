import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { Chain, Flow } from '@/types/flows';

function isSameEntityTransfer(fromLabel: string, toLabel: string): boolean {
  if (!fromLabel || !toLabel || fromLabel === 'Unknown Wallet' || toLabel === 'Unknown Wallet') {
    return false;
  }

  const from = fromLabel.toLowerCase();
  const to = toLabel.toLowerCase();

  if (from === to) return true;

  const entities = [
    'binance', 'coinbase', 'kraken', 'bybit', 'okx', 'huobi', 'kucoin',
    'bitfinex', 'gemini', 'bitstamp', 'ftx', 'gate.io', 'crypto.com', 'mexc',
  ];

  for (const entity of entities) {
    if (from.includes(entity) && to.includes(entity)) {
      return true;
    }
  }

  return false;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Fund Movements - chains:', chains);

  let allFlows: Flow[] = [];
  let dataSource = 'None';

  try {
    const client = getNansenClient();

    for (const chainParam of chains) {
      const chain = chainParam.toLowerCase() as Chain;
      const popularTokens = client.getPopularTokens(chain);

      if (popularTokens.length === 0) continue;

      for (const tokenAddress of popularTokens.slice(0, 2)) {
        try {
          // Get high-value transfers
          const response = await client.getTokenTransfers(chain, tokenAddress, {
            minValueUsd: 500000, // Lowered to $500K to increase chances of finding data
            limit: 100,
          });

          console.log(`[DEBUG] ${chain} ${tokenAddress}: Response received, data length: ${response.data?.length || 0}`);

          if (response.data && response.data.length > 0) {
            dataSource = 'Nansen (Labeled Wallets $500K+)';

            console.log(`[DEBUG] ${chain} ${tokenAddress}: Received ${response.data.length} transfers from Nansen`);

            let filteredUnknown = 0;
            let filteredSameEntity = 0;
            let filteredTokenSymbol = 0;
            let added = 0;

            // Log first transfer to see what we're getting
            if (response.data.length > 0) {
              const sample = response.data[0];
              console.log(`[DEBUG] Sample transfer:`, {
                from_label: sample.from_address_label,
                to_label: sample.to_address_label,
                token_symbol: sample.token_symbol,
                value_usd: sample.transfer_value_usd,
              });
            }

            response.data.forEach((transfer) => {
              const fromLabel = transfer.from_address_label || 'Unknown Wallet';
              const toLabel = transfer.to_address_label || 'Unknown Wallet';

              // TEMPORARILY DISABLED: Only include if at least one side has a label
              // TODO: Re-enable once we confirm data is flowing
              // if (fromLabel === 'Unknown Wallet' && toLabel === 'Unknown Wallet') {
              //   filteredUnknown++;
              //   return;
              // }

              // Filter out same-entity transfers
              if (isSameEntityTransfer(fromLabel, toLabel)) {
                filteredSameEntity++;
                return;
              }

              // Skip if no token symbol available or if it's "Unknown"
              if (!transfer.token_symbol || transfer.token_symbol.trim() === '' || transfer.token_symbol === 'Unknown') {
                filteredTokenSymbol++;
                return;
              }

              added++;

              allFlows.push({
                id: transfer.transaction_hash,
                type: 'whale-movement',
                chain,
                timestamp: new Date(transfer.block_timestamp).getTime(),
                amount: parseFloat(transfer.transfer_amount),
                amountUsd: transfer.transfer_value_usd,
                token: {
                  symbol: transfer.token_symbol,
                  address: transfer.token_address || '',
                  name: transfer.token_name || transfer.token_symbol,
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
                  category: 'Institutional Flow',
                },
              });
            });

            console.log(`[DEBUG] ${chain} ${tokenAddress}: Filtered - Unknown: ${filteredUnknown}, SameEntity: ${filteredSameEntity}, TokenSymbol: ${filteredTokenSymbol}, Added: ${added}`);
          }
        } catch (error) {
          console.error(`[API] Nansen error for ${chain}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('[API] Nansen client error:', error);
  }

  allFlows.sort((a, b) => {
    if (Math.abs(a.amountUsd - b.amountUsd) > 100000) {
      return b.amountUsd - a.amountUsd;
    }
    return b.timestamp - a.timestamp;
  });

  console.log('[API] Total fund movements:', allFlows.length, 'Source:', dataSource);

  return NextResponse.json(
    {
      flows: allFlows.slice(0, limit),
      total: allFlows.length,
      source: dataSource,
    },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}
