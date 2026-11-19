/* Elementa — molecule lab: join atoms into molecules, recognise them, look at them in 3D, collect them in an album */
'use strict';

/* ---------- 3D viewer (ball-and-stick or space-filling) on a canvas ---------- */
const MCOL = { H: '#f4f4f4', C: '#50555f', N: '#3d6bff', O: '#ff3b3b', S: '#f5c518', P: '#ff8c1a', F: '#9be15d', Cl: '#2fd16a', Na: '#a663ff', K: '#8b45e0', Ca: '#3fb6a8' };
const MRAD = { H: 0.26, C: 0.38, N: 0.37, O: 0.36, F: 0.34, S: 0.46, P: 0.46, Cl: 0.45, Na: 0.52, K: 0.56, Ca: 0.52 };   // ball size (Å)
const VDW = { H: 1.1, C: 1.7, N: 1.55, O: 1.52, F: 1.47, S: 1.8, P: 1.8, Cl: 1.75, Na: 2.0, K: 2.2, Ca: 2.0 };          // space-filling (Å)
const molInk = el => ['H', 'S', 'F'].includes(el) ? '#1a1b1f' : '#fff';
function shade(hex, k) {   // k > 0 lighter, k < 0 darker
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, n >> 8 & 255, n & 255].map(v => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)));
  return `rgb(${c})`;
}

class Mol3D {
  constructor(cv, mol) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.mode = 'ball'; this.zoom = 1;
    this.yaw = 0.5; this.pitch = -0.3; this.auto = true; this.drag = null; this.rest = 0;
    this.set(mol);
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', e => { this.drag = { x: e.clientX, y: e.clientY }; this.auto = false; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => {
      if (!this.drag) return;
      this.yaw += (e.clientX - this.drag.x) * 0.012; this.pitch = clamp(this.pitch + (e.clientY - this.drag.y) * 0.012, -1.5, 1.5);
      this.drag = { x: e.clientX, y: e.clientY };
    });
    const up = () => { this.drag = null; this.rest = performance.now(); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); this.zoom = clamp(this.zoom * (e.deltaY < 0 ? 1.1 : 0.9), 0.5, 3); }, { passive: false });
    const loop = () => { if (!cv.isConnected) return; this.draw(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  set(mol) {
    this.m = mol;
    this.R = Math.max(1, ...mol.atoms.map(([, x, y, z]) => Math.hypot(x, y, z)));
  }
  draw() {
    const cv = this.cv, dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = this.ctx; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    if (!this.drag && !this.auto && performance.now() - this.rest > 2500) this.auto = true;
    if (this.auto) this.yaw += 0.006;
    const space = this.mode === 'space', pad = space ? 1.9 : 0.7;
    const s = Math.min(w, h) / 2 / (this.R + pad) * this.zoom, D = (this.R + 2) * 5;
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const P = this.m.atoms.map(([el, x, y, z]) => {
      const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp, k = D / (D - z2);
      return { el, z: z2, k, X: w / 2 + x1 * s * k, Y: h / 2 - y2 * s * k };
    });
    const items = P.map((p, i) => ({ t: 'a', i, z: p.z }));
    // each bond is drawn as two halves, each just before its own atom, so spheres always cover their bonds
    if (!space) this.m.bonds.forEach(([a, b, o]) => { items.push({ t: 'b', a, b, o, z: P[a].z - 0.001 }); items.push({ t: 'b', a: b, b: a, o, z: P[b].z - 0.001 }); });
    items.sort((p, q) => p.z - q.z);
    for (const it of items) {
      if (it.t === 'b') {
        const A = P[it.a], B = P[it.b], dx = B.X - A.X, dy = B.Y - A.Y, L = Math.hypot(dx, dy) || 1, sg = it.a < it.b ? 1 : -1, nx = -dy / L * sg, ny = dx / L * sg;
        const lw = Math.max(2, 0.13 * s * (A.k + B.k) / 2), gap = it.o > 1 ? lw * 1.35 : 0;
        for (let j = 0; j < it.o; j++) {
          const off = (j - (it.o - 1) / 2) * gap, ox = nx * off, oy = ny * off, mx = (A.X + B.X) / 2 + ox, my = (A.Y + B.Y) / 2 + oy;
          c.lineCap = 'round'; c.lineWidth = it.o > 1 ? lw * 0.75 : lw;
          c.strokeStyle = shade(MCOL[A.el], -0.25); c.beginPath(); c.moveTo(A.X + ox, A.Y + oy); c.lineTo(mx, my); c.stroke();
        }
      } else {
        const p = P[it.i], r = (space ? VDW[p.el] * 0.95 : MRAD[p.el]) * s * p.k, col = MCOL[p.el];
        const g = c.createRadialGradient(p.X - r * 0.35, p.Y - r * 0.4, r * 0.1, p.X, p.Y, r);
        g.addColorStop(0, shade(col, 0.55)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, -0.45));
        c.fillStyle = g; c.beginPath(); c.arc(p.X, p.Y, r, 0, 7); c.fill();
        if (r > 9 && (!space || p.el !== 'H' || r > 14)) {
          c.fillStyle = molInk(p.el); c.globalAlpha = 0.85; c.font = `700 ${Math.min(18, r * 0.75) | 0}px Inter,system-ui,sans-serif`;
          c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.el, p.X, p.Y + 1); c.globalAlpha = 1;
        }
      }
    }
  }
}

/* ---------- the lab ---------- */
App.lab = (() => {
  const root = $('#play-root');
  const VAL = { H: [1], C: [4], N: [3], O: [2], S: [2, 4, 6], P: [3, 5], F: [1], Cl: [1], Na: [1], K: [1], Ca: [2] };
  const PALETTE = ['H', 'C', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Na', 'K', 'Ca'];
  const ZOF = { H: 1, C: 6, N: 7, O: 8, F: 9, Na: 11, P: 15, S: 16, Cl: 17, K: 19, Ca: 20 };
  const RAD = el => el === 'H' ? 17 : ['S', 'P', 'Cl', 'Na', 'K', 'Ca'].includes(el) ? 24 : 22;
  const MISSIONS = ['h2', 'o2', 'h2o', 'co2', 'ch4', 'nh3', 'hcl', 'n2', 'h2o2', 'cl2', 'c2h6', 'c2h4', 'c2h2', 'ch3oh', 'ethanol', 'nacl', 'ch2o',
    'hcooh', 'h2s', 'naoh', 'kcl', 'acetic', 'acetone', 'urea', 'so2', 'cacl2', 'cao', 'c3h8', 'hf', 'f2', 'ipa', 'glycol', 'h2co3', 'nahco3',
    'naclo', 'chcl3', 'cfc12', 'glycine', 'glycerol', 'h2so4', 'h3po4', 'c4h10', 'c6h6'];
  const SUBS = '₀₁₂₃₄₅₆₇₈₉', sub = s => String(s).replace(/\d/g, d => SUBS[d]);
  let M = null, byId = {}, loading = null;
  let S = { atoms: [], bonds: [], sel: null, next: 1 }, undo = [], view = 'lab', target = null, last = null, svgSize = { w: 600, h: 420 };

  const mtx = m => m.tx[App.lang];
  const album = () => store.get('molecules', []);
  const buildable = () => M.filter(m => m.k !== 's');
  function load() {
    if (M) return Promise.resolve();
    return loading = loading || fetch('molecules.json').then(r => r.json()).then(d => {
      M = d; M.forEach(m => {
        byId[m.id] = m; const cnt = {}; m.atoms.forEach(([el]) => cnt[el] = (cnt[el] || 0) + 1); m.key = countKey(cnt);
      });
      MISSIONS.push(...buildable().map(m => m.id).filter(id => !MISSIONS.includes(id)));
    });
  }
  const countKey = cnt => Object.keys(cnt).sort().map(k => k + cnt[k]).join('');
  function hill(cnt) {
    let ks = Object.keys(cnt).sort();
    if (cnt.C) ks = ['C', ...(cnt.H ? ['H'] : []), ...ks.filter(k => k !== 'C' && k !== 'H')];
    return ks.map(k => k + (cnt[k] > 1 ? sub(cnt[k]) : '')).join('');
  }

  /* --- graph helpers --- */
  const atom = id => S.atoms.find(a => a.id === id);
  const bondsOf = id => S.bonds.filter(b => b.a === id || b.b === id);
  const used = id => bondsOf(id).reduce((s, b) => s + b.o, 0);
  const canAdd = (id, k = 1) => { const u = used(id); return VAL[atom(id).el].some(v => v >= u + k); };
  const hands = id => { const u = used(id), v = VAL[atom(id).el].find(v => v >= u); return v === undefined ? 0 : v - u; };
  const done = id => VAL[atom(id).el].includes(used(id));
  const findBond = (a, b) => S.bonds.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  const other = (b, id) => b.a === id ? b.b : b.a;
  function snap() { undo.push(JSON.stringify(S)); if (undo.length > 60) undo.shift(); }
  function components() {
    const seen = new Set(); let n = 0;
    for (const a of S.atoms) {
      if (seen.has(a.id)) continue; n++;
      const st = [a.id]; seen.add(a.id);
      while (st.length) { const x = st.pop(); bondsOf(x).forEach(b => { const y = other(b, x); if (!seen.has(y)) { seen.add(y); st.push(y); } }); }
    }
    return n;
  }
  // a free direction around an atom, away from its bonds and nearby atoms
  function freeAngle(a) {
    const taken = bondsOf(a.id).map(b => { const o = atom(other(b, a.id)); return Math.atan2(o.y - a.y, o.x - a.x); });
    if (!taken.length) return -Math.PI / 2 + (S.atoms.length % 4) * Math.PI / 2;
    let best = 0, bestGap = -1;
    for (let k = 0; k < 24; k++) {
      const ang = k * Math.PI / 12, gap = Math.min(...taken.map(t => Math.abs(Math.atan2(Math.sin(ang - t), Math.cos(ang - t)))));
      const crowd = S.atoms.some(o => o !== a && Math.hypot(a.x + Math.cos(ang) * 58 - o.x, a.y + Math.sin(ang) * 58 - o.y) < 34);
      const score = gap - (crowd ? 2 : 0);
      if (score > bestGap) { bestGap = score; best = ang; }
    }
    return best;
  }
  function freeSpot() {
    const { w, h } = svgSize;
    for (let i = 0; i < 400; i++) {
      const r = 14 * Math.sqrt(i), ang = i * 2.39996, x = w / 2 + r * Math.cos(ang), y = h / 2 + r * Math.sin(ang);
      if (x < 30 || y < 30 || x > w - 30 || y > h - 30) continue;
      if (!S.atoms.some(o => Math.hypot(o.x - x, o.y - y) < 62)) return { x, y };
    }
    return { x: w / 2 + (Math.random() - 0.5) * 80, y: h / 2 + (Math.random() - 0.5) * 80 };
  }
  const keepIn = a => { a.x = clamp(a.x, 26, svgSize.w - 26); a.y = clamp(a.y, 26, svgSize.h - 26); };

  /* --- actions --- */
  function addAtom(el) {
    if (S.atoms.length >= 48) { toast(t('lab.max')); return; }
    snap();
    const sel = S.sel && atom(S.sel), a = { id: S.next++, el, x: 0, y: 0 };
    if (sel && canAdd(sel.id) && VAL[el].some(v => v >= 1)) {
      const ang = freeAngle(sel), L = el === 'H' || sel.el === 'H' ? 52 : 64;
      a.x = sel.x + Math.cos(ang) * L; a.y = sel.y + Math.sin(ang) * L; keepIn(a);
      S.atoms.push(a); S.bonds.push({ a: sel.id, b: a.id, o: 1 });
      // the chain grows from the new atom; atoms with no hands left (like H) leave the selection where it was
      if (canAdd(a.id)) S.sel = a.id; else if (!canAdd(sel.id)) S.sel = null;
    } else {
      Object.assign(a, freeSpot()); S.atoms.push(a); S.sel = a.id;
    }
    changed();
  }
  function tapAtom(id) {
    if (!S.sel) { S.sel = id; renderWs(); renderSide(); return; }
    if (S.sel === id) { S.sel = null; renderWs(); renderSide(); return; }
    const a = S.sel, b = id, ex = findBond(a, b);
    if (!canAdd(a) || !canAdd(b) || (ex && ex.o >= 3)) {
      const full = !canAdd(a) ? atom(a) : !canAdd(b) ? atom(b) : null;
      toast(full ? t('lab.noHands', nm(App.E[ZOF[full.el] - 1])) : t('lab.maxBond'));
      S.sel = id; renderWs(); renderSide(); return;
    }
    snap();
    if (ex) ex.o++; else S.bonds.push({ a, b, o: 1 });
    S.sel = canAdd(b) ? b : null;
    changed();
  }
  function tapBond(i) {
    snap(); const b = S.bonds[i];
    if (--b.o <= 0) S.bonds.splice(i, 1);
    changed();
  }
  function removeAtom(id) {
    snap(); S.atoms = S.atoms.filter(a => a.id !== id); S.bonds = S.bonds.filter(b => b.a !== id && b.b !== id);
    if (S.sel === id) S.sel = null; changed();
  }
  function addHydrogens() {
    const heavy = S.atoms.filter(a => a.el !== 'H' && hands(a.id) > 0);
    if (!heavy.length) { toast(t('lab.noFree')); return; }
    snap();
    for (const a of heavy) {
      let n = hands(a.id);
      while (n-- > 0) {
        const ang = freeAngle(a), h = { id: S.next++, el: 'H', x: a.x + Math.cos(ang) * 50, y: a.y + Math.sin(ang) * 50 };
        keepIn(h); S.atoms.push(h); S.bonds.push({ a: a.id, b: h.id, o: 1 });
      }
    }
    S.sel = null; changed();
  }
  function doUndo() { if (!undo.length) return; S = JSON.parse(undo.pop()); changed(); }
  function clearAll() { if (!S.atoms.length) return; snap(); S = { atoms: [], bonds: [], sel: null, next: S.next }; changed(); }

  /* --- recognition: same atoms and same bonds (graph isomorphism with element labels and bond orders) --- */
  function graphOf(atoms, bonds) {
    const adj = atoms.map(() => new Map());
    bonds.forEach(([i, j, o]) => { adj[i].set(j, o); adj[j].set(i, o); });
    return { el: atoms.map(a => Array.isArray(a) ? a[0] : a), adj };
  }
  function isomorphic(G, T) {
    const n = G.el.length; if (n !== T.el.length) return false;
    const sig = (g, i) => g.el[i] + g.adj[i].size + ':' + [...g.adj[i].values()].reduce((s, o) => s + o, 0);
    // visiting order: breadth-first from the best-connected atom, so each atom has a mapped neighbour
    const order = [], seen = new Set(), start = [...Array(n).keys()].sort((a, b) => G.adj[b].size - G.adj[a].size)[0];
    const q = [start]; seen.add(start);
    while (q.length) { const x = q.shift(); order.push(x); [...G.adj[x].keys()].forEach(y => { if (!seen.has(y)) { seen.add(y); q.push(y); } }); }
    if (order.length !== n) return false;
    const map = new Array(n).fill(-1), usedT = new Array(n).fill(false);
    const go = k => {
      if (k === n) return true;
      const v = order[k], sv = sig(G, v);
      const mappedNb = [...G.adj[v].entries()].filter(([u]) => map[u] >= 0);
      const cands = mappedNb.length ? [...T.adj[map[mappedNb[0][0]]].keys()] : [...Array(n).keys()];
      for (const c of cands) {
        if (usedT[c] || sig(T, c) !== sv) continue;
        if (!mappedNb.every(([u, o]) => T.adj[c].get(map[u]) === o)) continue;
        map[v] = c; usedT[c] = true;
        if (go(k + 1)) return true;
        map[v] = -1; usedT[c] = false;
      }
      return false;
    };
    return go(0);
  }
  function analyse() {
    if (!S.atoms.length) return { st: 'empty' };
    const cnt = {}; S.atoms.forEach(a => cnt[a.el] = (cnt[a.el] || 0) + 1);
    const f = hill(cnt), free = S.atoms.reduce((s, a) => s + (done(a.id) ? 0 : Math.max(1, hands(a.id))), 0);
    if (free) return { st: 'open', f, free };
    const parts = components();
    if (parts > 1) return { st: 'pieces', f, parts };
    const idx = new Map(S.atoms.map((a, i) => [a.id, i]));
    const G = graphOf(S.atoms.map(a => a.el), S.bonds.map(b => [idx.get(b.a), idx.get(b.b), b.o]));
    const same = buildable().filter(m => m.key === countKey(cnt));
    const hit = same.find(m => isomorphic(G, graphOf(m.atoms, m.bonds)));
    if (hit) return { st: 'hit', f, m: hit };
    return { st: same.length ? 'isomer' : 'unknown', f, m: same[0] };
  }

  function changed() {
    renderWs();
    const r = analyse(), key = r.st === 'hit' ? r.m.id : null;
    const fresh = key && key !== last;
    if (fresh) celebrate(r.m);
    last = key; renderSide(r);
    // on phones the result card is below the bench: bring it into view
    if (fresh && innerWidth <= 820) setTimeout(() => { const sd = $('#lab-side'); if (sd) sd.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 700);
  }
  function mission() {
    const al = album(), i = store.get('labMission', 0);
    return target ? byId[target] : i < MISSIONS.length ? byId[MISSIONS[i]] : null;
  }
  function celebrate(m) {
    const al = album(), isNew = !al.includes(m.id), goal = mission();
    if (isNew) store.set('molecules', [...al, m.id]);
    const r = $('#lab-ws').getBoundingClientRect();
    if (goal && goal.id === m.id) {
      if (target) target = null; else store.set('labMission', store.get('labMission', 0) + 1);
      confetti(r.left + r.width / 2, r.top + r.height / 2, 120); toast(t('lab.missionDone'), 2200);
    } else if (isNew) { confetti(r.left + r.width / 2, r.top + r.height / 2, 70); toast(t('lab.new'), 2000); }
  }

  /* --- drawing --- */
  function shell() {
    App.setView('play'); view = 'lab';
    root.innerHTML = `<button class="back-link" id="bk">← ${t('g.games')}</button>
      <div class="lab-head"><h1>${t('lab.title')}</h1><p>${t('lab.sub')}</p></div>
      <div class="lab">
        <div class="lab-main">
          <div class="lab-pal" id="lab-pal">${PALETTE.map(el => `<button class="lab-el" data-el="${el}" style="--mc:${MCOL[el]};--mi:${molInk(el)}" title="${nm(App.E[ZOF[el] - 1])}">
            <b>${el}</b><span class="hands">${VAL[el].length > 1 ? VAL[el].join('/') : '●'.repeat(VAL[el][0])}</span></button>`).join('')}</div>
          <div class="lab-ws-wrap"><svg id="lab-ws" class="lab-ws"></svg>
            <div class="lab-trash" id="lab-trash" title="${t('lab.trash')}">🗑</div>
            <div class="lab-tools">
              <button class="btn" id="lab-h" title="${t('lab.addHTitle')}">+H ${t('lab.addH')}</button>
              <button class="btn" id="lab-undo">↶ ${t('lab.undo')}</button>
              <button class="btn" id="lab-clear">${t('lab.clear')}</button>
            </div></div>
          <p class="note lab-how">${t('lab.how')}</p>
        </div>
        <div class="lab-side" id="lab-side"></div>
      </div>`;
    $('#bk').onclick = () => App.game.hub();
    $$('.lab-el', root).forEach(b => b.onclick = () => addAtom(b.dataset.el));
    $('#lab-h').onclick = addHydrogens; $('#lab-undo').onclick = doUndo; $('#lab-clear').onclick = clearAll;
    wireWs(); fitWs(); changed();
  }
  function fitWs() {
    const svg = $('#lab-ws'); if (!svg) return;
    const w = svg.clientWidth || 600, h = svg.clientHeight || 420;
    if (w === svgSize.w && h === svgSize.h && svg.getAttribute('viewBox')) return;
    // keep the molecule where it is relative to the middle
    const dx = (w - svgSize.w) / 2, dy = (h - svgSize.h) / 2;
    S.atoms.forEach(a => { a.x += dx; a.y += dy; keepIn(a); });
    svgSize = { w, h }; svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    S.atoms.forEach(keepIn);
  }
  function renderWs() {
    const svg = $('#lab-ws'); if (!svg) return;
    let s = '<defs>' + PALETTE.map(el => `<radialGradient id="mg-${el}" cx="35%" cy="32%" r="75%"><stop offset="0" stop-color="${shade(MCOL[el], 0.55)}"/><stop offset=".6" stop-color="${MCOL[el]}"/><stop offset="1" stop-color="${shade(MCOL[el], -0.4)}"/></radialGradient>`).join('') + '</defs>';
    S.bonds.forEach((b, i) => {
      const A = atom(b.a), B = atom(b.b), dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L * 7, ny = dx / L * 7;
      s += `<g class="bond" data-b="${i}"><line class="hit" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
      for (let j = 0; j < b.o; j++) { const k = j - (b.o - 1) / 2; s += `<line x1="${A.x + nx * k}" y1="${A.y + ny * k}" x2="${B.x + nx * k}" y2="${B.y + ny * k}"/>`; }
      s += '</g>';
    });
    S.atoms.forEach(a => {
      const r = RAD(a.el), hd = hands(a.id), ok = done(a.id);
      let dots = '';
      if (!ok && hd > 0) {
        const taken = bondsOf(a.id).map(b => { const o = atom(other(b, a.id)); return Math.atan2(o.y - a.y, o.x - a.x); });
        const angs = [];
        for (let k = 0; k < hd; k++) {
          let best = 0, bg = -1;
          for (let q = 0; q < 36; q++) { const ang = q * Math.PI / 18 - Math.PI / 2, all = [...taken, ...angs]; const g = all.length ? Math.min(...all.map(t => Math.abs(Math.atan2(Math.sin(ang - t), Math.cos(ang - t))))) : 9 - q; if (g > bg) { bg = g; best = ang; } }
          angs.push(best);
        }
        dots = angs.map(ang => `<circle class="hand" cx="${a.x + Math.cos(ang) * (r + 8)}" cy="${a.y + Math.sin(ang) * (r + 8)}" r="4.2"/>`).join('');
      }
      s += `<g class="atom${S.sel === a.id ? ' sel' : ''}${ok ? ' ok' : ''}" data-a="${a.id}">${S.sel === a.id ? `<circle class="ring" cx="${a.x}" cy="${a.y}" r="${r + 7}"/>` : ''}${dots}
        <circle cx="${a.x}" cy="${a.y}" r="${r}" fill="url(#mg-${a.el})"/><text x="${a.x}" y="${a.y + 1}" fill="${molInk(a.el)}" font-size="${a.el.length > 1 ? 15 : 17}">${a.el}</text></g>`;
    });
    if (!S.atoms.length) s += `<text class="ws-empty" x="${svgSize.w / 2}" y="${svgSize.h / 2}">${t('lab.empty')}</text>`;
    svg.innerHTML = s;
  }
  function wireWs() {
    const svg = $('#lab-ws'), trash = $('#lab-trash');
    let d = null;
    const pt = e => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) * svgSize.w / r.width, y: (e.clientY - r.top) * svgSize.h / r.height }; };
    const overTrash = e => { const r = trash.getBoundingClientRect(); return e.clientX > r.left - 10 && e.clientX < r.right + 10 && e.clientY > r.top - 10 && e.clientY < r.bottom + 10; };
    svg.addEventListener('pointerdown', e => {
      const ga = e.target.closest('[data-a]'), gb = e.target.closest('[data-b]');
      if (ga) {
        const a = atom(+ga.dataset.a), p = pt(e);
        d = { id: a.id, sx: e.clientX, sy: e.clientY, ox: a.x - p.x, oy: a.y - p.y, moved: false };
        svg.setPointerCapture(e.pointerId);
      } else if (gb) tapBond(+gb.dataset.b);
      else if (S.sel) { S.sel = null; renderWs(); renderSide(); }
    });
    svg.addEventListener('pointermove', e => {
      if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
      if (!d.moved) { d.moved = true; trash.classList.add('show'); }
      const a = atom(d.id), p = pt(e); a.x = p.x + d.ox; a.y = p.y + d.oy; keepIn(a);
      trash.classList.toggle('hot', overTrash(e)); renderWs();
    });
    const end = e => {
      if (!d) return; const x = d; d = null; trash.classList.remove('show', 'hot');
      if (!x.moved) tapAtom(x.id); else if (overTrash(e)) removeAtom(x.id);
    };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', () => { d = null; trash.classList.remove('show', 'hot'); });
    if (!wireWs.ro) { wireWs.ro = true; addEventListener('resize', () => { if ($('#lab-ws')) { fitWs(); renderWs(); } }); }
  }

  const chips = m => [...new Set(m.atoms.map(([el]) => el))].map(el => { const e = App.E[ZOF[el] - 1]; return `<button class="chip c" data-z="${e.z}" style="--c:${MCOL[el]}">${e.s} · ${nm(e)}</button>`; }).join('');
  function infoHTML(m) {
    const x = mtx(m);
    return `<div class="mol-facts"><p><b>${t('lab.where')}</b> ${esc(x.d)}</p><p><b>${t('lab.use')}</b> ${esc(x.u)}</p></div>
      <div class="card fun"><h3>💡 ${t('lab.fun')}</h3><p>${esc(x.f)}</p></div>
      ${m.k === 'i' ? `<div class="card"><h3>⚡ ${t('lab.ionicT')}</h3><p>${t('lab.ionic')}</p></div>` : ''}
      <div class="chips">${chips(m)}</div>`;
  }
  function viewerHTML(id) {
    return `<div class="mol-view"><canvas id="${id}"></canvas><span class="seg mol-mode"><button data-mode="ball" class="active">${t('lab.balls')}</button><button data-mode="space">${t('lab.space')}</button></span><span class="mol-tip">${t('lab.rotate')}</span></div>`;
  }
  function wireViewer(box, m) {
    const v = new Mol3D(box.querySelector('canvas'), m);
    box.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { v.mode = b.dataset.mode; box.querySelectorAll('[data-mode]').forEach(x => x.classList.toggle('active', x === b)); });
    box.parentElement.querySelectorAll('[data-z]').forEach(c => c.onclick = () => App.panel.openElement(+c.dataset.z));
  }
  function renderSide(r = analyse()) {
    const side = $('#lab-side'); if (!side) return;
    const goal = mission(), al = album(), nb = buildable().length;
    let goalHTML;
    if (goal) {
      const hint = renderSide.hint === goal.id;
      const cnt = {}; goal.atoms.forEach(([el]) => cnt[el] = (cnt[el] || 0) + 1);
      const center = goal.atoms.map(([el], i) => [el, goal.bonds.filter(b => b[0] === i || b[1] === i).length]).sort((a, b) => b[1] - a[1])[0][0];
      goalHTML = `<div class="b-goal">${target ? t('lab.tryIt') : t('lab.mission')}: <b>${esc(mtx(goal).n)}</b>
        ${hint ? `<div class="note">${t('lab.hintTxt', goal.f, Object.entries(cnt).map(([k, v]) => v + ' ' + k).join(' + '), center)}</div>`
          : `<div class="lab-goal-act"><a href="#" id="lab-hint">${t('lab.hint')}</a>${target ? '' : ` · <a href="#" id="lab-skip">${t('lab.skip')}</a>`}</div>`}</div>`;
    } else goalHTML = `<div class="b-goal">${t('lab.allDone')}</div>`;
    let st;
    if (r.st === 'hit') {
      const m = r.m;
      st = `<div class="mol-card"><div class="mol-title"><span class="mol-f">${m.f}</span><h2>${esc(mtx(m).n)}</h2></div>${viewerHTML('lab-3d')}${infoHTML(m)}
        <button class="btn primary" id="lab-again" style="margin-top:12px;width:100%">${t('lab.again')}</button></div>`;
    } else {
      const msg = { empty: t('lab.start'), open: S.sel ? t('lab.selected', esc(nm(App.E[ZOF[atom(S.sel).el] - 1]))) : t('lab.free', r.free), pieces: t('lab.pieces', r.parts),
        unknown: t('lab.unknown'), isomer: r.m && t('lab.isomer', esc(mtx(r.m).n)) }[r.st];
      st = `<div class="lab-status">${r.f ? `<div class="mol-f big">${r.f}</div>` : ''}<p>${msg}</p></div>`;
    }
    side.innerHTML = goalHTML + st + `<button class="btn lab-album-btn" id="lab-album">📖 ${t('lab.album')} <span class="mono">${al.filter(id => byId[id]).length}/${nb}</span></button>`;
    const h = $('#lab-hint'); if (h) h.onclick = ev => { ev.preventDefault(); renderSide.hint = goal.id; renderSide(r); };
    const sk = $('#lab-skip'); if (sk) sk.onclick = ev => { ev.preventDefault(); store.set('labMission', store.get('labMission', 0) + 1); renderSide(r); };
    const ag = $('#lab-again'); if (ag) ag.onclick = () => { snap(); S = { atoms: [], bonds: [], sel: null, next: S.next }; changed(); };
    $('#lab-album').onclick = albumView;
    if (r.st === 'hit') wireViewer(side.querySelector('.mol-view'), r.m);
  }

  /* --- album --- */
  function albumView() {
    App.setView('play'); view = 'album';
    const al = album(), nb = buildable().length, have = al.filter(id => byId[id]).length;
    const card = (m, open) => `<button class="mol-tile${open ? '' : ' locked'}" data-m="${m.id}"><span class="mol-f">${m.f}</span><span class="mol-n">${open ? esc(mtx(m).n) : '🔒 ' + esc(mtx(m).n)}</span></button>`;
    root.innerHTML = `<button class="back-link" id="bk">← ${t('lab.title')}</button>
      <div class="lab-head"><h1>${t('lab.albumTitle')}</h1><p>${t('lab.albumSub')}</p></div>
      <div class="album-bar"><div class="album-prog"><i style="width:${have / nb * 100}%"></i></div><span class="mono">${t('lab.built', have, nb)}</span></div>
      <div class="mol-grid">${buildable().map(m => card(m, al.includes(m.id))).join('')}</div>
      <h2 class="album-h">⭐ ${t('lab.famous')}</h2><p class="muted" style="margin-top:-6px">${t('lab.famousTxt')}</p>
      <div class="mol-grid">${M.filter(m => m.k === 's').map(m => card(m, true)).join('')}</div>`;
    $('#bk').onclick = shell;
    $$('.mol-tile', root).forEach(b => b.onclick = () => {
      const m = byId[b.dataset.m];
      if (b.classList.contains('locked')) { target = m.id; renderSide.hint = null; S.sel = null; shell(); toast(t('lab.tryIt') + ': ' + mtx(m).n, 2200); }
      else modal(m);
    });
  }
  function modal(m) {
    closeModal();
    const d = document.createElement('div'); d.className = 'mol-modal'; d.id = 'mol-modal';
    d.innerHTML = `<div class="mol-box"><button class="icon-btn mol-x" aria-label="${t('lab.close')}">✕</button>
      <div class="mol-title"><span class="mol-f">${m.f}</span><h2>${esc(mtx(m).n)}</h2></div>${viewerHTML('mol-3d')}${infoHTML(m)}</div>`;
    document.body.appendChild(d);
    d.onclick = ev => { if (ev.target === d) closeModal(); };
    d.querySelector('.mol-x').onclick = closeModal;
    wireViewer(d.querySelector('.mol-view'), m);
    d.querySelectorAll('[data-z]').forEach(c => c.addEventListener('click', closeModal));
  }
  function closeModal() { const d = $('#mol-modal'); if (d) d.remove(); }
  addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // a famous molecule spinning on the game card in the hub
  function preview(cv) {
    load().then(() => { if (!cv.isConnected) return; const v = new Mol3D(cv, byId[['caffeine', 'glucose', 'aspirin', 'vanillin', 'serotonin'][Math.random() * 5 | 0]]); v.zoom = 1.1; }).catch(() => {});
  }
  function open() { load().then(shell).catch(() => toast('molecules.json?')); }
  function relang() { closeModal(); if (!M) return; if (view === 'album') albumView(); else shell(); }
  return { open, preview, relang, isomorphic, graphOf, get M() { return M; }, get S() { return S; } };
})();
