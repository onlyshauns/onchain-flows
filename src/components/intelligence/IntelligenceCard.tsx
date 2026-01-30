import { formatFlowUsd } from '@/lib/utils/formatting';

interface TokenFlow {
  symbol: string;
  amount: number;
  direction: 'inflow' | 'outflow';
}

interface IntelligenceCardProps {
  label: string;
  data1h: {
    netFlowUsd: number;
    walletCount: number;
  };
  data24h: {
    netFlowUsd: number;
    walletCount: number;
  };
  emoji: string;
  type: 'whale' | 'smart-money' | 'exchange';
  tokenFlows?: TokenFlow[];
}

export function IntelligenceCard({
  label,
  data1h,
  data24h,
  emoji,
  type,
  tokenFlows = [],
}: IntelligenceCardProps) {
  const renderRow = (netFlowUsd: number, walletCount: number, timeframe: string) => {
    const isPositive = netFlowUsd > 0;
    const isNeutral = netFlowUsd === 0;

    // For exchanges, INVERT the logic:
    // Positive netFlow = inflows TO exchanges = bearish (selling pressure)
    // Negative netFlow = outflows FROM exchanges = bullish (accumulation)
    const isBullish = type === 'exchange' ? netFlowUsd < 0 : netFlowUsd > 0;

    const flowDirection = isPositive ? '↑' : isNeutral ? '→' : '↓';
    const flowColor = isBullish
      ? 'text-green-600 dark:text-green-400'
      : isNeutral
      ? 'text-gray-600 dark:text-gray-400'
      : 'text-red-600 dark:text-red-400';

    const formattedFlow = formatFlowUsd(netFlowUsd);

    // Get descriptive label based on type and direction
    let actionLabel = '';
    if (type === 'exchange') {
      if (isPositive) {
        actionLabel = 'Inflows (Selling Pressure)';
      } else if (isNeutral) {
        actionLabel = 'Neutral';
      } else {
        actionLabel = 'Outflows (Accumulation)';
      }
    } else {
      // Whales or Smart Money
      if (isPositive) {
        actionLabel = 'Accumulating';
      } else if (isNeutral) {
        actionLabel = 'Neutral';
      } else {
        actionLabel = 'Distributing';
      }
    }

    return (
      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span className={`text-xl font-bold ${flowColor}`}>
            {flowDirection} {formattedFlow}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p className={`text-xs font-medium ${flowColor}`}>
            {actionLabel}
          </p>
          <p className="text-xs text-[var(--foreground)] opacity-50">
            {timeframe}
          </p>
        </div>

        <p className="text-xs text-[var(--foreground)] opacity-60">
          {walletCount.toLocaleString()} wallets
        </p>
      </div>
    );
  };

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--accent)] rounded-xl p-3 transition-all duration-300 hover:shadow-lg hover:nansen-glow">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{emoji}</span>
        <h3 className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </h3>
      </div>

      <div className="space-y-2">
        {renderRow(data1h.netFlowUsd, data1h.walletCount, '1h')}
        <div className="border-t border-[var(--card-border)] pt-1.5">
          {renderRow(data24h.netFlowUsd, data24h.walletCount, '24h')}
        </div>
      </div>

      {/* Token Breakdown */}
      {tokenFlows && tokenFlows.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--card-border)]">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            Top Tokens (1h)
          </div>
          <div className="space-y-1">
            {tokenFlows.slice(0, 5).map((flow, idx) => {
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
      )}
    </div>
  );
}
