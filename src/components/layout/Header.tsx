'use client';

import { Activity } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            {/* Nansen-style icon with accent glow */}
            <div className="relative">
              <Activity
                className="w-8 h-8 text-[var(--accent)] nansen-glow"
                strokeWidth={2.5}
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                Onchain Flows
              </h1>
              <p className="text-xs text-[var(--foreground)] opacity-60 flex items-center gap-2">
                Powered by
                <span className="font-semibold text-[var(--accent)]">Nansen</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live indicator */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--card-bg)] border border-[var(--accent)] border-opacity-40">
              <div className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse nansen-glow" />
              <span className="text-sm font-medium text-[var(--foreground)]">Live</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
