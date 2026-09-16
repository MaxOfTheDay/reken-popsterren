/*
 * Voortgang: welke wereld is er af, welke is de volgende, en wat gebeurt er als
 * alles uit is.
 *
 * Fase 4A heeft één ding rechtgezet dat er in de andere suites niet in zit: een
 * wereld is niet uit omdat je er voorbij bent, maar omdat je hem gespeeld hebt.
 * Vóór deze fase liep de tournee voorbij de laatste geschreven wereld gewoon door
 * in stukken van acht ("Sterrentournee"), en die stukken bezetten levelnummers.
 * De dag dat er een échte wereld achteraan kwam, stonden de sterren van die staart
 * ineens ín die wereld -- en waande een gloednieuwe wereld zich al uitgespeeld.
 *
 * Wat hier vastligt zijn de zes gevallen waarin dat mis kan gaan:
 *   A  verse ster                      -> de eerste wereld is de grens
 *   B  halverwege                      -> de eerste onafgemaakte wereld is de grens
 *   C  alles uit                       -> geen grens, wél een toegift
 *   D  er komt later een wereld bij    -> die is leeg en wordt de nieuwe grens
 *   E  handmatig terugbladeren         -> raakt de voortgang niet aan
 *   F  twee werelden tegelijk erbij    -> de eerste wordt de grens, de tweede volgt
 * plus de eenmalige opruiming van een bestaande save uit die oude staart.
 *
 * Draaien:
 *   npm run test:voortgang      (of: npm test voor alle suites)
 */
const { launch, cacheFonts, APP_URL } = require('./browser');

const fails = [];
const counts = {};
function check(ok, label, detail) {
  counts[label] = counts[label] || { pass: 0, fail: 0 };
  if (ok) counts[label].pass++;
  else { counts[label].fail++; if (fails.length < 40) fails.push(`${label}: ${detail}`); }
}

(async () => {
  const browser = await launch();
  const pageErrors = [];

  // Elke zaak begint met een schone opslag en één ster: de werelden worden per
  // zaak anders gezet (released), en dat mag nooit naar de volgende lekken.
  async function fresh(seed) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) pageErrors.push('CONSOLE ' + m.text()); });
    await page.goto(APP_URL);
    await page.evaluate(() => localStorage.clear());
    if (seed) await page.evaluate(seed);
    await page.reload();
    await page.waitForTimeout(250);
    // gereedschap dat bijna elke zaak nodig heeft
    await page.evaluate(() => {
      // Zoveel werelden uitspelen alsof het kind ze echt gespeeld heeft: elke
      // show één keer, met sterren. Dit is de énige manier waarop een wereld
      // "uit" hoort te raken -- niet door een nummer.
      window.__speelWerelden = (q, n, sterren) => {
        for (let i = 0; i < n; i++) {
          const w = WORLDS[i];
          for (let l = WORLD_START[i]; l < WORLD_START[i] + w.levels; l++) q.stars[l] = sterren == null ? 2 : sterren;
        }
        q.level = n < WORLD_START.length ? WORLD_START[n] : WORLD_LAST + 1;
      };
      // Een wereld (nog) niet uitbrengen -- het enige nieuwe wereldveld van deze fase.
      window.__breng = (n) => {
        WORLDS.forEach((w, i) => { if (i < n) delete w.released; else w.released = false; });
        rebuildWorldStarts();
      };
      window.__stand = () => ({
        level: P().level, hier: hereLevel(P()), laatste: WORLD_LAST, beschikbaar: WORLD_AVAIL,
        aantal: WORLDS.length,
        uit: WORLDS.map((w, i) => worldDone(P(), i)),
        grens: frontierWorld(P()), verder: continueWorld(P()), allesUit: allWorldsDone(P()),
        sterren: totalStarCount(P()), shows: playedCount(P()), kijkt: viewWorldIdx,
      });
    });
    return { ctx, page };
  }
  const nieuweSter = () => {
    const q = defaultProfile('Roos', 'dress_roze');
    localStorage.setItem('rekenPopsterren_v1',
      JSON.stringify({ sound: false, haptics: false, schemaV: 3, profiles: { p1: q } }));
  };

  /* ================= A · Verse ster =================
     Niets gespeeld: de eerste wereld is de grens, en "verder" begint daar. */
  {
    const { ctx, page } = await fresh(nieuweSter);
    await page.evaluate(() => selectProfile('p1'));
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({ ...__stand(), gezien: P().worldsSeen.slice() }));
    check(r.grens === 0 && r.verder === 0 && !r.allesUit,
      'A · een verse ster staat op de eerste wereld', JSON.stringify(r));
    check(r.uit.every(x => !x), 'A · geen enkele wereld telt als uitgespeeld', JSON.stringify(r.uit));
    check(r.kijkt === 0 && r.hier === 1, 'A · de kaart opent op die wereld', JSON.stringify(r));
    check(r.gezien.length === 1 && r.gezien[0] === 'muziek',
      'A · en die wereld staat nu als gezien genoteerd', JSON.stringify(r.gezien));
    await ctx.close();
  }

  /* ================= B · Halverwege =================
     Twee werelden uit, de derde half. De grens is die derde -- en de werelden
     dáárna raken er niet stilletjes van in de "uit"-stand. */
  {
    const { ctx, page } = await fresh(nieuweSter);
    const r = await page.evaluate(() => {
      const q = db.profiles.p1;
      __speelWerelden(q, 2);
      for (let l = WORLD_START[2]; l < WORLD_START[2] + 3; l++) q.stars[l] = 2;
      q.level = WORLD_START[2] + 3;
      selectProfile('p1');
      return __stand();
    });
    await page.waitForTimeout(400);
    check(r.uit[0] && r.uit[1] && !r.uit[2], 'B · twee werelden uit, de derde niet', JSON.stringify(r.uit));
    check(r.uit.slice(3).every(x => !x), 'B · de werelden daarna raken niet vanzelf uit', JSON.stringify(r.uit));
    check(r.grens === 2 && r.verder === 2 && !r.allesUit,
      'B · de derde wereld is de grens', JSON.stringify(r));
    await ctx.close();
  }

  /* ================= C · Alles uit =================
     Er is geen grens meer, maar wél een plek om te zijn: de laatste wereld, als
     toegift. De ster staat op de laatste halte die er is (en niet één erachter,
     want die bestaat niet), en een show daar overdoen schuift niets vooruit. */
  {
    const { ctx, page } = await fresh(nieuweSter);
    let r = await page.evaluate(() => {
      __speelWerelden(db.profiles.p1, WORLDS.length);
      selectProfile('p1');
      return __stand();
    });
    await page.waitForTimeout(500);
    check(r.grens === -1 && r.allesUit, 'C · alles uit betekent: geen grens meer', JSON.stringify(r));
    check(r.verder === r.aantal - 1, 'C · "verder" wijst naar de laatste wereld', JSON.stringify(r));
    check(r.level === r.laatste + 1 && r.hier === r.laatste,
      'C · de ster staat op de laatste halte die bestaat', JSON.stringify(r));
    r = await page.evaluate(() => ({
      kijkt: viewWorldIdx,
      nu: (document.querySelector('.tour-stop.next') || {}).dataset,
      haltes: document.querySelectorAll('.tour-stop').length,
      opSlot: document.querySelectorAll('.tour-stop.locked').length,
      naam: document.getElementById('map-tournee-label').textContent,
      art: !!WORLDS[WORLDS.length - 1].art,
    }));
    check(r.kijkt === 5 && r.opSlot === 0 && r.nu && Number(r.nu.lvl) === 48,
      'C · de toegift speelt op de gewone kaart van die wereld', JSON.stringify(r));
    check(/Toverwereld/.test(r.naam) && r.art,
      'C · met zijn eigen naam en zijn eigen tekening, geen nepwereld', JSON.stringify(r));
    // de laatste show nog eens spelen: dat is een toegift en geen voortgang
    const voor = await page.evaluate(() => __stand());
    await page.evaluate(() => { startLevel(WORLD_LAST); });
    await page.waitForTimeout(300);
    await page.evaluate(async () => {
      const wacht = ms => new Promise(res => setTimeout(res, ms));
      for (let i = 0; i < 200 && G; i++) {
        if (G.lock || !G.qs[G.idx]) { await wacht(60); continue; }
        submitAnswer(G.qs[G.idx].ans);
        await wacht(60);
      }
    });
    await page.waitForFunction(() => document.getElementById('screen-end').classList.contains('active'),
      null, { timeout: 15000 });
    await page.waitForTimeout(1200);
    const na = await page.evaluate(() => __stand());
    check(na.level === voor.level && na.hier === voor.hier,
      'C · een toegift schuift de voortgang niet op', JSON.stringify({ voor: voor.level, na: na.level }));
    check(na.uit.join() === voor.uit.join() && na.grens === -1,
      'C · en verandert niets aan welke werelden uit zijn', JSON.stringify(na.uit));
    await ctx.close();
  }

  /* ================= D · Er komt later een wereld bij =================
     Het geval waar deze hele fase om begonnen is. Een kind dat álles uitgespeeld
     had, en dan wordt er een wereld uitgebracht. Die hoort leeg te zijn, de nieuwe
     grens te worden, en de oude werelden hun echte stand te laten houden. */
  {
    const { ctx, page } = await fresh(nieuweSter);
    const r = await page.evaluate(() => {
      __breng(5);                                   // wereld 6 bestaat nog niet voor dit kind
      __speelWerelden(db.profiles.p1, 5);
      selectProfile('p1');
      const voor = __stand();
      __breng(6);                                   // ...en nu wel
      return { voor, na: __stand() };
    });
    await page.waitForTimeout(400);
    check(r.voor.allesUit && r.voor.beschikbaar === 5 && r.voor.laatste === 40,
      'D · vóór de nieuwe wereld was alles uit', JSON.stringify(r.voor));
    check(!r.na.uit[5], 'D · de nieuwe wereld is niet uitgespeeld', JSON.stringify(r.na.uit));
    check(r.na.grens === 5 && r.na.verder === 5 && !r.na.allesUit,
      'D · de nieuwe wereld is de nieuwe grens', JSON.stringify(r.na));
    check(r.na.uit.slice(0, 5).every(x => x), 'D · de oude werelden houden hun stand', JSON.stringify(r.na.uit));
    check(r.na.hier === 41 && r.na.sterren === r.voor.sterren,
      'D · de ster staat op de eerste halte ervan, met evenveel sterren als eerst', JSON.stringify(r.na));
    // ...en de kaart neemt haar er ook echt heen, met de onthulling die erbij hoort
    await page.evaluate(() => goMap());
    await page.waitForTimeout(260);
    const reis = await page.evaluate(() => ({ schaduw: !!document.querySelector('.wereld-schaduw'), grendel: wereldReisBezig() }));
    await page.waitForTimeout(1400);
    const rust = await page.evaluate(() => ({
      kijkt: viewWorldIdx, naam: document.getElementById('map-tournee-label').textContent,
      schaduw: !!document.querySelector('.wereld-schaduw'), gezien: P().worldsSeen.slice(),
    }));
    check(reis.schaduw && reis.grendel, 'D · de nieuwe wereld krijgt zijn eigen onthulling', JSON.stringify(reis));
    check(rust.kijkt === 5 && !rust.schaduw && /Toverwereld/.test(rust.naam),
      'D · en de kaart komt daar tot rust', JSON.stringify(rust));
    // tweede keer: dezelfde wereld, geen tweede plechtigheid
    await page.evaluate(() => goMap());
    await page.waitForTimeout(400);
    const weer = await page.evaluate(() => ({ schaduw: !!document.querySelector('.wereld-schaduw'), kijkt: viewWorldIdx }));
    check(!weer.schaduw && weer.kijkt === 5,
      'D · de tweede keer speelt die onthulling niet opnieuw', JSON.stringify(weer));
    await ctx.close();
  }

  /* ================= E · Terugbladeren =================
     Rondkijken in een eerdere wereld is geen voortgang. Niets aan de stand mag
     eraan veranderen, en de weg terug moet er staan. */
  {
    const { ctx, page } = await fresh(nieuweSter);
    await page.evaluate(() => {
      __speelWerelden(db.profiles.p1, 3);
      selectProfile('p1');
    });
    await page.waitForTimeout(400);
    const voor = await page.evaluate(() => __stand());
    await page.evaluate(() => navigeerNaarWereld(1));
    await page.waitForTimeout(700);
    const na = await page.evaluate(() => ({
      ...__stand(), terug: !document.getElementById('world-back').hidden,
      naam: document.getElementById('map-tournee-label').textContent,
    }));
    check(na.kijkt === 1 && na.terug, 'E · terugbladeren zet alleen de kaart terug', JSON.stringify(na));
    check(na.grens === voor.grens && na.verder === voor.verder && na.level === voor.level
      && na.uit.join() === voor.uit.join(),
      'E · de grens en de uitgespeelde werelden blijven precies staan', JSON.stringify({ voor, na }));
    await page.click('#world-back');
    await page.waitForTimeout(700);
    const terug = await page.evaluate(() => ({ kijkt: viewWorldIdx, ...__stand() }));
    check(terug.kijkt === voor.grens && terug.grens === voor.grens,
      'E · en de weg terug brengt haar weer bij de grens', JSON.stringify(terug));
    await ctx.close();
  }

  /* ================= F · Twee werelden tegelijk erbij =================
     De grens springt niet naar de nieuwste maar naar de eerste die nog niet uit
     is -- en schuift pas door als die ook echt gespeeld is. */
  {
    const { ctx, page } = await fresh(nieuweSter);
    const r = await page.evaluate(() => {
      __breng(4);
      __speelWerelden(db.profiles.p1, 4);
      selectProfile('p1');
      const voor = __stand();
      __breng(6);                                   // wereld 5 én 6 tegelijk
      const beide = __stand();
      __speelWerelden(db.profiles.p1, 5);           // wereld 5 uitspelen
      return { voor, beide, na: __stand() };
    });
    await page.waitForTimeout(400);
    check(r.voor.allesUit && r.voor.beschikbaar === 4, 'F · vóóraf was alles uit', JSON.stringify(r.voor));
    check(r.beide.grens === 4 && !r.beide.uit[4] && !r.beide.uit[5],
      'F · de eerste nieuwe wereld wordt de grens, niet de laatste', JSON.stringify(r.beide));
    check(r.na.grens === 5 && r.na.uit[4] && !r.na.uit[5],
      'F · die uitspelen schuift de grens naar de volgende', JSON.stringify(r.na));
    await ctx.close();
  }

  /* ================= G · Een save uit de oude staart =================
     Het echte migratiegeval. Dit profiel speelde door tot level 59: level 49 t/m
     59 waren "Sterrentournee", en die sterren staan op nummers die wereld 7 ooit
     opeist. Ze moeten blijven meetellen (rang, trofeeën) én hun levelnummers
     teruggeven -- en dan mag geen enkele latere wereld er iets van erven. */
  {
    const { ctx, page } = await fresh(() => {
      const q = defaultProfile('Nina', 'dress_roze');
      q.level = 60;
      q.stars = {};
      for (let l = 1; l <= 59; l++) q.stars[l] = l % 3 === 0 ? 3 : 2;
      delete q.tourStars; delete q.worldsSeen;      // een save van vóór fase 4A
      q.trophies = ['first', 'rookie3', 'worldtour'];
      localStorage.setItem('rekenPopsterren_v1',
        JSON.stringify({ sound: false, haptics: false, schemaV: 3, profiles: { p1: q } }));
    });
    const r = await page.evaluate(() => {
      const q = db.profiles.p1;
      const verwacht = (() => { let s = 0; for (let l = 1; l <= 59; l++) s += l % 3 === 0 ? 3 : 2; return s; })();
      return {
        level: q.level,
        boven: Object.keys(q.stars).filter(k => Number(k) > WORLD_LAST),
        staart: Object.keys(q.tourStars || {}).map(Number).sort((a, b) => a - b),
        sterren: totalStarCount(q), verwacht, shows: playedCount(q), perfect: perfectCount(q),
        uit: WORLDS.map((w, i) => worldDone(q, i)), grens: frontierWorld(q), allesUit: allWorldsDone(q),
        trofees: q.trophies.slice(), gezien: (q.worldsSeen || []).slice(),
      };
    });
    check(r.level === 49 && r.boven.length === 0,
      'G · de staart laat geen sterren achter op levels die nog moeten komen', JSON.stringify(r));
    check(r.staart.join() === '49,50,51,52,53,54,55,56,57,58,59',
      'G · ze staan wél nog bewaard', JSON.stringify(r.staart));
    check(r.sterren === r.verwacht && r.shows === 59,
      'G · en tellen onverkort mee voor de rang en de shows-trofeeën', JSON.stringify(r));
    check(r.uit.every(x => x) && r.allesUit && r.grens === -1,
      'G · de zes echte werelden blijven gewoon uitgespeeld', JSON.stringify(r.uit));
    check(r.trofees.join() === 'first,rookie3,worldtour',
      'G · behaalde trofeeën blijven onaangeroerd staan', JSON.stringify(r.trofees));
    check(r.gezien.length === 6, 'G · en alle werelden gelden als al gezien -- geen rij onthullingen', JSON.stringify(r.gezien));
    // twee keer laden mag de staart niet nóg een keer opruimen
    await page.reload();
    await page.waitForTimeout(300);
    const weer = await page.evaluate(() => ({
      level: db.profiles.p1.level,
      staart: Object.keys(db.profiles.p1.tourStars).length,
      sterren: totalStarCount(db.profiles.p1),
    }));
    check(weer.level === 49 && weer.staart === 11 && weer.sterren === r.verwacht,
      'G · en een tweede keer laden verandert er niets meer aan', JSON.stringify(weer));
    // ...en als er dán een wereld bijkomt, is die leeg
    const nieuw = await page.evaluate(() => {
      WORLDS.push({ id: 'piraten2', name: 'Testwereld', icon: '🧪', levels: 8 });
      rebuildWorldStarts();
      const q = db.profiles.p1;
      return { uit: worldDone(q, 6), grens: frontierWorld(q), eerste: WORLD_START[6],
               sterrenDaar: [49, 50, 51].map(l => q.stars[l] || 0) };
    });
    check(!nieuw.uit && nieuw.grens === 6 && nieuw.eerste === 49 && nieuw.sterrenDaar.join() === '0,0,0',
      'G · een wereld die later op die levelnummers komt, begint leeg', JSON.stringify(nieuw));
    await ctx.close();
  }

  /* ---- Uitslag ---- */
  check(pageErrors.length === 0, 'geen fouten in de pagina', pageErrors.slice(0, 5).join(' | '));
  await browser.close();

  const namen = Object.keys(counts).sort();
  let ok = 0, nok = 0;
  for (const n of namen) {
    const c = counts[n];
    ok += c.pass; nok += c.fail;
    console.log(`${c.fail ? 'FOUT ' : ' ok  '}  ${n}  (${c.pass} ok${c.fail ? ', ' + c.fail + ' fout' : ''})`);
  }
  if (fails.length) { console.log('\nEerste fouten:'); fails.forEach(f => console.log('  - ' + f)); }
  console.log(`\n${ok}/${ok + nok} controles geslaagd.`);
  process.exit(nok ? 1 : 0);
})();
