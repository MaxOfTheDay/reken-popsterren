/*
 * De bouw: src/*.js wordt het scriptblok van index.html.
 *
 * WAAROM DIT BESTAAT, EN WAT ER NIET MEE VERANDERT
 *
 * index.html blijft precies wat het was: één bestand, met de opmaak en de code
 * erin, dat je opent en dat het dan doet. Geen bibliotheek, geen modules, geen
 * bouwstap om het te dráaien -- een kind of een ouder merkt hier niets van, en
 * `open index.html` werkt nog steeds, ook vanaf file://.
 *
 * Wat er wél verandert is waar je het schrijft. Het scriptblok was bijna
 * dertienduizend regels in een bestand van eenentwintigduizend, en dat is de
 * grens waarop niemand -- mens of hulpje -- nog een stuk kan openslaan zonder de
 * rest mee te dragen. Dus staat de code voortaan in src/, in stukken, en zet dit
 * bestand ze weer aan elkaar.
 *
 * DE REGEL: src/ is de bron, het scriptblok in index.html is het resultaat.
 *
 * Bewerk je index.html tussen <"+"script> en zijn afsluiting met de hand, dan
 * schrijft de eerstvolgende bouw eroverheen. Dat kán niet stilletjes gebeuren:
 * `npm run check` vergelijkt de twee (zie zaak H in inhoud.test.js) en zegt het
 * meteen. De opmaak en de markup daarboven zijn gewoon van jou -- die staan niet
 * in src/ en worden hier nooit aangeraakt.
 *
 * HOE HET AAN ELKAAR KOMT
 *
 * Op bestandsnaam, oplopend, en verder niets. Vandaar de cijfers ervoor: de
 * volgorde ís de leesvolgorde, en die doet ertoe -- dit is gewoon JavaScript in
 * één bereik, geen modules. Wat bovenaan moet staan (het --vh-lock-scriptje)
 * staat in het bestand dat als eerste komt.
 *
 * Er wordt niets tussengezet: geen scheidingsregel, geen commentaar, geen
 * puntkomma. De stukken worden letterlijk achter elkaar geplakt. Daarom moet elk
 * bronbestand op een regeleinde eindigen, en daarom kijkt dit bestand dat na --
 * anders plakt de laatste regel van het ene aan de eerste van het volgende vast,
 * en dat is precies het soort fout dat je pas drie schermen verderop ziet.
 *
 * Dat "letterlijk" is ook de hele controle op deze stap: een bestand in tweeën
 * knippen op een regelgrens hoort byte voor byte hetzelfde resultaat te geven.
 * Doet het dat niet, dan zit er iets tussen dat er niet hoort.
 *
 * Draaien:
 *   npm run bouw                 index.html bijwerken uit src/
 *   node test/bouw.js --controleer   alleen kijken; afwijking = exitcode 1
 */
const fs = require('fs');
const path = require('path');

const WORTEL = path.resolve(__dirname, '..');
const SRC = path.join(WORTEL, 'src');
const INDEX = path.join(WORTEL, 'index.html');
const OPEN = '<script>';
const DICHT = '</' + 'script>';

/* De bronbestanden, in de volgorde waarin ze aan elkaar komen. Oplopend op naam,
   dus 00- komt voor 10- komt voor 20-. Alleen .js, en niets uit onderliggende
   mappen: één laag houdt de volgorde leesbaar in een gewone directorylijst.

   ELK BESTAND MOET MET TWEE CIJFERS EN EEN STREEPJE BEGINNEN, en dat wordt hier
   afgedwongen in plaats van afgesproken. Reden: een naam zónder cijfers sorteert
   ná élke naam mét cijfers ('a' komt na '1'), dus één bestand dat 'app.js' heet
   zakt vanzelf naar het eind zodra er een '10-' bijkomt. Dat is precies de
   verkeerde kant op -- het eerste stuk draagt het --vh-lock-scriptje, en dat
   hóórt de eerste uitvoerende regel van de pagina te zijn.

   Zoiets valt niet op bij het lezen en niet bij het bouwen: je krijgt gewoon een
   spel waarin een hoogte een fractie te laat vastligt. Dus liever hier een
   melding dan daar een raadsel. */
const NAAMVORM = /^\d\d-[a-z0-9-]+\.js$/;
function bronnen() {
  if (!fs.existsSync(SRC)) throw new Error('de map src/ bestaat niet');
  const lijst = fs.readdirSync(SRC).filter(n => n.endsWith('.js')).sort();
  if (!lijst.length) throw new Error('geen enkel .js-bestand in src/');
  const scheef = lijst.filter(n => !NAAMVORM.test(n));
  if (scheef.length) {
    throw new Error(`deze bronbestanden hebben geen volgnummer: ${scheef.join(', ')}. `
      + 'Een naam zonder cijfers sorteert ná alle namen mét cijfers en zakt dus '
      + 'stilletjes naar het eind. Noem ze bijvoorbeeld 00-app.js.');
  }
  return lijst;
}

/* Alles achter elkaar. Elk stuk moet op een regeleinde eindigen -- zie de kop.
   Een leeg bestand mag: dat is een stuk dat nog niets bevat, en nul regels
   plakken niets aan elkaar vast. */
function scriptUitBronnen() {
  return bronnen().map(naam => {
    const tekst = fs.readFileSync(path.join(SRC, naam), 'utf8');
    if (tekst.length && !tekst.endsWith('\n')) {
      throw new Error(`src/${naam} eindigt niet op een regeleinde; `
        + 'dan plakt zijn laatste regel vast aan het volgende bestand');
    }
    return tekst;
  }).join('');
}

/* Waar het scriptblok in index.html begint en eindigt. Er hóórt er precies één
   te zijn -- daar hangt test/app.js ook aan, en zaak H bewaakt het. Staat het
   woord er vaker, dan knipt dit op de verkeerde plek en schrijft het de halve
   pagina weg; dus liever hier stoppen met een melding die de oorzaak noemt. */
function grenzen(html) {
  const open = html.split(OPEN).length - 1;
  const dicht = html.split(DICHT).length - 1;
  if (open !== 1 || dicht !== 1) {
    throw new Error(`index.html hoort precies één scriptblok te hebben, maar het woord staat er `
      + `${open}x als opening en ${dicht}x als afsluiting in -- ook in commentaar telt het mee. `
      + 'Zoek de tweede en schrijf hem anders (bijvoorbeeld "scriptblok").');
  }
  return { van: html.indexOf(OPEN) + OPEN.length, tot: html.lastIndexOf(DICHT) };
}

// Hoe index.html eruit hoort te zien met de huidige src/ erin.
function verwacht(html) {
  const g = grenzen(html);
  return html.slice(0, g.van) + '\n' + scriptUitBronnen() + html.slice(g.tot);
}

/* Loopt index.html achter op src/? Geeft null als alles klopt, en anders een
   regel die zegt wat er aan de hand is. Hier gebruikt inhoud.test.js hem ook
   voor -- zodat een handmatige bewerking van het scriptblok opvalt bij de
   eerstvolgende keuring en niet pas bij de eerstvolgende bouw. */
function achterstand() {
  const html = fs.readFileSync(INDEX, 'utf8');
  const wil = verwacht(html);
  if (wil === html) return null;
  const nu = html.slice(grenzen(html).van);
  const dan = wil.slice(grenzen(wil).van);
  let i = 0;
  while (i < nu.length && i < dan.length && nu[i] === dan[i]) i++;
  const regel = nu.slice(0, i).split('\n').length;
  return `het scriptblok in index.html loopt niet gelijk met src/ (eerste verschil op regel `
    + `${regel} van het blok). Staat je wijziging in index.html zelf? Zet hem in src/ `
    + 'en draai `npm run bouw`.';
}

// Bijwerken. Schrijft alleen als er werkelijk iets verandert, zodat een bouw
// zonder wijziging de tijdstempel van het bestand niet aanraakt.
function bouw() {
  const html = fs.readFileSync(INDEX, 'utf8');
  const wil = verwacht(html);
  if (wil === html) return { gewijzigd: false, bronnen: bronnen() };
  fs.writeFileSync(INDEX, wil);
  return { gewijzigd: true, bronnen: bronnen() };
}

/* In wélk bronbestand staat een machinaal geschreven blok?

   De wereldstudio schrijft twee blokken terug (WERELDEN-BEGIN en
   SCHERMKUNST-BEGIN, zie test/preview.js). Die stonden in index.html en staan nu
   in src/ -- maar in wélk stuk hangt ervan af hoe src/ is opgedeeld, en dat
   verandert nog. Dus wordt er niet naar een vaste bestandsnaam geschreven maar
   gezocht naar de markering zelf: waar hij staat, daar hoort de nieuwe inhoud.

   Precies één treffer, anders niet schrijven. Twee bestanden met dezelfde
   markering is geen keuze die de studio mag maken. */
function bronMetMarkering(mark) {
  const raak = bronnen().filter(n => fs.readFileSync(path.join(SRC, n), 'utf8').includes(mark));
  if (raak.length !== 1) {
    throw new Error(`de markering ${mark} staat in ${raak.length} bronbestanden `
      + `(${raak.join(', ') || 'geen'}); er hoort er precies één te zijn`);
  }
  return path.join(SRC, raak[0]);
}

module.exports = { bouw, achterstand, bronnen, scriptUitBronnen, bronMetMarkering, SRC, INDEX };

if (require.main === module) {
  const alleenKijken = process.argv.includes('--controleer');
  try {
    if (alleenKijken) {
      const mis = achterstand();
      if (mis) { console.error('bouw: ' + mis); process.exit(1); }
      console.log('bouw: index.html loopt gelijk met src/ (' + bronnen().length + ' stuk(ken)).');
    } else {
      const uit = bouw();
      console.log('bouw: ' + uit.bronnen.join(' + ') + ' -> index.html'
        + (uit.gewijzigd ? '' : ' (stond al goed)'));
    }
  } catch (e) {
    console.error('bouw: ' + e.message);
    process.exit(1);
  }
}
