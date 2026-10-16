// CRUD operations على مجموعة cars في Firestore
// نستخدم real-time listeners (onSnapshot) لجلب التحديثات الفورية

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
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
  documentId,
  writeBatch,
  limit,
  getCountFromServer,
  runTransaction,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Car, NewCarInput, CarUpdateInput, Priority, CarStatus } from './types';
import { deleteCarImages } from './storage';
import { PRIORITY_ORDER } from './priority';
import { logger } from './logger';

const CARS_COLLECTION = 'cars';
/** Owner PII — staff-only (never on public cars/{id}) */
const CAR_PRIVATE_COLLECTION = 'car_private';
/** Inspector contact — signed-in users only (never public) */
const CAR_CONTACT_COLLECTION = 'car_contact';

type AccessLevel = 'guest' | 'signed_in' | 'staff';

type ClaimsCache = { uid: string; role: string | undefined; at: number };
let claimsCache: ClaimsCache | null = null;
const CLAIMS_TTL_MS = 5 * 60 * 1000;

async function getCachedRole(forceRefresh = false): Promise<string | undefined> {
  const u = auth.currentUser;
  if (!u) {
    claimsCache = null;
    return undefined;
  }
  const now = Date.now();
  if (
    !forceRefresh &&
    claimsCache &&
    claimsCache.uid === u.uid &&
    now - claimsCache.at < CLAIMS_TTL_MS
  ) {
    return claimsCache.role;
  }
  const token = await u.getIdTokenResult(forceRefresh);
  const role = typeof token.claims.role === 'string' ? token.claims.role : undefined;
  claimsCache = { uid: u.uid, role, at: now };
  return role;
}

async function getAccessLevel(): Promise<AccessLevel> {
  const u = auth.currentUser;
  if (!u) return 'guest';
  try {
    const role = await getCachedRole(false);
    if (role === 'admin' || role === 'inspector') return 'staff';
    return 'signed_in';
  } catch {
    return 'signed_in';
  }
}

async function fetchDocsByIds(
  collectionName: string,
  ids: string[]
): Promise<Map<string, DocumentData>> {
  const map = new Map<string, DocumentData>();
  const unique = Array.from(
    new Set(ids.filter((id): id is string => typeof id === 'string' && !!id))
  );
  for (let i = 0; i < unique.length; i += 30) {
    const chunk = unique.slice(i, i + 30);
    if (chunk.length === 0) continue;
    try {
      const q = query(collection(db, collectionName), where(documentId(), 'in', chunk));
      const snap = await getDocs(q);
      snap.docs.forEach((d) => map.set(d.id, d.data()));
    } catch {
      // Fallback if `in` on documentId is rejected
      const snaps = await Promise.all(
        chunk.map((id) => getDoc(doc(db, collectionName, id)))
      );
      snaps.forEach((snap, idx) => {
        if (snap.exists()) map.set(chunk[idx], snap.data());
      });
    }
  }
  return map;
}

async function attachPrivateContacts(cars: Car[]): Promise<Car[]> {
  if (cars.length === 0) return cars;
  const access = await getAccessLevel();
  if (access === 'guest') return cars;

  const ids = cars.map((c) => c.id || '');
  const contactMap = await fetchDocsByIds(CAR_CONTACT_COLLECTION, ids);
  let ownerMap = new Map<string, DocumentData>();
  if (access === 'staff') {
    ownerMap = await fetchDocsByIds(CAR_PRIVATE_COLLECTION, ids);
  }

  return cars.map((c) => {
    if (!c.id) return c;
    const contact = contactMap.get(c.id);
    const owner = ownerMap.get(c.id);
    return {
      ...c,
      inspector_name:
        typeof contact?.inspector_name === 'string' ? contact.inspector_name : '',
      inspector_phone:
        typeof contact?.inspector_phone === 'string' ? contact.inspector_phone : '',
      owner_name: typeof owner?.owner_name === 'string' ? owner.owner_name : '',
      owner_phone: typeof owner?.owner_phone === 'string' ? owner.owner_phone : '',
    };
  });
}

async function writeCarPrivate(
  carId: string,
  ownerName: string,
  ownerPhone: string
): Promise<void> {
  await setDoc(
    doc(db, CAR_PRIVATE_COLLECTION, carId),
    {
      owner_name: ownerName,
      owner_phone: ownerPhone,
      updated_at: serverTimestamp(),
    },
    { merge: true }
  );
}

async function writeCarContact(
  carId: string,
  inspectorName: string,
  inspectorPhone: string
): Promise<void> {
  await setDoc(
    doc(db, CAR_CONTACT_COLLECTION, carId),
    {
      inspector_name: inspectorName,
      inspector_phone: inspectorPhone,
      updated_at: serverTimestamp(),
    },
    { merge: true }
  );
}


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
    // قبل الفصل: is_featured كان يُستخدم لـ «مفحوصة». لو is_inspected مش موجود
    // نعتبر is_featured القديم = مفحوصة، والمميزة = false عشان الشارات ما تتلخبطش.
    ...((): { is_featured: boolean; is_inspected: boolean } => {
      const hasInspectedField = data.is_inspected !== undefined && data.is_inspected !== null;
      if (hasInspectedField) {
        return {
          is_featured: !!data.is_featured,
          is_inspected: !!data.is_inspected,
        };
      }
      const legacyInspected = !!data.is_featured || data.priority === 'arabyatna';
      return { is_featured: false, is_inspected: legacyInspected };
    })(),
    // Inspector + owner PII never come from public cars/{id}
    inspector_name: '',
    inspector_phone: '',
    owner_name: '',
    owner_phone: '',
    inspection_location:
      typeof data.inspection_location === 'string' ? data.inspection_location : '',
    make: typeof data.make === 'string' ? data.make : '',
    model: typeof data.model === 'string' ? data.model : '',
    year: typeof data.year === 'number' && Number.isFinite(data.year) ? data.year : undefined,
    mileage_km:
      typeof data.mileage_km === 'number' && Number.isFinite(data.mileage_km)
        ? data.mileage_km
        : undefined,
    created_by_uid: typeof data.created_by_uid === 'string' ? data.created_by_uid : '',
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
  const snap = await getDocs(query(ref, limit(200)));
  return attachPrivateContacts(snap.docs.map(normalizeCar));
}

/**
 * جلب كل العربيات لـ admin (مرة واحدة)
 */
export async function fetchAllCars(): Promise<Car[]> {
  const ref = collection(db, CARS_COLLECTION);
  const q = query(ref, orderBy('created_at', 'desc'), limit(200));
  const snap = await getDocs(q);
  return attachPrivateContacts(snap.docs.map(normalizeCar));
}

/**
 * جلب عربية واحدة بالـ ID
 */
export async function fetchCar(id: string): Promise<Car | null> {
  const ref = doc(db, CARS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const [car] = await attachPrivateContacts([normalizeCar(snap)]);
  return car;
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
  const creatorUid =
    (typeof input.created_by_uid === 'string' && input.created_by_uid) ||
    auth.currentUser?.uid ||
    '';
  const ownerName = (input.owner_name || '').trim();
  const ownerPhone = (input.owner_phone || '').trim();
  const inspectorName = (input.inspector_name || '').trim();
  const inspectorPhone = (input.inspector_phone || '').trim();

  const data: Record<string, unknown> = {
    ...input,
    title,
    price: priceNum,
    description: desc,
    assigned_to: assignedTo,
    inspection_location: (input.inspection_location || '').trim(),
    make: (input.make || '').trim(),
    model: (input.model || '').trim(),
    year:
      typeof input.year === 'number' && Number.isFinite(input.year)
        ? Math.floor(input.year)
        : null,
    mileage_km:
      typeof input.mileage_km === 'number' && Number.isFinite(input.mileage_km)
        ? Math.floor(input.mileage_km)
        : null,
    ...(creatorUid ? { created_by_uid: creatorUid } : {}),
    // H14: optimistic concurrency — كل عربية بتبدأ بـ version=1
    version: 1,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
  // PII → private collections only (never on public cars)
  delete data.owner_name;
  delete data.owner_phone;
  delete data.inspector_name;
  delete data.inspector_phone;
  if (input.status === 'reserved') data.reserved_at = serverTimestamp();
  if (input.status === 'sold') data.sold_at = serverTimestamp();
  delete (data as { code?: string }).code;
  const docRef = await addDoc(ref, data);
  try {
    await Promise.all([
      writeCarPrivate(docRef.id, ownerName, ownerPhone),
      writeCarContact(docRef.id, inspectorName, inspectorPhone),
    ]);
  } catch (err) {
    try {
      await deleteDoc(docRef);
    } catch {
      /* ignore */
    }
    throw err;
  }
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
    // PII never on public cars — strip + delete leftover fields
    delete payload.owner_name;
    delete payload.owner_phone;
    delete payload.inspector_name;
    delete payload.inspector_phone;
    payload.owner_name = deleteField();
    payload.owner_phone = deleteField();
    payload.inspector_name = deleteField();
    payload.inspector_phone = deleteField();

    // تطبيع assigned_to زي addCar — فاضي/غلط → ['all']
    if ('assigned_to' in updates) {
      const raw = updates.assigned_to;
      if (Array.isArray(raw) && raw.length > 0) {
        payload.assigned_to = Array.from(
          new Set(raw.filter((x): x is string => typeof x === 'string' && x.length > 0))
        );
      } else if (typeof raw === 'string' && raw) {
        payload.assigned_to = [raw];
      } else {
        logger.warn('[updateCar] assigned_to empty/invalid, defaulting to [\'all\']');
        payload.assigned_to = ['all'];
      }
    }
    if (updates.status && updates.status !== prevData.status) {
      if (updates.status === 'reserved') payload.reserved_at = serverTimestamp();
      if (updates.status === 'sold') payload.sold_at = serverTimestamp();
    }
    tx.update(ref, payload);

    const hasOwnerUpdate =
      typeof updates.owner_name === 'string' || typeof updates.owner_phone === 'string';
    if (hasOwnerUpdate) {
      const privateRef = doc(db, CAR_PRIVATE_COLLECTION, id);
      const privateSnap = await tx.get(privateRef);
      const prev = privateSnap.exists() ? privateSnap.data() || {} : {};
      const nextName =
        typeof updates.owner_name === 'string'
          ? updates.owner_name.trim()
          : typeof prev.owner_name === 'string'
            ? prev.owner_name
            : '';
      const nextPhone =
        typeof updates.owner_phone === 'string'
          ? updates.owner_phone.trim()
          : typeof prev.owner_phone === 'string'
            ? prev.owner_phone
            : '';
      tx.set(privateRef, {
        owner_name: nextName,
        owner_phone: nextPhone,
        updated_at: serverTimestamp(),
      });
    }

    const hasInspectorUpdate =
      typeof updates.inspector_name === 'string' ||
      typeof updates.inspector_phone === 'string';
    if (hasInspectorUpdate) {
      const contactRef = doc(db, CAR_CONTACT_COLLECTION, id);
      const contactSnap = await tx.get(contactRef);
      const prev = contactSnap.exists() ? contactSnap.data() || {} : {};
      const nextName =
        typeof updates.inspector_name === 'string'
          ? updates.inspector_name.trim()
          : typeof prev.inspector_name === 'string'
            ? prev.inspector_name
            : '';
      const nextPhone =
        typeof updates.inspector_phone === 'string'
          ? updates.inspector_phone.trim()
          : typeof prev.inspector_phone === 'string'
            ? prev.inspector_phone
            : '';
      tx.set(contactRef, {
        inspector_name: nextName,
        inspector_phone: nextPhone,
        updated_at: serverTimestamp(),
      });
    }
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

  // 2) حذف الـ public doc + private/contact docs
  const ref = doc(db, CARS_COLLECTION, id);
  await deleteDoc(ref);
  try {
    await deleteDoc(doc(db, CAR_PRIVATE_COLLECTION, id));
  } catch (err) {
    logger.warn('[deleteCar] car_private cleanup failed (non-fatal):', err);
  }
  try {
    await deleteDoc(doc(db, CAR_CONTACT_COLLECTION, id));
  } catch (err) {
    logger.warn('[deleteCar] car_contact cleanup failed (non-fatal):', err);
  }

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
  /** User UID — للـ caller الأقدم في الكود، لم نعد نستخدمه كفلتر أساسي */
  uid?: string | null;
  /** ضيف بدون login: كل العربيات */
  publicOnly?: boolean;
  /**
   * Marketer filter: لما المستخدم مسوّق نفلتر على العربيات المعيّنة ليه
   * (assigned_to contains.uid) أو لأي مجموعة من مجموعاته (assigned_to contains any groupUids)
   * أو 'all'. نضيف 'all' ضمن الـ array عشان العربيات العامة تفضل ظاهرة للمسوّق.
   * Firestore 'array-contains-any' محدود 30 قيمة فبنعمل dedup + truncate.
   * لو الـ marketer مش موجود (marketerFilter = null/undefined) → مفيش فلتر assignment
   * (الـ status لم يعد visibility gate — كل العربيات ظاهرة).
   */
  marketerFilter?: { uid: string; groupUids: string[] } | null;
  onError?: (err: Error) => void;
}

/**
 * Real-time listener على مجموعة العربيات.
 *
 * الـ visibility model الحالي:
 * - **ضيف / user عادي / admin / inspector**: كل العربيات (كل الـ statuses بما فيها inactive).
 *   الحالة (status) بقت مجرد تصنيف (متاحة/محجوزة/مباعة/موقوفة) مش visibility gate.
 * - **مسوّق (marketerFilter)**: العربيات المعيّنة ليه أو لأي مجموعة من مجموعاته
 *   أو 'all' — بصرف النظر عن الحالة.
 *
 * ملاحظة: مفيش فلتر status بعد كده. لو الأدمن عايز يخفي عربية، يقدر يغير الحالة
 * لـ 'inactive' (بس اللوحة نفسها مش مخفية).
 */
export function subscribeToCars(
  callback: (cars: Car[]) => void,
  filters: SubscribeToCarsFilters = {}
): () => void {
  const ref = collection(db, CARS_COLLECTION);
  const constraints: QueryConstraint[] = [];

  // Marketer filter: مسوّق يشوف العربيات المعيّنة ليه أو لمجموعته أو الـ 'all' العامة.
  // كمان نفلتر client-side عشان لو الـ query رجّع أكتر من اللازم.
  if (filters.marketerFilter && filters.marketerFilter.uid) {
    const { uid, groupUids } = filters.marketerFilter;
    // 'all' أولاً عشان ما يتقطعش لو المسوّق عضو في أكتر من ~29 مجموعة
    const filterIds = Array.from(new Set(['all', uid, ...groupUids])).slice(0, 30);
    constraints.push(where('assigned_to', 'array-contains-any', filterIds));
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

  // OrderBy مع array-contains-any محتاج composite index — لو مفيش،
  // بنرتّب client-side بعد ما نجيب النتائج.
  const hasAssignmentFilter = !!(filters.marketerFilter && filters.marketerFilter.uid);
  if (!hasAssignmentFilter) {
    constraints.push(orderBy('created_at', 'desc'));
  }

  // Performance guard: cap any admin/owner query to 200 cars.
  // لو عندك أكتر من 200 عربية، الإحصائيات في الـ dashboard هتستخدم
  // getCountFromServer (مش onSnapshot) لتجنّب قراءة المستندات كلها.
  constraints.push(limit(200));

  const q = query(ref, ...constraints);
  const marketerAllowed = hasAssignmentFilter
    ? new Set([
        filters.marketerFilter!.uid,
        'all',
        ...(filters.marketerFilter!.groupUids || []),
      ])
    : null;

  let generation = 0;
  return onSnapshot(
    q,
    (snap) => {
      const myGen = ++generation;
      void (async () => {
        let cars = snap.docs.map(normalizeCar);
        if (marketerAllowed) {
          cars = cars.filter(
            (c) => Array.isArray(c.assigned_to) && c.assigned_to.some((id) => marketerAllowed.has(id))
          );
          cars.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));
        }
        try {
          cars = await attachPrivateContacts(cars);
        } catch (err) {
          logger.error('[subscribeToCars] contact enrich failed:', err);
        }
        if (myGen !== generation) return;
        callback(cars);
      })().catch((err) => {
        logger.error('[subscribeToCars] enrich error:', err);
        filters.onError?.(err instanceof Error ? err : new Error(String(err)));
      });
    },
    (err) => {
      logger.error('[subscribeToCars] error:', err);
      filters.onError?.(err);
    }
  );
}

/**
 * عربية ظاهرة للمشاهد: مفيش فلتر status بعد كده — الـ visibility بقت Assignment-only
 * (للمسوّقين) أو Public (لـ everyone else). الحالة مجرد تصنيف.
 */
export function isCarListedForViewers(car: Car): boolean {
  return true;
}

/**
 * عربية ظاهرة للمستخدم العادي — بقت always true الآن.
 * التوقيع محتفظ بيه للتوافق مع الكود القديم (يستدعي بـ car, uid).
 */
export function isCarVisibleToUser(_car: Car, _uid?: string): boolean {
  return true;
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
  let generation = 0;
  return onSnapshot(
    ref,
    (snap) => {
      const myGen = ++generation;
      void (async () => {
        if (!snap.exists()) {
          if (myGen === generation) callback(null);
          return;
        }
        try {
          const [car] = await attachPrivateContacts([normalizeCar(snap)]);
          if (myGen === generation) callback(car);
        } catch (err) {
          logger.error('Car subscription enrich error:', err);
          if (myGen === generation) callback(normalizeCar(snap));
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      })();
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