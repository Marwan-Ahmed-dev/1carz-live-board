'use client';

import { PriorityFilter } from '@/lib/types';
import { PRIORITY_LABELS, PRIORITY_ORDER } from '@/lib/priority';

interface PriorityButtonsProps {
  current: PriorityFilter;
  onChange: (filter: PriorityFilter) => void;
  /** للضيف: الكل + عربياتنا فقط */
  guestMode?: boolean;
}

export function PriorityButtons({ current, onChange, guestMode = false }: PriorityButtonsProps) {
  const buttons: Array<{ key: PriorityFilter; label: string }> = guestMode
    ? [
        { key: 'all', label: 'الكل' },
        { key: 'arabyatna', label: PRIORITY_LABELS.arabyatna },
      ]
    : [
        { key: 'all', label: 'الكل' },
        ...PRIORITY_ORDER.map((key) => ({ key, label: PRIORITY_LABELS[key] })),
      ];

  return (
    <div className="no-scrollbar overflow-x-auto">
      <div className="flex gap-2 py-1 px-1 min-w-max">
        {buttons.map((b) => {
          const active = current === b.key;
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => onChange(b.key)}
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
