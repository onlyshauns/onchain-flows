import { Chain } from '@/types/flows';
import {
  NansenWhaleFlowResponse,
  NansenSmartMoneyResponse,
  NansenTokenScreenerResponse,
} from './types';

const NANSEN_BASE_URL = 'https://api.nansen.ai/api/beta';

export class NansenClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey || apiKey === 'your_nansen_api_key_here') {
      throw new Error('Nansen API key is not configured. Please set NANSEN_API_KEY in .env.local');
    }
    this.apiKey = apiKey;
  }

  /**
   * Make a request to the Nansen API
   */
  private async request<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${NANSEN_BASE_URL}${endpoint}`);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Nansen API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Nansen API request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get whale movements (large transfers)
   */
  async getWhaleMovements(chain: Chain, limit: number = 50): Promise<NansenWhaleFlowResponse> {
    return this.request<NansenWhaleFlowResponse>('/tgm/flow-intelligence', {
      chain,
      limit,
      minAmount: 100000, // $100k minimum
    });
  }

  /**
   * Get DeFi activities (swaps, liquidity, etc.)
   */
  async getDeFiActivities(chain: Chain, limit: number = 50): Promise<NansenWhaleFlowResponse> {
    return this.request<NansenWhaleFlowResponse>('/tgm/flows', {
      chain,
      limit,
      category: 'defi',
    });
  }

  /**
   * Get token launches and trending tokens
   */
  async getTokenLaunches(chain: Chain, limit: number = 50): Promise<NansenTokenScreenerResponse> {
    return this.request<NansenTokenScreenerResponse>('/token-screener', {
      chain,
      limit,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  }

  /**
   * Get smart money flows
   */
  async getSmartMoneyFlows(chain: Chain, limit: number = 50): Promise<NansenSmartMoneyResponse> {
    return this.request<NansenSmartMoneyResponse>('/smart-money/flows', {
      chain,
      limit,
      timeRange: '30d',
    });
  }

  /**
   * Get flow by transaction hash
   */
  async getFlowByTxHash(chain: Chain, txHash: string): Promise<any> {
    return this.request(`/tgm/transactions/${txHash}`, { chain });
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
