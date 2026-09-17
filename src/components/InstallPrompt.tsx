'use client';

import { Download, X, Smartphone } from 'lucide-react';

interface InstallPromptProps {
  show: boolean;
  isIOS: boolean;
  onInstall: () => void | Promise<void>;
  onDismiss: () => void;
}

/**
 * نافذة PWA install prompt
 * - على Android/Desktop: يظهر زر "ثبت الآن" يستدعي الـ prompt الأصلي
 * - على iOS: يظهر تعليمات يدوية (Share -> Add to Home Screen)
 */
export function InstallPrompt({ show, isIOS, onInstall, onDismiss }: InstallPromptProps) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-6 shadow-medium modal-in relative">
        {/* زر الإغلاق */}
        <button
          onClick={onDismiss}
          className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-white hover:bg-bg-card-hover flex items-center justify-center cursor-pointer"
          aria-label="إغلاق"
        >
          <X size={18} className="text-text-muted" />
        </button>

        {/* الأيقونة */}
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-yellow">
          <Smartphone size={32} className="text-text-primary" strokeWidth={2.5} />
        </div>

        {/* العنوان والوصف */}
        <h2 className="text-xl font-bold text-text-primary text-center mb-2">
          ثبت التطبيق على جهازك
        </h2>
        <p className="text-sm text-text-secondary text-center mb-6">
          {isIOS
            ? 'للحصول على تجربة أفضل، اضغط زر المشاركة ثم اختر "إضافة إلى الشاشة الرئيسية"'
            : 'ثبت التطبيق على شاشة رئيسية للتصفح السريع وتجربة أفضل'}
        </p>

        {/* الأزرار */}
        <div className="flex flex-col gap-2">
          {!isIOS && (
            <button
              onClick={onInstall}
              className="w-full py-3 rounded-xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary font-bold text-base transition-colors flex items-center justify-center gap-2"
            >
              <Download size={18} />
              ثبت الآن
            </button>
          )}
          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-xl bg-white border border-border-medium text-text-secondary font-medium text-base hover:bg-bg-card-hover transition-colors"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
}