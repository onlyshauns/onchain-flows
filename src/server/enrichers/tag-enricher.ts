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
  if (allLabelsOriginal.some(l => l.includes('🏦')) ||
      allLabels.some(l =>
    l.includes('binance') || l.includes('coinbase') ||
    l.includes('kraken') || l.includes('bybit') ||
    l.includes('okx') || l.includes('huobi') ||
    l.includes('kucoin') || l.includes('bitfinex') ||
    l.includes('gemini') || l.includes('bitstamp') ||
    l.includes('gate.io') || l.includes('crypto.com') ||
    l.includes('mexc') || l.includes('exchange') ||
    l.includes('ceffu')
  )) {
    tags.push('exchange');
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

  return { ...movement, tags };
}
