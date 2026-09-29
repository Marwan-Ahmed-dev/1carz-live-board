'use client';

// بادج صغير بيبين حالة الـ network + عدد الـ pending entries.
// أخضر dot + "متصل" لما online.
// أمبر dot + "غير متصل (X معلق)" لما offline + في pending.
// أمبر dot + "غير متصل" لما offline بدون pending.

import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface OfflineBadgeProps {
  pendingCount: number;
}

export function OfflineBadge({ pendingCount }: OfflineBadgeProps) {
  const { isOnline } = useNetworkStatus();

  if (isOnline && pendingCount === 0) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-[11px] font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden />
        متصل
      </span>
    );
  }

  if (isOnline && pendingCount > 0) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" aria-hidden />
        {pendingCount} معلق
      </span>
    );
  }

  // offline (regardless of pending count)
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden />
      {pendingCount > 0 ? `غير متصل (${pendingCount} معلق)` : 'غير متصل'}
    </span>
  );
}