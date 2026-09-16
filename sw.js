// Service worker: maakt het spel offline speelbaar na het eerste bezoek.
const CACHE = 'rekenpop-v44';
/* Het startscherm heeft geen tekening meer maar een geschilderde CSS-schil
   (zie .app-sfeer in index.html), dus er valt hier niets meer voor te cachen.
   assets/bg/landing.webp staat nog op schijf voor de beeldgereedschappen. */
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Achtergrondtekeningen komen uit de cache en pas daarna van het net. Ze
   veranderen alleen als CACHE omhoog gaat, en het zijn de grootste bestanden
   van de app -- netwerk-eerst zou ze bij elk bezoek opnieuw ophalen over de
   telefoondata van een gezin. De rest blijft netwerk-eerst, zodat een nieuwe
   versie van het spel gewoon binnenkomt. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).pathname.includes('/assets/')) {
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return resp;
        }))
    );
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return resp;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then(hit => hit || caches.match('./index.html')))
  );
});
