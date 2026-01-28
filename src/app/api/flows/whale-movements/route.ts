import { NextRequest, NextResponse } from 'next/server';
import { getEtherscanClient } from '@/lib/etherscan/client';
import { WHALES, EXCHANGES, getLabelForAddress } from '@/lib/etherscan/addresses';
import { Flow } from '@/types/flows';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Whale movements - chains:', chains);

  // Only process Ethereum for now
  if (!chains.includes('ethereum')) {
    return NextResponse.json({
      flows: [],
      total: 0,
    });
  }

  try {
    const client = getEtherscanClient();

    // Track whales and major exchanges
    const addressesToTrack = [...WHALES, ...EXCHANGES.slice(0, 3)];

    console.log('[API] Tracking', addressesToTrack.length, 'whale addresses');

    // Get recent transactions
    const transactions = await client.getMultipleAddressTransactions(
      addressesToTrack,
      10 // Get 10 recent txs per address
    );

    // Filter for large transactions (> $100k equivalent)
    // Convert transaction values and filter
    const flows: Flow[] = transactions
      .filter(({ tx }) => {
        const value = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal));
        // This is a rough filter - in production you'd want USD conversion
        return value > 0; // Show all for now
      })
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
          amountUsd: value * 2000, // Rough estimate - would need price API
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
        };
      });

    console.log('[API] Returning', flows.length, 'whale movements');

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
    console.error('[API] Whale movements error:', error);

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
