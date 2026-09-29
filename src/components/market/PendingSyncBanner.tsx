'use client';

// بانر أصفر يظهر فوق الـ search card لما في entries معلّقة في الـ queue.
// بيشجع اليوزر يضغط "Sync now" أو يستنى الـ auto-sync.

import { CloudUpload, Loader2 } from 'lucide-react';

interface PendingSyncBannerProps {
  pendingCount: number;
  isSyncing: boolean;
  isOnline: boolean;
  onSync: () => void;
}

export function PendingSyncBanner({
  pendingCount,
  isSyncing,
  isOnline,
  onSync,
}: PendingSyncBannerProps) {
  if (pendingCount <= 0) return null;

  return (
    <div
      className="bg-accent-soft border border-accent-yellow rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-soft"
      role="status"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-9 h-9 rounded-lg bg-accent-yellow flex items-center justify-center flex-shrink-0">
          <CloudUpload size={18} className="text-text-primary" />
        </span>
        <p className="text-sm font-medium text-text-primary truncate">
          <span className="font-bold">{pendingCount}</span> {pendingCount === 1 ? 'entry' : 'entries'} في الانتظار —{' '}
          {isOnline ? 'جاري المزامنة...' : 'في انتظار الاتصال'}
        </p>
      </div>
      <button
        type="button"
        onClick={onSync}
        disabled={isSyncing || !isOnline}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
      >
        {isSyncing ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <CloudUpload size={14} />
        )}
        Sync now
      </button>
    </div>
  );
}