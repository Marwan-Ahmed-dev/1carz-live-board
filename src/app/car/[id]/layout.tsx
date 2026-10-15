import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/site';

type Props = { params: { id: string }; children: React.ReactNode };

async function fetchCarMeta(id: string): Promise<{
  title: string;
  description: string;
  image?: string;
  price?: number;
} | null> {
  try {
    const { getAdminDb } = await import('@/lib/firebaseAdmin');
    const snap = await getAdminDb().collection('cars').doc(id).get();
    if (!snap.exists) return null;
    const d = snap.data() || {};
    return {
      title: typeof d.title === 'string' ? d.title : 'عربية',
      description: typeof d.description === 'string' ? d.description : '',
      image: typeof d.image_url === 'string' ? d.image_url : undefined,
      price: typeof d.price === 'number' ? d.price : undefined,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const car = await fetchCarMeta(params.id);
  const title = car?.title || 'تفاصيل العربية';
  const description =
    car?.description?.slice(0, 160) || `عرض ${title} على 1CARZ`;
  const url = `${SITE_URL}/car/${params.id}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: 'website',
      images: car?.image ? [{ url: car.image }] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function CarLayout({ params, children }: Props) {
  const car = await fetchCarMeta(params.id);
  const jsonLd = car
    ? {
        '@context': 'https://schema.org',
        '@type': 'Vehicle',
        name: car.title,
        description: car.description || undefined,
        image: car.image || undefined,
        offers: car.price
          ? {
              '@type': 'Offer',
              price: car.price,
              priceCurrency: 'EGP',
              availability: 'https://schema.org/InStock',
              url: `${SITE_URL}/car/${params.id}`,
            }
          : undefined,
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}