import { Chain } from '@/types/flows';

export interface ChainConfig {
  id: Chain;
  name: string;
  symbol: string;
  color: string;
  gradient: string;
  icon: string; // Emoji or could be SVG path
  explorerUrl: string;
  priority: number; // Lower is higher priority
}

export const CHAIN_CONFIGS: Record<Chain, ChainConfig> = {
  solana: {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    color: '#9945FF',
    gradient: 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
    icon: '◎',
    explorerUrl: 'https://solscan.io/tx/',
    priority: 1,
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    color: '#627EEA',
    gradient: 'linear-gradient(135deg, #627EEA 0%, #8A92B2 100%)',
    icon: 'Ξ',
    explorerUrl: 'https://etherscan.io/tx/',
    priority: 2,
  },
  base: {
    id: 'base',
    name: 'Base',
    symbol: 'BASE',
    color: '#0052FF',
    gradient: 'linear-gradient(135deg, #0052FF 0%, #00A3FF 100%)',
    icon: '🔵',
    explorerUrl: 'https://basescan.org/tx/',
    priority: 3,
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    symbol: 'ARB',
    color: '#28A0F0',
    gradient: 'linear-gradient(135deg, #28A0F0 0%, #96BEDC 100%)',
    icon: '◆',
    explorerUrl: 'https://arbiscan.io/tx/',
    priority: 4,
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    symbol: 'OP',
    color: '#FF0420',
    gradient: 'linear-gradient(135deg, #FF0420 0%, #FF6B6B 100%)',
    icon: '🔴',
    explorerUrl: 'https://optimistic.etherscan.io/tx/',
    priority: 5,
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    color: '#8247E5',
    gradient: 'linear-gradient(135deg, #8247E5 0%, #A855F7 100%)',
    icon: '⬡',
    explorerUrl: 'https://polygonscan.com/tx/',
    priority: 6,
  },
  hyperliquid: {
    id: 'hyperliquid',
    name: 'Hyperliquid',
    symbol: 'HYPE',
    color: '#00D4AA',
    gradient: 'linear-gradient(135deg, #00D4AA 0%, #00FFC6 100%)',
    icon: '⚡',
    explorerUrl: 'https://explorer.hyperliquid.xyz/tx/',
    priority: 4,
  },
};

export const DEFAULT_CHAINS: Chain[] = ['solana', 'ethereum', 'base', 'hyperliquid'];

// Available chains for selection (limited to main 4)
export const AVAILABLE_CHAINS: Chain[] = ['solana', 'ethereum', 'base', 'hyperliquid'];

export const getAllChains = (): Chain[] => {
  return Object.keys(CHAIN_CONFIGS).sort(
    (a, b) => CHAIN_CONFIGS[a as Chain].priority - CHAIN_CONFIGS[b as Chain].priority
  ) as Chain[];
};

export const getChainConfig = (chain: Chain): ChainConfig => {
  return CHAIN_CONFIGS[chain];
};

export const getExplorerUrl = (chain: Chain, txHash: string): string => {
  const config = getChainConfig(chain);
  return `${config.explorerUrl}${txHash}`;
};

export const getChainColor = (chain: Chain): string => {
  return getChainConfig(chain).color;
};

export const getChainGradient = (chain: Chain): string => {
  return getChainConfig(chain).gradient;
};

/**
 * Get Nansen transaction URL for a given chain and tx hash
 */
export const getNansenTxUrl = (chain: Chain, txHash: string): string => {
  // Map our chain names to Nansen's chain slugs
  const nansenChainMap: Record<Chain, string> = {
    ethereum: 'ethereum',
    solana: 'solana',
    base: 'base',
    arbitrum: 'arbitrum',
    optimism: 'optimism',
    polygon: 'polygon',
    hyperliquid: 'hyperliquid',
  };

  const chainSlug = nansenChainMap[chain] || chain;
  // For Hyperliquid, use explorer.hyperliquid.xyz instead of Nansen
  if (chain === 'hyperliquid') {
    return `https://explorer.hyperliquid.xyz/tx/${txHash}`;
  }
  return `https://app.nansen.ai/tx/${chainSlug}/${txHash}`;
};
