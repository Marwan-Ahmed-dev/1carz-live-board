'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  KeyRound,
  LogIn,
  ShoppingBag,
  Phone,
  MapPin,
  Facebook,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/hooks/useAuth';
import { useRevealOnScroll } from '@/hooks/useRevealOnScroll';
import { LoadingState } from '@/components/LoadingState';
import {
  COMPANY_PHONE,
  COMPANY_WHATSAPP,
  COMPANY_FACEBOOK,
  COMPANY_MAPS,
  PLAY_STORE_URL,
} from '@/lib/site';

export default function LandingPage() {
  const router = useRouter();
  const { user, loading: authLoading, needsOnboarding, isAdmin, isSource } = useAuth();
  useRevealOnScroll();

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
    if (isSource) {
      router.replace('/market');
      return;
    }
    router.replace('/cars');
  }, [user, authLoading, needsOnboarding, isAdmin, isSource, router]);

  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <LoadingState variant="page" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white overflow-x-hidden">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-40 border-b border-white/10 bg-[#0c0c0c]/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="relative land-pulse-ring">
              <BrandLogo size={40} className="shadow-medium" />
            </div>
            <span className="text-lg sm:text-xl font-extrabold tracking-[0.18em] text-white group-hover:text-accent-yellow transition-colors">
              1CARZ
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-sm font-bold text-white/70">
            <a href="#about" className="hover:text-white transition-colors">
              من نحن
            </a>
            <a href="#app" className="hover:text-white transition-colors">
              التطبيق
            </a>
            <a href="#contact" className="hover:text-white transition-colors">
              تواصل
            </a>
            <Link href="/privacy" className="hover:text-white transition-colors">
              الخصوصية
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              الشروط
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/cars"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/15 text-sm font-bold text-white/90 hover:bg-white/10 transition-colors"
            >
              تصفح
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-sm font-extrabold transition-colors"
            >
              <LogIn size={16} />
              دخول
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — full bleed */}
      <section className="relative min-h-[100svh] flex items-end sm:items-center pt-20 pb-16">
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="land-hero-bg absolute inset-[-4%] bg-cover bg-center"
            style={{
              backgroundImage:
                'url(https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1800&q=80)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-[#0c0c0c]/55 to-[#0c0c0c]/35" />
          <div className="absolute inset-0 bg-gradient-to-l from-[#0c0c0c]/80 via-transparent to-transparent" />
          <div className="land-grain absolute inset-0" />
        </div>

        <div className="relative max-w-6xl mx-auto w-full px-4 sm:px-6">
          <p className="land-fade-up land-delay-1 text-accent-yellow text-xs sm:text-sm font-bold tracking-[0.35em] uppercase mb-4">
            Egypt · Live Board
          </p>
          <h1 className="land-fade-up land-delay-2 land-brand-shine text-6xl sm:text-7xl md:text-8xl font-black tracking-tight leading-none mb-5">
            1CARZ
          </h1>
          <p className="land-fade-up land-delay-3 text-xl sm:text-2xl md:text-3xl font-extrabold text-white max-w-xl leading-snug mb-3">
            نوصّلك لصفقة أوثق
          </p>
          <p className="land-fade-up land-delay-4 text-white/70 text-sm sm:text-base max-w-md mb-8 leading-relaxed">
            منصة مصرية لتسويق وبيع السيارات — شفافية، معاينة، وتجربة رقمية أسرع من السوق التقليدي.
          </p>

          <div className="land-fade-up land-delay-5 flex flex-col sm:flex-row flex-wrap gap-3 max-w-xl">
            <Link
              href="/cars"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-base font-extrabold shadow-[0_12px_40px_rgba(252,211,77,0.35)] transition-transform hover:-translate-y-0.5"
            >
              <ShoppingBag size={20} />
              اشتري عربية
            </Link>
            <a
              href={COMPANY_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-base font-extrabold backdrop-blur-sm transition-transform hover:-translate-y-0.5"
            >
              <KeyRound size={20} />
              بيع عربية
            </a>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#00C853]/15 hover:bg-[#00C853]/25 border border-[#00C853]/40 text-[#7DFFB3] text-base font-extrabold transition-transform hover:-translate-y-0.5"
            >
              <Smartphone size={20} />
              حمّل التطبيق
            </a>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="relative bg-[#111111] py-20 sm:py-28">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-accent-yellow/50 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-16">
          <div className="land-reveal max-w-2xl">
            <p className="text-accent-yellow text-xs font-bold tracking-[0.3em] uppercase mb-3">من نحن</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-4">
              إعادة تشكيل سوق العربيات في مصر
            </h2>
            <p className="text-white/65 text-base sm:text-lg leading-relaxed">
              1Carz منصة رقمية تربط ملاك العربيات بالمشترين الجادين — بتجربة أبسط، أكثر أمانًا،
              واحترافية من أول معاينة لحد إقفال الصفقة.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 sm:gap-10">
            {[
              {
                title: 'رؤيتنا',
                body: 'أن تصبح 1Carz المنصة الرائدة في مصر لتسويق وبيع السيارات، بتجربة سهلة وآمنة وشفافة.',
                icon: Eye,
              },
              {
                title: 'مهمتنا',
                body: 'تبسيط البيع والشراء، توفير الوقت، وبناء ثقة طويلة الأمد عبر لوحة حية وبيانات واضحة.',
                icon: Sparkles,
              },
              {
                title: 'قيمنا',
                body: 'النزاهة، الثقة، الشفافية، والاحترافية — في كل إعلان وكل تواصل.',
                icon: ShieldCheck,
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className="land-reveal border-t border-white/10 pt-6"
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <item.icon className="text-accent-yellow mb-4" size={28} strokeWidth={1.75} />
                <h3 className="text-xl font-extrabold text-white mb-2">{item.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="relative py-20 sm:py-24 bg-gradient-to-b from-[#111111] to-[#0c0c0c]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="land-reveal mb-12 max-w-xl">
            <p className="text-accent-yellow text-xs font-bold tracking-[0.3em] uppercase mb-3">ليه 1CARZ</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white">تجربة شراء وبيع من غير لف ودوران</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { t: 'لوحة حية', d: 'عربيات متحدثة لحظة بلحظة مع أولويات واضحة وفلاتر سريعة.' },
              { t: 'سيارات تم فحصها', d: 'شارة اعتماد للعربيات المفحوصة — ثقة أعلى قبل المعاينة.' },
              { t: 'تواصل مباشر', d: 'واتساب وفيسبوك وخريطة الموقع — من غير وسطاء كتير.' },
            ].map((x, i) => (
              <div
                key={x.t}
                className="land-reveal group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 hover:border-accent-yellow/40 transition-colors"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="absolute -left-8 -top-8 w-32 h-32 rounded-full bg-accent-yellow/10 blur-2xl group-hover:bg-accent-yellow/20 transition-colors" />
                <div className="relative">
                  <span className="text-accent-yellow font-black text-sm tracking-widest">0{i + 1}</span>
                  <h3 className="text-xl font-extrabold text-white mt-2 mb-2">{x.t}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{x.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App download */}
      <section id="app" className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(252,211,77,0.18),transparent_55%)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="land-reveal flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-16">
            <div className="flex-1 space-y-5">
              <p className="text-accent-yellow text-xs font-bold tracking-[0.3em] uppercase">التطبيق</p>
              <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                1CARZ على موبايلك
              </h2>
              <p className="text-white/65 text-base sm:text-lg leading-relaxed max-w-lg">
                تصفّح العربيات، تابع التحديثات، وتواصل أسرع من تطبيق أندرويد الرسمي على Google Play.
              </p>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="land-float inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white text-[#0c0c0c] font-extrabold text-base hover:bg-accent-yellow transition-colors shadow-[0_16px_50px_rgba(0,0,0,0.35)]"
              >
                <span className="inline-flex w-10 h-10 items-center justify-center rounded-xl bg-[#0c0c0c] text-accent-yellow">
                  <Smartphone size={22} />
                </span>
                <span className="text-right leading-tight">
                  <span className="block text-[11px] font-bold text-black/55">حمّل من</span>
                  <span className="block text-lg">Google Play</span>
                </span>
                <ArrowLeft size={18} className="opacity-50" />
              </a>
            </div>
            <div className="land-reveal flex-1 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-sm aspect-[4/5] rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] p-1 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                <div
                  className="h-full w-full rounded-[1.85rem] bg-cover bg-center"
                  style={{
                    backgroundImage:
                      'linear-gradient(180deg, rgba(12,12,12,0.15), rgba(12,12,12,0.75)), url(https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80)',
                  }}
                />
                <div className="absolute bottom-6 inset-x-6 rounded-2xl bg-black/55 backdrop-blur-md border border-white/15 px-4 py-3">
                  <p className="text-accent-yellow text-xs font-bold mb-0.5">Live Board</p>
                  <p className="text-white text-sm font-extrabold">عربياتك… في جيبك</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact — bottom */}
      <section id="contact" className="relative border-t border-white/10 bg-[#080808] pt-16 pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="land-reveal text-center max-w-xl mx-auto">
            <p className="text-accent-yellow text-xs font-bold tracking-[0.3em] uppercase mb-3">تواصل معنا</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">خلّينا نبدأ الصفقة</h2>
            <p className="text-white/60 text-sm sm:text-base">
              واتساب، فيسبوك، أو زورنا على الخريطة — فريق 1CARZ موجود.
            </p>
          </div>

          <div className="land-reveal grid sm:grid-cols-3 gap-3">
            <a
              href={COMPANY_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-7 hover:border-accent-yellow/50 hover:bg-accent-yellow/10 transition-all"
            >
              <span className="inline-flex w-12 h-12 items-center justify-center rounded-2xl bg-accent-yellow text-text-primary group-hover:scale-110 transition-transform">
                <Phone size={22} />
              </span>
              <span className="font-extrabold text-white">واتساب</span>
              <span className="text-sm text-white/55 font-bold" dir="ltr">
                {COMPANY_PHONE}
              </span>
            </a>
            <a
              href={COMPANY_FACEBOOK}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-7 hover:border-[#1877F2]/60 hover:bg-[#1877F2]/15 transition-all"
            >
              <span className="inline-flex w-12 h-12 items-center justify-center rounded-2xl bg-[#1877F2] text-white group-hover:scale-110 transition-transform">
                <Facebook size={22} />
              </span>
              <span className="font-extrabold text-white">فيسبوك</span>
              <span className="text-sm text-white/55 font-bold">تابعنا</span>
            </a>
            <a
              href={COMPANY_MAPS}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-7 hover:border-emerald-400/50 hover:bg-emerald-400/10 transition-all"
            >
              <span className="inline-flex w-12 h-12 items-center justify-center rounded-2xl bg-emerald-500 text-white group-hover:scale-110 transition-transform">
                <MapPin size={22} />
              </span>
              <span className="font-extrabold text-white">الموقع</span>
              <span className="text-sm text-white/55 font-bold">افتح الخريطة</span>
            </a>
          </div>

          <div className="land-reveal flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/10">
            <div className="inline-flex items-center gap-2">
              <BrandLogo size={36} />
              <span className="font-extrabold tracking-[0.2em]">1CARZ</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-bold">
              <Link
                href="/privacy"
                className="text-white/70 hover:text-accent-yellow underline underline-offset-4 decoration-white/20 hover:decoration-accent-yellow transition-colors"
              >
                سياسة الخصوصية
              </Link>
              <Link
                href="/terms"
                className="text-white/70 hover:text-accent-yellow underline underline-offset-4 decoration-white/20 hover:decoration-accent-yellow transition-colors"
              >
                الشروط والأحكام
              </Link>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-accent-yellow transition-colors"
              >
                Google Play
              </a>
            </div>
            <p className="text-xs text-white/35">© {new Date().getFullYear()} 1CARZ</p>
          </div>
        </div>
      </section>
    </div>
  );
}