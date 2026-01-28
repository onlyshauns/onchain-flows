import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { getEtherscanClient } from '@/lib/etherscan/client';
import { getLabelForAddress } from '@/lib/etherscan/addresses';
import { Chain, Flow } from '@/types/flows';

/**
 * Check if a transfer is between the same entity (e.g., Binance to Binance)
 */
function isSameEntityTransfer(fromLabel: string, toLabel: string): boolean {
  if (!fromLabel || !toLabel || fromLabel === 'Unknown Wallet' || toLabel === 'Unknown Wallet') {
    return false;
  }

  const from = fromLabel.toLowerCase();
  const to = toLabel.toLowerCase();

  // Exact match (same label on both sides)
  if (from === to) {
    return true;
  }

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
  const chains = searchParams.get('chains')?.split(',') || ['ethereum', 'solana', 'base'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Trending - chains:', chains);

  let allFlows: Flow[] = [];
  let dataSource = 'None';

  // Try Nansen first
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
            limit: 30,
          });

          if (response.data && response.data.length > 0) {
            dataSource = 'Nansen';
            response.data.forEach((transfer) => {
              const fromLabel = transfer.from_address_label || 'Unknown Wallet';
              const toLabel = transfer.to_address_label || 'Unknown Wallet';

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
                  category: 'Trending',
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

  // Fallback to Etherscan if no Nansen data
  if (allFlows.length === 0 && chains.includes('ethereum')) {
    console.log('[API] Falling back to Etherscan for trending');

    try {
      const etherscanClient = getEtherscanClient();
      const transactions = await etherscanClient.getRecentWhaleMovements();

      dataSource = 'Etherscan (Recent 24h)';

      transactions.slice(0, 40).forEach(({ tx, label }) => {
        const value = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
        const timestamp = parseInt(tx.timeStamp) * 1000;

        if (value > 5000 || tx.tokenSymbol === 'USDC' || tx.tokenSymbol === 'USDT') {
          const fromLabel = getLabelForAddress(tx.from) || label;
          const toLabel = getLabelForAddress(tx.to) || 'Unknown Wallet';

          // Filter out same-entity transfers
          if (isSameEntityTransfer(fromLabel, toLabel)) {
            return;
          }

          allFlows.push({
            id: tx.hash,
            type: 'whale-movement',
            chain: 'ethereum',
            timestamp,
            amount: value,
            amountUsd: value * 1,
            token: {
              symbol: tx.tokenSymbol,
              address: tx.contractAddress,
              name: tx.tokenName,
            },
            from: {
              address: tx.from,
              label: fromLabel,
            },
            to: {
              address: tx.to,
              label: toLabel,
            },
            txHash: tx.hash,
            metadata: {
              category: 'Trending',
            },
          });
        }
      });
    } catch (error) {
      console.error('[API] Etherscan fallback error:', error);
    }
  }

  // Sort by priority: known labels > USD value > timestamp
  allFlows.sort((a, b) => {
    const aHasLabel = a.from.label !== 'Unknown Wallet' || a.to.label !== 'Unknown Wallet';
    const bHasLabel = b.from.label !== 'Unknown Wallet' || b.to.label !== 'Unknown Wallet';

    if (aHasLabel && !bHasLabel) return -1;
    if (!aHasLabel && bHasLabel) return 1;

    if (Math.abs(a.amountUsd - b.amountUsd) > 1000000) {
      return b.amountUsd - a.amountUsd;
    }

    return b.timestamp - a.timestamp;
  });

  console.log('[API] Total trending flows:', allFlows.length, 'Source:', dataSource);

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
