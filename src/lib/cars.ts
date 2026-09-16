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
  return {
    id: snap.id,
    code: data.code || '',
    title: data.title || '',
    price: data.price || 0,
    description: data.description || '',
    priority: (data.priority || 'medium') as Priority,
    display_order: data.display_order || 0,
    status: data.status || 'active',
    image_url: data.image_url || '',
    condition: data.condition || 'used',
    is_featured: data.is_featured || false,
    assigned_to: data.assigned_to || ['all'],
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
  const data = {
    ...input,
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
 * Real-time listener على كل العربيات
 * يُستدعى callback في كل تغيير
 */
export function subscribeToCars(
  callback: (cars: Car[]) => void,
  filters: { priority?: Priority; minPrice?: number; maxPrice?: number; uid?: string | null } = {}
): () => void {
  const ref = collection(db, CARS_COLLECTION);
  const constraints: QueryConstraint[] = [];
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

  const q = query(ref, ...constraints);
  return onSnapshot(
    q,
    (snap) => {
      const cars = snap.docs.map(normalizeCar);
      callback(cars);
    },
    (err) => {
      console.error('Cars subscription error:', err);
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
  return onSnapshot(ref, (snap) => {
    const counts: PriorityCounts = { top: 0, high: 0, medium: 0, low: 0, total: 0 };
    snap.docs.forEach((d) => {
      const data = d.data();
      counts.total++;
      if (data.priority in counts) {
        counts[data.priority as Priority]++;
      }
    });
    callback(counts);
  });
}