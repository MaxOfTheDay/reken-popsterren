/*
 * Service worker: maakt het spel offline speelbaar na het eerste bezoek.
 *
 * Twee voorraden, en het verschil ertussen is de hele opzet:
 *
 *   SCHIL (rekenpop-v45)   het spel zelf: index.html, het manifest, de iconen.
 *                          Netwerk-eerst, want een nieuwe versie hoort gewoon
 *                          binnen te komen -- daar hoeft deze naam niet voor
 *                          omhoog. Gaat hij wél omhoog, dan wordt de oude
 *                          voorraad bij het activeren opgeruimd.
 *
 *   TEKENINGEN (rekenpop-art)  assets/: de wereldkaarten, ~300 kB per stuk.
 *                          Cache-eerst, en de naam verandert níét bij een
 *                          uitgave. Dat is het punt: een tekstwijziging in het
 *                          spel hoort geen twee megabyte tekeningen opnieuw over
 *                          de telefoondata van een gezin te trekken. Ze
 *                          veranderen vrijwel nooit, en als er wél een nieuwe
 *                          tekening komt gaat ART_CACHE één keer omhoog.
 *
 * Wat hier met opzet NIET gebeurt:
 *   - de wereldtekeningen vooraf binnenhalen. Ze komen erin op het moment dat
 *     het spel ze opvraagt, dus een wereld waar nog niemand geweest is kost
 *     niets. Een wereld 7, 8 of 9 erbij verandert daar niets aan -- er staat
 *     nergens een lijst van werelden in dit bestand.
 *   - antwoorden bewaren die geen antwoord zijn. Een 404 of een 500 bewaren in
 *     een cache-eerst-voorraad betekent dat die wereld voorgoed stuk is; zie
 *     bewaar().
 */
const CACHE = 'rekenpop-v45';
const ART_CACHE = 'rekenpop-art';
const HUIDIG = [CACHE, ART_CACHE];
/* Het startscherm heeft geen tekening meer maar een geschilderde CSS-schil
   (zie .app-sfeer in index.html), dus er valt hier niets meer voor te cachen.
   assets/bg/landing.webp staat nog op schijf voor de beeldgereedschappen. */
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
/* Hoe lang de schil op het net wacht voordat hij de bewaarde versie pakt. Een
   telefoon met één streepje laat een fetch minutenlang openstaan; zonder deze
   grens staat een kind naar een wit scherm te kijken terwijl het hele spel al op
   het toestel staat. Ruim genoeg voor een trage verbinding, kort genoeg om niet
   als "hij doet het niet" te voelen. */
const WACHT = 4000;

function isArt(url) { return url.pathname.includes('/assets/'); }

/* Alleen een écht antwoord gaat de voorraad in. Zonder deze controle bewaart een
   cache-eerst-voorraad de 404 van een tekening die tijdens een uitrol even niet
   bestond, en dan blijft die wereld kapot tot de cachenaam omhoog gaat. Ook
   opaque antwoorden (cross-origin, status 0) vallen af: je kunt er niet aan zien
   of ze goed zijn.

   Bewaard wordt op het pád, zonder het stukje achter de ?. Anders krijgt elk
   ander vraagteken zijn eigen plek in de voorraad -- ?debug, een gedeelde link met
   een herkomstcode -- en staat index.html er straks vijf keer in. Opzoeken gebeurt
   toch al met ignoreSearch, dus de sleutel mag hier de korte zijn. */
function sleutel(url) { return url.origin + url.pathname; }
function bewaar(naam, url, resp) {
  if (!resp || !resp.ok || resp.type === 'opaque') return resp;
  const kopie = resp.clone();
  caches.open(naam).then(c => c.put(sleutel(url), kopie)).catch(() => {});
  return resp;
}
// Opzoeken in één bepaalde voorraad: caches.match() zonder naam kijkt in állemaal,
// en dan kan een oude kopie in de verkeerde voorraad het antwoord geven.
function uitVoorraad(naam, url) {
  return caches.open(naam).then(c => c.match(sleutel(url))).catch(() => undefined);
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !HUIDIG.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  // Alleen wat van ons is. Het lettertype van Google gaat gewoon langs de gewone
  // weg: de browsercache doet dat werk al, en een opaque antwoord in onze voorraad
  // kost quotum zonder dat we er iets over kunnen zeggen. Valt het weg, dan staat
  // de tekst in het reservelettertype -- zo is de pagina ook opgezet (display=swap).
  if (url.origin !== self.location.origin) return;

  /* Tekeningen: eerst de voorraad. Ze veranderen alleen als ART_CACHE omhoog gaat,
     en het zijn de grootste bestanden van de app -- netwerk-eerst zou ze bij elk
     bezoek opnieuw ophalen. */
  if (isArt(url)) {
    e.respondWith(
      uitVoorraad(ART_CACHE, url)
        .then(hit => hit || fetch(req).then(resp => bewaar(ART_CACHE, url, resp)))
    );
    return;
  }

  /* De schil: het net eerst, maar niet eindeloos. Wint de klok, dan staat het spel
     er meteen uit de voorraad; komt het net daarna alsnog binnen, dan is dat voor
     de vólgende start. */
  e.respondWith(
    Promise.race([
      fetch(req).then(resp => bewaar(CACHE, url, resp)),
      new Promise((ja, nee) => setTimeout(
        () => uitVoorraad(CACHE, url).then(hit => hit ? ja(hit) : nee(0)), WACHT))
    ]).catch(() => uitVoorraad(CACHE, url).then(hit => hit
      // Alleen een schermwissel valt terug op het spel zelf. Zonder die voorwaarde
      // kreeg een mislukte aanvraag naar wat dan ook een pagina met HTML terug, en
      // dan staat er een gebroken plaatje in plaats van de terugval van het spel.
      || (req.mode === 'navigate' ? caches.open(CACHE).then(c => c.match('./index.html')) : Response.error())))
  );
});

/* Welke tekeningen er nog bestaan weet alleen het spel -- daar staat WORLDS. Het
   stuurt de lijst één keer na het opstarten door, en alles in de voorraad dat er
   niet meer bij hoort gaat eruit. Zo groeit de voorraad mee met de werelden die
   er zijn in plaats van met alle werelden die er ooit geweest zijn, en staat er
   in dit bestand geen enkel getal dat "zes" betekent.

   Een lege lijst doet niets: dat is geen "alles mag weg" maar een bericht dat we
   niet begrijpen, en dat is precies het moment om van de voorraad af te blijven. */
self.addEventListener('message', e => {
  const lijst = e.data && e.data.art;
  if (!Array.isArray(lijst) || !lijst.length) return;
  const houden = new Set(lijst.map(p => new URL(p, self.location.href).pathname));
  e.waitUntil(caches.open(ART_CACHE).then(c => c.keys().then(reqs => Promise.all(
    reqs.filter(r => !houden.has(new URL(r.url).pathname)).map(r => c.delete(r))
  ))).catch(() => {}));
});
