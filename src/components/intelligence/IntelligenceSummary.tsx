import { IntelligenceCard } from './IntelligenceCard';
import { SentimentGauge } from './SentimentGauge';
import { IntelligenceShareButton } from './IntelligenceShareButton';
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

  const { aggregated, tokenBreakdown } = intelligence;

  // Extract token flows for each category (lowered thresholds to show more data)
  const whaleTokens = tokenBreakdown
    .filter(t => Math.abs(t.whale) > 50_000)
    .map(t => ({ symbol: t.symbol, amount: t.whale, direction: t.whale > 0 ? 'inflow' as const : 'outflow' as const }));

  const smartMoneyTokens = tokenBreakdown
    .filter(t => Math.abs(t.smartTrader) > 1_000)
    .map(t => ({ symbol: t.symbol, amount: t.smartTrader, direction: t.smartTrader > 0 ? 'inflow' as const : 'outflow' as const }));

  const exchangeTokens = tokenBreakdown
    .filter(t => Math.abs(t.exchange) > 500_000)
    .map(t => ({ symbol: t.symbol, amount: t.exchange, direction: t.exchange > 0 ? 'inflow' as const : 'outflow' as const }));

  return (
    <div className="mb-2">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          <span className="font-medium">Top Token Flows</span> - Aggregate inflows vs outflows across major tokens on ETH, SOL, and Base by wallet category
        </p>
        <IntelligenceShareButton intelligence={intelligence} />
      </div>

      {/* Fear & Greed Index */}
      <div className="mb-2">
        <SentimentGauge />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <IntelligenceCard
          emoji="🐋"
          label="Whales"
          type="whale"
          data1h={{
            netFlowUsd: aggregated['1h'].whale.netFlowUsd,
            walletCount: aggregated['1h'].whale.walletCount,
          }}
          data24h={{
            netFlowUsd: aggregated['24h'].whale.netFlowUsd,
            walletCount: aggregated['24h'].whale.walletCount,
          }}
          tokenFlows={whaleTokens}
        />

        <IntelligenceCard
          emoji="🧠"
          label="Smart Money"
          type="smart-money"
          data1h={{
            netFlowUsd: aggregated['1h'].smartTrader.netFlowUsd,
            walletCount: aggregated['1h'].smartTrader.walletCount,
          }}
          data24h={{
            netFlowUsd: aggregated['24h'].smartTrader.netFlowUsd,
            walletCount: aggregated['24h'].smartTrader.walletCount,
          }}
          tokenFlows={smartMoneyTokens}
        />

        <IntelligenceCard
          emoji="🏦"
          label="Exchanges"
          type="exchange"
          data1h={{
            netFlowUsd: aggregated['1h'].exchange.netFlowUsd,
            walletCount: aggregated['1h'].exchange.walletCount,
          }}
          data24h={{
            netFlowUsd: aggregated['24h'].exchange.netFlowUsd,
            walletCount: aggregated['24h'].exchange.walletCount,
          }}
          tokenFlows={exchangeTokens}
        />
      </div>

      <div className="mt-3 p-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
        <p className="text-xs text-zinc-400">
          <span className="font-semibold text-white">How to read:</span> Green = bullish (accumulation), Red = bearish (distribution).
          For exchanges: withdrawals = bullish (accumulation), deposits = bearish (selling pressure).
          Watch for divergence - whales accumulating + exchange outflows = strong conviction.
        </p>
      </div>

      <p className="text-xs text-zinc-400 mt-2">
        Updated: {new Date(intelligence.lastUpdated).toLocaleTimeString()}
      </p>
    </div>
  );
}
