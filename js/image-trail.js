/* ============================================================
   Image trail — vanilla port of the 21st.dev <ImageTrail> React
   component (framer-motion). Same options, same defaults, same
   motion; no React, no dependencies, so it fits this page's
   no-build setup and the single-file build.

   ImageTrail(container, {
     images: [{ src, alt }],        // cycled in order
     duration: 1000,                // ms an image stays before fading out
     spacing: 40,                   // px of cursor travel between images
     smoothness: 0.7,               // 0–1, scales the entry animation
     imageSize: 100, cornerRadius: 4, objectFit: 'cover',
     fadeInDuration: 0.3, fadeOutDuration: 0.5,   // seconds
     fadeInBlur: 0, fadeOutBlur: 5,               // px
     magneticEffect: false, magneticStrength: 0.3, magneticRadius: 100,
     maxTrailImages: 36,
     snap: { gap: 26, x: 1, y: 1 },  // optional: land each image's corner on a background dot
                                    // (dot grid gap and first dot's offset, px, relative to the container)
   }) → { destroy() }

   Differences from the React version, on purpose (it's a footer
   with a CTA in it, not a demo box):
   - Mouse only. The original calls preventDefault on touchmove,
     which would stop people scrolling past the footer on phones.
   - Images sit behind the content, so they never cover the button.
   - The cursor stays visible (the original hides it).
   - Only the next few images preload, not the whole set.
   ============================================================ */
(() => {
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function ImageTrail(container, o = {}) {
    const images = o.images || [];
    if (!container || !images.length) return { destroy() {} };

    const duration = Math.max(120, o.duration ?? 1000);
    const spacing = Math.max(4, o.spacing ?? 40);
    const smoothness = clamp(o.smoothness ?? 0.7, 0, 1);
    const size = Math.max(20, o.imageSize ?? 100);
    const radius = Math.max(0, o.cornerRadius ?? 4);
    const fit = o.objectFit ?? 'cover';
    const fadeIn = Math.max(0.05, o.fadeInDuration ?? 0.3);
    const fadeOut = Math.max(0.05, o.fadeOutDuration ?? 0.5);
    const blurIn = Math.max(0, o.fadeInBlur ?? 0);
    const blurOut = Math.max(0, o.fadeOutBlur ?? 5);
    const magnetic = !!o.magneticEffect;
    const magStrength = clamp(o.magneticStrength ?? 0.3, 0, 1);
    const magRadius = Math.max(20, o.magneticRadius ?? 100);
    const max = Math.max(1, o.maxTrailImages ?? 36);
    const snap = o.snap && o.snap.gap > 0 ? { gap: o.snap.gap, x: o.snap.x || 0, y: o.snap.y || 0 } : null;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const layer = document.createElement('div');
    layer.className = 'image-trail';
    layer.setAttribute('aria-hidden', 'true');
    container.prepend(layer);

    // Preload a few images ahead of the cursor instead of all of them up front.
    const warmed = new Set();
    const warm = from => {
      for (let k = 0; k < 6; k++) {
        const src = images[(from + k) % images.length].src;
        if (warmed.has(src)) continue;
        warmed.add(src);
        const im = new Image(); im.decoding = 'async'; im.src = src;
      }
    };
    warm(0);

    let last = null, index = 0, z = 0;
    const live = [];   // newest first: { el, x, y, timer }
    const ease = { out: 'cubic-bezier(0, 0, .58, 1)', in: 'cubic-bezier(.42, 0, 1, 1)' };   // framer easeOut / easeIn

    const remove = entry => {
      const i = live.indexOf(entry);
      if (i === -1) return;
      live.splice(i, 1);
      clearTimeout(entry.timer);
      const el = entry.el;
      if (reduce) {
        el.animate({ opacity: 0 }, { duration: 150, fill: 'forwards' }).onfinish = () => el.remove();
        return;
      }
      const d = smoothness * fadeIn * 0.8 * 1000;
      el.animate({ transform: 'scale(.5)', filter: `blur(${blurOut}px)` }, { duration: d, easing: ease.out, fill: 'forwards' });
      el.animate({ opacity: 0 }, { duration: fadeOut * 0.7 * 1000, easing: ease.in, fill: 'forwards' }).onfinish = () => el.remove();
    };

    let lastCell = '';
    const spawn = (x, y) => {
      if (snap) {
        // Move the image so its top-left corner sits on the nearest dot; skip if that cell was just used.
        const gx = Math.round((x - size / 2 - snap.x) / snap.gap) * snap.gap + snap.x;
        const gy = Math.round((y - size / 2 - snap.y) / snap.gap) * snap.gap + snap.y;
        const cell = gx + ',' + gy;
        if (cell === lastCell) return;
        lastCell = cell;
        x = gx + size / 2; y = gy + size / 2;
      }
      const img = images[index % images.length];
      index++;
      warm(index);

      const el = document.createElement('div');
      el.className = 'image-trail-item';
      el.style.cssText = `left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;z-index:${++z}`;
      const pic = document.createElement('img');
      pic.src = img.src; pic.alt = ''; pic.decoding = 'async'; pic.draggable = false;
      pic.style.cssText = `object-fit:${fit};border-radius:${radius}px`;
      el.append(pic);
      layer.append(el);

      if (reduce) {
        el.animate([{ opacity: 0 }, { opacity: 0.7 }], { duration: 150, fill: 'forwards' });
      } else {
        el.animate(
          [{ transform: 'scale(.8)', filter: `blur(${blurIn}px)` }, { transform: 'scale(1)', filter: 'blur(0px)' }],
          { duration: smoothness * fadeIn * 0.8 * 1000, easing: ease.out, fill: 'forwards' },
        );
      }

      const entry = { el, x, y };
      entry.timer = setTimeout(() => remove(entry), duration);
      live.unshift(entry);
      while (live.length > max) remove(live[live.length - 1]);
    };

    const pull = (mx, my) => {
      if (!magnetic || reduce) return;
      live.forEach(({ el, x, y }) => {
        const dx = mx - x, dy = my - y, dist = Math.hypot(dx, dy);
        const f = dist > magRadius ? 0 : (magRadius - dist) / magRadius;
        el.style.translate = `${dx * f * magStrength}px ${dy * f * magStrength}px`;
      });
    };

    const onMove = e => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const r = container.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      pull(x, y);
      if (last && Math.hypot(x - last.x, y - last.y) < spacing) return;
      last = { x, y };
      spawn(x, y);
    };
    const onLeave = () => { last = null; };

    container.addEventListener('pointermove', onMove, { passive: true });
    container.addEventListener('pointerleave', onLeave);

    return {
      destroy() {
        container.removeEventListener('pointermove', onMove);
        container.removeEventListener('pointerleave', onLeave);
        live.forEach(en => clearTimeout(en.timer));
        layer.remove();
      },
    };
  }

  window.ImageTrail = ImageTrail;
})();
