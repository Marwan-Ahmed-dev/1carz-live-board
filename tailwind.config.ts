import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ألوان الـ PWA الأساسية (Light theme)
        bg: {
          primary: '#FAF7F0',
          card: '#F2EFE5',
          'card-hover': '#EBE7DA',
        },
        accent: {
          yellow: '#FCD34D',
          'yellow-hover': '#FBBF24',
          soft: '#FEF3C7',
        },
        text: {
          primary: '#1A1A1A',
          secondary: '#4B5563',
          muted: '#6B7280',
        },
        border: {
          soft: '#E5E7EB',
          medium: '#D1D5DB',
        },
        // ألوان الـ Admin (Dark theme)
        admin: {
          bg: '#0F172A',
          card: '#1E293B',
          border: '#334155',
          text: '#F1F5F9',
          'text-muted': '#94A3B8',
          accent: '#FCD34D',
        },
        // أولويات العربيات (الألوان المرئية)
        priority: {
          top: '#FCD34D',
          high: '#FEF3C7',
          medium: '#F2EFE5',
          low: '#EBE7DA',
        },
      },
      fontFamily: {
        // خط عربي: Cairo
        arabic: ['var(--font-cairo)', 'sans-serif'],
        // خط أرقام: Inter
        numbers: ['var(--font-inter)', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0, 0, 0, 0.04)',
        medium: '0 4px 12px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;