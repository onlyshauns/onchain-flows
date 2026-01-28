'use client';

import { TabType } from '@/types/flows';
import { useFlows } from '@/context/FlowsContext';
import clsx from 'clsx';

const TABS: { id: TabType; label: string; emoji: string }[] = [
  { id: 'whale', label: 'Whale Movements', emoji: '🐋' },
  { id: 'public-figures', label: 'Public Figures', emoji: '👤' },
  { id: 'fund-movements', label: 'Fund Movements', emoji: '🏦' },
  { id: 'smart-money', label: 'Smart Money', emoji: '🧠' },
  { id: 'defi', label: 'DeFi Activities', emoji: '💰' },
];

export function TabNavigation() {
  const { activeTab, setActiveTab } = useFlows();

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative',
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              )}
            >
              <span className="mr-2">{tab.emoji}</span>
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
