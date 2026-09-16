'use client';

// hook لإدارة PWA install prompt
// يستمع لحدث beforeinstallprompt ويخزّنه في state
// (هذا الـ event يُطلقه المتصفح مرة واحدة فقط)

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_install_dismissed_count';
const MAX_DISMISSES = 2;

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

  useEffect(() => {
    // تحقق إذا كان التطبيق في وضع standalone (مُثبت بالفعل)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-ignore
      window.navigator.standalone === true;
    setIsStandalone(standalone);

    // كشف iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // نتجاهل showPrompt لو التطبيق مُثبت
    if (standalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  /**
   * طلب التثبيت (للـ Android/Desktop)
   */
  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPrompt(false);
    return choice.outcome;
  };

  /**
   * عرض الـ prompt (مع احترام عدد مرات الرفض)
   */
  const triggerPrompt = () => {
    if (isStandalone) return; // مُثبت، لا تعرض
    const dismissed = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    if (dismissed >= MAX_DISMISSES) return;
    setShowPrompt(true);
  };

  /**
   * إغلاق الـ prompt
   */
  const dismissPrompt = () => {
    const current = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    localStorage.setItem(DISMISS_KEY, (current + 1).toString());
    setShowPrompt(false);
  };

  return {
    showPrompt,
    isIOS,
    isStandalone,
    canInstall: !!deferredPrompt,
    triggerPrompt,
    dismissPrompt,
    promptInstall,
  };
}