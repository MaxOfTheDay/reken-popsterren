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
    kaarten: document.querySelectorAll('.ster-tegel').length,
    naam: (document.querySelector('.st-naam') || {}).textContent,
  }));
  check(r.kaarten === 1 && r.naam === 'Nina', 'een bestaande opslag laadt en toont zijn ster', JSON.stringify(r));

  /* ---- 2 · De kaart: ontgrendeling, sterren en de wereld in de kop ---- */
  await page.click('.ster-tegel');
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

  /* ---- 4 · Terug naar de kaart: geen tweede feestje, meteen op pad ----
     Hier stond de omgekeerde verwachting: het sterrentabje moest op de kaart
     landen (.net-af) en de reis moest daarop wachten. Dat is precies wat eruit
     is. Het eindscherm heeft de sterren dan al onthuld, gevierd én door het kind
     laten wegtikken -- ze op de kaart nog een keer laten landen is dezelfde
     mededeling twee keer, met de reis die er een halve seconde achter aansluit.

     Wat er nú hoort te staan: de score gewoon zichtbaar onder de zojuist
     gespeelde halte, zónder dat hij nog een keer komt inlanden, en een ster die
     kort daarna vertrekt. Zie reisBinnenWereld in goMap.

     Twee metingen blijven: kort na de tik (staat de kaart er, en hoe), en na de
     volle reis (is ze aangekomen). */
  await page.click('#btn-end-next');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => {
    const zeven = document.querySelector('.tour-stop[data-lvl="7"]');
    return {
      kaart: document.getElementById('screen-map').classList.contains('active'),
      afAantal: document.querySelectorAll('.tour-stop.net-af').length,
      sterren: zeven ? zeven.querySelectorAll('.cs-vol').length : -1,
      perfect: zeven ? zeven.classList.contains('perfect') : false,
    };
  });
  check(r.kaart, 'de kaart staat er al vóór de reis begint', JSON.stringify(r));
  check(r.afAantal === 0,
    'de kaart viert de sterren niet nog een keer -- dat deed het eindscherm al', JSON.stringify(r));
  check(r.sterren === 3 && r.perfect,
    'maar de score stáát er wel, en drie sterren leest als perfect', JSON.stringify(r));
  await page.waitForTimeout(2600);
  r = await page.evaluate(() => ({
    nu: (document.querySelector('.tour-stop.next') || {}).dataset,
    afAantal: document.querySelectorAll('.tour-stop.net-af').length,
  }));
  check(r.nu && r.nu.lvl === '8', 'terug op de kaart staat de ster op de volgende halte', JSON.stringify(r));
  check(r.afAantal === 0,
    'en ook bij aankomst landt er niets op de nieuwe halte', JSON.stringify(r));
  /* Eenmalig, en dus ook niet bij een latere kaart. Deze controle blijft staan
     omdat hij een ándere weg afdekt dan de reis hierboven: via de kleedkamer
     terugkomen is geen level-up, dus daar wordt netAf niet overgeslagen maar was
     hij simpelweg al verbruikt. */
  r = await page.evaluate(async () => {
    openKleedkamer(); await new Promise(res => setTimeout(res, 250));
    goMap(); await new Promise(res => setTimeout(res, 400));
    return document.querySelectorAll('.tour-stop.net-af').length;
  });
  check(r === 0, 'een latere kaart speelt dat moment niet opnieuw af', 'gevonden ' + r);

  /* ---- 5 · De wereldwissel ----
     De laatste show van een wereld uitspelen: de kaart schuift door naar de
     volgende wereld, het spulletje van die wereld ligt in de kleedkamer, en de
     tekening van de volgende wereld is onderweg al opgehaald (zie
     preloadNextWorldArt).

     Er lág hier ook een trofee klaar ('wereld-muziek'). Die is sinds fase 5C met
     pensioen: uitspelen levert het spulletje op, perfect maken de trofee. */
  await speelShow(8);
  await page.click('#btn-end-next');
  await page.waitForTimeout(3500);
  r = await page.evaluate(() => ({
    wereld: document.getElementById('map-tournee-label').textContent,
    level: P().level,
    nu: (document.querySelector('.tour-stop.next') || {}).dataset,
    spul: P().owned.indexOf('acc_wereld_muziek') >= 0,
    geenBadge: P().readyTrophies.indexOf('wereld-muziek') < 0 && P().trophies.indexOf('wereld-muziek') < 0,
    voorgeladen: [...ART_GEHAALD],
  }));
  check(/Snoepwereld/.test(r.wereld) && r.level === 9, 'de kaart schuift door naar de volgende wereld', JSON.stringify(r));
  check(r.nu && r.nu.lvl === '9', 'de ster staat op de eerste halte daarvan', JSON.stringify(r));
  check(r.spul, 'het spulletje van de afgemaakte wereld ligt in de kleedkamer', JSON.stringify(r));
  check(r.geenBadge, 'en er komt geen tweede beloning als trofee bij', JSON.stringify(r));
  check(r.voorgeladen.some(s => /snoep/.test(s)),
    'de tekening van de volgende wereld was al opgehaald', JSON.stringify(r.voorgeladen));

  /* ---- 6 · De tournee: kijken zonder iets kwijt te raken (fase 4B) ----
     De wereldnaam in de kop opent niet langer een lijstje maar de hele reis; een
     bestemming aantikken brengt je naar díe wereldkaart. Wat er daarbij niet mag
     gebeuren is precies wat er ook bij de kiezer niet mocht: er schuift geen
     voortgang. */
  await page.click('#map-tournee-label');
  await page.waitForTimeout(450);
  check(await page.evaluate(() => document.getElementById('screen-journey').classList.contains('active')),
    'de wereldnaam in de kop opent de tournee', '');
  await page.click('.reis-halte[data-w="0"]');
  await page.waitForTimeout(600);
  r = await page.evaluate(() => ({
    wereld: document.getElementById('map-tournee-label').textContent,
    eerste: (document.querySelector('.tour-stop') || {}).dataset,
    terugZichtbaar: !document.getElementById('world-back').hidden,
    level: P().level,
  }));
  check(/Muziekwereld/.test(r.wereld) && r.eerste.lvl === '1' && r.terugZichtbaar && r.level === 9,
    'een eerdere wereld bekijken verandert niets aan de voortgang', JSON.stringify(r));
  check(await page.evaluate(() => document.getElementById('screen-map').classList.contains('active')),
    'en een bestemming kiezen brengt je op de échte wereldkaart', '');
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

  /* Snel tikken: een kind ratelt op de bestemmingen. Dat hoort in één wereld te eindigen,
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
    'acht tikken achter elkaar zijn één wereldwissel', JSON.stringify(r));
  check(r.eerste === r.eersteVanWereld && r.kop.includes(r.naam),
    'de zichtbare kaart en de kop wijzen dezelfde wereld aan', JSON.stringify(r));

  /* ---- 6a2 · De onthulling van een nieuwe wereld ----
     Een wereld die voor het eerst opengaat krijgt méér dan een gewone wissel: eerst
     landen de sterren van de afgemaakte halte (de beloningsbeat, zie
     starRevealBeat), dan een tel stilte op de afgemaakte wereld (daarin beweegt
     er nog niets), dan dezelfde klim maar trager. Hij hangt aan pendingTravel, en
     die wordt alleen bij een level-up gezet -- dus hij kan niet nog eens spelen
     als je later terugkomt.

     De voortgang blijft hier expres staan waar hij stond: dit bootst precies na wat
     het eindscherm doet bij de sprong van halte 8 naar halte 9. */
  r = await page.evaluate(async () => {
    const wacht = ms => new Promise(res => setTimeout(res, ms));
    const voor = P().level;
    pendingTravel = { from: voor - 1, to: voor };      // 8 -> 9: over de wereldgrens
    goMap();
    await wacht(200);                                   // nog in de stilte
    /* De stilte staat óók op slot: een kind dat hier de tournee opent zou eerst
       ergens anders heen reizen en een tel later alsnog de nieuwe wereld
       binnenrijden. De tournee hoort dus niet open te gaan, en de kaart zelf hoort
       geen tikken aan te nemen. */
    openReis();
    const stilte = { view: viewWorldIdx, schaduw: !!document.querySelector('.wereld-schaduw'),
                     grendel: wereldReisBezig(),
                     kiezer: document.getElementById('screen-journey').classList.contains('active'),
                     kaartDicht: document.getElementById('tour-map').style.pointerEvents === 'none' };
    await wacht(1600);                                  // de beloningsbeat is voorbij, de klim loopt
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
    'ook die stilte staat op slot -- geen tournee, geen tik op de kaart', JSON.stringify(r.stilte));
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
    // FASE 4A: één voorbij de laatste wereld bestaat niet meer -- worldForIndex
    // geeft daar null, en dat is precies de bedoeling (geen nepwereld meer).
    for (let i = 0; i < WORLDS.length; i++) {
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
  check(r.rijen.length === r.werelden && r.rijen.every(w => w.aan && w.sfeer),
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

  /* ---- 6f · Eén scherm tegelijk is leesbaar ----
     De regel uit de bewegingstaal, als meting: op élk moment van een overgang
     hoort er precies één dekkend scherm over het venster te liggen. Alleen het
     scherm dat vertrekt wordt doorzichtig; het scherm dat aankomt beweegt.

     Ging dat mis, dan stonden er halverwege twee halfdoorzichtige schermen over
     de achtergrond van de app. Op de weg terug uit een show zag je dat het best:
     het donkere paneel van het eindscherm hing als een brede donkere band dwars
     over een verwassen wereldkaart, en verdween dan met een flits. Opgemeten op
     120ms: eindscherm 53%, kaart 19%, en samen dekten ze niets af.

     Vandaar deze twee metingen, en niet een schermafdruk: "hoe zag het eruit" is
     werk voor de ogen, maar "er lag op geen enkel moment iets dekkends" is een
     getal. De kaart moet daarbij van het eerste beeldje af op 1 staan -- fade't
     die ook maar een tel mee, dan is er een beeldje zonder ondergrond. */
  r = await page.evaluate(async () => {
    const wacht = ms => new Promise(res => setTimeout(res, ms));
    // een show spelen en op het eindscherm belanden
    goMap(); await wacht(200);
    startLevel(P().level); await wacht(300);
    G.misses = 1; endLevel(true);
    await wacht(1200);
    const kaart = document.getElementById('screen-map');
    const eind = document.getElementById('screen-end');
    const op = el => +getComputedStyle(el).opacity;
    // dekt dit scherm het hele venster af? (een rand van 0.5px is afronding)
    const dekt = el => {
      const b = el.getBoundingClientRect();
      return b.left <= 0.5 && b.top <= 0.5
        && b.right >= innerWidth - 0.5 && b.bottom >= innerHeight - 0.5;
    };
    const metingen = [];
    document.getElementById('btn-end-next').click();
    for (let i = 0; i < 30; i++) {
      metingen.push({ kaart: op(kaart), eind: op(eind), maat: dekt(kaart) });
      await new Promise(res => requestAnimationFrame(res));
    }
    return {
      // op elk beeldje ligt er iets dekkends: de kaart eronder, of het eindscherm erover
      dekkend: metingen.every(m => Math.max(m.kaart, m.eind) > 0.999),
      // en de kaart is er altijd volledig -- hij beweegt, hij doft niet
      kaartVol: metingen.every(m => m.kaart > 0.999),
      // ondoorzichtig én zo groot als het venster: kleiner laat de randen los
      kaartDekt: metingen.every(m => m.maat),
      // het eindscherm is wél echt weggegaan (anders meet je een overgang die niet liep)
      eindWeg: metingen.some(m => m.eind < 0.05),
      laagst: Math.min(...metingen.map(m => Math.max(m.kaart, m.eind))).toFixed(3),
    };
  });
  check(r.dekkend && r.eindWeg,
    'op geen enkel beeldje van een overgang schemert de app-achtergrond erdoor', JSON.stringify(r));
  check(r.kaartVol,
    'de kaart komt ondoorzichtig op en beweegt alleen', JSON.stringify(r));
  check(r.kaartDekt,
    'en hij is op elk beeldje zo groot als het venster', JSON.stringify(r));

  /* ---- 6g · ...en dat geldt óók op de weg naar binnen ----
     Dezelfde meting, andere richting: een halte in. Hier stond het aankomende
     scherm op scale(.94) translateY(10px) -- ondoorzichtig, maar 6% te klein, dus
     je zag het als een kaartje midden in beeld met een rand van het vorige scherm
     eromheen. Op de kaart viel dat het meest op aan de weg: de stippellijn stond
     eerst kleiner en schoof daarna op zijn plek. Een aankomend scherm begint
     daarom nooit kleiner dan 1. */
  await page.evaluate(() => goMap());
  await page.waitForTimeout(500);
  r = await page.evaluate(async () => {
    const spel = document.getElementById('screen-game');
    const kaart = document.getElementById('screen-map');
    const op = el => +getComputedStyle(el).opacity;
    const dekt = el => {
      const b = el.getBoundingClientRect();
      return b.left <= 0.5 && b.top <= 0.5
        && b.right >= innerWidth - 0.5 && b.bottom >= innerHeight - 0.5;
    };
    const metingen = [];
    document.querySelector('.tour-stop.next').click();
    for (let i = 0; i < 30; i++) {
      metingen.push({ spel: op(spel), kaart: op(kaart), maat: dekt(spel) });
      await new Promise(res => requestAnimationFrame(res));
    }
    quitGame();
    return {
      dekkend: metingen.every(m => Math.max(m.spel, m.kaart) > 0.999),
      spelVol: metingen.every(m => m.spel > 0.999),
      spelDekt: metingen.every(m => m.maat),
      kaartWeg: metingen.some(m => m.kaart < 0.05),
    };
  });
  await page.waitForTimeout(500);
  check(r.dekkend && r.kaartWeg,
    'een halte in: ook daar schemert er nooit iets doorheen', JSON.stringify(r));
  check(r.spelVol && r.spelDekt,
    'de zaal komt ondoorzichtig op en is nooit kleiner dan het venster', JSON.stringify(r));

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

  /* DE CATEGORIERIJ LOOPT ZICHTBAAR DOOR. Er staan zeven laden in een rij die er
     op een telefoon vijf à zes kwijt kan, dus de rij scrolt -- en dan is de enige
     vraag die telt of een kind kán zien dat er meer staat. Dat ging mis bij
     Accessoires: die knop landde kraakhelder tegen de fade aan en Dieren erachter
     was een grauwsluier van 28px, waardoor de rij ophield bij het felste ding op
     het scherm. Sindsdien rekent tabRijDoel() uit waar de rij hoort te staan.

     Drie dingen per categorie, en ze zijn alle drie met het oog te controleren:
       - de gekozen knop staat helemáal in beeld (nooit half onder een rand)
       - de fade staat aan precies de kant waar nog iets zit, en nergens anders
       - zit er rechts nog iets, dan steekt daar een kier van een volgend knopje
         uit die groot genoeg is om te zíen (TAB_SNIPPER, 24px)
     Uitzondering op de laatste: bij de eérste categorie ligt de rij aan het begin
     verankerd -- doorschuiven zou de gekozen knop zelf tegen de rand duwen -- en
     doet de fade over de laatste hele knop het werk. */
  const rij = await page.evaluate(async () => {
    const uit = [];
    const el = document.getElementById('shop-tabs');
    for (const c of CATS) {
      openKleedkamerCat(c.id);
      await new Promise(res => setTimeout(res, 420));   // scroll-behavior: smooth
      const vak = el.getBoundingClientRect(), breed = el.clientWidth;
      const max = el.scrollWidth - breed;
      let kier = null, heel = false, eerste = false;
      el.querySelectorAll('.tab-btn').forEach((b, i) => {
        const bb = b.getBoundingClientRect(), l = bb.left - vak.left, r = bb.right - vak.left;
        if (b.classList.contains('active')) { heel = l >= -0.5 && r <= breed + 0.5; eerste = i === 0; }
        if (r > breed && kier === null) kier = Math.max(0, breed - l);
      });
      uit.push({ cat: c.id, heel, eerste, kier: kier === null ? null : Math.round(kier),
        meerR: max > 2 && el.scrollLeft < max - 2, meerL: el.scrollLeft > 2,
        fadeR: el.classList.contains('can-right'), fadeL: el.classList.contains('can-left') });
    }
    return uit;
  });
  check(rij.length === 7 && rij.every(c => c.heel),
    'de gekozen categorie staat altijd helemaal in beeld',
    JSON.stringify(rij.filter(c => !c.heel)));
  check(rij.every(c => c.fadeR === c.meerR && c.fadeL === c.meerL),
    'de fade staat aan de kant waar nog meer staat, en alleen daar',
    JSON.stringify(rij.filter(c => c.fadeR !== c.meerR || c.fadeL !== c.meerL)));
  const zwak = rij.filter(c => c.meerR && !c.eerste && (c.kier === null || c.kier < 24));
  check(zwak.length === 0,
    'loopt de rij rechts door, dan steekt daar een zichtbare kier van het volgende knopje uit',
    JSON.stringify(zwak));
  check(rij.some(c => c.meerR), 'de rij is op een telefoon ook echt breder dan het scherm', JSON.stringify(rij));
  await page.evaluate(() => openKleedkamerCat('dress'));
  await page.waitForTimeout(300);
  /* Eerst: tikken kóópt niet. Een tik op iets dat nog niet van haar is kiest het --
     de pop past het en de lade onderaan zegt wat het kost -- en drie tikken doen
     precies hetzelfde als één. Diamanten uitgeven blijft een aparte, benoemde
     handeling; dat is de enige stap in dit scherm die niet met één tik terug te
     draaien is. */
  const tikken = await page.evaluate(async id => {
    const dia = P().diamonds;
    for (let i = 0; i < 3; i++) {
      document.querySelector(`.item-card[data-item="${id}"]`).click();
      await new Promise(res => setTimeout(res, 120));
    }
    const bar = document.getElementById('dress-bar');
    return { dia, naDia: P().diamonds, bezit: P().owned.includes(id),
      gekozen: shopSelectedId, knop: !!document.getElementById('db-buy'),
      lade: bar.textContent.replace(/\s+/g, ' ').trim() };
  }, r.id);
  check(!tikken.bezit && tikken.naDia === tikken.dia,
    'drie tikken op iets dat te koop staat kopen het niet', JSON.stringify(tikken));
  check(tikken.gekozen === r.id && tikken.knop && /Koop/.test(tikken.lade),
    'ze zetten de koop-lade neer, met de prijs erop', JSON.stringify(tikken));
  // En kopen doet het spulletje meteen aan: dat is de beloning, niet een tweede tik.
  await page.evaluate(() => document.getElementById('db-buy').click());
  await page.waitForTimeout(300);
  const na = await page.evaluate(id => ({
    bezit: P().owned.includes(id),
    aan: Object.values(P().equipped).includes(id),
    lade: getComputedStyle(document.getElementById('dress-bar')).display,
  }), r.id);
  check(na.bezit && na.aan, 'kopen doet het gekochte stuk meteen aan', JSON.stringify(na));
  check(na.lade === 'none', 'en daarna is de koop-lade weg', JSON.stringify(na));

  /* ---- 7b · Eén tik doet het aan, en er springt niets ----
     Twee afspraken in één meting, want ze gaan over dezelfde tik.

     DE TIK. Tikken op kleren die al van je zijn dóét ze aan -- geen tussenstand
     waarin het stuk "gekozen" is en er onderaan een knop verschijnt om het echt
     aan te doen. Nog eens tikken op wat aanstaat is nadrukkelijk niets: een kind
     dat nog eens op haar jurk tikt wil hem niet kwijt.

     HET SPRINGEN. De kleedkamer bouwt het rek sinds fase 5B niet bij élke tik
     opnieuw op: aandoen werkt de kaartjes bij die er al staan. Dat is precies het
     soort verbetering dat stilletjes weer weg kan gaan -- en als dat gebeurt,
     schuift het kaartje onder de vinger van het kind vandaan. Deze controle kijkt
     naar wat dat kind zou merken: staat het kaartje dat ik aantik daarna nog op
     dezelfde plek op het scherm? */
  r = await page.evaluate(async () => {
    const meet = id => {
      const k = document.querySelector(`.item-card[data-item="${id}"]`);
      return k ? Math.round(k.getBoundingClientRect().top) : null;
    };
    const lijst = () => [...document.querySelectorAll('.item-card')].map(c => c.dataset.item).join();
    const nu = () => ({
      lijst: lijst(), top: meet(doel), scroll: document.getElementById('screen-dress').scrollTop,
      goud: document.querySelector('.item-card.equipped') && document.querySelector('.item-card.equipped').dataset.item,
      sel: document.querySelector('.item-card.selected') && document.querySelector('.item-card.selected').dataset.item,
      lade: getComputedStyle(document.getElementById('dress-bar')).display,
      pil: document.querySelector(`.item-card[data-item="${doel}"] .item-status`).textContent.trim(),
      aan: P().equipped[item(doel).cat],
    });
    // een stuk dat ze al heeft en niet aanheeft
    const bezit = [...document.querySelectorAll('.item-card.owned')];
    const doel = bezit.length ? bezit[bezit.length - 1].dataset.item : null;
    if (!doel) return { doel: null };
    const voor = nu();
    document.querySelector(`.item-card[data-item="${doel}"]`).click();
    await new Promise(res => setTimeout(res, 150));
    const eenTik = nu();
    // en nog eens: dat hoort niets te doen, en zeker niet uit te trekken
    document.querySelector(`.item-card[data-item="${doel}"]`).click();
    await new Promise(res => setTimeout(res, 150));
    const nogEens = nu();
    return { doel, voor, eenTik, nogEens };
  });
  check(r.doel && r.eenTik.aan === r.doel && r.eenTik.goud === r.doel
     && r.eenTik.pil.indexOf('Aan') >= 0 && r.eenTik.sel === null && r.eenTik.lade === 'none',
    'één tik op een stuk dat van haar is doet het aan, zonder balk ertussen', JSON.stringify(r));
  check(r.doel && r.eenTik.lijst === r.voor.lijst
     && r.eenTik.top === r.voor.top && r.eenTik.scroll === r.voor.scroll,
    'en het rek blijft staan waar het staat -- alleen het goud verhuist', JSON.stringify(r));
  check(r.doel && r.nogEens.aan === r.doel && r.nogEens.goud === r.doel
     && r.nogEens.top === r.voor.top && r.nogEens.lade === 'none',
    'nog eens tikken op wat aanstaat is veilig niets', JSON.stringify(r));

  /* ---- 7c · Heen en weer tussen de tabbladen ----
     SNEL HEEN EN WEER. schermWeg, schermKomtOp en kaartKomtOp stoppen bij een
     tik alleen de animaties die ze zelf op een scherm zetten (zie schermAnims)
     -- niet meer alles wat getAnimations() vindt, want dat dwong midden in de
     tik de opmaak af.
     Het gevaar daarvan is precies één ding: een scherm waar je terugkomt terwijl
     het nog aan het wegdoven is, draagt de opacity 0 van dat vertrek nog. Wordt
     die niet gestopt, dan kijkt het kind naar een scherm dat er niet is. Zet
     iemand ooit een nieuwe animatie op een heel scherm zonder schermAnim, dan
     valt het hier om.

     Dus: tikken met 40ms ertussen, ruim binnen het wegdoven, en daarna elk
     beeldje nameten. Het scherm dat er staat hoort vanaf het eerste beeldje
     dekkend te zijn (aankomen is alleen beweging, zie schermKomtOp en
     kaartKomtOp), en na
     afloop staat er niets meer: geen animatie, geen .wegvallend, geen tweede
     actief scherm.

     DE PLEK BLIJFT. Terug naar de kleedkamer vanaf een ánder tabblad hervat waar
     je was, ook hoe ver je naar beneden stond (zie resumeKleedkamer). Dat deed
     het niet: renderShop maakte het rek eerst leeg, en een opmaak die daar
     tussendoor werd afgedwongen mat een scherm dat niet meer hoog genoeg was om
     te scrollen -- en zette het terug naar bovenaan. */
  r = await page.evaluate(async () => {
    const wacht = ms => new Promise(res => setTimeout(res, ms));
    const beeldje = () => new Promise(res => requestAnimationFrame(res));
    const uit = [];
    // elke reeks begint op de kaart; die met 'map' achteraan komen terug op een
    // kaart die nog aan het wegdoven is -- dat is kaartKomtOp, de andere schermKomtOp
    for (const reeks of [['dress', 'map', 'dress'], ['dress', 'tro', 'dress'],
                         ['tro', 'dress', 'tro'], ['dress', 'map'], ['tro', 'map'],
                         ['dress', 'map', 'tro', 'map'], ['dress', 'dress']]) {
      goMap(); await wacht(700);
      for (const t of reeks) { navGo(t); await wacht(40); }
      const el = document.querySelector('.screen.active');
      let minOp = 1;
      for (let i = 0; i < 30; i++) { minOp = Math.min(minOp, +getComputedStyle(el).opacity); await beeldje(); }
      await wacht(500);
      uit.push({ reeks: reeks.join('>'), scherm: el.id, minOp,
        tf: getComputedStyle(el).transform,
        anims: document.querySelectorAll('.screen.active').length === 1
          ? [...document.querySelectorAll('.screen')].reduce((n, s) => n + s.getAnimations().length, 0) : -1,
        wegvallend: document.querySelectorAll('.wegvallend').length });
    }
    return uit;
  });
  check(r.every(x => x.minOp > 0.999),
    'snel heen en weer: het scherm waar je terugkomt is vanaf het eerste beeldje dekkend',
    JSON.stringify(r.filter(x => x.minOp <= 0.999)));
  check(r.every(x => x.tf === 'none' && x.anims === 0 && x.wegvallend === 0),
    'en daarna blijft er niets hangen: geen animatie, geen vertrekkend scherm',
    JSON.stringify(r.filter(x => x.tf !== 'none' || x.anims !== 0 || x.wegvallend !== 0)));

  r = await page.evaluate(async () => {
    const wacht = ms => new Promise(res => setTimeout(res, ms));
    const sc = document.getElementById('screen-dress');
    openKleedkamerCat('dress'); await wacht(500);
    const max = sc.scrollHeight - sc.clientHeight;
    const uit = { max };
    for (const via of ['map', 'tro']) {
      sc.scrollTop = Math.min(180, max);
      const voor = sc.scrollTop;
      navGo(via); await wacht(600);
      navGo('dress'); await wacht(400);
      uit[via] = { voor, na: sc.scrollTop };
    }
    return uit;
  });
  check(r.max > 60, 'de kleedkamer is hoog genoeg om te scrollen (anders meet het volgende niets)', JSON.stringify(r));
  check(r.map.voor > 0 && r.map.na === r.map.voor && r.tro.na === r.tro.voor,
    'terug naar de kleedkamer vanaf een ander tabblad staat ze nog waar je was', JSON.stringify(r));
  await page.evaluate(() => openKleedkamerCat('dress'));
  await page.waitForTimeout(400);

  /* ---- 8 · Trofeeënkast ---- */
  await page.click('#nav-tro');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({
    kast: document.getElementById('screen-trophies').classList.contains('active'),
    kaarten: document.querySelectorAll('.trophy-card, .tro-card').length,
    teller: document.getElementById('trophy-count').textContent,
    // fase 5C: geen kastbalk, geen plankbalk, geen balk per kaartje. PS-32 heeft
    // daar één uitzondering op gemaakt en die staat hieronder apart: de stand-pil
    // in de kop vult zichzelf. Een balk als éígen element blijft weg.
    balken: document.querySelectorAll('#screen-trophies .kast-bar, #screen-trophies .rank-bar, #screen-trophies .trophy-progress').length,
    // PS-32: de groepen staan niet meer in een eigen paneel
    panelen: document.querySelectorAll('#screen-trophies .shelf').length,
    groepen: document.querySelectorAll('#screen-trophies .kast-groep').length,
    groepTelling: document.querySelectorAll('#screen-trophies .groep-telling').length,
    // en geen ster-statusstrook meer aan de voet van de kast
    rangStrook: document.querySelectorAll('#screen-trophies .career-strip').length,
    kopRuim: !document.getElementById('screen-trophies').classList.contains('gescrold'),
  }));
  check(r.kast && r.kaarten > 10, 'de trofeeënkast staat vol kaarten', JSON.stringify(r));
  /* PS-32 -- de stand staat als pil in de kop: "3 / 18 verzameld", dezelfde
     woorden waarmee het schattenvak in de kleedkamer telt. */
  check(/\d+\s*\/\s*\d+\s+verzameld/.test(r.teller), 'de kastteller staat er', r.teller);
  check(r.balken === 0, 'en er staat geen losse voortgangsbalk op het scherm', r.balken);
  check(r.panelen === 0 && r.groepen === 4 && r.groepTelling === 4,
    'de vier groepen staan als kopregel met een eigen stand, niet als paneel', JSON.stringify(r));
  check(r.rangStrook === 0, 'de kast eindigt bij de trofeeën, zonder ster-statusstrook', r.rangStrook);
  check(r.kopRuim, 'bovenaan staat de ruime kop', 'kop staat meteen in de krappe stand');

  /* De krappe kop: zodra er gescrold wordt klapt de zin met de stand weg en wordt
     de plaat dekkender, zodat er geen trofeenamen meer door de kop heen lezen. */
  const gescrold = await page.evaluate(async () => {
    const sc = document.getElementById('screen-trophies');
    sc.scrollTop = 260;
    // de inklapping duurt 220ms (zie .kast-telling); 200 was er altijd al net
    // te krap voor en viel onder belasting soms om
    await new Promise(res => setTimeout(res, 400));
    const zin = document.getElementById('trophy-count');
    return {
      klasse: sc.classList.contains('gescrold'),
      zinWeg: zin.getBoundingClientRect().height < 2,
      titel: !!document.querySelector('#screen-trophies .header-title'),
      terug: !!document.querySelector('#screen-trophies .header-left'),
    };
  });
  check(gescrold.klasse && gescrold.zinWeg, 'gescrold krimpt de kop en klapt de stand-zin weg',
    JSON.stringify(gescrold));
  check(gescrold.titel && gescrold.terug, 'maar terug en de titel blijven staan', JSON.stringify(gescrold));

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
             kaarten: document.querySelectorAll('.ster-tegel').length };
  });
  check(r.level === voorHerladen.level && r.sterren === voorHerladen.sterren
        && r.spullen === voorHerladen.spullen && r.kaarten === 1,
    'na opnieuw openen staat de hele voortgang er nog',
    JSON.stringify(r) + ' <-> ' + JSON.stringify(voorHerladen));
  check(r.oudeTrofee, 'een gepensioneerde trofee blijft ongemoeid in de opslag staan', JSON.stringify(r));

  /* ---- 12 · Wat er bij het opstarten NIET geladen wordt (fase 6B) ----
     De regel: het aantal werelden groeit, en het opstarten mag daar niet in
     meegroeien. Eén lus over WORLDS die art aanraakt is genoeg om dat te breken,
     en je merkt het aan niets -- behalve aan de telefoondata van een gezin.

     Daarom een verse sessie, en twee metingen langs twee kanten: wat de app
     dénkt te hebben aangevraagd (ART_GEHAALD) en wat er écht over de lijn is
     gegaan (de aanvragen van de browser). Die tweede is de belangrijkste: een
     <img> die ergens in de opmaak sluipt staat niet in ART_GEHAALD.

     De grenzen zijn vaste kleine getallen en geen som over WORLDS: "niet meer
     dan de wereld waar ze staat plus haar buurman" is de regel, en die hoort
     hetzelfde te zijn bij zes werelden en bij twaalf.

     De aanvragen worden op twee stapels gelegd, en dat onderscheid is de hele
     regel. Wat uit assets/world/ komt is wereldtekening en groeit mee met WORLDS
     -- dáár gaat deze controle over. Wat daarbuiten ligt is een vast beeld van een
     scherm en groeit nergens in mee; op de sterrenkeuze zijn dat er drie: het
     schilderij erachter (assets/bg/landing.webp), het spelogo erop
     (assets/branding/wordmark.webp), en het merkteken waarmee dat logo bij het
     opstarten binnenkomt (assets/branding/mark.webp -- zie "= Het spelogo komt
     binnen"). Dat derde is er één keer per start en daarna uit de voorraad; het
     groeit net zo min mee als de andere twee.

     Eerder telde de meting álles onder assets/ als wereldtekening, en dus viel
     hij om op dat schilderij: "het startscherm haalt geen enkele wereldtekening
     op: [] / [landing.webp]" -- terwijl ART_GEHAALD (de app zelf) gewoon leeg
     was. De meting zei iets anders dan zijn eigen kop. Dat is nu recht, en de
     tweede stapel wordt niet weggegooid maar apart bewaakt: een lus over WORLDS
     die per wereld iets uit assets/bg/ zou halen hoort hier nog steeds om te
     vallen. */
  const verseCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await cacheFonts(verseCtx);
  const vers = await verseCtx.newPage();
  const opgehaald = [];   // wereldtekeningen: assets/world/...
  const anders = [];      // de vaste beelden van een scherm: assets/bg/... enz.
  vers.on('request', req => {
    const pad = new URL(req.url()).pathname;
    if (!/\.(webp|png|jpe?g|avif)$/i.test(pad)) return;
    if (/\/assets\/world\//i.test(pad)) opgehaald.push(pad.split('/').pop());
    else if (/\/assets\//i.test(pad)) anders.push(pad.split('/').pop());
  });
  await vers.goto(SPEL_URL);
  await vers.evaluate(() => {
    localStorage.clear();
    const q = defaultProfile('Iris', 'dress_blauw');
    q.order = 0; q.level = 27; for (let i = 1; i < 27; i++) q.stars[i] = 3;
    db.profiles = { p1: q }; save();
  });
  opgehaald.length = 0;
  anders.length = 0;
  await vers.goto(SPEL_URL);
  await vers.waitForTimeout(1200);
  r = await vers.evaluate(() => ({
    scherm: (document.querySelector('.screen.active') || {}).id,
    werelden: WORLDS.length,
    gehaald: [...ART_GEHAALD],
  }));
  check(r.scherm === 'screen-profile' && r.werelden >= 2,
    'de verse sessie staat op de sterrenkeuze', JSON.stringify(r));
  check(r.gehaald.length === 0 && opgehaald.length === 0,
    'het startscherm haalt geen enkele wereldtekening op',
    JSON.stringify(r.gehaald) + ' / ' + JSON.stringify(opgehaald));
  /* En zijn eigen beelden zijn er drie en blijven er drie: het schilderij achter de
     sterrenkeuze, het logo erop en het merkteken van de intro horen niet mee te
     groeien met het aantal werelden of kinderen. Eén logo per kind zou hier
     omvallen, en dat is de bedoeling. */
  check(anders.length <= 3, 'en zijn eigen beelden zijn er hooguit drie',
    r.werelden + ' werelden, buiten assets/world/: ' + JSON.stringify(anders));

  await vers.click('.ster-tegel');
  await vers.waitForTimeout(2500);
  r = await vers.evaluate(() => ({
    scherm: (document.querySelector('.screen.active') || {}).id,
    werelden: WORLDS.length,
    gehaald: [...ART_GEHAALD],
  }));
  check(r.scherm === 'screen-map', 'en één tik brengt haar op de kaart', JSON.stringify(r));
  check(r.gehaald.length <= 3,
    'de kaart haalt de wereld waar ze staat op, plus hooguit haar buren',
    r.werelden + ' werelden, opgehaald: ' + JSON.stringify(r.gehaald));
  check(opgehaald.length <= 3 && opgehaald.length >= 1,
    'en de browser vraagt er ook echt niet meer op dan dat',
    r.werelden + ' werelden, over de lijn: ' + JSON.stringify(opgehaald));
  check(anders.length <= 3, 'en buiten de wereldtekeningen blijft het bij die drie beelden',
    r.werelden + ' werelden, buiten assets/world/: ' + JSON.stringify(anders));
  /* De tekening van de wereld waar ze op staat hoort erbij te zitten -- anders is
     "hooguit drie" gehaald door er nul op te halen, en dan kijkt ze naar een kaart
     zonder wereld. */
  check(r.gehaald.some(a => /piraten/.test(a)),
    'en de wereld die ze op het scherm heeft zit erbij', JSON.stringify(r.gehaald));
  await verseCtx.close();

  /* ---- 13 · De wereldnaam in de kop past op elke telefoon (fase 6C) ----
     De naam is het enige woord op het hoofdscherm, en hij werd afgeknipt: de
     middenkolom van de kop is (schermbreedte - 204) breed en "Piratenwereld" is
     177, dus op 375 viel er 6 pixel af, op 360 twintig en op 320 zestig. Zonder
     ellips (die werkt niet op een inline-flex-knop) werd dat een harde snee:
     "Junglewer".

     Vandaar deze meting, over élke wereld en over de maten die er echt zijn --
     geen vastgelegde getallen, want een nieuwe wereld met een langere naam hoort
     hier om te vallen en niet op een tablet van iemand anders. */
  const kopCtx = await browser.newContext();
  await cacheFonts(kopCtx);
  const kop = await kopCtx.newPage();
  for (const maat of [[320, 568], [360, 800], [375, 812], [390, 844], [412, 915], [768, 1024]]) {
    await kop.setViewportSize({ width: maat[0], height: maat[1] });
    await kop.goto(SPEL_URL);
    await kop.evaluate(() => {
      localStorage.clear();
      const q = defaultProfile('Langenaam', 'dress_blauw');
      q.order = 0; q.diamonds = 1234;
      db.profiles = { p1: q }; save();
    });
    const af = await kop.evaluate(async () => {
      cur = 'p1';
      const kwijt = [];
      for (let i = 0; i < WORLDS.length; i++) {
        const q = P();
        q.stars = {}; for (let l = 1; l < WORLD_START[i]; l++) q.stars[l] = 3;
        q.level = WORLD_START[i];
        viewWorldIdx = null; goMap();
        await new Promise(r => setTimeout(r, 80));
        const el = document.getElementById('map-tournee-label');
        if (el.scrollWidth > el.clientWidth + 1) kwijt.push(`${WORLDS[i].name} (${el.scrollWidth}>${el.clientWidth})`);
      }
      return kwijt;
    });
    check(af.length === 0, 'geen wereldnaam wordt in de kop afgeknipt', maat.join('x') + ': ' + af.join(', '));
  }
  await kopCtx.close();

  /* ================= De zaal is één ruimte =================
   * FASE 7A. In de zaal lagen vier lagen over elkaar, en één ervan hield midden op
   * het scherm op precies waar hij het felst was: het voetlicht (.venue-licht::after)
   * had zijn ovaal met het middelpunt op zijn eigen ónderrand staan. Wat je zag was
   * geen uitdovende gloed maar een kaarsrechte streep dwars over het scherm, op 70%
   * hoogte (64% op een kort scherm). In élke wereld, op élke schermmaat -- opgemeten
   * over zes werelden en vier maten, altijd op dezelfde breuk van de hoogte.
   *
   * Wat hier vastligt is de regel eronder, niet het getal: een laag die níét tot de
   * onderrand van de zaal doorloopt, mag geen verloop hebben dat op zijn eigen rand
   * gecentreerd staat. Een verloop dooft uit naar zijn buitenkant; staat het
   * middelpunt op de rand van het doosje, dan wordt de hélft ervan afgeknipt en is
   * die knip een lijn. Dat geldt voor elke laag die er later bij komt, en het is te
   * meten zonder naar pixels te kijken.
   *
   * En de laag eronder: .venue dekt het spelscherm, en het spelscherm dekt het
   * venster -- anders komt de achtergrond van de app onder de zaal vandaan. */
  {
    for (const [w, h] of [[320, 568], [390, 844], [412, 915], [768, 1024]]) {
      const zaalCtx = await browser.newContext({ viewport: { width: w, height: h } });
      await cacheFonts(zaalCtx);
      const zp = await zaalCtx.newPage();
      zp.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
      await zp.goto(APP_URL + '&demo&star=p1');
      await zp.waitForFunction(() => typeof selectProfile === 'function');
      const r = await zp.evaluate(async () => {
        const uit = { dekking: [], randlagen: [] };
        const getal = t => parseFloat(t) || 0;
        for (let i = 0; i < WORLDS.length; i++) {
          const q = P();
          q.stars = {}; for (let l = 1; l < WORLD_START[i]; l++) q.stars[l] = 3;
          q.level = WORLD_START[i];
          startLevel(WORLD_START[i]);
          await new Promise(res => setTimeout(res, 60));
          const scherm = document.getElementById('screen-game');
          const zaal = scherm.querySelector('.venue');
          const s = scherm.getBoundingClientRect(), z = zaal.getBoundingClientRect();
          if (s.top > 0.5 || s.bottom < innerHeight - 0.5 || z.top > s.top + 0.5 || z.bottom < s.bottom - 0.5) {
            uit.dekking.push(WORLDS[i].id + ' scherm ' + Math.round(s.top) + '-' + Math.round(s.bottom)
              + ' zaal ' + Math.round(z.top) + '-' + Math.round(z.bottom) + ' venster ' + innerHeight);
          }
          /* Elke laag in de zaal, inclusief de twee pseudo-elementen. Voor een
             pseudo-element komt de doos uit de stijl (top/height t.o.v. .venue-licht,
             dat zelf inset:0 heeft en dus de hele zaal is). */
          const licht = zaal.querySelector('.venue-licht');
          const lagen = [
            ['.venue-sfeer', getComputedStyle(zaal.querySelector('.venue-sfeer')), z.height, 0],
            ['.venue-art', getComputedStyle(zaal.querySelector('.venue-art')), z.height, 0],
            ['.venue-licht', getComputedStyle(licht), z.height, 0],
            ['.venue-licht::before', getComputedStyle(licht, '::before'), null, null],
            ['.venue-licht::after', getComputedStyle(licht, '::after'), null, null],
          ];
          lagen.forEach(([naam, cs]) => {
            const top = getal(cs.top), hoog = getal(cs.height);
            const raaktOnder = top + hoog >= z.height - 1;
            if (raaktOnder) return;                    // loopt door tot onderaan: geen rand
            // "radial-gradient(60% 50% at 50% 50%, ...)" -- de verticale positie
            (cs.backgroundImage.match(/at\s+[\d.]+%\s+[\d.]+%/g) || []).forEach(m => {
              const y = parseFloat(m.split(/\s+/)[2]);
              if (y <= 0.5 || y >= 99.5) uit.randlagen.push(WORLDS[i].id + ' ' + naam + ' ' + m);
            });
          });
        }
        return uit;
      });
      check(r.dekking.length === 0, 'de zaal dekt het hele spelscherm — ' + w + 'x' + h,
        r.dekking.join(' | '));
      check(r.randlagen.length === 0,
        'geen zaallaag houdt op waar zijn verloop het felst is — ' + w + 'x' + h,
        r.randlagen.join(' | '));
      await zaalCtx.close();
    }
  }

  /* ================= 9 · De kaart zegt hallo =================
     Eén zwaai als de kaart zélf de aankomst is, en geen als er al iets beweegt
     dat uitlegt waaróm de ster daar staat. Dat is de hele regel (zie kaartGroet
     boven goMap), en hij is alleen iets waard als hij aan beide kanten klopt --
     dus staan hier de wegen die wél zwaaien naast de wegen die dat niet mogen.

     Er wordt gekeken naar de klassen op de pop en niet naar een schermafdruk:
     "ze zwaait" is in dit bestand letterlijk .dancing.move-wave, en "ze staat
     gewoon" is .idle. Het onderscheid dat ertoe doet -- gebeurt er íets, of
     niet -- is daarmee een waarde en geen oordeel. */
  {
    const groetCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await cacheFonts(groetCtx);
    const g = await groetCtx.newPage();
    g.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    g.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) pageErrors.push('CONSOLE ' + m.text()); });
    await g.goto(SPEL_URL);
    await g.evaluate(() => {
      localStorage.clear();
      const q = defaultProfile('Roos', 'dress_roze');
      q.order = 0; q.level = 5; for (let i = 1; i < 5; i++) q.stars[i] = 3;
      db.profiles = { p1: q }; save();
    });
    await g.goto(SPEL_URL);
    await g.evaluate(() => {
      // de pop op de kaart, in klassen: 'dancing move-wave' of 'idle'
      window.__ster = () => {
        const el = document.querySelector('#tour-map .tour-hero .avatar-holder');
        return el ? el.className : '(geen ster op de kaart)';
      };
    });
    // de zwaai begint op MOTION.totaal en duurt .9s: hier zit hij er middenin
    const kijk = async (ms) => { await g.waitForTimeout(ms == null ? 450 : ms); return g.evaluate(() => window.__ster()); };
    const rust = () => g.waitForTimeout(2700);   // ruim over de koeltijd heen

    let k = (await g.evaluate(() => selectProfile('p1')), await kijk());
    check(/move-wave/.test(k), 'een ster kiezen komt aan op de kaart, en daar wordt gezwaaid', k);

    // binnen de koeltijd heen en weer: één zwaai per bezoek, niet drie
    k = await g.evaluate(async () => {
      openKleedkamer();
      await new Promise(r => setTimeout(r, 150));
      goMap();
      await new Promise(r => setTimeout(r, 450));
      return window.__ster();
    });
    check(!/move-wave/.test(k), 'meteen heen en weer naar de kleedkamer zwaait niet nóg een keer', k);

    await rust();
    k = await g.evaluate(async () => {
      openTrophies();
      await new Promise(r => setTimeout(r, 200));
      goMap();
      await new Promise(r => setTimeout(r, 450));
      return window.__ster();
    });
    check(/move-wave/.test(k), 'maar een echte terugkomst uit de kast later wél', k);

    // en daarna staat ze gewoon weer te wiegen -- geen klasse blijft hangen
    k = await kijk(900);
    check(k === 'avatar-holder idle', 'na de zwaai staat ze weer gewoon op haar plek', k);

    /* Wegwandelen middenin de zwaai stopt hem. Niet uit netheid: een zwaai die
       doorloopt op een scherm dat je verlaten hebt vecht om beeldjes met wat er
       dán begint, en dat is meestal de vlucht naar Werelden -- de enige animatie
       in de app die van élk beeldje afhangt. Opgemeten lag de tekening op het
       eerste beeldje van die vlucht al 18% op weg. */
    await rust();
    const onderbroken = await g.evaluate(async () => {
      openTrophies();
      await new Promise(r => setTimeout(r, 200));
      goMap();
      await new Promise(r => setTimeout(r, 450));
      const tijdens = window.__ster();
      openReis();
      await new Promise(r => setTimeout(r, 80));
      return { tijdens, nog: window.__ster() };
    });
    check(/move-wave/.test(onderbroken.tijdens) && !/move-wave|dancing/.test(onderbroken.nog),
      'wegwandelen middenin de zwaai stopt hem, en laat niets bewegen op een scherm dat weg is',
      JSON.stringify(onderbroken));
    await g.evaluate(() => goMap());
    await g.waitForTimeout(600);

    /* ---- De naad tussen wiegen en zwaaien ----
       Het wiegen en het pasje zijn twee lagen (zie de CSS bij de danspasjes) en
       juist daarom is er geen wissel meer: het pasje staat op de tekening, het
       wiegen op de pop, en elk pasje voegt op 0% en 100% niets toe. Wat hier
       gemeten wordt is precies dat -- de stand die een kind écht ziet (houder
       maal tekening), beeldje voor beeldje, op de twee momenten waar het pasje
       aan- en weer uitgaat.

       Stonden ze weer op één element, dan botsen ze over de ruststand: sway
       begint op -2,5 graden en elk pasje op 0. Opgemeten was dat 2,07 graden bij
       het inzetten en 2,5 bij het uitlopen, allebei in één beeldje en allebei op
       het rustigste moment van de beweging. Het wiegen zelf legt zo'n 0,12 graad
       per beeldje af, dus een halve graad is ruim boven de ruis en ver onder een
       tikje dat je ziet. (Middenin het pasje mág het hard gaan -- daar is het
       beweging en geen naad, en daar wordt dus niet naar gekeken.) */
    await rust();
    const naad = await g.evaluate(async () => {
      openTrophies();
      await new Promise(r => setTimeout(r, 200));
      goMap();
      // de stand die je ziet: het wiegen van de pop maal het pasje op haar laagje
      const pose = () => {
        const h = document.querySelector('#tour-map .tour-hero .avatar-holder');
        const laag = h && h.querySelector('.pas-laag');
        if (!laag) return null;
        const M = el => new DOMMatrixReadOnly(getComputedStyle(el).transform);
        const m = M(h).multiply(M(laag));
        return { deg: Math.atan2(m.b, m.a) * 180 / Math.PI, pas: /move-/.test(h.className) };
      };
      const rij = [];
      await new Promise(klaar => {
        const t0 = performance.now();
        const stap = () => {
          const p = pose(); if (p) rij.push(p);
          if (performance.now() - t0 < 1700) requestAnimationFrame(stap); else klaar();
        };
        requestAnimationFrame(stap);
      });
      // alleen de twee beeldjes waar het pasje aan- of uitgaat
      const stappen = [];
      for (let i = 1; i < rij.length; i++) {
        if (rij[i].pas !== rij[i - 1].pas) stappen.push(+Math.abs(rij[i].deg - rij[i - 1].deg).toFixed(2));
      }
      return { stappen, beeldjes: rij.length, uitslag: +Math.max(...rij.map(x => Math.abs(x.deg))).toFixed(1) };
    });
    check(naad.stappen.length === 2 && naad.stappen.every(d => d < 0.5),
      'het pasje zet in en loopt uit zonder tikje: het wiegen loopt gewoon door',
      JSON.stringify(naad));
    check(naad.uitslag > 4,
      'en het is nog steeds een echte zwaai, geen beleefd knikje', JSON.stringify(naad));
    await g.evaluate(() => goMap());
    await g.waitForTimeout(600);

    await rust();
    k = await g.evaluate(async () => {
      startLevel(2); G.misses = 1; endLevel(true);
      await new Promise(r => setTimeout(r, 400));
      goMap(2);
      await new Promise(r => setTimeout(r, 450));
      return window.__ster();
    });
    check(!/move-wave/.test(k), 'terugkomen uit een show is geen begroeting maar een afloop', k);

    await rust();
    k = await g.evaluate(async () => {
      renderTourMap();
      await new Promise(r => setTimeout(r, 450));
      return window.__ster();
    });
    check(!/move-wave/.test(k), 'de kaart opnieuw tekenen is geen aankomst', k);

    await rust();
    k = await g.evaluate(async () => {
      goMap();   // nog eens op Kaart tikken terwijl je er al staat
      await new Promise(r => setTimeout(r, 450));
      return window.__ster();
    });
    check(!/move-wave/.test(k), 'en op Kaart tikken terwijl je er al staat ook niet', k);

    // een wereld kiezen op de reis: de vlucht is al een aankomst
    await rust();
    const reis = await g.evaluate(async () => {
      openReis();
      await new Promise(r => setTimeout(r, 900));
      reisNaarWereld(0, document.querySelector('.reis-halte[data-w="0"]'));
      const uit = [];
      for (let i = 0; i < 8; i++) { await new Promise(r => setTimeout(r, 180)); uit.push(window.__ster()); }
      return uit.filter(x => /move-wave/.test(x));
    });
    check(reis.length === 0, 'een wereld kiezen op de reis vliegt al -- er komt geen zwaai overheen',
      JSON.stringify(reis));
    await groetCtx.close();

    // en wie om minder beweging vraagt, krijgt de pop precies zoals ze staat
    const stilCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await cacheFonts(stilCtx);
    const st = await stilCtx.newPage();
    st.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    await st.goto(SPEL_URL);
    await st.evaluate(() => {
      localStorage.clear();
      const q = defaultProfile('Roos', 'dress_roze');
      q.order = 0; q.level = 5; for (let i = 1; i < 5; i++) q.stars[i] = 3;
      db.profiles = { p1: q }; save();
    });
    await st.goto(SPEL_URL);
    const stil = await st.evaluate(async () => {
      selectProfile('p1');
      await new Promise(r => setTimeout(r, 900));
      const el = document.querySelector('#tour-map .tour-hero .avatar-holder');
      return { klas: el ? el.className : '(geen ster)', beweegt: el ? getComputedStyle(el).animationName : '?' };
    });
    check(stil.klas === 'avatar-holder idle' && stil.beweegt === 'none',
      'zonder beweging wordt er niet gezwaaid en staat ze in haar gewone stand', JSON.stringify(stil));
    await stilCtx.close();
  }

  /* ================= 10 · Elke schermwissel is er één =================
     PS-51. De bewegingstaal gold voor vier schermen; de kleedkamer, de kast,
     het ouderdeel, het memoryspel, het maakformulier en de sterrenkeuze hadden
     er geen. Wat hier gemeten wordt is niet hoe het eruitziet maar de regel
     eronder, dezelfde als bij zaak 6f: op élk beeldje van een wissel ligt er
     precies één dekkend scherm over het venster. Ligt dat er niet, dan kijk je
     naar de achtergrond van de app, en dát is de "overvloeier tegen niets" die
     van de kaart naar de kleedkamer te zien was.

     En erna hoort er niets te blijven staan: geen tweede actief scherm en geen
     vertrekkend scherm dat vast is komen te zitten. */
  {
    const wisselCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await cacheFonts(wisselCtx);
    const w = await wisselCtx.newPage();
    w.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    w.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) pageErrors.push('CONSOLE ' + m.text()); });
    await w.goto(SPEL_URL);
    await w.evaluate(() => {
      localStorage.clear();
      const q = defaultProfile('Roos', 'dress_roze');
      q.order = 0; q.level = 9; q.diamonds = 200; for (let i = 1; i < 9; i++) q.stars[i] = 3;
      db.profiles = { p1: q }; save();
    });
    await w.goto(SPEL_URL);
    await w.evaluate(() => {
      selectProfile('p1');
      // één beeldje van een wissel: wat ligt er, hoe doorzichtig, en dekt het?
      window.__beeldje = () => [...document.querySelectorAll('.screen')]
        .filter(s => s.classList.contains('active') || s.classList.contains('wegvallend'))
        .map(s => {
          const b = s.getBoundingClientRect();
          const dekt = b.left <= .5 && b.top <= .5 && b.right >= innerWidth - .5 && b.bottom >= innerHeight - .5;
          return { id: s.id, op: +getComputedStyle(s).opacity, dekt };
        });
      window.__rust = () => ({
        actief: document.querySelectorAll('.screen.active').length,
        weg: document.querySelectorAll('.wegvallend').length,
        welk: (document.querySelector('.screen.active') || {}).id,
      });
      window.__wissel = async (code) => {
        const kaal = [];
        let vertrok = null;
        eval(code);
        for (let i = 0; i < 6; i++) {
          await new Promise(r => setTimeout(r, 55));
          const beeld = window.__beeldje();
          if (!beeld.some(x => x.op > .98 && x.dekt)) kaal.push(beeld);
          const weg = document.querySelector('.wegvallend');
          if (weg && !vertrok) vertrok = weg.id;
        }
        await new Promise(r => setTimeout(r, 600));
        return { kaal, vertrok, rust: window.__rust() };
      };
    });
    await w.waitForTimeout(600);
    // naam, wat er gebeurt, waar je uitkomt, en welk scherm hoort te vertrekken
    const paren = [
      ['kaart -> kleedkamer', 'openKleedkamer()', 'screen-dress', 'screen-map'],
      ['kleedkamer -> kast', 'openTrophies()', 'screen-trophies', 'screen-dress'],
      ['kast -> kaart', 'goMap()', 'screen-map', 'screen-trophies'],
      ['kaart -> ouderdeel', 'openSettings()', 'screen-settings', 'screen-map'],
      ['ouderdeel -> kaart', 'goMap()', 'screen-map', 'screen-settings'],
      ['kaart -> memory', 'startMemory()', 'screen-memory', 'screen-map'],
      ['memory -> kaart', 'exitMemory()', 'screen-map', 'screen-memory'],
      ['kaart -> sterrenkeuze', 'goProfiles()', 'screen-profile', 'screen-map'],
      ['sterrenkeuze -> kaart', "selectProfile('p1')", 'screen-map', 'screen-profile'],
      ['kaart -> kast', 'openTrophies()', 'screen-trophies', 'screen-map'],
      ['kast -> kleedkamer', 'openKleedkamer()', 'screen-dress', 'screen-trophies'],
      ['kleedkamer -> kaart', 'goMap()', 'screen-map', 'screen-dress'],
    ];
    for (const [naam, code, doel, vanaf] of paren) {
      const r = await w.evaluate(c => window.__wissel(c), code);
      check(r.kaal.length === 0, `${naam} laat op geen enkel beeldje de app-achtergrond zien`,
        JSON.stringify(r.kaal[0] || []));
      /* En het scherm waar je vandaan komt vertrékt ook echt, in beide
         richtingen. Dít is wat er van de kaart naar de kleedkamer ontbrak: heen
         verdween de kaart op het eerste beeldje en terug verdween de kleedkamer,
         terwijl de andere helft van diezelfde tik wél een beweging deed. Zonder
         deze controle valt dat niet op -- er ligt immers altijd één dekkend
         scherm -- en is de helft van PS-51 stil weer weg te halen. */
      check(r.vertrok === vanaf, `${naam} laat het vorige scherm ook echt vertrekken`,
        `${r.vertrok} i.p.v. ${vanaf}`);
      check(r.rust.actief === 1 && r.rust.weg === 0 && r.rust.welk === doel,
        `${naam} komt netjes tot stilstand`, JSON.stringify(r.rust));
    }
    // een kind dat blijft tikken mag geen scherm achterlaten
    const snel = await w.evaluate(async () => {
      for (let i = 0; i < 10; i++) {
        openKleedkamer(); await new Promise(r => setTimeout(r, 40));
        goMap(); await new Promise(r => setTimeout(r, 40));
        openTrophies(); await new Promise(r => setTimeout(r, 40));
      }
      goMap();
      await new Promise(r => setTimeout(r, 900));
      return window.__rust();
    });
    check(snel.actief === 1 && snel.weg === 0 && snel.welk === 'screen-map',
      'dertig wissels achter elkaar laten geen scherm staan', JSON.stringify(snel));

    /* ---- Nog eens tikken op het scherm waar je al staat ----
       Dat is geen aankomst, dus er hoort niets te bewegen -- en zeker niet het
       hele scherm dat nog één keer uit het niets komt opzetten. Precies dat
       gebeurde wél: show() haalt .komt-op van élk scherm af en zet .active
       opnieuw, en op het scherm waar je al was springt 'animation' daarmee van
       none terug naar screenIn.

       Het spoor dat ernaartoe wees: het gebeurde één keer en daarna niet meer.
       De derde tik stond .komt-op er al niet meer, dus veranderde er in de
       opmaak niets wat een nieuwe animatie kón starten. Vandaar dat er hier
       drie keer achter elkaar gemeten wordt en niet twee: bij twee metingen
       ziet [1,0] er hetzelfde uit als een scherm dat gewoon opkomt.

       De kaart en Werelden hadden dit nooit (die zetten .komt-op zelf terug) en
       staan hier als tegenproef mee. */
    const nogmaals = await w.evaluate(async () => {
      const laagste = async (code, id) => {
        const el = document.getElementById(id);
        const rij = [];
        eval(code);
        await new Promise(klaar => {
          const t0 = performance.now();
          const stap = () => {
            rij.push(+getComputedStyle(el).opacity);
            if (performance.now() - t0 < 350) requestAnimationFrame(stap); else klaar();
          };
          requestAnimationFrame(stap);
        });
        return +Math.min(...rij).toFixed(2);
      };
      const paden = [
        ['kleedkamer', 'openKleedkamer()', 'screen-dress'],
        ['kleedkamer hervat', 'resumeKleedkamer()', 'screen-dress'],
        ['een lade', "openKleedkamerCat('dress')", 'screen-dress'],
        ['de kast', 'openTrophies()', 'screen-trophies'],
        ['de kast hervat', 'resumeTrophies()', 'screen-trophies'],
        ['het ouderdeel', 'openSettings()', 'screen-settings'],
        ['het memoryspel', 'startMemory()', 'screen-memory'],
        ['de kaart', 'goMap()', 'screen-map'],
      ];
      const uit = {};
      for (const [naam, code, id] of paden) {
        goMap();
        await new Promise(r => setTimeout(r, 450));
        if (id === 'screen-map') { openKleedkamer(); await new Promise(r => setTimeout(r, 450)); }
        const rij = [];
        for (let i = 0; i < 3; i++) { rij.push(await laagste(code, id)); await new Promise(r => setTimeout(r, 400)); }
        uit[naam] = rij;
        if (id === 'screen-memory') { exitMemory(); await new Promise(r => setTimeout(r, 450)); }
      }
      return uit;
    });
    const flitst = Object.keys(nogmaals).filter(k => nogmaals[k].some(x => x < 0.99));
    check(flitst.length === 0,
      'nog eens tikken op het scherm waar je al staat laat het scherm staan -- geen flits',
      JSON.stringify(nogmaals));

    /* ---- PS-54 · één indrukduur ----
       Achttien knoppen kozen elk hun eigen, tussen .07 en .15s. Wat hier
       gecontroleerd wordt is niet het getal maar of ze het uit dezelfde bron
       lezen: --t-tik. Vandaar computed style en geen tekst in het stijlblad --
       dit is wat de browser ervan maakt. */
    const tik = await w.evaluate(() => {
      const duur = (el, eig) => {
        const st = getComputedStyle(el);
        const props = st.transitionProperty.split(',').map(x => x.trim());
        const tijden = st.transitionDuration.split(',').map(x => x.trim());
        const i = props.indexOf(eig);
        return i < 0 ? null : tijden[i % tijden.length];
      };
      const token = getComputedStyle(document.documentElement).getPropertyValue('--t-tik').trim();
      const meet = klas => {
        const d = document.createElement('div');
        d.className = klas;
        document.body.appendChild(d);
        const v = duur(d, 'transform');
        d.remove();
        return v;
      };
      // alles wat bij een tik beweegt. (.gear-item licht alleen op en staat er
      // dus niet bij; .tour-stop heeft zijn eigen veer, met reden -- zie de CSS.)
      const knoppen = ['btn', 'ster-tegel', 'add-tegel', 'map-id-btn', 'nav-item', 'count-tile',
                       'reis-plaats', 'trophy-card', 'spiegel', 'shuffle-btn', 'tab-btn',
                       'item-card', 'schat-entry', 'chip', 'choice-btn'];
      const uit = {};
      knoppen.forEach(k => { uit[k] = meet(k); });
      return { token, uit };
    });
    // het token staat als 70ms in :root, de browser rekent er 0.07s van -- dus
    // in milliseconden vergelijken en niet in tekst
    const ms = v => (v == null ? null : (/ms$/.test(v) ? parseFloat(v) : parseFloat(v) * 1000));
    const afwijkend = Object.keys(tik.uit).filter(k => ms(tik.uit[k]) !== ms(tik.token));
    check(ms(tik.token) === 70 && afwijkend.length === 0,
      'elke gewone indruk leest dezelfde --t-tik', JSON.stringify({ token: tik.token, afwijkend, uit: tik.uit }));

    /* ---- PS-53 · de teller loopt mee, niet vooruit ----
       Het getal stond er vóórdat de diamanten die het kwamen brengen vertrokken
       waren: het gevolg kwam eerder dan de oorzaak. Wat bewaard wordt verandert
       niet -- alleen wat er te zien is, wacht. */
    const dia = await w.evaluate(async () => {
      goMap();
      await new Promise(r => setTimeout(r, 400));
      P().diamonds = 40; save();
      startLevel(P().level);
      await new Promise(r => setTimeout(r, 300));
      const teller = () => document.getElementById('game-diamonds').textContent;
      const voor = teller();
      const q = G.qs[G.idx];
      submitAnswer(q.ans);
      const meteen = { teller: teller(), opgeslagen: P().diamonds,
                       bewaard: JSON.parse(localStorage.getItem('rekenPopsterren_v1')).profiles.p1.diamonds };
      await new Promise(r => setTimeout(r, 1000));
      return { voor, meteen, erna: teller(), echt: P().diamonds };
    });
    check(dia.meteen.teller === dia.voor && dia.meteen.opgeslagen > +dia.voor,
      'de teller wacht op de diamanten, de voortgang niet', JSON.stringify(dia));
    check(dia.meteen.bewaard === dia.meteen.opgeslagen,
      'en wat bewaard wordt staat er meteen goed in', JSON.stringify(dia.meteen));
    check(dia.erna === String(dia.echt),
      'als ze aangekomen zijn staat het goede getal er', JSON.stringify(dia));
    // twee beloningen vlak na elkaar: de laatste stand wint, en niet een oude
    const dubbel = await w.evaluate(async () => {
      const el = document.getElementById('game-diamonds');
      telNu(el, 10);
      telStraks(el, 12);
      await new Promise(r => setTimeout(r, 120));
      telStraks(el, 15);
      await new Promise(r => setTimeout(r, 1200));
      return el.textContent;
    });
    check(dubbel === '15', 'twee beloningen vlak na elkaar eindigen op de laatste stand', dubbel);
    await wisselCtx.close();

    /* ---- en dit alles zonder beweging ---- */
    const stilCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await cacheFonts(stilCtx);
    const sp = await stilCtx.newPage();
    sp.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    await sp.goto(SPEL_URL);
    await sp.evaluate(() => {
      localStorage.clear();
      const q = defaultProfile('Roos', 'dress_roze');
      q.order = 0; q.level = 9; q.diamonds = 40; for (let i = 1; i < 9; i++) q.stars[i] = 3;
      db.profiles = { p1: q }; save();
    });
    await sp.goto(SPEL_URL);
    const stil = await sp.evaluate(async () => {
      selectProfile('p1');
      await new Promise(r => setTimeout(r, 500));
      openKleedkamer();
      await new Promise(r => setTimeout(r, 60));
      const tussen = { weg: document.querySelectorAll('.wegvallend').length,
                       actief: (document.querySelector('.screen.active') || {}).id };
      await new Promise(r => setTimeout(r, 400));
      goMap();
      await new Promise(r => setTimeout(r, 400));
      startLevel(P().level);
      await new Promise(r => setTimeout(r, 300));
      const voor = +document.getElementById('game-diamonds').textContent;
      submitAnswer(G.qs[G.idx].ans);
      return { tussen, eind: (document.querySelector('.screen.active') || {}).id,
               voor, meteen: +document.getElementById('game-diamonds').textContent, echt: P().diamonds };
    });
    check(stil.tussen.weg === 0 && stil.tussen.actief === 'screen-dress' && stil.eind === 'screen-game',
      'zonder beweging staat het volgende scherm er meteen, zonder vertrekkend scherm', JSON.stringify(stil));
    check(stil.meteen === stil.echt && stil.meteen > stil.voor,
      'en de diamanten staan er meteen bij, zonder op een vlucht te wachten', JSON.stringify(stil));
    await stilCtx.close();
  }

  /* ================= 11 · De halte waar je heen moet =================
     De huidige halte ademt al sinds jaar en dag (stopSpot, een gloed achter het
     rondje). Wat daar nu bij komt is één puls bij het binnenkomen, en de regel
     dat het ademen stilstaat zodra er iets belangrijkers gebeurt.

     Wat hier vastligt is vooral wat er NIET mag: niet pulsen als de ster net
     zelf over de route naar die halte toe gehuppeld is (die reis ís de
     aankomst), en niet doorademen onder een laag of tijdens een wereldreis. En
     het rondje zelf hoort stil te staan -- alleen de gloed eromheen beweegt. */
  {
    const hCtx = await browser.newContext({ viewport: { width: 412, height: 915 } });
    await cacheFonts(hCtx);
    const h = await hCtx.newPage();
    h.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    h.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) pageErrors.push('CONSOLE ' + m.text()); });
    await h.goto(SPEL_URL);
    await h.evaluate(() => {
      localStorage.clear();
      const q = defaultProfile('Roos', 'dress_roze');
      for (let i = 0; i < 3; i++) for (let l = WORLD_START[i]; l < WORLD_START[i] + WORLDS[i].levels; l++) q.stars[l] = 2;
      q.level = WORLD_START[3];
      db.profiles = { p1: q }; save();
    });
    await h.goto(SPEL_URL);
    await h.evaluate(() => {
      window.__adem = () => {
        const n = document.querySelector('#tour-map .tour-stop.next');
        return n ? getComputedStyle(n, '::after').animationPlayState : 'geen halte';
      };
      // heeft de huidige halte één keer gepulst in dit tijdvak?
      window.__pulst = async (doen, ms) => {
        let gezien = false;
        doen();
        for (let i = 0; i < ms / 40; i++) {
          await new Promise(r => setTimeout(r, 40));
          const b = document.querySelector('#tour-map .tour-stop.next.aangekomen .stop-body');
          if (b && getComputedStyle(b, '::after').animationName === 'haltePuls'
              && +getComputedStyle(b, '::after').opacity > .02) gezien = true;
        }
        return gezien;
      };
    });
    await h.evaluate(() => selectProfile('p1'));
    await h.waitForTimeout(3200);   // ruim over de koeltijd van de aankomst

    // alleen de huidige halte, nooit een gespeelde of een op slot
    const wie = await h.evaluate(() => {
      const per = k => [...document.querySelectorAll('#tour-map .tour-stop.' + k)]
        .map(n => getComputedStyle(n, '::after').animationName);
      return { next: per('next'), done: per('done'), locked: per('locked') };
    });
    check(wie.next.length === 1 && wie.next[0] === 'stopSpot',
      'alleen de huidige halte ademt', JSON.stringify(wie));
    check(wie.done.every(a => a === 'none') && wie.locked.every(a => a === 'none'),
      'en een gespeelde of gesloten halte doet niets', JSON.stringify(wie));

    check(await h.evaluate(() => window.__pulst(() => { openKleedkamer(); setTimeout(goMap, 300); }, 1800)),
      'gewoon terugkomen op de kaart laat de halte één keer oplichten', 'geen puls gezien');

    /* Ná een show huppelt de ster zelf naar de volgende halte. Dát is de
       aankomst; er hoort geen tweede aankondiging overheen. */
    await h.waitForTimeout(3200);
    const naShow = await h.evaluate(async () => {
      startLevel(P().level); G.misses = 0; endLevel(true);
      await new Promise(r => setTimeout(r, 2000));
      document.querySelectorAll('.rp-overlay').forEach(o => o._close && o._close());
      const gepulst = await window.__pulst(() => goMap(P().level - 1), 3200);
      await new Promise(r => setTimeout(r, 2200));
      return { gepulst, adem: window.__adem() };
    });
    check(naShow.gepulst === false,
      'maar na een show met een reis niet: die reis is de aankomst', JSON.stringify(naShow));
    check(naShow.adem === 'running',
      'en als de reis voorbij is ademt de nieuwe halte gewoon verder', JSON.stringify(naShow));


    // een laag eroverheen zet het ademen stil, en daarna gaat het weer door
    const laag = await h.evaluate(async () => {
      openCareer();
      await new Promise(r => setTimeout(r, 300));
      const tijdens = window.__adem();
      document.querySelectorAll('.rp-overlay').forEach(o => o._close && o._close());
      await new Promise(r => setTimeout(r, 700));
      return { tijdens, erna: window.__adem() };
    });
    check(laag.tijdens === 'paused' && laag.erna === 'running',
      'onder een laag staat het ademen stil, en daarna weer aan', JSON.stringify(laag));

    // en tijdens een wereldreis ook
    const reis = await h.evaluate(async () => {
      navigeerNaarWereld(2);
      await new Promise(r => setTimeout(r, 1600));
      navigeerNaarWereld(3);                       // terug naar haar wereld: dáár staat de halte
      const tijdens = [];
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 90));
        if (document.getElementById('screen-map').classList.contains('wereld-reist')) tijdens.push(window.__adem());
      }
      await new Promise(r => setTimeout(r, 1500));
      return { tijdens, erna: window.__adem() };
    });
    check(reis.tijdens.length > 0 && reis.tijdens.every(x => x === 'paused' || x === 'geen halte'),
      'tijdens een wereldreis ademt er niets mee', JSON.stringify(reis));
    check(reis.erna === 'running', 'en als de camera stilstaat gaat het weer door', JSON.stringify(reis));

    // het rondje zelf verroert zich niet -- alleen de gloed eromheen
    const stil = await h.evaluate(async () => {
      const dot = document.querySelector('#tour-map .tour-stop.next .dot');
      const meet = () => { const b = dot.getBoundingClientRect();
        return [b.left, b.top, b.width, b.height].map(v => Math.round(v * 10) / 10); };
      const eerste = meet(); let grootste = 0;
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 80));
        const nu = meet();
        grootste = Math.max(grootste, ...nu.map((v, k) => Math.abs(v - eerste[k])));
      }
      return { eerste, grootste };
    });
    check(stil.grootste < 0.5, 'en het rondje zelf staat stil: alleen de gloed ademt',
      JSON.stringify(stil));
    /* En een show overdoen midden in een wereld: dan is er géén reis, dus staat
       de huidige halte er gewoon -- en tóch hoort er niet gepulst te worden.
       Deze zaak staat er apart omdat hij de énige is die de poort zelf nameet:
       bij een reis is er sowieso geen huidige halte (renderTourMap laat 'next'
       dan weg), dus daar zou ook een kapotte poort onopgemerkt blijven. */
    const overdoen = await h.evaluate(async () => {
      const q = P();
      q.stars = { 1: 3, 2: 2, 3: 3 }; q.level = 4;   // midden in de eerste wereld
      save();
      goMap();
      await new Promise(r => setTimeout(r, 3200));   // koeltijd voorbij
      startLevel(2); G.misses = 1; endLevel(true);   // een halte die al gespeeld is
      await new Promise(r => setTimeout(r, 2000));
      document.querySelectorAll('.rp-overlay').forEach(o => o._close && o._close());
      const gepulst = await window.__pulst(() => goMap(2), 1800);
      return { gepulst, halte: !!document.querySelector('#tour-map .tour-stop.next') };
    });
    check(overdoen.halte && !overdoen.gepulst,
      'en uit een show zonder reis pulst hij evenmin, ook al staat de halte er',
      JSON.stringify(overdoen));
    await hCtx.close();

    /* ---- en zonder beweging ---- */
    const sCtx = await browser.newContext({ viewport: { width: 412, height: 915 }, reducedMotion: 'reduce' });
    await cacheFonts(sCtx);
    const sp = await sCtx.newPage();
    sp.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    await sp.goto(SPEL_URL);
    await sp.evaluate(() => {
      localStorage.clear();
      const q = defaultProfile('Roos', 'dress_roze');
      q.level = 5; for (let i = 1; i < 5; i++) q.stars[i] = 3;
      db.profiles = { p1: q }; save();
    });
    await sp.goto(SPEL_URL);
    await sp.evaluate(() => selectProfile('p1'));
    await sp.waitForTimeout(1200);
    const stilstand = await sp.evaluate(async () => {
      // élke keer vers opzoeken: goMap bouwt de kaart opnieuw op, en op een
      // losgekoppeld element geeft getComputedStyle lege waarden terug
      const halte = () => document.querySelector('#tour-map .tour-stop.next');
      const lijf = () => document.querySelector('#tour-map .tour-stop.next .stop-body');
      let gepulst = false;
      openKleedkamer();
      await new Promise(r => setTimeout(r, 300));
      goMap();
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 40));
        const b = lijf();
        if (b && getComputedStyle(b, '::after').display !== 'none'
            && getComputedStyle(b, '::after').animationName !== 'none') gepulst = true;
      }
      const na = getComputedStyle(halte(), '::after');
      return { adem: na.animationName, gloed: +na.opacity, gepulst,
               pulslaag: getComputedStyle(lijf(), '::after').display };
    });
    check(stilstand.adem === 'none' && !stilstand.gepulst && stilstand.pulslaag === 'none',
      'zonder beweging ademt en pulst er niets', JSON.stringify(stilstand));
    // .95 is waar stopSpot op zijn hoogtepunt komt; stilstaand hoort de gloed
    // daar niet onder te blijven, anders is "zonder beweging" ook "minder te zien"
    check(stilstand.gloed >= .95,
      'maar de gloed staat er juist stérker op, zodat de halte opvalt', JSON.stringify(stilstand));
    await sCtx.close();
  }

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
