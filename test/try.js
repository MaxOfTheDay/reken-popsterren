/*
 * Een kandidaat-achtergrond bekijken zoals hij straks écht staat.
 *
 *   npm run try -- pad/naar/venue-theater.webp
 *   npm run try -- pad/naar/map-horizon.webp --scene=map
 *
 * Waarom dit bestaat: een achtergrond beoordelen als losse afbeelding is precies
 * de fout waar het stijldocument voor waarschuwt. Hij ziet er op volle grootte
 * prachtig uit en valt daarna om onder een donkere sluier met een somkaart
 * erbovenop. Dit script zet 'm achter het échte scherm, op alle drie de maten,
 * en levert er meteen de keuringsbeelden bij.
 *
 * Er wordt NIETS aan de app gewijzigd: alle opmaak wordt bij het laden
 * ingespoten. Het bestand hoeft dus ook nog niet in assets/ te staan, en een
 * afgekeurde generatie laat geen spoor na.
 *
 * Uitvoer in shots/try-<naam>/ (staat in .gitignore):
 *
 *   <maat>-show-sluier    het spelscherm zoals het bedoeld is
 *   <maat>-show-kaal      hetzelfde zonder sluier -- laat zien wát de sluier doet
 *   keuring-veilige-zone  de afbeelding met de vrij te houden zones erop
 *   keuring-duim          180px breed: wordt het beeld hier duidelijk minder?
 *   keuring-silhouet      ontkleurd en uitgebeten, als benadering van de
 *                         platslaan-test -- leest het dan nog als theater?
 */
const fs = require('fs');
const path = require('path');
const { launch, cacheFonts, APP_URL } = require('./browser.js');

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const scene = (args.find(a => a.startsWith('--scene=')) || '--scene=venue').split('=')[1];

if (!file) {
  console.error('Gebruik: npm run try -- <afbeelding> [--scene=venue|map]');
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error('Niet gevonden: ' + file);
  process.exit(1);
}

const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
               '.jpeg': 'image/jpeg', '.avif': 'image/avif' };
const ext = path.extname(file).toLowerCase();
const dataUri = 'data:' + (MIME[ext] || 'image/webp') + ';base64,'
  + fs.readFileSync(file).toString('base64');

const name = path.basename(file, ext);
const OUT = path.resolve(__dirname, '..', 'shots', 'try-' + name);
const VIEWS = [
  { w: 390, h: 844, name: '390x844' },
  { w: 320, h: 568, name: '320x568-krap' },
  { w: 1024, h: 768, name: '1024x768-tablet' },
];

/* De sluier uit het stijldocument, en -- voor het spelscherm -- de .stage-splitsing
   uit paragraaf 9.1. Zonder die splitsing beoordeel je een geschilderd theater met
   een fotolijstje in het midden, en dat zegt niets over de tekening zelf. */
const SCRIM = 'radial-gradient(120% 70% at 50% 66%, rgba(20,4,40,.74), rgba(20,4,40,.30) 58%, transparent 82%)';

function sceneCss(withScrim) {
  const layers = (withScrim ? SCRIM + ',' : '') + 'url("' + dataUri + '")';
  if (scene === 'map') {
    return `#screen-map::before{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;
      background-image:${layers};background-size:cover,cover;background-position:50% 100%,50% 100%;}
      #screen-map .map-ground{display:none}`;
  }
  return `.game-arena{position:relative}
    .game-arena::before{content:'';position:absolute;inset:-8px -12px;z-index:-1;
      background-image:${layers};background-size:cover,cover;background-position:50% 30%,50% 30%;}
    /* paragraaf 9.1: op het spelscherm lost het kader op */
    #show-stage{border:none!important;box-shadow:none!important;background:transparent!important;overflow:visible!important}
    #show-stage::after{display:none!important}
    #show-stage .deco{display:none!important}
    #game-avatar-inner{filter:drop-shadow(0 0 7px rgba(255,180,61,.32))}`;
}

const CHECKS = `
  <style>
    body{margin:0;background:#0d0616;font:13px/1.4 system-ui,sans-serif;color:#f1e9f7}
    .wrap{padding:16px}
    h2{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#ffb43d;margin:0 0 10px}
    .box{position:relative;display:inline-block;line-height:0;margin-bottom:22px}
    .box img{display:block;max-width:900px;width:100%}
    /* onderste 55% moet leeg en rustig zijn; 12% aan weerszijden non-committal */
    .safe{position:absolute;left:0;right:0;bottom:0;height:55%;border:2px dashed rgba(255,180,61,.9);
      background:rgba(255,180,61,.10)}
    .edge{position:absolute;top:0;bottom:0;width:12%;background:rgba(232,118,138,.16);
      border-inline:2px dashed rgba(232,118,138,.75)}
    .edge.l{left:0}.edge.r{right:0}
    .lbl{position:absolute;left:8px;bottom:8px;font-size:11px;font-weight:700;color:#0d0616;
      background:#ffb43d;padding:3px 7px;border-radius:3px;line-height:1.3}
    .row{display:flex;gap:26px;align-items:flex-start;flex-wrap:wrap}
    .thumb img{width:180px;image-rendering:auto}
    .flat img{max-width:520px;filter:grayscale(1) contrast(2.6) brightness(1.05)}
    p{max-width:60ch;color:#a793bc;margin:0 0 18px}
  </style>
  <div class="wrap">
    <h2>Veilige zones</h2>
    <p>Goud = de onderste 55% moet leeg, glad en contrastarm zijn: daar staan de som, de
       spotlightbalk en vier antwoordtegels. Roze = niets belangrijks binnen 12% van de
       zijranden.</p>
    <div class="box">
      <img src="${dataUri}">
      <div class="safe"></div><div class="edge l"></div><div class="edge r"></div>
      <div class="lbl">onderste 55% vrijhouden</div>
    </div>
    <div class="row">
      <div class="thumb">
        <h2>Duimnageltest &mdash; 180px</h2>
        <p style="max-width:30ch">Wordt het beeld hier duidelijk minder geslaagd?<br>Dan is het te gedetailleerd.</p>
        <img src="${dataUri}">
      </div>
      <div class="flat">
        <h2>Platslaan-test</h2>
        <p style="max-width:40ch">Ontkleurd en uitgebeten. Leest het nog steeds als theater / club / stadion?</p>
        <img src="${dataUri}">
      </div>
    </div>
  </div>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await cacheFonts(page);

  const target = scene === 'map' ? 'map' : 'game';
  for (const view of VIEWS) {
    await page.setViewportSize({ width: view.w, height: view.h });
    for (const [suffix, withScrim] of [['show-sluier', true], ['show-kaal', false]]) {
      await page.goto(APP_URL + '&demo&star=p1&screen=' + target);
      await page.addStyleTag({ content: sceneCss(withScrim) });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(OUT, view.name + '-' + suffix + '.png') });
    }
  }

  /* Keuringsbeelden in een éígen tabblad. In hetzelfde tabblad wegnavigeren
     terwijl er een show loopt laat de spotlight-teller (startSpot, een
     setInterval) nog één keer vuren op een half afgebroken document -- dan is
     $('spotlight-bar') null. Dat is een race in dit script, niet in de app,
     maar hij vervuilt wel de foutenlijst hierboven. */
  const check = await context.newPage();
  await check.setViewportSize({ width: 1000, height: 1400 });
  await check.setContent(CHECKS);
  await check.waitForTimeout(400);
  await check.screenshot({ path: path.join(OUT, 'keuring.png'), fullPage: true });
  await check.close();

  await browser.close();
  const kb = Math.round(fs.statSync(file).size / 1024);
  console.log('\n' + name + ' — ' + kb + ' KB' + (kb > 120 ? '  ⚠ boven het budget van 120 KB' : ''));
  console.log('beelden -> ' + OUT);
  if (errors.length) {
    console.log('\nFouten in de pagina:');
    [...new Set(errors)].forEach(e => console.log('  ' + e));
  }
})();
