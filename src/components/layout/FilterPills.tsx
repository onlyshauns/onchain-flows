'use client';

import clsx from 'clsx';

interface FilterOption {
  id: string;
  label: string;
}

const FILTERS: FilterOption[] = [
  { id: 'all', label: 'All' },
  { id: 'exchanges', label: 'Exchanges' },
  { id: 'funds', label: 'Funds/VC' },
  { id: 'protocols', label: 'Protocols' },
  { id: 'high_conviction', label: 'High Conviction' },
];

interface FilterPillsProps {
  active: string;
  onSelect: (filterId: string) => void;
}

export function FilterPills({ active, onSelect }: FilterPillsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {FILTERS.map(filter => (
        <button
          key={filter.id}
          onClick={() => onSelect(filter.id)}
          className={clsx(
            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
            active === filter.id
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
