/**
 * Set admin custom claim for a user
 *
 * Usage:
 *   1. Get your service account key from Firebase Console:
 *      Project Settings > Service Accounts > Generate New Private Key
 *   2. Save it as scripts/serviceAccountKey.json
 *   3. Run: node scripts/set-admin.js <email>
 *
 *   Or with env vars:
 *   FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=... FIREBASE_PRIVATE_KEY=... node scripts/set-admin.js <email>
 */

const admin = require('firebase-admin');
const path = require('path');

const EMAIL = process.argv[2];

if (!EMAIL) {
  console.error('Usage: node scripts/set-admin.js <email>');
  process.exit(1);
}

async function main() {
  // Load credentials
  let credential;
  try {
    const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
    credential = admin.credential.cert(serviceAccount);
  } catch (e) {
    // Fall back to env vars
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      console.error('Missing credentials.');
      console.error('Either:');
      console.error('  1. Save your service account as scripts/serviceAccountKey.json');
      console.error('  2. Or set env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
      process.exit(1);
    }
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential });
  }

  try {
    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(EMAIL);
    console.log(`Found user: ${userRecord.uid} (${userRecord.email})`);

    // Set admin custom claim
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });
    console.log(`✓ Successfully set admin role for ${EMAIL}`);

    // Verify
    const updated = await admin.auth().getUser(userRecord.uid);
    console.log(`Current claims:`, updated.customClaims);

    console.log('\n⚠️  The user must sign out and sign back in for the claim to take effect.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }

  process.exit(0);
}

main();