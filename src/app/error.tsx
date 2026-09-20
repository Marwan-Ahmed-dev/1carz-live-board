'use client';

// Global client error boundary.
// Next.js requires `error.tsx` to be a Client Component ("use client").
// It catches any rendering error in this segment and below.

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log for ops debugging — Next.js provides `digest` on the server side
    // that pairs with the server log.
    logger.error('[GlobalError]', error);
  }, [error]);

  return (
    <main
      dir="rtl"
      lang="ar"
      className="min-h-screen flex items-center justify-center p-4 bg-bg-primary"
    >
      <div className="w-full max-w-md bg-bg-card rounded-2xl p-6 sm:p-8 shadow-medium border border-border-soft text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 text-red-500 mb-4">
          <AlertTriangle size={32} strokeWidth={2.2} />
        </div>

        <h1 className="text-xl font-bold text-text-primary mb-2">
          حدث خطأ غير متوقع
        </h1>
        <p className="text-sm text-text-secondary mb-5 leading-relaxed">
          نأسف لهذا الخطأ. حاول إعادة المحاولة، ولو المشكلة فضلت موجودة
          حدّث الصفحة أو ارجع للصفحة الرئيسية.
        </p>

        {error.digest && (
          <p className="text-[11px] text-text-muted mb-4 font-mono" dir="ltr">
            رمز الخطأ: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary font-bold text-sm transition-colors min-h-[44px]"
          >
            <RefreshCw size={16} />
            إعادة المحاولة
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-border-medium text-text-secondary font-bold text-sm transition-colors min-h-[44px] hover:bg-bg-card-hover"
          >
            <Home size={16} />
            الصفحة الرئيسية
          </a>
        </div>
      </div>
    </main>
  );
}
