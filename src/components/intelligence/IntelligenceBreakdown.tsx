'use client';

import { formatFlowUsd } from '@/lib/utils/formatting';

interface TokenFlow {
  symbol: string;
  amount: number;
  direction: 'inflow' | 'outflow';
}

interface IntelligenceBreakdownProps {
  label: string;
  emoji: string;
  tokenFlows: TokenFlow[];
  type: 'whale' | 'smart-money' | 'exchange';
}

export function IntelligenceBreakdown({
  label,
  emoji,
  tokenFlows,
  type,
}: IntelligenceBreakdownProps) {
  if (!tokenFlows || tokenFlows.length === 0) {
    return null;
  }

  // Sort by absolute amount
  const sortedFlows = [...tokenFlows]
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 5); // Top 5 tokens

  return (
    <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
        Top Tokens
      </div>
      <div className="space-y-1.5">
        {sortedFlows.map((flow, idx) => {
          const isPositive = flow.amount > 0;
          const isBullish = type === 'exchange' ? flow.amount < 0 : flow.amount > 0;

          const color = isBullish
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400';

          return (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">{flow.symbol}</span>
              <span className={`font-medium ${color}`}>
                {formatFlowUsd(flow.amount, true)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
