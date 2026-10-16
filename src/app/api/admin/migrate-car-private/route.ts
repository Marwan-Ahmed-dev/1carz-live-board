import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { jsonError, requireAdmin } from '@/lib/adminAuthServer';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One-time (safe to re-run):
 * 1) Move owner_name/owner_phone from public cars/{id} → car_private/{id}
 * 2) Delete those fields from cars so guests cannot read them
 * 3) Backfill custom claims for users with role=source
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const db = getAdminDb();
    const auth = getAdminAuth();
    const carsSnap = await db.collection('cars').get();

    let moved = 0;
    let cleaned = 0;
    let skipped = 0;
    let sourceClaims = 0;

    let batch = db.batch();
    let ops = 0;

    const commit = async () => {
      if (ops === 0) return;
      await batch.commit();
      batch = db.batch();
      ops = 0;
    };

    for (const carDoc of carsSnap.docs) {
      const data = carDoc.data();
      const ownerName = typeof data.owner_name === 'string' ? data.owner_name : '';
      const ownerPhone = typeof data.owner_phone === 'string' ? data.owner_phone : '';
      const hasOwnerKeys = 'owner_name' in data || 'owner_phone' in data;

      if (!hasOwnerKeys && !ownerName && !ownerPhone) {
        skipped += 1;
        continue;
      }

      const privateRef = db.collection('car_private').doc(carDoc.id);
      const privateSnap = await privateRef.get();
      const prev = privateSnap.exists ? privateSnap.data() || {} : {};

      batch.set(
        privateRef,
        {
          owner_name:
            ownerName ||
            (typeof prev.owner_name === 'string' ? prev.owner_name : ''),
          owner_phone:
            ownerPhone ||
            (typeof prev.owner_phone === 'string' ? prev.owner_phone : ''),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      ops += 1;
      moved += 1;

      if (hasOwnerKeys) {
        batch.update(carDoc.ref, {
          owner_name: FieldValue.delete(),
          owner_phone: FieldValue.delete(),
          updated_at: FieldValue.serverTimestamp(),
        });
        ops += 1;
        cleaned += 1;
      }

      if (ops >= 400) await commit();
    }

    await commit();

    // Backfill source custom claims (required by Firestore rules)
    const usersSnap = await db.collection('users').where('role', '==', 'source').get();
    for (const userDoc of usersSnap.docs) {
      try {
        const user = await auth.getUser(userDoc.id);
        if (user.customClaims?.role !== 'source') {
          await auth.setCustomUserClaims(userDoc.id, { role: 'source' });
          sourceClaims += 1;
        }
      } catch (err) {
        logger.warn('[migrate-car-private] source claim skip', userDoc.id, err);
      }
    }

    return NextResponse.json({
      ok: true,
      totalCars: carsSnap.size,
      moved,
      cleaned,
      skipped,
      sourceClaims,
    });
  } catch (err: unknown) {
    const status =
      err && typeof err === 'object' && 'status' in err
        ? Number((err as { status?: number }).status)
        : undefined;
    if (status) {
      return jsonError(status, err instanceof Error ? err.message : 'Unauthorized');
    }
    logger.error('[migrate-car-private] failed:', err);
    return jsonError(500, err instanceof Error ? err.message : 'Migration failed');
  }
}
