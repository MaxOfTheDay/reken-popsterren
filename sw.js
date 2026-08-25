// Service worker: maakt het spel offline speelbaar na het eerste bezoek.
const CACHE = 'rekenpop-v27';
// Het lettertype staat hier bewust bij: het hoort bij het uiterlijk van het
// spel en moet dus ook zonder internet meteen kloppen.
const ASSETS = [
  './', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './fonts/fredoka-latin.woff2', './fonts/fredoka-latin-ext.woff2'
];

// Hoeveel tijd een start (navigatie) op het netwerk mag wachten voordat we het
// spel uit de cache serveren. Alleen als er al iets in de cache staat -- op een
// echt eerste bezoek wachten we gewoon af. Zonder deze grens bleef het scherm
// leeg zolang fetch() bleef hangen: helemaal offline faalt fetch() meteen, maar
// op een halve verbinding (auto, druk wifi, portaalpagina) duurt dat tientallen
// seconden. Het netwerkantwoord werkt ondertussen gewoon de cache bij, dus een
// nieuwe versie komt dan bij de volgende start binnen.
const NAV_TIMEOUT = 2500;

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

// Bruikbaar = echt gelukt (2xx), of een cross-origin antwoord dat we niet mogen
// inzien (opaque: status 0, bv. een lettertype van Google Fonts). Een 404 of 500
// is dat nooit. Dat onderscheid is het hele punt: zo'n foutpagina mag de goede
// kopie in de cache niet overschrijven, want dan start het spel de eerstvolgende
// keer offline op met die foutpagina in plaats van met het spel.
const usable = r => !!r && (r.ok || r.type === 'opaque');

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const net = fromNetwork(e.request);   // Response, of null als het netwerk stuk is
  // Het ophalen en het bijwerken van de cache lopen door, ook als we hieronder
  // al een oude kopie teruggeven. waitUntil houdt de worker daarvoor in leven:
  // zonder dat mag de browser hem afsluiten zodra het antwoord verstuurd is, en
  // dan raakt juist bij een trage start de nieuwe versie verloren.
  e.waitUntil(net);
  e.respondWith(handle(e.request, net));
});

async function handle(req, net) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req, { ignoreSearch: true });
  const isNav = req.mode === 'navigate';
  // Bij het starten van de app is index.html altijd een goede terugval, ook als
  // deze URL zelf nog niet apart in de cache staat. Voor losse bestanden juist
  // niet: een lettertype mag geen HTML terugkrijgen.
  const fallback = cached || (isNav ? await cache.match('./index.html') : null);

  if (isNav && fallback) {
    const timeout = new Promise(r => setTimeout(() => r(null), NAV_TIMEOUT));
    const winner = await Promise.race([net, timeout]);
    return usable(winner) ? winner : fallback;
  }

  const fresh = await net;
  if (usable(fresh)) return fresh;
  // Netwerk eerst, maar liever een werkende oude kopie dan een foutpagina.
  // Staat er niets in de cache, dan mag de fout gewoon zichtbaar zijn.
  return fallback || fresh || Response.error();
}

// Haalt op van het netwerk en bewaart onderweg alleen geslaagde antwoorden.
// Faalt het netwerk, dan is dat hier geen fout maar simpelweg 'niets': null.
// Het wegschrijven wordt afgewacht (zie waitUntil hierboven), zodat een nieuwe
// versie ook echt in de cache staat als het spel zelf al uit de cache kwam.
async function fromNetwork(req) {
  let resp;
  try { resp = await fetch(req); } catch (e) { return null; }
  if (usable(resp)) {
    try {
      const cache = await caches.open(CACHE);
      await cache.put(req, resp.clone());
    } catch (e) { /* volle opslag of geweigerd: stil doorgaan, het spel draait door */ }
  }
  return resp;
}
