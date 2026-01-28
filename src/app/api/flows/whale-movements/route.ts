import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { getEtherscanClient } from '@/lib/etherscan/client';
import { getLabelForAddress } from '@/lib/etherscan/addresses';
import { Chain, Flow } from '@/types/flows';

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
            minValueUsd: 500000,
            limit: 50,
          });

          if (response.data && response.data.length > 0) {
            dataSource = 'Nansen';
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
                  category: 'Whale Movement',
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
    console.log('[API] Falling back to Etherscan for recent whale movements');

    try {
      const etherscanClient = getEtherscanClient();
      const transactions = await etherscanClient.getRecentWhaleMovements();

      dataSource = 'Etherscan (Recent 24h)';

      transactions.forEach(({ tx, label }) => {
        const value = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
        const timestamp = parseInt(tx.timeStamp) * 1000;

        // Only include significant transactions
        if (value > 10000 || tx.tokenSymbol === 'USDC' || tx.tokenSymbol === 'USDT') {
          const fromLabel = getLabelForAddress(tx.from) || label;
          const toLabel = getLabelForAddress(tx.to) || 'Unknown Wallet';

          allFlows.push({
            id: tx.hash,
            type: 'whale-movement',
            chain: 'ethereum',
            timestamp,
            amount: value,
            amountUsd: value * 1, // Stablecoin assumption
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
        }
      });
    } catch (error) {
      console.error('[API] Etherscan fallback error:', error);
    }
  }

  // Sort by timestamp DESC (most recent first)
  allFlows.sort((a, b) => b.timestamp - a.timestamp);

  console.log('[API] Total whale movements:', allFlows.length, 'Source:', dataSource);

  return NextResponse.json(
    {
      flows: allFlows.slice(0, limit),
      total: allFlows.length,
      source: dataSource,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    }
  );
}
