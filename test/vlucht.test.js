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

  /* HET EERSTE BEELDJE VAN EEN VLUCHT -- en niet "een beeldje ná de start".

     Hier stonden twee requestAnimationFrames, met de aanname dat er in die twee
     beeldjes nog niets verschoven was. Die aanname is niet hard. De baan van een
     vlucht legt 42% van de weg af in de eerste 60ms (zie VLUCHT.baanPunten, waar
     dat met zoveel woorden staat), dus één beeldje te laat is al ruim een tiende
     van de reis. Staat de machine onder druk, dan is dat precies wat er gebeurt:
     zaak D mat de tekening dan op 212px terwijl het kaartje 179 breed is -- een
     vlucht die er 18% in zit, gemeld als een vlucht die op de verkeerde maat
     begint. Groen en rood hingen daarmee aan de belasting van de machine, en dat
     is erger dan een test die niets meet: het verstopt een échte fout tussen de
     ruis.

     Meten gebeurt daarom niet meer op de klok maar op de animatie zelf. Elke
     animatie van de vluchtlaag wordt heel even op zijn eerste beeldje gezet
     (currentTime 0 -- de keyframes staan op offset 0 exact op de beginmaat, zie
     vluchtBeelden), opgemeten, en meteen teruggezet waar hij was. Dat gebeurt
     allemaal binnen één taak, dus er wordt geen enkel beeldje mee geverfd: de
     vlucht loopt gewoon door en de rest van elke zaak (de landing, het
     opruimen) merkt er niets van.

     Wat er gemeten wordt is daarmee precies wat deze controles zeggen te
     controleren: wáár de vlucht begint. Hoe snel de machine op dat moment is,
     doet niet meer mee. */
  const straks = page => page.evaluate(() => new Promise(r =>
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const laag = document.querySelector('.wereld-vlucht');
      // Geen vlucht (reduced motion, zie zaak H)? Dan valt er niets te bevriezen
      // en leest dit precies zoals het altijd al deed.
      const anims = laag ? laag.getAnimations({ subtree: true }) : [];
      const stand = anims.map(a => a.currentTime);
      anims.forEach(a => { a.currentTime = 0; });
      const uit = __vlucht();
      anims.forEach((a, i) => { if (stand[i] != null) a.currentTime = stand[i]; });
      r(uit);
    }))));
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

  /* ================= K · De globe is de draad =================
     De kop van Werelden draagt alleen nog een globe -- geen woord, geen pil, geen
     chevron -- en hij is niet nieuw: het is dezelfde globe die op de wereldpil
     stond. Dat mag je dus zien: op élk beeldje van de overgang staat er precies
     één in beeld, en op het beeldje waarop de vliegende kopie plaatsmaakt voor de
     echte springt er niets.

     Twee fouten liggen hier op de loer en allebei zijn ze eerder gemaakt: de kopie
     laten wegdoven terwijl de echte nog verborgen is (dan knippert het teken weg
     en terug), en de echte laten opkomen terwijl de kopie er nog vliegt (dan staan
     er twee). Vandaar dat dit per beeldje geteld wordt en niet per eindstand. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => { __speel(3); selectProfile('p1'); });
    await page.waitForTimeout(500);
    const kop = await page.evaluate(() => {
      const t = document.querySelector('#screen-journey .reis-titel');
      const globe = t.querySelector('.rt-ico');
      // alles behalve de globe zelf: dáár hoort niets meer te staan
      const rest = t.textContent.replace(globe ? globe.textContent : '', '').trim();
      // de kop zegt waar je bent; de globe erin is de knop terug (zie .reis-titel)
      const koptekst = t.closest('[role="heading"]');
      return { rest, naam: koptekst && koptekst.getAttribute('aria-label'), knop: t.tagName === 'BUTTON' && t.getAttribute('aria-label'),
               chevron: !!t.querySelector('svg'), globes: t.querySelectorAll('.rt-ico').length };
    });
    check(kop.rest === '' && !kop.chevron && kop.globes === 1,
      'K · de kop van Werelden draagt alleen een globe', JSON.stringify(kop));
    check(kop.naam === 'Werelden', 'K · maar een schermlezer hoort nog wél waar hij is', String(kop.naam));
    check(kop.knop === 'Terug naar de kaart', 'K · en de globe is de knop terug, net als de ←', String(kop.knop));

    /* En hij is rond. Een emoji tekent breder dan zijn em-vierkant; staat de
       regelhoogte op precies 1em, dan wordt hij boven en onder afgesneden en kijk je
       naar een platgedrukte wereldbol. Dat is niet aan een kleurwaarde te zien maar
       wél aan het vakje: is dat lager dan het breed is, dan knijpt de regel de glyph
       af. Allebei de globes, want het hoort dezelfde te zijn -- een ronde die
       overvliegt naar een platte is een sprong op de landing. */
    const maat = sel => page.evaluate(sel => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { b: +r.width.toFixed(1), h: +r.height.toFixed(1) };
    }, sel);
    const rondPil = await maat('#screen-map .wp-cta-ico');      // we staan op de kaart
    await page.evaluate(() => openReis());
    await page.waitForTimeout(800);
    const rondReis = await maat('#screen-journey .rt-ico');
    await page.evaluate(() => reisSluit());                     // en netjes terug
    await page.waitForTimeout(800);
    [['wereldpil', rondPil], ['kop van Werelden', rondReis]].forEach(([waar, m]) => {
      check(m && m.h >= m.b - 1, `K · de globe op de ${waar} wordt niet platgedrukt`, JSON.stringify(m));
    });

    const tel = heen => new Promise(res => {
      const zichtbaar = el => {
        let n = el;
        while (n && n !== document.body) {
          const st = getComputedStyle(n);
          if (st.visibility === 'hidden' || st.display === 'none' || +st.opacity < 0.02) return false;
          n = n.parentElement;
        }
        return true;
      };
      const uit = []; const t0 = performance.now();
      (heen ? openReis : reisSluit)();
      const stap = () => {
        const g = [...document.querySelectorAll('.wp-cta-ico, .rt-ico, .globe-vlucht')]
          .filter(zichtbaar).map(el => {
            const r = el.getBoundingClientRect();
            return { w: el.className.split(' ')[0], x: r.left + r.width / 2, y: r.top + r.height / 2 };
          });
        uit.push(g);
        if (performance.now() - t0 < 620) requestAnimationFrame(stap); else res(uit);
      };
      requestAnimationFrame(stap);
    });
    /* De vliegende kopie wordt op dezelfde manier gezet als de globe die hij
       vervangt. Dat gaat niet over de máát van zijn vakje -- dat komt sowieso van
       het origineel -- maar over hoe de glyph daarín valt: een emoji staat op de
       grondlijn van zijn regel, dus de regelhoogte bepaalt zijn hoogte in het vak.
       Stond die op de kopie vast terwijl de echte globes iets anders deden, dan
       sprong het teken op het moment van loskomen een paar pixels omhoog en bij de
       landing weer omlaag. Opgemeten toen dat zo was: 2,1px omhoog, 2,5px omlaag. */
    const gezet = await page.evaluate(() => new Promise(res => {
      openReis();
      requestAnimationFrame(() => {
        const kopie = document.querySelector('.globe-vlucht');
        const bron = document.querySelector('#screen-map .wp-cta-ico');
        if (!kopie || !bron) return res(null);
        const a = getComputedStyle(kopie), b = getComputedStyle(bron);
        res({ kopie: [a.fontSize, a.lineHeight], bron: [b.fontSize, b.lineHeight] });
      });
    }));
    check(gezet && gezet.kopie.join() === gezet.bron.join(),
      'K · de vliegende kopie wordt gezet als de globe die hij vervangt',
      JSON.stringify(gezet));
    await page.waitForTimeout(900);
    await page.evaluate(() => reisSluit());
    await page.waitForTimeout(900);

    for (const [heen, hoe] of [[true, 'uitzoomen'], [false, 'inzoomen']]) {
      const rijen = await page.evaluate(tel, heen);
      const leeg = rijen.filter(g => g.length === 0).length;
      const dubbel = rijen.filter(g => g.length > 1).length;
      const pad = rijen.filter(g => g.length === 1).map(g => g[0]);
      const wissel = pad.findIndex((g, i) => i && g.w !== pad[i - 1].w);
      const sprong = wissel > 0
        ? Math.hypot(pad[wissel].x - pad[wissel - 1].x, pad[wissel].y - pad[wissel - 1].y) : 0;
      check(leeg === 0 && dubbel === 0, `K · ${hoe} · precies één globe op elk beeldje`,
        `${leeg} leeg, ${dubbel} dubbel van ${rijen.length}`);
      check(wissel > 0 && sprong < 2, `K · ${hoe} · en de wissel naar de echte springt niet`,
        `wissel ${wissel}, sprong ${sprong.toFixed(2)}px`);
      await page.waitForTimeout(700);
    }
    await ctx.close();
  }

  /* ---- L · Tikken terwijl er iets beweegt (de navigatie-audit) ----
     Een tik middenin een overgang gaat nooit verloren en raakt nooit iets wat al
     weg is. Elk geval hier was een dode knop of een fout in de pagina. */
  {
    const { ctx, page } = await fresh();
    const scherm = () => page.evaluate(() => document.querySelector('.screen.active').id);
    const opKaart = async () => {
      await page.evaluate(() => { selectProfile('p1'); });
      await page.waitForTimeout(900);
    };
    // 🗺 en terug terwijl de kaart naar Werelden vliegt: na de landing terug naar de kaart
    await opKaart();
    await page.click('#map-tournee-label');
    await page.waitForTimeout(150);
    await page.click('#nav-map', { force: true });
    await page.waitForTimeout(1800);
    check(await scherm() === 'screen-map', 'L · 🗺 middenin de vlucht naar Werelden brengt je na de landing terug', await scherm());
    await page.click('#map-tournee-label');
    await page.waitForTimeout(150);
    await page.evaluate(() => history.back());
    await page.waitForTimeout(1800);
    check(await scherm() === 'screen-map', 'L · net zo voor de terugknop van het toestel', await scherm());
    // een dubbeltik op de pil komt op de globe van Werelden: die stuurt je niet meteen terug
    await page.click('#map-tournee-label');
    await page.waitForTimeout(80);
    await page.click('#map-tournee-label', { force: true });
    await page.waitForTimeout(1800);
    check(await scherm() === 'screen-journey', 'L · een dubbeltik op de 🌍 blijft op Werelden', await scherm());
    // en daar is de globe de weg terug
    await page.click('#screen-journey .reis-titel');
    await page.waitForTimeout(1500);
    check(await scherm() === 'screen-map', 'L · de 🌍 op Werelden vliegt terug naar de kaart', await scherm());
    // een halte, en meteen een tabblad: het tabblad wint, er start geen show
    await page.evaluate(() => {
      document.querySelector('.tour-stop.next').click();
      setTimeout(() => document.getElementById('nav-dress').click(), 20);
    });
    await page.waitForTimeout(900);
    check(await scherm() === 'screen-dress', 'L · halte en meteen 👕: de kleedkamer blijft, geen show eroverheen', await scherm());
    // een halte, en meteen terug: de sterrenkeuze, zonder fout
    await page.click('#nav-map');
    await page.waitForTimeout(900);
    await page.evaluate(() => {
      document.querySelector('.tour-stop.next').click();
      setTimeout(() => history.back(), 20);
    });
    await page.waitForTimeout(900);
    check(await scherm() === 'screen-profile', 'L · halte en meteen terug: de sterrenkeuze', await scherm());
    // na een show: op de halte tikken waar ze naartoe loopt, opent die als ze er is
    await opKaart();
    await page.evaluate(() => { startLevel(P().level); });
    await page.waitForTimeout(500);
    const naar = await page.evaluate(() => { G.stars = 3; endLevel(true); return P().level; });
    await page.waitForTimeout(1800);
    await page.click('#btn-end-next');
    await page.waitForTimeout(700);
    await page.evaluate(l => document.querySelector(`.tour-stop[data-lvl="${l}"]`).click(), naar);
    await page.waitForTimeout(3000);
    const show = await page.evaluate(() => ({ scherm: document.querySelector('.screen.active').id, lvl: G && G.lvl }));
    check(show.scherm === 'screen-game' && show.lvl === naar,
      'L · haar volgende halte tikken terwijl ze loopt, opent die show als ze er is', JSON.stringify(show));
    // en terug tijdens die wandeling: de sterrenkeuze, zonder fout (Z vangt de fout)
    await page.evaluate(() => { quitGame(); });
    await page.waitForTimeout(600);
    await page.evaluate(() => { startLevel(P().level); });
    await page.waitForTimeout(500);
    await page.evaluate(() => { G.stars = 3; endLevel(true); });
    await page.waitForTimeout(1800);
    await page.click('#btn-end-next');
    await page.waitForTimeout(700);
    await page.evaluate(() => history.back());
    await page.waitForTimeout(2500);
    check(await scherm() === 'screen-profile', 'L · terug tijdens haar wandeling: de sterrenkeuze', await scherm());
    // draaien op de kaart: liggend staat haar halte in beeld
    await opKaart();
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(800);
    const hier = await page.evaluate(() => {
      const r = document.querySelector('.tour-stop.next').getBoundingClientRect();
      return { boven: Math.round(r.top), onder: Math.round(r.bottom), hoog: innerHeight };
    });
    check(hier.boven >= 0 && hier.onder <= hier.hoog, 'L · na draaien naar liggend staat haar halte in beeld', JSON.stringify(hier));
    await ctx.close();
  }

  /* ---- M · Een uitstapje opent waar je komt verbeteren, en zij past liggend ----
     Op een schuivende kaart (liggend, een staande tablet) kwam een eerdere wereld
     bovenaan uit: halte 8 in beeld, halte 1 en 2 eronder. Nu staat de eerste
     halte zonder drie sterren in beeld. En liggend is zij klein genoeg om onder
     de wereldpil te blijven. */
  for (const maat of [{ width: 844, height: 390 }, { width: 768, height: 1024 }]) {
    const { ctx, page } = await fresh(maat);
    await page.evaluate(() => { __speel(3); const q = db.profiles.p1; q.stars[WORLD_START[1]] = 3; save(); selectProfile('p1'); });
    await page.waitForTimeout(900);
    if (maat.height < 500) {
      const kop = await page.evaluate(() => {
        const zij = document.querySelector('#tour-map .tour-hero svg').getBoundingClientRect();
        return { zij: Math.round(zij.height), hoog: innerHeight };
      });
      check(kop.zij < kop.hoog * .45, 'M · liggend is zij minder dan de halve schermhoogte', JSON.stringify(kop));
    }
    await page.evaluate(() => { navigeerNaarWereld(1); });
    await page.waitForTimeout(900);
    const st = await page.evaluate(() => {
      const map = $('tour-map'), nav = $('main-nav').getBoundingClientRect();
      const b = map.querySelectorAll('.tour-stop')[1].getBoundingClientRect();   // halte 1 is perfect, halte 2 niet
      return { boven: Math.round(b.top), onder: Math.round(b.bottom), nav: Math.round(nav.top), uit: map.dataset.uitstap };
    });
    check(st.uit === '1' && st.boven >= 0 && st.onder <= st.nav,
      `M · ${maat.width}x${maat.height}: een eerdere wereld opent op de eerste halte zonder drie sterren`, JSON.stringify(st));
    await ctx.close();
  }

  /* N · De show wacht op je. Antwoord en meteen weg (scherm op slot, andere app):
     op Android loopt de pagina nog door, en dan kwam de volgende som zonder kijker
     en liep zijn spotlicht leeg. Nu blijft de show staan tot de app weer in beeld
     is. "Weg" wordt hier nagebootst: document.hidden en een visibilitychange. */
  {
    const { page, ctx } = await fresh();
    await page.evaluate(() => {
      window.__zicht = 'visible';
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__zicht });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__zicht === 'hidden' });
      window.__weg = w => { window.__zicht = w ? 'hidden' : 'visible'; document.dispatchEvent(new Event('visibilitychange')); };
      selectProfile('p1'); startLevel(P().level);
    });
    await page.waitForTimeout(1200);
    const stand = () => page.evaluate(() => ({ idx: G.idx, spot: Math.round(spotNu()), loopt: !!G.timer }));
    await page.evaluate(() => { submitAnswer(G.qs[G.idx].ans); __weg(true); });
    await page.waitForTimeout(3000);
    const weg = await stand();
    check(weg.idx === 0 && !weg.loopt, 'N · antwoord en weg: de volgende som wacht', JSON.stringify(weg));
    await page.evaluate(() => __weg(false));
    await page.waitForTimeout(600);
    const terug = await stand();
    check(terug.idx === 1 && terug.loopt && terug.spot > 90, 'N · terug: de volgende som komt, met een vol spotlicht', JSON.stringify(terug));
    await ctx.close();
  }

  check(pageErrors.length === 0, 'Z · geen fouten in de pagina', pageErrors.join(' | '));
  await browser.close();
  klaar();
})();
