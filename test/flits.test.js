/*
 * Flitsen: wat een kind nooit half mag zien.
 *
 * De overgangen zijn op enkele beeldjes afgeregeld, en een fout daarin breekt
 * niets -- er staat alleen één beeldje lang iets wat er niet hoort. Dit zijn de
 * drie beloftes daaronder, gemeten per beeldje (requestAnimationFrame) in de
 * pagina zelf:
 *
 *   A  het beginscherm staat er in één keer: op het moment dat de nachtlaag
 *      (html.opbouw) weggaat, staan de sterrentegels er al.
 *   B  tussen twee vragen knippert de kaart van de som niet: alleen de som zelf
 *      vervaagt, de kaart blijft staan.
 *   C  eerst bouwen, dan bewegen: als de show na een tik op een halte voor het
 *      eerst zichtbaar wordt, staat de som er al en is hij nog maar aan het
 *      begin van zijn opkomst -- niet halverwege, zoals toen het opbouwen in
 *      hetzelfde beeldje viel als de start van de animatie (naOpbouw).
 *
 * Headless verft snel, dus een overgang die tóch in één taak bouwt en beweegt
 * valt hier niet altijd om. Wat wel altijd omvalt is de vorm: de som die er bij
 * de eerste zichtbare stap nog niet staat, een kaart die naar 0 vervaagt, een
 * nachtlaag die weggaat vóór de tegels er zijn. Hoe het voelt blijft werk voor
 * een telefoon.
 *
 * Draaien:
 *   npm run test:flits        (of: npm test voor alle suites)
 */
const { launch, cacheFonts, APP_URL } = require('./browser');
const { check, klaar } = require('./meld')('flits');

const TELEFOON = { width: 390, height: 844 };

(async () => {
  const browser = await launch();
  const pageErrors = [];

  async function nieuw(maat) {
    const ctx = await browser.newContext({ viewport: maat || TELEFOON });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) pageErrors.push('CONSOLE ' + m.text()); });
    return { ctx, page };
  }

  /* ---- A · het beginscherm staat er in één keer ---- */
  {
    const { ctx, page } = await nieuw();
    await page.goto(APP_URL);
    await page.evaluate(() => {
      localStorage.setItem('rekenPopsterren_v1', JSON.stringify({ sound: false, haptics: false, schemaV: 3,
        profiles: { p1: defaultProfile('Roos', 'dress_roze'), p2: defaultProfile('Mila', 'dress_roze') } }));
    });
    // Vóór elk script van de pagina: kijken wat er staat zodra de nachtlaag weggaat.
    await ctx.addInitScript(() => {
      // documentElement bestaat hier nog niet: kijken op het document zelf
      window.__opbouw = { begon: false, weg: null };
      new MutationObserver(() => {
        const html = document.documentElement;
        if (!html || window.__opbouw.weg) return;
        if (html.classList.contains('opbouw')) { window.__opbouw.begon = true; return; }
        if (!window.__opbouw.begon || !document.getElementById('screen-profile')) return;
        window.__opbouw.weg = {
          tegels: document.querySelectorAll('#screen-profile .ster-tegel').length,
          start: document.getElementById('screen-profile').classList.contains('active'),
          t: Math.round(performance.now()),
        };
      }).observe(document, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
    });
    await page.reload();
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => Object.assign({ nu: document.documentElement.className }, window.__opbouw));
    check(r.begon, 'A · de pagina begint onder de nachtlaag (html.opbouw)', JSON.stringify(r));
    check(r.weg && r.weg.start && r.weg.tegels === 2,
      'A · de nachtlaag gaat pas weg als de sterrentegels er staan', JSON.stringify(r));
    check(!/opbouw/.test(r.nu), 'A · en hij gaat ook echt weg', JSON.stringify(r));
    await ctx.close();
  }

  /* ---- B en C · een show ---- */
  const { ctx, page } = await nieuw();
  await page.goto(APP_URL);
  await page.evaluate(() => {
    localStorage.setItem('rekenPopsterren_v1', JSON.stringify({ sound: false, haptics: false, schemaV: 3,
      profiles: { p1: defaultProfile('Roos', 'dress_roze') } }));
  });
  await page.reload();
  await page.waitForTimeout(600);
  await page.evaluate(() => selectProfile('p1'));
  await page.waitForTimeout(900);

  /* C: per beeldje, vanaf de tik. De zaal staat ondoorzichtig onder de kaart en
     de kaart (.wegvallend, erboven) doft weg; hoeveel je van de show ziet is dus
     1 min de doorzichtigheid van de kaart. Het eerste beeldje waarin de show
     zichtbaar is, telt: staat de som er, en hoe ver is hij al? */
  await page.evaluate(() => {
    const spel = document.getElementById('screen-game');
    const kaart = document.getElementById('screen-map');
    const log = window.__duik = [];
    const t0 = performance.now();
    const stap = () => {
      const ks = getComputedStyle(kaart);
      const kaartO = kaart.classList.contains('wegvallend') || kaart.classList.contains('active')
        ? (ks.visibility === 'hidden' || ks.display === 'none' ? 0 : +ks.opacity) : 0;
      log.push({
        t: Math.round(performance.now() - t0),
        actief: spel.classList.contains('active'),
        zicht: +(1 - kaartO).toFixed(2),
        beweegt: kaart.getAnimations().length + spel.getAnimations().length > 0,
        som: (document.getElementById('question-text').textContent || '').trim().length,
      });
      if (performance.now() - t0 < 1500) requestAnimationFrame(stap);
    };
    requestAnimationFrame(stap);
  });
  await page.click('.tour-stop.next');
  await page.waitForTimeout(1700);
  const duik = await page.evaluate(() => window.__duik);
  /* De vorm en niet de duur: headless bouwt de show te snel om het halve-
     overgang-beeldje zelf te zien (op een tablet ± 200 ms, en de klok van de
     animatie liep dan al). Wat hier wél altijd klopt of niet: in het eerste
     beeldje waarin de show actief is, beweegt er nog niets -- het opbouwen is
     dan geverfd voordat de animatie zijn klok start. Bouwt iemand weer in
     dezelfde taak als hij beweegt, dan loopt de animatie hier al. */
  const eerste = duik.find(b => b.actief);
  check(eerste && eerste.som > 0, 'C · de som staat er al in het eerste beeldje van de show', JSON.stringify(eerste));
  check(eerste && !eerste.beweegt && eerste.zicht < 0.02,
    'C · en in dat beeldje beweegt er nog niets: eerst bouwen, dan bewegen',
    JSON.stringify(duik.filter(b => b.actief).slice(0, 5)));
  check(duik.some(b => b.actief && b.beweegt), 'C · daarna beweegt hij wel', '');
  const laatst = duik[duik.length - 1];
  check(laatst && laatst.actief && laatst.zicht > 0.98, 'C · en daarna staat hij er helemaal', JSON.stringify(laatst));

  /* B: drie antwoorden, en per beeldje hoe zichtbaar de kaart van de som is. */
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const kaart = document.getElementById('question-card');
    window.__kaart = { min: 1, beeldjes: 0, aan: true };
    const stap = () => {
      if (!window.__kaart.aan) return;
      // opacity van de kaart én alles erboven: een vervagende ouder telt ook
      let o = 1;
      for (let el = kaart; el && el !== document.body; el = el.parentElement) o *= +getComputedStyle(el).opacity;
      window.__kaart.min = Math.min(window.__kaart.min, o);
      window.__kaart.beeldjes++;
      requestAnimationFrame(stap);
    };
    requestAnimationFrame(stap);
  });
  for (let i = 0; i < 3; i++) {
    await page.waitForFunction(() => G && !G.lock && G.qs[G.idx], null, { timeout: 5000 });
    await page.evaluate(() => submitAnswer(G.qs[G.idx].ans));
    await page.waitForTimeout(1600);
  }
  const kaart = await page.evaluate(() => { window.__kaart.aan = false; return window.__kaart; });
  check(kaart.beeldjes > 30, 'B · de meting liep echt', JSON.stringify(kaart));
  check(kaart.min > 0.9, 'B · tussen twee vragen blijft de kaart van de som staan', JSON.stringify(kaart));

  check(pageErrors.length === 0, 'geen fouten in de pagina', pageErrors.slice(0, 3).join(' | '));
  await browser.close();
  klaar();
})().catch(e => { console.error(e); process.exit(1); });
