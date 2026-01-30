import { FlowIntelligenceSummary } from '@/server/flows/intelligence';
import { SentimentAnalysis, calculateSentiment } from './sentiment';

/**
 * Generate shareable tweet text for Flow Intelligence summary
 */
export function generateIntelligenceTweet(
  intelligence: FlowIntelligenceSummary,
  sentiment: SentimentAnalysis
): string {
  const { aggregated } = intelligence;
  const data = aggregated['1h'];

  // Get the strongest signal
  const signals = [];

  if (Math.abs(data.whale.netFlowUsd) > 1_000_000) {
    const direction = data.whale.netFlowUsd > 0 ? '📈' : '📉';
    signals.push(`${direction} Whales: ${formatFlow(data.whale.netFlowUsd)}`);
  }

  if (Math.abs(data.smartTrader.netFlowUsd) > 500_000) {
    const direction = data.smartTrader.netFlowUsd > 0 ? '📈' : '📉';
    signals.push(`${direction} Smart Money: ${formatFlow(data.smartTrader.netFlowUsd)}`);
  }

  if (Math.abs(data.exchange.netFlowUsd) > 5_000_000) {
    // Inverted: negative = outflow = bullish
    const direction = data.exchange.netFlowUsd < 0 ? '📤' : '📥';
    const label = data.exchange.netFlowUsd < 0 ? 'Exchange Withdrawals' : 'Exchange Deposits';
    signals.push(`${direction} ${label}: ${formatFlow(Math.abs(data.exchange.netFlowUsd))}`);
  }

  // Format chain list
  const chains = intelligence.chains.map(c => c.toUpperCase()).join(' + ');

  // Build tweet
  const tweet = `${sentiment.emoji} ONCHAIN SENTIMENT: ${sentiment.label.toUpperCase()}

📊 1H Flow Intelligence (${chains}):

${signals.slice(0, 3).join('\n')}

${sentiment.reasoning.slice(0, 2).join('\n')}

Track onchain flows in real-time 👇`;

  return tweet;
}

/**
 * Generate Twitter share URL for intelligence summary
 */
export function getIntelligenceShareUrl(
  intelligence: FlowIntelligenceSummary,
  sentiment: SentimentAnalysis
): string {
  const text = generateIntelligenceTweet(intelligence, sentiment);
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  return url;
}

/**
 * Copy intelligence tweet to clipboard
 */
export async function copyIntelligenceTweetToClipboard(
  intelligence: FlowIntelligenceSummary,
  sentiment: SentimentAnalysis
): Promise<boolean> {
  try {
    const text = generateIntelligenceTweet(intelligence, sentiment);
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy intelligence tweet to clipboard:', error);
    return false;
  }
}

function formatFlow(value: number): string {
  const abs = Math.abs(value);
  const sign = value >= 0 ? '+' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(value / 1_000).toFixed(0)}K`;
  }
  return `${sign}$${value.toFixed(0)}`;
}
