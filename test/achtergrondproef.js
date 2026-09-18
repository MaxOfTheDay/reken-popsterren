/*
 * De achtergrondproef: houdt de voorgrond het als de tekening eronder verandert?
 *
 *   npm run achtergrondproef      -> shots/achtergrondproef/<proef>/<scherm>.png
 *
 * Waaróm dit bestaat. De sterrenkeuze, de kleedkamer en de trofeeënkast krijgen
 * nieuwe tekeningen (PS-45 / PS-32). De kaartjes op die schermen zijn glas --
 * wit op .075 -- en halen hun contrast dus uit wat erachter staat. Dat werkt
 * prima zolang daar de nacht van de app staat, en het is meteen de manier waarop
 * zo'n scherm stil kapot gaat: iemand zet er een lichte tekening achter en de
 * namen zijn wég, zonder dat er één regel kleur veranderd is.
 *
 * De afspraak die dat voorkomt staat bij --kunst-sluier in index.html: een
 * schermtekening gaat in .app-sfeer::before, ónder die sluier. Dit script doet
 * precies dat -- het vervangt alleen de tekening en laat de sluier staan -- en
 * gooit er twee ondergronden in die veel erger zijn dan een echte tekening ooit
 * zal zijn: bijna wit, en een druk pastelverloop.
 *
 * Er wordt niets nagerekend: kijk naar de beelden. Kun je in beide proeven elke
 * naam, elk prijsje en elke knop lezen, dan draagt de voorgrond zichzelf en kan
 * de tekening eronder vervangen worden. Kun je dat niet, dan is het gebrek de
 * plek van de tekening -- niet de kleur van de letter.
 */
const fs = require('fs');
const path = require('path');
const { launch, cacheFonts, APP_URL } = require('./browser.js');

const PROEVEN = {
  wit: 'linear-gradient(#f4f1ea,#f4f1ea)',
  fel: 'linear-gradient(140deg,#fff3b0,#ffd6e0 40%,#bff0ff 70%,#e8ffd6)',
};
const SCHERMEN = [
  ['landing', () => { cur = null; goProfiles(); }],
  ['kleedkamer', () => { selectProfile('p1'); openKleedkamer(); }],
  ['trofeeen', () => { selectProfile('p1'); openTrophies(); }],
];

(async () => {
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await cacheFonts(page);
  let n = 0;
  for (const [proef, tekening] of Object.entries(PROEVEN)) {
    const dir = path.resolve(__dirname, '..', 'shots', 'achtergrondproef', proef);
    fs.mkdirSync(dir, { recursive: true });
    for (const [naam, ga] of SCHERMEN) {
      await page.goto(APP_URL + '&demo&star=p1');
      await page.waitForFunction(() => typeof selectProfile === 'function');
      // eslint-disable-next-line no-new-func
      await page.evaluate(fn => { new Function(fn)(); }, '(' + ga.toString() + ')()');
      await page.waitForTimeout(1500);
      await page.addStyleTag({ content: `
        .app-sfeer::before, #screen-profile.app-sfeer::before {
          background-image: var(--kunst-sluier), ${tekening} !important;
          background-size: cover, cover !important; }
        /* de grondkleur van de app mag niet meehelpen: dit gaat over de tekening */
        body { background: #101018 !important; }
        .grain { display: none !important; }` });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(dir, naam + '.png') });
      n++;
      process.stdout.write('.');
    }
  }
  await browser.close();
  console.log('\n' + n + ' beelden -> shots/achtergrondproef/');
})();
