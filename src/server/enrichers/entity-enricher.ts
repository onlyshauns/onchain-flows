import { Movement } from '@/types/movement';

/**
 * Maps Nansen labels → entity IDs for deduplication
 * This allows us to identify when transfers are between the same entity
 * (e.g., Binance 1 → Binance 2 should be marked as same entity)
 */
export class EntityEnricher {
  private entityMap = new Map<string, string>();

  constructor() {
    // Preload known entity mappings
    this.loadKnownEntities();
  }

  /**
   * Enrich a movement with entity IDs
   */
  enrichMovement(movement: Movement): Movement {
    return {
      ...movement,
      fromEntityId: this.getEntityId(movement.fromLabel),
      toEntityId: this.getEntityId(movement.toLabel),
    };
  }

  /**
   * Get entity ID for a label
   */
  private getEntityId(label?: string): string | undefined {
    if (!label || label === 'Unknown Wallet') {
      return undefined;
    }

    // Normalize label for matching
    const normalized = label.toLowerCase().trim();

    // Check exact matches first
    if (this.entityMap.has(normalized)) {
      return this.entityMap.get(normalized);
    }

    // Check partial matches for exchanges and known entities
    for (const [pattern, entityId] of this.entityMap.entries()) {
      if (normalized.includes(pattern) || pattern.includes(normalized)) {
        return entityId;
      }
    }

    // Generate entity ID from label (fallback)
    return this.generateEntityId(label);
  }

  /**
   * Load known entity mappings
   */
  private loadKnownEntities() {
    // Exchange entities (same entity across wallets)
    this.entityMap.set('binance', 'cex-binance');
    this.entityMap.set('binance 1', 'cex-binance');
    this.entityMap.set('binance 2', 'cex-binance');
    this.entityMap.set('binance 3', 'cex-binance');
    this.entityMap.set('binance 4', 'cex-binance');
    this.entityMap.set('binance 5', 'cex-binance');
    this.entityMap.set('binance 6', 'cex-binance');
    this.entityMap.set('binance 7', 'cex-binance');
    this.entityMap.set('binance 8', 'cex-binance');
    this.entityMap.set('binance 9', 'cex-binance');
    this.entityMap.set('binance 10', 'cex-binance');
    this.entityMap.set('binance deposit', 'cex-binance');
    this.entityMap.set('binance cold wallet', 'cex-binance');
    this.entityMap.set('binance hot wallet', 'cex-binance');

    this.entityMap.set('coinbase', 'cex-coinbase');
    this.entityMap.set('coinbase 1', 'cex-coinbase');
    this.entityMap.set('coinbase 2', 'cex-coinbase');
    this.entityMap.set('coinbase 3', 'cex-coinbase');
    this.entityMap.set('coinbase 4', 'cex-coinbase');
    this.entityMap.set('coinbase 5', 'cex-coinbase');
    this.entityMap.set('coinbase cold storage', 'cex-coinbase');

    this.entityMap.set('kraken', 'cex-kraken');
    this.entityMap.set('kraken 1', 'cex-kraken');
    this.entityMap.set('kraken 2', 'cex-kraken');
    this.entityMap.set('kraken 3', 'cex-kraken');
    this.entityMap.set('kraken 4', 'cex-kraken');

    this.entityMap.set('bybit', 'cex-bybit');
    this.entityMap.set('bybit 1', 'cex-bybit');
    this.entityMap.set('bybit 2', 'cex-bybit');
    this.entityMap.set('bybit hot wallet', 'cex-bybit');

    this.entityMap.set('okx', 'cex-okx');
    this.entityMap.set('okex', 'cex-okx');
    this.entityMap.set('okx 1', 'cex-okx');
    this.entityMap.set('okx 2', 'cex-okx');

    this.entityMap.set('huobi', 'cex-huobi');
    this.entityMap.set('huobi 1', 'cex-huobi');
    this.entityMap.set('huobi 2', 'cex-huobi');

    this.entityMap.set('kucoin', 'cex-kucoin');
    this.entityMap.set('kucoin 1', 'cex-kucoin');
    this.entityMap.set('kucoin 2', 'cex-kucoin');

    this.entityMap.set('bitfinex', 'cex-bitfinex');
    this.entityMap.set('bitfinex 1', 'cex-bitfinex');
    this.entityMap.set('bitfinex 2', 'cex-bitfinex');

    this.entityMap.set('gemini', 'cex-gemini');
    this.entityMap.set('bitstamp', 'cex-bitstamp');
    this.entityMap.set('gate.io', 'cex-gate');
    this.entityMap.set('crypto.com', 'cex-cryptocom');
    this.entityMap.set('mexc', 'cex-mexc');

    // Fund entities
    this.entityMap.set('jump trading', 'fund-jump');
    this.entityMap.set('jump crypto', 'fund-jump');
    this.entityMap.set('alameda research', 'fund-alameda');
    this.entityMap.set('three arrows capital', 'fund-3ac');
    this.entityMap.set('3ac', 'fund-3ac');
    this.entityMap.set('a16z', 'fund-a16z');
    this.entityMap.set('andreessen horowitz', 'fund-a16z');
    this.entityMap.set('paradigm', 'fund-paradigm');
    this.entityMap.set('dragonfly', 'fund-dragonfly');
    this.entityMap.set('pantera', 'fund-pantera');
    this.entityMap.set('galaxy digital', 'fund-galaxy');

    // Market makers
    this.entityMap.set('wintermute', 'mm-wintermute');
    this.entityMap.set('wintermute trading', 'mm-wintermute');
    this.entityMap.set('amber group', 'mm-amber');
    this.entityMap.set('jane street', 'mm-janestreet');
    this.entityMap.set('dwr labs', 'mm-dwrlabs');

    // Protocols (for deduplication of protocol internal movements)
    this.entityMap.set('uniswap', 'protocol-uniswap');
    this.entityMap.set('uniswap v2', 'protocol-uniswap');
    this.entityMap.set('uniswap v3', 'protocol-uniswap');
    this.entityMap.set('aave', 'protocol-aave');
    this.entityMap.set('compound', 'protocol-compound');
    this.entityMap.set('maker', 'protocol-maker');
    this.entityMap.set('curve', 'protocol-curve');
    this.entityMap.set('balancer', 'protocol-balancer');
  }

  /**
   * Generate entity ID from label (fallback when no mapping exists)
   */
  private generateEntityId(label: string): string {
    // Fallback: use label as-is (may not deduplicate perfectly)
    return `label-${label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
  }
}
