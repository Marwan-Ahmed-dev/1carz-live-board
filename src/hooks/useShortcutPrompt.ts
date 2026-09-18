'use client';

import { useCallback, useEffect, useState } from 'react';

export type ShortcutPlatform = 'ios' | 'android' | 'desktop';

const SEEN_KEY = '1carz_shortcut_prompt_seen';

function detectPlatform(): ShortcutPlatform {
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function useShortcutPrompt(enabled: boolean) {
  const [platform, setPlatform] = useState<ShortcutPlatform>('android');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setShowPrompt(false);
      return;
    }
    if (isStandaloneDisplay()) return;
    if (localStorage.getItem(SEEN_KEY) === '1') return;

    setPlatform(detectPlatform());
    const t = window.setTimeout(() => setShowPrompt(true), 700);
    return () => window.clearTimeout(t);
  }, [enabled]);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(SEEN_KEY, '1');
    setShowPrompt(false);
  }, []);

  return { showPrompt, platform, dismissPrompt };
}
