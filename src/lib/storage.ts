// دوال رفع الصور إلى Firebase Storage
// نولّد URL طويل الأمد عشان نخزنه في car.image_url

import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from './firebase';

/**
 * الحد الأقصى لعدد الصور الإجمالية (رئيسية + إضافية)
 */
export const MAX_CAR_IMAGES = 30;

/**
 * الحد الأقصى لحجم الصورة الواحدة قبل الضغط (10 ميجابايت)
 */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/**
 * أطول ضلع بعد الضغط — كفاية لشاشات الموبايل والبوستات،
 * وده اللي بيقلّل المساحة جامد (مش إعادة ترميز بنفس الـ megapixels).
 */
const MAX_OUTPUT_EDGE = 1600;

/** هدف الحجم النهائي */
const TARGET_BYTES = 280 * 1024;

/** سقف صارم — لو عدّيناه ننزل الجودة أكتر */
const HARD_MAX_BYTES = 400 * 1024;

const WEBP_QUALITIES = [0.72, 0.6, 0.5, 0.4, 0.32] as const;
const JPEG_QUALITIES = [0.72, 0.6, 0.5, 0.4, 0.32] as const;

let webpEncodeSupported: boolean | null = null;

function canEncodeWebp(): boolean {
  if (typeof document === 'undefined') return false;
  if (webpEncodeSupported != null) return webpEncodeSupported;
  try {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 2;
    webpEncodeSupported = c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    webpEncodeSupported = false;
  }
  return webpEncodeSupported;
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(file.name);
}

async function loadImageElement(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('تعذر قراءة الصورة'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: 'image/webp' | 'image/jpeg',
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

async function encodeSmallest(
  canvas: HTMLCanvasElement,
  mime: 'image/webp' | 'image/jpeg',
  qualities: readonly number[],
  originalSize: number
): Promise<{ blob: Blob; quality: number } | null> {
  let best: { blob: Blob; quality: number } | null = null;

  for (const quality of qualities) {
    const blob = await canvasToBlob(canvas, mime, quality);
    if (!blob || blob.size <= 0) continue;
    // ممنوع نكبّر عن الأصلية
    if (blob.size >= originalSize) continue;
    if (!best || blob.size < best.blob.size) {
      best = { blob, quality };
    }
    if (blob.size <= TARGET_BYTES) break;
  }

  return best;
}

/**
 * يضغط الصورة قبل الرفع بأفضل طريقة عملية للمتصفح:
 * 1) صغّر لأطول ضلع 1600 (ده اللي بيوفّر المساحة بجد)
 * 2) WebP لو المتصفح يدعمه، وإلا JPEG
 * 3) انزل بالجودة لحد هدف ~280KB
 * 4) لو الناتج أكبر من الأصلية → رجّع الأصلية (عمرها ما تزيد)
 */
export async function compressCarImage(file: File): Promise<File> {
  if (!isImageFile(file)) {
    throw new Error('يجب أن يكون الملف صورة');
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('حجم الصورة يجب أن يكون أقل من 10 ميجابايت');
  }

  // صورة جاهزة وصغيرة — متضغطهاش تاني
  if (
    (file.type === 'image/webp' || file.type === 'image/jpeg') &&
    file.size <= HARD_MAX_BYTES
  ) {
    return file;
  }

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await createImageBitmap(file);
  } catch {
    source = await loadImageElement(file);
  }

  const srcW = source.width;
  const srcH = source.height;
  if (!srcW || !srcH) {
    throw new Error('تعذر قراءة أبعاد الصورة');
  }

  const scale = Math.min(1, MAX_OUTPUT_EDGE / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('تعذر ضغط الصورة');
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  if ('close' in source && typeof source.close === 'function') {
    source.close();
  }

  const candidates: Array<{ blob: Blob; mime: string; ext: string }> = [];

  if (canEncodeWebp()) {
    const webp = await encodeSmallest(canvas, 'image/webp', WEBP_QUALITIES, file.size);
    if (webp) candidates.push({ blob: webp.blob, mime: 'image/webp', ext: 'webp' });
  }

  const jpeg = await encodeSmallest(canvas, 'image/jpeg', JPEG_QUALITIES, file.size);
  if (jpeg) candidates.push({ blob: jpeg.blob, mime: 'image/jpeg', ext: 'jpg' });

  // لو مفيش مرشح أصغر من الأصلية — رجّع الأصلية زي ما هي
  if (candidates.length === 0) {
    return file;
  }

  candidates.sort((a, b) => a.blob.size - b.blob.size);
  let chosen = candidates[0];

  // لو لسه كبيرة، جرّب جودة أوطى أكتر على نفس الفورمات الفائز
  if (chosen.blob.size > HARD_MAX_BYTES) {
    const mime = chosen.mime as 'image/webp' | 'image/jpeg';
    for (const q of [0.28, 0.22, 0.18]) {
      const blob = await canvasToBlob(canvas, mime, q);
      if (blob && blob.size < chosen.blob.size && blob.size < file.size) {
        chosen = { blob, mime, ext: chosen.ext };
      }
      if (chosen.blob.size <= TARGET_BYTES) break;
    }
  }

  if (chosen.blob.size >= file.size) {
    return file;
  }

  const base = file.name.replace(/\.[^.]+$/, '') || 'car';
  return new File([chosen.blob], `${base}.${chosen.ext}`, {
    type: chosen.mime,
    lastModified: Date.now(),
  });
}

/**
 * رفع صورة عربية واحدة
 * @param file - الملف من input[type=file]
 * @param carId - ID العربية (يُستخدم كبادئة للمسار)
 * @returns URL الصورة على Storage
 */
export async function uploadCarImage(file: File, carId: string): Promise<string> {
  // لو الفورم ضغط خلاص، متضغطش تاني
  const alreadyOptimized =
    (file.type === 'image/webp' || file.type === 'image/jpeg') && file.size <= HARD_MAX_BYTES;
  const compressed = alreadyOptimized ? file : await compressCarImage(file);

  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const ext = compressed.type === 'image/webp' ? 'webp' : 'jpg';
  const contentType = compressed.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const filename = `${timestamp}-${random}.${ext}`;
  const path = `cars/${carId}/${filename}`;

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, compressed, { contentType });
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
      throw new Error(`الصورة رقم ${idx + 1} أكبر من 10 ميجابايت`);
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
export async function deleteCarImage(imageUrlOrPath: string): Promise<void> {
  try {
    const path = imageUrlOrPath.startsWith('http')
      ? extractStoragePath(imageUrlOrPath)
      : imageUrlOrPath;
    if (!path) return;
    const storageRef = ref(storage, path);
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

export interface CarImageSlotExisting {
  kind: 'existing';
  url: string;
}

export interface CarImageSlotNew {
  kind: 'new';
  file: File;
}

export type CarImageSlot = CarImageSlotExisting | CarImageSlotNew;

/**
 * يرفع الصور الجديدة ويحافظ على ترتيب الخانات (الموجودة + الجديدة مخلوطة).
 */
export async function resolveCarImages(
  carId: string,
  slots: CarImageSlot[]
): Promise<{ main: string; additional: string[] }> {
  const urls: string[] = [];
  for (const slot of slots) {
    if (slot.kind === 'existing') {
      urls.push(slot.url);
    } else {
      urls.push(await uploadCarImage(slot.file, carId));
    }
  }
  return {
    main: urls[0] || '',
    additional: urls.slice(1),
  };
}
