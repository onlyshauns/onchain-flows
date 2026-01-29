'use client';

import { Flow } from '@/types/flows';
import { ChainBadge } from '@/components/shared/ChainBadge';
import { ShareButton } from '@/components/shared/ShareButton';
import { ExternalLink } from 'lucide-react';
import {
  formatUsd,
  truncateAddress,
  formatTimeAgo,
  getFlowTypeEmoji,
  formatFlowType,
} from '@/lib/utils/formatting';
import { getNansenTxUrl } from '@/lib/utils/chains';

interface FlowCardProps {
  flow: Flow;
}

export function FlowCard({ flow }: FlowCardProps) {
  const nansenUrl = getNansenTxUrl(flow.chain, flow.txHash);
  const emoji = getFlowTypeEmoji(flow.type, flow.metadata?.category);
  const score = flow.metadata?.score || 0;

  // Determine visual priority based on score
  const isHighPriority = score >= 90;
  const isMediumPriority = score >= 70 && score < 90;

  const cardClasses = [
    'bg-[var(--card-bg)] rounded-xl p-6 transition-all duration-300',
    'hover:shadow-lg hover:nansen-glow',
    isHighPriority
      ? 'border-2 border-yellow-500 dark:border-yellow-400 animate-pulse-subtle shadow-yellow-500/20'
      : isMediumPriority
      ? 'border-2 border-blue-500 dark:border-blue-400'
      : 'border border-[var(--card-border)] hover:border-[var(--accent)]',
  ].join(' ');

  return (
    <div className={cardClasses}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[var(--foreground)]">
                {formatFlowType(flow.type)}
              </h3>
              {score > 0 && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full cursor-help ${
                    isHighPriority
                      ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                      : isMediumPriority
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400'
                  }`}
                  title={`Interestingness Score: ${score}/100\n\nBased on:\n• Data quality (smart money trades score higher)\n• Transaction size\n• Entity reputation\n• Recency\n\n90+ = High priority\n70-89 = Medium priority\n<70 = Standard`}
                >
                  {score}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--foreground)] opacity-50">
              {formatTimeAgo(flow.timestamp)}
            </p>
          </div>
        </div>
        <ChainBadge chain={flow.chain} />
      </div>

      <div className="mb-5">
        <div className="text-4xl font-bold text-[var(--accent)] mb-2">
          {formatUsd(flow.amountUsd, 2)}
        </div>
        <div className="text-sm font-medium text-[var(--foreground)] opacity-70">
          {flow.token.symbol}
        </div>
      </div>

      <div className="space-y-3 mb-5">
        {flow.type === 'token-launch' || flow.type === 'defi-activity' ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--foreground)] opacity-60 font-medium">
                {flow.type === 'token-launch' ? 'DEX:' : 'Trading:'}
              </span>
              <span className="text-[var(--foreground)] font-medium">
                {flow.from.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--foreground)] opacity-60 font-medium">Pair:</span>
              <span className="text-[var(--foreground)] font-mono">
                {flow.to.label}
              </span>
            </div>
            {flow.metadata?.volume24h && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[var(--foreground)] opacity-60 font-medium">24h Vol:</span>
                <span className="text-[var(--foreground)] font-medium">
                  {formatUsd(flow.metadata.volume24h, 1)}
                </span>
              </div>
            )}
            {flow.metadata?.priceChange24h !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[var(--foreground)] opacity-60 font-medium">24h Change:</span>
                <span className={flow.metadata.priceChange24h >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {flow.metadata.priceChange24h > 0 ? '+' : ''}{flow.metadata.priceChange24h.toFixed(2)}%
                </span>
              </div>
            )}
            {flow.metadata?.liquidity && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[var(--foreground)] opacity-60 font-medium">Liquidity:</span>
                <span className="text-[var(--foreground)] font-medium">
                  {formatUsd(flow.metadata.liquidity, 1)}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--foreground)] opacity-50 font-medium">From</span>
              <span className="text-[var(--foreground)] font-medium truncate">
                {flow.from.label || truncateAddress(flow.from.address)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--foreground)] opacity-50 font-medium">To</span>
              <span className="text-[var(--foreground)] font-medium truncate">
                {flow.to.label || truncateAddress(flow.to.address)}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[var(--card-border)]">
        <a
          href={nansenUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-[var(--accent)] hover:text-[var(--accent)] hover:underline font-medium transition-all"
        >
          <span>View on Explorer</span>
          <ExternalLink className="w-4 h-4" />
        </a>
        <ShareButton flow={flow} />
      </div>
    </div>
  );
}
