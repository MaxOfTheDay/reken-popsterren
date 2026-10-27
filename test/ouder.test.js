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
 *   E  voortgang wissen: eerst vragen, dan wissen -- de instellingen blijven, en Terug draait het terug
 *   F  een ster verwijderen noemt haar bij naam, vraagt eerst, en Terug brengt haar terug
 *   G  back-up eruit en er weer in: byte voor byte dezelfde voortgang
 *   H  een kapotte back-up verandert niets
 *   I  de plakkende kop krimpt bij scrollen, maar wie en wat blijven in beeld --
 *      en de inhoud eronder schuift niet mee
 *   J  vanuit het overzicht een ster maken komt terug in het ouderdeel, bij de nieuwe ster
 *   K  enkelvoud/meervoud: "1 show", "2 shows", "0 shows"
 *   L  de trofeeteller heeft één bron, en de kast noemt hetzelfde getal
 *   M  de inschatting toont geen percentage, en p.perf draait er ongewijzigd door
 *   N  de drie weergavekeuzes staan op één regel, en wikkelen alleen als het moet
 *   O  op het beginscherm: de uitlegkaart na de back-up, per browser, en weg in de app
 *   P  Voortgang: één label op het leerpad, één stap "nu", de oogst dicht
 *   Q  opstarten en instellingen: wie net speelde, geluid aan, meisje/jongen, het maakformulier
 *   T  de back-up is één rij met een blad erachter; overzetten met een code, langs
 *      een nagebootste ontvanger: neerleggen, ophalen, één keer, vervangen, annuleren
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

  // Het ouderdeel openen op een bepaald kind en onderdeel. 'beheer' is geen
  // tabblad meer maar haar blad, achter haar naam in de kop (openWieBlad).
  const open = (page, key, tab) => page.evaluate(([k, t]) => {
    openSettings();
    if (k) setKey = k;
    if (t && t !== 'beheer') setTab = t;
    renderSettings();
    if (t === 'beheer') openWieBlad();
  }, [key, tab]);

  /* ================= A · Het tandwiel en het geluid ================= */
  /* Het tandwiel opent meteen Voor ouders (geen menu ertussen). Het geluid is
     app-breed (het staat náást de profielen in db), staat in het ouderdeel als
     eerste rij onder "Voor alle sterren" (op het overzicht), en moet een herstart overleven. */
  {
    const { ctx, page } = await fresh();
    await page.click('#btn-gear');
    await page.waitForTimeout(300);
    let r = await page.evaluate(() => ({
      scherm: document.querySelector('.screen.active').id,
      menu: !!document.getElementById('gear-menu'),
      weg: ['gear-sound', 'gear-haptics', 'gear-app', 'gear-over'].filter(id => document.getElementById(id)),
    }));
    check(r.scherm === 'screen-settings' && !r.menu && !r.weg.length, 'het tandwiel opent meteen Voor ouders, zonder menu', JSON.stringify(r));
    r = await page.evaluate(() => {
      const regel = [...document.querySelectorAll('#settings-body .sheet-rule')].pop();
      const kaart = regel && regel.nextElementSibling;
      return {
        eerst: !!kaart && kaart.contains(document.getElementById('set-sound')),
        geluid: db.sound, tekst: document.getElementById('set-sound-state').textContent,
        uit: document.getElementById('set-sound-state').classList.contains('off'),
        aria: document.getElementById('set-sound').getAttribute('aria-checked'),
      };
    });
    check(r.eerst, 'Geluid is de eerste rij onder "Voor alle sterren"', JSON.stringify(r));
    check(r.geluid === true && r.tekst === 'Aan' && !r.uit && r.aria === 'true',
      'geluid staat standaard aan en zegt dat ook', JSON.stringify(r));
    await page.click('#set-sound');
    await page.waitForTimeout(120);
    r = await page.evaluate(() => ({
      geluid: db.sound, tekst: document.getElementById('set-sound-state').textContent,
      uit: document.getElementById('set-sound-state').classList.contains('off'),
      aria: document.getElementById('set-sound').getAttribute('aria-checked'),
      ico: document.querySelector('#set-sound .gi-ico').textContent,
    }));
    check(r.geluid === false && r.tekst === 'Uit' && r.uit && r.aria === 'false',
      'uitzetten verandert de stand én wat er staat', JSON.stringify(r));
    check(r.ico === '🔇', 'en het icoontje gaat mee', r.ico);
    // en morgen weer openen
    await page.reload();
    await page.waitForTimeout(300);
    r = await page.evaluate(() => ({ g: db.sound }));
    check(r.g === false, 'de geluidskeuze staat er morgen nog', JSON.stringify(r));
    // Midden in een show: het ouderdeel is ver weg, dus zit dezelfde schakelaar in
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
      open: document.getElementById('quit-modal').classList.contains('open'),
      show: document.getElementById('screen-game').classList.contains('active'),
    }));
    check(r.g === true && r.tekst === 'Aan',
      'daar omzetten zet het geluid om', JSON.stringify(r));
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
    // Anna: getallen tot 100 (een grijze rij onder "tot" op het leerpad), zelf typen, 10 vragen
    await page.click('#set-startstap .chip.uit');
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
      gekozenMax: document.querySelector('#set-startstap .fl-lijn.onder').closest('.fl-rij').querySelector('.fl-naam').textContent,
      gekozenMode: document.querySelector('#set-mode .chip.on').dataset.v,
      kop: document.querySelector('#settings-wie .wie-naam').textContent,
    }));
    check(r.gekozenMax === 'Drie getallen' && r.gekozenMode === 'kies',
      'de velden tonen de waarden van het gekozen kind', JSON.stringify(r));
    check(/Bas/.test(r.kop), 'en de kop zegt over wie het gaat', r.kop);
    // Bas naar de telmodus: dat mag Anna niet raken. De modus staat niet op
    // Oefeningen maar in zijn blad (een tik op zijn naam, zie wieBladHtml)
    check(await page.evaluate(() => !document.querySelector('#settings-body #set-track, .settings-panel #set-track')),
      'tellen of rekenen staat niet meer op Oefeningen', 'er staat nog een modusknop');
    await page.evaluate(() => openWieBlad());
    await page.click('#confirm-body #set-track .chip[data-v="count"]');
    await page.waitForTimeout(150);
    check(await page.evaluate(() => $('confirm-modal').classList.contains('open')
      && document.querySelector('#confirm-body #set-track .chip.on').dataset.v === 'count'),
      'het blad blijft open en toont de nieuwe modus', 'blad dicht of oude modus');
    await page.evaluate(() => closeConfirmModal());
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

  /* ================= C · Het overzicht en één ster ================= */
  /* ⚙️ opent het overzicht: elke ster één rij, "Nieuwe ster" als laatste, en
     daaronder wat voor alle sterren geldt. Een tik op een rij opent haar pagina;
     ← gaat terug naar het overzicht, en pas van daar het ouderdeel uit. */
  {
    const { ctx, page } = await fresh(['Anna', 'Bas', 'Cato']);
    await page.click('#btn-gear');
    await page.waitForTimeout(300);
    let r = await page.evaluate(() => ({
      setKey: setKey,
      rijen: [...document.querySelectorAll('#set-sterren .ster-rij[data-key]')].map(b => b.querySelector('b').textContent),
      laatste: [...document.querySelectorAll('#set-sterren .ster-rij')].pop().id,
      titel: getComputedStyle(document.querySelector('#screen-settings .header-title')).display !== 'none',
      tabs: getComputedStyle(document.getElementById('settings-subtabs')).display === 'none',
      speel: document.getElementById('speel-als').hidden,
      alle: !!document.getElementById('set-sound') && !!document.getElementById('set-backup'),
      naam: !!document.getElementById('set-name'),
    }));
    check(r.setKey === null && r.rijen.join(',') === 'Anna,Bas,Cato', 'het tandwiel opent het overzicht, met elk kind als rij', JSON.stringify(r));
    check(r.laatste === 'set-newstar', 'en als laatste rij "Nieuwe ster"', r.laatste);
    check(r.titel && r.tabs && r.speel, 'het overzicht heeft een titel, geen tabbladen en geen ▶', JSON.stringify(r));
    check(r.alle && !r.naam, 'en daaronder wat voor alle sterren geldt -- niets van één kind', JSON.stringify(r));
    // een rij opent de pagina van dat kind, op Voortgang
    await page.click('#set-sterren .ster-rij[data-key="p3"]');
    await page.waitForTimeout(250);
    r = await page.evaluate(() => ({
      setKey: setKey, tab: setTab,
      kop: document.querySelector('#settings-wie .wie-naam').textContent,
      tabAan: document.querySelector('#settings-subtabs button.on').dataset.t,
      speel: document.getElementById('speel-als').getAttribute('aria-label'),
      alle: !!document.getElementById('set-backup'),
    }));
    check(r.setKey === 'p3' && r.tab === 'voortgang' && r.tabAan === 'voortgang' && r.kop === 'Cato',
      'een tik op een rij opent dat kind, op Voortgang', JSON.stringify(r));
    check(r.speel === 'Speel als Cato' && !r.alle, 'met ▶ voor haar, en zonder de app-brede kaarten', JSON.stringify(r));
    // van onderdeel wisselen houdt het kind vast
    await page.click('#settings-wie');
    await page.waitForTimeout(200);
    r = await page.evaluate(() => ({
      setKey: setKey, tab: setTab,
      naam: document.getElementById('set-name').value,
      blad: document.getElementById('confirm-modal').classList.contains('open'),
      tabs: [...document.querySelectorAll('#settings-subtabs button')].map(b => b.dataset.t).join(','),
      label: document.getElementById('settings-wie').getAttribute('aria-label'),
      pen: document.querySelector('#settings-wie .wie-pen').textContent,
    }));
    check(r.setKey === 'p3' && r.blad && r.naam === 'Cato',
      'een tik op haar naam in de kop opent haar blad, bij hetzelfde kind', JSON.stringify(r));
    check(r.tabs === 'voortgang,oefenen' && r.pen === '✏️' && r.label === 'Cato aanpassen',
      'er zijn twee tabbladen, en de naam zegt met ✏️ dat je hem kunt aanpassen', JSON.stringify(r));
    // terug sluit eerst het blad, en dan pas naar het overzicht
    r = await page.evaluate(() => backTarget() === closeConfirmModal);
    check(r, 'de terugknop van Android sluit eerst het blad', String(r));
    await page.click('#wie-klaar');
    await page.waitForTimeout(200);
    // ← terug: eerst naar het overzicht, dan het ouderdeel uit
    await page.click('#screen-settings .header-left');
    await page.waitForTimeout(250);
    r = await page.evaluate(() => ({ setKey: setKey, scherm: document.querySelector('.screen.active').id,
      rijen: document.querySelectorAll('#set-sterren .ster-rij[data-key]').length }));
    check(r.setKey === null && r.scherm === 'screen-settings' && r.rijen === 3, '← brengt je van een kind terug naar het overzicht', JSON.stringify(r));
    await page.click('#screen-settings .header-left');
    await page.waitForTimeout(400);
    r = await page.evaluate(() => document.querySelector('.screen.active').id);
    check(r === 'screen-profile', 'en van het overzicht het ouderdeel uit', r);
    // de terugknop van Android doet hetzelfde als ←
    await page.click('#btn-gear');
    await page.waitForTimeout(300);
    await page.click('#set-sterren .ster-rij[data-key="p2"]');
    await page.waitForTimeout(250);
    r = await page.evaluate(() => backTarget() === ouderTerug);
    check(r, 'en de terugknop van Android ook', String(r));
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
        vanaf: lijn('vanaf') ? v(lijn('vanaf').closest('.fl-rij')) : null,
        tot: lijn('tot') ? v(lijn('tot').closest('.fl-rij')) : null,
        // waar elke stap staat: een lijn neemt geen plaats in, dus dit verandert nooit
        plek: [...document.querySelectorAll('#set-fase .chip')].map(c => c.offsetTop).join(','),
        hier: v(hier), pop: !!(hier && hier.querySelector('.fl-n svg')),
        oud: !!document.getElementById('fase-start'),
      };
    });
    let r = await band();
    check(r.binnen.join(',') === '1,2,3,4' && r.vanaf === 1 && r.tot === 4,
      'de ladder toont de band tussen de twee lijnen, ook als "vanaf" niets afsnijdt', JSON.stringify(r));
    const plek = r.plek;
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
    check(r.stage === 1 && r.max === 4 && r.vanaf === 1 && r.hier === 2,
      'een fase boven "vanaf" zet "vanaf" daar, en het kind zakt niet mee', JSON.stringify(r));
    check(r.plek === plek, 'na vijf tikken staat elke fase nog precies waar hij stond', `${plek} -> ${r.plek}`);
    check(!(await page.$('#set-numerals')), 'er is geen losse schakelaar "Cijfers" meer: "tot" doet het', '');
    await ctx.close();
  }

  /* ================= D2 · Het leerpad van rekenen ================= */
  /* Eén ladder met twee lijnen, zoals bij tellen: "vanaf" en "tot". "tot" is de
     grens van plus en min, en staat aan het eind van een blok; daaronder staat
     grijs het volgende blok. Een tik verhuist de dichtste lijn (zie
     bindOefenChips). */
  {
    const { ctx, page } = await fresh();
    await open(page, 'p1', 'oefenen');
    await page.waitForTimeout(200);
    const pad = () => page.evaluate(() => {
      const rij = kant => { const l = document.querySelector(`#set-startstap .fl-lijn.${kant}`); return l ? +l.closest('.fl-rij').dataset.v : null; };
      const hier = document.querySelector('#set-startstap .chip.hier');
      const s = db.profiles.p1.settings;
      return {
        vanafId: s.padVanaf, max: s.max,
        rijen: [...document.querySelectorAll('#set-startstap .chip')].map(c => +c.dataset.v),
        namen: [...document.querySelectorAll('#set-startstap .chip .fl-naam')].map(n => n.textContent).join(','),
        voor: [...document.querySelectorAll('#set-startstap .chip.voor')].map(c => +c.dataset.v),
        grijs: [...document.querySelectorAll('#set-startstap .chip.uit')].map(c => +c.dataset.v),
        vanaf: rij('boven'), tot: rij('onder'),
        plek: [...document.querySelectorAll('#set-startstap .chip')].slice(0, 5).map(c => c.offsetTop).join(','),
        hier: hier ? +hier.dataset.v : null, pop: !!(hier && hier.querySelector('.fl-n svg')),
        nu: padNu(db.profiles.p1),
        balk: !!document.getElementById('set-max'),
      };
    });
    let r = await pad();
    check(r.namen === 'Tot 10,Tot 20,Over het tiental,Zoek het getal,Drie getallen,Getallen bouwen,Tientallen,Tot 100,Over het tiental'
      && r.vanaf === 1 && r.tot === 5 && r.grijs.join() === '6,7,8,9' && r.hier === 1 && r.pop && !r.balk,
      'tot 20: vijf rijen tussen "vanaf" en "tot", het blok tot 100 grijs eronder, haar pop op de eerste, geen balk "Getallen tot"', JSON.stringify(r));
    const plek = r.plek;
    await page.click('#set-startstap .chip[data-v="3"]');
    await page.waitForTimeout(200);
    r = await pad();
    check(r.vanafId === 'brug20' && r.vanaf === 3 && r.voor.join() === '1,2' && r.tot === 5,
      'een tik dicht bij "vanaf" zet "vanaf" daar en dempt wat ervoor ligt', JSON.stringify(r));
    check(r.plek === plek && r.hier === 3 && r.nu === 'brug20', 'de rijen blijven staan, en ze speelt nu vanaf daar', JSON.stringify(r));
    await page.click('#set-startstap .chip[data-v="7"]');
    await page.waitForTimeout(200);
    r = await pad();
    check(r.max === 100 && r.tot === 9 && !r.grijs.length && r.plek === plek,
      'een tik op een grijze rij laat "tot" zakken tot onder zijn blok: tot 100', JSON.stringify(r));
    check(await page.evaluate(() => db.profiles.p1.settings.wennen > 0), 'en ze went aan de grotere getallen (wennen)', '');
    await page.click('#set-startstap .chip[data-v="1"]');
    await page.waitForTimeout(200);
    r = await pad();
    check(r.vanafId === null && r.vanaf === 1 && r.nu === 'tot10', 'terug naar de eerste rij zet "vanaf" weer bovenaan', JSON.stringify(r));
    await page.click('#set-startstap .chip[data-v="5"]');
    await page.waitForTimeout(200);
    r = await pad();
    check(r.max === 20 && r.tot === 5 && r.vanafId === null, 'een tik dicht bij "tot" zet hem terug aan het eind van dat blok', JSON.stringify(r));
    /* De vinkjes: overslaan haalt de rij niet weg. Hij blijft staan,
       doorgestreept, met zijn nummer, en niets schuift op. */
    const vinkjes = () => page.evaluate(() => ({
      vinkjes: [...document.querySelectorAll('#set-startstap .fl-vink')].map(v => v.matches('button') ? (v.classList.contains('aan') ? 'aan' : 'uit') : 'vast'),
      over: [...document.querySelectorAll('#set-startstap .chip.overgeslagen')].map(c => +c.dataset.v),
      nummers: [...document.querySelectorAll('#set-startstap .chip .fl-n')].map(n => n.textContent).join(','),
      plek: [...document.querySelectorAll('#set-startstap .chip')].map(c => c.offsetTop).join(','),
      chain3: db.profiles.p1.settings.chain3, start: db.profiles.p1.settings.padVanaf,
      extra: !!document.getElementById('set-extra'),
    }));
    let v = await vinkjes();
    check(v.vinkjes.join(',') === 'vast,vast,vast,aan,aan,vast,vast,vast,vast,vast' && !v.extra,
      'elke rij een vinkje: stil bij de vaste, vol bij zoek en drie getallen; geen losse schakelaars meer', JSON.stringify(v));
    const voor = v;
    await page.click('#set-startstap .fl-vink[data-instelling="chain3"]');
    await page.waitForTimeout(200);
    v = await vinkjes();
    check(v.chain3 === false && v.over.join(',') === '5' && v.vinkjes[4] === 'uit',
      'een tik op het vinkje slaat drie getallen over: doorgestreept, niet weg', JSON.stringify(v));
    check(v.plek === voor.plek && v.nummers === voor.nummers && v.start === voor.start,
      'en er schuift niets op, en "vanaf" blijft waar hij stond', JSON.stringify({ voor, v }));
    await page.click('#set-startstap .fl-vink[data-instelling="chain3"]');
    await page.waitForTimeout(200);
    v = await vinkjes();
    check(v.chain3 === true && !v.over.length, 'nog een tik neemt hem weer mee', JSON.stringify(v));
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
    // twee tikken: de rij, en dan pas ja
    let r;
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
    check(/Weg:/.test(r.tekst) && /Blijft:/.test(r.tekst), 'en zegt wat er weggaat én wat er blíjft', r.tekst);
    check(/Geen back-up/.test(r.tekst), 'zonder back-up staat dat er ook bij', r.tekst);
    // eerst nee
    await page.click('#confirm-no');
    await page.waitForTimeout(150);
    r = await page.evaluate(() => ({ sterren: Object.keys(db.profiles.p1.stars).length, dia: db.profiles.p1.diamonds }));
    check(r.sterren === 2 && r.dia === 99, '"nee, terug" laat alles staan', JSON.stringify(r));
    r = await page.evaluate(() => !!document.querySelector('#confirm-body .wie-blad'));
    check(r, 'en brengt je terug in haar blad', String(r));
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
    // en een vergissing is nog even terug te draaien, vanuit de melding onderaan
    r = await page.evaluate(() => {
      const t = document.getElementById('toast'), k = t.querySelector('.toast-terug');
      return { knop: !!k, onder: t.getBoundingClientRect().top > innerHeight / 2, tik: getComputedStyle(t).pointerEvents };
    });
    check(r.knop && r.onder && r.tik === 'auto', 'de melding staat onderaan, met een knop Terug', JSON.stringify(r));
    await page.click('#toast .toast-terug');
    await page.waitForTimeout(200);
    r = await page.evaluate(() => ({
      sterren: Object.keys(db.profiles.p1.stars).length, dia: db.profiles.p1.diamonds,
      opgeslagen: Object.keys(JSON.parse(localStorage.getItem(LS_KEY)).profiles.p1.stars).length,
    }));
    check(r.sterren === 2 && r.dia === 99 && r.opgeslagen === 2, 'Terug zet de voortgang precies terug, ook in de opslag', JSON.stringify(r));
    await ctx.close();
  }

  /* ================= F · Verwijderen noemt haar bij naam ================= */
  {
    const { ctx, page } = await fresh();
    await open(page, 'p2', 'beheer');
    await page.waitForTimeout(150);
    // de rij zelf noemt haar, en loopt mee als de naam verandert
    let r = await page.evaluate(() => document.querySelector('#set-delete .gi-label').textContent);
    check(/^Bas verwijderen/.test(r.trim()), 'de rij noemt de ster bij naam', r);
    await page.fill('#set-name', 'Bastiaan');
    r = await page.evaluate(() => document.querySelector('#set-delete .gi-label').textContent);
    check(/^Bastiaan verwijderen/.test(r.trim()), 'en past zich aan als de naam verandert', r);
    await page.fill('#set-name', 'Bas');
    await page.click('#set-delete');
    await page.waitForTimeout(150);
    r = await page.evaluate(() => ({
      gevraagd: document.getElementById('confirm-modal').classList.contains('open'),
      tekst: document.getElementById('confirm-body').textContent,
      n: Object.keys(db.profiles).length,
    }));
    check(r.gevraagd && /Bas/.test(r.tekst) && r.n === 2,
      'verwijderen vraagt eerst, met de naam erin', JSON.stringify(r));
    check(/Blijft: Anna/.test(r.tekst), 'en zegt wie er blijft', r.tekst);
    await page.click('#confirm-yes');
    await page.waitForTimeout(250);
    r = await page.evaluate(() => ({ n: Object.keys(db.profiles).length, setKey }));
    check(r.n === 1 && r.setKey === null, 'ja: Bas is weg en je staat op het overzicht', JSON.stringify(r));
    await page.click('#toast .toast-terug');
    await page.waitForTimeout(250);
    r = await page.evaluate(() => ({ naam: db.profiles.p2 && db.profiles.p2.name, setKey,
      kop: document.querySelector('#settings-wie .wie-naam').textContent }));
    check(r.naam === 'Bas' && r.setKey === 'p2' && r.kop === 'Bas', 'Terug brengt Bas terug, op zijn eigen pagina', JSON.stringify(r));
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
      a.stars[1] = 3; a.stars[2] = 1; a.diamonds = 42; a.settings.max = 100;
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
    check(/Weg:.*Anna/.test(r.tekst), 'en zegt wat er verdwijnt', r.tekst);
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
    check(r.anna.sterren[1] === 3 && r.anna.sterren[2] === 1 && r.anna.dia === 42 && r.anna.max === 100,
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
      const wie = document.getElementById('settings-wie');
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

  /* ================= J · Vanuit het overzicht een ster maken ================= */
  /* Uit het ouderdeel is een ster maken iets wat een ouder doet terwijl er
     misschien een ánder kind aan het spelen is: dan hoort ze terug te komen waar
     ze was, en niet in de wereld van de nieuwe ster te belanden. */
  {
    const { ctx, page } = await fresh();
    await open(page, null, null);
    await page.waitForTimeout(150);
    await page.click('#set-newstar');
    await page.waitForTimeout(250);
    let r = await page.evaluate(() => document.querySelector('.screen.active').id);
    check(r === 'screen-newstar', 'het overzicht heeft een weg naar het maakformulier', r);
    await page.click('#newstar-base .chip[data-v="jongen"]');
    await page.click('#newstar-track .chip[data-v="math"]');
    await page.fill('#newstar-name', 'Daan');
    await page.click('#newstar-go');
    await page.waitForTimeout(400);
    r = await page.evaluate(() => ({
      scherm: document.querySelector('.screen.active').id,
      tab: setTab, setKey: setKey, cur: cur,
      n: Object.keys(db.profiles).length,
      naam: db.profiles[setKey] ? db.profiles[setKey].name : null,
    }));
    check(r.scherm === 'screen-settings' && r.tab === 'voortgang',
      'na het maken sta je terug in het ouderdeel', JSON.stringify(r));
    check(r.n === 3 && r.naam === 'Daan', 'bij de nieuwe ster', JSON.stringify(r));
    check(r.cur !== 'p3', 'en er wordt niet stilletjes met de nieuwe ster verder gespeeld', String(r.cur));
    // en teruggaan uit het formulier komt in het overzicht uit
    await page.evaluate(() => ouderTerug());
    await page.waitForTimeout(200);
    await page.click('#set-newstar');
    await page.waitForTimeout(250);
    await page.click('#screen-newstar .icon-btn');
    await page.waitForTimeout(300);
    r = await page.evaluate(() => ({ scherm: document.querySelector('.screen.active').id, n: Object.keys(db.profiles).length,
      overzicht: !!document.getElementById('set-sterren') }));
    check(r.scherm === 'screen-settings' && r.n === 3 && r.overzicht,
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
        kast: document.getElementById('trophy-count').getAttribute('aria-label'),
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
       .kast-chip; de woorden staan in de aria-label): dat totaal groeit met elke wereld, en voor een kind leest
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
    check(/Leerpad/.test(r.tekst) && /tot 20/.test(r.tekst) && /Tot 10/.test(r.bezig) && r.stap === 'step' && r.pop,
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
  /* "Voorwerpen / Stippen / Mix" beantwoorden samen één vraag: één uit drie.
     Dat is een balk, net als "Antwoord" en "Vragen per show" (zie oefenGroups),
     met drie gelijke vakken op één regel. Wat hier vastligt: op de
     telefoonmaten past elk woord in zijn vak, zonder af te breken of uit te
     steken. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => { db.profiles.p1.settings.track = 'count'; save(); });
    const meet = () => page.evaluate(() => {
      const chips = [...document.querySelectorAll('#set-repr .chip')];
      return {
        n: chips.length, balk: !!document.querySelector('.oe-seg#set-repr'),
        regels: new Set(chips.map(c => Math.round(c.getBoundingClientRect().top))).size,
        breedtes: chips.map(c => Math.round(c.getBoundingClientRect().width)),
        // het woord zelf meten: in een gecentreerd vak steekt een te lang woord
        // aan twee kanten uit, en dan ziet scrollWidth dat niet
        past: chips.every(c => { const r = document.createRange(); r.selectNodeContents(c);
          const t = r.getBoundingClientRect(), b = c.getBoundingClientRect();
          return t.left >= b.left + 4 && t.right <= b.right - 4; }),
        gekozen: document.querySelectorAll('#set-repr .chip.on').length,
      };
    });
    for (const w of [390, 360, 320]) {
      await page.setViewportSize({ width: w, height: 844 });
      await open(page, 'p1', 'oefenen');
      await page.waitForTimeout(350);
      const r = await meet();
      check(r.n === 3 && r.balk && r.regels === 1, `op ${w}px staan de drie keuzes als balk op één regel`, JSON.stringify(r));
      check(new Set(r.breedtes).size === 1, `en ze zijn even breed op ${w}px`, JSON.stringify(r.breedtes));
      check(r.past, `en elk woord past in zijn vak op ${w}px`, JSON.stringify(r));
      check(r.gekozen === 1, `met één gekozen op ${w}px`, JSON.stringify(r));
    }
    await ctx.close();
  }

  /* ================= O · Op het beginscherm ================= */
  /* Met sterren: de rij "Als app ›" op het overzicht, die het blad opent. Zonder
     sterren: de uitlegkaart op de lege pagina. In een echte browser en op de maat
     van een Pixel (412×920). Het toestel wordt nagedaan met een user agent en een scriptje
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
        secundair: !!k && k.classList.contains('secundair'),
        kop: k ? k.querySelector('h2').textContent : '',
        tekst: k ? k.textContent.replace(/\s+/g, ' ') : '',
        knoppen: k ? k.querySelectorAll('button, a, input').length : -1,
      };
    });
    const rij = page => page.evaluate(() => {
      const r = document.getElementById('set-alsapp');
      // Geluid, Back-up, en "Als app" als laatste (zie appWideCardsHtml)
      return { er: !!r, naGeluid: !!r && r.previousElementSibling === document.getElementById('set-backup'),
        backup: !!document.getElementById('set-backup') };
    });
    const leeg = page => page.evaluate(() => { db.profiles = {}; save(); openSettings(); });

    // Android (Pixel): de rij onder Geluid opent het blad; zonder sterren de kaart.
    {
      const { ctx, page } = await fresh(null, toestel(UA.android));
      await open(page, null, null);
      await page.waitForTimeout(200);
      let r = await rij(page);
      check(r.er && r.naGeluid, 'O · op het overzicht staat "Als app" als laatste, onder de back-up', JSON.stringify(r));
      check(!(await kaart(page)).er, 'O · en geen uitlegkaart meer -- die staat in het blad', '');
      await page.click('#set-alsapp');
      await page.waitForTimeout(200);
      const blad = await page.evaluate(() => ({ open: document.getElementById('confirm-modal').classList.contains('open'),
        blad: !!document.getElementById('app-blad') }));
      check(blad.open && blad.blad, 'O · een tik opent het blad "Rekensterren als app"', JSON.stringify(blad));
      await page.evaluate(() => closeConfirmModal());
      // appinstalled: meteen weg, en niets bewaard.
      const voor = await page.evaluate(() => JSON.stringify(Object.assign({}, localStorage)));
      await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
      await page.waitForTimeout(100);
      check(!(await rij(page)).er, 'O · appinstalled haalt de rij meteen weg', '');
      await page.evaluate(() => renderSettings());
      check(!(await rij(page)).er, 'O · en ze blijft weg in deze sessie', '');
      const na = await page.evaluate(() => JSON.stringify(Object.assign({}, localStorage)));
      check(voor === na, 'O · appinstalled schrijft niets weg', na.slice(0, 120));
      await page.reload();
      await page.waitForTimeout(250);
      await open(page, null, null);
      check((await rij(page)).er, 'O · een nieuwe start vraagt het weer aan de browser', '');
      // Nul sterren: de kaart, direct na de ene kaart die het terugzetten draagt
      // (zie beheerEmptyHtml), stil en zonder knop.
      await leeg(page);
      await page.waitForTimeout(200);
      r = await kaart(page);
      check(r.er && r.vorige === 'Nog geen sterren', 'O · zonder sterren: de kaart, na het terugzetten', JSON.stringify(r));
      check(r.secundair && r.kop === 'Op het beginscherm' && r.knoppen === 0,
        'O · een stille secundaire kaart, uitleg zonder knop', JSON.stringify(r));
      check(/Chrome stelt soms zelf voor/.test(r.tekst) && /Tik op ⋮ en kies ‘App installeren’/.test(r.tekst),
        'O · Android: het voorstel van Chrome, en anders het ⋮-menu', r.tekst);
      await ctx.close();
    }

    // iPhone en iPad: het blad zegt Safari → Deel, en met sterren: eerst een back-up.
    for (const [naam, ua, o] of [['iPhone', UA.iphone, {}], ['iPad', UA.ipad, { aanraak: 5 }]]) {
      const { ctx, page } = await fresh(null, toestel(ua, o));
      await open(page, null, null);
      await page.waitForTimeout(200);
      await page.click('#set-alsapp');
      await page.waitForTimeout(200);
      const tekst = await page.evaluate(() => document.getElementById('app-blad').textContent.replace(/\s+/g, ' '));
      check(/Zet op beginscherm/.test(tekst), `O · ${naam}: Deel → Zet op beginscherm`, tekst);
      check(/Al gespeeld in Safari\? .*back-up via ⚙️ › Back-up/.test(tekst), `O · ${naam}: met de back-upwaarschuwing`, tekst);
      await ctx.close();
    }

    // Computer en de rest: de kaart op de lege pagina.
    for (const [naam, ua, zin] of [['computer', UA.desktop, /installeer-icoon in de adresbalk/],
      ['Firefox', UA.firefox, /Open de pagina dan in Chrome/]]) {
      const { ctx, page } = await fresh(null, toestel(ua));
      await leeg(page);
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
      await open(page, null, null);
      await page.waitForTimeout(200);
      const r = await rij(page);
      check(!r.er && r.backup, `O · als app (${naam}) is de rij weg, en de back-up staat er nog`, JSON.stringify(r));
      await ctx.close();
    }
  }

  /* ================= P · Voortgang: past het niveau? ================= */
  /* Voortgang beantwoordt "waar staat ze, past het, moet ik iets doen?" in één
     kaart, het leerpad: één label rechtsboven (uit de shows op haar stap van nu,
     zie kern zaak ZH), één regel onder haar stap als er iets gebeurt, en de
     tellers sinds het begin dicht onder Meer cijfers. */
  {
    const { ctx, page } = await fresh();
    const lees = async () => page.evaluate(() => ({
      kaarten: [...document.querySelectorAll('#settings-body .vg-kaart:not(.vg-meer) > .kaart-kop h2')].map(e => e.textContent.trim()),
      labels: [...document.querySelectorAll('#settings-body .vg-tag')].map(e => e.dataset.stand),
      onder: (document.querySelector('.vg-onder') || {}).textContent || '',
      meerOpen: document.querySelector('.vg-meer').open,
      nu: document.querySelectorAll('.vg-ladder .hier').length,
      tip: !!document.getElementById('grens-tip'),
      oud: document.querySelectorAll('.vg-status, .vg-reeks').length,
    }));
    const met = async (recent, extra) => {
      await page.evaluate(([rc, ex]) => {
        const p = db.profiles.p1;
        p.recent = rc;
        p.stap = rc.length ? { id: stapSleutel(p), n: rc.length } : undefined;
        if (!rc.length) delete p.stap;
        if (ex) Object.assign(p.settings, ex);
        save();
      }, [recent, extra || null]);
      await open(page, 'p1', 'voortgang');
      await page.waitForTimeout(150);
      return lees();
    };
    let r = await met([]);
    check(/Leerpad/.test(r.kaarten[0]) && r.kaarten.length === 1,
      'P · rekenen, zonder lastige sommen: alleen het leerpad (en Meer cijfers)', JSON.stringify(r.kaarten));
    check(r.oud === 0, 'P · geen aparte statuskaart meer', String(r.oud));
    check(r.labels.join() === 'nieuw', 'P · zonder shows: één label, net begonnen', JSON.stringify(r.labels));
    check(r.meerOpen === false, 'P · "meer cijfers" staat dicht', String(r.meerOpen));
    check(r.nu === 1, 'P · er is precies één stap "nu" op het pad', String(r.nu));
    r = await met([3, 2, 3, 2, 3, 3, 2, 3]);
    check(r.labels.join() === 'goed' && !r.onder, 'P · drie en twee sterren door elkaar: past goed, en dan geen regel eronder', JSON.stringify(r));
    r = await met([3, 3, 3, 3, 3]);
    check(r.labels.join() === 'vlot' && /zelf door/.test(r.onder) && !r.tip,
      'P · alles drie sterren: gaat vlot, het pad schuift zelf door', JSON.stringify(r));
    r = await met([3, 3, 3, 3, 3, 3, 3, 0, 0, 0]);
    check(r.labels.join() === 'pittig' && /makkelijker/.test(r.onder), 'P · mislukte shows: even pittig, en wat het spel doet', JSON.stringify(r));
    // lastige sommen: dan is er een kaart
    await page.evaluate(() => { db.profiles.p1.weak = { '8 + @ = 13': { w: 3, ans: 5 } }; save(); });
    r = await met([3, 2, 3]);
    check(r.kaarten.length === 2 && /extra/.test(r.kaarten[1]), 'P · met lastige sommen staat "Oefent extra op" er', JSON.stringify(r.kaarten));
    // de telmodus heeft geen sommenkaart
    r = await met([3, 3, 3, 3], { track: 'count', stage: 1, stageMax: 12, numerals: true });
    check(r.kaarten.length === 1 && !/extra/.test(r.kaarten.join(' ')),
      'P · in de telmodus geen sommenkaart', JSON.stringify(r.kaarten));
    check(r.nu === 1 && r.labels.length === 1, 'P · ook daar één stap "nu" en één label', JSON.stringify(r));
    await ctx.close();
  }

  /* ================= Q · Opstarten en instellingen ================= */
  /* De ronde "opstarten en instellingen" (oktober 2026). Vijf kleine dingen die
     elk één tik of één misverstand schelen:
       - Voor ouders opent op het overzicht (sinds de ronde "overzicht eerst"; eerder
         op de ster die net speelde)
       - "het geluid staat uit" in Voortgang heeft zelf de knop om het aan te zetten
       - meisje of jongen is in haar blad nog te veranderen (de voortgang blijft)
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
    await page.waitForTimeout(300);
    let r = await page.evaluate(() => ({ key: setKey, rijen: document.querySelectorAll('#set-sterren .ster-rij[data-key]').length }));
    check(r.key === null && r.rijen === 2, 'Q · Voor ouders opent op het overzicht', JSON.stringify(r));
    await page.click('#set-sterren .ster-rij[data-key="p2"]');
    await page.waitForTimeout(200);

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
    r = await page.evaluate(() => ({ g: db.sound, knop: !!document.getElementById('stem-aan') }));
    check(r.g === true && !r.knop, 'Q · één tik en het geluid staat aan', JSON.stringify(r));

    // haar blad: meisje -> jongen, de voortgang blijft
    await page.evaluate(() => { db.profiles.p2.stars = { 1: 3 }; db.profiles.p2.diamonds = 12; save(); });
    await page.click('#settings-wie');
    await page.waitForTimeout(200);
    r = await page.evaluate(() => ({
      chips: [...document.querySelectorAll('#set-base .chip')].map(c => c.dataset.v + (c.classList.contains('on') ? '*' : '')),
    }));
    check(JSON.stringify(r.chips) === '["meisje*","jongen"]', 'Q · haar blad toont meisje of jongen, met de huidige gekozen', JSON.stringify(r));
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

    await page.click('#wie-klaar');
    await page.waitForTimeout(200);
    // De onderdelen spreken de taal van de tabbalk: doorschijnend, niet dekkend cyaan
    r = await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('#settings-subtabs button.on'));
      return { bg: cs.backgroundImage, kleur: cs.color };
    });
    check(r.bg === 'none' && r.kleur === 'rgb(255, 255, 255)', 'Q · het gekozen onderdeel heeft het materiaal van de tabbalk', JSON.stringify(r));

    // Het maakformulier (vanaf het overzicht)
    await page.click('#screen-settings .header-left');
    await page.waitForTimeout(200);
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
     loopt mee met het gekozen kind en met het naamveld; op het overzicht en
     zonder ster is er geen ▶ (en dan staat de titel er wél). ← · zij · ▶ staan
     op één regel. En het
     groene "Opgeslagen" dat er eerst stond is weg. */
  {
    const { ctx, page } = await fresh();
    await page.click('#btn-gear');
    await page.waitForTimeout(300);
    await page.click('#set-sterren .ster-rij[data-key="p2"]');
    await page.waitForTimeout(150);
    let r = await page.evaluate(() => {
      const b = document.getElementById('speel-als');
      const kop = document.querySelector('#screen-settings .screen-header');
      return { zicht: !!b && !b.hidden && b.offsetWidth > 0, label: b && b.getAttribute('aria-label'),
        oud: !!document.getElementById('settings-saved'),
        eenRegel: kop.contains(document.getElementById('settings-wie')) && kop.contains(b),
        naam: document.querySelector('#settings-wie .wie-naam').textContent,
        titel: getComputedStyle(kop.querySelector('.header-title')).display };
    });
    check(r.zicht && r.label === 'Speel als Bas', 'R · ▶ zegt wie er gekozen is', JSON.stringify(r));
    check(r.eenRegel && r.titel === 'none' && r.naam === 'Bas', 'R · ← · zij · ▶ op één regel, zonder titel', JSON.stringify(r));
    check(!r.oud, 'R · het opslagpilletje is weg', JSON.stringify(r));
    await page.click('#settings-wie');
    await page.fill('#set-name', 'Basje');
    await page.click('#wie-klaar');
    await page.waitForTimeout(200);
    r = await page.evaluate(() => [document.getElementById('speel-als').getAttribute('aria-label'),
      document.querySelector('#settings-wie .wie-naam').textContent]);
    check(r[0] === 'Speel als Basje' && r[1] === 'Basje', 'R · een nieuwe naam staat meteen in ▶ en in de kop', JSON.stringify(r));
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

  /* ================= S · Eén leerpad, en twee tabbladen ================= */
  /* Voortgang en Oefeningen tekenen het leerpad met dezelfde rijen, en zeggen
     hetzelfde over waar het kind staat -- ook voorbij de laatste stap, waar
     Oefenen eerst haar pop op "Drie getallen" zette. Wie ze is staat achter haar
     naam in de kop; of de back-up te oud is, zegt de amber regel op het overzicht. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => {
      const p = db.profiles.p1;
      for (let l = 1; l < WORLD_START[5] + 2; l++) p.stars[l] = 3;
      p.level = WORLD_START[5] + 2;
      p.pad = { rij: 'alles', shows: 0, goed: 0, klaar: LEERPAD.map(r => r.id) };   // voorbij de laatste rij
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
      tabs: [...document.querySelectorAll('#settings-subtabs button')].map(b => b.offsetWidth),
    }));
    check(r.oudPad === 0 && r.ladder, 'S · Voortgang tekent het leerpad als de ladder', JSON.stringify(r));
    check(vg === 'Alles door elkaar', 'S · voorbij de laatste stap staat ze op "Alles door elkaar"', vg);
    check(r.tabs.length === 2 && r.tabs[0] === r.tabs[1], 'S · twee even brede tabbladen', JSON.stringify(r));
    // Aanpassen › brengt je naar Oefenen, en daar staat ze op dezelfde stap
    await page.click('#leerpad-aanpas');
    await page.waitForTimeout(300);
    const oe = await waar();
    r = await page.evaluate(() => ({ tab: setTab,
      eind: !!document.querySelector('#set-startstap .fl-rij.eind.hier'),
      knoppen: document.querySelectorAll('#set-startstap .chip').length }));
    check(r.tab === 'oefenen' && oe === vg && r.eind && r.knoppen === 9,
      'S · "Aanpassen ›" opent Oefeningen, en die zegt hetzelfde', JSON.stringify({ ...r, oe }));
    // de back-up: amber op het overzicht zolang er geen is, groen na een verse
    await open(page, null, null);
    await page.waitForTimeout(100);
    r = await page.evaluate(() => document.getElementById('set-backup-stand').classList.contains('oud'));
    check(r, 'S · zonder back-up een amber regel op het overzicht', String(r));
    await page.evaluate(() => { db.backupAt = new Date().toISOString(); save(); renderSettings(); });
    await page.waitForTimeout(100);
    r = await page.evaluate(() => document.getElementById('set-backup-stand').classList.contains('oud'));
    check(!r, 'S · met een verse back-up niet meer', String(r));
    await ctx.close();
  }


  /* ================= U · Eén kaartkop, en het pad ================= */
  /* Elke kaart op Voortgang en Oefeningen begint met dezelfde kop (kaartKop):
     zelfde grootte, zelfde kleur, op allebei de tabbladen en in beide modi.
     Hier stonden drie soorten kop naast elkaar; wie een kaart bijzet zonder
     kaartKop, of een eigen kopstijl meegeeft, valt hier om. Alleen de notitie
     over de stem heeft geen kop -- dat is een melding, geen onderwerp.
     Daarnaast: het leerpad op Voortgang is een weg (vol tot haar, gestippeld
     erna), en die op Oefeningen niet. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => { db.profiles.p1.weak = { '8 + @ = 13': { w: 3, ans: 5 } };
      db.profiles.p1.pad = { klaar: ['tot10'], rij: 'tot20', shows: 1, goed: 0 }; save(); });
    const koppen = () => page.evaluate(() => {
      const kaarten = [...document.querySelectorAll('#settings-body .settings-panel > .set-card')];
      const zonder = kaarten.filter(k => {
        if (k.querySelector('.stem-notitie')) return false;
        const eerste = k.tagName === 'DETAILS' ? k.querySelector('summary').firstElementChild : k.firstElementChild;
        return !(eerste && eerste.classList.contains('kaart-kop'));
      }).map(k => k.className);
      const stijl = [...document.querySelectorAll('#settings-body .kaart-kop h2')].map(h => {
        const c = getComputedStyle(h); return c.fontSize + ' ' + c.fontWeight + ' ' + c.color;
      });
      return { n: kaarten.length, zonder, stijl, oud: document.querySelectorAll('#settings-body .vg-kop, #settings-body .vg-kop-rij').length };
    });
    const stijlen = new Set();
    for (const [track, tab] of [['math', 'voortgang'], ['math', 'oefenen'], ['count', 'voortgang'], ['count', 'oefenen']]) {
      await page.evaluate(t => { db.profiles.p1.settings.track = t; save(); }, track);
      await open(page, 'p1', tab);
      await page.waitForTimeout(150);
      const r = await koppen();
      check(r.n >= 2 && !r.zonder.length && !r.oud, `U · ${track} · ${tab}: elke kaart begint met de kaartkop`, JSON.stringify(r));
      r.stijl.forEach(x => stijlen.add(x));
    }
    check(stijlen.size === 1, 'U · en die kop ziet er overal hetzelfde uit', JSON.stringify([...stijlen]));
    // het pad: op Voortgang wel, op Oefeningen niet
    await page.evaluate(() => { db.profiles.p1.settings.track = 'math'; save(); });
    await open(page, 'p1', 'voortgang');
    await page.waitForTimeout(150);
    let r = await page.evaluate(() => {
      const ps = (sel, pseudo) => { const e = document.querySelector('#settings-body ' + sel); return e && getComputedStyle(e, pseudo); };
      return {
        klaarOnder: ps('.vg-ladder .fl-rij.klaar', '::after').backgroundColor,
        hierBoven: ps('.vg-ladder .fl-rij.hier', '::before').backgroundColor,
        laterOnder: ps('.vg-ladder .fl-rij.later', '::after').backgroundImage,
        eersteBoven: ps('.vg-ladder > .fl-rij:first-child', '::before').display,
        paars: getComputedStyle(document.documentElement).getPropertyValue('--purple-mid').trim(),
      };
    });
    check(r.klaarOnder === r.hierBoven && r.klaarOnder !== 'rgba(0, 0, 0, 0)' && /radial-gradient/.test(r.laterOnder) && r.eersteBoven === 'none',
      'U · Voortgang: de weg is vol tot haar en gestippeld erna, en begint bij het eerste bolletje', JSON.stringify(r));
    await open(page, 'p1', 'oefenen');
    await page.waitForTimeout(150);
    r = await page.evaluate(() => [...document.querySelectorAll('#set-startstap .fl-rij')]
      .filter(e => getComputedStyle(e, '::before').content !== 'none').length);
    check(r === 0, 'U · Oefeningen: geen weg door de ladder (daar lopen vanaf en tot al)', String(r));
    await ctx.close();
  }

  /* ================= T · Het back-upblad en overzetten ================= */
  /* De ontvanger (worker/overzetten.js) wordt hier nagebootst met page.route --
     zijn eigen logica heeft een eigen suite (test/overzetten.test.js). Hier gaat
     het om de app: wat er weggaat, dat er niets verandert tot "Zet op dit
     toestel", en dat een code maar één keer werkt. ?debug&overzet zet overzetten
     aan vanaf file://. */
  {
    const ADRES = 'https://rekensterren-overzetten.maxheyrman.workers.dev/';
    const foutenVoor = pageErrors.length;
    const codes = new Map();
    let neergelegd = null, nr = 100000;
    const ontvanger = async route => {
      const req = route.request();
      const pad = new URL(req.url()).pathname;
      const body = req.postData() || '';
      const stuur = (status, data) => route.fulfill({ status, contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' }, body: data == null ? '' : JSON.stringify(data) });
      if (pad === '/zet') {
        neergelegd = body;
        const code = String(++nr);
        codes.set(code, { save: body, opgehaald: false });
        return stuur(201, { code, tot: Date.now() + 15 * 60000, sleutel: 'k' + code });
      }
      const v = JSON.parse(body);
      const c = codes.get(v.code);
      if (pad === '/haal') {
        if (!c || c.opgehaald) return stuur(404, { fout: 'onbekend' });
        c.opgehaald = true;
        return route.fulfill({ status: 200, contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"save":' + c.save + '}' });
      }
      if (pad === '/stand') return stuur(200, { opgehaald: !!(c && c.opgehaald), verlopen: !c });
      return stuur(404);
    };
    const metOverzet = async (page, ctx) => {
      await ctx.route(ADRES + '**', ontvanger);
      await page.goto(APP_URL + '&overzet');
      await page.waitForTimeout(250);
    };
    const tik = async (page, sel) => { await page.click(sel); await page.waitForTimeout(200); };

    // A: de afzender, met Anna en Bas
    const a = await fresh();
    // zonder ?overzet (zoals vanaf file://): alleen het bestand
    await open(a.page, null, null);
    await tik(a.page, '#set-backup');
    let r = await a.page.evaluate(() => ['bb-maak', 'bb-terug', 'bb-zet', 'bb-code'].filter(id => document.getElementById(id)));
    check(r.join() === 'bb-maak,bb-terug', 'T · zonder overzetten: alleen Maken en Terugzetten', r.join());
    await metOverzet(a.page, a.ctx);
    await a.page.evaluate(() => { db.profiles.p1.stars = { 1: 3, 2: 2 }; db.profiles.p2.stars = { 1: 1 }; save(); });
    await open(a.page, null, null);
    r = await a.page.evaluate(() => {
      const kaart = document.querySelector('.geluid-kaart');
      return { rijen: [...kaart.querySelectorAll('.gear-item')].map(b => b.id), knoppen: !!document.getElementById('set-export') };
    });
    check(r.rijen[0] === 'set-sound' && r.rijen[1] === 'set-backup' && !r.knoppen,
      'T · de back-up is één rij onder Geluid, zonder knoppen op het overzicht', JSON.stringify(r));
    await tik(a.page, '#set-backup');
    r = await a.page.evaluate(() => ['bb-maak', 'bb-terug', 'bb-zet', 'bb-code'].filter(id => document.getElementById(id)));
    check(r.length === 4, 'T · het blad heeft vier tegels', r.join());
    await tik(a.page, '#bb-zet');
    await a.page.waitForTimeout(300);
    r = await a.page.evaluate(() => ({
      code: [...document.querySelectorAll('#oz-blad .oz-c')].map(c => c.textContent).join(''),
      gezichten: document.querySelectorAll('#oz-blad .oz-mini').length,
      db: JSON.stringify(db),
    }));
    const code = r.code;
    check(/^\d{6}$/.test(code), 'T · Overzetten toont een code van zes cijfers', code);
    check(r.gezichten === 2, 'T · met de gezichten van wie er meegaat', String(r.gezichten));
    check(neergelegd === r.db, 'T · wat weggaat is precies de save', (neergelegd || '').slice(0, 60));

    // B: een leeg toestel, vanaf het beginscherm
    const b = await fresh([]);
    await metOverzet(b.page, b.ctx);
    await b.page.evaluate(() => { db.profiles = {}; save(); goProfiles(); });
    await b.page.waitForTimeout(200);
    r = await b.page.evaluate(() => getComputedStyle(document.getElementById('code-hint')).display);
    check(r === 'flex', 'T · het lege beginscherm heeft "Code invullen"', r);
    await tik(b.page, '#code-hint');
    await b.page.keyboard.type('999999');
    await b.page.waitForTimeout(400);
    r = await b.page.evaluate(() => ({
      fout: !!document.querySelector('#oz-blad .oz-code.fout'),
      tekst: (document.querySelector('#oz-blad .oz-fout') || {}).textContent,
      n: Object.keys(db.profiles).length,
    }));
    check(r.fout && /Klopt niet/.test(r.tekst) && r.n === 0, 'T · een verkeerde code: rood, en er verandert niets', JSON.stringify(r));
    await b.page.keyboard.type(code);
    await b.page.waitForTimeout(400);
    r = await b.page.evaluate(() => ({
      titel: document.getElementById('confirm-title').textContent,
      namen: [...document.querySelectorAll('#oz-blad .oz-ster b')].map(x => x.textContent),
      sterren: [...document.querySelectorAll('#oz-blad .oz-ster small')].map(x => x.textContent.trim()),
      knop: document.getElementById('oz-ja').textContent,
      vervang: !!document.querySelector('.oz-vervang'),
      n: Object.keys(db.profiles).length,
    }));
    check(/Sterren gevonden/.test(r.titel) && r.namen.join() === 'Anna,Bas', 'T · "Sterren gevonden" noemt wie erin zit', JSON.stringify(r));
    check(r.sterren.join('|') === '⭐ 5|⭐ 1', 'T · met hun sterren', r.sterren.join('|'));
    check(r.knop === 'Zet op dit toestel' && !r.vervang, 'T · op een leeg toestel: "Zet op dit toestel"', JSON.stringify(r));
    check(r.n === 0, 'T · en nog niets veranderd vóór de knop', 'n=' + r.n);
    await tik(b.page, '#oz-ja');
    r = await b.page.evaluate(() => ({
      namen: profileKeys().map(k => db.profiles[k].name),
      opgeslagen: Object.keys(JSON.parse(localStorage.getItem(LS_KEY)).profiles).length,
      tegels: document.querySelectorAll('#star-grid .ster-tegel, .star-grid .ster-tegel').length,
      hint: getComputedStyle(document.getElementById('code-hint')).display,
    }));
    check(r.namen.join() === 'Anna,Bas' && r.opgeslagen === 2, 'T · daarna staan Anna en Bas op dit toestel, opgeslagen', JSON.stringify(r));
    check(r.hint === 'none', 'T · en is "Code invullen" weg van het beginscherm', r.hint);

    // A hoort het: de stand komt binnen drie tellen
    await a.page.waitForTimeout(3600);
    r = await a.page.evaluate(() => ({
      titel: document.getElementById('confirm-title').textContent,
      vinkjes: document.querySelectorAll('#oz-blad .oz-vink').length,
    }));
    check(/Overgezet/.test(r.titel) && r.vinkjes === 2, 'T · het toestel met de code zegt "Overgezet"', JSON.stringify(r));

    // dezelfde code nog eens: werkt niet meer
    const c2 = await fresh(['Cato']);
    await metOverzet(c2.page, c2.ctx);
    await open(c2.page, null, null);
    await tik(c2.page, '#set-backup');
    await tik(c2.page, '#bb-code');
    await c2.page.keyboard.type(code);
    await c2.page.waitForTimeout(400);
    r = await c2.page.evaluate(() => !!document.querySelector('#oz-blad .oz-code.fout'));
    check(r, 'T · een code werkt maar één keer', String(r));
    // een nieuwe code van A, op een toestel mét een ster: vervangen, of annuleren
    await a.page.evaluate(() => closeConfirmModal());
    await tik(a.page, '#set-backup');
    await tik(a.page, '#bb-zet');
    await a.page.waitForTimeout(300);
    const code2 = await a.page.evaluate(() => [...document.querySelectorAll('#oz-blad .oz-c')].map(c => c.textContent).join(''));
    await c2.page.keyboard.type(code2);
    await c2.page.waitForTimeout(400);
    r = await c2.page.evaluate(() => ({
      knop: document.getElementById('oz-ja').textContent,
      weg: [...document.querySelectorAll('.oz-vervang .oz-ster b')].map(x => x.textContent),
    }));
    check(r.knop === 'Vervangen' && r.weg.join() === 'Cato', 'T · met sterren op dit toestel: wie verdwijnt, en "Vervangen"', JSON.stringify(r));
    await tik(c2.page, '#oz-dicht');
    r = await c2.page.evaluate(() => profileKeys().map(k => db.profiles[k].name).join());
    check(r === 'Cato', 'T · Annuleer laat alles staan', r);

    // geen net: een zin, en niets kapot
    const d = await fresh();
    await d.ctx.route(ADRES + '**', route => route.abort());
    await d.page.goto(APP_URL + '&overzet');
    await d.page.waitForTimeout(250);
    await open(d.page, null, null);
    await tik(d.page, '#set-backup');
    await tik(d.page, '#bb-zet');
    await d.page.waitForTimeout(300);
    r = await d.page.evaluate(() => ({ fout: (document.querySelector('#oz-blad .oz-fout') || {}).textContent, weer: !!document.getElementById('oz-weer') }));
    check(!!r.fout && r.weer, 'T · zonder ontvanger: een zin en "Opnieuw"', JSON.stringify(r));
    // het blad "als app" op een iPhone met sterren: meenemen met een code
    r = await d.page.evaluate(() => {
      const m = appBladInhoud('ios', false, true, false, true), z = appBladInhoud('ios', false, false, false, true);
      return { mee: m.meenemen, noot: /met een code/.test(m.html), leeg: z.meenemen };
    });
    check(r.mee && r.noot && !r.leeg, 'T · iPhone met sterren: "Sterren meenemen" in het blad "als app"', JSON.stringify(r));
    for (const x of [a, b, c2, d]) await x.ctx.close();
    // Een verkeerde code is een 404 en "geen net" een afgebroken aanvraag: de
    // browser zet die zelf in de console, en dat hoort zo. Alleen díe twee gaan eruit.
    const verwacht = /Failed to load resource: (the server responded with a status of 404|net::ERR_FAILED)/;
    const eigen = pageErrors.splice(foutenVoor).filter(e => !verwacht.test(e));
    pageErrors.push(...eigen);
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
