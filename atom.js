/* Elementa — animated atom model: nucleus (protons + neutrons) and electron shells */
'use strict';
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const GOLD = Math.PI * (3 - Math.sqrt(5));
const PCOL = '#ff5f5f', NCOL = '#a9b1bf', ECOL = '#4cc3ff';

function shellsForElectrons(ne) {
  if (ne <= 0) return [];
  const e = App.E[Math.min(118, ne) - 1];
  return shells(e);
}

class AtomView {
  constructor(canvas, opt = {}) {
    this.c = canvas; this.ctx = canvas.getContext('2d'); this.mode = opt.mode || 'bohr';
    this.labels = opt.labels !== false; this.t0 = performance.now(); this.running = false;
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas);
    this.set(opt.z || 1, opt.n || 0, opt.e ?? opt.z ?? 1);
  }
  set(z, n, e) {
    this.z = z; this.n = n; this.e = e; this.sh = shellsForElectrons(e);
    const A = z + n, r = rng(z * 7919 + n * 31 + 7);
    const arr = Array(z).fill(1).concat(Array(n).fill(0));
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; }
    this.nuc = arr.map((p, i) => ({ p, i, ph: r() * 6.28, sp: 1.5 + r() * 2 }));
    this.A = A; this.phase = this.sh.map(() => r() * 6.28);
    this.cloud = null; this.resize(); this.start();
  }
  resize() {
    const w = this.c.clientWidth || 300, hgt = this.c.clientHeight || w, d = devicePixelRatio || 1;
    if (this.c.width !== Math.round(w * d) || this.c.height !== Math.round(hgt * d)) { this.c.width = Math.round(w * d); this.c.height = Math.round(hgt * d); }
    this.W = w; this.H = hgt; this.ctx.setTransform(d, 0, 0, d, 0, 0); this.draw(performance.now());
  }
  start() { if (this.running) return; this.running = true; const loop = now => { if (!this.c.isConnected) { this.running = false; this.ro.disconnect(); return; } if (this.c.offsetParent !== null) this.draw(now); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  geom() {
    const S = Math.max(1, this.sh.length), maxR = Math.min(this.W, this.H) / 2 - 16;
    const rN = !this.A ? 0 : this.bigNucleus ? Math.min(this.W, this.H) / 2 * (0.35 + 0.5 * Math.cbrt(this.A) / Math.cbrt(300)) : maxR * (0.07 + 0.13 * Math.cbrt(this.A) / Math.cbrt(300));
    const inner = rN + Math.max(16, maxR * 0.12);
    const radii = this.sh.map((_, i) => S === 1 ? (inner + maxR) / 2 : inner + (maxR - inner) * i / (S - 1));
    return { maxR, rN, radii, cx: this.W / 2, cy: this.H / 2 };
  }
  draw(now) {
    const ctx = this.ctx, t = (now - this.t0) / 1000, g = this.geom(), cs = getComputedStyle(document.documentElement);
    const line = cs.getPropertyValue('--line2').trim() || '#444', muted = cs.getPropertyValue('--muted').trim() || '#888';
    ctx.clearRect(0, 0, this.W, this.H);
    // gusci
    if (this.mode === 'bohr') {
      g.radii.forEach((r, i) => {
        ctx.beginPath(); ctx.arc(g.cx, g.cy, r, 0, 6.283); ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.stroke();
        if (this.labels) { ctx.fillStyle = muted; ctx.font = '600 10px JetBrains Mono, monospace'; ctx.textAlign = 'left'; ctx.fillText('KLMNOPQ'[i] + ' ' + this.sh[i], g.cx + r * 0.707 + 4, g.cy - r * 0.707 - 4); }
      });
    } else {
      // nuvola: un alone per ogni guscio, più denso dove ci sono più elettroni, più i punti dove «potrebbe» essere un elettrone
      const light = document.documentElement.dataset.theme === 'light', col = light ? '0,120,200' : '76,195,255';
      g.radii.forEach((r, i) => {
        const sd = (g.maxR - g.rN) / (this.sh.length * 2.6 + 1), r0 = Math.max(g.rN + 2, r - 2.6 * sd), r1 = r + 2.6 * sd;
        const a = Math.min(light ? 0.42 : 0.5, (light ? 0.14 : 0.16) + 0.035 * this.sh[i]);
        const gr = ctx.createRadialGradient(g.cx, g.cy, r0, g.cx, g.cy, r1), mid = clamp((r - r0) / (r1 - r0), 0.05, 0.95);
        gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(mid, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(g.cx, g.cy, r1, 0, 6.283); ctx.arc(g.cx, g.cy, r0, 0, 6.283, true); ctx.fill();
        const cnt = this.sh[i] * 40;
        ctx.fillStyle = light ? '#0a7fd0' : ECOL;
        for (let k = 0; k < cnt; k++) {
          const an = Math.random() * 6.283, u = (Math.random() + Math.random() + Math.random() - 1.5) * 1.6;
          const rr = Math.max(g.rN + 3, r + u * sd);
          ctx.globalAlpha = 0.4 + Math.random() * 0.5;
          ctx.beginPath(); ctx.arc(g.cx + Math.cos(an) * rr, g.cy + Math.sin(an) * rr, 1.5, 0, 6.283); ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
    }
    // nucleo
    const A = this.A;
    if (A) {
      const rs = A === 1 ? g.rN * 0.55 : Math.max(1.6, g.rN / Math.sqrt(A) * 1.08);
      const pts = this.nuc.map((q, i) => {
        const rr = A === 1 ? 0 : g.rN * Math.sqrt((i + 0.5) / A) * 0.95, a = i * GOLD;
        const j = rs * 0.12; return { q, x: g.cx + Math.cos(a) * rr + Math.sin(t * q.sp + q.ph) * j, y: g.cy + Math.sin(a) * rr + Math.cos(t * q.sp * 1.1 + q.ph) * j, rr };
      }).sort((a, b) => b.rr - a.rr);
      pts.forEach(p => {
        const col = p.q.p ? PCOL : NCOL;
        const gr = ctx.createRadialGradient(p.x - rs * .35, p.y - rs * .35, rs * .1, p.x, p.y, rs);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, col); gr.addColorStop(1, shade(col, -0.45));
        ctx.beginPath(); ctx.arc(p.x, p.y, rs, 0, 6.283); ctx.fillStyle = gr; ctx.fill();
      });
    }
    // elettroni
    if (this.mode === 'bohr') {
      g.radii.forEach((r, i) => {
        const ne = this.sh[i], w = 0.9 / Math.pow(i + 1, 1.25) * (i % 2 ? -1 : 1);
        for (let k = 0; k < ne; k++) {
          const a = this.phase[i] + t * w + k * 6.283 / ne, x = g.cx + Math.cos(a) * r, y = g.cy + Math.sin(a) * r;
          const er = Math.max(2.2, Math.min(5, 90 / (this.e + 12)));
          const gl = ctx.createRadialGradient(x, y, 0, x, y, er * 3);
          gl.addColorStop(0, 'rgba(76,195,255,.55)'); gl.addColorStop(1, 'rgba(76,195,255,0)');
          ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, er * 3, 0, 6.283); ctx.fill();
          ctx.fillStyle = ECOL; ctx.beginPath(); ctx.arc(x, y, er, 0, 6.283); ctx.fill();
        }
      });
    }
  }
}
function shade(hex, f) { const [r, g, b] = hex2rgb(hex); const k = 1 + f; return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`; }

/* mini atomo statico (SVG) per le caselle a forte zoom */
function miniAtomSVG(e) {
  const sh = shells(e), S = sh.length; let s = '<svg class="mini-atom" viewBox="-12 -12 24 24">';
  sh.forEach((n, i) => { const r = 3 + 8.5 * (i + 1) / S; s += `<circle r="${r}" fill="none" stroke="currentColor" stroke-width=".35" opacity=".5"/>`;
    const m = Math.min(n, 18); for (let k = 0; k < m; k++) { const a = k * 6.283 / m + i; s += `<circle cx="${(Math.cos(a) * r).toFixed(2)}" cy="${(Math.sin(a) * r).toFixed(2)}" r=".7" fill="${ECOL}"/>`; } });
  return s + `<circle r="2.4" fill="${PCOL}"/></svg>`;
}
