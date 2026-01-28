'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { TabNavigation } from '@/components/layout/TabNavigation';
import { ChainFilter } from '@/components/layout/ChainFilter';
import { FlowList } from '@/components/flows/FlowList';
import { useFlows } from '@/context/FlowsContext';
import { Flow } from '@/types/flows';

export default function Home() {
  const { activeTab, selectedChains, setIsRefreshing, setLastUpdated } = useFlows();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch flows based on active tab and selected chains
  useEffect(() => {
    let isCancelled = false;

    const fetchFlows = async () => {
      try {
        setIsRefreshing(true);

        // Map tab to API endpoint
        const endpointMap: Record<string, string> = {
          trending: '/api/flows/trending',
          'public-figures': '/api/flows/public-figures',
          'fund-movements': '/api/flows/fund-movements',
          whale: '/api/flows/whale-movements',
          'smart-money': '/api/flows/whale-movements', // Reusing for now
          defi: '/api/flows/whale-movements', // Reusing for now
          tokens: '/api/flows/whale-movements', // Reusing for now
        };

        const endpoint = endpointMap[activeTab];
        const chainsParam = selectedChains.join(',');
        const url = `${endpoint}?chains=${chainsParam}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!isCancelled) {
          setFlows(data.flows || []);
          setLastUpdated(new Date());
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching flows:', error);
        if (!isCancelled) {
          setIsLoading(false);
        }
      } finally {
        if (!isCancelled) {
          setIsRefreshing(false);
        }
      }
    };

    fetchFlows();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchFlows, 30000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [activeTab, selectedChains, setIsRefreshing, setLastUpdated]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Header />
      <TabNavigation />
      <ChainFilter />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FlowList flows={flows} isLoading={isLoading} />
      </main>
    </div>
  );
}
