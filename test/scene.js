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
 * Dit bestand gebruikt met opzet geen enkele Node-module: proefstudio.html
 * spuit het letterlijk in de pagina in, zodat de opmaak daar niet apart
 * nagebouwd hoeft te worden. Twee kopieën lopen uiteen; deze ene niet.
 */
function basename(f) { return String(f).split(/[\\/]/).pop(); }
function extname(f) { const m = /\.[^.]+$/.exec(basename(f)); return m ? m[0].toLowerCase() : ''; }

// sleutel -> hoe herken je 'm, op welk scherm hoort hij, en hoe heet dat in het
// debug-schakelaartje (?screen=) waarmee de schermafdrukken erheen springen.
const SLOTS = {
  venue:   { match: /(^venue[-_]|theat|club|stadion|stadium|zaal)/i, screen: 'game',
             hint: 'venue-theater.webp, venue-club.webp, venue-stadium.webp' },
  horizon: { match: /^map[-_]?horizon|^kaart[-_]?horizon/i,          screen: 'map',
             hint: 'map-horizon.webp' },
  sky:     { match: /^map[-_]?sky|^kaart[-_]?lucht/i,                screen: 'map',
             hint: 'map-sky.webp' },
  finale:  { match: /^finale|^einde|^end[-_]/i,                      screen: 'end',
             hint: 'finale.webp' },
};

// De vier schermen die samen "de wereld" zijn (plan, stap 2).
const HUBS = ['#screen-map', '#screen-profile', '#screen-dress', '#screen-trophies'];

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

/* De sluier uit het stijldocument (§4.3). Wat de tekening ook doet, in de app
   ligt hier een donkere waas overheen zodat de som leesbaar blijft. Een
   achtergrond beoordelen zónder die waas is de tekening beoordelen in een
   situatie die nooit voorkomt -- daarom staat hij standaard aan, met een
   schakelaartje om te zien wát hij doet. */
const SCRIM = 'radial-gradient(120% 70% at 50% 66%, rgba(20,4,40,.74), rgba(20,4,40,.30) 58%, transparent 82%)';

/*
 * Opmaak voor een set afbeeldingen.
 *   urls   { venue, horizon, sky, finale } -- elke waarde een URL of data-URI
 *   scrim  donkere waas eroverheen (standaard aan)
 *
 * Er wordt niets aan index.html gewijzigd: dit wordt bij het laden ingespoten.
 * Een afgekeurde generatie laat dus geen spoor na in de app.
 */
function css(urls, opts) {
  const scrim = !opts || opts.scrim !== false;
  const veil = scrim ? SCRIM + ',' : '';
  const out = [];

  if (urls.venue) {
    /* Op #screen-game en niet op .game-arena: die heeft max-width:860px, dus op
       een tablet bleef er links en rechts een strook gewone verloopachtergrond
       staan. Dan beoordeel je de tekening door een verkeerd raam. */
    out.push(`#screen-game{position:relative}
#screen-game::before{content:'';position:absolute;inset:0;z-index:-1;
  background-image:${veil}url("${urls.venue}");background-size:cover,cover;background-position:50% 30%,50% 30%}
/* §9.1: op het spelscherm lost het kader op -- anders beoordeel je een
   geschilderde zaal met een fotolijstje in het midden. */
#show-stage{border:none!important;box-shadow:none!important;background:transparent!important;overflow:visible!important}
#show-stage::after{display:none!important}
#show-stage .deco{display:none!important}
#game-avatar-inner{filter:drop-shadow(0 0 7px rgba(255,180,61,.32))}`);
  }

  if (urls.horizon) {
    /* Alle vier de hubschermen, niet alleen de kaart: stap 2 van het plan zet
       de wereld onder de kaart, de sterkeuze, de kleedkamer én de trofeeën.
       Alleen de kaart doen laat je een halve conversie beoordelen -- precies
       het "sommige schermen wel, sommige niet" waar het plan voor waarschuwt. */
    out.push(`${HUBS.join(',')}{position:relative}
${HUBS.map(h => h + '::before').join(',')}{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;
  background-image:${veil}url("${urls.horizon}");background-size:cover,cover;background-position:50% 100%,50% 100%}
#screen-map .map-ground{display:none!important}`);
  }

  if (urls.sky) {
    /* Zwarte achtergrond + screen: zwart verdwijnt, dus de wolken hoeven niet
       uitgeknipt te worden. De emoji-wolken eronder gaan uit, anders drijven er
       twee luchten door elkaar.
       Alleen op de schermen die al een .map-sky-inner hébben (kaart en
       sterkeuze). De kleedkamer en de trofeeën hebben die laag niet; die
       erbij maken is werk in index.html, geen werk van de proefopstelling. */
    /* right:-16% geeft de parallax speling. updateParallax schuift deze laag
       -scrollLeft * 0.06 naar links; op een telefoon van 390 is de kaart 822
       breed te scrollen, dus 49px. Zonder speling loopt de rechterrand van de
       wolkenplaat 49px (13% van het scherm) naar binnen en is daar geen lucht
       meer. .map-sky eromheen heeft overflow:hidden, dus het overschot wordt
       netjes afgesneden. */
    out.push(`#screen-map .map-sky-inner,#screen-profile .map-sky-inner{
  right:-16%;
  background-image:url("${urls.sky}");background-size:cover;background-position:50% 0;
  mix-blend-mode:screen}
#screen-map .map-sky-inner > span,#screen-profile .map-sky-inner > span{display:none!important}`);
  }

  if (urls.finale) {
    out.push(`#screen-end{position:relative}
#screen-end::before{content:'';position:absolute;inset:0;z-index:-1;
  background-image:${veil}url("${urls.finale}");background-size:cover,cover;background-position:50% 40%,50% 40%}`);
  }

  return out.join('\n');
}

/* Node krijgt zijn exports; in de browser bestaat 'module' niet en wordt dit
   overgeslagen -- dan staan de functies gewoon in de omringende scope. */
if (typeof module !== 'undefined') module.exports = { SLOTS, SCRIM, classify, css, isImage, mimeFor, namesHint };
