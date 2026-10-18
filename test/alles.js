/*
 * Alle browsersuites, een paar tegelijk.
 *
 * `npm test` draait ze één voor één, en dat duurt een kwartier -- vrijwel
 * allemaal wachten: een suite gebruikt de processor een paar procent van de tijd
 * en staat de rest te kijken naar een animatie die afloopt. Er tegelijk een paar
 * laten wachten scheelt dus bijna evenredig.
 *
 * Waarom dit naast `npm test` staat en hem niet vervangt: de suites meten op
 * enkele beeldjes, en op een drukke machine kan een overgang een beeldje te laat
 * zijn. `npm test` blijft de maatstaf; dit is de snelle ronde tussendoor. Valt
 * hier iets om, draai die ene suite dan los (`npm run test:<naam>`) voordat je
 * gaat zoeken.
 *
 * Elke suite draait als eigen proces met zijn eigen browser; ze delen niets
 * (tijdelijke mappen en poort 0, zie studio.test.js en hub.test.js).
 *
 *   npm run test:snel            de keuring, dan de browsersuites, 3 tegelijk
 *   TEGELIJK=2 npm run test:snel
 */
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const os = require('os');

const SUITES = ['counting', 'maths', 'profiles', 'ouder', 'rondgang', 'voortgang', 'reis',
  'vlucht', 'beloning', 'hub', 'onderrand', 'kop', 'studio'];
const TEGELIJK = Math.max(1, Number(process.env.TEGELIJK) || Math.min(3, os.cpus().length));

const check = spawnSync('npm', ['run', '--silent', 'check'], { stdio: 'inherit', shell: process.platform === 'win32' });
if (check.status !== 0) process.exit(1);

const begin = Date.now();
const rij = SUITES.slice();
const mis = [];
let bezig = 0;

function volgende() {
  if (!rij.length) { if (!bezig) klaar(); return; }
  const naam = rij.shift();
  bezig++;
  const t0 = Date.now();
  let uit = '';
  const k = spawn(process.execPath, [path.join(__dirname, naam + '.test.js')], { cwd: path.resolve(__dirname, '..') });
  k.stdout.on('data', d => { uit += d; });
  k.stderr.on('data', d => { uit += d; });
  k.on('close', code => {
    bezig--;
    const s = Math.round((Date.now() - t0) / 1000);
    const regel = (uit.trim().split('\n').filter(r => /controles/.test(r)).pop() || '').trim();
    console.log((code ? '✗ ' : '✓ ') + naam.padEnd(10) + String(s).padStart(4) + ' s  ' + regel);
    if (code) { mis.push(naam); console.log(uit.split('\n').slice(-25).join('\n')); }
    volgende();
  });
}
function klaar() {
  console.log(`\n${SUITES.length - mis.length}/${SUITES.length} suites geslaagd in `
    + Math.round((Date.now() - begin) / 1000) + ' s (' + TEGELIJK + ' tegelijk).');
  if (mis.length) { console.log('Om: ' + mis.join(', ') + ' -- draai die los om te zien of het aan de drukte lag.'); process.exit(1); }
}
for (let i = 0; i < TEGELIJK; i++) volgende();
