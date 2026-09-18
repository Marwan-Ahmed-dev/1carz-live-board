import { NextRequest } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAdminAuth } from '@/lib/firebaseAdmin';

export async function requireAdmin(req: NextRequest): Promise<DecodedIdToken> {
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

export function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}
