'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, Upload, Loader2, Star, Image as ImageIcon } from 'lucide-react';
import { Car, CarCondition, CarStatus, Priority, NewCarInput } from '@/lib/types';
import { uploadCarImage } from '@/lib/storage';
import { UserAssignmentSelector } from './UserAssignmentSelector';
import { useToast } from '@/hooks/useToast';

interface CarFormProps {
  /** عربية موجودة (للـ edit) */
  initial?: Car;
  /** دالة الحفظ */
  onSave: (data: NewCarInput, imageFile: File | null) => Promise<void>;
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
];

const STATUS_OPTIONS: Array<{ value: CarStatus; label: string }> = [
  { value: 'active', label: 'متاحة' },
  { value: 'inactive', label: 'غير معروضة' },
  { value: 'reserved', label: 'محجوزة' },
  { value: 'sold', label: 'مباعة' },
];

/**
 * نموذج إضافة / تعديل عربية
 * - يدعم رفع صورة جديدة (أو الإبقاء على القديمة في وضع الـ edit)
 * - validation: client-side لكل الحقول
 * - يستخدم UserAssignmentSelector للـ assigned_to
 */
export function CarForm({ initial, onSave, title, submitLabel = 'حفظ' }: CarFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [code, setCode] = useState(initial?.code || '');
  const [carTitle, setCarTitle] = useState(initial?.title || '');
  const [price, setPrice] = useState<string>(initial?.price?.toString() || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [priority, setPriority] = useState<Priority>(initial?.priority || 'medium');
  const [condition, setCondition] = useState<CarCondition>(initial?.condition || 'used');
  const [status, setStatus] = useState<CarStatus>(initial?.status || 'active');
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured || false);
  const [assignedTo, setAssignedTo] = useState<string[]>(initial?.assigned_to || ['all']);
  const [displayOrder, setDisplayOrder] = useState<string>(initial?.display_order?.toString() || '0');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.image_url || null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // تنظيف الـ preview URL لما يتغير
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('يجب اختيار ملف صورة');
      return;
    }
    setError(null);
    setImageFile(file);
    // preview
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(URL.createObjectURL(file));
  };

  const validate = (): string | null => {
    if (!code.trim()) return 'كود العربية مطلوب';
    if (!carTitle.trim()) return 'عنوان العربية مطلوب';
    if (carTitle.length > 100) return 'العنوان يجب ألا يزيد عن 100 حرف';
    if (!price || isNaN(Number(price)) || Number(price) < 0) return 'السعر يجب أن يكون رقم صحيح';
    if (description.length > 500) return 'الوصف يجب ألا يزيد عن 500 حرف';
    if (assignedTo.length === 0) return 'يجب تحديد مستخدمين أو اختيار "الكل"';
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
      const data: NewCarInput = {
        code: code.trim(),
        title: carTitle.trim(),
        price: Number(price),
        description: description.trim(),
        priority,
        display_order: Number(displayOrder) || 0,
        status,
        image_url: initial?.image_url || '', // نتعامل مع الـ upload في الـ onSave
        condition,
        is_featured: isFeatured,
        assigned_to: assignedTo,
      };
      await onSave(data, imageFile);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الحفظ');
      showToast(err.message || 'فشل الحفظ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Hint للتعامل مع upload في الـ parent:
  // - إذا في imageFile، يُرفع للـ storage ويحدّث image_url
  // - إذا في initial و image_url موجودة، نُبقيها كما هي إلا لو في imageFile جديدة

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-admin-text">{title}</h1>
      </div>

      {/* Image Upload */}
      <div className="bg-admin-card border border-admin-border rounded-2xl p-4">
        <label className="block text-sm font-bold text-admin-text-muted mb-2">
          صورة العربية
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-48 aspect-[16/10] bg-admin-bg rounded-xl overflow-hidden striped-bg flex items-center justify-center">
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt="معاينة"
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageIcon size={40} className="text-admin-text-muted opacity-50" />
            )}
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              id="car-image-input"
            />
            <label
              htmlFor="car-image-input"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-admin-text hover:border-admin-accent/50 cursor-pointer text-sm font-medium transition-colors w-full sm:w-auto"
            >
              <Upload size={16} />
              {imageFile ? 'تغيير الصورة' : initial?.image_url ? 'استبدال الصورة' : 'اختر صورة'}
            </label>
            <p className="text-xs text-admin-text-muted mt-2">
              JPG / PNG · حد أقصى 5 ميجابايت
            </p>
          </div>
        </div>
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
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="1980000"
            inputMode="numeric"
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