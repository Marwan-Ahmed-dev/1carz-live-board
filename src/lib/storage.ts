// دوال رفع الصور إلى Firebase Storage
// نولّد URL طويل الأمد عشان نخزنه في car.image_url

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * رفع صورة عربية جديدة
 * @param file - الملف من input[type=file]
 * @param carId - ID العربية (يُستخدم كبادئة للمسار)
 * @returns URL الصورة على Storage
 */
export async function uploadCarImage(file: File, carId: string): Promise<string> {
  // validation: حجم أقل من 5MB
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
  }
  // validation: نوع الصورة
  if (!file.type.startsWith('image/')) {
    throw new Error('يجب أن يكون الملف صورة');
  }

  // توليد اسم فريد: timestamp + extension
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  const filename = `${timestamp}.${ext}`;
  const path = `cars/${carId}/${filename}`;

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
}

/**
 * حذف صورة من Storage
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