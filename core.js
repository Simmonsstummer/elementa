/* Elementa — core: data, helpers, pan/zoom */
'use strict';
const App = { E: [], bySym: {}, iso: {}, ui: {} };

const catName = sr => t('cats')[sr];
const SR_LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const catVar = sr => `var(--c-${sr})`;
const NOBLE = { He: '1s2', Ne: '[He] 2s2 2p6', Ar: '[Ne] 3s2 3p6', Kr: '[Ar] 3d10 4s2 4p6', Xe: '[Kr] 4d10 5s2 5p6', Rn: '[Xe] 4f14 5d10 6s2 6p6' };
const LNUM = { s: 0, p: 1, d: 2, f: 3 };
const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺' };
const sup = s => String(s).split('').map(c => SUP[c] || c).join('');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const h = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); for (const k in attrs) { if (k === 'style') e.style.cssText = attrs[k]; else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]); } if (html) e.innerHTML = html; return e; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const store = {
  get(k, d) { try { const v = localStorage.getItem('elementa:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('elementa:' + k, JSON.stringify(v)); } catch (e) { } }
};

/* ---------- numeri ---------- */
function fmtNum(v, d = 3) {
  if (v == null || isNaN(v)) return '—';
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-3 || a >= 1e7)) { const ex = Math.floor(Math.log10(a)); return (v / 10 ** ex).toLocaleString(LOC(), { maximumFractionDigits: 2 }) + ' × 10' + sup(ex); }
  return v.toLocaleString(LOC(), { maximumFractionDigits: a < 10 ? d : a < 1000 ? 2 : 0 });
}
const fmtMass = m => m == null ? '—' : m.toLocaleString(LOC(), { maximumFractionDigits: m < 100 ? 3 : 2 });
const fmtIsoMass = m => m == null ? '—' : m.toLocaleString(LOC(), { maximumFractionDigits: 6 });
const fmtPct = p => p == null ? '' : p < 0.01 ? '< ' + fmtNum(0.01, 2) : fmtNum(p, 3);
const K2C = k => k == null ? null : k - 273.15;
function fmtTemp(k) { if (k == null) return '—'; return `${fmtNum(Math.round(K2C(k) * 10) / 10)} °C`; }

const YEAR = 3.15576e7;
function fmtTime(s) {
  if (s == null) return t('unknown');
  const U = t('units'), f = (v) => v.toLocaleString(LOC(), { maximumFractionDigits: v < 10 ? 2 : v < 100 ? 1 : 0 });
  if (s < 1e-21) return f(s / 1e-24) + ' ys';
  if (s < 1e-18) return f(s / 1e-21) + ' zs';
  if (s < 1e-15) return f(s / 1e-18) + ' as';
  if (s < 1e-12) return f(s / 1e-15) + ' fs';
  if (s < 1e-9) return f(s / 1e-12) + ' ps';
  if (s < 1e-6) return f(s / 1e-9) + ' ns';
  if (s < 1e-3) return f(s / 1e-6) + ' µs';
  if (s < 1) return f(s / 1e-3) + ' ms';
  if (s < 60) return f(s) + ' s';
  if (s < 3600) return f(s / 60) + ' min';
  if (s < 86400) return f(s / 3600) + U.h;
  const y = s / YEAR;
  if (y < 1) return f(s / 86400) + U.d;
  if (y < 1e3) return f(y) + U.y;
  if (y < 1e6) return f(y / 1e3) + U.ky;
  if (y < 1e9) return f(y / 1e6) + U.My;
  if (y < 1e12) return f(y / 1e9) + U.Gy;
  const ex = Math.floor(Math.log10(y));
  return f(y / 10 ** ex) + ' × 10' + sup(ex) + U.y;
}
function fmtTimeShort(s) {
  if (s == null) return '?';
  const U = t('unitsShort'), y = s / YEAR, f = v => v.toLocaleString(LOC(), { maximumFractionDigits: v < 10 ? 1 : 0 });
  if (y < 1) return fmtTime(s).replace(t('units').d, U.d).replace(t('units').h, ' h');
  if (y < 1e3) return f(y) + U.y;
  if (y < 1e6) return f(y / 1e3) + ' ka';
  if (y < 1e9) return f(y / 1e6) + ' Ma';
  if (y < 1e12) return f(y / 1e9) + ' Ga';
  const ex = Math.floor(Math.log10(y)); return '10' + sup(ex) + U.y;
}
function timeCompare(s) {
  if (s == null) return '';
  const y = s / YEAR, C = t('compare');
  if (s < 1e-9) return C.light;
  if (s < 0.1) return C.blink;
  if (s < 60) return C.count(Math.max(1, Math.round(s)));
  if (s < 3600) return C.cartoon;
  if (s < 86400) return C.day;
  if (y < 1) return C.year;
  if (y < 100) return C.life;
  if (y < 2779) return C.rome;
  if (y < 3e5) return C.history;
  if (y < 6.6e7) return C.species;
  if (y < 1e9) return C.dinos;
  if (y < 1.38e10) return C.earth;
  return C.universe(fmtNum(y / 1.38e10, 2));
}

/* ---------- configurazione elettronica ---------- */
function parseEC(ec) {
  const out = [];
  (ec || '').split(/\s+/).forEach(t => {
    if (!t) return;
    const m = t.match(/^\[(\w+)\]$/);
    if (m) { out.push(...parseEC(NOBLE[m[1]])); return; }
    const o = t.match(/^(\d)([spdf])(\d*)$/);
    if (o) out.push({ n: +o[1], l: o[2], e: o[3] ? +o[3] : 1 });
  });
  return out;
}
function orbitals(e) {
  if (!e._orb) e._orb = parseEC(e.ec).sort((a, b) => a.n - b.n || LNUM[a.l] - LNUM[b.l]);
  return e._orb;
}
function shells(e) {
  const s = []; orbitals(e).forEach(o => { s[o.n - 1] = (s[o.n - 1] || 0) + o.e; });
  return [...s].map(v => v || 0);
}
function ecHTML(e, short = true) {
  const src = short ? e.ec : orbitals(e).map(o => `${o.n}${o.l}${o.e}`).join(' ');
  return src.split(/\s+/).map(t => { const o = t.match(/^(\d)([spdf])(\d*)$/); return o ? `${o[1]}${o[2]}<sup>${o[3] || 1}</sup>` : t; }).join(' ');
}

/* ---------- isotopi ---------- */
// iso: [A, mass, abundance, stable, halfLife(s), modes[[m,%]], spin, discYear]
function isoObj(z, r) {
  return { z, a: r[0], n: r[0] - z, mass: r[1], ab: r[2], stable: !!r[3], hl: r[4], modes: r[5], spin: r[6], disc: r[7], sym: App.E[z - 1].s };
}
function isotopesOf(z) { if (!App.iso[z]) App.iso[z] = App.E[z - 1].iso.map(r => isoObj(z, r)); return App.iso[z]; }
function findIso(z, a) { if (z < 1 || z > 118) return null; return isotopesOf(z).find(i => i.a === a) || null; }
function mainIso(e) {
  const l = isotopesOf(e.z);
  if (!l.length) return null;
  const nat = l.filter(i => i.ab).sort((a, b) => b.ab - a.ab);
  if (nat.length) return nat[0];
  return [...l].sort((a, b) => (b.hl || 0) - (a.hl || 0))[0];
}
function longestHL(e) {
  const l = isotopesOf(e.z); if (!l.length) return null;
  if (l.some(i => i.stable)) return Infinity;
  return Math.max(...l.map(i => i.hl || 0)) || null;
}
// decay modes: label, change in Z and A, colour; names and explanations are in i18n.js
const DECAY = {
  'A': { lab: 'α', dz: -2, da: -4, col: '#f2c94c' }, 'B-': { lab: 'β⁻', dz: 1, da: 0, col: '#56a8ff' },
  'B+': { lab: 'β⁺', dz: -1, da: 0, col: '#ff7a59' }, 'e+': { lab: 'β⁺', dz: -1, da: 0, col: '#ff7a59' },
  'EC': { lab: 'EC', dz: -1, da: 0, col: '#ff9d6b' }, 'EC+B+': { lab: 'EC/β⁺', dz: -1, da: 0, col: '#ff7a59' },
  '2B-': { lab: '2β⁻', dz: 2, da: 0, col: '#3d7be0' }, '2B+': { lab: '2β⁺', dz: -2, da: 0, col: '#e0532d' },
  'SF': { lab: 'SF', dz: null, col: '#4cc38a' },
  'p': { lab: 'p', dz: -1, da: -1, col: '#b07cff' }, '2p': { lab: '2p', dz: -2, da: -2, col: '#9a5cff' }, '3p': { lab: '3p', dz: -3, da: -3, col: '#9a5cff' },
  'n': { lab: 'n', dz: 0, da: -1, col: '#8fd3ff' }, '2n': { lab: '2n', dz: 0, da: -2, col: '#8fd3ff' }, '3n': { lab: '3n', dz: 0, da: -3, col: '#8fd3ff' }, '4n': { lab: '4n', dz: 0, da: -4, col: '#8fd3ff' },
  'B-n': { lab: 'β⁻n', dz: 1, da: -1, col: '#56a8ff' }, 'B-2n': { lab: 'β⁻2n', dz: 1, da: -2, col: '#56a8ff' },
  'B-p': { lab: 'β⁻p', dz: 0, da: -1, col: '#56a8ff' }, 'B-d': { lab: 'β⁻d', dz: 0, da: -2, col: '#56a8ff' }, 'B-t': { lab: 'β⁻t', dz: 0, da: -3, col: '#56a8ff' },
  'B-A': { lab: 'β⁻α', dz: -1, da: -4, col: '#56a8ff' }, 'B-SF': { lab: 'β⁻SF', dz: null, col: '#56a8ff' },
  'B+p': { lab: 'β⁺p', dz: -2, da: -1, col: '#ff7a59' }, 'B+A': { lab: 'β⁺α', dz: -3, da: -4, col: '#ff7a59' },
  'B+pA': { lab: 'β⁺pα', dz: -4, da: -5, col: '#ff7a59' }, 'B+SF': { lab: 'β⁺SF', dz: null, col: '#ff7a59' },
};
function decayInfo(m) {
  const D = t('decay');
  if (DECAY[m]) { const [name, txt] = D[m] || [m, '']; const lab = App.lang === 'it' ? DECAY[m].lab.replace('SF', 'FS').replace('EC', 'CE') : DECAY[m].lab; return { ...DECAY[m], lab, name, txt }; }
  const c = m.match(/^(\d+)([A-Z][a-z]?)$/);
  if (c && App.bySym[c[2]]) {
    const el = App.bySym[c[2]];
    return { lab: m.replace(/^\d+/, d => sup(d)), name: D.cluster(c[2], c[1]), dz: -el.z, da: -(+c[1]), col: '#e07bd0', txt: D.clusterTxt(nm(el).toLowerCase(), c[1]) };
  }
  return { lab: m, name: m, dz: null, col: '#999', txt: '' };
}
function domMode(iso) {
  if (!iso.modes.length) return null;
  let best = iso.modes[0];
  iso.modes.forEach(m => { if (m[1] != null && (best[1] == null || m[1] > best[1])) best = m; });
  return best[0];
}
function daughter(iso, m) {
  const d = decayInfo(m); if (d.dz == null) return null;
  return findIso(iso.z + d.dz, iso.a + d.da) || { z: iso.z + d.dz, a: iso.a + d.da, missing: true };
}
function decayChain(iso) {
  const chain = [iso]; let cur = iso;
  for (let i = 0; i < 40; i++) {
    if (cur.stable || cur.missing) break;
    const m = domMode(cur); if (!m) break;
    const d = daughter(cur, m);
    if (!d) { cur.endMode = m; break; }
    cur.nextMode = m;
    chain.push(d); cur = d;
    if (d.missing) break;
  }
  return chain;
}
function isoColor(iso) {
  if (iso.stable) return 'var(--text)';
  const m = domMode(iso); if (!m) return '#7a7f88';
  return decayInfo(m).col;
}

/* ---------- colori scalari ---------- */
const RAMP = ['#4b2bd6', '#2f6cff', '#00b8ff', '#00e0a4', '#9cf02e', '#ffd000', '#ff8a00', '#ff2e4d'];
function hex2rgb(x) { const n = parseInt(x.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function ramp(t, stops = RAMP) {
  t = clamp(t, 0, 1); const p = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(p)), f = p - i;
  const a = hex2rgb(stops[i]), b = hex2rgb(stops[i + 1]);
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function inkFor(rgb) { const m = rgb.match(/\d+/g).map(Number); const L = (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255; return L > 0.6 ? '#15161a' : '#f5f3ee'; }

/* ---------- translations of mendeleev fields ---------- */
function trProducers(s) {
  if (!s) return null;
  const C = App.lang === 'it' ? COUNTRY_IT : {};
  return s.split(/\s*\d\)\s*/).filter(Boolean).map(c => C[c.trim()] || c.trim()).join(', ');
}
const latticeName = k => t('lattice')[k] || null;
const geoName = k => t('geo')[k] || k;

/* ---------- stato fisico ---------- */
function stateAt(e, T) {
  if (e.mp == null && e.bp == null) return null;
  if (e.bp != null && T >= e.bp) return 'gas';
  if (e.sub) return 'solid';
  if (e.mp == null) return 'liquid';
  return T >= e.mp ? 'liquid' : 'solid';
}
const STATE = { solid: { c: '#9aa3b2' }, liquid: { c: '#4aa8ff' }, gas: { c: '#ff8a65' } };
const stateName = k => t('states')[k];

/* ---------- pan & zoom (mouse, rotella, touch, pinch) ---------- */
class PanZoom {
  constructor(el, o) {
    this.el = el; this.o = Object.assign({ min: 0.1, max: 8 }, o);
    this.x = 0; this.y = 0; this.s = 1; this.ptrs = new Map(); this.vx = 0; this.vy = 0;
    el.addEventListener('pointerdown', e => this.down(e));
    el.addEventListener('pointermove', e => this.move(e));
    el.addEventListener('pointerup', e => this.up(e));
    el.addEventListener('pointercancel', e => this.up(e, true));
    el.addEventListener('wheel', e => this.wheel(e), { passive: false });
    el.addEventListener('dblclick', e => { if (this.o.onDouble) this.o.onDouble(e); });
  }
  set(x, y, s) { this.x = x; this.y = y; this.s = s; this.o.onChange && this.o.onChange(this); }
  zoomAt(px, py, f) {
    const s = clamp(this.s * f, this.o.min, this.o.max); const k = s / this.s;
    this.set(px - (px - this.x) * k, py - (py - this.y) * k, s);
  }
  rel(e) { const r = this.el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  down(e) {
    if (e.button > 0) return;
    this.el.setPointerCapture(e.pointerId);
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
    this.moved = this.ptrs.size > 1 ? true : false; this.startT = performance.now();
    cancelAnimationFrame(this.inertia); this.vx = this.vy = 0;
    if (this.ptrs.size === 2) { const [a, b] = [...this.ptrs.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; }
  }
  move(e) {
    const p = this.ptrs.get(e.pointerId);
    if (!p) { this.o.onHover && this.o.onHover(e); return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (Math.hypot(p.x - p.sx, p.y - p.sy) > 6) { if (!this.moved) this.el.classList.add('dragging'); this.moved = true; }
    if (this.ptrs.size === 1) {
      if (this.moved) { this.set(this.x + dx, this.y + dy, this.s); const now = performance.now(), dt = Math.max(1, now - (this.lastT || now)); this.vx = dx / dt * 16; this.vy = dy / dt * 16; this.lastT = now; }
    } else if (this.ptrs.size === 2) {
      const [a, b] = [...this.ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = this.el.getBoundingClientRect(); const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
      if (this.pinch) {
        const f = d / this.pinch.d; const pm = this.pinch.m || [mx, my];
        this.x += mx - pm[0]; this.y += my - pm[1];
        this.zoomAt(mx, my, f);
      }
      this.pinch = { d, m: [mx, my] };
    }
  }
  up(e, cancel) {
    const p = this.ptrs.get(e.pointerId); if (!p) return;
    this.ptrs.delete(e.pointerId);
    if (this.ptrs.size < 2) this.pinch = null;
    if (this.ptrs.size === 0) {
      this.el.classList.remove('dragging');
      if (!this.moved && !cancel) { this.o.onTap && this.o.onTap(e); }
      else if (this.moved && performance.now() - (this.lastT || 0) < 60 && Math.hypot(this.vx, this.vy) > 1.5) this.glide();
      this.lastT = 0;
    }
  }
  glide() {
    const step = () => { this.vx *= 0.92; this.vy *= 0.92; this.set(this.x + this.vx, this.y + this.vy, this.s); if (Math.hypot(this.vx, this.vy) > 0.3) this.inertia = requestAnimationFrame(step); };
    this.inertia = requestAnimationFrame(step);
  }
  wheel(e) {
    e.preventDefault();
    const [px, py] = this.rel(e);
    if (e.ctrlKey || e.deltaMode === 1 || Math.abs(e.deltaY) > 40 && !e.deltaX) { this.zoomAt(px, py, Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0018))); }
    else this.set(this.x - e.deltaX, this.y - e.deltaY, this.s);
  }
  animateTo(x, y, s, ms = 450) {
    cancelAnimationFrame(this.anim); const x0 = this.x, y0 = this.y, s0 = this.s, t0 = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3);
    const step = now => { const t = Math.min(1, (now - t0) / ms), k = ease(t);
      // interpolazione logaritmica della scala per un volo più naturale
      const s1 = s0 * Math.pow(s / s0, k);
      this.set(x0 + (x - x0) * k, y0 + (y - y0) * k, s1); if (t < 1) this.anim = requestAnimationFrame(step); };
    this.anim = requestAnimationFrame(step);
  }
  fit(w, h, pad = 24, maxS = 4) {
    const r = this.el.getBoundingClientRect();
    const s = clamp(Math.min((r.width - pad * 2) / w, (r.height - pad * 2) / h), this.o.min, maxS);
    return [(r.width - w * s) / 2, (r.height - h * s) / 2, s];
  }
}

/* ---------- feedback ---------- */
function toast(msg, ms = 1800) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), ms); }
function confetti(x, y, n = 70) {
  const c = $('#fx'), ctx = c.getContext('2d'); c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  const cols = ['#f0c36a', '#5fd38d', '#56a8ff', '#ff7a59', '#c39bff', '#ff8bd0'];
  const ps = Array.from({ length: n }, () => ({ x, y, vx: (Math.random() - .5) * 12, vy: -Math.random() * 11 - 3, r: Math.random() * 5 + 3, c: cols[Math.random() * cols.length | 0], a: Math.random() * 6, life: 1 }));
  let raf; const step = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight); let alive = 0;
    ps.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.a += .2; p.life -= .012; if (p.life > 0) { alive++; ctx.globalAlpha = p.life; ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); } });
    if (alive) raf = requestAnimationFrame(step); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  }; step();
}
