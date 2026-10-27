/* =====================================================================
   INHOUD VAN HET SPEL — zoek op de sectienaam (bv. "= Telmodus") om er te
   springen. Regelnummers staan er bewust niet bij: die verouderen meteen.

   Het spel stond tot 2026-10-27 in één bestand, src/20-app.js. Het is langs
   zijn eigen secties opgedeeld, zonder één teken te verplaatsen: de bestanden
   hieronder achter elkaar geplakt zijn precies dat oude bestand, en de bouw gaf
   er hetzelfde index.html van. De volgorde is dus nog steeds de leesvolgorde
   van het scriptblok (zie CLAUDE.md, regel 0) -- en een const op het hoogste
   niveau die een eerder bestand bij het opstarten leest, hoort niet naar een
   later bestand te verhuizen.

   Ervóór liggen 00-vh-lock (de vensterhoogte, moet eerst), 05-foutmelder,
   10-feestjes (de gedeelde toast, confetti, danspasjes en dialogen),
   15-kaart-en-weg (de vormleer van de wereldkaart) en 17-kaartstand (waar de
   kaart naar kijkt en wat er loopt). Erna 90-wereldstudio (als studio.js apart
   gebouwd) en 99-servicewerker.

   Álle secties staan hieronder, in de volgorde van de bestanden. Dat is geen
   volledigheid om de volledigheid: een lijst die er een paar mist wijst je bij
   de moeilijkste stukken juist naar de verkeerde plek. Komt er een sectie bij,
   zet hem hier dan ook neer.

   ---- 20-gegevens.js: tabellen, en verder niets ---------------------------
     Helpers ............ mini-hulpjes ($, rnd, pick, shuffle, esc)
     De wereldbeloningen, getekend   de zes koptooien als SVG (fase 4D.2)
     Items .............. kleerkast-inhoud (data)
     Werelden ........... WORLDS + level→wereld (data; blok wordt machinaal
                          geschreven — zie WERELDEN-BEGIN), wereldControle,
                          worldsSource, schatFouten

   ---- 25-kern.js: de regels, zonder scherm --------------------------------
     De voortgang, afgeleid   worldDone/frontierWorld/continueWorld. ALLEEN
                          p.stars wordt bewaard; de rest volgt eruit
     Wereldbeloningen ... wat een wereld uitdeelt als hij uit of perfect is
     Podia .............. de podia, afgeleid uit p.owned
     Trofeeën ........... trofee-definities + planken (data)
     Sterrencarrière .... met pensioen: waarom er geen ster-status meer is
     Opslag ............. db, load/save, migratie, profielen

   ---- 30-zintuigen.js -----------------------------------------------------
     Trilfeedback ....... haptics
     Geluid ............. de SFX-tabel: klankjes op naam van de gebeurtenis,
                          live gemaakt met oscillatoren. Geen bestanden
     Gesproken opdrachten  nl-BE stem — alleen de telmodus (zie stemAan)
     Avatar (SVG) ....... de pop tekenen (BASES: meisje of jongen)

   ---- 35-schermen.js: welk scherm staat aan -------------------------------
     Schermen ........... show()/navGo()/toonHub
     De sterrenkeuze leeft   het beginscherm: zwaaien, vonkjes, ster kiezen
     Het spelogo komt binnen   de korte logo-intro bij het opstarten
     Wat er geladen wordt   preloadArt: welke tekening wanneer binnenkomt

   ---- 40-beweging.js: waar het meeste denkwerk in zit ---------------------
     Wereld naar wereld   de camera die van wereld naar wereld klimt
     Zwevende lagen ..... overlays
     Bewegingstaal ...... MOTION/VLUCHT + de wissel kaart ⇄ zaal. De twee lánge
                          duren staan hier en niet in :root — zie MOTION.totaal
     De kaart zegt hallo   de begroeting bij aankomst op de kaart
     Tik op de ster ..... ze antwoordt als je haar aantikt
     Kaart op de kaart .. goMap, en 🗺️ op je eigen kaart bouwt niets opnieuw op

   ---- 45-tournee.js -------------------------------------------------------
     De hele tournee .... de reis boven de werelden uit (het grootste blok)

   ---- 50-kast.js ----------------------------------------------------------
     Trofeeën-scherm .... kast, claim-ceremonie
     Wereldfeest ........ wereld uit en/of overal drie sterren (fase 4D.1)

   ---- 55-vragen.js: wat er gevraagd wordt ---------------------------------
     Vragen maken ....... rekenmodus: de leerstap per wereld (LEERSTAPPEN),
                          genTriple/genQuestion/genMissing/genChain
     Telmodus ........... lees-vrije vragen: fases, rungs, genCount, rendering
     Memory-spel ........ los kaartspel (lees-vrij)
     Extra uitdagingen .. beheersing, pauzeren, inroostering speciale vragen

   ---- 60-spel.js: de show -------------------------------------------------
     Spel ............... renderQuestion, submitAnswer, endLevel
     De som valt dicht    een goed antwoord vliegt het vakje van de som in

   ---- 65-kleedkamer.js ----------------------------------------------------
     Kleedkamer ......... winkel, passen, aankleden. Staat ook de 💎-tellers in
                          (zetTeller/telNu/telNaar/telStraks, gedeeld)
     Mijn wens .......... het hartje: waar ze voor spaart

   ---- 70-ouderdeel.js: voor ouders ----------------------------------------
     Nieuwe ster ........ het maakformulier
     Instellingen ....... ouderscherm: overzicht, en per ster voortgang + oefening + haar blad
     Het back-upblad .... bestand en ander toestel, onder één rij
     Overzetten ......... de sterren met een code naar een ander toestel
     Op het beginscherm   de uitlegkaart in Beheer: hoe het spel als app op
                          dit toestel komt. Laat het installeren aan de browser
     Speel als app ...... het knopje "⊞ Als app" op de sterrenkeuze

   ---- 80-start.js: opstarten en gereedschap -------------------------------
     Terug-navigatie .... Android back / browser back
     Start .............. opstarten, service worker
     -- Ontwikkelaarsschakelaars   alles achter ?debug
     -- Kijkstanden ..... ?debug&wereld=n&stand=... : een stand zonder spelen
     -- Wereldstudio .... ?debug&mapedit. Staat in src/90-wereldstudio.js, en
                          wordt als studio.js pas opgehaald als hij opengaat
                          (zie laadStudio)

   Twee koppen lijken op elkaar; zoek op genoeg letters. "= Werelden" is de
   tabel, "= Wereldbeloningen" wat een wereld uitdeelt, "= De wereldbeloningen"
   hun tekeningen. "= Trofeeën" is de tabel, "= Trofeeën-scherm" de kast.

   Tests: test/counting.test.js (telmodus) en test/maths.test.js
   (rekenmodus + adaptieve motor). Draaien met `npm test`.
   ===================================================================== */
/* ================= Helpers ================= */
const $ = id => document.getElementById(id);
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = arr => arr[rnd(0, arr.length - 1)];
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ================= De wereldbeloningen, getekend (fase 4D.2) ===============
   Zes hoofdstukken uit zes werelden, en met opzet één familie. Wat ze delen:

     * ze zitten allemaal op dezelfde kop -- het hoofd staat in élke basis op
       (100, 72) met straal 32, dus de schedeltop ligt op y = 40, en alles wat
       hier getekend wordt hoort dáár overheen te vallen en niet ernaast;
     * ze reiken allemaal tot ergens tussen y = 8 en y = 20 en geen enkele komt
       onder y = 59 -- ruim boven de nek (y = 94) waar de kleren beginnen;
     * platte vlakken met één donkerder rand eromheen (~2 breed voor de omtrek,
       ~1.3 voor de details), geen verlopen, geen filters;
     * geen enkele verwijzing naar buiten: geen <image>, geen url(), geen
       klassen. Dat moet ook wel -- itemThumb zet exact dezelfde vormen in een
       vakje van 52 pixels, en een miniatuur heeft geen stylesheet bij zich.

   Functies en geen kant-en-klare strings, om één reden: de hoepel, het blad en
   de noot komen elk meer dan eens voor, en een vorm die je twee keer overtikt
   loopt de derde keer uit elkaar. */

/* De hoepel die precies over de schedel loopt: een boog met straal 34 om
   (100, 74), waardoor zijn top op y = 40 ligt -- de schedeltop zelf. Het
   notenkroontje en de bladerkrans hangen er allebei aan en zitten daardoor ook
   allebei even diep op het hoofd. */
const HOOFDBAND = 'M74 52 A34 34 0 0 1 126 52';
// Eén hoepel = twee streken: eerst de donkere en dikkere, dan de kleur erop.
// Zo krijgt de boog dezelfde rand als elk ander vlak, zonder een tweede pad.
function hoofdband(kleur, rand, dik) {
  return `<path d="${HOOFDBAND}" fill="none" stroke="${rand}" stroke-width="${dik + 3}" stroke-linecap="round"/>`
       + `<path d="${HOOFDBAND}" fill="none" stroke="${kleur}" stroke-width="${dik}" stroke-linecap="round"/>`;
}
/* Een achtste noot: bolletje op de hoepel, steel omhoog, vlaggetje naar rechts.
   Staat rechtop en kantelt niet mee met de boog -- drie schuine noten lezen als
   omgevallen, en dit is een kroontje. De randdikte wordt door de schaal heen
   teruggerekend, anders wordt de kleinste noot ook de dunst omrande. */
function muziekNoot(x, y, sc) {
  const r = (w) => (w / sc).toFixed(2);
  return `<g transform="translate(${x},${y}) scale(${sc})" fill="#ffd740" stroke="#c8a200" stroke-width="${r(1.8)}" stroke-linejoin="round">`
    + `<path d="M3 -1 L3 -18 Q13 -15 11.5 -6 Q10.5 -11.5 6 -12.5 L6 -1 Z"/>`
    + `<ellipse cx="0" cy="0" rx="6" ry="4.6" transform="rotate(-18)"/></g>`;
}
// Eén breed blad met een nerf, met de punt naar buiten gedraaid.
function jungleBlad(x, y, hoek, sc) {
  const r = (w) => (w / sc).toFixed(2);
  return `<g transform="translate(${x},${y}) rotate(${hoek}) scale(${sc})">`
    + `<path d="M0 0 Q10 -8 20 0 Q10 8 0 0 Z" fill="#4caf50" stroke="#2e7d32" stroke-width="${r(2)}" stroke-linejoin="round"/>`
    + `<path d="M3 0 H16" fill="none" stroke="#2e7d32" stroke-width="${r(1.3)}" stroke-linecap="round"/></g>`;
}

// 🎵 Notenkroontje -- een gouden hoepel met drie achtste noten erop, de
// middelste het hoogst. Reikt tot y = 11.
function artNotenkroon() {
  /* De bolletjes staan vríj boven de hoepel en niet erop: goud op goud loopt
     anders tot één vlek dicht, en dan is het een kroontje met drie sprieten. */
  return hoofdband('#ffd740', '#c8a200', 5.5)
    + muziekNoot(82, 35, 0.9) + muziekNoot(118, 35, 0.9) + muziekNoot(100, 29, 1);
}
// 🍭 Lollyhoedje -- een roze-witte spiraallolly naast het hoofd, stokje schuin
// in het haar. Het enige stuk van de zes dat niet midden op de kop zit; het
// stokje loopt naar (80, 57) en dat is net binnen de haarrand.
function artLolly() {
  return `<line x1="69" y1="38" x2="80" y2="57" stroke="#c9a86a" stroke-width="7" stroke-linecap="round"/>`
    + `<line x1="69" y1="38" x2="80" y2="57" stroke="#f0e0c0" stroke-width="4" stroke-linecap="round"/>`
    + `<circle cx="68" cy="26" r="15" fill="#fff5f8" stroke="#d81b60" stroke-width="2"/>`
    /* De draai: halve cirkels met een steeds grotere straal, om en om links en
       rechts van het midden. Eén doorlopend pad, dus één streek -- een spiraal
       uit losse boogjes krijgt bij elke naad een knikje. Drie dikke windingen en
       geen vijf dunne: op de pop is de lolly 15 punten breed, en daar lopen vijf
       lijntjes in elkaar over tot één roze vlek. */
    + `<path d="M71 26 A4.25 4.25 0 0 1 62.5 26 A6.75 6.75 0 0 1 76 26 A9.5 9.5 0 0 1 57 26"`
    + ` fill="none" stroke="#f06292" stroke-width="4.2" stroke-linecap="round"/>`;
}
// 🌴 Bladerkrans -- vijf brede bladeren op een groene hoepel, met één hibiscus
// links erop. De breedste van de zes, en dat hoort ook: het is een krans.
function artBladerkrans() {
  const bloem = (x, y) => {
    let s = '';
    for (let i = 0; i < 5; i++) {
      const a = (i * 72) * Math.PI / 180;
      s += `<circle cx="${(x + 5 * Math.sin(a)).toFixed(1)}" cy="${(y - 5 * Math.cos(a)).toFixed(1)}" r="4.6" fill="#ff5c8a" stroke="#c2185b" stroke-width="1.5"/>`;
    }
    return s + `<circle cx="${x}" cy="${y}" r="3.2" fill="#ffd740" stroke="#c8a200" stroke-width="1.3"/>`;
  };
  return hoofdband('#43a047', '#2e7d32', 6)
    + jungleBlad(74, 52.1, -140, 0.72) + jungleBlad(83, 44.6, -120, 0.88)
    + jungleBlad(100, 40, -90, 1)
    + jungleBlad(117, 44.6, -60, 0.88) + jungleBlad(126, 52.1, -40, 0.72)
    + bloem(75, 46);
}
// 🏴‍☠️ Piratenhoed -- een driekante steek met gouden rand en een crèmekleurig
// doodshoofdje. Het vlak is donker maar niet zwart: de kaartjes in de
// kleedkamer staan zelf al op een donkere achtergrond.
function artPiratenhoed() {
  /* Eén gesloten omtrek, en daarin de drie dingen die een steek een steek maken:
     twee opgeslagen punten die hóger staan dan waar de rand het hoofd raakt
     (60,28) en (140,28), een kruin die daartussen bolt (top op y=16), en een
     rand die in het midden doorzakt. Zonder die punten is het een pet. */
  return `<path d="M60 28 Q66 38 78 40 Q76 20 100 16 Q124 20 122 40 Q134 38 140 28 Q142 48 126 55 Q100 62 74 55 Q58 48 60 28 Z" fill="#39404d" stroke="#ffd54f" stroke-width="2.5" stroke-linejoin="round"/>`
    // de naad waar de omgeslagen rand ophoudt en de kruin begint
    + `<path d="M78 41 Q100 47 122 41" fill="none" stroke="#ffd54f" stroke-width="2" stroke-linecap="round"/>`
    + `<circle cx="100" cy="31" r="7" fill="#f5efe0"/>`
    + `<path d="M95 36 h10 v3.4 q0 2.5 -5 2.5 q-5 0 -5 -2.5 Z" fill="#f5efe0"/>`
    + `<circle cx="97.4" cy="30.5" r="2.1" fill="#39404d"/><circle cx="102.6" cy="30.5" r="2.1" fill="#39404d"/>`
    + `<path d="M98.7 36.6 v4.2 M101.3 36.6 v4.2" stroke="#39404d" stroke-width="1.2" stroke-linecap="round"/>`;
}
// ❄️ IJskroontje -- drie ijsscherven van ongelijke hoogte. De onderrand is geen
// rechte lijn maar buigt mee met de schedel, zodat de kroon op het hoofd staat
// en er niet bovenop zweeft.
function artIjskroon() {
  return `<path d="M75 51 L82 22 L90 37 L100 12 L110 37 L118 20 L125 51 Q100 36 75 51 Z" fill="#b3e5fc" stroke="#4b9fd0" stroke-width="2" stroke-linejoin="round"/>`
    + `<path d="M100 15 L104.5 35 L100 35 Z" fill="#e8f7ff"/>`
    + `<path d="M83.4 27 Q84 29.4 86.4 30 Q84 30.6 83.4 33 Q82.8 30.6 80.4 30 Q82.8 29.4 83.4 27 Z" fill="#ffffff"/>`;
}
/* 🪄 Tovenaarshoed -- de puntmuts met de gouden sterren. Dit is de tekening die
   al in het spel zat voor het winkelitem acc_tovenaarshoed; dat item is weg en de
   vorm bleef, nu als de beloning van de Toverwereld.

   Één ding is er veranderd: de punt begon op y = 0 en begint nu op y = 8. Dat
   was de hoogste van de zes en stak er dus uit; op 8 reikt hij even ver als het
   ijskroontje en het notenkroontje ernaast. De sterren staan daarom op een breuk
   van de kegelhoogte en niet op een vaste y -- zo blijven ze op hun plek zitten
   als de punt ooit nog verschuift. */
const TOVERHOED_PUNT = 8;
function artToverhoed() {
  const t = TOVERHOED_PUNT, h = 44 - t;
  return `<path d="M100 ${t} L79 44 L121 44 Z" fill="#5e35b1" stroke="#311b92" stroke-width="2"/>`
    + `<path d="M71 44 L129 44 Q129 51 121 51 L79 51 Q71 51 71 44 Z" fill="#7e57c2" stroke="#311b92" stroke-width="1.5"/>`
    + `<text x="92" y="${Math.round(t + h * 0.86)}" font-size="12" fill="#ffd54f">★</text>`
    + `<text x="99" y="${Math.round(t + h * 0.53)}" font-size="9" fill="#ffd54f">★</text>`;
}
/* Het miniatuur is elke keer dezelfde tekening, alleen strak uitgesneden:
   itemThumb geeft hem 52 pixels hoogte en de viewBox doet de rest, dus krapper
   uitsnijden is groter in beeld. Eén tekening voor de pop, de kaart én het
   wereldfeest -- geen tweede versie die uit de pas kan gaan lopen. */
function beloningThumb(view, art) {
  return `<svg viewBox="${view}" xmlns="http://www.w3.org/2000/svg">${art}</svg>`;
}

/* ---- Een wereldschat uit de studio: een tekening, geen code ---------------
   De zes hierboven zijn met de hand geschreven functies. Een schat die in de
   wereldstudio gemaakt wordt, staat als gegevens bij zijn wereld in WORLDS:

     beloning: 'acc_wereld_regenboog',
     schat: { naam: 'Regenboogkroon', emoji: '🌈', view: '70 10 60 46', svg: '<g …>…</g>' },

   en rebuildWereldschatten() maakt er een gewoon spulletje van in ITEMS -- met
   dezelfde draw() en thumb() als de zes, dus de kleedkamer, het wereldfeest en de
   kaart merken geen verschil. Waarom bij de wereld en niet in een eigen lijst:
     - een schat hoort bij precies één wereld; zo kan er geen losse schat zijn die
       aan niemand hangt (die zou prijsloos in de winkel komen, zie isBeloning);
     - hij gaat mee in het concept van de studio, dus je ziet hem meteen in
       Probeer, en hij wordt samen met de wereld gekeurd en opgeslagen.

   De tekening is al op het hoofd gezet door de studio (in de 200x250-ruimte van
   de pop) en `view` is de uitsnede voor het miniatuur. Het spel rekent hier niets
   meer uit; dat vraagt een browser, en daar is de studio. */
function schatItem(w) {
  const s = w.schat;
  return { id: w.beloning, cat: 'acc', name: s.naam, full: s.naam, emoji: s.emoji || w.icon,
           uitWereld: w.id, draw: () => s.svg, thumb: () => beloningThumb(s.view, s.svg) };
}
function rebuildWereldschatten() {
  for (let i = ITEMS.length - 1; i >= 0; i--) if (ITEMS[i].uitWereld) ITEMS.splice(i, 1);
  WORLDS.forEach(w => {
    if (!w.schat || !w.beloning || item(w.beloning)) return;   // een handgemaakte wint: zie wereldControle
    if (schatFouten(w.schat).length) return;                     // kapot: niet in het spel, wél in de keuring
    ITEMS.push(schatItem(w));
  });
}
/* Wat er in de tekening van een schat mag staan. Het is tekst die letterlijk in
   het scriptblok van index.html terechtkomt, en daar gelden twee soorten regels:

     - die van de app (zie de kop van "De wereldbeloningen, getekend"): losse
       vormen, geen verwijzing naar buiten -- geen <image>, geen url(), geen klasse,
       want het miniatuur heeft geen stijlblad bij zich;
     - die van het ene bestand (CLAUDE.md, regel 1): nergens de opening of de
       afsluiting van een scripttag. Staat die er, dan knipt test/app.js het
       scriptblok op de verkeerde plek en valt elke Node-suite om.

   Dus een korte lijst toegestane elementen, en een nog kortere lijst van wat
   nooit mag. De studio maakt een tekening eerst zelf schoon; dit is het vangnet
   dat de keuring en het opslaan gebruiken. Zuiver: geen DOM, zodat het ook in
   Node draait. */
/* Waar een tekening mee mag beginnen (een vorm of een groep), en wat er verder in
   mag. Eén lijst voor schatFouten hieronder en voor de tekeningtest in
   beloning.test.js zaak I: die hadden elk hun eigen rijtje, en dan kwam een
   tekening die met <rect> begon wel door de keuring maar pas bij Publiceren niet
   door de browsertest. */
const SCHAT_VORMEN = ['g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect'];
const SCHAT_ELEMENTEN = SCHAT_VORMEN.concat(['text']);
function schatFouten(s) {
  const uit = [];
  if (!s || typeof s !== 'object') return ['de schat is geen kaartje met naam, emoji, view en svg'];
  if (!String(s.naam || '').trim()) uit.push('de schat heeft nog geen naam');
  if (!String(s.emoji || '').trim()) uit.push('de schat heeft nog geen emoji (dat is de confetti bij het wereldfeest)');
  if (!/^-?\d+(\.\d+)? -?\d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)?$/.test(String(s.view || ''))) {
    uit.push('de uitsnede van het miniatuur ("' + s.view + '") is geen x y breedte hoogte');
  }
  const svg = String(s.svg || '');
  if (!svg.trim()) { uit.push('de schat heeft nog geen tekening'); return uit; }
  if (svg.length > 12000) uit.push('de tekening is ' + Math.round(svg.length / 1024) + ' kB tekst; houd hem onder de 12 — hij gaat mee in elke download');
  if (/<\s*\/?\s*script|<\s*(image|use|foreignobject|style|a)\b|url\s*\(|href|javascript:|\son[a-z]+\s*=|\sclass\s*=|\sstyle\s*=|<!|<\?|&/i.test(svg)) {
    uit.push('de tekening bevat iets wat niet mag: een script, een plaatje, een link, een stijl of een klasse');
  }
  const vreemd = [];
  svg.replace(/<\/?\s*([a-zA-Z][\w:-]*)/g, (_, t) => { if (SCHAT_ELEMENTEN.indexOf(t.toLowerCase()) < 0) vreemd.push(t); return _; });
  if (vreemd.length) uit.push('onbekende elementen in de tekening: ' + [...new Set(vreemd)].join(', '));
  if (!new RegExp('^\\s*<(' + SCHAT_VORMEN.join('|') + ')\\b').test(svg)) uit.push('de tekening moet met een vorm of een <g> beginnen');
  return uit;
}
/* De maat van een schat, zonder browser. Een tekening meten kan alleen een
   browser (getBBox), en dat doet de studio bij het plaatsen: `view` is die
   omhullende plus SCHAT_RAND aan elke kant (zie zetOpHoofd). De handgeschreven
   schatten hebben net zo'n uitsnede in hun thumb(). Dus is de uitsnede de maat,
   voor allemaal -- en kan npm run check de regels van de maatfamilie nakijken die
   eerst alleen in de browsersuite stonden (beloning.test.js zaak I). Die zaak meet
   op zijn beurt na dat een view echt om zijn tekening heen past; zo kan de
   uitsnede hier niet stil gaan liegen.

   De regels zijn die van zaak I: boven de nek (y = 94, daar beginnen de kleren),
   niet boven de pop uit, en in één familie -- geen schat twee keer zo hoog of drie
   keer zo breed als een andere. Uitsneden hebben allemaal een randje, dus die
   verhoudingen zijn hier iets ruimer dan op de kale tekening; de browsertest blijft
   de strenge. De studio past beide toe, dus wat zij goedkeurt komt hier door. */
const SCHAT_RAND = 2;
function schatUitsnede(it) {                          // [x, y, breed, hoog] uit het miniatuur
  const m = it && typeof it.thumb === 'function' ? /viewBox="([-\d. ]+)"/.exec(it.thumb('meisje')) : null;
  const v = m ? m[1].trim().split(/\s+/).map(Number) : null;
  return v && v.length === 4 && v.every(n => !isNaN(n)) ? v : null;
}
// De uitsneden van de schatten van alle andere werelden: waar een nieuwe naast staat.
function schatUitsneden(zonder) {
  return WORLDS.filter(x => x !== zonder && x.beloning).map(x => item(x.beloning))
    .filter(it => it && (!zonder || it.id !== zonder.beloning)).map(schatUitsnede).filter(Boolean);
}
function schatMaatFouten(s, anderen) {
  const v = String((s && s.view) || '').trim().split(/\s+/).map(Number);
  if (v.length !== 4 || v.some(isNaN)) return [];     // dat zegt schatFouten al
  const uit = [];
  const r1 = n => Math.round(n * 10) / 10;
  if (v[1] + v[3] - SCHAT_RAND > 94) uit.push('de schat zakt tot y = ' + r1(v[1] + v[3] - SCHAT_RAND) + ', onder de nek (94) waar de kleren beginnen');
  if (v[1] + SCHAT_RAND < -2) uit.push('de schat steekt boven de rand van de pop uit');
  if ((anderen || []).length) {
    const hs = anderen.map(x => x[3]), bs = anderen.map(x => x[2]);
    const hi = Math.max(v[3], ...hs) / Math.min(v[3], ...hs), br = Math.max(v[2], ...bs) / Math.min(v[2], ...bs);
    if (hi >= 2) uit.push('de schat is ' + r1(v[3]) + ' hoog, naast ' + Math.min(...hs) + '–' + Math.max(...hs) + ' bij de andere: meer dan twee keer zo hoog of laag');
    if (br >= 3) uit.push('de schat is ' + r1(v[2]) + ' breed, naast ' + Math.min(...bs) + '–' + Math.max(...bs) + ' bij de andere: meer dan drie keer zo breed of smal');
  }
  return uit;
}

/* ================= Items ================= */
const ITEMS = [
  // Haar
  { id: 'hair_blond',    cat: 'hair', name: 'Blond',     full: 'Blond kapsel',     price: 0,   color: '#f7d774' },
  { id: 'hair_bruin',    cat: 'hair', name: 'Bruin',     full: 'Bruin kapsel',     price: 15,  color: '#8d5a2b' },
  { id: 'hair_zwart',    cat: 'hair', name: 'Zwart',     full: 'Zwart kapsel',     price: 15,  color: '#3a3a3a' },
  { id: 'hair_rood',     cat: 'hair', name: 'Rood',      full: 'Rood kapsel',      price: 25,  color: '#d84315' },
  { id: 'hair_roze',     cat: 'hair', name: 'Roze',      full: 'Roze kapsel',      price: 40,  color: '#f06292' },
  { id: 'hair_blauw',    cat: 'hair', name: 'Blauw',     full: 'Blauw kapsel',     price: 46,  color: '#42a5f5' },
  { id: 'hair_paars',    cat: 'hair', name: 'Paars',     full: 'Paars kapsel',     price: 52,  color: '#ab47bc' },
  { id: 'hair_groen',    cat: 'hair', name: 'Groen',     full: 'Groen kapsel',     price: 45,  color: '#66bb6a' },
  { id: 'hair_wit',      cat: 'hair', name: 'Wit',       full: 'Wit kapsel',       price: 20,  color: '#f5f5f5' },
  { id: 'hair_turkoois', cat: 'hair', name: 'Turquoise', full: 'Turquoise kapsel', price: 40,  color: '#26c6da' },
  { id: 'hair_zilver',   cat: 'hair', name: 'Zilvergrijs', full: 'Zilvergrijs kapsel', price: 60, color: '#cfd8dc' },
  { id: 'hair_regenboog',cat: 'hair', name: 'Regenboog', full: 'Regenboogkapsel',  price: 90,  color: 'RAINBOW' },
  // Kleren -- kleur en patroon; de basisfiguur bepaalt of het een jurk of een
  // shirt met broek wordt (zie BASES bij de avatar)
  { id: 'dress_roze',    cat: 'dress', name: 'Roze',      full: 'Roze outfit',    price: 0,   color: '#ec407a' },
  { id: 'dress_paars',   cat: 'dress', name: 'Paars',    full: 'Paarse outfit',  price: 0,   color: '#7e57c2' },
  { id: 'dress_geel',    cat: 'dress', name: 'Geel',      full: 'Gele outfit',    price: 15,  color: '#fdd835' },
  { id: 'dress_blauw',   cat: 'dress', name: 'Blauw',    full: 'Blauwe outfit',  price: 18,  color: '#29b6f6' },
  { id: 'dress_groen',   cat: 'dress', name: 'Groen',    full: 'Groene outfit',  price: 24,  color: '#66bb6a' },
  { id: 'dress_oranje',  cat: 'dress', name: 'Oranje',    full: 'Oranje outfit',  price: 32,  color: '#fb8c00' },
  { id: 'dress_rood',    cat: 'dress', name: 'Rood',      full: 'Rode outfit',    price: 42,  color: '#ef5350' },
  { id: 'dress_sterren', cat: 'dress', name: 'Sterren',    full: 'Sterrenoutfit', price: 60,  color: '#5c6bc0', pattern: 'stars' },
  { id: 'dress_hartjes', cat: 'dress', name: 'Hartjes',    full: 'Hartjesoutfit', price: 70,  color: '#f06292', pattern: 'hearts' },
  { id: 'dress_disco',   cat: 'dress', name: 'Disco',      full: 'Disco-outfit',  price: 80,  color: '#b0bec5', pattern: 'disco' },
  { id: 'dress_voetbal', cat: 'dress', name: 'Voetbal',    full: 'Voetbaloutfit', price: 65,  color: '#fafafa', pattern: 'ohl' },
  { id: 'dress_zeemeermin', cat: 'dress', name: 'Zeemeermin', full: 'Zeemeerminoutfit', price: 85, color: '#26a69a', pattern: 'scales' },
  { id: 'dress_tover',   cat: 'dress', name: 'Tover', full: 'Toveroutfit', price: 95,  color: '#4527a0', pattern: 'magic' },
  { id: 'dress_regenboog',cat:'dress', name: 'Regenboog',  full: 'Regenboogoutfit', price: 150, color: 'RAINBOW' },
  // Schoenen (kleuren de vaste schoenen van de paspop)
  { id: 'shoes_roze',  cat: 'shoes', name: 'Roze',   full: 'Roze schoenen',   price: 0,  color: '#e91e63' },
  { id: 'shoes_rood',  cat: 'shoes', name: 'Rood',   full: 'Rode schoenen',   price: 10, color: '#e53935' },
  { id: 'shoes_blauw', cat: 'shoes', name: 'Blauw', full: 'Blauwe schoenen', price: 15, color: '#1e88e5' },
  { id: 'shoes_geel',  cat: 'shoes', name: 'Geel',   full: 'Gele schoenen',   price: 18, color: '#fdd835' },
  { id: 'shoes_paars', cat: 'shoes', name: 'Paars', full: 'Paarse schoenen', price: 24, color: '#8e24aa' },
  { id: 'shoes_groen', cat: 'shoes', name: 'Groen', full: 'Groene schoenen', price: 32, color: '#43a047' },
  { id: 'shoes_zwart', cat: 'shoes', name: 'Stoere laarsjes',   price: 42, color: '#37474f' },
  { id: 'shoes_goud',  cat: 'shoes', name: 'Gouden glitter', full: 'Gouden glitterschoenen', price: 55, color: '#ffd54f' },
  { id: 'shoes_regenboog', cat: 'shoes', name: 'Regenboog', full: 'Regenboogschoenen', price: 80, color: 'RAINBOW' },
  // Microfoons
  { id: 'mic_rood',   cat: 'mic', name: 'Rood',   full: 'Rode microfoon',   price: 15, color: '#e53935' },
  { id: 'mic_zilver', cat: 'mic', name: 'Zilver', full: 'Zilveren microfoon', price: 30, color: '#cfd8dc' },
  { id: 'mic_blauw',  cat: 'mic', name: 'Blauw',   full: 'Blauwe microfoon', price: 35, color: '#42a5f5' },
  { id: 'mic_groen',  cat: 'mic', name: 'Groen',   full: 'Groene microfoon', price: 40, color: '#66bb6a' },
  { id: 'mic_pintje', cat: 'mic', name: 'Pintje',  full: 'Pintjesmicrofoon',      price: 45, emoji: '🍺' },
  { id: 'mic_bubbels', cat: 'mic', name: 'Bubbels', full: 'Bubbelmicrofoon',       price: 50, emoji: '🥂' },
  { id: 'mic_zwart',  cat: 'mic', name: 'Rock', full: 'Rockmicrofoon', price: 55, color: '#37474f' },
  { id: 'mic_toverstaf', cat: 'mic', name: 'Toverstaf', full: 'Toverstafmicrofoon', price: 70, emoji: '🪄' },
  { id: 'mic_goud',   cat: 'mic', name: 'Goud',   full: 'Gouden microfoon', price: 60, color: '#ffd54f' },
  { id: 'mic_roze',   cat: 'mic', name: 'Roze glitter', full: 'Roze glittermicrofoon', price: 90, color: '#ff80ab' },
  // emoji-microfoons: het emoji zit bovenop een steel in de hand (zie avatarSVG)
  { id: 'mic_ijsje',  cat: 'mic', name: 'IJsje',  full: 'IJsjesmicrofoon', price: 45, emoji: '🍦' },
  { id: 'mic_vuur',   cat: 'mic', name: 'Vuur',   full: 'Vuurmicrofoon',   price: 75, emoji: '🔥' },
  // de gekke microfoons: ook gewoon een emoji op de steel
  { id: 'mic_banaan', cat: 'mic', name: 'Banaan', full: 'Bananenmicrofoon', price: 20, emoji: '🍌' },
  { id: 'mic_friet',  cat: 'mic', name: 'Frietje', full: 'Frietjesmicrofoon', price: 30, emoji: '🍟' },
  { id: 'mic_wcrol',  cat: 'mic', name: 'Wc-rol', full: 'Wc-rolmicrofoon', price: 35, emoji: '🧻' },
  { id: 'mic_regenboog', cat: 'mic', name: 'Regenboog', full: 'Regenboogmicrofoon', price: 100, color: 'RAINBOW' },
  // Instrumenten
  { id: 'instr_tamboerijn', cat: 'instrument', name: 'Tamboerijn', price: 28, emoji: '🪘' },
  { id: 'instr_gitaar',  cat: 'instrument', name: 'Gitaar',    price: 40, emoji: '🎸' },
  { id: 'instr_piano',   cat: 'instrument', name: 'Keyboard',  price: 45, emoji: '🎹' },
  { id: 'instr_drums',   cat: 'instrument', name: 'Drumstel',  price: 55, emoji: '🥁' },
  { id: 'instr_viool',   cat: 'instrument', name: 'Viool',     price: 60, emoji: '🎻' },
  { id: 'instr_accordeon', cat: 'instrument', name: 'Accordeon', price: 65, emoji: '🪗' },
  { id: 'instr_sax',     cat: 'instrument', name: 'Saxofoon',  price: 70, emoji: '🎷' },
  { id: 'instr_trompet', cat: 'instrument', name: 'Trompet',   price: 80, emoji: '🎺' },
  { id: 'instr_dj',      cat: 'instrument', name: 'DJ-set',    price: 130, emoji: '🎛️' },
  { id: 'instr_toeter',  cat: 'instrument', name: 'Toeter',    price: 20, emoji: '📯' },
  { id: 'instr_koebel',  cat: 'instrument', name: 'Koebel',    price: 35, emoji: '🔔' },
  // Extra's
  { id: 'acc_strik',    cat: 'acc', name: 'Strik',    price: 25, emoji: '🎀' },
  { id: 'acc_bloem',    cat: 'acc', name: 'Bloem',          price: 25, emoji: '🌸' },
  { id: 'acc_bril',     cat: 'acc', name: 'Zonnebril',price: 35, emoji: '🕶️' },
  { id: 'acc_koptel',   cat: 'acc', name: 'Hoofdtelefoon',  price: 50, emoji: '🎧' },
  { id: 'acc_kroon',    cat: 'acc', name: 'Kroontje',       price: 75, emoji: '👑' },
  // nieuwe extra's tekenen generiek via hun emoji (spot: 'zij' = in het haar, 'top' = op het hoofd)
  { id: 'acc_vlinder',  cat: 'acc', name: 'Vlinder',        price: 30, emoji: '🦋', spot: 'zij' },
  { id: 'acc_ster',     cat: 'acc', name: 'Sterspeldje',    price: 35, emoji: '💫', spot: 'zij' },
  { id: 'acc_feesthoed', cat: 'acc', name: 'Feesthoedje',   price: 30, emoji: '🎉', spot: 'top' },
  { id: 'acc_hoed',     cat: 'acc', name: 'Hoge hoed',      price: 45, emoji: '🎩', spot: 'top' },
  { id: 'acc_bloemkrans',cat: 'acc', name: 'Bloemenkrans',  price: 55, emoji: '🌼', spot: 'top' },
  { id: 'acc_diadeem',  cat: 'acc', name: 'Diamanten diadeem', price: 180, emoji: '💎', spot: 'top' },
  { id: 'acc_kers',     cat: 'acc', name: 'Kersjes',        price: 30, emoji: '🍒', spot: 'zij' },
  { id: 'acc_anker',    cat: 'acc', name: 'Ankerspeldje',   price: 30, emoji: '⚓', spot: 'zij' },
  { id: 'acc_schelp',   cat: 'acc', name: 'Schelpje',       price: 35, emoji: '🐚', spot: 'zij' },
  { id: 'acc_maan',     cat: 'acc', name: 'Maantje',        price: 40, emoji: '🌙', spot: 'top' },
  { id: 'acc_kaas',     cat: 'acc', name: 'Kaashoedje',     price: 25, emoji: '🧀', spot: 'top' },
  { id: 'acc_pannenkoek', cat: 'acc', name: 'Pannenkoek', full: 'Pannenkoek op je hoofd', price: 30, emoji: '🥞', spot: 'top' },
  /* FASE 4D.1 -- de wereldbeloningen. Eén hoofdstuk per wereld, en je krijgt het
     niet van je diamanten maar doordat je die wereld uitspeelt (zie WORLDS.beloning
     en beloningWereld hieronder).

     Waarom hoofd-accessoires en geen outfits: de paspop is één tekening met twee
     basissen (meisje/jongen, zie BASES), en alles wat aan het hóófd hangt is voor
     allebei precies hetzelfde -- het hoofd staat op (100, 72) met straal 32, in
     élke basis. Een kroontje hoeft dus maar één keer getekend te worden, werkt
     meteen voor beide en kan nooit scheef op een jurk of een broek vallen.

     Geen prijs: deze staan niet te koop. De kleedkamer leest dat aan
     beloningItem() af en toont ze op slot tot de wereld uit is. Zet er dus géén
     price bij -- dan zou de winkel ze alsnog verkopen.

     FASE 4D.2 heeft de tijdelijke emoji vervangen door de echte tekening: elk
     item brengt nu zijn eigen `draw` (op de paspop) en `thumb` (in het vakje van
     de kleedkamer en van het wereldfeest) mee -- zie het tekenblok hierboven.
     De ids zijn daarbij níet veranderd, en dat is het hele punt: wie zo'n
     spulletje al verdiend had ziet vanaf nu gewoon de echte tekening. Geen
     migratie, geen tweede item, niets opnieuw te verdienen.

     Het emoji blijft er wél staan, maar niet meer als tekening: het is wat de
     confetti bij het wereldfeest rondstrooit en wat vóór de naam in de
     kleedkamerbalk komt -- twee plekken waar geen SVG past. */
  { id: 'acc_wereld_muziek',  cat: 'acc', name: 'Notenkroontje', full: 'Notenkroontje', emoji: '🎵',
    draw: () => artNotenkroon(),  thumb: () => beloningThumb('71 8 60 47', artNotenkroon()) },
  { id: 'acc_wereld_snoep',   cat: 'acc', name: 'Lollyhoedje',   full: 'Lollyhoedje',   emoji: '🍭',
    draw: () => artLolly(),       thumb: () => beloningThumb('50 8 36 52', artLolly()) },
  { id: 'acc_wereld_jungle',  cat: 'acc', name: 'Bladerkrans',   full: 'Bladerkrans',   emoji: '🍃',
    draw: () => artBladerkrans(), thumb: () => beloningThumb('58 17 84 41', artBladerkrans()) },
  { id: 'acc_wereld_piraten', cat: 'acc', name: 'Piratenhoed',   full: 'Piratenhoed',   emoji: '🏴‍☠️',
    draw: () => artPiratenhoed(), thumb: () => beloningThumb('57 13 86 48', artPiratenhoed()) },
  { id: 'acc_wereld_ijs',     cat: 'acc', name: 'IJskroontje',   full: 'IJskroontje',   emoji: '❄️',
    draw: () => artIjskroon(),    thumb: () => beloningThumb('72 9 56 45', artIjskroon()) },
  /* De tovenaarshoed is er nog maar één, en dit is hem. Hij stond hier ook te
     koop voor 85 diamanten; die tweede is weg (zie migrate), want twee
     bijna-gelijke hoeden naast elkaar maakten de beloning goedkoop -- wie de
     winkelhoed had, had de Toverwereld al in haar kast staan zonder hem te
     spelen. Het id blijft acc_wereld_tover. */
  { id: 'acc_wereld_tover',   cat: 'acc', name: 'Tovenaarshoed', full: 'Tovenaarshoed', emoji: '🪄',
    draw: () => artToverhoed(),   thumb: () => beloningThumb('69 5 62 49', artToverhoed()) },
  // Huisdieren
  { id: 'pet_poes',   cat: 'pet', name: 'Poesje',        price: 22,  emoji: '🐈' },
  { id: 'pet_hamster', cat: 'pet', name: 'Hamstertje',    price: 40,  emoji: '🐹' },
  { id: 'pet_hond',   cat: 'pet', name: 'Danshondje',    price: 50,  emoji: '🐶' },
  { id: 'pet_kat',    cat: 'pet', name: 'Zangpoesje',    price: 50,  emoji: '🐱' },
  { id: 'pet_pinguin',cat: 'pet', name: 'Pinguïn',       price: 55,  emoji: '🐧' },
  { id: 'pet_konijn', cat: 'pet', name: 'Konijntje',     price: 60,  emoji: '🐰' },
  { id: 'pet_schildpad',cat:'pet', name: 'Schildpadje',  price: 65,  emoji: '🐢' },
  { id: 'pet_vos',    cat: 'pet', name: 'Slim vosje',    price: 70,  emoji: '🦊' },
  { id: 'pet_uil',    cat: 'pet', name: 'Wijze uil',     price: 75,  emoji: '🦉' },
  { id: 'pet_papegaai',cat:'pet', name: 'Papegaai',      price: 80,  emoji: '🦜' },
  { id: 'pet_dolfijn',cat: 'pet', name: 'Dolfijn',       price: 85,  emoji: '🐬' },
  { id: 'pet_eekhoorn',cat:'pet', name: 'Eekhoorn Lionel', price: 90, emoji: '🐿️' },
  { id: 'pet_panda',  cat: 'pet', name: 'Pandabeer',     price: 90,  emoji: '🐼' },
  { id: 'pet_flamingo',cat:'pet', name: 'Flamingo',      price: 95,  emoji: '🦩' },
  { id: 'pet_leeuw',  cat: 'pet', name: 'Leeuwenwelp',   price: 100, emoji: '🦁' },
  { id: 'pet_eenhoorn',cat:'pet', name: 'Eenhoorn',      price: 200, emoji: '🦄' },
  { id: 'pet_aap',    cat: 'pet', name: 'Aapje',         price: 60,  emoji: '🐒' },
  { id: 'pet_krab',   cat: 'pet', name: 'Krabbetje',     price: 45,  emoji: '🦀' },
  { id: 'pet_rendier',cat: 'pet', name: 'Rendiertje',    price: 70,  emoji: '🦌' },
  { id: 'pet_olifant',cat: 'pet', name: 'Olifantje',     price: 80,  emoji: '🐘' },
  { id: 'pet_octopus',cat: 'pet', name: 'Octopus',       price: 75,  emoji: '🐙' },
  { id: 'pet_otter',  cat: 'pet', name: 'Otter',         price: 65,  emoji: '🦦' },
  { id: 'pet_langnek',cat: 'pet', name: 'Langnek',       price: 90,  emoji: '🦕' },
  { id: 'pet_alien',  cat: 'pet', name: 'Ruimtevriendje', price: 110, emoji: '👽' },
  { id: 'pet_trex',   cat: 'pet', name: 'T-rex',         price: 150, emoji: '🦖' },
  { id: 'pet_draak',  cat: 'pet', name: 'Draakje',       price: 250, emoji: '🐉' },
  { id: 'pet_eend',   cat: 'pet', name: 'Eendje Kwak',   price: 15,  emoji: '🦆' },
  { id: 'pet_slak',   cat: 'pet', name: 'Slak Turbo',    price: 25,  emoji: '🐌' },
  { id: 'pet_kogelvis',cat:'pet', name: 'Kogelvis',      price: 45,  emoji: '🐡' },
  { id: 'pet_ufo',    cat: 'pet', name: 'Ufootje',       price: 90,  emoji: '🛸' },
  { id: 'pet_pauw',   cat: 'pet', name: 'Pauw',          price: 250, emoji: '🦚' },
  // Podium
  /* Een podium is waar ze op staat: de schijf onder haar voeten in de spiegel (en
     straks in de show). Wat hem tekent staat hier als gegevens en niet als
     plaatje: vloer = de vier kleuren van de schijf (bovenkant, midden, zijband,
     rand), patroon = één stil CSS-patroon erop (zie .podium in het stijlblad).
     bg en deco zijn de oude decorvlakken uit de winkel. Ze worden nergens meer
     getekend (zie applyStage); deco geeft alleen nog een emoji voor de naam.

     stage_disco is het PARELPODIUM: waar iedereen op staat die (nog) geen eigen
     podium heeft. Het id is gebleven (het staat in elke save), het uiterlijk niet:
     paarse stippen op paars verdwenen tegen de app, een wit podium leest overal
     als podium en laat elk wereldpodium ernaast meer opvallen.

     wereld + stukken: een WERELDPODIUM. Het hoort bij die wereld, en het is van
     jou als je de schat van die wereld hebt plus de twee stukken uit de winkel --
     afgeleid uit p.owned, nooit bewaard (zie "= Podia"). De twee stukken zitten
     nooit in de hoed-plek (daar zit de schat) en nooit samen in één plek, en een
     spulletje hoort bij hoogstens één podium. test:inhoud kijkt dat na.

     Een wereldpodium heet naar zijn wereld (Piratenpodium, niet Strandfeest). Dat
     waren de namen uit de oude winkel, en dan las een kind dat net de
     Piratenwereld uitspeelde "Strandfeest · Nog 2 stukken". De ids zijn gebleven,
     dus wie er een had, heeft hem nog. */
  { id: 'stage_disco',    cat: 'stage', name: 'Parelpodium', price: 0, bg: 'radial-gradient(circle at 30% 20%, #6a1b9a, #1a0533)', deco: ['🪩','✨','🎶'],
    vloer: ['#ffffff', '#cfc6ea', '#5b4b93', '#ffffff'], patroon: 'parel' },
  { id: 'stage_slaapkamer', cat: 'stage', name: 'Slaapkamershow', price: 20, bg: 'linear-gradient(#5c6bc0, #b39ddb)',                 deco: ['🛏️','🌙','🧸'],
    vloer: ['#9fa8da', '#5c6bc0', '#283171', '#ede7f6'], patroon: 'stippen' },
  { id: 'stage_strand',   cat: 'stage', name: 'Piratenpodium',     price: 60,  bg: 'linear-gradient(#4fc3f7 62%, #ffe082 62%)',            deco: ['🌴','🌞','🐚'],
    vloer: ['#ffe082', '#f9a825', '#7a4f00', '#4fc3f7'], patroon: 'zand', wereld: 'piraten', stukken: ['pet_papegaai', 'instr_accordeon'] },
  { id: 'stage_kasteel',  cat: 'stage', name: 'Toverpodium', price: 90, bg: 'linear-gradient(#b39ddb, #f48fb1)',                    deco: ['🏰','✨','👑'],
    vloer: ['#f8bbd0', '#b39ddb', '#5e3f8f', '#fff3c4'], patroon: 'ruit', wereld: 'tover', stukken: ['mic_toverstaf', 'dress_tover'] },
  { id: 'stage_ruimte',   cat: 'stage', name: 'Ruimtepodium',      price: 90,  bg: 'linear-gradient(#0d1b4c, #311b92)',                    deco: ['🪐','⭐','🚀'],
    vloer: ['#4a3bb5', '#241a6e', '#150d47', '#8fd3ff'], patroon: 'sterren', wereld: 'ruimte', stukken: ['pet_alien', 'dress_sterren'] },
  { id: 'stage_jungle',   cat: 'stage', name: 'Junglepodium',    price: 90,  bg: 'linear-gradient(#1b5e20, #66bb6a)',                    deco: ['🌿','🦜','🌺'],
    vloer: ['#81c784', '#2e7d32', '#123d16', '#c8e6c9'], patroon: 'blad', wereld: 'jungle', stukken: ['pet_aap', 'instr_drums'] },
  { id: 'stage_stadion',  cat: 'stage', name: 'Voetbalstadion',  price: 95,  bg: 'linear-gradient(#263238 34%, #43a047 34%)',            deco: ['⚽','🥅','📣'],
    vloer: ['#66bb6a', '#2e7d32', '#1b4d1f', '#ffffff'], patroon: 'gras' },
  { id: 'stage_winter',   cat: 'stage', name: 'IJspodium',price: 100, bg: 'linear-gradient(#81d4fa, #e1f5fe)',                    deco: ['❄️','⛄','✨'],
    vloer: ['#e1f5fe', '#81d4fa', '#2a6f97', '#ffffff'], patroon: 'sneeuw', wereld: 'ijs', stukken: ['pet_pinguin', 'hair_wit'] },
  { id: 'stage_onderwater',cat:'stage', name: 'Onderwaterpodium',  price: 110, bg: 'linear-gradient(#0277bd, #26c6da)',                    deco: ['🐠','🐳','💦'],
    vloer: ['#4dd0e1', '#0277bd', '#01406b', '#e0f7fa'], patroon: 'golf', wereld: 'onderwater', stukken: ['pet_dolfijn', 'dress_zeemeermin'] },
  { id: 'stage_regenboog',cat: 'stage', name: 'Snoeppodium',   price: 120, bg: 'linear-gradient(45deg, #ff9a9e, #fad0c4, #a1ffce, #a18cd1)', deco: ['🌈','☁️','🦋'],
    vloer: ['#fad0c4', '#a18cd1', '#5b3f8c', '#ffffff'], patroon: 'regenboog', wereld: 'snoep', stukken: ['mic_ijsje', 'dress_hartjes'] },
  { id: 'stage_arena',    cat: 'stage', name: 'Muziekpodium',     price: 130, bg: 'radial-gradient(circle at 50% 0%, #ffd54f, #6d4c41 75%)', deco: ['🏟️','🎇','🎆'],
    vloer: ['#ffd54f', '#a1662f', '#4e2c12', '#fff3c4'], patroon: 'vonk', wereld: 'muziek', stukken: ['instr_dj', 'dress_disco'] },
  { id: 'stage_vulkaan',  cat: 'stage', name: 'Vuurpodium',         price: 150, bg: 'linear-gradient(#3e2723, #bf360c 70%, #ff6f00)',       deco: ['🌋','🔥','🌫️'],
    vloer: ['#ff8a3d', '#bf360c', '#4e1604', '#ffd180'], patroon: 'lava', wereld: 'vuur', stukken: ['pet_draak', 'mic_vuur'] },
  { id: 'stage_circus',   cat: 'stage', name: 'Circuspodium',     price: 100, bg: 'linear-gradient(#b71c1c, #ef5350 60%, #fff59d)',       deco: ['🎪','🤹','🎈'],
    vloer: ['#ef5350', '#b71c1c', '#5a0b0b', '#fff59d'], patroon: 'circus', wereld: 'circus', stukken: ['pet_olifant', 'instr_toeter'] },
  { id: 'stage_dino',     cat: 'stage', name: 'Dinopodium',      price: 120, bg: 'linear-gradient(#33691e, #8bc34a 70%, #dce775)',       deco: ['🌋','🦴','🌿'],
    vloer: ['#a5d66f', '#558b2f', '#2b4a14', '#fff3c4'], patroon: 'vlek', wereld: 'dino', stukken: ['pet_trex', 'dress_groen'] },
];
const item = id => ITEMS.find(i => i.id === id);
// Vangnet voor een onbekend spullen-id (beschadigde back-up, handmatig bewerkt
// bestand). renderProfiles() draait meteen bij het opstarten, dus één rot id in
// één profiel maakte anders de héle app wit -- inclusief de weg naar
// "Back-up terugzetten", precies wat je dan nodig hebt.
const itemOr = (id, fallbackId) => item(id) || item(fallbackId);
// Namen komen sinds "maak je eigen ster" van de familie zelf en gaan door
// template-literals heen. Zonder ontsnapping breekt een naam met een " uit zijn
// attribuut (het naamveld toonde dan alleen het stuk vóór het aanhalingsteken)
// en rendert <b> als echte opmaak.
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* Enkelvoud of meervoud, op één plek. FASE 5D.1: het ouderdeel telt zes dingen
   ("5 shows gespeeld", "202 sommen gemaakt", "3 perfecte shows", ...) en die
   stonden allemaal in het meervoud -- dus las een kind dat net begonnen was
   "1 shows gespeeld". Het is één regel en geen taalbibliotheek: Nederlands
   gebruikt het enkelvoud alléén bij precies 1, óók bij 0 ("0 shows"). */
const mv = (n, enkel, meer) => (n === 1 ? enkel : meer);
// De volgorde is die van de pop, van top tot teen: haar, wat erop staat (de
// accessoires zijn bijna allemaal hoofddingen: kroon, strik, bloem, bril), de
// kleren, de schoenen. Dan wat ze vasthoudt, wie er naast haar staat, en als
// laatste -- in de balk, zie PODIA_CHIP -- de vloer onder haar voeten. Zo leest
// de balk onder de spiegel als de pop erboven. Eerst stond Kleren vooraan ("het
// is een kleedkamer"), en de rest in de volgorde waarin het ooit erbij kwam.
// De kleedkamer opent nog steeds in Kleren (shopCat); alleen de plek verschilt.
// Icoon en woord staan los: de balk toont alleen het icoon, het woord staat in
// het aria-label (zie renderShop).
const CATS = [
  { id: 'hair',  ico: '💇', name: 'Kapsels' },
  { id: 'acc',   ico: '🎀', name: 'Accessoires' },
  { id: 'dress', ico: '👕', name: 'Kleren' },
  { id: 'shoes', ico: '👟', name: 'Schoenen' },
  { id: 'mic',   ico: '🎤', name: 'Microfoons' },
  { id: 'instrument', ico: '🎸', name: 'Muziek' },
  { id: 'pet',   ico: '🐾', name: 'Dieren' },
  // 'stage' staat hier niet bij: Podia is een lade, maar geen kledingsoort. De
  // 🎲 (surpriseOutfit) loopt over deze rij, en die hoort haar niet van haar
  // podium af te halen. Podia staat wél als achtste lade in de balk (zie
  // renderShop), maar dan als PODIA_CHIP achter deze zeven.
];
/* Podia, de achtste lade in de balk onder de spiegel (zie renderShop).
   Een stand van de kleedkamer (shopCat) zoals elke categorie, en ook echt de
   categorie van zijn spulletjes: een podium is cat 'stage', en p.equipped.stage
   is waar ze op staat. */
const PODIA_CAT = 'stage';
const PODIA_CHIP = { ico: '🎪', name: 'Podia' };
/* Hier stonden acht tellers per categorie (catCount/instrCount/petCount en de vijf
   *_TOTAL-constanten). Ze bedienden de "koop alles uit deze categorie"-trofeeën,
   en die zijn in fase 5C met pensioen gegaan (zie RETIRED_TROPHIES). Sindsdien
   riep niets ze nog aan. Komt er ooit weer een vraag over één categorie, dan is
   dat één filter op p.owned en geen tabel die bijgehouden moet worden. */

/* ================= Werelden =================
   Een wereld is een stuk van de tournee: een vast aantal levels met een eigen
   sfeer. Meer niet -- de mechaniek (sterren, ontgrendelen, moeilijkheid) is in
   élke wereld gelijk en staat hier dus níét in. Zie docs/PROGRESSION-REVIEW.md.

   p.level blijft "de eerstvolgende show": 1 t/m WORLD_LAST + 1. Een wereld is puur
   een hergroepering van dat ene getal, dus er verhuist geen enkele opgeslagen ster.

   Maar p.level zegt ALLEEN waar de ster staat, en nooit wat er af is. Of een wereld
   uitgespeeld is leest de app uit p.stars (worldDone), en wat de volgende wereld is
   uit frontierWorld() -- niet uit een nummer. Zie de afgeleide voortgang onder
   worldProgress().

   LET OP -- de vololgorde en de lengtes liggen vast zodra een wereld eenmaal
   gespeeld is. Een wereld ertussen schuiven of korter maken hernummert alle
   levels erna, en dan verhuizen de sterren van een kind naar een andere wereld.
   Achteraan bijplakken mag altijd.

   ---- Een wereld erbij ----------------------------------------------------
   Eén regel in de lijst hieronder, en verder niets. Alles wat de app over een
   wereld weet leest ze hiervandaan:

     WORLD_START/LAST/AVAIL  rebuildWorldStarts() rekent de levelnummers opnieuw uit
     de kaart                worldFor() / worldForIndex() vinden de wereld bij een level
     de tekening             art  (ontbreekt die: de reservekaart met de kleuren hieronder)
     de sfeer                theme -> CSS-variabelen (applyWorldTheme), nooit een if per wereld
     de route                nodes/curve (ontbreken die: defaultNodes() slingert er een)
     de voortgang            worldDone()/frontierWorld() tellen hem vanzelf mee
     de tournee             reisPlaatsen() rijgt hem als bestemming aan de reis,
                             zodra hij binnen de horizon valt -- zie
                             laatsteZichtbareWereld(). Een wereld die verder weg
                             ligt bestaat wél, maar staat nog niet op het scherm en
                             haalt dus ook zijn tekening niet op.
     de zaal                 venue (ontbreekt die: VENUE_TERUGVAL, en dat is de stand
                             van nu -- geen enkele wereld hoeft hem op te geven)
     de beloning             beloning -> het id van een item uit ITEMS, dat je krijgt
                             zodra deze wereld uit is (fase 4D.1). Weglaten mag: dan
                             geeft die wereld geen spulletje.
     de perfecte wereld      niets -- rebuildWorldBadges() zet er vanzelf een trofee
                             bij, op het wereld-id. Overal drie sterren is de enige
                             voorwaarde en die is voor élke wereld gelijk. Er komt
                             géén tweede trofee voor "uitgespeeld": dat levert het
                             spulletje uit `beloning` op (zie fase 5C).

   Zoek dus niet naar een tweede plek -- die is er niet, en als je er ooit een
   nodig lijkt te hebben, hoort het veld hier en niet daar.

   ---- Een eigen zaaltekening voor een wereld ------------------------------
   Er is er nog geen; de zaal leent nu de wereldkaart zelf (zie VENUE_TERUGVAL).
   Komt die er wél, dan is dat één regel in de wereld hieronder:

     venue: { art: 'assets/bg/venue-ijs.webp', zoom: 100, focus: '50% 50%', blur: 0, dim: 1, op: 1 },

   Meer niet. Geen tweede pad, geen if, geen nieuw scherm: applyVenue hangt hem
   in dezelfde laag waar nu de geleende kaart hangt, en alles eromheen (het licht,
   de vloer, de bundel, de kop) blijft precies zoals het staat.

   released: false houdt een wereld uit het spel terwijl hij zíjn levelnummers al
   wel reserveert -- zie worldReleased(). Laat het veld gewoon weg voor een wereld
   die gespeeld mag worden.

   Let op dat "geschreven", "uitgebracht" en "te zien" drie verschillende dingen
   zijn, en dat een wereld hier staan dus niet betekent dat een kind hem ziet:

     geschreven    hij staat in deze lijst
     uitgebracht   hij mag gespeeld worden      (released, zie worldReleased)
     te zien       hij staat op de reis         (zie laatsteZichtbareWereld)

   Een wereld kan geschreven zijn en niet uitgebracht (klaar voor later), en hij
   kan uitgebracht zijn en toch nog niet te zien (te ver vooruit). Alle drie zijn
   afgeleid; er wordt er geen van bewaard.

   Velden die er nog NIET zijn omdat de app ze nog niet nodig heeft:
   wereld-outfit, ontgrendel-voorwaarde. Ontgrendelen loopt nog steeds via p.level
   (een halte is speelbaar t/m p.level, en werelden staan op een rij), en dat is
   precies genoeg. Komen die dingen er, dan komen ze hier als veld bij -- niet als
   uitzondering ergens in een scherm.

   (beloning stond in dat rijtje tot fase 4D.1; nu is het gewoon een veld.) */
/* WERELDEN-BEGIN -- alles tussen deze twee markeringen wordt letterlijk vervangen
   door de wereldstudio (Opslaan in het project, via npm run studio).
   Met de hand bijwerken mag gewoon; houd de markeringen dan wel staan.

   Over de vier kleuren per wereld: zolang er geen tekening is, ís dit de wereld.
   Zonder deze regels vallen alle zes terug op dezelfde standaardpaars en verschilt
   er niets dan de naam in de pil -- dan is "een andere wereld" een woord en geen
   plek.

   Ze staan in hex en niet in rgba, en dat is geen smaak: de studio bewerkt ze met
   <input type="color">, en dat veld kent alleen #rrggbb. Een rgba-waarde komt daar
   terug als #000000 en wordt bij de eerste de beste wijziging stilletjes weggeschreven.
   De standaarden in de CSS zijn wél doorzichtig (weg op 42%, gloed op 34%), dus deze
   waarden zijn uitgerekend zoals die standaarden erúitzien nadat ze over de
   achtergrond zijn gelegd -- vandaar dat 'weg' een gedempte tint is en geen wit.

   lucht/diepte = het verloop van boven naar beneden, gloed = de veeg onderaan,
   weg = de nog niet afgelegde stippellijn (de afgelegde is altijd goud).

   Over venue.dim (hoe donker het achter de show wordt; zonder geldt
   VENUE_TERUGVAL). Drie werelden wijken af, en waarom:
     snoep  .56  bijna wit getekend: een tandje donkerder, anders praat de zaal
                 mee met de som
     ijs    .54  sneeuw en ijs: de lichtste tekening van alle zes
     tover  .82  een nachttekening: die hoeft niet nóg donkerder gemaakt te worden
   Die uitleg staat hier en niet bij de wereld zelf: alles tussen de markeringen
   schrijft de studio opnieuw uit de gegevens, en commentaar daarbinnen overleeft
   de eerste keer opslaan niet (zie zaak K in test/hub.test.js). */
const WORLDS = [
  {
    id: 'muziek', name: 'Muziekwereld', icon: '🎵', levels: 8,
    beloning: 'acc_wereld_muziek',
    art: 'assets/world/muziek-map.webp',
    feest: ['🎵', '🎶', '🎸', '🥁', '🎺'],
    theme: { road: '#9a86bd', sky: '#3a1f6e', deep: '#170a35', glow: '#7a2f63' },
    nodes: [
      { x: 23.4, y: 79.3 },
      { x: 37.1, y: 69.2 },
      { x: 60.1, y: 62.0 },
      { x: 30.9, y: 56.3 },
      { x: 43.6, y: 41.6 },
      { x: 62.9, y: 38.0 },
      { x: 52.1, y: 29.6 },
      { x: 68.2, y: 21.9 },
    ],
    curve: [
      { x: 26.9, y: 71.6 },
      { x: 46.0, y: 65.1 },
      { x: 49.7, y: 58.7 },
      { x: 23.7, y: 51.2 },
      { x: 46.8, y: 41.2 },
      { x: 69.2, y: 34.1 },
      { x: 60.9, y: 25.7 },
    ],
  },
  {
    id: 'snoep', name: 'Snoepwereld', icon: '🍭', levels: 8,
    beloning: 'acc_wereld_snoep',
    art: 'assets/world/snoep-map.webp',
    feest: ['🍭', '🍬', '🧁', '🍩', '🍫'],
    venue: { dim: .56 },
    theme: { sky: '#a03566', deep: '#40122a', glow: '#c05b7a', road: '#9fd8c3' },
    nodes: [
      { x: 51.6, y: 75.1 },
      { x: 77.2, y: 69.1 },
      { x: 61.9, y: 62.1 },
      { x: 56.3, y: 51.5 },
      { x: 31.7, y: 47.8 },
      { x: 50.8, y: 41.9 },
      { x: 65.3, y: 33.9 },
      { x: 75.6, y: 25.4 },
    ],
    curve: [
      { x: 64.1, y: 71.2 },
      { x: 71.0, y: 64.7 },
      { x: 79.6, y: 57.8 },
      { x: 40.8, y: 49.1 },
      { x: 43.8, y: 44.9 },
      { x: 62.7, y: 40.4 },
      { x: 75.8, y: 31.1 },
    ],
  },
  {
    id: 'jungle', name: 'Junglewereld', icon: '🌴', levels: 8,
    beloning: 'acc_wereld_jungle',
    art: 'assets/world/jungle-map.webp',
    feest: ['🌴', '🐒', '🦜', '🍌', '🌺'],
    theme: { sky: '#235640', deep: '#0c2a1d', glow: '#4a6b33', road: '#a8bf93' },
    nodes: [
      { x: 29.1, y: 70.5 },
      { x: 67.6, y: 76.8 },
      { x: 70.6, y: 61.9 },
      { x: 49.0, y: 55.8 },
      { x: 73.8, y: 48.6 },
      { x: 25.1, y: 48.4 },
      { x: 63.6, y: 35.6 },
      { x: 76.4, y: 20.7 },
    ],
    curve: [
      { x: 43.4, y: 74.6 },
      { x: 79.9, y: 73.1 },
      { x: 60.9, y: 57.0 },
      { x: 60.3, y: 51.3 },
      { x: 45.2, y: 48.2 },
      { x: 33.9, y: 43.1 },
      { x: 43.4, y: 30.3 },
    ],
  },
  {
    id: 'piraten', name: 'Piratenwereld', icon: '🏴‍☠️', levels: 8,
    beloning: 'acc_wereld_piraten',
    art: 'assets/world/piraten-map.webp',
    feest: ['🏴‍☠️', '🦜', '💰', '⚓', '🗺️'],
    theme: { sky: '#13415c', deep: '#05141f', glow: '#2a5f72', road: '#c9a878' },
    nodes: [
      { x: 29.7, y: 75.1 },
      { x: 77.4, y: 76.6 },
      { x: 55.1, y: 67.3 },
      { x: 34.9, y: 60.1 },
      { x: 52.2, y: 48.7 },
      { x: 74.6, y: 42.6 },
      { x: 50.2, y: 29.3 },
      { x: 72.4, y: 21.3 },
    ],
    curve: [
      { x: 60.3, y: 81.2 },
      { x: 72.8, y: 71.5 },
      { x: 45.4, y: 65.1 },
      { x: 41.0, y: 52.4 },
      { x: 44.0, y: 40.7 },
      { x: 51.8, y: 35.2 },
      { x: 69.0, y: 29.8 },
    ],
  },
  {
    id: 'ijs', name: 'IJswereld', icon: '❄️', levels: 8,
    beloning: 'acc_wereld_ijs',
    art: 'assets/world/ijs-map.webp',
    feest: ['❄️', '⛄', '🧊', '🐧'],
    venue: { dim: .54 },
    theme: { sky: '#34709c', deep: '#102c4a', glow: '#4b93a8', road: '#bcdcee' },
    nodes: [
      { x: 71.8, y: 78.7 },
      { x: 55.3, y: 68.4 },
      { x: 37.1, y: 64.4 },
      { x: 44.0, y: 55.2 },
      { x: 69.4, y: 48.3 },
      { x: 51.6, y: 42.2 },
      { x: 67.8, y: 32.7 },
      { x: 74.2, y: 24.4 },
    ],
    curve: [
      { x: 60.7, y: 74.5 },
      { x: 45.8, y: 68.0 },
      { x: 28.7, y: 60.8 },
      { x: 58.7, y: 52.3 },
      { x: 60.1, y: 44.6 },
      { x: 63.5, y: 37.8 },
      { x: 55.3, y: 29.3 },
    ],
  },
  {
    id: 'tover', name: 'Toverwereld', icon: '🪄', levels: 8,
    beloning: 'acc_wereld_tover',
    art: 'assets/world/tover-map.webp',
    feest: ['🪄', '🔮', '🦄', '🌙', '🧚'],
    venue: { dim: .82 },
    theme: { road: '#9f96d6', sky: '#1b1040', deep: '#05020f', glow: '#3d2a7a' },
    nodes: [
      { x: 26.3, y: 72.8 },
      { x: 47.4, y: 64.1 },
      { x: 74.8, y: 75.8 },
      { x: 70.2, y: 57.0 },
      { x: 27.7, y: 46.4 },
      { x: 71.8, y: 36.2 },
      { x: 39.0, y: 27.6 },
      { x: 74.4, y: 22.9 },
    ],
    curve: [
      { x: 34.5, y: 65.7 },
      { x: 65.7, y: 69.2 },
      { x: 77.0, y: 64.8 },
      { x: 44.0, y: 49.6 },
      { x: 52.2, y: 39.9 },
      { x: 57.3, y: 32.5 },
      { x: 47.0, y: 20.9 },
    ],
  },
  {
    id: 'circus', name: 'Circuswereld', icon: '🎪', levels: 8,
    beloning: 'acc_wereld_circus',
    art: 'assets/world/circus-map.webp',
    feest: ['🎈', '🤹', '🎪', '🤡', '🎠'],
    schat: {
      naam: 'Circushoedje', emoji: '🎪', view: '69.8 0 60.3 46',
      svg: '<g transform="translate(0 0.5) scale(1)"><g transform="translate(3.85 3.12) scale(0.9615)"><g transform="translate(4 -10.32) scale(0.96)"><g stroke-linejoin="round" stroke-linecap="round"><path d="M79 48 Q84 31 92 23 Q100 14 108 23 Q116 31 121 48 Z" fill="#fff1cf" stroke="#34291e" stroke-width="2.2"/><path d="M86 48 Q88.5 33 92 27 Q94 24 96 22 L96 48 Z" fill="#d95b43" stroke="#34291e" stroke-width="2"/><path d="M96 48 L96 22 Q98 18.5 100 17 Q102 18.5 104 22 L104 48 Z" fill="#625185" stroke="#34291e" stroke-width="2"/><path d="M104 48 L104 22 Q106 24 108 27 Q111.5 33 114 48 Z" fill="#d95b43" stroke="#34291e" stroke-width="2"/><rect x="74" y="45" width="52" height="8" rx="4" fill="#f3c14b" stroke="#34291e" stroke-width="2"/><polygon points="84,45 90,51 96,45" fill="#d95b43" stroke="#34291e" stroke-width="1.3"/><polygon points="96,45 102,51 108,45" fill="#625185" stroke="#34291e" stroke-width="1.3"/><polygon points="108,45 114,51 120,45" fill="#d95b43" stroke="#34291e" stroke-width="1.3"/><line x1="100" y1="17" x2="100" y2="9" stroke="#34291e" stroke-width="2"/><polygon points="100,10 111,13 100,17" fill="#ff6f61" stroke="#34291e" stroke-width="2"/><circle cx="75" cy="49" r="5.5" fill="#8c6321" stroke="#34291e" stroke-width="2"/><circle cx="125" cy="49" r="5.5" fill="#8c6321" stroke="#34291e" stroke-width="2"/><polygon points="100,41.8 101.9,45 105.5,45.6 103,48 103.6,51.5 100,49.6 96.4,51.5 97,48 94.5,45.6 98.1,45" fill="#fff6c8" stroke="#34291e" stroke-width="1.3"/></g></g></g></g>',
    },
    theme: { road: '#dbd0bd', sky: '#625185', deep: '#180c31', glow: '#8c6321' },
    nodes: [
      { x: 54.2, y: 76.5 },
      { x: 32.6, y: 70.5 },
      { x: 75.3, y: 64.8 },
      { x: 29.8, y: 53.6 },
      { x: 77.1, y: 48.5 },
      { x: 52.2, y: 43.6 },
      { x: 65.9, y: 34.9 },
      { x: 75.6, y: 27.3 },
    ],
    curve: [
      { x: 44.5, y: 78.0 },
      { x: 59.3, y: 69.2 },
      { x: 48.6, y: 59.8 },
      { x: 48.6, y: 48.2 },
      { x: 64.4, y: 46.1 },
      { x: 74.8, y: 38.5 },
      { x: 77.1, y: 32.3 },
    ],
  },
  {
    id: 'onderwater', name: 'Onderwaterwereld', icon: '🪸', levels: 8,
    beloning: 'acc_wereld_onderwater',
    art: 'assets/world/onderwater-map.webp',
    feest: ['🐠', '🐙', '🐚', '🐬', '🦀'],
    schat: {
      naam: 'Zeeparelkroon', emoji: '🫧', view: '67.1 1.5 65.7 46',
      svg: '<g transform="translate(-1.2 -10.67) scale(1.012)"><g stroke-linejoin="round" stroke-linecap="round"><path d="M87 41 Q77 35 81 24 Q91 27 92 39 Z" fill="#738c21" stroke="#2a1f33" stroke-width="2"/><path d="M113 41 Q123 35 119 24 Q109 27 108 39 Z" fill="#738c21" stroke="#2a1f33" stroke-width="2"/><circle cx="74" cy="51" r="4.5" fill="#7fd6e8" stroke="#2a1f33" stroke-width="2"/><circle cx="82" cy="46" r="4.7" fill="#7fd6e8" stroke="#2a1f33" stroke-width="2"/><circle cx="90" cy="42.5" r="5" fill="#7fd6e8" stroke="#2a1f33" stroke-width="2"/><circle cx="100" cy="40.5" r="5.2" fill="#7fd6e8" stroke="#2a1f33" stroke-width="2"/><circle cx="110" cy="42.5" r="5" fill="#7fd6e8" stroke="#2a1f33" stroke-width="2"/><circle cx="118" cy="46" r="4.7" fill="#7fd6e8" stroke="#2a1f33" stroke-width="2"/><circle cx="126" cy="51" r="4.5" fill="#7fd6e8" stroke="#2a1f33" stroke-width="2"/><path d="M84 42 Q85 27 91 20 Q96 14 100 14 Q104 14 109 20 Q115 27 116 42 Q108 37 100 36 Q92 37 84 42 Z" fill="#bfefff" stroke="#2a1f33" stroke-width="2"/><line x1="100" y1="18" x2="100" y2="37" stroke="#2191b5" stroke-width="1.6"/><line x1="94" y1="20.5" x2="97" y2="37.5" stroke="#2191b5" stroke-width="1.6"/><line x1="106" y1="20.5" x2="103" y2="37.5" stroke="#2191b5" stroke-width="1.6"/><line x1="89" y1="26.5" x2="94" y2="39.5" stroke="#2191b5" stroke-width="1.6"/><line x1="111" y1="26.5" x2="106" y2="39.5" stroke="#2191b5" stroke-width="1.6"/><circle cx="100" cy="41" r="4.5" fill="#fff6cf" stroke="#2a1f33" stroke-width="1.8"/><circle cx="79" cy="27" r="4.1" fill="#d8f8ff" stroke="#2a1f33" stroke-width="1.8"/><circle cx="72.5" cy="19" r="2.6" fill="#d8f8ff" stroke="#2a1f33" stroke-width="1.3"/><circle cx="121" cy="27" r="4.1" fill="#d8f8ff" stroke="#2a1f33" stroke-width="1.8"/><circle cx="127.5" cy="19" r="2.6" fill="#d8f8ff" stroke="#2a1f33" stroke-width="1.3"/></g></g>',
    },
    theme: { road: '#d4dbbd', sky: '#2191b5', deep: '#0c2831', glow: '#738c21' },
    nodes: [
      { x: 28.4, y: 75.3 },
      { x: 56.1, y: 76.5 },
      { x: 74.2, y: 60.8 },
      { x: 47.7, y: 58.8 },
      { x: 22.0, y: 47.8 },
      { x: 47.5, y: 38.9 },
      { x: 80.5, y: 33.6 },
      { x: 77.2, y: 23.6 },
    ],
    curve: [
      { x: 39.8, y: 80.4 },
      { x: 74.9, y: 73.8 },
      { x: 62.0, y: 59.7 },
      { x: 35.8, y: 51.8 },
      { x: 32.7, y: 41.5 },
      { x: 68.6, y: 38.8 },
      { x: 66.0, y: 29.8 },
    ],
  },
  {
    id: 'ruimte', name: 'Ruimtewereld', icon: '🪐', levels: 8,
    beloning: 'acc_wereld_ruimte',
    art: 'assets/world/ruimte-map.webp',
    feest: ['🪐', '🚀', '🌙', '👽', '☄️'],
    schat: {
      naam: 'Ufohoedje', emoji: '🛸', view: '72.2 -1 55.7 46',
      svg: '<g transform="translate(0 -2) scale(1)"><g transform="translate(19.23 -1.85) scale(0.8077)"><g stroke-linejoin="round" stroke-linecap="round"><line x1="100" y1="13" x2="100" y2="19" stroke="#221c36" stroke-width="2"/><circle cx="100" cy="10" r="4" fill="#ffd54f" stroke="#221c36" stroke-width="2"/><ellipse cx="100" cy="37" rx="30" ry="9" fill="#cfd9ff" stroke="#221c36" stroke-width="2.4"/><path d="M82 37 Q100 30 118 37" fill="none" stroke="#ffffff" stroke-width="1.6"/><path d="M86 37 Q86 25 100 20 Q114 25 114 37 L114 42 Q100 46 86 42 Z" fill="#7fe7ff" stroke="#221c36" stroke-width="2.4"/><ellipse cx="100" cy="31" rx="8" ry="5.5" fill="#21558c" stroke="#221c36" stroke-width="1.8"/><circle cx="100" cy="31" r="2.2" fill="#8adfff"/><path d="M68 42 Q100 58 132 42 L125 52 Q100 59 75 52 Z" fill="#6d5bd0" stroke="#221c36" stroke-width="2.5"/><path d="M78 45 Q100 54 122 45" fill="none" stroke="#9f90f0" stroke-width="2"/><circle cx="82" cy="51" r="4" fill="#ffd54f" stroke="#221c36" stroke-width="1.8"/><circle cx="94" cy="54" r="4" fill="#ffd54f" stroke="#221c36" stroke-width="1.8"/><circle cx="106" cy="54" r="4" fill="#ffd54f" stroke="#221c36" stroke-width="1.8"/><circle cx="118" cy="51" r="4" fill="#ffd54f" stroke="#221c36" stroke-width="1.8"/><circle cx="77" cy="24" r="3.2" fill="#fff1a8" stroke="#21558c" stroke-width="1.4"/><circle cx="123" cy="20" r="2.6" fill="#fff1a8" stroke="#21558c" stroke-width="1.2"/></g></g></g>',
    },
    theme: { road: '#ecf0f3', sky: '#333177', deep: '#0d0c31', glow: '#21558c' },
    nodes: [
      { x: 36.8, y: 67.2 },
      { x: 68.3, y: 77.4 },
      { x: 68.6, y: 61.1 },
      { x: 71.1, y: 37.8 },
      { x: 59.9, y: 47.4 },
      { x: 24.1, y: 49.8 },
      { x: 59.4, y: 26.6 },
      { x: 71.9, y: 18.6 },
    ],
    curve: [
      { x: 49.2, y: 75.0 },
      { x: 65.8, y: 69.4 },
      { x: 75.4, y: 50.9 },
      { x: 66.0, y: 43.5 },
      { x: 39.8, y: 53.6 },
      { x: 42.1, y: 36.8 },
      { x: 80.0, y: 25.6 },
    ],
  },
  {
    id: 'dino', name: 'Dinowereld', icon: '🦖', levels: 8,
    beloning: 'acc_wereld_dino',
    art: 'assets/world/dino-map.webp',
    feest: ['🦕', '🦖', '🥚', '🌿', '🦴'],
    schat: {
      naam: 'Dinohoedje', emoji: '🦕', view: '64.5 5.5 70.9 46',
      svg: '<g transform="translate(12.39 -0.37) scale(0.875)"><g stroke-linejoin="round" stroke-linecap="round"><path d="M78 51 Q65 51 64 41 Q58 34 69 27 Q66 18 78 18 Q84 10 93 15 Q100 9 107 15 Q118 11 123 20 Q135 19 132 28 Q143 35 135 43 Q133 51 122 51 Z" fill="#a1b94b" stroke="#35452b" stroke-width="2.5"/><path d="M80 32 Q75 20 82 9 Q91 19 91 33 Z" fill="#fff0c5" stroke="#35452b" stroke-width="2.2"/><path d="M109 33 Q109 19 118 9 Q125 20 120 32 Z" fill="#fff0c5" stroke="#35452b" stroke-width="2.2"/><path d="M81 49 Q76 37 86 29 Q100 21 114 29 Q124 37 119 49 Q115 57 100 57 Q85 57 81 49 Z" fill="#72bd75" stroke="#35452b" stroke-width="2.5"/><path d="M84 33 Q100 22 116 33" fill="none" stroke="#a8df83" stroke-width="3"/><ellipse cx="89.5" cy="41" rx="3.5" ry="4" fill="#253a2c"/><ellipse cx="110.5" cy="41" rx="3.5" ry="4" fill="#253a2c"/><circle cx="90.4" cy="39.8" r="1.15" fill="#ffffff"/><circle cx="111.4" cy="39.8" r="1.15" fill="#ffffff"/><path d="M95 47 Q96 39 100 34 Q104 39 105 47 Q100 50 95 47 Z" fill="#fff0c5" stroke="#35452b" stroke-width="2"/><circle cx="90" cy="50" r="2.2" fill="#4c8d57"/><circle cx="110" cy="50" r="2.2" fill="#4c8d57"/><circle cx="71" cy="36" r="4" fill="#e4c95e" stroke="#35452b" stroke-width="1.5"/><circle cx="129" cy="36" r="4" fill="#e4c95e" stroke="#35452b" stroke-width="1.5"/><circle cx="76" cy="27" r="2.6" fill="#e4c95e"/><circle cx="124" cy="27" r="2.6" fill="#e4c95e"/></g></g>',
    },
    theme: { road: '#f3f2ec', sky: '#8a4c57', deep: '#310c13', glow: '#8c8221' },
    nodes: [
      { x: 31.4, y: 79.3 },
      { x: 61.2, y: 70.7 },
      { x: 79.0, y: 63.1 },
      { x: 33.7, y: 52.6 },
      { x: 39.8, y: 43.1 },
      { x: 74.9, y: 34.9 },
      { x: 52.3, y: 29.0 },
      { x: 74.9, y: 20.6 },
    ],
    curve: [
      { x: 51.5, y: 79.7 },
      { x: 69.6, y: 66.1 },
      { x: 58.9, y: 55.8 },
      { x: 54.8, y: 46.4 },
      { x: 61.7, y: 40.1 },
      { x: 64.5, y: 32.5 },
      { x: 70.1, y: 27.0 },
    ],
  },
  {
    id: 'vuur', name: 'Vuurwereld', icon: '🌋', levels: 8,
    beloning: 'acc_wereld_vuur',
    art: 'assets/world/vuur-map.webp',
    feest: ['🔥', '🌋', '🐉', '🌶️'],
    schat: {
      naam: 'Vuurkroon', emoji: '🔥', view: '69.4 6 61.2 46',
      svg: '<g transform="translate(9.52 0.04) scale(0.8842)"><g stroke-linejoin="round" stroke-linecap="round"><path d="M74 49 Q65 40 77 28 Q75 39 85 39 Q78 28 92 18 Q89 29 98 32 Q94 19 108 9 Q104 26 115 32 Q120 25 119 18 Q132 31 122 41 Q131 40 130 31 Q141 46 126 51 Q101 57 76 51 Z" fill="#f4511e" stroke="#5b261b" stroke-width="2.5"/><path d="M85 49 Q79 40 93 30 Q90 39 99 39 Q96 29 108 20 Q104 34 115 39 Q121 47 112 51 Q99 55 85 49 Z" fill="#ffb629" stroke="#9d3516" stroke-width="2"/><path d="M95 49 Q92 44 101 37 Q100 43 105 44 Q109 41 110 47 Q108 52 100 52 Q96 52 95 49 Z" fill="#fff0a3"/><path d="M73 47 Q100 53 127 47 L130 53 Q100 60 70 53 Z" fill="#44343a" stroke="#351911" stroke-width="2.5"/><path d="M78 50 Q89 54 97 51 L104 55 L112 51 Q119 53 123 50" fill="none" stroke="#ff8c32" stroke-width="2.7"/><path d="M97 48 L103 48 L106 52 L100 55 L94 52 Z" fill="#ffd54f" stroke="#5b261b" stroke-width="1.5"/><circle cx="79" cy="51" r="2" fill="#ffb629"/><circle cx="121" cy="51" r="2" fill="#ffb629"/></g></g>',
    },
    theme: { road: '#dbd0bd', sky: '#8a4c66', deep: '#310c1c', glow: '#8c6521' },
    nodes: [
      { x: 28.1, y: 79.3 },
      { x: 56.6, y: 74.4 },
      { x: 72.4, y: 67.5 },
      { x: 31.2, y: 58.8 },
      { x: 52.5, y: 52.9 },
      { x: 78.5, y: 44.2 },
      { x: 52.3, y: 36.6 },
      { x: 73.7, y: 23.3 },
    ],
    curve: [
      { x: 43.6, y: 77.1 },
      { x: 77.7, y: 80.5 },
      { x: 50.0, y: 62.7 },
      { x: 42.1, y: 53.9 },
      { x: 64.8, y: 50.8 },
      { x: 63.7, y: 40.2 },
      { x: 73.7, y: 31.5 },
    ],
  },
];
/* WERELDEN-EINDE */

/* SCHERMKUNST-BEGIN -- alles tussen deze twee markeringen wordt letterlijk vervangen
   door de Dev Studio (zie /schermkunst in test/preview.js). Zelfde afspraak als het
   WORLDS-blok hierboven: de toelichting blijft staan, de regel eronder niet.

   Waar dit over gaat: de kleedkamer en de trofeeënkast lenen vandaag de gedeelde
   schil. Krijgt er een een eigen tekening, dan komt het pad hier te staan -- en
   niet in een lijstje dat alleen de studio kent. Dit is wat de app leest, dus wat
   je in de studio ziet is wat er straks op een telefoon staat.

   null betekent: geen eigen tekening, laat de schil met rust. Dat is geen
   ontbrekend bestand maar een geldige stand, en verreweg de gewoonste. */
const SCHERMKUNST = {
  dress: null,
  tro: null,
};
/* SCHERMKUNST-EINDE */
/* ---- Uitgebracht, en waar de tournee ophoudt --------------------------------
   FASE 4A. Hiervoor stond hier een ENDLESS_WORLD: voorbij de laatste geschreven
   wereld liep de tournee door in stukken van acht onder de naam "Sterrentournee".
   Dat leek onschuldig -- het spel was nooit "uit" -- maar het bezétte levelnummers
   die een échte wereld later zou opeisen. Wie in die staart speelde zette sterren
   op level 49..56, en de dag dat wereld 7 erbij kwam stonden die sterren ineens
   ín wereld 7: een gloednieuwe wereld die zich bij het eerste openen al uitgespeeld
   waande. Dat is precies de bug die deze fase wegneemt.

   Nu loopt de tournee tot en met de laatste uitgebrachte wereld en geen level
   verder. Is alles uit, dan is er geen volgende halte maar een toegift: dezelfde
   laatste wereld, opnieuw te spelen, zonder dat er ook maar iets vooruit schuift.
   Zie de afgeleide voortgang onder worldProgress().

   released: false op een wereld houdt hem uit het spel terwijl hij wél zijn
   levelnummers reserveert -- zo kan er een wereld klaarstaan zonder dat een kind
   erin kan komen, en zonder dat hij ooit iets hernummert. Eén veld, meer niet;
   geen datums, geen server, geen planning. Weglaten = uitgebracht.

   Alleen een aaneengesloten kop van de lijst telt als uitgebracht: staat wereld 7
   op released:false, dan is wereld 8 óók niet beschikbaar, ook al zegt hij niets.
   Anders zou er een gat in de tournee vallen en is "de eerste wereld die nog niet
   uit is" geen ladder meer maar een gok. */
function worldReleased(w) { return !!w && w.released !== false; }
/* Alleen in de studio (?debug&mapedit, of ?debug&onuitgebracht): speel ook de
   werelden die nog niet uitgebracht zijn. Een nieuwe wereld begint in de studio
   op released:false -- zo kan hij veilig mee naar main zonder dat een kind hem
   ziet -- en dan moet je hem wél kunnen proberen. Dat gebeurt hier en nergens
   anders: rebuildWorldStarts telt hem mee als speelbaar, en worldReleased blijft
   zeggen wat er in WORLDS staat. Het staat in het geheugen van één pagina en
   wordt nooit bewaard; het gewone spel kent de vlag niet.

   Moet hier staan en niet bij de debugvlaggen onderaan: rebuildWorldStarts()
   draait hieronder al bij het opstarten, en een `let` die dan nog niet gelezen
   is geeft een lege pagina (zie regel 0 in CLAUDE.md). */
let PROEF_ONUITGEBRACHT = false;
/* Eerste level van elke wereld (1-gebaseerd), over ÁLLE geschreven werelden --
   ook de nog niet uitgebrachte. Dat is met opzet: een wereld die later opengaat
   hoort dezelfde levelnummers te krijgen als hij vandaag al zou hebben, anders
   verhuizen bij het uitbrengen alsnog de sterren van een kind.

   WORLD_AVAIL  hoeveel werelden er nú speelbaar zijn (de aaneengesloten kop)
   WORLD_LAST   het laatste level dat bestaat -- het einde van die laatste wereld.
                Voorbij dit nummer is er geen show, alleen een toegift. */
let WORLD_START = [], WORLD_LAST = 0, WORLD_AVAIL = 0;
function rebuildWorldStarts() {
  let n = 1;
  WORLD_START = WORLDS.map(w => { const s = n; n += w.levels; return s; });
  WORLD_AVAIL = 0;
  while (WORLD_AVAIL < WORLDS.length
    && (PROEF_ONUITGEBRACHT || worldReleased(WORLDS[WORLD_AVAIL]))) WORLD_AVAIL++;
  // Staat er niets uitgebracht (alleen mogelijk in de wereldstudio), dan is de
  // eerste wereld alsnog speelbaar: een kaart zonder enkele halte is geen spel.
  if (!WORLD_AVAIL && WORLDS.length) WORLD_AVAIL = 1;
  WORLD_LAST = WORLD_AVAIL ? WORLD_START[WORLD_AVAIL - 1] + WORLDS[WORLD_AVAIL - 1].levels - 1 : 0;
}
rebuildWorldStarts();
// de schatten die de studio tekende, als spulletje in ITEMS (zie schatItem)
rebuildWereldschatten();
/* Het laatste level dat bestond op de dag dat de oneindige staart verdween (zes
   werelden van acht). Een historisch getal: het hoort bij één eenmalige opruiming
   in migrate() en mag daarom nooit meelopen met WORLD_LAST. Zie daar. */
const LEGACY_TOUR_END = 48;

/* ---- Wereldconcept: bewaren, uitwisselen, wegschrijven -----------------------
   Een concept leeft in localStorage en wordt ALLEEN met ?debug ingelezen. Het
   gewone spel draait dus altijd op wat er in WORLDS staat -- een half afgemaakte
   wereld kan nooit bij een kind terechtkomen.

   Van concept naar spel gaan kan op twee manieren:
     Opslaan   (in het project) stuurt het concept naar de studioserver, die het
               met deze code op het spel van nu legt, keurt (wereldControle) en
               het blok tussen WERELDEN-BEGIN/EINDE in src/ schrijft. Werkt
               alleen via `npm run studio`; daarna vastleggen en publiceren.
     Kopieer   geeft het blok als tekst, om zelf te plakken. Werkt overal, ook op
               een telefoon en over file://.                                   */
const WORLD_DRAFT_KEY = 'rekenPopsterren_wereldconcept';
/* Waar het concept op gebouwd is: WORLDS zoals index.html het had op het moment
   dat het concept voor het laatst bewaard werd. Een aparte sleutel, zodat de
   vorm van het concept zelf (een gewone lijst werelden) niet verandert.

   Waarom dit nodig is. Een concept leeft in localStorage, en dat overleeft een
   `git pull`, een wissel van tak en een week vakantie. Het werd daarna blind over
   WORLDS gelegd -- in élke pagina met ?debug, ook in de Testomgeving -- en dan
   keek je naar de kleuren van vorige week in plaats van naar wat er nu in het spel
   staat. Erger: "Opslaan" schreef dat oude blok terug en draaide zo andermans
   wijziging aan een wereld ongemerkt terug. Met de basis erbij weet het concept
   welke werelden jíj veranderd hebt, en alleen die gaan over het spel heen. */
const WORLD_DRAFT_BASIS_KEY = 'rekenPopsterren_wereldconcept_basis';
/* Wat loadWorldDraft vond, voor de studio om te melden: welke werelden van jou
   zijn, of het concept op een oudere versie gebouwd was, en welke werelden
   intussen óók in het spel veranderd zijn (die moet je nakijken). null = geen
   concept. */
let WORLD_DRAFT_INFO = null;
/* Wat er ín het spel staat, zoals het uit index.html kwam -- vastgelegd vóór een
   concept eroverheen gaat. Daarmee kan de studio laten zien wat er nog niet
   doorgevoerd is, en een wereld terugdraaien naar de versie die kinderen spelen. */
const WORLDS_SHIPPED = JSON.parse(JSON.stringify(WORLDS));
/* Gelijk is gelijk, ongeacht de volgorde van de sleutels. De studio bouwt theme
   opnieuw op in haar eigen volgorde (weg, lucht, diepte, gloed); met een kale
   JSON.stringify bleef een wereld daarna voor altijd "gewijzigd", ook als je elke
   kleur had teruggezet. */
function vasteVorm(v) {
  return JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x))
    ? Object.keys(x).sort().reduce((o, s) => { o[s] = x[s]; return o; }, {}) : x);
}
function sameWorld(a, b) { return vasteVorm(a) === vasteVorm(b); }

function applyWorldDraft(list) {
  WORLDS.length = 0;
  list.forEach(w => WORLDS.push(w));
  rebuildWorldStarts();
  if (typeof rebuildWorldBadges === 'function') rebuildWorldBadges();
  rebuildWereldschatten();
}
/* Een concept op het spel van nu leggen, en niet op het spel van toen.

   De identiteit van een wereld is haar PLEK, niet haar id: levels lopen door de
   lijst heen, dus een wereld verplaatsen is toch al verboden (zie wereldControle),
   en een id mag in de studio hernoemd worden. Dus:
     - een wereld die in het concept gelijk is aan de basis heb jij niet
       aangeraakt -- dan geldt wat er nú in het spel staat;
     - een wereld die afwijkt van de basis is van jou, en die gaat eroverheen. Is
       hij intussen óók in het spel veranderd, dan is dat een botsing: jouw versie
       wint (je bent er middenin), maar de studio zegt het;
     - een wereld voorbij het eind van de basis is nieuw, en komt achteraan -- tenzij
       hij er intussen al in staat (dan is hij opgeslagen, eventueel uit een ander
       tabblad), en dan vervangt hij alleen als hij afwijkt.
   Een wereld die in het spel staat verdwijnt hier nooit: de studio kan geen
   bestaande wereld weghalen, dus een concept dat er één mist is oud en niet
   bedoeld.

   Zonder basis (een concept van vóór deze regel) wordt het spel van nu als basis
   genomen: alles wat afwijkt telt als van jou. Dat is hoe het altijd ging, alleen
   gaat er nu geen wereld meer verloren. Zuiver: geen opslag, geen scherm -- zodat
   test/werelden.js en de server precies hetzelfde kunnen doen. */
function rebaseWorldDraft(concept, basis, shipped) {
  const B = Array.isArray(basis) ? basis : shipped;
  const lijst = shipped.slice();
  const mijn = [], botsing = [];
  concept.forEach((w, i) => {
    if (!w || !w.id) return;
    if (i < B.length) {
      if (sameWorld(w, B[i])) return;                 // niet door jou veranderd
      if (i >= lijst.length) { botsing.push(w.id); return; }   // uit het spel gehaald
      if (sameWorld(lijst[i], w)) return;             // staat er intussen zo in
      if (!sameWorld(lijst[i], B[i])) botsing.push(w.id);
      lijst[i] = w; mijn.push(w.id);
      return;
    }
    const j = lijst.findIndex((x, k) => k >= B.length && x.id === w.id);
    if (j >= 0) {
      if (!sameWorld(lijst[j], w)) { lijst[j] = w; mijn.push(w.id); }
      return;
    }
    lijst.push(w); mijn.push(w.id);
  });
  return { lijst: JSON.parse(JSON.stringify(lijst)), mijn, botsing,
           verouderd: Array.isArray(basis) && !sameWorld(basis, shipped) };
}
function loadWorldDraft() {
  WORLD_DRAFT_INFO = null;
  try {
    const raw = localStorage.getItem(WORLD_DRAFT_KEY);
    if (!raw) return false;
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || !list.length) return false;
    if (!list.every(w => w && w.id && w.name && w.levels > 0)) return false;
    let basis = null;
    try { basis = JSON.parse(localStorage.getItem(WORLD_DRAFT_BASIS_KEY) || 'null'); }
    catch (e) { basis = null; }
    const r = rebaseWorldDraft(list, basis, WORLDS_SHIPPED);
    if (!r.mijn.length) {
      // niets meer van jou: alles staat al in het spel, dus er is geen concept meer
      localStorage.removeItem(WORLD_DRAFT_KEY);
      localStorage.removeItem(WORLD_DRAFT_BASIS_KEY);
      return false;
    }
    WORLD_DRAFT_INFO = { mijn: r.mijn, botsing: r.botsing, verouderd: r.verouderd,
                         zonderBasis: !Array.isArray(basis) };
    applyWorldDraft(r.lijst);
    // opnieuw bewaren op de basis van nu, zodat dit maar één keer gebeurt
    if (r.verouderd || !Array.isArray(basis)) saveWorldDraft();
    return true;
  } catch (e) { return false; }
}
/* Bewaren, mét de basis. Wijkt er niets af van het spel, dan is er geen concept
   en wordt het weggehaald -- anders bleef er een concept staan dat bij de
   volgende git pull de nieuwe werelden weer zou overschaduwen. */
function saveWorldDraft() {
  try {
    if (sameWorld(WORLDS, WORLDS_SHIPPED)) {
      localStorage.removeItem(WORLD_DRAFT_KEY);
      localStorage.removeItem(WORLD_DRAFT_BASIS_KEY);
      return true;
    }
    localStorage.setItem(WORLD_DRAFT_KEY, JSON.stringify(WORLDS));
    localStorage.setItem(WORLD_DRAFT_BASIS_KEY, JSON.stringify(WORLDS_SHIPPED));
    return true;
  } catch (e) { return false; }
}
// De velden die worldsSource hieronder met de hand in vorm zet; de rest gaat als JSON mee.
const WERELD_VELDEN = ['id', 'name', 'icon', 'levels', 'released', 'beloning', 'art', 'feest', 'venue',
  'schat', 'theme', 'nodes', 'curve'];
// De broncode van het blok, precies zoals het in index.html hoort te staan.
function worldsSource() {
  // Ook een regeleinde ontsnapt: een schat-tekening is lange tekst, en een kaal
  // regeleinde binnen '…' is een syntaxfout in het hele scriptblok.
  const q = v => "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    .replace(/\r/g, '\\r').replace(/\n/g, '\\n') + "'";
  const body = WORLDS.map(w => {
    const L = ['  {'];
    L.push(`    id: ${q(w.id)}, name: ${q(w.name)}, icon: ${q(w.icon)}, levels: ${w.levels},`);
    // Alleen als hij er staat, en alleen als hij false is: een wereld die gewoon
    // uitgebracht is zegt daar niets over (zie worldReleased). Zou dit altijd
    // 'released: true' schrijven, dan kwam er uit de studio een blok terug dat
    // niet meer letterlijk gelijk is aan wat erin ging.
    if (w.released === false) L.push('    released: false,');
    else if (w.released === true) L.push('    released: true,');   // wie het zo schreef, houdt het zo
    // Het spulletje dat deze wereld uitdeelt (fase 4D.1). De studio kiest het alleen,
    // maar moet het wél teruggeven -- anders schrijft "Opslaan" de beloning weg.
    if (w.beloning) L.push(`    beloning: ${q(w.beloning)},`);
    if (w.art) L.push(`    art: ${q(w.art)},`);
    // De eigen confetti (zie wereldConfetti): op één regel, als een rijtje emoji.
    if (Array.isArray(w.feest) && w.feest.length) L.push('    feest: [' + w.feest.map(q).join(', ') + '],');
    /* De zaal van deze wereld -- mag ontbreken (dan geldt VENUE_TERUGVAL), en elk
       veld erin mag apart ontbreken (dan geldt dát veld uit de terugval).

       Een ontbrekend veld wordt hier dus niet ingevuld maar overgeslagen. Dat is
       geen zuinigheid: schreef dit "art: null" waar de wereld niets zei, dan
       kwam er uit de studio een blok terug dat niet meer letterlijk gelijk is
       aan wat erin ging, en meldde zij bij elke ronde een wijziging die niemand
       gemaakt heeft. */
    if (w.venue) {
      const v = w.venue, d = [];
      /* .56 en niet 0.56: zo staat het in dit bestand met de hand geschreven, en
         anders veranderde de eerste keer opslaan uit de studio drie regels in
         werelden waar niemand aan had gezeten. */
      const getal = n => String(+n).replace(/^(-?)0\./, '$1.');
      if ('art' in v) d.push('art: ' + (v.art ? q(v.art) : 'null'));
      if (v.zoom != null) d.push(`zoom: ${getal(v.zoom)}`);
      if (v.focus) d.push(`focus: ${q(v.focus)}`);
      if (v.blur != null) d.push(`blur: ${getal(v.blur)}`);
      if (v.dim != null) d.push(`dim: ${getal(v.dim)}`);
      if (v.op != null) d.push(`op: ${getal(v.op)}`);
      if (d.length) L.push('    venue: { ' + d.join(', ') + ' },');
    }
    /* De getekende schat (zie schatItem). De tekening op een eigen regel: hij is
       lang, en zo blijft een diff leesbaar -- een andere naam is één regel, een
       andere tekening een andere. */
    if (w.schat) {
      const s = w.schat;
      L.push('    schat: {');
      L.push(`      naam: ${q(s.naam || '')}, emoji: ${q(s.emoji || '')}, view: ${q(s.view || '')},`);
      L.push(`      svg: ${q(s.svg || '')},`);
      Object.keys(s).filter(k => ['naam', 'emoji', 'view', 'svg'].indexOf(k) < 0 && s[k] !== undefined)
        .forEach(k => L.push('      ' + (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + JSON.stringify(s[k]) + ','));
      L.push('    },');
    }
    if (w.theme && Object.keys(w.theme).length) {
      L.push('    theme: { ' + Object.keys(w.theme).map(k => `${k}: ${q(w.theme[k])}`).join(', ') + ' },');
    }
    if (w.nodes && w.nodes.length) {
      L.push('    nodes: [');
      w.nodes.forEach(n => L.push(`      { x: ${(+n.x).toFixed(1)}, y: ${(+n.y).toFixed(1)} },`));
      L.push('    ],');
    }
    if (w.curve && w.curve.length) {
      L.push('    curve: [');
      w.curve.forEach(c => L.push(`      { x: ${(+c.x).toFixed(1)}, y: ${(+c.y).toFixed(1)} },`));
      L.push('    ],');
    }
    /* Elk ander veld gaat mee zoals het is. Een veld dat hierboven niet genoemd
       wordt -- omdat het er vandaag nog niet is -- viel eerst stil weg bij de
       eerste keer opslaan uit de studio. Nu komt het er als JSON uit (dat is
       geldige JavaScript), en hoeft een nieuw wereldveld hier niet eerst bij te
       komen voordat de studio het ongeschonden laat. De server leest het blok
       ook nog na voordat hij het schrijft (zie slaConceptOp in test/preview.js). */
    Object.keys(w).filter(k => WERELD_VELDEN.indexOf(k) < 0 && w[k] !== undefined).forEach(k => {
      const sleutel = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
      L.push('    ' + sleutel + ': ' + JSON.stringify(w[k]) + ',');
    });
    L.push('  },');
    return L.join('\n');
  }).join('\n');
  return 'const WORLDS = [\n' + body + '\n];';
}

/* ---- Naam in, id en pad uit ---------------------------------------------
   Een wereld heeft één ding nodig dat een mens verzint: zijn naam. De rest
   volgt daaruit, en dat is met opzet -- wie wereld twaalf toevoegt hoort niet
   te moeten weten hoe de bestandsnamen van de tekeningen in elkaar zitten.

     Muziekwereld  ->  id 'muziek'  ->  assets/world/muziek-map.webp

   "wereld" achteraan valt weg: elke wereld heet zo, dus het zegt niets en het
   maakt elk pad zes tekens langer. Blijft er niets over (iemand noemt zijn
   wereld letterlijk "Wereld"), dan houden we de hele naam aan -- een leeg id is
   erger dan een lelijk id.

   LET OP: dit loopt maar één kant op. Het id is de identiteit van een wereld
   (de bestandsnaam van de tekening, de trofee 'wereld-<id>', de trofee
   'perfect-<id>'), dus zodra een wereld eenmaal in het spel staat blijft zijn
   id staan ook als de naam verandert. De studio leidt het id alleen af bij het
   maken van een nieuwe wereld; daarna kun je het nog met de hand bijstellen
   onder Geavanceerd, en dan is dat een bewuste keuze en geen bijwerking. */
function wereldId(naam) {
  const kaal = String(naam || '').toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/[ç]/g, 'c').replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const kort = kaal.replace(/-?wereld$/, '').replace(/^-+|-+$/g, '');
  return kort || kaal;
}
// Waar de tekening van een wereld hoort te staan. Eén plek; de studio, de
// controle en het hernoemen lezen 'm alle drie hier.
function wereldArtPad(id) { return 'assets/world/' + id + '-map.webp'; }
/* En het kleine broertje ervan: dezelfde tekening op 560 breed, voor de
   bestemmingen op de reis. Die kaartjes zijn hooguit 200 punten breed, maar een
   volle kaart (1215x2160) kost in het geheugen ruim tien megabyte per stuk, en
   de reis zet er meerdere tegelijk neer -- op een oude tablet is dát wat het
   geheugen opmaakt. Het kleine bestand is een vijfde daarvan, en ziet er op die
   maat hetzelfde uit (zelfde verhouding, dus dezelfde uitsnede).

   Afgeleid van het pad, niet als eigen veld in WORLDS: de studio maakt hem bij
   elke kaart mee (zie verwerkBeeld), dus hij hoort er altijd te zijn. Is hij er
   toch niet, dan valt de reis terug op de grote (zie reisStartWaarnemer). */
function wereldKleinPad(art) {
  return /-map\.webp$/.test(art || '') ? art.replace(/-map\.webp$/, '-klein.webp') : null;
}
// Hetzelfde id twee keer is een fout (zie wereldControle), dus een nieuw id
// krijgt er een cijfer bij zolang het al bestaat.
function vrijWereldId(basis, negeerIdx) {
  const kaal = wereldId(basis) || 'wereld';
  let id = kaal, n = 2;
  const bezet = x => WORLDS.some((w, i) => i !== negeerIdx && w.id === x);
  while (bezet(id)) id = kaal + '-' + (n++);
  return id;
}

/* ---- Wat er mis kan zijn aan een wereld ---------------------------------
   Kijkt álle werelden na, niet alleen die op het scherm van de studio. De rode
   rand op de kaart werkt per wereld; schuif je in wereld 3 een halte mis en ga
   je door naar wereld 5, dan ziet niemand het meer. En een wereld die naar een
   ontbrekend bestand wijst valt stil terug op de kleurversie -- dat merk je
   anders pas op een telefoon.

   Verschuift niets. Waar het kan noemt een punt het vak in de studio waar je het
   oplost (`waar`), zodat een waarschuwing een weg vooruit is en geen verwijt.

   ---- Drie soorten, en het verschil is wie er last van heeft ----------------
     fout, blokkeert        een kind merkt het nu: een uitgebrachte wereld die
                            kapot is, of iets dat over de hele lijst gaat (de
                            levelnummering). Opslaan weigert, en `npm run check`
                            valt erop om (zie zaak K in test/inhoud.test.js).
     fout, niet blokkerend  "nog te doen vóór je hem uitbrengt": dezelfde fout,
                            maar in een wereld op released:false. Geen kind kan
                            erbij, dus halverwege een wereld mag je gewoon
                            opslaan en vastleggen.
     let op                 klopt, maar is het de bedoeling? (een zware tekening,
                            nog geen tekening)
   Het veld `blokkeert` zegt welke van de eerste twee het is. Zo zijn de studio
   en de keuring het per constructie eens: er is maar één lijst regels, en die
   staat hier. Hiervoor zei de studio "geen beloning is een opmerking" terwijl de
   keuring precies daarop omviel -- en dat hoorde je pas na minuten testen bij het
   vastleggen.

   Een paar fouten blokkeren óók in een wereld die nog dicht is, omdat ze buiten
   die wereld schade doen: een dubbel id (de trofeeën hangen eraan), een id met
   gekke tekens, een beloning die niet bestaat of die een winkelspulletje uit de
   winkel trekt, een verwijzing naar een bestand dat er niet is, en een aantal
   levels dat geen getal is.

   Staat hier en niet in de studio omdat het geen studio-werk is: dit is wat er
   over een wereld waar of niet waar is. Een test kan het daardoor aanroepen
   zonder eerst een paneel te openen.

   opSchijf: { pad -> kB } van de bestanden die er werkelijk liggen. Zonder de
   voorvertoningsserver is die lijst leeg; dan worden de bestandscontroles
   overgeslagen in plaats van alles ten onrechte af te keuren. */
/* Hoeveel werelden er vóóraan uitgebracht zijn, zoals WORLDS het zegt. Niet
   WORLD_AVAIL: die telt in de studio ook de werelden mee die je aan het proberen
   bent (PROEF_ONUITGEBRACHT). De eerste wereld telt altijd, net als in
   rebuildWorldStarts -- een spel zonder halte bestaat niet. */
function uitgebrachtTot() {
  let n = 0;
  while (n < WORLDS.length && worldReleased(WORLDS[n])) n++;
  return Math.max(n, WORLDS.length ? 1 : 0);
}
const KAART_KB_ZWAAR = 420;      // zie de tekening-regel in wereldControle
const WINKEL_PER_WERELD = 550;   // 💎 in de winkel per uitgebrachte wereld, minstens
function wereldControle(opSchijf) {
  const schijf = opSchijf || {};
  const weetSchijf = Object.keys(schijf).length > 0;
  const punten = [];
  const open = uitgebrachtTot();
  // blokkeert altijd, ook in een wereld die nog dicht is (zie hierboven)
  const fout = (w, t, waar) => punten.push({ ernst: 'fout', w, t, waar, blokkeert: true });
  const let_op = (w, t, waar) => punten.push({ ernst: 'let op', w, t, waar, blokkeert: false });
  const gezien = {}, beloond = {};
  WORLDS.forEach((w, i) => {
    const wl = worldForIndex(i);
    const naam = (w.icon || '') + ' ' + (w.name || w.id);
    const pad = wereldArtPad(w.id);
    const uit = i < open;
    // een fout die alleen in déze wereld schade doet: blokkeert pas als hij uit is
    const hier = (t, waar) => punten.push({ ernst: 'fout', w: naam, t, waar, blokkeert: uit });

    if (!/^[a-z0-9-]+$/.test(w.id || '')) fout(naam, 'het id "' + w.id + '" mag alleen kleine letters, cijfers en streepjes bevatten', 'gegevens');
    if (gezien[w.id]) fout(naam, 'het id "' + w.id + '" komt twee keer voor', 'gegevens');
    gezien[w.id] = true;
    if (!String(w.name || '').trim()) hier('deze wereld heeft nog geen naam', 'gegevens');
    if (!String(w.icon || '').trim()) hier('deze wereld heeft nog geen icoon', 'gegevens');
    if (!Number.isInteger(w.levels) || w.levels < 1) fout(naam, 'het aantal shows (' + w.levels + ') is geen heel getal vanaf 1', 'gegevens');

    if (!w.art) let_op(naam, 'nog geen tekening — speelt op de kleuren van de wereld', 'tekening');
    else if (w.art.indexOf('blob:') === 0) hier('de tekening staat alleen in dit tabblad, nog niet op schijf', 'tekening');
    else if (weetSchijf && !schijf[w.art]) fout(naam, 'wijst naar ' + w.art + ', maar dat bestand staat er niet', 'tekening');
    else if (w.art !== pad) let_op(naam, 'gebruikt ' + w.art + ' terwijl het id ' + pad + ' zegt', 'tekening');

    /* De beloning: de wereldschat die je krijgt als deze wereld uit is. Een
       uitgebrachte wereld zonder schat deelt niets uit -- dat is nooit de
       bedoeling (test/inhoud.test.js zaak C eist hem), dus dat blokkeert. In een
       wereld die nog dicht is, is het gewoon nog te doen: een schat is een
       tekening in code, en die komt vaak later dan de kaart.

       Een schat met een prijs is een winkelspulletje: isBeloning() haalt het dan
       voor iedereen uit de winkel, ook als deze wereld nog dicht is. Dus dat
       blokkeert altijd. De studio biedt ze daarom ook niet meer aan. */
    /* Een getekende schat uit de studio (zie schatItem). De tekening is tekst die
       in het scriptblok belandt, dus een fout daarin blokkeert altijd -- ook in een
       wereld die nog dicht is. */
    if (w.schat) {
      const kapot = schatFouten(w.schat);
      kapot.forEach(t => fout(naam, t, 'beloning'));
      // de maat pas als de rest klopt: een onleesbare view zegt schatFouten al
      if (!kapot.length) schatMaatFouten(w.schat, schatUitsneden(w)).forEach(t => fout(naam, t, 'beloning'));
      if (!w.beloning) fout(naam, 'heeft een getekende schat, maar geen beloning die ernaar wijst', 'beloning');
      else {
        const al = item(w.beloning);
        if (al && !al.uitWereld) fout(naam, 'de schat heet ' + w.beloning + ', maar dat id is al van een ander spulletje', 'beloning');
      }
    }
    const bel = w.beloning ? item(w.beloning) : null;
    if (!w.beloning) hier('nog geen wereldschat — deze wereld uitspelen levert niets op', 'beloning');
    // een kapotte getekende schat staat niet in ITEMS; dat zeggen de regels hierboven al
    else if (!bel) { if (!w.schat) fout(naam, 'de beloning "' + w.beloning + '" bestaat niet in ITEMS', 'beloning'); }
    else if (bel.price != null) fout(naam, (bel.full || bel.name) + ' staat in de winkel voor ' + bel.price
      + ' 💎 — een wereldschat heeft geen prijs, anders verdwijnt hij uit de winkel', 'beloning');
    else if (beloond[w.beloning]) fout(naam, 'deelt hetzelfde spulletje uit als ' + beloond[w.beloning], 'beloning');
    if (w.beloning) beloond[w.beloning] = naam;

    if (w.nodes && w.nodes.length !== wl.levels) hier(w.nodes.length + ' haltes voor ' + wl.levels + ' levels — valt terug op de standaardslinger', 'haltes');
    /* Geen eigen haltes: dan legt defaultNodes() de standaardslinger, en die is
       een noodopmaak voor een wereld zonder tekening. Hij zet halte 1 middenonder,
       en daar staat op een kleine telefoon de terugknop (⟲ naar je eigen wereld)
       over zijn sterrentabje. Speelbaar, dus mag een dichte wereld zo naar main;
       maar uitbrengen niet -- de browsertest (profiles, "geen zwevende knop dekt
       een sterrentabje af") valt er pas bij Publiceren op, en dan is het laat. */
    else if (!w.nodes) hier('nog geen eigen haltes — de standaardslinger zet halte 1 middenonder, onder de terugknop van een kleine telefoon; sleep ze op de tekening', 'haltes');
    if (w.curve && w.curve.length !== wl.levels - 1) hier(w.curve.length + ' stuurpunten voor ' + (wl.levels - 1) + ' stukken weg', 'haltes');

    const buiten = [];
    (w.nodes || worldNodes(wl)).forEach((n, k) => {
      const r = [];
      if (n.x < ZONE.x0) r.push('links'); if (n.x > ZONE.x1) r.push('rechts');
      if (n.y < ZONE.y0) r.push('boven'); if (n.y > ZONE.y1) r.push('onder');
      if (r.length) buiten.push((k + 1) + ' (' + r.join('+') + ')');
    });
    if (buiten.length) hier('buiten de veilige zone: halte ' + buiten.join(', '), 'haltes');

    /* De zaal en de kleuren. dim is de dekking van de donkere laag achter de
       show: buiten 0..1 tekent de browser hem niet, en dan praat de tekening mee
       met de som. Een kleur in iets anders dan #rrggbb werkt in het spel wél, maar
       het kleurveld van de studio leest hem als zwart en schrijft dat bij de
       eerste de beste wijziging terug -- zie de noot boven WORLDS. */
    const dim = w.venue && w.venue.dim;
    if (dim != null && !(typeof dim === 'number' && dim >= 0 && dim <= 1)) hier('de zaal staat op donkerte ' + dim + '; dat moet tussen 0 en 1 liggen', 'zaal');
    /* De eigen confetti (zie wereldConfetti). Die emoji staan als tekst in het
       scriptblok, net als een getekende schat, dus alleen korte stukjes zonder
       iets dat er code van kan maken -- en dat blokkeert altijd. */
    if (w.feest != null) {
      if (!Array.isArray(w.feest)) fout(naam, 'het feest is geen rijtje emoji', 'gegevens');
      else {
        if (w.feest.length > FEEST_MAX) fout(naam, w.feest.length + ' feest-emoji — er mogen er hooguit ' + FEEST_MAX, 'gegevens');
        if (w.feest.some(e => typeof e !== 'string' || !e.trim() || e.length > 12 || /[<>&'"\\\s]/.test(e)))
          fout(naam, 'het feest mag alleen losse emoji bevatten', 'gegevens');
      }
    }
    Object.keys(w.theme || {}).forEach(k => {
      if (!/^#[0-9a-f]{6}$/i.test(String(w.theme[k]))) let_op(naam, 'kleur ' + k + ' is ' + w.theme[k] + ' — de studio kan alleen #rrggbb bewerken', 'kleuren');
    });

    if (schijf[pad] && w.art && w.art !== pad) let_op(naam, pad + ' ligt er ook nog — opruimen of gebruiken', 'tekening');
    /* Hoe zwaar mag een kaart zijn? De studio mikt op 125 kB en zakt daarvoor
       met de kwaliteit, maar nooit onder 0.55 (zie KWAL_BODEM): daaronder gaat
       een geschilderde kaart vlekken. In de praktijk komen de kaarten daardoor
       op 180 tot 380 kB uit, en dat is geaccepteerd. Hier stond een waarschuwing
       boven 200, en die ging bij bijna elke wereld af -- een melding die altijd
       klinkt leer je negeren. Nu alleen wat duidelijk zwaarder is dan de rest. */
    const kb = schijf[w.art];
    if (kb && kb > KAART_KB_ZWAAR) let_op(naam, 'de tekening is ' + kb + ' kB, zwaarder dan de andere kaarten (180–380 kB) — '
      + 'zware werelden maken de app traag op mobiele data', 'tekening');
    // het kleine kaartje voor de reis (zie wereldKleinPad); de studio maakt het mee
    const klein = wereldKleinPad(w.art);
    if (weetSchijf && klein && schijf[w.art] && !schijf[klein]) let_op(naam, klein + ' ontbreekt — de reis toont dan de volle tekening, '
      + 'en die kost een oude tablet veel geheugen. Sleep de kaart opnieuw in de studio', 'tekening');
  });

  /* Groeit de winkel mee? Elke wereld die uitkomt brengt diamanten binnen, en de
     afspraak is dat er dan ook 4 tot 7 spulletjes bij komen (docs/UITBREIDEN.md).
     Dat zit in ITEMS en niet in de studio, dus vergeet je het makkelijk -- en dan
     staat een kind na een paar werelden met een volle zak voor een lege winkel.
     De maat is de waarde van de winkel per uitgebrachte wereld: bij elf werelden
     ruim 600 💎. Zakt dat onder WINKEL_PER_WERELD, dan staat het hier. */
  const winkel = ITEMS.reduce((som, it) => som + (it.price != null ? it.price : 0), 0);
  if (open > 0 && winkel / open < WINKEL_PER_WERELD) let_op('de winkel',
    'is ' + winkel + ' 💎 waard voor ' + open + ' werelden (' + Math.round(winkel / open) + ' per wereld) — '
    + 'zet er spulletjes bij voor de nieuwe wereld (docs/UITBREIDEN.md)', 'winkel');

  /* Uitgebracht is een aaneengesloten kop (zie worldReleased). Een open wereld
     achter een dichte is onbereikbaar: het spel stopt bij de eerste dichte. */
  WORLDS.forEach((w, i) => {
    if (i >= open && worldReleased(w)) {
      fout((w.icon || '') + ' ' + w.name, 'staat op uitgebracht, maar ' + WORLDS[open].name
        + ' ervóór niet — dan kan geen kind erbij. Breng ze op volgorde uit', 'lijst');
    }
  });

  /* Twee dingen die over de lijst als géheel gaan, en die stil verkeerd aflopen:
     een wereld die van plaats wisselt of verdwijnt hernummert elk level erna, en
     de sterren van een kind hangen aan levelnummers. Wie al speelt verhuist dan
     naar een andere wereld zonder dat er iets kapot lijkt.

     Wat hernummert wel en wat niet? De levels lopen door de lijst heen, dus alleen
     de vólgorde en het aántal doen ertoe. Een wereld op plek 3 hernoemen verandert
     niets aan welk level waar valt; een wereld ertussen schuiven of verplaatsen
     verschuift alles erna. Daarom op positie vergelijken en niet op verzameling --
     anders leest een hernoeming als een verwijdering. */
  const nuL = WORLDS.map(w => w.id), wasL = WORLDS_SHIPPED.map(w => w.id);
  if (nuL.length !== wasL.length) {
    /* Achteraan bijzetten hernummert niets, en is precies hoe een wereld erbij
       komt -- dat hoort geen punt op de lijst te zijn. Stond hier een "let op"
       voor, dan kreeg elke nieuwe wereld een melding waar niets aan te doen viel,
       en leer je de lijst negeren. */
    const achteraan = nuL.length > wasL.length && nuL.slice(0, wasL.length).join(',') === wasL.join(',');
    if (!achteraan) fout('de wereldlijst',
      'stond op ' + wasL.length + ' werelden en nu op ' + nuL.length
      + ' — elk level na de wijziging schuift op, en de sterren van een kind hangen aan levelnummers', 'lijst');
  } else {
    const zelfdeSet = nuL.slice().sort().join(',') === wasL.slice().sort().join(',');
    if (zelfdeSet && wasL.some((id, i) => nuL[i] !== id))
      fout('de wereldlijst', 'de volgorde is veranderd — elk level schuift mee, en de sterren van een kind hangen aan levelnummers', 'lijst');
    else {
      const hernoemd = wasL.map((id, i) => id !== nuL[i] ? id + ' → ' + nuL[i] : null).filter(Boolean);
      if (hernoemd.length) let_op('de wereldlijst', 'hernoemd: ' + hernoemd.join(', ')
        + ' — de levels blijven waar ze zijn; alleen een al behaalde wereldbadge heet anders', 'lijst');
    }
  }
  /* En een wereld die in het project al uitgebracht was, weer dichtzetten: dan
     verdwijnt hij bij kinderen die er al sterren in hebben, en schuift hun grens
     terug. Dat is nooit een vinkje in de studio; als het moet (een wereld die
     stuk is), is het een bewuste wijziging met de hand. */
  const wasOpen = (() => { let n = 0;
    while (n < WORLDS_SHIPPED.length && worldReleased(WORLDS_SHIPPED[n])) n++;
    return Math.max(n, WORLDS_SHIPPED.length ? 1 : 0); })();
  WORLDS.forEach((w, i) => {
    const ship = WORLDS_SHIPPED[i];
    if (ship && ship.levels !== w.levels)
      fout((w.icon || '') + ' ' + w.name, 'stond op ' + ship.levels + ' levels en nu op ' + w.levels + ' — alles daarna hernummert', 'gegevens');
    if (ship && i < wasOpen && ship.id === w.id && !worldReleased(w))
      fout((w.icon || '') + ' ' + w.name, 'is al uitgebracht — kinderen spelen hem. Weer dichtzetten haalt hem '
        + 'bij hen weg; zet het vinkje "uitgebracht" terug', 'gegevens');
  });
  return punten;
}
/* In welke wereld valt dit level? Geeft nooit undefined terug: het nummer wordt
   geklemd op wat er bestaat. Een level voorbij WORLD_LAST bestaat niet -- dat is
   de toegift-stand, en die speelt in de laatste uitgebrachte wereld.

   Let op wat dit NIET zegt: het zegt waar een levelnummer ligt, niet of het
   gespeeld is. Wie wil weten of een wereld uit is, vraagt dat aan worldDone(). */
function worldFor(lvl) {
  lvl = Math.max(1, Math.min(WORLD_LAST, Math.floor(lvl) || 1));
  let i = 0;
  for (let k = 0; k < WORLD_AVAIL; k++) if (lvl >= WORLD_START[k]) i = k;
  return { world: WORLDS[i], index: i, first: WORLD_START[i], nr: lvl - WORLD_START[i] + 1, levels: WORLDS[i].levels };
}
/* Hoe ver staat dit kind in deze wereld? Één plek die p.stars per wereld optelt,
   en de enige plek die dat mag. Alles wat een scherm of een trofee over een wereld
   wil weten komt hieruit -- daarvóór liep dezelfde lus vier keer los door het
   bestand (sterrenteller, badge-heeft, badge-ster, badge-voortgang) en telde elke
   kopie net iets anders.

   p.stars is en blijft de opslag; dit is puur afgeleid en wordt nooit bewaard.
   endLevel schrijft er alleen bij een gesláágde show in, en dan minstens één ster,
   dus "gespeeld" is hier "er staat minstens één ster". Een 0 kan alleen uit een met
   de hand bewerkte back-up komen en telt bewust niet mee -- precies zoals de oude
   worldDone() dat deed.

   { levels, gespeeld, perfect, sterren, max, uit, vol }
     gespeeld  hoeveel shows van deze wereld al een keer gedaan zijn
     perfect   hoeveel daarvan op drie sterren staan
     sterren   / max   de sterrenteller van deze wereld
     uit       elke show gespeeld        (de wereldbadge)
     vol       elke show op drie sterren (de ster-rand op diezelfde badge) */
function worldProgress(p, w) {
  let gespeeld = 0, perfect = 0, sterren = 0;
  for (let l = w.first; l < w.first + w.levels; l++) {
    const st = p.stars[l];
    if (!st) continue;
    gespeeld++;
    sterren += st;
    if (st >= 3) perfect++;
  }
  return { levels: w.levels, gespeeld, perfect, sterren, max: w.levels * 3,
           uit: gespeeld >= w.levels, vol: perfect >= w.levels };
}

/* De eigen confetti van een wereld: een paar emoji in WORLDS (veld feest), die
   confetti() en confettiBurst() onder hun gewone stukjes mengen. Zo zie je ook
   in de zaal en op het eindscherm in welke wereld je speelt, zonder tekening en
   zonder extra beweging: alleen wélke stukjes er dwarrelen verandert. Een wereld
   zonder feest houdt de gewone confetti.

   Welke wereld: in de show en op het eindscherm die van de show, anders die
   waar de kaart naar kijkt. Een trofee die je in de kast opent viert dus in de
   wereld waar je bent -- dat is ook waar je hem verdiend hebt. */
const FEEST_MAX = 6;          // meer emoji en je herkent de wereld er niet meer in
const FEEST_AANDEEL = 0.5;    // zoveel van de stukjes komt uit de wereld
function wereldConfetti() {
  const scherm = document.querySelector('.screen.active');
  const id = scherm ? scherm.id : '';
  // op het eindscherm is G al losgelaten; naShowLvl onthoudt de show die er net was
  const lvl = id === 'screen-game' && G ? G.lvl : id === 'screen-end' ? naShowLvl : null;
  const w = lvl != null ? worldFor(lvl) : viewWorldIdx != null ? worldForIndex(viewWorldIdx) : null;
  const f = w && w.world && w.world.feest;
  return Array.isArray(f) && f.length ? f : null;
}
// Eén confettistukje: uit de wereld of uit de gewone set.
function feestStukje(basis) {
  const eigen = wereldConfetti();
  return eigen && Math.random() < FEEST_AANDEEL ? pick(eigen) : pick(basis);
}

