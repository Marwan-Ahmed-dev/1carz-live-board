'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { formatPriceInput, parsePriceInput } from '@/lib/format';

interface PriceFilterProps {
  onApply: (min: number | undefined, max: number | undefined) => void;
  initialMin?: number;
  initialMax?: number;
}

export function PriceFilter({ onApply, initialMin, initialMax }: PriceFilterProps) {
  const [open, setOpen] = useState(false);
  const [minVal, setMinVal] = useState<string>(
    initialMin != null ? formatPriceInput(String(initialMin)) : ''
  );
  const [maxVal, setMaxVal] = useState<string>(
    initialMax != null ? formatPriceInput(String(initialMax)) : ''
  );

  const handleApply = () => {
    const minRaw = minVal.trim() ? parsePriceInput(minVal) : undefined;
    const maxRaw = maxVal.trim() ? parsePriceInput(maxVal) : undefined;
    const min = minRaw != null && Number.isFinite(minRaw) && minRaw > 0 ? minRaw : undefined;
    const max = maxRaw != null && Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : undefined;
    if (min != null && max != null && min > max) {
      onApply(max, min);
      setMinVal(formatPriceInput(String(max)));
      setMaxVal(formatPriceInput(String(min)));
      return;
    }
    onApply(min, max);
  };

  const handleReset = () => {
    setMinVal('');
    setMaxVal('');
    onApply(undefined, undefined);
  };

  return (
    <div className="bg-bg-card border border-border-soft rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-bg-card-hover transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <DollarSign size={18} className="text-accent-yellow-hover" />
          فلتر السعر
        </span>
        {open ? <ChevronUp size={18} className="text-text-muted" /> : <ChevronDown size={18} className="text-text-muted" />}
      </button>

      {open && (
        <div className="p-4 pt-2 border-t border-border-soft space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="price-filter-min" className="block text-xs font-medium text-text-secondary mb-1">أقل سعر</label>
              <input
                id="price-filter-min"
                type="text"
                inputMode="numeric"
                value={minVal}
                onChange={(e) => setMinVal(formatPriceInput(e.target.value))}
                placeholder="0"
                dir="ltr"
                className="w-full px-3 py-2 rounded-lg bg-white border border-border-medium text-text-primary text-sm text-left price-display focus:border-accent-yellow focus:ring-2 focus:ring-accent-yellow/20"
              />
            </div>
            <div>
              <label htmlFor="price-filter-max" className="block text-xs font-medium text-text-secondary mb-1">أعلى سعر</label>
              <input
                id="price-filter-max"
                type="text"
                inputMode="numeric"
                value={maxVal}
                onChange={(e) => setMaxVal(formatPriceInput(e.target.value))}
                placeholder="∞"
                dir="ltr"
                className="w-full px-3 py-2 rounded-lg bg-white border border-border-medium text-text-primary text-sm text-left price-display focus:border-accent-yellow focus:ring-2 focus:ring-accent-yellow/20"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleApply}
              className="flex-1 py-2 rounded-lg bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-sm font-bold transition-colors"
            >
              تطبيق
            </button>
            <button
              onClick={handleReset}
              className="flex-1 py-2 rounded-lg bg-white border border-border-medium text-text-secondary hover:bg-bg-card-hover text-sm font-medium transition-colors"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
