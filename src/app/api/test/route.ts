import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Return static test data to verify the API is working
  const testFlows = [
    {
      id: '0xtest1',
      type: 'whale-movement',
      chain: 'ethereum',
      timestamp: Date.now() - 300000, // 5 min ago
      amount: 1000000,
      amountUsd: 1000000,
      token: {
        symbol: 'USDC',
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        name: 'USD Coin',
      },
      from: {
        address: '0xtest',
        label: 'Binance',
      },
      to: {
        address: '0xtest2',
        label: 'Unknown Wallet',
      },
      txHash: '0xtest1',
      metadata: {
        category: 'Test Data',
      },
    },
  ];

  return NextResponse.json({
    flows: testFlows,
    total: 1,
    source: 'Test Data - API is working!',
    timestamp: new Date().toISOString(),
  });
}
