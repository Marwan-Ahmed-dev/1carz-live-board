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

/** أبعاد واضحة للعرض — أقرب لـ StorageImageService في Flutter (1280×960) */
const MAX_WIDTH = 1280;
const MAX_HEIGHT = 960;

/** هدف المساحة بعد الضغط */
const TARGET_MIN_BYTES = 150 * 1024;
const TARGET_MAX_BYTES = 200 * 1024;

const QUALITY_FLOOR = 0.55;
const QUALITY_CEIL = 0.88;

/** زي copyResize في Flutter: landscape → maxWidth، portrait → maxHeight */
function fitWithinBox(
  srcW: number,
  srcH: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (srcW <= maxWidth && srcH <= maxHeight) {
    return { width: srcW, height: srcH };
  }
  if (srcW >= srcH) {
    const width = Math.min(srcW, maxWidth);
    const height = Math.max(1, Math.round((srcH / srcW) * width));
    return { width, height };
  }
  const height = Math.min(srcH, maxHeight);
  const width = Math.max(1, Math.round((srcW / srcH) * height));
  return { width, height };
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

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size === 0) reject(new Error('تعذر ضغط الصورة'));
        else resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

function drawToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number
): HTMLCanvasElement {
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
  return canvas;
}

/** يضبط جودة JPEG عشان المساحة توقع بين 150–200KB قد الإمكان */
async function encodeNearTarget(canvas: HTMLCanvasElement): Promise<Blob> {
  let lo = QUALITY_FLOOR;
  let hi = QUALITY_CEIL;
  let best = await canvasToJpegBlob(canvas, 0.78);

  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    const blob = await canvasToJpegBlob(canvas, mid);
    best = blob;
    if (blob.size > TARGET_MAX_BYTES) {
      hi = mid;
    } else if (blob.size < TARGET_MIN_BYTES) {
      lo = mid;
    } else {
      return blob;
    }
  }

  if (best.size > TARGET_MAX_BYTES) {
    best = await canvasToJpegBlob(canvas, QUALITY_FLOOR);
  }
  return best;
}

/**
 * ضغط صور العربيات بجودة واضحة للعين ومساحة ~150–200KB.
 * الأبعاد حوالي 1280×960 (مش 600×450 اللي كانت بتبوّظ الصورة).
 */
export async function compressCarImage(file: File): Promise<File> {
  if (!isImageFile(file)) {
    throw new Error('يجب أن يكون الملف صورة');
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('حجم الصورة يجب أن يكون أقل من 10 ميجابايت');
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

  let { width, height } = fitWithinBox(srcW, srcH, MAX_WIDTH, MAX_HEIGHT);
  let canvas = drawToCanvas(source, width, height);
  let blob = await encodeNearTarget(canvas);

  // لو لسه أكبر من 200KB عند أقل جودة، صغّر شوية وأعدّ
  if (blob.size > TARGET_MAX_BYTES) {
    const smaller = fitWithinBox(srcW, srcH, 1080, 810);
    width = smaller.width;
    height = smaller.height;
    canvas = drawToCanvas(source, width, height);
    blob = await encodeNearTarget(canvas);
  }

  if ('close' in source && typeof source.close === 'function') {
    source.close();
  }

  const base = file.name.replace(/\.[^.]+$/, '') || 'car';
  return new File([blob], `${base}.jpg`, {
    type: 'image/jpeg',
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
  // لو الفورم ضغط بالفعل ضمن الهدف، متضغطش تاني
  const alreadyCompressed =
    file.type === 'image/jpeg' &&
    file.name.endsWith('.jpg') &&
    file.size <= TARGET_MAX_BYTES + 20 * 1024;
  const compressed = alreadyCompressed ? file : await compressCarImage(file);

  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const filename = `${timestamp}-${random}.jpg`;
  const path = `cars/${carId}/${filename}`;

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, compressed, {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=2592000',
  });
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
