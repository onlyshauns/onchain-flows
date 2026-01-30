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
    fromIncludeSmartMoneyLabels?: string[];
    toIncludeSmartMoneyLabels?: string[];
  }): Promise<NansenTransfer[]> {
    // Parallel fetch for all chains
    const promises = params.chains.map(chain =>
      this.fetchTransfersForChain(
        chain,
        params.minUsd,
        params.since,
        params.fromIncludeSmartMoneyLabels,
        params.toIncludeSmartMoneyLabels
      )
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
    // Expanded token list to track ALL major tokens, not just stablecoins
    const popularTokens: Record<Chain, string[]> = {
      ethereum: [
        // Stablecoins
        '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
        '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
        '0x0000000000085d4780B73119b644AE5ecd22b376', // TUSD
        '0x4Fabb145d64652a948d72533023f6E7A623C7C53', // BUSD
        // Major tokens
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
        '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
        // DeFi Blue Chips
        '0x514910771af9ca656af840dff83e8264ecf986ca', // LINK
        '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI
        '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0', // MATIC
        '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', // AAVE
        '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F', // SNX
        '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2', // SUSHI
        '0xc00e94Cb662C3520282E6f5717214004A7f26888', // COMP
        '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', // MKR
        '0xD533a949740bb3306d119CC777fa900bA034cd52', // CRV
        '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B', // CVX
        '0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e', // YFI
        // Layer 2s
        '0x1A4b46696b2bB4794Eb3D4c26f1c55F9170fa4C5', // BIT
        '0x3472A5A71965499acd81997a54BBA8D852C6E53d', // BADGER
        // Meme coins (high volume)
        '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', // SHIB
        '0x4d224452801aced8b2f0aebe155379bb5d594381', // APE
        '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', // MATIC
        // Gaming/Metaverse
        '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942', // MANA
        '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI
        '0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c', // ENJ
        '0x111111111117dC0aa78b770fA6A738034120C302', // 1INCH
        // Newer DeFi
        '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
        '0x03ab458634910aad20ef5f1c8ee96f1d6ac54919', // RAI
        '0x956F47F50A910163D8BF957Cf5846D573E7f87CA', // FEI
        // Exchange tokens
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
        '0x75231F58b43240C9718Dd58B4967c5114342a86c', // OKB
        '0x50D1c9771902476076eCFc8B2A83Ad6b9355a4c9', // FTT
      ],
      base: [
        // Stablecoins
        '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC
        '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // USDbC
        '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // DAI
        // Major tokens
        '0x4200000000000000000000000000000000000006', // WETH
        // Base ecosystem
        '0x940181a94A35A4569E4529A3CDfB74e38FD98631', // AERO (Aerodrome)
        '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed', // DEGEN
        '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b', // cbBTC
      ],
      solana: [
        // Stablecoins
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
        // Native
        'So11111111111111111111111111111111111111112',  // SOL (wrapped)
        // DeFi
        'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',  // mSOL
        'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', // JitoSOL
        'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1', // bSOL
        // Bridged assets
        '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', // ETH (wormhole)
        '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh', // WBTC (wormhole)
        // Solana ecosystem
        'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
        'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', // WIF
        'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', // PYTH
        '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', // POPCAT
        'pumpmXpPg5R2N43cMXaSk6GqjrFBsv8NeLCuAkgZXMw', // PUMP
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
    since: Date,
    fromIncludeSmartMoneyLabels?: string[],
    toIncludeSmartMoneyLabels?: string[]
  ): Promise<NansenTransfer[]> {
    // If smart money labels are requested, we need entity-based querying
    // Current token-based implementation doesn't support this well
    // TODO: Implement proper label-based querying using Nansen's profiler API
    if (fromIncludeSmartMoneyLabels?.length || toIncludeSmartMoneyLabels?.length) {
      console.log(`[NansenClient] Label filtering requested for ${chain} but not yet implemented`);
      console.log(`[NansenClient] From labels:`, fromIncludeSmartMoneyLabels);
      console.log(`[NansenClient] To labels:`, toIncludeSmartMoneyLabels);
      // For now, fall through to token-based fetching as a partial solution
    }

    const popularTokens = this.getPopularTokens(chain);

    if (popularTokens.length === 0) {
      console.log(`[NansenClient] No popular tokens configured for ${chain}`);
      return [];
    }

    // Fetch transfers for multiple tokens in parallel (limited to 8 to avoid timeouts)
    const tokensToFetch = popularTokens.slice(0, 8);
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
