/*
 * Het ouderdeel: instellingen, de kindkiezer, de drie onderdelen en alles wat
 * onomkeerbaar is.
 *
 * Waarom een eigen suite. `profiles.test.js` gaat over sterren máken en
 * verwijderen; de rest van het ouderdeel -- welke instelling bij wélk kind hoort,
 * of de kiezer de context wisselt zonder iets te laten lekken, of wissen echt
 * eerst vraagt, en of een back-up er hetzelfde uit komt als hij erin ging -- was
 * nergens vastgelegd. Precies daar zit het risico: één instelling die per
 * ongeluk globaal wordt, of een reset die de oefeninstellingen meesleept, merkt
 * een ouder pas als haar kind vastloopt.
 *
 * De zaken:
 *   A  geluid en trillen: omzetten, opslaan, en morgen nog zo
 *   B  oefeninstellingen zijn per kind, en lekken niet naar de buur
 *   C  de kiezer wisselt de context; het onderdeel blijft staan
 *   D  startfase en hoogste fase houden elkaar in het gareel (en tonen het bereik)
 *   E  voortgang wissen: eerst vragen, dan wissen -- en de instellingen blijven
 *   F  een ster verwijderen noemt haar bij naam en vraagt eerst
 *   G  back-up eruit en er weer in: byte voor byte dezelfde voortgang
 *   H  een kapotte back-up verandert niets
 *   I  de plakkende kop krimpt bij scrollen, maar wie en wat blijven in beeld
 *   J  vanuit Beheer een ster maken komt terug in Beheer, bij de nieuwe ster
 *   K  enkelvoud/meervoud: "1 show gespeeld", "2 shows gespeeld", "0 shows"
 *   L  de trofeeteller heeft één bron, en de kast noemt hetzelfde getal
 *   M  de inschatting toont geen percentage, en p.perf draait er ongewijzigd door
 *   N  de drie weergavekeuzes staan op één regel, en wikkelen alleen als het moet
 *
 * Draaien:
 *   npm run test:ouder          (of: npm test voor alle suites)
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

  // Elke zaak begint met een schone opslag, en met twee sterren erin: het
  // ouderdeel gaat over "wiens gegevens", en dat is pas een vraag vanaf twee.
  async function fresh(sterren) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) pageErrors.push('CONSOLE ' + m.text()); });
    await page.goto(APP_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(250);
    // Niet via het formulier: dat is het terrein van profiles.test.js. Hier gaat
    // het om wat er ná het maken met die profielen gebeurt, dus zetten we ze
    // rechtstreeks neer -- langs defaultProfile, zodat het echte profielen zijn.
    await page.evaluate(namen => {
      namen.forEach((naam, i) => {
        const key = 'p' + (i + 1);
        db.profiles[key] = defaultProfile(naam, 'dress_roze', { base: 'meisje' });
        db.profiles[key].order = i;
      });
      save();
      goProfiles();
    }, sterren || ['Anna', 'Bas']);
    await page.waitForTimeout(150);
    return { ctx, page };
  }

  // Het ouderdeel openen op een bepaald kind en onderdeel.
  const open = (page, key, tab) => page.evaluate(([k, t]) => {
    openSettings();
    if (k) setKey = k;
    if (t) setTab = t;
    renderSettings();
  }, [key, tab]);

  /* ================= A · Geluid en trillen ================= */
  /* De twee schakelaars onder het tandwiel zijn app-breed (ze staan náást de
     profielen in db) en moeten een herstart overleven. */
  {
    const { ctx, page } = await fresh();
    await page.click('#btn-gear');
    await page.waitForTimeout(150);
    let r = await page.evaluate(() => ({
      open: document.getElementById('gear-menu').classList.contains('open'),
      geluid: db.sound, tekst: document.getElementById('gear-sound-state').textContent,
      uit: document.getElementById('gear-sound-state').classList.contains('off'),
      aria: document.getElementById('gear-sound').getAttribute('aria-checked'),
    }));
    check(r.open, 'het tandwiel opent het paneel', 'gesloten');
    check(r.geluid === true && r.tekst === 'Aan' && !r.uit && r.aria === 'true',
      'geluid staat standaard aan en zegt dat ook', JSON.stringify(r));
    await page.click('#gear-sound');
    await page.waitForTimeout(120);
    r = await page.evaluate(() => ({
      geluid: db.sound, tekst: document.getElementById('gear-sound-state').textContent,
      uit: document.getElementById('gear-sound-state').classList.contains('off'),
      aria: document.getElementById('gear-sound').getAttribute('aria-checked'),
      ico: document.querySelector('#gear-sound .gi-ico').textContent,
    }));
    check(r.geluid === false && r.tekst === 'Uit' && r.uit && r.aria === 'false',
      'uitzetten verandert de stand én wat er staat', JSON.stringify(r));
    check(r.ico === '🔇', 'en het icoontje gaat mee', r.ico);
    // trillen staat los van geluid
    const heeftTril = await page.evaluate(() => 'vibrate' in navigator);
    if (heeftTril) {
      await page.click('#gear-haptics');
      await page.waitForTimeout(120);
      r = await page.evaluate(() => ({ g: db.sound, h: db.haptics }));
      check(r.g === false && r.h === false, 'trillen staat los van geluid', JSON.stringify(r));
    }
    // en morgen weer openen
    await page.reload();
    await page.waitForTimeout(300);
    r = await page.evaluate(() => ({ g: db.sound, h: db.haptics }));
    check(r.g === false, 'de geluidskeuze staat er morgen nog', JSON.stringify(r));
    if (heeftTril) check(r.h === false, 'de trilkeuze staat er morgen nog', JSON.stringify(r));
    await ctx.close();
  }

  /* ================= B · Oefeninstellingen zijn per kind ================= */
  /* De valkuil die dit vangt: één van deze chips die per ongeluk op db i.p.v. op
     het profiel schrijft. Dan verandert het instellen van Anna stilletjes ook
     wat Bas krijgt, en dat is precies het soort fout dat niemand meteen ziet. */
  {
    const { ctx, page } = await fresh();
    await open(page, 'p1', 'oefenen');
    await page.waitForTimeout(150);
    // Anna: getallen tot 100, zelf typen, 10 vragen
    await page.click('#set-max .chip[data-v="100"]');
    await page.waitForTimeout(100);
    await page.click('#set-mode .chip[data-v="typ"]');
    await page.waitForTimeout(100);
    await page.click('#set-perlevel .chip[data-v="10"]');
    await page.waitForTimeout(100);
    let r = await page.evaluate(() => ({
      anna: { max: db.profiles.p1.settings.max, mode: db.profiles.p1.settings.mode, per: db.profiles.p1.settings.perLevel },
      bas:  { max: db.profiles.p2.settings.max, mode: db.profiles.p2.settings.mode, per: db.profiles.p2.settings.perLevel },
    }));
    check(r.anna.max === 100 && r.anna.mode === 'typ' && r.anna.per === 10,
      'wat je instelt komt bij dit kind terecht', JSON.stringify(r.anna));
    check(r.bas.max === 20 && r.bas.mode === 'kies' && r.bas.per === 8,
      'en de andere ster blijft op haar eigen waarden staan', JSON.stringify(r.bas));
    // nu naar Bas, en die moet zijn eigen waarden tonen
    await page.evaluate(() => { setKey = 'p2'; renderSettings(); });
    await page.waitForTimeout(150);
    r = await page.evaluate(() => ({
      gekozenMax: document.querySelector('#set-max .chip.on').dataset.v,
      gekozenMode: document.querySelector('#set-mode .chip.on').dataset.v,
      kop: document.querySelector('#screen-settings .set-card-head .sub').textContent,
    }));
    check(r.gekozenMax === '20' && r.gekozenMode === 'kies',
      'de velden tonen de waarden van het gekozen kind', JSON.stringify(r));
    check(/Bas/.test(r.kop), 'en de kaart zegt over wie het gaat', r.kop);
    // Bas naar de telmodus: dat mag Anna niet raken
    await page.click('#set-track .chip[data-v="count"]');
    await page.waitForTimeout(150);
    r = await page.evaluate(() => ({
      anna: db.profiles.p1.settings.track, bas: db.profiles.p2.settings.track,
      basFase: !!document.getElementById('set-stage'),
    }));
    check(r.bas === 'count' && r.anna === 'math',
      'van modus wisselen raakt alleen dit kind', JSON.stringify(r));
    check(r.basFase, 'en het paneel schakelt om naar de telvelden', 'geen fasekiezer');
    // heropenen: alles staat er nog, per kind
    await page.reload();
    await page.waitForTimeout(300);
    r = await page.evaluate(() => ({
      anna: { max: db.profiles.p1.settings.max, track: db.profiles.p1.settings.track },
      bas:  { max: db.profiles.p2.settings.max, track: db.profiles.p2.settings.track },
    }));
    check(r.anna.max === 100 && r.anna.track === 'math' && r.bas.max === 20 && r.bas.track === 'count',
      'na heropenen heeft elk kind nog zijn eigen instellingen', JSON.stringify(r));
    await ctx.close();
  }

  /* ================= C · De kiezer wisselt de context ================= */
  {
    const { ctx, page } = await fresh(['Anna', 'Bas', 'Cato']);
    await open(page, 'p1', 'oefenen');
    await page.waitForTimeout(150);
    let r = await page.evaluate(() => ({
      chips: [...document.querySelectorAll('#settings-profiles .who-btn')].map(b => b.textContent.trim()),
      actief: document.querySelector('#settings-profiles .who-btn.active').textContent.trim(),
      pressed: [...document.querySelectorAll('#settings-profiles .who-btn')].map(b => b.getAttribute('aria-pressed')),
      tab: document.querySelector('#settings-subtabs button.on').dataset.t,
    }));
    check(r.chips.length === 3, 'elk kind krijgt een eigen kaartje in de kiezer', JSON.stringify(r.chips));
    check(/Anna/.test(r.actief), 'en het gekozen kind is te zien', r.actief);
    check(r.pressed.join(',') === 'true,false,false', 'een schermlezer hoort hetzelfde', r.pressed.join(','));
    // een ander kind kiezen: het ónderdeel blijft waar het was
    await page.evaluate(() => [...document.querySelectorAll('#settings-profiles .who-btn')][2].click());
    await page.waitForTimeout(200);
    r = await page.evaluate(() => ({
      setKey: setKey, tab: setTab,
      actief: document.querySelector('#settings-profiles .who-btn.active').textContent.trim(),
      tabAan: document.querySelector('#settings-subtabs button.on').dataset.t,
    }));
    check(r.setKey === 'p3' && /Cato/.test(r.actief),
      'een ander kind kiezen wisselt de context', JSON.stringify(r));
    check(r.tab === 'oefenen' && r.tabAan === 'oefenen',
      'en laat je op hetzelfde onderdeel staan', JSON.stringify(r));
    // van onderdeel wisselen houdt het kind vast
    await page.click('#settings-subtabs button[data-t="beheer"]');
    await page.waitForTimeout(200);
    r = await page.evaluate(() => ({
      setKey: setKey, tab: setTab,
      naam: document.getElementById('set-name').value,
    }));
    check(r.setKey === 'p3' && r.tab === 'beheer' && r.naam === 'Cato',
      'van onderdeel wisselen houdt hetzelfde kind vast', JSON.stringify(r));
    await ctx.close();
  }

  /* ================= D · Startfase en hoogste fase ================= */
  /* Twee rijen die elkaar niet mogen kruisen: de start kan nooit boven het
     plafond staan en het plafond nooit onder de start. Dat gedrag bestond al;
     wat er nieuw bij hoort is dat het bereik ook te ZIEN is (.chip.bereik) --
     dat is de hele reden dat de twee rijen nu als één keuze lezen, dus als die
     band niet meer klopt is de uitleg op het scherm onwaar. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => {
      db.profiles.p1.settings.track = 'count';
      db.profiles.p1.settings.stage = 1;
      db.profiles.p1.settings.stageMax = 4;
      save();
    });
    await open(page, 'p1', 'oefenen');
    await page.waitForTimeout(200);
    const band = () => page.evaluate(() => ({
      stage: db.profiles.p1.settings.stage, max: db.profiles.p1.settings.stageMax,
      startBand: [...document.querySelectorAll('#set-stage .chip')].filter(c => c.classList.contains('bereik')).map(c => +c.dataset.v),
      maxBand: [...document.querySelectorAll('#set-stagemax .chip')].filter(c => c.classList.contains('bereik')).map(c => +c.dataset.v),
      startOn: +document.querySelector('#set-stage .chip.on').dataset.v,
      maxOn: +document.querySelector('#set-stagemax .chip.on').dataset.v,
      zin: document.querySelector('.fr-zin').textContent,
      legenda: [...document.querySelectorAll('.stage-legend span')].filter(x => !x.classList.contains('uit')).length,
    }));
    let r = await band();
    check(r.startBand.join(',') === '1,2,3,4' && r.maxBand.join(',') === '1,2,3,4',
      'de band loopt in beide rijen van de start tot het plafond', JSON.stringify(r));
    check(r.legenda === 4, 'en de legenda dempt wat buiten de band valt', 'in beeld: ' + r.legenda);
    check(/fase 1/.test(r.zin) && /fase 4/.test(r.zin), 'de zin bovenaan zegt hetzelfde in woorden', r.zin);
    // een start boven het plafond tikt het plafond mee omhoog
    await page.click('#set-stage .chip[data-v="7"]');
    await page.waitForTimeout(200);
    r = await band();
    check(r.stage === 7 && r.max === 7 && r.startOn === 7 && r.maxOn === 7,
      'een start boven het plafond duwt het plafond mee omhoog', JSON.stringify(r));
    check(r.startBand.join(',') === '7' && r.maxBand.join(',') === '7',
      'en dan is de band precies één fase breed', JSON.stringify(r));
    // een plafond onder de start trekt de start mee omlaag
    await page.click('#set-stagemax .chip[data-v="3"]');
    await page.waitForTimeout(200);
    r = await band();
    check(r.stage === 3 && r.max === 3, 'een plafond onder de start trekt de start mee omlaag', JSON.stringify(r));
    // cijfers uit: dan bestaan de fases boven 5 niet meer als keuze, maar de
    // instelling blijft staan (niet-destructief, zie countMaxStage)
    await page.evaluate(() => { setKey = 'p1'; db.profiles.p1.settings.stageMax = 11; save(); renderSettings(); });
    await page.waitForTimeout(150);
    await page.click('#set-numerals .chip[data-v="off"]');
    await page.waitForTimeout(200);
    r = await page.evaluate(() => ({
      chips: document.querySelectorAll('#set-stage .chip').length,
      bewaard: db.profiles.p1.settings.stageMax,
    }));
    check(r.chips === 5, 'zonder cijfers worden er maar vijf fases aangeboden', 'chips=' + r.chips);
    check(r.bewaard === 11, 'en de gekozen bovengrens blijft bewaard', 'stageMax=' + r.bewaard);
    await ctx.close();
  }

  /* ================= E · Voortgang wissen ================= */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => {
      const p = db.profiles.p1;
      p.stars[1] = 3; p.stars[2] = 2; p.level = 3; p.diamonds = 99;
      p.owned.push('dress_disco');
      p.settings.max = 100; p.settings.mode = 'typ';
      p.stats.correct = 40; p.stats.wrong = 5;
      save();
    });
    await open(page, 'p1', 'beheer');
    await page.waitForTimeout(150);
    // drie tikken, en niet één: openklappen, de knop, en dan pas ja
    // Niet op offsetParent of getClientRects kijken: in een dichte <details>
    // houdt Chromium de opmaak van de inhoud gewoon staan (verborgen met
    // content-visibility, niet met display:none) -- de knop heeft daar dus nog
    // een maat en een rechthoek. checkVisibility() kijkt wél naar die
    // verborgen-door-een-voorouder-vraag, en dat is precies wat hier telt.
    const zichtbaar = (page, id) => page.evaluate(i =>
      document.getElementById(i).checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true }), id);
    let r = await page.evaluate(() => ({ open: document.getElementById('set-danger').open }));
    r.knopZichtbaar = await zichtbaar(page, 'set-reset');
    check(!r.open && !r.knopZichtbaar, 'de wisknop bestaat pas als een ouder erom vraagt', JSON.stringify(r));
    await page.click('#set-danger summary');
    await page.waitForTimeout(150);
    await page.click('#set-reset');
    await page.waitForTimeout(150);
    r = await page.evaluate(() => ({
      gevraagd: document.getElementById('confirm-modal').classList.contains('open'),
      tekst: document.getElementById('confirm-body').textContent,
      nogSterren: Object.keys(db.profiles.p1.stars).length,
    }));
    check(r.gevraagd, 'wissen vraagt eerst om bevestiging', 'geen venster');
    check(r.nogSterren === 2, 'en wist nog niets zolang er niet bevestigd is', 'sterren=' + r.nogSterren);
    check(/Anna/.test(r.tekst), 'de vraag noemt het kind bij naam', r.tekst);
    check(/blijven staan/.test(r.tekst), 'en zegt ook wat er blíjft', r.tekst);
    // eerst nee
    await page.click('#confirm-no');
    await page.waitForTimeout(150);
    r = await page.evaluate(() => ({ sterren: Object.keys(db.profiles.p1.stars).length, dia: db.profiles.p1.diamonds }));
    check(r.sterren === 2 && r.dia === 99, '"nee, terug" laat alles staan', JSON.stringify(r));
    // en nu ja
    await page.click('#set-reset');
    await page.waitForTimeout(120);
    await page.click('#confirm-yes');
    await page.waitForTimeout(250);
    r = await page.evaluate(() => {
      const p = db.profiles.p1;
      return {
        sterren: Object.keys(p.stars).length, dia: p.diamonds, level: p.level,
        goed: p.stats.correct, disco: p.owned.indexOf('dress_disco'),
        naam: p.name, order: p.order, max: p.settings.max, mode: p.settings.mode,
        buur: { sterren: Object.keys(db.profiles.p2.stars).length, naam: db.profiles.p2.name },
      };
    });
    check(r.sterren === 0 && r.level === 1 && r.goed === 0 && r.disco < 0,
      'na "ja" is de voortgang weg', JSON.stringify(r));
    check(r.naam === 'Anna' && r.order === 0, 'maar het kind zelf blijft, op haar eigen plek', JSON.stringify(r));
    check(r.max === 100 && r.mode === 'typ',
      'en haar oefeninstellingen blijven staan -- precies wat de vraag belooft', JSON.stringify(r));
    check(r.buur.sterren === 0 && r.buur.naam === 'Bas', 'de andere ster is niet aangeraakt', JSON.stringify(r.buur));
    await ctx.close();
  }

  /* ================= F · Verwijderen noemt haar bij naam ================= */
  {
    const { ctx, page } = await fresh();
    await open(page, 'p2', 'beheer');
    await page.waitForTimeout(150);
    let r = await page.evaluate(() => ({ open: document.getElementById('set-danger-del').open }));
    r.zichtbaar = await page.evaluate(() =>
      document.getElementById('set-delete').checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true }));
    check(!r.open && !r.zichtbaar, 'de verwijderknop zit achter een openklapper', JSON.stringify(r));
    await page.click('#set-danger-del summary');
    await page.waitForTimeout(150);
    r = await page.evaluate(() => document.querySelector('#set-danger-del .danger-zone .t').textContent);
    check(/Bas/.test(r), 'het rode vlak noemt de ster die verdwijnt', r);
    await page.click('#set-delete');
    await page.waitForTimeout(150);
    r = await page.evaluate(() => ({
      gevraagd: document.getElementById('confirm-modal').classList.contains('open'),
      tekst: document.getElementById('confirm-body').textContent,
      n: Object.keys(db.profiles).length,
    }));
    check(r.gevraagd && /Bas/.test(r.tekst) && r.n === 2,
      'verwijderen vraagt eerst, met de naam erin', JSON.stringify(r));
    await ctx.close();
  }

  /* ================= G · Back-up eruit en er weer in ================= */
  /* De heenweg (exportData) schrijft een bestand weg; dat is de browser en niet
     de app. Wat hier getest wordt is de inhoud van dat bestand plus de terugweg:
     dezelfde JSON er weer in moet exact dezelfde voortgang geven. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => {
      const a = db.profiles.p1, b = db.profiles.p2;
      a.stars[1] = 3; a.stars[2] = 1; a.diamonds = 42; a.settings.max = 50;
      b.stars[1] = 2; b.diamonds = 7; b.settings.track = 'count'; b.settings.stage = 3;
      db.sound = false;
      save();
    });
    const bestand = await page.evaluate(() => JSON.stringify(db, null, 2));
    check(/"profiles"/.test(bestand) && /Anna/.test(bestand) && /Bas/.test(bestand),
      'de back-up bevat alle sterren', bestand.slice(0, 60));
    check(/"sound": false/.test(bestand), 'en de app-brede schakelaars', bestand.slice(0, 60));
    // alles slopen, en dan terugzetten
    await page.evaluate(() => {
      db.profiles.p1.stars = {}; db.profiles.p1.diamonds = 0;
      delete db.profiles.p2;
      db.sound = true;
      save();
    });
    await open(page, 'p1', 'beheer');
    await page.waitForTimeout(150);
    await page.evaluate(txt => {
      const f = new File([txt], 'backup.json', { type: 'application/json' });
      importData(f);
    }, bestand);
    await page.waitForTimeout(400);
    let r = await page.evaluate(() => ({
      gevraagd: document.getElementById('confirm-modal').classList.contains('open'),
      tekst: document.getElementById('confirm-body').textContent,
      nu: Object.keys(db.profiles).length,
    }));
    check(r.gevraagd, 'terugzetten vraagt eerst om bevestiging', 'geen venster');
    check(/vervangt/i.test(r.tekst), 'en zegt dat het vervángt', r.tekst);
    check(r.nu === 1, 'en verandert nog niets zolang er niet bevestigd is', 'n=' + r.nu);
    await page.click('#confirm-yes');
    await page.waitForTimeout(400);
    // de mededeling "gelukt" wegklikken
    await page.evaluate(() => { const b = document.getElementById('confirm-ok'); if (b) b.click(); });
    await page.waitForTimeout(200);
    r = await page.evaluate(() => ({
      n: Object.keys(db.profiles).length,
      anna: { sterren: db.profiles.p1.stars, dia: db.profiles.p1.diamonds, max: db.profiles.p1.settings.max },
      bas: { sterren: db.profiles.p2.stars, dia: db.profiles.p2.diamonds, track: db.profiles.p2.settings.track, stage: db.profiles.p2.settings.stage },
      geluid: db.sound, cur: cur,
    }));
    check(r.n === 2, 'terugzetten brengt de verdwenen ster terug', 'n=' + r.n);
    check(r.anna.sterren[1] === 3 && r.anna.sterren[2] === 1 && r.anna.dia === 42 && r.anna.max === 50,
      'met precies de sterren, diamanten en instellingen uit het bestand', JSON.stringify(r.anna));
    check(r.bas.track === 'count' && r.bas.stage === 3 && r.bas.dia === 7,
      'en dat geldt voor élke ster in het bestand', JSON.stringify(r.bas));
    check(r.geluid === false, 'ook de app-brede schakelaars komen mee', JSON.stringify(r.geluid));
    check(r.cur === null, 'en er blijft geen ster uit het oude bestand geselecteerd', String(r.cur));
    // en de rondgang komt tot rust: nog een keer hetzelfde bestand erin geeft
    // hetzelfde resultaat (geen dubbele beloningen, geen oplopende tellers)
    const na1 = await page.evaluate(() => JSON.stringify(db.profiles));
    await page.evaluate(txt => { const f = new File([txt], 'b.json', { type: 'application/json' }); importData(f); }, bestand);
    await page.waitForTimeout(400);
    await page.click('#confirm-yes');
    await page.waitForTimeout(400);
    await page.evaluate(() => { const b = document.getElementById('confirm-ok'); if (b) b.click(); });
    const na2 = await page.evaluate(() => JSON.stringify(db.profiles));
    check(na1 === na2, 'tweemaal dezelfde back-up terugzetten geeft tweemaal hetzelfde', 'verschil');
    await ctx.close();
  }

  /* ================= H · Een kapotte back-up verandert niets ================= */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => { db.profiles.p1.stars[1] = 3; save(); });
    const voor = await page.evaluate(() => JSON.stringify(db));
    await open(page, 'p1', 'beheer');
    await page.waitForTimeout(150);
    for (const tekst of ['dit is geen json', '{"profiles":{"p1":{"name":"X"}}}', '{}']) {
      await page.evaluate(t => { const f = new File([t], 'x.json', { type: 'application/json' }); importData(f); }, tekst);
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => ({
        melding: document.getElementById('confirm-modal').classList.contains('open'),
        titel: document.getElementById('confirm-title').textContent,
        knop: !!document.getElementById('confirm-ok'),
        db: JSON.stringify(db),
      }));
      check(r.melding && r.knop, 'een onbruikbaar bestand geeft een melding en geen vraag', r.titel);
      check(r.db === voor, 'en verandert niets aan wat er staat', 'db veranderde');
      await page.evaluate(() => { const b = document.getElementById('confirm-ok'); if (b) b.click(); });
      await page.waitForTimeout(150);
    }
    await ctx.close();
  }

  /* ================= I · De kop krimpt, maar laat niets vallen ================= */
  /* De hele reden dat de kop twee standen heeft is ruimte. De voorwaarde is dat
     wie en wát nooit uit beeld verdwijnen: dat zijn de twee dingen die een ouder
     onderweg nodig heeft. */
  {
    const { ctx, page } = await fresh();
    await open(page, 'p1', 'oefenen');
    await page.waitForTimeout(300);
    const ruim = await page.evaluate(() => ({
      h: document.querySelector('#screen-settings .hub-sticky').offsetHeight,
      gescrold: document.getElementById('screen-settings').classList.contains('gescrold'),
    }));
    await page.evaluate(() => { const sc = document.getElementById('screen-settings'); sc.scrollTop = 400; sc.dispatchEvent(new Event('scroll')); });
    await page.waitForTimeout(500);
    const krap = await page.evaluate(() => {
      const kop = document.querySelector('#screen-settings .hub-sticky');
      const wie = document.querySelector('#settings-profiles .who-btn.active');
      const wat = document.querySelector('#settings-subtabs button.on');
      const zichtbaar = el => { const r = el.getBoundingClientRect(); return r.height > 0 && r.bottom <= kop.getBoundingClientRect().bottom + 1; };
      return {
        h: kop.offsetHeight,
        gescrold: document.getElementById('screen-settings').classList.contains('gescrold'),
        wieInBeeld: zichtbaar(wie), watInBeeld: zichtbaar(wat),
        wieNaam: wie.textContent.trim(), watLabel: wat.textContent.trim(),
        terug: !!document.querySelector('#screen-settings .hub-sticky .icon-btn').offsetParent,
      };
    });
    check(!ruim.gescrold && krap.gescrold, 'scrollen zet de kop in zijn krappe stand', JSON.stringify([ruim, krap]));
    /* Gemeten op 390x844: 160 -> 139px. De drempel staat op 18 en niet op 20:
       fase 5D.1 haalde elf pixels uit de rúime stand (zie #screen-settings
       .hub-sticky), dus het verschil tussen de twee standen wordt kleiner terwijl
       de kop als geheel juist beter werd. Waar deze test voor staat is dat er
       écht een tweede, krappere stand is -- niet dat die precies 21px scheelt. */
    check(krap.h <= ruim.h - 18, 'en dat scheelt echt hoogte', `${ruim.h} -> ${krap.h}`);
    check(krap.wieInBeeld && /Anna/.test(krap.wieNaam), 'welk kind gekozen is blijft in beeld', JSON.stringify(krap));
    check(krap.watInBeeld && /Oefenen/.test(krap.watLabel), 'en welk onderdeel je leest ook', JSON.stringify(krap));
    check(krap.terug, 'en de weg terug blijft er', 'terugknop weg');
    // en terug naar boven maakt hem weer ruim
    await page.evaluate(() => { const sc = document.getElementById('screen-settings'); sc.scrollTop = 0; sc.dispatchEvent(new Event('scroll')); });
    await page.waitForTimeout(500);
    const weerRuim = await page.evaluate(() => ({
      h: document.querySelector('#screen-settings .hub-sticky').offsetHeight,
      gescrold: document.getElementById('screen-settings').classList.contains('gescrold'),
    }));
    check(!weerRuim.gescrold && weerRuim.h === ruim.h, 'bovenaan is hij weer ruim', JSON.stringify(weerRuim));
    await ctx.close();
  }

  /* ================= J · Vanuit Beheer een ster maken ================= */
  /* Uit het ouderdeel is een ster maken iets wat een ouder doet terwijl er
     misschien een ánder kind aan het spelen is: dan hoort ze terug te komen waar
     ze was, en niet in de wereld van de nieuwe ster te belanden. */
  {
    const { ctx, page } = await fresh();
    await open(page, 'p1', 'beheer');
    await page.waitForTimeout(150);
    await page.click('#set-newstar');
    await page.waitForTimeout(250);
    let r = await page.evaluate(() => document.querySelector('.screen.active').id);
    check(r === 'screen-newstar', 'Beheer heeft een weg naar het maakformulier', r);
    await page.click('#newstar-base .chip[data-v="jongen"]');
    await page.fill('#newstar-name', 'Daan');
    await page.click('#newstar-go');
    await page.waitForTimeout(400);
    r = await page.evaluate(() => ({
      scherm: document.querySelector('.screen.active').id,
      tab: setTab, setKey: setKey, cur: cur,
      n: Object.keys(db.profiles).length,
      naam: db.profiles[setKey] ? db.profiles[setKey].name : null,
    }));
    check(r.scherm === 'screen-settings' && r.tab === 'beheer',
      'na het maken sta je terug in Beheer', JSON.stringify(r));
    check(r.n === 3 && r.naam === 'Daan', 'bij de nieuwe ster', JSON.stringify(r));
    check(r.cur !== 'p3', 'en er wordt niet stilletjes met de nieuwe ster verder gespeeld', String(r.cur));
    // en teruggaan uit het formulier komt ook in Beheer uit
    await page.click('#set-newstar');
    await page.waitForTimeout(250);
    await page.click('#screen-newstar .icon-btn');
    await page.waitForTimeout(300);
    r = await page.evaluate(() => ({ scherm: document.querySelector('.screen.active').id, n: Object.keys(db.profiles).length }));
    check(r.scherm === 'screen-settings' && r.n === 3,
      'en afbreken brengt je terug zonder een ster te maken', JSON.stringify(r));
    await ctx.close();
  }

  /* ================= K · Eén of meer ================= */
  /* FASE 5D.1. Alle tellers op Voortgang stonden in het meervoud, dus las een
     kind dat net één show had gespeeld "1 shows gespeeld". Wat hier vastligt is
     niet de tekst maar de regel: enkelvoud alléén bij precies 1 -- óók bij 0
     ("0 shows"), want dat is Nederlands. */
  {
    const { ctx, page } = await fresh();
    const kaarten = async () => page.evaluate(() => ({
      tegels: [...document.querySelectorAll('.stat-tile .cap')].map(e => e.textContent.trim()),
      oogst: [...document.querySelectorAll('.oogst-item')].map(e => e.textContent.trim()),
    }));
    // niets gespeeld: nul is meervoud
    await open(page, 'p1', 'voortgang');
    await page.waitForTimeout(200);
    let r = await kaarten();
    check(r.tegels[0] === 'shows gespeeld' && r.tegels[1] === 'sommen gemaakt',
      'nul is meervoud (0 shows, 0 sommen)', JSON.stringify(r.tegels));
    check(/0 sterren/.test(r.oogst[0]) && /0 perfecte shows/.test(r.oogst[1]),
      'en dat geldt ook voor de oogstregel', JSON.stringify(r.oogst));
    // precies één van alles
    await page.evaluate(() => {
      const p = db.profiles.p1;
      p.stars[1] = 1;                       // één show, één ster, geen perfecte
      p.stats.correct = 1; p.stats.wrong = 0;
      save();
    });
    await open(page, 'p1', 'voortgang');
    await page.waitForTimeout(200);
    r = await kaarten();
    check(r.tegels[0] === 'show gespeeld', 'één show is enkelvoud', JSON.stringify(r.tegels));
    check(r.tegels[1] === 'som gemaakt', 'één som is enkelvoud', JSON.stringify(r.tegels));
    check(/\b1 ster\b/.test(r.oogst[0]), 'één ster is enkelvoud', JSON.stringify(r.oogst));
    // en in de telmodus heet een som een vraag
    await page.evaluate(() => { db.profiles.p1.settings.track = 'count'; save(); });
    await open(page, 'p1', 'voortgang');
    await page.waitForTimeout(200);
    r = await kaarten();
    check(r.tegels[1] === 'vraag gemaakt', 'in de telmodus is het één vraag', JSON.stringify(r.tegels));
    // twee: alles weer meervoud
    await page.evaluate(() => {
      const p = db.profiles.p1;
      p.stars[1] = 3; p.stars[2] = 3;       // twee shows, zes sterren, twee perfect
      p.stats.correct = 2;
      db.profiles.p1.settings.track = 'math';
      save();
    });
    await open(page, 'p1', 'voortgang');
    await page.waitForTimeout(200);
    r = await kaarten();
    check(r.tegels[0] === 'shows gespeeld' && r.tegels[1] === 'sommen gemaakt',
      'twee is weer meervoud', JSON.stringify(r.tegels));
    check(/6 sterren/.test(r.oogst[0]) && /2 perfecte shows/.test(r.oogst[1]),
      'ook in de oogstregel', JSON.stringify(r.oogst));
    await ctx.close();
  }

  /* ================= L · De trofeeteller heeft één bron ================= */
  /* De noemer op Voortgang ("3/18 trofeeën") en de kop van de kast ("je hebt er
     3 van de 18") moeten hetzelfde getal zijn, en dat getal hoort uit
     activeTrophies() te komen -- niet uit een tweede lijstje. Zet iemand er een
     trofee bij (of komt er een wereld bij, wat rebuildWorldBadges doet), dan
     lopen ze zonder deze controle stil uit elkaar. */
  {
    const { ctx, page } = await fresh();
    const r = await page.evaluate(() => {
      const p = db.profiles.p1;
      p.trophies.push('first', 'sums25');
      save();
      openSettings(); setKey = 'p1'; setTab = 'voortgang'; renderSettings();
      const oogst = [...document.querySelectorAll('.oogst-item')].map(e => e.textContent.trim());
      cur = 'p1';        // de kast leest P(), en die heeft een gekozen ster nodig
      openTrophies();
      return {
        teller: oogst[2],
        bron: `${earnedActiveCount(p)}/${activeTrophies().length}`,
        kast: document.getElementById('trophy-count').textContent,
        actief: activeTrophies().length,
        tabel: TROPHIES.length,
      };
    });
    check(/2\/18/.test(r.teller), 'de teller toont het verdiende aantal en het totaal', r.teller);
    check(r.teller.indexOf(r.bron) >= 0, 'en die komen rechtstreeks uit activeTrophies()', `${r.teller} vs ${r.bron}`);
    check(r.kast.indexOf('2') >= 0 && r.kast.indexOf(String(r.actief)) >= 0,
      'de kast noemt exact dezelfde twee getallen', r.kast);
    check(r.actief === r.tabel, 'er staat geen tweede trofeelijst naast de tabel',
      `actief=${r.actief} tabel=${r.tabel}`);
    await ctx.close();
  }

  /* ================= M · Geen percentage bij de inschatting ================= */
  /* FASE 5D.1. Hier stond p.perf als "50%" met een half gevulde balk eronder, en
     dat las als een rapportcijfer -- geen uitleg eronder kon daar tegenop. Het
     getal is uit het scherm; p.perf zelf stuurt de moeilijkheid ongewijzigd.
     Deze zaak bewaakt beide kanten: geen percentage in het blok, en p.perf nog
     wél in de opslag en nog wél in beweging. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => { db.profiles.p1.perf = 0.5; save(); });
    await open(page, 'p1', 'voortgang');
    await page.waitForTimeout(200);
    let r = await page.evaluate(() => {
      const blok = document.querySelector('.niveau-blok');
      return {
        tekst: blok.textContent,
        balken: blok.querySelectorAll('.stat-bar').length,
        bezig: blok.querySelector('.niveau-bezig').textContent.trim(),
        perf: db.profiles.p1.perf,
      };
    });
    check(!/%/.test(r.tekst), 'het niveau-blok noemt geen percentage', r.tekst.slice(0, 80));
    check(r.balken === 0, 'en heeft geen voortgangsbalk', 'balken=' + r.balken);
    check(/automatisch aan/.test(r.tekst), 'maar zegt wél dat het spel zelf bijstelt', r.tekst.slice(0, 80));
    check(/Rekenen/.test(r.bezig) && /tot 20/.test(r.bezig),
      'en zet vooraan waar het kind nu aan werkt', r.bezig);
    check(r.perf === 0.5, 'p.perf staat nog gewoon in de opslag', String(r.perf));
    // telmodus: dan is de fase de bezig-regel
    await page.evaluate(() => {
      db.profiles.p1.settings.track = 'count';
      db.profiles.p1.settings.stage = 3; db.profiles.p1.settings.stageMax = 11;
      db.profiles.p1.countTrack = { stage: 4, rung: 0, streak: 0, seen: 0, acc: 0.5 };
      save();
    });
    await open(page, 'p1', 'voortgang');
    await page.waitForTimeout(200);
    r = await page.evaluate(() => ({
      bezig: document.querySelector('.niveau-bezig').textContent.trim(),
      tekst: document.querySelector('.niveau-blok').textContent,
    }));
    check(/fase 4 van 11/.test(r.bezig) && /Evenveel/.test(r.bezig),
      'in de telmodus staat de fase waar het kind nú speelt er', r.bezig);
    check(!/%/.test(r.tekst), 'ook in de telmodus geen percentage', r.tekst.slice(0, 80));
    // en de moeilijkheid draait nog: perf beweegt mee met goede antwoorden
    const na = await page.evaluate(() => {
      const p = db.profiles.p1;
      const voor = p.perf;
      for (let i = 0; i < 12; i++) updatePerf(p, true, true);
      const omhoog = p.perf;
      for (let i = 0; i < 12; i++) updatePerf(p, false, false);
      return { voor, omhoog, omlaag: p.perf };
    });
    check(na.omhoog > na.voor && na.omlaag < na.omhoog,
      'en p.perf loopt nog gewoon mee met wat goed en fout gaat', JSON.stringify(na));
    await ctx.close();
  }

  /* ================= N · Drie weergavekeuzes op één regel ================= */
  /* "Voorwerpen / Stippen / Mix" beantwoorden samen één vraag, dus horen ze op
     één regel. Met het icoon naast het woord paste dat niet (127px nodig, 105
     beschikbaar) en viel Mix als enige op een tweede regel. Wat hier vastligt:
     op de telefoonmaten drie gelijke kolommen met elk label op één regel, en op
     iets onmogelijk smals wikkelt het netjes in plaats van de woorden te
     knijpen. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => { db.profiles.p1.settings.track = 'count'; save(); });
    const meet = () => page.evaluate(() => {
      const chips = [...document.querySelectorAll('#set-repr .chip')];
      const tops = new Set(chips.map(c => Math.round(c.getBoundingClientRect().top)));
      const regelhoogte = chips[0].querySelector('.mc-label').getBoundingClientRect().height;
      return {
        n: chips.length, regels: tops.size,
        breedtes: chips.map(c => Math.round(c.getBoundingClientRect().width)),
        hoogte: Math.round(chips[0].getBoundingClientRect().height),
        labelsEenRegel: chips.every(c => c.querySelector('.mc-label').getBoundingClientRect().height <= regelhoogte + 1),
        iconen: chips.every(c => !!c.querySelector('.mc-ico')),
        gekozen: document.querySelectorAll('#set-repr .chip.on').length,
      };
    });
    for (const w of [390, 360, 320]) {
      await page.setViewportSize({ width: w, height: 844 });
      await open(page, 'p1', 'oefenen');
      await page.waitForTimeout(350);
      const r = await meet();
      check(r.n === 3 && r.regels === 1, `op ${w}px staan de drie keuzes op één regel`, JSON.stringify(r));
      check(new Set(r.breedtes).size === 1, `en ze zijn even breed op ${w}px`, JSON.stringify(r.breedtes));
      check(r.labelsEenRegel, `zonder dat een woord afbreekt op ${w}px`, JSON.stringify(r));
      check(r.hoogte >= 44, `en het raakvlak blijft comfortabel op ${w}px`, 'hoogte=' + r.hoogte);
      check(r.iconen && r.gekozen === 1, `icoon en gekozen stand blijven op ${w}px`, JSON.stringify(r));
    }
    // onmogelijk smal: liever wikkelen dan knijpen
    await page.setViewportSize({ width: 280, height: 653 });
    await open(page, 'p1', 'oefenen');
    await page.waitForTimeout(350);
    const smal = await meet();
    check(smal.regels === 2 && smal.labelsEenRegel,
      'op een onmogelijk smal venster wikkelt de rij i.p.v. de woorden', JSON.stringify(smal));
    await ctx.close();
  }

  await browser.close();

  /* ================= Uitslag ================= */
  const labels = Object.keys(counts);
  const totaal = labels.reduce((a, l) => a + counts[l].pass + counts[l].fail, 0);
  const goed = labels.reduce((a, l) => a + counts[l].pass, 0);
  console.log('');
  for (const l of labels) {
    const c = counts[l];
    console.log(` ${c.fail ? 'FOUT ' : 'ok   '} ${l}${c.fail ? ` (${c.fail} van ${c.pass + c.fail} fout)` : ''}`);
  }
  console.log(`\nouderdeel: ${goed}/${totaal} controles geslaagd.`);
  if (pageErrors.length) {
    console.log(`\nFouten in de pagina (${pageErrors.length}):`);
    [...new Set(pageErrors)].slice(0, 10).forEach(e => console.log('  ' + e));
  }
  if (fails.length) {
    console.log('\nWat er omviel:');
    fails.forEach(f => console.log('  ' + f));
  }
  if (fails.length || pageErrors.length) process.exitCode = 1;
})();
