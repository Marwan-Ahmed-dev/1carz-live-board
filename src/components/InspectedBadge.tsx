'use client';

import Image from 'next/image';

interface InspectedBadgeProps {
  /** sm = card corner, md = detail page */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * علامة الاعتماد — سيارة مفحوصة (مستقلة عن شارة مميز).
 */
export function InspectedBadge({ size = 'sm', className = '' }: InspectedBadgeProps) {
  const dim = size === 'md' ? 72 : 52;
  return (
    <div
      className={`pointer-events-none drop-shadow-md ${className}`}
      title="تم فحصها — علامة الاعتماد"
      aria-label="تم فحصها"
    >
      <Image
        src="/badges/certified.png"
        alt="تم فحصها"
        width={dim}
        height={dim}
        className="object-contain"
        unoptimized
      />
    </div>
  );
}