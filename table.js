/* Elementa — explorable periodic table */
'use strict';
const CELL = 106, OX = 44, OY = 44, FGAP = 28;
const WORLD_W = OX + 18 * CELL + 10, WORLD_H = OY + 10 * CELL + FGAP + 10;

function tilePos(e) {
  if (e.z >= 57 && e.z <= 71) return [OX + (2 + e.z - 57) * CELL, OY + 8 * CELL + FGAP];
  if (e.z >= 89 && e.z <= 103) return [OX + (2 + e.z - 89) * CELL, OY + 9 * CELL + FGAP];
  return [OX + (e.g - 1) * CELL, OY + (e.p - 1) * CELL];
}

// colour modes; names come from i18n.js (key cm.<id>)
const COLOR_MODES = {
  cat: { type: 'cat' },
  photo: { type: 'photo' },
  state: { type: 'state' },
  block: { type: 'block' },
  year: { type: 'num', f: e => e.y < 0 ? 1600 : Math.max(1600, e.y), unit: '', fmt: v => v <= 1600 ? t('w.ancient') : Math.round(v) },
  en: { type: 'num', f: e => e.enp, unit: '', fmt: v => fmtNum(v, 2) },
  radius: { type: 'num', f: e => e.ar, unit: 'pm', fmt: v => Math.round(v) },
  ie: { type: 'num', f: e => e.ie, unit: 'eV', fmt: v => fmtNum(v, 1) },
  density: { type: 'num', log: true, f: e => e.rho, unit: 'g/cm³', fmt: v => fmtNum(v, 2) },
  mp: { type: 'num', f: e => e.mp, unit: '°C', fmt: v => Math.round(K2C(v)), show: v => Math.round(K2C(v)) + '°' },
  crust: { type: 'num', log: true, f: e => e.crust, unit: 'mg/kg', fmt: v => fmtNum(v, 2) },
  stab: { type: 'num', log: true, f: e => { const l = longestHL(e); return l === Infinity ? 1e30 : l; }, unit: '', fmt: v => v >= 1e30 ? t('w.stable') : fmtTime(v), show: v => v >= 1e30 ? '∞' : fmtTimeShort(v) },
};
const BLOCK_COL = { s: '#ff7a59', p: '#f2d06b', d: '#56a8ff', f: '#c39bff' };

App.table = (() => {
  const vp = $('#table-vp'), world = $('#world');
  const tiles = {}; let sel = null, mode = 'cat', hl = null, lastTap = { z: 0, t: 0 }, temp = 293, year = 2026, playing = null, gameOn = false;
  let lensEl, phEls = [];

  function build() {
    App.E.forEach(e => {
      const [x, y] = tilePos(e);
      const tl = h('div', { class: 'tile', 'data-z': e.z, style: `left:${x}px;top:${y}px;--c:${catVar(e.sr)}` },
        `<span class="z">${e.z}</span><span class="val"></span><span class="sym">${e.s}</span><span class="nm"></span><span class="ms">${fmtMass(e.m)}</span>
         <div class="xtra">${miniAtomSVG(e)}<div class="props"></div>
         <div class="ec">${ecHTML(e).replace(/<sup>/g, '').replace(/<\/sup>/g, '')}</div><div class="sh">${shells(e).join('·')}</div></div>`);
      tiles[e.z] = tl; world.appendChild(tl);
    });
    // lanthanide / actinide placeholders
    [['57–71', 6, 9], ['89–103', 7, 10]].forEach(([r, p, sr]) => {
      const ph = h('div', { class: 'ph', 'data-ph': p, style: `left:${OX + 2 * CELL}px;top:${OY + (p - 1) * CELL}px;color:var(--c-${sr})` });
      ph._r = r; ph._sr = sr; phEls.push(ph); world.appendChild(ph);
    });
    // group and period labels
    const firstRow = { 1: 1, 2: 2, 13: 2, 14: 2, 15: 2, 16: 2, 17: 2, 18: 1 };
    for (let g = 1; g <= 18; g++) world.appendChild(h('div', { class: 'glabel', style: `left:${OX + (g - 1) * CELL}px;top:${OY + ((firstRow[g] || 4) - 1) * CELL - 22}px` }, g));
    for (let p = 1; p <= 7; p++) world.appendChild(h('div', { class: 'glabel', style: `left:${OX - 100 - 6}px;top:${OY + (p - 1) * CELL + 40}px;text-align:right;width:100px` }, p));
    // info «lens» in the empty space
    lensEl = h('div', { class: 'lens', style: `left:${OX + 2 * CELL}px;top:${OY}px;width:${10 * CELL - 6}px;height:${3 * CELL - 30}px` });
    world.appendChild(lensEl);
    world.style.width = WORLD_W + 'px'; world.style.height = WORLD_H + 'px';
    texts();
  }
  // language-dependent text on the tiles
  function texts() {
    App.E.forEach(e => {
      const tl = tiles[e.z];
      tl.querySelector('.nm').textContent = nm(e);
      tl.querySelector('.props').innerHTML = `${e.enp != null ? 'χ ' + fmtNum(e.enp, 2) + '<br>' : ''}${e.rho != null ? fmtNum(e.rho, 2) + ' g/cm³<br>' : ''}${e.mp != null ? t('w.mpShort') + ' ' + Math.round(K2C(e.mp)) + '°C' : ''}`;
      tl.querySelector('.ms').textContent = fmtMass(e.m);
    });
    phEls.forEach(ph => ph.innerHTML = `${ph._r}<br><span style="font-weight:500;font-size:10px">${catName(ph._sr)}</span>`);
    const cm = $('#color-mode'); cm.innerHTML = '';
    Object.keys(COLOR_MODES).forEach(k => cm.appendChild(h('option', { value: k }, t('cm.' + k))));
    cm.value = mode;
    lens(sel ? App.E[sel - 1] : null);
  }

  function lens(e) {
    if (!e) {
      lensEl.style.setProperty('--c', 'var(--accent)');
      lensEl.innerHTML = `<div class="lens-info"><h2>${t('lens.title')}</h2><div class="cat">${t('lens.hint')}</div><p>${t('lens.text')}</p></div>`;
      return;
    }
    lensEl.style.setProperty('--c', catVar(e.sr));
    lensEl.innerHTML = (e.img ? `<img class="lens-photo" src="img/${e.z}.jpg" alt="">` : '') + `<div class="lens-tile"><span class="z">${e.z}</span><span class="sym">${e.s}</span><span class="ms">${fmtMass(e.m)}</span></div>
      <div class="lens-info"><h2>${nm(e)}</h2><div class="cat"><i></i>${catName(e.sr)} · ${t('w.group')} ${e.g ?? '—'} · ${t('w.period')} ${e.p}</div>
      <div class="lens-ec">${ecHTML(e)}</div><p>${esc(tx(e).cu)}</p></div>`;
  }

  const pz = new PanZoom(vp, {
    min: 0.08, max: 6,
    onChange: p => {
      world.style.transform = `translate(${p.x}px,${p.y}px) scale(${p.s})`;
      const px = 100 * p.s, lv = px < 46 ? 0 : px < 80 ? 1 : px < 170 ? 2 : 3;
      if (lv !== world._lv) { world.classList.remove('l0', 'l1', 'l2', 'l3'); world.classList.add('l' + lv); world._lv = lv; }
    },
    onTap: e => tap(e),
    onHover: e => {
      if (e.pointerType !== 'mouse') return;
      const tl = document.elementFromPoint(e.clientX, e.clientY)?.closest('.tile');
      const z = tl ? +tl.dataset.z : null;
      if (z !== hl) { if (hl) tiles[hl].classList.remove('hover'); hl = z; if (z) tiles[z].classList.add('hover'); if (!gameOn) lens(z ? App.E[z - 1] : (sel ? App.E[sel - 1] : null)); }
    },
    onDouble: e => { const tl = document.elementFromPoint(e.clientX, e.clientY)?.closest('.tile'); if (tl) zoomTo(+tl.dataset.z); }
  });

  function tap(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const tl = el?.closest('.tile'), ph = el?.closest('.ph');
    if (ph) { const p = +ph.dataset.ph; flyToRect(OX + 2 * CELL, OY + (p + 2) * CELL + FGAP, 15 * CELL, CELL); return; }
    if (!tl) return;
    const z = +tl.dataset.z, now = performance.now();
    if (gameOn) { App.game && App.game.onTile(z); return; }
    if (lastTap.z === z && now - lastTap.t < 320) { zoomTo(z); lastTap = { z: 0, t: 0 }; return; }
    lastTap = { z, t: now };
    select(z, true);
  }

  function select(z, open) {
    if (sel && tiles[sel]) tiles[sel].classList.remove('picked');
    sel = z; if (z && tiles[z]) { tiles[z].classList.add('picked'); lens(App.E[z - 1]); }
    if (z && open) { App.panel.openElement(z); setTimeout(() => ensureVisible(z), 60); }
  }

  // visible area not covered by the panel
  function freeRect() {
    const r = vp.getBoundingClientRect(), p = $('#panel'), hp = $('#helper');
    let x = 0, w = r.width, hh = r.height;
    if (p.classList.contains('open')) { if (innerWidth > 820) w -= p.offsetWidth + 20; else hh -= p.offsetHeight - 10; }
    if (!hp.hidden) { if (innerWidth > 820) { x = hp.offsetWidth + 20; w -= x; } else hh -= hp.offsetHeight + 16; }
    return { x, w: Math.max(120, w), h: Math.max(120, hh) };
  }
  function ensureVisible(z) {
    const e = App.E[z - 1], [x, y] = tilePos(e), fr = freeRect();
    const sx = pz.x + x * pz.s, sy = pz.y + y * pz.s, sz = 100 * pz.s;
    if (sx < fr.x + 10 || sy < 10 || sx + sz > fr.x + fr.w - 10 || sy + sz > fr.h - 10) flyTo(z, Math.max(pz.s, 0.55));
  }
  function flyTo(z, s = pz.s) {
    const [x, y] = tilePos(App.E[z - 1]), fr = freeRect();
    pz.animateTo(fr.x + fr.w / 2 - (x + 50) * s, fr.h / 2 - (y + 50) * s, s);
  }
  function zoomTo(z) { flyTo(z, Math.max(2.6, pz.s * 1.6)); }
  function flyToRect(x, y, w, hh) {
    const fr = freeRect(); const s = clamp(Math.min((fr.w - 40) / w, (fr.h - 40) / hh), 0.15, 3);
    pz.animateTo(fr.x + fr.w / 2 - (x + w / 2) * s, fr.h / 2 - (y + hh / 2) * s, s);
  }
  function fit(anim = true) {
    const fr = freeRect(), dock = $('#view-table .dock').offsetHeight + 20, top = gameOn ? 90 : 8;
    const s = clamp(Math.min((fr.w - 24) / WORLD_W, (fr.h - dock - top) / WORLD_H), 0.08, 1.2);
    const x = fr.x + (fr.w - WORLD_W * s) / 2, y = top + Math.max(0, (fr.h - dock - top - WORLD_H * s) / 2);
    anim ? pz.animateTo(x, y, s) : pz.set(x, y, s);
  }

  /* ---------- colouring ---------- */
  function setMode(m) { mode = m; $('#color-mode').value = m; recolor(); }
  function recolor() {
    const M = COLOR_MODES[mode]; world.classList.toggle('numeric', M.type === 'num'); world.classList.toggle('photo', M.type === 'photo'); world.classList.toggle('strong', M.type === 'state' || M.type === 'block');
    const lg = $('#legend'); lg.innerHTML = ''; hiCat(null);
    $('#slider-row').hidden = !(mode === 'state' || mode === 'year');
    if (mode !== 'year') $('#year-badge').hidden = true;
    App.E.forEach(e => { const tl = tiles[e.z]; tl.classList.remove('na', 'ghost'); tl.style.removeProperty('--tc'); tl.querySelector('.val').textContent = ''; });
    if (M.type === 'photo') {
      App.E.forEach(e => { const tl = tiles[e.z]; tl.style.setProperty('--c', catVar(e.sr)); if (e.img) tl.style.setProperty('--img', `url(img/${e.z}.jpg)`); else tl.classList.add('nophoto'); });
      lg.appendChild(h('span', { class: 'lg-chip', style: 'cursor:default' }, t('legend.photo')));
    } else if (M.type === 'cat') {
      App.E.forEach(e => tiles[e.z].style.setProperty('--c', catVar(e.sr)));
      SR_LIST.forEach(k => lg.appendChild(h('span', { class: 'lg-chip', style: `--c:${catVar(k)}`, 'data-cat': k, onclick: ev => { ev.stopPropagation(); hiCat(k); } }, `<i></i>${catName(k)}`)));
    } else if (M.type === 'block') {
      App.E.forEach(e => tiles[e.z].style.setProperty('--c', BLOCK_COL[e.b]));
      Object.entries(BLOCK_COL).forEach(([k, c]) => lg.appendChild(h('span', { class: 'lg-chip', style: `--c:${c}` }, `<i></i>${t('w.block')} ${k}`)));
    } else if (M.type === 'state') {
      setupSlider('state');
      App.E.forEach(e => { const st = stateAt(e, temp), tl = tiles[e.z]; if (!st) tl.classList.add('na'); else tl.style.setProperty('--c', STATE[st].c); });
      Object.entries(STATE).forEach(([k, s]) => lg.appendChild(h('span', { class: 'lg-chip', style: `--c:${s.c}` }, `<i></i>${stateName(k)}`)));
      lg.appendChild(h('span', { class: 'lg-chip', style: '--c:var(--line2)' }, `<i></i>${t('legend.noData')}`));
    } else {
      const vals = App.E.map(e => { const v = M.f(e); return v == null || (M.log && v <= 0) ? null : v; });
      const tv = v => M.log ? Math.log10(v) : v;
      const ok = vals.filter(v => v != null).map(tv); const lo = Math.min(...ok), hi = Math.max(...ok);
      App.E.forEach((e, i) => {
        const v = vals[i], tl = tiles[e.z];
        if (v == null) { tl.classList.add('na'); return; }
        const c = ramp((tv(v) - lo) / (hi - lo || 1)); tl.style.setProperty('--c', c); tl.style.setProperty('--tc', inkFor(c));
        tl.querySelector('.val').textContent = M.show ? M.show(v) : M.fmt(v);
      });
      const min = M.log ? 10 ** lo : lo, max = M.log ? 10 ** hi : hi;
      lg.appendChild(h('div', { class: 'lg-grad' }, `<span>${M.fmt(min)}</span><span class="bar" style="background:linear-gradient(90deg,${RAMP.join(',')})"></span><span>${M.fmt(max)} ${M.unit}</span>`));
      if (mode === 'year') { setupSlider('year'); shownYear = null; applyYear(); }
    }
    helper();
  }
  /* ---------- side guide for the current colour mode ---------- */
  let helpOn = store.get('helper', innerWidth > 820);
  function trendSVG(tr) {
    // small table outline with arrows showing the direction in which the value grows
    let cells = '';
    App.E.forEach(e => { if (e.g) cells += `<rect x="${(e.g - 1) * 9 + 22}" y="${(e.p - 1) * 9 + 4}" width="8" height="8" rx="1.5"/>`; });
    const W = 22 + 18 * 9, H = 4 + 7 * 9, inc = t('help.inc');
    const hx = tr.x > 0 ? `M26 ${H + 12} H${W - 6}` : `M${W - 6} ${H + 12} H26`;
    const vy = tr.y > 0 ? `M10 ${H} V8` : `M10 8 V${H}`;
    return `<svg class="trend" viewBox="0 0 ${W + 4} ${H + 30}"><g class="cells">${cells}</g>
      <defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs>
      <path class="arr" d="${hx}" marker-end="url(#ah)"/><path class="arr" d="${vy}" marker-end="url(#ah)"/>
      <text x="${(W + 22) / 2}" y="${H + 27}" text-anchor="middle">${inc} ${tr.x > 0 ? '→' : '←'}</text></svg>`;
  }
  function helper() {
    const hp = $('#helper'), btn = $('#help-btn'), H = (HELP[App.lang] || HELP.it)[mode];
    btn.classList.toggle('on', helpOn);
    if (!helpOn || !H || gameOn) { hp.hidden = true; return; }
    const M = COLOR_MODES[mode];
    const sample = M.type === 'num' ? `<span class="bar" style="background:linear-gradient(90deg,${RAMP.join(',')})"></span>` : '';
    hp.innerHTML = `<div class="hp-head"><span class="hp-lab">${t('help.label')} · ${t('cm.' + mode)}</span><button class="icon-btn small" id="hp-x" title="${t('help.close')}">✕</button></div>
      <h3>${H.t}</h3>${H.p.map(x => `<p>${x}</p>`).join('')}
      ${H.trend ? `<div class="hp-box"><b>${t('help.trend')}</b>${trendSVG(H.trend)}</div>` : ''}
      <div class="hp-box"><b>${t('help.read')}</b>${sample}<p>${H.read}</p></div>
      <div class="hp-box kid"><b>🧒 ${t('help.kid')}</b><p>${H.kid}</p></div>`;
    hp.hidden = false;
    if (innerWidth <= 820) hp.style.bottom = ($('#view-table .dock').offsetHeight + 18) + 'px'; else hp.style.bottom = '';
    $('#hp-x').onclick = () => toggleHelp(false);
  }
  function toggleHelp(on = !helpOn) {
    helpOn = on; store.set('helper', on); helper();
    if (!sel) fit(); else ensureVisible(sel);
  }
  function hiCat(k) {
    const cur = world._hiCat; world._hiCat = (k && k !== cur) ? k : null;
    $$('.lg-chip').forEach(c => c.classList.toggle('on', +c.dataset.cat === world._hiCat));
    App.E.forEach(e => tiles[e.z].classList.toggle('dim', !!world._hiCat && e.sr !== world._hiCat));
  }
  function setupSlider(kind) {
    const s = $('#slider');
    if (s._kind === kind) return label(); s._kind = kind; stopPlay();
    if (kind === 'state') { s.min = 0; s.max = 6000; s.step = 1; s.value = temp; }
    else { s.min = 1640; s.max = 2026; s.step = 1; s.value = year; }
    label();
  }
  function label() {
    const s = $('#slider'), l = $('#slider-label');
    if (s._kind === 'state') l.textContent = `${Math.round(K2C(temp))} °C · ${temp} K`;
    else { const n = App.E.filter(e => e.y <= year).length; l.textContent = `${year <= 1640 ? t('w.antiquity') : year} · ${t('slider.known', n)}`; }
  }
  // shows only the elements known in the chosen year, with a big year badge
  let shownYear = null, lastNew = [];
  function applyYear() {
    const prev = shownYear; shownYear = year;
    const born = prev != null && year > prev ? App.E.filter(e => e.y > prev && e.y <= year) : [];
    App.E.forEach(e => {
      const tl = tiles[e.z]; tl.classList.toggle('ghost', e.y > year);
      if (born.includes(e)) { tl.classList.remove('born'); void tl.offsetWidth; tl.classList.add('born'); }
    });
    if (born.length) lastNew = born.slice(-4);
    else if (prev != null && year < prev) lastNew = lastNew.filter(e => e.y <= year);
    label(); badge();
  }
  function badge() {
    const b = $('#year-badge');
    if (mode !== 'year' || gameOn) { b.hidden = true; return; }
    const n = App.E.filter(e => e.y <= year).length;
    b.hidden = false;
    b.innerHTML = `<b>${year <= 1640 ? t('w.antiquity') : year}</b><span>${t('slider.known', n)} / 118</span>`
      + (lastNew.length ? `<em>${lastNew.map(e => `<i style="--c:${catVar(e.sr)}">${e.s}</i> ${nm(e)}${e.y > 0 ? ` <small>${e.y}</small>` : ''}`).join('<br>')}</em>` : '');
  }
  function stopPlay() { if (playing) { cancelAnimationFrame(playing); playing = null; } $('#slider-play').textContent = '▶'; }
  function play() {
    if (playing) return stopPlay();
    const s = $('#slider'); $('#slider-play').textContent = '❚❚';
    if (+s.value >= +s.max) { s.value = s.min; onSlider(+s.min); }
    // the slider snaps to whole steps, so the animation keeps its own fractional position
    let last = performance.now(), pos = +s.value;
    const dur = s._kind === 'year' ? 18 : 10;
    const step = now => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      pos = Math.min(+s.max, pos + (s.max - s.min) * dt / dur);
      s.value = pos; onSlider(pos);
      if (pos >= +s.max) return stopPlay();
      playing = requestAnimationFrame(step);
    };
    playing = requestAnimationFrame(step);
  }
  function onSlider(v) {
    const s = $('#slider');
    if (s._kind === 'state') { const nt = Math.round(v); if (nt !== temp) { temp = nt; recolorState(); } label(); }
    else { const ny = Math.round(v); if (ny !== year || shownYear == null) { year = ny; applyYear(); } }
  }

  function init() {
    build();
    const cm = $('#color-mode');
    cm.addEventListener('change', () => setMode(cm.value));
    $('#slider').addEventListener('input', ev => { stopPlay(); onSlider(+ev.target.value); });
    $('#slider-play').addEventListener('click', play);
    $('#help-btn').addEventListener('click', ev => { ev.stopPropagation(); toggleHelp(); });
    $$('[data-zoom]').forEach(b => b.addEventListener('click', () => {
      const r = vp.getBoundingClientRect(), k = b.dataset.zoom;
      if (k === 'fit') fit(); else pz.zoomAt(r.width / 2, r.height / 2, k === 'in' ? 1.5 : 1 / 1.5);
    }));
    // on mobile the legend opens by tapping the dock
    $('#view-table .dock').addEventListener('click', ev => { if (innerWidth <= 820 && !ev.target.closest('select,input,button')) ev.currentTarget.classList.toggle('expanded'); });
    addEventListener('keydown', ev => {
      if (ev.target.matches('input,select,textarea') || !$('#view-table').classList.contains('active')) return;
      if (!sel) return; const e = App.E[sel - 1]; let nz = null;
      if (ev.key === 'ArrowRight') nz = Math.min(118, sel + 1);
      if (ev.key === 'ArrowLeft') nz = Math.max(1, sel - 1);
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
        const [x, y] = tilePos(e), dy = ev.key === 'ArrowUp' ? -CELL : CELL;
        const c = App.E.filter(o => { const [ox, oy] = tilePos(o); return ox === x && Math.abs(oy - (y + dy)) < 40; });
        if (c.length) nz = c[0].z;
      }
      if (nz) { ev.preventDefault(); select(nz, $('#panel').classList.contains('open')); ensureVisible(nz); }
    });
    recolor(); fit(false);
    addEventListener('resize', () => { clearTimeout(init._r); init._r = setTimeout(() => { if (!sel) fit(false); }, 150); });
  }
  function recolorState() { App.E.forEach(e => { const st = stateAt(e, temp), tl = tiles[e.z]; tl.classList.toggle('na', !st); if (st) tl.style.setProperty('--c', STATE[st].c); }); }
  function relang() { texts(); recolor(); }

  /* ---------- game hooks ---------- */
  function setGame(on) {
    gameOn = on; vp.classList.toggle('game', on);
    if (on) { setMode('cat'); select(null); lens(null); App.panel.close(); }
    App.E.forEach(e => tiles[e.z].classList.remove('hint', 'dim'));
    helper();
  }
  function flash(z, ok) { const tl = tiles[z]; tl.classList.remove('flash-ok', 'flash-bad'); void tl.offsetWidth; tl.classList.add(ok ? 'flash-ok' : 'flash-bad'); }
  function hint(z, level) {
    const e = App.E[z - 1]; const [, y] = tilePos(e);
    App.E.forEach(o => { const [, oy] = tilePos(o); tiles[o.z].classList.toggle('dim', level === 1 ? (oy !== y) : o.z !== z); });
    if (level >= 2) tiles[z].classList.add('hint');
  }
  function clearHint() { App.E.forEach(e => tiles[e.z].classList.remove('hint', 'dim')); }
  function tileRect(z) { return tiles[z].getBoundingClientRect(); }

  return { init, select, flyTo, fit, setMode, setGame, flash, hint, clearHint, tileRect, relang, pz, get sel() { return sel; } };
})();
