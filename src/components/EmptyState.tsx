'use client';

import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * حالة فارغة موحدة - نستخدمها في:
 * - لا توجد عربيات
 * - لا توجد نتائج بحث
 * - لا توجد مستخدمين
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-bg-card flex items-center justify-center mb-4">
        {icon || <Inbox size={40} className="text-text-muted" strokeWidth={1.5} />}
      </div>
      <h3 className="text-lg font-bold text-text-primary mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary mb-5 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  );
}