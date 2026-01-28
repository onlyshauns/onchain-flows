'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Chain, TabType } from '@/types/flows';
import { DEFAULT_CHAINS } from '@/lib/utils/chains';

interface FlowsContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  selectedChains: Chain[];
  toggleChain: (chain: Chain) => void;
  setSelectedChains: (chains: Chain[]) => void;
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
  isRefreshing: boolean;
  setIsRefreshing: (isRefreshing: boolean) => void;
  lastUpdated: Date | null;
  setLastUpdated: (date: Date | null) => void;
}

const FlowsContext = createContext<FlowsContextType | undefined>(undefined);

export function FlowsProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabType>('whale');
  const [selectedChains, setSelectedChains] = useState<Chain[]>(DEFAULT_CHAINS);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Sync with URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const chainsParam = params.get('chains');

    if (tabParam && ['whale', 'public-figures', 'fund-movements', 'smart-money', 'defi', 'tokens'].includes(tabParam)) {
      setActiveTab(tabParam as TabType);
    }

    if (chainsParam) {
      const chains = chainsParam.split(',') as Chain[];
      setSelectedChains(chains.filter(c => c)); // Filter out empty strings
    }
  }, []);

  // Update URL when state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams();
    params.set('tab', activeTab);
    if (selectedChains.length > 0) {
      params.set('chains', selectedChains.join(','));
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [activeTab, selectedChains]);

  const toggleChain = (chain: Chain) => {
    setSelectedChains((prev) =>
      prev.includes(chain) ? prev.filter((c) => c !== chain) : [...prev, chain]
    );
  };

  return (
    <FlowsContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedChains,
        toggleChain,
        setSelectedChains,
        refreshInterval,
        setRefreshInterval,
        isRefreshing,
        setIsRefreshing,
        lastUpdated,
        setLastUpdated,
      }}
    >
      {children}
    </FlowsContext.Provider>
  );
}

export function useFlows() {
  const context = useContext(FlowsContext);
  if (context === undefined) {
    throw new Error('useFlows must be used within a FlowsProvider');
  }
  return context;
}
