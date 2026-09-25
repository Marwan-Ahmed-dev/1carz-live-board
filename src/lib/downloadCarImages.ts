const FETCH_TIMEOUT_MS = 25000;
const DOWNLOAD_GAP_MS = 450;

export type DownloadImagesResult = 'shared' | 'downloaded' | 'cancelled';

export type DownloadAllResult =
  | { status: DownloadImagesResult }
  | {
      /** iOS فقط: جاهز للحفظ مجموعة بمجموعة بعد ما فشل الحفظ دفعة واحدة */
      status: 'needs-ios-batches';
      title: string;
      batches: File[][];
      fileCount: number;
    };

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
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
  const fromType = (blob.type || '').split('/')[1];
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
  return cleaned.slice(0, 80) || 'car';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function makeFile(parts: BlobPart[], name: string, type: string): File {
  try {
    return new File(parts, name, { type, lastModified: Date.now() });
  } catch {
    const blob = new Blob(parts, { type });
    Object.defineProperty(blob, 'name', { value: name, configurable: true });
    Object.defineProperty(blob, 'lastModified', { value: Date.now(), configurable: true });
    return blob as File;
  }
}

export function triggerDownload(blob: Blob, filename: string): void {
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

function proxyImageUrl(imageUrl: string): string {
  return `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
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
    return await blobFromResponse(await fetchWithTimeout(proxyImageUrl(url), FETCH_TIMEOUT_MS));
  } catch {
    /* fall through */
  }
  try {
    return await blobFromResponse(await fetchWithTimeout(nextImageProxyUrl(url), FETCH_TIMEOUT_MS));
  } catch {
    /* fall through */
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

async function toJpegFile(blob: Blob, filename: string): Promise<File> {
  const jpgName = filename.replace(/\.[^.]+$/, '') + '.jpg';
  if (blob.type === 'image/jpeg' || blob.type === 'image/jpg') {
    return makeFile([blob], jpgName, 'image/jpeg');
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
    const jpeg = await canvasToJpegBlob(canvas, 0.92);
    return makeFile([jpeg], jpgName, 'image/jpeg');
  } catch {
    return makeFile([blob], jpgName, 'image/jpeg');
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

/** iOS: جرّب الكل، وإلا قسّم لمجموعات قابلة للمشاركة */
function buildIosShareBatches(files: File[]): File[][] {
  if (files.length === 0) return [];
  if (canShareFiles(files)) return [files];

  for (const size of [20, 15, 12, 10, 8, 5, 3, 1]) {
    if (size >= files.length) continue;
    const batches = chunkFiles(files, size);
    if (batches.every((batch) => canShareFiles(batch))) {
      return batches;
    }
  }

  return files.filter((f) => canShareFiles([f])).map((f) => [f]);
}

async function shareFiles(files: File[], title: string): Promise<DownloadImagesResult | 'failed'> {
  try {
    await navigator.share({ files, title });
    return 'shared';
  } catch (err) {
    const name = err instanceof DOMException || err instanceof Error ? err.name : '';
    if (name === 'AbortError') return 'cancelled';
    return 'failed';
  }
}

/** مشاركة دفعة صور — لازم من ضغطة مستخدم مباشرة (iOS). */
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

async function filesToZipBlob(files: File[], zipName: string): Promise<{ blob: Blob; name: string }> {
  const entries = await Promise.all(
    files.map(async (f) => ({
      name: f.name || 'image.jpg',
      data: new Uint8Array(await f.arrayBuffer()),
    }))
  );
  return { blob: createZip(entries), name: zipName };
}

async function prepareJpegFiles(urls: string[], baseName: string): Promise<File[]> {
  const unique = [...new Set(urls.filter(Boolean))];
  const base = safeBaseName(baseName);

  const settled = await Promise.allSettled(
    unique.map(async (url, i) => {
      const blob = await fetchImageBlob(url);
      const ext = guessExt(blob, url);
      const typed = blob.type ? blob : new Blob([blob], { type: imageMime(blob, ext) });
      return toJpegFile(typed, `${base}-${i + 1}.jpg`);
    })
  );

  const files: File[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') files.push(result.value);
  }

  if (files.length === 0) {
    throw new Error('تعذر تحميل الصور من السيرفر. جرّب تاني أو استخدم زر كل صورة لوحدها.');
  }

  return files;
}

/** Android / desktop-like mobile: نزّل الصور واحدة ورا التانية من غير dialog ولا share */
async function downloadFilesDirectly(files: File[]): Promise<DownloadImagesResult> {
  for (let i = 0; i < files.length; i++) {
    triggerDownload(files[i], files[i].name);
    if (i < files.length - 1) {
      await sleep(DOWNLOAD_GAP_MS);
    }
  }
  return 'downloaded';
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
  const files = await prepareJpegFiles(unique, base);

  // —— iOS: جرّب الكل دفعة واحدة، لو فشل → مجموعات مجموعة بمجموعة ——
  if (isIOSDevice()) {
    const batches = buildIosShareBatches(files);
    if (batches.length === 0) {
      throw new Error('الجهاز لا يدعم حفظ الصور. استخدم زر التحميل على كل صورة.');
    }

    // محاولة واحدة لكل الصور مع بعض (لما يبقوا دفعة واحدة)
    if (batches.length === 1) {
      const shared = await shareFiles(batches[0], base);
      if (shared === 'shared' || shared === 'cancelled') {
        return { status: shared };
      }
    }

    // فشل الكل أو محتاجين مجموعات → الـ UI يكمل مجموعة بمجموعة
    return {
      status: 'needs-ios-batches',
      title: base,
      batches,
      fileCount: files.length,
    };
  }

  // —— Android: تحميل مباشر لكل صورة، من غير dialog ولا share ——
  if (isAndroidDevice() || isMobileDevice()) {
    return { status: await downloadFilesDirectly(files) };
  }

  // —— Desktop: ZIP لو أكتر من صورة ——
  if (files.length > 1) {
    const { blob, name } = await filesToZipBlob(files, `${base}-images.zip`);
    triggerDownload(blob, name);
    return { status: 'downloaded' };
  }

  triggerDownload(files[0], files[0].name);
  return { status: 'downloaded' };
}

/** تحميل صورة واحدة */
export async function downloadSingleCarImage(
  url: string,
  baseName: string,
  index = 1
): Promise<DownloadImagesResult> {
  if (!url) throw new Error('لا توجد صورة للتحميل');

  const base = safeBaseName(baseName);
  const blob = await fetchImageBlob(url);
  const file = await toJpegFile(blob, `${base}-${index}.jpg`);

  // iOS: Share Sheet → Save Image
  if (isIOSDevice() && canShareFiles([file])) {
    const shared = await shareFiles([file], base);
    if (shared !== 'failed') return shared;
  }

  // Android + desktop: تحميل مباشر
  triggerDownload(file, file.name);
  return 'downloaded';
}