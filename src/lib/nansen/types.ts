// Nansen API Response Types

export interface NansenTokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals?: number;
}

export interface NansenWalletInfo {
  address: string;
  labels?: string[];
  name?: string;
}

export interface NansenFlowData {
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  from: NansenWalletInfo;
  to: NansenWalletInfo;
  token: NansenTokenInfo;
  amount: string;
  amountUsd: number;
  chain: string;
  category?: string;
}

export interface NansenWhaleFlowResponse {
  data: NansenFlowData[];
  total: number;
  page: number;
  limit: number;
}

export interface NansenSmartMoneyResponse {
  data: {
    flows: NansenFlowData[];
    traders: {
      address: string;
      pnl_30d: number;
      rank: number;
    }[];
  };
}

export interface NansenTokenScreenerResponse {
  data: {
    address: string;
    name: string;
    symbol: string;
    chain: string;
    marketCap?: number;
    liquidity?: number;
    holders?: number;
    createdAt?: number;
  }[];
}
