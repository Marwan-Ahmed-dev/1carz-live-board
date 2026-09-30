// scripts/parse-cars-catalog.mjs
//
// Parse ALL cars from Firestore `cars` collection and extract (brand, model, year,
// paint_condition) by splitting the `title` field.
//
// Output: JSON to stdout — pipe to src/lib/carsCatalog.generated.json
//
// Auth: tries scripts/serviceAccountKey.json first, then falls back to
// FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY env vars
// (preferred, since the json key is revoked).

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const here = dirname(fileURLToPath(import.meta.url));
let sa;
try {
  sa = JSON.parse(readFileSync(resolve(here, 'serviceAccountKey.json'), 'utf8'));
} catch {
  sa = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
}
initializeApp({ credential: cert(sa) });
const db = getFirestore();

/**
 * Parse a title like "Mercedes GLE 450 2023" → { brand, model, year }.
 * - strips emoji + leading/trailing punctuation
 * - the trailing 4-digit year is parsed separately
 * - brand = first whitespace-delimited token; model = the rest
 */
function parseTitle(title) {
  if (!title || typeof title !== 'string') return null;
  // strip emoji + bullets
  let clean = title.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').trim();
  const yearMatch = clean.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : null;
  if (yearMatch) clean = clean.replace(yearMatch[0], '').trim();
  clean = clean.replace(/^[\s\-–—•·]+|[\s\-–—•·]+$/g, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length < 2) return null;
  const brand = parts[0];
  const model = parts.slice(1).join(' ');
  if (!brand || !model || !year) return null;
  return { brand, model, year };
}

async function main() {
  const snap = await db.collection('cars').get();
  console.error(`Read ${snap.size} cars`);

  const modelsByBrand = {};
  const yearsByBrandModel = {};
  const paintByBrandModelYear = {};

  let parsed = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const parsedTitle = parseTitle(d.title);
    if (!parsedTitle) continue;
    parsed++;
    const { brand, model, year } = parsedTitle;
    if (!modelsByBrand[brand]) modelsByBrand[brand] = new Set();
    modelsByBrand[brand].add(model);
    const bmKey = `${brand}::${model}`;
    if (!yearsByBrandModel[bmKey]) yearsByBrandModel[bmKey] = new Set();
    yearsByBrandModel[bmKey].add(year);
    if (d.paint_condition) {
      const bmyKey = `${brand}::${model}::${year}`;
      if (!paintByBrandModelYear[bmyKey]) paintByBrandModelYear[bmyKey] = new Set();
      paintByBrandModelYear[bmyKey].add(d.paint_condition);
    }
  }

  const out = {
    generated_at: new Date().toISOString(),
    source: 'cars collection in Firestore (parsed from title)',
    total_cars: snap.size,
    parsed_titles: parsed,
    brands: Object.keys(modelsByBrand).sort(),
    modelsByBrand: Object.fromEntries(
      Object.entries(modelsByBrand).map(([b, s]) => [b, Array.from(s).sort()])
    ),
    yearsByBrandModel: Object.fromEntries(
      Object.entries(yearsByBrandModel).map(([k, s]) => [k, Array.from(s).sort((a, b) => b - a)])
    ),
    paintByBrandModelYear: Object.fromEntries(
      Object.entries(paintByBrandModelYear).map(([k, s]) => [k, Array.from(s).sort()])
    ),
  };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});