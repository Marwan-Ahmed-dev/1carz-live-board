// أنواع TypeScript الأساسية للتطبيق
// نُعرّف كل الأنواع المستخدمة في Firestore والـ components

import { Timestamp } from 'firebase/firestore';

/**
 * أولويات عرض العربيات
 * - top: قصوى (أعلى مستوى)
 * - high: عالية
 * - medium: متوسطة
 * - low: منخفضة
 */
export type Priority = 'top' | 'high' | 'medium' | 'low';

/**
 * حالات العربية
 * - active: متاحة للعرض
 * - inactive: غير معروضة
 * - reserved: محجوزة
 * - sold: مباعة
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
export interface Car {
  id?: string;
  code: string; // مثل "C-2024-001"
  title: string; // العنوان (يحتوي على كل معلومات العربية)
  price: number; // السعر بالجنيه المصري
  description: string; // وصف قصير بالعربي
  priority: Priority; // أولوية العرض
  status: CarStatus; // حالة التوفر
  image_url: string; // رابط الصورة الرئيسية
  additional_images: string[]; // صور إضافية (بحد أقصى 29 صورة إضافية، الإجمالي 30)
  condition: CarCondition; // جودة العربية
  is_featured: boolean; // مميزة (تعرض badge "قيدوي")
  // ✅ نستخدم UIDs (مش usernames) عشان الـ assignment يقدر يشتغل
  // حتى لو المستخدم ما عملش onboarding لسه.
  // ['all'] = لكل المستخدمين، ['uid1', 'uid2'] = لهؤلاء بس
  assigned_to: string[];
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}

/**
 * خيارات فلتر الأولوية في الواجهة
 */
export type PriorityFilter = Priority | 'all' | 'mine';

/**
 * الـ User document في Firestore
 */
export interface AppUser {
  uid: string;
  email: string;
  username: string | null; // null حتى يكتمل الـ onboarding
  onboarded_at: Timestamp | null;
  created_at: Timestamp | null;
  last_seen: Timestamp | null;
}

/**
 * بيانات الـ Auth response من Firebase
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  isAdmin: boolean;
}

/**
 * نموذج إنشاء عربية جديدة (قبل الإضافة إلى Firestore)
 */
export type NewCarInput = Omit<Car, 'id' | 'created_at' | 'updated_at'>;

/**
 * نموذج تحديث عربية
 */
export type CarUpdateInput = Partial<Omit<Car, 'id' | 'created_at'>>;