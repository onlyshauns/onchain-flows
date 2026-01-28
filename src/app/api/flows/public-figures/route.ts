import { NextRequest, NextResponse } from 'next/server';
import { getEtherscanClient } from '@/lib/etherscan/client';
import { PUBLIC_FIGURES, getLabelForAddress } from '@/lib/etherscan/addresses';
import { Flow } from '@/types/flows';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Public Figures - chains:', chains);

  // Only process Ethereum for now
  if (!chains.includes('ethereum')) {
    return NextResponse.json({
      flows: [],
      total: 0,
    });
  }

  try {
    const client = getEtherscanClient();

    console.log('[API] Tracking', PUBLIC_FIGURES.length, 'public figure addresses');

    // Get recent transactions for public figures
    const transactions = await client.getMultipleAddressTransactions(
      PUBLIC_FIGURES,
      15 // Get 15 recent txs per address
    );

    const flows: Flow[] = transactions
      .slice(0, limit)
      .map(({ tx, label }) => {
        const value = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
        const timestamp = parseInt(tx.timeStamp) * 1000;

        // Get labels for from/to addresses
        const fromLabel = getLabelForAddress(tx.from) || label;
        const toLabel = getLabelForAddress(tx.to) || 'Unknown Wallet';

        return {
          id: tx.hash,
          type: 'whale-movement' as const,
          chain: 'ethereum' as const,
          timestamp,
          amount: value,
          amountUsd: value * 2000, // Rough estimate
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
        };
      });

    console.log('[API] Returning', flows.length, 'public figure transactions');

    return NextResponse.json(
      {
        flows,
        total: flows.length,
        source: 'Etherscan',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('[API] Public figures error:', error);

    return NextResponse.json(
      {
        flows: [],
        total: 0,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  }
}
