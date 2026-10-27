/*
 * De samenvoegregel voor versie.txt (zie .gitattributes) in deze kloon zetten.
 *
 * .gitattributes zegt wélke regel er geldt, maar wat "versie" doet moet in de
 * instellingen van de kloon zelf staan -- git leest dat nooit uit de repo, en
 * dat is met opzet: een repo mag geen commando's op jouw machine laten draaien.
 * Daarom zet dit hem. Het gebeurt vanzelf bij `npm run bouw` (test/bouw.js) en
 * bij het starten van de studio (test/preview.js); in een verse kloon die nog
 * nooit gebouwd heeft kan het ook los:
 *
 *   node test/samenvoegen.js
 *
 * De regel is `true`: het programma dat niets doet en "gelukt" zegt. Git houdt
 * dan de eigen kant van versie.txt, en de bouw na de merge schrijft het goede
 * getal. Zonder deze instelling valt git terug op gewoon samenvoegen en is er
 * een botsing, zoals vroeger -- ontbreken is dus nooit erger dan wat er was.
 */
const { execFileSync } = require('child_process');
const path = require('path');

function zetRegel(wortel) {
  try {
    const git = args => execFileSync('git', args, { cwd: wortel, stdio: 'ignore' });
    git(['config', 'merge.versie.name', 'versie.txt: eigen kant, de bouw zet hem goed']);
    git(['config', 'merge.versie.driver', 'true']);
    return true;
  } catch (e) { return false; }   // geen git of geen kloon: dan valt er ook niets samen te voegen
}

if (require.main === module) zetRegel(path.resolve(__dirname, '..'));
module.exports = { zetRegel };
