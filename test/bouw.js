/*
 * De bouw: src/*.js wordt het scriptblok van index.html, src/css/*.css het
 * stijlblad.
 *
 * WAAROM DIT BESTAAT, EN WAT ER NIET MEE VERANDERT
 *
 * index.html blijft precies wat het was: één bestand, met de opmaak en de code
 * erin, dat je opent en dat het dan doet. Geen bibliotheek, geen modules, geen
 * bouwstap om het te dráaien -- een kind of een ouder merkt hier niets van, en
 * `open index.html` werkt nog steeds, ook vanaf file://.
 *
 * Wat er wél verandert is waar je het schrijft. Het scriptblok was bijna
 * dertienduizend regels en het stijlblad ruim zevenduizend, in een bestand van
 * eenentwintigduizend. Dat is de grens waarop niemand -- mens of hulpje -- nog
 * een stuk kan openslaan zonder de rest mee te dragen. Dus staat het voortaan in
 * src/, in stukken, en zet dit bestand ze weer aan elkaar.
 *
 * DE REGEL: src/ is de bron, de twee blokken in index.html zijn het resultaat.
 *
 * Bewerk je ze met de hand, dan schrijft de eerstvolgende bouw eroverheen. Dat
 * kán niet stilletjes gebeuren: `npm run check` vergelijkt de twee (zie zaak H
 * in inhoud.test.js) en zegt het meteen. Alles buiten die twee blokken -- de
 * <head>, de markup van de schermen -- staat niet in src/ en wordt hier nooit
 * aangeraakt.
 *
 * HOE HET AAN ELKAAR KOMT
 *
 * Op bestandsnaam, oplopend, en verder niets. Vandaar de cijfers ervoor: de
 * volgorde ís de leesvolgorde, en die doet ertoe. Bij de JavaScript omdat het
 * één bereik is en een const die te laat verklaard wordt een lege pagina geeft;
 * bij de CSS omdat een blad op volgorde wint -- er staan in het hele stijlblad
 * maar drie !important, dus vrijwel élke voorrang komt uit "wie staat er later".
 * Eén stuk verhangen is daar geen opruiming maar een wijziging.
 *
 * Er wordt niets tussengezet: geen scheidingsregel, geen commentaar, geen
 * puntkomma. De stukken worden letterlijk achter elkaar geplakt. Daarom moet elk
 * bronbestand op een regeleinde eindigen, en daarom kijkt dit bestand dat na --
 * anders plakt de laatste regel van het ene aan de eerste van het volgende vast.
 *
 * Voor CSS staat er één controle bij die de JavaScript niet nodig heeft: elk
 * stuk moet op zichzelf kloppen -- accolades in evenwicht, commentaar dat
 * dichtgaat. Knip je midden in een regel of midden in een uitleg, dan is het
 * sámengevoegde blad nog steeds in orde en merkt zaak H er niets van, maar staat
 * er in src/ een bestand dat niemand meer los kan lezen. Dat is precies wat deze
 * opdeling moest oplossen, dus wordt het hier tegengehouden.
 *
 * Draaien:
 *   npm run bouw                     index.html bijwerken uit src/
 *   node test/bouw.js --controleer   alleen kijken; afwijking = exitcode 1
 */
const fs = require('fs');
const path = require('path');

const WORTEL = path.resolve(__dirname, '..');
const INDEX = path.join(WORTEL, 'index.html');
const SRC = path.join(WORTEL, 'src');
const SRC_CSS = path.join(SRC, 'css');

/* De twee blokken, elk met zijn eigen bronmap. De volgorde in deze lijst is de
   volgorde waarin ze in index.html staan; verwacht() leunt erop. */
const BLOKKEN = [
  { naam: 'stijlblad',  map: SRC_CSS, ext: '.css', open: '<style>',  dicht: '</style>',        kop: '<style' },
  { naam: 'scriptblok', map: SRC,     ext: '.js',  open: '<script>', dicht: '</' + 'script>', kop: '<script' },
];

/* Elk bestand moet met twee cijfers en een streepje beginnen, en dat wordt hier
   afgedwongen in plaats van afgesproken. Reden: een naam zónder cijfers sorteert
   ná élke naam mét cijfers ('a' komt na '1'), dus één bestand dat 'app.js' heet
   zakt vanzelf naar het eind zodra er een '10-' bijkomt. Dat is precies de
   verkeerde kant op -- het eerste stuk draagt het --vh-lock-scriptje, en dat
   hóórt de eerste uitvoerende regel van de pagina te zijn.

   Zoiets valt niet op bij het lezen en niet bij het bouwen: je krijgt gewoon een
   spel waarin een hoogte een fractie te laat vastligt, of een knop die zijn kleur
   van de verkeerde regel haalt. Dus liever hier een melding dan daar een raadsel. */
const NAAMVORM = /^\d\d-[a-z0-9-]+\.(js|css)$/;

// De bronbestanden van één blok, in de volgorde waarin ze aan elkaar komen.
// Alleen de bovenste laag van de map: dat houdt de volgorde leesbaar in een
// gewone directorylijst. (src/css/ ligt ín src/, en readdir daalt niet af.)
function bronnen(blok) {
  if (!fs.existsSync(blok.map)) throw new Error(`de map ${path.relative(WORTEL, blok.map)} bestaat niet`);
  const lijst = fs.readdirSync(blok.map).filter(n => n.endsWith(blok.ext)).sort();
  if (!lijst.length) throw new Error(`geen enkel ${blok.ext}-bestand in ${path.relative(WORTEL, blok.map)}`);
  const scheef = lijst.filter(n => !NAAMVORM.test(n));
  if (scheef.length) {
    throw new Error(`deze bronbestanden hebben geen volgnummer: ${scheef.join(', ')}. `
      + 'Een naam zonder cijfers sorteert ná alle namen mét cijfers en zakt dus '
      + 'stilletjes naar het eind. Noem ze bijvoorbeeld 00-app.js.');
  }
  return lijst;
}

/* Klopt dit stuk CSS op zichzelf? Accolades in evenwicht en commentaar dat
   dichtgaat -- meer niet; dit is geen ontleder en hoeft het niet te zijn. Het
   vangt de ene fout die er bij het opdelen echt toe doet: een knip midden in een
   regel of midden in een uitleg. */
function keurCss(naam, tekst) {
  let diepte = 0, incom = false, i = 0, regel = 1;
  while (i < tekst.length) {
    if (tekst[i] === '\n') regel++;
    if (incom) {
      if (tekst.startsWith('*/', i)) { incom = false; i += 2; continue; }
      i++; continue;
    }
    if (tekst.startsWith('/*', i)) { incom = true; i += 2; continue; }
    if (tekst[i] === '{') diepte++;
    else if (tekst[i] === '}') {
      diepte--;
      if (diepte < 0) throw new Error(`src/css/${naam}: een } te veel op regel ${regel} `
        + '-- er is waarschijnlijk midden in een regel geknipt');
    }
    i++;
  }
  if (diepte !== 0) throw new Error(`src/css/${naam}: ${diepte} accolade(s) blijven openstaan `
    + '-- er is waarschijnlijk midden in een regel geknipt');
  if (incom) throw new Error(`src/css/${naam}: een /* gaat nooit meer dicht `
    + '-- er is waarschijnlijk midden in een uitleg geknipt');
}

/* Alles achter elkaar. Elk stuk moet op een regeleinde eindigen -- zie de kop.
   Een leeg bestand mag: dat is een stuk dat nog niets bevat, en nul regels
   plakken niets aan elkaar vast. */
function stukkenUit(blok) {
  return bronnen(blok).map(naam => {
    const tekst = fs.readFileSync(path.join(blok.map, naam), 'utf8');
    if (tekst.length && !tekst.endsWith('\n')) {
      throw new Error(`${path.relative(WORTEL, blok.map)}/${naam} eindigt niet op een regeleinde; `
        + 'dan plakt zijn laatste regel vast aan het volgende bestand');
    }
    if (blok.ext === '.css') keurCss(naam, tekst);
    return tekst;
  }).join('');
}

/* Waar een blok in index.html begint en eindigt.

   Het gebouwde blok is de kále vorm -- <style> en <script> zonder één attribuut
   -- en dáárvan hoort er precies één te zijn. Dat is wat dit blok aanwijsbaar
   maakt: staat het woord er vaker, dan knipt dit op de verkeerde plek en
   schrijft het de halve pagina weg, dus liever hier stoppen met een melding die
   het zegt. (test/app.js knipt op dezelfde manier, en zaak H in inhoud.test.js
   bewaakt het.)

   Een tag mét attributen telt níet mee als tweede blok, want die is niet van de
   bouw. Sinds er onderin <body> een meetscriptje staat (Cloudflare Web
   Analytics, een <script type='module' src='...'>) is er meer dan één
   </script> in het bestand, en dan is "de laatste" de verkeerde: het blok
   eindigt bij de éérste afsluiting ná zijn opening.

   Het vangnet dat daarmee zou wegvallen blijft staan in een andere vorm: elke
   afsluiting hoort bij een opening, dus de twee aantallen moeten gelijk zijn.
   Schrijft iemand </script> in een opmerking binnen het blok, dan is er één
   afsluiting te veel en valt het hier alsnog om -- precies de fout waar deze
   controle ooit voor geschreven is. */
function grenzen(html, blok) {
  const open = html.split(blok.open).length - 1;
  const koppen = html.split(blok.kop).length - 1;
  const dicht = html.split(blok.dicht).length - 1;
  if (open !== 1) {
    throw new Error(`index.html hoort precies één ${blok.naam} te hebben, maar ${blok.open} staat er `
      + `${open}x in -- ook in commentaar telt het mee. `
      + 'Zoek de tweede en schrijf hem anders.');
  }
  if (koppen !== dicht) {
    throw new Error(`in index.html staan ${koppen} openingen ${blok.kop}...> tegenover ${dicht}x `
      + `${blok.dicht} -- ook in commentaar telt het mee. Er is er dus één te veel of te weinig; `
      + 'schrijf hem in proza (bijvoorbeeld "scriptblok").');
  }
  const van = html.indexOf(blok.open) + blok.open.length;
  return { van, tot: html.indexOf(blok.dicht, van) };
}

// Hoe index.html eruit hoort te zien met de huidige src/ erin. In één keer
// opgebouwd uit het oorspronkelijke bestand: het eerste blok vervangen zou de
// plaatsen van het tweede verschuiven.
function verwacht(html) {
  const g = BLOKKEN.map(b => grenzen(html, b));
  if (!(g[0].tot < g[1].van)) throw new Error('het stijlblad hoort vóór het scriptblok te staan');
  return html.slice(0, g[0].van) + '\n' + stukkenUit(BLOKKEN[0])
       + html.slice(g[0].tot, g[1].van) + '\n' + stukkenUit(BLOKKEN[1])
       + html.slice(g[1].tot);
}

/* Loopt index.html achter op src/? Geeft null als alles klopt, en anders een
   regel die zegt wat er aan de hand is. Hier gebruikt inhoud.test.js hem ook
   voor -- zodat een handmatige bewerking opvalt bij de eerstvolgende keuring en
   niet pas bij de eerstvolgende bouw. */
function achterstand() {
  const html = fs.readFileSync(INDEX, 'utf8');
  const wil = verwacht(html);
  if (wil === html) return null;
  for (const b of BLOKKEN) {
    const nu = html.slice(grenzen(html, b).van, grenzen(html, b).tot);
    const dan = wil.slice(grenzen(wil, b).van, grenzen(wil, b).tot);
    if (nu === dan) continue;
    let i = 0;
    while (i < nu.length && i < dan.length && nu[i] === dan[i]) i++;
    const regel = nu.slice(0, i).split('\n').length;
    return `het ${b.naam} in index.html loopt niet gelijk met src/ (eerste verschil op regel `
      + `${regel} van het blok). Staat je wijziging in index.html zelf? Zet hem in src/ `
      + 'en draai `npm run bouw`.';
  }
  return 'index.html wijkt af van src/ buiten de twee blokken om';
}

// Bijwerken. Schrijft alleen als er werkelijk iets verandert, zodat een bouw
// zonder wijziging de tijdstempel van het bestand niet aanraakt.
function bouw() {
  const html = fs.readFileSync(INDEX, 'utf8');
  const wil = verwacht(html);
  if (wil !== html) fs.writeFileSync(INDEX, wil);
  return { gewijzigd: wil !== html };
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
  const blok = BLOKKEN.find(b => b.ext === '.js');
  const raak = bronnen(blok).filter(n => fs.readFileSync(path.join(blok.map, n), 'utf8').includes(mark));
  if (raak.length !== 1) {
    throw new Error(`de markering ${mark} staat in ${raak.length} bronbestanden `
      + `(${raak.join(', ') || 'geen'}); er hoort er precies één te zijn`);
  }
  return path.join(blok.map, raak[0]);
}

module.exports = { bouw, achterstand, bronnen, bronMetMarkering, BLOKKEN, SRC, SRC_CSS, INDEX };

if (require.main === module) {
  const alleenKijken = process.argv.includes('--controleer');
  try {
    if (alleenKijken) {
      const mis = achterstand();
      if (mis) { console.error('bouw: ' + mis); process.exit(1); }
      console.log('bouw: index.html loopt gelijk met src/ ('
        + BLOKKEN.map(b => bronnen(b).length + ' ' + b.naam).join(', ') + ').');
    } else {
      const uit = bouw();
      console.log('bouw: ' + BLOKKEN.map(b => bronnen(b).length + ' ' + b.naam).join(' + ')
        + ' -> index.html' + (uit.gewijzigd ? '' : ' (stond al goed)'));
    }
  } catch (e) {
    console.error('bouw: ' + e.message);
    process.exit(1);
  }
}
