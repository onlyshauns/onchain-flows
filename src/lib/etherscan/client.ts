// Etherscan API Client (FREE - 100k calls/day)
const ETHERSCAN_BASE_URL = 'https://api.etherscan.io/api';
const DEFAULT_API_KEY = 'YourApiKeyToken'; // Free tier works without key

export interface EtherscanTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  contractAddress: string;
}

export interface EtherscanResponse {
  status: string;
  message: string;
  result: EtherscanTransaction[];
}

export class EtherscanClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ETHERSCAN_API_KEY || DEFAULT_API_KEY;
  }

  /**
   * Get ERC20 token transfers for an address
   */
  async getTokenTransfers(
    address: string,
    options: {
      startBlock?: number;
      endBlock?: number;
      page?: number;
      offset?: number;
      sort?: 'asc' | 'desc';
    } = {}
  ): Promise<EtherscanTransaction[]> {
    const params = new URLSearchParams({
      module: 'account',
      action: 'tokentx',
      address,
      page: String(options.page || 1),
      offset: String(options.offset || 100),
      sort: options.sort || 'desc',
      apikey: this.apiKey,
    });

    if (options.startBlock) params.append('startblock', String(options.startBlock));
    if (options.endBlock) params.append('endblock', String(options.endBlock));

    const url = `${ETHERSCAN_BASE_URL}?${params.toString()}`;

    try {
      console.log('[Etherscan] Fetching token transfers for:', address.substring(0, 10) + '...');

      const response = await fetch(url);
      const data: EtherscanResponse = await response.json();

      if (data.status === '0' && data.message !== 'No transactions found') {
        console.error('[Etherscan] API error:', data.message);
        return [];
      }

      if (!Array.isArray(data.result)) {
        return [];
      }

      console.log('[Etherscan] Found transactions:', data.result.length);
      return data.result;
    } catch (error) {
      console.error('[Etherscan] Error fetching transfers:', error);
      return [];
    }
  }

  /**
   * Get normal ETH transactions for an address
   */
  async getTransactions(
    address: string,
    options: {
      startBlock?: number;
      endBlock?: number;
      page?: number;
      offset?: number;
      sort?: 'asc' | 'desc';
    } = {}
  ): Promise<any[]> {
    const params = new URLSearchParams({
      module: 'account',
      action: 'txlist',
      address,
      page: String(options.page || 1),
      offset: String(options.offset || 100),
      sort: options.sort || 'desc',
      apikey: this.apiKey,
    });

    if (options.startBlock) params.append('startblock', String(options.startBlock));
    if (options.endBlock) params.append('endblock', String(options.endBlock));

    const url = `${ETHERSCAN_BASE_URL}?${params.toString()}`;

    try {
      const response = await fetch(url);
      const data: EtherscanResponse = await response.json();

      if (data.status === '0') {
        return [];
      }

      return Array.isArray(data.result) ? data.result : [];
    } catch (error) {
      console.error('[Etherscan] Error fetching transactions:', error);
      return [];
    }
  }

  /**
   * Get multiple addresses' transactions in parallel
   */
  async getMultipleAddressTransactions(
    addresses: { address: string; label: string }[],
    limit: number = 20
  ): Promise<{ tx: EtherscanTransaction; label: string }[]> {
    console.log('[Etherscan] Fetching transactions for', addresses.length, 'addresses');

    const promises = addresses.map(async ({ address, label }) => {
      try {
        const txs = await this.getTokenTransfers(address, {
          offset: limit,
          sort: 'desc',
        });

        return txs.map(tx => ({ tx, label }));
      } catch (error) {
        console.error(`[Etherscan] Error fetching for ${label}:`, error);
        return [];
      }
    });

    const results = await Promise.all(promises);
    const allTxs = results.flat();

    // Filter for recent transactions (last 24 hours)
    const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
    const recentTxs = allTxs.filter(({ tx }) => parseInt(tx.timeStamp) > oneDayAgo);

    // Sort by timestamp (most recent first)
    recentTxs.sort((a, b) => parseInt(b.tx.timeStamp) - parseInt(a.tx.timeStamp));

    console.log('[Etherscan] Total recent transactions found:', recentTxs.length);
    return recentTxs;
  }

  /**
   * Get large token transfers (whale movements) from major exchanges
   */
  async getRecentWhaleMovements(): Promise<{ tx: EtherscanTransaction; label: string }[]> {
    // Major exchange addresses that have lots of activity
    const majorExchanges = [
      { address: '0x28C6c06298d514Db089934071355E5743bf21d60', label: 'Binance' },
      { address: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE', label: 'Binance 2' },
      { address: '0x71660c4005BA85c37ccec55d0C4493E66Fe775d3', label: 'Coinbase' },
      { address: '0x503828976D22510aad0201ac7EC88293211D23Da', label: 'Coinbase 2' },
      { address: '0x56Eddb7aa87536c09CCc2793473599fD21A8b17F', label: 'Kraken' },
    ];

    return this.getMultipleAddressTransactions(majorExchanges, 30);
  }
}

// Singleton
let etherscanClient: EtherscanClient | null = null;

export function getEtherscanClient(): EtherscanClient {
  if (!etherscanClient) {
    etherscanClient = new EtherscanClient();
  }
  return etherscanClient;
}
