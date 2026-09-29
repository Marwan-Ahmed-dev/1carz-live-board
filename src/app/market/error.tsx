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
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="bg-bg-card border border-border-soft rounded-2xl p-8 text-center space-y-4 max-w-lg shadow-soft">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-text-primary mb-2">
            تعذر تحميل السجل السعري
          </h2>
          <p className="text-sm text-text-secondary mb-1">
            {error.message || 'حصل خطأ غير متوقع'}
          </p>
          {error.digest && (
            <p className="text-xs text-text-muted">
              معرّف الخطأ: <span className="font-mono">{error.digest}</span>
            </p>
          )}
        </div>
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary font-bold text-sm"
        >
          <RefreshCw size={14} />
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}