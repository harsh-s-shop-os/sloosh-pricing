/* ============================================================
   Pixel load — the pixel shimmer from React Bits' <PixelCard />
   (JS + CSS variant), and nothing else from it: the Pixel class,
   its appear / shimmer / disappear maths and its colour variants
   are copied as-is. PixelCard plays it on hover; here it plays
   once, as a loader: dots grow out from the centre, shimmer, and
   shrink away as the images underneath fade in.

   PixelLoad(el, { variant, delay, speedUp, hold, onCovered }): see
   below. Used on every image tile in the plan cards.
   Reduced motion: no dots; onCovered fires after `delay`.
   ============================================================ */
(() => {
  // Copied from PixelCard (react-bits), unchanged.
  class Pixel {
    constructor(canvas, context, x, y, color, speed, delay) {
      this.width = canvas.width; this.height = canvas.height; this.ctx = context;
      this.x = x; this.y = y; this.color = color;
      this.speed = this.getRandomValue(0.1, 0.9) * speed;
      this.size = 0; this.sizeStep = Math.random() * 0.4;
      this.minSize = 0.5; this.maxSizeInteger = 2;
      this.maxSize = this.getRandomValue(this.minSize, this.maxSizeInteger);
      this.delay = delay; this.counter = 0;
      this.counterStep = Math.random() * 4 + (this.width + this.height) * 0.01;
      this.isIdle = false; this.isReverse = false; this.isShimmer = false;
    }
    getRandomValue(min, max) { return Math.random() * (max - min) + min; }
    draw() {
      const centerOffset = this.maxSizeInteger * 0.5 - this.size * 0.5;
      this.ctx.fillStyle = this.color;
      this.ctx.fillRect(this.x + centerOffset, this.y + centerOffset, this.size, this.size);
    }
    appear() {
      this.isIdle = false;
      if (this.counter <= this.delay) { this.counter += this.counterStep; return; }
      if (this.size >= this.maxSize) this.isShimmer = true;
      if (this.isShimmer) this.shimmer(); else this.size += this.sizeStep;
      this.draw();
    }
    disappear() {
      this.isShimmer = false; this.counter = 0;
      if (this.size <= 0) { this.isIdle = true; return; }
      this.size -= 0.1;
      this.draw();
    }
    shimmer() {
      if (this.size >= this.maxSize) this.isReverse = true;
      else if (this.size <= this.minSize) this.isReverse = false;
      this.size += this.isReverse ? -this.speed : this.speed;
    }
  }
  // PixelCard's variants (activeColor / noFocus dropped: they belong to its hover glow, which isn't used).
  const VARIANTS = {
    default: { gap: 5, speed: 35, colors: '#f8fafc,#f1f5f9,#cbd5e1' },
    blue: { gap: 10, speed: 25, colors: '#e0f2fe,#7dd3fc,#0ea5e9' },
    yellow: { gap: 3, speed: 20, colors: '#fef08a,#fde047,#eab308' },
    pink: { gap: 6, speed: 80, colors: '#fecdd3,#fda4af,#e11d48' },
  };
  const effectiveSpeed = v => (v <= 0 ? 0 : v >= 100 ? 0.1 : v * 0.001);   // PixelCard's getEffectiveSpeed

  /* One loop drives every tile, so a card with a hundred images is still a single requestAnimationFrame. */
  const jobs = new Set();
  let raf = 0, prev = 0;
  const frame = now => {
    raf = jobs.size ? requestAnimationFrame(frame) : 0;
    const passed = now - prev, step = 1000 / 60;   // PixelCard's 60fps cap
    if (passed < step) return;
    prev = now - (passed % step);
    for (const j of jobs) {
      if (now < j.start) continue;
      j.ctx.clearRect(0, 0, j.w, j.h);
      let allIdle = true, allOut = true;
      for (const p of j.px) {
        p[j.mode]();
        if (j.mode === 'disappear' && j.k > 1 && p.size > 0) p.size -= 0.1 * (j.k - 1);   // shrink faster too
        if (!p.isIdle) allIdle = false;
        if (p.size <= 0) allOut = false;
      }
      if (j.mode === 'appear' && allOut && !j.coveredAt) { j.coveredAt = now; j.onCovered(); }
      if (j.mode === 'appear' && j.coveredAt && now - j.coveredAt > j.hold) j.mode = 'disappear';
      if (j.mode === 'disappear' && allIdle) { jobs.delete(j); j.canvas.remove(); }
    }
  };

  /* PixelLoad(el, { variant, delay, speedUp, hold, onCovered })
     Puts a canvas over `el` (it must be positioned), grows PixelCard dots out from its centre, calls onCovered once
     every dot is out (show the image then), shimmers for `hold` ms, and shrinks the dots away. Dots keep PixelCard's
     size; a smaller element just gets fewer of them. */
  function PixelLoad(el, o = {}) {
    const onCovered = o.onCovered || (() => {});
    const delay = o.delay ?? 0;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setTimeout(onCovered, delay); return; }
    const cfg = VARIANTS[o.variant] || VARIANTS.default;
    const k = o.speedUp ?? 1;
    const w = Math.max(1, Math.round(el.clientWidth)), h = Math.max(1, Math.round(el.clientHeight));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const canvas = document.createElement('canvas');
    canvas.className = 'pixel-load'; canvas.setAttribute('aria-hidden', 'true');
    canvas.width = w * dpr; canvas.height = h * dpr;   // crisp dots on high-density screens
    el.append(canvas);
    const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
    const box = { width: w, height: h };   // Pixel reads the size from here (logical px, as in PixelCard)
    const colors = cfg.colors.split(','), px = [];
    for (let x = 0; x < w; x += cfg.gap) for (let y = 0; y < h; y += cfg.gap) {
      const p = new Pixel(box, ctx, x, y, colors[Math.floor(Math.random() * colors.length)], effectiveSpeed(cfg.speed), Math.hypot(x - w / 2, y - h / 2));
      p.counterStep *= k; p.sizeStep *= k;
      px.push(p);
    }
    jobs.add({ ctx, w, h, px, canvas, k, hold: o.hold ?? 260, onCovered, mode: 'appear', coveredAt: 0, start: performance.now() + delay });
    if (!raf) { prev = performance.now(); raf = requestAnimationFrame(frame); }
  }
  window.PixelLoad = PixelLoad;
})();
