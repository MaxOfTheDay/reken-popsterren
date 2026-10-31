/*
 * De onderrand: alles wat onderaan het scherm zweeft hoort daar te blijven.
 *
 * Waar dit over gaat. manifest.json zet display:fullscreen, en op Android staat
 * de statusbalk (klok, batterij) bij het opstarten nog even in beeld en vervaagt
 * hij een fractie later vanzelf. Het venster wordt daardoor hóger terwijl de
 * breedte gelijk blijft -- een verandering die geen enkele gewone test uitlokt,
 * want een bureaubladvenster doet dat nooit uit zichzelf.
 *
 * Voor de inhoud was dat al opgelost: --vh-lock legt de hoogte van de app vast
 * (zie het scriptje vóór de INHOUD-index in index.html), zodat de wereldkaart
 * niet meer meegroeit. Maar position:fixed kijkt niet naar <body> -- het rekent
 * altijd tegen het vénster, en juist dat venster is het ding dat groeit. De
 * navigatiebalk, de actiebalk van de kleedkamer en het terug-knopje van de reis
 * zakten daardoor in hun eentje de hoogte van de statusbalk mee naar beneden,
 * terwijl de rest van het scherm stil bleef staan. Dat is het schokje dat je op
 * een telefoon ziet op precies het moment dat de klok bovenin vervaagt, en dat
 * de rest wél stilstond maakte het juist zo goed zichtbaar.
 *
 * En dát is hier na te doen: een venster dat alleen in de hoogte groeit is
 * precies wat setViewportSize kan. Deze suite meet dus wat vroeger alleen op een
 * echte telefoon te zien was, en vangt de volgende zwevende balk die iemand
 * onderaan hangt zonder aan --vh-drift te denken.
 *
 *   A  de zwevende bediening onderaan beweegt niet mee als de balk vervaagt
 *   B  en het slot zelf blijft ook staan -- de app groeit niet alsnog mee
 *   C  een kleiner venster: de bediening blijft in beeld
 *   D  draaien is een échte andere maat en legt het slot opnieuw vast
 *   H  alleen de hoogte, maar écht (split-screen, een pc-venster): nieuw slot;
 *      met een tekstveld open is het het toetsenbord en blijft het slot staan;
 *      en de groei van de statusbalk wordt bij de volgende schermwissel alsnog
 *      overgenomen, zodat er geen strook onder de app blijft
 *   F  de navigatie zelf: zo breed als haar knoppen, knoppen groot genoeg voor
 *      een kindervinger, het blauwe vlak schuift mee en een schermlezer weet waar je is
 *   G  🗺️ op je eigen kaart: niets opnieuw opbouwen, terugglijden naar haar halte
 *      en daar één huppel -- en nooit Werelden
 *   I  terug op de kaart (uit de kleedkamer) zoomt de memory-knop mee in en
 *      landt waar hij hoort, ook als het venster gegroeid is -- geen sprong na
 *      afloop
 *   J  op een bureaublad houdt de kleedkamer haar opmaak terwijl ze wegvalt
 *      (het rek klapte terug naar de telefoonopmaak, zie inhoud zaak O)
 *   K  op een bureaublad heeft geen enkel scherm een schuifbalkgoot, ook niet als
 *      het schuift (de randen lichtten op bij elke wissel, zie .screen.lijst)
 *   L  op een bureaublad staat de balk bij een tabwissel stil, ook op een hoog
 *      venster waar hij mee het podium op zakt, en knipt de veeg eronder niet
 *      van maat (zie --balk-op)
 *
 * De reden voor C: --vh-drift mag nooit onder nul lopen. Zou hij dat wel doen,
 * dan schoof de bediening bij een openschuivend toetsenbord juist eráchter.
 *
 * Draaien:  npm run test:onderrand
 */
const { launch, cacheFonts, APP_URL } = require('./browser');
const { check, klaar } = require('./meld')('onderrand');

// Een staande telefoon, en de statusbalk die er vanaf gaat. 28 is de maat die
// Chrome op een Pixel teruggeeft; het getal zelf doet er niet toe, alleen dat
// het de hóógte is die verandert en niet de breedte.
const BREED = 412, HOOG = 887, STATUSBALK = 28;

// De schermen waar de balk op staat, en per scherm wat er verder onderaan hangt.
const SCHERMEN = [
  { naam: 'kaart', param: 'map', extra: ['mem-fab'] },
  { naam: 'kleedkamer', param: 'dress', extra: ['dress-bar'] },
  { naam: 'trofeeën', param: 'tro', extra: [] },
  { naam: 'reis', param: 'reis', extra: ['reis-terug'] },
];

/* Wat er op dit moment onderaan staat, in venstercoördinaten. Alleen wat écht in
   beeld staat telt mee: een element van nul hoog heeft geen onderrand om te
   vergelijken. */
const peil = (page, ids) => page.evaluate(lijst => {
  const uit = { rand: {}, slot: getComputedStyle(document.documentElement).getPropertyValue('--vh-lock').trim(),
                drift: getComputedStyle(document.documentElement).getPropertyValue('--vh-drift').trim(),
                body: +document.body.getBoundingClientRect().height.toFixed(2), venster: innerHeight };
  for (const id of lijst) {
    const el = document.getElementById(id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.height > 0) uit.rand[id] = +r.bottom.toFixed(2);
  }
  return uit;
}, ids);

/* De kleedkamerbalk en de memory-knop staan er niet uit zichzelf, en deze suite
   gaat over wáár ze hangen en niet over wannéér ze verschijnen -- dus worden ze
   hier eerst in beeld gezet.

   De balk langs het echte pad: hij komt op bij een tik op een spulletje dat nog
   níét van je is (iets wat al van je is trekt ze meteen aan, zie de tik op een
   kaartje). Dus zoekt hij zo'n kaartje op in plaats van het eerste het beste.
   De memory-knop mag wel met de hand aan: die hangt aan een muntje en een
   instelling, en geen van beide zegt iets over zijn plek. */
async function zetOnderrandAan(page) {
  await page.evaluate(() => {
    const nogniet = [...document.querySelectorAll('#item-grid .item-card')]
      .find(c => c.dataset.item && !P().owned.includes(c.dataset.item));
    if (nogniet) nogniet.click();
    const fab = document.getElementById('mem-fab');
    if (fab) fab.style.display = 'flex';
  });
  await page.waitForTimeout(150);
}

(async () => {
  const browser = await launch();

  for (const scherm of SCHERMEN) {
    const ctx = await browser.newContext({ viewport: { width: BREED, height: HOOG } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    const fouten = [];
    page.on('pageerror', e => fouten.push(e.message));

    await page.goto(APP_URL + '&demo&star=p1&screen=' + scherm.param);
    await page.waitForTimeout(700);
    await zetOnderrandAan(page);

    const ids = ['main-nav', ...scherm.extra];
    const voor = await peil(page, ids);

    // ---- A + B · de statusbalk vervaagt: zelfde breedte, hoger venster ----
    await page.setViewportSize({ width: BREED, height: HOOG + STATUSBALK });
    await page.waitForTimeout(300);
    const na = await peil(page, ids);

    check(Object.keys(voor.rand).length === ids.length,
      `A · ${scherm.naam} · alles wat gemeten wordt staat ook echt in beeld`,
      `gemist: ${ids.filter(i => !(i in voor.rand)).join(', ')}`);

    for (const id of Object.keys(voor.rand)) {
      /* Eén pixel speling, en dat is geen slordigheid: --nav-h wordt door
         meetChroom() in hele pixels weggeschreven, dus alles wat zich daaraan
         optrekt (.mem-fab) kan een pixel verspringen waar de balk zelf exact op
         zijn plek blijft. Het verschil dat deze test zoekt is de hele hoogte van
         een statusbalk. */
      /* Weg is óók fout, en niet stilletjes goed: een element dat na de groei
         geen onderrand meer heeft zou anders als "niet bewogen" wegkomen. */
      const sprong = id in na.rand ? na.rand[id] - voor.rand[id] : null;
      check(sprong !== null && Math.abs(sprong) <= 1,
        `A · ${scherm.naam} · #${id} blijft staan als de statusbalk vervaagt`,
        sprong === null ? 'staat na de groei niet meer in beeld'
          : `sprong ${sprong.toFixed(2)}px (venster ${voor.venster} -> ${na.venster})`);
    }
    check(na.slot === voor.slot && na.body === voor.body,
      `B · ${scherm.naam} · het slot zelf blijft staan`,
      `slot ${voor.slot} -> ${na.slot}, body ${voor.body} -> ${na.body}`);
    check(na.drift === STATUSBALK + 'px',
      `B · ${scherm.naam} · de drift is precies de balk die wegging`,
      `--vh-drift is ${na.drift || '(leeg)'}`);

    /* ---- E · en de strook die daardoor ónder de app overblijft is afgedekt ----
       De app staat op het vastgelegde slot en het venster is een statusbalk
       hóger, dus onder de app blijft een streep over. Die hoort niet als lichte
       band op te vallen: de schil van <body> eindigt op de onderrand van de app
       (en gaat daaronder over in --bg-4), en de veeg onder de navigatie loopt
       juist wél tot de échte schermrand door. Zonder dit keek je onder de balk
       tegen het voetlicht van de schil aan. */
    const onder = await page.evaluate(() => {
      const cs = getComputedStyle(document.body);
      const veeg = getComputedStyle(document.getElementById('main-nav'), '::before');
      return { schil: cs.backgroundSize, grond: cs.backgroundColor,
               veegOnder: veeg.bottom, veegHoog: veeg.height, veegMaat: veeg.backgroundSize };
    });
    // één maat per laag, en elke laag stopt op de hoogte van het slot
    check(onder.schil.split(',').every(l => l.trim().endsWith(HOOG + 'px')),
      `E · ${scherm.naam} · de schil eindigt op de onderrand van de app`,
      `background-size is ${onder.schil}`);
    check(/^rgba?\(/.test(onder.grond) && onder.grond !== 'rgba(0, 0, 0, 0)',
      `E · ${scherm.naam} · en daaronder staat een grondkleur`,
      `background-color is ${onder.grond}`);
    // veeg-onderrand = balk-onderrand - bottom  ->  moet op de schermrand landen
    const veegRand = na.rand['main-nav'] - parseFloat(onder.veegOnder);
    check(Math.abs(veegRand - na.venster) < 1,
      `E · ${scherm.naam} · de veeg loopt door tot de échte schermrand`,
      `veeg eindigt op ${veegRand}, venster is ${na.venster}`);
    check(onder.veegMaat.split(',').length === 2,
      `E · ${scherm.naam} · het verloop houdt zijn eigen hoogte (twee lagen)`,
      `background-size is ${onder.veegMaat}`);

    // ---- C · het toetsenbord schuift open: kleiner venster ----
    await page.setViewportSize({ width: BREED, height: HOOG - 300 });
    await page.waitForTimeout(300);
    const klein = await peil(page, ids);
    check(klein.drift === '0px',
      `C · ${scherm.naam} · een kleiner venster geeft geen negatieve drift`,
      `--vh-drift is ${klein.drift || '(leeg)'}`);
    check(Object.keys(klein.rand).every(id => klein.rand[id] <= klein.venster),
      `C · ${scherm.naam} · de bediening blijft binnen het venster`,
      Object.keys(klein.rand).map(id => `${id}: ${klein.rand[id]} van ${klein.venster}`).join(', '));

    // ---- D · draaien: een échte andere maat, dus een nieuw slot ----
    await page.setViewportSize({ width: HOOG, height: BREED });
    await page.waitForTimeout(300);
    const gedraaid = await peil(page, ids);
    check(gedraaid.slot === BREED + 'px' && gedraaid.drift === '0px',
      `D · ${scherm.naam} · draaien legt het slot opnieuw vast`,
      `slot ${gedraaid.slot}, drift ${gedraaid.drift || '(leeg)'}`);

    check(fouten.length === 0, `A · ${scherm.naam} · geen javascript-fouten`, fouten.join(' | '));
    await ctx.close();
  }

  /* ---- H · alleen de hoogte, maar dan écht ----
     --vh-lock keek eerst alleen naar de breedte. Een venster dat alleen hoger of
     lager werd (de deler van split-screen, een pc-venster) liet de app dan op zijn
     oude maat staan: een lege vlakte eronder, of de onderkant van het scherm af.
     Nu telt een hoogte zonder nieuwe breedte nog maar in twee gevallen niet: het
     toetsenbord (er staat een tekstveld open) en de statusbalk (een kleine groei),
     en die laatste wordt bij de volgende schermwissel alsnog overgenomen. */
  {
    const ctx = await browser.newContext({ viewport: { width: BREED, height: HOOG } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    const fouten = [];
    page.on('pageerror', e => fouten.push(e.message));
    await page.goto(APP_URL + '&demo&star=p1&screen=map');
    await page.waitForTimeout(700);
    const stand = () => page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return { slot: cs.getPropertyValue('--vh-lock').trim(), drift: cs.getPropertyValue('--vh-drift').trim(),
               body: Math.round(document.body.getBoundingClientRect().height) };
    });
    const maat = async h => { await page.setViewportSize({ width: BREED, height: h }); await page.waitForTimeout(300); return stand(); };

    let s = await maat(HOOG + 300);
    check(s.slot === (HOOG + 300) + 'px' && s.drift === '0px' && s.body === HOOG + 300,
      'H · een venster dat flink hoger wordt krijgt een nieuw slot', JSON.stringify(s));
    s = await maat(HOOG);
    check(s.slot === HOOG + 'px' && s.body === HOOG,
      'H · en een venster dat lager wordt ook: de app valt niet onder het scherm', JSON.stringify(s));

    await page.evaluate(() => {
      const i = document.createElement('input'); i.id = 'proef-veld'; i.type = 'text';
      document.body.appendChild(i); i.focus();
    });
    s = await maat(HOOG - 300);
    check(s.slot === HOOG + 'px' && s.drift === '0px',
      'H · met een tekstveld open is een kleiner venster het toetsenbord: het slot blijft staan', JSON.stringify(s));
    s = await maat(HOOG);
    await page.evaluate(() => document.getElementById('proef-veld').remove());
    check(s.slot === HOOG + 'px' && s.drift === '0px',
      'H · en als het toetsenbord dichtgaat staat alles weer zoals het was', JSON.stringify(s));

    /* Na een druk op terug komen de systeembalken in een fullscreen-app even terug
       (het venster krimpt een stukje) en vagen ze na een paar tellen weer weg. Het
       slot hoort daar niet op te reageren, anders blijft er na het wegvagen een
       strook onder de app over. */
    s = await maat(HOOG - 72);
    check(s.slot === HOOG + 'px' && s.drift === '0px',
      'H · systeembalken die even terugkomen (klein stukje lager) laten het slot staan', JSON.stringify(s));
    await page.evaluate(() => show('screen-dress'));
    s = await maat(HOOG);
    check(s.slot === HOOG + 'px' && s.drift === '0px',
      'H · en als ze weer wegvagen blijft er geen strook onder de app, ook niet na een schermwissel', JSON.stringify(s));

    s = await maat(HOOG + STATUSBALK);
    check(s.slot === HOOG + 'px' && s.drift === STATUSBALK + 'px',
      'H · de statusbalk die vervaagt verandert het slot niet meteen', JSON.stringify(s));
    await page.evaluate(() => show('screen-trophies'));
    await page.waitForTimeout(200);
    s = await stand();
    check(s.slot === (HOOG + STATUSBALK) + 'px' && s.drift === '0px' && s.body === HOOG + STATUSBALK,
      'H · maar bij de volgende schermwissel vult de app het hele venster', JSON.stringify(s));

    check(fouten.length === 0, 'H · geen javascript-fouten', fouten.join(' | '));
    await ctx.close();
  }

  /* ---- F · de navigatie zelf ----
     Sinds de balk alleen iconen draagt is hij zo breed als zijn drie knoppen
     (zie .nav-item in 40-kaart.css). Hier de afspraken die daarbij horen, op een
     kleine telefoon, een gewone en een tablet. */
  for (const [w, h] of [[320, 568], [390, 844], [820, 1180]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    const fouten = [];
    page.on('pageerror', e => fouten.push(e.message));
    await page.goto(APP_URL + '&demo&star=p1');
    await page.waitForTimeout(400);
    const r = await page.evaluate(async () => {
      const wacht = ms => new Promise(res => setTimeout(res, ms));
      const p = P(); p.readyTrophies = ['x']; goMap(); await wacht(900);
      const nav = $('main-nav'), sel = nav.querySelector('.nav-sel');
      const tabs = [...nav.querySelectorAll('.nav-item')];
      const doos = e => e.getBoundingClientRect();
      const stand = () => ({
        huidig: tabs.filter(t => t.getAttribute('aria-current') === 'page').map(t => t.id),
        vlak: Math.round(doos(sel).left), actief: Math.round(doos(nav.querySelector('.nav-item.active')).left),
      });
      const opKaart = stand();
      navTik('dress');
      // elk beeldje kijken in plaats van op één gok-moment: op een drukke machine
      // kan 60ms net vóór het eerste beeldje van de schuif vallen
      const van = opKaart.vlak, naar = Math.round(doos($('nav-dress')).left);
      let onderweg = van;
      for (let t = performance.now(); performance.now() - t < 600;) {
        await new Promise(res => requestAnimationFrame(res));
        const x = Math.round(doos(sel).left);
        if (x > van + 1 && x < naar - 1) { onderweg = x; break; }
      }
      await wacht(600);
      const opKast = stand();
      return {
        landmark: nav.tagName === 'NAV' && !!nav.getAttribute('aria-label'),
        navB: Math.round(doos(nav).width), venster: innerWidth,
        maten: tabs.map(t => [Math.round(doos(t).width), Math.round(doos(t).height)]),
        troLabel: $('nav-tro').getAttribute('aria-label'),
        opKaart, opKast, onderweg,
      };
    });
    const wat = `${w}×${h}`;
    check(r.landmark, `F · ${wat} · de balk is een <nav> met een naam`, String(r.landmark));
    check(r.maten.every(([b, hh]) => b >= 44 && hh >= 44), `F · ${wat} · elke knop is minstens 44 x 44`, JSON.stringify(r.maten));
    const knoppen = r.maten.reduce((a, [b]) => a + b, 0);
    check(r.navB <= knoppen + 60 && r.navB < r.venster, `F · ${wat} · de balk is zo breed als zijn knoppen`, `${r.navB}px voor ${knoppen}px knoppen`);
    check(r.opKaart.huidig.join() === 'nav-map' && r.opKast.huidig.join() === 'nav-dress',
      `F · ${wat} · precies één tabblad draagt aria-current, en het juiste`, `${r.opKaart.huidig} -> ${r.opKast.huidig}`);
    check(Math.abs(r.opKaart.vlak - r.opKaart.actief) <= 1 && Math.abs(r.opKast.vlak - r.opKast.actief) <= 1,
      `F · ${wat} · het blauwe vlak ligt onder het gekozen tabblad`, JSON.stringify([r.opKaart, r.opKast]));
    check(r.onderweg > r.opKaart.vlak + 1 && r.onderweg < r.opKast.vlak - 1,
      `F · ${wat} · en het schuift ernaartoe in plaats van te verspringen`, `${r.opKaart.vlak} -> ${r.onderweg} -> ${r.opKast.vlak}`);
    check(r.troLabel === 'Trofeeën, nieuw', `F · ${wat} · het stipje op 🏆 staat ook in woorden`, r.troLabel);
    check(fouten.length === 0, `F · ${wat} · geen javascript-fouten`, fouten.join(' | '));
    await ctx.close();
  }

  /* ---- G · 🗺️ op je eigen kaart ----
     Geen nieuwe kaart (dezelfde ster, dezelfde haltes), terug naar haar halte en
     daar een huppel; Werelden gaat niet open. Op de tablet schuift de kaart, dus
     daar eerst weg van haar. Bij beperkte beweging: wel terug, geen huppel. */
  for (const [w, h, rustig] of [[390, 844, false], [820, 1180, false], [820, 1180, true]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rustig ? 'reduce' : 'no-preference' });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    const fouten = [];
    page.on('pageerror', e => fouten.push(e.message));
    await page.goto(APP_URL + '&demo&star=p1');
    await page.waitForTimeout(400);
    const r = await page.evaluate(async () => {
      const wacht = ms => new Promise(res => setTimeout(res, ms));
      goMap(); await wacht(3200);           // de groet laten uitspelen (koeltijd)
      const map = $('tour-map');
      const ster = map.querySelector('.tour-hero'), halte = map.querySelector('.tour-stop.next');
      const thuis = map.scrollTop;
      const schuift = map.scrollHeight > map.clientHeight + 40;
      if (schuift) { map.scrollTop = thuis > 200 ? 0 : map.scrollHeight; await wacht(150); }
      const weg = map.scrollTop;
      navTik('map');
      let huppel = false;
      for (let t = performance.now(); performance.now() - t < 1600;) {
        await new Promise(res => requestAnimationFrame(res));
        if (ster.querySelector('.avatar-holder').classList.contains('dancing')) { huppel = true; break; }
      }
      await wacht(400);
      return {
        zelfde: map.querySelector('.tour-hero') === ster && map.querySelector('.tour-stop.next') === halte,
        werelden: $('screen-journey').classList.contains('active'),
        kaart: $('screen-map').classList.contains('active'),
        schuift, thuis, weg, na: map.scrollTop, huppel,
      };
    });
    const wat = `${w}×${h}${rustig ? ' · beperkte beweging' : ''}`;
    check(r.zelfde && r.kaart && !r.werelden, `G · ${wat} · de kaart blijft staan en Werelden gaat niet open`, JSON.stringify(r));
    if (r.schuift) check(Math.abs(r.na - r.thuis) <= 4 && Math.abs(r.weg - r.thuis) > 40,
      `G · ${wat} · terug naar haar halte`, `${r.thuis} -> ${r.weg} -> ${r.na}`);
    check(r.huppel === !rustig, `G · ${wat} · ${rustig ? 'geen huppel' : 'en daar één huppel'}`, String(r.huppel));
    check(fouten.length === 0, `G · ${wat} · geen javascript-fouten`, fouten.join(' | '));
    await ctx.close();
  }

  /* ---- I · de memory-knop springt niet na een terugkeer naar de kaart ----
     #screen-map zoomt bij aankomst in, en een transform op een voorouder maakt van
     position:fixed 'tegen dat scherm'. Stond .mem-fab fixed, dan hing hij zolang
     de zoom liep aan de onderrand van het scherm (het slot) en daarna aan die van
     het venster: na een vervaagde statusbalk een sprong van precies die balk, bij
     élke terugkeer. Gemeten per beeldje, ná de verf (rAF + setTimeout): waar hij
     staat moet altijd zijn rustplek zijn, meegeschaald met het scherm.
     Sinds zaak H neemt show() een gegroeid venster bij de schermwissel alsnog
     over (vhVolg), en dan vallen scherm en venster weer samen. Dat is precies
     waarom het hier uitstaat: deze zaak gaat over de knop, en die moet ook goed
     staan als die twee níét samenvallen (een toetsenbord, of een groei die nog
     niet is overgenomen). */
  {
    const ctx = await browser.newContext({ viewport: { width: BREED, height: HOOG } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    const fouten = [];
    page.on('pageerror', e => fouten.push(e.message));
    await page.goto(APP_URL + '&demo&star=p1&screen=map');
    await page.waitForTimeout(700);
    await page.setViewportSize({ width: BREED, height: HOOG + STATUSBALK });
    await page.waitForTimeout(300);
    const r = await page.evaluate(async () => {
      const wacht = ms => new Promise(res => setTimeout(res, ms));
      $('mem-fab').style.display = 'flex';
      P().settings.track = 'count';   // de memory-knop is er alleen voor een telkind (zie memoryAan)
      window.vhVolg = () => false;
      navTik('dress'); await wacht(900);
      const beelden = [];
      navTik('map');
      const t0 = performance.now();
      while (performance.now() - t0 < 900) {
        await new Promise(res => requestAnimationFrame(() => setTimeout(res, 0)));
        const f = $('mem-fab').getBoundingClientRect(), s = $('screen-map').getBoundingClientRect();
        beelden.push({ f: [f.left, f.bottom], s: [s.left, s.top, s.width] });
      }
      const rust = beelden[beelden.length - 1];
      let ergst = 0;
      for (const b of beelden) {
        const k = b.s[2] / rust.s[2];
        const x = b.s[0] + (rust.f[0] - rust.s[0]) * k, y = b.s[1] + (rust.f[1] - rust.s[1]) * k;
        ergst = Math.max(ergst, Math.abs(b.f[0] - x), Math.abs(b.f[1] - y));
      }
      return { ergst, beelden: beelden.length, onder: rust.f[1], nav: $('main-nav').getBoundingClientRect().top,
               drift: getComputedStyle(document.documentElement).getPropertyValue('--vh-drift').trim() };
    });
    check(r.beelden > 5 && r.ergst <= 2,
      'I · de memory-knop zoomt mee in en springt niet na afloop',
      `grootste afwijking ${r.ergst.toFixed(1)}px over ${r.beelden} beeldjes (drift ${r.drift})`);
    check(Math.abs(r.onder - r.nav) <= 1,
      'I · en hij landt met zijn onderrand op de navigatiebalk',
      `onderrand ${r.onder.toFixed(1)}, balk ${r.nav.toFixed(1)}`);
    check(fouten.length === 0, 'I · geen javascript-fouten', fouten.join(' | '));
    await ctx.close();
  }

  /* ---- J · een kleedkamer die vertrekt houdt haar opmaak ----
     Op een bureaublad staat het rek in een eigen kolom naast de spiegel. Die
     opmaak hing aan .active, en show() haalt .active weg op het moment van de
     tik: het scherm dat dan nog wegdooft viel terug naar de telefoonopmaak, met
     het rek als één lange rij onder de spiegel. Gemeten zonder wachten en zonder
     beeldjes: offsetLeft/offsetTop trekken zich niets aan van de animatie, dus
     het rek staat vlak na goMap() op precies dezelfde plek als ervoor, of niet. */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    const fouten = [];
    page.on('pageerror', e => fouten.push(e.message));
    await page.goto(APP_URL + '&demo&star=p1&screen=dress');
    await page.waitForFunction(() => $('screen-dress').classList.contains('active') && $('item-grid').children.length > 0);
    const r = await page.evaluate(() => {
      const rek = $('item-grid'), plek = () => [rek.offsetLeft, rek.offsetTop, rek.offsetWidth];
      const voor = plek();
      goMap();
      return { voor, na: plek(), weg: $('screen-dress').classList.contains('wegvallend') };
    });
    check(r.weg, 'J · de kleedkamer valt weg (anders meet de rest niets)', '');
    check(r.voor.every((v, i) => Math.abs(v - r.na[i]) <= 1),
      'J · en het rek blijft tijdens het wegvallen staan waar het stond',
      `voor ${r.voor.join(',')} · tijdens ${r.na.join(',')}`);
    check(fouten.length === 0, 'J · geen javascript-fouten', fouten.join(' | '));
    await ctx.close();
  }

  /* ---- K · geen scherm heeft een schuifbalkgoot ----
     Een klassieke schuifbalk (elk bureaublad) neemt een strook in die van het
     scherm zelf is. Zolang een scherm bij een wissel een transform draagt, knipt
     het zijn vaste lucht af aan de binnenkant van die strook, en stond daar de
     kale gloed van <body>: bij elke tab-wissel lichtten de randen even op. Zie
     de regel bij .screen.lijst in 10-basis.css.
     Gemeten als offsetWidth - clientWidth: precies de breedte van de goot. Elk
     scherm wordt even aangezet en kunstmatig te lang gemaakt, zodat ook een
     scherm dat vandaag toevallig past (of nooit schuift) meetelt: de regel moet
     gelden zodra er meer in staat dan past. */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    const fouten = [];
    page.on('pageerror', e => fouten.push(e.message));
    await page.goto(APP_URL + '&demo&star=p1&screen=tro');
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => [...document.querySelectorAll('.screen')].map(el => {
      const was = el.classList.contains('active');
      el.classList.add('active');
      const lang = document.createElement('div');
      lang.style.cssText = 'flex: none; width: 1px; height: 5000px';
      el.appendChild(lang);
      const uit = { id: el.id, breed: el.offsetWidth, goot: el.offsetWidth - el.clientWidth };
      lang.remove();
      if (!was) el.classList.remove('active');
      return uit;
    }));
    check(r.length > 0 && r.every(s => s.breed > 0), 'K · elk scherm is gemeten',
      r.filter(s => !s.breed).map(s => s.id).join(', '));
    const mis = r.filter(s => s.goot !== 0);
    check(mis.length === 0, 'K · geen scherm heeft een schuifbalkgoot (de randen flitsen dan bij een wissel)',
      mis.map(s => `${s.id} ${s.goot}px`).join(', '));
    check(fouten.length === 0, 'K · geen javascript-fouten', fouten.join(' | '));
    await ctx.close();
  }

  /* ---- L · de balk staat stil bij een tabwissel, ook op een groot scherm ----
     Op een venster dat hoger is dan het podium nodig heeft (--podium-lucht)
     zakt de balk mee het podium op. Deed hij dat alleen op de kaart, dan sprong
     hij bij elke tik tussen 🗺️ en 👕/🏆 op en neer -- 32px op 1920x1080, 212px
     op 2560x1440 -- en dat zie je op een telefoon of een gewone laptop nooit.
     Daarom elk beeldje van de wissel meten, op drie bureaubladmaten, en ook de
     veeg eronder: die mag van gedaante wisselen, maar alleen door over te
     vloeien (opacity), niet door op de tik van breedte te knippen. */
  for (const [w, h] of [[1440, 900], [1920, 1080], [2560, 1440]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    const fouten = [];
    page.on('pageerror', e => fouten.push(e.message));
    await page.goto(APP_URL + '&demo&star=p1');
    await page.waitForTimeout(700);
    const r = await page.evaluate(async () => {
      const wacht = ms => new Promise(res => setTimeout(res, ms));
      goMap(); await wacht(900);
      const nav = $('main-nav');
      const plek = () => { const b = nav.getBoundingClientRect(); return Math.round(b.left * 2) / 2 + ',' + Math.round(b.top * 2) / 2; };
      const veeg = () => {
        const v = getComputedStyle(nav, '::before'), a = getComputedStyle(nav, '::after');
        return v.width + ' ' + v.bottom + ' / ' + a.width + ' ' + a.bottom;
      };
      const plekken = new Set([plek()]), veegen = new Set([veeg()]);
      for (const t of ['dress', 'tro', 'map', 'tro', 'dress', 'map']) {
        navTik(t);
        for (const t0 = performance.now(); performance.now() - t0 < 700;) {
          await new Promise(res => requestAnimationFrame(res));
          plekken.add(plek()); veegen.add(veeg());
        }
      }
      const cs = getComputedStyle(nav), duren = cs.transitionDuration.split(',');
      const overgang = cs.transitionProperty.split(',').map((p, i) => [p.trim(), parseFloat(duren[i % duren.length])])
        .filter(([, d]) => d > 0).map(([p]) => p).join(',');
      return { plekken: [...plekken], veegen: [...veegen], overgang };
    });
    check(r.plekken.length === 1, `L · ${w}x${h} · de balk staat op elk tabblad en in elk beeldje op dezelfde plek`,
      r.plekken.join(' | '));
    check(r.veegen.length === 1, `L · ${w}x${h} · de veeg onder de balk knipt niet van maat bij een wissel`,
      r.veegen.join(' | '));
    check(!/\b(bottom|top|margin|all)\b/.test(r.overgang), `L · ${w}x${h} · geen overgang op de plek van de balk`,
      r.overgang);
    check(fouten.length === 0, `L · ${w}x${h} · geen javascript-fouten`, fouten.join(' | '));
    await ctx.close();
  }

  await browser.close();
  klaar();
})();
