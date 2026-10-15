'use client';

import { useEffect } from 'react';

/** يفعّل كلاس is-in على عناصر .land-reveal عند دخول الـ viewport */
export function useRevealOnScroll(rootSelector = '.land-reveal') {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll(rootSelector));
    if (nodes.length === 0) return;

    if (typeof IntersectionObserver === 'undefined') {
      nodes.forEach((n) => n.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [rootSelector]);
}