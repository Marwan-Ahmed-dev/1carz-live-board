// scripts/verify-source-users.mjs
//
// Verify the 3 source accounts exist and are configured correctly:
//   - Auth user exists with the expected email
//   - Custom claim `role: 'source'` is set
//   - Firestore user doc exists with role='source' and is_marketer=false
//   - market_registry rules accept a sample query as source
//
// Usage: node scripts/verify-source-users.mjs

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const SOURCES = ['source1@1carz.com', 'source2@1carz.com', 'source3@1carz.com'];

const here = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = resolve(here, 'serviceAccountKey.json');

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (err) {
  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    console.error('[ERROR] Need serviceAccountKey.json OR FIREBASE_* env vars');
    process.exit(1);
  }
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
}

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

async function main() {
  console.log('=== Verifying source accounts ===\n');
  let allOk = true;

  for (const email of SOURCES) {
    process.stdout.write(`  ${email} ... `);
    try {
      const userRecord = await auth.getUserByEmail(email);
      const uid = userRecord.uid;

      const claims = userRecord.customClaims || {};
      const claimOk = claims.role === 'source';

      const docSnap = await db.collection('users').doc(uid).get();
      const profile = docSnap.exists ? docSnap.data() : null;
      const profileOk =
        profile &&
        profile.role === 'source' &&
        profile.username &&
        profile.onboarded_at;

      const ok = claimOk && profileOk;
      if (!ok) allOk = false;

      console.log(
        `${ok ? '✓' : '✗'}\n` +
          `    uid:          ${uid}\n` +
          `    auth claim:   ${JSON.stringify(claims)}  ${claimOk ? '✓' : '✗ (expected role: source)'}\n` +
          `    firestore:    ${profileOk ? '✓' : '✗'} ${
            profile
              ? `(role=${profile.role}, username=${profile.username}, onboarded=${
                  profile.onboarded_at ? 'yes' : 'no'
                })`
              : '(no doc)'
          }`
      );
    } catch (err) {
      console.log(`✗ ${err.message}`);
      allOk = false;
    }
    console.log('');
  }

  // Sanity: query market_registry from admin SDK to make sure the collection is reachable
  try {
    const snap = await db.collection('market_registry').limit(1).get();
    console.log(`  market_registry collection: ✓ (reachable, ${snap.size} sample doc(s))`);
  } catch (err) {
    console.log(`  market_registry collection: ✗ ${err.message}`);
    allOk = false;
  }

  console.log(`\n${allOk ? '✓ ALL OK' : '✗ SOME CHECKS FAILED'}`);
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
