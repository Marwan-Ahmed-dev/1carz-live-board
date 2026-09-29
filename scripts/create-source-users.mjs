// scripts/create-source-users.mjs
//
// Create N source-role accounts in one go. Each gets:
//   1. Firebase Auth user with email/password
//   2. Custom claim `{ role: 'source' }` (used by Firestore rules)
//   3. Firestore `users/{uid}` profile with role='source', pre-onboarded username,
//      so they skip /onboarding and land directly on /market
//
// Idempotent: re-running updates passwords and re-syncs role/profile.
//
// Usage:
//   node scripts/create-source-users.mjs
//   (no args — uses the SOURCES list below)

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ---------------------------------------------------------------------------
// Source accounts to bootstrap.
// ---------------------------------------------------------------------------

const SOURCES = [
  { label: 'Source 1', username: 'source1', password: 'Source@2026', phone: '+201500000001' },
  { label: 'Source 2', username: 'source2', password: 'Source@2026', phone: '+201500000002' },
  { label: 'Source 3', username: 'source3', password: 'Source@2026', phone: '+201500000003' },
];

// ---------------------------------------------------------------------------
// Bootstrap Firebase Admin SDK
// ---------------------------------------------------------------------------

const here = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = resolve(here, 'serviceAccountKey.json');

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (err) {
  // Fall back to env vars (CI / Vercel / no service-account file)
  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    console.error(`\n[ERROR] Cannot read ${serviceAccountPath}`);
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

initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findExistingUserByEmail(email) {
  try {
    return await auth.getUserByEmail(email);
  } catch (err) {
    if (err.code === 'auth/user-not-found') return null;
    throw err;
  }
}

async function createOrUpdateUser({ email, password, displayName, phoneNumber }) {
  const existing = await findExistingUserByEmail(email);
  let uid;
  let created = false;

  if (existing) {
    uid = existing.uid;
    await auth.updateUser(uid, { password, displayName, phoneNumber });
    console.log(`  [SKIP] ${email} already exists → uid=${uid} (password reset)`);
  } else {
    const userRecord = await auth.createUser({ email, password, displayName, phoneNumber });
    uid = userRecord.uid;
    created = true;
    console.log(`  [NEW]  ${email} → uid=${uid}`);
  }
  return { uid, created };
}

async function writeSourceProfile({ uid, email, username, label }) {
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  const now = FieldValue.serverTimestamp();

  const profile = {
    uid,
    email,
    username,                      // pre-onboarded username
    role: 'source',                // Firestore doc role (used by useAuth.isSource)
    is_marketer: false,            // source ≠ marketer
    daily_buyer_limit: null,       // source doesn't enter buyer leads
    onboarded_at: now,             // skip /onboarding
    created_at: snap.exists ? snap.data().created_at || now : now,
    last_seen: now,
  };

  if (!snap.exists) {
    await ref.set(profile);
    console.log(`  [NEW-PROFILE] users/${uid} created with role='source', username='${username}'`);
  } else {
    await ref.set(profile, { merge: true });
    console.log(`  [UPD-PROFILE] users/${uid} updated with role='source', username='${username}'`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Project: ${serviceAccount.project_id}`);
  console.log(`Service account: ${serviceAccount.client_email}\n`);

  console.log(`=== Bootstrapping ${SOURCES.length} source accounts ===`);

  const created = [];

  for (const source of SOURCES) {
    const email = `${source.username}@1carz.com`;

    const { uid } = await createOrUpdateUser({
      email,
      password: source.password,
      displayName: source.label,
      phoneNumber: source.phone,
    });

    // Set custom claim — required by Firestore rules: `request.auth.token.role == 'source'`
    await auth.setCustomUserClaims(uid, { role: 'source' });
    console.log(`  [CLAIM] role="source" set on ${email}`);

    // Write Firestore profile — required by useAuth.isSource: `userData.role === 'source'`
    await writeSourceProfile({
      uid,
      email,
      username: source.username,
      label: source.label,
    });

    created.push({ email, password: source.password, username: source.username, uid });
  }

  console.log(`\n========================================`);
  console.log(`✓ Done. ${created.length} source accounts ready.\n`);
  console.log(`Credentials (must sign in via /login with email + password):`);
  console.log(``);
  for (const c of created) {
    console.log(`  ${c.email}  /  ${c.password}   (username: ${c.username})`);
  }
  console.log(``);
  console.log(`After first login, source accounts land directly on /market (no onboarding).`);
  console.log(`========================================\n`);
}

main().catch((err) => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
