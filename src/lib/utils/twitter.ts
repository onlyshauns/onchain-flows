import { Flow } from '@/types/flows';
import { formatUsd, truncateAddress, getFlowTypeEmoji } from './formatting';
import { getChainConfig, getNansenTxUrl } from './chains';

/**
 * Determine the action verb based on the movement
 */
function getActionVerb(flow: Flow): string {
  const fromLabel = flow.from.label?.toLowerCase() || '';
  const toLabel = flow.to.label?.toLowerCase() || '';

  // Deposit (to exchange)
  if (toLabel.includes('binance') || toLabel.includes('coinbase') ||
      toLabel.includes('kraken') || toLabel.includes('exchange') ||
      toLabel.includes('deposit')) {
    return 'deposited';
  }

  // Withdrawal (from exchange)
  if (fromLabel.includes('binance') || fromLabel.includes('coinbase') ||
      fromLabel.includes('kraken') || fromLabel.includes('exchange')) {
    return 'withdrew';
  }

  // Swap/Trade
  if (flow.type === 'defi-activity' || toLabel.includes('swap') || toLabel.includes('dex')) {
    return 'swapped';
  }

  // Bridge
  if (toLabel.includes('bridge') || fromLabel.includes('bridge')) {
    return 'bridged';
  }

  // Default
  return 'moved';
}

/**
 * Clean up entity name for tweet
 */
function cleanEntityName(label: string | undefined, address: string): string {
  if (!label) return truncateAddress(address);

  // Remove emojis and truncated addresses in brackets
  return label
    .replace(/🏦|🤖|💼|🐋/g, '') // Remove emojis
    .replace(/\[0x[a-fA-F0-9]{6}\]/g, '') // Remove [0xabc123]
    .trim();
}

/**
 * Format token amount (add commas, handle decimals)
 */
function formatTokenAmount(amount: number): string {
  if (amount >= 1_000_000_000) {
    return (amount / 1_000_000_000).toFixed(1) + 'B';
  }
  if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1) + 'M';
  }
  if (amount >= 1_000) {
    return (amount / 1_000).toFixed(1) + 'K';
  }
  return amount.toFixed(2);
}

/**
 * Generate tweet text for a flow
 */
export function generateTweetText(flow: Flow): string {
  const chain = getChainConfig(flow.chain).name;
  const usdAmount = formatUsd(flow.amountUsd, 0); // No decimals for cleaner look
  const token = flow.token.symbol;

  const fromName = cleanEntityName(flow.from.label, flow.from.address);
  const toName = cleanEntityName(flow.to.label, flow.to.address);

  // Format amount intelligently
  let tokenAmountText = '';
  if (flow.amount > 0) {
    // We have a real token amount from Nansen
    const tokenAmount = formatTokenAmount(flow.amount);
    tokenAmountText = `${tokenAmount} in ${token}`;
  } else {
    // No token amount available, use USD only
    tokenAmountText = usdAmount;
  }

  // New format: WHALE MOVES on new line, amount + USD, from/to
  return `🚨 WHALE MOVES
${tokenAmountText} (${usdAmount}) was sent from ${fromName} to ${toName} on ${chain}

View Transaction →`;
}

/**
 * Generate Twitter share URL
 */
export function getTwitterShareUrl(flow: Flow): string {
  const text = generateTweetText(flow);
  const nansenUrl = getNansenTxUrl(flow.chain, flow.txHash);
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(nansenUrl)}`;
  return url;
}

/**
 * Copy tweet text to clipboard
 */
export async function copyTweetToClipboard(flow: Flow): Promise<boolean> {
  try {
    const nansenUrl = getNansenTxUrl(flow.chain, flow.txHash);
    const text = `${generateTweetText(flow)} ${nansenUrl}`;
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
