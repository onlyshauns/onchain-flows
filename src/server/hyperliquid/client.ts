import { Movement } from '@/types/movement';

/**
 * Fetch Hyperliquid movements using their public API
 *
 * Hyperliquid Info API: https://api.hyperliquid.xyz/info
 */
export async function fetchHyperliquidMovements(
  since: Date,
  minUsd: number
): Promise<Movement[]> {
  try {
    console.log('[Hyperliquid] Fetching movements...');

    // Fetch large transfers (deposits/withdrawals from their API)
    const transfers = await fetchLargeTransfers(since, minUsd);

    console.log(`[Hyperliquid] Found ${transfers.length} movements`);
    return transfers;
  } catch (error) {
    console.error('[Hyperliquid] Error fetching movements:', error);
    return [];
  }
}

/**
 * Fetch large transfers from Hyperliquid L1 bridge
 */
async function fetchLargeTransfers(since: Date, minUsd: number): Promise<Movement[]> {
  try {
    // Use Hyperliquid Info API to get user funding events
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'userFunding',
        user: '0x0000000000000000000000000000000000000000', // Will need to iterate known addresses
      }),
    });

    if (!response.ok) {
      console.error('[Hyperliquid] API error:', response.status);
      return [];
    }

    // For now, return empty - Hyperliquid needs specific user addresses
    // Would need to track known whale addresses or use their explorer API
    console.log('[Hyperliquid] API requires specific addresses - returning empty for now');
    return [];
  } catch (error) {
    console.error('[Hyperliquid] Error in fetchLargeTransfers:', error);
    return [];
  }
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
