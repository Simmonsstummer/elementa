/* Elementa — detail panel: element and isotope */
'use strict';
App.panel = (() => {
  const P = $('#panel'), body = $('#panel-body'), tabsEl = $('#panel-tabs'), title = $('#panel-title');
  let stack = [], cur = null, atomView = null, atomMode = 'bohr', isoAll = false, sim = null;
  const TABS = ['overview', 'atom', 'iso', 'history', 'data'];
  const lc = e => nm(e).toLowerCase();

  function open() { P.classList.add('open'); P.setAttribute('aria-hidden', 'false'); }
  function close() { P.classList.remove('open', 'full'); P.setAttribute('aria-hidden', 'true'); stack = []; cur = null; stopAll(); }
  function stopAll() { if (sim) { sim.stop(); sim = null; } }
  function show(state, push = true) {
    if (push && cur) stack.push(cur);
    cur = state; stopAll(); render(); open();
    $('#panel-back').hidden = !stack.length;
  }
  function openElement(z, tab = 'overview') { stack = []; cur = null; show({ type: 'el', z, tab }, false); }
  function openIsotope(z, a, fresh) { if (fresh) { stack = []; cur = null; } show({ type: 'iso', z, a }, !fresh); }
  function back() { if (!stack.length) return; cur = stack.pop(); stopAll(); render(); $('#panel-back').hidden = !stack.length; }
  function rerender() { if (cur) { stopAll(); const top = body.scrollTop; render(); body.scrollTop = top; } }

  function render() {
    body.scrollTop = 0; body.innerHTML = ''; tabsEl.innerHTML = '';
    if (cur.type === 'el') {
      const e = App.E[cur.z - 1]; P.style.setProperty('--c', catVar(e.sr));
      title.innerHTML = `<span class="mono muted">${e.z}</span>&nbsp; ${nm(e)}`;
      tabsEl.hidden = false;
      TABS.forEach(k => tabsEl.appendChild(h('button', { class: 'ptab' + (cur.tab === k ? ' active' : ''), onclick: () => { cur.tab = k; stopAll(); render(); } }, k === 'iso' ? `${t('tab.' + k)} <span class="muted">${e.iso.length}</span>` : t('tab.' + k))));
      ({ overview, atom: atomTab, iso: isoTab, history, data })[cur.tab](e);
    } else {
      tabsEl.hidden = true; const iso = findIso(cur.z, cur.a); const e = App.E[cur.z - 1];
      P.style.setProperty('--c', catVar(e.sr));
      title.innerHTML = `${nm(e)}-${iso.a}`;
      isoDetail(iso, e);
    }
  }

  /* ---------- overview ---------- */
  function hero(e) {
    const st = stateAt(e, 293.15), rad = !isotopesOf(e.z).some(i => i.stable), other = App.lang === 'it' ? 'en' : 'it';
    return `<div class="hero"><div class="hero-tile" style="--c:${catVar(e.sr)}"><span class="z">${e.z}</span><span class="sym">${e.s}</span><span class="ms">${fmtMass(e.m)}</span></div>
      <div><h1>${nm(e)}</h1><div class="en">${e.tx[other].n} · ${e.s}</div><div class="chips">
      <span class="chip c" style="--c:${catVar(e.sr)}">${catName(e.sr)}</span>
      ${st ? `<span class="chip">${t('p.stateAt20', stateName(st))}</span>` : ''}
      ${rad ? `<span class="chip" style="color:#f2c94c">☢ ${t('p.radioactive')}</span>` : ''}</div></div></div>`;
  }
  function photoHTML(e) {
    if (!e.img) return `<div class="photo-none" style="--c:${catVar(e.sr)}"><div><b>${e.s}</b>${t('p.noPhoto', lc(e))}</div></div>`;
    const c = e.cr, lic = c.l === 'PD' ? t('p.pd') : `<a href="${c.lu}" target="_blank" rel="noopener">${c.l}</a>`;
    return `<figure class="photo-card"><img src="img/${e.z}.jpg" alt="${esc(tx(e).pc)}" loading="lazy"><figcaption>${esc(tx(e).pc)}
      <small>${t('p.photo')}: <a href="${c.src}" target="_blank" rel="noopener">${esc(c.a)}</a> · ${lic}</small></figcaption></figure>`;
  }
  function overview(e) {
    const st = stateAt(e, 293.15), T = tx(e);
    body.innerHTML = hero(e) + photoHTML(e) + `
      <div class="card fun"><h3>✨ ${t('p.didYouKnow')}</h3><p>${esc(T.cu)}</p></div>
      <div class="sec-title">🧺 ${t('p.foundIn')}</div>
      <div class="found">${T.ct.map(([em, n, d]) => `<div><span class="em">${em}</span><b>${esc(n)}</b><span>${esc(d)}</span></div>`).join('')}</div>
      <div class="card"><h3>🔧 ${t('p.uses')}</h3><p>${esc(T.us)}</p></div>
      <div class="card"><h3>🌍 ${t('p.where')}</h3><p>${esc(T.dv)}</p></div>
      <div class="kv">
        <div><span>${t('p.atomicNumber')}</span><b>${e.z}</b><small>${t('p.nProtons', e.z)}</small></div>
        <div><span>${t('p.atomicMass')}</span><b>${fmtMass(e.m)}</b><small>${t('p.massUnit')}</small></div>
        <div><span>${t('p.state20')}</span><b>${st ? stateName(st) : '—'}</b></div>
        <div><span>${t('p.density')}</span><b>${fmtNum(e.rho, 3)}</b><small>g/cm³</small></div>
        <div><span>${t('p.melting')}</span><b>${e.mp != null ? fmtTemp(e.mp) : '—'}</b></div>
        <div><span>${t('p.boiling')}</span><b>${e.bp != null ? fmtTemp(e.bp) : '—'}</b>${e.sub ? `<small>${t('p.sublimes')}</small>` : ''}</div>
      </div>
      ${e.z >= 100 ? `<p class="note">${t('p.superheavy')}</p>` : ''}
      <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
        <button class="btn" data-go="atom">⚛ ${t('p.seeAtom')}</button>
        <button class="btn" data-go="iso">${t('tab.iso')} (${e.iso.length})</button>
        <button class="btn" data-go="history">${t('p.seeHistory')}</button></div>
      ${FURTHER.html(e)}`;
    $$('[data-go]', body).forEach(b => b.onclick = () => { cur.tab = b.dataset.go; render(); });
  }

  /* ---------- atom ---------- */
  function atomTab(e) {
    const mi = mainIso(e), N = mi ? mi.n : Math.round(e.m) - e.z, sh = shells(e);
    body.innerHTML = `
      <div class="atom-wrap" style="--c:${catVar(e.sr)}"><canvas id="atom-cv"></canvas>
        <div class="atom-ctl"><div class="seg"><button data-m="bohr">${t('p.bohr')}</button><button data-m="cloud">${t('p.cloud')}</button></div></div></div>
      <div class="particles">
        <div class="particle"><b>${e.z}</b><span><i style="background:${PCOL}"></i>${t('w.protons')}</span></div>
        <div class="particle"><b>${N}</b><span><i style="background:${NCOL}"></i>${t('w.neutrons')}</span></div>
        <div class="particle"><b>${e.z}</b><span><i style="background:${ECOL}"></i>${t('w.electrons')}</span></div></div>
      <p class="note">${t('p.neutronsNote', mi ? `${lc(e)}-${mi.a}` : null, mi && mi.ab, e.z, lc(e))}</p>
      <div class="card"><h3>${t('p.howItWorks')}</h3><p id="atom-expl"></p></div>
      <div class="sec-title">${t('p.shells')}</div>
      <div class="econf">${sh.map((n, i) => `<span class="chip" style="margin:0 4px 4px 0;display:inline-block">${'KLMNOPQ'[i]} · ${n}</span>`).join('')}</div>
      <p class="note">${t('p.valence', sh[sh.length - 1])}</p>
      <div class="sec-title">${t('p.config')}</div>
      <div class="econf">${ecHTML(e, true)}</div>
      <div class="econf muted" style="font-size:12.5px">${ecHTML(e, false)}</div>
      <div class="sec-title">${t('p.orbitals')}</div>
      <div class="orb">${orbDiagram(e)}</div>
      <p class="note">${t('p.orbitalsNote')}</p>`;
    atomView = new AtomView($('#atom-cv'), { z: e.z, n: N, e: e.z, mode: atomMode });
    const expl = () => $('#atom-expl').textContent = t(atomMode === 'bohr' ? 'p.bohrTxt' : 'p.cloudTxt');
    expl();
    $$('.seg button', body).forEach(b => { b.classList.toggle('active', b.dataset.m === atomMode); b.onclick = () => { atomMode = b.dataset.m; atomView.mode = atomMode; $$('.seg button', body).forEach(x => x.classList.toggle('active', x === b)); expl(); }; });
  }
  function orbDiagram(e) {
    const orbs = [...orbitals(e)].sort((a, b) => (a.n + LNUM[a.l]) - (b.n + LNUM[b.l]) || a.n - b.n);
    return orbs.map(o => {
      const k = 2 * LNUM[o.l] + 1; let s = '';
      for (let i = 0; i < k; i++) { const up = o.e > i, dn = o.e > k + i; s += `<span class="orb-box${up ? ' full' : ''}">${up ? (dn ? '⇅' : '↑') : ''}</span>`; }
      return `<div class="orb-row"><span class="orb-lab">${o.n}${o.l}</span><span class="orb-boxes">${s}</span><span class="mono muted" style="font-size:11px">${o.e}</span></div>`;
    }).join('');
  }

  /* ---------- isotopes ---------- */
  function isoTab(e) {
    const list = isotopesOf(e.z);
    if (!list.length) { body.innerHTML = `<p class="muted">${t('p.noIsoData')}</p>`; return; }
    const stable = list.filter(i => i.stable), nat = list.filter(i => i.ab);
    const lg = v => v === Infinity ? 31 : v ? Math.log10(v) : -25;
    const hlv = i => i.stable ? Infinity : i.hl;
    const bars = list.map(i => { const k = clamp((lg(hlv(i)) + 25) / 56, 0.04, 1); return `<div class="iso-bar" title="${e.s}-${i.a}: ${i.stable ? t('w.stable') : fmtTime(i.hl)}" data-a="${i.a}" style="height:${(k * 100).toFixed(1)}%;background:${isoColor(i)}"></div>`; }).join('');
    const important = i => i.stable || i.ab || (i.hl && i.hl >= 60);
    const shown = isoAll ? list : list.filter(important);
    const usedModes = [...new Set(list.map(i => i.stable ? 'stable' : domMode(i)).filter(Boolean))];
    body.innerHTML = `
      <p style="margin:0 0 12px;line-height:1.5">${t('p.isoIntro', list.length, lc(e), stable.length, e.z)}</p>
      <div class="sec-title" style="margin-top:6px">${t('p.isoLife')}</div>
      <div class="iso-strip">${bars}</div>
      <div class="iso-axis"><span>${e.s}-${list[0].a}</span><span>${t('p.isoAxis')}</span><span>${e.s}-${list[list.length - 1].a}</span></div>
      <div class="legend" style="margin-top:8px">${usedModes.map(m => m === 'stable' ? `<span class="lg-chip" style="--c:var(--text)"><i></i>${t('w.stable')}</span>` : `<span class="lg-chip" style="--c:${decayInfo(m).col}"><i></i>${decayInfo(m).name.toLowerCase()}</span>`).join('')}</div>
      ${nat.length ? `<div class="sec-title">${t('p.inNature')}</div>${nat.sort((a, b) => b.ab - a.ab).map(i => `<div style="display:flex;align-items:center;gap:10px;margin:6px 0"><span class="mono" style="width:70px">${e.s}-${i.a}</span><div style="flex:1;height:8px;border-radius:4px;background:var(--line)"><div style="height:100%;border-radius:4px;width:${Math.max(1, i.ab)}%;background:var(--accent)"></div></div><span class="mono muted" style="width:70px;text-align:right">${fmtNum(i.ab, 3)}%</span></div>`).join('')}` : `<p class="note">${t('p.notNatural')}</p>`}
      <div class="sec-title" style="display:flex;justify-content:space-between;align-items:center">${t('p.list')} <span class="seg"><button data-f="0" class="${isoAll ? '' : 'active'}">${t('p.main')}</button><button data-f="1" class="${isoAll ? 'active' : ''}">${t('p.all')}</button></span></div>
      <div id="iso-list">${shown.map(i => isoRow(i)).join('')}</div>
      ${!isoAll && shown.length < list.length ? `<p class="note">${t('p.hidden', list.length - shown.length)}</p>` : ''}`;
    $$('.iso-bar,.iso-row', body).forEach(b => b.onclick = () => openIsotope(e.z, +b.dataset.a));
    $$('[data-f]', body).forEach(b => b.onclick = () => { isoAll = b.dataset.f === '1'; isoTab(e); });
  }
  function isoRow(i) {
    const badges = i.stable ? `<span class="badge" style="--b:var(--good)">${t('w.stable')}</span>` : i.modes.map(([m, p]) => `<span class="badge" style="--b:${decayInfo(m).col}">${decayInfo(m).lab}${p != null && p < 100 ? ' ' + fmtPct(p) + '%' : ''}</span>`).join('');
    return `<div class="iso-row" data-a="${i.a}"><div class="iso-name"><sup>${i.a}</sup>${i.sym}</div>
      <div class="iso-mid"><div class="iso-hl">${i.stable ? t('w.stable') : i.hl ? 't½ ' + fmtTime(i.hl) : t('p.unknownLife')}</div><div class="iso-badges">${badges}</div></div>
      <div class="iso-ab">${i.ab ? fmtNum(i.ab, 3) + '%<div class="abbar" style="width:' + Math.max(3, i.ab * 0.6) + 'px"></div>' : ''}</div></div>`;
  }

  /* ---------- isotope detail ---------- */
  function isoDetail(iso, e) {
    const modes = iso.modes, other = App.lang === 'it' ? 'en' : 'it';
    const chain = !iso.stable && modes.length ? decayChain(iso) : null;
    body.innerHTML = `
      <div class="hero"><div class="hero-tile" style="--c:${catVar(e.sr)}"><span class="z">${e.z}</span><span class="sym" style="font-size:34px;inset:26px 0 auto"><sup style="font-size:15px;vertical-align:top;font-weight:600">${iso.a}</sup>${e.s}</span><span class="ms">${fmtIsoMass(iso.mass)}</span></div>
      <div><h1>${nm(e)}-${iso.a}</h1><div class="en">${e.tx[other].n}-${iso.a}</div><div class="chips">
        ${iso.stable ? `<span class="chip" style="color:var(--good)">${t('w.stable')}</span>` : `<span class="chip" style="color:#f2c94c">☢ ${t('p.radioactive')}</span>`}
        ${iso.ab ? `<span class="chip">${t('p.pctNature', fmtNum(iso.ab, 4))}</span>` : ''}</div></div></div>
      <div class="atom-wrap"><canvas id="nuc-cv" style="aspect-ratio:2/1"></canvas></div>
      <div class="particles"><div class="particle"><b>${iso.z}</b><span><i style="background:${PCOL}"></i>${t('w.protons')}</span></div>
        <div class="particle"><b>${iso.n}</b><span><i style="background:${NCOL}"></i>${t('w.neutrons')}</span></div>
        <div class="particle"><b>${iso.a}</b><span>${t('p.nucleons')}</span></div></div>
      <div class="card ${iso.stable ? '' : 'fun'}"><h3>⏳ ${t('p.halfLife')}</h3>
        ${iso.stable ? `<p>${t('p.stableTxt', modes.length > 0, lc(e))}</p>`
        : iso.hl ? `<p style="font:700 24px var(--mono);margin-bottom:4px">${fmtTime(iso.hl)}</p><p>${t('p.halfLifeTxt')} ${timeCompare(iso.hl)}</p>`
        : `<p>${t('p.unstableUnknown')}</p>`}</div>
      ${!iso.stable && modes.length ? `<div class="sec-title">${t('p.howDecays')}</div>${modes.map(([m, p]) => { const d = decayInfo(m), dt = daughter(iso, m);
        return `<div class="decay-explain"><span class="badge" style="--b:${d.col}">${d.lab}</span><div><p><b>${d.name}</b>${p != null ? ` · ${fmtPct(p)}%` : ' · ' + t('p.rare')}</p><p class="muted" style="font-size:13px">${d.txt}</p>
          ${dt && !dt.missing ? `<p style="margin-top:4px"><a href="#" data-z="${dt.z}" data-a="${dt.a}" class="dlink" style="color:var(--accent)">→ ${t('p.becomes', `${nm(App.E[dt.z - 1])}-${dt.a}`)}</a></p>` : ''}</div></div>`; }).join('')}` : ''}
      ${chain && chain.length > 1 ? `<div class="sec-title">${t('p.chain')}</div><div class="chain">${chainHTML(chain)}</div>
        <p class="note">${t('p.chainNote', chain[chain.length - 1].stable)}</p>` : ''}
      ${!iso.stable && iso.hl ? `<div class="sec-title">${t('p.sim')}</div><div class="hlsim" id="hlsim"></div>` : ''}
      <table class="props" style="margin-top:18px">
        <tr><td>${t('p.isoMass')}</td><td>${fmtIsoMass(iso.mass)} u</td></tr>
        <tr><td>${t('p.spin')}</td><td>${iso.spin || '—'}</td></tr>
        <tr><td>${t('p.discYear')}</td><td>${iso.disc || '—'}</td></tr>
        <tr><td>${t('p.npRatio')}</td><td>${fmtNum(iso.n / iso.z, 3)}</td></tr></table>
      <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><button class="btn" id="to-chart">${t('p.toChart')}</button><button class="btn" id="to-el">${t('p.toElement', lc(e))}</button></div>`;
    const av = new AtomView($('#nuc-cv'), { z: iso.z, n: iso.n, e: 0, labels: false }); av.bigNucleus = true;
    $$('.dlink,.chain-node', body).forEach(a => a.onclick = ev => { ev.preventDefault(); const z = +a.dataset.z, A = +a.dataset.a; if (findIso(z, A)) openIsotope(z, A); });
    $('#to-chart').onclick = () => { App.setView('nuclides'); App.nuclides.focus(iso.z, iso.n); };
    $('#to-el').onclick = () => openElement(e.z, 'iso');
    if ($('#hlsim')) sim = new HalfLifeSim($('#hlsim'), iso);
  }
  function chainHTML(chain) {
    return chain.map((c, i) => {
      if (c.missing) return `<div class="chain-node"><span class="cn">${c.z <= 118 && c.z > 0 ? `<sup>${c.a}</sup>${App.E[c.z - 1].s}` : '?'}</span><span class="ch">${t('p.noData')}</span></div>`;
      const el = App.E[c.z - 1];
      let s = `<div class="chain-node${c.stable ? ' stable' : ''}" data-z="${c.z}" data-a="${c.a}"><span class="cn"><sup>${c.a}</sup>${el.s}</span><span class="muted" style="font-size:13px">${nm(el)}</span><span class="ch">${c.stable ? '✓ ' + t('w.stable') : c.hl ? fmtTime(c.hl) : '?'}</span></div>`;
      if (c.nextMode && i < chain.length - 1) { const d = decayInfo(c.nextMode); s += `<div class="chain-arrow" style="--b:${d.col}">↓ <b>${d.lab}</b> ${d.name.toLowerCase()}</div>`; }
      else if (c.endMode) { const d = decayInfo(c.endMode); s += `<div class="chain-arrow" style="--b:${d.col}">↯ <b>${d.lab}</b> ${t('p.splits')}</div>`; }
      return s;
    }).join('');
  }

  /* ---------- history ---------- */
  function history(e) {
    const known = App.E.filter(o => o.y < e.y).length, sorted = [...App.E].sort((a, b) => a.y - b.y || a.z - b.z), T = tx(e);
    const rank = sorted.indexOf(e) + 1, X = y => ((Math.max(1640, y) - 1640) / (2026 - 1640) * 100).toFixed(2) + '%';
    body.innerHTML = hero(e) + `
      <div class="kv"><div><span>${t('p.discovered')}</span><b>${e.y < 0 ? t('w.antiquity') : e.y}</b></div><div><span>${t('p.place')}</span><b style="font-family:var(--sans);font-size:14px">${esc(T.l)}</b></div></div>
      <div class="card"><h3>👩‍🔬 ${t('p.discoveredBy')}</h3><p>${esc(T.w)}</p></div>
      <div class="card"><h3>📜 ${t('p.story')}</h3><p>${esc(T.st)}</p></div>
      <div class="card"><h3>🏷 ${t('p.nameOrigin')}</h3><p>${esc(T.o)}</p></div>
      <div class="sec-title">${t('p.timeline')}</div>
      <div class="timeline"><div class="line"></div>
        ${App.E.filter(o => o.y > 0).map(o => `<div class="known" style="left:${X(o.y)}"></div>`).join('')}
        ${[1700, 1800, 1900, 2000].map(y => `<div class="tick" style="left:${X(y)}">${y}</div>`).join('')}
        <div class="dot" style="left:${e.y < 0 ? '0%' : X(e.y)}"></div></div>
      <p class="note">${e.y < 0 ? t('p.ancientNote', nm(e), App.E.filter(o => o.y < 0).length) : t('p.rankNote', known, rank)}</p>`;
  }

  /* ---------- data ---------- */
  function data(e) {
    const ox = e.ox || { m: [], e: [] }, fmtOx = v => (v > 0 ? '+' : '') + v, D = t('d');
    const oxs = [...ox.m.map(v => `<b>${fmtOx(v)}</b>`), ...ox.e.sort((a, b) => a - b).map(fmtOx)].join(', ');
    const rows = [
      [D.z, e.z], [D.mass, fmtNum(e.m, 6) + ' u'], [D.gpb, `${e.g ?? '—'} / ${e.p} / ${e.b}`],
      [D.config, ecHTML(e)], [D.density, e.rho != null ? fmtNum(e.rho, 4) + ' g/cm³' : '—'],
      [D.mp, e.mp != null ? `${fmtTemp(e.mp)} (${fmtNum(e.mp, 1)} K)` : '—'],
      [D.bp, e.bp != null ? `${fmtTemp(e.bp)} (${fmtNum(e.bp, 1)} K)${e.sub ? ' · ' + t('p.sublimes') : ''}` : '—'],
      [D.en, e.enp != null ? fmtNum(e.enp, 2) : '—'],
      [D.ie, e.ie != null ? fmtNum(e.ie, 3) + ' eV' : '—'],
      [D.ea, e.ea != null ? fmtNum(e.ea, 3) + ' eV' : '—'],
      [D.ar, e.ar != null ? e.ar + ' pm' : '—'], [D.cr, e.cr != null ? e.cr + ' pm' : '—'], [D.vdw, e.vdw != null ? e.vdw + ' pm' : '—'],
      [D.ox, oxs || '—'], [D.lat, latticeName(e.lat) || '—'],
      [D.tc, e.tc != null ? fmtNum(e.tc, 3) + ' W/(m·K)' : '—'], [D.cp, e.cp != null ? fmtNum(e.cp, 3) + ' J/(g·K)' : '—'],
      [D.crust, e.crust != null ? fmtNum(e.crust, 3) + ' mg/kg' : '—'], [D.sea, e.sea != null ? fmtNum(e.sea, 3) + ' mg/L' : '—'],
      [D.geo, e.geo ? geoName(e.geo) : '—'], [D.prod, trProducers(e.prod) || '—'],
      [D.price, e.price != null ? fmtNum(e.price, 3) + ' $/kg' : '—'], [D.isos, e.iso.length],
    ];
    body.innerHTML = `<table class="props">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>
      <p class="note">${D.note}</p>`;
  }

  /* ---------- drag the panel on mobile ---------- */
  function initGrip() {
    const g = $('#panel-grip'); let y0 = null;
    g.addEventListener('pointerdown', e => { y0 = e.clientY; g.setPointerCapture(e.pointerId); });
    g.addEventListener('pointerup', e => { if (y0 == null) return; const dy = e.clientY - y0; y0 = null;
      if (dy < -30) P.classList.add('full'); else if (dy > 50) { P.classList.contains('full') ? P.classList.remove('full') : close(); } else P.classList.toggle('full'); });
  }

  function init() {
    $('#panel-close').onclick = () => { close(); App.table.select(null); };
    $('#panel-back').onclick = back; initGrip();
    addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }
  return { init, openElement, openIsotope, close, rerender, get cur() { return cur; } };
})();

/* ---------- half-life simulator ---------- */
class HalfLifeSim {
  constructor(root, iso) {
    this.iso = iso; this.N = 100; this.t = 0; this.run = false; this.SEC = 1.6;
    const d = daughter(iso, domMode(iso)); this.dname = d && !d.missing ? `${App.E[d.z - 1].s}-${d.a}` : t('sim.other');
    root.innerHTML = `<p style="margin:0 0 10px;font-size:13.5px;line-height:1.5">${t('sim.intro', `${iso.sym}-${iso.a}`)}</p>
      <canvas height="170"></canvas><div class="hlsim-ctl"><button class="btn primary"></button><button class="btn">↺</button><span class="mono muted" style="font-size:12px"></span></div>`;
    this.cv = root.querySelector('canvas'); this.btn = root.querySelector('.btn.primary'); this.lab = root.querySelector('span.mono');
    this.btn.onclick = () => this.run ? this.pause() : this.play(); root.querySelectorAll('.btn')[1].onclick = () => this.reset();
    this.reset();
  }
  reset() { this.pause(); this.t = 0; this.life = Array.from({ length: this.N }, () => -Math.log(Math.random()) / Math.LN2); this.hist = [[0, this.N]]; this.draw(); }
  play() { if (this.t > 6) this.reset(); this.run = true; this.btn.textContent = '❚❚ ' + t('sim.pause'); let last = performance.now();
    const step = now => { if (!this.run || !this.cv.isConnected) return; this.t += (now - last) / 1000 / this.SEC; last = now; this.hist.push([this.t, this.alive()]); this.draw(); if (this.t >= 6.5) return this.pause(); this.raf = requestAnimationFrame(step); };
    this.raf = requestAnimationFrame(step); }
  pause() { this.run = false; cancelAnimationFrame(this.raf); if (this.btn) this.btn.textContent = '▶ ' + t('sim.start'); }
  stop() { this.pause(); }
  alive() { return this.life.filter(l => l > this.t).length; }
  draw() {
    const c = this.cv, d = devicePixelRatio || 1, W = c.clientWidth, H = 170; c.width = W * d; c.height = H * d;
    const x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); const cs = getComputedStyle(document.documentElement);
    const gw = Math.min(H - 10, W * 0.45), cell = gw / 10;
    this.life.forEach((l, i) => { const cx = (i % 10 + .5) * cell, cy = (Math.floor(i / 10) + .5) * cell + 4, on = l > this.t;
      x.beginPath(); x.arc(cx, cy, cell * 0.36, 0, 6.283); x.fillStyle = on ? '#f2c94c' : cs.getPropertyValue('--line2'); x.fill(); });
    const gx = gw + 18, gW = W - gx - 4, gH = H - 22;
    x.strokeStyle = cs.getPropertyValue('--line2'); x.lineWidth = 1; x.beginPath(); x.moveTo(gx, 4); x.lineTo(gx, gH); x.lineTo(gx + gW, gH); x.stroke();
    x.fillStyle = cs.getPropertyValue('--muted'); x.font = '10px JetBrains Mono'; x.textAlign = 'center';
    for (let k = 0; k <= 6; k++) x.fillText(k, gx + gW * k / 6.5, gH + 13);
    x.setLineDash([3, 3]); x.beginPath(); for (let k = 0; k <= 65; k++) { const tt = k / 10, yy = gH - (gH - 4) * Math.pow(0.5, tt); k ? x.lineTo(gx + gW * tt / 6.5, yy) : x.moveTo(gx, yy); } x.stroke(); x.setLineDash([]);
    x.strokeStyle = '#f2c94c'; x.lineWidth = 2; x.beginPath(); this.hist.forEach(([tt, n], k) => { const px = gx + gW * tt / 6.5, py = gH - (gH - 4) * n / this.N; k ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke();
    this.lab.textContent = t('sim.status', this.t ? fmtNum(this.t, 1) + ' t½ ≈ ' + fmtTime(this.t * this.iso.hl) : null, this.alive(), this.dname);
  }
}
