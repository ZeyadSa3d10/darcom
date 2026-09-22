import { useLayoutEffect, useRef } from 'react';

// Observes matching descendants of the host element and reveals them on scroll
// (staggered). Uses the global .reveal/.revealed classes + --reveal-delay.
// Respects prefers-reduced-motion. Runs in layout phase to avoid a flash.
export function useRevealScope(selector = ':scope > section', deps = []) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const els = [...root.querySelectorAll(selector)];
    if (!els.length) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('revealed'));
      return undefined;
    }
    els.forEach((el, i) => {
      el.classList.add('reveal');
      el.style.setProperty('--reveal-delay', `${Math.min(i, 6) * 70}ms`);
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector, ...deps]);

  return ref;
}
