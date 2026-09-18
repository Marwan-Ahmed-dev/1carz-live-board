'use client';

import { useCallback, useEffect, useState } from 'react';

export type ShortcutPlatform = 'ios' | 'android' | 'desktop';
export type ShortcutAddResult = 'shared' | 'copied' | 'cancelled' | 'unsupported';

const SEEN_KEY = '1carz_shortcut_prompt_seen_v2';

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

async function requestHomeShortcut(): Promise<ShortcutAddResult> {
  const url = `${window.location.origin}/`;
  const data: ShareData = {
    title: '1CARZ LIVE BOARD',
    text: 'لوحة العربيات الحية',
    url,
  };

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
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
      const result = await requestHomeShortcut();
      setAddResult(result);
      if (result === 'shared') {
        localStorage.setItem(SEEN_KEY, '1');
        setShowPrompt(false);
      }
      return result;
    } finally {
      setAdding(false);
    }
  }, []);

  return { showPrompt, platform, adding, addResult, addShortcut, dismissPrompt };
}
