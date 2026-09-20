'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function AdminUsersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    logger.error('[AdminUsers Error Boundary]', error);
  }, [error]);

  return (
    <div className="bg-admin-card border border-admin-border rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto mt-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/15">
        <AlertCircle size={32} className="text-red-400" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-admin-text mb-2">
          تعذر تحميل صفحة المستخدمين
        </h2>
        <p className="text-sm text-admin-text-muted mb-1">
          {error.message || 'حصل خطأ غير متوقع'}
        </p>
        {error.digest && (
          <p className="text-xs text-admin-text-muted">
            معرّف الخطأ: <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </div>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-admin-accent hover:bg-yellow-400 text-admin-bg font-bold text-sm transition-colors"
        >
          <RefreshCw size={14} />
          إعادة المحاولة
        </button>
        <button
          onClick={() => router.push('/admin/dashboard')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-card font-medium text-sm transition-colors"
        >
          <Users size={14} />
          لوحة التحكم
        </button>
      </div>
    </div>
  );
}