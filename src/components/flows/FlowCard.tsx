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

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 hover:border-[var(--accent)] hover:shadow-lg hover:nansen-glow transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{emoji}</span>
          <div>
            <h3 className="font-bold text-[var(--foreground)]">
              {formatFlowType(flow.type)}
            </h3>
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
          <span>View on Nansen</span>
          <ExternalLink className="w-4 h-4" />
        </a>
        <ShareButton flow={flow} />
      </div>
    </div>
  );
}
