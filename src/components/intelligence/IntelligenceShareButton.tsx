'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { XIcon } from '../shared/XIcon';
import { FlowIntelligenceSummary } from '@/server/flows/intelligence';
import { fetchCMCFearGreedIndex, getSentimentLevel } from '@/lib/cmc/fear-greed';

interface IntelligenceShareButtonProps {
  intelligence: FlowIntelligenceSummary;
}

export function IntelligenceShareButton({
  intelligence,
}: IntelligenceShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const generateTweet = async () => {
    const { aggregated } = intelligence;
    const data = aggregated['1h'];

    // Fetch CMC Fear & Greed Index
    const fearGreed = await fetchCMCFearGreedIndex();
    const sentiment = fearGreed ? getSentimentLevel(fearGreed.value) : null;

    // Get the strongest signals
    const signals = [];

    if (Math.abs(data.whale.netFlowUsd) > 1_000_000) {
      const direction = data.whale.netFlowUsd > 0 ? '📈 Accumulating' : '📉 Distributing';
      signals.push(`${direction} Whales: ${formatFlow(data.whale.netFlowUsd)}`);
    }

    if (Math.abs(data.smartTrader.netFlowUsd) > 500_000) {
      const direction = data.smartTrader.netFlowUsd > 0 ? '📈 Accumulating' : '📉 Distributing';
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
    let tweet = '';
    if (sentiment && fearGreed) {
      tweet = `${sentiment.emoji} MARKET SENTIMENT: ${fearGreed.value}/100 - ${sentiment.level.toUpperCase()}

📊 1H Onchain Flows (${chains}):

${signals.slice(0, 3).join('\n')}

Track onchain flows in real-time 👇`;
    } else {
      tweet = `📊 ONCHAIN FLOW INTELLIGENCE

1H Summary (${chains}):

${signals.slice(0, 3).join('\n')}

Track onchain flows in real-time 👇`;
    }

    return tweet;
  };

  const handleTwitterShare = async () => {
    const text = await generateTweet();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=550,height=420');
  };

  const handleCopy = async () => {
    try {
      const text = await generateTweet();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleTwitterShare}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--nansen-dark)] hover:bg-opacity-90 text-white rounded-lg font-medium transition-all text-sm shadow-sm"
      >
        <XIcon className="w-4 h-4" />
        Share Intelligence
      </button>
      <button
        onClick={handleCopy}
        className="p-2 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--accent)] hover:bg-opacity-10 border border-[var(--card-border)] hover:border-[var(--accent)] transition-all text-[var(--foreground)] opacity-60 hover:opacity-100"
        title={copied ? 'Copied!' : 'Copy tweet'}
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
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
