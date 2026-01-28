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
   * Get latest pairs across all chains (for token launches)
   * We'll search for recently created pairs with good liquidity
   */
  async getLatestPairs(chains: string[] = ['ethereum', 'solana', 'base']): Promise<DexPair[]> {
    console.log('[DexScreener] Getting latest pairs for chains:', chains);

    const allPairs: DexPair[] = [];

    // Search terms that get diverse results across chains
    const searchTerms = ['USDC', 'ETH', 'SOL', 'WETH', 'USDT'];

    // Collect pairs from multiple searches
    for (const term of searchTerms) {
      try {
        const response = await this.searchPairs(term);

        if (response.pairs && response.pairs.length > 0) {
          // Filter for chains we care about with good liquidity
          const filteredPairs = response.pairs
            .filter(pair =>
              chains.includes(pair.chainId) && // Must be on one of our chains
              pair.pairCreatedAt &&
              pair.liquidity?.usd > 10000 && // At least $10k liquidity (lowered threshold)
              pair.volume?.h24 > 5000 // Some volume activity
            )
            .slice(0, 5); // Top 5 per search term

          allPairs.push(...filteredPairs);
        }
      } catch (error) {
        console.error(`[DexScreener] Error fetching pairs for ${term}:`, error);
      }
    }

    // Remove duplicates by pairAddress
    const uniquePairs = Array.from(
      new Map(allPairs.map(pair => [pair.pairAddress, pair])).values()
    );

    // Sort by creation date (newest first)
    uniquePairs.sort((a, b) => b.pairCreatedAt - a.pairCreatedAt);

    console.log('[DexScreener] Total latest pairs found:', uniquePairs.length);
    return uniquePairs;
  }

  /**
   * Get trending/hot pairs (highest volume recently)
   */
  async getTrendingPairs(chains: string[] = ['ethereum', 'solana', 'base']): Promise<DexPair[]> {
    console.log('[DexScreener] Getting trending pairs');

    const allPairs: DexPair[] = [];

    for (const chain of chains) {
      try {
        const response = await this.searchPairs(chain);

        if (response.pairs && response.pairs.length > 0) {
          // Get pairs with highest 24h volume
          const hotPairs = response.pairs
            .filter(pair =>
              pair.volume?.h24 > 100000 && // $100k+ volume
              pair.liquidity?.usd > 100000 && // $100k+ liquidity
              pair.chainId === chain
            )
            .sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
            .slice(0, 10);

          allPairs.push(...hotPairs);
        }
      } catch (error) {
        console.error(`[DexScreener] Error fetching trending for ${chain}:`, error);
      }
    }

    // Sort by 24h volume
    allPairs.sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));

    console.log('[DexScreener] Total trending pairs:', allPairs.length);
    return allPairs;
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
