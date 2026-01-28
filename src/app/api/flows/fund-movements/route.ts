import { NextRequest, NextResponse } from 'next/server';
import { Chain, Flow } from '@/types/flows';

// Major crypto funds and institutions
const FUNDS = [
  { name: 'Grayscale Bitcoin Trust', address: '0x8EB8a3b98659Cce290402893d0a8614FD1659f0', chains: ['ethereum'] },
  { name: 'BlackRock IBIT', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', chains: ['ethereum', 'base'] },
  { name: 'Fidelity Digital Assets', address: '0x8B3192f5eEBD8579568A2Ed41E6FEB402f93f73F', chains: ['ethereum'] },
  { name: 'Ark Invest', address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', chains: ['ethereum', 'base'] },
  { name: 'MicroStrategy Treasury', address: '0x0548F59fEE79f8832C299e01dCA5c76F034F558e', chains: ['ethereum'] },
  { name: 'Galaxy Digital', address: '0x1111111254fb6c44bAC0beD2854e76F90643097d', chains: ['ethereum', 'solana'] },
  { name: 'Pantera Capital', address: '0x8589427373D6D84E98730D7795D8f6f8731FDA16', chains: ['ethereum', 'base'] },
  { name: 'Multicoin Capital', address: '0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503', chains: ['solana', 'ethereum'] },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Fund Movements - chains:', chains);

  // Generate institutional-scale mock data
  const mockFlows: Flow[] = [];

  chains.forEach((chainParam) => {
    const chain = chainParam.toLowerCase() as Chain;

    // Filter funds by chain
    const relevantFunds = FUNDS.filter(fund => fund.chains.includes(chain));

    relevantFunds.slice(0, 4).forEach((fund, index) => {
      // Large institutional buy
      mockFlows.push({
        id: `fund-${chain}-${fund.name}-buy-${Date.now()}`,
        type: 'whale-movement',
        chain,
        timestamp: Date.now() - (index * 450000 + Math.random() * 200000),
        amount: Math.floor(Math.random() * 50000000) + 10000000, // $10M - $60M
        amountUsd: Math.floor(Math.random() * 50000000) + 10000000,
        token: chain === 'solana'
          ? { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' }
          : chain === 'base'
          ? { symbol: 'USDC', address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' }
          : { symbol: Math.random() > 0.3 ? 'WBTC' : 'ETH', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
        from: { address: '0xCoinbase' + Math.random().toString(36).substring(7), label: 'Coinbase Institutional' },
        to: { address: fund.address, label: fund.name },
        txHash: `0x${Date.now()}-${Math.random().toString(36).substring(7)}`,
        metadata: {
          category: 'Institutional Flow',
        },
      });

      // Treasury rebalancing
      if (Math.random() > 0.5) {
        mockFlows.push({
          id: `fund-${chain}-${fund.name}-rebal-${Date.now()}`,
          type: 'whale-movement',
          chain,
          timestamp: Date.now() - (index * 500000 + Math.random() * 250000),
          amount: Math.floor(Math.random() * 25000000) + 5000000, // $5M - $30M
          amountUsd: Math.floor(Math.random() * 25000000) + 5000000,
          token: { symbol: 'USDC', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
          from: { address: fund.address, label: fund.name },
          to: { address: '0xAave' + Math.random().toString(36).substring(7), label: 'Aave Lending Pool' },
          txHash: `0x${Date.now()}-${Math.random().toString(36).substring(7)}`,
          metadata: {
            category: 'Treasury Management',
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
