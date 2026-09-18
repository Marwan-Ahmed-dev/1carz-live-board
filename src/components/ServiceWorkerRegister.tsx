'use client';

import { useEffect } from 'react';
import { captureInstallPrompt } from '@/lib/nativeHomeShortcut';

export function ServiceWorkerRegister() {
  useEffect(() => {
    captureInstallPrompt();

    let cancelled = false;
    let refreshing = false;

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      const onControllerChange = () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          if (cancelled) return;
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          void reg.update();
        })
        .catch((err) => {
          console.error('Service worker registration failed:', err);
        });

      return () => {
        cancelled = true;
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      };
    }

    return undefined;
  }, []);
  return null;
}
