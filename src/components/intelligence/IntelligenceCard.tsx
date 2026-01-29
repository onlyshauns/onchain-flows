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
}

export function IntelligenceCard({
  label,
  data1h,
  data24h,
  emoji,
}: IntelligenceCardProps) {
  const renderRow = (netFlowUsd: number, walletCount: number, timeframe: string) => {
    const isPositive = netFlowUsd > 0;
    const isNeutral = netFlowUsd === 0;
    const flowDirection = isPositive ? '↑' : isNeutral ? '→' : '↓';
    const flowColor = isPositive
      ? 'text-green-600 dark:text-green-400'
      : isNeutral
      ? 'text-gray-600 dark:text-gray-400'
      : 'text-red-600 dark:text-red-400';

    const formattedFlow = formatCurrency(Math.abs(netFlowUsd));

    return (
      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span className={`text-xl font-bold ${flowColor}`}>
            {flowDirection} {formattedFlow}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--foreground)] opacity-60">
            {walletCount.toLocaleString()} wallets
          </p>
          <p className="text-xs text-[var(--foreground)] opacity-50">
            {timeframe}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--accent)] rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:nansen-glow">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{emoji}</span>
        <h3 className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </h3>
      </div>

      <div className="space-y-3">
        {renderRow(data1h.netFlowUsd, data1h.walletCount, '1h')}
        <div className="border-t border-[var(--card-border)] pt-2">
          {renderRow(data24h.netFlowUsd, data24h.walletCount, '24h')}
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(0)}`;
}
