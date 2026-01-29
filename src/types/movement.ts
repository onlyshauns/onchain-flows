export type Chain = 'ethereum' | 'solana' | 'base';

export type MovementType =
  | 'transfer'      // Simple A→B token transfer
  | 'swap'          // DEX trade
  | 'bridge'        // Cross-chain transfer (stitched)
  | 'mint'          // Token creation (stablecoin issuance)
  | 'burn'          // Token destruction
  | 'deposit'       // CEX/protocol deposit
  | 'withdrawal'    // CEX/protocol withdrawal
  | 'liquidation'   // Forced position closure
  | 'other';        // Uncategorized

export type MovementTag =
  | 'exchange'      // CEX involvement
  | 'fund'          // VC/hedge fund
  | 'market_maker'  // Market making entity
  | 'protocol'      // DeFi protocol
  | 'bridge'        // Bridge contract
  | 'whale'         // Large holder ($10M+)
  | 'mega_whale'    // Extra large holder ($50M+)
  | 'stablecoin'    // Stablecoin transfer
  | 'defi'          // DeFi activity
  | 'smart_money'   // Nansen smart money label
  | 'public_figure'; // Notable individuals & influencers

export type Confidence = 'high' | 'med' | 'low';

export interface Movement {
  // Identity
  id: string;                    // Deterministic: {chain}-{txHash}-{logIndex}
  ts: number;                    // Unix ms timestamp

  // Classification
  chain: Chain;
  movementType: MovementType;
  tags: MovementTag[];
  confidence: Confidence;
  tier: 1 | 2 | 3;               // Signal quality: 1=Smart Money, 2=Labeled, 3=Whale

  // Value
  amountUsd: number;             // Always USD value
  tokenAmount?: number;          // Raw token amount (if available from source)
  assetSymbol?: string;          // 'USDC', 'ETH', 'SOL', etc.
  assetAddress?: string;         // Contract address (if available)

  // Entities
  fromAddress?: string;
  toAddress?: string;
  fromLabel?: string;            // Nansen label preferred
  toLabel?: string;
  fromEntityId?: string;         // Nansen entity ID for deduplication
  toEntityId?: string;

  // Transaction
  txHash?: string;
  explorerUrl?: string;          // Etherscan/Solscan/etc.
  nansenTxUrl?: string;          // app.nansen.ai/tx/{chain}/{hash}

  // Metadata
  metadata?: {
    protocol?: string;           // 'Uniswap', 'Aave', etc.
    action?: string;             // 'swap', 'borrow', 'lend', etc.
    dexName?: string;
    priceImpact?: number;
  };

  // Provenance (where data came from)
  dataSource: 'nansen' | 'etherscan' | 'hyperliquid' | 'stitched';
}
