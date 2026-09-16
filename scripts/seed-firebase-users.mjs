// scripts/seed-firebase-users.mjs
//
// Bulk-seeds Firebase Auth + Firestore with the 4 admins and 40 normal users
// defined in this file. Run with:
//
//   1. Place the service-account JSON at scripts/serviceAccountKey.json
//      (Firebase Console → Project Settings → Service Accounts → Generate Key)
//   2. node scripts/seed-firebase-users.mjs
//
// Idempotent: skips users that already exist. Re-runs are safe.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ---------------------------------------------------------------------------
// Source data — same shape as 1carz_users.xlsx (fake/test accounts only)
// ---------------------------------------------------------------------------

const ADMINS = [
  { label: 'أدمن 1', username: 'admin1', password: 'Admin@2026', phone: '+201000000001' },
  { label: 'أدمن 2', username: 'admin2', password: 'Admin@2026', phone: '+201000000002' },
  { label: 'أدمن 3', username: 'admin3', password: 'Admin@2026', phone: '+201000000003' },
  { label: 'أدمن 4', username: 'admin4', password: 'Admin@2026', phone: '+201000000004' },
];

const USERS = Array.from({ length: 40 }, (_, i) => {
  const n = String(i + 1).padStart(3, '0');
  return {
    label: `مستخدم ${n}`,
    username: `user${n}`,
    password: 'User@2026',
    phone: `+20110000${String(i + 1).padStart(4, '0')}`,
  };
});

// ---------------------------------------------------------------------------
// Bootstrap Firebase Admin SDK
// ---------------------------------------------------------------------------

const here = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = resolve(here, 'serviceAccountKey.json');

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (err) {
  console.error(`\n[ERROR] Cannot read ${serviceAccountPath}\n`);
  console.error('Download the service-account JSON from:');
  console.error('  Firebase Console → Project Settings → Service Accounts');
  console.error('  → "Generate New Private Key"');
  console.error(`Then save it as: ${serviceAccountPath}\n`);
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth();
const db = getFirestore();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tsNow() {
  return FieldValue.serverTimestamp();
}

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
    // Update password so re-seeds stay idempotent even if password changed
    await auth.updateUser(uid, { password, displayName, phoneNumber });
    console.log(`  [SKIP] ${email} already exists → uid=${uid} (password reset)`);
  } else {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      phoneNumber,
    });
    uid = userRecord.uid;
    created = true;
    console.log(`  [NEW]  ${email} → uid=${uid}`);
  }

  return { uid, created };
}

async function writeFirestoreProfile({ uid, email, username, role }) {
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  const now = tsNow();

  if (!snap.exists) {
    await ref.set({
      uid,
      email,
      username,           // null for normal users (filled in onboarding)
      role,               // 'admin' | 'user'  (redundant w/ custom claim but useful in queries)
      onboarded_at: role === 'admin' ? now : null,  // admins are pre-onboarded
      created_at: now,
      last_seen: now,
    });
  } else {
    // Don't overwrite username if the user already set one during onboarding
    await ref.update({
      last_seen: now,
      // Only write username for admins — leave user-set names alone
      ...(role === 'admin' && !snap.data().username ? { username } : {}),
    });
  }
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seedAdmins() {
  console.log(`\n=== Seeding ${ADMINS.length} admins ===`);
  for (const admin of ADMINS) {
    const { uid } = await createOrUpdateUser({
      email: `${admin.username}@1carz.com`,
      password: admin.password,
      displayName: admin.label,
      phoneNumber: admin.phone,
    });
    await auth.setCustomUserClaims(uid, { role: 'admin' });
    await writeFirestoreProfile({
      uid,
      email: `${admin.username}@1carz.com`,
      username: admin.username,
      role: 'admin',
    });
  }
  console.log(`  ✓ Custom claim "role: admin" set on ${ADMINS.length} users`);
}

async function seedUsers() {
  console.log(`\n=== Seeding ${USERS.length} normal users ===`);
  for (const user of USERS) {
    const { uid } = await createOrUpdateUser({
      email: `${user.username}@1carz.com`,
      password: user.password,
      displayName: user.label,
      phoneNumber: user.phone,
    });
    await writeFirestoreProfile({
      uid,
      email: `${user.username}@1carz.com`,
      username: null,  // Will be filled during first login via onboarding
      role: 'user',
    });
  }
  console.log(`  ✓ ${USERS.length} normal users ready (username = null until onboarding)`);
}

async function main() {
  console.log(`Project: ${serviceAccount.project_id}`);
  console.log(`Service account: ${serviceAccount.client_email}\n`);

  await seedAdmins();
  await seedUsers();

  const total = ADMINS.length + USERS.length;
  console.log(`\n========================================`);
  console.log(`✓ Done. ${total} accounts processed.`);
  console.log(`  - ${ADMINS.length} admins (admin1..admin4 @1carz.com)`);
  console.log(`  - ${USERS.length} normal users (user001..user040 @1carz.com)`);
  console.log(`\n⚠ Note: admins MUST sign out + sign back in once`);
  console.log(`  for the custom claim to take effect.`);
  console.log(`========================================\n`);
}

main().catch((err) => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
