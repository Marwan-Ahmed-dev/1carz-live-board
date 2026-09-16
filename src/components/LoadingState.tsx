'use client';

interface LoadingStateProps {
  /** عدد العناصر الـ skeleton */
  count?: number;
  /** نوع العنصر */
  variant?: 'card' | 'list' | 'detail';
}

/**
 * Skeleton loader للـ loading states
 * بدل spinner نعرض هيكل الصفحات
 */
export function LoadingState({ count = 6, variant = 'card' }: LoadingStateProps) {
  if (variant === 'list') {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-bg-card rounded-xl p-4 flex items-center gap-3">
            <div className="skeleton w-12 h-12 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-1/3 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (variant === 'detail') {
    return (
      <div className="space-y-4">
        <div className="skeleton w-full aspect-[16/10] rounded-2xl" />
        <div className="skeleton h-8 w-2/3 rounded" />
        <div className="skeleton h-12 w-1/2 rounded" />
        <div className="skeleton h-24 w-full rounded-xl" />
      </div>
    );
  }
  // default: cards
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-bg-card rounded-2xl overflow-hidden border border-border-soft">
          <div className="skeleton w-full aspect-[16/10]" />
          <div className="p-3 sm:p-4 space-y-2">
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-6 w-1/2 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-9 w-full rounded-xl mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}