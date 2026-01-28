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

function isFund(label: string): boolean {
  const l = label.toLowerCase();
  const keywords = [
    'fund',
    'capital',
    'ventures',
    'investment',
    'a16z',
    'andreessen',
    'paradigm',
    'pantera',
    'polychain',
    'coinbase ventures',
    'framework',
    'sequoia',
    'tiger global',
    'dragonfly',
    'jump',
    'alameda',
    'three arrows',
    '3ac',
    'galaxy',
    'dcg',
    'grayscale',
  ];

  return keywords.some(keyword => l.includes(keyword));
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

      for (const tokenAddress of popularTokens.slice(0, 3)) {
        try {
          const response = await client.getTokenTransfers(chain, tokenAddress, {
            minValueUsd: 100000,
            limit: 50,
          });

          if (response.data && response.data.length > 0) {
            dataSource = 'Nansen';
            response.data.forEach((transfer) => {
              const fromLabel = transfer.from_address_label || 'Unknown Wallet';
              const toLabel = transfer.to_address_label || 'Unknown Wallet';

              // Only include if involves a fund
              if (!isFund(fromLabel) && !isFund(toLabel)) {
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
                  category: 'Institutional Flow',
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
