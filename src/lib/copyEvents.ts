import {
  Timestamp,
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { startOfCairoDay } from './cairoDay';
import { logger } from './logger';

const COPY_EVENTS = 'copy_events';
const recent = new Map<string, number>();
const DEBOUNCE_MS = 15_000;

export interface PhoneCopyEvent {
  id: string;
  uid: string;
  username: string | null;
  email: string;
  carId: string | null;
  created_at: Timestamp | null;
}

export async function logPhoneCopy(options?: {
  carId?: string;
  username?: string | null;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const key = `${user.uid}:${options?.carId || ''}`;
  const now = Date.now();
  if ((recent.get(key) || 0) > now - DEBOUNCE_MS) return;
  recent.set(key, now);

  try {
    await addDoc(collection(db, COPY_EVENTS), {
      uid: user.uid,
      username: options?.username || null,
      email: user.email || '',
      carId: options?.carId || null,
      created_at: serverTimestamp(),
    });
  } catch (err) {
    logger.warn('[logPhoneCopy] skipped', err);
  }
}

export function subscribeToTodaysCopyEvents(
  callback: (events: PhoneCopyEvent[]) => void
): () => void {
  const q = query(
    collection(db, COPY_EVENTS),
    where('created_at', '>=', Timestamp.fromDate(startOfCairoDay())),
    orderBy('created_at', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            uid: typeof data.uid === 'string' ? data.uid : '',
            username: typeof data.username === 'string' ? data.username : null,
            email: typeof data.email === 'string' ? data.email : '',
            carId: typeof data.carId === 'string' ? data.carId : null,
            created_at: data.created_at || null,
          };
        })
      );
    },
    (err) => {
      logger.error('copy_events subscription error:', err);
      callback([]);
    }
  );
}

export interface CopyLeader {
  uid: string;
  label: string;
  count: number;
}

export function rankCopyLeaders(events: PhoneCopyEvent[]): CopyLeader[] {
  const byUid = new Map<string, CopyLeader>();
  for (const event of events) {
    if (!event.uid) continue;
    const current = byUid.get(event.uid);
    if (current) {
      current.count += 1;
      if (!current.label || current.label.includes('@')) {
        current.label = event.username || event.email || current.label;
      }
    } else {
      byUid.set(event.uid, {
        uid: event.uid,
        label: event.username || event.email || 'مسوّق',
        count: 1,
      });
    }
  }
  return [...byUid.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ar'));
}
