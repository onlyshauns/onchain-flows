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

function isSmartMoney(label: string): boolean {
  const l = label.toLowerCase();
  const keywords = [
    'smart',
    'trader',
    'dex trader',
    'nft trader',
    'defi early',
    'lp expert',
    'profitable',
    'alpha',
    '90d smart',
    '30d smart',
  ];

  return keywords.some(keyword => l.includes(keyword));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Smart Money - chains:', chains);

  let allFlows: Flow[] = [];
  let dataSource = 'None';

  try {
    const client = getNansenClient();

    for (const chainParam of chains) {
      const chain = chainParam.toLowerCase() as Chain;
      const popularTokens = client.getPopularTokens(chain);

      if (popularTokens.length === 0) continue;

      for (const tokenAddress of popularTokens.slice(0, 3)) {
        try {
          // Smart money range: $50k-$500k (medium-sized strategic moves)
          const response = await client.getTokenTransfers(chain, tokenAddress, {
            minValueUsd: 50000, // $50k minimum
            limit: 100, // Get more to filter
          });

          if (response.data && response.data.length > 0) {
            dataSource = 'Nansen (Smart Money Range)';

            response.data.forEach((transfer) => {
              // Filter to $50k-$500k range ONLY (exclude whales)
              if (transfer.transfer_value_usd > 500000) {
                return; // Skip whale-sized transfers
              }

              const fromLabel = transfer.from_address_label || 'Unknown Wallet';
              const toLabel = transfer.to_address_label || 'Unknown Wallet';

              // Only include if involves smart money
              if (!isSmartMoney(fromLabel) && !isSmartMoney(toLabel)) {
                return;
              }

              // Filter out same-entity transfers
              if (isSameEntityTransfer(fromLabel, toLabel)) {
                return;
              }

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
                  label: fromLabel,
                },
                to: {
                  address: transfer.to_address,
                  label: toLabel,
                },
                txHash: transfer.transaction_hash,
                metadata: {
                  category: 'Smart Money',
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

  console.log('[API] Total smart money flows:', allFlows.length, 'Source:', dataSource);

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
