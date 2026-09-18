'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    const blockAppInstall = (e: Event) => {
      e.preventDefault();
    };
    window.addEventListener('beforeinstallprompt', blockAppInstall);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
        console.error('Service worker registration failed:', err);
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', blockAppInstall);
    };
  }, []);
  return null;
}