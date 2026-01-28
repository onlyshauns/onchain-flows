import { NextRequest, NextResponse } from 'next/server';
import { Chain, Flow } from '@/types/flows';

// Notable public figures in crypto
const PUBLIC_FIGURES = [
  { name: 'Vitalik Buterin', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', chains: ['ethereum', 'base'] },
  { name: 'CZ (Binance)', address: '0x28C6c06298d514Db089934071355E5743bf21d60', chains: ['ethereum', 'base'] },
  { name: 'SBF (FTX)', address: '0x2FAF487A4414Fe77e2327F0bf4AE2a264a776AD2', chains: ['ethereum', 'solana'] },
  { name: 'Jump Trading', address: '0x5041ed759Dd4aFc3a72b8192C143F72f4724081A', chains: ['ethereum', 'solana', 'base'] },
  { name: 'A16z Crypto', address: '0x05e793cE0C6027323Ac150F6d45C2344d28B6019', chains: ['ethereum', 'base'] },
  { name: 'Paradigm', address: '0x070341aA5Ed571f0FB2c4a5641409B1A46b4961b', chains: ['ethereum', 'solana'] },
  { name: 'Coinbase Ventures', address: '0x503828976D22510aad0201ac7EC88293211D23Da', chains: ['base', 'ethereum'] },
  { name: 'Bankless', address: '0x9f58c7d104B105d469B05e11aFeF5FBf70a0fD77', chains: ['ethereum', 'base'] },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Public Figures - chains:', chains);

  // Generate interesting mock data for public figures
  const mockFlows: Flow[] = [];

  chains.forEach((chainParam) => {
    const chain = chainParam.toLowerCase() as Chain;

    // Filter figures by chain
    const relevantFigures = PUBLIC_FIGURES.filter(fig => fig.chains.includes(chain));

    relevantFigures.slice(0, 3).forEach((figure, index) => {
      // Large incoming transfer (buying)
      mockFlows.push({
        id: `pub-${chain}-${figure.name}-buy-${Date.now()}`,
        type: 'whale-movement',
        chain,
        timestamp: Date.now() - (index * 300000 + Math.random() * 180000),
        amount: Math.floor(Math.random() * 10000000) + 1000000,
        amountUsd: Math.floor(Math.random() * 10000000) + 1000000,
        token: chain === 'solana'
          ? { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' }
          : chain === 'base'
          ? { symbol: 'USDC', address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' }
          : { symbol: Math.random() > 0.5 ? 'USDC' : 'USDT', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
        from: { address: '0xBinance' + Math.random().toString(36).substring(7), label: 'Binance Hot Wallet' },
        to: { address: figure.address, label: figure.name },
        txHash: `0x${Date.now()}-${Math.random().toString(36).substring(7)}`,
        metadata: {
          category: 'Public Figure Activity',
        },
      });

      // Occasional outgoing transfer (selling/moving)
      if (Math.random() > 0.6) {
        mockFlows.push({
          id: `pub-${chain}-${figure.name}-sell-${Date.now()}`,
          type: 'whale-movement',
          chain,
          timestamp: Date.now() - (index * 400000 + Math.random() * 200000),
          amount: Math.floor(Math.random() * 5000000) + 500000,
          amountUsd: Math.floor(Math.random() * 5000000) + 500000,
          token: chain === 'solana'
            ? { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' }
            : { symbol: 'ETH', address: '0x0000000000000000000000000000000000000000' },
          from: { address: figure.address, label: figure.name },
          to: { address: '0xUniswap' + Math.random().toString(36).substring(7), label: 'Uniswap Router' },
          txHash: `0x${Date.now()}-${Math.random().toString(36).substring(7)}`,
          metadata: {
            category: 'Public Figure Activity',
          },
        });
      }
    });
  });

  // Sort by timestamp (newest first)
  mockFlows.sort((a, b) => b.timestamp - a.timestamp);

  return NextResponse.json(
    {
      flows: mockFlows.slice(0, limit),
      total: mockFlows.length,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    }
  );
}
