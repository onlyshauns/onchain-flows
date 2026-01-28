import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { getEtherscanClient } from '@/lib/etherscan/client';
import { FUNDS, getLabelForAddress } from '@/lib/etherscan/addresses';
import { Chain, Flow } from '@/types/flows';

/**
 * Check if a transfer is between the same entity
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
  const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Fund Movements - chains:', chains);

  let allFlows: Flow[] = [];
  let dataSource = 'None';

  // Try Nansen first - track specific fund addresses
  try {
    const client = getNansenClient();

    for (const chainParam of chains) {
      const chain = chainParam.toLowerCase() as Chain;

      // Track each fund address individually
      for (const fund of FUNDS) {
        try {
          console.log(`[API] Tracking ${fund.label} on ${chain}...`);

          const response = await client.getAddressTransactions(chain, fund.address, {
            minVolumeUsd: 50000, // $50k+ transactions
            limit: 20,
          });

          if (response.data && response.data.length > 0) {
            dataSource = 'Nansen';

            response.data.forEach((tx: any) => {
              const fromLabel = tx.from_address === fund.address.toLowerCase()
                ? fund.label
                : (tx.from_address_name || 'Unknown Wallet');
              const toLabel = tx.to_address === fund.address.toLowerCase()
                ? fund.label
                : (tx.to_address_name || 'Unknown Wallet');

              // Filter out same-entity transfers
              if (isSameEntityTransfer(fromLabel, toLabel)) {
                return;
              }

              allFlows.push({
                id: tx.transaction_hash,
                type: 'whale-movement',
                chain,
                timestamp: new Date(tx.block_timestamp).getTime(),
                amount: parseFloat(tx.transfer_amount || '0'),
                amountUsd: tx.volume_usd || 0,
                token: {
                  symbol: tx.token_symbol || 'ETH',
                  address: tx.token_address || '',
                  name: tx.token_name || '',
                },
                from: {
                  address: tx.from_address,
                  label: fromLabel,
                },
                to: {
                  address: tx.to_address,
                  label: toLabel,
                },
                txHash: tx.transaction_hash,
                metadata: {
                  category: 'Institutional Flow',
                },
              });
            });
          }
        } catch (error) {
          console.error(`[API] Nansen error for ${fund.label} on ${chain}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('[API] Nansen client error:', error);
  }

  // Fallback to Etherscan if no Nansen data
  if (allFlows.length === 0 && chains.includes('ethereum')) {
    console.log('[API] Falling back to Etherscan for fund movements');

    try {
      const etherscanClient = getEtherscanClient();

      // Track known fund addresses
      const transactions = await etherscanClient.getMultipleAddressTransactions(
        FUNDS,
        20
      );

      dataSource = 'Etherscan (Recent 24h)';

      transactions.forEach(({ tx, label }) => {
        const value = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
        const timestamp = parseInt(tx.timeStamp) * 1000;

        if (value > 10000) {
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
              category: 'Institutional Flow',
            },
          });
        }
      });
    } catch (error) {
      console.error('[API] Etherscan fallback error:', error);
    }
  }

  // Sort by priority: fund involvement > USD value > timestamp
  allFlows.sort((a, b) => {
    // Prioritize flows involving funds
    const aHasFund = FUNDS.some(f =>
      a.from.label === f.label || a.to.label === f.label
    );
    const bHasFund = FUNDS.some(f =>
      b.from.label === f.label || b.to.label === f.label
    );

    if (aHasFund && !bHasFund) return -1;
    if (!aHasFund && bHasFund) return 1;

    // Then by USD value
    if (Math.abs(a.amountUsd - b.amountUsd) > 50000) {
      return b.amountUsd - a.amountUsd;
    }

    // Then by timestamp
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
