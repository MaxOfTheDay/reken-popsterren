/*
 * De app in Node, zonder browser.
 *
 * De andere suites starten een echte Chromium (zie browser.js) en dat hoort ook:
 * wat een kind ziet en tikt is alleen in een browser te controleren. Maar de
 * regels waar dit bestand voor bestaat -- welke wereld is uit, welke is de grens,
 * wat krijg je ervoor, en wat gebeurt er met een oude save -- zijn puur rekenwerk
 * op p.stars en WORLDS. Daar is geen scherm voor nodig.
 *
 * Wat hier gebeurt: het <script>-blok van index.html wordt er letterlijk uit
 * geknipt en in een vm-context gedraaid, met een nagebootste browser eromheen die
 * net genoeg kan om het bestand door te komen. Er wordt niets nagebouwd en niets
 * gekopieerd -- het is dezelfde code die een kind draait. Gaat er in index.html
 * iets kapot aan de voortgang, dan valt het hier om.
 *
 * De nabootsing is met opzet krenterig: alleen de browser-globals die in de lijst
 * BROWSER hieronder staan bestaan. Gaat index.html morgen iets anders gebruiken,
 * dan komt er een ReferenceError en niet stilletjes een doe-niets-object -- dan
 * weten we dat deze harnas bijgewerkt moet worden, in plaats van dat de tests
 * iets anders meten dan ze denken.
 *
 * Gebruik:
 *   const { laadApp, heropen } = require('./app');
 *   const app = laadApp();                       // verse opslag
 *   const app = laadApp({ opslag: {...} });      // met een bestaande save
 *   const na  = heropen(app);                    // app afsluiten en opnieuw openen
 *
 * app is een gewoon kaartje met de functies en tabellen uit index.html erin
 * (WORLDS, worldDone, frontierWorld, grantWorldRewards, load, save, ...), plus:
 *   app.opslag()        de localStorage van deze sessie, als kaartje
 *   app.bestand()       wat er onder LS_KEY staat, ontleed
 *   app.run(code)       een stukje code in de app draaien (voor let-variabelen)
 *   app.zetSpeler(key)  cur zetten zonder de schermen (selectProfile doet DOM)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Normaal het spel zelf. RP_INDEX wijst hem naar een ander bestand -- dat is hoe
// je controleert of deze tests een echte fout ook zien: zet een kopie met een
// bewust gebroken regel neer en draai de suite ertegen (zie docs/TESTEN.md).
const INDEX = process.env.RP_INDEX
  ? path.resolve(process.env.RP_INDEX)
  : path.resolve(__dirname, '..', 'index.html');

// Het <script>-blok. Er is er precies één in index.html, onderaan het bestand.
// Komt er ooit een tweede bij, dan pakt dit alles ertussenin en valt het laden
// meteen om op een syntaxfout -- luidruchtig, zoals het hoort.
function appScript() {
  const html = fs.readFileSync(INDEX, 'utf8');
  const begin = html.indexOf('<script>');
  const eind = html.lastIndexOf('</script>');
  if (begin < 0 || eind < 0) throw new Error('geen <script>-blok gevonden in index.html');
  return html.slice(begin + '<script>'.length, eind);
}

/* Een doe-alsof-element. Alles wat je eraan vraagt bestaat en doet niets; wat je
   erin zet verdwijnt. Genoeg voor de regels die index.html bij het inlezen zelf
   uitvoert (knoppen ophangen, een lijstje tekenen) -- en meer hoeft het niet te
   zijn, want geen enkele test hieronder roept iets aan dat een scherm aanraakt. */
function nepElement() {
  const el = {
    style: { setProperty() {}, removeProperty() {}, getPropertyValue() { return ''; } },
    dataset: {}, value: '', textContent: '', innerHTML: '', checked: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, appendChild(k) { return k; },
    removeChild(k) { return k; }, insertBefore(k) { return k; }, remove() {},
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
    hasAttribute() { return false; }, closest() { return null; }, matches() { return false; },
    focus() {}, blur() {}, click() {}, scrollIntoView() {}, animate() { return { cancel() {}, finished: Promise.resolve() }; },
    getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0 }; },
    querySelector() { return nepElement(); }, querySelectorAll() { return []; },
    getContext() { return null; },
    get children() { return []; }, get firstChild() { return null; }, get parentNode() { return null; },
    get offsetWidth() { return 0; }, get offsetHeight() { return 0; },
  };
  return el;
}

function nepDocument() {
  const doc = {
    documentElement: nepElement(), body: nepElement(), head: nepElement(),
    getElementById() { return nepElement(); },
    querySelector() { return nepElement(); },
    querySelectorAll() { return []; },
    getElementsByClassName() { return []; },
    createElement() { return nepElement(); },
    createElementNS() { return nepElement(); },
    createTextNode() { return nepElement(); },
    createDocumentFragment() { return nepElement(); },
    addEventListener() {}, removeEventListener() {},
    hidden: false, visibilityState: 'visible', readyState: 'complete', title: '',
    fonts: { ready: Promise.resolve(), load() { return Promise.resolve(); } },
    activeElement: null, cookie: '',
  };
  return doc;
}

// Een opslag die zich als localStorage gedraagt, maar in het geheugen staat en
// per app-instantie vers is. Dezelfde kanten als de echte: alles is tekst.
function nepOpslag(start) {
  const m = new Map(Object.entries(start || {}).map(([k, v]) => [k, String(v)]));
  return {
    map: m,
    getItem: k => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => { m.set(String(k), String(v)); },
    removeItem: k => { m.delete(String(k)); },
    clear: () => m.clear(),
    key: i => Array.from(m.keys())[i] || null,
    get length() { return m.size; },
  };
}

/* Dobbelsteen met een vast begin. De voortgangsregels gebruiken geen toeval,
   maar index.html doet bij het inlezen wel een paar rnd()-aanroepen (een kleurtje
   hier, een volgorde daar). Met een vaste reeks is elke draaibeurt hetzelfde en
   kan een test nooit "soms" omvallen. */
function dobbel(zaad) {
  let s = zaad >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/* Alles wat index.html van een browser mag verwachten. Staat het er niet in en
   staat het niet in de context hieronder, dan geeft de app een ReferenceError --
   met opzet, zie de kop van dit bestand. */
const BROWSER = [
  'window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage',
  'history', 'screen', 'performance', 'console', 'setTimeout', 'clearTimeout',
  'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'addEventListener', 'removeEventListener', 'dispatchEvent', 'matchMedia',
  'getComputedStyle', 'alert', 'confirm', 'prompt', 'fetch', 'speechSynthesis',
  'SpeechSynthesisUtterance', 'AudioContext', 'webkitAudioContext', 'Image',
  'URLSearchParams', 'CustomEvent', 'Event', 'innerWidth', 'innerHeight',
  'devicePixelRatio', 'scrollTo', 'scrollY', 'open', 'Blob', 'URL', 'FileReader',
  'requestIdleCallback', 'visualViewport', 'CSS', 'btoa', 'atob', 'structuredClone',
  'queueMicrotask',
];

// De symbolen uit index.html die de tests nodig hebben. `const` en `let` uit een
// vm-script komen niet op de global terecht, dus worden ze hier expliciet
// doorgegeven; wat meebeweegt (WORLD_AVAIL, db, cur) gaat als getter mee zodat
// een test altijd de huidige waarde ziet en geen momentopname.
const BRUG = `globalThis.__api = {
  // tabellen
  WORLDS, WORLDS_SHIPPED, ITEMS, TROPHIES, TROPHY_SHELVES, RETIRED_TROPHIES, CATS,
  COLLECTION_CAT, BASES, DEFAULT_BASE, START_HAIR, START_DRESS, COUNT_OPTS,
  LS_KEY, SCHEMA_V, LEGACY_TOUR_END, WERELD_BADGE, PERFECT_BADGE, MAX_PROFILES,
  get WORLD_START() { return WORLD_START; },
  get WORLD_LAST()  { return WORLD_LAST; },
  get WORLD_AVAIL() { return WORLD_AVAIL; },
  get db()  { return db; },
  get cur() { return cur; },
  // werelden en voortgang
  item, itemOr, worldReleased, rebuildWorldStarts, rebuildWorldBadges,
  worldFor, worldForIndex, worldProgress, worldStars, worldAvailable, worldDone,
  frontierWorld, allWorldsDone, continueWorld, hereLevel,
  laatsteZichtbareWereld, meerWereldenVooruit, worldSeen, markWorldSeen,
  // beloningen en trofeeen
  beloningItem, beloningWereld, isBeloning, awardTrophy,
  grantWorldRewards, grantHistoricRewards, checkTrophies,
  activeTrophies, isRetiredTrophy, earnedActiveCount,
  // tellers
  totalStarCount, perfectCount, playedCount, doneWorldCount, boughtCount, starRank,
  // opslag
  defaultProfile, migrate, normalizeProfiles, load, save, profileKeys, nextProfileKey, P,
};`;

function laadApp(opties) {
  opties = opties || {};
  const opslag = nepOpslag(opties.opslag);
  // Geen ?debug: dat is de studio-stand, en die leest een wereldconcept uit
  // localStorage. De tests hieronder draaien op het gewone spel.
  const zoek = opties.zoek == null ? '' : opties.zoek;

  const stil = () => {};
  const ctx = {
    console: opties.stil === false ? console : { log: stil, warn: stil, error: stil, info: stil },
    JSON, Object, Array, String, Number, Boolean, Date, Set, Map, WeakMap, WeakSet,
    RegExp, Error, TypeError, Symbol, Promise, Proxy, Reflect, Intl,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
    URLSearchParams, Blob: function () {}, URL, structuredClone,
    btoa: s => Buffer.from(String(s), 'binary').toString('base64'),
    atob: s => Buffer.from(String(s), 'base64').toString('binary'),
  };
  const M = Object.create(Math);
  M.random = dobbel(opties.zaad || 20240501);
  ctx.Math = M;

  ctx.localStorage = opslag;
  ctx.sessionStorage = nepOpslag();
  ctx.document = nepDocument();
  ctx.navigator = { userAgent: 'node', vibrate: stil, language: 'nl', onLine: true, serviceWorker: undefined };
  ctx.location = { protocol: 'file:', search: zoek, href: 'file:///index.html' + zoek, hash: '', reload: stil };
  ctx.history = { state: null, pushState: stil, replaceState: stil, back: stil, length: 1 };
  ctx.screen = { width: 390, height: 844, orientation: { type: 'portrait-primary' } };
  ctx.performance = { now: () => 0 };
  ctx.setTimeout = () => 0; ctx.clearTimeout = stil;
  ctx.setInterval = () => 0; ctx.clearInterval = stil;
  ctx.requestAnimationFrame = () => 0; ctx.cancelAnimationFrame = stil;
  ctx.requestIdleCallback = () => 0;
  ctx.queueMicrotask = stil;
  ctx.addEventListener = stil; ctx.removeEventListener = stil; ctx.dispatchEvent = stil;
  ctx.matchMedia = () => ({ matches: false, addEventListener: stil, removeEventListener: stil, addListener: stil, removeListener: stil });
  ctx.getComputedStyle = () => ({ getPropertyValue: () => '' });
  ctx.alert = stil; ctx.confirm = () => false; ctx.prompt = () => null;
  ctx.fetch = () => Promise.reject(new Error('geen net in de tests'));
  ctx.speechSynthesis = { getVoices: () => [], speak: stil, cancel: stil };
  ctx.SpeechSynthesisUtterance = function () {};
  ctx.AudioContext = function () { throw new Error('geen geluid in de tests'); };
  ctx.webkitAudioContext = ctx.AudioContext;
  ctx.Image = function () { return nepElement(); };
  ctx.CustomEvent = function () {}; ctx.Event = function () {};
  ctx.FileReader = function () {};
  ctx.innerWidth = 390; ctx.innerHeight = 844; ctx.devicePixelRatio = 2;
  ctx.scrollTo = stil; ctx.scrollY = 0; ctx.open = () => null;
  ctx.visualViewport = { width: 390, height: 844, addEventListener: stil };
  ctx.CSS = { supports: () => false };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  ctx.self = ctx;

  const bekend = new Set(BROWSER);
  const sandbox = new Proxy(ctx, {
    // Alleen wat we echt hebben bestaat; de rest geeft netjes een ReferenceError.
    has(t, p) { return p in t || bekend.has(String(p)); },
    get(t, p) { return t[p]; },
    set(t, p, v) { t[p] = v; return true; },
  });

  const context = vm.createContext(sandbox);
  vm.runInContext(appScript(), context, { filename: 'index.html', timeout: 30000 });
  vm.runInContext(BRUG, context, { filename: 'test/app.js:brug' });

  const api = ctx.__api;
  const app = Object.create(api);
  app.run = code => vm.runInContext(code, context, { filename: 'test/app.js:run' });
  app.zetSpeler = key => app.run('cur = ' + JSON.stringify(key));
  app.opslag = () => Object.fromEntries(opslag.map);
  // Wat er onder LS_KEY staat, ontleed; null als er nog niets bewaard is. Gooit
  // als het bestand onleesbaar is -- gebruik dan app.opslag() en kijk naar de
  // ruwe tekst (zie zaak I in saves.test.js).
  app.bestand = () => {
    const raw = opslag.getItem(api.LS_KEY);
    return raw == null ? null : JSON.parse(raw);
  };
  return app;
}

// De app afsluiten en opnieuw openen: een nieuwe instantie op dezelfde opslag.
// Dit is wat er gebeurt als een kind de app dichtdoet en morgen weer opent --
// inclusief load(), migrate() en alles wat daaraan hangt.
function heropen(app, opties) {
  return laadApp(Object.assign({}, opties, { opslag: app.opslag() }));
}

module.exports = { laadApp, heropen, INDEX, appScript };
