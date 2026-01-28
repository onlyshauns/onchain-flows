import { Movement } from '@/types/movement';

/**
 * Fetch Hyperliquid movements
 *
 * PLACEHOLDER: This is a skeleton implementation for Phase 4.
 *
 * Will support:
 * 1. Bridge deposits/withdrawals (L1 bridge contract activity)
 * 2. Large trades (perpetual positions $1M+)
 * 3. Internal transfers (wallet-to-wallet $1M+)
 *
 * Data sources to explore:
 * - Hyperliquid REST API (if available)
 * - Hyperliquid subgraph (GraphQL)
 * - Block explorer API
 */
export async function fetchHyperliquidMovements(
  since: Date,
  minUsd: number
): Promise<Movement[]> {
  // Placeholder implementation
  // TODO: Implement in Phase 4 after verifying Hyperliquid API availability

  console.log('[Hyperliquid] Placeholder - not yet implemented');
  console.log('[Hyperliquid] Will fetch movements since:', since);
  console.log('[Hyperliquid] Min USD threshold:', minUsd);

  // Return empty array for now
  return [];
}

/**
 * Fetch bridge deposits/withdrawals
 * Priority: HIGH (capital flow signals)
 */
async function fetchBridgeActivity(since: Date, minUsd: number): Promise<Movement[]> {
  // Query Hyperliquid bridge contract events
  // L1 bridge contract → User wallet = deposit
  // User wallet → L1 bridge contract = withdrawal
  // movementType: 'deposit' or 'withdrawal'
  // tags: ['bridge', 'exchange']
  return [];
}

/**
 * Fetch large trades (perpetual positions)
 * Priority: MEDIUM (trading activity)
 */
async function fetchLargeTrades(since: Date, minUsd: number): Promise<Movement[]> {
  // Query perp position opens/closes (if API supports)
  // Threshold: $1M+ notional
  // movementType: 'swap' (treat as trade)
  // tags: ['exchange', 'defi']
  return [];
}

/**
 * Fetch internal transfers
 * Priority: LOW (less interesting than bridge flows)
 */
async function fetchInternalTransfers(since: Date, minUsd: number): Promise<Movement[]> {
  // Query wallet-to-wallet transfers on Hyperliquid L1
  // Threshold: $1M+
  // movementType: 'transfer'
  // tags: ['exchange'] if involves known entities
  return [];
}
