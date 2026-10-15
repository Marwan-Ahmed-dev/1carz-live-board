import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_URL, COMPANY_EMAIL, COMPANY_PHONE } from '@/lib/site';

export const metadata: Metadata = {
  title: `الشروط والأحكام | ${SITE_NAME}`,
  description: 'شروط وأحكام استخدام منصة 1CARZ',
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6 text-text-secondary text-sm leading-relaxed">
        <Link href="/" className="text-text-primary font-bold hover:underline">
          ← 1CARZ
        </Link>
        <h1 className="text-2xl font-extrabold text-text-primary">الشروط والأحكام</h1>
        <p>آخر تحديث: أكتوبر 2026</p>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">1. قبول الشروط</h2>
          <p>باستخدامك لموقع أو تطبيق 1CARZ فإنك توافق على هذه الشروط.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">2. طبيعة الخدمة</h2>
          <p>
            1CARZ منصة عرض وتسويق للسيارات. المعلومات المعروضة من مقدّمي الإعلانات
            والمسوّقين، وقد تختلف الحالة الفعلية للعربية. ننصح بالمعاينة قبل أي اتفاق.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">3. حسابات المستخدمين</h2>
          <p>
            أنت مسؤول عن سرية بيانات الدخول وعن دقة البيانات التي تسجّلها.
            يحق لإدارة المنصة إيقاف الحسابات التي تسيء الاستخدام.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">4. المحتوى والإعلانات</h2>
          <p>
            يُمنع نشر محتوى مضلل أو مخالف للقانون. للإدارة حق تعديل أو إزالة أي إعلان
            يخالف السياسات.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">5. التواصل</h2>
          <p>
            للاستفسارات:{' '}
            <a className="text-accent-yellow-hover font-bold" href={`mailto:${COMPANY_EMAIL}`}>
              {COMPANY_EMAIL}
            </a>{' '}
            · واتساب{' '}
            <span dir="ltr" className="font-bold text-text-primary">
              {COMPANY_PHONE}
            </span>
          </p>
        </section>
      </main>
    </div>
  );
}