'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { Chain } from '@/types/movement';

interface FilterOption {
  id: string;
  label: string;
  description?: string;
}

const CATEGORY_FILTERS: FilterOption[] = [
  {
    id: 'all',
    label: 'All Movements',
    description: 'All whale movements across chains ($5M+ ETH, $1M+ others)'
  },
  {
    id: 'exchanges',
    label: 'Exchange Flows',
    description: 'CEX deposits & withdrawals (Binance, Coinbase, Kraken, etc.) - Track institutional moves'
  },
  {
    id: 'smart_money',
    label: 'Smart Money',
    description: 'Elite traders & Nansen Smart Money wallets - Follow the profits'
  },
  {
    id: 'defi',
    label: 'DeFi Activity',
    description: 'Lending, borrowing & liquidity moves (Aave, Morpho, Compound) - Track DeFi flows'
  },
  {
    id: 'stablecoins',
    label: 'Stablecoin Flows',
    description: 'USDC, USDT, DAI movements - Track liquidity shifts'
  },
  {
    id: 'mega_whales',
    label: 'Mega Whales',
    description: '$50M+ movements only - The biggest players'
  },
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
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="space-y-3">
      {/* Chain Filters */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Filter by Chain</h3>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {activeChains.length} selected
          </span>
        </div>
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
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Filter by Category</h3>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
          >
            {showHelp ? '✕ Hide' : 'ℹ️ What do these mean?'}
          </button>
        </div>

        {showHelp && (
          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs space-y-2">
            <div>
              <span className="font-semibold text-blue-900 dark:text-blue-100">Powered by Nansen API</span>
              <p className="text-blue-800 dark:text-blue-200 mt-1">
                All data enriched with Nansen labels, entity mapping, and smart money tracking
              </p>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-blue-200 dark:border-blue-800">
              {CATEGORY_FILTERS.map(filter => (
                <div key={filter.id}>
                  <span className="font-medium text-blue-900 dark:text-blue-100">{filter.label}:</span>
                  <span className="text-blue-700 dark:text-blue-300 ml-1">{filter.description}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
              <strong>Thresholds:</strong> ETH $5M+ | SOL/BASE/HL $1M+
            </div>
          </div>
        )}

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
