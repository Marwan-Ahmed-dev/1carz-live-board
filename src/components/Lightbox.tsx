'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface LightboxProps {
  /** URLs الصور */
  images: string[];
  /** الصورة اللي يبدأ منها (index) */
  startIndex?: number;
  /** دالة الإغلاق */
  onClose: () => void;
  /** عنوان الـ alt */
  alt?: string;
}

/**
 * Lightbox full-screen لعرض الصور
 * - يفتح بـ overlay أسود
 * - سهم يمين/يسار + أزرار + ESC للتجول
 * - click outside للصورة يقفل
 * - يمنع scroll الـ body وهو مفتوح
 */
export function Lightbox({ images, startIndex = 0, onClose, alt = 'صورة' }: LightboxProps) {
  const [idx, setIdx] = useState(startIndex);

  // منع الـ body scroll
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // ESC للتجول / الإغلاق
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') setIdx((i) => (i + 1) % images.length); // RTL: left = next
      else if (e.key === 'ArrowRight') setIdx((i) => (i - 1 + images.length) % images.length); // RTL: right = prev
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, onClose]);

  if (images.length === 0) return null;
  const currentImage = images[idx];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* زر الإغلاق */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
        aria-label="إغلاق"
      >
        <X size={20} />
      </button>

      {/* عداد الصور */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-white/10 text-white text-sm font-bold backdrop-blur-sm">
        {idx + 1} / {images.length}
      </div>

      {/* زر السابق (في الـ RTL: على اليمين = previous) */}
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

      {/* زر التالي (في الـ RTL: على اليسار = next) */}
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

      {/* الصورة */}
      <div
        className="relative w-full h-full max-w-[95vw] max-h-[90vh] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage}
          alt={`${alt} ${idx + 1}`}
          className="w-full h-full object-contain select-none"
          draggable={false}
        />
      </div>

      {/* thumbnails strip تحت الصورة */}
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
                className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all striped-bg ${
                  idx === i ? 'border-accent-yellow scale-110' : 'border-white/30 hover:border-white/60'
                }`}
                aria-label={`صورة ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
