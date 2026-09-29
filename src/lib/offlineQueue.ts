/**
 * IndexedDB layer للسجل السعري (/market/*).
 *
 * قاعد البيانات اسمها `1carz-offline` وبتحتوي على object stores:
 *   - `market_cache`           : cache القراءة (keyPath: id, max 1000 FIFO)
 *   - `pending_market_entries` : queue الكتابة (keyPath: client_id, max 100)
 *
 * ملاحظات:
 *  - كل الـ functions ترجّع Promise ونعمل error handling محلي — أي فشل
 *    في IndexedDB ما يوقّفش الـ render، بس نرجع قيم فاضية ونـ log.
 *  - الـ cache cap (1000) بنطبّقه بـ FIFO: لو وصل الحد، نشيل أقدم entries.
 *  - الـ pending queue cap (100) بنطبّقه كمان — لو حاول اليوزر يضيف أكتر،
 *    بنرفض بخطأ صريح (offline-queue-full) عشان الـ UI يعرض رسالة.
 *  - الـ DB version 1. لو احتجنا migration نعمل version 2.
 */

import { IDBPDatabase, openDB as idbOpenDB } from 'idb';
import type { MarketEntry, PendingMarketEntry } from './types';
import { logger } from './logger';

const DB_NAME = '1carz-offline';
const DB_VERSION = 1;

const CACHE_STORE = 'market_cache';
const PENDING_STORE = 'pending_market_entries';

const CACHE_CAP = 1000;
const PENDING_CAP = 100;

// ============================================================================
// DB lifecycle
// ============================================================================

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * فتح / إنشاء قاعدة البيانات. الـ idb wrapper بيـ upgrade الـ schema لو
 * احتجنا نضيف stores جديدة في المستقبل.
 */
export function openDb(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined') {
    // SSR-safe — IndexedDB ما بيشتغلش على السيرفر. نرجّع Promise رافض
    // بشكل واضح.
    return Promise.reject(new Error('IndexedDB is not available on the server'));
  }
  if (!dbPromise) {
    dbPromise = idbOpenDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          const cacheStore = db.createObjectStore(CACHE_STORE, { keyPath: 'id' });
          // indexes مفيدة للفرز + الفلترة بدون ما نقرأ كل الـ docs.
          cacheStore.createIndex('created_at', 'created_at');
          cacheStore.createIndex('brand', 'brand');
          cacheStore.createIndex('model', 'model');
          cacheStore.createIndex('year', 'year');
        }
        if (!db.objectStoreNames.contains(PENDING_STORE)) {
          const pendingStore = db.createObjectStore(PENDING_STORE, {
            keyPath: 'client_id',
          });
          pendingStore.createIndex('queued_at', 'queued_at');
          pendingStore.createIndex('recorded_by_uid', 'recorded_by_uid');
        }
      },
      blocked() {
        logger.warn('[offlineQueue] DB upgrade blocked — close other tabs to proceed.');
      },
      blocking() {
        logger.warn('[offlineQueue] This tab is blocking a new version. Closing.');
        if (dbPromise) {
          dbPromise
            .then((db) => db.close())
            .catch(() => undefined);
          dbPromise = null;
        }
      },
      terminated() {
        logger.warn('[offlineQueue] DB connection terminated unexpectedly.');
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

/** يُستخدم في الاختبارات فقط — يغلق الـ connection ويعيد التهيئة. */
export async function _resetDbForTesting(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      /* ignore */
    }
    dbPromise = null;
  }
}

// ============================================================================
// market_cache (read cache)
// ============================================================================

/** جلب كل entries المخزّنة في الـ cache (بدون ترتيب محدد). */
export async function getCachedEntries(): Promise<MarketEntry[]> {
  try {
    const db = await openDb();
    const all = await db.getAll(CACHE_STORE);
    // ترتيب حسب `created_at` desc لو أمكن، وإلا حسب الـ id.
    return all.sort((a, b) => {
      const aMs = tsToMs((a as MarketEntry).created_at);
      const bMs = tsToMs((b as MarketEntry).created_at);
      if (aMs !== bMs) return bMs - aMs;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  } catch (err) {
    logger.warn('[offlineQueue] getCachedEntries failed:', err);
    return [];
  }
}

/** حفظ entry واحد في الـ cache. */
export async function putCachedEntry(entry: MarketEntry): Promise<void> {
  try {
    const db = await openDb();
    await db.put(CACHE_STORE, entry);
    await enforceCacheCap(db);
  } catch (err) {
    logger.warn('[offlineQueue] putCachedEntry failed:', err);
  }
}

/**
 * استبدال كل محتوى الـ cache بقائمة entries (مثلاً بعد Firestore snapshot).
 * بنحافظ على الـ FIFO cap.
 */
export async function replaceCachedEntries(entries: MarketEntry[]): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(CACHE_STORE, 'readwrite');
    const cacheStore = tx.objectStore(CACHE_STORE);
    await cacheStore.clear();
    // نكتب على دفعات لتقليل time spent holding the transaction.
    const batchSize = 100;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      // Promise.all ما بيشتغلش جوّا tx — لازم نعمل sequential writes.
      for (const e of batch) {
        await cacheStore.put(e);
      }
    }
    await tx.done;
    await enforceCacheCap(db);
  } catch (err) {
    logger.warn('[offlineQueue] replaceCachedEntries failed:', err);
  }
}

/** FIFO eviction — نحتفظ بآخر CACHE_CAP entries فقط (الأحدث created_at). */
async function enforceCacheCap(db: IDBPDatabase): Promise<void> {
  const count = await db.count(CACHE_STORE);
  if (count <= CACHE_CAP) return;
  // نقص أقدم (CACHE_CAP - count) entries
  const toRemove = count - CACHE_CAP;
  // نقرأ كل الـ entries، نرتبهم، ونمسح الأقدم.
  const all = await db.getAll(CACHE_STORE);
  all.sort((a, b) => tsToMs(a.created_at) - tsToMs(b.created_at));
  const tx = db.transaction(CACHE_STORE, 'readwrite');
  const cacheStore = tx.objectStore(CACHE_STORE);
  for (let i = 0; i < toRemove; i++) {
    const victim = all[i];
    if (victim && victim.id) {
      await cacheStore.delete(victim.id);
    }
  }
  await tx.done;
}

// ============================================================================
// pending_market_entries (write queue)
// ============================================================================

export class OfflineQueueFullError extends Error {
  constructor(public readonly cap: number) {
    super(`Pending queue full (cap=${cap})`);
    this.name = 'OfflineQueueFullError';
  }
}

/** جلب كل الـ pending entries (الأقدم أولاً). */
export async function getPendingEntries(): Promise<PendingMarketEntry[]> {
  try {
    const db = await openDb();
    const all = await db.getAll(PENDING_STORE);
    return all.sort((a, b) => a.queued_at - b.queued_at);
  } catch (err) {
    logger.warn('[offlineQueue] getPendingEntries failed:', err);
    return [];
  }
}

/** عدد الـ pending entries (يستخدمه الـ banner). */
export async function getPendingCount(): Promise<number> {
  try {
    const db = await openDb();
    return await db.count(PENDING_STORE);
  } catch (err) {
    logger.warn('[offlineQueue] getPendingCount failed:', err);
    return 0;
  }
}

/** إضافة entry جديد للـ queue. بيرفض لو وصل الحد. */
export async function putPendingEntry(entry: PendingMarketEntry): Promise<void> {
  const db = await openDb();
  const count = await db.count(PENDING_STORE);
  if (count >= PENDING_CAP) {
    throw new OfflineQueueFullError(PENDING_CAP);
  }
  await db.put(PENDING_STORE, entry);
}

/** حذف entry من الـ queue بعد ما اتـ push لـ Firestore بنجاح. */
export async function removePendingEntry(clientId: string): Promise<void> {
  try {
    const db = await openDb();
    await db.delete(PENDING_STORE, clientId);
  } catch (err) {
    logger.warn('[offlineQueue] removePendingEntry failed:', err);
  }
}

/** تحديث حقل `last_error` على entry بعينه (بدون حذفه). */
export async function updatePendingEntryError(
  clientId: string,
  errorMsg: string | null
): Promise<void> {
  try {
    const db = await openDb();
    const existing = (await db.get(PENDING_STORE, clientId)) as PendingMarketEntry | undefined;
    if (!existing) return;
    existing.last_error = errorMsg;
    await db.put(PENDING_STORE, existing);
  } catch (err) {
    logger.warn('[offlineQueue] updatePendingEntryError failed:', err);
  }
}

// ============================================================================
// testing helpers
// ============================================================================

/** تفريغ كل البيانات المخزّنة (للاختبارات / dev tools). */
export async function clearAll(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction([CACHE_STORE, PENDING_STORE], 'readwrite');
    const cacheStore = tx.objectStore(CACHE_STORE);
    const pendingStore = tx.objectStore(PENDING_STORE);
    await Promise.all([cacheStore.clear(), pendingStore.clear()]);
    await tx.done;
  } catch (err) {
    logger.warn('[offlineQueue] clearAll failed:', err);
  }
}

// ============================================================================
// utilities
// ============================================================================

/**
 * استخراج milliseconds من Timestamp أو Date أو رقم — للترتيب.
 * بترجع 0 لو الـ value مش معروف.
 */
function tsToMs(ts: unknown): number {
  if (!ts) return 0;
  // Firestore Timestamp-like
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
    try {
      const d = (ts as { toDate: () => Date }).toDate();
      return d.getTime();
    } catch {
      return 0;
    }
  }
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'number') return ts;
  return 0;
}

export const __OFFLINE_QUEUE_LIMITS__ = { CACHE_CAP, PENDING_CAP };