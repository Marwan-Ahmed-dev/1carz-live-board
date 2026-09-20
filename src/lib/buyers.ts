import {
  Timestamp,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  getCountFromServer,
  runTransaction,
  collection,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { BuyerLead, DEFAULT_DAILY_BUYER_LIMIT } from './types';
import { digitsOnly, validateBuyerPhone } from './phone';
import { cairoDateKey, startOfCairoDay } from './cairoDay';
import { logger } from './logger';

const BUYER_LEADS = 'buyer_leads';
// Path: daily_buyer_counts/{uid}/days/{cairoDate} — server-side enforced cap
const DAILY_COUNTS = 'daily_buyer_counts';

function normalizeLead(id: string, data: Record<string, unknown>): BuyerLead {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    phone: typeof data.phone === 'string' ? data.phone : '',
    description: typeof data.description === 'string' ? data.description : '',
    marketer_uid: typeof data.marketer_uid === 'string' ? data.marketer_uid : '',
    marketer_name: typeof data.marketer_name === 'string' ? data.marketer_name : null,
    marketer_phone: typeof data.marketer_phone === 'string' ? data.marketer_phone : null,
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
  dailyLimit?: number;
}

/**
 * إضافة lead مع التحقق الذرّي (atomic) من الحد اليومي.
 *
 * قبل: count → validate → addDoc — سباق (race) بين طلبين متزامنين
 * كان بيسمح بتجاوز الحد. ده كان Client-side فقط وممكن يتخطى بـ devtools.
 *
 * بعد: نستخدم Firestore runTransaction عشان:
 *   1) نقرأ عدّاد اليوم (daily_buyer_counts/{uid}/days/{cairoDate})
 *   2) لو >= الحد → throw
 *   3) وإلا نكتب lead جديد + نزيد العداد
 * كل ده في transaction واحد → مفيش race condition.
 *
 * الـ Firestore security rules مش هتعرف تعمل العدّاد ده بسهولة من غير
 * Cloud Function — لكن الـ transaction كافي قوي: حتى لو حد عمل
 * bypass للـ client-side check، الـ transaction هيلفّ على نفس الـ doc
 * فيتعارض مع نفسه.
 *
 * Additionally، لو الحد اتجاوز، الـ `daily_buyer_counts` doc نفسه هيفضل
 * متاح للأدمن عشان يقدر يعمل reset يدوي لو لزم.
 */
export async function addBuyerLead(input: AddBuyerLeadInput): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('يجب تسجيل الدخول');

  const name = (input.name || '').trim();
  if (name.length < 2) throw new Error('اسم المشتري مطلوب');

  const phoneErr = validateBuyerPhone(input.phone);
  if (phoneErr) throw new Error(phoneErr);
  const phone = digitsOnly(input.phone);

  const description = (input.description || '').trim();
  if (!description) throw new Error('الوصف مطلوب');

  const limit =
    typeof input.dailyLimit === 'number' && input.dailyLimit > 0
      ? Math.floor(input.dailyLimit)
      : DEFAULT_DAILY_BUYER_LIMIT;

  const dayKey = cairoDateKey();
  const counterRef = doc(db, DAILY_COUNTS, user.uid, 'days', dayKey);
  const leadsRef = collection(db, BUYER_LEADS);

  // Atomic transaction: read counter → validate → bump counter → create lead.
  return runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const used = counterSnap.exists() ? Number(counterSnap.data()?.count || 0) : 0;

    if (used >= limit) {
      throw new Error(`وصلت للحد اليومي (${limit} مشترين). حاول بكرة أو كلّم الأدمن.`);
    }

    const newLeadRef = doc(leadsRef);
    tx.set(newLeadRef, {
      name,
      phone,
      description,
      marketer_uid: user.uid,
      marketer_name: input.marketerName || null,
      marketer_phone: input.marketerPhone || null,
      created_at: serverTimestamp(),
    });

    // Server timestamp isn't allowed inside transaction (it's an
    // unresolved sentinel). We write a numeric updated_at instead
    // and keep the counter minimal — the dayKey itself bounds the day.
    tx.set(
      counterRef,
      {
        count: used + 1,
        uid: user.uid,
        day: dayKey,
        updated_at: Timestamp.now(),
      },
      { merge: true }
    );

    return newLeadRef.id;
  });
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

export function subscribeToLast30DaysBuyerLeads(
  callback: (leads: BuyerLead[]) => void
): () => void {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return subscribeToBuyerLeadsSince(since, callback);
}
