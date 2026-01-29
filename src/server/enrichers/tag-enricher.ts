import { Movement, MovementTag } from '@/types/movement';

/**
 * Enrich movement with tags derived from labels and movement characteristics
 */
export function enrichTags(movement: Movement): Movement {
  const tags: MovementTag[] = [];

  // Get all labels for analysis (preserve case for emoji detection)
  const allLabelsOriginal = [
    movement.fromLabel,
    movement.toLabel,
  ].filter((l): l is string => Boolean(l));

  const allLabels = allLabelsOriginal.map(l => l.toLowerCase());

  // Exchange tag (🏦 emoji or exchange names)
  const isExchangeKeyword = (label: string) => {
    const l = label.toLowerCase();
    return l.includes('binance') || l.includes('coinbase') ||
           l.includes('kraken') || l.includes('bybit') ||
           l.includes('okx') || l.includes('huobi') ||
           l.includes('kucoin') || l.includes('bitfinex') ||
           l.includes('gemini') || l.includes('bitstamp') ||
           l.includes('gate.io') || l.includes('crypto.com') ||
           l.includes('mexc') || l.includes('exchange') ||
           l.includes('ceffu');
  };

  const toIsExchange = movement.toLabel && (
    movement.toLabel.includes('🏦') || isExchangeKeyword(movement.toLabel)
  );
  const fromIsExchange = movement.fromLabel && (
    movement.fromLabel.includes('🏦') || isExchangeKeyword(movement.fromLabel)
  );

  if (toIsExchange || fromIsExchange) {
    tags.push('exchange');

    // Debug logging for exchange detection
    if (movement.amountUsd >= 10_000_000) {
      console.log('[TagEnricher] Exchange detected ($10M+):', {
        amount: `$${(movement.amountUsd / 1_000_000).toFixed(1)}M`,
        from: movement.fromLabel,
        to: movement.toLabel,
        fromIsExchange,
        toIsExchange,
      });
    }

    // Determine direction: deposit (TO exchange) or withdrawal (FROM exchange)
    // BUT exclude exchange-to-exchange transfers (internal movements)
    if (toIsExchange && !fromIsExchange) {
      // Deposit: going TO exchange from non-exchange
      tags.push('exchange_deposit');
      if (movement.amountUsd >= 10_000_000) {
        console.log('[TagEnricher] → Tagged as exchange_deposit');
      }
    }
    if (fromIsExchange && !toIsExchange) {
      // Withdrawal: coming FROM exchange to non-exchange
      tags.push('exchange_withdrawal');
      if (movement.amountUsd >= 10_000_000) {
        console.log('[TagEnricher] → Tagged as exchange_withdrawal');
      }
    }
    // If both are exchanges, don't add deposit/withdrawal tags (internal exchange transfer)
    if (toIsExchange && fromIsExchange) {
      if (movement.amountUsd >= 10_000_000) {
        console.log('[TagEnricher] → Skipped (exchange-to-exchange transfer)');
      }
    }
  }

  // Fund tag
  if (allLabels.some(l =>
    l.includes('fund') || l.includes('capital') ||
    l.includes('ventures') || l.includes('trading') ||
    l.includes('jump') || l.includes('alameda') ||
    l.includes('three arrows') || l.includes('3ac') ||
    l.includes('a16z') || l.includes('paradigm') ||
    l.includes('dragonfly') || l.includes('pantera') ||
    l.includes('galaxy') || l.includes('investment')
  )) {
    tags.push('fund');
  }

  // Market maker tag
  if (allLabels.some(l =>
    l.includes('wintermute') || l.includes('amber') ||
    l.includes('jane street') || l.includes('dwr labs') ||
    l.includes('market maker') || l.includes('liquidity provider')
  )) {
    tags.push('market_maker');
  }

  // Protocol tag (🤖 emoji or protocol names)
  if (allLabelsOriginal.some(l => l.includes('🤖')) ||
      allLabels.some(l =>
    l.includes('uniswap') || l.includes('aave') ||
    l.includes('compound') || l.includes('maker') ||
    l.includes('curve') || l.includes('balancer') ||
    l.includes('morpho') || l.includes('euler') ||
    l.includes('protocol') || l.includes('contract') ||
    l.includes('vault') || l.includes('pool')
  )) {
    tags.push('protocol');
  }

  // Bridge tag
  if (movement.movementType === 'bridge' ||
      allLabels.some(l => l.includes('bridge'))) {
    tags.push('bridge');
  }

  // Stablecoin tag
  if (['USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'PYUSD', 'FRAX'].includes(movement.assetSymbol || '')) {
    tags.push('stablecoin');
  }

  // Smart money tag (from Nansen)
  if (allLabels.some(l =>
    l.includes('smart') || l.includes('smart trader') ||
    l.includes('smart money') || l.includes('30d smart') ||
    l.includes('90d smart') || l.includes('elite') ||
    l.includes('dex trader') || l.includes('legendary')
  )) {
    tags.push('smart_money');
  }

  // Public figure tag (notable individuals, ENS names, influencers)
  // Be MORE INCLUSIVE - tag anything with .eth or known patterns
  const hasENS = allLabelsOriginal.some(l => l.includes('.eth'));
  const hasKnownFigure = allLabels.some(l =>
    // Known public figures patterns
    l.includes('vitalik') || l.includes('buterin') ||
    l.includes('hayden') || l.includes('adams') ||
    l.includes('sam') || l.includes('sbf') ||
    l.includes('su zhu') || l.includes('kyle davies') ||
    l.includes('arthur') || l.includes('hayes') ||
    l.includes('cz') || l.includes('changpeng') ||
    l.includes('justin') || l.includes('sun') ||
    // Nansen labels
    l.includes('public figure') ||
    l.includes('influencer') ||
    l.includes('founder') ||
    l.includes('ceo') ||
    l.includes('celebrity')
  );

  if (hasENS || hasKnownFigure) {
    tags.push('public_figure');
    if (movement.amountUsd >= 100_000) {
      console.log('[TagEnricher] Tagged as public_figure:', {
        amount: `$${(movement.amountUsd / 1_000_000).toFixed(2)}M`,
        from: movement.fromLabel,
        to: movement.toLabel,
        hasENS,
        hasKnownFigure,
      });
    }
  }

  // DeFi tag (if protocol or DEX involved)
  if (movement.movementType === 'swap' ||
      movement.metadata?.dexName ||
      tags.includes('protocol')) {
    tags.push('defi');
  }

  // Whale tag (size-based)
  if (movement.amountUsd > 10_000_000) {
    tags.push('whale');
  }

  // Mega whale tag (size-based, $50M+)
  if (movement.amountUsd > 50_000_000) {
    tags.push('mega_whale');
  }

  return { ...movement, tags };
}
