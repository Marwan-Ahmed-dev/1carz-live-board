import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';

/** شريط تنقّل بسيط لصفحات الخصوصية والشروط */
export function SiteLegalChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border-soft/80 bg-bg-primary/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 font-extrabold text-text-primary">
            <BrandLogo size={36} />
            <span className="tracking-wide">1CARZ</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm font-bold text-text-secondary">
            <Link href="/privacy" className="hover:text-text-primary transition-colors">
              الخصوصية
            </Link>
            <Link href="/terms" className="hover:text-text-primary transition-colors">
              الشروط
            </Link>
            <Link
              href="/cars"
              className="px-3 py-1.5 rounded-lg bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary transition-colors"
            >
              العربيات
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border-soft py-6">
        <div className="max-w-3xl mx-auto px-4 flex flex-wrap items-center justify-center gap-4 text-sm font-bold text-text-secondary">
          <Link href="/privacy" className="hover:text-text-primary">
            سياسة الخصوصية
          </Link>
          <span className="text-border-medium">·</span>
          <Link href="/terms" className="hover:text-text-primary">
            الشروط والأحكام
          </Link>
          <span className="text-border-medium">·</span>
          <Link href="/" className="hover:text-text-primary">
            الصفحة الرئيسية
          </Link>
        </div>
      </footer>
    </div>
  );
}