import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { getEtherscanClient } from '@/lib/etherscan/client';
import { getLabelForAddress } from '@/lib/etherscan/addresses';
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

  let allFlows: Flow[] = [];
  let dataSource = 'None';

  try {
    const client = getNansenClient();

    // Make API calls in parallel for better performance (4x faster!)
    const promises = chains.flatMap(chainParam => {
      const chain = chainParam.toLowerCase() as Chain;
      const popularTokens = client.getPopularTokens(chain);

      if (popularTokens.length === 0) return [];

      // Only check top token per chain for fast loading
      return [popularTokens[0]].map(tokenAddress =>
        client.getTokenTransfers(chain, tokenAddress, {
          minValueUsd: 1000000, // $1M+ for whale movements
          limit: 50,
        }).then(response => ({ chain, response }))
          .catch(error => {
            console.error(`[API] Nansen error for ${chain}:`, error);
            return null;
          })
      );
    });

    const results = await Promise.all(promises);

    for (const result of results) {
      if (!result || !result.response.data) continue;

      const { chain, response } = result;

      if (response.data.length > 0) {
        dataSource = 'Nansen';

        response.data.forEach((transfer) => {
          const fromLabel = transfer.from_address_label || 'Unknown Wallet';
          const toLabel = transfer.to_address_label || 'Unknown Wallet';

          // Filter out same-entity transfers
          if (isSameEntityTransfer(fromLabel, toLabel)) {
            return;
          }

          // Skip if no token symbol or "Unknown"
          if (!transfer.token_symbol || transfer.token_symbol.trim() === '' || transfer.token_symbol === 'Unknown') {
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
      }
    }
  } catch (error) {
    console.error('[API] Nansen client error:', error);
  }

  // Fallback to Etherscan if no Nansen data
  if (allFlows.length === 0 && chains.includes('ethereum')) {
    try {
      const etherscanClient = getEtherscanClient();
      const transactions = await etherscanClient.getRecentWhaleMovements();

      dataSource = 'Etherscan (Recent 24h)';

      transactions.forEach(({ tx, label }) => {
        const value = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
        const timestamp = parseInt(tx.timeStamp) * 1000;

        // ONLY show stablecoins from Etherscan (we don't have real token prices)
        const stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'PYUSD'];
        if (!stablecoins.includes(tx.tokenSymbol)) {
          return; // Skip non-stablecoins to avoid showing token amount as USD value
        }

        // For stablecoins, token amount ≈ USD value
        const valueUsd = value;

        // Only include whale-sized transactions ($1M+)
        if (valueUsd < 1000000) {
          return;
        }

        if (!tx.tokenSymbol || tx.tokenSymbol === 'Unknown') {
          return;
        }

        const fromLabel = getLabelForAddress(tx.from) || label;
        const toLabel = getLabelForAddress(tx.to) || 'Unknown Wallet';

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
            category: 'Whale Movement (Etherscan)',
          },
        });
      });
    } catch (error) {
      console.error('[API] Etherscan error:', error);
    }
  }

  allFlows.sort((a, b) => {
    if (Math.abs(a.amountUsd - b.amountUsd) > 500000) {
      return b.amountUsd - a.amountUsd;
    }
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
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    }
  );
}
