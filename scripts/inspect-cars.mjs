// scripts/inspect-cars.mjs
// Read a sample of cars and print their fields to understand the schema.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const here = dirname(fileURLToPath(import.meta.url));
const sp = resolve(here, 'serviceAccountKey.json');

let sa;
try {
  sa = JSON.parse(readFileSync(sp, 'utf8'));
} catch {
  sa = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
}

initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function main() {
  const snap = await db.collection('cars').limit(3).get();
  console.log('count:', snap.size);
  snap.docs.forEach((d, i) => {
    console.log(`\n=== Car ${i + 1} ID: ${d.id} ===`);
    console.log(JSON.stringify(d.data(), null, 2));
  });
  process.exit(0);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
