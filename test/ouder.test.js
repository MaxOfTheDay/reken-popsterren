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
 *   O  op het beginscherm: de uitlegkaart na de back-up, per browser, en weg in de app
 *   P  Cloudback-up (ouderaccount): de twee standen, inloggen en afmelden --
 *      en geen van beide raakt een save
 *   Q  Cloudback-up maken: wie, wat, één keer tegelijk, twee keer = één rij,
 *      en een mislukte poging laat alles staan
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
  // `toestel` (optioneel, zaak O): een ander venster of een andere user agent,
  // plus een scriptje dat vóór de app draait -- om een iPhone of een
  // geïnstalleerde app na te doen.
  async function fresh(sterren, toestel) {
    toestel = toestel || {};
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 } }, toestel.ctx));
    await cacheFonts(ctx);
    if (toestel.init) await ctx.addInitScript(toestel.init, toestel.arg);
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

  /* ================= O · Op het beginscherm ================= */
  /* De uitlegkaart in Beheer, in een echte browser en op de maat van een Pixel
     (412×920). Het toestel wordt nagedaan met een user agent en een scriptje
     dat vóór de app draait: matchMedia voor de display-mode, navigator.standalone
     en maxTouchPoints voor iOS. Zie "= Op het beginscherm". */
  {
    const UA = {
      android: 'Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
      iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
      ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
      desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0',
    };
    // Vóór de app: een display-mode die "aan" staat, en de iOS-velden.
    const doeNa = o => {
      if (o.stand) {
        const echt = window.matchMedia.bind(window);
        window.matchMedia = q => q === '(display-mode: ' + o.stand + ')'
          ? { matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {},
              addListener() {}, removeListener() {} }
          : echt(q);
      }
      if (o.standalone != null) Object.defineProperty(Navigator.prototype, 'standalone', { get: () => o.standalone, configurable: true });
      if (o.aanraak != null) Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => o.aanraak, configurable: true });
    };
    const toestel = (ua, o) => ({ ctx: { viewport: { width: 412, height: 920 }, userAgent: ua }, init: doeNa, arg: o || {} });
    const kaart = page => page.evaluate(() => {
      const k = document.getElementById('set-beginscherm');
      const kaarten = [...document.querySelectorAll('#settings-body .set-card')];
      const i = kaarten.indexOf(k);
      return {
        er: !!k,
        vorige: i > 0 ? kaarten[i - 1].querySelector('h2').textContent : null,
        laatste: i === kaarten.length - 1,
        secundair: !!k && k.classList.contains('secundair'),
        kop: k ? k.querySelector('h2').textContent : '',
        tekst: k ? k.textContent.replace(/\s+/g, ' ') : '',
        knoppen: k ? k.querySelectorAll('button, a, input').length : -1,
        noten: k ? [...k.querySelectorAll('.note')].map(n => getComputedStyle(n).fontSize) : [],
      };
    });

    // Android (Pixel): na de back-up, stil, zonder knop, met het ⋮-menu.
    {
      const { ctx, page } = await fresh(null, toestel(UA.android));
      await open(page, 'p1', 'beheer');
      await page.waitForTimeout(200);
      const r = await kaart(page);
      check(r.er && r.vorige === 'Back-up & herstel' && r.laatste,
        'O · de kaart staat direct na Back-up & herstel, als laatste', JSON.stringify(r));
      check(r.secundair && r.kop === 'Op het beginscherm' && r.knoppen === 0,
        'O · een stille secundaire kaart, uitleg zonder knop', JSON.stringify(r));
      check(/Chrome stelt soms zelf voor/.test(r.tekst) && /Tik op ⋮ en kies ‘App installeren’/.test(r.tekst),
        'O · Android: het voorstel van Chrome, en anders het ⋮-menu', r.tekst);
      // Nul sterren: de kaart staat er óók (het app-brede blok), zonder waarschuwing.
      await page.evaluate(() => { db.profiles = {}; save(); openSettings(); });
      await page.waitForTimeout(200);
      const leeg = await kaart(page);
      check(leeg.er && leeg.vorige === 'Back-up & herstel', 'O · ook zonder sterren, na de back-up', JSON.stringify(leeg));
      // appinstalled: meteen weg, en niets bewaard.
      await open(page, null, 'beheer');
      const voor = await page.evaluate(() => JSON.stringify(Object.assign({}, localStorage)));
      await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
      await page.waitForTimeout(100);
      check(!(await kaart(page)).er, 'O · appinstalled haalt de kaart meteen weg', '');
      await page.evaluate(() => renderSettings());
      check(!(await kaart(page)).er, 'O · en ze blijft weg in deze sessie', '');
      const na = await page.evaluate(() => JSON.stringify(Object.assign({}, localStorage)));
      check(voor === na, 'O · appinstalled schrijft niets weg', na.slice(0, 120));
      await page.reload();
      await page.waitForTimeout(250);
      await open(page, null, 'beheer');
      check((await kaart(page)).er, 'O · een nieuwe start vraagt het weer aan de browser', '');
      await ctx.close();
    }

    // iPhone en iPad: Safari → Deel, en de back-upwaarschuwing blijft een stille noot.
    for (const [naam, ua, o] of [['iPhone', UA.iphone, {}], ['iPad', UA.ipad, { aanraak: 5 }]]) {
      const { ctx, page } = await fresh(null, toestel(ua, o));
      await open(page, 'p1', 'beheer');
      await page.waitForTimeout(200);
      const r = await kaart(page);
      check(/Tik in Safari op Deel en kies ‘Zet op beginscherm’/.test(r.tekst), `O · ${naam}: Deel → Zet op beginscherm`, r.tekst);
      check(/Heb je al gespeeld in Safari\? Maak dan hierboven eerst een back-up/.test(r.tekst),
        `O · ${naam}: met de back-upwaarschuwing`, r.tekst);
      check(r.noten.length === 2 && r.noten[0] === r.noten[1],
        `O · ${naam}: de waarschuwing is een gewone noot, niet groter dan de uitleg`, JSON.stringify(r.noten));
      await ctx.close();
    }

    // Computer en de rest.
    for (const [naam, ua, zin] of [['computer', UA.desktop, /installeer-icoon in de adresbalk/],
      ['Firefox', UA.firefox, /Open de pagina dan in Chrome/]]) {
      const { ctx, page } = await fresh(null, toestel(ua));
      await open(page, 'p1', 'beheer');
      await page.waitForTimeout(200);
      const r = await kaart(page);
      check(r.er && zin.test(r.tekst), `O · ${naam}: de juiste uitleg`, r.tekst);
      await ctx.close();
    }

    // Als app: weg, in alle vier de standen.
    for (const [naam, ua, o] of [['fullscreen', UA.android, { stand: 'fullscreen' }],
      ['standalone', UA.android, { stand: 'standalone' }], ['minimal-ui', UA.desktop, { stand: 'minimal-ui' }],
      ['navigator.standalone', UA.iphone, { standalone: true }]]) {
      const { ctx, page } = await fresh(null, toestel(ua, o));
      await open(page, 'p1', 'beheer');
      await page.waitForTimeout(200);
      const r = await kaart(page);
      const backup = await page.evaluate(() => !!document.getElementById('set-export'));
      check(!r.er && backup, `O · als app (${naam}) is de kaart weg, en de back-up staat er nog`, JSON.stringify(r));
      await ctx.close();
    }
  }

  /* ================= P · Cloudback-up: het ouderaccount ================= */
  /* src/18-ouderaccount.js. Supabase wordt hier niet echt aangesproken: elke
     aanvraag naar het project wordt door page.route beantwoord en opgeschreven,
     zodat we zien wát er gevraagd werd -- en vooral dat er bij een gewone start
     níets gevraagd wordt. De harde eis van deze zaak: inloggen, afmelden, een
     geannuleerde of mislukte poging veranderen geen letter aan de opslag van
     het spel. Alleen de twee eigen sleutels van het account mogen bewegen. */
  {
    const SB = '**://iufyykmcembysfdcoogg.supabase.co/**';
    const SESSIE = 'rekensterren-ouderaccount', PKCE = 'rekensterren-ouderaccount-pkce';
    const CORS = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'apikey, authorization, content-type',
      'access-control-allow-methods': 'POST, GET, OPTIONS',
    };
    // Alles in localStorage behalve de accountsleutels, als één string.
    const spelOpslag = page => page.evaluate(([a, b]) => JSON.stringify(Object.keys(localStorage)
      .filter(k => k !== a && k !== b).sort().map(k => [k, localStorage.getItem(k)])), [SESSIE, PKCE]);
    // Supabase nadoen: antwoord(pad, body) -> [status, json] voor de Auth-API.
    // De database (/rest/v1/, zaak Q) krijgt zijn eigen `rest`; zonder die zegt
    // hij "nog geen back-up" -- een ingelogde kaart vraagt daar altijd naar.
    async function nepSupabase(ctx, antwoord, rest) {
      const log = [];
      await ctx.route(SB, async route => {
        const req = route.request();
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
        const u = new URL(req.url());
        const body = req.postData() ? JSON.parse(req.postData()) : null;
        log.push({ pad: u.pathname + u.search, methode: req.method(), body, headers: req.headers() });
        const req2 = { methode: req.method(), headers: req.headers() };
        const antw = /^\/rest\/v1\//.test(u.pathname)
          ? (rest || (() => [200, []]))(u.pathname + u.search, body, req2)
          : antwoord(u.pathname + u.search, body);
        const [status, json] = await antw;          // mag een belofte zijn (zaak Q: trage server)
        if (status === 'afbreken') return route.abort();
        return route.fulfill({ status, headers: Object.assign({ 'content-type': 'application/json' }, CORS),
          body: json == null ? '' : JSON.stringify(json) });
      });
      return log;
    }
    const kaart = page => page.evaluate(() => {
      const k = document.getElementById('set-account');
      const kaarten = [...document.querySelectorAll('#settings-body .set-card')].map(c => c.querySelector('h2').textContent);
      return {
        er: !!k,
        kop: k ? k.querySelector('h2').textContent : '',
        tekst: k ? k.textContent.replace(/\s+/g, ' ').trim() : '',
        knoppen: k ? [...k.querySelectorAll('button')].map(b => b.textContent.trim() + (b.disabled ? ' (uit)' : '')) : [],
        volgende: kaarten[kaarten.indexOf('Cloudback-up') + 1],
        ouderdeel: document.getElementById('screen-settings').classList.contains('active'),
      };
    });
    const nu = () => Math.floor(Date.now() / 1000);
    const sessie = (mail, over) => ({ access_token: 'at-oud', refresh_token: 'rt-oud', expires_at: nu() + over,
      user: { id: 'u-1', email: mail } });
    const antwoordSessie = mail => ({ access_token: 'at-nieuw', refresh_token: 'rt-nieuw', token_type: 'bearer',
      expires_in: 3600, expires_at: nu() + 3600,
      user: { id: 'u-1', email: mail, user_metadata: { full_name: 'Ouder', avatar_url: 'x' } } });

    // Afgemeld: de standaard, zonder één aanvraag naar buiten.
    {
      const { ctx, page } = await fresh();
      const log = await nepSupabase(ctx, () => [500, null]);
      await page.reload();
      await page.waitForTimeout(250);
      await open(page, 'p1', 'beheer');
      await page.waitForTimeout(200);
      const r = await kaart(page);
      check(r.er && r.kop === 'Cloudback-up', 'P · Beheer heeft een kaart Cloudback-up', JSON.stringify(r));
      check(/Niet verbonden/.test(r.tekst) && /Bewaar je voortgang veilig en zet hem later terug op een ander toestel\./.test(r.tekst),
        'P · afgemeld: "Niet verbonden" en de uitleg', r.tekst);
      check(r.knoppen.length === 1 && /^Doorgaan met Google/.test(r.knoppen[0]),
        'P · afgemeld: één knop, "Doorgaan met Google"', JSON.stringify(r.knoppen));
      // de tests draaien vanaf file://: daar kan Google niet terugkomen
      check(/\(uit\)$/.test(r.knoppen[0]) && /alleen in de online versie/.test(r.tekst),
        'P · vanaf file:// staat de knop uit, met een zin erbij', r.tekst);
      check(r.volgende === 'Back-up & herstel', 'P · de kaart staat vóór de gewone back-up', JSON.stringify(r));
      check(log.length === 0, 'P · zonder account gaat er niets naar Supabase', JSON.stringify(log.map(l => l.pad)));
      // en spelen gaat gewoon
      await page.evaluate(() => { closeSettings(); selectProfile('p1'); });
      await page.waitForTimeout(300);
      await page.evaluate(() => startLevel(P().level));
      await page.waitForTimeout(400);
      const speelt = await page.evaluate(() => document.getElementById('screen-game').classList.contains('active'));
      check(speelt, 'P · zonder account kun je gewoon een show spelen', '');
      await ctx.close();
    }

    // Verbonden (sessie uit een eerdere start) en weer afmelden.
    {
      const { ctx, page } = await fresh();
      const log = await nepSupabase(ctx, () => [204, null]);
      await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [SESSIE, sessie('ouder@voorbeeld.be', 3000)]);
      await page.reload();
      await page.waitForTimeout(250);
      const voor = await spelOpslag(page);
      await open(page, 'p1', 'beheer');
      await page.waitForTimeout(200);
      let r = await kaart(page);
      check(/Verbonden/.test(r.tekst) && !/Niet verbonden/.test(r.tekst) && /ouder@voorbeeld\.be/.test(r.tekst),
        'P · de sessie overleeft een herstart: "Verbonden" met het adres', r.tekst);
      check(JSON.stringify(r.knoppen) === '["Nu back-up maken","Afmelden"]',
        'P · verbonden: "Nu back-up maken" en "Afmelden"', JSON.stringify(r));
      check(!log.some(l => /\/auth\/v1\//.test(l.pad)), 'P · een geldige sessie wordt niet nodeloos ververst', JSON.stringify(log.map(l => l.pad)));
      await page.click('#set-account-uit');
      await page.waitForTimeout(300);
      r = await kaart(page);
      const weg = await page.evaluate(k => localStorage.getItem(k), SESSIE);
      check(/Niet verbonden/.test(r.tekst) && weg === null, 'P · afmelden: de kaart zegt het en de sessie is weg', r.tekst);
      const uit = log.find(l => /\/auth\/v1\/logout/.test(l.pad));
      check(uit && /scope=local/.test(uit.pad) && uit.headers.authorization === 'Bearer at-oud'
        && /^sb_publishable_/.test(uit.headers.apikey), 'P · afmelden meldt het ook bij Supabase, met de publishable sleutel', JSON.stringify(log));
      check(await spelOpslag(page) === voor, 'P · afmelden verandert niets aan de opslag van het spel', '');
      await ctx.close();
    }

    // Terug van Google: de code wordt ingewisseld, en we staan weer in Beheer.
    {
      const { ctx, page } = await fresh();
      const log = await nepSupabase(ctx, pad => /grant_type=pkce/.test(pad) ? [200, antwoordSessie('ouder@voorbeeld.be')] : [500, null]);
      await page.evaluate(k => localStorage.setItem(k, 'mijn-verifier'), PKCE);
      const voor = await spelOpslag(page);
      await page.goto(APP_URL + '&code=code-123');
      await page.waitForTimeout(500);
      const r = await kaart(page);
      const na = await page.evaluate(([a, b]) => ({ zoek: location.search, sessie: JSON.parse(localStorage.getItem(a)),
        pkce: localStorage.getItem(b) }), [SESSIE, PKCE]);
      const ruil = log.find(l => /grant_type=pkce/.test(l.pad));
      check(ruil && ruil.body.auth_code === 'code-123' && ruil.body.code_verifier === 'mijn-verifier',
        'P · de code wordt met de verifier ingewisseld', JSON.stringify(log));
      check(r.ouderdeel && /Verbonden/.test(r.tekst) && /ouder@voorbeeld\.be/.test(r.tekst),
        'P · na de terugkeer: het ouderdeel open, en verbonden', JSON.stringify(r));
      check(na.zoek === '?debug' && na.pkce === null, 'P · de code gaat uit de adresbalk en de verifier is op', JSON.stringify(na));
      check(na.sessie && na.sessie.refresh_token === 'rt-nieuw' && !na.sessie.user.user_metadata,
        'P · de sessie is bewaard, zonder Googles naam en foto', JSON.stringify(na.sessie));
      check(await spelOpslag(page) === voor, 'P · inloggen verandert niets aan de opslag van het spel', '');
      // herladen probeert niet nog eens
      await page.reload();
      await page.waitForTimeout(300);
      check(log.filter(l => /grant_type=pkce/.test(l.pad)).length === 1, 'P · herladen wisselt niet nog eens in', '');
      await ctx.close();
    }

    // Geannuleerd bij Google, of Supabase zegt nee: niets veranderd.
    for (const [naam, extra, antwoord] of [
      ['geannuleerd', '&error=access_denied&error_description=user+cancelled', () => [500, null]],
      ['mislukt', '&code=code-123', () => [400, { error: 'invalid_grant' }]],
    ]) {
      const { ctx, page } = await fresh();
      const fouten = pageErrors.length;
      const log = await nepSupabase(ctx, antwoord);
      await page.evaluate(k => localStorage.setItem(k, 'mijn-verifier'), PKCE);
      const voor = await spelOpslag(page);
      await page.goto(APP_URL + extra);
      await page.waitForTimeout(500);
      const r = await kaart(page);
      const na = await page.evaluate(([a, b]) => ({ zoek: location.search, s: localStorage.getItem(a), v: localStorage.getItem(b) }), [SESSIE, PKCE]);
      check(/Niet verbonden/.test(r.tekst) && na.s === null && na.v === null && na.zoek === '?debug',
        `P · ${naam}: afgemeld, en de adresbalk is schoon`, JSON.stringify([r, na]));
      check(naam === 'mislukt' || log.length === 0, `P · ${naam}: geen aanvraag naar Supabase`, JSON.stringify(log.map(l => l.pad)));
      check(await spelOpslag(page) === voor, `P · ${naam}: de opslag van het spel is onaangeroerd`, '');
      // Een 400 van Supabase zet de browser zelf in de console; dat is hier het
      // geval dat we nadoen, geen fout in de pagina.
      if (naam === 'mislukt') {
        const nieuw = pageErrors.splice(fouten);
        pageErrors.push(...nieuw.filter(e => !/status of 400/.test(e)));
      }
      const spelers = await page.evaluate(() => Object.keys(db.profiles).length);
      check(spelers === 2, `P · ${naam}: de sterren zijn er nog`, String(spelers));
      await ctx.close();
    }

    // Een vreemde ?code= zonder dat wíj naar Google gingen: niets doen.
    {
      const { ctx, page } = await fresh();
      const log = await nepSupabase(ctx, () => [500, null]);
      await page.goto(APP_URL + '&code=iets');
      await page.waitForTimeout(300);
      const ouder = await page.evaluate(() => document.getElementById('screen-settings').classList.contains('active'));
      check(!ouder && log.length === 0, 'P · een ?code= zonder eigen verifier doet niets', JSON.stringify(log.map(l => l.pad)));
      await ctx.close();
    }

    /* De hele rondreis, over http en niet file://: de knop, de sprong naar
       Supabase, Google die terugstuurt, het inwisselen. Een klein servertje
       serveert de map; 127.0.0.1 is een veilige context, dus crypto.subtle is er
       en de knop staat aan. Supabase én Google worden door de route gespeeld. */
    {
      const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
      const WORTEL = path.resolve(__dirname, '..');
      const SOORT = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
        '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
        '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
      const server = http.createServer((req, res) => {
        const pad = path.join(WORTEL, decodeURIComponent(new URL(req.url, 'http://x').pathname));
        const bestand = pad.endsWith(path.sep) ? path.join(pad, 'index.html') : pad;
        if (!bestand.startsWith(WORTEL) || !fs.existsSync(bestand) || fs.statSync(bestand).isDirectory()) {
          res.writeHead(404); return res.end();
        }
        res.writeHead(200, { 'content-type': SOORT[path.extname(bestand)] || 'application/octet-stream' });
        fs.createReadStream(bestand).pipe(res);
      });
      await new Promise(k => server.listen(0, '127.0.0.1', k));
      const BASIS = `http://127.0.0.1:${server.address().port}/`;
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
      await cacheFonts(ctx);
      const page = await ctx.newPage();
      page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
      page.on('console', m => { if (m.type() === 'error') pageErrors.push('CONSOLE ' + m.text()); });
      let naarGoogle = null;
      const log = await nepSupabase(ctx, pad => /grant_type=pkce/.test(pad) ? [200, antwoordSessie('ouder@voorbeeld.be')] : [500, null]);
      // /authorize is een paginasprong, geen fetch: die vangen we apart, vóór de
      // algemene route (de laatst aangehangen route gaat eerst).
      await ctx.route('**://iufyykmcembysfdcoogg.supabase.co/auth/v1/authorize**', route => {
        naarGoogle = new URL(route.request().url());
        const terug = naarGoogle.searchParams.get('redirect_to') + '?code=code-rond';
        return route.fulfill({ status: 302, headers: { location: terug } });
      });
      await page.goto(BASIS);
      await page.evaluate(() => {
        db.profiles.p1 = defaultProfile('Anna', 'dress_roze', { base: 'meisje' });
        db.profiles.p1.stars = { 1: 3, 2: 2 };
        db.profiles.p1.order = 0;   // anders vult load() het bij de herstart aan
        save(); goProfiles();
      });
      const voor = await spelOpslag(page);
      await page.evaluate(() => { openSettings(); setTab = 'beheer'; renderSettings(); });
      await page.waitForTimeout(200);
      let r = await kaart(page);
      check(JSON.stringify(r.knoppen) === '["Doorgaan met Google"]', 'P · over https/localhost staat de knop aan', JSON.stringify(r.knoppen));
      await Promise.all([page.waitForURL(u => /code=|\?$|\/$/.test(String(u)) && naarGoogle !== null, { timeout: 5000 }).catch(() => {}),
        page.click('#set-account-in')]);
      await page.waitForTimeout(800);
      const q = naarGoogle ? Object.fromEntries(naarGoogle.searchParams) : {};
      check(q.provider === 'google' && q.redirect_to === BASIS && q.code_challenge_method === 's256' && !q.scopes,
        'P · de sprong: provider google, terug naar deze pagina, PKCE, geen extra scopes', JSON.stringify(q));
      const ruil = log.find(l => /grant_type=pkce/.test(l.pad));
      const hash = ruil ? crypto.createHash('sha256').update(ruil.body.code_verifier).digest('base64url') : null;
      check(ruil && ruil.body.auth_code === 'code-rond' && hash === q.code_challenge,
        'P · de terugkeer wisselt de code in met de verifier die bij de challenge hoort', JSON.stringify(ruil && ruil.body));
      r = await kaart(page);
      check(r.ouderdeel && /Verbonden/.test(r.tekst) && /ouder@voorbeeld\.be/.test(r.tekst) && page.url() === BASIS,
        'P · rondreis: terug in het ouderdeel, verbonden, en de adresbalk schoon', JSON.stringify([r.tekst, page.url()]));
      check(await spelOpslag(page) === voor, 'P · rondreis: de opslag van het spel is onaangeroerd', '');
      // een herstart: nog steeds verbonden, en de sterren van Anna staan er nog
      await page.reload();
      await page.waitForTimeout(300);
      await page.evaluate(() => { openSettings(); setTab = 'beheer'; renderSettings(); });
      await page.waitForTimeout(200);
      r = await kaart(page);
      const sterren = await page.evaluate(() => JSON.stringify(db.profiles.p1.stars));
      check(/Verbonden/.test(r.tekst) && sterren === '{"1":3,"2":2}', 'P · rondreis: na een herstart nog verbonden, en de voortgang is dezelfde', r.tekst + ' ' + sterren);
      await ctx.close();
      server.close();
    }

    /* ================= Q · Een cloudback-up maken ================= */
    /* src/19-cloudbackup.js. De database zelf (RLS, één rij per ouder) wordt in
       test/rls.test.js tegen een echte PostgreSQL nagekeken; hier gaat het om
       wat de app verstuurt en wat de kaart zegt. De server hieronder houdt zijn
       rijen bij in een Map op user_id, net als de primaire sleutel. */
    {
      const QFOUT = pageErrors.length;
      const LS = 'rekenPopsterren_v1';
      // De "server": één rij per user_id; een upsert overschrijft.
      function nepTabel() {
        const rijen = new Map();
        let klok = Date.parse('2026-09-23T08:00:00Z');
        const t = { rijen, posts: [], gets: [], stand: 'ok', wacht: null };
        t.rest = async (pad, body, req) => {
          if (req.methode === 'GET') {
            t.gets.push({ pad, req });
            if (t.stand === 'status-kapot') return [500, { message: 'kapot' }];
            const id = (/user_id=eq\.([^&]+)/.exec(pad) || [])[1];
            const rij = rijen.get(decodeURIComponent(id || ''));
            return [200, rij ? [{ updated_at: rij.updated_at }] : []];
          }
          t.posts.push({ pad, body, req });
          if (t.wacht) await t.wacht;
          if (t.stand === 'kapot') return [500, { message: 'kapot' }];
          if (t.stand === 'weg') return ['afbreken'];
          klok += 60000;
          const rij = Object.assign({}, body, { updated_at: new Date(klok).toISOString() });
          rijen.set(body.user_id, rij);
          return [201, [{ updated_at: rij.updated_at }]];
        };
        return t;
      }
      const inlog = async (page, s) => {
        await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [SESSIE, s]);
        await page.reload();
        await page.waitForTimeout(250);
      };
      const spelEnDb = page => page.evaluate(() => JSON.stringify(db));
      const verzondenIsSave = (post, lsTekst) =>
        JSON.stringify(post.body.backup_data) === JSON.stringify(JSON.parse(lsTekst));

      // Afgemeld: geen knop, en de functie zelf aanroepen doet niets.
      {
        const { ctx, page } = await fresh();
        const t = nepTabel();
        const log = await nepSupabase(ctx, () => [500, null], t.rest);
        await page.reload();
        await page.waitForTimeout(250);
        await open(page, 'p1', 'beheer');
        await page.waitForTimeout(200);
        const knop = await page.evaluate(() => !!document.getElementById('set-cloud-maak'));
        await page.evaluate(() => cloudBackupMaken());
        await page.waitForTimeout(300);
        check(!knop && t.posts.length === 0 && log.length === 0,
          'Q · afgemeld: geen knop, en cloudBackupMaken() stuurt niets', JSON.stringify(log.map(l => l.pad)));
        await ctx.close();
      }

      // Ingelogd: nog geen back-up -> maken -> bewaard, met de juiste gebruiker en de hele save.
      {
        const { ctx, page } = await fresh(['Anna', 'Bas', 'Cato']);
        const t = nepTabel();
        const log = await nepSupabase(ctx, () => [500, null], t.rest);
        await page.evaluate(() => {
          db.profiles.p1.stars = { 1: 3, 2: 3, 3: 1 }; db.profiles.p1.diamonds = 140;
          db.profiles.p2.owned.push('mic_zilver'); db.profiles.p2.equipped.mic = 'mic_zilver';
          save();
        });
        await inlog(page, sessie('ouder@voorbeeld.be', 3000));
        await open(page, 'p1', 'beheer');
        await page.waitForTimeout(300);
        let r = await kaart(page);
        const get = t.gets[0];
        check(/Verbonden/.test(r.tekst) && /ouder@voorbeeld\.be/.test(r.tekst) && /Nog geen cloudback-up/.test(r.tekst)
          && JSON.stringify(r.knoppen) === '["Nu back-up maken","Afmelden"]',
          'Q · verbonden zonder back-up: "Nog geen cloudback-up" en de knop', JSON.stringify(r));
        check(get && /user_id=eq\.u-1/.test(get.pad) && /select=updated_at/.test(get.pad)
          && get.req.headers.authorization === 'Bearer at-oud',
          'Q · de stand wordt voor déze ouder opgevraagd, zonder de save zelf', JSON.stringify(get));

        const lsVoor = await page.evaluate(k => localStorage.getItem(k), LS);
        const voor = await spelOpslag(page), dbVoor = await spelEnDb(page);
        // een trage server, om de laadstand te kunnen zien
        let los; t.wacht = new Promise(k => { los = k; });
        await page.click('#set-cloud-maak');
        await page.waitForTimeout(200);
        r = await kaart(page);
        await page.evaluate(() => { cloudBackupMaken(); cloudBackupMaken(); });
        await page.waitForTimeout(200);
        check(r.knoppen[0] === 'Bezig met back-up… (uit)', 'Q · tijdens het versturen: de knop staat uit en zegt het', JSON.stringify(r.knoppen));
        check(t.posts.length === 1, 'Q · nog eens tikken stuurt niets dubbel', String(t.posts.length));
        los(); t.wacht = null;
        await page.waitForTimeout(300);
        r = await kaart(page);
        const post = t.posts[0];
        const verwachtDatum = await page.evaluate(iso => cloudDatum(iso), t.rijen.get('u-1').updated_at);
        check(/✓ Back-up bewaard/.test(r.tekst) && r.tekst.includes('Laatste back-up: ' + verwachtDatum) && !/Nog geen/.test(r.tekst),
          'Q · daarna: "✓ Back-up bewaard" met de tijd van de server', r.tekst + ' | ' + verwachtDatum);
        check(JSON.stringify(r.knoppen) === '["Nu back-up maken","Afmelden"]', 'Q · en de knop kan weer', JSON.stringify(r.knoppen));
        check(post.req.methode === 'POST' && /\/rest\/v1\/account_backups\?on_conflict=user_id/.test(post.pad)
          && /resolution=merge-duplicates/.test(post.req.headers.prefer),
          'Q · het is een upsert op user_id', JSON.stringify([post.pad, post.req.headers.prefer]));
        check(post.body.user_id === 'u-1' && post.req.headers.authorization === 'Bearer at-oud'
          && /^sb_publishable_/.test(post.req.headers.apikey),
          'Q · met het id en het token van de ingelogde ouder, en de publishable sleutel', JSON.stringify([post.body.user_id, post.req.headers.authorization]));
        check(post.body.backup_version === 1 && Object.keys(post.body).sort().join() === 'backup_data,backup_version,user_id',
          'Q · de envelop: user_id, backup_version 1, backup_data -- verder niets', JSON.stringify(Object.keys(post.body)));
        check(verzondenIsSave(post, lsVoor), 'Q · backup_data is precies de save uit localStorage', '');
        const inhoud = post.body.backup_data;
        check(Object.keys(inhoud.profiles).length === 3 && inhoud.profiles.p1.diamonds === 140
          && inhoud.profiles.p1.stars['2'] === 3 && inhoud.profiles.p2.equipped.mic === 'mic_zilver'
          && typeof inhoud.sound === 'boolean' && inhoud.schemaV >= 1,
          'Q · met alle sterren, hun voortgang en kast, en de app-brede schakelaars', JSON.stringify(Object.keys(inhoud)));
        check(await spelOpslag(page) === voor && await spelEnDb(page) === dbVoor,
          'Q · back-uppen verandert niets aan de opslag of aan db', '');
        check(JSON.stringify(inhoud) === dbVoor, 'Q · en de save is dezelfde als db (dus als het back-upbestand)', '');

        // Twee keer: dezelfde rij, een nieuwere tijd, de nieuwe inhoud.
        const eerste = t.rijen.get('u-1').updated_at;
        await page.evaluate(() => { db.profiles.p1.diamonds = 150; save(); });
        await page.click('#set-cloud-maak');
        await page.waitForTimeout(400);
        r = await kaart(page);
        const tweede = t.rijen.get('u-1');
        const datum2 = await page.evaluate(iso => cloudDatum(iso), tweede.updated_at);
        check(t.posts.length === 2 && t.rijen.size === 1 && t.posts[1].body.user_id === 'u-1'
          && /on_conflict=user_id/.test(t.posts[1].pad),
          'Q · twee keer back-uppen: dezelfde rij, geen tweede', JSON.stringify([...t.rijen.keys()]));
        check(tweede.updated_at > eerste && tweede.backup_data.profiles.p1.diamonds === 150 && r.tekst.includes('Laatste back-up: ' + datum2),
          'Q · met de nieuwe inhoud en de nieuwe tijd op de kaart', r.tekst);

        // Herstarten: de kaart vraagt de stand opnieuw en weet dat er een back-up is.
        await page.reload();
        await page.waitForTimeout(250);
        await open(page, 'p1', 'beheer');
        await page.waitForTimeout(300);
        r = await kaart(page);
        check(/✓ Back-up bewaard/.test(r.tekst) && r.tekst.includes('Laatste back-up: ' + datum2),
          'Q · na een herstart weet de kaart nog wanneer de laatste back-up was', r.tekst);
        check(!log.some(l => /\/auth\/v1\//.test(l.pad)), 'Q · een geldig token: niets ververst', JSON.stringify(log.map(l => l.pad)));
        await ctx.close();
      }

      // Mislukt: een serverfout en geen net. Niets verloren, opnieuw proberen kan.
      for (const [naam, stand] of [['serverfout', 'kapot'], ['geen verbinding', 'weg']]) {
        const { ctx, page } = await fresh();
        const t = nepTabel();
        await nepSupabase(ctx, () => [500, null], t.rest);
        await inlog(page, sessie('ouder@voorbeeld.be', 3000));
        await open(page, 'p1', 'beheer');
        await page.waitForTimeout(300);
        const voor = await spelOpslag(page), dbVoor = await spelEnDb(page);
        t.stand = stand;
        await page.click('#set-cloud-maak');
        await page.waitForTimeout(400);
        let r = await kaart(page);
        check(/Back-up mislukt\. Je voortgang op dit toestel is niet veranderd\. Probeer het opnieuw\./.test(r.tekst)
          && /Nog geen cloudback-up/.test(r.tekst) && r.knoppen[0] === 'Nu back-up maken',
          `Q · ${naam}: een duidelijke zin, de oude stand, en de knop kan weer`, JSON.stringify(r));
        check(await spelOpslag(page) === voor && await spelEnDb(page) === dbVoor,
          `Q · ${naam}: de opslag en db zijn onaangeroerd`, '');
        t.stand = 'ok';
        await page.click('#set-cloud-maak');
        await page.waitForTimeout(400);
        r = await kaart(page);
        check(/✓ Back-up bewaard/.test(r.tekst) && !/mislukt/.test(r.tekst), `Q · ${naam}: opnieuw proberen lukt, en de fout is weg`, r.tekst);
        // en spelen gaat gewoon door
        await page.evaluate(() => { closeSettings(); selectProfile('p1'); });
        await page.waitForTimeout(300);
        await page.evaluate(() => startLevel(P().level));
        await page.waitForTimeout(400);
        const speelt = await page.evaluate(() => document.getElementById('screen-game').classList.contains('active'));
        check(speelt, `Q · ${naam}: daarna gewoon een show spelen`, '');
        await ctx.close();
      }

      // De stand ophalen mislukt: dat zegt de kaart, en back-uppen kan toch.
      {
        const { ctx, page } = await fresh();
        const t = nepTabel();
        t.stand = 'status-kapot';
        await nepSupabase(ctx, () => [500, null], t.rest);
        await inlog(page, sessie('ouder@voorbeeld.be', 3000));
        await open(page, 'p1', 'beheer');
        await page.waitForTimeout(300);
        let r = await kaart(page);
        check(/Laatste back-up onbekend/.test(r.tekst) && r.knoppen[0] === 'Nu back-up maken',
          'Q · stand onbekend: dat staat er, en de knop blijft', r.tekst);
        t.stand = 'ok';
        await page.click('#set-cloud-maak');
        await page.waitForTimeout(400);
        r = await kaart(page);
        check(/✓ Back-up bewaard/.test(r.tekst), 'Q · en een back-up maken lukt dan gewoon', r.tekst);
        await ctx.close();
      }

      // Een save die niet door de keuring komt, wordt niet verstuurd.
      {
        const { ctx, page } = await fresh();
        const t = nepTabel();
        await nepSupabase(ctx, () => [500, null], t.rest);
        await inlog(page, sessie('ouder@voorbeeld.be', 3000));
        await open(page, 'p1', 'beheer');
        await page.waitForTimeout(300);
        // de opgeslagen save even vervangen door iets dat geen save van ons is
        await page.evaluate(k => { window.__save = localStorage.getItem(k); localStorage.setItem(k, '{"profiles":[1]}'); }, LS);
        await page.click('#set-cloud-maak');
        await page.waitForTimeout(300);
        const r = await kaart(page);
        const bleef = await page.evaluate(k => { const v = localStorage.getItem(k); localStorage.setItem(k, window.__save); return v; }, LS);
        check(t.posts.length === 0 && /kon niet klaargemaakt worden\. Er is niets verstuurd\./.test(r.tekst),
          'Q · een save die de keuring niet haalt gaat niet de deur uit', r.tekst);
        check(bleef === '{"profiles":[1]}', 'Q · en de mislukte poging schrijft zelf niets terug', bleef);
        // een kijkstand (?debug&demo) wordt nooit opgeslagen, en gaat dus ook niet mee
        const lsTekst = await page.evaluate(k => localStorage.getItem(k), LS);
        await page.goto(APP_URL + '&demo');
        await page.waitForTimeout(300);
        await page.evaluate(() => { openSettings(); setTab = 'beheer'; renderSettings(); });
        await page.waitForTimeout(300);
        await page.click('#set-cloud-maak');
        await page.waitForTimeout(400);
        const demoPost = t.posts[0];
        check(demoPost && verzondenIsSave(demoPost, lsTekst) && !demoPost.body.backup_data.profiles.p1.name.includes('Lotte'),
          'Q · met ?debug&demo gaat de opgeslagen save mee, niet de voorbeeldsterren', JSON.stringify(demoPost && Object.values(demoPost.body.backup_data.profiles).map(p => p.name)));
        await ctx.close();
      }

      // Verlopen token: eerst verversen, dan pas versturen -- met het nieuwe token.
      {
        const { ctx, page } = await fresh();
        const t = nepTabel();
        const log = await nepSupabase(ctx, pad => /grant_type=refresh_token/.test(pad)
          ? [200, antwoordSessie('ouder@voorbeeld.be')] : [500, null], t.rest);
        await inlog(page, sessie('ouder@voorbeeld.be', -100));
        await open(page, 'p1', 'beheer');
        await page.waitForTimeout(400);
        await page.click('#set-cloud-maak');
        await page.waitForTimeout(400);
        const verversingen = log.filter(l => /grant_type=refresh_token/.test(l.pad)).length;
        check(verversingen === 1 && t.gets[0].req.headers.authorization === 'Bearer at-nieuw'
          && t.posts[0].req.headers.authorization === 'Bearer at-nieuw',
          'Q · een verlopen token wordt één keer ververst, en daarna gebruikt', JSON.stringify(log.map(l => l.pad)));
        await ctx.close();
      }

      // De 500's en het afgebroken verzoek hierboven zijn de nagedane gevallen.
      const nieuw = pageErrors.splice(QFOUT);
      pageErrors.push(...nieuw.filter(e => !/status of 500|ERR_FAILED/.test(e)));
    }

    // Verlopen sessie: pas bij het tonen van de kaart nakijken. Ingetrokken -> afgemeld.
    for (const [naam, status, verwacht] of [['ververst', 200, /Verbonden/], ['ingetrokken', 400, /Niet verbonden/]]) {
      const { ctx, page } = await fresh();
      const fouten = pageErrors.length;
      const log = await nepSupabase(ctx, pad => /grant_type=refresh_token/.test(pad)
        ? (status === 200 ? [200, antwoordSessie('ouder@voorbeeld.be')] : [400, { error: 'invalid_grant' }]) : [500, null]);
      await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [SESSIE, sessie('ouder@voorbeeld.be', -100)]);
      await page.reload();
      await page.waitForTimeout(250);
      check(log.length === 0, `P · verlopen (${naam}): opstarten alleen vraagt nog niets`, JSON.stringify(log.map(l => l.pad)));
      const voor = await spelOpslag(page);
      await open(page, 'p1', 'beheer');
      await page.waitForTimeout(400);
      const r = await kaart(page);
      const ververs = log.find(l => /grant_type=refresh_token/.test(l.pad));
      check(ververs && ververs.body.refresh_token === 'rt-oud' && verwacht.test(r.tekst) && !(status === 200 && /Niet/.test(r.tekst)),
        `P · verlopen (${naam}): het ouderdeel kijkt na en toont de uitkomst`, JSON.stringify([r.tekst, log.map(l => l.pad)]));
      check(await spelOpslag(page) === voor, `P · verlopen (${naam}): de opslag van het spel is onaangeroerd`, '');
      const nieuw = pageErrors.splice(fouten);   // de 400 hierboven is het nagedane geval
      pageErrors.push(...nieuw.filter(e => !/status of 400/.test(e)));
      await ctx.close();
    }
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
