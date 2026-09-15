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
const os = require('os');
const scene = require('./scene.js');

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
function assetsOpSchijf(dir, uit) {
  const vol = path.join(ROOT, dir);
  if (!fs.existsSync(vol)) return uit;
  for (const naam of fs.readdirSync(vol)) {
    const f = path.join(vol, naam);
    if (fs.statSync(f).isDirectory()) assetsOpSchijf(path.join(dir, naam), uit);
    else uit[path.join(dir, naam).split(path.sep).join('/')] = Math.round(fs.statSync(f).size / 1024);
  }
  return uit;
}
function studioData() {
  const lan = lanAdres();
  return '<script>window.__LAN=' + JSON.stringify(lan ? lan + ':' + PORT : null) + ';'
    + 'window.__SLOTS=' + JSON.stringify(scene.SLOTS, (k, v) =>
    v instanceof RegExp ? undefined : v)
    + ';window.__SCHERMEN=' + JSON.stringify(scene.SCHERMEN)
    + ';window.__ASSETS=' + JSON.stringify(assetsOpSchijf('assets', {})) + ';<\/script>';
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
  return html.replace('</head>', styles + studioData() + '</head>')
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
function renameAsset(res, van, naar) {
  const zeg = (code, tekst) => { res.writeHead(code, { 'content-type': 'text/plain' }); res.end(tekst); };
  if (!ASSET_OK.some(re => re.test(van)) || !ASSET_OK.some(re => re.test(naar))) {
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
/* npm heet op Windows npm.cmd, en dat is een batchbestand. execFile start een
   programma rechtstreeks via CreateProcess en dát kan geen .cmd uitvoeren: op
   Windows viel deze poort dus altijd om met "spawn npm ENOENT", nog voordat er
   één controle gedraaid was. git ging goed omdat git.exe een echt programma is.

   Geen shell: true erbij, want dan gaan de argumenten door een shell heen. Alleen
   de juiste naam kiezen is genoeg en heeft dat probleem niet. */
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function runTests() {
  return new Promise((ok, fout) => {
    execFile(NPM, ['test'], { cwd: ROOT, maxBuffer: 2e7, timeout: 6e5 }, (e, uit, err) => {
      if (!e) return ok(String(uit));
      /* e.message als terugval, net als in git() hierboven. Zonder die terugval gaf
         precies de storing die híer zat (ENOENT: geen uitvoer, alleen een foutcode)
         een melding van één regel zonder enige reden erbij -- en dan zoek je de fout
         in je eigen werelden in plaats van in deze poort. */
      const uitleg = String(uit || err).trim() || String(e.message).trim();
      fout(new Error('de testen falen — er is niets vastgelegd\n\n'
        + uitleg.split('\n').slice(-25).join('\n')));
    });
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

http.createServer(function (req, res) {
  const url = decodeURIComponent(req.url.split('?')[0]);

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

  if (req.method === 'POST' && url === '/werelden') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 200000) req.destroy(); });
    req.on('end', () => writeWorlds(body, res));
    return;
  }

  /* Kort pad om op een telefoon in te tikken: 192.168.x.x:8099/t is te doen, de
     volledige studio-URL met vier queryparameters niet. */
  if (url === '/t' || url === '/telefoon') {
    res.writeHead(302, { location: '/?debug&demo&star=p1&screen=map' });
    return res.end();
  }
  if (url === '/ts' || url === '/studio') {
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
             : scene.isImage(file) ? scene.mimeFor(file) : 'application/octet-stream';
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, function () {
  fs.mkdirSync(DROP, { recursive: true });
  const state = dropped();
  const basis = 'http://localhost:' + PORT + '/?debug&demo&star=p1';
  const lan = lanAdres();
  console.log('\n  Wereldstudio:   ' + basis + '&screen=map&mapedit');
  console.log('  Gewoon kijken:  ' + basis + '&screen=game\n');
  if (lan) {
    console.log('  Op je telefoon (zelfde wifi), tik dit in:');
    console.log('    ' + lan + ':' + PORT + '/t     de kaart');
    console.log('    ' + lan + ':' + PORT + '/ts    de studio\n');
  }
  console.log('  In de studio: sleep een beeld op het Beelden-vak, sleep de haltes en de');
  console.log('  groene ruitjes, en druk op "Zet in het spel".\n');
  if (state.found.length) state.found.forEach(f => console.log('  gevonden: ' + f.slot + ' <- ' + f.file));
  else console.log('  incoming/ is nog leeg. Herkende namen:\n' + scene.namesHint());
  console.log('');
});
