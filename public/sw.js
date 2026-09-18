/**
 * Service Worker for 1CARZ LIVE BOARD PWA
 *
 * Strategy:
 * - Network-first for navigation requests (HTML pages)
 * - Cache-first for static assets (JS, CSS, images)
 * - Network-only for manifest.json (avoid stale PWA install criteria)
 *
 * Caching version: v4 — bump to drop the old standalone/installable manifest.
 */

const STATIC_CACHE = '1carz-static-v4';
const RUNTIME_CACHE = '1carz-runtime-v4';

const STATIC_ASSETS = [
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/favicon.ico',
];

// install: pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // skip non-GET
  if (request.method !== 'GET') return;

  // skip cross-origin (Firebase APIs etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // don't intercept the image optimizer — downloads and gallery need a live response
  if (url.pathname === '/_next/image') {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request));
    return;
  }

  // never cache the manifest — an old standalone copy makes Chrome show "Install app"
  if (url.pathname === '/manifest.json') {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() => caches.match(request))
    );
    return;
  }

  // static assets: cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.ico'
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  // default: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// optional: skip waiting on user action
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});