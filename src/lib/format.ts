// دوال مساعدة لتنسيق الأسعار والعملات والأرقام
// الأسعار تُعرض دائماً بأرقام إنجليزية مع فاصلة كل 3 أرقام

/**
 * أي قيمة زمنية مقبولة:
 * - Firestore Timestamp (has toDate())
 * - Date
 * - string ISO أو رقم ms
 *
 * NOTE: `FieldValue` (serverTimestamp sentinel) مش مقبول هنا — بنتوقع قيم
 * مخزّنة فعلاً (قراءة من Firestore). الـ writes بتكتب FieldValue والـ reads
 * بترجع Timestamp.
 */
export type DateLike = { toDate: () => Date } | Date | string | number;

/**
 * تحويل الأرقام العربية/الفارسية إلى إنجليزية
 */
export function toEnglishDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

/**
 * تنسيق السعر للعرض بأرقام إنجليزية
 * مثال: 1980000 → "1,980,000"
 *
 * يتعامل بأمان مع:
 * - 0 (يرجع "0")
 * - NaN / Infinity (يرجع "0")
 * - أرقام كبيرة جداً (Intl.NumberFormat يضيف فاصلة كل 3 أرقام)
 */
export function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return '0';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * تنسيق قيمة الـ input أثناء الكتابة (فاصلة إنجليزية كل 3 أرقام)
 * مثال: "1980000" → "1,980,000"
 */
export function formatPriceInput(value: string): string {
  const digits = toEnglishDigits(value).replace(/[^0-9]/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US');
}

/**
 * استخراج الرقم الخام من قيمة الـ input
 * مثال: "1,980,000" → 1980000
 */
export function parsePriceInput(value: string): number {
  const digits = toEnglishDigits(value).replace(/[^0-9]/g, '');
  return parseInt(digits, 10) || 0;
}

/**
 * يحوّل أي DateLike إلى Date أو null.
 * يرجع null لو الـ input فاضي / نوع غير معروف / ناتج غير صالح.
 */
function toJsDateSafe(input: DateLike | null | undefined): Date | null {
  if (!input) return null;
  try {
    if (input instanceof Date) {
      return Number.isNaN(input.getTime()) ? null : input;
    }
    if (typeof input === 'object' && typeof input.toDate === 'function') {
      const d = input.toDate();
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof input === 'string' || typeof input === 'number') {
      const d = new Date(input);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * تنسيق التاريخ بشكل نسبي بالعربية
 * - "اليوم" / "أمس" / "قبل X أيام" / "قبل X أسابيع" / "قبل X شهور"
 * - لو أكتر من سنة، يرجع التاريخ الكامل
 *
 * يقبل: Timestamp من Firestore أو Date أو string ISO أو number (ms)
 */
export function formatRelativeDate(input: DateLike | null | undefined): string {
  const date = toJsDateSafe(input);
  if (!date) return '-';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // أقل من دقيقة
  if (diffSeconds < 60) return 'الآن';
  // أقل من ساعة
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? 'قبل دقيقة' : `قبل ${diffMinutes} دقائق`;
  }
  // أقل من يوم
  if (diffHours < 24) {
    return diffHours === 1 ? 'قبل ساعة' : `قبل ${diffHours} ساعات`;
  }
  // نفس اليوم
  const today = new Date();
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return 'اليوم';
  }
  // أمس
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return 'أمس';
  }
  // أيام
  if (diffDays < 30) {
    if (diffDays === 1) return 'قبل يوم';
    if (diffDays === 2) return 'قبل يومين';
    if (diffDays < 11) return `قبل ${diffDays} أيام`;
    return `قبل ${diffDays} يوم`;
  }
  // أسابيع
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 8) {
    if (diffWeeks === 1) return 'قبل أسبوع';
    if (diffWeeks === 2) return 'قبل أسبوعين';
    return `قبل ${diffWeeks} أسابيع`;
  }
  // شهور
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    if (diffMonths === 1) return 'قبل شهر';
    if (diffMonths === 2) return 'قبل شهرين';
    if (diffMonths < 11) return `قبل ${diffMonths} أشهر`;
    return `قبل ${diffMonths} شهر`;
  }
  // أكتر من سنة → ارجع للتاريخ الكامل
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * تنسيق التاريخ الكامل بالعربية (للـ tooltip / fallback)
 */
export function formatFullDate(input: DateLike | null | undefined): string {
  const date = toJsDateSafe(input);
  if (!date) return '-';
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
