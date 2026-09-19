// أنواع TypeScript الأساسية للتطبيق
// نُعرّف كل الأنواع المستخدمة في Firestore والـ components

import { Timestamp } from 'firebase/firestore';

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
 * الـ Car document كما هو مخزّن في Firestore
 */
export type AccountRole = 'admin' | 'user' | 'inspector';

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
  // ✅ نستخدم UIDs (مش usernames) عشان الـ assignment يقدر يشتغل
  // حتى لو المستخدم ما عملش onboarding لسه.
  // ['all'] = لكل المستخدمين، ['uid1', 'uid2'] = لهؤلاء بس
  assigned_to: string[];
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
  reserved_at?: Timestamp | null;
  sold_at?: Timestamp | null;
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
  onboarded_at: Timestamp | null;
  created_at: Timestamp | null;
  last_seen: Timestamp | null;
}

/**
 * مجموعة مستخدمين يديرها الأدمن
 */
export interface UserGroup {
  id: string;
  name: string;
  memberUids: string[];
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
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