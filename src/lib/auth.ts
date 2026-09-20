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
import { normalizeUsernameKey, validateUsername } from './users';
import { validatePhone } from './phone';
import { logger } from './logger';
import type { FieldValue, Timestamp } from 'firebase/firestore';

/**
 * Cast serverTimestamp() sentinel to the stored Timestamp | null type.
 * Firestore resolves the sentinel on commit — the cast is only for type
 * compatibility with AppUser's stricter Timestamp | null shape.
 */
function asStoredTs(sentinel: FieldValue): Timestamp | null {
  return sentinel as unknown as Timestamp | null;
}

/**
 * Narrow Firebase AuthError into a string code (e.g. "auth/wrong-password").
 * Falls back to empty string for unknown error shapes.
 */
function authErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return '';
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/**
 * H9: throttled last_seen writer.
 * الـ onAuthStateChanged بيشتغل كل مرة الـ token بيتجدد + كل navigation،
 * وكنا بنكتب users/{uid}.last_seen مع كل call. ده كان بيرفع writes
 * بشكل ملحوظ (خصوصاً مع Strict Mode في dev والـ focus events).
 * الحل: throttling في-memory مع TTL=30s + persisted cache في localStorage
 * (عشان لو الـ tab اتقفل ورجع، منكتبش تاني فوراً).
 */
const LAST_SEEN_TTL_MS = 30_000;
const LAST_SEEN_KEY_PREFIX = 'lastSeen:';

function readLastSeenTimestamp(uid: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(LAST_SEEN_KEY_PREFIX + uid);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeLastSeenTimestamp(uid: string, ts: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_SEEN_KEY_PREFIX + uid, String(ts));
  } catch {
    /* ignore quota errors */
  }
}

/**
 * Fire-and-forget update for users/{uid}.last_seen with a 30s in-memory
 * + localStorage throttle so we don't burn Firestore writes on every
 * onAuthStateChanged emission.
 */
function scheduleLastSeenUpdate(uid: string): void {
  const now = Date.now();
  const last = readLastSeenTimestamp(uid);
  if (now - last < LAST_SEEN_TTL_MS) return;
  writeLastSeenTimestamp(uid, now);
  // fire-and-forget — ما نكتررش الـ promise في الـ caller
  updateDoc(doc(db, 'users', uid), { last_seen: serverTimestamp() }).catch((err) => {
    logger.warn('[scheduleLastSeenUpdate] failed (non-fatal):', err);
    // rollback the throttle so we can retry next time
    writeLastSeenTimestamp(uid, last);
  });
}

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
  } catch (err: unknown) {
    const code = authErrorCode(err);
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
    throw new Error(errorMessage(err, 'فشل تسجيل الدخول'));
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
 *
 * H9: الـ last_seen في أول doc creation بيتكتب مرة واحدة (الـ doc جديد).
 * الـ subsequent updates بتـ throttle (30s) عشان ما نكتبش في كل auth event.
 */
export async function ensureUserDoc(user: User): Promise<AppUser> {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const newUser = {
      uid: user.uid,
      email: user.email || '',
      username: null,
      onboarded_at: null,
      created_at: asStoredTs(serverTimestamp()),
      last_seen: asStoredTs(serverTimestamp()),
    } satisfies Omit<AppUser, 'phone' | 'role' | 'daily_buyer_limit'>;
    await setDoc(ref, newUser);
    // أول ظهور — ثبّت الـ timestamp في localStorage عشان أول refresh بعد كده يـ throttle
    writeLastSeenTimestamp(user.uid, Date.now());
    return newUser;
  }
  // H9: throttled — مش بنكتب في كل auth event
  scheduleLastSeenUpdate(user.uid);
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
    logger.error('Failed to claim existing username', err);
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

export async function refreshClaims(): Promise<{ isAdmin: boolean; isInspector: boolean }> {
  const user = auth.currentUser;
  if (!user) return { isAdmin: false, isInspector: false };
  const tokenResult = await user.getIdTokenResult(true);
  const role = tokenResult.claims?.role;
  return { isAdmin: role === 'admin', isInspector: role === 'inspector' };
}

/**
 * إنشاء حساب مستخدم أو أدمن من لوحة التحكم عبر Firebase Admin على السيرفر.
 */
export async function createUserByAdmin(params: {
  name: string;
  email: string;
  password: string;
  phone: string;
  role?: 'admin' | 'user' | 'inspector';
  groupId?: string;
  daily_buyer_limit?: number;
}): Promise<AppUser> {
  const nameErr = validateUsername(params.name);
  if (nameErr) throw new Error(nameErr);

  const email = params.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('البريد الإلكتروني غير صالح');
  }
  if (!params.password || params.password.length < 6) {
    throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
  }
  const phoneErr = validatePhone(params.phone || '');
  if (phoneErr) throw new Error(phoneErr);

  const current = auth.currentUser;
  if (!current) throw new Error('يجب تسجيل الدخول');

  const token = await current.getIdToken(true);
  let res: Response;
  try {
    res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: params.name,
        email,
        password: params.password,
        phone: params.phone,
        role: params.role || 'user',
        groupId: params.groupId || '',
        daily_buyer_limit: params.daily_buyer_limit,
      }),
    });
  } catch {
    throw new Error('تعذر الاتصال بالسيرفر لإنشاء الحساب');
  }

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    uid?: string;
    username?: string;
    role?: 'admin' | 'user' | 'inspector';
    phone?: string;
    daily_buyer_limit?: number;
  };

  if (!res.ok) {
    throw new Error(data.error || 'فشل إنشاء الحساب');
  }

  return {
    uid: data.uid || '',
    email,
    username: data.username || params.name.trim(),
    phone: data.phone || params.phone,
    role: data.role,
    daily_buyer_limit: data.daily_buyer_limit,
    onboarded_at: null,
    created_at: null,
    last_seen: null,
  };
}
