import { Chain } from '@/types/movement';
import {
  NansenTransfer,
  NansenTransfersResponse,
  NansenDEXTrade,
  NansenDEXTradesResponse,
  NansenAddressLabel,
  NansenAddressLabelsResponse,
} from '@/lib/nansen/types';

// Map our Chain type to Nansen's chain identifiers
const CHAIN_MAP: Record<Chain, string> = {
  ethereum: 'ethereum',
  solana: 'solana',
  base: 'base',
};

export class NansenClient {
  private baseUrl = 'https://api.nansen.ai/api/v1';
  private betaUrl = 'https://api.nansen.ai/api/beta';
  private apiKey: string;
  private maxRetries = 3;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.includes('your_')) {
      throw new Error('Invalid Nansen API key');
    }
    this.apiKey = apiKey;
  }

  /**
   * Get token transfers with labels (parallel across chains)
   */
  async getTransfers(params: {
    chains: Chain[];
    minUsd: number;
    since: Date;
  }): Promise<NansenTransfer[]> {
    // Parallel fetch for all chains
    const promises = params.chains.map(chain =>
      this.fetchTransfersForChain(chain, params.minUsd, params.since)
    );

    const results = await Promise.allSettled(promises);

    // Combine successful results
    return results
      .filter((r): r is PromiseFulfilledResult<NansenTransfer[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);
  }

  /**
   * Get smart money DEX trades (supports multiple chains in one call)
   */
  async getDEXTrades(params: {
    chains: Chain[];
    minUsd?: number;
    maxUsd?: number;
    since: Date;
    includeSmartMoneyLabels?: string[];
    limit?: number;
  }): Promise<NansenDEXTrade[]> {
    try {
      const filters: any = {};

      if (params.minUsd) {
        filters.trade_value_usd = { min: params.minUsd };
      }

      if (params.maxUsd) {
        filters.trade_value_usd = {
          ...filters.trade_value_usd,
          max: params.maxUsd
        };
      }

      if (params.includeSmartMoneyLabels && params.includeSmartMoneyLabels.length > 0) {
        filters.smart_money_label = params.includeSmartMoneyLabels;
      }

      const response = await this.post<NansenDEXTradesResponse>('/smart-money/dex-trades', {
        chains: params.chains.map(c => CHAIN_MAP[c]),
        filters,
        date: {
          from: params.since.toISOString(),
          to: new Date().toISOString(),
        },
        pagination: {
          page: 1,
          per_page: params.limit || 100,
        },
      });

      return response.data || [];
    } catch (error) {
      console.error('[NansenClient] getDEXTrades error:', error);
      return [];
    }
  }

  /**
   * Enrich address with full label data from Beta API
   */
  async enrichAddress(chain: Chain, address: string): Promise<NansenAddressLabel | null> {
    try {
      const response = await this.post<NansenAddressLabelsResponse>(
        '/profiler/address/labels',
        {
          chain: CHAIN_MAP[chain],
          address,
        },
        true // Use beta URL
      );
      return response.data?.[0] || null;
    } catch {
      return null; // Don't fail on enrichment errors
    }
  }

  /**
   * Get popular tokens for a chain (helper for token-based queries)
   */
  getPopularTokens(chain: Chain): string[] {
    // Hardcoded popular tokens per chain for fast lookups
    const popularTokens: Record<Chain, string[]> = {
      ethereum: [
        '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
        '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
        '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
      ],
      base: [
        '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC
        '0x4200000000000000000000000000000000000006', // WETH
      ],
      solana: [
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
        'So11111111111111111111111111111111111111112',  // SOL (wrapped)
        'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',  // mSOL
        '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', // ETH (wormhole)
      ],
    };

    return popularTokens[chain] || [];
  }

  /**
   * Get token transfers for a specific token
   */
  async getTokenTransfers(
    chain: Chain,
    tokenAddress: string,
    params: {
      minValueUsd: number;
      limit?: number;
    }
  ): Promise<NansenTransfersResponse> {
    try {
      const response = await this.post<NansenTransfersResponse>('/tgm/transfers', {
        chain: CHAIN_MAP[chain],
        token_address: tokenAddress,
        filters: {
          transfer_value_usd: { min: params.minValueUsd },
        },
        date: {
          from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
        },
        pagination: {
          page: 1,
          per_page: params.limit || 50,
        },
      });

      return response;
    } catch (error) {
      console.error('[NansenClient] getTokenTransfers error:', error);
      return { data: [], pagination: { page: 1, per_page: 0, is_last_page: true } };
    }
  }

  // Private helper methods

  private async fetchTransfersForChain(
    chain: Chain,
    minUsd: number,
    since: Date
  ): Promise<NansenTransfer[]> {
    const popularTokens = this.getPopularTokens(chain);

    if (popularTokens.length === 0) {
      console.log(`[NansenClient] No popular tokens configured for ${chain}`);
      return [];
    }

    // Fetch transfers for multiple tokens in parallel (up to 3 for better coverage)
    const tokensToFetch = popularTokens.slice(0, 3);
    console.log(`[NansenClient] Fetching ${tokensToFetch.length} tokens for ${chain}`);

    const promises = tokensToFetch.map(async tokenAddress => {
      try {
        const response = await this.getTokenTransfers(chain, tokenAddress, {
          minValueUsd: minUsd,
          limit: 30,
        });
        console.log(`[NansenClient] ${chain} ${tokenAddress}: ${response.data?.length || 0} transfers`);
        return response.data || [];
      } catch (error) {
        console.error(`[NansenClient] Error fetching ${chain} ${tokenAddress}:`, error);
        return [];
      }
    });

    const results = await Promise.all(promises);
    const allTransfers = results.flat();

    console.log(`[NansenClient] Total ${chain} transfers: ${allTransfers.length}`);
    return allTransfers;
  }

  private async post<T>(
    endpoint: string,
    body: any,
    useBeta: boolean = false
  ): Promise<T> {
    const baseUrl = useBeta ? this.betaUrl : this.baseUrl;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey, // Lowercase per Nansen docs
          },
          body: JSON.stringify(body),
        });

        if (response.status === 429) {
          // Rate limited - exponential backoff
          await this.sleep(Math.pow(2, attempt) * 1000);
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Nansen API error ${response.status}: ${errorText}`);
        }

        return await response.json();
      } catch (error) {
        if (attempt === this.maxRetries - 1) {
          throw error;
        }
        await this.sleep(1000 * (attempt + 1));
      }
    }

    throw new Error('Max retries exceeded');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let clientInstance: NansenClient | null = null;

export function getNansenClient(): NansenClient {
  if (!clientInstance) {
    const apiKey = process.env.NANSEN_API_KEY;
    if (!apiKey) {
      throw new Error('NANSEN_API_KEY not configured');
    }
    clientInstance = new NansenClient(apiKey);
  }
  return clientInstance;
}
