'use client';

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' } | void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type PromptHolder = Window & {
  __1carzShortcutPrompt?: BeforeInstallPromptEvent | null;
};

const listeners = new Set<() => void>();
let deferred: BeforeInstallPromptEvent | null = null;
let capturing = false;

function holder(): PromptHolder | null {
  if (typeof window === 'undefined') return null;
  return window as PromptHolder;
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferred ?? holder()?.__1carzShortcutPrompt ?? null;
}

function setDeferred(event: BeforeInstallPromptEvent | null) {
  deferred = event;
  const w = holder();
  if (w) w.__1carzShortcutPrompt = event;
  listeners.forEach((fn) => fn());
}

export function subscribeInstallPrompt(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function captureInstallPrompt() {
  if (capturing || typeof window === 'undefined') return;
  capturing = true;

  const existing = holder()?.__1carzShortcutPrompt;
  if (existing) deferred = existing;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    setDeferred(e as BeforeInstallPromptEvent);
  });

  window.addEventListener('appinstalled', () => {
    setDeferred(null);
  });
}

function waitForPrompt(ms: number) {
  const existing = getDeferredInstallPrompt();
  if (existing) return Promise.resolve(existing);

  return new Promise<BeforeInstallPromptEvent | null>((resolve) => {
    const timer = window.setTimeout(() => {
      unsubscribe();
      resolve(getDeferredInstallPrompt());
    }, ms);
    const unsubscribe = subscribeInstallPrompt(() => {
      window.clearTimeout(timer);
      unsubscribe();
      resolve(getDeferredInstallPrompt());
    });
  });
}

export async function promptNativeHomeShortcut(): Promise<
  'accepted' | 'dismissed' | 'unavailable'
> {
  captureInstallPrompt();
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const event = ios ? getDeferredInstallPrompt() : await waitForPrompt(1800);
  if (!event?.prompt) return 'unavailable';

  setDeferred(null);
  await event.prompt();
  const choice = await event.userChoice;
  return choice.outcome;
}

if (typeof window !== 'undefined') {
  captureInstallPrompt();
}
