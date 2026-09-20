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
 *   C  een kleiner venster is het toetsenbord: de bediening blijft in beeld
 *   D  draaien is een échte andere maat en legt het slot opnieuw vast
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

  await browser.close();
  klaar();
})();
