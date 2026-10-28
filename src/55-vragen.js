/* ================= Vragen maken =================
   Een vraag is een sjabloon (`tmpl`) met één blanco plek `@` waar het gezochte
   getal hoort, plus dat getal (`ans`), de bewerking (`op`) en de soort (`kind`):
     - classic:  "3 + 4 = @"   -> ans 7   (het antwoord staat rechts, zoals altijd)
     - missing:  "3 + @ = 7"   -> ans 4   (tweede getal ontbreekt)
     - chain:    "3 + 4 + 2 = @" -> ans 9 (drie getallen, alleen optellen)
   Omdat het gezochte getal altijd één getal is, blijven meerkeuze, typen, hints,
   zwakke-sommen en álle beloningen ongewijzigd werken. */

/* ---- Het leerpad: één ladder, in de volgorde van school -----------------
   Wat een rekenkind leert staat in één tabel, LEERPAD, in de volgorde waarin
   een Vlaamse school het brengt. De instellingen bovenaan Oefeningen (+ − × ÷,
   de grens) zeggen welke rijen op háár pad staan; de volgorde zelf
   verandert nooit. Oefeningen, Voortgang en de vraagmaker lezen alle drie deze
   tabel (padRijen), en nergens anders staat een lijst stapnamen.

     soort 'bereik'  de getallen groeien (Tot 10, Tot 20, Over het tiental,
                     Getallen bouwen, Tientallen, Tot 100). Alleen bij plus of
                     min, en alleen tot de grens die de ouder koos (s.max): dat
                     is de lijn "tot" op de ladder. De blokken zijn die van
                     school: tot 20 in het eerste leerjaar, tot 100 in het
                     tweede. Een tussenstop "tot 50" kent het leerplan niet --
                     daar komt honderd via de opbouw (eerst de getallen bouwen,
                     dan hele tientallen), en het wennen (wenPlafond) doet de
                     rest.
     soort 'vorm'    een andere soort vraag met dezelfde getallen (zoek het
                     getal, drie getallen). Die laten de
                     getallen niet groeien, dus de lijn "tot" snijdt ze niet af:
                     ze staan in de tabel vóór alles boven twintig, en daarmee
                     altijd boven de lijn. Bij "tot 10" is het pad dus Tot 10,
                     Zoek het getal, Drie getallen -- zoals het altijd was.

   Op een rij zijn is cumulatief: alles van de rijen ervoor speelt mee (zie
   padStand). Een nieuwe rij is dus "dit erbij", nooit "alleen nog dit".

   VOORTGANG OP BEHEERSING, NIET OP DE WERELD. Hier was een stap eerst een
   wereldnummer: wereld 3 was "over het tiental", hoe het ook ging. Een stap die
   met de instellingen niet kon, liet zijn wereld de vorige herhalen (alleen ÷:
   vijf werelden dezelfde sommen), er was geen plek voor nieuwe onderwerpen
   zonder iedereen een wereld op te schuiven, en de grotere getallen kwamen
   buiten het pad om, in één keer. Nu blijft ze op een rij tot ze hem kan
   (padNa), en de werelden zijn alleen nog de reis.

   De tafels staan hier niet: dat is een eigen thema, met een eigen ladder en
   een eigen plek op die ladder (zie "= Thema's", TAFELPAD). Hier is het plus
   en min, en wat daarbij hoort.

   Een nieuw onderwerp is één rij hier, met zijn plek, zijn voorwaarde (past),
   zijn voorbeeld (vb) en wat het aan de vragen verandert (padStand) -- geen
   nieuw scherm, geen nieuwe instelling. test/kern.test.js zaak ZF houdt de
   volgorde en de voorbeelden vast. */
const LEERPAD = [
  { id: 'tot10',      soort: 'bereik', bereik: 10,  brug: 'nee',  naam: 'Tot 10' },
  { id: 'tot20',      soort: 'bereik', bereik: 20,  brug: 'nee',  naam: 'Tot 20' },
  { id: 'brug20',     soort: 'bereik', bereik: 20,  brug: 'vaak', naam: 'Over het tiental' },
  { id: 'zoek',       soort: 'vorm',   keuze: 'missNum',          naam: 'Zoek het getal' },
  { id: 'drie',       soort: 'vorm',   keuze: 'chain3',           naam: 'Drie getallen' },
  { id: 'bouwen100',  soort: 'bereik', bereik: 100, brug: 'nee',  naam: 'Getallen bouwen tot 100', bouwen: true },
  { id: 'tientallen', soort: 'bereik', bereik: 100, brug: 'nee',  naam: 'Tientallen', tientallen: true },
  { id: 'tot100',     soort: 'bereik', bereik: 100, brug: 'nee',  naam: 'Tot 100' },
  { id: 'brug100',    soort: 'bereik', bereik: 100, brug: 'vaak', naam: 'Over het tiental tot 100' },
  { id: 'bouwen1000', soort: 'bereik', bereik: 1000, brug: 'nee', naam: 'Getallen bouwen tot 1000', bouwen: true },
  { id: 'honderdtallen', soort: 'bereik', bereik: 1000, brug: 'nee', naam: 'Honderdtallen', honderdtallen: true },
  { id: 'tot1000',    soort: 'bereik', bereik: 1000, brug: 'nee',  naam: 'Tot 1000' },
  { id: 'brug1000',   soort: 'bereik', bereik: 1000, brug: 'vaak', naam: 'Over het honderdtal' },
];
const PAD_IDX = Object.fromEntries(LEERPAD.map((r, i) => [r.id, i]));
const BRUG_VAAK = 0.5;    // op een rij "over het tiental": zo vaak gaat een plus- of minsom erover
const TIENTALLEN_VAAK = 0.6;   // op de rij "tientallen": zo vaak is het een som met hele tientallen
const HONDERDTALLEN_VAAK = 0.6;   // en op "honderdtallen" met hele honderdtallen (zie genTriple)
const BOUWEN_VAAK = 0.5, BOUWEN_SOMS = 0.12;   // getallen bouwen: op zijn rij, en daarna af en toe
/* De voorbeelden: altijd gemaakt met wat de ouder koos -- alleen min geeft
   min-voorbeelden, alleen maal een tafel die aan staat. Elk past binnen het
   bereik van zijn rij, en de bereik-rijen gaan nooit over het tiental tot de
   rij die dat brengt (zaak ZF meet het na). */
const PAD_VB = {
  '+': { 10: '3 + 4', 20: '12 + 5', 100: '56 + 23', brug20: '8 + 5', brug100: '47 + 25', tientallen: '40 + 30',
         1000: '460 + 320', brug1000: '380 + 50', honderdtallen: '300 + 400' },
  '-': { 10: '7 − 3', 20: '17 − 5', 100: '86 − 34', brug20: '13 − 6', brug100: '72 − 35', tientallen: '70 − 30',
         1000: '860 − 320', brug1000: '420 − 50', honderdtallen: '700 − 300' },
};
/* Een cijfer in de kleur van zijn plaats: H paars, T blauw, E goud -- dezelfde
   kleuren als de blokken van Getallen bouwen (zie .pl-* in het stijlblad), op
   de ladder én in de show. */
function plaats(p, tekst) { return `<span class="pl-${p}">${tekst}</span>`; }
function padVoorbeeld(r, s) {
  const pm = s.ops.includes('+') ? '+' : '-';
  if (r.id === 'drie') return '3 + 4 + 2';
  if (r.bouwen) return `${r.bereik > 100 ? plaats('h', '3H') + ' ' : ''}${plaats('t', '4T')} ${plaats('e', '5E')}`;
  if (r.id === 'zoek') return s.ops.includes('+') ? (s.max > 10 ? '7 + ▢ = 12' : '3 + ▢ = 7') : '9 − ▢ = 4';
  return PAD_VB[pm][r.brug === 'vaak' ? r.id : r.tientallen ? 'tientallen' : r.honderdtallen ? 'honderdtallen' : r.bereik];
}
// Kan deze rij met deze instellingen? (bereik: ook binnen de grens -- zie padRijen)
function padPast(r, s) {
  const plusMin = s.ops.includes('+') || s.ops.includes('-');
  if (r.soort === 'bereik') return plusMin && (r.brug !== 'vaak' || r.bereik > 10);
  if (r.id === 'zoek') return plusMin;
  if (r.id === 'drie') return s.ops.includes('+');
  return true;
}
/* Het pad van dit kind: { rijen, later }. rijen = wat ze speelt: vanaf het
   begin tot en met de lijn "tot". later = wat eronder grijs op de ladder staat:
   de rest van haar blok als de lijn erin staat, en het volgende blok -- dat
   komt er als de lijn zakt. Elke rij: { id, naam, vb, keuze, uit, ... } -- uit =
   de ouder vinkte hem weg; hij blijft staan, doorgestreept, en ze slaat hem over.
   "tot" is een rij, net als "vanaf" (s.padTot, null = het eind van het blok),
   en de grens van de getallen (s.max) is het blok waar die rij in staat (zie
   padBlok). Zo kan de lijn ook midden in een blok staan: tot Tientallen speelt
   wel tot honderd, maar nog niet Tot 100 en Over het tiental. */
function padRijen(s) {
  const plusMin = s.ops.includes('+') || s.ops.includes('-');
  const rij = r => ({ ...r, vb: padVoorbeeld(r, s), uit: !!r.keuze && s[r.keuze] === false });
  const blok = LEERPAD.filter(r => padPast(r, s) && (r.soort !== 'bereik' || r.bereik <= s.max)).map(rij);
  const tot = blok.findIndex(r => r.id === s.padTot);
  const rijen = tot < 0 ? blok : blok.slice(0, tot + 1);
  const volgende = plusMin && LEERPAD.filter(r => r.soort === 'bereik' && r.bereik > s.max)
    .reduce((m, r) => Math.min(m, r.bereik), Infinity);
  const later = blok.slice(rijen.length).concat(plusMin
    ? LEERPAD.filter(r => r.soort === 'bereik' && r.bereik === volgende && padPast(r, s)).map(rij) : []);
  return { rijen, later };
}
/* In welk blok staat deze rij -- welke grens hoort erbij als "tot" er komt?
   Een bereik-rij zegt het zelf. De vormen (zoek het getal, drie getallen) staan
   in het blok tot 20, of tot 10 zolang de grens nog daar staat. */
function padBlok(r, s) { return r.soort === 'bereik' ? r.bereik : Math.min(s.max, 20); }
/* Zet de lijn "tot" op deze rij: de grens wordt zijn blok (grensOmhoog, met
   wennen als het omhoog gaat), en staat hij op de laatste rij van dat blok,
   dan is het gewoon "het eind van het blok" (null) -- zo blijft een kind dat
   nooit een lijn verzette precies waar het stond.
   Zakt de lijn, dan valt er niets af dat ze al speelde. Dat kan anders: tot 10
   staan de vormen vlak onder Tot 10, tot 20 pas na Over het tiental. Een tik op
   het grijze Tot 20 zou Zoek het getal en Drie getallen dan onder de lijn
   schuiven; de lijn zakt daarom tot onder de laatste rij die ze al had. */
function padTotOp(s, r) {
  const had = padRijen(s).rijen.map(x => x.id);
  const zakt = !had.includes(r.id);
  grensOmhoog(s, padBlok(r, s));
  const blok = padRijen({ ...s, padTot: null }).rijen;
  const plek = id => blok.findIndex(x => x.id === id);
  const i = Math.max(plek(r.id), ...(zakt ? had.map(plek) : []));
  s.padTot = i < 0 || i === blok.length - 1 ? null : blok[i].id;
}
/* Waar staat ze? p.pad = { rij, shows, goed, klaar }: klaar zijn de rijen die
   ze gehaald heeft (zie padNa), rij de rij waar shows en goed over tellen. Ze
   staat op de eerste rij van haar pad die nog niet klaar is, en nooit vóór
   "vanaf" (s.padVanaf). Zo kan het pad onder haar veranderen zonder dat er iets
   verloren gaat: zet de ouder + aan, dan komt Drie getallen terug ook als ze al
   verder was; laat de ouder de lijn "tot" zakken, dan komen de nieuwe getallen op hun
   plek -- ook Tot 20 bij een kind dat tot tien al alles door elkaar deed, al
   staat die rij in de tabel vóór Zoek het getal. Geeft het id, of 'alles' als
   er geen rij meer open is. Verandert niets. */
function padNu(p) {
  const speel = padRijen(p.settings).rijen.filter(r => !r.uit);
  if (!speel.length) return 'alles';
  const vanaf = PAD_IDX[padVanafRij(p.settings, speel).id];
  const klaar = new Set((p.pad && p.pad.klaar) || []);
  const r = speel.find(x => PAD_IDX[x.id] >= vanaf && !klaar.has(x.id));
  return r ? r.id : 'alles';
}
/* "vanaf" op dit pad: de eerste rij die ze speelt op of na s.padVanaf. Valt die
   achter de lijn "tot" (de ouder zette de grens lager), dan is het de laatste
   rij: vanaf kan nooit onder tot staan, net als bij tellen. */
function padVanafRij(s, speel) {
  speel = speel || padRijen(s).rijen.filter(r => !r.uit);
  const v = PAD_IDX[s.padVanaf];
  if (v == null) return speel[0];
  return speel.find(r => PAD_IDX[r.id] >= v) || speel[speel.length - 1];
}
/* Een save van vóór het leerpad had een leerstap per wereld (1 tot 6, de
   hoogste van de wereld en "vanaf"). Waar staat ze nu? Op de eerste rij van
   haar pad die minstens speelt wat die stap speelde -- nooit makkelijker dan
   ze gewend was, wel soms iets verder (stap 1 bij tot 100 speelde al tot 50,
   dat is hier de rij Tientallen). Stap 6 was "alles door elkaar": dat blijft het.
   Zie migrate. Geeft een rij-id of 'alles'. */
function padUitOudeStap(s, stap) {
  const speel = padRijen(s).rijen.filter(r => !r.uit);
  if (stap >= 6 || !speel.length) return 'alles';
  const plusMin = s.ops.includes('+') || s.ops.includes('-');
  const bereik = stap === 1 ? Math.max(10, Math.round(s.max * 0.5)) : s.max;
  const r = speel.find(x => {
    const st = padStand(s, x.id);
    return (!plusMin || st.max >= bereik)
      && (stap < 3 || !plusMin || s.max <= 10 || st.brug !== 'nee')
      && (stap < 4 || !speel.some(y => y.id === 'zoek') || st.missNum)
      && (stap < 5 || !speel.some(y => y.id === 'drie') || st.chain3);
  });
  return r ? r.id : 'alles';
}
/* Wat er op haar rij speelt: de instellingen zoals de vraagmaker ze leest.
   Cumulatief -- alles van de rijen tot en met deze doet mee:
     max      het bereik van de laatste bereik-rij (zonder: de grens) -- maar
              Getallen bouwen telt daar niet mee: dat bouwt de getallen tot
              honderd, de sommen blijven nog bij wat ze kon
     brug     op een bereik-rij die van de rij zelf (nieuwe getallen eerst
              zonder over het tiental, op "over het tiental" vaak); daarna vrij,
              als "over het tiental" er al was
     bouwen   'vaak' op Getallen bouwen zelf, daarna 'soms' (zie buildQuestion);
              bouwTot zegt welke: tot 100 (T en E) of tot 1000 (H, T en E)
     honderdtallen  zoals tientallen, op die rij in het blok tot 1000
   Tientallen en Getallen bouwen tellen op 'alles' als "de rij zelf" als de
   lijn "tot" eronder staat (zie eigen).
     ops      + en −, vanaf de eerste bereik-rij (× en ÷ zijn het thema Tafels)
     missNum, chain3   zoek het getal en drie getallen, vanaf hun rij en als ze
              aangevinkt zijn
     tientallen  alleen op de rij zelf: vaak een som met hele tientallen
   Op 'alles' is het alles tot de lijn, gemengd.
   klaar (p.pad.klaar): een vorm die ze al haalde blijft meedoen, ook als ze
   terug moet naar een rij ervoor (de lijn "tot" zakte, zie padNu): wie zoek
   het getal kent, verliest het niet omdat Tot 20 er nog tussen kwam. */
function padStand(s, nuId, klaar) {
  const rijen = padRijen(s).rijen;
  const i = nuId === 'alles' ? rijen.length - 1 : rijen.findIndex(r => r.id === nuId);
  const tot = rijen.slice(0, Math.max(0, i) + 1);
  const nu = nuId === 'alles' ? null : tot[tot.length - 1];
  /* De rij die zijn eigen sommen meebrengt (tientallen, getallen bouwen): haar
     rij, of op 'alles' de laatste -- staat "tot" op Tientallen, dan blijven de
     hele tientallen ook door elkaar het hoofdgerecht, niet 56 + 23. */
  const eigen = nu || (nuId === 'alles' ? tot[tot.length - 1] : null);
  const bereik = tot.filter(r => r.soort === 'bereik' && !r.bouwen);
  const gehaald = new Set(klaar || []);
  const heeft = id => rijen.some((r, j) => r.id === id && !r.uit && (j <= i || gehaald.has(id)));
  const ops = s.ops.filter(o => (o === '+' || o === '-') && bereik.length > 0);
  // het grootste blok dat ze al bouwde: daar komt het af en toe uit terug
  const gebouwd = rijen.filter(r => r.bouwen && heeft(r.id)).pop();
  return {
    max: bereik.length ? bereik[bereik.length - 1].bereik : s.max,
    brug: nu && nu.soort === 'bereik' && !nu.bouwen ? nu.brug : tot.some(r => r.brug === 'vaak') ? 'vrij' : 'nee',
    ops: ops.length ? ops : s.ops.slice(0, 1),
    missNum: heeft('zoek'),
    chain3: heeft('drie'),
    tientallen: !!(eigen && eigen.tientallen),
    honderdtallen: !!(eigen && eigen.honderdtallen),
    bouwen: eigen && eigen.bouwen ? 'vaak' : gebouwd ? 'soms' : null,
    bouwTot: eigen && eigen.bouwen ? eigen.bereik : gebouwd ? gebouwd.bereik : null,
  };
}
// De instellingen voor de vraagmaker: die van de ouder, met haar rij erover.
function vraagInst(p) {
  if (zelfGekozen(p.settings)) return kiesInst(p.settings);
  return { ...p.settings, ...padStand(p.settings, padNu(p), p.pad && p.pad.klaar) };
}
/* ---- Zelf kiezen: precies wat de ouder aanvinkt ----------------------------
   Naast het leerpad (dat zelf doorschuift) kan een ouder ook gewoon zeggen wat
   er geoefend wordt: s.modus 'vrij'. Wat er gekozen wordt, is hetzelfde als op
   het leerpad, alleen niet na elkaar:
     + en −    de rijen van LEERPAD die over plus en min gaan (kiesRijen), elk
               met een vinkje; s.kies zijn de ids
     × en ÷    het thema Tafels: × en ÷ en de balk "Tafels van" (tafelInst)
     tellen    de fases, s.kiesFasen (zie telFase)
   Elke vraag komt dan uit één aangevinkte rij, om de beurt, en NIETS SCHUIFT
   DOOR: geen padNa, geen fase erbij of eraf, geen "Nieuw", geen tip die een
   lijn verzet. Wat ze lastig vindt komt wel terug (de zwakke sommen), en
   binnen een rij maakt het spel het lichter of pittiger zoals altijd.
   Ontbreekt s.modus, dan is het het leerpad: oude saves hoeven niets. */
function zelfGekozen(s) { return s.modus === 'vrij'; }
// de + − rijen die je kunt aanvinken, met hun voorbeeld (ook boven de grens:
// de grens is van het leerpad, hier zegt elke rij zelf hoe ver hij gaat)
function kiesRijen(s) {
  if (!s.ops.includes('+') && !s.ops.includes('-')) return [];
  const t = { ...s, max: Infinity };
  return LEERPAD.filter(r => (r.soort === 'bereik' || r.id === 'zoek' || r.id === 'drie') && padPast(r, t))
    .map(r => ({ ...r, vb: padVoorbeeld(r, { ...s, max: 100 }) }));
}
const kiesGekozen = s => kiesRijen(s).filter(r => (s.kies || []).includes(r.id));
/* Drie getallen staat in de lijst bij tot 20 (zoals op het leerpad), en
   blijft daar. Zoek het getal groeit mee met de grootste aangevinkte rij
   sommen: naast Tot 100 is het 47 + ▢ = 72 -- aanvullen tot honderd is
   tweede leerjaar. Zonder rij erboven is het tot 20. */
const KIES_VORM_MAX = 20;
/* De vraagmaker in Zelf kiezen. vrij is de pot waar elke vraag uit komt: één
   ingang per aangevinkte rij, elk met de
   instellingen van die ene rij -- niet cumulatief zoals padStand, want hier
   betekent een vinkje "dit", niet "tot hier". Over het tiental speelt dan
   altijd over het tiental (brug 'altijd'), Tientallen altijd hele tientallen,
   Honderdtallen altijd hele honderdtallen.
   De rest (max, ops) is voor wat elke vraag deelt: de zwakke sommen
   (pastNog) en de antwoordknoppen (keuzeGrens). */
function kiesInst(s) {
  const pm = s.ops.filter(o => o === '+' || o === '-');
  const rijen = kiesGekozen(s);
  const somMax = rijen.reduce((m, r) => r.soort === 'bereik' && !r.bouwen ? Math.max(m, r.bereik) : m, KIES_VORM_MAX);
  const vrij = rijen.map(r => {
    if (r.soort !== 'bereik') return { id: r.id, inst: { ...s, ops: r.id === 'drie' ? ['+'] : pm, max: r.id === 'zoek' ? somMax : KIES_VORM_MAX, brug: 'vrij' } };
    return { id: r.id, inst: { ...s, ops: pm, max: r.bereik, brug: r.brug === 'vaak' ? 'altijd' : 'nee',
      tientallen: r.tientallen ? 'altijd' : false, honderdtallen: r.honderdtallen ? 'altijd' : false } };
  });
  // + of − aan maar niets aangevinkt dat kan (bv. alleen drie getallen, en + uit): dan gewoon tot 20
  if (!vrij.length) vrij.push({ id: 'tot20', inst: { ...s, ops: pm.length ? pm : s.ops, max: 20, brug: 'vrij' } });
  const max = vrij.reduce((m, v) => Math.max(m, v.inst.ops.some(o => o === '+' || o === '-') ? v.inst.max : 0), 0);
  const ops = [...new Set(vrij.flatMap(v => v.inst.ops))];
  return { ...s, ops, max: max || s.max, brug: 'vrij', missNum: false, chain3: false, tientallen: false, honderdtallen: false, bouwen: null, vrij, vrijStapel: [] };
}
/* Welke + − rij staat er aan als een ouder op Zelf kiezen tikt? De rij waar ze
   op het leerpad nu is -- zo begint de lijst nooit leeg, en speelt ze de
   volgende show wat ze gewend was. Is dat geen + − rij (alles door elkaar),
   dan de laatste + − rij die ze al had. */
function kiesStart(p) {
  const s = p.settings;
  const kan = kiesRijen(s).map(r => r.id);
  if (!kan.length) return [];
  const nu = padNu(p);
  if (kan.includes(nu)) return [nu];
  const pad = padRijen(s).rijen.map(r => r.id);
  const tot = nu === 'alles' ? pad.length : pad.indexOf(nu);
  const had = pad.slice(0, Math.max(0, tot)).filter(id => kan.includes(id));
  return [had.length ? had[had.length - 1] : kan[0]];
}
/* Na een rekenshow: een show verder op haar rij. Ze gaat door als ze hem kan --
   minstens PAD_MIN_SHOWS shows erop en de laatste twee met drie sterren -- of
   na PAD_MAX_SHOWS shows toch: zo is ze nooit trager dan toen elke stap één
   wereld (acht shows) duurde. Wat ze nog lastig vindt komt daarna terug via de
   zwakke sommen, niet doordat ze op de rij blijft hangen.

   Alleen een show met minstens PAD_TELT sterren telt als "een show op de rij".
   Telde elke show mee, ook een mislukte, dan schoof een kind dat acht keer
   strandde toch door naar zwaardere sommen -- terwijl de telmodus in dat geval
   juist wacht, en na twee mislukte shows een fase terugzet (advanceCountStage).
   Wie het redt, gaat even snel als altijd; wie strandt, blijft op zijn rij en
   het spel maakt de sommen daar lichter (moeilijkheid). Terug naar een vorige
   rij gaat rekenen niet: wat al klaar is blijft klaar.

   EN GENOEG VRAGEN VAN DIE RIJ. Shows alleen zeggen niet genoeg: met zes
   thema's aan krijgt een thema één of twee vragen per show, en dan was een
   rij "gehaald" na drie shows -- het kalenderblad na twee vragen, de tafels
   van 6 tot 9 na vijf. eigen zijn de antwoorden van déze show op de vragen
   die het nieuwe van de rij laten zien (vraagIsNieuw; true = in één keer
   goed, zie rijAntwoorden in 60-spel). Daarvan moeten er minstens
   PAD_MIN_VRAGEN zijn, met van de laatste PAD_REEKS hoogstens één misser; de
   weg "toch verder" wacht op PAD_MAX_VRAGEN (of, als de rij haar vragen niet
   krijgt, op twee keer PAD_MAX_SHOWS shows). Met alleen rekenen aan zijn er na
   twee shows al genoeg, en beslissen de shows zoals altijd. In de stand komen
   twee tellers bij (vragen, reeks); een save zonder begint ze op nul.
   Zonder eigen (een oude aanroep) telt alleen de show. */
const PAD_MIN_SHOWS = 3, PAD_MAX_SHOWS = 8, PAD_GOED = 2, PAD_TELT = 2;
const PAD_MIN_VRAGEN = 8, PAD_REEKS = 6, PAD_MAX_VRAGEN = 16;
// Eén show verder op een rij, voor het leerpad en elke ladder: true = de rij is gehaald.
function rijVerder(t, sterren, eigen) {
  if (sterren >= PAD_TELT) t.shows++;
  t.goed = sterren >= 3 ? t.goed + 1 : 0;
  if (eigen) {
    t.vragen = (t.vragen || 0) + eigen.length;
    t.reeks = (t.reeks || []).concat(eigen.map(g => g ? 1 : 0)).slice(-PAD_REEKS);
  }
  const vragen = t.vragen || 0, reeks = t.reeks || [];
  const kan = !eigen || (vragen >= PAD_MIN_VRAGEN && reeks.length >= PAD_REEKS && reeks.filter(g => !g).length <= 1);
  const toch = !eigen || vragen >= PAD_MAX_VRAGEN || t.shows >= 2 * PAD_MAX_SHOWS;
  return (t.shows >= PAD_MIN_SHOWS && t.goed >= PAD_GOED && kan) || (t.shows >= PAD_MAX_SHOWS && toch);
}
// een rij die net begint: geen shows, geen vragen
const rijNul = rij => ({ rij, shows: 0, goed: 0, vragen: 0, reeks: [] });
function padNa(p, sterren, eigen) {
  const nu = padNu(p);
  if (nu === 'alles') return false;
  const pad = p.pad = p.pad || { klaar: [] };
  if (!Array.isArray(pad.klaar)) pad.klaar = [];
  if (pad.rij !== nu) Object.assign(pad, rijNul(nu));
  if (!rijVerder(pad, sterren, eigen)) return false;
  /* Klaar: deze rij, en alles ervoor op haar pad -- ook wat "vanaf" oversloeg.
     Zet de ouder "vanaf" daarna terug, dan hoeft ze dat niet alsnog te doen. */
  padRijen(p.settings).rijen.forEach(r => {
    if (PAD_IDX[r.id] <= PAD_IDX[nu] && !pad.klaar.includes(r.id)) pad.klaar.push(r.id);
  });
  Object.assign(pad, rijNul(padNu(p)));
  return true;
}
/* Is deze vraag het nieuwe van rij id? Na een stap verder op het leerpad krijgt
   de eerste vraag die laat zien wat er nieuw is één keer het gouden "Nieuw"
   (zie nieuwTeTonen in 60-spel). Niet gewoon de eerste vraag van de show: op
   "Over het tiental" kan die nog 4 + 3 zijn, en dan hangt "Nieuw" boven iets
   wat ze al lang kon. 'fase' is de telmodus: daar is elke vraag van de nieuwe
   fase het nieuwe. */
function vraagIsNieuw(q, id) {
  if (id === 'fase') return true;
  if (id in LADDERS.tafels.idx) return (q.op === 'x' || q.op === ':') && TAFELPAD[LADDERS.tafels.idx[id]].tafels.includes(Number((q.tmpl.match(/\d+/g) || [])[1]));
  if (THEMA_ERBIJ.some(k => id in LADDERS[k].idx)) return q.rij === id;
  const r = LEERPAD[PAD_IDX[id]];
  if (!r) return false;
  if (r.bouwen) return q.kind === 'bouw' && (q.grens || 99) >= r.bereik - 1;   // tot 1000: met honderdtallen
  if (id === 'zoek') return q.kind === 'missing';
  if (id === 'drie') return q.kind === 'chain';
  if (q.kind !== 'classic' || (q.op !== '+' && q.op !== '-')) return false;
  const [a, b] = (q.tmpl.match(/\d+/g) || []).map(Number);
  if (r.tientallen) return a % 10 === 0 && b % 10 === 0;
  if (r.honderdtallen) return a % 100 === 0 && b % 100 === 0;
  if (r.brug === 'vaak') return !!q.brug && Math.max(a, b, q.ans) > r.bereik / 10;   // over het honderdtal: een som boven de honderd
  // een nieuw bereik: een getal boven het vorige bereik (tot 20: boven de tien)
  const vorig = LEERPAD.filter(x => x.soort === 'bereik' && x.bereik < r.bereik).reduce((m, x) => Math.max(m, x.bereik), 0);
  return Math.max(a, b, q.ans) > vorig;
}
/* De antwoorden van show g op het nieuwe van rij nu, bij thema k: per vraag
   die vraagIsNieuw is, true als hij in één keer goed ging. Dat is wat
   rijVerder telt, naast de shows. */
function rijAntwoorden(g, k, nu) {
  if (!nu || nu === 'alles') return [];
  return g.qs.map((q, i) => i)
    .filter(i => (g.themaPlan ? g.themaPlan[i] : 'rekenen') === k && g.uitslag[i] && vraagIsNieuw(g.qs[i], nu))
    .map(i => g.uitslag[i] === 'goed');
}
/* ================= = Thema's: wat ze oefent =================
   Rekenen is niet één ladder meer. Bovenaan Oefeningen kiest de ouder wat ze
   oefent, en elk thema heeft daaronder zijn eigen kaart, zijn eigen ladder en
   zijn eigen plek erop:
     rekenen   plus en min: LEERPAD, met zijn blokken en zijn grens
     tafels    maal en delen: TAFELPAD, de tafels in de volgorde van school
     geld      munten en briefjes tellen, en teruggeven: GELDPAD
   Een thema groeit apart. Ze kan op Tot 100 staan en op de tafels van 3 en 4:
   geld of tafels hoeven niet te wachten tot de sommen klaar zijn, en
   andersom. Een show mengt de thema's die aan staan (themaPlan), en elk thema
   schuift door op zijn eigen vragen in die show (themaSterren, ladderNa).

   AAN OF UIT. Rekenen staat aan als + of − aan staat, tafels als × of ÷ aan
   staat -- er is geen tweede vlag die kan gaan afwijken van de bewerkingen, en
   een save van vóór de thema's heeft zijn thema's al. Zet een ouder er een
   uit, dan gaan zijn bewerkingen opzij in s.opsRust, en komen ze zo terug als
   hij weer aan gaat. Een thema zonder bewerkingen (geld) staat in s.themas, en
   staat standaard uit: een ster van vóór dat thema merkt er niets van. Het
   laatste thema kan niet uit. */
/* De volgorde is die van de tegels, drie per rij: bovenaan de getallen
   (rekenen, de tafels, de getallenlijn), eronder wat ze buiten het schrift
   tegenkomt (geld, de klok, de kalender). */
const THEMAS = [
  { id: 'rekenen', naam: 'Rekenen', ops: ['+', '-'] },
  { id: 'tafels',  naam: 'Tafels',  ops: ['x', ':'] },
  { id: 'lijn',    naam: 'Getallenlijn' },
  { id: 'geld',    naam: 'Geld' },
  { id: 'klok',    naam: 'Klok' },
  { id: 'kalender', naam: 'Kalender' },
];
const THEMA = Object.fromEntries(THEMAS.map(t => [t.id, t]));
function themaAan(s, k) { return THEMA[k].ops ? THEMA[k].ops.some(o => s.ops.includes(o)) : (s.themas || []).includes(k); }
const themasAan = s => THEMAS.filter(t => themaAan(s, t.id)).map(t => t.id);
// Zet een thema aan of uit; false als het het laatste is (dan blijft het aan).
function themaZet(s, k, aan) {
  const ops = THEMA[k].ops;
  if (aan === themaAan(s, k)) return true;
  if (!aan && themasAan(s).length < 2) return false;
  if (!ops) s.themas = aan ? (s.themas || []).concat(k) : s.themas.filter(t => t !== k);
  else if (!aan) {
    s.opsRust = { ...s.opsRust, [k]: s.ops.filter(o => ops.includes(o)) };
    s.ops = s.ops.filter(o => !ops.includes(o));
  } else {
    const terug = ((s.opsRust || {})[k] || []).filter(o => ops.includes(o));
    s.ops = s.ops.concat(terug.length ? terug : ops.slice(0, 1));
  }
  return true;
}
/* Het ICOONTJE van een thema: getekend, geen emoji -- 🧮 en 💶 zien er op elk
   toestel anders uit, en op een oude Android klein en vaag. Twee tekens op een
   lichtpaars tegeltje, of voor geld een munt van twee euro. aria-hidden: het
   woord staat er altijd naast. */
function themaIcoon(k, maat) {
  const svg = binnen => `<svg class="thema-ico" viewBox="0 0 40 40" width="${maat}" height="${maat}" aria-hidden="true">${binnen}</svg>`;
  if (k === 'geld') return svg('<circle cx="20" cy="20" r="18" fill="#c9ccd1" stroke="#9aa0a8" stroke-width="1.5"/>'
    + '<circle cx="20" cy="20" r="12.5" fill="#e8c45a"/>'
    + '<text x="20" y="21" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="900" fill="#5d3f00">€</text>');
  if (k === 'kalender') return svg('<rect x="5" y="7" width="30" height="29" rx="5" fill="#fff" stroke="#9aa0a8" stroke-width="1.5"/>'
    + '<path d="M5 12a5 5 0 0 1 5-5h20a5 5 0 0 1 5 5v4H5z" fill="#e5397a"/><rect x="11" y="3" width="3" height="8" rx="1.5" fill="#6b4a86"/><rect x="26" y="3" width="3" height="8" rx="1.5" fill="#6b4a86"/>'
    + '<text x="20" y="27" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="900" fill="#2b2238">7</text>');
  if (k === 'lijn') return svg('<rect x="2" y="2" width="36" height="36" rx="10" fill="#f3e5f5" stroke="#d9b8e8" stroke-width="1.5"/>'
    + '<g stroke="#4a2a7a" stroke-linecap="round"><line x1="6" x2="34" y1="25" y2="25" stroke="#8e3fc8" stroke-width="4"/><line x1="9" x2="9" y1="20" y2="30" stroke-width="2.5"/><line x1="20" x2="20" y1="20" y2="30" stroke-width="2.5"/><line x1="31" x2="31" y1="20" y2="30" stroke-width="2.5"/></g>'
    + '<path d="M25.5 18 l-4 -7 h8z" fill="#e5397a"/>');
  if (k === 'klok') return klokSvg(130, maat, true).replace('class="klok"', 'class="klok thema-ico"');
  const teken = { rekenen: ['+', '−'], tafels: ['×', '÷'] }[k];
  return svg('<rect x="2" y="2" width="36" height="36" rx="10" fill="#f3e5f5" stroke="#d9b8e8" stroke-width="1.5"/>'
    + '<g fill="#8e24aa" font-weight="900" font-size="21" text-anchor="middle" dominant-baseline="central">'
    + `<text x="13.5" y="14">${teken[0]}</text><text x="26.5" y="26">${teken[1]}</text></g>`);
}

/* ---- De tafels -----------------------------------------------------------
   Drie rijen, zoals een Vlaamse school ze brengt: eerst de tafels van 2, 5 en
   10 (die met een ritme), dan 3 en 4, dan de rest. ÷ hoort bij elke rij, niet
   als rij erachter: op school is het de maal- en deeltafel samen. Welke van de
   twee er speelt, zeggen × en ÷ bovenaan de kaart.
   Op een rij zijn is cumulatief: op de tafels van 3 en 4 komen 2, 5 en 10 nog
   terug, maar de nieuwe zijn er het meest (TAFEL_NU_VAAK). Bij Zelf kiezen
   zijn het de tafels die de ouder aantikt (s.tables), om de beurt. */
const TAFELPAD = [
  { id: 'tafels2510', tafels: [2, 5, 10],   naam: 'Tafels van 2, 5 en 10' },
  { id: 'tafels34',   tafels: [3, 4],       naam: 'Tafels van 3 en 4' },
  { id: 'tafels69',   tafels: [6, 7, 8, 9], naam: 'Tafels van 6 tot 9' },
];
const TAFEL_NU_VAAK = 0.6;
function tafelVoorbeeld(r, s) {
  const b = r.tafels[r.tafels.length > 2 ? 1 : 0], a = b === 7 ? 8 : 7;   // 7 × 7 leest als een vergissing
  return s.ops.includes('x') ? `${a} × ${b}` : `${a * b} : ${b}`;
}

/* ---- Geld ------------------------------------------------------------------
   Vijf rijen, zoals school ze brengt: in het eerste leerjaar munten en dan
   briefjes, in hele euro's; in het tweede tot honderd, en dan de centen; in
   het derde teruggeven. Een bedrag is altijd in centen (stukken, ans bij
   Met centen), zodat €1,70 een geheel getal blijft voor de knoppen.
   Elke vraag laat de munten en briefjes zien zoals je ze op tafel legt --
   de grootste eerst -- en vraagt hoeveel het samen is. Teruggeven is
   aanvullen, zoals op school: een prijskaartje, en wat erbij moet tot het
   briefje waarmee je betaalt. Met centen is altijd kiezen: een komma typen
   kan het cijferblok niet, en hoort het ook niet te leren.
   stuks: hoeveel stukken er hoogstens liggen. Op de eerste rij vijf, anders
   kwam "tot €10" nooit boven €8 (vier munten van twee euro). */
const GELDPAD = [
  { id: 'munten10',   naam: 'Munten tot €10',   tot: 1000,  stukken: [200, 100], stuks: 5 },
  { id: 'briefjes20', naam: 'Briefjes tot €20', tot: 2000,  stukken: [1000, 500, 200, 100], briefje: true, stuks: 4 },
  { id: 'geld100',    naam: 'Tot €100',         tot: 10000, stukken: [5000, 2000, 1000, 500, 200, 100], briefje: true, stuks: 5 },
  { id: 'centen',     naam: 'Met centen',       tot: 1000,  stukken: [200, 100, 50, 20, 10], centen: true, stuks: 4 },
  { id: 'terug',      naam: 'Teruggeven',       tot: 2000,  terug: true },
];
// Eén munt of briefje, met zijn waarde erop: kleur is nooit het enige teken.
function geldStuk(c) {
  const soort = c >= 500 ? `briefje b${c / 100}` : `munt m${c}`;
  return `<span class="geld-stuk ${soort}">${c >= 100 ? '€' + c / 100 : c + 'c'}</span>`;
}
// Een prijskaartje (Teruggeven): geel, met het gaatje van het touwtje.
function geldKaartje(c) { return `<span class="geld-prijs">${euro(c)}</span>`; }
// Een bedrag zoals een Belgisch kind het leest: €5, €1,70.
function euro(c) { return c % 100 ? `€${Math.floor(c / 100)},${String(c % 100).padStart(2, '0')}` : `€${c / 100}`; }
function geldVoorbeeld(r) {
  if (r.terug) return `${geldKaartje(700)} + ? = ${geldStuk(1000)}`;
  return { munten10: [200, 200, 100], briefjes20: [1000, 500, 200], geld100: [5000, 2000, 500], centen: [100, 50, 20] }[r.id].map(geldStuk).join('');
}
/* Een vraag van rij r. Een handvol stukken (twee tot r.stuks) die samen
   binnen het bereik blijven; bij briefjes minstens één briefje, bij centen
   minstens één cent -- anders oefent de rij zijn eigen nieuwe ding niet.

   De foute keuze die erbij komt (q.fouten, zie makeChoices) is een fout die
   een kind met geld echt maakt:
     geteld i.p.v. opgeteld   €2 €2 €1 is "3": het aantal stukken
     één vergeten             de kleinste niet meegeteld
     één dubbel               de kleinste twee keer
     €2 als €1                elke munt van twee euro als één geteld
   Bij Teruggeven is dat de prijs zelf, en prijs plus briefje (zie makeChoices,
   die haalt ze uit het sjabloon). */
function genGeld(r) {
  if (r.terug) {
    const briefje = pick([500, 1000, 1000, 2000]), prijs = 100 * rnd(1, briefje / 100 - 1);
    return { kind: 'geld', op: 'geld', rij: r.id, ans: (briefje - prijs) / 100, grens: briefje / 100, min: 1, kiezen: false,
      tmpl: `terug ${briefje / 100} - ${prijs / 100} = @`,
      html: `<span class="pl-som geld-aanvul een-regel">${geldKaartje(prijs)}<span class="geld-teken">+</span>€@<span class="geld-teken">=</span>${geldStuk(briefje)}</span>` };
  }
  let stukken, som, poging = 0;
  /* Munten tot €10: eerst het bedrag, dan de munten -- elk bedrag van €2 tot
     €10 even vaak. Met losse munten trekken kwam €9 of €10 bijna nooit (vijf
     munten, en bijna allemaal van twee euro). */
  if (r.id === 'munten10') {
    // twee: hoeveel van twee euro -- hoogstens r.stuks munten, en minstens twee
    const doel = rnd(2, r.tot / 100), twee = rnd(Math.max(0, doel - r.stuks), Math.min(Math.floor(doel / 2), doel - 2));
    stukken = [...Array(twee).fill(200), ...Array(doel - 2 * twee).fill(100)];
    som = doel * 100;
  }
  else do {
    const n = rnd(2, r.stuks);
    stukken = Array.from({ length: n }, () => pick(r.stukken)).sort((a, b) => b - a);
    som = stukken.reduce((a, b) => a + b, 0);
  } while ((som > r.tot || (r.briefje && stukken[0] < 500) || (r.centen && som % 100 === 0)) && ++poging < 60);
  const centen = !!r.centen, maat = centen ? 1 : 100, klein = stukken[stukken.length - 1];
  const fouten = [stukken.length * 100, som - klein, som + klein, som - 100 * stukken.filter(c => c === 200).length]
    .map(c => c / maat).filter(v => v !== som / maat);
  return { kind: 'geld', op: 'geld', rij: r.id, centen, kiezen: centen, min: centen ? 10 : 1,
    // nooit boven de honderd: dan rekent makeChoices in honderdtallen (zie daar), en €100 krijgt €101 als buur
    ans: som / maat, grens: centen ? som + 100 : Math.min(100, Math.max(10, som / 100 + 5)), fouten,
    tmpl: `geld ${stukken.map(c => c / maat).join(' + ')} = @`,
    html: `<span class="geld-rij">${stukken.map(geldStuk).join('')}</span><span class="pl-som">€ @</span>` };
}
/* ---- De klok ---------------------------------------------------------------
   Vijf rijen, zoals school ze brengt: in het eerste leerjaar hele en halve
   uren, in het tweede het kwartier en per vijf minuten, in het derde de 24
   uur. Een tijd is altijd in minuten na twaalf uur (0 tot 719), zodat hij een
   geheel getal blijft voor de knoppen; de 24 uur rekent er 720 bij.
   Twee soorten vragen, om de beurt (zie rijenVraag):
     lees  de klok staat er, en ze kiest de tijd in woorden ("half 4")
     zoek  de tijd staat er, en ze kiest de klok -- vier klokjes, maar twee
           woorden om te lezen; dat is wat de jongsten kunnen
   De 24 uur leest zonder woorden: de klok met een zon (namiddag) of een maan
   ('s avonds) erbij, en ze kiest de digitale tijd. Daar zijn ans en de keuzes
   minuten na middernacht (0 tot 1439), want 2:20 en 14:20 zijn dezelfde klok
   en juist het verschil is de vraag. Zoeken is de omgekeerde weg: 14:35
   staat er, en ze kiest de klok.
   Altijd kiezen: "half 4" typen kan het cijferblok niet. De foute keuzes zijn
   de fouten die kinderen echt maken: half 4 lezen als half 3 (het uur waar de
   wijzer voorbij is), de wijzers omdraaien, kwart over en kwart voor
   verwarren. */
const KLOKPAD = [
  { id: 'uren',     naam: 'Hele uren',    stap: 60 },
  { id: 'halfuur',  naam: 'Halve uren',   stap: 30 },
  { id: 'kwartier', naam: 'Kwartier',     stap: 15 },
  { id: 'vijfmin',  naam: 'Vijf minuten', stap: 5 },
  { id: 'uur24',    naam: '24 uur',       stap: 5, uur24: true },
];
/* De tijd in woorden: 3 uur, kwart over 3, half 4, kwart voor 4, en verder
   altijd vanaf het hele uur -- 20 over 3, 25 voor 4. Bewust níét "10 voor half
   4" of "5 over half 4": dat is twee stappen rekenen (eerst half, dan ervoor of
   erna), en dat struikelt een kind dat net de klok leert. Alles wat een kind
   over de klok leest of hoort komt hier vandaan: de vraag, de keuzes, het
   vakje, het label voor een schermlezer en de ladder bij Voor ouders. */
function klokWoorden(t) {
  const u = Math.floor(t / 60) % 12 || 12, m = t % 60, nu = u, straks = u % 12 + 1;
  if (m === 0) return `${nu} uur`;
  if (m === 15) return `kwart over ${nu}`;
  if (m === 30) return `half ${straks}`;
  if (m === 45) return `kwart voor ${straks}`;
  if (m < 30) return `${m} over ${nu}`;
  return `${60 - m} voor ${straks}`;
}
// 14:35: de 24 uur, voor een tijd in de namiddag (t + 720)
function klokDigitaal(t) { return `${Math.floor(t / 60) % 24}:${String(t % 60).padStart(2, '0')}`; }
/* De klok zelf, in de stijl van de knoppen: een paarse rand met een lip
   eronder, een roomwitte wijzerplaat en een gouden knopje in het midden.
   De uurwijzer kort en dik (donker), de minuutwijzer lang en roze -- het
   verschil zit in de vorm, niet alleen in de kleur. De uurwijzer schuift mee
   met de minuten, zoals op een echte klok: bij half 4 staat hij tussen de 3
   en de 4, en dat is precies waar je het leest.
   DE WIJZERS BEDEKKEN NOOIT EEN CIJFER. De cijfers staan tegen de rand en de
   wijzers houden ervoor op: ze wijzen ernaar. Liep de minuutwijzer tot aan
   de rand, dan lag hij bij elke heel uur dwars door de 12, en op een klokje
   in een knop was dat cijfer dan weg.
   Een klein klokje (een knop, de hint, de ladder) toont alleen 12, 3, 6 en 9,
   groot; de andere uren zijn een stip. Twaalf cijfers op 70 pixels stonden
   tegen elkaar aan en lazen als een vlek -- dat was wat een kind in de
   speeltest niet kon lezen. kaal: geen cijfers (het themaplaatje). */
function klokSvg(t, maat, kaal) {
  const P = (graden, r) => [50 + r * Math.sin(graden * Math.PI / 180), 50 - r * Math.cos(graden * Math.PI / 180)].map(v => v.toFixed(1));
  const klein = maat <= 90;
  const rc = klein ? 33 : 35.5, lang = klein ? 26 : 26.5, kort = klein ? 16 : 17;
  const m = t % 60, [mx, my] = P(m * 6, lang), [ux, uy] = P(((Math.floor(t / 60) % 12) + m / 60) * 30, kort);
  const uren = Array.from({ length: 12 }, (_, j) => {
    const i = j + 1, [x, y] = P(i * 30, rc);
    return !kaal && (!klein || i % 3 === 0) ? `<text x="${x}" y="${y}">${i}</text>` : `<circle cx="${x}" cy="${y}" r="${klein ? 3 : 2}" fill="#b79ad8"/>`;
  }).join('');
  // de minuten als fijne stipjes langs de rand, alleen waar er plaats voor is
  const minuten = klein ? '' : Array.from({ length: 60 }, (_, i) => {
    if (i % 5 === 0) return '';
    const [x, y] = P(i * 6, 43);
    return `<circle cx="${x}" cy="${y}" r=".8"/>`;
  }).join('');
  return `<svg class="klok" viewBox="0 0 100 100" width="${maat}" height="${maat}" aria-hidden="true">`
    + '<circle cx="50" cy="50" r="49" fill="#8e3fc8"/><path d="M4 46 A46 46 0 0 1 96 46" fill="none" stroke="#b678ec" stroke-width="4" stroke-linecap="round"/>'
    + '<circle cx="50" cy="51.8" r="45" fill="#3d1a6e" opacity=".4"/><circle cx="50" cy="50" r="45" fill="#fffaf3"/>'
    + `<g fill="#cdb6e6">${minuten}</g>`
    + `<g fill="#2b2238" font-size="${klein ? 22 : 15}" font-weight="900" text-anchor="middle" dominant-baseline="central">${uren}</g>`
    + `<line x1="50" y1="50" x2="${ux}" y2="${uy}" stroke="#3d2466" stroke-width="${klein ? 11 : 9}" stroke-linecap="round"/>`
    + `<line x1="50" y1="50" x2="${mx}" y2="${my}" stroke="#e5397a" stroke-width="${klein ? 6.5 : 5}" stroke-linecap="round"/>`
    + `<circle cx="50" cy="50" r="${klein ? 6.5 : 5.5}" fill="#ffc83d" stroke="#3d2466" stroke-width="2"/></svg>`;
}
function klokVoorbeeld(r) {
  const t = { uren: 180, halfuur: 210, kwartier: 165, vijfmin: 310, uur24: 155 }[r.id];
  return `${klokSvg(t, 26)}` + (r.uur24 ? `<span class="klok-digi">${klokDigitaal(t + 720)}</span>` : `<span class="klok-vb">${klokWoorden(t)}</span>`);
}
/* Een vraag van rij r. vorm: 'lees' of 'zoek' (zie rijenVraag, die wisselt af).
   Hele uren zijn nooit 12 uur bij de 24 uur: 12:00 is geen namiddag. */
function genKlok(r, vorm) {
  const stappen = 720 / r.stap;
  let t;
  do t = rnd(0, stappen - 1) * r.stap; while (r.uur24 && t < 60);
  /* De foute keuzes: eerst twee echte fouten, dan wat ernaast ligt op de maat
     van de rij.
       een uur ernaast   half 4 gelezen als half 3: het uur waar de wijzer al voorbij is
       gespiegeld        10 over 3 en 10 voor 4, kwart over en kwart voor
       omgedraaid        de korte wijzer gelezen als de lange
     en bij de 24 uur lezen: de 12 vergeten (2:20 voor 14:20), en een uur
     ernaast. */
  const lees = vorm === 'lees';
  if (r.uur24 && lees) return klokDag(r, t);
  const op12 = v => ((v % 720) + 720) % 720;
  const m = t % 60, u = Math.floor(t / 60) % 12;
  const echt = [t - 60, t + 60, m && m !== 30 ? t - m + 60 - m : null, m / 5 * 60 + u * 5];
  const mag = v => v != null && op12(v) !== t && op12(v) % r.stap === 0 && (!r.uur24 || op12(v) >= 60);
  const fout = shuffle([...new Set(echt.filter(mag).map(op12))]).slice(0, 2);
  const ernaast = shuffle([1, 2, 3].flatMap(d => [t - d * r.stap, t + d * r.stap]).filter(mag).map(op12));
  const keuzes = [...new Set([t, ...fout, ...ernaast])].slice(0, 4);
  const tijd = r.uur24 ? `<span class="klok-digi">${klokDigitaal(t + 720)}</span>` : null;
  return { kind: 'klok', op: 'klok', rij: r.id, ans: t, kiezen: true, keuzes, vorm, uur24: !!r.uur24, knop: lees ? 'klok-lees' : 'klok-zoek',
    tmpl: `klok ${lees ? 'lees' : 'zoek'} ${t}`,
    html: lees
      ? `<span class="klok-vraag">${klokSvg(t, 132)}</span><span class="pl-som klok-som">@</span>`
      : `<span class="klok-vraag klok-woord">${r.uur24 ? tijd : klokWoorden(t)}</span>` };
}
/* De 24 uur lezen (zie hierboven): de klok van t (1:00 tot 11:55) met de zon
   of de maan erbij, en vier digitale tijden. Het antwoord is t + 720 -- de
   namiddag of de avond, want 's ochtends verschilt de klok niet van de 24 uur. */
function klokDag(r, t) {
  const ans = t + 720, avond = ans >= 18 * 60;
  const mag = v => v >= 60 && v < 1440 && v !== ans && v % r.stap === 0;
  const ernaast = shuffle([ans - 60, ans + 60, ans - r.stap, ans + r.stap, ans - 120, ans + 120].filter(mag));
  const keuzes = [...new Set([ans, t, ...ernaast])].slice(0, 4);
  return { kind: 'klok', op: 'klok', rij: r.id, ans, kiezen: true, keuzes, vorm: 'lees', uur24: true, knop: 'klok-lees',
    tmpl: `klok dag ${ans}`,
    html: `<span class="klok-vraag klok-dag">${klokSvg(t, 132)}<span class="klok-dagdeel" role="img" aria-label="${avond ? "'s avonds" : 'in de namiddag'}">${avond ? '🌙' : '☀️'}</span></span><span class="pl-som klok-som">@</span>` };
}
// Hoe een klokwaarde als tekst staat: de digitale tijd bij de 24 uur lezen (zie klokDag), anders in woorden.
function klokTekst(q, v) { return q.uur24 && q.vorm === 'lees' ? klokDigitaal(v) : klokWoorden(v); }

/* ---- De kalender ------------------------------------------------------------
   Zeven rijen, zoals een Vlaamse school de tijd op de kalender brengt:
     1e leerjaar  gisteren en morgen, de seizoenen, dagen verder tellen
     2e leerjaar  de maanden en hun seizoen, weken en dagen, een kalenderblad
     3e leerjaar  de datum schrijven (28/10) en dagen tellen tussen twee data

   ÉÉN BEELD PER VRAAG, EN DAT BEELD ZEGT HET. Elke vraag is twee kaartjes even
   groot met een brug ertussen (zie kalKaart): wat eerst komt staat links, en
   het woord op de brug zegt wat er gevraagd wordt. Een wiel of zeven lege
   vakjes moest ze eerst leren lezen voor ze aan de vraag toekwam; twee
   kaartjes en een woord leest ze zoals een zin.
   Waar de vraag om de kalender zelf gaat (weken, een datum) staat er een echt
   kalenderblad, groot genoeg om de cijfers te lezen.
     seizoenen   elk een kleur én een teken (❄️ 🌷 ☀️ 🍂), op een seizoen, op
                 een maand en op de kop van het kalenderblad
     roze        waar je vertrekt of wat je zoekt: de dag van vandaag, de omcirkelde datum.
                 Zonder ⭐ erop: het roze zegt het al, en een ster was nog iets om te lezen

   Een waarde is altijd een geheel getal voor de knoppen: een dag 0-6 (maandag
   eerst, zoals op een Vlaamse kalender), een seizoen 0-3, een maand 0-11, een
   datum zijn getal, en 28/10 is 2810. Woorden zijn altijd kiezen; een aantal
   (dagen, weken, een datum) mag getypt. */
const DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
/* De dingen van een seizoen zijn nooit zijn eigen teken: dat teken staat op
   de antwoordknop, en dan zocht ze plaatje bij plaatje in plaats van het
   seizoen (kern.test.js kijkt het na). */
const SEIZOENEN = [
  { id: 'winter', naam: 'winter', teken: '❄️', dingen: ['⛄', '🧤', '🛷', '🎄'] },
  { id: 'lente',  naam: 'lente',  teken: '🌷', dingen: ['🐣', '🐝', '🌱', '🐑'] },
  { id: 'zomer',  naam: 'zomer',  teken: '☀️', dingen: ['🏖️', '🍦', '🩴', '🍉'] },
  { id: 'herfst', naam: 'herfst', teken: '🍂', dingen: ['🍄', '🌰', '☔', '🎃'] },
];
// het seizoen van een maand: december, januari en februari zijn winter
const seizoenVan = m => Math.floor(((m + 1) % 12) / 3);
// de woorden die de klas gebruikt, van twee dagen terug tot twee dagen verder
const DAGWOORD = { '-2': 'eergisteren', '-1': 'gisteren', 0: 'vandaag', 1: 'morgen', 2: 'overmorgen' };
const KALENDERPAD = [
  { id: 'morgen',   naam: 'Gisteren en morgen' },
  { id: 'seizoen',  naam: 'Seizoenen' },
  { id: 'verder',   naam: 'Dagen verder' },
  { id: 'maanden',  naam: 'Maanden' },
  { id: 'weken',    naam: 'Weken en dagen' },
  { id: 'blad',     naam: 'Kalenderblad' },
  { id: 'datum',    naam: 'De datum' },
];
const JAAR = new Date().getFullYear();
const dagVan = (m, d) => (new Date(JAAR, m, d).getDay() + 6) % 7;
const dagenIn = m => new Date(JAAR, m + 1, 0).getDate();
const mod = (v, n) => ((v % n) + n) % n;

/* EEN KAARTJE, en twee kaartjes met een brug ertussen: dat is elke vraag
   zonder kalenderblad, en altijd op dezelfde maat. Twee kaartjes even groot,
   wat het ook is (een dag, een seizoen, een maand, twee dingen, het vakje),
   en ertussen de brug met één woord erboven: morgen, + 5 dagen, erna. De pijl
   vertrekt altijd bij wat ze weet en wijst naar het vakje -- ook als dat
   links staat (gisteren, ervoor): dan wijst hij terug. Eén vaste vorm leest
   na drie vragen vanzelf; verschillende maten en woordjes op verschillende
   hoogtes leest ze elke vraag opnieuw.
   soort: 'nu' (roze: waar je vertrekt), 'vraag' (het vakje, '@'), of een
   kaartje in de kleur van zijn seizoen ('winter', ...) of zonder ('kaal'). */
function kalKaart(soort, inhoud, teken) {
  if (soort === 'vraag') return '<span class="kal-kaart vraag"><span class="pl-som">@</span></span>';
  // het teken (❄️ het seizoen) zit bovenop de rand, nooit naast het woord: zo blijft elk woord op dezelfde plek
  return `<span class="kal-kaart ${soort}">${teken ? `<i class="kal-teken" aria-hidden="true">${teken}</i>` : ''}${inhoud}</span>`;
}
/* DE BRUG: het woord erboven, en eronder een rechte pijl -- dezelfde pijl
   als bij elke andere kalendervraag. Gaat het om meer dan één dag, dan tel
   je langs de pijl: rondjes 1, 2, 3 erboven, en de laatste tel staat óp het
   vakje (zie kalVan). Zo ís de vierde dag het antwoord.
   Hier stond een boog met een stip per dag, en daarna een hokje per dag: dat
   las als "na vier hokjes komt de dag" -- één dag te ver. Een tel die op het
   vakje zelf landt kan dat niet. Terug is dezelfde tekening gespiegeld, en
   de rondjes tellen dan van rechts naar links. */
function kalBrug(woord, dagen, terug) {
  const tel = Array.from({ length: Math.max(0, (dagen || 0) - 1) }, (_, i) => `<i>${i + 1}</i>`);
  const rondjes = tel.length ? `<span class="kal-tel-rij">${(terug ? tel.reverse() : tel).join('')}</span>` : '';
  const pijl = '<path d="M5 15 H51" fill="none"/><path d="M56 15 l-10 -6 v12z" class="punt"/>';
  return `<span class="kal-brug"><b>${woord}</b>${rondjes}<svg viewBox="0 0 60 30" aria-hidden="true">${terug ? `<g transform="translate(60 0) scale(-1 1)">${pijl}</g>` : pijl}</svg></span>`;
}
// links ➜ rechts, met de brug ertussen
const kalPaar = (links, brug, rechts) => `<span class="kal-rij">${links}${brug}${rechts}</span>`;
// het vakje; tel = de laatste tel langs de brug, bovenop de rand (zie kalBrug)
const vakje = tel => tel > 1 ? `<span class="kal-kaart vraag"><i class="kal-teken kal-tel" aria-hidden="true">${tel}</i><span class="pl-som">@</span></span>` : kalKaart('vraag');
const dagKaart = d => kalKaart('nu', DAGEN[d]);
const seizoenKaart = z => kalKaart(SEIZOENEN[z].id, SEIZOENEN[z].naam, SEIZOENEN[z].teken);
const maandKaart = m => kalKaart(SEIZOENEN[seizoenVan(m)].id, MAANDEN[m], SEIZOENEN[seizoenVan(m)].teken);
// wat ze weet, de brug, en het vakje: naar rechts als het erna komt, naar links als het ervoor komt
const kalVan = (weet, woord, dagen, terug) => terug ? kalPaar(vakje(dagen), kalBrug(woord, dagen, true), weet) : kalPaar(weet, kalBrug(woord, dagen), vakje(dagen));

/* HET KALENDERBLAD van maand m: de kop in de kleur van zijn seizoen, ma tot
   zo, het weekend lichter. Het jaar is dit jaar, zodat de dagen kloppen met
   de kalender in de keuken. merk: { [datum]: 'rond' | 'vraag' }. Op de volle
   breedte van de kaart: een cijfer op het blad is even groot als een woord
   op een knop, anders zoekt ze een datum die ze niet kan lezen. */
function kalBlad(m, merk) {
  const eerste = dagVan(m, 1), n = dagenIn(m), z = SEIZOENEN[seizoenVan(m)];
  const vakjes = Array.from({ length: eerste }, () => '<i></i>').concat(Array.from({ length: n }, (_, i) => {
    const d = i + 1, soort = merk[d] || '';
    return `<i class="${soort}${(eerste + i) % 7 > 4 ? ' wk' : ''}">${soort === 'vraag' ? '?' : d}</i>`;
  })).join('');
  return `<span class="kal-blad ${z.id}"><b>${z.teken} ${MAANDEN[m]}</b>`
    + `<span class="kal-kop">${DAGEN.map(d => `<i>${d.slice(0, 2)}</i>`).join('')}</span><span class="kal-raster">${vakjes}</span></span>`;
}
/* WEKEN als een leeg kalenderblad: ma tot zo erboven, elke rij één week.
   Dezelfde kolommen als het echte blad, zodat "een rij is een week" daar
   al bekend is. */
function kalWeken(w) {
  const rij = Array.from({ length: 7 }, (_, i) => `<i class="${i > 4 ? 'wk' : ''}"></i>`).join('');
  return `<span class="kal-blad kal-weken"><span class="kal-kop">${DAGEN.map(d => `<i>${d.slice(0, 2)}</i>`).join('')}</span>`
    + `<span class="kal-raster">${Array(w).fill(rij).join('')}</span></span>`;
}

function kalenderVoorbeeld(r) {
  return { morgen: 'di ➜ morgen', seizoen: '❄️ ➜ 🌷', verder: 'vr + 3', maanden: '🌷 maart ➜ april', weken: '2 weken = 14', blad: '📅 12 ➜ di', datum: '28/10' }[r.id];
}
// Vier keuzes rond het goede antwoord, op een ring van n (een dag te ver, de verkeerde kant op).
function kalKeuzes(ans, n, fout) { return [...new Set([ans, ...fout.map(v => mod(v, n)), ...shuffle([1, -1, 2, -2, 3]).map(d => mod(ans + d, n))])].slice(0, 4); }
const kalVraag = (rij, ans, extra) => ({ kind: 'kalender', op: 'kalender', rij, ans, kiezen: true, ...extra });
/* Een aantal (dagen, weken, een datum): getypt, of gekozen uit knoppen die
   makeChoices legt -- de echte fout (q.fouten) en de buren, aan een gelote
   kant. Een vast lijstje had het antwoord altijd op dezelfde plek (bij de
   weken altijd het derde getal van klein naar groot). */
const kalGetal = (rij, ans, extra) => ({ kind: 'kalender', op: 'kalender', rij, ans, kiezen: false, soort: 'getal', min: 1, ...extra });

/* Een vraag van rij r. Elke rij heeft twee vormen, om de beurt (vorm 'lees'
   of 'zoek', zoals de klok). */
function genKalender(r, vorm) {
  const tweede = vorm === 'zoek';
  if (r.id === 'morgen') {
    // donderdag ─morgen➜ ?, of ? ⬅overmorgen─ donderdag: de dagen tel je langs de pijl (zie kalBrug)
    const stap = pick(tweede ? [-2, 2] : [-1, 1, 1]), nu = rnd(0, 6), ans = mod(nu + stap, 7);
    return kalVraag('morgen', ans, { soort: 'dag', keuzes: kalKeuzes(ans, 7, [nu - stap, nu]),
      tmpl: `kal morgen ${nu} ${stap}`, html: kalVan(dagKaart(nu), DAGWOORD[stap], Math.abs(stap), stap < 0) });
  }
  if (r.id === 'seizoen') {
    if (tweede) {   // wat hoort bij welk seizoen: twee dingen uit hetzelfde seizoen
      const z = rnd(0, 3), twee = shuffle(SEIZOENEN[z].dingen.slice()).slice(0, 2);
      return kalVraag('seizoen', z, { soort: 'seizoen', keuzes: [0, 1, 2, 3], tmpl: `kal ding ${twee.join('')}`,
        html: kalVan(kalKaart('kaal ding', twee.join('')), 'seizoen') });
    }
    const z = rnd(0, 3), na = Math.random() < 0.65, ans = mod(z + (na ? 1 : -1), 4);
    return kalVraag('seizoen', ans, { soort: 'seizoen', keuzes: [0, 1, 2, 3], tmpl: `kal seizoen ${z} ${na}`,
      html: kalVan(seizoenKaart(z), na ? 'erna' : 'ervoor', 0, !na) });
  }
  if (r.id === 'verder') {
    const d = rnd(3, 5), terug = tweede, nu = rnd(0, 6), ans = mod(nu + (terug ? -d : d), 7);
    return kalVraag('verder', ans, { soort: 'dag', keuzes: kalKeuzes(ans, 7, [ans + (terug ? 1 : -1), ans + (terug ? -1 : 1)]),
      tmpl: `kal verder ${nu} ${terug ? -d : d}`, html: kalVan(dagKaart(nu), `${terug ? '−' : '+'} ${d} dagen`, d, terug) });
  }
  if (r.id === 'maanden') {
    /* In welk seizoen valt deze maand? Niet maart, juni, september of
       december: op een Vlaamse schoolkalender begint de lente op 21 maart, en
       dan is "winter" voor maart niet fout. Erna en ervoor kan wel met elke
       maand. Het kaartje is zonder kleur: de kleur zou het antwoord verklappen. */
    if (tweede) {
      const m = pick([0, 1, 3, 4, 6, 7, 9, 10]);
      return kalVraag('maanden', seizoenVan(m), { soort: 'seizoen', keuzes: [0, 1, 2, 3], tmpl: `kal maandseizoen ${m}`,
        html: kalVan(kalKaart('kaal', MAANDEN[m]), 'seizoen') });
    }
    const m = rnd(0, 11), na = Math.random() < 0.65, ans = mod(m + (na ? 1 : -1), 12);
    return kalVraag('maanden', ans, { soort: 'maand', keuzes: kalKeuzes(ans, 12, [m + (na ? -1 : 1), m]), tmpl: `kal maand ${m} ${na}`,
      html: kalVan(maandKaart(m), na ? 'erna' : 'ervoor', 0, !na) });
  }
  if (r.id === 'weken') {
    // terug naar weken begint bij 2: "7 dagen = 1 week" is geen vraag maar de afspraak zelf
    const omgekeerd = tweede, w = rnd(omgekeerd ? 2 : 1, omgekeerd ? 5 : 4), week = n => n > 1 ? 'weken' : 'week';
    return kalGetal('weken', omgekeerd ? w : 7 * w, { grens: omgekeerd ? 10 : 35,
      fouten: omgekeerd ? [w + 1, w - 1] : [5 * w, 7 * (w + 1), 7 * (w - 1)],
      tmpl: `kal weken ${w} ${omgekeerd}`,
      html: `<span class="kal-vraag">${kalWeken(w)}</span>${omgekeerd
        ? kalVan(kalKaart('kaal', `${7 * w} dagen`), 'weken') : kalVan(kalKaart('kaal', `${w} ${week(w)}`), 'dagen')}` });
  }
  const m = rnd(0, 11), n = dagenIn(m);
  if (r.id === 'blad') {
    if (tweede) {   // een week later: één rij naar beneden, in dezelfde kolom
      const dag = rnd(1, n - 7);
      return kalGetal('blad', dag + 7, { grens: n, fouten: [dag + 6, dag + 8, dag + 1], tmpl: `kal week ${m} ${dag}`,
        html: `<span class="kal-vraag">${kalBlad(m, { [dag]: 'rond', [dag + 7]: 'vraag' })}</span>${kalVan(kalKaart('datum', dag), '+ 1 week')}` });
    }
    const dag = rnd(1, n), ans = dagVan(m, dag);
    return kalVraag('blad', ans, { soort: 'dag', keuzes: kalKeuzes(ans, 7, [ans - 1, ans + 1]), tmpl: `kal blad ${m} ${dag}`,
      html: `<span class="kal-vraag">${kalBlad(m, { [dag]: 'rond' })}</span>${kalVan(kalKaart('datum', dag), 'dag')}` });
  }
  // de datum: zoals hij in een schrift staat (28/10), of tellen hoeveel dagen later
  if (tweede) {
    const a = rnd(1, n - 10), d = rnd(3, 10), b = a + d;
    return kalGetal('datum', d, { grens: 14, fouten: [d + 1, d - 1], tmpl: `kal tussen ${m} ${a} ${b}`,
      html: `<span class="kal-vraag">${kalBlad(m, { [a]: 'rond', [b]: 'rond' })}</span>${kalVan(kalKaart('datum', `${a} ➜ ${b}`), 'dagen')}` });
  }
  const dag = rnd(1, Math.min(n, 28)), code = (d, mm) => d * 100 + mm + 1;
  return kalVraag('datum', code(dag, m), { soort: 'notatie',
    // de echte fouten: maand en dag omgedraaid (10/28), de maand ernaast (oktober is de 10e, niet de 9e)
    keuzes: [...new Set([code(dag, m), (m + 1) * 100 + dag, code(dag, mod(m - 1, 12)), code(dag, mod(m + 1, 12)), code(dag + 1, m)])].slice(0, 4),   // 5/5: omgedraaid is hetzelfde, dan de dag ernaast
    tmpl: `kal datum ${m} ${dag}`,
    html: `<span class="kal-vraag">${kalBlad(m, { [dag]: 'rond' })}</span>${kalVan(kalKaart('datum', dag), 'datum')}` });
}

/* ---- De getallenlijn --------------------------------------------------------
   Zes rijen, zoals school ze brengt: in het eerste leerjaar de lijn tot 20 en
   de sprong erover (eerst tot 10, dan verder), in het tweede een stuk van de
   lijn tot 100 en schatten op een lege lijn, in het derde tot 1000 en
   afronden. Lees en zoek wisselen af, zoals bij de klok:
     lees  de pijl wijst een streepje aan, en ze zegt welk getal
     zoek  het getal staat op de kaart, en ze tikt op de lijn waar het hoort
   Dezelfde taal als de kalender: roze is wat je weet, het gestippelde vakje
   wat je zoekt. Het vakje hangt boven zijn streepje met een puntje naar
   beneden, dus het getal komt op de lijn te staan waar het hoort. */
const LIJNPAD = [
  { id: 'lijn20',   naam: 'Tot 20',        van: 0, tot: 20,   stap: 1,  label: 5 },
  { id: 'sprong',   naam: 'Sprongen',      van: 0, tot: 20,   stap: 1,  label: 5, sprong: true },
  { id: 'lijn100',  naam: 'Tot 100',       stuk: 20, max: 100, stap: 1, label: 10 },
  { id: 'schat',    naam: 'Schatten',      van: 0, tot: 100,  schat: true },
  { id: 'lijn1000', naam: 'Tot 1000',      stuk: 200, max: 1000, stap: 10, label: 100 },
  { id: 'afronden', naam: 'Afronden',      afronden: true },
];
/* De lijn: een dikke paarse balk met streepjes, de grote streepjes met hun
   getal eronder. Wat erboven staat (het vakje, een roze kaartje) is HTML op
   zijn plek in procenten, zodat het vakje een echt antwoordvak blijft.
   merk: [{ v, soort: 'vraag' | 'nu' | 'pijl', tekst }]; sprongen: [[van, tot, woord]] */
const GL = { w: 320, x0: 16, x1: 304, lijn: 46, h: 82 };
function lijnX(v, van, tot) { return GL.x0 + (v - van) / (tot - van) * (GL.x1 - GL.x0); }
function lijnTekening(van, tot, stap, label, o) {
  o = o || {};
  const x = v => lijnX(v, van, tot).toFixed(1), Y = GL.lijn;
  const streep = [], lbl = [];
  if (stap) for (let v = van; v <= tot; v += stap) {
    const groot = v % label === 0, half = !groot && label % 2 === 0 && v % (label / 2) === 0;
    const h = groot ? 11 : half ? 8 : 5.5;
    streep.push(`<line x1="${x(v)}" x2="${x(v)}" y1="${Y - h}" y2="${Y + h}" stroke-width="${groot ? 3.2 : 2}"/>`);
    if (groot && !(o.verberg || []).some(w => Math.abs(w - v) <= stap)) lbl.push(`<text x="${x(v)}" y="${Y + 30}">${v}</text>`);
  }
  else [van, tot].forEach(v => { streep.push(`<line x1="${x(v)}" x2="${x(v)}" y1="${Y - 11}" y2="${Y + 11}" stroke-width="3.2"/>`); lbl.push(`<text x="${x(v)}" y="${Y + 30}">${v}</text>`); });
  const bogen = (o.sprongen || []).map(([a, b, woord]) => {
    const xa = lijnX(a, van, tot), xb = lijnX(b, van, tot), mid = (xa + xb) / 2, h = Math.min(24, Math.abs(xb - xa) * .4 + 8);
    const hoek = Math.atan2(2 * h, (xb - xa) / 2) * 180 / Math.PI;
    return `<path d="M${xa.toFixed(1)} ${Y - 4} Q${mid.toFixed(1)} ${Y - 4 - 2 * h} ${xb.toFixed(1)} ${Y - 4}" class="boog"/>`
      + `<path d="M0 0 l-9 -5 v10z" class="punt" transform="translate(${xb.toFixed(1)} ${Y - 4}) rotate(${hoek.toFixed(1)})"/>`
      + `<text class="sprong" x="${mid.toFixed(1)}" y="${Y - 10 - h}">${woord}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${GL.w} ${GL.h}" aria-hidden="true"><line class="balk" x1="${GL.x0 - 6}" x2="${GL.x1 + 6}" y1="${Y}" y2="${Y}"/>`
    + `<g class="streep">${streep.join('')}</g><g class="lbl">${lbl.join('')}</g>${bogen}</svg>`;
}
// de lijn met wat erboven hangt; plek in procenten van de breedte, het puntje op de balk
function getallenlijn(van, tot, stap, label, merk, o) {
  const boven = (merk || []).map(m => {
    const l = (lijnX(m.v, van, tot) / GL.w * 100).toFixed(2);
    if (m.soort === 'pijl') return `<i class="gl-pijl" style="left:${l}%"></i>`;
    const inhoud = m.soort.startsWith('vraag') ? '<span class="pl-som">@</span>' : m.tekst;
    return `<span class="gl-merk ${m.soort}" style="left:${l}%">${inhoud}</span>`;
  }).join('');
  return `<span class="gl${o && o.sprongen ? ' hoog' : ''}"><span class="gl-doos">${lijnTekening(van, tot, stap, label, o)}${boven}</span></span>`;
}
// het stuk van de lijn rond een getal: tot 20 heel, de grotere lijnen een stuk van 20 (200) op een tiental (honderdtal)
function lijnStuk(r, n) {
  if (r.van != null) return [r.van, r.tot];
  const van = Math.min(r.max - r.stuk, Math.max(0, Math.floor((n - r.stuk / 4) / (r.stuk / 2)) * (r.stuk / 2)));
  return [van, van + r.stuk];
}
function lijnVoorbeeld(r) {
  return { lijn20: '▼ 13', sprong: '8 ⤻ +5', lijn100: '▼ 47', schat: '0 ▼ 100 ± 70', lijn1000: '▼ 370', afronden: '47 ≈ 50' }[r.id];
}
const lijnVraag = (rij, ans, extra) => Object.assign({ kind: 'lijn', op: 'lijn', rij, ans }, extra);
function genLijn(r, vorm) {
  const tweede = vorm === 'zoek';
  if (r.sprong) {
    // 8 ⤻+5 ?, en over het tiental in twee sprongen: eerst tot 10, dan verder (zo leert school het)
    const a = rnd(3, 12), d = rnd(3, Math.min(8, 19 - a)), b = a + d, brug = a < 10 && b > 10;
    const bogen = brug ? [[a, 10, `+${10 - a}`], [10, b, `+${b - 10}`]] : [[a, b, `+${d}`]];
    // een stuk van 12 rond de sprong: dan staan de streepjes ver genoeg uit elkaar voor twee kaartjes
    const van = Math.max(0, Math.min(a - 2, 8)), tot = van + 12;
    if (tweede) return lijnVraag('sprong', d, { kiezen: false, grens: 10, tmpl: `lijn sprong ${a} ${b}`, plus: true,
      html: getallenlijn(van, tot, 1, 5, [{ v: a, soort: 'nu onder', tekst: a }, { v: b, soort: 'nu onder', tekst: b }], { sprongen: [[a, b, '']], verberg: [a, b] }) + `<span class="gl-zin">+ <span class="pl-som">@</span></span>` });
    return lijnVraag('sprong', b, { kiezen: false, grens: 20, tmpl: `lijn sprong ${a} ${d}`,
      html: getallenlijn(van, tot, 1, 5, [{ v: a, soort: 'nu onder', tekst: a }, { v: b, soort: 'vraag onder' }], { sprongen: bogen, verberg: [a, b] }) });
  }
  if (r.schat) {
    const ans = pick([10, 20, 30, 40, 60, 70, 80, 90]), n = ans + rnd(-2, 2);
    return lijnVraag('schat', ans, { kiezen: true, keuzes: [ans, ...shuffle([...new Set([ans - 20, ans + 20, ans - 40, ans + 40, 100 - ans])].filter(v => v > 0 && v < 100 && v !== ans)).slice(0, 3)],
      tmpl: `lijn schat ${n}`, html: getallenlijn(0, 100, 0, 100, [{ v: n, soort: 'vraag' }]) });
  }
  /* Afronden, zoals het derde leerjaar het doet: een getal tot honderd naar
     het tiental, en -- de rij komt na Tot 1000 -- ook een getal van drie
     cijfers naar het tiental (347 ≈ 350) of het honderdtal (370 ≈ 400). Een
     5 rond je naar boven af: zo leert school het, dus die zit er ook bij. De
     lijn is altijd het stuk tussen de twee kandidaten, en dat zijn de twee knoppen. */
  if (r.afronden) {
    const soort = rnd(0, 3), groot = soort === 3;
    const maat = groot ? 100 : 10, van = soort < 2 ? rnd(1, 9) * 10 : groot ? rnd(1, 9) * 100 : rnd(10, 99) * 10;
    const rest = groot ? rnd(1, 9) * 10 : rnd(1, 9), n = van + rest, ans = rest * 2 < maat ? van : van + maat;
    return lijnVraag('afronden', ans, { kiezen: true, keuzes: [van, van + maat], knop: 'twee', tmpl: `lijn rond ${n}`,
      html: getallenlijn(van, van + maat, maat / 10, maat, [{ v: n, soort: 'nu', tekst: n }]) + `<span class="gl-zin">≈ <span class="pl-som">@</span></span>` });
  }
  const stap = r.stap, max = r.tot || r.max;
  let n; do n = rnd(1, max / stap - 1) * stap; while (n % r.label === 0);
  const [van, tot] = lijnStuk(r, n);
  if (tweede) return lijnVraag(r.id, n, { kiezen: false, tik: true, bereik: [van, tot, stap, r.label], tmpl: `lijn zoek ${n}`,
    html: `<span class="kal-rij"><span class="kal-kaart nu gl-zoek">${n}</span></span>` });
  /* de echte fout: van het verkeerde grote streepje geteld (63 gelezen als 67).
     De rest legt makeChoices er een, twee of drie streepjes naast, aan een
     gelote kant -- een eigen lijstje (het antwoord, de fout, één erboven, één
     eronder) had het antwoord nooit als kleinste of grootste, en bij 19 op de
     lijn tot 20 maar drie knoppen. */
  const groot = Math.round(n / r.label) * r.label, spiegel = 2 * groot - n;
  return lijnVraag(r.id, n, { kiezen: false, fouten: [spiegel], min: van, grens: tot, tmpl: `lijn lees ${van} ${n}`,
    html: getallenlijn(van, tot, stap, r.label, [{ v: n, soort: 'vraag' }]) });
}
/* Zoeken: de lijn zelf is het antwoordvak. Eén vlak over de hele lijn, en
   een tik telt voor het dichtstbijzijnde streepje (lijnRaak): op de lijn tot
   1000 liggen de streepjes op een kleine telefoon 13 pixels uit elkaar, te
   smal voor een knop per streepje. Op elk streepje staat een onzichtbaar
   merkje (.gl-tik); dat krijgt goed of fout, zoals een knop. */
function lijnTikvlak(q) {
  const [van, tot, stap, label] = q.bereik, merk = [];
  for (let v = van; v <= tot; v += stap) merk.push(`<i class="gl-tik" data-v="${v}" style="left:${(lijnX(v, van, tot) / GL.w * 100).toFixed(2)}%"></i>`);
  return `<div class="gl-vlak"><span class="gl"><span class="gl-doos">${lijnTekening(van, tot, stap, label)}${merk.join('')}`
    + '<button class="gl-raak" aria-label="Tik op de lijn waar het getal hoort"></button></span></span><span class="gl-hand" aria-hidden="true">👆</span></div>';
}
// het streepje het dichtst bij een tik op x (in pixels van links in een vlak van breedte b)
function lijnRaak(q, x, b) {
  const [van, tot, stap] = q.bereik, u = x / b * GL.w;
  const v = van + Math.round((u - GL.x0) / (GL.x1 - GL.x0) * (tot - van) / stap) * stap;
  return Math.min(tot, Math.max(van, v));
}

// Het antwoord van een vraag zoals het in het vakje staat (toonAntwoord) en op een knop (toonKeuze).
function toonAntwoord(q, v) {
  if (q.kind === 'klok') return klokTekst(q, v);
  if (q.kind === 'kalender') return q.soort === 'dag' ? DAGEN[v] : q.soort === 'maand' ? MAANDEN[v] : q.soort === 'seizoen' ? SEIZOENEN[v].naam
    : q.soort === 'notatie' ? `${Math.floor(v / 100)}/${v % 100}` : String(v);
  if (q.kind !== 'geld') return String(v);
  return q.centen ? euro(v).slice(1) : String(v);
}
function toonKeuze(q, v) {
  // zoeken: een lege regel tekst houdt de knop op zijn gewone hoogte, het klokje vult hem (zie .klok-zoek)
  if (q.kind === 'klok') return q.vorm === 'zoek' ? '&#8203;' + klokSvg(v, 64)
    : q.uur24 ? `<span class="klok-digi">${klokDigitaal(v)}</span>` : `<span class="klok-tekst">${klokWoorden(v)}</span>`;
  if (q.kind === 'kalender') return q.soort === 'getal' || q.soort === 'notatie' ? toonAntwoord(q, v)
    : `<span class="klok-tekst">${q.soort === 'seizoen' ? SEIZOENEN[v].teken + ' ' : ''}${toonAntwoord(q, v)}</span>`;
  return q.kind === 'geld' ? (q.centen ? euro(v) : `€${v}`) : String(v);
}

/* ---- Een ladder per thema ---------------------------------------------------
   Tafels en geld hebben elk een ladder, en die werkt voor allebei hetzelfde --
   net als het leerpad van rekenen, maar zonder blokken en grens:
     s[lijn]   = { vanaf, tot }: rij-ids, null = het begin of het eind
     p[stand]  = { rij, shows, goed, klaar }, net als p.pad
   Ze staat op de eerste rij tussen de lijnen die nog niet klaar is (ladderNu),
   en schuift door met dezelfde regel als padNa (ladderNa). Voorbij de laatste
   rij is het alles door elkaar, tot de lijn "tot". Bij Zelf kiezen telt de
   ladder niet: dan is het s[kies] (geld, klok) of s.tables (tafels). */
const LADDERS = {
  tafels: { pad: TAFELPAD, lijn: 'tafelLijn', stand: 'tafels', id: 'set-tafelpad', eind: 'Alle tafels door elkaar', vb: tafelVoorbeeld },
  geld:   { pad: GELDPAD,  lijn: 'geldLijn',  stand: 'geld',   id: 'set-geldpad',  eind: 'Alles met geld door elkaar', vb: geldVoorbeeld, kies: 'kiesGeld' },
  klok:   { pad: KLOKPAD,  lijn: 'klokLijn',  stand: 'klok',   id: 'set-klokpad',  eind: 'Alle tijden door elkaar', vb: klokVoorbeeld, kies: 'kiesKlok' },
  kalender: { pad: KALENDERPAD, lijn: 'kalLijn', stand: 'kalender', id: 'set-kalenderpad', eind: 'Alles met de kalender door elkaar', vb: kalenderVoorbeeld, kies: 'kiesKalender' },
  lijn:   { pad: LIJNPAD,  lijn: 'lijnLijn',  stand: 'lijn',   id: 'set-lijnpad',  eind: 'Alle lijnen door elkaar', vb: lijnVoorbeeld, kies: 'kiesLijn' },
};
Object.values(LADDERS).forEach(L => { L.idx = Object.fromEntries(L.pad.map((r, i) => [r.id, i])); });
// De rijen met voorbeeld, en waar de twee lijnen staan (indexen, 0 = de eerste rij).
function ladderRijen(s, k) {
  const L = LADDERS[k], l = s[L.lijn] || {};
  const hi = l.tot in L.idx ? L.idx[l.tot] : L.pad.length - 1;
  const lo = Math.min(l.vanaf in L.idx ? L.idx[l.vanaf] : 0, hi);
  return { rijen: L.pad.map(r => ({ ...r, vb: L.vb(r, s) })), lo, hi };
}
function ladderNu(p, k) {
  const L = LADDERS[k], { lo, hi } = ladderRijen(p.settings, k);
  const klaar = new Set((p[L.stand] && p[L.stand].klaar) || []);
  const r = L.pad.slice(lo, hi + 1).find(x => !klaar.has(x.id));
  return r ? r.id : 'alles';
}
// De rijen die ze op die ladder speelt: tot en met haar rij, en wat ze al haalde.
function ladderSpeelt(p, k) {
  const L = LADDERS[k], nuId = ladderNu(p, k), { hi } = ladderRijen(p.settings, k);
  const klaar = new Set((p[L.stand] && p[L.stand].klaar) || []);
  const tot = nuId === 'alles' ? hi : L.idx[nuId];
  return { rijen: L.pad.filter((r, i) => i <= tot || klaar.has(r.id)), nu: nuId === 'alles' ? null : L.pad[tot] };
}
function ladderNa(p, k, sterren, eigen) {
  const L = LADDERS[k], nu = ladderNu(p, k);
  if (nu === 'alles') return false;
  const t = p[L.stand] = p[L.stand] || { klaar: [] };
  if (!Array.isArray(t.klaar)) t.klaar = [];
  if (t.rij !== nu) Object.assign(t, rijNul(nu));
  if (!rijVerder(t, sterren, eigen)) return false;
  L.pad.slice(0, L.idx[nu] + 1).forEach(r => { if (!t.klaar.includes(r.id)) t.klaar.push(r.id); });
  Object.assign(t, rijNul(ladderNu(p, k)));
  return true;
}

/* ---- De vraagmakers van de thema's -----------------------------------------
   tafelInst: × en ÷ zoals de ouder ze aanzette, en de tafels van haar rij en
   alles ervoor. Zelf kiezen: de aangetikte tafels, om de beurt. */
function tafelInst(p) {
  const s = p.settings;
  const ops = s.ops.filter(o => o === 'x' || o === ':');
  const basis = { ...s, ops, missNum: false, chain3: false, tientallen: false, honderdtallen: false, bouwen: null };
  if (zelfGekozen(s)) return { ...basis, tables: s.tables.length ? s.tables.slice() : [2, 5, 10], tafelStapel: [] };
  const { rijen, nu } = ladderSpeelt(p, 'tafels');
  return { ...basis, tables: rijen.flatMap(r => r.tafels), tafelNu: nu && nu.tafels };
}
/* rijenInst: de rijen waar een vraag van geld of de klok uit komt. Op het
   leerpad vaak haar rij (RIJ_NU_VAAK), anders een die ze al had; bij Zelf
   kiezen de aangevinkte, om de beurt. De klok wisselt lezen en zoeken af
   (s.lees): begint de show met lezen, dan is de volgende zoeken. */
const RIJ_NU_VAAK = 0.6;
function rijenInst(p, k) {
  const s = p.settings, L = LADDERS[k];
  const basis = { thema: k, lees: Math.random() < 0.5 };
  if (zelfGekozen(s)) {
    const aan = L.pad.filter(r => (s[L.kies] || []).includes(r.id));
    return { ...basis, rijen: aan.length ? aan : L.pad.slice(0, 1), stapel: [] };
  }
  /* Voorbij de laatste rij (alles door elkaar) komen de twee laatste rijen
     het vaakst (RIJ_LAATST_VAAK): met elke rij even vaak bleef ze een vijfde
     van de tijd hele uren lezen of munten tot €10 tellen, show na show. */
  const { rijen, nu } = ladderSpeelt(p, k);
  return { ...basis, rijen, nu, laatste: nu ? null : rijen.slice(-2) };
}
const RIJ_LAATST_VAAK = 0.6;
function rijenVraag(s, net) {
  let q, poging = 0;
  do {
    const r = s.nu && Math.random() < RIJ_NU_VAAK ? s.nu : s.stapel ? beurt(s, 'stapel', s.rijen)
      : s.laatste && Math.random() < RIJ_LAATST_VAAK ? pick(s.laatste) : pick(s.rijen);
    const vorm = s.lees ? 'lees' : 'zoek';
    q = s.thema === 'klok' ? genKlok(r, vorm) : s.thema === 'kalender' ? genKalender(r, vorm) : s.thema === 'lijn' ? genLijn(r, vorm) : genGeld(r);
  } while (net.includes(q.tmpl) && ++poging < 8);
  s.lees = !s.lees;
  return q;
}
/* Welke tafel deze som? Op het leerpad vaak die van haar rij; bij Zelf kiezen
   om de beurt (s.tafelStapel, een geschud stapeltje dat de show lang meegaat),
   zodat in een show van acht élke aangetikte tafel langskomt -- met pick() kon
   de tafel van 7 er een hele show niet bij zitten. */
function kiesTafel(s, tables) {
  if (s.tafelNu && Math.random() < TAFEL_NU_VAAK) return pick(s.tafelNu);
  return beurt(s, 'tafelStapel', tables);
}
// De volgende uit een stapeltje dat om de beurt gaat; zonder stapeltje gewoon pick.
function beurt(s, sleutel, lijst) {
  const stapel = s[sleutel];
  if (!stapel) return pick(lijst);
  if (!stapel.length) stapel.push(...shuffle(lijst.slice()));
  return stapel.pop();
}
// De vraagmaker van een thema (zie vraagInst, tafelInst, rijenInst).
function themaInst(p, k) { return k === 'tafels' ? tafelInst(p) : k === 'rekenen' ? vraagInst(p) : rijenInst(p, k); }

/* ---- De show mengen ---------------------------------------------------------
   Welk thema elke vraag van de show krijgt, vooraf: [k, k, ...].
     sommen   rekenen en tafels krijgen evenveel vragen (de rest naar wie eerst
              staat), en wisselen elkaar af
     erbij    geld en de klok krijgen elk twee in een show van acht of meer, één in een
              kortere, op gelijke afstanden tussen de sommen -- nooit de eerste
              vraag, die is wat ze kent
   Afwisselen en niet per toeval: twee tafelvragen na elkaar en dan vijf sommen
   leest als een ander spel, niet als één show. Staat er geen som aan, dan
   delen de andere de show gelijk. */
const THEMA_ERBIJ = ['geld', 'klok', 'kalender', 'lijn'];
function themaPlan(s, total) {
  const aan = themasAan(s);
  const sommen = aan.filter(k => !THEMA_ERBIJ.includes(k)), erbij = aan.filter(k => THEMA_ERBIJ.includes(k));
  const verdeel = (ks, n) => {
    const tel = Object.fromEntries(ks.map((k, i) => [k, Math.floor(n / ks.length) + (i < n % ks.length ? 1 : 0)]));
    const uit = [];
    while (uit.length < n) ks.forEach(k => { if (tel[k] > 0) { uit.push(k); tel[k]--; } });
    return uit;
  };
  if (!sommen.length) return verdeel(erbij, total);
  /* De helft blijft sommen. Staan er meer extra thema's aan dan er plaats is,
     dan begint elke show bij een ander (geschud): anders kreeg het eerste
     altijd twee vragen en het laatste er één, show na show. */
  const plaats = Math.floor(total / 2), wil = erbij.length * (total >= 8 ? 2 : 1);
  const extra = verdeel(wil > plaats ? shuffle(erbij.slice()) : erbij, Math.min(wil, plaats));
  const plan = verdeel(sommen, total - extra.length);
  extra.forEach((k, j) => plan.splice(Math.round((j + 1) * total / (extra.length + 1)), 0, k));
  return plan;
}
/* De sterren van één thema in een show: dezelfde maat als showStars, op
   alleen zijn eigen vragen. Zo schuift de tafelladder niet door omdat de
   sommen goed gingen, en blijft hij niet staan omdat er één som misging.
   Met weinig vragen (geld en de klok hebben er twee per show) mag één misser
   altijd, zolang er nog iets goed is: met de gewone marge was 1 van 2 meteen
   1 ster, en een show met 1 ster telt niet mee (PAD_TELT) -- een kind dat
   elke show één van de twee miste, schoof dan nooit door, ook niet na
   PAD_MAX_SHOWS. Eén vraag mis is nog altijd 1 ster. */
function themaSterren(g, k) {
  const mijn = g.qs.map((q, i) => i).filter(i => (g.themaPlan ? g.themaPlan[i] : 'rekenen') === k);
  if (!mijn.length) return 0;
  const mis = mijn.filter(i => g.uitslag[i] && g.uitslag[i] !== 'goed').length;
  const marge = Math.max(Math.floor(mijn.length * STER_MARGE), mijn.length > 1 ? 1 : 0);
  return mis === 0 ? 3 : mis <= marge ? 2 : 1;
}
// Moeilijkheid 0..1, bijgestuurd op vaardigheid (perf 0..1 → ±0.25): een kind
// dat worstelt krijgt op elke rij lichtere sommen, nooit zwaardere dan de rij.
function moeilijkheid(perf, s) {
  const skillAdj = ((perf == null ? 0.5 : perf) - 0.5) * 0.5;
  return Math.max(0.2, Math.min(1, 1 + skillAdj, wenPlafond(s)));
}
/* Wennen aan een hogere grens. Een bereik-rij speelt meteen zijn hele bereik,
   dus "tot 50" gaf een kind dat net nog tot twintig rekende meteen 37 + 12.
   Nu klimt het plafond in WEN_SHOWS shows van
   WEN_VAN naar 1: van twintig naar vijftig begint dus rond de dertig. s.wennen
   telt af (zie endLevel) en wordt gezet als de grens omhoog gaat, met de tip of
   op Oefeningen (zie grensOmhoog). Omlaag is meteen: kleiner hoeft niet te wennen. */
const WEN_SHOWS = 8, WEN_VAN = 0.6;
function wenPlafond(s) {
  const n = (s && s.wennen) || 0;
  return n > 0 ? WEN_VAN + (1 - WEN_VAN) * (1 - n / WEN_SHOWS) : 1;
}
/* De grens naar een ander blok. De lijn "tot" gaat mee naar het eind ervan
   (padTot null): wie de grens met de tip verzet, krijgt het hele blok. Op
   Oefeningen zet padTotOp hem daarna op de rij waar getikt werd. Dezelfde grens
   doet niets -- ook het wennen loopt dan gewoon door. */
function grensOmhoog(s, naar) {
  if (naar === s.max) return;
  if (naar > s.max) s.wennen = WEN_SHOWS;
  else s.wennen = 0;
  s.max = naar;
  s.padTot = null;
}
/* Twee getallen van minstens 1 die samen hoogstens max zijn: voor plus de twee
   termen, voor min het af te trekken getal en de uitkomst (dan is het eerste
   getal hun som). ELK PAAR EVEN VAAK. Hier stond eerst het eerste getal loten
   en dan het tweede binnen wat er nog over was -- dan kwam het tweede getal
   bijna altijd klein uit, en het eind van het bereik bijna altijd uit: op Tot
   10 was een derde van de plussommen "= 10" en een derde van de minsommen
   "− 1". Ze oefende dus vooral +1 en −1, en "kies het grootste getal" klopte te
   vaak. kaal: een 1 (+1, −1, en een uitkomst van 1) komt half zo vaak -- die
   zijn er voor wie net begint, niet om de show mee te vullen. De telmodus
   gebruikt hetzelfde paar, zonder die rem: daar ís één erbij de oefening. */
function somPaar(max, kaal, deel) {
  deel = deel || max - 1;
  for (let poging = 0; poging < 60; poging++) {
    const x = rnd(1, Math.min(deel, max - 1)), y = rnd(1, Math.min(deel, max - 1));
    if (x + y > max) continue;
    if (kaal && (x === 1 || y === 1) && Math.random() < 0.5) continue;
    return [x, y];
  }
  return [1, 1];
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

/* Bouwt één geldige, niet-negatieve, exacte drieling voor een bewerking.
   s zijn de instellingen zoals vraagInst ze maakt: die van de ouder met haar
   rij op het leerpad erover (max, brug, tientallen). lvl doet niet meer mee --
   de wereld zegt niet meer wat er te leren valt (zie "Het leerpad"). */
function genTriple(s, lvl, perf, op) {
  // Zo krijgt een kind dat worstelt lichtere sommen en een sterk kind wat pittigere.
  const t = moeilijkheid(perf, s);
  let effMax = Math.max(10, Math.round(s.max * t)); // binnen ingestelde grens
  const tables = s.tables.length ? s.tables : [2, 5, 10];
  let a, b, c, sym;
  if ((op === '+' || op === '-') && s.max > 100) {
    /* Het blok tot 1000 rekent in hele tientallen (460 + 320, 380 + 50), en op
       de rij Honderdtallen vaak in hele honderdtallen: zo rekent het derde
       leerjaar uit het hoofd, en zo blijft een antwoord te typen. Het is
       dezelfde som een maat kleiner, keer tien of honderd -- dus wordt "over
       het tiental" vanzelf "over het honderdtal" (38 + 5 -> 380 + 50). */
    const stap = s.honderdtallen && Math.random() < (s.honderdtallen === 'altijd' ? 1 : HONDERDTALLEN_VAAK) ? 100 : 10;
    const k = genTriple({ ...s, max: s.max / stap, tientallen: false, honderdtallen: false }, lvl, perf, op);
    return { ...k, a: k.a * stap, b: k.b * stap, c: k.c * stap, effMax: k.effMax * stap };
  }
  if (op === '+' || op === '-') {
    /* De tiental-regel van haar rij. Onder de 11 kán een som niet over het
       tiental, dus dan valt er niets te kiezen en wordt er ook niet gezocht. */
    const brug = s.brug || 'vrij';
    /* De rij "tientallen": vaak een som met hele tientallen (40 + 30, 70 − 30),
       de rest gewoon -- het nieuwe is er het meest, niet als enige. */
    if (s.tientallen && effMax >= 20 && Math.random() < (s.tientallen === 'altijd' ? 1 : TIENTALLEN_VAAK)) {
      const T = Math.floor(effMax / 10);
      if (op === '+') { a = 10 * rnd(1, T - 1); b = 10 * rnd(1, T - a / 10); c = a + b; }
      else { a = 10 * rnd(2, T); b = 10 * rnd(1, a / 10 - 1); c = a - b; }
      return { a, b, c, sym: op === '+' ? '+' : '−', op, t, effMax };
    }
    /* 'altijd' is Zelf kiezen met alleen Over het tiental aangevinkt: dan
       moet elke som erover, ook als het spel de getallen nu kleiner maakt --
       onder de 11 kan dat niet, dus daar gaat het plafond niet onder. */
    if (brug === 'altijd') effMax = Math.max(effMax, Math.min(s.max, 18));
    const wilBrug = (brug === 'altijd' || (brug === 'vaak' && Math.random() < BRUG_VAAK)) && effMax > 10;
    const magBrug = brug !== 'nee';
    let poging = 0;
    do {
      if (op === '+') { [a, b] = somPaar(effMax, true); c = a + b; }
      else { [b, c] = somPaar(effMax, true); a = b + c; }
      const over = overTiental(a, b, c, op);
      if ((wilBrug ? over : (magBrug || !over))) break;
    } while (++poging < 40);
    sym = op === '+' ? '+' : '−';
  } else if (op === 'x') {
    /* Een tafel is altijd de hele tafel, van × 1 tot × 10, vanaf de eerste
       show: zo leert een kind ze op school, en de tafelladder of de ouder kiest
       wélke tafels (kiesTafel), niet hoe ver. t speelt hier niet mee. Met t begon wereld 1 op × 1 tot × 5, en
       dan stond er op het leerpad een stap "tot × 5" die geen ouder zo bedoelde.
       Vroeger knipte "Getallen tot" hem ook nog ongezegd af (tot 20 en de tafel
       van 7 gaf nooit meer dan 7 × 2) -- die grens is alleen van plus en min. */
    b = kiesTafel(s, tables);
    a = rnd(1, 10);
    c = a * b; sym = '×';
  } else { // ':'
    b = kiesTafel(s, tables);
    const q = rnd(1, 10);
    a = q * b; c = q; sym = ':';
  }
  return { a, b, c, sym, op, t, effMax };
}
// Klassieke som: het antwoord staat rechts (zoals de app altijd deed).
function genQuestion(s, lvl, perf) {
  const ops = s.ops.length ? s.ops : ['+'];
  const op = pick(ops);
  const { a, b, c, sym } = genTriple(s, lvl, perf, op);
  // brug: gaat hij over het tiental? Telt mee voor "Over de brug" (zie telLeer).
  // Tot 1000 in hele tientallen: over het honderdtal (380 + 50), een maat groter.
  const m = s.max > 100 && [a, b, c].every(v => v % 10 === 0) ? 10 : 1;
  const brug = (op === '+' || op === '-') && overTiental(a / m, b / m, c / m, op);
  return { tmpl: `${a} ${sym} ${b} = @`, ans: c, op, kind: 'classic', brug };
}
/* Zoek het getal: het tweede getal ontbreekt ("3 + ▢ = 7"). Bij plus en min
   wordt eerst het ontbrekende getal geloot, elk even vaak (een 1 zelden), en
   dan de som eromheen. Andersom -- een gewone som maken en er een gat in
   slaan -- was het ontbrekende getal bijna altijd klein: 1 tot 4 in de helft
   van de vragen, en dan raad je het. De tiental-regel van haar rij (brug 'nee')
   blijft gelden; tot 1000 is het dezelfde vraag keer tien, zoals genChain.
   Maal (alleen nog voor oude saves die het zo aan hadden) blijft zoals hij was. */
function genMissing(s, lvl, perf, op) {
  if ((op === '+' || op === '-') && s.max > 100) {
    const k = genMissing({ ...s, max: s.max / 10 }, lvl, perf, op);
    return { ...k, ans: k.ans * 10, tmpl: k.tmpl.replace(/\d+/g, n => n * 10) };
  }
  if (op === '+' || op === '-') {
    const effMax = Math.max(10, Math.round(s.max * moeilijkheid(perf, s)));
    let a, b, c, poging = 0;
    do {
      b = Math.random() < 0.1 ? 1 : rnd(2, effMax - 1);
      if (op === '+') { a = rnd(1, effMax - b); c = a + b; }
      else { c = rnd(1, effMax - b); a = b + c; }
    } while (s.brug === 'nee' && overTiental(a, b, c, op) && ++poging < 40);
    return { tmpl: `${a} ${op === '+' ? '+' : '−'} @ = ${c}`, ans: b, op, kind: 'missing' };
  }
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
  if (s.max > 100) {                  // tot 1000: in hele tientallen, zoals genTriple
    const k = genChain({ ...s, max: s.max / 10 }, lvl, perf);
    return { ...k, ans: k.ans * 10, tmpl: k.tmpl.replace(/\d+/g, n => n * 10) };
  }
  const t = moeilijkheid(perf, s);
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
/* ---- Getallen bouwen -----------------------------------------------------
   Wat een getal tot honderd ís: tientallen en eenheden. Het tweede leerjaar
   bouwt honderd zo op, vóór er gerekend wordt met die getallen (zie de rij in
   LEERPAD). Drie soorten, elk één getal als antwoord, zodat kiezen, typen, de
   hint en alle beloningen gewoon werken:
     blokken   staafjes en blokjes, welk getal is het?      = 45
     tiental   45 = ▢T + 5E: hoeveel tientallen?             4
     splits    45 = 40 + ▢, of 45 = ▢ + 5                    5 of 40
   De som op de kaart staat in q.html (met de blokken en de kleuren); q.tmpl is
   dezelfde vraag als gewone tekst, en q.fouten zijn de fouten die een kind hier
   echt maakt: de cijfers omgedraaid (54), alleen de tientallen (40), de cijfers
   opgeteld (9), een tiental ernaast. Geen zwakke-sommenpoel: die is van de
   klassieke sommen (zie incWeak). */
const BOUW_SOORTEN = [['blokken', 0.45], ['tiental', 0.25], ['splits', 0.3]];
function bouwBlokken(t, e) {
  return `<span class="pl-vis" aria-hidden="true"><span class="pl-staven">${'<i class="pl-staaf"></i>'.repeat(t)}</span>`
    + (e ? `<span class="pl-blokjes">${'<i class="pl-blok"></i>'.repeat(e)}</span>` : '') + '</span>';
}
function genBouwen(tot) {
  if (tot > 100) return genBouwen1000();
  const t = rnd(1, 9);
  const e = Math.random() < 0.15 ? 0 : rnd(1, 9);
  const n = 10 * t + e;
  let r = Math.random(), soort = BOUW_SOORTEN[0][0];
  for (const [k, w] of BOUW_SOORTEN) { if (r < w) { soort = k; break; } r -= w; }
  if (!e) soort = 'blokken';      // 40 = ▢T + 0E en 40 = 40 + ▢ lezen als een strikvraag
  const T = plaats('t', '<small>T</small>'), E = plaats('e', '<small>E</small>');
  const q = { op: 'bouw', kind: 'bouw', soort };
  if (soort === 'blokken') return { ...q, ans: n, tmpl: `${t}T ${e}E = @`,
    html: `${bouwBlokken(t, e)}<span class="pl-som">= @</span>`, fouten: [10 * e + t, 10 * t, t + e, n + 10, n - 10] };
  if (soort === 'tiental') return { ...q, ans: t, tmpl: `${n} = @T + ${e}E`,
    html: `${plaats('t', t)}${plaats('e', e)} = ${plaats('t', '@')}${T} + ${plaats('e', e)}${E}`, fouten: [e, t + 1, t - 1, t + e] };
  if (Math.random() < 0.5) return { ...q, ans: e, tmpl: `${n} = ${10 * t} + @`,
    html: `${plaats('t', t)}${plaats('e', e)} = ${plaats('t', 10 * t)} + ${plaats('e', '@')}`, fouten: [t, 10 * e, e + 1] };
  return { ...q, ans: 10 * t, tmpl: `${n} = @ + ${e}`,
    html: `${plaats('t', t)}${plaats('e', e)} = ${plaats('t', '@')} + ${plaats('e', e)}`, fouten: [t, n, 10 * t + 10, 10 * e] };
}
/* Tot 1000: hetzelfde met honderdtallen erbij -- een plaat van honderd, paars.
   Drie soorten, zoals hierboven:
     blokken   platen, staafjes en blokjes: welk getal?        = 345
     honderdtal  345 = ▢H + 4T + 5E: hoeveel honderdtallen?      3
     splits    345 = 300 + 40 + ▢ (het vakje op één van de drie)
   Een 0 in het getal (305, 340) is altijd blokken: "305 = 300 + ▢ + 5" vraagt
   naar niets. De fouten: H en E omgedraaid (543), T en E omgedraaid (354), alleen
   de cijfers opgeteld, een honderdtal of een tiental ernaast. */
function bouwPlaten(h, t, e) {
  return `<span class="pl-vis" aria-hidden="true"><span class="pl-platen">${'<i class="pl-plaat"></i>'.repeat(h)}</span>`
    + (t ? `<span class="pl-staven">${'<i class="pl-staaf"></i>'.repeat(t)}</span>` : '')
    + (e ? `<span class="pl-blokjes">${'<i class="pl-blok"></i>'.repeat(e)}</span>` : '') + '</span>';
}
function genBouwen1000() {
  const h = rnd(1, 9), t = Math.random() < 0.12 ? 0 : rnd(1, 9), e = Math.random() < 0.12 ? 0 : rnd(1, 9);
  const n = 100 * h + 10 * t + e;
  let r = Math.random(), soort = BOUW_SOORTEN[0][0];
  for (const [k, w] of BOUW_SOORTEN) { if (r < w) { soort = k; break; } r -= w; }
  if (!t || !e) soort = 'blokken';
  const getal = `${plaats('h', h)}${plaats('t', t)}${plaats('e', e)}`;
  const H = plaats('h', '<small>H</small>'), T = plaats('t', '<small>T</small>'), E = plaats('e', '<small>E</small>');
  const q = { op: 'bouw', kind: 'bouw', soort, grens: 999 };
  if (soort === 'blokken') return { ...q, ans: n, tmpl: `${h}H ${t}T ${e}E = @`,
    html: `${bouwPlaten(h, t, e)}<span class="pl-som">= @</span>`,
    fouten: [100 * e + 10 * t + h, 100 * h + 10 * e + t, h + t + e, n + 100, n - 100, n + 10] };
  if (soort === 'tiental') return { ...q, ans: h, tmpl: `${n} = @H + ${t}T + ${e}E`,
    html: `${getal} = ${plaats('h', '@')}${H} + ${plaats('t', t)}${T} + ${plaats('e', e)}${E}`, fouten: [t, e, h + 1, h - 1] };
  const delen = [['h', 100 * h], ['t', 10 * t], ['e', e]];
  const gat = rnd(0, 2);
  return { ...q, ans: delen[gat][1], tmpl: `${n} = ${delen.map(([, v], i) => i === gat ? '@' : v).join(' + ')}`,
    html: `${getal} = ${delen.map(([p, v], i) => plaats(p, i === gat ? '@' : v)).join(' + ')}`,
    fouten: [h, t, e, 10 * t, 100 * h, n - delen[gat][1]].filter(v => v !== delen[gat][1]) };
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
  // plus en min: het bereik van haar rij, zoals genTriple het rekent (zonder
  // de bijsturing op hoe het gaat -- daarom ook nooit onder wat er al staat).
  // s is vraagInst: max is het bereik van de rij, niet de grens van de ouder.
  if (q.op === '+' || q.op === '-') return Math.max(hoogste, 10, s.max);
  // getallen bouwen: een cijfer blijft onder de tien, een getal onder de honderd
  if (q.op === 'bouw') return q.ans < 10 ? 10 : q.grens || 99;
  // maal: drie keer de tafel boven het antwoord -- de keuzes zijn de buren in
  // de tafel (zie makeChoices), en die moeten er ook boven kunnen liggen
  if (q.op === 'x' && q.kind === 'classic') return q.ans + 3 * getallen[1];
  // geld, de getallenlijn en de kalender zeggen het zelf (zie hun vraagmaker)
  if (q.grens != null) return q.grens;
  // delen: tot het volgende tiental
  return Math.max(10, Math.ceil(hoogste / 10) * 10);
}
function makeChoices(q, grens) {
  if (q.keuzes) return shuffle(q.keuzes.slice());   // de vraag weet ze zelf (zie genKlok)
  const ans = q.ans;
  const getallen = (q.tmpl.match(/\d+/g) || []).map(Number);
  /* Tot 1000 rekent in hele tientallen of honderdtallen (zie genTriple): dan
     liggen de keuzes ook op die maat -- 461 naast 460 streep je weg zonder te
     rekenen. Bij getallen bouwen telt alleen het antwoord: 368 = ▢ + 60 + 8
     vraagt 300, en dan staan er 200 en 400 naast, niet 299. */
  /* DE TAFELS: de buren in de tafel. 7 × 5 had 34, 36 en 33 naast zich, en
     dan was 35 het enige getal uit de tafel van 5 -- de helft tot driekwart
     van de tafelsommen kon je zo zonder rekenen, en twee op de drie keer was
     het ook nog het grootste getal (de knoppen gingen niet boven het volgende
     tiental). Nu liggen de keuzes een, twee of drie keer de tafel ernaast
     (30, 40, 45): één keer te weinig of te veel geteld, de fout die een kind
     met de tafels echt maakt. Daarbij de buur uit de tafel ernaast (7 × 6),
     als die past. Ook een zwakke som die terugkomt (zonder q.fouten) krijgt
     dit, want het hangt alleen aan het sjabloon. */
  const tafel = q.op === 'x' && q.kind === 'classic' && getallen.length >= 2 ? getallen[1] : 0;
  const stap = tafel || (grens > 100 ? [100, 10].find(d => (q.fouten ? [] : getallen).concat(ans).every(v => v % d === 0)) || 1 : 1);
  const laagst = q.min != null ? q.min : tafel || 0;
  // q.min: geld kent geen €0 als antwoord (zie genGeld), een tafel geen 0 × 5
  const mag = (v, vrij) => Number.isInteger(v) && v >= laagst && v <= grens && v !== ans && (vrij || v % stap === 0);
  // fouten die een kind echt maakt (een vraag kan ze zelf meegeven, zie genBouwen)
  const fouten = new Set(tafel ? [getallen[0] * (tafel + 1), getallen[0] * (tafel - 1)] : q.fouten || getallen);
  if (!q.fouten && !tafel) for (let i = 0; i < getallen.length; i++)
    for (let j = i + 1; j < getallen.length; j++) {
      fouten.add(getallen[i] + getallen[j]);             // plus i.p.v. min, of er één vergeten
      fouten.add(Math.abs(getallen[i] - getallen[j]));   // min i.p.v. plus
    }
  if (!tafel && ans >= 10 && grens >= 50) { fouten.add(ans + 10 * stap); fouten.add(ans - 10 * stap); }
  // Eerst loten hoeveel keuzes er onder het antwoord liggen (0 tot 3), en pas
  // dan de echte fout kiezen, aan een kant waar nog plaats is. Andersom lag de
  // fout meestal onder het antwoord (een getal uit de som is kleiner), en was
  // het antwoord bijna nooit meer het kleinste.
  const onder = rnd(0, 3);
  const keuze = new Set([ans]);
  const fout = shuffle([...fouten].filter(v => mag(v, !!tafel) && (v < ans ? onder > 0 : onder < 3)))[0];
  if (fout != null) keuze.add(fout);
  // de rest vlak ernaast
  const ernaast = kant => shuffle([1, 2, 3].map(d => ans + kant * d * stap).filter(v => mag(v) && !keuze.has(v)))[0];
  while (keuze.size < 4) {
    const nuOnder = [...keuze].filter(v => v < ans).length;
    const kant = nuOnder < onder ? -1 : 1;
    let v = ernaast(kant);
    if (v == null) v = ernaast(-kant);
    // allebei op (een som op de rand van een kleine grens): het dichtstbijzijnde
    // getal dat nog vrij is, en pas als er echt niets meer is, voorbij de grens
    for (let d = 4 * stap; v == null && d <= grens + 1; d += stap) v = [ans - d, ans + d].find(x => mag(x) && !keuze.has(x));
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
// Hoogste toegestane fase: de lijn "tot" van de ouder (stageMax). Een oude save
// met cijfers uit stopt bij fase 5 (zie migrate: die zet daar nu "tot").
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
/* Zelf kiezen bij tellen (zie zelfGekozen): de aangevinkte fases. Elke vraag
   komt uit één ervan (telFase), en de fase schuift niet (advanceCountStage
   wordt dan overgeslagen). De trap bínnen een fase (rung) loopt wel gewoon mee:
   één trap voor alle gekozen fases, zodat het spel ook hier lichter of
   pittiger wordt. Zonder Zelf kiezen is het de fase van het leerpad. */
function kiesFasen(s) { return zelfGekozen(s) ? (s.kiesFasen || []).filter(v => v >= 1 && v <= COUNT_STAGE_MAX) : []; }
function telFase(p) { const f = kiesFasen(p.settings); return f.length ? pick(f) : countLiveStage(p); }
// de hoogste fase die ze nu speelt (memory, de trap): bij Zelf kiezen de hoogste aangevinkte
function telTopFase(p) { const f = kiesFasen(p.settings); return f.length ? Math.max(...f) : countLiveStage(p); }
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
  const stage = telFase(p);
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
    const [a, b] = somPaar(max);   // elk paar even vaak (zie somPaar)
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
    // groepjes klein & subitiseerbaar; elk paar even vaak (zie somPaar)
    if (!sub) [a, b] = somPaar(max, false, 5);
    else { const [x, y] = somPaar(Math.min(6, max)); a = x + y; b = x; }
    const c = sub ? a - b : a + b;
    q.ans = c;
    q.card = { kind: 'sum', style: 'sym', op: sub ? '-' : '+', a, b, c, emoji, repr };
    q.choices = countDistractors(c, nCh, 1, max, d.delta).map(qgroup);
    q.prompt = sub ? numWord(a) + ' min ' + numWord(b) + '. Hoeveel blijven er over?'
                   : numWord(a) + ' plus ' + numWord(b) + '. Hoeveel is dat samen?';
  } else if (type === 'sumdots' || type === 'sumwritten') {   // som met cijfers; stippen altijd (dots) of vervagend (written)
    const sub = Math.random() < 0.4;
    let a, b;
    if (!sub) [a, b] = somPaar(max);
    else { const [x, y] = somPaar(max); a = x + y; b = x; }
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
  // geen cijfers zolang de ouder "tot" onder de cijferfase (6) houdt
  const cijfers = countMaxStage(P().settings) >= 6;
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
  const top = countTopRung(telTopFase(p));
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
/* Wie krijgt de memory-knop op de kaart? Alleen een telkind, en dan alleen als
   de ouder hem niet uitzette (Oefeningen, de kaart "show"). Een rekenkind
   speelt voorlopig geen memory: bij rekenen is de show het oefenen, en een
   schakelaar minder op Oefeningen. De sommenvariant (memSomDeck)
   blijft staan; terugbrengen is deze ene regel en de schakelaar in
   OEFEN_INSTELLINGEN.math. */
function memoryAan(p) { return p.settings.track === 'count' && p.settings.memory !== false; }
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
  const stage = telTopFase(p);
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
   show, op haar rij van het leerpad. */
function memSomDeck(p) {
  const pairs = MEM_MIN_PAREN;
  const gekozen = [], antwoorden = new Set();
  const neem = (tmpl, ans) => {
    if (gekozen.length >= pairs || antwoorden.has(ans) || !/ = @$/.test(tmpl)) return;
    antwoorden.add(ans); gekozen.push({ som: tmpl.replace(/ = @$/, ''), v: ans });
  };
  const inst = vraagInst(p);
  Object.entries(p.weak || {}).filter(([tmpl, e]) => pastNog(tmpl, e, inst))
    .sort((a, b) => b[1].w - a[1].w).slice(0, 2)
    .forEach(([tmpl, e]) => neem(tmpl, e.ans));
  const lvl = WORLD_START[continueWorld(p)] || 1;
  for (let poging = 0; gekozen.length < pairs && poging < 60; poging++) {
    const q = genQuestion(inst, lvl, p.perf);
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
  // het thema van deze vraag (zie themaPlan), en zijn vraagmaker: haar rij op zijn ladder
  const k = g && g.themaPlan ? g.themaPlan[g.idx] : themasAan(p.settings)[0];
  const s = (g && g.insts && g.insts[k]) || themaInst(p, k);
  // geld komt niet uit de zwakke sommen: dat zijn sommen, en een bedrag is elke keer andere munten
  if (THEMA_ERBIJ.includes(s.thema)) return rijenVraag(s, net);
  if (Math.random() < 0.35) {
    const wq = pickWeak(p, s, mag);
    if (wq) { if (al) al.add(wq.tmpl); return wq; }
  }
  // onderhoud: af en toe een som die al geleerd is maar lang niet langskwam
  if (Math.random() < 0.12) {
    const rq = pickRefresh(p, s, mag);
    if (rq) { if (al) al.add(rq.tmpl); return rq; }
  }
  // Zelf kiezen: elke vraag uit één aangevinkte rij (zie kiesInst)
  if (s.vrij) return kiesVraag(s, lvl, p.perf, net);
  // getallen bouwen: vaak op zijn eigen rij, daarna af en toe (zie padStand)
  if (s.bouwen && Math.random() < (s.bouwen === 'vaak' ? BOUWEN_VAAK : BOUWEN_SOMS)) {
    /* De allereerste keer (het gouden "Nieuw", zie vraagIsNieuw) is het de
       tekening: staafjes en blokjes (en platen), vóór de H, T en E als letters komen. */
    const eerst = g && g.nieuwRij && PAD_IDX[g.nieuwRij] != null && LEERPAD[PAD_IDX[g.nieuwRij]].bouwen;
    let b, poging = 0;
    do { b = genBouwen(s.bouwTot); } while ((net.includes(b.tmpl) || (eerst && b.soort !== 'blokken')) && ++poging < 40);
    return b;
  }
  // een verse som, maar niet precies die van net (een paar pogingen, en dan
  // toch: bij "tot 10" met alleen plus is de pot klein)
  let q, poging = 0;
  do { q = genQuestion(s, lvl, p.perf); } while (net.includes(q.tmpl) && ++poging < 8);
  return q;
}

/* Eén vraag in Zelf kiezen: een rij uit de pot, en dan de maker die bij die rij
   hoort. De rijen gaan om de beurt (beurt, s.vrijStapel): met drie rijen
   aangevinkt en een show van acht kon er met pick() een hele show één
   ontbreken. net: de sommen van net (niet meteen dezelfde, zie buildQuestion). */
function kiesVraag(s, lvl, perf, net) {
  let q, poging = 0;
  do {
    const { id, inst } = beurt(s, 'vrijStapel', s.vrij);
    q = LEERPAD[PAD_IDX[id]] && LEERPAD[PAD_IDX[id]].bouwen ? genBouwen(LEERPAD[PAD_IDX[id]].bereik)
      : id === 'zoek' ? genMissing(inst, lvl, perf, pick(inst.ops))
      : id === 'drie' ? genChain(inst, lvl, perf)
      : genQuestion(inst, lvl, perf);
  } while (net.includes(q.tmpl) && ++poging < 8);
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
  if (!t) { t = { n: 0, acc: 0.5, paused: false, fast: 0.5 }; p.opTrack[op] = t; }
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
/* Klaar voor zoek het getal bij deze bewerking: haar rij op het leerpad heeft
   het (s.missNum, zie padStand), de bewerking speelt al (s.ops), ze beheerst hem, en ze staat er niet op pauze. s = vraagInst.
   Wanneer het komt zegt het leerpad; "nooit twee nieuwe dingen tegelijk" ook:
   zoek het getal en drie getallen zijn twee rijen, en een rij duurt tot ze hem
   kan. */
function opReady(p, op, s) {
  const t = p.opTrack[op];
  if (!s.missNum || !s.ops.includes(op) || !t || t.paused) return false;
  return opMastered(p, op);
}
// Klaar voor drie getallen (alleen optellen): haar rij heeft het, ze beheerst
// het optellen, en ze staat er niet op pauze.
function chainReady(p, s) {
  if (!s.chain3 || !s.ops.includes('+') || p.chainTrack.paused) return false;
  return opMastered(p, '+');
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
/* Voorbij de laatste rij is het "alles door elkaar", en dan voelt de ene wereld
   precies als de vorige. Dus krijgt elke wereld dan om de beurt een accent:
   een gewone, een met extra zoek-het-getal, een met extra drie getallen. Er
   komt niets nieuws bij en niets wordt moeilijker -- het zijn dezelfde vragen,
   alleen vaker die ene soort, en alleen als die soort al vrij is (opReady,
   chainReady). Zo heeft elke wereld iets eigens zonder dat de ouder iets hoeft.
   Op een rij van het leerpad is er geen accent: daar is de rij zelf het nieuwe. */
const WERELD_ACCENT = [null, 'miss', 'chain'];
function wereldAccent(lvl, nuId) {
  return nuId === 'alles' ? WERELD_ACCENT[worldFor(lvl).index % WERELD_ACCENT.length] : null;
}
// s = vraagInst (haar rij erover), accent = wereldAccent, bezet = plekken van
// een ander thema (zie themaPlan): zoek het getal en drie getallen zijn sommen
/* OP HAAR EIGEN RIJ (rijNu 'zoek' of 'drie') is die soort het nieuwe, en dan
   krijgt hij EIGEN_RIJ_PLEKKEN plekken in plaats van één: op de rij Drie
   getallen zag ze er anders twee tot vier voor de rij gehaald was, en werd ze
   beoordeeld op de gewone sommen eromheen. Daar wacht hij ook niet op
   "beheerst" (opMastered): de rij zegt al dat het tijd is. Alleen een pauze
   (het lukte echt niet) houdt hem tegen -- en dan wacht de rij, want rijVerder
   telt de vragen van de rij zelf. */
const EIGEN_RIJ_PLEKKEN = 3;
function planSpecials(p, s, total, accent, goldIdx, bezet, rijNu) {
  const missOps = s.ops.filter(o => ['+', '-', 'x'].includes(o) && opReady(p, o, s));
  const missAvail = missOps.length > 0;
  const chainAvail = chainReady(p, s);
  const twoOk = s.perLevel >= 8;   // 2 speciale vragen alleen bij lange optredens (≥8)
  const both = missAvail && chainAvail;
  const eigenOps = rijNu === 'zoek' && s.missNum ? s.ops.filter(o => (o === '+' || o === '-') && !(p.opTrack[o] && p.opTrack[o].paused)) : [];
  const eigenDrie = rijNu === 'drie' && s.chain3 && s.ops.includes('+') && !(p.chainTrack && p.chainTrack.paused);
  let types = [], eigen = false;
  if (eigenOps.length || eigenDrie) {
    eigen = true;
    types = Array(twoOk ? EIGEN_RIJ_PLEKKEN : 2).fill(eigenDrie ? 'chain' : 'miss');
  } else if (accent === 'miss' && missAvail) {
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
  const cap = Math.min(fit, eigen ? types.length : twoOk ? 2 : 1);
  if (types.length > cap) types = types.slice(0, cap);
  const vrijePlekken = Array.from({ length: total }, (_, i) => i).filter(i => i > 0 && !(bezet || []).includes(i) && i !== goldIdx);
  if (types.length > vrijePlekken.length) types = types.slice(0, vrijePlekken.length);
  const slots = pickSlots(total, types.length, (goldIdx >= 0 ? [goldIdx] : []).concat(bezet || []));
  const plan = {};
  slots.forEach((idx, i) => {
    plan[idx] = { type: types[i], op: types[i] === 'miss' ? pick(eigen ? eigenOps : missOps) : '+' };
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
  if (q.kind === 'klok') return klokHint(q, val);
  if (q.kind === 'kalender' && q.soort !== 'getal') return kalHint(q, val);
  const meer = q.ans > val;
  const net = Math.abs(q.ans - val) <= HINT_DICHTBIJ;
  const woord = meer ? 'meer' : 'minder';
  return { pijl: meer ? 'op' : 'neer',
           woorden: (net ? 'Net iets ' + woord : woord[0].toUpperCase() + woord.slice(1)) + ' dan ' + val };
}
/* Bij de klok is meer of minder: later of vroeger -- de wijzer moet verder
   draaien, of terug. Langs de kortste weg rond de wijzerplaat (11 uur en 1 uur
   liggen twee uur uit elkaar, niet tien); bij de 24 uur lezen gewoon op de
   dag, want daar is 2:20 echt vroeger dan 14:20. En wat ze tikte staat er in de
   andere vorm bij (zie toonHint): een klokje als ze woorden koos, woorden als
   ze een klokje koos -- zo ziet ze wát ze gekozen heeft. */
function klokHint(q, val) {
  const dag = q.uur24 && q.vorm === 'lees';
  const d = dag ? q.ans - val : ((q.ans - val) % 720 + 1080) % 720 - 360;
  const later = d >= 0;
  return { pijl: later ? 'later' : 'vroeger', woorden: (later ? 'Later dan ' : 'Vroeger dan ') + klokTekst(q, val) };
}
/* Bij de kalender is meer of minder: later of vroeger in de week, het jaar
   of de seizoenen -- langs de kortste weg rond (zondag en maandag liggen een
   dag uit elkaar, niet zes). Een datum in de vorm 28/10 heeft geen later of
   vroeger dat helpt (de fout is meestal dag en maand omgedraaid): daar alleen
   het 🤔. Een aantal (dagen, weken, een datum) is gewoon meer of minder. */
function kalHint(q, val) {
  const n = { dag: 7, maand: 12, seizoen: 4 }[q.soort];
  if (!n) return null;
  const d = ((q.ans - val) % n + n + Math.floor(n / 2)) % n - Math.floor(n / 2), later = d > 0;
  return { pijl: later ? 'later' : 'vroeger', woorden: (later ? 'Later dan ' : 'Vroeger dan ') + toonAntwoord(q, val) };
}
// Wat ze tikte, in de andere vorm (zie klokHint); bij getallen gewoon de keuze zelf.
function hintTeken(q, val) {
  if (q.kind !== 'klok') return toonKeuze(q, val);
  if (q.uur24) return `<span class="klok-digi">${klokDigitaal(q.vorm === 'lees' ? val : val + 720)}</span>`;
  return q.vorm === 'zoek' ? klokWoorden(val) : klokSvg(val, 46);
}
// Een dikke pijl als SVG en niet als teken: ⬆️ is op elk toestel een ander
// blauw vierkantje, en een ↑ in de letter is te dun om van een meter af te zien.
function pijlSVG(richting) {
  /* later en vroeger: een boog over de bovenkant, met de punt naar rechts
     (de wijzers mee) of naar links (terug). Een bijna hele cirkel ↻ ↺ las
     twee keer hetzelfde: het verschil zat alleen in waar het puntje stond. */
  if (richting === 'later' || richting === 'vroeger') {
    const spiegel = richting === 'vroeger' ? 'translate(24 3) scale(-1 1)' : 'translate(0 3)';
    return `<svg class="pijl-teken" viewBox="0 0 24 24" aria-hidden="true"><g transform="${spiegel}"><path d="M3.5 17 A9 9 0 0 1 17 6.2" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>`
      + '<path d="M13.2 3.6 L21.6 4.4 L18.4 12.2 Z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></g></svg>';
  }
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
  showToast(`<span class="hint-getal">${hintTeken(q, val)}</span><span class="hint-pijl ${h.pijl}" role="img" aria-label="${esc(h.woorden)}">${pijlSVG(h.pijl)}</span>`,
            null, null, 'hint');
}

