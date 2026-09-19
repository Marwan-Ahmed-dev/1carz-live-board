const CAIRO_TZ = 'Africa/Cairo';

export function cairoDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function startOfCairoDay(now = new Date()): Date {
  const key = cairoDateKey(now);
  const utcMidnight = Date.parse(`${key}T00:00:00.000Z`);
  let lo = utcMidnight - 12 * 3600_000;
  let hi = utcMidnight + 12 * 3600_000;
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2);
    if (cairoDateKey(new Date(mid)) < key) lo = mid;
    else hi = mid;
  }
  return new Date(hi);
}

export function formatCairoTodayLabel(now = new Date()): string {
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: CAIRO_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
}

export function toJsDate(input: { toDate?: () => Date } | Date | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  if (typeof input.toDate === 'function') {
    const date = input.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  return null;
}

export function isTodayInCairo(input: { toDate?: () => Date } | Date | null | undefined): boolean {
  const date = toJsDate(input);
  return !!date && cairoDateKey(date) === cairoDateKey();
}
