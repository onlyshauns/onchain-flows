'use client';

import { useFlows } from '@/context/FlowsContext';
import { getAllChains, getChainConfig } from '@/lib/utils/chains';
import clsx from 'clsx';

export function ChainFilter() {
  const { selectedChains, toggleChain } = useFlows();
  const chains = getAllChains();

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Chains:
          </span>
          <div className="flex flex-wrap gap-2">
            {chains.map((chain) => {
              const config = getChainConfig(chain);
              const isSelected = selectedChains.includes(chain);

              return (
                <button
                  key={chain}
                  onClick={() => toggleChain(chain)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                    isSelected
                      ? 'text-white shadow-md'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  )}
                  style={
                    isSelected
                      ? { backgroundColor: config.color }
                      : undefined
                  }
                >
                  <span className="mr-1.5">{config.icon}</span>
                  {config.symbol}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
