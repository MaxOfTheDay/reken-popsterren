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
  sprong: 420,                                  // zij springt de nieuwe wereld in (zie zijReistMee)
  beeldWacht: 1500,                             // hoogstens zo lang op de tekening wachten
};

/* Zij reist mee naar een nieuwe wereld. Ze stond er eerst gewoon al: de oude
   wereld zakte weg mét haar op de laatste halte, en op de nieuwe stond ze op
   halte 1 klaar alsof ze er altijd was geweest. Nu is ze er tijdens de klim even
   niet, en springt ze erin zodra de camera stilstaat -- en pas dán het feest.
   Oorzaak, dan beloning: eerst is zij er, dan wordt het gevierd.

   Geeft de twee functies voor wereldCamera terug (teken en klaar), om de plaats()
   en vier() van de aanroeper heen. Wie geen beweging wil, ziet haar gewoon staan.
   Wordt de reis afgebroken, dan roept de opruimer van de camera klaar ook aan --
   en dan staat ze er dus ook gewoon weer. */
function zijReistMee(plaats, vier) {
  const zij = () => { const m = $('tour-map'); return m && m.querySelector('.tour-hero'); };
  return {
    teken: () => {
      plaats();
      const z = zij();
      if (z && !motionOff()) z.style.opacity = '0';
    },
    klaar: () => {
      const z = zij();
      if (z) z.style.opacity = '';
      if (!z || !z.animate || motionOff() || !$('screen-map').classList.contains('active')) return vier();
      z.animate([{ opacity: 0, translate: '0 -70px', scale: '.85' }, { opacity: 1, translate: '0 0', scale: '1' }],
        { duration: WERELDREIS.sprong, easing: MOTION.plop });
      setTimeout(haltePuls, Math.round(WERELDREIS.sprong * .45));   // haar halte antwoordt (zie .aangekomen)
      setTimeout(vier, Math.round(WERELDREIS.sprong * .8));   // het feest op haar neerkomen, niet erna
    },
  };
}
/* De tekening van de wereld die opengaat, uitgepakt vóór de camera klimt. Er zit
   toch al een stilte voor de klim (de sterren, de badge), en die was ongebruikt:
   op een druk toestel klom de camera dan een donker kader in. Lost altijd op, ook
   als het mislukt -- dan klimt hij gewoon, zoals altijd. */
function wereldBeeldKlaar(w) {
  const src = w && w.world && w.world.art;
  if (!src) return Promise.resolve();
  const b = new Image();
  b.src = src;
  ART_GEHAALD.add(src);
  const klaar = b.decode ? b.decode().catch(() => {}) : Promise.resolve();
  return Promise.race([klaar, new Promise(r => setTimeout(r, WERELDREIS.beeldWacht))]);
}
function wereldReisBezig() { return !!wereldReisOp; }
function stopWereldReis() {
  const op = wereldReisOp;
  wereldReisOp = null;
  if (op) { try { op(); } catch (e) { /* opruimen mag nooit de app tegenhouden */ } }
  landingVrij();
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
/* duur: hoe lang de camera rijdt. De naam wisselt halverwege die rit (vanaf 40%,
   klaar op 85%), want dan is de helft van het scherm de nieuwe wereld. Hij stond
   op een vaste 260ms, en bij een onthulling van 900ms stond de nieuwe naam dan al
   in de kop terwijl er nog vier vijfde van de óude wereld in beeld was. */
function kopMeeMetCamera(richting, duur) {
  duur = duur || WERELDREIS.snel;
  const el = $('map-tournee-label');
  if (!el || !el.animate || motionOff()) return;
  el.getAnimations().forEach(a => a.cancel());
  /* Niet naar nul: een pil die helemaal verdwijnt laat een gat in de kop achter en
     dát leest als een haperende kop, niet als een kop die meebeweegt. .2 is genoeg
     om "deze naam hoort bij die beweging" te zeggen. */
  el.animate(
    [{ transform: 'translateY(' + (richting > 0 ? -9 : 9) + 'px)', opacity: .2 },
     { transform: 'none', opacity: 1 }],
    { duration: Math.max(MOTION.snel, Math.round(duur * .45)), delay: Math.max(40, Math.round(duur * .4)),
      easing: MOTION.uit, fill: 'backwards' });
}
/* De weg-terug-pil doet mee met de klim, en gaat niet aan of uit op het beeldje
   van de tik. Daar ging hij eerst wél aan: teken() bouwt de kop opnieuw op vóórdat
   er iets beweegt, dus de pil stond er al terwijl de camera nog moest vertrekken --
   en noemde dan de wereld die je net aan het verlaten was. Nu komt hij pas op als
   de nieuwe wereld er zo goed als staat (de curve is voorlijk: op zes tiende van
   de duur is het meeste van de weg al afgelegd), en tegelijk met de wereldpil
   boven hem (zie kopMeeMetCamera).

   Weg gaat hij al wél meteen -- hij heeft zijn werk gedaan, en een knop die nog
   een kwart seconde blijft staan nodigt uit tot een tweede tik. Maar niet met een
   knip: een schim van hem (geen id, niet aan te raken, voor een screenlezer
   onzichtbaar) dooft uit op zijn plek, terwijl de echte pil meteen hidden is.
   Dat laatste is waar de rest op leunt: navGo en backTarget kijken naar hidden.
   Geeft die schim terug, zodat de opruimer van de camera hem kan weghalen. */
function terugMeeMetCamera(was, duur) {
  const pil = $('world-back');
  if (!pil || !pil.animate) return null;
  if (!was && !pil.hidden) {
    pil.animate([{ opacity: 0 }, { opacity: 1 }],
      { duration: MOTION.snel, delay: Math.round(duur * .6), easing: MOTION.uit, fill: 'backwards' });
    return null;
  }
  if (!was || !pil.hidden) return null;
  const schim = pil.cloneNode(true);
  schim.removeAttribute('id');
  schim.hidden = false;
  schim.setAttribute('aria-hidden', 'true');
  schim.tabIndex = -1;
  schim.style.pointerEvents = 'none';
  pil.after(schim);
  const a = schim.animate([{ opacity: 1 }, { opacity: 0 }],
    { duration: MOTION.snel, easing: MOTION.uit, fill: 'forwards' });
  a.onfinish = () => schim.remove();
  return schim;
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
  const terugWas = !$('world-back').hidden;
  /* Op een breed scherm: de rand van de wereld die je verlaat blijft er even
     overheen liggen en doft weg terwijl de camera reist. teken() zet de rand al
     meteen op de nieuwe wereld, en dan sprong hij om vóór de klim begon. */
  const klim = randNu(scherm);
  if (klim) scherm.appendChild(klim);
  teken();                                      // de nieuwe wereld staat er nu al
  kopMeeMetCamera(richting, duur);
  const terugSchim = terugMeeMetCamera(terugWas, duur);
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
      { duration: duur + MOTION.vangnet, easing: WERELDREIS.na });
  }

  if (klim) klim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: duur, easing: easing, fill: 'forwards' });

  const deze = () => {
    [aUit, aIn].forEach(a => { try { a.cancel(); } catch (e) {} });
    schaduw.remove();
    if (klim) klim.remove();
    if (terugSchim) terugSchim.remove();
    scherm.classList.remove('wereld-reist');
    map.style.pointerEvents = '';
    vier();
  };
  wereldReisOp = deze;
  const af = () => { if (wereldReisOp === deze) stopWereldReis(); };
  aIn.onfinish = af;
  setTimeout(af, duur + MOTION.vangnet);        // vangnet, net als bij elke andere overgang
}
/* De enige weg van wereld naar wereld tijdens gewoon rondkijken: de werelden-kiezer
   en de weg-terug-pil lopen hier allebei langs.

   Een kind tikt drie keer; dat hoort één wereld verder te zijn. Vandaar de grendel,
   en vandaar dat dezelfde wereld nog eens kiezen niets doet in plaats van de kaart
   opnieuw op te bouwen. Geeft false terug als er niets gebeurd is, zodat een
   aanroeper weet dat hij niets hoeft op te ruimen. */
function navigeerNaarWereld(idx) {
  if (wereldReisBezig()) {
    naLandingZet(() => { if ($('screen-map').classList.contains('active')) navigeerNaarWereld(idx); });
    return false;
  }
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
   #screen-journey.

   Oktober 2026 -- de chevron (WP_CHEV) is weg en de pil is een rondje met alleen
   de globe. Het was het enige pijltje in de kop, en een pijl naar rechts belooft
   een schuif opzij terwijl Werelden een vlucht omhoog is. Zie .world-pick in
   40-kaart.css. */
/* Een pijl of kruisje uit de tekenset bovenin <body> (#ico-terug, #ico-op,
   #ico-kruis). De opmaak schrijft ze zelf uit; dit is voor wat hier in
   JavaScript wordt opgebouwd, zodat het dezelfde tekening is en geen ↑ uit de
   systeemletter van het toestel. */
const ico = naam => `<svg class="ico" aria-hidden="true"><use href="#ico-${naam}"/></svg>`;
/* Eén keer per sessie knipoogt de globe met een zacht bootje + gloed, zodat een
   kind dat het icoon nog nooit heeft opgemerkt er even naar kijkt -- daarna
   nooit meer vanzelf, want een pil die naast de kaart continu beweegt is precies
   het soort ruis dat hier niet hoort. Bewust geen opslag: dit is een duwtje bij
   het openen van de kaart, geen voortgang die bewaard hoeft te blijven. */
let wpHintKlaar = false;
/* De naam in een kop: zonder "wereld" erachter. Elke wereld heet "...wereld",
   en in een kop staat het wereldicoon er al voor -- "🪸 Onderwater" zegt
   hetzelfde als "🪸 Onderwaterwereld" in zes letters minder. Dat is het
   verschil tussen passen en een ellips op een gewone telefoon (zie .world-pick).
   Alleen voor de koppen (kaart, show, eindscherm); Werelden, de kast en het
   wereldfeest houden de volle naam. Afgeleid en niet opgeslagen, dus de studio
   hoeft er niets voor te weten. Een naam die ánders eindigt -- of die zonder
   "wereld" niets overhoudt -- blijft zoals hij is. */
function korteNaam(w) {
  const naam = (w && w.name) || '';
  const kort = naam.replace(/\s*wereld$/i, '');
  return kort || naam;
}
function renderMapTitle(p, opReis) {
  const cur = worldFor(hereLevel(p));
  // || cur: buiten de lijst is er geen wereld meer (fase 4A), en de kop moet
  // altijd iets kunnen noemen -- dan die waar de ster staat.
  const shown = (viewWorldIdx == null ? cur : worldForIndex(viewWorldIdx)) || cur;
  const anders = shown.index !== cur.index;
  const pil = $('map-tournee-label');
  /* De knipoog is pas gedaan als hij gespeeld heeft. Hier ging de vlag meteen om,
     en bij een onthulling bouwt de camera de kop een beeldje later opnieuw op --
     zonder knipoog, en daarmee had niemand hem ooit gezien. */
  const hint = !wpHintKlaar;
  /* Alleen de globe, geen wereldicoon of naam ervoor (oktober 2026). Een kind van
     vijf leest "IJs" niet, en de tekening zegt al in welke wereld je bent. De globe
     is het deel dat iets betekent: het is hetzelfde 🌍 dat in z'n eentje de kop van
     Werelden is, en zo is hij de draad tussen de twee schermen. De naam staat nog
     in de show, op het eindscherm en op Werelden. */
  pil.innerHTML =
      `<span class="wp-cta"><span class="wp-cta-ico${hint ? ' wp-hint' : ''}" aria-hidden="true">🌍</span></span>`;
  // Screenlezer en desktop-tooltip krijgen de volledige zin, mét de wereldnaam:
  // die zien ze niet in de pil.
  const uitleg = `${shown.world.name} — tik voor alle werelden`;
  pil.setAttribute('aria-label', uitleg);
  pil.title = uitleg;
  const knipoog = hint && pil.querySelector('.wp-hint');
  if (knipoog) knipoog.addEventListener('animationend', () => { wpHintKlaar = true; }, { once: true });
  if (hint && motionOff()) wpHintKlaar = true;   // daar speelt hij niet, dus valt er niets af te wachten
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
       precies waar de onderste haltes staan. De twee woorden ervoor kostten de
       helft van de breedte en voegden er niets aan toe. De ⟲ is sindsdien een ↑
       geworden: terug is hier altijd omhoog, en een pijl leest een kind dat nog
       niet leest wél (zie .world-back). Een screenlezer krijgt de hele zin. */
    terug.innerHTML = `<span class="wb-cta" aria-hidden="true">${ico('op')}</span>`
      + `<span class="wb-naam">${cur.world.icon} ${esc(korteNaam(cur.world))}</span>`;
    terug.setAttribute('aria-label', `Terug naar ${cur.world.name}`);
    // Terug naar de wereld waar ze speelt is vóóruit in de tournee -- die ligt per
    // definitie hóger dan waar ze nu staat te kijken. De camera klimt dus, net als
    // wanneer ze er via de kiezer heen gaat. Zie navigeerNaarWereld.
    terug.onclick = () => { sndClick(); navigeerNaarWereld(cur.index); };
    terugUitlijnen();
  }
}
/* De weg-terug-pil hangt onder de wereldpil, en dan moet hij er ook ónder staan.
   Midden op het scherm is dat niet: de koprij heeft auto-kolommen (zie
   #screen-map .screen-header), en omdat het portretje smaller is dan de
   diamantpil staat de wereldpil een stukje links van het midden -- op een gewone
   telefoon 17px. Twee pillen boven elkaar die net niet op één lijn staan lezen als
   een slordigheid, niet als een ontwerp. En 8px onder de wereldpil, niet onder de
   kop: de kop is hoger dan de pil erin, en dan hing hij er op een tablet verder
   onder dan op een telefoon.

   Gemeten en niet uitgerekend: hoe ver de wereldpil van het midden staat hangt af
   van de wereldnaam, het aantal diamanten en de breedte van het scherm. Een
   scherm dat (nog) niet in beeld is meet nul -- dan niets schrijven, en blijft de
   CSS op het midden staan tot meetChroom het na de opbouw nog eens doet. */
function terugUitlijnen() {
  const terug = $('world-back'), pil = $('map-tournee-label'), scherm = $('screen-map');
  if (!terug || terug.hidden || !pil || !scherm) return;
  const p = pil.getBoundingClientRect(), s = scherm.getBoundingClientRect();
  if (!p.width || !s.width) return;
  stijlVar(terug, '--wp-mid', Math.round((p.left + p.right) / 2 - s.left) + 'px');
  stijlVar(terug, '--wp-onder', Math.round(p.bottom - s.top + 8) + 'px');
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
  plop: 'cubic-bezier(.2,1.3,.4,1)',                // de enige overshoot: "ja, deze" -- dezelfde als --ease-plop in :root
};
// De sport 'nav' van de ladder: hoe lang de hele wissel duurt, van de tik tot
// alles stilstaat. Het vertrekkende scherm (weg) valt hier binnen -- dat is op
// 140ms klaar, ruim voordat het aankomende scherm op 300 tot rust komt.
MOTION.totaal = MOTION.komNa + MOTION.kom;
// Dezelfde tel voor de CSS die op een stilstaande kaart wacht (.net-af): zo staat
// de duur hier één keer, en niet nog eens als .3s in het stijlblad.
document.documentElement.style.setProperty('--kaart-rust', MOTION.totaal + 'ms');
/* Het vangnet. Elke overgang ruimt zichzelf op als hij klaar is (onfinish), maar
   die belofte houdt niet altijd: wisselt het scherm tussendoor, dan wordt de
   animatie afgebroken en komt onfinish nooit. Daarom hangt er naast elke
   overgang een timer die hetzelfde opruimt, een tikje ná de duur.

   Waarom niet strak op de duur: dan racet de timer met onfinish en kan hij er
   nét vóór zitten, en dan ruimt hij een animatie op die nog loopt. Ruim genoeg
   dus om altijd de tweede te zijn, kort genoeg om een grendel niet merkbaar te
   laten hangen als er écht iets misging.

   Dit getal stond negen keer als los "+ 260" in het bestand, elke keer met
   dezelfde opmerking erbij. Eén naam is korter dan negen opmerkingen, en hij kan
   niet op acht plekken bijgewerkt worden en op de negende vergeten. */
MOTION.vangnet = 260;

function eindigOvergang(anim, dur, opruimen) {
  let gedaan = false;
  const klaar = () => {
    if (gedaan) return;
    gedaan = true;
    overgangBezig = false;
    try { opruimen(); } catch (e) { /* opruimen mag nooit de app tegenhouden */ }
    landingVrij();
  };
  if (anim) anim.onfinish = klaar;
  setTimeout(klaar, dur + MOTION.vangnet);
  return klaar;
}
/* Een tik die een grendel tegenkwam, voor straks (zie naLanding in de kaartstand).
   fn kijkt zelf nog eens of hij dan nog klopt -- de landing kan op een ander
   scherm uitkomen dan waar de tik voor bedoeld was, en dan doet hij niets. */
function naLandingZet(fn) { naLanding = fn; }
/* Aangeroepen waar een grendel opengaat. Een beurt later, zodat het opruimen van
   de overgang eerst helemaal klaar is; en alleen als er dan niets meer loopt --
   gaat er één grendel open terwijl er nog een tweede dicht is, dan wacht de tik
   gewoon op die tweede. */
function landingVrij() {
  if (!naLanding) return;
  setTimeout(() => {
    if (!naLanding || overgangBezig || vluchtOp || wereldReisOp) return;
    const fn = naLanding;
    naLanding = null;
    try { fn(); } catch (e) { /* een tik van daarnet mag nooit de app tegenhouden */ }
  }, 0);
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
/* Wat schermWeg, schermKomtOp en kaartKomtOp zelf op een scherm zetten, per
   scherm bijgehouden.

   Hier stond op alle drie de plekken el.getAnimations(). Dat klinkt als opvragen, maar
   de browser moet daarvoor eerst stijl én opmaak bijwerken -- midden in de tik,
   op een scherm dat show() net heeft aangezet en dat daarna nog helemaal gevuld
   wordt. De kleedkamer werd zo bij één tik twee keer opgemeten met de inhoud
   van de vorige keer, en daarna nog eens met de nieuwe. Gemeten op de eerste
   tik op Kleedkamer: zo'n 60ms van de tik, op een gesmoorde processor.

   Wat er weg moet is ook alleen wat deze drie er zelf op zetten: een scherm
   waar je snel naar terugkomt draagt nog de opacity-0 van zijn vertrek
   (fill: 'forwards'), en een tweede tik mag geen tweede animatie stapelen. Wat
   een ander er eerder op zette (de opkomst van de reis, de groei van de zaal)
   wordt door de nieuwe animatie overstemd, want die komt later en zet dezelfde
   eigenschappen -- en de opruimer van schermWeg ruimt het na afloop alsnog op,
   daar mag getAnimations() wél: dat is geen tik meer. */
const schermAnims = new WeakMap();
function schermAnim(el, frames, opts) {
  const a = el.animate(frames, opts);
  if (!schermAnims.has(el)) schermAnims.set(el, []);
  schermAnims.get(el).push(a);
  wisselSchuif(el, a);
  return a;
}
function schermAnimsStop(el) {
  (schermAnims.get(el) || []).forEach(a => a.cancel());
  schermAnims.delete(el);
  wisselSchuifUit(el);
}
/* De lucht van een gescrold scherm blijft staan tijdens een wissel. Zolang een
   scherm een transform draagt is `fixed` op het scherm zelf gerekend en schuift de
   achtergrondlaag met de schuifstand mee: de onderkant liet dan de rauwe gloed van
   <body> zien (een lichte flits) tot de animatie klaar was. --schuif is de
   schuifstand, en de vier lagen in 20-schil.css trekken hem er weer af.

   De stand komt uit een scroll-luisteraar en niet uit el.scrollTop: dat is een
   opmaakvraag midden in de tik (zie schermAnims). Een scherm dat programmatisch
   naar boven gaat (openTrophies) stuurt een scroll-gebeurtenis, dus dan loopt
   --schuif vanzelf mee. */
const schuifStand = new WeakMap();
document.addEventListener('scroll', e => {
  const el = e.target;
  if (!el || !el.classList || !el.classList.contains('screen')) return;
  schuifStand.set(el, el.scrollTop);
  if (el.style.getPropertyValue('--schuif')) el.style.setProperty('--schuif', el.scrollTop + 'px');
}, { capture: true, passive: true });
function wisselSchuif(el, a) {
  if (!el.classList.contains('screen')) return;
  const y = schuifStand.get(el) || 0;
  if (y) el.style.setProperty('--schuif', y + 'px');
  const klaar = () => {
    const nog = (schermAnims.get(el) || []).some(x => x.playState === 'running' || x.playState === 'pending');
    if (!nog) wisselSchuifUit(el);
  };
  a.addEventListener('finish', klaar);
  a.addEventListener('cancel', klaar);
}
function wisselSchuifUit(el) { el.style.removeProperty('--schuif'); }
function schermWeg(el, naarBinnen, punt) {
  if (!el || !el.animate || motionOff()) return;
  schermAnimsStop(el);   // een tweede tik stapelt geen tweede animatie
  // draaipunt: de aangetikte halte, zodat de beweging om díe plek gaat en niet om
  // het midden van het scherm. Dat is het enige wat de continuïteit draagt.
  // Gemeten vóór .wegvallend: dan staat de opmaak nog zoals hij net getekend is
  // en kost de meting niets. Erna moest de browser eerst het hele scherm opnieuw
  // opmaken (het stapt uit de kolom), alleen om dit ene getal te geven.
  if (punt) el.style.transformOrigin = oorsprongPct(el, punt);
  el.classList.add('wegvallend');
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
  const a = schermAnim(el,
    [{ transform: 'none' },
     { transform: naarBinnen ? 'scale(1.07)' : 'scale(.96) translateY(10px)' }],
    { duration: MOTION.weg, easing: MOTION.in, fill: 'forwards' });
  schermAnim(el, [{ opacity: 1 }, { opacity: 0 }],
    { duration: MOTION.weg, easing: MOTION.uit, fill: 'forwards' });
  a.onfinish = op;
  setTimeout(op, MOTION.weg + MOTION.vangnet);
}
/* De vaste navigatiebalk staat buíten de schermen, dus hij doet niet vanzelf mee
   met een wissel: hij knipt aan of uit op het moment dat show() hem zet. Tijdens
   een overgang is dat precies het ene element dat verraadt dat er twee schermen
   tegelijk staan -- een volledig ondoorzichtige balk over een scherm dat nog aan
   het verschijnen is. Hij krijgt dus dezelfde fade als het scherm waar hij bij
   hoort.

   meteen: het aankomende scherm wacht niet (de stille wissel van hubWissel, zie
   daar). Dan wacht de balk ook niet op MOTION.komNa, anders kwam hij pas na zijn
   eigen scherm binnen. */
let navMeeNr = 0;   // welke navMee het laatst begon; een oudere ruimt niet meer op
function navMee(naarBinnen, meteen) {
  const nav = $('main-nav');
  if (!nav || !nav.animate || motionOff()) return;
  const nr = ++navMeeNr;
  /* Alleen wat navMee er zelf op zette, en niet nav.getAnimations(): dat dwingt
     stijl en opmaak af midden in de tik (gemeten: 9 tot 22ms per tik op een
     zesvoudig gesmoorde processor, op de halte én op "Verder op tournee"). Zie
     schermAnim -- dezelfde reden, dezelfde oplossing. */
  schermAnimsStop(nav);
  nav.style.pointerEvents = '';
  if (!naarBinnen) {
    // De kaart komt op en neemt zijn balk mee. fill:'backwards' houdt hem op nul
    // zolang de vorige nog wegvalt, dus hij verschijnt niet alvast over een zaal.
    if (nav.style.display === 'none') return;
    schermAnim(nav, [{ opacity: 0 }, { opacity: 1 }],
      { duration: MOTION.kom, delay: meteen ? 0 : MOTION.komNa, easing: MOTION.uit, fill: 'backwards' });
    return;
  }
  /* Andersom: show() heeft de balk al uitgezet omdat er in een show geen
     navigatie hoort. Maar de kaart is dan nog MOTION.weg bezig met vertrekken, en
     een kaart waarvan de balk al bij de tik verdwenen is ziet er kapot uit. Hij
     komt dus even terug, gaat mee weg, en wordt daarna gezet zoals show() hem
     wilde.

     MAAR HIJ IS DAN AL WEG, OOK AL ZIE JE HEM NOG. Hij vangt geen tikken meer,
     net als een scherm met .wegvallend. Dat deed hij wel: een tik op Kleedkamer
     vlak na een tik op een halte opende de kleedkamer, met de show er nog
     draaiend achter -- G bleef staan en de spotlight-teller liep door.

     En hij dooft met dezelfde curve als het scherm dat hij volgt: 'uit', zie
     schermWeg. Hier stond 'in', en daarmee stond de kaart op een derde terwijl
     de balk nog vrijwel vol was -- een handvol beeldjes lang hing er een losse
     balk over de zaal die al binnenkwam. */
  nav.style.display = 'flex';
  nav.style.pointerEvents = 'none';
  const op = () => {
    // Kwam er intussen een nieuwere wissel, dan heeft die de balk; deze zou hem
    // anders midden in zijn eigen fade weer afbreken.
    if (nr !== navMeeNr) return;
    schermAnimsStop(nav);
    nav.style.pointerEvents = '';
    navVolgtScherm();
  };
  const a = schermAnim(nav, [{ opacity: 1 }, { opacity: 0 }],
    { duration: MOTION.weg, easing: MOTION.uit, fill: 'forwards' });
  a.onfinish = op;
  setTimeout(op, MOTION.weg + MOTION.vangnet);
}
/* De balk bij een stille wissel (hubWissel, en de gewone weg terug naar de kaart
   in kaartVertrek). Alleen als hij er aan de ene kant wel en aan de andere kant
   niet hoort: tussen twee schermen mét balk blijft hij gewoon staan, en tussen
   twee zonder is er niets. Hiervoor deed alleen de weg kaart <-> zaal dit; van
   het eindscherm naar de kleedkamer stond de balk op het eerste beeldje al vol
   over een eindscherm dat nog helemaal in beeld was, en van de kaart naar de
   sterrenkeuze was hij bij de tik al weg. */
function navWissel(van, naar) {
  if (!van || !naar) return;
  const had = !!NAV_FOR_SCREEN[van.id], krijgt = !!NAV_FOR_SCREEN[naar.id];
  if (had && !krijgt) navMee(true);
  else if (!had && krijgt) navMee(false, true);
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
  /* De andere kant op, op de landing: de kaart bouwt zich op terwijl de tekening
     uitzakt. Hier kwam alles in één klap op -- weg, acht haltes, de ster, de kop
     -- en wel pas op het eind, terwijl de tekening er al een tiende seconde kaal
     en stil lag. Nagemeten: de tekening legt 90% van de weg af in de eerste
     ~150ms, en de haltes gingen daarna in zo'n 35ms van niets naar alles. Dat
     las als een flits, en dat was het ook.

     Nu begint het op een kwart van de vlucht, als de tekening er al bijna is:
     de kop en de weg doven op, de haltes springen van 1 naar 8 op hun plek
     (haltePas uit elkaar, met de ene overshoot van de app), en zij komt als
     laatste op haar halte neer -- oorzaak, dan het "hier ben je". Samen is het
     klaar op ongeveer hetzelfde moment als de oude overvloeier. */
  opbouw: .25,     // wanneer de kaart begint op te komen, als deel van VLUCHT.duur
  opbouwDuur: 200, // de kop, de weg, en elke halte apart
  haltePas: 16,    // tussen twee haltes
  landing: 300,    // zij, als laatste
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
  landingVrij();
  clearTimeout(v.timer);
  clearTimeout(v.grendel);
  overgangBezig = false;
  try { v.op(); } catch (e) { /* opruimen mag nooit de app tegenhouden */ }
  if (v.laag && v.laag.parentNode) v.laag.parentNode.removeChild(v.laag);
  if (v.doek && v.doek.parentNode) v.doek.parentNode.removeChild(v.doek);
  if (v.globe) v.globe();   // de globe landt normaal zelf; wordt de vlucht afgebroken, dan hij ook
}
/* De vlucht zelf. van/naar zijn twee vlakken; bron levert de kleuren en de
   tekening (de wereld waar het om gaat). 'op' is het opruimwerk van de aanroeper
   en loopt altijd precies één keer.

   Geeft terug wanneer de overvloeier begint -- de aanroeper laat het échte
   kaartje (of de échte kaart) op dat moment verschijnen, zodat de vluchtlaag
   erop wegdooft in plaats van ervoor. */
/* De onscherpe rand van een wereld als losse laag (zie .wereld-doek), of null
   waar er geen rand is: op een telefoon vult de kaart het scherm. Dezelfde
   mediaregel als #screen-map::after -- staat die er niet, dan deze ook niet. */
const BREED_PODIUM = '(min-aspect-ratio: 1/1) and (min-height: 600px)';
function wereldDoek(soort, wereld) {
  if (!wereld || !window.matchMedia || !matchMedia(BREED_PODIUM).matches) return null;
  const doek = document.createElement('div');
  doek.className = 'wereld-doek ' + soort;
  doek.setAttribute('aria-hidden', 'true');
  applyWorldTheme(doek, wereld);
  doek.style.setProperty('--art', randBeeld(wereld));
  return doek;
}
/* De rand zoals hij nú op de kaart staat, als .klim-doek: overgenomen van het
   scherm zelf en niet opgezocht, want wélke wereld dat is weet op dit moment
   alleen het scherm nog (viewWorldIdx kan al op de volgende staan). */
function randNu(scherm) {
  if (!window.matchMedia || !matchMedia(BREED_PODIUM).matches) return null;
  const doek = document.createElement('div');
  doek.className = 'wereld-doek klim-doek';
  doek.setAttribute('aria-hidden', 'true');
  ['--art', '--w-sky', '--w-deep'].forEach(k => {
    const v = scherm.style.getPropertyValue(k);
    if (v) doek.style.setProperty(k, v);
  });
  return doek;
}
// het kleine kaartjesbeeld: onscherp ziet niemand het verschil, en het is al uitgepakt
function randBeeld(wereld) {
  return wereld.art ? `url("${wereldKleinPad(wereld.art) || wereld.art}")` : 'none';
}
function wereldVlucht(van, naar, bron, op, hoog) {
  vluchtKlaar();                             // vangnet: de ingangen doen dit al zelf
  const laag = document.createElement('div');
  laag.className = 'wereld-vlucht' + (hoog ? ' hoog' : '');
  laag.setAttribute('aria-hidden', 'true');
  const kunst = document.createElement('div');
  kunst.className = 'wereld-vlucht-art';
  applyWorldArt(kunst, bron);
  applyWorldTheme(kunst, bron);
  /* De grote tekening is het zwaarste plaatje van de app, en is hij nog niet
     uitgepakt, dan vloog hier een lege doos in de kleur van de wereld -- op een
     tablet zelfs op een snelle processor. Het kleine beeld van het kaartje ís al
     uitgepakt (het staat op Werelden), dus dat ligt er nu onder: er vliegt altijd
     iets echts, en de scherpe versie neemt het over zodra hij er is. Geen extra
     bestand: zonder kaartjesbeeld (de studio, een wereld zonder -klein) blijft
     het gewoon de grote. */
  const klein = wereldKleinPad(bron.art);
  if (klein) kunst.style.setProperty('--w-art', `url("${bron.art}"), url("${klein}")`);
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
  /* Op een breed scherm staat de kaart als podium in het midden, met de wereld
     onscherp eromheen (zie #screen-map::after). Die rand vloeit mee met de vlucht:
     hij doft weg terwijl de tekening naar haar kaartje krimpt, en komt op terwijl
     ze terug uitgroeit. Hij knipte eerst bij het vertrek naar de nachtlucht van
     Werelden, en stond op de terugweg pas ná de landing weer op -- met een fel
     beeldje ertussen. Eén laag onder de vliegende tekening, zelfde duur. */
  const doek = wereldDoek('vlucht-doek' + (hoog ? ' hoog' : ''), bron);
  if (doek) {
    $('app').appendChild(doek);
    doek.animate(hoog ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }],
      { duration: VLUCHT.duur, easing: 'linear', fill: 'forwards' });
  }
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
  vluchtOp = { laag, doek, op,
    timer: setTimeout(vluchtKlaar, VLUCHT.duur + VLUCHT.kruis + MOTION.vangnet),
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
/* De camera duwt mee. De tekening die vliegt is één ding; de reis eromheen hoort
   mee te bewegen alsof er een camera in- of uitzoomt. Hier deed hij dat niet: bij
   het inzoomen doofden de route en de andere werelden ter plekke weg in 90ms, en
   daarna groeide de tekening een tiende seconde lang op een lege nachtlucht. Bij
   het uitzoomen kwamen ze op hun plek op in plaats van in beeld te schuiven.

   De buren schuiven naar buiten, het beeld uit, of komen van daar binnen --
   precies waar een camera ze zou laten, want elk kaartje verschuift met
   (schaal - 1) maal zijn afstand tot het kaartje dat vliegt. Alleen de route
   (één svg) schaalt echt mee, zodat hij aan de kaartjes vast blijft zitten.

   Waarom zo en niet de hele baan schalen: dat stond er eerst, en het haperde.
   Een laag die schaalt wordt op elk beeldje opnieuw opgemeten en, op de grootste
   schaal die hij haalt, opnieuw getekend -- en de baan is alle werelden met al
   hun tekeningen, honderden pixels langer dan het scherm. Gemeten op een vier
   keer gesmoorde processor: zo'n 170ms extra werk op de hoofddraad per zoom, en
   twee gemiste beeldjes meer dan zonder camera. Kaartjes die alleen verschuiven
   worden niet opnieuw getekend; nu kost de camera evenveel beeldjes als geen
   camera.

     van, naar   de schaal aan het begin en het eind (1 = gewoon)
     punt        het midden van het kaartje, in vensterpixels

   Alleen kaartjes in de buurt van het venster bewegen (een half scherm erbuiten
   is ruim: verder weg komt er geen in beeld). Gemeten wordt er één keer, vóór de
   eerste beweging. Geeft een opruimer terug -- of null als er niets te doen viel. */
function reisCamera(punt, van, naar) {
  const track = $('reis-track'), scherm = $('screen-journey');
  if (!track || !track.animate || !punt || !(van > 0) || !(naar > 0)) return null;
  const s = scherm.getBoundingClientRect();
  const rand = s.height * 0.5;
  const anims = [];
  const tijd = { duration: VLUCHT.duur, easing: VLUCHT.baan, fill: 'forwards' };
  /* Een kaartje staat al op translate(-50%, 50%) -- zo hangt hij met zijn hart op
     de route (zie .reis-halte). Een animatie vervangt die transform, dus hij
     herhaalt hem vóór zijn eigen verschuiving; anders springt elk kaartje een half
     kaartje opzij zodra de camera begint. */
  const stand = (k, dx, dy) => 'translate(-50%, 50%)'
    + (k === 1 ? '' : ` translate(${(dx * (k - 1)).toFixed(1)}px, ${(dy * (k - 1)).toFixed(1)}px)`);
  track.querySelectorAll('.reis-halte:not(.vlucht-doel)').forEach(h => {
    const r = h.getBoundingClientRect();
    if (r.bottom < s.top - rand || r.top > s.bottom + rand) return;
    const dx = r.left + r.width / 2 - punt.x, dy = r.top + r.height / 2 - punt.y;
    anims.push(h.animate([{ transform: stand(van, dx, dy) }, { transform: stand(naar, dx, dy) }], tijd));
  });
  const weg = track.querySelector('.reis-pad > svg');
  if (weg) {
    const r = weg.getBoundingClientRect();
    weg.style.transformOrigin = (punt.x - r.left).toFixed(1) + 'px ' + (punt.y - r.top).toFixed(1) + 'px';
    anims.push(weg.animate(
      [{ transform: `scale(${van.toFixed(4)})` }, { transform: `scale(${naar.toFixed(4)})` }], tijd));
  }
  return () => { anims.forEach(a => a.cancel()); if (weg) weg.style.transformOrigin = ''; };
}
/* Hoeveel groter de wereld is dan zijn kaartje -- de schaal waarmee de camera
   duwt. Op de breedte gemeten, en begrensd op REIS_CAMERA_MAX. Op een telefoon is
   het kaartje ruim de helft van de breedte, dus bij 1,8 staan de buren al buiten
   beeld; wat er nog over is, dooft in het laatste stuk weg. Op een tablet zou de
   volle schaal boven de 3 uitkomen, en dan vliegen de buren met een ruk weg -- en
   de route, die wél schaalt, wordt getekend op de grootste maat die hij haalt. */
const REIS_CAMERA_MAX = 1.8;
function reisCameraSchaal(kaartje, wereld) {
  if (!kaartje || !wereld || !kaartje.clip.w) return 1;
  return Math.max(1, Math.min(REIS_CAMERA_MAX, wereld.clip.w / kaartje.clip.w));
}
/* De globe-vlucht in getallen -- zie "EÉN DRAAI" in globeVlucht.
     piek      hoe groot hij halverwege is (1 = zijn eigen maat)
     til       hoeveel pixels hij halverwege omhoog komt: een boogje, geen rechte lijn
     mid       waar dat halverwege ligt, als deel van de tijd
     draaiMid  hoeveel van de draai er dan al op zit -- vlot weg, rustig uitdraaien
     na        hoeveel hij langer duurt dan de vlucht van de tekening
     op        de curve van het loskomen; de landing is MOTION.plop */
const GLOBE = { piek: 1.25, til: 8, mid: .55, draaiMid: .7, na: 60,
                op: 'cubic-bezier(.3, 0, .4, 1)' };
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
  /* EÉN DRAAI. Hij schoof eerst alleen: op een telefoon zo'n 20px opzij op
     dezelfde maat (de pil staat net links van het midden, en beide globes zijn
     ~24px), en dat las niet als een vlucht maar als een globe die bleef liggen
     terwijl de rest wisselde. Nu komt hij even los (GLOBE.piek), draait hij één
     keer rond -- "de hele wereld", zonder woorden -- en landt hij met de ene plop
     van de app. Terug draait hij de andere kant op: dezelfde beweging, achteruit.

     Eén animatie, alleen transform, op een los teken boven alles: de compositor
     doet het hele werk en de hoofddraad merkt er niets van, ook niet als die
     intussen Werelden of de kaart aan het opbouwen is. Geen filter, geen schaduw
     op de kopie: dat zou hem per beeldje opnieuw laten tekenen.

     Iets langer dan de vlucht van de tekening (GLOBE.na): de landing valt net ná
     die van het kaartje, zodat de kop het laatste is dat tot rust komt. */
  const heen = !!naarEl.closest('#screen-journey');
  const draai = heen ? -360 : 360;
  const midden = `translate(${(dx * GLOBE.mid).toFixed(1)}px, ${(dy * GLOBE.mid - GLOBE.til).toFixed(1)}px) `
    + `scale(${GLOBE.piek}) rotate(${Math.round(draai * GLOBE.draaiMid)}deg)`;
  const eind = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(3)}) rotate(${draai}deg)`;
  const tijd = duur + GLOBE.na;
  const an = vlieg.animate([
    { transform: 'none', easing: GLOBE.op },
    { offset: GLOBE.mid, transform: midden, easing: MOTION.plop },
    { transform: eind }], { duration: tijd, fill: 'forwards' });
  an.onfinish = weg;
  setTimeout(weg, tijd + MOTION.vangnet);
  // hij vliegt mee met de wereldvlucht, en gaat dus ook mee weg als die afbreekt
  if (vluchtOp) vluchtOp.globe = weg;
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
  const klaar = eindigOvergang(null, MOTION.totaal + HALTE_JA, () => {
    spel.style.transformOrigin = '';       // .komt-op blijft tot de volgende show()
    spel.style.pointerEvents = '';
  });
  const punt = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  tapRipple(punt.x, punt.y);               // 1 -- dezelfde tikreactie als elders in de app
  /* en de halte zelf zegt "ja, deze": één korte plop, vóór de kaart begint te
     duiken. Dat "vóór" stond er al, maar ze begonnen in hetzelfde beeldje: de
     kaart was na 110ms vrijwel weg en de plop van 240ms dan nog niet op de helft
     -- je zag hem niet. Nu is de plop kort en heeft hij HALTE_JA voor zichzelf;
     pas daarna gaat de rest. 80ms is genoeg om hem te zien en te kort om op te
     wachten. */
  const dot = stopEl.querySelector('.dot');
  if (dot && dot.animate) dot.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.24)', offset: .55 }, { transform: 'scale(1.08)' }],
    { duration: 150, easing: MOTION.plop, fill: 'forwards' });
  setTimeout(() => duikIn(lvl, kaart, spel, punt, klaar), HALTE_JA);
}
const HALTE_JA = 80;
function duikIn(lvl, kaart, spel, punt, klaar) {
  /* De halte zei "ja" HALTE_JA geleden, en in dat stukje kan er nog een tik of een
     terugdruk tussen zijn gekomen: een tabblad, de pil, de terugknop van het
     toestel. Dan is dát het laatste wat het kind wilde, en duikt de kaart niet
     alsnog de zaal in. Hier ging de show gewoon door: de kleedkamer flitste even
     op en de zaal kwam eroverheen -- of, na terug naar de sterrenkeuze, viel
     startLevel om omdat er geen ster meer was. */
  if (!cur || !kaart.classList.contains('active')) { klaar(); return; }
  /* Het draaipunt van de zaal is dat van de kaart. Beide schermen vullen hetzelfde
     vak (nagemeten staand, liggend, telefoon en tablet), dus komt er hetzelfde
     getal uit -- maar de kaart staat er al opgemaakt, en de zaal die startLevel
     zojuist bouwde nog niet. Hem daar meten liet de browser het hele spelscherm
     opmaken midden in de tik (6x geremd: zo'n 200 ms), en dat was het haperen
     aan het begin van de duik. */
  const oorsprong = oorsprongPct(kaart, punt);
  schermWeg(kaart, true, punt);            // 2 -- de hele kaart, om het aangetikte punt

  /* 3 -- het spel staat er nú al, ook al zie je het nog niet.
     startLevel doet zijn volle werk in dezelfde beurt als de tik; de animatie
     loopt daar overheen. fill:'backwards' houdt het scherm op opacity 0 zolang de
     vertraging loopt, dus "later beginnen" kost geen enkele keten van timers --
     het is één animatie die gewoon later aan is. Valt de animatie weg, dan staat
     het spel er meteen. De true zegt startLevel dat de overgang hier geregeld
     wordt: zonder die vlag legt hij de stille wissel eroverheen (zie daar). */
  startLevel(lvl, true);
  spel.classList.add('komt-op');
  navMee(true);                            // de balk van de kaart gaat mét de kaart weg
  spel.style.transformOrigin = oorsprong;
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
  /* Een tweede opkomst stapelt niet, en een kaart waar je snel naar terugkomt
     draagt nog de opacity 0 van zijn vertrek (schermWeg) -- die gaan er hier af.
     Uit de lijst van schermAnims en niet met getAnimations(): dat dwong midden
     in de tik de opmaak af, en wel precies op het moment dat show() het scherm
     waar je vandaan kwam al had uitgezet en schermWeg het nog niet weer had
     neergezet. De browser gooide dat scherm dus weg en bouwde het één regel
     later opnieuw op, voor zijn vertrek. Meer dan deze twee zet er niets op
     #screen-map zelf: de wereldcamera en de vlucht bewegen #tour-map en wat erin
     staat. */
  schermAnimsStop(scherm);
  scherm.classList.add('komt-op');
  scherm.style.transformOrigin = punt ? oorsprongPct(scherm, punt) : '50% 50%';
  const a = schermAnim(scherm,
    [{ transform: punt ? 'scale(1.06)' : 'scale(1.03)' }, { transform: 'none' }],
    { duration: MOTION.kom, delay: punt ? MOTION.komNa : 0, easing: MOTION.uit, fill: 'backwards' });
  const op = () => { scherm.style.transformOrigin = ''; };
  a.onfinish = op;
  setTimeout(op, MOTION.totaal + MOTION.vangnet);
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
   de kaart. Deze weet van geen enkel scherm iets.

   Ook de zaal en het eindscherm gebruiken hem, als er niets uit te leggen valt:
   van de zaal naar het eindscherm (dezelfde show, een stap verder), en terug
   naar de zaal met "Opnieuw proberen". Alleen de zaal die uit een aangetikte
   halte groeit heeft een eigen beweging -- zie enterLevel en startLevel. Zo is
   er geen enkel scherm meer dat met een kale show() uit het niets opkomt. */
function schermKomtOp(el) {
  if (!el || !el.animate || motionOff()) return;
  schermAnimsStop(el);   // zie schermAnims: zonder stijl en opmaak af te dwingen
  el.classList.add('komt-op');
  schermAnim(el, [{ transform: 'scale(1.03)' }, { transform: 'none' }],
    { duration: MOTION.kom, easing: MOTION.uit, fill: 'backwards' });
}
/* De twee helften van zo'n wissel. Zonder vorig scherm gebeurt er niets: dat is
   de allereerste aanblik van de app, en die hoort er gewoon te staan (zie
   body.start). */
function hubWissel(van, naar) {
  if (!van || !naar || van === naar) return;
  schermWeg(van, false);
  dressBarMee(van);
  navWissel(van, naar);
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
  setTimeout(op, MOTION.weg + MOTION.vangnet);
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
/* ---- De plakkende kop met twee standen ----
   Twee schermen hebben een kop die krimpt zodra er gescrold wordt: de
   trofeeënkast (zie .gescrold in 65-kast.css; kastScroll zet de klasse), en op
   een laag staand scherm de kleedkamer (kleedScroll; daar krimpt de spiegel).
   Het ouderdeel deed het ook, maar heeft sinds zijn kop op één regel past één
   maat (zie 80-ouderdeel.css): daar wordt bij scrollen alleen de plaat dekkend. Die kop staat in
   de stroom, en daar zat het haperen: als hij kromp trok hij alles eronder mee
   omhoog, de scroll anchoring van Chrome zette de schuifstand met die krimp
   terug, de stand viel onder de drempel, de kop werd weer ruim -- en stilgezet
   op de verkeerde plek ging dat elk beeldje zo door.

   Daarom komt wat de kop krimpt er in de krappe stand als marge onder weer bij
   (--kop-krimp): de plaat wordt kleiner, de plek in de stroom niet, en de inhoud
   staat stil. Dit meet hoeveel dat is.

   Gemeten en niet opgeschreven: de maat hangt af van de schermmaat en van wat
   er in de kop staat. Meten gaat door de klasse even om te zetten, met de
   overgangen uit (.kop-meten, per scherm in het stijlblad) -- anders lees je de
   beginstand van een overgang die nog moet beginnen. Alles in één taak, dus er
   komt geen beeldje tussen waarin iemand de verkeerde stand ziet.

   De hoogte komt uit getComputedStyle en niet uit getBoundingClientRect: die
   laatste rekent een transform mee, en vlak na toonHub komt het scherm nog met
   een schaal van 1,03 binnen (zie schermKomtOp). Zo gemeten kwam er 23,69 uit in
   plaats van 23, en schoof de inhoud alsnog 0,69px. offsetHeight rekent geen
   transform mee maar rondt af op hele pixels; dit is de maat van de opmaak zelf,
   met breuken (border-box, zie de reset).

   Eén bijwerking: loopt er op dat moment net een kopovergang -- een tik vlak na
   het scrollen -- dan springt die naar zijn eindstand. Dat is hooguit één kleine
   sprong, en alleen als je binnen --t-snel na het scrollen tikt.

   Staat het scherm niet in beeld, dan is alles 0 hoog en valt er niets te meten;
   dan blijft de vorige maat staan.

   ONTHOUDEN. De maat hangt af van de schermmaat en van wat er in de kop staat,
   niet van welke lade of welk kind er gekozen is. Toch werd hij bij élke tik op
   een lade opnieuw gemeten, en dat zijn twee volledige opmaakrondes binnen de tik
   -- op een trage tablet het grootste deel van de wachttijd. Wie een `stand`
   meegeeft (wat er in de kop staat, in woorden), krijgt de vorige maat terug zolang
   venster en stand dezelfde zijn. Draaien of een toetsenbord geeft een andere
   vensterhoogte, en dus vanzelf een nieuwe meting. Zonder stand: altijd meten. */
function kopKrimpMeten(scherm, stand) {
  const kop = scherm && scherm.querySelector('.hub-sticky');
  if (!kop) return;
  const sleutel = stand == null ? null : `${venstermaat()}|${stand}`;
  if (sleutel && scherm.dataset.krimpBij === sleutel) return;
  if (!kop.offsetHeight) return;
  const hoogte = () => parseFloat(getComputedStyle(kop).height);
  const wasGescrold = scherm.classList.contains('gescrold');
  scherm.classList.add('kop-meten');
  scherm.classList.remove('gescrold');
  const ruim = hoogte();
  scherm.classList.add('gescrold');
  const krap = hoogte();
  scherm.classList.toggle('gescrold', wasGescrold);
  void kop.offsetHeight;   // de stand vastleggen vóórdat de overgangen terugkomen
  scherm.classList.remove('kop-meten');
  scherm.style.setProperty('--kop-krimp', (ruim - krap) + 'px');
  // een meting zonder stand kan een andere kop gemeten hebben: dan geldt de oude niet meer
  if (sleutel) scherm.dataset.krimpBij = sleutel; else delete scherm.dataset.krimpBij;
}
// Draaien, of een toetsenbord dat opkomt, kan een laag scherm maken -- en dan
// krimpt een kop anders. Een scherm dat niet in beeld staat
// slaat de meting vanzelf over.
// Achter rafKlem: draaien of een toetsenbord dat opkomt vuurt een reeks resizes,
// en kopKrimpMeten meet per scherm een paar keer de opmaak.
addEventListener('resize', () => rafKlem(koppenKrimpMeten));
function koppenKrimpMeten() { ['screen-trophies', 'screen-dress'].forEach(id => kopKrimpMeten($(id))); }
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
  // MOTION.totaal: de landing wacht tot de kaart stilstaat (--kaart-rust, zie .net-af)
  const landt = MOTION.totaal + Math.round((.1 + (st - 1) * STAP + LAND) * 1000);
  setTimeout(cb, landt + 100);   // + een kort stiltetje; de badge die daarna opstijgt is zelf al een pauze
}
// De zin van het eindscherm (of het wereldfeest) hoort niet over de kaart en de
// reis heen door te praten -- net als bij stoppen midden in een show (quitGame).
function goMapNaShow() { sndClick(); cancelSpeech(); goMap(naShowLvl); }

/* ================= De kaart zegt hallo =====================================
   De kaart is het hoofdscherm en de ster woont er, maar ze deed er niets als je
   binnenkwam: ze wiegde al vóór je er was en wiegde daarna door. Dit is het
   enige wat daaraan verandert -- één huppel, als de kaart zélf de aankomst is.
   (Dat was een zwaai: ±6 graden en 8px, en op telefoonmaat las dat als een
   trillinkje en niet als een groet. De huppel is groter en heeft een landing,
   en op die landing antwoordt haar halte met een ring -- zie HUPPEL.)

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
   huppelt ze niet.

   NIET UIT RENDERTOURMAP. Die bouwt de kaart opnieuw op bij elke wereldpijl,
   elke tussenstand van een reis en beide helften van een onthulling -- veel
   vaker dan een kind aankomt. De aanleiding is een navigatie en geen tekening,
   dus hangt dit aan goMap() en aan niets anders.

   DE KOELTIJD, en geen grendel. Een tabbladwissel mag nooit geblokkeerd worden
   (zie goMap) -- een kind dat vastzit op een scherm is erger dan een huppel te
   veel. Dus onthoudt dit alleen wannéér de kaart voor het laatst openging, en
   slaat het over als dat net was. Kaart -> Kleedkamer -> Kaart geeft dus één
   huppel en geen drie, en een echte terugkomst een halve minuut later gewoon
   weer één. Elke aankomst zet die tijd, ook een aankomst die zelf niet huppelt:
   na een reis of een onthulling is er net iets gevierd, en dan hoort de
   kleedkamer-en-terug daarna ook nog even stil te zijn. */
const GROET = {
  koeltijd: 2500,
  // De huppel (zie HUPPEL in 10-feestjes.js) -- geen danspasje, haar "hier ben ik".
  pas: HUPPEL,
  // wanneer haar voeten de halte raken, gerekend vanaf het begin van de huppel
  landt: Math.round(HUPPEL.duur * HUPPEL.landt),
};
/* De halte waar je heen moet antwoordt één keer met een ring (zie .aangekomen).
   Alleen de huidige halte heeft die laag (zie .tour-stop.next .stop-body::after);
   staat er geen -- je kijkt in een wereld die je al uit hebt -- dan gebeurt er
   niets. Hij hoort bij elke keer dat zij op haar halte neerkomt: de huppel
   hieronder, de landing na een vlucht (kaartOpbouw) en de sprong een nieuwe
   wereld in (zijReistMee). */
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
  // Een nieuwe aankomst annuleert altijd een huppel die nog moest beginnen: er is
  // er hoogstens één onderweg, en er blijft dus nooit een tweede timer hangen.
  clearTimeout(groetTimer);
  clearTimeout(pulsTimer);
  groetTimer = pulsTimer = null;
  /* Beperkte beweging: dan gebeurt er hier niets, ook geen klasse die er even
     op en weer af gaat. Een begroeting is karakter en geen bericht -- er valt
     dus niets te vervangen, en de ster staat precies zoals ze anders ook staat
     (zie de bewegingsafspraak bij zetPas). */
  if (!mag || !rustig || motionOff()) return;
  /* Eerst rust, dan zij, dan haar halte. De kaart moet stilstaan voor er iets
     op beweegt: MOTION.totaal is het einde van de schermwissel. Een gloed die
     opkwam terwijl de kaart nog aan het stilvallen was (hij stond ooit op
     MOTION.kom) was geen aankondiging maar ruis.

     De ring valt op het moment dat haar voeten de halte raken (GROET.landt),
     en niet op een eigen klok. Zij is de hoofdrol en gaat eerst; de halte is de
     tweede stem en antwoordt op haar landing -- oorzaak, dan antwoord.

     Hij hangt aan dezelfde poort als de huppel (zie de aanroep onderaan goMap)
     en dus aan dezelfde koeltijd: kom je uit een show, ligt er een reis klaar,
     gaat er een wereld open of koos je er net een op de reis, dan legt díe
     beweging al uit waarom je hier bent. Na een level-up huppelt de ster over de
     route naar de volgende halte -- dát is de aankomst. */
  groetTimer = setTimeout(() => {
    groetTimer = null;
    const map = $('tour-map');
    const el = map && map.querySelector('.tour-hero .avatar-holder');
    /* Ondertussen weggelopen, of de kaart is opnieuw opgebouwd, of de ster staat
       in een wereld waar je niet naar kijkt: dan is er niemand die kan
       huppelen, en gebeurt er gewoon niets. Dit is ook wat ?debug&screen=ouder
       opvangt -- daar opent goMap() de kaart en schuift er meteen een ander
       scherm overheen. */
    if (!el || !el.isConnected || !$('screen-map').classList.contains('active')) return;
    hierBenIk(el);
  }, MOTION.totaal);
}
/* "Hier ben je": zij huppelt, en haar halte ringt op het moment dat haar voeten
   hem raken (GROET.landt). Eén beweging, op één plek, voor de drie momenten die
   dat zeggen: de groet bij aankomst, de 🗺 nog eens op je eigen kaart
   (kaartThuis), en een tik op een halte op slot (slotHalte: "niet daar -- hier").
   Ze stonden eerst los, en liepen meteen uit de pas: op slot ringde de halte al
   bij de tik, dus was de ring weg voor ze landde. Een tik op háár is dit niet --
   dat is zij die jou antwoordt, en daar blijft het bij de huppel (kaartTik).
   Geeft true als ze huppelt; zonder beweging gebeurt er niets, ook geen ring. */
function hierBenIk(el) {
  if (!zetPas(el, GROET.pas)) return false;
  pasUit(el);
  clearTimeout(pulsTimer);
  pulsTimer = setTimeout(() => { pulsTimer = null; haltePuls(); }, GROET.landt);
  return true;
}
/* EN HIJ STOPT ALS JE WEGGAAT. Een huppel hoort bij de kaart; loopt hij door
   terwijl je er al vanaf bent, dan staat er 950ms lang een pop te bewegen op een
   scherm dat niemand ziet. Dat is niet alleen onzin maar ook duur: precies in
   dat raam kan de vlucht naar Werelden beginnen, en die hangt van élk beeldje af
   (zie wereldVlucht -- vijfentwintig vooraf uitgerekende standen die samen één
   beweging moeten zijn). Opgemeten: met een huppel eroverheen stond de tekening
   op het eerste beeldje van de vlucht al 18% op weg, dus die beweging begon
   letterlijk niet bij het begin.

   Vandaar dat show() dit aanroept en niet goMap: weglopen kan langs elke kant --
   de tabbladbalk, de terugknop van het toestel, de wereldpil. */
/* ================= Tik op de ster ==========================================
   Ze reageert als je haar aantikt: één stuiter en het tikklankje. Het is een
   antwoord en verder niets -- geen level, geen beloning, geen navigatie. Speel
   je, dan tik je nog steeds de halte eronder aan, want dat is de enige knop.

   HET RAAKVLAK is alleen haar silhouet (zie .tour-hero in het stijlblad), en
   het raakvlak van de halte ligt eroverheen waar ze elkaar raken. Een tik die
   een halte bedoelt, pakt zij dus nooit af.

   DEZELFDE HUPPEL, ZONDER RING (oktober 2026). Hier stond eerst de stuiter uit
   MOVES, met de redenering dat de groet niets meer betekent als ze bij elke tik
   huppelt. Maar dan had ze op de kaart twee sprongen voor hetzelfde "hier ben
   ik", en de stuiter was de grovere van de twee (900ms, zonder landing). Wat de
   groet nu eigen maakt is niet de sprong maar wat erbij hoort: hij komt vanzelf,
   en haar halte antwoordt met een ring. Een tik is jij die iets vraagt en zij
   die met dezelfde huppel antwoordt -- haltePuls wordt hier dus niet geroepen.

   WANNEER NIET. Alleen als ze stilstaat op de halte die nu aan de beurt is
   (.next). Op een reis draagt ze die klasse niet, want dan is er geen "hier
   spelen" (zie renderTourMap). Ze doet ook niets tijdens een overgang, een
   wereldvlucht of een wereldreis, en niet als ze al een pasje doet: een
   tweede tik mag geen tweede pasje beginnen. Bij beperkte beweging hoor je
   alleen het klankje, net als bij tapDance.

   Wacht de groet nog, dan vervalt die: ze heeft haar kind al gezien. De
   haltepuls blijft staan, want die wijst de weg en is geen groet. */
/* Het pasje gaat eraf op zijn eigen klok (pasUit, op animationend), niet op een
   timer. Toen de tik nog een stuiter was, knipte de groetklok hem af terwijl ze
   nog ingedeukt stond -- ze klikte dan in één beeldje recht, een schokje net na
   de sprong. test/profiles.test.js meet dat de huppel helemaal uitspeelt. */
const TIK_PAS = HUPPEL;
function kaartTik(ster, halte) {
  const el = ster.querySelector('.avatar-holder');
  if (!el || el.classList.contains('dancing') || !halte.classList.contains('next')) return;
  if (overgangBezig || vluchtOp || wereldReisOp || ster.getAnimations().length) return;
  clearTimeout(groetTimer);
  groetTimer = null;
  sndTap();
  if (zetPas(el, TIK_PAS)) pasUit(el);
}

/* ================= Kaart op de kaart =======================================
   Sta je al op je eigen kaart en tik je 🗺️ nog eens, dan bouwt de kaart zich
   niet opnieuw op. Dat deed hij eerst (goMap), en dan speelde alles wat "één
   keer als de kaart opengaat" hoort opnieuw: de lege sterren knipoogden weer,
   haar wiegen begon van voren af aan, en op een tablet sprong de kaart in één
   klap terug naar haar halte. Het is het gewone "tik op het tabblad waar je al
   bent = terug naar het begin": de kaart glijdt terug naar haar halte, en daar
   huppelt zij -- dezelfde huppel als haar groet en als een tik op haar, haar
   "hier ben ik". Eerst de kaart, dan zij: er beweegt één ding tegelijk.

   Staat ze al in beeld, dan huppelt ze meteen. Huppelt ze nog, dan maakt ze die
   huppel af en begint er geen tweede (zie dance: een nieuw pasje halverwege een
   sprong klikt haar terug naar de grond). Bij beperkte beweging springt de kaart
   terug zonder glijden, en huppelt er niemand.

   Werelden gaat hier nooit open -- dat is een andere vraag, met een eigen knop
   (de 🌍). De wachttijd hangt aan groetTimer, zodat kaartGroetStop hem
   meeneemt als je weggaat voordat ze kon huppelen. */
let thuisNr = 0;
const THUIS_GLIJ = 800;
function kaartThuis() {
  const map = $('tour-map');
  if (!map || overgangBezig || vluchtOp || wereldReisOp) return;
  clearTimeout(groetTimer);
  groetTimer = null;
  const nr = ++thuisNr;
  let gedaan = false;     // scrollend en de vangtimer: wie het eerst komt
  const huppel = () => {
    if (gedaan || nr !== thuisNr || !$('screen-map').classList.contains('active')) return;
    gedaan = true;
    clearTimeout(groetTimer);
    groetTimer = null;
    const el = map.querySelector('.tour-hero .avatar-holder');
    if (!el || !el.isConnected || el.classList.contains('dancing')) return;
    hierBenIk(el);   // dezelfde "hier ben je" als de groet: huppel, dan de ring
  };
  // dezelfde halte als waar de kaart bij het openen op uitkomt (zie kaartHierDoel)
  const hier = kaartHierDoel(map);
  const doel = hier == null ? map.scrollTop : hier;
  if (Math.abs(doel - map.scrollTop) < 4) { huppel(); return; }
  if (motionOff() || !map.scrollTo) { map.scrollTop = doel; return; }
  map.scrollTo({ top: doel, behavior: 'smooth' });
  /* Huppelen als de kaart stilstaat: scrollend waar de browser dat kent, en
     anders (of als hij uitblijft) na de langste glijtijd van een browser. */
  map.addEventListener('scrollend', huppel, { once: true });
  groetTimer = setTimeout(huppel, THUIS_GLIJ);
}

function kaartGroetStop() {
  clearTimeout(groetTimer);
  clearTimeout(pulsTimer);
  groetTimer = pulsTimer = null;
  const map = $('tour-map');
  const el = map && map.querySelector('.tour-hero .avatar-holder.dancing');
  if (!el) return;
  /* Stilzetten, niet weghalen. Het pasje eraf halen zette haar midden in een
     huppel in één beeldje terug op de grond, en dat zag je: tik je op de halte
     terwijl ze nog huppelt, dan staat de kaart nog een beeldje of tien in beeld
     (de plop van de halte, dan het wegduiken). Gepauzeerd blijft ze hangen waar
     ze was en gaat ze zo met de kaart mee weg -- en een gepauzeerde animatie kost
     per beeldje niets, dus de vlucht hierboven heeft er net zo weinig last van.
     Is het scherm weg, dan gaat het pasje er alsnog af; staat ze dan al in een
     nieuw pasje (je kwam meteen terug), dan blijft dat staan. */
  /* Met subtree, zodat haar schaduw (.tour-hero::after, schaduwHuppel) mee
     stilstaat: anders landt de schaduw terwijl zij nog in de lucht hangt. */
  const zij = el.closest('.tour-hero') || el;
  const loopt = zij.getAnimations({ subtree: true }).filter(a => a.playState === 'running');
  if (!loopt.length) { stilStaan(el); return; }
  pasLos(el);
  loopt.forEach(a => a.pause());
  setTimeout(() => { if (loopt.every(a => a.playState === 'paused')) stilStaan(el); }, MOTION.totaal);
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
  zetWensPil(p);
  $('map-tournee-label').classList.remove('bezig');   // zie pilTik
  $('map-portrait').innerHTML = avatarSVG(p, 80);
  // Memory-knop: alleen voor een telkind met het memory-spel aan (zie memoryAan)
  const memOn = memoryAan(p);
  $('mem-fab').style.display = memOn ? 'flex' : 'none';
  if (memOn) $('mem-fab-pay').textContent = memPayout(p);
  const o = kaartOpdracht(p, vanLvl, uitShow);
  const travel = o.travel, gekozen = o.gekozen, thuis = o.thuis, onthul = o.onthul;
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
  kaartVertrek(vorige, gekozen, uitShow);
  /* Pas hierna, en niet in een requestAnimationFrame: renderTourMap kon zijn
     eigen afrondende werk (scrollstand, --kop-h/--nav-h, kaartTerugZoom) niet
     synchroon doen, want toen het draaide stond het scherm nog niet .active en
     leverde elke meting 0 op. Nu, een paar regels later in dezelfde taak, wél
     -- en dat is nog steeds vóór de browser iets van dit beeldje verft.

     Hier stond een waarschuwing dat deze regel ná kaartVertrek moest blijven,
     omdat die twee dezelfde vlag kaartFocus lazen en tourMapVoltooi hem
     verbruikt. kaartVertrek krijgt nu uitShow mee in plaats van de vlag te
     lezen, dus die afhankelijkheid is weg. Vóór de eerste verf moet het nog
     steeds; dat is de reden voor de plek, niet de volgorde met kaartVertrek. */
  if (tourMapVoltooi) { const v = tourMapVoltooi; tourMapVoltooi = null; v(); }
  if (travel) requestAnimationFrame(() => runTravel(travel));
  else if (onthul) requestAnimationFrame(() => runWorldReveal(onthul));
  /* En dan pas: is de kaart zélf de aankomst? Alle vier de uitzonderingen staan
     hierboven al uitgerekend, dus de regel is hier één regel lang. De laatste
     voorwaarde vangt "nog eens op Kaart tikken terwijl je er al staat": dat is
     geen aankomst. Zie de hele redenering bij kaartGroet. */
  kaartGroet(!uitShow && !travel && !onthul && gekozen == null && vorige !== $('screen-map'));
}
/* Wat moet déze kaart doen?

   Vier opdrachten liggen klaar als briefje, en dit is de enige plek die ze
   opmaakt: gelezen, meteen op null, en verder werken met de kopie. Wat eruit
   komt zegt precies één ding -- welke wereld er in beeld komt en wat er daarna
   nog moet gebeuren -- en verandert verder niets aan het scherm.

   Stond hier eerder als zeventig regels midden in goMap. Ze horen bij elkaar
   (alle vier gaan ze over dezelfde vraag) en ze horen niet bij de rest (die
   gaat over tekenen en bewegen), dus staan ze nu apart. Er is geen regel aan
   veranderd; wel is nu in één oogopslag te zien dat de vier elkaar uitsluiten.

   netAf wordt hier soms gewist en niet gezet -- goMap zet hem vlak hiervoor, en
   alleen de reis-binnen-een-wereld neemt hem weer weg. Zie de uitleg daar. */
function kaartOpdracht(p, vanLvl, uitShow) {
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
  return { travel: travel, gekozen: gekozen, thuis: thuis, onthul: onthul };
}
/* Het scherm waar je vandaan komt, en hoe het vertrekt.

   Twee takken die elkaar uitsluiten: terug uit een show (de zaal wijkt, en de
   terug-grendel gaat dicht) of een gewone wissel (de kaart komt ondoorzichtig
   op en het vorige scherm dooft). Een reis heeft geen van beide nodig --
   reisNaarWereld beweegt de kaart zelf.

   uitShow komt van goMap, en het is dezelfde vraag als "is er een halte om
   naartoe te zoomen" (goMap zet kaartFocus precies dan). Hier stond eerst
   kaartFocus zelf, en die wordt door tourMapVoltooi verbruikt -- dan hing het
   ervan af welke van de twee eerst in goMap stond. Met een argument niet. */
function kaartVertrek(vorige, gekozen, uitShow) {
  // de zaal wijkt terug en laat de kaart zien -- alleen als we ook echt uit een
  // show komen (anders is dit een gewone tabbladwissel en hoort er niets te wijken)
  /* De balk wordt hier meegenomen en niet in kaartTerugZoom: die draait pas in de
     rAF van renderTourMap, één beeldje later, en show() heeft de balk dan al een
     keer volledig zichtbaar over de nog vertrekkende zaal getekend. Eén beeldje,
     maar wel precies het beeld dat deze hele wijziging moet wegnemen. */
  if (uitShow && vorige && vorige !== $('screen-map')) {
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
    navWissel(vorige, $('screen-map'));   // van de sterrenkeuze of het memoryspel: de balk komt mee op
  }
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
    sndWereld();   // een wereld die opengaat, niet de kassa -- zie de SFX-tabel
    confetti(26);
    showPraise(`${naar.world.icon} ${naar.world.name}`, null, true);   // blauw: hier ben je
  };
  if (motionOff()) { plaats(); vier(); return; }
  /* Eerst even de oude wereld, dán de klim. De camera vertrok in dezelfde beurt
     als de kaart binnenkwam, dus terwijl het vorige scherm nog wegging: de wereld
     waar je vandaan kwam heb je dan nooit gezien, en "er komt een nieuwe bij"
     leest als "de kaart laadt". Zelfde opbouw als runWorldChange: wordt het
     intussen afgebroken, dan staat de nieuwe wereld er gewoon. */
  let timer = 0;
  const wachten = () => { clearTimeout(timer); if (cur) plaats(); };
  wereldReisOp = wachten;
  const beeld = wereldBeeldKlaar(naar);
  timer = setTimeout(() => beeld.then(() => {
    if (wereldReisOp !== wachten) return;
    wereldReisOp = null;
    const mee = zijReistMee(plaats, vier);
    wereldCamera(1, mee.teken, { duur: WERELDREIS.onthul, easing: WERELDREIS.traag, zoom: true, klaar: mee.klaar });
  }), MOTION.totaal + ONTHUL_STIL);
}
const ONTHUL_STIL = 400;   // na het binnenkomen van de kaart, vóór de camera klimt
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
     focus  wélk stuk je dan ziet. Staat er niets, dan is dat de halte van déze
            show: de plek die het kind net op de kaart aantikte komt boven haar
            hoofd te staan (zie applyVenue). Zo is elke show een andere plek, en
            klimt het decor met de wereld mee tot de laatste show, die op het grote
            podium bovenaan de kaart uitkomt. Daarvóór stond hier voor élke show
            dat grote podium, en was de finale dus al vanaf show 1 verbruikt.
            Een wereld die focus wél opgeeft ('x% y%', een punt in de tekening)
            krijgt bij elke show dat ene punt -- dat is voor een eigen
            zaaltekening.
     blur   hoeveel onscherpte eroverheen. Net genoeg dat de felste plekjes van
            de tekening (lampjes, sterren) niet meer met haar hoofd concurreren;
            de plek zelf moet herkenbaar blijven. Stond lang op 11, en dan was het
            geen plek meer maar een kleurvlek.
     dim    hoe donker. De Snoep- en IJswereld zijn bijna wit getekend en zouden
            zonder dit met de somkaart gaan concurreren; de Toverwereld is al
            donker en mag juist iets lichter.
     op     de dekking van de tekening.

   Wordt hier ooit een echte zaaltekening ingehangen, dan hoort zoom op ~100,
   focus op '50% 50%', blur op 0-4, dim en op op 1 -- verder verandert er niets.
   Die tekening is dan in hetzelfde staande formaat als een kaart (ART_W x ART_H):
   de laag rekent met die verhouding.

   Waarom dit een terugval is en geen zes kopieën: dedicated zaaltekeningen komen
   er later. Wat hier staat moet het tot dan toe fatsoenlijk doen én in één regel
   te vervangen zijn. Zes handmatig afgestelde uitsnedes zouden straks zes keer
   weggegooid worden. */
const VENUE_TERUGVAL = { art: null, zoom: 220, focus: null, blur: 2.5, dim: .66, op: 1 };
// Altijd een verse samenvoeging en nooit VENUE_TERUGVAL zelf: die is de bron voor
// élke wereld, en één aanroeper die er per ongeluk iets in zet, zet het overal in.
function venueFor(world) {
  return Object.assign({}, VENUE_TERUGVAL, (world && world.venue) || null);
}
function venueArt(world) {
  const v = venueFor(world);
  return v.art || (world && world.art) || '';
}
/* Welk punt van de tekening boven haar hoofd komt, in procenten van de tekening.
   Zonder eigen focus: de halte van deze show, uit dezelfde lijst waar de kaart
   hem tekent (worldNodes). Zonder level: de laatste halte, het grote podium. */
function venuePunt(v, world, lvl) {
  const m = /^\s*(-?[\d.]+)%\s+(-?[\d.]+)%\s*$/.exec(v.focus || '');
  if (m) return { x: +m[1], y: +m[2] };
  if (!world) return { x: 50, y: 20 };
  const nr = lvl ? worldFor(lvl).nr : world.levels;
  const n = worldNodes({ world, levels: world.levels })[nr - 1] || { x: 50, y: 20 };
  return { x: Math.round(n.x * 10) / 10, y: Math.round(n.y * 10) / 10 };
}
/* Zet de zaal op een scherm. Eén injectiepunt voor álle zaaldecor -- de
   spelscherm-kop, het podium onder de ster en het eindscherm lezen daarna alleen
   nog var(--venue-*) en var(--w-*), en weten dus niet in wélke wereld ze staan.

   De klasse gaat er altijd op, ook als er geen enkele tekening is (een wereld uit
   de wereldstudio, of een wereld waarvan de tekening nog niet af is). Dan draagt
   .venue-sfeer de zaal in zijn eentje op de wereldkleuren, en dat is nog steeds
   een zaal -- geen tekening is niet hetzelfde als geen plek. Vandaar dat deze
   functie niets meer teruggeeft: er valt niets meer te beslissen. */
function applyVenue(el, world, lvl) {
  const v = venueFor(world);
  const src = venueArt(world);
  const punt = venuePunt(v, world, lvl);
  el.classList.add('venue-aan');
  applyWorldTheme(el, world);   // nooit de kleuren van de vórige wereld
  el.style.setProperty('--venue-art', src ? `url("${src}")` : 'none');
  el.style.setProperty('--venue-x', String(punt.x));
  el.style.setProperty('--venue-y', String(punt.y));
  el.style.setProperty('--venue-zoom', String(v.zoom));
  el.style.setProperty('--venue-blur', v.blur + 'px');
  el.style.setProperty('--venue-dim', String(v.dim));
  el.style.setProperty('--venue-op', String(v.op));
}
