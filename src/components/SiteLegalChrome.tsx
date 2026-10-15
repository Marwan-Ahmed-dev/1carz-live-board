import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';

/** Ø´Ø±ÙŠØ· ØªÙ†Ù‚Ù‘Ù„ Ø¨Ø³ÙŠØ· Ù„ØµÙØ­Ø§Øª Ø§Ù„Ø®ØµÙˆØµÙŠØ© ÙˆØ§Ù„Ø´Ø±ÙˆØ· */
export function SiteLegalChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border-soft/80 bg-bg-primary/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 font-extrabold text-text-primary">
            <BrandLogo size={36} />
            <span className="tracking-wide">1Carz</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm font-bold text-text-secondary">
            <Link href="/privacy" className="hover:text-text-primary transition-colors">
              Ø§Ù„Ø®ØµÙˆØµÙŠØ©
            </Link>
            <Link href="/terms" className="hover:text-text-primary transition-colors">
              Ø§Ù„Ø´Ø±ÙˆØ·
            </Link>
            <Link
              href="/cars"
              className="px-3 py-1.5 rounded-lg bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary transition-colors"
            >
              Ø§Ù„Ø¹Ø±Ø¨ÙŠØ§Øª
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border-soft py-6">
        <div className="max-w-3xl mx-auto px-4 flex flex-wrap items-center justify-center gap-4 text-sm font-bold text-text-secondary">
          <Link href="/privacy" className="hover:text-text-primary">
            Ø³ÙŠØ§Ø³Ø© Ø§Ù„Ø®ØµÙˆØµÙŠØ©
          </Link>
          <span className="text-border-medium">Â·</span>
          <Link href="/terms" className="hover:text-text-primary">
            Ø§Ù„Ø´Ø±ÙˆØ· ÙˆØ§Ù„Ø£Ø­ÙƒØ§Ù…
          </Link>
          <span className="text-border-medium">Â·</span>
          <Link href="/" className="hover:text-text-primary">
            Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©
          </Link>
        </div>
      </footer>
    </div>
  );
}
