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

function ContactBlock({
  role,
  name,
  phone,
  copyLabel,
  carId,
}: {
  role: string;
  name?: string;
  phone?: string;
  copyLabel: string;
  carId?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-bg-primary/80 px-1.5 py-1 sm:px-2 sm:py-1.5 space-y-0.5">
      <div className="text-[10px] sm:text-xs text-text-muted font-medium">{role}</div>
      <div className="text-[11px] sm:text-sm font-bold text-text-primary truncate">{name || '—'}</div>
      <div className="flex items-center gap-0.5 min-w-0">
        <span className="badge-number text-[11px] sm:text-sm text-text-secondary truncate flex-1" dir="ltr">
          {phone || '—'}
        </span>
        <CopyButton
          text={phone || ''}
          label={copyLabel}
          size="sm"
          trackPhone
          carId={carId}
          className="flex-shrink-0 !w-6 !h-6 sm:!w-7 sm:!h-7"
        />
      </div>
    </div>
  );
}

export function CarCard({ car }: CarCardProps) {
  const router = useRouter();
  const { isAdmin, isInspector } = useAuth();
  const isFeatured = car.is_featured;
  const additionalCount = car.additional_images?.length || 0;

  return (
    <div className="relative flex flex-col h-full bg-bg-card rounded-xl sm:rounded-2xl overflow-hidden shadow-soft border border-border-soft">
      {isFeatured && (
        <div className="absolute z-10 top-1.5 right-1.5 sm:top-2 sm:right-2">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-accent-yellow text-text-primary text-[10px] sm:text-xs font-bold shadow-soft">
            <Star size={10} fill="currentColor" className="sm:w-3 sm:h-3" />
            مميز
          </span>
        </div>
      )}

      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] striped-bg overflow-hidden flex-shrink-0">
        {car.image_url ? (
          <Image
            src={car.image_url}
            alt={car.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <CarIcon size={36} className="text-text-muted opacity-40 sm:w-14 sm:h-14" strokeWidth={1.5} />
          </div>
        )}
        {additionalCount > 0 && (
          <div className="absolute bottom-1.5 left-1.5 z-10">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-black/70 text-white text-[10px] sm:text-xs font-bold backdrop-blur-sm">
              +{additionalCount}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-2 sm:p-3.5 gap-1.5 sm:gap-2 min-w-0">
        <h3 className="text-[13px] sm:text-base font-bold text-text-primary leading-snug line-clamp-2 min-h-[2.4em]">
          {car.title}
        </h3>

        <p className="price-display text-sm sm:text-xl text-accent-yellow-hover font-bold leading-none" dir="ltr">
          {formatPrice(car.price)}
          <span className="text-[10px] sm:text-sm font-medium text-text-secondary mr-0.5"> ج.م</span>
        </p>

        {isAdmin ? (
          <div className="space-y-1">
            <ContactBlock
              role="المعاين"
              name={car.inspector_name || ''}
              phone={car.inspector_phone || ''}
              copyLabel="نسخ رقم المعاين"
              carId={car.id}
            />
            <ContactBlock
              role="المالك"
              name={car.owner_name || ''}
              phone={car.owner_phone || ''}
              copyLabel="نسخ رقم المالك"
              carId={car.id}
            />
          </div>
        ) : isInspector ? (
          <ContactBlock
            role="المالك"
            name={car.owner_name || ''}
            phone={car.owner_phone || ''}
            copyLabel="نسخ رقم المالك"
            carId={car.id}
          />
        ) : (
          <ContactBlock
            role="المعاين"
            name={car.inspector_name || ''}
            phone={car.inspector_phone || ''}
            copyLabel="نسخ رقم المعاين"
            carId={car.id}
          />
        )}

        <div className="mt-auto flex items-center gap-1.5 pt-0.5">
          <StatusBadge status={car.status} size="sm" className="!text-[10px] sm:!text-xs !px-1.5 !py-0.5" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (car.id) router.push(`/car/${car.id}`);
            }}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 sm:py-2 rounded-lg bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary text-[11px] sm:text-sm font-bold transition-colors"
            aria-label="عرض التفاصيل"
          >
            <Eye size={13} className="sm:w-4 sm:h-4" />
            <span>عرض</span>
          </button>
        </div>
      </div>
    </div>
  );
}
