/*
 * Alle suites draaien: één lijst, één manier. `npm test`, `npm run test:snel` en
 * de knop Publiceren in de studio gaan alle drie hierlangs.
 *
 * Hiervoor had elk zijn eigen lijst: een `a && b && c`-regel in package.json,
 * een rijtje namen in alles.js en een eigen lus in preview.js. Die liepen uit
 * elkaar (test:snel sloeg overzetten over), en een nieuwe suite moest je op
 * drie plekken bijzetten. Nu doet elk test/*.test.js vanzelf mee.
 *
 * DE VOLGORDE
 *   1. de keuring (inhoud, kern, saves, kleedkamer): seconden, één voor één, en
 *      bij de eerste fout stoppen -- valt die om, dan zegt de rest niets.
 *   2. de rest, een paar tegelijk. Een browsersuite gebruikt de processor een
 *      paar procent van de tijd en staat de rest te wachten op een animatie, dus
 *      tegelijk draaien scheelt bijna evenredig (± 5 minuten in plaats van 12+).
 *   3. wat daar omviel nog één keer, nu alléén. De suites meten op enkele
 *      beeldjes, en op een drukke machine kan een overgang een beeldje te laat
 *      zijn. Valt hij alleen óók om, dan is het een echte fout; slaagt hij
 *      alleen wel, dan staat hij in het verslag als "pas bij de tweede keer",
 *      zodat een suite die vaak wiebelt niet ongemerkt blijft wiebelen.
 *
 * Geen npm en geen shell: dezelfde node die dit draait krijgt elk bestand
 * rechtstreeks (zie eenTest in preview.js voor waarom dat op Windows moet).
 */
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const KEURING = ['inhoud', 'kern', 'saves', 'kleedkamer'];

function suites(wortel) {
  return fs.readdirSync(path.join(wortel, 'test'))
    .filter(n => n.endsWith('.test.js')).sort()
    .map(n => n.slice(0, -'.test.js'.length));
}

function draai(wortel, naam) {
  const t0 = Date.now();
  return new Promise(ok => {
    execFile(process.execPath, [path.join(wortel, 'test', naam + '.test.js')],
      { cwd: wortel, maxBuffer: 2e7, timeout: 6e5 }, (e, uit, err) => {
        const tekst = (String(uit || '') + String(err || '')).trim() || (e ? String(e.message) : '');
        ok({ naam, ok: !e, tekst, s: Math.round((Date.now() - t0) / 1000) });
      });
  });
}

// De regel "x/y controles geslaagd" uit de uitvoer, als die er is.
function slotregel(tekst) {
  return (tekst.split('\n').filter(r => /controles|geslaagd/.test(r)).pop() || '').trim();
}

/*
 * opties: { wortel, tegelijk, alleenKeuring, log(regel) }
 * Geeft { ok, mis: [namen], wiebel: [namen], tekst } -- tekst is de uitvoer van
 * wat er misging (of leeg).
 */
async function allesDraaien(opties) {
  const wortel = opties.wortel;
  const log = opties.log || (() => {});
  const tegelijk = Math.max(1, Number(opties.tegelijk) || Math.min(3, os.cpus().length));
  const alle = suites(wortel);
  const keuring = KEURING.filter(n => alle.includes(n));
  const rest = alle.filter(n => !KEURING.includes(n));

  for (const naam of keuring) {
    const r = await draai(wortel, naam);
    log((r.ok ? '✓ ' : '✗ ') + naam.padEnd(12) + String(r.s).padStart(4) + ' s  ' + slotregel(r.tekst));
    if (!r.ok) return { ok: false, mis: [naam], wiebel: [], tekst: naam + ':\n' + r.tekst.split('\n').slice(-25).join('\n') };
  }
  if (opties.alleenKeuring) return { ok: true, mis: [], wiebel: [], tekst: '' };

  const rij = rest.slice();
  const eerste = [];
  await Promise.all(Array.from({ length: tegelijk }, async () => {
    while (rij.length) {
      const r = await draai(wortel, rij.shift());
      log((r.ok ? '✓ ' : '· ') + r.naam.padEnd(12) + String(r.s).padStart(4) + ' s  '
        + (r.ok ? slotregel(r.tekst) : 'om -- straks nog eens, alleen'));
      if (!r.ok) eerste.push(r.naam);
    }
  }));

  const mis = [], wiebel = [];
  let tekst = '';
  for (const naam of eerste.sort()) {
    const r = await draai(wortel, naam);
    log((r.ok ? '✓ ' : '✗ ') + naam.padEnd(12) + String(r.s).padStart(4) + ' s  '
      + (r.ok ? 'pas bij de tweede keer -- ' + slotregel(r.tekst) : slotregel(r.tekst)));
    if (r.ok) wiebel.push(naam);
    else { mis.push(naam); tekst += naam + ':\n' + r.tekst.split('\n').slice(-25).join('\n') + '\n\n'; }
  }
  return { ok: !mis.length, mis, wiebel, tekst: tekst.trim() };
}

module.exports = { KEURING, suites, allesDraaien };
