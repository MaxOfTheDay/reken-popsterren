/*
 * Rondgang: één doorlopende sessie door de hele app, op het gewone spelpad.
 *
 * De andere suites kijken van dichtbij naar één onderwerp (tellen, rekenen,
 * sterren) en zetten daarvoor een opstelling klaar. Deze niet: die speelt de app
 * zoals een gezin hem gebruikt -- een bestaande opslag openen, een show spelen,
 * naar de volgende wereld reizen, iets kopen, de kast bekijken, terugdrukken,
 * de app opnieuw openen -- en kijkt of er onderweg niets omvalt.
 *
 * Bewust ZONDER ?debug: dit is precies het pad dat een kind aflegt, inclusief de
 * gewone service worker en de gewone opslag. Alles wat de test aanroept
 * (defaultProfile, P(), startLevel, ...) staat toch al in de globale scope,
 * omdat de app één klassiek <script> is.
 *
 * Deze suite is er in fase 2 bij gekomen: de fundering die daar gelegd is
 * (worldProgress, showWorld, openOverlay, het voorladen van wereldtekeningen)
 * raakt precies de naden tussen schermen, en dáár keek nog geen enkele test.
 *
 * Draaien:
 *   npm run test:rondgang       (of: npm test voor alle suites)
 */
const { launch, cacheFonts, APP_URL } = require('./browser');

const fails = [];
const counts = {};
function check(ok, label, detail) {
  counts[label] = counts[label] || { pass: 0, fail: 0 };
  if (ok) counts[label].pass++;
  else { counts[label].fail++; if (fails.length < 40) fails.push(`${label}: ${detail}`); }
}

// het gewone spel: dezelfde URL als de andere suites, maar zonder de schakelaars
const SPEL_URL = APP_URL.replace('?debug', '');

(async () => {
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await cacheFonts(ctx);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) pageErrors.push('CONSOLE ' + m.text());
  });

  await page.goto(SPEL_URL);
  await page.evaluate(() => localStorage.clear());

  /* ---- 1 · Een opslag zoals die op een bestaand toestel staat ----
     Een profiel van vóór fase 1: zonder de velden die er later bij kwamen, mét
     twee trofeeën die intussen met pensioen zijn. Dit is de save waar deze fase
     niets aan mag veranderen. */
  await page.goto(SPEL_URL);
  await page.evaluate(() => {
    const oud = defaultProfile('Nina', 'dress_roze');
    delete oud.order; delete oud.startHair; delete oud.startDress; delete oud.base;
    delete oud.rankSeen; delete oud.learned; delete oud.freebies;
    delete oud.settings.track; delete oud.settings.stageMax; delete oud.settings.memory;
    oud.level = 7; oud.diamonds = 120;
    oud.stars = { 1: 3, 2: 2, 3: 3, 4: 1, 5: 3, 6: 2 };
    oud.owned = ['hair_blond', 'dress_roze', 'dress_paars', 'shoes_roze', 'stage_disco', 'stage_kasteel', 'mic_roze'];
    oud.equipped = { hair: 'hair_blond', dress: 'dress_roze', shoes: 'shoes_roze', mic: 'mic_roze',
                     instrument: null, acc: null, pet: null, stage: 'stage_kasteel' };
    oud.trophies = ['first', 'rookie3', 'rockster', 'podiumbouwer'];
    oud.readyTrophies = ['discodiva'];
    oud.stats = { correct: 90, wrong: 11 };
    localStorage.setItem('rekenPopsterren_v1',
      JSON.stringify({ sound: false, haptics: false, schemaV: 3, profiles: { p1: oud } }));
  });
  await page.reload();
  await page.waitForTimeout(400);

  let r = await page.evaluate(() => ({
    kaarten: document.querySelectorAll('.profile-card').length,
    naam: (document.querySelector('.pname') || {}).textContent,
  }));
  check(r.kaarten === 1 && r.naam === 'Nina', 'een bestaande opslag laadt en toont zijn ster', JSON.stringify(r));

  /* ---- 2 · De kaart: ontgrendeling, sterren en de wereld in de kop ---- */
  await page.click('.profile-card');
  await page.waitForTimeout(500);
  r = await page.evaluate(() => ({
    kaart: document.getElementById('screen-map').classList.contains('active'),
    wereld: document.getElementById('map-tournee-label').textContent,
    haltes: document.querySelectorAll('.tour-stop').length,
    open: document.querySelectorAll('.tour-stop:not(.locked)').length,
    nu: document.querySelectorAll('.tour-stop.next').length,
    sterren: document.querySelectorAll('.tour-stop .cs-vol').length,
    diamanten: document.getElementById('map-diamonds').textContent,
  }));
  check(r.kaart && r.haltes === 8, 'de kaart opent met acht haltes', JSON.stringify(r));
  check(/Muziekwereld/.test(r.wereld), 'de wereld van dit level staat in de kop', r.wereld);
  check(r.open === 7 && r.nu === 1, 'zeven haltes staan open, één is "nu"', JSON.stringify(r));
  check(r.sterren === 14, 'de verdiende sterren staan onder hun halte', String(r.sterren));
  check(r.diamanten === '120', 'de diamanten uit de opslag staan in de kop', r.diamanten);

  /* ---- 3 · Een show foutloos spelen ---- */
  await page.evaluate(() => window.__speelUit = async () => {
    const wacht = ms => new Promise(res => setTimeout(res, ms));
    for (let i = 0; i < 200 && G; i++) {
      if (G.lock || !G.qs[G.idx]) { await wacht(60); continue; }   // wachten tot de vraag er staat
      submitAnswer(G.qs[G.idx].ans);
      await wacht(60);
    }
  });
  async function speelShow(lvl) {
    await page.evaluate(l => startLevel(l), lvl);
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__speelUit());
    await page.waitForFunction(() => document.getElementById('screen-end').classList.contains('active'),
      null, { timeout: 15000 });
    await page.waitForTimeout(1500);
  }
  await page.evaluate(() => startLevel(P().level));
  await page.waitForTimeout(300);
  check(await page.evaluate(() => document.getElementById('screen-game').classList.contains('active')),
    'de show start', '');
  await page.evaluate(() => window.__speelUit());
  await page.waitForFunction(() => document.getElementById('screen-end').classList.contains('active'),
    null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  r = await page.evaluate(() => ({ level: P().level, ster7: P().stars[7] }));
  check(r.ster7 === 3 && r.level === 8, 'foutloos = drie sterren, en een level erbij', JSON.stringify(r));

  /* ---- 4 · Terug naar de kaart: de reis speelt af ---- */
  await page.click('#btn-end-next');
  await page.waitForTimeout(2600);
  r = await page.evaluate(() => ({
    kaart: document.getElementById('screen-map').classList.contains('active'),
    nu: (document.querySelector('.tour-stop.next') || {}).dataset,
  }));
  check(r.kaart && r.nu && r.nu.lvl === '8', 'terug op de kaart staat de ster op de volgende halte', JSON.stringify(r));

  /* ---- 5 · De wereldwissel ----
     De laatste show van een wereld uitspelen: de kaart schuift door naar de
     volgende wereld, de badge ligt klaar, en de tekening van die wereld is
     onderweg al opgehaald (zie preloadNextWorldArt). */
  await speelShow(8);
  await page.click('#btn-end-next');
  await page.waitForTimeout(3500);
  r = await page.evaluate(() => ({
    wereld: document.getElementById('map-tournee-label').textContent,
    level: P().level,
    nu: (document.querySelector('.tour-stop.next') || {}).dataset,
    badge: P().readyTrophies.indexOf('wereld-muziek') >= 0 || P().trophies.indexOf('wereld-muziek') >= 0,
    voorgeladen: [...ART_GEHAALD],
  }));
  check(/Snoepwereld/.test(r.wereld) && r.level === 9, 'de kaart schuift door naar de volgende wereld', JSON.stringify(r));
  check(r.nu && r.nu.lvl === '9', 'de ster staat op de eerste halte daarvan', JSON.stringify(r));
  check(r.badge, 'de badge van de afgemaakte wereld ligt klaar', JSON.stringify(r));
  check(r.voorgeladen.some(s => /snoep/.test(s)),
    'de tekening van de volgende wereld was al opgehaald', JSON.stringify(r.voorgeladen));

  /* ---- 6 · De werelden-kiezer: kijken zonder iets kwijt te raken ---- */
  await page.click('#map-tournee-label');
  await page.waitForTimeout(350);
  await page.click('.wr-row[data-w="0"]');
  await page.waitForTimeout(500);
  r = await page.evaluate(() => ({
    wereld: document.getElementById('map-tournee-label').textContent,
    eerste: (document.querySelector('.tour-stop') || {}).dataset,
    terugZichtbaar: !document.getElementById('world-back').hidden,
    level: P().level,
  }));
  check(/Muziekwereld/.test(r.wereld) && r.eerste.lvl === '1' && r.terugZichtbaar && r.level === 9,
    'een eerdere wereld bekijken verandert niets aan de voortgang', JSON.stringify(r));
  await page.click('#world-back');
  await page.waitForTimeout(400);
  check(await page.evaluate(() => /Snoepwereld/.test(document.getElementById('map-tournee-label').textContent)),
    'de weg terug brengt kop en kaart samen terug', '');

  /* ---- 7 · Kleedkamer: kopen en aandoen ---- */
  await page.click('#nav-dress');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => {
    P().diamonds = 500;
    renderShop();
    // een kaartje met een prijs erop is nog niet van haar
    const kaart = [...document.querySelectorAll('.item-card')].find(c => c.querySelector('.item-status.price'));
    return { id: kaart && kaart.dataset.item, had: P().owned.length };
  });
  check(!!r.id, 'de kleedkamer toont spullen die nog te koop staan', JSON.stringify(r));
  await page.evaluate(id => { confirmShopBuy(id); equipShopItem(id); }, r.id);
  await page.waitForTimeout(300);
  const na = await page.evaluate(id => ({
    bezit: P().owned.includes(id),
    aan: Object.values(P().equipped).includes(id),
  }), r.id);
  check(na.bezit && na.aan, 'kopen en aandoen werkt', JSON.stringify(na));

  /* ---- 8 · Trofeeënkast ---- */
  await page.click('#nav-tro');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({
    kast: document.getElementById('screen-trophies').classList.contains('active'),
    kaarten: document.querySelectorAll('.trophy-card, .tro-card').length,
    teller: document.getElementById('trophy-count').textContent,
    rang: document.getElementById('career-strip').textContent,
  }));
  check(r.kast && r.kaarten > 10, 'de trofeeënkast staat vol kaarten', JSON.stringify(r));
  check(/\d+\s+van\s+\d+/.test(r.teller), 'de kastteller staat er', r.teller);
  check(/ster/i.test(r.rang), 'de ster-statusbalk staat er', r.rang);

  /* ---- 9 · Terug-navigatie (de Android-terugknop) ---- */
  await page.goBack();
  await page.waitForTimeout(400);
  check(await page.evaluate(() => document.getElementById('screen-map').classList.contains('active')),
    'terug vanuit de kast gaat naar de kaart', '');
  await page.goBack();
  await page.waitForTimeout(400);
  check(await page.evaluate(() => document.getElementById('screen-profile').classList.contains('active')),
    'terug vanaf de kaart gaat naar de sterrenkeuze', '');

  /* ---- 10 · De app opnieuw openen ---- */
  await page.reload();
  await page.waitForTimeout(500);
  r = await page.evaluate(() => {
    const q = JSON.parse(localStorage.getItem('rekenPopsterren_v1')).profiles.p1;
    return { level: q.level, sterren: Object.keys(q.stars).length, spullen: q.owned.length,
             oudeTrofee: q.trophies.indexOf('rockster') >= 0 && q.trophies.indexOf('podiumbouwer') >= 0,
             kaarten: document.querySelectorAll('.profile-card').length };
  });
  check(r.level === 9 && r.sterren === 8 && r.spullen === 8 && r.kaarten === 1,
    'na opnieuw openen staat de hele voortgang er nog', JSON.stringify(r));
  check(r.oudeTrofee, 'een gepensioneerde trofee blijft ongemoeid in de opslag staan', JSON.stringify(r));

  await browser.close();

  /* ================= Uitslag ================= */
  check(pageErrors.length === 0, 'geen fouten in de pagina', pageErrors.slice(0, 3).join(' | '));
  const labels = Object.keys(counts).sort();
  let pass = 0, fail = 0;
  for (const l of labels) {
    const c = counts[l];
    pass += c.pass; fail += c.fail;
    console.log(` ${c.fail ? 'FOUT' : 'ok  '}   ${l}  (${c.pass} ok${c.fail ? ', ' + c.fail + ' fout' : ''})`);
  }
  if (fails.length) { console.log('\nEerste fouten:'); fails.forEach(f => console.log('  - ' + f)); }
  console.log(`\n${pass}/${pass + fail} controles geslaagd.`);
  process.exit(fail ? 1 : 0);
})();
