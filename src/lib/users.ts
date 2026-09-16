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
import { db } from './firebase';
import { AppUser } from './types';

const USERS_COLLECTION = 'users';

/**
 * تحويل DocumentData إلى AppUser
 */
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

/**
 * جلب كل المستخدمين (لـ admin فقط)
 */
export async function fetchAllUsers(): Promise<AppUser[]> {
  const ref = collection(db, USERS_COLLECTION);
  const snap = await getDocs(ref);
  return snap.docs.map(normalizeUser);
}

/**
 * جلب المستخدمين الذين اختاروا username فقط
 */
export async function fetchOnboardedUsers(): Promise<AppUser[]> {
  const ref = collection(db, USERS_COLLECTION);
  const q = query(ref, where('username', '!=', null));
  const snap = await getDocs(q);
  return snap.docs.map(normalizeUser);
}

/**
 * التحقق من توفر اسم المستخدم (uniqueness check)
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  if (!username || username.length < 3) return false;
  const ref = collection(db, USERS_COLLECTION);
  const q = query(ref, where('username', '==', username));
  const snap = await getDocs(q);
  return snap.empty;
}

/**
 * Real-time listener على كل المستخدمين
 */
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

/**
 * تحديث last_seen عند فتح التطبيق
 */
export async function touchLastSeen(uid: string): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, uid);
  await updateDoc(ref, { last_seen: serverTimestamp() });
}

/**
 * البحث عن مستخدم بالـ username
 */
export async function findUserByUsername(username: string): Promise<AppUser | null> {
  const ref = collection(db, USERS_COLLECTION);
  const q = query(ref, where('username', '==', username));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return normalizeUser(snap.docs[0]);
}

/**
 * جلب عداد العربيات المخصصة لمستخدم معين
 */
export async function countAssignedCars(username: string): Promise<number> {
  // نستخدم client-side filter لأن Firestore ما يدعمش array contains OR بشكل مريح
  // للـ MVP نُرجع كل العربيات ونحسب client-side
  const ref = collection(db, 'cars');
  const snap = await getDocs(ref);
  return snap.docs.filter((d) => {
    const assigned = d.data().assigned_to || [];
    return assigned.includes(username) || assigned.includes('all');
  }).length;
}