import { Movement } from '@/types/movement';
import {
  Flow,
  FlowType,
  WhaleMovement,
  DeFiActivity,
  SmartMoneyFlow,
  TokenLaunch,
} from '@/types/flows';

/**
 * Convert a Movement to a Flow with proper type classification
 */
export function movementToFlow(movement: Movement): Flow {
  const flowType = classifyFlowType(movement);

  const baseFlow: Flow = {
    id: movement.id,
    type: flowType,
    chain: movement.chain,
    timestamp: movement.ts,
    amount: movement.tokenAmount || 0,
    amountUsd: movement.amountUsd,
    token: {
      symbol: movement.assetSymbol || 'UNKNOWN',
      address: movement.assetAddress || '',
      name: movement.assetSymbol,
    },
    from: {
      address: movement.fromAddress || '',
      label: movement.fromLabel,
    },
    to: {
      address: movement.toAddress || '',
      label: movement.toLabel,
    },
    txHash: movement.txHash || '',
    metadata: {
      category: movement.tags[0],
      confidence: confidenceToNumber(movement.confidence),
      anomalyScore: calculateAnomalyScore(movement),
    },
  };

  // Type-specific enrichment
  switch (flowType) {
    case 'smart-money':
      return enrichSmartMoneyFlow(baseFlow as SmartMoneyFlow, movement);
    case 'whale-movement':
      return enrichWhaleMovement(baseFlow as WhaleMovement, movement);
    case 'defi-activity':
      return enrichDeFiActivity(baseFlow as DeFiActivity, movement);
    case 'token-launch':
      return enrichTokenLaunch(baseFlow as TokenLaunch, movement);
    default:
      return baseFlow;
  }
}

/**
 * Classify the flow type based on movement characteristics
 */
function classifyFlowType(movement: Movement): FlowType {
  // Priority 1: Smart Money DEX trades (Tier 1 + swap)
  if (movement.tier === 1 && movement.movementType === 'swap') {
    return 'smart-money';
  }

  // Priority 2: Token launches (detect new token activity)
  // Note: This requires additional context not available in Movement type
  // For now, we'll skip this classification and handle it in a future enhancement
  // if (isTokenLaunch(movement)) {
  //   return 'token-launch';
  // }

  // Priority 3: DeFi protocol interactions
  if (
    movement.tags.includes('protocol') ||
    movement.tags.includes('defi') ||
    movement.metadata?.protocol
  ) {
    return 'defi-activity';
  }

  // Default: Whale movement (all large transfers)
  return 'whale-movement';
}

/**
 * Enrich SmartMoneyFlow with trader-specific data
 */
function enrichSmartMoneyFlow(
  flow: SmartMoneyFlow,
  movement: Movement
): SmartMoneyFlow {
  return {
    ...flow,
    type: 'smart-money',
    // Note: traderPnl and traderRank would come from Nansen profiler API
    // For now, we'll leave them undefined - can be added in future enhancement
    traderPnl: undefined,
    traderRank: undefined,
  };
}

/**
 * Enrich WhaleMovement with whale category
 */
function enrichWhaleMovement(
  flow: WhaleMovement,
  movement: Movement
): WhaleMovement {
  return {
    ...flow,
    type: 'whale-movement',
    whaleCategory: determineWhaleCategory(movement),
  };
}

/**
 * Determine whale category based on amount and tags
 */
function determineWhaleCategory(
  movement: Movement
): WhaleMovement['whaleCategory'] {
  // Mega whale: >$50M or has mega_whale tag
  if (movement.tags.includes('mega_whale') || movement.amountUsd > 50_000_000) {
    return 'mega-whale';
  }

  // Smart money: has smart_money tag
  if (movement.tags.includes('smart_money')) {
    return 'smart-money';
  }

  // Default: whale
  return 'whale';
}

/**
 * Enrich DeFiActivity with protocol and action
 */
function enrichDeFiActivity(
  flow: DeFiActivity,
  movement: Movement
): DeFiActivity {
  return {
    ...flow,
    type: 'defi-activity',
    protocol: movement.metadata?.protocol,
    action: mapMovementTypeToAction(movement.movementType, movement.metadata?.action),
  };
}

/**
 * Map movement type to DeFi action
 */
function mapMovementTypeToAction(
  movementType: string,
  metadataAction?: string
): DeFiActivity['action'] {
  // Use metadata action if available
  if (metadataAction) {
    const normalized = metadataAction.toLowerCase();
    if (['swap', 'liquidity-add', 'liquidity-remove', 'borrow', 'lend'].includes(normalized)) {
      return normalized as DeFiActivity['action'];
    }
  }

  // Fallback to movement type mapping
  switch (movementType) {
    case 'swap':
      return 'swap';
    case 'deposit':
      return 'liquidity-add';
    case 'withdrawal':
      return 'liquidity-remove';
    default:
      return undefined;
  }
}

/**
 * Enrich TokenLaunch with launch-specific data
 */
function enrichTokenLaunch(flow: TokenLaunch, movement: Movement): TokenLaunch {
  return {
    ...flow,
    type: 'token-launch',
    // Note: These would need to come from additional data sources (DexScreener, etc.)
    // For now, we'll leave them undefined
    marketCap: movement.metadata?.priceImpact, // Placeholder
    liquidity: undefined,
    holders: undefined,
    launchedAt: movement.ts,
  };
}

/**
 * Convert confidence level to numeric score
 */
function confidenceToNumber(confidence: string): number {
  switch (confidence) {
    case 'high':
      return 90;
    case 'med':
      return 70;
    case 'low':
      return 50;
    default:
      return 50;
  }
}

/**
 * Calculate anomaly score based on movement characteristics
 */
function calculateAnomalyScore(movement: Movement): number {
  let score = 0;

  // Large amounts are more anomalous
  if (movement.amountUsd > 100_000_000) score += 40;
  else if (movement.amountUsd > 50_000_000) score += 30;
  else if (movement.amountUsd > 10_000_000) score += 20;
  else if (movement.amountUsd > 1_000_000) score += 10;

  // Unusual routes are more anomalous
  if (movement.movementType === 'bridge') score += 20;
  if (movement.movementType === 'liquidation') score += 30;

  // Smart money + mega whale combination is highly anomalous
  if (
    movement.tags.includes('smart_money') &&
    movement.tags.includes('mega_whale')
  ) {
    score += 25;
  }

  // Fund movements to/from exchanges are notable
  if (
    movement.tags.includes('fund') &&
    movement.tags.includes('exchange')
  ) {
    score += 15;
  }

  return Math.min(score, 100);
}

/**
 * Batch convert movements to flows
 */
export function movementsToFlows(movements: Movement[]): Flow[] {
  return movements.map(movementToFlow);
}
