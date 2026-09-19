const FETCH_TIMEOUT_MS = 25000;
const DOWNLOAD_GAP_MS = 550;
/** iOS بيسمح بعدد محدود في شيت المشاركة الواحد */
const IOS_SHARE_BATCH = 12;

export type DownloadImagesResult = 'shared' | 'downloaded' | 'cancelled';

export type DownloadAllResult =
  | { status: DownloadImagesResult }
  | {
      status: 'needs-ios-confirm';
      title: string;
      batches: File[][];
    };

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || ''
  );
}

/** iPhone/iPad + iPadOS that reports itself as MacIntel. */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function crc32(bytes: Uint8Array): number {
  let crc = ~0;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function u16(n: number): Uint8Array {
  return Uint8Array.of(n & 0xff, (n >>> 8) & 0xff);
}

function u32(n: number): Uint8Array {
  return Uint8Array.of(n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function bytesToBlobPart(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function createZip(files: Array<{ name: string; data: Uint8Array }>): Blob {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = concatBytes([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
      file.data,
    ]);
    const central = concatBytes([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const localPart = concatBytes(locals);
  const centralPart = concatBytes(centrals);
  const end = concatBytes([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralPart.length),
    u32(localPart.length),
    u16(0),
  ]);

  return new Blob([bytesToBlobPart(concatBytes([localPart, centralPart, end]))], {
    type: 'application/zip',
  });
}

function guessExt(blob: Blob, url: string): string {
  const fromType = blob.type.split('/')[1];
  if (fromType && /^[a-z0-9]+$/i.test(fromType) && !fromType.includes('octet')) {
    return fromType === 'jpeg' ? 'jpg' : fromType;
  }
  const fromUrl = url.match(/\.(jpe?g|png|webp|gif|bmp)(?:$|\?)/i);
  return fromUrl ? fromUrl[1].replace('jpeg', 'jpg').toLowerCase() : 'jpg';
}

function imageMime(blob: Blob, ext: string): string {
  if (blob.type && blob.type.startsWith('image/')) return blob.type;
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

function safeBaseName(name: string): string {
  const cleaned = name.replace(/[^\w\u0600-\u06FF-]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'car';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function triggerDownload(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(href);
  }, 60_000);
}

function nextImageProxyUrl(imageUrl: string): string {
  const params = new URLSearchParams({ url: imageUrl, w: '2048', q: '90' });
  return `/_next/image?${params.toString()}`;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

async function blobFromResponse(res: Response): Promise<Blob> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  if (!blob || blob.size === 0) throw new Error('empty image');
  return blob;
}

async function fetchImageBlob(url: string): Promise<Blob> {
  try {
    return await blobFromResponse(await fetchWithTimeout(nextImageProxyUrl(url), FETCH_TIMEOUT_MS));
  } catch {
    /* try original URL if CORS is allowed */
  }
  return await blobFromResponse(await fetchWithTimeout(url, 8000));
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('تعذر تجهيز الصورة'));
        else resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

/** iOS Save Image بيشتغل أوضح مع JPEG بأسماء .jpg */
async function toJpegFile(blob: Blob, filename: string): Promise<File> {
  const jpgName = filename.replace(/\.[^.]+$/, '.jpg');
  if (blob.type === 'image/jpeg' || blob.type === 'image/jpg') {
    return new File([blob], jpgName, { type: 'image/jpeg' });
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('تعذر تجهيز الصورة');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    const jpeg = await canvasToJpegBlob(canvas, 0.9);
    return new File([jpeg], jpgName, { type: 'image/jpeg' });
  } catch {
    return new File([blob], jpgName, { type: 'image/jpeg' });
  } finally {
    bitmap?.close();
  }
}

function chunkFiles(files: File[], size: number): File[][] {
  const batches: File[][] = [];
  for (let i = 0; i < files.length; i += size) {
    batches.push(files.slice(i, i + size));
  }
  return batches;
}

function canShareFiles(files: File[]): boolean {
  try {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      typeof navigator.share === 'function' &&
      navigator.canShare({ files })
    );
  } catch {
    return false;
  }
}

async function shareFiles(files: File[], title: string): Promise<DownloadImagesResult | 'failed'> {
  try {
    // iOS: files-only share بدون text بيفتح خيار "حفظ الصور" أوضح
    await navigator.share({ files, title });
    return 'shared';
  } catch (err) {
    const name = err instanceof DOMException || err instanceof Error ? err.name : '';
    if (name === 'AbortError') return 'cancelled';
    return 'failed';
  }
}

/** مشاركة دفعة صور — لازم تتنده من ضغطة مستخدم مباشرة (خصوصاً iOS). */
export async function shareCarImageFiles(
  files: File[],
  title: string
): Promise<DownloadImagesResult> {
  if (!files.length) throw new Error('لا توجد صور للتحميل');
  if (!canShareFiles(files)) {
    throw new Error('الجهاز لا يدعم حفظ مجموعة صور دفعة واحدة');
  }
  const result = await shareFiles(files, title);
  if (result === 'failed') {
    throw new Error('فشل فتح شاشة الحفظ');
  }
  return result;
}

async function prepareJpegFiles(urls: string[], baseName: string): Promise<File[]> {
  const unique = [...new Set(urls.filter(Boolean))];
  const base = safeBaseName(baseName);
  const files: File[] = [];

  for (let i = 0; i < unique.length; i++) {
    const blob = await fetchImageBlob(unique[i]);
    const ext = guessExt(blob, unique[i]);
    const typed = blob.type ? blob : new Blob([blob], { type: imageMime(blob, ext) });
    files.push(await toJpegFile(typed, `${base}-${i + 1}.jpg`));
  }

  return files;
}

export async function downloadAllCarImages(
  urls: string[],
  baseName: string
): Promise<DownloadAllResult> {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length === 0) {
    throw new Error('لا توجد صور للتحميل');
  }

  const base = safeBaseName(baseName);

  // iOS: جهّز JPEG ثم اطلب تأكيد بضغطة جديدة (الـ gesture بينتهي أثناء التحميل)
  if (isIOSDevice()) {
    const files = await prepareJpegFiles(unique, base);

    if (files.length === 1 && canShareFiles(files)) {
      const shared = await shareFiles(files, base);
      if (shared !== 'failed') return { status: shared };
      triggerDownload(files[0], files[0].name);
      return { status: 'downloaded' };
    }

    if (files.length === 1) {
      triggerDownload(files[0], files[0].name);
      return { status: 'downloaded' };
    }

    const batches = chunkFiles(files, IOS_SHARE_BATCH).filter((batch) => canShareFiles(batch));
    if (batches.length === 0) {
      throw new Error('الجهاز لا يدعم حفظ الصور. استخدم زر التحميل على كل صورة.');
    }

    // محاولة سريعة لو الـ gesture لسه شغال (صور قليلة/متکشة)
    if (batches.length === 1) {
      const shared = await shareFiles(batches[0], base);
      if (shared === 'shared' || shared === 'cancelled') {
        return { status: shared };
      }
    }

    return { status: 'needs-ios-confirm', title: base, batches };
  }

  const images: Array<{ name: string; data: Uint8Array; type: string }> = [];
  for (let i = 0; i < unique.length; i++) {
    const blob = await fetchImageBlob(unique[i]);
    const ext = guessExt(blob, unique[i]);
    images.push({
      name: `${base}-${i + 1}.${ext}`,
      data: new Uint8Array(await blob.arrayBuffer()),
      type: imageMime(blob, ext),
    });
  }

  if (!isMobileDevice() && images.length > 1) {
    triggerDownload(createZip(images.map(({ name, data }) => ({ name, data }))), `${base}-images.zip`);
    return { status: 'downloaded' };
  }

  // Android وغيره: مشاركة كصور لو متاحة، وإلا تحميل ملف ملف
  if (isMobileDevice() && images.length > 1) {
    const files = images.map(
      (img) => new File([bytesToBlobPart(img.data)], img.name, { type: img.type })
    );
    if (canShareFiles(files)) {
      const shared = await shareFiles(files, base);
      if (shared !== 'failed') return { status: shared };
    }
  }

  for (let i = 0; i < images.length; i++) {
    triggerDownload(new Blob([bytesToBlobPart(images[i].data)], { type: images[i].type }), images[i].name);
    if (i < images.length - 1) {
      await sleep(DOWNLOAD_GAP_MS);
    }
  }
  return { status: 'downloaded' };
}

/** تحميل صورة واحدة — على iOS بيفتح Share Sheet عشان Save Image يشتغل. */
export async function downloadSingleCarImage(
  url: string,
  baseName: string,
  index = 1
): Promise<DownloadImagesResult> {
  if (!url) throw new Error('لا توجد صورة للتحميل');

  const base = safeBaseName(baseName);
  const blob = await fetchImageBlob(url);
  const file = await toJpegFile(blob, `${base}-${index}.jpg`);

  if (isIOSDevice() && canShareFiles([file])) {
    const shared = await shareFiles([file], base);
    if (shared !== 'failed') return shared;
  }

  triggerDownload(file, file.name);
  return 'downloaded';
}
