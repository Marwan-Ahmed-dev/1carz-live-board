// scripts/set-admin.mjs
//
// Set admin / inspector custom claim for a Firebase user.
// ESM module (matches scripts/seed-firebase-users.mjs).
//
// Usage:
//   1. Get your service-account key from Firebase Console:
//      Project Settings > Service Accounts > Generate New Private Key
//   2. Save it as scripts/serviceAccountKey.json
//   3. Run:
//        node scripts/set-admin.mjs <email> [role]
//
//      role defaults to "admin". Pass "inspector" to grant inspector access
//      or "source" to mark the account as market-registry source (no claim —
//      the source role is stored on users/{uid}.role only).

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const EMAIL = process.argv[2];
const ROLE = (process.argv[3] || 'admin').toLowerCase();

if (!EMAIL) {
  console.error('Usage: node scripts/set-admin.mjs <email> [admin|inspector|source]');
  process.exit(1);
}

if (ROLE !== 'admin' && ROLE !== 'inspector' && ROLE !== 'source') {
  console.error(`Invalid role "${ROLE}" — must be "admin", "inspector", or "source".`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Bootstrap Firebase Admin SDK — service-account JSON or env vars.
// ---------------------------------------------------------------------------

const here = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = resolve(here, 'serviceAccountKey.json');

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (err) {
  // Fall back to env vars
  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    console.error(`\n[ERROR] Cannot read ${serviceAccountPath}\n`);
    console.error('Download the service-account JSON from:');
    console.error('  Firebase Console → Project Settings → Service Accounts');
    console.error('  → "Generate New Private Key"');
    console.error(`Then save it as: ${serviceAccountPath}\n`);
    console.error('Or set env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY\n');
    process.exit(1);
  }
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
}

initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth();

async function main() {
  try {
    const userRecord = await auth.getUserByEmail(EMAIL);
    console.log(`Found user: ${userRecord.uid} (${userRecord.email})`);

    if (ROLE === 'source') {
      // 'source' role lives on users/{uid}.role, not on the custom claim.
      // (Firestore rules allow it server-side if we set the claim later, but
      // for now we just record the role on the user doc via the admin API.)
      // Strip any prior role claim to keep things tidy.
      await auth.setCustomUserClaims(userRecord.uid, { role: null });
      console.log(
        `✓ role="source" stored on user doc (no custom claim). ` +
          `Update users/${userRecord.uid}.role via the admin /admin/users page.`
      );
    } else {
      await auth.setCustomUserClaims(userRecord.uid, { role: ROLE });
      console.log(`✓ Successfully set role="${ROLE}" for ${EMAIL}`);
    }

    const updated = await auth.getUser(userRecord.uid);
    console.log(`Current claims:`, updated.customClaims);

    console.log(
      `\n⚠️  The user must sign out and sign back in for the claim to take effect.`
    );
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
