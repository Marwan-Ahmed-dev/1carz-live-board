'use client';

import { Home, Share, X } from 'lucide-react';
import type { ShortcutPlatform } from '@/hooks/useShortcutPrompt';

interface ShortcutPromptProps {
  show: boolean;
  platform: ShortcutPlatform;
  onDismiss: () => void;
}

const STEPS: Record<ShortcutPlatform, string[]> = {
  ios: [
    'اضغط زر المشاركة في أسفل Safari',
    'مرّر واختر «إضافة إلى الشاشة الرئيسية»',
    'اضغط إضافة',
  ],
  android: [
    'اضغط القائمة ⋮ في أعلى المتصفح',
    'اختر «إضافة إلى الشاشة الرئيسية»',
    'لا تختر «تثبيت التطبيق» — نريد اختصاراً فقط',
  ],
  desktop: [
    'من قائمة المتصفح ⋮ اختر إنشاء اختصار',
    'لا تفعّل «فتح في نافذة»',
    'سيظهر الاختصار على سطح المكتب أو شريط المهام',
  ],
};

export function ShortcutPrompt({ show, platform, onDismiss }: ShortcutPromptProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-prompt-title"
    >
      <div className="bg-bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl p-6 shadow-medium modal-in relative">
        <button
          onClick={onDismiss}
          className="absolute top-4 left-4 w-8 h-8 rounded-lg bg-white hover:bg-bg-card-hover flex items-center justify-center cursor-pointer"
          aria-label="إغلاق"
        >
          <X size={18} className="text-text-muted" />
        </button>

        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-yellow">
          {platform === 'ios' ? (
            <Share size={32} className="text-text-primary" strokeWidth={2.5} />
          ) : (
            <Home size={32} className="text-text-primary" strokeWidth={2.5} />
          )}
        </div>

        <h2 id="shortcut-prompt-title" className="text-xl font-bold text-text-primary text-center mb-2">
          أضف اختصاراً على الشاشة الرئيسية
        </h2>
        <p className="text-sm text-text-secondary text-center mb-4">
          عشان تفتح اللوحة بسرعة من غير ما تحمّلها كتطبيق
        </p>

        <ol className="space-y-2 mb-6 text-sm text-text-primary">
          {STEPS[platform].map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-yellow text-text-primary text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>

        <button
          onClick={onDismiss}
          className="w-full py-3 rounded-xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary font-bold text-base transition-colors"
        >
          حسناً
        </button>
      </div>
    </div>
  );
}
