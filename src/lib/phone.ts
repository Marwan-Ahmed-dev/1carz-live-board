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

export function formatPhoneDisplay(phone: string): string {
  return (phone || '').trim();
}
