/*
 * De vlucht: de wereld en zijn kaartje zijn hetzelfde ding (PS-24).
 *
 * Wat hier vastligt is niet hoe de beweging voelt -- dat is werk voor de ogen en
 * voor `npm run shots` -- maar de zes beloftes die eronder liggen:
 *
 *   1  hij begint waar de wereld stáát en eindigt waar zijn kaartje ligt. Geen
 *      sprong aan het begin, geen sprong aan het eind.
 *   2  Werelden staat al goed vóórdat er iets beweegt: er wordt nooit eerst een
 *      scherm getoond dat daarna naar de juiste plek schuift.
 *   3  er staat nooit twee keer hetzelfde kaartje in beeld.
 *   4  hij ruimt zichzelf altijd op: geen laag die blijft hangen, geen scherm dat
 *      geen tikken meer aanneemt, geen voortgang die verschuift.
 *   5  hij werkt voor élke wereld, ook als je in een eerdere staat te kijken.
 *   6  wie geen beweging wil, krijgt er geen -- en komt wél op dezelfde plek uit.
 *
 * Draaien:
 *   npm run test:vlucht        (of: npm test voor alle suites)
 */
const { launch, cacheFonts, APP_URL } = require('./browser');
const { check, klaar } = require('./meld')('vlucht');

const TELEFOON = { width: 390, height: 844 };

(async () => {
  const browser = await launch();
  const pageErrors = [];

  async function fresh(maat, opties) {
    const ctx = await browser.newContext(Object.assign({ viewport: maat || TELEFOON }, opties || {}));
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) pageErrors.push('CONSOLE ' + m.text()); });
    await page.goto(APP_URL);
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => {
      const q = defaultProfile('Roos', 'dress_roze');
      localStorage.setItem('rekenPopsterren_v1',
        JSON.stringify({ sound: false, haptics: false, schemaV: 3, profiles: { p1: q } }));
    });
    await page.reload();
    await page.waitForTimeout(250);
    await page.evaluate(() => {
      // n werelden uitgespeeld; de ster staat dan aan het begin van wereld n+1
      window.__speel = n => {
        const q = db.profiles.p1;
        for (let i = 0; i < n; i++) {
          for (let l = WORLD_START[i]; l < WORLD_START[i] + WORLDS[i].levels; l++) q.stars[l] = 2;
        }
        q.level = WORLD_START[n];
        save();
      };
      /* Eén beeldje na de start van een vlucht: dan staan de animaties er en is er
         nog niets verschoven. Alles wat een vlucht moet beloven valt hier af te
         lezen -- waar de tekening ligt, wat er al staat en wat er nog verborgen is. */
      window.__vlucht = () => {
        const vl = document.querySelector('.wereld-vlucht');
        const art = vl && vl.querySelector('.wereld-vlucht-art');
        const rond = el => { const r = el.getBoundingClientRect();
          return [r.left, r.top, r.width, r.height].map(Math.round); };
        const kader = document.querySelector('#tour-map .world-frame');
        const scherm = document.getElementById('screen-journey');
        const nav = document.getElementById('main-nav');
        return {
          laag: !!vl,
          kunst: art ? rond(art) : null,
          kader: kader ? rond(kader) : null,
          verborgen: [...document.querySelectorAll('.reis-halte.vlucht-doel')].map(b => Number(b.dataset.w)),
          scrollTop: Math.round(scherm.scrollTop),
          nav: nav.style.display === 'none' ? null : rond(nav),
          munten: rond(document.querySelector('.screen.active .diamond-badge')),
          actief: (document.querySelector('.screen.active') || {}).id,
        };
      };
      // waar het kaartje van wereld w ligt, en of het te zien is
      window.__kaartje = w => {
        const b = document.querySelector(`.reis-halte[data-w="${w}"]`);
        if (!b) return null;
        const p = b.querySelector('.reis-plaats').getBoundingClientRect();
        const s = document.getElementById('screen-journey').getBoundingClientRect();
        return { vak: [p.left, p.top, p.width, p.height].map(Math.round),
                 inBeeld: p.top >= s.top && p.bottom <= s.bottom };
      };
      window.__stand = () => ({ level: P().level, sterren: totalStarCount(P()), kijkt: viewWorldIdx });
    });
    return { ctx, page };
  }

  // een beeldje na de start van een vlucht
  const straks = page => page.evaluate(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => r(__vlucht())))));
  const rust = async page => { await page.waitForTimeout(900); return page.evaluate(() => __vlucht()); };
  const bijna = (a, b, marge) => a.every((v, i) => Math.abs(v - b[i]) <= (marge == null ? 2 : marge));

  /* ================= A · Uitzoomen =================
     De tekening vertrekt precies waar de wereld stáát -- niet een tel later en niet
     een paar pixels ernaast -- en komt tot stilstand op het kaartje van diezelfde
     wereld. Daartussen is er precies één tekening in beeld: het echte kaartje ligt
     zolang verborgen. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => { __speel(3); selectProfile('p1'); });
    await page.waitForTimeout(500);
    const kaart = await page.evaluate(() => {
      const k = document.querySelector('#tour-map .world-frame').getBoundingClientRect();
      return [k.left, k.top, k.width, k.height].map(Math.round);
    });
    const voor = await page.evaluate(() => __stand());
    await page.evaluate(() => openReis());
    const begin = await straks(page);
    check(begin.laag, 'A · er vliegt een tekening', JSON.stringify(begin));
    check(begin.actief === 'screen-journey', 'A · en Werelden staat er meteen', begin.actief);
    check(begin.kunst && bijna(begin.kunst, kaart),
      'A · die begint exact waar de wereldkaart stond', JSON.stringify([begin.kunst, kaart]));
    check(begin.verborgen.length === 1 && begin.verborgen[0] === 3,
      'A · en het echte kaartje ligt zolang verborgen -- nooit twee keer dezelfde wereld',
      JSON.stringify(begin.verborgen));

    const eind = await rust(page);
    const doel = await page.evaluate(() => __kaartje(3));
    check(!eind.laag, 'A · na afloop is de vluchtlaag weg', JSON.stringify(eind.laag));
    check(eind.verborgen.length === 0, 'A · en staat elk kaartje er gewoon',
      JSON.stringify(eind.verborgen));
    check(doel.inBeeld, 'A · de wereld waar ze vandaan komt staat in beeld', JSON.stringify(doel));
    const na = await page.evaluate(() => __stand());
    check(na.level === voor.level && na.sterren === voor.sterren,
      'A · uitzoomen is kijken: er verschuift geen enkele ster', JSON.stringify([voor, na]));
    await ctx.close();
  }

  /* ================= B · Meteen op de goede plek =================
     Werelden wordt op zijn plek gezet vóór het eerste beeldje waarop er iets te
     zien is. Schoof hij daarna alsnog, dan zou de tekening naar een kaartje vliegen
     dat intussen ergens anders ligt -- en dát is precies de sprong die deze hele
     overgang moet wegnemen. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => { __speel(4); selectProfile('p1'); });
    await page.waitForTimeout(500);
    await page.evaluate(() => openReis());
    const begin = await straks(page);
    const eind = await rust(page);
    check(begin.scrollTop === eind.scrollTop,
      'B · Werelden schuift tijdens de overgang geen pixel', `${begin.scrollTop} -> ${eind.scrollTop}`);
    check(begin.scrollTop > 0, 'B · en hij opent niet onderaan', String(begin.scrollTop));
    await ctx.close();
  }

  /* ================= C · Wat stil blijft staan =================
     De navigatiebalk en de diamantenpil horen bij allebei de schermen en staan op
     allebei op dezelfde plek. Ze doen dus niet mee: die stilstand is wat de zoom in
     het midden zijn richting geeft. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => { __speel(2); selectProfile('p1'); });
    await page.waitForTimeout(500);
    const voor = await page.evaluate(() => __vlucht());
    await page.evaluate(() => openReis());
    const begin = await straks(page);
    const eind = await rust(page);
    check(voor.nav && bijna(voor.nav, begin.nav, 0) && bijna(voor.nav, eind.nav, 0),
      'C · de navigatiebalk verroert zich niet', JSON.stringify([voor.nav, begin.nav, eind.nav]));
    check(bijna(voor.munten, eind.munten, 2),
      'C · en de diamanten blijven staan waar ze stonden', JSON.stringify([voor.munten, eind.munten]));
    await ctx.close();
  }

  /* ================= D · Terug: het kaartje wordt weer een wereld =================
     Dezelfde vlucht, andersom. Hij begint op het kaartje dat je aantikt en eindigt
     op de kaart van die wereld -- ook als dat een eerdere wereld is dan waar de
     ster staat, want dat is precies waar dit scherm voor is. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => { __speel(3); selectProfile('p1'); });
    await page.waitForTimeout(500);
    const voor = await page.evaluate(() => __stand());
    await page.evaluate(() => openReis());
    await page.waitForTimeout(900);
    const doel = await page.evaluate(() => __kaartje(1));
    await page.evaluate(() => reisNaarWereld(1, document.querySelector('.reis-halte[data-w="1"]')));
    const begin = await straks(page);
    check(begin.laag, 'D · er vliegt een tekening terug', JSON.stringify(begin.laag));
    check(begin.kunst && Math.abs(begin.kunst[2] - doel.vak[2]) <= 3,
      'D · die begint op de maat van het kaartje', JSON.stringify([begin.kunst, doel.vak]));
    const eind = await rust(page);
    check(!eind.laag, 'D · na afloop is de vluchtlaag weg', JSON.stringify(eind.laag));
    check(eind.actief === 'screen-map', 'D · en je staat op de kaart', eind.actief);
    check(eind.kader && eind.kader[2] > 0, 'D · met een echt kader eronder', JSON.stringify(eind.kader));
    const na = await page.evaluate(() => __stand());
    check(na.kijkt === 1, 'D · in de wereld die je koos', JSON.stringify(na));
    check(na.level === voor.level && na.sterren === voor.sterren,
      'D · zonder dat de voortgang meeverhuist', JSON.stringify([voor, na]));
    await ctx.close();
  }

  /* ================= E · Een eerdere wereld =================
     Sta je in wereld 1 te kijken terwijl je ster in wereld 4 staat, dan zoomt de
     kaart uit naar hét kaartje van wereld 1 -- niet naar dat van de ster. Anders
     vliegt de tekening naar een plek die buiten het venster ligt en zie je hem
     gewoon verdwijnen. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => { __speel(3); selectProfile('p1'); });
    await page.waitForTimeout(500);
    await page.evaluate(() => navigeerNaarWereld(0));
    await page.waitForTimeout(900);
    const kijkt = await page.evaluate(() => __stand());
    await page.evaluate(() => openReis());
    const begin = await straks(page);
    check(kijkt.kijkt === 0, 'E · ze kijkt in een eerdere wereld', JSON.stringify(kijkt));
    check(begin.verborgen.length === 1 && begin.verborgen[0] === 0,
      'E · en de vlucht gaat naar hét kaartje van díe wereld', JSON.stringify(begin.verborgen));
    await rust(page);
    const doel = await page.evaluate(() => __kaartje(0));
    check(doel.inBeeld, 'E · dat daarvoor gewoon in beeld staat', JSON.stringify(doel));
    await ctx.close();
  }

  /* ================= F · Drie keer tikken is één keer uitzoomen =================
     Een kind van vijf tikt drie keer. Dat hoort één vlucht te geven, en daarna moet
     alles het gewoon weer doen. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => { __speel(2); selectProfile('p1'); });
    await page.waitForTimeout(500);
    await page.evaluate(() => { openReis(); openReis(); openReis(); });
    const begin = await straks(page);
    check(begin.laag, 'F · er start een vlucht', JSON.stringify(begin.laag));
    const lagen = await page.evaluate(() => document.querySelectorAll('.wereld-vlucht').length);
    check(lagen === 1, 'F · en precies één vluchtlaag, niet drie', String(lagen));
    const eind = await rust(page);
    check(!eind.laag, 'F · die ook bij drie tikken netjes opruimt', '');
    // en daarna is alles gewoon weer aan te tikken
    await page.evaluate(() => reisSluit());
    await page.waitForTimeout(900);
    const terug = await page.evaluate(() => __vlucht());
    check(terug.actief === 'screen-map' && !terug.laag,
      'F · en de weg terug doet het daarna gewoon', JSON.stringify(terug));

    /* En de tik die er tússenin valt: de beweging is klaar maar de overvloeier
       loopt nog. Die 80ms hoort geen dood moment te zijn -- een kind dat dán terug
       tikt hoort gewoon terug te gaan, en de halve vlucht die er nog ligt hoort
       zonder resten te verdwijnen. */
    await page.evaluate(() => openReis());
    await page.waitForTimeout(370);
    await page.evaluate(() => reisSluit());
    await page.waitForTimeout(900);
    const middenin = await page.evaluate(() => ({
      ...__vlucht(), lagen: document.querySelectorAll('.wereld-vlucht').length,
      klas: document.getElementById('screen-map').className,
    }));
    check(middenin.actief === 'screen-map' && middenin.lagen === 0 && !/vlucht/.test(middenin.klas),
      'F · en een tik tijdens de overvloeier komt gewoon aan', JSON.stringify(middenin));
    await ctx.close();
  }

  /* ================= G · Heen en weer en heen =================
     Vijf keer op en neer. Er blijft geen laag hangen, er komt geen tweede kaartje
     bij en de voortgang blijft staan waar hij stond. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => { __speel(3); selectProfile('p1'); });
    await page.waitForTimeout(500);
    const voor = await page.evaluate(() => __stand());
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => openReis());
      await page.waitForTimeout(700);
      await page.evaluate(() => reisSluit());
      await page.waitForTimeout(700);
    }
    const eind = await page.evaluate(() => ({
      lagen: document.querySelectorAll('.wereld-vlucht').length,
      globes: document.querySelectorAll('.globe-vlucht').length,
      actief: (document.querySelector('.screen.active') || {}).id,
      klas: document.getElementById('screen-map').className,
      stand: __stand(),
    }));
    check(eind.lagen === 0 && eind.globes === 0,
      'G · er blijft niets van een vlucht hangen', JSON.stringify(eind));
    check(eind.actief === 'screen-map', 'G · en je staat waar je wilde zijn', eind.actief);
    check(!/vlucht/.test(eind.klas), 'G · de kaart draagt geen vluchtklasse meer', eind.klas);
    check(eind.stand.level === voor.level && eind.stand.sterren === voor.sterren,
      'G · en er is in vijf keer geen ster verschoven', JSON.stringify([voor, eind.stand]));
    // en hij neemt nog steeds tikken aan
    const tikbaar = await page.evaluate(() => {
      const b = document.querySelector('.tour-stop:not(.locked)');
      const r = b.getBoundingClientRect();
      const op = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!(op && op.closest('.tour-stop'));
    });
    check(tikbaar, 'G · en de haltes zijn gewoon aan te tikken', String(tikbaar));
    await ctx.close();
  }

  /* ================= H · Wie geen beweging wil =================
     prefers-reduced-motion: geen vlucht, geen verschuiving -- en wél dezelfde weg.
     De oorzaak (ik tik op de wereldpil) en het gevolg (ik sta op Werelden) blijven
     precies hetzelfde; alleen het stuk ertussen is er niet. */
  {
    const { ctx, page } = await fresh(TELEFOON, { reducedMotion: 'reduce' });
    await page.evaluate(() => { __speel(3); selectProfile('p1'); });
    await page.waitForTimeout(500);
    await page.evaluate(() => openReis());
    const begin = await straks(page);
    check(!begin.laag, 'H · er vliegt niets', JSON.stringify(begin.laag));
    check(begin.actief === 'screen-journey', 'H · en Werelden staat er meteen', begin.actief);
    const eind = await rust(page);
    const doel = await page.evaluate(() => __kaartje(3));
    check(doel.inBeeld, 'H · op de goede plek', JSON.stringify(doel));
    check(eind.verborgen.length === 0, 'H · zonder verborgen kaartje', JSON.stringify(eind.verborgen));
    await page.evaluate(() => reisSluit());
    await page.waitForTimeout(600);
    const terug = await page.evaluate(() => __vlucht());
    check(terug.actief === 'screen-map' && !terug.laag, 'H · en terug werkt net zo', JSON.stringify(terug));
    await ctx.close();
  }

  /* ================= I · Elke schermmaat =================
     Een krappe telefoon, een gewone, een tablet rechtop en een venster op zijn kant.
     De vlucht meet zijn begin en eind op en rekent niets voor -- dus hij hoort
     overal te beginnen waar de wereld staat en te eindigen waar zijn kaartje ligt.  */
  for (const [naam, maat] of [['krap', { width: 320, height: 568 }],
                              ['pixel', { width: 412, height: 915 }],
                              ['tablet', { width: 820, height: 1180 }],
                              ['liggend', { width: 1024, height: 768 }]]) {
    const { ctx, page } = await fresh(maat);
    await page.evaluate(() => { __speel(3); selectProfile('p1'); });
    await page.waitForTimeout(500);
    const kaart = await page.evaluate(() => {
      const k = document.querySelector('#tour-map .world-frame').getBoundingClientRect();
      return [k.left, k.top, k.width, k.height].map(Math.round);
    });
    await page.evaluate(() => openReis());
    const begin = await straks(page);
    check(begin.laag && bijna(begin.kunst, kaart, 3),
      `I · ${naam} · de vlucht begint waar de wereld staat`, JSON.stringify([begin.kunst, kaart]));
    const eind = await rust(page);
    const doel = await page.evaluate(() => __kaartje(3));
    check(!eind.laag, `I · ${naam} · en ruimt zichzelf op`, JSON.stringify(eind.laag));
    check(doel && doel.inBeeld, `I · ${naam} · met de wereld in beeld`, JSON.stringify(doel));
    await ctx.close();
  }

  /* ================= J · De tekening blijft heel =================
     Het kijkgat schaalt ongelijk (van een staand scherm naar een liggend kaartje)
     en de tekening erin draait dat terug. Samen hoort daar op élk moment een
     gelijkmatige krimp uit te komen -- doet het dat niet, dan wordt de wereld
     onderweg zichtbaar uitgerekt.

     En de vorm van dat gat moet op de compositor kunnen blijven: het knipt met
     overflow (dat hangt aan de transform van het vak zelf) en de animatie die die
     transform draagt mag niets ánders bevatten. Eén niet-composeerbare eigenschap
     ertussen -- een border-radius, een clip-path -- zet de hele animatie op de
     hoofddraad, en dan loopt het gat achter op de tekening zodra die draad even
     hapert. Wat je dan ziet is de hele wereldtekening ongeknipt over de kaartjes
     heen: de flits aan het eind van de overgang. Nagemeten met een opname: drie op
     de zes overgangen met een geanimeerde clip-path, nul op de twaalf hierna. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => { __speel(3); selectProfile('p1'); });
    await page.waitForTimeout(500);
    const uit = await page.evaluate(() => new Promise(res => {
      openReis();
      requestAnimationFrame(() => {
        const laag = document.querySelector('.wereld-vlucht');
        if (!laag) return res(null);
        const kunst = laag.querySelector('.wereld-vlucht-art');
        const an = laag.getAnimations().concat(kunst.getAnimations());
        an.forEach(a => a.pause());
        const doel = ART_W / ART_H;
        let ergst = 0;
        for (let t = 0; t <= VLUCHT.duur; t += VLUCHT.duur / 20) {
          an.forEach(a => { try { a.currentTime = t; } catch (e) {} });
          const r = kunst.getBoundingClientRect();
          if (r.height) ergst = Math.max(ergst, Math.abs((r.width / r.height) / doel - 1));
        }
        // welke eigenschappen zitten er in de animaties die een transform dragen?
        const samen = an.map(a => Object.keys(a.effect.getKeyframes()[0] || {})
          .filter(k => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)))
          .filter(ks => ks.includes('transform'));
        res({ ergst: +(ergst * 100).toFixed(3),
              knipt: getComputedStyle(laag).overflow,
              clip: getComputedStyle(laag).clipPath,
              vermengd: samen.filter(ks => ks.length > 1) });
      });
    }));
    check(uit && uit.ergst < 0.5, 'J · de tekening vervormt onderweg niet',
      uit ? uit.ergst + '% afwijking' : 'geen vluchtlaag');
    check(uit && /hidden/.test(uit.knipt), 'J · het kijkgat knipt met overflow', uit && uit.knipt);
    check(uit && (uit.clip === 'none' || !uit.clip), 'J · en niet met een clip-path', uit && uit.clip);
    check(uit && uit.vermengd.length === 0,
      'J · en de transform-animaties dragen niets wat ze van de compositor haalt',
      uit && JSON.stringify(uit.vermengd));
    await page.waitForTimeout(700);
    await ctx.close();
  }

  check(pageErrors.length === 0, 'Z · geen fouten in de pagina', pageErrors.join(' | '));
  await browser.close();
  klaar();
})();
