/* =====================================================================
   INHOUD — zoek op de sectienaam (bv. "= Telmodus") om er te springen.
   Regelnummers staan er bewust niet bij: die verouderen meteen.

   Dit is de inhoudsopgave van src/20-app.js -- het spel. Ernaast liggen nog zes
   bronbestanden die samen met dit ene het scriptblok vormen (zie test/bouw.js):
   00-vh-lock (de vensterhoogte, moet eerst), 10-feestjes (de gedeelde toast,
   confetti, danspasjes en dialogen), 15-kaart-en-weg (de vormleer van de
   wereldkaart), 17-kaartstand (waar de kaart naar kijkt en wat er loopt),
   90-wereldstudio en 99-servicewerker.

   De secties hieronder staan in de volgorde van dít bestand; wat naar een
   buurbestand verhuisd is, staat er met zijn nieuwe plek bij. Zoeken op de
   sectienaam werkt onveranderd -- de kop verhuisde mee.

   Álle secties staan hieronder, in de volgorde van het bestand. Dat is geen
   volledigheid om de volledigheid: een lijst die er dertien mist wijst je bij de
   moeilijkste stukken juist naar de verkeerde plek, en dat deed deze. Komt er een
   sectie bij, zet hem hier dan ook neer.

   ---- DE GEGEVENS: tabellen, en verder niets -------------------------------
     Helpers ............ mini-hulpjes ($, rnd, pick, shuffle, esc)
     De wereldbeloningen, getekend   de zes koptooien als SVG (fase 4D.2)
     Items .............. kleerkast-inhoud (data)
     Werelden ........... WORLDS + level→wereld (data; blok wordt machinaal
                          geschreven — zie WERELDEN-BEGIN)
     Trofeeën ........... trofee-definities + planken (data)

   ---- DE KERN: de regels, zonder scherm ------------------------------------
     De voortgang, afgeleid   worldDone/frontierWorld/continueWorld. ALLEEN
                          p.stars wordt bewaard; de rest volgt eruit
     Wereldbeloningen ... wat een wereld uitdeelt als hij uit of perfect is
     Sterrencarrière .... rang-ladder op sterren (RANK_TIERS, starRank)
     Opslag ............. db, load/save, migratie, profielen

   ---- DE ZINTUIGEN ---------------------------------------------------------
     Trilfeedback ....... haptics
     Geluid ............. klikjes, fanfares (WebAudio)
     Gesproken opdrachten  nl-NL stem — ALLEEN telmodus (zie speak())
     Avatar (SVG) ....... de pop tekenen (BASES: meisje of jongen)

   ---- SCHERMEN EN NAVIGATIE ------------------------------------------------
     Schermen ........... show()/navGo()/toonHub: welk scherm staat aan
     De sterrenkeuze leeft   het beginscherm: zwaaien, vonkjes, ster kiezen
     De kaart: welke wereld   STAAT IN src/15-kaart-en-weg.js. De rékenkant
                          van de kaart: haltes, weg, streeppatroon,
                          viewWorldIdx/showWorld. De kaart, de reis én de
                          wereldstudio leunen erop, en het kent zelf geen
                          scherm -- daarom een eigen bestand
     De kaartstand ...... STAAT IN src/17-kaartstand.js. De vijftien namen die
                          samen zeggen waar de kaart naar kijkt, wat de
                          eerstvolgende opbouw moet doen en wat er nu loopt
     Wat er geladen wordt   preloadArt: welke tekening wanneer binnenkomt

   ---- DE BEWEGING: waar het meeste denkwerk in zit -------------------------
     Wereld naar wereld   de camera die van wereld naar wereld klimt
     Zwevende lagen ..... overlays
     Bewegingstaal ...... MOTION/VLUCHT + de wissel kaart ⇄ zaal. De twee lánge
                          duren staan hier en niet in :root — zie MOTION.totaal
     De kaart zegt hallo   de begroeting bij aankomst op de kaart
     De hele tournee .... de reis boven de werelden uit (het grootste blok)

   ---- HET SPEL -------------------------------------------------------------
     Vragen maken ....... rekenmodus: genTriple/genQuestion/genMissing/genChain
     Telmodus ........... lees-vrije vragen: fases, rungs, genCount, rendering
     Memory-spel ........ los kaartspel (lees-vrij)
     Extra uitdagingen .. beheersing, pauzeren, inroostering speciale vragen
     Spel ............... de show: renderQuestion, submitAnswer, endLevel.
                          De gedeelde feestjes stonden hier ooit ook in; die
                          staan sinds kort in src/10-feestjes.js
     Wereldfeest ........ wereld uit en/of overal drie sterren (fase 4D.1)
     Trofeeën-scherm .... kast, claim-ceremonie, ster-status-ladder

   ---- DE SCHERMEN ERNAAST --------------------------------------------------
     Kleedkamer ......... winkel, passen, aankleden. Staat ook de 💎-tellers in
                          (zetTeller/telNu/telNaar/telStraks, gedeeld)
     Nieuwe ster ........ het maakformulier
     Instellingen ....... ouderscherm: voortgang + oefening + beheer
     Terug-navigatie .... Android back / browser back

   ---- OPSTARTEN EN GEREEDSCHAP ---------------------------------------------
     Start .............. opstarten, service worker
     -- Ontwikkelaarsschakelaars   alles achter ?debug
     -- Kijkstanden ..... ?debug&wereld=n&stand=... : een stand zonder spelen
     -- Wereldstudio .... ?debug&mapedit. Bijna een vijfde van dit scriptblok en
                          het gewone spel raakt het nooit aan — sla het over
                          tenzij je er expliciet aan werkt

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
  { id: 'dress_regenboog',cat:'dress', name: 'Regenboog',  full: 'Regenboogoutfit', price: 110, color: 'RAINBOW' },
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
  { id: 'mic_zilver', cat: 'mic', name: 'Zilver', full: 'Zilveren microfoon', price: 30, color: '#cfd8dc' },
  { id: 'mic_blauw',  cat: 'mic', name: 'Blauw',   full: 'Blauwe microfoon', price: 35, color: '#42a5f5' },
  { id: 'mic_groen',  cat: 'mic', name: 'Groen',   full: 'Groene microfoon', price: 40, color: '#66bb6a' },
  { id: 'mic_pintje', cat: 'mic', name: 'Pintje',  full: 'Pintjemicrofoon',       price: 45, emoji: '🍺' },
  { id: 'mic_zwart',  cat: 'mic', name: 'Rock', full: 'Rockmicrofoon', price: 55, color: '#37474f' },
  { id: 'mic_toverstaf', cat: 'mic', name: 'Toverstaf', full: 'Toverstafmicrofoon', price: 70, emoji: '🪄' },
  { id: 'mic_goud',   cat: 'mic', name: 'Goud',   full: 'Gouden microfoon', price: 60, color: '#ffd54f' },
  { id: 'mic_roze',   cat: 'mic', name: 'Roze glitter', full: 'Roze glittermicrofoon', price: 90, color: '#ff80ab' },
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
  { id: 'instr_dj',      cat: 'instrument', name: 'DJ-set',    price: 105, emoji: '🎛️' },
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
  { id: 'acc_diadeem',  cat: 'acc', name: 'Diamanten diadeem', price: 120, emoji: '💎', spot: 'top' },
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
  { id: 'pet_eenhoorn',cat:'pet', name: 'Eenhoorn',      price: 130, emoji: '🦄' },
  { id: 'pet_draak',  cat: 'pet', name: 'Draakje',       price: 180, emoji: '🐉' },
  { id: 'pet_pauw',   cat: 'pet', name: 'Pauw',          price: 200, emoji: '🦚' },
  // Podium
  { id: 'stage_disco',    cat: 'stage', name: 'Disco',     price: 0,   bg: 'radial-gradient(circle at 30% 20%, #6a1b9a, #1a0533)', deco: ['🪩','✨','🎶'] },
  { id: 'stage_slaapkamer', cat: 'stage', name: 'Slaapkamershow', price: 20, bg: 'linear-gradient(#5c6bc0, #b39ddb)',                 deco: ['🛏️','🌙','🧸'] },
  { id: 'stage_strand',   cat: 'stage', name: 'Strandfeest',     price: 60,  bg: 'linear-gradient(#4fc3f7 62%, #ffe082 62%)',            deco: ['🌴','🌞','🐚'] },
  { id: 'stage_kasteel',  cat: 'stage', name: 'Sprookjeskasteel', price: 90, bg: 'linear-gradient(#b39ddb, #f48fb1)',                    deco: ['🏰','✨','👑'] },
  { id: 'stage_ruimte',   cat: 'stage', name: 'Ruimte',      price: 90,  bg: 'linear-gradient(#0d1b4c, #311b92)',                    deco: ['🪐','⭐','🚀'] },
  { id: 'stage_jungle',   cat: 'stage', name: 'Jungle',    price: 90,  bg: 'linear-gradient(#1b5e20, #66bb6a)',                    deco: ['🌿','🦜','🌺'] },
  { id: 'stage_stadion',  cat: 'stage', name: 'Voetbalstadion',  price: 95,  bg: 'linear-gradient(#263238 34%, #43a047 34%)',            deco: ['⚽','🥅','📣'] },
  { id: 'stage_winter',   cat: 'stage', name: 'Winterwonderland',price: 100, bg: 'linear-gradient(#81d4fa, #e1f5fe)',                    deco: ['❄️','⛄','✨'] },
  { id: 'stage_onderwater',cat:'stage', name: 'Onderwater',  price: 110, bg: 'linear-gradient(#0277bd, #26c6da)',                    deco: ['🐠','🐳','💦'] },
  { id: 'stage_regenboog',cat: 'stage', name: 'Regenboogland',   price: 120, bg: 'linear-gradient(45deg, #ff9a9e, #fad0c4, #a1ffce, #a18cd1)', deco: ['🌈','☁️','🦋'] },
  { id: 'stage_arena',    cat: 'stage', name: 'Sterrenarena',     price: 130, bg: 'radial-gradient(circle at 50% 0%, #ffd54f, #6d4c41 75%)', deco: ['🏟️','🎇','🎆'] },
  { id: 'stage_vulkaan',  cat: 'stage', name: 'Vulkaan',         price: 150, bg: 'linear-gradient(#3e2723, #bf360c 70%, #ff6f00)',       deco: ['🌋','🔥','🌫️'] },
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
// Kleren eerst: het is een kleedkamer, de outfit is het sterartikel.
// Icoon en woord staan los: de categorierij toont alleen het icoon, behalve bij
// de categorie die aanstaat -- die zet er zijn woord bij (zie renderShop).
const CATS = [
  { id: 'dress', ico: '👕', name: 'Kleren' },
  { id: 'shoes', ico: '👟', name: 'Schoenen' },
  { id: 'hair',  ico: '💇', name: 'Kapsels' },
  { id: 'mic',   ico: '🎤', name: 'Microfoons' },
  { id: 'instrument', ico: '🎸', name: 'Muziek' },
  { id: 'acc',   ico: '🎀', name: 'Accessoires' },
  { id: 'pet',   ico: '🐾', name: 'Dieren' },
  // FASE 1: 'stage' (Podium) staat hier bewust NIET meer bij -- podia zijn geen
  // koopbare categorie meer. De items zelf blijven in ITEMS staan: ze zijn nog
  // altijd het decor achter de paspop (zie applyStage), en wie er al een had
  // houdt hem gewoon. Alleen de winkel-ingang is dicht.
];
/* De wereldschatten staan er met opzet NIET bij. Ze zijn geen achtste lade maar
   een eigen vakje onder de rij (zie renderSchatEntry): een lade die alleen maar
   dingen op slot bevat is een lade waar een kind één keer in kijkt, en tussen
   zeven iconen die allemaal "kleren" betekenen valt een schatkist niet op.
   Dit id is dus een stand van de kleedkamer (shopCat), geen categorie -- niets
   dat over CATS loopt hoeft hem te kennen. */
const SCHAT_CAT = 'schat';
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
   door de wereldstudio (?debug&mapedit -> Bewaar, draait via npm run preview).
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
   weg = de nog niet afgelegde stippellijn (de afgelegde is altijd goud). */
const WORLDS = [
  {
    id: 'muziek', name: 'Muziekwereld', icon: '🎵', levels: 8,
    beloning: 'acc_wereld_muziek',
    art: 'assets/world/muziek-map.webp',
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
    // bijna wit getekend: een tandje donkerder, anders praat de zaal mee met de som
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
    // sneeuw en ijs: de lichtste tekening van alle zes
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
    // een nachttekening: die hoeft niet nóg donkerder gemaakt te worden
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
  while (WORLD_AVAIL < WORLDS.length && worldReleased(WORLDS[WORLD_AVAIL])) WORLD_AVAIL++;
  // Staat er niets uitgebracht (alleen mogelijk in de wereldstudio), dan is de
  // eerste wereld alsnog speelbaar: een kaart zonder enkele halte is geen spel.
  if (!WORLD_AVAIL && WORLDS.length) WORLD_AVAIL = 1;
  WORLD_LAST = WORLD_AVAIL ? WORLD_START[WORLD_AVAIL - 1] + WORLDS[WORLD_AVAIL - 1].levels - 1 : 0;
}
rebuildWorldStarts();
/* Het laatste level dat bestond op de dag dat de oneindige staart verdween (zes
   werelden van acht). Een historisch getal: het hoort bij één eenmalige opruiming
   in migrate() en mag daarom nooit meelopen met WORLD_LAST. Zie daar. */
const LEGACY_TOUR_END = 48;

/* ---- Wereldconcept: bewaren, uitwisselen, wegschrijven -----------------------
   Een concept leeft in localStorage en wordt ALLEEN met ?debug ingelezen. Het
   gewone spel draait dus altijd op wat er in WORLDS staat -- een half afgemaakte
   wereld kan nooit bij een kind terechtkomen.

   Van concept naar spel gaan kan op twee manieren:
     Bewaar    schrijft het blok tussen WERELDEN-BEGIN/EINDE in index.html op
               schijf. Werkt alleen via `npm run preview` (die server luistert
               ernaar); daarna gewoon npm test, committen en pushen.
     Kopieer   geeft hetzelfde blok als tekst, om zelf te plakken. Werkt overal,
               ook op een telefoon en over file://.                            */
const WORLD_DRAFT_KEY = 'rekenPopsterren_wereldconcept';
/* Wat er ín het spel staat, zoals het uit index.html kwam -- vastgelegd vóór een
   concept eroverheen gaat. Daarmee kan de studio laten zien wat er nog niet
   doorgevoerd is, en een wereld terugdraaien naar de versie die kinderen spelen. */
const WORLDS_SHIPPED = JSON.parse(JSON.stringify(WORLDS));
function sameWorld(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

function applyWorldDraft(list) {
  WORLDS.length = 0;
  list.forEach(w => WORLDS.push(w));
  rebuildWorldStarts();
  if (typeof rebuildWorldBadges === 'function') rebuildWorldBadges();
}
function loadWorldDraft() {
  try {
    const raw = localStorage.getItem(WORLD_DRAFT_KEY);
    if (!raw) return false;
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || !list.length) return false;
    if (!list.every(w => w && w.id && w.name && w.levels > 0)) return false;
    applyWorldDraft(list);
    return true;
  } catch (e) { return false; }
}
function saveWorldDraft() {
  try { localStorage.setItem(WORLD_DRAFT_KEY, JSON.stringify(WORLDS)); return true; }
  catch (e) { return false; }
}
// De broncode van het blok, precies zoals het in index.html hoort te staan.
function worldsSource() {
  const q = v => "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  const body = WORLDS.map(w => {
    const L = ['  {'];
    L.push(`    id: ${q(w.id)}, name: ${q(w.name)}, icon: ${q(w.icon)}, levels: ${w.levels},`);
    // Alleen als hij er staat, en alleen als hij false is: een wereld die gewoon
    // uitgebracht is zegt daar niets over (zie worldReleased). Zou dit altijd
    // 'released: true' schrijven, dan kwam er uit de studio een blok terug dat
    // niet meer letterlijk gelijk is aan wat erin ging.
    if (w.released === false) L.push('    released: false,');
    // Het spulletje dat deze wereld uitdeelt (fase 4D.1). De studio bewerkt het niet,
    // maar moet het wél teruggeven -- anders schrijft "Bewaar" de beloning weg.
    if (w.beloning) L.push(`    beloning: ${q(w.beloning)},`);
    if (w.art) L.push(`    art: ${q(w.art)},`);
    /* De zaal van deze wereld -- mag ontbreken (dan geldt VENUE_TERUGVAL), en elk
       veld erin mag apart ontbreken (dan geldt dát veld uit de terugval).

       Een ontbrekend veld wordt hier dus niet ingevuld maar overgeslagen. Dat is
       geen zuinigheid: schreef dit "art: null" waar de wereld niets zei, dan
       kwam er uit de studio een blok terug dat niet meer letterlijk gelijk is
       aan wat erin ging, en meldde zij bij elke ronde een wijziging die niemand
       gemaakt heeft. */
    if (w.venue) {
      const v = w.venue, d = [];
      if ('art' in v) d.push('art: ' + (v.art ? q(v.art) : 'null'));
      if (v.zoom != null) d.push(`zoom: ${+v.zoom}`);
      if (v.focus) d.push(`focus: ${q(v.focus)}`);
      if (v.blur != null) d.push(`blur: ${+v.blur}`);
      if (v.dim != null) d.push(`dim: ${+v.dim}`);
      if (v.op != null) d.push(`op: ${+v.op}`);
      if (d.length) L.push('    venue: { ' + d.join(', ') + ' },');
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

   Blokkeert niets, en verschuift niets. Halverwege een wereld wíl je kunnen
   vastleggen; dit zegt alleen wat er staat. Waar het kan noemt een punt het
   vak in de studio waar je het oplost (`waar`), zodat een waarschuwing een weg
   vooruit is en geen verwijt.

   Staat hier en niet in de studio omdat het geen studio-werk is: dit is wat er
   over een wereld waar of niet waar is. Een test kan het daardoor aanroepen
   zonder eerst een paneel te openen.

   opSchijf: { pad -> kB } van de bestanden die er werkelijk liggen. Zonder de
   voorvertoningsserver is die lijst leeg; dan worden de bestandscontroles
   overgeslagen in plaats van alles ten onrechte af te keuren. */
function wereldControle(opSchijf) {
  const schijf = opSchijf || {};
  const weetSchijf = Object.keys(schijf).length > 0;
  const punten = [];
  const fout = (w, t, waar) => punten.push({ ernst: 'fout', w, t, waar });
  const let_op = (w, t, waar) => punten.push({ ernst: 'let op', w, t, waar });
  const gezien = {}, beloond = {};
  WORLDS.forEach((w, i) => {
    const wl = worldForIndex(i);
    const naam = (w.icon || '') + ' ' + (w.name || w.id);
    const pad = wereldArtPad(w.id);

    if (!/^[a-z0-9-]+$/.test(w.id || '')) fout(naam, 'het id "' + w.id + '" mag alleen kleine letters, cijfers en streepjes bevatten', 'gegevens');
    if (gezien[w.id]) fout(naam, 'het id "' + w.id + '" komt twee keer voor', 'gegevens');
    gezien[w.id] = true;
    if (!String(w.name || '').trim()) fout(naam, 'deze wereld heeft nog geen naam', 'gegevens');

    if (!w.art) let_op(naam, 'nog geen tekening — speelt op de kleuren van de wereld', 'tekening');
    else if (w.art.indexOf('blob:') === 0) let_op(naam, 'de tekening staat alleen in dit tabblad, nog niet op schijf', 'tekening');
    else if (weetSchijf && !schijf[w.art]) fout(naam, 'wijst naar ' + w.art + ', maar dat bestand staat er niet', 'tekening');
    else if (w.art !== pad) let_op(naam, 'gebruikt ' + w.art + ' terwijl het id ' + pad + ' zegt', 'tekening');

    /* De beloning: het spulletje dat je krijgt als deze wereld uit is. Een wereld
       zonder beloning werkt gewoon (zie grantWorldRewards), maar hij geeft dan
       niets -- dat is bijna nooit de bedoeling en bijna altijd vergeten. Een
       beloning die naar een onbekend id wijst is wél kapot: die wereld deelt voor
       altijd niets uit en niemand ziet waarom. */
    if (!w.beloning) let_op(naam, 'geen beloning — deze wereld uitspelen levert geen spulletje op', 'beloning');
    else if (!item(w.beloning)) fout(naam, 'de beloning "' + w.beloning + '" bestaat niet in ITEMS', 'beloning');
    else if (beloond[w.beloning]) fout(naam, 'deelt hetzelfde spulletje uit als ' + beloond[w.beloning], 'beloning');
    if (w.beloning) beloond[w.beloning] = naam;

    if (w.nodes && w.nodes.length !== wl.levels) fout(naam, w.nodes.length + ' haltes voor ' + wl.levels + ' levels — valt terug op de standaardslinger', 'haltes');
    if (w.curve && w.curve.length !== wl.levels - 1) fout(naam, w.curve.length + ' stuurpunten voor ' + (wl.levels - 1) + ' stukken weg', 'haltes');

    const buiten = [];
    (w.nodes || worldNodes(wl)).forEach((n, k) => {
      const r = [];
      if (n.x < ZONE.x0) r.push('links'); if (n.x > ZONE.x1) r.push('rechts');
      if (n.y < ZONE.y0) r.push('boven'); if (n.y > ZONE.y1) r.push('onder');
      if (r.length) buiten.push((k + 1) + ' (' + r.join('+') + ')');
    });
    if (buiten.length) fout(naam, 'buiten de veilige zone: halte ' + buiten.join(', '), 'haltes');

    if (schijf[pad] && w.art && w.art !== pad) let_op(naam, pad + ' ligt er ook nog — opruimen of gebruiken', 'tekening');
    const kb = schijf[w.art];
    if (kb && kb > 200) let_op(naam, 'de tekening is ' + kb + ' kB; de begroting is ~125 — zware werelden maken de app traag op mobiele data', 'tekening');
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
    const achteraan = nuL.length > wasL.length && nuL.slice(0, wasL.length).join(',') === wasL.join(',');
    (achteraan ? let_op : fout)('de wereldlijst',
      'stond op ' + wasL.length + ' werelden en nu op ' + nuL.length
      + (achteraan ? ' — er komt er één achteraan, dat hernummert niets'
         : ' — elk level na de wijziging schuift op, en de sterren van een kind hangen aan levelnummers'), 'lijst');
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
  WORLDS.forEach((w, i) => {
    const ship = WORLDS_SHIPPED[i];
    if (ship && ship.levels !== w.levels)
      fout((w.icon || '') + ' ' + w.name, 'stond op ' + ship.levels + ' levels en nu op ' + w.levels + ' — alles daarna hernummert', 'gegevens');
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

/* ================= De voortgang, afgeleid ==================================
   FASE 4A. Vijf begrippen die vroeger één getal waren (p.level) en daardoor niet
   uit elkaar te houden waren. Ze staan hier bij elkaar omdat ze elkaars buren
   zijn, en ze bewaren geen van alle iets: alles komt uit p.stars en uit wat er
   in WORLDS staat. Wat er wél wordt opgeslagen is p.stars, en meer niet.

     worldAvailable(i)  bestaat deze wereld voor dit kind? (uitgebracht)
     worldDone(p, i)    heeft dit kind deze wereld écht uitgespeeld?
     frontierWorld(p)   de eerste beschikbare wereld die nog niet uit is, of -1
     allWorldsDone(p)   alles wat er nú is, is uit -> de toegift-stand
     continueWorld(p)   waar "verder" naartoe gaat: de grens, of anders de laatste

   De regel waar deze hele fase om draait: een wereld is NOOIT uit omdat hij
   vóór je huidige positie ligt. Hij is uit omdat elk van zijn shows gespeeld is.
   Positie en voltooiing zijn twee dingen, en één getal kan er maar één zijn. */
function worldAvailable(i) { return i >= 0 && i < WORLD_AVAIL; }
// Uitgespeeld = precies wat de wereldbadge al betekende: elke show één keer
// gedaan. Bewust niet aangescherpt naar sterren of perfectie -- dat is een
// andere vraag (worldProgress().vol) en die verandert deze fase niet.
function worldDone(p, i) {
  if (!worldAvailable(i)) return false;
  return worldProgress(p, worldForIndex(i)).uit;
}
// De grens van de voortgang: de eerste beschikbare wereld die nog niet uit is.
// -1 = er is er geen meer, alles is uit (zie allWorldsDone).
function frontierWorld(p) {
  for (let i = 0; i < WORLD_AVAIL; i++) if (!worldDone(p, i)) return i;
  return -1;
}
function allWorldsDone(p) { return frontierWorld(p) < 0; }
/* Waar "verder" heen gaat. Is er nog een wereld te doen, dan die. Is alles uit,
   dan de laatste uitgebrachte wereld -- niet als voortgang maar als toegift: daar
   valt nog te verbeteren, en er schuift niets vooruit. Komt er later een wereld
   bij, dan is die de volgende ochtend vanzelf de grens en wijst deze functie
   erheen, zonder dat er iets gemigreerd hoeft te worden. */
function continueWorld(p) {
  const f = frontierWorld(p);
  return f >= 0 ? f : Math.max(0, WORLD_AVAIL - 1);
}
/* ---- Hoe ver je vooruit kijkt ------------------------------------------------
   Zes standen, en ze zijn alle zes iets anders. Ze staan hier bij elkaar omdat ze
   makkelijk door elkaar te halen zijn, en omdat er precies één bij is die nieuw is:

     geschreven      staat in WORLDS                       WORLDS.length
     uitgebracht     mag gespeeld worden in deze versie    worldAvailable(i)
     uitgespeeld     dit kind heeft elke show gedaan       worldDone(p, i)
     hier            waar "verder" naartoe gaat            continueWorld(p)
     te zien         mag op de reis staan                  ZIE HIERONDER
     nog niet        geschreven maar niet uitgebracht      released: false

   "Te zien" is nieuw, en het is niet hetzelfde als "uitgebracht". Achteruit zie je
   álles: elke wereld die af is blijft staan, want daar ga je naartoe terug om
   sterren op te halen, en die rij ís de reis die je gelopen hebt. Vooruit zie je
   maar een paar bestemmingen.

   Waarom niet gewoon alles vooruit ook: met zes werelden viel dat niet op, maar de
   tournee groeit. Bij dertig werelden is "de reis" dan een kaart met vier plekken
   die van jou zijn en zesentwintig sloten erboven -- dat is geen belofte meer maar
   een inventaris, en een kind dat bij wereld drie staat heeft niets aan wereld
   zevenentwintig. Drie bestemmingen vooruit is genoeg om te zien waar je heen
   gaat; wat daarboven ligt zegt de mist (zie renderReis).

   Het scheelt meteen ook werk: elke bestemming die er niet staat haalt zijn
   tekening niet op. Zie de drie soorten spullen bij preloadArt.

   Een wereld die nog niet uitgebracht is komt hier sowieso niet voorbij -- de
   grens ligt op WORLD_AVAIL. Die stond er eerder wél, als vraagteken in de mist,
   en dat is precies wat een niet-uitgebrachte wereld niet hoort te doen:
   verklappen dat hij bestaat. */
const REIS_VOORUIT = 3;
function laatsteZichtbareWereld(p) {
  return Math.min(WORLD_AVAIL - 1, continueWorld(p) + REIS_VOORUIT);
}
// Ligt er nog meer voorbij wat er getekend staat? Alleen over uitgebrachte
// werelden: een wereld die nog niet uit is mag geen belofte doen.
function meerWereldenVooruit(p) { return laatsteZichtbareWereld(p) < WORLD_AVAIL - 1; }
/* De halte waar de ster staat. p.level is "de eerstvolgende show", en die loopt
   één voorbij het einde zodra alles uit is -- dan staat ze op de laatste halte
   die er wél is. Overal waar de kaart een ster neerzet of een halte goud maakt
   hoort dit getal, en niet p.level zelf. */
function hereLevel(p) { return Math.max(1, Math.min(p.level, WORLD_LAST)); }
/* Welke werelden dit kind al een keer in beeld heeft gehad. Het enige nieuwe dat
   er opgeslagen wórdt, en alleen omdat er geen andere manier is om één vraag te
   beantwoorden: is deze wereld nieuw vóór je? Bij het uitspelen van een wereld
   is dat nog uit de sprong af te leiden (zie runTravel), maar bij een wereld die
   maanden later wordt uitgebracht is er geen sprong -- het kind stond al stil.

   Op id en niet op nummer: een wereld hernoemen of er een tekening bij zetten mag
   nooit een onthulling opnieuw laten spelen, en een wereld met een ander id is
   een andere wereld. */
function worldSeen(p, i) {
  const w = WORLDS[i];
  return !!w && (p.worldsSeen || []).indexOf(w.id) >= 0;
}
function markWorldSeen(p, i) {
  const w = WORLDS[i];
  if (!w || worldSeen(p, i)) return;
  if (!p.worldsSeen) p.worldsSeen = [];
  p.worldsSeen.push(w.id);
  save();
}
/* ================= Wereldbeloningen (fase 4D.1) ============================
   Twee mijlpalen per wereld, en elk krijgt precies één ding:

     wereld uit        -> het spulletje uit WORLDS.beloning (de kleedkamer)
     perfecte wereld   -> de trofee 'perfect-<wereld>' (de kast)

   "Wereld uit" en "perfect" worden hier niet opnieuw uitgerekend: ze komen uit
   worldProgress(), dezelfde teller waar de kaart, de reis en de wereldbadge al op
   staan. Er komt dus geen tweede waarheid bij over wat af is.

   EN ER KOMT OOK GEEN VLAGGETJE BIJ dat zegt "deze beloning is al gegeven". Dat
   staat er namelijk al: het spulletje staat in p.owned en de trofee in p.trophies.
   Dát is het bewijs, en het is meteen het bewijs dat de kleedkamer en de kast
   toch al gebruiken. Een los 'beloond'-lijstje ernaast kan alleen maar uit de pas
   gaan lopen -- bijvoorbeeld als een back-up van vóór deze fase wordt teruggezet.

   Daardoor is uitdelen vanzelf één keer: heeft ze het al, dan gebeurt er niets.
   Een show overdoen, een wereld overdoen, de app opnieuw openen, een oude save --
   allemaal hetzelfde antwoord. */
// Het beloningsitem van een wereld, of null. Onbekend id = null: een wereld mag
// naar een spulletje wijzen dat (nog) niet bestaat zonder de app te breken.
function beloningItem(w) { return (w && w.beloning) ? (item(w.beloning) || null) : null; }
// Andersom: van welke wereld komt dit spulletje? Puur afgeleid uit WORLDS, zodat er
// geen tweede lijst is die bijgewerkt moet worden als er een wereld bijkomt.
// Geeft de wereld terug (niet de index): de kleedkamer wil de naam en het icoon.
function beloningWereld(itemId) { return WORLDS.filter(w => w.beloning === itemId)[0] || null; }
// Te koop of te verdienen? Alles wat een wereld uitdeelt staat níét in de winkel.
function isBeloning(itemId) { return !!beloningWereld(itemId); }
/* ---- De wereldschatten: dezelfde beloningen, als één verzameling -----------
   FASE 6E. Ze lagen tot nu toe tussen de accessoires: achteraan de lade, op slot,
   met een prijsloos pilletje ertussen de prijzen. Daardoor waren ze precies dat
   wat ze niet zijn -- winkelwaar die toevallig niet te koop is. De kleedkamer
   heeft er nu een eigen vakje voor ("✨ Wereldschatten · 3/6", zie renderShop) en
   dit is wat dat vakje leest.

   Er komt geen tweede waarheid bij. Wélke er zijn staat in WORLDS.beloning en
   welke je hebt in p.owned -- allebei stonden ze er al, en allebei blijven ze
   waar ze staan. Dit zet ze alleen op een rijtje.

   Alleen uitgebrachte werelden (worldAvailable, dezelfde grens als waar
   grantWorldRewards op uitdeelt): een wereld die wel geschreven maar nog niet
   uitgebracht is, hoort niet als raadsel op de plank te liggen -- en zou het
   totaal laten oplopen naar een getal dat vandaag niemand vol kan maken. Een
   wereld zonder beloning, of met een beloning die naar een onbekend item wijst,
   valt er vanzelf uit: dan is er niets te tonen.

   De volgorde is die van de tournee en niet die van bezit. Dit is een verzameling
   en geen rek: plek 1 is de eerste wereld, vandaag en over drie werelden nog. */
function wereldSchatten() {
  return WORLDS
    .map((w, i) => ({ wereld: w, index: i, item: beloningItem(w) }))
    .filter(s => s.item && worldAvailable(s.index));
}
// Het getal achter de ✨: hoeveel er verdiend zijn van hoeveel er te verdienen
// zijn. Afgeleid, elke keer opnieuw -- er wordt niets van geteld bewaard.
function schatStand(p) {
  const alles = wereldSchatten();
  const heeft = alles.filter(s => (p.owned || []).includes(s.item.id)).length;
  return { heeft, totaal: alles.length };
}
// De trofee-id van de perfecte wereld: op het wereld-id, dus een wereld hernoemen
// raakt een al behaalde trofee niet (alleen een gewijzigd id maakt een nieuwe).
const PERFECT_BADGE = 'perfect-';
/* Een trofee rechtstreeks toekennen, zonder de omweg langs 'klaar om te openen'.
   De gewone weg is checkTrophies -> readyTrophies -> het kind opent hem zelf in de
   kast, en die blijft voor álle andere trofeeën gelden. De perfecte wereld is de
   uitzondering, en met reden: die krijgt op het moment zelf zijn eigen onthulling
   (zie wereldFeest). Zou hij daarnáást ook nog als cadeautje in de kast liggen,
   dan is het twee keer dezelfde trofee -- één keer gevierd en één keer nog te
   openen. Geeft terug of er nu echt iets bijgekomen is. */
function awardTrophy(p, id) {
  if (!p.trophies) p.trophies = [];
  if (p.trophies.includes(id)) return false;
  p.readyTrophies = (p.readyTrophies || []).filter(x => x !== id);
  p.trophies.push(id);
  return true;
}
/* Wat deze wereld dit kind nú nog schuldig is. Deelt uit wat er te geven valt en
   zegt wat er bijgekomen is -- niet wat er al stond. Roep 'm gerust vaker aan:
   de tweede keer is hij leeg.

   Bewaart zelf niet. De aanroeper bepaalt wanneer er een save() volgt -- bij een
   show is dat de save() die er toch al staat, bij het inladen die van load(). */
function grantWorldRewards(p, i) {
  const uit = { spul: null, perfect: null };
  if (!worldAvailable(i)) return uit;
  if (!p.owned) p.owned = [];   // half-kapotte back-up: liever niets uitdelen dan omvallen
  const w = WORLDS[i];
  const v = worldProgress(p, worldForIndex(i));
  if (v.uit) {
    const it = beloningItem(w);
    if (it && !p.owned.includes(it.id)) { p.owned.push(it.id); uit.spul = it; }
  }
  if (v.vol) {
    const id = PERFECT_BADGE + w.id;
    if (awardTrophy(p, id)) uit.perfect = TROPHIES.find(t => t.id === id) || null;
  }
  return uit;
}
/* Alles wat dit kind al verdiend had voordat deze fase bestond. Draait bij het
   inladen (zie migrate) en is met opzet stil: wie vijf werelden uit heeft hoort
   vijf spulletjes in haar kleedkamer te vinden, en niet vijf feestjes op de rij
   af te moeten tikken voor ze weer mag spelen.

   Het is geen eenmalige migratie maar een vangnet dat elke keer draait, en dat is
   het hele idee: er is niets te migreren omdat er niets bijgehouden wordt. Gaat er
   ooit een feestje verloren (de app wordt tussen de show en de kaart door
   weggeklikt), dan staat het spulletje er de volgende ochtend alsnog. */
function grantHistoricRewards(p) {
  for (let i = 0; i < WORLD_AVAIL; i++) grantWorldRewards(p, i);
}

/* De perfecte werelden. Eén trofee per wereld, uit WORLDS opgebouwd: "overal drie
   sterren in deze wereld". Dit is de grootste prijs die het spel te geven heeft,
   en sinds fase 5C de enige wereldtrofee.

   Er hing hier tot fase 5C een tweede kaartje per wereld: de wereldbadge
   (wereld-<id>, "deze wereld uit"). Die is met pensioen omdat een uitgespeelde
   wereld al een eigen beloning heeft -- een echt spulletje voor de kleedkamer,
   uitgedeeld met een feestje (zie grantWorldRewards). Dezelfde mijlpaal twee keer
   belonen maakt geen van beide bijzonderder, en het zette bovendien twee keer
   dezelfde wereldnaam in de kast: een kind moest dan uitzoeken welke van de twee
   ze nu bedoelde. Nu is er per wereld één kaartje en één vraag. WERELD_BADGE
   blijft bestaan omdat behaalde badges nog in oude saves staan; isRetiredTrophy
   herkent ze aan dit voorvoegsel.

   Opnieuw opbouwen kan, want de studio mag werelden toevoegen of hernoemen.
   Behaalde trofeeën staan in p.trophies op id, dus een wereld hernoemen raakt een
   al behaalde trofee niet -- alleen een gewijzigd wereld-id maakt een nieuwe.

   De wereld zelf gaat als `wereld` mee op de trofee. De kast tekent de perfecte
   werelden als wereld-eigen medaillons (icoon + themakleuren, zie perfectCardHTML);
   zonder dit veld zou die kaart het wereld-id uit de trofee-id moeten terugpellen,
   en dan is er ineens een tweede plek die weet hoe zo'n id in elkaar zit. */
const WERELD_BADGE = 'wereld-';
function rebuildWorldBadges() {
  for (let i = TROPHIES.length - 1; i >= 0; i--) {
    const id = TROPHIES[i].id;
    if (id.indexOf(WERELD_BADGE) === 0 || id.indexOf(PERFECT_BADGE) === 0) TROPHIES.splice(i, 1);
  }
  const perfectIds = [];
  WORLDS.forEach((w, i) => {
    const pid = PERFECT_BADGE + w.id;
    perfectIds.push(pid);
    TROPHIES.push({
      id: pid, emoji: w.icon || '🌍', name: w.name, desc: 'Overal drie sterren',
      wereld: w, perfect: true,
      has: q => worldProgress(q, worldForIndex(i)).vol,
      ster: () => true,   // behaald = altijd de gouden rand: dát is wat perfect hier is
      progress: q => {
        const v = worldProgress(q, worldForIndex(i));
        return trophyProgress(v.perfect, v.levels, 'shows perfect');
      },
    });
  });
  const perfectPlank = TROPHY_SHELVES.filter(sh => sh.key === 'perfect')[0];
  if (perfectPlank) perfectPlank.ids = perfectIds;
}

/* De pedagogische klok. Dit was `ronde` in cityFor en stuurt wannéér de extra
   uitdagingen mogen verschijnen: zoek-het-getal vanaf ronde 3, drie-getallen
   vanaf ronde 4 (zie opReady/chainReady). BEWUST losgekoppeld van de wereld-
   indeling: een ronde is 12 optredens en een wereld is er 8, dus die twee door
   elkaar halen zou allebei die uitdagingen ineens acht shows te vroeg laten
   beginnen -- een stille verandering in wanneer een zesjarige voor het eerst
   "3 + ▢ = 7" ziet. Verander dit getal alleen met opzet. */
const ROUND_LEN = 12;
function tourRound(lvl) { return Math.floor((lvl - 1) / ROUND_LEN) + 1; }

/* ================= Trofeeën =================
   FASE 5C -- de kast is uitgedund. Er stonden 42 trofeeën op acht planken, en dat
   was geen kast meer maar een lijst met alles wat het spel toevallig kon tellen:
   drie shows, vijf shows, tien shows, 12/30/60 sterren, 100 diamanten, 250
   diamanten, 10 spulletjes, 25 spulletjes, en per categorie nog een "koop ze
   allemaal". Wie zo'n lijst opent ziet werk liggen; wie een kast opent ziet wat
   ze gewonnen heeft.

   De regel die alles hier bepaalt: een trofee mag alleen bestaan als hij iets
   viert waar een kind trots op is. Een teller die vanzelf oploopt is dat niet.
   Concreet weggevallen (zie RETIRED_TROPHIES):
     - tussenstappen die niets toevoegen (3 shows, show 5, show 10, 250 sommen,
       3 perfecte shows, 25 extra shows)
     - de zes "wereld uitgespeeld"-badges: een uitgespeelde wereld gééft al een
       spulletje en een feestje (zie grantWorldRewards). Twee keer dezelfde
       mijlpaal belonen maakt geen van beide bijzonderder. Perfect blijft.
     - de sterrentotalen 12/30/60: dat ís de ster-status-ladder (zie RANK_TIERS),
       letterlijk dezelfde drempels met dezelfde namen. Een tweede kaartje ernaast
       voegt geen prestatie toe, alleen een tweede plek waar hetzelfde staat.
     - de twee diamantsaldo's: die leerden precies het verkeerde. Diamanten zijn
       er om uit te geven in de kleedkamer; een trofee voor "niet uitgegeven"
       straft het kind dat doet waar de munt voor is.
     - de vijf "alle kleren/schoenen/haarkleuren/instrumenten/dieren": die
       betekenen iets anders zodra er één item bijkomt, en ze waren in de
       praktijk een winkellijst. Er blijft één rustige verzamelmijlpaal over.
     - 'Kast vol!': zie RETIRED_TROPHIES.

   Wat blijft heeft een van deze vier vormen: een eerste keer (die vergeet je
   nooit), een lange rekenweg, een perfecte wereld, of één rustige mijlpaal in
   het sterrenleven. Id's blijven ongewijzigd, dus wie een trofee al had houdt 'm.

   Over voortgang: `progress` is er alleen waar het getal zélf iets zegt
   ("82 / 100 sommen"). Trofeeën die één keer gebeuren (eerste show, eerste
   toegift, eerste perfecte show) hebben er geen -- "0 / 1" is geen voortgang,
   dat is alleen de mededeling dat het nog niet gebeurd is. */
const TROPHIES = [
  // 🎤 Avontuur — de momenten die je je herinnert
  { id: 'first',      emoji: '🎫', name: 'Eerste optreden', desc: 'Je allereerste show',   has: p => playedCount(p) >= 1 },
  { id: 'toegift',    emoji: '🎉', name: 'Extra show!',     desc: 'Je eerste extra show',  has: p => (p.encores || 0) >= 1 },
  { id: 'perfect1',   emoji: '⭐', name: 'Sterrenhit',      desc: 'Je eerste show met 3 sterren', has: p => perfectCount(p) >= 1 },
  /* Was "alle 12 steden", daarna "elke geschreven wereld uitgespeeld", en dat
     blijft het. Komt er een wereld bij, dan gaat deze trofee weer open staan --
     en dat hoort ook: de tournee is dan niet meer uit. */
  { id: 'worldtour',  emoji: '🌍', name: 'Wereldtournee',   desc: 'Alle werelden uitgespeeld', has: p => allWorldsDone(p), progress: p => trophyProgress(doneWorldCount(p), WORLD_AVAIL, 'werelden uit') },
  // 🧮 Rekenkracht — de lange weg (stats.correct telt elk goed antwoord)
  { id: 'sums25',   emoji: '🔢', name: 'Rekenritme',   desc: '25 sommen goed',   has: p => p.stats.correct >= 25, progress: p => trophyProgress(p.stats.correct, 25, 'sommen goed') },
  { id: 'sums100',  emoji: '🧮', name: 'Rekenkanjer',  desc: '100 sommen goed',  has: p => p.stats.correct >= 100, progress: p => trophyProgress(p.stats.correct, 100, 'sommen goed') },
  { id: 'sums500',  emoji: '✏️', name: 'Rekenmeester', desc: '500 sommen goed',  has: p => p.stats.correct >= 500, progress: p => trophyProgress(p.stats.correct, 500, 'sommen goed') },
  { id: 'sums1000', emoji: '🎓', name: 'Rekenlegende', desc: '1000 sommen goed', has: p => p.stats.correct >= 1000, progress: p => trophyProgress(p.stats.correct, 1000, 'sommen goed') },
  { id: 'gold5',    emoji: '🌟', name: 'Goudzoeker',   desc: '5 gouden vragen',  has: p => p.goldHits >= 5, progress: p => trophyProgress(p.goldHits, 5, 'gouden vragen goed') },
  { id: 'gold20',   emoji: '👑', name: 'Gouden kroon', desc: '20 gouden vragen', has: p => p.goldHits >= 20, progress: p => trophyProgress(p.goldHits, 20, 'gouden vragen goed') },
  // ✨ Sterrenleven — twee rustige mijlpalen naast de rest
  { id: 'perfect10',  emoji: '💿', name: 'Platina plaat', desc: '10 shows met 3 sterren', has: p => perfectCount(p) >= 10, progress: p => trophyProgress(perfectCount(p), 10, 'perfecte shows') },
  /* De enige koop-trofee die overblijft, en met opzet de láágste drempel van de
     twee die er stonden (10, niet 25): een vrolijke "je hebt je eigen stijl"-tik,
     geen winkelopdracht. Zelfde id en zelfde voorwaarde als voorheen, dus wie hem
     al had houdt hem. boughtCount telt startspullen en wereldbeloningen niet mee.
     `naar` is de kleedkamercategorie die een tik op dit kaartje opent: dit is de
     enige trofee waarvoor je ergens anders in de app moet zijn, dus wijst hij de
     weg (zie tapTrophy). */
  { id: 'shopper',    emoji: '🛍️', name: 'Verzamelaar',  desc: '10 spulletjes gekocht',  naar: 'dress',
    has: p => boughtCount(p) >= 10, progress: p => trophyProgress(boughtCount(p), 10, 'spulletjes gekocht') },
  // 🥇 Perfecte werelden — één per wereld, aangelegd door rebuildWorldBadges()
];
/* De kast heeft vier planken, en niet meer. Elke plank is één soort prestatie, zodat
   een kind aan de kop al ziet waar ze naar kijkt -- en zodat er geen plank is die
   bestaat omdat er nog trofeeën over waren.

   De volgorde is de volgorde waarin je ze tegenkomt: eerst wat je meemaakt, dan de
   lange rekenweg, dan de zes grote prijzen, en helemaal onderaan het sterrenleven. */
/* `ico` staat los van `name` sinds de kopregel van een groep uit drie cellen
   bestaat (icoon | naam + regeltje | stand). Stond het emoji nog vóór de naam in
   dezelfde string, dan zou het meeschuiven met de tekst en niet op één lijn staan
   met de iconen van de andere groepen -- en dat is nu juist wat de kolom rustig
   maakt. Een groep erbij heeft dus één veld meer, en verder niets. */
const TROPHY_SHELVES = [
  { key: 'avontuur', ico: '🎤', name: 'Avontuur',          note: 'De momenten die je je blijft herinneren',
    ids: ['first', 'toegift', 'perfect1', 'worldtour'] },
  { key: 'rekenen',  ico: '🧮', name: 'Rekenkracht',       note: 'Elke goede som telt mee, je hele leven lang',
    ids: ['sums25', 'sums100', 'sums500', 'sums1000', 'gold5', 'gold20'] },
  /* De grote prijzen. De lijst wordt gevuld door rebuildWorldBadges() -- de werelden
     staan in WORLDS en kunnen in de studio veranderen, dus hier hardcoderen zou
     meteen uit de pas lopen. De `key` is waar die functie deze plank aan herkent. */
  { key: 'perfect',  ico: '🥇', name: 'Perfecte werelden', note: 'Overal drie sterren: de grootste prijs van het spel',
    ids: [] },
  { key: 'sterren',  ico: '✨', name: 'Sterrenleven',      note: 'Voor een echte popster',
    ids: ['perfect10', 'shopper'] },
];
/* Trofeeën met pensioen.
   Een kind dat zo'n trofee ooit behaald heeft, heeft die id nog in p.trophies
   staan. Die lijst blijft onaangeroerd (geen migratie, geen verlies); deze set
   zorgt alleen dat zo'n id niet meetelt in de kastteller, niet getekend wordt en
   niet als "klaar" blijft liggen. Zolang er saves in omloop zijn blijft deze
   lijst staan -- ook al staat er geen enkele definitie meer tegenover.

   Er is bewust géén opruimstap bij het inladen. Een id dat hier staat kost niets
   in een save, en een save die door een oudere versie van de app is gemaakt of
   teruggezet komt er zonder kleerscheuren doorheen. Wie een gepensioneerde trofee
   ooit behaald heeft raakt hem dus niet kwijt; hij is alleen niet meer te zien. */
const RETIRED_TROPHIES = new Set([
  // fase 1/2 -- looks en podia zijn uit het spel
  'podiumbouwer',
  'magicus', 'thuismatch', 'rockster', 'discodiva', 'prinses', 'ruimteheld',
  'winter', 'jungle', 'zeemeermin', 'regenboogster', 'diamantster', 'festivaldj', 'vuurshow',
  // fase 4D.1 -- opgegaan in de perfecte-wereldtrofee van wereld 1 ('perfect-muziek')
  'perfecttour',
  /* fase 5C -- de grote opschoning. Per regel: waarom weg.
     tussenstappen zonder eigen betekenis */
  'rookie3', 'city5', 'city10', 'sums250', 'perfect3', 'toegift25',
  // de sterrentotalen: dat is de ster-status-ladder, niet een tweede prijzenkast
  'stars15', 'stars30', 'rankstad',
  // diamantsaldo: beloonde het niet-uitgeven van de munt waar de kleedkamer op draait
  'rich', 'diamond250',
  // de lange winkelgrind; 'shopper' (10 spulletjes) blijft als enige koop-mijlpaal
  'collector',
  // "koop alles uit deze categorie": betekent iets anders zodra er één item bijkomt
  'modekoningin', 'schoenenkast', 'haarstylist', 'orkest', 'dierenkoning',
  /* 'Kast vol!' -- alle andere trofeeën. Dat was geen voorwaarde maar een
     rekensom over de kast zelf: elke trofee die erbij kwam maakte hem zwaarder,
     elke trofee die met pensioen ging lichter, en hij moest de laatste in de
     tabel zijn omdat checkTrophies op volgorde toekent. Een prijs waarvan de
     prijsvraag verandert als je er een kaartje naast hangt is geen prijs.
     De zes perfecte werelden zijn nu het einddoel, en die vraag staat vast. */
  'kastvol',
]);
/* De zes "wereld uitgespeeld"-badges staan niet als losse id's hierboven: ze
   heten wereld-<wereldid> en er kan er altijd een bijkomen (de studio schrijft
   WORLDS). Op het voorvoegsel is daarom de enige stand die niet verloopt --
   een zevende wereld hoeft niet aan een lijstje toegevoegd te worden om níet
   terug te komen in de kast. */
function isRetiredTrophy(id) { return RETIRED_TROPHIES.has(id) || String(id).indexOf(WERELD_BADGE) === 0; }
// De zichtbare kast: alles behalve de gepensioneerde. Bewust een functie en geen
// vaste lijst -- rebuildWorldBadges() verandert TROPHIES nog nadat dit bestand is
// ingelezen (en de wereldstudio kan dat later nog eens doen).
function activeTrophies() { return TROPHIES.filter(t => !isRetiredTrophy(t.id)); }
// Hoeveel van de zichtbare kast dit kind al heeft. Gepensioneerde id's in p.trophies
// tellen niet mee -- dat is precies wat "met pensioen" betekent.
function earnedActiveCount(p) { return p.trophies.filter(id => !isRetiredTrophy(id)).length; }
rebuildWorldBadges();   // de perfecte werelden erbij, nu de tabel en de planken er staan
/* De sterren van de oude oneindige staart (zie migrate). Ze horen bij geen enkele
   wereld meer -- hun levelnummers zijn teruggegeven aan de werelden die daar ooit
   komen -- maar ze zijn wél verdiend, dus ze blijven meetellen in alles wat over
   de héle carrière gaat: het sterrentotaal, de rang, de shows-trofeeën. Voor een
   kind dat nooit zo ver kwam is dit een leeg kaartje en verandert er niets. */
function tourStarValues(p) { return Object.values(p.tourStars || {}); }
function allStarValues(p) { return Object.values(p.stars).concat(tourStarValues(p)); }
function playedCount(p) { return Object.keys(p.stars).length + tourStarValues(p).length; }
function perfectCount(p) { return allStarValues(p).filter(s => s === 3).length; }
function totalStarCount(p) { return allStarValues(p).reduce((a, b) => a + b, 0); }
// Hoeveel beschikbare werelden dit kind echt uitgespeeld heeft (voor de teller op
// de Wereldtournee-trofee, en straks voor de wereldladder).
function doneWorldCount(p) { let n = 0; for (let i = 0; i < WORLD_AVAIL; i++) if (worldDone(p, i)) n++; return n; }
// Gratis startspullen tellen niet als "gekocht" -- en sinds fase 4D.1 de spulletjes
// die een wereld uitdeelt ook niet: die zijn verdiend, niet gekocht, en zouden de
// shop-trofeeën anders zes stuks cadeau doen.
function boughtCount(p) {
  return Math.max(0, p.owned.filter(id => !isBeloning(id)).length - (p.freebies || 5));
}

/* ================= Sterrencarrière ================= */
// Eén doorlopende carrièreladder op basis van álle verdiende sterren (over alle
// tournees heen). Elke show geeft sterren, dus de rang-balk beweegt altíjd —
// hét lange-termijndoel dat nooit "op" is. Elke rang omhoog geeft een diamant-
// bonus, zodat het lange sparen óók de kleedkamer blijft voeden. Hergebruikt het
// bestaande sterren-systeem volledig: geen nieuwe munt, verzameling of scherm.
const RANK_TIERS = [
  { min: 0,   name: 'Straatartiest', emoji: '🎤', bonus: 0 },
  { min: 12,  name: 'Lokale ster',   emoji: '⭐', bonus: 10 },
  { min: 30,  name: 'Clubster',      emoji: '🎶', bonus: 15 },
  { min: 60,  name: 'Stadsster',     emoji: '🏙️', bonus: 20 },
  { min: 100, name: 'Radioster',     emoji: '📻', bonus: 30 },
  { min: 150, name: 'Toursensatie',  emoji: '✈️', bonus: 40 },
  { min: 220, name: 'Platinaster',   emoji: '💿', bonus: 50 },
  { min: 300, name: 'Wereldlegende', emoji: '👑', bonus: 60 },
];
const RANK_STEP = 100;   // na Wereldlegende: elke +100 sterren een nieuwe ⭐-tier
// Rang-beschrijving voor een bepaald sterrentotaal, inclusief de open-einde
// "Wereldlegende ⭐×N"-tiers voorbij de laatste vaste rang. idx is doorlopend
// (0,1,2,…) zodat we een rang-stijging betrouwbaar kunnen herkennen.
function starRank(total) {
  let i = 0;
  for (let k = 0; k < RANK_TIERS.length; k++) if (total >= RANK_TIERS[k].min) i = k;
  const base = RANK_TIERS[i];
  const last = RANK_TIERS.length - 1;
  if (i < last) {
    const nxt = RANK_TIERS[i + 1];
    return { idx: i, name: base.name, emoji: base.emoji, curMin: base.min, nextMin: nxt.min, nextName: nxt.name };
  }
  // open einde: Wereldlegende ⭐2, ⭐3, …
  const over = Math.floor((total - base.min) / RANK_STEP);
  const curMin = base.min + over * RANK_STEP;
  const stars = over + 1;
  return {
    idx: last + over, emoji: base.emoji,
    name: over === 0 ? base.name : `${base.name} ⭐${stars}`,
    curMin, nextMin: curMin + RANK_STEP, nextName: `${base.name} ⭐${stars + 1}`,
  };
}
function rankBonusFor(idx) { return RANK_TIERS[Math.min(idx, RANK_TIERS.length - 1)].bonus; }
// Na het verdienen van sterren: is de speler een rang gestegen? Zo ja, keer de
// bonus(sen) uit (één keer — p.rankSeen onthoudt de hoogst bereikte rang) en
// geef terug wat er gehaald is voor een feestje op het eindscherm.
function checkRankUp(p) {
  const r = starRank(totalStarCount(p));
  if (p.rankSeen == null) p.rankSeen = r.idx;
  if (r.idx > p.rankSeen) {
    let bonus = 0;
    for (let k = p.rankSeen + 1; k <= r.idx; k++) bonus += rankBonusFor(k);
    p.rankSeen = r.idx;
    p.diamonds += bonus;
    return { rank: r, bonus };
  }
  return null;
}
function trophyProgress(value, target, label) {
  const now = Math.max(0, Math.min(value, target));
  return { now, target, label, pct: Math.round((now / target) * 100) };
}
// Kent nieuwe trofeeën toe; geeft de namen van nieuw behaalde terug.
// Legt trofeeën die de voorwaarde net halen 'klaar' (readyTrophies) zodat het
// kind ze zelf mag openen. Behaalde (geclaimde) blijven staan. Geeft de trofeeën
// terug die nét klaar zijn komen te liggen.
function checkTrophies(p) {
  if (!p.readyTrophies) p.readyTrophies = [];
  const nieuw = [];
  for (const t of TROPHIES) {
    if (isRetiredTrophy(t.id)) continue;   // uit het zicht = ook niet meer klaarleggen
    if (!p.trophies.includes(t.id) && !p.readyTrophies.includes(t.id) && t.has(p)) {
      p.readyTrophies.push(t.id);
      nieuw.push(t);
    }
  }
  return nieuw;
}

/* ================= Opslag ================= */
const LS_KEY = 'rekenPopsterren_v1';
// De telmodus-voorinstelling: lees-vrij, met een kortere ronde (5 vragen) die bij
// kleuters beter past. Dit is wat een ster krijgt die bij het maken "Leren tellen"
// kiest; anders start ze gewoon in de rekenmodus.
const COUNT_STAGE_MAX = 11;  // 11 fases: tellen → vergelijken → cijfers → redeneren → gesteunde sommen (tekens → cijfers+stippen → geschreven)
const DEFAULT_PERLEVEL = 8;  // vragen per optreden in de rekenmodus (de telmodus heeft er 5, zie COUNT_OPTS)
const COUNT_OPTS = { track: 'count', stage: 1, stageMax: COUNT_STAGE_MAX, repr: 'objects', numerals: true, perLevel: 5, qmax: 10 };
// Wie je bent kies je bij het maken; wat je wordt koop je in de kleedkamer.
// Vandaar alleen de gewone kleuren hier -- de fantasiekleuren en de patronen
// blijven iets om naartoe te sparen.
const START_HAIR  = ['hair_blond', 'hair_bruin', 'hair_zwart', 'hair_wit', 'hair_rood'];
const START_DRESS = ['dress_roze', 'dress_paars', 'dress_geel', 'dress_blauw', 'dress_groen'];
const MAX_PROFILES = 6;
function defaultProfile(name, dress, opts) {
  opts = opts || {};
  // Gratis starthaar en -kleren zodat elke ster er meteen anders uitziet, zonder de
  // winkelprijs van die items te veranderen. freebies telt ze mee, dus
  // "spulletjes gekocht" begint gewoon op 0.
  const hair = opts.hair || 'hair_blond';
  const owned = ['hair_blond', 'dress_roze', 'dress_paars', 'shoes_roze', 'stage_disco'];
  if (dress && !owned.includes(dress)) owned.push(dress);
  if (hair && !owned.includes(hair)) owned.push(hair);
  return {
    name: name,
    // Welke basisfiguur getekend wordt (zie BASES). Gaat via opts en niet als
    // extra positie-argument: defaultProfile(name, kleren, opts) is de vorm waar
    // de drie testsuites op staan.
    base: BASES[opts.base] ? opts.base : DEFAULT_BASE,
    diamonds: 30,
    level: 1,
    stars: {},
    owned: owned,
    freebies: owned.length,   // aantal gratis startspullen (5, of 6 met bonusoutfit) — basis voor "gekocht"
    equipped: { hair: hair, dress: dress, shoes: 'shoes_roze', mic: null, instrument: null, acc: null, pet: null, stage: 'stage_disco' },
    // Wie ze is, los van wat ze nu toevallig draagt -- zodat "opnieuw beginnen"
    // haar teruggeeft zoals ze gemaakt is en niet als een blonde vreemde.
    // Bewust NIET bijgevuld in migrate(): bestaande profielen houden zo exact hun
    // oude gedrag via de || -ketens hieronder.
    startHair: hair, startDress: dress,
    // ---- Instellingen ----
    // track: 'math' = de gewone rekenshow · 'count' = de lees-vrije telmodus voor
    // kleuters (gesproken opdrachten, hoeveelheden i.p.v. cijfers). De telmodus
    // heeft eigen velden (stage-bereik, weergave, cijfers-aan/uit, kortere ronde).
    // opts mag élke instelling meegeven: dat is wat een wis-actie moet kunnen
    // bewaren (zie set-reset). De fallbacks zijn exact de oude vaste waarden.
    // .slice() op de lijstjes: anders deelt het verse profiel zijn array met het
    // profiel dat we net weggooien, en werken ze elkaar later bij.
    settings: {
      ops: opts.ops ? opts.ops.slice() : ['+', '-'],
      max: opts.max || 20,
      tables: opts.tables ? opts.tables.slice() : [2, 5, 10],
      mode: opts.mode || 'kies',
      perLevel: opts.perLevel || DEFAULT_PERLEVEL,
      missNum: opts.missNum !== false,
      chain3: opts.chain3 !== false,
      track: opts.track || 'math',
      stage: opts.stage || 1,                       // laagste (start)fase in de telmodus
      stageMax: opts.stageMax || COUNT_STAGE_MAX,   // hoogste toegestane fase
      repr: opts.repr || 'objects',                 // antwoordweergave: 'objects' of 'dots'
      numerals: opts.numerals !== false,            // fase 6 (cijfers) toestaan
      qmax: opts.qmax || 10,                         // hoogste hoeveelheid waar het spel naartoe mag groeien (6/8/10)
      memory: opts.memory !== false                 // memory-spelletje op de kaart (standaard aan)
    },
    trophies: [], readyTrophies: [], goldHits: 0, encores: 0,
    // FASE 4A. tourStars blijft bij een verse ster voorgoed leeg -- het is de
    // bewaarplek voor sterren uit de oude oneindige staart (zie migrate).
    // worldsSeen vult zich vanzelf: de kaart zet er elke wereld in die ze opent.
    tourStars: {}, worldsSeen: [],
    rankSeen: 0,   // hoogst uitbetaalde carrièrerang (zie checkRankUp) — voorkomt dubbele bonus
    perf: 0.5,  // lopende inschatting van vaardigheid (0..1), stuurt de moeilijkheid bij
    weak: {},   // zwakke sommen: "7 × 8 = @" -> { ans, op, w } om gericht te herhalen
    learned: {},// geoefende sommen in onderhoud: "7 × 8 = @" -> { ans, op, iv, due }
    // per-bewerking-beheersing (klaarheid extra uitdagingen) + frequentie-trappen
    opTrack: {},                                    // op -> { n, acc, paused, unlockRound }
    missRamp: { rung: 1, hot: 0 },                  // zoek-het-getal: 1 of 2 per optreden
    chainTrack: { seen: 0, acc: 0.5, paused: false, rung: 1, hot: 0 },  // drie getallen
    // telmodus: welke fase het kind nú speelt (klimt mee met de beheersing, binnen
    // het door de ouder toegestane bereik) + een lopende nauwkeurigheid voor die klim
    // rung = moeilijkheidstrap bínnen de fase (past bereik, afleiders, cijfersteun aan);
    // streak = juiste-op-rij in de show (stuurt de rung omhoog), reset bij een misser
    countTrack: { stage: opts.stage || 1, rung: 0, streak: 0, seen: 0, acc: 0.5 },
    stats: { correct: 0, wrong: 0 }   // voor het ouder-overzicht
  };
}
// Zorgt dat oudere opgeslagen profielen de nieuwe velden krijgen.
function migrate(p) {
  if (!p.trophies) p.trophies = [];
  // Bestaande spelers: alles wat al behaald is blijft 'behaald' (staat in trophies).
  // readyTrophies begint leeg; alleen echt nog-niet-geclaimde-maar-gehaalde trofeeën
  // komen daarna 'klaar' te liggen — geen plotse muur van "Klaar!" voor oude saves.
  if (!p.readyTrophies) p.readyTrophies = [];
  // FASE 1: lag er nog een trofee klaar die intussen met pensioen is (thema-look of
  // Podiumbouwer)? Die kaart staat niet meer in de kast, dus openen kan niet meer --
  // en zonder dit zou het rode stipje op het Trofeeën-tabblad eeuwig blijven staan.
  // Alleen uit het 'klaar'-lijstje; wat al behaald is (p.trophies) blijft onaangeroerd,
  // en komt een trofee ooit terug, dan legt checkTrophies hem gewoon opnieuw klaar.
  p.readyTrophies = p.readyTrophies.filter(id => !isRetiredTrophy(id));
  if (p.goldHits == null) p.goldHits = 0;
  if (p.encores == null) p.encores = 0;
  /* ---- FASE 4A: de oneindige staart opruimen -------------------------------
     Tot en met fase 3 liep de tournee voorbij de laatste geschreven wereld gewoon
     door: level 49 en verder heetten "Sterrentournee" en waren geen echte wereld.
     Een kind kon daar sterren verdienen. Die sterren staan op levelnummers die
     later door een échte wereld opgeeist worden -- en dan zou wereld 7 bij het
     eerste openen al (deels) uitgespeeld lijken, zonder dat er ooit een show van
     gespeeld is. Precies de bug die deze fase wegneemt.

     Dus één keer, hier: die sterren gaan uit p.stars naar p.tourStars. Ze blijven
     staan (niets wordt weggegooid) en blijven meetellen in het sterrentotaal, de
     rang en de shows-trofeeën -- zie allStarValues. Alleen hun levelnummers zijn
     vrij, en dat is het hele punt.

     LEGACY_TOUR_END is 48 en verandert nooit meer: het is het laatste level dat
     bestond op de dag dat de staart verdween, en dus geschiedenis. Het mag geen
     WORLD_LAST worden -- die groeit mee met elke nieuwe wereld, en dan zou deze
     lus bij een latere versie de échte sterren van wereld 7 alsnog opruimen.

     Het bestaan van p.tourStars is meteen de stempel: is het kaartje er, dan is
     dit profiel al langs deze regel geweest en blijft alles daarna met rust. */
  if (p.tourStars == null) {
    p.tourStars = {};
    for (const k of Object.keys(p.stars)) {
      const lvl = Number(k);
      if (!(lvl > LEGACY_TOUR_END)) continue;
      p.tourStars[k] = p.stars[k];
      delete p.stars[k];
    }
    // ...en de positie mee: één voorbij het laatste level dat bestaat is "alles
    // uit". Verder dan dat kon alleen de staart, en die is er niet meer.
    if (p.level > LEGACY_TOUR_END + 1) p.level = LEGACY_TOUR_END + 1;
  }
  /* Welke werelden al een keer in beeld zijn geweest (zie worldSeen). Een
     bestaand profiel heeft alles t/m de wereld waar het nu staat al gezien -- dus
     dat zetten we hier éénmalig neer, precies zoals readyTrophies dat doet: geen
     plotse rij onthullingen voor een save die gewoon verder wil spelen. */
  if (!p.worldsSeen) {
    p.worldsSeen = [];
    const tot = Math.min(WORLD_AVAIL - 1, worldFor(p.level).index);
    for (let i = 0; i <= tot; i++) if (WORLDS[i]) p.worldsSeen.push(WORLDS[i].id);
  }
  /* FASE 4D.1 -- de beloningen die dit kind al verdiend had. Wie drie werelden uit
     heeft hoort die drie spulletjes gewoon in haar kleedkamer te vinden, en wie er
     één perfect speelde die trofee in haar kast. Stil, en zonder ook maar iets te
     hoeven overspelen.

     Geen stempel, geen versienummer, geen eenmalige lus: dit mág elke keer draaien,
     want "al gegeven" staat in p.owned en p.trophies zelf (zie grantWorldRewards).
     Het is daarmee tegelijk het vangnet voor een feestje dat verloren ging doordat
     de app tussen de show en de kaart door dichtging. */
  grantHistoricRewards(p);
  // bestaande spelers beginnen op hun huidige rang (geen bonus met terugwerkende
  // kracht voor sterren die ze al hadden); nieuwe rangen daarna betalen wél uit
  if (p.rankSeen == null) p.rankSeen = starRank(totalStarCount(p)).idx;
  if (p.perf == null) p.perf = 0.5;
  if (!p.weak) p.weak = {};
  // bestaande spelers beginnen met een lege onderhoudslijst; die vult zich vanzelf
  // zodra ze weer sommen goed maken (geen terugwerkende kracht)
  if (!p.learned) p.learned = {};
  // oude zwakke-sleutels ("3 + 4") naar het nieuwe sjabloonformaat ("3 + 4 = @")
  else {
    const nw = {};
    for (const [k, e] of Object.entries(p.weak)) nw[k.includes('@') ? k : `${k} = @`] = e;
    p.weak = nw;
  }
  // extra uitdagingen: standaard aan (verschijnen toch pas na voldoende beheersing)
  if (!p.settings) p.settings = { ops: ['+', '-'], max: 20, tables: [2, 5, 10], mode: 'kies', perLevel: 8 };
  if (p.settings.missNum == null) p.settings.missNum = true;
  if (p.settings.chain3 == null) p.settings.chain3 = true;
  if (!p.opTrack) p.opTrack = {};
  if (!p.missRamp) p.missRamp = { rung: 1, hot: 0 };
  if (!p.chainTrack) p.chainTrack = { seen: 0, acc: 0.5, paused: false, rung: 1, hot: 0 };
  // telmodus (lees-vrij): standaard uit (track 'math') voor bestaande profielen
  if (p.settings.track == null) p.settings.track = 'math';
  if (p.settings.stage == null) p.settings.stage = 1;
  if (p.settings.stageMax == null) p.settings.stageMax = COUNT_STAGE_MAX;
  // bestaande telprofielen mochten tot fase 6; til hun plafond op naar de nieuwe fases
  if (p.settings.track === 'count' && (p.settings.stageMax === 6 || p.settings.stageMax === 8)) p.settings.stageMax = COUNT_STAGE_MAX;
  if (p.settings.repr == null) p.settings.repr = 'objects';
  if (p.settings.numerals == null) p.settings.numerals = true;
  if (p.settings.qmax == null) p.settings.qmax = 10;
  if (p.settings.memory == null) p.settings.memory = true;
  if (!p.countTrack) p.countTrack = { stage: p.settings.stage, rung: 0, streak: 0, seen: 0, acc: 0.5 };
  if (p.countTrack.rung == null) p.countTrack.rung = 0;
  if (p.countTrack.streak == null) p.countTrack.streak = 0;
  if (!p.stats) p.stats = { correct: 0, wrong: 0 };
  // gratis startspullen: 5 basis, +1 als deze ster de gratis bonusoutfit (dress_geel,
  // bv. Clara) heeft — zodat "spulletjes gekocht" niet 1 te hoog begint
  if (p.freebies == null) p.freebies = 5 + (p.owned && p.owned.includes('dress_geel') ? 1 : 0);
  // basisfiguur: elke ster van vóór de jongens-basis is een meisje en blijft er
  // precies zo uitzien -- de meisjes-basis tekent exact dezelfde vormen als toen
  if (!BASES[p.base]) p.base = DEFAULT_BASE;
  if (!('instrument' in p.equipped)) p.equipped.instrument = null;
  // schoenen-categorie: bestaande profielen krijgen de gratis roze schoenen aan
  if (!('shoes' in p.equipped)) {
    p.equipped.shoes = 'shoes_roze';
    if (!p.owned.includes('shoes_roze')) p.owned.push('shoes_roze');
  }
  /* ---- FASE 4D.2: nog maar één tovenaarshoed --------------------------------
     Er waren er twee: acc_tovenaarshoed voor 85 diamanten in de kleedkamer, en
     acc_wereld_tover als beloning van de Toverwereld. Sinds die laatste écht
     getekend is zijn het dezelfde hoed, en dan is de beloning niets meer waard
     voor wie de andere al kocht. De winkelhoed is daarom uit ITEMS gehaald.

     Wat hier gebeurt is het opruimen daarna, en niet meer dan dat: een id dat
     niet meer bestaat hoort niet in owned te blijven staan (het zou daar als
     spookitem voor altijd meetellen bij "spulletjes gekocht"), en al helemaal
     niet aan te staan -- avatarSVG vindt er geen item bij en tekent dan stil
     niets, wat er voor een kind uitziet als een hoed die zomaar verdwenen is.
     Nu gaat hij netjes af, en staat de kale kop er tenminste met reden.

     Eenmalig in de praktijk maar geschreven om elke keer te mogen draaien: de
     tweede keer vindt hij niets meer. Geen terugbetaling -- dat is een keuze,
     geen vergetelheid. En wie een trofee haalde met dit spulletje meegeteld
     houdt die gewoon: behaalde trofeeen worden nooit ingetrokken. */
  if (p.owned) p.owned = p.owned.filter(id => id !== 'acc_tovenaarshoed');
  if (p.equipped && p.equipped.acc === 'acc_tovenaarshoed') p.equipped.acc = null;
}
// Werkt de vaardigheidsinschatting bij na elk antwoord (exponentieel voortschrijdend gemiddelde).
// Goed = omhoog (extra beloond bij snel binnen de spotlight), fout = omlaag.
function updatePerf(p, correct, fast) {
  const target = correct ? (fast ? 1 : 0.85) : 0;
  p.perf = Math.max(0, Math.min(1, p.perf * 0.8 + target * 0.2));
}
let db;
// LEGACY. Vaste weergavevolgorde voor saves van vóór het bewaarde order-veld:
// Clara kwam er als laatste bij en moest toch vooraan. Wordt één keer per profiel
// vastgelegd (op naam), daarna bewaard. Nieuwe sterren krijgen hun order expliciet
// van nextOrder() -- ze mogen hier niet doorheen, want een familie die haar kind
// "Anna" noemt zou anders order 1 krijgen en zo de rij binnenspringen.
const PROFILE_ORDER = { 'Clara': 0, 'Anna': 1, 'Marie': 2 };
function assignProfileOrder() {
  Object.values(db.profiles).forEach(p => {
    if (p.order == null) p.order = (PROFILE_ORDER[p.name] != null ? PROFILE_ORDER[p.name] : 90);
  });
}
// Eerstvolgende vrije sleutel. Gaten na een verwijdering worden hergebruikt: geen
// enkele sleutel overleeft een herlaadbeurt buiten db.profiles (cur en setKey staan
// alleen in het geheugen) en een import vervangt de hele verzameling.
function nextProfileKey() { for (let i = 1; ; i++) if (!db.profiles['p' + i]) return 'p' + i; }
// Nieuwe sterren sluiten achteraan aan. Math.max(-1) geeft -1 bij nul sterren, dus
// de eerste krijgt order 0; legacy-profielen in de 90-bak blijven ervóór staan.
function nextOrder() {
  return 1 + Math.max(-1, ...Object.values(db.profiles).map(p => p.order == null ? 90 : p.order));
}
// Sleutels in weergavevolgorde (order oplopend; gelijkspel op sleutel).
function profileKeys() {
  return Object.keys(db.profiles).sort((a, b) => {
    const d = (db.profiles[a].order == null ? 90 : db.profiles[a].order) - (db.profiles[b].order == null ? 90 : db.profiles[b].order);
    return d !== 0 ? d : (a < b ? -1 : 1);
  });
}
// Eenmalige ophaalslag voor saves van vóór "maak je eigen ster": die konden Clara
// missen (ze kwam er later bij). Dat mag maar één keer gebeuren -- anders komt een
// ster die een ouder net verwijderd heeft bij de volgende start gewoon terug. De
// stempel reist mee in de back-up, dus een nieuw bestand raakt dit pad nooit meer
// en een oud bestand nog precies één keer. De lengte-controle is nodig omdat een
// lege db (verse installatie, of een back-up van een familie die iedereen wiste)
// anders alsnog Clara zou krijgen.
const SCHEMA_V = 2;
function normalizeProfiles() {
  if (db.schemaV == null) {
    if (Object.keys(db.profiles).length && !db.profiles.p3) {
      db.profiles.p3 = defaultProfile('Clara', 'dress_geel', COUNT_OPTS);
    }
    db.schemaV = SCHEMA_V;
  }
  assignProfileOrder();
}
function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(LS_KEY);
    if (raw) {
      db = JSON.parse(raw);
      if (typeof db.sound !== 'boolean') db.sound = true;
      if (typeof db.haptics !== 'boolean') db.haptics = true;
      // een half-kapotte db houdt wat ze nog heeft, i.p.v. hieronder te gooien
      if (!db.profiles || typeof db.profiles !== 'object') db.profiles = {};
      Object.values(db.profiles).forEach(migrate);
      normalizeProfiles();   // eenmalige legacy-ophaalslag + volgorde
      save();
      return;
    }
  } catch (e) {
    // Een mislukte load ziet er vanaf nu precies uit als een eerste start (leeg
    // welkomscherm), dus bewaar het onleesbare bestand apart in plaats van het
    // straks stilletjes te overschrijven. Zonder dit is er achteraf niets meer
    // om naar te kijken.
    try { if (raw) localStorage.setItem(LS_KEY + '.broken', raw); } catch (e2) { /* vol of dicht */ }
  }
  // Verse start: nog geen sterren. Elke familie maakt haar eigen -- vroeger stonden
  // hier Clara, Anna en Marie, en die kreeg iedereen die de app opende cadeau.
  // Bewust geen save(): er valt nog niets te bewaren, en zo blijft een eventueel
  // onleesbaar bestand staan tot iemand er echt overheen schrijft.
  db = { sound: true, haptics: true, schemaV: SCHEMA_V, profiles: {} };
}
// Bewaren mag nooit het spel breken. localStorage kan gooien (privémodus, volle
// opslag, opslag uitgeschakeld); save() wordt middenin submitAnswer aangeroepen,
// dus een exception hier zou de rest van de beurt afbreken en het spel laten
// vastlopen op de vraag. Daarom: stil opvangen, één keer vriendelijk melden, en
// gewoon doorspelen (de voortgang van deze sessie blijft in het geheugen staan).
let saveFailed = false;
/* Kijkopstelling (?debug&demo) schrijft niets weg. Dat stond al als belofte bij
   de schakelaars onderaan -- "ALLEEN in het geheugen, een echte familie-opslag op
   hetzelfde toestel blijft ongemoeid" -- maar het stond nergens als regel. En het
   kostte niet veel: één keer de kaart openen roept markWorldSeen aan, die
   save() doet, en dan staan Lotte en Sem in de opslag van een echt gezin. De
   voorbeeldlinks op de voorbeeldpagina gaan allemaal langs de kaart.

   Alleen deze ene regel, en niet een tweede opslagpad: wat de app verder doet moet
   precies hetzelfde blijven, anders test de kijkopstelling iets anders dan er
   draait. */
let demoStand = false;
function save() {
  if (demoStand) return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
    saveFailed = false;
  } catch (e) {
    if (!saveFailed) {
      saveFailed = true;
      try {
        showToast('⚠️ Voortgang kan niet bewaard worden', null, 'Je kan gewoon verder spelen.');
        setTimeout(hideToast, 3000);
      } catch (e2) { /* UI nog niet klaar: stil doorgaan */ }
    }
  }
}

let cur = null;                 // huidige profielsleutel: 'p1' | 'p2'
const P = () => db.profiles[cur];

/* ================= Trilfeedback (haptics) ================= */
// Werkt op mobiele browsers die de Vibration API ondersteunen (Android/Chrome).
// Staat los van geluid, zodat trillen ook aan kan met de app op stil.
function buzz(pattern) {
  if (!db.haptics) return;
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* geen trilmotor */ }
}

/* ================= Geluid ================= */
let actx = null;
function beep(freq, dur, delay, type, vol) {
  if (!db.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    o.connect(g); g.connect(actx.destination);
    const t = actx.currentTime + (delay || 0);
    g.gain.setValueAtTime(vol || 0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur);
  } catch (e) { /* geen audio */ }
}
const sndClick = () => { buzz(8); beep(700, 0.06, 0, 'triangle', 0.1); };
function sndGood() { buzz(30); beep(523, 0.14); beep(659, 0.14, 0.11); beep(784, 0.22, 0.22); }
/* "Niet die" en niet "fout!". Hier stond een zaagtand van 200 Hz, een derde
   seconde lang: dat is het geluid van een spelshow-buzzer, en dat is precies wat
   een misser in een rekenspel voor vijfjarigen níet hoort te zijn. Nu twee zachte
   dalende driehoeknoten -- in de Muziekwereld leest dat vanzelf als een noot die
   naast zat, en het is korter, zachter en een halve toon minder scherp. Het
   trillen is meegegaan van vier stoten naar één korte. */
function sndWrong() { buzz(35); beep(392, 0.15, 0, 'triangle', 0.09); beep(311, 0.22, 0.12, 'triangle', 0.08); }
function sndCoin() { buzz(15); beep(988, 0.08, 0, 'square', 0.08); beep(1319, 0.18, 0.08, 'square', 0.08); }
function sndWin() {
  buzz([0, 45, 60, 45, 60, 90]);
  [523, 659, 784, 1047, 784, 1047].forEach((f, i) => beep(f, 0.18, i * 0.14));
}
function sndStreak() { buzz([0, 25, 35, 25, 35, 55]); beep(880, 0.1); beep(1109, 0.1, 0.09); beep(1319, 0.1, 0.18); beep(1760, 0.25, 0.27); }
function sndTap() { buzz(12); const n = pick([784, 880, 988, 1047, 1175]); beep(n, 0.12, 0, 'triangle', 0.12); }
function toggleSound() {
  db.sound = !db.sound; save();
  renderGearMenu();
  if (!db.sound) cancelSpeech();
  if (db.sound) sndClick();
}

/* ================= Gesproken opdrachten (telmodus) =================
   Kleuters kunnen nog niet lezen, dus in de telmodus wordt élke opdracht
   hardop voorgelezen met de ingebouwde spraak van het toestel (SpeechSynthesis,
   nl-NL). Niet elk toestel heeft een Nederlandse stem -- daarom is spraak nooit
   de énige drager: de vraag staat altijd óók volledig in beeld (objecten/stippen),
   en een 🔊-knop leest de opdracht op verzoek opnieuw voor. Ontbreekt een stem,
   dan blijft alles gewoon speelbaar, enkel zonder stemgeluid. */
// 'één' met accenten: anders leest de stem het als het lidwoord "een" ("'n") i.p.v.
// het telwoord. Bij tellen, luisteren en sommen moet het echt "één" klinken.
const NUM_NL = ['nul', 'één', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien'];
function numWord(n) { return NUM_NL[n] != null ? NUM_NL[n] : String(n); }
let _voices = [];
function refreshVoices() { try { _voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; } catch (e) { _voices = []; } }
function nlVoice() {
  if (!_voices.length) refreshVoices();
  return _voices.find(v => /^nl(\b|[-_])/i.test(v.lang)) || null;
}
function hasSpeech() { return 'speechSynthesis' in window; }
function cancelSpeech() { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} }
// Leest een zin voor. Volgt bewust de geluid-aan/uit-knop (stil = ook geen stem).
function speak(text, opts) {
  opts = opts || {};
  // Voice hoort bij de lees-vrije telmodus; in de rekenmodus geen enkele gesproken
  // uitvoer (ook niet op gedeelde plekken als het trofee-feestje of de ster-status).
  const cp = cur ? P() : null;
  if (cp && cp.settings && cp.settings.track !== 'count') { if (opts.onEnd) opts.onEnd(); return; }
  if (!db.sound || !hasSpeech() || !text) { if (opts.onEnd) opts.onEnd(); return; }
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = nlVoice();
    if (v) u.voice = v;
    u.lang = 'nl-NL';
    u.rate = opts.rate || 0.85;   // rustig tempo voor jonge kinderen
    u.pitch = opts.pitch || 1.15; // iets hoger/vrolijker
    if (opts.onEnd) u.onend = opts.onEnd;
    speechSynthesis.speak(u);
  } catch (e) { if (opts.onEnd) opts.onEnd(); }
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  refreshVoices();
  speechSynthesis.onvoiceschanged = refreshVoices;
}

/* ---- Scherm wakker houden zolang de app open is (Wake Lock API) ----
   Kinderen denken soms lang na zonder het scherm aan te raken; dan mag het
   niet dimmen of vergrendelen. De lock wordt automatisch vrijgegeven als het
   tabblad naar de achtergrond gaat, dus we vragen 'm opnieuw aan zodra de app
   weer zichtbaar is. Niet-ondersteunende browsers negeren dit stil. */
let wakeLock = null;
async function keepAwake() {
  if (!('wakeLock' in navigator) || document.visibilityState !== 'visible' || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) { wakeLock = null; }   // niet ondersteund of geweigerd -> gewoon doorgaan
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });
document.addEventListener('pointerdown', keepAwake, { passive: true });   // fallback: browsers die een gebruikersgebaar eisen
keepAwake();
function toggleHaptics() {
  db.haptics = !db.haptics; save();
  renderGearMenu();
  if (db.haptics) buzz(20);   // even voelen dat trillen nu aan staat
}

/* ---- Instellingen-menu onder het tandwiel ---- */
// Zet de aan/uit-labels goed en verbergt "Trillen" op apparaten zonder trilmotor.
function renderGearMenu() {
  const setRow = (id, stateId, on, icoOn, icoOff) => {
    const item = $(id), st = $(stateId);
    if (!item || !st) return;
    st.textContent = on ? 'Aan' : 'Uit';
    st.classList.toggle('off', !on);
    item.setAttribute('aria-checked', on ? 'true' : 'false');
    item.querySelector('.gi-ico').textContent = on ? icoOn : icoOff;
  };
  setRow('gear-sound', 'gear-sound-state', db.sound, '🔊', '🔇');
  const hi = $('gear-haptics');
  if (hi) hi.style.display = ('vibrate' in navigator) ? '' : 'none';
  setRow('gear-haptics', 'gear-haptics-state', db.haptics, '📳', '📴');
}
function toggleGearMenu(e) {
  if (e) e.stopPropagation();
  const m = $('gear-menu'), g = $('btn-gear');
  const open = !m.classList.contains('open');
  if (open) renderGearMenu();
  m.classList.toggle('open', open);
  g.classList.toggle('on', open);
  g.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) sndClick();
  syncBackGuard();
}
function closeGearMenu() {
  const m = $('gear-menu'), g = $('btn-gear');
  if (m) m.classList.remove('open');
  if (g) { g.classList.remove('on'); g.setAttribute('aria-expanded', 'false'); }
  syncBackGuard();
}
// klik buiten het menu (maar niet op het tandwiel/menu zelf) sluit het
document.addEventListener('click', e => {
  const cb = $('corner-btns'), m = $('gear-menu');
  if (m && m.classList.contains('open') && cb && !cb.contains(e.target)) closeGearMenu();
});

/* ================= Avatar (SVG) ================= */
// De pop is één tekening met twee lagen: vaste onderdelen (hoofd, hals, armen,
// schoenen, vastgehouden spullen) en een BASIS die zegt hoe haar, romp en benen
// eruitzien. Spullen blijven wat ze altijd waren -- een kleur en hooguit een
// patroon, meer niet -- dus dezelfde 'dress_disco' wordt op de ene basis een
// discojurk en op de andere een discoshirt met broek. Daardoor werkt de héle
// kast, élke thema-look en élke trofee meteen voor beide basissen, zonder één
// extra item, zonder filteren en zonder tweede winkel.
//
// Alle ankerpunten liggen vast en zijn voor iedere basis gelijk: schouders op
// y=103, hals 94-112, armen vanaf (84|116, 112), broekspijp-hart op x=86 en 114,
// schoenen op (86|114, 234). Zo hoeft de rest van de tekening (accessoires,
// micro, instrument, huisdier, schoenen) niets van de basis te weten.
const SKIN = '#ffdcb8';
const DEFAULT_BASE = 'meisje';
// De basis van een profiel, met vangnet: een save van vóór deze versie (of een
// met de hand bewerkt bestand) heeft het veld niet en blijft gewoon het meisje.
function baseOf(p) { return (p && BASES[p.base]) ? p.base : DEFAULT_BASE; }
// De basis van de ster die nu speelt. Draait óók vóór er een ster gekozen is
// (renderProfiles bij het opstarten), dus cur is hier vaak null.
function curBase() { return baseOf(db && db.profiles ? db.profiles[cur] : null); }

/* ---- Basis "meisje": staartjes, jurk, blote benen onder de zoom ---- */
function hairBackStaartjes(hc) {
  return `<circle cx="100" cy="62" r="37" fill="${hc}"/>`
    + `<circle cx="56" cy="86" r="13" fill="${hc}"/><circle cx="144" cy="86" r="13" fill="${hc}"/>`;
}
function hairFrontStaartjes(hc) {
  return `<path d="M68 66 A32 32 0 0 1 132 66 Q100 44 68 66 Z" fill="${hc}"/>`;
}
// benen: vóór de jurk getekend -- de zoom dekt het bovenstuk vanzelf af
function legsBloot() {
  return `<line x1="90" y1="192" x2="88" y2="228" stroke="${SKIN}" stroke-width="9" stroke-linecap="round"/>`
    + `<line x1="110" y1="192" x2="112" y2="228" stroke="${SKIN}" stroke-width="9" stroke-linecap="round"/>`;
}
// jurk -- zachte ronde schoudertjes i.p.v. scherpe hoeken
function torsoJurk(dc) {
  return `<path d="M86 103 Q78 105 82 110 L66 196 Q100 210 134 196 L118 110 Q122 105 114 103 Q100 110 86 103 Z" fill="${dc}"/>`;
}

/* ---- Basis "jongen": kort haar, shirt met korte mouwen, lange broek ----
   De broek hoort bij de benen-laag (de broek ís de benen), het shirt bij de romp.
   Dezelfde kleur voor allebei: het is één kledingstuk uit de kast, geen twee. */
function hairBackKort(hc) {
  // Een kapje dat óp het hoofd zit in plaats van eromheen valt: tien pixels haar
  // bovenop, langs de slaap nog maar een randje, en op oorhoogte (y=80) is het
  // afgelopen. Zakt het lager, dan omlijst het het gezicht en leest het meteen
  // als een pagekopje.
  //
  // De omtrek blijft bewust rond. Er stond hier een kuifje om die ronding te
  // breken, maar een puntje bovenop een bol hoofd is geen kuif -- dat is een
  // steeltje, en dan is het een appel. Het karakter zit nu in de haargrens
  // (zie hairFrontKort): die loopt schuin, en dat is aan de zíjkant zichtbaar
  // in plaats van bovenop.
  return `<path d="M67 80 Q63 44 79 34 Q90 28 100 31 Q113 27 123 37 Q136 47 133 80 Q116 71 100 71 Q84 71 67 80 Z" fill="${hc}"/>`;
}
function hairFrontKort(hc) {
  // Eén schuine haargrens: rechts hoog bij de slaap (y≈48), links laag tot bijna
  // op de wenkbrauw (y≈68). Dat is een scheiding met het haar naar één kant
  // gekamd -- de vorm die kort haar herkenbaar maakt zónder er iets bovenop te
  // zetten. Het voorhoofd blijft ruimer vrij dan bij de staartjes; juist dat
  // maakt kort haar kort.
  //
  // De bovenrand is een kromme en geen boog met de straal van het hoofd: zo'n
  // boog loopt net ónder de schedelrand door en laat bovenaan een haarlijntje
  // huid staan.
  return `<path d="M68 68 Q68 32 100 32 Q132 32 128 56 Q118 44 96 50 Q76 55 68 68 Z" fill="${hc}"/>`;
}
function legsBroek(dc) {
  // Eerst de blote onderbenen, dán de pijpen eroverheen: zo eindigt de stof
  // netjes op de kuit i.p.v. dat een ronde beenkop erdoorheen prikt. De pijpen
  // zijn bewust breed (18 px, hart op x=86 en 114, precies boven de schoenen):
  // twee dunne kokers maakten van de ster een stokfiguurtje naast de jurk, die
  // veel meer vlak vult. De zoom ligt net onder de knie -- tot op de schoen las
  // het als een lange broek en werd het onderlijf één blok kleur.
  return `<line x1="86" y1="200" x2="87" y2="229" stroke="${SKIN}" stroke-width="9" stroke-linecap="round"/>`
    + `<line x1="114" y1="200" x2="113" y2="229" stroke="${SKIN}" stroke-width="9" stroke-linecap="round"/>`
    + `<path d="M78 156 L77 208 Q86 213 95 208 L100 188 L105 208 Q114 213 123 208 L122 156 Z" fill="${dc}"/>`;
}
function torsoShirt(dc, mic) {
  // Schouders exact als bij de jurk (zelfde Q-bochtjes), daarna licht uitlopend
  // naar de zoom i.p.v. kaarsrecht: een kindershirt valt zo, en het geeft de
  // basis de breedte die een strakke koker miste.
  //
  // De mouwtjes komen ná de romp, want de armen zijn al getekend -- zo steekt de
  // arm uit het shirt en niet ernaast. Elke mouw krijgt een randje op de zoom,
  // dwars op de arm: zonder dat is het een dikke streep die in de arm overloopt
  // in plaats van een mouw die ergens ophoudt. De opgeheven micro-arm heeft
  // vanzelfsprekend zijn eigen mouw en zijn eigen zoom.
  const mouw = (d, zoom) => `<path d="${d}" stroke="${dc}" stroke-width="13" fill="none" stroke-linecap="round"/>`
    + `<path d="${zoom}" stroke="rgba(0,0,0,.16)" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  return `<path d="M86 103 Q78 105 82 110 L78 165 Q100 171 122 165 L118 110 Q122 105 114 103 Q100 110 86 103 Z" fill="${dc}"/>`
    + mouw('M84 110 Q77 116 75 124', 'M69 121 L81 127')
    + (mic ? mouw('M116 110 Q123 104 128 100', 'M124 95 L132 105')
           : mouw('M116 110 Q123 116 125 124', 'M119 127 L131 121'))
    // ronde halslijn: een V leest als een overhemd, dit als een T-shirt
    + `<path d="M89 105 Q100 116 111 105" stroke="rgba(0,0,0,.16)" stroke-width="3" fill="none" stroke-linecap="round"/>`
    + `<path d="M78 165 Q100 171 122 165" stroke="rgba(0,0,0,.2)" stroke-width="2" fill="none"/>`;
}

/* ---- Patronen ----
   Zes patronen, per basis één keer uitgetekend: de coördinaten hangen aan de
   vorm van het kledingstuk, niet aan het item. Een patroon erbij betekent dus
   één regel in élke tabel -- daarom staan ze naast elkaar. */
const PAT_JURK = {
  stars: `<text x="86" y="145" font-size="14" fill="#fff176">★</text><text x="108" y="165" font-size="12" fill="#fff176">★</text>
          <text x="78" y="185" font-size="12" fill="#fff176">★</text><text x="112" y="192" font-size="14" fill="#fff176">★</text>`,
  disco: `<circle cx="90" cy="140" r="4" fill="#fff" opacity="0.8"/><circle cx="110" cy="155" r="4" fill="#80deea" opacity="0.8"/>
          <circle cx="85" cy="175" r="4" fill="#f48fb1" opacity="0.8"/><circle cx="113" cy="182" r="4" fill="#fff59d" opacity="0.8"/>`,
  hearts: `<text x="84" y="146" font-size="13" fill="#fff">♥</text><text x="106" y="164" font-size="11" fill="#ffcdd2">♥</text>
          <text x="79" y="184" font-size="11" fill="#ffcdd2">♥</text><text x="110" y="190" font-size="13" fill="#fff">♥</text>`,
  // gouden sterren + maantje: de toverjurk
  magic: `<text x="85" y="148" font-size="15" fill="#ffd54f">★</text><text x="108" y="172" font-size="11" fill="#ffd54f">★</text>
          <text x="80" y="188" font-size="11" fill="#ffd54f">★</text>
          <path d="M112 138 a9 9 0 1 0 6 15 a11 11 0 1 1 -6 -15 Z" fill="#ffe082"/>`,
  // zeemeermin-schubben: rijen lichte koepeltjes
  scales: `<g fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2.5">
      <path d="M82 152 a7 7 0 0 1 14 0 M96 152 a7 7 0 0 1 14 0"/>
      <path d="M80 168 a7 7 0 0 1 14 0 M94 168 a7 7 0 0 1 14 0 M108 168 a7 7 0 0 1 14 0"/>
      <path d="M84 184 a7 7 0 0 1 14 0 M98 184 a7 7 0 0 1 14 0"/></g>`,
  // clubkleuren van Leuven: groen-rode banen op wit met een zwarte zoom
  ohl: `<path d="M86 110 L76 192 L86 195 L94 111 Z" fill="#2e7d32"/>
          <path d="M114 110 L124 192 L114 195 L106 111 Z" fill="#c62828"/>
          <path d="M67 190 Q100 205 133 190 L134 196 Q100 209 66 196 Z" fill="#1b1b1b"/>`,
};
// Zelfde zes patronen, nu verdeeld over het shirtvlak (x 78-122, y 112-162) en
// de twee broekspijpen (links x 77-98, rechts x 102-123, y 188-208). Een merkje
// dat over de splitsing tussen de pijpen valt breekt zichtbaar doormidden --
// vandaar per pijp één, niet één over het midden.
const PAT_SHIRT = {
  stars: `<text x="86" y="132" font-size="14" fill="#fff176">★</text><text x="104" y="152" font-size="12" fill="#fff176">★</text>
          <text x="82" y="200" font-size="11" fill="#fff176">★</text><text x="106" y="204" font-size="12" fill="#fff176">★</text>`,
  disco: `<circle cx="89" cy="128" r="4" fill="#fff" opacity="0.8"/><circle cx="110" cy="145" r="4" fill="#80deea" opacity="0.8"/>
          <circle cx="86" cy="196" r="4" fill="#f48fb1" opacity="0.8"/><circle cx="113" cy="200" r="4" fill="#fff59d" opacity="0.8"/>`,
  hearts: `<text x="87" y="132" font-size="13" fill="#fff">♥</text><text x="105" y="152" font-size="11" fill="#ffcdd2">♥</text>
          <text x="83" y="200" font-size="10" fill="#ffcdd2">♥</text><text x="107" y="204" font-size="11" fill="#fff">♥</text>`,
  // gouden sterren + maantje: het toveroutfit
  magic: `<text x="84" y="140" font-size="15" fill="#ffd54f">★</text><text x="84" y="201" font-size="10" fill="#ffd54f">★</text>
          <text x="107" y="205" font-size="9" fill="#ffd54f">★</text>
          <path d="M106 120 a9 9 0 1 0 6 15 a11 11 0 1 1 -6 -15 Z" fill="#ffe082"/>`,
  // zeemeermin-schubben: rijen lichte koepeltjes
  scales: `<g fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2.5">
      <path d="M86 126 a7 7 0 0 1 14 0 M100 126 a7 7 0 0 1 14 0"/>
      <path d="M86 141 a7 7 0 0 1 14 0 M100 141 a7 7 0 0 1 14 0"/>
      <path d="M86 156 a7 7 0 0 1 14 0 M100 156 a7 7 0 0 1 14 0"/>
      <path d="M82 199 a7 7 0 0 1 14 0 M104 199 a7 7 0 0 1 14 0"/></g>`,
  // clubkleuren van Leuven: groen-rode banen op wit met een zwarte zoom
  ohl: `<path d="M88 106 L84 165 L92 165 L95 107 Z" fill="#2e7d32"/>
          <path d="M112 106 L116 165 L108 165 L105 107 Z" fill="#c62828"/>
          <path d="M78 157 Q100 163 122 157 L122 165 Q100 171 78 165 Z" fill="#1b1b1b"/>`,
};

// Een basis erbij? Eén regel hier en één patronentabel hierboven -- de rest van
// de app (winkel, kleedkamer, trofeeën, opslag) hoeft er niets van te weten.
const BASES = {
  meisje: { hairBack: hairBackStaartjes, hairFront: hairFrontStaartjes, legs: legsBloot,  torso: torsoJurk,  pat: PAT_JURK },
  jongen: { hairBack: hairBackKort,      hairFront: hairFrontKort,      legs: legsBroek,  torso: torsoShirt, pat: PAT_SHIRT },
};
// De keuze bij het maken van een ster. Vaste volgorde, met het woord erbij voor
// de ouder en de tekening zelf voor het kind dat nog niet leest. Dit hoort bij
// wie de ster ís -- net als bij een naam kan het achteraf niet meer wisselen, dus
// het staat níet in de kleedkamer tussen de spullen die je wél omruilt.
const BASE_CHOICES = [
  { id: 'meisje', emoji: '👧', name: 'Meisje' },
  { id: 'jongen', emoji: '👦', name: 'Jongen' },
];

let svgUid = 0;
/* Hoe groot het huisdier en het instrument naast de pop komen te staan. Ze staan
   buiten haar silhouet, dus hun maat bepaalt of ze bíj haar horen of met haar
   concurreren:
     groot  de kleedkamer -- daar past ze ze, dus daar moet je zien wát het is
     norm   overal waar de pop op ware grootte staat (show, eindscherm, kaart)
     klein  de sterrenkeuze -- daar staan zes tegels van ~112px naast elkaar, en op
            die maat werd een gitaar van 42px een tweede hoofdonderwerp naast een
            kind van 90px. Kleiner blijft het gewoon háár gitaar. */
const PROP_MAAT = {
  groot: { pet: [6, 244, 46],  instr: [112, 248, 52] },
  norm:  { pet: [18, 240, 34], instr: [120, 246, 42] },
  klein: { pet: [30, 238, 24], instr: [134, 243, 29] },
};
function avatarSVG(p, width, propMaat) {
  // true blijft 'groot': de kleedkamer geeft nog altijd een vlaggetje mee
  const pm = PROP_MAAT[propMaat === true ? 'groot' : propMaat] || PROP_MAAT.norm;
  const eq = p.equipped;
  const B = BASES[baseOf(p)];
  const hair = itemOr(eq.hair, 'hair_blond'), dress = itemOr(eq.dress, 'dress_roze');
  const mic = eq.mic ? item(eq.mic) : null;
  const acc = eq.acc ? item(eq.acc) : null;
  const pet = eq.pet ? item(eq.pet) : null;
  const instr = eq.instrument ? item(eq.instrument) : null;
  const uid = ++svgUid;
  const hc = hair.color === 'RAINBOW' ? `url(#rb${uid})` : hair.color;
  const dc = dress.color === 'RAINBOW' ? `url(#rb${uid})` : dress.color;

  let s = `<svg viewBox="0 0 200 250" width="${width}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<defs><linearGradient id="rb${uid}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ff5f6d"/><stop offset="0.25" stop-color="#ffc371"/>
    <stop offset="0.5" stop-color="#8bd450"/><stop offset="0.75" stop-color="#47c9ff"/>
    <stop offset="1" stop-color="#b06ab3"/></linearGradient></defs>`;
  if (pet) s += `<text x="${pm.pet[0]}" y="${pm.pet[1]}" font-size="${pm.pet[2]}">${pet.emoji}</text>`;
  if (instr) s += `<text x="${pm.instr[0]}" y="${pm.instr[1]}" font-size="${pm.instr[2]}">${instr.emoji}</text>`;
  // haar achter het hoofd (staartjes, of de rand van een kort kapsel)
  s += B.hairBack(hc);
  // hoofd
  s += `<circle cx="100" cy="72" r="32" fill="${SKIN}"/>`;
  s += B.hairFront(hc);
  s += `<circle cx="88" cy="72" r="3.6" fill="#333"/><circle cx="112" cy="72" r="3.6" fill="#333"/>`;
  s += `<circle cx="79" cy="82" r="5" fill="#ffb3ba" opacity="0.6"/><circle cx="121" cy="82" r="5" fill="#ffb3ba" opacity="0.6"/>`;
  s += `<path d="M88 85 Q100 96 112 85" stroke="#c2572b" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  // accessoire op het hoofd / gezicht
  if (acc) {
    /* Een item mag zijn eigen tekening meebrengen: acc.draw() geeft een stukje SVG
       terug in dezelfde 200x250-ruimte als de rest van de pop (hoofd op 100,72 met
       straal 32; boven het hoofd is vrij vanaf y≈40 tot y=0). Dat is precies wat de
       regels hieronder met de hand doen voor het kroontje, de bril enzovoort --
       met dit haakje hoeft er voor een nieuw item geen regel bij.

       De zes wereldbeloningen lopen hierlangs (fase 4D.2): hun vormen staan bij
       ITEMS zelf, niet hier. Wie géén `draw` meebrengt tekent zijn emoji via spot
       ('top' = op het hoofd, 'zij' = in het haar). */
    // (base, uid): de basis voor wie de vorm moet meebewegen, en het nummer van
    // déze tekening -- nodig om een eigen kleurverloop een id te geven dat niet
    // botst met de tien andere paspoppen die tegelijk op het scherm staan.
    if (acc.draw) s += acc.draw(baseOf(p), uid);
    else {
      if (acc.id === 'acc_strik') s += `<g transform="translate(100,36)"><path d="M0 0 L-17 -9 L-17 9 Z" fill="#ff4081"/><path d="M0 0 L17 -9 L17 9 Z" fill="#ff4081"/><circle r="5" fill="#c2185b"/></g>`;
      if (acc.id === 'acc_bloem') s += `<text x="55" y="52" font-size="22">🌸</text>`;
      if (acc.id === 'acc_bril') s += `<g><circle cx="88" cy="72" r="8.5" fill="#222"/><circle cx="112" cy="72" r="8.5" fill="#222"/><line x1="96" y1="72" x2="104" y2="72" stroke="#222" stroke-width="3"/></g>`;
      if (acc.id === 'acc_koptel') s += `<path d="M68 58 A33 35 0 0 1 132 58" stroke="#e91e63" fill="none" stroke-width="7" stroke-linecap="round"/><circle cx="67" cy="68" r="8" fill="#ad1457"/><circle cx="133" cy="68" r="8" fill="#ad1457"/>`;
      if (acc.id === 'acc_kroon') s += `<path d="M78 40 L84 22 L94 34 L100 18 L106 34 L116 22 L122 40 Z" fill="#ffd740" stroke="#c8a200" stroke-width="2"/><circle cx="100" cy="18" r="3" fill="#ff4081"/>`;
      // nieuwe extra's tekenen generiek via hun emoji: 'zij' = in het haar, 'top' = op het hoofd
      if (acc.spot === 'zij') s += `<text x="53" y="54" font-size="24">${acc.emoji}</text>`;
      if (acc.spot === 'top') s += `<text x="85" y="34" font-size="30">${acc.emoji}</text>`;
    }
  }
  // nek: klein bruggetje tussen kin en kraag -- voorkomt een donker gaatje
  // tussen hoofd en kleren, met toch nog een vleugje hals zichtbaar
  s += `<rect x="90" y="94" width="20" height="18" rx="8" fill="${SKIN}"/>`;
  // armen: vóór de kleren getekend (i.p.v. erna), zodat de schouders van het
  // kledingstuk er straks overheen vallen -- ziet er zo aan het lichaam vast uit
  // i.p.v. los bovenop geplakt. In rust zijn beide armen elkaars exacte
  // spiegelbeeld in hoek en lengte, hand komt ~halverwege het kledingstuk uit;
  // met een mic/toverstaf wijkt de rechter vanzelfsprekend af (opgeheven naar
  // het gezicht). De bijbehorende decoratie (mic-kop, sterpunt, ...) komt
  // pas ná de kleren (zie verderop) zodat die zelf nooit erdoor verdwijnt.
  s += `<path d="M84 112 Q68 132 64 157" stroke="${SKIN}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
  s += mic
    ? `<path d="M116 112 Q134 98 145 80" stroke="${SKIN}" stroke-width="9" fill="none" stroke-linecap="round"/>`
    : `<path d="M116 112 Q132 132 136 157" stroke="${SKIN}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
  // benen: blote benen onder een zoom, of de broekspijpen zelf
  s += B.legs(dc);
  // romp: jurk of shirt, in de kleur (en het patroon) van hetzelfde ene item
  s += B.torso(dc, mic);
  if (dress.pattern && B.pat[dress.pattern]) s += B.pat[dress.pattern];
  // schoenen (schoenkleur is een eigen categorie in de kleedkamer)
  const shoe = eq.shoes ? item(eq.shoes) : null;
  const sc = shoe ? (shoe.color === 'RAINBOW' ? `url(#rb${uid})` : shoe.color) : '#e91e63';
  s += `<ellipse cx="86" cy="234" rx="11" ry="6" fill="${sc}"/><ellipse cx="114" cy="234" rx="11" ry="6" fill="${sc}"/>`;
  // vastgehouden voorwerp: pas ná de kleren getekend (en na de arm zelf,
  // hierboven), zodat de decoratie nooit onder een schouder verdwijnt
  if (mic) {
    if (mic.id === 'mic_pintje') {
      // proost! een pintje in de opgeheven hand
      s += `<text x="135" y="82" font-size="26">🍺</text>`;
    } else if (mic.id === 'mic_toverstaf') {
      // toverstaf met fonkelende sterpunt
      s += `<line x1="145" y1="80" x2="159" y2="54" stroke="#6d4c41" stroke-width="4.5" stroke-linecap="round"/>`;
      s += `<text x="150" y="58" font-size="18">⭐</text><text x="165" y="40" font-size="12">✨</text>`;
    } else {
      s += `<line x1="145" y1="80" x2="153" y2="68" stroke="#555" stroke-width="5" stroke-linecap="round"/>`;
      s += `<circle cx="156" cy="63" r="9" fill="${mic.color === 'RAINBOW' ? `url(#rb${uid})` : mic.color}" stroke="#666" stroke-width="1.5"/>`;
      s += `<text x="163" y="47" font-size="15">🎵</text>`;
    }
  }
  s += `</svg>`;
  return s;
}
function applyStage(el, p) {
  const st = itemOr(p.equipped.stage, 'stage_disco');
  el.style.background = st.bg;
  el.querySelectorAll('.deco').forEach(d => d.remove());
  st.deco.forEach((emoji, i) => {
    const d = document.createElement('div');
    d.className = 'deco';
    d.textContent = emoji;
    if (i === 0) { d.style.top = '8px'; d.style.left = '8px'; }
    if (i === 1) { d.style.top = '8px'; d.style.right = '8px'; }
    if (i === 2) { d.style.bottom = '8px'; d.style.right = '8px'; }
    el.appendChild(d);
  });
}

/* ================= Schermen ================= */
/* De reis hoort bij Kaart: hij is dezelfde plek, alleen verder weg. Daardoor
   blijft de balk staan én blijft hij hetzelfde aanwijzen bij het uit- en inzoomen
   -- en is er altijd een weg terug, ook voor een kind dat de ← niet vindt. */
const NAV_FOR_SCREEN = { 'screen-map': 'nav-map', 'screen-journey': 'nav-map',
                         'screen-dress': 'nav-dress', 'screen-trophies': 'nav-tro' };
/* Staat de navigatiebalk aan, en zo ja bij welk tabblad? Afgeleid van het scherm
   dat NU actief is, en niet van een waarde die ergens eerder opgehaald werd.

   Dat verschil is geen muggenzifterij. navMee zet de balk tijdens een overgang
   even met de hand aan, en ruimt dat 400ms later weer op. Ging het kind binnen die
   400ms alweer een scherm verder -- een show in en meteen weer uit, wat een kind
   van vijf moeiteloos haalt -- dan zette die opruimer de balk terug op wat hij
   ooit ophaalde: verborgen. En dan zit er een kind op de kaart zonder enige knop.
   Een laat opruimertje mag nooit een ouder antwoord opleggen dan het scherm dat
   er nu staat. */
function navVolgtScherm() {
  const actief = document.querySelector('.screen.active');
  const navId = actief ? NAV_FOR_SCREEN[actief.id] : null;
  $('main-nav').style.display = navId ? 'flex' : 'none';
  return navId || null;
}
function show(id) {
  // De overgangsklassen horen bij één wissel en niet bij een scherm. Ze gaan er
  // hier af en niet aan het eind van de animatie: zie .komt-op in het stijlblad --
  // 'animation: none' weghalen terwijl een scherm in beeld staat laat screenIn
  // alsnog aanslaan, en dat is een knipper.
  // De eerste aanblik staat er zonder fade (zie body.start); vanaf de eerste
  // schermwissel fadet alles weer zoals het hoort.
  document.body.classList.remove('start');
  // De begroeting van de kaart hoort bij de kaart -- zie kaartGroetStop.
  if (id !== 'screen-map') kaartGroetStop();
  // en die van de sterrenkeuze bij de sterrenkeuze -- zie landingStil.
  if (id !== 'screen-profile') landingStil();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active', 'komt-op'));
  $(id).classList.add('active');
  const onProfile = (id === 'screen-profile');
  $('corner-btns').style.display = onProfile ? 'flex' : 'none';
  if (!onProfile) closeGearMenu();
  // de vaste navigatie hoort alleen bij de rustpunten, niet bij spel/einde/instellingen
  const navId = navVolgtScherm();
  ['nav-map', 'nav-dress', 'nav-tro'].forEach(n => $(n).classList.toggle('active', n === navId));
  $('dress-bar').style.display = (id === 'screen-dress') ? 'flex' : 'none';
  // de tekening-ophaler van de reis kijkt naar een scherm dat er niet meer is
  if (id !== 'screen-journey') reisStopWaarnemer();
  if (navId) updateTroDot();
  syncBackGuard();   // elk schermwissel loopt door hier heen -- zie "Terug-navigatie" onderaan
}
// Kaart is altijd "thuis" (goMap() start zelf al altijd bij de huidige wereld,
// nooit een onthouden positie). Kleedkamer/Trofeeën onthouden juist wél waar
// je was: nogmaals tikken op het tabblad waar je al op stond geeft een verse
// start; vanuit een ánder tabblad hervat je gewoon waar je gebleven was.
function navGo(t) {
  sndClick();
  const wasActive = $('nav-' + t).classList.contains('active');
  if (t === 'map') goMap();
  else if (t === 'dress') (wasActive ? openKleedkamer : resumeKleedkamer)();
  else (wasActive ? openTrophies : resumeTrophies)();
}

/* ================= De sterrenkeuze leeft ==================================
   Dit scherm heeft één taak -- kies een ster -- en het houdt zich daar bewust
   stil voor. Er stond hier ooit een begroeting waarin álle sterren na elkaar
   zwaaiden bij elke opbouw, en die is er juist afgehaald: een rij poppen die
   telkens weer dezelfde golf doet leest als een schermbeveiliger, niet als
   iemand die hallo zegt.

   Wat er nu staat is hetzelfde idee met een andere dosering:

     binnenkomen   iedereen zwaait één keer, net niet tegelijk, en daarna is het
                   klaar. Eén keer per kéér dat je hier komt -- niet per
                   hertekening, want renderProfiles draait ook als er een ster
                   bijkomt of wegvalt.
     daarna        lange stilte, één pop, lange stilte. Nooit twee tegelijk,
                   nooit twee keer achter elkaar dezelfde.

   Dat verschil is het hele punt: "af en toe zegt er iemand hoi" in plaats van
   "de tegels draaien een animatie". Vandaar ook de rust van elf tot negentien
   seconden -- lang genoeg dat je het niet ziet aankomen.

   Alles hangt aan timers die in landingStil() weer losgelaten worden, en dat
   gebeurt bij élke schermwissel (zie show). Er loopt dus niets door op een
   scherm dat je verlaten hebt, en twee keer binnenkomen stapelt niet. */
const LANDING = {
  komNa: 520,       // het scherm eerst laten landen -- ruim na MOTION.totaal
  tussen: 140,      // en dan de sterren na elkaar, net genoeg uit de pas
  duur: 950,        // zolang duurt een pasje (zie de move-* in de CSS)
  rustMin: 11000,   // daarna minstens zoveel stilte
  rustMax: 19000,   // en hoogstens zoveel
};
/* Twee pasjes, en met opzet de twee kleinste. Een tegel snijdt af (overflow:
   hidden) en een sprong van 38 pixels zet de pop met haar hoofd buiten het
   podium; zwaaien en wiegen blijven binnen hun eigen vak. */
const LANDING_PASJES = [{ cls: 'move-wave' }, { cls: 'move-sway' }];
/* De sterretjes op de achtergrond. Ze stonden eerst als twee eeuwige
   CSS-animaties van 17 en 23 seconden vast aan het logo: altijd dezelfde twee
   plekken, altijd dezelfde maat, en samen ongeveer één vonkje per acht seconden
   met lange dooie gaten ertussen.

   Nu twee lussen met elk een eigen tempo, en allebei van de vorm "er is er net
   een geweest, plan de volgende na een begrensde toevalspauze". Geen kansworp
   per tel: dan kún je pech hebben en valt het scherm alsnog stil. */
const VONKJES = {
  kleinMin: 1500, kleinMax: 3000,   // een klein sterretje, ergens op de achtergrond
  logoMin: 6000,  logoMax: 10000,   // en wat vaker opvallend: eentje naast de naam
  duurMin: 620,   duurMax: 900,     // zo kort staat er eentje
  trosKans: .3,                     // hoe vaak er meteen nog eentje achteraan komt
  trosMin: 170,   trosMax: 430,     // en hoe kort daarna
  laagKans: .3,                     // deel dat ónder de tegels komt i.p.v. erboven
};
let landingTimers = [], landingVorige = -1;

// de poppen op de tegels, élke keer vers opgezocht: renderProfiles bouwt ze opnieuw
function landingPoppen() {
  const rij = $('profile-row');
  return rij ? [...rij.querySelectorAll('.ster-tegel .avatar-holder')] : [];
}
const vonkTussen = (a, b) => a + Math.random() * (b - a);
/* Waar mag een sterretje staan? Uit de opmaak zoals hij er nú ligt, niet uit
   vaste getallen: op een telefoon is het raster met tegels bijna het hele midden
   en op een tablet blijft er links en rechts een brede rand over.

   Twee plekken, en allebei zijn ze leeg: de band bóven de tegels (waar het logo
   staat) en de band eronder. Nooit óp een tegel -- daar staan gezichten, namen
   en de knop waar een kind op moet tikken, en daar hoort geen glinstering
   overheen. Het woordmerk wordt ook ontweken: een vonkje dwars door de naam van
   het spel leest als een vlek. Vandaar dat hij dan opzij geschoven wordt, want
   naast de naam is juist waar hij hoort. */
function vonkPlek(bijLogo) {
  const scherm = $('screen-profile');
  const rij = $('profile-row');
  if (!scherm || !rij) return null;
  const s = scherm.getBoundingClientRect(), r = rij.getBoundingClientRect();
  const logoEl = scherm.querySelector('.spellogo img');
  const logo = logoEl ? logoEl.getBoundingClientRect() : null;
  const rand = 14;
  let y;
  if (bijLogo && logo) y = vonkTussen(logo.top - s.top - 6, logo.bottom - s.top + 6);
  /* De 30 hieronder is de vrije ruimte rond het raster met tegels, en hij is
     ruimer dan hij hoeft te zijn: een vonkje wordt gezet op zijn punt linksboven
     en groeit daarna nog (schaal tot 1, plus een kwartslag draai), dus met een
     krappe marge schampt hij alsnog de bovenste tegelrand. Op 30 gebeurt dat
     niet meer -- gemeten over drie schermmaten, duizend vonkjes, nul aanrakingen. */
  else if (Math.random() < VONKJES.laagKans && s.bottom - r.bottom > 70) y = vonkTussen(r.bottom - s.top + 30, s.height - rand);
  else y = vonkTussen(s.height * .04, Math.max(s.height * .08, r.top - s.top - 30));
  let x = vonkTussen(rand, s.width - rand);
  /* Door de naam van het spel heen: opzij schuiven naar de dichtstbijzijnde kant.
     Bij het grote vonkje is dat het hele doel -- hij hoort er nét naast. */
  if (logo) {
    const l = logo.left - s.left, rr = logo.right - s.left;
    const binnen = x > l - 10 && x < rr + 10 && y > logo.top - s.top - 10 && y < logo.bottom - s.top + 10;
    if (binnen || bijLogo) {
      x = (bijLogo ? Math.random() < .5 : x < (l + rr) / 2)
        ? vonkTussen(Math.max(rand, l - 34), Math.max(rand + 1, l - 8))
        : vonkTussen(Math.min(s.width - rand - 1, rr + 8), Math.min(s.width - rand, rr + 34));
    }
  }
  return { x, y };
}
/* Eén sterretje aan. De drie in het laagje worden steeds hergebruikt: is er
   geen vrij, dan gebeurt er niets -- en daarmee staan er nooit meer dan drie
   tegelijk, zonder dat daar een teller voor nodig is. */
function vonkje(bijLogo) {
  const laag = $('screen-profile') && $('screen-profile').querySelector('.vonk-laag');
  if (!laag) return;
  const el = [...laag.querySelectorAll('.vonk')].find(v => !v.classList.contains('aan'));
  const plek = el && vonkPlek(bijLogo);
  if (!plek) return;
  el.style.left = Math.round(plek.x) + 'px';
  el.style.top = Math.round(plek.y) + 'px';
  el.style.fontSize = Math.round(bijLogo ? vonkTussen(15, 19) : vonkTussen(8, 13)) + 'px';
  el.style.opacity = (bijLogo ? .95 : vonkTussen(.55, .8)).toFixed(2);
  el.style.animationDuration = Math.round(vonkTussen(VONKJES.duurMin, VONKJES.duurMax)) + 'ms';
  el.classList.add('aan');
  // Geen timer voor het uitzetten: de animatie meldt zelf wanneer ze klaar is.
  el.addEventListener('animationend', () => el.classList.remove('aan'), { once: true });
}
// De lus: eentje laten zien, en meteen bepalen wanneer de volgende komt.
function vonkLus(bijLogo) {
  const wacht = bijLogo ? vonkTussen(VONKJES.logoMin, VONKJES.logoMax) : vonkTussen(VONKJES.kleinMin, VONKJES.kleinMax);
  landingNa(wacht, () => {
    vonkje(bijLogo);
    /* Af en toe meteen nog eentje erachteraan. Dat is het verschil tussen een
       metronoom en sprankeling: een tempo dat je niet kunt voorspellen. */
    if (!bijLogo && Math.random() < VONKJES.trosKans) {
      landingNa(vonkTussen(VONKJES.trosMin, VONKJES.trosMax), () => vonkje(false));
    }
    vonkLus(bijLogo);
  });
}
function vonkAan() { vonkLus(false); vonkLus(true); }
/* Een timer die zichzelf weer opruimt. Zonder dat laatste groeit de lijst een
   hele sessie lang door: elk groetje legt er twee bij, en op een scherm waar een
   gezin gerust een kwartier op kan blijven staan is dat een lijst met honderden
   afgelopen id's erin. Nu staan er hoogstens de paar in die nog moeten komen. */
function landingNa(ms, fn) {
  const id = setTimeout(() => {
    landingTimers = landingTimers.filter(x => x !== id);
    fn();
  }, ms);
  landingTimers.push(id);
}
function landingPas(el, move) {
  if (!el || !zetPas(el, move)) return;
  landingNa(LANDING.duur, () => stilStaan(el));
}
// Alles los: geen wachtende groet, geen wachtende stilte, geen halve zwaai.
function landingStil() {
  landingTimers.forEach(clearTimeout);
  landingTimers = [];
  landingPoppen().forEach(stilStaan);
  const scherm = $('screen-profile');
  if (scherm) scherm.querySelectorAll('.vonk-laag .vonk.aan').forEach(v => v.classList.remove('aan'));
}
/* De stilte, en aan het eind ervan één pop. Daarna weer stilte -- dit is de enige
   lus, en hij bestaat uit één timer tegelijk. */
function landingRust(extra) {
  const rust = LANDING.rustMin + Math.random() * (LANDING.rustMax - LANDING.rustMin);
  landingNa((extra || 0) + rust, () => {
    const poppen = landingPoppen();
    if (poppen.length) {
      let i = Math.floor(Math.random() * poppen.length);
      if (poppen.length > 1 && i === landingVorige) i = (i + 1) % poppen.length;
      landingVorige = i;
      landingPas(poppen[i], pick(LANDING_PASJES));
    }
    /* De volgende stilte begint ná dit pasje en niet ernaast. Anders is "rust"
       de tijd tussen twee begínnen in plaats van tussen twee bewegingen, en
       kunnen er bij een korte rust twee poppen tegelijk staan te zwaaien -- wat
       precies is wat dit scherm niet moet doen. */
    landingRust(LANDING.duur);
  });
}
/* Een tik wint het altijd van een groetje. Wie aan het kiezen is moet niet net
   op dat moment een pop zien bewegen, dus begint de stilte gewoon opnieuw. */
function landingTikje() { landingStil(); landingRust(0); vonkAan(); }
function landingLeeft() {
  landingStil();
  const scherm = $('screen-profile');
  if (scherm) {
    scherm.removeEventListener('pointerdown', landingTikje);
    scherm.addEventListener('pointerdown', landingTikje);
  }
  // Beperkte beweging: geen begroeting en geen stilte die op iets wacht. De
  // tegels staan er precies zoals ze horen te staan, alleen zonder zwaai.
  if (motionOff()) return;
  landingVorige = -1;
  const aantal = landingPoppen().length;
  for (let i = 0; i < aantal; i++) {
    landingNa(LANDING.komNa + i * LANDING.tussen, () => landingPas(landingPoppen()[i], LANDING_PASJES[0]));
  }
  landingRust(LANDING.komNa + aantal * LANDING.tussen);
  vonkAan();
}

function goProfiles() {
  /* Een klaarliggende reis hoort bij de ster die hem verdiend heeft. Ging het kind
     vanaf het eindscherm terug naar de sterrenkeuze in plaats van naar de kaart,
     dan lag die reis er nog -- en speelde hij af op de kaart van wie er daarna
     gekozen werd. Eén wereld van iemand anders die zich opent voor jouw neus:
     precies de ene keer dat deze onthulling niet mag spelen.

     Opruimen vóór cur losgelaten wordt: de opruimer zet de kaart nog één keer recht
     en heeft daarvoor een geldige ster nodig. */
  stopWereldReis();
  pendingTravel = null;
  reisDoel = null;
  cur = null;
  kiesBezig = false;   // terug op de landing mag er weer gekozen worden (zie kiesSter)
  renderProfiles();
  toonHub('screen-profile');
  landingLeeft();
}
/* Eén tegel per kind, en op die tegel alleen wat er nodig is om jezelf te vinden
   en te zien waar je gebleven was.

   De wereld op de tegel komt uit continueWorld() -- dezelfde grens waar de tik
   haar straks heen brengt (selectProfile -> goMap zonder argument doet precies
   dat). De tegel belooft daarmee wat er gebeurt, en niet waar de pop toevallig
   staat: dat zijn sinds fase 4A twee dingen (positie is geen voltooiing), en de
   landing hoort de tweede te laten zien. Is alles uit, dan wijst continueWorld
   naar de toegift-wereld en is de streep vanzelf vol.

   Er wordt hier niets over voortgang uitgerekend of bewaard: worldProgress telt,
   net als overal elders, gewoon p.stars op. */
function sterTegel(key, p) {
  const wf = worldForIndex(continueWorld(p)) || worldFor(p.level);
  const w = wf.world;
  const v = worldProgress(p, wf);
  const deel = v.levels ? Math.round(100 * v.gespeeld / v.levels) : 0;
  const tegel = document.createElement('button');
  tegel.className = 'ster-tegel';
  tegel.innerHTML =
    `<div class="stage st-podium"><div class="avatar-holder">${pasLaag(avatarSVG(p, 132, 'klein'))}</div></div>
     <div class="st-voet">
       <div class="st-rij">
         <span class="st-ico" aria-hidden="true">${w.icon}</span>
         <span class="st-naam">${esc(p.name)}</span>
       </div>
       <div class="st-baan" aria-hidden="true"><i style="width:${deel}%"></i></div>
     </div>`;
  // De sfeer van de wereld als losse kanalen op de tegel: de gloed eromheen en de
  // kleur van de wereldband lezen var(--w-...), net als de zaal en de reis. Geen
  // enkele regel hoeft te weten in wélke wereld ze staat.
  applyWorldTheme(tegel, w);
  applyStage(tegel.querySelector('.st-podium'), p);
  // Wereldteken en streep zijn versiering voor een schermlezer (aria-hidden); deze
  // label zegt in woorden wat de tegel doet en waar hij heen gaat.
  tegel.setAttribute('aria-label', `Speel met ${p.name} — verder in ${w.name}`);
  tegel.onclick = () => kiesSter(key, tegel);
  /* Een vinger op een tegel is een wereld die zo in beeld komt. Hier gaat die ene
     tekening alvast de leiding in -- niet bij het opbouwen van dit scherm, want
     dan zou het startscherm van een gezin met zes sterren zes wereldkaarten
     tegelijk ophalen, en dat is precies wat een startscherm niet hoort te doen.

     Wat het oplevert: pointerdown ligt vóór de tik, de tegel geeft daarna nog 150
     ms antwoord (zie kiesSter) en de schermwissel duurt ook nog iets. Dat is het
     voorsprongetje waarmee de kaart in het gewone geval al met tekening opengaat
     in plaats van met de wachtstand van applyWorldArt. Duurt het langer, dan
     draagt de wereld zichzelf zolang -- dus dit is winst, geen voorwaarde. */
  tegel.onpointerdown = () => preloadArt(w.art);
  return tegel;
}
/* Een kind tikt drie keer. Zonder grendel is dat drie keer navigeren: twee
   schermwissels over elkaar, en in het slechtste geval de kaart van het ene kind
   met de ster van het andere erop. De grendel gaat pas weer open op de landing
   zelf (goProfiles), want dat is de enige weg terug naar dit scherm. */
let kiesBezig = false;
function kiesSter(key, tegel) {
  if (kiesBezig || !db.profiles[key]) return;
  kiesBezig = true;
  sndClick();
  tegel.classList.add('kiest');
  // Eerst antwoord geven, dán pas het spel in. Het is opzettelijk kort: dit is een
  // reactie op een tik en geen overgang -- die zit al tussen de kaart en de zaal.
  setTimeout(() => selectProfile(key), 150);
}
function renderProfiles() {
  const row = $('profile-row');
  // alleen de tegels verversen: de "+" hoort bij het raster en blijft staan (zie
  // de opmerking bij de opmaak) -- innerHTML leegmaken zou hem uit de DOM halen
  // en daarmee zijn id ongeldig maken voor alles wat hem later nog opzoekt
  row.querySelectorAll('.ster-tegel').forEach(el => el.remove());
  const add = $('btn-newstar');
  const keys = profileKeys();
  for (const key of keys) row.insertBefore(sterTegel(key, db.profiles[key]), add);
  /* Hoeveel kolommen. Eén ster hoeft niet in een raster te passen en drie hoeven
     niet zo klein te zijn als zes; vier worden 2+2 i.p.v. een scheve 3+1. Boven de
     zes (nu het maximum) blijft het bij drie en groeit het raster gewoon naar
     beneden -- het scherm scrolt dan, in plaats van dat de tegels blijven krimpen
     tot een kind ze niet meer raakt. */
  const n = keys.length;
  const kol = !n ? 0 : n <= 1 ? 1 : n <= 2 ? 2 : n === 4 ? 2 : 3;
  row.classList.toggle('kol-0', kol === 0);
  row.classList.toggle('kol-1', kol === 1);
  row.classList.toggle('kol-2', kol === 2);
  // Verse installatie: het keuzescherm ís het welkom. Geen apart onthaalscherm --
  // dezelfde knop en hetzelfde formulier als later, alleen luider gezegd.
  /* Met sterren op het scherm spreekt het voor zich: de tegels zijn de vraag.
     Zonder sterren is deze regel het hele welkom -- dan moet hij er wél staan,
     anders opent een verse installatie op een titel en een knop en verder niets. */
  const sub = $('profile-subtitle');
  if (sub) {
    sub.textContent = n ? '' : 'Welkom! Maak je eerste ster.';
    sub.style.display = n ? 'none' : '';
  }
  if (add) {
    add.style.display = n >= MAX_PROFILES ? 'none' : '';
    add.classList.toggle('leeg', !n);
    add.querySelector('.at-tekst').textContent = n ? 'Nieuwe ster' : 'Maak je eerste ster';
    add.setAttribute('aria-label', n ? 'Nieuwe ster maken' : 'Maak je eerste ster');
  }
  // een familie met een nieuw toestel wil hier geen kind maken maar haar back-up
  const hint = $('restore-hint');
  if (hint) hint.style.display = n ? 'none' : 'block';
  renderGearMenu();
  /* HIER WORDT NIET MEER GEZWAAID. Dit scherm had zijn eigen begroeting: alle
     sterren zwaaiden één keer, kort na elkaar. Dat was ooit de enige plek in de
     app waar een pop iets deed bij het binnenkomen van een scherm, en daarmee
     stond hij op de verkeerde plaats -- want een kind is hier maar twee tellen.
     Tikken, en je staat op de kaart; de zwaai op dit scherm en de zwaai daar
     vielen dus bijna in elkaar (zie kaartGroet, boven goMap).

     Eén begroeting, op de plek waar de ster woont. Dit scherm is een keuze en
     geen plek: hier staan zes poppen naast elkaar en er is er één van jou. De
     tegels staan daarom stil -- ook geen .idle, dat stond er al niet op. */
}
function selectProfile(key) { cur = key; goMap(); }

/* ================= Wat er geladen wordt, en wanneer =========================
   Drie soorten spullen, en ze horen op drie verschillende momenten binnen te
   komen. De hele reden dat dit uit elkaar gehouden wordt: het aantal werelden
   groeit, en alles wat "per wereld" gebeurt bij het opstarten of bij het openen
   van een scherm groeit dan mee. Deze drie regels zorgen dat dat niet gebeurt.

   1  WAT EEN WERELD IS -- meteen, alles, altijd
      Naam, icoon, volgorde, aantal levels, uitgebracht ja/nee, kleuren, de
      haltes, de beloning. Dat staat in WORLDS en dat is gewoon tekst: honderd
      werelden kosten daar een paar kilobyte. De app mág dus weten dat er veel
      werelden zijn -- ze ként ze allemaal.

      De regel die daarbij hoort: uit die gegevens mag nooit vanzelf een
      tekening volgen. Vandaar dat er nergens een lus over WORLDS staat die
      art aanraakt; alleen een wereld die in beeld is of bijna in beeld komt
      haalt zijn bestand op.

   2  WAT DE KAART LAAT ZIEN -- alleen wat er staat
      De wereldkaart toont er één, en die haalt zijn tekening op omdat hij de
      achtergrond ís (zie applyWorldArt). De reis toont er een handvol -- alles
      wat af is plus een paar vooruit (zie laatsteZichtbareWereld) -- en die
      halen hun tekening pas op als ze in de buurt van het venster komen (zie
      reisStartWaarnemer). Een wereld die er niet staat kost niets.

   3  DE ZWARE SPULLEN -- vlak vóór gebruik
      De wereldtekeningen zelf (~300 kB per stuk, 1215x2160). Die komen binnen
      als ze bijna nodig zijn, en dat is precies wat de twee functies hieronder
      doen: de volgende wereld als ze op de laatste twee shows staat, en de
      buren van de wereld waar ze nu naar kijkt. Nooit meer dan een handvol,
      nooit alles, en nooit vóór de tekening die nú op het scherm moet.

      De zaal gebruikt vooralsnog dezelfde tekening als de kaart (VENUE_TERUGVAL),
      dus een show kost geen tweede bestand. Komt er ooit een échte zaaltekening
      per wereld, dan hoort die hier bij te komen en nergens anders.

   GEHAALD onthoudt wat er al een keer aangevraagd is, zodat het opnieuw tekenen van
   de kaart (dat gebeurt bij elke halte, elke wereldwissel, elke terugkeer) niet
   telkens een nieuwe aanvraag opzet. De browsercache en de service worker doen de
   rest; dit voorkomt alleen het onnodige verkeer ernáártoe.

   FASE 6B -- een aanvraag die mislukt wordt weer vergeten. Hij stond hier voor
   altijd in: één wereldkaart die niet binnenkwam omdat het net net wegviel, en die
   wereld vroeg er deze sessie nooit meer om -- ook niet toen het net terug was.
   "Aangevraagd" hoort te betekenen "hij komt eraan", niet "we hebben het ooit
   geprobeerd". */
const ART_GEHAALD = new Set();
function preloadArt(src) {
  if (!src || ART_GEHAALD.has(src)) return;
  ART_GEHAALD.add(src);
  const img = new Image();
  img.decoding = 'async';
  img.onerror = () => ART_GEHAALD.delete(src);
  img.src = src;
}
/* Voorladen gebeurt ALTIJD achter in de rij. Een vooruitgehaald bestand mag nooit
   concurreren met de tekening die er nu moet staan -- dat is precies het beeld
   waar het kind naar kijkt. requestIdleCallback wacht tot het scherm klaar is;
   de timeout zorgt dat het er op een druk toestel toch een keer van komt. */
function naDeRust(doe) {
  if (window.requestIdleCallback) requestIdleCallback(doe, { timeout: 1200 });
  else setTimeout(doe, 400);
}
/* De volgende wereld, vlak voordat ze er is. Bij een wereldwissel schuift de nieuwe
   wereld van onderen het scherm in; is zijn tekening dan nog niet binnen, dan kijkt
   een kind een halve seconde naar een leeg kader.

   Dus: zodra ze op de laatste twee shows van haar wereld staat, gaat de volgende
   tekening alvast binnen. Niet eerder -- een wereld verder is drie kwartier spelen,
   en dit is een telefoon van een gezin. Niet twee vooruit, niet alles tegelijk:
   één bestand, op het moment dat het bijna nodig is. */
function preloadNextWorldArt() {
  if (!cur) return;
  const p = P();
  const hier = worldFor(hereLevel(p));
  // alleen als de kaart ook echt naar de wereld kijkt waar ze speelt
  if (viewWorldIdx !== hier.index) return;
  if (hier.nr < hier.levels - 1) return;        // nog niet op de laatste twee shows
  // Is de volgende wereld er niet (of nog niet uitgebracht), dan valt er niets
  // voor te laden -- dat is de toegift-stand, en die blijft in deze wereld.
  if (!worldAvailable(hier.index + 1)) return;
  const volgende = worldForIndex(hier.index + 1);
  if (volgende && volgende.world) naDeRust(() => preloadArt(volgende.world.art));
}
/* Hetzelfde idee, maar dan voor rondkijken in plaats van vooruitgaan: de buren van
   de wereld waar de kaart nú naar kijkt. Wie in de werelden-kiezer rondspringt,
   springt bijna altijd één stap -- de vorige wereld om sterren op te halen, de
   volgende om verder te gaan -- en dan schuift die tekening meteen het beeld in.

   Twee bestanden, nooit meer, en alleen werelden die al open zijn: vooruitkijken
   naar wat nog op slot zit levert geen kaart op om heen te reizen. De wereld die
   straks opengaat is niet de buurman maar de beloning, en die haalt
   preloadNextWorldArt al op tijd op.

   Achter in de rij (naDeRust): dit mag nooit vóór de kaart komen te staan die er
   nu getekend wordt. ART_GEHAALD zorgt dat het per wereld bij één aanvraag
   blijft, hoe vaak de kaart ook opnieuw opgebouwd wordt. */
function preloadBuurwerelden() {
  if (!cur || viewWorldIdx == null) return;
  const laatsteOpen = Math.min(worldFor(hereLevel(P())).index, WORLD_AVAIL - 1);
  const hier = viewWorldIdx;
  naDeRust(() => [hier - 1, hier + 1].forEach(i => {
    if (i < 0 || i > laatsteOpen) return;
    const w = worldForIndex(i);
    if (w && w.world) preloadArt(w.world.art);
  }));
}

/* ================= Wereld naar wereld: de camera klimt ====================
   Fase 3.4. Eén bewegingsregel voor álle wereldwissels, en hij is ruimtelijk:

     de kaarten klimmen van beneden naar boven, de tournee klimt van wereld 1 naar
     wereld 6, dus de camera klimt mee.

   Vooruit  = camera omhoog: de wereld waar je was zakt onder het beeld weg, de
              volgende komt van boven binnen.
   Terug    = camera omlaag: de wereld waar je was stijgt uit beeld, de vorige komt
              van onderen binnen.

   Let op het verschil met wat er hiervoor stond. Daar schoof de afgemaakte wereld
   omhóóg weg bij een stap vooruit, "in dezelfde richting als de route". Dat klopt
   voor een ster die over de weg loopt, maar niet voor het beeld: als de wereld
   omhoog gaat, gaat de camera omlaag -- en dan voelt vooruitgaan als dalen. Eén
   wereld verderop hoort hóger te liggen, en dat zie je alleen als het beeld van
   boven binnenkomt.

   Twee snelheden, en dat is met opzet het enige verschil tussen de twee gevallen:

     snel    gewoon rondkijken tussen werelden die al open zijn. Kort, functioneel,
             meteen weer bruikbaar -- het mag geen laadscherm worden.
     onthul  de eerste keer dat een wereld opengaat. Iets trager, met een tel
             stilte ervoor en een kader dat nazoomt. Geen tussenscherm, geen
             cutscene: dezelfde beweging, alleen met meer lucht eromheen.

   Beperkte beweging (prefers-reduced-motion) reist niet: dan komt de nieuwe wereld
   in 160ms op. De wissel blijft duidelijk, er rijdt alleen niets over het scherm. */
const WERELDREIS = {
  snel: 340,                                    // rondkijken tussen open werelden
  onthul: 900,                                  // de eerste keer dat een wereld opengaat
  beat: 560,                                    // stilte na de afgemaakte wereld, vóór de klim
  kort: 160,                                    // beperkte beweging: alleen een korte opkomst
  uit: 'cubic-bezier(.32,.78,.24,1)',           // los en zacht neerzetten
  traag: 'cubic-bezier(.55,0,.2,1)',            // aanzetten, reizen, neerzetten
  na: 'cubic-bezier(.2,.8,.25,1)',              // het kader dat nazoomt bij een onthulling
};

function wereldReisBezig() { return !!wereldReisOp; }
function stopWereldReis() {
  const op = wereldReisOp;
  wereldReisOp = null;
  if (op) { try { op(); } catch (e) { /* opruimen mag nooit de app tegenhouden */ } }
}
/* Een stilstaande kopie van de wereld die vertrekt. Kopiëren en niet verplaatsen:
   het echte kader houdt zo zijn plek in de opmaak én zijn schuifstand, dus er wordt
   tijdens de reis niets opnieuw ingedeeld en geen enkel plaatje opnieuw geladen.

   De kopie hangt direct ná #tour-map, dus hij ligt erbovenop -- maar nog steeds
   ónder de kop, de navigatiebalk en de weg-terug-pil. Die horen bij de app en niet
   bij de wereld, en blijven dus staan waar ze staan. */
function maakWereldSchaduw(map) {
  const k = map.cloneNode(true);
  k.removeAttribute('id');
  k.classList.add('wereld-schaduw');
  /* De kopie draagt acht knoppen met zich mee die er allang niet meer toe doen.
     aria-hidden houdt ze uit de schermlezer, pointer-events uit de vingers, en
     inert uit het toetsenbord -- browsers die inert nog niet kennen negeren de
     eigenschap gewoon, en dan doen de eerste twee nog steeds hun werk. */
  k.setAttribute('aria-hidden', 'true');
  k.inert = true;
  map.parentNode.insertBefore(k, map.nextSibling);
  k.scrollTop = map.scrollTop;        // pas ná het inhangen: daarvoor is er niets te schuiven
  return k;
}
/* De kop volgt de camera. Hij staat buiten de kaart en beweegt dus niet vanzelf
   mee; zonder dit zou de wereldnaam in één beeldje omklappen terwijl de tekening
   nog onderweg is, en dat leest als een kop die bij de verkeerde kaart hoort.
   Dezelfde richting, kleiner en korter: 9px is genoeg om "dit hoort bij die
   beweging" te zeggen. */
function kopMeeMetCamera(richting) {
  const el = $('map-tournee-label');
  if (!el || !el.animate || motionOff()) return;
  el.getAnimations().forEach(a => a.cancel());
  /* Niet naar nul: een pil die helemaal verdwijnt laat een gat in de kop achter en
     dát leest als een haperende kop, niet als een kop die meebeweegt. .2 is genoeg
     om "deze naam hoort bij die beweging" te zeggen. */
  el.animate(
    [{ transform: 'translateY(' + (richting > 0 ? -9 : 9) + 'px)', opacity: .2 },
     { transform: 'none', opacity: 1 }],
    { duration: MOTION.snel, delay: 40, easing: MOTION.uit, fill: 'backwards' });
}
/* De camera verzetten. Dit is de enige plek waar een wereld in of uit beeld rijdt.

     richting  +1 = vooruit in de tournee (camera omhoog), -1 = terug
     teken()   zet de nieuwe wereld neer. Wordt aangeroepen vóórdat er iets beweegt,
               zodat de kaart er al staat op het moment dat hij in beeld komt -- net
               als bij enterLevel: het scherm begint vóór de animatie, niet erna.
     opts.duur / opts.easing / opts.zoom / opts.klaar

   Valt de animatie weg (oud toestel, beperkte beweging, scherm al gewisseld), dan
   staat de nieuwe wereld er gewoon meteen. Er is geen toestand die kan blijven
   hangen: alles wat gezet wordt, wordt in één opruimer weer teruggezet. */
function wereldCamera(richting, teken, opts) {
  opts = opts || {};
  const scherm = $('screen-map'), map = $('tour-map');
  let gevierd = false;
  const vier = () => {
    if (gevierd) return;
    gevierd = true;
    if (opts.klaar) { try { opts.klaar(); } catch (e) { /* idem */ } }
  };
  stopWereldReis();
  const kanReizen = scherm && map && map.animate && map.isConnected
    && scherm.classList.contains('active') && map.querySelector('.world-frame') && !motionOff();
  if (!kanReizen) {
    teken();
    // Beperkte beweging: geen reis, wél een duidelijke wissel. Eén korte opkomst
    // van het kader -- er verandert zichtbaar iets, er rijdt alleen niets.
    if (motionOff() && map && map.animate) {
      const f = map.querySelector('.world-frame');
      if (f && f.animate) f.animate([{ opacity: 0 }, { opacity: 1 }],
        { duration: WERELDREIS.kort, easing: 'ease-out' });
    }
    vier();
    return;
  }
  const duur = opts.duur || WERELDREIS.snel;
  const easing = opts.easing || WERELDREIS.uit;
  const schaduw = maakWereldSchaduw(map);
  teken();                                      // de nieuwe wereld staat er nu al
  kopMeeMetCamera(richting);
  scherm.classList.add('wereld-reist');
  map.style.pointerEvents = 'none';             // niet op een bewegend doel kunnen tikken

  /* Eén schermhoogte uit elkaar, dezelfde duur, dezelfde curve: de twee lagen
     raken elkaar precies aan en lopen nooit door elkaar heen. De ene pixel die de
     vertrekkende laag tekortkomt is de naadafdekking -- exact aansluiten laat op
     sommige schermen een haarlijn zien, een pixel overlap nooit. */
  const weg = richting > 0 ? 'calc(100% - 1px)' : 'calc(-100% + 1px)';
  const komt = richting > 0 ? '-100%' : '100%';
  const aUit = schaduw.animate(
    [{ transform: 'translateY(0)' }, { transform: 'translateY(' + weg + ')' }],
    { duration: duur, easing: easing, fill: 'forwards' });
  const aIn = map.animate(
    [{ transform: 'translateY(' + komt + ')' }, { transform: 'translateY(0)' }],
    { duration: duur, easing: easing });

  /* Alleen bij een onthulling: het kader zoomt na. De nieuwe wereld komt een tikje
     te groot binnen en zakt daarna op zijn plaats -- een camera die tot stilstand
     komt. Dat gebeurt óp het kader en niet op de laag, dus de naad tussen de twee
     lagen blijft precies waar hij was.

     Alleen op het kader dat aankomt. De vertrekkende wereld kreeg hier eerst een
     scale(.975) mee, "de camera trekt weg" -- maar kleiner maken laat zijn rand
     zien, en dat is precies het ene dat op deze kaarten nooit mag (zie .world-frame:
     cover, niet contain). De wereld die weggaat gaat gewoon weg. */
  if (opts.zoom) {
    const nieuw = map.querySelector('.world-frame');
    if (nieuw && nieuw.animate) nieuw.animate(
      [{ transform: 'scale(1.055)' }, { transform: 'none' }],
      { duration: duur + 260, easing: WERELDREIS.na });
  }

  const deze = () => {
    [aUit, aIn].forEach(a => { try { a.cancel(); } catch (e) {} });
    schaduw.remove();
    scherm.classList.remove('wereld-reist');
    map.style.pointerEvents = '';
    vier();
  };
  wereldReisOp = deze;
  const af = () => { if (wereldReisOp === deze) stopWereldReis(); };
  aIn.onfinish = af;
  setTimeout(af, duur + 320);                   // vangnet, net als bij elke andere overgang
}
/* De enige weg van wereld naar wereld tijdens gewoon rondkijken: de werelden-kiezer
   en de weg-terug-pil lopen hier allebei langs.

   Een kind tikt drie keer; dat hoort één wereld verder te zijn. Vandaar de grendel,
   en vandaar dat dezelfde wereld nog eens kiezen niets doet in plaats van de kaart
   opnieuw op te bouwen. Geeft false terug als er niets gebeurd is, zodat een
   aanroeper weet dat hij niets hoeft op te ruimen. */
function navigeerNaarWereld(idx) {
  if (wereldReisBezig()) return false;
  const doel = Math.max(0, idx | 0);
  const nu = viewWorldIdx == null ? worldFor(P().level).index : viewWorldIdx;
  if (doel === nu) return false;
  wereldCamera(doel > nu ? 1 : -1, () => showWorld(doel));
  return true;
}
/* De kop van de kaart draagt nog één ding: in wélke wereld je kijkt. Waar je
   daarin bent staat op de kaart zelf -- genummerde haltes, de gouden huidige
   halte, de ster die erop staat -- en dat leest een kind van vijf wèl. */
/* PS-11 -- de pil droeg alleen de wereldnaam met een klein routetekentje erachter,
   en dat las niemand als "hier klik je voor meer werelden": het tekentje was te
   stil en de naam zelf oogt als titel, niet als knop. Een eerste versie loste dat
   op met een tekstlabel ("Naar werelden") op een eigen regel -- duidelijk, maar
   te breed uitgelegd en twee regels hoog naast een kaart die juist licht en
   speels moet ogen.

   PS-11 refine -- terug naar één regel, en het icoon vertelt het verhaal in
   plaats van het woord: links wáár je bent (wereldicoon + naam), rechts een
   herkenbaar 🌍 met een chevron erachter, in een eigen lichtblauwe waas zodat
   die kant duidelijk "hier ga je verder" zegt zonder een tweede, drukkere knop
   te worden. Bewust géén 🗺️: dat icoon is al van de "Kaart"-tab onderaan (déze
   wereld), en 🌍 hoort juist bij de tournee zelf, zie .rt-ico bij
   #screen-journey. */
const WP_CHEV = '<svg class="wp-chev" viewBox="0 0 8 14" aria-hidden="true">'
  + '<path d="M1.2 1.2l5.4 5.8-5.4 5.8" fill="none" stroke="currentColor" stroke-width="2"'
  + ' stroke-linecap="round" stroke-linejoin="round"/></svg>';
/* Eén keer per sessie knipoogt de globe met een zacht bootje + gloed, zodat een
   kind dat het icoon nog nooit heeft opgemerkt er even naar kijkt -- daarna
   nooit meer vanzelf, want een pil die naast de kaart continu beweegt is precies
   het soort ruis dat hier niet hoort. Bewust geen opslag: dit is een duwtje bij
   het openen van de kaart, geen voortgang die bewaard hoeft te blijven. */
let wpHintKlaar = false;
function renderMapTitle(p, opReis) {
  const cur = worldFor(hereLevel(p));
  // || cur: buiten de lijst is er geen wereld meer (fase 4A), en de kop moet
  // altijd iets kunnen noemen -- dan die waar de ster staat.
  const shown = (viewWorldIdx == null ? cur : worldForIndex(viewWorldIdx)) || cur;
  const anders = shown.index !== cur.index;
  const pil = $('map-tournee-label');
  const hint = !wpHintKlaar; wpHintKlaar = true;
  pil.innerHTML =
      `<span class="wp-here"><span class="wp-here-ico" aria-hidden="true">${shown.world.icon}</span>`
    + `<span class="wp-here-naam">${esc(shown.world.name)}</span></span>`
    + `<span class="wp-cta"><span class="wp-cta-ico${hint ? ' wp-hint' : ''}" aria-hidden="true">🌍</span>${WP_CHEV}</span>`;
  // Screenlezer en desktop-tooltip krijgen de volledige zin; de pil zelf laat
  // nu alleen nog de wereldnaam en twee iconen zien.
  const uitleg = `${shown.world.name} — tik voor alle werelden`;
  pil.setAttribute('aria-label', uitleg);
  pil.title = uitleg;
  /* Kijk je in een andere wereld dan waar je speelt, dan ziet de kaart er verder
     precies normaal uit -- en dan kan een kind daar blijven hangen zonder te
     merken dat ze weg is. Vandaar deze gouden weg terug, en alleen dán.

     Behalve tijdens een reis (de tussenstand vóór de reisanimatie, zie
     renderTourMap). De voortgang is dan al verzet -- p.level wijst naar de nieuwe
     wereld terwijl de kaart de oude nog toont -- en dan biedt deze pil een weg aan
     naar precies de wereld die het kind een tel later cadeau krijgt. Hij verklapt
     de onthulling, én hij is een tweede knop naar dezelfde plek midden in een
     overgang. Na aankomst tekent showWorld hem gewoon opnieuw. */
  const terug = $('world-back');
  terug.hidden = !anders || !!opReis;
  if (anders) {
    /* "⟲ Terug naar 🎵 Muziekwereld" was 216px breed en stond midden onderaan --
       precies waar de onderste haltes staan. De ⟲ zégt al "terug"; de twee woorden
       ervoor kostten de helft van de breedte en voegden er niets aan toe. */
    terug.innerHTML = `⟲ ${cur.world.icon} ${esc(cur.world.name)}`;
    // Terug naar de wereld waar ze speelt is vóóruit in de tournee -- die ligt per
    // definitie hóger dan waar ze nu staat te kijken. De camera klimt dus, net als
    // wanneer ze er via de kiezer heen gaat. Zie navigeerNaarWereld.
    terug.onclick = () => { sndClick(); navigeerNaarWereld(cur.index); };
  }
}
/* Dezelfde vorm als worldFor(), maar opgezocht op wereldnummer i.p.v. op level --
   nodig om een eerdere wereld te kunnen tónen zonder p.level aan te raken.

   Buiten de lijst komt er null uit en geen verzonnen wereld. Dat is sinds fase 4A
   het verschil: hiervoor rolde er voorbij de laatste wereld een Sterrentournee uit,
   en dus kon elke aanroeper doen alsof er altijd een volgende wereld was. Nu moet
   wie een buurwereld opvraagt zelf zien dat hij er niet is -- wat precies één
   regel is, en wat voorkomt dat er ooit weer een nepwereld in beeld komt. */
function worldForIndex(idx) {
  idx = Math.floor(idx);
  if (!(idx >= 0) || idx >= WORLDS.length) return null;
  return { world: WORLDS[idx], index: idx, first: WORLD_START[idx],
           nr: 1, levels: WORLDS[idx].levels };
}
/* ================= Zwevende lagen (overlays) =================
   Vier plekken bouwden hetzelfde op: een <div> over het scherm, wat HTML erin,
   aan de body hangen, en een close() die 'closing' zet en na de uitfade opruimt.
   Elke kopie moest bovendien zelf onthouden om die close() als ov._close te
   parkeren -- anders doet de Android-terugknop er niets mee (zie backTarget).
   Dat vergeten is niet zichtbaar tot iemand met een echte telefoon op terug drukt.

   Eén functie dus, met de klassenaam als argument: de CSS per laag blijft
   ongewijzigd, ze krijgen er alleen '.rp-overlay' bij als gemeenschappelijk
   handvat. backTarget() hoeft daardoor niet langer elke klasse apart te kennen,
   en een nieuwe laag (fase 3: wereld af, beloning) werkt meteen mee.

   opts.fade  hoelang de uitfade in de CSS duurt (ms, standaard 250)
   opts.onClose  eenmalige opruiming vóór de uitfade (timers e.d.)         */
function openOverlay(cls, html, opts) {
  opts = opts || {};
  const ov = document.createElement('div');
  ov.className = 'rp-overlay ' + cls;
  ov.innerHTML = html;
  document.body.appendChild(ov);
  ov._close = () => {
    if (!ov.isConnected) return;
    if (opts.onClose) opts.onClose(ov);
    ov.classList.add('closing');
    setTimeout(() => ov.remove(), opts.fade || 250);
    /* Ook bij het sluiten, en niet alleen bij het openen. Openen en sluiten horen
       hetzelfde te doen: anders blijft na het wegtikken van een laag die op de
       bódem van de app openging (waar terug verder niets betekent) een wachtpost
       op de history staan, en kost het één extra druk op terug voordat er iets
       gebeurt. Vandaag opent geen enkele laag daar -- alle vier komen ze van de
       kaart of het eindscherm -- maar dat is een eigenschap van de vier
       aanroepers en niet van deze functie. 'closing' staat er al, en backTarget
       slaat een sluitende laag over: de vraag wordt dus over de stand ná het
       sluiten gesteld. */
    syncBackGuard();
  };
  syncBackGuard();   // de laag is nu het bovenste ding dat 'terug' moet sluiten
  return ov;
}
// De hele carrière-ladder in beeld: behaalde, huidige en komende ster-statussen,
// met hun sterrendrempel en diamant-bonus. Tik buiten = dicht. Hergebruikt
// RANK_TIERS/starRank volledig, dus geen nieuwe data.
function openCareer() {
  sndClick();
  const p = P();
  const total = totalStarCount(p);
  const cur = starRank(total);
  const last = RANK_TIERS.length - 1;
  const curBase = Math.min(cur.idx, last);
  const into = total - cur.curMin, span = cur.nextMin - cur.curMin;
  const pct = Math.max(0, Math.min(100, Math.round((into / span) * 100)));
  const remain = cur.nextMin - total;
  // Eén doorlopende ladder van laag naar hoog. De huidige rung (curBase) toont de
  // eigen naam/emoji uit starRank (klopt ook voor de open-einde Wereldlegende ⭐N).
  // De doel-rij (volgende status) draagt de balk: naam + beloning boven, voortgang
  // eronder. De balk vult van je huidige tier naar déze drempel (de /nextMin).
  const goalRow = (emoji, name) => `<div class="ladder-row goal">`
    + `<div class="lr-top"><span class="lr-emoji">${emoji}</span><span class="lr-name">${name}</span>`
    + (rankBonusFor(cur.idx + 1) > 0 ? `<span class="lr-bonus">+${rankBonusFor(cur.idx + 1)} 💎</span>` : '') + `</div>`
    + `<div class="lr-progress"><span class="lr-bar"><span style="width:${pct}%"></span></span>`
    + `<span class="lr-count">${total}/${cur.nextMin} ⭐</span></div></div>`;
  // Alleen het stuk ladder waar je iets aan hebt: de vorige status, waar je nu
  // staat, je volgende doel en twee daarboven. De hele lijst (acht rangen, waarvan
  // de bovenste op 36% doorzichtigheid) was voor een kind vooral onleesbare ruis --
  // "Platinaster" zegt niets als je nog op 17 sterren staat. De "…en verder"-rij
  // hieronder maakt zichtbaar dat het daarna nog doorgaat.
  const vanaf = curBase - 1, tot = cur.idx + 3;
  let rows = '';
  RANK_TIERS.forEach((t, i) => {
    if (i < vanaf || i > tot) return;
    if (i < curBase) {
      rows += `<div class="ladder-row past"><span class="lr-emoji">${t.emoji}</span><span class="lr-name">${t.name}</span></div>`;
    } else if (i === curBase) {
      // huidige status: slanke 'je bent hier'-markering (zonder balk)
      rows += `<div class="ladder-row current"><span class="lr-emoji">${cur.emoji}</span>`
        + `<span class="lr-name">${cur.name}</span><span class="lr-now">NU</span></div>`;
    } else if (i === cur.idx + 1) {
      rows += goalRow(t.emoji, t.name);   // de volgende vaste rang = het doel
    } else {
      rows += `<div class="ladder-row future"><span class="lr-emoji">${t.emoji}</span><span class="lr-name">${t.name}</span></div>`;
    }
  });
  // open einde: is de volgende status een Wereldlegende ⭐N (voorbij de vaste rangen),
  // dan is díé het doel; anders sluit een gedimde "…en verder"-rij de ladder af.
  if (cur.idx >= last) rows += goalRow('⭐', cur.nextName);
  else rows += `<div class="ladder-row future"><span class="lr-emoji">⭐</span><span class="lr-name">…en verder</span></div>`;
  const ov = openOverlay('career-overlay', `<div class="pop-panel career-panel">`
    + `<button class="career-close" type="button" aria-label="Sluiten">✕</button>`
    + `<div class="career-title">Jouw ster-status</div>`
    + `<div class="career-list">${rows}</div></div>`);
  ov.onclick = e => { if (e.target === ov || e.target.classList.contains('career-close')) ov._close(); };
  requestAnimationFrame(() => { const c = ov.querySelector('.ladder-row.current'); if (c) c.scrollIntoView({ block: 'center' }); });
  // gesproken samenvatting (lees-vrij, ook fijn voor kleuters)
  speak(`Je bent een ${cur.name}. Nog ${remain} sterren tot de volgende ster-status.`);
}
/* ================= Bewegingstaal: kaart <-> zaal ===========================
   MOTION is de JS-kant van de bewegingsladder. Vier snelheden, en niets ertussen:

     tik     70ms   --t-tik            een knop die indrukt        (CSS)
     snel   220ms   --t-snel           goed / fout                 (CSS)
     nav            MOTION.totaal      een gewone schermwissel
     reis           VLUCHT.totaal      kaart <-> wereldkaartje

   DE ONDERSTE TWEE KRIJGEN GEEN EIGEN GETAL, en dat is het hele punt. Een
   schermwissel is niet één duur maar drie stukjes achter elkaar (weg, komNa,
   kom); een vlucht is er twee (duur, kruis). Wie wil weten hoe lang zo'n wissel
   duurt telt ze niet over uit een commentaar maar leest MOTION.totaal of
   VLUCHT.totaal -- die kunnen per definitie niet uit de pas lopen met wat er
   echt gebeurt.

   Want dat liepen ze. Hier stond, samen met hetzelfde lijstje in :root en de
   opdracht de twee gelijk te houden: "nav 320 . reis 380". Het spel deed toen al
   300 en 420. Twee commentaren die naar elkaar wijzen houden elkaar niet bij; de
   code doet dat wel.

   Wat een overgang hier moet doen, en verder niets: uitleggen dat de zaal de plek
   ís die je net aantikte. Geen titelkaartje, geen laadscherm, geen keten van
   timers die op elkaar wachten. Vandaar de opzet hieronder:

     het spel begint vóór de animatie, niet erna.

   startLevel() doet zijn volle werk in dezelfde beurt als de tik; de animatie
   loopt daar overheen. Er is dus geen moment waarop het scherm leeg is en geen
   toestand die kan blijven hangen als er iets misgaat -- valt de animatie weg,
   dan staat het spel er gewoon meteen. */
const MOTION = {
  tik: 70, snel: 220,                               // dezelfde twee als --t-* in :root
  /* Een schermwissel is géén overvloeier. Hier stond hij dat wel te zijn: het
     vertrekkende scherm deed er 470ms over en het aankomende begon al na 80ms,
     dus bijna vier tienden van een seconde stonden er twee halfdoorzichtige
     schermen over elkaar. Dat leest niet als een overgang maar als haperende
     software -- alsof het vorige scherm niet goed weg is.

     Nu netjes na elkaar: eerst weg, dan pas aan.

       weg    140  het vertrekkende scherm; klaar vóór er iets anders begint
       komNa  110  wanneer het aankomende scherm losgaat -- 30ms vóór het vorige
                   op nul staat, en dat is met opzet: precies aan elkaar plakken
                   laat een paar beeldjes kale app-achtergrond zien, en dát ziet
                   er weer uit als een flits. Op 30ms zijn ze allebei nog vrijwel
                   onzichtbaar, dus er is geen moment waarop je twee schermen
                   tegelijk kúnt lezen.
       kom    190  het aankomende scherm

     Samen 300ms van tik tot rust.

     WIE BOVENOP LIGT, DOET DE DOORZICHTIGHEID -- en dat is altijd het scherm dat
     vertrekt. Dat stond er als bedoeling al, maar niet als regel, en daardoor
     deden ze het allebei: het vertrekkende scherm doofde uit én het aankomende
     kwam uit doorzichtig op. Halverwege stonden er dus twee halfdoorzichtige
     schermen over de áchtergrond van de app, en wat je dan ziet is geen van
     beide schermen maar een mengsel.

     Op de weg terug uit een show was dat goed te zien: het donkere paneel van het
     eindscherm hing als een brede donkere band dwars over een verwassen
     wereldkaart, en verdween dan met een flits. Opgemeten op 120ms: eindscherm
     nog 53% zichtbaar, kaart pas 19% -- en door de doorzichtigheid van allebei
     scheen de roze app-achtergrond er ook nog doorheen.

     Twee dingen zorgen ervoor dat dat niet meer kan:

       1  het scherm dat AANKOMT beweegt alleen. Het is vanaf zijn eerste beeldje
          volledig ondoorzichtig, dus er ligt altijd één dekkend scherm over het
          venster en de achtergrond van de app is nooit te zien.
       2  het scherm dat VERTREKT ligt erbovenop en doft weg. Dat is de enige
          doorzichtigheid in het hele plaatje, en daarmee is een overgang een
          onthulling in plaats van een overvloeier.

     ONDOORZICHTIG IS NIET GENOEG -- HET MOET OOK DEKKEN. Een aankomend scherm
     begint daarom nooit kleiner dan 1: geen scale(.94), geen translateY. Dat
     stond er wél, bij de twee overgangen die "naar binnen" gaan (een halte in,
     een wereld kiezen op de reis), en dan dekt het scherm maar 94% van het
     venster. Wat je die twee tienden zag was een kaart die als een kaartje
     midden in beeld stond met een rand van het vórige scherm eromheen, en die
     dan groeide tot hij paste. Op de kaart viel dat het meest op aan de weg: de
     stippellijn stond eerst kleiner en schoof daarna op zijn plek.

     Een aankomend scherm komt dus altijd van 1.06 naar 1: het dijt uit naar de
     rand toe en is op elk moment groter dan het venster. Het punt waar het
     omheen draait (zie oorsprongPct) draagt de continuïteit, niet de richting
     van de schaal -- en dát is precies wat kaartTerugZoom altijd al deed.

     En de doorzichtigheid gaat vóórop weg (easing 'uit' i.p.v. 'in'). Die twee
     curven staan hieronder: 'in' houdt een scherm bijna vol in beeld om het aan
     het eind pas weg te slaan -- prima voor een beweging, precies verkeerd voor
     doorzichtigheid, want dán duurt het vertrek het langst waar het het meest
     opvalt. De beweging houdt 'in'; het wegdoven krijgt 'uit' en is op 110ms
     (als het aankomende scherm losgaat) al op 5%. Dát is wat "eerst weg, dan pas
     aan" hierboven altijd al bedoelde. */
  weg: 140, komNa: 110, kom: 190,
  uit: 'cubic-bezier(.2,.8,.3,1)',                  // komt aan: snel los, zacht neerzetten
  in: 'cubic-bezier(.5,0,.75,0)',                   // vertrekt: zacht los, snel weg
  plop: 'cubic-bezier(.2,1.3,.4,1)',                // de enige overshoot: "ja, deze"
};
// De sport 'nav' van de ladder: hoe lang de hele wissel duurt, van de tik tot
// alles stilstaat. Het vertrekkende scherm (weg) valt hier binnen -- dat is op
// 140ms klaar, ruim voordat het aankomende scherm op 300 tot rust komt.
MOTION.totaal = MOTION.komNa + MOTION.kom;

function eindigOvergang(anim, dur, opruimen) {
  let gedaan = false;
  const klaar = () => {
    if (gedaan) return;
    gedaan = true;
    overgangBezig = false;
    try { opruimen(); } catch (e) { /* opruimen mag nooit de app tegenhouden */ }
  };
  if (anim) anim.onfinish = klaar;
  setTimeout(klaar, dur + 260);
  return klaar;
}
/* Transform-origin als percentage van een element, uit een punt in
   venstercoördinaten. Geklemd op het element zelf (0-100%), en dat is geen
   netheid maar precies wat de dekkingsregel bij MOTION nodig heeft:

   uitvergroten om een punt binnen het element dekt altijd -- de randen gaan alle
   vier naar buiten. Ligt het draaipunt erbuiten, dan niet: bij een oorsprong op
   104.5% van de hoogte en scale(1.06) komt de ónderrand 2px boven de vensterrand
   uit, en dan staat daar een streepje van het scherm eronder. Dat gebeurde echt:
   een bestemming onderaan de reis aantikken gaf een oorsprong van 104.5%.

   Klemmen kost niets aan het gevoel -- het draaipunt schuift naar de dichtstbijzijnde
   rand, en dat is nog steeds de kant waar je vandaan kwam. */
function oorsprongPct(el, punt) {
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return '50% 50%';
  const klem = v => Math.max(0, Math.min(100, v));
  return klem((punt.x - r.left) / r.width * 100).toFixed(1) + '% '
       + klem((punt.y - r.top) / r.height * 100).toFixed(1) + '%';
}
/* Het scherm dat vertrekt -- één functie voor beide richtingen:

     naarBinnen   je gaat een level ín. De kaart duikt naar het aangetikte punt
                  toe (7% groter) en laat los.
     anders       je komt er weer úit. Het scherm zakt een stukje weg (4% kleiner,
                  10px omlaag).

   Twee kanten van dezelfde beweging, dus één functie en één set getallen.

   Het hele scherm beweegt, niet alleen de tekening erin. Dat was de eigenlijke
   fout: de wereldtekening verdween netjes, maar de kop met de wereldnaam en de
   diamanten bleef volledig ondoorzichtig staan terwijl de zaal er al doorheen
   opkwam. Een scherm vertrekt in zijn geheel of niet.

   Vast gepositioneerd (zie .wegvallend), zodat het uit de kolom stapt en het
   binnenkomende scherm meteen zijn volle maat krijgt in plaats van er even naast
   te staan -- en boven de vaste navigatiebalk, zodat die er niet doorheen prikt
   terwijl dit scherm nog in beeld is. */
function schermWeg(el, naarBinnen, punt) {
  if (!el || !el.animate || motionOff()) return;
  el.getAnimations().forEach(a => a.cancel());   // een tweede tik stapelt geen tweede animatie
  el.classList.add('wegvallend');
  // draaipunt: de aangetikte halte, zodat de beweging om díe plek gaat en niet om
  // het midden van het scherm. Dat is het enige wat de continuïteit draagt.
  if (punt) el.style.transformOrigin = oorsprongPct(el, punt);
  const op = () => {
    el.classList.remove('wegvallend');           // meteen uit de opmaak: scheelt een volle laag
    el.style.transformOrigin = '';
    el.getAnimations().forEach(a => a.cancel());
  };
  /* Twee animaties op hetzelfde scherm, en dat is geen omslachtigheid maar het
     hele punt: beweging en doorzichtigheid hebben hier tegengestelde curven
     nodig. De beweging houdt 'in' (zacht los, snel weg -- dat is het karakter);
     het wegdoven krijgt 'uit', zodat het scherm al vrijwel weg is op het moment
     dat het volgende losgaat. Zie de regel bij MOTION. */
  const a = el.animate(
    [{ transform: 'none' },
     { transform: naarBinnen ? 'scale(1.07)' : 'scale(.96) translateY(10px)' }],
    { duration: MOTION.weg, easing: MOTION.in, fill: 'forwards' });
  el.animate([{ opacity: 1 }, { opacity: 0 }],
    { duration: MOTION.weg, easing: MOTION.uit, fill: 'forwards' });
  a.onfinish = op;
  setTimeout(op, MOTION.weg + 260);              // vangnet
}
/* De vaste navigatiebalk staat buíten de schermen, dus hij doet niet vanzelf mee
   met een wissel: hij knipt aan of uit op het moment dat show() hem zet. Tijdens
   een overgang is dat precies het ene element dat verraadt dat er twee schermen
   tegelijk staan -- een volledig ondoorzichtige balk over een scherm dat nog aan
   het verschijnen is. Hij krijgt dus dezelfde fade als het scherm waar hij bij
   hoort. */
function navMee(naarBinnen) {
  const nav = $('main-nav');
  if (!nav || !nav.animate || motionOff()) return;
  nav.getAnimations().forEach(a => a.cancel());
  if (!naarBinnen) {
    // De kaart komt op en neemt zijn balk mee. fill:'backwards' houdt hem op nul
    // zolang de vorige nog wegvalt, dus hij verschijnt niet alvast over een zaal.
    if (nav.style.display === 'none') return;
    nav.animate([{ opacity: 0 }, { opacity: 1 }],
      { duration: MOTION.kom, delay: MOTION.komNa, easing: MOTION.uit, fill: 'backwards' });
    return;
  }
  /* Andersom: show() heeft de balk al uitgezet omdat er in een show geen
     navigatie hoort. Maar de kaart is dan nog 140ms bezig met vertrekken, en een
     kaart waarvan de balk al bij de tik verdwenen is ziet er kapot uit. Hij komt
     dus even terug, gaat mee weg, en wordt daarna gezet zoals show() hem wilde. */
  nav.style.display = 'flex';
  const op = () => { nav.getAnimations().forEach(a => a.cancel()); navVolgtScherm(); };
  const a = nav.animate([{ opacity: 1 }, { opacity: 0 }],
    { duration: MOTION.weg, easing: MOTION.in, fill: 'forwards' });
  a.onfinish = op;
  setTimeout(op, MOTION.weg + 260);
}
/* ---- De wereld en zijn kaartje: één ding op twee maten (PS-24) ------------
   Wereldkaart en Werelden zijn niet twee schermen maar twee afstanden tot
   dezelfde plek: ingezoomd sta je erin, uitgezoomd zie je hem liggen tussen de
   andere. Deze vlucht is wat die zin zichtbaar maakt -- de tekening van de
   wereld krimpt naar het kaartje waar hij op Werelden ligt, of groeit daar
   vandaan weer uit tot het hele scherm.

   Hoe het werkt staat bij .wereld-vlucht in het stijlblad. Wat hier telt:

     1  er wordt NIETS gekloond. De vluchtlaag is één <div> met één <div> erin,
        met dezelfde background-image-URL als de kaart -- die staat al in de
        cache, dus er wordt niets opnieuw opgehaald of gedecodeerd. Heeft een
        wereld (nog) geen tekening, dan vliegt zijn verloop mee: dezelfde drie
        lagen als .world-frame, dus er is altijd íets om te laten krimpen.
     2  begin- en eindmaat worden één keer opgemeten, vóór er iets beweegt.
        Tijdens de vlucht meet niemand meer iets; er lopen alleen transform-,
        clip-path- en opacity-animaties.
     3  hij ruimt zichzelf altijd op. Ook als een animatie nooit klaarmeldt
        (scherm weg, tabblad naar de achtergrond), ook als er middenin nog een
        keer getikt wordt: elke nieuwe vlucht sluit eerst de vorige af.

   Een 'vlak' is wat één kant van de vlucht nodig heeft, en niet meer:

     clip    het gat waar je doorheen kijkt, in vensterpixels
     kunst   waar de héle tekening ligt (mag ruim buiten clip vallen -- dat is
             precies wat cover doet)
     rond    de ronding van dat gat

   Zolang beide kanten dat opleveren, weet de vlucht van geen enkel scherm iets
   af. Daarom doet hij ook de terugweg, en zou hij een derde plek aankunnen. */
const VLUCHT = {
  /* 340 + 80 = 420ms van tik tot rust. De overvloeier staat er expres achter en
     niet overheen: pas als de tekening precies op zijn bestemming ligt, dooft de
     vluchtlaag weg op het échte kaartje eronder. Zouden die twee overlappen, dan
     kruist er een tekening van 97% met eentje van 100% -- en dat is precies het
     soort "bijna" dat als onscherpte leest. Nu kruisen er twee beelden die op de
     pixel hetzelfde zijn, en wat er in die 80ms écht verschijnt is alleen wat op
     het kaartje extra staat: de naam, de sterrenteller, het zegel. */
  duur: 340,       // de beweging zelf -- één beweging, geen keten
  kruis: 80,       // de overvloeier erna: vluchtlaag uit, het echte ding aan
  /* De haltes, de weg en de ster zijn wég voordat de tekening merkbaar gekrompen
     is, en dat moet ook: ze schuiven niet mee (dat zou acht bolletjes in een
     kaartje van 200 pixels persen) en blijven dus op hun plek hangen. Op 90ms
     staat de tekening op ~60% en zijn zij al op een tiende -- je ziet ze dus niet
     los van de wereld komen, je ziet ze oplossen. */
  detail: 90,      // haltes, weg, ster en knoppen van de ingezoomde wereld
  reveal: 240,     // de route en de andere werelden eromheen
  /* De vluchtbaan krijgt een eigen curve, en dat is de enige plek in de app waar
     MOTION.uit niet volstaat. Die curve is gemaakt voor bewegingen van een paar
     procent (een scherm dat 6% inzoomt); hij zet 58% van de weg in de eerste 60ms.
     Over de afstand van deze vlucht -- van het hele scherm naar een kaartje van
     een vijfde daarvan -- leest dat als een sprong met een staartje. Deze curve
     legt in diezelfde 60ms 42% af: nog steeds meteen antwoord, maar het middenstuk
     blijft te volgen en de landing blijft zacht. Geen overshoot: een navigatie is
     geen beloning. */
  baanPunten: [.33, .72, .25, 1],
};
VLUCHT.baan = 'cubic-bezier(' + VLUCHT.baanPunten.join(',') + ')';
// De sport 'reis' van de ladder: de beweging plus de overvloeier erachteraan.
VLUCHT.totaal = VLUCHT.duur + VLUCHT.kruis;
/* Dezelfde curve, maar uit te rekenen in JS. Dat is nodig omdat de vlucht uit twee
   transforms bestaat die samen één beweging moeten zijn (zie vluchtBeelden): laat
   je de browser ze allebei los interpoleren, dan klopt hun product er tussenin
   niet en rekt de tekening zichtbaar uit. De waarden worden dus vooraf uitgerekend
   en als beeldjes meegegeven -- en dan moet de curve hier bekend zijn.

   Newton-Raphson op de x-component, precies zoals de browser het zelf doet. Twaalf
   stappen is ruim: hij zit na drie al binnen een miljoenste. */
function bezierCurve(p1x, p1y, p2x, p2y) {
  const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
  const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t;
  const dX = t => (3 * ax * t + 2 * bx) * t + cx;
  const Y = t => ((ay * t + by) * t + cy) * t;
  return x => {
    let t = x;
    for (let i = 0; i < 12; i++) {
      const fout = X(t) - x;
      if (Math.abs(fout) < 1e-6) break;
      const d = dX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= fout / d;
    }
    return Y(t);
  };
}
const vluchtCurve = bezierCurve.apply(null, VLUCHT.baanPunten);
// de tekening in een reis-kaartje: cover, met hetzelfde zwaartepunt als .reis-art
const REIS_ART_Y = .36;

function vlakRect(r) { return { left: r.left, top: r.top, w: r.width, h: r.height }; }
function vlakRond(el) {
  const v = parseFloat(getComputedStyle(el).borderTopLeftRadius);
  return v > 0 ? v : 0;
}
// het gedeelde stuk van twee rechthoeken; null als ze elkaar niet raken
function vlakSnij(a, b) {
  const left = Math.max(a.left, b.left), top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right), bottom = Math.min(a.bottom, b.bottom);
  if (right <= left || bottom <= top) return null;
  return { left, top, w: right - left, h: bottom - top };
}
/* De wereldkaart zoals hij nú staat. Het kijkgat is het vak waarin de tekening te
   zien is (rechtop het hele scherm, liggend het podium), de tekening zelf is het
   kader -- dat steekt er met opzet buiten uit, want zo werkt cover. */
function kaartVlak() {
  const map = $('tour-map');
  const kader = map && map.querySelector('.world-frame');
  if (!kader) return null;
  const m = map.getBoundingClientRect(), k = kader.getBoundingClientRect();
  if (!m.width || !k.width) return null;
  const clip = vlakSnij(m, k);
  return clip ? { clip, kunst: vlakRect(k), rond: vlakRond(kader) } : null;
}
/* Eén bestemming op Werelden. De tekening ligt daar op cover met
   background-position 50% 36% (zie .reis-art), en dat is precies wat hier
   uitgerekend wordt -- niet opgemeten, want er staat geen element omheen dat die
   uitsnede draagt. */
function halteVlak(halte) {
  const plaats = halte && halte.querySelector('.reis-plaats');
  if (!plaats) return null;
  const r = plaats.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const verh = ART_W / ART_H;
  let w = r.width, h = w / verh;
  if (h < r.height) { h = r.height; w = h * verh; }
  return {
    clip: vlakRect(r),
    kunst: { left: r.left + (r.width - w) / 2, top: r.top - (h - r.height) * REIS_ART_Y, w, h },
    rond: vlakRond(plaats),
  };
}
function mengRect(a, b, e) {
  return { left: a.left + (b.left - a.left) * e, top: a.top + (b.top - a.top) * e,
           w: a.w + (b.w - a.w) * e, h: a.h + (b.h - a.h) * e };
}
/* De beeldjes van de vlucht, vooraf uitgerekend. Twee redenen, en de eerste is een
   fout die we op een trage telefoon gegarandeerd zouden krijgen.

   1  HET GAT MOET OP DE COMPOSITOR, NET ALS DE TEKENING. Hier stond het kijkgat
      als een clip-path-animatie, en dat leek prima: de gemeten clip-path klopte op
      elk beeldje. Alleen rekent Chromium een transform op de compositor uit en een
      clip-path op de hoofddraad. Zolang die twee gelijk opgaan zie je niets; hapert
      de hoofddraad -- en die hapert, want bij het openen van Werelden worden de
      tekeningen van de buurwerelden binnengehaald en gedecodeerd -- dan schuift de
      tekening wél door en het gat niet. Wat je dan ziet is de hele wereldtekening,
      staand en ongeknipt, over de kaartjes eromheen: de flits aan het eind van de
      overgang. Nagemeten: één op de zeven overgangen op een snelle machine, en met
      de hoofddraad 220ms met opzet dichtgezet élke keer.

      Nu is het gat een gewoon vak met overflow:hidden dat zélf schaalt. Een
      overflow-clip hangt aan de transform van dat vak, dus hij zit in dezelfde
      boom en op dezelfde draad als de tekening erin. Ze kúnnen niet meer uit elkaar
      lopen -- niet op een trage telefoon, niet met een hik in het netwerk.

   2  MAAR DAN MOETEN DE TWEE TRANSFORMS WEL SAMEN KLOPPEN. Het vak schaalt
      ongelijk (van een staand scherm naar een liggend kaartje), en de tekening
      erin draait dat terug zodat zij zelf gelijkmatig krimpt. Die twee
      vermenigvuldigen, en een browser interpoleert ze los van elkaar: halverwege
      staat er dan (0,69 x 1,06) in plaats van (0,85 x 0,85) -- een tekening die
      een halve tel zichtbaar uitgerekt wordt.

      Vandaar dat hier niet twee eindwaarden staan maar 25 beeldjes, met de curve er
      al in verwerkt en met 'linear' ertussen. Op elk beeldje is het product exact
      gelijkmatig; ertussenin wijkt het minder af dan een tiende procent. Het kost
      één lus van 25 stappen vóór de vlucht begint, en daarna niets meer.

   3  EN DE RONDING MOET EEN EIGEN ANIMATIE ZIJN. border-radius kan niet op de
      compositor, en één niet-composeerbare eigenschap in een reeks beeldjes zet
      díe hele animatie op de hoofddraad -- ook de transform die ernaast staat.
      Zet je de ronding dus bij de vorm in, dan heb je fout 1 terug met een andere
      oorzaak: nagemeten, en het lekte precies zo. Twee animaties op hetzelfde vak
      dus, met dezelfde beeldjes en dezelfde duur.

      De ronding blijft daarmee het enige dat op de hoofddraad loopt, en dat mag:
      hapert hij, dan zijn de hoeken een paar beeldjes minder rond. De tekening
      blíjft binnen zijn vak, en dat is waar het om ging. */
const VLUCHT_BEELDJES = 25;
function vluchtBeelden(van, naar) {
  const vorm = [], rand = [], binnen = [];
  const ox = van.kunst.left - van.clip.left, oy = van.kunst.top - van.clip.top;
  for (let i = 0; i < VLUCHT_BEELDJES; i++) {
    const x = i / (VLUCHT_BEELDJES - 1);
    const e = i === 0 ? 0 : i === VLUCHT_BEELDJES - 1 ? 1 : vluchtCurve(x);
    const C = mengRect(van.clip, naar.clip, e);
    const A = mengRect(van.kunst, naar.kunst, e);
    const kx = C.w / van.clip.w, ky = C.h / van.clip.h;
    const a = A.w / van.kunst.w;
    const R = van.rond + (naar.rond - van.rond) * e;
    vorm.push({ offset: x, easing: 'linear',
      transform: `translate(${(C.left - van.clip.left).toFixed(2)}px, ${(C.top - van.clip.top).toFixed(2)}px)`
               + ` scale(${kx.toFixed(6)}, ${ky.toFixed(6)})` });
    rand.push({ offset: x, easing: 'linear',
      borderRadius: `${(R / kx).toFixed(2)}px / ${(R / ky).toFixed(2)}px` });
    binnen.push({ offset: x, easing: 'linear',
      transform: `translate(${((A.left - C.left) / kx - ox).toFixed(2)}px,`
               + ` ${((A.top - C.top) / ky - oy).toFixed(2)}px)`
               + ` scale(${(a / kx).toFixed(6)}, ${(a / ky).toFixed(6)})` });
  }
  return { vorm, rand, binnen };
}

/* Staan twee dingen op allebei de schermen op dezelfde plek? Dan horen ze bij een
   overgang niet mee te doen.

   Dat is de vraag achter de diamantenpil. Die zegt op de kaart en op Werelden
   precies hetzelfde, en op een telefoon staat hij er ook precies hetzelfde: dan is
   wegdoven en opnieuw opbouwen pure ruis, en stilstaan het enige juiste -- het is
   het vaste punt waar de zoom in het midden zijn richting aan ontleent. Maar een
   liggend venster zet de twee koppen niet even breed neer, en op een héél smal
   scherm krijgt de pil op de twee schermen een andere maat. Dán is stilstaan juist
   de sprong, en horen ze wél over elkaar heen te kruisen.

   Dus niet vastleggen wat het geval is, maar het opmeten. Eén keer, vóór er iets
   beweegt. */
function zelfdePlek(a, b) {
  if (!a || !b) return false;
  const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
  return Math.abs(ra.left - rb.left) < 2 && Math.abs(ra.top - rb.top) < 2
      && Math.abs(ra.width - rb.width) < 2 && Math.abs(ra.height - rb.height) < 2;
}

function vluchtKlaar() {
  if (!vluchtOp) return;
  const v = vluchtOp;
  vluchtOp = null;
  clearTimeout(v.timer);
  clearTimeout(v.grendel);
  overgangBezig = false;
  try { v.op(); } catch (e) { /* opruimen mag nooit de app tegenhouden */ }
  if (v.laag && v.laag.parentNode) v.laag.parentNode.removeChild(v.laag);
}
/* De vlucht zelf. van/naar zijn twee vlakken; bron levert de kleuren en de
   tekening (de wereld waar het om gaat). 'op' is het opruimwerk van de aanroeper
   en loopt altijd precies één keer.

   Geeft terug wanneer de overvloeier begint -- de aanroeper laat het échte
   kaartje (of de échte kaart) op dat moment verschijnen, zodat de vluchtlaag
   erop wegdooft in plaats van ervoor. */
function wereldVlucht(van, naar, bron, op, hoog) {
  vluchtKlaar();                             // vangnet: de ingangen doen dit al zelf
  const laag = document.createElement('div');
  laag.className = 'wereld-vlucht' + (hoog ? ' hoog' : '');
  laag.setAttribute('aria-hidden', 'true');
  const kunst = document.createElement('div');
  kunst.className = 'wereld-vlucht-art';
  applyWorldArt(kunst, bron);
  applyWorldTheme(kunst, bron);
  // het vak staat op de plek van het kijkgat; de tekening ligt erin, en steekt er
  // met opzet buiten uit -- dat is wat cover doet, en het vak knipt het weg
  laag.style.left = van.clip.left + 'px';
  laag.style.top = van.clip.top + 'px';
  laag.style.width = van.clip.w + 'px';
  laag.style.height = van.clip.h + 'px';
  laag.style.borderRadius = van.rond + 'px';
  kunst.style.left = (van.kunst.left - van.clip.left) + 'px';
  kunst.style.top = (van.kunst.top - van.clip.top) + 'px';
  kunst.style.width = van.kunst.w + 'px';
  kunst.style.height = van.kunst.h + 'px';
  laag.appendChild(kunst);
  $('app').appendChild(laag);

  /* Twee transforms die samen één beweging zijn, plus de ronding apart -- zie
     vluchtBeelden. De drie delen dezelfde beeldjes en dezelfde duur, dus ze lopen
     gelijk op; ze staan alleen los omdat de ronding de andere twee anders van de
     compositor af zou trekken. */
  const beelden = vluchtBeelden(van, naar);
  const tijd = { duration: VLUCHT.duur, easing: 'linear', fill: 'forwards' };
  laag.animate(beelden.vorm, tijd);
  laag.animate(beelden.rand, tijd);
  kunst.animate(beelden.binnen, tijd);
  /* De landing: pas ná de beweging dooft de tekening weg op wat er dan al staat.

     Op de TEKENING en niet op het vak eromheen. Dat vak doet één ding -- knippen --
     en alles wat zíchtbaar is (de tekening, zijn maat, zijn plek, zijn
     doorzichtigheid) hoort bij het kind eronder. Dat is ook waarom het er twee
     zijn, en het houdt het vak vrij van eigenschappen die zijn clip zouden kunnen
     laten verhuizen. */
  const eind = kunst.animate([{ opacity: 1 }, { opacity: 0 }],
    { duration: VLUCHT.kruis, delay: VLUCHT.duur, easing: 'linear', fill: 'forwards' });

  /* De grendel gaat al open zodra de béweging klaar is, en niet pas na de
     overvloeier: die laatste 80ms verschuift niets meer, en een kind dat dán alweer
     tikt hoort gewoon antwoord te krijgen in plaats van een tik die verdwijnt.
     Veilig, want elke ingang begint met vluchtKlaar(): een tik in dat venster
     sluit deze vlucht eerst netjes af en begint dan pas aan de volgende. */
  vluchtOp = { laag, op,
    timer: setTimeout(vluchtKlaar, VLUCHT.duur + VLUCHT.kruis + 260),
    grendel: setTimeout(() => { overgangBezig = false; }, VLUCHT.duur) };
  eind.onfinish = vluchtKlaar;
  overgangBezig = true;
  return VLUCHT.duur;
}
/* Wegdoven of opkomen -- één regel, zodat elke kant van de vlucht dezelfde curve
   en dezelfde vangnetten krijgt. Levert niets op als er niets te animeren valt. */
function vluchtDoof(el, aan, duur, na) {
  if (!el || !el.animate) return;
  el.animate(aan ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }],
    { duration: duur, delay: na || 0, easing: MOTION.uit, fill: 'both' });
}
function vluchtDoofAlle(lijst, aan, duur, na) {
  lijst.forEach(el => vluchtDoof(el, aan, duur, na));
}
/* De globe. Op de kaart zit hij rechts in de wereldpil, op Werelden links van de
   titel -- dichtbij, maar niet op dezelfde plek. Hij vliegt dus mee: één teken
   dat van de ene kop naar de andere schuift terwijl de rest van allebei de
   koppen over elkaar heen kruist. Geen morph per letter, wel genoeg om te laten
   zien dat het dezelfde 🌍 is.

   Alles eraan is optioneel: is een van de twee koppen er niet (of kent de browser
   geen animate), dan gebeurt er gewoon niets en kruisen de koppen zonder globe. */
function globeVlucht(vanEl, naarEl, duur) {
  if (!vanEl || !naarEl || !vanEl.animate || motionOff()) return;
  const a = vanEl.getBoundingClientRect(), b = naarEl.getBoundingClientRect();
  if (!a.width || !b.width) return;
  const vlieg = document.createElement('span');
  vlieg.className = 'globe-vlucht';
  vlieg.setAttribute('aria-hidden', 'true');
  vlieg.textContent = vanEl.textContent || '🌍';   // overnemen en niet overtypen
  /* Allebei de echte globes gaan uit zolang de kopie vliegt -- die van waar hij
     vandaan komt én die van waar hij heen gaat. Er is dan op geen enkel beeldje
     meer dan één globe in beeld, en dat is precies waar deze kleine vlucht voor is:
     het moet hetzelfde teken zijn dat verhuist, niet het ene dat wegvalt terwijl
     het andere opkomt. Sinds de kop van Werelden alléén nog die globe draagt
     (PS-25) is dat ook het enige wat daar nog te zien valt, dus een tweede zou
     meteen opvallen. */
  vanEl.style.visibility = 'hidden';
  naarEl.style.visibility = 'hidden';
  vlieg.style.left = a.left + 'px';
  vlieg.style.top = a.top + 'px';
  vlieg.style.width = a.width + 'px';
  vlieg.style.height = a.height + 'px';
  /* Alles wat bepaalt hóé de glyph in zijn vakje valt, wordt overgenomen en niet
     nagemaakt: dezelfde lettergrootte én dezelfde regelhoogte. Een emoji wordt op de
     grondlijn van zijn regel gezet, dus die regelhoogte bepaalt zijn hoogte in het
     vak -- en de kopie moet op zijn eerste beeldje op de píxel op het teken liggen
     dat hij vervangt, anders zie je hem wegspringen op het moment dat hij loskomt. */
  const bronStijl = getComputedStyle(vanEl);
  vlieg.style.fontSize = bronStijl.fontSize;
  vlieg.style.lineHeight = bronStijl.lineHeight;
  $('app').appendChild(vlieg);
  const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
  const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
  const s = b.width / a.width;
  const weg = () => {
    vanEl.style.visibility = '';
    naarEl.style.visibility = '';        // de echte staat er weer; de kopie mag weg
    if (vlieg.parentNode) vlieg.parentNode.removeChild(vlieg);
  };
  const an = vlieg.animate(
    [{ transform: 'none' },
     { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(3)})` }],
    { duration: duur, easing: VLUCHT.baan, fill: 'forwards' });
  /* Géén wegdoven aan het eind. Hier stond dat wel, en dat klopte zolang er aan de
     overkant een titel in beeld kwam waar de globe deel van uitmaakte: dan kruisten
     ze. Nu staat de bestemming te wachten op precies dezelfde plek en maat, en dan
     is doorzichtigheid een fout -- je zou het teken zien verdwijnen en meteen weer
     verschijnen. Het wordt dus in één beurt omgewisseld (zie weg): één beeldje, twee
     keer hetzelfde plaatje op dezelfde plek, en dus niets te zien. */
  an.onfinish = weg;
  setTimeout(weg, duur + 260);   // vangnet, net als bij elke andere overgang
}
/* Kaart -> zaal. "Ik koos deze plek, en nu ga ik er naar binnen."
     1  de halte drukt in en geeft een lichtkringetje terug (meteen, geen wachten)
     2  de kaart duikt een klein stukje naar díe plek toe en is weg  (140ms)
     3  pas dán komt de zaal uit datzelfde punt op                   (110-300ms)
   Eén ding tegelijk: op geen enkel moment staan er twee leesbare schermen over
   elkaar. Alles op transform en opacity; er wordt nergens iets opnieuw ingedeeld.

   De beweging is expres klein -- 7% inzoomen, 6% uitzoomen. Wat de continuïteit
   draagt is niet hóéveel er beweegt maar wáárvandaan: beide animaties draaien om
   het punt dat het kind aantikte (zie oorsprongPct), dus de zaal komt uit die
   plek en niet uit het midden van het scherm. */
function enterLevel(lvl, stopEl) {
  if (overgangBezig) return;               // tweede tik doet niets extra's
  sndClick();
  const kaart = $('screen-map'), spel = $('screen-game');
  const rect = (stopEl && stopEl.getBoundingClientRect) ? stopEl.getBoundingClientRect() : null;
  if (motionOff() || !rect || !rect.width || !spel.animate || !kaart.classList.contains('active')) {
    startLevel(lvl);
    return;
  }
  overgangBezig = true;
  /* Het vangnet staat er vóór er iets gebeurt. Zou startLevel struikelen, dan
     wordt de opruimer nog steeds afgeroepen -- anders bleef overgangBezig op true
     staan en deed geen enkele halte ooit nog iets. De kaart ruimt zichzelf op,
     zie schermWeg; hier gaat het alleen over het scherm dat aankomt. */
  const klaar = eindigOvergang(null, MOTION.totaal, () => {
    spel.style.transformOrigin = '';       // .komt-op blijft tot de volgende show()
    spel.style.pointerEvents = '';
  });
  const punt = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  tapRipple(punt.x, punt.y);               // 1 -- dezelfde tikreactie als elders in de app
  // en de halte zelf zegt "ja, deze": één korte plop, vóór de kaart begint te duiken
  const dot = stopEl.querySelector('.dot');
  if (dot && dot.animate) dot.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1.05)' }],
    { duration: 240, easing: MOTION.plop, fill: 'forwards' });

  schermWeg(kaart, true, punt);            // 2 -- de hele kaart, om het aangetikte punt

  /* 3 -- het spel staat er nú al, ook al zie je het nog niet.
     startLevel doet zijn volle werk in dezelfde beurt als de tik; de animatie
     loopt daar overheen. fill:'backwards' houdt het scherm op opacity 0 zolang de
     vertraging loopt, dus "later beginnen" kost geen enkele keten van timers --
     het is één animatie die gewoon later aan is. Valt de animatie weg, dan staat
     het spel er meteen. */
  startLevel(lvl);
  spel.classList.add('komt-op');
  navMee(true);                            // de balk van de kaart gaat mét de kaart weg
  spel.style.transformOrigin = oorsprongPct(spel, punt);
  spel.style.pointerEvents = 'none';       // niet op een bewegend doel kunnen tikken
  // Alleen beweging, geen doorzichtigheid: de zaal staat er ondoorzichtig onder de
  // kaart, en de kaart doft eroverheen weg. Zie de regel bij MOTION -- en let op de
  // ondergrens van 1 die daar staat: kleiner beginnen laat de randen los.
  const groei = spel.animate(
    [{ transform: 'scale(1.06)' }, { transform: 'none' }],
    { duration: MOTION.kom, delay: MOTION.komNa, easing: MOTION.uit, fill: 'backwards' });
  groei.onfinish = klaar;
}
/* Zaal -> kaart: precies de omgekeerde zin. De kaart komt licht ingezoomd op de
   halte waar de show speelde binnen en zakt daar vandaan naar zijn gewone maat,
   zodat je terugkomt op de plek waar je wegging en niet ergens op een kaart.

   Dit beweegt het hele scherm en niet alleen de tekening. Dat was de fout die de
   overlap het duidelijkst maakte: de tekening kwam netjes op, maar de kop met de
   wereldnaam en de diamanten stond er vanaf het eerste beeldje volledig
   ondoorzichtig overheen -- terwijl de zaal nog in beeld was. Kop, tekening en
   haltes horen bij elkaar; ze komen samen op of niet.

   Aangeroepen vanuit de rAF van renderTourMap: dan staan de haltes er en zijn ze
   op te meten. */
function kaartTerugZoom(map, lvl) {
  const doel = map.querySelector('.tour-stop[data-lvl="' + lvl + '"]');
  if (!doel) return kaartKomtOp(null);
  const d = doel.getBoundingClientRect();
  kaartKomtOp({ x: d.left + d.width / 2, y: d.top + d.height / 2 });
}
/* De kaart komt op. Eén functie voor álle manieren waarop dat gebeurt, want de
   kaart hoort er élke keer hetzelfde uit te komen:

     punt   de halte waar de show speelde -- dan zoomt hij dáár vandaan terug
     null   de tabbladbalk of de terugknop -- dan gewoon vanuit het midden, en
            kleiner, want er is geen plek om naartoe te zoomen

   Dat tweede geval had hiervoor géén eigen opkomst en viel daardoor terug op de
   fade van .screen.active (screenIn): de hele kaart kwam uit doorzichtig op, en
   wat je die twee tienden zag was de roze achtergrond van de app met een
   verwassen wereld erover. Precies het "intermediate backdrop state" dat er niet
   hoort te zijn -- en het valt op, want de kaart is het enige scherm met een
   eigen ondoorzichtige tekening.

   Nu beweegt hij alleen, en .komt-op zet screenIn uit. Vanaf het eerste beeldje
   staat de wereld er dus gewoon. Zie verder de regel bij MOTION. */
function kaartKomtOp(punt) {
  const scherm = $('screen-map');
  if (!scherm || !scherm.animate || motionOff()) return;
  scherm.getAnimations().forEach(a => a.cancel());   // een tweede opkomst stapelt niet
  scherm.classList.add('komt-op');
  scherm.style.transformOrigin = punt ? oorsprongPct(scherm, punt) : '50% 50%';
  const a = scherm.animate(
    [{ transform: punt ? 'scale(1.06)' : 'scale(1.03)' }, { transform: 'none' }],
    { duration: MOTION.kom, delay: punt ? MOTION.komNa : 0, easing: MOTION.uit, fill: 'backwards' });
  const op = () => { scherm.style.transformOrigin = ''; };
  a.onfinish = op;
  setTimeout(op, MOTION.totaal + 260);     // vangnet, net als bij elke andere overgang
}
/* ---- De stille wissel: de bijschermen (PS-51) ----------------------------
   Kaart, zaal, eindscherm en reis leggen met hun beweging iets uit: je duikt de
   zaal in die je net aantikte, je zoomt uit naar de wereld tussen de andere. De
   kleedkamer, de kast, het ouderdeel, het memoryspel, het maakformulier en de
   sterrenkeuze leggen niets uit -- je gaat er even heen en je komt terug. Die
   krijgen daarom niet minder beweging maar ándere: dezelfde twee klassen,
   dezelfde curven, dezelfde ladder, alleen zonder richting en zonder afstand.

   Precies dezelfde vorm als een kaart die van de tabbladbalk opkomt
   (kaartKomtOp zonder punt): 1.03 -> 1, dekkend vanaf het eerste beeldje. Zo is
   "van de kaart naar de kleedkamer" en "van de kleedkamer terug" eindelijk
   dezelfde beweging, en niet twee losse antwoorden op dezelfde tik.

   Dit is geen kleine kaartKomtOp: die zoomt om een aangetikt punt en hoort bij
   de kaart. Deze weet van geen enkel scherm iets. */
function schermKomtOp(el) {
  if (!el || !el.animate || motionOff()) return;
  el.getAnimations().forEach(a => a.cancel());
  el.classList.add('komt-op');
  el.animate([{ transform: 'scale(1.03)' }, { transform: 'none' }],
    { duration: MOTION.kom, easing: MOTION.uit, fill: 'backwards' });
}
/* De twee helften van zo'n wissel. Zonder vorig scherm gebeurt er niets: dat is
   de allereerste aanblik van de app, en die hoort er gewoon te staan (zie
   body.start). */
function hubWissel(van, naar) {
  if (!van || !naar || van === naar) return;
  schermWeg(van, false);
  dressBarMee(van);
  schermKomtOp(naar);
}
/* De koop-lade hangt buíten de kleedkamer, net als de navigatiebalk buiten de
   schermen (zie navMee), en show() knipt hem op hetzelfde beeldje uit. Zolang de
   kleedkamer zelf ook meteen weg was viel dat samen; nu hij 140ms vertrekt zou
   de lade als enige wegspringen. Hij doft dus mee, en show() heeft het laatste
   woord over waar hij daarna staat. */
function dressBarMee(van) {
  if (!van || van.id !== 'screen-dress') return;
  const bar = $('dress-bar');
  if (!bar || !bar.animate || motionOff() || !bar.innerHTML) return;
  bar.style.display = 'flex';
  const op = () => { bar.getAnimations().forEach(a => a.cancel()); bar.style.display = 'none'; };
  const a = bar.animate([{ opacity: 1 }, { opacity: 0 }],
    { duration: MOTION.weg, easing: MOTION.uit, fill: 'forwards' });
  a.onfinish = op;
  setTimeout(op, MOTION.weg + 260);
}
/* Een bijscherm aanzetten. Hetzelfde als show(), met de stille wissel eromheen
   -- en daarom staat het er ook als eigen functie: dan is "welke schermen doen
   mee" één lijst aanroepen en geen regel die je per scherm kunt vergeten. */
function toonHub(id) {
  const vorige = document.querySelector('.screen.active');
  show(id);
  const naar = $(id);
  /* .komt-op gaat er altijd op -- en juist ook als je al op dit scherm stónd.
     show() haalt de klasse van élk scherm af en zet .active opnieuw; op het
     scherm waar je al was betekent dat dat 'animation' van none terugspringt
     naar screenIn, en dan komt het scherm nog één keer uit het niets opzetten.
     Dát is de flits bij twee keer tikken op Kleedkamer of Trofeeën.

     Waarom je hem alleen de tweede keer zag en daarna niet meer: de derde keer
     stond .komt-op er al niet meer, en dan verandert er in de opmaak niets wat
     een nieuwe animatie kán starten. Eén flits, precies één keer, en daarna
     stilte -- het soort spoor dat naar een klasse wijst en niet naar een timer.

     De kaart had dit nooit: goMap zet hem er onvoorwaardelijk op (zie daar). Dit
     is dezelfde regel, nu ook voor de zes bijschermen. */
  naar.classList.add('komt-op');
  hubWissel(vorige, naar);
}
/* Het korte moment waarin de sterren van de zojuist gespeelde halte op de kaart
   landen, en cb daarop wacht zodat het volgende er niet doorheen valt.

   NOG ÉÉN GEBRUIKER: runWorldChange. De gewone reis naar de volgende halte ging
   hier ook langs en doet dat niet meer -- daar was de landing een herhaling van
   wat het eindscherm al gevierd had, met een halve seconde wachten eraan vast
   (zie reisBinnenWereld in goMap). Bij een wereldgrens ligt dat anders: daar is
   het de laatste keer dat je die wereld ziet, de badge vliegt er net vandaan naar
   de kast, en de camera heeft daarna nog een hele klim te gaan. Verdwijnt die
   laatste gebruiker ook een keer, dan kan deze functie weg.

   STAP en LAND zijn dezelfde getallen als de val-vertraging (.1/.185/.27s) en
   de landingsduur (.28s) in de CSS -- verander je de één, meet dan de ander
   na. Zonder sterren om te laten landen (kan niet: een geslaagde show geeft er
   altijd minstens één) of zonder beweging is er niets om op te wachten, en
   gaat cb meteen los. */
function starRevealBeat(lvl, cb) {
  const st = Math.max(0, Math.min(3, P().stars[lvl] || 0));
  if (!st || motionOff()) { cb(); return; }
  const STAP = .085, LAND = .28;
  const landt = Math.round((.1 + (st - 1) * STAP + LAND) * 1000);
  setTimeout(cb, landt + 200);   // + een kort, natuurlijk stiltetje vóór het vertrek
}
function goMapNaShow() { sndClick(); goMap(naShowLvl); }

/* ================= De kaart zegt hallo =====================================
   De kaart is het hoofdscherm en de ster woont er, maar ze deed er niets als je
   binnenkwam: ze wiegde al vóór je er was en wiegde daarna door. Dit is het
   enige wat daaraan verandert -- één zwaai, als de kaart zélf de aankomst is.

   WANNEER WEL. goMap() weet in zijn eerste regels al precies wat voor aankomst
   dit is: uitShow (je komt uit een show), travel (er ligt een level-up klaar),
   onthul (er is een wereld bijgekomen) en gekozen (je koos een wereld op de
   reis). Elk van die vier heeft zijn eigen beweging die uitlegt waarom de ster
   hier nu staat -- de terugzoom, de huppel over de route, de camera die
   doorklimt, de vlucht uit het kaartje. Daar hoort geen begroeting overheen:
   dan zijn er twee aankomsten voor één handeling. Blijft over: de tabbladbalk,
   de terugknop uit de kleedkamer of de kast, het memoryspel uit, en het kiezen
   van een ster. Dat zijn precies de keren dat er niets anders gebeurt dan dat
   jij er weer bent.

   In één regel: als er al iets beweegt dat verklaart waaróm ze hier staat, dan
   zwaait ze niet.

   NIET UIT RENDERTOURMAP. Die bouwt de kaart opnieuw op bij elke wereldpijl,
   elke tussenstand van een reis en beide helften van een onthulling -- veel
   vaker dan een kind aankomt. De aanleiding is een navigatie en geen tekening,
   dus hangt dit aan goMap() en aan niets anders.

   DE KOELTIJD, en geen grendel. Een tabbladwissel mag nooit geblokkeerd worden
   (zie goMap) -- een kind dat vastzit op een scherm is erger dan een zwaai te
   veel. Dus onthoudt dit alleen wannéér de kaart voor het laatst openging, en
   slaat het over als dat net was. Kaart -> Kleedkamer -> Kaart geeft dus één
   zwaai en geen drie, en een echte terugkomst een halve minuut later gewoon
   weer één. Elke aankomst zet die tijd, ook een aankomst die zelf niet zwaait:
   na een reis of een onthulling is er net iets gevierd, en dan hoort de
   kleedkamer-en-terug daarna ook nog even stil te zijn. */
const GROET = {
  koeltijd: 2500,
  // Eén pasje uit de bestaande woordenschat -- 👋, zie MOVES en mvWave. Als los
  // kaartje en niet uit MOVES opgezocht: die lijst staat verderop in het bestand
  // en dit is een const die bij het inlezen al gelezen wordt.
  pas: { cls: 'move-wave' },
  duur: 950,   // dezelfde als dance/tapDance: mvWave duurt .9s
};
/* Eén keer de halte laten oplichten waar je heen moet. Alleen de huidige halte
   heeft die laag (zie .tour-stop.next .stop-body::after); staat er geen -- je
   kijkt in een wereld die je al uit hebt -- dan gebeurt er niets. */
function haltePuls() {
  const map = $('tour-map');
  const halte = map && map.querySelector('.tour-stop.next');
  if (!halte || !$('screen-map').classList.contains('active')) return;
  halte.classList.remove('aangekomen');
  void halte.offsetWidth;                 // herstart afdwingen bij opnieuw binnenkomen
  halte.classList.add('aangekomen');
}
function kaartGroet(mag) {
  const nu = Date.now();
  const rustig = nu - kaartBezocht > GROET.koeltijd;
  kaartBezocht = nu;
  // Een nieuwe aankomst annuleert altijd een zwaai die nog moest beginnen: er is
  // er hoogstens één onderweg, en er blijft dus nooit een tweede timer hangen.
  clearTimeout(groetTimer);
  clearTimeout(pulsTimer);
  groetTimer = pulsTimer = null;
  /* Beperkte beweging: dan gebeurt er hier niets, ook geen klasse die er even
     op en weer af gaat. Een begroeting is karakter en geen bericht -- er valt
     dus niets te vervangen, en de ster staat precies zoals ze anders ook staat
     (zie de bewegingsafspraak bij zetPas). */
  if (!mag || !rustig || motionOff()) return;
  /* De puls stond op MOTION.kom, en dat was precies te vroeg: op 190ms is
     kaartKomtOp net klaar met inzoomen, dus de halte lichtte op terwijl de hele
     kaart nog aan het stilvallen was. Een gloed die opkomt op een beeld dat zelf
     nog beweegt is geen aankondiging maar ruis -- je oog is op dat moment met
     het scherm bezig en niet met een plek daarin. Nu wacht hij tot de kaart een
     tel stil heeft gestaan: MOTION.totaal is het einde van de schermwissel, en
     daar komt een rustmoment van 300ms overheen voordat de halte iets zegt.

     Dat is ook waarom hij láter valt dan de zwaai en niet ervoor. Zij is de
     hoofdrol en mag als eerste; de halte is de tweede stem en zet er een zachte
     gloed onder terwijl zij nog zwaait. Ze bijten elkaar niet, want ze zijn niet
     van dezelfde soort: zij beweegt, de halte staat stil en wordt alleen even
     helderder.

     Hij hangt aan dezelfde poort als de zwaai (zie de aanroep onderaan goMap) en
     dus aan dezelfde koeltijd: kom je uit een show, ligt er een reis klaar, gaat
     er een wereld open of koos je er net een op de reis, dan legt díe beweging
     al uit waarom je hier bent en hoort er niets overheen. Na een level-up huppelt
     de ster naar de volgende halte -- dát is de aankomst, en de nieuwe halte
     ademt daarna gewoon verder zonder er nog een puls bovenop. */
  pulsTimer = setTimeout(() => { pulsTimer = null; haltePuls(); }, MOTION.totaal + 300);
  groetTimer = setTimeout(() => {
    groetTimer = null;
    const map = $('tour-map');
    const el = map && map.querySelector('.tour-hero .avatar-holder');
    /* Ondertussen weggelopen, of de kaart is opnieuw opgebouwd, of de ster staat
       in een wereld waar je niet naar kijkt: dan is er niemand om naar te
       zwaaien en gebeurt er gewoon niets. Dit is ook wat ?debug&screen=ouder
       opvangt -- daar opent goMap() de kaart en schuift er meteen een ander
       scherm overheen. */
    if (!el || !el.isConnected || !$('screen-map').classList.contains('active')) return;
    if (!zetPas(el, GROET.pas)) return;
    setTimeout(() => stilStaan(el), GROET.duur);
  }, MOTION.totaal);
}
/* EN HIJ STOPT ALS JE WEGGAAT. Een zwaai hoort bij de kaart; loopt hij door
   terwijl je er al vanaf bent, dan staat er 950ms lang een pop te bewegen op een
   scherm dat niemand ziet. Dat is niet alleen onzin maar ook duur: precies in
   dat raam kan de vlucht naar Werelden beginnen, en die hangt van élk beeldje af
   (zie wereldVlucht -- vijfentwintig vooraf uitgerekende standen die samen één
   beweging moeten zijn). Opgemeten: met een zwaai eroverheen stond de tekening
   op het eerste beeldje van de vlucht al 18% op weg, dus die beweging begon
   letterlijk niet bij het begin.

   Vandaar dat show() dit aanroept en niet goMap: weglopen kan langs elke kant --
   de tabbladbalk, de terugknop van het toestel, de wereldpil. */
function kaartGroetStop() {
  clearTimeout(groetTimer);
  clearTimeout(pulsTimer);
  groetTimer = pulsTimer = null;
  const map = $('tour-map');
  const el = map && map.querySelector('.tour-hero .avatar-holder.dancing');
  if (el) stilStaan(el);
}

function goMap(vanLvl) {
  const p = P();
  // Alleen een échte halte laat de kaart terugzoomen. goMap komt ook langs als
  // gewone functieverwijzing (terugknop, tabbladen) en krijgt dan van alles mee.
  const uitShow = (typeof vanLvl === 'number' && vanLvl > 0);
  /* Twee keer tikken op "Verder op tournee" is één keer terugkomen. Alleen déze
     weg wordt gegrendeld -- een tabbladwissel of de terugknop van het toestel
     moet altijd door, ook midden in een overgang, anders kan een scherm blijven
     staan waar niemand meer vanaf komt. De heenweg heeft zijn eigen grendel in
     enterLevel. */
  if (uitShow && terugBezig) return;
  kaartFocus = uitShow ? vanLvl : null;
  netAf = uitShow ? vanLvl : null;
  const vorige = document.querySelector('.screen.active');
  telNu($('map-diamonds'), p.diamonds);
  $('map-portrait').innerHTML = avatarSVG(p, 80);
  // Memory-knop: alleen voor een telmodus-ster met het memory-spel aan
  const memOn = p.settings.track === 'count' && p.settings.memory !== false;
  $('mem-fab').style.display = memOn ? 'flex' : 'none';
  if (memOn) $('mem-fab-pay').textContent = memPayout(p);
  /* De onthulling van een nieuwe wereld hoort bij precies één sprong: die van p.level
     zoals hij er nú staat. Klopt dat niet meer (opslag opnieuw geladen, ster gewisseld,
     of een reis die is blijven liggen), dan opent de kaart gewoon zonder reis -- nooit
     met een onthulling die bij een andere stand hoort. */
  let travel = pendingTravel;
  pendingTravel = null;
  if (travel && travel.to !== p.level) travel = null;
  /* GEEN TWEEDE STERRENMOMENT OP DE KAART.

     Het eindscherm heeft de sterren al onthuld, gevierd én door het kind laten
     wegtikken. Daarna kwam de kaart op en landden diezelfde sterren nog een keer
     onder de zojuist gespeelde halte (.net-af, een halve seconde), stond de reis
     daar op te wachten, en vertrok ze pas daarna. Twee keer hetzelfde nieuws, en
     het enige wat hier wél nieuw is -- dat ze verder komt -- moest achteraan
     aansluiten. Het eindscherm is het beloningsmoment; de kaart is het
     voortgangsmoment.

     Alleen in déze stroom: een level-up die binnen dezelfde wereld naar de
     volgende halte reist. Kom je terug zonder dat de voortgang opschuift (een
     show overdoen om je sterren te verbeteren), dan is de kaart wél de eerste
     plek waar die nieuwe score staat, en blijft de landing dus staan. Een
     wereldgrens heeft een eigen opbouw met een eigen beat (runWorldChange) en
     blijft hier ook buiten. */
  const reisBinnenWereld = !!travel && travel.to <= WORLD_LAST
    && worldFor(travel.from).index === worldFor(travel.to).index;
  if (reisBinnenWereld) netAf = null;
  /* Kwam je hier uit de tournee, dan opent de kaart op de wereld die je daar koos.
     Dat is kíjken en geen voortgang: de opdracht geldt voor dit ene openen en wordt
     hier meteen verbruikt, dus de eerstvolgende keer (tabblad, terugknop, na een
     show) komt de kaart weer gewoon uit bij de grens. */
  const gekozen = reisDoel;
  reisDoel = null;
  /* In wélke wereld kom je terug?

     Uit een show: in de wereld van díe show. Dat is de hele belofte van deze
     overgang -- je komt terug op de plek waar je net was, en kaartTerugZoom zoomt
     daar ook op in. Hier stond eerder de wereld van p.level, en dat klopte zolang
     je alleen vooruit speelde: dan zijn die twee hetzelfde. Ging een kind een
     show overdoen in een eerdere wereld, dan kwam het uit die show terug in een
     wereld waar het niet geweest was, en de halte om op in te zoomen bestond daar
     niet eens -- dus ook geen terugzoom. Twee keer hetzelfde misverstand.

     Niet uit een show (de tabbladbalk, de terugknop): dan is dit "verder op
     tournee", en dat is de grens van de voortgang -- de eerste wereld die nog
     niet uit is, of, als alles uit is, de laatste die er is (de toegift). Een
     uitstapje naar een eerdere wereld duurt precies zolang je er blijft;
     weglopen van de kaart is weglopen.

     In elke echte save is dat dezelfde wereld als waar de ster staat: p.level
     loopt één voor de eerstvolgende show uit en stapt alleen op de vóórste halte
     vooruit, dus alles ervóór is ook echt gespeeld. Het staat er toch zo, en niet
     als worldFor(p.level): een positie is geen voltooiing, en dit is de plek waar
     de app naar voltooiing hoort te kijken. */
  const thuis = travel ? worldFor(travel.from).index
    : uitShow ? worldFor(vanLvl).index
    : gekozen != null ? Math.max(0, Math.min(WORLDS.length - 1, gekozen))
    : continueWorld(p);
  /* Een wereld die er nog niet was toen dit kind voor het laatst speelde. Dan is
     er geen sprong om de onthulling aan op te hangen (zie runTravel) -- ze stond
     stil en de tournee is onder haar voeten langer geworden. Dus doet de kaart
     het hier: de vorige wereld komt in beeld en de camera klimt één keer door
     naar de nieuwe. Daarna staat hij in worldsSeen en gebeurt dit nooit meer.

     Dit is ook het vangnet voor een onthulling die is blijven liggen doordat de
     app tussen de show en de kaart door gesloten werd: pendingTravel overleeft
     dat niet, worldsSeen wél. */
  const onthul = (!travel && !uitShow && gekozen == null && thuis > 0 && !worldSeen(p, thuis) && worldSeen(p, thuis - 1))
    ? { van: thuis - 1, naar: thuis } : null;
  markWorldSeen(p, thuis);
  showWorld(onthul ? onthul.van : thuis, travel ? travel.from : 0);
  show('screen-map');
  /* .komt-op gaat er meteen hierna op, en niet pas bij de animatie. Die komt
     namelijk uit de rAF van renderTourMap, één beeldje later, en in dat ene
     beeldje heeft .screen.active zijn eigen fade (screenIn) al aangezet -- dan
     stond de kaart toch één beeldje half doorzichtig met de app-achtergrond
     erdoorheen. Eén beeldje, maar wel precies het beeldje dat deze hele regel moet
     wegnemen. (Het moet ná show(): die haalt de klasse van álle schermen af.)
     Zie kaartKomtOp en de regel bij MOTION. */
  $('screen-map').classList.add('komt-op');
  // de zaal wijkt terug en laat de kaart zien -- alleen als we ook echt uit een
  // show komen (anders is dit een gewone tabbladwissel en hoort er niets te wijken)
  /* De balk wordt hier meegenomen en niet in kaartTerugZoom: die draait pas in de
     rAF van renderTourMap, één beeldje later, en show() heeft de balk dan al een
     keer volledig zichtbaar over de nog vertrekkende zaal getekend. Eén beeldje,
     maar wel precies het beeld dat deze hele wijziging moet wegnemen. */
  if (kaartFocus && vorige && vorige !== $('screen-map')) {
    schermWeg(vorige, false); navMee(false);
    // de grendel gaat vanzelf weer open, ook als er onderweg iets misgaat
    terugBezig = true;
    clearTimeout(terugTimer);
    terugTimer = setTimeout(() => { terugBezig = false; }, MOTION.totaal + 60);
  } else if (gekozen == null && vorige !== $('screen-map')) {
    /* Van de tabbladbalk of de terugknop. Er is geen halte om naartoe te zoomen en
       geen zaal die wijkt, maar de kaart hoort er ook hier ondoorzichtig uit te
       komen -- anders doet screenIn het, en dan kijk je twee tienden naar de
       achtergrond van de app met een verwassen wereld erover. Zie kaartKomtOp.

       Niet bij een reis: reisNaarWereld beweegt de kaart zelf, en twee opkomsten
       over elkaar is er één te veel. (Vandaar de controle op gekozen -- dat is
       precies de opdracht die reisNaarWereld hier neerlegt.) */
    kaartKomtOp(null);
    /* En het scherm waar je vandaan komt vertrekt ook echt (PS-51). Dat deed het
       hier niet: de kaart zoomde netjes op terwijl de kleedkamer op het eerste
       beeldje weg was. Eén tik, twee verschillende antwoorden -- en heen deed de
       kleedkamer hetzelfde omgekeerd. Nu is de heenweg de terugweg, gespiegeld;
       zie hubWissel, waar de andere helft van deze wissel staat. */
    schermWeg(vorige, false);
    dressBarMee(vorige);
  }
  /* Pas hierna, en niet in een requestAnimationFrame: renderTourMap kon zijn
     eigen afrondende werk (scrollstand, --kop-h/--nav-h, kaartTerugZoom) niet
     synchroon doen, want toen het draaide stond het scherm nog niet .active en
     leverde elke meting 0 op. Nu, een paar regels later in dezelfde taak, wél
     -- en dat is nog steeds vóór de browser iets van dit beeldje verft. Moet
     wel ná de kaartFocus-controle hierboven staan: kaartTerugZoom (via
     tourMapVoltooi) verbruikt diezelfde kaartFocus, en die controle moet 'm
     nog aantreffen om de terug-grendel te zetten. Zie de regel bij
     tourMapVoltooi en bij renderTourMap. */
  if (tourMapVoltooi) { const v = tourMapVoltooi; tourMapVoltooi = null; v(); }
  if (travel) requestAnimationFrame(() => runTravel(travel));
  else if (onthul) requestAnimationFrame(() => runWorldReveal(onthul));
  /* En dan pas: is de kaart zélf de aankomst? Alle vier de uitzonderingen staan
     hierboven al uitgerekend, dus de regel is hier één regel lang. De laatste
     voorwaarde vangt "nog eens op Kaart tikken terwijl je er al staat": dat is
     geen aankomst. Zie de hele redenering bij kaartGroet. */
  kaartGroet(!uitShow && !travel && !onthul && gekozen == null && vorige !== $('screen-map'));
}
/* De onthulling van een wereld die pas uitgebracht is. Precies dezelfde camera als
   bij het uitspelen van een wereld (zie runWorldChange), alleen zonder de badge en
   zonder de tel stilte ervoor -- er is hier niets afgemaakt om afscheid van te
   nemen, er is iets bijgekomen. */
function runWorldReveal(o) {
  const van = worldForIndex(o.van), naar = worldForIndex(o.naar);
  if (!van || !naar) return;
  const plaats = () => showWorld(o.naar);
  const vier = () => {
    sndCoin();
    confetti(26);
    showPraise(`${naar.world.icon} ${naar.world.name}!`);
  };
  if (motionOff()) { plaats(); vier(); return; }
  wereldCamera(1, plaats, { duur: WERELDREIS.onthul, easing: WERELDREIS.traag, zoom: true, klaar: vier });
}
/* Vloeiend pad dóór alle punten (Catmull-Rom omgezet naar cubic bezier) —
   zonder dit zou de weg een hoekige zigzag tussen de haltes worden.

   stukken = hoeveel stukken er getekend worden, standaard allemaal. De buren komen
   altijd uit de héle lijst, ook als er maar een deel getekend wordt: daardoor ligt
   een kort pad exact op het lange (de gouden route van de tournee op de doffe
   eronder). Een kortere lijst meegeven zou dat níet doen -- dan verandert bij het
   laatste stuk de buurman, en dus de bocht. */
function smoothPath(ps, stukken) {
  if (!ps.length) return '';
  if (ps.length === 1) return `M${ps[0].x},${ps[0].y}`;
  const eind = Math.max(0, Math.min(ps.length - 1, stukken == null ? ps.length - 1 : stukken));
  if (!eind) return '';
  let d = `M${ps[0].x.toFixed(1)},${ps[0].y.toFixed(1)}`;
  for (let i = 0; i < eind; i++) {
    const p0 = ps[i - 1] || ps[i], p1 = ps[i], p2 = ps[i + 1], p3 = ps[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}
/* De tekening van een wereld. Is er nog geen, dan doet de reservekaart het werk
   met de kleuren van de wereld zelf -- een wereld is dus speelbaar vóór hij
   getekend is, en een ontbrekend bestand levert nooit een leeg vlak op.

   Twee regels, en allebei zetten ze alleen iets neer; het wachten op het bestand
   staat in de opmaak en niet hier (zie de lagen bij .world-frame). Dat is met
   opzet: een tekening die nog onderweg is, is geen toestand die de JS hoort bij te
   houden -- er ligt gewoon een laag onder die het zolang overneemt.

   .no-art blijft wél een klasse, want het is een ándere zin dan "nog niet binnen":
   het zegt dat deze wereld géén tekening heeft, en daar hangt aan vast dat de
   gedeelde wolkjes en het voetlicht van de app wél mogen meedoen (zie de
   :has()-regel eronder). Een wereld die zijn tekening nog staat af te wachten
   krijgt die er dus niet één tel bij om ze meteen weer kwijt te raken. */
function applyWorldArt(el, world) {
  el.style.setProperty('--w-art', world.art ? `url("${world.art}")` : 'none');
  el.classList.toggle('no-art', !world.art);
}
/* De sfeer van een wereld als CSS-variabelen, één keer op het kader gezet. Elk
   onderdeel leest daarna var(--w-...) en weet dus niet in wélke wereld het staat
   -- dat is precies wat voorkomt dat er ooit ergens if (wereld === 'ijs') komt. */
function applyWorldTheme(el, world) {
  const t = world.theme || {};
  ['sky', 'deep', 'accent', 'glow', 'road'].forEach(k => {
    if (t[k]) el.style.setProperty('--w-' + k, t[k]);
    else el.style.removeProperty('--w-' + k);
    // en dezelfde kleur nog eens als losse kanalen, zodat de zaal er lagen van
    // kan maken die je doorheen kijkt -- zie --w-*-rgb in :root
    const kan = t[k] ? kanalen(t[k]) : null;
    if (kan) el.style.setProperty('--w-' + k + '-rgb', kan);
    else el.style.removeProperty('--w-' + k + '-rgb');
  });
}
/* "#3a1f6e" -> "58,31,110". Geeft null bij alles wat geen hex is, en dán blijft
   de terugval uit :root staan -- een wereld met een rare kleurwaarde valt dus
   terug op het standaardpaars in plaats van op een kapotte rgba(). */
function kanalen(hex) {
  const h = String(hex).trim();
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h);
  if (!m) return null;
  const v = m[1].length === 3 ? m[1].split('').map(c => c + c) : [m[1].substr(0, 2), m[1].substr(2, 2), m[1].substr(4, 2)];
  return v.map(x => parseInt(x, 16)).join(',');
}
/* ---- De zaal: dezelfde wereld, van binnenuit ------------------------------
   Elke wereld speelt zijn shows in een zaal. Niet in een eigen mini-spel en niet
   op een eigen scherm: hetzelfde spelscherm, dezelfde indeling, dezelfde plek
   voor de som -- alleen ander licht. Een kind dat van de Junglewereld naar de
   IJswereld loopt hoeft niets opnieuw te leren.

   Wat een zaal ís, zit in vijf getallen en één bestandsnaam. Geen wereld hóéft
   ze op te geven: VENUE_TERUGVAL hieronder geldt voor iedereen, en `venue:` in
   een wereld overschrijft alleen wat die wereld anders wil. Zo werkt een nieuwe
   wereld (ook eentje die de wereldstudio erbij zet) meteen, zonder configuratie.

     art    de zaaltekening. null = leen de wereldkaart zelf. Dat is de stand van
            nu: de kaart heeft die tekening een tel geleden getoond, dus hij staat
            in het geheugen én in de service-worker-cache -- de zaal kost geen
            enkele extra aanvraag en geen enkele byte. Hangt hier later een echte
            zaaltekening in, dan is dát de enige regel die verandert.
     zoom   hoe ver je erop inzoomt, als percentage van de schermbreedte. 100 zou
            de hele tekening in beeld persen -- dan kijk je naar een landschap,
            niet naar een zaal.
     focus  wélk stuk je dan ziet (background-position). Alle zes de wereldkaarten
            hebben hun podium op ongeveer dezelfde plek: rechts van het midden,
            bovenin. Vandaar dat één terugval voor alle zes werkt.
     blur   hoeveel onscherpte eroverheen. Dit is het verschil tussen "een tweede
            kaart" en "de zaal achter je".
     dim    hoe donker. De Snoep- en IJswereld zijn bijna wit getekend en zouden
            zonder dit met de somkaart gaan concurreren; de Toverwereld is al
            donker en mag juist iets lichter.
     op     de dekking van de tekening. Onder de één, zodat de sfeerlaag
            (.venue-sfeer) er doorheen blijft praten.

   Wordt hier ooit een echte zaaltekening ingehangen, dan hoort zoom op ~100,
   focus op '50% 50%', blur op 0-4, dim en op op 1 -- verder verandert er niets.

   Waarom dit een terugval is en geen zes kopieën: dedicated zaaltekeningen komen
   er later. Wat hier staat moet het tot dan toe fatsoenlijk doen én in één regel
   te vervangen zijn. Zes handmatig afgestelde uitsnedes zouden straks zes keer
   weggegooid worden. */
const VENUE_TERUGVAL = { art: null, zoom: 220, focus: '70% 14%', blur: 11, dim: .62, op: .96 };
// Altijd een verse samenvoeging en nooit VENUE_TERUGVAL zelf: die is de bron voor
// élke wereld, en één aanroeper die er per ongeluk iets in zet, zet het overal in.
function venueFor(world) {
  return Object.assign({}, VENUE_TERUGVAL, (world && world.venue) || null);
}
function venueArt(world) {
  const v = venueFor(world);
  return v.art || (world && world.art) || '';
}
/* Zet de zaal op een scherm. Eén injectiepunt voor álle zaaldecor -- de
   spelscherm-kop, het podium onder de ster en het eindscherm lezen daarna alleen
   nog var(--venue-*) en var(--w-*), en weten dus niet in wélke wereld ze staan.

   De klasse gaat er altijd op, ook als er geen enkele tekening is (een wereld uit
   de wereldstudio, of een wereld waarvan de tekening nog niet af is). Dan draagt
   .venue-sfeer de zaal in zijn eentje op de wereldkleuren, en dat is nog steeds
   een zaal -- geen tekening is niet hetzelfde als geen plek. Vandaar dat deze
   functie niets meer teruggeeft: er valt niets meer te beslissen. */
function applyVenue(el, world) {
  const v = venueFor(world);
  const src = venueArt(world);
  el.classList.add('venue-aan');
  applyWorldTheme(el, world);   // nooit de kleuren van de vórige wereld
  el.style.setProperty('--venue-art', src ? `url("${src}")` : 'none');
  el.style.setProperty('--venue-focus', v.focus);
  el.style.setProperty('--venue-zoom', v.zoom + '%');
  el.style.setProperty('--venue-blur', v.blur + 'px');
  el.style.setProperty('--venue-dim', String(v.dim));
  el.style.setProperty('--venue-op', String(v.op));
}
/* ================= De hele tournee: de reis boven de werelden uit ===========
   FASE 4B. Hier stond de werelden-kiezer: zes rijen achter de wereldnaam in de
   kop, met een slotje achter wat nog niet mocht. Hij deed wat hij moest doen en
   hij las als een menu -- en precies dát was het probleem. Wat een kind op zo'n
   lijst niet kan zien is het enige wat er te zien valt: dat de werelden samen
   een réis zijn, dat er al een stuk van gelopen is, en dat het verder omhoog
   gaat.

   Wat er nu staat is dezelfde informatie als een plék. Eén baan van beneden naar
   boven, met de werelden eraan geregen als bestemmingen en de ster erop waar ze
   nu is. De wereldkaart blijft precies wat hij was (wélke show speel ik hier);
   dit scherm gaat over de laag erboven (waar ben ik in het geheel).

   DE VOORTGANG WORDT HIER ALLEEN GETEKEND. Elke stand komt uit fase 4A --
   worldAvailable, worldDone, continueWorld -- en de sterrenstand uit worldProgress,
   dezelfde teller waar de wereldbadge in de trofeeënkast op staat. Er wordt hier
   niets bewaard, niets afgeleid uit een plek op het scherm en niets
   vooruitgeschoven. Een bestemming kiezen zet de kaart op die wereld en verder
   niets: p.level, de sterren en de grens blijven staan waar ze stonden.

   WAT ER GEBEURT ALS ER EEN WERELD BIJKOMT: niets. De baan is een optelsom van
   stappen, de bestemmingen hangen aan die som, de route loopt er doorheen en de
   sfeer hangt aan de bestemmingen zelf. Wereld 7 is één regel in WORLDS; wereld
   30 net zo. Er staat nergens een coördinaat, een hoogte of een aanname die aan
   een aantal werelden vastzit -- reisBaan() hieronder is de enige plek waar
   maatvoering bestaat, en die rekent puur met indexen.                        */
const REIS = {
  amp: 11,        // hoe ver een bestemming van de middellijn staat (% van de kolom)
  golf: 0.86,     // hoe snel dat van kant wisselt -- één trage S, geen zigzag
  fase: 0.7,      // waar de slinger begint, zodat wereld 1 niet precies in het midden staat
  bocht: 9,       // hoever de route tússen twee bestemmingen uitbuigt (% van de kolom)
  rek: 0.05,      // hoeveel de afstand per wereld varieert (± deel van een stap)
  /* Hoe groot een bestemming is, per stand -- als deel van een gewone kaart. Deze
     getallen staan óók in het stijlblad (de clamps op .reis-halte.nu / .verder
     zijn 51vw / 40vw tegen 46vw voor een gewone), en dat is de enige
     plek waar dit bestand en dat blad hetzelfde moeten weten. Ze staan hier omdat
     de áfstand tussen twee bestemmingen ervan afhangt: twee kleine kaarten horen
     dichter bij elkaar te staan dan twee grote, anders gaapt het bovenin de reis --
     waar alles nog op slot en dus klein is. */
  maat: { nu: 1.11, open: 1, verder: .87 },
  /* De afstand tussen twee bestemmingen, in stappen:
       kaart * de gemiddelde maat van die twee + weg
     Twee gewone kaarten staan dus precies één stap uit elkaar, en alles wat kleiner
     is schuift naar rato dichter op elkaar. */
  kaart: 0.62, weg: 0.38,
  /* Stappen tussen de onderrand van de baan en de eerste bestemming. Stond op 0,85
     en dat is precies te krap: onderaan gescrold hield de onderste wereld nog maar
     een tiental pixels over boven de navigatiebalk. Dit is de enige maat die deze
     ronde verschoven is, en alleen daarvoor. */
  onder: 1.05,
  boven: 1.45,    // en tussen de laatste bestemming en de bovenrand: daar hangt de mist
  eenheid: 100,   // SVG-eenheden per stap (de y-as van de route)
  start: 0.6,     // waar de route vandaan komt: een half stapje onder wereld 1
  staart: 1.0,    // en hoe ver hij boven de laatste bestemming doorloopt, de wolken in
};
/* Waar een bestemming op de breedte staat, en waar de route ertussen uitbuigt.
   Allebei een sinus van de index, en met opzet geen toeval: dezelfde wereld staat
   altijd op dezelfde plek (ook na opnieuw tekenen), de route slingert zonder ooit
   te knikken, en wereld 7 krijgt vanzelf het volgende punt in dezelfde golf.

   De bestemmingen bewegen weinig (11%) en de route ertussen veel (9% dwars op een
   stap die maar half zo hoog is). Dat is de verhouding die het een wandeling maakt
   in plaats van een grafiek: de plekken liggen rustig, de wég slingert. Andersom --
   ver uiteen liggende kaarten met een rechte lijn ertussen -- leest als een
   organigram, en dan lopen de kaarten bovendien het scherm uit.                  */
function reisX(i) { return 50 + REIS.amp * Math.sin(i * REIS.golf + REIS.fase); }
/* De baan: waar elke bestemming staat, en hoe hoog het geheel wordt. Alles in
   stappen, zodat de CSS er calc(var(--reis-stap) * n) van kan maken en de maat zelf
   in het stijlblad blijft (waar hij van de kaartmaat afhangt en dus meeademt met
   het scherm).

   De stap varieert per wereld met een paar procent. Puur ritme: een reis waarop
   elke afstand exact gelijk is, leest als een liniaal. De uitslag is klein genoeg
   dat de ondergrens uit --reis-stap er nog onder blijft (zie daar).             */
function reisBaan(standen) {
  const maat = st => REIS.maat[st] || 1;
  const y = [];
  let h = REIS.onder;
  for (let i = 0; i < standen.length; i++) {
    if (i) {
      // de kaarten van dit paar bepalen hoeveel ruimte ze nodig hebben, en een
      // paar procent ritme zorgt dat de reis geen liniaal wordt
      const paar = (maat(standen[i - 1]) + maat(standen[i])) / 2;
      h += REIS.kaart * paar + REIS.weg + REIS.rek * Math.sin(i * 1.7 + 0.9);
    }
    y.push(h);
  }
  return { y, hoogte: h + REIS.boven };
}
/* De bestemmingen, in reisvolgorde (wereld 1 eerst, dus onderaan). Puur afgeleid,
   net als alles in fase 4A -- dit is de enige plek waar de standen van de reis
   worden bepaald, en ze komen allemaal ergens ánders vandaan:

     nu       hier ga je verder           continueWorld()   -- de grens, of de toegift
     verder   uitgebracht, nog niet aan de beurt
     open     te bezoeken                 positie op de kaart
     uit      uitgespeeld                 worldProgress().uit
     vol      álle sterren binnen         worldProgress().vol

   Hoevéél bestemmingen er staan komt uit laatsteZichtbareWereld(): alles wat af
   is plus een paar vooruit. Er stond hier ook een stand 'mist' voor een wereld die
   nog niet uitgebracht was -- een vraagteken in de wolken. Die is weg: een wereld
   die er voor een kind nog niet is, hoort er ook niet als vraagteken te staan. Wat
   er voorbij de horizon ligt zegt de mist bovenaan, en die zegt het zonder te
   tellen hoeveel het er zijn.

   De laatste twee zijn geen aparte stand maar een eigenschap: een bestemming kan
   tegelijk "hier ben je" en "vol" zijn (de toegift), en dan hoort ze allebei te
   laten zien. Vandaar losse vlaggen in plaats van één string.

   "Te bezoeken" is exact wat het op de kaart ook is: tot en met de wereld waar ze
   zelf staat. Verder vooruit kíjken mag, er heen reizen niet -- en dat is niet
   deze fase die dat beslist, dat deed de kiezer die hier stond al net zo.       */
function reisPlaatsen(p) {
  const positie = worldFor(hereLevel(p)).index;
  const doel = continueWorld(p);
  /* Van wereld 1 tot de horizon, en altijd vanaf het begin. Dat "vanaf het begin"
     is geen luiheid maar een afspraak waar de rest op rekent: de plek van een
     bestemming ín deze lijst is zijn wereldnummer, en renderReis rekent daarmee
     uit welk stuk van de route al gelopen is (zie stuk()). Zou de reis ooit ook
     vanonderen inkorten, dan moet die som mee. */
  const ruw = WORLDS.slice(0, laatsteZichtbareWereld(p) + 1).map((w, i) => {
    const v = worldProgress(p, worldForIndex(i));
    const open = i <= positie;
    const staat = i === doel ? 'nu' : !open ? 'verder' : 'open';
    return { i, world: w, staat, open,
             uit: v.uit, vol: v.vol,
             sterren: v.sterren, max: v.max,
             x: reisX(i) };
  });
  // pas als alle standen bekend zijn valt de baan uit te meten: de afstanden hangen
  // af van hoe groot de kaarten zijn, en dat hangt af van hun stand
  const baan = reisBaan(ruw.map(b => b.staat));
  ruw.forEach((b, i) => { b.y = baan.y[i]; });
  return { plaatsen: ruw, hoogte: baan.hoogte, doel };
}
// wat een schermlezer van een bestemming hoort -- de enige plek met tekst per stand
function reisLabel(b, doel) {
  const sterren = b.max ? `, ${b.sterren} van ${b.max} sterren` : '';
  if (b.i === doel) return b.world.name + ' — hier ben je nu' + sterren;
  if (!b.open) return b.world.name + ' — nog op slot';
  return b.world.name + (b.vol ? ' — helemaal vol' : b.uit ? ' — uitgespeeld' : '')
    + sterren + ', ga er heen';
}
/* Dezelfde getekende ster als op de wereldkaart (zie STER_PAD): een emoji heeft
   geen vaste vorm tussen toestellen, en naast elkaar valt dat op.

   Een functie en geen const, omdat STER_PAD verderop in het bestand staat: een
   const leest hem dan bij het inladen en dat is te vroeg. Eén keer bouwen, daarna
   uit de la -- hij komt per wereld twee keer langs. */
let _reisSter = '';
function reisSterSVG() {
  if (!_reisSter) _reisSter = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STER_PAD}"/></svg>`;
  return _reisSter;
}
/* Het vonkje: een vierpuntige ster, getekend uit vier bolle bogen. */
const VONK = (cx, cy, r) => `M${cx} ${cy - r}q${r * .22} ${r * .78} ${r} ${r}`
  + `q${-r * .78} ${r * .22} ${-r} ${r}q${-r * .22} ${-r * .78} ${-r} ${-r}`
  + `q${r * .78} ${-r * .22} ${r} ${-r}z`;
/* Het ornament van een volle wereld: de ster van het spel, groot en in vol goud,
   met twee vonkjes ernaast. Hier stonden drie vonkjes en verder niets -- zie de
   noot bij .reis-glans waarom dat te weinig was: glinstering is licht, en licht
   zegt op dit scherm "hier ben je". De ster zegt waar het om gaat, en ze zegt het
   met precies het teken dat een kind de hele show door verzamelt.

   Een functie en geen const, om dezelfde reden als reisSterSVG(): STER_PAD staat
   verderop in het bestand, en een const leest hem dan bij het inladen -- te vroeg.
   Eén keer bouwen, daarna uit de la. */
let _reisGlans = '';
function reisGlansSVG() {
  if (!_reisGlans) _reisGlans = `<svg viewBox="0 0 30 30" aria-hidden="true">`
    // de ster staat in een geschaalde groep: STER_PAD is op 24x24 getekend
    + `<g transform="translate(3.1 2.6) scale(.84)">`
    + `<path class="rg-ster" vector-effect="non-scaling-stroke" d="${STER_PAD}"/></g>`
    + `<path d="${VONK(25.6, 6.6, 3.3)}" opacity=".9"/>`
    + `<path d="${VONK(4.6, 23.2, 2.4)}" opacity=".75"/></svg>`;
  return _reisGlans;
}
// hetzelfde vonkje, maar los: het heel af en toe sprankeltje naast haar op de kaart
const TOUR_VONK = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${VONK(10, 10, 7)}"/></svg>`;
/* Een tik op een wereld die nog op slot zit. Hij brengt je nergens heen -- dat is
   de hele bedoeling van een slot -- maar hij zegt wél waaróm, en in één regel: de
   wereld waar ze nu staat is de wereld die eerst uit moet. Precies dezelfde zin als
   op een spulletje dat je nog moet verdienen ("Speel Muziekwereld uit").

   Het slotje schudt kort mee. Dat is de tikreactie: de kaart zelf drukt al in
   (.reis-halte:active), dus dit hoeft alleen te zeggen wélk ding hier "nee" zegt.
   Geen venster, geen uitleg, geen aftelling. */
function slotWereld(knop, doel) {
  sndClick();
  const slot = knop && knop.querySelector('.reis-zegel.slot');
  if (slot) {
    slot.classList.remove('nee');
    void slot.offsetWidth;
    slot.classList.add('nee');
    setTimeout(() => slot.classList.remove('nee'), 800);
  }
  const w = WORLDS[doel];
  showToast(w ? `🔒 Speel eerst ${w.icon || '🌍'} ${esc(w.name)} uit!` : '🔒 Nog niet aan de beurt!');
  setTimeout(hideToast, 2200);
}
/* De baan opbouwen. Alles hier komt uit reisPlaatsen() en uit de staphoogte in het
   stijlblad -- er wordt niets opgemeten, dus draaien, resizen of een wereld erbij
   vraagt geen enkele herberekening. */
function renderReis() {
  const p = P();
  const track = $('reis-track');
  const { plaatsen, hoogte, doel } = reisPlaatsen(p);
  const n = plaatsen.length;
  reisStopWaarnemer();
  track.innerHTML = '';
  track.style.setProperty('--reis-n', hoogte.toFixed(3));
  $('screen-journey').onscroll = reisScroll;
  telNu($('reis-diamonds'), p.diamonds);

  /* De route. Tussen elke twee bestemmingen ligt een extra stuurpunt, om en om naar
     links en rechts uit de lijn: dát is wat een verbinding een wéggetje maakt. De
     bestemmingen zelf blijven exact staan waar ze staan.

     Vier lagen over hetzelfde traject (zie .reis-weg-* in het stijlblad): een heel
     flauw doorlopend spoor, de stippen van de hele route dof, het gelopen stuk in
     goud, en het láátste stuk -- van de vorige wereld naar waar ze nu is -- een
     tikje sterker. Alle vier uit dezelfde puntenlijst, met hetzelfde streeppatroon
     vanaf hetzelfde beginpunt: de stippen vallen dus precies op elkaar. */
  const totaalU = hoogte * REIS.eenheid;
  const yU = y => (hoogte - y) * REIS.eenheid;
  const punten = [{ x: reisX(-0.5), y: yU(plaatsen[0].y - REIS.start) }];
  plaatsen.forEach((b, k) => {
    if (k) {
      const vorige = plaatsen[k - 1];
      // dwars op het stuk, om en om -- en in de richting die de slinger tóch al op
      // wil, zodat de bocht de bestemmingen volgt in plaats van ertegenin te gaan
      const kant = (k % 2 ? 1 : -1) * REIS.bocht;
      punten.push({ x: (vorige.x + b.x) / 2 + kant, y: yU((vorige.y + b.y) / 2) });
    }
    punten.push({ x: b.x, y: yU(b.y) });
  });
  const laatste = plaatsen[n - 1];
  punten.push({ x: reisX(n - 1 + REIS.staart), y: yU(laatste.y + REIS.staart) });
  // index van wereld i in die lijst: het beginpunt, dan per wereld een bocht + een bestemming
  const stuk = i => 1 + Math.max(0, i * 2);

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'reis-route');
  svg.setAttribute('viewBox', `0 0 100 ${totaalU.toFixed(0)}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const pad = (cls, d) => {
    if (!d) return;
    const e = document.createElementNS(svgNS, 'path');
    e.setAttribute('class', cls);
    e.setAttribute('d', d);
    svg.appendChild(e);
  };
  // elke weglaag tweemaal: de grote stippen, en er een halve stap tussenin de kleine
  const weg = (cls, d) => { pad(cls, d); pad(cls + ' klein', d); };
  const heel = smoothPath(punten);
  pad('reis-spoor', heel);
  weg('reis-weg-heel', heel);
  weg('reis-weg-gelopen', smoothPath(punten, stuk(doel)));
  // het laatste stuk apart: van de vorige bestemming tot waar ze nu staat
  if (doel > 0) weg('reis-weg-nu', smoothPath(punten.slice(stuk(doel - 1)), 2));

  // De lucht loopt over de volle breedte, de reis zelf in een kolom -- zie .reis-pad
  const baan = document.createElement('div');
  baan.className = 'reis-pad';
  baan.appendChild(svg);
  track.appendChild(baan);

  plaatsen.forEach((b, k) => {
    const knop = document.createElement('button');
    knop.className = 'reis-halte ' + b.staat + (b.uit ? ' uit' : '') + (b.vol ? ' vol' : '');
    knop.dataset.w = b.i;
    knop.style.left = b.x.toFixed(2) + '%';
    knop.style.bottom = `calc(var(--reis-stap) * ${b.y.toFixed(3)})`;
    // de kleuren van de wereld, als sfeer om zijn bestemming heen. Een wereld die
    // nog niet uit is geeft er geen: die heeft nog geen kleur in dit spel.
    applyWorldTheme(knop, b.world);
    const plaats = document.createElement('span');
    plaats.className = 'reis-plaats';
    /* De tekening hóórt erbij, ook als de wereld nog op slot zit: "ik zie de
       piratenwereld daarboven liggen" is precies waarom een kind doorspeelt. Hij
       staat er dan ontkleurd en gedimd bij (zie .reis-halte.verder). Alleen een
       wereld die nog niet uitgebracht is krijgt er geen -- dat zou verklappen wat
       er nog niet is -- en alleen wat in de buurt van het venster komt wordt
       opgehaald (zie reisStartWaarnemer). */
    if (b.world.art) {
      const art = document.createElement('span');
      art.className = 'reis-art';
      art.dataset.art = b.world.art;
      plaats.appendChild(art);
    } else {
      const ico = document.createElement('span');
      ico.className = 'reis-ico';
      ico.textContent = b.world.icon || '🌍';
      plaats.appendChild(ico);
    }
    /* Naam en sterren liggen ín de tekening. Eén ding dus, in plaats van een kaartje
       met een pil eronder en een badge ernaast -- en de sterrenteller is meteen het
       antwoord op de vraag die de kaart tot nu toe niet beantwoordde: hoe góed heb
       ik die wereld gedaan? Een wereld op slot krijgt geen teller: daar valt nog
       niets te tellen. */
    {
      plaats.insertAdjacentHTML('beforeend', `<span class="reis-label">`
        + `<span class="rn-tekst">${esc(b.world.name)}</span>`
        + (b.open ? `<span class="reis-sterren">${reisSterSVG()}${b.sterren}/${b.max}</span>` : '')
        + `</span>`);
    }
    /* Eén teken in de hoek, nooit twee. Vol gaat vóór uit: een wereld waar alles
       binnen is krijgt het sterornament en niet óók nog een vinkje. */
    if (b.vol) plaats.insertAdjacentHTML('beforeend',
      `<span class="reis-glans" aria-hidden="true">${reisGlansSVG()}</span>`);
    else if (b.uit) plaats.insertAdjacentHTML('beforeend',
      '<span class="reis-zegel" aria-hidden="true">✓</span>');
    else if (b.staat === 'verder') plaats.insertAdjacentHTML('beforeend',
      '<span class="reis-zegel slot" aria-hidden="true">🔒</span>');
    knop.appendChild(plaats);
    if (b.i === doel) {
      // een tikje naar de kant waar de route verdergaat: dan kijkt ze de reis in
      const volgende = plaatsen[k + 1];
      const kant = volgende ? Math.max(-12, Math.min(12, (volgende.x - b.x) * 1.2)) : 0;
      knop.style.setProperty('--pop-kant', kant.toFixed(1) + 'px');
      knop.insertAdjacentHTML('beforeend',
        `<div class="reis-pop"><div class="avatar-holder idle">${avatarSVG(p, 56)}</div></div>`);
    }
    knop.setAttribute('aria-label', reisLabel(b, doel));
    if (b.open) knop.onclick = () => reisNaarWereld(b.i, knop);
    else {
      /* aria-disabled en niet disabled. Een <button disabled> krijgt geen enkele
         gebeurtenis en ook geen :active, en dat maakte een wereld op slot het enige
         ding in de app waar tikken helemaal niets teruggeeft -- terwijl het juist
         het ding is waar een kind op tíkt: hij ligt daar groot en in kleur naar je
         te lonken. Overal elders in de app antwoordt een geweigerde tik (de laatste
         bewerking die niet uit mag, een trofee die nog niet vrij is, een spulletje
         dat te duur is). Hier nu ook -- zie slotWereld. */
      knop.setAttribute('aria-disabled', 'true');
      knop.onclick = () => slotWereld(knop, doel);
    }
    baan.appendChild(knop);
  });

  /* Bovenaan houdt de reis niet óp: de route loopt door en verdwijnt in de wolken.
     Die belofte staat er altijd, of er nu nog werelden boven je liggen of niet --
     een kind hoeft niet te weten wat er nog niet is om te voelen dat het doorgaat.
     Geen verzonnen wereld, geen datum, geen knop die niets doet.

     Er komt één pil bij, en die zegt twee verschillende dingen:

       nog meer avonturen   er liggen uitgebrachte werelden voorbij de horizon.
                            Die kán ze halen, dus dit is een doel.
       wordt vervolgd       alles wat er ís, is uit. Dan is "er komt nog meer" het
                            enige dat er nog eerlijk te zeggen valt.

     Nooit allebei: liggen er nog werelden vooruit, dan is de tournee niet uit. En
     een wereld die nog niet uitgebracht is telt voor geen van beide mee -- die
     belooft niets, want hij is er nog niet. */
  const mist = document.createElement('div');
  mist.className = 'reis-mist';
  const vervolg = meerWereldenVooruit(p) ? '✨ Nog meer avonturen'
    : allWorldsDone(p) ? '✨ Wordt vervolgd' : '';
  mist.innerHTML = `<div class="map-sky" aria-hidden="true"><div class="map-sky-inner">`
    + `<span style="top:26%;font-size:30px;animation-duration:96s;animation-delay:-18s">☁️</span>`
    + `<span style="top:54%;font-size:22px;animation-duration:112s;animation-delay:-74s">☁️</span>`
    + `<span class="rev" style="top:74%;font-size:18px;animation-duration:86s;animation-delay:-30s">✨</span>`
    + `</div></div>`
    + (vervolg ? `<div class="reis-vervolg">${vervolg}</div>` : '');
  track.appendChild(mist);
}
/* De wereldtekeningen zijn de grootste bestanden van de app (~300 kB per stuk), en
   op dit scherm staan er net zoveel als er werelden zijn. Dus: pas ophalen als de
   bestemming in de buurt van het venster komt. Werelden waar ze al geweest is staan
   sowieso al in de cache (de kaart heeft ze getoond en de service worker bewaart
   ze); een wereld die nog op slot zit kost bij het omhoog kijken één keer een
   bestand, en dat is precies wat die verleiding waard is.

   Geen IntersectionObserver in deze browser? Dan gewoon alles ineens -- een oud
   toestel krijgt liever een paar plaatjes te veel dan een scherm met lege vakken. */
let reisWaarnemer = null;
function reisStartWaarnemer() {
  const track = $('reis-track');
  if (!track) return;
  const laden = el => {
    const src = el.dataset.art;
    if (!src) return;
    delete el.dataset.art;
    ART_GEHAALD.add(src);
    el.style.backgroundImage = `url("${src}")`;
  };
  if (!window.IntersectionObserver) { track.querySelectorAll('.reis-art').forEach(laden); return; }
  reisWaarnemer = new IntersectionObserver((rijen, obs) => {
    rijen.forEach(r => { if (r.isIntersecting) { laden(r.target); obs.unobserve(r.target); } });
  }, { root: $('screen-journey'), rootMargin: '60% 0px' });
  track.querySelectorAll('.reis-art').forEach(el => reisWaarnemer.observe(el));
}
function reisStopWaarnemer() {
  if (!reisWaarnemer) return;
  reisWaarnemer.disconnect();
  reisWaarnemer = null;
}
/* Waar de reis opengaat. Niet onderaan: een kind dat al vier werelden verder is
   kijkt dan eerst naar een stuk dat het allang gehad heeft, en moet zichzelf gaan
   zoeken. Ook niet precies in het midden -- dan ligt er evenveel achter als vóór
   haar, en deze reis gaat over wat er nog komt.

   60% van de vensterhoogte zet haar net onder het midden: een stuk gereisde weg
   eronder, zij erop, en boven haar de eerstvolgende bestemming in beeld. Alleen bij
   het openen; daarna schuift een kind zelf en wordt ze nooit teruggesleept.

   opWereld = open op déze bestemming in plaats van op die waar de ster staat. Dat
   is precies één geval, en het is het geval waar dit scherm voor bedacht is: een
   kind dat in een éérdere wereld staat te kijken en uitzoomt. Dan hoort het
   kaartje van díe wereld in beeld te komen -- anders zoomt de kaart uit naar een
   plek die buiten het venster valt (zie wereldVlucht). Zonder opWereld verandert
   er niets: in elke andere ingang zijn die twee dezelfde wereld. */
function reisFocus(opWereld) {
  const scherm = $('screen-journey');
  const track = $('reis-track');
  if (!scherm || !track) return;
  const doel = (opWereld != null && track.querySelector(`.reis-halte[data-w="${opWereld}"]`))
    || track.querySelector('.reis-halte.nu') || track.querySelector('.reis-halte');
  if (!doel) return;
  const r = doel.getBoundingClientRect(), s = scherm.getBoundingClientRect();
  if (!r.height) return;
  const mid = (r.top + r.height / 2) - s.top + scherm.scrollTop;
  const max = Math.max(0, scherm.scrollHeight - scherm.clientHeight);
  scherm.scrollTop = Math.max(0, Math.min(max, mid - scherm.clientHeight * 0.6));
  reisVolgKnop();
}
/* Ben je zover weggescrold dat je jezelf niet meer ziet, dan -- en alleen dan --
   verschijnt er rechtsonder een knopje terug. Geen vaste knop "voor het geval dat":
   zolang ze in beeld staat is er niets terug te gaan.

   Meet en tekent niets zwaars: één vergelijking van twee rechthoeken, en de klasse
   verandert alleen als het antwoord ánders is dan het al was. Hij hangt aan de
   scroll van het scherm, dus hij loopt achter een rAF aan. */
let reisVolgWacht = false;
function reisVolgKnop() {
  const scherm = $('screen-journey'), knop = $('reis-terug');
  if (!scherm || !knop) return;
  const doel = $('reis-track').querySelector('.reis-halte.nu');
  if (!doel) { knop.classList.remove('aan'); return; }
  const r = doel.getBoundingClientRect(), s = scherm.getBoundingClientRect();
  // ruim gerekend: pas als ze écht weg is, niet als haar rand net wegvalt
  const weg = r.bottom < s.top + 40 || r.top > s.bottom - 40;
  knop.classList.toggle('aan', weg);
  // wijst de kant op waar ze staat, zodat het knopje zegt wáár je heen gaat
  knop.textContent = r.top > s.bottom - 40 ? '↓' : '↑';
}
function reisScroll() {
  if (reisVolgWacht) return;
  reisVolgWacht = true;
  requestAnimationFrame(() => { reisVolgWacht = false; reisVolgKnop(); });
}
// Zacht terug naar waar ze staat. Geen sprong: dit is de enige plek waar dit scherm
// zelf scrollt terwijl een kind aan het kijken is, en dan hoort het te glijden.
function reisTerugNaarNu() {
  sndClick();
  const scherm = $('screen-journey');
  const doel = $('reis-track').querySelector('.reis-halte.nu');
  if (!scherm || !doel) return;
  const r = doel.getBoundingClientRect(), s = scherm.getBoundingClientRect();
  const mid = (r.top + r.height / 2) - s.top + scherm.scrollTop;
  const max = Math.max(0, scherm.scrollHeight - scherm.clientHeight);
  const top = Math.max(0, Math.min(max, mid - scherm.clientHeight * 0.6));
  if (scherm.scrollTo && !motionOff()) scherm.scrollTo({ top, behavior: 'smooth' });
  else scherm.scrollTop = top;
}

/* De reis openen = uitzoomen, en wel op de manier die een kind ook echt zo leest:
   de wereld waar ze in staat krímpt naar het kaartje waar hij op Werelden ligt.
   De camera stapt achteruit en laat zien wat er al die tijd omheen lag.

   Vier dingen gebeuren tegelijk, en alle vier horen ze bij diezelfde ene zin:

     1  de tekening vliegt      van het volle scherm naar zijn bestemming (400ms)
     2  het plaatselijke werk verdwijnt vroeg -- haltes, weg, ster, Memory-knop
        en de terugpil horen bij de ingezoomde wereld en hebben op een kaartje
        van 200 pixels niets te zoeken. Ze zijn weg op 150ms, ruim voordat de
        tekening klein genoeg is om ze nog te kunnen onderscheiden.
     3  de reis eromheen komt op: de stippellijn en de andere werelden. Zacht en
        zonder beweging -- ze vlíegen nergens heen, ze wáren er al.
     4  de koppen kruisen over elkaar heen, met de globe als enige die verhuist.

   WAT ER STIL BLIJFT STAAN, en dat is net zo belangrijk als wat er beweegt: de
   navigatiebalk (die staat buiten de schermen en wordt niet aangeraakt -- beide
   schermen horen bij Kaart) en de diamantenpil rechtsboven. Die tweede staat op
   allebei de schermen op dezelfde plek met dezelfde inhoud, dus hij hoeft niet
   weg en terug: de vertrekkende kop laat hem gewoon staan tot hij weggehaald
   wordt, en er staat er dan al een identieke onder.

   ÉÉRST DE REIS OP ZIJN PLEK, DAN PAS BEWEGEN. reisFocus() draait in de rAF
   hieronder -- dus vóór het eerste beeldje waarop er iets te zien is -- en krijgt
   de wereld mee waar we vandaan komen. Er wordt dus nooit eerst een reis getoond
   die daarna naar de goede plek schuift. */
function openReis() {
  if (wereldReisBezig() || overgangBezig) return;   // midden in een wereldwissel valt er niets te kiezen
  /* Eerst een eventuele vorige vlucht afsluiten, en wel hiér -- vóór er één klasse
     op een scherm gaat. De opruimer van die vlucht haalt zijn eigen klassen weer
     weg, en zou hij later draaien (bijvoorbeeld vanuit wereldVlucht), dan veegde
     hij de klassen weg die deze overgang er net op gezet heeft. */
  vluchtKlaar();
  sndClick();
  const kaart = $('screen-map');
  const reis = $('screen-journey');
  const vorige = document.querySelector('.screen.active');
  reisVanuit = viewWorldIdx == null ? continueWorld(P()) : viewWorldIdx;
  const bron = worldForIndex(reisVanuit);
  /* Opmeten vóór show(): die zet de kaart op display:none en dan valt er niets
     meer op te meten. Alleen de kaart zelf kan de vlucht dragen -- kom je hier
     vandaan uit een ander scherm, dan is er geen wereld om te laten krimpen. */
  const vanaf = (vorige === kaart && bron) ? kaartVlak() : null;
  const stil = motionOff() || !reis.animate || !kaart.animate;
  const vlieg = !!vanaf && !stil;
  // de kaart schuift soms (tablet); display:none zet dat terug op nul
  const schuif = $('tour-map') ? $('tour-map').scrollTop : 0;
  const kop = kaart.querySelector('.wp-cta-ico');
  const kopVan = vlieg && kop ? kop : null;

  renderReis();
  show('screen-journey');
  /* Meteen .komt-op, en niet pas in de rAF hieronder: in dat ene beeldje ertussen
     zet .screen.active zijn eigen fade (screenIn) aan, en dan komt de reis toch
     één beeldje half doorzichtig op. Zelfde reden als bij de kaart in goMap --
     zie de regel bij MOTION. */
  reis.classList.add('komt-op');
  reisStartWaarnemer();

  /* Reduced motion: geen enkele verplaatsing, wel dezelfde oorzaak en hetzelfde
     gevolg. De reis komt kort op in plaats van eruit te klappen -- opacity is
     geen beweging, en zonder iets is een schermwissel hier een harde knip. */
  if (!vlieg) {
    if (!stil && vorige && vorige !== reis) schermWeg(vorige, false);
    requestAnimationFrame(() => {
      reisFocus(reisVanuit);
      if (stil) { vluchtDoof(reis.querySelector('.reis-pad'), true, 140); return; }
      const hier = reis.querySelector(`.reis-halte[data-w="${reisVanuit}"]`)
        || reis.querySelector('.reis-halte.nu');
      const r = hier && hier.getBoundingClientRect();
      if (r && r.width) reis.style.transformOrigin =
        oorsprongPct(reis, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      const op = () => { reis.style.transformOrigin = ''; };
      const a = reis.animate(
        [{ transform: 'scale(1.09)' }, { transform: 'none' }],
        { duration: MOTION.kom, delay: MOTION.komNa, easing: MOTION.uit, fill: 'backwards' });
      a.onfinish = op;
      setTimeout(op, MOTION.totaal + 260);          // vangnet, net als bij elke andere overgang
    });
    return;
  }

  /* De kaart blijft nog even staan, maar zonder zijn tekening: die ligt vanaf nu
     in de vluchtlaag. Wat er overblijft is het plaatselijke werk, en dat doft
     eroverheen weg. .wegvallend haalt hem uit de kolom en legt hem bovenop (zie
     schermWeg), zodat de reis er meteen op volle maat onder staat. */
  overgangBezig = true;
  kaart.classList.add('wegvallend', 'vlucht-weg');
  /* De kop van de kaart dimt als de ster ertegenaan staat (zie .ster-bij-kop).
     Tijdens een vlucht hoort dat niet: de diamantenpil moet stil blijven staan en
     de reis heeft er een identieke onder liggen. Hij komt vanzelf terug zodra de
     volgende kaart zichzelf opmeet. */
  kaart.classList.remove('ster-bij-kop');
  if ($('tour-map')) $('tour-map').scrollTop = schuif;

  requestAnimationFrame(() => {
    reisFocus(reisVanuit);        // pas ná de opmaak: hier staat de baan er en is hij op te meten
    const doel = reis.querySelector(`.reis-halte[data-w="${reisVanuit}"]`)
      || reis.querySelector('.reis-halte.nu');
    const naar = halteVlak(doel);
    // alles wat hieronder een animatie krijgt, zodat de opruimer ze allemaal kent
    const lokaal = [$('tour-map'), $('mem-fab'), $('world-back'),
                    kaart.querySelector('.map-id-btn'), kaart.querySelector('.world-pick')];
    const pad = reis.querySelector('.reis-pad'), mist = reis.querySelector('.reis-mist');
    const terugKnop = reis.querySelector('.header-left');
    /* De globe staat hier met opzet niet bij: die doet niet mee aan het opkomen van
       Werelden, want hij kwám al mee -- zie globeVlucht. */
    const overzicht = [pad, mist, terugKnop, doel];
    // de diamanten: stilstaan waar dat kan, kruisen waar het moet -- zie zelfdePlek
    const muntV = kaart.querySelector('.diamond-badge'), muntN = reis.querySelector('.diamond-badge');
    const muntKruist = !zelfdePlek(muntV, muntN);
    if (muntKruist) { lokaal.push(muntV); overzicht.push(muntN); }
    const op = () => {
      overgangBezig = false;
      kaart.classList.remove('wegvallend', 'vlucht-weg');
      if (doel) doel.classList.remove('vlucht-doel');
      lokaal.concat(overzicht).forEach(el => {
        if (el && el.getAnimations) el.getAnimations().forEach(a => a.cancel());
      });
    };
    if (!naar) { op(); return; }                 // geen bestemming om heen te vliegen

    doel.classList.add('vlucht-doel');
    const kruis = wereldVlucht(vanaf, naar, bron.world, op);

    // 2 -- alles wat alleen in de ingezoomde wereld bestaat
    vluchtDoofAlle(lokaal.filter(x => x !== muntV), false, VLUCHT.detail);
    if (muntKruist) { vluchtDoof(muntV, false, VLUCHT.detail, 60); vluchtDoof(muntN, true, VLUCHT.detail, 150); }
    // 3 -- de reis eromheen: de route en de andere werelden waren er al
    vluchtDoofAlle([pad, mist], true, VLUCHT.reveal, 40);
    /* 4 -- de kop wisselt van stand. De wereldnaam en de chevron doven met de pil
       weg (die zit in 'lokaal'), de ← komt op, en de globe blijft: hij laat de pil
       los en schuift naar het midden. Eén teken dat verhuist, geen kop die de
       andere vervangt -- daarom staat de globe nergens in een fade-lijst. */
    vluchtDoof(terugKnop, true, VLUCHT.detail, 120);
    globeVlucht(kopVan, reis.querySelector('.rt-ico'), kruis);
    /* En op de landing staat het échte kaartje er weer -- nog steeds achter de
       vluchtlaag, die er daarna in 80ms op wegdooft. Geen fade erbij dus: de
       tekening is op dat moment identiek, en wat er overvloeit is precies het
       verschil (de naam, de sterren, het zegel, de ster op de kaart). */
    setTimeout(() => { if (vluchtOp) doel.classList.remove('vlucht-doel'); }, kruis);
  });
}
// De reis sluiten is dezelfde beweging als een bestemming kiezen: inzoomen op de
// wereld waar je vandaan kwam.
function reisSluit() {
  const idx = reisVanuit == null ? continueWorld(P()) : reisVanuit;
  reisNaarWereld(idx, $('reis-track').querySelector(`.reis-halte[data-w="${idx}"]`));
}
/* Een bestemming kiezen = inzoomen op die plek -- letterlijk de vlucht van
   openReis, achteruit afgespeeld: het kaartje groeit uit tot de hele wereld.

   De stapeling draait daarbij om, en dat is het enige echte verschil. Bij het
   uitzoomen ligt het scherm dat vertrekt bovenop (zie de regel bij MOTION); hier
   is dat Werelden, en dáár moet de tekening juist overheen. Dus:

     z 2  Werelden          de nacht eronder blijft staan tot het einde -- dat is
                            wat er te zien is rondom de groeiende tekening. Alleen
                            de route en de andere werelden doven weg.
     z 3  de vluchtlaag     de tekening zelf
     z 4  de kaart          zonder zijn tekening (die vliegt); de haltes, de weg,
                            de ster en de kop komen er in de laatste tel overheen
                            op, precies waar ze straks staan.

   Op de landing gaat .vlucht-weg eraf: de échte tekening staat er dan op de pixel
   hetzelfde bij, dus die wissel is onzichtbaar. Werelden mag dan weg, en de
   vluchtlaag dooft erachter weg.

   Wat er NIET gebeurt: er wordt niets afgemaakt, niets vrijgespeeld en niets
   verzet. reisDoel is één opdracht aan de eerstvolgende kaart en goMap verbruikt
   hem meteen; p.level, de sterren en de grens blijven precies staan. */
function reisNaarWereld(idx, el) {
  if (overgangBezig) return;
  vluchtKlaar();                             // zie openReis: eerst afsluiten, dan pas klassen
  sndClick();
  const reis = $('screen-journey'), kaart = $('screen-map');
  reisStopWaarnemer();
  reisDoel = Math.max(0, Math.min(WORLDS.length - 1, idx | 0));
  const bron = worldForIndex(reisDoel);
  const r = (el && el.getBoundingClientRect) ? el.getBoundingClientRect() : null;
  const stil = motionOff() || !r || !r.width || !kaart.animate || !reis.classList.contains('active');
  const van = stil ? null : halteVlak(el);
  if (stil || !van || !bron) {
    goMap();
    // reduced motion: geen verplaatsing, wel een kort opkomen -- zie openReis
    if (motionOff()) vluchtDoof($('tour-map'), true, 140);
    return;
  }
  overgangBezig = true;
  const punt = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  tapRipple(punt.x, punt.y);                 // de tik komt aan, meteen en zonder wachten
  el.classList.add('vlucht-doel');           // dit kaartje ligt vanaf nu in de lucht
  const kopVan = reis.querySelector('.rt-ico');
  const schuif = reis.scrollTop;             // display:none zet de schuifstand terug op nul

  goMap();                                   // de kaart staat er nú al, op reisDoel
  kaart.classList.add('vlucht-weg', 'vlucht-boven');
  reis.classList.add('wegvallend');
  reis.scrollTop = schuif;

  /* Eén beeldje later: renderTourMap heeft zijn eigen rAF dan gehad (daar wordt de
     kaart op een tablet nog op de juiste halte geschoven), dus nu pas valt er te
     meten waar de tekening straks ligt. */
  requestAnimationFrame(() => {
    const naar = kaartVlak();
    const lokaal = [$('tour-map'), $('mem-fab'), $('world-back'),
                    kaart.querySelector('.map-id-btn'), kaart.querySelector('.world-pick')];
    // ook hier blijft de globe erbuiten: hij vliegt terug naar de pil (globeVlucht)
    const overzicht = [reis.querySelector('.reis-pad'), reis.querySelector('.reis-mist'),
                       reis.querySelector('.header-left')];
    // dezelfde afspraak als bij het uitzoomen, alleen de andere kant op
    const muntV = reis.querySelector('.diamond-badge'), muntN = kaart.querySelector('.diamond-badge');
    const muntKruist = !zelfdePlek(muntV, muntN);
    if (muntKruist) { overzicht.push(muntV); lokaal.push(muntN); }
    const op = () => {
      overgangBezig = false;
      kaart.classList.remove('vlucht-weg', 'vlucht-boven');
      reis.classList.remove('wegvallend');
      el.classList.remove('vlucht-doel');
      lokaal.concat(overzicht).forEach(a => {
        if (a && a.getAnimations) a.getAnimations().forEach(x => x.cancel());
      });
    };
    if (!naar) { op(); kaartKomtOp(punt); return; }

    const kruis = wereldVlucht(van, naar, bron.world, op, true);
    // het plaatselijke werk komt in de laatste tel op, als de tekening er vrijwel is
    vluchtDoofAlle(lokaal.filter(x => x !== muntN), true, VLUCHT.detail, kruis - VLUCHT.detail);
    // en de route eromheen laat los -- hij was de omgeving, niet de bestemming
    vluchtDoofAlle(overzicht.filter(x => x !== muntV), false, VLUCHT.detail);
    if (muntKruist) { vluchtDoof(muntV, false, VLUCHT.detail, 60); vluchtDoof(muntN, true, VLUCHT.detail, 150); }
    globeVlucht(kopVan, kaart.querySelector('.wp-cta-ico'), kruis);
    // de landing: de echte tekening eronder, en Werelden mag weg
    setTimeout(() => {
      if (!vluchtOp) return;                 // al opgeruimd -- dan staat de kaart er gewoon
      kaart.classList.remove('vlucht-weg');
      reis.classList.remove('wegvallend');
    }, kruis);
  });
}
/* Bouwt de kaart van één wereld. travelFrom > 0 = de tussenstand vlak vóór de
   reis-animatie: de ster staat dan nog op de vorige halte en de nieuwe halte zit
   nog op slot. Alles staat op percentages binnen het kader, dus er wordt niets
   opgemeten -- draaien of resizen vraagt geen enkele herberekening. */
function renderTourMap(travelFrom) {
  const p = P();
  const cur = worldFor(p.level);
  if (viewWorldIdx == null) viewWorldIdx = cur.index;
  const shown = worldForIndex(viewWorldIdx);
  const nodes = worldNodes(shown);
  const travelling = !!travelFrom;
  const playable = travelling ? travelFrom : p.level;   // t/m dit level is alles open
  /* Waar de ster staat, en welke halte goud is. Dat is niet hetzelfde als
     'playable': in de toegift-stand (alles uit) wijst p.level één halte voorbij
     het einde, en dan hoort ze op de laatste halte te staan die er wél is.
     hereLevel() klemt dat; playable blijft p.level, dus alles blijft open. */
  const heroLvl = travelling ? travelFrom : hereLevel(p);
  /* De sterren van de zojuist gespeelde halte landen hier, bij de allereerste
     tekening van de kaart. Of ze überhaupt landen beslist goMap: reist ze meteen
     door naar de volgende halte binnen dezelfde wereld, dan is netAf daar al op
     null gezet en gebeurt hier niets -- het eindscherm heeft die sterren dan net
     gevierd (zie reisBinnenWereld). Bij een wereldgrens en bij terugkomen zonder
     level-up staat hij er wél.

     netAf wordt verbruikt zodra hij gebruikt is, ongeacht travelling -- de latere
     tekening die de aankomst laat zien, raakt deze halte niet nog eens aan. */
  const netAfLvl = netAf;
  netAf = null;

  const map = $('tour-map');
  map.innerHTML = '';
  /* Op <html> en niet op het kaartvak: de liggende stand rekent er op
     #screen-map mee uit hoeveel lucht er boven en onder het podium overblijft
     (--podium-lucht in het stijlblad), en die kan niet bij een variabele die
     ónder hem staat. .tour-map erft hem gewoon mee. */
  document.documentElement.style.setProperty('--art-w', ART_W);
  document.documentElement.style.setProperty('--art-h', ART_H);
  const frame = document.createElement('div');
  frame.className = 'world-frame';
  applyWorldArt(frame, shown.world);
  applyWorldTheme(frame, shown.world);
  // ook op het vak eromheen: in liggende stand staat daar de wereld nog een keer,
  // onscherp en donker, in plaats van het paars van de app
  applyWorldTheme(map, shown.world);
  const scherm = $('screen-map');
  applyWorldTheme(scherm, shown.world);
  scherm.style.setProperty('--art', shown.world.art ? `url("${shown.world.art}")` : 'none');

  // De weg: één vloeiende curve door álle haltes, met het afgelegde stuk in goud
  // eroverheen. Getekend uit dezelfde percentages als de haltes, in de viewBox van
  // de tekening -- daarom valt hij op elk scherm precies op de haltes.
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'tour-road-svg');
  svg.setAttribute('viewBox', `0 0 ${VB_W} ${VB_H}`);
  svg.setAttribute('aria-hidden', 'true');
  const pts = nodes.map(n => ({ x: vbx(n.x), y: vby(n.y) }));
  const mkPath = cls => { const e = document.createElementNS(svgNS, 'path'); e.setAttribute('class', cls); return e; };
  // drie lagen: een donkere onderlaag voor de leesbaarheid, het hele pad dof, en
  // het afgelegde stuk in goud daar bovenop
  const unPath = mkPath('tour-road-under'), bgPath = mkPath('tour-road-bg'), fgPath = mkPath('tour-road-fg');
  const curve = shown.world.curve;
  const heleWeg = roadD(pts, pts.length, curve);
  unPath.setAttribute('d', heleWeg);
  bgPath.setAttribute('d', heleWeg);
  const lastOpen = Math.min(nodes.length - 1, playable - shown.first);
  fgPath.setAttribute('d', roadD(pts, lastOpen + 1, curve));
  svg.appendChild(unPath);
  svg.appendChild(bgPath);
  svg.appendChild(fgPath);
  frame.appendChild(svg);
  // pas mét de SVG in de opmaak kun je een pad opmeten, dus het streeppatroon hier
  const heelPatroon = roadDashArray(svg, pts, curve, pts.length);
  unPath.style.strokeDasharray = heelPatroon;
  bgPath.style.strokeDasharray = heelPatroon;
  fgPath.style.strokeDasharray = roadDashArray(svg, pts, curve, lastOpen + 1);

  nodes.forEach((n, i) => {
    const lvl = shown.first + i;
    const open = lvl <= playable;
    const st = p.stars[lvl] || 0;
    const b = document.createElement('button');
    // tijdens de reis-tussenstand is er even geen "hier spelen"-halte
    b.className = 'tour-stop ' + (!open ? 'locked' : (!travelling && lvl === heroLvl) ? 'next' : 'done');
    b.dataset.lvl = lvl;
    b.style.left = n.x + '%';
    b.style.top = n.y + '%';
    // drie sterren = deze halte is áf (zie .tour-stop.perfect). Sinds fase 4C zit
    // dat in de rand en in het gouden sterrentabje, en niet meer in een glans die
    // eroverheen glijdt -- er valt dus ook niets meer te ontregelen in de tijd.
    if (open && st === 3) b.classList.add('perfect');
    const hero = lvl === heroLvl
      ? `<div class="tour-hero"><div class="avatar-holder idle">${pasLaag(avatarSVG(p, 96))}</div>`
        + `<span class="hero-vonk">${TOUR_VONK}</span></div>` : '';

    // gespeeld = deze show is al een keer gedaan, dus er hóórt een score te staan
    // (ook 0 van 3 is een score). De huidige halte krijgt alleen een rij als daar
    // al sterren liggen -- zie starRowHTML.
    const gespeeld = open && lvl < playable;
    // rondje + sterrentabje zitten in één blokje: dat is wat er bij een tik
    // indrukt, en wat als geheel bij deze halte hoort (zie .stop-body)
    const sterrenRij = starRowHTML(st, gespeeld);
    /* Het aankomst-moment hangt aan de sterrenrij en niet aan "gespeeld": speel je
       een halte over zonder dat de voortgang opschuift, dan is gespeeld false maar
       staat er wél een score -- en juist die mag je zien bijwerken. */
    if (lvl === netAfLvl && sterrenRij) b.classList.add('net-af');
    /* Het schatteken bij de laatste halte (fase 6E). Alleen daar, alleen zolang
       de schat van deze wereld nog niet van haar is, en bewust niets meer dan een
       ✨: wát er ligt hoort ze op het feestje te horen en niet hier van de kaart
       af te lezen. Eén teken op de hele kaart, bij de plek waar de route heen
       loopt -- dat is de bedoeling ("daar ligt iets") en niet een tweede
       statussysteem over de haltes heen. Het verdwijnt zodra ze hem heeft. */
    const laatste = i === nodes.length - 1;
    const schat = laatste ? beloningItem(shown.world) : null;
    const schatTeken = (schat && !p.owned.includes(schat.id))
      ? `<span class="stop-schat" aria-hidden="true">✨</span>` : '';
    b.innerHTML = `${hero}<div class="stop-body"><div class="dot">${i + 1}</div>`
      + `${schatTeken}${sterrenRij}</div>`;
    /* Het slotje is weg; de voorleesnaam zegt het nog wél. Wie de kaart met een
       schermlezer doorloopt heeft geen kleur en geen plek op de route -- daar is
       "nog op slot" het enige wat de staat draagt, en dat is geen beeldruis. */
    b.setAttribute('aria-label', `${shown.world.name}, show ${i + 1}`
      + (open ? ` — ${st} van 3 sterren` : ' — nog op slot')
      + (schatTeken ? ' — hier ligt een wereldschat' : ''));
    // Tikken op een halte is niet "start een level" maar "ga die plek binnen":
    // enterLevel doet het klikje, de halte-reactie en de overgang, en roept
    // startLevel meteen zelf aan. Zie de bewegingstaal boven goMap.
    if (open) b.onclick = () => enterLevel(lvl, b);
    frame.appendChild(b);
  });

  // naar een eerdere wereld terug (om daar te verbeteren), of vooruit tot zo ver
  // als ze zelf al gekomen is -- nooit verder
  map.appendChild(frame);

  meetChroom();

  // Past de kaart niet in de vensterverhouding, dan schuift hij: zet de halte waar
  // ze nu staat in beeld. Op een staande telefoon valt er niets te schuiven en doet
  // dit niets.
  /* Dit stond hier altijd als requestAnimationFrame, met als reden: goMap()
     roept show() pas ná deze render aan, en zolang het scherm nog niet .active
     is levert elke meting hier (scrollHeight, offsetHeight, getBoundingClientRect)
     domweg 0 op -- display:none heeft geen doos om op te meten. Wachten tot het
     ként dus.

     Maar wachten met requestAnimationFrame is een beeldje wachten, en dat is
     iets anders dan "tot show() geweest is": een rAF-callback loopt vóór de
     eerstvolgende verf, en daarmee ná de verf van dít beeldje. Precies dat
     beeldje toonde de kaart dus altijd al één keer ongeschaald (transform:
     none), vlak voordat kaartTerugZoom hieronder de intreeanimatie alsnog
     start -- scale(1.06) sprong er dan in één klap overheen, in plaats van
     dat je 'm vanaf het eerste zichtbare beeldje al ziet inzoomen. Dát was de
     tikje-te-grote flits waarna de kaart weer terugzakt (zie kaartKomtOp).

     Is het scherm al .active (elke kaartwissel behalve de allereerste van deze
     navigatie), dan is hier meteen wat te meten en hoeft er niet gewacht te
     worden. Staat het nog uit, dan zet goMap() dit apart en voert het zelf uit
     zodra het ná show() precies dezelfde taak nog loopt -- dus nog steeds vóór
     de eerste verf, niet een beeldje erna. */
  const voltooi = () => {
    const here = map.querySelector('.tour-stop.next') || map.querySelector('.tour-stop.done:last-of-type');
    if (here && map.scrollHeight > map.clientHeight + 4) {
      const f = map.querySelector('.world-frame');
      const y = here.getBoundingClientRect().top - f.getBoundingClientRect().top;
      map.scrollTop = Math.max(0, y - map.clientHeight / 2);
    }
    meetChroom();
    kopOpzij();
    // Terug uit een show: de kaart komt ingezoomd op die halte binnen en zakt
    // daar vandaan terug. Eénmalig -- de opdracht wordt hier verbruikt.
    if (kaartFocus) { const l = kaartFocus; kaartFocus = null; kaartTerugZoom(map, l); }
  };
  if (scherm.classList.contains('active')) voltooi();
  else tourMapVoltooi = voltooi;
  // schuift de kaart, dan schuift zij onder de plakkende kop door
  map.onscroll = kopOpzij;
}
/* Hoe hoog de kop en de navigatiebalk werkelijk zijn. De wereldknoppen gaan daar
   tussenin staan, en die maten hangen af van het lettertype, de veilige zones van
   het toestel en de toestelmaat die in de studio gekozen is -- dus opmeten in
   plaats van vastzetten. */
/* Komt de ster tegen de bovenbalk aan te staan? Opmeten en niet uitrekenen: waar
   zij staat hangt af van de halte, van de toestelmaat én van hoe ver de kaart
   geschoven is (op een tablet schuift hij, en de kop plakt aan de vensterrand).
   Alleen verticaal vergelijken -- dat dimt ook als ze net naast een pil staat, maar
   het is voorspelbaar, en een halve pil naast haar hoofd leest slechter dan geen. */
function kopOpzij() {
  const scherm = $('screen-map');
  if (!scherm) return;
  const kop = scherm.querySelector('.screen-header');
  const ster = scherm.querySelector('.tour-hero');
  if (!kop || !ster) { scherm.classList.remove('ster-bij-kop'); return; }
  const k = kop.getBoundingClientRect(), s = ster.getBoundingClientRect();
  scherm.classList.toggle('ster-bij-kop', s.top < k.bottom && s.bottom > k.top);
}
/* Alleen meten wat er ook echt stáát. De navigatiebalk is display:none tot show()
   het scherm aanzet, en goMap() tekent de kaart vóór die show() -- dus bij de eerste
   opbouw was offsetHeight 0 en de onderrand 0, en kwam --nav-h uit op vensterhoogte
   + 12. Op een telefoon viel dat niet op (daar gebruikt .tour-map die maat niet),
   maar op een breed scherm is de padding-bottom van .tour-map er wél op gebouwd:
   die 962px duwde de contentbox naar nul hoogte, 100cqh werd nul, en het kader viel
   terug op zijn ondergrens van 340px -- half buiten beeld. Eén keer het venster
   verslepen zette het recht, en dát maakte het zo'n lastig verhaal.

   Een 0 betekent hier "nog niet opgebouwd", niet "nul hoog": dan liever niets
   schrijven en de CSS zijn eigen terugval laten gebruiken. */
function meetChroom() {
  const scherm = $('screen-map');
  const kop = scherm.querySelector('.hub-sticky');
  const nav = $('main-nav');
  if (kop && kop.offsetHeight) scherm.style.setProperty('--kop-h', (kop.offsetHeight + 12) + 'px');
  if (nav && nav.offsetHeight) scherm.style.setProperty('--nav-h',
    (nav.offsetHeight + (innerHeight - nav.getBoundingClientRect().bottom) + 12) + 'px');
}
addEventListener('resize', () => { if ($('screen-map')) { meetChroom(); kopOpzij(); } });
/* Drie plekken, altijd -- maar alleen onder een halte die gespeeld is.

   Hiervoor stonden er alleen de verdiende sterren: 1/3 was één los sterretje, 2/3
   waren er twee. Het verschil tussen "bijna af" en "áf" moest je daardoor téllen,
   en dat is precies het ene ding dat een kind op deze kaart in één blik hoort te
   zien -- het is de reden om een show nog eens te spelen. Met drie vaste plekken
   zijn 1/3, 2/3 en 3/3 drie silhouetten die je herkent zonder te kijken.

   Waarom niet ónder élke halte: een halte op slot en een halte waar je nog moet
   spelen hebben per definitie niets verdiend, en drie lege plekken zeggen daar
   niets wat de stoffige vulling of de gouden halte niet al zegt. Ze zouden alleen de kaart
   voller maken en -- onder de huidige halte -- met de ster erbovenop concurreren.
   Vandaar: de rij hoort bij een score, en een score bestaat pas na een show.

   Getekend en niet ⭐: een emoji heeft geen lege variant, en hij wordt per
   toestel anders getekend. Naast elkaar valt dat op. */
const STER_PAD = 'M12 2.6l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.62'
  + 'l-5.88 3.09 1.12-6.55L2.48 9.52l6.58-.96z';
function starRowHTML(n, gespeeld) {
  const got = Math.max(0, Math.min(3, n | 0));
  if (!gespeeld && !got) return '';
  const ster = vol => `<svg viewBox="0 0 24 24" aria-hidden="true">`
    + `<path class="${vol ? 'cs-vol' : 'cs-leeg'}" d="${STER_PAD}"/></svg>`;
  return `<div class="cstars">${ster(got > 0)}${ster(got > 1)}${ster(got > 2)}</div>`;
}
/* De maat van de reis over de kaart: één duur, één vertraging, één easing. Het
   goud (growRoad hieronder) en de ster (heroRoadFrames) gebruiken alle drie
   dezelfde getallen -- dat is de enige manier waarop ze gegarandeerd samen
   aankomen.

   REIS_WACHT is de opkomst van de kaart en geen beat: die loopt van 110 tot
   300ms (MOTION.komNa + MOTION.kom, zie kaartKomtOp), dus ze zet haar eerste
   stap een tiende nadat het scherm stilstaat. Korter en ze vertrekt terwijl de
   kaart nog inzoomt; langer en het wordt een moment om op te wachten. Hier stond
   dat dit de tel was waarin de sterrenlanding uitdempte -- die landing is weg
   (zie reisBinnenWereld in goMap) en het getal bleef, om deze andere reden. */
const REIS_DUUR = 1400, REIS_WACHT = 400, REIS_EASING = 'ease-in-out';
/* Waar het vonkenspoor onderweg uit kiest. Bewust zonder ⭐ (en zonder 💖 en 🎵,
   die hun eigen plek hebben): een ster is op deze kaart een score en geen sier. */
const REIS_VONKEN = ['✨', '💫'];

/* Het goud van de afgelegde weg groeit mee met het huppelen, in plaats van pas ná
   aankomst in één klap door te schieten.

   PS-36 -- dit gebeurde eerst via één streep die als geheel groeide: fg kreeg zijn
   hele weg-tot-nu als één dash (stroke-dasharray = total) en een dashoffset die
   naar 0 liep. Dat verft dus een dóórlopende, effen gouden streep -- precies het
   stippelpatroon dat de rest van de weg draagt (zie DASH_ON/DASH_OFF) verdween
   voor de duur van de reis en klapte er bij aankomst weer op terug. Een kind ziet
   dat als een sprong: eerst een vage stip-streep die vast staat, dan opeens een
   vast stipje-voor-stipje pad.

   Nu blijft fg zelf de hele reis lang gewoon het echte streeppatroon dragen (zie
   roadDashArray hieronder) -- er verandert dus nooit iets aan hóe de weg getekend
   is. Wat groeit is een onzichtbaar masker: een eigen streep, boven op hetzelfde
   pad, die van de oude naar de nieuwe halte vult en alleen bepaalt wélk stuk van
   de al-gestippelde fg zichtbaar is. Dat masker mag zelf best één brede, effen
   streep zijn -- het wordt nooit getekend, het dekt alleen af. */
function growRoad(map, fromLvl, toLvl, duration, delay) {
  const svg = map.querySelector('.tour-road-svg');
  const fg = svg && svg.querySelector('.tour-road-fg');
  if (!svg || !fg || !fg.animate || !fg.getTotalLength) return null;
  const shown = worldForIndex(viewWorldIdx);
  const pts = worldNodes(shown).map(n => ({ x: vbx(n.x), y: vby(n.y) }));
  const curve = shown.world.curve;
  const fromIdx = fromLvl - shown.first, toIdx = toLvl - shown.first;
  if (fromIdx < 0 || toIdx <= 0 || toIdx >= pts.length) return null;
  const d = roadD(pts, toIdx + 1, curve);
  fg.setAttribute('d', d);
  // het echte streeppatroon voor dit stuk -- hetzelfde dat er zou staan als de
  // reis al voorbij was, dus geen sprong bij aankomst (zie renderTourMap)
  fg.style.strokeDasharray = roadDashArray(svg, pts, curve, toIdx + 1);
  fg.style.strokeDashoffset = '';
  const total = fg.getTotalLength();
  // lengte tot de oude halte: even hetzelfde pad opmeten, ingekort
  const probe = fg.cloneNode();
  probe.removeAttribute('mask');
  probe.setAttribute('d', roadD(pts, fromIdx + 1, curve));
  svg.appendChild(probe);
  const covered = fromIdx > 0 ? probe.getTotalLength() : 0;
  probe.remove();

  // Het masker: een eigen, brede streep over exact hetzelfde pad, die opengeschoven
  // wordt zoals de oude fg dat deed. Verwijdert een eerder masker van een reis die
  // hier is blijven hangen (zie ook stopWereldReis) -- er hoort er maar één te zijn.
  const oud = svg.querySelector('#road-reveal');
  if (oud) oud.remove();
  const svgNS = 'http://www.w3.org/2000/svg';
  const mask = document.createElementNS(svgNS, 'mask');
  mask.id = 'road-reveal';
  mask.setAttribute('maskUnits', 'userSpaceOnUse');
  mask.setAttribute('x', 0); mask.setAttribute('y', 0);
  mask.setAttribute('width', VB_W); mask.setAttribute('height', VB_H);
  const reveal = document.createElementNS(svgNS, 'path');
  reveal.setAttribute('d', d);
  reveal.setAttribute('fill', 'none');
  reveal.setAttribute('stroke', '#fff');
  reveal.setAttribute('stroke-width', 24);   // ruim over de 11 van .tour-road-fg heen
  reveal.setAttribute('stroke-linecap', 'round');
  reveal.style.strokeDasharray = total;
  reveal.style.strokeDashoffset = total - covered;
  mask.appendChild(reveal);
  svg.appendChild(mask);
  fg.setAttribute('mask', 'url(#road-reveal)');

  /* Niet alleen de animatie terug, maar ook de maat waarin hij gedacht is: welk
     pad, en waar op dat pad de oude en de nieuwe halte liggen. De ster loopt
     daar overheen (zie heroRoadFrames) -- met dezelfde lengtes, dezelfde duur
     en dezelfde easing lopen het goud en zij per definitie gelijk op. */
  return {
    anim: reveal.animate(
      [{ strokeDashoffset: total - covered }, { strokeDashoffset: 0 }],
      { duration, delay, easing: REIS_EASING, fill: 'forwards' }),
    pad: fg, van: covered, tot: total, start: pts[fromIdx],
  };
}
/* De ster loopt ÓVER de weg, niet er dwars overheen.

   Hiervoor huppelde ze in een rechte lijn: zes keyframes over translate(dx, dy)
   tussen de twee haltes, met een sprongetje op de oneven punten. Op een recht
   stuk viel dat niet op -- maar de weg bólt (zie ROAD_BOW/defaultControl, en in
   de studio buigt elk stuk apart om een rots heen), en juist in die bochten
   sneed ze de hoek af. Je zag haar dan naast haar eigen gouden spoor lopen: twee
   bewegingen die hetzelfde moment vertellen en toch een andere weg nemen.
   Opgemeten over alle 42 stukken weg van de zes werelden, op een toestel van 390
   breed: gemiddeld 23px naast de weg, en op het bochtigste stuk (Junglewereld,
   stuk 7) 98px -- dat is bijna een hele halte breed.

   Nu komt haar plek uit hetzelfde pad als het goud. growRoad zet fg op de d t/m
   de nieuwe halte en meet waar de oude halte op dat pad ligt (van) en waar de
   nieuwe (tot); hier wordt datzelfde pad op gelijke afstanden afgetast met
   getPointAtLength. Eén voortgang 0 -> 1 stuurt dus allebei:

     goud   strokeDashoffset = tot - (van + lengte * voortgang)
     ster   getPointAtLength(van + lengte * voortgang)

   Ze lopen daardoor niet gelijk op omdat de duur toevallig dezelfde is, maar
   omdat het dezelfde maat is. Beide animaties krijgen REIS_DUUR, REIS_WACHT en
   REIS_EASING; die easing werkt op de tíjd en niet op de keyframes, dus de
   keyframes hieronder mogen gewoon op gelijke afstanden liggen -- WAAPI rekent
   de tijd eerst om en interpoleert er daarna tussen. Precies wat het goud ook
   doet, met zijn twee keyframes.

   TWEE LAGEN, en dat is de hele opzet. De halte-laag (.tour-hero) staat éxact op
   de weg -- niets erbij, geen veer, geen boog. Het loopje zit één laag dieper, op
   de tekening zelf (zie heroWalkFrames). Zo kan het loopje nooit haar plek op de
   weg beïnvloeden: wat er ook met haar houding gebeurt, haar voeten staan waar het
   goud is.

   Hier stond eerst wél een veer op deze laag (REIS_VEER, 38 eenheden ~ 12px). Dat
   werkte, maar het was de verkeerde laag: het is houding en geen plek, en twee
   verticale bewegingen boven op elkaar stapelen is precies hoe ze weer van de weg
   af drijft. Eén verticale beweging dus, en die zit binnenin.

   WAT ZE NIET DOET is meedraaien met de bocht. Een tangenthoek zou haar op een
   scherp stuk zichtbaar schuin zetten, en ze staat in de hele app rechtop -- op
   de kaart, in de kleedkamer, op het eindscherm. Alleen haar pósitie volgt de
   weg; haar houding is van haar.

   EENHEDEN. De weg staat in viewBox-eenheden, de ster verschuift in pixels
   binnen het kader. De SVG dekt het kader precies (.tour-road-svg: inset 0,
   100%/100%) en .world-frame heeft dezelfde beeldverhouding als de viewBox (zie
   VB_W), dus er is geen brievenbus en de omrekening is één schaal per as. Haar
   basis is translateX(-50%) binnen haar eigen halte; wat we animeren is dus het
   verschil met de oude halte, niet een absolute plek. */
const REIS_STAPPEN = 40;   // aftastpunten over het stuk weg -- ruim genoeg voor de scherpste bocht
/* Hoeveel pixels één viewBox-eenheid is in het kader waar de kaart in staat.
   Layoutmaten en geen getBoundingClientRect: midden in een kaartovergang staat er
   een transform op de kaart, en daar hoort deze omrekening niets van te merken. */
function kaderSchaal(map) {
  const frame = map && map.querySelector('.world-frame');
  const w = frame ? frame.clientWidth : 0, h = frame ? frame.clientHeight : 0;
  return (w > 0 && h > 0) ? { x: w / VB_W, y: h / VB_H } : null;
}
function heroRoadFrames(map, geo) {
  const pad = geo && geo.pad;
  const sch = kaderSchaal(map);
  if (!sch || !pad || !pad.getPointAtLength || !geo.start) return null;
  const lengte = geo.tot - geo.van;
  if (!(lengte > 0)) return null;
  const frames = [];
  for (let i = 0; i <= REIS_STAPPEN; i++) {
    const t = i / REIS_STAPPEN;
    const pt = pad.getPointAtLength(geo.van + lengte * t);
    const dx = (pt.x - geo.start.x) * sch.x;
    const dy = (pt.y - geo.start.y) * sch.y;
    frames.push({
      transform: `translate(calc(-50% + ${dx.toFixed(2)}px), ${dy.toFixed(2)}px)`,
      offset: t,
    });
  }
  return frames;
}
/* HET LOOPJE. Onderweg gleed ze: haar plek klopte tot op de pixel, maar er
   gebeurde verder niets met haar, en een pop die over een weg schuift leest als
   een pion op een bord in plaats van als iemand die ergens heen gaat.

   Dit is de kleinst mogelijke ingreep die dat omdraait: drie zachte pasjes over de
   hele reis, elk een goeie 4px omhoog, met een rek van anderhalve procent op het
   hoogste punt. Geen sprong (dat was de oude veer, drie keer zo hoog), geen
   slingeren, geen draaien -- alleen het verschil tussen glijden en lopen.

   OP .pas-laag, niet op de houder en niet op de tekening. Die laag bestaat al voor
   de danspasjes en is er om precies één reden (zie het stijlblad bij .pas-laag):
   de ster op de kaart draagt een SVG-filter, en een transform óp een gefilterd
   element laat de browser dat filter elk beeldje opnieuw uitrekenen. Het loopje
   hoort dus op dezelfde laag als de pasjes, met hetzelfde draaipunt bij haar
   voeten -- en dan kost het niets. Het wiegen op de houder erboven (.idle, sway)
   loopt gewoon door: geneste transforms vermenigvuldigen, dus ze wiegt én loopt.

   NUL AAN BEIDE KANTEN. |sin| is nul bij offset 0 en bij offset 1, en de rek hangt
   aan diezelfde waarde -- vertrek en aankomst staan dus exact op niets. Daar hoeft
   geen envelop omheen en er valt bij het begin en het eind niets te zien springen.

   DEZELFDE TIJD als de baan en het goud: REIS_DUUR, REIS_WACHT, REIS_EASING. De
   easing werkt op de tijd, dus haar pas gaat vanzelf mee met haar snelheid --
   traag aan het begin, vlotter in het midden. */
const REIS_PASSEN = 3;      // pasjes over de hele reis -- ~470ms per pas, een kinderwandeltempo
const REIS_STAP = 11;       // hoogte van één pasje, in viewBox-eenheden (opgemeten 4,3px op een telefoon)
const REIS_REK = 0.015;     // 1,5% langer op het hoogste punt, en net zoveel smaller
function heroWalkFrames(map) {
  const sch = kaderSchaal(map);
  if (!sch) return null;
  const frames = [];
  for (let i = 0; i <= REIS_STAPPEN; i++) {
    const t = i / REIS_STAPPEN;
    const op = Math.abs(Math.sin(t * Math.PI * REIS_PASSEN));   // 0 op de grond, 1 op het hoogste punt
    const rek = 1 + op * REIS_REK;
    frames.push({
      transform: `translateY(${(-op * REIS_STAP * sch.y).toFixed(2)}px) `
        + `scale(${(1 / rek).toFixed(4)}, ${rek.toFixed(4)})`,
      // bij haar voeten, net als de danspasjes -- een rek mag haar niet van de weg tillen
      transformOrigin: '50% 95%',
      offset: t,
    });
  }
  return frames;
}
/* De terugval als er geen pad te meten valt (geen SVG, een halte die niet in deze
   wereld ligt, een kader dat nog geen maat heeft): de rechte lijn van hiervoor,
   zodat de reis in het ergste geval oud gedrag vertoont in plaats van géén. Het
   afwisselende ease-in/ease-out per keyframe blijft staan -- dát maakt van drie
   knikken drie sprongetjes, en dat kan REIS_EASING over de tijd niet nadoen. */
function heroLineFrames(from, to) {
  const dx = to.offsetLeft - from.offsetLeft;
  const dy = to.offsetTop - from.offsetTop;
  const frames = [];
  for (let i = 0; i <= 6; i++) {
    frames.push({
      transform: `translate(calc(-50% + ${dx * i / 6}px), ${dy * i / 6 + (i % 2 ? -30 : 0)}px)`,
      offset: i / 6,
      easing: i % 2 ? 'ease-in' : 'ease-out',
    });
  }
  return frames;
}
/* De eerste keer dat een wereld opengaat.

   Dezelfde beweging als gewoon rondkijken -- de camera klimt, de afgemaakte wereld
   zakt onder het beeld weg en de nieuwe komt van boven binnen -- maar met meer lucht
   eromheen, want dit is het moment waar de hele wereld naartoe werkte:

     1  de badge van de afgemaakte wereld stijgt van de kaart naar de trofeeënkast
     2  de sterren van de zojuist gespeelde halte landen (zie starRevealBeat) --
        de beloning voor wat je net deed, vóórdat je ergens anders naartoe gaat
     3  een halve tel stilte: de afgemaakte wereld staat er nog, en dat mag even
     4  de camera klimt door, trager dan bij rondkijken en met meer aanzet
     5  de nieuwe wereld zakt op zijn plek -- het kader komt een tikje te groot
        binnen en zoomt na, zoals een camera die tot stilstand komt
     6  confetti en de naam van de wereld (zie vier() in runTravel)

   Wat het níet is: een tussenscherm, een titelkaartje of een beloningsvenster.
   De nieuwe wereld ís de beloning, dus die hoort in beeld te komen -- niet
   aangekondigd te worden door iets dat ervoor staat.

   Eén keer per wereld, en zonder dat daar iets voor opgeslagen wordt. runTravel
   draait alleen op een level-up, en het eindscherm zet p.level (en dus
   pendingTravel) alleen omhoog op de vóórste halte -- zie 'if (lvl === p.level)'
   daar. Een wereldgrens passeer je daardoor precies één keer. Verversen, de app
   opnieuw openen, een show overdoen, later terugkomen via de kiezer: geen van alle
   komt hier langs, want geen van alle is een level-up. Er is dus geen "al
   gezien"-vlag nodig, en er kan er ook geen scheef komen te staan.

   De badge vliegt vóór de stilte, niet erna: dezelfde beweging als flyDiamonds,
   dus dezelfde taal als "je hebt iets verdiend". Hij landt op de káárt waar de
   reis gebeurde, en niet pas op een volgend scherm. */
function runWorldChange(fromLvl, fromW, toW, plaats, vier, still) {
  const map = $('tour-map');
  flyBadge(map, $('nav-tro'), fromW.world.icon || '🌍');
  if (!map || !map.animate || still) { plaats(); vier(); return; }
  /* De grendel gaat dicht vóór de beloningsbeat en de stilte, en niet pas als de
     camera vertrekt. Dat hele stuk is namelijk het enige gat waarin een kind nog
     een wereld zou kunnen kiezen -- en dan reist de kaart eerst daarheen en een
     tel later alsnog naar de wereld die net openging. De kaart zelf gaat om
     dezelfde reden op slot: een tik tijdens de beloning of de stilte hoort geen
     show te starten in een wereld die al uitgespeeld is.

     Wordt het alsnog afgebroken (de navigatiebalk, de terugknop van het
     toestel, een andere ster kiezen), dan zet de opruimer de nieuwe wereld gewoon
     neer -- zónder confetti, want dan staat het kind allang ergens anders te
     kijken. De voortgang en de zichtbare kaart blijven het eens. */
  let gestart = false, timer = 0;
  const wachten = () => {
    clearTimeout(timer);
    map.style.pointerEvents = '';
    if (!gestart && cur) plaats();
  };
  map.style.pointerEvents = 'none';
  wereldReisOp = wachten;
  // eerst de sterren van de afgemaakte wereld laten landen, dan pas de klim
  starRevealBeat(fromLvl, () => {
    if (wereldReisOp !== wachten) return;   // ondertussen afgebroken -- wachten() heeft al opgeruimd
    timer = setTimeout(() => {
      gestart = true;
      if (wereldReisOp === wachten) wereldReisOp = null;   // de stilte geeft de grendel door aan de reis
      map.style.pointerEvents = '';
      wereldCamera(1, plaats, { duur: WERELDREIS.onthul, easing: WERELDREIS.traag, zoom: true, klaar: vier });
    }, WERELDREIS.beat);
  });
}
/* De wereldbadge die opstijgt. Kleiner broertje van flyDiamonds: één stuk, vanaf het
   midden van de kaart, met een boogje. */
function flyBadge(vanEl, naarEl, teken) {
  if (!vanEl || !naarEl || !vanEl.animate) return;
  /* Bij beperkte beweging blijft de badge op de kaart en stijgt er niets op. De
     munt hoort bij het moment en niet bij de vlucht: beide aanroepers laten hem
     zelf klinken (zie vier() in runTravel en de toegift-tak), dus hier zou hij
     dubbel vallen. */
  if (motionOff()) return;
  const f = vanEl.getBoundingClientRect(), t = naarEl.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = 'fly-badge';
  d.textContent = teken;
  d.style.left = (f.left + f.width / 2) + 'px';
  d.style.top = (f.top + f.height / 2) + 'px';
  document.body.appendChild(d);
  const dx = t.left + t.width / 2 - (f.left + f.width / 2);
  const dy = t.top + t.height / 2 - (f.top + f.height / 2);
  const a = d.animate([
    { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 1, offset: .25 },
    { transform: `translate(calc(-50% + ${dx * .5}px), calc(-50% + ${dy * .5 - 60}px)) scale(1.2)`, opacity: 1, offset: .65 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.35)`, opacity: 0 },
  ], { duration: 1100, easing: 'ease-in-out' });
  a.onfinish = () => d.remove();
  setTimeout(() => { sndCoin(); }, 900);
}

/* De beloning na een level-up: de ster huppelt over de route naar de volgende
   halte, die daar zichtbaar openspringt. Loopt de sprong over een wereldgrens,
   dan is er niets om naartoe te huppelen -- dan wisselt de kaart van wereld en
   krijgt de aankomst een eigen titelkaartje. */
function runTravel(t) {
  const p = P();
  const fromW = worldFor(t.from), toW = worldFor(t.to);
  const crossing = fromW.index !== toW.index;
  const map = $('tour-map');
  const from = map.querySelector(`.tour-stop[data-lvl="${t.from}"]`);
  const to = map.querySelector(`.tour-stop[data-lvl="${t.to}"]`);
  const hero = from && from.querySelector('.tour-hero');
  const still = motionOff();
  /* Twee dingen die bij een wereldwissel niet op hetzelfde moment horen: de nieuwe
     wereld neerzetten en hem vieren. Binnen één wereld vallen ze samen (de ster is
     er, dus feest), maar bij een onthulling staat de wereld er al vóórdat je hem
     ziet -- daar komt het feest pas als de camera stilstaat. Vandaar twee functies
     in plaats van één finish(). */
  const plaats = () => { markWorldSeen(p, toW.index); showWorld(toW.index); };
  const vier = () => {
    const el = map.querySelector(`.tour-stop[data-lvl="${t.to}"]`);
    const dot = el && el.querySelector('.dot');
    if (dot && dot.animate && !still) dot.animate(
      [{ transform: 'scale(.3)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }],
      { duration: 450, easing: 'ease-out' });
    /* HET TIKJE VAN AANKOMEN ZIT AL IN sndCoin -- buzz(15), zie daar. Niet bij elke
       pas dus (dat zou een ratel zijn en geen aankomst), maar één keer, hier, samen
       met het muntje. buzz() kijkt zelf al naar db.haptics en naar wat het toestel
       kan; zonder trilmotor gebeurt er gewoon niets. vier() draait precies één keer
       per reis -- vanuit finish(), vanuit de wereldwissel, of meteen bij beperkte
       beweging -- en nooit opnieuw bij een hertekening, dus dubbel kan het niet.

       Er stond hier even een eigen buzz() vóór deze regel, en dat was twee keer
       fout: het is een tweede trilling naast een bestaande, én hij werd niet eens
       gevoeld. navigator.vibrate() breekt een lopende trilling af en begint
       opnieuw, dus een tik van 12ms met 15ms er meteen achteraan is gewoon 15ms.
       Wie hier een aankomsttrilling zoekt: hij is er, en hij zit in sndCoin. */
    sndCoin();
    confetti(crossing ? 26 : 14);
    showPraise(crossing ? `${toW.world.icon} ${toW.world.name}!` : '🎤 De volgende show wacht!');
  };
  const finish = () => { plaats(); vier(); };
  /* De laatste show van de laatste uitgebrachte wereld. Er is geen volgende halte
     om naartoe te huppelen en geen volgende wereld om te onthullen -- er is een
     toegift: dezelfde wereld, opnieuw te spelen. Dus gaat de badge omhoog, valt
     er confetti, en blijft de ster staan waar ze staat. Geen nepwereld, geen
     "de volgende show wacht" terwijl er geen volgende show is.

     Dit speelt precies één keer: p.level stapt maar één keer over WORLD_LAST heen
     (zie endLevel), en een toegift daarna is geen level-up meer. */
  if (t.to > WORLD_LAST) {
    flyBadge(map, $('nav-tro'), fromW.world.icon || '🌍');
    showWorld(fromW.index);
    sndCoin();
    confetti(26);
    showPraise('✨ Alle werelden uit!');
    return;
  }
  if (crossing) { runWorldChange(t.from, fromW, toW, plaats, vier, still); return; }
  if (!from || !to || !hero || !hero.animate || still) { finish(); return; }
  /* METEEN VERTREKKEN. Hier stond starRevealBeat: een halve seconde waarin de
     sterren van de zojuist gespeelde halte op de kaart landden, plus 200ms
     stilte, en pás daarna de reis. Met de sterrenlanding weg (zie goMap) is er
     niets meer om op te wachten, en het wachten zelf was nooit het punt.

     Wat overblijft is REIS_WACHT: 400ms, en dat is geen beat maar de opkomst van
     de kaart. Die loopt van 110 tot 300ms (MOTION.komNa + MOTION.kom, zie
     kaartKomtOp) -- ze zet dus haar eerste stap een tiende nadat het scherm tot
     stilstand is gekomen. Eerder zou ze vertrekken terwijl de kaart nog inzoomt.

     Eerst het goud, dan de ster -- niet omdat de volgorde in beeld iets uitmaakt
     (ze krijgen dezelfde vertraging en beginnen dus samen), maar omdat growRoad
     het pad opmeet waar zij overheen loopt. Zonder dat pad is er niets om langs
     te lopen en valt ze terug op de rechte lijn. */
  const geo = growRoad(map, t.from, t.to, REIS_DUUR, REIS_WACHT);
  const frames = heroRoadFrames(map, geo) || heroLineFrames(from, to);
  const anim = hero.animate(frames,
    { duration: REIS_DUUR, delay: REIS_WACHT, easing: REIS_EASING, fill: 'forwards' });
  /* En het loopje eronder (zie heroWalkFrames): dezelfde tijd, dezelfde easing,
     maar op de tekening in plaats van op de halte-laag. Geen fill -- het laatste
     beeldje staat toch al op niets, en zo laat het de laag daarna gewoon weer
     los. Lukt het niet, dan reist ze zoals hiervoor: glijdend, maar goed. */
  const stap = hero.querySelector('.pas-laag');
  const loopje = heroWalkFrames(map);
  if (stap && stap.animate && loopje) stap.animate(loopje,
    { duration: REIS_DUUR, delay: REIS_WACHT, easing: REIS_EASING });
  /* Het vonkenspoor loopt mét haar mee en niet voor haar uit. Het hing aan een
     setInterval die meteen ging lopen, dus het eerste vonkje viel op 280ms --
     120ms vóór haar eerste stap, stilstaand naast de halte die ze net had
     afgerond. Dat leest als een vonkje bij de aankomst van de vorige show en niet
     als een spoor. Nu begint het met de beweging en stopt het ermee.

     En zonder ⭐: sparkleAt kiest uit vijf tekens, en juist de ster daarvan is het
     ene teken dat op deze kaart iets betékent (zie het sterrentabje). Stof en
     glinstering onderweg, geen sterren -- die zijn op het eindscherm uitgedeeld. */
  setTimeout(() => {
    const tik = setInterval(() => { if (hero.isConnected) sparkle(hero, REIS_VONKEN); }, 280);
    setTimeout(() => clearInterval(tik), REIS_DUUR);
  }, REIS_WACHT);
  anim.onfinish = finish;
}
/* ================= Trofeeën-scherm ================= */
// Verse start (o.a. nogmaals op het al-actieve Trofeeën-tabblad tikken):
// altijd terug naar boven.
function openTrophies() {
  renderShelves();
  toonHub('screen-trophies');
  $('screen-trophies').scrollTop = 0;
  kastScroll();   // verse start = bovenaan = de ruime kop
}
/* De kop van de kast heeft twee standen (zie .gescrold in het stijlblad): ruim
   bovenaan, krap en dekkend zodra er kaarten onderdoor schuiven. Hier wordt alleen
   de klasse gezet; hoe de twee standen eruitzien staat in de CSS.

   De drempel ligt op 4px en niet op 0: met 0 wisselt de kop bij het minste
   duimtrilletje heen en weer, en een kop die knippert is erger dan een kop die
   iets te lang ruim blijft. Eén rAF-vertraging ertussen, net als bij de reis
   (zie reisScroll): scroll vuurt vaker dan er beeldjes zijn. */
let kastScrollWacht = false;
function kastScroll() {
  if (kastScrollWacht) return;
  kastScrollWacht = true;
  requestAnimationFrame(() => {
    kastScrollWacht = false;
    const sc = $('screen-trophies');
    if (sc) sc.classList.toggle('gescrold', sc.scrollTop > 4);
  });
}
// Terug naar de trofeeënkast via de vaste navigatie (kwam van een ánder
// tabblad): hervat gewoon waar je gebleven was -- scrollpositie blijft staan,
// want die reset de browser niet vanzelf bij display:none/flex (zie ook de
// scroll-reset hierboven, die juist bewust wél altijd terug naar boven gaat).
function resumeTrophies() {
  renderShelves();
  toonHub('screen-trophies');
  kastScroll();   // de scrollpositie bleef staan, dus de kopstand ook
}
/* De status van een trofee, in prioriteitsvolgorde:
   ready (open trofee) > done (behaald) > locked > bezig > fresh (nog niets gedaan).
   'locked' is voorzien voor trofeeën die nog niet vrij zijn (via een optionele
   t.locked(p)); geen enkele trofee gebruikt dit nu, dus het blijft voorlopig sluimerend.

   FASE 5C -- 'almost' is weg. Dat was een vierde stand met een eigen gouden gloed,
   bedoeld om te zeggen "nog heel even". Maar goud betekent in deze app "verdiend",
   en op een kast vol kaartjes stonden daardoor gouden randen om dingen die je nog
   níet had. Nu is er één stand voor onderweg, en die is rustig: een getal. */
function trophyStatus(p, t) {
  if ((p.readyTrophies || []).includes(t.id)) return 'ready';
  if (p.trophies.includes(t.id)) return 'done';
  if (t.locked && t.locked(p)) return 'locked';
  const prog = t.progress ? t.progress(p) : null;
  return (prog && prog.now > 0) ? 'busy' : 'fresh';
}
// (Her)tekent de hele kast. Losgemaakt van openTrophies zodat "Open trofee"
// meteen kan hertekenen zónder de scrollpositie te verliezen.
let justClaimed = null;   // id van de zojuist geopende trofee (voor de shimmer, één render lang)
/* FASE 5C -- de kast als kast.
   Wat er weg is en waarom, want het is vooral wéghalen:
     - de balk in de kop ("5 van 42" + voortgangsbalk over de hele kast). Een kast
       met een vulmeter is een takenlijst. De teller zelf blijft, klein en in
       woorden, want een kind wil best weten hoeveel er nog te halen valt.
     - de teller per plank ("2 van 5"). Idem, maal vier.
     - de voortgangsbalk op élke kaart. Die stond op tientallen kaartjes tegelijk
       en vertelde bij de meeste niets dat het getal er niet al zei. Waar het getal
       wél iets zegt ("82 / 100 sommen") staat het er nu kaal, zonder balk.
     - de ster-statusbalk bovenaan. De ster-status is een ánder systeem; hij staat
       helemaal niet meer op dit scherm; hij gaat open vanaf het eindscherm.
   Wat er overblijft per kaartje is precies twee dingen: heb ik hem, en waarvoor is
   hij. En op de perfecte plank: welke wereld. */
function renderShelves() {
  const p = P();
  $('screen-trophies').onscroll = kastScroll;
  checkTrophies(p);   // net gehaalde trofeeën komen 'klaar' te liggen
  // alleen wat er ook echt in de kast staat telt mee (zie RETIRED_TROPHIES)
  const totaal = activeTrophies().length;
  const earned = earnedActiveCount(p);
  telNu($('trophy-diamonds'), p.diamonds);
  /* De stand als pil, met de vulling erin -- zie .kast-telling in het stijlblad
     voor waarom dit geen zin meer is en waarom de vulling hier wél mag. De
     tekst blijft "4 / 18 verzameld": precies de woorden waarmee het schattenvak
     in de kleedkamer telt, dus de twee verzamelschermen tellen hetzelfde. */
  const pct = totaal ? Math.round(earned / totaal * 100) : 0;
  $('trophy-count').innerHTML =
    `<span class="kt-vul" style="width:${pct}%"></span>`
    + `<span class="kt-tekst"><b>${earned}</b> / ${totaal} <span class="kt-woord">verzameld</span></span>`;
  const wrap = $('trophy-shelves');
  wrap.innerHTML = '';
  TROPHY_SHELVES.forEach(shelf => {
    const ids = shelf.ids.filter(id => !isRetiredTrophy(id));
    if (!ids.length) return;   // een plank die helemaal met pensioen is, staat er niet
    const klaar = ids.filter(id => p.trophies.includes(id)).length;
    const groep = document.createElement('section');
    groep.className = 'kast-groep' + (klaar === ids.length ? ' vol' : '');
    /* De kopregel van de groep: icoon | naam + regeltje | stand. Het icoon staat
       aria-hidden -- het herhaalt de naam ernaast, en een voorlezer die "microfoon
       Avontuur" zegt maakt de kop juist onduidelijker. */
    const head = document.createElement('div');
    head.className = 'groep-kop';
    head.innerHTML = `<span class="groep-ico" aria-hidden="true">${shelf.ico || ''}</span>`
      + `<div class="groep-tekst"><div class="groep-naam">${shelf.name}</div>`
      + (shelf.note ? `<div class="groep-note">${shelf.note}</div>` : '')
      + `</div>`
      + `<span class="groep-telling" aria-label="${klaar} van de ${ids.length} behaald">`
      + `<b>${klaar}</b>/${ids.length}</span>`;
    groep.appendChild(head);
    const grid = document.createElement('div');
    grid.className = 'trophy-grid' + (shelf.key === 'perfect' ? ' pw-grid' : '');
    ids.forEach(id => {
      const t = TROPHIES.find(x => x.id === id);
      if (t) grid.appendChild(trophyCard(t, p));
    });
    groep.appendChild(grid);
    wrap.appendChild(groep);
  });
  justClaimed = null;   // shimmer geldt maar voor deze ene render
  save();
  updateTroDot();
}
/* Enkelvoud voor "Nog 1 ..."; alleen waar het meervoud lelijk zou staan.

   Precies één regel per label dat een actieve trofee werkelijk teruggeeft uit
   progress() -- niet meer. Er stonden er twaalf die nergens meer vandaan kwamen
   ('steden' uit het stedenmodel, 'outfits'/'schoenen'/'haarkleuren'/'dieren' van
   de koop-alles-trofeeën, 'diamanten' van de saldotrofeeën; zie
   RETIRED_TROPHIES). Een tabel met dode sleutels leest als een lijst van wat er
   bestaat, en dat was het niet meer.

   Komt er een trofee met een nieuw label bij, dan hoort hier één regel bij --
   inhoud.test.js zaak F valt om als dat vergeten wordt. */
const TROPHY_UNIT_SINGULAR = {
  'shows': 'show', 'sommen': 'som',
  'gouden vragen': 'gouden vraag', 'perfecte shows': 'perfecte show',
  'spulletjes': 'spulletje',
  // 'uit' is geen telwoord-achtervoegsel maar hoort bij het label ("werelden uit"),
  // dus unitText() knipt het er niet af en staat de hele zin hier.
  'werelden uit': 'wereld uit'
};
// Maakt van een voortgangslabel ("sommen goed") een kaal zelfstandig
// naamwoord ("sommen") voor de "Nog X ..."-tekst; enkelvoud bij precies 1.
function unitText(label, remaining) {
  let noun = label
    .replace(/^paar /, '')
    .replace(/ (gespeeld|bereikt|bezocht|verzameld|goed|gekocht|perfect|tegelijk aan)$/, '');
  if (remaining === 1 && TROPHY_UNIT_SINGULAR[noun]) noun = TROPHY_UNIT_SINGULAR[noun];
  return noun;
}
/* De stand op een kaart die nog loopt: "82 / 100 sommen". Alleen als er al iets
   staat -- op nul is het geen stand maar een nul, en dat weet je al doordat de
   kaart gedempt is. Geeft '' als er niets te melden valt. */
function trophyStand(t, p, status) {
  if (status !== 'busy' || !t.progress) return '';
  const pr = t.progress(p);
  return `<div class="tstand">${pr.now} / ${pr.target} <span>${unitText(pr.label, pr.target)}</span></div>`;
}
// Een klare trofee: dit kaartje wordt zélf de 'Open trofee'-knop.
// Klaar om te openen = de gewone kaart (eigen icoon + naam + beschrijving) met een
// gouden rand en "🎁 Open!" onderaan -- zelfde vorm, zelfde plek voor de naam,
// zodat vijf klaarliggende trofeeën vijf verschillende dingen blijven.
function trophyCard(t, p) {
  const status = trophyStatus(p, t);
  const card = document.createElement('div');
  card.className = `trophy-card ${t.perfect ? 'pw-card ' : ''}${status}`;
  if (status === 'done' && t.id === justClaimed) card.classList.add('just-claimed');
  card.innerHTML = t.perfect ? perfectCardHTML(t, p, status) : normalCardHTML(t, p, status);
  card.onclick = (e) => tapTrophy(t, card, e);
  return card;
}
/* Elke kaart heeft dezelfde vier zones, in dezelfde volgorde: icoon, naam,
   waarvoor hij is, en de voet. De voet is er alleen als er iets in staat, maar
   staat er altijd onderaan (.tvoet heeft margin-top:auto) -- zo hangen de standen
   van drie kaarten naast elkaar op één lijn, ook als de ene naam over twee regels
   loopt en de andere niet. */
function cardVoet(inhoud) { return inhoud ? `<div class="tvoet">${inhoud}</div>` : ''; }
function normalCardHTML(t, p, status) {
  return `<div class="temoji">${t.emoji}</div>`
    + `<div class="tname">${t.name}</div>`
    + `<div class="tdesc">${t.desc}</div>`
    + cardVoet(status === 'ready' ? '<div class="ready-open">🎁 Open!</div>'
      : status === 'locked' ? '<div class="tstand sub">Nog niet vrij</div>'
      : trophyStand(t, p, status));
}
/* De perfecte werelden. Dit is de duurste kaart van de kast en dat mag je zien:
   het wereldicoon staat in een medaillon met de kleuren van díe wereld (theme.sky
   en theme.glow, dezelfde twee die de wereldkaart gebruikt), en behaald komt daar
   de gouden ring met de ster omheen.

   Precies dezelfde vorm als de onthulling na de laatste ster (zie .wf-trofee): een
   kind dat daar "Perfecte wereld!" kreeg, herkent hier hetzelfde ding terug. Zonder
   dat zouden het twee losse prijzen zijn die toevallig hetzelfde heten.

   Niet behaald is niet grijs: de wereldkleuren blijven staan, alleen gedempt. Een
   kleuter die de IJswereld nog moet perfectioneren ziet zo toch dat er een blauwe
   prijs op haar wacht -- dát is het lokkertje, en een grijze plaat is dat niet. */
function perfectCardHTML(t, p, status) {
  const w = t.wereld || {};
  const th = w.theme || {};
  const kleur = `--pw-sky:${th.sky || '#3a1f6e'};--pw-glow:${th.glow || '#7a2f63'}`;
  /* Geen 'Overal drie sterren' op het kaartje. Dat stond er zes keer onder elkaar,
     terwijl de kop van de plank het al zegt -- en zes keer dezelfde regel maakt van
     een prijzenkast een formulier. Wat een kaartje hier moet zeggen is welke wereld
     het is; wat je ervoor moet doen staat één regel hoger, voor alle zes tegelijk.

     Het getal ("5 / 8 perfect") komt er alleen bij als er iets te tellen valt --
     dezelfde regel als op elke andere kaart. Op een wereld waar nog geen ster staat
     zegt "0 / 8" niets wat het gedempte medaillon niet al zegt, en op een behaalde
     wereld zou het 8/8 zijn, wat de gouden ring al vertelt. */
  const stand = status === 'ready' ? '<div class="ready-open">🎁 Open!</div>'
    : status === 'busy' ? (() => { const pr = t.progress(p); return `<div class="tstand">${pr.now} / ${pr.target} <span>perfect</span></div>`; })()
    : '';
  return `<div class="pw-medal" style="${kleur}"><span class="pw-ico">${t.emoji}</span></div>`
    + `<div class="tname">${t.name}</div>`
    + cardVoet(stand);
}
// tikken mag: klaar opent de trofee; een behaalde glinstert; anders vertelt hij
// in één regel wat er nog moet gebeuren.
function tapTrophy(t, card, e) {
  if (e) tapRipple(e.clientX, e.clientY);   // tactiel: kringetje vanaf de vinger
  const p = P();
  const st = trophyStatus(p, t);
  if (st === 'ready') { openTrophy(t.id); return; }
  // een trofee die ergens anders verdiend wordt, wijst de weg erheen
  if (t.naar) { sndClick(); openKleedkamerCat(t.naar); return; }
  if (st === 'done') { sndTap(); sparkle(card); return; }
  if (st === 'locked') { sndClick(); showToast('🔒 Nog niet vrij!'); setTimeout(hideToast, 1500); return; }
  sndClick();
  if (!t.progress) { showToast(`${t.emoji} ${t.desc}`); setTimeout(hideToast, 1700); return; }
  const pr = t.progress(p), rem = Math.max(0, pr.target - pr.now);
  showToast(rem > 0 ? `${t.emoji} Nog ${rem} ${unitText(pr.label, rem)}!` : `${t.emoji} Bijna daar!`);
  setTimeout(hideToast, 1700);
}
// Het claim-moment: van 'klaar' naar 'behaald', met een kort, vrolijk feestje.
function openTrophy(id) {
  const p = P();
  const t = TROPHIES.find(x => x.id === id);
  if (!t || p.trophies.includes(id) || !(p.readyTrophies || []).includes(id)) return;
  p.readyTrophies = p.readyTrophies.filter(x => x !== id);
  p.trophies.push(id);
  save();
  celebrateTrophy(t);
  justClaimed = id;   // net-behaalde kaart krijgt eenmalig een gouden shimmer
  renderShelves();    // kaart wordt 'Behaald!', scrollpositie blijft
}
// Klein beloningsmoment: pop-up + confetti, blijft in beeld tot er ergens
// op het scherm getikt wordt (geen auto-sluit-timer meer) -- de overlay
// beslaat het hele scherm (position:fixed; inset:0), dus "ergens tikken"
// werkt overal, niet alleen op het kaartje zelf.
function celebrateTrophy(t) {
  const reduce = motionOff();
  sndClick();          // 'optil'-tik op het moment van openen
  buzz(20);
  const ov = openOverlay('trophy-pop-overlay',
    '<div class="pop-panel trophy-pop"><div class="tp-head">Nieuwe trofee!</div>'
    + '<div class="tp-stage">'
    +   '<div class="tp-rays" aria-hidden="true"></div>'
    +   '<div class="tp-ring" aria-hidden="true"></div>'
    +   '<div class="tp-chest" aria-hidden="true">🎁</div>'
    +   `<div class="tp-emoji">${t.emoji}</div>`
    + '</div>'
    + `<div class="tp-name">${t.name}</div>`
    + '<div class="tp-joepie">Joepie!</div></div>',
    // het sprankelen loopt door zolang de trofee open staat -- stoppen bij het sluiten
    { fade: 300, onClose: o => { if (o._spark) clearInterval(o._spark); } });
  const pop = ov.querySelector('.trophy-pop');
  // De uitbarsting: kist knalt open, emoji slaat in, confetti-kanon + feestgeluid.
  const burst = () => {
    if (!ov.isConnected || pop.classList.contains('burst')) return;
    pop.classList.add('burst');
    sndWin();
    buzz([0, 40, 60, 40, 90]);
    if (!reduce) {
      const center = () => { const r = pop.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.42]; };
      const [cx, cy] = center();
      confettiBurst(cx, cy, 30, t.emoji);
      // blijf sprankelen zolang de trofee 'open' blijft (tot je sluit)
      ov._spark = setInterval(() => {
        if (!ov.isConnected) { clearInterval(ov._spark); return; }
        const [x, y] = center();
        confettiBurst(x, y, 5);
      }, 1100);
    }
    speak('Joepie! Je hebt de trofee ' + t.name + '!');
  };
  if (reduce) burst();
  else setTimeout(burst, 480);   // eerst even spanning: de kist schudt
  // Ongeduldig? Eerste tik opent meteen; daarna sluit een tik het feestje.
  ov.onclick = () => { if (!pop.classList.contains('burst')) burst(); else ov._close(); };
}
// Ster-status omhoog: het nieuwe rang-icoon knalt naar voren met een uitbarsting
// van datzelfde icoon eromheen. Tik of ~2,2s = weg. Aangeroepen vanaf endLevel.
// na (optioneel): wat er hierna nog aan de beurt is -- precies één keer, of je nu
// zelf tikt of de timer hem sluit (zie endLevel).
function rankUpCelebrate(rank, na) {
  sndWin();
  buzz([0, 50, 80, 50, 100]);
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let sparks = '';
  if (!reduce) {
    const N = 16;
    for (let i = 0; i < N; i++) {
      const ang = (360 / N) * i + rnd(-8, 8);
      const dist = rnd(95, 170);
      const dx = Math.round(Math.cos(ang * Math.PI / 180) * dist);
      const dy = Math.round(Math.sin(ang * Math.PI / 180) * dist);
      sparks += `<span class="rankup-spark" style="--dx:${dx}px;--dy:${dy}px;animation-delay:${rnd(0, 12) / 100}s">${rank.emoji}</span>`;
    }
  }
  const ov = openOverlay('rankup-overlay', `<div class="rankup-core"><div class="rankup-sparks">${sparks}</div>`
    + `<div class="rankup-badge">${rank.emoji}</div>`
    + `<div class="rankup-label">Nieuwe ster-status!</div>`
    + `<div class="rankup-name">${rank.name}</div></div>`, { fade: 300 });
  // De opvolger hangt aan het sluiten zelf en niet aan de timer: tikt een kind de
  // rang weg, dan komt het volgende feestje meteen en niet pas als die timer toch
  // nog afloopt (en dan twee keer).
  let af = false;
  const dicht = () => {
    if (af) return;
    af = true;
    ov._close();
    if (na) setTimeout(na, 320);   // de ene laag is weggefaded voor de volgende komt
  };
  ov.onclick = dicht;
  setTimeout(dicht, 2200);
}
/* ================= Wereldfeest (fase 4D.1) =================================
   Eén laag voor twee mijlpalen, en met opzet één en niet twee: de laatste show van
   een wereld kan tegelijk de show zijn die hem perfect maakt, en dan zijn twee
   schermen achter elkaar geen twee keer zo feestelijk maar twee keer zo lang.

   Wat er staat is wat er gebeurd is, in die volgorde:
     wereld uit   -> het spulletje dat je nu hebt
     perfect      -> de trofee die je nu hebt
   Allebei mogen alleen staan. Er staat nooit iets dat nog moet gebeuren, en er is
   niets te kiezen: tikken sluit, en dan ben je terug op het eindscherm waar
   "Verder op tournee" staat. Geen eigen navigatie dus -- de weg vooruit is de weg
   die er al was.

   Bewust klein gehouden: één pop, één uitbarsting confetti, en klaar. De
   trofee-ceremonie van de kast (een kist die schudt en openknalt) is er voor het
   moment dat een kind zélf een cadeautje opent; dit is een moment dat overkomt en
   dat hoort korter te zijn. */
function wereldFeest(f) {
  if (!f || (!f.spul && !f.perfect)) return;
  const reduce = motionOff();
  const w = f.wereld;
  // De kop zegt het grootste dat er gebeurd is. "Wereld uit!" wint van "Perfecte
  // wereld!" als ze samenvallen -- dan staat perfect eronder als de bonusregel.
  const kop = f.spul ? 'Wereld uit!' : 'Perfecte wereld!';
  let rijen = '';
  if (f.spul) {
    /* "Nieuwe wereldschat!" en niet "Nieuw!" (fase 6E). Het woord dat hier valt is
       hetzelfde woord als op het vak in de kleedkamer, en dat is het hele punt:
       dit is het moment waarop een kind leert wat een wereldschat ís, en over vijf
       minuten moet ze het ding kunnen terugvinden onder diezelfde naam. */
    rijen += `<div class="wf-rij"><div class="wf-beeld">${itemThumb(f.spul)}</div>`
      + `<div class="wf-tekst"><b>Nieuwe wereldschat!</b><span>${esc(f.spul.full || f.spul.name)}</span></div></div>`;
  }
  if (f.perfect) {
    /* Het wereldicoon in een gouden ring met een ster erop -- precies het kaartje
       dat er vanaf nu in de kast staat (zie .trophy-card.ster). Bewust niet het
       kale icoon: dat is in de Muziekwereld toevallig hetzelfde plaatje als het
       spulletje erboven, en dan lijken de twee regels één regel die dubbel staat.

       Elke regel zegt wát je gekregen hebt, en de kop zegt waaróm. Staat de trofee
       er alleen, dan zégt die kop al "Perfecte wereld!" -- dan hoort de regel
       eronder niet nog eens hetzelfde te zeggen. */
    const label = f.spul ? 'Perfecte wereld!' : 'Nieuwe trofee!';
    // dezelfde wereldkleuren als het medaillon in de kast (.pw-medal), zodat het
    // ding dat hier onthuld wordt hetzelfde ding is als wat er straks in de kast staat
    const th = w.theme || {};
    const kleur = `--pw-sky:${th.sky || '#3a1f6e'};--pw-glow:${th.glow || '#7a2f63'}`;
    rijen += `<div class="wf-rij"><div class="wf-beeld"><span class="wf-trofee" style="${kleur}">${w.icon || '🌍'}</span></div>`
      + `<div class="wf-tekst"><b>${label}</b><span>Overal drie sterren</span></div></div>`;
  }
  /* Eén knop, en alleen als er echt iets nieuws te dragen is: aandoen. Het ding
     staat op het scherm, het is van haar, en de enige gedachte die een kind op dat
     moment heeft is "die wil ik op". Zonder deze knop is het antwoord daarop: dit
     wegtikken, het eindscherm lezen, de tweede knop vinden, de kleedkamer in. */
  // "Doe aan" en niet "Aandoen": dat is woord voor woord de knop in de kleedkamer
  // (zie renderDressBar). Eén zin voor één handeling, waar hij ook staat.
  const aanKnop = f.spul ? `<button class="btn wf-aan" type="button">Doe aan</button>` : '';
  const ov = openOverlay('wereld-feest-overlay',
    `<div class="pop-panel wereld-feest">`
    + `<div class="wf-kop">${kop}</div>`
    + `<div class="wf-wereld">${w.icon || '🌍'} ${esc(w.name)}</div>`
    + `<div class="wf-rijen">${rijen}</div>`
    + aanKnop
    + `<div class="wf-verder">Tik om verder te gaan</div></div>`, { fade: 300 });
  let af = false;
  const dicht = () => { if (af) return; af = true; ov._close(); };
  ov.onclick = dicht;
  /* Hij sluit zichzelf, net als de ster-status en anders dan de trofeeënkast. Dat
     verschil is precies het verschil tussen de twee momenten: een cadeautje in de
     kast open je zélf en blijft dus open tot jij zegt dat je klaar bent, maar dit
     overkomt je ná de show -- en dan mag het je niet vasthouden. Eronder staat
     "Verder op tournee", en daar wilde het kind toch al heen.

     Staat de Aandoen-knop er, dan krijgt hij ruimer de tijd: een knop die onder
     je vinger vandaan verdwijnt is erger dan geen knop, en een zesjarige moet de
     regel eerst nog lezen. Zes tellen is lang genoeg om te kijken, te begrijpen
     en te tikken -- en kort genoeg om geen scherm te zijn dat wacht. Wie eerder
     klaar is tikt ernaast en is weg; wie de knop mist vindt hem terug op het
     eindscherm eronder ("👕 Pas je ..."), dus er gaat niets verloren. */
  setTimeout(dicht, f.spul ? 6000 : 3100);
  const aan = ov.querySelector('.wf-aan');
  if (aan) aan.onclick = (e) => {
    e.stopPropagation();   // anders sluit de tik óók de laag via ov.onclick hierboven
    sndClick();
    const q = P();
    q.equipped[f.spul.cat] = f.spul.id;
    noticeReady(checkTrophies(q));   // een outfit-combo kan een geheime trofee zijn
    save();
    const pop = $('end-avatar');
    if (pop) { pop.innerHTML = avatarSVG(q, 150); dance('end-avatar'); }
    dicht();
  };
  sndWin();
  buzz([0, 40, 60, 40, 90]);
  if (!reduce) {
    const panel = ov.querySelector('.wereld-feest');
    const r = panel.getBoundingClientRect();
    confettiBurst(r.left + r.width / 2, r.top + r.height * 0.42, 26, f.spul ? f.spul.emoji : (w.icon || '⭐'));
  }
  // lees-vrij: dezelfde twee zinnen die er staan, meer niet
  speak(f.spul
    ? `${w.name} uit! Een nieuwe wereldschat: een ${f.spul.name}.` + (f.perfect ? ' En een perfecte wereld!' : '')
    : `Perfecte wereld! ${w.name}.`);
}
// tijdens het spelen: geen groot feest, wél een vriendelijke hint naar de kast
function noticeReady(trofees) {
  if (!trofees || !trofees.length) return;
  updateTroDot();
  showToast(`🎁 ${trofees.length === 1 ? 'Nieuwe trofee' : trofees.length + ' nieuwe trofeeën'} klaar in je kast!`);
  setTimeout(hideToast, 1900);
}
// rood stipje op het Trofeeën-tabblad zolang er trofeeën klaarliggen om te openen
// De memory-knop belooft nu wat hij oplevert (2 per paar + 3 als de hele set uit
// is). Stond er niet op: een gouden knop zonder aangekondigde beloning.
function memPayout(p) { return buildMemoryDeck(p).pairs * MEM_PAIR_GAIN + MEM_DONE_BONUS; }
function updateTroDot() {
  if (!cur) return;
  const p = P();
  $('nav-tro').classList.toggle('has-new', (p.readyTrophies || []).length > 0);
}

/* ================= Vragen maken =================
   Een vraag is een sjabloon (`tmpl`) met één blanco plek `@` waar het gezochte
   getal hoort, plus dat getal (`ans`), de bewerking (`op`) en de soort (`kind`):
     - classic:  "3 + 4 = @"   -> ans 7   (het antwoord staat rechts, zoals altijd)
     - missing:  "3 + @ = 7"   -> ans 4   (tweede getal ontbreekt)
     - chain:    "3 + 4 + 2 = @" -> ans 9 (drie getallen, alleen optellen)
   Omdat het gezochte getal altijd één getal is, blijven meerkeuze, typen, hints,
   zwakke-sommen en álle beloningen ongewijzigd werken. */

// Bouwt één geldige, niet-negatieve, exacte drieling voor een bewerking.
// Alles komt uit de bestaande moeilijkheidslogica (level + vaardigheid).
function genTriple(s, lvl, perf, op) {
  // Moeilijkheid = basis per level + bijsturing op vaardigheid (perf 0..1 → ±0.25).
  // Zo krijgt een kind dat worstelt lichtere sommen en een sterk kind wat pittigere.
  const skillAdj = ((perf == null ? 0.5 : perf) - 0.5) * 0.5;
  const t = Math.max(0.2, Math.min(1, 0.35 + lvl * 0.07 + skillAdj));
  const effMax = Math.max(10, Math.round(s.max * t)); // binnen ingestelde grens
  const tables = s.tables.length ? s.tables : [2, 5, 10];
  let a, b, c, sym;
  if (op === '+') {
    a = rnd(1, effMax - 1);
    b = rnd(1, effMax - a);
    c = a + b; sym = '+';
  } else if (op === '-') {
    a = rnd(2, effMax);
    b = rnd(1, a - 1);
    c = a - b; sym = '−';
  } else if (op === 'x') {
    b = pick(tables);
    const maxA = Math.max(1, Math.min(10, Math.floor(s.max / b)));
    a = rnd(1, Math.max(1, Math.round(maxA * t)));
    c = a * b; sym = '×';
  } else { // ':'
    b = pick(tables);
    const maxQ = Math.max(1, Math.min(10, Math.floor(s.max / b)));
    const q = rnd(1, Math.max(1, Math.round(maxQ * t)));
    a = q * b; c = q; sym = ':';
  }
  return { a, b, c, sym, op, t, effMax };
}
// Klassieke som: het antwoord staat rechts (zoals de app altijd deed).
function genQuestion(s, lvl, perf) {
  const ops = s.ops.length ? s.ops : ['+'];
  const op = pick(ops);
  const { a, b, c, sym } = genTriple(s, lvl, perf, op);
  return { tmpl: `${a} ${sym} ${b} = @`, ans: c, op, kind: 'classic' };
}
// Zoek-het-getal: het tweede getal ontbreekt ("3 + ? = 7"). Alleen + − × (delen
// blijft voorlopig buiten beeld). 0/1 als antwoord mag, maar niet te vaak.
function genMissing(s, lvl, perf, op) {
  let tr, tries = 0;
  do { tr = genTriple(s, lvl, perf, op); tries++; }
  while (tries < 4 && (tr.b === 0 || tr.b === 1) && Math.random() < 0.7);
  const { a, b, c, sym } = tr;
  return { tmpl: `${a} ${sym} @ = ${c}`, ans: b, op, kind: 'missing' };
}
// Drie getallen, alleen optellen ("3 + 4 + 2 = ?"). De som blijft binnen de
// ingestelde bovengrens; elke term is bescheiden (≈ hooguit de helft), zodat het
// hoofdrekenen behapbaar blijft. 0-termen mogen, maar niet te vaak.
function genChain(s, lvl, perf) {
  const skillAdj = ((perf == null ? 0.5 : perf) - 0.5) * 0.5;
  const t = Math.max(0.2, Math.min(1, 0.35 + lvl * 0.07 + skillAdj));
  const effMax = Math.max(10, Math.round(s.max * t));
  const cap = Math.max(1, Math.floor(effMax / 2));
  let a, b, c, sum, tries = 0;
  do {
    a = rnd(1, cap); b = rnd(1, cap); c = rnd(1, cap);
    sum = a + b + c; tries++;
  } while (tries < 8 && (sum > effMax || sum < 3 || ((a === 0 || b === 0 || c === 0) && Math.random() < 0.7)));
  if (sum > effMax) { a = 1; b = 1; c = Math.max(1, effMax - 2); sum = a + b + c; }
  return { tmpl: `${a} + ${b} + ${c} = @`, ans: sum, op: '+', kind: 'chain' };
}
function makeChoices(ans) {
  const set = new Set([ans]);
  const cand = shuffle([ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10]);
  for (const c of cand) {
    if (set.size >= 4) break;
    if (c >= 0 && !set.has(c)) set.add(c);
  }
  while (set.size < 4) set.add(rnd(0, ans + 12));
  return shuffle([...set]);
}

/* ================= Telmodus: lees-vrije vragen (fase 1–6) =================
   Voor kleuters die nog geen cijfers of woorden lezen. Elke vraag is visueel
   volledig (hoeveelheden als objecten/stippen) én wordt hardop voorgelezen.
   Het antwoord is altijd een getal (de hoeveelheid), zodat submitAnswer exact
   hetzelfde werkt als bij de rekenshow -- en dus alle beloningen, diamanten,
   sterren en trofeeën ongewijzigd blijven meetellen.

   Fases:  1 hoeveelheid 1–3 · 2 hoeveelheid 1–5 (+ meetellen) · 3 meer/minder ·
           4 evenveel · 5 gesproken getal → hoeveelheid · 6 cijfer bij hoeveelheid */
const COUNT_OBJECTS = ['⭐', '❤️', '🎈', '🍎', '🌸', '🐢', '🐱', '🦋', '🍓', '🐟', '🌼', '🐞'];
/* ---- Fasetabel (8 fases) ----
   Per fase: welke oefeningtypes, het hoeveelheidsbereik (baseMax bij de laagste
   rung → topMax bij de hoogste), het aantal rungs (moeilijkheidstrappen bínnen de
   fase) en het aantal keuzeknoppen. */
function countStageInfo(stage) {
  switch (stage) {
    case 1: return { types: ['count'],              baseMax: 3, topMax: 3,  rungs: 2, tiles: 3 };
    case 2: return { types: ['count', 'along'],     baseMax: 5, topMax: 6,  rungs: 3, tiles: 4 };
    case 3: return { types: ['compare'],            baseMax: 5, topMax: 8,  rungs: 3, tiles: 3 };
    case 4: return { types: ['match'],              baseMax: 5, topMax: 8,  rungs: 3, tiles: 4 };
    // fase 5 is de luisterfase; zonder geluid valt hij terug op 'match' (zelfde
    // bereik, zelfde soort keuze, maar de opgave staat wél in beeld) -- zie
    // countStageTypes hieronder
    case 5: return { types: ['listen'],             baseMax: 5, topMax: 8,  rungs: 3, tiles: 4 };
    case 6: return { types: ['numeral', 'numquant'], baseMax: 5, topMax: 10, rungs: 3, tiles: 4 };
    case 7: return { types: ['onemore', 'oneless'], baseMax: 3, topMax: 9,  rungs: 3, tiles: 4 };
    case 8: return { types: ['combine', 'split'],   baseMax: 5, topMax: 10, rungs: 3, tiles: 4 };
    // gesteunde sommen: tekens (visueel) → cijfers+stippen → geschreven (steun vervaagt)
    case 9:  return { types: ['sumsym'],     baseMax: 5, topMax: 8,  rungs: 3, tiles: 4 };
    case 10: return { types: ['sumdots'],    baseMax: 5, topMax: 10, rungs: 3, tiles: 4 };
    case 11: return { types: ['sumwritten'], baseMax: 5, topMax: 10, rungs: 3, tiles: 4 };
    default: return { types: ['count'], baseMax: 3, topMax: 3, rungs: 2, tiles: 3 };
  }
}
function countTopRung(stage) { return countStageInfo(stage).rungs - 1; }
// Kan de app nú praten? (geluid aan én een browser die spraak ondersteunt)
function canSpeak() { return !!db.sound && hasSpeech(); }
// De vraagsoorten die op dit moment écht speelbaar zijn. Een luistervraag toont
// alleen een oor: zonder stem is er niets om op af te gaan. Dan liever een
// zichtbare opgave uit dezelfde fase-familie dan een gokvraag.
function countStageTypes(stage) {
  const types = countStageInfo(stage).types;
  if (canSpeak()) return types;
  const speelbaar = types.filter(t => t !== 'listen');
  return speelbaar.length ? speelbaar : ['match'];
}
// Hoogste toegestane fase: zonder cijfers stopt het bij fase 5 (fases 6–8 gebruiken cijfers/redeneren).
function countMaxStage(s) { return s.numerals ? Math.min(COUNT_STAGE_MAX, s.stageMax || COUNT_STAGE_MAX) : Math.min(5, s.stageMax || COUNT_STAGE_MAX); }
// De fase die het kind nú speelt: de live-stand uit countTrack, geklemd binnen het
// door de ouder toegestane bereik [stage .. stageMax].
function countLiveStage(p) {
  const s = p.settings;
  const hi = countMaxStage(s);
  const lo = Math.min(Math.max(1, s.stage || 1), hi);
  const st = (p.countTrack && p.countTrack.stage) || lo;
  return Math.min(hi, Math.max(lo, st));
}
// Moeilijkheid bínnen de fase, op basis van de rung + de ouder-bovengrens (qmax).
// Hogere rung = groter bereik, afleiders dichterbij, minder cijfersteun, tienraam.
function countDifficulty(p, stage) {
  const s = p.settings;
  const info = countStageInfo(stage);
  const top = info.rungs - 1;
  const rung = Math.min(top, Math.max(0, (p.countTrack && p.countTrack.rung) || 0));
  const frac = top ? rung / top : 0;
  const cap = Math.min(s.qmax || 10, 10);
  const effMax = Math.max(info.baseMax, Math.min(cap, Math.round(info.baseMax + (info.topMax - info.baseMax) * frac)));
  const delta = rung >= top ? 1 : (rung >= 1 ? 2 : 3);           // afleider-nabijheid (±)
  const support = rung === 0 ? 'full' : (rung === 1 ? 'faint' : 'none'); // cijfersteun (stippen vervagen)
  const structured = effMax > 5;                                  // >5 → tienraam (subitiseren zonder tellen)
  return { rung, top, effMax, delta, support, tiles: info.tiles, structured };
}
// Afleiders dicht bij het antwoord (binnen ±delta eerst), aangevuld binnen [lo..hi].
function countDistractors(ans, count, lo, hi, delta) {
  const set = new Set([ans]);
  const offs = [];
  for (let d = 1; d <= Math.max(delta, 4); d++) offs.push(-d, d);
  const cand = shuffle(offs).map(o => ans + o).filter(v => v >= lo && v <= hi);
  const near = cand.filter(v => Math.abs(v - ans) <= delta);
  const far = cand.filter(v => Math.abs(v - ans) > delta);
  for (const v of [...near, ...far]) { if (set.size >= count) break; set.add(v); }
  let g = lo;
  while (set.size < count && g <= hi) { set.add(g); g++; }
  return shuffle([...set]);
}
function dotOrObj(repr, emoji) { return repr === 'dots' ? '<span class="cg-dot"></span>' : `<span class="cg-obj">${emoji}</span>`; }
// Gestructureerd stippenraam: vijfraam (cap 5) of tienraam (cap 10). Vaste plekken,
// vaste volgorde (bovenrij eerst, links→rechts); lege vakjes blijven zichtbaar, zodat
// een hoeveelheid aan haar vórm herkenbaar is i.p.v. elke stip te hertellen. Zo zie
// je "5 en nog wat" en "hoeveel nog tot 10" meteen. support: 'full' gevuld · 'faint'
// gedimd · 'none' niets.
function dotFrameHTML(n, cap, extraCls, support, crossFrom) {
  support = support || 'full';
  if (support === 'none') return '';
  cap = cap === 5 ? 5 : 10;
  // Als n groter is dan het raam (bijv. 11 in een tienraam), groeit het raam
  // naar het volgende vijftal (max 20) zodat 11 zichtbaar verschilt van 10.
  const total = n > cap ? Math.min(20, Math.ceil(n / 5) * 5) : cap;
  let cells = '';
  for (let i = 0; i < total; i++) {
    const on = i < n;
    // crossFrom (optioneel): de gevulde stippen vanaf die index worden doorgestreept
    // -- gebruikt bij aftrekken ("wegstrepen") zodat de startgroep zichtbaar blijft.
    const xed = crossFrom != null && on && i >= crossFrom;
    cells += `<span class="df-cell${on ? ' on' : ''}">${on ? `<span class="df-dot${xed ? ' xed' : ''}"></span>` : ''}</span>`;
  }
  return `<span class="dframe ${cap === 5 ? 'five' : 'ten'}${extraCls ? ' ' + extraCls : ''}${support === 'faint' ? ' faint' : ''}" aria-hidden="true">${cells}</span>`;
}
// Aftrek-visualisatie (wegstrepen): één groep van 'a', waarvan de laatste 'b' zijn
// doorgestreept -- zo klopt "5 - 3" ook in beeld (5 dingen, 3 weg -> 2 over), i.p.v.
// twee losse groepjes met een minteken ertussen.
function takeAwayHTML(a, b, emoji, repr, cap) {
  const c = a - b;
  if (repr === 'dots') return dotFrameHTML(a, cap || (a <= 5 ? 5 : 10), 'big', 'full', c);
  let inner = '';
  for (let i = 0; i < a; i++) inner += `<span class="cg-obj${i >= c ? ' xed' : ''}">${emoji}</span>`;
  return `<span class="cgroup n${a} big" aria-hidden="true">${inner}</span>`;
}
// HTML voor een hoeveelheid. Stippen → altijd een gestructureerd raam (dotFrameHTML).
// Voorwerpen (emoji) → speels los groepje (≤5) of een tienraam (frame, 6–10).
function groupHTML(n, emoji, repr, extraCls, frame, cap) {
  if (repr === 'dots') {
    const ex = (extraCls || '');
    const sup = ex.includes('faint') ? 'faint' : 'full';
    return dotFrameHTML(n, cap || (n <= 5 ? 5 : 10), ex.replace('faint', '').trim(), sup);
  }
  if (frame) return frameHTML(n, emoji, repr, extraCls);
  const cls = 'cgroup n' + n + (extraCls ? ' ' + extraCls : '');
  let inner = '';
  for (let i = 0; i < n; i++) inner += `<span class="cg-obj">${emoji}</span>`;
  return `<span class="${cls}" aria-hidden="true">${inner}</span>`;
}
// Tienraam: 2 rijen van 5, de eerste n vakjes gevuld — hoeveelheden 6–10 in één oogopslag.
// Het aantal vakjes stond hard op 10, dus een hoeveelheid daarboven werd stil
// afgekapt: n=11 tekende er 10, zonder dat iets dat merkte. Nu groeit het raam per
// rij van vijf mee (net als dotFrameHTML), zodat de tekening altijd het getal
// vertelt dat erbij hoort -- ook als er ooit weer iets buiten bereik binnenkomt.
function frameHTML(n, emoji, repr, extraCls) {
  const total = Math.max(10, Math.min(20, Math.ceil(n / 5) * 5));
  let cells = '';
  for (let i = 0; i < total; i++) cells += `<span class="tf-cell${i < n ? ' on' : ''}">${i < n ? dotOrObj(repr, emoji) : ''}</span>`;
  return `<span class="cframe ${extraCls || ''}" aria-hidden="true">${cells}</span>`;
}
// Splitsen: rij van 'total' vakjes, 'shown' zichtbaar, de rest achter een gordijn (❓).
function splitHTML(total, shown, emoji, repr) {
  let cells = '';
  for (let i = 0; i < total; i++) {
    cells += i < shown
      ? `<span class="tf-cell on">${dotOrObj(repr, emoji)}</span>`
      : `<span class="tf-cell hidden">❓</span>`;
  }
  return `<span class="cframe split" aria-hidden="true">${cells}</span>`;
}
// Som-vergelijking voor fases 9–11. style:
//  'sym'     = visuele groepjes met tekens (＋/➖/＝); aftrekken = wegstrepen
//  'dots'    = cijfers met stippen eronder (altijd)
//  'written' = cijfers met stippen die per rung vervagen (full→faint→none)
function sumEqHTML(card) {
  const { style, op, a, b, c, emoji, repr, support, cap } = card;
  // schone wiskundetekens (geen emoji): '➖' toonde als een zwart blokje
  const opSym = op === '-' ? '−' : '+';
  const eq = inner => `<div class="sum-eq">${inner}<span class="sum-op">=</span><span class="sum-eq-q">?</span></div>`;
  if (style === 'sym') {
    if (op === '-') {
      // wegstrepen: één startgroep van 'a', de laatste 'b' doorgestreept -> 'c' blijft
      // over. (Vroeger stonden hier de c-overblijvers náást de b-weggehaalde met een
      // minteken ertussen, wat als "c − b" las en de startgroep 'a' verborg.)
      return eq(takeAwayHTML(a, b, emoji, repr, cap));
    }
    return eq(`${groupHTML(a, emoji, repr, 'big', false, cap)}<span class="sum-op">+</span>${groupHTML(b, emoji, repr, 'big', false, cap)}`);
  }
  // cijfer-stijlen (dots / written): elk getal = cijfer met (vervagende) stippen eronder
  const sup = style === 'dots' ? 'full' : (support || 'full');
  const operand = n => {
    const dots = sup === 'none' ? '' : groupHTML(n, '•', 'dots', 'mini' + (sup === 'faint' ? ' faint' : ''), false, cap);
    return `<span class="sum-operand"><span class="sum-num">${n}</span>${dots}</span>`;
  };
  return eq(`${operand(a)}<span class="sum-op">${opSym}</span>${operand(b)}`);
}
// Bouwt één telmodus-vraag. Alle types leveren een genormaliseerd object met
// numeriek antwoord (q.ans) en keuzeknoppen (q.choices), plus de voor te lezen tekst.
function genCount(p) {
  const s = p.settings;
  const stage = countLiveStage(p);
  const info = countStageInfo(stage);
  const d = countDifficulty(p, stage);
  const type = pick(countStageTypes(stage));
  const frame = d.structured;
  const max = d.effMax;
  // 'mix' → per vraag willekeurig voorwerpen óf stippen (hele groep gelijk, zodat het
  // raam heel blijft). Zo leert Clara dat "5 sterren" en "5 stippen" hetzelfde getal zijn.
  const baseRepr = s.repr || 'objects';
  const repr = baseRepr === 'mix' ? (Math.random() < 0.5 ? 'dots' : 'objects') : baseRepr;
  const emoji = pick(COUNT_OBJECTS);   // één voorwerp per vraag (varieert tussen vragen)
  // Raamgrootte per vraag vast (vijfraam ≤5, anders tienraam), zodat álle
  // hoeveelheden in één vraag hetzelfde raam gebruiken (consistent, subitiseerbaar).
  const cap = max <= 5 ? 5 : 10;
  const nCh = Math.min(d.tiles, Math.max(2, max));
  const q = { kind: 'count', count: true, ctype: type, stage, emoji, repr, frame, cap, support: d.support, gold: false };
  const qgroup = v => ({ v, kind: 'group', n: v, emoji, repr, frame, cap });

  if (type === 'count' || type === 'along') {
    const n = rnd(1, max);
    q.ans = n; q.along = (type === 'along');
    q.card = { kind: 'group', n, emoji, frame, repr };
    q.choices = countDistractors(n, nCh, 1, max, d.delta).map(qgroup);
    q.prompt = q.along ? 'Tel mee! Hoeveel zie je?' : 'Hoeveel zie je?';
  } else if (type === 'compare') {
    const wantMore = Math.random() < 0.5;
    const k = d.rung >= 1 ? 3 : 2;                 // hogere rung → 3 groepen (minder gok-kans)
    let vals;
    if (k === 2) {
      const gap = d.rung >= d.top ? 1 : rnd(2, Math.min(4, max - 1));
      const a = rnd(1, max - gap); vals = [a, a + gap];
    } else {
      const set = new Set(); while (set.size < 3) set.add(rnd(1, max)); vals = [...set];
    }
    q.ans = wantMore ? Math.max(...vals) : Math.min(...vals);
    q.compare = wantMore ? 'more' : 'less';
    q.card = { kind: 'label', text: wantMore ? '⬆️ de meeste' : '⬇️ de minste' };
    q.choices = shuffle(vals.map(qgroup));
    q.prompt = wantMore ? 'Tik op de groep met de meeste.' : 'Tik op de groep met de minste.';
  } else if (type === 'match') {
    const t = rnd(1, max);
    // hogere rung: verschillende weergave links (kaart) en rechts (knoppen) — evenveel, andere vorm
    const cross = d.rung >= 1;
    const tileRepr = cross ? (repr === 'dots' ? 'objects' : 'dots') : repr;
    q.ans = t;
    q.card = { kind: 'group', n: t, emoji, frame, repr };
    q.choices = countDistractors(t, nCh, 1, max, d.delta).map(v => ({ v, kind: 'group', n: v, emoji, repr: tileRepr, frame }));
    q.prompt = 'Welke groep heeft er evenveel?';
  } else if (type === 'listen') {
    const n = rnd(1, max);
    q.ans = n; q.card = { kind: 'listen' };
    q.choices = countDistractors(n, nCh, 1, max, d.delta).map(qgroup);
    q.prompt = 'Tik op ' + numWord(n) + '.';
  } else if (type === 'numeral') {                 // hoeveelheid → cijfer (stippen vervagen per rung)
    const n = rnd(1, max);
    q.ans = n; q.card = { kind: 'group', n, emoji, frame, repr };
    q.choices = countDistractors(n, nCh, 1, max, d.delta).map(v => ({ v, kind: 'numeral', n: v, support: d.support }));
    q.prompt = 'Welk cijfer hoort erbij?';
  } else if (type === 'numquant') {                // cijfer → hoeveelheid (omgekeerd)
    const n = rnd(1, max);
    q.ans = n; q.card = { kind: 'bignum', n };
    q.choices = countDistractors(n, nCh, 1, max, d.delta).map(qgroup);
    q.prompt = 'Welke groep hoort bij dit cijfer?';
  } else if (type === 'onemore' || type === 'oneless') {
    const dir = type === 'onemore' ? 1 : -1;
    const base = dir > 0 ? rnd(1, max - 1) : rnd(2, max);
    q.ans = base + dir;
    q.card = { kind: 'delta', base, dir, emoji, frame, repr };
    q.choices = countDistractors(q.ans, nCh, 1, max, d.delta).map(qgroup);
    q.prompt = dir > 0 ? 'Er komt er één bij. Hoeveel zijn het er nu?' : 'Er gaat er één weg. Hoeveel zijn het er nu?';
  } else if (type === 'combine') {                 // twee groepjes samen
    const a = rnd(1, Math.max(1, max - 1));
    const b = rnd(1, Math.max(1, max - a));
    q.ans = a + b;
    q.card = { kind: 'combine', a, b, emoji, frame, repr };
    q.choices = countDistractors(q.ans, nCh, 1, max, d.delta).map(qgroup);
    q.prompt = 'Hoeveel zijn het er samen?';
  } else if (type === 'sumsym') {                   // visuele som met tekens (＋ ➖ ＝), antwoord = groep
    const sub = Math.random() < 0.4;
    let a, b;
    if (!sub) { a = rnd(1, Math.min(5, Math.max(1, max - 1))); b = rnd(1, Math.min(5, max - a)); }   // groepjes klein & subitiseerbaar
    else { a = rnd(2, Math.min(6, max)); b = rnd(1, a - 1); }
    const c = sub ? a - b : a + b;
    q.ans = c;
    q.card = { kind: 'sum', style: 'sym', op: sub ? '-' : '+', a, b, c, emoji, repr };
    q.choices = countDistractors(c, nCh, 1, max, d.delta).map(qgroup);
    q.prompt = sub ? numWord(a) + ' min ' + numWord(b) + '. Hoeveel blijven er over?'
                   : numWord(a) + ' plus ' + numWord(b) + '. Hoeveel is dat samen?';
  } else if (type === 'sumdots' || type === 'sumwritten') {   // som met cijfers; stippen altijd (dots) of vervagend (written)
    const sub = Math.random() < 0.4;
    let a, b;
    if (!sub) { a = rnd(1, max - 1); b = rnd(1, max - a); }
    else { a = rnd(2, max); b = rnd(1, a - 1); }
    const c = sub ? a - b : a + b;
    const style = type === 'sumdots' ? 'dots' : 'written';
    const support = style === 'dots' ? 'full' : d.support;   // cijfers-met-stippen houdt de stippen; geschreven laat ze vervagen
    q.ans = c;
    q.card = { kind: 'sum', style, op: sub ? '-' : '+', a, b, c, emoji, repr, support };
    q.choices = countDistractors(c, nCh, 1, max, d.delta).map(v => ({ v, kind: 'numeral', n: v, support }));
    q.prompt = (sub ? numWord(a) + ' min ' + numWord(b) : numWord(a) + ' plus ' + numWord(b)) + '. Hoeveel is dat?';
  } else {                                          // split: hoeveel zitten er verstopt
    const total = rnd(3, max);
    const shown = rnd(1, total - 1);
    q.ans = total - shown;
    q.card = { kind: 'split', total, shown, emoji, repr };
    // bovengrens = max, net als bij élke andere vraagsoort hierboven. Stond hier
    // op Math.max(q.ans + 2, max): omdat q.ans tot max-1 kan lopen, kon dat een
    // afleider van max+1 opleveren -- dus 11 terwijl het raam op 10 staat. De knop
    // toonde dan 10 dingen met "11" als waarde. Er is ruimte zat zonder die marge:
    // fase 8 heeft max >= 5, dus minstens 5 kandidaten voor hoogstens 4 knoppen.
    q.choices = countDistractors(q.ans, nCh, 1, max, d.delta).map(qgroup);
    q.prompt = 'Hoeveel zitten er verstopt achter het gordijn?';
  }
  // raamgrootte overal beschikbaar maken (kaart + alle keuzeknoppen)
  if (q.card) q.card.cap = cap;
  if (q.choices) q.choices.forEach(c => { if (c.cap == null) c.cap = cap; });
  return q;
}
// Elke getekende telvraag krijgt een eigen volgnummer. Vertraagde acties (meetellen,
// één-erbij/eraf) checken dit: hoort de timer bij een oudere vraag, dan stopt hij.
// Zonder dit telde de stem van de vórige vraag door over de nieuwe ("vier, vijf...")
// als het kind snel antwoordde.
let countDrawId = 0;
// De vraagkaart bovenin: toont de hoeveelheid/opdracht en spreekt haar uit.
function drawCountQuestion(q) {
  const myDraw = ++countDrawId;
  const card = $('question-text');
  const cardRepr = q.card.repr || 'objects';
  const kind = q.card.kind;
  let body = '';
  const cap = q.card.cap;
  if (kind === 'group') body = `<div class="cq-groupwrap">${groupHTML(q.card.n, q.card.emoji, cardRepr, 'big', q.card.frame, cap)}</div>`;
  else if (kind === 'label') body = `<div class="cq-label">${q.card.text}</div>`;
  else if (kind === 'listen') body = `<div class="cq-listen">👂</div>`;
  else if (kind === 'bignum') body = `<div class="cq-bignum">${q.card.n}</div>`;
  else if (kind === 'delta') body = `<div class="cq-groupwrap">${groupHTML(q.card.base, q.card.emoji, cardRepr, 'big', q.card.frame, cap)}<span class="cq-delta ${q.card.dir > 0 ? 'add' : 'rem'}">${q.card.dir > 0 ? '＋1' : '－1'}</span></div>`;
  else if (kind === 'combine') body = `<div class="cq-combine">${groupHTML(q.card.a, q.card.emoji, cardRepr, 'big', q.card.frame, cap)}<span class="cq-plus">＋</span>${groupHTML(q.card.b, q.card.emoji, cardRepr, 'big', q.card.frame, cap)}</div>`;
  else if (kind === 'split') body = `<div class="cq-groupwrap">${splitHTML(q.card.total, q.card.shown, q.card.emoji, cardRepr)}</div>`;
  else if (kind === 'sum') body = sumEqHTML(q.card);
  card.innerHTML = `<div class="count-q">${body}</div>`;
  // meetellen: objecten poppen één voor één op terwijl er hardop geteld wordt
  if (q.along && kind === 'group') {
    const objs = card.querySelectorAll('.cg-obj, .cg-dot, .df-dot');
    objs.forEach(o => o.classList.add('pre'));
    countAlong(objs, q.card.n, q.prompt, myDraw);
    return;
  }
  // één-meer/minder met volledige steun: het resultaat bouwt zich zichtbaar op
  if (kind === 'delta' && q.support === 'full') { animateDelta(card, q, myDraw); return; }
  speak(q.prompt);
}
// Toon één object erbij (pop) of eraf (fade) zodat het kind het resultaat kan tellen.
function animateDelta(card, q, drawId) {
  const dframe = card.querySelector('.dframe');
  const g = card.querySelector('.cgroup, .cframe');
  setTimeout(() => {
    if (!G || !G.count) return;
    if (drawId != null && drawId !== countDrawId) return;   // vraag is intussen gewisseld
    if (dframe) {
      // stippenraam: vul een leeg vakje (erbij) of leeg het laatste (eraf)
      const cells = [...dframe.querySelectorAll('.df-cell')];
      if (q.card.dir > 0) {
        const empty = cells.find(c => !c.classList.contains('on'));
        if (empty) { empty.classList.add('on'); empty.innerHTML = '<span class="df-dot pop"></span>'; }
      } else {
        const on = cells.filter(c => c.classList.contains('on')).pop();
        const dot = on && on.querySelector('.df-dot');
        if (dot) dot.classList.add('fade-out');
      }
    } else if (q.card.dir > 0) {
      const extra = document.createElement('span');
      extra.className = q.card.repr === 'dots' ? 'cg-dot pop' : 'cg-obj pop';
      extra.textContent = q.card.repr === 'dots' ? '' : q.card.emoji;
      if (g) g.appendChild(extra);
    } else {
      const marks = card.querySelectorAll('.cg-obj, .cg-dot');
      const last = marks[marks.length - 1];
      if (last) last.classList.add('fade-out');
    }
    speak(q.prompt);
  }, 450);
}
// Zet de antwoordknoppen (hoeveelheden of cijfers) neer.
function renderCountAnswers(q, area) {
  const tiles = q.choices.map(c => {
    let inner;
    if (c.kind === 'numeral') {
      const sup = c.support || 'full';
      const dots = sup === 'none' ? '' : groupHTML(c.v, '•', 'dots', 'mini' + (sup === 'faint' ? ' faint' : ''), false, c.cap);
      inner = `<span class="ct-num">${c.v}</span>${dots}`;
    } else {
      inner = groupHTML(c.n, c.emoji, c.repr, '', c.frame, c.cap);
    }
    return `<button class="count-tile" data-v="${c.v}">${inner}</button>`;
  }).join('');
  const n = q.choices.length;
  const cls = 'count-tiles' + (n <= 2 ? ' two' : n === 3 ? ' three' : '');
  area.innerHTML = `<div class="${cls}">${tiles}</div>`;
  area.querySelectorAll('.count-tile').forEach(b => {
    b.onclick = () => submitAnswer(parseInt(b.dataset.v, 10), b);
  });
}
// Meetellen: elk object popt op maat op; de getallen worden achter elkaar gezegd.
function countAlong(objs, n, lead, drawId) {
  let i = 0;
  speak(lead);
  const step = () => {
    if (!G || !G.count || i >= n) return;
    if (drawId != null && drawId !== countDrawId) return;   // er staat alweer een nieuwe vraag

    const o = objs[i];
    if (o) { o.classList.remove('pre'); o.classList.add('pop'); }
    speak(numWord(i + 1), { rate: 0.9 });
    i++;
    if (i < n) setTimeout(step, 620);
  };
  setTimeout(step, 650);
}
function replayPrompt() {
  sndClick();
  const q = G && G.qs && G.qs[G.idx];
  if (!q) return;
  if (q.along && q.card && q.card.kind === 'group') {
    // ook .df-dot: in een stippenraam zitten de stippen daarin (niet in .cg-dot)
    const objs = $('question-text').querySelectorAll('.cg-obj, .cg-dot, .df-dot');
    objs.forEach(o => { o.classList.remove('pop'); o.classList.add('pre'); });
    countAlong(objs, q.card.n, q.prompt, countDrawId);
  } else {
    speak(q.prompt);
  }
}
// Nauwkeurigheid van de telmodus (voor de fase-klim) + de rung bínnen de fase:
// 3× in-één-keer-goed op rij → rung omhoog; een misser → rung omlaag.
function updateCountAcc(p, correct, firstTry) {
  const ct = p.countTrack;
  ct.seen = (ct.seen || 0) + 1;
  const target = correct ? (firstTry ? 1 : 0.85) : 0;
  ct.acc = (ct.acc == null ? 0.5 : ct.acc) * 0.8 + target * 0.2;
  const top = countTopRung(countLiveStage(p));
  if (correct && firstTry) {
    ct.streak = (ct.streak || 0) + 1;
    if (ct.streak >= 3 && (ct.rung || 0) < top) { ct.rung = (ct.rung || 0) + 1; ct.streak = 0; }
  } else {
    ct.streak = 0;
    if (!correct && (ct.rung || 0) > 0) ct.rung = (ct.rung || 0) - 1;
  }
}
// Na een optreden: de fase mee laten klimmen (pas op de hoogste rung) of, bij
// worstelen, zakken — altijd binnen het door de ouder toegestane bereik.
function advanceCountStage(p, success) {
  const s = p.settings;
  const lo = Math.max(1, s.stage || 1);
  const hi = Math.max(lo, countMaxStage(s));
  const ct = p.countTrack;
  let st = Math.min(hi, Math.max(lo, ct.stage || lo));
  const top = countTopRung(st);
  if (success && ct.acc >= 0.85 && (ct.seen || 0) >= 8 && (ct.rung || 0) >= top && st < hi) {
    st++; ct.rung = 0; ct.streak = 0; ct.seen = 0; ct.acc = 0.6;   // frisse start op de nieuwe fase
  } else if ((!success || ct.acc < 0.5) && st > lo) {
    st--; ct.rung = countTopRung(st); ct.streak = 0; ct.acc = 0.55; ct.seen = 0;  // terug naar wat wél lukt
  }
  ct.stage = st;
}
// Lees-vrije "bijna!" bij een eerste misser: geen tekst, wel een vriendelijke stem.
function countMissSpeak(q, val) {
  if (q.compare) { speak('Bijna! Kijk goed welke groep ' + (q.compare === 'more' ? 'de meeste' : 'de minste') + ' heeft.'); return; }
  if (q.ctype === 'onemore') { speak('Bijna! Eén erbij is één meer. Tel nog eens.'); return; }
  if (q.ctype === 'oneless') { speak('Bijna! Eén eraf is één minder. Tel nog eens.'); return; }
  if (q.ctype === 'combine') { speak('Bijna! Tel de twee groepjes samen.'); return; }
  if (q.ctype === 'split') { speak('Bijna! Hoeveel horen er nog bij?'); return; }
  if (q.ctype === 'match' || q.ctype === 'numquant') { speak('Bijna! Zoek de groep met evenveel.'); return; }
  if (q.ctype === 'sumsym' || q.ctype === 'sumdots' || q.ctype === 'sumwritten') {
    speak(q.card && q.card.op === '-' ? 'Bijna! Hoeveel blijven er over?' : 'Bijna! Tel ze samen.');
    return;
  }
  if (typeof val === 'number' && q.ctype !== 'numeral') {
    if (val > q.ans) speak('Bijna! Dat waren er te veel. Probeer een kleinere groep.');
    else speak('Bijna! Dat waren er te weinig. Probeer een grotere groep.');
    return;
  }
  speak('Bijna! Probeer nog eens.');
}
// De juiste hoeveelheid hardop meetellen bij een definitieve misser -- zo ziet én
// hoort het kind wat het antwoord was, zonder één woord tekst.
function countReveal(q) {
  const tile = [...document.querySelectorAll('.count-tile')].find(b => parseInt(b.dataset.v, 10) === q.ans);
  if (tile) {
    tile.classList.add('good');
    const objs = tile.querySelectorAll('.cg-obj, .cg-dot, .df-dot');
    // cijfer-tegel (getal-fases + geschreven sommen): zeg het getal; anders tel de groep mee
    if (tile.querySelector('.ct-num')) speak('Dit is de ' + numWord(q.ans) + '.');
    // net als countAlong/animateDelta: elke geplande stap meldt zich eerst af bij G,
    // anders blijft dit doortellen nadat de show intussen verlaten is (zie quitGame)
    else { let i = 0; const c = () => { if (!G || !G.count) return; if (i >= q.ans) return; if (objs[i]) objs[i].classList.add('pop'); speak(numWord(i + 1), { rate: 0.95 }); i++; if (i < q.ans) setTimeout(c, 560); }; setTimeout(c, 250); }
  }
}

/* ================= Memory-spel (lees-vrij) =================
   Clara's favoriete spelvorm, ingezet als reken-oefening: draai twee kaartjes
   om en vind de PAREN met evenveel — dezelfde hoeveelheid in een andere vorm
   (voorwerpen ↔ stippen ↔ tienraam ↔ cijfer). Traint subitiseren, het koppelen
   van weergaven én het geheugen. Gesproken + visueel, dus lees-vrij. Beloningen
   lopen via dezelfde diamant-pijplijn (kleedkamer, trofeeën blijven meetellen). */
let M = null;
// Eén kaartje omzetten in beeld: voorwerpen, stippen, tienraam of cijfer.
// wat een memory-potje oplevert -- gedeeld door het spel zelf en door de belofte
// op de knop op de kaart (zie memPayout)
const MEM_PAIR_GAIN = 2, MEM_DONE_BONUS = 3;
function memFaceHTML(c) {
  if (c.repr === 'numeral') return `<span class="ct-num">${c.v}</span>`;
  if (c.repr === 'frame') return frameHTML(c.v, c.emoji, 'objects');
  if (c.repr === 'dots') return groupHTML(c.v, '', 'dots');
  return groupHTML(c.v, c.emoji, 'objects');
}
// Bouwt het kaartspel: P paren (elk een unieke hoeveelheid) in twee verschillende
// weergaven. Aantal paren en bereik groeien mee met de fase/rung.
function buildMemoryDeck(p) {
  const stage = countLiveStage(p);
  const d = countDifficulty(p, stage);
  const max = Math.max(3, d.effMax);
  let pairs = 3 + (d.rung >= 1 ? 1 : 0) + (d.rung >= 2 ? 1 : 0);   // 3..5
  pairs = Math.min(pairs, max);                                    // niet meer paren dan er hoeveelheden zijn
  const numOK = p.settings.numerals !== false && stage >= 6;
  const vals = shuffle(Array.from({ length: max }, (_, i) => i + 1)).slice(0, pairs);
  const cards = [];
  vals.forEach(v => {
    const emoji = pick(COUNT_OBJECTS);
    let reprs = ['objects', 'dots'];
    if (v > 5) reprs.push('frame');
    if (numOK) reprs.push('numeral');
    reprs = shuffle(reprs);
    const r2 = reprs[1] || (reprs[0] === 'objects' ? 'dots' : 'objects');
    cards.push({ v, repr: reprs[0], emoji }, { v, repr: r2, emoji });
  });
  return { cards: shuffle(cards), pairs };
}
function startMemory() {
  sndClick();
  const p = P();
  const { cards, pairs } = buildMemoryDeck(p);
  M = { cards, pairs, flipped: [], matched: 0, lock: false, earned: 0 };
  $('mem-done').style.display = 'none';
  telNu($('mem-diamonds'), p.diamonds);
  const grid = $('mem-grid');
  grid.style.setProperty('--cols', Math.min(pairs, 4));   // voorlopige waarde; memFitCols meet zo de echte
  grid.innerHTML = cards.map((c, i) =>
    `<button class="mem-card" data-i="${i}"><span class="mem-inner"><span class="mem-back">🎤</span><span class="mem-face">${memFaceHTML(c)}</span></span></button>`
  ).join('');
  grid.querySelectorAll('.mem-card').forEach(b => b.onclick = () => flipCard(parseInt(b.dataset.i, 10), b));
  renderSegBar($('mem-progress'), pairs, 0, false);
  toonHub('screen-memory');
  // pas ná show() heeft de arena een maat: kies dan het aantal kolommen dat de
  // kaartjes zo groot mogelijk maakt binnen die ruimte
  requestAnimationFrame(() => memFitCols(grid, cards.length));
  speak('Zoek de twee kaartjes met evenveel.');
}
// Zoveel mogelijk kaart per kaartje: probeer elk aantal kolommen en houd het
// aantal dat het grootste vierkantje oplevert binnen de beschikbare arena. Het
// aantal kolommen stond vast op min(paren, 4), waardoor de kaartjes op een
// staande telefoon klein bleven terwijl er ruime hoogte over was.
function memFitCols(grid, n) {
  const screen = $('screen-memory');
  if (!screen) return;
  // Meet de ruimte die er ís (scherm min de plakkende kop), niet de arena: die
  // groeit mee met het raster dat we hier juist aan het bepalen zijn, dus daarop
  // meten voedt zichzelf -- twee kolommen maken de arena hoger, waarna twee
  // kolommen nóg ruimer lijken te passen, en het raster liep van het scherm af.
  const sticky = screen.querySelector('.hub-sticky');
  const gap = parseFloat(getComputedStyle(grid).gap) || 12;
  // eerst de vorige inzet loslaten: anders meten we de breedte die we zelf de
  // vorige keer hebben opgelegd, en krimpt het raster elke ronde verder
  grid.style.width = '';
  const w = grid.getBoundingClientRect().width;
  // 56px marge: de arena en het scherm hebben zelf ook nog padding
  const h = screen.clientHeight - (sticky ? sticky.getBoundingClientRect().height : 0) - 56;
  if (!w || h <= 0) return;
  const fits = [];
  for (let c = 2; c <= n; c++) {
    const rows = Math.ceil(n / c);
    fits.push({ cols: c, rows, size: Math.min((w - gap * (c - 1)) / c, (h - gap * (rows - 1)) / rows) });
  }
  const biggest = fits.reduce((a, f) => f.size > a.size ? f : a, fits[0]);
  // Bij bijna gelijke kaartgrootte liever meer kolommen: dat vult de breedte en
  // geeft een vierkanter blok dan een smalle kolom met veel lucht ernaast.
  const best = fits.filter(f => f.size >= biggest.size * 0.92).pop();
  grid.style.setProperty('--cols', best.cols);
  // De breedte moet mee: het raster is anders altijd zo breed als de ruimte, en
  // dan groeit het (vierkante) kaartje door de onderkant heen zodra de hóógte de
  // krappe kant is. Nu is de kaart precies zo groot als beide maten toelaten.
  grid.style.width = Math.floor(best.cols * best.size + gap * (best.cols - 1)) + 'px';
}
function exitMemory() { sndClick(); hideToast(); M = null; goMap(); }
function flipCard(i, btn) {
  if (!M || M.lock) return;
  if (btn.classList.contains('open') || btn.classList.contains('done')) return;
  const c = M.cards[i];
  btn.classList.add('open');
  sndClick();
  speak(numWord(c.v));
  M.flipped.push({ c, btn });
  if (M.flipped.length < 2) return;
  M.lock = true;
  const [a, b] = M.flipped;
  if (a.c.v === b.c.v) {
    setTimeout(() => {
      a.btn.classList.add('done'); b.btn.classList.add('done');
      a.btn.classList.remove('open'); b.btn.classList.remove('open');
      a.btn.classList.add('snap'); b.btn.classList.add('snap');   // 'klik samen'-bounce
      setTimeout(() => { a.btn.classList.remove('snap'); b.btn.classList.remove('snap'); }, 440);
      onMemMatch(b.btn);
      M.flipped = []; M.lock = false;
    }, 450);
  } else {
    a.btn.classList.add('wrong'); b.btn.classList.add('wrong');   // kort schudje bij een misser
    setTimeout(() => { a.btn.classList.remove('wrong'); b.btn.classList.remove('wrong'); }, 430);
    setTimeout(() => {
      a.btn.classList.remove('open'); b.btn.classList.remove('open');
      M.flipped = []; M.lock = false;
    }, 950);
  }
}
function onMemMatch(fromBtn) {
  const p = P();
  M.matched++;
  renderSegBar($('mem-progress'), M.pairs, M.matched, false);
  const gain = MEM_PAIR_GAIN;
  p.diamonds += gain; M.earned += gain;
  save();
  telStraks($('mem-diamonds'), p.diamonds);
  sndCoin();
  flyDiamonds(fromBtn, $('mem-diamonds'), 2);
  sparkle(fromBtn, ['⭐', '✨', '💛']);
  const trofees = checkTrophies(p);
  if (trofees.length) updateTroDot();
  if (M.matched >= M.pairs) setTimeout(finishMemory, 650);
  else speak(pick(['Goed zo!', 'Ja!', 'Knap!', 'Gevonden!']));
}
function finishMemory() {
  const p = P();
  const bonus = MEM_DONE_BONUS;
  p.diamonds += bonus; M.earned += bonus;
  save();
  telStraks($('mem-diamonds'), p.diamonds);
  sndWin();
  confetti(28);
  flyDiamonds($('mem-grid'), $('mem-diamonds'), 3);
  speak('Wauw! Je hebt ze allemaal gevonden!');
  $('mem-done-earn').textContent = '💎 +' + M.earned;
  $('mem-done').style.display = 'flex';
  syncBackGuard();
}

/* ---- Zwakke sommen: gericht herhalen wat een kind moeilijk vindt ----
   Alleen klassieke 2-getal-sommen komen in de herhaalpoel; zoek-het-getal- en
   drie-getallen-vragen worden per optreden ingeroosterd (zie planSpecials) en
   niet los teruggespeeld. Sleutel = het sjabloon, zodat de vraag exact
   gereconstrueerd kan worden. */
// Een gemiste som zwaarder wegen (+2, tot 6); een goed beantwoorde lichter (−1, weg bij 0).
function incWeak(p, q) {
  if (q.kind !== 'classic') return;
  const e = p.weak[q.tmpl] || { ans: q.ans, op: q.op, w: 0 };
  e.w = Math.min(6, e.w + 2);
  e.ans = q.ans; e.op = q.op;
  p.weak[q.tmpl] = e;
}
function decWeak(p, q) {
  if (q.kind !== 'classic') return;
  const e = p.weak[q.tmpl];
  if (!e) return;
  e.w -= 1;
  // Geoefend! Niet zomaar vergeten: de som gaat in onderhoud (zie hieronder),
  // zodat we later controleren of het blijft zitten.
  if (e.w <= 0) { toLearned(p, q.tmpl, e); delete p.weak[q.tmpl]; }
}

/* ---- Onderhoud: blijft het ook zitten? ----------------------------------
   Een som die goed gaat verdween vroeger uit beeld; daarna kwam hij alleen nog
   per toeval langs. Beheersing kan dan stilletjes wegzakken. Daarom houden we
   geleerde sommen bij met een groeiend interval: komt hij terug en gaat hij
   goed, dan duurt het dubbel zo lang voor hij weer langskomt; gaat hij fout,
   dan is het weer een zwakke som. Voor het kind is het gewoon een som.
   De "klok" is het aantal vragen dat dit kind al beantwoord heeft. */
const LEARN_IV0 = 18;      // eerste onderhoudsinterval (in vragen)
const LEARN_IV_MAX = 200;  // verder dan dit hoeft niet
const LEARN_MAX = 120;     // pool begrensd houden
function qClock(p) { return (p.stats.correct || 0) + (p.stats.wrong || 0); }
function toLearned(p, tmpl, e) {
  if (!p.learned) p.learned = {};
  p.learned[tmpl] = { ans: e.ans, op: e.op, iv: LEARN_IV0, due: qClock(p) + LEARN_IV0 };
  const keys = Object.keys(p.learned);
  if (keys.length > LEARN_MAX) {
    // de best beheerste (grootste interval) mogen als eerste uit de lijst
    keys.sort((a, b) => (p.learned[b].iv - p.learned[a].iv) || (p.learned[b].due - p.learned[a].due));
    keys.slice(0, keys.length - LEARN_MAX).forEach(k => delete p.learned[k]);
  }
}
// Goed onthouden: het duurt nu langer voor deze som terugkomt.
function bumpLearned(p, q) {
  const e = p.learned && p.learned[q.tmpl];
  if (!e) return;
  e.iv = Math.min(LEARN_IV_MAX, Math.round(e.iv * 2));
  e.due = qClock(p) + e.iv;
}
// Toch weer misgegaan: uit onderhoud, terug naar de zwakke sommen (incWeak doet dat).
function demoteLearned(p, q) { if (p.learned) delete p.learned[q.tmpl]; }
// Een som die aan onderhoud toe is: het langst over tijd gaat voor. Alleen
// bewerkingen die nu aanstaan, en niets boven de ingestelde bovengrens.
function pickRefresh(p, s) {
  if (!p.learned) return null;
  const ops = s.ops.length ? s.ops : ['+'];
  const now = qClock(p);
  let best = null, bestOver = -1;
  for (const k of Object.keys(p.learned)) {
    const e = p.learned[k];
    if (!ops.includes(e.op) || e.ans > s.max) continue;
    const over = now - e.due;
    if (over >= 0 && over > bestOver) { best = k; bestOver = over; }
  }
  if (!best) return null;
  const e = p.learned[best];
  return { tmpl: best, ans: e.ans, op: e.op, kind: 'classic', refresh: true };
}
// Kies een zwakke som om te herhalen (alleen als de bewerking nog aanstaat); zwaardere vaker.
function pickWeak(p, s) {
  const ops = s.ops.length ? s.ops : ['+'];
  const keys = Object.keys(p.weak).filter(k => ops.includes(p.weak[k].op));
  if (!keys.length) return null;
  const pool = [];
  keys.forEach(k => { for (let i = 0; i < p.weak[k].w; i++) pool.push(k); });
  const k = pick(pool.length ? pool : keys);
  return { tmpl: k, ans: p.weak[k].ans, op: p.weak[k].op, kind: 'classic' };
}
// Bouwt de volgende vraag: ~35% kans op een zwakke herhaling, anders een verse (adaptieve) som.
function buildQuestion(p, lvl) {
  if (Math.random() < 0.35) {
    const wq = pickWeak(p, p.settings);
    if (wq) return wq;
  }
  // onderhoud: af en toe een som die al geleerd is maar lang niet langskwam
  if (Math.random() < 0.12) {
    const rq = pickRefresh(p, p.settings);
    if (rq) return rq;
  }
  return genQuestion(p.settings, lvl, p.perf);
}

/* ================= Extra uitdagingen: klaarheid, tempo, inroostering =================
   Twee losse dimensies, elk met een eigen aan/uit-knop voor de ouder:
     • missNum  — zoek-het-getal (2e getal ontbreekt), + − ×
     • chain3   — drie getallen optellen
   Beide komen geleidelijk: pas als het kind de gewone som goed beheerst, en
   nooit twee nieuwe concepten tegelijk. */

// Per-bewerking-tracker (lui aangemaakt): recente nauwkeurigheid (EMA), aantal
// pogingen en of het (met hysterese) op pauze staat.
function ot(p, op) {
  let t = p.opTrack[op];
  if (!t) { t = { n: 0, acc: 0.5, paused: false, unlockRound: null, fast: 0.5 }; p.opTrack[op] = t; }
  if (t.fast == null) t.fast = 0.5;   // bestaande spelers: neutraal beginnen
  return t;
}
/* ---- Vlotheid: kán het kind het, of zít het erin? -----------------------
   Twee kinderen antwoorden allebei "12" op 7 + 5: de één haalt het op, de
   ander telt het uit op zijn vingers. Voor de accuratesse is dat gelijk, maar
   voor wat erna komt niet: zoek-het-getal en drie-getallen vragen hoofdruimte
   die er niet is zolang het optellen zelf nog aandacht kost. Daarom telt naast
   'acc' (klopt het) ook 'fast' (gaat het vanzelf) mee vóór een moeilijkere
   vraagsoort vrijkomt. Alleen gemeten bij goed-in-één-keer, want snelheid bij
   een fout antwoord zegt niets. */
const FAST_SPOT_KIES = 50;   // spotlight loopt in 12s leeg -> 50 = binnen ~6s
const FAST_SPOT_TYP = 25;    // typen kost meer tikken -> ~9s
const FLUENT_MIN = 0.55;     // ruwweg: meer dan de helft van de goede antwoorden komt vlot
const PATIENCE_N = 60;       // geduld-overrule: nooit permanent blokkeren
function fastEnough(mode, spot) { return spot >= (mode === 'typ' ? FAST_SPOT_TYP : FAST_SPOT_KIES); }
// Een zware zwakke som (w≥4) voor deze bewerking = het kind worstelt er nog mee.
function heavyWeak(p, op) {
  return Object.values(p.weak).some(e => e.op === op && e.w >= 4);
}
// Beheerst = genoeg pogingen (steekproef/consistentie) + hoge nauwkeurigheid +
// geen hardnekkig gemiste som. 0.85 is dezelfde lat die updatePerf al "goed" noemt.
function opMastered(p, op) {
  const t = p.opTrack[op];
  if (!t || t.n < 20 || t.acc < 0.85 || heavyWeak(p, op)) return false;
  // Accuraat is niet genoeg: het moet ook een beetje vlot gaan. Een zorgvuldig
  // maar traag kind wordt daardoor vertraagd, nooit geblokkeerd -- na ruim
  // voldoende pogingen gaat de poort alsnog open.
  return (t.fast == null ? 0.5 : t.fast) >= FLUENT_MIN || t.n >= PATIENCE_N;
}
// Klaar voor zoek-het-getal bij deze bewerking: vanaf ronde 3, beheerst, niet op pauze.
function opReady(p, op, round) {
  const t = p.opTrack[op];
  if (!t || round < 3 || t.paused) return false;
  return opMastered(p, op);
}
// Klaar voor drie-getallen (alleen optellen): vanaf ronde 4, tel-beheersing, en pas
// nadat zoek-het-getal voor + is losgekomen (≥2 rondes geleden) — nooit twee nieuwe
// dingen tegelijk. Werkt met de tel-beheersing, ook als de ouder missNum uit heeft.
function chainReady(p, s, round) {
  const ct = p.chainTrack;
  if (round < 4 || ct.paused) return false;
  if (!opMastered(p, '+')) return false;
  const plus = p.opTrack['+'];
  if (!plus || plus.unlockRound == null || round - plus.unlockRound < 2) return false;
  return true;
}
// Zet de "sinds-ronde"-stempel zodra een bewerking beheerst is (voor de chain-gate).
function refreshReadiness(p, round) {
  ['+', '-', 'x', ':'].forEach(op => {
    const t = ot(p, op);
    if (round >= 3 && opMastered(p, op) && t.unlockRound == null) t.unlockRound = round;
  });
}
// Werkt de per-bewerking-nauwkeurigheid bij ná de definitieve afronding van een
// klassieke som (niet bij een tussentijdse herkansing). Pauze met hysterese:
// onder 0.70 pauzeren, pas boven 0.85 weer vrijgeven.
function updateOpAcc(p, op, correct, firstTry, fast) {
  const t = ot(p, op);
  t.n++;
  const target = correct ? (firstTry ? 1 : 0.85) : 0;
  t.acc = t.acc * 0.8 + target * 0.2;
  // vlotheid alleen meten bij een directe treffer, en rustiger middelen dan de
  // accuratesse: even opkijken of napraten mag geen vlotheidsdip veroorzaken
  if (correct && firstTry) t.fast = t.fast * 0.85 + (fast ? 1 : 0) * 0.15;
  if (t.acc < 0.70) t.paused = true;
  else if (t.acc >= 0.85) t.paused = false;
}
// Nauwkeurigheid van de drie-getallen-vragen zelf (voor hun eigen pauze).
function updateChainAcc(p, correct, firstTry) {
  const ct = p.chainTrack;
  ct.seen = (ct.seen || 0) + 1;
  const target = correct ? (firstTry ? 1 : 0.85) : 0;
  ct.acc = ct.acc * 0.8 + target * 0.2;
  if (ct.seen >= 5) {
    if (ct.acc < 0.70) ct.paused = true;
    else if (ct.acc >= 0.85) ct.paused = false;
  }
}
// Na een optreden: frequentie-trap bijstellen. Schone ronde (geen misser op de
// speciale vragen) → teller op; na 3 schone rondes trap 2. Een misser → terug
// naar trap 1. Trap 2 (2 per ronde) geldt alleen bij ≥8 vragen per optreden.
function applyRampUpdates(p, g) {
  if (g.missShown > 0) {
    if (!g.missDirty) { p.missRamp.hot++; if (p.missRamp.hot >= 3) p.missRamp.rung = 2; }
    else { p.missRamp.hot = 0; p.missRamp.rung = 1; }
  }
  if (g.chainShown > 0) {
    if (!g.chainDirty) { p.chainTrack.hot++; if (p.chainTrack.hot >= 3) p.chainTrack.rung = 2; }
    else { p.chainTrack.hot = 0; p.chainTrack.rung = 1; }
  }
}
// Kiest `count` plekken in [1, total-1] die niet in `avoid` staan en niet
// aan elkaar grenzen (nooit de eerste vraag, nooit twee speciale op een rij).
function pickSlots(total, count, avoid) {
  const used = new Set(avoid);
  const res = [];
  let guard = 0;
  while (res.length < count && guard++ < 200) {
    const i = rnd(1, total - 1);
    if (used.has(i) || res.some(j => Math.abs(j - i) <= 1)) continue;
    res.push(i); used.add(i);
  }
  return res;
}
// Roostert de speciale vragen van dit optreden in: hoeveel, welk type, welke plek.
// Zolang drie-getallen nog in de introductiefase zit (trap < 2) mag er hoogstens
// één speciale vraag per ronde zijn — óf zoek-het-getal, óf drie-getallen, nooit beide.
function planSpecials(p, s, total, round, goldIdx) {
  refreshReadiness(p, round);
  const missOps = (s.missNum ? s.ops : []).filter(o => ['+', '-', 'x'].includes(o) && opReady(p, o, round));
  const missAvail = missOps.length > 0;
  const chainAvail = !!s.chain3 && chainReady(p, s, round);
  const twoOk = s.perLevel >= 8;   // 2 speciale vragen alleen bij lange optredens (≥8)
  const both = missAvail && chainAvail;
  let types = [];
  if (chainAvail && p.chainTrack.rung < 2) {
    // introductiefase drie-getallen: hoogstens één speciale, chain krijgt voorrang
    types = [(missAvail && Math.random() < 0.4) ? 'miss' : 'chain'];
  } else if (both) {
    // beide beschikbaar en gesetteld: precies één van elk (nooit meer dan 2 per ronde)
    types = ['miss', 'chain'];
  } else if (missAvail || chainAvail) {
    // maar één dimensie actief: die mag op trap 2 twee per ronde geven (bij ≥8 vragen)
    const type = missAvail ? 'miss' : 'chain';
    const ramp = missAvail ? p.missRamp.rung : p.chainTrack.rung;
    types = ramp >= 2 && twoOk ? [type, type] : [type];
  }
  // (geen van beide beschikbaar: types blijft leeg -- géén speciale vraag)
  // hoeveel speciale plekken passen er (niet de eerste, niet naast elkaar/de gouden)?
  const fit = Math.max(0, Math.floor((total - 1) / 2));
  const cap = Math.min(fit, twoOk ? 2 : 1);
  if (types.length > cap) types = types.slice(0, cap);
  const slots = pickSlots(total, types.length, goldIdx >= 0 ? [goldIdx] : []);
  const plan = {};
  slots.forEach((idx, i) => {
    plan[idx] = { type: types[i], op: types[i] === 'miss' ? pick(missOps) : '+' };
  });
  return plan;
}
// Vriendelijke richtinghint bij een fout antwoord (helpt zonder het antwoord te verklappen).
function hintFor(q, val) {
  if (typeof val === 'number' && !isNaN(val)) {
    if (val > q.ans) return 'Net iets te veel — probeer een kleiner getal! 👇';
    if (val < q.ans) return 'Net iets te weinig — probeer een groter getal! 👆';
  }
  return 'Bijna! Probeer nog eens 💪';
}

/* ================= Spel ================= */
const PRAISE = ['Super! 🌟', 'Fantastisch! 🎉', 'Topster! 🎤', 'Wauw! 🎊', 'Geweldig! ✨', 'Knap gedaan! 👏', 'Bravo! 🎶'];
let G = null;

function startLevel(lvl) {
  // De vorige show loslaten vóór G vervangen wordt: daarna is haar spotlight-
  // teller niet meer te vinden (die hangt aan G). Zie startSpot.
  stopSpot();
  const p = P();
  const s = p.settings;
  // Vragen worden nu per stuk gebouwd (zodat zwakke sommen kunnen terugkomen); vooraf enkel
  // de gouden-vraag-index kiezen: hoogstens één per optreden, ± elke 2 shows, nooit de eerste.
  const count = s.track === 'count';
  const goldIdx = (s.perLevel > 1 && Math.random() < 0.5) ? rnd(1, s.perLevel - 1) : -1;
  // Extra-uitdaging-vragen (zoek-het-getal / drie getallen) vooraf inroosteren op
  // vaste plekken; de gewone vragen worden per stuk gebouwd (incl. zwakke herhaling).
  // In de telmodus komen die niet voor -- daar bouwt genCount elke vraag.
  const plan = count ? [] : planSpecials(p, s, s.perLevel, tourRound(lvl), goldIdx);
  // FASE 1: de publieksmeter is uit het spel gehaald. De teller zelf loopt stil door
  // (zie submitAnswer/endLevel): hij bepaalt nog altijd de extra show en de restbonus,
  // maar er staat geen balk meer op het scherm. G.fan/G.fanStep zijn daarmee interne
  // staat geworden -- bewust blijven staan i.p.v. de beloningen eruit te slopen.
  const fanStep = 100 / Math.max(5, s.perLevel - 1);
  G = { lvl, qs: [], idx: 0, total: s.perLevel, goldIdx, plan, count, errors: 0, misses: 0, streak: 0, earned: 0, lock: false, retried: false, input: '', spot: 100, timer: null, fan: 0, fanStep, moveIdx: 0,
        missShown: 0, chainShown: 0, missDirty: false, chainDirty: false, countGood: 0, countSeen: 0 };
  // De kop zegt hetzelfde als de kaart: welke wereld, en de hoeveelste show erin.
  // Hiervoor stond hier de stad uit CITIES -- dan wees de kaart je IJswereld binnen
  // en heette het optreden daarna "Rome".
  const wl = worldFor(lvl);
  $('game-lvl-label').innerHTML = `${wl.world.icon} ${wl.world.name}`
    + `<span class="world-sub">Show ${wl.nr} / ${wl.levels}</span>`;
  telNu($('game-diamonds'), p.diamonds);
  $('game-avatar-inner').innerHTML = pasLaag(avatarSVG(p, 168));
  // De zaal van deze wereld. Heeft de wereld er geen, dan geeft applyVenue false
  // terug, blijft .venue-aan eraf en is dit scherm letterlijk wat het was: het
  // podiumkader van applyStage op het app-verloop.
  applyStage($('show-stage'), p);
  applyVenue($('screen-game'), wl.world);
  show('screen-game');
  renderQuestion();
}
/* Stoppen: een X sluit/onderbreekt de show. Is er nog geen voortgang (net
   gestart, nog geen vraag beantwoord of gemist), dan stopt hij meteen --
   er valt dan niets te bevestigen. Pas zodra er iets te verliezen is, vraagt
   hij het na, zodat een per-ongeluk-tik geen show kost. */
function askQuit() {
  sndClick();
  if (G && G.idx === 0 && G.errors === 0 && G.misses === 0) { quitGame(); return; }
  $('quit-modal').classList.add('open');
  syncBackGuard();
}
function closeQuitModal() { sndClick(); $('quit-modal').classList.remove('open'); syncBackGuard(); }
function quitGame() {
  $('quit-modal').classList.remove('open');
  stopSpot();
  hideToast();
  // de show is van het scherm dat we nu verlaten -- geen woord ervan hoort nog
  // mee te klinken op de kaart. G op null vóór het navigeren laat elke geplande
  // speak() (countAlong, animateDelta, ...) zichzelf al afmelden; cancelSpeech()
  // stopt daarnaast wat de stem al hardop aan het zeggen was.
  cancelSpeech();
  // ook een afgebroken show brengt je terug op de plek waar je hem begon
  const lvl = G ? G.lvl : null;
  G = null;
  goMap(lvl);
}

function renderQuestion() {
  const p = P();
  const s = p.settings;
  if (!G.qs[G.idx]) {
    let built;
    if (G.count) { built = genCount(p); }             // telmodus: elke vraag lees-vrij
    else {
      const plan = G.plan[G.idx];
      if (plan && plan.type === 'miss') { built = genMissing(s, G.lvl, p.perf, plan.op); G.missShown++; }
      else if (plan && plan.type === 'chain') { built = genChain(s, G.lvl, p.perf); G.chainShown++; }
      else built = buildQuestion(p, G.lvl);
    }
    if (G.idx === G.goldIdx) built.gold = true;
    // telmodus: kondig de gouden vraag hoorbaar aan (lees-vrij) -- de prompt wordt
    // toch alleen uitgesproken, niet getoond, dus dit dubbelt niets in beeld
    if (built.gold && G.count && built.prompt) built.prompt = 'Gouden vraag! Deze telt drie keer. ' + built.prompt;
    G.qs[G.idx] = built;
  }
  const q = G.qs[G.idx];
  G.mode = G.count ? 'count' : (s.mode === 'mix' ? pick(['kies', 'typ']) : s.mode);
  G.input = '';
  G.lock = false;
  G.retried = false;
  // voortgang
  renderSegBar($('qprogress'), G.total, G.idx);
  $('notes-left').textContent = livesText();
  drawQuestion();
  // Een nieuwe vraag komt binnen in plaats van te verspringen: 140ms, alleen
  // opacity + een duwtje omhoog. Dat is het "en nu de volgende" van het goede
  // antwoord dat er net was -- geen overgang, een aankondiging.
  const kaart = $('question-card');
  kaart.classList.remove('vers');
  void kaart.offsetWidth;
  kaart.classList.add('vers');
  // antwoorden
  const area = $('answer-area');
  if (G.count) {
    renderCountAnswers(q, area);
    startSpot();
    return;
  }
  if (G.mode === 'kies') {
    const choices = makeChoices(q.ans);
    area.innerHTML = '<div class="choices">' +
      choices.map(c => `<button class="choice-btn" data-v="${c}">${c}</button>`).join('') + '</div>';
    area.querySelectorAll('.choice-btn').forEach(b => {
      b.onclick = () => submitAnswer(parseInt(b.dataset.v, 10), b);
    });
  } else {
    area.innerHTML = `<div class="numpad">
      ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="num-btn" data-n="${n}">${n}</button>`).join('')}
      <button class="num-btn del" data-n="del">⌫</button>
      <button class="num-btn" data-n="0">0</button>
      <button class="num-btn ok" data-n="ok">✔</button>
    </div>`;
    area.querySelectorAll('.num-btn').forEach(b => {
      b.onclick = () => numpadPress(b.dataset.n);
    });
  }
  startSpot();
}
// Eén voortgangsbalk in vakjes: gehaald / nu bezig / nog te gaan. Gedeeld door de
// show (vakje = vraag) en het memory-spel (vakje = paar); 'now' mag ontbreken.
function renderSegBar(el, total, done, hasNow) {
  if (!el) return;
  el.innerHTML = '';
  el.setAttribute('aria-valuenow', done);
  el.setAttribute('aria-valuemax', total);
  const now = hasNow === false ? -1 : done;
  for (let i = 0; i < total; i++) {
    const seg = document.createElement('span');
    if (i < done) seg.className = 'done';
    else if (i === now) seg.className = 'now';
    el.appendChild(seg);
  }
}
function drawQuestion() {
  const q = G.qs[G.idx];
  $('question-card').classList.toggle('golden', !!q.gold);
  // telmodus is lees-vrij: geen tekstbanner maar een emoji-signaal (de gesproken
  // "Gouden vraag!"-aankondiging zit in de vraag-prompt, zie renderQuestion)
  // Overal hetzelfde, lees-vrije gouden-vraag-signaal (emoji voorop, ook in de rekenmodus).
  $('gold-banner').textContent = q.gold ? '🌟 3× 💎 🌟' : '';
  // "nog eens voorlezen" hoort alleen bij de lees-vrije telmodus (in de rekenmodus
  // staat de som gewoon te lezen en wordt er niets uitgesproken)
  $('btn-replay').style.display = G.count ? 'flex' : 'none';
  if (G.count) { drawCountQuestion(q); return; }
  const shown = G.mode === 'typ' ? G.input : '?';
  $('question-text').innerHTML = q.tmpl.replace('@', `<span class="q-blank">${shown}</span>`);
}
function numpadPress(n) {
  if (!G || G.lock) return;
  if (n === 'del') { G.input = G.input.slice(0, -1); }
  else if (n === 'ok') { if (G.input !== '') submitAnswer(parseInt(G.input, 10), null); return; }
  else if (G.input.length < 3) { G.input += n; sndClick(); }
  drawQuestion();
}
document.addEventListener('keydown', e => {
  if (!G || G.lock) return;
  if (!$('screen-game').classList.contains('active')) return;
  if (G.mode !== 'typ') return;
  if (e.key >= '0' && e.key <= '9') numpadPress(e.key);
  else if (e.key === 'Backspace') numpadPress('del');
  else if (e.key === 'Enter') numpadPress('ok');
});

/* Spotlight-bonus (12 seconden): het gouden randje onderin de somkaart dooft langzaam.

   De teller hangt aan G (de show die nu loopt), en stopSpot kan hem dus alleen
   nog vinden zolang díe G er staat. Vervangt er iets G zonder eerst te stoppen,
   dan is de teller niet meer te bereiken maar loopt hij wel door: elke 100ms,
   tot het tabblad dicht gaat -- en zodra het eindscherm G op null zet, elke 100ms
   met een fout erbij. Eén vergeten show is één teller die nooit meer ophoudt.

   Vandaar dat elke tik eerst kijkt of hij nog bij de huidige show hóórt en
   zichzelf anders opruimt. Dat is een regel die geen enkele aanroeper hoeft te
   kennen: een teller die zijn show kwijt is, stopt uit zichzelf. startLevel zet
   er nog een slot voor (zie daar), maar dit is het vangnet eronder. */
function startSpot() {
  stopSpot();
  G.spot = 100;
  $('spotlight-bar').style.width = '100%';
  const id = setInterval(() => {
    if (!G || G.timer !== id) { clearInterval(id); return; }
    G.spot = Math.max(0, G.spot - 100 / 120);
    $('spotlight-bar').style.width = G.spot + '%';
    if (G.spot <= 0) stopSpot();
  }, 100);
  G.timer = id;
}
function stopSpot() {
  if (G && G.timer) { clearInterval(G.timer); G.timer = null; }
}

function submitAnswer(val, btnEl) {
  if (!G || G.lock) return;
  if (btnEl && btnEl.getBoundingClientRect) {   // tactiel: ripple vanaf de aangetikte tegel
    const r = btnEl.getBoundingClientRect();
    tapRipple(r.left + r.width / 2, r.top + r.height / 2);
  }
  const q = G.qs[G.idx];
  const p = P();
  if (val === q.ans) {
    // ---- juist ----
    G.lock = true;
    stopSpot();
    hideToast();   // een hint van een vorige misser mag het "Goed zo!"-moment niet overschaduwen
    const firstTry = !G.retried;                 // in één keer goed?
    updatePerf(p, true, firstTry && G.spot > 0);
    // per-bewerking-beheersing (voor klaarheid extra uitdagingen) + drie-getallen-tempo
    // G.spot staat nog op de stand van het moment van antwoorden (stopSpot laat 'm staan)
    if (q.kind === 'classic') updateOpAcc(p, q.op, true, firstTry, fastEnough(G.mode, G.spot));
    else if (q.kind === 'chain') updateChainAcc(p, true, firstTry);
    else if (q.count) updateCountAcc(p, true, firstTry);
    p.stats.correct++;
    // enkel een directe treffer telt als "beheerst" -- en zet het onderhoudsinterval
    // van een al geleerde som verder vooruit (zie toLearned/bumpLearned)
    if (firstTry) { decWeak(p, q); bumpLearned(p, q); }
    let gain = 2;
    if (firstTry && G.spot > 0) gain += 1;       // spotlight-bonus enkel bij directe treffer
    G.streak++;
    let streakBonus = false;
    if (G.streak % 3 === 0) { gain += 2; streakBonus = true; }
    if (q.gold) { gain *= 3; p.goldHits++; }     // gouden vraag: 3× zoveel
    G.earned += gain;
    p.diamonds += gain;
    // Stille publieksteller (geen meter meer op het scherm, zie startLevel): hoe béter
    // je speelt, hoe sneller hij volloopt. Vol = een extra show, met bonusdiamanten.
    let fanMul = 1;
    if (!firstTry) fanMul = 0.5;               // een herkansing laat het publiek maar half zo hard juichen
    else {
      if (G.spot > 0) fanMul += 0.5;           // snel, binnen de spotlight
      if (streakBonus) fanMul += 0.5;          // op een streak-mijlpaal (3 op een rij)
      if (q.gold) fanMul += 1;                 // gouden vraag laat de zaal helemaal los
    }
    G.fan += G.fanStep * fanMul;
    let encore = false;
    if (G.fan >= 100) {
      G.fan -= 100; encore = true;             // overschot blijft staan voor een mogelijke tweede encore
      p.diamonds += 5; G.earned += 5; p.encores++;
    }
    save();
    // De teller wacht op wat eraan komt (zie telStraks): eerst vliegen ze, dan
    // staat het er. Bewaren doet save() hierboven, meteen en zonder te wachten.
    telStraks($('game-diamonds'), p.diamonds);
    // verdiende diamanten vliegen naar de teller — zelfde taal als kopen in de kleedkamer
    flyDiamonds(btnEl || $('question-card'), $('game-diamonds'), q.gold ? 3 : 2);
    if (btnEl) btnEl.classList.add('good');
    if (G.mode === 'typ') $('question-text').innerHTML = q.tmpl.replace('@', `<span class="q-blank done">${q.ans}</span>`);
    if (encore) { sndWin(); confetti(24); showPraise('🎆 EXTRA SHOW!', '💎 +5 bonus'); }
    else if (q.gold) { sndStreak(); confetti(10); showPraise('🌟 Gouden vraag!', '💎 +' + gain); }
    else if (streakBonus) { sndStreak(); showPraise('🔥 3 op een rij!', '💎 +' + gain); }
    else if (!firstTry) { sndGood(); showPraise('Goed zo, je had het!', '💎 +' + gain); }
    else { sndGood(); showPraise(pick(PRAISE), '💎 +' + gain); }
    if (G.count) speak(pick(['Super!', 'Goed zo!', 'Knap gedaan!', 'Ja, goed!', 'Wauw!']));
    const trofees = checkTrophies(p);
    if (trofees.length) { save(); updateTroDot(); }   // stipje aan; het feestje volgt bij 'Open trofee'
    dance('game-avatar-inner');
    zaalJuicht();   // de zaal licht één tel op -- het enige wat er nieuw bij komt
    // 950 i.p.v. 1100 voor een gewoon goed antwoord: de knop plopt, zij danst, de
    // zaal licht op -- na een seconde is dat alle drie gezegd en wordt wachten
    // wachten. Een gouden vraag en een extra show mogen wél even duren; die zijn
    // bedoeld om op te vallen.
    setTimeout(nextStep, encore || q.gold ? 1400 : 950);
    return;
  }
  // ---- fout ---- (zachte, vriendelijke animatie)
  updatePerf(p, false, false);
  p.stats.wrong++;
  incWeak(p, q);                                  // deze som vaker laten terugkomen
  demoteLearned(p, q);                            // stond hij in onderhoud? dan is hij weer zwak
  G.streak = 0;
  sndWrong();
  slipNote();
  // "Niet die -- probeer nog eens", en klaar. 420ms i.p.v. 700: een misser mag
  // duidelijk zijn maar hoort niet ook nog te dúren. De rode tegel blijft staan
  // (die zegt wélke), de kaart schudt kort en is dan weer gewoon de som.
  $('question-card').classList.add('wobble');
  setTimeout(() => $('question-card').classList.remove('wobble'), 420);
  // een misser op een speciale vraag maakt de ronde "niet schoon" → frequentie omlaag
  if (q.kind === 'missing') G.missDirty = true;
  else if (q.kind === 'chain') G.chainDirty = true;
  if (!G.retried) {
    // eerste misser: nog géén hartje kwijt, wél een tweede kans met een hint
    G.retried = true;
    G.misses++;
    stopSpot(); G.spot = 0; $('spotlight-bar').style.width = '0%';
    save();
    if (btnEl) { btnEl.classList.add('bad'); btnEl.disabled = true; }  // deze keuze uitschakelen
    if (G.mode === 'typ') { G.input = ''; drawQuestion(); }
    if (G.count) { countMissSpeak(q, val); showToast('🤔'); }   // lees-vrij: gesproken hint, geen tekst
    else showToast(hintFor(q, val));
    return;                                        // G.lock blijft false → kind mag opnieuw antwoorden
  }
  // tweede misser: hartje kwijt, antwoord tonen en door
  G.lock = true;
  stopSpot();
  G.errors++;
  // definitief fout telt mee in de per-bewerking-beheersing / drie-getallen-tempo
  if (q.kind === 'classic') updateOpAcc(p, q.op, false, false);
  else if (q.kind === 'chain') updateChainAcc(p, false, false);
  else if (q.count) updateCountAcc(p, false, false);
  save();
  if (btnEl) btnEl.classList.add('bad');
  // laat het juiste antwoord oplichten zodat het kind ziet wat het moest zijn
  if (G.count) {
    countReveal(q);                               // juiste hoeveelheid hardop meetellen, geen tekst
    loseHeart();
    showToast('👉', nextStep);
    return;
  }
  if (G.mode === 'kies') {
    const cb = [...document.querySelectorAll('.choice-btn')].find(b => parseInt(b.dataset.v, 10) === q.ans);
    if (cb) cb.classList.add('good');
  }
  loseHeart();
  showToast(q.tmpl.replace('@', q.ans), nextStep, 'tik om verder te gaan 👉');
}
// het verloren hartje breekt even zichtbaar (💔 + schudden) voor het wit wordt
/* De zaal reageert op een goed antwoord: het voetlicht trekt aan en de wereld
   erachter wordt een tel helderder. Eén klasse, twee opacity-overgangen in de CSS
   -- geen tweede confetti, geen extra geluid, niets dat over de antwoordknop en de
   dansende ster heen komt.

   Dat dit in élke wereld hetzelfde doet is geen bijvangst maar de bedoeling: een
   goed antwoord hoort overal hetzelfde te voelen. De kleur van de gloed komt van
   het zaallicht en niet van de wereld -- een wereld verandert de sfeer, niet wat
   "goed" betekent. */
let zaalTimer = null;
function zaalJuicht() {
  const z = $('game-venue');
  if (!z || motionOff()) return;
  z.classList.add('juist');
  clearTimeout(zaalTimer);                        // snel achter elkaar goed: één gloed, geen stapel
  zaalTimer = setTimeout(() => z.classList.remove('juist'), 380);
}
function loseHeart() {
  const el = $('notes-left');
  const left = Math.max(0, 3 - G.errors);
  el.textContent = '❤️'.repeat(left) + '💔' + '🤍'.repeat(Math.max(0, 2 - left));
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => { el.classList.remove('shake'); if (G) el.textContent = livesText(); }, 900);
}
// levens: 3 hartjes, verloren kansen worden een gebroken hartje
function livesText() {
  const left = Math.max(0, 3 - G.errors);
  return '❤️'.repeat(left) + '🤍'.repeat(3 - left);
}
function slipNote() {
  const el = $('slip-note');
  el.textContent = pick(['🎵', '🎶', '😅']);
  el.classList.remove('go');
  void el.offsetWidth;
  el.classList.add('go');
}
function nextStep() {
  hideToast();
  if (!G) return;
  if (G.errors >= 3) { endLevel(false); return; }
  G.idx++;
  if (G.idx >= G.total) endLevel(true);
  else renderQuestion();
}

// Easter egg 🍺: 5x tikken op het pintje-kaartje in de winkel (los aantikken,
// hoeft niet gekocht/uitgerust te zijn) — en ze heft 'm toastend: "Schol!"
// met een klein bubbelfeestje.
let pintjeTaps = 0, pintjeTapTimer = null;
function bumpPintjeTaps(el) {
  clearTimeout(pintjeTapTimer);
  pintjeTaps++;
  pintjeTapTimer = setTimeout(() => { pintjeTaps = 0; }, 3000);
  if (pintjeTaps < 5) return;
  pintjeTaps = 0;
  // Positie nú al vastleggen en niet het element bewaren: sinds fase 5B blijft het
  // kaartje bij een gewone tik meestal staan, maar een aankoop bouwt het rek wél
  // opnieuw op. De plek op het scherm klopt in beide gevallen.
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 10; i++) setTimeout(() => sparkleAt(r, ['🍺', '🍻', '🫧']), i * 70);
  showPraise('Schol! 🍻');
  sndCoin();
  buzz([0, 20, 60, 20]);
}

/* Wat deze show waard was, in sterren. Puur rekenwerk op de stand van G: geen
   profiel, geen scherm, niets dat blijft staan.

   Rekenmodus telt missers hard (foutloos = 3). De telmodus (kleuters) is milder
   en kijkt naar hoeveel er over de héle ronde in één keer goed ging, zodat één
   verbeterde hapering een sterke ronde niet meteen degradeert. */
function showStars(g) {
  if (!g.count) return g.misses === 0 ? 3 : g.misses === 1 ? 2 : 1;
  const ratio = g.total > 0 ? (g.total - g.misses) / g.total : 1;
  return ratio >= 0.85 ? 3 : ratio >= 0.55 ? 2 : 1;
}
/* Een geslaagde show wegschrijven. Álles wat blíjft staan gebeurt hier en
   nergens anders: de sterren, de positie, de beloningen van de wereld, de
   carrièrerang, de trofeeën -- en de save() die dat vastlegt.

   Los van het tekenen, omdat het twee vragen zijn die elkaar niet nodig hebben.
   "Wat verandert er aan dit kind" is nu te lezen (en te testen) zonder één
   DOM-regel, en het eindscherm hoeft niet te weten in welke volgorde beloningen
   worden uitgedeeld. Die volgorde luistert namelijk wél nauw, en dat is precies
   waarom ze bij elkaar hoort te staan:

     vóór de sterren   wasUit/wasVol -- alleen zo is "net gebeurd" te herkennen
     grantWorldRewards zet de perfecte-wereldtrofee meteen op 'behaald', zodat
                       checkTrophies hem daarna niet ook nog als cadeautje in de
                       kast legt (dat feest heeft hij al)
     save() als laatste een kind dat de app wegklikt terwijl de confetti valt,
                       heeft haar spulletje gewoon

   Geeft terug wat er níeuw is -- niet wat er al stond, want daar is geen
   eindscherm voor:

     { stars, beter, bonus, travel, feest, rankUp, trofees }
       stars    de sterren van déze show (een mindere poging laat de oude staan)
       beter    dit was een geslaagde herkansing van een eerdere show
       bonus    de 💎 die die sterren opleveren
       travel   { from, to } als de ster een halte opschuift, anders null
       feest    de wereld die net uit en/of perfect werd, of null
       rankUp   { rank, bonus } bij een nieuwe ster-status, anders null
       trofees  de trofeeën die nét klaar zijn komen te liggen               */
function applyShowResult(p, lvl, wl, stars) {
  const bonus = stars * 5;
  p.diamonds += bonus;
  /* Wat stond er vóór deze show? Alleen dan kan dit een verbetering zijn: een
     eerste keer is geen "beter dan vorige keer". Ging het mínder goed, dan
     blijft het oude resultaat gewoon staan (Math.max) én zegt het eindscherm
     daar niets over -- terugkomen mag nooit iets kunnen kosten. */
  const vorige = p.stars[lvl] || 0;
  const beter = vorige > 0 && stars > vorige;
  const wasUit = worldDone(p, wl.index);
  const wasVol = worldProgress(p, worldForIndex(wl.index)).vol;
  p.stars[lvl] = Math.max(vorige, stars);
  /* Vooruit gaat alleen de vóórste halte, en nooit voorbij het einde van wat er
     geschreven is. Die klem is fase 4A: hiervoor liep p.level door in het
     oneindige en bezette het levelnummers die een latere wereld zou opeisen.
     Nu stopt hij op WORLD_LAST + 1 -- "alles uit" -- en blijft daar tot er een
     wereld bijkomt. Een show overdoen (lvl < p.level) schuift sowieso niets op;
     een toegift in de laatste wereld dus ook niet. */
  let travel = null;
  if (lvl === p.level && p.level <= WORLD_LAST) {
    p.level++;
    travel = { from: lvl, to: p.level };   // de ster reist zichtbaar door op de kaart
  }
  const beloond = grantWorldRewards(p, wl.index);
  const netUit = !wasUit && worldDone(p, wl.index) ? beloningItem(wl.world) : null;
  const netVol = !wasVol && beloond.perfect ? beloond.perfect : null;
  const feest = (netUit || netVol) ? { wereld: wl.world, spul: netUit, perfect: netVol } : null;
  // carrièrerang: net genoeg sterren voor een hogere rang? -> bonus (zie checkRankUp)
  const rankUp = checkRankUp(p);
  const trofees = checkTrophies(p);
  save();
  return { stars, beter, bonus, travel, feest, rankUp, trofees };
}

function endLevel(success) {
  stopSpot();
  const p = P();
  const lvl = G.lvl;
  applyRampUpdates(p, G);   // frequentie-trap van de extra uitdagingen bijstellen
  if (G.count) advanceCountStage(p, success);   // telmodus: fase mee laten klimmen/zakken
  /* De twee dingen die pas ná het eindscherm gevierd worden (zie de staart van
     deze functie): een nieuwe ster-status, en een wereld die net uit of perfect
     werd. Bij een mislukte show blijven ze allebei leeg. */
  let rankUp = null, feest = null;
  // zelfde kop als tijdens het optreden: wereld + 💎-teller, zodat dit scherm
  // aanvoelt als het vervolg van dezelfde show i.p.v. een los tussenschermpje
  const wl = worldFor(lvl);
  $('end-lvl-label').innerHTML = `${wl.world.icon} ${wl.world.name}`
    + `<span class="world-sub">Show ${wl.nr} / ${wl.levels}</span>`;
  // Wat er van de stille publieksteller overblijft telt altijd mee: +1 💎 per volle
  // 25%, zodat inspanning ook loont als de extra show (100%) net niet gehaald is.
  // Sinds fase 1 heeft die bonus geen eigen vakje meer op het eindscherm -- hij zit
  // gewoon in de 💎 die je deze show verdiend hebt (zie verdiend hieronder).
  const fanBonus = Math.floor(G.fan / 25);
  if (fanBonus > 0) p.diamonds += fanBonus;
  const verdiend = G.earned + fanBonus;
  $('end-avatar').innerHTML = pasLaag(avatarSVG(p, 150));
  applyStage($('end-stage'), p);
  // hetzelfde decor als tijdens de show: het applaus valt in de zaal waar ze stond
  applyVenue($('screen-end'), wl.world);
  naShowLvl = lvl;   // élke uitgang van dit scherm komt straks op déze halte uit
  if (success) {
    /* Alles wat er aan dit kind verandert, in één keer -- zie applyShowResult.
       Wat eruit komt is materiaal voor het scherm hieronder, en niets anders:
       vanaf hier wordt er niets meer bewaard. */
    const r = applyShowResult(p, lvl, wl, showStars(G));
    const { stars, beter, bonus, trofees } = r;
    if (r.travel) pendingTravel = r.travel;   // de ster reist zichtbaar door op de kaart
    rankUp = r.rankUp;
    feest = r.feest;
    $('end-title').textContent = `🎉 Show ${wl.nr} was geweldig!`;
    renderEndStars(stars);
    // de juichtekst groeit mee met de prestatie
    // Een verbeterde herkansing krijgt zijn eigen regel: dát is het moment waar
    // de gouden haltes op de kaart (.tour-stop.perfect) naartoe lokken.
    const juich = beter
      ? (stars === 3 ? 'Nog beter — nu alle drie de sterren! 🤩' : 'Beter dan de vorige keer! ⭐')
      : stars === 3 ? 'Foutloos — het publiek gaat uit zijn dak! 🤩'
      : stars === 2 ? 'Het publiek juicht en danst mee! 👏'
      : 'Het publiek klapt hard voor je! 👏';
    $('end-text').textContent = juich;
    // Altijd deze twee, altijd in deze volgorde, altijd even breed.
    $('end-earn').innerHTML =
        `<span class="earn-chip dia">💎 +${verdiend}</span>`
      + `<span class="earn-chip star">⭐ +${bonus}</span>`;
    /* Eén mijlpaal, en alleen als er écht iets gehaald is: een nieuwe ster-status
       of een trofee die klaarligt. Allebei dezelfde gouden pil, allebei tikbaar.

       Wat hier weg is: "🎯 nog 13 ⭐ tot Clubster" -- de stille vooruitblik die na
       bijna élke show onder de sterren stond. Dat was het laatste stukje ster-status
       dat ongevraagd in beeld kwam, en het vertelde een kind precies het verkeerde:
       niet wat ze net gehaald heeft, maar hoeveel er nóg niet af is, met een rangnaam
       erbij ("Platinaster") die op dat moment nergens naar verwijst. Dezelfde
       opruiming als "⭐ 13/24" op de kaart en de balken in de kast: een teller die
       vanzelf oploopt is geen prestatie, en een kind van vijf leest geen breuk.

       De ster-status zelf verandert niet: hij betaalt zijn diamanten (checkRankUp),
       hij krijgt zijn feestje (rankUpCelebrate), en de ladder gaat open vanaf de pil
       hieronder -- op het moment dat er iets over te zeggen valt, en dán vertelt hij
       ook meteen wat de volgende status is. */
    const mile = $('end-milestone');
    mile.innerHTML = '';
    if (rankUp) {
      mile.innerHTML = `<button class="gold-pill" type="button">${rankUp.rank.emoji} ${rankUp.rank.name}! +${rankUp.bonus} 💎</button>`;
      mile.firstChild.onclick = () => { sndClick(); openCareer(); };
    } else if (trofees.length) {
      const label = trofees.length === 1 ? '🎁 Nieuwe trofee klaar!' : `🎁 ${trofees.length} nieuwe trofeeën klaar!`;
      mile.innerHTML = `<button class="gold-pill" type="button">${label}</button>`;
      mile.firstChild.onclick = () => { sndClick(); openTrophies(); };
    }
    $('btn-end-next').textContent = '🗺️ Verder op tournee';
    $('btn-end-next').onclick = () => { sndClick(); goMap(lvl); };
    /* Net een wereldspulletje verdiend? Dan gaat de tweede knop niet naar "de
       kleedkamer" maar naar dát spulletje. Het feestje hierboven laat het één keer
       zien en is daarna weg; zonder deze brug moet een kind zelf bedenken in welke
       van de zeven laden het terechtgekomen is. Eén show later is het gewoon weer
       de kleedkamer -- dit is een wegwijzer, geen tweede knop. */
    const nieuwSpul = feest && feest.spul;
    $('btn-end-alt').textContent = nieuwSpul ? `👕 Pas je ${nieuwSpul.name}` : '👕 Kleedkamer';
    $('btn-end-alt').onclick = nieuwSpul
      ? () => { sndClick(); openKleedkamerItem(nieuwSpul.id); }
      : () => { sndClick(); openKleedkamer(); };
    sndWin();
    confetti(40);
    finaleDance('end-avatar', 6);   // grote slotchoreografie
  } else {
    // Mislukt: er komt geen ster bij en er schuift niets op. Alleen de 💎 van de
    // publieksteller hierboven zijn al bijgeschreven, en die horen bewaard.
    save();
    $('end-title').textContent = '🎭 Bijna!';
    $('end-stars').textContent = '💪';
    $('end-text').textContent = 'Oefening baart kunst — probeer het nog eens!';
    $('end-milestone').innerHTML = '';
    // zelfde twee vakjes als bij een geslaagde show, zodat het scherm niet
    // ineens een andere vorm heeft: alleen wat je verdiend hebt, staat erin
    $('end-earn').innerHTML =
        `<span class="earn-chip dia">💎 +${verdiend}</span>`
      + `<span class="earn-chip star">⭐ +0</span>`;
    $('btn-end-next').textContent = '🔁 Opnieuw proberen';
    $('btn-end-next').onclick = () => { sndClick(); startLevel(lvl); };
    $('btn-end-alt').textContent = '🗺️ Kaart';
    $('btn-end-alt').onclick = () => { sndClick(); goMap(lvl); };
  }
  telNu($('end-diamonds'), p.diamonds);
  G = null;
  show('screen-end');
  /* Na het eindscherm hoogstens twee grote momenten, en nooit tegelijk: eerst de
     ster-status (die sluit zichzelf na ~2 tellen), dán het wereldfeest. In de
     praktijk vallen ze zelden samen -- een rang komt op 12/30/60... sterren en een
     wereld is om de acht shows -- maar als het gebeurt horen ze achter elkaar en
     niet over elkaar.

     Het wereldfeest komt ná het eindscherm en niet erin: de sterren van déze show
     zijn eerst, en de wereld is het laagje daarboven. Daarna gaat "Verder op
     tournee" gewoon naar de kaart, waar de reis of de nieuwe wereld wacht -- daar
     is niets aan veranderd.

     "EERST" IS EEN TIJDSTIP EN GEEN VOLGORDE IN DE CODE. Hier stond 650ms, en dat
     was minder dan de ceremonie hierboven duurt: de tweede ster landt op 720ms,
     de derde op 1020ms en het kanon van foutloos gaat op 1160ms. Een kind dat net
     drie sterren haalde zag dus precies het zeldzaamste stuk van haar eindscherm
     achter een schermvullende laag verdwijnen -- en hoe beter de show, hoe meer er
     afgedekt werd. Nu wacht dit moment op de ceremonie zelf (naSterren), en niet
     op een getal dat toevallig ooit groot genoeg leek. */
  const naFeest = feest ? () => wereldFeest(feest) : null;
  const wacht = naSterren();
  if (rankUp) setTimeout(() => rankUpCelebrate(rankUp.rank, naFeest), wacht);
  else if (naFeest) setTimeout(naFeest, wacht);
}
/* De klok van het sterrenmoment.

   Deze tijden stonden als losse getallen in renderEndStars, en dat was prima
   zolang niemand erop wachtte. Er wacht er wél iets op: endLevel staat het
   scherm daarna af aan een ster-status of een wereldfeest, en dat mag pas als
   deze ceremonie uitgespeeld is (zie naSterren). Twee plekken die met de hand
   op hetzelfde getal gehouden moeten worden lopen uit elkaar -- dat is precies
   hoe het eerder misging: de overlay stond op 650ms en dekte de tweede en derde
   ster af. Dus staan ze hier, één keer, met een naam. */
const STERCEREMONIE = {
  eerste: 420,   // wanneer de eerste ster landt
  tussen: 300,   // en elke volgende zoveel later
  land: 480,     // hoe lang één ster erover doet om neer te komen
  knal: 1160,    // foutloos: het confetti-kanon vanuit de sterrenrij
  puls: 420,     // en het opveren van die rij zelf
  // Beperkte beweging: de sterren staan er meteen (zie hieronder), dus er valt
  // niets af te wachten. Alleen even ademen, zodat het volgende moment niet in
  // hetzelfde beeldje over het eindscherm heen valt.
  stil: 320,
};
/* Wanneer de ceremonie voorbij is: de derde ster staat stil én het kanon van
   3-op-3 is uitgevallen. Dit is de enige plek waar "het sterrenmoment is klaar"
   als tijdstip bestaat. */
STERCEREMONIE.totaal = Math.max(
  STERCEREMONIE.eerste + 2 * STERCEREMONIE.tussen + STERCEREMONIE.land,
  STERCEREMONIE.knal + STERCEREMONIE.puls);
// Hoe lang het eindscherm voor zichzelf houdt voordat er iets groters overheen mag.
function naSterren() { return motionOff() ? STERCEREMONIE.stil : STERCEREMONIE.totaal; }

// Het sterrenmoment: de verdiende sterren ploppen één voor één op, elk met een
// hoger klankje; een gemiste ster verschijnt stil en dof. Dé ceremonie van het
// eindscherm — bij prefers-reduced-motion staan ze er meteen.
function renderEndStars(n) {
  const wrap = $('end-stars');
  wrap.innerHTML = '';
  const still = motionOff();
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    s.textContent = '⭐';
    if (i >= n) s.className = 'dim';
    wrap.appendChild(s);
    if (still || !s.animate) continue;
    s.style.opacity = '0';
    setTimeout(() => {
      s.style.opacity = '';
      if (i < n) {
        s.animate([
          { transform: 'scale(0) rotate(-30deg)', opacity: 0 },
          { transform: 'scale(1.45) rotate(8deg)', opacity: 1, offset: .6 },
          { transform: 'scale(1) rotate(0deg)', opacity: 1 }
        ], { duration: STERCEREMONIE.land, easing: 'ease-out' });
        buzz(20);
        beep(660 + i * 170, 0.2, 0, 'triangle', 0.16);
      } else {
        s.animate([{ opacity: 0 }, { opacity: .25 }], { duration: 400, easing: 'ease-out' });
      }
    }, STERCEREMONIE.eerste + i * STERCEREMONIE.tussen);
  }
  // Foutloos (3 sterren): een confetti-kanon vanuit de sterren zodra ze staan.
  if (n === 3 && !still) {
    setTimeout(() => {
      const r = wrap.getBoundingClientRect();
      confettiBurst(r.left + r.width / 2, r.top + r.height / 2, 26, '⭐');
      if (wrap.animate) wrap.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: STERCEREMONIE.puls, easing: 'ease-out' });
    }, STERCEREMONIE.knal);
  }
}

/* ================= Kleedkamer (passen én kopen) ================= */
/* ---- Item-miniaturen: teken het echte kledingstuk in zijn kleur (en patroon)
   i.p.v. een kaal kleurbolletje. Emoji-items (dieren, instrumenten, pintje,
   toverstaf, extra's) houden hun emoji; podia krijgen hun eerste deco-emoji in
   de bol. De vormen komen uit dezelfde tekencode als de paspop. ---- */
let thumbUid = 0;
const RB_STOPS = '<stop offset="0" stop-color="#ff5f6d"/><stop offset=".3" stop-color="#ffc371"/><stop offset=".6" stop-color="#8bd450"/><stop offset="1" stop-color="#47c9ff"/>';
// De miniaturen tekenen wat dít kind straks aan heeft: op de jongens-basis
// hangt er een shirt met broek in het rek en geen jurk. Zelfde item, zelfde
// prijs, zelfde trofee -- alleen de vorm volgt de basis, net als bij de pop.
const OUTFIT_THUMBS = {
  meisje: {
    view: '62 104 76 108', cls: '',
    shape: dc => `<path d="M84 106 L66 196 Q100 209 134 196 L116 106 Q100 113 84 106 Z" fill="${dc}" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>`,
    pat: {
      stars: `<text x="86" y="145" font-size="14" fill="#fff176">★</text><text x="108" y="165" font-size="12" fill="#fff176">★</text><text x="78" y="185" font-size="12" fill="#fff176">★</text><text x="112" y="192" font-size="14" fill="#fff176">★</text>`,
      hearts: `<text x="84" y="146" font-size="13" fill="#fff">♥</text><text x="106" y="164" font-size="11" fill="#ffcdd2">♥</text><text x="79" y="184" font-size="11" fill="#ffcdd2">♥</text><text x="110" y="190" font-size="13" fill="#fff">♥</text>`,
      magic: `<text x="85" y="148" font-size="15" fill="#ffd54f">★</text><text x="108" y="172" font-size="11" fill="#ffd54f">★</text><text x="80" y="188" font-size="11" fill="#ffd54f">★</text><path d="M112 138 a9 9 0 1 0 6 15 a11 11 0 1 1 -6 -15 Z" fill="#ffe082"/>`,
      disco: `<circle cx="90" cy="140" r="4" fill="#fff" opacity=".8"/><circle cx="110" cy="155" r="4" fill="#80deea" opacity=".8"/><circle cx="85" cy="175" r="4" fill="#f48fb1" opacity=".8"/><circle cx="113" cy="182" r="4" fill="#fff59d" opacity=".8"/>`,
      ohl: `<path d="M86 110 L76 192 L86 195 L94 111 Z" fill="#2e7d32"/><path d="M114 110 L124 192 L114 195 L106 111 Z" fill="#c62828"/><path d="M67 190 Q100 205 133 190 L134 196 Q100 209 66 196 Z" fill="#1b1b1b"/>`,
      scales: `<g fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2.5"><path d="M82 152 a7 7 0 0 1 14 0 M96 152 a7 7 0 0 1 14 0"/><path d="M80 168 a7 7 0 0 1 14 0 M94 168 a7 7 0 0 1 14 0 M108 168 a7 7 0 0 1 14 0"/><path d="M84 184 a7 7 0 0 1 14 0 M98 184 a7 7 0 0 1 14 0"/></g>`,
    },
  },
  jongen: {
    // Mouwtjes en een echte broek i.p.v. twee kokers: zonder die T-vorm zijn
    // shirt en broek even breed en wordt het één lange pijp die niets zegt.
    // Vak-verhouding blijft dicht bij die van de jurk, zodat een shirt in het rek
    // niet ineens veel smaller oogt dan een jurk ernaast.
    view: '62 98 76 120', cls: 'smal',
    shape: dc => `<path d="M82 158 L79 208 Q87 213 95 208 L100 188 L105 208 Q113 213 121 208 L118 158 Z" fill="${dc}" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>`
      + `<path d="M86 104 L70 118 L77 131 L83 124 L78 166 L122 166 L117 124 L123 131 L130 118 L114 104 Q100 112 86 104 Z" fill="${dc}" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>`,
    // De kledingstukken staan hier op dezelfde plek als op de pop, dus dezelfde
    // patronentabel past precies -- en dan kán het miniatuur ook niet meer uit de
    // pas lopen met wat je straks aanhebt. (De jurk heeft in de winkel wél een
    // eigen, vereenvoudigde vorm en houdt daarom zijn eigen tabel hierboven.)
    pat: PAT_SHIRT,
  },
};
function dressThumb(it, base) {
  const uid = ++thumbUid;
  const t = OUTFIT_THUMBS[base] || OUTFIT_THUMBS[DEFAULT_BASE];
  const rainbow = it.color === 'RAINBOW';
  const dc = rainbow ? `url(#dt${uid})` : it.color;
  const defs = rainbow ? `<defs><linearGradient id="dt${uid}" x1="0" y1="0" x2="1" y2="1">${RB_STOPS}</linearGradient></defs>` : '';
  const inner = (it.pattern && t.pat[it.pattern]) || '';
  return `<svg viewBox="${t.view}" xmlns="http://www.w3.org/2000/svg">${defs}${t.shape(dc)}${inner}</svg>`;
}
const HAIR_THUMBS = {
  meisje: { view: '38 22 124 88', draw: hc => hairBackStaartjes(hc) + `<circle cx="100" cy="72" r="32" fill="${SKIN}"/>` + hairFrontStaartjes(hc) },
  // krapper uitgesneden dan bij de staartjes: kort haar bedekt minder, dus zonder
  // strakkere uitsnede zou de kleur -- het enige wat je hier koopt -- verzuipen
  jongen: { view: '62 22 76 78',  draw: hc => hairBackKort(hc)      + `<circle cx="100" cy="72" r="32" fill="${SKIN}"/>` + hairFrontKort(hc) },
};
function hairThumb(it, base) {
  const uid = ++thumbUid;
  const t = HAIR_THUMBS[base] || HAIR_THUMBS[DEFAULT_BASE];
  const rainbow = it.color === 'RAINBOW';
  const hc = rainbow ? `url(#ht${uid})` : it.color;
  const defs = rainbow ? `<defs><linearGradient id="ht${uid}" x1="0" y1="0" x2="1" y2="1">${RB_STOPS}</linearGradient></defs>` : '';
  return `<svg viewBox="${t.view}" xmlns="http://www.w3.org/2000/svg">${defs}${t.draw(hc)}</svg>`;
}
function shoesThumb(it) {
  const uid = ++thumbUid;
  const rainbow = it.color === 'RAINBOW';
  const c = rainbow ? `url(#st${uid})` : it.color;
  const defs = rainbow ? `<defs><linearGradient id="st${uid}" x1="0" y1="0" x2="1" y2="1">${RB_STOPS}</linearGradient></defs>` : '';
  return `<svg viewBox="2 0 56 46" xmlns="http://www.w3.org/2000/svg">${defs}
    <line x1="20" y1="8" x2="19" y2="28" stroke="#ffdcb8" stroke-width="7" stroke-linecap="round"/>
    <line x1="40" y1="8" x2="41" y2="28" stroke="#ffdcb8" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="18" cy="33" rx="13" ry="7" fill="${c}"/><ellipse cx="42" cy="33" rx="13" ry="7" fill="${c}"/></svg>`;
}
function micThumb(it) {
  const uid = ++thumbUid;
  const rainbow = it.color === 'RAINBOW';
  const c = rainbow ? `url(#mt${uid})` : it.color;
  const defs = rainbow ? `<defs><linearGradient id="mt${uid}" x1="0" y1="0" x2="1" y2="1">${RB_STOPS}</linearGradient></defs>` : '';
  return `<svg viewBox="0 0 48 62" xmlns="http://www.w3.org/2000/svg">${defs}
    <rect x="20" y="24" width="8" height="34" rx="4" fill="#546e7a"/>
    <rect x="14" y="52" width="20" height="6" rx="3" fill="#455a64"/>
    <circle cx="24" cy="16" r="15" fill="${c}" stroke="rgba(0,0,0,.28)" stroke-width="1.5"/>
    <path d="M14 12 h20 M14 16 h20 M14 20 h20" stroke="rgba(0,0,0,.16)" stroke-width="1.3"/>
    <ellipse cx="19" cy="10" rx="4" ry="3" fill="rgba(255,255,255,.5)"/></svg>`;
}
// Elk miniatuur komt uit hetzelfde vak (.item-thumb); alleen de inhoud verschilt.
function itemThumb(it, base) {
  base = base || curBase();
  const zone = (inner, extra) => `<div class="item-thumb${extra ? ' ' + extra : ''}">${inner}</div>`;
  /* Een item mag zijn eigen miniatuur meebrengen -- dezelfde afspraak als acc.draw
     bij de paspop, maar dan in zijn eigen vakje (52px hoog) i.p.v. in de 200x250 van
     de pop. De zes wereldbeloningen doen dat (fase 4D.2); de rest tekent zijn
     emoji, en dat is voor een strik of een zonnebril prima.

     Let op de volgorde: thumb() gaat vóór emoji. Een item mag dus allebei hebben --
     de emoji blijft dan staan voor de plekken die geen SVG aankunnen (de naam in de
     kleedkamerbalk, de confetti bij het wereldfeest). */
  if (it.thumb) return zone(it.thumb(base));
  if (it.emoji) return zone(`<span class="thumb-emo">${it.emoji}</span>`);
  if (it.cat === 'dress') return zone(dressThumb(it, base), (OUTFIT_THUMBS[base] || OUTFIT_THUMBS[DEFAULT_BASE]).cls);
  if (it.cat === 'hair')  return zone(hairThumb(it, base));
  if (it.cat === 'shoes') return zone(shoesThumb(it));
  if (it.cat === 'mic')   return zone(micThumb(it));
  if (it.bg) return zone(`<span class="thumb-stage" style="background:${it.bg}">${(it.deco && it.deco[0]) || ''}</span>`);
  return zone(`<span class="thumb-swatch" style="background:${it.color}"></span>`);
}

let shopCat = 'dress';
let shopSelectedId = null;
let shopJustBoughtId = null;
/* Het "Nieuw!"-venster loopt op een timer (zie confirmShopBuy). Er is er precies
   een tegelijk: wie snel twee dingen achter elkaar koopt, of tussendoor iets
   anders aantikt, laat anders een timer van het vorige moment achter die daarna
   alsnog het rek komt herbouwen. Hij controleerde dat al op de id, maar een
   opgeruimde timer kan sowieso niets meer aanrichten. */
let shopBoughtTimer = null;
let dressReturnTo = null;      // 'trophies' als je hier via een trofeeënkast-kaart kwam -- terug-navigatie gaat dan naar de kast i.p.v. de kaart
// FASE 1: de Looks-lijst (complete thema-outfits als spaardoel) is uit de kleedkamer
// gehaald. Wat overblijft is één vraag: kies een soort, kies een stuk, doe het aan.
// Verse start (o.a. nogmaals op het al-actieve Kleedkamer-tabblad tikken):
// altijd terug naar de standaardcategorie, zonder selectie.
function openKleedkamer() {
  shopCat = 'dress'; schatTerugCat = 'dress'; shopSelectedId = null; dressReturnTo = null;
  toonHub('screen-dress');
  renderShop();   // ná show(): renderDressBar mag de balk zelf verbergen zolang niets gekozen is
  $('screen-dress').scrollTop = 0;   // altijd bovenaan beginnen bij (her)openen
}
// Terug naar de kleedkamer via de vaste navigatie (kwam van een ánder
// tabblad): hervat waar je gebleven was -- categorie, selectie en scrollpositie
// blijven allemaal gewoon staan (het zijn simpele variabelen die niets anders al
// aanraakte). Een gerichte sprong hierheen (bv. vanuit de Verzamelaar-trofee, zie
// openKleedkamerCat) heeft die variabelen intussen al naar zijn eigen doel gezet
// -- dát wordt dus vanzelf de nieuwe "waar je gebleven was"-stand.
function resumeKleedkamer() {
  toonHub('screen-dress');
  renderShop();
}
// vanuit een trofee met een `naar`: open die categorie meteen in de kleedkamer
function openKleedkamerCat(cat) {
  shopCat = cat; schatTerugCat = cat; shopSelectedId = null; dressReturnTo = 'trophies';
  toonHub('screen-dress');
  renderShop();
  $('screen-dress').scrollTop = 0;
}
/* Rechtstreeks naar één spulletje: de juiste lade open, en het stuk meteen aan --
   of, als het nog niet van haar is, gekozen met zijn prijs in de lade onderaan.

   Waarvoor: een wereldbeloning komt binnen als een plaatje met een naam op het
   feestje ná de show, en verhuist daarna stilletjes naar de kleedkamer -- waar hij
   in de zesde lade ligt, achter een rij die opzij geschoven moet worden. Wie hem
   wilde zien moest dus raden waar. Dit is dat gat en verder niets: geen nieuw
   scherm, geen nieuwe stand, alleen de twee variabelen die de kleedkamer toch al
   heeft, op de plek gezet waar het kind heen wilde. */
function openKleedkamerItem(id) {
  const it = item(id);
  if (!it) return openKleedkamer();
  /* Een wereldschat woont in het schattenvak en niet in zijn categorie: dáár is
     hij net onthuld, dáár staan zijn broertjes, en dáár blijft hij te vinden. Zijn
     categorie is de lade waar je 'm ook aan kunt doen -- die onthouden we als de
     plek om naar terug te vallen als het vak weer dichtgaat. */
  const schat = isBeloning(it.id);
  if (schat) schatTerugCat = it.cat;
  shopCat = schat ? SCHAT_CAT : it.cat; shopSelectedId = null; dressReturnTo = null;
  toonHub('screen-dress');
  renderShop();
  /* Van haar? Dan doet ze het aan, en niet "even passen": dit pad wordt gelopen
     vanaf de knop "Bekijk je <spulletje>" na een wereld, en de pop droeg het daar
     toch al als voorbeeld. Eén stap eerder echt is precies de beloning die het
     moment bedoelde -- en het is dezelfde afspraak als bij een tik op het kaartje.
     Nog niet van haar (kan alleen met een geheime schat) -> gewoon gekozen. */
  if (P().owned.includes(it.id)) {
    if (P().equipped[it.cat] !== it.id) equipShopItem(it.id);
  } else {
    shopSelectedId = id;
    paintShop();
  }
  /* Hier niet bovenaan beginnen (zoals openKleedkamer en openKleedkamerCat), maar
     bij het kaartje zelf: dit is een tik op één spulletje, en het zesde wereld-
     spulletje staat onder de rand. De pop draagt het al, dus zonder dit stond het
     bewijs buiten beeld. 'center' en niet 'nearest': de navigatiebalk ligt over
     het rek, en 'nearest' parkeert een kaartje daar net achter. */
  const scherm = $('screen-dress');
  scherm.scrollTop = 0;
  const kaart = $('item-grid').querySelector(`.item-card[data-item="${id}"]`);
  if (kaart && kaart.scrollIntoView) kaart.scrollIntoView({ block: 'center' });
}
/* Waar de categorierij hoort te staan.

   De rij is breder dan een telefoon: er staan zeven laden in en er passen er vijf
   à zes. Dat is geen probleem zolang je kunt zíen dat het doorloopt, en precies
   daar ging het mis. Het enige wat "er staat hier meer" zei was het fade-masker
   aan de rand (.hscroll-fade), en dat masker wist net zo goed uit wat het moest
   aankondigen: stond Accessoires aan, dan landde die knop kraakhelder tegen de
   fade aan en was Dieren erachter nog een grauwsluier van 28px -- een rij die
   ophield bij het felste ding op het scherm.

   Het stond hiervoor op scrollIntoView({ inline: 'nearest' }) plus
   scroll-padding-inline. Dat kan dit niet, om twee redenen:
     - scroll-padding werkt alleen als de rij écht moet schuiven. Staat de gekozen
       knop al in beeld (Microfoons, Schoenen) dan gebeurt er niets, en dan is de
       kier aan de rand wat het toeval ervan maakt -- 8px bij Microfoons.
     - het reserveert lucht ná de gekozen knop, niet een stuk van de volgende.
       Lucht zegt niets; een half knopje wel.

   Dus rekent deze functie het zelf uit, in twee stappen die allebei over de rand
   gaan waar nog iets achter zit:
     1  de gekozen knop helemaal in beeld, met een randje lucht ernaast
     2  valt er dan een knopje over de rechterrand, dan hoort daar een kier van te
        zien die groot genoeg is om een knopje te zijn.

   Wat er expres NÍET staat: centreren. De gekozen knop midden in de rij zetten
   verschuift hem ook als hij al lang in beeld staat, en bij de eerste en de
   laatste categorie duwt het de rand die je juist wilt zien uit beeld. */
const TAB_LUCHT = 12;      // lucht tussen de gekozen knop en de rand -- dezelfde als de padding van de rij
const TAB_SNIPPER = 24;    // minder dan dit is een snipper: daar maakt de fade een spookje van
const TAB_KIER = 38;       // ... en dan schuiven we door tot zoveel: icoon leesbaar, rechterkant zichtbaar afgesneden
function tabRijDoel(rij, gekozen) {
  const max = rij.scrollWidth - rij.clientWidth;
  if (max <= 0) return 0;                      // alles past: er valt niets aan te wijzen
  const breed = rij.clientWidth;
  // schermpositie van inhoud-x 0, zodat elke knop in één stelsel te meten is
  const nul = rij.getBoundingClientRect().left - rij.scrollLeft;
  const vak = el => { const r = el.getBoundingClientRect(); return { l: r.left - nul, r: r.right - nul }; };

  // 1 -- de gekozen knop helemaal in beeld. Alleen schuiven als het moet: staat
  //      hij er al, dan blijft de rij staan waar het kind hem liet staan.
  const g = vak(gekozen);
  let x = Math.min(rij.scrollLeft, g.l - TAB_LUCHT);
  x = Math.max(x, g.r + TAB_LUCHT - breed);
  x = Math.max(0, Math.min(x, max));

  /* 2 -- de kier. De eerste knop die er niet hélemaal in past is degene die het
        moet doen: die steekt over de rechterrand. Toont hij minder dan een
        snipper -- of staat hij er zelfs nog nipt buiten, want tussen twee knoppen
        zit ruimte -- dan schuiven we door tot er TAB_KIER van te zien is.

        Alles of niets, en dat is de hele reden dat dit geen éénregelaar is. De
        gekozen knop houdt zijn lucht (de rem hieronder), en op een smal toestel
        kan die rem de kier in de weg zitten: bij de eerste categorie op een 320px
        scherm is er links niets om weg te schuiven. Half schuiven is dan het
        slechtste van twee: de eerste knop verliest zijn lucht, er verschijnt een
        fade links naar niks, en de kier rechts is nog steeds te klein om te zien.
        Levert het schuiven geen echte kier op, dan blijft de rij dus gewoon staan
        en doet de fade over de laatste hele knop het werk. */
  for (const knop of rij.children) {
    const k = vak(knop);
    if (k.r <= x + breed) continue;          // past er helemaal in
    if (x + breed - k.l < TAB_SNIPPER) {
      const doel = Math.min(k.l + TAB_KIER - breed, max, g.l - TAB_LUCHT);
      if (doel + breed - k.l >= TAB_SNIPPER) x = doel;
    }
    break;
  }
  return Math.max(0, x);
}
/* Het rek opnieuw opbouwen. Eén keer per categoriewissel, per aankoop en per
   keer dat de kleedkamer opengaat -- en verder niet: kijken en aandoen gaan via
   paintShop() hieronder, dat dezelfde kaartjes laat staan en alleen hun stand
   bijwerkt. Dat scheelde niet alleen werk maar vooral sprongen: de grid werd
   vroeger bij élke tik van nul opgebouwd, en dan verschuift wat je net aanraakte
   onder je vinger vandaan. */
function renderShop() {
  const p = P();
  const grid = $('item-grid');
  grid.innerHTML = '';
  // Eén keuzerij: de kledingsoorten. Er stond hier eerder eerst een
  // Spullen/Looks-schakelaar bóven deze rij en daarna "Looks" als eerste chip
  // in de rij zelf; sinds fase 1 is de lijst met thema-looks er helemaal uit.
  const tabs = $('shop-tabs');
  tabs.innerHTML = '';
  let activeTab = null;
  // Alleen iconen, plus het woord bij wat aanstaat. aria-label houdt de naam
  // voor een schermlezer altijd beschikbaar.
  const chip = (opts) => {
    const b = document.createElement('button');
    b.className = 'tab-btn' + (opts.on ? ' active' : '') + (opts.extra ? ' ' + opts.extra : '');
    b.setAttribute('aria-label', opts.name);
    b.setAttribute('aria-pressed', opts.on ? 'true' : 'false');
    b.innerHTML = `<span class="tab-ico">${opts.ico}</span>`
      + (opts.on || opts.keepLabel ? `<span class="tab-label">${opts.name}</span>` : '');
    b.onclick = opts.go;
    tabs.appendChild(b);
    if (opts.on) activeTab = b;
    return b;
  };
  CATS.forEach(c => chip({ ico: c.ico, name: c.name, on: c.id === shopCat, go: () => {
    sndClick();
    shopCat = c.id; shopSelectedId = null; renderShop();
    $('screen-dress').scrollTop = 0;   // een nieuwe categorie begint bovenaan
  } }));
  // de rij zelf blijft altijd staan; alleen wat eronder komt verschilt
  tabs.onscroll = () => updateFades(tabs);
  /* Ook als er géén categorie aanstaat -- in het schattenvak staat de hele rij uit.
     Zonder deze regel bleven de fade-randen daar hangen op wat ze vóór het
     openen waren, en dan wijst de rand naar een kant waar niets meer zit. */
  updateFades(tabs);
  if (activeTab) requestAnimationFrame(() => {
    if (!activeTab.isConnected) return;
    tabs.scrollTo({ left: tabRijDoel(tabs, activeTab) });
    updateFades(tabs);   // schuift de rij echt, dan werkt onscroll hem onderweg nog bij
  });
  renderSchatEntry(p);
  const schatVak = shopCat === SCHAT_CAT;
  shopItems(p).forEach(it => {
    const card = document.createElement('div');
    card.dataset.item = it.id;
    /* Waar het vandaan komt. In het gewone rek alleen bij wat je al hebt -- daar
       staat een nog te verdienen beloning sinds fase 6E sowieso niet meer tussen.
       In het schattenvak staat het teken er altijd: dát is wat er te weten valt
       over een schat die je nog niet hebt (bij wélke wereld hij hoort), en het is
       precies genoeg om er nieuwsgierig naar te zijn. */
    const heeft = p.owned.includes(it.id);
    const w = (schatVak || heeft) ? beloningWereld(it.id) : null;
    /* De klasse staat er meteen op en het pilletje blijft leeg: paintShop()
       hieronder vult de stand van élk kaartje in en is daarmee de enige plek waar
       dat gebeurt -- maar hij zoekt ze op met .item-card, dus zonder deze regel
       vindt hij er nul. */
    card.className = 'item-card' + (schatVak ? ' schat-kaart' : '');
    /* Een schat die nog niet van jou is laat zichzelf niet zien: geen tekening en
       geen naam, maar het raadsel -- een medaillon in de kleuren van zijn wereld
       met een vraagteken erin, en de wereldnaam eronder. Zo staat er wél iets
       ("in de Muziekwereld ligt iets voor je") en tóch niet wát. */
    const beeld = (schatVak && !heeft) ? schatRaadselHTML(w) : itemThumb(it);
    const naam = (schatVak && !heeft) ? esc(w ? w.name : 'Wereldschat') : it.name;
    card.innerHTML = (w ? `<span class="item-wereld" aria-hidden="true">${w.icon || '🌍'}</span>` : '')
      + beeld + `<div class="item-name">${naam}</div><div class="item-status"></div>`;
    /* Tikken op kleren die van je zijn = ze aandoen. Er zat een stap tussen --
       eerst kiezen, dan "Doe aan" in de balk onderaan -- en die stap kostte een
       kind van vijf een tweede tik op een andere plek van het scherm voor iets
       waar niets aan te bevestigen valt: aandoen kost niets en is met één tik
       terug te draaien. Kopen blijft wél twee stappen, want dát kost diamanten.

       Drie gevallen, en meer zijn het er niet:
         van jou, nog niet aan  -> meteen aan (equipShopItem doet het geluid, het
                                   opslaan en het danspasje)
         van jou en al aan      -> niets. Nadrukkelijk géén "dan maar uit": een
                                   kind dat nog eens op haar jurk tikt wil hem
                                   niet kwijt. Wel het danspasje, zodat de tik
                                   antwoord krijgt.
         nog niet van jou       -> kiezen: de pop past het en de lade onderaan
                                   zegt wat het kost. */
    card.onclick = () => {
      if (it.id === 'mic_pintje') bumpPintjeTaps(card);   // easter egg telt hier mee, ook los aangetikt
      const p2 = P();
      if (p2.owned.includes(it.id)) {
        if (p2.equipped[it.cat] === it.id) { sndClick(); tapDance('shop-avatar'); return; }
        return equipShopItem(it.id);
      }
      sndClick();
      /* Stond er een "Nieuw!"-kaartje open, dan verandert de vólgorde zodra dat
         feestje voorbij is (het spulletje verhuist naar de bezit-groep), en dus
         moet het rek dan wél opnieuw. In alle andere gevallen blijft het staan
         waar het staat. */
      const herbouw = !!shopJustBoughtId;
      clearTimeout(shopBoughtTimer);
      shopJustBoughtId = null; shopSelectedId = it.id;
      herbouw ? renderShop() : paintShop();
    };
    grid.appendChild(card);
  });
  paintShop();
}
/* Wat er in het rek staat, en in welke volgorde.

   Twee standen, want de kleedkamer heeft er twee. Het schattenvak (SCHAT_CAT) is
   de verzameling: élke wereldschat, in de volgorde van de tournee, of je hem nu
   hebt of niet. Bezit verandert daar niets aan de plek -- plek 1 is de eerste
   wereld, vandaag en over drie werelden nog. Dat is wat een verzameling van een
   rek onderscheidt.

   Een gewone categorie is wél een rek, met twee groepen:

     0  van jou   -- je eigen kast, meteen bovenaan en meteen aan te doen
     1  te koop   -- op prijs oplopend, dus goedkoop eerst

   Er was een derde ("te verdienen", de wereldbeloningen achteraan op slot). Die is
   in fase 6E uit de laden gehaald: een slotje tussen de prijzen maakte van een
   beloning stille winkelwaar die toevallig niet te koop is, en het was precies de
   plek waar een kind hem nooit vond. Wat je nog niet verdiend hebt staat nu in het
   schattenvak; wat je wél verdiend hebt blijft gewoon bij je eigen spullen staan,
   want dáár kies je wat je aandoet. Een beloning heeft geen prijs en krijgt binnen
   die groep een groot eindig getal -- geen Infinity, want twee ervan geven dan
   Infinity - Infinity = NaN, en een vergelijker die NaN teruggeeft is geen
   vergelijker meer. Zo sluiten je verdiende schatten je eigen rij af, op de
   volgorde van ITEMS.

   Het spulletje dat nét gekocht is telt hier even nog als "te koop": zo blijft het
   tijdens zijn "Nieuw!"-moment staan waar het kind het aantikte, en verhuist het
   pas naar de bezit-groep als dat moment voorbij is (zie confirmShopBuy). */
function shopItems(p) {
  if (shopCat === SCHAT_CAT) return wereldSchatten().map(s => s.item);
  const rang = it => (typeof it.price === 'number' ? it.price : 1e9);
  const groep = it => (p.owned.includes(it.id) && it.id !== shopJustBoughtId) ? 0 : 1;
  return ITEMS.filter(i => i.cat === shopCat && (!isBeloning(i.id) || p.owned.includes(i.id))).slice()
    .sort((a, b) => (groep(a) - groep(b)) || (rang(a) - rang(b)));
}
/* Het vakje onder de categorierij: "✨ Wereldschatten · 3 verzameld". Eén regel,
   en daarmee het hele verhaal -- er is zoiets als een wereldschat, en je hebt er
   drie. Meer uitleg krijgt een kind van vijf hier niet, en meer heeft ze ook niet
   nodig: wat erachter zit legt het vak zelf uit zodra ze erop tikt.

   HET IS EEN VERZAMELING EN GEEN METER. Er stond "3 / 6", en die 6 was het aantal
   werelden van vandaag. Daar komen er werelden bij, en dan zakt een kind dat alles
   had van "6 / 6" naar "6 / 7": het scherm zegt dan dat ze iets kwijt is geraakt,
   terwijl er juist iets bij te halen valt. Een oplopend getal kan dat niet -- het
   werkt bij 0, bij 2, bij 6 en bij 12, en het blijft even breed.

   Staat er geen enkele schat te hálen (een spel zonder beloningen -- mogelijk in
   de wereldstudio), dan is het vak er niet: schatStand().totaal beslist over het
   bestaan van het vak, en verder komt het nergens in beeld. */
function renderSchatEntry(p) {
  const knop = $('schat-entry');
  if (!knop) return;
  const st = schatStand(p);
  const open = shopCat === SCHAT_CAT;
  knop.style.display = st.totaal ? 'flex' : 'none';
  if (!st.totaal) return;
  knop.classList.toggle('open', open);
  knop.setAttribute('aria-pressed', open ? 'true' : 'false');
  knop.setAttribute('aria-label', `Wereldschatten, ${st.heeft} verzameld`);
  knop.innerHTML = `<span class="se-ico" aria-hidden="true">✨</span>`
    + `<span class="se-naam">Wereldschatten</span>`
    + `<span class="se-telling">· <b>${st.heeft}</b> verzameld</span>`;
}
// Het vak open- of dichtdoen. Dicht = terug naar de lade waar je vandaan kwam;
// daarom onthoudt hij die (en niet: altijd terug naar 'Kleren', want dan verlies
// je de rij waar je net doorheen aan het bladeren was).
let schatTerugCat = 'dress';
function toggleSchatten() {
  sndClick();
  if (shopCat === SCHAT_CAT) shopCat = schatTerugCat;
  else { schatTerugCat = shopCat; shopCat = SCHAT_CAT; }
  shopSelectedId = null;
  renderShop();
  $('screen-dress').scrollTop = 0;
}
/* Een schat die nog niet van jou is. Geen tekening (dat is de verrassing) en geen
   slotje over een gewoon kaartje heen (dat leest als "winkelwaar die op is"), maar
   het medaillon van zijn eigen wereld met een vraagteken erin -- dezelfde vorm en
   dezelfde wereldkleuren als de perfecte-wereldkaart in de kast (.pw-medal), zodat
   "dit hoort bij die wereld" er zonder één woord op staat. */
function schatRaadselHTML(w) {
  const th = (w && w.theme) || {};
  const kleur = `--pw-sky:${th.sky || '#3a1f6e'};--pw-glow:${th.glow || '#7a2f63'}`;
  return `<div class="item-thumb"><span class="schat-raadsel" style="${kleur}" aria-hidden="true">?</span></div>`;
}
/* Eén kaartje, één stand. Zet de klassen van het kaartje en de inhoud van zijn
   pilletje -- zonder het kaartje opnieuw op te bouwen, zodat aandoen en kiezen
   geen sprong in het rek geven. De volgorde van de vragen ís de rangorde: wat
   hoger staat wint, dus er staan er nooit twee tegelijk. */
function dressCardState(card, it, p) {
  const owned = p.owned.includes(it.id);
  const equipped = p.equipped[it.cat] === it.id;
  // De wereld die dit spulletje uitdeelt -- null voor alles wat gewoon te koop is.
  const uitWereld = owned ? null : beloningWereld(it.id);
  const nieuw = shopJustBoughtId === it.id;
  // schat-kaart hoort bij het kaartje en niet bij zijn stand: renderShop zet hem
  // erop, dus hij moet deze herbouw van className overleven.
  const schat = card.classList.contains('schat-kaart');
  card.className = 'item-card'
    + (schat ? ' schat-kaart' : '')
    + (equipped ? ' equipped' : (owned ? ' owned' : ''))
    + (uitWereld ? ' teverdienen' : '')
    + (shopSelectedId === it.id ? ' selected' : '')
    + (nieuw ? ' just-bought' : '');
  const st = card.querySelector('.item-status');
  if (!st) return;
  if (nieuw)          { st.className = 'item-status new';   st.textContent = 'Nieuw!'; }
  else if (equipped)  { st.className = 'item-status on';    st.textContent = '✓ Aan'; }
  else if (owned)     { st.className = 'item-status owned'; st.textContent = 'Van jou'; }
  /* Nog te verdienen. Sinds fase 6E staat zo'n kaartje alleen nog in het
     schattenvak, en daar draagt het al de naam van zijn wereld en het wereldteken
     in de hoek -- het pilletje hoeft dus alleen nog te zeggen wat je moet doen.
     Bewust dezelfde rustige taal als "te weinig diamanten": het is een doel om
     naartoe te spelen, geen aanbieding. Geen prijs, nooit: er is er geen. */
  else if (uitWereld) { st.className = 'item-status slot';  st.textContent = '🔒 Speel uit'; }
  else if (p.diamonds < it.price) { st.className = 'item-status need';  st.textContent = `💎 ${it.price}`; }
  else                { st.className = 'item-status price'; st.textContent = `💎 ${it.price}`; }
}
/* Alles bijwerken behalve het rek zelf: de pop (met het gekozen stuk al aan), het
   podium, de diamantenteller, de balk onderaan en de stand van elk kaartje dat er
   al staat. Dit is wat er gebeurt bij kiezen en aandoen -- de kaartjes blijven
   dezelfde elementen, dus er verschuift niets en de scrollpositie blijft. */
function paintShop() {
  const p = P();
  const selected = shopSelectedId ? item(shopSelectedId) : null;
  /* Passen mag, maar een schat die nog niet van jou is past niemand. Bij een
     koopstuk is de pop de etalage ("zo zou je eruitzien voor 45 💎") en dat hoort
     zo te blijven; bij een wereldschat is juist het níet weten de beloning, en
     één tik zou daar het hele raadsel uit halen. De pop blijft dus staan zoals ze
     staat, en het kaartje blijft het medaillon met het vraagteken. */
  const geheim = selected && isBeloning(selected.id) && !p.owned.includes(selected.id);
  const preview = (selected && !geheim) ? previewProfile(p, selected) : p;
  /* De teller. Loopt er een afteltelling (na een aankoop, zie telNaar), dan
     schrijft die hem en mag deze regel er niet overheen -- anders staat het
     eindbedrag er al voordat het kind de diamanten heeft zien gaan. */
  zetTeller($('shop-diamonds'), p.diamonds);
  /* Alleen de pop. Hier stond applyStage(): dat zette het podium dat dit kind
     ooit kocht áchter haar, met drie emoji in de hoeken. Podia zijn sinds fase 1
     geen kleedkamercategorie meer, dus dat was versiering van een systeem dat
     hier niet meer bestaat -- en het beantwoordde de enige vraag van dit scherm
     ("hoe ziet mijn ster eruit?") met iets anders. De spiegel heeft nu zijn eigen,
     vaste licht (zie .spiegel), en het podium staat nog gewoon achter haar in de
     show en op het eindscherm. De opslag is niet aangeraakt: p.equipped.stage
     blijft staan zoals het stond. */
  $('shop-avatar').innerHTML = pasLaag(avatarSVG(preview, 165, true));
  renderDressBar(selected, p);
  $('item-grid').querySelectorAll('.item-card').forEach(card => {
    const it = item(card.dataset.item);
    if (it) dressCardState(card, it, p);
  });
}
function previewProfile(p, it) {
  const preview = { ...p, equipped: { ...p.equipped } };
  preview.equipped[it.cat] = it.id;
  return preview;
}

// 🎲 Verras me: een willekeurige outfit uit wat de ster al bezit, met een vreugdedansje.
// Optionele spullen (micro, instrument, extra, dier) blijven soms bewust weg,
// anders hangt de ster altijd vol.
function surpriseOutfit() {
  const p = P();
  const optioneel = ['mic', 'instrument', 'acc', 'pet'];
  CATS.forEach(c => {
    const bezit = ITEMS.filter(i => i.cat === c.id && p.owned.includes(i.id));
    if (!bezit.length) return;
    if (optioneel.includes(c.id)) p.equipped[c.id] = Math.random() < 0.35 ? null : pick(bezit).id;
    else p.equipped[c.id] = pick(bezit).id;
  });
  shopSelectedId = null;
  // ook een gegokte outfit kan per toeval een geheime combo raken
  const trofees = checkTrophies(p);
  noticeReady(trofees);
  save();
  // alleen ándere spullen aan: het rek zelf verandert niet, dus alleen bijwerken
  paintShop();
  tapDance('shop-avatar');
  buzz(20);
}

/* De lade onderaan: naam links, dé knop rechts. Bij te weinig diamanten geen dood
   spoor maar een concreet doel: "Nog X 💎" + meteen spelen.
   Hij komt alleen op voor iets dat nóg niet van je is -- een aankoop is de enige
   beslissing die dit scherm kent, en de enige die niet met één tik terug te draaien
   valt. Alles wat al van je is antwoordt op het kaartje zelf en op de pop. */
function renderDressBar(it, p) {
  const bar = $('dress-bar');
  const naam = (it2) => `${it2.emoji ? it2.emoji + ' ' : ''}${it2.full || it2.name}`;
  if (!it) {
    // niets gekozen: geen hint nodig, de kaartjes nodigen zelf al uit tot tikken
    bar.innerHTML = '';
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'flex';
  const owned = p.owned.includes(it.id);
  /* FASE 4D.1 -- een spulletje dat je niet koopt maar verdient. Geen prijs, geen
     knop: alleen waar het vandaan komt. Bewust geen "Speel"-knop zoals bij te weinig
     diamanten -- die brengt je naar de eerstvolgende show, en dat is bijna nooit de
     wereld die dit spulletje uitdeelt. Wat je moet doen staat er gewoon. */
  const uitWereld = owned ? null : beloningWereld(it.id);
  if (uitWereld) {
    /* En zonder de naam van het spulletje, want die verklapt het (fase 6E). Het
       kaartje zegt bij wélke wereld hij hoort en de balk zegt wat je ervoor doet;
       wát het is blijft tot het feestje na de laatste show. */
    bar.innerHTML = `
      <div class="db-info"><span class="db-name">🎁 Geheime wereldschat</span>
        <span class="db-sub">· Speel ${esc(uitWereld.name)} uit</span></div>`;
    return;
  }
  /* Van jou? Dan is er niets te beslissen -- je hebt het al aan (één tik deed dat)
     of het staat één tik van je af. De lade kwam hier met "Doe aan" of met "Die
     draag je nu", en dat is precies wat het kaartje en de pop óók al zeggen: drie
     plekken voor één mededeling, waarvan er twee onder in beeld ruimte kostten. */
  if (owned) { bar.innerHTML = ''; bar.style.display = 'none'; return; }
  const tekort = it.price - p.diamonds;
  if (tekort > 0) {
    bar.innerHTML = `
      <div class="db-info"><span class="db-name">${naam(it)}</span>
        <span class="db-sub">· Nog <span class="db-highlight">${tekort}</span> 💎</span></div>
      <button class="btn small" id="db-earn">Speel</button>`;
    $('db-earn').onclick = () => { sndClick(); startLevel(P().level); };
    return;
  }
  bar.innerHTML = `
    <div class="db-info"><span class="db-name">${naam(it)}</span></div>
    <button class="btn small" id="db-buy">Koop · ${it.price} 💎</button>`;
  $('db-buy').onclick = () => confirmShopBuy(it.id);
}

/* ---- Een teller die naar zijn nieuwe stand toe loopt --------------------------
   Betalen is het enige moment waarop het getal in de portemonnee omlaag gaat, en
   het sprong. Een sprong van 60 naar 15 is geen gebeurtenis maar een ander getal:
   je ziet niet dat er iets af ging, alleen dat er iets anders staat. Een halve
   seconde aftellen maakt er wel een gebeurtenis van -- en het loopt gelijk op met
   de diamanten die op datzelfde moment de portemonnee uit vliegen.

   Kort en ease-out: het meeste is in de eerste 200ms al gebeurd, dus het voelt
   niet als wachten. Alleen het getal verandert -- de pil staat rechts in een
   raster-kop, dus wat er aan breedte af gaat trekt niets anders mee.

   Beperkte beweging, geen echte frames (de node-harnas) of een pil die er niet
   is: dan gewoon het eindbedrag. */
const tellers = new WeakMap();
function zetTeller(el, naar) {
  if (!el) return;
  if (!tellers.has(el)) el.textContent = naar;   // loopt er niets, dan is dit de enige schrijver
}
/* ---- En dezelfde teller, maar dan bij verdienen (PS-53) ------------------
   Betalen gaat hierboven al goed. Verdienen ging andersom, en dat was precies
   verkeerd om: bij een goed antwoord stond het nieuwe getal er op t=0, en pas
   daarna vertrokken de diamanten die het zouden komen brengen. Wat je zag was
   een teller die al klopte en een paar ruiten die daarna voor niets overvlogen
   -- de oorzaak kwam ná het gevolg.

   De volgorde hoort te zijn: je verdient iets, het reist, het komt aan. Alleen
   het gétal wacht; p.diamonds en save() gebeuren gewoon meteen, want een
   animatie mag nooit bepalen wat er bewaard is.

   DIA_AANKOMST is hetzelfde moment als waarop flyDiamonds de pil laat opveren:
   dat ís de aankomst. Eén getal, twee gebruikers, en daarom staat het hier en
   niet twee keer. */
const DIA_AANKOMST = 600;
const telWacht = new WeakMap();
function telStraks(el, naar, na) {
  if (!el) return;
  clearTimeout(telWacht.get(el));
  telWacht.delete(el);
  // Geen beweging, dus ook niets om op te wachten: er komen geen diamanten
  // overvliegen (zie flyDiamonds), dus het getal hoort er meteen te staan.
  if (motionOff()) { el.textContent = naar; return; }
  telWacht.set(el, setTimeout(() => {
    telWacht.delete(el);
    telNaar(el, naar, MOTION.snel);
  }, na == null ? DIA_AANKOMST : na));
}
/* Meteen dít getal, en wat er nog onderweg was gaat van tafel. Voor elk scherm
   dat opnieuw getekend wordt: daar hoort geen aftelling van een vorig moment
   overheen te vallen, en tellen vanaf het getal van een ánder kind al helemaal
   niet. */
function telNu(el, naar) {
  if (!el) return;
  clearTimeout(telWacht.get(el));
  telWacht.delete(el);
  const lopend = tellers.get(el);
  if (lopend) { cancelAnimationFrame(lopend.id); tellers.delete(el); }
  el.textContent = naar;
}
function telNaar(el, naar, ms) {
  if (!el) return;
  const lopend = tellers.get(el);
  if (lopend) cancelAnimationFrame(lopend.id);
  tellers.delete(el);
  // Vanaf wat er nu staat en niet vanaf een onthouden waarde: onderbreek je een
  // aftelling met een tweede aankoop, dan telt hij verder waar het oog was.
  const nu = parseInt(el.textContent, 10);
  const van = Number.isFinite(nu) ? nu : naar;
  if (motionOff() || van === naar) { el.textContent = naar; return; }
  const t0 = performance.now();
  const stap = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(van + (naar - van) * e);
    if (k < 1) { const id = requestAnimationFrame(stap); if (id) { tellers.set(el, { id }); return; } }
    tellers.delete(el);
    el.textContent = naar;
  };
  const id = requestAnimationFrame(stap);
  if (id) tellers.set(el, { id }); else el.textContent = naar;
}
/* ---- Een handjevol sterretjes boven het gekochte kaartje ----------------------
   Hier stond confetti(12): stukjes die over de volle breedte van het scherm naar
   beneden regenden, tot vier seconden lang, en die zich niets aantrokken van
   prefers-reduced-motion. Dat is een feest over het hele beeld voor iets wat op
   een kaartje van ruim honderd pixels gebeurt -- en wie drie dingen koopt
   speelt de rest van de kleedkamer onder een regenbui.

   Nu is het een klein boeketje recht boven het kaartje zelf, met dezelfde stukjes
   en dezelfde animatie als het confetti-kanon (.burst-bit/burstOut) maar met een
   korte straal en een korte duur: nadruk op dit ene spulletje, weg voor je erover
   nadenkt. burstOut is puur transform + opacity, dus het kost geen opmaak. */
function koopVonken(el) {
  if (!el || motionOff() || !el.getBoundingClientRect) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height * .42;
  const emo = ['✨', '⭐', '💫', '🌟'];
  for (let i = 0; i < 6; i++) {
    const b = document.createElement('div');
    b.className = 'burst-bit';
    b.textContent = emo[i % emo.length];
    // een waaier omhoog (-90 graden is recht boven), niet een bol naar alle kanten
    const hoek = (-90 + (i - 2.5) * 26 + rnd(-7, 7)) * Math.PI / 180;
    const straal = rnd(34, 58);
    b.style.left = cx + 'px'; b.style.top = cy + 'px';
    b.style.fontSize = '17px';
    b.style.animationDuration = '.62s';
    b.style.setProperty('--dx', Math.round(Math.cos(hoek) * straal) + 'px');
    b.style.setProperty('--dy', Math.round(Math.sin(hoek) * straal) + 'px');
    b.style.setProperty('--rot', rnd(-80, 80) + 'deg');
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 700);
  }
}
// Diamant-feedback: een paar diamanten vliegen van A naar B, en de teller-pil
// pulseert aan de portemonnee-kant. Verdienen = naar de portemonnee toe
// (spelscherm), betalen = van de portemonnee wég (kleedkamer).
function flyDiamonds(fromEl, toEl, n) {
  if (!fromEl || !toEl || !fromEl.animate) return;
  /* Bij beperkte beweging vliegt er niets. Dat mag, want de diamanten zijn hier
     al: elke aanroep komt ná p.diamonds en ná de teller op het scherm (zie
     submitAnswer en confirmShopBuy). Deze boog vertelt alleen wáár ze vandaan
     komen -- de opbrengst zelf staat er met of zonder. */
  if (motionOff()) return;
  const f = fromEl.getBoundingClientRect(), t = toEl.getBoundingClientRect();
  const dx = t.left + t.width / 2 - (f.left + f.width / 2);
  const dy = t.top + t.height / 2 - (f.top + f.height / 2);
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'fly-dia';
    d.textContent = '💎';
    d.style.left = (f.left + f.width / 2 - 11) + 'px';
    d.style.top = (f.top + f.height / 2 - 11) + 'px';
    document.body.appendChild(d);
    d.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5 + (i - 1) * 26}px, ${dy * 0.4 - 46}px) scale(1.2)`, offset: .5 },
      { transform: `translate(${dx}px, ${dy}px) scale(.5)`, opacity: .85 }
    ], { duration: 620 + i * 110, easing: 'ease-in-out' }).onfinish = () => d.remove();
    setTimeout(() => d.remove(), 900 + i * 110);
  }
  // pulseer de portemonnee: meteen als de diamanten eruit vertrekken,
  // pas bij aankomst als ze erin vallen
  const fromBadge = fromEl.closest && fromEl.closest('.diamond-badge');
  const toBadge = toEl.closest && toEl.closest('.diamond-badge');
  const badge = fromBadge || toBadge;
  if (badge && badge.animate) setTimeout(() => badge.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }],
    { duration: 340, easing: 'ease-out' }), fromBadge ? 0 : DIA_AANKOMST);
}

function confirmShopBuy(id) {
  const it = item(id);
  const p = P();
  if (p.owned.includes(it.id)) return equipShopItem(id);
  // Een wereldbeloning heeft geen prijs en is dus niet te koop. De balk biedt de
  // knop niet eens aan; dit is het slot op de deur, niet de deur zelf.
  if (isBeloning(it.id)) return;
  if (p.diamonds < it.price) {
    sndWrong();
    showToast(`Nog ${it.price - p.diamonds} 💎 nodig — speel een optreden!`);
    setTimeout(hideToast, 1800);
    return;
  }
  p.diamonds -= it.price;
  p.owned.push(it.id);
  p.equipped[it.cat] = it.id;
  /* De lade ging over "wil je dit kopen?" en dat is beantwoord: hij verdwijnt, en
     wat ervoor in de plaats komt is het gouden "Nieuw!" op het kaartje plus de pop
     die het al draagt. Het kaartje wordt hieronder op zijn id opgezocht en niet
     meer op .selected, want die klasse hoort nu alleen nog bij kiezen om te kopen. */
  shopSelectedId = null;
  clearTimeout(shopBoughtTimer);        // een vorig "Nieuw!"-venster is hiermee voorbij
  shopJustBoughtId = it.id;
  sndCoin();
  /* De afteltelling start vóór het opnieuw tekenen: paintShop zou het eindbedrag er
     anders meteen neerzetten, en dan valt er niets meer af te tellen. Hij loopt
     gelijk op met de diamanten die hieronder de portemonnee uit vliegen. */
  telNaar($('shop-diamonds'), p.diamonds, 520);
  const trofees = checkTrophies(p);
  save();
  noticeReady(trofees);   // nieuwe trofee klaar? stipje aan + vriendelijke hint
  /* paintShop en niet renderShop -- dezelfde afspraak als bij kiezen en aandoen.
     De volgorde verandert nog niet (het gekochte stuk telt tijdens zijn
     "Nieuw!"-moment nog als te koop, zie shopItems), dus er valt niets te
     herschikken; herbouwen gooide alleen het hele rek weg en tekende elk
     kaartje met zijn miniatuur opnieuw -- een lade vol SVG's, precies op het
     moment dat er een animatie moet lopen. Nu blijft het kaartje hetzelfde
     element en krijgt het er alleen zijn nieuwe staat bij. Dat is wat de pop en
     de gouden glans nodig hebben: iets om op te starten dat er al stond. */
  paintShop();
  const kaart = $('item-grid').querySelector(`.item-card[data-item="${it.id}"]`);
  koopVonken(kaart);                                       // een klein boeketje boven het kaartje zelf
  flyDiamonds($('shop-diamonds'), $('shop-spiegel'), 3);   // betalen: diamanten verláten de portemonnee, naar de paspop
  /* Als het "Nieuw!"-moment voorbij is verhuist het spulletje naar de bezit-groep
     bovenaan. Dat is een sprong, en een sprong die je niet ziet is een spulletje
     dat weg lijkt -- dus reist het beeld mee naar waar het nu staat. */
  shopBoughtTimer = setTimeout(() => {
    shopBoughtTimer = null;
    if (shopJustBoughtId !== it.id) return;
    shopJustBoughtId = null;
    renderShop();
    const na = $('item-grid').querySelector(`.item-card[data-item="${it.id}"]`);
    if (na && na.scrollIntoView) na.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, 1800);
  tapDance('shop-avatar');              // vreugdedansje in het nieuwe spulletje
}

function equipShopItem(id) {
  const it = item(id);
  const p = P();
  if (!p.owned.includes(it.id)) return;
  const herbouw = !!shopJustBoughtId;   // zie de kaartklik: het rek herschikt na een aankoop
  clearTimeout(shopBoughtTimer);
  p.equipped[it.cat] = it.id;
  shopJustBoughtId = null;
  /* En géén keuze meer. "Gekozen" is sinds de tik-om-aan-te-doen één ding: het
     stuk dat je bekíjkt om te kopen. Bleef het hier staan, dan droeg de pop het
     stuk dat aanstaat terwijl de lade onderaan over datzelfde stuk nog iets
     anders beweerde -- twee standen voor één kledingstuk. */
  shopSelectedId = null;
  sndClick();
  // een outfit-combo kan een (geheime) trofee zijn — check dus ook bij het aandoen
  const trofees = checkTrophies(p);
  noticeReady(trofees);
  save();
  // Aandoen verandert niets aan wat je bézit, dus ook niets aan de volgorde: de
  // kaartjes blijven staan waar ze staan en alleen hun stand gaat om. Het enige
  // wat zichtbaar beweegt is de pop -- en dat is precies de bedoeling.
  herbouw ? renderShop() : paintShop();
  // Een stil danspasje, geen tweede geluidje: sndClick() hierboven heeft het
  // tikken al gezegd, en wat er te zien valt is dat zíj iets anders aanheeft.
  dance('shop-avatar');
}


/* ================= Nieuwe ster ================= */
/* Eén formulier, niet een reeks stappen: het zijn vier keuzes en een ouder mag ze
   allemaal tegelijk zien. De naam en het uiterlijk zijn wat een kind leuk vindt;
   de manier van spelen is de enige die een kind niet zelf kan beantwoorden en
   tegelijk de belangrijkste -- een kleuter in de rekenmodus loopt meteen vast. */
let newStar = null;
let newStarReturn = 'profile';   // waar ← en Android-terug naartoe gaan
function openNewStar(from) {
  if (Object.keys(db.profiles).length >= MAX_PROFILES) return;
  closeGearMenu();
  sndClick();
  newStarReturn = from || 'profile';
  // De oefeninstellingen komen uit defaultProfile zelf, zodat het concept en de
  // echte standaarden niet uit elkaar kunnen lopen: wie de openklapper dicht
  // laat, krijgt exact wat de app anders stilletjes had gekozen.
  newStar = {
    // base bewust leeg: wie je bent is de eerste vraag van het formulier en de
    // enige zonder voorkeuze. Zou hier 'meisje' staan, dan zou een ouder die
    // doorklikt nooit merken dat er iets te kiezen valt -- precies de aanname
    // waar deze versie vanaf wil.
    name: '', base: null, hair: 'hair_blond', dress: 'dress_roze',
    settings: defaultProfile('', 'dress_roze').settings,
    open: false          // de openklapper begint dicht, elke keer opnieuw
  };
  renderNewStar();
  toonHub('screen-newstar');
  const el = $('screen-newstar');
  if (el) el.scrollTop = 0;
}
function closeNewStar() {
  newStar = null;
  if (newStarReturn === 'settings') { renderSettings(); toonHub('screen-settings'); settingsToTop(); }
  else goProfiles();
}
function swatchChips(group, ids, sel) {
  return ids.map(id => {
    const it = item(id);
    return `<button class="chip swatch${id === sel ? ' on' : ''}" data-g="${group}" data-v="${id}">`
      + `<span class="sw" style="background:${it.color}"></span>${esc(it.name)}</button>`;
  }).join('');
}
function renderNewStar() {
  const n = newStar;
  const s = n.settings;
  // een echt profiel als voorbeeld: precies wat de ster straks wordt, geen namaak
  const preview = defaultProfile(n.name || '…', n.dress, { hair: n.hair, base: n.base });
  const ok = !!n.name.trim() && !!n.base;
  // Elke chip-tik bouwt dit paneel opnieuw op. Met een opengeklapt paneel eronder
  // is dat merkbaar: zonder de scrolstand vast te houden springt het formulier
  // bij élke tik naar boven (n.open doet hetzelfde voor de openklapper zelf).
  const scr = $('screen-newstar');
  const keep = scr ? scr.scrollTop : 0;
  /* De twee zwaarste keuzes ("wie ben je?" en "hoe speel je?") als twee volle
     helften met het icoon boven het woord: exact het onderdeel dat het ouderdeel
     voor dezelfde vragen gebruikt (zie modeChip in oefenenPanelHtml). Ze stonden
     hier als gewone pillen -- dezelfde vraag, twee verschillende bedieningen. */
  const halfChip = (v, ico, label, on) => `<button class="chip gestapeld${on ? ' on' : ''}" data-v="${v}">`
    + `<span class="mc-ico" aria-hidden="true">${ico}</span><span class="mc-label">${label}</span></button>`;
  /* Het voorbeeld staat BUITEN het vel, op de tekening -- zie .newstar-preview in
     het stijlblad. Daar staat ook waarom: binnen het vel is het een icoontje op
     papier, erbuiten is het dezelfde pop op dezelfde poort als op de
     sterrenkeuze, en het vel eronder is er een schermhoogte korter van. */
  $('newstar-body').innerHTML = `<div class="settings-panel">
    <div class="newstar-preview"><div class="stage" id="newstar-stage"><div class="avatar-holder idle">${avatarSVG(preview, 132)}</div></div></div>
    <div class="set-card newstar-vel">
      <div class="ns-groep">
        <div class="set-field"><label class="lbl">Wie ben je?</label>
          <div class="chip-row mode-row" id="newstar-base">${BASE_CHOICES.map(b =>
            halfChip(b.id, b.emoji, b.name, b.id === n.base)).join('')}</div></div>
        <div class="set-field"><label class="lbl" for="newstar-name">Naam</label>
          <div class="name-edit-wrap"><input type="text" id="newstar-name" value="${esc(n.name)}" maxlength="12" placeholder="Hoe heet je ster?" autocomplete="off" enterkeyhint="done"><span class="name-edit-ico" aria-hidden="true">✏️</span></div></div>
      </div>
      <div class="ns-groep">
        <div class="set-field"><label class="lbl">Haar</label>
          <div class="chip-row" id="newstar-hair">${swatchChips('hair', START_HAIR, n.hair)}</div></div>
        <div class="set-field"><label class="lbl">Kleren</label>
          <div class="chip-row" id="newstar-dress">${swatchChips('dress', START_DRESS, n.dress)}</div></div>
      </div>
      <div class="ns-groep">
        <div class="set-field"><label class="lbl">Hoe speel je?</label>
          <div class="chip-row mode-row" id="newstar-track">
            ${halfChip('count', '🧸', 'Leren tellen', s.track === 'count')}
            ${halfChip('math', '🎤', 'Rekenen', s.track === 'math')}
          </div>
          <div class="note">${s.track === 'count'
            ? 'Nog niet lezen: tellen met plaatjes.'
            : 'Met cijfers en sommen.'}</div></div>
        <details class="set-reveal" id="newstar-oefen"${n.open ? ' open' : ''}>
          <summary>
            <span class="sr-ico" aria-hidden="true">⚙️</span>
            <span class="sr-text"><span class="sr-title">Oefening</span>
              <span class="sr-val">${oefenSamenvatting(s)}</span></span>
          </summary>
          <div class="set-reveal-body">
            ${oefenGroups(s, 'ns-').map(g => `<div class="reveal-group">
              <div class="rg-title">${g.ico} ${g.title}</div>${g.html}</div>`).join('')}
            <div class="note" style="margin-top:14px">Later te wijzigen bij 👨‍👩‍👧 Voor ouders.</div>
          </div>
        </details>
      </div>
      <div class="newstar-voet">
        <button class="btn newstar-go" id="newstar-go" aria-disabled="${ok ? 'false' : 'true'}">🌟 Klaar!</button>
      </div>
    </div>
  </div>`;
  applyStage($('newstar-stage'), preview);
  // bindChips en niet chip: de sjabloon hierboven gebruikt de globale chip(v, label, on)
  // uit het ouderdeel, en een gelijknamige const hier zou die in dit hele bereik
  // afdekken (ReferenceError, nog vóór de eerste regel van de sjabloon).
  const bindChips = (id, fn) => { const el = $(id); if (el) el.querySelectorAll('.chip').forEach(c => c.onclick = () => { sndClick(); fn(c.dataset.v); renderNewStar(); }); };
  bindChips('newstar-base',  v => newStar.base = v);
  bindChips('newstar-hair',  v => newStar.hair = v);
  bindChips('newstar-dress', v => newStar.dress = v);
  bindChips('newstar-track', v => {
    s.track = v;
    // De standaardlengte verschilt per modus (kleuters krijgen een kortere ronde).
    // Alleen bijstellen zolang een ouder er zelf niet aan gezeten heeft -- anders
    // zet even-de-andere-modus-bekijken haar keuze stilletjes terug.
    if (!newStar.perLevelSet) s.perLevel = (v === 'count' ? COUNT_OPTS.perLevel : DEFAULT_PERLEVEL);
  });
  // dezelfde velden als in het ouderdeel; er is alleen nog niets om op te slaan
  bindOefenChips(s, null, 'ns-', id => {
    if (id === 'set-perlevel') newStar.perLevelSet = true;
    sndClick();                 // net als de basis-, haar-, kleren- en modus-chips hierboven
    renderNewStar();
  });
  const dt = $('newstar-oefen');
  if (dt) dt.ontoggle = () => { newStar.open = dt.open; if (dt.open) sndClick(); };
  // alleen de waarde bijhouden, niet hertekenen: hertekenen midden in het typen
  // zou het veld (en de cursor) opnieuw opbouwen
  const nm = $('newstar-name');
  nm.oninput = e => {
    newStar.name = e.target.value;
    merkKlaarKnop();
  };
  /* Enter is op een telefoon de enige knop die het toetsenbord zelf aanbiedt, en
     hij deed niets: het veld staat niet in een <form>, dus de toets viel in het
     niets terwijl de Klaar-knop onder het opgeklapte toetsenbord verstopt zat.

     Nu betekent Enter wat hij belooft: klaar met dit veld. Het toetsenbord gaat
     weg (blur), en is het formulier af, dan is dat meteen dezelfde tik als op
     Klaar. Is het nog niet af -- de vraag "wie ben je?" heeft geen voorkeuze --
     dan blijft het formulier gewoon staan, nu wel zichtbaar. Er wordt niets
     extra's gevalideerd: createStar houdt precies dezelfde regels aan. */
  nm.onkeydown = e => {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();                       // nooit een regeleinde of een dwaal-submit
    nm.blur();
    /* Onvoorwaardelijk naar createStar: die weigert zelf als er nog iets ontbreekt
       (dezelfde regel als altijd) en wijst dan aan wát. Hiervoor stopte Enter bij
       een uitgeschakelde knop en gebeurde er niets -- het toetsenbord ging weg en
       daar bleef het bij. */
    createStar();
  };
  $('newstar-go').onclick = createStar;
  if (scr) { scr.scrollTop = keep; requestAnimationFrame(() => { scr.scrollTop = keep; }); }
}
/* Staat de Klaar-knop op "kan"? Eén bron, gelezen door de knop zelf en door het
   naamveld terwijl er getypt wordt. */
function nieuweSterKlaar() { return !!(newStar && newStar.name.trim() && newStar.base); }
function merkKlaarKnop() {
  const go = $('newstar-go');
  if (go) go.setAttribute('aria-disabled', nieuweSterKlaar() ? 'false' : 'true');
}
/* Wat er nog mist, en waar het antwoord hoort te komen. Dit is het enige dat een
   geweigerde Klaar-tik doet: het veld dat aan de beurt is in beeld zetten, er twee
   keer zacht omheen kloppen, en in één regel zeggen wat er gevraagd wordt.

   Waarom dit er is: "Wie ben je?" heeft met opzet geen voorkeuze (zie openNewStar),
   en dus is een net ingevuld formulier regelmatig nog niet af. De grijze knop zei
   dát wel, maar niet wát -- en tikken erop gaf helemaal niets terug.

   Bewust géén foutstijl: geen rood, geen kruisje, geen melding die blijft staan.
   Er is niets fout gegaan; er is alleen nog niet getikt. En bewust geen focus op
   het naamveld: na Enter is het toetsenbord net weg, en dat meteen weer opengooien
   is precies wat het formulier onhandelbaar maakte. */
function wijsOntbrekende() {
  if (!newStar) return;
  const basisMist = !newStar.base;
  const doelen = basisMist
    ? [...($('newstar-base') || { querySelectorAll: () => [] }).querySelectorAll('.chip')]
    : [$('newstar-name')].filter(Boolean);
  if (!doelen.length) return;
  sndClick();
  const anker = doelen[0];
  if (anker.scrollIntoView) anker.scrollIntoView({ block: 'center', behavior: motionOff() ? 'auto' : 'smooth' });
  doelen.forEach(el => {
    el.classList.remove('vraagt');
    void el.offsetWidth;                 // anders herstart de animatie niet
    el.classList.add('vraagt');
  });
  setTimeout(() => doelen.forEach(el => el.classList.remove('vraagt')), 2400);
  showToast(basisMist ? 'Kies eerst wie je bent 👆' : 'Geef je ster nog een naam 👆');
  setTimeout(hideToast, 2200);
}
function createStar() {
  /* Twee keer Klaar is één ster. Enter én de knop komen hier allebei uit, en op
     een telefoon liggen die twee tikken vlak na elkaar: zonder deze regel maakte
     de tweede tik een tweede ster (of, sinds de naam moet kloppen, een melding
     dat je eigen naam al bezet is). newStar wordt onderaan losgelaten, dus dit is
     meteen ook de grendel op alles wat er daarna nog binnenkomt. */
  if (!newStar) return;
  // pas hier valideren, niet tijdens het typen: een veld dat zichzelf corrigeert
  // terwijl je bezig bent is niet te gebruiken (zie de opmerking bij set-name)
  const name = newStar.name.trim().replace(/\s+/g, ' ').slice(0, 12);
  if (!name || !newStar.base) return wijsOntbrekende();
  const taken = Object.values(db.profiles).some(p => p.name.toLowerCase() === name.toLowerCase());
  if (taken) {
    showToast('⚠️ Die naam bestaat al', null, 'Twee sterren met dezelfde naam zijn niet uit elkaar te houden.');
    setTimeout(hideToast, 2600);
    return;
  }
  const key = nextProfileKey();
  // vóór het toevoegen uitrekenen: anders telt de nieuwe ster (nog zonder order)
  // zichzelf mee als de 90-bak en begint iedereen op 91
  const order = nextOrder();
  // defaultProfile neemt élke instelling aan (zie de opmerking daar), dus het
  // concept gaat er in één keer in -- aangeraakt of niet.
  db.profiles[key] = defaultProfile(name, newStar.dress, { ...newStar.settings, hair: newStar.hair, base: newStar.base });
  db.profiles[key].order = order;   // expliciet: assignProfileOrder gaat op naam
  save();
  newStar = null;
  /* Een ster maken ís beginnen. Hiervoor kwam een kind dat net haar pop had
     gekozen terug op de sterrenkeuze, waar ze zichzelf tussen haar broers en
     zussen moest opzoeken en nóg een keer moest tikken -- een bevestigingsscherm
     met kaarten erop. Nu stapt ze meteen haar eerste wereld in, langs precies
     dezelfde weg als elke andere tik op een tegel (selectProfile -> goMap, en dus
     de grens uit continueWorld: voor een verse ster is dat wereld 1, halte 1).

     Uit het ouderdeel blijft het wél een terugkeer: daar is een ster maken iets
     wat een ouder doet terwijl er misschien een ánder kind aan het spelen is, en
     dan is meteen wegspringen naar de kaart van de nieuwe ster juist verkeerd. */
  if (newStarReturn === 'settings') { setKey = key; setTab = 'beheer'; renderSettings(); toonHub('screen-settings'); settingsToTop(); }
  else { kiesBezig = false; selectProfile(key); }
  showToast(`🌟 ${esc(name)} staat op het podium!`, null,
            newStarReturn === 'settings' ? null : 'Jouw eerste show begint!');
  setTimeout(hideToast, 2400);
}

/* ================= Instellingen ================= */
/* Het ouderdeel: wit papier, rustige letters, geen feest. Drie onderdelen
   (Voortgang, Oefenen, Beheer) over één gekozen ster, met de sterrenrij erboven.

   Deze kop stond eerder boven "Nieuwe ster" hierboven, en dat was geen kleine
   slordigheid: de README zegt dat je op sectienaam zoekt om ergens te komen, dus
   wie "= Instellingen" zocht kwam tweehonderd regels te vroeg uit, midden in een
   formulier dat over iets anders gaat. Een inhoudsopgave die je op de verkeerde
   plek afzet is erger dan geen. */
let setKey = 'p1';
// 'voortgang' (lezen) | 'oefenen' (hoe dit kind oefent) | 'beheer' (profiel + data).
// Bewust niet 'instellen': dat botst met de app-instellingen onder het tandwiel.
let setTab = 'voortgang';
function openSettings() {
  closeGearMenu();
  // cur is hier bijna altijd null (het tandwiel staat alleen op het keuzescherm,
  // en goProfiles wist cur), dus normaal valt hij terug op de eerste ster. Nul
  // sterren mag ook: dan is Beheer het enige onderdeel, want dáár zit
  // "Back-up terugzetten" -- de reden dat een nieuw toestel hier komt.
  setKey = (cur && db.profiles[cur]) ? cur : (profileKeys()[0] || null);
  setTab = setKey ? 'voortgang' : 'beheer';
  renderSettings();
  toonHub('screen-settings');
  // één keer aanhangen (een tweede toewijzing aan onscroll vervángt de vorige,
  // dus er kan er nooit meer dan één staan -- zelfde patroon als de kast)
  $('screen-settings').onscroll = ouderScroll;
  settingsToTop();
}
function closeSettings() {
  save();
  goProfiles();
}
// Tabblad "Voortgang" — alleen-lezen ouderrapport: kerncijfers, niveau-inschatting
// en de concrete sommen waar het spel nu extra op oefent.
// Vlotheid: hoe vaak komt een goed antwoord er zó uit, i.p.v. uitgerekend te
// worden? Pas tonen als er genoeg gespeeld is, anders zegt het niets. Alleen
// voor de rekenmodus (de telmodus heeft haar eigen fase-opbouw).
function fluencyHtml(p) {
  if (p.settings.track === 'count') return '';
  const ops = (p.settings.ops || []).filter(o => p.opTrack[o] && p.opTrack[o].n >= 10);
  if (!ops.length) return '';
  const avg = ops.reduce((a, o) => a + (p.opTrack[o].fast == null ? 0.5 : p.opTrack[o].fast), 0) / ops.length;
  const pct = Math.round(avg * 100);
  const hint = avg >= FLUENT_MIN
    ? 'Veel sommen komen er vlot uit — een goed teken om iets moeilijkers te proberen.'
    : 'De sommen kloppen, maar worden nog vaak uitgerekend. Het spel wacht daarom nog even met moeilijkere vraagsoorten.';
  return `<div class="stat-line"><span class="k">Vlotheid <span class="note">(uit het hoofd)</span></span><span class="v">${pct}%</span></div>
    <div class="stat-bar"><div style="width:${pct}%"></div></div>
    <div class="note" style="margin-top:6px">${hint}</div>`;
}
function statsPanelHtml(p) {
  const shows = playedCount(p);
  const stars = totalStarCount(p);
  const perfect = perfectCount(p);
  const answered = p.stats.correct + p.stats.wrong;
  const acc = answered ? Math.round(100 * p.stats.correct / answered) : 0;
  const isCount = p.settings.track === 'count';
  const madeCap = isCount ? mv(answered, 'vraag gemaakt', 'vragen gemaakt')
                          : mv(answered, 'som gemaakt', 'sommen gemaakt');
  let practice;
  if (isCount) {
    // lees-vrije modus: geen zwakke-sommenlijst, maar in mensentaal wat het kind al kan
    // Wélke fase het kind nu speelt staat al in niveauHtml hierboven; hier gaat
    // het over wat er áchter haar ligt. Stond er twee keer, en dan leest de
    // tweede als een fout.
    const st = countLiveStage(p);
    const done = COUNT_STAGE_LABELS.slice(1, st).map(l => `<span class="practice-chip">${l} ✓</span>`).join('');
    const help = st <= 2 ? 'In deze fases speelt je kind het fijnst met een volwassene erbij.' : 'Je kind kan deze fase meestal alleen spelen.';
    practice = `<div class="practice-hint">🧸 Fases die ${esc(p.name)} al gehad heeft:</div>
       <div class="practice-chips">${done || '<span class="stats-empty">Net begonnen — veel plezier! 🎉</span>'}</div>
       <div class="note" style="margin-top:8px">${help}</div>`;
  } else {
    // p.weak wordt op sjabloon gesleuteld ("7 × 8 = @"), met @ als de lege plek.
    // Die plaatshouder is intern; een ouder hoort gewoon de som te zien.
    const weak = Object.entries(p.weak).sort((a, b) => b[1].w - a[1].w).slice(0, 8)
      .map(([tmpl, e]) => tmpl.replace('@', e.ans == null ? '?' : e.ans));
    practice = weak.length
      ? `<div class="practice-hint">🎯 Sommen die nu nog lastig zijn — hier oefent het spel extra op:</div>
         <div class="practice-chips">${weak.map(t => `<span class="practice-chip">${t}</span>`).join('')}</div>`
      : `<div class="stats-empty">Geen moeilijke sommen op dit moment — goed bezig! 🎉</div>`;
    // onderhoud zichtbaar maken: geleerde sommen komen later nog eens terug,
    // zodat we merken of het blijft zitten (i.p.v. ze definitief te vergeten)
    const nLearned = Object.keys(p.learned || {}).length;
    if (nLearned) practice += `<div class="note" style="margin-top:8px">🧠 ${nLearned} geleerde ${mv(nLearned, 'som komt', 'sommen komen')} later nog eens terug, om te controleren of het blijft zitten.</div>`;
  }
  /* FASE 5D -- niet alles is even belangrijk.
     Er stonden zes tegels in één raster, alle zes even groot en even zwaar: hoe
     vaak er gespeeld is stond naast hoeveel trofeeën er in de kast hangen, alsof
     een ouder die twee even vaak nodig heeft. De rangorde die er nu ligt:

       1. ACTIVITEIT EN RESULTAAT -- drie tegels: hoe vaak, hoeveel vragen, en
          hoeveel daarvan goed. Dit is waar een ouder voor komt.
       2. DE OOGST -- sterren, perfecte shows en trofeeën in één rustige regel.
          Ze zijn niet onbelangrijk, maar ze zijn van het kind: in de kast en op
          de kaart staan ze groot, hier hoeven ze alleen te bestaan. (Zie ook de
          UX-review: de kast is de plek waar je gaat kíjken hoe het ervoor staat.)
       3. HET NIVEAU -- apart, onder een streepje, met de fase erbij (zie
          niveauHtml). */
  /* De trofeeteller is een breuk, en die is altijd meervoud: "1/18 trofeeën"
     spreek je uit als "1 van de 18 trofeeën". De noemer komt uit
     activeTrophies() -- dezelfde bron als de kop van de kast, zodat er nooit
     twee verschillende totalen in de app kunnen staan. */
  const oogst = [
    ['⭐', stars, mv(stars, 'ster', 'sterren')],
    ['🌟', perfect, mv(perfect, 'perfecte show', 'perfecte shows')],
    ['🏆', `${earnedActiveCount(p)}/${activeTrophies().length}`, 'trofeeën'],
  ].map(([ico, n, label]) => `<span class="oogst-item"><b>${ico} ${n}</b> ${label}</span>`).join('');
  return `<div class="settings-panel"><div class="set-card">
    <div class="set-card-head"><div class="ico">📊</div>
      <div><h2>Voortgang van ${esc(p.name)}</h2><div class="sub">Wat je kind tot nu toe heeft geoefend</div></div></div>
    <div class="stat-grid">
      <div class="stat-tile" style="--tint:var(--purple-light)"><div class="num">${shows}</div><div class="cap">${mv(shows, 'show', 'shows')} gespeeld</div></div>
      <div class="stat-tile" style="--tint:var(--purple-light)"><div class="num">${answered}</div><div class="cap">${madeCap}</div></div>
      <div class="stat-tile" style="--tint:var(--stat-green)"><div class="num">${acc}%</div><div class="cap">goed beantwoord</div></div>
    </div>
    <div class="oogst-rij">${oogst}</div>
    ${niveauHtml(p)}
    ${fluencyHtml(p)}
    ${practice}
  </div></div>`;
}
/* De niveau-inschatting -- en waarom er geen percentage meer staat.
   FASE 5D.1. Hier stond "Niveau-inschatting -- 50%" met een half gevulde balk
   eronder, en daaronder een regel die uitlegde dat dit géén schoolniveau is.
   Dat is een gevecht dat de tekst niet kan winnen: een getal van honderd met een
   balk eronder ís een rapportcijfer, wat er ook onder staat. Een ouder las
   "mijn kind zit op de helft", en dat betekent p.perf niet -- het is een
   meelopende interne maat waarmee het spel de vragen makkelijker of moeilijker
   maakt, en hij zweeft de hele tijd rond het midden omdat hij dáárop stuurt.

   Dus is het getal en de balk uit het scherm. Aan p.perf zelf is niets
   veranderd: hij stuurt de moeilijkheid precies zoals hiervoor, hij wordt alleen
   niet meer als cijfer getoond. Wat een ouder wél wil weten stond er al onder en
   staat nu vooraan: waar haar kind op dit moment aan werkt. */
function niveauHtml(p) {
  const s = p.settings;
  let bezig;
  if (s.track === 'count') {
    const st = countLiveStage(p);
    const top = countMaxStage(s);
    bezig = `🧸 Leren tellen — <b>fase ${st}${top > st ? ' van ' + top : ''}</b>: ${COUNT_STAGE_LABELS[st] || ''}`;
  } else {
    const glyph = { '+': '➕', '-': '➖', 'x': '✖️', ':': '➗' };
    bezig = `🎤 Rekenen — <b>${(s.ops || []).map(o => glyph[o] || o).join(' ')}</b> met getallen tot <b>${s.max}</b>`;
  }
  return `<div class="niveau-blok">
    <div class="niveau-kop">Niveau-inschatting</div>
    <div class="niveau-bezig">${bezig}</div>
    <div class="note">Het spel past de moeilijkheid automatisch aan: het schuift mee met wat goed en fout gaat.</div>
  </div>`;
}

// Tabblad "Oefening" — alle bewerkbare instellingen, gegroepeerd in kaarten.
// Meerkeuze- en enkelkeuze-chips zien er bewust hetzelfde uit (alleen kleur
// wisselt) -- dit is een laagdrempelig, direct-manipulatie schermpje: één tik
// laat meteen zien of een groep er meerdere naast elkaar toestaat of niet.
function chip(v, label, on, extra) {
  return `<button class="chip ${on ? 'on' : ''}${extra ? ' ' + extra : ''}" data-v="${v}">${label}</button>`;
}
const COUNT_STAGE_LABELS = ['', 'Tellen 1–3', 'Tellen 1–5', 'Meer / minder', 'Evenveel', 'Luister', 'Cijfers', 'Eén meer / minder', 'Samen / splitsen', 'Som met tekens', 'Cijfers met stippen', 'Geschreven som'];
/* De oefenvelden zelf, los van de omlijsting eromheen. Het ouderdeel zet ze in
   .set-card primary met een icoonkop; het maakformulier zet ze plat in een
   openklapper. Eén bron, twee omlijstingen -- anders staan dezelfde zeven
   keuzes straks op twee plekken en lopen ze uit elkaar.

   pfx houdt de twee kopieën uit elkaar. #screen-settings staat vóór
   #screen-newstar in de DOM en schermen worden verborgen, niet weggehaald, dus
   zonder voorvoegsel vindt getElementById in bindOefenChips stilletjes de
   verkeerde kopie. Het ouderdeel houdt pfx = '' (alle bestaande selectors en
   tests blijven kloppen), het maakformulier gebruikt 'ns-'. */
function oefenGroups(s, pfx) {          // -> [{ ico, title, sub, secundair?, html }]
  pfx = pfx || '';
  const opDefs = [['+', '➕ Plus'], ['-', '➖ Min'], ['x', '✖️ Maal'], [':', '➗ Delen']];
  const tablesRelevant = s.ops.includes('x') || s.ops.includes(':');
  // Welke fases áángeboden mogen worden hangt ALLEEN van cijfers-aan/uit af
  // (1–11, of 1–5 zonder cijfers) -- niet van de al gekozen bovengrens. Anders
  // kun je een eerder verlaagde bovengrens nooit meer omhoog zetten.
  const availMax = s.numerals ? COUNT_STAGE_MAX : 5;
  const stageNums = [];
  for (let v = 1; v <= availMax; v++) stageNums.push(v);
  /* FASE 5D -- de fasekiezer las als tweeëntwintig losse knopjes.
     Twee rijen van elf gelijke rondjes onder elkaar, elk met een eigen rand: wat
     een ouder zag was een cijferslot, niet "begin hier, groei tot daar". Er is
     geen bediening weggehaald (de tik op elk nummer doet precies wat hij deed),
     maar er zijn drie dingen bijgekomen:

       1. EEN ZIN BOVENAAN. "Begint bij fase 3 en mag groeien tot fase 11" zegt
          in woorden wat de twee rijen samen betekenen.
       2. HET BEREIK IS TE ZIEN. De fases binnen [start .. hoogste] staan in
          beide rijen licht gevuld (.bereik), dus de twee rijen tekenen dezelfde
          band en je ziet in één blik hoe breed die is. De gekozen fase blijft
          vol paars, precies zoals elke andere gekozen chip in de app.
       3. DE NAMEN DOEN MEE. De legenda eronder is een rijtje in kolommen in
          plaats van een doorlopende alinea, en wat buiten het bereik valt staat
          gedempt -- met "start" en "max" als kaartje bij de twee grenzen. */
  /* FASE 5D.1 -- drie keuzes die samen één vraag beantwoorden, dus drie gelijke
     helften op één regel. Met het icoon náást het woord paste "🧸 Voorwerpen"
     daar niet in (127px nodig, 105 beschikbaar op een telefoon van 390) en
     wikkelde het woord half onder zijn eigen emoji. Het icoon staat daarom bóven
     het woord -- dezelfde vorm als de moduskeuze bovenaan (.chip.gestapeld),
     een maat kleiner omdat dit een optie in de stille kaart is en niet de
     hoofdkeuze van het scherm. */
  const reprChip = (v, ico, label, on) => chip(v,
    `<span class="mc-ico" aria-hidden="true">${ico}</span><span class="mc-label">${label}</span>`,
    on, 'gestapeld');
  const lo = Math.min(Math.max(1, s.stage || 1), availMax);
  const hi = Math.min(Math.max(lo, s.stageMax || availMax), availMax);
  const stageChips = (id, sel) => `<div class="chip-row stage-chips" id="${pfx}${id}">${stageNums.map(v =>
    chip(v, v, Math.min(sel, availMax) === v, (v >= lo && v <= hi) ? 'bereik' : '')).join('')}</div>`;
  const legend = `<div class="stage-legend">${stageNums.map(v => {
    const tag = v === lo ? '<i class="sl-tag">start</i>' : (v === hi && hi > lo ? '<i class="sl-tag">max</i>' : '');
    return `<span class="${v >= lo && v <= hi ? '' : 'uit'}"><b>${v}</b> ${COUNT_STAGE_LABELS[v]}${tag}</span>`;
  }).join('')}</div>`;
  if (s.track === 'count') return [{
    ico: '🔢', title: 'Fases', sub: 'Waar het begint, en hoe ver het mag groeien', html: `
      <div class="fr-zin">Begint bij <b>fase ${lo}</b>${hi > lo ? ` en mag meegroeien tot <b>fase ${hi}</b>` : ' en blijft daar'}.</div>
      <div class="set-field"><span class="lbl">Startfase</span><span class="hulp">Hier begint het.</span>${stageChips('set-stage', s.stage)}</div>
      <div class="set-field"><span class="lbl">Hoogste fase</span><span class="hulp">Zover mag het spel groeien.</span>${stageChips('set-stagemax', s.stageMax)}</div>
      ${legend}`
  }, {
    ico: '⚙️', title: 'Meer opties', sub: 'Weergave, hoeveelheden en lengte', secundair: true, html: `
      <div class="set-field"><span class="lbl">Cijfers tonen</span>
        <span class="hulp">Cijfers, minder stippensteun en meer redeneren vanaf fase 6.</span>
        <div class="chip-row" id="${pfx}set-numerals">${chip('on', 'Aan', s.numerals !== false)}${chip('off', 'Uit', s.numerals === false)}</div></div>
      <div class="set-field"><span class="lbl">Hoogste hoeveelheid</span>
        <span class="hulp">Hoe ver de aantallen mogen groeien.</span>
        <div class="chip-row" id="${pfx}set-qmax">${[6, 8, 10].map(v => chip(v, v, (s.qmax || 10) === v)).join('')}</div></div>
      <div class="set-field"><span class="lbl">Antwoorden tonen als</span>
        <span class="hulp">Bij Mix wisselt het per vraag.</span>
        <div class="chip-row drie-op-een-rij" id="${pfx}set-repr">${
          reprChip('objects', '🧸', 'Voorwerpen', (s.repr || 'objects') === 'objects')}${
          reprChip('dots', '⚫', 'Stippen', s.repr === 'dots')}${
          reprChip('mix', '🎲', 'Mix', s.repr === 'mix')}</div></div>
      <div class="set-field"><span class="lbl">🎤 Memory-spel</span>
        <span class="hulp">Op de kaart: zoek de gelijke hoeveelheden.</span>
        <div class="chip-row" id="${pfx}set-memory">${chip('on', 'Aan', s.memory !== false)}${chip('off', 'Uit', s.memory === false)}</div></div>
      <div class="set-field"><span class="lbl">Vragen per optreden</span>
        <div class="chip-row" id="${pfx}set-perlevel">${[5, 8, 10].map(v => chip(v, v, s.perLevel === v)).join('')}</div></div>`
  }];
  return [{
    ico: '🎓', title: 'Wat oefenen', sub: 'Kies de bewerkingen en het bereik', html: `
      <div class="set-field"><span class="lbl">Bewerkingen</span>
        <div class="chip-row ops-grid" id="${pfx}set-ops">${opDefs.map(([v, l]) => chip(v, l, s.ops.includes(v))).join('')}</div></div>
      <div class="set-field"><span class="lbl">Getallen tot</span>
        <div class="chip-row" id="${pfx}set-max">${[10, 20, 50, 100].map(v => chip(v, v, s.max === v)).join('')}</div></div>
      <div class="set-field ${tablesRelevant ? '' : 'inactive'}"><span class="lbl">Tafels van</span>
        <span class="hulp">${tablesRelevant ? 'Voor ✖️ en ➗.' : 'Actief zodra ✖️ of ➗ aanstaat.'}</span>
        <div class="chip-row" id="${pfx}set-tables">${[1,2,3,4,5,6,7,8,9,10].map(v => chip(v, v, s.tables.includes(v))).join('')}</div></div>`
  }, {
    ico: '🎮', title: 'Meer opties', sub: 'Antwoorden, lengte en extra uitdaging', secundair: true, html: `
      <div class="set-field"><span class="lbl">Antwoorden</span>
        <div class="chip-row" id="${pfx}set-mode">
          ${chip('kies', 'Kiezen uit 4', s.mode === 'kies')}
          ${chip('typ', 'Zelf typen', s.mode === 'typ')}
          ${chip('mix', 'Afwisselen', s.mode === 'mix')}
        </div></div>
      <div class="set-field"><span class="lbl">Vragen per optreden</span>
        <div class="chip-row" id="${pfx}set-perlevel">${[5, 8, 10].map(v => chip(v, v, s.perLevel === v)).join('')}</div></div>
      <div class="set-field"><span class="lbl">Extra uitdaging</span>
        <span class="hulp">Verschijnt geleidelijk, pas als de gewone sommen goed gaan.</span>
        <div class="chip-row" id="${pfx}set-extra">
          ${chip('missNum', '🔍 Zoek het getal', s.missNum !== false)}
          ${chip('chain3', '➕ Drie getallen', s.chain3 !== false)}
        </div></div>`
  }];
}
/* Wat er in de dichte openklapper te lezen staat: een ouder die hem nooit opent
   ziet zo tóch waar haar kind mee begint. */
function oefenSamenvatting(s) {
  if (s.track === 'count') {
    const top = countMaxStage(s);   // klemt al op stageMax én op de cijfers-uit-grens
    return `fase ${s.stage}${top > s.stage ? '–' + top : ''}`
         + ` · hoeveelheden tot ${s.qmax || 10} · ${s.perLevel} ${mv(s.perLevel, 'vraag', 'vragen')}`;
  }
  const glyph = { '+': '➕', '-': '➖', 'x': '✖️', ':': '➗' };
  const modes = { kies: 'kiezen uit 4', typ: 'zelf typen', mix: 'afwisselend' };
  const tafels = (s.ops.includes('x') || s.ops.includes(':'))
    ? ` · tafels ${s.tables.slice().sort((a, b) => a - b).join(', ')}` : '';
  return `${s.ops.map(o => glyph[o] || o).join(' ')} · tot ${s.max}${tafels}`
       + ` · ${modes[s.mode] || s.mode} · ${s.perLevel} ${mv(s.perLevel, 'vraag', 'vragen')}`;
}
/* FASE 5D -- vier beslissingen, en ze zijn niet even groot.
   Dit is het drukste scherm van het ouderdeel, en alle drie de kaarten stonden in
   dezelfde .primary-omlijsting: modus, wat oefenen en hoe spelen vroegen even hard
   om aandacht. De volgorde die een ouder nodig heeft is:

     1. MODUS             -- leren tellen of rekenen. Verandert alles eronder.
     2. WAT / VANAF WAAR  -- de bewerkingen en het bereik, of de startfase.
     3. HOE VER           -- de hoogste fase (alleen in de telmodus).
     4. DE REST           -- weergave, lengte, extra uitdaging.

   1 t/m 3 houden de paarse omlijsting; 4 staat in een rustige kaart met een grijs
   tegeltje ("Meer opties"). Niets is weggestopt -- de velden staan er allemaal nog,
   zichtbaar, in dezelfde volgorde. Alleen het gewicht verschilt nu.

   Waarom geen openklapper: het zijn er drie tot vijf, ze passen ruim, en een
   ouder die de antwoordmethode wil omzetten hoort daar niet eerst naar te moeten
   zoeken. Een stillere kaart doet hier hetzelfde werk als wegklappen, zonder
   iets te verbergen. */
function oefenenPanelHtml(p, s) {
  const isCount = s.track === 'count';
  // gemeenschappelijke kop: kiezen tussen de rekenshow en de lees-vrije telmodus.
  // De twee keuzes zijn de zwaarste van dit scherm, dus staan ze als twee volle
  // helften naast elkaar (.mode-row) in plaats van als twee pillen in een rij --
  // en de gekozene draagt een vinkje, zodat "dit staat aan" niet alleen van de
  // vulling hoeft te komen.
  const modeChip = (v, ico, label) => `<button class="chip gestapeld${(v === 'count') === isCount ? ' on' : ''}" data-v="${v}">`
    + `<span class="mc-ico" aria-hidden="true">${ico}</span><span class="mc-label">${label}</span></button>`;
  const modeCard = `
    <div class="set-card primary">
      <div class="set-card-head"><div class="ico">${isCount ? '🧸' : '🎤'}</div><div><h2>Modus</h2><div class="sub">Hoe ${esc(p.name)} speelt</div></div></div>
      <div class="set-field"><span class="lbl">Manier van spelen</span>
        <div class="chip-row mode-row" id="set-track">
          ${modeChip('count', '🧸', 'Leren tellen')}
          ${modeChip('math', '🎤', 'Rekenen')}
        </div>
        <div class="note" style="margin-top:8px">${isCount ? 'Lees-vrij: gesproken opdrachten en hoeveelheden i.p.v. cijfers. Ideaal voor kleuters die nog niet lezen.' : 'De gewone rekenshow met cijfers en sommen.'}</div></div>
    </div>`;
  // de kaarten die per modus verschillen
  const cards = oefenGroups(s, '').map(g => `
    <div class="set-card${g.secundair ? ' secundair' : ' primary'}">
      <div class="set-card-head"><div class="ico">${g.ico}</div><div><h2>${g.title}</h2><div class="sub">${g.sub}</div></div></div>
      ${g.html}
    </div>`).join('');
  return `<div class="settings-panel">${modeCard}${cards}</div>`;
}

/* ---- Beheer: alles wat géén oefeninstelling is ----
   Twee soorten dingen, en het verschil moet te zien zijn:
     - kindgebonden : naam, en opnieuw beginnen (raakt alleen deze ster)
     - app-breed    : back-up (exportData schrijft de héle db weg -- alle sterren
                      plus geluid/trillen -- en importData vervángt die helemaal)
   De back-up stond hiervoor ín de kindcontext, met een tekst die niet zei over
   wie hij ging, terwijl "wissen" er vlak onder wél "van Anna" zei: precies de
   verkeerde kant op. Daarom staat back-up nu ná een streepje "Voor alle sterren",
   buiten de kindkaarten -- en daarom is dat stuk apart (appWideCardsHtml), zodat
   het óók bestaat als er nog geen enkele ster is. Dat is niet theoretisch: een
   familie met een nieuwe telefoon heeft nul sterren en wil juist dán bij
   "Back-up terugzetten". */
/* FASE 5D -- hiërarchie in de knoppen.
   Vier knoppen in dit blok stonden alle vier als dezelfde volle paarse knop:
   "Nieuwe ster maken", "Back-up maken" en "Back-up terugzetten" vroegen even hard
   om een tik, terwijl de derde de enige is die iets kán overschrijven. Nu:

     vol paars  -- de knop die iets maakt en niets kan kwijtmaken (back-up maken;
                   dat is bovendien wat je hier het vaakst komt doen)
     .paper     -- de knoppen die ergens anders heen gaan of iets vervángen
                   (nieuwe ster; terugzetten). De bevestiging erachter is
                   ongewijzigd -- dit is de vindbaarheid, niet de beveiliging.

   Er is geen knop verplaatst en geen bevestiging weggehaald. */
function appWideCardsHtml(hasStars) {
  const plek = MAX_PROFILES - Object.keys(db.profiles).length;
  const vol = hasStars ? ` Nog plek voor ${plek} ${mv(plek, 'ster', 'sterren')}.` : '';
  const addCard = Object.keys(db.profiles).length >= MAX_PROFILES ? '' : `
    <div class="set-card secundair">
      <div class="set-card-head"><div class="ico">➕</div><div><h2>Nieuwe ster</h2><div class="sub">Nog een kind erbij.${vol}</div></div></div>
      <button class="btn small paper" id="set-newstar">➕ Nieuwe ster maken</button>
    </div>`;
  return `${addCard}
    <div class="set-card">
      <div class="set-card-head"><div class="ico">🗄️</div><div><h2>Back-up &amp; herstel</h2><div class="sub">Geldt voor alle sterren en voor de app zelf</div></div></div>
      <div class="note" style="margin-bottom:11px">Eén bestand met de voortgang van álle sterren — om veilig te bewaren of over te zetten naar een ander toestel.</div>
      <div class="data-btns">
        <button class="btn small purple" id="set-export">💾 Back-up maken</button>
      </div>
      <div class="data-los">
        <button class="btn small paper" id="set-import">📂 Back-up terugzetten…</button>
        <div class="note">Vervángt alles wat er nu op dit toestel staat, van álle sterren. Er wordt eerst gevraagd of je het zeker weet.</div>
      </div>
      <input type="file" id="set-import-file" accept="application/json,.json" style="display:none">
    </div>`;
}
// Nul sterren: geen naam om te wijzigen, geen voortgang om te wissen. Alleen wat
// over de app als geheel gaat.
function beheerEmptyHtml() {
  return `<div class="settings-panel">
    <div class="set-card">
      <div class="set-card-head"><div class="ico">🌟</div><div><h2>Nog geen sterren</h2><div class="sub">Maak er een, of zet een back-up terug</div></div></div>
    </div>
    ${appWideCardsHtml(false)}
  </div>`;
}
/* FASE 5D -- de twee onomkeerbare dingen staan onderaan, en ze zeggen ook wat
   er blíjft.
   De opbouw is dezelfde als hiervoor (naam bovenaan, opnieuw beginnen eronder,
   verwijderen achter een openklapper) -- wat eraan veranderd is:
     * "Opnieuw beginnen" en "Verwijderen" staan nu samen in één stille kaart
       onder een eigen kopje, in plaats van dat verwijderen in de naamkaart zat.
       Een ouder die haar dochters naam wil verbeteren hoort niet in dezelfde
       kaart een wisknop tegen te komen.
     * Beide openklappers zeggen expliciet wat er BLIJFT, niet alleen wat er
       weggaat -- dat is bij "opnieuw beginnen" precies het verschil met
       verwijderen, en dat verschil stond alleen in een losse notitie.
   De bevestigingsvensters erachter zijn ongewijzigd (drie tikken: openklappen,
   knop, ja). */
function beheerPanelHtml(p) {
  return `<div class="settings-panel">
    <div class="set-card">
      <div class="set-card-head"><div class="ico">👤</div><div><h2>Profiel</h2><div class="sub">De naam van deze ster</div></div></div>
      <div class="set-field"><label class="lbl" for="set-name">Naam</label>
        <div class="name-edit-wrap"><input type="text" id="set-name" value="${esc(p.name)}" maxlength="12" enterkeyhint="done"><span class="name-edit-ico" aria-hidden="true">✏️</span></div>
        <div class="note">Wijzigingen worden meteen opgeslagen.</div></div>
    </div>
    <div class="set-card secundair">
      <div class="set-card-head"><div class="ico">⚠️</div><div><h2>Opnieuw beginnen of verwijderen</h2><div class="sub">Alleen voor ${esc(p.name)} — en niet terug te draaien</div></div></div>
      <!-- rode vlak bestaat pas als een ouder er zelf om vraagt; een permanent
           zichtbare wisknop hoort niet tussen gewone instellingen te staan -->
      <details class="danger-reveal" id="set-danger">
        <summary>Voortgang wissen…</summary>
        <div class="danger-zone">
          <div><div class="t">⚠️ Voortgang van ${esc(p.name)} wissen</div>
            <div class="d"><b>Weg:</b> alle diamanten, sterren, trofeeën en gekochte spulletjes.<br>
              <b>Blijft:</b> ${esc(p.name)} zelf, haar naam, haar startoutfit en alle oefeninstellingen.</div></div>
          <button class="danger-btn" id="set-reset">Wissen</button>
        </div>
      </details>
      <!-- verwijderen hoort bij "wie deze ster is", niet bij "opnieuw beginnen":
           het ene haalt haar wég, het andere laat haar juist blijven -->
      <details class="danger-reveal" id="set-danger-del">
        <summary>Deze ster verwijderen…</summary>
        <div class="danger-zone">
          <div><div class="t">⚠️ ${esc(p.name)} verwijderen</div>
            <div class="d">Haalt ${esc(p.name)} helemaal weg van dit toestel, met alle diamanten, sterren en spulletjes. De andere sterren blijven. Kan niet ongedaan gemaakt worden.</div></div>
          <button class="danger-btn" id="set-delete">Verwijderen</button>
        </div>
      </details>
    </div>
    <div class="sheet-rule"><span>Voor alle sterren</span></div>
    ${appWideCardsHtml(true)}
  </div>`;
}

// Feedback wanneer een meerkeuze-chip niet uit mag (de laatste blijft altijd aan).
function blockedMinOne(el) {
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  showToast('Kies er minstens 1 👆');
  setTimeout(hideToast, 1500);
}
// gewone instellingen slaan meteen op -- geen aparte "Opslaan"-knop nodig,
// alleen een kort, subtiel pilletje in de kop dat het bevestigt
// Bij een wissel van onderdeel bovenaan beginnen: van een lang paneel naar een
// kort paneel landde je anders halverwege. Twee keer, want de nieuwe inhoud staat
// er pas na de hertekening.
function settingsToTop() {
  const el = $('screen-settings');
  if (!el) return;
  el.scrollTop = 0;
  requestAnimationFrame(() => { el.scrollTop = 0; });
  ouderScroll();          // bovenaan = de ruime kop
}
/* De kop van het ouderdeel heeft twee standen (zie #screen-settings.gescrold in
   het stijlblad): ruim bovenaan, krap zodra er kaarten onderdoor schuiven. Dit is
   letterlijk dezelfde afspraak als in de trofeeënkast (kastScroll), met dezelfde
   drempel van 4px -- op 0 wisselt hij bij het minste duimtrilletje heen en weer --
   en dezelfde rAF-rem, want scroll vuurt vaker dan er beeldjes zijn. */
let ouderScrollWacht = false;
function ouderScroll() {
  if (ouderScrollWacht) return;
  ouderScrollWacht = true;
  requestAnimationFrame(() => {
    ouderScrollWacht = false;
    const sc = $('screen-settings');
    if (sc) sc.classList.toggle('gescrold', sc.scrollTop > 4);
  });
}
let savedPillTimer = null;
function saveAndFlash() {
  save();
  const el = $('settings-saved');
  if (!el) return;
  el.classList.add('show');
  clearTimeout(savedPillTimer);
  savedPillTimer = setTimeout(() => el.classList.remove('show'), 1400);
}
// De drie onderdelen van het ouderdeel. Waarde = staat, label = wat er staat.
const SET_TABS = [['voortgang', 'Voortgang'], ['oefenen', 'Oefenen'], ['beheer', 'Beheer']];
// Alleen naar boven springen als het ónderdeel wisselt, niet bij elke chip-tik.
let lastWhoRendered = null;

/* Niveau 1 -- wíé: open rij portretten, geen omsloten spoor. Dit is dezelfde
   scrollende pil-rij als de kleedkamer (.tab-btn + hscroll-fade + updateFades),
   met het echte avatar-portret erin i.p.v. voor elk kind hetzelfde sterretje.
   Niveau 2 (het onderdeel) blijft een .segmented-spoor; twee vormen, twee
   betekenissen -- hiervoor stonden er twee identieke sporen op elkaar. */
function renderWhoRow() {
  const row = $('settings-profiles');
  const keep = row.scrollLeft;          // niet terugspringen bij elke hertekening
  row.innerHTML = '';
  let active = null;
  for (const key of profileKeys()) {
    const pr = db.profiles[key];
    const on = key === setKey;
    const b = document.createElement('button');
    b.className = 'tab-btn who-btn' + (on ? ' active' : '');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.innerHTML = `<span class="who-portrait" aria-hidden="true">${avatarSVG(pr, 65)}</span>`
      + `<span class="tab-label">${esc(pr.name)}</span>`;
    b.onclick = () => { sndClick(); setKey = key; renderSettings(); };
    row.appendChild(b);
    if (on) active = b;
  }
  row.onscroll = () => updateFades(row);
  row.scrollLeft = keep;
  updateFades(row);
  // alleen bij een échte wissel het gekozen kind in beeld trekken
  if (active && lastWhoRendered !== setKey) requestAnimationFrame(() => {
    if (!active.isConnected) return;
    active.scrollIntoView({ block: 'nearest', inline: 'center' });
    updateFades(row);
  });
  lastWhoRendered = setKey;
}

/* Niveau 2 -- wát: Voortgang | Oefenen | Beheer. Bewust zonder emoji: drie
   labels mét icoon passen niet in het 460px-spoor op een 320px-telefoon (~333px
   nodig, 288px beschikbaar), en zonder is het bovendien rustiger. De iconen
   blijven wél op de kaartkoppen staan, waar ze iets betekenen. */
function renderSectionTabs() {
  const t = $('settings-subtabs');
  t.innerHTML = SET_TABS.map(([v, label]) =>
    `<button class="${setTab === v ? 'on' : ''}" role="tab" aria-selected="${setTab === v}" data-t="${v}">${label}</button>`).join('');
  t.querySelectorAll('button').forEach(b => b.onclick = () => {
    if (b.dataset.t === setTab) return;
    sndClick(); setTab = b.dataset.t; renderSettings(); settingsToTop();
  });
}

function renderSettings() {
  // De selectie kan naar een verdwenen ster wijzen (net verwijderd, of een import
  // met andere sleutels): altijd eerst terugvallen op wie er wél is.
  if (!setKey || !db.profiles[setKey]) setKey = profileKeys()[0] || null;
  const p = setKey ? db.profiles[setKey] : null;
  // Zonder ster is er niets om "wiens" of "wat daarover" mee te kiezen; die twee
  // rijen verdwijnen dan in plaats van leeg te blijven staan.
  $('settings-profiles').style.display = p ? '' : 'none';
  $('settings-subtabs').style.display = p ? '' : 'none';
  if (!p) {
    setTab = 'beheer';
    $('settings-profiles').innerHTML = '';
    $('settings-subtabs').innerHTML = '';
    $('settings-body').innerHTML = beheerEmptyHtml();
    bindSettings(null, null);
    return;
  }
  renderWhoRow();
  renderSectionTabs();
  const s = p.settings;
  $('settings-body').innerHTML =
      setTab === 'oefenen' ? oefenenPanelHtml(p, s)
    : setTab === 'beheer'  ? beheerPanelHtml(p)
    :                        statsPanelHtml(p);
  bindSettings(p, s);
}

/* Elk onderdeel toont maar een déél van de bedieningen, dus alles wordt alleen
   gebonden als het er ook echt staat. Vijf regels deden dat hiervoor niet
   ($('set-name') e.d. zonder controle) -- die wierpen meteen een TypeError zodra
   een paneel ze niet bevat, waarna de rest van de bindingen stilletjes wegviel. */
/* De bediening bij oefenGroups, gedeeld door het ouderdeel en het maakformulier.

   p mag null zijn: bij het maken bestáát er nog geen ster om countTrack op bij
   te stellen (defaultProfile leidt die straks zelf af uit opts.stage).
   done(id) is wat er ná een geslaagde wijziging moet gebeuren -- opslaan +
   hertekenen in het ouderdeel, alleen hertekenen op het maakformulier -- en
   krijgt de groep mee, zodat de aanroeper kan zien wát er veranderde.
   Een handler die de wijziging wéigert geeft false terug; dan volgt er geen
   done() (de "kies er minstens 1"-schud sloeg het opslaan hiervoor ook over). */
function bindOefenChips(s, p, pfx, done) {
  const bind = (id, fn) => {
    const el = $((pfx || '') + id);
    if (el) el.querySelectorAll('.chip').forEach(c => c.onclick = () => { if (fn(c) !== false) done(id); });
  };
  // meerkeuze-chips (aan/uit) -- de laatst overgebleven mag niet uit (er moet altijd
  // iets geoefend worden); dat blokkeren gebeurde eerst stilletjes, nu met een
  // duidelijke schud + tekstje zodat het niet als "kapot" aanvoelt
  bind('set-ops', c => {
    const v = c.dataset.v;
    if (s.ops.includes(v)) {
      if (s.ops.length > 1) s.ops = s.ops.filter(o => o !== v);
      else return blockedMinOne(c), false;
    } else s.ops.push(v);
  });
  bind('set-tables', c => {
    const v = parseInt(c.dataset.v, 10);
    if (s.tables.includes(v)) {
      if (s.tables.length > 1) s.tables = s.tables.filter(t => t !== v);
      else return blockedMinOne(c), false;
    } else s.tables.push(v);
  });
  // enkelkeuze-chips
  bind('set-max', c => { s.max = parseInt(c.dataset.v, 10); });
  bind('set-mode', c => { s.mode = c.dataset.v; });
  bind('set-perlevel', c => { s.perLevel = parseInt(c.dataset.v, 10); });
  // los aan/uit-schakelbare extra uitdagingen (elk onafhankelijk, standaard aan)
  bind('set-extra', c => {
    const k = c.dataset.v;
    s[k] = (s[k] === false);   // was aan (≠ false) → uit; was uit → aan
  });
  // telmodus-instellingen
  bind('set-stage', c => {
    const v = parseInt(c.dataset.v, 10);
    s.stage = v;
    if (s.stageMax < v) s.stageMax = v;                 // plafond mag niet onder de start
    if (p) {
      if (!p.countTrack) p.countTrack = { stage: v, rung: 0, streak: 0, seen: 0, acc: 0.5 };
      p.countTrack.stage = Math.min(Math.max(p.countTrack.stage, v), countMaxStage(s)); // live-stand binnen bereik
    }
  });
  bind('set-stagemax', c => {
    const v = parseInt(c.dataset.v, 10);
    s.stageMax = v;
    if (s.stage > v) s.stage = v;                       // start mag niet boven het plafond
    if (p && p.countTrack) p.countTrack.stage = Math.min(p.countTrack.stage, countMaxStage(s));
  });
  bind('set-numerals', c => {
    // Alleen de vlag omzetten -- de bovengrens (cijfers-uit → fase 5) wordt niet-
    // destructief afgedwongen via countMaxStage (chip-weergave + countLiveStage),
    // zodat het weer aanzetten de fase-instelling volledig terugbrengt.
    s.numerals = (c.dataset.v === 'on');
  });
  bind('set-qmax', c => { s.qmax = parseInt(c.dataset.v, 10); });
  bind('set-memory', c => { s.memory = (c.dataset.v === 'on'); });
  bind('set-repr', c => { s.repr = c.dataset.v; });
}
function bindSettings(p, s) {
  const bind = (id, fn) => { const el = $(id); if (el) el.querySelectorAll('.chip').forEach(c => c.onclick = () => fn(c)); };
  const on = (id, ev, fn) => { const el = $(id); if (el) el[ev] = fn; };
  on('set-name', 'oninput', e => {
    p.name = e.target.value.trim() || p.name;
    saveAndFlash();
    // de naam staat ook in de kiezer hierboven: die meteen laten meelopen, zonder
    // hertekenen (dat zou de focus uit het invulveld halen)
    const lbl = $('settings-profiles').querySelector('.active .tab-label');
    if (lbl) lbl.textContent = p.name;
  });
  /* Enter betekent "klaar met dit veld", net als op het maakformulier (zie daar):
     het toetsenbord gaat weg en de kaarten eronder zijn weer te zien. Er wordt
     niets verzonden -- de naam is al opgeslagen bij elke aanslag -- dus dit is
     alleen de uitgang die een telefoontoetsenbord zelf aanbiedt en die hier
     eerder in het niets viel. */
  on('set-name', 'onkeydown', e => {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    e.target.blur();
  });
  // het rode vlak openklappen mag ook hoorbaar zijn, net als elke andere tik
  // (er zijn er twee: voortgang wissen en de ster verwijderen)
  document.querySelectorAll('#settings-body .danger-reveal').forEach(dg => {
    dg.ontoggle = () => { if (dg.open) sndClick(); };
  });
  // modus: wisselen tussen de rekenshow en de lees-vrije telmodus. Blijft hier:
  // de moduskaart hoort bij het ouderdeel (het maakformulier heeft zijn eigen
  // #newstar-track vlak boven de openklapper).
  bind('set-track', c => { s.track = c.dataset.v; if (s.track === 'count' && !p.countTrack) p.countTrack = { stage: s.stage, rung: 0, streak: 0, seen: 0, acc: 0.5 }; saveAndFlash(); renderSettings(); });
  // De velden zelf staan óók op het maakformulier; de bediening is gedeeld.
  // Het maakformulier heeft niets op te slaan, dus wat er ná een wijziging
  // gebeurt komt van de aanroeper (hier: opslaan + hertekenen).
  bindOefenChips(s, p, '', () => { saveAndFlash(); renderSettings(); });
  on('set-reset', 'onclick', () => {
    showConfirm(
      '⚠️ Weet je het zeker?',
      `Alle voortgang, diamanten, sterren en spulletjes van ${p.name} wissen?`
      + ` Haar naam, haar startoutfit en alle oefeninstellingen blijven staan.`
      + ` Dit kan niet ongedaan gemaakt worden.`,
      'Ja, wissen',
      () => {
        // Wissen raakt de voortgang, niet wie ze is en niet hoe ze oefent: haar
        // startoutfit, plek in de rij én álle instellingen gaan mee. Dat gold
        // eerder alleen voor de telmodus -- in de rekenmodus vielen bewerkingen,
        // bereik, tafels, antwoordmethode en de extra uitdagingen stilletjes terug
        // op de standaardwaarden, terwijl de waarschuwing dat niet zei.
        const dress = p.startDress || p.equipped.dress || 'dress_roze';
        // settings kent geen haar en geen basisfiguur, dus zonder dit werd een
        // bruinharige ster blond en een jongen een meisje
        const opts = { ...p.settings, hair: p.startHair || 'hair_blond', base: p.base };
        const order = p.order;
        db.profiles[setKey] = defaultProfile(p.name, dress, opts);
        db.profiles[setKey].order = order;   // plek in de rij behouden na een reset
        save(); renderSettings();
        showToast('✅ Voortgang gewist.');
        setTimeout(hideToast, 1800);
      }
    );
  });
  on('set-newstar', 'onclick', () => openNewStar('settings'));
  on('set-delete', 'onclick', () => {
    showConfirm(
      '⚠️ Ster verwijderen?',
      `${p.name} helemaal verwijderen, met alle voortgang, diamanten en spulletjes? Dit kan niet ongedaan gemaakt worden.`,
      'Ja, verwijderen',
      () => {
        const naam = p.name;
        delete db.profiles[setKey];
        if (cur === setKey) cur = null;      // niet met een verdwenen ster verder spelen
        setKey = profileKeys()[0] || null;
        lastWhoRendered = null;              // de kiezer moet opnieuw naar de nieuwe keuze scrollen
        save();
        if (setKey) renderSettings();
        else closeSettings();                // laatste ster weg -> terug naar het welkomscherm
        showToast(`✅ ${esc(naam)} is verwijderd.`);
        setTimeout(hideToast, 1800);
      }
    );
  });
  on('set-export', 'onclick', exportData);
  on('set-import', 'onclick', () => { const f = $('set-import-file'); if (f) f.click(); });
  on('set-import-file', 'onchange', e => {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';   // zelfde bestand opnieuw kunnen kiezen
  });
}

// Alle profielen + instellingen als JSON-bestand downloaden.
function exportData() {
  const data = JSON.stringify(db, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  // tot op de seconde: met alleen een datum overschreef een tweede back-up op
  // dezelfde dag de eerste in de downloadmap
  const stamp = new Date().toISOString().slice(0, 19).replace('T', '-').replace(/:/g, '');
  a.href = url;
  a.download = `rekensterren-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Een eerder opgeslagen back-upbestand inlezen en terugzetten. Overschrijft
// ALLE huidige profielen, dus (net als bij wissen) eerst een bevestiging --
// pas ná "ja" wordt de huidige voortgang echt vervangen.
function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(reader.result);
      // Hiervoor stond hier "heeft p1 én p2". Die sleutels zijn niet meer heilig:
      // een familie kan één ster hebben, of vijf, of er net eentje verwijderd
      // hebben. Dus kijken we naar de vórm van elk profiel in plaats van naar de
      // namen van de sleutels -- en meteen streng genoeg dat migrate() er verderop
      // niet op stukloopt. Een lege back-up (familie wiste iedereen) mag ook;
      // data.sound is dan het merkteken dat dit een bestand van óns is.
      const profs = data && typeof data === 'object' ? data.profiles : null;
      const okShape = p => !!p && typeof p === 'object' && typeof p.name === 'string'
        && Array.isArray(p.owned) && !!p.stars && typeof p.stars === 'object'
        && !!p.equipped && typeof p.equipped === 'object';
      const ok = profs && typeof profs === 'object' && !Array.isArray(profs)
        && Object.values(profs).every(okShape)
        && (Object.keys(profs).length > 0 || typeof data.sound === 'boolean');
      if (!ok) throw new Error('ongeldig back-upbestand');
    } catch (e) {
      showNotice('Oeps!', 'Kon dit bestand niet lezen. Kies een geldig back-upbestand.');
      return;
    }
    showConfirm(
      '📂 Back-up terugzetten?',
      'Dit vervangt de huidige diamanten, sterren en spulletjes van alle profielen door de inhoud van dit back-upbestand. Dit kan niet ongedaan gemaakt worden.',
      'Ja, terugzetten',
      () => {
        // Eerst in een lokale kopie bijwerken en pas daarna de echte db vervangen:
        // migrate() kan op een beschadigd profiel gooien, en dat gebeurde hiervoor
        // ná "db = data" -- dan was de app dood terwijl de opslag nog goed was.
        const next = data;
        if (typeof next.sound !== 'boolean') next.sound = true;
        if (typeof next.haptics !== 'boolean') next.haptics = true;
        try { Object.values(next.profiles).forEach(migrate); }
        catch (e) { showNotice('Oeps!', 'Dit back-upbestand is beschadigd; er is niets veranderd.'); return; }
        db = next;             // normalizeProfiles leest de globale db
        normalizeProfiles();
        cur = null;
        setKey = profileKeys()[0] || null;   // selectie kan naar een verdwenen sleutel wijzen
        lastWhoRendered = null;
        save();
        showNotice('🎉 Gelukt!', 'Back-up geladen!');
        renderSettings();
      }
    );
  };
  reader.onerror = () => showNotice('Oeps!', 'Kon dit bestand niet lezen.');
  reader.readAsText(file);
}

/* ================= Terug-navigatie (Android back / browser back) =================
   Er is maar één URL, dus normaal ook maar één history-entry: zonder deze laag
   zou de systeem-terugknop de app altijd meteen verlaten, ook middenin een show
   of met een overlay open. Schermen zelf in de history coderen kan niet zomaar:
   de spel-toestand (G/M) leeft alleen in het geheugen en wordt bij afsluiten op
   null gezet, dus een teruggehaald "spel"-scherm zou een kapotte staat tonen.
   In plaats daarvan is history hier puur een signaal: één wachtpost-entry, enkel
   aanwezig zolang terug ook echt iets betekent. Wát die druk betekent, wordt bij
   elke druk opnieuw afgelezen uit de bestaande app-status -- dezelfde variabelen
   die de zichtbare ✕/←-knoppen ook gebruiken, dus geen aparte "stack" die uit de
   pas kan lopen met wat er werkelijk op het scherm staat. */

// Kleedkamer-teruggids: zelfde bestemming voor het zichtbare kopje als voor Android-terug.
function dressBack() { (dressReturnTo === 'trophies' ? openTrophies : goMap)(); }

function backTarget() {
  // 1) een open modal/overlay/menu sluiten -- de onderliggende schermstatus blijft ongemoeid.
  //    (":not(.closing)" want de drie hieronder faden al enkele honderden ms uit; een druk
  //    tijdens die overgang moet niet nogmaals "sluiten", maar meteen de vólgende laag raken.)
  const modal = document.querySelector('.modal-bg.open');
  if (modal) return modal.id === 'quit-modal' ? closeQuitModal : closeConfirmModal;
  //    Alle zwevende lagen dragen '.rp-overlay' (zie openOverlay), dus één vraag
  //    volstaat. De láátste in de DOM is de bovenste op het scherm -- en dat is de
  //    laag die 'terug' hoort te sluiten. Hiervoor stond er een vaste volgorde
  //    (rang → ladder → trofee) die niets met de stapeling te maken had.
  const lagen = document.querySelectorAll('.rp-overlay:not(.closing)');
  if (lagen.length) return lagen[lagen.length - 1]._close;
  if ($('gear-menu').classList.contains('open')) return closeGearMenu;
  if ($('mem-done').style.display === 'flex') return exitMemory;
  // 2) het huidige scherm verlaten naar zijn eigen ouder -- exact dezelfde bestemming
  //    als de zichtbare ✕/←/tab-knop op dat scherm (nooit twee betekenissen van "terug").
  if ($('screen-game').classList.contains('active')) return askQuit;
  if ($('screen-end').classList.contains('active')) return goMapNaShow;
  if ($('screen-memory').classList.contains('active')) return exitMemory;
  if ($('screen-settings').classList.contains('active')) return closeSettings;
  if ($('screen-newstar').classList.contains('active')) return closeNewStar;
  if ($('screen-dress').classList.contains('active')) return dressBack;
  if ($('screen-trophies').classList.contains('active')) return goMap;
  // de reis ligt boven de kaart: terug is één stap inzoomen, niet het spel uit
  if ($('screen-journey').classList.contains('active')) return reisSluit;
  if ($('screen-map').classList.contains('active')) return goProfiles;
  return null;   // screen-profile, niets open: dit ís de bodem -- browser/PWA handelt terug zelf verder af
}

let backGuardArmed = false, syncingBackGuard = false, backSyncQueued = false;
// Zorgt dat er precies dan een "wachtpost"-entry op de history staat als backTarget()
// iets teruggeeft. Eén tussenstap (bv. openSettings() dat eerst closeGearMenu() aanroept
// en pas dáárna show() naar het echte scherm) kan tussentijds heel even "niks" laten
// lijken; history.back() is bovendien async terwijl pushState synchroon is, dus een
// directe her-bewapening zou daarmee kunnen botsen. Daarom pas ná de huidige batch
// synchrone DOM-wijzigingen checken (via microtask): alle syncBackGuard()-aanroepen
// in dezelfde beurt smelten zo samen tot één beslissing op de uiteindelijke status.
// Microtasks legen zich altijd vóór de vólgende popstate-taak, dus twee snelle
// druk-op-druk-keren kunnen elkaar hierdoor nooit inhalen.
function syncBackGuard() {
  if (backSyncQueued) return;
  backSyncQueued = true;
  queueMicrotask(() => {
    backSyncQueued = false;
    const want = !!backTarget();
    if (want === backGuardArmed) return;
    if (want) { history.pushState({ rpGuard: 1 }, ''); backGuardArmed = true; }
    else { syncingBackGuard = true; history.back(); }
  });
}
window.addEventListener('popstate', () => {
  backGuardArmed = false;                                       // onze entry is net verbruikt
  if (syncingBackGuard) { syncingBackGuard = false; return; }    // wíj stuurden dit terug, niet de speler
  const act = backTarget();
  if (act) { act(); syncBackGuard(); }
});
// Na terugkeer uit de bfcache (bv. via Recents) kan de wachtpost-entry intussen
// alweer weg zijn -- lees de status dan opnieuw af i.p.v. hem zomaar aan te nemen.
window.addEventListener('pageshow', () => { backGuardArmed = !!(history.state && history.state.rpGuard); syncBackGuard(); });
// Escape is dezelfde intentie als terug, ook zonder touchscherm.
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const act = backTarget(); if (act) act(); } });

/* De schermtekeningen van de kleedkamer en de kast aanzetten, als er een is.
   Eén plek, en hij leest SCHERMKUNST -- er staat nergens anders een pad.

   Waarom een klasse en een variabele in plaats van een vast url() in het
   stijlblad: zolang er geen tekening is moet er ook niets opgevraagd worden. Een
   url() naar een bestand dat er niet is kost elk kind een mislukte aanvraag en
   laat de gedeelde schil vervallen -- twee schermen die platter zijn dan ze
   waren, voor een tekening die nog niet bestaat. Zie de regel bij
   #screen-dress.kunst.app-sfeer::before. */
function zetSchermkunst() {
  const waar = { dress: 'screen-dress', tro: 'screen-trophies' };
  Object.keys(waar).forEach(sleutel => {
    const el = $(waar[sleutel]);
    const pad = SCHERMKUNST && SCHERMKUNST[sleutel];
    if (!el) return;
    el.classList.toggle('kunst', !!pad);
    if (pad) el.style.setProperty('--kunst-scherm', 'url("' + pad + '")');
    else el.style.removeProperty('--kunst-scherm');
  });
}

/* ================= Start ================= */
load();
zetSchermkunst();
renderProfiles();
// Bij het opstarten staat dit scherm er al uit de opmaak, dus er komt geen
// goProfiles() langs om de begroeting aan te zwengelen. Brengt ?debug je meteen
// ergens anders heen, dan zet show() hem hieronder net zo goed weer stil.
landingLeeft();
syncBackGuard();
/* ---- Ontwikkelaarsschakelaars (alleen met ?debug in de URL) ----
   Bestaat om twee redenen: de geautomatiseerde tests kijken via __game() in de
   lopende show mee, en wie aan het uiterlijk werkt moet élk scherm kunnen zien
   zonder eerst een half uur te spelen. In het gewone spel bestaat dit blok niet.

   ?debug            -- zet de schakelaars aan
   &demo             -- vult twee voorbeeldsterren (Lotte: rekenen, show 6 ·
                        Sem: tellen, show 2). ALLEEN in het geheugen: er wordt
                        niets opgeslagen, dus een echte familie-opslag op
                        hetzelfde toestel blijft ongemoeid.
   &star=p1|p2       -- welke voorbeeldster meteen geselecteerd wordt
   &wereld=<n>       -- open meteen in wereld n (1 = de eerste). Zet een
                        samenhangende stand neer -- alles ervóór uitgespeeld --
                        en grendelt de opslag, dus ook op een echte ster wordt
                        er niets weggeschreven. Om een kaart of een overgang op
                        een telefoon te bekijken zonder er eerst naartoe te
                        spelen.
   &stand=<naam>     -- wát er in die wereld al gebeurd is. Zonder deze vlag is
                        dat 'vers'. Zie zetKijkstand hieronder voor de zes.
   &diamanten=<n>    -- de beurs op n zetten (koopstroom nakijken zonder sparen)
   &stage=<item-id>  -- forceer een podium (bv. stage_vulkaan)
   &screen=<naam>    -- spring meteen naar profile | map | reis | dress | tro |
                        game | end | ouder
   &nieuw            -- samen met &mapedit: open meteen "een wereld erbij"
   &mapedit          -- wereldstudio: een wereld maken en nakijken op de echte
                        kaart -- tekening, kleuren, beloning, haltes en weg --
                        en het blok terugschrijven naar WORLDS (zie
                        startMapEdit hieronder)                               */
if (location.search.indexOf('debug') !== -1) {
  const dbg = new URLSearchParams(location.search);
  if (loadWorldDraft()) console.log('wereldconcept uit localStorage geladen (' + WORLDS.length + ' werelden)');
  window.__game = () => G;
  window.__db = () => db;
  if (dbg.has('demo')) {
    // Geen save(): dit is een kijk-opstelling, geen opslag. Bij herladen wordt
    // ze gewoon opnieuw uit de URL opgebouwd. De grendel zit in save() zelf --
    // hier alleen "niets meer wegschrijven" zeggen was niet genoeg, want elke
    // kaart die opengaat schrijft via markWorldSeen vanzelf weg.
    demoStand = true;
    db.sound = false; db.haptics = false;
    const a = defaultProfile('Lotte', 'dress_roze', { hair: 'hair_blond' });
    a.order = 0; a.level = 6; a.diamonds = 240;
    a.stars = { 1: 3, 2: 3, 3: 2, 4: 3, 5: 2 };
    ['hair_regenboog', 'dress_disco', 'shoes_goud', 'mic_roze', 'stage_kasteel',
     'acc_kroon', 'pet_eenhoorn', 'instr_gitaar', 'stage_ruimte', 'stage_vulkaan',
     'dress_sterren', 'shoes_zwart', 'mic_goud'].forEach(id => a.owned.push(id));
    a.equipped = { hair: 'hair_regenboog', dress: 'dress_disco', shoes: 'shoes_goud',
      mic: 'mic_roze', stage: 'stage_kasteel', acc: 'acc_kroon',
      pet: 'pet_eenhoorn', instrument: 'instr_gitaar' };
    a.trophies = ['first', 'sums25', 'perfect1'];
    a.readyTrophies = ['gold5'];
    a.goldHits = 7; a.encores = 3; a.rankSeen = 2;
    a.stats = { correct: 180, wrong: 22 };
    const c = defaultProfile('Sem', 'dress_blauw',
      { hair: 'hair_bruin', base: 'jongen', track: 'count', stage: 3 });
    c.order = 1; c.level = 2; c.diamonds = 35; c.stars = { 1: 2 };
    c.owned.push('mic_zilver'); c.equipped.mic = 'mic_zilver';
    c.trophies = ['first']; c.stats = { correct: 12, wrong: 4 };
    db.profiles = { p1: a, p2: c };
    renderProfiles();
  }
  const star = dbg.get('star');
  if (star && db.profiles[star]) {
    cur = star;
    /* &wereld=n -- meteen in wereld n staan.

       Hij zet een samenhángende stand neer en niet alleen een getal, en dat moet
       ook: "waar ben ik" wordt uit de sterren afgeleid en niet uit p.level (zie
       continueWorld). Een los opgehoogd level zou de kaart gewoon weer bij de
       grens openen -- dus gaan de werelden ervóór op vol en die erna leeg.
       worldsSeen gaat mee, anders begroet de kaart je bij het openen eenmalig met
       de onthulling van een nieuwe wereld (zie goMap) en kijk je naar een camera
       die klimt in plaats van naar wat je wilde zien.

       En hij grendelt de opslag: vanaf hier schrijft save() niets meer weg (zie
       demoStand), ook niet als dit toevallig de échte ster van een echt kind is.
       Kijken mag alles, veranderen niets -- een kijkvlag hoort nooit een save te
       kunnen kosten. */
    const wereld = Number(dbg.get('wereld'));
    const stand = dbg.get('stand');
    if (wereld >= 1 || stand) zetKijkstand(wereld >= 1 ? wereld : 1, stand || 'vers');
    const munten = dbg.get('diamanten');
    if (munten != null && munten !== '') { demoStand = true; P().diamonds = Math.max(0, Number(munten) || 0); }
    const forced = dbg.get('stage');
    if (forced && item(forced)) {
      if (!P().owned.includes(forced)) P().owned.push(forced);
      P().equipped.stage = forced;
    }
    const go = { map: goMap, dress: openKleedkamer, tro: openTrophies,
                 profile: goProfiles, ouder: () => { goMap(); openSettings(); },
                 reis: () => { goMap(); openReis(); },
                 game: () => startLevel(P().level),
                 end: () => { startLevel(P().level); endLevel(true); } };
    (go[dbg.get('screen')] || goMap)();
  }
  if (dbg.get('fit')) fitVenster(dbg.get('fit'));
  if (dbg.has('mapedit') && cur) startMapEdit();
}
/* ---- Kijkstanden (?debug&wereld=n&stand=...) --------------------------------
   Een spel in een representatieve stand zetten zónder ernaartoe te spelen. Dat
   is het halve werk bij het nakijken van een wereld: een kaart met alles op slot
   ziet er anders uit dan diezelfde kaart met overal drie sterren, en je hoort
   allebei te zien vóórdat een wereld naar main gaat.

   Er wordt hier níéts nagebouwd. De stand is p.stars en p.level, precies de twee
   dingen die het spel zelf opslaat; alles wat een scherm daarna toont (welke
   wereld open is, waar de pop staat, welke badge er hangt) leidt het spel er zelf
   uit af. Een kijkstand kan dus nooit iets tonen dat in een echt spel onmogelijk
   is -- en dat is de enige reden dat kijken hier iets waard is.

   De zes standen, allemaal ín wereld n:
     slot        de wereld ervóór is nog niet uit, dus deze is dicht
     vers        hier net aangekomen, halte 1 is aan de beurt
     halverwege  drie shows gedaan, de vierde is aan de beurt
     bijna       alles op één show na -- speel die uit voor de wereldovergang
     uit         elke show gespeeld, twee sterren
     perfect     elke show op drie sterren
   En één die over de hele reis gaat:
     alles       elke uitgebrachte wereld perfect (de toegift-stand)

   Bij drie van de zes (slot, uit, perfect) ligt de grens van de voortgang niet
   ín wereld n, en dan zou de kaart bij het openen ergens anders uitkomen -- op
   de wereld waar het kind "hoort" te zijn. Je wilde juist wereld n zien, in die
   stand. Daarom zetten die drie reisDoel: dezelfde weg die de Werelden-lijst
   gebruikt als je daar een wereld aantikt. Kijken, geen voortgang -- goMap
   verbruikt het bij het eerstvolgende openen en daarna is alles weer gewoon.

   De opslag gaat op slot (demoStand): kijken mag alles, veranderen niets. Ook op
   de échte ster van een echt kind wordt er hierna niets weggeschreven. */
function zetKijkstand(wereld, stand) {
  demoStand = true;
  const p = P();
  const laatste = WORLD_AVAIL - 1;
  const n = Math.max(0, Math.min(Math.round(wereld) - 1, laatste));
  p.stars = {};
  p.worldsSeen = [];
  const vul = (i, ster) => {
    for (let l = WORLD_START[i]; l < WORLD_START[i] + WORLDS[i].levels; l++) p.stars[l] = ster;
  };
  /* 'alles' is geen stand ín een wereld maar een stand van de reis: alles uit,
     overal drie sterren. Dan is er geen grens meer en speelt het spel toegift. */
  if (stand === 'alles') {
    for (let i = 0; i <= laatste; i++) { vul(i, 3); p.worldsSeen.push(WORLDS[i].id); }
    p.level = WORLD_LAST + 1;
    viewWorldIdx = null;
    return;
  }
  /* Op slot: de wereld ervóór moet juist níét uit zijn, anders staat deze open.
     In de eerste wereld valt er niets vóór; die is nooit op slot. */
  if (stand === 'slot' && n > 0) {
    for (let i = 0; i < n - 1; i++) vul(i, 3);
    const vorige = n - 1;
    for (let l = WORLD_START[vorige]; l < WORLD_START[vorige] + WORLDS[vorige].levels - 1; l++) p.stars[l] = 3;
    p.level = WORLD_START[vorige] + WORLDS[vorige].levels - 1;
    for (let i = 0; i <= vorige; i++) p.worldsSeen.push(WORLDS[i].id);
    viewWorldIdx = null;
    reisDoel = n;                           // laat wéér wereld n zien, nu op slot
    return;
  }
  // Alles vóór wereld n is uit; dat is de enige samenhangende manier om hier te staan.
  for (let i = 0; i < n; i++) vul(i, 3);
  for (let i = 0; i <= n; i++) p.worldsSeen.push(WORLDS[i].id);
  const eerste = WORLD_START[n], len = WORLDS[n].levels;
  if (stand === 'perfect' || stand === 'uit') {
    vul(n, stand === 'perfect' ? 3 : 2);
    p.level = eerste + len;
    reisDoel = n;                           // de grens ligt verderop; kijk hier
  } else if (stand === 'bijna') {
    for (let l = eerste; l < eerste + len - 1; l++) p.stars[l] = 3;
    p.level = eerste + len - 1;
  } else if (stand === 'halverwege') {
    const tot = Math.min(3, len - 1);
    for (let l = eerste; l < eerste + tot; l++) p.stars[l] = 2 + (l % 2);
    p.level = eerste + tot;
  } else {
    p.level = eerste;                       // 'vers', en de terugval voor een onbekende naam
  }
  viewWorldIdx = null;
}

/* Een voorbeeldvenster op ware toestelmaat. window.open zet de BUITENmaat, en een
   browser mag daar een minimum op leggen -- dan kijk je naar een venster dat breder
   is dan de telefoon die je wilde zien, en dus naar de verkeerde opmaak. Hier
   corrigeert het venster zichzelf met het verschil tussen buiten en binnen, en zegt
   een balkje onderaan wat de binnenmaat écht geworden is. */
function fitVenster(spec) {
  const w = Number(spec.split('x')[0]), h = Number(spec.split('x')[1]);
  if (!w || !h) return;
  const meld = () => {
    const klopt = innerWidth === w && innerHeight === h;
    let el = document.getElementById('fit-badge');
    if (!el) {
      el = document.createElement('div');
      el.id = 'fit-badge';
      el.style.cssText = 'position:fixed;left:50%;bottom:6px;transform:translateX(-50%);'
        + 'z-index:99999;padding:3px 9px;border-radius:99px;pointer-events:none;'
        + 'font:600 11px ui-monospace,monospace;';
      document.body.appendChild(el);
    }
    el.style.background = klopt ? 'rgba(20,80,45,.85)' : 'rgba(120,30,20,.9)';
    el.style.color = klopt ? '#b6ffd6' : '#ffd0c4';
    el.textContent = klopt ? innerWidth + ' x ' + innerHeight
      : 'gevraagd ' + w + 'x' + h + ' — werkelijk ' + innerWidth + 'x' + innerHeight;
  };
  try { resizeTo(w + (outerWidth - innerWidth), h + (outerHeight - innerHeight)); } catch (_) {}
  setTimeout(meld, 120);
  addEventListener('resize', () => setTimeout(meld, 60));
}

