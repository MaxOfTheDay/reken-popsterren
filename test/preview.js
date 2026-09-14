/*
 * De échte app in je browser, met een kandidaat-achtergrond erachter.
 *
 *   npm run preview          -> http://localhost:8099
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
const { execFile } = require('child_process');
const path = require('path');
const scene = require('./scene.js');

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
 #kandidaat.dicht > :not(h6){display:none}
 #kandidaat.dicht h6{margin:0}
 #kandidaat h6{cursor:pointer}
 #kandidaat h6::after{content:' ▾';opacity:.6}
 #kandidaat.dicht h6::after{content:' ▸'}
</style>
<div id="kandidaat" class="dicht">
  <h6 title="klik om uit te klappen">kandidaat</h6>
  ${warn}
  <ul>${rows}</ul>
  <label><input type="checkbox" id="k-art" checked> kunstwerk aan <i>(uit = ervoor/erna)</i></label>
  <label><input type="checkbox" id="k-veil" checked> donkere sluier</label>
  <nav>${links}</nav>
</div>
<script>
(function () {
  // De servicewerker zou een oude versie van de app blijven serveren; dan kijk
  // je naar je vorige poging en denk je dat de nieuwe niets veranderd heeft.
  if (navigator.serviceWorker) {
    navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); });
    navigator.serviceWorker.register = function () { return Promise.reject(new Error('uit in preview')); };
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
  return html.replace('</head>', styles + '</head>')
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

/* De studio zet een tekening om naar webp (in de browser, met een canvas) en
   stuurt de bytes hierheen. Deze server schrijft ze weg -- alleen naar een pad dat
   hieronder staat, nergens anders. Zo hoeft er geen beeldbibliotheek in het project,
   en gebeurt het omzetten waar het beeld toch al geladen is.

   En hij hoogt meteen CACHE in sw.js op. Dat was de stap die je altijd vergeet: de
   servicewerker serveert alles onder /assets/ eerst uit de cache, dus een vervangen
   beeld met dezelfde naam blijft anders op elk toestel dat er al was het oude tonen. */
const ASSET_OK = [
  /^assets\/world\/[a-z0-9-]+-map\.webp$/,
  /^assets\/bg\/landing\.webp$/,
];
function bumpCache() {
  const f = path.join(ROOT, 'sw.js');
  const src = fs.readFileSync(f, 'utf8');
  const m = /const CACHE = '([a-z-]+)(\d+)';/.exec(src);
  if (!m) return null;
  const volgend = m[1] + (Number(m[2]) + 1);
  fs.writeFileSync(f, src.replace(m[0], "const CACHE = '" + volgend + "';"));
  return volgend;
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
      const cache = zelfde ? null : bumpCache();
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
function runTests() {
  return new Promise((ok, fout) => {
    execFile('npm', ['test'], { cwd: ROOT, maxBuffer: 2e7, timeout: 6e5 }, (e, uit, err) =>
      e ? fout(new Error('de testen falen — er is niets vastgelegd\n\n'
        + String(uit || err).split('\n').slice(-25).join('\n'))) : ok(String(uit)));
  });
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

http.createServer(function (req, res) {
  const url = decodeURIComponent(req.url.split('?')[0]);

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

  if (req.method === 'POST' && url === '/werelden') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 200000) req.destroy(); });
    req.on('end', () => writeWorlds(body, res));
    return;
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
             : scene.isImage(file) ? scene.mimeFor(file) : 'application/octet-stream';
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, function () {
  fs.mkdirSync(DROP, { recursive: true });
  const state = dropped();
  const basis = 'http://localhost:' + PORT + '/?debug&demo&star=p1';
  console.log('\n  Wereldstudio:   ' + basis + '&screen=map&mapedit');
  console.log('  Gewoon kijken:  ' + basis + '&screen=game\n');
  console.log('  In de studio: sleep een beeld op het Beelden-vak, sleep de haltes en de');
  console.log('  groene ruitjes, en druk op "Zet in het spel".\n');
  if (state.found.length) state.found.forEach(f => console.log('  gevonden: ' + f.slot + ' <- ' + f.file));
  else console.log('  incoming/ is nog leeg. Herkende namen:\n' + scene.namesHint());
  console.log('');
});
