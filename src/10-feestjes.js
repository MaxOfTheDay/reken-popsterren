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
const MOVE_CLASSES = MOVES.map(m => m.cls);
/* Het laagje waar een danspasje op draait. Alleen de vier poppen die ook echt
   dansen krijgen het; de rest (de sterrenkeuze, het kaartje op de reis, het
   maakformulier) heeft niets om erop te zetten. Zie de CSS bij de danspasjes
   voor waarom het pasje niet op de tekening zelf staat. */
function pasLaag(svg) { return `<div class="pas-laag">${svg}</div>`; }
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
function stilStaan(el) { if (el) el.classList.remove('dancing', ...MOVE_CLASSES); }
function dance(elId) {
  const el = $(elId);
  // kies het volgende danspasje van de show (afwisselend, met een verrassing)
  const move = Math.random() < 0.4 ? pick(MOVES) : MOVES[G ? G.moveIdx % MOVES.length : 0];
  if (G) { G.moveIdx++; }   // volgend danspasje uit de reeks
  if (!zetPas(el, move)) return;
  setTimeout(() => stilStaan(el), 950);
}
// Vrije dans: tik op de avatar (kleedkamer/winkel/eindscherm) voor een willekeurig pasje.
function tapDance(elId) {
  const el = $(elId);
  if (!el || el.classList.contains('dancing')) return;
  // De tik wordt altijd beantwoord -- het klankje is het antwoord, het pasje de
  // versiering. Dus eerst het geluid, en pas daarna kijken of er gedanst wordt.
  sndTap();
  if (!zetPas(el, pick(MOVES))) return;
  sparkle(el);
  setTimeout(() => stilStaan(el), 950);
}
// klein sterretje dat oppopt bij een tik-dans
function sparkle(el, emojis) { sparkleAt(el.getBoundingClientRect(), emojis); }
function sparkleAt(r, emojis) {
  if (motionOff()) return;   // een los dwarrelend sterretje: sier, en verder niets
  const s = document.createElement('div');
  s.className = 'confetti-bit';
  s.textContent = pick(emojis || ['✨', '⭐', '💖', '🎵', '💫']);
  s.style.left = (r.left + r.width / 2 - 12 + rnd(-20, 20)) + 'px';
  s.style.top = (r.top + 10) + 'px';
  s.style.animationDuration = '1.2s';
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 1400);
}
// Grote finale-choreografie op het eindscherm: alle pasjes achter elkaar.
function finaleDance(elId, count) {
  const el = $(elId);
  if (!el) return;
  // Bijna vier seconden dansen is precies het soort beweging dat je niet wilt
  // als je om minder beweging gevraagd hebt. Ze staat er gewoon, in haar nieuwe
  // spullen, en het eindscherm vertelt de rest.
  if (motionOff()) { stilStaan(el); return; }
  let i = 0;
  const step = () => {
    if (i >= count) { stilStaan(el); return; }
    if (!zetPas(el, MOVES[i % MOVES.length])) return;
    i++;
    setTimeout(step, 620);
  };
  step();
}
// reward (optioneel): apart pilletje onder de tekst, zelfde stijl als de
// opbrengst-badges op het eindscherm (.earn-chip.dia) -- zo staat "wat er
// gebeurde" en "wat je kreeg" niet meer als één aaneengeregen zin.
// Tijdens het spel ("docked", zie .docked in CSS) hangt de kaart vlak onder
// de vaste kop i.p.v. los in het midden, zodat hij nooit over de paspop valt.
function showPraise(txt, reward) {
  const el = $('praise');
  el.classList.toggle('docked', $('screen-game').classList.contains('active'));
  el.innerHTML = `<div class="praise-headline">${txt}</div>` + (reward ? `<div class="earn-chip dia">${reward}</div>` : '');
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}
// sub (optioneel): eigen, dunnere regel eronder voor een tweede gedachte
// (bv. "tik om verder te gaan") i.p.v. die met een liggend streepje aan de
// hoofdtekst te plakken.
// onTap (optioneel): maakt het hele scherm aantikbaar i.p.v. na een vaste tijd
// te verdwijnen -- gebruikt bij de "dit was het juiste antwoord"-toast, zodat
// het kind zelf de tijd neemt om te lezen i.p.v. dat een timer raadt hoe lang
// dat duurt. Bewust niet alleen de kleine toast-bubbel zelf: die precies
// moeten raken is minder vergevingsgezind dan overal mogen tikken.
function showToast(txt, onTap, sub) {
  const t = $('toast');
  t.classList.toggle('docked', $('screen-game').classList.contains('active'));
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
  t.style.display = 'none';
  t.classList.remove('show');
  const veil = $('tap-veil');
  veil.onclick = null;
  veil.style.display = 'none';
}

function confetti(n) {
  // Hetzelfde antwoord als confettiBurst hieronder: wie om minder beweging
  // vraagt, krijgt het feest zonder de veertig dwarrelende stukjes. Wat er
  // gevierd wordt staat er zelf ook -- de sterren, de juichtekst, de teller.
  if (motionOff()) return;
  const emo = ['🎉', '🎊', '⭐', '💖', '🎵', '✨', '💎'];
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'confetti-bit';
    d.textContent = pick(emo);
    d.style.left = rnd(0, 96) + 'vw';
    d.style.animationDuration = (rnd(18, 34) / 10) + 's';
    d.style.animationDelay = (rnd(0, 8) / 10) + 's';
    $('confetti-layer').appendChild(d);
    setTimeout(() => d.remove(), 4500);
  }
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
    b.textContent = (hero && i % 4 === 0) ? hero : pick(emo);
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
