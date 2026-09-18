'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, Upload, Loader2, Star, XCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { Car, CarCondition, CarStatus, Priority, NewCarInput } from '@/lib/types';
import { MAX_CAR_IMAGES, MAX_IMAGE_SIZE, CarImageSlot } from '@/lib/storage';
import { MAX_DESCRIPTION_WORDS, PRIORITY_LABELS, PRIORITY_ORDER, countWords } from '@/lib/priority';
import { UserAssignmentSelector } from './UserAssignmentSelector';
import { useToast } from '@/hooks/useToast';
import { formatPriceInput, parsePriceInput } from '@/lib/format';
import { STATUS_OPTIONS, getStatusMeta } from '@/lib/carStatus';

interface CarFormProps {
  /** عربية موجودة (للـ edit) */
  initial?: Car;
  /**
   * دالة الحفظ
   * - data: بيانات العربية (image_url = الرئيسية، additional_images = الإضافية من الـ existing فقط)
   * - keptExistingImages: URLs الصور القديمة اللي المستخدم قرر يحتفظ بيها (مرتبة)
   * - newFiles: ملفات جديدة يحتاج الـ parent يرفعها لـ Storage
   * - removedExistingImages: URLs الصور القديمة اللي المستخدم شالها (الـ parent يحذفها)
   */
  onSave: (
    data: NewCarInput,
    imageSlots: CarImageSlot[],
    removedExistingImages: string[]
  ) => Promise<void>;
  /** عنوان الـ form */
  title: string;
  /** نص زر الحفظ */
  submitLabel?: string;
}

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = PRIORITY_ORDER.map((value) => ({
  value,
  label: PRIORITY_LABELS[value],
}));

// ✅ FIX: خيارات الحالة مقتصرة على خيارين فقط (مستعملة / كسر زيرو)
// الأنواع الأخرى باقية في الـ CarCondition type في types.ts للتوافق مع البيانات القديمة
const CONDITION_OPTIONS: Array<{ value: CarCondition; label: string }> = [
  { value: 'used', label: 'مستعملة' },
  { value: 'zero_km', label: 'كسر زيرو' },
];

/**
 * نموذج إضافة / تعديل عربية
 * - يدعم رفع حتى 30 صورة (رئيسية + إضافية)
 * - validation: client-side لكل الحقول
 * - يستخدم UserAssignmentSelector للـ assigned_to
 *
 * الصور:
 * - existingImages: URLs الصور القديمة من initial (مرتبة: الرئيسية ثم الإضافية)
 * - newFiles: ملفات جديدة من الـ user (تُرفع عند الحفظ)
 * - removedExisting: URLs الصور القديمة اللي المستخدم شالها (تُحذف من Storage عند الحفظ)
 *
 * عند الحفظ:
 * - الـ parent يحصل على مصفوفة images النهائية (existingImages المُحتفظ بها + uploaded URLs الجديدة)
 * - الصور القديمة المحذوفة تُنظف من Storage
 */
export function CarForm({ initial, onSave, title, submitLabel = 'حفظ' }: CarFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [code, setCode] = useState(initial?.code || '');
  const [carTitle, setCarTitle] = useState(initial?.title || '');
  const [price, setPrice] = useState<string>(
    initial?.price ? formatPriceInput(initial.price.toString()) : ''
  );
  const [description, setDescription] = useState(initial?.description || '');
  const [priority, setPriority] = useState<Priority>(initial?.priority || 'medium');
  const [condition, setCondition] = useState<CarCondition>(initial?.condition || 'used');
  const [status, setStatus] = useState<CarStatus>(initial?.status || 'active');
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured || false);
  // ✅ FIX: defensive — نتأكد أن assigned_to array (ممكن يكون string قديم في legacy data)
  const [assignedTo, setAssignedTo] = useState<string[]>(
    Array.isArray(initial?.assigned_to)
      ? initial.assigned_to
      : typeof initial?.assigned_to === 'string'
      ? [initial.assigned_to]
      : ['all']
  );

  type FormImageSlot =
    | { id: string; kind: 'existing'; url: string }
    | { id: string; kind: 'new'; file: File; url: string };

  const initialExisting: string[] = (() => {
    if (!initial) return [];
    const main = typeof initial.image_url === 'string' && initial.image_url ? [initial.image_url] : [];
    const additional = Array.isArray(initial.additional_images) ? initial.additional_images : [];
    return [...main, ...additional];
  })();

  const [slots, setSlots] = useState<FormImageSlot[]>(() =>
    initialExisting.map((url, i) => ({ id: `existing-${i}`, kind: 'existing', url }))
  );

  useEffect(() => {
    return () => {
      slots.forEach((s) => {
        if (s.kind === 'new') {
          try {
            URL.revokeObjectURL(s.url);
          } catch {
            /* ignore */
          }
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalImageCount = slots.length;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNewFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.size > MAX_IMAGE_SIZE) {
        setError(`الصورة ${i + 1} أكبر من 5 ميجابايت`);
        return;
      }
      if (!f.type.startsWith('image/')) {
        setError(`الملف ${i + 1} ليس صورة`);
        return;
      }
    }

    const newTotal = slots.length + files.length;
    if (newTotal > MAX_CAR_IMAGES) {
      setError(
        `الحد الأقصى ${MAX_CAR_IMAGES} صورة. ممكن تضيف ${MAX_CAR_IMAGES - slots.length} فقط.`
      );
      return;
    }

    setError(null);
    const added: FormImageSlot[] = files.map((file, i) => ({
      id: `new-${Date.now()}-${i}`,
      kind: 'new',
      file,
      url: URL.createObjectURL(file),
    }));
    setSlots((prev) => [...prev, ...added]);
    e.target.value = '';
  };

  const removeSlot = (idx: number) => {
    setSlots((prev) => {
      const target = prev[idx];
      if (target?.kind === 'new') {
        try {
          URL.revokeObjectURL(target.url);
        } catch {
          /* ignore */
        }
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const moveSlot = (idx: number, direction: 'up' | 'down') => {
    setSlots((prev) => {
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const validate = (): string | null => {
    if (!code.trim()) return 'كود العربية مطلوب';
    if (!carTitle.trim()) return 'عنوان العربية مطلوب';
    if (carTitle.length > 100) return 'العنوان يجب ألا يزيد عن 100 حرف';
    if (!price || parsePriceInput(price) < 0) return 'السعر يجب أن يكون رقم صحيح';
    if (countWords(description) > MAX_DESCRIPTION_WORDS) return `الوصف يجب ألا يزيد عن ${MAX_DESCRIPTION_WORDS} كلمة`;
    if (assignedTo.length === 0) return 'اختر "الكل" أو مستخدماً واحداً على الأقل';
    if (totalImageCount === 0) return 'يجب إضافة صورة واحدة على الأقل';
    if (totalImageCount > MAX_CAR_IMAGES) return `الحد الأقصى ${MAX_CAR_IMAGES} صورة`;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    try {
      const keptExisting = slots.filter((s) => s.kind === 'existing').map((s) => s.url);
      const removedExistingImages = initialExisting.filter((url) => !keptExisting.includes(url));
      const imageSlots: CarImageSlot[] = slots.map((s) =>
        s.kind === 'existing' ? { kind: 'existing', url: s.url } : { kind: 'new', file: s.file }
      );
      const firstExisting = slots.find((s) => s.kind === 'existing');

      const data: NewCarInput = {
        code: code.trim(),
        title: carTitle.trim(),
        price: parsePriceInput(price),
        description: description.trim(),
        priority,
        status,
        image_url: firstExisting?.url || '',
        additional_images: keptExisting.slice(firstExisting ? 1 : 0),
        condition,
        is_featured: isFeatured,
        assigned_to: assignedTo,
      };
      await onSave(data, imageSlots, removedExistingImages);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الحفظ');
      showToast(err.message || 'فشل الحفظ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-admin-text">{title}</h1>
      </div>

      {/* Image Upload — متعدد */}
      <div className="bg-admin-card border border-admin-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-bold text-admin-text-muted">
            صور العربية ({totalImageCount}/{MAX_CAR_IMAGES})
          </label>
          {totalImageCount > 0 && (
            <span className="text-xs text-admin-text-muted">
              الصورة الأولى = الرئيسية
            </span>
          )}
        </div>

        {/* شبكة الصور */}
        {slots.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 mb-3">
            {slots.map((slot, idx) => {
              const isMain = idx === 0;
              const isNewFile = slot.kind === 'new';
              return (
                <div
                  key={slot.id}
                  className={`relative aspect-square bg-admin-bg rounded-xl overflow-hidden striped-bg group border-2 ${
                    isMain ? 'border-admin-accent' : 'border-admin-border'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slot.url}
                    alt={`صورة ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {isMain && (
                    <div className="absolute top-1 right-1">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-admin-accent text-admin-bg text-[10px] font-bold">
                        رئيسية
                      </span>
                    </div>
                  )}
                  {isNewFile && !isMain && (
                    <div className="absolute top-1 right-1">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                        جديدة
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => moveSlot(idx, 'up')}
                        className="w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-admin-bg"
                        aria-label="رفع"
                      >
                        <ArrowUp size={12} />
                      </button>
                    )}
                    {idx < slots.length - 1 && (
                      <button
                        type="button"
                        onClick={() => moveSlot(idx, 'down')}
                        className="w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-admin-bg"
                        aria-label="إنزال"
                      >
                        <ArrowDown size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeSlot(idx)}
                      className="w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white"
                      aria-label="حذف"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSlot(idx)}
                    className="sm:hidden absolute top-1 left-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white"
                    aria-label="حذف"
                  >
                    <XCircle size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* زر رفع المزيد */}
        {totalImageCount < MAX_CAR_IMAGES && (
          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleNewFilesChange}
              className="hidden"
              id="car-images-input"
            />
            <label
              htmlFor="car-images-input"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-admin-text hover:border-admin-accent/50 cursor-pointer text-sm font-medium transition-colors w-full sm:w-auto"
            >
              <Upload size={16} />
              {totalImageCount === 0 ? 'اختر صور' : `إضافة صور (${MAX_CAR_IMAGES - totalImageCount} متبقي)`}
            </label>
            <p className="text-xs text-admin-text-muted">
              JPG / PNG · حد أقصى 5 ميجابايت لكل صورة · حد أقصى {MAX_CAR_IMAGES} صورة إجمالاً
            </p>
          </div>
        )}

        {totalImageCount === MAX_CAR_IMAGES && (
          <p className="text-xs text-amber-400 mt-2">وصلت للحد الأقصى ({MAX_CAR_IMAGES} صورة)</p>
        )}
      </div>

      {/* Code + Title */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="code" className="block text-sm font-bold text-admin-text-muted mb-1">
            كود العربية <span className="text-red-400">*</span>
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="C-2024-001"
            className="w-full px-3 py-2.5 rounded-xl bg-admin-card border border-admin-border text-admin-text placeholder:text-admin-text-muted focus:border-admin-accent/50"
            required
          />
        </div>
        <div>
          <label htmlFor="title" className="block text-sm font-bold text-admin-text-muted mb-1">
            العنوان <span className="text-red-400">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={carTitle}
            onChange={(e) => setCarTitle(e.target.value)}
            placeholder="مثل: هيونداي توسان 2022"
            maxLength={100}
            className="w-full px-3 py-2.5 rounded-xl bg-admin-card border border-admin-border text-admin-text placeholder:text-admin-text-muted focus:border-admin-accent/50"
            required
          />
        </div>
      </div>

      {/* Price */}
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label htmlFor="price" className="block text-sm font-bold text-admin-text-muted mb-1">
            السعر (ج.م) <span className="text-red-400">*</span>
          </label>
          <input
            id="price"
            type="text"
            inputMode="numeric"
            value={price}
            onChange={(e) => {
              setPrice(formatPriceInput(e.target.value));
            }}
            placeholder="1,980,000"
            dir="ltr"
            className="w-full px-3 py-2.5 rounded-xl bg-admin-card border border-admin-border text-admin-text placeholder:text-admin-text-muted focus:border-admin-accent/50 text-left price-display"
            required
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-bold text-admin-text-muted mb-1">
          الوصف
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="وصف العربية..."
          rows={8}
          className="w-full px-3 py-2.5 rounded-xl bg-admin-card border border-admin-border text-admin-text placeholder:text-admin-text-muted focus:border-admin-accent/50 resize-y min-h-[120px]"
        />
        <div className={`text-xs mt-1 text-left ${countWords(description) > MAX_DESCRIPTION_WORDS ? 'text-red-400' : 'text-admin-text-muted'}`}>
          {countWords(description)} / {MAX_DESCRIPTION_WORDS} كلمة
        </div>
      </div>

      {/* Priority + Condition */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="priority" className="block text-sm font-bold text-admin-text-muted mb-1">
            الأولوية
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full px-3 py-2.5 rounded-xl bg-admin-card border border-admin-border text-admin-text focus:border-admin-accent/50"
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="condition" className="block text-sm font-bold text-admin-text-muted mb-1">
            الحالة (الجودة)
          </label>
          <select
            id="condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value as CarCondition)}
            className="w-full px-3 py-2.5 rounded-xl bg-admin-card border border-admin-border text-admin-text focus:border-admin-accent/50"
          >
            {CONDITION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-admin-card border border-admin-border rounded-2xl p-4">
        <label className="block text-sm font-bold text-admin-text-muted mb-2">
          الحالة (التوفر)
        </label>
        <div className="flex flex-wrap gap-2">
          {(status === 'inactive'
            ? [{ value: 'inactive' as CarStatus, label: getStatusMeta('inactive').label }, ...STATUS_OPTIONS]
            : STATUS_OPTIONS
          ).map((o) => {
            const selected = status === o.value;
            const selectedClass =
              o.value === 'active'
                ? 'bg-green-600 text-white border-green-700'
                : o.value === 'reserved'
                ? 'bg-orange-500 text-white border-orange-600'
                : o.value === 'sold'
                ? 'bg-red-600 text-white border-red-700'
                : 'bg-slate-500 text-white border-slate-600';
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setStatus(o.value)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                  selected
                    ? selectedClass
                    : 'bg-admin-bg border-admin-border text-admin-text-muted hover:text-admin-text'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured */}
      <label className="flex items-center gap-3 bg-admin-card border border-admin-border rounded-xl p-3 cursor-pointer hover:border-admin-accent/30 transition-colors">
        <input
          type="checkbox"
          checked={isFeatured}
          onChange={(e) => setIsFeatured(e.target.checked)}
          className="w-5 h-5 rounded border-admin-border text-admin-accent focus:ring-admin-accent cursor-pointer"
        />
        <Star size={18} className={isFeatured ? 'text-admin-accent' : 'text-admin-text-muted'} fill={isFeatured ? 'currentColor' : 'none'} />
        <div className="flex-1">
          <div className="text-sm font-bold text-admin-text">عربية مميزة</div>
          <div className="text-xs text-admin-text-muted">تعرض شارة "مميز" على البطاقة</div>
        </div>
      </label>

      {/* Assignment */}
      <div className="bg-admin-card border border-admin-border rounded-2xl p-4">
        <label className="block text-sm font-bold text-admin-text-muted mb-3">
          تعيين العربية إلى
        </label>
        <UserAssignmentSelector value={assignedTo} onChange={setAssignedTo} />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-admin-accent hover:bg-yellow-400 text-admin-bg font-bold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Save size={18} />
              {submitLabel}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={submitting}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-admin-card border border-admin-border text-admin-text hover:bg-admin-bg font-medium text-sm transition-colors disabled:opacity-60"
        >
          <X size={18} />
          إلغاء
        </button>
      </div>
    </form>
  );
}
