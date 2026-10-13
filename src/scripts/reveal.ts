/**
 * Dezente Scroll-Reveals für [data-reveal].
 * Nur Elemente, die beim Laden unterhalb des Viewports liegen, werden versteckt –
 * dadurch kein Flackern sichtbarer Inhalte. Respektiert prefers-reduced-motion.
 */
export function initReveal(): void {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (!els.length || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        const delay = Number(el.dataset.revealDelay ?? 0);
        window.setTimeout(() => {
          el.classList.add('reveal-in');
          el.classList.remove('reveal-pending');
        }, delay);
        io.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );

  const vh = window.innerHeight;
  for (const el of els) {
    if (el.getBoundingClientRect().top < vh * 0.92) continue;
    el.classList.add('reveal-pending');
    io.observe(el);
  }
}
