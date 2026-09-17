const FETCH_TIMEOUT_MS = 25000;
const DOWNLOAD_GAP_MS = 550;

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || ""
  );
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
    type: "application/zip",
  });
}

function guessExt(blob: Blob, url: string): string {
  const fromType = blob.type.split("/")[1];
  if (fromType && /^[a-z0-9]+$/i.test(fromType) && !fromType.includes("octet")) {
    return fromType === "jpeg" ? "jpg" : fromType;
  }
  const fromUrl = url.match(/\.(jpe?g|png|webp|gif|bmp)(?:$|\?)/i);
  return fromUrl ? fromUrl[1].replace("jpeg", "jpg").toLowerCase() : "jpg";
}

function safeBaseName(name: string): string {
  const cleaned = name.replace(/[^\w\u0600-\u06FF-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "car";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function triggerDownload(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 8000);
}

function nextImageProxyUrl(imageUrl: string): string {
  const params = new URLSearchParams({ url: imageUrl, w: "2048", q: "90" });
  return `/_next/image?${params.toString()}`;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

async function blobFromResponse(res: Response): Promise<Blob> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  if (!blob || blob.size === 0) throw new Error("empty image");
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

export async function downloadAllCarImages(urls: string[], baseName: string): Promise<void> {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length === 0) {
    throw new Error("لا توجد صور للتحميل");
  }

  const base = safeBaseName(baseName);
  const mobile = isMobileDevice();

  if (!mobile && unique.length > 1) {
    const files: Array<{ name: string; data: Uint8Array }> = [];
    for (let i = 0; i < unique.length; i++) {
      const blob = await fetchImageBlob(unique[i]);
      files.push({
        name: `${base}-${i + 1}.${guessExt(blob, unique[i])}`,
        data: new Uint8Array(await blob.arrayBuffer()),
      });
    }
    triggerDownload(createZip(files), `${base}-images.zip`);
    return;
  }

  for (let i = 0; i < unique.length; i++) {
    const blob = await fetchImageBlob(unique[i]);
    triggerDownload(blob, `${base}-${i + 1}.${guessExt(blob, unique[i])}`);
    if (i < unique.length - 1) {
      await sleep(DOWNLOAD_GAP_MS);
    }
  }
}
