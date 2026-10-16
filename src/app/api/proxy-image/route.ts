import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_HOST_SUFFIXES = [
  'firebasestorage.googleapis.com',
  'firebasestorage.app',
  'storage.googleapis.com',
];

const MAX_BYTES = 5 * 1024 * 1024;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
const hits = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function rateLimit(key: string): boolean {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now >= cur.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  cur.count += 1;
  return cur.count <= RATE_MAX;
}

function isAllowedImageUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith('.' + suffix)
    );
  } catch {
    return false;
  }
}

/** Authenticated same-origin proxy for Firebase images (download ZIP). */
export async function GET(req: NextRequest) {
  const key = clientKey(req);
  if (!rateLimit(key)) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 });
  }

  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    await getAdminAuth().verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = req.nextUrl.searchParams.get('url');
  if (!url || !isAllowedImageUrl(url)) {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      headers: { Accept: 'image/*,*/*' },
      cache: 'no-store',
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: 'upstream ' + upstream.status }, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
      return NextResponse.json({ error: 'not an image' }, { status: 415 });
    }

    const cl = upstream.headers.get('content-length');
    if (cl && Number(cl) > MAX_BYTES) {
      return NextResponse.json({ error: 'too large' }, { status: 413 });
    }

    const buffer = await upstream.arrayBuffer();
    if (!buffer.byteLength) {
      return NextResponse.json({ error: 'empty image' }, { status: 502 });
    }
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'too large' }, { status: 413 });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType.startsWith('image/') ? contentType : 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'proxy failed' }, { status: 502 });
  }
}