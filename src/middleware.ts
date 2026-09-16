// Middleware لحماية المسارات على مستوى Next.js
// ملاحظة: التحقق الدقيق من custom claims يتطلب Firebase Admin SDK في backend
// هنا نستخدم client-side guard في الـ pages نفسها كطبقة ثانية

import { NextRequest, NextResponse } from 'next/server';

// public paths اللي مش محتاجة auth
const PUBLIC_PATHS = ['/login', '/onboarding', '/manifest.json', '/sw.js', '/favicon.ico'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // نسمح بكل الـ static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/api') ||
    PUBLIC_PATHS.some((p) => pathname === p)
  ) {
    return NextResponse.next();
  }

  // middleware بسيط: نسمح بالمسار ونعتمد على الـ client guard للتحقق من auth
  // (هذا لأن التحقق من session يحتاج إلى cookies أو custom header)
  return NextResponse.next();
}

// ملاحظة: Next.js middleware matcher لا يدعم capturing groups
// نستخدم matchers بسيطة لا تحتاج capturing
export const config = {
  matcher: [
    // exclude api, static files, and files with extensions (images, etc.)
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};