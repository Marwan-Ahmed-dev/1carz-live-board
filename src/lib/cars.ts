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
} from 'firebase/firestore';
import { db } from './firebase';
import { Car, NewCarInput, CarUpdateInput, Priority } from './types';
import { deleteCarImages } from './storage';
import { PRIORITY_ORDER } from './priority';

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
 */
export async function addCar(input: NewCarInput): Promise<string> {
  const ref = collection(db, CARS_COLLECTION);
  // ✅ FIX: defensive — نتأكد أن assigned_to دايماً array صالح قبل الكتابة
  // (لو ضاع من مكان تاني أو اتبعت بشكل غلط، نمنع العربية من تتكتب بـ assigned_to = [])
  let assignedTo: string[];
  if (Array.isArray(input.assigned_to) && input.assigned_to.length > 0) {
    assignedTo = input.assigned_to;
  } else if (Array.isArray(input.assigned_to) && input.assigned_to.length === 0) {
    console.warn('[addCar] assigned_to is empty, defaulting to [\'all\']');
    assignedTo = ['all'];
  } else if (typeof input.assigned_to === 'string') {
    assignedTo = [input.assigned_to];
  } else {
    console.warn('[addCar] assigned_to missing/invalid, defaulting to [\'all\']');
    assignedTo = ['all'];
  }
  const data: Record<string, unknown> = {
    ...input,
    assigned_to: assignedTo,
    inspector_name: (input.inspector_name || '').trim(),
    inspector_phone: (input.inspector_phone || '').trim(),
    owner_name: (input.owner_name || '').trim(),
    owner_phone: (input.owner_phone || '').trim(),
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
 */
export async function updateCar(id: string, updates: CarUpdateInput): Promise<void> {
  const ref = doc(db, CARS_COLLECTION, id);
  const payload: Record<string, unknown> = {
    ...updates,
    code: deleteField(),
    updated_at: serverTimestamp(),
  };
  if (updates.status) {
    const current = await getDoc(ref);
    const prev = current.data()?.status;
    if (prev !== updates.status) {
      if (updates.status === 'reserved') payload.reserved_at = serverTimestamp();
      if (updates.status === 'sold') payload.sold_at = serverTimestamp();
    }
  }
  await updateDoc(ref, payload);
}

/**
 * حذف عربية
 */
export async function deleteCar(id: string): Promise<void> {
  await deleteCarImages(id);
  const ref = doc(db, CARS_COLLECTION, id);
  await deleteDoc(ref);
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
 */
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
      try {
        await updateDoc(doc(db, CARS_COLLECTION, id), {
          assigned_to: assignedToAfter,
          status: statusAfter,
        });
        report.fixedCount++;
      } catch (err) {
        console.error(`[fixAllCarsAssignment] failed to fix ${id}:`, err);
        reasons.push(`فشل التحديث: ${(err as Error).message}`);
        needsFix = false;
      }
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

  console.log('[fixAllCarsAssignment] report:', report);
  return report;
}

export interface SubscribeToCarsFilters {
  priority?: Priority;
  minPrice?: number;
  maxPrice?: number;
  /** User UID — adds assignment query required by Firestore list rules */
  uid?: string | null;
  onError?: (err: Error) => void;
}

/**
 * Real-time listener على مجموعة العربيات.
 *
 * لما uid موجود (مستخدم عادي):
 *   query = assigned_to array-contains-any [uid, 'all']
 *   ده لازم يطابق قواعد الـ list. الحالة (status) بتتتفلتر client-side
 *   عشان ما نحتاجش composite index، والـ get rule بيمنع فتح غير النشطة.
 *
 * لما uid مش موجود (أدمن):
 *   query = orderBy created_at — الـ admin claim بيسمح بالـ list الكامل.
 */
export function subscribeToCars(
  callback: (cars: Car[]) => void,
  filters: SubscribeToCarsFilters = {}
): () => void {
  const ref = collection(db, CARS_COLLECTION);
  const constraints: QueryConstraint[] = [];

  if (filters.uid) {
    constraints.push(where('assigned_to', 'array-contains-any', [filters.uid, 'all']));
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

  // OrderBy يتعارض مع array-contains-any من غير composite index.
  // الترتيب بيتم client-side في useCars.sortByCreatedAtDesc.
  if (!filters.uid) {
    constraints.push(orderBy('created_at', 'desc'));
  }

  const q = query(ref, ...constraints);
  const uid = filters.uid;
  return onSnapshot(
    q,
    (snap) => {
      const rawCars = snap.docs.map(normalizeCar);
      const cars = uid
        ? rawCars.filter((c) => isCarVisibleToUser(c, uid))
        : rawCars;
      callback(cars);
    },
    (err) => {
      console.error('[subscribeToCars] error:', err);
      filters.onError?.(err);
    }
  );
}

/**
 * عربية ظاهرة للمستخدم العادي: متاحة + معيّنة له أو للكل.
 */
export function isCarVisibleToUser(car: Car, uid: string): boolean {
  if (car.status !== 'active') return false;
  if (!Array.isArray(car.assigned_to)) return false;
  return car.assigned_to.includes(uid) || car.assigned_to.includes('all');
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
      console.error('Car subscription error:', err);
      onError?.(err);
    }
  );
}

/**
 * عداد العربيات حسب الأولوية (للإحصائيات في admin dashboard)
 */
export interface PriorityCounts {
  arabyatna: number;
  top: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export function subscribeToPriorityCounts(callback: (counts: PriorityCounts) => void): () => void {
  const ref = collection(db, CARS_COLLECTION);
  return onSnapshot(
    ref,
    (snap) => {
      const counts: PriorityCounts = { arabyatna: 0, top: 0, high: 0, medium: 0, low: 0, total: 0 };
      snap.docs.forEach((d) => {
        const data = d.data();
        counts.total++;
        const p: string = data.priority;
        if ((PRIORITY_ORDER as string[]).includes(p)) {
          counts[p as Priority]++;
        }
      });
      callback(counts);
    },
    (err) => {
      console.error('[subscribeToPriorityCounts] error:', err);
      callback({ arabyatna: 0, top: 0, high: 0, medium: 0, low: 0, total: 0 });
    }
  );
}