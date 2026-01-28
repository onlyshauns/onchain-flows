'use client';

import { Flow } from '@/types/flows';
import { FlowCard } from './FlowCard';
import { FlowSkeleton } from './FlowSkeleton';

interface FlowListProps {
  flows: Flow[];
  isLoading: boolean;
}

export function FlowList({ flows, isLoading }: FlowListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <FlowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (flows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
          No flows found
        </h3>
        <p className="text-[var(--foreground)] opacity-60 max-w-md">
          Try adjusting your chain filters or check back in a few moments for new activity.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {flows.map((flow) => (
        <FlowCard key={flow.id} flow={flow} />
      ))}
    </div>
  );
}
