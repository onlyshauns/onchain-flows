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
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    color: '#627EEA',
    gradient: 'linear-gradient(135deg, #627EEA 0%, #8A92B2 100%)',
    icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=035',
    explorerUrl: 'https://etherscan.io/tx/',
    priority: 1,
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    color: '#9945FF',
    gradient: 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
    icon: 'https://cryptologos.cc/logos/solana-sol-logo.svg?v=035',
    explorerUrl: 'https://solscan.io/tx/',
    priority: 2,
  },
  base: {
    id: 'base',
    name: 'Base',
    symbol: 'BASE',
    color: '#0052FF',
    gradient: 'linear-gradient(135deg, #0052FF 0%, #00A3FF 100%)',
    icon: 'https://avatars.githubusercontent.com/u/108554348?s=280&v=4',
    explorerUrl: 'https://basescan.org/tx/',
    priority: 3,
  },
};

export const DEFAULT_CHAINS: Chain[] = ['ethereum', 'base'];

// Available chains - all supported chains
export const AVAILABLE_CHAINS: Chain[] = ['ethereum', 'solana', 'base'];

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
 * Get transaction URL for a given chain and tx hash
 * Uses chain explorers (Etherscan, Solscan, Basescan)
 */
export const getNansenTxUrl = (chain: Chain, txHash: string): string => {
  const config = getChainConfig(chain);
  return `${config.explorerUrl}${txHash}`;
};
