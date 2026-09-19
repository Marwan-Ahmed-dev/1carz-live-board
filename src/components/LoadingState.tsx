'use client';

import { Car } from 'lucide-react';

interface LoadingStateProps {
  count?: number;
  variant?: 'page' | 'card' | 'list' | 'detail';
}

function BrandSpinner({ label = 'جاري التحميل...' }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-5 py-16 px-4"
      role="status"
      aria-label={label}
    >
      <div className="relative w-[4.5rem] h-[4.5rem]">
        <span className="absolute inset-0 rounded-full bg-accent-yellow/25 animate-ping" />
        <span className="absolute inset-1 rounded-full border-2 border-accent-yellow/30" />
        <span className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-accent-yellow border-r-accent-yellow/40 animate-spin" />
        <span className="absolute inset-[10px] rounded-full bg-accent-yellow flex items-center justify-center shadow-soft">
          <Car size={22} className="text-text-primary" strokeWidth={2.4} />
        </span>
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-sm font-bold text-text-primary">{label}</p>
        <div className="flex items-center justify-center gap-1.5" aria-hidden>
          <span className="loading-dot" />
          <span className="loading-dot" style={{ animationDelay: '0.15s' }} />
          <span className="loading-dot" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>
    </div>
  );
}

export function LoadingState({ count = 6, variant = 'card' }: LoadingStateProps) {
  if (variant === 'page') {
    return <BrandSpinner />;
  }

  if (variant === 'list') {
    return (
      <div className="w-full space-y-3" role="status" aria-label="جاري التحميل">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="w-full bg-bg-card border border-border-soft rounded-2xl p-3.5 flex items-center gap-3"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="skeleton-shine w-14 h-14 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2.5 min-w-0">
              <div className="skeleton-shine h-3.5 w-[70%] max-w-[14rem] rounded-lg" />
              <div className="skeleton-shine h-3 w-[40%] max-w-[7rem] rounded-lg" />
            </div>
            <div className="skeleton-shine h-5 w-14 rounded-lg flex-shrink-0 hidden sm:block" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className="w-full space-y-4" role="status" aria-label="جاري التحميل">
        <div className="skeleton-shine w-full aspect-[16/10] rounded-2xl" />
        <div className="skeleton-shine h-7 w-[65%] max-w-md rounded-lg" />
        <div className="skeleton-shine h-10 w-[45%] max-w-xs rounded-lg" />
        <div className="skeleton-shine h-28 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div
      className="w-full grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4"
      role="status"
      aria-label="جاري التحميل"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-bg-card rounded-2xl overflow-hidden border border-border-soft shadow-soft"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="skeleton-shine w-full aspect-[16/10] relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <Car size={28} className="text-accent-yellow/50" strokeWidth={1.5} />
            </div>
          </div>
          <div className="p-3.5 space-y-2.5">
            <div className="skeleton-shine h-4 w-[80%] rounded-lg" />
            <div className="skeleton-shine h-6 w-[45%] rounded-lg" />
            <div className="flex gap-2 pt-1">
              <div className="skeleton-shine h-9 flex-1 rounded-xl" />
              <div className="skeleton-shine h-9 w-16 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
