import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { jsonError, requireAdmin } from '@/lib/adminAuthServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeUsernameKey(username: string): string {
  return username.trim().replace(/\s+/g, '_').toLowerCase();
}

function validateUsername(val: string): string | null {
  const trimmed = val.trim();
  if (trimmed.length < 3) return 'الاسم يجب أن يكون 3 أحرف على الأقل';
  if (trimmed.length > 20) return 'الاسم يجب ألا يزيد عن 20 حرف';
  if (!/^[\u0600-\u06FFa-zA-Z0-9\s]+$/.test(trimmed)) {
    return 'الاسم يجب أن يحتوي على حروف عربية أو إنجليزية وأرقام ومسافات فقط';
  }
  return null;
}

async function listRoleUids(): Promise<{ admins: string[]; inspectors: string[] }> {
  const auth = getAdminAuth();
  const admins: string[] = [];
  const inspectors: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      if (u.customClaims?.role === 'admin') admins.push(u.uid);
      if (u.customClaims?.role === 'inspector') inspectors.push(u.uid);
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return { admins, inspectors };
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const roles = await listRoleUids();
    return NextResponse.json(roles);
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status) return jsonError(status, (err as Error).message);
    console.error('List admin users failed:', err);
    return jsonError(500, (err as Error)?.message || 'فشل تحميل حسابات الأدمن');
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
      role?: 'admin' | 'user' | 'inspector';
      groupId?: string;
      isAdmin?: boolean;
    };

    const nameErr = validateUsername(body.name || '');
    if (nameErr) return jsonError(400, nameErr);

    const email = (body.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError(400, 'البريد الإلكتروني غير صالح');
    }
    if (!body.password || body.password.length < 6) {
      return jsonError(400, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }
    const phone = (body.phone || '').trim();
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      return jsonError(400, 'رقم التليفون غير صالح');
    }

    const role =
      body.role === 'admin' || body.isAdmin
        ? 'admin'
        : body.role === 'inspector'
          ? 'inspector'
          : 'user';
    const groupId = (body.groupId || '').trim();
    const trimmed = (body.name || '').trim();
    const key = normalizeUsernameKey(trimmed);
    const auth = getAdminAuth();
    const db = getAdminDb();

    const unameRef = db.collection('usernames').doc(key);
    const reserved = await unameRef.get();
    if (reserved.exists) {
      return jsonError(400, 'الاسم مستخدم بالفعل، جرب اسماً آخر');
    }

    let uid = '';
    try {
      const record = await auth.createUser({
        email,
        password: body.password,
        displayName: trimmed,
        emailVerified: false,
        disabled: false,
      });
      uid = record.uid;
      if (role === 'admin' || role === 'inspector') {
        await auth.setCustomUserClaims(uid, { role });
      }

      const userRef = db.collection('users').doc(uid);
      const batch = db.batch();
      batch.set(unameRef, {
        uid,
        username: trimmed,
        created_at: FieldValue.serverTimestamp(),
      });
      batch.set(userRef, {
        uid,
        email,
        username: trimmed,
        phone,
        role,
        onboarded_at: FieldValue.serverTimestamp(),
        created_at: FieldValue.serverTimestamp(),
        last_seen: null,
      });
      if (groupId) {
        const groupRef = db.collection('groups').doc(groupId);
        const groupSnap = await groupRef.get();
        if (!groupSnap.exists) {
          throw Object.assign(new Error('المجموعة غير موجودة'), { status: 400 });
        }
        batch.update(groupRef, {
          memberUids: FieldValue.arrayUnion(uid),
          updated_at: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    } catch (err: unknown) {
      if (uid) {
        try {
          await auth.deleteUser(uid);
        } catch {
          /* rollback best-effort */
        }
      }
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/email-already-exists') {
        return jsonError(400, 'هذا البريد الإلكتروني مستخدم بالفعل');
      }
      if (code === 'auth/invalid-email') {
        return jsonError(400, 'البريد الإلكتروني غير صالح');
      }
      if (code === 'auth/invalid-password' || code === 'auth/weak-password') {
        return jsonError(400, 'كلمة المرور ضعيفة — استخدم 6 أحرف على الأقل');
      }
      throw err;
    }

    return NextResponse.json({
      uid,
      email,
      username: trimmed,
      phone,
      role,
    });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status) return jsonError(status, (err as Error).message);
    console.error('Admin create user failed:', err);
    const code = (err as { code?: string })?.code || '';
    const msg = (err as Error)?.message || '';
    if (
      code === 'app/invalid-credential' ||
      msg.includes('invalid_grant') ||
      msg.includes('Invalid JWT')
    ) {
      return jsonError(
        500,
        'إنشاء الحساب يحتاج مفتاح Firebase Admin صالح في إعدادات Vercel.'
      );
    }
    return jsonError(500, msg || 'فشل إنشاء الحساب');
  }
}
