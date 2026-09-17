'use client';

import Image from 'next/image';
import { Star, Car as CarIcon } from 'lucide-react';
import { Car as CarType } from '@/lib/types';
import { formatPrice } from '@/lib/format';

interface CarCardProps {
  car: CarType;
}

/**
 * ترجمة الحالة للعربية
 */
function translateCondition(c: string): string {
  const map: Record<string, string> = {
    new: 'جديدة',
    used: 'مستعملة',
    excellent: 'ممتازة',
    good: 'جيدة',
    zero_km: 'كسر زيرو',
  };
  return map[c] || c;
}

/**
 * ترجمة الأولوية للعربية (للـ accessibility label فقط)
 */
function translatePriority(p: string): string {
  const map: Record<string, string> = {
    top: 'قصوى',
    high: 'عالية',
    medium: 'متوسطة',
    low: 'منخفضة',
  };
  return map[p] || p;
}

export function CarCard({ car }: CarCardProps) {
  const isFeatured = car.is_featured;
  const additionalCount = car.additional_images?.length || 0;
  const totalImages = (car.image_url ? 1 : 0) + additionalCount;
  // ✅ FIX: الكارت مش pressable — لا hover scale، لا pointer، لا navigation
  return (
    <div className="bg-bg-card rounded-2xl overflow-hidden shadow-soft border border-border-soft">
      {/* Badge "قيدوي" للمميزة */}
      {isFeatured && (
        <div className="absolute z-10 m-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-yellow text-text-primary text-xs font-bold shadow-soft">
            <Star size={12} fill="currentColor" />
            قيدوي
          </span>
        </div>
      )}

      {/* الصورة */}
      <div className="relative w-full aspect-[16/10] striped-bg overflow-hidden">
        {car.image_url ? (
          <Image
            src={car.image_url}
            alt={car.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <CarIcon size={56} className="text-text-muted opacity-40" strokeWidth={1.5} />
          </div>
        )}
        {/* Badge "+N" لإجمالي الصور */}
        {additionalCount > 0 && (
          <div className="absolute bottom-2 left-2 z-10">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/70 text-white text-xs font-bold backdrop-blur-sm">
              +{additionalCount}
            </span>
          </div>
        )}
        {/* عداد إجمالي الصور في الزاوية المقابلة (debug) */}
        {totalImages > 1 && (
          <div className="absolute top-2 left-2 z-10">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-black/50 text-white text-[10px] font-medium">
              {totalImages} 📷
            </span>
          </div>
        )}
      </div>

      {/* المعلومات */}
      <div className="p-3 sm:p-4">
        <h3 className="text-sm sm:text-base font-bold text-text-primary line-clamp-1 mb-1">
          {car.title}
        </h3>
        <p className="price-display text-lg sm:text-xl text-accent-yellow-hover mb-2">
          {formatPrice(car.price)} <span className="text-sm font-medium text-text-secondary">ج.م</span>
        </p>
        {car.description && (
          <p className="text-xs text-text-secondary line-clamp-2 mb-3 min-h-[2.2em]">
            {car.description}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 text-xs text-text-muted">
          <span className="badge-number bg-bg-primary px-2 py-0.5 rounded">{car.code}</span>
          <span>{translateCondition(car.condition)}</span>
        </div>
        {/* ✅ FIX: شيلنا زرار "عرض التفاصيل" — الكارت بقى read-only */}
      </div>
    </div>
  );
}