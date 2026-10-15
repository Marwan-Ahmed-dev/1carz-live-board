import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, SITE_URL, COMPANY_EMAIL, COMPANY_PHONE } from '@/lib/site';

export const metadata: Metadata = {
  title: `سياسة الخصوصية | ${SITE_NAME}`,
  description: 'سياسة الخصوصية لمنصة 1CARZ',
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6 text-text-secondary text-sm leading-relaxed">
        <Link href="/" className="text-text-primary font-bold hover:underline">
          ← 1CARZ
        </Link>
        <h1 className="text-2xl font-extrabold text-text-primary">سياسة الخصوصية</h1>
        <p>آخر تحديث: أكتوبر 2026</p>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">1. من نحن</h2>
          <p>
            1CARZ منصة لتسويق وعرض السيارات في مصر. عند استخدامك للموقع أو التطبيق،
            نجمع بيانات لازمة لتشغيل الخدمة وتحسينها.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">2. البيانات التي نجمعها</h2>
          <ul className="list-disc pr-5 space-y-1">
            <li>بيانات الحساب: البريد، الاسم، رقم الهاتف (إن وُجد).</li>
            <li>بيانات الاستخدام: الصفحات التي تزورها وتفاعلك مع اللوحة.</li>
            <li>بيانات تقنية: نوع الجهاز والمتصفح وعنوان IP التقريبي.</li>
            <li>بيانات التسويق والإعلانات عبر Meta Pixel وGoogle Analytics عند تفعيلها.</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">3. كيف نستخدم البيانات</h2>
          <p>
            لتشغيل الحساب، عرض العربيات، تسجيل اهتمام المشترين للمسوّقين، تحسين الأداء،
            وقياس الحملات الإعلانية. لا نبيع بياناتك الشخصية لأطراف ثالثة.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">4. ملفات الارتباط والتتبع</h2>
          <p>
            نستخدم أدوات تحليل وإعلان (مثل Meta وGoogle) لفهم الزيارات وتحسين الإعلانات.
            يمكنك التحكم في ملفات الارتباط من إعدادات المتصفح.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">5. التواصل</h2>
          <p>
            للاستفسارات حول الخصوصية:{' '}
            <a className="text-accent-yellow-hover font-bold" href={`mailto:${COMPANY_EMAIL}`}>
              {COMPANY_EMAIL}
            </a>{' '}
            أو واتساب{' '}
            <span dir="ltr" className="font-bold text-text-primary">
              {COMPANY_PHONE}
            </span>
            .
          </p>
        </section>
      </main>
    </div>
  );
}