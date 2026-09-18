import type { Metadata, Viewport } from 'next';
import { Cairo, Inter } from 'next/font/google';
import { ToastProvider } from '@/hooks/useToast';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { ShortcutPromptHost } from '@/components/ShortcutPromptHost';
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
  manifest: '/manifest.json?v=6',
  applicationName: '1CARZ LIVE BOARD',
  appleWebApp: {
    capable: false,
    statusBarStyle: 'default',
    title: '1CARZ',
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
        <link rel="manifest" href="/manifest.json?v=6" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();});",
          }}
        />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* PWA: theme color for Android */}
        <meta name="theme-color" content="#FCD34D" />
        {/* PWA: Apple specific */}
        <meta name="apple-mobile-web-app-capable" content="no" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="1CARZ" />
      </head>
      <body className="font-arabic">
        <ServiceWorkerRegister />
        <ToastProvider>
          {children}
          <ShortcutPromptHost />
        </ToastProvider>
      </body>
    </html>
  );
}