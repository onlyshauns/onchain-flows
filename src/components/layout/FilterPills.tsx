'use client';

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
    id: 'whale_movements',
    label: 'Whale Movements',
    description: 'Large movements $5M+ ETH, $2M+ SOL/BASE - Pure size-based filtering'
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
  { id: 'ethereum', label: 'ETH', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=035' },
  { id: 'solana', label: 'SOL', icon: 'https://cryptologos.cc/logos/solana-sol-logo.svg?v=035' },
  { id: 'base', label: 'BASE', icon: 'https://avatars.githubusercontent.com/u/108554348?s=280&v=4' },
];

interface FilterPillsProps {
  activeCategory: string;
  activeChains: Chain[];
  onSelectCategory: (filterId: string) => void;
  onToggleChain: (chain: Chain) => void;
}

export function FilterPills({ activeCategory, activeChains, onSelectCategory, onToggleChain }: FilterPillsProps) {
  // Find active category description
  const activeCategoryInfo = CATEGORY_FILTERS.find(f => f.id === activeCategory);

  return (
    <div className="space-y-4">
      {/* Chain Filters */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Chains</h3>
          <p className="text-xs text-[var(--foreground)] opacity-60 mt-1">
            Select chains to view movements from
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CHAIN_FILTERS.map(chain => {
            const isActive = activeChains.includes(chain.id);
            return (
              <button
                key={chain.id}
                onClick={() => onToggleChain(chain.id)}
                className={clsx(
                  'px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 border',
                  isActive
                    ? 'bg-[var(--accent)] text-[var(--nansen-dark)] shadow-[0_0_15px_rgba(0,255,167,0.3)] border-[var(--accent)]'
                    : 'bg-[var(--card-bg)] border-[var(--accent)] border-opacity-40 text-[var(--foreground)] opacity-60 hover:opacity-100 hover:border-opacity-70'
                )}
              >
                <img src={chain.icon} alt={chain.label} className="w-5 h-5" />
                <span>{chain.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[var(--foreground)] opacity-50 mt-2">
          {activeChains.length} of {CHAIN_FILTERS.length} chains selected
        </p>
      </div>

      {/* Category Filters */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Categories</h3>
          <p className="text-xs text-[var(--foreground)] opacity-60 mt-1">
            Filter by movement type
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORY_FILTERS.map(filter => (
            <button
              key={filter.id}
              onClick={() => onSelectCategory(filter.id)}
              className={clsx(
                'px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all border',
                activeCategory === filter.id
                  ? 'bg-[var(--accent)] text-[var(--nansen-dark)] shadow-[0_0_15px_rgba(0,255,167,0.3)] border-[var(--accent)]'
                  : 'bg-[var(--card-bg)] border-[var(--accent)] border-opacity-40 text-[var(--foreground)] opacity-60 hover:opacity-100 hover:border-opacity-70'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Show active category description */}
        {activeCategoryInfo && (
          <div className="mt-3 p-3 bg-[var(--card-bg)] border border-[var(--accent)] border-opacity-30 rounded-lg">
            <p className="text-xs text-[var(--foreground)] opacity-80">
              {activeCategoryInfo.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
