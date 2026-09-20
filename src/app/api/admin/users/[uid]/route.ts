import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, WriteBatch } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { jsonError, requireAdmin } from '@/lib/adminAuthServer';
import { logger } from '@/lib/logger';

function statusFromError(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'status' in err) {
    const s = (err as { status?: unknown }).status;
    if (typeof s === 'number') return s;
  }
  return undefined;
}

function codeFromError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const c = (err as { code?: unknown }).code;
    if (typeof c === 'string') return c;
  }
  return '';
}

function messageFromError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function commitChunks(
  db: ReturnType<typeof getAdminDb>,
  apply: Array<(batch: WriteBatch) => void>
) {
  const CHUNK = 400;
  for (let i = 0; i < apply.length; i += CHUNK) {
    const batch = db.batch();
    apply.slice(i, i + CHUNK).forEach((fn) => fn(batch));
    await batch.commit();
  }
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

  const ops: Array<(batch: WriteBatch) => void> = [];
  ops.push((batch) => batch.delete(userRef));

  const deletedUnames = new Set<string>();
  unames.docs.forEach((d) => {
    ops.push((batch) => batch.delete(d.ref));
    deletedUnames.add(d.id);
  });
  if (username) {
    const key = username.trim().replace(/\s+/g, '_').toLowerCase();
    if (key && !deletedUnames.has(key)) {
      ops.push((batch) => batch.delete(db.collection('usernames').doc(key)));
    }
  }

  groups.docs.forEach((d) => {
    const members = Array.isArray(d.data().memberUids) ? d.data().memberUids : [];
    ops.push((batch) =>
      batch.update(d.ref, {
        memberUids: members.filter((id: unknown) => id !== uid),
        updated_at: FieldValue.serverTimestamp(),
      })
    );
  });

  cars.docs.forEach((d) => {
    const assigned = Array.isArray(d.data().assigned_to) ? d.data().assigned_to : [];
    const next = assigned.filter((id: unknown) => id !== uid);
    ops.push((batch) =>
      batch.update(d.ref, {
        assigned_to: next.length > 0 ? next : ['all'],
        updated_at: FieldValue.serverTimestamp(),
      })
    );
  });

  await commitChunks(db, ops);
}

async function countAdmins(): Promise<number> {
  const auth = getAdminAuth();
  let count = 0;
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      if (u.customClaims?.role === 'admin') count += 1;
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return count;
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
        const adminCount = await countAdmins();
        if (adminCount <= 1) {
          return jsonError(400, 'لا يمكن حذف آخر حساب أدمن');
        }
      }
      await auth.deleteUser(uid);
    } catch (err: unknown) {
      const code = codeFromError(err);
      if (code !== 'auth/user-not-found') throw err;
    }

    await cleanupFirestore(uid);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const status = statusFromError(err);
    if (status) {
      return jsonError(status, messageFromError(err, 'فشل حذف الحساب'));
    }
    logger.error('Admin delete user failed:', err);
    const code = codeFromError(err);
    const msg = messageFromError(err, '');
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
