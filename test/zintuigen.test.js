/*
 * Zintuigen: elke gebeurtenis heeft één klankje, en elk klankje één betekenis.
 *
 * De klankjestabel (SFX in src/30-zintuigen.js) zegt wát er bij een
 * gebeurtenis klinkt en trilt; kern zaak O kijkt die tabel na. Deze suite kijkt
 * of de schermen zich eraan houden, met echte tikken in een echte browser:
 *
 *   A  elke tik wordt gehoord, en maar één keer. Elke zichtbare knop op zes
 *      schermen: er klinkt iets (een knop die stil blijft voelt kapot), en er
 *      beginnen nooit twee klankjes tegelijk (een tik en haar noot samen lezen
 *      als één rommel). Wat er later komt -- het vertrekklankje als ze gaat
 *      lopen -- is een tweede gebeurtenis en telt niet mee.
 *      Gerekend per vinger, niet per klik: een tik kan zijn onclick vanuit
 *      pointerup krijgen met een eigen klik, en de klik van de browser valt dan
 *      weg (zie "= Elke tik telt").
 *   B  "nog niet" klinkt overal hetzelfde: een halte op slot en te weinig 💎 in
 *      de kleedkamer geven het tokje van elk slot ('nog.niet'), en nooit de
 *      misser van een som.
 *   C  de ring zegt "hier kwam het aan", en dus geeft een antwoordknop geen
 *      tikring: niet op een goed antwoord (daar heeft de knop zijn eigen groene
 *      ring) en niet op een fout.
 *   D  een tik op haar terwijl ze danst wordt gehoord: haar noot klinkt, ook als
 *      er geen nieuw pasje bij kan.
 *
 * Draaien:
 *   npm run test:zintuigen      (of: npm test voor alle suites)
 */
const { launch, cacheFonts, rust, APP_URL } = require('./browser');
const { check, klaar } = require('./meld')('zintuigen');

const TELEFOON = { width: 390, height: 844 };
// Wat iets wist, deelt, de pagina verlaat of een bestand opent, tikken we niet aan
// (dezelfde lijst als test:robuust).
const NIET = /set-reset|set-delete|delete|wis|import|export|backup|deel|kopieer|installeer|oz-|set-over|set-mail|over-hint|naarOver|app-knop|alsapp|set-beginscherm/i;
// Twee klankjes die binnen deze tijd na elkaar beginnen, klinken als één.
const SAMEN = 120;
// Zo lang na de tik wachten we op het klankje van die tik.
const NA_TIK = 450;

// Elk klankje met zijn tijdstip, vanaf het eerste beeldje.
const LUISTER = `addEventListener('DOMContentLoaded', () => {
  window.__klank = [];
  const o = window.playSfx;
  window.playSfx = function (naam) { __klank.push({ t: performance.now(), naam }); return o.apply(this, arguments); };
});`;

(async () => {
  const browser = await launch();
  const fouten = [];
  const ctx = await browser.newContext({ viewport: TELEFOON, hasTouch: true, isMobile: true });
  await cacheFonts(ctx);
  await ctx.addInitScript(LUISTER);
  const page = await ctx.newPage();
  page.on('pageerror', e => fouten.push('PAGEERROR ' + e.message));

  const tikOp = async (x, y) => {
    const t0 = await page.evaluate(() => performance.now());
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(NA_TIK);
    return page.evaluate(t0 => __klank.filter(k => k.t >= t0 - 5).map(k => ({ ...k, t: k.t - t0 })), t0);
  };

  /* ---- A · elke tik wordt gehoord, en maar één keer ---- */
  for (const scherm of ['map', 'dress', 'tro', 'profile', 'ouder', 'end']) {
    const url = APP_URL + '&demo&star=p1&diamanten=100&screen=' + scherm;
    const zoek = () => page.evaluate(niet => {
      const re = new RegExp(niet, 'i'), soort = {};
      return [...document.querySelectorAll('.screen.active button, .screen.active [onclick], .screen.active .tour-stop, #main-nav button')].filter(b => {
        const r = b.getBoundingClientRect();
        if (r.width < 4 || r.bottom < 0 || r.top > innerHeight) return false;
        if (b.closest('a[href]') || re.test((b.id || '') + ' ' + (b.className || '') + ' ' + (b.getAttribute('onclick') || ''))) return false;
        const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        if (!e || !(e === b || b.contains(e))) return false;
        // van een rij gelijke kaartjes zijn er drie genoeg
        const k = String(b.className.baseVal ?? b.className);
        soort[k] = (soort[k] || 0) + 1;
        return soort[k] <= 3;
      }).map(b => {
        const r = b.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2,
          naam: (b.id ? '#' + b.id : String(b.className.baseVal ?? b.className).split(' ')[0]) + ' "' + (b.getAttribute('aria-label') || b.textContent).trim().replace(/\s+/g, ' ').slice(0, 24) + '"' };
      });
    }, NIET.source);
    // het eindscherm bouwt in stappen op (sterren, 💎, trofee): eerst laten uitdelen, die tonen zijn geen antwoord op de tik
    const opRust = () => rust(page, { minstens: scherm === 'end' ? 3200 : 0 });
    await page.goto(url);
    await opRust();
    const knoppen = await zoek();
    check(knoppen.length > 0, `A · ${scherm}: er staan knoppen om aan te tikken`, '');
    for (let i = 0; i < knoppen.length; i++) {
      // na het herladen opnieuw opzoeken: wat de vorige tik bewaarde (een trofee
      // gezien, een kaartje gekozen) kan de knoppen een rij laten opschuiven
      let k = knoppen[i];
      if (i) {
        await page.goto(url); await opRust();
        k = (await zoek()).find(n => n.naam === k.naam);
        if (!k) continue;
      }
      const klank = await tikOp(k.x, k.y);
      check(klank.length > 0, 'A · elke knop die iets doet, tikt', `${scherm}: ${k.naam} bleef stil`);
      const samen = klank.filter(x => x.t - klank[0].t < SAMEN);
      check(samen.length <= 1, 'A · nooit twee klankjes tegelijk op één tik',
        `${scherm}: ${k.naam} -> ${samen.map(x => x.naam).join(' + ')}`);
    }
  }

  /* ---- B · "nog niet" klinkt overal hetzelfde ---- */
  {
    await page.goto(APP_URL + '&demo&star=p1');
    await rust(page);
    const slot = await page.evaluate(() => { const r = document.querySelector('.tour-stop.locked').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    const klank = await tikOp(slot.x, slot.y);
    check(klank[0] && klank[0].naam === 'nog.niet', 'B · een halte op slot zegt "nog niet"', JSON.stringify(klank.map(x => x.naam)));

    /* Te weinig 💎. Het rek toont dan "Speel" in plaats van Koop, maar de
       podiumlade houdt zijn koopknop: confirmShopBuy is de deur waar het slot
       op zit, dus die vragen we rechtstreeks. */
    await page.goto(APP_URL + '&demo&star=p1&diamanten=0&screen=dress');
    await rust(page);
    const namen = await page.evaluate(async () => {
      const it = ITEMS.find(i => i.price > 0 && !P().owned.includes(i.id) && !isBeloning(i.id) && i.cat !== PODIA_CAT);
      if (!it) return null;
      const t0 = performance.now();
      confirmShopBuy(it.id);
      await new Promise(r => setTimeout(r, 200));
      return __klank.filter(k => k.t >= t0).map(k => k.naam);
    });
    check(namen && namen.includes('nog.niet') && !namen.includes('answer.retry'), 'B · te weinig 💎 zegt "nog niet", niet "fout"', JSON.stringify(namen));
  }

  /* ---- C · een antwoordknop geeft geen tikring ---- */
  {
    await page.goto(APP_URL + '&demo&star=p1');
    await rust(page);
    const halte = await page.evaluate(() => { const r = document.querySelector('.tour-stop.next').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.touchscreen.tap(halte.x, halte.y);
    for (const goed of [true, false]) {
      // de ring van de halte-tik is eerst uitgespeeld
      await page.waitForFunction(() => typeof G !== 'undefined' && G && !G.lock && G.qs[G.idx] && document.querySelector('.choice-btn') && !document.querySelector('.tap-ripple'), null, { timeout: 8000 });
      const knop = await page.evaluate(goed => {
        const q = G.qs[G.idx];
        const b = [...document.querySelectorAll('.choice-btn')].find(b => goed ? b.dataset.v == q.ans : b.dataset.v != q.ans);
        const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, goed);
      await page.touchscreen.tap(knop.x, knop.y);
      await page.waitForTimeout(60);
      const ring = await page.evaluate(() => !!document.querySelector('.tap-ripple'));
      check(!ring, `C · ${goed ? 'een goed' : 'een fout'} antwoord geeft geen tikring`, '');
      await page.waitForTimeout(1800);
    }
  }

  /* ---- D · een tik op haar midden in een dans wordt gehoord ---- */
  {
    await page.goto(APP_URL + '&demo&star=p1&screen=dress');
    await rust(page);
    const pop = await page.evaluate(() => { const r = document.getElementById('shop-spiegel').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await tikOp(pop.x, pop.y);                       // ze begint te dansen
    const danst = await page.evaluate(() => document.getElementById('shop-avatar').classList.contains('dancing'));
    const klank = await tikOp(pop.x, pop.y + 10);    // en nog eens, midden in het pasje
    check(!danst || klank.some(x => x.naam === 'tap.blij'), 'D · een tik terwijl ze danst krijgt haar noot', JSON.stringify(klank.map(x => x.naam)));
  }

  check(fouten.length === 0, 'Z · geen fouten in de pagina', fouten.slice(0, 5).join(' | '));
  await browser.close();
  klaar();
})();
