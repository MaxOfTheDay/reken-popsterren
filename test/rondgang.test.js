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

  /* ---- 6a · Wereld naar wereld: de camera klimt (fase 3.4) ----
     De kaarten lopen van beneden naar boven en de tournee loopt van wereld 1 naar
     wereld 6. Eén klim dus -- en dat betekent dat de cámera omhoog gaat en niet de
     wereld. Vooruit: de nieuwe wereld komt van bóven binnen (negatieve translateY
     die naar nul loopt) en de oude zakt naar bénéden weg. Terug precies andersom.

     Dit is de enige controle in de suite die naar een getal uit een animatie kijkt,
     en dat is met reden: de richting ís hier de functie. Draait iemand het teken
     om, dan voelt vooruitgaan als dalen en zegt geen enkele andere test er iets
     over. De twee lagen horen bovendien tegen elkaar aan te liggen -- zit er een
     gat tussen, dan kijk je halverwege de reis naar de app-achtergrond. */
  r = await page.evaluate(async () => {
    const wacht = ms => new Promise(res => setTimeout(res, ms));
    const y = el => el ? new DOMMatrix(getComputedStyle(el).transform).m42 : null;
    const meet = async doel => {
      navigeerNaarWereld(doel);
      await wacht(110);                       // midden in de reis
      const map = document.getElementById('tour-map');
      const schaduw = document.querySelector('.tour-map.wereld-schaduw');
      const uit = { map: y(map), schaduw: y(schaduw), hoogte: map.getBoundingClientRect().height,
                    grendel: wereldReisBezig() };
      await wacht(600);
      uit.na = viewWorldIdx;
      uit.schaduwWeg = !document.querySelector('.wereld-schaduw');
      uit.grendelOpen = !wereldReisBezig();
      uit.rust = y(map) === 0;
      return uit;
    };
    showWorld(0);
    await wacht(300);
    const vooruit = await meet(1);
    const terug = await meet(0);
    return { vooruit, terug };
  });
  check(r.vooruit.map < -20 && r.vooruit.schaduw > 20 && r.vooruit.na === 1,
    'vooruit komt de nieuwe wereld van boven en zakt de oude weg', JSON.stringify(r.vooruit));
  check(r.terug.map > 20 && r.terug.schaduw < -20 && r.terug.na === 0,
    'terug komt de vorige wereld van onderen en stijgt de oude uit beeld', JSON.stringify(r.terug));
  /* De twee lagen horen elkaar precies te raken. Vooruit gaat de schaduw naar
     beneden, dus ligt zijn bovenkant tegen de onderkant van de nieuwe kaart; terug
     is het andersom. Een pixel overlap is de naadafdekking (exact aansluiten laat op
     sommige schermen een haarlijn zien); een gát zou halverwege de reis de
     app-achtergrond tussen twee werelden door laten zien. */
  const overlap = [r.vooruit.map + r.vooruit.hoogte - r.vooruit.schaduw,
                   r.terug.schaduw + r.terug.hoogte - r.terug.map];
  check(overlap.every(v => v >= 0 && v < 2),
    'de twee lagen liggen tegen elkaar aan, zonder gat', JSON.stringify(overlap));
  check(r.vooruit.grendel && r.terug.grendel, 'tijdens de reis zit de grendel dicht',
    JSON.stringify([r.vooruit.grendel, r.terug.grendel]));
  check(r.vooruit.schaduwWeg && r.terug.schaduwWeg && r.vooruit.grendelOpen && r.terug.grendelOpen
        && r.vooruit.rust && r.terug.rust,
    'en daarna staat er niets meer overeind', JSON.stringify(r));

  /* De kaart mag nooit een browser-schuifbalk opleveren: de vertrekkende laag staat
     een schermhoogte naar beneden, en zonder de dichte overflow zou dat de hele app
     scrollbaar maken. */
  r = await page.evaluate(async () => {
    const wacht = ms => new Promise(res => setTimeout(res, ms));
    const sch = document.getElementById('screen-map');
    navigeerNaarWereld(1);
    await wacht(110);
    const uit = { overflow: getComputedStyle(sch).overflowY, top: sch.scrollTop,
                  body: document.body.scrollHeight <= innerHeight + 1,
                  kopieen: document.querySelectorAll('#tour-map').length };
    await wacht(600);
    uit.overflowNa = getComputedStyle(sch).overflowY;
    return uit;
  });
  check(r.overflow === 'hidden' && r.top === 0 && r.body && r.kopieen === 1 && r.overflowNa === 'auto',
    'een wereldwissel zet geen browser-scroll in de app', JSON.stringify(r));

  /* Snel tikken: een kind ratelt op de kiezer. Dat hoort in één wereld te eindigen,
     en die wereld hoort te zijn wat de kop zegt -- kaart en kop mogen het nooit
     oneens zijn. */
  r = await page.evaluate(async () => {
    const wacht = ms => new Promise(res => setTimeout(res, ms));
    showWorld(0);
    await wacht(300);
    let gelukt = 0;
    for (let i = 0; i < 8; i++) if (navigeerNaarWereld(1 - (i % 2))) gelukt++;
    await wacht(900);
    const shown = worldForIndex(viewWorldIdx);
    const haltes = [...document.querySelectorAll('#tour-map .tour-stop')].map(b => Number(b.dataset.lvl));
    return { gelukt, view: viewWorldIdx, kop: document.getElementById('map-tournee-label').textContent,
             naam: shown.world.name, eerste: haltes[0], eersteVanWereld: shown.first,
             schaduwen: document.querySelectorAll('.wereld-schaduw').length, grendel: wereldReisBezig() };
  });
  check(r.gelukt === 1 && r.schaduwen === 0 && !r.grendel,
    'acht tikken op de werelden-kiezer zijn één wereldwissel', JSON.stringify(r));
  check(r.eerste === r.eersteVanWereld && r.kop.includes(r.naam),
    'de zichtbare kaart en de kop wijzen dezelfde wereld aan', JSON.stringify(r));

  /* ---- 6a2 · De onthulling van een nieuwe wereld ----
     Een wereld die voor het eerst opengaat krijgt méér dan een gewone wissel: eerst
     een tel stilte op de afgemaakte wereld (daarin beweegt er nog niets), dan
     dezelfde klim maar trager. Hij hangt aan pendingTravel, en die wordt alleen bij
     een level-up gezet -- dus hij kan niet nog eens spelen als je later terugkomt.

     De voortgang blijft hier expres staan waar hij stond: dit bootst precies na wat
     het eindscherm doet bij de sprong van halte 8 naar halte 9. */
  r = await page.evaluate(async () => {
    const wacht = ms => new Promise(res => setTimeout(res, ms));
    const voor = P().level;
    pendingTravel = { from: voor - 1, to: voor };      // 8 -> 9: over de wereldgrens
    goMap();
    await wacht(200);                                   // nog in de stilte
    /* De stilte staat óók op slot: een kind dat hier de werelden-kiezer opent zou
       eerst ergens anders heen reizen en een tel later alsnog de nieuwe wereld
       binnenrijden. De kiezer hoort dus niet open te gaan, en de kaart zelf hoort
       geen tikken aan te nemen. */
    openWorlds();
    const stilte = { view: viewWorldIdx, schaduw: !!document.querySelector('.wereld-schaduw'),
                     grendel: wereldReisBezig(), kiezer: !!document.querySelector('.career-overlay'),
                     kaartDicht: document.getElementById('tour-map').style.pointerEvents === 'none' };
    await wacht(500);                                   // de klim loopt
    const reis = { view: viewWorldIdx, schaduw: !!document.querySelector('.wereld-schaduw'),
                   grendel: wereldReisBezig() };
    await wacht(1500);
    const rust = { view: viewWorldIdx, schaduw: !!document.querySelector('.wereld-schaduw'),
                   grendel: wereldReisBezig(), kop: document.getElementById('map-tournee-label').textContent };
    // en nog een keer de kaart openen speelt hem níet opnieuw af
    goMap();
    await wacht(250);
    const opnieuw = { schaduw: !!document.querySelector('.wereld-schaduw'), grendel: wereldReisBezig(),
                      pending: pendingTravel, view: viewWorldIdx };
    await wacht(400);
    return { voor, na: P().level, stilte, reis, rust, opnieuw,
             trager: WERELDREIS.onthul > WERELDREIS.snel };
  });
  check(r.stilte.view === 0 && !r.stilte.schaduw,
    'de onthulling begint met een tel stilte op de afgemaakte wereld', JSON.stringify(r.stilte));
  check(r.stilte.grendel && !r.stilte.kiezer && r.stilte.kaartDicht,
    'ook die stilte staat op slot -- geen kiezer, geen tik op de kaart', JSON.stringify(r.stilte));
  check(r.reis.view === 1 && r.reis.schaduw && r.reis.grendel && r.trager,
    'daarna klimt de camera door, trager dan bij gewoon rondkijken', JSON.stringify(r.reis));
  check(r.rust.view === 1 && !r.rust.schaduw && !r.rust.grendel && /Snoepwereld/.test(r.rust.kop),
    'en hij komt tot rust in de nieuwe wereld', JSON.stringify(r.rust));
  check(!r.opnieuw.schaduw && !r.opnieuw.grendel && r.opnieuw.pending === null,
    'de kaart nog eens openen speelt de onthulling niet opnieuw af', JSON.stringify(r.opnieuw));
  check(r.voor === r.na, 'en de onthulling raakt de voortgang niet aan', JSON.stringify(r));

  /* ---- 6b · De zaal: elke wereld heeft er een (fase 3.3) ----
     Niet "ziet het er goed uit" -- dat is werk voor de ogen en voor npm run shots.
     Wel: krijgt élke wereld hetzelfde spelscherm mét zaal, komen de wereldkleuren
     er als losse kanalen in (daar zijn de halfdoorzichtige lagen op gebouwd), en
     valt een wereld zónder tekening netjes terug op de sfeerlaag alleen. */
  r = await page.evaluate(() => {
    const el = document.getElementById('screen-game');
    const uit = [];
    for (let i = 0; i <= WORLDS.length; i++) {          // ook één voorbij: de Sterrentournee
      const w = worldForIndex(i);
      startLevel(w.first);
      const cs = getComputedStyle(el);
      uit.push({
        id: w.world.id,
        aan: el.classList.contains('venue-aan'),
        sfeer: !!el.querySelector('.venue-sfeer'),
        art: cs.getPropertyValue('--venue-art').trim(),
        deepRgb: cs.getPropertyValue('--w-deep-rgb').trim(),
      });
    }
    quitGame();
    return { werelden: WORLDS.length, rijen: uit };
  });
  await page.waitForTimeout(500);
  check(r.rijen.length === r.werelden + 1 && r.rijen.every(w => w.aan && w.sfeer),
    'elke wereld speelt zijn show in een zaal', JSON.stringify(r.rijen.filter(w => !w.aan || !w.sfeer)));
  check(r.rijen.every(w => /^\d+,\d+,\d+$/.test(w.deepRgb)),
    'de wereldkleur komt er ook als losse kanalen in', JSON.stringify(r.rijen.map(w => w.deepRgb)));
  check(r.rijen.filter(w => w.art !== 'none').length === r.werelden,
    'een wereld met een tekening leent die, een wereld zonder draagt zichzelf',
    JSON.stringify(r.rijen.map(w => w.id + ':' + (w.art === 'none' ? 'geen' : 'geleend'))));

  /* ---- 6c · Terugkomen doe je in de wereld waar je speelde ----
     Een show overdoen in een eerdere wereld bracht je terug in de wereld van
     p.level -- een wereld waar je niet geweest was, en waar de halte om op in te
     zoomen niet eens bestaat. De voortgang mag er níet door verschuiven. */
  r = await page.evaluate(async () => {
    const wacht = ms => new Promise(res => setTimeout(res, ms));
    const voor = P().level;
    showWorld(0);                                    // terug naar de Muziekwereld kijken
    await wacht(200);
    startLevel(2);                                   // en daar show 2 overdoen
    await wacht(200);
    quitGame();                                      // afbreken telt net zo goed als uitspelen
    await wacht(500);
    return { wereld: viewWorldIdx, kop: document.getElementById('map-tournee-label').textContent,
             halte: !!document.querySelector('.tour-stop[data-lvl="2"]'), voor, na: P().level };
  });
  check(r.wereld === 0 && /Muziekwereld/.test(r.kop) && r.halte,
    'uit een show kom je terug in de wereld waar die show speelde', JSON.stringify(r));
  check(r.voor === r.na, 'en dat verschuift de voortgang niet', JSON.stringify(r));

  /* ---- 6d · Snel tikken ----
     Zes tikken op dezelfde halte is één show, en vijf tikken op "Verder op
     tournee" is één keer terugkomen. Beide grendels horen daarna weer open te
     staan, ook als er onderweg iets misgaat. */
  await page.evaluate(() => { goMap(); });
  await page.waitForTimeout(400);
  r = await page.evaluate(async () => {
    const wacht = ms => new Promise(res => setTimeout(res, ms));
    let starts = 0;
    const echt = window.startLevel;
    window.startLevel = function () { starts++; return echt.apply(this, arguments); };
    const halte = document.querySelector('.tour-stop:not(.locked)');
    for (let i = 0; i < 6; i++) halte.click();
    await wacht(700);
    window.startLevel = echt;
    return { starts, spel: document.getElementById('screen-game').classList.contains('active'),
             grendel: overgangBezig };
  });
  check(r.starts === 1 && r.spel, 'zes tikken op een halte starten één show', JSON.stringify(r));
  check(r.grendel === false, 'en de grendel op de heenweg staat daarna weer open', JSON.stringify(r));

  r = await page.evaluate(async () => {
    const wacht = ms => new Promise(res => setTimeout(res, ms));
    G.stars = 3; endLevel(true);
    await wacht(300);
    let renders = 0;
    const echt = window.renderTourMap;
    window.renderTourMap = function () { renders++; return echt.apply(this, arguments); };
    const knop = document.getElementById('btn-end-next');
    for (let i = 0; i < 5; i++) knop.click();
    await wacht(800);
    window.renderTourMap = echt;
    return { renders, kaart: document.getElementById('screen-map').classList.contains('active'),
             grendel: terugBezig };
  });
  check(r.renders === 1 && r.kaart, 'vijf tikken op terug bouwen één kaart', JSON.stringify(r));
  check(r.grendel === false, 'en de grendel op de terugweg staat daarna weer open', JSON.stringify(r));

  /* ---- 6e · Tien keer in en uit ----
     Niets mag blijven staan: geen tweede zaal, geen vertrekkend scherm, geen
     tweede actief scherm, en geen teller die na de show door blijft lopen. Die
     laatste liep hiervoor wél door -- de spotlight-teller hing aan G en was na
     het vervangen van G niet meer te stoppen. */
  r = await page.evaluate(async () => {
    const wacht = ms => new Promise(res => setTimeout(res, ms));
    for (let i = 0; i < 10; i++) {
      goMap(); await wacht(120);
      document.querySelector('.tour-stop:not(.locked)').click();
      await wacht(380);
      quitGame(); await wacht(380);
    }
    return { heen: overgangBezig, terug: terugBezig,
             kaart: document.getElementById('screen-map').classList.contains('active'),
             zalen: document.querySelectorAll('.venue').length,
             wegvallend: document.querySelectorAll('.wegvallend').length,
             actief: document.querySelectorAll('.screen.active').length };
  });
  check(r.kaart && !r.heen && !r.terug && r.actief === 1 && r.wegvallend === 0 && r.zalen === 2,
    'tien keer een show in en uit laat niets staan', JSON.stringify(r));

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

  /* ---- 10 · De app opnieuw openen ----
     Waar de voortgang precies op staat hangt af van hoeveel er hierboven gespeeld
     is, en dat verschuift zodra deze rondgang een stap langer wordt. Wat de
     controle wil weten is niet het getal maar het verschil: staat er ná het
     opnieuw openen nog precies wat er vlak ervóór stond? Dus eerst opschrijven,
     dan herladen, dan vergelijken. */
  const voorHerladen = await page.evaluate(() => {
    // uit de opslag en niet uit P(): §9 heeft net teruggedrukt naar de
    // sterrenkeuze, en daar is er geen gekozen ster meer
    const q = JSON.parse(localStorage.getItem('rekenPopsterren_v1')).profiles.p1;
    return { level: q.level, sterren: Object.keys(q.stars).length, spullen: q.owned.length };
  });
  check(voorHerladen.level > 9 && voorHerladen.spullen > 7,
    'de rondgang heeft onderweg echt voortgang gemaakt', JSON.stringify(voorHerladen));
  await page.reload();
  await page.waitForTimeout(500);
  r = await page.evaluate(() => {
    const q = JSON.parse(localStorage.getItem('rekenPopsterren_v1')).profiles.p1;
    return { level: q.level, sterren: Object.keys(q.stars).length, spullen: q.owned.length,
             oudeTrofee: q.trophies.indexOf('rockster') >= 0 && q.trophies.indexOf('podiumbouwer') >= 0,
             kaarten: document.querySelectorAll('.profile-card').length };
  });
  check(r.level === voorHerladen.level && r.sterren === voorHerladen.sterren
        && r.spullen === voorHerladen.spullen && r.kaarten === 1,
    'na opnieuw openen staat de hele voortgang er nog',
    JSON.stringify(r) + ' <-> ' + JSON.stringify(voorHerladen));
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
