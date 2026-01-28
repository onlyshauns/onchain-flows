// Notable Ethereum addresses to track

export interface NotableAddress {
  address: string;
  label: string;
  category: 'whale' | 'exchange' | 'public-figure' | 'fund' | 'defi';
}

// Public Figures
export const PUBLIC_FIGURES: NotableAddress[] = [
  {
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    label: 'Vitalik Buterin',
    category: 'public-figure',
  },
  {
    address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    label: 'Vitalik Buterin (2)',
    category: 'public-figure',
  },
  {
    address: '0x220866B1A2219f40e72f5c628B65D54268cA3A9D',
    label: 'Vitalik Buterin (3)',
    category: 'public-figure',
  },
  {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    label: 'Justin Sun',
    category: 'public-figure',
  },
];

// Funds & Institutional
export const FUNDS: NotableAddress[] = [
  {
    address: '0x8EB8a3b98659Cce290402893d0a8614FD165a6B9',
    label: 'Grayscale Bitcoin Trust',
    category: 'fund',
  },
  {
    address: '0x9F8c163cBA728e99993ABe7495F06c0A3c8Ac8b9',
    label: 'Grayscale Ethereum Trust',
    category: 'fund',
  },
  {
    address: '0x5e52E2301f01D3B55D87902db0cbf3E9DcC4c8b9',
    label: 'Ark Invest',
    category: 'fund',
  },
  {
    address: '0x05e793cE0C6027323Ac150F6d45C2344d28B6019',
    label: 'a16z',
    category: 'fund',
  },
  {
    address: '0x73BCEb1Cd57C711fEac4224D062b0F6ff338BBd',
    label: 'Paradigm',
    category: 'fund',
  },
];

// Major Exchanges
export const EXCHANGES: NotableAddress[] = [
  {
    address: '0x28C6c06298d514Db089934071355E5743bf21d60',
    label: 'Binance Hot Wallet',
    category: 'exchange',
  },
  {
    address: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',
    label: 'Binance 1',
    category: 'exchange',
  },
  {
    address: '0xD551234Ae421e3BCBA99A0Da6d736074f22192FF',
    label: 'Binance 2',
    category: 'exchange',
  },
  {
    address: '0x564286362092D8e7936f0549571a803B203aAceD',
    label: 'Binance 3',
    category: 'exchange',
  },
  {
    address: '0x71660c4005BA85c37ccec55d0C4493E66Fe775d3',
    label: 'Coinbase 1',
    category: 'exchange',
  },
  {
    address: '0x503828976D22510aad0201ac7EC88293211D23Da',
    label: 'Coinbase 2',
    category: 'exchange',
  },
  {
    address: '0xddfAbCdc4D8FfC6d5beaf154f18B778f892A0740',
    label: 'Coinbase 3',
    category: 'exchange',
  },
  {
    address: '0x56Eddb7aa87536c09CCc2793473599fD21A8b17F',
    label: 'Kraken',
    category: 'exchange',
  },
];

// Known Whales
export const WHALES: NotableAddress[] = [
  {
    address: '0x00000000219ab540356cBB839Cbe05303d7705Fa',
    label: 'Ethereum Foundation',
    category: 'whale',
  },
  {
    address: '0x5041ed759Dd4aFc3a72b8192C143F72f4724081A',
    label: 'Jump Trading',
    category: 'whale',
  },
  {
    address: '0x40B38765696e3d5d8d9d834D8AaD4bB6e418E489',
    label: 'Alameda Research',
    category: 'whale',
  },
  {
    address: '0x1111111254fb6c44bAC0beD2854e76F90643097d',
    label: '1inch',
    category: 'whale',
  },
];

// DeFi Protocols (for reference)
export const DEFI_PROTOCOLS: NotableAddress[] = [
  {
    address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    label: 'Uniswap V2 Router',
    category: 'defi',
  },
  {
    address: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    label: 'Uniswap V3 Router',
    category: 'defi',
  },
  {
    address: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
    label: 'Aave V2',
    category: 'defi',
  },
];

// Export combined lists
export const ALL_NOTABLE_ADDRESSES = [
  ...PUBLIC_FIGURES,
  ...FUNDS,
  ...EXCHANGES,
  ...WHALES,
  ...DEFI_PROTOCOLS,
];

// Filter by category
export function getAddressesByCategory(
  category: NotableAddress['category']
): NotableAddress[] {
  return ALL_NOTABLE_ADDRESSES.filter(addr => addr.category === category);
}

// Get label for address
export function getLabelForAddress(address: string): string | undefined {
  const addr = ALL_NOTABLE_ADDRESSES.find(
    a => a.address.toLowerCase() === address.toLowerCase()
  );
  return addr?.label;
}
