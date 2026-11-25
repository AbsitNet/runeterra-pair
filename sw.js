/* Пара из Рунтерры: работа без интернета.
   Код и страница — сначала из сети (чтобы обновления приходили сразу), без сети — из кэша.
   Портреты и гербы — из кэша: при установке они скачиваются один раз в фоне.
   Запросы к живой комнате (Supabase) не кэшируются никогда. */
importScripts('js/roster.js');   // список чемпионов → список портретов

const CACHE = 'rp-app-v1', FONTS = 'rp-fonts-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/config.js', 'js/vendor/supabase.js', 'js/roster.js', 'js/profiles.js', 'js/engine.js', 'js/analysis.js',
  'js/fx.js', 'js/share.js', 'js/room.js', 'js/svaha.js', 'js/collection.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
const REGIONS = ['ion','nox','dem','frl','pil','zau','bil','shu','tar','ixt','sha','void','rt'];
const ART = CH.map(c => `img/${c[0]}.webp`).concat(REGIONS.map(r => `img/regions/${r}.png`));

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    /* портреты — по одному, без падения из-за одного неудачного */
    await Promise.allSettled(ART.map(u => c.match(u).then(hit => hit || c.add(u))));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k !== FONTS) await caches.delete(k);
    await self.clients.claim();
  })());
});

const isArt = url => /\/img\/.+\.(webp|png|jpg)$/.test(url.pathname) || /\/icons\//.test(url.pathname);
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  /* шрифты Google: берём из кэша, в фоне обновляем */
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com'){
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;   // Supabase и всё прочее — мимо кэша
  if (isArt(url)){
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(req, {ignoreSearch:true})) || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  /* страница и код: сеть, а без сети — кэш (для страницы с ?r= или ?room= — та же index.html) */
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const r = await fetch(req);
      if (r.ok) c.put(req.mode === 'navigate' ? 'index.html' : req, r.clone());
      return r;
    } catch(err){
      return (await c.match(req.mode === 'navigate' ? 'index.html' : req, {ignoreSearch:true})) || (await c.match('./')) || Response.error();
    }
  })());
});
