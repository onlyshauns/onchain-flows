'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { XIcon } from '../shared/XIcon';
import { FlowIntelligenceSummary } from '@/server/flows/intelligence';
import { SentimentAnalysis } from '@/lib/utils/sentiment';
import {
  getIntelligenceShareUrl,
  copyIntelligenceTweetToClipboard,
} from '@/lib/utils/intelligence-share';

interface IntelligenceShareButtonProps {
  intelligence: FlowIntelligenceSummary;
  sentiment: SentimentAnalysis;
}

export function IntelligenceShareButton({
  intelligence,
  sentiment,
}: IntelligenceShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleTwitterShare = () => {
    const url = getIntelligenceShareUrl(intelligence, sentiment);
    window.open(url, '_blank', 'noopener,noreferrer,width=550,height=420');
  };

  const handleCopy = async () => {
    const success = await copyIntelligenceTweetToClipboard(intelligence, sentiment);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleTwitterShare}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--nansen-dark)] hover:bg-opacity-90 text-white rounded-lg font-medium transition-all text-sm shadow-sm"
      >
        <XIcon className="w-4 h-4" />
        Share Intelligence
      </button>
      <button
        onClick={handleCopy}
        className="p-2 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--accent)] hover:bg-opacity-10 border border-[var(--card-border)] hover:border-[var(--accent)] transition-all text-[var(--foreground)] opacity-60 hover:opacity-100"
        title={copied ? 'Copied!' : 'Copy tweet'}
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}
