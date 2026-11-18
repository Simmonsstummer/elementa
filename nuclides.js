/* Elementa — chart of nuclides (Segrè chart) */
'use strict';
App.nuclides = (() => {
  const vp = $('#nuc-vp'), cv = $('#nuc-canvas'), ctx = cv.getContext('2d');
  const C = 10, MAGIC = [2, 8, 20, 28, 50, 82, 126];
  let all = [], maxN = 0, mode = 'decay', hover = null, focusIso = null, built = false, pz;
  const Y = z => (119 - z) * C, X = n => n * C;

  function colorOf(i, txt) {
    if (mode === 'decay') return i.stable ? txt : isoColorHex(i);
    if (i.stable) return RAMP[RAMP.length - 1];
    if (!i.hl) return '#6b7079';
    return ramp((Math.log10(i.hl) + 22) / 40);
  }
  function isoColorHex(i) { const m = domMode(i); return m ? decayInfo(m).col : '#6b7079'; }

  function build() {
    for (let z = 1; z <= 118; z++) isotopesOf(z).forEach(i => { all.push(i); maxN = Math.max(maxN, i.n); });
    pz = new PanZoom(vp, { min: 0.15, max: 12, onChange: draw, onTap: tap, onHover: hov });
    $('#nuc-mode').onchange = ev => { mode = ev.target.value; legend(); draw(); };
    $$('[data-nzoom]').forEach(b => b.onclick = () => { const r = vp.getBoundingClientRect(), k = b.dataset.nzoom; if (k === 'fit') fit(); else pz.zoomAt(r.width / 2, r.height / 2, k === 'in' ? 1.6 : 1 / 1.6); });
    new ResizeObserver(() => draw()).observe(vp);
    legend(); built = true;
  }
  function legend() {
    const lg = $('#nuc-legend');
    if (mode === 'decay') {
      const L = t('nuc.legend'), items = [[L[0], 'var(--text)'], ['β⁻', DECAY['B-'].col], [L[1], DECAY['B+'].col], ['α', DECAY['A'].col], [L[2], DECAY['SF'].col], [L[3], DECAY['p'].col], [L[4], DECAY['n'].col], [L[5], '#6b7079']];
      lg.innerHTML = items.map(([n, c]) => `<span class="lg-chip" style="--c:${c}"><i></i>${n}</span>`).join('');
    } else lg.innerHTML = `<div class="lg-grad"><span>10⁻²² s</span><span class="bar" style="background:linear-gradient(90deg,${RAMP.join(',')})"></span><span>10¹⁸ s · ${t('w.stable')}</span></div>`;
  }
  function fit(anim = true) {
    const r = vp.getBoundingClientRect(); const w = X(maxN + 2), hh = Y(0) + C;
    const s = clamp(Math.min((r.width - 40) / w, (r.height - 110) / hh), 0.15, 12);
    const x = (r.width - w * s) / 2, y = Math.max(10, (r.height - 70 - hh * s) / 2);
    anim ? pz.animateTo(x, y, s) : pz.set(x, y, s);
  }
  function draw() {
    if (!pz) return;
    const r = vp.getBoundingClientRect(), d = devicePixelRatio || 1;
    if (!r.width) return;
    if (cv.width !== Math.round(r.width * d) || cv.height !== Math.round(r.height * d)) { cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; }
    const cs = getComputedStyle(document.documentElement), txt = cs.getPropertyValue('--text').trim(), muted = cs.getPropertyValue('--muted').trim(), line = cs.getPropertyValue('--line2').trim(), bg = cs.getPropertyValue('--bg').trim();
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, r.width, r.height);
    const s = pz.s, ox = pz.x, oy = pz.y, cp = C * s, gap = cp > 6 ? Math.max(0.5, cp * 0.08) : 0;
    const vis = i => { const x = ox + X(i.n) * s, y = oy + Y(i.z) * s; return x > -cp && y > -cp && x < r.width && y < r.height; };
    // numeri magici
    ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    MAGIC.forEach(m => {
      if (m <= 118) { [Y(m), Y(m) + C].forEach(yy => { ctx.beginPath(); ctx.moveTo(ox, oy + yy * s); ctx.lineTo(ox + X(maxN + 1) * s, oy + yy * s); ctx.stroke(); }); }
      [X(m), X(m) + C].forEach(xx => { ctx.beginPath(); ctx.moveTo(ox + xx * s, oy); ctx.lineTo(ox + xx * s, oy + (Y(0)) * s); ctx.stroke(); });
    });
    ctx.setLineDash([]);
    // caselle
    all.forEach(i => {
      if (!vis(i)) return;
      const x = ox + X(i.n) * s, y = oy + Y(i.z) * s;
      ctx.fillStyle = colorOf(i, txt); ctx.fillRect(x + gap / 2, y + gap / 2, cp - gap, cp - gap);
    });
    // etichette
    if (cp >= 22) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      all.forEach(i => {
        if (!vis(i)) return;
        const x = ox + X(i.n) * s + cp / 2, y = oy + Y(i.z) * s + cp / 2, c = colorOf(i, txt);
        ctx.fillStyle = c.startsWith('rgb') ? inkFor(c) : (i.stable && mode === 'decay' ? bg : inkFor(hexRgb(c)));
        if (cp >= 46) {
          ctx.font = `700 ${Math.min(16, cp * 0.2)}px Inter, sans-serif`; ctx.fillText(`${i.sym}-${i.a}`, x, y - cp * 0.12);
          ctx.font = `${Math.min(11, cp * 0.13)}px JetBrains Mono, monospace`; ctx.fillText(i.stable ? (i.ab ? fmtNum(i.ab, 3) + '%' : t('w.stable')) : i.hl ? fmtTimeShort(i.hl) : '?', x, y + cp * 0.18);
        } else { ctx.font = `600 ${cp * 0.28}px Inter, sans-serif`; ctx.fillText(i.a, x, y); }
      });
    }
    // assi: simboli degli elementi a sinistra di ogni riga
    ctx.textBaseline = 'middle'; ctx.textAlign = 'right'; ctx.fillStyle = muted;
    const step = cp < 4 ? 10 : cp < 9 ? 5 : 1;
    for (let z = 1; z <= 118; z++) {
      if (z % step && step > 1) continue;
      const l = isotopesOf(z); if (!l.length) continue;
      const y = oy + Y(z) * s + cp / 2, x = ox + X(l[0].n) * s - 4;
      if (y < -10 || y > r.height + 10) continue;
      ctx.font = `600 ${clamp(cp * 0.55, 9, 14)}px Inter, sans-serif`; ctx.fillText(cp < 9 ? z : App.E[z - 1].s, x, y);
    }
    ctx.textAlign = 'center'; ctx.font = '10px JetBrains Mono, monospace';
    const nstep = cp < 4 ? 20 : cp < 10 ? 10 : 5;
    for (let n = 0; n <= maxN; n += nstep) ctx.fillText(n, ox + X(n) * s + cp / 2, oy + (Y(0)) * s + 12);
    ctx.fillText(t('nuc.axisN'), ox + X(maxN / 2) * s, oy + Y(0) * s + 28);
    ctx.save(); ctx.translate(Math.max(14, ox - 30), oy + Y(60) * s); ctx.rotate(-Math.PI / 2); ctx.fillText(t('nuc.axisZ'), 0, 0); ctx.restore();
    // evidenziazioni
    [[hover, txt], [focusIso, cs.getPropertyValue('--accent').trim()]].forEach(([i, c]) => {
      if (!i) return; const x = ox + X(i.n) * s, y = oy + Y(i.z) * s;
      ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.strokeRect(x - 2, y - 2, cp + 4, cp + 4);
    });
    if (hover && cp < 46) {
      const x = ox + X(hover.n) * s + cp + 8, y = oy + Y(hover.z) * s;
      const t1 = `${nm(App.E[hover.z - 1])}-${hover.a}`, t2 = hover.stable ? t('w.stable') : hover.hl ? 't½ ' + fmtTime(hover.hl) : t('p.unknownLife');
      ctx.font = '600 13px Inter'; const w = Math.max(ctx.measureText(t1).width, ctx.measureText(t2).width * 0.95) + 20;
      ctx.fillStyle = cs.getPropertyValue('--surface').trim(); ctx.strokeStyle = line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y - 6, w, 44, 8) : ctx.rect(x, y - 6, w, 44); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left'; ctx.fillStyle = txt; ctx.fillText(t1, x + 10, y + 8); ctx.font = '11px JetBrains Mono'; ctx.fillStyle = muted; ctx.fillText(t2, x + 10, y + 26);
    }
  }
  function hexRgb(c) { if (c.startsWith('#')) { const [r, g, b] = hex2rgb(c.length === 4 ? '#' + [...c.slice(1)].map(x => x + x).join('') : c); return `rgb(${r},${g},${b})`; } return 'rgb(200,200,200)'; }
  function at(e) {
    const r = vp.getBoundingClientRect(); const wx = (e.clientX - r.left - pz.x) / pz.s, wy = (e.clientY - r.top - pz.y) / pz.s;
    const n = Math.floor(wx / C), z = 119 - Math.floor(wy / C);
    return z >= 1 && z <= 118 ? isotopesOf(z).find(i => i.n === n) : null;
  }
  function tap(e) { const i = at(e); if (i) { focusIso = i; draw(); App.panel.openIsotope(i.z, i.a, true); } }
  function hov(e) { if (e.pointerType !== 'mouse') return; const i = at(e) || null; if (i !== hover) { hover = i; draw(); } }
  function focus(z, n) {
    focusIso = isotopesOf(z).find(i => i.n === n) || null;
    const r = vp.getBoundingClientRect(), s = 5.5, wide = innerWidth > 820;
    const fw = wide ? r.width - 460 : r.width, fh = wide ? r.height : r.height * 0.3;
    requestAnimationFrame(() => pz.animateTo(fw / 2 - (X(n) + C / 2) * s, fh / 2 - (Y(z) + C / 2) * s, s, 700));
  }
  function show() { if (!built) build(); if (!show._fitted && vp.getBoundingClientRect().width) { fit(false); show._fitted = true; } draw(); }
  function relang() { if (built) { legend(); draw(); } }
  return { show, focus, draw, relang };
})();
