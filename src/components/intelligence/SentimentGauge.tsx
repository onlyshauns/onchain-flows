'use client';

import { useEffect, useState } from 'react';
import { FearGreedReading, fetchCMCFearGreedIndex, getSentimentLevel } from '@/lib/cmc/fear-greed';

interface SentimentGaugeProps {
  // No props needed, we fetch CMC index directly
}

export function SentimentGauge({}: SentimentGaugeProps) {
  const [fearGreed, setFearGreed] = useState<FearGreedReading | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIndex = async () => {
      setIsLoading(true);
      const data = await fetchCMCFearGreedIndex();
      setFearGreed(data);
      setIsLoading(false);
    };

    fetchIndex();

    // Refresh every 5 minutes
    const interval = setInterval(fetchIndex, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 animate-pulse">
        <div className="h-32 bg-zinc-800 rounded-lg"></div>
      </div>
    );
  }

  if (!fearGreed) {
    return null;
  }

  const sentiment = getSentimentLevel(fearGreed.value);

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Market Sentiment</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 uppercase tracking-wider">Crypto Fear & Greed Index</span>
          <a
            href="https://alternative.me/crypto/fear-and-greed-index/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--accent)] hover:underline"
          >
            ℹ️
          </a>
        </div>
      </div>

      {/* Main Score Display */}
      <div className="flex items-center gap-4 mb-6">
        <div className="text-6xl">{sentiment.emoji}</div>
        <div>
          <div className="text-4xl font-bold" style={{ color: sentiment.color }}>
            {fearGreed.value}
          </div>
          <div className="text-lg font-semibold text-white">{sentiment.level}</div>
        </div>
      </div>

      {/* Visual Gauge */}
      <div className="mb-6">
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden relative">
          {/* Gradient background */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, #ef4444 0%, #f97316 25%, #6b7280 50%, #22c55e 75%, #10b981 100%)',
            }}
          />
          {/* Indicator */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg transition-all duration-500"
            style={{ left: `${fearGreed.value}%` }}
          />
        </div>
        {/* Labels */}
        <div className="flex justify-between mt-2 text-xs text-zinc-500">
          <span>Extreme Fear</span>
          <span>Neutral</span>
          <span>Extreme Greed</span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2 mb-4">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          What This Means
        </div>
        <div className="text-sm text-zinc-300">
          {fearGreed.value >= 80 && (
            <p>Extreme greed signals overbought conditions. Market may be due for a correction. Consider taking profits.</p>
          )}
          {fearGreed.value >= 60 && fearGreed.value < 80 && (
            <p>Greed is building in the market. Prices rising, but watch for reversal signals.</p>
          )}
          {fearGreed.value >= 40 && fearGreed.value < 60 && (
            <p>Market sentiment is neutral. No extreme emotions driving price action.</p>
          )}
          {fearGreed.value >= 20 && fearGreed.value < 40 && (
            <p>Fear is present in the market. May be opportunities to buy quality assets at discount.</p>
          )}
          {fearGreed.value < 20 && (
            <p>Extreme fear often presents the best buying opportunities. "Be greedy when others are fearful."</p>
          )}
        </div>
      </div>

      {/* Methodology */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <details className="text-xs text-zinc-400">
          <summary className="cursor-pointer hover:text-zinc-300 font-medium">
            How is this calculated?
          </summary>
          <div className="mt-2 space-y-1 text-zinc-500">
            <p>The Crypto Fear & Greed Index analyzes multiple data sources:</p>
            <p>• Volatility (25%) - Volmex implied volatility indices</p>
            <p>• Market Momentum/Volume (25%) - Current volume vs averages</p>
            <p>• Social Media (15%) - Twitter sentiment & engagement</p>
            <p>• Surveys (15%) - Weekly crypto polls</p>
            <p>• Bitcoin Dominance (10%) - BTC vs altcoin market share</p>
            <p>• Google Trends (10%) - Search query volume</p>
          </div>
        </details>
      </div>

      {/* Last Updated */}
      <div className="mt-3 text-xs text-zinc-500">
        Last updated: {new Date(fearGreed.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
