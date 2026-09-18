// دوال مساعدة لإدارة المستخدمين (users collection)

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { AppUser } from './types';

const USERS_COLLECTION = 'users';
const USERNAMES_COLLECTION = 'usernames';

function normalizeUser(snap: any): AppUser {
  const data = snap.data();
  return {
    uid: data.uid || snap.id,
    email: data.email || '',
    username: data.username || null,
    onboarded_at: data.onboarded_at || null,
    created_at: data.created_at || null,
    last_seen: data.last_seen || null,
  } as AppUser;
}

/** مفتاح فريد غير حساس لحالة الأحرف، المسافات المتعددة تتحول لشرطة سفلية */
export function normalizeUsernameKey(username: string): string {
  return username.trim().replace(/\s+/g, '_').toLowerCase();
}

/** التحقق من اسم المستخدم (نفس قواعد صفحة الـ onboarding) */
export function validateUsername(val: string): string | null {
  const trimmed = val.trim();
  if (trimmed.length < 3) return 'الاسم يجب أن يكون 3 أحرف على الأقل';
  if (trimmed.length > 20) return 'الاسم يجب ألا يزيد عن 20 حرف';
  if (!/^[\u0600-\u06FFa-zA-Z0-9\s]+$/.test(trimmed)) {
    return 'الاسم يجب أن يحتوي على حروف عربية أو إنجليزية وأرقام ومسافات فقط';
  }
  return null;
}

export async function fetchAllUsers(): Promise<AppUser[]> {
  const ref = collection(db, USERS_COLLECTION);
  const snap = await getDocs(ref);
  return snap.docs.map(normalizeUser);
}

export async function fetchOnboardedUsers(): Promise<AppUser[]> {
  const ref = collection(db, USERS_COLLECTION);
  const q = query(ref, where('username', '!=', null));
  const snap = await getDocs(q);
  return snap.docs.map(normalizeUser);
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  if (!username || username.length < 3) return false;
  const key = normalizeUsernameKey(username);
  if (!key) return false;
  const snap = await getDoc(doc(db, USERNAMES_COLLECTION, key));
  return !snap.exists();
}

export function subscribeToUsers(callback: (users: AppUser[]) => void): () => void {
  const ref = collection(db, USERS_COLLECTION);
  return onSnapshot(
    ref,
    (snap) => {
      callback(snap.docs.map(normalizeUser));
    },
    (err) => {
      console.error('Users subscription error:', err);
      callback([]);
    }
  );
}

export async function touchLastSeen(uid: string): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, uid);
  await updateDoc(ref, { last_seen: serverTimestamp() });
}

export async function findUserByUsername(username: string): Promise<AppUser | null> {
  const key = normalizeUsernameKey(username);
  const reserved = await getDoc(doc(db, USERNAMES_COLLECTION, key));
  if (!reserved.exists()) return null;
  const uid = reserved.data()?.uid as string | undefined;
  if (!uid) return null;
  const userSnap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!userSnap.exists()) return null;
  return normalizeUser(userSnap);
}

/**
 * حذف حساب مستخدم من لوحة الأدمن (Auth + بيانات Firestore).
 * يحتاج مسار API على السيرفر لأن الـ client SDK لا يحذف حسابات الآخرين.
 */
export async function deleteUserByAdmin(target: AppUser): Promise<void> {
  const current = auth.currentUser;
  if (!current) throw new Error('يجب تسجيل الدخول');
  if (current.uid === target.uid) {
    throw new Error('لا يمكن حذف حسابك');
  }

  const token = await current.getIdToken();
  let res: Response;
  try {
    res = await fetch(`/api/admin/users/${encodeURIComponent(target.uid)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error('تعذر الاتصال بالسيرفر لحذف الحساب');
  }

  if (res.ok) return;

  let message = 'فشل حذف الحساب';
  try {
    const data = (await res.json()) as { error?: string };
    if (typeof data?.error === 'string' && data.error) message = data.error;
  } catch {
    if (res.status === 404) {
      message = 'حذف الحساب غير متاح على هذا الإصدار من التطبيق';
    }
  }
  throw new Error(message);
}

export async function countAssignedCars(uid: string): Promise<number> {
  const ref = collection(db, 'cars');
  const snap = await getDocs(ref);
  return snap.docs.filter((d) => {
    const assigned = d.data().assigned_to || [];
    return assigned.includes(uid) || assigned.includes('all');
  }).length;
}
