/*
 * De schermen voor het promofilmpje, uit het echte spel.
 *
 *   node promo/opname.js      -> promo/beelden/*.jpg en promo/beelden/werelden.js
 *
 * Leunt op ?debug&demo net als test/shots.js, met twee verschillen:
 *
 *   - de voorbeeldsterren heten hier Marie, Anna en Clara. Dat gebeurt alleen in
 *     het geheugen van deze pagina (demo schrijft niets weg), dus de demo zelf
 *     -- en de tests die op "Lotte" en "Sem" leunen -- blijven zoals ze zijn.
 *   - hij schrijft ook de lijst werelden weg (beelden/werelden.js). Er komen
 *     steeds werelden bij; het filmpje leest die lijst en noemt nergens een
 *     aantal, dus opnieuw opnemen en renderen is genoeg.
 *
 * werelden.js is een gewoon script dat window.WERELDEN zet, geen JSON: promo.html
 * moet vanaf file:// werken, en daar mag fetch() niet.
 */
const fs = require('fs');
const path = require('path');
const { launch, cacheFonts, APP_URL } = require('../test/browser.js');

const OUT = path.join(__dirname, 'beelden');

// Marie is de ver gevorderde ster (de demoster p1), Anna telt nog (p2),
// Clara komt er als derde bij, zodat de sterrenkeuze vol staat.
function zetSterren() {
  const a = db.profiles.p1, b = db.profiles.p2;
  a.name = 'Marie';
  b.name = 'Anna'; b.base = 'meisje';
  b.equipped.hair = 'hair_bruin'; b.equipped.dress = 'dress_paars';
  const c = defaultProfile('Clara', 'dress_roze', { hair: 'hair_rood' });
  c.order = 2; c.level = 4; c.diamonds = 90; c.stars = { 1: 3, 2: 2, 3: 3 };
  db.profiles.p3 = c;
  renderProfiles();
}

const SCHERMEN = [
  { key: '01-profielkeuze', go: () => { cur = null; goProfiles(); } },
  { key: '02-kaart', go: () => selectProfile('p1') },
  { key: '02b-tournee', wacht: 2200, go: () => {
      selectProfile('p1');
      const q = P();
      for (let i = 0; i < 2; i++)
        for (let l = WORLD_START[i]; l < WORLD_START[i] + WORLDS[i].levels; l++) q.stars[l] = i ? 2 : 3;
      for (let l = WORLD_START[2]; l < WORLD_START[2] + 4; l++) q.stars[l] = 2;
      q.level = WORLD_START[2] + 4;
      goMap(); openReis();
    } },
  { key: '04-show-rekenen', go: () => { selectProfile('p1'); startLevel(6); } },
  { key: '05-einde', wacht: 3200, go: () => { selectProfile('p1'); startLevel(6); G.stars = 3; endLevel(true); } },
  { key: '06-kleedkamer', go: () => { selectProfile('p1'); openKleedkamer(); } },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const fouten = [];
  page.on('pageerror', e => fouten.push(e.message));
  await cacheFonts(page);

  for (const s of SCHERMEN) {
    await page.goto(APP_URL + '&demo&star=p1');
    await page.waitForFunction(() => typeof selectProfile === 'function');
    await page.evaluate('(' + zetSterren + ')()');
    await page.evaluate('(' + s.go + ')()');
    await page.waitForTimeout(s.wacht || 1500);
    await page.screenshot({ path: path.join(OUT, s.key + '.jpg'), type: 'jpeg', quality: 88 });
    process.stdout.write('.');
  }

  const werelden = await page.evaluate(() => WORLDS.map(w => ({ id: w.id, name: w.name, art: w.art })));
  fs.writeFileSync(path.join(OUT, 'werelden.js'),
    '// Geschreven door promo/opname.js -- niet met de hand bewerken.\n' +
    'window.WERELDEN = ' + JSON.stringify(werelden, null, 2) + ';\n');
  await browser.close();

  console.log(`\n${SCHERMEN.length} schermen en ${werelden.length} werelden -> ${OUT}`);
  if (fouten.length) { console.log('Fouten in de pagina:\n  ' + [...new Set(fouten)].join('\n  ')); process.exitCode = 1; }
})();
