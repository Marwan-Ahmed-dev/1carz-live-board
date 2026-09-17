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

export async function countAssignedCars(uid: string): Promise<number> {
  const ref = collection(db, 'cars');
  const snap = await getDocs(ref);
  return snap.docs.filter((d) => {
    const assigned = d.data().assigned_to || [];
    return assigned.includes(uid) || assigned.includes('all');
  }).length;
}
