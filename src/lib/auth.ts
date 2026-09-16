// دوال مساعدة للمصادقة (Auth)
// نُبسّط واجهة Firebase Auth ونضيف دوال مخصصة لمتطلبات المشروع

import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { AppUser } from './types';

/**
 * تسجيل الدخول بـ email/password
 * يرج الـ User object في حالة النجاح، أو يرمي Error في حالة الفشل
 */
export async function signIn(email: string, password: string): Promise<User> {
  if (!email || !password) {
    throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان');
  }
  if (password.length < 6) {
    throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
  }
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (err: any) {
    // ترجمة رسائل الخطأ الشائعة للعربية
    const code = err?.code || '';
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
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

/**
 * تسجيل الخروج
 */
export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * الحصول على بيانات المستخدم من Firestore
 * يُرجع null إذا لم يكن هناك وثيقة (سيتم إنشاؤها تلقائياً عند الدخول)
 */
export async function getUserData(uid: string): Promise<AppUser | null> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as AppUser;
}

/**
 * إنشاء وثيقة المستخدم في Firestore بعد أول دخول
 * (لا نُنشئ username هنا، فقط البيانات الأساسية)
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
  // تحديث last_seen
  await updateDoc(ref, { last_seen: serverTimestamp() });
  return snap.data() as AppUser;
}

/**
 * حفظ اسم المستخدم (يُستدعى في onboarding)
 * يتحقق من uniqueness ويُحدّث الوثيقة
 */
export async function saveUsername(uid: string, username: string): Promise<void> {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, {
    username,
    onboarded_at: serverTimestamp(),
    last_seen: serverTimestamp(),
  });
}

/**
 * الاشتراك في تغييرات الـ Auth state
 * يستدعي callback في كل تغيير (login / logout / token refresh)
 */
export function watchAuth(callback: (user: unknown) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * التحقق من أن المستخدم admin
 * (عن طريق custom claim)
 */
export function checkIsAdmin(user: User | null): boolean {
  if (!user) return false;
  const tokenResult = user as unknown as { customClaims?: { role?: string } };
  // customClaims قد تكون undefined عند أول تحميل
  const claims = (user as any).customClaims;
  return claims?.role === 'admin';
}

/**
 * إعادة تحميل الـ custom claims (مفيد بعد ترقية مستخدم إلى admin)
 */
export async function refreshClaims(): Promise<{ isAdmin: boolean }> {
  const user = auth.currentUser;
  if (!user) return { isAdmin: false };
  const tokenResult = await user.getIdTokenResult(true); // force refresh
  return { isAdmin: tokenResult.claims?.role === 'admin' };
}