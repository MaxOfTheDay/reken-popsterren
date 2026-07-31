/*
 * Test-suite voor de telmodus (lees-vrije modus).
 *
 * Controleert per fase (1-11) en per rung dat GELUID, OPGAVE en VISUALISATIE
 * hetzelfde getal vertellen. Elke vraag wordt echt gerenderd in een browser;
 * daarna tellen we de stippen/voorwerpen in de DOM en vergelijken die met de
 * bedoelde getallen uit de vraag. Zo vangen we fouten als "5 - 3 toont maar
 * 2 stippen" automatisch af.
 *
 * Draaien:
 *   npm install
 *   npm run test:tellen        (of: npm test voor alle suites)
 *
 * Optioneel: SAMPLES=100 voor een grotere steekproef, CHROME=/pad/naar/chrome
 * om een eigen browser te gebruiken.
 */
const { launch, APP_URL } = require('./browser');

const SAMPLES = Number(process.env.SAMPLES || 40);   // vragen per fase/rung-combinatie

const fails = [];
const counts = {};
function check(ok, label, detail) {
  counts[label] = counts[label] || { pass: 0, fail: 0 };
  if (ok) counts[label].pass++;
  else { counts[label].fail++; if (fails.length < 40) fails.push(`${label}: ${detail}`); }
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) pageErrors.push('CONSOLE ' + m.text()); });

  await page.goto(APP_URL);
  await page.waitForTimeout(400);

  // Spraak opvangen i.p.v. uitspreken, zodat we kunnen controleren wát er klinkt.
  await page.evaluate(() => {
    window.__spoken = [];
    window.speechSynthesis.speak = u => { window.__spoken.push(u.text); };
    window.hasSpeech = () => true;
    db.sound = true;
  });

  // Telprofiel selecteren en het spel starten (zodat G bestaat).
  await page.evaluate(() => {
    const p = db.profiles.p1;
    p.settings.track = 'count';
    p.settings.numerals = true;
    p.settings.stage = 1; p.settings.stageMax = 11; p.settings.qmax = 10;
    save();
  });
  await page.click('.profile-card:nth-child(1)');
  await page.waitForTimeout(200);
  await page.click('.tour-stop.next');
  await page.waitForTimeout(400);

  for (const repr of ['objects', 'dots']) {
    for (let stage = 1; stage <= 11; stage++) {
      const rungs = await page.evaluate(s => countStageInfo(s).rungs, stage);
      for (let rung = 0; rung < rungs; rung++) {
        const results = await page.evaluate(({ stage, rung, repr, samples }) => {
          const p = P();
          p.settings.repr = repr;
          p.settings.stage = 1; p.settings.stageMax = 11;
          p.countTrack = { stage, rung, streak: 0, seen: 0, acc: 0.6 };

          // Tel de zichtbare "dingen" binnen een element, per soort.
          const tally = root => ({
            marks: root.querySelectorAll('.cg-obj, .cg-dot, .df-dot').length,
            xed: root.querySelectorAll('.cg-obj.xed, .df-dot.xed').length,
            hidden: root.querySelectorAll('.tf-cell.hidden').length,
            numeral: (root.querySelector('.ct-num') || {}).textContent,
            bignum: (root.querySelector('.cq-bignum') || {}).textContent,
            label: !!root.querySelector('.cq-label'),
            ear: !!root.querySelector('.cq-listen'),
          });

          const out = [];
          for (let i = 0; i < samples; i++) {
            window.__spoken = [];
            const q = genCount(p);
            G.qs[G.idx] = q;
            G.mode = 'count';
            drawCountQuestion(q);
            renderCountAnswers(q, document.getElementById('answer-area'));
            const card = document.getElementById('question-text');
            const tiles = [...document.querySelectorAll('.count-tile')].map(t => ({
              v: Number(t.dataset.v), ...tally(t),
            }));
            out.push({
              ctype: q.ctype, ans: q.ans, prompt: q.prompt, repr: q.repr, cap: q.cap,
              support: q.support, along: !!q.along, compare: q.compare || null,
              card: JSON.parse(JSON.stringify(q.card)),
              choices: q.choices.map(c => ({ v: c.v, kind: c.kind, n: c.n })),
              seen: tally(card),
              tiles,
              spoken: window.__spoken.slice(),
              overflow: card.scrollWidth > card.clientWidth + 1,
            });
          }
          return out;
        }, { stage, rung, repr, samples: SAMPLES });

        for (const r of results) {
          const where = `fase ${stage} rung ${rung} ${repr} ${r.ctype}`;

          /* ---- algemeen: opgave klopt met de antwoordknoppen ---- */
          check(typeof r.ans === 'number' && r.ans >= 0, 'antwoord is een getal', `${where} ans=${r.ans}`);
          const vals = r.choices.map(c => c.v);
          check(vals.filter(v => v === r.ans).length === 1, 'juist antwoord staat precies één keer bij de keuzes', `${where} ans=${r.ans} keuzes=${vals}`);
          check(new Set(vals).size === vals.length, 'geen dubbele antwoordknoppen', `${where} keuzes=${vals}`);

          /* ---- geluid: er wordt iets zinnigs voorgelezen ---- */
          check(typeof r.prompt === 'string' && r.prompt.length > 0, 'vraag heeft een gesproken tekst', where);
          // Bij één-meer/minder mét volle steun klinkt de vraag pas ná het animatiestapje;
          // dat is bewust (eerst zien wat er verandert, dan de vraag horen).
          const deferred = r.card.kind === 'delta' && r.support === 'full';
          if (!deferred) check(r.spoken.length > 0, 'er wordt daadwerkelijk iets uitgesproken', `${where} prompt=${r.prompt}`);

          /* ---- visualisatie: het beeld toont dezelfde getallen als de opgave ---- */
          const c = r.card;
          if (c.kind === 'group') {
            check(r.seen.marks === c.n, 'kaart toont evenveel dingen als gevraagd', `${where} verwacht ${c.n}, zag ${r.seen.marks}`);
          } else if (c.kind === 'delta') {
            check(r.seen.marks === c.base, 'één-meer/minder start met de basisgroep', `${where} verwacht ${c.base}, zag ${r.seen.marks}`);
            check(r.ans === c.base + c.dir, 'antwoord = basis ± 1', `${where} base=${c.base} dir=${c.dir} ans=${r.ans}`);
          } else if (c.kind === 'combine') {
            check(r.seen.marks === c.a + c.b, 'samenvoegen toont beide groepjes', `${where} verwacht ${c.a}+${c.b}, zag ${r.seen.marks}`);
            check(r.ans === c.a + c.b, 'antwoord = a + b', `${where} ans=${r.ans}`);
          } else if (c.kind === 'split') {
            check(r.seen.marks === c.shown, 'splitsen toont het zichtbare deel', `${where} verwacht ${c.shown}, zag ${r.seen.marks}`);
            check(r.seen.hidden === c.total - c.shown, 'splitsen verbergt de rest achter het gordijn', `${where} verwacht ${c.total - c.shown}, zag ${r.seen.hidden}`);
            check(r.ans === c.total - c.shown, 'antwoord = verstopte hoeveelheid', `${where} ans=${r.ans}`);
          } else if (c.kind === 'bignum') {
            check(Number(r.seen.bignum) === c.n, 'cijferkaart toont het juiste cijfer', `${where} zag ${r.seen.bignum}`);
          } else if (c.kind === 'listen') {
            check(r.seen.ear && r.seen.marks === 0, 'luistervraag toont geen hoeveelheid', where);
            check(r.spoken.join(' ').length > 0, 'luistervraag spreekt het getal uit', where);
          } else if (c.kind === 'label') {
            check(r.seen.label, 'vergelijkvraag toont een opdrachtlabel', where);
          } else if (c.kind === 'sum') {
            if (c.style === 'sym') {
              if (c.op === '-') {
                // wegstrepen: de héle startgroep staat er, met b doorgestreept
                check(r.seen.marks === c.a, 'aftrekken toont de hele startgroep', `${where} ${c.a}-${c.b}: verwacht ${c.a}, zag ${r.seen.marks}`);
                check(r.seen.xed === c.b, 'aftrekken streept het weggenomen deel door', `${where} ${c.a}-${c.b}: verwacht ${c.b} doorgestreept, zag ${r.seen.xed}`);
              } else {
                check(r.seen.marks === c.a + c.b, 'optellen toont beide groepjes', `${where} ${c.a}+${c.b}: zag ${r.seen.marks}`);
              }
            } else if (r.support !== 'none' && c.support !== 'none') {
              check(r.seen.marks === c.a + c.b, 'stippen onder de cijfers kloppen met de som', `${where} ${c.a}${c.op}${c.b}: verwacht ${c.a + c.b} stippen, zag ${r.seen.marks}`);
            }
            const expect = c.op === '-' ? c.a - c.b : c.a + c.b;
            check(r.ans === expect, 'antwoord klopt met de som', `${where} ${c.a}${c.op}${c.b} ans=${r.ans}`);
            // gesproken som noemt beide getallen
            const spoken = r.prompt || '';
            check(/\d|één|twee|drie|vier|vijf|zes|zeven|acht|negen|tien/i.test(spoken), 'som wordt met getallen voorgelezen', `${where} prompt=${spoken}`);
          }

          /* ---- antwoordknoppen tonen hun eigen hoeveelheid ---- */
          for (const t of r.tiles) {
            const ch = r.choices.find(x => x.v === t.v);
            if (!ch) continue;
            if (ch.kind === 'group') {
              check(t.marks === ch.n, 'antwoordknop toont zijn eigen hoeveelheid', `${where} knop ${t.v}: zag ${t.marks}`);
            } else if (ch.kind === 'numeral') {
              check(Number(t.numeral) === t.v, 'cijferknop toont het juiste cijfer', `${where} knop ${t.v}: zag ${t.numeral}`);
              if (r.support === 'full' || r.support === 'faint') {
                check(t.marks === t.v, 'stippen onder de cijferknop kloppen', `${where} knop ${t.v}: zag ${t.marks} stippen`);
              }
            }
          }

          check(!r.overflow, 'vraagkaart loopt niet over de rand', where);
        }
      }
    }
  }

  /* ---- geluid: telwoorden klinken als telwoord, niet als lidwoord ---- */
  const words = await page.evaluate(() => [0, 1, 2, 5, 10].map(numWord));
  check(words[1] === 'één', 'de 1 wordt als telwoord "één" uitgesproken', `numWord(1) = ${words[1]}`);
  check(words[0] === 'nul' && words[2] === 'twee' && words[4] === 'tien', 'overige telwoorden kloppen', words.join(','));

  /* ---- geluid: geen na-ijlende telstem van een vórige vraag ---- */
  const bleed = await page.evaluate(async () => {
    const p = P();
    p.settings.repr = 'objects';
    p.countTrack = { stage: 2, rung: 2, streak: 0, seen: 0, acc: 0.6 };
    // forceer een meetel-vraag met veel objecten
    let q = null;
    for (let i = 0; i < 60 && !q; i++) { const c = genCount(p); if (c.along && c.card.n >= 4) q = c; }
    if (!q) return { skipped: true };
    G.qs[G.idx] = q; G.mode = 'count';
    window.__spoken = [];
    drawCountQuestion(q);
    await new Promise(r => setTimeout(r, 700));           // meetellen is bezig
    // kind antwoordt snel: volgende vraag verschijnt
    const q2 = { kind: 'count', count: true, ctype: 'count', stage: 2, emoji: '⭐', repr: 'objects',
                 cap: 5, support: 'full', ans: 2, card: { kind: 'group', n: 2, emoji: '⭐', repr: 'objects', cap: 5 },
                 choices: [{ v: 2, kind: 'group', n: 2, emoji: '⭐', repr: 'objects', cap: 5 }] };
    G.qs[G.idx] = q2;
    drawCountQuestion(q2);
    window.__spoken = [];
    await new Promise(r => setTimeout(r, 2200));          // ruim langer dan één telstap
    return { after: window.__spoken.slice(), n: q.card.n };
  });
  if (!bleed.skipped) {
    check(bleed.after.length === 0, 'telstem van de vorige vraag stopt bij een nieuwe vraag',
      `hoorde nog: ${JSON.stringify(bleed.after)}`);
  }

  check(pageErrors.length === 0, 'geen javascript-fouten', pageErrors.join(' | '));

  await browser.close();

  /* ---- rapport ---- */
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
