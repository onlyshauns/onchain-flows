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
      const txs = await this.getTokenTransfers(address, {
        offset: limit,
        sort: 'desc',
      });

      return txs.map(tx => ({ tx, label }));
    });

    const results = await Promise.all(promises);
    const allTxs = results.flat();

    // Sort by timestamp (most recent first)
    allTxs.sort((a, b) => parseInt(b.tx.timeStamp) - parseInt(a.tx.timeStamp));

    console.log('[Etherscan] Total transactions found:', allTxs.length);
    return allTxs;
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
