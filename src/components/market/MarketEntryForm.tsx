'use client';

// الفورم لإضافة / تعديل entry في السجل السعري.
// بيستخدم في /market/new (add) و /market/[id] (edit).
// الفورم بيشتغل offline — لو الـ save فشل، بيتحفظ في الـ IndexedDB
// pending queue (عبر addMarketEntry).
//
// فيه تاب/توغّل في الأعلى: عربية مستعملة (default) | عربية زيرو.
// لو "زيرو" → بنعرض بس Brand/Model/Year/Trim/Price (5 fields بس).
// لو "مستعملة" → بنعرض كل الـ fields الأصلية.

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
  getYearsForBrandModel,
  getPaintForBrandModelYear,
  getMaintenanceForBrandModelYear,
} from '@/lib/carsCatalog';
import { SearchableSelect } from './SearchableSelect';
import { NumberInput } from './NumberInput';

const CURRENT_YEAR = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Standardised select options for trim / paint / maintenance.
// "__other__" هو sentinel — لو اليوزر اختاره بنظهر text input حر.
// ---------------------------------------------------------------------------

const TRIM_OPTIONS = [
  { value: 'فئه اولي', label: 'فئه اولي' },
  { value: 'فئه تانيه', label: 'فئه تانيه' },
  { value: 'فئه ثالثه', label: 'فئه ثالثه' },
  { value: 'فئه رابعه', label: 'فئه رابعه' },
  { value: 'فئه خامسه', label: 'فئه خامسه' },
  { value: 'فئه سادسه', label: 'فئه سادسه' },
  { value: 'فئه سابعه', label: 'فئه سابعه' },
  { value: '__other__', label: 'أخرى (اكتب...)' },
] as const;

/**
 * الـ paint options بتتولّد dynamic من الـ catalog حسب brand/model/year.
 * دايماً بنضم "__other__" في الآخر عشان اليوزر يقدر يكتب قيمة حرة.
 *
 * الـ label "فبريكا" → "فبريكا كامله" (الـ display rename بناءً على طلب
 * اليوزر)، بس الـ value بيفضل "فبريكا" عشان:
 *   - الـ entries القديمة اللي مخزّنة بـ "فبريكا" تفضل valid ومتوافقة مع
 *     STANDARD_PAINT_VALUES (formFromEntry بتتعرف عليها كـ standard).
 *   - الـ entries الجديدة اللي اليوزر يضيفها من الـ dropdown بتتخزن بنفس
 *     القيمة "فبريكا" = الاتساق في الـ DB.
 */
function buildPaintOptions(
  brand: string,
  model: string,
  year: string
): readonly { value: string; label: string }[] {
  const fromCatalog = getPaintForBrandModelYear(
    brand,
    model,
    year ? Number(year) : CURRENT_YEAR
  );
  return [
    ...fromCatalog.map((v) => ({
      value: v,
      label: v === 'فبريكا' ? 'فبريكا كامله' : v,
    })),
    { value: '__other__', label: 'أخرى (اكتب...)' },
  ];
}

/**
 * الـ maintenance options static (الـ catalog ما فيهاش maintenance data حالياً).
 */
function buildMaintenanceOptions(
  brand: string,
  model: string,
  year: string
): readonly { value: string; label: string }[] {
  const fromCatalog = getMaintenanceForBrandModelYear(
    brand,
    model,
    year ? Number(year) : CURRENT_YEAR
  );
  return [
    ...fromCatalog.map((v) => ({ value: v, label: v })),
    { value: '__other__', label: 'أخرى (اكتب...)' },
  ];
}

/**
 * مجموعة الـ paint values الـ standard (مش "__other__") — مستخدمة في الـ
 * formFromEntry عشان نعرف لو القيمة اللي راجعة من الـ DB تعتبر standard
 * (فنعرضها في الـ select) أو حرة (فنعرضها في "__other__" + text input).
 */
const STANDARD_PAINT_VALUES = new Set<string>(['فبريكا']);
const STANDARD_MAINTENANCE_VALUES = new Set<string>([
  'في التوكيل',
  'بره التوكيل',
  'مختلط',
]);

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
  /** يخزّن إما القيمة القياسية (فئه أولى...) أو '__other__' لو اليوزر اختار أخرى. */
  trim: string;
  /** لو trim === '__other__' بنخزّن النص الحر هنا. */
  trim_other: string;
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
  /** true لو العربية زيرو (factory fresh). بنتحكم فيه عبر الـ tab في الأعلى. */
  is_zero: boolean;
}

const EMPTY_FORM: FormState = {
  brand: '',
  model: '',
  year: '',
  trim: '',
  trim_other: '',
  paint_condition: '',
  paint_other: '',
  mileage_km: '',
  maintenance: '',
  maintenance_other: '',
  price_egp: '',
  notes: '',
  is_zero: false,
};

const STANDARD_TRIM_VALUES = new Set<string>([
  'فئه اولي',
  'فئه تانيه',
  'فئه ثالثه',
  'فئه رابعه',
  'فئه خامسه',
  'فئه سادسه',
  'فئه سابعه',
]);

function formFromEntry(entry: MarketEntry | null | undefined): FormState {
  if (!entry) return EMPTY_FORM;
  const paintIsStandard = STANDARD_PAINT_VALUES.has(entry.paint_condition);
  const maintenanceIsStandard = STANDARD_MAINTENANCE_VALUES.has(entry.maintenance);
  const trimIsStandard = STANDARD_TRIM_VALUES.has(entry.trim);
  return {
    brand: entry.brand,
    model: entry.model,
    year: String(entry.year),
    trim: trimIsStandard ? entry.trim : '__other__',
    trim_other: trimIsStandard ? '' : entry.trim,
    paint_condition: paintIsStandard ? entry.paint_condition : '__other__',
    paint_other: paintIsStandard ? '' : entry.paint_condition,
    mileage_km: String(entry.mileage_km),
    maintenance: maintenanceIsStandard ? entry.maintenance : '__other__',
    maintenance_other: maintenanceIsStandard ? '' : entry.maintenance,
    price_egp: String(entry.price_egp),
    notes: entry.notes || '',
    is_zero: entry.is_zero === true,
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
  // الـ brands بندمج فيها الـ static catalog (من carsCatalog.ts) + الـ DB entries.
  // الـ models بندمج فيها الـ static models للـ brand المختار + كل الـ DB models.
  // الـ dedup بيشتغل case-sensitive — الكنسيكال من الـ catalog بيحافظ على الـ English form.

  // Brand dropdown options — static catalog + DB suggestions.
  // الـ SearchableSelect بيعرض الـ controlled `value` حتى لو مش في الـ options،
  // فمش محتاجين نضيف safety للـ current value هنا.
  const brandOptions = useMemo(() => {
    const set = new Set<string>(getAllBrandNames());
    if (suggestions?.brands) suggestions.brands.forEach((b) => set.add(b));
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }, [suggestions?.brands]);

  // Model dropdown options — catalog models للـ brand المختار فقط.
  // الـ DB-derived models موجودة أصلاً في الـ catalog (carsCatalog.generated.json)
  // مفلترة بالـ brand، فمش محتاجين نضيف suggestions.models (اللي هو flat list
  // لكل الـ models من كل الـ brands) — كان ده سبب الـ bug: لما اليوزر يختار
  // Abarth، الـ dropdown بيبين Mercedes/Changan/Hyundai/BMW models.
  //
  // الـ free-text fallback لسه شغّال: لو اليوزر عايز يدخل model مش في الـ
  // catalog (مثلاً موديل custom)، يقدر يكتبه في الـ input مباشرة — الـ
  // SearchableSelect.onChange بيمرر أي قيمة للـ parent حتى لو مش في الـ options.
  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    if (form.brand) {
      getModelsForBrand(form.brand).forEach((m) => set.add(m));
    }
    return Array.from(set).map((name) => ({ value: name, label: name }));
  }, [form.brand]);

  // Year datalist suggestions — الـ catalog للـ brand/model المختار، أو آخر 30 سنة كـ fallback.
  const yearSuggestions = useMemo(() => {
    const fromCatalog = getYearsForBrandModel(form.brand, form.model);
    if (fromCatalog.length > 0) return fromCatalog.map(String).sort((a, b) => Number(b) - Number(a));
    return (suggestions?.years ?? Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i)).map(String);
  }, [form.brand, form.model, suggestions?.years]);

  // Paint dropdown options — dynamic من الـ catalog حسب brand/model/year.
  const paintOptions = useMemo(
    () => buildPaintOptions(form.brand, form.model, form.year),
    [form.brand, form.model, form.year]
  );

  // Maintenance dropdown options — الـ catalog data + الـ standard fallback.
  const maintenanceOptions = useMemo(
    () => buildMaintenanceOptions(form.brand, form.model, form.year),
    [form.brand, form.model, form.year]
  );

  useEffect(() => {
    setForm(formFromEntry(initial));
  }, [initial]);

  // Cascade clearing: لما brand يتغيّر، لو الـ model مش valid للـ brand الجديد بنمسحه.
  // + لو الـ brand نفسه بقى فاضي بنمسح كل الـ dependents.
  useEffect(() => {
    if (!form.brand) {
      // brand فاضي → مسح كل الـ dependents
      setForm((prev) =>
        prev.model === '' &&
        prev.year === '' &&
        prev.paint_condition === '' &&
        prev.maintenance === ''
          ? prev
          : {
              ...prev,
              model: '',
              year: '',
              paint_condition: '',
              paint_other: '',
              maintenance: '',
              maintenance_other: '',
            }
      );
      return;
    }
    if (!form.model) return;
    const modelsForBrand = getModelsForBrand(form.brand);
    if (modelsForBrand.length > 0 && !modelsForBrand.includes(form.model)) {
      update('model', '');
    }
    // الـ effect مقصود يتشغل بس لما الـ brand يتغيّر — باقي الـ deps هي قيم read-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.brand]);

  // Model changed → لو الـ year مش valid للـ brand/model الجديد بنمسحه.
  useEffect(() => {
    if (!form.brand || !form.model || !form.year) return;
    const validYears = getYearsForBrandModel(form.brand, form.model);
    if (validYears.length > 0 && !validYears.includes(Number(form.year))) {
      update('year', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.model]);

  // Year changed → لو الـ paint_condition الحالي مش في الـ options الجديدة بنمسحه.
  useEffect(() => {
    if (!form.year) return;
    if (!form.paint_condition) return;
    // "__other__" و "فبريكا" دايماً valid (هما الـ sentinels).
    if (form.paint_condition === '__other__' || form.paint_condition === 'فبريكا') return;
    const validPaints = getPaintForBrandModelYear(
      form.brand,
      form.model,
      Number(form.year)
    );
    if (validPaints.length > 0 && !validPaints.includes(form.paint_condition)) {
      update('paint_condition', '');
      update('paint_other', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.year]);

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
    // trim — validate based on which mode is active (select vs free-text).
    if (form.is_zero) {
      // Zero entries: 5 fields only. trim مطلوب (إما من الـ select أو نص حر).
      if (!form.trim) {
        next.trim = 'الفئة مطلوبة';
      } else if (form.trim === '__other__' && !form.trim_other.trim()) {
        next.trim_other = 'اكتب الفئة';
      }
    } else {
      if (!form.trim) {
        next.trim = 'الفئة مطلوبة';
      } else if (form.trim === '__other__' && !form.trim_other.trim()) {
        next.trim_other = 'اكتب الفئة';
      }
    }
    // mileage, paint, maintenance — مطلوبين بس في الـ used mode.
    if (!form.is_zero) {
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
    }
    const priceNum = Number(form.price_egp);
    if (form.price_egp === '' || !Number.isFinite(priceNum) || priceNum <= 0) {
      next.price_egp = 'السعر مطلوب ويجب أن يكون أكبر من صفر';
    }
    if (form.notes && form.notes.length > 500) next.notes = 'الملاحظات يجب ألا تزيد عن 500 حرف';

    if (Object.keys(next).length > 0) return { ok: false, errors: next };

    // resolve "__other__" → final string
    const trimFinal =
      form.trim === '__other__' ? form.trim_other.trim() : form.trim.trim();
    const paintFinal =
      form.paint_condition === '__other__' ? form.paint_other.trim() : form.paint_condition;
    const maintenanceFinal =
      form.maintenance === '__other__' ? form.maintenance_other.trim() : form.maintenance;
    // mileage — للـ used mode بنستخدم الرقم اللي اليوزر كتبه (validated above)؛
    // للـ zero mode بنحط 0 تلقائياً.
    const mileageFinal = form.is_zero ? 0 : Math.floor(Number(form.mileage_km));

    const input: MarketEntryInput = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: yearNum,
      trim: trimFinal,
      paint_condition: form.is_zero ? '' : paintFinal,
      mileage_km: mileageFinal,
      maintenance: form.is_zero ? '' : maintenanceFinal,
      price_egp: Math.floor(priceNum),
      notes: form.notes.trim() || undefined,
      is_zero: form.is_zero,
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
            recorded_by_uid: initial.recorded_by_uid || user.uid,
            recorded_by_name:
              initial.recorded_by_name || userData?.username || user.email || null,
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

      if (opts.stayOnForm) {
        onSavedAndAddAnother?.();
        setForm(EMPTY_FORM);
        setErrors({});
      } else {
        onSaved?.(result, 'create');
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
    <form
      onSubmit={(e) => handleSubmit(e, mode === 'create' ? { stayOnForm: true } : {})}
      className="space-y-6"
    >
      {/* ===== Car Type Toggle (مستعملة / زيرو) ===== */}
      <div
        role="tablist"
        aria-label="نوع العربية"
        className="inline-flex w-full sm:w-auto items-center gap-1 p-1 rounded-2xl bg-bg-card border border-border-soft"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!form.is_zero}
          aria-controls="car-data-section"
          onClick={() => {
            if (form.is_zero) {
              setForm((prev) => ({ ...prev, is_zero: false }));
            }
          }}
          // Touch target ≥ 44px (min-h-[44px])
          className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
            !form.is_zero
              ? 'bg-accent-yellow text-text-primary'
              : 'text-text-secondary hover:bg-bg-card-hover'
          }`}
        >
          عربية مستعملة
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={form.is_zero}
          aria-controls="car-data-section"
          onClick={() => {
            if (!form.is_zero) {
              setForm((prev) => ({ ...prev, is_zero: true }));
            }
          }}
          className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
            form.is_zero
              ? 'bg-accent-yellow text-text-primary'
              : 'text-text-secondary hover:bg-bg-card-hover'
          }`}
        >
          عربية زيرو
        </button>
      </div>

      {/* ===== SECTION: Car Data (بيانات العربيه) ===== */}
      <section
        id="car-data-section"
        className="bg-bg-card border border-border-soft rounded-2xl p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-accent-yellow" />
          <h2 className="text-base font-bold text-text-primary">
            {form.is_zero ? 'بيانات العربية (زيرو)' : 'بيانات العربيه'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Brand — searchable combobox (static catalog + DB suggestions). */}
          <SearchableSelect
            label="Brand (نوع العربية)"
            value={form.brand}
            onChange={(v) => update('brand', v)}
            error={errors.brand}
            required
            options={brandOptions}
            placeholder="اكتب أو ابحث عن الماركة..."
          />

          {/* Model — searchable combobox scoped to selected brand's models. */}
          {/* بنعطّله لحد ما اليوزر يختار brand عشان الـ UX يبقى واضح. */}
          <SearchableSelect
            label="Model (الموديل)"
            value={form.model}
            onChange={(v) => update('model', v)}
            error={errors.model}
            required
            options={modelOptions}
            placeholder={form.brand ? 'اكتب أو ابحث عن الموديل...' : 'اختر الماركة أولاً'}
            disabled={!form.brand}
            hint={!form.brand ? 'اختر الماركة أولاً' : undefined}
          />

          {/* Year — datalist, scoped to catalog years for brand/model (fallback: last 30). */}
          <DatalistField
            label="Year (سنة التصنيع)"
            value={form.year}
            onChange={(v) => update('year', v)}
            error={errors.year}
            required
            inputType="number"
            suggestions={yearSuggestions}
            placeholder="2020"
          />

          {/* Trim — select dropdown (7 grades + "أخرى"). */}
          <div>
            <SelectField
              label="Trim (الفئة)"
              value={form.trim}
              onChange={(v) => update('trim', v)}
              error={errors.trim}
              required
              options={TRIM_OPTIONS}
              placeholder="اختر الدرجة..."
            />
            {/* Conditional trim_other text input — يظهر لما اليوزر يختار "أخرى" */}
            {form.trim === '__other__' && (
              <div className="mt-2">
                <TextField
                  label="الفئة - نص حر"
                  value={form.trim_other}
                  onChange={(v) => update('trim_other', v)}
                  error={errors.trim_other}
                  required
                  placeholder="مثال: Sport Line"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== SECTION: Used Car Extras (used only) ===== */}
      {/* الـ used-only fields: paint, mileage, maintenance. الـ zero entries
          بتخزّن mileage=0 و paint_condition='' و maintenance='' تلقائياً. */}
      {!form.is_zero && (
        <section className="bg-bg-card border border-border-soft rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-accent-yellow" />
            <h2 className="text-base font-bold text-text-primary">تفاصيل الاستعمال</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Paint — dynamic dropdown scoped to brand/model/year from catalog. */}
            <SelectField
              label="Paint / Condition (حالة الطلاء)"
              value={form.paint_condition}
              onChange={(v) => update('paint_condition', v)}
              error={errors.paint_condition}
              required
              options={paintOptions}
              placeholder="اختر..."
              disabled={!form.brand || !form.model}
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

            {/* Mileage — NumberInput with live thousand separators. */}
            <NumberInput
              label="Mileage (KM) (عداد الكيلومتر)"
              value={form.mileage_km ? Number(form.mileage_km) : undefined}
              onChange={(n) => update('mileage_km', n !== undefined ? String(n) : '')}
              error={errors.mileage_km}
              required
              min={0}
              placeholder="120,000"
            />

            {/* Maintenance — select dropdown (catalog-aware, falls back to standard 3 options). */}
            <SelectField
              label="Maintenance (نوع الصيانات)"
              value={form.maintenance}
              onChange={(v) => update('maintenance', v)}
              error={errors.maintenance}
              required
              options={maintenanceOptions}
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
      )}

      {/* ===== SECTION: Price & Notes (السعر والملاحظات) ===== */}
      <section className="bg-bg-card border border-border-soft rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-accent-yellow" />
          <h2 className="text-base font-bold text-text-primary">السعر والملاحظات</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberInput
            label="Price (EGP) (السعر)"
            value={form.price_egp ? Number(form.price_egp) : undefined}
            onChange={(n) => update('price_egp', n !== undefined ? String(n) : '')}
            error={errors.price_egp}
            required
            min={1}
            placeholder="650,000"
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
        {mode === 'create' ? (
          <button
            type="button"
            disabled={submitting}
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent, { stayOnForm: true })}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-sm font-bold disabled:opacity-60 w-full sm:w-auto"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save & Add Another
          </button>
        ) : (
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-sm font-bold disabled:opacity-60 w-full sm:w-auto"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        )}
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