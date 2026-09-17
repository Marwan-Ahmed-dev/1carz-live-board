import { getBlob, ref } from 'firebase/storage';
import { extractStoragePath } from './storage';
import { storage } from './firebase';

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

  const zipBytes = concatBytes([localPart, centralPart, end]);
  const zipBuffer = zipBytes.buffer.slice(
    zipBytes.byteOffset,
    zipBytes.byteOffset + zipBytes.byteLength
  ) as ArrayBuffer;
  return new Blob([zipBuffer], { type: 'application/zip' });
}

function guessExt(blob: Blob, url: string): string {
  const fromType = blob.type.split('/')[1];
  if (fromType && /^[a-z0-9]+$/i.test(fromType)) {
    return fromType === 'jpeg' ? 'jpg' : fromType;
  }
  const fromUrl = url.match(/\.(jpe?g|png|webp|gif|bmp)(?:$|\?)/i);
  return fromUrl ? fromUrl[1].replace('jpeg', 'jpg').toLowerCase() : 'jpg';
}

function safeBaseName(name: string): string {
  const cleaned = name.replace(/[^\w\u0600-\u06FF-]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'car';
}

function triggerDownload(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

async function fetchImageBlob(url: string): Promise<Blob> {
  const path = extractStoragePath(url);
  if (path) {
    try {
      return await getBlob(ref(storage, path));
    } catch {
      // لو SDK فشل (CORS/قواعد) نجرب التحميل المباشر من الرابط
    }
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('فشل تحميل إحدى الصور');
  return res.blob();
}

/**
 * يحمّل كل صور العربية. صورة واحدة تتنزل مباشرة، أكتر من صورة تتنزل في ملف ZIP.
 */
export async function downloadAllCarImages(urls: string[], baseName: string): Promise<void> {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length === 0) {
    throw new Error('لا توجد صور للتحميل');
  }

  const base = safeBaseName(baseName);

  if (unique.length === 1) {
    const blob = await fetchImageBlob(unique[0]);
    triggerDownload(blob, `${base}-1.${guessExt(blob, unique[0])}`);
    return;
  }

  const files = await Promise.all(
    unique.map(async (url, i) => {
      const blob = await fetchImageBlob(url);
      const data = new Uint8Array(await blob.arrayBuffer());
      return { name: `${base}-${i + 1}.${guessExt(blob, url)}`, data };
    })
  );

  triggerDownload(createZip(files), `${base}-images.zip`);
}
