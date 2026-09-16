// تهيئة Firebase Client SDK
// نُهيّئ مرة واحدة فقط على مستوى الـ module (singleton pattern)

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDNMKJcOfLLaOkVKkurzFxIPRw33Voujas',
  authDomain: 'carz-live-board.firebaseapp.com',
  projectId: 'carz-live-board',
  storageBucket: 'carz-live-board.firebasestorage.app',
  messagingSenderId: '311046964099',
  appId: '1:311046964099:web:c21eedce2a9c049c4a2cb6',
};

// في وضع SSR + CSR، نحتاج إلى التأكد من أن Firebase لا يُهيأ مرتين
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// نضبط persistence على browserLocalPersistence عشان "تذكرني" يشتغل
// هذا الـ setPersistence يُستدعى مرة واحدة عند أول تحميل
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error('Failed to set auth persistence:', err);
  });
}

export default app;