'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { FilterPills } from '@/components/layout/FilterPills';
import { FlowList } from '@/components/flows/FlowList';
import { Movement } from '@/types/movement';
import { Flow } from '@/types/flows';

export default function Home() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [chainFilter, setChainFilter] = useState<Movement['chain'][]>(['ethereum', 'solana', 'base']);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch movements from unified API
  useEffect(() => {
    let isCancelled = false;
    let interval: NodeJS.Timeout;

    const fetchMovements = async () => {
      try {
        console.log('[Home] Fetching movements...');
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

        console.log('[Home] Received movements:', data.movements?.length || 0);
        console.log('[Home] Sample movement:', data.movements?.[0]);

        if (!isCancelled) {
          setMovements(data.movements || []);
          setLastUpdated(new Date());
          setIsLoading(false);
          setError(null);
        }
      } catch (error) {
        console.error('[Home] Error fetching movements:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch movements';
        if (!isCancelled) {
          setMovements([]);
          setIsLoading(false);
          setError(errorMessage);
        }
      }
    };

    // Initial fetch
    fetchMovements();

    // Set up auto-refresh every 5 minutes (data is cached for 1 hour)
    // More frequent refreshes aren't needed since movements persist longer
    interval = setInterval(fetchMovements, 5 * 60 * 1000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Client-side filtering
  const filteredMovements = movements.filter(m => {
    // Chain filter
    if (!chainFilter.includes(m.chain)) return false;

    // Category filter
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'exchanges') return m.tags.includes('exchange');
    if (categoryFilter === 'smart_money') return m.tags.includes('smart_money');
    if (categoryFilter === 'defi') return m.tags.includes('defi') || m.tags.includes('protocol');
    if (categoryFilter === 'public_figures') return m.tags.includes('public_figure');
    if (categoryFilter === 'whale_movements') return m.tier === 3 || m.tags.includes('whale');
    if (categoryFilter === 'mega_whales') return m.tags.includes('mega_whale');
    return true;
  });

  const toggleChain = (chain: Movement['chain']) => {
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

  // Convert Movement[] to Flow[] for FlowList compatibility
  const flows: Flow[] = filteredMovements.map(m => ({
    id: m.id,
    type: m.movementType === 'swap' ? 'whale-movement' : 'whale-movement',
    chain: m.chain,
    timestamp: m.ts,
    amount: m.tokenAmount || 0, // Use real token amount from Nansen
    amountUsd: m.amountUsd,
    token: {
      symbol: m.assetSymbol || 'UNKNOWN',
      address: m.assetAddress || '',
      name: m.assetSymbol || 'Unknown',
    },
    from: {
      address: m.fromAddress || '',
      label: m.fromLabel || 'Unknown Wallet',
    },
    to: {
      address: m.toAddress || '',
      label: m.toLabel || 'Unknown Wallet',
    },
    txHash: m.txHash || '',
    metadata: {
      category: m.tags[0] || 'Unknown',
    },
  }));

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

        {lastUpdated && (
          <p className="text-xs text-zinc-500 mb-4">
            Last updated: {lastUpdated.toLocaleTimeString()} • {movements.length} movements • {filteredMovements.length} after filter
          </p>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-red-900 dark:text-red-100 font-medium">Error loading movements</p>
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {!isLoading && !error && movements.length > 0 && filteredMovements.length === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <p className="text-yellow-900 dark:text-yellow-100 font-medium">No movements match this filter</p>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">Try selecting "All" or a different category</p>
          </div>
        )}

        <main>
          <FlowList flows={flows} isLoading={isLoading} />
        </main>
      </div>
    </div>
  );
}
