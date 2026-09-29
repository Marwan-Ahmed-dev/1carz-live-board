// Debug script: check Firestore data (using same pattern as seed script)
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const here = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = resolve(here, 'serviceAccountKey.json');

const serviceAccount = JSON.parse(
  readFileSync(serviceAccountPath, 'utf8')
);

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

async function main() {
  console.log('=== Cars Collection ===\n');
  const carsSnap = await db.collection('cars').get();
  console.log(`Total cars: ${carsSnap.size}\n`);

  for (const car of carsSnap.docs) {
    const data = car.data();
    console.log(`ID: ${car.id}`);
    console.log(`  Title: ${data.title || '(no title)'}`);
    console.log(`  Code: ${data.code || '(no code)'}`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Priority: ${data.priority}`);
    console.log(`  Assigned to:`, JSON.stringify(data.assigned_to));
    console.log(`  Condition: ${data.condition}`);
    console.log(`  Image URL: ${data.image_url ? data.image_url.substring(0, 60) + '...' : '(empty)'}`);
    console.log(`  Additional images: ${(data.additional_images || []).length}`);
    console.log(`  Sort mode: ${data.sort_mode || 'N/A'}`);
    console.log('---');
  }

  console.log('\n=== Users Collection ===\n');
  const usersSnap = await db.collection('users').get();
  console.log(`Total users: ${usersSnap.size}\n`);

  let i = 0;
  for (const user of usersSnap.docs) {
    const data = user.data();
    console.log(`UID: ${user.id}`);
    console.log(`  Email: ${data.email}`);
    console.log(`  Username: ${data.username || '(not set)'}`);
    console.log(`  Onboarded: ${data.onboarded_at ? 'yes' : 'no'}`);
    console.log('---');
    if (++i >= 5) {
      console.log(`... and ${usersSnap.size - 5} more users`);
      break;
    }
  }
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
