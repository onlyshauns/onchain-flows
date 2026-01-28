import { Movement, MovementType, Chain } from '@/types/movement';
import { NansenTransfer, NansenDEXTrade } from '@/lib/nansen/types';
import { getExplorerUrl } from '@/lib/utils/chains';

// Map our Chain type to Nansen's chain identifiers
const CHAIN_MAP: Record<Chain, string> = {
  ethereum: 'ethereum',
  solana: 'solana',
  base: 'base',
  hyperliquid: 'hyperliquid',
};

/**
 * Normalize a Nansen transfer to our Movement format
 */
export function normalizeTransfer(
  transfer: NansenTransfer,
  chain: Chain
): Movement {
  const id = `${chain}-${transfer.transaction_hash}-0`;

  // Infer token from chain if not provided
  const assetSymbol = transfer.token_symbol || inferTokenSymbol(chain);
  const assetAddress = transfer.token_address || undefined;

  return {
    id,
    ts: new Date(transfer.block_timestamp).getTime(),
    chain,
    movementType: classifyTransferType(transfer),
    amountUsd: transfer.transfer_value_usd,
    assetSymbol,
    assetAddress,
    fromAddress: transfer.from_address,
    toAddress: transfer.to_address,
    fromLabel: transfer.from_address_label || undefined,
    toLabel: transfer.to_address_label || undefined,
    txHash: transfer.transaction_hash,
    explorerUrl: getExplorerUrl(chain, transfer.transaction_hash),
    nansenTxUrl: `https://app.nansen.ai/tx/${CHAIN_MAP[chain]}/${transfer.transaction_hash}`,
    tags: [],  // Enriched later
    confidence: 'med',  // Calculated later
    dataSource: 'nansen',
  };
}

/**
 * Infer token symbol from chain when not provided by API
 */
function inferTokenSymbol(chain: Chain): string {
  switch (chain) {
    case 'ethereum':
      return 'ETH';
    case 'base':
      return 'ETH';
    case 'solana':
      return 'SOL';
    case 'hyperliquid':
      return 'HYPE';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Normalize a Nansen DEX trade to our Movement format
 */
export function normalizeDEXTrade(trade: NansenDEXTrade): Movement {
  const chain = trade.chain.toLowerCase() as Chain;
  const id = `${chain}-${trade.transaction_hash}-0`;

  return {
    id,
    ts: new Date(trade.block_timestamp).getTime(),
    chain,
    movementType: 'swap',
    amountUsd: trade.trade_value_usd,
    assetSymbol: trade.token_bought_symbol,
    assetAddress: trade.token_bought_address,
    fromAddress: trade.trader_address,
    toAddress: trade.token_bought_address,
    fromLabel: trade.trader_label || trade.smart_money_label || undefined,
    toLabel: `Bought via ${trade.dex_name || 'DEX'}`,
    txHash: trade.transaction_hash,
    explorerUrl: getExplorerUrl(chain, trade.transaction_hash),
    nansenTxUrl: `https://app.nansen.ai/tx/${CHAIN_MAP[chain]}/${trade.transaction_hash}`,
    tags: [],  // Enriched later
    confidence: 'med',  // Calculated later
    dataSource: 'nansen',
    metadata: {
      dexName: trade.dex_name,
      action: 'swap',
      protocol: trade.dex_name,
    },
  };
}

/**
 * Classify movement type based on Nansen transfer data
 */
function classifyTransferType(transfer: NansenTransfer): MovementType {
  // Heuristics based on Nansen data
  if (transfer.transaction_type?.toLowerCase().includes('mint')) {
    return 'mint';
  }

  if (transfer.transaction_type?.toLowerCase().includes('burn')) {
    return 'burn';
  }

  if (transfer.exchange_type === 'DEX') {
    return 'swap';
  }

  // Bridge detection based on labels
  const fromLabel = transfer.from_address_label?.toLowerCase() || '';
  const toLabel = transfer.to_address_label?.toLowerCase() || '';

  if (fromLabel.includes('bridge') || toLabel.includes('bridge')) {
    return 'bridge';
  }

  // CEX deposit/withdrawal detection
  if (fromLabel.includes('binance') || fromLabel.includes('coinbase') ||
      fromLabel.includes('kraken') || fromLabel.includes('exchange')) {
    if (!toLabel.includes('binance') && !toLabel.includes('coinbase') &&
        !toLabel.includes('kraken') && !toLabel.includes('exchange')) {
      return 'withdrawal';
    }
  }

  if (toLabel.includes('binance') || toLabel.includes('coinbase') ||
      toLabel.includes('kraken') || toLabel.includes('exchange')) {
    if (!fromLabel.includes('binance') && !fromLabel.includes('coinbase') &&
        !fromLabel.includes('kraken') && !fromLabel.includes('exchange')) {
      return 'deposit';
    }
  }

  return 'transfer';  // Default
}
