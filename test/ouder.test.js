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
 *   A  geluid (trillen volgt het toestel): omzetten, opslaan, en morgen nog zo
 *   B  oefeninstellingen zijn per kind, en lekken niet naar de buur
 *   C  de kiezer wisselt de context; het onderdeel blijft staan
 *   D  de faseladder en de startfase houden elkaar in het gareel (en tonen het bereik)
 *   E  voortgang wissen: eerst vragen, dan wissen -- en de instellingen blijven
 *   F  een ster verwijderen noemt haar bij naam en vraagt eerst
 *   G  back-up eruit en er weer in: byte voor byte dezelfde voortgang
 *   H  een kapotte back-up verandert niets
 *   I  de plakkende kop krimpt bij scrollen, maar wie en wat blijven in beeld --
 *      en de inhoud eronder schuift niet mee
 *   J  vanuit Beheer een ster maken komt terug in Beheer, bij de nieuwe ster
 *   K  enkelvoud/meervoud: "1 show", "2 shows", "0 shows"
 *   L  de trofeeteller heeft één bron, en de kast noemt hetzelfde getal
 *   M  de inschatting toont geen percentage, en p.perf draait er ongewijzigd door
 *   N  de drie weergavekeuzes staan op één regel, en wikkelen alleen als het moet
 *   O  op het beginscherm: de uitlegkaart na de back-up, per browser, en weg in de app
 *   P  Voortgang: status uit de laatste shows, één stap "nu", de oogst dicht
 *   Q  opstarten en instellingen: wie net speelde, geluid aan, meisje/jongen, het maakformulier
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
    // Onder het tandwiel staan nog maar twee dingen: Geluid en de deur naar het
    // ouderdeel. Trillen volgt het toestel; "als app" en "over" staan in Beheer.
    r = await page.evaluate(() => ({
      rijen: [...document.querySelectorAll('#gear-menu .gear-item')].map(el => el.id || el.className),
      weg: ['gear-haptics', 'gear-app', 'gear-over'].filter(id => document.getElementById(id)),
    }));
    check(r.rijen.length === 2 && !r.weg.length, 'het tandwiel heeft twee rijen: geluid en Voor ouders', JSON.stringify(r));
    // en morgen weer openen
    await page.reload();
    await page.waitForTimeout(300);
    r = await page.evaluate(() => ({ g: db.sound }));
    check(r.g === false, 'de geluidskeuze staat er morgen nog', JSON.stringify(r));
    // Midden in een show: het tandwiel is er niet, dus zit dezelfde schakelaar in
    // het stopvenster -- en omzetten daar stopt de show niet.
    await page.evaluate(() => { selectProfile('p1'); startLevel(1); G.idx = 1; askQuit(); });
    await page.waitForTimeout(200);
    r = await page.evaluate(() => ({
      open: document.getElementById('quit-modal').classList.contains('open'),
      tekst: document.getElementById('quit-sound-state').textContent,
      aria: document.getElementById('quit-sound').getAttribute('aria-checked'),
    }));
    check(r.open && r.tekst === 'Uit' && r.aria === 'false',
      'het stopvenster van een show toont de geluidsstand van nu', JSON.stringify(r));
    await page.click('#quit-sound');
    await page.waitForTimeout(120);
    r = await page.evaluate(() => ({
      g: db.sound, tekst: document.getElementById('quit-sound-state').textContent,
      gear: document.getElementById('gear-sound-state').textContent,
      open: document.getElementById('quit-modal').classList.contains('open'),
      show: document.getElementById('screen-game').classList.contains('active'),
    }));
    check(r.g === true && r.tekst === 'Aan' && r.gear === 'Aan',
      'daar omzetten zet het geluid om, ook onder het tandwiel', JSON.stringify(r));
    check(r.open && r.show, 'en de show loopt gewoon door', JSON.stringify(r));
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
      kop: document.querySelector('#settings-profiles .active .tab-label').textContent,
    }));
    check(r.gekozenMax === '20' && r.gekozenMode === 'kies',
      'de velden tonen de waarden van het gekozen kind', JSON.stringify(r));
    check(/Bas/.test(r.kop), 'en de kiezer erboven zegt over wie het gaat', r.kop);
    // Bas naar de telmodus: dat mag Anna niet raken
    await page.click('#set-track .chip[data-v="count"]');
    await page.waitForTimeout(150);
    r = await page.evaluate(() => ({
      anna: db.profiles.p1.settings.track, bas: db.profiles.p2.settings.track,
      basFase: !!document.getElementById('set-fase'),
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
      // de "+" achter de rij is geen kind: die telt hier niet mee (zie verderop)
      chips: [...document.querySelectorAll('#settings-profiles .who-btn:not(.who-nieuw)')].map(b => b.textContent.trim()),
      plus: [...document.querySelectorAll('#settings-profiles .who-btn')].pop().id,
      actief: document.querySelector('#settings-profiles .who-btn.active').textContent.trim(),
      pressed: [...document.querySelectorAll('#settings-profiles .who-btn:not(.who-nieuw)')].map(b => b.getAttribute('aria-pressed')),
      tab: document.querySelector('#settings-subtabs button.on').dataset.t,
    }));
    check(r.chips.length === 3, 'elk kind krijgt een eigen kaartje in de kiezer', JSON.stringify(r.chips));
    check(/Anna/.test(r.actief), 'en het gekozen kind is te zien', r.actief);
    check(r.pressed.join(',') === 'true,false,false', 'een schermlezer hoort hetzelfde', r.pressed.join(','));
    check(r.plus === 'set-newstar', 'en achter de laatste ster staat de "+" voor een nieuwe', r.plus);
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
  /* Eén ladder met twee lijnen, "vanaf" en "tot". Een tik op een fase verhuist
     de dichtstbijzijnde lijn: erboven trekt "vanaf" mee, eronder "tot", en
     binnen de band de lijn die het dichtst bij is (even ver: "tot"). De lijnen
     kruisen elkaar dus nooit. En wat de ladder laat zien -- de band, de lijnen,
     waar het kind is -- moet kloppen met de instellingen. */
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
    const band = () => page.evaluate(() => {
      const lijn = woord => [...document.querySelectorAll('#set-fase .fl-lijn')].find(l => l.textContent === woord);
      const v = el => el ? +el.dataset.v : null;
      const hier = document.querySelector('#set-fase .chip.hier');
      return {
        stage: db.profiles.p1.settings.stage, max: db.profiles.p1.settings.stageMax,
        binnen: [...document.querySelectorAll('#set-fase .chip')].filter(c => !c.classList.contains('uit') && !c.classList.contains('voor')).map(c => +c.dataset.v),
        vanaf: lijn('vanaf') ? v(lijn('vanaf').nextElementSibling) : null,
        tot: lijn('tot') ? v(lijn('tot').previousElementSibling) : null,
        hier: v(hier), pop: !!(hier && hier.querySelector('.fl-n svg')),
        oud: !!document.getElementById('fase-start'),
      };
    });
    let r = await band();
    check(r.binnen.join(',') === '1,2,3,4' && r.vanaf === null && r.tot === 4,
      'de ladder toont de band tussen de lijnen (vanaf fase 1 staat er geen lijn)', JSON.stringify(r));
    check(r.hier === 1 && r.pop, 'en haar pop staat in het bolletje van haar fase', JSON.stringify(r));
    check(!r.oud, 'de openklapper "Begint je kind hoger?" is weg', JSON.stringify(r));
    const tik = async v => { await page.click(`#set-fase .chip[data-v="${v}"]`); await page.waitForTimeout(200); return band(); };
    r = await tik(7);
    check(r.stage === 1 && r.max === 7 && r.tot === 7, 'een fase onder "tot" zet "tot" daar', JSON.stringify(r));
    r = await tik(2);
    check(r.stage === 2 && r.max === 7 && r.vanaf === 2, 'binnen de band: de dichtste lijn ("vanaf") komt', JSON.stringify(r));
    check(r.hier === 2, 'een hogere start tilt het kind mee', JSON.stringify(r));
    r = await tik(6);
    check(r.stage === 2 && r.max === 6 && r.tot === 6, 'binnen de band: de dichtste lijn ("tot") komt', JSON.stringify(r));
    r = await tik(4);
    check(r.stage === 2 && r.max === 4, 'even ver van allebei: "tot" komt', JSON.stringify(r));
    r = await tik(1);
    check(r.stage === 1 && r.max === 4 && r.vanaf === null && r.hier === 2,
      'een fase boven "vanaf" zet "vanaf" daar, en het kind zakt niet mee', JSON.stringify(r));
    // cijfers uit: dan bestaan de fases boven 5 niet meer als keuze, maar de
    // instelling blijft staan (niet-destructief, zie countMaxStage)
    await page.evaluate(() => { setKey = 'p1'; db.profiles.p1.settings.stageMax = 11; save(); renderSettings(); });
    await page.waitForTimeout(150);
    await page.click('#set-numerals .chip[data-v="off"]');
    await page.waitForTimeout(200);
    r = await page.evaluate(() => ({
      chips: document.querySelectorAll('#set-fase .chip').length,
      bewaard: db.profiles.p1.settings.stageMax,
    }));
    check(r.chips === 5, 'zonder cijfers worden er maar vijf fases aangeboden', 'chips=' + r.chips);
    check(r.bewaard === 11, 'en de gekozen bovengrens blijft bewaard', 'stageMax=' + r.bewaard);
    await ctx.close();
  }

  /* ================= D2 · De start in rekenen ================= */
  /* Het leerpad van rekenen heeft één lijn, "vanaf". Een tik op een stap zet hem
     daar, en het spel speelt vanaf dan minstens die stap (leerStap). */
  {
    const { ctx, page } = await fresh();
    await open(page, 'p1', 'oefenen');
    await page.waitForTimeout(200);
    const pad = () => page.evaluate(() => {
      const lijn = document.querySelector('#set-startstap .fl-lijn');
      const hier = document.querySelector('#set-startstap .chip.hier');
      return {
        start: db.profiles.p1.settings.startStap,
        rijen: [...document.querySelectorAll('#set-startstap .chip')].map(c => +c.dataset.v),
        voor: [...document.querySelectorAll('#set-startstap .chip.voor')].map(c => +c.dataset.v),
        vanaf: lijn ? +lijn.nextElementSibling.dataset.v : null,
        lijnen: document.querySelectorAll('#set-startstap .fl-lijn').length,
        hier: hier ? +hier.dataset.v : null, pop: !!(hier && hier.querySelector('.fl-n svg')),
        stap: leerStap(1, db.profiles.p1.settings),
      };
    });
    let r = await pad();
    check(r.rijen.join(',') === '1,2,3,4,5' && r.lijnen === 0 && r.hier === 1 && r.pop,
      'het leerpad toont vijf stappen, zonder lijn, met haar pop op stap 1', JSON.stringify(r));
    await page.click('#set-startstap .chip[data-v="3"]');
    await page.waitForTimeout(200);
    r = await pad();
    check(r.start === 3 && r.vanaf === 3 && r.voor.join(',') === '1,2' && r.lijnen === 1,
      'een tik zet "vanaf" op die stap en dempt wat ervoor ligt', JSON.stringify(r));
    check(r.hier === 3 && r.stap === 3, 'en in wereld 1 speelt ze nu stap 3', JSON.stringify(r));
    // tot 10: over het tiental valt weg, "vanaf" schuift naar de volgende stap
    await page.click('#set-max .chip[data-v="10"]');
    await page.waitForTimeout(200);
    r = await pad();
    check(r.rijen.join(',') === '1,2,4,5' && r.vanaf === 4 && r.start === 3,
      'valt de gekozen stap weg, dan staat "vanaf" bij de volgende', JSON.stringify(r));
    await page.click('#set-startstap .chip[data-v="1"]');
    await page.waitForTimeout(200);
    r = await pad();
    check(r.start === 1 && r.lijnen === 0 && r.stap === 1, 'terug naar stap 1 haalt de lijn weg', JSON.stringify(r));
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
    // de openklapper zelf noemt haar ook, en loopt mee als de naam verandert
    r = await page.evaluate(() => document.querySelector('#set-danger-del summary').textContent);
    check(/^Bas verwijderen/.test(r.trim()), 'de openklapper noemt de ster bij naam', r);
    await page.fill('#set-name', 'Bastiaan');
    r = await page.evaluate(() => document.querySelector('#set-danger-del summary').textContent);
    check(/^Bastiaan verwijderen/.test(r.trim()), 'en past zich aan als de naam verandert', r);
    await page.fill('#set-name', 'Bas');
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

  /* ================= I · De kop blijft staan, en laat niets vallen ================= */
  /* De kop van het ouderdeel heeft één maat: bij scrollen wordt alleen de plaat
     dekkend (.gescrold). Wie en wát blijven in beeld -- dat zijn de twee dingen
     die een ouder onderweg nodig heeft -- en niets schuift. */
  {
    const { ctx, page } = await fresh();
    // in de telmodus: de faseladder maakt Oefenen langer dan een telefoon
    await page.evaluate(() => { db.profiles.p1.settings.track = 'count'; save(); });
    await open(page, 'p1', 'oefenen');
    await page.waitForTimeout(300);
    const meet = () => page.evaluate(() => {
      const kop = document.querySelector('#screen-settings .hub-sticky');
      const wie = document.querySelector('#settings-profiles .who-btn.active');
      const wat = document.querySelector('#settings-subtabs button.on');
      const zichtbaar = el => { const r = el.getBoundingClientRect(); return r.height > 0 && r.bottom <= kop.getBoundingClientRect().bottom + 1; };
      return {
        h: kop.offsetHeight, wieH: wie.offsetHeight,
        gescrold: document.getElementById('screen-settings').classList.contains('gescrold'),
        plaat: getComputedStyle(kop).backgroundColor,
        wieInBeeld: zichtbaar(wie), watInBeeld: zichtbaar(wat),
        wieNaam: wie.textContent.trim(), watLabel: wat.textContent.trim(),
        terug: !!document.querySelector('#screen-settings .hub-sticky .icon-btn').offsetParent,
        inhoud: document.querySelector('#screen-settings .settings-sheet').offsetTop,
      };
    });
    const boven = await meet();
    await page.evaluate(() => { const sc = document.getElementById('screen-settings'); sc.scrollTop = 400; sc.dispatchEvent(new Event('scroll')); });
    await page.waitForTimeout(500);
    const onder = await meet();
    check(!boven.gescrold && onder.gescrold && boven.plaat !== onder.plaat, 'scrollen maakt de plaat dekkend', JSON.stringify([boven.plaat, onder.plaat]));
    check(onder.h === boven.h && onder.wieH === boven.wieH, 'maar de kop blijft even groot', `${boven.h} -> ${onder.h}`);
    check(onder.wieInBeeld && /Anna/.test(onder.wieNaam), 'welk kind gekozen is blijft in beeld', JSON.stringify(onder));
    check(onder.watInBeeld && /Oefeningen/.test(onder.watLabel), 'en welk onderdeel je leest ook', JSON.stringify(onder));
    check(onder.terug, 'en de weg terug blijft er', 'terugknop weg');
    check(onder.inhoud === boven.inhoud, 'en de inhoud eronder blijft staan waar hij stond', `${boven.inhoud} -> ${onder.inhoud}`);
    /* Net voorbij de drempel stilgezet: één wissel, en de schuifstand blijft van
       de vinger. */
    const stil = await page.evaluate(async () => {
      const sc = document.getElementById('screen-settings');
      sc.scrollTop = 0; sc.dispatchEvent(new Event('scroll'));
      await new Promise(r => setTimeout(r, 200));
      let wissels = 0;
      const ob = new MutationObserver(() => wissels++);
      ob.observe(sc, { attributes: true, attributeFilter: ['class'] });
      sc.scrollTop = 16;
      await new Promise(r => setTimeout(r, 600));
      ob.disconnect();
      return { wissels, stand: sc.scrollTop, gescrold: sc.classList.contains('gescrold') };
    });
    check(stil.gescrold && stil.wissels === 1 && stil.stand === 16,
      'net voorbij de drempel stilgezet blijven de kop en de schuifstand staan', JSON.stringify(stil));
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
      tegels: [...document.querySelectorAll('.vg-getal')].map(e => e.textContent.trim()),
      oogst: [...document.querySelectorAll('.oogst-item')].map(e => e.textContent.trim()),
    }));
    // niets gespeeld: nul is meervoud
    await open(page, 'p1', 'voortgang');
    await page.waitForTimeout(200);
    let r = await kaarten();
    check(r.tegels[0] === '0 shows' && r.tegels[1] === '0 sommen',
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
    check(r.tegels[0] === '1 show', 'één show is enkelvoud', JSON.stringify(r.tegels));
    check(r.tegels[1] === '1 som', 'één som is enkelvoud', JSON.stringify(r.tegels));
    check(/\b1 ster\b/.test(r.oogst[0]), 'één ster is enkelvoud', JSON.stringify(r.oogst));
    // en in de telmodus heet een som een vraag
    await page.evaluate(() => { db.profiles.p1.settings.track = 'count'; save(); });
    await open(page, 'p1', 'voortgang');
    await page.waitForTimeout(200);
    r = await kaarten();
    check(r.tegels[1] === '1 vraag', 'in de telmodus is het één vraag', JSON.stringify(r.tegels));
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
    check(r.tegels[0] === '2 shows' && r.tegels[1] === '2 sommen',
      'twee is weer meervoud', JSON.stringify(r.tegels));
    check(/6 sterren/.test(r.oogst[0]) && /2 perfecte shows/.test(r.oogst[1]),
      'ook in de oogstregel', JSON.stringify(r.oogst));
    await ctx.close();
  }

  /* ================= L · De trofeeteller heeft één bron ================= */
  /* Het verdiende aantal op Voortgang ("3/18 trofeeën") en in de kop van de kast
     ("3 verzameld") moeten hetzelfde getal zijn, en dat getal hoort uit
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
        // de kast: de vaste trofeeën plus één perfecte per uitgebrachte wereld
        verwacht: TROPHIES.filter(t => !t.perfect && !isRetiredTrophy(t.id)).length + WORLD_AVAIL,
      };
    });
    // Hier stond /2\/18/: twaalf vaste plus zes werelden. Met een wereld erbij
    // is de teller gewoon 2/19, en dat is geen fout maar het hele punt.
    check(r.teller.indexOf('2/' + r.verwacht) >= 0 && r.actief === r.verwacht,
      'de teller toont het verdiende aantal en het totaal', r.teller + ' (verwacht 2/' + r.verwacht + ')');
    check(r.teller.indexOf(r.bron) >= 0, 'en die komen rechtstreeks uit activeTrophies()', `${r.teller} vs ${r.bron}`);
    /* De kast zelf noemt alleen wat er verzameld is, zonder totaal (zie
       .kast-telling): dat totaal groeit met elke wereld, en voor een kind leest
       dat als een kast die leegloopt. De ouder ziet het totaal hierboven wél. */
    check(/^\s*2\s+verzameld\s*$/.test(r.kast),
      'de kast noemt hetzelfde verdiende aantal, zonder totaal', r.kast);
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
        stap: blok.querySelector('.niveau-bezig').getAttribute('aria-current'),
        pop: !!blok.querySelector('.niveau-bezig .fl-n svg'),
        perf: db.profiles.p1.perf,
      };
    });
    check(!/%/.test(r.tekst), 'het niveau-blok noemt geen percentage', r.tekst.slice(0, 80));
    check(r.balken === 0, 'en heeft geen voortgangsbalk', 'balken=' + r.balken);
    check(r.tekst.split(/\s+/).filter(Boolean).length < 40, 'en het leerpad blijft kort (geen vaste voetnoot)', r.tekst.slice(0, 120));
    check(/Leerpad/.test(r.tekst) && /tot 20/.test(r.tekst) && /Kleine sommen/.test(r.bezig) && r.stap === 'step' && r.pop,
      'en zet op het leerpad waar het kind nu aan werkt, met haar pop', JSON.stringify(r));
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
    check(/^Evenveel/.test(r.bezig),
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
        // de laatste kaart: 'Over Rekensterren' staat eronder als voetregel, niet als kaart
        laatste: i === kaarten.length - 1 && !!document.querySelector('#settings-body .ouder-voet #set-over'),
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
        'O · de kaart staat direct na Back-up & herstel, als laatste kaart (Over is een voetregel)', JSON.stringify(r));
      check(r.secundair && r.kop === 'Op het beginscherm' && r.knoppen === 0,
        'O · een stille secundaire kaart, uitleg zonder knop', JSON.stringify(r));
      check(/Chrome stelt soms zelf voor/.test(r.tekst) && /Tik op ⋮ en kies ‘App installeren’/.test(r.tekst),
        'O · Android: het voorstel van Chrome, en anders het ⋮-menu', r.tekst);
      // Nul sterren: de kaart staat er óók, zonder waarschuwing -- direct na de
      // ene kaart die dan het terugzetten draagt (zie beheerEmptyHtml).
      await page.evaluate(() => { db.profiles = {}; save(); openSettings(); });
      await page.waitForTimeout(200);
      const leeg = await kaart(page);
      check(leeg.er && leeg.vorige === 'Nog geen sterren', 'O · ook zonder sterren, na het terugzetten', JSON.stringify(leeg));
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

  /* ================= P · Voortgang: drie vragen ================= */
  /* Voortgang beantwoordt eerst "gaat het goed?" en dan "wat komt er nu?". De
     stand komt uit de laatste shows (p.recent), niet uit een totaal sinds het
     begin: een kind dat het nu lastig heeft hoort oranje te krijgen, ook als
     het vorige maand alles in één keer deed. De oogst staat dicht. */
  {
    const { ctx, page } = await fresh();
    const lees = async () => page.evaluate(() => ({
      kaarten: [...document.querySelectorAll('#settings-body .vg-kop')].map(e => e.textContent.trim()),
      stand: document.querySelector('.vg-status').className,
      kop: document.querySelector('.vg-status b').textContent,
      meerOpen: document.querySelector('.vg-meer').open,
      nu: document.querySelectorAll('.vg-ladder .hier').length,
      tip: !!document.getElementById('grens-tip'),
    }));
    const met = async (recent, extra) => {
      await page.evaluate(([rc, ex]) => {
        const p = db.profiles.p1;
        p.recent = rc;
        if (ex) Object.assign(p.settings, ex);
        save();
      }, [recent, extra || null]);
      await open(page, 'p1', 'voortgang');
      await page.waitForTimeout(150);
      return lees();
    };
    let r = await met([]);
    check(/Hoe gaat het met/.test(r.kaarten[0]) && /Leerpad/.test(r.kaarten[1]) && /extra/.test(r.kaarten[2]),
      'P · rekenen: status, leerpad, extra oefenen', JSON.stringify(r.kaarten));
    check(/nieuw/.test(r.stand) && /Net begonnen/.test(r.kop), 'P · zonder shows: net begonnen', r.kop);
    check(r.meerOpen === false, 'P · "meer cijfers" staat dicht', String(r.meerOpen));
    check(r.nu === 1, 'P · er is precies één stap "nu" op het pad', String(r.nu));
    r = await met([3, 2, 3, 2, 3, 3, 2, 3]);
    const bolletjes = await page.evaluate(() => [...document.querySelectorAll('.vg-reeks i')].map(i => i.className).join(','));
    check(bolletjes === 'r3,r2,r3,r2,r3,r3,r2,r3', 'P · één bolletje per show, in volgorde', bolletjes);
    check(/goed/.test(r.stand), 'P · drie en twee sterren door elkaar: de uitdaging zit goed', r.kop);
    r = await met([3, 3, 3, 3, 3, 3, 3, 3, 3, 2]);
    check(/vlot/.test(r.stand), 'P · bijna alles drie sterren: vlot', r.kop);
    r = await met([3, 3, 3, 3, 3, 3, 3, 0, 0, 0]);
    check(/pittig/.test(r.stand), 'P · drie mislukte shows: pittig, ook na een goede reeks', r.kop);
    // de telmodus heeft geen sommenkaart
    r = await met([3, 3, 3, 3], { track: 'count', stage: 1, stageMax: 12, numerals: true });
    check(r.kaarten.length === 2 && !/extra/.test(r.kaarten.join(' ')),
      'P · in de telmodus geen sommenkaart', JSON.stringify(r.kaarten));
    check(r.nu === 1, 'P · ook daar één stap "nu"', String(r.nu));
    await ctx.close();
  }

  /* ================= Q · Opstarten en instellingen ================= */
  /* De ronde "opstarten en instellingen" (oktober 2026). Vijf kleine dingen die
     elk één tik of één misverstand schelen:
       - Voor ouders opent op de ster die net speelde, niet altijd op de eerste
       - "het geluid staat uit" in Voortgang heeft zelf de knop om het aan te zetten
       - meisje of jongen is in Beheer nog te veranderen (de voortgang blijft)
       - gekozen = paarse vulling, zonder vinkje erachter
       - het maakformulier: een vraagteken tot "wie ben je?" beantwoord is,
         kleuren als bolletjes, en een lijntje waar het ouderdeel begint */
  {
    const { ctx, page } = await fresh();
    // Bas speelt, gaat terug, en een ouder opent het tandwiel
    await page.evaluate(() => { selectProfile('p2'); });
    await page.waitForTimeout(600);
    await page.evaluate(() => goProfiles());
    await page.waitForTimeout(400);
    await page.click('#btn-gear');
    await page.click('#gear-menu .gear-item.parents');
    await page.waitForTimeout(300);
    let r = await page.evaluate(() => ({ key: setKey, tab: setTab }));
    check(r.key === 'p2' && r.tab === 'voortgang', 'Q · Voor ouders opent op wie net speelde', JSON.stringify(r));

    // Geluid uit, Bas telt (dan leest de stem voor): de notitie heeft een knop
    await page.evaluate(() => {
      db.sound = false; db.profiles.p2.settings.track = 'count'; save(); renderSettings();
    });
    await page.waitForTimeout(150);
    r = await page.evaluate(() => ({
      knop: !!document.getElementById('stem-aan'),
      tekst: (document.querySelector('.stem-notitie') || {}).textContent || '',
    }));
    check(r.knop && /Bas/.test(r.tekst) && !/tandwiel/.test(r.tekst),
      'Q · geluid uit: de notitie noemt het kind en heeft zelf de knop', JSON.stringify(r));
    await page.click('#stem-aan');
    await page.waitForTimeout(150);
    r = await page.evaluate(() => ({ g: db.sound, knop: !!document.getElementById('stem-aan'),
      gear: document.getElementById('gear-sound-state').textContent }));
    check(r.g === true && !r.knop && r.gear === 'Aan', 'Q · één tik en het geluid staat aan, ook onder het tandwiel', JSON.stringify(r));

    // Beheer: meisje -> jongen, de voortgang blijft
    await page.evaluate(() => { db.profiles.p2.stars = { 1: 3 }; db.profiles.p2.diamonds = 12; save(); });
    await page.click('#settings-subtabs button[data-t="beheer"]');
    await page.waitForTimeout(200);
    r = await page.evaluate(() => ({
      chips: [...document.querySelectorAll('#set-base .chip')].map(c => c.dataset.v + (c.classList.contains('on') ? '*' : '')),
    }));
    check(JSON.stringify(r.chips) === '["meisje*","jongen"]', 'Q · Beheer toont meisje of jongen, met de huidige gekozen', JSON.stringify(r));
    await page.click('#set-base .chip[data-v="jongen"]');
    await page.waitForTimeout(200);
    r = await page.evaluate(() => {
      const opslag = JSON.parse(localStorage.getItem('rekenPopsterren_v1'));
      const vink = getComputedStyle(document.querySelector('#set-base .chip.on .mc-label'), '::after').content;
      return { base: opslag.profiles.p2.base, sterren: opslag.profiles.p2.stars, dia: opslag.profiles.p2.diamonds,
        anna: opslag.profiles.p1.base, vink };
    });
    check(r.base === 'jongen' && r.sterren[1] === 3 && r.dia === 12 && r.anna === 'meisje',
      'Q · omzetten bewaart, voor dit kind alleen, en de voortgang blijft', JSON.stringify(r));
    check(r.vink === 'none' || r.vink === 'normal' || r.vink === '""', 'Q · gekozen is paars, zonder vinkje', r.vink);

    // De onderdelen spreken de taal van de tabbalk: doorschijnend, niet dekkend cyaan
    r = await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('#settings-subtabs button.on'));
      return { bg: cs.backgroundImage, kleur: cs.color };
    });
    check(r.bg === 'none' && r.kleur === 'rgb(255, 255, 255)', 'Q · het gekozen onderdeel heeft het materiaal van de tabbalk', JSON.stringify(r));

    // Het maakformulier
    await page.click('#set-newstar');
    await page.waitForTimeout(300);
    r = await page.evaluate(() => ({
      wacht: document.querySelector('.newstar-preview').classList.contains('wacht'),
      vraag: !!document.querySelector('.newstar-preview .ns-vraag'),
      bolletjes: [...document.querySelectorAll('#newstar-hair .chip')].every(c => !c.textContent.trim() && c.getAttribute('aria-label')),
      ouder: (document.querySelector('.ns-ouder') || {}).textContent || '',
    }));
    check(r.wacht && r.vraag, 'Q · nieuwe ster: een vraagteken zolang niemand koos', JSON.stringify(r));
    check(r.bolletjes, 'Q · haar als bolletjes, de naam alleen als label', JSON.stringify(r));
    check(/papa of mama/.test(r.ouder), 'Q · een lijntje waar het ouderdeel van het formulier begint', JSON.stringify(r));
    await page.click('#newstar-base .chip[data-v="meisje"]');
    await page.waitForTimeout(150);
    r = await page.evaluate(() => ({
      wacht: document.querySelector('.newstar-preview').classList.contains('wacht'),
      vraag: !!document.querySelector('.newstar-preview .ns-vraag'),
    }));
    check(!r.wacht && !r.vraag, 'Q · en na "meisje" staat ze er', JSON.stringify(r));
    await ctx.close();
  }

  /* R -- ▶ rechtsboven: meteen spelen als het kind dat je bekeek, in plaats van
     terug naar het keuzescherm en het daar opnieuw zoeken. Wat hij voorleest
     loopt mee met de kiezer en met het naamveld; zonder ster is er geen ▶ (en
     dan staat de titel er wél). ← · sterren · ▶ staan op één regel. En het
     groene "Opgeslagen" dat er eerst stond is weg. */
  {
    const { ctx, page } = await fresh();
    await page.click('#btn-gear');
    await page.click('#gear-menu .gear-item.parents');
    await page.waitForTimeout(300);
    await page.click('#settings-profiles .who-btn[data-key="p2"]');
    await page.waitForTimeout(150);
    let r = await page.evaluate(() => {
      const b = document.getElementById('speel-als');
      const kop = document.querySelector('#screen-settings .screen-header');
      return { zicht: !!b && !b.hidden && b.offsetWidth > 0, label: b && b.getAttribute('aria-label'),
        oud: !!document.getElementById('settings-saved'),
        eenRegel: kop.contains(document.getElementById('settings-profiles')) && kop.contains(b),
        titel: getComputedStyle(kop.querySelector('.header-title')).display };
    });
    check(r.zicht && r.label === 'Speel als Bas', 'R · ▶ zegt wie er in de kiezer gekozen is', JSON.stringify(r));
    check(r.eenRegel && r.titel === 'none', 'R · ← · de sterren · ▶ op één regel, zonder titel', JSON.stringify(r));
    check(!r.oud, 'R · het opslagpilletje is weg', JSON.stringify(r));
    await page.click('#settings-subtabs button[data-t="beheer"]');
    await page.fill('#set-name', 'Basje');
    r = await page.evaluate(() => document.getElementById('speel-als').getAttribute('aria-label'));
    check(r === 'Speel als Basje', 'R · een nieuwe naam staat meteen in ▶', r);
    await page.click('#speel-als');
    await page.waitForTimeout(900);
    r = await page.evaluate(() => ({ cur, kaart: document.getElementById('screen-map').classList.contains('active'),
      ouder: document.getElementById('screen-settings').classList.contains('active'),
      naam: db.profiles.p2.name }));
    check(r.cur === 'p2' && r.kaart && !r.ouder && r.naam === 'Basje', 'R · ▶ bewaart en speelt meteen als dat kind', JSON.stringify(r));
    // zonder ster geen ▶
    await page.evaluate(() => { db.profiles = {}; save(); goProfiles(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => openSettings());
    await page.waitForTimeout(300);
    r = await page.evaluate(() => ({ verborgen: document.getElementById('speel-als').hidden,
      titel: getComputedStyle(document.querySelector('#screen-settings .header-title')).display }));
    check(r.verborgen === true, 'R · zonder ster is er niemand om als te spelen', JSON.stringify(r));
    check(r.titel !== 'none', 'R · en dan staat er gewoon "Voor ouders"', JSON.stringify(r));
    await ctx.close();
  }

  /* ================= S · Eén leerpad, en Beheer als "⋯" ================= */
  /* Voortgang en Oefeningen tekenen het leerpad met dezelfde rijen, en zeggen
     hetzelfde over waar het kind staat -- ook voorbij de laatste stap, waar
     Oefenen eerst haar pop op "Drie getallen" zette. Beheer is een smal "⋯"
     met een stipje zolang er geen recente back-up is. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => {
      const p = db.profiles.p1;
      for (let l = 1; l < WORLD_START[LEERSTAPPEN.length - 1] + 2; l++) p.stars[l] = 3;
      p.level = WORLD_START[LEERSTAPPEN.length - 1] + 2;
      delete db.backupAt; save();
    });
    await open(page, 'p1', 'voortgang');
    await page.waitForTimeout(200);
    const waar = () => page.evaluate(() => {
      const h = document.querySelector('#settings-body .fl-rij.hier');
      return h ? h.querySelector('.fl-naam').firstChild.textContent.trim() : null;
    });
    const vg = await waar();
    let r = await page.evaluate(() => ({
      oudPad: document.querySelectorAll('.vg-pad').length,
      ladder: !!document.querySelector('.niveau-blok .fase-ladder'),
      meer: document.querySelector('#settings-subtabs .st-meer').textContent.trim(),
      label: document.querySelector('#settings-subtabs .st-meer').getAttribute('aria-label'),
      stip: !!document.querySelector('#settings-subtabs .st-stip'),
      breed: document.querySelector('#settings-subtabs [data-t="oefenen"]').offsetWidth,
      smal: document.querySelector('#settings-subtabs .st-meer').offsetWidth,
    }));
    check(r.oudPad === 0 && r.ladder, 'S · Voortgang tekent het leerpad als de ladder', JSON.stringify(r));
    check(vg === 'Alles door elkaar', 'S · voorbij de laatste stap staat ze op "Alles door elkaar"', vg);
    check(/⋯/.test(r.meer) && /^Beheer/.test(r.label) && r.smal < r.breed / 2, 'S · Beheer is een smal "⋯"', JSON.stringify(r));
    check(r.stip, 'S · zonder back-up een stipje op "⋯"', JSON.stringify(r));
    // Aanpassen › brengt je naar Oefenen, en daar staat ze op dezelfde stap
    await page.click('#leerpad-aanpas');
    await page.waitForTimeout(300);
    const oe = await waar();
    r = await page.evaluate(() => ({ tab: setTab,
      eind: !!document.querySelector('#set-startstap .fl-rij.eind.hier'),
      knoppen: document.querySelectorAll('#set-startstap .chip').length }));
    check(r.tab === 'oefenen' && oe === vg && r.eind && r.knoppen === 5,
      'S · "Aanpassen ›" opent Oefeningen, en die zegt hetzelfde', JSON.stringify({ ...r, oe }));
    // een verse back-up: het stipje gaat weg
    await page.evaluate(() => { db.backupAt = new Date().toISOString(); save(); renderSettings(); });
    await page.waitForTimeout(100);
    r = await page.evaluate(() => !!document.querySelector('#settings-subtabs .st-stip'));
    check(!r, 'S · met een verse back-up geen stipje', String(r));
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
