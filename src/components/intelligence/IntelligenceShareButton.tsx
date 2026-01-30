'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { XIcon } from '../shared/XIcon';
import { FlowIntelligenceSummary } from '@/server/flows/intelligence';
import { fetchCMCFearGreedIndex, getSentimentLevel } from '@/lib/cmc/fear-greed';
import { formatFlowUsd } from '@/lib/utils/formatting';

interface IntelligenceShareButtonProps {
  intelligence: FlowIntelligenceSummary;
}

export function IntelligenceShareButton({
  intelligence,
}: IntelligenceShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateTweet = async () => {
    // Always fetch fresh data each time
    setIsGenerating(true);
    try {
      // Fetch latest intelligence data
      const chainsParam = intelligence.chains.join(',');
      const [freshIntelligence, fearGreed] = await Promise.all([
        fetch(`/api/intelligence?chains=${chainsParam}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        }).then(r => r.json()),
        fetchCMCFearGreedIndex(),
      ]);

      const data = freshIntelligence.aggregated['1h'];
      const sentiment = fearGreed ? getSentimentLevel(fearGreed.value) : null;

      console.log('[Share] Intelligence data:', data);

      // Format chain list
      const chains = intelligence.chains.map(c => c.toUpperCase()).join(' + ');

      // Build comprehensive tweet with all 4 data points
      const lines = [];

      // 1. Fear & Greed Index
      if (sentiment && fearGreed) {
        lines.push(`${sentiment.emoji} Fear & Greed: ${fearGreed.value}/100 - ${sentiment.level}`);
      }

      lines.push(''); // Empty line
      lines.push(`📊 1H Onchain Intelligence (${chains}):`);
      lines.push(''); // Empty line

      // 2. Whales - ALWAYS show (even if zero/small)
      const whaleDirection = data.whale.netFlowUsd > 0 ? '📈' : data.whale.netFlowUsd < 0 ? '📉' : '➡️';
      const whaleAction = data.whale.netFlowUsd > 0 ? 'Accumulating' : data.whale.netFlowUsd < 0 ? 'Distributing' : 'Neutral';
      lines.push(`${whaleDirection} Whales ${whaleAction}: ${formatFlowUsd(data.whale.netFlowUsd)}`);

      // 3. Smart Money - ALWAYS show
      const smartDirection = data.smartTrader.netFlowUsd > 0 ? '📈' : data.smartTrader.netFlowUsd < 0 ? '📉' : '➡️';
      const smartAction = data.smartTrader.netFlowUsd > 0 ? 'Accumulating' : data.smartTrader.netFlowUsd < 0 ? 'Distributing' : 'Neutral';
      lines.push(`${smartDirection} Smart Money ${smartAction}: ${formatFlowUsd(data.smartTrader.netFlowUsd)}`);

      // 4. Exchanges - ALWAYS show
      const exchangeDirection = data.exchange.netFlowUsd < 0 ? '📤' : data.exchange.netFlowUsd > 0 ? '📥' : '➡️';
      const exchangeAction = data.exchange.netFlowUsd < 0 ? 'Withdrawals' : data.exchange.netFlowUsd > 0 ? 'Deposits' : 'Neutral';
      lines.push(`${exchangeDirection} Exchange ${exchangeAction}: ${formatFlowUsd(data.exchange.netFlowUsd)}`);

      lines.push(''); // Empty line
      lines.push('Track onchain flows in real-time 👇');

      return lines.join('\n');
    } finally {
      setIsGenerating(false);
    }
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
        disabled={isGenerating}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--nansen-dark)] hover:bg-opacity-90 text-white rounded-lg font-medium transition-all text-sm shadow-sm disabled:opacity-50"
      >
        <XIcon className="w-4 h-4" />
        {isGenerating ? 'Loading...' : 'Share Intelligence'}
      </button>
      <button
        onClick={handleCopy}
        disabled={isGenerating}
        className="p-2 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--accent)] hover:bg-opacity-10 border border-[var(--card-border)] hover:border-[var(--accent)] transition-all text-[var(--foreground)] opacity-60 hover:opacity-100 disabled:opacity-30"
        title={copied ? 'Copied!' : 'Copy tweet'}
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}
