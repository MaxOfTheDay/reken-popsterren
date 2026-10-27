/*
 * Een vervangen tekening hoort ART_CACHE omhoog te laten gaan.
 *
 * sw.js geeft alles onder assets/ uit de tekeningenvoorraad, en kijkt daarna
 * nooit meer op het net -- tot ART_CACHE een andere naam krijgt. Dat is met
 * opzet (een tekstwijziging hoort geen twee megabyte tekeningen opnieuw over de
 * telefoondata van een gezin te trekken), maar het heeft één gevolg: wie een
 * bestaand bestand onder assets/ vervangt zonder ART_CACHE op te hogen, ziet zijn
 * nieuwe tekening alleen op toestellen die de oude nog nooit hadden. Op alle
 * andere blijft de oude staan, voor altijd.
 *
 * De studio hoogt hem zelf op (bumpArtCache in test/preview.js). Dit is het
 * vangnet voor alles wat niet via de studio gaat: een logo, een lettertype of
 * een wereldkaart die met de hand in een PR vervangen wordt. Een nieuw bestand op
 * een nieuw pad of een verwijderd bestand telt niet -- dat staat nog in geen
 * enkele voorraad, of wordt nooit meer opgevraagd.
 *
 * Gebruik:
 *   node test/tekeningen.js [basis]    standaard origin/main
 * In .github/workflows/keuring.yml draait hij bij elke PR tegen de basistak.
 */
const { execFileSync } = require('child_process');
const path = require('path');

const WORTEL = path.resolve(__dirname, '..');
const basis = process.argv[2] || 'origin/main';
const git = (...a) => execFileSync('git', a, { cwd: WORTEL, encoding: 'utf8' }).trim();
const naam = tekst => (/const ART_CACHE = '([^']+)';/.exec(tekst) || [])[1] || null;

let vervangen, toen;
try {
  const splits = git('merge-base', basis, 'HEAD');
  vervangen = git('diff', '--diff-filter=M', '--name-only', splits, 'HEAD', '--', 'assets/')
    .split('\n').filter(Boolean);
  toen = naam(git('show', splits + ':sw.js'));
} catch (e) {
  console.error(`tekeningen: kan ${basis} niet vergelijken (${e.message.split('\n')[0]}).`);
  process.exit(1);
}
const nu = naam(require('fs').readFileSync(path.join(WORTEL, 'sw.js'), 'utf8'));

if (!vervangen.length) {
  console.log('tekeningen: geen bestaande tekening vervangen -- ART_CACHE hoeft niet omhoog.');
} else if (toen && nu && toen !== nu) {
  console.log(`tekeningen: ${vervangen.length} vervangen, en ART_CACHE ging van ${toen} naar ${nu}.`);
} else {
  console.error(`tekeningen: deze bestanden zijn vervangen, maar ART_CACHE in sw.js staat nog op ${nu}:\n`
    + vervangen.map(f => '  - ' + f).join('\n')
    + '\nToestellen die de oude al hebben, houden die dan voorgoed. Hoog ART_CACHE één keer op '
    + `(bijvoorbeeld ${String(nu).replace(/(\d+)$/, d => Number(d) + 1)}).`);
  process.exit(1);
}
