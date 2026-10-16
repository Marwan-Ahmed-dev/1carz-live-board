import {
  Timestamp,
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  getCountFromServer,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { BuyerLead } from './types';
import { startOfCairoDay, startOfCairoYesterday } from './cairoDay';
import { logger } from './logger';

const BUYER_LEADS = 'buyer_leads';

function normalizeLead(id: string, data: Record<string, unknown>): BuyerLead {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    phone: typeof data.phone === 'string' ? data.phone : '',
    description: typeof data.description === 'string' ? data.description : '',
    marketer_uid: typeof data.marketer_uid === 'string' ? data.marketer_uid : '',
    marketer_name: typeof data.marketer_name === 'string' ? data.marketer_name : null,
    marketer_phone: typeof data.marketer_phone === 'string' ? data.marketer_phone : null,
    car_id: typeof data.car_id === 'string' ? data.car_id : null,
    car_title: typeof data.car_title === 'string' ? data.car_title : null,
    created_at: (data.created_at as Timestamp) || null,
  };
}

export async function countTodaysBuyerLeads(uid: string): Promise<number> {
  const q = query(
    collection(db, BUYER_LEADS),
    where('marketer_uid', '==', uid),
    where('created_at', '>=', Timestamp.fromDate(startOfCairoDay()))
  );
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export interface AddBuyerLeadInput {
  name: string;
  phone: string;
  description: string;
  marketerName?: string | null;
  marketerPhone?: string | null;
  /** Ignored — limit enforced server-side from users/{uid}.daily_buyer_limit */
  dailyLimit?: number;
  carId: string;
  carTitle: string;
}

/** Create via Admin API — Firestore rules deny client creates (no limit bypass). */
export async function addBuyerLead(input: AddBuyerLeadInput): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('يجب تسجيل الدخول');

  const token = await user.getIdToken();
  const res = await fetch('/api/buyers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: input.name,
      phone: input.phone,
      description: input.description,
      carId: input.carId,
      carTitle: input.carTitle,
      marketerName: input.marketerName ?? null,
      marketerPhone: input.marketerPhone ?? null,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!res.ok) throw new Error(data.error || 'فشل تسجيل المشتري');
  if (!data.id) throw new Error('فشل تسجيل المشتري');
  return data.id;
}

export function subscribeToBuyerLeadsSince(
  since: Date,
  callback: (leads: BuyerLead[]) => void
): () => void {
  const q = query(
    collection(db, BUYER_LEADS),
    where('created_at', '>=', Timestamp.fromDate(since)),
    orderBy('created_at', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => normalizeLead(d.id, d.data() as Record<string, unknown>)));
    },
    (err) => {
      logger.error('buyer_leads subscription error:', err);
      callback([]);
    }
  );
}

export function subscribeToTodaysBuyerLeads(
  callback: (leads: BuyerLead[]) => void
): () => void {
  return subscribeToBuyerLeadsSince(startOfCairoDay(), callback);
}

export function subscribeToYesterdaysBuyerLeads(
  callback: (leads: BuyerLead[]) => void
): () => void {
  const yesterdayStart = startOfCairoYesterday();
  const todayStart = startOfCairoDay();
  const q = query(
    collection(db, BUYER_LEADS),
    where('created_at', '>=', Timestamp.fromDate(yesterdayStart)),
    where('created_at', '<', Timestamp.fromDate(todayStart)),
    orderBy('created_at', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => normalizeLead(d.id, d.data() as Record<string, unknown>)));
    },
    (err) => {
      logger.error('buyer_leads yesterday subscription error:', err);
      callback([]);
    }
  );
}

export function subscribeToLast30DaysBuyerLeads(
  callback: (leads: BuyerLead[]) => void
): () => void {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return subscribeToBuyerLeadsSince(since, callback);
}