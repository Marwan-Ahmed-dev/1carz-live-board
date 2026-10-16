import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { jsonError, requireAdmin } from '@/lib/adminAuthServer';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const db = getAdminDb();
    const auth = getAdminAuth();
    const carsSnap = await db.collection('cars').get();

    let ownersMoved = 0;
    let inspectorsMoved = 0;
    let cleaned = 0;
    let claimsUpdated = 0;

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
      const inspectorName = typeof data.inspector_name === 'string' ? data.inspector_name : '';
      const inspectorPhone = typeof data.inspector_phone === 'string' ? data.inspector_phone : '';
      const hasOwnerKeys = 'owner_name' in data || 'owner_phone' in data;
      const hasInspectorKeys = 'inspector_name' in data || 'inspector_phone' in data;

      if (hasOwnerKeys || ownerName || ownerPhone) {
        const privateRef = db.collection('car_private').doc(carDoc.id);
        const privateSnap = await privateRef.get();
        const prev = privateSnap.exists ? privateSnap.data() || {} : {};
        batch.set(
          privateRef,
          {
            owner_name:
              ownerName || (typeof prev.owner_name === 'string' ? prev.owner_name : ''),
            owner_phone:
              ownerPhone || (typeof prev.owner_phone === 'string' ? prev.owner_phone : ''),
            updated_at: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        ops += 1;
        ownersMoved += 1;
      }

      if (hasInspectorKeys || inspectorName || inspectorPhone) {
        const contactRef = db.collection('car_contact').doc(carDoc.id);
        const contactSnap = await contactRef.get();
        const prev = contactSnap.exists ? contactSnap.data() || {} : {};
        batch.set(
          contactRef,
          {
            inspector_name:
              inspectorName ||
              (typeof prev.inspector_name === 'string' ? prev.inspector_name : ''),
            inspector_phone:
              inspectorPhone ||
              (typeof prev.inspector_phone === 'string' ? prev.inspector_phone : ''),
            updated_at: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        ops += 1;
        inspectorsMoved += 1;
      }

      if (hasOwnerKeys || hasInspectorKeys) {
        batch.update(carDoc.ref, {
          owner_name: FieldValue.delete(),
          owner_phone: FieldValue.delete(),
          inspector_name: FieldValue.delete(),
          inspector_phone: FieldValue.delete(),
          updated_at: FieldValue.serverTimestamp(),
        });
        ops += 1;
        cleaned += 1;
      }

      if (ops >= 400) await commit();
    }

    await commit();

    for (const role of ['admin', 'inspector', 'source'] as const) {
      const usersSnap = await db.collection('users').where('role', '==', role).get();
      for (const userDoc of usersSnap.docs) {
        try {
          const user = await auth.getUser(userDoc.id);
          if (user.customClaims?.role !== role) {
            await auth.setCustomUserClaims(userDoc.id, {
              ...(user.customClaims || {}),
              role,
            });
            claimsUpdated += 1;
          }
        } catch (err) {
          logger.warn('[migrate] claim skip', userDoc.id, err);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      totalCars: carsSnap.size,
      ownersMoved,
      inspectorsMoved,
      cleaned,
      claimsUpdated,
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