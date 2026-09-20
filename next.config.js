/** @type {import('next').NextConfig} */

// ✅ L5/L6/L7 — Security headers (Low-priority batch)
// HSTS: 2 years + subdomains + preload-ready
// CSP: tight default; inline/eval allowed because Next.js dev runtime + styled-jsx need them
// nosniff + DENY framing + strict-origin referrer + minimal Permissions-Policy
const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // Firebase Storage + Google profile pics + Firebase Auth avatars
  "img-src 'self' data: blob: https://*.googleusercontent.com https://firebasestorage.googleapis.com https://*.firebasestorage.app https://storage.googleapis.com",
  "font-src 'self' data:",
  // Firebase Auth/Firestore/App Check + Storage uploads (incl. wss for legacy RTDB)
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://firebasestorage.googleapis.com https://*.firebasestorage.app https://identitytoolkit.googleapis.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "worker-src 'self' blob:",
].join('; ');

const SECURITY_HEADERS = [
  // HSTS — 2 years, include subdomains, eligible for the preload list
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // CSP — single source of truth, joined above
  { key: 'Content-Security-Policy', value: CSP_HEADER },
  // Prevent MIME sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Belt-and-suspenders framing protection (CSP frame-ancestors is the modern way)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Don't leak full URL on cross-origin nav
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable powerful APIs we don't use
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // نسمح بتحميل صور Firebase Storage و Firestore
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.firebasestorage.app',
      },
      {
        protocol: 'https',
        hostname: 'carz-live-board.firebasestorage.app',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
  },
  // ESLint و TypeScript checks أثناء الـ build
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true, // نتجاهل lint errors في الـ build (TypeScript هو المهم)
  },
  // firebase-admin → jwks-rsa → jose must load from node_modules, not the Next bundle
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin', 'jose', 'jwks-rsa'],
  },
  // L5/L6/L7 — security headers (HSTS, CSP, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ];
  },
  // ✅ تحسين سرعة الـ build
  // تفعيل SWC minify (أسرع من Terser الافتراضي)
  swcMinify: true,
  // تعطيل توليد source maps في الـ production لتوفير الوقت والمساحة
  productionBrowserSourceMaps: false,
  // ضغط الصور وتفعيل modern image formats
  compress: true,
  // ✅ تفعيل الـ static export (اختياري — لاستخدامه مع Firebase Hosting)
  // لاستخدامه: NEXT_EXPORT=1 npm run build
  // (التعليق هنا مهم لأن Vercel يحتاج Server-Side rendering)
  ...(process.env.NEXT_EXPORT === '1' && {
    output: 'export',
    images: {
      unoptimized: true,
      remotePatterns: [
        { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
        { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
        { protocol: 'https', hostname: 'storage.googleapis.com' },
      ],
    },
  }),
};

module.exports = nextConfig;
