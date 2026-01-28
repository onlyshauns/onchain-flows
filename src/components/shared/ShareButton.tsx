'use client';

import { useState } from 'react';
import { Twitter, Copy, Check } from 'lucide-react';
import { Flow } from '@/types/flows';
import { getTwitterShareUrl, copyTweetToClipboard } from '@/lib/utils/twitter';

interface ShareButtonProps {
  flow: Flow;
  variant?: 'primary' | 'secondary';
}

export function ShareButton({ flow, variant = 'primary' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://onchainflows.com';
  const flowUrl = `${appUrl}/flows/${flow.id}`;

  const handleTwitterShare = () => {
    const url = getTwitterShareUrl(flow, flowUrl);
    window.open(url, '_blank', 'noopener,noreferrer,width=550,height=420');
  };

  const handleCopy = async () => {
    const success = await copyTweetToClipboard(flow, flowUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (variant === 'secondary') {
    return (
      <button
        onClick={handleCopy}
        className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
        title="Copy tweet"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleTwitterShare}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors text-sm"
      >
        <Twitter className="w-4 h-4" />
        Share
      </button>
      <button
        onClick={handleCopy}
        className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
        title={copied ? 'Copied!' : 'Copy tweet'}
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}
