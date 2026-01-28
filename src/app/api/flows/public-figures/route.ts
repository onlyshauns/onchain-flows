import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { getEtherscanClient } from '@/lib/etherscan/client';
import { PUBLIC_FIGURES, getLabelForAddress } from '@/lib/etherscan/addresses';
import { Chain, Flow } from '@/types/flows';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Public Figures - chains:', chains);

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
            minValueUsd: 50000,
            limit: 50,
          });

          if (response.data && response.data.length > 0) {
            // Filter for public figures
            response.data
              .filter(transfer =>
                (transfer.from_address_name?.toLowerCase().includes('vitalik') ||
                 transfer.from_address_name?.toLowerCase().includes('buterin') ||
                 transfer.from_address_name?.toLowerCase().includes('founder') ||
                 transfer.from_address_name?.toLowerCase().includes('cz') ||
                 transfer.from_address_name?.toLowerCase().includes('sun')) ||
                (transfer.to_address_name?.toLowerCase().includes('vitalik') ||
                 transfer.to_address_name?.toLowerCase().includes('buterin') ||
                 transfer.to_address_name?.toLowerCase().includes('founder') ||
                 transfer.to_address_name?.toLowerCase().includes('cz') ||
                 transfer.to_address_name?.toLowerCase().includes('sun'))
              )
              .forEach((transfer) => {
                dataSource = 'Nansen';
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
                    category: 'Public Figure Activity',
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
    console.log('[API] Falling back to Etherscan for public figures');

    try {
      const etherscanClient = getEtherscanClient();

      // Track known public figure addresses
      const transactions = await etherscanClient.getMultipleAddressTransactions(
        PUBLIC_FIGURES,
        20
      );

      dataSource = 'Etherscan (Recent 24h)';

      transactions.forEach(({ tx, label }) => {
        const value = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
        const timestamp = parseInt(tx.timeStamp) * 1000;

        if (value > 1000) {
          const fromLabel = getLabelForAddress(tx.from) || label;
          const toLabel = getLabelForAddress(tx.to) || 'Unknown Wallet';

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
              category: 'Public Figure Activity',
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

  console.log('[API] Total public figure flows:', allFlows.length, 'Source:', dataSource);

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
