'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { FilterPills } from '@/components/layout/FilterPills';
import { FlowList } from '@/components/flows/FlowList';
import { IntelligenceSummary } from '@/components/intelligence/IntelligenceSummary';
import { Flow, Chain } from '@/types/flows';
import { FlowIntelligenceSummary } from '@/server/flows/intelligence';

export default function Home() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [intelligence, setIntelligence] = useState<FlowIntelligenceSummary | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [chainFilter, setChainFilter] = useState<Chain[]>(['ethereum', 'solana', 'base']);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingIntelligence, setIsLoadingIntelligence] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch flows from unified API
  useEffect(() => {
    let isCancelled = false;
    let interval: NodeJS.Timeout;

    const fetchFlows = async () => {
      try {
        console.log('[Home] Fetching flows...');
        setError(null);

        const response = await fetch('/api/movements', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        console.log('[Home] Received flows:', data.flows?.length || 0);
        console.log('[Home] Sample flow:', data.flows?.[0]);

        if (!isCancelled) {
          setFlows(data.flows || []);
          setLastUpdated(new Date());
          setIsLoading(false);
          setError(null);
        }
      } catch (error) {
        console.error('[Home] Error fetching flows:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch flows';
        if (!isCancelled) {
          setFlows([]);
          setIsLoading(false);
          setError(errorMessage);
        }
      }
    };

    // Initial fetch
    fetchFlows();

    // Set up auto-refresh every 2 minutes (aligned with CDN cache)
    // More frequent refreshes provide fresher data
    interval = setInterval(fetchFlows, 2 * 60 * 1000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Fetch flow intelligence
  useEffect(() => {
    let isCancelled = false;
    let interval: NodeJS.Timeout;

    const fetchIntelligence = async () => {
      try {
        console.log('[Home] Fetching intelligence...');

        const chainsParam = chainFilter.join(',');
        const response = await fetch(`/api/intelligence?chains=${chainsParam}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(`Intelligence API error: ${response.status}`);
        }

        const data = await response.json();

        console.log('[Home] Received intelligence:', data);

        if (!isCancelled) {
          setIntelligence(data);
          setIsLoadingIntelligence(false);
        }
      } catch (error) {
        console.error('[Home] Error fetching intelligence:', error);
        if (!isCancelled) {
          setIntelligence(null);
          setIsLoadingIntelligence(false);
        }
      }
    };

    // Initial fetch
    fetchIntelligence();

    // Refresh every 10 minutes (intelligence data updates slower)
    interval = setInterval(fetchIntelligence, 10 * 60 * 1000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [chainFilter]); // Re-fetch when chain filter changes

  // Client-side filtering
  const filteredFlows = flows.filter(f => {
    // Chain filter
    if (!chainFilter.includes(f.chain)) return false;

    // Category filter
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'exchanges') return f.metadata?.category === 'exchange';
    if (categoryFilter === 'smart_money') return f.type === 'smart-money' || f.metadata?.category === 'smart_money';
    if (categoryFilter === 'defi') return f.type === 'defi-activity' || f.metadata?.category === 'defi' || f.metadata?.category === 'protocol';
    if (categoryFilter === 'public_figures') return f.metadata?.category === 'public_figure';
    if (categoryFilter === 'whale_movements') return f.type === 'whale-movement';
    if (categoryFilter === 'mega_whales') return f.type === 'whale-movement' && f.metadata?.category === 'mega_whale';
    return true;
  });

  const toggleChain = (chain: Chain) => {
    setChainFilter(prev => {
      if (prev.includes(chain)) {
        // If deselecting, keep at least one chain selected
        const newFilter = prev.filter(c => c !== chain);
        return newFilter.length > 0 ? newFilter : prev;
      } else {
        // Add the chain to selection
        return [...prev, chain];
      }
    });
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <FilterPills
            activeCategory={categoryFilter}
            activeChains={chainFilter}
            onSelectCategory={setCategoryFilter}
            onToggleChain={toggleChain}
          />
        </div>

        <IntelligenceSummary
          intelligence={intelligence}
          isLoading={isLoadingIntelligence}
        />

        {lastUpdated && (
          <p className="text-xs text-zinc-500 mb-4">
            Last updated: {lastUpdated.toLocaleTimeString()} • {flows.length} flows • {filteredFlows.length} after filter
          </p>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-red-900 dark:text-red-100 font-medium">Error loading flows</p>
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {!isLoading && !error && flows.length > 0 && filteredFlows.length === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <p className="text-yellow-900 dark:text-yellow-100 font-medium">No flows match this filter</p>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">Try selecting "All" or a different category</p>
          </div>
        )}

        <main>
          <FlowList flows={filteredFlows} isLoading={isLoading} />
        </main>
      </div>
    </div>
  );
}
