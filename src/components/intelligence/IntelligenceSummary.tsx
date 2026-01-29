import { IntelligenceCard } from './IntelligenceCard';
import { FlowIntelligenceSummary } from '@/server/flows/intelligence';

interface IntelligenceSummaryProps {
  intelligence: FlowIntelligenceSummary | null;
  isLoading: boolean;
}

export function IntelligenceSummary({
  intelligence,
  isLoading,
}: IntelligenceSummaryProps) {
  if (isLoading) {
    return (
      <div className="mb-6">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
          📊 Flow Intelligence
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 animate-pulse"
            >
              <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded mb-2"></div>
              <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded mb-1"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!intelligence) {
    return null;
  }

  const { aggregated } = intelligence;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
        📊 Flow Intelligence (Last 1h)
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <IntelligenceCard
          emoji="🐋"
          label="Whales"
          netFlowUsd={aggregated.whale.netFlowUsd}
          walletCount={aggregated.whale.walletCount}
        />

        <IntelligenceCard
          emoji="🧠"
          label="Smart Money"
          netFlowUsd={aggregated.smartTrader.netFlowUsd}
          walletCount={aggregated.smartTrader.walletCount}
        />

        <IntelligenceCard
          emoji="🏦"
          label="Exchanges"
          netFlowUsd={aggregated.exchange.netFlowUsd}
          walletCount={aggregated.exchange.walletCount}
        />

        <IntelligenceCard
          emoji="🆕"
          label="Fresh Wallets"
          netFlowUsd={aggregated.freshWallets.netFlowUsd}
          walletCount={aggregated.freshWallets.walletCount}
        />
      </div>

      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
        Updated: {new Date(intelligence.lastUpdated).toLocaleTimeString()}
      </p>
    </div>
  );
}
