import { Flow, WhaleMovement, SmartMoneyFlow, DeFiActivity } from '@/types/flows';

/**
 * Calculate an "interestingness" score for a flow (0-100)
 * Higher scores indicate more interesting/important flows
 */
export function calculateInterestingnessScore(flow: Flow): number {
  let score = 0;

  // Factor 1: Data source quality / Flow type (40 points max)
  score += scoreFlowType(flow);

  // Factor 2: Transaction size (30 points max)
  score += scoreTransactionSize(flow.amountUsd);

  // Factor 3: Entity quality (20 points max)
  score += scoreEntityQuality(flow);

  // Factor 4: Recency (10 points max)
  score += scoreRecency(flow.timestamp);

  // Bonuses (up to +15 points)
  score += scoreBonuses(flow);

  // Cap at 100
  return Math.min(score, 100);
}

/**
 * Score based on flow type - Smart money is highest priority
 */
function scoreFlowType(flow: Flow): number {
  switch (flow.type) {
    case 'smart-money':
      return 40; // Tier 1 - Smart Money DEX trades
    case 'whale-movement':
      // Check if whale has premium labels (Tier 2) vs unlabeled (Tier 3)
      return hasPremiumLabel(flow) ? 30 : 20;
    case 'defi-activity':
      return hasPremiumLabel(flow) ? 30 : 25;
    case 'token-launch':
      return 35; // Token launches are high signal
    default:
      return 20;
  }
}

/**
 * Check if flow involves premium/labeled entities
 */
function hasPremiumLabel(flow: Flow): boolean {
  const labels = [flow.from.label, flow.to.label].filter(Boolean).map(l => l!.toLowerCase());

  const premiumKeywords = [
    'smart money',
    'smart dex',
    'smart lp',
    'smart nft',
    'public figure',
    'fund',
    'vc',
    'hedge fund',
    'top 100',
  ];

  return labels.some(label =>
    premiumKeywords.some(keyword => label.includes(keyword))
  );
}

/**
 * Score based on transaction size
 */
function scoreTransactionSize(amountUsd: number): number {
  if (amountUsd > 100_000_000) return 30;      // >$100M
  if (amountUsd > 50_000_000) return 25;       // $50M-$100M
  if (amountUsd > 10_000_000) return 20;       // $10M-$50M
  if (amountUsd > 5_000_000) return 15;        // $5M-$10M
  if (amountUsd > 1_000_000) return 10;        // $1M-$5M
  if (amountUsd > 500_000) return 7;           // $500K-$1M
  if (amountUsd > 100_000) return 5;           // $100K-$500K
  return 3;                                     // <$100K
}

/**
 * Score based on entity label quality
 */
function scoreEntityQuality(flow: Flow): number {
  const labels = [flow.from.label, flow.to.label].filter(Boolean);

  if (labels.length === 0) return 0;

  let maxScore = 0;

  for (const label of labels) {
    const lowerLabel = label!.toLowerCase();
    let score = 0;

    // Smart Money labels (highest)
    if (lowerLabel.includes('smart money') ||
        lowerLabel.includes('smart dex') ||
        lowerLabel.includes('smart lp') ||
        lowerLabel.includes('smart nft')) {
      score = 20;
    }
    // Public Figures
    else if (lowerLabel.includes('public figure') ||
             lowerLabel.includes('vitalik') ||
             lowerLabel.includes('cz') ||
             lowerLabel.includes('sbf')) {
      score = 18;
    }
    // Funds & VCs
    else if (lowerLabel.includes('fund') ||
             lowerLabel.includes('vc') ||
             lowerLabel.includes('hedge') ||
             lowerLabel.includes('a16z') ||
             lowerLabel.includes('paradigm')) {
      score = 15;
    }
    // Whales
    else if (lowerLabel.includes('whale') ||
             lowerLabel.includes('top 100') ||
             lowerLabel.includes('top holder')) {
      score = 12;
    }
    // Exchanges (lower priority - common)
    else if (lowerLabel.includes('binance') ||
             lowerLabel.includes('coinbase') ||
             lowerLabel.includes('kraken') ||
             lowerLabel.includes('exchange')) {
      score = 10;
    }
    // Any labeled entity
    else {
      score = 8;
    }

    maxScore = Math.max(maxScore, score);
  }

  return maxScore;
}

/**
 * Score based on how recent the flow is
 */
function scoreRecency(timestamp: number): number {
  const ageMinutes = (Date.now() - timestamp) / 60000;

  if (ageMinutes < 5) return 10;       // <5 min
  if (ageMinutes < 15) return 8;       // 5-15 min
  if (ageMinutes < 60) return 6;       // 15-60 min
  if (ageMinutes < 360) return 4;      // 1-6 hours
  if (ageMinutes < 1440) return 2;     // 6-24 hours
  return 1;                            // >24 hours
}

/**
 * Additional bonus points for special cases
 */
function scoreBonuses(flow: Flow): number {
  let bonus = 0;

  // Bridge transactions (cross-chain)
  if (isBridgeTransaction(flow)) {
    bonus += 5;
  }

  // Unusual routes (e.g., Fund → DEX direct, not via Exchange)
  if (isUnusualRoute(flow)) {
    bonus += 5;
  }

  // Multiple whale categories (mega whale + smart money)
  if (flow.type === 'whale-movement') {
    const whaleFlow = flow as WhaleMovement;
    if (whaleFlow.whaleCategory === 'mega-whale' &&
        (flow.from.label?.toLowerCase().includes('smart') ||
         flow.to.label?.toLowerCase().includes('smart'))) {
      bonus += 3;
    }
  }

  // Large DeFi protocol interactions
  if (flow.type === 'defi-activity') {
    const defiFlow = flow as DeFiActivity;
    if (defiFlow.protocol && ['uniswap', 'aave', 'compound', 'curve'].includes(defiFlow.protocol.toLowerCase())) {
      bonus += 2;
    }
  }

  return bonus;
}

/**
 * Detect if this is a bridge transaction
 */
function isBridgeTransaction(flow: Flow): boolean {
  const labels = [flow.from.label, flow.to.label].filter(Boolean).map(l => l!.toLowerCase());
  return labels.some(label =>
    label.includes('bridge') ||
    label.includes('wormhole') ||
    label.includes('portal') ||
    label.includes('stargate')
  );
}

/**
 * Detect unusual routing patterns
 */
function isUnusualRoute(flow: Flow): boolean {
  const fromLabel = flow.from.label?.toLowerCase() || '';
  const toLabel = flow.to.label?.toLowerCase() || '';

  // Fund/VC going directly to DEX (not via exchange)
  if ((fromLabel.includes('fund') || fromLabel.includes('vc')) &&
      (toLabel.includes('uniswap') || toLabel.includes('dex'))) {
    return true;
  }

  // Smart Money withdrawing from exchange to unknown wallet
  if (fromLabel.includes('exchange') &&
      fromLabel.includes('smart') &&
      !toLabel.includes('exchange')) {
    return true;
  }

  return false;
}

/**
 * Rank flows by interestingness score, adding score to metadata
 */
export function rankFlows(flows: Flow[]): Flow[] {
  // Calculate score for each flow and add to metadata
  const flowsWithScores = flows.map(flow => {
    const score = calculateInterestingnessScore(flow);
    return {
      ...flow,
      metadata: {
        ...flow.metadata,
        score,
      },
    };
  });

  // Sort by score (desc), then by timestamp (desc) for ties
  return flowsWithScores.sort((a, b) => {
    const scoreA = a.metadata?.score || 0;
    const scoreB = b.metadata?.score || 0;

    if (scoreA !== scoreB) {
      return scoreB - scoreA; // Higher score first
    }

    // Tie-breaker: most recent first
    return b.timestamp - a.timestamp;
  });
}
