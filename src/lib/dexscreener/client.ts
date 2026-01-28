// DexScreener API Client (FREE - No API key needed!)
const DEXSCREENER_BASE_URL = 'https://api.dexscreener.com';

export interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt: number;
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
}

export interface DexScreenerResponse {
  schemaVersion: string;
  pairs: DexPair[];
}

export class DexScreenerClient {
  /**
   * Search for pairs (NO API KEY NEEDED!)
   */
  async searchPairs(query: string): Promise<DexScreenerResponse> {
    const url = `${DEXSCREENER_BASE_URL}/latest/dex/search?q=${encodeURIComponent(query)}`;

    console.log('[DexScreener] Searching pairs:', query);

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[DexScreener] Found pairs:', data.pairs?.length || 0);
      return data;
    } catch (error) {
      console.error('[DexScreener] Error:', error);
      throw error;
    }
  }

  /**
   * Get pairs for a specific token
   */
  async getTokenPairs(chainId: string, tokenAddress: string): Promise<DexScreenerResponse> {
    const url = `${DEXSCREENER_BASE_URL}/latest/dex/tokens/${tokenAddress}`;

    console.log('[DexScreener] Getting token pairs:', { chainId, tokenAddress });

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status}`);
      }

      const data = await response.json();

      // Filter by chain if needed
      if (data.pairs && chainId) {
        data.pairs = data.pairs.filter((pair: DexPair) => pair.chainId === chainId);
      }

      console.log('[DexScreener] Found token pairs:', data.pairs?.length || 0);
      return data;
    } catch (error) {
      console.error('[DexScreener] Error:', error);
      throw error;
    }
  }

  /**
   * Get latest token profiles (new launches)
   */
  async getLatestTokenProfiles(): Promise<any[]> {
    const url = `${DEXSCREENER_BASE_URL}/token-profiles/latest/v1`;

    console.log('[DexScreener] Fetching latest token profiles');

    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status}`);
      }

      const profiles = await response.json();
      console.log('[DexScreener] Found token profiles:', profiles?.length || 0);
      return profiles || [];
    } catch (error) {
      console.error('[DexScreener] Error fetching token profiles:', error);
      throw error;
    }
  }

  /**
   * Get latest pairs across all chains (for token launches)
   * Uses token profiles endpoint to get actual new launches
   */
  async getLatestPairs(chains: string[] = ['ethereum', 'solana', 'base']): Promise<DexPair[]> {
    console.log('[DexScreener] Getting latest token launches for chains:', chains);

    try {
      // Get latest token profiles (new launches)
      const profiles = await this.getLatestTokenProfiles();

      if (!profiles || profiles.length === 0) {
        console.log('[DexScreener] No token profiles found');
        return [];
      }

      // Filter by chains we care about
      const filteredProfiles = profiles.filter(profile =>
        chains.includes(profile.chainId)
      );

      console.log('[DexScreener] Filtered profiles:', filteredProfiles.length);

      // Get pair data for each token
      const pairPromises = filteredProfiles.slice(0, 20).map(async (profile) => {
        try {
          const url = `${DEXSCREENER_BASE_URL}/latest/dex/tokens/${profile.tokenAddress}`;
          const response = await fetch(url, {
            headers: { 'Accept': 'application/json' }
          });

          if (!response.ok) return null;

          const data = await response.json();
          // Return the first pair (usually the main one)
          return data.pairs?.[0] || null;
        } catch (error) {
          console.error(`[DexScreener] Error fetching pair for ${profile.tokenAddress}:`, error);
          return null;
        }
      });

      const pairs = (await Promise.all(pairPromises)).filter(Boolean) as DexPair[];

      // Filter for pairs with some activity
      const activePairs = pairs.filter(pair =>
        pair.volume?.h24 > 1000 || // At least $1k in 24h volume
        pair.priceChange?.h24 !== undefined // Has price data
      );

      // Sort by creation date (newest first)
      activePairs.sort((a, b) => {
        const aTime = a.pairCreatedAt || 0;
        const bTime = b.pairCreatedAt || 0;
        return bTime - aTime;
      });

      console.log('[DexScreener] Total active token launches found:', activePairs.length);
      return activePairs;
    } catch (error) {
      console.error('[DexScreener] Error in getLatestPairs:', error);
      return [];
    }
  }

  /**
   * Get trending/hot pairs (highest volume recently)
   */
  async getTrendingPairs(chains: string[] = ['ethereum', 'solana', 'base']): Promise<DexPair[]> {
    console.log('[DexScreener] Getting trending pairs for chains:', chains);

    const allPairs: DexPair[] = [];

    // Popular base tokens to search for trending pairs
    const baseTokens = ['USDC', 'USDT', 'ETH', 'SOL', 'WETH'];

    for (const token of baseTokens) {
      try {
        const response = await this.searchPairs(token);

        if (response.pairs && response.pairs.length > 0) {
          // Filter for our chains and high volume
          const trendingPairs = response.pairs
            .filter(pair =>
              chains.includes(pair.chainId) &&
              pair.volume?.h24 > 50000 && // At least $50k volume
              pair.liquidity?.usd > 20000 && // At least $20k liquidity
              pair.priceChange?.h24 !== undefined // Has price data
            )
            .slice(0, 10); // Top 10 per token

          allPairs.push(...trendingPairs);
        }
      } catch (error) {
        console.error(`[DexScreener] Error fetching trending for ${token}:`, error);
      }
    }

    // Remove duplicates by pairAddress
    const uniquePairs = Array.from(
      new Map(allPairs.map(pair => [pair.pairAddress, pair])).values()
    );

    // Sort by 24h volume (highest first)
    uniquePairs.sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));

    console.log('[DexScreener] Total trending pairs found:', uniquePairs.length);
    return uniquePairs;
  }
}

// Singleton
let dexScreenerClient: DexScreenerClient | null = null;

export function getDexScreenerClient(): DexScreenerClient {
  if (!dexScreenerClient) {
    dexScreenerClient = new DexScreenerClient();
  }
  return dexScreenerClient;
}
