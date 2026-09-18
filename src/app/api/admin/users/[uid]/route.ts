import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

async function requireAdmin(req: NextRequest) {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    throw Object.assign(new Error('يجب تسجيل الدخول'), { status: 401 });
  }
  const decoded = await getAdminAuth().verifyIdToken(token);
  if (decoded.role !== 'admin') {
    throw Object.assign(new Error('غير مصرح'), { status: 403 });
  }
  return decoded;
}

async function cleanupFirestore(uid: string) {
  const db = getAdminDb();
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  const username =
    userSnap.exists && typeof userSnap.data()?.username === 'string'
      ? (userSnap.data()?.username as string)
      : null;

  const [unames, groups, cars] = await Promise.all([
    db.collection('usernames').where('uid', '==', uid).get(),
    db.collection('groups').where('memberUids', 'array-contains', uid).get(),
    db.collection('cars').where('assigned_to', 'array-contains', uid).get(),
  ]);

  const batch = db.batch();
  batch.delete(userRef);

  const deletedUnames = new Set<string>();
  unames.docs.forEach((d) => {
    batch.delete(d.ref);
    deletedUnames.add(d.id);
  });
  if (username) {
    const key = username.trim().replace(/\s+/g, '_').toLowerCase();
    if (key && !deletedUnames.has(key)) {
      batch.delete(db.collection('usernames').doc(key));
    }
  }

  groups.docs.forEach((d) => {
    const members = Array.isArray(d.data().memberUids) ? d.data().memberUids : [];
    batch.update(d.ref, {
      memberUids: members.filter((id: unknown) => id !== uid),
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  cars.docs.forEach((d) => {
    const assigned = Array.isArray(d.data().assigned_to) ? d.data().assigned_to : [];
    const next = assigned.filter((id: unknown) => id !== uid);
    batch.update(d.ref, {
      assigned_to: next.length > 0 ? next : ['all'],
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { uid: string } }
) {
  const uid = params.uid?.trim();
  if (!uid) return jsonError(400, 'معرّف المستخدم مطلوب');

  try {
    const admin = await requireAdmin(req);
    if (admin.uid === uid) {
      return jsonError(400, 'لا يمكن حذف حسابك');
    }

    const auth = getAdminAuth();
    try {
      const target = await auth.getUser(uid);
      if (target.customClaims?.role === 'admin') {
        return jsonError(403, 'لا يمكن حذف حساب أدمن');
      }
      await auth.deleteUser(uid);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code !== 'auth/user-not-found') throw err;
    }

    await cleanupFirestore(uid);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status) {
      return jsonError(status, (err as Error).message);
    }
    console.error('Admin delete user failed:', err);
    const code = (err as { code?: string })?.code || '';
    const msg = (err as Error)?.message || '';
    if (
      code === 'app/invalid-credential' ||
      msg.includes('invalid_grant') ||
      msg.includes('Invalid JWT')
    ) {
      return jsonError(
        500,
        'حذف الحساب يحتاج مفتاح Firebase Admin صالح. أضف FIREBASE_PROJECT_ID و FIREBASE_CLIENT_EMAIL و FIREBASE_PRIVATE_KEY في إعدادات Vercel.'
      );
    }
    return jsonError(500, msg || 'فشل حذف الحساب');
  }
}
