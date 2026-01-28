import { NextRequest, NextResponse } from 'next/server';
import { getEtherscanClient } from '@/lib/etherscan/client';

export async function GET(request: NextRequest) {
  const logs: string[] = [];

  try {
    logs.push('1. Testing Etherscan client...');
    const client = getEtherscanClient();
    logs.push('2. Client created successfully');

    logs.push('3. Fetching recent whale movements...');
    const transactions = await client.getRecentWhaleMovements();
    logs.push(`4. Got ${transactions.length} transactions`);

    if (transactions.length > 0) {
      const first = transactions[0];
      logs.push(`5. First transaction: ${first.tx.hash.substring(0, 20)}...`);
      logs.push(`   Symbol: ${first.tx.tokenSymbol}`);
      logs.push(`   Timestamp: ${new Date(parseInt(first.tx.timeStamp) * 1000).toISOString()}`);
      logs.push(`   Label: ${first.label}`);
    }

    return NextResponse.json({
      success: true,
      transactionCount: transactions.length,
      logs,
      sampleData: transactions.slice(0, 3).map(({ tx, label }) => ({
        hash: tx.hash,
        symbol: tx.tokenSymbol,
        timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
        label,
      })),
    });
  } catch (error) {
    logs.push(`ERROR: ${error instanceof Error ? error.message : String(error)}`);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      logs,
    });
  }
}
