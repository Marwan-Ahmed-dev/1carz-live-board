import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL, COMPANY_PHONE, COMPANY_WHATSAPP } from '@/lib/site';
import { SiteLegalChrome } from '@/components/SiteLegalChrome';

export const metadata: Metadata = {
  title: `الشروط والأحكام | ${SITE_NAME}`,
  description: 'شروط وأحكام استخدام منصة 1CARZ',
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <SiteLegalChrome>
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6 text-text-secondary text-sm leading-relaxed">
        <h1 className="text-3xl font-black text-text-primary">الشروط والأحكام</h1>
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
            للاستفسارات تواصل عبر واتساب{' '}
            <a
              className="text-accent-yellow-hover font-bold"
              href={COMPANY_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span dir="ltr">{COMPANY_PHONE}</span>
            </a>
            .
          </p>
        </section>
      </div>
    </SiteLegalChrome>
  );
}