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
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 animate-pulse"
            >
              <div className="h-6 bg-zinc-800 dark:bg-zinc-800 rounded mb-3"></div>
              {/* 1h row */}
              <div className="space-y-1 mb-3">
                <div className="h-6 bg-zinc-800 dark:bg-zinc-800 rounded mb-1"></div>
                <div className="h-4 bg-zinc-800 dark:bg-zinc-800 rounded w-24"></div>
              </div>
              {/* Divider */}
              <div className="border-t border-[var(--card-border)] my-2"></div>
              {/* 24h row */}
              <div className="space-y-1">
                <div className="h-6 bg-zinc-800 dark:bg-zinc-800 rounded mb-1"></div>
                <div className="h-4 bg-zinc-800 dark:bg-zinc-800 rounded w-24"></div>
              </div>
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
      <div className="mb-3">
        <h2 className="text-sm font-medium text-white mb-1">
          📊 Flow Intelligence
        </h2>
        <p className="text-xs text-zinc-400">
          <span className="font-medium">Top Token Flows</span> - Aggregate inflows vs outflows across major tokens on ETH, SOL, and Base by wallet category
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <IntelligenceCard
          emoji="🐋"
          label="Whales"
          data1h={{
            netFlowUsd: aggregated['1h'].whale.netFlowUsd,
            walletCount: aggregated['1h'].whale.walletCount,
          }}
          data24h={{
            netFlowUsd: aggregated['24h'].whale.netFlowUsd,
            walletCount: aggregated['24h'].whale.walletCount,
          }}
        />

        <IntelligenceCard
          emoji="🧠"
          label="Smart Money"
          data1h={{
            netFlowUsd: aggregated['1h'].smartTrader.netFlowUsd,
            walletCount: aggregated['1h'].smartTrader.walletCount,
          }}
          data24h={{
            netFlowUsd: aggregated['24h'].smartTrader.netFlowUsd,
            walletCount: aggregated['24h'].smartTrader.walletCount,
          }}
        />

        <IntelligenceCard
          emoji="🏦"
          label="Exchanges"
          data1h={{
            netFlowUsd: aggregated['1h'].exchange.netFlowUsd,
            walletCount: aggregated['1h'].exchange.walletCount,
          }}
          data24h={{
            netFlowUsd: aggregated['24h'].exchange.netFlowUsd,
            walletCount: aggregated['24h'].exchange.walletCount,
          }}
        />
      </div>

      <div className="mt-3 p-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
        <p className="text-xs text-zinc-400">
          <span className="font-semibold text-white">How to read:</span> Arrows show direction (↑ inflow, ↓ outflow).
          Watch for divergence - if whales are accumulating (↑) while exchanges see outflows (↓), it signals strong conviction.
        </p>
      </div>

      <p className="text-xs text-zinc-400 mt-2">
        Updated: {new Date(intelligence.lastUpdated).toLocaleTimeString()}
      </p>
    </div>
  );
}
