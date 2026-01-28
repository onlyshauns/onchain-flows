import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { getEtherscanClient } from '@/lib/etherscan/client';
import { getLabelForAddress } from '@/lib/etherscan/addresses';
import { Chain, Flow } from '@/types/flows';

/**
 * Check if a transfer is between the same entity (e.g., Binance to Binance)
 * Returns true if it's an internal transfer that should be filtered out
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

  // List of entities to check for internal transfers
  const entities = [
    'binance',
    'coinbase',
    'kraken',
    'bybit',
    'okx',
    'huobi',
    'kucoin',
    'bitfinex',
    'gemini',
    'bitstamp',
    'ftx',
    'gate.io',
    'crypto.com',
    'mexc',
  ];

  // Check if both labels contain the same entity name
  for (const entity of entities) {
    if (from.includes(entity) && to.includes(entity)) {
      return true; // Same entity, filter out
    }
  }

  return false;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Whale movements - chains:', chains);

  let allFlows: Flow[] = [];
  let dataSource = 'None';

  // Try Nansen first
  try {
    const client = getNansenClient();

    for (const chainParam of chains) {
      const chain = chainParam.toLowerCase() as Chain;
      const popularTokens = client.getPopularTokens(chain);

      if (popularTokens.length === 0) continue;

      for (const tokenAddress of popularTokens.slice(0, 2)) {
        try {
          const response = await client.getTokenTransfers(chain, tokenAddress, {
            minValueUsd: 1000000, // $1M+ for TRUE whale movements
            limit: 50,
          });

          if (response.data && response.data.length > 0) {
            dataSource = 'Nansen';

            // Debug: log first 3 transfers token data
            console.log('[API] Sample transfer token data:', {
              sample1: {
                symbol: response.data[0]?.token_symbol,
                name: response.data[0]?.token_name,
                address: response.data[0]?.token_address,
              },
              sample2: {
                symbol: response.data[1]?.token_symbol,
                name: response.data[1]?.token_name,
                address: response.data[1]?.token_address,
              },
              sample3: {
                symbol: response.data[2]?.token_symbol,
                name: response.data[2]?.token_name,
                address: response.data[2]?.token_address,
              },
            });

            let skipped = 0;
            let added = 0;

            response.data.forEach((transfer) => {
              const fromLabel = transfer.from_address_label || 'Unknown Wallet';
              const toLabel = transfer.to_address_label || 'Unknown Wallet';

              // Filter out same-entity transfers (high signal, low noise)
              if (isSameEntityTransfer(fromLabel, toLabel)) {
                console.log(`[API] Filtering out internal transfer: ${fromLabel} → ${toLabel}`);
                return;
              }

              // Skip if no token symbol available or if it's "Unknown"
              if (!transfer.token_symbol || transfer.token_symbol.trim() === '' || transfer.token_symbol === 'Unknown') {
                skipped++;
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
                  category: 'Whale Movement',
                },
              });
            });

            console.log(`[API] Whale movements processing: ${added} added, ${skipped} skipped (Unknown tokens)`);
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
    console.log('[API] Falling back to Etherscan for recent whale movements');

    try {
      const etherscanClient = getEtherscanClient();
      const transactions = await etherscanClient.getRecentWhaleMovements();

      dataSource = 'Etherscan (Recent 24h)';

      transactions.forEach(({ tx, label }) => {
        const value = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
        const timestamp = parseInt(tx.timeStamp) * 1000;

        // Calculate USD value (stablecoin assumption for Etherscan data)
        const valueUsd = value * 1;

        // Only include whale-sized transactions ($1M+)
        if (valueUsd < 1000000) {
          return;
        }

        // Skip if no token symbol
        if (!tx.tokenSymbol || tx.tokenSymbol === 'Unknown') {
          return;
        }

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
          amountUsd: valueUsd,
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
            category: 'Whale Movement',
          },
        });
      });
    } catch (error) {
      console.error('[API] Etherscan fallback error:', error);
    }
  }

  // Sort by priority:
  // 1. Has known labels (not "Unknown Wallet")
  // 2. Higher USD value
  // 3. More recent timestamp
  allFlows.sort((a, b) => {
    const aHasLabel = a.from.label !== 'Unknown Wallet' || a.to.label !== 'Unknown Wallet';
    const bHasLabel = b.from.label !== 'Unknown Wallet' || b.to.label !== 'Unknown Wallet';

    // Prioritize flows with labels
    if (aHasLabel && !bHasLabel) return -1;
    if (!aHasLabel && bHasLabel) return 1;

    // If both have labels or both don't, sort by USD value
    if (Math.abs(a.amountUsd - b.amountUsd) > 1000000) {
      return b.amountUsd - a.amountUsd;
    }

    // If similar value, sort by timestamp
    return b.timestamp - a.timestamp;
  });

  console.log('[API] Total whale movements:', allFlows.length, 'Source:', dataSource);

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
