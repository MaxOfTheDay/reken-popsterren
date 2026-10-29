/* ================= Spel ================= */
// Alleen woorden: de diamanten staan er al als pilletje onder, en een emoji
// achteraan was een tweede teken in een kaart van één regel.
const PRAISE = ['Super!', 'Fantastisch!', 'Topster!', 'Wauw!', 'Geweldig!', 'Knap gedaan!', 'Bravo!'];
let G = null;

/* eigenOvergang: de aanroeper beweegt de zaal zelf. Dat is alleen enterLevel,
   dat hem uit de aangetikte halte laat groeien. Elke andere weg hierheen --
   "Opnieuw proberen" op het eindscherm, "Speel" in het ouderdeel -- krijgt de
   stille wissel van toonHub. Hier stond een kale show(), en die liet de zaal
   met screenIn uit het niets opkomen: één beeldje alleen de roze achtergrond
   van de app, en daarna een zaal die er verwassen overheen kwam. Precies de
   tussenstand die de regel bij MOTION uitsluit. */
/* Wat een show van tevoren weet (zie startLevel), los van het scherm: welk
   thema elke vraag krijgt, per thema de vraagmaker, en waar de speciale
   vragen komen (zoek het getal, drie getallen). Die speciale vragen zijn
   sommen: staat er geen rekenen en geen tafels aan -- alleen geld, alleen de
   klok, of die twee -- dan zijn er geen. Hier las planSpecials toen s.ops van
   de geldvraagmaker, en die heeft geen; de show startte dan niet, en een tik
   op een halte deed niets. kern zaak SO start daarom elke combinatie van
   thema's, op het leerpad en bij Zelf kiezen. */
function showOpzet(p, lvl, goldIdx) {
  const s = p.settings;
  const vragenPlan = themaPlan(s, s.perLevel);
  const insts = Object.fromEntries(themasAan(s).map(k => [k, themaInst(p, k)]));
  const inst = insts.rekenen || insts[vragenPlan[0]];
  const som = insts.rekenen || insts.tafels;
  const bezet = vragenPlan.map((k, i) => k === 'rekenen' ? -1 : i).filter(i => i >= 0);
  // Zelf kiezen (vrij) kent geen accent per wereld: daar is het de keuze van de ouder
  // op de rij Zoek het getal of Drie getallen zelf krijgt die soort meer plekken (zie planSpecials)
  const rijNu = som && som === insts.rekenen && !som.vrij ? padNu(p) : null;
  const plan = som ? planSpecials(p, som, s.perLevel, som.vrij ? null : wereldAccent(lvl, padNu(p)), goldIdx, bezet, rijNu) : {};
  return { vragenPlan, insts, inst, plan };
}
function startLevel(lvl, eigenOvergang) {
  // De vorige show loslaten vóór G vervangen wordt: daarna is haar spotlight-
  // teller niet meer te vinden (die hangt aan G). Zie startSpot.
  stopSpot();
  const p = P();
  const s = p.settings;
  // Vragen worden nu per stuk gebouwd (zodat zwakke sommen kunnen terugkomen); vooraf enkel
  // de gouden-vraag-index kiezen: hoogstens één per optreden, ± elke 2 shows, nooit de eerste.
  const count = s.track === 'count';
  /* DE FINALE. De laatste show van een wereld is de show die zijn prijs wint, en
     tot hier speelde hij precies als show 1 tot 7. Nu eindigt hij altijd op de
     gouden vraag: het laatste vakje in de balk is vanaf de eerste vraag goud, dus
     ze ziet het slot al aankomen. Verder is hij níét anders -- niet moeilijker en
     niet langer: wie hem mist, mist de prijs van de wereld, en dat hoort aan
     dezelfde sommen te hangen als de rest. Het licht erbij staat bij bundelAan. */
  const wl = worldFor(lvl);
  const finale = wl.nr === wl.levels;
  const goldIdx = s.perLevel <= 1 ? -1
    : finale ? s.perLevel - 1
    : Math.random() < 0.5 ? rnd(1, s.perLevel - 1) : -1;
  // Extra-uitdaging-vragen (zoek-het-getal / drie getallen) vooraf inroosteren op
  // vaste plekken; de gewone vragen worden per stuk gebouwd (incl. zwakke herhaling).
  // In de telmodus komen die niet voor -- daar bouwt genCount elke vraag.
  /* De thema's van deze show (zie themaPlan): welk thema elke vraag krijgt, en
     per thema de instellingen voor de vraagmaker, met haar rij op zijn ladder
     erover (zie themaInst). Eén keer per show: een rij verandert pas in
     endLevel. inst is die van rekenen (of van het enige thema): daar lezen
     het cijferblok en de speciale vragen uit. */
  const { vragenPlan, insts, inst, plan } = count ? { vragenPlan: null, insts: null, inst: null, plan: [] } : showOpzet(p, lvl, goldIdx);
  // FASE 1: de publieksmeter is uit het spel gehaald. De teller zelf loopt stil door
  // (zie submitAnswer/endLevel): hij bepaalt nog altijd het applaus en de restbonus,
  // maar er staat geen balk meer op het scherm. G.fan/G.fanStep zijn daarmee interne
  // staat geworden -- bewust blijven staan i.p.v. de beloningen eruit te slopen.
  const fanStep = 100 / Math.max(5, s.perLevel - 1);
  G = { lvl, inst, insts, themaPlan: vragenPlan, qs: [], idx: 0, total: s.perLevel, goldIdx, plan, count, errors: 0, misses: 0, streak: 0, earned: 0, lock: false, retried: false, input: '', spot: 100, timer: null, fan: 0, fanStep, moveIdx: 0, herhaald: new Set(),
        klaarBijStart: (p.readyTrophies || []).slice(),
        missShown: 0, chainShown: 0, missDirty: false, chainDirty: false, countGood: 0, countSeen: 0,
        nieuwRij: nieuwTeTonen[cur] || null,   // wat er nieuw is sinds de vorige show (zie vraagIsNieuw)
        uitslag: [] };   // per vraag: 'goed' | 'hint' | 'mis' -- zie showBalk
  // De kop zegt hetzelfde als de kaart: welke wereld, en de hoeveelste show erin.
  // Hiervoor stond hier de stad uit CITIES -- dan wees de kaart je IJswereld binnen
  // en heette het optreden daarna "Rome". (wl staat hierboven, bij de finale.)
  $('game-lvl-label').innerHTML = `${wl.world.icon} ${esc(korteNaam(wl.world))}`
    + `<span class="world-sub">Show ${wl.nr} / ${wl.levels}</span>`;
  telNu($('game-diamonds'), p.diamonds);
  $('game-avatar-inner').innerHTML = pasLaag(avatarSVG(p, 168));
  // De zaal van deze wereld. Heeft de wereld er geen, dan geeft applyVenue false
  // terug, blijft .venue-aan eraf en is dit scherm letterlijk wat het was: het
  // podiumkader van applyStage op het app-verloop.
  applyStage($('show-stage'), p);
  $('show-stage').style.height = $('show-stage').style.width = '';   // zie zaalPast
  applyVenue($('screen-game'), wl.world, lvl);
  $('screen-game').classList.toggle('finale', finale);
  bundelAan();
  // kan er een cijferblok komen? dan houdt zij er vanaf de eerste vraag ruimte
  // voor (zie "ZIJ GROEIT MEE" in 50-zaal)
  $('screen-game').classList.toggle('met-cijfers', !count && kanTypen(s));
  $('screen-game').classList.toggle('telt', !!count);   // liggend: plaats voor 🔊 naast de kaart (zie "NAAST ELKAAR")
  if (eigenOvergang) show('screen-game');
  else toonHub('screen-game');
  renderQuestion();
}
/* Stoppen: een X sluit/onderbreekt de show. Is er nog geen voortgang (net
   gestart, nog geen vraag beantwoord of gemist), dan stopt hij meteen --
   er valt dan niets te bevestigen. Pas zodra er iets te verliezen is, vraagt
   hij het na, zodat een per-ongeluk-tik geen show kost. */
function askQuit() {
  sndClick();
  if (G && G.idx === 0 && G.errors === 0 && G.misses === 0) { quitGame(); return; }
  // hetzelfde venster vraagt het ook voor memory (zie vraagMemoryStop)
  $('quit-titel').textContent = '🎭 Show stoppen?';
  $('quit-zin').textContent = 'Dan stopt dit optreden en ga je terug naar de kaart.';
  renderGeluid();   // de geluidsrij in dit venster toont de stand van nu
  // het spotlicht wacht zolang de vraag achter dit venster staat, net als
  // wanneer de app wegvalt -- anders is hij leeg of verder als je terugkomt
  if (G && G.timer) { stopSpot(); G.spotPauze = true; }
  $('quit-modal').classList.add('open');
  syncBackGuard();
}
function closeQuitModal() {
  if (!modalDicht('quit-modal')) return;   // een tik op het schild: al dicht
  sndClick();
  if (G && G.spotPauze) {
    G.spotPauze = false;
    if (!G.lock && G.spot > 0) spotLoopt();
  }
}
function quitGame() {
  modalDicht('quit-modal');
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

/* Het licht gaat aan op haar. Bij het begin van een show, nét nadat de zaal
   ingezoomd is (enterLevel: MOTION.komNa + MOTION.kom), komt de bundel van
   boven op: van niets naar vol, en een klein stukje vanaf de lamp naar
   beneden gerekt. Eén keer per show, niet per vraag. Alleen opacity en
   transform, dus de samensteller doet het. Zonder zaal staat er geen bundel
   en doet dit niets; bij beperkte beweging is het licht er gewoon. */
const BUNDEL_AAN = { na: 220, duur: 520 };
function bundelAan() {
  const scherm = $('screen-game');
  const b = scherm.querySelector('.venue-bundel');
  if (!b || !b.animate || motionOff()) return;
  if (!scherm.classList.contains('venue-aan')) return;
  b.animate([
    { opacity: 0, transform: 'translateX(-50%) scaleY(.82)' },
    { opacity: 1, transform: 'translateX(-50%) scaleY(1)' }],
    { duration: BUNDEL_AAN.duur, delay: BUNDEL_AAN.na, easing: MOTION.uit, fill: 'backwards' });
  /* In de finale gaan daarna de twee zijbundels aan, één keer, een tel na de
     eerste: eerst het gewone licht, dan "en nu de grote". Alleen opacity -- hun
     schuine stand staat in het stijlblad (.venue-finale) en blijft van hen. */
  if (!scherm.classList.contains('finale')) return;
  scherm.querySelectorAll('.venue-finale').forEach(f => f.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: BUNDEL_AAN.duur, delay: BUNDEL_AAN.na + BUNDEL_AAN.duur, easing: MOTION.uit, fill: 'backwards' }));
}

function renderQuestion() {
  const p = P();
  const s = p.settings;
  if (!G.qs[G.idx]) {
    let built;
    if (G.count) { built = genCount(p); }             // telmodus: elke vraag lees-vrij
    else {
      const plan = G.plan[G.idx];
      if (plan && plan.type === 'miss') { built = genMissing(G.inst, G.lvl, p.perf, plan.op); G.missShown++; }
      else if (plan && plan.type === 'chain') { built = genChain(G.inst, G.lvl, p.perf); G.chainShown++; }
      else built = buildQuestion(p, G.lvl, G);
    }
    if (G.idx === G.goldIdx) built.gold = true;
    if (G.nieuwRij && vraagIsNieuw(built, G.nieuwRij)) { built.nieuw = true; G.nieuwRij = null; delete nieuwTeTonen[cur]; }
    // telmodus: kondig de gouden vraag hoorbaar aan (lees-vrij) -- de prompt wordt
    // toch alleen uitgesproken, niet getoond, dus dit dubbelt niets in beeld
    if (built.gold && G.count && built.prompt) built.prompt = 'Gouden vraag! Die geeft drie keer zoveel diamanten. ' + built.prompt;
    G.qs[G.idx] = built;
  }
  const q = G.qs[G.idx];
  // een vraag die je niet kunt typen (€1,70: geen komma op het cijferblok) is altijd kiezen,
  // en een vraag met een plaatje ook (zie PLAATJE)
  G.mode = G.count ? 'count' : q.tik ? 'tik' : q.kiezen || PLAATJE.includes(q.kind) ? 'kies' : (s.mode === 'mix' ? pick(['kies', 'typ']) : s.mode);
  G.input = '';
  G.lock = false;
  G.retried = false;
  // tikken op de lijn: liggend krijgt de lijn de brede plek (zie "NAAST ELKAAR" in 50-zaal).
  // Vóór drawQuestion: de kaart meet zijn maat op de breedte die hij nu krijgt.
  $('answer-area').parentNode.classList.toggle('lijn-tik', !!q.tik);
  $('answer-area').parentNode.classList.toggle('zoek-klok', klokZoekt(q));
  // voortgang
  showBalk(G.idx);
  drawQuestion();
  vraagKomtIn($('question-card'), G.idx === 0);
  // antwoorden
  const area = $('answer-area');
  if (G.count) {
    antwoordOpMaat(area, true);
    renderCountAnswers(q, area);
    vakVullen(area);
    zaalPast();
    goudPlek();
    spotZonderTijd();
    return;
  }
  if (q.tik) {
    area.innerHTML = lijnTikvlak(q);
    const raak = area.querySelector('.gl-raak');
    raak.onclick = e => {
      const r = raak.getBoundingClientRect(), v = lijnRaak(q, e.clientX - r.left, r.width);
      const merk = area.querySelector(`.gl-tik[data-v="${v}"]`);
      if (!merk.classList.contains('bad')) submitAnswer(v, merk);   // een streepje dat al fout was telt niet nog eens
    };
  } else if (G.mode === 'kies') {
    const choices = makeChoices(q, keuzeGrens(q, G.inst, G.lvl));
    area.innerHTML = '<div class="choices">' +
      choices.map(c => `<button class="choice-btn${q.knop ? ' ' + q.knop : ''}" data-v="${c}"${q.kind === 'klok' ? ` aria-label="${klokTekst(q, c)}"` : q.kind === 'kalender' ? ` aria-label="${toonAntwoord(q, c)}"` : ''}>${toonKeuze(q, c)}</button>`).join('') + '</div>';
    area.querySelectorAll('.choice-btn').forEach(b => {
      b.onclick = () => submitAnswer(parseInt(b.dataset.v, 10), b);
    });
  } else {
    area.innerHTML = `<div class="numpad">
      ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="num-btn" data-n="${n}">${n}</button>`).join('')}
      <button class="num-btn del" data-n="del" aria-label="Wissen">⌫</button>
      <button class="num-btn" data-n="0">0</button>
      <button class="num-btn ok" data-n="ok" aria-label="Klaar">✔</button>
    </div>`;
    area.querySelectorAll('.num-btn').forEach(b => {
      b.onclick = () => numpadPress(b.dataset.n);
    });
  }
  antwoordOpMaat(area);
  klokZoekRuim(area);
  vakVullen(area);
  zaalPast();
  goudPlek();
  startSpot();
}
/* ---- De regel van de gouden vraag, liggend ----------------------------------
   Staand staat hij gewoon onder de kaart. Liggend staat hij los (zie "NAAST
   ELKAAR"): als stuk van de rij nam hij de kaart 70 à 80px breedte af. Dan
   onder de kaart, en als de kaart tot onderaan reikt (een kalenderblad op een
   kleine telefoon) erboven. Met offsets: de vraag komt binnen met een transform. */
function goudPlek() {
  const b = $('gold-banner'), kaart = $('question-card');
  b.style.top = '';
  if (!b.textContent || getComputedStyle(b).position !== 'absolute') return;
  const onder = kaart.offsetTop + kaart.offsetHeight + 2;
  const past = onderkant(kaart) + 2 + b.offsetHeight <= window.innerHeight;
  b.style.top = (past ? onder : kaart.offsetTop - b.offsetHeight - 2) + 'px';
}
/* ---- De klok zoeken, liggend --------------------------------------------------
   Bij "zoek de klok" staan er op de kaart twee woorden (kwart voor 6), en zijn
   de vier klokjes op de knoppen wat ze echt moet lezen. Liggend staan kaart en
   knoppen naast elkaar: dan worden de knoppen zo hoog als de kaart (en de kaart
   smaller, zie .zoek-klok in 50-zaal). Staand doet vakVullen het, voor elke
   knop en niet alleen voor de klokjes. */
const klokZoekt = q => q.kind === 'klok' && q.vorm === 'zoek';
function klokZoekRuim(area) {
  const q = G.qs[G.idx], rij = area.querySelector('.choices');
  if (!klokZoekt(q) || !rij || !naastElkaar()) return;
  const h = Math.min(KNOP_MAX, Math.floor(($('question-card').offsetHeight - (parseFloat(getComputedStyle(rij).rowGap) || 0)) / 2));
  if (h > rij.firstElementChild.offsetHeight) area.style.setProperty('--knop-h', h + 'px');
}
const naastElkaar = () => getComputedStyle($('answer-area').parentNode).flexDirection === 'row';
/* ---- Eén vak voor de vraag en de knoppen ------------------------------------
   DE REGEL (staand). In een show liggen drie dingen vast: zij (plek en maat),
   de bovenkant van de kaart en de onderkant van de knoppen, waar de duim is.
   Wat daartussen ligt is één vak, even hoog voor elke vraag van de show, en
   elke vraag vult het helemaal: eerst worden de kiesknoppen hoger (tot
   KNOP_MAX), wat dan nog over is krijgt de kaart, met de vraag in het midden.
   Zo verspringt er niets, en staat er nergens een lege vlakte.
   Hiervoor kregen de kaart en het vak elk apart de maat van hun grootste
   vraag. Dan reserveert een show de zwaarste combinatie die nooit samen komt:
   een kalenderblad bóven een cijferblok. Op een telefoon van 390 was dat 549px
   voor een som met vier knoppen die er 291 nodig heeft -- een gewone som in een
   wit vlak, en zij op 108 in plaats van 180. Daarom kies je nu ook een vraag
   met een plaatje altijd (PLAATJE): het cijferblok staat nooit onder een plaatje.
   Het vak wordt één keer per show gemeten (vakMeten, en opnieuw na een resize),
   met wat er in deze show kan komen. Is een echte vraag toch groter, dan groeit
   het vak vanaf die vraag mee: liever één keer verschuiven dan een knop onder
   de rand. Liggend staan kaart en knoppen naast elkaar en houden ze elk hun
   eigen maat (kaartOpMaat, antwoordOpMaat); alleen de telmodus meet daar hier.
   Schuiven zaak E kijkt het na, voor elk thema en elke telfase. */
// geld, klok, kalender en de getallenlijn: een plaatje op de kaart, dus vier knoppen eronder
const PLAATJE = ['geld', 'klok', 'kalender', 'lijn'];
// kan er in deze show een cijferblok komen? alleen bij een som (rekenen of tafels)
const kanTypen = s => s.mode !== 'kies' && themasAan(s).some(k => !PLAATJE.includes(k));
// hoger dan dit wordt een knop een plank; een klokje erin blijft dan nog op zijn knop
const KNOP_MAX = 150;
function vakVullen(area) {
  const kaart = $('question-card'), tekst = $('question-text');
  const naast = naastElkaar();
  if (naast && !G.count) return;
  if (!naast) area.style.removeProperty('--knop-h');
  tekst.style.paddingTop = tekst.style.paddingBottom = '';
  area.style.minHeight = '';
  area.classList.remove('vast');
  if (G.vakMin == null) G.vakMin = vakMeten(area);
  const m = G.vakMin, rand = kaart.offsetHeight - tekst.offsetHeight;
  if (naast) {
    /* De telmodus liggend: de kaart en de tegels elk op hun grootste maat, net
       als de andere shows. Maar nooit hoger dan het scherm: zij krimpt hier
       niet (ze staat ernaast), en een scherm dat schuift is erger dan een kaart
       die een vraag lang een paar pixels lager begint. */
    telPast(tekst.firstElementChild, tekst.offsetHeight - m.tekst);
    telPast(area.firstElementChild, area.offsetHeight - m.vak);
    const hoog = tekst.offsetHeight;
    let lucht = Math.max(0, m.tekst - hoog);
    if (m.vak > area.offsetHeight) { area.style.minHeight = m.vak + 'px'; area.classList.add('vast'); }
    if (lucht) tekst.style.paddingTop = tekst.style.paddingBottom = lucht / 2 + 'px';
    const teHoog = () => Math.ceil(Math.max(arenaOver(), onderkant(area) + 6 - window.innerHeight, onderkant(kaart) + 6 - window.innerHeight));
    if (teHoog() > 0) {
      lucht = Math.max(0, lucht - teHoog());
      tekst.style.paddingTop = tekst.style.paddingBottom = lucht / 2 + 'px';
      if (teHoog() > 0) { area.style.minHeight = ''; area.classList.remove('vast'); }
    }
    return;
  }
  const nu = () => kaart.offsetHeight + area.offsetHeight;
  if (G.count) { telPast(tekst.firstElementChild, nu() - m.samen - rand); telPast(area.firstElementChild, nu() - m.samen - rand); }
  m.samen = Math.max(m.samen + rand, nu()) - rand;   // groter dan gemeten: het vak groeit mee
  const vak = m.samen + rand;
  const knoppen = [...area.querySelectorAll('.choice-btn')];
  if (vak > nu() && knoppen.length) {
    const rijen = new Set(knoppen.map(b => b.offsetTop)).size, h0 = knoppen[0].offsetHeight;
    const h = Math.min(KNOP_MAX, h0 + Math.floor((vak - nu()) / rijen));
    if (h > h0) area.style.setProperty('--knop-h', h + 'px');
  }
  if (vak > nu()) tekst.style.paddingTop = tekst.style.paddingBottom = (vak - nu()) / 2 + 'px';
}
/* Wat er in deze show kan komen, als paren van kaart en knoppen. Gemeten in
   de kaart en het vak zelf, niet op een kopie: een telkaart is zo breed als
   wat erin staat, en op een kopie van volle breedte bleef een rij van vijf
   bloemen op één regel die in het echt brak (52px te laag geschat). De vraag
   die er al staat gaat zolang opzij, met zijn knoppen en hun tik, en komt
   daarna terug -- alles in dezelfde taak, er wordt niets getekend.
   tekst: de hoogste vraag, vak: het hoogste antwoordvak, samen: het hoogste
   paar (zonder de rand van de kaart, die is voor elke vraag dezelfde). */
const telMaten = new Map();
function vakMeten(area) {
  /* De telmodus meet honderd kaarten (op een trage tablet een kwart seconde):
     één keer per fase, trede en schermmaat, en daarna uit het geheugen. */
  const s = P().settings, sleutel = G.count && [kiesFasen(s).join(',') || countLiveStage(P()), P().countTrack.rung, innerWidth, innerHeight, s.repr, s.numerals, s.qmax].join('|');
  if (sleutel && telMaten.has(sleutel)) return { ...telMaten.get(sleutel) };
  const m = vakMetenNu(area);
  if (sleutel) telMaten.set(sleutel, { ...m });
  return m;
}
function vakMetenNu(area) {
  const tekst = $('question-text');
  const weg = [tekst, area].map(el => {
    const f = document.createDocumentFragment();
    while (el.firstChild) f.appendChild(el.firstChild);
    return { el, f, cls: el.className, font: el.style.fontSize };
  });
  tekst.classList.remove('lang', 'langer');
  tekst.style.fontSize = '';
  /* Alle proeven tegelijk, elk in een eigen blokje onder elkaar: één keer
     opmaken in plaats van één keer per proef (een telfase heeft er honderd).
     De kaart wordt dan zo breed als de breedste, maar een proef die alleen
     niet breekt, breekt in een bredere kaart ook niet. */
  const rand = el => { const c = getComputedStyle(el); return ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'].reduce((n, k) => n + parseFloat(c[k]), 0); };
  const hoogten = (el, html) => {
    el.innerHTML = html.map(h => `<div style="display:flow-root">${h}</div>`).join('');
    const r = rand(el);
    return [...el.children].map(d => d.offsetHeight + r);
  };
  const proeven = vakProeven();
  const a = hoogten(tekst, proeven.map(([k]) => k.replace('@', '<span class="q-blank">?</span>')));
  const b = hoogten(area, proeven.map(([, v]) => v));
  const m = { tekst: Math.max(0, ...a), vak: Math.max(0, ...b), samen: Math.max(0, ...a.map((h, i) => h + b[i])) };
  for (const { el, f, cls, font } of weg) { el.innerHTML = ''; el.appendChild(f); el.className = cls; el.style.fontSize = font; }
  if (G.count) m.samen = m.tekst + m.vak;   // de telmodus meet kaarten en tegels apart (zie telProeven)
  return m;
}
function vakProeven() {
  const knoppen = (k, n) => Array(n).fill(`<button class="${k}">8</button>`).join('');
  if (G.count) { const t = telProeven(); return [...t.kaarten.map(k => [k, '']), ...t.tegels.map(v => ['', v])]; }
  const vier = `<div class="choices">${knoppen('choice-btn', 4)}</div>`, s = P().settings;
  // een som, met het cijferblok als dat kan; en elk plaatje met vier knoppen
  const uit = [['88 + 88 = @', kanTypen(s) ? `<div class="numpad">${knoppen('num-btn', 12)}</div>` : vier],
    ...kaartProeven(G.insts || {}).map(k => [k, vier])];
  if (G.insts && G.insts.lijn) uit.push(['<span class="kal-rij"><span class="kal-kaart nu gl-zoek">88</span></span>', lijnTikvlak({ bereik: [0, 20, 1, 5] })]);
  return uit;
}
/* De telmodus. telVormen geeft elke kaart en elke rij tegels die in deze fase
   kan komen. De tegels allemaal; maar kaarten zijn er in een fase tot
   tweehonderd, en ze allemaal opmaken kostte op een trage tablet een halve
   seconde bij het begin van een show. Dus van de kaarten de grootste aantallen
   (meestal de hoogste kaart), en een greep uit de rest. Is een echte vraag dan toch hoger dan het vak, dan
   krimpt zijn inhoud een tikje (telPast) in plaats van dat het vak groeit:
   een kaart die een vraag lang wat kleiner tekent, is beter dan een zaal die
   verspringt -- dat zag de CI met 600 getrokken vragen nog (11 tot 34px). */
const TEL_PROEVEN = 24;
function telProeven() {
  const v = telVormen(P());
  const maat = o => (JSON.stringify(o).match(/\d+/g) || []).reduce((n, d) => n + +d, 0);
  const kaarten = [...new Map(v.kaarten.map(o => [telKaartHTML(o), o])).entries()];
  const groot = kaarten.slice().sort((a, b) => maat(b[1]) - maat(a[1])).slice(0, TEL_PROEVEN / 2);
  return {
    kaarten: [...new Set([...groot, ...shuffle(kaarten).slice(0, TEL_PROEVEN / 2)].map(([h]) => h))],
    tegels: [...new Set(v.tegels.map(telTegelsHTML))],
  };
}
/* Een telkaart of een rij tegels die teveel px hoger is dan het vak: zijn
   inhoud krimpt (zoom, dus hij neemt ook minder plaats in), tot TEL_KRIMP. */
const TEL_KRIMP = 0.75;
function telPast(el, teveel) {
  if (!el || teveel <= 0 || !el.offsetHeight) return;
  el.style.zoom = Math.max(TEL_KRIMP, (el.offsetHeight - teveel) / el.offsetHeight);
}
/* ---- Alles past -------------------------------------------------------------
   Steekt de vraag of het antwoord onder het scherm uit, dan krimpt zij (de
   zaal boven de som) tot het past: zij is decor, een knop die je niet kunt
   raken is een kapotte show. Dat gebeurde met een getallenlijn of een
   kalenderblad op de kaart en het cijferblok eronder, op een telefoon tot 58px.
   Alleen krimpen, nooit terug groeien, en per show (startLevel zet het terug):
   de kaart en het vak houden al de maat van hun grootste vraag (kaartOpMaat,
   antwoordOpMaat), dus meestal is het bij de eerste vraag meteen goed en
   verspringt er daarna niets meer. Liggend staat zij naast de som (zie
   "NAAST ELKAAR" in 50-zaal); daar helpt krimpen niet, en dan doet het niets.
   Schuiven zaak F kijkt na dat elk antwoord van elk thema in beeld staat.

   HAAR GEZICHT BLIJFT VRIJ. De hint en de 🤔 hangen vlak onder de kop
   (.toast.docked). Staat zij hoog -- in de telmodus, of in een show met een klok
   of een kalender, waar de kaart groter is -- dan viel die pil op haar gezicht,
   en daarmee ook haar "oeps"-gezicht. Dus moeten haar ogen onder de pil
   staan (haar haar en haar kroon mogen eronder). De zaal staat onderaan vast (align-content: flex-end), dus een
   kleinere zaal zet haar hoofd lager: zoveel kleiner als daarvoor nodig is
   (tot GEZICHT_KRIMP). De pil hangt daarvoor in de show zo hoog als het kan,
   vlak onder de kop (--dock-top).
   PIL_HOOG is de hoogste pil (de 🤔); schuiven zaak Z kijkt het na. */
const ZAAL_MIN = 44;   // kleiner wordt ze een stipje; dan liever iets onder de rand (zaak F ziet dat)
const PIL_HOOG = 72;
// het bovenste stuk van haar hoofd is haar: daar mag de pil op, op haar ogen niet
const HAAR = 0.3;
// voor haar gezicht krimpt ze hoogstens tot zoveel van haar maat: op een kleine
// telefoon is er geen plaats, en een stipje onder de pil is erger dan een pil op haar ogen
const GEZICHT_KRIMP = 0.6;
function zaalPast() {
  const zaal = $('show-stage'), area = $('answer-area');
  if (!zaal.offsetHeight || onderkant(zaal) > onderkant($('question-card')) - $('question-card').offsetHeight) return;   // ze staat niet erboven
  if (G.zaalVol == null) G.zaalVol = zaal.offsetHeight;   // haar maat bij het begin van de show: daar telt GEZICHT_KRIMP van
  const zet = h => {
    h = Math.max(ZAAL_MIN, h);
    if (h >= zaal.offsetHeight) return false;
    zaal.style.height = h + 'px';
    zaal.style.width = Math.round(h * 1.19) + 'px';
    return true;
  };
  const laatste = [...area.querySelectorAll('button, .gl-vlak')].reduce((m, el) => Math.max(m, onderkant(el)), onderkant(area));
  /* En de zaal zelf mag niet schuiven: onder de laatste knop houdt de arena
     nog zijn eigen rand (en het scherm de zijne). Telde alleen de knop, dan
     stond die netjes 6px boven de rand maar schoof het scherm nog 24px op
     onder je vinger -- in de telmodus op elke hoge telefoon. Gemeten met
     offsets, niet met scrollHeight: de vraag komt binnen met een transform. */
  zet(zaal.offsetHeight - Math.ceil(Math.max(laatste + 6 - window.innerHeight, arenaOver())));
  /* Het gezicht. Een kleinere zaal zet haar ogen lager, maar de onderkant van
     de zaal blijft niet altijd staan (de som schuift soms mee omhoog): dus
     opnieuw meten na elke stap, tot drie keer. Alles in dezelfde taak, vóór
     er iets getekend is -- er krimpt niets zichtbaar. */
  for (let i = 0; i < 3 && zet(gezichtVrij(zaal)); i++);
}
// hoeveel de arena onder het scherm uitsteekt, met de rand van het scherm erbij (zie zaalPast)
function arenaOver() {
  const sg = $('screen-game'), arena = sg.querySelector('.game-arena');
  if (!arena) return 0;
  const schermOnder = onderkant(sg) - sg.offsetHeight + sg.clientHeight;
  return onderkant(arena) + (parseFloat(getComputedStyle(sg).paddingBottom) || 0) - schermOnder;
}
const onderkant = el => { let y = 0; for (let e = el; e; e = e.offsetParent) y += e.offsetTop; return y + el.offsetHeight; };
// Hoe hoog de zaal mag zijn zodat haar ogen onder de pil staan; Infinity als dat al zo is.
function gezichtVrij(zaal) {
  const pop = $('game-avatar-inner'), hoofd = zaal.querySelector('.av-hoofd'), svg = hoofd && hoofd.ownerSVGElement, toast = $('toast');
  if (!pop || !svg || !svg.viewBox.baseVal || !toast) return Infinity;
  /* Zonder één rechthoek: bij de eerste vraag komen de zaal en zij nog binnen
     (geschaald, en zij wiegt), en dan meet je een tussenstand. Dus uit de
     offsets van haar doos, en haar hoofd in de tekening zelf (getBBox, in de
     maat van de viewBox -- de svg is zo hoog als haar doos). k: hoe ver haar
     ogen boven de onderkant van de zaal staan, in zaalhoogtes. */
  const vb = svg.viewBox.baseVal, b = hoofd.getBBox();
  const ogen = onderkant(pop) - pop.offsetHeight + (b.y + b.height * HAAR - vb.y) / vb.height * pop.offsetHeight;
  const pil = parseFloat(getComputedStyle(toast).getPropertyValue('--dock-top')) + PIL_HOOG + 4;
  const bodem = onderkant(zaal), k = (bodem - ogen) / zaal.offsetHeight;
  if (ogen >= pil || k <= 0) return Infinity;
  return Math.max(Math.floor(G.zaalVol * GEZICHT_KRIMP), Math.floor((bodem - pil) / k));
}
/* ---- Het antwoordvak springt ook niet ---------------------------------------
   Typen geeft het cijferblok, kiezen vier knoppen, en een show kan die
   afwisselen: een som typ je, maar een klok of een dag kies je altijd (en
   "allebei" kiest per vraag). Het cijferblok is vier rijen, de knoppen twee:
   op een telefoon schoof de kaart bij elke wissel 86px op, en zij kromp en
   groeide mee. Dat was de "sprong" uit de speeltest.
   Nu houdt het vak de hele show de hoogte van het hoogste van de twee, en
   staat wat kleiner is in het midden -- net als de kaart (zie kaartOpMaat).
   Ook bij alleen kiezen: de getallenlijn heeft een lijn om op te tikken en
   Afronden twee knoppen (zie antwoordMeten). Gemeten op een onzichtbare kopie,
   één keer per show en opnieuw na een resize. */
function antwoordOpMaat(area, los) {
  area.style.minHeight = '';
  area.classList.remove('vast');
  if (los || !naastElkaar()) return;   // de telmodus, en staand: zie vakVullen
  if (G.antwoordMin == null) G.antwoordMin = antwoordMeten(area);
  if (!G.antwoordMin) return;
  area.style.minHeight = G.antwoordMin + 'px';
  area.classList.add('vast');
}
function antwoordMeten(area) {
  const kopie = area.cloneNode(false);
  kopie.removeAttribute('id');
  Object.assign(kopie.style, { position: 'absolute', visibility: 'hidden', left: '0', top: '0', minHeight: '', width: area.clientWidth + 'px' });
  area.parentNode.appendChild(kopie);
  const hoog = html => { kopie.innerHTML = html; return kopie.offsetHeight; };
  const knop = (k, n) => Array(n).fill(`<button class="${k}">8</button>`).join('');
  /* wat er in deze show kan komen: vier knoppen altijd, het cijferblok als er
     getypt kan worden, de lijn om op te tikken als de getallenlijn meedoet. In
     een show met alleen knoppen viel Afronden (twee knoppen) of de lijn er
     eerst buiten, en schoof de kaart 38 à 45px. */
  const vormen = [`<div class="choices">${knop('choice-btn', 4)}</div>`];
  if (kanTypen(P().settings)) vormen.push(`<div class="numpad">${knop('num-btn', 12)}</div>`);
  let hoogste = Math.max(...vormen.map(hoog));
  if (G.insts && G.insts.lijn) {
    // de lijn om op te tikken krijgt liggend een breder vak (lijn-tik, zie "NAAST ELKAAR"): op die breedte meten
    const paneel = area.parentNode, was = paneel.classList.contains('lijn-tik');
    paneel.classList.add('lijn-tik');
    kopie.style.width = area.clientWidth + 'px';
    hoogste = Math.max(hoogste, hoog(lijnTikvlak({ bereik: [0, 20, 1, 5] })));
    paneel.classList.toggle('lijn-tik', was);
  }
  kopie.remove();
  return hoogste;
}
/* Een nieuwe vraag komt binnen in plaats van te verspringen: 140ms, alleen
   opacity + een duwtje omhoog. Dat is het "en nu de volgende" van het goede
   antwoord dat er net was -- geen overgang, een aankondiging. Alleen in een
   zaal (.venue-aan); zonder zaal staat de kaart er gewoon.

   Met een eigen Animation en niet meer met een klasse die eraf en er weer op
   gaat. Die klasse herstartte via "void kaart.offsetWidth", en dat dwingt de
   browser de hele opmaak uit te rekenen midden in de tik. Bij de eerste vraag
   is dat de tik op de halte, op een scherm dat show() net aanzette: gemeten
   127ms van die tik op een zesvoudig gesmoorde processor, de grootste post van
   de hele overgang. Hier wordt niets opgevraagd; de vorige animatie stoppen we
   omdat we hem zelf bijhouden (net als schermAnim).

   fill 'both', net als de CSS-animatie hiervoor: de kaart blijft na afloop op
   zijn eindstand staan, en daarmee op een eigen laag. Met 'backwards' viel hij
   daar na 140ms van af, en dan tekent de browser de som net anders -- genoeg om
   het getal dat erin vliegt (somVult) af en toe ruim een pixel naast het vakje
   te laten landen. test/maths.test.js meet precies dat.

   metScherm: de eerste vraag van een show. Die komt binnen met het hele scherm
   (de zaal groeit uit de halte, of de stille wissel), en een tweede opkomst
   daarbinnen is er één te veel: de kaart stond dan doorzichtig in een zaal die
   zelf nog binnenkwam. Hij krijgt wél dezelfde animatie, maar dan van rust naar
   rust -- zo staat ook de eerste som op zijn eigen laag, zie hierboven. */
const VRAAG_IN = 140;
let vraagInAnim = null;
function vraagKomtIn(kaart, metScherm) {
  if (vraagInAnim) { vraagInAnim.cancel(); vraagInAnim = null; }
  if (!kaart || !kaart.animate || motionOff()) return;
  if (!$('screen-game').classList.contains('venue-aan')) return;
  const rust = { opacity: 1, transform: 'none' };
  vraagInAnim = kaart.animate(
    [metScherm ? rust : { opacity: 0, transform: 'translateY(7px)' }, rust],
    { duration: VRAAG_IN, easing: MOTION.uit, fill: 'both' });
}
/* De kaart schudt kort "nee" bij een misser.

   Dit was een CSS-klasse (.wobble), en die deed niets meer: vraagKomtIn laat
   hierboven met opzet een animatie met fill 'both' op de kaart staan, en een
   animatie uit het script gaat altijd vóór een CSS-animatie. De kaart bleef dus
   op transform none staan terwijl de klasse er netjes op zat. Nu is het schudje
   zelf ook een animatie uit het script, en omdat hij later begint dan de opkomst,
   wint hij -- en daarna valt de kaart terug op diezelfde rusttand. */
const WIEBEL = 420;
function kaartWiebelt(kaart) {
  if (!kaart || !kaart.animate || motionOff()) return;
  kaart.animate([
    { transform: 'rotate(0) scale(1)' },
    { transform: 'rotate(-2.4deg) scale(.985)', offset: .25 },
    { transform: 'rotate(2deg) scale(.995)', offset: .6 },
    { transform: 'rotate(-1deg)', offset: .85 },
    { transform: 'rotate(0) scale(1)' },
  ], { duration: WIEBEL, easing: 'ease' });
}
/* De balk van de show zegt ook HOE een vraag ging, want dat is waar de sterren
   op staan: drie sterren is geen enkele misser, ook geen eerste die je daarna
   goed maakte. Elk vakje zegt dus hoe die vraag ging:
     goud           in één keer goed
     half goud      goed na een hint
     leeg (rand)    gemist
   Een rijtje helemaal goud is meteen ook "3 op een rij", zonder meter erbij.
   En de gouden vraag heeft van bij de start een gouden rand om zijn vakje,
   zodat er iets is om naar uit te kijken; zodra hij aan de beurt is, is de
   kaart zelf goud en gaat de rand eraf.
   Dit is de enige meter van de show. Er stonden drie hartjes naast, maar die
   telden alleen de lege vakjes nog eens -- en spraken de balk tegen: drie
   volle hartjes en toch twee sterren, omdat een hint wél een ster kost en geen
   hartje. Een hart betekent elders in het spel ook iets anders (je wens). */
function showBalk(done, hasNow) {
  const el = $('qprogress');
  renderSegBar(el, G.total, done, hasNow);
  [...el.children].forEach((seg, i) => {
    if (i < done && G.uitslag[i] && G.uitslag[i] !== 'goed') seg.classList.add(G.uitslag[i]);
    if (i === G.goldIdx && i > G.idx) seg.classList.add('goudvraag');
  });
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
// de vragen waar het antwoord in de regel van de som valt (zie het meten in drawQuestion)
const SOM_SOORTEN = ['classic', 'missing', 'chain', 'bouw', 'geld'];
function drawQuestion() {
  const q = G.qs[G.idx];
  $('question-card').classList.toggle('golden', !!q.gold);
  $('question-card').classList.toggle('nieuw', !!q.nieuw);
  $('question-card').classList.toggle('zonder-tijd', !!G.count);   // telmodus: geen spotlight-balk
  // telmodus is lees-vrij: geen tekstbanner maar een emoji-signaal (de gesproken
  // "Gouden vraag!"-aankondiging zit in de vraag-prompt, zie renderQuestion)
  // Overal hetzelfde, lees-vrije gouden-vraag-signaal (emoji voorop, ook in de rekenmodus).
  $('gold-banner').textContent = q.gold ? '🌟 3× 💎 🌟' : '';
  // "nog eens voorlezen" hoort alleen bij de lees-vrije telmodus (in de rekenmodus
  // staat de som gewoon te lezen en wordt er niets uitgesproken, zie stemAan)
  $('btn-replay').style.display = G.count ? 'flex' : 'none';
  somVluchtWeg();   // een getal dat nog naar de vorige som vloog, hoort daar niet meer bij
  if (G.count) {
    // de maat van een som uit een vorige show hoort niet bij een telvraag (zie kaartOpMaat)
    $('question-text').style.paddingTop = $('question-text').style.paddingBottom = $('question-text').style.fontSize = '';
    drawCountQuestion(q);
    return;
  }
  /* Typen begint met hetzelfde ?-vakje als kiezen, en de cijfers komen erin.
     Leeg was het hier een dun streepje (een leeg vakje klapt dicht), en dan zag
     de som er in de typmodus anders uit dan in de kiesmodus -- terwijl het
     dezelfde vraag is. */
  const shown = G.mode === 'typ' ? (G.input || '?') : '?';
  // q.html: een vraag met meer dan tekst (getallen bouwen); anders de som zelf
  $('question-text').innerHTML = (q.html || q.tmpl).replace('@', `<span class="q-blank">${shown}</span>`);
  /* Tot 1000 wordt een som langer (368 = ▢ + 60 + 8, 130 + 240 + 310 = ▢):
     valt hij in twee regels uiteen, dan een maat kleiner. Gemeten, niet
     geteld -- de breedte hangt aan het scherm, de letter en de kleurtjes. Op
     de onderkant van elk stukje, want het vakje is hoger dan de cijfers. */
  const tekst = $('question-text');
  tekst.classList.remove('lang', 'langer');
  tekst.style.fontSize = '';
  const rij = document.createRange();
  rij.selectNodeContents(tekst.querySelector('.pl-som') || tekst);   // de blokken staan erboven
  const breekt = () => {
    const onder = [...rij.getClientRects()].map(r => r.bottom);
    return Math.max(...onder) - Math.min(...onder) > parseFloat(getComputedStyle(tekst).fontSize) / 2;
  };
  /* Een regel die per bouw op één regel blijft (.een-regel, zoals het
     aanvullen bij geld: kaartje + € ? = briefje) breekt niet maar loopt over;
     zijn stukjes hebben elk een andere onderkant, en dan las breekt() hem als
     twee regels en kromp hij voor niets. */
  const eenRegel = tekst.querySelector('.een-regel');
  const telt1 = eenRegel ? () => eenRegel.scrollWidth > eenRegel.clientWidth : breekt;
  /* Gemeten mét het antwoord erin, en niet alleen met het vraagteken: "400 +
     500 = ?" past op een telefoon van 390 nog net op één regel, "400 + 500 =
     900" niet meer. Dan brak de som pas als het antwoord erin viel, groeide de
     kaart 60px en sprong zij omhoog -- bij elk goed antwoord (in Typen kromp
     de letter halverwege). Nu kiest de som zijn maat voor allebei, en ziet hij
     er voor en na hetzelfde uit. Alleen bij sommen en geld: bij de klok en de
     kalender staat het vakje in een kaartje met een eigen vaste maat. */
  const vak = SOM_SOORTEN.includes(q.kind) ? tekst.querySelector('.q-blank') : null;
  const proef = vak ? [shown, toonAntwoord(q, q.ans)] : [];
  const telt = () => !vak ? telt1() : proef.some(t => { vak.textContent = t; return telt1(); });
  for (const maat of ['lang', 'langer']) if (telt()) tekst.classList.add(maat);
  // en past het dan nog niet (een kleine telefoon liggend: de kaart is 40vw), dan per stapje kleiner
  if (vak) for (let i = 0, f = parseFloat(getComputedStyle(tekst).fontSize); i < 6 && telt(); i++) tekst.style.fontSize = (f *= .9) + 'px';
  if (vak) vak.textContent = shown;
  kaartOpMaat(tekst);
  // ⌫ en ✔ slapen tot er iets getypt is: een ✔ die er klaar uitziet maar niets
  // doet, is een knop die liegt (zie .numpad.heeft in het stijlblad)
  const pad = document.querySelector('#answer-area .numpad');
  if (pad) pad.classList.toggle('heeft', G.mode === 'typ' && G.input !== '');
}
/* ---- De kaart springt niet -------------------------------------------------
   Een som is één regel, maar munten zijn er twee en een klok is hoog: in een
   show die die mengt, groeide en kromp de kaart bij elke vraag (op een
   telefoon tussen 119 en 247 px), en zij sprong mee omhoog en omlaag, onder
   haar lichtbundel uit. Nu is de kaart de hele show zo hoog als de hoogste
   vraag die in déze show kan komen, en staat wat kleiner is in het midden.

   Gemeten en niet geteld: hoe hoog munten zijn hangt aan het scherm, de letter
   en of vijf stukken nog op één regel passen. Eén keer per show (en opnieuw na
   een resize), op een onzichtbare kopie met dezelfde breedte, met per rij van
   geld en klok de grootste vraag die hij kan maken (kaartProeven). Een show
   met alleen sommen meet niets en blijft zoals hij was -- ook de getallen
   bouwen met hun blokken, die daar al bij de sommen horen. */
function kaartOpMaat(tekst) {
  tekst.style.paddingTop = tekst.style.paddingBottom = '';
  if (!naastElkaar()) return;   // staand vult vakVullen de kaart, samen met de knoppen
  if (G.kaartMin == null) G.kaartMin = kaartMeten(tekst);
  const over = G.kaartMin - tekst.offsetHeight;
  if (over > 0) tekst.style.paddingTop = tekst.style.paddingBottom = over / 2 + 'px';
}
function kaartMeten(tekst) {
  const proeven = kaartProeven(G.insts || {});
  if (!proeven.length) return 0;
  /* Op de breedte die de kaart hoogstens krijgt, niet die van nu: de kaart
     is zo breed als wat erin staat, en na een smalle som liepen vijf
     briefjes op de kopie over vijf regels. */
  const kaart = tekst.parentNode, cs = getComputedStyle(kaart);
  const rand = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].reduce((n, k) => n + parseFloat(cs[k]), 0);
  const kopie = tekst.cloneNode(false);
  kopie.removeAttribute('id');
  // liggend staat de kaart naast de antwoorden en heeft hij een vaste breedte (zie "NAAST ELKAAR")
  const naast = getComputedStyle(kaart.parentNode).flexDirection === 'row';
  /* liggend maakt een tik op de lijn of de klok zoeken de kaart smaller: meet
     op de gewone breedte, anders houdt een show die daarmee begint een te hoge kaart */
  const smal = ['lijn-tik', 'zoek-klok'].filter(k => kaart.parentNode.classList.contains(k));
  kaart.parentNode.classList.remove(...smal);
  Object.assign(kopie.style, { position: 'absolute', display: 'flow-root', visibility: 'hidden', left: '0', top: '0', width: (naast ? kaart.offsetWidth : kaart.parentNode.clientWidth) - rand + 'px' });
  tekst.parentNode.appendChild(kopie);
  const hoogste = Math.max(...proeven.map(html => {
    kopie.innerHTML = html.replace('@', '<span class="q-blank">?</span>');
    return kopie.offsetHeight;
  }));
  kopie.remove();
  kaart.parentNode.classList.add(...smal);
  return hoogste;
}
// De grootste vraag per rij: zoveel stukken als er kunnen liggen, van de breedste soort; en de klok lezen én zoeken.
function kaartProeven(insts) {
  const uit = [];
  if (insts.geld) insts.geld.rijen.forEach(r => uit.push(r.terug ? genGeld(r).html
    : `<span class="geld-rij">${Array(r.stuks).fill(r.briefje ? 1000 : 200).map(geldStuk).join('')}</span><span class="pl-som">€ @</span>`));
  // en een paar echte: briefjes en munten door elkaar lopen op een smalle kaart (liggend) anders af
  if (insts.geld) insts.geld.rijen.forEach(r => { if (!r.terug) for (let i = 0; i < 20; i++) uit.push(genGeld(r).html); });
  if (insts.klok) insts.klok.rijen.forEach(r => uit.push(genKlok(r, 'lees').html, genKlok(r, 'zoek').html));
  // de kalender: elke vorm een paar keer, want een maand met zes weken is een rij hoger
  if (insts.kalender) insts.kalender.rijen.forEach(r => { for (let i = 0; i < 8; i++) uit.push(genKalender(r, i % 2 ? 'zoek' : 'lees').html); });
  if (insts.lijn) insts.lijn.rijen.forEach(r => { for (let i = 0; i < 8; i++) uit.push(genLijn(r, i % 2 ? 'zoek' : 'lees').html); if (r.sprong) uit.push(...lijnHoogste()); });
  return uit;
}
addEventListener('resize', () => { if (G) G.kaartMin = G.antwoordMin = G.vakMin = G.zaalVol = null; $('show-stage').style.height = $('show-stage').style.width = ''; });
function numpadPress(n) {
  if (!G || G.lock) return;
  if (n === 'del') { if (G.input === '') return; G.input = G.input.slice(0, -1); sndClick(); }
  else if (n === 'ok') { if (G.input !== '') submitAnswer(parseInt(G.input, 10), null); return; }
  else if (G.input.length < (G.inst && G.inst.max >= 1000 ? 4 : 3)) { G.input += n; sndClick(); }   // 500 + 500 = 1000
  else return;
  drawQuestion();
  // het getikte cijfer landt in het vakje: een kleine plop, zodat de tik
  // ergens aankomt en niet alleen een getal verandert
  if (n !== 'del') { const vak = document.querySelector('#question-text .q-blank'); if (vak) vak.classList.add('tikt'); }
}
document.addEventListener('keydown', e => {
  if (!G || G.lock) return;
  if (!$('screen-game').classList.contains('active')) return;
  if (G.mode !== 'typ') return;
  if (e.key >= '0' && e.key <= '9') numpadPress(e.key);
  else if (e.key === 'Backspace') numpadPress('del');
  else if (e.key === 'Enter') numpadPress('ok');
});

/* Spotlight-bonus: het gouden randje onderin de somkaart dooft langzaam. Wie in
   één keer goed antwoordt vóór het uit is, krijgt +1 💎 en een luider publiek;
   daarnaast meet de adaptieve motor ermee of een som "vlot" ging (fastEnough) --
   dat meten staat los van wat de balk laat zien.

   SPOT_DUUR is hoe lang de bonus loopt. De eerste SPOT_RUST daarvan staat de balk
   vol en stil: niemand hoort zich opgejaagd te voelen op het moment dat de som
   er net staat. Daarna dooft hij over de rest. Alleen het beeld wacht; G.spot
   loopt vanaf het begin, dus "vlot" (binnen ~6 seconden) is niet veranderd.

   In de telmodus is er geen balk en geen klok (zie spotZonderTijd): daar wordt de
   vraag hardop voorgelezen -- bij meetellen met acht dingen al zo'n vijf en een
   halve seconde -- en liep de balk leeg terwijl het spel nog aan het praten was.
   De telmodus meet geen tempo, dus de klok deed daar niets dan de bonus afpakken.

   De teller hangt aan G (de show die nu loopt), en stopSpot kan hem dus alleen
   nog vinden zolang díe G er staat. Vervangt er iets G zonder eerst te stoppen,
   dan is de teller niet meer te bereiken maar loopt hij wel door. Vroeger was
   dat een setInterval (elke 100ms, tot het tabblad dicht ging, en na het
   eindscherm met een fout erbij); nu is het één setTimeout aan het eind, maar
   de regel blijft: de tik kijkt eerst of hij nog bij de huidige show hóórt en
   doet anders niets. startLevel zet er nog een slot voor (zie daar), maar dit
   is het vangnet eronder.

   EÉN ANIMATIE, GEEN TIKKENDE KLOK. Hier liep een setInterval van 100ms die
   elke tik G.spot verlaagde en de balk een nieuwe stand gaf. Dat was tien keer
   per seconde werk op de hoofddraad -- een stijlronde, een nieuw beeldje --
   de hele vraag lang, en een vraag is waar een kind het meeste van zijn tijd
   doorbrengt. Gemeten (4x vertraagd, telefoon): ~210 ms per seconde bezig
   tijdens een vraag, waar elk ander stilstaand scherm op 3 à 4 zit. Nu draait
   de balk als één animatie van de browser (spotAnim) en wordt G.spot pas
   uitgerekend als iemand hem nodig heeft: op het moment dat de klok stopt
   (stopSpot, bij elk antwoord) uit de verstreken tijd. Dezelfde lijn als
   vroeger -- 100 bij de start, 0 na SPOT_DUUR -- alleen zonder de trapjes van
   100ms ertussen. */
/* De balk schuift, hij krimpt niet. Hij is altijd even breed als zijn rail en
   schuift er naar links uit (de rail snijdt af, zie .spot-rail). Hier stond
   style.width, en een breedte die verandert laat de browser elk beeldje
   opnieuw opmeten en tekenen: tien keer per seconde een nieuwe breedte, met
   een overgang van .1s ertussen, dus eigenlijk elk beeldje, de hele vraag lang
   -- en op dezelfde draad die de tik op het antwoord moet afhandelen. Een
   verschuiving doet de grafische kaart alleen. Het rechtereind is hetzelfde
   ronde eind als eerst; het linkereind is de ronding van de rail.

   Behalve bij de gouden vraag: daar krimpt hij nog zoals altijd. Zijn balk is
   een kleurverloop, en dat hoort mee te krimpen -- van licht naar donker over
   wat er nog over is. Schuiven zou alleen het donkere eind laten zien. Het is
   één vraag per show, en die kaart moet elk beeldje toch al opnieuw getekend
   worden voor zijn eigen gloed (goldGlow). drawQuestion zet .golden vóór
   startSpot, dus hier staat al vast welke van de twee het is. */
/* ZACHT VERTREKKEN. De balk stond SPOT_RUST lang vol en doodstil, en schoot
   dan in één beeldje op volle snelheid weg -- "hij begint uit het niets", zei
   Max. Twee dingen nu, en allebei alleen in het beeld (G.spot loopt rechtlijnig
   als altijd, dus de bonus en "vlot" zijn niet veranderd):
   - bij elke nieuwe som vult de balk zich eerst van links naar rechts
     (SPOT_VUL): dát is het moment waarop de klok begint, en je ziet het;
   - na de rust zet hij zachtjes aan in plaats van te springen (spotZicht: begint
     op snelheid nul, eindigt op de gewone) en is hij leeg op precies SPOT_DUUR,
     het moment waarop de +1 💎 vervalt.
   De animatie en zetSpot rekenen allebei met spotZicht, zodat de balk bij een
   antwoord blijft staan waar hij was. De curve gaat als een rij keyframes mee en
   niet als CSS linear(): die kent een oude tablet niet. */
const SPOT_DUUR = 12000;   // ms: zo lang loopt de spotlight-bonus
const SPOT_RUST = 4000;    // ms: zo lang staat de balk eerst vol en stil
const SPOT_VUL = 450;      // ms: zo lang vult de balk zich bij een nieuwe som
let spotAnim = null;       // de lopende balk-animatie; er is maar één balk
// hoeveel van de balk er te zien is (1..0) na t ms klok -- zonder het vullen
function spotZicht(t) {
  if (t <= SPOT_RUST) return 1;
  if (t >= SPOT_DUUR) return 0;
  const u = (t - SPOT_RUST) / (SPOT_DUUR - SPOT_RUST);
  return 1 - (2 * u * u - u * u * u);
}
function spotGouden() { return $('question-card').classList.contains('golden'); }
// één stand van de balk als stijl: v = 1 vol, 0 leeg
function spotStand(v) {
  return spotGouden() ? { width: (v * 100) + '%' } : { transform: `translateX(${v * 100 - 100}%)` };
}
/* zacht = er schuift iets zichtbaars (de misser: de balk zakt weg). De balk
   heeft geen CSS-overgang meer: een overgang gaat in de cascade vóór een
   animatie uit het script, en liet de balk bij een nieuwe som eerst 100ms
   van leeg naar vol flitsen voordat het vullen kon beginnen. */
function zetSpot(pct, zacht) {
  const balk = $('spotlight-bar');
  const van = zacht && balk.animate && !motionOff() ? getComputedStyle(balk) : null;
  const vorig = van && { transform: van.transform, width: van.width };
  const v = spotZicht((1 - pct / 100) * SPOT_DUUR);
  if (spotGouden()) {
    balk.style.transform = '';
    balk.style.width = (v * 100) + '%';
  } else {
    balk.style.width = '';
    balk.style.transform = `translateX(${v * 100 - 100}%)`;
  }
  if (vorig) {
    const naar = spotStand(v);
    const begin = spotGouden() ? { width: vorig.width } : { transform: vorig.transform };
    balk.animate([begin, naar], { duration: 220, easing: MOTION.uit });
  }
}
function startSpot() {
  stopSpot();
  if (spotAnim) { spotAnim.cancel(); spotAnim = null; }   // van een show die niet gestopt werd
  G.spot = 100;
  zetSpot(100);
  spotLoopt(!motionOff());
}
/* Laat de klok lopen vanaf G.spot: bij startSpot is dat 100, na een pauze (de
   app was weg, of het Stoppen?-venster stond open, zie hieronder) de stand waar
   hij stilstond. De animatie springt dan naar hetzelfde punt op haar lijn, dus
   de balk loopt verder waar hij was. vullen = een nieuwe som: eerst vol lopen. */
function spotLoopt(vullen) {
  const al = (1 - G.spot / 100) * SPOT_DUUR;   // ms die er al af zijn
  G.spotStart = performance.now() - al;
  const balk = $('spotlight-bar');
  if (balk && balk.animate) {
    const kf = [];
    if (vullen) {
      // van leeg naar vol, uitlopend (dezelfde 1-(1-u)^3 als MOTION.uit ongeveer)
      for (let i = 0; i <= 6; i++) {
        const u = i / 6;
        kf.push({ ...spotStand(1 - Math.pow(1 - u, 3)), offset: u * SPOT_VUL / SPOT_DUUR });
      }
    } else kf.push({ ...spotStand(1), offset: 0 });
    kf.push({ ...spotStand(1), offset: SPOT_RUST / SPOT_DUUR });
    // de zachte aanzet als een rij rechte stukjes: 24 is op een telefoon niet
    // van een echte curve te onderscheiden
    for (let i = 1; i <= 24; i++) {
      const t = SPOT_RUST + (SPOT_DUUR - SPOT_RUST) * i / 24;
      kf.push({ ...spotStand(spotZicht(t)), offset: t / SPOT_DUUR });
    }
    spotAnim = balk.animate(kf, { duration: SPOT_DUUR, easing: 'linear', fill: 'forwards' });
    if (al) spotAnim.currentTime = al;
  }
  const id = setTimeout(() => { if (G && G.timer === id) stopSpot(); }, SPOT_DUUR - al);
  G.timer = id;
}
// wat G.spot nu zou zijn als de klok tikte (100 bij de start, 0 na SPOT_DUUR)
function spotNu() {
  if (!G || !G.timer) return G ? G.spot : 0;
  return Math.max(0, 100 * (1 - (performance.now() - G.spotStart) / SPOT_DUUR));
}
/* Stoppen = de stand van nu vastzetten: G.spot uit de verstreken tijd, en de balk
   blijft staan waar hij was (de animatie gaat weg, zetSpot zet dezelfde stand
   neer als gewone stijl -- daarna kan zetSpot(0) bij een misser hem nog
   verzetten, wat een lopende animatie zou overstemmen). */
function stopSpot() {
  if (G && G.timer) {
    G.spot = spotNu();
    clearTimeout(G.timer); G.timer = null;
    if (spotAnim) { spotAnim.cancel(); spotAnim = null; }
    zetSpot(G.spot);
  }
}
/* Het spotlicht wacht als de app wegvalt. Een kind dat even naar een ander scherm
   gaat (een berichtje, het scherm gaat op slot) kwam terug bij een leeg spotlicht
   en miste de +1 💎 voor een snel antwoord -- voor een som die het nog niet eens
   gezien had. Nu staat de balk stil zolang de app weg is en loopt hij verder waar
   hij was. G.spotWacht en niet G.timer: stopSpot zet die op null, en een spotlicht
   dat al op was hoort ook niet terug te komen. */
document.addEventListener('visibilitychange', () => {
  if (!G) return;
  if (document.visibilityState === 'hidden') {
    if (G.timer) { stopSpot(); G.spotWacht = true; }
  } else if (G.spotWacht) {
    G.spotWacht = false;
    if (!G.lock && G.spot > 0) spotLoopt();
  }
});
/* De telmodus: geen klok, geen balk (zie hierboven). G.spot staat vol, dus elk
   antwoord dat in één keer goed is krijgt de +1 💎 en het luidere publiek -- wat
   een kind in de telmodus kreeg als het snel genoeg was, krijgt het nu altijd.
   Een eerste misser zet hem op nul, net als in de rekenmodus. */
function spotZonderTijd() {
  stopSpot();
  G.spot = 100;
}

/* ================= De som valt dicht =================
   Een goed antwoord landt in het vakje van de som: het getal vliegt van de knop
   naar het "?" en de som staat er even helemaal, "5 − 2 = 3", voordat de
   volgende komt. Hiervoor ging het vakje in de kiesmodus nooit dicht -- de knop
   werd groen, de diamanten vlogen, en de som verdween met het vraagteken er nog
   in. Terwijl dát het moment is waarop de som moet kloppen.

   Er komt geen tijd bij: de vlucht duurt SOM_VLUCHT, en de volgende vraag komt op
   hetzelfde moment als altijd (zie de 950 in submitAnswer). Wat er verschuift, is
   de volgorde: de diamanten vertrekken nu uit de dichte som in plaats van uit de
   knop, dus eerst het antwoord, dan de beloning.

   Na een tweede misser gaat de som óók dicht, maar rustig (rustig = true): geen
   vlucht, geen groen, geen pop. Het goede antwoord hoort dan in de som te staan,
   niet alleen in een losse kaart.

   Bij beperkte beweging vliegt er niets en staat het getal meteen in het vakje;
   wat het leert, blijft. In de telmodus is er geen vakje (lees-vrij, andere
   kaarten) en doet dit niets. In de typmodus stond het getal al in het vakje;
   daar komt alleen de pop bij.

   Geeft het vakje terug (of null als er geen is), zodat submitAnswer de
   diamanten daaruit kan laten vertrekken. */
const SOM_VLUCHT = 320;   // ms: van de knop naar het vakje
let somVlucht = null;     // het getal dat nog onderweg is
/* Het getal in het vakje zetten zonder dat de som verspringt. Het vakje wordt er
   breder of smaller van ("?" is smaller dan "16"), en de som staat gecentreerd --
   dus sprong de hele regel opzij op het moment dat het getal erin kwam: 2 pixels
   bij één cijfer, bijna 11 bij twee. Nu groeit het vakje in `duur` ms naar zijn
   nieuwe breedte, en glijdt de som mee in plaats van te springen. Geeft de
   rechthoek terug waar het vakje uitkomt, om op te mikken. */
function vakNaar(vak, tekst, duur) {
  const w0 = vak.getBoundingClientRect().width;
  vak.textContent = tekst;
  const eind = vak.getBoundingClientRect();
  if (duur && !motionOff() && vak.animate && Math.abs(eind.width - w0) > .5) {
    vak.style.boxSizing = 'border-box';   // de breedte is dan die van de hele rand
    vak.animate([{ width: w0 + 'px' }, { width: eind.width + 'px' }],
      { duration: duur, easing: 'cubic-bezier(.3,.6,.35,1)' });
  }
  return eind;
}
function somVult(q, vanEl, rustig) {
  const kaart = $('question-text');
  const vak = kaart && kaart.querySelector('.q-blank');
  if (!vak) return null;
  const zet = () => {
    vak.style.visibility = '';
    vak.classList.add('done', rustig ? 'rustig' : 'klikt');
  };
  if (rustig || G.mode === 'typ' || !vanEl || !vanEl.getBoundingClientRect || motionOff()) {
    vakNaar(vak, toonAntwoord(q, q.ans), rustig ? 240 : 0);   // typmodus: het getal stond er al
    zet();
    return vak;
  }
  // Het vraagteken eronder even weg (de plek blijft): de kopie is half
  // doorzichtig, en een "?" dat door het landende getal heen schijnt leest als
  // twee antwoorden. En het getal staat er meteen al in, onzichtbaar: dan weet
  // de kopie waar het vakje uitkomt, en groeit het vakje er tijdens de vlucht
  // naartoe (zie vakNaar).
  vak.style.visibility = 'hidden';
  const v = vanEl.getBoundingClientRect(), n = vakNaar(vak, toonAntwoord(q, q.ans), SOM_VLUCHT), cs = getComputedStyle(vak);
  // Een kopie van het gevulde vakje, los boven alles: de somkaart knipt af
  // (overflow: hidden), dus binnen de kaart zou hij halverwege verdwijnen.
  const kopie = document.createElement('span');
  kopie.className = 'q-blank done som-vlucht';
  kopie.setAttribute('aria-hidden', 'true');
  kopie.textContent = toonAntwoord(q, q.ans);
  Object.assign(kopie.style, {
    left: n.left + 'px', top: n.top + 'px', width: n.width + 'px', height: n.height + 'px',
    fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontFamily: cs.fontFamily,
  });
  document.body.appendChild(kopie);
  somVlucht = kopie;
  const dx = (v.left + v.width / 2) - (n.left + n.width / 2);
  const dy = (v.top + v.height / 2) - (n.top + n.height / 2);
  const a = kopie.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(.75)` },
    { transform: `translate(${dx * .45}px, ${dy * .45 - 36}px) scale(1.12)`, offset: .55 },
    { transform: 'none' },
  ], { duration: SOM_VLUCHT, easing: 'cubic-bezier(.3,.6,.35,1)' });
  const land = () => {
    if (somVlucht === kopie) somVlucht = null;
    if (!kopie.isConnected) return;   // al opgeruimd: er staat een nieuwe som
    kopie.remove();
    zet();
  };
  a.onfinish = land;
  setTimeout(land, SOM_VLUCHT + 150);
  return vak;
}
function somVluchtWeg() { if (somVlucht) { somVlucht.remove(); somVlucht = null; } }

function submitAnswer(val, btnEl) {
  if (!G || G.lock) return;
  if (btnEl && btnEl.getBoundingClientRect) {   // tactiel: ripple vanaf de aangetikte tegel
    const r = btnEl.getBoundingClientRect();
    tapRipple(r.left + r.width / 2, r.top + r.height / 2);
  }
  const q = G.qs[G.idx];
  const p = P();
  if (val === q.ans) antwoordGoed(q, p, btnEl);
  else antwoordFout(q, p, val, btnEl);
}
/* Een goed antwoord: tellen, belonen, en in DE VOLGORDE hieronder het feest.
   submitAnswer zelf zegt alleen nog wélke van de twee het is. */
function antwoordGoed(q, p, btnEl) {
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
  telLeer(p, q);   // over het tiental, zoek het getal, drie getallen (zie de plank Nieuwe sommen)
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
  G.uitslag[G.idx] = firstTry ? 'goed' : 'hint';
  // Stille publieksteller (geen meter meer op het scherm, zie startLevel): hoe béter
  // je speelt, hoe sneller hij volloopt. Vol = applaus, met bonusdiamanten.
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
  if (btnEl) btnEl.classList.add('good');
  if (q.tik) lijnLand(q);
  // Eerst landt het antwoord in de som (zie "= De som valt dicht"), en dán pas
  // vliegen de diamanten -- uit de dichte som naar de teller: jouw antwoord
  // maakt de som af, en de som betaalt je uit. Zonder vakje (telmodus) komen ze
  // gewoon uit de knop, zoals altijd.
  const vak = somVult(q, btnEl);
  // alleen wachten als er ook echt een getal vliegt (niet zonder knop, niet in
  // de typmodus, niet bij beperkte beweging) -- somVlucht staat dan klaar
  const vlucht = vak && somVlucht ? SOM_VLUCHT : 0;
  // De teller wacht op wat eraan komt (zie telStraks): eerst vliegen ze, dan
  // staat het er. Bewaren doet save() hierboven, meteen en zonder te wachten.
  /* In de show vliegen ze sneller dan in de kleedkamer (DIA_SHOW i.p.v. 620):
     de teller moet klaar zijn met tellen vóór de volgende som komt (950). Op
     de gewone duur landde het laatste steentje bovenop de nieuwe som. */
  telStraks($('game-diamonds'), p.diamonds, vlucht + DIA_SHOW);
  // verdiende diamanten vliegen naar de teller — zelfde taal als kopen in de kleedkamer
  const diaVan = vak || btnEl || $('question-card');
  setTimeout(() => flyDiamonds(diaVan, $('game-diamonds'), q.gold ? 3 : 2, DIA_SHOW), vlucht);
  /* Het publiek klapt extra hard, en zij buigt (zie buiging). Hier stond
     "🎆 EXTRA SHOW!", en een extra show kwam er nooit -- de meter erachter is
     sinds fase 1 onzichtbaar, dus een kind kreeg een belofte die niets deed.
     Nu is wat er staat ook wat er gebeurt. "Applaus" en niet "toegift": dat
     kent elk kind, en voor applaus buig je. */
  /* DE VOLGORDE. Het klankje en de knop zijn het antwoord op de tik en komen
     meteen. Het feest -- de lof met "💎 +2", de dans, de zaal die oplicht, het
     voortgangsvakje -- komt pas als het getal in de som geland is (vlucht).
     Stond dat allemaal op 0, dan keek een kind op drie plekken tegelijk en
     stond de beloning er al voordat het antwoord aankwam. Zonder vlucht
     (typmodus, telmodus, beperkte beweging) is vlucht 0 en is alles meteen. */
  if (encore || q.gold || streakBonus) sndStreak(); else sndGood();
  /* Het getal hardop, bij élk goed antwoord: "Ja, zes! Goed zo!". In de fases
     waar het kind een gelijke groep aantikt (1, 2, 4) is dit het enige moment
     dat het telwoord bij de hoeveelheid klinkt -- en precies die koppeling
     ("het laatste getal is hoeveel het er zijn") is waar tellen om draait.
     speak() zwijgt zelf in de rekenmodus (zie stemAan).
     Hij klinkt onderaan, via zegEnDan: de volgende vraag wacht erop. */
  /* Kort: alleen het getal. Met "Knap gedaan!" erachter duurde de lof zo'n twee
     seconden, en de volgende vraag wacht erop -- in de telmodus, waar daarna ook
     de opdracht nog voorgelezen wordt, ruim het dubbele van tik tot vraag.
     Het getal is het stuk dat iets leert; het extra woord komt er alleen nog bij
     als er ook iets extra's gebeurt (3 op een rij, gouden vraag, applaus). De
     lof op het scherm zegt het intussen toch al. */
  const lof = 'Ja, ' + numWord(q.ans) + '!'
    + (encore || q.gold || streakBonus ? ' ' + pick(['Super!', 'Knap gedaan!', 'Wauw!']) : '');
  const trofees = checkTrophies(p);
  if (trofees.length) { save(); updateTroDot(); }   // stipje aan; het feestje volgt bij 'Open trofee'
  const g = G;
  /* De volgende vraag komt na `rust` (of later, als de stem nog praat). De lof
     begint pas als het getal geland is (vlucht), dus met zijn gewone duur stond
     "Super! 💎 +2" er nog voluit toen de nieuwe som er al was. Nu is hij weg op
     rust, zonder dat er tijd bijkomt. */
  const rust = encore || q.gold ? 1400 : 950;
  const lofDuur = Math.min(LOF_DUUR, rust - vlucht);
  const feest = () => {
    if (G !== g) return;   // de show is intussen gestopt
    if (encore) { confetti(24); showPraise('👏 Applaus!', '💎 +5', false, lofDuur); }
    else if (q.gold) { confetti(10); showPraise('🌟 Gouden vraag!', '💎 +' + gain, false, lofDuur); }
    else if (streakBonus) showPraise('🔥 3 op een rij!', '💎 +' + gain, false, lofDuur);
    else if (!firstTry) showPraise('Goed zo!', '💎 +' + gain, false, lofDuur);
    else showPraise(pick(PRAISE), '💎 +' + gain, false, lofDuur);
    if (encore) buiging('game-avatar-inner');
    else dance('game-avatar-inner');
    zaalJuicht();   // de zaal licht één tel op -- het enige wat er nieuw bij komt
    showBalk(G.idx + 1, false);   // dit vakje is nu gehaald
  };
  if (vlucht) setTimeout(feest, vlucht); else feest();
  // 950 i.p.v. 1100 voor een gewoon goed antwoord: de knop plopt, zij danst, de
  // zaal licht op -- na een seconde is dat alle drie gezegd en wordt wachten
  // wachten. Een gouden vraag en applaus mogen wél even duren; die zijn
  // bedoeld om op te vallen.
  // De volgende vraag zegt zelf iets, dus die wacht tot de lof uit is (zegEnDan):
  // anders breekt hij "Knap gedaan!" midden in het woord af. Is de show
  // intussen gestopt (of al een nieuwe begonnen), dan is er geen volgende vraag.
  zegEnDan(lof, null, rust, () => { if (G === g) nextStep(); });
}
/* Een fout antwoord (zachte, vriendelijke animatie). Wat élke misser doet staat
   hier; daarna splitst het in de eerste (een hint, nog een kans) en de tweede
   (de vraag is gemist, en het antwoord komt). */
function antwoordFout(q, p, val, btnEl) {
  updatePerf(p, false, false);
  p.stats.wrong++;
  incWeak(p, q);                                  // deze som vaker laten terugkomen
  demoteLearned(p, q);                            // stond hij in onderhoud? dan is hij weer zwak
  G.streak = 0;
  /* Twee missers, twee klankjes. De eerste levert een hint op: dat is "niet die,
     probeer nog eens". De tweede maakt de vraag gemist en onthult het antwoord. Tot nu toe klonken ze precies hetzelfde, en daarmee had
     het enige echte gevolg in het spel geen gewicht.
     G.retried staat hier nog op de stand van vóór deze beurt -- hij gaat pas om in
     de eerste-misser-tak hieronder, dus dit leest de vorige poging en niet deze. */
  if (G.retried) sndMis(); else sndWrong();
  oepsGezicht();
  // "Niet die -- probeer nog eens", en klaar. 420ms i.p.v. 700: een misser mag
  // duidelijk zijn maar hoort niet ook nog te dúren. De rode tegel blijft staan
  // (die zegt wélke), de kaart schudt kort en is dan weer gewoon de som.
  kaartWiebelt($('question-card'));
  // een misser op een speciale vraag maakt de ronde "niet schoon" → frequentie omlaag
  if (q.kind === 'missing') G.missDirty = true;
  else if (q.kind === 'chain') G.chainDirty = true;
  if (!G.retried) eersteMisser(q, val, btnEl);   // G.lock blijft false → kind mag opnieuw antwoorden
  else tweedeMisser(q, p, btnEl);
}
// eerste misser: nog niet gemist, wél een tweede kans met een hint
function eersteMisser(q, val, btnEl) {
  G.retried = true;
  G.misses++;
  stopSpot(); G.spot = 0; zetSpot(0, true);   // de balk zakt zichtbaar weg
  save();
  if (btnEl) { btnEl.classList.add('bad'); btnEl.disabled = true; }  // deze keuze uitschakelen
  if (G.mode === 'typ') { G.input = ''; drawQuestion(); }
  if (G.count) { countMissSpeak(q, val); showToast('🤔', null, null, 'teken'); }   // lees-vrij: gesproken hint, geen tekst
  else toonHint(q, val, btnEl);
}
// tweede misser: de vraag is gemist, antwoord tonen en door
function tweedeMisser(q, p, btnEl) {
  G.lock = true;
  stopSpot();
  G.errors++;
  G.uitslag[G.idx] = 'mis';
  // definitief fout telt mee in de per-bewerking-beheersing / drie-getallen-tempo
  if (q.kind === 'classic') updateOpAcc(p, q.op, false, false);
  else if (q.kind === 'chain') updateChainAcc(p, false, false);
  else if (q.count) updateCountAcc(p, false, false);
  save();
  if (btnEl) btnEl.classList.add('bad');
  /* Het vakje van deze vraag wordt nú een lege ring, en niet pas als de volgende
     vraag komt. Hier brak vroeger een hartje; zonder hartjes is de balk de enige
     plek die zegt dat deze vraag gemist is, dus hoort hij het op hetzelfde
     moment te zeggen als de rode knop en het klankje. */
  showBalk(G.idx + 1, false);
  // laat het juiste antwoord oplichten zodat het kind ziet wat het moest zijn
  if (G.count) {
    // juiste hoeveelheid hardop meetellen, geen tekst -- en het 👉 pas als de stem
    // klaar is: een snelle tik brak het tellen anders halverwege af
    const show = G;
    countReveal(q, () => { if (G === show) toonVerder(); });
    return;
  }
  /* DE VOLGORDE na een tweede misser: eerst wat er fout ging (de rode knop, het
     lege vakje, het klankje -- meteen), dan pas wat het had moeten zijn (ONTHUL), en
     pas daarna mag een tik verder (VERDER_NA). Dat stond allemaal op 0: zes
     dingen tegelijk, en een snelle tweede tik sloeg het antwoord over voordat
     het er stond.

     De goede knop wordt groen zonder te veren (.rustig): de veerpop en de ring
     zijn van een gewonnen antwoord, en een misser mag er niet uitzien als winst. */
  hideToast();   // de hint van de eerste misser is nu niet meer waar; het 👉 komt straks
  const g = G;
  setTimeout(() => {
    if (G !== g) return;
    if (G.mode === 'kies') {
      const cb = [...document.querySelectorAll('.choice-btn')].find(b => parseInt(b.dataset.v, 10) === q.ans);
      if (cb) cb.classList.add('good', 'rustig');
      // de pijl van de eerste poging gold voor toen; nu staat het antwoord er
      // zelf, en dan is rood (wat je koos) en groen (wat het was) genoeg
      document.querySelectorAll('#answer-area .tegel-pijl').forEach(el => el.remove());
    } else if (G.mode === 'tik') {
      // de getallenlijn: het getal staat op het goede streepje, rustig
      lijnLand(q, true);
    }
    // Ook nu gaat de som dicht, maar rustig: geen vlucht, geen groen, geen feest.
    // Juist hier moet de goede som te zien zijn -- in de som zelf, en niet in een
    // losse kaart ernaast. Die kaart zegt dan alleen nog hoe je verder komt.
    somVult(q, null, true);
  }, motionOff() ? 0 : ONTHUL);
  setTimeout(() => { if (G === g) toonVerder(); }, motionOff() ? 0 : VERDER_NA);
}
const ONTHUL = 300, VERDER_NA = 600;
/* "Verder", zonder één woord. Na een tweede misser wacht de show op een tik
   (overal op het scherm, zie .tap-veil), en de kaart bovenin zegt alleen nog
   dát: een wijzende hand, groot. In de rekenmodus stond er "tik om verder te
   gaan" onder, en dat is precies het stuk dat een kind van zes niet leest --
   de telmodus deed het al zonder, en nu doen ze het allebei zo. */
function toonVerder() { showToast('👉', nextStep, null, 'teken'); }
/* De pop schrikt: even een rond "oh!"-mondje en grote ogen (zie avatarSVG en
   .oeps in het stijlblad). Dit kwam in de plaats van een grijs nootje van 52px
   dat over haar lijf naar beneden viel -- op telefoonmaat las dat als een vlek
   op de pop, en zelf deed ze intussen niets: ze bleef gewoon lachen.

   Nu reageert zíj, en dat is ook meteen het hele bericht. Geen straf, geen
   verdriet: een "oeps", en dan staat ze weer klaar voor de volgende poging.
   Vóór de volgende misser gaat de klasse er eerst af, anders begint het
   schrikken niet opnieuw. */
const OEPS_DUUR = 700;
let oepsTimer = null;
function oepsGezicht() {
  const pop = $('game-avatar-inner');
  if (!pop) return;
  clearTimeout(oepsTimer);
  pop.classList.remove('oeps');
  requestAnimationFrame(() => {
    pop.classList.add('oeps');
    oepsTimer = setTimeout(() => pop.classList.remove('oeps'), OEPS_DUUR);
  });
}
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
/* De show wacht op je. Een telefoon die op slot gaat of een kind dat even naar
   een andere app gaat, laat de show op Android en op een tablet nog een tijd
   doorlopen: de volgende som kwam dan zonder kijker, zijn spotlicht liep leeg
   (weg +1 💎), de telmodus las hem voor aan een vergrendeld scherm, en na de
   laatste som speelde het hele eindfeest voor niemand. Een iPhone legt de pagina
   stil en had dit niet. Nu wacht elke stap die vanzelf komt tot de app weer in
   beeld is, en gaat dan gewoon verder.
   Eén wachter tegelijk: wie twee keer vraagt, krijgt alleen de laatste. */
let zichtbaarWacht = null;
/* Hoeveel gemiste vragen (twee keer fout) een show mag hebben. De show speelt
   altijd uit, en pas aan het eind telt dit: MIS_GRENS of meer is "Bijna!", geen
   ster. Hij stopte vroeger midden in de show bij de derde, met de hartjes als
   aftelling; zonder die aftelling zou de show uit het niets ophouden, en een
   kind dat het lastig heeft, ziet zo toch elk antwoord nog eens. */
const MIS_GRENS = 3;
function alsZichtbaar(fn) {
  if (zichtbaarWacht) document.removeEventListener('visibilitychange', zichtbaarWacht);
  zichtbaarWacht = null;
  if (!document.hidden) { fn(); return; }
  zichtbaarWacht = () => {
    if (document.hidden) return;
    document.removeEventListener('visibilitychange', zichtbaarWacht);
    zichtbaarWacht = null;
    fn();
  };
  document.addEventListener('visibilitychange', zichtbaarWacht);
}
function nextStep() {
  hideToast();
  if (!G) return;
  if (document.hidden) { const g = G; alsZichtbaar(() => { if (G === g) nextStep(); }); return; }
  G.idx++;
  if (G.idx >= G.total) endLevel(G.errors < MIS_GRENS);
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
}

/* Wat deze show waard was, in sterren. Puur rekenwerk op de stand van G: geen
   profiel, geen scherm, niets dat blijft staan.

   Eén regel voor allebei de modi, en hij groeit mee met de lengte van de show.
   G.misses telt de vragen die niet in één keer goed gingen:

     3   foutloos: elke vraag in één keer goed. Dat is wat het eindscherm dan
         belooft ("Foutloos — het publiek gaat uit zijn dak!"), en wat een
         perfecte wereld betekent.
     2   hooguit STER_MARGE van de vragen niet in één keer goed: bij 5 vragen
         1 of 2, bij 8 vragen 1 tot 3, bij 10 vragen 1 tot 4
     1   de rest: de show is gehaald

   Hiervoor waren het twee regels. De rekenmodus gaf 1 ster vanaf twee
   haperingen: zes van de acht in één keer goed leverde 1 ster op, onder
   "🎉 Show 1 was geweldig!", en een kind dat van vijf haperingen naar twee
   ging zag geen verschil. De telmodus keek naar de verhouding (85% en 55%), en
   gaf bij acht of tien vragen ook drie sterren mét een hapering -- onder
   datzelfde "Foutloos". De marge hierboven is de 55% van de telmodus: geen kind
   krijgt voor dezelfde show minder sterren dan eerst, behalve die ene drie
   sterren die niet foutloos was. */
const STER_MARGE = 0.45;
/* De laatste RECENT_N shows, als getal: de sterren, of 0 voor een mislukte show.
   p.stars onthoudt per show alleen het beste resultaat, en een mislukte show
   helemaal niet -- daarmee kan Voortgang wel zeggen hoeveel er ooit gehaald is,
   maar niet hoe het de laatste tijd gaat. Dit is geen voortgang: geen wereld,
   halte of beloning leest het. Alleen het ouderrapport (zie uitdagingStand). */
const RECENT_N = 10;
/* Groeien mag gezien worden. Een stap verder op het leerpad kwam er stil bij:
   het kind merkte alleen dat het ineens moeilijker was. Nu staat er op het
   eindscherm één gouden "Nieuw:", met de naam en het voorbeeld van die stap --
   dezelfde als op de ladder bij Voortgang -- en in de telmodus zegt de stem het.
   Alleen na een gelukte show, en de eerste vraag die het nieuwe laat zien krijgt
   in de volgende show nog één keer "Nieuw" (nieuwTeTonen, zie vraagIsNieuw).

   Beide modi lezen hun eigen ladder en niets anders:
     telmodus  de fase ging omhoog (voor = de fase vóór advanceCountStage). Een
               fase terug zegt niets; dat merkt het kind niet en hoeft het ook
               niet te horen.
     rekenen   rij = de rij van LEERPAD waar padNa haar net naartoe schoof, of
               anders die van een andere ladder (ladderNa), of null. p.gezien onthoudt per rij-id wat al gevierd is: zet de ouder
               een rij uit en weer aan, dan is dat geen nieuws.
   Hier keek rekenen eerst naar de instellingen: een hogere grens dan ooit, of de
   eerste zoek-het-getal. Dan stond er "Nieuw: getallen tot 100!" zodra een ouder
   de lijn "tot" liet zakken -- ook bij een kind dat nog op Tot 10 zat -- en
   kregen Over het tiental, Tafels, Delen, Getallen bouwen en Tientallen nooit
   iets. Een nieuwe rij in LEERPAD krijgt zijn moment zo vanzelf (kern.test.js
   zaak W loopt ze allemaal na). */
const nieuwTeTonen = {};   // per ster: de rij-id (of 'fase') die in de volgende show "Nieuw" krijgt
function groeiPil(naam, vb) {
  return `✨ Nieuw: ${naam}${vb ? ` <span class="groei-vb">${vb}</span>` : ''}`;
}
function groeiMoment(p, g, voor, rij) {
  if (g.count) {
    const st = p.countTrack.stage;
    return st > voor ? { id: 'fase', pil: groeiPil(COUNT_STAGE_LABELS[st], COUNT_STAGE_VB[st]),
      zin: 'Je bent gegroeid! Er is een nieuw spel.' } : null;
  }
  const z = p.gezien || (p.gezien = {});
  const r = rij && padRijen(p.settings).rijen.concat(...Object.keys(LADDERS).map(k => ladderRijen(p.settings, k).rijen)).find(x => x.id === rij);
  if (!r || z[rij]) return null;
  z[rij] = 1;
  return { id: rij, pil: groeiPil(r.naam, r.vb) };
}
/* Welke stap van het leerpad speelt ze nu? Rekenen: de rij (padNu), tellen: de
   fase. Een andere modus is ook een andere stap. Alleen voor het ouderrapport:
   het zegt waar de shows in p.stap bij horen. */
function stapSleutel(p) {
  const s = p.settings;
  // Zelf kiezen: wat er aangevinkt staat is de stap -- vink je iets bij, dan begint het label opnieuw
  if (zelfGekozen(s)) return 'vrij:' + (s.track === 'count' ? kiesFasen(s) : kiesGekozen(s).map(r => r.id).concat(s.ops.filter(o => o === 'x' || o === ':'))).join(',');
  return s.track === 'count' ? 'fase' + countLiveStage(p) : 'pad:' + padNu(p);
}
/* De uitkomst onthouden, met de stap waar hij bij hoort (stap = stapSleutel van
   vóór de show: de show die haar een stap verder brengt telde nog op de oude).
   p.stap = { id, n }: hoeveel van de laatste shows op deze stap gespeeld zijn. */
function onthoudUitkomst(p, sterren, stap) {
  p.recent = (p.recent || []).concat(sterren).slice(-RECENT_N);
  if (stap == null) return;
  if (!p.stap || p.stap.id !== stap) p.stap = { id: stap, n: 0 };
  p.stap.n++;
}
/* Past het niveau? Uit de laatste shows OP DE STAP WAAR ZE NU STAAT, in drie
   standen -- en met opzet een uitspraak over de uitdaging, niet over het kind:
     pittig  mislukte shows (twee, of drie op tien) -- het spel maakt het nu zelf lichter
     vlot    (bijna) alles drie sterren -- het pad schuift zelf door, of er is een tip
     goed    de rest: een mengeling van twee en drie sterren

   Alleen deze stap, en niet gewoon de laatste tien: het leerpad schuift door
   zodra ze een rij kan (padNa), en dan waren de laatste tien shows nog bijna
   allemaal van de makkelijkere rij. Dan stond er "gaat vlot" boven de stap die
   ze net moeilijker vindt. Onder de STAND_MIN shows op deze stap zegt het nog
   niets (null); Voortgang zegt dan "nieuwe stap".

   Een save van vóór p.stap weet niet bij welke stap zijn shows horen; die kijkt
   zoals eerst naar de laatste tien, vanaf vier shows. */
const STAND_MIN = 2;
function uitdagingStand(p) {
  const r = p.recent || [];
  let w;
  if (!p.stap) {
    if (r.length < 4) return null;
    w = r;
  } else {
    const n = p.stap.id === stapSleutel(p) ? Math.min(p.stap.n, r.length) : 0;
    if (n < STAND_MIN) return null;
    w = r.slice(-n);
  }
  const drie = w.filter(v => v >= 3).length, mis = w.filter(v => v === 0).length;
  const stand = mis >= Math.max(2, Math.ceil(w.length * 0.3)) ? 'pittig' : (drie / w.length >= 0.8 ? 'vlot' : 'goed');
  return { stand, n: w.length, drie, mis };
}
function showStars(g) {
  if (g.misses === 0) return 3;
  return g.misses <= Math.floor(g.total * STER_MARGE) ? 2 : 1;
}
/* Een geslaagde show wegschrijven. Álles wat blíjft staan gebeurt hier en
   nergens anders: de sterren, de positie, de beloningen van de wereld, de
   trofeeën -- en de save() die dat vastlegt.

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

     { stars, beter, bonus, travel, feest, trofees }
       stars    de sterren van déze show (een mindere poging laat de oude staan)
       beter    dit was een geslaagde herkansing van een eerdere show
       bonus    de 💎 die die sterren opleveren
       travel   { from, to } als de ster een halte opschuift, anders null
       feest    de wereld die net uit en/of perfect werd, of null
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
  const trofees = checkTrophies(p);
  save();
  // er is nu iets om kwijt te raken -- zie opslagVasthouden
  opslagVasthouden(false);
  return { stars, beter, bonus, travel, feest, trofees };
}

function endLevel(success) {
  stopSpot();
  const p = P();
  const lvl = G.lvl;
  applyRampUpdates(p, G);   // frequentie-trap van de extra uitdagingen bijstellen
  const faseVoor = G.count ? countLiveStage(p) : 0;   // voor groeiMoment
  const stapVoor = stapSleutel(p);                     // de stap waar deze show bij hoort (zie onthoudUitkomst)
  // Zelf kiezen: ze speelt wat de ouder aanvinkte, en daar schuift niets aan (zie zelfGekozen)
  const vrij = zelfGekozen(p.settings);
  if (G.count && !vrij) {
    advanceCountStage(p, success, success && showStars(G) === 3);   // telmodus: fase mee laten klimmen/zakken
    telPlafondTel(p, success ? showStars(G) : 0);
  }
  onthoudUitkomst(p, success ? showStars(G) : 0, stapVoor);   // voor de stand in Voortgang (beide takken hieronder bewaren)
  if (!G.count && p.settings.wennen > 0) p.settings.wennen--;   // een show verder gewend aan de grens
  if (!G.count && success && !vrij) telGrensDrie(p, showStars(G));   // voor de grenstip (zie grensDrieSterren)
  /* Een show verder op haar rij, op elke ladder die in deze show speelde, elk
     op zijn eigen vragen (themaSterren), en met de antwoorden op het nieuwe
     van die rij (rijAntwoorden, zie rijVerder). Schoof ze door, dan is dit haar nieuwe
     rij -- rekenen eerst, want daar staat er maar één op het eindscherm. */
  const thema = k => !G.count && !vrij && G.themaPlan.includes(k);
  const plusMinRij = thema('rekenen') && padNa(p, success ? themaSterren(G, 'rekenen') : 0, rijAntwoorden(G, 'rekenen', padNu(p))) ? padNu(p) : null;
  const ladderRij = Object.keys(LADDERS).map(k => thema(k) && ladderNa(p, k, success ? themaSterren(G, k) : 0, rijAntwoorden(G, k, ladderNu(p, k))) ? ladderNu(p, k) : null);
  const nieuweRij = [plusMinRij, ...ladderRij].find(Boolean) || null;
  /* Wat er pas ná het eindscherm gevierd wordt (zie de staart van deze
     functie): een wereld die net uit of perfect werd. Bij een mislukte show
     blijft het leeg. */
  let feest = null;
  // wat er in de telmodus hardop gezegd wordt als de sterren er staan (zie onderaan)
  let zin = null;
  // zelfde kop als tijdens het optreden: wereld + 💎-teller, zodat dit scherm
  // aanvoelt als het vervolg van dezelfde show i.p.v. een los tussenschermpje
  const wl = worldFor(lvl);
  $('end-lvl-label').innerHTML = `${wl.world.icon} ${esc(korteNaam(wl.world))}`
    + `<span class="world-sub">Show ${wl.nr} / ${wl.levels}</span>`;
  // Wat er van de stille publieksteller overblijft telt altijd mee: +1 💎 per volle
  // 25%, zodat inspanning ook loont als het applaus (100%) net niet gehaald is.
  // Sinds fase 1 heeft die bonus geen eigen vakje meer op het eindscherm -- hij zit
  // gewoon in de 💎 die je deze show verdiend hebt (zie verdiend hieronder).
  const fanBonus = Math.floor(G.fan / 25);
  if (fanBonus > 0) p.diamonds += fanBonus;
  const verdiend = G.earned + fanBonus;
  let opbrengst = verdiend;   // alles van deze show, de sterrenbonus erbij (zie hieronder)
  let wens = null;            // de wens in het 💎-vakje (zie eindWens)
  $('end-avatar').innerHTML = pasLaag(avatarSVG(p, 150));
  applyStage($('end-stage'), p);
  // hetzelfde decor als tijdens de show: het applaus valt in de zaal waar ze stond
  applyVenue($('screen-end'), wl.world, lvl);
  naShowLvl = lvl;   // élke uitgang van dit scherm komt straks op déze halte uit
  if (success) {
    /* Alles wat er aan dit kind verandert, in één keer -- zie applyShowResult.
       Wat eruit komt is materiaal voor het scherm hieronder, en niets anders:
       vanaf hier wordt er niets meer bewaard. */
    const r = applyShowResult(p, lvl, wl, showStars(G));
    const { stars, beter, bonus } = r;
    /* Wat er tijdens déze show klaar kwam te liggen, en niet alleen aan het eind.
       Trofeeën als "25 sommen goed" of "Applaus!" worden al bij het antwoord
       klaargelegd (submitAnswer), dus r.trofees -- wat applyShowResult er aan
       het eind nog bij vindt -- miste ze: na de eerste show stond er "Nieuwe
       trofee klaar!" terwijl er twee lagen. */
    const nieuwKlaar = (p.readyTrophies || []).filter(id => !G.klaarBijStart.includes(id)).length;
    if (r.travel) pendingTravel = r.travel;   // de ster reist zichtbaar door op de kaart
    feest = r.feest;
    /* De kop zegt wat de sterren zeggen. Hier stond altijd "was geweldig!", ook
       boven één ster -- en dan spreken de kop en de sterren elkaar tegen op het
       ene moment dat een kind leest hoe het ging. Elke kop is blij; alleen
       "geweldig" is voor foutloos. */
    $('end-title').textContent = stars === 3 ? `🎉 Show ${wl.nr} was geweldig!`
      : stars === 2 ? `👏 Show ${wl.nr} was goed!`
      : `🎤 Show ${wl.nr} gehaald!`;
    zin = stars === 3 ? 'Drie sterren! Super gedaan!'
      : stars === 2 ? 'Twee sterren! Goed zo!'
      : 'Eén ster! Je hebt de show gehaald!';
    renderEndStars(stars);
    /* Alleen een verbeterde herkansing krijgt een regel: dát is nieuws dat de
       sterren niet laten zien, en het moment waar de gouden haltes op de kaart
       (.tour-stop.perfect) naartoe lokken. Hier stond altijd een juichzin
       ("Het publiek juicht en danst mee!"), maar de kop en de sterren zeiden
       dat al, en het was het enige stuk van de kaart dat een kind van vijf niet
       kan lezen. Zonder de zin schuift de hoofdknop een regel op.
       Zonder emoji aan het eind (de regel voor meldingen sinds de pil). */
    $('end-text').textContent = !beter ? ''
      : stars === 3 ? 'Nog beter — nu alle drie de sterren!' : 'Beter dan de vorige keer!';
    /* Eén vakje: alle 💎 van deze show, de sterrenbonus erbij. Hier stonden er
       twee, en het tweede was "⭐ +15" -- maar die 15 waren diamanten (5 per ster,
       zie applyShowResult), met een ster ervoor. Een kind las vijftien sterren,
       vlak onder de drie die ze net gehaald had, en het 💎-vakje ernaast was dan
       weer vijftien te laag. De sterren staan erboven, groot; dit vakje is de munt.
       */
    opbrengst = verdiend + bonus;
    $('end-earn').innerHTML = `<span class="earn-chip dia">💎 +${opbrengst}</span>`;
    wens = eindWens(p, opbrengst);
    /* Eén mijlpaal, en alleen als er écht iets gehaald is: iets nieuws dat het
       kind nu kan (groeiMoment), of een trofee die klaarligt -- die laatste als
       gouden pil, tikbaar.

       Hier stond ook de ster-status (een nieuwe rang, met zijn eigen pil en
       feestje). Die is met pensioen -- zie "= Sterrencarrière". */
    const mile = $('end-milestone');
    mile.innerHTML = '';
    /* Gegroeid gaat vóór een trofee: de trofee blijft klaarliggen in de kast
       (met zijn stipje op het tabblad), dit moment is er maar één keer. */
    const groei = groeiMoment(p, G, faseVoor, nieuweRij);
    if (groei) {
      nieuwTeTonen[cur] = groei.id;
      mile.innerHTML = `<span class="groei-pil">${groei.pil}</span>`;
      if (groei.zin) zin += ' ' + groei.zin;
    } else if (nieuwKlaar) {
      /* De trofee staat naast de 💎, op één rij: allebei "wat je kreeg". Ze
         stonden op twee rijen onder elkaar, en dat maakte de kaart een regel
         langer dan nodig. Zelfde woorden als de toast (zie noticeReady). */
      const label = nieuwKlaar === 1 ? '🎁 Nieuwe trofee' : `🎁 ${nieuwKlaar} nieuwe trofeeën`;
      const pil = document.createElement('button');
      pil.className = 'gold-pill'; pil.type = 'button'; pil.textContent = label;
      pil.onclick = () => { sndClick(); naTik(openTrophies); };
      $('end-earn').appendChild(pil);
    }
    $('btn-end-next').textContent = '🗺️ Verder op tournee';
    $('btn-end-next').onclick = () => { sndClick(); naTik(() => goMap(lvl)); };
    /* Net een wereldspulletje verdiend? Dan gaat de tweede knop niet naar "de
       kleedkamer" maar naar dát spulletje. Het feestje hierboven laat het één keer
       zien en is daarna weg; zonder deze brug moet een kind zelf bedenken in welke
       van de zeven laden het terechtgekomen is. Eén show later is het gewoon weer
       de kleedkamer -- dit is een wegwijzer, geen tweede knop. */
    /* Sinds de prijs van een wereld gaat die brug niet meer naar de hoed in
       Accessoires maar naar het podium waar hij bij hoort: daar staat de schat
       met zijn vinkje, en de twee stukken die nog moeten -- het volgende doel.
       Is het podium al af, dan zet dezelfde tik haar erop. */
    const nieuwSpul = feest && feest.spul;
    const nieuwPodium = nieuwSpul ? podiumVan(nieuwSpul.id) : null;
    $('btn-end-alt').textContent = nieuwPodium ? '🎪 Naar je podium'
      : nieuwSpul ? `👕 Pas je ${nieuwSpul.name}` : '👕 Kleedkamer';
    /* Genoeg gespaard voor je wens? Dan gaat de gewone Kleedkamer-knop naar dát
       spulletje, met de wens ervoor en een gouden rand (zie eindWens). Een nieuw
       wereldspulletje gaat voor: dat moment is er maar één keer, de wens wacht. */
    const naarWens = !nieuwSpul && wens && wens.klaar ? wens.it : null;
    if (naarWens) $('btn-end-alt').innerHTML = `${wensTekenHTML(naarWens)} Kleedkamer`;
    $('btn-end-alt').classList.toggle('wens-klaar', !!naarWens);
    const naar = nieuwPodium || nieuwSpul || naarWens;
    $('btn-end-alt').onclick = naar
      ? () => { sndClick(); naTik(() => openKleedkamerItem(naar.id)); }
      : () => { sndClick(); naTik(openKleedkamer); };
    sndWin();
    confetti(40, $('screen-end'));
    finaleDance('end-avatar', 4);   // grote slotchoreografie: vier hele pasjes, ruim 3.6s
  } else {
    // Mislukt: er komt geen ster bij en er schuift niets op. Alleen de 💎 van de
    // publieksteller hierboven zijn al bijgeschreven, en die horen bewaard.
    save();
    $('end-title').textContent = '🎭 Bijna!';
    zin = 'Bijna! Probeer nog eens.';
    $('end-stars').textContent = '💪';
    // Geen regel eronder: hier stond "Oefening baart kunst — probeer het nog
    // eens!", een spreekwoord voor grote mensen over twee regels, vlak boven
    // een knop die al "Opnieuw proberen" zegt. 💪 en Bijna! zijn genoeg.
    $('end-text').textContent = '';
    $('end-milestone').innerHTML = '';
    // hetzelfde 💎-vakje als bij een geslaagde show: wat je verdiend hebt, blijft
    // van jou. Maar alléén als er iets in zit. Een "💎 +0" vlak onder "Bijna!" was
    // de enige plek in het spel die een kind liet zien wat ze níét kreeg; zonder
    // het vakje schuiven de knoppen gewoon een regel op.
    $('end-earn').innerHTML = verdiend > 0 ? `<span class="earn-chip dia">💎 +${verdiend}</span>` : '';
    wens = eindWens(p, verdiend);
    $('btn-end-next').textContent = '🔁 Opnieuw proberen';
    $('btn-end-next').onclick = () => { sndClick(); naTik(() => startLevel(lvl)); };
    $('btn-end-alt').textContent = '🗺️ Kaart';
    $('btn-end-alt').classList.remove('wens-klaar');
    $('btn-end-alt').onclick = () => { sndClick(); naTik(() => goMap(lvl)); };
  }
  /* DE VOLGORDE op het eindscherm: eerst de sterren, dan wat ze opleveren, dan
     de weg verder. Hier stond alles behalve de sterren al klaar op het eerste
     beeldje: de "+15", de teller op zijn eindstand, de trofeepil en de knoppen
     -- en pas daarna landden de sterren die dat allemaal verdiend hadden. Nu
     telt de teller op vanaf wat er vóór de show stond. */
  telNu($('end-diamonds'), p.diamonds - opbrengst);
  const aankomst = eindKomtOp(success);
  telStraks($('end-diamonds'), p.diamonds, aankomst);
  eindWensVul(wens, aankomst);   // het streepje loopt vol als de diamanten landen
  G = null;
  /* De stille wissel van toonHub, en geen kale show(). Die liet het eindscherm
     met screenIn uit het niets opkomen terwijl de zaal op het eerste beeldje al
     weg was: één beeldje stond er alleen de roze achtergrond van de app, tussen
     twee donkere zalen in, en daarna kwam het eindscherm er verwassen overheen.
     Na élke show. Nu ligt de zaal erbovenop en doft weg, en het eindscherm staat
     er vanaf het eerste beeldje dekkend onder -- dezelfde afspraak als overal.
     De wissel (MOTION.totaal) is voorbij voordat de eerste ster landt
     (STERCEREMONIE.eerste). */
  toonHub('screen-end');
  /* Na het eindscherm hoogstens één groot moment: het wereldfeest. (Hier stond
     ook de ster-status, die vóór het wereldfeest kwam; die is met pensioen.)

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
  /* En alleen als het eindscherm er dán nog staat. De knoppen werken vanaf het
     eerste beeldje, dus wie binnen die anderhalve seconde "Verder op tournee"
     tikte, kreeg het feest over de kaart en de reis heen. Wat er gevierd werd
     gaat niet verloren: de schat hangt in de kleedkamer, de badge staat klaar in
     de kast, en de kaart laat de wereldovergang zelf zien. */
  const naFeest = feest ? () => { if ($('screen-end').classList.contains('active')) wereldFeest(feest); } : null;
  const wacht = naSterren();
  if (naFeest) setTimeout(naFeest, wacht);
  /* Lees-vrij: in de telmodus wordt alles voorgelezen -- de vraag, de hint, de
     trofee, het wereldfeest -- maar het eindscherm was alleen tekst, en dan zegt
     het een kind dat nog niet leest alleen iets via de sterren. Eén korte zin,
     ná de laatste toon (EINDE.beloning, of de stille klok) zodat hij er niet
     doorheen praat. speak() zwijgt zelf in de rekenmodus (zie stemAan) en met
     geluid uit.

     Niet als er een wereldfeest volgt: dat leest zijn eigen zin voor, en een
     nieuwe zin breekt de vorige af. Dan is de wereld het nieuws. */
  if (zin && !feest) {
    const wanneer = !success ? EINDE.mislukt : motionOff() ? STERCEREMONIE.stil : EINDE.beloning;
    setTimeout(() => { if ($('screen-end').classList.contains('active')) speak(zin); }, wanneer);
  }
}
/* De klok van het sterrenmoment.

   Deze tijden stonden als losse getallen in renderEndStars, en dat was prima
   zolang niemand erop wachtte. Er wacht er wél iets op: endLevel staat het
   scherm daarna af aan een wereldfeest, en dat mag pas als
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
  /* Beperkte beweging: de sterren staan er meteen (zie hieronder), maar hun
     klankjes niet. Beperkte beweging gaat over bewegen en niet over geluid, en
     de drie stijgende tonen zijn het duidelijkste wat het eindscherm zegt over
     hóé het ging. Ze klinken dan vlak nadat einde show uitgeklonken is, en
     sneller na elkaar, want er valt niets te zien om op te wachten. */
  stilEerste: 340,
  stilTussen: 150,
};
/* Wanneer de ceremonie voorbij is: de derde ster staat stil én het kanon van
   3-op-3 is uitgevallen. Dit is de enige plek waar "het sterrenmoment is klaar"
   als tijdstip bestaat. */
STERCEREMONIE.totaal = Math.max(
  STERCEREMONIE.eerste + 2 * STERCEREMONIE.tussen + STERCEREMONIE.land,
  STERCEREMONIE.knal + STERCEREMONIE.puls);
/* En zonder beweging: tot de derde toon uitgeklonken is, zodat het volgende
   moment er niet overheen valt. De duur van die toon staat in SFX. */
STERCEREMONIE.stil = STERCEREMONIE.stilEerste + 2 * STERCEREMONIE.stilTussen
  + Math.round(SFX['star.land'].noten[0][1] * 1000);
// Hoe lang het eindscherm voor zichzelf houdt voordat er iets groters overheen mag.
function naSterren() { return motionOff() ? STERCEREMONIE.stil : STERCEREMONIE.totaal; }

/* De rest van het eindscherm komt ná de sterren op, elk op zijn eigen tel.

   beloning  de "💎 +.." en de teller die optelt: wat de sterren opleverden. Op
             het moment dat de derde plek gevuld is (geland of dof), niet pas
             na het kanon van foutloos -- dat mag eroverheen.
   vlucht    hoe ver in zijn plop het vakje is als er drie 💎 uit vertrekken naar
             de teller bovenaan -- zoals overal waar je diamanten krijgt (de
             show, Memory). Het vakje stond op en de teller telde, maar niets
             zei dat het ene in het andere ging. De teller telt nu bij aankomst.
   pil       de gouden trofeepil, een tel later
   knoppen   de weg verder, als laatste

   Het wordt met fill 'backwards' gedaan: elk stuk staat tot zijn tel
   onzichtbaar en daarna gewoon in de pagina, zonder klokje dat het weer moet
   opruimen. Een mislukte show heeft geen sterren om op te wachten; daar komt
   alles kort na de wissel. */
const EINDE = {
  beloning: STERCEREMONIE.eerste + 2 * STERCEREMONIE.tussen + 200,
  pil: STERCEREMONIE.eerste + 2 * STERCEREMONIE.tussen + 450,
  knoppen: STERCEREMONIE.eerste + 2 * STERCEREMONIE.tussen + 650,
  mislukt: 360,
  op: 260,
  vlucht: 160,
};
/* De knoppen staan tot hun tel onzichtbaar, maar ze luisterden al vanaf het
   eerste beeldje. En "Kleedkamer" staat precies waar tijdens de show de
   bovenste rij antwoorden stond: een kind dat het laatste antwoord twee keer
   tikte, of gewoon doortikte, stond in de kleedkamer zonder haar sterren gezien
   te hebben (en zonder het wereldfeest). Nagemeten: een tik 150, 400 en 800ms
   na de show opende alle drie de keren de kleedkamer. Nu tellen tikken pas mee
   zodra de knoppen opkomen (.end-actions.wacht, pointer-events). Een
   programmatische click() gaat daar gewoon langs; dat is een test, geen vinger. */
let eindWacht = 0;
/* Geeft terug wanneer de 💎 bij de teller aankomen: dan telt die op. */
function eindKomtOp(success) {
  const acties = document.querySelector('#screen-end .end-actions');
  clearTimeout(eindWacht);
  acties.classList.remove('wacht');
  if (motionOff()) return 0;
  const t = success ? EINDE : { beloning: EINDE.mislukt, pil: EINDE.mislukt, knoppen: EINDE.mislukt + 150 };
  acties.classList.add('wacht');
  eindWacht = setTimeout(() => acties.classList.remove('wacht'), t.knoppen);
  const op = (el, delay, pop) => {
    if (!el || !el.animate || !el.firstChild) return;
    el.animate(pop
      ? [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1.08)', offset: .6 }, { opacity: 1, transform: 'none' }]
      : [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
      { duration: EINDE.op, delay, easing: pop ? 'ease-out' : MOTION.uit, fill: 'backwards' });
  };
  op($('end-earn'), t.beloning, true);
  op($('end-milestone'), t.pil);
  op(acties, t.knoppen);
  const vakje = $('end-earn').querySelector('.earn-chip');
  if (!vakje) return t.beloning;
  const weg = t.beloning + EINDE.vlucht;
  setTimeout(() => {
    if ($('screen-end').classList.contains('active')) flyDiamonds(vakje, $('end-diamonds'), 3);
  }, weg);
  return weg + DIA_AANKOMST;
}

/* Het licht reageert op de sterren: bij elke ster die landt gloeit de bundel
   even op, samen met haar toon. Eén ster is één flits, drie sterren drie. Het
   was het enige op het eindscherm dat er bij één ster precies zo uitzag als bij
   drie. Alleen bij een geslaagde ster, en niet bij beperkte beweging (daar
   roept renderEndStars dit niet aan). */
const FLITS = { duur: 420 };
function bundelFlits() {
  const f = document.querySelector('#screen-end .bundel-flits');
  if (!f || !f.animate || !$('screen-end').classList.contains('venue-aan')) return;
  f.animate([{ opacity: 0 }, { opacity: 1, offset: .25 }, { opacity: 0 }],
    { duration: FLITS.duur, easing: 'ease-out' });
}
// Het sterrenmoment: de verdiende sterren ploppen één voor één op, elk met een
// hoger klankje; een gemiste ster verschijnt stil en dof. Dé ceremonie van het
// eindscherm — bij prefers-reduced-motion staan ze er meteen, en klinken hun
// tonen sneller na elkaar (zie STERCEREMONIE.stilEerste).
function renderEndStars(n) {
  const wrap = $('end-stars');
  wrap.innerHTML = '';
  const still = motionOff();
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    s.textContent = '⭐';
    if (i >= n) s.className = 'dim';
    wrap.appendChild(s);
    if (still || !s.animate) {
      // de ster staat er al; alleen haar toon komt nog, op de stille klok
      if (i < n) setTimeout(() => playSfx('star.land', { i }), STERCEREMONIE.stilEerste + i * STERCEREMONIE.stilTussen);
      continue;
    }
    s.style.opacity = '0';
    setTimeout(() => {
      s.style.opacity = '';
      if (i < n) {
        s.animate([
          { transform: 'scale(0) rotate(-30deg)', opacity: 0 },
          { transform: 'scale(1.45) rotate(8deg)', opacity: 1, offset: .6 },
          { transform: 'scale(1) rotate(0deg)', opacity: 1 }
        ], { duration: STERCEREMONIE.land, easing: 'ease-out' });
        playSfx('star.land', { i });
        bundelFlits();
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

