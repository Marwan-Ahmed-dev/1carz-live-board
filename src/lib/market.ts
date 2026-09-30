/**
 * Market Registry — طبقة الـ data layer للـ /market/* section.
 *
 * المجموعات في Firestore:
 *   - `market_registry/{entryId}` — entries الـ synced.
 *
 * الـ offline-first model:
 *   - الـ reads: cache-first (IndexedDB) → Firestore subscription.
 *   - الـ writes: enqueue للـ IndexedDB pending queue فوراً (يرجع على طول)
 *     → sync loop يحاول يدفعهم لـ Firestore.
 *
 * الـ access control (server-side):
 *   - الـ Firestore rules بتحدد إن فقط الـ users اللي role='source'
 *     (أو admin) يقدروا يعملوا read/write على الـ collection.
 *   - الـ client-side layout (`/market/layout.tsx`) بيعمل redirect لليوزر
 *     اللي مش source.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  limit,
  QueryConstraint,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  MarketEntry,
  MarketEntryInput,
  PendingMarketEntry,
} from './types';
import {
  getCachedEntries,
  putCachedEntry,
  replaceCachedEntries,
  getPendingEntries,
  removePendingEntry,
  updatePendingEntryError,
  getPendingCount,
} from './offlineQueue';
import { logger } from './logger';

const MARKET_COLLECTION = 'market_registry';
const SUBSCRIPTION_LIMIT = 1500; // أكبر من الـ cache cap لحد ما الـ server filter يشتغل

// ============================================================================
// normalize / typing
// ============================================================================

/**
 * تحويل Firestore DocumentSnapshot إلى MarketEntry.
 * الـ id بنستخرجه من الـ snap نفسه — الـ doc data تحتوي على كل fields
 * المطلوبة (brand/model/year/trim/paint_condition/mileage_km/maintenance/...).
 */
function normalizeMarketEntry(snap: DocumentData): MarketEntry {
  const data = snap.data() || {};
  return {
    id: snap.id,
    brand: typeof data.brand === 'string' ? data.brand : '',
    model: typeof data.model === 'string' ? data.model : '',
    year: typeof data.year === 'number' ? data.year : Number(data.year) || 0,
    trim: typeof data.trim === 'string' ? data.trim : '',
    paint_condition: typeof data.paint_condition === 'string' ? data.paint_condition : '',
    mileage_km:
      typeof data.mileage_km === 'number' ? data.mileage_km : Number(data.mileage_km) || 0,
    maintenance: typeof data.maintenance === 'string' ? data.maintenance : '',
    price_egp: typeof data.price_egp === 'number' ? data.price_egp : Number(data.price_egp) || 0,
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    is_zero: data.is_zero === true,
    recorded_by_uid: typeof data.recorded_by_uid === 'string' ? data.recorded_by_uid : '',
    recorded_by_name:
      typeof data.recorded_by_name === 'string' ? data.recorded_by_name : null,
    created_at: (data.created_at as Timestamp | null | undefined) ?? null,
    updated_at: (data.updated_at as Timestamp | null | undefined) ?? null,
    synced_at: (data.synced_at as Timestamp | null | undefined) ?? null,
  };
}

// ============================================================================
// Reads
// ============================================================================

/**
 * اشتراك في الـ live snapshot من Firestore.
 * الـ callback بياخد entries المفلترة بعد الـ server-side rules.
 *
 * ملاحظات:
 *  - الـ order by `created_at desc` بيتطلب composite index (معرّف في
 *    firestore.indexes.json).
 *  - بنعمل `limit(SUBSCRIPTION_LIMIT)` عشان نمنع الـ OOM لو الـ collection
 *    ضخم جداً. الـ UI بيعرض pagination فوق النتائج.
 *  - في حالة الـ error، الـ onError callback بياخد الـ error عشان نعرض
 *    empty state بدل ما نـ crash الـ page.
 */
export function subscribeToMarketEntries(
  callback: (entries: MarketEntry[]) => void,
  options: {
    onError?: (err: Error) => void;
  } = {}
): () => void {
  const ref = collection(db, MARKET_COLLECTION);
  const constraints: QueryConstraint[] = [orderBy('created_at', 'desc'), limit(SUBSCRIPTION_LIMIT)];
  const q = query(ref, ...constraints);

  return onSnapshot(
    q,
    async (snap) => {
      const entries = snap.docs.map(normalizeMarketEntry);
      callback(entries);
      // نحدّث الـ cache في الخلفية — مش بنـ await عشان نرجع بسرعة.
      void replaceCachedEntries(entries).catch((err) => {
        logger.warn('[market] cache refresh failed:', err);
      });
    },
    (err) => {
      logger.error('[market] subscribeToMarketEntries error:', err);
      options.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

/** جلب الـ entries المخزّنة في الـ cache (offline read). */
export async function getCachedMarketEntries(): Promise<MarketEntry[]> {
  return getCachedEntries();
}

/** جلب entry واحد (من الـ cache كـ fast path، أو من Firestore). */
export async function getMarketEntry(id: string): Promise<MarketEntry | null> {
  // نحاول الـ cache أولاً
  const cached = await getCachedEntries();
  const hit = cached.find((e) => e.id === id);
  if (hit) return hit;
  // نروح لـ Firestore
  try {
    const snap = await getDoc(doc(db, MARKET_COLLECTION, id));
    if (!snap.exists()) return null;
    const entry = normalizeMarketEntry(snap);
    await putCachedEntry(entry);
    return entry;
  } catch (err) {
    logger.warn('[market] getMarketEntry fetch failed:', err);
    return null;
  }
}

/** fetch كل الـ entries مرة واحدة (للـ debug / admin). */
export async function fetchAllMarketEntries(): Promise<MarketEntry[]> {
  const ref = collection(db, MARKET_COLLECTION);
  const snap = await getDocs(ref);
  return snap.docs.map(normalizeMarketEntry);
}

// ============================================================================
// Writes — online (Firestore direct)
// ============================================================================

export interface AddMarketEntryResult {
  id: string;
  /** true لو انكتب بنجاح على Firestore؛ false لو اتحفظ في الـ pending queue بس. */
  synced: boolean;
  /** client_id المولّد لو اتحفظ في الـ pending queue (بيساوي id لو synced). */
  client_id: string;
}

/**
 * إضافة entry للسجل السعري.
 *
 * الـ strategy:
 *  1. نحاول نكتب على Firestore مباشرة (لو online + الـ rules مظبوطة).
 *  2. لو الـ write فشل (offline / network error / permission) → بنحفظ
 *     في الـ pending queue ونرجع `synced: false`.
 *
 * الـ caller يقدر يفحص `synced` عشان يعرض toast مناسب.
 */
export async function addMarketEntry(
  input: MarketEntryInput,
  meta: {
    recorded_by_uid: string;
    recorded_by_name?: string | null;
  }
): Promise<AddMarketEntryResult> {
  // تنظيف + validation خفيف قبل ما نبعت
  const payload = buildPayload(input, meta);
  try {
    const docRef = await addDoc(collection(db, MARKET_COLLECTION), {
      ...payload,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      synced_at: serverTimestamp(),
    });
    return { id: docRef.id, client_id: docRef.id, synced: true };
  } catch (err) {
    logger.warn('[market] addMarketEntry online write failed, queueing:', err);
    const queued = await enqueuePendingEntry(input, meta, err);
    return { id: '', client_id: queued.client_id, synced: false };
  }
}

/** تحديث entry موجود (online only — الـ offline updates مش مدعومة في الـ v1). */
export async function updateMarketEntry(
  id: string,
  input: MarketEntryInput,
  meta: {
    recorded_by_uid: string;
    recorded_by_name?: string | null;
  }
): Promise<void> {
  const payload = buildPayload(input, meta);
  await updateDoc(doc(db, MARKET_COLLECTION, id), {
    ...payload,
    updated_at: serverTimestamp(),
  });
}

/** حذف entry (online only). */
export async function deleteMarketEntry(id: string): Promise<void> {
  await deleteDoc(doc(db, MARKET_COLLECTION, id));
}

// ============================================================================
// Pending queue integration
// ============================================================================

async function enqueuePendingEntry(
  input: MarketEntryInput,
  meta: { recorded_by_uid: string; recorded_by_name?: string | null },
  originalError?: unknown
): Promise<PendingMarketEntry> {
  const { putPendingEntry } = await import('./offlineQueue');
  const queued: PendingMarketEntry = {
    client_id: makeClientId(),
    brand: input.brand.trim(),
    model: input.model.trim(),
    year: input.year,
    trim: input.trim.trim(),
    paint_condition: input.paint_condition.trim(),
    mileage_km: input.mileage_km,
    maintenance: input.maintenance.trim(),
    price_egp: input.price_egp,
    notes: input.notes?.trim() || undefined,
    is_zero: input.is_zero === true,
    recorded_by_uid: meta.recorded_by_uid,
    recorded_by_name: meta.recorded_by_name ?? null,
    queued_at: Date.now(),
    last_error: originalError ? extractMessage(originalError) : null,
  };
  await putPendingEntry(queued);
  return queued;
}

/**
 * يدفع كل الـ pending entries إلى Firestore.
 * بترجع { synced, failed, remaining }.
 *
 * الـ logic:
 *  - لكل pending entry بنعمل addDoc جديد على Firestore (لأن الـ client_id
 *    مش Firestore doc id — الـ Firestore هو الـ source of truth).
 *  - بعد النجاح بنمسح الـ entry من الـ queue.
 *  - بعد الفشل بنحدّث `last_error` ونتركه في الـ queue.
 */
export async function syncPendingEntries(): Promise<{
  synced: number;
  failed: number;
  remaining: number;
}> {
  const pending = await getPendingEntries();
  if (pending.length === 0) {
    return { synced: 0, failed: 0, remaining: 0 };
  }

  let synced = 0;
  let failed = 0;
  for (const entry of pending) {
    try {
      const payload = buildPayload(
        {
          brand: entry.brand,
          model: entry.model,
          year: entry.year,
          trim: entry.trim,
          paint_condition: entry.paint_condition,
          mileage_km: entry.mileage_km,
          maintenance: entry.maintenance,
          price_egp: entry.price_egp,
          notes: entry.notes,
          is_zero: entry.is_zero,
        },
        {
          recorded_by_uid: entry.recorded_by_uid,
          recorded_by_name: entry.recorded_by_name ?? null,
        }
      );
      await addDoc(collection(db, MARKET_COLLECTION), {
        ...payload,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        synced_at: serverTimestamp(),
      });
      await removePendingEntry(entry.client_id);
      synced++;
    } catch (err) {
      failed++;
      const msg = extractMessage(err);
      await updatePendingEntryError(entry.client_id, msg);
      logger.warn('[market] syncPendingEntries: entry failed', { client_id: entry.client_id, msg });
    }
  }

  const remaining = await getPendingCount();
  return { synced, failed, remaining };
}

// ============================================================================
// utilities
// ============================================================================

function buildPayload(
  input: MarketEntryInput,
  meta: { recorded_by_uid: string; recorded_by_name?: string | null }
): Record<string, unknown> {
  return {
    brand: input.brand.trim(),
    model: input.model.trim(),
    year: input.year,
    trim: input.trim.trim(),
    paint_condition: input.paint_condition.trim(),
    mileage_km: input.mileage_km,
    maintenance: input.maintenance.trim(),
    price_egp: input.price_egp,
    notes: input.notes?.trim() || null,
    is_zero: input.is_zero === true,
    recorded_by_uid: meta.recorded_by_uid,
    recorded_by_name: meta.recorded_by_name ?? null,
  };
}

function makeClientId(): string {
  // crypto.randomUUID متاح في المتصفحات الحديثة + Node 19+ + Edge runtime.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // fallback بسيط (مفيش cryptographic strength — بس للـ client_id).
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

// ============================================================================
// Cascade helpers — بنستخرج قيم مميّزة (years/trims/paints) من الـ DB entries
// بناءً على الـ cascade (brand+model, brand+model+year).
// بنستخدمهم في الـ MarketSearchForm عشان dropdowns الـ search تبقى DB-driven
// ومش static. الـ returned arrays مرتّبة ومنفصلة.
// ============================================================================

/**
 * الـ years الموجودة لـ (brand, model) — distinct، مرتّبة descending.
 * بترجع [] لو مفيش تطابق.
 */
export function getYearsFromEntries(
  entries: MarketEntry[],
  brand: string,
  model: string
): number[] {
  if (!brand || !model) return [];
  const set = new Set<number>();
  for (const e of entries) {
    if (e.brand === brand && e.model === model && Number.isFinite(e.year)) {
      set.add(e.year);
    }
  }
  return Array.from(set).sort((a, b) => b - a);
}

/**
 * الـ trims الموجودة لـ (brand, model, year) — distinct، مرتّبة ascending.
 * بترجع [] لو مفيش تطابق.
 */
export function getTrimsFromEntries(
  entries: MarketEntry[],
  brand: string,
  model: string,
  year: number
): string[] {
  if (!brand || !model || !Number.isFinite(year)) return [];
  const set = new Set<string>();
  for (const e of entries) {
    if (
      e.brand === brand &&
      e.model === model &&
      e.year === year &&
      e.trim
    ) {
      set.add(e.trim);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * الـ paint conditions الموجودة لـ (brand, model, year) — distinct، مرتّبة.
 * بترجع [] لو مفيش تطابق.
 */
export function getPaintsFromEntries(
  entries: MarketEntry[],
  brand: string,
  model: string,
  year: number
): string[] {
  if (!brand || !model || !Number.isFinite(year)) return [];
  const set = new Set<string>();
  for (const e of entries) {
    if (
      e.brand === brand &&
      e.model === model &&
      e.year === year &&
      e.paint_condition
    ) {
      set.add(e.paint_condition);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}