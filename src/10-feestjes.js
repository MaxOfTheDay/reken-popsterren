/* ================= De gedeelde feestjes =====================================
   Wat élk scherm mag gebruiken om te zeggen dat er iets gebeurd is. Geen
   spelregels, geen voortgang, geen scherm dat het bezit -- alleen de taal
   waarin de app reageert.

   Dit stond in de sectie "Spel", en dat was een ongeluk van plaatsing en geen
   keuze: motionOff wordt zevenentwintig keer buiten het spel aangeroepen,
   showToast en hideToast samen zevenentwintig, confetti vier. De kleedkamer, de
   kast, de reis en het ouderdeel hingen dus allemaal aan "het spel", terwijl ze
   in werkelijkheid aan dit lijstje hangen.

     de poort      motionOff  -- wie minder beweging wil, krijgt de mededeling
                   zonder de versiering. Alles hieronder vraagt het eerst.
     vragen        showConfirm / showNotice / closeConfirmModal
     zeggen        showPraise, showToast / hideToast
     dansen        MOVES, pasLaag, zetPas, stilStaan, dance, tapDance,
                   finaleDance
     vonken        sparkle / sparkleAt, confetti, confettiBurst, tapRipple

   WAAROM DIT STUK VÓÓR HET SPEL STAAT EN NIET ERNA. MOVE_CLASSES is een const,
   en stilStaan leest hem. Dat laatste gebeurt al bij het opstarten: landingLeeft
   roept landingStil aan en die zet elke pop stil. Stond dit blok achter de app,
   dan viel die aanroep in de dode zone van de const en kreeg een kind een lege
   pagina -- alleen als er al sterren zijn, dus niet op een verse installatie en
   niet in de keuring, die met een nagebootst scherm draait waar geen pop in
   zit. Precies het soort fout dat pas op iemands tablet omvalt.

   Daarom is de volgorde hier geen smaak maar een voorwaarde, en daarom staat
   het --vh-lock-scriptje sinds deze stap in zijn eigen bestand: dat hóórt als
   eerste te draaien, en dat is nu een eigenschap van de bestandsnamen in plaats
   van een afspraak in een opmerking.
   ========================================================================= */


/* Generieke mededeling/bevestiging in de eigen stijl van de app -- vervangt de
   systeem-confirm()/alert() die verder nergens in de app voorkomen en er (vooral
   rond het definitief wissen van voortgang) als een foutmelding uitzien i.p.v.
   een vraag van de app zelf. */
/* DICHT, MET EEN SCHILD. Een venster verdween in één beeldje (display: none),
   en dan landde de tweede tik van een dubbeltik op wat eronder lag: "Sluiten"
   twee keer in het vel van Als app opende "Wat is Rekensterren?" en verliet de
   app, en "Stoppen" twee keer kon op de kaart al een halte raken. Elk venster
   gaat daarom hierlangs dicht: het is meteen weg, maar de doorzichtige achtergrond
   blijft MODAL_SCHILD ms liggen en vangt die tweede tik (.schild in
   80-ouderdeel). Een venster dat intussen weer opengaat heeft er geen last
   van: .open wint. Sluit dus nooit met classList.remove('open') -- inhoud
   zaak P kijkt dat na. Geeft false als het venster al dicht was. */
const MODAL_SCHILD = 350;
function modalDicht(id) {
  const m = $(id);
  if (!m.classList.contains('open')) return false;
  m.classList.remove('open');
  m.classList.add('schild');
  clearTimeout(m._schild);
  m._schild = setTimeout(() => m.classList.remove('schild'), MODAL_SCHILD);
  syncBackGuard();
  return true;
}
function closeConfirmModal() { modalDicht('confirm-modal'); }
function showConfirm(title, body, confirmLabel, onConfirm) {
  $('confirm-title').textContent = title;
  $('confirm-body').textContent = body;
  $('confirm-actions').innerHTML =
    `<button class="btn" id="confirm-no">Nee, terug</button>
     <button class="danger-btn" id="confirm-yes">${confirmLabel}</button>`;
  $('confirm-no').onclick = closeConfirmModal;
  $('confirm-yes').onclick = () => { closeConfirmModal(); onConfirm(); };
  $('confirm-modal').classList.add('open');
  syncBackGuard();
}
// knop en doe: een eigen knop in plaats van "Oké", die eerst sluit en dan doe() doet
function showNotice(title, body, knop, doe) {
  $('confirm-title').textContent = title;
  $('confirm-body').textContent = body;
  $('confirm-actions').innerHTML = `<button class="btn" id="confirm-ok"></button>`;
  $('confirm-ok').textContent = knop || 'Oké';
  $('confirm-ok').onclick = () => { closeConfirmModal(); if (doe) doe(); };
  $('confirm-modal').classList.add('open');
  syncBackGuard();
}
// Danspasjes: elk juist antwoord voegt een pasje toe aan de show van de avatar
const MOVES = [
  { cls: 'move-jump',   label: '🦘 Sprong!' },
  { cls: 'move-spin',   label: '💫 Pirouette!' },
  { cls: 'move-sway',   label: '💃 Heupwiegen!' },
  { cls: 'move-kick',   label: '🕺 Zijpasje!' },
  { cls: 'move-wave',   label: '👋 Golf!' },
  { cls: 'move-bounce', label: '⭐ Stuiter!' },
  // op de tenen, hoofd achterover, mond open -- en er stijgen noten op (zie .move-noot)
  { cls: 'move-noot',   label: '🎵 Hoge noot!' },
];
/* De buiging staat met opzet níét in MOVES: die zit in de gewone rotatie van
   dance() en finaleDance(), en dan zou ze na elk goed antwoord kunnen komen.
   Een buiging betekent één ding -- het publiek klapt extra hard, en zij buigt
   (zie het applaus in submitAnswer). Ze moet wel in MOVE_CLASSES, anders ruimen zetPas en
   stilStaan haar niet op. */
const BUIGING = { cls: 'move-buig', label: '🙇 Buiging!' };
/* De huppel staat er om dezelfde reden niet in: hij is geen danspasje maar haar
   "hier ben ik" op de kaart (zie GROET in "= De kaart zegt hallo"). Eén keer
   door de knieën, omhoog, en neerkomen met een kleine plof -- waarna haar halte
   antwoordt met een ring (zie .aangekomen). landt is het moment, als deel van de
   duur, waarop haar voeten de halte raken: de @keyframes mvHuppel zet de landing
   op diezelfde 62%, en de ring wacht daarop. */
const HUPPEL = { cls: 'move-huppel', duur: 660, landt: .62 };
document.documentElement.style.setProperty('--t-huppel', HUPPEL.duur + 'ms');
const MOVE_CLASSES = MOVES.map(m => m.cls).concat(BUIGING.cls, HUPPEL.cls);
/* Het laagje waar een danspasje op draait. Alleen de vier poppen die ook echt
   dansen krijgen het; de rest (de sterrenkeuze, het kaartje op de reis, het
   maakformulier) heeft niets om erop te zetten. Zie de CSS bij de danspasjes
   voor waarom het pasje niet op de tekening zelf staat.

   HUISDIER EN INSTRUMENT DANSEN NIET MEE. Ze stonden in dezelfde tekening en
   sprongen, wiegden en draaiden dus met haar mee -- in de pirouette werden een
   eenhoorn en een gitaar een dun streepje. Ze staan op het podium, dus blijven
   ze daar: avatarSVG zet ze in een eigen groep (.av-props), en die gaat hier
   naar een tweede svg ernaast, met hetzelfde kader en dus op precies dezelfde
   plek. Die laag staat ná de pas-laag (zetPas en popKleren rekenen erop dat de
   pas-laag het eerste kind is) maar wordt erachter getekend, zoals eerst. */
const PROPS_RE = /<g class="av-props">.*?<\/g>/;
function propLaag(svg) {
  const g = svg.match(PROPS_RE);
  return g ? `<div class="prop-laag">${svg.match(/^<svg[^>]*>/)[0]}${g[0]}</svg></div>` : '';
}
function pasLaag(svg) {
  return `<div class="pas-laag">${svg.replace(PROPS_RE, '')}</div>${propLaag(svg)}`;
}
/* Een pop die al op het scherm staat andere kleren aandoen, zonder haar pasje te
   breken. De hele houder opnieuw vullen gooit ook de pas-laag weg, en een nieuwe
   pas-laag begint zijn animatie van voren af aan: ze klikte dan midden in een
   sprong terug naar de grond. Hier krijgt alleen de tekening ín de laag de
   nieuwe kleren, en het pasje loopt gewoon door.

   DE TEKENING ZELF LEEFT OOK. Het hoofd knikt en de staartjes slingeren
   (.levend.idle), en dat zijn animaties ín de tekening -- een nieuwe tekening
   begint ze dus van nul, terwijl het wiegen op de houder gewoon doorloopt. Dan
   schiet het hoofd een tel uit de maat met het lijf: dat was het sprongetje bij
   elke ladewissel in de kleedkamer. Daarom twee dingen:
   - zelfde kleren, niets doen. paintShop roept dit bij élke tik aan, ook als
     alleen de lade wisselt; de laatste tekening staat op de laag (laag.svg).
   - andere kleren: elke animatie in de nieuwe tekening neemt de klok over van
     dezelfde animatie op hetzelfde onderdeel in de oude. Dat geldt voor het
     knikken, maar net zo goed voor een staartje dat midden in een pasje zwiert.
   Dit is dé manier om een pop die al in beeld staat iets anders aan te doen: wie
   de houder zelf opnieuw vult, laat haar elke keer opnieuw beginnen. Moet de
   houder toch nieuw (het maakformulier bouwt zijn hele paneel opnieuw), neem dan
   de klok mee: animatieKlok vóór, klokTerug ná. test:sterren kijkt het na. */
function popKleren(el, svg) {
  const laag = el.firstElementChild;
  if (laag && laag.classList.contains('pas-laag')) {
    if (laag.svg === kledingSleutel(svg)) return;
    const klok = animatieKlok(el);
    laag.innerHTML = svg.replace(PROPS_RE, '');
    laag.svg = kledingSleutel(svg);
    const oud = laag.nextElementSibling;
    if (oud && oud.classList.contains('prop-laag')) oud.remove();
    laag.insertAdjacentHTML('afterend', propLaag(svg));
    klokTerug(el, klok);
  } else {
    el.innerHTML = pasLaag(svg);
    if (el.firstElementChild) el.firstElementChild.svg = kledingSleutel(svg);   // het nagebootste scherm van de Node-keuring heeft er geen
  }
}
/* Twee tekeningen van dezelfde kleren zijn nooit letterlijk gelijk: avatarSVG
   nummert zijn verlopen en knipvormen (rb12, huid12, ...), zodat twee poppen op
   één scherm elkaars kleur niet lenen. Zonder dat nummer zijn ze het wel. */
function kledingSleutel(svg) { return svg.replace(/(id="|url\(#)([a-z]+)\d+/g, '$1$2'); }
/* Waar elke lopende animatie in de pop nu staat, per naam en onderdeel. Het
   onderdeel is zijn klasse (av-hoofd, av-staart av-staart-l, ...): die is in de
   nieuwe tekening dezelfde, en meer is er niet om ze aan elkaar te herkennen.
   Zonder getAnimations (een oude browser) is er niets te bewaren; dan begint ze
   opnieuw, zoals eerst. */
function animatieKlok(el) {
  const klok = new Map();
  if (!el.getAnimations) return klok;
  el.getAnimations({ subtree: true }).forEach(a => {
    const doel = a.effect && a.effect.target;
    /* Het beginmoment zelf, en niet de animatie: die van een weggehaald onderdeel
       wordt afgebroken en weet daarna niet meer wanneer hij begon. En het
       beginmoment, niet hoe ver hij is: een verse animatie wacht nog op zijn
       eerste beeldje, en een gezette currentTime blijft dan dat beeldje lang
       staan terwijl het lijf al verder wiegt. */
    if (a.animationName && doel && a.startTime != null) klok.set(a.animationName + '|' + doel.getAttribute('class'), a.startTime);
  });
  return klok;
}
/* Een onderdeel dat er eerst niet was (staartjes bij een nieuw kapsel) heeft
   geen eigen klok om over te nemen. Loopt hij eindeloos, dan is hij een deel van
   haar rustbeweging, en die staat op de maat van het wiegen van de houder zelf
   (zie .levend.idle in het stijlblad): dan neemt hij dát beginmoment. */
function klokTerug(el, klok) {
  if (!klok.size) return;
  const wieg = [...klok.entries()].find(([k]) => k.endsWith('|' + el.getAttribute('class')));
  el.getAnimations({ subtree: true }).forEach(a => {
    const doel = a.effect && a.effect.target;
    if (!doel) return;
    let begin = klok.get(a.animationName + '|' + doel.getAttribute('class'));
    if (begin == null && wieg && a.effect.getTiming().iterations === Infinity) begin = wieg[1];
    if (begin != null) a.startTime = begin;
  });
}
/* Een pasje aanzetten -- of, bij beperkte beweging, niet.

   De drie dansers (dance, tapDance, finaleDance) deden alle drie dezelfde twee
   regels: alles eraf, herstart afdwingen, 'dancing' plus het pasje erop. Ze
   staan hier één keer, zodat de uitzondering er ook maar één keer staat.

   Wat een pasje zegt is al gezegd vóórdat hij begint: de klank, de juichtekst,
   de diamanten die bijgeschreven zijn. Het pasje is het karakter eromheen, en
   dat is precies wat prefers-reduced-motion bedoelt met "niet nodig". De pop
   eindigt hoe dan ook in dezelfde stand ('idle', die op zijn beurt al stilstaat
   bij beperkte beweging) -- er blijft dus nooit een halve sprong hangen.

   HET WIEGEN GAAT NIET MEER UIT. Dat deed het wél, en dat was de hele bron van
   het tikje bij het in- en uitzetten: het pasje staat sinds kort op de tekening
   in de pop en het wiegen op de pop zelf (zie de CSS bij de danspasjes), dus ze
   zitten elkaar niet meer in de weg. 'idle' blijft daarom gewoon staan.

   De herstart wordt op de tekening afgedwongen en niet meer op de houder -- daar
   loopt nu de animatie die opnieuw moet beginnen als hetzelfde pasje twee keer
   achter elkaar komt (finaleDance doet dat).

   Terug komt of er iets te wachten valt: false betekent "ze staat al stil". */
function zetPas(el, move) {
  pasLos(el);
  el.classList.remove('dancing', ...MOVE_CLASSES);
  if (motionOff()) return false;
  const pop = el.firstElementChild;
  if (pop) void pop.offsetWidth;
  el.classList.add('dancing', move.cls);
  armVorm(el, move);
  return true;
}
/* De vrije arm vervormt als hij de lucht in gaat (zie ARM_OP in avatarSVG). Dat
   is een SMIL-animatie, en die start niet vanzelf mee met een klasse: hier gaat
   ze aan, op hetzelfde moment als het pasje. Alleen op een .levend pop, en
   alleen bij de pasjes waarin de arm boven de schouder komt.

   ELK PASJE ZIJN EIGEN ARM (zie "Wat er ín haar beweegt" in het stijlblad). Bij
   de golf zwaait hij twee keer boven haar hoofd, bij de sprong schiet hij één
   keer omhoog, bij de stuiter stoot hij op het hoogste punt. Daar hoort per
   pasje een eigen stuk "omhoog", dus staat hier per pasje wanneer de bocht
   omdraait: elke letter is een sleutelmoment, r = rust (hangen), o = omhoog.
   De tijden moeten samenvallen met de @keyframes van dat pasje (armOp, armSprong,
   armStuiter) -- verschuif je daar een tel, verschuif hem hier mee. Een pasje
   dat er niet in staat (pirouette, zijpasje, ...) houdt de arm onder schouder-
   hoogte, dus in zijn gewone bocht. Bij stilstaan gaat ze uit, zodat een
   afgebroken pasje geen arm met de verkeerde bocht laat hangen. */
const ARM_VORM = {
  'move-wave':   { vorm: 'room', keyTimes: '0;.22;.78;1' },
  'move-jump':   { vorm: 'roorr', keyTimes: '0;.24;.42;.55;1' },
  'move-bounce': { vorm: 'rrorr', keyTimes: '0;.22;.45;.66;1' },
};
function armVorm(el, move) {
  const v = el.querySelector && el.querySelector('.av-arm-vorm');
  if (!v || !v.beginElement) return;
  const plan = move && ARM_VORM[move.cls];
  try {
    v.endElement();
    if (!plan || !el.classList.contains('levend')) return;
    // de twee bochten staan in de tekening zelf; de eerste twee waarden zijn rust en omhoog
    if (!v.bochten) { const w = v.getAttribute('values').split(';'); v.bochten = { r: w[0], o: w[1] }; }
    v.setAttribute('values', [...plan.vorm].map(k => v.bochten[k]).join(';'));
    v.setAttribute('keyTimes', plan.keyTimes);
    v.setAttribute('keySplines', Array(plan.vorm.length - 1).fill('.42 0 .58 1').join(';'));
    v.beginElement();
  } catch (e) { /* niet actief: niets te stoppen */ }
}
/* En weer uit: alleen het pasje eraf. Het wiegen loopt door en stond ook nooit
   stil, dus dat hoeft hier niet meer aangezet te worden -- 'idle' stond er al en
   zetPas haalt hem niet meer weg. Dat scheelt niet alleen een regel: de poppen op
   de sterrenkeuze hébben geen 'idle' (zes wiegende poppen naast elkaar is precies
   wat dit scherm niet wil), en die zouden er hier eentje cadeau krijgen. */
function stilStaan(el) { if (el) { pasLos(el); el.classList.remove('dancing', ...MOVE_CLASSES); armVorm(el, null); } }
/* Hoe lang één pasje duurt: de .9s van de danspasjes in 30-onderdelen.css.

   AF ALS HIJ UIT IS, NIET ALS DE KLOK HET ZEGT. Het pasje ging er eerst af op
   een klok (PAS plus drie beeldjes), en dat ging op twee manieren mis. Een klok
   die korter was dan het pasje -- de stuiter op de kaart stond op de duur van
   de groet, en dat werd een huppel van 660ms -- knipte hem af terwijl ze nog
   ingedeukt stond, en dan klikte ze in één beeldje recht. En ook een klok die
   wél klopte, klopte alleen als het pasje meteen begon: na een zwaar beeldje
   (het eindscherm dat net opgebouwd is) liep het pasje 100ms achter en ging
   het er alsnog net voor het eind af. Nu wacht pasUit op animationend van de
   pas-laag zelf; de klok is alleen nog het vangnet voor als die nooit komt (de
   pop staat op een scherm dat niet in beeld is, en daar loopt geen animatie).

   Per pop één wachter, en een nieuw pasje (zetPas) of stilstaan ruimt de oude
   op. Zonder dat haalde de wachter van een vorige tik het volgende pasje
   halverwege weg: tik twee keer kort na elkaar en de tweede dans brak na een
   halve seconde af.

   dan: wat er gebeurt als het pasje uit is. Gewoon stilstaan, of -- voor de
   finale -- het volgende pasje. */
const PAS = 900;
document.documentElement.style.setProperty('--t-pas', PAS + 'ms');   // de CSS leest dezelfde duur
const PAS_VANGNET = PAS + 300;
const pasKlok = new WeakMap();
function pasLos(el) {
  const k = pasKlok.get(el);
  if (!k) return;
  clearTimeout(k.klok);
  if (el.removeEventListener) el.removeEventListener('animationend', k.eind);
  pasKlok.delete(el);
}
function pasUit(el, dan) {
  pasLos(el);
  const klaar = () => { pasLos(el); (dan || stilStaan)(el); };
  // alleen het pasje zelf telt: het wiegen staat op de houder en eindigt nooit
  const eind = e => { if (e.target.parentElement === el && e.target.classList.contains('pas-laag')) klaar(); };
  if (el.addEventListener) el.addEventListener('animationend', eind);   // het nagebootste scherm van de keuring heeft er geen
  pasKlok.set(el, { klok: setTimeout(klaar, PAS_VANGNET), eind });
}
function dance(elId) {
  const el = $(elId);
  /* Danst ze nog, dan danst ze dat pasje uit. Een nieuw pasje erbovenop begon
     vanuit de stand waar het vorige was -- halverwege een sprong klikte ze
     terug naar de grond. In de kleedkamer gebeurde dat bij elk tweede stuk dat
     je snel na het eerste aantikte; de nieuwe kleren krijgt ze toch al aan
     (paintShop tekent haar opnieuw, zónder het pasje te herstarten). */
  if (!el || el.classList.contains('dancing')) return;
  // kies het volgende danspasje van de show (afwisselend, met een verrassing)
  const move = Math.random() < 0.4 ? pick(MOVES) : MOVES[G ? G.moveIdx % MOVES.length : 0];
  if (G) { G.moveIdx++; if (G.pasjes) G.pasjes.push(move); }   // volgend danspasje uit de reeks; de finale danst ze na (finaleReeks)
  if (!zetPas(el, move)) return;
  pasUit(el);
}
function buiging(elId) {
  const el = $(elId);
  if (!el || !zetPas(el, BUIGING)) return;
  pasUit(el);
}
// Vrije dans: tik op de avatar (kleedkamer/winkel/eindscherm) voor een willekeurig pasje.
// stil: wie al een eigen klankje speelt (Verras me speelt sndAan), krijgt er
// niet nog het tikje bovenop -- twee klankjes tegelijk lezen als één rommel.
function tapDance(elId, stil) {
  const el = $(elId);
  if (!el || el.classList.contains('dancing')) return;
  // De tik wordt altijd beantwoord -- het klankje is het antwoord, het pasje de
  // versiering. Dus eerst het geluid, en pas daarna kijken of er gedanst wordt.
  if (!stil) sndTap();
  const r = el.getBoundingClientRect();   // vóór het pasje: meten na een wijziging dwingt een opmaak af
  if (!zetPas(el, pick(MOVES))) return;
  sparkleAt(r);
  pasUit(el);
}
/* ================= Vasthouden ==============================================
   Een kind dat de pop niet aantikt maar haar vasthoudt. Zonder dit deed elk
   toestel er iets anders mee, en niets daarvan was een antwoord: Chrome op
   Android ziet het als lang drukken en slikt de tik in (de ster ging niet open,
   ze huppelde niet), en Safari begon een selectie of zette zijn Kopieer-bubbel
   neer. Die twee zet het stijlblad uit (zie body in 10-basis.css), het
   systeemmenu gaat hieronder uit, en dan blijft er alleen het gebaar zelf over.

   vasthouden(houder, kies, op): houdt de vinger LANG_VAST stil op een element
   binnen `houder` dat `kies` raakt (een selector; null = de houder zelf), dan
   gaat op(doel) af. Wat op teruggeeft (een functie) gaat af als de vinger loslaat.
   De tik die een toestel daarna nog stuurt (Safari doet dat, Chrome niet) wordt
   ingeslikt: vasthouden ís het antwoord al, er komt geen tweede achteraan.

   Schuift de vinger, dan is het geen vasthouden maar vegen -- die gaat gewoon
   naar de kaart. LOS_UITERLIJK is het vangnet voor een toestel dat het loslaten
   nooit meldt: dan houdt het zingen toch een keer op. */
const LANG_VAST = 450;
const LANG_SCHUIF = 10;
const LOS_UITERLIJK = 8000;
function vasthouden(houder, kies, op) {
  let klok = null, los = null, vast = null, x = 0, y = 0, slik = false;
  const stop = () => {
    clearTimeout(klok); klok = null;
    if (los) { const f = los; los = null; f(); }
  };
  houder.addEventListener('pointerdown', e => {
    stop();
    slik = false;
    if (!e.isPrimary || e.button > 0) return;
    const doel = kies ? e.target.closest && e.target.closest(kies) : houder;
    if (!doel || !houder.contains(doel)) return;
    x = e.clientX; y = e.clientY;
    klok = setTimeout(() => {
      klok = null;
      slik = true;
      const f = op(doel);
      if (typeof f === 'function') { los = f; clearTimeout(vast); vast = setTimeout(stop, LOS_UITERLIJK); }
    }, LANG_VAST);
  }, { passive: true });
  houder.addEventListener('pointermove', e => {
    if (klok && Math.hypot(e.clientX - x, e.clientY - y) > LANG_SCHUIF) { clearTimeout(klok); klok = null; }
  }, { passive: true });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) houder.addEventListener(t, stop, { passive: true });
  houder.addEventListener('click', e => {
    if (!slik) return;
    slik = false;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
}
/* ================= Antwoordtik =============================================
   Hoe een antwoord (een knop, een cijfer, een kaartje, een voorwerp om te
   tellen) een tik hoort. Niet via click: die gooit de browser weg op precies
   de manier waarop een kind snel tikt. Nagemeten met echte aanrakingen:
     * rolt de vinger bij het loslaten een stukje (voorbij de "tap slop": op
       Android zo'n 8 px, een halve vingertop), dan wordt de tik een poging om
       te schuiven en komt er geen click;
     * landt de volgende vinger vóór de vorige loslaat (1 en 2 snel met twee
       vingers), dan ziet de browser een gebaar met twee vingers en stuurt hij
       voor GEEN VAN BEIDE een click.
   De aanraking zelf komt wél altijd door (pointerdown/pointerup). Dus luisteren
   we daarnaar:

   knopTik(houder, kies, doe): elk element binnen `houder` dat `kies` raakt,
   telt als de vinger loslaat -- voor het element waar hij NEERKWAM, zolang hij
   nog binnen TIK_MARGE px daarvan is. Wie duidelijk wegschuift, breekt af zoals
   vroeger. Elke vinger apart; landt er een nieuwe terwijl een vorige nog ligt,
   dan telt die vorige meteen (de volgorde blijft die van het neerkomen). Een
   tik in een kier telt voor de dichtste knop, tot TIK_KIER px ver. doe(el, punt)
   krijgt de plek van het loslaten als { clientX, clientY } (de getallenlijn
   leest daar uit welk streepje).
   Het toetsenbord (Enter op een knop) komt als click met detail 0 en gaat
   gewoon door; elke andere click wordt genegeerd, anders telde een tik dubbel.

   Opnieuw aanroepen op dezelfde houder (elke vraag bouwt zijn knoppen nieuw)
   vervangt alleen kies en doe; de luisteraars hangen er één keer.
   .knop-tik (50-zaal.css) zet touch-action op none: anders maakt de browser van
   een rollende vinger alsnog een schuifgebaar en breekt hij hem af.
   inhoud zaak U kijkt na dat geen antwoordvlak nog onclick gebruikt; robuust
   zaak F tikt het na met echte vingers. */
const TIK_MARGE = 28;
const TIK_KIER = 12;
function knopTik(houder, kies, doe) {
  houder._tik = { kies, doe };
  if (houder._tikOpen) return;
  const open = houder._tikOpen = new Map();   // pointerId -> { el, x, y }
  houder.classList.add('knop-tik');
  const vind = (e) => {
    const { kies } = houder._tik;
    const raak = e.target.closest && e.target.closest(kies);
    if (raak && houder.contains(raak)) return raak;
    let best = null, bijna = TIK_KIER;
    for (const k of houder.querySelectorAll(kies)) {
      if (k.disabled || getComputedStyle(k).pointerEvents === 'none') continue;   // .count-tiles.wacht: nog niet tikbaar
      const r = k.getBoundingClientRect();
      const d = Math.hypot(Math.max(r.left - e.clientX, 0, e.clientX - r.right), Math.max(r.top - e.clientY, 0, e.clientY - r.bottom));
      if (d < bijna) { bijna = d; best = k; }
    }
    return best;
  };
  const tel = (stip, x, y) => {
    if (!stip.el.isConnected || stip.el.disabled) return;
    houder._tik.doe(stip.el, { clientX: x, clientY: y });
  };
  const los = (stip) => stip.el.classList.remove('ingedrukt');
  const binnen = (stip, x, y) => {
    const r = stip.el.getBoundingClientRect();
    return x > r.left - TIK_MARGE && x < r.right + TIK_MARGE && y > r.top - TIK_MARGE && y < r.bottom + TIK_MARGE;
  };
  houder.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    // eerst alles meten, dan pas schrijven (zie robuust zaak A)
    const el = vind(e);
    // een nieuwe vinger: wie er nog lag, was een tik (de volgorde van neerkomen)
    const vorig = [...open.values()].map(stip => [stip, binnen(stip, stip.x, stip.y)]);
    open.clear();
    for (const [stip, telt] of vorig) { if (telt) tel(stip, stip.x, stip.y); los(stip); }
    if (!el) return;
    open.set(e.pointerId, { el, x: e.clientX, y: e.clientY });
    // een vinger houdt zijn element vanzelf vast; een muis die buiten de houder
    // loslaat, zou anders nooit pointerup melden
    if (e.pointerType === 'mouse') try { houder.setPointerCapture(e.pointerId); } catch (_) {}
    el.classList.add('ingedrukt');
  });
  houder.addEventListener('pointermove', e => {
    const stip = open.get(e.pointerId);
    if (stip) { stip.x = e.clientX; stip.y = e.clientY; }
  }, { passive: true });
  houder.addEventListener('pointerup', e => {
    const stip = open.get(e.pointerId);
    if (!stip) return;
    open.delete(e.pointerId);
    if (binnen(stip, e.clientX, e.clientY)) tel(stip, e.clientX, e.clientY);
    los(stip);
  });
  houder.addEventListener('pointercancel', e => {
    const stip = open.get(e.pointerId);
    if (stip) { open.delete(e.pointerId); los(stip); }
  });
  houder.addEventListener('click', e => {
    if (e.detail !== 0) return;   // een aanraking of muis: die telde al bij het loslaten
    const el = e.target.closest && e.target.closest(houder._tik.kies);
    if (el && houder.contains(el)) houder._tik.doe(el, e);
  });
}
/* ================= Elke tik telt ===========================================
   Wat de Antwoordtik hierboven doet voor de antwoorden, voor élke andere knop:
   de halte op de kaart, de tabbalk, ✕, 🎲, Verder op tournee, de kleedkamer,
   de kast, Voor ouders. Ook die luisterden naar click, en de browser gooit die
   weg zodra
     * er nog een andere vinger op het glas ligt -- de duim van de hand die de
       tablet vasthoudt is genoeg; of
     * de vinger bij het loslaten een stukje rolt.
   Nagemeten met echte aanrakingen: de antwoorden telden, al het andere niet.

   Hoe: één luisteraar op het document (in de vangfase, dus vóór alles). Komt
   een vinger neer op een knop, dan onthouden we die knop. Laat hij binnen
   TIK_MARGE weer los, binnen KORT_DRUK ms, en is de lijst eronder niet
   geschoven, dan sturen we zelf de click naar de plek waar hij neerkwam --
   gewoon door, dus elke onclick, elke delegatie en elk vasthouden() werkt zoals
   altijd. De click die de browser daarna eventueel nog stuurt, slikken we in:
   anders telde een gewone tik dubbel. Herkend aan de plek en niet aan de knop:
   opent onze click iets bovenop (een trofee die opengaat), dan landt de click
   van de browser op dát, en zou hij daar meteen de volgende stap zetten.

   Wat er níét onder valt:
     * muis, pen en toetsenbord: daar komt de click altijd en klopt hij;
     * de antwoorden (.knop-tik): die hebben hun eigen, strengere tik;
     * invulvakken en echte links: daar hoort de browser zelf het laatste woord;
     * wie lang drukt (KORT_DRUK): een duim die blijft liggen is geen tik, en
       lang drukken heeft zijn eigen gebaar (vasthouden);
     * wie de lijst laat schuiven: dat was vegen, geen tik.
   Breekt de browser het gebaar af (pointercancel) op een plek die niet schuift,
   dan telt het als loslaten op die plek; in een lijst is afbreken het begin van
   vegen en telt het niet.

   test:robuust zaak G tikt elke knop van het kind zo na: met een duim die
   blijft liggen en met een vinger die rolt. */
const KORT_DRUK = 700;
const ELKE_TIK_NIET = 'input, textarea, select, label, a[href], .knop-tik, #studio';
const elkeTikOpen = new Map();   // pointerId -> { knop, doel, x, y, t, rol, top, links, vinger }
const elkeTikSlik = [];          // [{ x, y, tot }] -- de click die de browser nog achterna stuurt
const elkeTikAf = new Map();     // touch.identifier -> stip, afgebroken in een lijst
function elkeTikKnop(doel) {
  const knop = doel && doel.closest && doel.closest('button, [onclick], [role="button"], [role="switch"], [role="menuitem"], [role="menuitemcheckbox"]');
  if (!knop || knop.closest(ELKE_TIK_NIET)) return null;
  return knop;
}
function elkeTikRol(el) {
  for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
    if (a.scrollHeight > a.clientHeight + 1 || a.scrollWidth > a.clientWidth + 1) {
      const o = getComputedStyle(a);
      if (/auto|scroll/.test(o.overflowY + o.overflowX)) return a;
    }
  }
  return null;
}
function elkeTikTel(stip, x, y) {
  const { knop, rol } = stip;
  if (!knop.isConnected || knop.disabled || knop.closest('[inert]')) return;
  if (rol && (rol.scrollTop !== stip.top || rol.scrollLeft !== stip.links)) return;
  const r = knop.getBoundingClientRect();
  if (x < r.left - TIK_MARGE || x > r.right + TIK_MARGE || y < r.top - TIK_MARGE || y > r.bottom + TIK_MARGE) return;
  elkeTikSlik.push({ x, y, tot: performance.now() + 800 });
  const doel = stip.doel.isConnected && knop.contains(stip.doel) ? stip.doel : knop;
  doel.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, view: window, detail: 1, clientX: x, clientY: y }));
}
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;
  const knop = elkeTikKnop(e.target);
  if (!knop) return;
  // alleen meten, niets schrijven (zie robuust zaak A)
  const rol = elkeTikRol(knop);
  elkeTikOpen.set(e.pointerId, { knop, doel: e.target, x: e.clientX, y: e.clientY, t: performance.now(),
    rol, top: rol ? rol.scrollTop : 0, links: rol ? rol.scrollLeft : 0 });
}, true);
document.addEventListener('pointermove', e => {
  const stip = elkeTikOpen.get(e.pointerId);
  if (stip) { stip.x = e.clientX; stip.y = e.clientY; }
}, { capture: true, passive: true });
document.addEventListener('pointerup', e => {
  const stip = elkeTikOpen.get(e.pointerId);
  if (!stip) return;
  elkeTikOpen.delete(e.pointerId);
  if (performance.now() - stip.t <= KORT_DRUK) elkeTikTel(stip, e.clientX, e.clientY);
}, true);
document.addEventListener('pointercancel', e => {
  const stip = elkeTikOpen.get(e.pointerId);
  if (!stip) return;
  elkeTikOpen.delete(e.pointerId);
  if (!stip.rol) { if (performance.now() - stip.t <= KORT_DRUK) elkeTikTel(stip, stip.x, stip.y); return; }
  // in een lijst: wachten op het echte loslaten (touchend), en dan kijken of er geschoven is
  if (stip.vinger != null) elkeTikAf.set(stip.vinger, stip);
}, true);
/* Na een pointercancel komt er geen pointerup meer, maar touchend wél. Welke
   aanraking bij welke vinger hoort, zie je aan de plek: touchstart komt meteen
   na pointerdown, op hetzelfde punt. */
document.addEventListener('touchstart', e => {
  for (const t of e.changedTouches) for (const stip of elkeTikOpen.values())
    if (stip.vinger == null && Math.abs(stip.x - t.clientX) < 1 && Math.abs(stip.y - t.clientY) < 1) { stip.vinger = t.identifier; break; }
}, { capture: true, passive: true });
document.addEventListener('touchend', e => {
  for (const t of e.changedTouches) {
    const stip = elkeTikAf.get(t.identifier);
    if (!stip) continue;
    elkeTikAf.delete(t.identifier);
    if (performance.now() - stip.t <= KORT_DRUK) elkeTikTel(stip, t.clientX, t.clientY);
  }
}, { capture: true, passive: true });
document.addEventListener('touchcancel', e => { for (const t of e.changedTouches) elkeTikAf.delete(t.identifier); }, { capture: true, passive: true });
document.addEventListener('click', e => {
  if (!e.isTrusted || !e.detail) return;   // onze eigen click, of het toetsenbord
  const nu = performance.now();
  for (let i = elkeTikSlik.length - 1; i >= 0; i--) if (elkeTikSlik[i].tot < nu) elkeTikSlik.splice(i, 1);
  const i = elkeTikSlik.findIndex(s => Math.abs(s.x - e.clientX) <= TIK_MARGE && Math.abs(s.y - e.clientY) <= TIK_MARGE);
  if (i < 0) return;
  elkeTikSlik.splice(i, 1);
  e.preventDefault();
  e.stopImmediatePropagation();
}, true);
/* Een kaartje dat een knop is maar geen <button> (een kleedkamerkaartje, een
   trofee): zeg dat tegen een schermlezer, en laat het toetsenbord erbij. Tab
   komt erop, Enter en spatie tikken het aan -- net als bij een echte knop.
   test:robuust zaak G kijkt na dat alles met een onclick zo'n knop is. */
function knopRol(el) {
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
}
document.addEventListener('keydown', e => {
  if ((e.key !== 'Enter' && e.key !== ' ') || e.defaultPrevented || e.repeat) return;
  const el = e.target;
  if (!el || !el.getAttribute || /^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
  if (!/^(button|switch|menuitem|menuitemcheckbox|checkbox)$/.test(el.getAttribute('role') || '')) return;
  e.preventDefault();
  el.click();
});
/* Het systeemmenu bij lang drukken (Android) en de rechtermuisknop: in een spel
   voor kinderen is daar niets te halen. Behalve in een invulvak -- daar plakt
   een ouder de overzetcode of typt hij een naam, en dat menu is het plakken. */
document.addEventListener('contextmenu', e => {
  const t = e.target;
  if (t && t.closest && t.closest('input, textarea, [contenteditable]')) return;
  e.preventDefault();
});
// klein sterretje dat oppopt bij een tik-dans
function sparkle(el, emojis) { sparkleAt(el.getBoundingClientRect(), emojis); }
/* Het sterretje komt óp en is dan weg, vlak bij wat er aangetikt werd. Het was
   een .confetti-bit, en dat ging twee keer mis: het viel (fall, door het hele
   scherm) in plaats van op te poppen, en het hing los in <body> zonder z-index,
   dus achter #app -- onzichtbaar op elk scherm met een eigen achtergrond. Nu
   een eigen klasse (.vonk-op) die boven alles zit en niets vangt. */
const VONK_OP = 900;
function sparkleAt(r, emojis) {
  if (motionOff()) return;   // een los sterretje: sier, en verder niets
  const s = document.createElement('div');
  s.className = 'vonk-op';
  s.textContent = pick(emojis || ['✨', '⭐', '💖', '🎵', '💫']);
  s.style.left = (r.left + r.width / 2 - 12 + rnd(-20, 20)) + 'px';
  s.style.top = (r.top + 10) + 'px';
  s.style.setProperty('--drift', rnd(-14, 14) + 'px');
  s.style.animationDuration = VONK_OP + 'ms';
  document.body.appendChild(s);
  setTimeout(() => s.remove(), VONK_OP + 60);
}
// Grote finale-choreografie op het eindscherm: alle pasjes achter elkaar.
/* buig: het laatste pasje is de buiging. Een show eindigt zoals een show
   eindigt -- ze danst, en buigt dan voor de zaal. Het blijft één ding (zie
   BUIGING): de buiging komt alleen na een show, nooit na een gewoon antwoord.
   reeks: welke pasjes vóór de buiging (zie finaleReeks); zonder reeks de
   pasjes in de volgorde van MOVES. */
function finaleDance(elId, count, buig, reeks) {
  const el = $(elId);
  if (!el) return;
  // Bijna vier seconden dansen is precies het soort beweging dat je niet wilt
  // als je om minder beweging gevraagd hebt. Ze staat er gewoon, in haar nieuwe
  // spullen, en het eindscherm vertelt de rest.
  if (motionOff()) { stilStaan(el); return; }
  /* Elk pasje helemaal uit (pasUit). Dit stond op 620ms per pasje, terwijl een
     pasje 900ms duurt: elk pasje werd op tweederde afgebroken en de pop sprong
     naar de volgende stand -- het duidelijkst midden in de pirouette. Daarna
     stond het op een klok van PAS, en die liep op het eindscherm (dat net
     zwaar opgebouwd is) nog 100ms vóór op het pasje uit. */
  let i = 0;
  const step = () => {
    if (i >= count) { stilStaan(el); return; }
    const pas = buig && i === count - 1 ? BUIGING : (reeks && reeks[i]) || MOVES[i % MOVES.length];
    if (!zetPas(el, pas)) return;
    i++;
    pasUit(el, step);
  };
  step();
}
/* De finale danst de show na. Hij was altijd dezelfde vier (sprong, pirouette,
   heupwiegen, buiging), na één ster en na drie, honderden keren. Nu zijn het de
   laatste pasjes die ze in déze show danste, elk één keer, in de volgorde
   waarin ze kwamen -- en aangevuld uit MOVES als de show er minder had. Drie
   sterren: dan is het laatste pasje vóór de buiging de hoge noot, het mooiste
   wat ze heeft. gedanst is G.pasjes (zie dance). */
function finaleReeks(gedanst, n, drie) {
  const noot = MOVES.find(m => m.cls === 'move-noot');
  const uniek = [];
  for (let i = (gedanst || []).length - 1; i >= 0 && uniek.length < n; i--) {
    if (!uniek.includes(gedanst[i]) && !(drie && gedanst[i] === noot)) uniek.unshift(gedanst[i]);
  }
  const ruimte = drie ? n - 1 : n;
  const reeks = uniek.slice(-ruimte);
  for (const m of MOVES) if (reeks.length < ruimte && !reeks.includes(m) && !(drie && m === noot)) reeks.push(m);
  if (drie) reeks.push(noot);
  return reeks;
}
// reward (optioneel): apart pilletje onder de tekst, zelfde stijl als de
// opbrengst-badges op het eindscherm (.earn-chip.dia) -- zo staat "wat er
// gebeurde" en "wat je kreeg" niet meer als één aaneengeregen zin.
// Tijdens het spel ("docked", zie .docked in CSS) hangt de kaart vlak onder
// de vaste kop i.p.v. los in het midden, zodat hij nooit over de paspop valt.
// blauw (optioneel): "hier ben je" -- een nieuwe wereld. Wit op een blauwe rand
// in plaats van goud, want aankomen is iets anders dan verdienen.
/* Waar een gedockte kaart hangt. Gewoon: midden onder de kop, in het gat tussen
   de voortgangsrij en de ster (zie .docked). Maar op een liggende telefoon staat
   de som naast de ster en reikt ze tot vlak onder de kop -- daar viel de hint
   precies óp de som die het kind opnieuw moest maken. Dan hangt hij boven háár
   kolom. Alleen op zo'n laag liggend scherm wordt er gemeten; elders blijft de
   kaart in het midden en kost dit niets. */
const DOCK_LAAG = '(min-aspect-ratio: 1/1) and (max-height: 520px)';
function dockPlek(el) {
  el.style.left = el.style.right = '';
  if (!el.classList.contains('docked') || !matchMedia(DOCK_LAAG).matches) return;
  const ster = document.querySelector('#screen-game .show-panel');
  const som = document.querySelector('#screen-game .math-panel');
  if (!ster || !som) return;
  const a = ster.getBoundingClientRect(), b = som.getBoundingClientRect();
  if (b.left < a.right - 1) return;   // onder elkaar: het midden is vrij
  const mid = a.left + a.width / 2, half = 170;
  el.style.left = Math.max(8, mid - half) + 'px';
  el.style.right = Math.max(8, innerWidth - mid - half) + 'px';
}
/* LOF_DUUR is hoe lang de lof gewoonlijk staat; de CSS leest hem als --t-lof.
   duur (optioneel, ms): korter dan dat. De show geeft die mee, zodat
   de lof weg is op het moment dat de volgende som er staat (zie antwoordGoed);
   zonder duur geldt weer gewoon LOF_DUUR. */
const LOF_DUUR = 900;
document.documentElement.style.setProperty('--t-lof', LOF_DUUR + 'ms');
function showPraise(txt, reward, blauw, duur) {
  const el = $('praise');
  el.style.animationDuration = duur ? duur + 'ms' : '';
  el.classList.toggle('docked', $('screen-game').classList.contains('active'));
  dockPlek(el);
  el.classList.toggle('blauw', !!blauw);
  el.innerHTML = `<div class="praise-headline">${txt}</div>` + (reward ? `<div class="earn-chip dia">${reward}</div>` : '');
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}
// sub (optioneel): eigen, dunnere regel eronder voor een tweede gedachte
// (bv. de woorden onder de pijl-hint) i.p.v. die met een liggend streepje aan
// de hoofdtekst te plakken.
// onTap (optioneel): maakt het hele scherm aantikbaar i.p.v. na een vaste tijd
// te verdwijnen -- gebruikt bij de "dit was het juiste antwoord"-toast, zodat
// het kind zelf de tijd neemt om te lezen i.p.v. dat een timer raadt hoe lang
// dat duurt. Bewust niet alleen de kleine toast-bubbel zelf: die precies
// moeten raken is minder vergevingsgezind dan overal mogen tikken.
// soort (optioneel): 'teken' voor een kaart met alleen één groot teken (🤔, 👉)
// en 'hint' voor het plaatje na een eerste misser (zie toonHint); 'goud' voor iets
// wat ze verdiend heeft (nieuwe trofee, nieuw podium) en 'blauw' voor "hier ben
// je" (welkom). Zonder soort is het de gewone pil met tekst, zonder kleur; de
// vorige soort blijft nooit hangen.
// duur (optioneel): hoe lang hij blijft staan, standaard TOAST_DUUR.
/* DE REGEL: een toast gaat vanzelf weg. showToast plant dat zelf in; een aanroeper
   hoeft er niets voor te onthouden -- moest elke aanroeper er zelf een toastWeg
   achter zetten, dan bleef de toast van wie dat vergat staan tot er toevallig een
   volgende kwam. Alleen twee soorten blijven staan, omdat iets anders ze wegneemt:
     - met onTap: die wacht op een tik (het hele scherm, zie tap-veil);
     - 'teken' en 'hint': de hint bij een misser in de show. Die staat tot het
       volgende antwoord, en de show haalt hem weg (hideToast in 60-spel).
   kern zaak TW kijkt dit na, en ook dat toastWeg alleen hier aangeroepen wordt. */
/* Elke toast krijgt een nummer. toastWeg(ms) haalt alléén de toast weg die er nu
   staat: hier stonden overal losse setTimeout(hideToast, ..)'s, en een klokje van
   een vorige toast haalde dan de volgende weg -- tik op een trofee die op slot
   zit en een tel later op een andere, en die tweede toast was na een halve
   seconde al weg. Een toast die vanzelf verdwijnt doet dat met een korte fade
   (TOAST_UIT); hideToast blijft de harde knip voor wie meteen iets anders laat
   zien. */
let toastNr = 0, toastFade = null;
const TOAST_UIT = 160, TOAST_DUUR = 2400;
function toastWeg(ms) {
  const nr = toastNr;
  setTimeout(() => {
    if (nr !== toastNr) return;
    const t = $('toast');
    if (motionOff() || !t.animate) { hideToast(); return; }
    // fill 'forwards': anders springt hij na de fade nog één beeldje terug.
    toastFade = t.animate([{ opacity: 1 }, { opacity: 0 }],
      { duration: TOAST_UIT, easing: 'ease-in', fill: 'forwards' });
    toastFade.onfinish = () => { if (nr === toastNr) hideToast(); };
  }, ms);
}
function showToast(txt, onTap, sub, soort, duur) {
  toastNr++;
  const t = $('toast');
  if (toastFade) { toastFade.cancel(); toastFade = null; }
  t.classList.toggle('docked', $('screen-game').classList.contains('active'));
  dockPlek(t);
  t.classList.toggle('teken', soort === 'teken');
  t.classList.toggle('hint', soort === 'hint');
  t.classList.toggle('goud', soort === 'goud');
  t.classList.toggle('blauw', soort === 'blauw');
  t.classList.toggle('met-sub', !!sub);
  // die twee zet meldMetTerug er zelf bij (zie 70-ouderdeel); een volgende melding is weer gewoon
  t.classList.remove('onder', 'met-knop');
  t.innerHTML = `<div class="toast-main">${txt}</div>` + (sub ? `<div class="toast-sub">${sub}</div>` : '');
  t.style.display = 'flex';
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  const veil = $('tap-veil');
  veil.onclick = null;
  veil.style.display = 'none';
  if (onTap) {
    veil.onclick = () => { hideToast(); onTap(); };
    veil.style.display = 'block';
  } else if (soort !== 'teken' && soort !== 'hint') toastWeg(duur || TOAST_DUUR);
}
function hideToast() {
  const t = $('toast');
  if (toastFade) { toastFade.cancel(); toastFade = null; }
  t.style.display = 'none';
  t.classList.remove('show');
  const veil = $('tap-veil');
  veil.onclick = null;
  veil.style.display = 'none';
}

function confetti(n, scherm) {
  // Hetzelfde antwoord als confettiBurst hieronder: wie om minder beweging
  // vraagt, krijgt het feest zonder de veertig dwarrelende stukjes. Wat er
  // gevierd wordt staat er zelf ook -- de sterren, de juichtekst, de teller.
  if (motionOff()) return;
  const emo = ['🎉', '🎊', '⭐', '💖', '🎵', '✨', '💎'];
  const laag = confettiLaag(scherm);
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'confetti-bit';
    d.textContent = feestStukje(emo);   // met de stukjes van de wereld erbij (zie wereldConfetti)
    d.style.left = rnd(0, 96) + 'vw';
    d.style.animationDuration = (rnd(18, 34) / 10) + 's';
    d.style.animationDelay = (rnd(0, 8) / 10) + 's';
    laag.appendChild(d);
    setTimeout(() => d.remove(), 4500);
  }
}
/* Waar de confetti valt: achter het spel, maar vóór de achtergrond.

   #confetti-layer ligt onder heel #app, en dat is met opzet (zie 10-basis.css):
   confetti mag nooit over de som of de juichtekst heen. Maar de show en het
   eindscherm hebben een eigen zaal (.venue), en die is dekkend -- alle confetti
   daar viel er dus onzichtbaar achter. Staat er op het actieve scherm een zaal,
   dan valt ze nu ín die zaal: boven het verloop en het zaallicht, onder de inhoud
   (die staat er op z 1 boven, zie 50-zaal.css). Precies dezelfde afspraak, één
   laag hoger.

   scherm: voor wie confetti strooit vlak vóór de wissel naar een ander scherm
   (endLevel doet dat, en zet het eindscherm pas daarna aan). Anders het scherm
   dat nu aan staat. */
function confettiLaag(scherm) {
  const s = scherm || document.querySelector('.screen.active');
  const zaal = s && s.classList.contains('venue-aan') && s.querySelector('.venue');
  return zaal || $('confetti-layer');
}
// Reduced-motion? Dan geen sier-animaties.
function motionOff() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
// Lichtkringetje vanaf een tikpunt (x,y in viewport-coördinaten).
function tapRipple(x, y) {
  if (motionOff() || x == null) return;
  const r = document.createElement('div');
  r.className = 'tap-ripple';
  r.style.left = x + 'px'; r.style.top = y + 'px';
  document.body.appendChild(r);
  setTimeout(() => r.remove(), 520);
}
// Confetti-kanon: stukjes spuiten vanuit (cx,cy) naar buiten, met wat zwaartekracht.
// 'hero' = een emoji (bijv. het trofee-icoon) die er tussendoor meevliegt.
function confettiBurst(cx, cy, n, hero) {
  if (motionOff()) return;
  const emo = ['🎉', '🎊', '⭐', '💖', '✨', '💎', '🌟'];
  for (let i = 0; i < n; i++) {
    const b = document.createElement('div');
    b.className = 'burst-bit';
    b.textContent = (hero && i % 4 === 0) ? hero : feestStukje(emo);
    const ang = rnd(0, 359) * Math.PI / 180;
    const dist = rnd(60, 190);
    const dx = Math.round(Math.cos(ang) * dist);
    const dy = Math.round(Math.sin(ang) * dist) + rnd(20, 70);   // lichte val naar beneden
    b.style.left = cx + 'px'; b.style.top = cy + 'px';
    b.style.setProperty('--dx', dx + 'px');
    b.style.setProperty('--dy', dy + 'px');
    b.style.setProperty('--rot', rnd(-220, 220) + 'deg');
    if (i % 5 === 0) b.style.fontSize = '32px';                  // een paar grote 'hero'-stukken
    b.style.animationDelay = (rnd(0, 6) / 100) + 's';
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 1050);
  }
}
