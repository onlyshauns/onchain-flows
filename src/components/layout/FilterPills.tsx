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
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Chains</h3>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CHAIN_FILTERS.map(chain => (
            <button
              key={chain.id}
              onClick={() => onToggleChain(chain.id)}
              className={clsx(
                'px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 border',
                activeChains.includes(chain.id)
                  ? 'bg-[var(--accent)] text-[var(--nansen-dark)] shadow-[0_0_15px_rgba(0,255,167,0.3)] border-[var(--accent)]'
                  : 'bg-[var(--card-bg)] border-[var(--accent)] border-opacity-40 text-[var(--foreground)] hover:border-opacity-70'
              )}
            >
              <span className="text-base">{chain.icon}</span>
              <span>{chain.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Filters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Categories</h3>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-xs text-[var(--accent)] hover:opacity-80 flex items-center gap-1 transition-all font-medium"
          >
            {showHelp ? '✕ Hide' : 'ℹ️ What do these mean?'}
          </button>
        </div>

        {showHelp && (
          <div className="mb-3 p-3 bg-[var(--card-bg)] border border-[var(--accent)] border-opacity-30 rounded-lg text-xs space-y-2">
            <div>
              <span className="font-semibold text-[var(--accent)]">Powered by Nansen API</span>
              <p className="text-[var(--foreground)] opacity-80 mt-1">
                All data enriched with Nansen labels, entity mapping, and smart money tracking
              </p>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-[var(--card-border)]">
              {CATEGORY_FILTERS.map(filter => (
                <div key={filter.id}>
                  <span className="font-medium text-[var(--foreground)]">{filter.label}:</span>
                  <span className="text-[var(--foreground)] opacity-70 ml-1">{filter.description}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-[var(--card-border)] text-[var(--foreground)] opacity-80">
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
                'px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all border',
                activeCategory === filter.id
                  ? 'bg-[var(--accent)] text-[var(--nansen-dark)] shadow-[0_0_15px_rgba(0,255,167,0.3)] border-[var(--accent)]'
                  : 'bg-[var(--card-bg)] border-[var(--accent)] border-opacity-40 text-[var(--foreground)] hover:border-opacity-70'
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
