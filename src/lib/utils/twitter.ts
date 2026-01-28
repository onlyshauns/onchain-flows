import { Flow } from '@/types/flows';
import { formatUsd, truncateAddress, getFlowTypeEmoji } from './formatting';
import { getChainConfig, getNansenTxUrl } from './chains';

/**
 * Generate tweet text for a flow
 */
export function generateTweetText(flow: Flow): string {
  const emoji = getFlowTypeEmoji(flow.type);
  const chain = getChainConfig(flow.chain).name;
  const amount = formatUsd(flow.amountUsd, 1);
  const token = flow.token.symbol;

  const fromLabel = flow.from.label || truncateAddress(flow.from.address);
  const toLabel = flow.to.label || truncateAddress(flow.to.address);

  let typeDescription = '';
  switch (flow.type) {
    case 'whale-movement':
      typeDescription = 'Whale Alert';
      break;
    case 'defi-activity':
      typeDescription = 'DeFi Move';
      break;
    case 'token-launch':
      typeDescription = 'New Token';
      break;
    case 'smart-money':
      typeDescription = 'Smart Money';
      break;
  }

  return `${emoji} ${typeDescription}: ${amount} worth of ${token} on ${chain}

From: ${fromLabel}
To: ${toLabel}

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
