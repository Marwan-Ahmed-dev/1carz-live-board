'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Star, Car as CarIcon, Eye } from 'lucide-react';
import { Car as CarType } from '@/lib/types';
import { formatPrice, formatRelativeDate } from '@/lib/format';
import { CopyButton } from '@/components/CopyButton';

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
  const router = useRouter();
  const isFeatured = car.is_featured;
  const additionalCount = car.additional_images?.length || 0;
  const totalImages = (car.image_url ? 1 : 0) + additionalCount;

  // نص "نسخ" — عنوان + سعر + كود
  const copyText = `${car.title} - ${formatPrice(car.price)} ج.م (كود: ${car.code})`;

  return (
    <div className="relative bg-bg-card rounded-2xl overflow-hidden shadow-soft border border-border-soft">
      {/* Badge "قيدوي" للمميزة */}
      {isFeatured && (
        <div className="absolute z-10 m-1.5 sm:m-2">
          <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-accent-yellow text-text-primary text-[10px] sm:text-xs font-bold shadow-soft">
            <Star size={10} className="sm:hidden" fill="currentColor" />
            <Star size={12} className="hidden sm:inline" fill="currentColor" />
            قيدوي
          </span>
        </div>
      )}

      {/* الصورة */}
      <div className="relative w-full aspect-square sm:aspect-[16/10] striped-bg overflow-hidden">
        {car.image_url ? (
          <Image
            src={car.image_url}
            alt={car.title}
            fill
            sizes="(max-width: 768px) 33vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <CarIcon size={56} className="text-text-muted opacity-40" strokeWidth={1.5} />
          </div>
        )}
        {/* Badge "+N" لإجمالي الصور */}
        {additionalCount > 0 && (
          <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 z-10">
            <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-black/70 text-white text-[10px] sm:text-xs font-bold backdrop-blur-sm">
              +{additionalCount}
            </span>
          </div>
        )}
      </div>

      {/* المعلومات */}
      <div className="p-2 sm:p-4">
        <h3 className="text-xs sm:text-base font-bold text-text-primary line-clamp-2 sm:line-clamp-1 mb-0.5 sm:mb-1 min-h-[2rem] sm:min-h-0">
          {car.title}
        </h3>
        <p className="price-display text-sm sm:text-xl text-accent-yellow-hover mb-1 sm:mb-2">
          {formatPrice(car.price)} <span className="text-[10px] sm:text-sm font-medium text-text-secondary">ج.م</span>
        </p>
        {/* الوصف — يظهر فقط في الشاشات الكبيرة (لأن الكارت صغير في الموبايل) */}
        {car.description && (
          <p className="hidden sm:block text-xs text-text-secondary line-clamp-2 mb-3 min-h-[2.2em]">
            {car.description}
          </p>
        )}
        <div className="flex items-center justify-between gap-1 sm:gap-2 text-[10px] sm:text-xs text-text-muted">
          <span className="badge-number bg-bg-primary px-1.5 sm:px-2 py-0.5 rounded truncate">
            {car.code}
          </span>
          <span className="truncate">{translateCondition(car.condition)}</span>
        </div>
        {/* Relative timestamp — يظهر تحت الكارت في الموبايل فقط */}
        {car.created_at && (
          <div className="mt-1 sm:hidden text-[10px] text-text-muted truncate">
            {formatRelativeDate(car.created_at)}
          </div>
        )}

        {/* ✅ FIX: أزرار تحت الكارت — عرض التفاصيل + نسخ الكود + نسخ التفاصيل */}
        <div className="mt-2 flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (car.id) router.push(`/car/${car.id}`);
            }}
            className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-[11px] sm:text-xs font-bold transition-colors cursor-pointer"
            aria-label="عرض التفاصيل"
          >
            <Eye size={12} className="sm:hidden" />
            <Eye size={14} className="hidden sm:inline" />
            <span>عرض التفاصيل</span>
          </button>
          <CopyButton text={car.code} label="كود" size="sm" />
          <CopyButton text={copyText} label="نسخ" size="sm" />
        </div>
      </div>
    </div>
  );
}