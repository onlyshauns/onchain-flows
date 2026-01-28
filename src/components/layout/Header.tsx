'use client';

import { Activity } from 'lucide-react';
import { useFlows } from '@/context/FlowsContext';
import { formatTimeAgo } from '@/lib/utils/formatting';

export function Header() {
  const { isRefreshing, lastUpdated } = useFlows();

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" strokeWidth={2.5} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Onchain Flows
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Live Crypto Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                {isRefreshing ? (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span>Updating...</span>
                  </div>
                ) : (
                  <span>Updated {formatTimeAgo(lastUpdated.getTime())}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
