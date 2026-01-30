'use client';

import { SentimentAnalysis } from '@/lib/utils/sentiment';

interface SentimentGaugeProps {
  sentiment: SentimentAnalysis;
}

export function SentimentGauge({ sentiment }: SentimentGaugeProps) {
  const { score, label, emoji, color, reasoning } = sentiment;

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Market Sentiment</h3>
        <span className="text-xs text-zinc-400 uppercase tracking-wider">Fear & Greed Index</span>
      </div>

      {/* Main Score Display */}
      <div className="flex items-center gap-4 mb-6">
        <div className="text-6xl">{emoji}</div>
        <div>
          <div className="text-4xl font-bold" style={{ color }}>
            {score}
          </div>
          <div className="text-lg font-semibold text-white">{label}</div>
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
            style={{ left: `${score}%` }}
          />
        </div>
        {/* Labels */}
        <div className="flex justify-between mt-2 text-xs text-zinc-500">
          <span>Extreme Fear</span>
          <span>Neutral</span>
          <span>Extreme Greed</span>
        </div>
      </div>

      {/* Reasoning */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Key Signals (1h)
        </div>
        {reasoning.map((reason, idx) => (
          <div key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
            <span className="text-zinc-500 mt-0.5">•</span>
            <span>{reason}</span>
          </div>
        ))}
      </div>

      {/* Methodology */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <details className="text-xs text-zinc-400">
          <summary className="cursor-pointer hover:text-zinc-300 font-medium">
            How is this calculated?
          </summary>
          <div className="mt-2 space-y-1 text-zinc-500">
            <p>• Whale accumulation/distribution (±20pts)</p>
            <p>• Smart money positioning (±25pts)</p>
            <p>• Exchange flows - withdrawals = bullish (±20pts)</p>
            <p>• Fresh wallet activity (±10pts)</p>
            <p>• Overall market activity (±5pts)</p>
          </div>
        </details>
      </div>
    </div>
  );
}
