'use client';

import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { PriorityFilter } from '@/lib/types';

interface PriorityButtonsProps {
  current: PriorityFilter;
  onChange: (filter: PriorityFilter) => void;
}

/**
 * شريط الأزرار الستة لتصفية الأولوية
 * [الكل]  [عربياتنا]  [قصوى]  [عالية]  [متوسطة]  [منخفضة]
 *
 * "عربياتنا" هو اختصار لـ "عربياتي" (my cars) — بيعرض العربيات المخصصة لي.
 */
export function PriorityButtons({ current, onChange }: PriorityButtonsProps) {
  const router = useRouter();
  const buttons: Array<{ key: PriorityFilter; label: string; show?: boolean }> = [
    { key: 'all', label: 'الكل' },
    { key: 'mine', label: 'عربياتي' },
    { key: 'top', label: 'قصوى' },
    { key: 'high', label: 'عالية' },
    { key: 'medium', label: 'متوسطة' },
    { key: 'low', label: 'منخفضة' },
  ];

  return (
    <div className="no-scrollbar overflow-x-auto">
      <div className="flex gap-2 py-1 px-1 min-w-max">
        {buttons.map((b) => {
          const active = current === b.key;
          return (
            <button
              key={b.key}
              onClick={() => {
                if (b.key === 'mine') {
                  router.push('/3arabyatna');
                  return;
                }
                onChange(b.key);
              }}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-accent-yellow text-text-primary shadow-soft'
                  : 'bg-white text-text-secondary border border-border-medium hover:bg-bg-card-hover'
              }`}
            >
              {b.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}