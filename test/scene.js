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

// sleutel -> hoe herken je 'm, op welk scherm hoort hij, en hoe heet dat in het
// debug-schakelaartje (?screen=) waarmee de schermafdrukken erheen springen.
const SLOTS = {
  venue:   { match: /(^venue[-_]|theat|club|stadion|stadium|zaal)/i, screen: 'game',
             label: 'Zaal',       waar: 'achter de show',
             lever: [1200, 700], anker: 'midden', canoniek: 'venue-theater.webp',
             hint: 'venue-theater.webp, venue-club.webp, venue-stadium.webp' },
  horizon: { match: /^map[-_]?horizon|^kaart[-_]?horizon/i,          screen: 'map',
             label: 'Landschap',  waar: 'de kaart',
             lever: [1536, 576], anker: 'onder', canoniek: 'map-horizon.webp',
             hint: 'map-horizon.webp' },
  sky:     { match: /^map[-_]?sky|^kaart[-_]?lucht/i,                screen: 'map',
             label: 'Wolken',     waar: 'de kaart',
             lever: [1536, 864], anker: 'midden', canoniek: 'map-sky.webp',
             hint: 'map-sky.webp' },
  world:   { match: /[-_]map\.[a-z0-9]+$|^(world|wereld)[-_]/i,      screen: 'map',
             label: 'Wereldkaart', waar: 'de kaart, van rand tot rand',
             lever: [1080, 2160], anker: 'midden', canoniek: 'ijs-map.webp',
             hint: '<wereld>-map.webp, bv. ijs-map.webp of vuur-map.webp' },
  landing: { match: /^landing|^start|^titel|^home/i,                 screen: 'profile',
             label: 'Startscherm', waar: 'wie speelt er vandaag',
             lever: [1024, 1536], anker: 'midden', canoniek: 'landing.webp',
             hint: 'landing.webp' },
  finale:  { match: /^finale|^einde|^end[-_]/i,                      screen: 'end',
             label: 'Slotscherm', waar: 'na de show',
             lever: [1024, 1536], anker: 'midden', canoniek: 'finale.webp',
             hint: 'finale.webp' },
};

/* Waar de wereld achter staat: de kaart en de sterkeuze.
   Eerder stonden de kleedkamer en de trofeeenkast hier ook bij, omdat het plan
   "de vier hubschermen" zei. Dat was mijn eigen formulering, niet iets wat ooit
   bekeken was, en het pakt slecht uit:
   - De kaart en de sterkeuze gaan over reizen en kiezen; een landschap hoort
     daar. De kleedkamer en de trofeeenkast zijn kámers -- een kast en een
     garderobe -- en daar een horizon achter zetten klopt niet.
   - Belangrijker: de winkeltegels en de trofeekaarten zijn doorschijnend. Ze
     zijn ontworpen tegen een egale verloopachtergrond, dus met een tekening
     erachter zie je het publiek en de coulissen dwars dóór de kaartjes heen.
   Wie daar ooit iets achter wil zetten, moet eerst die vlakken dekkend maken
   (zie ART-DIRECTION §9.4) en dan een eigen achtergrond maken: een kleedkamer
   is een kleedkamer, geen uitzicht. */
const HUBS = ['#screen-map'];

/* Parallax: hoe hard elke laag meeschuift met de kaart.
   De weg met de stadspenningen schuift 100% mee. Wat verder weg ligt hoort
   lángzamer te gaan, niet sneller -- vandaar grond boven lucht. In de app doet
   updateParallax op dit moment alleen de lucht (0.06) en staat de grond stil,
   dus de verste laag beweegt het meest. Dat trekken we hier recht.
   Beide lagen herhalen horizontaal, dus hoe ver je ook schuift: nooit een rand. */
const PARALLAX = { horizon: 0.18, sky: 0.06 };

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

/* De kaart krijgt een ándere waas dan de somschermen. Daar moet het mídden
   donker zijn zodat de som leesbaar blijft; hier staat in het midden juist de
   route, en donker maken is precies wat je niet wilt. Wat de kaart wél nodig
   heeft is leesbare tekst bovenaan (de kop) en onderaan (de navigatie) -- dus
   een band boven en onder, en het midden open. */
const MAP_SCRIM = 'linear-gradient(180deg, rgba(20,4,40,.58) 0, rgba(20,4,40,0) 17%, '
  + 'rgba(20,4,40,0) 83%, rgba(20,4,40,.48) 100%)';

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
  background-image:${veil}url("${urls.venue}");background-size:${scrim ? 'cover,' : ''}cover;background-position:${scrim ? '50% 30%,' : ''}50% 30%}
/* §9.1: op het spelscherm lost het kader op -- anders beoordeel je een
   geschilderde zaal met een fotolijstje in het midden. */
#show-stage{border:none!important;box-shadow:none!important;background:transparent!important;overflow:visible!important}
#show-stage::after{display:none!important}
#show-stage .deco{display:none!important}
#game-avatar-inner{filter:drop-shadow(0 0 7px rgba(255,180,61,.32))}`);
  }

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

  if (urls.horizon) {
    /* Alle vier de hubschermen, niet alleen de kaart: stap 2 van het plan zet
       de wereld onder de kaart, de sterkeuze, de kleedkamer én de trofeeën.
       Alleen de kaart doen laat je een halve conversie beoordelen -- precies
       het "sommige schermen wel, sommige niet" waar het plan voor waarschuwt. */
    out.push(`${HUBS.join(',')}{position:relative}
${HUBS.map(h => h + '::before').join(',')}{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;
  /* Een warme nevel die vanaf de horizonlijn de violette lucht in trekt. Dit is
     wat de bovenhelft nodig heeft: licht, geen voorwerpen -- precies de regel
     uit het stijldocument. Kost geen beeld, alleen een verloop, en doet
     zichtbaar meer dan de wolkenplaat deed. */
  background-image:${veil}radial-gradient(120% 52% at 50% 78%, rgba(255,164,60,.30), rgba(255,120,200,.10) 45%, transparent 72%),url("${urls.horizon}");
  /* auto 32% en niet 46%: de hoogte bepaalt de maat, want de grond is een band
     onderaan. Op 46% werd een bron van 1536x576 uitgerekt tot 1035 px breed op
     een scherm van 390 -- 2,7x vergroot, dus je keek naar een uitsnede in plaats
     van naar de tekening. 32% geeft 270 px hoog, ongeveer de hoogte die
     .map-ground altijd had, en het schaalt netjes mee op een tablet. */
  background-size:${scrim ? 'cover,' : ''}cover,auto 32%;
  background-position:${scrim ? '50% 100%,' : ''}50% 100%,calc(50% - var(--horizon-x,0px)) 100%;
  background-repeat:${scrim ? 'no-repeat,' : ''}no-repeat,repeat-x;
  /* Lange, zachte overgang. De tekening begint op 68% (32% hoog, onderaan
     verankerd) en een korte vervaging liet daar de bovenrand van de plaat zien
     als een kaarsrechte streep dwars over de kaart. Nu loopt het masker van 52%
     tot 92%, dus de rand zit middenin de vervaging en is niet meer te zien. */
  -webkit-mask-image:linear-gradient(to bottom,transparent 52%,rgba(0,0,0,.55) 72%,#000 92%);
  mask-image:linear-gradient(to bottom,transparent 52%,rgba(0,0,0,.55) 72%,#000 92%)}
#screen-map .map-ground{display:none!important}`);
  }

  if (urls.sky) {
    /* Zwarte achtergrond + screen: zwart verdwijnt, dus de wolken hoeven niet
       uitgeknipt te worden. De emoji-wolken eronder gaan uit, anders drijven er
       twee luchten door elkaar.
       Alleen op de schermen die al een .map-sky-inner hébben (kaart en
       sterkeuze). De kleedkamer en de trofeeën hebben die laag niet; die
       erbij maken is werk in index.html, geen werk van de proefopstelling. */
    /* De app schuift deze laag met een transform. Dat verplaatst het élement,
       dus de rechterrand van de plaat komt in beeld en daar is dan geen lucht
       meer -- op een telefoon 49px, 13% van het scherm. Eerder is dat opgelost
       met 16% speling, maar dat is een getal dat op de huidige kaartlengte is
       afgestemd en bij een langere kaart gewoon weer stukgaat.
       Nu herhaalt de plaat en schuift de achtergrond in plaats van het element.
       Dan is er geen rand om tegenaan te lopen, hoe ver je ook schuift.

       GEEN mix-blend-mode meer. Dat was het plan -- zwart verdwijnt met screen,
       dus uitknippen hoeft niet -- maar het werkt hier niet: #app heeft
       position:relative met z-index:1 (index.html regel 159, uit fase 0, om
       boven de korrel- en confettilaag te staan) en dat maakt een eigen
       stapelcontext. De verlooplaag van body staat daarbuiten, dus er is
       binnen #app niets om mee te mengen en het zwart blijft gewoon zwart --
       een zwarte balk bovenaan de kaart.
       Een kandidaat met zwart eromheen moet bij het inlezen dus omgezet worden
       naar doorzichtigheid. Wat je bewaart is een gewone WebP met alfa, en er is
       geen enkele afhankelijkheid van stapelcontexten meer. */
    out.push(`#screen-map .map-sky-inner{
  transform:none!important;
  background-image:url("${urls.sky}");
  /* auto 34%: een lucht hoort bovenin, niet over het hele scherm. Op 100% werd
     een bron van 1536x864 op een telefoon 1500 px breed -- 3,8x vergroot, en je
     zag 26% van de plaat als drie enorme banden dwars over de kaart. */
  background-size:auto 34%;
  background-position:calc(50% - var(--sky-x,0px)) 0;
  background-repeat:repeat-x}
#screen-map .map-sky-inner > span{display:none!important}`);
  }

  if (urls.landing) {
    /* Het startscherm heeft zijn inhoud in het mídden (gemeten: op 390x844 staat
       alles tussen 25% en 73%) en is juist boven- en onderaan leeg. Precies
       omgekeerd aan de horizon, die zijn tekening in de onderste 55% heeft. Het
       masker houdt daarom de middenband vrij in plaats van de bovenkant. */
    out.push(`#screen-profile{position:relative}
#screen-profile::before{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;
  background-image:${veil}url("${urls.landing}");
  background-size:${scrim ? 'cover,' : ''}cover;
  background-position:${scrim ? '50% 50%,' : ''}50% 50%;
  -webkit-mask-image:linear-gradient(to bottom,#000 18%,rgba(0,0,0,.32) 34%,rgba(0,0,0,.32) 70%,#000 86%);
  mask-image:linear-gradient(to bottom,#000 18%,rgba(0,0,0,.32) 34%,rgba(0,0,0,.32) 70%,#000 86%)}
#screen-profile .map-sky span{display:none!important}`);
  }

  if (urls.finale) {
    out.push(`#screen-end{position:relative}
#screen-end::before{content:'';position:absolute;inset:0;z-index:-1;
  background-image:${veil}url("${urls.finale}");background-size:${scrim ? 'cover,' : ''}cover;background-position:${scrim ? '50% 40%,' : ''}50% 40%}`);
  }

  return out.join('\n');
}

/* Node krijgt zijn exports; in de browser bestaat 'module' niet en wordt dit
   overgeslagen -- dan staan de functies gewoon in de omringende scope. */
if (typeof module !== 'undefined') /* Aandrijving voor de parallax, als tekst zodat elk gereedschap precies
   dezelfde code inspuit. In de app zelf is dit straks
   een paar regels in updateParallax: CSS-variabelen zetten in plaats van een
   transform op de luchtlaag. */
function parallaxJs() {
  return `(function () {
    var lagen = ${JSON.stringify(HUBS)};
    function volg() {
      var tm = document.getElementById('tour-map');
      if (!tm) return;
      var x = tm.scrollLeft;
      lagen.forEach(function (sel) {
        var el = document.querySelector(sel);
        if (!el) return;
        el.style.setProperty('--horizon-x', (x * ${PARALLAX.horizon}).toFixed(1) + 'px');
        el.style.setProperty('--sky-x', (x * ${PARALLAX.sky}).toFixed(1) + 'px');
      });
    }
    // scroll bubbelt niet, dus meeluisteren in de capture-fase
    document.addEventListener('scroll', volg, true);
    volg();
  })();`;
}

if (typeof module !== 'undefined') module.exports = { SLOTS, SCRIM, PARALLAX, classify, css, isImage, mimeFor, namesHint, parallaxJs };
