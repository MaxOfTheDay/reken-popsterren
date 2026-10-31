/*
 * Waar hoort een afbeelding, en welke opmaak hoort erbij?
 *
 * Eén plek voor beide vragen, want test/try.js en test/preview.js stellen ze
 * allebei. Toen de prompts nog op twee plekken stonden liepen ze uit elkaar
 * zonder dat iemand het merkte; met de opmaak zou dat net zo gaan.
 *
 * De naam van het bestand bepaalt de plek. Dat is met opzet: zo hoef je bij het
 * uitproberen niets in te stellen en niets te onthouden -- je sleept het
 * bestand in incoming/ en het staat op de goede plek. Houd je je niet aan de
 * namen, dan zegt het gereedschap welke namen het wél kent.
 *
 * Dit bestand gebruikt met opzet geen enkele Node-module: de opmaak wordt zowel
 * in Node gebruikt (npm run try, npm run preview) als letterlijk in de pagina
 * gespoten. Twee kopieën lopen uiteen; deze ene niet.
 */
function basename(f) { return String(f).split(/[\\/]/).pop(); }
function extname(f) { const m = /\.[^.]+$/.exec(basename(f)); return m ? m[0].toLowerCase() : ''; }

/* sleutel -> hoe herken je 'm, op welk scherm hoort hij, en hoe heet dat in het
   debug-schakelaartje (?screen=) waarmee de schermafdrukken erheen springen.

   `budget` is de aanbevolen bestandsmaat in kB. Geen grens en geen fout -- een
   tekening van 374 kB werkt prima, hij kost alleen de telefoondata van een gezin.
   De studio zegt het daarom als waarschuwing en niet als storing. Hij staat hier
   omdat de maat bij het beeld hoort en niet bij één van de twee panelen die hem
   tonen. */
const SLOTS = {
  world:   { match: /[-_]map\.[a-z0-9]+$|^(world|wereld)[-_]/i,      screen: 'map',
             label: 'Wereldkaart', waar: 'de kaart, van rand tot rand',
             lever: [1215, 2160], anker: 'midden', canoniek: 'ijs-map.webp', budget: 125,
             pad: 'assets/world/{wereld}-map.webp', perWereld: true,
             hint: '<wereld>-map.webp, bv. muziek-map.webp of snoep-map.webp' },
  /* Het startscherm is staand 9:16, precies de maat van de tekening die er ligt:
     de MAX-ster (MAXSTER in src/35-schermen.js) rekent in delen van 941x1672. Een
     nieuwe tekening wordt dus op die maat gesneden -- en de ster op de plaquette
     moet daarna opnieuw opgemeten worden, anders tikt een kind ernaast. */
  landing: { match: /^landing|^start|^titel|^home/i,                 screen: 'profile',
             label: 'Startscherm', waar: 'wie speelt er vandaag',
             lever: [941, 1672], anker: 'midden', canoniek: 'landing.webp', budget: 125,
             pad: 'assets/bg/landing.webp',
             hint: 'landing.webp' },
  /* De kleedkamer en de trofeeenkast. Ze lenen vandaag de gedeelde schil; het pad
     hieronder wordt pas gelezen als SCHERMKUNST in index.html hem noemt (zie
     zetSchermkunst daar). Staand 2:3, met dezelfde ::before, sluier en masker als
     het startscherm (één regel in css() hieronder, net als in 20-schil.css).

     Let op waar je ze op beoordeelt. De winkeltegels en de trofeekaartjes zijn
     licht-op-donker en doorschijnend -- een drukke of lichte tekening maakt de
     namen erop onleesbaar. Dat is niet iets wat je aan de tekening ziet maar aan
     het scherm eromheen, en daarom heeft de studio er een voorbeeld-in-het-echte-
     scherm voor. */
  dress:   { match: /^kleedkamer|^kleerkast|^dress(room)?[-_]?bg|^dressing/i, screen: 'dress',
             label: 'Kleedkamer', waar: 'achter de kleedkamer',
             lever: [1024, 1536], anker: 'midden', canoniek: 'kleedkamer.webp', budget: 125,
             pad: 'assets/bg/kleedkamer.webp', schermkunst: 'dress',
             hint: 'kleedkamer.webp' },
  tro:     { match: /^trofee|^trophies|^kast[-_]?bg/i,               screen: 'tro',
             label: 'Trofeeënkast', waar: 'achter de trofeeën',
             lever: [1024, 1536], anker: 'midden', canoniek: 'trofeeen.webp', budget: 125,
             pad: 'assets/bg/trofeeen.webp', schermkunst: 'tro',
             hint: 'trofeeen.webp' },
};

const SCHERMEN = [
  { id: 'profile', label: 'Wie speelt er' },
  { id: 'map',     label: 'Kaart' },
  { id: 'game',    label: 'Show' },
  { id: 'end',     label: 'Einde' },
  { id: 'dress',   label: 'Kleedkamer' },
  { id: 'tro',     label: 'Trofeeënkast' },
];

const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
               '.jpeg': 'image/jpeg', '.avif': 'image/avif', '.gif': 'image/gif' };

function isImage(file) { return Object.prototype.hasOwnProperty.call(MIME, extname(file)); }
function mimeFor(file) { return MIME[extname(file)] || 'application/octet-stream'; }

// Welke plek hoort bij deze bestandsnaam? null = onbekende naam.
function classify(file) {
  const base = basename(file);
  for (const key of Object.keys(SLOTS)) if (SLOTS[key].match.test(base)) return key;
  return null;
}

function namesHint() {
  return Object.keys(SLOTS).map(k => '  ' + k.padEnd(8) + ' -> ' + SLOTS[k].hint).join('\n');
}

/* De kaart krijgt een ándere waas dan de somschermen. Daar moet het mídden
   donker zijn zodat de som leesbaar blijft; hier staat in het midden juist de
   route, en donker maken is precies wat je niet wilt. Wat de kaart wél nodig
   heeft is leesbare tekst bovenaan (de kop) en onderaan (de navigatie) -- dus
   een band boven en onder, en het midden open. */
const MAP_SCRIM = 'linear-gradient(180deg, rgba(20,4,40,.58) 0, rgba(20,4,40,0) 17%, '
  + 'rgba(20,4,40,0) 83%, rgba(20,4,40,.48) 100%)';

/*
 * Opmaak voor een set afbeeldingen.
 *   urls   { world, landing, dress, tro } -- elke waarde een URL of data-URI
 *   scrim  de sluier eroverheen, zoals in het spel (standaard aan)
 *
 * Er wordt niets aan index.html gewijzigd: dit wordt bij het laden ingespoten.
 * Een afgekeurde generatie laat dus geen spoor na in de app.
 */
function css(urls, opts) {
  const scrim = !opts || opts.scrim !== false;
  const out = [];

  if (urls.world) {
    /* De wereldkaart vult .world-frame van rand tot rand. De klasse no-art staat
       erop zolang de wereld in WORLDS geen eigen `art` heeft -- wat bij een
       kandidaat uit incoming/ altijd zo is -- dus die moet hier ook overschreven
       worden. De gedeelde wolkjes en het voetlicht gaan uit: een wereldtekening
       brengt zijn eigen lucht en grond mee. */
    const veilMap = scrim ? MAP_SCRIM + ',' : '';
    out.push(`.world-frame,.world-frame.no-art{
  background-image:${veilMap}url("${urls.world}")!important;
  background-size:${scrim ? '100% 100%,' : ''}cover!important;
  background-position:${scrim ? '50% 50%,' : ''}50% 50%!important}
#screen-map .map-sky,#screen-map .map-ground{display:none!important}`);
  }

  /* Het startscherm, de kleedkamer en de kast. Letterlijk dezelfde opmaak als de
     productieregels in src/css/20-schil.css (#screen-profile.app-sfeer::before en
     #screen-dress.kunst.app-sfeer::before): dezelfde --kunst-sluier, dezelfde
     uitsnede, hetzelfde masker. Dat is het hele punt van een kandidaat: wat je
     hier beoordeelt is wat je straks krijgt. Het verschil is alleen wáár het beeld
     vandaan komt.

     De klasse .kunst hoeft hier niet gezet te zijn: een kandidaat is er juist
     vóórdat er een tekening in het spel staat. Vandaar dat deze regel op het
     scherm zelf mikt en niet op .kunst. */
  const sluier = scrim ? 'var(--kunst-sluier),' : '';
  [['landing', '#screen-profile'], ['dress', '#screen-dress'], ['tro', '#screen-trophies']].forEach(([sleutel, sel]) => {
    if (!urls[sleutel]) return;
    out.push(`${sel}{position:relative;isolation:isolate}
${sel}.app-sfeer::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;
  background-image:${sluier}url("${urls[sleutel]}");
  background-size:${scrim ? 'cover,' : ''}cover;
  background-position:${scrim ? '50% 50%,' : ''}50% 50%;
  -webkit-mask-image:linear-gradient(to bottom,#000 16%,rgba(0,0,0,.42) 32%,rgba(0,0,0,.42) 72%,#000 88%);
  mask-image:linear-gradient(to bottom,#000 16%,rgba(0,0,0,.42) 32%,rgba(0,0,0,.42) 72%,#000 88%)}`);
  });

  return out.join('\n');
}

/* css() als tekst, zodat een pagina hem letterlijk kan meenemen. De Dev Studio moet een
   kandidaat kunnen tónen op het echte scherm, en dat moet met precies dezelfde
   opmaak gebeuren als de productieregel -- anders beoordeel je iets anders dan je
   krijgt. Een tweede kopie in de studiopagina zou precies daar op een dag
   vanaf gaan wijken. */
function cssJs() {
  return 'const MAP_SCRIM=' + JSON.stringify(MAP_SCRIM) + ';\n' + css.toString();
}

/* Node krijgt zijn exports; in de browser bestaat 'module' niet en wordt dit
   overgeslagen -- dan staan de functies gewoon in de omringende scope. */
if (typeof module !== 'undefined') module.exports = { SLOTS, SCHERMEN, classify, css, cssJs, isImage, mimeFor, namesHint };
