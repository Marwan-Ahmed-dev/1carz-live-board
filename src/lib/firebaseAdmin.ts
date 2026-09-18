import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function loadServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  const jsonPath = join(process.cwd(), 'scripts', 'serviceAccountKey.json');
  if (existsSync(jsonPath)) {
    return JSON.parse(readFileSync(jsonPath, 'utf8')) as Record<string, string>;
  }

  throw new Error(
    'إعدادات السيرفر ناقصة. أضف FIREBASE_PROJECT_ID و FIREBASE_CLIENT_EMAIL و FIREBASE_PRIVATE_KEY'
  );
}

function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp({ credential: cert(loadServiceAccount()) });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
