import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { Movement, Chain } from '@/types/movement';

const SUPPORTED_CHAINS: Chain[] = ['ethereum', 'solana', 'base'];

// Top volume tokens per chain (these typically have the most activity)
// Updated regularly based on market activity
const HOT_TOKENS: Record<Chain, { address: string; symbol: string }[]> = {
  ethereum: [
    { address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', symbol: 'WETH' },
    { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC' },
    { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT' },
    { address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', symbol: 'WBTC' },
    { address: '0x514910771af9ca656af840dff83e8264ecf986ca', symbol: 'LINK' },
    { address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', symbol: 'UNI' },
    { address: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0', symbol: 'MATIC' },
  ],
  solana: [
    { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL' },
    { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC' },
  ],
  base: [
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH' },
    { address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', symbol: 'USDC' },
  ],
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const chainsParam = searchParams.get('chains');
  const chains = chainsParam
    ? (chainsParam.split(',').filter(c =>
        SUPPORTED_CHAINS.includes(c as Chain)
      ) as Chain[])
    : SUPPORTED_CHAINS;

  try {
    console.log('[Hot Tokens API] Fetching high-volume token movements for chains:', chains);

    const client = getNansenClient();
    const allMovements: Movement[] = [];

    // Fetch movements for hot tokens - lower threshold to capture more activity
    const fetchPromises = chains.flatMap(chain => {
      const tokens = HOT_TOKENS[chain];
      if (!tokens || tokens.length === 0) return [];

      return tokens.map(async token => {
        try {
          console.log(`[Hot Tokens API] Fetching ${chain}/${token.symbol}`);

          // Get substantial movements ($250K+) to show high activity
          const response = await client.getTokenTransfers(chain, token.address, {
            minValueUsd: 250_000, // Lower threshold to show more hot token activity
            limit: 50,
          });

          if (response && response.data && response.data.length > 0) {
            console.log(`[Hot Tokens API] Found ${response.data.length} movements for ${token.symbol}`);

            const movements = response.data.map(transfer => convertToMovement(transfer, chain, token.symbol));
            return movements;
          }
        } catch (error) {
          console.error(`[Hot Tokens API] Error fetching ${chain}/${token.symbol}:`, error);
        }
        return [];
      });
    });

    const results = await Promise.all(fetchPromises);
    const movements = results.flat();

    // Sort by timestamp (most recent first) and amount (largest first)
    movements.sort((a, b) => {
      const timeDiff = b.ts - a.ts;
      if (Math.abs(timeDiff) < 60000) { // Within 1 minute, sort by size
        return b.amountUsd - a.amountUsd;
      }
      return timeDiff;
    });

    console.log(`[Hot Tokens API] Total hot token movements: ${movements.length}`);

    return NextResponse.json({
      movements,
      cached: false,
      source: 'nansen',
      hotTokens: HOT_TOKENS,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240', // Shorter cache for hot data
      },
    });

  } catch (error) {
    console.error('[Hot Tokens API] Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch hot tokens',
        movements: [],
        source: 'error',
      },
      { status: 500 }
    );
  }
}

function convertToMovement(transfer: any, chain: Chain, tokenSymbol: string): Movement {
  return {
    id: `${chain}-${transfer.transaction_hash || Date.now()}-${transfer.log_index || 0}`,
    ts: new Date(transfer.block_timestamp).getTime(),
    chain,
    movementType: 'transfer',
    tags: ['hot_token', 'high_volume'],
    confidence: 'high',
    tier: 2,
    amountUsd: transfer.transfer_value_usd,
    tokenAmount: parseFloat(transfer.transfer_amount),
    assetSymbol: tokenSymbol,
    assetAddress: transfer.token_address,
    fromAddress: transfer.from_address,
    toAddress: transfer.to_address,
    fromLabel: transfer.from_address_label || undefined,
    toLabel: transfer.to_address_label || undefined,
    txHash: transfer.transaction_hash,
    explorerUrl: transfer.transaction_hash ? getExplorerUrl(chain, transfer.transaction_hash) : undefined,
    metadata: {
      protocol: transfer.source_type,
    },
    dataSource: 'nansen',
  };
}

function getExplorerUrl(chain: Chain, txHash: string): string {
  const explorers = {
    ethereum: 'https://etherscan.io/tx/',
    solana: 'https://solscan.io/tx/',
    base: 'https://basescan.org/tx/',
  };
  return explorers[chain] + txHash;
}
