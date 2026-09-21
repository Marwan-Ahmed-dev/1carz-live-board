'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Calendar,
  Star,
  Shield,
  Car as CarIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Share2,
  Maximize2,
  Download,
  UserRound,
  MapPin,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToCar } from '@/lib/cars';
import { downloadAllCarImages, downloadSingleCarImage, shareCarImageFiles } from '@/lib/downloadCarImages';
import { Car as CarType, CarCondition } from '@/lib/types';
import { Header } from '@/components/Header';
import { LoadingState } from '@/components/LoadingState';
import { CopyButton } from '@/components/CopyButton';
import { Lightbox } from '@/components/Lightbox';
import { formatPrice, formatRelativeDate, formatFullDate } from '@/lib/format';
import { useToast } from '@/hooks/useToast';
import { StatusBadge } from '@/components/StatusBadge';

const CONDITION_META: Record<CarCondition, string> = {
  new: 'جديدة',
  used: 'مستعملة',
  excellent: 'ممتازة',
  good: 'جيدة',
  zero_km: 'كسر زيرو',
};

export default function CarDetailPage({ params }: { params: { id: string } }) {
  // ✅ FIX: Next.js 14 (App Router) بيبعت params كـ plain object — مش Promise.
  // استخدام use() مع object عادي بيكسر React لأن use() hook بيتطلب تكون
  // بنداؤه consistent في كل الـ renders. الحل: destructure مباشرة.
  const router = useRouter();
  const { user, isAdmin, isInspector, loading: authLoading, needsOnboarding } = useAuth();
  const { showToast } = useToast();
  const [car, setCar] = useState<CarType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingOne, setDownloadingOne] = useState<number | null>(null);
  const [iosShare, setIosShare] = useState<{
    title: string;
    batches: File[][];
    batchIndex: number;
  } | null>(null);
  const [iosSharing, setIosSharing] = useState(false);

  const id = params?.id;

  // Onboarding فقط — الضيوف يقدروا يشوفوا العربيات العامة
  useEffect(() => {
    if (authLoading) return;
    if (user && needsOnboarding) {
      router.replace('/onboarding');
    }
  }, [user, authLoading, needsOnboarding, router]);

  // Subscribe to car (ضيف أو مسجّل)
  useEffect(() => {
    if (!id || authLoading) return;
    if (user && needsOnboarding) return;
    setLoading(true);
    setError(null);
    const unsub = subscribeToCar(
      id,
      (c) => {
        setCar(c);
        setLoading(false);
        if (!c) setError('العربية غير موجودة');
      },
      (err) => {
        setLoading(false);
        setCar(null);
        setError(err.message?.includes('permission') ? 'لا تملك صلاحية لرؤية هذه العربية' : 'تعذر تحميل العربية');
      }
    );
    return () => unsub();
  }, [id, user, authLoading, needsOnboarding]);

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

  const shareMessage = car
    ? `🚗 ${car.title}\n💰 السعر: ${formatPrice(car.price)} ج.م${car.description ? `\n\n${car.description}` : ''}\n\nمن تطبيق 1CARZ`
    : 'عربية من تطبيق 1CARZ';
  const [shareUrl, setShareUrl] = useState('');
  useEffect(() => {
    setShareUrl(window.location.href);
  }, [id]);
  // H21: useMemo عشان ما نعيد الـ encodeURIComponent في كل render
  const whatsappShareUrl = useMemo(
    () => `https://wa.me/?text=${encodeURIComponent(shareMessage + (shareUrl ? `\n${shareUrl}` : ''))}`,
    [shareMessage, shareUrl]
  );

  const handleDownloadImages = async () => {
    if (!car || allImages.length === 0 || downloading || downloadingOne !== null) return;
    setDownloading(true);
    try {
      const result = await downloadAllCarImages(allImages, car.title);
      if (result.status === 'cancelled') return;
      if (result.status === 'needs-ios-confirm') {
        setIosShare({ title: result.title, batches: result.batches, batchIndex: 0 });
        return;
      }
      showToast(
        result.status === 'shared'
          ? allImages.length === 1
            ? 'تم مشاركة الصورة'
            : `تم تجهيز ${allImages.length} صور — احفظها من الشاشة`
          : allImages.length === 1
            ? 'تم تحميل الصورة'
            : `تم تحميل ${allImages.length} صور`,
        'success'
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل تحميل الصور';
      showToast(message, 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleIosShareBatch = async () => {
    if (!iosShare || iosSharing) return;
    const batch = iosShare.batches[iosShare.batchIndex];
    if (!batch?.length) return;
    setIosSharing(true);
    try {
      const result = await shareCarImageFiles(batch, iosShare.title);
      if (result === 'cancelled') return;
      const nextIndex = iosShare.batchIndex + 1;
      if (nextIndex < iosShare.batches.length) {
        setIosShare({ ...iosShare, batchIndex: nextIndex });
        showToast(`تم حفظ المجموعة ${nextIndex} — كمّل الباقي`, 'success');
      } else {
        setIosShare(null);
        const total = iosShare.batches.reduce((n, b) => n + b.length, 0);
        showToast(`تم تجهيز ${total} صور — احفظها في تطبيق الصور`, 'success');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل حفظ الصور';
      showToast(message, 'error');
    } finally {
      setIosSharing(false);
    }
  };

  const handleDownloadOne = async (index: number) => {
    if (!car || !allImages[index] || downloading || downloadingOne !== null) return;
    setDownloadingOne(index);
    try {
      const result = await downloadSingleCarImage(allImages[index], car.title, index + 1);
      if (result === 'cancelled') return;
      showToast(result === 'shared' ? 'تم مشاركة الصورة' : 'تم تحميل الصورة', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل تحميل الصورة';
      showToast(message, 'error');
    } finally {
      setDownloadingOne(null);
    }
  };

  if (authLoading || (user && needsOnboarding)) {
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
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <CarIcon size={80} className="text-text-muted opacity-30" strokeWidth={1.5} />
                  </div>
                )}
                {/* زر تكبير + تحميل الصورة الحالية */}
                {activeImage && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDownloadOne(activeImageIdx);
                      }}
                      disabled={downloadingOne !== null || downloading}
                      className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors disabled:opacity-50"
                      aria-label="تحميل هذه الصورة"
                      title="تحميل هذه الصورة"
                    >
                      {downloadingOne === activeImageIdx ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Download size={16} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxOpen(true);
                      }}
                      className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label="تكبير الصورة"
                    >
                      <Maximize2 size={16} />
                    </button>
                  </div>
                )}
                {/* Badge "مميز" */}
                {car.is_featured && (
                  <div className="absolute bottom-3 right-3 z-10">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent-yellow text-text-primary text-sm font-bold shadow-medium">
                      <Star size={14} fill="currentColor" />
                      مميز
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                      aria-label="السابق"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIdx((idx) => (idx + 1) % allImages.length);
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
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
                    <div key={url} className="relative flex-shrink-0">
                      <button
                        onClick={() => setActiveImageIdx(idx)}
                        className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors striped-bg block ${
                          activeImageIdx === idx
                            ? 'border-accent-yellow'
                            : 'border-border-soft hover:border-accent-yellow/50'
                        }`}
                        aria-label={`صورة ${idx + 1}`}
                      >
                        <Image
                          src={url}
                          alt={`${car.title} - صورة ${idx + 1}`}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDownloadOne(idx);
                        }}
                        disabled={downloadingOne !== null || downloading}
                        className="absolute bottom-1 left-1 z-10 w-7 h-7 rounded-lg bg-black/70 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-sm disabled:opacity-50"
                        aria-label={`تحميل صورة ${idx + 1}`}
                        title="تحميل هذه الصورة"
                      >
                        {downloadingOne === idx ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Download size={12} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {allImages.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadImages}
                disabled={downloading}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm bg-white border border-border-medium text-text-primary hover:bg-bg-card-hover transition-colors disabled:opacity-60"
              >
                {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {downloading
                  ? 'جاري تجهيز الصور...'
                  : allImages.length === 1
                    ? 'تحميل الصورة'
                    : `تحميل كل الصور (${allImages.length})`}
              </button>
            )}
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
              <div className="price-display text-3xl sm:text-4xl text-accent-yellow-hover" dir="ltr">
                {formatPrice(car.price)} <span className="text-lg font-medium text-text-secondary">ج.م</span>
              </div>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* الحالة */}
              <div className="bg-bg-card border border-border-soft rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                  <Shield size={14} />
                  الحالة
                </div>
                <div className="text-sm font-bold text-text-primary">{CONDITION_META[car.condition]}</div>
              </div>
              {/* التوفر */}
              <div className="bg-bg-card border border-border-soft rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-text-muted mb-2">
                    <Calendar size={14} />
                    التوفر
                  </div>
                <StatusBadge status={car.status} size="md" />
              </div>
            </div>

            {car.inspection_location?.trim() ? (
              <div className="bg-bg-card border border-border-soft rounded-2xl p-5">
                <h3 className="text-sm font-bold text-text-secondary flex items-center gap-1.5 mb-2">
                  <MapPin size={14} />
                  مكان المعاينة
                </h3>
                <p className="text-sm font-bold text-text-primary leading-relaxed">
                  {car.inspection_location.trim()}
                </p>
              </div>
            ) : null}

            {/* Description — مع زر نسخ */}
            {(car.inspector_name || car.inspector_phone) && (
              <div className="bg-bg-card border border-border-soft rounded-2xl p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-text-secondary flex items-center gap-1.5">
                    <UserRound size={14} />
                    المعاين
                  </h3>
                  <CopyButton
                    text={car.inspector_phone}
                    label="نسخ رقم المعاين"
                    size="sm"
                    variant="inline"
                    trackPhone
                    carId={car.id}
                  />
                </div>
                {car.inspector_name && (
                  <div className="text-sm font-bold text-text-primary">{car.inspector_name}</div>
                )}
                {car.inspector_phone && (
                  <div className="text-sm text-text-secondary mt-1" dir="ltr">
                    {car.inspector_phone}
                  </div>
                )}
              </div>
            )}

            {(isAdmin || isInspector) && (car.owner_name || car.owner_phone) && (
              <div className="bg-bg-card border border-border-soft rounded-2xl p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-text-secondary">المالك</h3>
                  {car.owner_phone && (
                    <CopyButton
                      text={car.owner_phone}
                      label="نسخ رقم المالك"
                      size="sm"
                      variant="inline"
                      trackPhone
                      carId={car.id}
                    />
                  )}
                </div>
                {car.owner_name && (
                  <div className="text-sm font-bold text-text-primary">{car.owner_name}</div>
                )}
                {car.owner_phone && (
                  <div className="text-sm text-text-secondary mt-1" dir="ltr">
                    {car.owner_phone}
                  </div>
                )}
              </div>
            )}

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
          downloadBaseName={car.title}
          onClose={() => setLightboxOpen(false)}
          onToast={showToast}
        />
      )}

      {/* iOS: ضغطة تأكيد بعد التجهيز عشان Share Sheet يشتغل ويحفظ صور مش ZIP */}
      {iosShare && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-bg-card border border-border-soft rounded-2xl p-5 space-y-4 shadow-medium">
            <div>
              <h3 className="text-lg font-bold text-text-primary">حفظ الصور في جهازك</h3>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                اتجهزت{' '}
                <span className="font-bold text-text-primary">
                  {iosShare.batches.reduce((n, b) => n + b.length, 0)}
                </span>{' '}
                صورة. اضغط الزر وهتظهر شاشة الآيفون — اختار{' '}
                <span className="font-bold">حفظ الصور</span> / Save Images.
              </p>
              {iosShare.batches.length > 1 && (
                <p className="text-xs text-text-muted mt-2">
                  المجموعة {iosShare.batchIndex + 1} من {iosShare.batches.length} (
                  {iosShare.batches[iosShare.batchIndex]?.length || 0} صورة)
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void handleIosShareBatch()}
              disabled={iosSharing}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary font-bold text-sm disabled:opacity-60"
            >
              {iosSharing ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {iosShare.batches.length > 1
                ? `حفظ المجموعة ${iosShare.batchIndex + 1}`
                : 'حفظ كل الصور'}
            </button>
            <button
              type="button"
              onClick={() => setIosShare(null)}
              disabled={iosSharing}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:bg-bg-card-hover"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
