import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { UserGroup } from './types';
import { logger } from './logger';

const GROUPS_COLLECTION = 'groups';

function normalizeGroup(snap: { id: string; data: () => Record<string, unknown> }): UserGroup {
  const data = snap.data() || {};
  const members = Array.isArray(data.memberUids)
    ? (data.memberUids as unknown[]).filter((u): u is string => typeof u === 'string')
    : [];
  return {
    id: snap.id,
    name: typeof data.name === 'string' ? data.name : '',
    memberUids: members,
    created_at: (data.created_at as UserGroup['created_at']) || null,
    updated_at: (data.updated_at as UserGroup['updated_at']) || null,
  };
}

export function subscribeToGroups(callback: (groups: UserGroup[]) => void): () => void {
  const ref = collection(db, GROUPS_COLLECTION);
  return onSnapshot(
    ref,
    (snap) => {
      const groups = snap.docs
        .map((d) => normalizeGroup(d))
        .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      callback(groups);
    },
    (err) => {
      logger.error('Groups subscription error:', err);
      callback([]);
    }
  );
}

export async function createGroup(name: string, memberUids: string[] = []): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('اسم المجموعة مطلوب');
  const ref = await addDoc(collection(db, GROUPS_COLLECTION), {
    name: trimmed,
    memberUids,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updateGroup(
  id: string,
  patch: { name?: string; memberUids?: string[] }
): Promise<void> {
  const data: Record<string, unknown> = { updated_at: serverTimestamp() };
  if (typeof patch.name === 'string') {
    const trimmed = patch.name.trim();
    if (!trimmed) throw new Error('اسم المجموعة مطلوب');
    data.name = trimmed;
  }
  if (Array.isArray(patch.memberUids)) {
    data.memberUids = Array.from(new Set(patch.memberUids));
  }
  await updateDoc(doc(db, GROUPS_COLLECTION, id), data);
}

export async function deleteGroup(id: string): Promise<void> {
  await deleteDoc(doc(db, GROUPS_COLLECTION, id));
}
