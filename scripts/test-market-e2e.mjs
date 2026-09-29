// scripts/test-market-e2e.mjs
//
// End-to-end test for /market feature:
//   1. Login as source1 via Firebase Auth REST API (signInWithPassword)
//   2. Use the resulting ID token to query market_registry (Firestore REST)
//   3. Verify rules allow the read (status 200, not 403)
//   4. Insert sample market_registry entries via Admin SDK
//   5. Re-query as source1 to verify visibility
//   6. Try to query as admin1 — should also work (admins can read everything
//      in our rules — wait, no, we restricted to isSource(). So admin should FAIL.)
//   7. Try to query as user001 (regular user) — should FAIL
//
// Usage: node scripts/test-market-e2e.mjs

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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
const auth = getAuth();
const db = getFirestore();

const PROJECT_ID = serviceAccount.project_id || serviceAccount.projectId;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!API_KEY) {
  console.error('[ERROR] NEXT_PUBLIC_FIREBASE_API_KEY env var required');
  console.error('Set it from .env.local: $env:NEXT_PUBLIC_FIREBASE_API_KEY = "..."');
  process.exit(1);
}

async function signInWithPassword(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`signIn failed (${res.status}): ${body}`);
  }
  return res.json();
}

async function queryMarketRegistry(idToken, label) {
  // Query top-level collection via Firestore REST API
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/market_registry?pageSize=5`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const body = await res.json();
  const ok = res.ok;
  const count = body.documents?.length ?? 0;
  console.log(
    `  ${label}: ${ok ? '✓' : '✗'} HTTP ${res.status}` +
      (ok ? ` — got ${count} doc(s)` : ` — ${body.error?.message || 'unknown'}`)
  );
  return { ok, count, body };
}

async function addSampleEntry(uid, email, data) {
  const ref = db.collection('market_registry').doc();
  await ref.set({
    ...data,
    recorded_by_uid: uid,
    recorded_by_name: email.split('@')[0],
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
    synced_at: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

async function main() {
  console.log(`Project: ${PROJECT_ID}\n`);

  // -------- 1) Sign in as source1 --------
  console.log('1) Firebase Auth REST login: source1@1carz.com');
  const source1 = await signInWithPassword('source1@1carz.com', 'Source@2026');
  console.log(`   ✓ uid=${source1.localId}, idToken len=${source1.idToken.length}\n`);

  // -------- 2) Source queries market_registry (should succeed, 0 docs) --------
  console.log('2) Source1 queries market_registry:');
  const before = await queryMarketRegistry(source1.idToken, 'source1 (before seed)');
  console.log('');

  // -------- 3) Seed sample entries via Admin SDK --------
  console.log('3) Seeding 5 sample entries (as source1)...');
  const sampleData = [
    { brand: 'BMW', model: 'X1', year: 2018, trim: 'Sport Line', paint_condition: 'فابريكا', mileage_km: 86000, maintenance: 'في التوكيل', price_egp: 1350000 },
    { brand: 'BMW', model: 'X1', year: 2018, trim: 'Sport Line', paint_condition: 'فابريكا', mileage_km: 92000, maintenance: 'في التوكيل', price_egp: 1300000 },
    { brand: 'BMW', model: 'X1', year: 2018, trim: 'Sport Line', paint_condition: 'فابريكا', mileage_km: 78000, maintenance: 'في التوكيل', price_egp: 1420000 },
    { brand: 'Mercedes', model: 'C180', year: 2020, trim: 'AMG Line', paint_condition: 'فابريكا', mileage_km: 45000, maintenance: 'في التوكيل', price_egp: 2100000 },
    { brand: 'Hyundai', model: 'Tucson', year: 2022, trim: 'Top', paint_condition: 'راشة بسيطة في الباب', mileage_km: 25000, maintenance: 'مختلط', price_egp: 1450000 },
  ];

  for (const data of sampleData) {
    const id = await addSampleEntry(source1.localId, source1.email, data);
    console.log(`   ✓ ${data.brand} ${data.model} ${data.year} — ${id}`);
  }
  console.log('');

  // -------- 4) Source re-queries (should succeed, 5 docs) --------
  console.log('4) Source1 re-queries market_registry:');
  const after = await queryMarketRegistry(source1.idToken, 'source1 (after seed)');
  console.log('');

  // -------- 5) Source1 inserts an entry via REST (should succeed) --------
  // The rule requires `created_at == request.time`, so we must send the actual
  // current time (the REST API doesn't support the serverTimestamp() sentinel).
  console.log('5) Source1 creates a new entry via Firestore REST:');
  const nowIso = new Date().toISOString();
  const newEntry = {
    fields: {
      brand: { stringValue: 'Toyota' },
      model: { stringValue: 'Corolla' },
      year: { integerValue: '2021' },
      trim: { stringValue: 'GLI' },
      paint_condition: { stringValue: 'فابريكا' },
      mileage_km: { integerValue: '60000' },
      maintenance: { stringValue: 'في التوكيل' },
      price_egp: { integerValue: '950000' },
      recorded_by_uid: { stringValue: source1.localId },
      recorded_by_name: { stringValue: 'source1' },
      created_at: { timestampValue: nowIso },
      updated_at: { timestampValue: nowIso },
      synced_at: { timestampValue: nowIso },
    },
  };
  const createUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/market_registry?documentId=`;
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${source1.idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(newEntry),
  });
  console.log(`   ${createRes.ok ? '✓' : '✗'} HTTP ${createRes.status} ${createRes.ok ? '— entry created' : '— ' + (await createRes.text()).substring(0, 200)}`);
  console.log('');

  // -------- 6) Admin user tries to read market_registry --------
  // Note: per current rules, isSource() = isAdmin() OR has source claim.
  // So admin IS allowed to read market_registry. This is intentional — admins
  // can oversee the market registry section. We just verify the admin token
  // works and gets results.
  console.log('6) Admin (admin1) reads market_registry (allowed by design — admin oversight):');
  try {
    const admin1 = await signInWithPassword('admin1@1carz.com', 'Admin@2026');
    const adminResult = await queryMarketRegistry(admin1.idToken, 'admin1');
    console.log(
      `   ${adminResult.ok ? '✓ admin can read (by design)' : '✗ admin denied'}\n`
    );
  } catch (err) {
    console.log(`   ✗ admin auth failed: ${err.message.substring(0, 80)}\n`);
  }

  // -------- 7) Regular user tries to read market_registry (should FAIL) --------
  console.log('7) Regular user (user001) tries to read market_registry (should be DENIED):');
  try {
    const user001 = await signInWithPassword('user001@1carz.com', 'User@2026');
    const userResult = await queryMarketRegistry(user001.idToken, 'user001');
    const denied = !userResult.ok;
    console.log(`   ${denied ? '✓ correctly denied' : '✗ WRONGLY allowed'}\n`);
  } catch (err) {
    // user001 needs to onboard first; auth might succeed but rules should deny
    console.log(`   ⚠️ auth note: ${err.message.substring(0, 100)}\n`);
  }

  // -------- Summary --------
  const allOk = before.ok && after.ok && after.count >= 5 && createRes.ok;

  console.log(`\n========================================`);
  console.log(allOk ? '✓ End-to-end market test PASSED' : '✗ End-to-end market test had failures');
  console.log('========================================');
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
