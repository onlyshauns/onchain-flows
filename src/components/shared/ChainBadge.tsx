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

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border border-opacity-20 transition-all ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${config.color}15`,  // 15 = ~8% opacity in hex
        color: config.color,
        borderColor: config.color
      }}
    >
      <img src={config.icon} alt={config.symbol} className={iconSizes[size]} />
      <span>{config.symbol}</span>
    </span>
  );
}
