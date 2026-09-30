'use client';

// Number input مع thousand separators مباشر.
// أثناء الكتابة بيعرض القيمة بفاصلة كل 3 أرقام (en-US locale)،
// لكن بيخزّن الرقم الخام (بدون فواصل) في الـ parent عبر onChange(n: number).
//
// Modes:
//   • 'number' (default): strict — بيشيل أي حرف غير رقم/decimal.
//     مناسب لـ inputs اللي القيمة فيها رقم واحد بس (price, mileage).
//   • 'free': بيسمح بأي حرف، بس بيضيف فواصل للـ digit groups.
//     مناسب للـ search filters اللي فيها operators (مثل "<= 100,000").
//
// الـ parent بيمرر `value: number | undefined` (الرقم الخام) والـ component
// بيحدّث الـ display state من الـ value لما الـ parent يغيّره externally.
// في الـ free mode، الـ parent ممكن يمرر كمان `rawValue: string` عشان
// يحافظ على الـ operators / non-digit chars اللي مش في الـ number.

import { useEffect, useRef, useState } from 'react';
import { formatPriceInput, formatWithCommas } from '@/lib/format';

export interface NumberInputProps {
  label: string;
  /** Numeric value (no commas). undefined = empty. */
  value: number | undefined;
  /** Callback when user edits — receives the parsed number. */
  onChange: (n: number | undefined) => void;
  /**
   * Optional: receive the full formatted display string (with separators
   * AND any non-digit chars preserved in free mode).
   * Useful when the parent needs the raw text for further parsing
   * (e.g. the market search uses operators like "<= 100,000").
   */
  onRawChange?: (formatted: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  /** Allow decimals? Default false (integers only). */
  allowDecimals?: boolean;
  /** Hint text below input. */
  hint?: string;
  /**
   * 'number' (default): strict digits + optional decimal.
   * 'free': preserve all chars (operators, letters, spaces); apply commas
   *         to digit groups only. onChange emits the numeric portion or
   *         undefined.
   */
  mode?: 'number' | 'free';
  /**
   * External raw display string. When provided, drives the display directly
   * (overrides the formatted `value`). Use this in free mode when the parent
   * needs to preserve operator prefixes or external programmatic updates.
   */
  rawValue?: string;
  /** Optional id override. */
  id?: string;
}

/**
 * Parse a display string back to a number (undefined if empty/invalid).
 */
function parseNumberString(raw: string): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[^\d.]/g, '');
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export function NumberInput({
  label,
  value,
  onChange,
  onRawChange,
  error,
  required,
  placeholder,
  min,
  max,
  allowDecimals = false,
  hint,
  mode = 'number',
  rawValue,
  id,
}: NumberInputProps) {
  // Initial display: لو الـ parent مرر rawValue، استخدمه. غير كده،
  // اشتق الـ display من الـ numeric value.
  const initialDisplay =
    rawValue !== undefined
      ? rawValue
      : value !== undefined
      ? formatValueForMode(String(value), mode, allowDecimals)
      : '';
  const [display, setDisplay] = useState<string>(initialDisplay);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync display state from external props.
  //   • rawValue (لو موجود) هو الـ authoritative display source — الـ parent
  //     بيمرره عشان يحافظ على الـ operator prefixes لما اليوزر يكتب.
  //   • غير كده، الـ `value` (numeric) هو اللي بيحدّث الـ display.
  // الـ effect بيقارن مع الـ last seen values عشان ما يـ clobber
  // الـ user in-progress edit في الـ typing-to-display round-trip.
  const lastExternalValueRef = useRef<number | undefined>(value);
  const lastExternalRawRef = useRef<string | undefined>(rawValue);

  useEffect(() => {
    const valueChanged = value !== lastExternalValueRef.current;
    const rawChanged = rawValue !== lastExternalRawRef.current;
    if (!valueChanged && !rawChanged) return;

    lastExternalValueRef.current = value;
    lastExternalRawRef.current = rawValue;

    // If parent gave us an explicit rawValue, use it as-is.
    if (rawValue !== undefined) {
      setDisplay(rawValue);
      return;
    }
    // Otherwise derive from numeric value.
    setDisplay(
      value !== undefined ? formatValueForMode(String(value), mode, allowDecimals) : ''
    );
  }, [value, rawValue, mode, allowDecimals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    let formatted: string;
    let num: number | undefined;

    if (mode === 'free') {
      // Defensive: strip commas from the digit runs BEFORE formatting. This is
      // belt-and-suspenders alongside `formatWithCommas`'s own stripping — if
      // the user pastes / autofills a value like "1,2345", we collapse any
      // orphan commas between digits first so `formatWithCommas` works on a
      // clean digit string.
      const cleanedDigits = raw.replace(/,/g, '');
      formatted = formatWithCommas(cleanedDigits);
      // In free mode, we still emit the numeric value (parsed).
      num = parseNumberString(formatted);
    } else {
      // Strict number mode.
      const cleaned = allowDecimals
        ? raw.replace(/[^\d.]/g, '')
        : raw.replace(/[^\d]/g, '');
      // Reject multiple decimal points
      const parts = cleaned.split('.');
      const safe =
        parts.length > 2
          ? parts[0] + '.' + parts.slice(1).join('')
          : cleaned;
      const [intPart, decPart] = safe.split('.');
      const intWithCommas = intPart
        ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        : '';
      formatted =
        decPart !== undefined
          ? `${intWithCommas}.${decPart}`
          : intWithCommas;
      num = parseNumberString(formatted);
    }

    setDisplay(formatted);
    // Mark refs so the effect doesn't re-sync and clobber our in-progress edit.
    lastExternalValueRef.current = num;
    lastExternalRawRef.current = formatted;
    onChange(num);
    onRawChange?.(formatted);
  };

  const handleBlur = () => {
    // Defensive re-format on blur (covers paste / autofill / IME).
    if (mode === 'free') {
      // Strip commas from digit runs first to avoid the double-comma bug
      // ("1,2345" → "1,2,345"). Then re-apply commas cleanly.
      setDisplay(formatWithCommas(display.replace(/,/g, '')));
      return;
    }
    if (!display) return;
    const num = parseNumberString(display);
    if (num === undefined) {
      setDisplay('');
      return;
    }
    setDisplay(formatValueForMode(String(num), mode, allowDecimals));
  };

  const outOfRange =
    value !== undefined &&
    ((min !== undefined && value < min) ||
      (max !== undefined && value > max));

  const inputBase =
    'w-full px-3 py-2.5 rounded-xl bg-bg-primary border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-yellow/40';

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ms-1">*</span>}
      </label>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode={allowDecimals ? 'decimal' : 'numeric'}
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
        dir="ltr"
        className={`${inputBase} ${
          error || outOfRange
            ? 'border-amber-400 focus:border-amber-500'
            : 'border-border-soft focus:border-accent-yellow'
        }`}
      />
      {error ? (
        <span className="text-xs text-red-600 font-medium">{error}</span>
      ) : outOfRange ? (
        <span className="text-xs text-amber-600 font-medium">
          {min !== undefined && value !== undefined && value < min
            ? `القيمة يجب أن تكون ≥ ${formatPriceInput(String(min))}`
            : max !== undefined && value !== undefined && value > max
            ? `القيمة يجب أن تكون ≤ ${formatPriceInput(String(max))}`
            : ''}
        </span>
      ) : hint ? (
        <span className="text-xs text-text-muted">{hint}</span>
      ) : null}
    </div>
  );
}

function formatValueForMode(
  raw: string,
  mode: 'number' | 'free',
  allowDecimals: boolean
): string {
  if (mode === 'free') return formatWithCommas(raw);
  if (allowDecimals) {
    const [intPart, decPart] = raw.split('.');
    const intFormatted = intPart
      ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      : '';
    return decPart !== undefined ? `${intFormatted}.${decPart}` : intFormatted;
  }
  const cleaned = raw.replace(/[^\d]/g, '');
  return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}