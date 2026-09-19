export function digitsOnly(phone: string): string {
  return (phone || '').replace(/\D/g, '');
}

export function validatePhone(phone: string): string | null {
  const digits = digitsOnly(phone);
  if (digits.length < 8 || digits.length > 15) {
    return 'رقم التليفون غير صالح';
  }
  return null;
}

/** رقم المشتري لازم 11 رقم بالظبط */
export function validateBuyerPhone(phone: string): string | null {
  const digits = digitsOnly(phone);
  if (digits.length !== 11) {
    return 'رقم المشتري لازم يكون 11 رقم';
  }
  return null;
}

export function formatPhoneDisplay(phone: string): string {
  return (phone || '').trim();
}
