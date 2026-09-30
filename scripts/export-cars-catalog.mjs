// scripts/export-cars-catalog.mjs
//
// Read ALL cars from Firestore and export distinct (brand, model, year, paint_condition)
// as a JSON file to be imported into /market catalog.
//
// Usage: node scripts/export-cars-catalog.mjs > scripts/cars-catalog.json

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const here = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = resolve(here, 'serviceAccountKey.json');

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch {
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
  console.error('Reading cars from Firestore...');
  const snap = await db.collection('cars').get();
  console.error(`Got ${snap.size} cars`);

  // Collect distinct values
  const brandModelYear = new Map(); // key: "brand::model" -> Set<number>
  const brandSet = new Set();
  const modelSet = new Set();
  const yearSet = new Set();
  const paintSet = new Set();
  const trimSet = new Set();
  const maintenanceSet = new Set();
  const priceRange = { min: Infinity, max: -Infinity };

  for (const doc of snap.docs) {
    const d = doc.data();
    if (d.brand) brandSet.add(d.brand);
    if (d.model) modelSet.add(d.model);
    if (typeof d.year === 'number') yearSet.add(d.year);
    if (d.paint_condition) paintSet.add(d.paint_condition);
    if (d.trim) trimSet.add(d.trim);
    if (d.maintenance) maintenanceSet.add(d.maintenance);
    if (typeof d.price === 'number') {
      priceRange.min = Math.min(priceRange.min, d.price);
      priceRange.max = Math.max(priceRange.max, d.price);
    }
    if (d.brand && d.model && typeof d.year === 'number') {
      const key = `${d.brand}::${d.model}`;
      if (!brandModelYear.has(key)) {
        brandModelYear.set(key, new Set());
      }
      brandModelYear.get(key).add(d.year);
    }
  }

  // Build the output catalog structure
  const brands = Array.from(brandSet).sort();
  const models = Array.from(modelSet).sort();
  const years = Array.from(yearSet).sort((a, b) => b - a);
  const paints = Array.from(paintSet).sort();
  const trims = Array.from(trimSet).sort();
  const maintenances = Array.from(maintenanceSet).sort();

  const modelsByBrand = {};
  for (const brand of brands) {
    modelsByBrand[brand] = Array.from(modelSet)
      .filter(m => Array.from(brandModelYear.keys()).some(k => k === `${brand}::${m}`))
      .sort();
  }

  const yearsByBrandModel = {};
  for (const [key, yearSetInner] of brandModelYear.entries()) {
    yearsByBrandModel[key] = Array.from(yearSetInner).sort((a, b) => b - a);
  }

  const out = {
    generated_at: new Date().toISOString(),
    source: 'cars collection in Firestore',
    counts: {
      total_cars: snap.size,
      brands: brands.length,
      models: models.length,
      years: years.length,
      paints: paints.length,
      trims: trims.length,
      maintenances: maintenances.length,
    },
    price_range: priceRange,
    brands,
    models,
    years,
    paints,
    trims,
    maintenances,
    modelsByBrand,
    yearsByBrandModel,
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
