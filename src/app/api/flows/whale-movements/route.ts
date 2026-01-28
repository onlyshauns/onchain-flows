import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { Chain, Flow } from '@/types/flows';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Whale movements - chains:', chains);

  try {
    const client = getNansenClient();
    const allFlows: Flow[] = [];

    // Fetch token transfers for each chain
    for (const chainParam of chains) {
      const chain = chainParam.toLowerCase() as Chain;
      const popularTokens = client.getPopularTokens(chain);

      if (popularTokens.length === 0) continue;

      const tokenAddress = popularTokens[0];

      try {
        const response = await client.getTokenTransfers(chain, tokenAddress, {
          minValueUsd: 1000000, // $1M+ for whales
          limit: 30,
        });

        if (response.data && response.data.length > 0) {
          response.data.forEach((transfer) => {
            allFlows.push({
              id: transfer.transaction_hash,
              type: 'whale-movement',
              chain,
              timestamp: new Date(transfer.block_timestamp).getTime(),
              amount: transfer.transfer_value_usd,
              amountUsd: transfer.transfer_value_usd,
              token: {
                symbol: transfer.token_symbol,
                address: transfer.token_address,
              },
              from: {
                address: transfer.from_address,
                label: transfer.from_address_name || 'Whale Wallet',
              },
              to: {
                address: transfer.to_address,
                label: transfer.to_address_name || 'Unknown',
              },
              txHash: transfer.transaction_hash,
            });
          });
        }
      } catch (error) {
        console.error(`[API] Error fetching whale movements for ${chain}:`, error);
      }
    }

    if (allFlows.length > 0) {
      allFlows.sort((a, b) => b.timestamp - a.timestamp);

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
    }

    throw new Error('No data from Nansen API, using mock data');
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
