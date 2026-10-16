import { NextRequest } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAdminAuth } from '@/lib/firebaseAdmin';

async function verifyBearer(req: NextRequest): Promise<DecodedIdToken> {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    throw Object.assign(new Error('يجب تسجيل الدخول'), { status: 401 });
  }
  return getAdminAuth().verifyIdToken(token);
}

export async function requireAuth(req: NextRequest): Promise<DecodedIdToken> {
  return verifyBearer(req);
}

export async function requireAdmin(req: NextRequest): Promise<DecodedIdToken> {
  const decoded = await verifyBearer(req);
  if (decoded.role !== 'admin') {
    throw Object.assign(new Error('غير مصرح'), { status: 403 });
  }
  return decoded;
}

export function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}