'use client';

import { Home, Share, X } from 'lucide-react';
import type { ShortcutAddResult, ShortcutPlatform } from '@/hooks/useShortcutPrompt';

interface ShortcutPromptProps {
  show: boolean;
  platform: ShortcutPlatform;
  adding?: boolean;
  addResult?: ShortcutAddResult | null;
  onAdd: () => void;
  onDismiss: () => void;
}

const STEPS: Record<ShortcutPlatform, string[]> = {
  ios: [
    'اضغط «إضافة الاختصار»',
    'من القائمة اختار «إضافة إلى الشاشة الرئيسية»',
    'اضغط إضافة',
  ],
  android: [
    'اضغط «إضافة الاختصار»',
    'من القائمة اختار «إضافة إلى الشاشة الرئيسية» لو ظهرت',
    'أو من ⋮ في المتصفح اختار إضافة إلى الشاشة الرئيسية — مش «تثبيت التطبيق»',
  ],
  desktop: [
    'اضغط «إضافة الاختصار» لمشاركة أو نسخ الرابط',
    'أو من قائمة المتصفح أنشئ اختصاراً',
    'لا تفعّل «فتح في نافذة»',
  ],
};

export function ShortcutPrompt({
  show,
  platform,
  adding = false,
  addResult = null,
  onAdd,
  onDismiss,
}: ShortcutPromptProps) {
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
          هيظهر كأيقونة على الشاشة، ويفتح في المتصفح — مش تطبيق
        </p>

        <ol className="space-y-2 mb-4 text-sm text-text-primary">
          {STEPS[platform].map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-yellow text-text-primary text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>

        {addResult === 'copied' && (
          <p className="mb-4 text-sm text-center text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
            تم نسخ الرابط. أضفه كاختصار من قائمة المتصفح ⋮
          </p>
        )}

        {addResult === 'unsupported' && (
          <p className="mb-4 text-sm text-center text-text-secondary">
            استخدم الخطوات فوق لإضافة الاختصار من المتصفح
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={onAdd}
            disabled={adding}
            className="w-full py-3 rounded-xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary font-bold text-base transition-colors disabled:opacity-60"
          >
            {adding ? 'جاري الإضافة...' : 'إضافة الاختصار'}
          </button>
          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-xl bg-white hover:bg-bg-card-hover text-text-secondary font-semibold text-base transition-colors"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
}
