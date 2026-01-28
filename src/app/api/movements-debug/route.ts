import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/server/nansen/client';

export async function GET(request: NextRequest) {
  const logs: string[] = [];

  try {
    logs.push('1. Getting Nansen client...');
    const client = getNansenClient();
    logs.push('2. Nansen client created successfully');

    logs.push('3. Testing getDEXTrades...');
    const dexResults = await client.getDEXTrades({
      chains: ['ethereum', 'base'],
      minUsd: 1000000,
      since: new Date(Date.now() - 24 * 60 * 60 * 1000),
      limit: 10,
    });
    logs.push(`4. DEX trades fetched: ${dexResults.length} results`);

    logs.push('5. Testing getTransfers...');
    const transfers = await client.getTransfers({
      chains: ['ethereum'],
      minUsd: 5000000,
      since: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    logs.push(`6. Transfers fetched: ${transfers.length} results`);

    return NextResponse.json({
      success: true,
      logs,
      dexCount: dexResults.length,
      transferCount: transfers.length,
      sampleDex: dexResults[0],
      sampleTransfer: transfers[0],
    });

  } catch (error) {
    logs.push(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    logs.push(`Stack: ${error instanceof Error ? error.stack : 'N/A'}`);

    return NextResponse.json({
      success: false,
      logs,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
