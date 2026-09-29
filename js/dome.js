/* ============================================================
   Dome — vanilla port of React Bits' DomeGallery (JS + CSS
   variant). Two shapes:
   - 'bowl' (default): you look at the inside of a sphere, so the
     middle sits back and tiles grow towards the left and right
     edges (they run off the strip before they can distort).
   - 'globe': a convex sphere seen from outside, sized so its
     silhouette is wider than the strip (`overscan`).
   Only a band around the equator is tiled.

   Dome(el, {
     shape: 'bowl',        // or 'globe'
     rows: 4,              // tile rows in the band
     image: i => css,      // background for tile i (called once per tile, cached across rebuilds)
     repeatHalf: true,     // back half repeats the front half, so no image is ever on screen twice
     speed: 6,             // auto-spin, deg/s (0 = off; off under reduced motion)
     gap: 6,               // minimum px between tiles at the front
     gapRatio: 0,          // or this share of each tile's pitch, whichever is bigger
     overscan: 1.3,        // silhouette width ÷ strip width (>1: globe edges hidden beyond the strip)
     maxTilt: 5,           // deg of vertical drag, as in the original (maxVerticalRotationDeg)
   }) → { setSpeed(multiplier), destroy() }

   Kept from the original: drag to spin with inertia, small
   vertical tilt, rounded tiles, grayscale (colour on hover, via
   CSS). Left out: click-to-enlarge viewer, scroll lock, the
   blur/edge overlays (they'd hide the tiles at the card's edges).
   ============================================================ */
(() => {
  const PERSP = 2.5;   // viewer distance, in radii from the globe's front surface
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function Dome(el, o = {}) {
    const rows = Math.max(1, o.rows ?? 4);
    const gap = o.gap ?? 6;
    const maxTilt = o.maxTilt ?? 5;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const baseSpeed = reduce ? 0 : (o.speed ?? 6);
    const cache = [];
    const bg = i => (cache[i] ??= o.image ? o.image(i) : '');

    el.classList.add('dome');
    const stage = document.createElement('div'); stage.className = 'dome-stage';
    const sphere = document.createElement('div'); sphere.className = 'dome-sphere';
    stage.append(sphere); el.append(stage);

    const bowl = (o.shape ?? 'bowl') === 'bowl';
    const dir = bowl ? -1 : 1;   // inside a bowl the front moves the other way, so drags and spin flip to match
    // Bowl: viewer sits BOWL_K radii in front of the back wall, inside the sphere. At the strip's side edges tiles
    // are BOWL_EDGE times their size in the middle.
    const BOWL_K = 0.7, BOWL_EDGE = 1.6, HIDE = 58;   // HIDE: columns past this angle are off-strip, skip them
    let r = 0, rotY = 0, rotX = 0, mult = 1, vel = 0, dragging = false, W = 0, colEls = [], colAng = [];
    const wrap = d => ((d % 360) + 540) % 360 - 180;
    const apply = () => {
      sphere.style.transform = `translateZ(${bowl ? r : -r}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      if (!bowl) return;
      for (let c = 0; c < colEls.length; c++) {
        const on = Math.abs(wrap(colAng[c] + rotY)) < HIDE;
        if (colEls[c]._on !== on) { colEls[c]._on = on; colEls[c].style.visibility = on ? '' : 'hidden'; }
      }
    };

    const build = () => {
      W = el.clientWidth; const H = el.clientHeight;
      if (!W || !H) return;
      let half;
      if (bowl) {
        // Solve for the radius that puts BOWL_EDGE magnification exactly at the strip's side edge.
        const edge = Math.acos(1 - (BOWL_K - BOWL_K / BOWL_EDGE));
        r = (W / 2) / (Math.sin(edge) * BOWL_EDGE);
        half = Math.asin(clamp((H - 16) / 1.35 / 2 / r, 0.05, 0.95));   // band grows towards the sides; leave room
      } else {
        // Silhouette of a sphere seen from PERSP·r in front of it: radius r·k on the front plane.
        const k = PERSP / Math.sqrt(PERSP * PERSP + 2 * PERSP);
        r = (W / 2) / k * (o.overscan ?? 1.3);
        half = Math.asin(clamp((H - 16) / 2 / r, 0.05, 0.95));
      }
      const step = (2 * half) / rows;                                  // one tile's angle (rad), square tiles
      let cols = Math.max(6, Math.round((2 * Math.PI) / step));
      if (o.repeatHalf !== false && cols % 2) cols++;                  // even, so the halves match up
      const dLon = 360 / cols, dLat = step * 180 / Math.PI;
      const pitch = 2 * r * Math.tan(step / 2);                        // one tile + its gap, at the front
      const side = pitch - Math.max(gap, pitch * (o.gapRatio ?? 0));   // gap: at least `gap` px, or gapRatio of the pitch
      el.style.setProperty('--tile-r', `${Math.min(8, side * 0.14).toFixed(1)}px`);   // small tiles keep square-ish corners
      el.style.perspective = `${(bowl ? BOWL_K : PERSP) * r}px`;
      stage.style.top = bowl ? `${H / 2}px` : `${H - 8 - r * Math.sin(half)}px`;
      el.style.perspectiveOrigin = `50% ${stage.style.top}`;
      const perCycle = o.repeatHalf === false ? cols : cols / 2;
      const z = bowl ? -r : r;   // bowl tiles sit on the far wall, facing in
      let html = '';
      for (let c = 0; c < cols; c++) {
        html += `<div class="dome-col" style="transform:rotateY(${(c * dLon).toFixed(3)}deg)">`;
        for (let j = 0; j < rows; j++) {
          const lat = (j - (rows - 1) / 2) * dLat;
          const idx = (c % perCycle) * rows + j;
          html += `<div class="dome-tile" style="width:${side.toFixed(2)}px;height:${side.toFixed(2)}px;` +
            `margin:${(-side / 2).toFixed(2)}px 0 0 ${(-side / 2).toFixed(2)}px;` +
            `transform:rotateX(${(bowl ? -lat : lat).toFixed(3)}deg) translateZ(${z.toFixed(2)}px)">` +
            `<span style="${bg(idx)}"></span></div>`;
        }
        html += '</div>';
      }
      sphere.innerHTML = html;
      colEls = [...sphere.children]; colAng = colEls.map((_, c) => c * dLon);
      apply();
    };

    /* ---------- spin, drag, inertia ---------- */
    let last = performance.now(), raf = 0, visible = false;
    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!dragging) {
        if (Math.abs(vel) > 0.01) { rotY += vel * dt; vel *= Math.pow(0.04, dt); }   // inertia, decays in ~1s
        else vel = 0;
        rotY += baseSpeed * mult * dt * dir;
        rotX *= Math.pow(0.1, dt);   // tilt eases back to level
      }
      apply();
      raf = visible ? requestAnimationFrame(tick) : 0;
    };
    const run = () => { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(tick); } };

    let sx = 0, sy = 0, sRotY = 0, sRotX = 0, lx = 0, lt = 0, id = null;
    const down = e => {
      if (e.button > 0) return;
      dragging = true; id = e.pointerId; vel = 0;
      sx = lx = e.clientX; sy = e.clientY; sRotY = rotY; sRotX = rotX; lt = performance.now();
      el.setPointerCapture?.(id);
      el.classList.add('is-dragging');
    };
    const move = e => {
      if (!dragging || e.pointerId !== id) return;
      const deg = 180 / Math.PI / r;   // the tile under the pointer stays under it
      rotY = sRotY + (e.clientX - sx) * deg * dir;
      rotX = clamp(sRotX - (e.clientY - sy) * deg, -maxTilt, maxTilt);
      const now = performance.now(), dt = (now - lt) / 1000;
      if (dt > 0) vel = vel * 0.6 + ((e.clientX - lx) * deg * dir / dt) * 0.4;
      lx = e.clientX; lt = now;
    };
    const up = e => {
      if (!dragging || e.pointerId !== id) return;
      dragging = false; id = null;
      if (performance.now() - lt > 80) vel = 0;   // pointer stopped before letting go: no fling
      vel = clamp(vel, -360, 360);
      el.classList.remove('is-dragging');
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);

    let lastW = 0;
    const ro = new ResizeObserver(() => { if (el.clientWidth !== lastW) { lastW = el.clientWidth; build(); } });
    ro.observe(el);
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; run(); });
    io.observe(el);
    build();

    return {
      setSpeed(m) { mult = m; },
      destroy() { ro.disconnect(); io.disconnect(); cancelAnimationFrame(raf); stage.remove(); },
    };
  }

  window.Dome = Dome;
})();
