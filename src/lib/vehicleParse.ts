import { BRANDS } from './carBrands';
import { getModelsForBrand } from './carsCatalog';

export interface ParsedVehicleFields {
  make: string;
  model: string;
  year: number;
  mileage_km: number;
}

const YEAR_RE = /\b(19|20)\d{2}\b/;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Best-effort parse of free-text car titles into Meta vehicle fields.
 * Used as fallback for legacy cars missing structured make/model/year/mileage.
 */
export function parseVehicleFromTitle(title: string): Partial<ParsedVehicleFields> {
  const raw = (title || '').trim();
  if (!raw) return {};

  const out: Partial<ParsedVehicleFields> = {};
  const yearMatch = raw.match(YEAR_RE);
  if (yearMatch) {
    const y = Number(yearMatch[0]);
    if (y >= 1980 && y <= 2100) out.year = y;
  }

  const normTitle = normalize(raw);
  let matchedBrand: (typeof BRANDS)[number] | null = null;
  for (const b of BRANDS) {
    const candidates = [b.name, b.nameAr].filter(Boolean) as string[];
    for (const c of candidates) {
      if (normTitle.includes(normalize(c))) {
        matchedBrand = b;
        break;
      }
    }
    if (matchedBrand) break;
  }
  if (matchedBrand) {
    out.make = matchedBrand.name;
    const models = [
      ...matchedBrand.models,
      ...(getModelsForBrand(matchedBrand.name) || []),
    ];
    // Longer model names first so "Land Cruiser" beats "Land"
    const sorted = Array.from(new Set(models)).sort((a, b) => b.length - a.length);
    for (const m of sorted) {
      if (normTitle.includes(normalize(m))) {
        out.model = m;
        break;
      }
    }
    if (!out.model) {
      // leftover tokens after brand/year as model guess
      let rest = raw;
      for (const c of [matchedBrand.name, matchedBrand.nameAr, yearMatch?.[0]].filter(Boolean) as string[]) {
        rest = rest.replace(new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ');
      }
      rest = rest.replace(/[-|,]/g, ' ').replace(/\s+/g, ' ').trim();
      if (rest.length >= 2 && rest.length <= 40) out.model = rest.split(' ').slice(0, 3).join(' ');
    }
  }

  // Prefer mileage near km keywords; else last large number that isn't the year
  const kmTagged = raw.match(
    /(\d{1,3}(?:[,\s]\d{3})+|\d{4,7})\s*(?:كم|كيلو|كيلومتر|km)\b/i
  );
  if (kmTagged) {
    const n = Number(kmTagged[1].replace(/[,\s]/g, ''));
    if (Number.isFinite(n) && n >= 0 && n < 2_000_000) out.mileage_km = Math.floor(n);
  } else {
    const nums = [...raw.matchAll(/\b(\d{1,3}(?:,\d{3})+|\d{5,7})\b/g)].map((m) =>
      Number(m[1].replace(/,/g, ''))
    );
    const candidates = nums.filter(
      (n) => Number.isFinite(n) && n !== out.year && n >= 1000 && n < 2_000_000
    );
    if (candidates.length) out.mileage_km = Math.floor(candidates[candidates.length - 1]);
  }

  return out;
}

/** Merge stored fields with title-parsed fallbacks. */
export function resolveVehicleFields(input: {
  title: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  mileage_km?: number | null;
}): ParsedVehicleFields {
  const parsed = parseVehicleFromTitle(input.title);
  const make = (input.make || parsed.make || '').trim() || 'Unknown';
  const model = (input.model || parsed.model || '').trim() || 'Unknown';
  let year = typeof input.year === 'number' && input.year > 0 ? input.year : parsed.year || 0;
  if (!year || year < 1980 || year > 2100) year = new Date().getFullYear();
  let mileage =
    typeof input.mileage_km === 'number' && input.mileage_km >= 0
      ? Math.floor(input.mileage_km)
      : typeof parsed.mileage_km === 'number'
        ? parsed.mileage_km
        : 0;
  if (!Number.isFinite(mileage) || mileage < 0) mileage = 0;
  return { make, model, year, mileage_km: mileage };
}