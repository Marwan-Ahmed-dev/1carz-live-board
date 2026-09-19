// Next.js 404 page. Server Component is fine here — no client state needed.
// Matches the cream live-board theme used on the user-facing pages.

import Link from 'next/link';
import { Home, ArrowRight, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <main
      dir="rtl"
      lang="ar"
      className="min-h-screen flex items-center justify-center p-4 bg-bg-primary"
    >
      <div className="w-full max-w-md bg-bg-card rounded-2xl p-6 sm:p-8 shadow-medium border border-border-soft text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent-yellow mb-4">
          <span className="text-3xl font-bold text-text-primary" dir="ltr">
            404
          </span>
        </div>

        <h1 className="text-xl font-bold text-text-primary mb-2">
          الصفحة غير موجودة
        </h1>
        <p className="text-sm text-text-secondary mb-5 leading-relaxed">
          الرابط اللي طلبته مش موجود أو اتنقل. تأكد من الرابط أو ارجع
          لتتصفح العربيات المتاحة.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/cars"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary font-bold text-sm transition-colors min-h-[44px]"
          >
            <Search size={16} />
            تصفح العربيات
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-border-medium text-text-secondary font-bold text-sm transition-colors min-h-[44px] hover:bg-bg-card-hover"
          >
            <Home size={16} />
            الصفحة الرئيسية
          </Link>
        </div>

        <p className="text-[11px] text-text-muted mt-6" dir="ltr">
          © 1CARZ LIVE BOARD
        </p>
      </div>
    </main>
  );
}
