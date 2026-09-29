'use client';

// الفورم لإضافة / تعديل entry في السجل السعري.
// بيستخدم في /market/new (add) و /market/[id] (edit).
// الفورم بيشتغل offline — لو الـ save فشل، بيتحفظ في الـ IndexedDB
// pending queue (عبر addMarketEntry).

import { useEffect, useId, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import {
  addMarketEntry,
  updateMarketEntry,
} from '@/lib/market';
import type {
  MarketEntry,
  MarketEntryInput,
} from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { logger } from '@/lib/logger';
import {
  getAllBrandNames,
  getModelsForBrand,
} from '@/lib/carBrands';

const CURRENT_YEAR = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Standardised select options for trim / paint / maintenance.
// "__other__" هو sentinel — لو اليوزر اختاره بنظهر text input حر.
// ---------------------------------------------------------------------------

const TRIM_OPTIONS = [
  { value: 'درجه اولي', label: 'درجه اولي' },
  { value: 'درجه تانيه', label: 'درجه تانيه' },
  { value: 'درجه ثالثه', label: 'درجه ثالثه' },
  { value: 'درجه رابعه', label: 'درجه رابعه' },
] as const;

const PAINT_OPTIONS = [
  { value: 'فبريكا', label: 'فبريكا' },
  { value: '__other__', label: 'أخرى (اكتب...)' },
] as const;

const MAINTENANCE_OPTIONS = [
  { value: 'في التوكيل', label: 'في التوكيل' },
  { value: 'بره التوكيل', label: 'بره التوكيل' },
  { value: 'مختلط', label: 'مختلط' },
  { value: '__other__', label: 'أخرى (اكتب...)' },
] as const;

const PAINT_STANDARD_VALUES: readonly string[] = PAINT_OPTIONS.map((o) => o.value).filter(
  (v) => v !== '__other__'
);
const MAINTENANCE_STANDARD_VALUES: readonly string[] = MAINTENANCE_OPTIONS.map((o) => o.value).filter(
  (v) => v !== '__other__'
);

interface MarketEntryFormProps {
  /** لما الـ mode = 'edit' بنمرر الـ entry الموجودة. */
  initial?: MarketEntry | null;
  /** بعد الحفظ بنمرر الـ result للـ parent (route). */
  onSaved?: (info: { id: string; synced: boolean; client_id: string }, mode: 'create' | 'edit') => void;
  /** Callback لـ "Save & Add Another" — نمسح الفورم بعد الحفظ. */
  onSavedAndAddAnother?: () => void;
  /** Suggestions للـ datalist inputs (brand/model/year/mileage). */
  suggestions?: {
    brands?: string[];
    models?: string[];
    years?: number[];
    mileages?: number[];
  };
}

interface FormState {
  brand: string;
  model: string;
  year: string;
  trim: string;
  /** يخزّن إما القيمة القياسية (فبريكا) أو '__other__' لو اليوزر اختار أخرى. */
  paint_condition: string;
  /** لو paint_condition === '__other__' بنخزّن النص الحر هنا. */
  paint_other: string;
  mileage_km: string;
  /** يخزّن إما القيمة القياسية أو '__other__' لو اليوزر اختار أخرى. */
  maintenance: string;
  /** لو maintenance === '__other__' بنخزّن النص الحر هنا. */
  maintenance_other: string;
  price_egp: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  brand: '',
  model: '',
  year: '',
  trim: '',
  paint_condition: '',
  paint_other: '',
  mileage_km: '',
  maintenance: '',
  maintenance_other: '',
  price_egp: '',
  notes: '',
};

function formFromEntry(entry: MarketEntry | null | undefined): FormState {
  if (!entry) return EMPTY_FORM;
  const paintIsStandard = PAINT_STANDARD_VALUES.includes(entry.paint_condition);
  const maintenanceIsStandard = MAINTENANCE_STANDARD_VALUES.includes(entry.maintenance);
  return {
    brand: entry.brand,
    model: entry.model,
    year: String(entry.year),
    trim: entry.trim,
    paint_condition: paintIsStandard ? entry.paint_condition : '__other__',
    paint_other: paintIsStandard ? '' : entry.paint_condition,
    mileage_km: String(entry.mileage_km),
    maintenance: maintenanceIsStandard ? entry.maintenance : '__other__',
    maintenance_other: maintenanceIsStandard ? '' : entry.maintenance,
    price_egp: String(entry.price_egp),
    notes: entry.notes || '',
  };
}

export function MarketEntryForm({
  initial,
  onSaved,
  onSavedAndAddAnother,
  suggestions,
}: MarketEntryFormProps) {
  const { user, userData } = useAuth();
  const { showToast } = useToast();
  const mode: 'create' | 'edit' = initial?.id ? 'edit' : 'create';
  const [form, setForm] = useState<FormState>(() => formFromEntry(initial));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

  // suggestions — لو الـ parent مش بتمررهم بنستخدم defaults ذكية.
  // الـ brands بندمج فيها الـ static catalog (من carBrands.ts) + الـ DB entries.
  // الـ models بندمج فيها الـ static models للـ brand المختار + كل الـ DB models.
  // الـ dedup بيشتغل case-sensitive — الكنسيكال من الـ catalog بيحافظ على الـ English form.

  // Brand dropdown options — static catalog + DB suggestions + safety للـ current value.
  // Sorted alphabetically (locale-aware). الـ safety بيمنع فقدان الـ brand لو الـ suggestions
  // لسه ما حملتش (race condition) أو لو الـ brand مش في الـ catalog ومش في الـ DB.
  const brandOptions = useMemo(() => {
    const set = new Set<string>(getAllBrandNames());
    if (suggestions?.brands) suggestions.brands.forEach((b) => set.add(b));
    if (form.brand) set.add(form.brand);
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }, [suggestions?.brands, form.brand]);

  // Model dropdown options — static models للـ brand المختار + DB models + safety.
  // الـ static models بيتحطوا الأول في الترتيب (catalog order) ثم أي DB models إضافية.
  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    // 1. Static models للـ brand المختار حالياً (لو الـ brand موجود في الـ catalog).
    if (form.brand) {
      getModelsForBrand(form.brand).forEach((m) => set.add(m));
    }
    // 2. كل الـ models الـ dynamic من الـ DB entries.
    if (suggestions?.models) suggestions.models.forEach((m) => set.add(m));
    // 3. Safety: الـ current value لازم يكون في الـ options عشان الـ edit mode يعرضه صح.
    if (form.model) set.add(form.model);
    return Array.from(set).map((name) => ({ value: name, label: name }));
  }, [form.brand, suggestions?.models, form.model]);

  const yearSuggestions =
    suggestions?.years ?? Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i);
  const mileageSuggestions = (
    suggestions?.mileages ?? [10000, 20000, 30000, 50000, 75000, 100000, 125000, 150000, 200000]
  ).map(String);

  useEffect(() => {
    setForm(formFromEntry(initial));
  }, [initial]);

  // لما الـ brand يتغيّر، لو الـ model القديم مش valid للـ brand الجديد بنمسحه.
  // (مثلاً: المستخدم فتح entry ببراند Toyota وموديل Corolla، بعدين غيّر البراند لـ BMW —
  //  "Corolla" مش في BMW models فبنمسحه عشان يختار BMW model).
  useEffect(() => {
    if (!form.brand || !form.model) return;
    const modelsForBrand = getModelsForBrand(form.brand);
    const modelInDb = suggestions?.models?.includes(form.model);
    if (modelsForBrand.length > 0 && !modelsForBrand.includes(form.model) && !modelInDb) {
      update('model', '');
    }
    // الـ effect مقصود يتشغل بس لما الـ brand يتغيّر — باقي الـ deps هي قيم read-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.brand]);

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): { ok: boolean; input?: MarketEntryInput; errors: Partial<Record<keyof FormState, string>> } => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.brand.trim()) next.brand = 'نوع العربية مطلوب';
    if (!form.model.trim()) next.model = 'الموديل مطلوب';
    const yearNum = Number(form.year);
    if (!form.year || !Number.isFinite(yearNum)) next.year = 'سنة التصنيع مطلوبة';
    else if (yearNum < 1980 || yearNum > CURRENT_YEAR + 1) next.year = `السنة بين 1980 و ${CURRENT_YEAR + 1}`;
    if (!form.trim.trim()) next.trim = 'الفئة مطلوبة';
    if (!form.paint_condition) {
      next.paint_condition = 'حالة الطلاء مطلوبة';
    } else if (form.paint_condition === '__other__' && !form.paint_other.trim()) {
      next.paint_other = 'اكتب حالة الطلاء';
    }
    const mileageNum = Number(form.mileage_km);
    if (form.mileage_km === '' || !Number.isFinite(mileageNum) || mileageNum < 0) {
      next.mileage_km = 'عداد الكيلومتر يجب أن يكون رقم موجب';
    }
    if (!form.maintenance) {
      next.maintenance = 'نوع الصيانات مطلوب';
    } else if (form.maintenance === '__other__' && !form.maintenance_other.trim()) {
      next.maintenance_other = 'اكتب نوع الصيانات';
    }
    const priceNum = Number(form.price_egp);
    if (form.price_egp === '' || !Number.isFinite(priceNum) || priceNum <= 0) {
      next.price_egp = 'السعر مطلوب ويجب أن يكون أكبر من صفر';
    }
    if (form.notes && form.notes.length > 500) next.notes = 'الملاحظات يجب ألا تزيد عن 500 حرف';

    if (Object.keys(next).length > 0) return { ok: false, errors: next };

    // resolve "__other__" → final string
    const paintFinal =
      form.paint_condition === '__other__' ? form.paint_other.trim() : form.paint_condition;
    const maintenanceFinal =
      form.maintenance === '__other__' ? form.maintenance_other.trim() : form.maintenance;

    const input: MarketEntryInput = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: yearNum,
      trim: form.trim.trim(),
      paint_condition: paintFinal,
      mileage_km: Math.floor(mileageNum),
      maintenance: maintenanceFinal,
      price_egp: Math.floor(priceNum),
      notes: form.notes.trim() || undefined,
    };
    return { ok: true, input, errors: {} };
  };

  const handleSubmit = async (e: React.FormEvent, opts: { stayOnForm?: boolean } = {}) => {
    e.preventDefault();
    if (!user) {
      showToast('يجب تسجيل الدخول', 'error');
      return;
    }
    const v = validate();
    if (!v.ok || !v.input) {
      setErrors(v.errors);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'edit' && initial?.id) {
        await updateMarketEntry(
          initial.id,
          v.input,
          {
            recorded_by_uid: user.uid,
            recorded_by_name: userData?.username || user.email || null,
          }
        );
        showToast('تم تحديث الـ entry', 'success');
        onSaved?.({ id: initial.id, synced: true, client_id: initial.id }, 'edit');
        return;
      }

      const result = await addMarketEntry(v.input, {
        recorded_by_uid: user.uid,
        recorded_by_name: userData?.username || user.email || null,
      });
      if (result.synced) {
        showToast('تم حفظ الـ entry', 'success');
      } else {
        showToast('تم حفظ الـ entry في الانتظار — سيُرسل تلقائياً عند توفر الإنترنت', 'info');
      }
      onSaved?.(result, 'create');

      if (opts.stayOnForm && onSavedAndAddAnother) {
        onSavedAndAddAnother();
        setForm(EMPTY_FORM);
      }
    } catch (err) {
      logger.error('[MarketEntryForm] save failed:', err);
      showToast(
        err instanceof Error ? err.message : 'فشل حفظ الـ entry',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
      {/* ===== SECTION: Car Data (بيانات العربيه) ===== */}
      <section className="bg-bg-card border border-border-soft rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-accent-yellow" />
          <h2 className="text-base font-bold text-text-primary">بيانات العربيه</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Brand — strict dropdown (static catalog + DB suggestions). */}
          <SelectField
            label="Brand (نوع العربية)"
            value={form.brand}
            onChange={(v) => update('brand', v)}
            error={errors.brand}
            required
            options={brandOptions}
            placeholder="اختر الماركة..."
          />

          {/* Model — strict dropdown, scoped to the selected brand's models. */}
          {/* بنعطّله لحد ما اليوزر يختار brand عشان الـ UX يبقى واضح. */}
          <SelectField
            label="Model (الموديل)"
            value={form.model}
            onChange={(v) => update('model', v)}
            error={errors.model}
            required
            options={modelOptions}
            placeholder={form.brand ? 'اختر الموديل...' : 'اختر الماركة أولاً'}
            disabled={!form.brand}
          />

          {/* Year — datalist with last 30 years */}
          <DatalistField
            label="Year (سنة التصنيع)"
            value={form.year}
            onChange={(v) => update('year', v)}
            error={errors.year}
            required
            inputType="number"
            suggestions={yearSuggestions.map(String)}
            placeholder="2020"
          />

          {/* Trim — select dropdown (4 grades) */}
          <SelectField
            label="Trim (الفئة)"
            value={form.trim}
            onChange={(v) => update('trim', v)}
            error={errors.trim}
            required
            options={TRIM_OPTIONS}
            placeholder="اختر الدرجة..."
          />

          {/* Paint — select dropdown */}
          <SelectField
            label="Paint / Condition (حالة الطلاء)"
            value={form.paint_condition}
            onChange={(v) => update('paint_condition', v)}
            error={errors.paint_condition}
            required
            options={PAINT_OPTIONS}
            placeholder="اختر..."
          />

          {/* Conditional paint_other text input */}
          {form.paint_condition === '__other__' && (
            <TextField
              label="حالة الطلاء - تفاصيل"
              value={form.paint_other}
              onChange={(v) => update('paint_other', v)}
              error={errors.paint_other}
              required
              placeholder="مثال: راشة في الباب الخلفي"
            />
          )}

          {/* Mileage — datalist with common values */}
          <DatalistField
            label="Mileage (KM) (عداد الكيلومتر)"
            value={form.mileage_km}
            onChange={(v) => update('mileage_km', v)}
            error={errors.mileage_km}
            required
            inputType="number"
            suggestions={mileageSuggestions}
            placeholder="120000"
          />

          {/* Maintenance — select dropdown */}
          <SelectField
            label="Maintenance (نوع الصيانات)"
            value={form.maintenance}
            onChange={(v) => update('maintenance', v)}
            error={errors.maintenance}
            required
            options={MAINTENANCE_OPTIONS}
            placeholder="اختر..."
          />

          {/* Conditional maintenance_other text input */}
          {form.maintenance === '__other__' && (
            <TextField
              label="نوع الصيانات - تفاصيل"
              value={form.maintenance_other}
              onChange={(v) => update('maintenance_other', v)}
              error={errors.maintenance_other}
              required
              placeholder="مثال: توكيل حتى 80000، بعدها مركزي"
            />
          )}
        </div>
      </section>

      {/* ===== SECTION: Price & Notes (السعر والملاحظات) ===== */}
      <section className="bg-bg-card border border-border-soft rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-accent-yellow" />
          <h2 className="text-base font-bold text-text-primary">السعر والملاحظات</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            label="Price (EGP) (السعر)"
            value={form.price_egp}
            onChange={(v) => update('price_egp', v)}
            error={errors.price_egp}
            required
            min={1}
            placeholder="650000"
          />

          <div className="sm:col-span-2">
            <TextAreaField
              label="Notes (ملاحظات — اختياري)"
              value={form.notes}
              onChange={(v) => update('notes', v)}
              error={errors.notes}
              maxLength={500}
              placeholder="أي ملاحظات إضافية..."
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
        {mode === 'create' && onSavedAndAddAnother && (
          <button
            type="button"
            disabled={submitting}
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent, { stayOnForm: true })}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-bg-card text-text-secondary border border-border-soft hover:bg-bg-card-hover text-sm font-semibold disabled:opacity-60 order-2 sm:order-1"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save & Add Another
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-sm font-bold disabled:opacity-60 order-1 sm:order-2"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {mode === 'edit' ? 'Save Changes' : 'Save Entry'}
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// fields
// ============================================================================

interface FieldShellProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FieldShell({ label, error, required, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ms-1">*</span>}
      </label>
      {children}
      {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
    </div>
  );
}

function inputClass(hasError?: boolean): string {
  return `w-full px-3 py-2.5 rounded-xl bg-bg-primary border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-yellow/40 ${
    hasError
      ? 'border-red-400 focus:border-red-500'
      : 'border-border-soft focus:border-accent-yellow'
  }`;
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}

function TextField({ label, value, onChange, error, required, placeholder, maxLength }: TextFieldProps) {
  return (
    <FieldShell label={label} error={error} required={required}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={inputClass(!!error)}
      />
    </FieldShell>
  );
}

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
}

function NumberField({ label, value, onChange, error, required, placeholder, min, max }: NumberFieldProps) {
  return (
    <FieldShell label={label} error={error} required={required}>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        className={inputClass(!!error)}
        dir="ltr"
      />
    </FieldShell>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}

function TextAreaField({ label, value, onChange, error, required, placeholder, maxLength }: TextAreaFieldProps) {
  return (
    <FieldShell label={label} error={error} required={required}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={3}
        className={inputClass(!!error) + ' resize-y min-h-[80px]'}
      />
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------
// datalist input — text/number مع suggestions تظهر كـ autocomplete dropdown.
// ---------------------------------------------------------------------------

interface DatalistFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  suggestions: string[];
  inputType?: 'text' | 'number';
  id?: string;
}

function DatalistField({
  label,
  value,
  onChange,
  error,
  required,
  placeholder,
  suggestions,
  inputType = 'text',
  id,
}: DatalistFieldProps) {
  const listId = useId();
  return (
    <FieldShell label={label} error={error} required={required}>
      <input
        type={inputType}
        inputMode={inputType === 'number' ? 'numeric' : 'text'}
        list={listId}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass(!!error)}
        dir={inputType === 'number' ? 'ltr' : undefined}
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </FieldShell>
  );
}

// ---------------------------------------------------------------------------
// select dropdown — بخيارات ثابتة {value, label}.
// (لازم تكون مختلفة في الـ signature عن SelectField في MarketSearchForm —
//  هنا بندعم required/error options كمان.)
// ---------------------------------------------------------------------------

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  options: readonly { value: string; label: string }[];
  disabled?: boolean;
}

function SelectField({
  label,
  value,
  onChange,
  error,
  required,
  placeholder,
  options,
  disabled,
}: SelectFieldProps) {
  return (
    <FieldShell label={label} error={error} required={required}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${inputClass(!!error)} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <option value="" disabled>
          {placeholder || 'اختر...'}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}