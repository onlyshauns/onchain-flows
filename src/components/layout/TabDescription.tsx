'use client';

import { TabType } from '@/types/flows';

interface TabDescriptionProps {
  tab: TabType;
}

const TAB_DESCRIPTIONS: Record<TabType, { title: string; description: string; threshold: string }> = {
  whale: {
    title: 'Whale Movements',
    description: 'Large-scale crypto transfers by major holders',
    threshold: '$1M+ transfers',
  },
  'public-figures': {
    title: 'Public Figures',
    description: 'Onchain activity from known crypto influencers and personalities',
    threshold: '$100K+ transfers',
  },
  'fund-movements': {
    title: 'Fund Movements',
    description: 'Institutional and venture capital fund activity',
    threshold: '$1M+ transfers',
  },
  'smart-money': {
    title: 'Smart Money',
    description: 'Trades from consistently profitable wallets tracked by Nansen',
    threshold: '$10K-$1M transfers',
  },
  defi: {
    title: 'DeFi Activities',
    description: 'Decentralized exchange swaps, liquidity pools, and protocol interactions',
    threshold: '$25K+ transactions',
  },
  tokens: {
    title: 'Token Launches',
    description: 'Recently launched tokens with significant trading volume',
    threshold: 'Trending new tokens',
  },
};

export function TabDescription({ tab }: TabDescriptionProps) {
  const config = TAB_DESCRIPTIONS[tab];

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              {config.title}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
              {config.description}
            </p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {config.threshold}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
