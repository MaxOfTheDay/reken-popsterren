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

// De regels onder "Eerste fouten:" -- wélke controle het was.
function eersteFouten(tekst) {
  const regels = tekst.split('\n');
  const i = regels.findIndex(r => /Eerste fouten/.test(r));
  if (i < 0) return regels.slice(-5).map(r => r.trim()).filter(Boolean);
  return regels.slice(i + 1).filter(r => /^\s*-/.test(r)).map(r => r.trim().slice(0, 300)).slice(0, 5);
}

/*
 * opties: { wortel, tegelijk, alleenKeuring, alleen: [namen], log(regel) }
 * Met `alleen` draaien enkel die suites, zonder de keuring ervoor, maar wel met
 * dezelfde tweede kans: zo draait de CI elke browsersuite in een eigen job
 * (keuring.yml) en keurt hij toch precies zoals npm test en Publiceren.
 * Geeft { ok, mis: [namen], wiebel: [{ naam, fouten }], tekst } -- tekst is de
 * uitvoer van wat er misging (of leeg); `fouten` zijn de "Eerste fouten" van
 * de keer dat hij omviel, zodat je ziet wélke controle wiebelde.
 */
async function allesDraaien(opties) {
  const wortel = opties.wortel;
  const log = opties.log || (() => {});
  const tegelijk = Math.max(1, Number(opties.tegelijk) || Math.min(3, os.cpus().length));
  const alle = suites(wortel);
  const alleen = opties.alleen && opties.alleen.length ? opties.alleen : null;
  if (alleen) {
    const onbekend = alleen.filter(n => !alle.includes(n));
    if (onbekend.length) return { ok: false, mis: onbekend, wiebel: [], tekst: 'Geen suite: ' + onbekend.join(', ') };
  }
  const keuring = alleen ? [] : KEURING.filter(n => alle.includes(n));
  const rest = alleen ? alleen.slice() : alle.filter(n => !KEURING.includes(n));

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
      if (!r.ok) eerste.push(r);
    }
  }));

  const mis = [], wiebel = [];
  let tekst = '';
  for (const vorige of eerste.sort((a, b) => a.naam < b.naam ? -1 : 1)) {
    const naam = vorige.naam;
    const r = await draai(wortel, naam);
    log((r.ok ? '✓ ' : '✗ ') + naam.padEnd(12) + String(r.s).padStart(4) + ' s  '
      + (r.ok ? 'pas bij de tweede keer -- ' + slotregel(r.tekst) : slotregel(r.tekst)));
    if (r.ok) wiebel.push({ naam, fouten: eersteFouten(vorige.tekst) });
    else { mis.push(naam); tekst += naam + ':\n' + r.tekst.split('\n').slice(-25).join('\n') + '\n\n'; }
  }
  return { ok: !mis.length, mis, wiebel, tekst: tekst.trim() };
}

module.exports = { KEURING, suites, allesDraaien };
