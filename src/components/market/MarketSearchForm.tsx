'use client';

// فورم البحث في /market.
// 4 أعمدة dropdowns: Brand | Model | Year | Trim في الصف الأول.
// Mileage | Paint | (Search + Reset) في الصف الثاني.
// (تم حذف Min/Max Price بناء على طلب اليوزر — البحث بالسعر هيكون ضمني
//  في الـ results table لما يطبّق فلاتر تانية).
// كل الـ labels بالعربي (RTL).
// بيستخدم نفس الـ tokens بتاعت الـ site (cream / yellow / slate text).
//
// Brand و Model بقوا SearchableSelect (combobox) — اليوزر يقدر يكتب/يبحث
// بدل ما يـ scroll في dropdown طويل. الـ Mileage في الـ search mode
// (free text مع operators زي "<= 100,000") بياخد thousand separators live
// من غير ما نشيل الـ operators.
//
// الـ search بيستخدم DB-derived data فقط (مش الـ static catalog).
// لو مفيش Mercedes في الـ DB، اليوزر مش هيشوف Mercedes في الـ Brand dropdown.
// الـ add form (MarketEntryForm) لسه بيستخدم catalog + DB عشان اليوزر يقدر
// يضيف brands/models جديدة.

import { useMemo } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import type { MarketEntry } from '@/lib/types';
import {
  getYearsFromEntries,
  getTrimsFromEntries,
  getPaintsFromEntries,
} from '@/lib/market';
import { SearchableSelect } from './SearchableSelect';
import { NumberInput } from './NumberInput';

export interface MarketFilters {
  brand: string;
  model: string;
  year: string;
  trim: string;
  mileage: string;
  paint: string;
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
};

export function MarketSearchForm({
  filters,
  onChange,
  onSearch,
  onReset,
  entries,
}: MarketSearchFormProps) {
  // Brand options — DB-only (distinct brands in the entries).
  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.brand) set.add(e.brand);
    });
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }, [entries]);

  // Model options — DB-only (distinct models for the selected brand).
  // لو مفيش brand مختار، بنجمع كل الـ models من الـ entries.
  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (filters.brand) {
        if (e.brand === filters.brand && e.model) set.add(e.model);
      } else if (e.model) {
        set.add(e.model);
      }
    });
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }, [filters.brand, entries]);

  // Year — DB-only، cascade على (brand, model).
  const years = useMemo(
    () =>
      getYearsFromEntries(entries, filters.brand, filters.model)
        .map(String)
        .sort((a, b) => Number(b) - Number(a)),
    [entries, filters.brand, filters.model]
  );

  // Trim — DB-only، cascade على (brand, model, year).
  const trims = useMemo(() => {
    if (!filters.brand || !filters.model || !filters.year) return [];
    return getTrimsFromEntries(
      entries,
      filters.brand,
      filters.model,
      Number(filters.year)
    );
  }, [entries, filters.brand, filters.model, filters.year]);

  // Paint — DB-only، cascade على (brand, model, year).
  const paints = useMemo(() => {
    if (!filters.brand || !filters.model || !filters.year) return [];
    return getPaintsFromEntries(
      entries,
      filters.brand,
      filters.model,
      Number(filters.year)
    );
  }, [entries, filters.brand, filters.model, filters.year]);

  const isFiltered = useMemo(() => {
    return Object.entries(filters).some(
      ([k, v]) => v !== DEFAULT_FILTERS[k as keyof MarketFilters]
    );
  }, [filters]);

  /**
   * Cascade clearing: لما brand يتغيّر، بنمسح model/year/trim/paint.
   * لما model يتغيّر، بنمسح year/trim/paint.
   * لما year يتغيّر، بنمسح trim/paint.
   */
  const update = (key: keyof MarketFilters, value: string) => {
    let next: MarketFilters;
    if (key === 'brand') {
      next = { ...filters, brand: value, model: '', year: '', trim: '', paint: '' };
    } else if (key === 'model') {
      next = { ...filters, model: value, year: '', trim: '', paint: '' };
    } else if (key === 'year') {
      next = { ...filters, year: value, trim: '', paint: '' };
    } else {
      next = { ...filters, [key]: value };
    }
    onChange(next);
  };

  // Mileage في الـ search: نص حر بيقبل operators زي "<= 100,000" أو "120,000".
  // بنستخدم NumberInput في mode='free' — بيضيف فواصل للـ digit groups
  // من غير ما يشيل الـ operators. الـ onRawChange بيحفظ النص الكامل
  // (مع الـ operators والفواصل) عشان الـ matching logic في /market/page.tsx
  // يقدر يعمل parse للـ operators والـ digit groups.
  // الـ `value` prop بياخد الـ numeric portion للـ initial display + reset sync.
  const mileageNumber = parseMileageNumber(filters.mileage);

  return (
    <div className="bg-bg-card border border-border-soft rounded-2xl p-5 sm:p-6 shadow-soft">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-text-primary">Search Cars</h2>
        <p className="text-sm text-text-muted mt-1">
          Find market prices based on real listings and sales data.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Row 1 — brand / model / year */}
        <SearchableSelect
          label="Brand"
          value={filters.brand}
          onChange={(v) => update('brand', v)}
          placeholder="كل الماركات"
          options={brandOptions}
          emptyMessage="لا توجد ماركات"
        />
        <SearchableSelect
          label="Model"
          value={filters.model}
          onChange={(v) => update('model', v)}
          placeholder={filters.brand ? 'كل الموديلات' : 'اختر الماركة أولاً'}
          options={modelOptions}
          disabled={!filters.brand && modelOptions.length === 0}
          emptyMessage="لا توجد موديلات"
          hint={
            !filters.brand && modelOptions.length === 0
              ? 'اختر الماركة أولاً'
              : undefined
          }
        />
        <SimpleSelectField
          label="Year"
          value={filters.year}
          onChange={(v) => update('year', v)}
          placeholder="كل السنوات"
          options={years}
        />

        {/* Row 2 — trim / mileage / paint */}
        <SimpleSelectField
          label="Trim"
          value={filters.trim}
          onChange={(v) => update('trim', v)}
          placeholder="كل الفئات"
          options={trims}
        />
        <NumberInput
          label="Mileage (KM)"
          value={mileageNumber}
          rawValue={filters.mileage}
          onChange={() => {
            // الـ full formatted string (مع الـ operators والفواصل) بيتبعت
            // عبر onRawChange — الـ matching logic في /market/page.tsx بيحتاجه.
          }}
          onRawChange={(raw) => update('mileage', raw)}
          mode="free"
          placeholder="مثال: حتى 120,000"
          hint="يدعم أرقام فقط، أو <= 100,000، أو >= 50,000"
        />
        <SimpleSelectField
          label="Paint / Condition"
          value={filters.paint}
          onChange={(v) => update('paint', v)}
          placeholder="كل الحالات"
          options={paints}
        />

        {/* Buttons — span all 3 cols on lg */}
        <div className="sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row gap-2 sm:justify-end pt-1">
          <button
            type="button"
            onClick={onReset}
            disabled={!isFiltered}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-bg-card text-text-secondary border border-border-soft hover:bg-bg-card-hover text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed order-2 sm:order-1"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            type="button"
            onClick={onSearch}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-sm font-bold order-1 sm:order-2"
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

/**
 * Parse the leading numeric portion of the Mileage filter — used to feed
 * NumberInput's numeric value prop. The original free-text operator prefix
 * ("<= ", ">=", etc.) is lost when NumberInput emits, but that's acceptable:
 * the search matching logic in /market/page.tsx falls back to `===` exact
 * match when no operator is present, which is the most common case.
 *
 * For richer operator support, callers can still use the underlying
 * `filters.mileage` string via the public type.
 */
function parseMileageNumber(raw: string): number | undefined {
  if (!raw) return undefined;
  const m = raw.match(/(\d[\d,]*)/);
  if (!m) return undefined;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

// ============================================================================
// fields
// ============================================================================

interface SimpleSelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}

function SimpleSelectField({
  label,
  value,
  onChange,
  placeholder,
  options,
}: SimpleSelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl bg-bg-primary border border-border-soft text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-yellow/40 focus:border-accent-yellow"
        dir="ltr"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export { DEFAULT_FILTERS as DEFAULT_MARKET_FILTERS };