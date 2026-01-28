import { NextRequest, NextResponse } from 'next/server';
import { Chain, Flow } from '@/types/flows';

// What's Hot - Mix of most interesting recent activity
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Trending - chains:', chains);

  const mockFlows: Flow[] = [];

  // Hot tokens and notable moves
  const trendingMoves = [
    { label: 'Vitalik Buterin', amount: 15000000, token: 'ETH', emoji: '👤' },
    { label: 'BlackRock IBIT', amount: 85000000, token: 'WBTC', emoji: '🏦' },
    { label: 'Binance Hot Wallet', amount: 45000000, token: 'USDC', emoji: '🔥' },
    { label: 'Jump Trading', amount: 32000000, token: 'SOL', emoji: '🐋' },
    { label: 'Grayscale', amount: 67000000, token: 'ETH', emoji: '🏦' },
    { label: 'Smart Money Trader', amount: 8500000, token: 'USDC', emoji: '🧠' },
  ];

  chains.forEach((chainParam) => {
    const chain = chainParam.toLowerCase() as Chain;

    trendingMoves.forEach((move, index) => {
      if (index < 4) { // Limit per chain
        mockFlows.push({
          id: `trending-${chain}-${index}-${Date.now()}`,
          type: 'whale-movement',
          chain,
          timestamp: Date.now() - (index * 180000 + Math.random() * 120000),
          amount: move.amount,
          amountUsd: move.amount,
          token: {
            symbol: move.token,
            address: chain === 'solana'
              ? 'So11111111111111111111111111111111111111112'
              : '0x' + Math.random().toString(36).substring(7) + '0'.repeat(30),
          },
          from: {
            address: '0x' + Math.random().toString(36).substring(7) + '0'.repeat(30),
            label: move.label,
          },
          to: {
            address: '0x' + Math.random().toString(36).substring(7) + '0'.repeat(30),
            label: index % 2 === 0 ? 'DeFi Protocol' : 'CEX Deposit',
          },
          txHash: `0x${Date.now()}-${Math.random().toString(36).substring(7)}`,
          metadata: {
            category: 'Trending',
            anomalyScore: 85 + Math.floor(Math.random() * 15), // High anomaly scores
          },
        });
      }
    });
  });

  // Sort by amount (biggest first for trending)
  mockFlows.sort((a, b) => b.amountUsd - a.amountUsd);

  return NextResponse.json(
    {
      flows: mockFlows.slice(0, limit),
      total: mockFlows.length,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    }
  );
}
