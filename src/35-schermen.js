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
  // een tik die op een landing wachtte, hoort bij het scherm dat nu weggaat
  naLanding = null;
  // De begroeting van de kaart hoort bij de kaart -- zie kaartGroetStop.
  if (id !== 'screen-map') kaartGroetStop();
  // en die van de sterrenkeuze bij de sterrenkeuze -- zie landingStil.
  if (id !== 'screen-profile') { landingStil(); logoIntroStop(); }
  /* En de vlucht tussen de kaart en Werelden hoort bij die twee. Een tik op de
     tabbladbalk middenin zo'n vlucht werd wel gehonoreerd, maar de tekening vloog
     gewoon door over het nieuwe scherm tot hij geland was -- over het rek van de
     kleedkamer, of als hele wereld bovenop de kast die er al onder stond.
     vluchtKlaar ruimt hem in één keer op; is er geen vlucht, dan doet hij niets. */
  if (id !== 'screen-map' && id !== 'screen-journey') vluchtKlaar();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active', 'komt-op'));
  $(id).classList.add('active');
  /* Een statusbalk die na het opstarten wegvaagde, maakte het venster hoger dan de
     vastgelegde hoogte. Die ruimte nemen we hier pas: het oude scherm is net weg en
     het nieuwe nog niet getekend -- zie vhVolg in 00-vh-lock.js. */
  vhVolg();
  const onProfile = (id === 'screen-profile');
  $('corner-btns').style.display = onProfile ? 'flex' : 'none';
  appKnopZet();   // het knopje linksboven hoort ook alleen bij de sterrenkeuze
  // de vaste navigatie hoort alleen bij de rustpunten, niet bij spel/einde/instellingen
  const navId = navVolgtScherm();
  navZet(navId);
  $('dress-bar').style.display = (id === 'screen-dress') ? 'flex' : 'none';
  kastBalk(null);   // de balk van de kast hoort bij een tik daar, niet bij het volgende bezoek
  // de tekening-ophaler van de reis kijkt naar een scherm dat er niet meer is
  if (id !== 'screen-journey') reisStopWaarnemer();
  if (navId) updateTroDot();
  knipperWek();   // het knipperklokje kijkt naar de poppen van het nieuwe scherm
  syncBackGuard();   // elk schermwissel loopt door hier heen -- zie "Terug-navigatie" onderaan
}
// Kaart is altijd "thuis" (goMap() start zelf al altijd bij de huidige wereld,
// nooit een onthouden positie). Kleedkamer/Trofeeën onthouden juist wél waar
// je was: nogmaals tikken op het tabblad waar je al op stond geeft een verse
// start; vanuit een ánder tabblad hervat je gewoon waar je gebleven was.
/* ---- Eerst antwoorden, dan pas het zware werk ----
   Een schermwissel bouwt en tekent het hele nieuwe scherm, en op een trage
   tablet duurt dat al gauw een paar honderd milliseconden. Gebeurt dat binnen de
   tik zelf, dan staat het scherm zolang stil: geen tabblad dat oplicht, niets dat
   zegt dat de tik is aangekomen. Cloudflare mat dat bij echte spelers als de
   traagste plek van de app (INP), en een kind tikt dan nog eens.

   Daarom gaat het werk één beeldje later: de tik geeft eerst zijn geluid en zijn
   oplichtende tabblad, de browser tekent dat, en pas daarna komt de wissel. Het
   nieuwe scherm staat er dus even snel als vroeger (een beeldje is ~16 ms), maar
   de tik wacht er niet meer op.

   Alleen voor wat een vinger aanraakt: de knoppen die van scherm wisselen (de
   tabbladen, de pillen in de kop, de terugpijlen, de knoppen op het eindscherm)
   roepen dit aan. De functies erachter -- navGo, openReis, goMap en de rest --
   blijven synchroon: de suites roepen ze rechtstreeks aan en lezen meteen na
   wat er staat.

   De grendel: een tweede tik in dat ene beeldje doet niets, anders stapelen er
   twee wissels op elkaar (zie ook kiesBezig bij de sterrenkeuze). */
let tikWacht = false;
function naTik(fn) {
  if (tikWacht) return;
  tikWacht = true;
  requestAnimationFrame(() => setTimeout(() => { tikWacht = false; fn(); }, 0));
}
/* Welk tabblad is het: de klasse voor het oog, aria-current voor een schermlezer
   (die ziet het blauwe vlak niet), en --nav-i voor het vlak zelf, dat ernaartoe
   schuift (zie .nav-sel). Op één plek, zodat die drie nooit uit elkaar lopen.
   Zonder tabblad (een scherm zonder balk) blijft het vlak staan waar het stond:
   de balk is dan toch weg. */
function navZet(navId) {
  // binnen de functie en niet als const erboven: show() kan al bij het opstarten
  // lopen, en dan zou een const die verderop staat nog niet bestaan
  const tabs = ['nav-map', 'nav-dress', 'nav-tro'];
  tabs.forEach(n => {
    const knop = $(n), aan = n === navId;
    knop.classList.toggle('active', aan);
    if (aan) knop.setAttribute('aria-current', 'page'); else knop.removeAttribute('aria-current');
  });
  const i = tabs.indexOf(navId);
  if (i >= 0) $('main-nav').style.setProperty('--nav-i', i);
}
// De tabbladbalk: het tabblad licht meteen op, de rest volgt na het beeldje.
function navTik(t) {
  if (tikWacht) return;
  sndClick();
  const wasActive = $('nav-' + t).classList.contains('active');
  navZet('nav-' + t);
  naTik(() => navGo(t, wasActive, true));
}
function navGo(t, wasActiveAl, stil) {
  if (!stil) sndClick();
  const wasActive = wasActiveAl != null ? wasActiveAl : $('nav-' + t).classList.contains('active');
  /* Kaart op Werelden is dezelfde weg terug als de ← erboven: inzoomen op de
     wereld waar je vandaan kwam. Hier stond gewoon goMap(), en dan kwam je met
     een kale schermwissel uit bij de grens -- terwijl het tabblad op Werelden al
     oplicht en dus "terug naar mijn kaart" zegt, niet "ergens anders heen". */
  /* En Kaart op de kaart zelf, terwijl je in een andere wereld staat te kijken, is
     de gouden ⟲-pil: de camera klimt terug naar huis. Hier deed goMap() dat met
     een knip -- de kaart werd ter plekke omgebouwd, zonder enige beweging. */
  const opUitstapje = $('screen-map').classList.contains('active') && !$('world-back').hidden;
  if (t === 'map') {
    if ($('screen-journey').classList.contains('active')) reisSluit(true);
    else if (opUitstapje) navigeerNaarWereld(worldFor(hereLevel(P())).index);
    else if ($('screen-map').classList.contains('active') && !pendingTravel) kaartThuis();
    else goMap();
  }
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
  duur: PAS + 50,   // zolang duurt een pasje, plus drie beeldjes (zie PAS in 10-feestjes.js)
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
  /* De 30 hieronder is de vrije ruimte rond het raster met tegels, en hij is
     ruimer dan hij hoeft te zijn: een vonkje wordt gezet op zijn punt linksboven
     en groeit daarna nog (schaal tot 1, plus een kwartslag draai), dus met een
     krappe marge schampt hij alsnog de bovenste tegelrand. Op 30 gebeurt dat
     niet meer -- gemeten over zes schermmaten, drieduizend vonkjes per soort en
     per maat, op hun volle maat: nul aanrakingen.

     Die grens geldt voor élk vonkje boven de tegels, ook voor het grote naast de
     naam. Dat had hem niet: het mocht tot 6 pixels onder de onderkant van het
     logo staan, en het logo staat vlak boven de tegels -- op volle grootte raakte
     een op de zes de bovenste tegelrand, liggend op een telefoon een op de drie.
     Is er boven de tegels geen plek (boven < 0), dan komt er dit keer geen. */
  const boven = r.top - s.top - 30;
  let y;
  if (bijLogo && logo) {
    const hoog = Math.min(logo.bottom - s.top + 6, boven);
    if (hoog < 0) return null;
    y = vonkTussen(Math.min(logo.top - s.top - 6, hoog), hoog);
  }
  else if (Math.random() < VONKJES.laagKans && s.bottom - r.bottom > 70) y = vonkTussen(r.bottom - s.top + 30, s.height - rand);
  else {
    if (boven < 0) return null;
    y = vonkTussen(Math.min(s.height * .04, boven), boven);
  }
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
  el.style.setProperty('--piek', (bijLogo ? .95 : vonkTussen(.55, .8)).toFixed(2));   // niet style.opacity: zie .vonk-laag
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
  pasUit(el);   // af als het pasje uit is, niet op een klok (zie pasUit)
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
/* `groetNa` (ms): wanneer de eerste pop zwaait. Gewoon is dat LANDING.komNa; de
   logo-intro schuift hem op tot zijn laatste letter staat (zie "= Het spelogo
   komt binnen"): eerst zegt het logo wie het is, dan zeggen de poppen "hoi, tik
   op mij" -- na elkaar, van boven naar beneden, en niet door elkaar heen. De
   vonkjes op de achtergrond wachten dan mee. */
function landingLeeft(groetNa) {
  const na = groetNa == null ? LANDING.komNa : groetNa;
  landingStil();
  const scherm = $('screen-profile');
  if (scherm) {
    scherm.removeEventListener('pointerdown', landingTikje);
    scherm.addEventListener('pointerdown', landingTikje);
  }
  // Het vakje op de MAX-ster hangt aan de maat van het scherm en niet aan de
  // beweging, dus hij staat vóór de uitstap hieronder: ook wie minder beweging
  // wil, mag de verrassing vinden.
  // In een rAF en niet meteen: hier is het scherm net gewisseld en de tegels net
  // getekend, dus opmeten dwong een volledige opmaak af die het eerste beeldje
  // daarna nog eens deed (gemeten: ~90 ms op een 6x vertraagde telefoon, de
  // meest getikte schermwissel van echte bezoekers). In de rAF valt het opmeten
  // samen met de opmaak die er toch komt. Het vakje is onzichtbaar tot je erop
  // tikt, dus dat het één beeldje later op zijn plek ligt, ziet niemand.
  requestAnimationFrame(maxPlekZet);
  // Beperkte beweging: geen begroeting en geen stilte die op iets wacht. De
  // tegels staan er precies zoals ze horen te staan, alleen zonder zwaai.
  if (motionOff()) return;
  landingVorige = -1;
  const aantal = landingPoppen().length;
  for (let i = 0; i < aantal; i++) {
    landingNa(na + i * LANDING.tussen, () => landingPas(landingPoppen()[i], LANDING_PASJES[0]));
  }
  landingRust(na + aantal * LANDING.tussen);
  if (na > LANDING.komNa) landingNa(na, vonkAan); else vonkAan();
}

/* ---- De MAX-ster: een verstopte verrassing --------------------------------
   Onderaan de tekening van dit scherm (assets/bg/landing.webp) ligt een
   plaquette met een gouden ster erop en MAX erin. Tik erop en er gebeurt iets
   kleins: de ster licht op, er spat een handvol sterretjes omhoog, en binnen
   acht tienden van een seconde is alles weer zoals het was. Geen beloning, geen
   scherm, geen uitleg -- de tik is het hele antwoord.

   WAAROM DIT MET DELEN VAN DE TEKENING REKENT EN NIET MET PROCENTEN VAN HET
   SCHERM. De tekening wordt met `cover` ingepast (zie #screen-profile.app-sfeer
   ::before): ze wordt op de krapste kant geschaald en aan de andere kant
   bijgesneden. Waar de ster in het venster uitkomt hangt dus af van de
   verhouding van het scherm, en een vast percentage zou alleen kloppen op de
   maat waarop het opgemeten is. maxPlekZet() doet daarom elke keer dezelfde som
   als de browser: schaal = de grootste van de twee, en dan de plek van de ster
   in delen van de getékende rechthoek.

   EN DAAROM IS HET VAKJE ER VAAK NIET. Met `cover` op een venster dat breder is
   dan ongeveer 3:4 valt de onderste vijfde van de tekening buiten beeld, en de
   ster ligt daar -- op een tablet in de breedte en op een bureaublad is er dus
   niets om op te tikken. Het vakje gaat dan helemáál weg in plaats van ergens
   te blijven hangen waar niets staat. Hetzelfde als het sterrenraster tot over
   de plaquette zou reiken: de tegels zijn het scherm, dit is de versiering, en
   de versiering wijkt.

   Nagemeten op 360x640, 390x844 en 412x920 (het vakje ligt op de ster) en op
   768x1024, 820x1180, 1024x768 en 1440x900 (geen vakje). */
const MAXSTER = {
  kunstB: 941, kunstH: 1672,   // de maat van assets/bg/landing.webp
  x: .500, y: .886,            // het midden van de ster, in delen van die tekening
  b: .175, h: .055,            // en het vakje eromheen -- ruimer dan de letters
  minB: 64, minH: 52,          // maar nooit kleiner dan een vinger van vijf
};
function maxPlekZet() {
  const scherm = $('screen-profile');
  const plek = $('max-plek');
  const laag = scherm && scherm.querySelector('.max-laag');
  if (!plek || !laag) return;
  const w = laag.offsetWidth, h = laag.offsetHeight;
  const schaal = Math.max(w / MAXSTER.kunstB, h / MAXSTER.kunstH);
  const tw = MAXSTER.kunstB * schaal, th = MAXSTER.kunstH * schaal;   // de getekende rechthoek
  const vw = Math.max(MAXSTER.b * tw, MAXSTER.minB);
  const vh = Math.max(MAXSTER.h * th, MAXSTER.minH);
  const l = (w - tw) / 2 + MAXSTER.x * tw - vw / 2;
  const t = (h - th) / 2 + MAXSTER.y * th - vh / 2;
  /* Helemaal in beeld, en niet half: een vakje dat voor de helft over de
     onderrand hangt geeft een gloed die aan de rand afgesneden wordt. */
  const heel = w > 0 && h > 0 && l >= 0 && t >= 0 && l + vw <= w && t + vh <= h;
  /* En vrij van de tegels. Dit is een vangnet en geen opmaak: met zes sterren --
     het maximum -- houdt het raster vandaag op elke telefoonmaat nog twintig tot
     zestig pixels over boven de plaquette. Maar een onzichtbaar vakje dat een tik
     op een tegel opvangt is precies het soort fout waar niemand naar zoekt, dus
     wijkt de versiering als het raster ooit tot hier groeit. Alleen de hoogtes
     vergelijken volstaat -- het raster loopt over de volle breedte. */
  const rij = $('profile-row');
  const r = rij ? rij.getBoundingClientRect() : null;
  const o = laag.getBoundingClientRect();
  const vrij = !r || r.bottom - o.top <= t || r.top - o.top >= t + vh;
  if (!heel || !vrij) { plek.style.display = 'none'; return; }
  plek.style.left = Math.round(l) + 'px';
  plek.style.top = Math.round(t) + 'px';
  plek.style.width = Math.round(vw) + 'px';
  plek.style.height = Math.round(vh) + 'px';
  plek.style.display = 'block';
}
/* De tik zelf. Drie dingen tegelijk en verder niets: een klankje (dat zijn eigen
   trilling meebrengt -- zie playSfx), een gloed op de plaquette, en sterretjes
   omhoog.

   ER KOMT GEEN KLANKJE BIJ, en dat is geen luiheid. De woordenschat van SFX is
   vol (zie daar) en dit is een tik, geen gebeurtenis in het spel. 'tap.blij' is
   letterlijk de speelse tik -- elke keer een andere noot -- en de derde tik op
   rij leent 'star.land' op zijn hoogste sport, want dan schiet er een ster weg.
   Staat het geluid uit, dan blijft de trilling en blijft het beeld; staat het
   trillen uit of kan het toestel het niet, dan merk je daar niets van. Alle drie
   die vragen staan al in playSfx en buzz, en worden hier niet nog eens gesteld.

   De sterretjes ruimen zichzelf op, elk met zijn eigen timer. Ze staan bewust
   niet in landingTimers: landingStil() loopt op élke tik op dit scherm langs
   (zie landingTikje, die vlak ná deze functie aan de beurt is omdat de tik naar
   het scherm doorborrelt), en zou ze dan meteen weer weghalen. */
const MAXFEEST = {
  koel: 380,     // zo snel achter elkaar telt een tweede tik niet
  reeks: 1500,   // en zo lang hoort een tik nog bij de vorige
  vonken: 6,     // zoveel sterretjes spatten er op
  duur: 820,     // en zolang vliegen ze
};
let maxTijd = 0, maxReeks = 0;
function maxTik() {
  const nu = Date.now();
  if (nu - maxTijd < MAXFEEST.koel) return;   // geen ratel van wie blijft rammen
  maxReeks = (nu - maxTijd < MAXFEEST.reeks) ? maxReeks + 1 : 1;
  maxTijd = nu;
  const groot = maxReeks >= 3;
  if (groot) maxReeks = 0;                    // en daarna begint het tellen opnieuw
  playSfx(groot ? 'star.land' : 'tap.blij', groot ? { i: 2 } : null);   // i: de bovenste sport
  const plek = $('max-plek');
  if (!plek) return;
  /* De gloed is het enige dat ook bij beperkte beweging blijft: hij verschuift
     niets, hij licht alleen even op. Opnieuw afdwingen met offsetWidth, want
     twee tikken achter elkaar horen twee keer op te lichten. */
  plek.classList.remove('gloed', 'groot');
  void plek.offsetWidth;
  plek.classList.add('gloed');
  if (groot) plek.classList.add('groot');
  if (motionOff()) return;
  const ver = plek.offsetHeight;
  for (let i = 0; i < MAXFEEST.vonken + (groot ? 2 : 0); i++) {
    maxVonkje(plek, rnd(202, 338), rnd(ver * .5, ver * 1.3),
              rnd(MAXFEEST.duur - 140, MAXFEEST.duur), rnd(9, 14));
  }
  /* Eén reist verder dan de rest, recht omhoog. De weg in de tekening begint op
     deze plaquette en loopt daar het beeld in, dus dat is waar een glinstering
     heen hoort. Bij de derde tik is het een hele schicht. */
  maxVonkje(plek, rnd(262, 278), ver * (groot ? 3.4 : 1.9), groot ? 780 : 700, groot ? 17 : 12);
}
/* Eén sterretje dat wegspat. `hoek` in graden, met 270 recht omhoog -- dezelfde
   rekensom als confettiBurst, maar naar één kant en over een fractie van de
   afstand. Het gaat in het vakje zelf, dus (0,0) is de ster. */
function maxVonkje(plek, hoek, ver, duur, maat) {
  const v = document.createElement('span');
  v.className = 'max-vonk';
  v.textContent = '✦';
  const r = hoek * Math.PI / 180;
  v.style.setProperty('--dx', Math.round(Math.cos(r) * ver) + 'px');
  v.style.setProperty('--dy', Math.round(Math.sin(r) * ver) + 'px');
  v.style.setProperty('--rot', rnd(-120, 120) + 'deg');
  v.style.setProperty('--d', duur + 'ms');
  v.style.fontSize = maat + 'px';
  plek.appendChild(v);
  setTimeout(() => v.remove(), duur + 80);
}
/* Eén keer vastzetten: het vakje staat in de markup en wordt -- anders dan de
   tegels -- nooit opnieuw gemaakt. De maat verandert wél, bij het draaien van
   een toestel en als de adresbalk van Android wegschuift. */
if ($('max-plek')) $('max-plek').addEventListener('pointerdown', maxTik);
addEventListener('resize', maxPlekZet);

/* ================= Het spelogo komt binnen =================
   Eén keer per start, en alleen hier: het logo bouwt zichzelf op. De R staat er
   met de ster tegen zijn been (zoals in het merkteken), duikt even in, en de ster
   springt in een boog naar zijn plek boven "sterren". Onder hem door ploppen de
   letters één voor één op, en wat rechts van zijn landingsplek staat rimpelt
   daarna naar buiten; als laatste veegt de zwaai eronder open. Ruim anderhalve
   seconde. Het promofilmpje (promo/promo.html) doet hetzelfde in het groot.

   HET LOGO IN LAGEN. assets/branding/logo-lagen.webp is het spelogo in veertien
   delen onder elkaar -- de R, elke letter los, de ster en de zwaai -- geknipt
   uit dezelfde meester als wordmark.webp (zie test/lagen.js en LOGO_DELEN). Ze
   overlappen niet, dus op hun plek gelegd zijn ze het logo zelf. Daarom is er aan
   het eind niets te wisselen: het echte logo komt terug op precies dezelfde
   pixels. Eén bestand en niet vijf: de sterrenkeuze haalt zo drie vaste beelden
   op en geen zeven (zie de grens in test/rondgang.test.js).

   WAT HET NIET MAG:
     - iets tegenhouden. De tegels doen het meteen, en élke tik -- waar dan ook --
       maakt de intro af: het logo staat er dan in één keer, heel.
     - de kop wegnemen. Het logo is de <h1> van dit scherm en blijft dat: het
       wordt alleen onzichtbaar gemaakt (opacity, geen visibility of display,
       dus een schermlezer leest "Rekensterren" gewoon). Wat er beweegt is
       aria-hidden en vangt geen tikken.
     - spelen bij wie geen beweging wil. Dan gebeurt er niets en staat het logo
       er zoals altijd.
     - spelen onder ?debug, tenzij er &intro bij staat. De tests en npm run shots
       kijken naar het scherm zoals het blijft, niet naar de eerste seconden.
     - wachten op het netwerk. Het lagenblad staat onder assets/ en komt dus na
       de eerste keer uit de voorraad (zie sw.js). Is het er niet op tijd, dan
       valt de intro weg en verschijnt het logo gewoon.

   De plekken hieronder zijn in pixels van wordmark.webp (1080x360). */
/* Het lagenblad: zijn maat, en per deel [naam, x0, y0, x1, y1, bx, by] -- de
   rechthoek waar het deel in het logo staat (in pixels van het logo, 1080x360),
   en waar diezelfde rechthoek in het blad begint. Niet met de hand bijwerken:
   npm run lagen rekent hem uit en zegt het als hij hier niet meer klopt. */
const LOGO_DELEN = {"blad":[1080,647],"delen":[["r",80,58,373,288,0,296],["e1",231,128,317,236,268,528],["k",304,72,426,257,295,296],["e2",377,126,457,233,356,528],["n1",442,119,536,238,949,296],["s",519,99,600,247,419,296],["t",588,130,654,243,200,528],["e3",632,114,714,236,865,296],["r1",704,113,790,241,622,296],["r2",750,128,848,246,100,528],["e4",804,141,902,260,0,528],["n2",871,154,989,291,502,296],["ster",526,27,679,153,710,296],["zwaai",45,34,1031,328,0,0]]};
const LOGO_INTRO = {
  rMidden: [165, 165],         // midden van de R: daar ploft en wipt hij om
  ster: [616, 103],            // middelpunt van de ster in het logo
  sterBijR: [266, 208],        // en waar hij begint: tegen het been van de R
  sterBegin: .9,               // en hoe groot dan, tegenover zijn eindmaat
  boog: .17,                   // hoe hoog de ster springt, in logobreedtes
  // de tijdlijn, in ms. De letters hebben geen vaste tijd: een letter links van
  // de landingsplek plopt op zodra de ster over hem heen is (voor: hoeveel
  // pixels erna), die rechts ervan rimpelen na de landing naar buiten.
  //
  // Ruim anderhalve seconde. De vlucht is het verhaal en blijft ruim (een kind
  // van vijf moet de ster kunnen volgen); de staart na de landing is afronding en
  // is kort gehouden -- dit speelt bij élke start, en de poppen op de tegels
  // beginnen al na een halve seconde te zwaaien.
  plof: 450, wip: [440, 640], sprong: [550, 1150],
  voor: 30, rimpel: .5, letter: 360, zwaai: [-100, 350], na: 550,
  overname: 200,               // de laatste zoveel ms: het echte logo neemt het over
  // Tot hoe lang na het openen van de pagina de intro nog mag beginnen. Het logo
  // staat vanaf het eerste beeld verstopt (class intro-wacht in de opmaak); is het
  // lagenblad er dan nog niet, dan gaat de intro niet door en verschijnt het logo
  // gewoon. De CSS laat het na 1,2 s hoe dan ook zien -- ook als dit script nooit
  // draait -- en dit moet daar dus vóór liggen.
  uiterlijk: 1000,
  // En als er bij het opstarten al minder dan zoveel over is, begint hij er niet
  // eens aan -- ook het blad wordt dan niet opgehaald. Nagemeten op een trage
  // eerste keer (3G, trage tablet): dit script draait dan pas na bijna drie
  // seconden, en een blad dat dán nog binnenkomt concurreert met het logo zelf,
  // dat daardoor vier seconden later verscheen. Om dezelfde reden staat er geen
  // <link rel="preload"> voor het blad in de <head>: die haalde het eerste beeld
  // een halve seconde naar achteren, en bij een gewone start (uit de voorraad) won
  // hij niets.
  minstens: 300,
};
let logoIntroLoopt = null;   // { stop } zolang hij loopt

// ?debug&intro: speel hem hoe dan ook, ook als de pagina er te lang over deed. Voor
// de tests en voor opnames met een stilgezette klok -- die gaan over wat de intro
// doet, niet over hoe snel de machine toevallig was.
function logoIntroGedwongen() {
  return location.search.indexOf('debug') !== -1 && location.search.indexOf('intro') !== -1;
}
function logoIntroMag() {
  if (motionOff()) return false;
  if (location.search.indexOf('debug') !== -1 && location.search.indexOf('intro') === -1) return false;
  return !document.hidden && !!document.querySelector('#screen-profile.active .spellogo img');
}
function logoIntro() {
  const kop = document.querySelector('#screen-profile .spellogo');
  if (!kop) return;
  /* Het logo staat al vanaf de opmaak op wachten (<h1 class="spellogo
     intro-wacht">). Dat moet daar en niet pas hier: index.html is groot, en een
     trage tablet schildert het scherm al vóórdat dit script aan de beurt is. Stond
     het wachten hier, dan zag je het logo eerst heel, dan weg, en dan opgebouwd. */
  const uiterlijk = logoIntroGedwongen() ? Infinity : LOGO_INTRO.uiterlijk;
  if (!logoIntroMag() || performance.now() > uiterlijk - LOGO_INTRO.minstens) {
    kop.classList.remove('intro-wacht');
    return;
  }
  const woord = kop.querySelector('img');

  const laag = document.createElement('div');
  laag.className = 'logo-intro';
  laag.setAttribute('aria-hidden', 'true');
  // Elk deel is een vak op zijn eigen plek in het logo, met het blad erin zo
  // verschoven dat precies zijn eigen stuk in het vak valt (de maten zet
  // logoIntroSpeel, die kent de schaal). Een <img> en geen CSS-achtergrond:
  // <img>'s met hetzelfde adres delen één download, een achtergrond haalt het blad
  // nóg een keer op (zie rondgang).
  const blad = new Image();
  blad.src = 'assets/branding/logo-lagen.webp';
  const delen = {};
  LOGO_DELEN.delen.forEach(([naam]) => {
    const d = document.createElement('div');
    d.className = 'li-laag li-' + naam;
    const b = new Image();
    b.alt = ''; b.src = blad.src;
    d.appendChild(b);
    delen[naam] = d;
  });
  // van onder naar boven: de zwaai onder alles, dan de letters, de ster erbovenop
  laag.appendChild(delen.zwaai);
  LOGO_DELEN.delen.forEach(([n]) => { if (n !== 'zwaai' && n !== 'ster') laag.appendChild(delen[n]); });
  laag.appendChild(delen.ster);

  let raf = 0, klaar = false;
  function stop() {
    if (klaar) return;
    klaar = true;
    cancelAnimationFrame(raf);
    clearTimeout(wacht);
    laag.remove();
    kop.classList.remove('intro-wacht');
    woord.style.animation = '';
    removeEventListener('pointerdown', stop, true);
    removeEventListener('resize', stop);
    document.removeEventListener('visibilitychange', stop);
    logoIntroLoopt = null;
  }
  logoIntroLoopt = { stop };
  addEventListener('pointerdown', stop, true);
  addEventListener('resize', stop);
  document.addEventListener('visibilitychange', stop);

  const wacht = setTimeout(stop, uiterlijk === Infinity ? 5000 : Math.max(0, uiterlijk - performance.now()));
  const binnen = el => el.decode ? el.decode() : new Promise((ok, nee) => { el.onload = ok; el.onerror = nee; });
  Promise.all([binnen(woord), binnen(blad)]).then(() => {
    if (klaar) return;
    clearTimeout(wacht);
    if (!logoIntroMag() || !woord.offsetWidth || performance.now() > uiterlijk) return stop();
    woord.style.animation = 'none';           // het vangnet in de CSS: nu hebben wij het
    kop.appendChild(laag);
    logoIntroSpeel(woord, laag, delen, stop, f => { raf = f; });
  }, stop);
}
function logoIntroStop() { if (logoIntroLoopt) logoIntroLoopt.stop(); }

function logoIntroSpeel(woord, laag, delen, stop, zetRaf) {
  const L = LOGO_INTRO;
  // De laag ligt precies over het logo, en elk deel beslaat de hele laag. Gemeten
  // met getBoundingClientRect en niet met offsetWidth/-Left: die ronden af op
  // hele pixels, het logo zelf niet -- en dan staat het opgebouwde logo tot een
  // halve pixel naast het echte, en schokt het als dat het aan het eind overneemt.
  const vakLogo = woord.getBoundingClientRect(), vakKop = laag.parentNode.getBoundingClientRect();
  const W = vakLogo.width, k = W / 1080;       // één pixel van het logo -> scherm
  laag.style.left = (vakLogo.left - vakKop.left) + 'px'; laag.style.top = (vakLogo.top - vakKop.top) + 'px';
  laag.style.width = W + 'px'; laag.style.height = vakLogo.height + 'px';
  // elk deel op zijn plek, met zijn stuk van het blad erin
  const vak = {};
  LOGO_DELEN.delen.forEach(([naam, x0, y0, x1, y1, bx, by]) => {
    vak[naam] = [x0, y0];
    const d = delen[naam], b = d.firstChild;
    d.style.left = x0 * k + 'px'; d.style.top = y0 * k + 'px';
    d.style.width = (x1 - x0) * k + 'px'; d.style.height = (y1 - y0) * k + 'px';
    b.style.left = -bx * k + 'px'; b.style.top = -by * k + 'px';
    b.style.width = LOGO_DELEN.blad[0] * k + 'px';
  });
  // een draaipunt, in pixels van het logo, omgerekend naar het vak van dat deel
  const oorsprong = (naam, [x, y]) => (x - vak[naam][0]) * k + 'px ' + (y - vak[naam][1]) * k + 'px';
  delen.r.style.transformOrigin = oorsprong('r', L.rMidden);
  delen.ster.style.transformOrigin = oorsprong('ster', L.ster);

  const tussen = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
  const mix = (a, b, p) => a + (b - a) * p;
  // Zachte krommes: een sinus in en uit voor alles wat reist, en hooguit één
  // kleine doorschieter voor wat erbij komt. Geen verende nazwiep -- die las als
  // schokken.
  const zacht = p => -(Math.cos(Math.PI * p) - 1) / 2;
  const terug = (p, s) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);
  const uit = p => 1 - Math.pow(1 - p, 3);

  // de sprong: waar de ster is op elk moment van zijn vlucht
  // waar de ster begint, als verschuiving vanaf zijn eindplek: tegen het been
  // van de R, en daar groeit hij mee met de R -- om het midden van de R, niet om
  // zijn eindplek. (Eerst groeide de verschuiving mee vanaf nul, en dan vloog de
  // ster in het begin vanaf "sterren" naar de R toe.)
  const bijR = p => [(L.rMidden[0] + (L.sterBijR[0] - L.rMidden[0]) * p - L.ster[0]) * k,
                     (L.rMidden[1] + (L.sterBijR[1] - L.rMidden[1]) * p - L.ster[1]) * k];
  const sterX = t => L.sterBijR[0] + (L.ster[0] - L.sterBijR[0]) * zacht(tussen(t, L.sprong[0], L.sprong[1]));
  const land = L.sprong[1];
  // wanneer elke letter opkomt: links van de landing als de ster over hem heen
  // is, rechts ervan in een rimpel na de landing
  const letters = LOGO_DELEN.delen.filter(([n]) => n !== 'r' && n !== 'ster' && n !== 'zwaai').map(([n, x0, y0, x1, y1], i) => {
    const midden = (x0 + x1) / 2;
    let op = land - 60;
    if (midden + L.voor < L.ster[0]) {
      for (let t = L.sprong[0]; t < land; t += 5) if (sterX(t) >= midden + L.voor) { op = t; break; }
    } else if (midden > L.ster[0]) op = land + (midden - L.ster[0]) * L.rimpel;
    delen[n].style.transformOrigin = oorsprong(n, [midden, y1]);   // ze groeien uit hun voet
    return { el: delen[n], op, hoog: (y1 - y0) * k, kant: i % 2 ? 1 : -1 };   // om en om een kant op
  });
  const klaar = land + L.na;
  // De poppen zwaaien pas als de laatste letter staat, niet door de intro heen.
  // Alleen als de intro echt speelt: valt hij weg, dan blijft de gewone groet.
  landingLeeft(Math.max(...letters.map(l => l.op + L.letter)));
  let geland = false;

  const t0 = performance.now();
  function beeld(nu) {
    const t = nu - t0;
    if (t >= klaar) return stop();
    /* 5. De overname. Het echte logo gaat eronder aan en de lagen lossen erboven
       op. Dat is geen overvloeier tussen twee tekeningen -- het is twee keer
       dezelfde, op dezelfde pixels -- maar de browser schaalt het hoge lagenblad
       nét iets anders dan wordmark.webp, en een harde wissel liet dat zien als
       een trilling op het laatste moment. Zo glijdt dat verschil weg. */
    const over = tussen(t, klaar - L.overname, klaar);
    if (over > 0) { laag.parentNode.classList.remove('intro-wacht'); laag.style.opacity = 1 - over; }
    // 1. de R met de ster ertegen komt op, met één kleine doorschieter
    const p = terug(tussen(t, 0, L.plof), 1.4);
    // en duikt even in elkaar vlak voor de sprong, alsof hij de ster wegschiet
    const wip = Math.sin(tussen(t, L.wip[0], L.wip[1]) * Math.PI);
    delen.r.style.transform = `scale(${p * (1 + .05 * wip)}, ${p * (1 - .08 * wip)})`;
    // 2. de ster springt in een boog naar zijn plek, en draait een keer rond
    const vl = zacht(tussen(t, L.sprong[0], L.sprong[1]));
    // Hij landt zonder na te veren: de sinus-kromme brengt hem al zacht tot
    // stilstand, en een platdrukken erbovenop las als trillen. De draai eindigt
    // op precies een hele slag (-12 -> -360 = 0 graden), zodat hij rechtop staat
    // zoals in het logo -- anders sprong hij recht als het echte logo het
    // overnam.
    const sch = mix(L.sterBegin * p, 1, vl) * (1 + .22 * Math.sin(vl * Math.PI));
    const [bx, by] = bijR(p);
    const dx = mix(bx, 0, vl), dy = mix(by, 0, vl) - Math.sin(vl * Math.PI) * L.boog * W;
    delen.ster.style.transform = `translate(${dx}px, ${dy}px) rotate(${mix(-12, -360, vl)}deg) scale(${sch})`;
    if (!geland && t >= land) { geland = true; logoIntroVonken(laag, [L.ster[0] * k, L.ster[1] * k]); }
    // 3. de letters, één voor één: uit hun voet omhoog, met een klein kantelje
    for (const l of letters) {
      const q = tussen(t, l.op, l.op + L.letter);
      l.el.style.visibility = q > 0 ? 'visible' : 'hidden';
      l.el.style.transform = `translateY(${(1 - uit(q)) * .25 * l.hoog}px) rotate(${(1 - uit(q)) * 8 * l.kant}deg) scale(${terug(q, 1.6)})`;
    }
    // 4. de zwaai veegt eronder open, met een zachte rand
    const z = zacht(tussen(t, land + L.zwaai[0], land + L.zwaai[1])) * 108;
    delen.zwaai.style.visibility = z > 0 ? 'visible' : 'hidden';
    delen.zwaai.style.webkitMaskImage = delen.zwaai.style.maskImage = z >= 108 ? ''
      : `linear-gradient(90deg, #000 ${z - 8}%, transparent ${z}%)`;
    zetRaf(requestAnimationFrame(beeld));
  }
  // Het eerste beeld meteen, niet pas bij het volgende frame: anders staan de
  // delen één frame lang onbewerkt op het scherm -- en dat is het hele logo.
  beeld(t0);
}
// Een handvol sterretjes waar de ster landt. Dezelfde vonk als bij de MAX-ster.
function logoIntroVonken(laag, [x, y]) {
  for (let i = 0; i < 6; i++) {
    const v = document.createElement('span');
    v.className = 'li-vonk';
    v.textContent = '✦';
    const hoek = (200 + i * 28) * Math.PI / 180, ver = rnd(22, 40);
    v.style.left = x + 'px'; v.style.top = y + 'px';
    v.style.setProperty('--dx', Math.round(Math.cos(hoek) * ver) + 'px');
    v.style.setProperty('--dy', Math.round(Math.sin(hoek) * ver) + 'px');
    v.style.setProperty('--rot', rnd(-120, 120) + 'deg');
    v.style.fontSize = rnd(9, 14) + 'px';
    laag.appendChild(v);
  }
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
    `<div class="stage st-podium"><div class="avatar-holder levend">${pasLaag(avatarSVG(p, 132, 'klein'))}</div></div>
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
  /* Vier is 2+2 maar met een eigen, kleinere maat (kol-4): op de maat van twee
     werd het blok hoger dan met zes sterren -- zie .star-grid.kol-4. */
  const kol = !n ? 0 : n <= 1 ? 1 : n <= 2 ? 2 : n === 4 ? 4 : 3;
  row.classList.toggle('kol-0', kol === 0);
  row.classList.toggle('kol-1', kol === 1);
  row.classList.toggle('kol-2', kol === 2);
  row.classList.toggle('kol-4', kol === 4);
  // Verse installatie: het keuzescherm ís het welkom. Geen apart onthaalscherm --
  // dezelfde knop en hetzelfde formulier als later.
  if (add) {
    add.style.display = n >= MAX_PROFILES ? 'none' : '';
    if (n) plusKnop(add); else leegTegel(add);
  }
  // alleen op het lege scherm: wat is dit spel (zie de opmaak van #over-hint)
  const hint = $('over-hint');
  if (hint) hint.style.display = n ? 'none' : 'flex';
  // en eronder: al gespeeld op een ander toestel? (zie = Overzetten)
  const codeHint = $('code-hint');
  if (codeHint) codeHint.style.display = !n && overzetMag() ? 'flex' : 'none';
  renderGeluid();
  appKnopZet();
  /* HIER WORDT NIET MEER GEZWAAID. Dit scherm had zijn eigen begroeting: alle
     sterren zwaaiden één keer, kort na elkaar. Dat was ooit de enige plek in de
     app waar een pop iets deed bij het binnenkomen van een scherm, en daarmee
     stond hij op de verkeerde plaats -- want een kind is hier maar twee tellen.
     Tikken, en je staat op de kaart; de zwaai op dit scherm en de begroeting daar
     vielen dus bijna in elkaar (zie kaartGroet, boven goMap).

     Eén begroeting, op de plek waar de ster woont. Dit scherm is een keuze en
     geen plek: hier staan zes poppen naast elkaar en er is er één van jou. De
     tegels staan daarom stil -- ook geen .idle, dat stond er al niet op. */
}
function selectProfile(key) { cur = key; goMap(); }
/* De "+" heeft twee gedaanten, en het is steeds dezelfde knop (#btn-newstar):
   met sterren een lage gestippelde knop onder de tegels, zonder sterren een lege
   sterrentegel. Die lege tegel was eerst een welkomstzin boven een knop die
   hetzelfde zei ("Welkom! Maak je eerste ster." / "Maak je eerste ster"); nu
   staat er wat je gaat maken -- de gedimde schim met het vraagteken uit het
   maakformulier (zie renderNewStar), op een podium in de eerste wereld, want daar
   begint ze. Een tik opent precies diezelfde schim. */
function leegTegel(add) {
  if (add.classList.contains('leeg-tegel')) return;
  const schim = defaultProfile('', 'dress_roze', { base: 'jongen' });
  add.className = 'leeg-tegel';
  add.innerHTML =
    `<div class="stage st-podium"><div class="avatar-holder">${pasLaag(avatarSVG(schim, 132, 'klein'))}</div>`
    + `<span class="ns-vraag" aria-hidden="true">?</span></div>
     <div class="st-voet"><div class="st-rij">
       <span class="st-ico" aria-hidden="true">＋</span>
       <span class="st-naam">Maak je ster</span>
     </div></div>`;
  applyWorldTheme(add, WORLDS[0]);
  applyStage(add.querySelector('.st-podium'), schim);
  add.setAttribute('aria-label', 'Maak je eerste ster');
}
function plusKnop(add) {
  if (add.classList.contains('add-tegel')) return;
  add.className = 'add-tegel';
  add.innerHTML = '<span class="at-plus" aria-hidden="true">＋</span><span class="at-tekst">Nieuwe ster</span>';
  add.setAttribute('aria-label', 'Nieuwe ster maken');
}

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

