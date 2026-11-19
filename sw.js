/* Elementa — service worker: works offline after the first visit */
const V = 'elementa-v1';
const CORE = ["./", "index.html", "style.css", "core.js", "i18n.js", "help.js", "atom.js", "table.js", "further.js", "panel.js", "nuclides.js", "games.js", "lab.js", "main.js", "elements.json", "molecules.json", "manifest.webmanifest", "icons/icon-192.png"];
const PHOTOS = ["img/1.jpg", "img/10.jpg", "img/100.jpg", "img/101.jpg", "img/102.jpg", "img/103.jpg", "img/11.jpg", "img/12.jpg", "img/13.jpg", "img/14.jpg", "img/15.jpg", "img/16.jpg", "img/17.jpg", "img/18.jpg", "img/19.jpg", "img/2.jpg", "img/20.jpg", "img/21.jpg", "img/22.jpg", "img/23.jpg", "img/24.jpg", "img/25.jpg", "img/26.jpg", "img/27.jpg", "img/28.jpg", "img/29.jpg", "img/3.jpg", "img/30.jpg", "img/31.jpg", "img/32.jpg", "img/33.jpg", "img/34.jpg", "img/35.jpg", "img/36.jpg", "img/37.jpg", "img/38.jpg", "img/39.jpg", "img/4.jpg", "img/40.jpg", "img/41.jpg", "img/42.jpg", "img/43.jpg", "img/44.jpg", "img/45.jpg", "img/46.jpg", "img/47.jpg", "img/48.jpg", "img/49.jpg", "img/5.jpg", "img/50.jpg", "img/51.jpg", "img/52.jpg", "img/53.jpg", "img/54.jpg", "img/55.jpg", "img/56.jpg", "img/57.jpg", "img/58.jpg", "img/59.jpg", "img/6.jpg", "img/60.jpg", "img/61.jpg", "img/62.jpg", "img/63.jpg", "img/64.jpg", "img/65.jpg", "img/66.jpg", "img/67.jpg", "img/68.jpg", "img/69.jpg", "img/7.jpg", "img/70.jpg", "img/71.jpg", "img/72.jpg", "img/73.jpg", "img/74.jpg", "img/75.jpg", "img/76.jpg", "img/77.jpg", "img/78.jpg", "img/79.jpg", "img/8.jpg", "img/80.jpg", "img/81.jpg", "img/82.jpg", "img/83.jpg", "img/84.jpg", "img/85.jpg", "img/86.jpg", "img/87.jpg", "img/9.jpg", "img/92.jpg", "img/93.jpg", "img/94.jpg", "img/95.jpg", "img/97.jpg", "img/98.jpg", "img/99.jpg"];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(async c => { await c.addAll(CORE); try { await c.addAll(PHOTOS); } catch (x) { } }).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
// same-origin files and fonts: answer from the cache at once, refresh it in the background
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin !== location.origin && !/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) return;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
