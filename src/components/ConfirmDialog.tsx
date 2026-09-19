'use client';

// Reusable confirmation dialog.
//
// Why this exists: native `window.confirm()` looks out of place on a
// styled Arabic RTL app and varies wildly between browsers/OSes. This
// component centralises the look + the Arabic copy so every destructive
// action (logout, delete car, delete user, delete group, run fix tool)
// gets the same UX.
//
// Usage:
//
//   const confirm = useConfirm();
//   if (!await confirm({ title: 'حذف', message: 'متأكد؟', variant: 'danger' })) return;
//
//   <ConfirmDialog {...confirm.dialogProps} />

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'default';

export interface ConfirmOptions {
  /** عنوان الحوار — سطر واحد قصير */
  title: string;
  /** نص السؤال أو التوضيح — يدعم أسطر متعددة */
  message: string;
  /** تأكيد / إلغاء */
  confirmLabel?: string;
  cancelLabel?: string;
  /** تأثير زر التأكيد */
  variant?: ConfirmVariant;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

interface UseConfirmApi {
  /** Promise<boolean> — true لو المستخدم اختار تأكيد */
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  /** نمرّرها للـ <ConfirmDialog> كـ props */
  dialogProps: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    variant: ConfirmVariant;
    onConfirm: () => void;
    onCancel: () => void;
  } | null;
}

const VARIANT_STYLES: Record<ConfirmVariant, { ring: string; btn: string; icon: string }> = {
  danger: {
    ring: 'bg-red-50 text-red-500',
    btn: 'bg-red-500 hover:bg-red-600 text-white',
    icon: 'text-red-500',
  },
  warning: {
    ring: 'bg-amber-50 text-amber-500',
    btn: 'bg-amber-500 hover:bg-amber-600 text-white',
    icon: 'text-amber-500',
  },
  default: {
    ring: 'bg-accent-yellow text-text-primary',
    btn: 'bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary',
    icon: 'text-text-primary',
  },
};

export function useConfirm(): UseConfirmApi {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (!pending) return;
    pending.resolve(true);
    setPending(null);
  }, [pending]);

  const handleCancel = useCallback(() => {
    if (!pending) return;
    pending.resolve(false);
    setPending(null);
  }, [pending]);

  const dialogProps = useMemo(() => {
    if (!pending) return null;
    return {
      open: true,
      title: pending.title,
      message: pending.message,
      confirmLabel: pending.confirmLabel ?? 'تأكيد',
      cancelLabel: pending.cancelLabel ?? 'إلغاء',
      variant: pending.variant ?? 'default',
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    };
  }, [pending, handleConfirm, handleCancel]);

  return { confirm, dialogProps };
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;
  const styles = VARIANT_STYLES[variant];

  const node = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
        if (e.key === 'Enter') onConfirm();
      }}
    >
      <div
        className="bg-bg-card w-full max-w-sm rounded-2xl p-5 sm:p-6 shadow-medium modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${styles.ring}`}
          >
            <AlertTriangle size={24} className={styles.icon} strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h2
              id="confirm-dialog-title"
              className="text-base font-bold text-text-primary leading-tight"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="إغلاق"
            className="flex-shrink-0 w-10 h-10 -m-1 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p
          id="confirm-dialog-message"
          className="text-sm text-text-secondary leading-relaxed mb-5 whitespace-pre-line"
        >
          {message}
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl font-bold text-sm transition-colors min-h-[48px] ${styles.btn}`}
            autoFocus
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl bg-white border border-border-medium text-text-secondary font-bold text-sm transition-colors hover:bg-bg-card-hover min-h-[48px]"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
