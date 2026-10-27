/*
 * Schuiven: een scherm schuift precies zo ver als er iets te zien valt.
 *
 * Elk scherm is een scrollvak (overflow-y: auto op .screen), en dat is goed:
 * past het niet, dan schuif je. Maar het vak schuift ook als het maar een paar
 * pixels te hoog is, en dan voelt de app onder je vinger los: je duwt een
 * kleedkamer waar alles in past omhoog de lege lade in, of een hele kaart schuift
 * 46px op en toont een donkere band. Niets breekt, dus geen andere test ziet het.
 * En het omgekeerde kan ook: een rek dat juist níet schuift terwijl de onderste
 * rij nog onder de navigatie staat.
 *
 * Hoe er gemeten wordt. Per scrollvak: hoe ver schuift het, en hoe ver móét het,
 * zodat het onderste echte ding (een kaartje, een knop, een tekst) 8px boven de
 * navigatiebalk -- of de onderrand -- uitkomt. Plakkende en vaste lagen tellen
 * niet mee, en de witruimte binnen een vak ook niet: alleen bladeren.
 *
 *   A  niemand schuift meer dan SPELING verder dan nodig
 *      (vóór oktober 2026: de kleedkamer 82 te ver, ook met de lade dicht; de
 *      kaart op een liggende tablet 46; het lege beginscherm liggend 24)
 *   B  het rek van de kleedkamer en de kast zijn tot onderaan te schuiven
 *      (vóór oktober 2026: liggend breed bleef de onderste rij van het rek
 *      onder de navigatie, het raster werd op schermhoogte afgekapt)
 *   C  de kleedkamer maakt ruimte voor de lade zodra die opengaat, en geeft die
 *      pas terug bij een andere lade -- niet bij het dichtgaan, want dan sprong
 *      het rek wie onderaan stond een stuk omlaag
 *
 * Draaien:  npm run test:schuiven
 */
const { launch, cacheFonts, APP_URL } = require('./browser');
const { check, klaar } = require('./meld')('schuiven');

/* Hoeveel lucht een vak onder zijn laatste ding mag houden, bovenop de 8 die
   "nodig" al meetelt. Ruim genoeg voor de binnenrand van een kaartje en de lucht
   van een paneel (de kast houdt er zo'n 36), krap genoeg voor een vergeten balk. */
const SPELING = 44;

const MATEN = [[390, 844], [412, 915], [640, 360], [1024, 768], [1180, 820]];
const KIJK = '&demo&star=p1&wereld=4&diamanten=60&stand=halverwege';
const SCHERMEN = [
  ['beginscherm', '&demo&screen=profile'],
  ['leeg beginscherm', '&screen=profile'],
  ['kaart', KIJK + '&screen=map'],
  ['show', KIJK + '&screen=game'],
  ['eindscherm', KIJK + '&screen=end'],
  ['kast', KIJK + '&screen=tro'],
  ['ouderdeel', KIJK + '&screen=ouder'],
  ['kleedkamer', KIJK + '&screen=dress'],
];

/* Elk scrollvak dat schuift, met wat het schuift en wat het moet. */
const meet = page => page.evaluate(() => {
  const zicht = el => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
  const actief = document.querySelector('.screen.active');
  // de bovenkant van wat er onderaan vast staat (de navigatie, de lade)
  let balk = innerHeight;
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' || !zicht(el) || el.closest('.screen:not(.active)')) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 20 || r.width < 100 || r.top < innerHeight * 0.6 || r.top >= innerHeight) continue;
    if (cs.pointerEvents === 'none' && !el.querySelector('button')) continue;
    balk = Math.min(balk, r.top);
  }
  const uit = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (!/auto|scroll/.test(cs.overflowY) || el.offsetParent === null && el !== actief) continue;
    const schuift = el.scrollHeight - el.clientHeight;
    if (schuift <= 0) continue;
    const vak = el.getBoundingClientRect();
    const onder = el === actief ? Math.min(vak.bottom, balk) : vak.bottom;
    let laagst = -1e9;
    for (const c of el.querySelectorAll('*')) {
      const blad = !c.childElementCount || /^(svg|img|button)$/i.test(c.tagName) || c.matches('.item-card,.trophy-card');
      if (!blad || (c.closest('svg') && c.tagName.toLowerCase() !== 'svg')) continue;
      const ccs = getComputedStyle(c);
      if (ccs.position === 'fixed' || ccs.position === 'sticky' || !zicht(c)) continue;
      if (c.offsetParent === null && c.tagName.toLowerCase() !== 'svg') continue;
      const r = c.getBoundingClientRect();
      if (r.height < 2 || r.width < 2) continue;
      laagst = Math.max(laagst, r.bottom + el.scrollTop);
    }
    uit.push({ vak: el.id ? '#' + el.id : el.className, schuift, nodig: Math.max(0, Math.round(laagst - onder + 8)) });
  }
  return uit;
});

const tabs = page => page.locator('#screen-dress .tab-btn');

(async () => {
  const browser = await launch();
  for (const [w, h] of MATEN) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true });
    await cacheFonts(ctx);
    for (const [naam, param] of SCHERMEN) {
      const page = await ctx.newPage();
      const fouten = [];
      page.on('pageerror', e => fouten.push(e.message));
      await page.goto(APP_URL + param);
      await page.waitForTimeout(naam === 'eindscherm' ? 2500 : 1200);
      // de kleedkamer per lade: elke categorie is een ander rek
      const laden = naam === 'kleedkamer' ? await tabs(page).count() : 1;
      for (let i = 0; i < laden; i++) {
        if (naam === 'kleedkamer') { await tabs(page).nth(i).click(); await page.waitForTimeout(250); }
        const wie = `${naam}${laden > 1 ? ' lade ' + (i + 1) : ''} op ${w}x${h}`;
        for (const v of await meet(page)) {
          check(v.schuift - v.nodig <= SPELING, 'A · niet verder dan nodig',
            `${wie}: ${v.vak} schuift ${v.schuift}, nodig ${v.nodig}`);
          if (naam === 'kleedkamer' || naam === 'kast')
            check(v.schuift + 8 >= v.nodig, 'B · tot onderaan te schuiven',
              `${wie}: ${v.vak} schuift ${v.schuift}, nodig ${v.nodig}`);
        }
      }
      check(!fouten.length, 'A · niet verder dan nodig', `${naam} op ${w}x${h}: ${fouten.join(' | ')}`);
      await page.close();
    }
    await ctx.close();
  }

  // ---- C · de lade krijgt ruimte, en die blijft tot een andere lade ----
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    await page.goto(APP_URL + KIJK + '&screen=dress');
    await page.waitForTimeout(1200);
    const stand = () => page.evaluate(() => {
      const s = document.getElementById('screen-dress');
      return { lade: s.classList.contains('met-lade'), hoog: s.scrollHeight, top: s.scrollTop,
               balk: document.getElementById('dress-bar').style.display };
    });
    const dicht = await stand();
    check(!dicht.lade, 'C · ruimte voor de lade', 'met de lade dicht staat er al ruimte voor: ' + JSON.stringify(dicht));
    // een spulletje dat nog niet van haar is: de lade gaat open
    await page.evaluate(() => {
      const k = [...document.querySelectorAll('#item-grid .item-card')]
        .find(c => c.dataset.item && !P().owned.includes(c.dataset.item));
      k.click();
    });
    await page.waitForTimeout(300);
    const open = await stand();
    check(open.lade && open.balk !== 'none' && open.hoog > dicht.hoog, 'C · ruimte voor de lade',
      'lade open maar het rek kreeg er geen ruimte bij: ' + JSON.stringify(open));
    // helemaal onderaan, en dan de lade dicht (niets meer passen)
    await page.evaluate(() => { document.getElementById('screen-dress').scrollTop = 1e5; });
    await page.waitForTimeout(150);
    const onder = await stand();
    await page.evaluate(() => stopPassen());
    await page.waitForTimeout(300);
    const terug = await stand();
    check(terug.balk === 'none' && terug.top === onder.top, 'C · ruimte voor de lade',
      `de lade ging dicht en het rek sprong: ${onder.top} -> ${terug.top}`);
    await tabs(page).nth(0).click();
    await page.waitForTimeout(300);
    const ander = await stand();
    check(!ander.lade, 'C · ruimte voor de lade', 'een andere lade houdt de ruimte voor de dichte lade vast');
    await ctx.close();
  }

  await browser.close();
  klaar();
})().catch(e => { console.error(e); process.exit(1); });
