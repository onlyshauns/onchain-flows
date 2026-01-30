import { FlowIntelligenceSummary } from '@/server/flows/intelligence';

export type SentimentLevel = 'extreme-fear' | 'fear' | 'neutral' | 'greed' | 'extreme-greed';

export interface SentimentAnalysis {
  score: number; // 0-100, where 0 is extreme fear, 100 is extreme greed
  level: SentimentLevel;
  label: string;
  emoji: string;
  color: string;
  reasoning: string[];
}

/**
 * Calculate market sentiment from flow intelligence data
 *
 * Methodology:
 * - Whale/Smart Money inflows = bullish (greed)
 * - Exchange outflows = bullish (accumulation)
 * - Whale/Smart Money outflows = bearish (fear)
 * - Exchange inflows = bearish (distribution/selling)
 */
export function calculateSentiment(intelligence: FlowIntelligenceSummary): SentimentAnalysis {
  const { aggregated } = intelligence;
  const data = aggregated['1h']; // Use 1h for real-time sentiment

  const reasoning: string[] = [];
  let score = 50; // Start neutral

  // 1. Whale Activity (±20 points)
  const whaleFlow = data.whale.netFlowUsd;
  if (Math.abs(whaleFlow) > 1_000_000) {
    if (whaleFlow > 0) {
      const boost = Math.min(20, (whaleFlow / 10_000_000) * 20);
      score += boost;
      reasoning.push(`🐋 Whales accumulating (+${formatUsd(whaleFlow)})`);
    } else {
      const penalty = Math.min(20, (Math.abs(whaleFlow) / 10_000_000) * 20);
      score -= penalty;
      reasoning.push(`🐋 Whales distributing (${formatUsd(whaleFlow)})`);
    }
  }

  // 2. Smart Money Activity (±25 points - most important)
  const smartFlow = data.smartTrader.netFlowUsd;
  if (Math.abs(smartFlow) > 500_000) {
    if (smartFlow > 0) {
      const boost = Math.min(25, (smartFlow / 5_000_000) * 25);
      score += boost;
      reasoning.push(`🧠 Smart money buying (+${formatUsd(smartFlow)})`);
    } else {
      const penalty = Math.min(25, (Math.abs(smartFlow) / 5_000_000) * 25);
      score -= penalty;
      reasoning.push(`🧠 Smart money selling (${formatUsd(smartFlow)})`);
    }
  }

  // 3. Exchange Flow (±20 points, INVERTED: outflow = bullish)
  const exchangeFlow = data.exchange.netFlowUsd;
  if (Math.abs(exchangeFlow) > 5_000_000) {
    if (exchangeFlow < 0) {
      // Negative = outflow from exchanges = accumulation = bullish
      const boost = Math.min(20, (Math.abs(exchangeFlow) / 20_000_000) * 20);
      score += boost;
      reasoning.push(`🏦 Exchange outflows (+${formatUsd(Math.abs(exchangeFlow))} withdrawn)`);
    } else {
      // Positive = inflow to exchanges = selling = bearish
      const penalty = Math.min(20, (exchangeFlow / 20_000_000) * 20);
      score -= penalty;
      reasoning.push(`🏦 Exchange inflows (+${formatUsd(exchangeFlow)} deposited)`);
    }
  }

  // 4. Fresh Wallet Activity (±10 points)
  const freshFlow = data.freshWallets.netFlowUsd;
  if (Math.abs(freshFlow) > 500_000) {
    if (freshFlow > 0) {
      const boost = Math.min(10, (freshFlow / 2_000_000) * 10);
      score += boost;
      reasoning.push(`✨ New money entering (+${formatUsd(freshFlow)})`);
    } else {
      const penalty = Math.min(10, (Math.abs(freshFlow) / 2_000_000) * 10);
      score -= penalty;
      reasoning.push(`✨ New wallets selling (${formatUsd(freshFlow)})`);
    }
  }

  // 5. Wallet Count Divergence (±5 points)
  const totalWallets = data.whale.walletCount + data.smartTrader.walletCount;
  if (totalWallets > 100) {
    score += 5;
    reasoning.push(`📊 High activity (${totalWallets} smart wallets)`);
  } else if (totalWallets < 30) {
    score -= 5;
    reasoning.push(`📊 Low activity (${totalWallets} smart wallets)`);
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine sentiment level
  let level: SentimentLevel;
  let label: string;
  let emoji: string;
  let color: string;

  if (score >= 75) {
    level = 'extreme-greed';
    label = 'Extreme Greed';
    emoji = '🔥';
    color = '#10b981'; // green-500
  } else if (score >= 55) {
    level = 'greed';
    label = 'Greed';
    emoji = '😊';
    color = '#22c55e'; // green-400
  } else if (score >= 45) {
    level = 'neutral';
    label = 'Neutral';
    emoji = '😐';
    color = '#6b7280'; // gray-500
  } else if (score >= 25) {
    level = 'fear';
    label = 'Fear';
    emoji = '😰';
    color = '#f97316'; // orange-500
  } else {
    level = 'extreme-fear';
    label = 'Extreme Fear';
    emoji = '😱';
    color = '#ef4444'; // red-500
  }

  // If no significant signals, default to neutral
  if (reasoning.length === 0) {
    reasoning.push('📊 Market quiet, no strong signals');
  }

  return {
    score,
    level,
    label,
    emoji,
    color,
    reasoning,
  };
}

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}
