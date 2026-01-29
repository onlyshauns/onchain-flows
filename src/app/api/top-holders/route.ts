import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { Movement, Chain } from '@/types/movement';
import { NansenFlowsResponse } from '@/lib/nansen/types';

const SUPPORTED_CHAINS: Chain[] = ['ethereum', 'solana', 'base'];

// Top tokens to track for holder movements
const TOP_TOKENS: Record<Chain, { address: string; symbol: string }[]> = {
  ethereum: [
    { address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', symbol: 'WETH' },
    { address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', symbol: 'WBTC' },
    { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC' },
  ],
  solana: [
    { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL' },
  ],
  base: [
    { address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', symbol: 'USDC' },
  ],
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Parse chain filters
  const chainsParam = searchParams.get('chains');
  const chains = chainsParam
    ? (chainsParam.split(',').filter(c =>
        SUPPORTED_CHAINS.includes(c as Chain)
      ) as Chain[])
    : SUPPORTED_CHAINS;

  try {
    console.log('[Top Holders API] Fetching top holder movements for chains:', chains);

    const client = getNansenClient();
    const allMovements: Movement[] = [];

    // Fetch top holder movements for each token in parallel
    const fetchPromises = chains.flatMap(chain => {
      const tokens = TOP_TOKENS[chain];
      if (!tokens || tokens.length === 0) return [];

      return tokens.map(async token => {
        try {
          console.log(`[Top Holders API] Fetching ${chain}/${token.symbol} top holders`);

          // Use getTokenTransfers with top holder labels
          const response = await client.getTokenTransfers(chain, token.address, {
            minValueUsd: 100_000, // Min $100K
            limit: 50,
            fromIncludeSmartMoneyLabels: ['Top 100 Holders'],
            toIncludeSmartMoneyLabels: ['Top 100 Holders'],
          });

          if (response && response.data && response.data.length > 0) {
            console.log(`[Top Holders API] Found ${response.data.length} top holder movements for ${token.symbol}`);

            // Convert to Movement format
            const movements = response.data.map(transfer => convertToMovement(transfer, chain, token.symbol));

            return movements;
          }
        } catch (error) {
          console.error(`[Top Holders API] Error fetching ${chain}/${token.symbol}:`, error);
        }
        return [];
      });
    });

    const results = await Promise.all(fetchPromises);
    const movements = results.flat();

    console.log(`[Top Holders API] Total top holder movements: ${movements.length}`);

    return NextResponse.json({
      movements,
      cached: false,
      source: 'nansen',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });

  } catch (error) {
    console.error('[Top Holders API] Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch top holder movements',
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
    ts: new Date(transfer.timestamp).getTime(),
    chain,
    movementType: 'transfer',
    tags: ['top_holder', 'whale'],
    confidence: 'high',
    tier: 1,
    amountUsd: transfer.transfer_value_usd,
    tokenAmount: transfer.transfer_quantity,
    assetSymbol: tokenSymbol,
    assetAddress: transfer.token_address,
    fromAddress: transfer.from_address,
    toAddress: transfer.to_address,
    fromLabel: transfer.from_address_label || undefined,
    toLabel: transfer.to_address_label || undefined,
    txHash: transfer.transaction_hash,
    explorerUrl: transfer.transaction_hash ? getExplorerUrl(chain, transfer.transaction_hash) : undefined,
    metadata: {
      protocol: transfer.contract_name,
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
