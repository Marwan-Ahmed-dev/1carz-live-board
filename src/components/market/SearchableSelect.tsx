'use client';

// Searchable combobox — input + dropdown overlay.
// بيشتغل على الموبايل والـ desktop:
//   • Click input → يفتح الـ dropdown ويعرض كل الـ options (أو المفلتر منها لو اليوزر كتب).
//   • Type → filter case-insensitive (contains) على الـ labels.
//   • ArrowUp/Down → ينقل الـ highlighted option.
//   • Enter → يختار الـ highlighted option.
//   • Escape → يقفل الـ dropdown (الـ input value يفضل زي ما هو).
//   • Click outside → يقفل الـ dropdown.
//   • Click option → ينقل value للـ parent ويقفل الـ dropdown.
//
// الـ value المعروض في الـ input دايماً = الـ `value` prop (controlled) —
// يعني الـ parent يقدر يمسحها programmatically حتى لو مش في الـ options.
// الـ options المتاحة للاختيار بتيجي من الـ `options` prop بس.
//
// RTL-aware: الـ dropdown بيـ align مع text direction تلقائياً.
// Touch target ≥ 44px على الموبايل (min-h-[44px]).

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { getBrandAliases } from '@/lib/brandAliases';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** Optional override for the empty-state message. */
  emptyMessage?: string;
  /** Optional helper text below input. */
  hint?: string;
  /** Optional id override. */
  id?: string;
}

const EMPTY_DEFAULT = 'لا توجد نتائج';

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  error,
  required,
  placeholder,
  disabled,
  emptyMessage,
  hint,
  id,
}: SearchableSelectProps) {
  const reactId = useId();
  const inputId = id ?? `searchable-${reactId}`;
  const listboxId = `${inputId}-listbox`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string>('');
  const [highlight, setHighlight] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // Filtered options — case-insensitive "contains" match على الـ label +
  // الـ Arabic/English brand aliases. مثلاً: لو الـ option.label = "Mercedes"
  // والـ aliases = ['مرسيدس', 'بنز']، الـ user يقدر يدخل "مرسيدس" أو "Mercedes"
  // أو "مر" وكلهم يطابقوا نفس الـ option.
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('ar-EG');
    if (!q) return options;
    return options.filter((o) => {
      const labelLower = o.label.toLocaleLowerCase('ar-EG');
      if (labelLower.includes(q)) return true;
      // brand aliases: لو الـ label عنده Arabic/transliteration aliases،
      // بنتأكد إن الـ query بتطابق أي alias (case-insensitive).
      const aliases = getBrandAliases(o.label);
      if (aliases) {
        for (const alias of aliases) {
          if (alias.toLocaleLowerCase('ar-EG').includes(q)) return true;
        }
      }
      return false;
    });
  }, [options, query]);

  // Sync highlight to filtered list.
  useEffect(() => {
    if (highlight >= filtered.length) {
      setHighlight(filtered.length > 0 ? 0 : 0);
    }
  }, [filtered.length, highlight]);

  // Sync display value from controlled prop. الـ parent هو الـ source of truth
  // للـ value — الـ input يعرض الـ value مباشرة (مش local state).
  // بنحدّث الـ query (الـ filter input) لما الـ parent يغيّر الـ value externally.
  useEffect(() => {
    // إذا الـ dropdown مفتوح ومن غير ما اليوزر يكون typed، نخلي الـ query
    // تتبع الـ value. لو الـ dropdown مقفول، نخلي الـ query فاضية.
    if (!open) {
      setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, open]);

  // Click outside → close.
  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDocPointer);
    return () => document.removeEventListener('pointerdown', onDocPointer);
  }, [open]);

  // Scroll highlighted into view لما الـ dropdown مفتوح.
  useEffect(() => {
    if (!open) return;
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLLIElement>(
      `[data-idx="${highlight}"]`
    );
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlight, open]);

  const handleSelect = useCallback(
    (v: string) => {
      onChange(v);
      setOpen(false);
      setQuery('');
      // return focus to the input after selection
      inputRef.current?.focus();
    },
    [onChange]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setQuery(next);
    if (!open) setOpen(true);
    setHighlight(0);
    // لو اليوزر عدّل النص (مش اختار من القائمة)، نبعت القيمة الجديدة للـ parent
    // — ده بيسمح للـ "free text" use case حيث الـ parent يقبل أي قيمة.
    onChange(next);
  };

  const onFocus = () => {
    if (disabled) return;
    setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (!open) return;
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) handleSelect(opt.value);
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    } else if (e.key === 'Tab') {
      // allow tab to close naturally
      setOpen(false);
    }
  };

  const inputBase =
    'w-full px-3 py-2.5 rounded-xl bg-bg-primary border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-yellow/40';

  // Display value: لو الـ dropdown مفتوح نعرض الـ query (اللي اليوزر بيكتبه)
  // غير كده نعرض الـ controlled `value`.
  const displayValue = open ? query : value;

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <label
        htmlFor={inputId}
        className="text-xs font-semibold text-text-secondary uppercase tracking-wide"
      >
        {label}
        {required && <span className="text-red-500 ms-1">*</span>}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-invalid={!!error}
          disabled={disabled}
          value={displayValue}
          onChange={onInputChange}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`${inputBase} ${
            error
              ? 'border-red-400 focus:border-red-500'
              : 'border-border-soft focus:border-accent-yellow'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} pe-10`}
        />
        <button
          type="button"
          aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
          tabIndex={-1}
          onClick={() => {
            if (disabled) return;
            if (open) {
              setOpen(false);
            } else {
              setOpen(true);
              inputRef.current?.focus();
            }
          }}
          className="absolute inset-y-0 end-0 flex items-center justify-center w-10 text-text-muted hover:text-text-secondary"
        >
          <ChevronDown
            size={16}
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border-soft bg-bg-card shadow-medium py-1 text-sm"
          >
            {filtered.length === 0 ? (
              <li
                className="px-3 py-2.5 text-text-muted text-center"
                role="presentation"
              >
                {emptyMessage ?? EMPTY_DEFAULT}
              </li>
            ) : (
              filtered.map((opt, idx) => {
                const isHighlight = idx === highlight;
                return (
                  <li
                    key={opt.value}
                    data-idx={idx}
                    role="option"
                    aria-selected={opt.value === value}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(e) => {
                      // mousedown عشان يسبق blur على الـ input
                      e.preventDefault();
                      handleSelect(opt.value);
                    }}
                    className={`px-3 py-2.5 cursor-pointer flex items-center justify-between gap-2 ${
                      isHighlight
                        ? 'bg-accent-yellow/30'
                        : 'hover:bg-bg-card-hover'
                    } ${opt.value === value ? 'font-semibold' : ''}`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {opt.value === value && (
                      <span className="text-accent-yellow-hover text-xs">✓</span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>

      {hint && !error && (
        <span className="text-xs text-text-muted">{hint}</span>
      )}
      {error && (
        <span className="text-xs text-red-600 font-medium">{error}</span>
      )}
    </div>
  );
}