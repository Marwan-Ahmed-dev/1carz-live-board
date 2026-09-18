'use client';

import { CarStatus } from '@/lib/types';
import { getStatusLabel } from '@/lib/carStatus';

interface StatusBadgeProps {
  status: CarStatus | string;
  tone?: 'light' | 'admin';
  size?: 'sm' | 'md';
  className?: string;
}

const LIGHT_COLORS: Record<string, string> = {
  active: 'bg-green-600 text-white',
  reserved: 'bg-orange-500 text-white',
  sold: 'bg-red-600 text-white',
  inactive: 'bg-slate-500 text-white',
};

const ADMIN_COLORS: Record<string, string> = {
  active: 'bg-green-500 text-slate-900',
  reserved: 'bg-orange-400 text-slate-900',
  sold: 'bg-red-500 text-white',
  inactive: 'bg-slate-500 text-white',
};

export function StatusBadge({
  status,
  tone = 'light',
  size = 'sm',
  className = '',
}: StatusBadgeProps) {
  const colors = tone === 'admin' ? ADMIN_COLORS : LIGHT_COLORS;
  const color = colors[status] || colors.active;
  const sizeClass =
    size === 'md'
      ? 'px-2.5 py-1 text-xs sm:text-sm'
      : 'px-2 py-0.5 text-[11px] sm:text-xs';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-extrabold whitespace-nowrap shadow-sm ${color} ${sizeClass} ${className}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}
