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
      title="سيارة مفحوصة — علامة الاعتماد"
      aria-label="سيارة مفحوصة"
    >
      <Image
        src="/badges/certified.png"
        alt="مفحوصة — علامة الاعتماد"
        width={dim}
        height={dim}
        className="object-contain"
        unoptimized
      />
    </div>
  );
}