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
    code: data.code || '',
    title: data.title || '',
    price: data.price || 0,
    description: data.description || '',
    priority: (data.priority || 'medium') as Priority,
    status: data.status || 'active',
    image_url: data.image_url || '',
    additional_images: data.additional_images || [],
    condition: data.condition || 'used',
    is_featured: data.is_featured || false,
    assigned_to: assignedTo,
    created_at: data.created_at || null,
    updated_at: data.updated_at || null,
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
  const data = {
    ...input,
    assigned_to: assignedTo,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
  const docRef = await addDoc(ref, data);
  return docRef.id;
}

/**
 * تحديث عربية
 */
export async function updateCar(id: string, updates: CarUpdateInput): Promise<void> {
  const ref = doc(db, CARS_COLLECTION, id);
  await updateDoc(ref, {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

/**
 * حذف عربية
 */
export async function deleteCar(id: string): Promise<void> {
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
 * - status ناقص أو 'inactive' → يتحوّل لـ 'active' (عشان المستخدمين يشوفوها)
 *   ⚠️ 'sold' و 'reserved' ما بنلمسهمش (متعمد من الأدمن)
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

    // 1. إصلاح assigned_to
    let orphanUids: string[] = [];
    if (!Array.isArray(assignedToBefore) || assignedToBefore.length === 0) {
      assignedToAfter = ['all'];
      reasons.push("assigned_to كان فاضي أو ناقص — اتحوّل لـ ['all']");
      needsFix = true;
    } else {
      assignedToAfter = assignedToBefore as string[];
      // check for orphan UIDs
      orphanUids = (assignedToBefore as string[]).filter(
        (u) => !knownUids.has(u)
      );
      if (orphanUids.length > 0) {
        reasons.push(
          `⚠️ orphan UIDs: ${orphanUids.join(', ')} (مش في users collection — يحتاج إعادة تعيين)`
        );
      }
    }

    // 2. إصلاح status — إلا لو 'sold' أو 'reserved' (متعمد)
    if (statusBefore === '(missing)' || statusBefore === 'inactive') {
      statusAfter = 'active';
      reasons.push(
        statusBefore === '(missing)'
          ? "status ناقص — اتحوّل لـ 'active'"
          : "status كان 'inactive' — اتحوّل لـ 'active' عشان المستخدمين يشوفوها"
      );
      needsFix = true;
    } else if (statusBefore === 'sold' || statusBefore === 'reserved') {
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

/**
 * Real-time listener على كل العربيات
 * يُستدعى callback في كل تغيير
 *
 * ✅ FIX: لما uid متاح، بنضيف server-side filter
 *   `where('assigned_to', 'array-contains-any', [uid, 'all'])` —
 *   ده بيرحم الـ Firestore rules وكمان defense-in-depth:
 *   حتى لو الـ rules مش متطبقة، الكلاينت مش هيشوف أكتر من اللي المفروض.
 *
 * ✅ FIX: client-side safety net — لو السيرفر رجّع doc مالوش حق فيه
 *   (مثلاً mismatch بين الـ auth UID و الـ assigned_to بسبب stale data)
 *   بنفلتره في الـ callback قبل ما يوصل للمستهلك.
 */
export function subscribeToCars(
  callback: (cars: Car[]) => void,
  filters: { priority?: Priority; minPrice?: number; maxPrice?: number; uid?: string | null } = {}
): () => void {
  const ref = collection(db, CARS_COLLECTION);
  const constraints: QueryConstraint[] = [];

  // ✅ Defense in depth: لو عندنا uid، فلتر server-side بالـ array-contains-any
  // (بيرجع docs اللي assigned_to فيها الـ uid أو 'all' على الأقل).
  // ده كمان بيرحم الـ rules — بدل ما نعتمد على كل doc إنه يتعمله
  // rules evaluation، الـ query نفسه بيجيب المتوافق بس.
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

  // ✅ OrderBy بيتجنب لو فيه array-contains-any لتفادي مشاكل composite index.
  // السورت بيتم client-side في useCars.sortByCreatedAtDesc (مفيش فرق ملحوظ).
  if (!filters.uid) {
    constraints.push(orderBy('created_at', 'desc'));
  }

  const q = query(ref, ...constraints);
  const uid = filters.uid;
  return onSnapshot(
    q,
    (snap) => {
      // ✅ DEBUG: سجّل الـ snapshot عشان نشوف لو الـ Firestore rules بترجّع docs أو لأ
      console.log(
        '[subscribeToCars] snapshot:',
        snap.docs.length,
        'docs (uid filter:',
        uid || 'none',
        ')',
        snap.docs.map((d) => ({
          id: d.id,
          status: d.data().status,
          assigned_to: d.data().assigned_to,
          title: d.data().title,
        }))
      );
      const rawCars = snap.docs.map(normalizeCar);
      // ✅ Defense in depth: client-side filter إضافي
      // (لو السيرفر رجّع doc مخالف — مثلاً assigned_to فيه UID غريب —
      //  نشيله قبل ما يوصل للمستهلك).
      const cars = uid
        ? rawCars.filter(
            (c) =>
              Array.isArray(c.assigned_to) &&
              (c.assigned_to.includes(uid) || c.assigned_to.includes('all'))
          )
        : rawCars;
      if (cars.length !== rawCars.length) {
        console.warn(
          '[subscribeToCars] client-side filter dropped',
          rawCars.length - cars.length,
          'docs that did not match uid',
          uid
        );
      }
      callback(cars);
    },
    (err) => {
      console.error('[subscribeToCars] error:', err);
      callback([]);
    }
  );
}

/**
 * Real-time listener على عربية واحدة
 */
export function subscribeToCar(id: string, callback: (car: Car | null) => void): () => void {
  const ref = doc(db, CARS_COLLECTION, id);
  return onSnapshot(
    ref,
    (snap) => {
      callback(snap.exists() ? normalizeCar(snap) : null);
    },
    (err) => {
      console.error('Car subscription error:', err);
      callback(null);
    }
  );
}

/**
 * عداد العربيات حسب الأولوية (للإحصائيات في admin dashboard)
 */
export interface PriorityCounts {
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
      const counts: PriorityCounts = { top: 0, high: 0, medium: 0, low: 0, total: 0 };
      snap.docs.forEach((d) => {
        const data = d.data();
        counts.total++;
        const p: string = data.priority;
        if (p === 'top' || p === 'high' || p === 'medium' || p === 'low') {
          counts[p as Priority]++;
        }
      });
      callback(counts);
    },
    (err) => {
      console.error('[subscribeToPriorityCounts] error:', err);
      callback({ top: 0, high: 0, medium: 0, low: 0, total: 0 });
    }
  );
}