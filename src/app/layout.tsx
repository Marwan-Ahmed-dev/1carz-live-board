import type { Metadata, Viewport } from 'next';
import { Cairo, Inter } from 'next/font/google';
import { AppProviders } from '@/components/AppProviders';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import './globals.css';

// خط عربي: Cairo
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap',
});

// خط أرقام: Inter
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '1CARZ LIVE BOARD',
  description: 'لوحة العربيات الحية - 1CARZ',
  manifest: '/manifest.json?v=8',
  applicationName: '1CARZ LIVE BOARD',
  appleWebApp: {
    capable: false,
    statusBarStyle: 'default',
    title: '1CARZ',
  },
  icons: {
    icon: [{ url: '/favicon.png?v=8', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png?v=8', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#FCD34D',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${inter.variable}`}>
      <head>
        {/* PWA: ربط manifest */}
        <link rel="manifest" href="/manifest.json?v=8" />
        {/* ✅ L16 — preconnect to Firebase Auth + Storage origins to shave
            connection setup time off the first Firestore / Auth / Storage call. */}
        <link rel="preconnect" href="https://carz-live-board.firebaseapp.com" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="dns-prefetch" href="https://*.googleapis.com" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();});",
          }}
        />
        <link rel="icon" href="/favicon.png?v=8" type="image/png" />
        <link rel="shortcut icon" href="/favicon.ico?v=8" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=8" />
        {/* PWA: theme color for Android */}
        <meta name="theme-color" content="#FCD34D" />
        {/* PWA: Apple specific */}
        <meta name="apple-mobile-web-app-capable" content="no" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="1CARZ" />
      </head>
      <body className="font-arabic">
        <ServiceWorkerRegister />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}