'use client';

// بادج صغير بيبين حالة الـ network + عدد الـ pending entries.
// Online: أخضر dot + "متصل".
// Online + pending: أمبر dot + "X معلق".
// Offline: أمبر dot + "غير متصل (X معلق)".

import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface OfflineBadgeProps {
  pendingCount: number;
}

export function OfflineBadge({ pendingCount }: OfflineBadgeProps) {
  const { isOnline } = useNetworkStatus();

  if (isOnline && pendingCount === 0) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[11px] font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden />
        متصل
      </span>
    );
  }

  if (isOnline && pendingCount > 0) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-soft text-text-primary text-[11px] font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-yellow-hover animate-pulse" aria-hidden />
        {pendingCount} معلق
      </span>
    );
  }

  // offline (regardless of pending count)
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-soft text-text-primary text-[11px] font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-accent-yellow-hover" aria-hidden />
      {pendingCount > 0 ? `غير متصل (${pendingCount} معلق)` : 'غير متصل'}
    </span>
  );
}