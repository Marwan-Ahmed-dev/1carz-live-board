import type { MetadataRoute } from 'next';

/**
 * ✅ L21 — Dynamic sitemap for 1CARZ LIVE BOARD.
 *
 * Public routes only — admin/, api/, car/[id], buyers/* are intentionally
 * excluded (they need auth or are user-specific). Adjust `SITE_URL` if the
 * canonical domain changes.
 */
const SITE_URL = 'https://1carz-pwa.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    '',
    '/login',
    '/onboarding',
    '/cars',
    '/3arabyatna',
  ];

  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '' || path === '/cars' ? 'hourly' : 'daily',
    priority: path === '' ? 1.0 : path === '/cars' ? 0.9 : 0.7,
  }));
}