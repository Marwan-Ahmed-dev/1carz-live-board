'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Download, Loader2, X } from 'lucide-react';
import { downloadSingleCarImage } from '@/lib/downloadCarImages';

interface LightboxProps {
  images: string[];
  startIndex?: number;
  onClose: () => void;
  alt?: string;
  downloadBaseName?: string;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

export function Lightbox({
  images,
  startIndex = 0,
  onClose,
  alt = 'صورة',
  downloadBaseName = 'car',
  onToast,
}: LightboxProps) {
  const [idx, setIdx] = useState(startIndex);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setIdx(startIndex);
  }, [startIndex]);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') setIdx((i) => (i + 1) % images.length);
      else if (e.key === 'ArrowRight') setIdx((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, onClose]);

  if (images.length === 0) return null;
  const currentImage = images[idx];

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloading || !currentImage) return;
    setDownloading(true);
    try {
      const result = await downloadSingleCarImage(currentImage, downloadBaseName, idx + 1);
      if (result === 'cancelled') return;
      onToast?.(result === 'shared' ? 'تم مشاركة الصورة' : 'تم تحميل الصورة', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'فشل تحميل الصورة';
      onToast?.(message, 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
        aria-label="إغلاق"
      >
        <X size={20} />
      </button>

      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="absolute top-4 right-16 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors disabled:opacity-50"
        aria-label="تحميل هذه الصورة"
        title="تحميل هذه الصورة"
      >
        {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
      </button>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-white/10 text-white text-sm font-bold backdrop-blur-sm">
        {idx + 1} / {images.length}
      </div>

      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIdx((i) => (i - 1 + images.length) % images.length);
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
          aria-label="السابق"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIdx((i) => (i + 1) % images.length);
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
          aria-label="التالي"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      <div
        className="relative w-full h-full max-w-[95vw] max-h-[90vh] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* M17: active + prev/next marked priority so navigation feels instant;
            next/image still lazy-loads anything outside this window. */}
        <Image
          key={`main-${currentImage}`}
          src={currentImage}
          alt={`${alt} ${idx + 1}`}
          fill
          sizes="95vw"
          unoptimized
          className="object-contain select-none"
          draggable={false}
          priority
        />
        {/* Hidden adjacent preload — keeps prev/next ready for arrow navigation */}
        {images[(idx - 1 + images.length) % images.length] && (
          <Image
            key={`prev-${currentImage}`}
            src={images[(idx - 1 + images.length) % images.length]}
            alt=""
            aria-hidden
            fill
            sizes="95vw"
            unoptimized
            className="opacity-0 pointer-events-none"
            priority
          />
        )}
        {images[(idx + 1) % images.length] && (
          <Image
            key={`next-${currentImage}`}
            src={images[(idx + 1) % images.length]}
            alt=""
            aria-hidden
            fill
            sizes="95vw"
            unoptimized
            className="opacity-0 pointer-events-none"
            priority
          />
        )}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 max-w-[90vw] overflow-x-auto no-scrollbar">
          <div className="flex gap-2 px-4">
            {images.map((url, i) => (
              <button
                key={url}
                onClick={(e) => {
                  e.stopPropagation();
                  setIdx(i);
                }}
                className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all striped-bg ${
                  idx === i ? 'border-accent-yellow scale-110' : 'border-white/30 hover:border-white/60'
                }`}
                aria-label={`صورة ${i + 1}`}
              >
                <Image src={url} alt="" fill sizes="56px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
