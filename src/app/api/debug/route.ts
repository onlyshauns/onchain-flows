import { NextRequest, NextResponse } from 'next/server';
import { getEtherscanClient } from '@/lib/etherscan/client';
import { getNansenClient } from '@/lib/nansen/client';

export async function GET(request: NextRequest) {
  const logs: string[] = [];

  try {
    // Check Nansen API key first
    const nansenKey = process.env.NANSEN_API_KEY;
    if (nansenKey) {
      logs.push(`1. Nansen API Key found: ${nansenKey.substring(0, 4)}...${nansenKey.substring(nansenKey.length - 4)}`);
    } else {
      logs.push('1. ⚠️ No NANSEN_API_KEY found in environment');
    }

    logs.push('2. Testing Etherscan client...');

    // Check Etherscan API key
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (apiKey) {
      logs.push(`3. Etherscan API Key found: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
    } else {
      logs.push('3. ⚠️ No ETHERSCAN_API_KEY found in environment');
    }

    const client = getEtherscanClient();
    logs.push('4. Etherscan client created successfully');

    // Test single address first
    logs.push('5. Testing single Binance address...');
    const binanceTxs = await client.getTokenTransfers('0x28C6c06298d514Db089934071355E5743bf21d60', {
      offset: 10,
      sort: 'desc',
    });
    logs.push(`6. Got ${binanceTxs.length} transactions from Binance address`);

    if (binanceTxs.length > 0) {
      const recent = binanceTxs[0];
      const timestamp = parseInt(recent.timeStamp);
      const now = Math.floor(Date.now() / 1000);
      const hoursAgo = Math.floor((now - timestamp) / 3600);

      logs.push(`7. Most recent tx: ${recent.hash.substring(0, 20)}...`);
      logs.push(`   Symbol: ${recent.tokenSymbol}`);
      logs.push(`   Time: ${hoursAgo} hours ago`);
      logs.push(`   Timestamp: ${new Date(timestamp * 1000).toISOString()}`);
    } else {
      logs.push('7. ⚠️ No transactions returned from Etherscan API');
    }

    // Now test the whale movements function
    logs.push('8. Testing getRecentWhaleMovements (24h filter)...');
    const transactions = await client.getRecentWhaleMovements();
    logs.push(`9. Got ${transactions.length} transactions after 24h filter`);

    const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
    logs.push(`10. 24h cutoff: ${new Date(oneDayAgo * 1000).toISOString()}`);

    // Test Nansen API
    let nansenResult: any = null;
    if (nansenKey) {
      try {
        logs.push('11. Testing Nansen API with USDC on Ethereum...');
        const nansenClient = getNansenClient();
        const response = await nansenClient.getTokenTransfers('ethereum', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', {
          minValueUsd: 100000,
          limit: 10,
        });
        logs.push(`12. ✅ Nansen API working! Got ${response.data?.length || 0} transfers`);
        nansenResult = {
          status: 'success',
          transferCount: response.data?.length || 0,
          sampleTransfer: response.data?.[0] ? {
            hash: response.data[0].transaction_hash.substring(0, 20) + '...',
            from: response.data[0].from_address_name || 'Unknown',
            to: response.data[0].to_address_name || 'Unknown',
            valueUsd: response.data[0].transfer_value_usd,
          } : null,
        };
      } catch (error) {
        logs.push(`12. ❌ Nansen API error: ${error instanceof Error ? error.message : String(error)}`);
        nansenResult = {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    } else {
      logs.push('11. Skipping Nansen test (no API key)');
    }

    return NextResponse.json({
      success: true,
      rawTransactionCount: binanceTxs.length,
      filteredTransactionCount: transactions.length,
      logs,
      nansenResult,
      etherscanRawResponse: client.lastResponse, // Show raw API response
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
