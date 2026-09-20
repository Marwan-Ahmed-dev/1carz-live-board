import { LoadingState } from '@/components/LoadingState';

/**
 * Root loading — يظهر لما Next.js يـ prefetch / navigate بين الـ segments.
 * بيستخدم الـ BrandSpinner مع رسالة "جاري التحميل..." افتراضية.
 */
export default function RootLoading() {
  return (
    <main
      dir="rtl"
      lang="ar"
      className="min-h-screen flex items-center justify-center bg-bg-primary"
    >
      <LoadingState variant="page" />
    </main>
  );
}