// أنواع TypeScript الأساسية للتطبيق
// نُعرّف كل الأنواع المستخدمة في Firestore والـ components

import { Timestamp } from 'firebase/firestore';

/**
 * Timestamp من Firestore أو null.
 * الـ write-time `serverTimestamp()` sentinel بيتعمل cast محلي في lib/cars.ts و lib/auth.ts.
 */
export type FirestoreTs = Timestamp | null;

/**
 * أولويات عرض العربيات
 * - arabyatna: عربياتنا
 * - top: قصوى (أعلى مستوى)
 * - high: عالية
 * - medium: متوسطة
 * - low: منخفضة
 */
export type Priority = 'arabyatna' | 'top' | 'high' | 'medium' | 'low';

/**
 * حالات التوفر
 * - active: متاحة
 * - reserved: محجوزة
 * - sold: مباعة
 * - inactive: قيمة قديمة (لم تعد تُختار في الواجهة)
 */
export type CarStatus = 'active' | 'inactive' | 'reserved' | 'sold';

/**
 * حالة العربية (جودة)
 * - new: جديدة
 * - used: مستعملة
 * - excellent: ممتازة
 * - good: جيدة
 * - zero_km: كسر زيرو
 */
export type CarCondition = 'new' | 'used' | 'excellent' | 'good' | 'zero_km';

/**
 * أدوار الحساب في التطبيق.
 *
 * - admin    : أدمن — وصول كامل للوحة التحكم.
 * - user     : مسوّق — يشوف العربيات المعيّنة له فقط.
 * - inspector: معاين — يقدر ينشئ/يحدّث العربيات في اللوحة.
 * - source   : مصدر — يستخدم للسجل السعري (/market/*) فقط.
 *              له صلاحية قراءة/كتابة على collection `market_registry`
 *              بس، وما يقدرش يدخل على /admin أو /cars.
 */
export type AccountRole = 'admin' | 'user' | 'inspector' | 'source';

/**
 * صف الـ Market Registry كما هو مخزّن في Firestore (collection `market_registry`).
 * الـ fields مطلوبة كلها في الـ create. الـ ids للـ entry مستودعة من Firestore
 * بعد الـ push (والـ pending version يستخدم client_id مولّد محلياً).
 */
export interface MarketEntry {
  id: string;
  brand: string; // نوع العربية
  model: string; // الموديل
  year: number; // سنة التصنيع
  trim: string; // الفئة
  paint_condition: string; // فابريكا من جوا ومن برا ام لا (free text)
  mileage_km: number; // عداد الكيلومتر
  maintenance: string; // نوع صيانات السيارة (free text)
  price_egp: number; // السعر بالجنيه المصري (إلزامي)
  notes?: string; // ملاحظات اختيارية (max 500)
  recorded_by_uid: string;
  recorded_by_name?: string | null;
  created_at: FirestoreTs;
  updated_at: FirestoreTs;
  synced_at?: FirestoreTs;
}

/**
 * الـ input اللي المستخدم بيملاه في الـ UI — قبل الـ transform إلى MarketEntry.
 */
export type MarketEntryInput = Omit<
  MarketEntry,
  'id' | 'created_at' | 'updated_at' | 'synced_at' | 'recorded_by_uid' | 'recorded_by_name'
>;

/**
 * نسخة معلّقة (pending) مخزّنة في IndexedDB قبل ما تتـ push لـ Firestore.
 * الـ client_id مولّد محلياً (uuid) عشان نضمن عدم تكرار الـ push.
 */
export interface PendingMarketEntry {
  client_id: string;
  brand: string;
  model: string;
  year: number;
  trim: string;
  paint_condition: string;
  mileage_km: number;
  maintenance: string;
  price_egp: number;
  notes?: string;
  recorded_by_uid: string;
  recorded_by_name?: string | null;
  queued_at: number; // Date.now() وقت الـ enqueue
  last_error?: string | null;
}

/**
 * الـ Car document كما هو مخزّن في Firestore
 */

export interface Car {
  id?: string;
  title: string; // العنوان (يحتوي على كل معلومات العربية)
  price: number; // السعر بالجنيه المصري
  description: string; // وصف قصير بالعربي
  priority: Priority; // أولوية العرض
  status: CarStatus; // حالة التوفر
  image_url: string; // رابط الصورة الرئيسية
  additional_images: string[]; // صور إضافية (بحد أقصى 29 صورة إضافية، الإجمالي 30)
  condition: CarCondition; // جودة العربية
  is_featured: boolean; // مميزة (تعرض badge "مميز")
  inspector_name: string;
  inspector_phone: string;
  owner_name: string;
  owner_phone: string;
  /** مكان المعاينة — يظهر للجميع على البطاقة وصفحة التفاصيل */
  inspection_location?: string;
  /** UID الأدمن/المعاين اللي رفع العربية */
  created_by_uid?: string;
  // ✅ نستخدم UIDs (مش usernames) عشان الـ assignment يقدر يشتغل
  // حتى لو المستخدم ما عملش onboarding لسه.
  // ['all'] = لكل المستخدمين، ['uid1', 'uid2'] = لهؤلاء بس
  assigned_to: string[];
  created_at: FirestoreTs;
  updated_at: FirestoreTs;
  reserved_at?: FirestoreTs;
  sold_at?: FirestoreTs;
}

/**
 * خيارات فلتر الأولوية في الواجهة
 */
export type PriorityFilter = Priority | 'all';

/**
 * الـ User document في Firestore
 */
export interface AppUser {
  uid: string;
  email: string;
  username: string | null; // null حتى يكتمل الـ onboarding
  phone?: string;
  role?: AccountRole;
  /**
   * Explicit marketer flag — true لو الحساب ده مسوّق.
   * Distinguishes مسوّق عن باقي الـ user roles (regular users, etc).
   * الـ app/src/app/cars يفلتر العربيات بـ assigned_to بناءً على الـ flag ده
   * (مع fallback على daily_buyer_limit > 0 لو مش متعيّن).
   */
  is_marketer?: boolean;
  /** حد تسجيل المشترين اليومي للمسوّق — افتراضي 5 */
  daily_buyer_limit?: number;
  onboarded_at: FirestoreTs;
  created_at: FirestoreTs;
  last_seen: FirestoreTs;
}

/** تسجيل مشتري من المسوّق */
export interface BuyerLead {
  id: string;
  name: string;
  phone: string;
  description: string;
  marketer_uid: string;
  marketer_name: string | null;
  marketer_phone: string | null;
  created_at: FirestoreTs;
}

export const DEFAULT_DAILY_BUYER_LIMIT = 5;

/**
 * مجموعة مستخدمين يديرها الأدمن
 */
export interface UserGroup {
  id: string;
  name: string;
  memberUids: string[];
  /** UID الأدمن اللي أنشأ المجموعة — للعزل بين الأدمنز */
  created_by_uid?: string;
  created_at: FirestoreTs;
  updated_at: FirestoreTs;
}

/**
 * بيانات الـ Auth response من Firebase
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  isAdmin: boolean;
  isInspector?: boolean;
}

/**
 * نموذج إنشاء عربية جديدة (قبل الإضافة إلى Firestore)
 */
export type NewCarInput = Omit<Car, 'id' | 'created_at' | 'updated_at'>;

/**
 * نموذج تحديث عربية
 */
export type CarUpdateInput = Partial<Omit<Car, 'id' | 'created_at'>>;