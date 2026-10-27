/*
 * Alle suites: `npm test` en `npm run test:snel` (hetzelfde).
 *
 * Eerst de keuring, dan de browsersuites een paar tegelijk, en wat omvalt nog
 * één keer alleen -- zie test/suites.js voor het hoe en waarom. Elk
 * test/*.test.js doet vanzelf mee; er staat nergens een lijst.
 *
 *   npm test
 *   npm run check              alleen de keuring (seconden, kaal Node)
 *   TEGELIJK=1 npm test        één voor één, zoals vroeger
 *   TEGELIJK=2 npm test
 *
 * Valt er iets om, draai die ene suite dan los (`npm run test:<naam>`) om te
 * zien wat er mis is.
 */
const path = require('path');
const { allesDraaien } = require('./suites');

const begin = Date.now();
allesDraaien({
  wortel: path.resolve(__dirname, '..'),
  tegelijk: process.env.TEGELIJK,
  alleenKeuring: process.argv.includes('--keuring'),
  log: regel => console.log(regel),
}).then(r => {
  const s = Math.round((Date.now() - begin) / 1000);
  if (r.wiebel.length) console.log('\nPas bij de tweede keer geslaagd: ' + r.wiebel.join(', ')
    + ' -- dat wiebelt; draai hem eens los als het vaker gebeurt.');
  if (!r.ok) {
    console.log('\n' + r.tekst);
    console.log('\nOm: ' + r.mis.join(', ') + ` (${s} s).`);
    process.exit(1);
  }
  console.log(`\n${process.argv.includes('--keuring') ? 'Keuring' : 'Alle suites'} geslaagd in ${s} s.`);
});
