/**
 * One-time migration (safe to re-run):
 * Move owner_name / owner_phone off public cars/{id} into car_private/{id}.
 *
 * Usage (from repo root, with .env.local containing Admin credentials):
 *   node scripts/migrate-car-owner-private.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvLocal();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    'Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local'
  );
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const db = getFirestore();
const auth = getAuth();

async function main() {
  const carsSnap = await db.collection('cars').get();
  let moved = 0;
  let cleaned = 0;
  let skipped = 0;
  let sourceClaims = 0;

  let batch = db.batch();
  let ops = 0;
  const commit = async () => {
    if (ops === 0) return;
    await batch.commit();
    batch = db.batch();
    ops = 0;
  };

  for (const carDoc of carsSnap.docs) {
    const data = carDoc.data();
    const ownerName = typeof data.owner_name === 'string' ? data.owner_name : '';
    const ownerPhone = typeof data.owner_phone === 'string' ? data.owner_phone : '';
    const hasOwnerKeys = 'owner_name' in data || 'owner_phone' in data;

    if (!hasOwnerKeys && !ownerName && !ownerPhone) {
      skipped += 1;
      continue;
    }

    const privateRef = db.collection('car_private').doc(carDoc.id);
    const privateSnap = await privateRef.get();
    const prev = privateSnap.exists ? privateSnap.data() || {} : {};

    batch.set(
      privateRef,
      {
        owner_name:
          ownerName || (typeof prev.owner_name === 'string' ? prev.owner_name : ''),
        owner_phone:
          ownerPhone || (typeof prev.owner_phone === 'string' ? prev.owner_phone : ''),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    ops += 1;
    moved += 1;

    if (hasOwnerKeys) {
      batch.update(carDoc.ref, {
        owner_name: FieldValue.delete(),
        owner_phone: FieldValue.delete(),
        updated_at: FieldValue.serverTimestamp(),
      });
      ops += 1;
      cleaned += 1;
    }

    if (ops >= 400) await commit();
  }

  await commit();

  const usersSnap = await db.collection('users').where('role', '==', 'source').get();
  for (const userDoc of usersSnap.docs) {
    try {
      const user = await auth.getUser(userDoc.id);
      if (user.customClaims?.role !== 'source') {
        await auth.setCustomUserClaims(userDoc.id, { role: 'source' });
        sourceClaims += 1;
      }
    } catch (err) {
      console.warn('source claim skip', userDoc.id, err?.message || err);
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        totalCars: carsSnap.size,
        moved,
        cleaned,
        skipped,
        sourceClaims,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
