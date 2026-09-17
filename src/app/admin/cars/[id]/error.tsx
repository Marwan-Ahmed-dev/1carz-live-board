'use client';

/**
 * Error boundary لصفحة تعديل العربية
 * - بيعرض رسالة مفيدة بدل الـ Next.js error overlay
 * - بيوفر زر للعودة لقائمة العربيات
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

export default function EditCarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // سجّل الـ error في الـ console للـ debugging
    console.error('[EditCarPage Error Boundary]', error);
  }, [error]);

  return (
    <div className="bg-admin-card border border-admin-border rounded-2xl p-8 text-center space-y-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/15">
        <AlertCircle size={32} className="text-red-400" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-admin-text mb-2">
          حدث خطأ أثناء تحميل صفحة التعديل
        </h2>
        <p className="text-sm text-admin-text-muted mb-1">
          {error.message || 'خطأ غير متوقع'}
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
          className="px-4 py-2 rounded-xl bg-admin-accent hover:bg-yellow-400 text-admin-bg font-bold text-sm transition-colors"
        >
          إعادة المحاولة
        </button>
        <button
          onClick={() => router.push('/admin/cars')}
          className="px-4 py-2 rounded-xl bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-card font-medium text-sm transition-colors"
        >
          العودة للقائمة
        </button>
      </div>
    </div>
  );
}
