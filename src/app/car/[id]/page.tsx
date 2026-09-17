'use client';

import { useEffect, useState, use } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToCar } from '@/lib/cars';
import { Car as CarType, CarStatus, CarCondition } from '@/lib/types';
import { Header } from '@/components/Header';
import { LoadingState } from '@/components/LoadingState';
import { formatPrice } from '@/lib/format';

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

function formatDate(timestamp: any): string {
  if (!timestamp) return '-';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return '-';
  }
}

export default function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user, loading: authLoading, needsOnboarding } = useAuth();
  const [car, setCar] = useState<CarType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // unwrap params (Next.js 14+ dynamic API)
  const { id } = use(params);

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

  const whatsappNumber = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || '';
  const whatsappMessage = car
    ? `استفسار عن العربية: ${car.title} (${car.code}) - السعر: ${formatPrice(car.price)} ج.م`
    : 'استفسار من تطبيق 1CARZ';
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
    : '#';

  // قائمة كل الصور (الرئيسية + الإضافية)
  const allImages: string[] = car
    ? [car.image_url, ...(car.additional_images || [])].filter(Boolean)
    : [];
  const activeImage = allImages[activeImageIdx] || car?.image_url || '';

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
              <div className="relative w-full aspect-[16/10] bg-bg-card rounded-2xl overflow-hidden striped-bg">
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
                {/* Badge "قيدوي" */}
                {car.is_featured && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent-yellow text-text-primary text-sm font-bold shadow-medium">
                      <Star size={14} fill="currentColor" />
                      قيدوي
                    </span>
                  </div>
                )}
                {/* عداد الصور */}
                {allImages.length > 1 && (
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-black/70 text-white text-xs font-bold backdrop-blur-sm">
                      {activeImageIdx + 1} / {allImages.length}
                    </span>
                  </div>
                )}
                {/* أزرار prev/next */}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveImageIdx((idx) => (idx - 1 + allImages.length) % allImages.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                      aria-label="السابق"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <button
                      onClick={() => setActiveImageIdx((idx) => (idx + 1) % allImages.length)}
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
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
                {car.title}
              </h1>
              <div className="price-display text-3xl sm:text-4xl text-accent-yellow-hover">
                {formatPrice(car.price)} <span className="text-lg font-medium text-text-secondary">ج.م</span>
              </div>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-bg-card border border-border-soft rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                  <Tag size={14} />
                  الكود
                </div>
                <div className="badge-number text-sm font-bold text-text-primary">{car.code}</div>
              </div>
              <div className="bg-bg-card border border-border-soft rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                  <Shield size={14} />
                  الحالة
                </div>
                <div className="text-sm font-bold text-text-primary">{CONDITION_META[car.condition]}</div>
              </div>
              <div className="bg-bg-card border border-border-soft rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                  <Star size={14} />
                  الأولوية
                </div>
                <div className="text-sm font-bold text-text-primary">
                  {car.priority === 'top' && 'قصوى'}
                  {car.priority === 'high' && 'عالية'}
                  {car.priority === 'medium' && 'متوسطة'}
                  {car.priority === 'low' && 'منخفضة'}
                </div>
              </div>
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

            {/* Description */}
            {car.description && (
              <div className="bg-bg-card border border-border-soft rounded-2xl p-5">
                <h3 className="text-sm font-bold text-text-secondary mb-2">الوصف</h3>
                <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                  {car.description}
                </p>
              </div>
            )}

            {/* WhatsApp CTA */}
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

            {/* Timestamps */}
            <div className="text-center text-xs text-text-muted pt-2">
              أُضيفت في {formatDate(car.created_at)}
            </div>
          </>
        )}
      </main>
    </div>
  );
}