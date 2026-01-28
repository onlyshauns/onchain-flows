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
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
  const limit = parseInt(searchParams.get('limit') || '50');

  // Always return mock data for now since we're still setting up Nansen API
  console.log('[API] Returning mock data for chains:', chains);

  try {
    // Uncomment this when Nansen API is fully configured
    // const client = getNansenClient();
    // const flowPromises = chains.map(async (chain) => {
    //   const response = await client.getWhaleMovements(chain as Chain, limit);
    //   return response.data.map(transformNansenFlow);
    // });
    // const flowsArrays = await Promise.all(flowPromises);
    // const allFlows = flowsArrays.flat();

    // For now, use mock data
    throw new Error('Using mock data for development');
  } catch (error) {
    console.error('Whale movements API error:', error);

    // Generate mock data based on selected chains
    const mockFlows: Flow[] = [];

    // Add mock flows for each selected chain
    chains.forEach((chain, index) => {
      const chainLower = chain.toLowerCase() as Chain;

      // Whale movement
      mockFlows.push({
        id: `mock-whale-${chainLower}-${index}`,
        type: 'whale-movement',
        chain: chainLower,
        timestamp: Date.now() - (index * 600000 + 300000),
        amount: 5000000 + (index * 1000000),
        amountUsd: 5000000 + (index * 1000000),
        token: chainLower === 'solana'
          ? { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' }
          : chainLower === 'ethereum'
          ? { symbol: 'USDC', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' }
          : { symbol: 'USDC', address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' },
        from: { address: '0x' + '1234567890abcdef'.repeat(4), label: 'Whale Wallet' },
        to: { address: '0x' + 'abcdef1234567890'.repeat(4), label: 'Binance' },
        txHash: `0xmock-whale-${chainLower}-${index}`,
      });

      // Smart money move
      mockFlows.push({
        id: `mock-smart-${chainLower}-${index}`,
        type: 'whale-movement',
        chain: chainLower,
        timestamp: Date.now() - (index * 600000 + 450000),
        amount: 2500000,
        amountUsd: 2500000,
        token: chainLower === 'solana'
          ? { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' }
          : { symbol: 'ETH', address: '0x0000000000000000000000000000000000000000' },
        from: { address: '0x' + 'abc123def456'.repeat(5), label: 'Smart Money Trader' },
        to: { address: '0x' + 'def456abc123'.repeat(5), label: 'DeFi Protocol' },
        txHash: `0xmock-smart-${chainLower}-${index}`,
      });
    });

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
