import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/lib/nansen/client';
import { Chain, Flow } from '@/types/flows';

function isSameEntityTransfer(fromLabel: string, toLabel: string): boolean {
  if (!fromLabel || !toLabel || fromLabel === 'Unknown Wallet' || toLabel === 'Unknown Wallet') {
    return false;
  }

  const from = fromLabel.toLowerCase();
  const to = toLabel.toLowerCase();

  if (from === to) return true;

  const entities = [
    'binance', 'coinbase', 'kraken', 'bybit', 'okx', 'huobi', 'kucoin',
    'bitfinex', 'gemini', 'bitstamp', 'ftx', 'gate.io', 'crypto.com', 'mexc',
  ];

  for (const entity of entities) {
    if (from.includes(entity) && to.includes(entity)) {
      return true;
    }
  }

  return false;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chains = searchParams.get('chains')?.split(',') || ['ethereum'];
  const limit = parseInt(searchParams.get('limit') || '50');

  console.log('[API] Smart Money - chains:', chains);

  let allFlows: Flow[] = [];
  let dataSource = 'None';

  try {
    const client = getNansenClient();

    // Use dedicated Smart Money DEX Trades endpoint
    const chainList = chains.map(c => c.toLowerCase() as Chain);
    console.log('[API] Fetching Smart Money DEX trades for chains:', chainList);

    try {
      const response = await client.getDEXTrades(chainList, {
        minValueUsd: 10000, // $10k+ for Smart Trader activity
        maxValueUsd: 1000000, // Up to $1M (distinct from whale movements)
        includeSmartMoneyLabels: ['Smart Trader', '30D Smart Trader', '90D Smart Trader'],
        limit: 100,
      });

      console.log('[API] Got DEX trades response, data length:', response.data?.length || 0);

      if (response.data && response.data.length > 0) {
        dataSource = 'Nansen (Smart Money DEX Trades)';

        response.data.forEach((trade) => {
          // Skip if no token symbol available or if it's "Unknown"
          if (!trade.token_bought_symbol || trade.token_bought_symbol.trim() === '' || trade.token_bought_symbol === 'Unknown') {
            return;
          }

          const traderLabel = trade.trader_label || trade.smart_money_label || 'Unknown Wallet';

          // Extract chain from trade
          const chain = trade.chain.toLowerCase() as Chain;

          allFlows.push({
            id: trade.transaction_hash,
            type: 'smart-money',
            chain,
            timestamp: new Date(trade.block_timestamp).getTime(),
            amount: parseFloat(trade.token_bought_amount),
            amountUsd: trade.trade_value_usd,
            token: {
              symbol: trade.token_bought_symbol,
              address: trade.token_bought_address || '',
              name: trade.token_bought_name || trade.token_bought_symbol,
            },
            from: {
              address: trade.trader_address,
              label: traderLabel,
            },
            to: {
              address: trade.token_bought_address,
              label: `Bought via ${trade.dex_name || 'DEX'}`,
            },
            txHash: trade.transaction_hash,
            metadata: {
              category: 'Smart Money',
            },
          });
        });
      }
    } catch (error) {
      console.error('[API] Nansen DEX trades error:', error);
      if (error instanceof Error) {
        console.error('[API] Error message:', error.message);
        console.error('[API] Error stack:', error.stack);
      }
    }
  } catch (error) {
    console.error('[API] Nansen client error:', error);
    if (error instanceof Error) {
      console.error('[API] Client error message:', error.message);
    }
  }

  allFlows.sort((a, b) => {
    if (Math.abs(a.amountUsd - b.amountUsd) > 50000) {
      return b.amountUsd - a.amountUsd;
    }
    return b.timestamp - a.timestamp;
  });

  console.log('[API] Total smart money flows:', allFlows.length, 'Source:', dataSource);

  return NextResponse.json(
    {
      flows: allFlows.slice(0, limit),
      total: allFlows.length,
      source: dataSource,
    },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}
