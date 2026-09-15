/*
 * Test-suite voor de sterren zelf: maken, verwijderen, en wat er gebeurt als er
 * nog géén zijn.
 *
 * De app begint sinds "elke familie maakt haar eigen sterren" met een lege
 * opslag. Dat raakt drie dingen die de andere suites niet aanraken: de lege
 * beginstaat, het maakformulier, en het ouderdeel zonder ster (waar de knop
 * "Back-up terugzetten" zit -- de enige weg voor een familie met een nieuw
 * toestel).
 *
 * Draaien:
 *   npm run test:sterren        (of: npm test voor alle suites)
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

  // Elke zaak begint met een schone opslag; anders lekt de vorige erin.
  async function fresh() {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) pageErrors.push('CONSOLE ' + m.text()); });
    await page.goto(APP_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(250);
    return { ctx, page };
  }

  // Het formulier invullen en verzenden. `settings` is optioneel: een kaartje
  // {'set-max': '100'} klapt de oefening-openklapper open en tikt die chips aan.
  async function makeStar(page, { name, base, hair, dress, track, settings } = {}) {
    await page.click('#btn-newstar');
    await page.waitForTimeout(150);
    // "Wie ben je?" heeft géén voorkeuze en is verplicht: zonder deze tik blijft
    // de Klaar-knop uit en zou elke zaak hieronder stilletjes op niets uitlopen.
    await page.click(`#newstar-base .chip[data-v="${base || 'meisje'}"]`);
    if (hair)  await page.click(`#newstar-hair  .chip[data-v="${hair}"]`);
    if (dress) await page.click(`#newstar-dress .chip[data-v="${dress}"]`);
    if (track) await page.click(`#newstar-track .chip[data-v="${track}"]`);
    if (settings) {
      await page.click('#newstar-oefen summary');
      await page.waitForTimeout(120);
      for (const [id, v] of Object.entries(settings)) {
        await page.click(`#ns-${id} .chip[data-v="${v}"]`);
        await page.waitForTimeout(120);
      }
    }
    await page.fill('#newstar-name', name);
    await page.click('#newstar-go');
    await page.waitForTimeout(250);
  }

  /* ================= 1 · Verse installatie is leeg ================= */
  {
    const { ctx, page } = await fresh();
    const r = await page.evaluate(() => ({
      n: Object.keys(db.profiles).length,
      cards: document.querySelectorAll('.profile-card').length,
      sub: document.getElementById('profile-subtitle').textContent,
      addLabel: document.getElementById('btn-newstar').textContent,
      hintShown: getComputedStyle(document.getElementById('restore-hint')).display !== 'none',
      stored: localStorage.getItem('rekenPopsterren_v1'),
    }));
    check(r.n === 0, 'verse installatie heeft nul sterren', `n=${r.n}`);
    check(r.cards === 0, 'verse installatie toont geen kaarten', `cards=${r.cards}`);
    check(/Welkom/.test(r.sub), 'verse installatie verwelkomt', r.sub);
    check(/eerste ster/.test(r.addLabel), 'de knop noemt de eerste ster', r.addLabel);
    check(r.hintShown, 'de back-up-hint staat er bij nul sterren', 'verborgen');
    check(r.stored === null, 'een verse start schrijft nog niets weg', `stored=${r.stored && r.stored.slice(0, 40)}`);
    await ctx.close();
  }

  /* ================= 2 · Ster maken, met een lastige naam ================= */
  {
    const { ctx, page } = await fresh();
    await makeStar(page, { name: 'A"<b>x', hair: 'hair_bruin', dress: 'dress_blauw', track: 'count' });
    const r = await page.evaluate(() => {
      const k = Object.keys(db.profiles)[0];
      const p = db.profiles[k];
      openSettings(); setTab = 'beheer'; renderSettings();
      return {
        key: k, n: Object.keys(db.profiles).length,
        name: p.name, base: p.base, hair: p.equipped.hair, dress: p.equipped.dress,
        startHair: p.startHair, startDress: p.startDress,
        order: p.order, track: p.settings.track, perLevel: p.settings.perLevel,
        stageMax: p.settings.stageMax,
        bought: p.owned.length - p.freebies,
        cardText: document.querySelector('.pname') ? document.querySelector('.pname').textContent : null,
        boldInCard: !!document.querySelector('.pname b'),
        fieldValue: document.getElementById('set-name').value,
        sub: document.getElementById('profile-subtitle').textContent,
      };
    });
    check(r.n === 1 && r.key === 'p1', 'eerste ster krijgt sleutel p1', `${r.key} n=${r.n}`);
    check(r.name === 'A"<b>x', 'de naam wordt letterlijk bewaard', r.name);
    check(r.cardText === 'A"<b>x', 'de kaart toont de naam letterlijk', String(r.cardText));
    check(!r.boldInCard, 'html in een naam wordt geen echte opmaak', 'er staat een <b> in de kaart');
    check(r.fieldValue === 'A"<b>x', 'het naamveld geeft de hele naam terug', r.fieldValue);
    check(r.hair === 'hair_bruin' && r.dress === 'dress_blauw', 'gekozen haar en kleren worden gedragen', `${r.hair}/${r.dress}`);
    check(r.base === 'meisje', 'de gekozen basisfiguur wordt bewaard', String(r.base));
    check(r.startHair === 'hair_bruin' && r.startDress === 'dress_blauw', 'de startlook wordt vastgelegd', `${r.startHair}/${r.startDress}`);
    check(r.order === 0, 'de eerste ster staat vooraan', `order=${r.order}`);
    check(r.track === 'count' && r.perLevel === 5 && r.stageMax === 11, 'telmodus krijgt de hele telvoorinstelling', JSON.stringify(r));
    check(r.bought === 0, 'gratis startspullen tellen niet als gekocht', `bought=${r.bought}`);
    // Zodra er een ster staat spreekt het scherm voor zich en verdwijnt de
    // ondertitel; het welkom hoort alleen bij een leeg scherm.
    check(r.sub === '', 'met een ster erbij verdwijnt de ondertitel', JSON.stringify(r.sub));
    await ctx.close();
  }

  /* ================= 3 · Volgorde, sleutels en het maximum ================= */
  {
    const { ctx, page } = await fresh();
    for (let i = 1; i <= 6; i++) await makeStar(page, { name: 'Ster' + i });
    let r = await page.evaluate(() => ({
      keys: profileKeys(), orders: profileKeys().map(k => db.profiles[k].order),
      addHidden: getComputedStyle(document.getElementById('btn-newstar')).display === 'none',
      cards: document.querySelectorAll('.profile-card').length,
      rowClass: document.querySelector('.profile-row').className,
    }));
    check(r.keys.join(',') === 'p1,p2,p3,p4,p5,p6', 'sleutels lopen netjes op', r.keys.join(','));
    check(r.orders.join(',') === '0,1,2,3,4,5', 'volgorde loopt netjes op', r.orders.join(','));
    check(r.addHidden, 'bij zes sterren verdwijnt de knop', 'knop staat er nog');
    check(/many/.test(r.rowClass) && /many-6/.test(r.rowClass), 'zes kaarten gaan in het raster', r.rowClass);
    // een zevende mag ook niet via de code zelf
    r = await page.evaluate(() => { openNewStar('profile'); return document.querySelector('.screen.active').id; });
    check(r === 'screen-profile', 'het maakscherm opent niet meer boven het maximum', r);
    await ctx.close();
  }

  /* ================= 4 · Dubbele naam wordt geweigerd ================= */
  {
    const { ctx, page } = await fresh();
    await makeStar(page, { name: 'Emma' });
    await page.click('#btn-newstar');
    await page.waitForTimeout(150);
    await page.click('#newstar-base .chip[data-v="meisje"]');
    await page.fill('#newstar-name', 'emma');
    await page.click('#newstar-go');
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => ({
      n: Object.keys(db.profiles).length,
      screen: document.querySelector('.screen.active').id,
    }));
    check(r.n === 1, 'dezelfde naam levert geen tweede ster op', `n=${r.n}`);
    check(r.screen === 'screen-newstar', 'het formulier blijft open na een dubbele naam', r.screen);
    await ctx.close();
  }

  /* ================= 5 · Ouderdeel zonder sterren ================= */
  /* Dit is de zaak die telt: een familie met een nieuw toestel heeft nul sterren
     en moet juist dan bij "Back-up terugzetten" kunnen. */
  {
    const { ctx, page } = await fresh();
    const r = await page.evaluate(() => {
      openSettings();
      return {
        screen: document.querySelector('.screen.active').id,
        hasImport: !!document.getElementById('set-import'),
        hasExport: !!document.getElementById('set-export'),
        hasNewStar: !!document.getElementById('set-newstar'),
        whoHidden: getComputedStyle(document.getElementById('settings-profiles')).display === 'none',
        tabsHidden: getComputedStyle(document.getElementById('settings-subtabs')).display === 'none',
        hasName: !!document.getElementById('set-name'),
        hasReset: !!document.getElementById('set-reset'),
      };
    });
    check(r.screen === 'screen-settings', 'het ouderdeel opent zonder sterren', r.screen);
    check(r.hasImport && r.hasExport, 'back-up terugzetten is bereikbaar zonder ster', JSON.stringify(r));
    check(r.hasNewStar, 'een ster maken kan ook vanuit Beheer', 'knop ontbreekt');
    check(r.whoHidden && r.tabsHidden, 'de twee keuzerijen verdwijnen als er niets te kiezen is', JSON.stringify(r));
    check(!r.hasName && !r.hasReset, 'zonder ster geen naamveld en geen wisknop', JSON.stringify(r));
    await ctx.close();
  }

  /* ================= 6 · Verwijderen ================= */
  {
    const { ctx, page } = await fresh();
    for (const n of ['Een', 'Twee', 'Drie']) await makeStar(page, { name: n });
    // de middelste weg
    await page.evaluate(() => { openSettings(); setKey = 'p2'; setTab = 'beheer'; renderSettings(); });
    await page.waitForTimeout(150);
    await page.click('#set-danger-del summary');   // net als een ouder: eerst openklappen
    await page.waitForTimeout(150);
    await page.click('#set-delete');
    await page.waitForTimeout(150);
    const asked = await page.isVisible('#confirm-modal');
    await page.click('#confirm-yes');
    await page.waitForTimeout(250);
    let r = await page.evaluate(() => ({
      keys: profileKeys(), names: profileKeys().map(k => db.profiles[k].name),
      setKey: setKey, cur: cur, nextKey: nextProfileKey(),
    }));
    check(asked, 'verwijderen vraagt eerst om bevestiging', 'geen venster');
    check(r.names.join(',') === 'Een,Drie', 'alleen de gekozen ster verdwijnt', r.names.join(','));
    check(r.setKey === 'p1' && !r.cur, 'de selectie blijft niet op een verdwenen ster staan', `${r.setKey}/${r.cur}`);
    check(r.nextKey === 'p2', 'het gat in de sleutels wordt hergebruikt', r.nextKey);
    // en nu alles weg
    for (const k of ['p1', 'p3']) {
      await page.evaluate(key => { openSettings(); setKey = key; setTab = 'beheer'; renderSettings(); }, k);
      await page.waitForTimeout(120);
      await page.click('#set-danger-del summary');
      await page.waitForTimeout(120);
      await page.click('#set-delete');
      await page.waitForTimeout(120);
      await page.click('#confirm-yes');
      await page.waitForTimeout(250);
    }
    r = await page.evaluate(() => ({
      n: Object.keys(db.profiles).length,
      screen: document.querySelector('.screen.active').id,
      sub: document.getElementById('profile-subtitle').textContent,
    }));
    check(r.n === 0, 'de laatste ster mag ook weg', `n=${r.n}`);
    check(r.screen === 'screen-profile', 'na de laatste ster sta je op het welkomscherm', r.screen);
    check(/Welkom/.test(r.sub), 'het welkom komt terug', r.sub);
    // en het ouderdeel doet het daarna nog steeds
    r = await page.evaluate(() => { openSettings(); return !!document.getElementById('set-import'); });
    check(r, 'het ouderdeel werkt nog na het verwijderen van alles', 'geen back-up-knop');
    await ctx.close();
  }

  /* ================= 7 · Terug-navigatie ================= */
  {
    const { ctx, page } = await fresh();
    await page.click('#btn-newstar');
    await page.waitForTimeout(200);
    await page.goBack();
    await page.waitForTimeout(300);
    let r = await page.evaluate(() => ({ screen: document.querySelector('.screen.active') ? document.querySelector('.screen.active').id : null, here: typeof db !== 'undefined', url: location.pathname.endsWith('index.html') }));
    check(r.here && r.url && r.screen === 'screen-profile', 'Android-terug sluit het maakscherm i.p.v. de app', JSON.stringify(r));
    // Escape doet hetzelfde
    await page.click('#btn-newstar');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    r = await page.evaluate(() => document.querySelector('.screen.active').id);
    check(r === 'screen-profile', 'Escape sluit het maakscherm', r);
    await ctx.close();
  }

  /* ================= 7b · Werelden: indeling, staart en de ronde-klok =================
   * Een wereld is puur een hergroepering van p.level. Twee dingen moeten hier
   * vastliggen: dat de grenzen kloppen en nooit undefined opleveren, en -- het
   * belangrijkste -- dat tourRound() NIET met de wereldindeling meebeweegt.
   * Die klok bepaalt wanneer zoek-het-getal (ronde 3) en drie-getallen (ronde 4)
   * mogen verschijnen; een wereld van 8 i.p.v. een ronde van 12 zou ze acht
   * shows te vroeg laten beginnen. */
  {
    const { ctx, page } = await fresh();
    const r = await page.evaluate(() => {
      const naam = l => { const w = worldFor(l); return w.world.name + ' ' + w.nr + '/' + w.levels; };
      return {
        grenzen: [1, 8, 9, 16, 17, 48].map(naam),
        /* Wat hier vastligt is de rekensom, niet wélke werelden er staan: de namen
           en de volgorde zijn van jou en mogen wijzigen zonder dat er een test
           omvalt. Daarom komt de verwachting uit WORLDS zelf, langs een ánder
           pad dan worldFor() -- die twee moeten hetzelfde zeggen. */
        grenzenVerwacht: [1, 8, 9, 16, 17, 48].map(l => {
          const w = WORLDS[Math.floor((l - 1) / 8)];
          return w.name + ' ' + ((l - 1) % 8 + 1) + '/8';
        }),
        staart: [49, 57, 100].map(naam),
        altijdIets: [0, -5, null, undefined, NaN].every(l => { const w = worldFor(l); return w && w.world && w.nr >= 1; }),
        rondes: [1, 12, 13, 24, 25, 36, 37].map(tourRound),
        eersteLevels: WORLDS.map((w, i) => WORLD_START[i]),
      };
    });
    check(r.grenzen.join(' | ') === r.grenzenVerwacht.join(' | '),
      'de wereldgrenzen liggen op de achtvouden',
      r.grenzen.join(' | ') + '  !=  ' + r.grenzenVerwacht.join(' | '));
    check(/^Sterrentournee 1\/8/.test(r.staart[0]) && /^Sterrentournee 2 1\/8/.test(r.staart[1]),
      'voorbij de laatste wereld loopt de tournee door', r.staart.join(' | '));
    check(r.altijdIets, 'een raar level geeft nooit undefined terug', JSON.stringify(r.staart));
    check(r.rondes.join(',') === '1,1,2,2,3,3,4',
      'de ronde-klok blijft op twaalf staan, niet op acht', r.rondes.join(','));
    check(r.eersteLevels.join(',') === '1,9,17,25,33,41',
      'elke wereld begint waar de vorige ophoudt', r.eersteLevels.join(','));
    await ctx.close();
  }

  /* ================= 7c · De weg ligt op de haltes =================
   * De haltes staan in procenten van het káder; de weg staat in viewBox-eenheden
   * van een SVG. Die twee vallen alleen samen als de viewBox dezelfde verhouding
   * heeft als de tekening -- en die aanname was ooit stil en fout: de viewBox stond
   * op 1080x1840 terwijl het kader 1:2 was, en een SVG schaalt zijn viewBox met
   * preserveAspectRatio="xMidYMid meet". De weg werd daardoor in het midden
   * samengeknepen en lag tot 42px naast de haltes op een telefoon, 77px op een
   * tablet -- het ergst bij de eerste en de laatste.
   *
   * Deze test meet de geéchte afbeelding (getScreenCTM), niet de padgegevens: die
   * gingen ook in de kapotte versie keurig door de haltes heen.                  */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => {
      const p = defaultProfile('Roos', 'dress_roze');
      p.level = 6;
      localStorage.setItem('rekenPopsterren_v1',
        JSON.stringify({ sound: true, haptics: true, schemaV: 3, profiles: { p1: p } }));
    });
    await page.reload();
    await page.waitForTimeout(300);
    await page.evaluate(() => selectProfile('p1'));
    await page.waitForTimeout(500);

    const r = await page.evaluate(() => {
      const svg = document.querySelector('.tour-road-svg');
      if (!svg) return { fout: 'geen weg getekend' };
      const bg = svg.querySelector('.tour-road-bg');
      const M = svg.getScreenCTM();
      const L = bg.getTotalLength();
      const weg = [];
      for (let i = 0; i <= 1500; i++) {
        const q = bg.getPointAtLength(L * i / 1500);
        weg.push({ x: M.a * q.x + M.e, y: M.d * q.y + M.f });
      }
      let ergste = 0;
      document.querySelectorAll('.tour-stop .dot').forEach(d => {
        const b = d.getBoundingClientRect();
        const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        let best = 1e9;
        weg.forEach(q => { const dd = Math.hypot(q.x - cx, q.y - cy); if (dd < best) best = dd; });
        if (best > ergste) ergste = best;
      });
      const cs = getComputedStyle(document.getElementById('tour-map'));
      return {
        ergste: Math.round(ergste),
        haltes: document.querySelectorAll('.tour-stop').length,
        vbW: VB_W, vbH: VB_H, artW: ART_W, artH: ART_H,
        /* De zone is opgemeten over acht toestellen (zie ZONE). De standaardslinger
           hoort er per definitie in te passen -- toen de kop doorzichtig werd en de
           ster kleiner, verschoven de randen en viel hij er stil buiten. */
        ...(() => {
          const n = defaultNodes(8);
          const uit = n.map((q, i) => (q.x < ZONE.x0 || q.x > ZONE.x1 || q.y < ZONE.y0 || q.y > ZONE.y1)
            ? (i + 1) + ':' + q.x.toFixed(1) + ',' + q.y.toFixed(1) : null).filter(Boolean);
          return { zoneOk: uit.length === 0, zoneUit: uit.join(' ') || 'x ' + ZONE.x0 + '-' + ZONE.x1 + ' y ' + ZONE.y0 + '-' + ZONE.y1 };
        })(),
        cssW: Number(cs.getPropertyValue('--art-w')), cssH: Number(cs.getPropertyValue('--art-h')),
      };
    });
    check(r.haltes === 8, 'de kaart tekent acht haltes', JSON.stringify(r));
    check(r.ergste <= 2, 'de weg loopt door het hart van elke halte', 'ergste afwijking ' + r.ergste + 'px');
    check(r.zoneOk, 'de standaardslinger blijft binnen de veilige zone', r.zoneUit);
    check(r.vbW === r.artW && r.vbH === r.artH,
      'de viewBox van de weg heeft de maat van de tekening', r.vbW + 'x' + r.vbH + ' vs ' + r.artW + 'x' + r.artH);
    check(r.cssW === r.artW && r.cssH === r.artH,
      'de CSS-terugval voor de tekeningmaat loopt niet uit de pas', r.cssW + 'x' + r.cssH);
    const scene = require('./scene.js');
    check(scene.SLOTS.world.lever[0] === r.artW && scene.SLOTS.world.lever[1] === r.artH,
      'de studio levert de tekening op de maat die de kaart verwacht',
      scene.SLOTS.world.lever.join('x') + ' vs ' + r.artW + 'x' + r.artH);
    await ctx.close();
  }

  /* ========== 7c-bis · De bovenrand van de veilige zone klopt per toestel ==========
   * ZONE.y0 ging van 23 naar 14 omdat de bovenbalk opzij stapt zodra de ster ertegen
   * aan staat. Daarmee hangt die 14 aan drie dingen die los van elkaar kunnen
   * schuiven: de hoogte van de kop (vaste px, dus op een kort scherm een grotere hap),
   * de maat van de stip, en de lengte van de ster. Verandert er één, dan klopt het
   * getal stil niet meer -- en dat merk je pas aan een halte die je niet kunt
   * aanraken.
   *
   * Wat hier gemeten wordt, op een halte die exact op ZONE.y0 staat:
   *   - de stip valt helemaal onder de kop (anders pakt de kop de tik af)
   *   - haar kruin blijft op het scherm
   *   - de kop dimt daar wél, en op ZONE.y0kop niet meer
   *   - de wereldpil blijft aanraakbaar terwijl de kop gedimd is (dat is de hele
   *     reden dat er gedimd wordt en niet weggeschoven -- de ladder moet bereikbaar
   *     blijven vanaf de bovenste halte)                                         */
  {
    const toestellen = [
      ['kleine telefoon', 320, 568],   // zet de grens: vaste kop op het kortste scherm
      ['iPhone SE', 375, 667],
      ['iPhone 14', 390, 844],
      ['21:9', 412, 961],
      ['tablet staand', 768, 1024],
    ];
    for (const [naam, w, h] of toestellen) {
      const c = await browser.newContext({ viewport: { width: w, height: h } });
      await cacheFonts(c);
      const page = await c.newPage();
      page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
      await page.goto(APP_URL + '&demo&star=p1&screen=map');
      await page.waitForTimeout(400);

      const r = await page.evaluate(async () => {
        const stop = document.querySelector('.tour-hero').closest('.tour-stop');
        const scherm = document.getElementById('screen-map');
        const meet = async y => {
          stop.style.top = y + '%';
          /* Schuif de halte in beeld zoals renderTourMap dat na élke opbouw doet.
             Zonder dit meet je een tablet met scrollTop 0 terwijl het kader daar
             1365px hoog is in een venster van 1024: de bovenrand ligt dan buiten
             beeld en haar kruin lijkt eraf te vallen, terwijl de app er in
             werkelijkheid naartoe geschoven heeft. Op een toestel waar niets
             schuift doet deze regel niets -- en dát is precies het geval waarin de
             controle hieronder iets moet garanderen. */
          const map = document.getElementById('tour-map');
          const f = document.querySelector('.world-frame').getBoundingClientRect();
          if (map.scrollHeight > map.clientHeight + 4) {
            map.scrollTop = Math.max(0, stop.getBoundingClientRect().top - f.top - map.clientHeight / 2);
          }
          kopOpzij();
          await new Promise(res => setTimeout(res, 400));   // de dim-overgang uitlopen
          const kop = document.querySelector('#screen-map .screen-header').getBoundingClientRect();
          const hero = document.querySelector('.tour-hero').getBoundingClientRect();
          const dot = stop.querySelector('.dot').getBoundingClientRect();
          const pr = document.querySelector('#screen-map .world-pick').getBoundingClientRect();
          const raak = document.elementFromPoint(pr.left + pr.width / 2, pr.top + pr.height / 2);
          return {
            dimt: scherm.classList.contains('ster-bij-kop'),
            stipMarge: Math.round(dot.top - kop.bottom),
            kruinMarge: Math.round(hero.top),
            pilRaakbaar: !!(raak && raak.closest('.world-pick')),
          };
        };
        return { boven: await meet(ZONE.y0), kopvrij: await meet(ZONE.y0kop), y0: ZONE.y0, y0kop: ZONE.y0kop };
      });

      check(r.boven.stipMarge >= 0, 'op ZONE.y0 valt de stip onder de kop — ' + naam,
        r.boven.stipMarge + 'px (negatief = de kop pakt de tik af)');
      check(r.boven.kruinMarge >= 0, 'op ZONE.y0 blijft haar kruin op het scherm — ' + naam,
        r.boven.kruinMarge + 'px');
      check(r.boven.dimt, 'op ZONE.y0 stapt de kop opzij — ' + naam, JSON.stringify(r.boven));
      check(r.boven.pilRaakbaar, 'de wereldpil blijft aanraakbaar met een gedimde kop — ' + naam,
        JSON.stringify(r.boven));
      check(!r.kopvrij.dimt, 'op ZONE.y0kop (' + r.y0kop + '%) dimt de kop niet meer — ' + naam,
        JSON.stringify(r.kopvrij));
      await c.close();
    }
  }

  /* ========== 7e · Raakvlakken overlappen niet ==========
   * Het onzichtbare raakvlak rond een halte is groter dan het medaillon zelf, en dat
   * is met opzet: op de kleinste telefoon is het medaillon maar 33px. Maar het mag
   * niet zó groot worden dat twee raakvlakken elkaar raken -- dan tikt een kind de
   * verkeerde halte aan, en dat merk je niet aan iets dat kapot gaat.
   *
   * De bovengrens is de afstand tussen de twee dichtstbijzijnde haltes, en die komt
   * uit de standaardslinger. Verandert die slinger (of de maat van het raakvlak),
   * dan valt deze test om in plaats van dat een vijfjarige het ontdekt.            */
  {
    for (const [naam, w, h] of [['kleine telefoon', 320, 568], ['iPhone 14', 390, 844],
                                ['tablet staand', 768, 1024]]) {
      const c = await browser.newContext({ viewport: { width: w, height: h } });
      await cacheFonts(c);
      const page = await c.newPage();
      page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
      await page.goto(APP_URL + '&demo&star=p1&screen=map');
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => {
        const mid = [...document.querySelectorAll('.tour-stop .dot')].map(d => {
          const b = d.getBoundingClientRect();
          return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
        });
        let kleinste = Infinity;
        for (let i = 0; i < mid.length; i++) for (let j = i + 1; j < mid.length; j++) {
          kleinste = Math.min(kleinste, Math.hypot(mid[i].x - mid[j].x, mid[i].y - mid[j].y));
        }
        // de maat van het raakvlak staat in cqw van het kader (zie .tour-stop::before)
        const frame = document.querySelector('.world-frame').getBoundingClientRect();
        const raak = 0.135 * frame.width;
        return { kleinste: Math.round(kleinste), raak: Math.round(raak) };
      });
      check(r.raak < r.kleinste, 'raakvlakken van twee haltes overlappen niet — ' + naam,
        'raakvlak ' + r.raak + 'px, dichtste haltes ' + r.kleinste + 'px uit elkaar');
      check(r.raak >= 40, 'het raakvlak blijft groot genoeg voor een kindervinger — ' + naam,
        r.raak + 'px');
      await c.close();
    }
  }

  /* ================= 7d · Wereldbadges =================
   * Eén badge per wereld, en het is gewoon een trofee -- geen tweede badgesysteem.
   * Wat hier vast moet liggen: dat de plank meegroeit met WORLDS, dat een wereld
   * uitspelen de badge kláárlegt (het kind opent hem zelf), en dat de ster-stand
   * alleen aangaat bij drie sterren op élke show -- één badge, twee standen.     */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => {
      const q = defaultProfile('Roos', 'dress_roze');
      localStorage.setItem('rekenPopsterren_v1',
        JSON.stringify({ sound: true, haptics: true, schemaV: 3, profiles: { p1: q } }));
    });
    await page.reload();
    await page.waitForTimeout(300);
    await page.evaluate(() => selectProfile('p1'));
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const plank = TROPHY_SHELVES.filter(sh => sh.name.indexOf('Werelden') >= 0)[0];
      const q = P();
      // wereld 1 uit, maar met twee sterren per show
      for (let l = 1; l <= 8; l++) q.stars[l] = 2;
      q.level = 9;
      const klaar = checkTrophies(q).map(t => t.id);
      const badge = TROPHIES.filter(t => t.id === 'wereld-' + WORLDS[0].id)[0];
      const tweeSterren = badge.ster(q);
      for (let l = 1; l <= 8; l++) q.stars[l] = 3;
      return {
        plankNaam: plank.name,
        perWereld: plank.ids.length === WORLDS.length,
        ids: plank.ids.join(','),
        allemaalInTabel: plank.ids.every(id => TROPHIES.some(t => t.id === id)),
        klaargelegd: klaar.indexOf('wereld-' + WORLDS[0].id) >= 0,
        tweeSterren,
        drieSterren: badge.ster(q),
        tweedeNogNiet: TROPHIES.filter(t => t.id === 'wereld-' + WORLDS[1].id)[0].has(q),
      };
    });
    check(r.perWereld, 'er is precies één wereldbadge per wereld', r.ids);
    check(r.allemaalInTabel, 'elke wereldbadge staat ook in de trofeetabel', r.ids);
    check(r.klaargelegd, 'een wereld uitspelen legt zijn badge klaar', r.ids);
    check(r.tweeSterren === false && r.drieSterren === true,
      'de ster-stand gaat pas aan bij drie sterren op elke show',
      'twee: ' + r.tweeSterren + ' drie: ' + r.drieSterren);
    check(r.tweedeNogNiet === false, 'de badge van de volgende wereld blijft dicht', String(r.tweedeNogNiet));
    await ctx.close();
  }

  /* ================= 8 · Oude opslag: precies één keer ophalen ================= */
  {
    const { ctx, page } = await fresh();
    // een save van vóór Clara: alleen Marie en Anna, geen schemaV
    await page.evaluate(() => {
      const mk = (naam, jurk) => {
        const p = defaultProfile(naam, jurk);
        delete p.order; delete p.startHair; delete p.startDress;
        return p;
      };
      localStorage.setItem('rekenPopsterren_v1', JSON.stringify({
        sound: true, haptics: true, profiles: { p1: mk('Marie', 'dress_roze'), p2: mk('Anna', 'dress_paars') }
      }));
    });
    await page.reload();
    await page.waitForTimeout(250);
    let r = await page.evaluate(() => ({
      names: profileKeys().map(k => db.profiles[k].name), schemaV: db.schemaV,
    }));
    check(r.names.join(',') === 'Clara,Anna,Marie', 'een oude save krijgt Clara terug, in de juiste volgorde', r.names.join(','));
    check(r.schemaV === 2, 'de ophaalslag wordt gestempeld', String(r.schemaV));
    // nu Clara verwijderen en herladen: ze mag niet terugkomen
    await page.evaluate(() => {
      const k = profileKeys().find(k => db.profiles[k].name === 'Clara');
      delete db.profiles[k];
      save();
    });
    await page.reload();
    await page.waitForTimeout(250);
    r = await page.evaluate(() => profileKeys().map(k => db.profiles[k].name));
    check(!r.includes('Clara'), 'een verwijderde ster blijft weg na herladen', r.join(','));
    await ctx.close();
  }

  /* ================= 9 · Import ================= */
  {
    const { ctx, page } = await fresh();
    await makeStar(page, { name: 'Blijft' });
    // een beschadigd bestand mag de db niet aanraken
    let r = await page.evaluate(async () => {
      const before = JSON.stringify(db);
      const bad = new File([JSON.stringify({ profiles: { x: { name: 'kapot' } } })], 'b.json', { type: 'application/json' });
      importData(bad);
      await new Promise(r => setTimeout(r, 300));
      return { unchanged: JSON.stringify(db) === before, notice: document.getElementById('confirm-title').textContent };
    });
    check(r.unchanged, 'een ongeldig back-upbestand laat de sterren met rust', 'db is veranderd');
    check(/Oeps/.test(r.notice), 'een ongeldig bestand meldt zich', r.notice);
    // een lege back-up is geldig
    r = await page.evaluate(async () => {
      document.getElementById('confirm-modal').classList.remove('open');
      const empty = new File([JSON.stringify({ sound: true, haptics: true, schemaV: 2, profiles: {} })], 'e.json', { type: 'application/json' });
      importData(empty);
      await new Promise(r => setTimeout(r, 250));
      const asked = document.getElementById('confirm-modal').classList.contains('open');
      const yes = document.getElementById('confirm-yes');
      if (yes) yes.click();
      await new Promise(r => setTimeout(r, 250));
      return { asked, n: Object.keys(db.profiles).length, setKey: setKey };
    });
    check(r.asked, 'een lege back-up wordt geaccepteerd', 'geweigerd');
    check(r.n === 0 && r.setKey === null, 'na een lege back-up is er niets geselecteerd', JSON.stringify(r));
    await ctx.close();
  }

  /* ================= 10 · Opnieuw beginnen houdt de identiteit ================= */
  {
    const { ctx, page } = await fresh();
    await makeStar(page, { name: 'Bruin', base: 'jongen', hair: 'hair_bruin', dress: 'dress_groen' });
    const r = await page.evaluate(async () => {
      const k = profileKeys()[0];
      db.profiles[k].diamonds = 999;
      db.profiles[k].equipped.hair = 'hair_regenboog';   // iets anders aangetrokken
      openSettings(); setKey = k; setTab = 'beheer'; renderSettings();
      document.getElementById('set-reset').click();
      await new Promise(r => setTimeout(r, 200));
      document.getElementById('confirm-yes').click();
      await new Promise(r => setTimeout(r, 200));
      const p = db.profiles[k];
      return { hair: p.equipped.hair, dress: p.equipped.dress, diamonds: p.diamonds, name: p.name, base: p.base };
    });
    check(r.hair === 'hair_bruin', 'opnieuw beginnen geeft het eigen haar terug, niet blond', r.hair);
    check(r.dress === 'dress_groen', 'opnieuw beginnen geeft de eigen kleren terug', r.dress);
    check(r.base === 'jongen', 'opnieuw beginnen houdt de basisfiguur vast', String(r.base));
    check(r.diamonds === 30 && r.name === 'Bruin', 'de voortgang gaat wél weg, de naam blijft', JSON.stringify(r));
    await ctx.close();
  }

  /* ===== 10 · De oefening-openklapper op het maakformulier =====
     Het formulier vroeg alleen naam/haar/kleren/modus; al het andere viel
     stilletjes op de standaard. Nu staat de hele Oefenen-set eronder, dicht,
     met een regel die zegt wát er nu ingesteld staat. Dat mag de snelle weg
     (openklapper niet aanraken) op geen enkele manier veranderen. */

  // 10a · dicht bij het openen, en de samenvatting zegt iets
  {
    const { ctx, page } = await fresh();
    await page.click('#btn-newstar');
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => ({
      open: document.getElementById('newstar-oefen').hasAttribute('open'),
      val: document.querySelector('#newstar-oefen .sr-val').textContent,
    }));
    check(r.open === false, 'de openklapper begint dicht', `open=${r.open}`);
    check(r.val === '➕ ➖ · tot 20 · kiezen uit 4 · 8 vragen', 'de dichte openklapper vertelt de standaard', r.val);
    await ctx.close();
  }

  // 10b · de snelle weg levert exact hetzelfde profiel als hiervoor
  {
    const { ctx, page } = await fresh();
    await makeStar(page, { name: 'Reken' });
    await makeStar(page, { name: 'Tel', track: 'count' });
    const r = await page.evaluate(() => {
      const byName = n => Object.values(db.profiles).find(p => p.name === n).settings;
      return { math: byName('Reken'), count: byName('Tel') };
    });
    const mathWant = { ops: ['+', '-'], max: 20, tables: [2, 5, 10], mode: 'kies', perLevel: 8,
      missNum: true, chain3: true, track: 'math', stage: 1, stageMax: 11, repr: 'objects',
      numerals: true, qmax: 10, memory: true };
    const countWant = { ...mathWant, track: 'count', perLevel: 5 };
    check(JSON.stringify(r.math) === JSON.stringify(mathWant),
      'zonder de openklapper aan te raken blijft de rekenster ongewijzigd', JSON.stringify(r.math));
    check(JSON.stringify(r.count) === JSON.stringify(countWant),
      'zonder de openklapper aan te raken blijft de telster ongewijzigd', JSON.stringify(r.count));
    await ctx.close();
  }

  // 10c · wat een ouder vooraf instelt, komt ook echt in het profiel
  {
    const { ctx, page } = await fresh();
    await makeStar(page, { name: 'Maal', settings: { 'set-ops': 'x', 'set-max': '100' } });
    const s = await page.evaluate(() => Object.values(db.profiles)[0].settings);
    check(s.ops.includes('x'), 'een vooraf gekozen bewerking landt in het profiel', JSON.stringify(s.ops));
    check(s.max === 100, 'een vooraf gekozen bereik landt in het profiel', `max=${s.max}`);
    await ctx.close();
  }

  // 10d · het paneel overleeft zijn eigen hertekening (elke tik bouwt het opnieuw op)
  {
    const { ctx, page } = await fresh();
    await page.click('#btn-newstar');
    await page.waitForTimeout(150);
    await page.click('#newstar-oefen summary');
    await page.waitForTimeout(120);
    await page.click('#ns-set-max .chip[data-v="100"]');
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => ({
      open: document.getElementById('newstar-oefen').hasAttribute('open'),
      val: document.querySelector('#newstar-oefen .sr-val').textContent,
    }));
    check(r.open === true, 'de openklapper blijft open na een tik erin', `open=${r.open}`);
    check(/tot 100/.test(r.val), 'de samenvatting loopt mee met de keuze', r.val);
    await ctx.close();
  }

  // 10e · van modus wisselen wisselt ook de velden eronder
  {
    const { ctx, page } = await fresh();
    await page.click('#btn-newstar');
    await page.waitForTimeout(150);
    await page.click('#newstar-oefen summary');
    await page.waitForTimeout(120);
    await page.click('#newstar-track .chip[data-v="count"]');
    await page.waitForTimeout(150);
    const velden = await page.evaluate(() => ({
      stage: !!document.getElementById('ns-set-stage'),
      ops: !!document.getElementById('ns-set-ops'),
      val: document.querySelector('#newstar-oefen .sr-val').textContent,
    }));
    check(velden.stage && !velden.ops, 'de telmodus toont fases in plaats van bewerkingen', JSON.stringify(velden));
    check(/^fase 1–11/.test(velden.val), 'de samenvatting schakelt mee naar de telmodus', velden.val);
    await page.click('#ns-set-stage .chip[data-v="3"]');
    await page.waitForTimeout(150);
    await page.click('#newstar-base .chip[data-v="jongen"]');
    await page.fill('#newstar-name', 'Fase');
    await page.click('#newstar-go');
    await page.waitForTimeout(250);
    const p = await page.evaluate(() => Object.values(db.profiles)[0]);
    check(p.settings.stage === 3, 'een vooraf gekozen startfase landt in de instellingen', `stage=${p.settings.stage}`);
    check(p.countTrack.stage === 3, 'de live-stand begint op diezelfde fase', `countTrack=${p.countTrack.stage}`);
    await ctx.close();
  }

  // 10f · de twee schermen staan tegelijk in de DOM: hun velden mogen elkaar niet raken
  {
    const { ctx, page } = await fresh();
    await makeStar(page, { name: 'Zus' });
    const r = await page.evaluate(async () => {
      const k = Object.keys(db.profiles)[0];
      openSettings(); setKey = k; setTab = 'oefenen'; renderSettings();
      await new Promise(r => setTimeout(r, 150));
      openNewStar('settings');
      await new Promise(r => setTimeout(r, 150));
      document.querySelector('#newstar-oefen summary').click();
      await new Promise(r => setTimeout(r, 150));
      document.querySelector('#ns-set-max .chip[data-v="100"]').click();
      await new Promise(r => setTimeout(r, 150));
      return { zus: db.profiles[k].settings.max, concept: newStar.settings.max };
    });
    check(r.zus === 20, 'een tik op het maakformulier laat de bestaande ster met rust', `max=${r.zus}`);
    check(r.concept === 100, 'diezelfde tik komt wél in het concept terecht', `max=${r.concept}`);
    await ctx.close();
  }

  // 10g · "kies er minstens 1" geldt ook hier
  {
    const { ctx, page } = await fresh();
    await page.click('#btn-newstar');
    await page.waitForTimeout(150);
    await page.click('#newstar-oefen summary');
    await page.waitForTimeout(120);
    await page.click('#ns-set-ops .chip[data-v="+"]');
    await page.waitForTimeout(150);
    await page.click('#ns-set-ops .chip[data-v="-"]');
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => ({
      ops: newStar.settings.ops.slice(),
      shake: !!document.querySelector('#ns-set-ops .chip.shake'),
    }));
    check(r.ops.length === 1 && r.ops[0] === '-', 'de laatste bewerking kan niet uit', JSON.stringify(r.ops));
    check(r.shake, 'de geweigerde tik schudt', `shake=${r.shake}`);
    await ctx.close();
  }

  /* ================= 11 · Meisje of jongen =====================================
     Eén veld op het formulier en één veld in het profiel; de rest van de app
     (kast, looks, trofeeën) hoort er niets van te merken. Dat is precies wat
     hier bewaakt wordt: dezelfde spullen, een andere tekening. */

  // 11a · zonder keuze geen ster
  {
    const { ctx, page } = await fresh();
    await page.click('#btn-newstar');
    await page.waitForTimeout(150);
    await page.fill('#newstar-name', 'Zonder');
    const r = await page.evaluate(() => ({
      disabled: document.getElementById('newstar-go').disabled,
      chips: document.querySelectorAll('#newstar-base .chip').length,
      gekozen: document.querySelectorAll('#newstar-base .chip.on').length,
    }));
    check(r.chips === 2, 'het formulier biedt twee basisfiguren', `chips=${r.chips}`);
    check(r.gekozen === 0, 'geen enkele basis staat voorgekozen', `aan=${r.gekozen}`);
    check(r.disabled, 'met een naam maar zonder basis blijft Klaar uit', `disabled=${r.disabled}`);
    await ctx.close();
  }

  // 11b · een jongen wordt anders getekend, met exact dezelfde spullen
  {
    const { ctx, page } = await fresh();
    // het formulier biedt alleen de START_DRESS-kleuren aan; het patroonstuk komt
    // er hier achteraf bij, want juist een patroon moet op beide basissen kloppen
    await makeStar(page, { name: 'Jules', base: 'jongen', hair: 'hair_zwart', dress: 'dress_blauw' });
    const r = await page.evaluate(() => {
      const p = db.profiles[profileKeys()[0]];
      p.equipped.dress = 'dress_disco';
      // avatarSVG stempelt per aanroep een uniek verloop-id (rb1, rb2, ...);
      // zonder dat weg te halen verschilt élke twee tekeningen en zegt de
      // vergelijking niets over de vorm
      const kaal = t => t.replace(/rb\d+/g, 'rb');
      const meisje = kaal(avatarSVG({ ...p, base: 'meisje' }, 132));
      const jongen = kaal(avatarSVG(p, 132));
      return {
        base: p.base,
        anders: meisje !== jongen,
        // de vaste ankerpunten mogen niet meebewegen: schoenen, hals en armen
        // zijn gedeelde tekencode en horen bij élke basis op dezelfde plek
        ankersGelijk: ['<ellipse cx="86" cy="234"', '<rect x="90" y="94"', 'M84 112 Q68 132 64 157']
          .every(a => meisje.includes(a) && jongen.includes(a)),
        // en de kast blijft de kast: zelfde spullen, zelfde id's
        owned: p.owned.slice().sort().join(','),
        dress: p.equipped.dress,
        thumbAnders: itemThumb(item('dress_disco'), 'meisje') !== itemThumb(item('dress_disco'), 'jongen'),
      };
    });
    check(r.base === 'jongen', 'de gekozen jongen wordt bewaard', String(r.base));
    check(r.anders, 'een jongen ziet er anders uit dan een meisje', 'zelfde tekening');
    check(r.ankersGelijk, 'schoenen, hals en armen staan bij beide basissen op hun plek', 'anker verschoven');
    check(r.dress === 'dress_disco', 'een jongen draagt gewoon hetzelfde item', String(r.dress));
    check(r.thumbAnders, 'het miniatuur in de winkel volgt de basis', 'zelfde miniatuur');
    await ctx.close();
  }

  // 11c · een save van vóór deze versie blijft een meisje en ziet er hetzelfde uit
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => {
      const p = defaultProfile('Oud', 'dress_roze', { hair: 'hair_bruin' });
      delete p.base;                       // precies hoe een oude save eruitziet
      localStorage.setItem('rekenPopsterren_v1', JSON.stringify({
        sound: true, haptics: true, schemaV: 2, profiles: { p1: p }
      }));
    });
    await page.reload();
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => {
      const p = db.profiles.p1;
      const kaal = t => t.replace(/rb\d+/g, 'rb');   // zie 11b: uniek verloop-id per aanroep
      return { base: p.base, zelfde: kaal(avatarSVG(p, 132)) === kaal(avatarSVG({ ...p, base: 'meisje' }, 132)) };
    });
    check(r.base === 'meisje', 'een save zonder basis wordt een meisje', String(r.base));
    check(r.zelfde, 'en wordt precies zo getekend als voorheen', 'de tekening veranderde');
    await ctx.close();
  }

  await browser.close();

  /* ================= Uitslag ================= */
  check(pageErrors.length === 0, 'geen fouten in de pagina', pageErrors.slice(0, 3).join(' | '));
  const labels = Object.keys(counts).sort();
  let pass = 0, fail = 0;
  for (const l of labels) {
    const c = counts[l];
    pass += c.pass; fail += c.fail;
    console.log(` ${c.fail ? 'FOUT' : 'ok  '}   ${l}  (${c.pass} ok${c.fail ? ', ' + c.fail + ' fout' : ''})`);
  }
  if (fails.length) { console.log('\nEerste fouten:'); fails.forEach(f => console.log('  - ' + f)); }
  console.log(`\n${pass}/${pass + fail} controles geslaagd.`);
  process.exit(fail ? 1 : 0);
})();
