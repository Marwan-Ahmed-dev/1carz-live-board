'use client';

import Image from 'next/image';

interface BrandLogoProps {
  size?: number;
  className?: string;
  rounded?: boolean;
  alt?: string;
}

export function BrandLogo({
  size = 40,
  className = '',
  rounded = true,
  alt = '1CARZ',
}: BrandLogoProps) {
  const cls = `${rounded ? 'rounded-xl ' : ''}object-cover ${className}`;
  return (
    <Image
      src="/icons/icon-192.png?v=8"
      alt={alt}
      width={size}
      height={size}
      className={cls.trim()}
      priority
    />
  );
}