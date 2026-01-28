import { LRUCache } from 'lru-cache';
import { Movement, Chain } from '@/types/movement';

interface CacheEntry {
  data: Movement[];
  fetchedAt: number;
}

/**
 * LRU cache for movements with 30s TTL
 */
export class MovementCache {
  private cache: LRUCache<string, CacheEntry>;

  constructor() {
    this.cache = new LRUCache<string, CacheEntry>({
      max: 100,      // Store 100 different query results
      ttl: 30_000,   // 30 second TTL
    });
  }

  /**
   * Generate cache key from query parameters
   */
  getCacheKey(params: {
    chains: Chain[];
    filters?: string[];
    since?: Date;
  }): string {
    return JSON.stringify({
      chains: params.chains.sort(),
      filters: params.filters?.sort(),
      since: params.since?.getTime(),
    });
  }

  /**
   * Get cached movements if available and not stale
   */
  get(key: string): Movement[] | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if stale (older than 30s)
    if (Date.now() - entry.fetchedAt > 30_000) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache movements
   */
  set(key: string, data: Movement[]): void {
    this.cache.set(key, {
      data,
      fetchedAt: Date.now(),
    });
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; max: number; ttl: number } {
    return {
      size: this.cache.size,
      max: this.cache.max,
      ttl: 30_000,
    };
  }
}
