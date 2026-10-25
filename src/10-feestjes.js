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
function closeConfirmModal() { $('confirm-modal').classList.remove('open'); syncBackGuard(); }
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
function showNotice(title, body) {
  $('confirm-title').textContent = title;
  $('confirm-body').textContent = body;
  $('confirm-actions').innerHTML = `<button class="btn" id="confirm-ok">Oké</button>`;
  $('confirm-ok').onclick = closeConfirmModal;
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
   voor waarom het pasje niet op de tekening zelf staat. */
function pasLaag(svg) { return `<div class="pas-laag">${svg}</div>`; }
/* Een pop die al op het scherm staat andere kleren aandoen, zonder haar pasje te
   breken. De hele houder opnieuw vullen gooit ook de pas-laag weg, en een nieuwe
   pas-laag begint zijn animatie van voren af aan: ze klikte dan midden in een
   sprong terug naar de grond. Hier krijgt alleen de tekening ín de laag de
   nieuwe kleren, en het pasje loopt gewoon door. */
function popKleren(el, svg) {
  const laag = el.firstElementChild;
  if (laag && laag.classList.contains('pas-laag')) laag.innerHTML = svg;
  else el.innerHTML = pasLaag(svg);
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
  return true;
}
/* En weer uit: alleen het pasje eraf. Het wiegen loopt door en stond ook nooit
   stil, dus dat hoeft hier niet meer aangezet te worden -- 'idle' stond er al en
   zetPas haalt hem niet meer weg. Dat scheelt niet alleen een regel: de poppen op
   de sterrenkeuze hébben geen 'idle' (zes wiegende poppen naast elkaar is precies
   wat dit scherm niet wil), en die zouden er hier eentje cadeau krijgen. */
function stilStaan(el) { if (el) { pasLos(el); el.classList.remove('dancing', ...MOVE_CLASSES); } }
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
  if (G) { G.moveIdx++; }   // volgend danspasje uit de reeks
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
  if (!zetPas(el, pick(MOVES))) return;
  sparkle(el);
  pasUit(el);
}
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
function finaleDance(elId, count) {
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
    if (!zetPas(el, MOVES[i % MOVES.length])) return;
    i++;
    pasUit(el, step);
  };
  step();
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
function showPraise(txt, reward, blauw) {
  const el = $('praise');
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
/* Elke toast krijgt een nummer. toastWeg(ms) haalt alléén de toast weg die er nu
   staat: hier stonden overal losse setTimeout(hideToast, ..)'s, en een klokje van
   een vorige toast haalde dan de volgende weg -- tik op een trofee die op slot
   zit en een tel later op een andere, en die tweede toast was na een halve
   seconde al weg. Een toast die vanzelf verdwijnt doet dat met een korte fade
   (TOAST_UIT); hideToast blijft de harde knip voor wie meteen iets anders laat
   zien. */
let toastNr = 0, toastFade = null;
const TOAST_UIT = 160;
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
function showToast(txt, onTap, sub, soort) {
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
  }
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
