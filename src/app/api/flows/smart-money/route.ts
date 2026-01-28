import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { Chain, Flow } from '@/types/flows';

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

      // Get smart money moves for popular tokens
      const popularTokens = client.getPopularTokens(chain);

      if (popularTokens.length === 0) continue;

      for (const tokenAddress of popularTokens.slice(0, 3)) {
        try {
          // Get recent large transfers potentially from smart money wallets
          const response = await client.getTokenTransfers(chain, tokenAddress, {
            minValueUsd: 100000, // $100k+ for smart money moves
            limit: 30,
          });

          if (response.data && response.data.length > 0) {
            dataSource = 'Nansen Smart Money';

            response.data.forEach((transfer) => {
              // Check if from or to address has smart money indicators
              const fromLabel = transfer.from_address_name || 'Unknown Wallet';
              const toLabel = transfer.to_address_name || 'Unknown Wallet';

              // Only include if one side is labeled as smart money, fund, or trader
              const isSmartMoney =
                fromLabel.toLowerCase().includes('smart') ||
                toLabel.toLowerCase().includes('smart') ||
                fromLabel.toLowerCase().includes('fund') ||
                toLabel.toLowerCase().includes('fund') ||
                fromLabel.toLowerCase().includes('trader') ||
                fromLabel.toLowerCase().includes('capital') ||
                toLabel.toLowerCase().includes('capital');

              if (!isSmartMoney) {
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
    if (Math.abs(a.amountUsd - b.amountUsd) > 100000) {
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
      },
    }
  );
}
