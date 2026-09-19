'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, LogIn, ShoppingBag } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/hooks/useAuth';
import { LoadingState } from '@/components/LoadingState';

const SELL_WHATSAPP = 'https://wa.me/201080945697';

export default function LandingPage() {
  const router = useRouter();
  const { user, loading: authLoading, needsOnboarding, isAdmin } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (needsOnboarding) {
      router.replace('/onboarding');
      return;
    }
    if (isAdmin) {
      router.replace('/admin/dashboard');
      return;
    }
    router.replace('/cars');
  }, [user, authLoading, needsOnboarding, isAdmin, router]);

  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <LoadingState variant="page" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col pb-8">
      <header className="sticky top-0 z-30 bg-text-primary text-white">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-sm font-bold transition-colors"
          >
            <LogIn size={16} />
            تسجيل الدخول
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-extrabold tracking-wide">1CARZ</span>
            <div className="w-9 h-9 overflow-hidden rounded-xl">
              <BrandLogo size={36} />
            </div>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'linear-gradient(160deg, rgba(26,26,26,0.82) 0%, rgba(26,26,26,0.55) 45%, rgba(26,26,26,0.75) 100%), url(https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80)',
          }}
        />
        <div className="relative max-w-3xl mx-auto px-4 pt-14 pb-16 text-center">
          <p className="text-white/80 text-sm font-medium mb-3">لوحة العربيات الحية</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-2">
            نوصّلك لـ<span className="text-accent-yellow">صفقة أوثق</span>
          </h1>
          <p className="text-white/75 text-sm sm:text-base max-w-md mx-auto mb-8">
            اشتري عربية من المعروض، أو بيع عربيتك بسهولة عبر واتساب
          </p>
          <div className="flex flex-col gap-3 max-w-sm mx-auto">
            <Link
              href="/cars"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-base font-extrabold shadow-medium transition-colors"
            >
              <ShoppingBag size={20} />
              اشتري عربية
            </Link>
            <a
              href={SELL_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-white hover:bg-bg-card text-text-primary text-base font-extrabold shadow-medium transition-colors"
            >
              <KeyRound size={20} />
              بيع عربية
            </a>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold text-text-primary border-b-2 border-accent-yellow inline-block pb-1">
            من نحن
          </h2>
          <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
            1Carz منصة مصرية لتسويق وبيع السيارات، بتجربة رقمية أبسط وأكثر أمانًا واحترافية —
            تربط ملاك العربيات بالمشترين الجادين بشفافية وكفاءة.
          </p>
        </section>

        <section className="space-y-2 pt-2 border-t border-border-soft">
          <h2 className="text-lg font-extrabold text-accent-yellow-hover">رؤيتنا</h2>
          <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
            أن تصبح 1Carz المنصة الرائدة في مصر لتسويق وبيع السيارات، من خلال تقديم تجربة بيع
            وشراء أكثر سهولة، أمانًا واحترافية، وربط ملاك السيارات بالمشترين الجادين بأعلى كفاءة
            وشفافية.
          </p>
        </section>

        <section className="space-y-2 pt-2 border-t border-border-soft">
          <h2 className="text-lg font-extrabold text-accent-yellow-hover">مهمتنا</h2>
          <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
            إعادة تشكيل سوق السيارات المستعملة من خلال توفير تجربة شراء وبيع سيارات خالية من
            المتاعب وشفافة من خلال منصتنا الرقمية. نهدف إلى تبسيط العملية، وتوفير الوقت
            لعملائنا، وبناء علاقات طويلة الأمد تقوم على الثقة والراحة.
          </p>
        </section>

        <section className="space-y-2 pt-2 border-t border-border-soft">
          <h2 className="text-lg font-extrabold text-accent-yellow-hover">قيمنا</h2>
          <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
            في 1carz، ندفع بالنزاهة، والثقة، والشفافية، والاحترافية.
          </p>
        </section>

        <div className="flex justify-center pt-4">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-soft">
            <BrandLogo size={48} rounded={false} className="rounded-2xl" />
          </div>
        </div>
      </main>
    </div>
  );
}
