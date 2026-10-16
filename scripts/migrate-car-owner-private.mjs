/**
 * Migrate PII off public cars/{id}:
 * - owner_* → car_private/{id}
 * - inspector_* → car_contact/{id}
 * Also backfills source custom claims (merge).
 *
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
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
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
  console.error('Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const db = getFirestore();
const auth = getAuth();

async function main() {
  const carsSnap = await db.collection('cars').get();
  let ownersMoved = 0;
  let inspectorsMoved = 0;
  let cleaned = 0;
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
    const inspectorName = typeof data.inspector_name === 'string' ? data.inspector_name : '';
    const inspectorPhone = typeof data.inspector_phone === 'string' ? data.inspector_phone : '';
    const hasOwnerKeys = 'owner_name' in data || 'owner_phone' in data;
    const hasInspectorKeys = 'inspector_name' in data || 'inspector_phone' in data;

    if (hasOwnerKeys || ownerName || ownerPhone) {
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
      ownersMoved += 1;
    }

    if (hasInspectorKeys || inspectorName || inspectorPhone) {
      const contactRef = db.collection('car_contact').doc(carDoc.id);
      const contactSnap = await contactRef.get();
      const prev = contactSnap.exists ? contactSnap.data() || {} : {};
      batch.set(
        contactRef,
        {
          inspector_name:
            inspectorName ||
            (typeof prev.inspector_name === 'string' ? prev.inspector_name : ''),
          inspector_phone:
            inspectorPhone ||
            (typeof prev.inspector_phone === 'string' ? prev.inspector_phone : ''),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      ops += 1;
      inspectorsMoved += 1;
    }

    if (hasOwnerKeys || hasInspectorKeys) {
      batch.update(carDoc.ref, {
        owner_name: FieldValue.delete(),
        owner_phone: FieldValue.delete(),
        inspector_name: FieldValue.delete(),
        inspector_phone: FieldValue.delete(),
        updated_at: FieldValue.serverTimestamp(),
      });
      ops += 1;
      cleaned += 1;
    }

    if (ops >= 400) await commit();
  }

  await commit();

  // Ensure every car has car_contact from existing private path if still on cars was empty
  // (inspectors already moved above). Also backfill contact from cars that only had
  // inspector in UI historically — already handled.

  const usersSnap = await db.collection('users').where('role', '==', 'source').get();
  for (const userDoc of usersSnap.docs) {
    try {
      const user = await auth.getUser(userDoc.id);
      if (user.customClaims?.role !== 'source') {
        await auth.setCustomUserClaims(userDoc.id, {
          ...(user.customClaims || {}),
          role: 'source',
        });
        sourceClaims += 1;
      }
    } catch (err) {
      console.warn('source claim skip', userDoc.id, err?.message || err);
    }
  }

  // Also ensure inspector/admin users with doc role have claims (merge)
  for (const role of ['admin', 'inspector']) {
    const snap = await db.collection('users').where('role', '==', role).get();
    for (const userDoc of snap.docs) {
      try {
        const user = await auth.getUser(userDoc.id);
        if (user.customClaims?.role !== role) {
          await auth.setCustomUserClaims(userDoc.id, {
            ...(user.customClaims || {}),
            role,
          });
          sourceClaims += 1;
        }
      } catch (err) {
        console.warn(role, 'claim skip', userDoc.id, err?.message || err);
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        totalCars: carsSnap.size,
        ownersMoved,
        inspectorsMoved,
        cleaned,
        claimsUpdated: sourceClaims,
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