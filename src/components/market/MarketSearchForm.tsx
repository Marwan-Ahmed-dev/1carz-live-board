'use client';

// فورم البحث في /market.
// 4 أعمدة dropdowns: Brand | Model | Year | Trim في الصف الأول.
// Mileage | Paint | Price Range | (Search + Reset) في الصف الثاني.
// كل الـ labels بالعربي (RTL).

import { useMemo } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import type { MarketEntry } from '@/lib/types';

export interface MarketFilters {
  brand: string;
  model: string;
  year: string;
  trim: string;
  mileage: string;
  paint: string;
  minPrice: string;
  maxPrice: string;
}

interface MarketSearchFormProps {
  filters: MarketFilters;
  onChange: (next: MarketFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  entries: MarketEntry[];
}

const DEFAULT_FILTERS: MarketFilters = {
  brand: '',
  model: '',
  year: '',
  trim: '',
  mileage: '',
  paint: '',
  minPrice: '',
  maxPrice: '',
};

export function MarketSearchForm({
  filters,
  onChange,
  onSearch,
  onReset,
  entries,
}: MarketSearchFormProps) {
  // بنستخرج الـ options من البيانات الموجودة (fallback على hard-coded lists).
  const brands = useMemo(() => unique(entries.map((e) => e.brand)).filter(Boolean), [entries]);
  const models = useMemo(() => unique(entries.map((e) => e.model)).filter(Boolean), [entries]);
  const years = useMemo(
    () => unique(entries.map((e) => String(e.year))).filter(Boolean).sort((a, b) => Number(b) - Number(a)),
    [entries]
  );
  const trims = useMemo(() => unique(entries.map((e) => e.trim)).filter(Boolean), [entries]);
  const paints = useMemo(() => unique(entries.map((e) => e.paint_condition)).filter(Boolean), [entries]);

  const isFiltered = useMemo(() => {
    return Object.entries(filters).some(([k, v]) => {
      if (k === 'minPrice' || k === 'maxPrice') return v !== DEFAULT_FILTERS[k];
      return v !== '';
    });
  }, [filters]);

  const update = (key: keyof MarketFilters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-slate-900">Search Cars</h2>
        <p className="text-sm text-slate-500 mt-1">
          Find market prices based on real listings and sales data.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Row 1 */}
        <SelectField
          label="Brand"
          value={filters.brand}
          onChange={(v) => update('brand', v)}
          placeholder="كل الماركات"
          options={brands}
        />
        <SelectField
          label="Model"
          value={filters.model}
          onChange={(v) => update('model', v)}
          placeholder="كل الموديلات"
          options={models}
        />
        <SelectField
          label="Year"
          value={filters.year}
          onChange={(v) => update('year', v)}
          placeholder="كل السنوات"
          options={years}
        />
        <SelectField
          label="Trim"
          value={filters.trim}
          onChange={(v) => update('trim', v)}
          placeholder="كل الفئات"
          options={trims}
        />

        {/* Row 2 */}
        <SelectField
          label="Mileage (KM)"
          value={filters.mileage}
          onChange={(v) => update('mileage', v)}
          placeholder="كل المسافات"
          options={[]} // mileage مفيش خيارات جاهزة — نص حر
          allowFreeText
          freeTextPlaceholder="مثال: حتى 100,000"
        />
        <SelectField
          label="Paint / Condition"
          value={filters.paint}
          onChange={(v) => update('paint', v)}
          placeholder="كل الحالات"
          options={paints}
        />
        <div className="sm:col-span-2 lg:col-span-2 grid grid-cols-2 gap-2">
          <NumberField
            label="Min Price"
            value={filters.minPrice}
            onChange={(v) => update('minPrice', v)}
            placeholder="من"
          />
          <NumberField
            label="Max Price"
            value={filters.maxPrice}
            onChange={(v) => update('maxPrice', v)}
            placeholder="إلى"
          />
        </div>

        {/* Buttons (last cell, spans 1 col on large) */}
        <div className="lg:col-span-4 flex flex-col sm:flex-row gap-2 sm:justify-end pt-1">
          <button
            type="button"
            onClick={onReset}
            disabled={!isFiltered}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed order-2 sm:order-1"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            type="button"
            onClick={onSearch}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold order-1 sm:order-2"
          >
            <Search size={14} />
            Search
          </button>
        </div>
      </div>
    </div>
  );
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// ============================================================================
// fields
// ============================================================================

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
  allowFreeText?: boolean;
  freeTextPlaceholder?: string;
}

function SelectField({
  label,
  value,
  onChange,
  placeholder,
  options,
  allowFreeText,
  freeTextPlaceholder,
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}
      </label>
      {allowFreeText ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={freeTextPlaceholder || placeholder}
          className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          dir="ltr"
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

function NumberField({ label, value, onChange, placeholder }: NumberFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}
      </label>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        dir="ltr"
      />
    </div>
  );
}

export { DEFAULT_FILTERS as DEFAULT_MARKET_FILTERS };