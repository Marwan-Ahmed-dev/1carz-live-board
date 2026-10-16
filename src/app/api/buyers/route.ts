import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { jsonError, requireAuth } from '@/lib/adminAuthServer';
import { cairoDateKey } from '@/lib/cairoDay';
import { digitsOnly, validateBuyerPhone } from '@/lib/phone';
import { DEFAULT_DAILY_BUYER_LIMIT } from '@/lib/types';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function statusFromError(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'status' in err) {
    const s = (err as { status?: unknown }).status;
    if (typeof s === 'number') return s;
  }
  return undefined;
}

/**
 * Server-enforced buyer lead create.
 * Client SDK create on buyer_leads is denied by Firestore rules.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = (await req.json()) as {
      name?: string;
      phone?: string;
      description?: string;
      carId?: string;
      carTitle?: string;
      marketerName?: string | null;
      marketerPhone?: string | null;
    };

    const name = (body.name || '').trim();
    if (name.length < 2 || name.length > 120) {
      return jsonError(400, 'اسم المشتري مطلوب');
    }
    const phoneErr = validateBuyerPhone(body.phone || '');
    if (phoneErr) return jsonError(400, phoneErr);
    const phone = digitsOnly(body.phone || '');
    const description = (body.description || '').trim();
    if (!description || description.length > 2000) {
      return jsonError(400, 'الوصف مطلوب');
    }
    const carId = (body.carId || '').trim();
    const carTitle = (body.carTitle || '').trim();
    if (!carId || !carTitle || carTitle.length > 300) {
      return jsonError(400, 'لازم تسجّل المشتري من صفحة عربية محددة');
    }

    const db = getAdminDb();
    const userSnap = await db.collection('users').doc(user.uid).get();
    const userData = userSnap.exists ? userSnap.data() || {} : {};
    const rawLimit = Number(userData.daily_buyer_limit);
    const limit =
      Number.isFinite(rawLimit) && rawLimit >= 1 && rawLimit <= 500
        ? Math.floor(rawLimit)
        : DEFAULT_DAILY_BUYER_LIMIT;

    const dayKey = cairoDateKey();
    const counterRef = db.collection('daily_buyer_counts').doc(user.uid).collection('days').doc(dayKey);
    const leadsRef = db.collection('buyer_leads');

    const leadId = await db.runTransaction(async (tx) => {
      const counterSnap = await tx.get(counterRef);
      const used = counterSnap.exists ? Number(counterSnap.data()?.count || 0) : 0;
      if (used >= limit) {
        throw Object.assign(
          new Error(`وصلت للحد اليومي (${limit} مشترين). حاول بكرة أو كلّم الأدمن.`),
          { status: 429 }
        );
      }

      const newLeadRef = leadsRef.doc();
      tx.set(newLeadRef, {
        name,
        phone,
        description,
        marketer_uid: user.uid,
        marketer_name: typeof body.marketerName === 'string' ? body.marketerName : null,
        marketer_phone: typeof body.marketerPhone === 'string' ? body.marketerPhone : null,
        car_id: carId,
        car_title: carTitle,
        created_at: FieldValue.serverTimestamp(),
      });
      tx.set(
        counterRef,
        {
          count: used + 1,
          uid: user.uid,
          day: dayKey,
          updated_at: Timestamp.now(),
        },
        { merge: true }
      );
      return newLeadRef.id;
    });

    return NextResponse.json({ id: leadId });
  } catch (err: unknown) {
    const status = statusFromError(err);
    if (status) {
      return jsonError(status, err instanceof Error ? err.message : 'Unauthorized');
    }
    logger.error('[api/buyers] create failed:', err);
    return jsonError(500, err instanceof Error ? err.message : 'فشل تسجيل المشتري');
  }
}