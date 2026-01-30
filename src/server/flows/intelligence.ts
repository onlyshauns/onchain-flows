import { getNansenClient } from '@/lib/nansen/client';
import { Chain } from '@/types/flows';
import { NansenFlowIntelligence } from '@/lib/nansen/types';

// Top tokens to track for flow intelligence (expanded beyond stablecoins)
const POPULAR_TOKENS: Record<Chain, { address: string; symbol: string }[]> = {
  ethereum: [
    // Stablecoins
    { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC' },
    { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT' },
    { address: '0x6b175474e89094c44da98b954eedeac495271d0f', symbol: 'DAI' },
    // Major tokens
    { address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', symbol: 'WETH' },
    { address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', symbol: 'WBTC' },
    // DeFi Blue Chips
    { address: '0x514910771af9ca656af840dff83e8264ecf986ca', symbol: 'LINK' },
    { address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', symbol: 'UNI' },
    { address: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0', symbol: 'MATIC' },
    { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', symbol: 'AAVE' },
    { address: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F', symbol: 'SNX' },
    { address: '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2', symbol: 'SUSHI' },
    { address: '0xc00e94Cb662C3520282E6f5717214004A7f26888', symbol: 'COMP' },
    { address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', symbol: 'MKR' },
    { address: '0xD533a949740bb3306d119CC777fa900bA034cd52', symbol: 'CRV' },
    // Meme coins (high volume)
    { address: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', symbol: 'SHIB' },
    { address: '0x4d224452801aced8b2f0aebe155379bb5d594381', symbol: 'APE' },
    // Gaming
    { address: '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942', symbol: 'MANA' },
    { address: '0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c', symbol: 'ENJ' },
    // Other
    { address: '0x111111111117dC0aa78b770fA6A738034120C302', symbol: '1INCH' },
  ],
  solana: [
    // Stablecoins
    { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC' },
    { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT' },
    // Native
    { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL' },
    // DeFi
    { address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', symbol: 'mSOL' },
    { address: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', symbol: 'JitoSOL' },
    { address: 'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1', symbol: 'bSOL' },
    // Bridged assets
    { address: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', symbol: 'ETH' },
    { address: '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh', symbol: 'WBTC' },
    // Solana ecosystem
    { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK' },
    { address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', symbol: 'WIF' },
    { address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', symbol: 'PYTH' },
    { address: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', symbol: 'POPCAT' },
  ],
  base: [
    // Stablecoins
    { address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', symbol: 'USDC' },
    { address: '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca', symbol: 'USDbC' },
    { address: '0x50c5725949a6f0c72e6c4a641f24049a917db0cb', symbol: 'DAI' },
    // Major tokens
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH' },
    // Base ecosystem
    { address: '0x940181a94a35a4569e4529a3cdfb74e38fd98631', symbol: 'AERO' },
    { address: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed', symbol: 'DEGEN' },
    { address: '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b', symbol: 'cbBTC' },
  ],
};

export interface FlowIntelligenceMetrics {
  chain: Chain;
  token?: string;
  tokenSymbol?: string;
  whale: {
    netFlowUsd: number;
    avgFlowUsd: number;
    walletCount: number;
  };
  smartTrader: {
    netFlowUsd: number;
    avgFlowUsd: number;
    walletCount: number;
  };
  exchange: {
    netFlowUsd: number;
    avgFlowUsd: number;
    walletCount: number;
  };
  freshWallets: {
    netFlowUsd: number;
    avgFlowUsd: number;
    walletCount: number;
  };
}

export interface TokenBreakdown {
  symbol: string;
  address: string;
  chain: Chain;
  whale: number;
  smartTrader: number;
  exchange: number;
}

export interface FlowIntelligenceSummary {
  chains: Chain[];
  metrics: FlowIntelligenceMetrics[];
  aggregated: {
    '1h': {
      whale: { netFlowUsd: number; walletCount: number };
      smartTrader: { netFlowUsd: number; walletCount: number };
      exchange: { netFlowUsd: number; walletCount: number };
      freshWallets: { netFlowUsd: number; walletCount: number };
    };
    '24h': {
      whale: { netFlowUsd: number; walletCount: number };
      smartTrader: { netFlowUsd: number; walletCount: number };
      exchange: { netFlowUsd: number; walletCount: number };
      freshWallets: { netFlowUsd: number; walletCount: number };
    };
  };
  tokenBreakdown: TokenBreakdown[]; // Per-token flows for detailed view
  lastUpdated: string;
}

/**
 * Fetch flow intelligence for specified chains
 */
export async function fetchFlowIntelligence(
  chains: Chain[]
): Promise<FlowIntelligenceSummary> {
  const client = getNansenClient();

  // Fetch both 1h and 1d (24h) data in parallel
  const [metrics1h, metrics24h] = await Promise.all([
    fetchMetricsForTimeframe(client, chains, '1h'),
    fetchMetricsForTimeframe(client, chains, '1d'),
  ]);

  console.log('[Intelligence] 1h metrics count:', metrics1h.length);
  console.log('[Intelligence] 1d metrics count:', metrics24h.length);
  console.log('[Intelligence] 1h exchange wallets:', metrics1h.reduce((sum, m) => sum + m.exchange.walletCount, 0));
  console.log('[Intelligence] 1d exchange wallets:', metrics24h.reduce((sum, m) => sum + m.exchange.walletCount, 0));

  // Build token breakdown from 1h metrics (handle null values)
  const tokenBreakdown: TokenBreakdown[] = metrics1h.map(m => ({
    symbol: m.tokenSymbol || 'UNKNOWN',
    address: m.token || '',
    chain: m.chain,
    whale: m.whale.netFlowUsd || 0,
    smartTrader: m.smartTrader.netFlowUsd || 0,
    exchange: m.exchange.netFlowUsd || 0,
  }));

  return {
    chains,
    metrics: metrics1h, // Use 1h for backwards compatibility
    aggregated: {
      '1h': aggregateMetrics(metrics1h),
      '24h': aggregateMetrics(metrics24h),
    },
    tokenBreakdown,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Fetch metrics for a specific timeframe
 */
async function fetchMetricsForTimeframe(
  client: ReturnType<typeof getNansenClient>,
  chains: Chain[],
  timeframe: '1h' | '1d'
): Promise<FlowIntelligenceMetrics[]> {
  const allMetrics: FlowIntelligenceMetrics[] = [];

  // Fetch intelligence for ALL tokens on each chain in parallel
  const fetchPromises = chains.flatMap(chain => {
    const tokens = POPULAR_TOKENS[chain];
    if (!tokens || tokens.length === 0) return [];

    return tokens.map(async tokenInfo => {
      try {
        const response = await client.getFlowIntelligence(chain, tokenInfo.address, timeframe);

        if (response && response.data && response.data.length > 0) {
          const data = response.data[0]; // Latest data point
          return mapToFlowIntelligenceMetrics(chain, tokenInfo.address, tokenInfo.symbol, data);
        }
      } catch (error) {
        console.error(`[Intelligence] Error fetching ${chain}/${tokenInfo.symbol} (${timeframe}):`, error);
        // Return null on error, we'll filter it out
      }
      return null;
    });
  });

  // Wait for all fetches to complete
  const results = await Promise.all(fetchPromises);

  // Filter out nulls and add to allMetrics
  for (const result of results) {
    if (result) allMetrics.push(result);
  }

  return allMetrics;
}

/**
 * Map Nansen Flow Intelligence data to our metrics format
 */
function mapToFlowIntelligenceMetrics(
  chain: Chain,
  token: string,
  tokenSymbol: string,
  data: NansenFlowIntelligence
): FlowIntelligenceMetrics {
  return {
    chain,
    token,
    tokenSymbol,
    whale: {
      netFlowUsd: data.whale_net_flow_usd,
      avgFlowUsd: data.whale_avg_flow_usd,
      walletCount: data.whale_wallet_count,
    },
    smartTrader: {
      netFlowUsd: data.smart_trader_net_flow_usd,
      avgFlowUsd: data.smart_trader_avg_flow_usd,
      walletCount: data.smart_trader_wallet_count,
    },
    exchange: {
      netFlowUsd: data.exchange_net_flow_usd,
      avgFlowUsd: data.exchange_avg_flow_usd,
      walletCount: data.exchange_wallet_count,
    },
    freshWallets: {
      netFlowUsd: data.fresh_wallets_net_flow_usd,
      avgFlowUsd: data.fresh_wallets_avg_flow_usd,
      walletCount: data.fresh_wallets_wallet_count,
    },
  };
}

/**
 * Aggregate metrics across chains
 */
function aggregateMetrics(
  metrics: FlowIntelligenceMetrics[]
): {
  whale: { netFlowUsd: number; walletCount: number };
  smartTrader: { netFlowUsd: number; walletCount: number };
  exchange: { netFlowUsd: number; walletCount: number };
  freshWallets: { netFlowUsd: number; walletCount: number };
} {
  const aggregated = {
    whale: { netFlowUsd: 0, walletCount: 0 },
    smartTrader: { netFlowUsd: 0, walletCount: 0 },
    exchange: { netFlowUsd: 0, walletCount: 0 },
    freshWallets: { netFlowUsd: 0, walletCount: 0 },
  };

  for (const metric of metrics) {
    // Handle null values from Nansen API by defaulting to 0
    aggregated.whale.netFlowUsd += metric.whale.netFlowUsd || 0;
    aggregated.whale.walletCount += metric.whale.walletCount || 0;

    aggregated.smartTrader.netFlowUsd += metric.smartTrader.netFlowUsd || 0;
    aggregated.smartTrader.walletCount += metric.smartTrader.walletCount || 0;

    aggregated.exchange.netFlowUsd += metric.exchange.netFlowUsd || 0;
    aggregated.exchange.walletCount += metric.exchange.walletCount || 0;

    aggregated.freshWallets.netFlowUsd += metric.freshWallets.netFlowUsd || 0;
    aggregated.freshWallets.walletCount += metric.freshWallets.walletCount || 0;
  }

  return aggregated;
}
