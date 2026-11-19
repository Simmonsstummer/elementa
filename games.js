/* Elementa — games: element hunt, quiz, build the atom, your name in elements, time machine */
'use strict';
App.game = (() => {
  const root = $('#play-root'), bar = $('#game-bar');
  const pick = a => a[Math.random() * a.length | 0];
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };
  const FAMOUS = [26, 29, 30, 47, 50, 53, 74, 78, 79, 80, 82, 86, 88, 92, 94];
  const LEVELS = { easy: () => [...range(1, 20), 26, 29, 47, 79, 80, 82, 92], medium: () => [...range(1, 56), ...FAMOUS], expert: () => range(1, 118) };
  function range(a, b) { return Array.from({ length: b - a + 1 }, (_, i) => a + i); }
  const E = z => App.E[z - 1];
  const lc = e => nm(e).toLowerCase();
  let view = 'hub';   // which screen is showing, to redraw it when the language changes

  // hide the element's name (and symbol) inside a clue
  function mask(txt, e) {
    const n = nm(e), stem = n.slice(0, Math.max(4, n.length - 2)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return txt.replace(new RegExp(stem + '[a-zà-ù]*', 'gi'), '▢▢▢').replace(new RegExp('\\b' + e.s + '\\b', 'g'), '▢');
  }
  // «found in» items that belong to one element only
  function uniqueItems() {
    const cnt = {}; App.E.forEach(e => tx(e).ct.forEach(([, n]) => { const k = n.toLowerCase(); cnt[k] = (cnt[k] || 0) + 1; }));
    const generic = t('q').generic, out = [];
    App.E.forEach(e => tx(e).ct.forEach(([em, n, d]) => { if (cnt[n.toLowerCase()] === 1 && !generic.test(n)) out.push({ z: e.z, em, n, d }); }));
    return out;
  }
  function stars(p) { return p >= 0.9 ? 3 : p >= 0.6 ? 2 : p >= 0.3 ? 1 : 0; }
  const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
  const levelBtns = attr => Object.keys(LEVELS).map(k => `<button class="btn" ${attr}="${k}">${t('lv.' + k)}</button>`).join('');

  /* ---------- hub ---------- */
  let huntKind = 'name';
  function hub() {
    stopBuilder(); view = 'hub';
    const best = store.get('best', {});
    root.innerHTML = `<div class="play-hero"><h1>${t('g.title')}</h1><p>${t('g.sub')}</p></div>
      <div class="games">
        <div class="game-card feat" data-g="lab"><canvas class="feat-mol" aria-hidden="true"></canvas><div class="gi">🧪</div><h2>${t('lab.title')}</h2><p>${t('lab.card')}</p>
          <div class="levels"><button class="btn primary" data-lab="1">${t('g.start')}</button></div><div class="best">${(store.get('molecules', []).length ? t('lab.album') + ': ' + store.get('molecules', []).length : '')}</div></div>
        <div class="game-card" data-g="hunt"><div class="gi">🔎</div><h2>${t('g.hunt')}</h2><p>${t('g.huntTxt')}</p>
          <div class="levels">${levelBtns('data-hunt')}</div>
          <div class="levels"><span class="muted" style="font-size:12.5px;align-self:center">${t('g.clue')}:</span><span class="seg" id="hunt-kind">${['name', 'symbol', 'clue'].map(k => `<button data-k="${k}" class="${huntKind === k ? 'active' : ''}">${t('g.kind.' + k)}</button>`).join('')}</span></div>
          <div class="best">${best.hunt ? t('g.record') + ': ' + starStr(best.hunt) : ''}</div></div>
        <div class="game-card" data-g="quiz"><div class="gi">🧠</div><h2>${t('g.quiz')}</h2><p>${t('g.quizTxt')}</p>
          <div class="levels">${levelBtns('data-quiz')}</div>
          <div class="best">${best.quiz ? t('g.record') + ': ' + best.quiz + '/10' : ''}</div></div>
        <div class="game-card" data-g="build"><div class="gi">⚛️</div><h2>${t('g.build')}</h2><p>${t('g.buildTxt')}</p>
          <div class="levels"><button class="btn primary" data-build="1">${t('g.start')}</button></div><div class="best">${best.build ? t('g.missions') + ': ' + best.build : ''}</div></div>
        <div class="game-card" data-g="name"><div class="gi">🔤</div><h2>${t('g.name')}</h2><p>${t('g.nameTxt')}</p>
          <div class="levels"><button class="btn primary" data-name="1">${t('g.try')}</button></div></div>
        <div class="game-card" data-g="time"><div class="gi">⏳</div><h2>${t('g.time')}</h2><p>${t('g.timeTxt')}</p>
          <div class="levels"><button class="btn primary" data-time="1">${t('g.go')}</button></div></div>
        <div class="game-card" data-g="temp"><div class="gi">🌡️</div><h2>${t('g.temp')}</h2><p>${t('g.tempTxt')}</p>
          <div class="levels"><button class="btn primary" data-temp="1">${t('g.try')}</button></div></div>
      </div>`;
    $$('#hunt-kind button').forEach(b => b.onclick = ev => { ev.stopPropagation(); huntKind = b.dataset.k; $$('#hunt-kind button').forEach(x => x.classList.toggle('active', x === b)); });
    $$('[data-hunt]').forEach(b => b.onclick = ev => { ev.stopPropagation(); hunt.start(b.dataset.hunt, huntKind); });
    $$('[data-quiz]').forEach(b => b.onclick = ev => { ev.stopPropagation(); quiz.start(b.dataset.quiz); });
    $('[data-build]').onclick = ev => { ev.stopPropagation(); builder(); };
    const fm = $('.feat-mol'); if (fm && innerWidth > 820) App.lab.preview(fm);
    $('[data-lab]').onclick = ev => { ev.stopPropagation(); view = 'lab'; App.lab.open(); };
    $('[data-name]').onclick = ev => { ev.stopPropagation(); nameGame(); };
    $('[data-time]').onclick = ev => { ev.stopPropagation(); App.setView('table'); App.table.setMode('year'); const s = $('#slider'); s.value = s.min; s.dispatchEvent(new Event('input')); setTimeout(() => $('#slider-play').click(), 400); };
    $('[data-temp]').onclick = ev => { ev.stopPropagation(); App.setView('table'); App.table.setMode('state'); toast(t('g.tempToast'), 2600); };
    $$('.game-card').forEach(c => c.onclick = () => { const b = c.querySelectorAll('.btn'); if (b.length === 1) b[0].click(); });
  }
  function saveBest(k, v) { const b = store.get('best', {}); if (!b[k] || v > b[k]) { b[k] = v; store.set('best', b); return true; } return false; }

  /* ---------- element hunt ---------- */
  const hunt = {
    start(level, kind) {
      this.level = level; this.kind = kind; this.round = 0; this.score = 0; this.max = 10;
      this.queue = shuffle([...new Set(LEVELS[level]())]).slice(0, this.max);
      App.setView('table'); App.table.setGame(true); App.table.fit(); bar.hidden = false; this.next();
    },
    next() {
      if (this.round >= this.max) return this.end();
      this.target = this.queue[this.round]; this.err = 0; App.table.clearHint();
      this.drawBar();
    },
    drawBar() {
      const e = E(this.target);
      const q = this.kind === 'symbol' ? `${t('h.findSymbol')}<b>${e.s}</b>` : this.kind === 'clue' ? `${t('h.which')}<span class="clue">${esc(mask(tx(e).cu, e))}</span>` : `${t('h.find')}<b>${nm(e)}</b>`;
      bar.innerHTML = `<div class="gb-q">${q}</div><div class="gb-score"><b>${this.score}</b>${this.round + 1}/${this.max}</div>
        <button class="icon-btn small" id="gb-hint" title="${t('h.help')}">?</button><button class="icon-btn small" id="gb-x" title="${t('h.exit')}">✕</button>`;
      $('#gb-hint').onclick = () => { this.err = Math.max(this.err + 1, 2); this.help(); };
      $('#gb-x').onclick = () => this.quit();
    },
    help() {
      if (this.err >= 3) { App.table.hint(this.target, 2); App.table.flyTo(this.target, Math.max(App.table.pz.s, 0.5)); }
      else if (this.err >= 2) { App.table.hint(this.target, 1); toast(t('h.row')); }
    },
    onTile(z) {
      if (z === this.target) {
        const pts = this.err === 0 ? 3 : this.err === 1 ? 2 : 1; this.score += pts;
        App.table.flash(z, true); const r = App.table.tileRect(z); confetti(r.left + r.width / 2, r.top + r.height / 2, 40 + pts * 15);
        toast(pick(t('h.cheers')) + ` +${pts}`);
        this.round++; this.target = null; setTimeout(() => this.next(), 900);
      } else if (this.target) {
        this.err++; App.table.flash(z, false); toast(t('h.thatIs', lc(E(z)), E(z).s)); this.help();
      }
    },
    end() {
      const st = stars(this.score / (this.max * 3)); const rec = saveBest('hunt', st);
      this.quit(true); view = 'result';
      root.innerHTML = `<button class="back-link" id="bk">← ${t('g.games')}</button><div class="result"><div class="stars" style="color:var(--accent)">${starStr(st)}</div>
        <h2>${t('h.points', this.score, this.max * 3)}</h2><p class="muted">${rec && st ? t('g.newRecord') : st === 3 ? t('h.chemist') : t('h.again')}</p>
        <div class="levels" style="justify-content:center"><button class="btn primary" id="again">${t('g.playAgain')}</button></div></div>`;
      $('#bk').onclick = hub; $('#again').onclick = () => this.start(this.level, this.kind);
      if (st === 3) setTimeout(() => confetti(innerWidth / 2, innerHeight / 3, 140), 300);
    },
    quit(silent) { bar.hidden = true; App.table.setGame(false); this.target = null; App.setView('play'); if (!silent) hub(); }
  };

  /* ---------- quiz ---------- */
  const quiz = {
    start(level) { this.level = level; this.pool = [...new Set(LEVELS[level]())]; this.i = 0; this.ok = 0; this.n = 10; App.setView('play'); view = 'quiz'; this.ask(); },
    gen() {
      const P = this.pool, e = E(pick(P)), others = k => shuffle(P.filter(z => z !== e.z)).slice(0, k).map(E), Q = t('q');
      const ty = pick(['sym', 'name', 'clue', 'use', 'protons', 'family', 'state', 'older', 'photo', 'photo', 'found', 'found']);
      if (ty === 'photo') {
        const c = shuffle(P.map(E).filter(o => o.img && !/^(Illustrazione|Ricostruzione|Esplosione|Fiala)/.test(o.tx.it.pc)))[0];
        if (!c) return this.gen();
        const ds = shuffle(P.filter(z => z !== c.z)).slice(0, 3).map(E);
        return { q: Q.photo, photo: c.z, opts: [c, ...ds].map(nm), ans: nm(c), e: c, why: Q.photoWhy(lc(c), c.s, tx(c).pc) };
      }
      if (ty === 'found') {
        const items = uniqueItems().filter(x => P.includes(x.z));
        if (!items.length) return this.gen();
        const it = pick(items), c = E(it.z), ds = shuffle(P.filter(z => z !== c.z)).slice(0, 3).map(E);
        return { q: Q.found(it.n), emoji: it.em, opts: [c, ...ds].map(nm), ans: nm(c), e: c, why: Q.foundWhy(it.n, it.d, lc(c)) };
      }
      if (ty === 'sym') return { q: Q.sym, big: e.s, opts: [e, ...others(3)].map(nm), ans: nm(e), e };
      if (ty === 'name') { const ds = shuffle(P.filter(z => z !== e.z).map(E)).sort((a, b) => (b.s[0] === e.s[0]) - (a.s[0] === e.s[0])).slice(0, 3); return { q: Q.name(lc(e)), opts: [e, ...ds].map(o => o.s), ans: e.s, e }; }
      if (ty === 'clue') return { q: Q.clue, clue: mask(tx(e).cu, e), opts: [e, ...others(3)].map(nm), ans: nm(e), e };
      if (ty === 'use') return { q: Q.use, clue: mask(tx(e).us, e), opts: [e, ...others(3)].map(nm), ans: nm(e), e };
      if (ty === 'protons') { const s = new Set([e.z]); while (s.size < 4) s.add(Math.max(1, e.z + pick([-3, -2, -1, 1, 2, 3, 5, 8]))); return { q: Q.protons(lc(e)), opts: [...s].map(String), ans: String(e.z), e, why: Q.protonsWhy(lc(e), e.z) }; }
      if (ty === 'family') { const s = new Set([e.sr]); while (s.size < 4) s.add(1 + (Math.random() * 10 | 0)); return { q: Q.family(lc(e)), opts: [...s].map(catName), ans: catName(e.sr), e }; }
      if (ty === 'state') {
        const gas = shuffle(P.map(E).filter(o => stateAt(o, 293) === 'gas'))[0], sol = shuffle(P.map(E).filter(o => stateAt(o, 293) === 'solid')).slice(0, 3);
        if (!gas || sol.length < 3) return this.gen();
        return { q: Q.gas, opts: [gas, ...sol].map(nm), ans: nm(gas), e: gas };
      }
      const four = shuffle(P.map(E)).filter((o, i, a) => a.findIndex(x => x.y === o.y) === i).slice(0, 4);
      const first = [...four].sort((a, b) => a.y - b.y)[0];
      return { q: Q.older, opts: four.map(nm), ans: nm(first), e: first, why: four.sort((a, b) => a.y - b.y).map(o => `${nm(o)}: ${o.y < 0 ? t('w.antiquity').toLowerCase() : o.y}`).join(' · ') };
    },
    ask() {
      if (this.i >= this.n) return this.end();
      const q = this.gen(); this.cur = q; const opts = shuffle([...new Set(q.opts)]);
      root.innerHTML = `<div class="quiz"><div class="quiz-top"><button class="back-link" id="bk" style="margin:0">← ${t('g.games')}</button><span class="mono muted">${this.i + 1}/${this.n} · ✓ ${this.ok}</span></div>
        <div class="progress"><i style="width:${this.i / this.n * 100}%"></i></div>
        <p class="q-text">${q.q}</p>${q.big ? `<div class="q-big">${q.big}</div>` : ''}${q.photo ? `<img class="q-photo" src="img/${q.photo}.jpg" alt="">` : ''}${q.emoji ? `<div class="q-emoji">${q.emoji}</div>` : ''}${q.clue ? `<div class="card" style="margin-top:-6px"><p>${esc(q.clue)}</p></div>` : ''}
        <div class="opts">${opts.map(o => `<button class="opt">${esc(o)}</button>`).join('')}</div><div class="q-expl" id="expl"></div></div>`;
      $('#bk').onclick = hub;
      $$('.opt').forEach(b => b.onclick = () => this.answer(b));
    },
    answer(b) {
      const q = this.cur, right = b.textContent === q.ans;
      $$('.opt').forEach(o => { o.disabled = true; if (o.textContent === q.ans) o.classList.add('ok'); });
      if (right) { this.ok++; const r = b.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top, 35); } else b.classList.add('no');
      const e = q.e;
      $('#expl').innerHTML = `<b style="color:${right ? 'var(--good)' : 'var(--bad)'}">${right ? t('q.right') : t('q.wrong')}</b> ${q.why ? esc(q.why) : `${nm(e)} (${e.s}, ${t('q.zIs', e.z)}). ${esc(tx(e).cu)}`}
        <div style="margin-top:12px;display:flex;gap:8px"><button class="btn primary" id="nx">${this.i + 1 >= this.n ? t('q.result') : t('q.next') + ' →'}</button><button class="btn" id="op">${t('q.open')}</button></div>`;
      $('#nx').onclick = () => { this.i++; this.ask(); };
      $('#op').onclick = () => App.panel.openElement(e.z);
    },
    end() {
      const st = stars(this.ok / this.n), rec = saveBest('quiz', this.ok); view = 'result';
      root.innerHTML = `<button class="back-link" id="bk">← ${t('g.games')}</button><div class="result"><div class="stars" style="color:var(--accent)">${starStr(st)}</div><h2>${t('q.score', this.ok, this.n)}</h2>
        <p class="muted">${rec ? t('g.newRecord') : t('q.different')}</p><div class="levels" style="justify-content:center"><button class="btn primary" id="again">${t('q.newQuiz')}</button></div></div>`;
      $('#bk').onclick = hub; $('#again').onclick = () => this.start(this.level);
      if (st === 3) confetti(innerWidth / 2, innerHeight / 3, 140);
    }
  };

  /* ---------- your name in elements ---------- */
  function spell(word) {
    const w = word.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const syms = {}; App.E.forEach(e => syms[e.s.toLowerCase()] = e);
    const n = w.length, best = Array(n + 1).fill(null); best[n] = { miss: 0, parts: 0, seq: [] };
    for (let i = n - 1; i >= 0; i--) {
      const opts = [];
      if (!/[a-z]/.test(w[i])) { const r = best[i + 1]; opts.push({ miss: r.miss, parts: r.parts, seq: [{ gap: w[i] }, ...r.seq] }); }
      else {
        for (const L of [2, 1]) { const sub = w.substr(i, L); if (sub.length === L && syms[sub] && best[i + L]) { const r = best[i + L]; opts.push({ miss: r.miss, parts: r.parts + 1, seq: [{ e: syms[sub] }, ...r.seq] }); } }
        const r = best[i + 1]; opts.push({ miss: r.miss + 1, parts: r.parts + 1, seq: [{ gap: w[i] }, ...r.seq] });
      }
      best[i] = opts.sort((a, b) => a.miss - b.miss || a.parts - b.parts)[0];
    }
    return best[0];
  }
  let nameValue = 'Simone';
  function nameGame() {
    App.setView('play'); stopBuilder(); view = 'name';
    root.innerHTML = `<button class="back-link" id="bk">← ${t('g.games')}</button><div class="play-hero"><h1>${t('g.name')}</h1><p>${t('n.sub')}</p></div>
      <div class="name-in"><input id="nm" maxlength="24" placeholder="${t('n.ph')}"></div><div id="nm-out"></div>
      <p class="note">${t('n.tryAlso')}</p>`;
    $('#bk').onclick = hub; $('#nm').value = nameValue;
    const run = () => {
      const v = nameValue = $('#nm').value.trim(); const out = $('#nm-out'); if (!v) { out.innerHTML = ''; return; }
      const r = spell(v);
      out.innerHTML = `<div class="name-row">${r.seq.map((p, i) => p.e ? `<div class="hero-tile" data-z="${p.e.z}" style="--c:${catVar(p.e.sr)};animation-delay:${i * 60}ms"><span class="z">${p.e.z}</span><span class="sym">${p.e.s}</span><span class="nmx">${nm(p.e)}</span></div>` : `<div class="gap">${p.gap.trim() ? p.gap.toUpperCase() : ''}</div>`).join('')}</div>
        <p style="text-align:center;font-size:16px">${r.miss ? t('n.almost', r.miss) : `<b style="color:var(--good)">${t('n.done')}</b> ${t('n.madeOf', esc(v), r.seq.filter(p => p.e).map(p => lc(p.e)).join(', '))}`}</p>`;
      $$('.name-row [data-z]', out).forEach(tl => tl.onclick = () => App.panel.openElement(+tl.dataset.z));
      if (!r.miss && v.length > 2) { const b = out.querySelector('.name-row').getBoundingClientRect(); clearTimeout(run._c); run._c = setTimeout(() => confetti(b.left + b.width / 2, b.top + 40, 60), 300); }
    };
    $('#nm').addEventListener('input', () => { clearTimeout(run._t); run._t = setTimeout(run, 250); });
    run();
  }

  /* ---------- build the atom ---------- */
  let bv = null, B = null;
  function stopBuilder() { if (bv) { bv.stop(); bv = null; } }
  const IONS = [[11, 12, 10, 'Na⁺'], [17, 18, 18, 'Cl⁻'], [8, 8, 10, 'O²⁻'], [12, 12, 10, 'Mg²⁺'], [3, 4, 2, 'Li⁺'], [9, 10, 10, 'F⁻'], [20, 20, 18, 'Ca²⁺'], [19, 20, 18, 'K⁺']];
  function newGoal(S) {
    if (S.done >= 3 && Math.random() < 0.3) { const [z, n, e, lab] = pick(IONS); S.goal = { z, n, e, ion: lab }; }
    else { const z = 1 + (Math.random() * Math.min(20, 4 + S.done * 2) | 0), iso = mainIso(E(z)); S.goal = { z, n: iso.n, e: z }; }
    S.hint = false;
    if (S.goal.z === S.p && S.goal.n === S.n && S.goal.e === S.e) newGoal(S);
  }
  const goalTxt = g => g.ion ? t('b.ion', g.ion, `${lc(E(g.z))}-${g.z + g.n}`) : t('b.neutral', `${nm(E(g.z))}-${g.z + g.n}`);
  function builder() {
    App.setView('play'); stopBuilder(); view = 'build';
    if (!B) { B = { p: 1, n: 0, e: 1, goal: null, done: store.get('best', {}).build || 0 }; newGoal(B); }
    const S = B;
    root.innerHTML = `<button class="back-link" id="bk">← ${t('g.games')}</button>
      <div class="builder"><div class="atom-wrap"><canvas id="b-cv"></canvas></div>
      <div class="b-ctl"><div class="b-goal" id="b-goal"></div>
        ${[['p', 'w.Protons', PCOL], ['n', 'w.Neutrons', NCOL], ['e', 'w.Electrons', ECOL]].map(([k, l, c]) => `<div class="b-row"><i style="background:${c}"></i><span class="lab">${t(l)}</span><button class="icon-btn" data-k="${k}" data-d="-1">−</button><span class="num" id="b-${k}">0</span><button class="icon-btn" data-k="${k}" data-d="1">+</button></div>`).join('')}
        <div class="b-result" id="b-res"></div></div></div>`;
    $('#bk').onclick = hub;
    bv = new AtomView($('#b-cv'), { z: S.p, n: S.n, e: S.e });
    $$('[data-k]', root).forEach(b => {
      let iv; const go = () => { const k = b.dataset.k; S[k] = clamp(S[k] + (+b.dataset.d), 0, k === 'n' ? 180 : 118); upd(); };
      b.onpointerdown = () => { go(); iv = setTimeout(function rep() { go(); iv = setTimeout(rep, 90); }, 450); };
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => clearTimeout(iv)));
    });
    function upd() {
      if (!$('#b-cv')) return;
      ['p', 'n', 'e'].forEach(k => $('#b-' + k).textContent = S[k]);
      bv.set(S.p, S.n, S.e);
      const g = S.goal;
      $('#b-goal').innerHTML = `${t('b.mission')} <b>${goalTxt(g)}</b>${S.hint ? `<div class="note">${t('b.hintTxt', g.z, g.n, g.e)}</div>` : ` <a href="#" id="b-hint" style="color:var(--accent);font-size:13px">${t('b.help')}</a>`}`;
      const hb = $('#b-hint'); if (hb) hb.onclick = ev => { ev.preventDefault(); S.hint = true; upd(); };
      const res = $('#b-res');
      if (!S.p) { res.innerHTML = `<p class="muted" style="margin:0">${t('b.noProtons')}</p>`; return; }
      const e = E(S.p), A = S.p + S.n, iso = findIso(S.p, A), ch = S.p - S.e;
      const chTxt = ch === 0 ? t('b.chNeutral') : ch > 0 ? t('b.chPos', ch) : t('b.chNeg', -ch);
      const stab = !iso ? `<span style="color:var(--bad)">${t('b.noNucleus')}</span>` : iso.stable ? `<span style="color:var(--good)">${t('b.stable')} ✓</span>` : `<span style="color:#f2c94c">${t('b.radio')}: t½ ${fmtTime(iso.hl)}</span>`;
      res.innerHTML = `<div class="hero-tile" style="--c:${catVar(e.sr)}"><span class="z">${e.z}</span><span class="sym">${e.s}</span></div>
        <div><b style="font-size:18px">${nm(e)}-${A}</b><div class="note" style="margin-top:2px">${chTxt}</div><div class="note">${stab}</div></div>`;
      if (S.p === g.z && S.n === g.n && S.e === g.e) {
        S.done++; saveBest('build', S.done); const r = $('#b-cv').getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2, 110);
        toast(t('b.done', S.done)); newGoal(S); setTimeout(upd, 1200);
      }
    }
    upd();
  }

  // redraw the current screen in the new language
  function relang() {
    if (!$('#view-play').classList.contains('active')) { if (!bar.hidden && hunt.target) hunt.drawBar(); if (view === 'hub') hub(); return; }
    if (view === 'lab') App.lab.relang(); else if (view === 'build') builder(); else if (view === 'name') nameGame(); else if (view === 'quiz') { quiz.i = Math.max(0, quiz.i); quiz.ask(); } else hub();
  }

  const openLab = () => { view = 'lab'; App.lab.open(); };
  return { hub, openLab, onTile: z => hunt.onTile(z), stopBuilder, relang };
})();
