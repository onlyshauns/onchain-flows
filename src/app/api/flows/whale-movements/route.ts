import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { Chain, Flow } from '@/types/flows';
import { NansenFlowData } from '@/lib/nansen/types';

// Transform Nansen data to our Flow format
function transformNansenFlow(data: NansenFlowData): Flow {
  return {
    id: data.transactionHash,
    type: 'whale-movement',
    chain: data.chain.toLowerCase() as Chain,
    timestamp: data.timestamp * 1000, // Convert to milliseconds
    amount: parseFloat(data.amount),
    amountUsd: data.amountUsd,
    token: {
      symbol: data.token.symbol,
      address: data.token.address,
      name: data.token.name,
    },
    from: {
      address: data.from.address,
      label: data.from.labels?.[0] || data.from.name,
    },
    to: {
      address: data.to.address,
      label: data.to.labels?.[0] || data.to.name,
    },
    txHash: data.transactionHash,
    metadata: {
      category: data.category,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get Nansen client
    const client = getNansenClient();

    // Fetch flows from all requested chains in parallel
    const flowPromises = chains.map(async (chain) => {
      try {
        const response = await client.getWhaleMovements(chain as Chain, limit);
        return response.data.map(transformNansenFlow);
      } catch (error) {
        console.error(`Error fetching whale movements for ${chain}:`, error);
        return [];
      }
    });

    const flowsArrays = await Promise.all(flowPromises);
    const allFlows = flowsArrays.flat();

    // Sort by timestamp (newest first)
    allFlows.sort((a, b) => b.timestamp - a.timestamp);

    // Return with cache headers
    return NextResponse.json(
      {
        flows: allFlows.slice(0, limit),
        total: allFlows.length,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('Whale movements API error:', error);

    // Return mock data for development if Nansen API fails
    const mockFlows: Flow[] = [
      {
        id: 'mock-1',
        type: 'whale-movement',
        chain: 'ethereum',
        timestamp: Date.now() - 300000,
        amount: 5000000,
        amountUsd: 5000000,
        token: { symbol: 'USDC', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
        from: { address: '0x1234567890abcdef1234567890abcdef12345678', label: 'Whale Wallet' },
        to: { address: '0xabcdef1234567890abcdef1234567890abcdef12', label: 'Binance' },
        txHash: '0xmock1',
      },
      {
        id: 'mock-2',
        type: 'whale-movement',
        chain: 'solana',
        timestamp: Date.now() - 600000,
        amount: 2500000,
        amountUsd: 2500000,
        token: { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' },
        from: { address: 'ABC123XYZ789', label: 'Smart Money' },
        to: { address: 'XYZ789ABC123' },
        txHash: 'mock2',
      },
    ];

    return NextResponse.json(
      {
        flows: mockFlows,
        total: mockFlows.length,
        error: 'Using mock data - Nansen API unavailable',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    );
  }
}
