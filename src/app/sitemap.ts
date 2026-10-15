import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes = [
    '',
    '/cars',
    '/privacy',
    '/terms',
    '/3arabyatna',
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '' || path === '/cars' ? 'hourly' : 'weekly',
    priority: path === '' ? 1 : path === '/cars' ? 0.9 : 0.6,
  }));

  try {
    const { getAdminDb } = await import('@/lib/firebaseAdmin');
    const snap = await getAdminDb()
      .collection('cars')
      .orderBy('created_at', 'desc')
      .limit(200)
      .get();
    for (const doc of snap.docs) {
      const data = doc.data();
      const updated = data.updated_at?.toDate?.() || data.created_at?.toDate?.() || now;
      entries.push({
        url: `${SITE_URL}/car/${doc.id}`,
        lastModified: updated instanceof Date ? updated : now,
        changeFrequency: 'daily',
        priority: 0.8,
      });
    }
  } catch {
    // Build/runtime without admin credentials — static routes only
  }

  return entries;
}