import { getNansenClient } from '@/lib/nansen/client';
import { Chain } from '@/types/flows';
import { NansenFlowIntelligence } from '@/lib/nansen/types';

// Popular tokens to track for flow intelligence
const POPULAR_TOKENS: Record<Chain, string[]> = {
  ethereum: [
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
    '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  ],
  solana: [
    'So11111111111111111111111111111111111111112', // SOL (wrapped)
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  ],
  base: [
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC
    '0x4200000000000000000000000000000000000006', // WETH
  ],
};

export interface FlowIntelligenceMetrics {
  chain: Chain;
  token?: string;
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

export interface FlowIntelligenceSummary {
  chains: Chain[];
  metrics: FlowIntelligenceMetrics[];
  aggregated: {
    whale: { netFlowUsd: number; walletCount: number };
    smartTrader: { netFlowUsd: number; walletCount: number };
    exchange: { netFlowUsd: number; walletCount: number };
    freshWallets: { netFlowUsd: number; walletCount: number };
  };
  lastUpdated: string;
}

/**
 * Fetch flow intelligence for specified chains
 */
export async function fetchFlowIntelligence(
  chains: Chain[]
): Promise<FlowIntelligenceSummary> {
  const client = getNansenClient();
  const allMetrics: FlowIntelligenceMetrics[] = [];

  // Fetch intelligence for each chain's top token
  for (const chain of chains) {
    const tokens = POPULAR_TOKENS[chain];
    if (!tokens || tokens.length === 0) continue;

    try {
      // Fetch for the first (most popular) token on each chain
      const token = tokens[0];
      const response = await client.getFlowIntelligence(chain, token, '1h');

      if (response && response.data && response.data.length > 0) {
        const data = response.data[0]; // Latest data point
        allMetrics.push(mapToFlowIntelligenceMetrics(chain, token, data));
      }
    } catch (error) {
      console.error(`[Intelligence] Error fetching for ${chain}:`, error);
      // Continue with other chains even if one fails
    }
  }

  // Aggregate metrics across all chains
  const aggregated = aggregateMetrics(allMetrics);

  return {
    chains,
    metrics: allMetrics,
    aggregated,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Map Nansen Flow Intelligence data to our metrics format
 */
function mapToFlowIntelligenceMetrics(
  chain: Chain,
  token: string,
  data: NansenFlowIntelligence
): FlowIntelligenceMetrics {
  return {
    chain,
    token,
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
): FlowIntelligenceSummary['aggregated'] {
  const aggregated = {
    whale: { netFlowUsd: 0, walletCount: 0 },
    smartTrader: { netFlowUsd: 0, walletCount: 0 },
    exchange: { netFlowUsd: 0, walletCount: 0 },
    freshWallets: { netFlowUsd: 0, walletCount: 0 },
  };

  for (const metric of metrics) {
    aggregated.whale.netFlowUsd += metric.whale.netFlowUsd;
    aggregated.whale.walletCount += metric.whale.walletCount;

    aggregated.smartTrader.netFlowUsd += metric.smartTrader.netFlowUsd;
    aggregated.smartTrader.walletCount += metric.smartTrader.walletCount;

    aggregated.exchange.netFlowUsd += metric.exchange.netFlowUsd;
    aggregated.exchange.walletCount += metric.exchange.walletCount;

    aggregated.freshWallets.netFlowUsd += metric.freshWallets.netFlowUsd;
    aggregated.freshWallets.walletCount += metric.freshWallets.walletCount;
  }

  return aggregated;
}
