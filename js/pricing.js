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
  let cycle = 'monthly';
  const seatsBy = Object.fromEntries(PLANS.map(p => [p.id, p.seats ? p.seats.default : 1]));
  function renderPrice(p) {
    const card = document.querySelector(`[data-plan="${p.id}"]`);
    if (!card) return;
    const n = seatsBy[p.id] || 1, unit = p[cycle], total = unit * n;
    const amt = card.querySelector('[data-amt]');
    const from = +amt.querySelector('[data-cur]').textContent.replace(/\D/g, '');
    swapText(amt, '$' + fmt(total), total < from ? -1 : 1);
    // Two unbreakable chunks, so a narrow card wraps between them, never mid-phrase.
    card.querySelector('[data-per]').innerHTML = n > 1 ? `<span class="nw">per month</span> <span class="nw">· ${n} seats</span>` : p.per;
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
    mouse: (l, b) => `<div class="critter" style="left:${l}px;width:67.71px;height:60.61px;bottom:${b}px"><img alt="" src="${asset('pricing/mouse.svg')}" style="inset:0;width:100%;height:100%"></div>`,
    cat: (l, b) => `<div class="critter flip" style="left:${l}px;width:72px;height:72px;bottom:${b}px"><img alt="" src="${asset('pricing/cat.svg')}" style="inset:0;width:100%;height:100%"></div>`,
    parrot: (l, b) => `<div class="critter" style="left:${l}px;width:49.62px;height:57.21px;bottom:${b}px"><img alt="" src="${asset('pricing/parrot.svg')}" style="inset:0;width:100%;height:100%"></div>`,
    chicken: (l, b) => `<div class="critter flip" style="left:${l}px;width:48.9px;height:72px;bottom:${b}px"><img alt="" src="${asset('pricing/chicken.svg')}" style="inset:0;width:100%;height:100%"></div>`,
    dog: (l, b) => `<div class="critter dog" style="left:${l}px;width:72.67px;height:71.7px;bottom:${b}px">
        <img alt="" src="${asset('pricing/dog-body.svg')}" style="left:0;top:0;width:72.67px;height:71.7px">
        <img alt="" src="${asset('pricing/dog-eye-1.svg')}" style="left:26.5px;top:14.7px;width:8.2px;height:8.6px">
        <img alt="" src="${asset('pricing/dog-eye-2.svg')}" style="left:14.6px;top:12.1px;width:8.2px;height:8.7px">
        <img alt="" class="dog-pupil" src="${asset('pricing/dog-pupil-1.svg')}" style="left:26.8px;top:15.9px;width:5.48px;height:5.87px">
        <img alt="" class="dog-pupil" src="${asset('pricing/dog-pupil-2.svg')}" style="left:14.67px;top:13.3px;width:5.68px;height:5.87px">
      </div>`,
  };
  /* Each card's mascots sit in a group sized to its own extent and centred in
     the card, so they peek up in the middle whatever the card width. Offsets
     are the dev page's spacing, shifted so the group starts at 0. */
  const group = (w, html) => `<div class="critter-group" style="width:${w}px">${html}</div>`;
  const CRITTERS = {
    creator: group(130.89, C.cat(0, 0) + C.parrot(81.27, 0)),
    pro: group(264.9, C.mouse(0, 1) + C.cat(76.5, 0) + C.parrot(157.5, -1) + C.chicken(216, 0)),
    max: group(346.53, C.mouse(0, 3) + C.cat(76.46, -2) + C.parrot(157.98, -2) + C.chicken(216.34, 2) + C.dog(273.86, -1)),
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
          <div>
            <p class="label">Select Seats</p>
            <p class="seat-note" data-seat-note></p>
          </div>
          <div class="stepper">
            <button type="button" class="stepper-btn" data-step="-1" aria-label="Decrease seats">${I.minus}</button>
            <span class="stepper-val" data-seat-count aria-live="polite"><span data-cur>${p.seats.default}</span></span>
            <button type="button" class="stepper-btn" data-step="1" aria-label="Increase seats">${I.plus}</button>
          </div>
        </div>`;
  /* ---------- Plan visual ----------
     Rows of gradient "images" drifting left to right at the top of each card:
     1 row on Creator, 2 on Pro, 4 on Max. Rows stack up from the bottom of a
     fixed-height strip and fade out towards the card's top edge, so extra rows
     peek in from the top. Hovering a card speeds its rows up. */
  const TILE_GRADS = [
    ['--yellow-500', '--amber-400'], ['--yellow-100', '--yellow-500'], ['--yellow-400', '--yellow-700'],
    ['--amber-400', '--yellow-700'], ['--yellow-500', '--yellow-100'],
  ];
  const TILE_ANGLES = [135, 160, 200, 120, 45, 90, 225];
  const tileGrad = k => { const [a, b] = TILE_GRADS[(k * 7) % TILE_GRADS.length]; return `linear-gradient(${TILE_ANGLES[(k * 3) % TILE_ANGLES.length]}deg, hsl(var(${a})), hsl(var(${b})))`; };
  // Soft, dreamy Unsplash stills (aurora, milky way, sunset water, misty peaks, wildflowers) — picked to sit
  // quietly behind each plan's copy. Requested small (240px, q=60): these are background thumbnails, not hero art.
  const TILE_PHOTOS = [
    '1439853949127-fa647821eba0', '1502082553048-f009c37129b9', '1476514525535-07fb3b4ae5f1',
    '1505142468610-359e7d316be0', '1470770903676-69b98201ea1c', '1531366936337-7c912a4589a7',
    '1490750967868-88aa4486c946', '1483347756197-71ef80e95f73', '1419242902214-272b3f66ee7a',
    '1441260038675-7329ab4cc264', '1526772662000-3f88f10405ff', '1444464666168-49d633b86797',
    '1487730116645-74489c95b41b', '1518837695005-2083093ee35b', '1483086431886-3590a88317fe',
    '1441974231531-c6227db76b6e', '1541599468348-e96984315921', '1418065460487-3e41a6c84dc5',
    '1470071459604-3b5ec3a7fe05', '1445307806294-bff7f67ff225', '1519681393784-d120267933ba',
    '1470813740244-df37b8c1edcb', '1454496522488-7a8e488e8606', '1475924156734-496f6cac6ec1',
    '1447752875215-b2761acb3c5d', '1470252649378-9c29740c9fa8', '1444703686981-a3abbc4d4fe3',
    '1506905925346-21bda4d32df4', '1508739773434-c26b3d09e071', '1477346611705-65d1883cee1e',
    '1494548162494-384bba4ab999', '1476611317561-60117649dd94',
  ];
  const tileImg = k => {
    const id = TILE_PHOTOS[k % TILE_PHOTOS.length];
    // gradient first so it's what renders instantly; the photo layers on top once it loads, same as background-size below.
    return `background-image:url('https://images.unsplash.com/photo-${id}?w=240&h=240&fit=crop&q=60'),${tileGrad(k)}`;
  };
  const ROW_SIZES = [7, 9, 6, 8];   // unique images per row (5–10)
  const STRIP = 160, GAP = 8, SPEED = 20;
  const TILT = 18, PERSP = 600;
  // Share of the top row hidden behind the card's top edge. Creator's single row must fill the whole strip on
  // its own, so it hides less or its images get enormous.
  const PEEK = rows => (rows === 1 ? 0.2 : 0.35);   // per-row tilt (deg) and perspective depth (px) — mirrored in .pv-row   // strip height (px), gap (px), drift speed (px/s)
  const visualHTML = (p, planIndex) => {
    if (!p.rows) return '';
    // Square images sized so the rows exactly fill the strip: 1 row = big, 2 = medium, 4 = small.
    // Each row tilts back on its own (see .pv-row), which makes it look shorter. `slot` is the height a row
    // should look after the tilt; `size` is the real square size that tilts down to exactly that, so the rows
    // still fill the strip edge to edge: slot = size·cos·P / (P + size·sin).
    // The top row is cut off by the card's top edge (PEEK = share of it hidden), so it reads as peeking in.
    const slot = (STRIP - GAP * (p.rows - 1)) / (p.rows - PEEK(p.rows));
    const rad = TILT * Math.PI / 180, c = Math.cos(rad), sn = Math.sin(rad);
    const size = slot * PERSP / (c * PERSP - slot * sn);
    const rows = Array.from({ length: p.rows }, (_, i) => i).map(r => {
      const n = ROW_SIZES[(r + 4) % ROW_SIZES.length];
      const set = Array.from({ length: n }, (_, k) => `<span class="pv-img" style="${tileImg(k + r * 5 + planIndex * 13)}"></span>`).join('');
      const dur = (n * (size + GAP)) / SPEED * (r % 2 ? 1.15 : 1);   // same on-screen speed at any size
      // three copies of the set so the loop never shows a gap at any card width
      return `<div class="pv-row"><div class="pv-track" style="animation-duration:${dur.toFixed(2)}s">${set}${set}${set}</div></div>`;
    }).join('');
    return `<div class="plan-visual" style="--img:${size.toFixed(2)}px;--slot:${slot.toFixed(2)}px" aria-hidden="true"><div class="pv-lens">${rows}</div></div>`;
  };
  const planHTML = (p, i) => `
    <article class="plan${p.featured ? ' featured' : ''}" data-plan="${p.id}" style="--i:${i}">
      <div class="critters" aria-hidden="true">${STRIPES}${CRITTERS[p.critters] || ''}</div>
      <div class="plan-head">${visualHTML(p, i)}
        <div class="plan-intro">
          <div class="plan-title"><h2>${p.name}</h2>${p.featured ? '<span class="badge">Popular</span>' : ''}</div>
          <p class="plan-for">${p.for}</p>
        </div>
        <div class="plan-pricing">
          <p class="price">
            <span class="price-amt" data-amt><span data-cur>$${p.monthly}</span></span>
            <span class="price-per" data-per>${p.per}</span>
          </p>
          <p class="billed" data-billed aria-live="polite"></p>
        </div>
        <div class="plan-action">${seatRowHTML(p)}
          <a class="btn btn-md ${p.featured ? 'btn-brand' : 'btn-secondary'} plan-cta" href="${p.href}">${p.cta} ${I.arrow}</a>
        </div>
      </div>
      <div class="plan-body">
        <p class="credits-line"><span><strong data-credits="${p.credits}">${fmt(p.credits)}</strong> ${p.creditsLabel}</span>
          <button type="button" class="info" aria-label="What ${fmt(p.credits)} credits makes" aria-expanded="false">${I.info}<span class="tip" role="tooltip">${tipHTML(p)}</span></button>
        </p>
        ${p.eyebrow ? `<p class="eyebrow-sm">${p.eyebrow}</p>` : ''}
        <ul class="feats">${p.feats.map(f => `<li>${I.check}<span>${f}</span></li>`).join('')}</ul>
      </div>
    </article>`;
  const plansEl = $('#plans');
  plansEl.innerHTML = PLANS.map(planHTML).join('');

  // Plan visual: hovering (or keyboard focus inside) a card speeds its rows up;
  // playbackRate keeps each row's position, so the change is seamless.
  plansEl.querySelectorAll('.plan').forEach(card => {
    const rows = () => [...card.querySelectorAll('.pv-track')].flatMap(t => t.getAnimations());
    const speed = r => rows().forEach(a => a.updatePlaybackRate ? a.updatePlaybackRate(r) : (a.playbackRate = r));
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      card.addEventListener('mouseenter', () => speed(4));
      card.addEventListener('mouseleave', () => speed(1));
    }
    card.addEventListener('focusin', e => { if (e.target.matches(':focus-visible')) speed(4); });
    card.addEventListener('focusout', () => { if (!card.matches(':hover')) speed(1); });
  });

  // Seat steppers: one per paid plan, clamped to that plan's own range
  $$('.seat-row[data-seats]', plansEl).forEach(row => {
    const min = +row.dataset.min, max = +row.dataset.max;
    const plan = PLANS.find(x => x.id === row.closest('[data-plan]').dataset.plan);
    const valEl = $('[data-seat-count]', row), noteEl = $('[data-seat-note]', row);
    const minusBtn = $('.stepper-btn[data-step="-1"]', row), plusBtn = $('.stepper-btn[data-step="1"]', row);
    let n = +$('[data-cur]', valEl).textContent;
    const paint = (dir = 1) => {
      swapText(valEl, n, dir, 160);
      seatsBy[plan.id] = n; renderPrice(plan);
      noteEl.textContent = n <= 1 ? 'Just you.' : `You + ${n - 1} teammate${n - 1 > 1 ? 's' : ''}`;
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
    <thead><tr><th scope="col"><span class="th-label">Plans</span></th>${tablePlans.map((p, i) => `
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
  segmented($('#calc-plan'), v => { calcPlan = v; renderCalc(); });
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

  /* ---------- Closing critters ---------- */
  $('#closing-critters').innerHTML = C.mouse(0, 3) + C.cat(76, -2) + C.parrot(158, -2) + C.chicken(216, 2) + C.dog(273, -1);

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
})();
