/* ================= Vragen maken =================
   Een vraag is een sjabloon (`tmpl`) met één blanco plek `@` waar het gezochte
   getal hoort, plus dat getal (`ans`), de bewerking (`op`) en de soort (`kind`):
     - classic:  "3 + 4 = @"   -> ans 7   (het antwoord staat rechts, zoals altijd)
     - missing:  "3 + @ = 7"   -> ans 4   (tweede getal ontbreekt)
     - chain:    "3 + 4 + 2 = @" -> ans 9 (drie getallen, alleen optellen)
   Omdat het gezochte getal altijd één getal is, blijven meerkeuze, typen, hints,
   zwakke-sommen en álle beloningen ongewijzigd werken. */

/* ---- De leerstap: elke wereld leert iets nieuws ------------------------
   Een wereld is niet alleen een nieuwe tekening maar ook een nieuwe stap in het
   rekenen, binnen het plafond dat de ouder zette ("getallen tot 20"):

     stap  wereld  wat er nieuw is
     1     1       sommen tot de helft van het plafond (bij "tot 20": tot 10)
     2     2       het hele plafond, zonder over een tiental heen (12 + 5, 17 − 4)
     3     3       over het tiental heen, en dat vaak (8 + 5, 13 − 6)
     4     4       zoek het getal (3 + ▢ = 7), zodra de gewone som beheerst is
     5     5       drie getallen (3 + 4 + 2), zodra zoek-het-getal er een wereld
                   eerder bij kwam -- nooit twee nieuwe dingen tegelijk
     6     6       alles door elkaar
   Een wereld die later bijkomt krijgt stap 6: alles, zoals de laatste.

   Waarom. De moeilijkheid liep op het shownummer: 0.35 + 0.07 per show, en dat
   stond bij show 10 op het plafond. Daarna waren de sommen in wereld 2 tot en
   met 6 van dezelfde soort, met een andere tekening erachter. Zoek-het-getal
   kwam op show 25 en drie getallen nooit: die wachtte op "ronde 5", en die begon
   bij show 49 -- één voorbij de laatste show die er is.

   Wat blijft: de bijsturing op hoe het gaat (perf, ±0.25 op de moeilijkheid, dus
   een kind dat worstelt krijgt in elke stap lichtere sommen) en de beheersing-
   poorten van de extra uitdagingen (opMastered, pauze bij worstelen). Zoek-het-
   getal begint op dezelfde show als altijd: show 1 van wereld 4 ís show 25. De
   wereld verandert niets aan hoe een som eruitziet -- dat blijft overal gelijk.
   Wat hij verandert is wát er te leren valt. */
const LEERSTAPPEN = [
  { t: 0.5, brug: 'nee' },
  { t: 1,   brug: 'nee' },
  { t: 1,   brug: 'vaak' },
  { t: 1,   brug: 'vrij' },
  { t: 1,   brug: 'vrij' },
  { t: 1,   brug: 'vrij' },
];
const STAP_ZOEK = 4;      // vanaf deze stap mag zoek-het-getal (zie opReady)
const STAP_DRIE = 5;      // vanaf deze stap mogen drie getallen (zie chainReady)
const BRUG_VAAK = 0.5;    // in stap 3: zo vaak gaat een plus- of minsom over het tiental
/* De ouder kan hoger laten beginnen (Oefenen, het leerpad: s.startStap). Dan is
   de stap in een wereld de hoogste van de twee: met start "over het tiental"
   mengt wereld 1 al 8 + 5 erdoor, en vanaf wereld 3 verandert er niets. Het is
   een instelling en geen voortgang: sterren en werelden blijven wat ze zijn. */
function leerStap(lvl, s) { return Math.max(worldFor(lvl).index + 1, (s && s.startStap) || 1); }
function stapVan(lvl, s) { return LEERSTAPPEN[Math.min(leerStap(lvl, s), LEERSTAPPEN.length) - 1]; }
// Moeilijkheid 0..1: de basis van de stap, bijgestuurd op vaardigheid (perf 0..1 → ±0.25).
function moeilijkheid(lvl, perf, s) {
  const skillAdj = ((perf == null ? 0.5 : perf) - 0.5) * 0.5;
  return Math.max(0.2, Math.min(1, stapVan(lvl, s).t + skillAdj, wenPlafond(s)));
}
/* Wennen aan een hogere grens. Vanaf wereld 2 staat t al op 1, dus "tot 50"
   gaf meteen het hele nieuwe bereik (37 + 8, over het tiental) aan een kind
   dat net nog tot twintig rekende. Nu klimt het plafond in WEN_SHOWS shows van
   WEN_VAN naar 1: van twintig naar vijftig begint dus rond de dertig. s.wennen
   telt af (zie endLevel) en wordt gezet als de grens omhoog gaat, met de tip of
   op Oefeningen (zie grensOmhoog). Omlaag is meteen: kleiner hoeft niet te wennen. */
const WEN_SHOWS = 8, WEN_VAN = 0.6;
function wenPlafond(s) {
  const n = (s && s.wennen) || 0;
  return n > 0 ? WEN_VAN + (1 - WEN_VAN) * (1 - n / WEN_SHOWS) : 1;
}
function grensOmhoog(s, naar) {
  if (naar > s.max) s.wennen = WEN_SHOWS;
  else s.wennen = 0;
  s.max = naar;
}
/* Gaat deze som over een tiental heen? Voor plus: tellen de eenheden samen tot
   boven de tien (8 + 5 wel, 7 + 3 en 15 + 5 niet -- die landen óp een tiental).
   Voor min precies andersom: c + b moet over het tiental heen (13 − 6 wel,
   10 − 3 en 20 − 3 niet). Zo werkt het ook bij "tot 100" (27 + 5, 43 − 8). */
function overTiental(a, b, c, op) {
  if (op === '+') return (a % 10) + (b % 10) > 10;
  if (op === '-') return (c % 10) + (b % 10) > 10;
  return false;
}

// Bouwt één geldige, niet-negatieve, exacte drieling voor een bewerking.
// Alles komt uit de moeilijkheidslogica hierboven (leerstap + vaardigheid).
function genTriple(s, lvl, perf, op) {
  // Zo krijgt een kind dat worstelt lichtere sommen en een sterk kind wat pittigere.
  const t = moeilijkheid(lvl, perf, s);
  const effMax = Math.max(10, Math.round(s.max * t)); // binnen ingestelde grens
  const tables = s.tables.length ? s.tables : [2, 5, 10];
  let a, b, c, sym;
  if (op === '+' || op === '-') {
    /* De tiental-regel van deze stap. Onder de 11 kán een som niet over het
       tiental, dus dan valt er niets te kiezen en wordt er ook niet gezocht. */
    const brug = stapVan(lvl, s).brug;
    const wilBrug = brug === 'vaak' && effMax > 10 && Math.random() < BRUG_VAAK;
    const magBrug = brug !== 'nee';
    let poging = 0;
    do {
      if (op === '+') { a = rnd(1, effMax - 1); b = rnd(1, effMax - a); c = a + b; }
      else { a = rnd(2, effMax); b = rnd(1, a - 1); c = a - b; }
      const over = overTiental(a, b, c, op);
      if ((wilBrug ? over : (magBrug || !over))) break;
    } while (++poging < 40);
    sym = op === '+' ? '+' : '−';
  } else if (op === 'x') {
    /* Een tafel loopt altijd van × 1 tot × 10; t laat hem nog steeds rustig
       beginnen. Vroeger knipte "Getallen tot" hem ongezegd af (tot 20 en de
       tafel van 7 gaf nooit meer dan 7 × 2) -- die grens is nu alleen van plus
       en min (zie oefenGroups). */
    b = pick(tables);
    a = rnd(1, Math.max(1, Math.round(10 * t)));
    c = a * b; sym = '×';
  } else { // ':'
    b = pick(tables);
    const q = rnd(1, Math.max(1, Math.round(10 * t)));
    a = q * b; c = q; sym = ':';
  }
  return { a, b, c, sym, op, t, effMax };
}
// Klassieke som: het antwoord staat rechts (zoals de app altijd deed).
function genQuestion(s, lvl, perf) {
  const ops = s.ops.length ? s.ops : ['+'];
  const op = pick(ops);
  const { a, b, c, sym } = genTriple(s, lvl, perf, op);
  // brug: gaat hij over het tiental? Telt mee voor "Over de brug" (zie telLeer)
  const brug = (op === '+' || op === '-') && overTiental(a, b, c, op);
  return { tmpl: `${a} ${sym} ${b} = @`, ans: c, op, kind: 'classic', brug };
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
  const t = moeilijkheid(lvl, perf, s);
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
/* ---- De vier antwoordknoppen --------------------------------------------
   Drie foute keuzes naast het goede antwoord. Die moeten je laten rekenen, en
   dat deden ze niet. Hier stond: het antwoord ±1, ±2 en ±10. Dan staat het
   goede antwoord bijna altijd in het midden van een rijtje (6 7 8), en wie
   gewoon "het middelste van de getallen die dicht bij elkaar liggen" koos, had
   het in 65% van de sommen in één keer goed -- tegen 25% voor blind gokken.
   En ±10 gaf in de eerste wereld (sommen tot tien) bij twee op de drie sommen
   een 17 of een 19 op een knop: een getal dat je zonder rekenen wegstreept.

   Nu, in drie regels:
     * alles blijft binnen de grens van de som (keuzeGrens): geen 17 bij een
       som tot tien;
     * één foute keuze is een fout die een kind echt maakt: het verkeerde teken
       (5 + 2 -> 3, 13 − 6 -> 19), een getal uit de som zelf (5 + 2 -> 5), bij
       drie getallen er één vergeten, en bij grote getallen een tiental ernaast;
     * de rest ligt er vlak naast (1 tot 3), en hoeveel ervan onder het
       antwoord liggen wordt geloot. Het goede antwoord is dus even vaak het
       kleinste, het grootste of een van de twee in het midden.
   Het middelste kiezen geeft zo nog 26%: gokken loont niet meer dan gokken.
   test/kern.test.js zaak Z meet het na.

   Er verandert niets aan hoe een vraag eruitziet, aan de hint (die zegt alleen
   meer of minder) of aan de beloningen. */
function keuzeGrens(q, s, lvl) {
  const getallen = (q.tmpl.match(/\d+/g) || []).map(Number).concat(q.ans);
  const hoogste = Math.max(...getallen);
  // plus en min: de grens van de leerstap, zoals genTriple hem rekent (zonder
  // de bijsturing op hoe het gaat -- daarom ook nooit onder wat er al staat)
  if (q.op === '+' || q.op === '-') return Math.max(hoogste, 10, Math.round(s.max * stapVan(lvl, s).t));
  // tafels: tot het volgende tiental
  return Math.max(10, Math.ceil(hoogste / 10) * 10);
}
function makeChoices(q, grens) {
  const ans = q.ans;
  const getallen = (q.tmpl.match(/\d+/g) || []).map(Number);
  const mag = v => Number.isInteger(v) && v >= 0 && v <= grens && v !== ans;
  // fouten die een kind echt maakt
  const fouten = new Set(getallen);
  for (let i = 0; i < getallen.length; i++)
    for (let j = i + 1; j < getallen.length; j++) {
      fouten.add(getallen[i] + getallen[j]);             // plus i.p.v. min, of er één vergeten
      fouten.add(Math.abs(getallen[i] - getallen[j]));   // min i.p.v. plus
    }
  if (ans >= 10 && grens >= 50) { fouten.add(ans + 10); fouten.add(ans - 10); }
  // Eerst loten hoeveel keuzes er onder het antwoord liggen (0 tot 3), en pas
  // dan de echte fout kiezen, aan een kant waar nog plaats is. Andersom lag de
  // fout meestal onder het antwoord (een getal uit de som is kleiner), en was
  // het antwoord bijna nooit meer het kleinste.
  const onder = rnd(0, 3);
  const keuze = new Set([ans]);
  const fout = shuffle([...fouten].filter(v => mag(v) && (v < ans ? onder > 0 : onder < 3)))[0];
  if (fout != null) keuze.add(fout);
  // de rest vlak ernaast
  const ernaast = kant => shuffle([1, 2, 3].map(d => ans + kant * d).filter(v => mag(v) && !keuze.has(v)))[0];
  while (keuze.size < 4) {
    const nuOnder = [...keuze].filter(v => v < ans).length;
    const kant = nuOnder < onder ? -1 : 1;
    let v = ernaast(kant);
    if (v == null) v = ernaast(-kant);
    // allebei op (een som op de rand van een kleine grens): het dichtstbijzijnde
    // getal dat nog vrij is, en pas als er echt niets meer is, voorbij de grens
    for (let d = 4; v == null && d <= grens + 1; d++) v = [ans - d, ans + d].find(x => mag(x) && !keuze.has(x));
    if (v == null) v = Math.max(...keuze) + 1;
    keuze.add(v);
  }
  return shuffle([...keuze]);
}

/* ================= Telmodus: lees-vrije vragen (fase 1–12) =================
   Voor kleuters die nog geen cijfers of woorden lezen. Elke vraag is visueel
   volledig (hoeveelheden als objecten/stippen) én wordt hardop voorgelezen.
   Het antwoord is altijd een getal (de hoeveelheid), zodat submitAnswer exact
   hetzelfde werkt als bij de rekenshow -- en dus alle beloningen, diamanten,
   sterren en trofeeën ongewijzigd blijven meetellen.

   Fases:  1 hoeveelheid 1–3 · 2 hoeveelheid 1–5 (+ meetellen) · 3 meer/minder ·
           4 evenveel · 5 gesproken getal → hoeveelheid · 6 cijfer bij hoeveelheid ·
           7 één meer/minder · 8 samen/splitsen · 9–11 gesteunde sommen
   (de volledige tabel staat in countStageInfo hieronder) */
const COUNT_OBJECTS = ['⭐', '❤️', '🎈', '🍎', '🌸', '🐢', '🐱', '🦋', '🍓', '🐟', '🌼', '🐞'];
/* ---- Fasetabel (8 fases) ----
   Per fase: welke oefeningtypes, het hoeveelheidsbereik (baseMax bij de laagste
   rung → topMax bij de hoogste), het aantal rungs (moeilijkheidstrappen bínnen de
   fase) en het aantal keuzeknoppen. */
function countStageInfo(stage) {
  switch (stage) {
    // 'tap' = tik en tel: het kind tikt zelf elk voorwerp aan (zie tapPlekken)
    case 1: return { types: ['count', 'tap'],        baseMax: 3, topMax: 3,  rungs: 2, tiles: 3 };
    case 2: return { types: ['count', 'along', 'tap'], baseMax: 5, topMax: 6, rungs: 3, tiles: 4 };
    case 3: return { types: ['compare'],            baseMax: 5, topMax: 8,  rungs: 3, tiles: 3 };
    case 4: return { types: ['match'],              baseMax: 5, topMax: 8,  rungs: 3, tiles: 4 };
    // fase 5 is de luisterfase; zonder geluid valt hij terug op 'match' (zelfde
    // bereik, zelfde soort keuze, maar de opgave staat wél in beeld) -- zie
    // countStageTypes hieronder
    case 5: return { types: ['listen'],             baseMax: 5, topMax: 8,  rungs: 3, tiles: 4 };
    case 6: return { types: ['numeral', 'numquant'], baseMax: 5, topMax: 10, rungs: 3, tiles: 4 };
    case 7: return { types: ['onemore', 'oneless'], baseMax: 3, topMax: 9,  rungs: 3, tiles: 4 };
    // 'vriend' = de vriendjes van vijf of tien: hoeveel nog tot een vol raam
    case 8: return { types: ['combine', 'split', 'vriend'], baseMax: 5, topMax: 10, rungs: 3, tiles: 4 };
    // gesteunde sommen: tekens (visueel) → cijfers+stippen → geschreven (steun vervaagt)
    case 9:  return { types: ['sumsym'],     baseMax: 5, topMax: 8,  rungs: 3, tiles: 4 };
    case 10: return { types: ['sumdots'],    baseMax: 5, topMax: 10, rungs: 3, tiles: 4 };
    case 11: return { types: ['sumwritten'], baseMax: 5, topMax: 10, rungs: 3, tiles: 4 };
    // tot 20: "tien en nog wat" -- als hoeveelheid (twee volle rijen en meer) en als som
    case 12: return { types: ['tiental', 'tienplus'], baseMax: 15, topMax: 20, rungs: 3, tiles: 4 };
    default: return { types: ['count'], baseMax: 3, topMax: 3, rungs: 2, tiles: 3 };
  }
}
function countTopRung(stage) { return countStageInfo(stage).rungs - 1; }
/* Kan de app nú praten? Geluid aan, een browser die spraak ondersteunt, en een
   Nederlandse stem. Zonder die stem praat het toestel toch, maar met zijn eigen
   (vaak Engelse) stem: "zes" wordt dan iets dat een kind niet herkent, en een
   luistervraag een gok. Is de stemmenlijst nog leeg, dan weten we het niet --
   sommige Android-browsers vullen hem nooit en praten toch -- en dan geldt de
   stem als aanwezig. */
function canSpeak() { return !!db.sound && hasSpeech() && !geenNlStem(); }
function geenNlStem() {
  if (!_voices.length) refreshVoices();
  return _voices.length > 0 && !nlVoice();
}
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
// Met hoeveelheden onder de tien stopt het vóór fase 12: die gaat tot twintig.
function countMaxStage(s) {
  const top = (s.qmax || 10) < 10 ? 11 : COUNT_STAGE_MAX;
  return s.numerals ? Math.min(top, s.stageMax || COUNT_STAGE_MAX) : Math.min(5, s.stageMax || COUNT_STAGE_MAX);
}
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
  // fase 12 gaat per definitie tot twintig; de rest blijft binnen de tien
  const cap = stage === 12 ? 20 : Math.min(s.qmax || 10, 10);
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

  if (type === 'tap') {
    // Tik en tel: het kind telt zelf, één tik per voorwerp, en de stem zegt het
    // telwoord bij elke tik. Los door elkaar en niet in een raam: dan valt er
    // niets van een vorm af te lezen en moet je bijhouden welke je al had --
    // precies het één-op-één tellen dat meetellen alleen voordoet.
    const n = rnd(1, max);
    q.ans = n; q.tap = true;
    q.card = { kind: 'tap', n, emoji, pos: tapPlekken(n) };
    q.choices = countDistractors(n, nCh, 1, max, d.delta).map(qgroup);
    q.prompt = 'Tik ze één voor één aan, en tel mee!';
  } else if (type === 'count' || type === 'along') {
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
    /* Groot tegen klein: op de hoogste trap staat de kleinste groep er soms in
       grote voorwerpen en de andere in kleine, los en niet in een raam. Dan
       is "de meeste" niet meer "het meeste plek" -- je moet echt tellen. Alleen
       bij voorwerpen: stippen hebben een vast raam en dus geen maat om mee te
       misleiden. */
    if (repr === 'objects' && d.rung >= d.top && Math.random() < 0.5) {
      const lo = Math.min(...vals);
      q.choices.forEach(c => { c.frame = false; c.cls = c.v === lo ? 'groot' : 'klein'; });
    }
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
    /* Nul: op de hoogste trap gaat er af en toe één weg van één. Dan is er niets
       meer, en ook dat is een getal -- het enige dat in de hele telmodus nog niet
       voorkwam. De knop met nul is een leeg raampje (zie renderCountAnswers). */
    const naarNul = dir < 0 && d.rung >= d.top && Math.random() < 0.2;
    const base = dir > 0 ? rnd(1, max - 1) : (naarNul ? 1 : rnd(2, max));
    q.ans = base + dir;
    q.card = { kind: 'delta', base, dir, emoji, frame, repr };
    q.choices = countDistractors(q.ans, nCh, q.ans === 0 ? 0 : 1, max, d.delta).map(qgroup);
    q.prompt = dir > 0 ? 'Er komt er één bij. Hoeveel zijn het er nu?' : 'Er gaat er één weg. Hoeveel zijn het er nu?';
  } else if (type === 'combine') {                 // twee groepjes samen
    const a = rnd(1, Math.max(1, max - 1));
    const b = rnd(1, Math.max(1, max - a));
    q.ans = a + b;
    q.card = { kind: 'combine', a, b, emoji, frame, repr };
    q.choices = countDistractors(q.ans, nCh, 1, max, d.delta).map(qgroup);
    q.prompt = 'Hoeveel zijn het er samen?';
  } else if (type === 'vriend') {
    /* Hoeveel nog tot tien (of tot vijf, zolang de aantallen nog klein zijn)? Een
       vol raam met n stippen; het antwoord zijn de lege vakjes. Dat zijn de
       "tienvriendjes" (7 en 3, 6 en 4): de grond onder het rekenen over het
       tiental heen, dat de rekenshow vanaf wereld 3 vraagt. Altijd stippen in
       een vast raam, ook als de ouder voorwerpen koos: het raam ís de vraag. */
    const doel = max >= 10 ? 10 : 5;
    const n = rnd(1, doel - 1);
    q.ans = doel - n;
    q.card = { kind: 'vriend', n, doel };
    q.choices = countDistractors(q.ans, Math.min(nCh, doel - 1), 1, doel - 1, d.delta)
      .map(v => ({ v, kind: 'numeral', n: v, support: d.support }));
    q.prompt = 'Hoeveel nog tot ' + numWord(doel) + '?';
  } else if (type === 'tiental' || type === 'tienplus') {
    /* Tot twintig: "tien en nog wat". Het raam groeit per rij van vijf mee (zie
       dotFrameHTML), dus elf tot twintig zijn twee volle rijen plus de rest --
       het tiental zie je zonder te tellen. Bij tienplus staat het als som:
       10 + n, met de stippen eronder. Antwoord altijd als cijfer, zonder
       steunstipjes (twintig stipjes onder een cijfer zie je niet meer). */
    const n = rnd(11, max);
    q.ans = n;
    q.support = 'none';
    if (type === 'tiental') {
      q.card = { kind: 'tiental', n };
      q.prompt = 'Hoeveel zie je? Tien, en nog wat.';
    } else {
      q.card = { kind: 'sum', style: 'dots', op: '+', a: 10, b: n - 10, c: n, emoji, repr, support: 'full' };
      q.prompt = 'Tien plus ' + numWord(n - 10) + '. Hoeveel is dat?';
    }
    q.choices = countDistractors(n, nCh, 11, max, d.delta).map(v => ({ v, kind: 'numeral', n: v, support: 'none' }));
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
/* Plekken voor tik en tel, in procenten van de kaart: n vakken uit een raster
   van 4 × 3, elk een beetje verschoven. Een raster en geen vrije worp, zodat er
   nooit twee voorwerpen over elkaar vallen (dan tel je er één niet); het
   schuiven maakt dat het er niet als een raam uitziet. Eén keer per vraag
   gekozen en bewaard, zodat een nieuwe tekening (herhaalknop) niets verplaatst. */
function tapPlekken(n) {
  const vakken = shuffle([...Array(12).keys()]).slice(0, n);
  return vakken.map(v => {
    const kol = v % 4, rij = Math.floor(v / 4);
    return [Math.round(13 + kol * 24.7 + (Math.random() - 0.5) * 8), Math.round(17 + rij * 33 + (Math.random() - 0.5) * 7)];
  });
}
// De voorwerpen van tik en tel: elk een eigen knop, zodat een tik precies één telt.
function tapHTML(card) {
  return `<div class="cq-tap">${card.pos.map(([x, y], i) =>
    `<button type="button" class="tap-obj" data-i="${i}" style="left:${x}%;top:${y}%"><span class="cg-obj">${card.emoji}</span></button>`).join('')}</div>`;
}
/* Een tik telt een voorwerp dat nog niet geteld was: het krijgt zijn nummer
   (of een vinkje, als de ouder de cijfers uitzette) en de stem zegt het
   telwoord. De volgorde maakt niet uit -- wél dat je er geen twee keer telt,
   dus een tweede tik op hetzelfde voorwerp doet niets. Na het laatste worden
   de antwoordknoppen tikbaar en klinkt het laatste telwoord nog eens: dát is
   hoeveel het er zijn. */
function bindTap(card, q, drawId) {
  let geteld = 0;
  const cijfers = P().settings.numerals !== false;
  card.querySelectorAll('.tap-obj').forEach(b => {
    b.onclick = () => {
      if (!G || !G.count || drawId !== countDrawId || b.classList.contains('geteld')) return;
      geteld++;
      b.classList.add('geteld');
      b.dataset.nr = cijfers ? geteld : '✓';
      sndClick();
      if (geteld < q.card.n) { speak(numWord(geteld), { rate: 0.95 }); return; }
      q.getikt = true;
      const rij = document.querySelector('#answer-area .count-tiles');
      if (rij) rij.classList.remove('wacht');
      speak(numWord(geteld) + '! Hoeveel zijn het er?', { rate: 0.95 });
    };
  });
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
  else if (kind === 'tap') body = tapHTML(q.card);
  else if (kind === 'tiental') body = `<div class="cq-groupwrap">${dotFrameHTML(q.card.n, 10, 'big', 'full')}</div>`;
  else if (kind === 'vriend') body = `<div class="cq-groupwrap">${dotFrameHTML(q.card.n, q.card.doel, 'big', 'full')}</div>`;
  card.innerHTML = `<div class="count-q">${body}</div>`;
  if (kind === 'tap') {
    if (q.getikt) card.querySelectorAll('.tap-obj').forEach(b => b.classList.add('geteld'));
    else bindTap(card, q, myDraw);
  }
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
    } else if (c.n === 0) {
      inner = dotFrameHTML(0, c.cap || 5, '', 'full');   // nul: een leeg raampje, geen lege knop
    } else {
      inner = groupHTML(c.n, c.emoji, c.repr, c.cls || '', c.frame, c.cap);
    }
    return `<button class="count-tile" data-v="${c.v}">${inner}</button>`;
  }).join('');
  const n = q.choices.length;
  // tik en tel: de knoppen wachten tot alles geteld is (zie bindTap)
  const cls = 'count-tiles' + (n <= 2 ? ' two' : n === 3 ? ' three' : '') + (q.tap && !q.getikt ? ' wacht' : '');
  area.innerHTML = `<div class="${cls}">${tiles}</div>`;
  area.querySelectorAll('.count-tile').forEach(b => {
    b.onclick = () => submitAnswer(parseInt(b.dataset.v, 10), b);
  });
}
// Meetellen: elk object popt op maat op; de getallen worden achter elkaar gezegd.
function countAlong(objs, n, lead, drawId) {
  let i = 0;
  const step = () => {
    if (!G || !G.count || i >= n) return;
    if (drawId != null && drawId !== countDrawId) return;   // er staat alweer een nieuwe vraag

    const o = objs[i];
    if (o) { o.classList.remove('pre'); o.classList.add('pop'); }
    speak(numWord(i + 1), { rate: 0.9 });
    i++;
    if (i < n) setTimeout(step, 620);
  };
  // Eerst de opdracht helemaal uit ("Tel mee! Hoeveel zie je?", en op een gouden
  // vraag ook "Gouden vraag! ..."), dan pas "één": elk telwoord breekt af wat er
  // nog klonk, en zo bleef er van een gouden vraag alleen "Gou-" over.
  zegEnDan(lead, null, 650, step);
}
function replayPrompt() {
  sndClick();
  leesVraagOpnieuw();
}
function leesVraagOpnieuw() {
  const q = G && G.qs && G.qs[G.idx];
  if (!q) return;
  if (q.along && q.card && q.card.kind === 'group') {
    // ook .df-dot: in een stippenraam zitten de stippen daarin (niet in .cg-dot)
    const objs = $('question-text').querySelectorAll('.cg-obj, .cg-dot, .df-dot');
    objs.forEach(o => { o.classList.remove('pop'); o.classList.add('pre'); });
    countAlong(objs, q.card.n, q.prompt, countDrawId);
  } else {
    speak(q.prompt || somZin(q));   // een rekensom heeft geen prompt: die lezen we voor
  }
}
/* Terug in de app, midden in een vraag: lees hem nog eens voor. Hij werd
   misschien voorgelezen aan een vergrendeld scherm, of de stem werd bij het
   weggaan afgebroken (zie cancelSpeech hierboven) -- en een kind dat niet leest,
   ziet anders een stille vraag. Alleen voor de vraag die er bij het weggaan al
   stond en nog open was: komt er bij terugkomst een nieuwe vraag op, dan leest
   die zichzelf voor. speak() zwijgt zelf in de rekenmodus zonder Voorlezen. */
let stemWegVraag = null;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    const q = G && G.qs && G.qs[G.idx];
    stemWegVraag = q && !G.lock && $('screen-game').classList.contains('active') ? q : null;
    return;
  }
  const q = stemWegVraag;
  stemWegVraag = null;
  if (!q || !G || G.lock || G.qs[G.idx] !== q) return;
  if (!$('screen-game').classList.contains('active') || $('quit-modal').classList.contains('open')) return;
  leesVraagOpnieuw();
});
// Nauwkeurigheid van de telmodus (voor de fase-klim) + de rung bínnen de fase:
// 3× in-één-keer-goed op rij → rung omhoog; een misser → rung omlaag.
function updateCountAcc(p, correct, firstTry) {
  const ct = p.countTrack;
  ct.seen = (ct.seen || 0) + 1;
  ct.acc = lopend(ct.acc == null ? 0.5 : ct.acc, antwoordWaarde(correct, firstTry));
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
/* Hoeveel vragen een fase minstens gezien moet hebben voor hij als beheerst
   telt. Acht is twee shows; bij de cijfers (fase 6) twaalf, want daar zitten tien
   verschillende cijfers in en in acht vragen komen ze niet allemaal langs.
   SNEL: een show zonder één misser, in een fase die het kind duidelijk al kan,
   mag na één show door -- anders zat een kind van zes dat al kan tellen zo'n
   tien shows op fases die het te makkelijk vindt. Niet bij de cijfers: daar
   geldt het minimum altijd. */
const COUNT_MIN_SEEN = 8, COUNT_MIN_SEEN_CIJFERS = 12, COUNT_SNEL_SEEN = 5;
/* Terug een fase pas na COUNT_TERUG_NA mislukte shows op rij (ct.mislukt), of
   als de nauwkeurigheid echt laag is. Eén mislukte show zette het kind meteen
   een hele fase terug, en één vermoeide middag is geen teken dat een fase te
   moeilijk is. Binnen de fase zakt de rung al bij elke misser (updateCountAcc),
   dus de vragen worden intussen wél meteen lichter. */
const COUNT_TERUG_NA = 2;
function advanceCountStage(p, success, foutloos) {
  const s = p.settings;
  const lo = Math.max(1, s.stage || 1);
  const hi = Math.max(lo, countMaxStage(s));
  const ct = p.countTrack;
  let st = Math.min(hi, Math.max(lo, ct.stage || lo));
  const top = countTopRung(st);
  const cijfers = countStageInfo(st).types.includes('numeral');
  const gewoon = ct.acc >= 0.85 && (ct.seen || 0) >= (cijfers ? COUNT_MIN_SEEN_CIJFERS : COUNT_MIN_SEEN) && (ct.rung || 0) >= top;
  // snel: foutloos, genoeg gezien voor één hele show, en bijna bovenaan de fase
  const snel = foutloos && !cijfers && (ct.seen || 0) >= COUNT_SNEL_SEEN && (ct.rung || 0) >= top - 1;
  ct.mislukt = success ? 0 : (ct.mislukt || 0) + 1;
  if (success && (gewoon || snel) && st < hi) {
    st++; ct.rung = 0; ct.streak = 0; ct.seen = 0; ct.acc = 0.6;   // frisse start op de nieuwe fase
  } else if ((ct.mislukt >= COUNT_TERUG_NA || ct.acc < 0.5) && st > lo) {
    st--; ct.rung = countTopRung(st); ct.streak = 0; ct.acc = 0.55; ct.seen = 0;  // terug naar wat wél lukt
    ct.mislukt = 0;
  }
  if (st !== ct.stage) ct.plafond = 0;   // een andere fase: het plafond is (nog) niet bereikt
  ct.stage = st;
}
/* Tegen het plafond aan: hoeveel shows met drie sterren het kind al speelde op
   de hoogste fase die het mag spelen, op de hoogste trap ervan. Hier groeit het
   spel niet meer vanzelf verder -- dat is aan de ouder (zie telTip). Telt pas ná
   advanceCountStage, zodat een show die nét een fase hoger zet niet meetelt. */
function telPlafondTel(p, stars) {
  const ct = p.countTrack;
  const st = countLiveStage(p);
  if (st < countMaxStage(p.settings) || (ct.rung || 0) < countTopRung(st)) { ct.plafond = 0; return; }
  if (stars >= 3) ct.plafond = (ct.plafond || 0) + 1;
}
// Een andere grens gekozen (fase, cijfers, hoeveelheid of modus): opnieuw tellen.
function telPlafondOpnieuw(p) { if (p && p.countTrack) p.countTrack.plafond = 0; }
// Lees-vrije "bijna!" bij een eerste misser: geen tekst, wel een vriendelijke stem.
function countMissSpeak(q, val) {
  if (q.compare) { speak('Bijna! Kijk goed welke groep ' + (q.compare === 'more' ? 'de meeste' : 'de minste') + ' heeft.'); return; }
  if (q.ctype === 'onemore') { speak('Bijna! Eén erbij is één meer. Tel nog eens.'); return; }
  if (q.ctype === 'oneless') { speak('Bijna! Eén eraf is één minder. Tel nog eens.'); return; }
  if (q.ctype === 'combine') { speak('Bijna! Tel de twee groepjes samen.'); return; }
  if (q.ctype === 'split') { speak('Bijna! Hoeveel horen er nog bij?'); return; }
  if (q.ctype === 'vriend') { speak('Bijna! Tel de lege vakjes.'); return; }
  if (q.ctype === 'tiental' || q.ctype === 'tienplus') { speak('Bijna! Eerst de tien, en dan tel je verder.'); return; }
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
// klaar() komt als de stem uitgesproken is (zie zegEnDan), of meteen zonder tegel.
const REVEAL_RUST = 400;   // het laatste telwoord krijgt even om te beginnen
function countReveal(q, klaar) {
  klaar = klaar || (() => {});
  const tile = [...document.querySelectorAll('.count-tile')].find(b => parseInt(b.dataset.v, 10) === q.ans);
  if (!tile) { klaar(); return; }
  tile.classList.add('good');
  const objs = tile.querySelectorAll('.cg-obj, .cg-dot, .df-dot');
  // cijfer-tegel (getal-fases + geschreven sommen): zeg het getal; anders tel de groep mee
  if (tile.querySelector('.ct-num')) { zegEnDan('Dit is de ' + numWord(q.ans) + '.', null, REVEAL_RUST, klaar); return; }
  if (q.ans === 0) { zegEnDan('Nul. Er is niets meer.', null, REVEAL_RUST, klaar); return; }
  // net als countAlong/animateDelta: elke geplande stap meldt zich eerst af bij G,
  // anders blijft dit doortellen nadat de show intussen verlaten is (zie quitGame)
  let i = 0;
  const c = () => {
    if (!G || !G.count || i >= q.ans) return;
    if (objs[i]) objs[i].classList.add('pop');
    i++;
    if (i < q.ans) { speak(numWord(i), { rate: 0.95 }); setTimeout(c, 560); }
    else zegEnDan(numWord(i), { rate: 0.95 }, REVEAL_RUST, klaar);
  };
  setTimeout(c, 250);
}

/* ================= Memory-spel (lees-vrij) =================
   Clara's favoriete spelvorm, ingezet als reken-oefening: draai twee kaartjes
   om en vind de PAREN met evenveel — dezelfde hoeveelheid in een andere vorm
   (voorwerpen ↔ stippen ↔ tienraam ↔ cijfer). Traint subitiseren, het koppelen
   van weergaven én het geheugen. Beloningen lopen via dezelfde diamant-pijplijn
   (kleedkamer, trofeeën blijven meetellen).

   Sinds oktober 2026 ook voor rekenkinderen: daar hoort een som bij zijn
   antwoord (3 + 4 ↔ 7), eerst uit de sommen die ze lastig vindt (p.weak), dus
   het is ongemerkt herhalen. En het getal wordt pas uitgesproken als het paar
   gevonden is: eerst zei de stem het bij elke kaart, en dan kon je op het gehoor
   matchen zonder te tellen. */
let M = null;
// Eén kaartje omzetten in beeld: voorwerpen, stippen, tienraam of cijfer.
// wat een memory-potje oplevert -- gedeeld door het spel zelf en door de belofte
// op de knop op de kaart (zie memPayout)
const MEM_PAIR_GAIN = 2, MEM_DONE_BONUS = 3, MEM_MIN_PAREN = 4;
function memFaceHTML(c) {
  /* een som past op een kaart als de letter met de lengte meekrimpt ("3 + 4"
     tegen "48 + 37"); in cqw, dus ook mee met de kaart zelf */
  if (c.som) return `<span class="ct-som" style="font-size:${Math.min(28, Math.round(130 / c.som.length))}cqw">${c.som}</span>`;
  if (c.repr === 'numeral') return `<span class="ct-num">${c.v}</span>`;
  if (c.repr === 'frame') return frameHTML(c.v, c.emoji, 'objects');
  if (c.repr === 'dots') return groupHTML(c.v, '', 'dots');
  return groupHTML(c.v, c.emoji, 'objects');
}
// Bouwt het kaartspel: P paren (elk een unieke hoeveelheid) in twee verschillende
// weergaven. Aantal paren en bereik groeien mee met de fase/rung. Een rekenkind
// krijgt de sommenvariant (memSomDeck).
function buildMemoryDeck(p) {
  if (p.settings.track !== 'count') return memSomDeck(p);
  const stage = countLiveStage(p);
  const d = countDifficulty(p, stage);
  const max = Math.max(3, Math.min(10, d.effMax));   // memory blijft binnen de tien, ook in fase 12
  // minstens vier paren: met drie was een potje na een twintigtal tellen al uit
  let pairs = MEM_MIN_PAREN + (d.rung >= 1 ? 1 : 0) + (d.rung >= 2 ? 1 : 0);   // 4..6
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
/* De rekenvariant: een som en zijn antwoord vormen een paar. Elk antwoord komt
   maar één keer voor, anders passen er twee sommen bij hetzelfde getal. Eerst de
   sommen die ze lastig vindt en die nog passen (zwaarste eerst), de rest uit dezelfde maker als de
   show, op de stap van de wereld waar ze nu is. */
function memSomDeck(p) {
  const pairs = MEM_MIN_PAREN;
  const gekozen = [], antwoorden = new Set();
  const neem = (tmpl, ans) => {
    if (gekozen.length >= pairs || antwoorden.has(ans) || !/ = @$/.test(tmpl)) return;
    antwoorden.add(ans); gekozen.push({ som: tmpl.replace(/ = @$/, ''), v: ans });
  };
  Object.entries(p.weak || {}).filter(([tmpl, e]) => pastNog(tmpl, e, p.settings))
    .sort((a, b) => b[1].w - a[1].w).slice(0, 2)
    .forEach(([tmpl, e]) => neem(tmpl, e.ans));
  const lvl = WORLD_START[continueWorld(p)] || 1;
  for (let poging = 0; gekozen.length < pairs && poging < 60; poging++) {
    const q = genQuestion(p.settings, lvl, p.perf);
    neem(q.tmpl, q.ans);
  }
  const cards = [];
  gekozen.forEach(g => cards.push({ v: g.v, som: g.som }, { v: g.v, repr: 'numeral' }));
  return { cards: shuffle(cards), pairs: gekozen.length };
}
// Wat de stem zegt als een paar gevonden is: het getal, of de hele som.
function memZin(a, b) {
  const s = a.som || b.som;
  if (!s) return numWord(a.v);
  return s.split(' ').map(t => SOM_WOORD[t] || numWord(parseInt(t, 10))).join(' ') + ' is ' + numWord(a.v);
}
function startMemory() {
  sndClick();
  const p = P();
  const { cards, pairs } = buildMemoryDeck(p);
  M = { cards, pairs, flipped: [], matched: 0, lock: false, earned: 0 };
  /* Op de rug het teken van de wereld waar je naar kijkt (de kaart achter dit
     scherm), niet altijd dezelfde microfoon: zo hoort het potje bij de reis. */
  const wi = viewWorldIdx != null && WORLDS[viewWorldIdx] ? viewWorldIdx : continueWorld(p);
  const rug = (WORLDS[wi] && WORLDS[wi].icon) || '🎤';
  $('mem-done').style.display = 'none';
  telNu($('mem-diamonds'), p.diamonds);
  const grid = $('mem-grid');
  grid.style.setProperty('--cols', Math.min(pairs, 4));   // voorlopige waarde; memFitCols meet zo de echte
  grid.innerHTML = cards.map((c, i) =>
    `<button class="mem-card" data-i="${i}"><span class="mem-inner"><span class="mem-back">${rug}</span><span class="mem-face">${memFaceHTML(c)}</span></span></button>`
  ).join('');
  grid.querySelectorAll('.mem-card').forEach(b => b.onclick = () => flipCard(parseInt(b.dataset.i, 10), b));
  renderSegBar($('mem-progress'), pairs, 0, false);
  toonHub('screen-memory');
  // pas ná show() heeft de arena een maat: kies dan het aantal kolommen dat de
  // kaartjes zo groot mogelijk maakt binnen die ruimte
  requestAnimationFrame(() => memFitCols(grid, cards.length));
  speak(p.settings.track === 'count' ? 'Zoek de twee kaartjes met evenveel.' : 'Zoek de som bij zijn antwoord.');
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
  /* Layoutmaten (clientWidth/offsetHeight), geen getBoundingClientRect: dit draait
     terwijl het scherm nog inzoomt (komt-op), en de omtrek telt die schaal mee.
     Het raster kwam daardoor ~3% te breed uit, tot 3px van de rand. */
  const w = grid.clientWidth;
  // 56px marge: de arena en het scherm hebben zelf ook nog padding
  const h = screen.clientHeight - (sticky ? sticky.offsetHeight : 0) - 56;
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
/* De ✕ van memory, en de terugknop daar. Memory had een ←, en die ging meteen
   weg, midden in een potje -- vanuit dezelfde hoek waar de show een ✕ heeft die
   eerst vraagt. Nu is het dezelfde ✕ en hetzelfde venster, met dezelfde regel:
   nog niets gedaan (geen kaartje omgedraaid) of al klaar, dan vraagt hij niets.
   De 💎 van de gevonden paren zijn al bewaard (onMemMatch), dus het venster
   belooft alleen wat waar is. */
function vraagMemoryStop() {
  if (!M || !M.gedraaid || $('mem-done').style.display === 'flex') { exitMemory(); return; }
  sndClick();
  renderGeluid();
  $('quit-titel').textContent = '🎤 Memory stoppen?';
  $('quit-zin').textContent = 'Je 💎 mag je houden.';
  $('quit-modal').classList.add('open');
  syncBackGuard();
}
// "Stoppen" in dat venster: memory uit, of de show uit.
function stopNu() {
  if ($('screen-memory').classList.contains('active')) { $('quit-modal').classList.remove('open'); exitMemory(); }
  else quitGame();
}
// MEM_DRAAI is de draai van een kaart (.mem-inner in 50-zaal: transition .35s).
const MEM_DRAAI = 350, MEM_KIJK = 850;
function flipCard(i, btn) {
  if (!M || M.lock) return;
  if (btn.classList.contains('open') || btn.classList.contains('done')) return;
  const c = M.cards[i];
  M.gedraaid = true;   // vanaf nu vraagt de ✕ eerst (zie vraagMemoryStop)
  btn.classList.add('open');
  sndClick();   // geen getal meer: dat komt pas bij een gevonden paar (zie onMemMatch)
  M.flipped.push({ c, btn });
  if (M.flipped.length < 2) return;
  M.lock = true;
  const [a, b] = M.flipped;
  /* Wie het spel verlaat zet M op null (exitMemory). De klokjes hieronder lopen
     dan nog door, en lazen M daarna: een fout midden in het feestje, en een
     bonus die wel opgeteld maar niet bewaard werd. Ze kijken nu eerst of het nog
     hetzelfde spel is. */
  const m = M;
  if (a.c.v === b.c.v) {
    setTimeout(() => {
      if (M !== m) return;
      a.btn.classList.add('done'); b.btn.classList.add('done');
      a.btn.classList.remove('open'); b.btn.classList.remove('open');
      a.btn.classList.add('snap'); b.btn.classList.add('snap');   // 'klik samen'-bounce
      setTimeout(() => { a.btn.classList.remove('snap'); b.btn.classList.remove('snap'); }, 440);
      onMemMatch(b.btn, memZin(a.c, b.c));
      M.flipped = []; M.lock = false;
    }, 450);
  } else {
    /* Kort schudje bij een misser -- maar pas als de tweede kaart helemaal om is
       (.mem-inner draait in MEM_DRAAI). Het schudde op hetzelfde beeldje als de
       draai begon: "nee" kwam dan vóór het kind zag wat er op de kaart stond. En
       daarna even laten liggen (MEM_KIJK), zodat ze kan onthouden wat waar lag;
       dat is het hele spel. */
    setTimeout(() => {
      if (M !== m) return;
      a.btn.classList.add('wrong'); b.btn.classList.add('wrong');
      setTimeout(() => { a.btn.classList.remove('wrong'); b.btn.classList.remove('wrong'); }, 430);
    }, MEM_DRAAI);
    setTimeout(() => {
      if (M !== m) return;
      a.btn.classList.remove('open'); b.btn.classList.remove('open');
      M.flipped = []; M.lock = false;
    }, MEM_DRAAI + MEM_KIJK);
  }
}
function onMemMatch(fromBtn, zin) {
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
  // eerst wat je gevonden hebt ("zeven", "drie plus vier is zeven"), dan de lof
  // erachter aan, niet eroverheen (wacht)
  speak(zin);
  if (M.matched >= M.pairs) { const m = M; setTimeout(() => finishMemory(m), 650); }
  else speak(pick(['Goed zo!', 'Ja!', 'Knap!', 'Gevonden!']), { wacht: true });
}
function finishMemory(m) {
  const p = P();
  const bonus = MEM_DONE_BONUS;
  // De bonus is verdiend, ook als het kind al weg is; alleen het feestje niet meer.
  p.diamonds += bonus; m.earned += bonus;
  save();
  // het feestje wacht tot het kind weer kijkt (zie alsZichtbaar); de bonus niet
  alsZichtbaar(() => memoryFeest(m, p));
}
function memoryFeest(m, p) {
  if (M !== m) return;
  telStraks($('mem-diamonds'), p.diamonds);
  sndGroot();
  confetti(28);
  flyDiamonds($('mem-grid'), $('mem-diamonds'), 3);
  speak('Wauw! Je hebt ze allemaal gevonden!', { wacht: true });
  $('mem-done-earn').textContent = '💎 +' + M.earned;
  $('mem-done').style.display = 'flex';
  // eerst de achtergrond, dan de kaart erop (popIn, 40-kaart) -- hij stond er in één klap
  const kaart = $('mem-done').querySelector('.mem-done-card');
  if (kaart && kaart.animate && !motionOff()) {
    $('mem-done').animate([{ opacity: 0 }, { opacity: 1 }], { duration: MOTION.snel, easing: 'ease-out' });
    kaart.animate([{ transform: 'scale(.85)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: 360, delay: 120, easing: MOTION.plop, fill: 'backwards' });
  }
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
/* Mag een bewaarde som (uit p.weak of p.learned) nog terugkomen met wat er nú
   is ingesteld? Een ouder zet op elk moment een bewerking uit, verlaagt de
   grens of haalt tafels weg, en wat ze daarvóór miste of leerde blijft gewoon
   bewaard. Zonder deze toets op álle drie kwam 8 × 2 terug als zwakke som
   terwijl alleen de tafels van 3, 6 en 9 aanstonden.
     plus en min  geen getal in de som boven de grens (bij min is dat het
                  eerste, niet het antwoord)
     × en :       de tafel staat nog aan. De tafel is het tweede getal: zo
                  bouwt genTriple ze (b = pick(tables)), en alleen klassieke
                  sommen komen in de poel (zie incWeak). */
function pastNog(tmpl, e, s) {
  const ops = s.ops.length ? s.ops : ['+'];
  if (!ops.includes(e.op)) return false;
  const getallen = (tmpl.match(/\d+/g) || []).map(Number);
  if (e.op === '+' || e.op === '-') return Math.max(e.ans, ...getallen) <= s.max;
  const tables = s.tables.length ? s.tables : [2, 5, 10];
  return tables.includes(getallen[1]);
}
// Een som die aan onderhoud toe is: het langst over tijd gaat voor. Alleen wat
// met de instellingen van nu nog kan (pastNog).
// mag (optioneel): zegt per sjabloon of hij nu terug mag komen (zie buildQuestion).
function pickRefresh(p, s, mag) {
  if (!p.learned) return null;
  const now = qClock(p);
  let best = null, bestOver = -1;
  for (const k of Object.keys(p.learned)) {
    const e = p.learned[k];
    if (!pastNog(k, e, s) || (mag && !mag(k))) continue;
    const over = now - e.due;
    if (over >= 0 && over > bestOver) { best = k; bestOver = over; }
  }
  if (!best) return null;
  const e = p.learned[best];
  return { tmpl: best, ans: e.ans, op: e.op, kind: 'classic', refresh: true };
}
// Kies een zwakke som om te herhalen (alleen als hij nog past, zie pastNog); zwaardere vaker.
// mag (optioneel): zegt per sjabloon of hij nu terug mag komen (zie buildQuestion).
function pickWeak(p, s, mag) {
  const keys = Object.keys(p.weak).filter(k => pastNog(k, p.weak[k], s) && (!mag || mag(k)));
  if (!keys.length) return null;
  const pool = [];
  keys.forEach(k => { for (let i = 0; i < p.weak[k].w; i++) pool.push(k); });
  const k = pick(pool.length ? pool : keys);
  return { tmpl: k, ans: p.weak[k].ans, op: p.weak[k].op, kind: 'classic' };
}
/* Bouwt de volgende vraag: ~35% kans op een zwakke herhaling, anders een verse
   (adaptieve) som.

   g (optioneel) is de show die loopt, en die bepaalt wat er nu níét mag:

     net geweest   een som uit de laatste HERHAAL_AFSTAND vragen komt niet
                   terug -- ook niet als verse som. Een gemiste som is dus pas
                   twee vragen later weer aan de beurt.
     al herhaald   een zwakke of geleerde som komt hoogstens één keer per show
                   terug (g.herhaald).

   Zonder die twee regels kon een gemiste som meteen de volgende vraag zijn, en
   daarna nóg eens: in één show van acht kwam 3 + 7 drie keer, waarvan twee keer
   vlak achter elkaar. Dat leest niet als oefenen maar als vastzitten. Het
   gewicht in p.weak blijft gewoon staan; hij komt in een volgende show terug. */
const HERHAAL_AFSTAND = 2;
function buildQuestion(p, lvl, g) {
  const net = [];
  if (g) for (let i = Math.max(0, g.idx - HERHAAL_AFSTAND); i < g.idx; i++) if (g.qs[i]) net.push(g.qs[i].tmpl);
  const al = g && g.herhaald;
  const mag = k => !net.includes(k) && !(al && al.has(k));
  if (Math.random() < 0.35) {
    const wq = pickWeak(p, p.settings, mag);
    if (wq) { if (al) al.add(wq.tmpl); return wq; }
  }
  // onderhoud: af en toe een som die al geleerd is maar lang niet langskwam
  if (Math.random() < 0.12) {
    const rq = pickRefresh(p, p.settings, mag);
    if (rq) { if (al) al.add(rq.tmpl); return rq; }
  }
  // een verse som, maar niet precies die van net (een paar pogingen, en dan
  // toch: bij "tot 10" met alleen plus is de pot klein)
  let q, poging = 0;
  do { q = genQuestion(p.settings, lvl, p.perf); } while (net.includes(q.tmpl) && ++poging < 8);
  return q;
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
  if (!t) { t = { n: 0, acc: 0.5, paused: false, unlockStap: null, fast: 0.5 }; p.opTrack[op] = t; }
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
const FAST_SPOT_KIES = 50;   // spotlight loopt in SPOT_DUUR (12s) leeg -> 50 = binnen ~6s
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
// Klaar voor zoek-het-getal bij deze bewerking: vanaf leerstap STAP_ZOEK (wereld
// 4), beheerst, niet op pauze.
function opReady(p, op, stap) {
  const t = p.opTrack[op];
  if (!t || stap < STAP_ZOEK || t.paused) return false;
  return opMastered(p, op);
}
// Klaar voor drie-getallen (alleen optellen): vanaf leerstap STAP_DRIE (wereld 5),
// tel-beheersing, en pas nadat zoek-het-getal voor + in een éérdere wereld is
// losgekomen — nooit twee nieuwe dingen in dezelfde wereld. Werkt met de
// tel-beheersing, ook als de ouder missNum uit heeft.
function chainReady(p, s, stap) {
  const ct = p.chainTrack;
  if (stap < STAP_DRIE || ct.paused) return false;
  if (!opMastered(p, '+')) return false;
  const plus = p.opTrack['+'];
  if (!plus || plus.unlockStap == null || stap - plus.unlockStap < 1) return false;
  return true;
}
// Zet de "sinds-stap"-stempel zodra een bewerking beheerst is (voor de chain-gate).
function refreshReadiness(p, stap) {
  ['+', '-', 'x', ':'].forEach(op => {
    const t = ot(p, op);
    if (stap >= STAP_ZOEK && opMastered(p, op) && t.unlockStap == null) t.unlockStap = stap;
  });
}
// Werkt de per-bewerking-nauwkeurigheid bij ná de definitieve afronding van een
// klassieke som (niet bij een tussentijdse herkansing). Pauze met hysterese,
// zie pauzeBij.
function updateOpAcc(p, op, correct, firstTry, fast) {
  const t = ot(p, op);
  t.n++;
  t.acc = lopend(t.acc, antwoordWaarde(correct, firstTry));
  // vlotheid alleen meten bij een directe treffer, en rustiger middelen dan de
  // accuratesse: even opkijken of napraten mag geen vlotheidsdip veroorzaken
  if (correct && firstTry) t.fast = t.fast * 0.85 + (fast ? 1 : 0) * 0.15;
  pauzeBij(t);
}
// Nauwkeurigheid van de drie-getallen-vragen zelf (voor hun eigen pauze).
function updateChainAcc(p, correct, firstTry) {
  const ct = p.chainTrack;
  ct.seen = (ct.seen || 0) + 1;
  ct.acc = lopend(ct.acc, antwoordWaarde(correct, firstTry));
  if (ct.seen >= 5) pauzeBij(ct);
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
/* Na de laatste leerstap is het "alles door elkaar", en dan voelt wereld 7
   precies als wereld 6. Dus krijgt elke wereld daarna om de beurt een accent:
   een gewone, een met extra zoek-het-getal, een met extra drie getallen. Er
   komt niets nieuws bij en niets wordt moeilijker -- het zijn dezelfde vragen,
   alleen vaker die ene soort, en alleen als die soort al vrij is (opReady,
   chainReady). Zo heeft elke wereld iets eigens zonder dat de ouder iets hoeft. */
const WERELD_ACCENT = [null, 'miss', 'chain'];
function wereldAccent(stap) {
  return stap < LEERSTAPPEN.length ? null : WERELD_ACCENT[(stap - LEERSTAPPEN.length) % WERELD_ACCENT.length];
}
function planSpecials(p, s, total, stap, goldIdx) {
  refreshReadiness(p, stap);
  const missOps = (s.missNum ? s.ops : []).filter(o => ['+', '-', 'x'].includes(o) && opReady(p, o, stap));
  const missAvail = missOps.length > 0;
  const chainAvail = !!s.chain3 && chainReady(p, s, stap);
  const twoOk = s.perLevel >= 8;   // 2 speciale vragen alleen bij lange optredens (≥8)
  const both = missAvail && chainAvail;
  let types = [];
  const accent = wereldAccent(stap);
  if (accent === 'miss' && missAvail) {
    types = twoOk ? ['miss', 'miss'] : ['miss'];
  } else if (accent === 'chain' && chainAvail) {
    // ook hier: in de introductiefase hoogstens één drie-getallen-vraag
    types = twoOk && p.chainTrack.rung >= 2 ? ['chain', 'chain'] : ['chain'];
  } else if (chainAvail && p.chainTrack.rung < 2) {
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
/* De hint na een eerste misser in de rekenmodus, als plaatje: het getal dat je
   koos, met een pijl erbij -- omhoog als het antwoord méér is, omlaag als het
   minder is. Dezelfde pijl komt klein op de rode tegel zelf, zodat hij bij het
   getal staat waar hij over gaat.

   Hier stond een zin: "Net iets te weinig — probeer een groter getal! 👆". De
   jongste rekenaars lezen cijfers maar nog geen zinnen, dus voor hen was een
   misser een rode kleur en een regel die ze niet konden lezen. De woorden
   staan nu alleen nog in het label voor een schermlezer (zie toonHint) -- en ze kloppen ook:
   "net iets" staat er alleen als het ook net iets was. De foute keuzes liggen
   meestal 1 tot 3 ernaast, maar één ervan is een echte fout en die kan ver
   weg liggen (13 + 6 bij 13 − 6, zie makeChoices) -- dan is "net iets" niet
   waar.

   Bewust géén stippen of ander hoeveelheidsplaatje: de rekenmodus is cijfers,
   en een plaatje dat alleen na een fout opduikt moet je ontcijferen op het
   slechtste moment -- en wordt een teken dat het misging. Zie docs/GAME-REVIEW.md. */
const HINT_DICHTBIJ = 2;
function hintVoor(q, val) {
  if (typeof val !== 'number' || isNaN(val) || val === q.ans) return null;
  const meer = q.ans > val;
  const net = Math.abs(q.ans - val) <= HINT_DICHTBIJ;
  const woord = meer ? 'meer' : 'minder';
  return { pijl: meer ? 'op' : 'neer',
           woorden: (net ? 'Net iets ' + woord : woord[0].toUpperCase() + woord.slice(1)) + ' dan ' + val };
}
// Een dikke pijl als SVG en niet als teken: ⬆️ is op elk toestel een ander
// blauw vierkantje, en een ↑ in de letter is te dun om van een meter af te zien.
function pijlSVG(richting) {
  const draai = richting === 'neer' ? ' transform="rotate(180 12 12)"' : '';
  return `<svg class="pijl-teken" viewBox="0 0 24 24" aria-hidden="true"><path${draai} d="M12 3 L21 13 H15.5 V21 H8.5 V13 H3 Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
}
function toonHint(q, val, btnEl) {
  const h = hintVoor(q, val);
  if (!h) { showToast('🤔', null, null, 'teken'); return; }
  if (btnEl) btnEl.insertAdjacentHTML('beforeend', `<span class="tegel-pijl ${h.pijl}">${pijlSVG(h.pijl)}</span>`);
  // De woorden ("Net iets meer dan 5") staan niet meer onder de pil: wie ze kan
  // lezen heeft ze niet nodig, en wie ze nodig heeft kan ze niet lezen -- de pijl
  // zegt het al, en op de rode tegel nog eens. Ze blijven voor een schermlezer.
  showToast(`<span class="hint-getal">${val}</span><span class="hint-pijl ${h.pijl}" role="img" aria-label="${esc(h.woorden)}">${pijlSVG(h.pijl)}</span>`,
            null, null, 'hint');
}

