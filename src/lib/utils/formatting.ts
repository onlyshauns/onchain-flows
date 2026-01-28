import { formatDistanceToNow } from 'date-fns';

/**
 * Format a large number with K/M/B suffixes
 * e.g., 1234567 -> "1.23M"
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(decimals)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(decimals)}K`;
  }
  return value.toFixed(decimals);
}

/**
 * Format USD amount with $ prefix
 * e.g., 1234567 -> "$1.23M"
 */
export function formatUsd(value: number, decimals: number = 2): string {
  return `$${formatNumber(value, decimals)}`;
}

/**
 * Format a blockchain address (truncate middle)
 * e.g., "0x1234...5678" or "Abc123...xyz789"
 */
export function truncateAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address || address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format timestamp to relative time
 * e.g., "5 minutes ago", "2 hours ago"
 */
export function formatTimeAgo(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
}

/**
 * Format timestamp to absolute time
 * e.g., "Jan 28, 2026 10:35 AM"
 */
export function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

/**
 * Get emoji for flow type
 */
export function getFlowTypeEmoji(flowType: string): string {
  const emojiMap: Record<string, string> = {
    'whale-movement': '🐋',
    'defi-activity': '💰',
    'token-launch': '🚀',
    'smart-money': '🧠',
  };
  return emojiMap[flowType] || '📊';
}

/**
 * Format flow type for display
 */
export function formatFlowType(flowType: string): string {
  const typeMap: Record<string, string> = {
    'whale-movement': 'Whale Movement',
    'defi-activity': 'DeFi Activity',
    'token-launch': 'Token Launch',
    'smart-money': 'Smart Money',
  };
  return typeMap[flowType] || flowType;
}
