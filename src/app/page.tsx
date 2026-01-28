'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { FilterPills } from '@/components/layout/FilterPills';
import { FlowList } from '@/components/flows/FlowList';
import { Movement } from '@/types/movement';
import { Flow } from '@/types/flows';

export default function Home() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch movements from unified API
  useEffect(() => {
    let isCancelled = false;
    let interval: NodeJS.Timeout;

    const fetchMovements = async () => {
      try {
        console.log('[Home] Fetching movements...');

        const response = await fetch('/api/movements', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });
        const data = await response.json();

        console.log('[Home] Received movements:', data.movements?.length || 0);

        if (!isCancelled) {
          setMovements(data.movements || []);
          setLastUpdated(new Date());
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[Home] Error fetching movements:', error);
        if (!isCancelled) {
          setMovements([]);
          setIsLoading(false);
        }
      }
    };

    // Initial fetch
    fetchMovements();

    // Set up auto-refresh every 30 seconds
    interval = setInterval(fetchMovements, 30000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Client-side filtering
  const filteredMovements = movements.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'exchanges') return m.tags.includes('exchange');
    if (filter === 'funds') return m.tags.includes('fund');
    if (filter === 'protocols') return m.tags.includes('protocol');
    if (filter === 'high_conviction') return m.confidence === 'high' && m.amountUsd > 10_000_000;
    return true;
  });

  // Convert Movement[] to Flow[] for FlowList compatibility
  const flows: Flow[] = filteredMovements.map(m => ({
    id: m.id,
    type: m.movementType === 'swap' ? 'whale-movement' : 'whale-movement',
    chain: m.chain,
    timestamp: m.ts,
    amount: m.amountUsd / 1000, // FlowList expects token amount, we'll fix display
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
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
            Filter by category
          </h2>
          <FilterPills active={filter} onSelect={setFilter} />
        </div>

        {lastUpdated && (
          <p className="text-xs text-zinc-500 mb-4">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}

        <main>
          <FlowList flows={flows} isLoading={isLoading} />
        </main>
      </div>
    </div>
  );
}
