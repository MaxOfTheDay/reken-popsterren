/*
 * De ontwikkelserver: de échte app in je browser, plus de studio ernaast.
 *
 *   npm run studio           -> http://localhost:8099/studio   (en hij opent zelf)
 *   npm run preview          -> hetzelfde, zonder het venster te openen
 *
 * Twee pagina's, één server:
 *   /          het spel zelf, met een kandidaat-achtergrond erachter
 *   /studio    de ontwikkelstudio (test/hub.js): welke versie draait er, welke
 *              werelden zijn er, in welke stand wil je ze zien
 *
 * Werkwijze: zet een gegenereerd bestand in incoming/ en ververs de pagina.
 * De naam bepaalt waar hij terechtkomt (zie test/scene.js); je hoeft niets in
 * te stellen. Klik daarna gewoon door het spel heen.
 *
 * Waarom een server en niet file://: over file:// mag een pagina geen andere
 * bestanden uit de map lezen, en de servicewerker doet het er niet. Over http
 * dóét die het wél -- en dan zou je na elke wijziging naar een oude versie uit
 * de cache zitten kijken. Hij wordt hieronder dus met opzet uitgezet.
 *
 * Er wordt niets aan index.html gewijzigd. De opmaak wordt bij het uitserveren
 * ingespoten; op schijf blijft het bestand zoals het was, en incoming/ staat in
 * .gitignore. Een afgekeurde generatie laat geen spoor na.
 */
const fs = require('fs');
const http = require('http');
const { execFile, execFileSync } = require('child_process');
const path = require('path');
const os = require('os');
const scene = require('./scene.js');
const merk = require('./merk.js');
const versie = require('./versie.js');
// Alleen om bij het starten al om te vallen als de studiopagina stuk is; de
// pagina zelf wordt per verzoek opnieuw ingelezen (zie de route /studio).
require('./hub.js');

/* Het adres waarop een telefoon op hetzelfde wifi hierbij kan. De server luisterde
   altijd al op alle netwerkadressen -- je wist het adres alleen niet, en dus keek je
   alles na in een browser op je bureaublad terwijl het om een telefoonscherm gaat. */
function lanAdres() {
  const net = os.networkInterfaces();
  for (const naam of Object.keys(net)) {
    for (const a of net[naam] || []) {
      if (a.family === 'IPv4' && !a.internal) return a.address;
    }
  }
  return null;
}

/* Eén ding vóór al het andere: een node die te oud is geeft anders een
   syntaxfout ergens diep in een bestand, en dan zoek je een fout in de studio die
   er niet is. */
if (Number(process.versions.node.split('.')[0]) < 16) {
  console.error('\n  Deze studio heeft node 16 of nieuwer nodig; je draait ' + process.version
    + '.\n  Werk node bij (https://nodejs.org) en probeer het opnieuw.\n');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const DROP = path.join(ROOT, 'incoming');
const PORT = Number(process.env.PORT) || 8099;

// Wat ligt er nu in incoming/? Bij élk verzoek opnieuw, zodat een nieuw bestand
// zichtbaar wordt door te verversen -- niet door de server te herstarten.
function dropped() {
  if (!fs.existsSync(DROP)) return { urls: {}, found: [], unknown: [] };
  const urls = {}, found = [], unknown = [];
  for (const file of fs.readdirSync(DROP).sort()) {
    if (!scene.isImage(file)) continue;
    const slot = scene.classify(file);
    if (!slot) { unknown.push(file); continue; }
    // laatste wint, en de tijdstempel omzeilt de cache van de browser
    urls[slot] = '/incoming/' + encodeURIComponent(file) + '?v=' + fs.statSync(path.join(DROP, file)).mtimeMs;
    found.push({ file: file, slot: slot });
  }
  return { urls: urls, found: found, unknown: unknown };
}

const SCREENS = [['map', 'Kaart'], ['game', 'Show'], ['end', 'Einde'],
                 ['dress', 'Kleedkamer'], ['tro', 'Trofeeën']];

/* Wat de wereldstudio moet weten om "werk de beelden bij voor scherm x" te kunnen
   tonen: welk beeld bij welk scherm hoort, hoe groot het moet, waar het landt en
   welke er al liggen. Eerder stond die tabel twee keer -- hier en in index.html --
   en dan loopt er een uit elkaar. Nu komt hij uit test/scene.js, en de studio valt
   alleen op haar eigen minimale lijstje terug als ze zonder deze server draait. */
/* Staat in test/werelden.js, want de studiopagina heeft dezelfde lijst nodig om
   "wijst naar een bestand dat er niet is" te kunnen zeggen. Eén lus, twee lezers
   -- twee kopieën zouden op een dag verschillend gaan tellen. */
const { assetsOpSchijf } = require('./werelden.js');
/* Welke beeldbestanden wijken af van wat er in het spel staat?
   Een tekening wordt meteen naar schijf geschreven -- dat is met opzet, zie de
   uitleg bij /asset -- maar daarmee vielen ze buiten élke verandering die de
   studio meldde: "Wat verandert er" keek alleen naar het WORLDS-blok. Wie de
   startschermachtergrond verving kreeg te horen dat er niets veranderd was,
   terwijl het bestand op schijf een ander bestand was.

   Git is hier de enige eerlijke bron: hij weet wat er in het spel staat en wat er
   nu op schijf ligt, en hij blijft het weten nadat je de pagina hebt herladen --
   een lijstje in de pagina zou dat vergeten. Per verzoek opnieuw, net als
   dropped(): een bestand dat je buiten de studio om terugzet hoort ook te
   verdwijnen zonder de server te herstarten. */
function gewijzigdeAssets() {
  try {
    const uit = execFileSync('git', ['status', '--porcelain', '--', 'assets'],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 4e6 });
    return uit.split('\n').map(r => r.trim()).filter(Boolean).map(r => {
      // "XY pad" -- en bij een hernoeming "R  oud -> nieuw": de nieuwe naam telt
      const pad = r.slice(2).trim().split(' -> ').pop();
      return pad.replace(/^"|"$/g, '');
    }).filter(f => /^assets\//.test(f));
  } catch (e) { return []; }   // geen git (los uitgepakt): dan meldt de studio niets
}

function studioData(state) {
  const lan = lanAdres();
  /* Wat er in incoming/ ligt, mét de plek waar het heen zou gaan. De studio zet het
     naast de huidige tekening neer als "nieuw" en laat jou kiezen -- dat is de enige
     beslissing die erbij hoort, en zonder deze lijst kon de studio niet eens zien
     dat er iets klaarlag. */
  const kandidaten = (state && state.found || []).map(f => ({
    slot: f.slot, file: f.file, url: state.urls[f.slot],
  }));
  return '<script>window.__LAN=' + JSON.stringify(lan ? lan + ':' + PORT : null) + ';'
    + 'window.__SLOTS=' + JSON.stringify(scene.SLOTS, (k, v) =>
    v instanceof RegExp ? undefined : v)
    + ';window.__SCHERMEN=' + JSON.stringify(scene.SCHERMEN)
    + ';window.__INCOMING=' + JSON.stringify(kandidaten)
    + ';window.__ASSETS=' + JSON.stringify(merk.iconenOpSchijf(assetsOpSchijf('assets', {})))
    /* De merkbestanden: wat is de meester, wat rolt eruit. Uit test/merk.js, want
       daar wordt het gemaakt -- dezelfde afspraak als __SLOTS uit scene.js. */
    + ';window.__MERK=' + JSON.stringify(merk.AFGELEID.map(d => ({
        bron: 'assets/branding/source/' + d.bron, uit: d.uit, merk: d.merk })))
    + ';window.__GEWIJZIGD=' + JSON.stringify(gewijzigdeAssets()) + ';<\/script>';
}

function panel(state) {
  const rows = state.found.length
    ? state.found.map(f => '<li><b>' + f.slot + '</b> &larr; ' + f.file + '</li>').join('')
    : '<li class="leeg">incoming/ is leeg &mdash; zet er een afbeelding in en ververs</li>';
  const warn = state.unknown.length
    ? '<p class="warn">Onbekende naam, overgeslagen: ' + state.unknown.join(', ') +
      '<br>Gebruik: ' + Object.keys(scene.SLOTS).map(k => scene.SLOTS[k].hint.split(',')[0].trim()).join(' &middot; ') + '</p>'
    : '';
  /* &mapedit blijft staan als je nu in de wereldstudio zit: zonder dat viel je er
     met een tik op een schermlink uit, zonder weg terug. */
  const links = SCREENS.map(s =>
    '<a data-scherm href="?debug&demo&star=p1&screen=' + s[0] + '">' + s[1] + '</a>').join('')
    + '<a href="?debug&demo&star=p1&screen=map&mapedit">Studio</a>';
  /* Wat het lipje zegt als het dichtgeklapt is. Dat was altijd "kandidaat", of er
     nu wel of niet iets uit incoming/ over de app heen lag -- en juist dát is de
     vraag die je hebt als je je afvraagt waarom je wereld er anders uitziet dan
     WORLDS zegt. Nu is het stil als er niets ligt en noemt het de slots als er wel
     iets ligt. */
  const actief = state.found.length > 0;
  const lipje = actief
    ? 'toont: ' + [...new Set(state.found.map(f => f.slot))].join(', ')
    : 'geen kandidaat';
  return `
<style>
 #kandidaat{position:fixed;right:8px;bottom:8px;z-index:99999;max-width:270px;
   font:11px/1.45 system-ui,sans-serif;color:#f1e9f7;background:rgba(13,6,22,.93);
   border:1px solid rgba(255,180,61,.45);border-radius:8px;padding:8px 10px}
 #kandidaat h6{margin:0 0 5px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#ffb43d}
 #kandidaat ul{margin:0 0 6px;padding-left:14px}
 #kandidaat .leeg{list-style:none;margin-left:-14px;color:#a793bc}
 #kandidaat .warn{margin:0 0 6px;color:#ffb4b4}
 #kandidaat label{display:block;cursor:pointer;user-select:none}
 #kandidaat nav{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
 #kandidaat nav a{color:#8fd6ff;text-decoration:none;border:1px solid rgba(143,214,255,.3);
   border-radius:4px;padding:1px 5px}
 #kandidaat.dicht{padding:3px 8px;border-color:rgba(255,180,61,.25);background:rgba(13,6,22,.6)}
 /* ligt er niets, dan hoort dit lipje niets te vragen van je aandacht */
 #kandidaat.stil{border-color:rgba(255,255,255,.12)}
 #kandidaat.stil h6{color:#8b7ba0}
 /* ligt er wél iets, dan verandert het wat je ziet en mag het opvallen */
 #kandidaat.actief.dicht{border-color:rgba(255,180,61,.7);box-shadow:0 0 0 1px rgba(255,180,61,.25)}
 #kandidaat.dicht > :not(h6){display:none}
 #kandidaat.dicht h6{margin:0}
 #kandidaat h6{cursor:pointer}
 #kandidaat h6::after{content:' ▾';opacity:.6}
 #kandidaat.dicht h6::after{content:' ▸'}
</style>
<div id="kandidaat" class="dicht ${actief ? 'actief' : 'stil'}">
  <h6 title="klik om uit te klappen">${lipje}</h6>
  ${warn}
  <ul>${rows}</ul>
  <label><input type="checkbox" id="k-art" checked> kunstwerk aan <i>(uit = ervoor/erna)</i></label>
  <label><input type="checkbox" id="k-veil" checked> donkere sluier</label>
  <nav>${links}</nav>
</div>
<script>
(function () {
  /* ---- De servicewerker uit --------------------------------------------------
     Dit stond hieronder, ná de terugkeer voor het kijkvak, en dat was een stille
     maar dure fout.

     Wat er gebeurde: in het kijkvak van de studio stopte dit script meteen, dus
     hier werd de servicewerker níét uitgezet. Het spel registreerde hem gewoon,
     en zijn bereik is '/' -- dus vanaf dat moment bediende hij ook de
     studiopagina zelf. sw.js serveert alles onder /assets/ voorraad-eerst en laat
     het stuk achter de ? weg bij het opzoeken (zie sleutel()). Een vervangen
     tekening kwam er dus nooit meer doorheen: niet in het kijkvak, niet in het
     voorbeeldje op de kaart, en ook niet na herladen. Je verving het startscherm,
     de studio zei "Gewijzigd", en je keek naar de oude tekening.

     Dat is precies de storing waarvoor deze server bestaat (zie de kop van dit
     bestand). Hij hoort dus vóór élke terugkeer te staan, ook in een iframe.

     Met ?sw in de URL blijft hij wél staan. Dat is de enige manier om de
     bijwerkstroom van de PWA na te kijken -- een oude cache die een nieuwe build
     wegdrukt is precies het soort storing dat je alleen mét servicewerker ziet.
     De studio heeft er een knop voor (Gereedschap -> Met servicewerker). */
  if (navigator.serviceWorker && !new URLSearchParams(location.search).has('sw')) {
    navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); });
    navigator.serviceWorker.register = function () { return Promise.reject(new Error('uit in preview')); };
    /* En de voorraad weg. Uitschrijven alleen is niet genoeg: een servicewerker
       die deze pagina al bediende blijft dat doen tot ze herlaadt, en zijn
       tekeningenvoorraad overleeft hem sowieso. Zonder deze regel blijf je na de
       oplossing hierboven nóg een ronde naar je oude tekening kijken. */
    if (window.caches) caches.delete('rekenpop-art').catch(function () {});
  }

  /* In het kijkvak van de Dev Studio hoort het kandidaatpaneeltje niet: dat scherm
     heeft zijn eigen bedieningen, en hier dekt het juist de navigatiebalk van het
     spel af -- het stukje dat je wilde zien. In een eigen tabblad blijft het staan. */
  if (window.top !== window.self) {
    var eigen = document.getElementById('kandidaat');
    if (eigen) eigen.remove();
    /* En hier stoppen: wat hieronder staat hangt schakelaars aan knoppen die er
       nu niet meer zijn. Zonder deze regel gaf elke laadbeurt in de studio een
       fout in de console -- en dan zoek je die fout in het spel. */
    return;
  }
  var vol = document.getElementById('k-scene-vol');
  var kaal = document.getElementById('k-scene-kaal');
  function pas() {
    var art = document.getElementById('k-art').checked;
    var veil = document.getElementById('k-veil').checked;
    vol.disabled = !(art && veil);
    kaal.disabled = !(art && !veil);
  }
  document.getElementById('k-art').addEventListener('change', pas);
  document.getElementById('k-veil').addEventListener('change', pas);
  document.querySelector('#kandidaat h6').addEventListener('click', function () {
    document.getElementById('kandidaat').classList.toggle('dicht');
  });
  pas();
})();
</script>`;
}

function page(state) {
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  // Twee stylesheets, met en zonder sluier; het schakelaartje zet de ene uit en
  // de andere aan. Zo hoef je voor een ervoor/erna-vergelijking niet te herladen
  // -- en herladen zou je juist uit de show gooien die je aan het bekijken bent.
  const styles =
    '<style id="k-scene-vol">' + scene.css(state.urls, { scrim: true }) + '</style>' +
    '<style id="k-scene-kaal" disabled>' + scene.css(state.urls, { scrim: false }) + '</style>';
  // de parallax-aandrijving uit test/scene.js
  const para = '<script>' + scene.parallaxJs() + '<\/script>';
  return html.replace('</head>', styles + studioData(state) + '</head>')
             .replace('</body>', panel(state) + para + '</body>');
}

/* De wereldstudio (?debug&mapedit) schrijft haar WORLDS-blok hierheen, en deze
   server zet het in index.html tussen de twee markeringen. Dat is met opzet het
   enige schrijfpad: alleen lokaal, alleen zolang `npm run preview` draait, en
   alleen dát ene blok -- de rest van het bestand wordt niet aangeraakt. Zonder
   deze server valt de studio terug op Kopieer-en-plak. */
const MARK_A = '/* WERELDEN-BEGIN';
const MARK_B = '/* WERELDEN-EINDE */';
function writeWorlds(body, res) {
  try {
    const file = path.join(ROOT, 'index.html');
    const src = fs.readFileSync(file, 'utf8');
    const a = src.indexOf(MARK_A), b = src.indexOf(MARK_B);
    if (a < 0 || b < 0 || b < a) throw new Error('markeringen WERELDEN-BEGIN/EINDE niet gevonden');
    const head = src.slice(a, src.indexOf('*/', a) + 2);   // de toelichting blijft staan
    if (!/^const WORLDS = \[[\s\S]*\];$/.test(body.trim())) throw new Error('dit is geen WORLDS-blok');
    fs.writeFileSync(file, src.slice(0, a) + head + '\n' + body.trim() + '\n' + src.slice(b));
    console.log('  wereldstudio: WORLDS bijgewerkt in index.html');
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(String(e.message));
  }
}

/* Hetzelfde trucje als writeWorlds, voor het blok dat zegt welke schermen een
   eigen tekening hebben. Twee sleutels, twee paden, meer niet -- maar het hóórt in
   index.html en niet in een lijstje dat alleen de studio kent: wat je in de studio
   ziet moet zijn wat er op een telefoon staat.

   Alleen paden die scene.js zelf als doel noemt, en alleen voor de schermen die
   een `schermkunst`-sleutel hebben. Er valt hier dus niets in te zetten dat de app
   daarna zou proberen te laden en niet bestaat. */
const MARK_K_A = '/* SCHERMKUNST-BEGIN';
const MARK_K_B = '/* SCHERMKUNST-EINDE */';
const SCHERMKUNST_SLEUTELS = Object.keys(scene.SLOTS)
  .filter(k => scene.SLOTS[k].schermkunst)
  .reduce((u, k) => (u[scene.SLOTS[k].schermkunst] = scene.SLOTS[k].pad, u), {});
function writeSchermkunst(body, res) {
  const zeg = (code, tekst) => {
    res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(tekst);
  };
  let wens;
  try { wens = JSON.parse(body || '{}'); } catch (e) { return zeg(400, 'geen geldige JSON'); }
  const uit = {};
  for (const sleutel of Object.keys(SCHERMKUNST_SLEUTELS)) {
    const waarde = wens[sleutel];
    if (waarde == null || waarde === '') { uit[sleutel] = null; continue; }
    if (waarde !== SCHERMKUNST_SLEUTELS[sleutel]) {
      return zeg(400, sleutel + ' mag alleen ' + SCHERMKUNST_SLEUTELS[sleutel] + ' zijn, niet ' + waarde);
    }
    if (!fs.existsSync(path.join(ROOT, waarde))) {
      return zeg(400, waarde + ' staat niet op schijf — zet eerst de tekening neer');
    }
    uit[sleutel] = waarde;
  }
  try {
    const file = path.join(ROOT, 'index.html');
    const src = fs.readFileSync(file, 'utf8');
    const a = src.indexOf(MARK_K_A), b = src.indexOf(MARK_K_B);
    if (a < 0 || b < 0 || b < a) throw new Error('markeringen SCHERMKUNST-BEGIN/EINDE niet gevonden');
    const head = src.slice(a, src.indexOf('*/', a) + 2);   // de toelichting blijft staan
    const blok = 'const SCHERMKUNST = {\n'
      + Object.keys(uit).map(k => '  ' + k + ': '
        + (uit[k] ? JSON.stringify(uit[k]) : 'null') + ',').join('\n')
      + '\n};';
    fs.writeFileSync(file, src.slice(0, a) + head + '\n' + blok + '\n' + src.slice(b));
    console.log('  studio: SCHERMKUNST bijgewerkt in index.html');
    zeg(200, 'in index.html gezet');
  } catch (e) { zeg(500, String(e.message)); }
}

/* De studio zet een tekening om naar webp (in de browser, met een canvas) en
   stuurt de bytes hierheen. Deze server schrijft ze weg -- alleen naar een pad dat
   hieronder staat, nergens anders. Zo hoeft er geen beeldbibliotheek in het project,
   en gebeurt het omzetten waar het beeld toch al geladen is.

   En hij hoogt meteen CACHE in sw.js op. Dat was de stap die je altijd vergeet: de
   servicewerker serveert alles onder /assets/ eerst uit de cache, dus een vervangen
   beeld met dezelfde naam blijft anders op elk toestel dat er al was het oude tonen. */
/* Wélke paden geschreven mogen worden staat in test/beelden.js, want de studio
   moet dezelfde lijst kunnen lézen om te weten of hij een vervangknop mag tonen.
   Eén lijst, twee lezers -- twee kopieën zouden op een dag verschillend gaan
   denken over wat er mag, en dan biedt de studio een knop aan die de server
   weigert.

   De meesters in assets/branding/source/ staan er sinds deze ronde bij. Ze gaan
   de app niet in; wat de app laadt zijn de afgeleiden, en die worden door
   /api/merk opnieuw gemaakt zodra er een meester vervangen is. */
const ASSET_OK = require('./beelden.js').SCHRIJFBAAR;
function bumpCache() {
  const f = path.join(ROOT, 'sw.js');
  const src = fs.readFileSync(f, 'utf8');
  const m = /const CACHE = '([a-z-]+)(\d+)';/.exec(src);
  if (!m) return null;
  const volgend = m[1] + (Number(m[2]) + 1);
  fs.writeFileSync(f, src.replace(m[0], "const CACHE = '" + volgend + "';"));
  return volgend;
}
/* Hernoemen is er alleen voor één geval: een wereld krijgt een ander id en zijn
   tekening moet mee. Vandaar deze engere lijst en niet ASSET_OK -- daar staan
   sinds deze ronde ook de merkmeesters in, en die hebben met hernoemen niets te
   maken. */
const HERNOEM_OK = [/^assets\/world\/[a-z0-9-]+-map\.webp$/];
function renameAsset(res, van, naar) {
  const zeg = (code, tekst) => { res.writeHead(code, { 'content-type': 'text/plain' }); res.end(tekst); };
  if (!HERNOEM_OK.some(re => re.test(van)) || !HERNOEM_OK.some(re => re.test(naar))) {
    return zeg(400, 'dit pad mag niet: ' + van + ' -> ' + naar);
  }
  const a = path.join(ROOT, van), b = path.join(ROOT, naar);
  if (!fs.existsSync(a)) return zeg(404, 'niets te hernoemen: ' + van + ' bestaat niet');
  if (fs.existsSync(b)) return zeg(409, naar + ' bestaat al -- eerst zelf opruimen');
  try {
    fs.mkdirSync(path.dirname(b), { recursive: true });
    fs.renameSync(a, b);
    const cache = bumpCache();
    console.log('  wereldstudio: ' + van + ' -> ' + naar + (cache ? ' \u00b7 sw CACHE -> ' + cache : ''));
    zeg(200, van.split('/').pop() + ' \u2192 ' + naar.split('/').pop() + (cache ? ' \u00b7 sw ' + cache : ''));
  } catch (e) { zeg(500, String(e.message)); }
}

function writeAsset(req, res, to) {
  if (!ASSET_OK.some(re => re.test(to))) {
    res.writeHead(400, { 'content-type': 'text/plain' });
    return res.end('dit pad mag niet: ' + to);
  }
  const brokken = [];
  let n = 0;
  req.on('data', c => { brokken.push(c); n += c.length; if (n > 8e6) req.destroy(); });
  req.on('end', () => {
    try {
      const buf = Buffer.concat(brokken);
      if (!buf.length) throw new Error('leeg bestand');
      const doel = path.join(ROOT, to);
      const zelfde = fs.existsSync(doel) && Buffer.compare(fs.readFileSync(doel), buf) === 0;
      fs.mkdirSync(path.dirname(doel), { recursive: true });
      fs.writeFileSync(doel, buf);
      const kb = Math.round(buf.length / 1024);
      /* De cachenaam alleen ophogen voor een bestand dat de app werkelijk laadt.
         Een meester in assets/branding/source/ gaat de app niet in (zie merk.js):
         die ophogen zou elke telefoon opnieuw laten binnenhalen voor een bestand
         dat er nooit was. De afgeleiden krijgen hun ophoging van /api/merk. */
      const inDeApp = !/^assets\/branding\/source\//.test(to);
      const cache = (zelfde || !inDeApp) ? null : bumpCache();
      console.log('  wereldstudio: ' + to + ' (' + kb + ' kB)' + (cache ? ' · sw CACHE -> ' + cache : ''));
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end(to + ' — ' + kb + ' kB' + (cache ? ' · sw ' + cache : ' · ongewijzigd'));
    } catch (e) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(String(e.message));
    }
  });
}

/* Vastleggen vanuit de studio: eerst de testen, dan pas committen en pushen.
   Bewust naar de wérkbranch en nooit naar main -- main is wat er op de telefoon
   van een kind draait, en dat hoort een bewuste stap te blijven, met een diff die
   je gezien hebt. Falen de testen, dan gebeurt er niets en krijg je de uitvoer. */
function git(args) {
  return new Promise((ok, fout) => {
    execFile('git', args, { cwd: ROOT, maxBuffer: 4e6 }, (e, uit, err) =>
      e ? fout(new Error((err || uit || e.message).trim())) : ok(String(uit).trim()));
  });
}
/* Deze poort draaide de testen via `npm test`, en op Windows kon dat niet werken.
   npm heet daar npm.cmd, een batchbestand, en daar zaten twéé muren achter elkaar:

     1. execFile start een programma rechtstreeks via CreateProcess, en dat kan
        geen .cmd uitvoeren -> "spawn npm ENOENT".
     2. Noem je het dan npm.cmd, dan weigert Node het sinds de oplossing voor
        CVE-2024-27980 juist helemaal zonder shell -> "spawn EINVAL".

   De uitweg is niet `shell: true`. Node geeft de argumenten dan ongequote aan de
   shell door, dus alles met een spatie of een leesteken erin gaat stuk -- en op
   Windows woont een clone al snel in C:\Users\Voor Naam\..., met een spatie.

   Dus geen npm en geen shell: dezelfde node die deze server draait
   (process.execPath) krijgt elk testbestand rechtstreeks. Geen .cmd, geen
   PATH, geen shell, geen aanhalingstekens, en op elk platform hetzelfde pad.

   De lijst komt uit test/*.test.js en niet uit package.json: dat scheelt het
   uit elkaar parseren van een `a && b && c`-regel, het levert precies dezelfde
   drie bestanden op, en een nieuw testbestand doet vanzelf mee. `npm test`
   blijft daarnaast gewoon werken -- dit is alleen hoe de studio ze aanroept. */
function testBestanden() {
  return fs.readdirSync(path.join(ROOT, 'test'))
    .filter(n => n.endsWith('.test.js')).sort()
    .map(n => path.join(ROOT, 'test', n));
}
function eenTest(bestand) {
  return new Promise((ok, fout) => {
    execFile(process.execPath, [bestand], { cwd: ROOT, maxBuffer: 2e7, timeout: 6e5 },
      (e, uit, err) => {
        if (!e) return ok(String(uit));
        /* e.message als terugval, net als in git() hierboven. Zonder die terugval
           gaf precies de storing die híer zat (geen uitvoer, alleen een foutcode)
           een melding van één regel zonder enige reden erbij -- en dan zoek je de
           fout in je eigen werelden in plaats van in deze poort. */
        const uitleg = String(uit || err).trim() || String(e.message).trim();
        fout(new Error(path.basename(bestand) + '\n\n' + uitleg));
      });
  });
}
/* Eén voor één en stoppen bij de eerste die valt -- net wat `&&` in package.json
   doet, zodat je de eerste echte fout ziet en niet de ruis erna. */
async function runTests() {
  const bestanden = testBestanden();
  if (!bestanden.length) throw new Error('geen testbestanden gevonden in test/');
  let alles = '';
  for (const b of bestanden) {
    try { alles += await eenTest(b); }
    catch (e) {
      throw new Error('de testen falen — er is niets vastgelegd\n\n'
        + String(e.message).split('\n').slice(-25).join('\n'));
    }
  }
  return alles;
}
async function commitAll(bericht, res) {
  const zeg = (code, tekst) => {
    res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(tekst);
  };
  try {
    if (!bericht || bericht.length < 8) return zeg(400, 'geef een bericht van minstens 8 tekens');
    const tak = await git(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (tak === 'main' || tak === 'master') {
      return zeg(400, 'je staat op ' + tak + '. De studio legt alleen op een werkbranch vast — '
        + 'naar main gaat met de hand, na een diff.');
    }
    const vuil = await git(['status', '--porcelain']);
    if (!vuil) return zeg(400, 'er is niets gewijzigd');
    console.log('  wereldstudio: testen draaien vóór het vastleggen…');
    await runTests();
    await git(['add', '-A']);
    await git(['commit', '-m', bericht]);
    await git(['push', '-u', 'origin', tak]);
    const sha = await git(['rev-parse', '--short', 'HEAD']);
    console.log('  wereldstudio: ' + sha + ' op ' + tak + ' gepusht');
    zeg(200, 'vastgelegd en gepusht: ' + sha + ' op ' + tak
      + '\n\nNaar main gaat met de hand:\n'
      + '  git checkout main && git pull && git merge ' + tak + ' && npm test && git push');
  } catch (e) {
    zeg(500, String(e.message));
  }
}

/* Publiceren: de werkbranch naar main en pushen -- dát is wat er op de telefoon
   van een kind terechtkomt, want Pages serveert main.

   Twee stappen met opzet. De eerste klik kijkt alleen: welke commits zouden er
   landen, staat main gelijk met de verte, gaat het schoon samen. Pas de tweede
   klik voert het uit. Zo is publiceren nooit één verdwaalde tik, en zie je eerst
   wát je publiceert -- het stuk "diff gezien" dat anders wegvalt.

   De testen draaien vóór het samenvoegen. Falen ze, dan blijft main zoals hij was. */
async function publish(fase, res) {
  const zeg = (code, tekst) => {
    res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(tekst);
  };
  let tak = null;
  try {
    tak = await git(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (tak === 'main' || tak === 'master') return zeg(400, 'je staat al op ' + tak);
    if (await git(['status', '--porcelain'])) {
      return zeg(400, 'er staan nog wijzigingen open — leg die eerst vast');
    }
    await git(['fetch', 'origin', 'main']);
    const nieuw = await git(['log', '--oneline', 'origin/main..' + tak]);
    if (!nieuw) return zeg(400, 'main heeft dit al — er valt niets te publiceren');

    if (fase !== 'go') {
      const n = nieuw.split('\n').length;
      return zeg(200, 'KLAAR:' + n + '\n' + nieuw
        + '\n\nDit gaat naar main en staat daarna op de telefoon.');
    }

    console.log('  wereldstudio: testen draaien vóór het publiceren…');
    await runTests();
    await git(['checkout', 'main']);
    try {
      await git(['pull', '--ff-only', 'origin', 'main']);
      await git(['merge', '--no-edit', tak]);
      await git(['push', 'origin', 'main']);
    } finally {
      await git(['checkout', tak]);   // altijd terug, ook als er iets misging
    }
    const sha = await git(['rev-parse', '--short', 'origin/main']);
    console.log('  wereldstudio: main staat op ' + sha + ' — Pages werkt zichzelf bij');
    zeg(200, 'gepubliceerd: main op ' + sha
      + '\n\nPages is over een minuut of twee bij:\n'
      + '  https://maxoftheday.github.io/reken-popsterren/');
  } catch (e) {
    if (tak) { try { await git(['checkout', tak]); } catch (_) {} }
    zeg(500, String(e.message));
  }
}

/* ---- De poorten van de studiopagina ----------------------------------------
   Alles wat de studio weet en niet kan zien: welke tak er uitgecheckt staat,
   welke PR's er openstaan, welke werelden erin zitten en of ze kloppen. Lezen is
   vrij; de drie die iets doen (ophalen, wisselen, bijwerken) staan in
   test/versie.js en weigeren allemaal als er werk openstaat.

   Let op waar deze server staat: hij luistert op álle netwerkadressen, want dat
   is wat het bekijken op een telefoon mogelijk maakt (zie lanAdres). Wie op
   hetzelfde wifi zit kan dus ook deze poorten bereiken -- net als /commit en
   /publish, die er al langer zijn en veel verder gaan. Het is
   ontwikkelgereedschap voor je eigen machine en je eigen netwerk; zet hem niet
   open op een netwerk dat je niet vertrouwt. */
function json(res, data, code) {
  res.writeHead(code || 200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}
function lees(req, max) {
  return new Promise(ok => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > (max || 400)) req.destroy(); });
    req.on('end', () => ok(b.trim()));
  });
}
/* De keuringen die in seconden klaar zijn -- dezelfde vier als `npm run check`.
   De browsersuites horen hier niet bij: die duren minuten en er is al een knop
   voor bij het vastleggen (zie commitAll). */
const KEURINGEN = ['inhoud', 'kern', 'saves', 'kleedkamer'];
function keuring() {
  let uit = '';
  return KEURINGEN.reduce((p, naam) => p.then(() => new Promise((ok, fout) => {
    execFile(process.execPath, [path.join(ROOT, 'test', naam + '.test.js')],
      { cwd: ROOT, maxBuffer: 2e7, timeout: 18e4 }, (e, o, err) => {
        uit += String(o || '');
        if (e) return fout(new Error(naam + ':\n' + (String(o || err).trim() || e.message)));
        ok();
      });
  })), Promise.resolve())
    .then(() => ({ ok: true, tekst: uit.trim().split('\n').slice(-12).join('\n') }))
    .catch(e => ({ ok: false, tekst: String(e.message).split('\n').slice(-20).join('\n') }));
}

/* De afgeleiden opnieuw maken (npm run merk). Dat is de tweede helft van "een
   merkbeeld vervangen": de meester is dan al weggeschreven, en hieruit rollen de
   bestanden die de app werkelijk laadt.

   Draait als een los proces, met dezelfde node als deze server -- zie eenTest()
   voor waarom er geen npm aan te pas komt. Het kost een browser (playwright), en
   dat is precies de reden dat de studio de uitkomst moet kúnnen melden in plaats
   van te doen alsof het altijd lukt: in een verse kloon zonder `npm install` is
   er geen browser en blijft de meester staan zonder afgeleiden. */
function draaiMerk() {
  return new Promise(ok => {
    execFile(process.execPath, [path.join(ROOT, 'test', 'merk.js')],
      { cwd: ROOT, maxBuffer: 8e6, timeout: 3e5 }, (e, uit, err) => {
        const tekst = String(uit || '').trim() || String(err || '').trim();
        if (!e) {
          const cache = bumpCache();
          return ok({ ok: true, tekst: 'Afgeleiden bijgewerkt' + (cache ? ' · sw ' + cache : '') + '\n' + tekst });
        }
        const reden = /Cannot find module|playwright/i.test(String(err || uit || e.message))
          ? 'Hiervoor is een browser nodig. Draai eerst `npm install` en probeer het opnieuw.'
          : 'Bekijk de uitvoer hieronder.';
        ok({ ok: false, tekst: 'De afgeleiden konden niet worden bijgewerkt.\n' + reden
          + '\n\n' + (tekst || String(e.message)).split('\n').slice(-12).join('\n') });
      });
  });
}

async function api(req, res, url) {
  try {
    if (url === '/api/versie') return json(res, versie.feiten());
    if (url === '/api/openwerk') return json(res, versie.opengewerk());
    if (url === '/api/bronnen') return json(res, await versie.bronnen());
    if (url === '/api/beelden') {
      delete require.cache[require.resolve('./beelden.js')];
      delete require.cache[require.resolve('./werelden.js')];
      const b = require('./beelden.js').overzicht();
      return json(res, { assets: b.assets, schijf: b.schijf, gewijzigd: gewijzigdeAssets() });
    }
    if (url === '/api/werelden') {
      // Bij élk verzoek opnieuw inlezen: index.html verandert onder je handen
      // (een wissel van tak, de wereldstudio die het blok terugschrijft), en een
      // overzicht dat dat niet ziet is erger dan geen overzicht.
      delete require.cache[require.resolve('./werelden.js')];
      delete require.cache[require.resolve('./app.js')];
      return json(res, require('./werelden.js').overzicht());
    }
    if (req.method !== 'POST') return json(res, { ok: false, tekst: 'onbekende poort' }, 404);
    if (url === '/api/haalop') return json(res, await versie.haalOp());
    if (url === '/api/bijwerken') return json(res, await versie.bijwerken());
    if (url === '/api/wissel') return json(res, await versie.wissel(await lees(req)));
    if (url === '/api/keuring') return json(res, await keuring());
    if (url === '/api/merk') return json(res, await draaiMerk());
    /* De uitwegen voor open werk. Lezen mag altijd; de vier die iets doen staan
       in test/versie.js en gooien geen van alle iets weg zonder dat je het zelf
       zegt -- terugdraaien gaat zelfs in twee stappen. */
    if (url === '/api/opzij') return json(res, await versie.opzij());
    if (url === '/api/haalterug') return json(res, await versie.haalTerug());
    if (url === '/api/vastleggen') return json(res, await versie.vastleggen(await lees(req, 200)));
    if (url === '/api/terugdraaien') return json(res, await versie.terugdraaien(await lees(req, 20)));
    return json(res, { ok: false, tekst: 'onbekende poort' }, 404);
  } catch (e) {
    json(res, { ok: false, tekst: String(e && e.message || e) }, 500);
  }
}

process.on('uncaughtException', e => {
  if (e && e.code === 'EADDRINUSE') {
    /* Er draait er al een. Kwam je hier via de snelkoppeling op je bureaublad
       (--open), dan is "de studio openen" precies wat je bedoelde -- dan is een
       tweede server niet nodig en een foutmelding gewoon verkeerd. Dubbelklikken
       terwijl hij al draait hoort het venster te openen, niet te klagen. */
    const studio = 'http://localhost:' + PORT + '/studio';
    if (process.argv.indexOf('--open') >= 0) {
      console.log('\n  Er draait hier al een studio — ik open dat venster.\n  ' + studio + '\n');
      openBrowser(studio);
      setTimeout(() => process.exit(0), 1500);
      return;
    }
    console.error('\n  Poort ' + PORT + ' is al bezet — er draait waarschijnlijk al een studio.'
      + '\n  Open ' + studio + ', of start met een andere poort:'
      + '\n      PORT=8100 npm run studio\n');
    process.exit(1);
  }
  // Al het andere is een echte fout: laat hem zien en stop, in plaats van hem
  // binnen deze afhandelaar opnieuw te gooien.
  console.error(e && e.stack || e);
  process.exit(1);
});

const server = http.createServer(function (req, res) {
  const url = decodeURIComponent(req.url.split('?')[0]);

  if (url.indexOf('/api/') === 0) { api(req, res, url); return; }

  /* De ontwikkelstudio. /ts blijft naar de wereldstudio in de app wijzen: dat is
     het korte pad dat je op een telefoon intikt, en daar heb je aan een
     bedieningspaneel met een kijkvak niets -- de telefoon ís het kijkvak. */
  if (url === '/studio' || url === '/dev') {
    const lan = lanAdres();
    /* De pagina bij élk verzoek opnieuw opbouwen, net als de werelden hierboven.
       Wie aan de studio zélf werkt hoeft dan niet te herstarten om te zien wat
       hij veranderd heeft -- en dat scheelt precies de ronde waarin je denkt dat
       je wijziging niets deed. */
    delete require.cache[require.resolve('./hub.js')];
    delete require.cache[require.resolve('./scenario.js')];
    const hubNu = require('./hub.js');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    return res.end(hubNu.pagina({
      adres: 'http://localhost:' + PORT,
      lan: lan ? lan + ':' + PORT + '/t  (kaart) \u00b7 /ts  (wereldstudio)' : null,
    }));
  }

  if (req.method === 'POST' && url === '/publish') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 200) req.destroy(); });
    req.on('end', () => publish(body.trim(), res));
    return;
  }

  if (req.method === 'POST' && url === '/commit') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 4000) req.destroy(); });
    req.on('end', () => commitAll(body.trim(), res));
    return;
  }

  if (req.method === 'POST' && url === '/asset') {
    const q = new URLSearchParams((req.url.split('?')[1] || ''));
    return writeAsset(req, res, decodeURIComponent(q.get('to') || ''));
  }

  /* Een wereld hernoemen. Het id bepaalt de bestandsnaam, dus een hernoeming zonder
     dit laat de tekening als wees achter en de wereld zonder beeld -- en dan moet je
     'm opnieuw genereren voor niets. Beide paden gaan door dezelfde allowlist als een
     gewone upload, dus er valt hier niets te verzinnen dat een schrijfactie elders
     mogelijk maakt. */
  if (req.method === 'POST' && url === '/hernoem') {
    const q = new URLSearchParams((req.url.split('?')[1] || ''));
    return renameAsset(res, decodeURIComponent(q.get('van') || ''), decodeURIComponent(q.get('naar') || ''));
  }

  /* Een kandidaat weggooien: het bestand uit incoming/ halen. Gebeurt als je in
     de studio "weggooien" kiest, en ook stil zodra een kandidaat het gewórden is --
     dan staat hij in assets/ en hoort hij niet als "nieuw" naast zichzelf te blijven
     staan. Alleen een bestandsnaam, alleen in incoming/, en niets met een schuine
     streep erin: er valt hier niets te verzinnen dat buiten die map wijst. */
  if (req.method === 'POST' && url === '/incoming-weg') {
    const q = new URLSearchParams((req.url.split('?')[1] || ''));
    const naam = decodeURIComponent(q.get('f') || '');
    const zeg = (code, tekst) => { res.writeHead(code, { 'content-type': 'text/plain' }); res.end(tekst); };
    if (!naam || /[\\/]/.test(naam) || naam === '.' || naam === '..') return zeg(400, 'geen geldige naam: ' + naam);
    const f = path.join(DROP, naam);
    if (!fs.existsSync(f)) return zeg(404, naam + ' ligt er niet (meer)');
    try { fs.unlinkSync(f); console.log('  wereldstudio: incoming/' + naam + ' weg'); zeg(200, 'weg'); }
    catch (e) { zeg(500, String(e.message)); }
    return;
  }

  if (req.method === 'POST' && url === '/schermkunst') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 2000) req.destroy(); });
    req.on('end', () => writeSchermkunst(body, res));
    return;
  }

  if (req.method === 'POST' && url === '/werelden') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 200000) req.destroy(); });
    req.on('end', () => writeWorlds(body, res));
    return;
  }

  /* Kort pad om op een telefoon in te tikken: 192.168.x.x:8099/t is te doen, de
     volledige studio-URL met vier queryparameters niet.

     /t4 opent meteen in wereld 4 (zie &wereld= bij de debugvlaggen). Dat is het
     verschil tussen een kaart bekijken en er eerst een uur naartoe spelen -- en
     op een telefoon is het één teken extra in plaats van een URL met vijf
     parameters. Er wordt niets weggeschreven: die vlag grendelt de opslag. */
  const kort = /^\/t(\d*)$/.exec(url);
  if (kort || url === '/telefoon') {
    const n = kort && kort[1];
    res.writeHead(302, { location: '/?debug&demo&star=p1' + (n ? '&wereld=' + n : '') + '&screen=map' });
    return res.end();
  }
  if (url === '/ts') {
    res.writeHead(302, { location: '/?debug&demo&star=p1&screen=map&mapedit' });
    return res.end();
  }

  if (url === '/' || url === '/index.html') {
    const body = page(dropped());
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    return res.end(body);
  }

  // Alleen incoming/ en de bestanden die naast index.html horen. Geen ../ .
  const safe = path.normalize(url).replace(/^(\.\.[/\\])+/, '');
  const file = path.join(ROOT, safe);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    return res.end('niet gevonden: ' + url);
  }
  const ext = path.extname(file).toLowerCase();
  const type = ext === '.js' ? 'text/javascript' : ext === '.json' ? 'application/json'
             : ext === '.css' ? 'text/css' : ext === '.svg' ? 'image/svg+xml'
             : ext === '.woff2' ? 'font/woff2'
             : scene.isImage(file) ? scene.mimeFor(file) : 'application/octet-stream';
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

/* ---- Meteen naar de nieuwste versie (--naar) -------------------------------
   De snelkoppeling startte altijd wát er uitgecheckt stond. Dat is met opzet
   -- een gereedschap dat stilletjes je werkmap verzet is een gereedschap dat je
   niet meer vertrouwt -- maar het betekende ook dat "even de nieuwste main
   bekijken" drie handelingen was, en dat je het vergat. Dan kijk je naar de
   studio van vorige week en zoek je waarom je wijziging er niet in zit.

     --naar=main       de laatste main (fetch + checkout + fast-forward)
     --naar=156        PR #156, met een losse kop: kijken, niet doorwerken
     --naar=pr/156     hetzelfde
     --naar=een-tak    die tak
     --naar=vraag      vraagt het bij het starten, met main als antwoord op Enter
     (weglaten)        zoals altijd: start wat er uitgecheckt staat

   Twee dingen die dit NIET doet, en dat blijft zo. Het gooit geen werk weg: staat
   er iets open in de werkmap, dan weigert de wissel (zie versie.wissel) en start
   de studio gewoon op wat er stond -- mét de melding erbij, zodat je het in het
   vak "Open werk" kunt oplossen. En het voegt nooit samen: bijwerken gaat
   fast-forward of niet. */
function vraagBron() {
  return new Promise(ok => {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    rl.question('\n  Welke bron? Enter = de laatste main, of een PR-nummer: ', antwoord => {
      rl.close();
      ok(String(antwoord || '').trim());
    });
  });
}
/* "156" is geen tak maar een PR-nummer -- dat is wat een mens intikt. */
function bronNaam(ruw) {
  const t = String(ruw || '').trim();
  if (!t || t === 'main' || t === 'true') return 'main';
  if (/^\d+$/.test(t)) return 'pr/' + t;
  return t;
}
/* Een vingerafdruk van de server zelf: alles in test/ dat hij draait.

   Dit is nodig omdat deze server zichzélf vervangt. Hij leest index.html en
   test/hub.js per verzoek opnieuw (dat is met opzet), maar preview.js, scene.js,
   merk.js en versie.js zitten al in het geheugen zodra hij draait. Wissel je naar
   een tak waar de studio veranderd is, dan krijg je de nieuwe pagina op de oude
   server -- en die combinatie heeft nooit bestaan. Precies de storing waarvan je
   denkt dat je nieuwe werk stuk is.

   Dus: vóór en ná de wissel meten, en bij verschil opnieuw opstarten. */
function codeVingerafdruk() {
  const map = path.join(ROOT, 'test');
  try {
    return fs.readdirSync(map).filter(n => n.endsWith('.js')).sort()
      .map(n => n + ':' + fs.statSync(path.join(map, n)).size
        + ':' + fs.readFileSync(path.join(map, n), 'utf8').length).join('|');
  } catch (e) { return ''; }
}
/* Opnieuw opstarten met dezelfde node en dezelfde vlaggen, maar zónder --naar:
   de wissel is al gebeurd, en nog een keer vragen zou onzin zijn. */
function herstart() {
  console.log('  De studio zelf is ook veranderd — opnieuw opstarten…\n');
  const argv = process.argv.slice(1).filter(a => !/^--naar(=|$)/.test(a));
  const kind = execFile(process.execPath, argv, { cwd: ROOT });
  kind.stdout.pipe(process.stdout);
  kind.stderr.pipe(process.stderr);
  kind.on('exit', code => process.exit(code == null ? 0 : code));
  return new Promise(() => {});      // deze beurt gaat niet verder
}

async function naarBron(ruw) {
  if (!versie.feiten().git) {
    console.log('\n  Dit is geen git-map, dus er valt niets te wisselen.\n');
    return;
  }
  const ref = bronNaam(ruw === 'vraag' ? await vraagBron() : ruw);
  console.log('\n  Ophalen…');
  const voor = codeVingerafdruk();
  const opgehaald = await versie.haalOp();
  if (!opgehaald.ok) console.log('  ophalen mislukt (' + opgehaald.tekst + ') — ik probeer het met wat er al was');
  const r = await versie.wissel(ref);
  if (r.ok) {
    console.log('  ' + r.tekst + '\n');
    if (codeVingerafdruk() !== voor) await herstart();
    return;
  }
  /* Geweigerd. Dat is geen storing maar een beslissing die op jou wacht, dus:
     zeggen wát er in de weg staat, en gewoon doorstarten -- in de studio staat
     het vak "Open werk" er met de drie uitwegen naast. */
  console.log('\n  Niet gewisseld naar ' + ref + ':');
  console.log('  ' + r.tekst.replace(/\n/g, '\n  '));
  (r.vuileRegels || []).forEach(v => console.log('    ' + v));
  /* Alleen bij open werk naar het vak wijzen dat daarover gaat. Een PR-nummer dat
     niet bestaat is een typefout, en daar helpt "Open werk" niets aan -- een raad
     die niet past leest als ruis. */
  console.log(r.vuileRegels && r.vuileRegels.length
    ? '\n  De studio start op wat er nu staat. In "Open werk" kun je het'
      + '\n  opzij zetten, vastleggen of terugdraaien, en daarna wisselen.\n'
    : '\n  De studio start op wat er nu staat; kies in de bronnenlijst iets anders.\n');
}
/* Is de poort vrij? Vóór een wissel willen we dat weten: draait er al een studio,
   dan zou deze de werkmap onder díé server vandaan verzetten, en dan kijk je naar
   een half verwisselde versie zonder dat iets dat zegt. */
function poortVrij(port) {
  return new Promise(ok => {
    const proef = require('net').createServer();
    proef.once('error', () => ok(false));
    proef.once('listening', () => proef.close(() => ok(true)));
    proef.listen(port, '127.0.0.1');
  });
}

async function start() {
  const naar = process.argv.map(a => /^--naar(=(.*))?$/.exec(a)).filter(Boolean)[0];
  if (naar) {
    if (!(await poortVrij(PORT))) {
      console.error('\n  Er draait hier al een studio op poort ' + PORT + '.'
        + '\n  Een wissel van bron vraagt om een verse server: sluit dat venster eerst'
        + '\n  (Ctrl-C), en probeer het opnieuw.\n');
      process.exit(1);
    }
    await naarBron(naar[2] === undefined ? 'main' : naar[2]);
  }
  server.listen(PORT, gestart);
}

function gestart() {
  fs.mkdirSync(DROP, { recursive: true });
  const state = dropped();
  const studio = 'http://localhost:' + PORT + '/studio';
  const basis = 'http://localhost:' + PORT + '/?debug&demo&star=p1';
  const lan = lanAdres();
  const f = versie.feiten();

  console.log('\n  Dev Studio:     ' + studio);
  console.log('  Draait nu:      ' + f.samenvatting);
  console.log('  Wereldstudio:   ' + basis + '&screen=map&mapedit');
  console.log('  Gewoon kijken:  ' + basis + '&screen=game\n');
  if (lan) {
    console.log('  Op je telefoon (zelfde wifi), tik dit in:');
    console.log('    ' + lan + ':' + PORT + '/t     de kaart');
    console.log('    ' + lan + ':' + PORT + '/t4    de kaart, meteen in wereld 4');
    console.log('    ' + lan + ':' + PORT + '/ts    de wereldstudio\n');
  }
  if (state.found.length) state.found.forEach(f2 => console.log('  gevonden: ' + f2.slot + ' <- ' + f2.file));
  else console.log('  incoming/ is leeg. Herkende namen:\n' + scene.namesHint());
  console.log('');

  /* Ophalen op de achtergrond. `git fetch` raakt de werkmap niet aan, dus dit kan
     nooit werk kosten -- maar het kost wél seconden op een trage lijn, en de
     studio hoort meteen open te gaan. Hij meldt zich als hij klaar is; de pagina
     ziet het vanzelf (ze vraagt de versie elke halve minuut opnieuw op). */
  if (f.git) {
    versie.haalOp().then(r => console.log('  ' + (r.ok
      ? 'verte opgehaald — de bronnenlijst in de studio is bij'
      : 'ophalen mislukt (' + r.tekst + ') — de studio werkt gewoon, maar met wat er al was)')));
  } else {
    console.log('  Let op: dit is geen git-map, dus de studio kan niet zeggen welke versie er draait.');
  }

  if (process.argv.indexOf('--open') >= 0) openBrowser(studio);
}

/* Het venster openen. Drie besturingssystemen, drie namen voor hetzelfde, en als
   geen van drieën bestaat is dat geen fout: de URL staat hierboven en je klikt
   hem zelf aan. */
function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? ['open', [url]]
    : process.platform === 'win32' ? [process.env.COMSPEC || 'cmd', ['/c', 'start', '', url]]
    : ['xdg-open', [url]];
  execFile(cmd[0], cmd[1], err => {
    if (err) console.log('  (open het venster zelf: ' + url + ')');
  });
}

start();
