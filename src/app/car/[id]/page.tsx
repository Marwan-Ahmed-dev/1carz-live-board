'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowRight,
  Phone,
  Calendar,
  Tag,
  Star,
  Shield,
  Car as CarIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Share2,
  Maximize2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToCar } from '@/lib/cars';
import { Car as CarType, CarStatus, CarCondition } from '@/lib/types';
import { Header } from '@/components/Header';
import { LoadingState } from '@/components/LoadingState';
import { CopyButton } from '@/components/CopyButton';
import { Lightbox } from '@/components/Lightbox';
import { formatPrice, formatRelativeDate, formatFullDate } from '@/lib/format';

const STATUS_META: Record<CarStatus, { label: string; color: string }> = {
  active: { label: 'متاحة', color: 'bg-green-100 text-green-700' },
  inactive: { label: 'غير معروضة', color: 'bg-gray-100 text-gray-700' },
  reserved: { label: 'محجوزة', color: 'bg-amber-100 text-amber-700' },
  sold: { label: 'مباعة', color: 'bg-red-100 text-red-700' },
};

const CONDITION_META: Record<CarCondition, string> = {
  new: 'جديدة',
  used: 'مستعملة',
  excellent: 'ممتازة',
  good: 'جيدة',
  zero_km: 'كسر زيرو',
};

const PRIORITY_META: Record<string, string> = {
  top: 'قصوى',
  high: 'عالية',
  medium: 'متوسطة',
  low: 'منخفضة',
};

export default function CarDetailPage({ params }: { params: { id: string } }) {
  // ✅ FIX: Next.js 14 (App Router) بيبعت params كـ plain object — مش Promise.
  // استخدام use() مع object عادي بيكسر React لأن use() hook بيتطلب تكون
  // بنداؤه consistent في كل الـ renders. الحل: destructure مباشرة.
  const router = useRouter();
  const { user, loading: authLoading, needsOnboarding } = useAuth();
  const [car, setCar] = useState<CarType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const id = params?.id;

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (needsOnboarding) {
      router.replace('/onboarding');
    }
  }, [user, authLoading, needsOnboarding, router]);

  // Subscribe to car
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const unsub = subscribeToCar(id, (c) => {
      setCar(c);
      setLoading(false);
      if (!c) setError('العربية غير موجودة');
    });
    return () => unsub();
  }, [id]);

  // Reset active image when car changes
  useEffect(() => {
    setActiveImageIdx(0);
  }, [car?.id]);

  // قائمة كل الصور (الرئيسية + الإضافية)
  const allImages = useMemo(
    () => (car ? [car.image_url, ...(car.additional_images || [])].filter(Boolean) : []),
    [car]
  );
  const activeImage = allImages[activeImageIdx] || car?.image_url || '';

  // رابط الـ WhatsApp للتواصل (مع الأدمن)
  const whatsappNumber = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || '';
  const contactMessage = car
    ? `استفسار عن العربية: ${car.title} (${car.code}) - السعر: ${formatPrice(car.price)} ج.م`
    : 'استفسار من تطبيق 1CARZ';
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(contactMessage)}`
    : '#';

  // رابط الـ WhatsApp SHARE (مشاركة عامة، بدون رقم محدد)
  const shareMessage = car
    ? `🚗 ${car.title}\n📋 كود: ${car.code}\n💰 السعر: ${formatPrice(car.price)} ج.م${car.description ? `\n\n${car.description}` : ''}\n\nمن تطبيق 1CARZ`
    : 'عربية من تطبيق 1CARZ';
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage + (shareUrl ? `\n${shareUrl}` : ''))}`;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-accent-yellow" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowRight size={18} />
          العودة
        </button>

        {loading && <LoadingState variant="detail" />}

        {error && !car && (
          <div className="bg-bg-card border border-border-soft rounded-2xl p-8 text-center">
            <CarIcon size={48} className="mx-auto text-text-muted mb-3" />
            <h2 className="text-lg font-bold text-text-primary mb-1">العربية غير موجودة</h2>
            <p className="text-sm text-text-secondary">قد تكون محذوفة أو لا تملك صلاحية لرؤيتها</p>
          </div>
        )}

        {car && (
          <>
            {/* Image Gallery */}
            <div className="space-y-2">
              {/* الصورة الرئيسية */}
              <div
                className="relative w-full aspect-[16/10] bg-bg-card rounded-2xl overflow-hidden striped-bg cursor-pointer group"
                onClick={() => setLightboxOpen(true)}
              >
                {activeImage ? (
                  <Image
                    src={activeImage}
                    alt={car.title}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <CarIcon size={80} className="text-text-muted opacity-30" strokeWidth={1.5} />
                  </div>
                )}
                {/* زر تكبير (يظهر على hover) */}
                {activeImage && (
                  <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxOpen(true);
                      }}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
                      aria-label="تكبير الصورة"
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                )}
                {/* Badge "قيدوي" */}
                {car.is_featured && (
                  <div className="absolute top-3 right-3 group-hover:opacity-0 transition-opacity">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent-yellow text-text-primary text-sm font-bold shadow-medium">
                      <Star size={14} fill="currentColor" />
                      قيدوي
                    </span>
                  </div>
                )}
                {/* عداد الصور */}
                {allImages.length > 1 && (
                  <div className="absolute top-3 left-3 z-10">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-black/70 text-white text-xs font-bold backdrop-blur-sm">
                      {activeImageIdx + 1} / {allImages.length}
                    </span>
                  </div>
                )}
                {/* أزرار prev/next — لا تفتح الـ lightbox */}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIdx((idx) => (idx - 1 + allImages.length) % allImages.length);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                      aria-label="السابق"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIdx((idx) => (idx + 1) % allImages.length);
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                      aria-label="التالي"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  </>
                )}
              </div>

              {/* thumbnails */}
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {allImages.map((url, idx) => (
                    <button
                      key={url}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors striped-bg ${
                        activeImageIdx === idx
                          ? 'border-accent-yellow'
                          : 'border-border-soft hover:border-accent-yellow/50'
                      }`}
                      aria-label={`صورة ${idx + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`${car.title} - صورة ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title + Price */}
            <div className="bg-bg-card border border-border-soft rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary flex-1">
                  {car.title}
                </h1>
                {/* زر مشاركة WhatsApp */}
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 transition-colors flex-shrink-0"
                  aria-label="مشاركة عبر واتساب"
                  title="مشاركة عبر واتساب"
                >
                  <Share2 size={18} />
                </a>
              </div>
              <div className="price-display text-3xl sm:text-4xl text-accent-yellow-hover">
                {formatPrice(car.price)} <span className="text-lg font-medium text-text-secondary">ج.م</span>
              </div>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* الكود — مع زر نسخ */}
              <div className="bg-bg-card border border-border-soft rounded-xl p-3">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Tag size={14} />
                    الكود
                  </div>
                  <CopyButton text={car.code} label="نسخ الكود" size="sm" />
                </div>
                <div className="badge-number text-sm font-bold text-text-primary">{car.code}</div>
              </div>
              {/* الحالة */}
              <div className="bg-bg-card border border-border-soft rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                  <Shield size={14} />
                  الحالة
                </div>
                <div className="text-sm font-bold text-text-primary">{CONDITION_META[car.condition]}</div>
              </div>
              {/* الأولوية */}
              <div className="bg-bg-card border border-border-soft rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                  <Star size={14} />
                  الأولوية
                </div>
                <div className="text-sm font-bold text-text-primary">
                  {PRIORITY_META[car.priority]}
                </div>
              </div>
              {/* التوفر */}
              <div className="bg-bg-card border border-border-soft rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                  <Calendar size={14} />
                  التوفر
                </div>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_META[car.status].color}`}
                >
                  {STATUS_META[car.status].label}
                </span>
              </div>
            </div>

            {/* Description — مع زر نسخ */}
            {car.description && (
              <div className="bg-bg-card border border-border-soft rounded-2xl p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-text-secondary">الوصف</h3>
                  <CopyButton text={car.description} label="نسخ الوصف" size="sm" variant="inline" />
                </div>
                <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                  {car.description}
                </p>
              </div>
            )}

            {/* WhatsApp CTA — للتواصل مع الأدمن */}
            {car.status === 'active' && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-base transition-colors ${
                  whatsappNumber
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-bg-card-hover text-text-muted cursor-not-allowed pointer-events-none'
                }`}
              >
                <Phone size={20} />
                تواصل عبر واتساب
              </a>
            )}

            {/* Timestamps — تاريخ نسبي + hover للتفاصيل */}
            {car.created_at && (
              <div
                className="text-center text-xs text-text-muted pt-2"
                title={formatFullDate(car.created_at)}
              >
                {formatRelativeDate(car.created_at)}
              </div>
            )}
          </>
        )}
      </main>

      {/* Lightbox */}
      {lightboxOpen && car && allImages.length > 0 && (
        <Lightbox
          images={allImages}
          startIndex={activeImageIdx}
          alt={car.title}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
