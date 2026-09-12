/*
 * Contactblad: elk scherm, op elk maatje, in één map.
 *
 * Aan het uiterlijk werken is vergelijken -- je kunt een achtergrond niet
 * beoordelen door één scherm één keer te bekijken. Dit script zet een hele set
 * naast elkaar, zodat "voor" en "na" echt te vergelijken zijn.
 *
 *   npm run shots            -> shots/huidig/...
 *   npm run shots -- fase0   -> shots/fase0/...
 *
 * De map shots/ staat in .gitignore: dit zijn werkbeelden, geen bronbestanden.
 *
 * Leunt op de ?debug-schakelaars onderaan index.html (zie daar), zodat dit
 * script niets over de binnenkant van de app hoeft te weten behalve welke
 * schermen er zijn.
 */
const fs = require('fs');
const path = require('path');
const { launch, cacheFonts, APP_URL } = require('./browser.js');

const label = process.argv[2] || 'huidig';
const OUT = path.resolve(__dirname, '..', 'shots', label);

// Alle schermen op telefoonmaat; op de krappe en de brede maat alleen de
// schermen waar de indeling écht anders uitpakt (daar gaat het mis, niet in
// het ouderdeel).
const PHONE = { w: 390, h: 844, name: '390x844' };
const VIEWS = [
  { ...PHONE, all: true },
  { w: 320, h: 568, name: '320x568-krap', all: false },
  { w: 1024, h: 768, name: '1024x768-tablet', all: false },
];

// key      -- bestandsnaam
// go       -- wat er in de pagina gebeurt om er te komen
// wide     -- ook op de krappe en brede maat vastleggen
// wacht    -- afwijkende wachttijd (ms) als er eerst een feestje overheen gaat
const SCREENS = [
  { key: '01-profielkeuze', wide: true,  go: () => { cur = null; goProfiles(); } },
  { key: '02-kaart',        wide: true,  go: () => selectProfile('p1') },
  { key: '03-sterstatus',   wide: false, go: () => { selectProfile('p1'); openCareer(); } },
  { key: '04-show-rekenen', wide: true,  go: () => { selectProfile('p1'); startLevel(6); } },
  // het eindscherm viert eerst: de sterren ploppen op met een ster-uitbarsting
  // eroverheen. Die duurt ongeveer een seconde; een beeld daar middenin zegt
  // niets over hoe het scherm eruitziet als je het leest.
  { key: '05-einde',        wide: true,  wacht: 3200, go: () => { selectProfile('p1'); startLevel(6); G.stars = 3; endLevel(true); } },
  { key: '06-kleedkamer',   wide: true,  go: () => { selectProfile('p1'); openKleedkamer(); } },
  { key: '07-podia',        wide: false, go: () => { selectProfile('p1'); openKleedkamer(); openKleedkamerCat('stage'); } },
  { key: '08-looks',        wide: false, go: () => { selectProfile('p1'); openKleedkamer(); shopView = 'looks'; renderShop(); } },
  { key: '09-trofeeen',     wide: true,  go: () => { selectProfile('p1'); openTrophies(); } },
  { key: '10-ouderdeel',    wide: false, go: () => { selectProfile('p1'); openSettings(); } },
  { key: '11-nieuwe-ster',  wide: false, go: () => { cur = null; goProfiles(); openNewStar('profile'); } },
  { key: '12-kaart-tellen', wide: false, go: () => selectProfile('p2') },
  { key: '13-show-tellen',  wide: false, go: () => { selectProfile('p2'); startLevel(2); } },
  { key: '14-memory',       wide: false, go: () => { selectProfile('p2'); startMemory(); } },
];

// Elk scherm krijgt een verse pagina: de app kent geen "sluit alles"-functie, en
// een overlay of een halve show die van het vorige scherm blijft hangen maakt
// juist de vergelijking onbetrouwbaar.
async function capture(page, screen, dir) {
  await page.goto(APP_URL + '&demo&star=p1');
  await page.waitForFunction(() => typeof selectProfile === 'function');
  await page.evaluate(fn => {
    // eslint-disable-next-line no-new-func
    new Function(fn)();
  }, '(' + screen.go.toString() + ')()');
  // wachten tot het bewegen klaar is: de sterren zwaaien bij het openen (950ms)
  await page.waitForTimeout(screen.wacht || 1500);
  await page.screenshot({ path: path.join(dir, screen.key + '.png') });
}

(async () => {
  const browser = await launch();
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await cacheFonts(page);

  let n = 0;
  for (const view of VIEWS) {
    const dir = path.join(OUT, view.name);
    fs.mkdirSync(dir, { recursive: true });
    await page.setViewportSize({ width: view.w, height: view.h });
    for (const screen of SCREENS) {
      if (!view.all && !screen.wide) continue;
      await capture(page, screen, dir);
      n++;
      process.stdout.write('.');
    }
  }
  await browser.close();

  console.log('\n' + n + ' beelden -> ' + OUT);
  if (errors.length) {
    console.log('\nFouten in de pagina (' + errors.length + '):');
    [...new Set(errors)].forEach(e => console.log('  ' + e));
    process.exitCode = 1;
  }
})();
