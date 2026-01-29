import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { Movement, Chain } from '@/types/movement';
import { NansenFlowsResponse } from '@/lib/nansen/types';

const SUPPORTED_CHAINS: Chain[] = ['ethereum', 'solana', 'base'];

// Top tokens to track for large holder movements
// Focus on blue-chip assets where $1M+ movements matter
const TOP_TOKENS: Record<Chain, { address: string; symbol: string }[]> = {
  ethereum: [
    { address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', symbol: 'WETH' },
    { address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', symbol: 'WBTC' },
    { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC' },
    { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT' },
    { address: '0x6b175474e89094c44da98b954eedeac495271d0f', symbol: 'DAI' },
  ],
  solana: [
    { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL' },
    { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC' },
  ],
  base: [
    { address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', symbol: 'USDC' },
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH' },
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
          console.log(`[Top Holders API] Fetching large ${chain}/${token.symbol} movements`);

          // Fetch very large transfers ($5M+) - serious whale activity only
          const response = await client.getTokenTransfers(chain, token.address, {
            minValueUsd: 5_000_000, // $5M+ movements only
            limit: 50,
          });

          if (response && response.data && response.data.length > 0) {
            console.log(`[Top Holders API] Found ${response.data.length} large movements for ${token.symbol}`);

            // Filter for quality: require at least one labeled address AND exclude junk
            const qualityMovements = response.data.filter(transfer => {
              const hasLabel = transfer.from_address_label || transfer.to_address_label;

              // Skip if no labels (we want to know WHO)
              if (!hasLabel) return false;

              // Skip protocol-to-protocol noise
              const fromIsProtocol = transfer.from_address_label?.includes('🤖');
              const toIsProtocol = transfer.to_address_label?.includes('🤖');

              if (fromIsProtocol && toIsProtocol) {
                console.log(`[Top Holders API] Skipping protocol-to-protocol: ${transfer.from_address_label} → ${transfer.to_address_label}`);
                return false;
              }

              // Skip exchange-to-exchange internal transfers
              const fromIsExchange = transfer.from_address_label?.includes('🏦') ||
                                     transfer.from_address_label?.toLowerCase().includes('exchange');
              const toIsExchange = transfer.to_address_label?.includes('🏦') ||
                                   transfer.to_address_label?.toLowerCase().includes('exchange');

              if (fromIsExchange && toIsExchange) {
                console.log(`[Top Holders API] Skipping exchange-to-exchange: ${transfer.from_address_label} → ${transfer.to_address_label}`);
                return false;
              }

              return true;
            });

            console.log(`[Top Holders API] After filtering: ${qualityMovements.length} quality movements for ${token.symbol}`);

            // Convert to Movement format
            const movements = qualityMovements.map(transfer => convertToMovement(transfer, chain, token.symbol));

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
