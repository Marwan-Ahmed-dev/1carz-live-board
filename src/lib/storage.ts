// دوال رفع الصور إلى Firebase Storage
// نولّد URL طويل الأمد عشان نخزنه في car.image_url

import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from './firebase';

/**
 * الحد الأقصى لعدد الصور الإجمالية (رئيسية + إضافية)
 */
export const MAX_CAR_IMAGES = 30;

/**
 * الحد الأقصى لحجم الصورة الواحدة (5 ميجابايت)
 */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/**
 * رفع صورة عربية واحدة
 * @param file - الملف من input[type=file]
 * @param carId - ID العربية (يُستخدم كبادئة للمسار)
 * @returns URL الصورة على Storage
 */
export async function uploadCarImage(file: File, carId: string): Promise<string> {
  // validation: حجم أقل من 5MB
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
  }
  // validation: نوع الصورة
  if (!file.type.startsWith('image/')) {
    throw new Error('يجب أن يكون الملف صورة');
  }

  // توليد اسم فريد: timestamp + random + extension
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const filename = `${timestamp}-${random}.${ext}`;
  const path = `cars/${carId}/${filename}`;

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
}

/**
 * رفع عدة صور لعربية واحدة
 *
 * - أول ملف يبقى image_url (الرئيسية)
 * - الباقي يضاف لـ additional_images
 * - يتحقق إن الإجمالي (existingKept + newFiles) <= MAX_CAR_IMAGES
 *
 * @param carId - ID العربية
 * @param files - ملفات جديدة من الـ input
 * @param existingImagesToKeep - URLs الصور القديمة اللي ناوي نخليها (الرئيسية + الإضافية)
 * @returns { main: string, additional: string[] }
 */
export async function uploadCarImages(
  carId: string,
  files: File[],
  existingImagesToKeep: string[] = []
): Promise<{ main: string; additional: string[] }> {
  // validation: حد أقصى للإجمالي
  const totalCount = existingImagesToKeep.length + files.length;
  if (totalCount > MAX_CAR_IMAGES) {
    throw new Error(
      `الحد الأقصى ${MAX_CAR_IMAGES} صورة. حالياً عندك ${existingImagesToKeep.length} وعايز تضيف ${files.length}.`
    );
  }
  if (files.length === 0) {
    throw new Error('لم يتم اختيار أي صور');
  }

  // validation: نوع وحجم كل ملف
  files.forEach((file, idx) => {
    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error(`الصورة رقم ${idx + 1} أكبر من 5 ميجابايت`);
    }
    if (!file.type.startsWith('image/')) {
      throw new Error(`الملف رقم ${idx + 1} ليس صورة`);
    }
  });

  // ارفع كل الصور بالتوازي
  const uploadedUrls = await Promise.all(files.map((f) => uploadCarImage(f, carId)));

  // دمج الصور القديمة (المُحتفظ بها) + الجديدة
  // الأولى من الإجمالي هي الـ main
  const allImages = [...existingImagesToKeep, ...uploadedUrls];

  return {
    main: allImages[0] || '',
    additional: allImages.slice(1),
  };
}

/**
 * حذف صورة من Storage بالـ URL
 */
export async function deleteCarImage(imageUrl: string): Promise<void> {
  try {
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (err) {
    console.error('Failed to delete image:', err);
  }
}

/**
 * حذف كل صور عربية من Storage
 * (بيستخدم listAll لمسح مجلد cars/{carId}/ كاملاً)
 */
export async function deleteCarImages(carId: string): Promise<void> {
  try {
    const folderRef = ref(storage, `cars/${carId}`);
    const result = await listAll(folderRef);
    await Promise.all(result.items.map((item) => deleteObject(item)));
  } catch (err) {
    console.error('Failed to delete car images:', err);
  }
}

/**
 * استخراج الـ path من URL الـ Storage
 * (للحذف لاحقاً)
 */
export function extractStoragePath(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    // URL pattern: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?...
    const pathMatch = url.pathname.match(/\/o\/(.+)/);
    if (pathMatch) {
      return decodeURIComponent(pathMatch[1]);
    }
    return null;
  } catch {
    return null;
  }
}
