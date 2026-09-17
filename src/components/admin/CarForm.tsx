'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, Upload, Loader2, Star, XCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { Car, CarCondition, CarStatus, Priority, SortMode, NewCarInput } from '@/lib/types';
import { MAX_CAR_IMAGES, MAX_IMAGE_SIZE } from '@/lib/storage';
import { UserAssignmentSelector } from './UserAssignmentSelector';
import { useToast } from '@/hooks/useToast';
import { formatPriceInput, parsePriceInput } from '@/lib/format';

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
    keptExistingImages: string[],
    newFiles: File[],
    removedExistingImages: string[]
  ) => Promise<void>;
  /** عنوان الـ form */
  title: string;
  /** نص زر الحفظ */
  submitLabel?: string;
}

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string }> = [
  { value: 'top', label: 'قصوى' },
  { value: 'high', label: 'عالية' },
  { value: 'medium', label: 'متوسطة' },
  { value: 'low', label: 'منخفضة' },
];

const CONDITION_OPTIONS: Array<{ value: CarCondition; label: string }> = [
  { value: 'new', label: 'جديدة' },
  { value: 'used', label: 'مستعملة' },
  { value: 'excellent', label: 'ممتازة' },
  { value: 'good', label: 'جيدة' },
  { value: 'zero_km', label: 'كسر زيرو' },
];

const STATUS_OPTIONS: Array<{ value: CarStatus; label: string }> = [
  { value: 'active', label: 'متاحة' },
  { value: 'inactive', label: 'غير معروضة' },
  { value: 'reserved', label: 'محجوزة' },
  { value: 'sold', label: 'مباعة' },
];

const SORT_MODE_OPTIONS: Array<{ value: SortMode; label: string; hint: string }> = [
  { value: 'priority', label: 'أولي (حسب الأولوية)', hint: 'تظهر في قسم الأولوية الخاص بيها' },
  { value: 'normal', label: 'عادي (حسب الترتيب اليدوي)', hint: 'تظهر في قسم "عادي" مرتبة حسب ترتيب العرض' },
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
  const [sortMode, setSortMode] = useState<SortMode>(initial?.sort_mode || 'priority');
  const [condition, setCondition] = useState<CarCondition>(initial?.condition || 'used');
  const [status, setStatus] = useState<CarStatus>(initial?.status || 'active');
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured || false);
  const [assignedTo, setAssignedTo] = useState<string[]>(initial?.assigned_to || ['all']);
  const [displayOrder, setDisplayOrder] = useState<string>(initial?.display_order?.toString() || '0');

  // ----- إدارة الصور -----
  // existingImages بالترتيب: الرئيسية أولاً ثم الإضافية
  const initialExisting: string[] = (() => {
    if (!initial) return [];
    const main = initial.image_url ? [initial.image_url] : [];
    return [...main, ...(initial.additional_images || [])];
  })();
  const [existingImages, setExistingImages] = useState<string[]>(initialExisting);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newFileUrls, setNewFileUrls] = useState<string[]>([]);

  // إنشاء/تنظيف blob URLs للملفات الجديدة
  useEffect(() => {
    const urls = newFiles.map((f) => URL.createObjectURL(f));
    setNewFileUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [newFiles]);

  // previews = existing + new blob URLs
  const newFilePreviews = useMemo(
    () => [...existingImages, ...newFileUrls],
    [existingImages, newFileUrls]
  );

  const totalImageCount = existingImages.length + newFiles.length;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNewFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // validation لكل ملف
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

    // validation للعدد الإجمالي
    const newTotal = existingImages.length + newFiles.length + files.length;
    if (newTotal > MAX_CAR_IMAGES) {
      setError(
        `الحد الأقصى ${MAX_CAR_IMAGES} صورة. ممكن تضيف ${MAX_CAR_IMAGES - existingImages.length - newFiles.length} فقط.`
      );
      return;
    }

    setError(null);
    setNewFiles([...newFiles, ...files]);
    // reset الـ input عشان يقدر يختار نفس الملف تاني
    e.target.value = '';
  };

  const removeExistingImage = (idx: number) => {
    setExistingImages(existingImages.filter((_, i) => i !== idx));
  };

  const removeNewFile = (idx: number) => {
    setNewFiles(newFiles.filter((_, i) => i !== idx));
  };

  const moveExistingImage = (idx: number, direction: 'up' | 'down') => {
    const next = [...existingImages];
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setExistingImages(next);
  };

  const moveNewFile = (idx: number, direction: 'up' | 'down') => {
    const next = [...newFiles];
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setNewFiles(next);
  };

  const validate = (): string | null => {
    if (!code.trim()) return 'كود العربية مطلوب';
    if (!carTitle.trim()) return 'عنوان العربية مطلوب';
    if (carTitle.length > 100) return 'العنوان يجب ألا يزيد عن 100 حرف';
    if (!price || parsePriceInput(price) < 0) return 'السعر يجب أن يكون رقم صحيح';
    if (description.length > 500) return 'الوصف يجب ألا يزيد عن 500 حرف';
    if (assignedTo.length === 0) return 'يجب تحديد مستخدمين أو اختيار "الكل"';
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
      // حساب الصور اللي اتشالت من الـ existing
      const removedExistingImages = initialExisting.filter((url) => !existingImages.includes(url));

      const data: NewCarInput = {
        code: code.trim(),
        title: carTitle.trim(),
        price: parsePriceInput(price),
        description: description.trim(),
        priority,
        display_order: Number(displayOrder) || 0,
        sort_mode: sortMode,
        status,
        image_url: existingImages[0] || '', // الرئيسية
        additional_images: existingImages.slice(1), // الإضافية من الـ existing
        condition,
        is_featured: isFeatured,
        assigned_to: assignedTo,
      };
      // الـ parent مسؤول عن:
      // 1. رفع newFiles للـ Storage
      // 2. حذف removedExistingImages من الـ Storage
      // 3. بناء القائمة النهائية (keptExistingImages + uploaded URLs)
      // 4. تحديث الـ Firestore document
      await onSave(data, existingImages, newFiles, removedExistingImages);
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
        {newFilePreviews.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 mb-3">
            {newFilePreviews.map((url, idx) => {
              const isMain = idx === 0;
              const isNewFile = idx >= existingImages.length;
              const newFileIdx = isNewFile ? idx - existingImages.length : -1;
              const existingIdx = isNewFile ? -1 : idx;
              return (
                <div
                  key={`${idx}-${url.slice(-20)}`}
                  className={`relative aspect-square bg-admin-bg rounded-xl overflow-hidden striped-bg group border-2 ${
                    isMain ? 'border-admin-accent' : 'border-admin-border'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`صورة ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* شارة "رئيسية" */}
                  {isMain && (
                    <div className="absolute top-1 right-1">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-admin-accent text-admin-bg text-[10px] font-bold">
                        رئيسية
                      </span>
                    </div>
                  )}
                  {/* شارة "جديدة" */}
                  {isNewFile && !isMain && (
                    <div className="absolute top-1 right-1">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                        جديدة
                      </span>
                    </div>
                  )}
                  {/* أزرار التحكم */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    {/* تحريك لأعلى */}
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => isNewFile ? moveNewFile(newFileIdx, 'up') : moveExistingImage(existingIdx, 'up')}
                        className="w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-admin-bg"
                        aria-label="رفع"
                      >
                        <ArrowUp size={12} />
                      </button>
                    )}
                    {/* تحريك لأسفل */}
                    {idx < newFilePreviews.length - 1 && (
                      <button
                        type="button"
                        onClick={() => isNewFile ? moveNewFile(newFileIdx, 'down') : moveExistingImage(existingIdx, 'down')}
                        className="w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-admin-bg"
                        aria-label="إنزال"
                      >
                        <ArrowDown size={12} />
                      </button>
                    )}
                    {/* حذف */}
                    <button
                      type="button"
                      onClick={() => isNewFile ? removeNewFile(newFileIdx) : removeExistingImage(existingIdx)}
                      className="w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white"
                      aria-label="حذف"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                  {/* زر الحذف في الموبايل (دائماً ظاهر) */}
                  <button
                    type="button"
                    onClick={() => isNewFile ? removeNewFile(newFileIdx) : removeExistingImage(existingIdx)}
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

      {/* Price + Display Order */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              // اسمح فقط بالأرقام — اعرضها بدون فواصل أثناء الكتابة (أسرع)
              // الفواصل تتضاف عند الـ blur
              const raw = e.target.value.replace(/[^0-9]/g, '');
              setPrice(raw);
            }}
            onBlur={(e) => {
              // أضف الفواصل لما المستخدم يخلّص الكتابة
              const raw = e.target.value.replace(/[^0-9]/g, '');
              setPrice(raw ? formatPriceInput(raw) : '');
            }}
            onFocus={(e) => {
              // لو فيه فواصل، شيلها عشان المستخدم يقدر يعدّل الرقم
              const raw = e.target.value.replace(/[^0-9]/g, '');
              setPrice(raw);
              // حط الـ cursor في الآخر
              requestAnimationFrame(() => {
                e.target.setSelectionRange(raw.length, raw.length);
              });
            }}
            placeholder="1,980,000"
            className="w-full px-3 py-2.5 rounded-xl bg-admin-card border border-admin-border text-admin-text placeholder:text-admin-text-muted focus:border-admin-accent/50"
            required
          />
        </div>
        <div>
          <label htmlFor="display_order" className="block text-sm font-bold text-admin-text-muted mb-1">
            ترتيب العرض
          </label>
          <input
            id="display_order"
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            placeholder="0"
            inputMode="numeric"
            className="w-full px-3 py-2.5 rounded-xl bg-admin-card border border-admin-border text-admin-text placeholder:text-admin-text-muted focus:border-admin-accent/50"
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
          placeholder="وصف قصير عن العربية..."
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-admin-card border border-admin-border text-admin-text placeholder:text-admin-text-muted focus:border-admin-accent/50 resize-none"
        />
        <div className="text-xs text-admin-text-muted mt-1 text-left">{description.length} / 500</div>
      </div>

      {/* Priority + Condition + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
        <div>
          <label htmlFor="status" className="block text-sm font-bold text-admin-text-muted mb-1">
            الحالة (التوفر)
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as CarStatus)}
            className="w-full px-3 py-2.5 rounded-xl bg-admin-card border border-admin-border text-admin-text focus:border-admin-accent/50"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sort Mode */}
      <div className="bg-admin-card border border-admin-border rounded-2xl p-4">
        <label className="block text-sm font-bold text-admin-text-muted mb-2">
          ترتيب العرض
        </label>
        <div className="space-y-2">
          {SORT_MODE_OPTIONS.map((o) => (
            <label
              key={o.value}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                sortMode === o.value
                  ? 'border-admin-accent bg-admin-accent/10'
                  : 'border-admin-border bg-admin-bg hover:border-admin-accent/30'
              }`}
            >
              <input
                type="radio"
                name="sort_mode"
                value={o.value}
                checked={sortMode === o.value}
                onChange={() => setSortMode(o.value)}
                className="mt-1 w-4 h-4 text-admin-accent border-admin-border focus:ring-admin-accent cursor-pointer"
              />
              <div className="flex-1">
                <div className="text-sm font-bold text-admin-text">{o.label}</div>
                <div className="text-xs text-admin-text-muted mt-0.5">{o.hint}</div>
              </div>
            </label>
          ))}
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
          <div className="text-xs text-admin-text-muted">تعرض شارة "قيدوي" على البطاقة</div>
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
