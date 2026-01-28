// Nansen API Response Types

// Token Transfer Response (POST /api/v1/tgm/transfers)
export interface NansenTransfer {
  chain: string;
  transaction_hash: string;
  block_timestamp: string;
  from_address: string;
  from_address_name?: string;
  to_address: string;
  to_address_name?: string;
  token_address: string;
  token_symbol: string;
  token_name?: string;
  transfer_amount: string;
  transfer_value_usd: number;
  exchange_type?: 'DEX' | 'CEX' | 'Direct';
  source_type?: string;
}

export interface NansenTransfersResponse {
  data: NansenTransfer[];
  pagination: {
    page: number;
    per_page: number;
    is_last_page: boolean;
  };
}

// Flow Intelligence Response (POST /api/v1/tgm/flow-intelligence)
export interface NansenFlowIntelligence {
  whale_net_flow_usd: number;
  whale_avg_flow_usd: number;
  whale_wallet_count: number;
  smart_trader_net_flow_usd: number;
  smart_trader_avg_flow_usd: number;
  smart_trader_wallet_count: number;
  public_figure_net_flow_usd: number;
  public_figure_avg_flow_usd: number;
  public_figure_wallet_count: number;
  top_pnl_net_flow_usd: number;
  top_pnl_avg_flow_usd: number;
  top_pnl_wallet_count: number;
  exchange_net_flow_usd: number;
  exchange_avg_flow_usd: number;
  exchange_wallet_count: number;
  fresh_wallets_net_flow_usd: number;
  fresh_wallets_avg_flow_usd: number;
  fresh_wallets_wallet_count: number;
}

export interface NansenFlowIntelligenceResponse {
  data: NansenFlowIntelligence[];
}

// TGM Flows Response (POST /api/v1/tgm/flows)
export interface NansenFlowData {
  date: string;
  price_usd: number;
  token_amount: number;
  value_usd: number;
  holders_count: number;
  total_inflows_count: number;
  total_outflows_count: number;
}

export interface NansenFlowsResponse {
  data: NansenFlowData[];
  pagination: {
    page: number;
    per_page: number;
    is_last_page: boolean;
  };
}

// Address Transactions Response (POST /api/v1/profiler/address/transactions)
export interface NansenAddressTransaction {
  chain: string;
  transaction_hash: string;
  block_timestamp: string;
  method: string;
  tokens_sent: Array<{
    token_address: string;
    token_symbol: string;
    amount: string;
    value_usd: number;
  }>;
  tokens_received: Array<{
    token_address: string;
    token_symbol: string;
    amount: string;
    value_usd: number;
  }>;
  volume_usd: number;
  source_type: string;
}

export interface NansenAddressTransactionsResponse {
  data: NansenAddressTransaction[];
  pagination: {
    page: number;
    per_page: number;
    is_last_page: boolean;
  };
}

// Address Labels Response (POST /api/beta/profiler/address/labels)
export interface NansenAddressLabel {
  label: string;
  category: 'behavioral' | 'defi' | 'social' | 'smart_money' | 'others';
  definition: string;
  smEarnedDate?: string;
  fullname?: string;
}

export interface NansenAddressLabelsResponse {
  data: NansenAddressLabel[];
}

// Common types
export type NansenChain = 'ethereum' | 'solana' | 'base' | 'arbitrum' | 'optimism' | 'polygon' | 'avalanche' | 'bnb-chain';
export type NansenTimeframe = '5m' | '1h' | '6h' | '12h' | '1d' | '7d';
export type NansenHolderLabel = 'whale' | 'public_figure' | 'smart_money' | 'exchange' | 'top_100_holders';
