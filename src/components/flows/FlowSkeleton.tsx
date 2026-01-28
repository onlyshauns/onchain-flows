export function FlowSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div>
            <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-1" />
            <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        </div>
        <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
      </div>

      <div className="mb-4">
        <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-1" />
        <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>

      <div className="space-y-2 mb-4">
        <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
        <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-9 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    </div>
  );
}
