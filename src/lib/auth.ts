// دوال مساعدة للمصادقة (Auth)

import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { AppUser } from './types';
import { normalizeUsernameKey } from './users';

/**
 * تسجيل الدخول بـ email/password
 * rememberMe=true → يبقى مسجّل بعد إغلاق المتصفح
 */
export async function signIn(
  email: string,
  password: string,
  rememberMe: boolean = true
): Promise<User> {
  if (!email || !password) {
    throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان');
  }
  if (password.length < 6) {
    throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
  }
  try {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (err: any) {
    const code = err?.code || '';
    if (
      code === 'auth/user-not-found' ||
      code === 'auth/wrong-password' ||
      code === 'auth/invalid-credential'
    ) {
      throw new Error('بيانات الدخول غير صحيحة');
    }
    if (code === 'auth/too-many-requests') {
      throw new Error('تم حظر الحساب مؤقتاً بسبب محاولات دخول متكررة');
    }
    if (code === 'auth/network-request-failed') {
      throw new Error('خطأ في الاتصال بالإنترنت');
    }
    throw new Error(err?.message || 'فشل تسجيل الدخول');
  }
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

export async function getUserData(uid: string): Promise<AppUser | null> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as AppUser;
}

/**
 * إنشاء وثيقة المستخدم بعد أول دخول، وحجز اسم المستخدم القديم إن وُجد.
 */
export async function ensureUserDoc(user: User): Promise<AppUser> {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const newUser: AppUser = {
      uid: user.uid,
      email: user.email || '',
      username: null,
      onboarded_at: null,
      created_at: serverTimestamp() as any,
      last_seen: serverTimestamp() as any,
    };
    await setDoc(ref, newUser);
    return newUser;
  }
  await updateDoc(ref, { last_seen: serverTimestamp() });
  const data = snap.data() as AppUser;
  if (data.username) {
    await claimExistingUsername(user.uid, data.username);
  }
  return data;
}

async function claimExistingUsername(uid: string, username: string): Promise<void> {
  const key = normalizeUsernameKey(username);
  if (!key) return;
  const unameRef = doc(db, 'usernames', key);
  try {
    const existing = await getDoc(unameRef);
    if (!existing.exists()) {
      await setDoc(unameRef, {
        uid,
        username,
        created_at: serverTimestamp(),
      });
    }
  } catch (err) {
    console.error('Failed to claim existing username', err);
  }
}

/**
 * حفظ اسم المستخدم داخل transaction عشان الاسم ما يتكررش.
 */
export async function saveUsername(uid: string, username: string): Promise<void> {
  const trimmed = username.trim();
  const key = normalizeUsernameKey(trimmed);
  if (!key) {
    throw new Error('اسم المستخدم غير صالح');
  }
  const userRef = doc(db, 'users', uid);
  const unameRef = doc(db, 'usernames', key);

  await runTransaction(db, async (tx) => {
    const reserved = await tx.get(unameRef);
    if (reserved.exists() && reserved.data()?.uid !== uid) {
      throw new Error('اسم المستخدم مستخدم بالفعل، جرب اسماً آخر');
    }
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) {
      throw new Error('حساب المستخدم غير موجود');
    }
    const currentName = userSnap.data()?.username;
    if (currentName && normalizeUsernameKey(currentName) !== key) {
      throw new Error('لا يمكن تغيير اسم المستخدم بعد اختياره');
    }
    tx.set(unameRef, {
      uid,
      username: trimmed,
      created_at: serverTimestamp(),
    });
    tx.update(userRef, {
      username: trimmed,
      onboarded_at: serverTimestamp(),
      last_seen: serverTimestamp(),
    });
  });
}

export function watchAuth(callback: (user: unknown) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function checkIsAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;
  const tokenResult = await user.getIdTokenResult();
  return tokenResult.claims?.role === 'admin';
}

export async function refreshClaims(): Promise<{ isAdmin: boolean }> {
  const user = auth.currentUser;
  if (!user) return { isAdmin: false };
  const tokenResult = await user.getIdTokenResult(true);
  return { isAdmin: tokenResult.claims?.role === 'admin' };
}
