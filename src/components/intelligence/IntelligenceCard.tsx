interface IntelligenceCardProps {
  label: string;
  netFlowUsd: number;
  walletCount: number;
  emoji: string;
}

export function IntelligenceCard({
  label,
  netFlowUsd,
  walletCount,
  emoji,
}: IntelligenceCardProps) {
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
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--accent)] rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:nansen-glow">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{emoji}</span>
        <h3 className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </h3>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${flowColor}`}>
            {flowDirection} {formattedFlow}
          </span>
        </div>

        <p className="text-xs text-[var(--foreground)] opacity-60">
          {walletCount.toLocaleString()} wallets
        </p>

        <p className="text-xs text-[var(--foreground)] opacity-50">
          Net flow (1h)
        </p>
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
