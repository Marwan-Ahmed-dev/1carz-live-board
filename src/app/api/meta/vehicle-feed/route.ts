import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { resolveVehicleFields } from '@/lib/vehicleParse';
import { SITE_URL } from '@/lib/site';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Meta Vehicles catalog CSV columns (Automotive Inventory Ads). */
const HEADERS = [
  'vehicle_id',
  'title',
  'description',
  'url',
  'make',
  'model',
  'year',
  'mileage.value',
  'mileage.unit',
  'image[0].url',
  'image[1].url',
  'image[2].url',
  'price',
  'state_of_vehicle',
  'body_style',
  'exterior_color',
  'availability',
  'condition',
  'address.city',
  'address.region',
  'address.country',
] as const;

function csvEscape(value: string): string {
  const s = value.replace(/\r?\n/g, ' ').trim();
  if (/[",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function stateOfVehicle(condition: unknown): 'NEW' | 'USED' {
  if (condition === 'new' || condition === 'zero_km') return 'NEW';
  return 'USED';
}

function absoluteUrl(url: string): string {
  const u = (url || '').trim();
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('/')) return `${SITE_URL}${u}`;
  return u;
}

/**
 * Default feed key when META_VEHICLE_FEED_KEY env is missing (e.g. before
 * Vercel env is wired). Override via env in production when possible.
 * URL: https://1carz.com/api/meta/vehicle-feed?key=<secret>
 */
const FALLBACK_FEED_KEY = 'oh0s5by1pr8kaq24wlc79ij3utfdm6nx';

/**
 * Scheduled feed for Meta Commerce Manager → Vehicles catalog.
 * Auth: `key` query param must match META_VEHICLE_FEED_KEY (or fallback).
 */
export async function GET(req: NextRequest) {
  try {
    const expected = (process.env.META_VEHICLE_FEED_KEY || FALLBACK_FEED_KEY).trim();
    const key = (req.nextUrl.searchParams.get('key') || '').trim();
    if (!key || key !== expected) {
      return NextResponse.json(
        { error: 'unauthorized', hint: 'Add ?key=YOUR_META_VEHICLE_FEED_KEY' },
        { status: 401 }
      );
    }

    const db = getAdminDb();
    const snap = await db.collection('cars').where('status', '==', 'active').get();

    const lines: string[] = [HEADERS.join(',')];

    for (const doc of snap.docs) {
      const data = doc.data();
      const title = typeof data.title === 'string' ? data.title : '';
      const price = Number(data.price);
      if (!title || !Number.isFinite(price) || price <= 0) continue;

      const imageUrl = typeof data.image_url === 'string' ? data.image_url : '';
      if (!imageUrl) continue;

      const resolved = resolveVehicleFields({
        title,
        make: typeof data.make === 'string' ? data.make : '',
        model: typeof data.model === 'string' ? data.model : '',
        year: typeof data.year === 'number' ? data.year : null,
        mileage_km: typeof data.mileage_km === 'number' ? data.mileage_km : null,
      });

      const additional = Array.isArray(data.additional_images)
        ? data.additional_images.filter((u): u is string => typeof u === 'string' && !!u)
        : [];
      const images = [imageUrl, ...additional].map(absoluteUrl).filter(Boolean);
      const description =
        typeof data.description === 'string' && data.description.trim()
          ? data.description.trim()
          : title;

      const row: Record<(typeof HEADERS)[number], string> = {
        vehicle_id: doc.id,
        title,
        description: description.slice(0, 5000),
        url: `${SITE_URL}/car/${doc.id}`,
        make: resolved.make,
        model: resolved.model,
        year: String(resolved.year),
        'mileage.value': String(resolved.mileage_km),
        'mileage.unit': 'KM',
        'image[0].url': images[0] || '',
        'image[1].url': images[1] || '',
        'image[2].url': images[2] || '',
        price: `${Math.floor(price)} EGP`,
        state_of_vehicle: stateOfVehicle(data.condition),
        body_style: 'OTHER',
        exterior_color: 'Other',
        availability: 'AVAILABLE',
        condition: 'EXCELLENT',
        'address.city': 'Cairo',
        'address.region': 'Cairo',
        'address.country': 'EG',
      };

      lines.push(HEADERS.map((h) => csvEscape(row[h])).join(','));
    }

    const body = '\uFEFF' + lines.join('\n') + '\n';
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'Content-Disposition': 'inline; filename="1carz-vehicles.csv"',
      },
    });
  } catch (err) {
    logger.error('[vehicle-feed] failed:', err);
    return NextResponse.json({ error: 'feed failed' }, { status: 500 });
  }
}