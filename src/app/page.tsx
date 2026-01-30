'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { FlowList } from '@/components/flows/FlowList';
import { IntelligenceSummary } from '@/components/intelligence/IntelligenceSummary';
import { Flow, Chain } from '@/types/flows';
import { FlowIntelligenceSummary } from '@/server/flows/intelligence';

type TabType = 'intelligence' | 'all' | 'deposits' | 'withdrawals' | 'funds' | 'market-makers';

export default function Home() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [intelligence, setIntelligence] = useState<FlowIntelligenceSummary | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('intelligence');
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


  // Tab-based filtering
  const filteredFlows = flows.filter(f => {
    // Chain filter (always apply)
    if (!chainFilter.includes(f.chain)) return false;

    // Tab-specific filtering
    const tags = f.metadata?.tags || [];

    if (activeTab === 'all' || activeTab === 'intelligence') {
      return true; // Show all flows
    }

    if (activeTab === 'deposits') {
      // Big deposits: TO exchanges, $5M+ (lowered threshold)
      return tags.includes('exchange_deposit') && f.amountUsd >= 5_000_000;
    }

    if (activeTab === 'withdrawals') {
      // Big withdrawals: FROM exchanges, $5M+ (lowered threshold)
      return tags.includes('exchange_withdrawal') && f.amountUsd >= 5_000_000;
    }

    if (activeTab === 'funds') {
      // Fund activity: VC/hedge fund movements
      return tags.includes('fund');
    }

    if (activeTab === 'market-makers') {
      // Market maker activity
      return tags.includes('market_maker');
    }

    // token-spotlight and hot-tokens use separate data source
    // (handled via specialTabFlows state)

    return true;
  });

  // Debug logging for frontend filtering
  console.log('[Home] Active tab:', activeTab);
  console.log('[Home] Total flows:', flows.length);
  console.log('[Home] Filtered flows:', filteredFlows.length);
  if (flows.length > 0) {
    console.log('[Home] Sample flow tags:', flows[0].metadata?.tags);
  }
  if (activeTab === 'funds') {
    const fundFlows = flows.filter(f => f.metadata?.tags?.includes('fund'));
    console.log('[Home] Fund flows found:', fundFlows.length);
  }
  if (activeTab === 'market-makers') {
    const mmFlows = flows.filter(f => f.metadata?.tags?.includes('market_maker'));
    console.log('[Home] Market maker flows found:', mmFlows.length);
  }
  if (filteredFlows.length === 0 && flows.length > 0 && (activeTab === 'deposits' || activeTab === 'withdrawals')) {
    console.warn('[Home] No flows match this tab! Check exchange_deposit/exchange_withdrawal tags');
  }

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
        {/* Chain Filters */}
        <div className="mb-1">
          <h3 className="text-xs font-semibold text-[var(--foreground)] mb-1.5">Chains</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { id: 'ethereum' as Chain, label: 'ETH', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=035' },
              { id: 'solana' as Chain, label: 'SOL', icon: 'https://cryptologos.cc/logos/solana-sol-logo.svg?v=035' },
              { id: 'base' as Chain, label: 'BASE', icon: 'https://avatars.githubusercontent.com/u/108554348?s=280&v=4' },
            ].map(chain => {
              const isActive = chainFilter.includes(chain.id);
              return (
                <button
                  key={chain.id}
                  onClick={() => toggleChain(chain.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                    isActive
                      ? 'bg-[var(--accent)] text-[var(--nansen-dark)] shadow-[0_0_15px_rgba(0,255,167,0.3)] border-[var(--accent)]'
                      : 'bg-[var(--card-bg)] border-[var(--accent)] border-opacity-40 text-[var(--foreground)] opacity-60 hover:opacity-100 hover:border-opacity-70'
                  }`}
                >
                  <img src={chain.icon} alt={chain.label} className="w-4 h-4" />
                  <span>{chain.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-2">
          <div className="border-b border-zinc-800">
            <div className="flex gap-1 overflow-x-auto">
              <button
                onClick={() => setActiveTab('intelligence')}
                className={`px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap rounded-t-lg ${
                  activeTab === 'intelligence'
                    ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-zinc-900/50'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/30'
                }`}
              >
                📊 Flow Intelligence
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap rounded-t-lg ${
                  activeTab === 'all'
                    ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-zinc-900/50'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/30'
                }`}
              >
                🌊 All Flows
              </button>
              <button
                onClick={() => setActiveTab('deposits')}
                className={`px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap rounded-t-lg ${
                  activeTab === 'deposits'
                    ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-zinc-900/50'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/30'
                }`}
              >
                📥 Large Deposits
              </button>
              <button
                onClick={() => setActiveTab('withdrawals')}
                className={`px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap rounded-t-lg ${
                  activeTab === 'withdrawals'
                    ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-zinc-900/50'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/30'
                }`}
              >
                📤 Large Withdrawals
              </button>
              <button
                onClick={() => setActiveTab('funds')}
                className={`px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap rounded-t-lg ${
                  activeTab === 'funds'
                    ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-zinc-900/50'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/30'
                }`}
              >
                🏢 Fund Activity
              </button>
              <button
                onClick={() => setActiveTab('market-makers')}
                className={`px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap rounded-t-lg ${
                  activeTab === 'market-makers'
                    ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-zinc-900/50'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/30'
                }`}
              >
                🤝 Market Makers
              </button>
            </div>
          </div>
        </div>

        {/* Show intelligence cards only on intelligence tab */}
        {activeTab === 'intelligence' && (
          <IntelligenceSummary
            intelligence={intelligence}
            isLoading={isLoadingIntelligence}
          />
        )}

        {/* Show last updated only when not loading */}
        {lastUpdated && activeTab !== 'intelligence' && !isLoading && (
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

        {/* Show warning only when NOT loading */}
        {!isLoading && !error && flows.length > 0 && filteredFlows.length === 0 && activeTab !== 'intelligence' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <p className="text-yellow-900 dark:text-yellow-100 font-medium">No flows match this filter</p>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm">Try selecting a different tab or chain</p>
          </div>
        )}

        {/* Show flow list on non-intelligence tabs */}
        {activeTab !== 'intelligence' && (
          <FlowList
            flows={filteredFlows}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
