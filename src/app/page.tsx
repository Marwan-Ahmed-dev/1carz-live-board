'use client';

import { useEffect } from 'react';
import Image from 'next/image';
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
  Search,
  MessageCircle,
  Car,
  BadgeCheck,
  Users,
  Clock3,
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

/** صور محلية — CSP كان بيمنع Unsplash فكانت الأماكن فاضية */
const IMG = {
  hero: '/landing/hero.jpg',
  showroom: '/landing/showroom.jpg',
  keys: '/landing/keys.jpg',
  handshake: '/landing/deal.jpg',
  night: '/landing/night.jpg',
  garage: '/landing/garage.jpg',
};

export default function LandingPage() {
  const router = useRouter();
  const { user, loading: authLoading, needsOnboarding, isAdmin, isSource } = useAuth();
  const showLanding = !authLoading && !user;
  useRevealOnScroll(showLanding);

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
      <header className="fixed top-0 inset-x-0 z-40 border-b border-white/10 bg-[#0c0c0c]/75 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="relative land-pulse-ring">
              <BrandLogo size={40} className="shadow-medium" />
            </div>
            <span className="text-lg sm:text-xl font-extrabold tracking-wide text-white group-hover:text-accent-yellow transition-colors">
              1Carz
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-sm font-bold text-white/70">
            <a href="#about" className="hover:text-white transition-colors">من نحن</a>
            <a href="#how" className="hover:text-white transition-colors">إزاي بنشتغل</a>
            <a href="#inspected" className="hover:text-white transition-colors">تم فحصها</a>
            <a href="#app" className="hover:text-white transition-colors">التطبيق</a>
            <a href="#contact" className="hover:text-white transition-colors">تواصل</a>
            <Link href="/privacy" className="hover:text-white transition-colors">الخصوصية</Link>
            <Link href="/terms" className="hover:text-white transition-colors">الشروط</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/cars"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/15 text-sm font-bold text-white/90 hover:bg-white/10 transition-colors"
            >
              تصفح العربيات
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

      {/* Hero */}
      <section className="relative min-h-[100svh] flex items-end sm:items-center pt-24 pb-16">
        <div className="absolute inset-0 overflow-hidden">
          <div className="land-hero-bg absolute inset-[-4%]">
            <Image
              src={IMG.hero}
              alt="1Carz — سيارات"
              fill
              priority
              sizes="100vw"
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-[#0c0c0c]/60 to-[#0c0c0c]/40" />
          <div className="absolute inset-0 bg-gradient-to-l from-[#0c0c0c]/85 via-transparent to-transparent" />
          <div className="land-grain absolute inset-0" />
        </div>

        <div className="relative max-w-6xl mx-auto w-full px-4 sm:px-6">
          <p className="land-fade-up land-delay-1 text-accent-yellow text-xs sm:text-sm font-bold tracking-[0.28em] uppercase mb-4">
            منصة تسويق وبيع السيارات · مصر
          </p>
          <h1 className="land-fade-up land-delay-2 text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none mb-4">
            <span className="land-brand-shine">1Carz</span>
          </h1>
          <p className="land-fade-up land-delay-3 text-xl sm:text-2xl md:text-3xl font-extrabold text-white max-w-2xl leading-snug mb-4">
            بنسهّل عليك تشتري وتبيع عربية بثقة — من غير لف ودوران
          </p>
          <p className="land-fade-up land-delay-4 text-white/75 text-sm sm:text-base max-w-xl mb-8 leading-relaxed">
            1Carz منصة مصرية بتجمع عربيات حقيقية، سيارات تم فحصها، وتواصل مباشر مع المعاين والمالك.
            هدفنا صفقة أوضح، أسرع، وأأمن لكل الأطراف.
          </p>

          <div className="land-fade-up land-delay-5 flex flex-col sm:flex-row flex-wrap gap-3 max-w-2xl">
            <Link
              href="/cars"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-base font-extrabold shadow-[0_12px_40px_rgba(252,211,77,0.35)] transition-transform hover:-translate-y-0.5"
            >
              <ShoppingBag size={20} />
              اشتري عربية دلوقتي
            </Link>
            <a
              href={COMPANY_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-base font-extrabold backdrop-blur-sm transition-transform hover:-translate-y-0.5"
            >
              <KeyRound size={20} />
              بيع عربيتك معانا
            </a>
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#00C853]/15 hover:bg-[#00C853]/25 border border-[#00C853]/40 text-[#7DFFB3] text-base font-extrabold transition-transform hover:-translate-y-0.5"
            >
              <Smartphone size={20} />
              حمّل تطبيق 1Carz
            </a>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="relative border-y border-white/10 bg-[#111111]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Car, label: 'عربيات معروضة يوميًا', value: 'لوحة حية' },
            { icon: BadgeCheck, label: 'سيارات تم فحصها', value: 'ثقة أعلى' },
            { icon: Users, label: 'تواصل مباشر', value: 'معاين + مالك' },
            { icon: Clock3, label: 'تحديث مستمر', value: 'لحظة بلحظة' },
          ].map((s, i) => (
            <div key={s.label} className="land-reveal text-center sm:text-right" style={{ transitionDelay: `${i * 70}ms` }}>
              <s.icon className="inline-block text-accent-yellow mb-2" size={22} />
              <p className="text-lg font-black text-white">{s.value}</p>
              <p className="text-xs sm:text-sm text-white/55 font-bold">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About + image */}
      <section id="about" className="relative bg-[#111111] py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="land-reveal space-y-5 order-2 lg:order-1">
            <p className="text-accent-yellow text-xs font-bold tracking-[0.3em] uppercase">من نحن</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              1Carz… منصة مصرية بتعيد ترتيب سوق العربيات
            </h2>
            <p className="text-white/70 text-base sm:text-lg leading-relaxed">
              إحنا مش مجرد صفحة إعلانات. بنبني تجربة رقمية كاملة: من أول ما تشوف العربية على اللوحة،
              لحد ما تتواصل، تعاين، وتقفّل الصفقة وأنت فاهم التفاصيل.
            </p>
            <p className="text-white/65 text-sm sm:text-base leading-relaxed">
              بنخدم المشتري اللي عايز عربية واضحة ومفحوصة، وبندعم المالك اللي عايز يبيع بسرعة وبشكل احترافي،
              وكمان بنسهّل على المسوّقين والمعاينين شغلهم اليومي من خلال لوحة حية وتنظيم للعربيات والأولويات.
            </p>
            <ul className="space-y-3 text-sm sm:text-base text-white/75">
              <li className="flex gap-2"><ShieldCheck className="text-accent-yellow flex-shrink-0 mt-0.5" size={18} /> شفافية في السعر والحالة ومكان المعاينة</li>
              <li className="flex gap-2"><Sparkles className="text-accent-yellow flex-shrink-0 mt-0.5" size={18} /> سيارات مميزة وسيارات تم فحصها بشارات واضحة</li>
              <li className="flex gap-2"><Eye className="text-accent-yellow flex-shrink-0 mt-0.5" size={18} /> متابعة لحظية للعروض الجديدة على الويب والتطبيق</li>
            </ul>
          </div>
          <div className="land-reveal order-1 lg:order-2 relative">
            <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
              <Image
                src={IMG.showroom}
                alt="عربية فاخرة — عروض 1Carz"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover land-float"
                style={{ animationDuration: '7s' }}
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <p className="absolute bottom-5 right-5 left-5 text-sm font-bold text-white/90 z-[1]">
                عروض حقيقية · صور واضحة · تفاصيل كافية قبل ما تنزل تعاين
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative py-20 sm:py-24 bg-gradient-to-b from-[#111111] to-[#0c0c0c]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="land-reveal mb-12 max-w-2xl">
            <p className="text-accent-yellow text-xs font-bold tracking-[0.3em] uppercase mb-3">إزاي بنشتغل</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">أربع خطوات بسيطة لصفقة أوثق</h2>
            <p className="text-white/60 text-sm sm:text-base leading-relaxed">
              سواء هتشتري أو هتبيع، الطريق عندنا واضح من غير تعقيد.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Search, t: '1) تصفّح اللوحة', d: 'شوف العربيات المتاحة، فلتر بالأولوية والسعر، وركز على اللي يناسبك.' },
              { icon: BadgeCheck, t: '2) اختار تم فحصها', d: 'لو عايز اطمئنان أكبر، ركّز على العربيات اللي عليها علامة الاعتماد.' },
              { icon: MessageCircle, t: '3) تواصل مباشرة', d: 'كلّم المعاين أو المالك، واسأل عن مكان المعاينة والتفاصيل قبل ما تتحرك.' },
              { icon: Car, t: '4) عاين وقفّل', d: 'نزّل عاين العربية بنفسك، واتفق على الصفقة وأنت فاهم كل حاجة.' },
            ].map((x, i) => (
              <div
                key={x.t}
                className="land-reveal rounded-3xl border border-white/10 bg-white/[0.03] p-5 hover:border-accent-yellow/40 transition-colors"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <x.icon className="text-accent-yellow mb-4" size={26} />
                <h3 className="text-lg font-extrabold text-white mb-2">{x.t}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we do + gallery */}
      <section className="relative py-20 sm:py-28 bg-[#0c0c0c]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="land-reveal max-w-2xl">
            <p className="text-accent-yellow text-xs font-bold tracking-[0.3em] uppercase mb-3">بنعمل إيه؟</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">خدماتنا للمشترين والبائعين</h2>
            <p className="text-white/65 text-base leading-relaxed">
              بنعرض العربيات بشكل منظم، بنسهّل التسويق للبائع، وبنساعد المشتري يلاقي عربية مناسبة بسرعة —
              مع فريق بيع وتواصل جاهز على واتساب وفيسبوك.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { img: IMG.keys, t: 'للمشتري', d: 'تصفّح عروض محدّثة، شوف الصور والسعر ومكان المعاينة، وتواصل فورًا من غير وسطاء كتير.' },
              { img: IMG.handshake, t: 'للبائع', d: 'انشر عربيتك معانا، خلّيها توصل لمشترين جادين، وخلّي فريق 1Carz يساعدك تقفل الصفقة أسرع.' },
              { img: IMG.garage, t: 'للمسوّق والمعاين', d: 'لوحة حية، أولويات واضحة، ومتابعة يومية للعروض والتعيينات عشان الشغل يبقى منظم.' },
            ].map((card, i) => (
              <article
                key={card.t}
                className="land-reveal group relative overflow-hidden rounded-3xl border border-white/10 min-h-[320px]"
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <Image
                  src={card.img}
                  alt={card.t}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-[1.4s] group-hover:scale-110"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10 z-[1]" />
                <div className="absolute bottom-0 p-6 space-y-2 z-[2]">
                  <h3 className="text-2xl font-black text-white">{card.t}</h3>
                  <p className="text-white/75 text-sm leading-relaxed">{card.d}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Inspected */}
      <section id="inspected" className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(34,197,94,0.16),transparent_55%)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div className="land-reveal space-y-5">
            <p className="text-emerald-400 text-xs font-bold tracking-[0.3em] uppercase">سيارات تم فحصها</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              علامة «تم فحصها»… عشان تشتري وأنت مطمّن أكتر
            </h2>
            <p className="text-white/70 text-base sm:text-lg leading-relaxed">
              العربيات اللي بتظهر عليها شارة الاعتماد معناها إن العربية ضمن مسار الفحص عندنا —
              فتقدر تفرّق بسرعة بين عرض عادي وعرض اتمرّ على مراجعة أوضح قبل ما تنزل تعاين.
            </p>
            <p className="text-white/60 text-sm sm:text-base leading-relaxed">
              تقدّر كمان تلاقي عربية مميزة ومفحوصة في نفس الوقت: النجمة للتميّز، وشارة «تم فحصها» للاعتماد.
            </p>
            <Link
              href="/cars"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold transition-colors"
            >
              شوف سيارات تم فحصها
              <ArrowLeft size={18} />
            </Link>
          </div>
          <div className="land-reveal flex justify-center">
            <div className="land-float relative w-56 h-56 sm:w-72 sm:h-72">
              <Image
                src="/badges/certified.png"
                alt="تم فحصها — علامة الاعتماد"
                fill
                className="object-contain drop-shadow-[0_20px_60px_rgba(34,197,94,0.35)]"
                unoptimized
              />
            </div>
          </div>
        </div>
      </section>

      {/* Vision / mission / values with more text */}
      <section className="relative py-20 bg-[#111111] border-y border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-3 gap-10">
          {[
            {
              title: 'رؤيتنا',
              body: 'نبقى المنصة الأولى في مصر لتسويق وبيع السيارات، بتجربة رقمية سهلة وآمنة وشفافة تربط المالك بالمشتري الجاد بأقل مجهود وأعلى ثقة.',
            },
            {
              title: 'مهمتنا',
              body: 'نبسّط رحلة البيع والشراء: عرض أوضح، تواصل أسرع، معاينة أسهل، ومتابعة مستمرة للعروض — عشان نوفر وقت العميل ونبني علاقة طويلة الأمد.',
            },
            {
              title: 'قيمنا',
              body: 'النزاهة في التعامل، الشفافية في المعلومات، الاحترافية في العرض، والثقة بين كل الأطراف — من أول صورة لحد إقفال الصفقة.',
            },
          ].map((b, i) => (
            <div key={b.title} className="land-reveal border-t border-accent-yellow/40 pt-6" style={{ transitionDelay: `${i * 80}ms` }}>
              <h3 className="text-xl font-black text-accent-yellow mb-3">{b.title}</h3>
              <p className="text-white/65 text-sm sm:text-base leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* App */}
      <section id="app" className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(252,211,77,0.18),transparent_55%)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="land-reveal flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-16">
            <div className="flex-1 space-y-5">
              <p className="text-accent-yellow text-xs font-bold tracking-[0.3em] uppercase">تطبيق 1Carz</p>
              <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                العربيات في جيبك… تحديثات أول بأول
              </h2>
              <p className="text-white/65 text-base sm:text-lg leading-relaxed max-w-lg">
                حمّل تطبيق 1Carz من Google Play وتصفّح العروض، تابع العربيات الجديدة، وخليك أقرب للصفقة وأنت على الطريق.
              </p>
              <ul className="space-y-2 text-sm text-white/70">
                <li>• تصفّح سريع للوحة العربيات</li>
                <li>• متابعة العروض والسيارات التي تم فحصها</li>
                <li>• تجربة موبايل أسهل من المتصفح</li>
              </ul>
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
              <div className="relative w-full max-w-sm aspect-[4/5] rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] p-1 shadow-[0_30px_80px_rgba(0,0,0,0.45)] overflow-hidden">
                <div className="relative h-full w-full rounded-[1.85rem] overflow-hidden">
                  <Image
                    src={IMG.night}
                    alt="تطبيق 1Carz على الموبايل"
                    fill
                    sizes="(max-width: 1024px) 90vw, 380px"
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>
                <div className="absolute bottom-6 inset-x-6 rounded-2xl bg-black/55 backdrop-blur-md border border-white/15 px-4 py-3 z-[1]">
                  <p className="text-accent-yellow text-xs font-bold mb-0.5">1Carz App</p>
                  <p className="text-white text-sm font-extrabold">سوق العربيات… في إيدك</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="relative border-t border-white/10 bg-[#080808] pt-16 pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="land-reveal text-center max-w-2xl mx-auto space-y-3">
            <p className="text-accent-yellow text-xs font-bold tracking-[0.3em] uppercase">تواصل معنا</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white">جاهزين نساعدك تبدأ صفقتك</h2>
            <p className="text-white/60 text-sm sm:text-base leading-relaxed">
              عندك عربية تبيعها؟ بتدور على عربية مناسبة؟ كلمنا على واتساب، تابعنا على فيسبوك، أو زورنا من الخريطة.
              فريق 1Carz موجود يرد ويقترح الأنسب ليك.
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
              <span className="text-sm text-white/55 font-bold" dir="ltr">{COMPANY_PHONE}</span>
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
              <span className="text-sm text-white/55 font-bold">تابع صفحة 1Carz</span>
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
              <span className="text-sm text-white/55 font-bold">افتح على الخريطة</span>
            </a>
          </div>

          <div className="land-reveal flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/10">
            <div className="inline-flex items-center gap-2">
              <BrandLogo size={36} />
              <span className="font-extrabold tracking-wide">1Carz</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-bold">
              <Link href="/privacy" className="text-white/70 hover:text-accent-yellow underline underline-offset-4 decoration-white/20 hover:decoration-accent-yellow transition-colors">
                سياسة الخصوصية
              </Link>
              <Link href="/terms" className="text-white/70 hover:text-accent-yellow underline underline-offset-4 decoration-white/20 hover:decoration-accent-yellow transition-colors">
                الشروط والأحكام
              </Link>
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-accent-yellow transition-colors">
                Google Play
              </a>
            </div>
            <p className="text-xs text-white/35">© {new Date().getFullYear()} 1Carz</p>
          </div>
        </div>
      </section>
    </div>
  );
}