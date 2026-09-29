'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function MarketError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('[Market Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 max-w-lg">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            تعذر تحميل السجل السعري
          </h2>
          <p className="text-sm text-slate-600 mb-1">
            {error.message || 'حصل خطأ غير متوقع'}
          </p>
          {error.digest && (
            <p className="text-xs text-slate-500">
              معرّف الخطأ: <span className="font-mono">{error.digest}</span>
            </p>
          )}
        </div>
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold text-sm"
        >
          <RefreshCw size={14} />
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}