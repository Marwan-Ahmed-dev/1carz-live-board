// CRUD operations على مجموعة cars في Firestore
// نستخدم real-time listeners (onSnapshot) لجلب التحديثات الفورية

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  QueryConstraint,
  DocumentData,
  writeBatch,
  limit,
  getCountFromServer,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import { Car, NewCarInput, CarUpdateInput, Priority, CarStatus } from './types';
import { deleteCarImages } from './storage';
import { PRIORITY_ORDER } from './priority';
import { logger } from './logger';

const CARS_COLLECTION = 'cars';

/**
 * تحويل Timestamp من Firestore إلى Date في الكائن
 * (تجنب مشاكل SSR مع Timestamp)
 */
function normalizeCar(snap: DocumentData): Car {
  const data = snap.data();
  // ✅ FIX: تأكد أن assigned_to دايماً array — لو كان string (legacy data) حوّله لـ ['all']
  // ده بيمنع أخطاء في الـ Firestore rules (hasAny) وفي فلتر الـ 'mine' في useCars
  let assignedTo: string[];
  if (Array.isArray(data.assigned_to)) {
    assignedTo = data.assigned_to;
  } else if (typeof data.assigned_to === 'string') {
    assignedTo = [data.assigned_to];
  } else {
    assignedTo = ['all'];
  }
  return {
    id: snap.id,
    title: data.title || '',
    price: data.price || 0,
    description: data.description || '',
    priority: (data.priority || 'medium') as Priority,
    status: data.status || 'active',
    image_url: data.image_url || '',
    additional_images: data.additional_images || [],
    condition: data.condition || 'used',
    is_featured: data.is_featured || false,
    inspector_name: typeof data.inspector_name === 'string' ? data.inspector_name : '',
    inspector_phone: typeof data.inspector_phone === 'string' ? data.inspector_phone : '',
    owner_name: typeof data.owner_name === 'string' ? data.owner_name : '',
    owner_phone: typeof data.owner_phone === 'string' ? data.owner_phone : '',
    assigned_to: assignedTo,
    created_at: data.created_at || null,
    updated_at: data.updated_at || null,
    reserved_at: data.reserved_at || null,
    sold_at: data.sold_at || null,
  } as Car;
}

/**
 * جلب كل العربيات (للمستخدم العادي - فلتر أمني على الـ Rules)
 * لكن هنا نُرجع كل اللي نقدر نوصله
 */
export async function fetchAllCustomers(): Promise<Car[]> {
  const ref = collection(db, CARS_COLLECTION);
  const snap = await getDocs(ref);
  return snap.docs.map(normalizeCar);
}

/**
 * جلب كل العربيات لـ admin (مرة واحدة)
 */
export async function fetchAllCars(): Promise<Car[]> {
  const ref = collection(db, CARS_COLLECTION);
  const q = query(ref, orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(normalizeCar);
}

/**
 * جلب عربية واحدة بالـ ID
 */
export async function fetchCar(id: string): Promise<Car | null> {
  const ref = doc(db, CARS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return normalizeCar(snap);
}

/**
 * إضافة عربية جديدة
 *
 * H8: TOCTOU-safe — كل التحقق (validation) بيحصل قبل أي كتابة لـ Firestore.
 * قبل كده: لو الـ validation فشلت بعد addDoc، كانت بتسيب doc فاضي / ناقص في الـ DB.
 * دلوقتي: validation ترجع throw قبل أي write — Firestore ما بتشوفش بيانات باطلة.
 */
export async function addCar(input: NewCarInput): Promise<string> {
  // ✅ Pre-write validation — throw قبل أي كتابة لـ Firestore
  const title = (input.title || '').trim();
  if (!title) throw new Error('عنوان العربية مطلوب');
  if (title.length > 200) throw new Error('عنوان العربية طويل جداً (200 حرف كحد أقصى)');
  const priceNum = Number(input.price);
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    throw new Error('السعر غير صالح');
  }
  const desc = (input.description || '').trim();
  if (desc.length > 5000) throw new Error('الوصف طويل جداً (5000 حرف كحد أقصى)');

  // ✅ FIX: defensive — نتأكد أن assigned_to دايماً array صالح قبل الكتابة
  // (لو ضاع من مكان تاني أو اتبعت بشكل غلط، نمنع العربية من تتكتب بـ assigned_to = [])
  let assignedTo: string[];
  if (Array.isArray(input.assigned_to) && input.assigned_to.length > 0) {
    assignedTo = input.assigned_to;
  } else if (Array.isArray(input.assigned_to) && input.assigned_to.length === 0) {
    logger.warn('[addCar] assigned_to is empty, defaulting to [\'all\']');
    assignedTo = ['all'];
  } else if (typeof input.assigned_to === 'string') {
    assignedTo = [input.assigned_to];
  } else {
    logger.warn('[addCar] assigned_to missing/invalid, defaulting to [\'all\']');
    assignedTo = ['all'];
  }

  const ref = collection(db, CARS_COLLECTION);
  const data: Record<string, unknown> = {
    ...input,
    title,
    price: priceNum,
    description: desc,
    assigned_to: assignedTo,
    inspector_name: (input.inspector_name || '').trim(),
    inspector_phone: (input.inspector_phone || '').trim(),
    owner_name: (input.owner_name || '').trim(),
    owner_phone: (input.owner_phone || '').trim(),
    // H14: optimistic concurrency — كل عربية بتبدأ بـ version=1
    version: 1,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
  if (input.status === 'reserved') data.reserved_at = serverTimestamp();
  if (input.status === 'sold') data.sold_at = serverTimestamp();
  delete (data as { code?: string }).code;
  const docRef = await addDoc(ref, data);
  return docRef.id;
}

/**
 * تحديث عربية
 *
 * H13: استخدام runTransaction لضمان عدم الكتابة فوق تعديل متزامن.
 * H14: optional optimistic-concurrency — لو الـ caller مرّر expectedVersion
 * بنتحقق إن الـ doc في الـ DB عنده نفس الـ version قبل ما نكتب.
 * لو اختلف → throw VERSION_CONFLICT والـ UI يقدر يعرض رسالة "تم تعديل العربية من شخص آخر".
 */
export interface UpdateCarOptions {
  /**
   * رقم الـ version الحالي المتوقع. لو مرّرته، الـ update هيفشل بـ
   * VERSION_CONFLICT لو العربية اتعدلت من شخص تاني في نفس الوقت.
   * (H14: optimistic concurrency control)
   */
  expectedVersion?: number;
}

export class VersionConflictError extends Error {
  constructor() {
    super('تم تعديل العربية من شخص آخر — حدّث الصفحة وراجع التغييرات');
    this.name = 'VersionConflictError';
  }
}

export async function updateCar(
  id: string,
  updates: CarUpdateInput,
  options: UpdateCarOptions = {}
): Promise<void> {
  const ref = doc(db, CARS_COLLECTION, id);

  // H13: runTransaction يمنع race conditions بين read-modify-write.
  // H14: optional version check داخل الـ transaction.
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      throw new Error('العربية غير موجودة');
    }
    const prevData = snap.data();
    const prevVersion = typeof prevData.version === 'number' ? prevData.version : 1;

    if (
      typeof options.expectedVersion === 'number' &&
      options.expectedVersion > 0 &&
      prevVersion !== options.expectedVersion
    ) {
      throw new VersionConflictError();
    }

    const payload: Record<string, unknown> = {
      ...updates,
      code: deleteField(),
      version: prevVersion + 1, // bump version atomically
      updated_at: serverTimestamp(),
    };
    if (updates.status && updates.status !== prevData.status) {
      if (updates.status === 'reserved') payload.reserved_at = serverTimestamp();
      if (updates.status === 'sold') payload.sold_at = serverTimestamp();
    }
    tx.update(ref, payload);
  });
}

/**
 * حذف عربية
 *
 * H15: cascade best-effort — نحاول ننضّف الـ storage + نسجّل الـ event في الـ log
 * للـ audit trail. الـ doc نفسه هو اللي اتحذف (orphan data في sub-collections
 * لو موجودة) مش بيتأثر — ده trade-off معروف (last-write-wins).
 *
 * Cleanup in 3 phases:
 *   1) Storage: cars/{id}/* — حذف الصور
 *   2) Firestore: cars/{id} — حذف الـ doc
 *   3) Cleanup log: console.warn لو في orphans في buyer_leads / copy_events
 */
export async function deleteCar(id: string): Promise<void> {
  // 1) Storage images — best-effort
  try {
    await deleteCarImages(id);
  } catch (err) {
    logger.warn('[deleteCar] storage cleanup failed (non-fatal):', err);
  }

  // 2) حذف الـ doc نفسه
  const ref = doc(db, CARS_COLLECTION, id);
  await deleteDoc(ref);

  // 3) H15 doc: نترك buyer_leads + copy_events زي ما هم لو موجودين
  // الإشارة في الـ Car.marketer_uids / copy_events.carId بتفضل موجودة لكن
  // الـ carId بقى dangling. الـ Firestore rules بتسمح بالـ orphan data
  // لأن المنطق ده simplest. لو احتجنا cascade لاحقاً نضيف Cloud Function.
}

/**
 * نتيجة فحص وإصلاح العربيات الموجودة (one-time migration).
 * بيرجع:
 * - cars: قائمة بكل عربية وفحصها
 * - fixedCount: عدد العربيات اللي اتعدلت
 * - knownUids: قائمة الـ UIDs الموجودة فعلاً في users collection
 *   (عشان الأدمن يقدر يطابق الـ assigned_to بالـ UIDs الحقيقية)
 */
export interface CarFixReport {
  cars: Array<{
    id: string;
    title: string;
    assignedToBefore: unknown;
    assignedToAfter: string[];
    statusBefore: string;
    statusAfter: string;
    changed: boolean;
    reason: string;
    /** UIDs من الـ assigned_to اللي مش معروفة في users collection (orphans) */
    orphanUids: string[];
  }>;
  fixedCount: number;
  totalCars: number;
  knownUids: string[];
  knownUsers: Array<{ uid: string; email: string; username: string | null }>;
}

/**
 * فحص وإصلاح العربيات الموجودة مرة واحدة:
 * - assigned_to فاضي أو مش array → يتحوّل لـ ['all']
 * - status ناقص → يتحوّل لـ 'active'
 *   ⚠️ 'sold' و 'reserved' و 'inactive' ما بنلمسهمش (متعمد من الأدمن)
 * - الـ specific UIDs لو مش موجودين في users collection (orphan)
 *   → بنضيف تحذير بس ما بنغيرش (ممكن يكون متعمد من الأدمن)
 *
 * Use case: لو العربيات القديمة اتكتبت بـ `assigned_to = []` أو `status='inactive'`،
 * المستخدمين مش هيشوفوها حتى لو assigned_to صحيح. ده one-time fix.
 *
 * Performance: يستخدم writeBatch لتجميع كل التعديلات في round-trips قليلة
 * (Firestore batch max = 500 عملية، فنقسّم على دفعات). قبل كنا بنعمل
 * sequential updateDoc لكل عربية (N round-trips) — ده كان بيتسبب في
 * بطء شديد لو عندك 100+ عربية.
 */
const FIRESTORE_BATCH_LIMIT = 500;

export async function fixAllCarsAssignment(): Promise<CarFixReport> {
  const ref = collection(db, CARS_COLLECTION);
  const snap = await getDocs(ref);

  // بنجيب الـ UIDs الموجودة فعلاً عشان نقدر نحدد orphans
  const usersRef = collection(db, 'users');
  const usersSnap = await getDocs(usersRef);
  const knownUids = new Set(usersSnap.docs.map((d) => d.id));
  knownUids.add('all'); // 'all' مش UID بس بنعتبره صالح
  const usernameToUid = new Map<string, string>();
  usersSnap.docs.forEach((d) => {
    const username = d.data().username;
    if (typeof username === 'string' && username) {
      usernameToUid.set(username, d.id);
    }
  });

  // Collect pending updates (id → { assignedToAfter, statusAfter }) so we
  // can flush them in a single writeBatch per 500 cars.
  const pendingUpdates: Array<{
    id: string;
    assignedToAfter: string[];
    statusAfter: string;
  }> = [];

  const report: CarFixReport = {
    cars: [],
    fixedCount: 0,
    totalCars: snap.size,
    knownUids: Array.from(knownUids),
    knownUsers: usersSnap.docs.map((d) => ({
      uid: d.id,
      email: d.data().email || '',
      username: d.data().username || null,
    })),
  };

  for (const carDoc of snap.docs) {
    const data = carDoc.data();
    const id = carDoc.id;
    const title = data.title || '(no title)';
    const assignedToBefore = data.assigned_to;
    const statusBefore: string = data.status || '(missing)';

    let assignedToAfter: string[] = [];
    let statusAfter = statusBefore;
    const reasons: string[] = [];
    let needsFix = false;

    // 1. إصلاح assigned_to + تحويل usernames القديمة لـ UIDs
    let orphanUids: string[] = [];

    if (!Array.isArray(assignedToBefore) || assignedToBefore.length === 0) {
      assignedToAfter = ['all'];
      reasons.push("assigned_to كان فاضي أو ناقص — اتحوّل لـ ['all']");
      needsFix = true;
    } else {
      const mapped: string[] = [];
      const seen = new Set<string>();
      for (const raw of assignedToBefore as string[]) {
        if (typeof raw !== 'string' || !raw) continue;
        const uidFromUsername = usernameToUid.get(raw);
        const value = knownUids.has(raw) || raw === 'all' ? raw : uidFromUsername || raw;
        if (uidFromUsername && raw !== value) {
          reasons.push(`username '${raw}' اتحوّل لـ UID ${value}`);
          needsFix = true;
        }
        if (!seen.has(value)) {
          seen.add(value);
          mapped.push(value);
        }
      }
      assignedToAfter = mapped.length > 0 ? mapped : ['all'];
      if (mapped.length === 0) {
        reasons.push("assigned_to ما فيهوش قيم صالحة — اتحوّل لـ ['all']");
        needsFix = true;
      }
      orphanUids = assignedToAfter.filter((u) => !knownUids.has(u));
      if (orphanUids.length > 0) {
        reasons.push(
          `⚠️ orphan UIDs: ${orphanUids.join(', ')} (مش في users collection — يحتاج إعادة تعيين)`
        );
      }
    }

    // 2. إصلاح status الناقص فقط — ما بنحوّلش inactive متعمد
    if (statusBefore === '(missing)') {
      statusAfter = 'active';
      reasons.push("status ناقص — اتحوّل لـ 'active'");
      needsFix = true;
    } else if (statusBefore === 'sold' || statusBefore === 'reserved' || statusBefore === 'inactive') {
      reasons.push(`status = '${statusBefore}' (متعمد — ما اتغيرش)`);
    }

    if (needsFix) {
      pendingUpdates.push({ id, assignedToAfter, statusAfter });
    }

    report.cars.push({
      id,
      title,
      assignedToBefore,
      assignedToAfter: needsFix ? assignedToAfter : (assignedToBefore as string[]),
      statusBefore,
      statusAfter: needsFix ? statusAfter : statusBefore,
      changed: needsFix,
      reason: reasons.join(' · '),
      orphanUids,
    });
  }

  // Flush in batches of 500 (Firestore hard limit).
  for (let i = 0; i < pendingUpdates.length; i += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    const slice = pendingUpdates.slice(i, i + FIRESTORE_BATCH_LIMIT);
    slice.forEach((u) => {
      batch.update(doc(db, CARS_COLLECTION, u.id), {
        assigned_to: u.assignedToAfter,
        status: u.statusAfter,
        updated_at: serverTimestamp(),
      });
    });
    try {
      await batch.commit();
      report.fixedCount += slice.length;
    } catch (err) {
      logger.error('[fixAllCarsAssignment] batch commit failed:', err);
      // Mark the affected cars as failed so the UI can show the reason.
      const message = (err as Error).message;
      for (const u of slice) {
        const car = report.cars.find((c) => c.id === u.id);
        if (car) {
          car.changed = false;
          car.reason = `${car.reason} · فشل التحديث: ${message}`;
        }
      }
    }
  }

  logger.debug('[fixAllCarsAssignment] report:', report);
  return report;
}

export interface SubscribeToCarsFilters {
  priority?: Priority;
  minPrice?: number;
  maxPrice?: number;
  /** User UID — retained for callers; no longer filters by assignment */
  uid?: string | null;
  /** ضيف بدون login: نفس ظهور المسوّق — كل العربيات المعروضة */
  publicOnly?: boolean;
  onError?: (err: Error) => void;
}

/** حالات تظهر للمشاهدين (ضيف / مسوّق) — inactive تبقى للأدمن فقط */
export const VIEWABLE_CAR_STATUSES: CarStatus[] = ['active', 'reserved', 'sold'];

/**
 * Real-time listener على مجموعة العربيات.
 *
 * المشاهدون (uid أو publicOnly): كل العربيات active/reserved/sold بغض النظر عن assigned_to.
 * الأدمن (من غير uid/publicOnly): كل الحالات بما فيها inactive.
 */
export function subscribeToCars(
  callback: (cars: Car[]) => void,
  filters: SubscribeToCarsFilters = {}
): () => void {
  const ref = collection(db, CARS_COLLECTION);
  const constraints: QueryConstraint[] = [];
  const viewerMode = !!(filters.uid || filters.publicOnly);

  if (viewerMode) {
    constraints.push(where('status', 'in', VIEWABLE_CAR_STATUSES));
  }

  if (filters.priority) {
    constraints.push(where('priority', '==', filters.priority));
  }
  if (filters.minPrice != null) {
    constraints.push(where('price', '>=', filters.minPrice));
  }
  if (filters.maxPrice != null) {
    constraints.push(where('price', '<=', filters.maxPrice));
  }

  constraints.push(orderBy('created_at', 'desc'));

  // Performance guard: cap any admin/owner query to 200 cars.
  // لو عندك أكتر من 200 عربية، الإحصائيات في الـ dashboard هتستخدم
  // getCountFromServer (مش onSnapshot) لتجنّب قراءة المستندات كلها.
  constraints.push(limit(200));

  const q = query(ref, ...constraints);
  return onSnapshot(
    q,
    (snap) => {
      const cars = snap.docs.map(normalizeCar).filter((c) =>
        viewerMode ? isCarListedForViewers(c) : true
      );
      callback(cars);
    },
    (err) => {
      logger.error('[subscribeToCars] error:', err);
      filters.onError?.(err);
    }
  );
}

/**
 * عربية ظاهرة للمشاهد: متاحة / محجوزة / مباعة.
 * التعيين (assigned_to) مش بيخفي العربية عن المسوّق أو الضيف.
 */
export function isCarListedForViewers(car: Car): boolean {
  return VIEWABLE_CAR_STATUSES.includes(car.status);
}

/**
 * عربية ظاهرة للمستخدم العادي — التعيين لم يعد يقيّد الظهور.
 */
export function isCarVisibleToUser(car: Car, _uid?: string): boolean {
  return isCarListedForViewers(car);
}

/**
 * Real-time listener على عربية واحدة
 */
export function subscribeToCar(
  id: string,
  callback: (car: Car | null) => void,
  onError?: (err: Error) => void
): () => void {
  const ref = doc(db, CARS_COLLECTION, id);
  return onSnapshot(
    ref,
    (snap) => {
      callback(snap.exists() ? normalizeCar(snap) : null);
    },
    (err) => {
      logger.error('Car subscription error:', err);
      onError?.(err);
    }
  );
}

/**
 * عداد العربيات حسب الأولوية (للإحصائيات في admin dashboard)
 *
 * استخدام getCountFromServer بدل onSnapshot يقلّل القراءة بشكل كبير
 * (مش محتاجين الـ docs نفسها — بس الأرقام). الـ `subscribeTo*` المتبقي
 * لسه يستخدم snapshot listener للـ lists.
 */
export interface PriorityCounts {
  arabyatna: number;
  top: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

async function fetchPriorityCounts(): Promise<PriorityCounts> {
  const counts: PriorityCounts = { arabyatna: 0, top: 0, high: 0, medium: 0, low: 0, total: 0 };
  for (const p of PRIORITY_ORDER) {
    const snap = await getCountFromServer(
      query(collection(db, CARS_COLLECTION), where('priority', '==', p))
    );
    const n = snap.data().count;
    counts[p] = n;
    counts.total += n;
  }
  return counts;
}

export function subscribeToPriorityCounts(callback: (counts: PriorityCounts) => void): () => void {
  // Polling كل 30 ثانية مع getCountFromServer. مش real-time لكن
  // الـ admin dashboard مش محتاج تحديث في الـ ms.
  // لو احتجت real-time لاحقاً، ممكن نستخدم onSnapshot مع select(field)
  // بس ده أعقد شوية.
  let cancelled = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = async () => {
    try {
      const counts = await fetchPriorityCounts();
      if (!cancelled) callback(counts);
    } catch (err) {
      logger.error('[subscribeToPriorityCounts] error:', err);
      if (!cancelled) {
        callback({ arabyatna: 0, top: 0, high: 0, medium: 0, low: 0, total: 0 });
      }
    }
  };

  // kick off immediately + every 30s
  void tick();
  timer = setInterval(tick, 30_000);

  return () => {
    cancelled = true;
    if (timer) clearInterval(timer);
  };
}