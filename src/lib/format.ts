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
