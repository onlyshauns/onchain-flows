import { NextRequest, NextResponse } from 'next/server';
import { getEtherscanClient } from '@/lib/etherscan/client';

export async function GET(request: NextRequest) {
  const logs: string[] = [];

  try {
    logs.push('1. Testing Etherscan client...');
    const client = getEtherscanClient();
    logs.push('2. Client created successfully');

    // Test single address first
    logs.push('3. Testing single Binance address...');
    const binanceTxs = await client.getTokenTransfers('0x28C6c06298d514Db089934071355E5743bf21d60', {
      offset: 10,
      sort: 'desc',
    });
    logs.push(`4. Got ${binanceTxs.length} transactions from Binance address`);

    if (binanceTxs.length > 0) {
      const recent = binanceTxs[0];
      const timestamp = parseInt(recent.timeStamp);
      const now = Math.floor(Date.now() / 1000);
      const hoursAgo = Math.floor((now - timestamp) / 3600);

      logs.push(`5. Most recent tx: ${recent.hash.substring(0, 20)}...`);
      logs.push(`   Symbol: ${recent.tokenSymbol}`);
      logs.push(`   Time: ${hoursAgo} hours ago`);
      logs.push(`   Timestamp: ${new Date(timestamp * 1000).toISOString()}`);
    }

    // Now test the whale movements function
    logs.push('6. Testing getRecentWhaleMovements (24h filter)...');
    const transactions = await client.getRecentWhaleMovements();
    logs.push(`7. Got ${transactions.length} transactions after 24h filter`);

    const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
    logs.push(`8. 24h cutoff: ${new Date(oneDayAgo * 1000).toISOString()}`);

    return NextResponse.json({
      success: true,
      rawTransactionCount: binanceTxs.length,
      filteredTransactionCount: transactions.length,
      logs,
      sampleRawData: binanceTxs.slice(0, 2).map(tx => ({
        hash: tx.hash.substring(0, 20) + '...',
        symbol: tx.tokenSymbol,
        timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
        hoursAgo: Math.floor((Math.floor(Date.now() / 1000) - parseInt(tx.timeStamp)) / 3600),
      })),
      sampleFilteredData: transactions.slice(0, 2).map(({ tx, label }) => ({
        hash: tx.hash.substring(0, 20) + '...',
        symbol: tx.tokenSymbol,
        timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
        label,
      })),
    });
  } catch (error) {
    logs.push(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      logs.push(`Stack: ${error.stack.split('\n')[0]}`);
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      logs,
    });
  }
}
