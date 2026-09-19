// تهيئة Firebase Client SDK
// نُهيّئ مرة واحدة فقط على مستوى الـ module (singleton pattern)

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
// H22: App Check — protects Firestore + Storage from anonymous abuse.
// Lazy-loaded so SSR / non-browser environments don't crash.
import type {
  AppCheck as AppCheckType,
  ReCaptchaEnterpriseProvider as ReCaptchaEnterpriseProviderType,
} from 'firebase/app-check';

const requiredEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missingKeys = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);

if (missingKeys.length > 0) {
  throw new Error(
    `Missing required Firebase environment variables: ${missingKeys.join(', ')}. ` +
      'See .env.local.example for the full list.'
  );
}

export const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey!,
  authDomain: requiredEnvVars.authDomain!,
  projectId: requiredEnvVars.projectId!,
  storageBucket: requiredEnvVars.storageBucket!,
  messagingSenderId: requiredEnvVars.messagingSenderId!,
  appId: requiredEnvVars.appId!,
};

// في وضع SSR + CSR، نحتاج إلى التأكد من أن Firebase لا يُهيأ مرتين
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// =========================================================================
// H22: Firebase App Check — defensive initialization.
//
// يشتغل بس لو NEXT_PUBLIC_RECAPTCHA_SITE_KEY موجود + الـ window موجود.
// لو مش موجود، الـ App Check بيتخطّى بالكامل (gracifully degraded).
// ده defensive: المشروع بيشتغل في dev / production من غير App Check لو
// الـ key مش مهيّأ — مش هيتعطل الـ build ولا الـ runtime.
//
// لتفعيله على الإنتاج:
//   1) سجّل reCAPTCHA Enterprise على Google Cloud Console
//   2) أضف NEXT_PUBLIC_RECAPTCHA_SITE_KEY في Vercel env + .env.local
//   3) فعّل App Check enforcement في Firebase Console → App Check
// =========================================================================

let appCheckInstance: AppCheckType | null = null;
let appCheckInitialized = false;

export function getAppCheck(): AppCheckType | null {
  return appCheckInstance;
}

export function initAppCheck(): void {
  if (appCheckInitialized) return;
  appCheckInitialized = true;
  if (typeof window === 'undefined') return; // SSR-safe

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    console.info(
      '[firebase] NEXT_PUBLIC_RECAPTCHA_SITE_KEY not set — App Check disabled. ' +
        'See firestore.rules / H22 docs to enable on prod.'
    );
    return;
  }

  // Lazy import so SSR doesn't pull in app-check DOM code.
  void import('firebase/app-check').then((mod) => {
    try {
      const provider = new mod.ReCaptchaEnterpriseProvider(siteKey);
      appCheckInstance = mod.initializeAppCheck(app, {
        provider,
        // auto-refresh in background — tokens last ~1h, refresh every ~50min.
        isTokenAutoRefreshEnabled: true,
      });
      console.info('[firebase] App Check initialized (reCAPTCHA Enterprise)');
    } catch (err) {
      console.warn('[firebase] App Check init failed (non-fatal):', err);
      appCheckInstance = null;
    }
  });
}

export default app;
