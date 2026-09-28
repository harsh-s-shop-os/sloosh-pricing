/* ============================================================
   Peek — Sloosh animals (up to o.max at once, one per corner) peek into the footer card
   from a corner (top, bottom, left or right edge, never the middle
   third), shows 60–80% of itself, stays a few
   seconds with its eyes on the cursor, then ducks back out.

   Peek(card, { src: file => url, scale, max, edges })   // max: animals out at once (default 1); edges: allowed edges
   - card: the element the animals peek into (must clip overflow)
   - src:  resolves a public/pricing file name to a URL (the page's
           asset(), so the single-file build's data URIs work)

   The animal SVGs are inlined (fetched once) so their pupils can
   move. If the fetch fails (opening index.html from disk), they
   fall back to plain images: they still peek, eyes stay still.
   ============================================================ */
(() => {
  // Box sizes are the live page's (the SVGs are drawn tall and squashed to these boxes on purpose).
  const ANIMALS = [
    { name: 'mouse', w: 67.71, h: 60.61, file: 'mouse.svg' },
    { name: 'cat', w: 72, h: 72, file: 'cat.svg', flip: true },
    { name: 'parrot', w: 49.62, h: 57.21, file: 'parrot.svg' },
    { name: 'chicken', w: 48.9, h: 72, file: 'chicken.svg', flip: true },
    { name: 'dog', w: 72.67, h: 71.7, dog: true },
  ];
  const WHITE = /^(white|#fff(fff)?)$/i, BLACK = /^#0a0a0a$/i;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list, not) => { const l = list.filter(x => x !== not); return l[Math.floor(Math.random() * l.length)]; };
  const wait = ms => new Promise(r => setTimeout(r, ms));

  function Peek(card, o = {}) {
    const S = o.scale ?? 1.44;   // 120% of the previous 1.2
    const src = o.src || (f => f);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const layer = document.createElement('div');
    layer.className = 'peek-layer';
    (card.querySelector('.peek') || card).append(layer);

    let pointer = null, running = false, token = 0;
    const active = new Set();   // animals out right now (up to o.max)
    const MAX = Math.max(1, o.max ?? 1);
    const ALLOWED = o.edges || ['top', 'bottom', 'left', 'right'];   // edges animals may come in from

    /* ---------- build each animal once ---------- */
    const build = async a => {
      const slot = document.createElement('div');
      slot.className = 'peek-slot';
      slot.style.cssText = `width:${a.w * S}px;height:${a.h * S}px;visibility:hidden`;
      const body = document.createElement('div');
      body.className = 'peek-body';
      slot.append(body);
      layer.append(slot);
      a.slot = slot; a.body = body; a.eyes = [];

      if (a.dog) {
        // Same parts and positions as the page's dog (js/pricing.js → C.dog), scaled.
        const px = v => `${(v * S).toFixed(2)}px`;
        const img = (f, l, t, w, h, cls = '') => `<img alt="" ${cls && `class="${cls}"`} src="${src(f)}" style="left:${px(l)};top:${px(t)};width:${px(w)};height:${px(h)}">`;
        body.innerHTML =
          img('dog-body.svg', 0, 0, 72.67, 71.7) +
          img('dog-eye-1.svg', 26.5, 14.7, 8.2, 8.6, 'sclera') + img('dog-eye-2.svg', 14.6, 12.1, 8.2, 8.7, 'sclera') +
          img('dog-pupil-1.svg', 26.8, 15.9, 5.48, 5.87, 'pupil') + img('dog-pupil-2.svg', 14.67, 13.3, 5.68, 5.87, 'pupil');
        const sc = body.querySelectorAll('.sclera'), pu = body.querySelectorAll('.pupil');
        const m = (8.2 - 5.55) / 2 * 0.85 * S;   // travel (px), keeps the pupil inside the white
        a.eyes = [0, 1].map(i => ({ sclera: sc[i], mx: m, my: m, set: (x, y) => { pu[i].style.translate = `${x}px ${y}px`; } }));
        return;
      }

      try {
        const url = src(a.file);
        // The single-file build hands us data URIs: decode them directly (no fetch, so no CSP or file:// issues).
        const b64 = url.match(/^data:image\/svg\+xml;base64,(.*)$/);
        if (b64) body.innerHTML = new TextDecoder().decode(Uint8Array.from(atob(b64[1]), ch => ch.charCodeAt(0)));
        else { const res = await fetch(url); if (!res.ok) throw 0; body.innerHTML = await res.text(); }
        const svg = body.querySelector('svg');
        ['width', 'height', 'style'].forEach(k => svg.removeAttribute(k));
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
        if (a.flip) svg.classList.add('flip');
        const vb = svg.viewBox.baseVal, sx = a.w * S / vb.width, sy = a.h * S / vb.height;
        slot.style.visibility = '';   // getBBox needs it rendered (it's still hidden behind the card edge)
        const shapes = [...svg.querySelectorAll('path, ellipse, circle')];
        const whites = shapes.filter(n => WHITE.test(n.getAttribute('fill') || '')).map(n => ({ n, b: n.getBBox() }));
        shapes.filter(n => BLACK.test(n.getAttribute('fill') || '')).forEach(p => {
          const pb = p.getBBox(), cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
          const w = whites.find(({ b }) => cx > b.x && cx < b.x + b.width && cy > b.y && cy < b.y + b.height);
          if (!w) return;
          p.classList.add('pupil');
          const mx = (w.b.width - pb.width) / 2 * 0.85, my = (w.b.height - pb.height) / 2 * 0.85;   // viewBox units
          a.eyes.push({
            sclera: w.n, mx: mx * sx, my: my * sy,   // px, for direction/clamping
            set: (x, y) => { p.style.translate = `${(a.flip ? -x : x) / sx}px ${y / sy}px`; },
          });
        });
      } catch {
        body.innerHTML = `<img alt="" src="${src(a.file)}" style="inset:0;width:100%;height:100%"${a.flip ? ' class="flip"' : ''}>`;
      }
      slot.style.visibility = 'hidden';
    };

    /* ---------- eyes follow the cursor ---------- */
    let raf = 0;
    const look = () => {
      raf = 0;
      if (!active.size || !pointer || reduce) return;
      active.forEach(current => {
      const t = current.theta * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
      current.eyes.forEach(e => {
        const r = e.sclera.getBoundingClientRect();
        const dx = pointer.x - (r.left + r.width / 2), dy = pointer.y - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy) || 1;
        // screen direction → the animal's own frame (it may be rotated to face any edge)
        const lx = (dx * c + dy * s) / dist, ly = (-dx * s + dy * c) / dist;
        const k = Math.min(1, dist / 80);
        e.set(lx * e.mx * k, ly * e.my * k);
      });
      });
    };
    const onPointer = e => { pointer = { x: e.clientX, y: e.clientY }; if (!raf) raf = requestAnimationFrame(look); };
    addEventListener('pointermove', onPointer, { passive: true });

    /* ---------- one peek ---------- */
    const EDGES = { top: 180, bottom: 0, left: 90, right: -90 };
    // corner → which end of the edge: top/bottom edges use the corner's left/right, left/right edges its top/bottom
    const CORNER_EDGES = { tl: ['top', 'left'], tr: ['top', 'right'], bl: ['bottom', 'left'], br: ['bottom', 'right'] };
    const peekOnce = async (a, edge, corner) => {
      const W = card.clientWidth, H = card.clientHeight;
      const w = a.w * S, h = a.h * S, out = 2;   // anchor sits 2px past the edge so the feet never show
      // Corners only: a spot in the first or last third of the edge, never the middle third (it stays clear).
      // Each animal owns one corner while it's out, so several at once never overlap.
      const far = (edge === 'top' || edge === 'bottom') ? corner[1] === 'r' : corner[0] === 'b';
      const along = len => {
        const lo = w / 2 + 24, hi = Math.max(lo, len / 3 - w / 2);   // from the corner to the end of the first third
        const d = rand(lo, hi);
        return far ? len - d : d;
      };
      const [ax, ay] = edge === 'top' ? [along(W), -out] : edge === 'bottom' ? [along(W), H + out]
        : edge === 'left' ? [-out, along(H)] : [W + out, along(H)];
      a.theta = EDGES[edge];
      Object.assign(a.slot.style, { left: `${ax - w / 2}px`, top: `${ay - h}px`, transform: `rotate(${a.theta}deg)`, visibility: '' });
      a.eyes.forEach(e => e.set(0, 0));
      active.add(a); look();

      const hidden = `translateY(${h + 8}px)`;
      const rest = h * (1 - rand(0.6, 0.8));   // shows 60–80% of the animal
      const at = y => ({ transform: `translateY(${y.toFixed(1)}px)` });
      // Bouncy pop-in: overshoots past its resting spot by 18% of its height, dips back 6%, settles.
      const inKF = reduce ? [{ ...at(rest), opacity: 0 }, { ...at(rest), opacity: 1 }]
        : [{ ...at(h + 8), easing: 'cubic-bezier(.23, 1, .32, 1)' }, { ...at(rest - h * 0.18), offset: 0.45, easing: 'ease-in-out' },
           { ...at(rest + h * 0.06), offset: 0.72, easing: 'ease-in-out' }, { ...at(rest), offset: 1 }];
      // Out: a small hop up first, then drops out of sight.
      const outKF = reduce ? [{ ...at(rest), opacity: 1 }, { ...at(rest), opacity: 0 }]
        : [{ ...at(rest), easing: 'cubic-bezier(.33, 1, .68, 1)' }, { ...at(rest - h * 0.08), offset: 0.3, easing: 'cubic-bezier(.55, 0, .45, 1)' }, { ...at(h + 8), offset: 1 }];
      await a.body.animate(inKF, { duration: reduce ? 300 : 760, fill: 'forwards' }).finished;
      await wait(rand(2600, 4000));
      await a.body.animate(outKF, { duration: reduce ? 300 : 460, fill: 'forwards' }).finished;
      a.slot.style.visibility = 'hidden';
      active.delete(a);
    };

    const ready = Promise.all(ANIMALS.map(build));
    const flying = new Set();   // peeks in flight; a restarted loop waits for them, so animals never double up
    const loop = async my => {
      await ready;
      await Promise.all(flying);
      await wait(400);
      while (running && my === token) {
        if (flying.size < MAX) {
          const narrow = card.clientWidth < 480;   // narrow card: sides would hit the text
          const usedC = new Set([...flying].map(f => f.corner));
          const corners = Object.keys(CORNER_EDGES).filter(c => !usedC.has(c));
          const animals = ANIMALS.filter(x => ![...flying].some(f => f.a === x));
          if (corners.length && animals.length) {
            const corner = corners[Math.floor(Math.random() * corners.length)];
            const edges = CORNER_EDGES[corner].filter(e => ALLOWED.includes(e) && (!narrow || e === 'top' || e === 'bottom'));
            if (!edges.length) { await wait(300); continue; }
            const edge = edges[Math.floor(Math.random() * edges.length)];
            const a = animals[Math.floor(Math.random() * animals.length)];
            const f = peekOnce(a, edge, corner).finally(() => flying.delete(f));
            f.a = a; f.corner = corner;
            flying.add(f);
          }
          await wait(MAX > 1 ? rand(500, 1400) : 0);
        } else {
          await Promise.race(flying);
          await wait(rand(700, 1600));
        }
      }
    };
    const start = () => { if (running) return; running = true; loop(++token); };
    const stop = () => { running = false; };

    // Only run while the card is on screen and the tab is visible.
    let onScreen = false;
    const sync = () => (onScreen && !document.hidden ? start() : stop());
    new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; sync(); }, { threshold: 0.2 }).observe(card);
    document.addEventListener('visibilitychange', sync);
  }

  window.Peek = Peek;
})();
