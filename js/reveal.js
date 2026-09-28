/* ============================================================
   Reveal — the footer masonry's entrance (js/masonry.js), toned
   down and reused across the page.

   The masonry's recipe: rise into place + blur to focus + fade,
   one strong ease-out (gsap power3.out = easeOutQuart), 50ms
   stagger, played once when the block scrolls into view.
   Masonry: rises from below the viewport, 10px blur, 800ms.

   Here the same recipe is scaled by element size: the bigger the
   element, the shorter the rise and the lighter the blur (sizes
   in css/pricing.css → "Reveal"). Titles never animate.

   Reveal([{ sel, step, max, children: { sel, base, step } }])
   - sel:   elements to reveal (their size is set in css)
   - step:  stagger (ms) between elements entering together
   - onShow(el, delayMs): called as each element is revealed
   - children: also reveal these inside each element, starting
     `base` ms after it, `step` ms apart
   ============================================================ */
(() => {
  function Reveal(groups) {
    const root = document.documentElement;
    if (!('IntersectionObserver' in window)) { root.classList.remove('reveal-on'); return; }
    const show = (el, d) => { el.style.setProperty('--rd', `${Math.round(d)}ms`); el.classList.add('is-in'); };
    groups.forEach(g => {
      const els = [...document.querySelectorAll(g.sel)];
      if (!els.length) return;
      const io = new IntersectionObserver(entries => {
        // Everything that enters in the same frame shares one stagger, in page order.
        entries.filter(e => e.isIntersecting).map(e => e.target)
          .sort((a, b) => (a.compareDocumentPosition(b) & 4 ? -1 : 1))
          .forEach((el, i) => {
            io.unobserve(el);
            const d = Math.min(i * (g.step ?? 50), g.max ?? 400);
            show(el, d);
            if (g.onShow) g.onShow(el, d);
            if (g.children) el.querySelectorAll(g.children.sel).forEach((c, j) => show(c, d + (g.children.base ?? 120) + j * (g.children.step ?? 50)));
          });
      }, { rootMargin: '0px 0px -8% 0px' });
      els.forEach(el => io.observe(el));
    });
    root.classList.add('reveal-ready');
  }
  window.Reveal = Reveal;
})();
