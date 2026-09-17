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
