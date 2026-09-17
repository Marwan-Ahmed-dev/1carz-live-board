// دوال مساعدة لتنسيق الأسعار والعملات والأرقام
// نستخدم Intl.NumberFormat لعرض الأرقام بالعربية مع فاصلة كل 3 أرقام

/**
 * تنسيق السعر للعرض (بالعربية المصرية)
 * مثال: 1980000 → "1,980,000"
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ar-EG', {
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * تنسيق قيمة الـ input أثناء الكتابة (يستخدم الفاصلة الإنجليزية كل 3 أرقام)
 * مثال: "1980000" → "1,980,000"
 *
 * - بياخد string فيه أرقام (مع أو بدون فواصل)
 * - بيرجع string فيه فواصل إنجليزية (عشان الـ input يعرضها بشكل مألوف)
 */
export function formatPriceInput(value: string): string {
  const num = parseInt(value.replace(/[^0-9]/g, ''), 10);
  if (isNaN(num) || num === 0) return '';
  return num.toLocaleString('en-US');
}

/**
 * استخراج الرقم الخام من قيمة الـ input
 * مثال: "1,980,000" → 1980000
 */
export function parsePriceInput(value: string): number {
  return parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
}

/**
 * تنسيق التاريخ بشكل نسبي بالعربية
 * - "اليوم" / "أمس" / "قبل X أيام" / "قبل X أسابيع" / "قبل X شهور"
 * - لو أكتر من سنة، يرجع التاريخ الكامل
 *
 * يقبل: Timestamp من Firestore أو Date أو string ISO أو number (ms)
 */
export function formatRelativeDate(input: any): string {
  if (!input) return '-';
  let date: Date;
  try {
    if (typeof input === 'object' && input.toDate) {
      date = input.toDate();
    } else if (input instanceof Date) {
      date = input;
    } else {
      date = new Date(input);
    }
    if (isNaN(date.getTime())) return '-';
  } catch {
    return '-';
  }

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
export function formatFullDate(input: any): string {
  if (!input) return '-';
  let date: Date;
  try {
    if (typeof input === 'object' && input.toDate) {
      date = input.toDate();
    } else if (input instanceof Date) {
      date = input;
    } else {
      date = new Date(input);
    }
    if (isNaN(date.getTime())) return '-';
  } catch {
    return '-';
  }
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
