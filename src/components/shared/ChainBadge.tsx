import { Chain } from '@/types/flows';
import { getChainConfig } from '@/lib/utils/chains';

interface ChainBadgeProps {
  chain: Chain;
  size?: 'sm' | 'md' | 'lg';
}

export function ChainBadge({ chain, size = 'sm' }: ChainBadgeProps) {
  const config = getChainConfig(chain);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium text-white ${sizeClasses[size]}`}
      style={{ backgroundColor: config.color }}
    >
      <span>{config.icon}</span>
      <span>{config.symbol}</span>
    </span>
  );
}
