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
import { getExplorerUrl } from '@/lib/utils/chains';

interface FlowCardProps {
  flow: Flow;
}

export function FlowCard({ flow }: FlowCardProps) {
  const explorerUrl = getExplorerUrl(flow.chain, flow.txHash);
  const emoji = getFlowTypeEmoji(flow.type, flow.metadata?.category);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">
              {formatFlowType(flow.type)}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatTimeAgo(flow.timestamp)}
            </p>
          </div>
        </div>
        <ChainBadge chain={flow.chain} />
      </div>

      <div className="mb-4">
        <div className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">
          {formatUsd(flow.amountUsd, 2)}
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {flow.token.symbol}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {flow.type === 'token-launch' ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">DEX:</span>
              <span className="text-zinc-900 dark:text-white">
                {flow.from.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">Pair:</span>
              <span className="text-zinc-900 dark:text-white font-mono">
                {flow.to.label}
              </span>
            </div>
            {flow.metadata?.volume24h && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">24h Vol:</span>
                <span className="text-zinc-900 dark:text-white">
                  {formatUsd(flow.metadata.volume24h, 1)}
                </span>
              </div>
            )}
            {flow.metadata?.priceChange24h !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">24h Change:</span>
                <span className={flow.metadata.priceChange24h >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {flow.metadata.priceChange24h.toFixed(2)}%
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">From:</span>
              <span className="text-zinc-900 dark:text-white font-mono">
                {flow.from.label || truncateAddress(flow.from.address)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">To:</span>
              <span className="text-zinc-900 dark:text-white font-mono">
                {flow.to.label || truncateAddress(flow.to.address)}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <span>View on Explorer</span>
          <ExternalLink className="w-3 h-3" />
        </a>
        <ShareButton flow={flow} />
      </div>
    </div>
  );
}
