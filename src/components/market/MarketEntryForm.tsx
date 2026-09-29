'use client';

// الفورم لإضافة / تعديل entry في السجل السعري.
// بيستخدم في /market/new (add) و /market/[id] (edit).
// الفورم بيشتغل offline — لو الـ save فشل، بيتحفظ في الـ IndexedDB
// pending queue (عبر addMarketEntry).

import { useEffect, useState } from 'react';
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

const CURRENT_YEAR = new Date().getFullYear();

interface MarketEntryFormProps {
  /** لما الـ mode = 'edit' بنمرر الـ entry الموجودة. */
  initial?: MarketEntry | null;
  /** بعد الحفظ بنمرر الـ result للـ parent (route). */
  onSaved?: (info: { id: string; synced: boolean; client_id: string }, mode: 'create' | 'edit') => void;
  /** Callback لـ "Save & Add Another" — نمسح الفورم بعد الحفظ. */
  onSavedAndAddAnother?: () => void;
}

interface FormState {
  brand: string;
  model: string;
  year: string;
  trim: string;
  paint_condition: string;
  mileage_km: string;
  maintenance: string;
  price_egp: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  brand: '',
  model: '',
  year: '',
  trim: '',
  paint_condition: '',
  mileage_km: '',
  maintenance: '',
  price_egp: '',
  notes: '',
};

function formFromEntry(entry: MarketEntry | null | undefined): FormState {
  if (!entry) return EMPTY_FORM;
  return {
    brand: entry.brand,
    model: entry.model,
    year: String(entry.year),
    trim: entry.trim,
    paint_condition: entry.paint_condition,
    mileage_km: String(entry.mileage_km),
    maintenance: entry.maintenance,
    price_egp: String(entry.price_egp),
    notes: entry.notes || '',
  };
}

export function MarketEntryForm({
  initial,
  onSaved,
  onSavedAndAddAnother,
}: MarketEntryFormProps) {
  const { user, userData } = useAuth();
  const { showToast } = useToast();
  const mode: 'create' | 'edit' = initial?.id ? 'edit' : 'create';
  const [form, setForm] = useState<FormState>(() => formFromEntry(initial));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setForm(formFromEntry(initial));
  }, [initial]);

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
    if (!form.paint_condition.trim()) next.paint_condition = 'حالة الطلاء مطلوبة';
    const mileageNum = Number(form.mileage_km);
    if (form.mileage_km === '' || !Number.isFinite(mileageNum) || mileageNum < 0) {
      next.mileage_km = 'عداد الكيلومتر يجب أن يكون رقم موجب';
    }
    if (!form.maintenance.trim()) next.maintenance = 'نوع الصيانات مطلوب';
    const priceNum = Number(form.price_egp);
    if (form.price_egp === '' || !Number.isFinite(priceNum) || priceNum <= 0) {
      next.price_egp = 'السعر مطلوب ويجب أن يكون أكبر من صفر';
    }
    if (form.notes && form.notes.length > 500) next.notes = 'الملاحظات يجب ألا تزيد عن 500 حرف';

    if (Object.keys(next).length > 0) return { ok: false, errors: next };

    const input: MarketEntryInput = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: yearNum,
      trim: form.trim.trim(),
      paint_condition: form.paint_condition.trim(),
      mileage_km: Math.floor(mileageNum),
      maintenance: form.maintenance.trim(),
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
    <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          label="Brand (نوع العربية)"
          value={form.brand}
          onChange={(v) => update('brand', v)}
          error={errors.brand}
          required
          placeholder="مثال: Toyota"
        />
        <TextField
          label="Model (الموديل)"
          value={form.model}
          onChange={(v) => update('model', v)}
          error={errors.model}
          required
          placeholder="مثال: Corolla"
        />
        <NumberField
          label="Year (سنة التصنيع)"
          value={form.year}
          onChange={(v) => update('year', v)}
          error={errors.year}
          required
          min={1980}
          max={CURRENT_YEAR + 1}
          placeholder="2020"
        />
        <TextField
          label="Trim (الفئة)"
          value={form.trim}
          onChange={(v) => update('trim', v)}
          error={errors.trim}
          required
          placeholder="مثال: GLI"
        />
        <TextField
          label="Paint / Condition (حالة الطلاء)"
          value={form.paint_condition}
          onChange={(v) => update('paint_condition', v)}
          error={errors.paint_condition}
          required
          placeholder="فابريكا من جوا ومن برا"
        />
        <NumberField
          label="Mileage (KM) (عداد الكيلومتر)"
          value={form.mileage_km}
          onChange={(v) => update('mileage_km', v)}
          error={errors.mileage_km}
          required
          min={0}
          placeholder="120000"
        />
        <TextField
          label="Maintenance (نوع الصيانات)"
          value={form.maintenance}
          onChange={(v) => update('maintenance', v)}
          error={errors.maintenance}
          required
          placeholder="مثال: توكيل، توكيل + مركزي"
        />
        <NumberField
          label="Price (EGP) (السعر)"
          value={form.price_egp}
          onChange={(v) => update('price_egp', v)}
          error={errors.price_egp}
          required
          min={1}
          placeholder="650000"
        />
      </div>

      <TextAreaField
        label="Notes (ملاحظات — اختياري)"
        value={form.notes}
        onChange={(v) => update('notes', v)}
        error={errors.notes}
        maxLength={500}
        placeholder="أي ملاحظات إضافية..."
      />

      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-2">
        {mode === 'create' && onSavedAndAddAnother && (
          <button
            type="button"
            disabled={submitting}
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent, { stayOnForm: true })}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 text-sm font-semibold disabled:opacity-60 order-2 sm:order-1"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save & Add Another
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold disabled:opacity-60 order-1 sm:order-2"
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
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ms-1">*</span>}
      </label>
      {children}
      {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
    </div>
  );
}

function inputClass(hasError?: boolean): string {
  return `w-full px-3 py-2.5 rounded-lg bg-white border text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    hasError
      ? 'border-red-400 focus:border-red-500'
      : 'border-slate-200 focus:border-blue-500'
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