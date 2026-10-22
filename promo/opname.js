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

/* Marie rekent: plus, min en maal tot 20, met een paar sommen die nog lastig
   zijn en een paar die al geleerd zijn. Voor de twee schermen uit het ouderdeel
   en de som uit een latere wereld. De tellingen van de demo zelf (shows,
   sommen, sterren) blijven staan, zodat de cijfers bij elkaar passen. */
function marieRekent() {
  const p = db.profiles.p1;
  Object.assign(p.settings, { track: 'math', ops: ['+', '-', 'x'], max: 20, tables: [2, 5, 10], mode: 'kies' });
  p.weak = {
    '8 + 5 = @': { ans: 13, op: '+', w: 5 }, '13 − 6 = @': { ans: 7, op: '-', w: 4 },
    '7 + 6 = @': { ans: 13, op: '+', w: 3 }, '5 × 6 = @': { ans: 30, op: 'x', w: 2 },
    '15 − 8 = @': { ans: 7, op: '-', w: 2 },
  };
  p.learned = p.learned || {};
  ['9 + 4 = @', '12 − 5 = @', '6 + 7 = @', '2 × 8 = @', '14 − 9 = @', '5 × 4 = @', '8 + 8 = @']
    .forEach(k => { p.learned[k] = p.learned[k] || { ans: 0, op: '+', t: Date.now() }; });
  ['+', '-', 'x'].forEach(o => { const t = ot(p, o); t.n = Math.max(t.n, 30); t.acc = .88; t.fast = .64; });
  // de laatste shows, voor de statuskaart in Voortgang: zonder p.recent zegt die
  // "Net begonnen", naast vijf shows en tweehonderd sommen
  p.recent = [3, 2, 3, 3, 2, 3, 2, 3, 3, 2];
}

const SCHERMEN = [
  { key: '01-profielkeuze', go: () => { cur = null; goProfiles(); } },
  { key: '02-kaart', go: () => selectProfile('p1') },
  // een tafelsom uit een latere wereld: bij "maal en delen" hoort geen 2 − 1
  { key: '04-show-rekenen', go: () => {
      selectProfile('p1'); marieRekent(); P().settings.ops = ['x'];
      const l = WORLD_START[2] + 2;
      startLevel(l);
      // de sommen zijn willekeurig; zoek er een waar echt iets te rekenen valt (5 × 6, niet 1 × 5)
      let q, n = 0;
      do q = genQuestion(P().settings, l, P().perf); while (!/[3-9] × [3-9]/.test(q.tmpl) && ++n < 300);
      G.qs[G.idx] = q; renderQuestion();
    } },
  { key: '05-einde', wacht: 3200, go: () => { selectProfile('p1'); startLevel(6); G.stars = 3; endLevel(true); } },
  { key: '06-kleedkamer', go: () => { selectProfile('p1'); openKleedkamer(); } },
  { key: '09-trofeeen', go: () => { selectProfile('p1'); openTrophies(); } },
  // het rekenen, voor de ouder: zo stel je het in, en zo zie je hoe het gaat
  { key: '07-ouder-oefenen', go: () => { marieRekent(); openSettings(); setKey = 'p1'; setTab = 'oefenen'; renderSettings(); } },
  { key: '08-ouder-voortgang', go: () => { marieRekent(); openSettings(); setKey = 'p1'; setTab = 'voortgang'; renderSettings(); } },
  // Anna telt: een cijfer op de kaart, en dan kies je het groepje dat zo veel is
  // (fase 6). Een vraag waaraan je ziet dat er geteld wordt, niet "de meeste".
  // (Twee groepjes samen, fase 8, breekt op een telefoon over twee regels.)
  { key: '03-show-tellen', go: () => {
      selectProfile('p2');
      const p = P();
      p.settings.stageMax = Math.max(p.settings.stageMax || 0, 6);
      p.countTrack = Object.assign(p.countTrack || {}, { stage: 6 });
      startLevel(2);
      let q, n = 0;
      do q = genCount(p); while ((q.ctype !== 'numquant' || q.ans !== 4) && ++n < 400);
      G.qs[G.idx] = q; renderQuestion();
    } },
  // de podia: in de kleedkamer, naast de kleren
  { key: '10-podia', go: () => { selectProfile('p1'); openKleedkamer(); openPodia(); } },
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
    await page.evaluate('window.marieRekent = ' + marieRekent);
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
