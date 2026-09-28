/* ============================================================
   Sloosh pricing — behaviour
   Renders everything from window.PRICING (js/config.js).
   No framework, no build step.
   ============================================================ */
(() => {
  const { COST, PLANS, ENTERPRISE, COST_ROWS, COMPARE, FAQ } = window.PRICING;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => n.toLocaleString('en-US');
  // "per seat per month" → two lines, "per seat" / "per month"; "per month" stays one line.
  const perLines = t => t.split(/ (?=per )/).map(x => `<span class="nw">${x}</span>`).join(' ');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

  /* Number swap: the old value slides out and fades with a light blur while the
     new one slides in, in the direction of the change (up = value went up).
     Interruptible: a swap mid-flight drops the leaving copy and starts from the
     value on screen. Both copies share one grid cell, so nothing reflows. */
  function swapText(el, text, dir = 1, dur = 200) {
    const cur = el.querySelector('[data-cur]');
    if (!cur) { el.innerHTML = `<span data-cur>${text}</span>`; return; }
    if (cur.textContent === String(text)) return;
    el.querySelectorAll('[data-out]').forEach(n => n.remove());
    if (reduce) { cur.textContent = text; return; }
    const next = document.createElement('span');
    next.dataset.cur = ''; next.textContent = text;
    cur.removeAttribute('data-cur'); cur.dataset.out = ''; cur.setAttribute('aria-hidden', 'true');
    el.appendChild(next);
    const d = 8 * dir, opts = { duration: dur, easing: EASE_OUT, fill: 'both' };
    cur.animate([{ opacity: 1, transform: 'none', filter: 'blur(0)' },
                 { opacity: 0, transform: `translateY(${-d}px)`, filter: 'blur(2px)' }], opts)
       .finished.then(() => cur.remove(), () => {});
    next.animate([{ opacity: 0, transform: `translateY(${d}px)`, filter: 'blur(2px)' },
                  { opacity: 1, transform: 'none', filter: 'blur(0)' }], opts);
  }

  /* Count-up for the calculator total. One loop per element: a new call
     cancels the running one, so quick changes can't fight over the number. */
  const tweenFrames = new WeakMap();

  /* Pricing state: billing cycle + seats per plan. Seat plans are priced per
     seat, so the card shows the total for the chosen seats (same maths as
     dev.sloosh.ai/pricing): monthly = price x seats; annual = annual price x
     seats, billed x12. One seat keeps the "per seat per month" label. */
  let cycle = 'annual';   // annual is the default; the toggle in index.html starts on Annually too
  const seatsBy = Object.fromEntries(PLANS.map(p => [p.id, p.seats ? p.seats.default : 1]));
  function renderPrice(p) {
    const card = document.querySelector(`[data-plan="${p.id}"]`);
    if (!card) return;
    const n = seatsBy[p.id] || 1, unit = p[cycle], total = unit * n;
    const amt = card.querySelector('[data-amt]');
    const from = +amt.querySelector('[data-cur]').textContent.replace(/\D/g, '');
    swapText(amt, '$' + fmt(total), total < from ? -1 : 1);
    // Annual: the monthly price, struck through, sits before the discounted one.
    const was = card.querySelector('[data-was]');
    was.hidden = cycle !== 'annual';
    was.querySelector('[data-was-amt]').textContent = '$' + fmt(p.monthly * n);
    // Two stacked lines; the last one sits on the price's baseline (.price uses last-baseline alignment).
    card.querySelector('[data-per]').innerHTML = n > 1 ? `<span class="nw">per month</span> <span class="nw">for ${n} seats</span>` : perLines(p.per);
    card.querySelector('[data-billed]').innerHTML = cycle === 'annual'
      ? `$${fmt(p.annual * 12 * n)} billed yearly · <b>save $${fmt((p.monthly - p.annual) * 12 * n)}</b>`
      : '';
  }
  const ASSET = (window.PRICING_ASSETS || {});
  const asset = p => ASSET[p] || `public/${p}`;

  /* ---------- Icons (lucide, 1.5 stroke — same set the app uses) ---------- */
  const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
  const I = {
    check: svg('<path d="M20 6 9 17l-5-5"/>'),
    info: svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'),
    plus: svg('<path d="M5 12h14"/><path d="M12 5v14"/>'),
    minus: svg('<path d="M5 12h14"/>'),
    arrow: svg('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>', 'class="arrow" width="16" height="16"'),
    image: svg('<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>'),
    'image-hd': svg('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 9v6"/><path d="M11 9v6"/><path d="M7 12h4"/><path d="M14 9v6h1.5a2.5 2.5 0 0 0 0-5H14"/>'),
    upscale: svg('<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>'),
    edit: svg('<path d="M21.17 6.81a1 1 0 0 0-3.98-3.98L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/><path d="m15 5 4 4"/>'),
    video: svg('<path d="m16 13 5.22 3.48a.5.5 0 0 0 .78-.42V7.94a.5.5 0 0 0-.76-.43L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>'),
    film: svg('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>'),
    dash: '<span aria-label="Not included">—</span>',
  };

  /* Two highlight bars (thick + thin, 15px apart) that sweep bottom-to-top
     through the card on hover and exit past the top edge. Geometry from
     dev.sloosh.ai/pricing; length scales with the card (see .stripes). */
  const STRIPES = `
    <div class="stripes"><div class="stripe stripe-thick"></div><div class="stripe stripe-thin"></div></div>`;
  const C = {
    mouse: (l, b, g) => `<div class="critter" style="left:${l}px;width:67.71px;height:60.61px;bottom:${b}px"><img alt="" src="${asset(`pricing/mouse${g ? '-grey' : ''}.svg`)}" style="inset:0;width:100%;height:100%"></div>`,
    cat: (l, b, g) => `<div class="critter flip" style="left:${l}px;width:72px;height:72px;bottom:${b}px"><img alt="" src="${asset(`pricing/cat${g ? '-grey' : ''}.svg`)}" style="inset:0;width:100%;height:100%"></div>`,
    parrot: (l, b, g) => `<div class="critter" style="left:${l}px;width:49.62px;height:57.21px;bottom:${b}px"><img alt="" src="${asset(`pricing/parrot${g ? '-grey' : ''}.svg`)}" style="inset:0;width:100%;height:100%"></div>`,
    chicken: (l, b, g) => `<div class="critter flip" style="left:${l}px;width:48.9px;height:72px;bottom:${b}px"><img alt="" src="${asset(`pricing/chicken${g ? '-grey' : ''}.svg`)}" style="inset:0;width:100%;height:100%"></div>`,
    dog: (l, b, g) => `<div class="critter dog" style="left:${l}px;width:72.67px;height:71.7px;bottom:${b}px">
        <img alt="" src="${asset(`pricing/dog-body${g ? '-grey' : ''}.svg`)}" style="left:0;top:0;width:72.67px;height:71.7px">
        ${g ? `<img alt="" class="lid" src="${asset('pricing/dog-eye-1-lid.svg')}" style="left:26.5px;top:14.7px;width:8.2px;height:8.6px"><img alt="" class="lid" src="${asset('pricing/dog-eye-2-lid.svg')}" style="left:14.6px;top:12.1px;width:8.2px;height:8.7px">` : ''}
        <img alt="" src="${asset('pricing/dog-eye-1.svg')}" style="left:26.5px;top:14.7px;width:8.2px;height:8.6px">
        <img alt="" src="${asset('pricing/dog-eye-2.svg')}" style="left:14.6px;top:12.1px;width:8.2px;height:8.7px">
        <img alt="" class="dog-pupil" src="${asset('pricing/dog-pupil-1.svg')}" style="left:26.8px;top:15.9px;width:5.48px;height:5.87px">
        <img alt="" class="dog-pupil" src="${asset('pricing/dog-pupil-2.svg')}" style="left:14.67px;top:13.3px;width:5.68px;height:5.87px">
      </div>`,
  };
  /* Each card's mascots sit in a group sized to its own extent and centred in
     the card, so they peek up in the middle whatever the card width. Offsets
     are the dev page's spacing, shifted so the group starts at 0. */
  const group = (w, html, plan) => `<div class="critter-group" data-plan="${plan}" style="width:${w}px">${html}</div>`;
  // Grey (#525252) set for the credits calculator: the chosen plan's animals peek over the card's top edge.
  // Calculator set: animals laid out edge to edge with a fixed PEEK_GAP between their boxes, so they sit close without
  // touching (the live page's spacing is ~9px; PEEK_GAP tightens it). [name, width, bottom offset] per animal.
  const PEEK_GAP = 3;
  const W = { mouse: 67.71, cat: 72, parrot: 49.62, chicken: 48.9, dog: 72.67 };
  const row = (plan, list) => {
    let x = 0;
    const html = list.map(([n, b]) => { const h = C[n](x, b, 1); x += W[n] + PEEK_GAP; return h; }).join('');
    return group(x - PEEK_GAP, html, plan);
  };
  const CRITTERS = {
    creator: row('creator', [['cat', 0], ['parrot', 0]]),
    pro: row('pro', [['mouse', 1], ['cat', 0], ['parrot', -1], ['chicken', 0]]),
    max: row('max', [['mouse', 3], ['cat', -2], ['parrot', -2], ['chicken', 2], ['dog', -1]]),
  };

  /* ---------- Plans ---------- */
  const tipHTML = p => {
    const n = c => fmt(Math.floor(p.credits / c));
    return `<p>${fmt(p.credits)} credits makes about</p><ul>
      <li><span>2K images</span><span>${n(COST.img2k)}</span></li>
      <li class="${p.id === 'creator' ? 'na' : ''}"><span>4K images</span><span>${p.id === 'creator' ? 'Pro and Max' : n(COST.img4k)}</span></li>
      <li><span>8-second videos</span><span>${n(COST.video8)}</span></li></ul>`;
  };
  // Plans without seats get an empty spacer the height of the seat row, so
  // every card's CTA lines up across the row.
  const seatRowHTML = p => !p.seats ? '<div class="seat-spacer" aria-hidden="true"></div>' : `
        <div class="seat-row" data-seats data-min="${p.seats.min}" data-max="${p.seats.max}">
          <div class="stepper" role="group" aria-label="Seats">
            <button type="button" class="stepper-btn" data-step="-1" aria-label="Decrease seats">${I.minus}</button>
            <span class="stepper-read"><span class="stepper-val" data-seat-count aria-live="polite"><span data-cur>${p.seats.default}</span></span> <span class="stepper-unit" data-seat-unit>seat</span></span>
            <button type="button" class="stepper-btn" data-step="1" aria-label="Increase seats">${I.plus}</button>
          </div>
          <p class="seat-note" data-seat-note></p>
        </div>`;
  /* ---------- Plan visual ----------
     Rows of images drifting left to right at the top of each card:
     1 row on Creator, 2 on Pro, 4 on Max (PLANS[].rows). Rows stack up from the bottom of a
     fixed-height strip and fade out towards the card's top edge, so extra rows
     peek in from the top. Black and white; the whole card turns to colour on hover. */
  const TILE_GRADS = [
    ['--yellow-500', '--amber-400'], ['--yellow-100', '--yellow-500'], ['--yellow-400', '--yellow-700'],
    ['--amber-400', '--yellow-700'], ['--yellow-500', '--yellow-100'],
  ];
  const TILE_ANGLES = [135, 160, 200, 120, 45, 90, 225];
  const tileGrad = k => { const [a, b] = TILE_GRADS[(k * 7) % TILE_GRADS.length]; return `linear-gradient(${TILE_ANGLES[(k * 3) % TILE_ANGLES.length]}deg, hsl(var(${a})), hsl(var(${b})))`; };
  // 160 free 3D renders from lummi.ai (3D page, creator pages and 3D searches; Lummi Pro images skipped), 480px
  // square q72 jpg, saved as public/pricing/plan-lummi-001…160.jpg.
  const TILE_PHOTOS = Array.from({ length: 160 }, (_, i) => `lummi-${String(i + 1).padStart(3, '0')}`);
  // One shuffled deck per page load, dealt out card by card, row by row: no image appears twice on a card or on
  // two cards at once (the three cards need ~152 tiles between them; see perRow below).
  const DECK = TILE_PHOTOS.slice();
  for (let i = DECK.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [DECK[i], DECK[j]] = [DECK[j], DECK[i]]; }
  let dealt = 0;
  const draw = () => DECK[dealt++ % DECK.length];
  const tileImg = (id, k) =>
    // gradient first so it's what renders instantly; the local photo layers on top once it loads.
    `background-image:url('${asset(`pricing/plan-${id}.jpg`)}'),${tileGrad(k)}`;
  // Each row holds enough different images to span the widest card (560px when cards stack) plus the tilt's
  // overhang, so the loop never shows the same image twice in view.
  const MAX_CARD = 560;
  const STRIP = 160, GAP = 8, SPEED = 20;   // strip height (px), between the price and the credits (was 192)
  const TILT = 0, PERSP = 600;   // rows are slanted flat (css skewX), not tilted back, so no height correction
  // Share of the top row hidden behind the card's top edge. Creator's single row must fill the whole strip on
  // its own, so it hides less or its images get enormous.
  const PEEK = () => 0;   // no row is cut off any more: the rows are sized to fit the strip exactly (was 0.2 / 0.35 peeking in at the card's top edge)   // per-row tilt (deg) and perspective depth (px) — mirrored in .pv-row   // strip height (px), gap (px), drift speed (px/s)
  const visualHTML = (p, planIndex) => {
    if (!p.rows) return '';
    // Square images sized so the rows exactly fill the strip: 2 rows = big, 4 = medium, 6 = small.
    // Each row tilts back on its own (see .pv-row), which makes it look shorter. `slot` is the height a row
    // should look after the tilt; `size` is the real square size that tilts down to exactly that, so the rows
    // still fill the strip edge to edge: slot = size·cos·P / (P + size·sin).
    // The top row is cut off by the card's top edge (PEEK = share of it hidden), so it reads as peeking in.
    const slot = (STRIP - GAP * (p.rows - 1)) / (p.rows - PEEK(p.rows));
    const rad = TILT * Math.PI / 180, c = Math.cos(rad), sn = Math.sin(rad);
    const size = slot * PERSP / (c * PERSP - slot * sn);
    const rows = Array.from({ length: p.rows }, (_, i) => i).map(r => {
      const n = Math.ceil(MAX_CARD * 1.1 / (size + GAP)) + 1;
      const set = Array.from({ length: n }, (_, k) => `<span class="pv-img"><span class="pv-pic" style="${tileImg(draw(), k + r * 5 + planIndex * 13)}"></span></span>`).join('');
      const dur = (n * (size + GAP)) / SPEED * (r % 2 ? 1.15 : 1);   // same on-screen speed at any size
      // three copies of the set so the loop never shows a gap at any card width
      return `<div class="pv-row"><div class="pv-track" style="animation-duration:${dur.toFixed(2)}s">${set}${set}${set}</div></div>`;
    }).join('');
    return `<div class="plan-visual" style="--img:${size.toFixed(2)}px;--slot:${slot.toFixed(2)}px" aria-hidden="true"><div class="pv-lens">${rows}</div></div>`;
  };
  // Card order (final wireframe): title + subtitle, price, image rows + credits (8px apart, one group), seats + subscribe,
  // divider, features. Groups are 32px apart (.plan-head gap).
  const planHTML = (p, i) => `
    <article class="plan${p.featured ? ' featured' : ''}" data-plan="${p.id}" style="--i:${i}">
      <div class="critters" aria-hidden="true">${STRIPES}</div>
      <div class="plan-head">
        <div class="plan-intro">
          <div class="plan-title"><h2>${p.name}</h2>${p.featured ? '<span class="badge">Popular</span>' : ''}</div>
          <p class="plan-for">${p.for}</p>
        </div>
        <div class="plan-pricing">
          <p class="price">
            <s class="price-was" data-was${cycle === 'annual' ? '' : ' hidden'}><span class="sr-only">Was </span><span data-was-amt>$${p.monthly}</span></s>
            <span class="price-amt" data-amt><span data-cur>$${p[cycle]}</span></span>
            <span class="price-per" data-per>${perLines(p.per)}</span>
          </p>
          <p class="billed" data-billed aria-live="polite"></p>
        </div>
        <div class="plan-media">${visualHTML(p, i)}
          <p class="credits-line"><span><strong data-credits="${p.credits}">${fmt(p.credits)}</strong> ${p.creditsLabel}</span>
            <button type="button" class="info" aria-label="What ${fmt(p.credits)} credits makes" aria-expanded="false">${I.info}<span class="tip" role="tooltip">${tipHTML(p)}</span></button>
          </p>
        </div>
        <div class="plan-action">${seatRowHTML(p)}
          <a class="btn btn-md ${p.featured ? 'btn-brand' : 'btn-secondary'} plan-cta" href="${p.href}">${p.cta} ${I.arrow}</a>
        </div>
      </div>
      <div class="plan-body">
        ${p.eyebrow ? `<p class="eyebrow-sm">${p.eyebrow}</p>` : ''}
        <ul class="feats">${p.feats.map(f => `<li>${I.check}<span>${f}</span></li>`).join('')}</ul>
      </div>
    </article>`;
  const plansEl = $('#plans');
  plansEl.innerHTML = PLANS.map(planHTML).join('');

  // Plan visual: rows keep one speed whatever you do; hovering (or keyboard focus inside) a card turns all its
  // images from black and white to colour at once (css).

  // Plan images follow the cursor anywhere on the page, not just over a card: while a card's images are on screen,
  // every row slants towards the pointer, measured from that card. Pointer over the card's right half (or anywhere to
  // its right) leans right, left half / anywhere to its left leans left, straight up at the card's centre line; full
  // --slant (6 / 7 / 8deg) from the card's edge outwards. So with the pointer between two cards, they lean towards it
  // from both sides. When the pointer leaves the window the rows ease back to their resting slant (each leaning the
  // way it drifts). Eased per frame, like the kinetic gallery's spring. Mouse only; off under reduced motion.
  if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const slanters = [...plansEl.querySelectorAll('.plan')].map(card => {
      const rows = [...card.querySelectorAll('.pv-row')];
      if (!rows.length) return null;
      const strip = card.querySelector('.plan-visual');
      const max = () => parseFloat(getComputedStyle(card).getPropertyValue('--slant')) || 7;
      const rest = () => rows.map((_, i) => (i % 2 ? 1 : -1) * max());   // skewX: negative leans right
      const o = { card, rows, strip, max, rest, cur: rest(), target: null, visible: false };
      o.target = o.cur.slice();
      return o;
    }).filter(Boolean);
    let raf = 0, pointer = null;
    const aim = () => slanters.forEach(o => {
      if (!pointer) { o.target = o.rest(); return; }
      const b = o.card.getBoundingClientRect();
      const x = Math.min(1, Math.max(-1, (pointer - (b.left + b.width / 2)) / (b.width / 2)));   // -1 … 1
      o.target = o.rows.map(() => -x * o.max());
    });
    const tick = () => {
      let moving = false;
      slanters.forEach(o => {
        if (!o.visible) return;   // off-screen cards skip the work (they catch up when they come back)
        o.cur = o.cur.map((v, i) => {
          const n = v + (o.target[i] - v) * 0.12;
          if (Math.abs(o.target[i] - n) <= 0.01) return o.target[i];
          moving = true;
          return n;
        });
        o.rows.forEach((r, i) => { r.style.transform = `skewX(${o.cur[i].toFixed(2)}deg)`; });
      });
      raf = moving ? requestAnimationFrame(tick) : 0;
    };
    const go = () => { aim(); if (!raf) raf = requestAnimationFrame(tick); };
    addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { pointer = e.clientX; go(); } }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { pointer = null; go(); });   // pointer left the window
    addEventListener('blur', () => { pointer = null; go(); });
    const io = new IntersectionObserver(es => {
      es.forEach(en => { const o = slanters.find(s => s.strip === en.target); if (o) o.visible = en.isIntersecting; });
      go();
    });
    slanters.forEach(o => io.observe(o.strip || o.card));
  }

  // Seat steppers: one per paid plan, clamped to that plan's own range
  $$('.seat-row[data-seats]', plansEl).forEach(row => {
    const min = +row.dataset.min, max = +row.dataset.max;
    const plan = PLANS.find(x => x.id === row.closest('[data-plan]').dataset.plan);
    const valEl = $('[data-seat-count]', row), noteEl = $('[data-seat-note]', row), unitEl = $('[data-seat-unit]', row);
    const minusBtn = $('.stepper-btn[data-step="-1"]', row), plusBtn = $('.stepper-btn[data-step="1"]', row);
    let n = +$('[data-cur]', valEl).textContent;
    const paint = (dir = 1) => {
      swapText(valEl, n, dir, 160);
      seatsBy[plan.id] = n; renderPrice(plan);
      unitEl.textContent = n === 1 ? 'seat' : 'seats';
      // Two lines, like the stepper's height: "You and" / "2 teammates"; one seat is just "Just you".
      noteEl.innerHTML = n <= 1 ? '<span>Just you</span>'
        : `<span>You and</span><span>${n - 1} teammate${n - 1 > 1 ? 's' : ''}</span>`;
      minusBtn.disabled = n <= min; plusBtn.disabled = n >= max;
    };
    minusBtn.addEventListener('click', () => { if (n > min) { n--; paint(-1); } });
    plusBtn.addEventListener('click', () => { if (n < max) { n++; paint(1); } });
    paint();
  });

  // Tooltips: tap to toggle on touch, close on outside click / Esc
  $$('.info').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const open = b.getAttribute('aria-expanded') !== 'true';
    $$('.info').forEach(x => x.setAttribute('aria-expanded', 'false'));
    b.setAttribute('aria-expanded', String(open));
  }));
  document.addEventListener('click', () => $$('.info').forEach(x => x.setAttribute('aria-expanded', 'false')));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.info').forEach(x => x.setAttribute('aria-expanded', 'false')); });

  /* ---------- Enterprise ----------
     A fourth tier on the plans' own grid: its three columns line up with the
     three cards above (name + price under Creator, list under Pro, CTA under
     Max), using the same type and parts as a plan card. */
  $('#enterprise').innerHTML = `
    <div class="critters" aria-hidden="true">${STRIPES}</div>
    <div class="ent-col ent-info">
      <div class="plan-intro">
        <div class="plan-title"><h2>${ENTERPRISE.eyebrow}</h2></div>
        <p class="plan-for">${ENTERPRISE.body}</p>
      </div>
      <div class="plan-pricing"><p class="price"><span class="price-amt">${ENTERPRISE.title}</span></p></div>
    </div>
    <div class="ent-col ent-list">
      <p class="eyebrow-sm">${ENTERPRISE.itemsEyebrow}</p>
      <ul class="feats">${ENTERPRISE.items.map(i => `<li>${I.check}<span>${i}</span></li>`).join('')}</ul>
    </div>
    <div class="ent-col ent-cta">
      <a class="btn btn-md btn-secondary plan-cta" href="${ENTERPRISE.href}" target="_blank" rel="noopener">${ENTERPRISE.cta} ${I.arrow}</a>
    </div>`;

  /* ---------- Segmented controls ---------- */
  /* Segmented control with a highlight that slides to the chosen option.
     It takes its first position without animating (data-ready is set after
     the first paint), and re-measures on resize. */
  function segmented(el, onChange) {
    const btns = $$('button', el);
    const pill = document.createElement('span');
    pill.className = 'seg-pill'; pill.setAttribute('aria-hidden', 'true');
    el.prepend(pill);
    const place = () => {
      const b = btns.find(x => x.getAttribute('aria-pressed') === 'true') || btns[0];
      pill.style.width = b.offsetWidth + 'px';
      pill.style.transform = `translateX(${b.offsetLeft}px)`;
    };
    btns.forEach(b => b.addEventListener('click', () => {
      if (b.getAttribute('aria-pressed') === 'true') return;
      btns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      el.dataset.value = b.dataset.v; place(); onChange(b.dataset.v);
    }));
    place();
    addEventListener('resize', place);
    if (document.fonts) document.fonts.ready.then(place);
    requestAnimationFrame(() => requestAnimationFrame(() => el.setAttribute('data-ready', '')));
  }

  /* ---------- Billing cycle ---------- */
  function tween(el, from, to, prefix = '') {
    cancelAnimationFrame(tweenFrames.get(el));
    if (reduce || from === to) { el.textContent = prefix + fmt(to); return; }
    const t0 = performance.now(), d = 420;
    const f = () => { const k = Math.min(1, Math.max(0, (performance.now() - t0) / d)), e = 1 - Math.pow(1 - k, 3);
      el.textContent = prefix + fmt(Math.round(from + (to - from) * e));
      if (k < 1) tweenFrames.set(el, requestAnimationFrame(f)); };
    tweenFrames.set(el, requestAnimationFrame(f));
  }
  function renderCycle() {
    PLANS.forEach(p => {
      renderPrice(p);
      const th = $(`[data-price="${p.id}"]`);
      if (th) th.textContent = `$${p[cycle]} / ${p.perShort}${cycle === 'annual' ? ', billed yearly' : ''}`;
    });
  }
  segmented($('#cycle'), v => { cycle = v; renderCycle(); });

  /* ---------- Compare table ---------- */
  // One column per plan (creator/pro/max).
  const tablePlans = PLANS;
  const table = $('#table');
  const cell = v => v === true ? `<td class="yes">${I.check}</td>` : v === null ? `<td class="no">—</td>` : `<td>${v}</td>`;
  table.innerHTML = `
    <thead><tr><th scope="col"><span class="sr-only">Plans</span></th>${tablePlans.map((p, i) => `
      <th scope="col" data-col="${i + 1}" class="${p.featured ? 'featured-col' : ''}">${p.name}<small data-price="${p.id}">$${p.monthly} / ${p.perShort}</small>
        <a class="btn ${p.featured ? 'btn-brand' : 'btn-secondary'} th-cta" href="${p.href}">Choose ${p.name}</a></th>`).join('')}
    </tr></thead>
    <tbody>${COMPARE.map(g => `
      <tr class="group"><th colspan="4" scope="colgroup">${g.group}</th></tr>
      ${g.rows.map(r => `<tr><th scope="row">${r[0]}</th>${r.slice(1).map((v, i) => cell(v).replace('<td', `<td data-col="${i + 1}"`)).join('')}</tr>`).join('')}`).join('')}
    </tbody>`;
  $$('.yes svg', table).forEach(s => s.setAttribute('aria-label', 'Included'));
  // Column highlight: hover a column header, a cell, or a plan card above
  const setCol = c => c ? table.dataset.active = c : delete table.dataset.active;
  $$('[data-col]', table).forEach(td => {
    td.addEventListener('mouseenter', () => setCol(td.dataset.col));
    td.addEventListener('mouseleave', () => setCol(null));
  });
  $$('.plan', plansEl).forEach(card => {
    const idx = tablePlans.findIndex(x => x.id === card.dataset.plan);
    if (idx < 0) return;
    card.addEventListener('mouseenter', () => setCol(String(idx + 1)));
    card.addEventListener('mouseleave', () => setCol(null));
  });
  renderCycle();

  /* ---------- Credit calculator ---------- */
  let calcPlan = 'pro';
  const ids = ['img', '4k', 'vid'];
  const range = k => $('#m-' + k);
  const bigEl = $('#calc-credits');
  function paintRange(r) { r.style.setProperty('--p', (r.value - r.min) / (r.max - r.min) * 100 + '%'); }
  /* Every cost row has the same two-line structure on every plan (name +
     one sub-line, credits on one line), so switching plans never changes
     a row's height. A locked row says so in its sub-line. */
  function renderCosts(p) {
    $('#costs').innerHTML = COST_ROWS.map(r => {
      const locked = p.id === 'creator' && r.proOnly;
      const n = fmt(Math.floor(p.credits / r.cost));
      const sub = locked ? 'Pro and Max only' : r.perSecond ? `≈ ${n} seconds a month` : `≈ ${n} a month`;
      return `<li class="cost${locked ? ' locked' : ''}">
        <span class="cost-ic">${I[r.icon]}</span>
        <span class="cost-what">${r.what}</span>
        <span class="cost-cr">${r.cost} credits</span>
        <span class="cost-n">${sub}</span>
      </li>`;
    }).join('');
  }
  function renderCalc() {
    const p = PLANS.find(x => x.id === calcPlan);
    const prev = +bigEl.textContent.replace(/\D/g, '');
    tween(bigEl, prev, p.credits);
    $('#calc-credits-l').textContent = p.id === 'creator' ? 'credits a month' : 'credits a month, per seat';
    const r4k = range('4k'), locked = p.id === 'creator';
    r4k.disabled = locked; if (locked) r4k.value = 0;
    $('#slider-4k').classList.toggle('disabled', locked);
    $('#slider-4k .lock').hidden = !locked;
    const v = Object.fromEntries(ids.map(k => [k, +range(k).value]));
    ids.forEach(k => { $('#o-' + k).textContent = v[k]; paintRange(range(k)); });
    const used = v.img * COST.img2k + v['4k'] * COST.img4k + v.vid * COST.video8;
    const pct = Math.round(used / p.credits * 100), over = used > p.credits;
    $('#meter-fill').style.transform = `translateX(${Math.min(100, pct) - 100}%)`;
    $('.meter').classList.toggle('over', over);
    const l = $('#meter-l'); l.classList.toggle('over', over);
    l.innerHTML = over
      ? `Needs <b>${fmt(used)}</b> credits, ${fmt(used - p.credits)} over. Add a top-up or move up a plan.`
      : `Uses <b>${fmt(used)}</b> of ${fmt(p.credits)} credits (${pct}%). ${fmt(p.credits - used)} left.`;
    renderCosts(p);
  }
  const calcPeek = document.createElement('div');
  calcPeek.className = 'calc-peek'; calcPeek.setAttribute('aria-hidden', 'true');
  calcPeek.innerHTML = CRITTERS.creator + CRITTERS.pro + CRITTERS.max;
  $('.calc').appendChild(calcPeek);
  const peek = id => $$('.critter-group', calcPeek).forEach(g => g.toggleAttribute('data-on', g.dataset.plan === id));
  peek(calcPlan);
  segmented($('#calc-plan'), v => { calcPlan = v; renderCalc(); peek(v); });
  ids.forEach(k => range(k).addEventListener('input', renderCalc));
  renderCalc();

  /* ---------- FAQ ---------- */
  $('#faq-nav').innerHTML = FAQ.map((g, i) => `<a href="#f-${g.id}"${i === 0 ? ' aria-current="true"' : ''}>${g.title}</a>`).join('');
  $('#faq-list').innerHTML = FAQ.map(g => `
    <div class="faq-group" id="f-${g.id}">
      <h3>${g.title}</h3>
      ${g.items.map(([q, a]) => `<details><summary><span class="q">${q}</span><span class="pm" aria-hidden="true"><span class="pm-plus">${I.plus}</span><span class="pm-minus">${I.minus}</span></span></summary><p>${a}</p></details>`).join('')}
    </div>`).join('');
  $$('details').forEach(d => d.addEventListener('toggle', () => {
    if (d.open && !reduce) $('p', d).animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.16,1,.3,1)' });
  }));
  // Scroll-spy for the FAQ nav
  const navLinks = $$('#faq-nav a');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      navLinks.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + en.target.id)));
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  $$('.faq-group').forEach(g => spy.observe(g));

  /* ---------- Footer animals ---------- */
  /* Up to three animals at a time peek into the footer card, each from its own corner (js/peek.js). */
  if (window.Peek && $('.closing')) window.Peek($('.closing'), { src: f => asset(`pricing/${f}`), max: 3, edges: ['top', 'bottom'], scale: 1.1 });   // animals at 1.1× (were 1.44×)   // up to 3 at once, one per corner, top and bottom edges only (never the sides)

  /* ---------- Footer masonry ----------
     Replaces the image trail and dot grid. Up to 24 images from the Lummi pool, reshuffled, in a masonry grid (React Bits
     <Masonry /> port, js/masonry.js) that flies in when the footer scrolls into view. The CTA card (.closing, with
     the peeking animals) spans the three centre columns, after two rows of images. Heights vary so the columns stagger. */
  const mzEl = $('#masonry'), cardEl = $('.closing');
  // Same hover shine as the plan cards, behind the card's text.
  if (cardEl) cardEl.insertAdjacentHTML('afterbegin', `<div class="critters" aria-hidden="true">${STRIPES}</div>`);
  if (mzEl && window.Masonry) {
    const pool = TILE_PHOTOS.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const R = [1, 1.25, 1.5];   // square, 4:5 or 2:3 portrait, as a share of the column width (the photos are square, cropped to fit)
    window.Masonry(mzEl, {
      items: pool.slice(0, 48).map((id, i) => ({ id: `mz-${i}`, img: asset(`pricing/plan-${id}.jpg`), ratio: R[Math.floor(Math.random() * R.length)] })),
      card: { el: cardEl, height: 380, span: 2, afterRows: 2, leadRatio: 1, spanHeight: 280 },   // spans the 2 centre columns, after 2 rows of square images
      columns: [['(min-width:1000px)', 6], ['(min-width:600px)', 4], ['(min-width:0px)', 2]],   // 6 columns; 4 on tablets, 2 on phones (card stays centred)
      limit: { 6: 44, 4: 28, 2: 14 },   // ~6 more per column than before, so the shorter columns run past the fade
      clipToShortest: true,             // grid ends at the shortest column; the bottom fade (css) runs over filled columns
      ease: 'power3.out', duration: 0.6, stagger: 0.04, animateFrom: 'bottom',
      rise: 32, blur: 4, enterDuration: 0.7, enterEase: 'power3.out',   // entrance: 32px rise into place, 4px blur, 700ms (was: from below the viewport, 10px, 800ms)
      scaleOnHover: false, blurToFocus: true, colorShiftOnHover: false,   // no hover effect
      // Same pixel load as the plan-card images (js/pixel-load.js), white dots, on each image's own entrance stagger.
      onEnter: (el, delay, visible) => {
        const show = () => el.classList.remove('px-wait');
        if (!visible || !window.PixelLoad) return show();
        window.PixelLoad(el.querySelector('.mz-img'), { variant: 'default', delay: delay + 60 + Math.random() * 120, speedUp: 1.6, hold: 120, onCovered: show });
      },
    });
  }

  /* ---------- Eyes that follow the cursor (logo + dog) ---------- */
  const pupils = $$('.logo .pupil');
  const logoSvg = $('.logo svg');
  addEventListener('pointermove', e => {
    if (reduce) return;
    const r = logoSvg.getBoundingClientRect(), scale = 2276 / r.width;
    pupils.forEach(p => {
      const cx = +p.getAttribute('cx'), cy = +p.getAttribute('cy');
      const px = r.left + cx / scale, py = r.top + cy / scale;
      const dx = e.clientX - px, dy = e.clientY - py, a = Math.atan2(dy, dx);
      const m = Math.min(120, Math.hypot(dx, dy) * scale / 6);
      p.style.transform = `translate(${Math.cos(a) * m}px, ${Math.sin(a) * m}px)`;
    });
  }, { passive: true });
  /* ---------- Gallery ----------
     Full-bleed visual break between the compare table and the FAQ: two rows of
     the plan-card images at a much bigger size, drifting in opposite directions.
     Same pool as the cards (TILE_PHOTOS); swap for real Spacelab work before shipping. */
  const galEl = $('#gal');
  if (galEl) {
    const GAL = TILE_PHOTOS.slice(0, 17);   // the gallery keeps its original 17 images
    const half = Math.ceil(GAL.length / 2);
    const sets = [GAL.slice(0, half), GAL.slice(half)];
    const rowHTML = (ids, r) => {
      const set = ids.map(id => `<span class="gal-img" style="background-image:url('${asset(`pricing/plan-${id}.jpg`)}')"></span>`).join('');
      return `<div class="gal-row gal-row-${r + 1}"><div class="gal-track" style="animation-duration:${(ids.length * 9 + r * 8)}s">${set}${set}${set}</div></div>`;
    };
    // One row, above the FAQ (the second row below the FAQ was removed).
    galEl.innerHTML = rowHTML(sets[0], 0);
  }
  /* ---------- Reveal on scroll (js/reveal.js) ----------
     The footer masonry's entrance, toned down by size, everywhere except the plan cards (pixel load, below). */
  if (window.Reveal) window.Reveal([
    // Plan cards fade in (no rise, no blur), 80ms apart. Every image tile inside loads under its own PixelCard shimmer
    // (js/pixel-load.js): yellow dots on Pro, white on the others; bottom row first, tiles a little apart.
    { sel: '.plan', step: 80, onShow: (card, d) => {
      const strip = card.querySelector('.plan-visual');
      if (!strip) return;
      const variant = card.classList.contains('featured') ? 'yellow' : 'default';
      const sr = strip.getBoundingClientRect();
      card.querySelectorAll('.pv-row').forEach((row, r) => {
        // Staggered row entrance (restored): bottom row first, 130ms apart; each row rises in with a light blur.
        const rowDelay = d + 160 + r * 130;
        row.style.setProperty('--rd', `${rowDelay}ms`);
        row.classList.add('is-in');
        row.querySelectorAll('.pv-img').forEach(tile => {
          const show = () => tile.classList.add('px-in');
          const t = tile.getBoundingClientRect();
          const inView = t.right > sr.left && t.left < sr.right && t.bottom > sr.top && t.top < sr.bottom;
          if (!inView || !window.PixelLoad) return show();   // off-strip copies of the loop just appear
          window.PixelLoad(tile, { variant, delay: rowDelay + Math.random() * 120, speedUp: 1.6, hold: 120, onCovered: show });
        });
      });
    } },
    { sel: '.enterprise' },
    { sel: '.calc', children: { sel: '.calc-panel, .costs', base: 120, step: 80 } },   // the card rises first, then its halves
    { sel: '.table-wrap' },
    { sel: '.gal-row', step: 90 },
    { sel: '.faq-nav, #faq-list details', step: 90, max: 1000 },   // slower: 90ms apart (was 40), up to 1s
  ]);
  else document.documentElement.classList.remove('reveal-on');

})();
