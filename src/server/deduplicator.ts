import { Movement } from '@/types/movement';

/**
 * Deduplicates movements and filters out same-entity transfers
 */
export class Deduplicator {
  private seenIds = new Set<string>();
  private cacheMaxSize = 10000;

  /**
   * Deduplicate an array of movements
   * - Removes duplicate IDs
   * - Filters out same-entity movements (e.g., Binance → Binance)
   */
  deduplicate(movements: Movement[]): Movement[] {
    const unique: Movement[] = [];

    for (const movement of movements) {
      // Skip if we've already seen this movement ID
      if (this.seenIds.has(movement.id)) {
        continue;
      }

      // Check for same-entity movements (internal shuffles)
      if (this.isSameEntity(movement)) {
        continue;
      }

      // Add to results
      this.seenIds.add(movement.id);
      unique.push(movement);

      // Prevent memory leak by clearing cache if it gets too large
      if (this.seenIds.size > this.cacheMaxSize) {
        // Clear oldest half of the cache
        const idsArray = Array.from(this.seenIds);
        const toKeep = idsArray.slice(idsArray.length / 2);
        this.seenIds = new Set(toKeep);
      }
    }

    return unique;
  }

  /**
   * Check if a movement is between the same entity
   * (e.g., Binance 1 → Binance 2 should be hidden)
   */
  private isSameEntity(movement: Movement): boolean {
    if (!movement.fromEntityId || !movement.toEntityId) {
      return false; // Can't determine, allow through
    }

    // Hide same-entity movements (exchange internal shuffles)
    return movement.fromEntityId === movement.toEntityId;
  }

  /**
   * Reset the deduplication cache (useful for testing)
   */
  reset(): void {
    this.seenIds.clear();
  }
}
