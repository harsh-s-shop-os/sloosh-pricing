/* ============================================================
   Masonry — vanilla port of React Bits <Masonry /> (JS + CSS
   variant, gsap). Same layout maths, same props, same motion:
   shortest-column placement, items fly in from `animateFrom`
   with blur-to-focus and a stagger, re-flow with `ease` /
   `duration` on resize, scale on hover.

   Masonry(container, {
     items: [{ id, img, height | ratio, url? }],   // height: px, halved like the original; or ratio × column width
     card: { el, height, span, afterRows },// optional: one element spanning `span` centred columns, after
                                           // `afterRows` rows of images (full width at 2 columns or fewer; card.spanHeight sets its height there)
     columns: [[mq, n], ...], fallback: 1, // like the original useMedia (default 5/4/3/2/1)
     ease: 'power3.out', duration: 0.6, stagger: 0.05, animateFrom: 'bottom',
     scaleOnHover: true, hoverScale: 0.95, blurToFocus: true, colorShiftOnHover: false,
     startOnView: true,                    // wait until the grid scrolls into view before the entrance
     clipToShortest: false,                // end the grid at the shortest column (flat bottom, every column filled)
     onEnter: (el, delayMs, visible) => {}, // optional: called per image cell as its entrance starts; the cell has
                                           // .px-wait (picture hidden) until the page removes it
     limit: { 5: 20, 4: 16, 3: 12, 2: 10 }, // optional: images shown per column count (the rest are hidden)
   }) → { destroy() }

   Differences from the React version, on purpose:
   - `card`: the footer's CTA card sits in the grid as one of its cells, spanning the centre columns.
   - The entrance plays when the grid scrolls into view (it's a footer), not on page load.
   - Items with no url aren't clickable (the images are decoration here).
   - Reduced motion: no fly-in, blur or hover scale; items are placed straight away.
   ============================================================ */
(() => {
  const preload = urls => Promise.all(urls.map(src => new Promise(res => { const i = new Image(); i.onload = i.onerror = res; i.src = src; })));

  function Masonry(container, o = {}) {
    const gsap = window.gsap;
    const items = o.items || [];
    if (!container || !gsap) return { destroy() {} };
    const ease = o.ease ?? 'power3.out', duration = o.duration ?? 0.6, stagger = o.stagger ?? 0.05;
    const animateFrom = o.animateFrom ?? 'bottom';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scaleOnHover = (o.scaleOnHover ?? true) && !reduce, hoverScale = o.hoverScale ?? 0.95;
    const blurToFocus = (o.blurToFocus ?? true) && !reduce, colorShift = o.colorShiftOnHover ?? false;
    const rise = o.rise, blurPx = o.blur ?? 10, enterDur = o.enterDuration ?? 0.8, enterEase = o.enterEase ?? 'power3.out';   // rise: px below its spot (default: from below the viewport)
    const queries = o.columns || [['(min-width:1000px)', 5], ['(min-width:760px)', 4], ['(min-width:600px)', 3], ['(min-width:400px)', 2]];
    const cols = () => (queries.find(([q]) => matchMedia(q).matches) || [0, o.fallback ?? 1])[1];
    const limitFor = n => (o.limit && o.limit[n]) || Infinity;

    container.classList.add('mz-list');
    if (o.clipToShortest) container.style.overflow = 'hidden';
    // Build the cells once.
    const cells = items.map(it => {
      const w = document.createElement('div');
      w.className = 'mz-item'; w.dataset.key = it.id;
      // The picture sits on its own layer (.mz-pic) so it can wait, hidden, under a loader (o.onEnter) and fade in.
      w.innerHTML = `<div class="mz-img"><span class="mz-pic" style="background-image:url('${it.img}')"></span>${colorShift ? '<div class="mz-overlay"></div>' : ''}</div>`;
      if (o.onEnter) w.classList.add('px-wait');
      if (it.url) { w.style.cursor = 'pointer'; w.addEventListener('click', () => window.open(it.url, '_blank', 'noopener')); }
      if (scaleOnHover || colorShift) {
        w.addEventListener('mouseenter', () => {
          if (scaleOnHover) gsap.to(w, { scale: hoverScale, duration: 0.3, ease: 'power2.out' });
          if (colorShift) gsap.to(w.querySelector('.mz-overlay'), { opacity: 0.3, duration: 0.3 });
        });
        w.addEventListener('mouseleave', () => {
          if (scaleOnHover) gsap.to(w, { scale: 1, duration: 0.3, ease: 'power2.out' });
          if (colorShift) gsap.to(w.querySelector('.mz-overlay'), { opacity: 0, duration: 0.3 });
        });
      }
      container.append(w);
      return { ...it, el: w };
    });
    let cardCell = null;
    if (o.card && o.card.el) {
      const w = document.createElement('div');
      w.className = 'mz-item mz-card-cell';
      w.append(o.card.el);
      container.append(w);
      cardCell = { el: w, height: o.card.height, card: true };
    }

    // Original maths: column width = width / columns, item height = height / 2, shortest column first.
    // The card goes into the centre column once that column reaches the grid's vertical middle.
    // Original maths: column width = width / columns, item height = height / 2, shortest column first.
    // The card spans `card.span` centred columns (all of them at 2 columns or fewer) and is the second item in
    // those columns: one row of images goes in first (level across the spanned columns, so there's no gap under
    // the card), then the card, then the rest shortest-column-first as usual.
    const layout = () => {
      const n = cols(), width = container.clientWidth, cw = width / n;
      const lim = limitFor(n);
      cells.forEach((c, i) => { c.el.style.display = i < lim ? '' : 'none'; });
      const shown = cells.slice(0, lim);
      const hs = new Array(n).fill(0), out = [];
      const put = (c, k, h) => { out.push({ c, x: cw * k, y: hs[k], w: cw, h }); hs[k] += h; };
      const hOf = c => c.ratio ? cw * c.ratio : c.height / 2;   // ratio: height as a share of the column width (1 = square)
      if (!cardCell) {
        shown.forEach(c => put(c, hs.indexOf(Math.min(...hs)), hOf(c)));
        return { out, height: Math.max(...hs) };
      }
      const span = n <= 2 ? n : Math.min(o.card.span ?? 1, n);
      const first = Math.floor((n - span) / 2), cols_ = [...Array(span)].map((_, j) => first + j);
      const queue = shown.slice();
      // `card.afterRows` rows of images first (default 1), one image per column per row; in each row the spanned
      // columns share one height, so they end level and there's no gap above the card.
      for (let row = 0; row < (o.card.afterRows ?? 1); row++) {
        const lead = o.card.leadRatio != null ? cw * o.card.leadRatio : (queue.length ? hOf(queue[0]) : 0);   // leadRatio: fixed shape for the images above the card (1 = square)
        for (let k = 0; k < n && queue.length; k++) { const c = queue.shift(); put(c, k, cols_.includes(k) ? lead : hOf(c)); }
      }
      // The card, across the spanned columns.
      const y = Math.max(...cols_.map(k => hs[k]));
      const h = span === n && n <= 2 ? (o.card.spanHeight ?? cardCell.height) : cardCell.height;
      out.push({ c: cardCell, x: cw * first, y, w: cw * span, h });
      cols_.forEach(k => { hs[k] = y + h; });
      queue.forEach(c => put(c, hs.indexOf(Math.min(...hs)), hOf(c)));
      // clipToShortest: the grid ends where the shortest column ends, so every column still has images where the
      // bottom fade runs (the taller columns' overflow is cut off).
      return { out, height: o.clipToShortest ? Math.min(...hs) : Math.max(...hs) };
    };

    let mounted = false, started = !(o.startOnView ?? true), grid = null;
    const apply = () => {
      grid = layout();
      container.style.height = `${grid.height}px`;
      const rect = container.getBoundingClientRect();
      grid.out.forEach((g, i) => {
        const to = { x: g.x, y: g.y, width: g.w, height: g.h };
        if (!started) { gsap.set(g.c.el, { ...to, opacity: 0 }); return; }
        if (!mounted && !reduce) {
          let dir = animateFrom;
          if (dir === 'random') dir = ['top', 'bottom', 'left', 'right'][Math.floor(Math.random() * 4)];
          const from = rise != null ? { x: g.x, y: g.y + rise } : dir === 'top' ? { x: g.x, y: -200 } : dir === 'bottom' ? { x: g.x, y: window.innerHeight + 200 }
            : dir === 'left' ? { x: -200, y: g.y } : dir === 'right' ? { x: window.innerWidth + 200, y: g.y }
            : dir === 'center' ? { x: rect.width / 2 - g.w / 2, y: rect.height / 2 - g.h / 2 } : { x: g.x, y: g.y + 100 };
          gsap.fromTo(g.c.el,
            { opacity: 0, ...from, width: g.w, height: g.h, ...(blurToFocus && { filter: `blur(${blurPx}px)` }) },
            { opacity: 1, ...to, ...(blurToFocus && { filter: 'blur(0px)' }), duration: enterDur, ease: enterEase, delay: i * stagger });
          // onEnter(el, delayMs, visible): lets the page add its own loader on top, on the same stagger. Cells below
          // the clip line (clipToShortest) are never seen, so they skip it.
          if (o.onEnter && !g.c.card) o.onEnter(g.c.el, i * stagger * 1000, g.y < grid.height);
        } else if (!mounted) {
          gsap.set(g.c.el, { ...to, opacity: 1 });
          g.c.el.classList.remove('px-wait');
        } else {
          gsap.to(g.c.el, { ...to, duration, ease, overwrite: 'auto' });
        }
      });
      if (started) mounted = true;
    };

    let ro, io, alive = true;
    preload(cells.map(c => c.img)).then(() => {
      if (!alive) return;
      apply();
      ro = new ResizeObserver(() => { if (mounted || !started) apply(); });
      ro.observe(container);
      if (!started) {
        io = new IntersectionObserver(es => {
          if (!es.some(e => e.isIntersecting)) return;
          io.disconnect(); started = true; apply();
        }, { threshold: 0, rootMargin: '0px 0px -15% 0px' });   // starts once the grid's top is 15% into the viewport
        io.observe(container);
      }
    });
    return { destroy() { alive = false; ro && ro.disconnect(); io && io.disconnect(); } };
  }
  window.Masonry = Masonry;
})();
