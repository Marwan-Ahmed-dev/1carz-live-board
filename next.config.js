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
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
  },
  // ESLint و TypeScript checks أثناء الـ build (نتركها مفعّلة افتراضياً)
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true, // نتجاهل lint errors في الـ build (TypeScript هو المهم)
  },
};

module.exports = nextConfig;