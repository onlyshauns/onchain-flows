import { Chain } from '@/types/flows';
import {
  NansenTransfersResponse,
  NansenFlowIntelligenceResponse,
  NansenFlowsResponse,
  NansenAddressTransactionsResponse,
  NansenAddressLabelsResponse,
  NansenChain,
  NansenTimeframe,
  NansenHolderLabel,
} from './types';

const NANSEN_BASE_URL = 'https://api.nansen.ai';
const NANSEN_API_V1 = `${NANSEN_BASE_URL}/api/v1`;
const NANSEN_API_BETA = `${NANSEN_BASE_URL}/api/beta`;

// Map our chain names to Nansen's format
const CHAIN_MAP: Record<Chain, NansenChain> = {
  ethereum: 'ethereum',
  solana: 'solana',
  base: 'base',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  polygon: 'polygon',
};

// Popular tokens for each chain (for flow tracking)
const CHAIN_TOKENS: Record<NansenChain, string[]> = {
  ethereum: [
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
    '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  ],
  solana: ['So11111111111111111111111111111111111111112'], // SOL
  base: ['0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'], // USDC on Base
  arbitrum: ['0xaf88d065e77c8cc2239327c5edb3a432268e5831'], // USDC on Arbitrum
  optimism: ['0x7f5c764cbc14f9669b88837ca1490cca17c31607'], // USDC on Optimism
  polygon: ['0x2791bca1f2de4661ed88a30c99a7a9449aa84174'], // USDC on Polygon
  avalanche: [],
  'bnb-chain': [],
};

export class NansenClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey || apiKey === 'your_nansen_api_key_here') {
      throw new Error('Nansen API key is not configured. Please set NANSEN_API_KEY in .env.local');
    }
    this.apiKey = apiKey;
  }

  /**
   * Make a POST request to the Nansen API
   */
  private async post<T>(endpoint: string, body: Record<string, any>): Promise<T> {
    const url = `${endpoint}`;

    try {
      console.log('[Nansen API] POST Request:', {
        url,
        hasApiKey: !!this.apiKey,
        apiKeyPrefix: this.apiKey?.substring(0, 10) + '...',
        body: JSON.stringify(body, null, 2),
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': this.apiKey,  // Must be lowercase per Nansen docs
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log('[Nansen API] Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Nansen API] Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(`Nansen API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('[Nansen API] Success Response:', {
        hasData: !!data.data,
        dataLength: Array.isArray(data.data) ? data.data.length : 'not array',
        keys: Object.keys(data),
      });
      return data as T;
    } catch (error) {
      console.error('[Nansen API] Request Failed:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      if (error instanceof Error) {
        throw new Error(`Nansen API request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get token transfers (POST /api/v1/tgm/transfers)
   */
  async getTokenTransfers(
    chain: Chain,
    tokenAddress: string,
    options: {
      minValueUsd?: number;
      limit?: number;
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<NansenTransfersResponse> {
    const nansenChain = CHAIN_MAP[chain];
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Use 24h instead of 1h

    // Format dates as ISO 8601
    const fromDate = options.dateFrom || twentyFourHoursAgo.toISOString();
    const toDate = options.dateTo || now.toISOString();

    console.log('[Nansen] Token Transfers Request:', {
      chain: nansenChain,
      token: tokenAddress,
      dateRange: `${fromDate} to ${toDate}`,
      minUsd: options.minValueUsd || 100000,
    });

    return this.post<NansenTransfersResponse>(`${NANSEN_API_V1}/tgm/transfers`, {
      chain: nansenChain,
      token_address: tokenAddress,
      date: {
        from: fromDate,
        to: toDate,
      },
      filters: {
        transfer_value_usd: { min: options.minValueUsd || 100000 },
      },
      pagination: {
        page: 1,
        per_page: options.limit || 100,
      },
      order_by: [
        {
          field: 'transfer_value_usd',
          direction: 'DESC',
        },
      ],
    });
  }

  /**
   * Get flow intelligence (POST /api/v1/tgm/flow-intelligence)
   */
  async getFlowIntelligence(
    chain: Chain,
    tokenAddress: string,
    timeframe: NansenTimeframe = '1h'
  ): Promise<NansenFlowIntelligenceResponse> {
    const nansenChain = CHAIN_MAP[chain];

    return this.post<NansenFlowIntelligenceResponse>(`${NANSEN_API_V1}/tgm/flow-intelligence`, {
      chain: nansenChain,
      token_address: tokenAddress,
      timeframe,
    });
  }

  /**
   * Get TGM flows by holder label (POST /api/v1/tgm/flows)
   */
  async getTGMFlows(
    chain: Chain,
    tokenAddress: string,
    label: NansenHolderLabel,
    options: {
      limit?: number;
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<NansenFlowsResponse> {
    const nansenChain = CHAIN_MAP[chain];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return this.post<NansenFlowsResponse>(`${NANSEN_API_V1}/tgm/flows`, {
      chain: nansenChain,
      token_address: tokenAddress,
      label,
      date: {
        from: options.dateFrom || oneDayAgo.toISOString().split('T')[0],
        to: options.dateTo || now.toISOString().split('T')[0],
      },
      pagination: {
        page: 1,
        per_page: options.limit || 100,
      },
    });
  }

  /**
   * Get address transactions (POST /api/v1/profiler/address/transactions)
   */
  async getAddressTransactions(
    chain: Chain,
    address: string,
    options: {
      minVolumeUsd?: number;
      limit?: number;
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<NansenAddressTransactionsResponse> {
    const nansenChain = CHAIN_MAP[chain];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return this.post<NansenAddressTransactionsResponse>(
      `${NANSEN_API_V1}/profiler/address/transactions`,
      {
        address,
        chain: nansenChain,
        date: {
          from: options.dateFrom || oneDayAgo.toISOString(),
          to: options.dateTo || now.toISOString(),
        },
        hide_spam_token: true,
        filters: {
          volume_usd: { min: options.minVolumeUsd || 100000 },
        },
        pagination: {
          page: 1,
          per_page: options.limit || 100,
        },
        order_by: [
          {
            field: 'block_timestamp',
            direction: 'DESC',
          },
        ],
      }
    );
  }

  /**
   * Get address labels (POST /api/beta/profiler/address/labels)
   */
  async getAddressLabels(chain: Chain, address: string): Promise<NansenAddressLabelsResponse> {
    const nansenChain = CHAIN_MAP[chain];

    return this.post<NansenAddressLabelsResponse>(`${NANSEN_API_BETA}/profiler/address/labels`, {
      chain: nansenChain,
      address,
    });
  }

  /**
   * Get popular tokens for a chain
   */
  getPopularTokens(chain: Chain): string[] {
    const nansenChain = CHAIN_MAP[chain];
    return CHAIN_TOKENS[nansenChain] || [];
  }
}

// Singleton instance
let nansenClient: NansenClient | null = null;

export function getNansenClient(): NansenClient {
  if (!nansenClient) {
    const apiKey = process.env.NANSEN_API_KEY;
    if (!apiKey) {
      throw new Error('NANSEN_API_KEY environment variable is not set');
    }
    nansenClient = new NansenClient(apiKey);
  }
  return nansenClient;
}
