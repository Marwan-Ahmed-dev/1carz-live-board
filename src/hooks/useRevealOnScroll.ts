'use client';

import { useEffect } from 'react';

/**
 * يفعّل كلاس is-in على عناصر .land-reveal عند دخول الـ viewport.
 * enabled=false يتخطى — مهم لأن محتوى اللاندينج بيتأخر لحد ما الـ auth يخلص.
 */
export function useRevealOnScroll(enabled = true, rootSelector = '.land-reveal') {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    let io: IntersectionObserver | null = null;
    let cancelled = false;

    const revealAll = (nodes: Element[]) => {
      nodes.forEach((n) => n.classList.add('is-in'));
    };

    const attach = () => {
      if (cancelled) return;
      const nodes = Array.from(document.querySelectorAll(rootSelector));
      if (nodes.length === 0) return false;

      if (typeof IntersectionObserver === 'undefined') {
        revealAll(nodes);
        return true;
      }

      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-in');
              io?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -5% 0px' }
      );

      nodes.forEach((n) => io!.observe(n));

      // أمان: لو حاجة فوق الفولد وما اشتغلتش، أظهرها بعد شوية
      window.setTimeout(() => {
        nodes.forEach((n) => {
          if (!n.classList.contains('is-in')) n.classList.add('is-in');
        });
      }, 1200);

      return true;
    };

    // جرّب فورًا، ولو الصفحة لسه بتتبنى أعد المحاولة فريمات
    if (!attach()) {
      let tries = 0;
      const tick = () => {
        if (cancelled) return;
        if (attach() || tries++ > 40) return;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    return () => {
      cancelled = true;
      io?.disconnect();
    };
  }, [enabled, rootSelector]);
}