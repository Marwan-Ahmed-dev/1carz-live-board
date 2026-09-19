'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { logPhoneCopy } from '@/lib/copyEvents';

interface CopyButtonProps {
  /** النص اللي هيتنسخ */
  text: string;
  /** label للـ tooltip / accessibility */
  label?: string;
  /** حجم الزر (small = 14px, medium = 18px) */
  size?: 'sm' | 'md';
  /** شكل الزر */
  variant?: 'icon' | 'inline';
  /** className إضافية */
  className?: string;
  /** تسجيل النسخ في تقرير الأدمن اليومي */
  trackPhone?: boolean;
  carId?: string;
}

/**
 * زر نسخ سريع — بيستخدم navigator.clipboard.writeText
 * - بيعرض علامة ✓ لمدة ثانيتين بعد النجاح
 * - بيعرض toast عند النجاح/الفشل
 */
export function CopyButton({
  text,
  label = 'نسخ',
  size = 'sm',
  variant = 'icon',
  className = '',
  trackPhone = false,
  carId,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const { userData } = useAuth();
  const Icon = copied ? Check : Copy;
  const iconSize = size === 'sm' ? 14 : 18;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!text?.trim()) {
      showToast('لا يوجد رقم للنسخ', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast('تم النسخ ✓', 'success');
      if (trackPhone) {
        void logPhoneCopy({ carId, username: userData?.username });
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback: حاول بطريقة قديمة
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        showToast('تم النسخ ✓', 'success');
        if (trackPhone) {
          void logPhoneCopy({ carId, username: userData?.username });
        }
        setTimeout(() => setCopied(false), 2000);
      } catch (e2) {
        showToast('فشل النسخ', 'error');
      }
    }
  };

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-card-hover hover:bg-border-medium text-text-secondary hover:text-text-primary text-xs font-medium transition-colors ${className}`}
        aria-label={label}
      >
        <Icon size={iconSize} className={copied ? 'text-green-600' : ''} />
        {copied ? 'تم' : label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg bg-bg-card hover:bg-border-medium text-text-secondary hover:text-text-primary transition-colors ${className}`}
      aria-label={label}
      title={label}
    >
      <Icon size={iconSize} className={copied ? 'text-green-600' : ''} />
    </button>
  );
}
