import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { Movement, Chain } from '@/types/movement';

const SUPPORTED_CHAINS: Chain[] = ['ethereum', 'solana', 'base'];

// Spotlight tokens - pick interesting tokens to track deeply
// You can update this list to focus on tokens you care about
const SPOTLIGHT_TOKENS: Record<Chain, { address: string; symbol: string }[]> = {
  ethereum: [
    { address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', symbol: 'WETH' },
    { address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', symbol: 'WBTC' },
    { address: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0', symbol: 'MATIC' }, // Example altcoin
  ],
  solana: [
    { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL' },
  ],
  base: [
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH' },
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
    console.log('[Token Spotlight API] Fetching spotlight token movements for chains:', chains);

    const client = getNansenClient();
    const allMovements: Movement[] = [];

    // Fetch movements for each spotlight token
    const fetchPromises = chains.flatMap(chain => {
      const tokens = SPOTLIGHT_TOKENS[chain];
      if (!tokens || tokens.length === 0) return [];

      return tokens.map(async token => {
        try {
          console.log(`[Token Spotlight API] Fetching ${chain}/${token.symbol}`);

          // Get significant movements ($500K+) for this token
          const response = await client.getTokenTransfers(chain, token.address, {
            minValueUsd: 500_000, // $500K+ to show substantial activity
            limit: 100,
          });

          if (response && response.data && response.data.length > 0) {
            console.log(`[Token Spotlight API] Found ${response.data.length} movements for ${token.symbol}`);

            const movements = response.data.map(transfer => convertToMovement(transfer, chain, token.symbol));
            return movements;
          }
        } catch (error) {
          console.error(`[Token Spotlight API] Error fetching ${chain}/${token.symbol}:`, error);
        }
        return [];
      });
    });

    const results = await Promise.all(fetchPromises);
    const movements = results.flat();

    console.log(`[Token Spotlight API] Total spotlight movements: ${movements.length}`);

    return NextResponse.json({
      movements,
      cached: false,
      source: 'nansen',
      spotlightTokens: SPOTLIGHT_TOKENS,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300',
      },
    });

  } catch (error) {
    console.error('[Token Spotlight API] Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch token spotlight',
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
    tags: ['spotlight', 'whale'],
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
