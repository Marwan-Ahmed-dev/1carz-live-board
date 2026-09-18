'use client';

import { useCallback, useEffect, useState } from 'react';

export type ShortcutPlatform = 'ios' | 'android' | 'desktop';
export type ShortcutAddResult = 'shared' | 'cancelled' | 'unsupported';

const SEEN_KEY = '1carz_shortcut_prompt_seen_v4';

function isPhone(): boolean {
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (typeof uaData?.mobile === 'boolean') {
    return uaData.mobile;
  }

  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipod/.test(ua)) return true;
  // iPadOS 13+ reports as Macintosh with touch — not a phone
  if (/ipad/.test(ua) || (/macintosh/.test(ua) && 'ontouchend' in document)) return false;
  if (/android/.test(ua) && /mobile/.test(ua)) return true;
  return false;
}

function detectPlatform(): ShortcutPlatform {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function shareOnIos(): Promise<ShortcutAddResult> {
  const url = `${window.location.origin}/`;
  try {
    await navigator.share({
      title: '1CARZ LIVE BOARD',
      text: 'لوحة العربيات الحية',
      url,
    });
    return 'shared';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return 'cancelled';
    }
    return 'unsupported';
  }
}

export function useShortcutPrompt(enabled: boolean) {
  const [platform, setPlatform] = useState<ShortcutPlatform>('android');
  const [showPrompt, setShowPrompt] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<ShortcutAddResult | null>(null);

  useEffect(() => {
    if (!enabled) {
      setShowPrompt(false);
      return;
    }
    if (isStandaloneDisplay()) return;
    if (localStorage.getItem(SEEN_KEY) === '1') return;
    if (!isPhone()) {
      setShowPrompt(false);
      return;
    }

    setPlatform(detectPlatform());
    const t = window.setTimeout(() => setShowPrompt(true), 700);
    return () => window.clearTimeout(t);
  }, [enabled]);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(SEEN_KEY, '1');
    setShowPrompt(false);
  }, []);

  const addShortcut = useCallback(async () => {
    setAdding(true);
    setAddResult(null);
    try {
      // Never call beforeinstallprompt.prompt() — Chrome then installs a WebAPK app.
      const currentPlatform = detectPlatform();
      if (currentPlatform === 'ios' && typeof navigator.share === 'function') {
        const shared = await shareOnIos();
        setAddResult(shared);
        if (shared === 'shared') {
          localStorage.setItem(SEEN_KEY, '1');
          setShowPrompt(false);
        }
        return shared;
      }

      setAddResult('unsupported');
      return 'unsupported';
    } finally {
      setAdding(false);
    }
  }, []);

  return { showPrompt, platform, adding, addResult, addShortcut, dismissPrompt };
}
