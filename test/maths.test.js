/*
 * Test-suite voor de rekenmodus.
 *
 * Drie delen:
 *   1. Sommen — klopt elke gegenereerde som (klassiek, zoek-het-getal, drie
 *      getallen) rekenkundig, blijft hij binnen de ingestelde grens, en is er
 *      precies één juist antwoord bij de keuzeknoppen?
 *   2. Weergave — staat het in-te-vullen vakje op de juiste plek en loopt de
 *      kaart niet over?
 *   3. Adaptieve motor — de stille logica die bepaalt wanneer een kind een
 *      moeilijkere vraagsoort krijgt: beheersing, pauzeren bij worstelen,
 *      herstel, en de inroostering van speciale vragen. Een fout hier merk je
 *      niet aan een crash, alleen aan een kind dat verkeerde sommen krijgt.
 *
 * Draaien:
 *   npm install
 *   npm run test:rekenen       (of: npm test voor alle suites)
 */
const { launch, cacheFonts, APP_URL } = require('./browser');

const SAMPLES = Number(process.env.SAMPLES || 60);

const fails = [];
const counts = {};
function check(ok, label, detail) {
  counts[label] = counts[label] || { pass: 0, fail: 0 };
  if (ok) counts[label].pass++;
  else { counts[label].fail++; if (fails.length < 40) fails.push(`${label}: ${detail}`); }
}

// "12 × 3 = @" → { a: 12, sym: '×', b: 3, right: '@' }
function parseSum(tmpl) {
  const m = /^(\d+) (.) (@|\d+) = (@|\d+)$/.exec(tmpl);
  if (!m) return null;
  return { a: Number(m[1]), sym: m[2], b: m[3], right: m[4] };
}
const APPLY = { '+': (a, b) => a + b, '−': (a, b) => a - b, '×': (a, b) => a * b, ':': (a, b) => a / b };

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
  await cacheFonts(page);
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) pageErrors.push('CONSOLE ' + m.text()); });

  await page.goto(APP_URL);
  await page.waitForTimeout(400);

  // Zelf een rekenprofiel maken en kiezen, zodat G bestaat. Een verse installatie
  // heeft geen sterren meer; selectProfile i.p.v. een kaartpositie maakt de test
  // bovendien onafhankelijk van de weergavevolgorde.
  await page.evaluate(() => {
    db.profiles.t1 = defaultProfile('Rekenster', 'dress_paars', {});
    db.profiles.t1.order = 0;
    const p = db.profiles.t1;
    p.settings.track = 'math';
    p.settings.mode = 'kies';
    save();
    renderProfiles();
    selectProfile('t1');
  });
  await page.waitForTimeout(200);
  await page.click('.tour-stop.next');
  await page.waitForTimeout(400);

  /* ================= 1 + 2 · Sommen en weergave ================= */
  const OPSETS = [['+'], ['+', '-'], ['x'], [':'], ['+', '-', 'x', ':']];
  for (const ops of OPSETS) {
    for (const max of [10, 20, 100]) {
      for (const lvl of [1, 6, 12]) {
        const rows = await page.evaluate(({ ops, max, lvl, samples }) => {
          const p = P();
          const s = p.settings;
          s.ops = ops.slice(); s.max = max; s.tables = [2, 5, 10]; s.mode = 'kies';
          s.missNum = true; s.chain3 = true;
          const out = [];
          const push = (q, extra) => {
            // echt renderen: vakje + overloop controleren
            G.qs[G.idx] = q; G.count = false; G.mode = 'kies';
            drawQuestion();
            const area = document.getElementById('answer-area');
            renderQuestion.length;                       // (renderQuestion zou opnieuw genereren)
            const choices = makeChoices(q, keuzeGrens(q, s, lvl));
            const card = document.getElementById('question-text');
            out.push(Object.assign({
              tmpl: q.tmpl, ans: q.ans, op: q.op, kind: q.kind,
              blanks: card.querySelectorAll('.q-blank').length,
              overflow: card.scrollWidth > card.clientWidth + 1,
              choices, grens: keuzeGrens(q, s, lvl),
            }, extra || {}));
          };
          for (let i = 0; i < samples; i++) {
            push(genQuestion(s, lvl, p.perf));
            for (const op of ops.filter(o => ['+', '-', 'x'].includes(o))) push(genMissing(s, lvl, p.perf, op));
            push(genChain(s, lvl, p.perf));
          }
          return out;
        }, { ops, max, lvl, samples: SAMPLES });

        for (const r of rows) {
          const where = `${ops.join('')} max${max} lvl${lvl} ${r.kind} "${r.tmpl}"`;

          /* --- klopt de som rekenkundig? --- */
          if (r.kind === 'chain') {
            const m = /^(\d+) \+ (\d+) \+ (\d+) = @$/.exec(r.tmpl);
            check(!!m, 'drie-getallen heeft de juiste vorm', where);
            if (m) check(Number(m[1]) + Number(m[2]) + Number(m[3]) === r.ans, 'drie getallen tellen op tot het antwoord', where);
          } else {
            const s = parseSum(r.tmpl);
            check(!!s, 'som heeft een leesbare vorm', where);
            if (s) {
              const fn = APPLY[s.sym];
              check(!!fn, 'som gebruikt een bekend rekenteken', where);
              if (fn) {
                if (r.kind === 'missing') {
                  // "a ? = c" → het antwoord ingevuld moet c geven
                  check(s.b === '@' && s.right !== '@', 'zoek-het-getal mist het tweede getal', where);
                  check(fn(s.a, r.ans) === Number(s.right), 'ingevuld antwoord maakt de som kloppend', where);
                } else {
                  check(s.right === '@', 'klassieke som vraagt om de uitkomst', where);
                  check(fn(s.a, Number(s.b)) === r.ans, 'uitkomst klopt met de som', where);
                }
              }
            }
          }

          /* --- blijft alles binnen kindvriendelijke grenzen? --- */
          check(Number.isInteger(r.ans), 'antwoord is een heel getal', `${where} ans=${r.ans}`);
          check(r.ans >= 0, 'antwoord is nooit negatief', `${where} ans=${r.ans}`);
          if (r.op === '-') check(r.ans >= 1, 'aftrekken levert nooit 0 of minder op', `${where} ans=${r.ans}`);
          const s2 = parseSum(r.tmpl);
          if (s2 && r.op === ':') {
            check(Number(s2.b) !== 0, 'nooit delen door nul', where);
            if (s2.b !== '@') check(s2.a % Number(s2.b) === 0, 'delen gaat altijd precies op', where);
          }
          if (r.kind !== 'chain') {
            const nums = [r.ans, ...(s2 ? [s2.a, s2.b, s2.right].filter(v => v !== '@').map(Number) : [])];
            // "tot" is de grens van plus en min; een tafel loopt altijd tot × 10
            const grens = (r.op === 'x' || r.op === ':') ? 100 : max;
            check(nums.every(v => v <= grens), 'getallen blijven binnen de ingestelde grens', `${where} max=${grens} zag ${nums}`);
            if (s2 && (r.op === 'x' || r.op === ':')) {
              const factor = r.op === 'x' ? (s2.a === '@' ? r.ans : Number(s2.a)) : (s2.right === '@' ? r.ans : Number(s2.right));
              check(factor >= 1 && factor <= 10, 'een tafel loopt van × 1 tot × 10', `${where} zag ${r.tmpl}`);
            }
          }

          /* --- antwoordknoppen --- */
          check(r.choices.filter(v => v === r.ans).length === 1, 'juist antwoord staat precies één keer bij de keuzes', `${where} keuzes=${r.choices}`);
          check(new Set(r.choices).size === r.choices.length, 'geen dubbele antwoordknoppen', `${where} keuzes=${r.choices}`);
          check(r.choices.every(v => v >= 0), 'geen negatieve antwoordknoppen', `${where} keuzes=${r.choices}`);
          check(r.choices.length === 4, 'altijd vier antwoordknoppen', `${where} keuzes=${r.choices}`);
          check(r.choices.every(v => v <= Math.max(r.grens, r.ans)), 'geen knop boven de grens van de som (geen 17 bij sommen tot tien)', `${where} grens=${r.grens} keuzes=${r.choices}`);

          /* --- weergave --- */
          check(r.blanks === 1, 'precies één in-te-vullen vakje op de kaart', `${where} zag ${r.blanks}`);
          check(!r.overflow, 'somkaart loopt niet over de rand', where);
        }
      }
    }
  }

  /* ================= 3 · Adaptieve motor (pure logica) ================= */
  const engine = await page.evaluate(() => {
    const out = {};
    // Vers testprofiel, los van het spel.
    const fresh = () => {
      const p = JSON.parse(JSON.stringify(defaultProfile('Test', 'dress_roze')));
      p.settings.ops = ['+', '-']; p.settings.max = 20; p.settings.missNum = true; p.settings.chain3 = true;
      p.settings.perLevel = 8;
      return p;
    };
    // vlot antwoordend kind (vlotheid zelf wordt apart getest, zie deel 4b)
    const drill = (p, op, n, correct) => { for (let i = 0; i < n; i++) updateOpAcc(p, op, correct, correct, true); };

    // -- beheersing: pas na genoeg pogingen én hoge nauwkeurigheid
    let p = fresh();
    drill(p, '+', 10, true);
    out.masteredTooFew = opMastered(p, '+');            // verwacht false (n < 20)
    drill(p, '+', 15, true);
    out.masteredEnough = opMastered(p, '+');            // verwacht true
    // -- een hardnekkig gemiste som blokkeert beheersing
    p.weak['7 + 8 = @'] = { ans: 15, op: '+', w: 5 };
    out.masteredWithHeavyWeak = opMastered(p, '+');     // verwacht false
    delete p.weak['7 + 8 = @'];

    // -- klaar voor zoek-het-getal: niet vóór haar rij op het leerpad, wel vanaf daar
    const opRij = rij => ({ ...p.settings, ...padStand(p.settings, rij) });
    out.readyStap3 = opReady(p, '+', opRij('brug20'));  // verwacht false
    out.readyStap4 = opReady(p, '+', opRij('zoek'));    // verwacht true

    // -- worstelen pauzeert, en herstel vraagt méér dan één goed antwoord (hysterese)
    drill(p, '+', 6, false);
    out.pausedAfterMisses = ot(p, '+').paused;          // verwacht true
    out.readyWhilePaused = opReady(p, '+', opRij('zoek'));   // verwacht false
    drill(p, '+', 1, true);
    out.stillPausedAfterOneGood = ot(p, '+').paused;    // verwacht true (nog onder 0.85)
    drill(p, '+', 10, true);
    out.recovered = !ot(p, '+').paused;                 // verwacht true

    // -- drie getallen: pas op zijn eigen rij, ná zoek het getal -- nooit twee nieuwe dingen tegelijk
    p = fresh();
    drill(p, '+', 25, true);
    const rij = r => ({ ...p.settings, ...padStand(p.settings, r) });
    out.chainStap4 = chainReady(p, rij('zoek'));        // verwacht false (te vroeg)
    out.chainStap5 = chainReady(p, rij('drie'));        // verwacht true: de rij erna
    // en zonder beheersing ook op zijn rij niet
    const laat = fresh();
    drill(laat, '+', 5, true);
    out.chainZelfdeWereld = chainReady(laat, { ...laat.settings, ...padStand(laat.settings, 'drie') });   // verwacht false
    drill(laat, '+', 20, true);
    out.chainWereldErna = chainReady(laat, { ...laat.settings, ...padStand(laat.settings, 'drie') });     // verwacht true

    // -- zwakke sommen: zwaarder bij fout, lichter bij goed, verdwijnen bij 0
    p = fresh();
    const q = { kind: 'classic', tmpl: '9 + 6 = @', ans: 15, op: '+' };
    incWeak(p, q); incWeak(p, q); incWeak(p, q); incWeak(p, q);
    out.weakCapped = p.weak[q.tmpl].w;                  // verwacht 6 (gemaximeerd)
    for (let i = 0; i < 10; i++) decWeak(p, q);
    out.weakCleared = p.weak[q.tmpl] === undefined;     // verwacht true

    // -- inroostering: nooit als eerste vraag, nooit op de gouden vraag, nooit naast elkaar
    p = fresh();
    drill(p, '+', 25, true); drill(p, '-', 25, true);
    p.chainTrack.rung = 2; p.missRamp.rung = 2;
    const alles = { ...p.settings, ...padStand(p.settings, 'alles') };
    const plans = [];
    for (let i = 0; i < 300; i++) plans.push(planSpecials(p, alles, 8, null, 3));
    out.planFirstSlot = plans.some(pl => pl['0']);      // verwacht false
    out.planOnGold = plans.some(pl => pl['3']);         // verwacht false
    out.planAdjacent = plans.some(pl => {
      const k = Object.keys(pl).map(Number).sort((a, b) => a - b);
      return k.some((v, i) => i > 0 && v - k[i - 1] <= 1);
    });                                                 // verwacht false
    out.planMax = Math.max(...plans.map(pl => Object.keys(pl).length));  // verwacht ≤ 2
    // korte optredens (< 8 vragen) krijgen hoogstens één speciale vraag
    p.settings.perLevel = 5;
    const shortPlans = [];
    alles.perLevel = 5;
    for (let i = 0; i < 200; i++) shortPlans.push(planSpecials(p, alles, 5, null, 2));
    out.shortPlanMax = Math.max(...shortPlans.map(pl => Object.keys(pl).length));  // verwacht ≤ 1
    return out;
  });

  const e = engine;
  check(e.masteredTooFew === false, 'beheersing vraagt genoeg pogingen', `n=10 gaf ${e.masteredTooFew}`);
  check(e.masteredEnough === true, 'beheersing wordt herkend na genoeg goede pogingen', String(e.masteredEnough));
  check(e.masteredWithHeavyWeak === false, 'een hardnekkig gemiste som blokkeert beheersing', String(e.masteredWithHeavyWeak));
  check(e.readyStap3 === false, 'zoek-het-getal komt niet vóór zijn rij op het leerpad', String(e.readyStap3));
  check(e.readyStap4 === true, 'zoek-het-getal komt vrij zodra het kind er klaar voor is', String(e.readyStap4));
  check(e.pausedAfterMisses === true, 'worstelen zet de vraagsoort op pauze', String(e.pausedAfterMisses));
  check(e.readyWhilePaused === false, 'op pauze komt de vraagsoort niet terug', String(e.readyWhilePaused));
  check(e.stillPausedAfterOneGood === true, 'herstel vraagt meer dan één goed antwoord (hysterese)', String(e.stillPausedAfterOneGood));
  check(e.recovered === true, 'na consequent goed spelen komt de vraagsoort terug', String(e.recovered));
  check(e.chainStap4 === false, 'drie getallen komt niet op de rij van zoek-het-getal', `zoek=${e.chainStap4}`);
  check(e.chainStap5 === true, 'drie getallen komt vrij op zijn eigen rij', `drie=${e.chainStap5}`);
  check(e.chainZelfdeWereld === false && e.chainWereldErna === true,
    'ook op zijn rij pas als het optellen beheerst is', `te vroeg=${e.chainZelfdeWereld} daarna=${e.chainWereldErna}`);

  /* ================= 3b · Het leerpad: elke rij speelt wat hij zegt =================
     Zie "Het leerpad" in de app. Hier in de echte pagina: wat de vraagmaker op
     de eerste drie rijen bij "tot 20" maakt (kern zaak ZF doet het voor alle
     instellingen). */
  const stap = await page.evaluate(() => {
    const s = { ops: ['+', '-'], max: 20, tables: [2, 5, 10], missNum: true, chain3: true };
    const N = 400;
    const trek = rij => { const r = []; for (let i = 0; i < N; i++) r.push(genTriple({ ...s, ...padStand(s, rij) }, 1, 0.5, pick(['+', '-']))); return r; };
    const over = t => overTiental(t.a, t.b, t.c, t.op);
    const groot = t => Math.max(t.a, t.b, t.c);
    const w1 = trek('tot10'), w2 = trek('tot20'), w3 = trek('brug20');
    return {
      w1Max: Math.max(...w1.map(groot)),
      w2Groot: w2.filter(t => groot(t) > 10).length,
      w2Over: w2.filter(over).length,
      w3Over: w3.filter(over).length,
      tiental: [[8, 5, 13, '+'], [7, 3, 10, '+'], [15, 5, 20, '+'], [13, 6, 7, '-'], [10, 3, 7, '-'], [20, 3, 17, '-'], [27, 5, 32, '+']]
        .map(([a, b, c, op]) => overTiental(a, b, c, op)).join(','),
      N,
    };
  });
  check(stap.w1Max <= 10, 'Tot 10 blijft bij "tot 20" onder de tien', String(stap.w1Max));
  check(stap.w2Groot > stap.N / 4, 'Tot 20 gaat tot het plafond', `${stap.w2Groot}/${stap.N}`);
  check(stap.w2Over === 0, 'Tot 20 gaat nooit over het tiental', `${stap.w2Over}/${stap.N}`);
  check(stap.w3Over > stap.N * 0.4, 'Over het tiental gaat vaak over het tiental', `${stap.w3Over}/${stap.N}`);
  check(stap.tiental === 'true,false,false,true,false,false,true',
    'over het tiental: 8+5 en 13−6 wel, 7+3, 15+5, 10−3 en 20−3 niet (ze landen óp een tiental)', stap.tiental);
  check(e.weakCapped === 6, 'zwakke som wordt niet zwaarder dan het maximum', String(e.weakCapped));
  check(e.weakCleared === true, 'een geoefende som verdwijnt uit de zwakke lijst', String(e.weakCleared));
  check(e.planFirstSlot === false, 'speciale vraag komt nooit als eerste', String(e.planFirstSlot));
  check(e.planOnGold === false, 'speciale vraag valt nooit samen met de gouden vraag', String(e.planOnGold));
  check(e.planAdjacent === false, 'speciale vragen staan nooit naast elkaar', String(e.planAdjacent));
  check(e.planMax <= 2, 'hoogstens twee speciale vragen per optreden', String(e.planMax));
  check(e.shortPlanMax <= 1, 'korte optredens krijgen hoogstens één speciale vraag', String(e.shortPlanMax));

  /* ================= 4 · Spelverloop ================= */
  const flow = await page.evaluate(async () => {
    const out = {};
    const p = P();
    p.settings.ops = ['+']; p.settings.max = 20; p.settings.mode = 'kies';
    startLevel(1);
    await new Promise(r => setTimeout(r, 250));
    const before = p.diamonds;
    let q = G.qs[G.idx];
    // goed antwoord
    const good = [...document.querySelectorAll('.choice-btn')].find(b => Number(b.dataset.v) === q.ans);
    good.click();
    await new Promise(r => setTimeout(r, 200));
    out.tileMarkedGood = good.classList.contains('good');
    out.diamondsUp = P().diamonds > before;
    await new Promise(r => setTimeout(r, 1200));
    // een eerste fout antwoord maakt de vraag nog niet gemist
    q = G.qs[G.idx];
    const missedBefore = G.errors;
    const bad = [...document.querySelectorAll('.choice-btn')].find(b => Number(b.dataset.v) !== q.ans);
    bad.click();
    await new Promise(r => setTimeout(r, 250));
    out.retryOffered = G.retried === true;              // eerste misser = nog eens proberen
    out.notMissedOnFirstMiss = G.errors === missedBefore && G.uitslag[G.idx] === undefined;
    // de tweede wél: en dan is zijn vakje meteen een lege ring, niet pas bij de volgende vraag
    const idxMis = G.idx;
    const bad2 = [...document.querySelectorAll('.choice-btn:not(:disabled)')].find(b => Number(b.dataset.v) !== q.ans);
    bad2.click();
    await new Promise(r => setTimeout(r, 100));
    out.segMisNow = document.querySelectorAll('#qprogress > span')[idxMis].classList.contains('mis');
    out.geenHartjes = !document.getElementById('notes-left');
    hideToast();
    // gouden vraag telt drievoudig
    const p2 = P();
    const dia = p2.diamonds;
    G.qs[G.idx] = { tmpl: '2 + 3 = @', ans: 5, op: '+', kind: 'classic', gold: true };
    G.retried = false; G.lock = false;
    drawQuestion();
    out.goldBanner = document.getElementById('gold-banner').textContent.trim();
    submitAnswer(5, null);
    out.goldGain = P().diamonds - dia;                  // 2 basis × 3 = 6 (of meer met streak)
    return out;
  });
  check(flow.tileMarkedGood === true, 'juiste antwoordknop wordt groen', String(flow.tileMarkedGood));
  check(flow.diamondsUp === true, 'een goed antwoord levert diamanten op', String(flow.diamondsUp));
  check(flow.retryOffered === true, 'eerste misser geeft een herkansing', String(flow.retryOffered));
  check(flow.notMissedOnFirstMiss === true, 'eerste misser maakt de vraag nog niet gemist', String(flow.notMissedOnFirstMiss));
  check(flow.segMisNow === true, 'tweede misser: het vakje wordt meteen een lege ring', String(flow.segMisNow));
  check(flow.geenHartjes === true, 'de show heeft geen hartjes meer: de balk is de enige meter', String(flow.geenHartjes));
  check(flow.goldBanner === '🌟 3× 💎 🌟', 'gouden vraag toont het lees-vrije signaal', flow.goldBanner);
  check(flow.goldGain >= 6, 'gouden vraag levert drie keer zoveel op', String(flow.goldGain));

  /* ========== 4a · Geen hartjes: de show speelt uit, het eind telt ==========
     In een eigen venster: een show uitspelen schrijft sterren weg, en de rest
     van deze suite rekent op het profiel zoals het was. Liggend op telefoonmaat,
     voor het cijferblok hieronder. */
  const los = await browser.newContext({ viewport: { width: 844, height: 390 } });
  await cacheFonts(los);
  const p4 = await los.newPage();
  p4.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
  await p4.goto(APP_URL + '&demo&star=p1');
  await p4.waitForFunction(() => typeof startLevel === 'function');
  const uitspelen = await p4.evaluate(async () => {
    const out = {};
    const p = P();
    p.settings.ops = ['+']; p.settings.max = 20; p.settings.mode = 'kies';
    startLevel(1);
    await new Promise(r => setTimeout(r, 250));
    // drie gemiste vragen: vroeger stopte de show hier
    G.errors = MIS_GRENS; G.idx = 2;
    nextStep();
    out.speeltDoor = !!G && G.idx === 3 && document.getElementById('screen-game').classList.contains('active');
    // en aan het eind: Bijna!
    G.idx = G.total - 1;
    nextStep();
    await new Promise(r => setTimeout(r, 50));
    out.bijna = document.getElementById('end-title').textContent;
    // twee gemist is nog gewoon gehaald
    startLevel(1);
    await new Promise(r => setTimeout(r, 250));
    G.errors = MIS_GRENS - 1; G.misses = MIS_GRENS - 1; G.idx = G.total - 1;
    nextStep();
    await new Promise(r => setTimeout(r, 50));
    out.gehaald = document.getElementById('end-title').textContent;
    return out;
  });
  check(uitspelen.speeltDoor === true, 'drie gemiste vragen: de show speelt gewoon door', String(uitspelen.speeltDoor));
  check(/Bijna/.test(uitspelen.bijna), 'drie of meer gemist: aan het eind "Bijna!"', uitspelen.bijna);
  check(!/Bijna/.test(uitspelen.gehaald), 'twee gemist: de show is gehaald', uitspelen.gehaald);

  /* ========== 4a' · Het cijferblok ========== */
  const blok = await p4.evaluate(async () => {
    const out = {};
    const p = P();
    p.settings.ops = ['+']; p.settings.max = 20; p.settings.mode = 'typ';
    startLevel(1);
    await new Promise(r => setTimeout(r, 250));
    const vak = () => document.querySelector('#question-text .q-blank').textContent;
    const pad = document.querySelector('.numpad');
    out.leegVraagteken = vak() === '?';
    out.slaaptLeeg = !pad.classList.contains('heeft');
    numpadPress('ok');                              // leeg: ✔ doet niets
    out.okLeegNiets = !G.lock && G.input === '';
    numpadPress('1');
    out.eenCijfer = vak() === '1' && pad.classList.contains('heeft');
    numpadPress('del');
    out.terugLeeg = vak() === '?' && !pad.classList.contains('heeft');
    // liggend: ⌫ 0 ✔ vielen hier onder het scherm
    const ok = document.querySelector('.num-btn.ok').getBoundingClientRect();
    out.okInBeeld = ok.bottom <= innerHeight;
    return out;
  });
  await los.close();
  check(blok.leegVraagteken === true, 'typmodus begint met hetzelfde ?-vakje als kiezen', String(blok.leegVraagteken));
  check(blok.slaaptLeeg === true, '⌫ en ✔ slapen zolang er niets getypt is', String(blok.slaaptLeeg));
  check(blok.okLeegNiets === true, '✔ zonder cijfer doet niets', String(blok.okLeegNiets));
  check(blok.eenCijfer === true, 'een getikt cijfer staat in het vakje en maakt ⌫ en ✔ wakker', String(blok.eenCijfer));
  check(blok.terugLeeg === true, 'alles gewist: weer het ?-vakje', String(blok.terugLeeg));
  check(blok.okInBeeld === true, 'telefoon liggend: het hele cijferblok staat in beeld', String(blok.okInBeeld));

  /* ========== 4b · Vlotheid: accuraat is niet genoeg voor moeilijkere stof ========== */
  const fluency = await page.evaluate(() => {
    const out = {};
    const fresh = () => {
      const p = JSON.parse(JSON.stringify(defaultProfile('Test', 'dress_roze')));
      p.settings.ops = ['+', '-']; p.settings.max = 20;
      return p;
    };
    // n goede antwoorden, met of zonder vlotheid
    const drill = (p, op, n, fast) => { for (let i = 0; i < n; i++) updateOpAcc(p, op, true, true, fast); };

    // -- vlot kind: stroomt gewoon door
    let p = fresh();
    drill(p, '+', 25, true);
    out.fastMastered = opMastered(p, '+');
    out.fastValue = Math.round(ot(p, '+').fast * 100);

    // -- accuraat maar traag: even goed, maar (nog) niet door de poort
    p = fresh();
    drill(p, '+', 25, false);
    out.slowAcc = Math.round(ot(p, '+').acc * 100);        // even hoog als het vlotte kind
    out.slowMastered = opMastered(p, '+');                 // verwacht false
    out.slowFast = Math.round(ot(p, '+').fast * 100);

    // -- maar nooit permanent geblokkeerd: geduld-overrule
    drill(p, '+', PATIENCE_N, false);
    out.slowEventually = opMastered(p, '+');               // verwacht true
    out.patienceN = PATIENCE_N;

    // -- traag kind dat vlotter wordt, komt er ook zonder geduld-overrule
    p = fresh();
    drill(p, '+', 22, false);
    const beforeFast = ot(p, '+').fast;
    drill(p, '+', 12, true);
    out.improves = ot(p, '+').fast > beforeFast && opMastered(p, '+') && ot(p, '+').n < PATIENCE_N;

    // -- vlotheid meet alleen directe treffers (een fout antwoord zegt niets over tempo)
    p = fresh();
    drill(p, '+', 20, true);
    const f0 = ot(p, '+').fast;
    updateOpAcc(p, '+', false, false, false);
    out.wrongDoesNotTouchFluency = ot(p, '+').fast === f0;

    // -- typen mag niet als traag gelden: ruimere drempel
    out.typGetsMoreTime = FAST_SPOT_TYP < FAST_SPOT_KIES;
    out.kiesFast = fastEnough('kies', FAST_SPOT_KIES);
    out.kiesSlow = !fastEnough('kies', FAST_SPOT_KIES - 1);
    out.typStillFast = fastEnough('typ', FAST_SPOT_KIES - 1);   // zelfde tempo, typend = nog vlot

    // -- bestaande spelers zonder 'fast' beginnen neutraal, niet geblokkeerd
    p = fresh();
    p.opTrack['+'] = { n: 30, acc: 0.95, paused: false, unlockRound: null };  // oude vorm
    out.legacyNeutral = ot(p, '+').fast === 0.5;
    return out;
  });
  check(fluency.fastMastered === true, 'een vlot kind stroomt gewoon door', String(fluency.fastMastered));
  check(fluency.slowAcc >= 85, 'traag kind is even accuraat', `${fluency.slowAcc}%`);
  check(fluency.slowMastered === false, 'accuraat maar traag geeft nog geen moeilijkere stof', String(fluency.slowMastered));
  check(fluency.slowFast < 55, 'vlotheid zakt bij steeds uitrekenen', `${fluency.slowFast}%`);
  check(fluency.slowEventually === true, 'geduld-overrule: traag kind wordt nooit permanent geblokkeerd', String(fluency.slowEventually));
  check(fluency.improves === true, 'vlotter worden opent de poort ook zonder geduld-overrule', String(fluency.improves));
  check(fluency.wrongDoesNotTouchFluency === true, 'een fout antwoord telt niet mee voor vlotheid', String(fluency.wrongDoesNotTouchFluency));
  check(fluency.typGetsMoreTime === true, 'typen krijgt meer tijd dan kiezen', String(fluency.typGetsMoreTime));
  check(fluency.kiesFast && fluency.kiesSlow, 'de vlotheidsdrempel bij kiezen werkt', `${fluency.kiesFast}/${fluency.kiesSlow}`);
  check(fluency.typStillFast === true, 'typend kind wordt niet als traag bestempeld', String(fluency.typStillFast));
  check(fluency.legacyNeutral === true, 'bestaande spelers beginnen neutraal', String(fluency.legacyNeutral));

  /* ================= 5 · Onderhoud (blijft geleerde stof zitten?) ================= */
  const retention = await page.evaluate(() => {
    const out = {};
    const fresh = () => {
      const p = JSON.parse(JSON.stringify(defaultProfile('Test', 'dress_roze')));
      p.settings.ops = ['+', '-']; p.settings.max = 20;
      return p;
    };
    const q = { kind: 'classic', tmpl: '9 + 6 = @', ans: 15, op: '+' };

    // -- een geoefende som verdwijnt niet, maar gaat in onderhoud
    let p = fresh();
    incWeak(p, q);                       // w = 2
    decWeak(p, q); decWeak(p, q);        // w = 0 -> geleerd
    // defensief lezen: bij een kapotte implementatie moet dit falen, niet crashen
    const L = () => (p.learned && p.learned[q.tmpl]) || null;
    out.goneFromWeak = p.weak[q.tmpl] === undefined;
    out.inLearned = !!L();
    out.firstInterval = L() ? L().iv : 0;

    // -- hij komt pas terug als hij aan de beurt is, niet meteen
    out.notDueYet = pickRefresh(p, p.settings) === null;
    p.stats.correct = L() ? L().due : 0;         // klok vooruit
    const due = pickRefresh(p, p.settings);
    out.dueReturns = !!due && due.tmpl === q.tmpl;
    out.markedAsRefresh = !!due && due.refresh === true;
    out.keepsAnswer = !!due && due.ans === 15;

    // -- goed onthouden: het duurt daarna langer voor hij terugkomt
    const ivBefore = L() ? L().iv : 0;
    bumpLearned(p, q);
    out.intervalGrew = !!L() && L().iv > ivBefore;
    out.notDueAfterBump = pickRefresh(p, p.settings) === null;

    // -- toch fout: terug naar de zwakke sommen
    demoteLearned(p, q); incWeak(p, q);
    out.demoted = p.learned[q.tmpl] === undefined && !!p.weak[q.tmpl];

    // -- respecteert de ouderinstellingen (bewerking uit / grens verlaagd)
    p = fresh();
    p.learned['7 × 8 = @'] = { ans: 56, op: 'x', iv: 18, due: 0 };
    p.learned['30 + 40 = @'] = { ans: 70, op: '+', iv: 18, due: 0 };
    p.stats.correct = 999;
    out.skipsDisabledOp = pickRefresh(p, p.settings) === null || pickRefresh(p, p.settings).op !== 'x';
    out.skipsAboveMax = (() => { const r = pickRefresh(p, p.settings); return !r || r.ans <= p.settings.max; })();

    // -- de lijst blijft begrensd
    p = fresh();
    for (let i = 0; i < LEARN_MAX + 40; i++) toLearned(p, `s${i}`, { ans: 1, op: '+' });
    out.capped = Object.keys(p.learned).length <= LEARN_MAX;

    // -- onderhoud komt ook echt langs in het spel
    p = fresh();
    p.stats.correct = 999;
    for (let i = 1; i <= 9; i++) p.learned[`${i} + ${i} = @`] = { ans: i * 2, op: '+', iv: 18, due: 0 };
    let seen = 0;
    for (let i = 0; i < 400; i++) if (buildQuestion(p, 3).refresh) seen++;
    out.appearsInPlay = seen > 0;
    out.notTooOften = seen < 400 * 0.35;   // blijft een bijrol naast verse sommen
    return out;
  });
  check(retention.goneFromWeak === true, 'geoefende som verlaat de zwakke lijst', String(retention.goneFromWeak));
  check(retention.inLearned === true, 'geoefende som wordt niet vergeten maar onderhouden', String(retention.inLearned));
  check(retention.firstInterval > 0, 'onderhoud start met een echt interval', String(retention.firstInterval));
  check(retention.notDueYet === true, 'een net geleerde som komt niet meteen terug', String(retention.notDueYet));
  check(retention.dueReturns === true, 'een som die lang niet langskwam komt terug', String(retention.dueReturns));
  check(retention.markedAsRefresh === true, 'onderhoudsvraag is herkenbaar voor het spel', String(retention.markedAsRefresh));
  check(retention.keepsAnswer === true, 'onderhoudsvraag houdt het juiste antwoord', String(retention.keepsAnswer));
  check(retention.intervalGrew === true, 'goed onthouden verlengt het interval', String(retention.intervalGrew));
  check(retention.notDueAfterBump === true, 'na een goede beurt komt de som niet direct opnieuw', String(retention.notDueAfterBump));
  check(retention.demoted === true, 'weer fout = terug naar de zwakke sommen', String(retention.demoted));
  check(retention.skipsDisabledOp === true, 'onderhoud slaat uitgezette bewerkingen over', String(retention.skipsDisabledOp));
  check(retention.skipsAboveMax === true, 'onderhoud blijft binnen de ingestelde grens', String(retention.skipsAboveMax));
  check(retention.capped === true, 'de onderhoudslijst blijft begrensd', String(retention.capped));
  check(retention.appearsInPlay === true, 'onderhoudsvragen komen tijdens het spelen langs', String(retention.appearsInPlay));
  check(retention.notTooOften === true, 'onderhoud blijft een bijrol naast verse sommen', String(retention.notTooOften));

  /* ---- opslag mag stukgaan zonder het spel te breken (privémodus, volle opslag) ---- */
  const storage = await page.evaluate(async () => {
    const out = {};
    const real = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => { throw new DOMException('QuotaExceededError'); };
    try {
      startLevel(1);
      await new Promise(r => setTimeout(r, 250));
      const q = G.qs[G.idx];
      const before = P().diamonds;
      const btn = [...document.querySelectorAll('.choice-btn')].find(b => Number(b.dataset.v) === q.ans);
      btn.click();                                  // save() gooit hierbinnen
      await new Promise(r => setTimeout(r, 300));
      out.survived = true;
      out.rewarded = P().diamonds > before;         // de beurt is gewoon afgemaakt
      await new Promise(r => setTimeout(r, 1300));
      out.advanced = G.idx > 0;                     // en het spel gaat verder
    } catch (e) {
      out.survived = false; out.error = String(e);
    } finally {
      localStorage.setItem = real;
    }
    return out;
  });
  check(storage.survived === true, 'een mislukte opslag laat de beurt niet crashen', storage.error || '');
  check(storage.rewarded === true, 'beloning wordt nog steeds gegeven als opslag faalt', String(storage.rewarded));
  check(storage.advanced === true, 'het spel gaat verder als opslag faalt', String(storage.advanced));

  /* ---- de som valt dicht (zie "= De som valt dicht" in de app) ----
     Een goed antwoord landt in het vakje; na een tweede misser gaat de som óók
     dicht, maar rustig; en er blijft niets rondvliegen als de volgende som komt. */
  const dicht = await page.evaluate(async () => {
    const wacht = ms => new Promise(r => setTimeout(r, ms));
    const vak = () => document.querySelector('#question-text .q-blank');
    const knop = v => [...document.querySelectorAll('.choice-btn')].find(b => Number(b.dataset.v) === v);
    const out = {};
    P().settings.mode = 'kies';
    startLevel(1);
    await wacht(400);
    let q = G.qs[G.idx];
    out.voor = vak().textContent;
    knop(q.ans).click();
    await wacht(80);
    out.onderweg = document.querySelectorAll('.som-vlucht').length;
    await wacht(420);
    out.goed = { tekst: vak().textContent, ans: String(q.ans), klas: vak().className, vlucht: document.querySelectorAll('.som-vlucht').length };
    await wacht(800);                                     // de volgende som is er
    out.volgende = { tekst: vak().textContent, vlucht: document.querySelectorAll('.som-vlucht').length };
    q = G.qs[G.idx];
    const fout = [...document.querySelectorAll('.choice-btn')].map(b => Number(b.dataset.v)).filter(v => v !== q.ans);
    knop(fout[0]).click();
    await wacht(500);
    knop(fout[1]).click();
    await wacht(700);                                     // het 👉 komt pas na de onthulling (VERDER_NA)
    out.mis = { tekst: vak().textContent, ans: String(q.ans), klas: vak().className,
                toast: document.querySelector('#toast .toast-main').textContent,
                woorden: !!document.querySelector('#toast .toast-sub') };
    hideToast();
    return out;
  });
  check(dicht.voor === '?', 'de som begint met een vraagteken', JSON.stringify(dicht));
  check(dicht.onderweg === 1, 'een goed antwoord vliegt naar het vakje', JSON.stringify(dicht));
  check(dicht.goed.tekst === dicht.goed.ans && /\bdone\b/.test(dicht.goed.klas) && /\bklikt\b/.test(dicht.goed.klas) && dicht.goed.vlucht === 0,
    'en landt erin: de som staat er dicht', JSON.stringify(dicht.goed));
  check(dicht.volgende.tekst === '?' && dicht.volgende.vlucht === 0,
    'de volgende som begint weer open, zonder iets dat nog rondvliegt', JSON.stringify(dicht.volgende));
  check(dicht.mis.tekst === dicht.mis.ans && /\brustig\b/.test(dicht.mis.klas) && !/\bklikt\b/.test(dicht.mis.klas),
    'na een tweede misser gaat de som rustig dicht', JSON.stringify(dicht.mis));
  check(dicht.mis.toast === '👉' && !dicht.mis.woorden,
    'en de kaart zegt alleen nog hoe je verder komt, zonder een zin te lezen', JSON.stringify(dicht.mis));

  /* en zonder schok: "?" is smaller dan "16", en de som staat gecentreerd. Sprong
     het vakje in één keer naar zijn nieuwe breedte, dan schoot de hele som bijna
     11 pixels opzij op het moment dat het getal landde. Nu glijdt hij mee, en
     landt de kopie precies op het vakje. */
  const glad = await page.evaluate(async () => {
    G.lock = false; G.retried = false;
    G.qs[G.idx] = { tmpl: '9 + 7 = @', ans: 16, op: '+', kind: 'classic' };
    drawQuestion();
    const kaart = document.getElementById('question-text');
    const x = () => { const r = document.createRange(); r.setStart(kaart.firstChild, 0); r.setEnd(kaart.firstChild, 1); return r.getBoundingClientRect().left; };
    const knop = document.createElement('button');
    knop.style.cssText = 'position:fixed;left:40px;top:700px;width:80px;height:50px';
    document.body.appendChild(knop);
    somVult(G.qs[G.idx], knop);
    const xs = []; let plek = null;
    await new Promise(klaar => { (function stap() {
      xs.push(x());
      // waar de kopie landt: zijn eigen vak, zonder de vlucht-transform erop
      const k = document.querySelector('.som-vlucht');
      if (k) plek = ['left', 'top', 'width', 'height'].map(z => parseFloat(k.style[z]));
      if (xs.length < 36) requestAnimationFrame(stap); else klaar();
    })(); });
    knop.remove();
    /* Het vakje meten als het stilstaat. Bij het landen plopt het één keer
       (.klikt, 300ms), en 36 beelden na de start zat het daar nog nét in: op
       schaal 1,02 of 1,04, al naar gelang waar de beeldjes vielen. Dat gaf een
       "landing" van 1,5 of 2,9 pixel die niets met de vlucht te maken had. */
    const blank = kaart.querySelector('.q-blank');
    await Promise.all(blank.getAnimations().map(an => an.finished.catch(() => {})));
    const v = blank.getBoundingClientRect();
    const vak = [v.left, v.top, v.width, v.height];
    return {
      grootsteStap: Math.max(...xs.slice(1).map((w, i) => Math.abs(w - xs[i]))),
      verschoven: Math.abs(xs[xs.length - 1] - xs[0]),
      landing: plek ? Math.max(...vak.map((w, i) => Math.abs(w - plek[i]))) : null,
    };
  });
  check(glad.verschoven > 5 && glad.grootsteStap < 2,
    'de som glijdt naar zijn nieuwe breedte en springt niet', JSON.stringify(glad));
  // De kopie landt op zijn eigen vak (transform: none); dat vak hoort precies het
  // vakje te zijn zoals het uiteindelijk staat. De oude fout was 18%: een vakje
  // van 64 dat in één beeld 75 werd.
  check(glad.landing != null && glad.landing < 1, 'het vliegende getal landt precies op het vakje', JSON.stringify(glad));

  // zonder beweging: niets vliegt, het getal staat er meteen
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, reducedMotion: 'reduce' });
    await cacheFonts(ctx);
    const stil = await ctx.newPage();
    stil.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    await stil.goto(APP_URL);
    await stil.waitForTimeout(300);
    const r = await stil.evaluate(async () => {
      db.profiles.t1 = defaultProfile('Rekenster', 'dress_paars', {});
      const p = db.profiles.t1; p.settings.track = 'math'; p.settings.mode = 'kies';
      cur = 't1';
      startLevel(1);
      await new Promise(r => setTimeout(r, 300));
      const q = G.qs[G.idx];
      [...document.querySelectorAll('.choice-btn')].find(b => Number(b.dataset.v) === q.ans).click();
      const vak = document.querySelector('#question-text .q-blank');
      return { tekst: vak.textContent, ans: String(q.ans), vlucht: document.querySelectorAll('.som-vlucht').length };
    });
    check(r.tekst === r.ans && r.vlucht === 0, 'zonder beweging staat het antwoord meteen in de som', JSON.stringify(r));
    await ctx.close();
  }

  /* ---- De spotlight-balk vult zich, wacht, en zet zacht aan ----
     Bij een nieuwe som loopt de balk eerst vol (SPOT_VUL), staat dan tot
     SPOT_RUST stil, en dooft daarna met een zachte aanzet (spotZicht). Alleen
     het beeld doet dat: G.spot loopt vanaf het begin rechtlijnig, dus "vlot"
     meet hetzelfde. Het Stoppen?-venster zet de klok stil. */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await cacheFonts(ctx);
    const p2 = await ctx.newPage();
    p2.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    await p2.goto(APP_URL + '&demo&star=p1');
    await p2.waitForFunction(() => typeof startLevel === 'function');
    const balk = await p2.evaluate(async () => {
      P().settings.mode = 'kies';
      startLevel(P().level);
      // wachten tot de klok loopt, niet een vast aantal ms (zie op() hieronder)
      for (let i = 0; i < 100 && !spotAnim; i++) await new Promise(r => setTimeout(r, 20));
      /* wat er te zien ís: de balk loopt als animatie (spotAnim), dus de
         berekende stand, niet de stijl op het element */
      const staat = () => { const b = document.getElementById('spotlight-bar');
        const m = new DOMMatrix(getComputedStyle(b).transform);
        return `translateX(${Math.round(m.m41 / b.offsetWidth * 100)}%)`; };
      /* De balk op een vast tijdstip van zijn eigen animatie bekijken, en niet
         op de klok van de test: op een drukke machine (test:snel, of de studio
         die alles draait) was na 150ms soms nog geen beeldje getekend, en dan
         stond hij nog op -100% -- een rode keuring zonder fout in het spel. */
      const op = ms => {
        if (!spotAnim) return staat();
        const t = spotAnim.currentTime; spotAnim.currentTime = ms;
        const s = staat(); spotAnim.currentTime = t; return s;
      };
      const nu = { golden: document.getElementById('question-card').classList.contains('golden'), begin: op(150) };
      await new Promise(r => setTimeout(r, 2650));
      nu.naTweeEnHalf = op(2650); nu.spotNaTweeEnHalf = Math.round(spotNu());
      // na de rust staat hij al te dimmen: de animatie verder zetten en kijken
      nu.loopt = !!spotAnim;
      if (spotAnim) nu.naAcht = op(8000);
      stopSpot(); nu.spotGestopt = Math.round(G.spot); nu.gestopt = !spotAnim;
      // zetSpot zelf: de stijl die hij neerzet, op dezelfde curve als de animatie
      const stijl = () => document.getElementById('spotlight-bar').style.transform;
      zetSpot(50); nu.half = stijl();
      zetSpot(0); nu.leeg = stijl();
      nu.rail = getComputedStyle(document.querySelector('#question-card .spot-rail')).display;
      return nu;
    });
    const x = t => parseFloat((/translateX\((-?[\d.]+)%\)/.exec(t || '') || [0, NaN])[1]);
    if (!balk.golden) {
      check(x(balk.begin) < -5 && x(balk.begin) > -100,
        'bij een nieuwe som vult de balk zich eerst (het begin van de klok is te zien)', JSON.stringify(balk));
      check(x(balk.naTweeEnHalf) === 0 && balk.spotNaTweeEnHalf < 90,
        'de spotlight-balk staat de eerste seconden vol, terwijl de meting al loopt', JSON.stringify(balk));
      check(balk.loopt && x(balk.naAcht) <= -36 && x(balk.naAcht) >= -39,
        'de balk loopt als één animatie en zet zacht aan (na 8 van de 12 seconden nog ruim 60% vol)', JSON.stringify(balk));
      check(balk.gestopt && balk.spotGestopt > 70 && balk.spotGestopt < 90,
        'stoppen zet G.spot vast op de verstreken tijd en haalt de animatie weg', JSON.stringify(balk));
      check(x(balk.half) > -12 && x(balk.half) < -10 && x(balk.leeg) === -100,
        'zetSpot volgt dezelfde zachte curve (halverwege de meting nog bijna 90% vol)', JSON.stringify(balk));
    }
    check(balk.rail !== 'none', 'in de rekenmodus is de spotlight-balk er gewoon', balk.rail);
    // de lichtbundel op haar: geen filter (dat liet hem bij elke show te laat
    // binnenploppen), en hij gaat aan met één animatie bij het begin van de show
    const bundel = await p2.evaluate(() => {
      startLevel(P().level);
      const b = document.querySelector('#screen-game .venue-bundel');
      const pod = document.querySelector('#show-stage .stage-podium');
      return { filter: getComputedStyle(b).filter, aan: b.getAnimations().length, breed: Math.round(b.getBoundingClientRect().width),
               podium: pod ? Math.round(pod.getBoundingClientRect().width) : 0, scherm: innerWidth };
    });
    check(bundel.filter === 'none' && bundel.aan === 1,
      'de lichtbundel tekent zonder filter en gaat aan bij het begin van een show', JSON.stringify(bundel));
    // de bundel valt op haar podium: onderaan iets breder dan de schijf, en
    // smaller dan het scherm (anders vallen beide randen weg en is het licht "weg")
    check(bundel.podium > 0 && bundel.breed >= bundel.podium && bundel.breed <= bundel.podium * 1.4 && bundel.breed < bundel.scherm,
      'de lichtbundel valt op haar podium, met beide randen in beeld', JSON.stringify(bundel));
    // het Stoppen?-venster: de klok staat stil zolang het openstaat
    const pauze = await p2.evaluate(async () => {
      startLevel(P().level);
      G.misses = 1;   // er is iets te verliezen, dus het venster komt echt
      await new Promise(r => setTimeout(r, 300));
      askQuit();
      const voor = G.spot, loopt = !!G.timer;
      await new Promise(r => setTimeout(r, 1200));
      const tijdens = Math.round(spotNu());
      closeQuitModal();
      return { open: loopt, verschil: Math.round(voor) - tijdens, weer: !!G.timer && !!spotAnim };
    });
    check(!pauze.open && pauze.verschil === 0 && pauze.weer,
      'het Stoppen?-venster zet het spotlicht stil, en sluiten laat het verder lopen', JSON.stringify(pauze));
    await ctx.close();
  }

  check(pageErrors.length === 0, 'geen javascript-fouten', pageErrors.join(' | '));

  await browser.close();

  const names = Object.keys(counts).sort();
  let failed = 0;
  for (const n of names) {
    const c = counts[n];
    if (c.fail) failed++;
    console.log(`${c.fail ? 'FAIL' : ' ok '}  ${n}  (${c.pass} ok${c.fail ? ', ' + c.fail + ' fout' : ''})`);
  }
  if (fails.length) {
    console.log('\nVoorbeelden van fouten:');
    for (const f of fails) console.log('  - ' + f);
  }
  console.log(`\n${names.length - failed}/${names.length} controles geslaagd.`);
  process.exit(failed ? 1 : 0);
})();
