/*
 * Kandidaat-beelden beoordelen zoals ze straks écht staan.
 *
 *   npm run try                    alles wat in incoming/ ligt
 *   npm run try -- pad/naar/x.webp één bepaald bestand
 *
 * De naam bepaalt de plek (zie test/scene.js); instellen hoef je niets.
 *
 * Waarom dit bestaat: een achtergrond beoordelen als losse afbeelding is
 * precies de fout waar het stijldocument voor waarschuwt. Hij ziet er op volle
 * grootte prachtig uit en valt daarna om onder een donkere sluier met een
 * somkaart erbovenop. Dit script zet 'm achter het échte scherm, op alle drie
 * de maten, en levert er de keuringsbeelden bij.
 *
 * Wil je klikken in plaats van kijken: npm run preview.
 *
 * Er wordt NIETS aan de app gewijzigd -- alle opmaak wordt bij het laden
 * ingespoten, en incoming/ staat in .gitignore. Een afgekeurde generatie laat
 * geen spoor na.
 *
 * Uitvoer in shots/try/ (staat in .gitignore), met een index.html erbij: open
 * die, dan zie je alles naast elkaar in plaats van los in een map.
 */
const fs = require('fs');
const path = require('path');
const { launch, cacheFonts } = require('./browser.js');
const scene = require('./scene.js');

const ROOT = path.resolve(__dirname, '..');
const DROP = path.join(ROOT, 'incoming');
const OUT = path.join(ROOT, 'shots', 'try');
const APP = 'file://' + path.join(ROOT, 'index.html') + '?debug';

const VIEWS = [
  { w: 390, h: 844, name: '390x844' },
  { w: 320, h: 568, name: '320x568-krap' },
  { w: 1024, h: 768, name: '1024x768-tablet' },
];

// ---- welke bestanden, en waar horen ze ----------------------------------
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
let files = args.length
  ? args
  : (fs.existsSync(DROP) ? fs.readdirSync(DROP).sort().map(f => path.join(DROP, f)) : []);
files = files.filter(f => scene.isImage(f));

if (!files.length) {
  console.error(args.length
    ? 'Geen bruikbare afbeelding in wat je opgaf.'
    : 'incoming/ is leeg. Zet er een afbeelding in, of geef een pad op.\n\nHerkende namen:\n' + scene.namesHint());
  process.exit(1);
}

const urls = {}, items = [], onbekend = [];
for (const file of files) {
  if (!fs.existsSync(file)) { console.error('Niet gevonden: ' + file); process.exit(1); }
  const slot = scene.classify(file);
  if (!slot) { onbekend.push(path.basename(file)); continue; }
  const uri = 'data:' + scene.mimeFor(file) + ';base64,' + fs.readFileSync(file).toString('base64');
  urls[slot] = uri;
  items.push({ slot, uri, name: path.basename(file), kb: Math.round(fs.statSync(file).size / 1024) });
}
if (!items.length) {
  console.error('Geen herkende namen: ' + onbekend.join(', ') + '\n\nHerkende namen:\n' + scene.namesHint());
  process.exit(1);
}

// alleen de schermen fotograferen waar ook echt iets voor aangeleverd is
const screens = [...new Set(items.map(i => scene.SLOTS[i.slot].screen))];

// ---- keuringspagina per afbeelding --------------------------------------
function keuring(it) {
  return `<style>
  body{margin:0;background:#0d0616;font:13px/1.4 system-ui,sans-serif;color:#f1e9f7}
  .wrap{padding:16px}
  h2{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#ffb43d;margin:0 0 10px}
  .box{position:relative;display:inline-block;line-height:0;margin-bottom:22px}
  .box img{display:block;max-width:900px;width:100%}
  .safe{position:absolute;left:0;right:0;bottom:0;height:55%;border:2px dashed rgba(255,180,61,.9);background:rgba(255,180,61,.10)}
  .top{position:absolute;left:0;right:0;top:0;height:33%;border:2px dashed rgba(143,214,255,.75);background:rgba(56,189,248,.10)}
  .edge{position:absolute;top:0;bottom:0;width:12%;background:rgba(232,118,138,.16);border-inline:2px dashed rgba(232,118,138,.75)}
  .edge.l{left:0}.edge.r{right:0}
  .lbl{position:absolute;left:8px;font-size:11px;font-weight:700;color:#0d0616;background:#ffb43d;padding:3px 7px;border-radius:3px}
  .lbl.b{bottom:8px}.lbl.t{top:8px;background:#8fd6ff}
  .row{display:flex;gap:26px;align-items:flex-start;flex-wrap:wrap}
  .thumb img{width:180px}
  .flat img{max-width:520px;filter:grayscale(1) contrast(2.6) brightness(1.05)}
  p{max-width:60ch;color:#a793bc;margin:0 0 18px}
</style>
<div class="wrap">
  <h2>${it.name} &mdash; ${it.slot} &mdash; ${it.kb} KB${it.kb > 120 ? ' ⚠ boven het budget' : ''}</h2>
  <h2>Zones</h2>
  <p>Goud = de onderste 55% moet leeg, glad en contrastarm zijn: daar staan de som en de
     antwoordtegels. Blauw = de bovenste derde mág juist leven (bundels, glinstering).
     Roze = niets belangrijks binnen 12% van de zijranden.</p>
  <div class="box">
    <img src="${it.uri}">
    <div class="safe"></div><div class="top"></div>
    <div class="edge l"></div><div class="edge r"></div>
    <div class="lbl b">onderste 55% rustig</div><div class="lbl t">bovenste derde mag leven</div>
  </div>
  <div class="row">
    <div class="thumb">
      <h2>Duimnageltest &mdash; 180px</h2>
      <p style="max-width:30ch">Wordt het beeld hier duidelijk minder geslaagd?<br>Dan is het te gedetailleerd.</p>
      <img src="${it.uri}">
    </div>
    <div class="flat">
      <h2>Platslaan-test</h2>
      <p style="max-width:40ch">Ontkleurd en uitgebeten. Leest het nog als theater / club / stadion?</p>
      <img src="${it.uri}">
    </div>
  </div>
</div>`;
}

// ---- contactblad: alles op één pagina ------------------------------------
function index(shots) {
  const groepen = {};
  for (const s of shots) (groepen[s.view] = groepen[s.view] || []).push(s);
  const secties = Object.keys(groepen).map(view => `
    <h2>${view}</h2>
    <div class="row">${groepen[view].map(s => `
      <figure><img src="${s.file}"><figcaption>${s.screen} &middot; ${s.scrim ? 'met sluier' : 'zonder sluier'}</figcaption></figure>`).join('')}
    </div>`).join('');
  return `<!doctype html><meta charset="utf-8"><title>try</title>
<style>
  body{margin:0;background:#0d0616;color:#f1e9f7;font:13px/1.5 system-ui,sans-serif;padding:20px}
  h1{font-size:16px;color:#ffb43d;margin:0 0 4px}
  h2{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8fd6ff;margin:26px 0 8px}
  .row{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start}
  figure{margin:0}
  figure img{display:block;max-height:460px;border-radius:6px;border:1px solid rgba(255,255,255,.12)}
  figcaption{margin-top:5px;color:#a793bc;font-size:11px}
  .meta{color:#a793bc;margin:0 0 6px}
  .over{color:#ffb4b4}
  a{color:#8fd6ff}
</style>
<h1>Kandidaten</h1>
<p class="meta">${items.map(i => `${i.slot} &larr; ${i.name} <span class="${i.kb > 120 ? 'over' : ''}">(${i.kb} KB)</span>`).join(' &middot; ')}</p>
<p class="meta">Keuringsbeelden: ${items.map(i => `<a href="keuring-${i.slot}.png">${i.slot}</a>`).join(' &middot; ')}</p>
${secties}`;
}

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await cacheFonts(page);

  const shots = [];
  for (const view of VIEWS) {
    await page.setViewportSize({ width: view.w, height: view.h });
    for (const screen of screens) {
      for (const scrim of [true, false]) {
        await page.goto(APP + '&demo&star=p1&screen=' + screen);
        await page.addStyleTag({ content: scene.css(urls, { scrim }) });
        await page.waitForTimeout(screen === 'end' ? 3200 : 1200);
        const file = `${view.name}-${screen}-${scrim ? 'sluier' : 'kaal'}.png`;
        await page.screenshot({ path: path.join(OUT, file) });
        shots.push({ file, view: view.name, screen, scrim });
        process.stdout.write('.');
      }
    }
  }

  /* Keuringsbeelden in een éígen tabblad. In hetzelfde tabblad wegnavigeren
     terwijl er een show loopt laat de spotlight-teller (startSpot, een
     setInterval) nog één keer vuren op een half afgebroken document -- dan is
     $('spotlight-bar') null. Dat is een race in dit script, niet in de app,
     maar hij vervuilt wel de foutenlijst hierboven. */
  const check = await context.newPage();
  await check.setViewportSize({ width: 1000, height: 1400 });
  for (const it of items) {
    await check.setContent(keuring(it));
    await check.waitForTimeout(300);
    await check.screenshot({ path: path.join(OUT, 'keuring-' + it.slot + '.png'), fullPage: true });
  }
  await check.close();
  await browser.close();

  fs.writeFileSync(path.join(OUT, 'index.html'), index(shots));
  console.log('\n');
  items.forEach(i => console.log('  ' + i.slot.padEnd(8) + ' <- ' + i.name + '  ' + i.kb + ' KB' +
    (i.kb > 120 ? '  ⚠ boven het budget van 120 KB' : '')));
  if (onbekend.length) console.log('\n  overgeslagen (onbekende naam): ' + onbekend.join(', '));
  console.log('\n  open:  ' + path.join(OUT, 'index.html') + '\n');
  if (errors.length) {
    console.log('Fouten in de pagina:');
    [...new Set(errors)].forEach(e => console.log('  ' + e));
  }
})();
