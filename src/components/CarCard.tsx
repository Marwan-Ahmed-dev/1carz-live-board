'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Star, Car as CarIcon, Eye } from 'lucide-react';
import { Car as CarType } from '@/lib/types';
import { formatPrice } from '@/lib/format';
import { CopyButton } from '@/components/CopyButton';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/hooks/useAuth';

interface CarCardProps {
  car: CarType;
}

export function CarCard({ car }: CarCardProps) {
  const router = useRouter();
  const { isAdmin, isInspector } = useAuth();
  const isFeatured = car.is_featured;
  const additionalCount = car.additional_images?.length || 0;
  const copyPhone = isAdmin || isInspector ? car.owner_phone : car.inspector_phone;
  const copyLabel = isAdmin || isInspector ? 'نسخ رقم المالك' : 'نسخ رقم المعاين';

  return (
    <div className="relative bg-bg-card rounded-2xl overflow-hidden shadow-soft border border-border-soft">
      {isFeatured && (
        <div className="absolute z-10 m-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-yellow text-text-primary text-xs font-bold shadow-soft">
            <Star size={12} fill="currentColor" />
            مميز
          </span>
        </div>
      )}

      <div className="relative w-full aspect-[16/10] striped-bg overflow-hidden">
        {car.image_url ? (
          <Image
            src={car.image_url}
            alt={car.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <CarIcon size={56} className="text-text-muted opacity-40" strokeWidth={1.5} />
          </div>
        )}
        {additionalCount > 0 && (
          <div className="absolute bottom-2 left-2 z-10">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/70 text-white text-xs font-bold backdrop-blur-sm">
              +{additionalCount}
            </span>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <h3 className="text-base sm:text-lg font-bold text-text-primary line-clamp-2 mb-2">
          {car.title}
        </h3>
        <p
          className="price-display text-xl text-accent-yellow-hover mb-2 sm:hidden"
          dir="ltr"
        >
          {formatPrice(car.price)}{' '}
          <span className="text-sm font-medium text-text-secondary">ج.م</span>
        </p>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1 badge-number bg-bg-primary px-2 py-0.5 rounded text-xs sm:text-sm">
            <span className="truncate" dir="ltr">
              {copyPhone || '—'}
            </span>
            <CopyButton
              text={copyPhone || ''}
              label={copyLabel}
              size="sm"
              trackPhone
              carId={car.id}
            />
          </span>
          <StatusBadge status={car.status} size="md" />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (car.id) router.push(`/car/${car.id}`);
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-sm font-bold transition-colors cursor-pointer"
            aria-label="عرض التفاصيل"
          >
            <Eye size={16} />
            <span>عرض التفاصيل</span>
          </button>
        </div>
      </div>
    </div>
  );
}
