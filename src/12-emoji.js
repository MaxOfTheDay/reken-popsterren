/* ================= Emoji op elk toestel ===================================
   De app tekent met emoji, en die komen niet uit Fredoka maar uit het
   lettertype van het toestel. Twee dingen lopen daardoor per toestel uiteen,
   en geen van beide zie je in de browser waarin de tests draaien (Noto, net als
   Android):

   1. WAAR HIJ STAAT. Noto en Apple zetten een emoji in het midden van zijn
      vakje. Segoe UI Emoji (Windows) zet hem op de grondlijn: een plat teken
      krijgt een lege strook erboven en zakt. Nagemeten op de Fluent-tekeningen:
      👕 zit 0,11 letter lager dan ⬛, 💎 0,09, 🐢 0,17 -- in de navigatiebalk
      zag je het shirt onder de kaart en de beker hangen. Een vaste
      verschuiving in het stijlblad kan dat niet oplossen: elk teken zakt
      anders, en op een ander toestel staat hij al goed.

   2. OF HIJ ER IS. Een emoji van na 2019 (Emoji 12 en later: 🪸 🫧 🪄 🪐 🤍 ...)
      kent Windows 10 niet, en een Android-tablet van vóór Android 10/12 ook
      niet. Dan staat er een leeg vakje -- als wereldicoon, op een spulletje,
      in een telvraag.

   Dus meten we het toestel één keer, op een doekje:
     - het midden van ⬛ (dat vult zijn vakje) tegen het midden van 👕 en 💎.
       Liggen die gelijk, dan zet dit lettertype emoji al in het midden en doet
       deze sectie verder niets;
     - per emoji uit EMOJI_RESERVE: komt hij in kleur op het doek? Een
       ontbrekende emoji tekent het toestel als een zwart vakje of een kale
       zwarte omtrek, in de inktkleur die wij kiezen -- een echte emoji houdt
       zijn eigen kleuren.
   De uitslag gaat per browserversie in localStorage, zodat alleen de eerste
   start ervoor betaalt.

   Alleen als er iets te doen is, kijkt een MutationObserver mee met alles wat
   de app tekent (het loopt vóór de verf, dus er verspringt niets): een
   ontbrekende emoji wordt zijn reserve, en op een toestel dat emoji laat zakken
   komt elke emoji in een <span class="emo-m"> met --emo-dy, de afstand tot het
   midden (zie .emo-m in 10-basis.css). Tekst in een SVG blijft ongemoeid --
   een span hoort daar niet -- en zo ook een invoerveld.

   EMOJI_RESERVE: elke emoji van Emoji 12 of later die de app toont, met een
   oudere die hetzelfde zegt. inhoud zaak V houdt de lijst compleet; zet je een
   nieuwe emoji in een wereld of spulletje, zet hem er dan bij. */
const EMOJI_RESERVE = {
  '🫧': '💧', '🪸': '🐠', '🪩': '🌟', '🪗': '🎹', '🪘': '🥁', '🪄': '✨',
  '🩴': '👡', '🦩': '🦢', '🧊': '❄️', '🦦': '🦡', '🪐': '🚀', '🤍': '♡︎',
};
/* Een emoji: een beeldteken met wat er aan vast mag (kleurkeuze, huidskleur,
   en de lijm van een samengestelde zoals 🏴‍☠️). Een teken met U+FE0E erachter
   is bewust tekst (♥︎, ▶︎) en telt niet mee. */
const EMOJI_RE = (() => {
  try { return new RegExp('\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier}|\\u200D\\p{Extended_Pictographic}\\uFE0F?)*(?!\\uFE0E)', 'gu'); }
  catch (e) { return null; }
})();

/* Het doekje: teken één emoji in zwart en lees terug waar de inkt staat (in em,
   vanaf de bovenkant van het doek) en of hij kleur heeft. measureText kan dit
   niet: voor een kleuremoji geeft die het kader van het lettertype, niet van
   het teken. */
let emojiDoek = null;
function emojiInkt(teken) {
  const M = 40, B = M * 2;
  if (!emojiDoek) {
    const c = document.createElement('canvas');
    c.width = c.height = B;
    emojiDoek = c.getContext('2d', { willReadFrequently: true });
    emojiDoek.textBaseline = 'alphabetic';
  }
  const ctx = emojiDoek;
  ctx.clearRect(0, 0, B, B);
  ctx.font = M + 'px ' + getComputedStyle(document.body).fontFamily;
  ctx.fillStyle = '#000';
  ctx.fillText(teken, M / 4, M * 1.4);
  const d = ctx.getImageData(0, 0, B, B).data;
  let boven = -1, onder = -1, kleur = false;
  for (let y = 0; y < B; y++) {
    let rij = false;
    for (let x = 0; x < B; x++) {
      const i = (y * B + x) * 4;
      if (d[i + 3] > 40) { rij = true; if (d[i] + d[i + 1] + d[i + 2] > 90) kleur = true; }
    }
    if (rij) { if (boven < 0) boven = y; onder = y; }
  }
  return { midden: boven < 0 ? null : (boven + onder) / 2 / M, kleur };
}

/* Wat dit toestel nodig heeft. midden: zet het lettertype emoji uit het
   midden; ontbreekt: de emoji uit EMOJI_RESERVE die het niet kent. */
const emojiToestel = { midden: false, ontbreekt: [], nul: null, dy: new Map(), meet: emojiInkt };
function emojiMeetToestel() {
  const sleutel = 'rekenPopsterren_emoji', ua = navigator.userAgent;
  try {
    const oud = JSON.parse(localStorage.getItem(sleutel) || 'null');
    if (oud && oud.ua === ua) return oud;
  } catch (e) { /* geen opslag: dan meten we gewoon */ }
  const nul = emojiInkt('⬛️').midden;
  const zakt = ['👕', '💎'].some(t => {
    const m = emojiInkt(t).midden;
    return nul != null && m != null && Math.abs(m - nul) > 0.03;
  });
  const uit = { ua, midden: zakt, nul, ontbreekt: Object.keys(EMOJI_RESERVE).filter(t => !emojiInkt(t).kleur) };
  try { localStorage.setItem(sleutel, JSON.stringify(uit)); } catch (e) { /* vol of dicht: volgende keer opnieuw */ }
  return uit;
}

// Hoeveel em deze emoji naar het midden moet (0 als hij er al staat).
function emojiDy(teken) {
  const st = emojiToestel;
  if (!st.dy.has(teken)) {
    const m = st.meet(teken).midden;
    const dy = m == null || st.nul == null ? 0 : st.nul - m;
    st.dy.set(teken, Math.abs(dy) < 0.02 ? 0 : +dy.toFixed(3));
  }
  return st.dy.get(teken);
}

const EMOJI_OVERSLAAN = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION', 'TITLE', 'NOSCRIPT']);
let emojiVervang = null;
function emojiTekst(node) {
  const ouder = node.parentNode, st = emojiToestel;
  if (!ouder || !(ouder instanceof HTMLElement) || EMOJI_OVERSLAAN.has(ouder.nodeName)) return;
  if (emojiVervang && emojiVervang.test(node.data)) {
    emojiVervang.lastIndex = 0;
    node.data = node.data.replace(emojiVervang, t => EMOJI_RESERVE[t]);
  }
  if (!st.midden || !EMOJI_RE || ouder.classList.contains('emo-m')) return;
  const tekst = node.data;
  EMOJI_RE.lastIndex = 0;
  if (!EMOJI_RE.test(tekst)) return;
  EMOJI_RE.lastIndex = 0;
  const frag = document.createDocumentFragment();
  let vanaf = 0, iets = false;
  for (const m of tekst.matchAll(EMOJI_RE)) {
    const dy = emojiDy(m[0]);
    if (!dy) continue;
    iets = true;
    if (m.index > vanaf) frag.appendChild(document.createTextNode(tekst.slice(vanaf, m.index)));
    const s = document.createElement('span');
    s.className = 'emo-m';
    s.style.setProperty('--emo-dy', dy + 'em');
    s.textContent = m[0];
    frag.appendChild(s);
    vanaf = m.index + m[0].length;
  }
  if (!iets) return;
  if (vanaf < tekst.length) frag.appendChild(document.createTextNode(tekst.slice(vanaf)));
  ouder.replaceChild(frag, node);
}
function emojiLangs(wortel) {
  if (wortel.nodeType === 3) { emojiTekst(wortel); return; }
  if (wortel.nodeType !== 1 || !(wortel instanceof HTMLElement)) return;
  const loper = document.createTreeWalker(wortel, NodeFilter.SHOW_TEXT);
  const lijst = [];
  for (let n = loper.nextNode(); n; n = loper.nextNode()) lijst.push(n);
  lijst.forEach(emojiTekst);
}
let emojiWacht = null;
/* Zet het aan met wat dit toestel nodig heeft. De suites roepen het ook zelf
   aan, met een nagebootst toestel (zie onderrand zaak M): op Noto is er
   anders niets te zien. */
function emojiOpToestel(stand) {
  Object.assign(emojiToestel, stand);
  emojiToestel.dy.clear();
  const st = emojiToestel;
  emojiVervang = st.ontbreekt.length
    ? new RegExp(st.ontbreekt.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gu') : null;
  if (!st.midden && !emojiVervang) return;
  emojiLangs(document.body);
  if (emojiWacht) return;
  emojiWacht = new MutationObserver(lijst => {
    for (const r of lijst) {
      if (r.type === 'characterData') emojiTekst(r.target);
      else r.addedNodes.forEach(emojiLangs);
    }
  });
  emojiWacht.observe(document.body, { childList: true, subtree: true, characterData: true });
}
try { emojiOpToestel(emojiMeetToestel()); } catch (e) { /* geen doekje: dan staat alles zoals het lettertype het zet */ }
