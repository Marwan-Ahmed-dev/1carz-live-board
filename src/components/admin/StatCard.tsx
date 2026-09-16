'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  /** لون التأكيد على البطاقة (tailwind class) */
  accent?: 'yellow' | 'amber' | 'gray' | 'muted';
}

/**
 * Stat Card للإحصائيات في الـ admin dashboard
 * - 4 بطاقات: top, high, medium, low
 * - كل بطاقة لها لون مختلف حسب الأولوية
 */
export function StatCard({ label, value, icon, accent = 'yellow' }: StatCardProps) {
  const accentMap: Record<string, string> = {
    yellow: 'bg-admin-accent/15 text-admin-accent',
    amber: 'bg-amber-500/15 text-amber-400',
    gray: 'bg-slate-500/15 text-slate-300',
    muted: 'bg-slate-700/30 text-slate-400',
  };
  const accentClass = accentMap[accent];

  return (
    <div className="bg-admin-card border border-admin-border rounded-2xl p-4 sm:p-5 hover:border-admin-accent/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${accentClass}`}>
          {icon}
        </div>
      </div>
      <div className="badge-number text-3xl sm:text-4xl font-bold text-admin-text mb-1">
        {value.toLocaleString('ar-EG')}
      </div>
      <div className="text-xs sm:text-sm text-admin-text-muted font-medium">
        {label}
      </div>
    </div>
  );
}