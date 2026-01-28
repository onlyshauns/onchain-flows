// Core Flow Types

export type Chain = 'ethereum' | 'solana' | 'base' | 'arbitrum' | 'optimism' | 'polygon';

export type FlowType = 'whale-movement' | 'defi-activity' | 'token-launch' | 'smart-money';

export interface Flow {
  id: string;
  type: FlowType;
  chain: Chain;
  timestamp: number;
  amount: number;
  amountUsd: number;
  token: {
    symbol: string;
    address: string;
    name?: string;
  };
  from: {
    address: string;
    label?: string; // Nansen label like "Vitalik" or "Binance"
  };
  to: {
    address: string;
    label?: string;
  };
  txHash: string;
  metadata?: {
    category?: string; // e.g., "Exchange", "DeFi", "Bridge"
    confidence?: number; // 0-100
    anomalyScore?: number; // 0-100 for unusual activity
  };
}

export interface WhaleMovement extends Flow {
  type: 'whale-movement';
  whaleCategory: 'mega-whale' | 'whale' | 'smart-money';
}

export interface DeFiActivity extends Flow {
  type: 'defi-activity';
  protocol?: string; // Uniswap, Aave, etc.
  action?: 'swap' | 'liquidity-add' | 'liquidity-remove' | 'borrow' | 'lend';
}

export interface TokenLaunch extends Flow {
  type: 'token-launch';
  marketCap?: number;
  liquidity?: number;
  holders?: number;
  launchedAt?: number;
}

export interface SmartMoneyFlow extends Flow {
  type: 'smart-money';
  traderPnl?: number; // 30d PnL
  traderRank?: number; // Leaderboard rank
}

// API Response Types

export interface FlowsResponse {
  flows: Flow[];
  total: number;
  page: number;
  hasMore: boolean;
}

// Filter Types

export interface FlowFilters {
  chains: Chain[];
  minAmount?: number;
  maxAmount?: number;
  timeRange?: '5m' | '15m' | '1h' | '24h' | '7d';
}

// Tab Types

export type TabType = 'whale' | 'defi' | 'tokens' | 'smart-money' | 'trending';

export interface Tab {
  id: TabType;
  label: string;
  emoji: string;
}
