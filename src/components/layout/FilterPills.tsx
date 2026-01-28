'use client';

import clsx from 'clsx';
import { Chain } from '@/types/movement';

interface FilterOption {
  id: string;
  label: string;
  description?: string;
}

const CATEGORY_FILTERS: FilterOption[] = [
  { id: 'all', label: 'All', description: 'All movements' },
  { id: 'exchanges', label: 'Exchanges', description: 'CEX activity' },
  { id: 'smart_money', label: 'Smart Money', description: 'Elite traders' },
  { id: 'defi', label: 'DeFi', description: 'Protocol interactions' },
  { id: 'stablecoins', label: 'Stablecoins', description: 'USDC, USDT, etc.' },
  { id: 'mega_whales', label: 'Mega Whales', description: '$50M+' },
];

interface ChainOption {
  id: Chain;
  label: string;
  icon: string;
}

const CHAIN_FILTERS: ChainOption[] = [
  { id: 'ethereum', label: 'ETH', icon: 'Ξ' },
  { id: 'solana', label: 'SOL', icon: '◎' },
  { id: 'base', label: 'BASE', icon: '🔵' },
  { id: 'hyperliquid', label: 'HL', icon: '⚡' },
];

interface FilterPillsProps {
  activeCategory: string;
  activeChains: Chain[];
  onSelectCategory: (filterId: string) => void;
  onToggleChain: (chain: Chain) => void;
}

export function FilterPills({ activeCategory, activeChains, onSelectCategory, onToggleChain }: FilterPillsProps) {
  return (
    <div className="space-y-3">
      {/* Chain Filters */}
      <div>
        <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Chains</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CHAIN_FILTERS.map(chain => (
            <button
              key={chain.id}
              onClick={() => onToggleChain(chain.id)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5',
                activeChains.includes(chain.id)
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              )}
            >
              <span>{chain.icon}</span>
              <span>{chain.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Filters */}
      <div>
        <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Categories</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORY_FILTERS.map(filter => (
            <button
              key={filter.id}
              onClick={() => onSelectCategory(filter.id)}
              className={clsx(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                activeCategory === filter.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              )}
              title={filter.description}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
