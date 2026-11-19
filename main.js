/* Elementa — startup, views, search, theme, language */
'use strict';
(async function main() {
  const theme = store.get('theme', matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.dataset.theme = theme;
  $('#theme-btn').onclick = () => { const th = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = th; store.set('theme', th); App.nuclides.draw(); };

  App.lang = store.get('lang', /^it\b/i.test(navigator.language || '') ? 'it' : 'en');
  applyStatic();

  let data;
  try { data = await (await fetch('elements.json')).json(); }
  catch (err) { document.body.insertAdjacentHTML('beforeend', `<p style="position:fixed;inset:45% 0 auto;text-align:center">${t('err.data')}</p>`); return; }
  App.E = data; data.forEach(e => App.bySym[e.s] = e);

  App.setView = v => {
    $$('.view').forEach(s => s.classList.toggle('active', s.id === 'view-' + v));
    $$('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    if (v !== 'table' && !$('#game-bar').hidden) { $('#game-bar').hidden = true; App.table.setGame(false); }
    if (v === 'nuclides') App.nuclides.show();
    if (v !== 'play') App.game.stopBuilder();
    App.view = v;
  };
  $$('.view-btn').forEach(b => b.onclick = () => { App.setView(b.dataset.view); if (b.dataset.view === 'play') App.game.hub(); });

  App.panel.init(); App.table.init(); App.game.hub();

  /* language switch */
  $('#lang-btn').onclick = () => {
    App.lang = App.lang === 'it' ? 'en' : 'it'; store.set('lang', App.lang);
    applyStatic(); App.table.relang(); App.panel.rerender(); App.nuclides.relang(); App.game.relang();
  };

  /* search (in both languages) */
  const inp = $('#search'), res = $('#search-results'); let hits = [], hi = 0;
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function find(q) {
    q = norm(q.trim()); if (!q) return [];
    return App.E.map(e => {
      let sc = 0; const n = norm(nm(e)), o = norm(e.tx[App.lang === 'it' ? 'en' : 'it'].n), s = e.s.toLowerCase();
      if (String(e.z) === q) sc = 100; else if (s === q) sc = 90; else if (n === q) sc = 85; else if (n.startsWith(q)) sc = 70; else if (o.startsWith(q)) sc = 60; else if (n.includes(q)) sc = 40; else if (s.startsWith(q)) sc = 30;
      return [sc, e];
    }).filter(x => x[0]).sort((a, b) => b[0] - a[0]).slice(0, 8).map(x => x[1]);
  }
  function renderHits() {
    res.innerHTML = hits.map((e, i) => `<div class="sr-item${i === hi ? ' hl' : ''}" data-z="${e.z}"><span class="sr-sym" style="--c:${catVar(e.sr)}">${e.s}</span><span>${nm(e)}<br><span class="muted" style="font-size:12px">${catName(e.sr)}</span></span><span class="sr-z">${e.z}</span></div>`).join('');
    res.classList.toggle('open', hits.length > 0);
    $$('.sr-item', res).forEach(it => it.onpointerdown = ev => { ev.preventDefault(); go(+it.dataset.z); });
  }
  function go(z) {
    inp.value = ''; hits = []; renderHits(); inp.blur();
    if (App.view !== 'table') App.setView('table');
    App.table.select(z, true); setTimeout(() => App.table.flyTo(z, Math.max(App.table.pz.s, 1.1)), 80);
  }
  inp.addEventListener('input', () => { hits = find(inp.value); hi = 0; renderHits(); });
  inp.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowDown') { hi = Math.min(hits.length - 1, hi + 1); renderHits(); ev.preventDefault(); }
    if (ev.key === 'ArrowUp') { hi = Math.max(0, hi - 1); renderHits(); ev.preventDefault(); }
    if (ev.key === 'Enter' && hits[hi]) go(hits[hi].z);
    if (ev.key === 'Escape') { inp.value = ''; hits = []; renderHits(); inp.blur(); }
  });
  inp.addEventListener('blur', () => setTimeout(() => res.classList.remove('open'), 150));
  addEventListener('keydown', ev => { if (ev.key === '/' && document.activeElement !== inp) { ev.preventDefault(); inp.focus(); } });

  /* direct links: #fe opens iron; #table, #nuclides, #play, #lab (or #tavola, #nuclidi, #gioca, #laboratorio) open a view */
  const VIEWS = { tavola: 'table', table: 'table', nuclidi: 'nuclides', nuclides: 'nuclides', gioca: 'play', play: 'play', lab: 'lab', laboratorio: 'lab' };
  const fromHash = () => {
    const s = location.hash.slice(1).toLowerCase(); const e = App.E.find(x => x.s.toLowerCase() === s);
    if (e) go(e.z); else if (VIEWS[s] === 'lab') App.game.openLab(); else if (VIEWS[s]) { App.setView(VIEWS[s]); if (VIEWS[s] === 'play') App.game.hub(); }
  };
  addEventListener('hashchange', fromHash); fromHash();
  App.view = App.view || 'table';
  if (matchMedia('(pointer: coarse)').matches && !store.get('hinted')) { setTimeout(() => toast(t('hint.touch'), 3500), 900); store.set('hinted', 1); }

  // static texts in index.html (data-i18n, data-i18n-ph, data-i18n-title)
  function applyStatic() {
    document.documentElement.lang = App.lang;
    $$('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
    $$('[data-i18n-ph]').forEach(el => el.placeholder = t(el.dataset.i18nPh));
    $$('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', el.title); });
    $('#lang-btn').textContent = App.lang === 'it' ? 'EN' : 'IT';
    const R = 'https://github.com/Simmonsstummer/elementa', A = (u, x) => `<a href="${u}" target="_blank" rel="noopener">${x}</a>`;
    $('#foot').innerHTML = `<span class="long">Elementa · ${t('foot.open')}</span><span class="sep long">·</span>`
      + `<span>${t('foot.code')} ${A(R + '/blob/main/LICENSE', 'MIT')}</span><span class="sep">·</span>`
      + `<span>${t('foot.texts')} ${A(R + '/blob/main/LICENSE-CONTENT.md', 'CC BY 4.0')}</span><span class="sep">·</span>`
      + `<span>${A(R + '/blob/main/CREDITS.md', `<span class="long">${t('foot.photos')}</span><span class="short">${t('foot.credits')}</span>`)}</span><span class="sep">·</span>`
      + `<a class="gh" href="${R}" target="_blank" rel="noopener"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg><span class="long">${t('foot.repo')}</span><span class="short">GitHub</span></a>`;
    document.title = 'Elementa — ' + t('subtitle');
  }
})();
