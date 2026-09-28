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
  const CRITTERS = {
    creator: C.cat(94, 0) + C.parrot(175.27, 0),
    pro: C.mouse(26.5, 1) + C.cat(103, 0) + C.parrot(184, -1) + C.chicken(242.5, 0),
    max: C.mouse(-13.46, 3) + C.cat(63, -2) + C.parrot(144.52, -2) + C.chicken(202.88, 2) + C.dog(260.4, -1),
  };

  /* ---------- Plans ---------- */
  const tipHTML = p => {
    const n = c => fmt(Math.floor(p.credits / c));
    return `<p>${fmt(p.credits)} credits makes about</p><ul>
      <li><span>2K images</span><span>${n(COST.img2k)}</span></li>
      <li class="${p.id === 'creator' ? 'na' : ''}"><span>4K images</span><span>${p.id === 'creator' ? 'Pro and Max' : n(COST.img4k)}</span></li>
      <li><span>8-second videos</span><span>${n(COST.video8)}</span></li></ul>`;
  };
  const seatRowHTML = p => !p.seats ? '' : `
        <div class="seat-row" data-seats data-min="${p.seats.min}" data-max="${p.seats.max}">
          <div>
            <p class="label">Select Seats</p>
            <p class="seat-note" data-seat-note></p>
          </div>
          <div class="stepper">
            <button type="button" class="stepper-btn" data-step="-1" aria-label="Decrease seats">${I.minus}</button>
            <span class="stepper-val" data-seat-count>${p.seats.default}</span>
            <button type="button" class="stepper-btn" data-step="1" aria-label="Increase seats">${I.plus}</button>
          </div>
        </div>`;
  const planHTML = (p, i) => `
    <article class="plan${p.featured ? ' featured' : ''}" data-plan="${p.id}" style="--i:${i}">
      <div class="critters" aria-hidden="true">${STRIPES}${CRITTERS[p.critters] || ''}</div>
      <div class="plan-head">
        <div class="plan-title"><h2>${p.name}</h2>${p.featured ? '<span class="badge">Popular</span>' : ''}</div>
        <p class="plan-for">${p.for}</p>
        <p class="price">
          <span class="price-amt" data-amt>$${p.monthly}</span>
          <span class="price-per" data-per>${p.per}</span>
        </p>
        <p class="billed" data-billed aria-live="polite"></p>${seatRowHTML(p)}
        <a class="btn btn-md ${p.featured ? 'btn-brand' : 'btn-secondary'} plan-cta" href="${p.href}">${p.cta} ${I.arrow}</a>
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

  // Seat steppers: one per paid plan, clamped to that plan's own range
  $$('.seat-row', plansEl).forEach(row => {
    const min = +row.dataset.min, max = +row.dataset.max;
    const valEl = $('[data-seat-count]', row), noteEl = $('[data-seat-note]', row);
    const minusBtn = $('.stepper-btn[data-step="-1"]', row), plusBtn = $('.stepper-btn[data-step="1"]', row);
    let n = +valEl.textContent;
    const paint = () => {
      valEl.textContent = n;
      noteEl.textContent = max <= 1 ? 'Need a team? Pick Pro.' : n <= 1 ? 'Just you.' : `You + ${n - 1} teammate${n - 1 > 1 ? 's' : ''}`;
      minusBtn.disabled = n <= min; plusBtn.disabled = n >= max;
    };
    minusBtn.addEventListener('click', () => { if (n > min) { n--; paint(); } });
    plusBtn.addEventListener('click', () => { if (n < max) { n++; paint(); } });
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

  /* ---------- Enterprise ---------- */
  $('#enterprise').innerHTML = `
    <div>
      <p class="ent-eyebrow">${ENTERPRISE.eyebrow}</p>
      <h3>${ENTERPRISE.title}</h3>
      <p class="ent-body">${ENTERPRISE.body}</p>
    </div>
    <ul class="ent-items">${ENTERPRISE.items.map(i => `<li>${I.check}<span>${i}</span></li>`).join('')}</ul>
    <a class="btn btn-md btn-secondary" href="${ENTERPRISE.href}" target="_blank" rel="noopener">${ENTERPRISE.cta} ${I.arrow}</a>`;

  /* ---------- Segmented controls ---------- */
  function segmented(el, onChange) {
    const btns = $$('button', el);
    btns.forEach(b => b.addEventListener('click', () => {
      if (b.getAttribute('aria-pressed') === 'true') return;
      btns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      el.dataset.value = b.dataset.v; onChange(b.dataset.v);
    }));
  }

  /* ---------- Billing cycle ---------- */
  let cycle = 'monthly';
  function tween(el, from, to, prefix = '') {
    if (reduce || from === to) { el.textContent = prefix + fmt(to); return; }
    const t0 = performance.now(), d = 420;
    const f = t => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3);
      el.textContent = prefix + fmt(Math.round(from + (to - from) * e)); if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }
  function renderCycle() {
    PLANS.forEach(p => {
      const card = $(`[data-plan="${p.id}"]`, plansEl);
      const amt = $('[data-amt]', card), billed = $('[data-billed]', card);
      const from = +amt.textContent.replace(/\D/g, ''), to = p[cycle];
      tween(amt, from, to, '$');
      billed.innerHTML = cycle === 'annual'
        ? `$${fmt(p.annual * 12)} billed yearly · <b>save $${fmt((p.monthly - p.annual) * 12)}</b>`
        : '';
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
  function renderCosts(p) {
    $('#costs').innerHTML = COST_ROWS.map(r => {
      const locked = p.id === 'creator' && r.proOnly;
      const n = r.unit ? `≈ ${fmt(Math.floor(p.credits / r.cost))} seconds a month on ${p.name}` : `≈ ${fmt(Math.floor(p.credits / r.cost))} a month on ${p.name}`;
      return `<li class="cost${locked ? ' locked' : ''}">
        <span class="cost-ic">${I[r.icon]}</span>
        <span class="cost-what">${r.what}${r.unit ? `<small>${r.unit}</small>` : ''}</span>
        <span class="cost-cr">${r.cost} credits${locked ? '<small>Pro and Max</small>' : ''}</span>
        <span class="cost-n">${locked ? 'Not on Creator' : n}</span>
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
    $('#meter-fill').style.width = Math.min(100, pct) + '%';
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
      ${g.items.map(([q, a]) => `<details><summary>${q}<span class="pm">${I.plus}</span></summary><p>${a}</p></details>`).join('')}
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
