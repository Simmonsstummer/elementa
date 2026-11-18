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

  /* direct links: #fe opens iron; #table, #nuclides, #play (or #tavola, #nuclidi, #gioca) open a view */
  const VIEWS = { tavola: 'table', table: 'table', nuclidi: 'nuclides', nuclides: 'nuclides', gioca: 'play', play: 'play' };
  const fromHash = () => {
    const s = location.hash.slice(1).toLowerCase(); const e = App.E.find(x => x.s.toLowerCase() === s);
    if (e) go(e.z); else if (VIEWS[s]) { App.setView(VIEWS[s]); if (VIEWS[s] === 'play') App.game.hub(); }
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
    document.title = 'Elementa — ' + t('subtitle');
  }
})();
