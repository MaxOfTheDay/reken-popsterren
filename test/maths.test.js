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
const { launch, APP_URL } = require('./browser');

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
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) pageErrors.push('CONSOLE ' + m.text()); });

  await page.goto(APP_URL);
  await page.waitForTimeout(400);

  // Rekenprofiel (Anna) kiezen en een optreden starten, zodat G bestaat.
  await page.evaluate(() => {
    const p = db.profiles.p2;
    p.settings.track = 'math';
    p.settings.mode = 'kies';
    save();
  });
  await page.click('.profile-card:nth-child(2)');
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
            const choices = makeChoices(q.ans);
            const card = document.getElementById('question-text');
            out.push(Object.assign({
              tmpl: q.tmpl, ans: q.ans, op: q.op, kind: q.kind,
              blanks: card.querySelectorAll('.q-blank').length,
              overflow: card.scrollWidth > card.clientWidth + 1,
              choices,
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
            check(nums.every(v => v <= max), 'getallen blijven binnen de ingestelde grens', `${where} max=${max} zag ${nums}`);
          }

          /* --- antwoordknoppen --- */
          check(r.choices.filter(v => v === r.ans).length === 1, 'juist antwoord staat precies één keer bij de keuzes', `${where} keuzes=${r.choices}`);
          check(new Set(r.choices).size === r.choices.length, 'geen dubbele antwoordknoppen', `${where} keuzes=${r.choices}`);
          check(r.choices.every(v => v >= 0), 'geen negatieve antwoordknoppen', `${where} keuzes=${r.choices}`);

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
    const drill = (p, op, n, correct) => { for (let i = 0; i < n; i++) updateOpAcc(p, op, correct, correct); };

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

    // -- klaar voor zoek-het-getal: niet in ronde 1-2, wel vanaf ronde 3
    out.readyRound2 = opReady(p, '+', 2);               // verwacht false
    out.readyRound3 = opReady(p, '+', 3);               // verwacht true

    // -- worstelen pauzeert, en herstel vraagt méér dan één goed antwoord (hysterese)
    drill(p, '+', 6, false);
    out.pausedAfterMisses = ot(p, '+').paused;          // verwacht true
    out.readyWhilePaused = opReady(p, '+', 5);          // verwacht false
    drill(p, '+', 1, true);
    out.stillPausedAfterOneGood = ot(p, '+').paused;    // verwacht true (nog onder 0.85)
    drill(p, '+', 10, true);
    out.recovered = !ot(p, '+').paused;                 // verwacht true

    // -- drie getallen: pas ná zoek-het-getal, en nooit tegelijk losgelaten
    p = fresh();
    drill(p, '+', 25, true);
    refreshReadiness(p, 3);
    out.chainRound3 = chainReady(p, p.settings, 3);     // verwacht false (te vroeg)
    out.chainRound4TooSoon = chainReady(p, p.settings, 4);  // verwacht false (< 2 rondes na unlock)
    out.chainRound5 = chainReady(p, p.settings, 5);     // verwacht true
    out.unlockRound = ot(p, '+').unlockRound;           // verwacht 3

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
    refreshReadiness(p, 3);
    p.chainTrack.rung = 2; p.missRamp.rung = 2;
    const plans = [];
    for (let i = 0; i < 300; i++) plans.push(planSpecials(p, p.settings, 8, 6, 3));
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
    for (let i = 0; i < 200; i++) shortPlans.push(planSpecials(p, p.settings, 5, 6, 2));
    out.shortPlanMax = Math.max(...shortPlans.map(pl => Object.keys(pl).length));  // verwacht ≤ 1
    return out;
  });

  const e = engine;
  check(e.masteredTooFew === false, 'beheersing vraagt genoeg pogingen', `n=10 gaf ${e.masteredTooFew}`);
  check(e.masteredEnough === true, 'beheersing wordt herkend na genoeg goede pogingen', String(e.masteredEnough));
  check(e.masteredWithHeavyWeak === false, 'een hardnekkig gemiste som blokkeert beheersing', String(e.masteredWithHeavyWeak));
  check(e.readyRound2 === false, 'zoek-het-getal komt niet in de eerste rondes', String(e.readyRound2));
  check(e.readyRound3 === true, 'zoek-het-getal komt vrij zodra het kind er klaar voor is', String(e.readyRound3));
  check(e.pausedAfterMisses === true, 'worstelen zet de vraagsoort op pauze', String(e.pausedAfterMisses));
  check(e.readyWhilePaused === false, 'op pauze komt de vraagsoort niet terug', String(e.readyWhilePaused));
  check(e.stillPausedAfterOneGood === true, 'herstel vraagt meer dan één goed antwoord (hysterese)', String(e.stillPausedAfterOneGood));
  check(e.recovered === true, 'na consequent goed spelen komt de vraagsoort terug', String(e.recovered));
  check(e.chainRound3 === false && e.chainRound4TooSoon === false, 'drie getallen komt niet meteen na zoek-het-getal', `r3=${e.chainRound3} r4=${e.chainRound4TooSoon}`);
  check(e.chainRound5 === true, 'drie getallen komt vrij na een rustige tussenperiode', String(e.chainRound5));
  check(e.unlockRound === 3, 'moment van beheersing wordt onthouden', String(e.unlockRound));
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
    // fout antwoord kost een hartje
    q = G.qs[G.idx];
    const livesBefore = 3 - G.errors;
    const bad = [...document.querySelectorAll('.choice-btn')].find(b => Number(b.dataset.v) !== q.ans);
    bad.click();
    await new Promise(r => setTimeout(r, 250));
    out.retryOffered = G.retried === true;              // eerste misser = nog eens proberen
    out.livesKeptOnFirstMiss = (3 - G.errors) === livesBefore;
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
  check(flow.livesKeptOnFirstMiss === true, 'eerste misser kost nog geen hartje', String(flow.livesKeptOnFirstMiss));
  check(flow.goldBanner === '🌟 3× 💎 🌟', 'gouden vraag toont het lees-vrije signaal', flow.goldBanner);
  check(flow.goldGain >= 6, 'gouden vraag levert drie keer zoveel op', String(flow.goldGain));

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
