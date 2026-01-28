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
  const usdAmount = formatUsd(flow.amountUsd, 1);
  const token = flow.token.symbol;

  const fromName = cleanEntityName(flow.from.label, flow.from.address);
  const toName = cleanEntityName(flow.to.label, flow.to.address);
  const action = getActionVerb(flow);

  // If we have a reasonable token amount, show it (not the fake USD/1000 amount)
  // Otherwise, just show USD value with "worth of [TOKEN]"
  let amountText = '';
  if (flow.amount > 100 && flow.amountUsd / flow.amount > 0.01 && flow.amountUsd / flow.amount < 100000) {
    // Looks like a real token amount (reasonable price per token)
    const tokenAmount = formatTokenAmount(flow.amount);
    amountText = `${tokenAmount} $${token} (${usdAmount})`;
  } else {
    // Just show USD value
    amountText = `${usdAmount} worth of $${token}`;
  }

  // Whale Alert style: "🚨 Whale Alert: [Entity] just [action] [amount] to [destination]"
  return `🚨 Whale Alert: ${fromName} just ${action} ${amountText} to ${toName} on ${chain}

Track on Nansen →`;
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
