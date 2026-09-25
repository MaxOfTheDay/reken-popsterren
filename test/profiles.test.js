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
    // Een ster maken start meteen háár avontuur (zie createStar), dus voor de
    // volgende ster moet er eerst teruggekeerd worden naar de sterrenkeuze --
    // precies wat een ouder met de "wie speelt er"-knop op de kaart doet.
    await page.evaluate(() => {
      if (!document.getElementById('screen-profile').classList.contains('active')) goProfiles();
    });
    await page.waitForTimeout(120);
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
      cards: document.querySelectorAll('.ster-tegel').length,
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
    /* Een ster maken ÍS beginnen. Wie net haar pop gekozen heeft hoort niet terug
       te komen op een keuzescherm om zichzelf daar nog een keer aan te wijzen. */
    const na = await page.evaluate(() => ({
      scherm: document.querySelector('.screen.active').id,
      ster: cur, wereld: document.getElementById('map-tournee-label').textContent,
    }));
    check(na.scherm === 'screen-map' && na.ster === 'p1',
      'een verse ster staat meteen op haar eigen kaart', JSON.stringify(na));
    check(/Muziekwereld/.test(na.wereld), 'en dat is de eerste wereld van de tournee', na.wereld);
    const r = await page.evaluate(() => {
      const k = Object.keys(db.profiles)[0];
      const p = db.profiles[k];
      goProfiles();   // terug naar de keuze: daar staat de tegel die we hieronder nakijken
      openSettings(); setTab = 'beheer'; renderSettings();
      return {
        key: k, n: Object.keys(db.profiles).length,
        name: p.name, base: p.base, hair: p.equipped.hair, dress: p.equipped.dress,
        startHair: p.startHair, startDress: p.startDress,
        order: p.order, track: p.settings.track, perLevel: p.settings.perLevel,
        stageMax: p.settings.stageMax,
        bought: p.owned.length - p.freebies,
        cardText: document.querySelector('.st-naam') ? document.querySelector('.st-naam').textContent : null,
        boldInCard: !!document.querySelector('.st-naam b'),
        fieldValue: document.getElementById('set-name').value,
        sub: document.getElementById('profile-subtitle').textContent,
      };
    });
    check(r.n === 1 && r.key === 'p1', 'eerste ster krijgt sleutel p1', `${r.key} n=${r.n}`);
    check(r.name === 'A"<b>x', 'de naam wordt letterlijk bewaard', r.name);
    check(r.cardText === 'A"<b>x', 'de tegel toont de naam letterlijk', String(r.cardText));
    check(!r.boldInCard, 'html in een naam wordt geen echte opmaak', 'er staat een <b> in de tegel');
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

  /* ================= 2b · Enter in het naamveld =================
   * Op een telefoon is Enter de enige knop die het toetsenbord zélf aanbiedt, en
   * de Klaar-knop zit op dat moment onder datzelfde toetsenbord. Enter deed niets
   * (het veld staat niet in een <form>), dus wie hem indrukte bleef staan waar ze
   * stond. Nu is Enter "klaar met dit veld": toetsenbord weg, en is het formulier
   * af, dan is dat dezelfde tik als op Klaar.
   *
   * Wat hier óók vastligt: Enter verzint geen ster als er nog iets ontbreekt.
   * "Wie ben je?" heeft geen voorkeuze, en dat blijft een echte vraag.            */
  {
    const { ctx, page } = await fresh();
    await page.click('#btn-newstar');
    await page.waitForTimeout(150);
    await page.fill('#newstar-name', 'Fien');
    await page.press('#newstar-name', 'Enter');
    await page.waitForTimeout(300);
    let r = await page.evaluate(() => ({
      n: Object.keys(db.profiles).length,
      focus: document.activeElement ? document.activeElement.id : null,
      opScherm: document.getElementById('screen-newstar').classList.contains('active'),
    }));
    check(r.n === 0 && r.opScherm, 'Enter maakt geen ster zonder alle antwoorden', JSON.stringify(r));
    check(r.focus !== 'newstar-name', 'Enter laat het naamveld wel los (toetsenbord weg)', String(r.focus));
    await page.click('#newstar-base .chip[data-v="meisje"]');
    await page.fill('#newstar-name', 'Fien');
    await page.press('#newstar-name', 'Enter');
    await page.waitForTimeout(400);
    r = await page.evaluate(() => {
      const k = Object.keys(db.profiles)[0];
      return {
        n: Object.keys(db.profiles).length, naam: k ? db.profiles[k].name : null,
        opScherm: document.getElementById('screen-newstar').classList.contains('active'),
        kaart: document.getElementById('screen-map').classList.contains('active'),
        ster: k ? cur : null,
      };
    });
    check(r.n === 1 && r.naam === 'Fien', 'Enter op een af formulier maakt de ster', JSON.stringify(r));
    check(!r.opScherm && r.kaart && r.ster === 'p1',
      'en brengt haar meteen haar avontuur in, net als de knop', JSON.stringify(r));
    // een regeleinde hoort nergens in een naam terecht te komen
    check(!/\n|\r/.test(r.naam || ''), 'en zet geen regeleinde in de naam', JSON.stringify(r.naam));
    await ctx.close();
  }

  /* ================= 3 · Volgorde, sleutels en het maximum ================= */
  {
    const { ctx, page } = await fresh();
    for (let i = 1; i <= 6; i++) await makeStar(page, { name: 'Ster' + i });
    // de zesde staat na het maken op haar eigen kaart; het raster staat hiernaast
    await page.evaluate(() => goProfiles());
    await page.waitForTimeout(150);
    let r = await page.evaluate(() => ({
      keys: profileKeys(), orders: profileKeys().map(k => db.profiles[k].order),
      addHidden: getComputedStyle(document.getElementById('btn-newstar')).display === 'none',
      cards: document.querySelectorAll('.ster-tegel').length,
      kolommen: getComputedStyle(document.getElementById('profile-row')).gridTemplateColumns.split(' ').length,
    }));
    check(r.keys.join(',') === 'p1,p2,p3,p4,p5,p6', 'sleutels lopen netjes op', r.keys.join(','));
    check(r.orders.join(',') === '0,1,2,3,4,5', 'volgorde loopt netjes op', r.orders.join(','));
    check(r.addHidden, 'bij zes sterren verdwijnt de knop', 'knop staat er nog');
    check(r.cards === 6 && r.kolommen === 3, 'zes tegels staan in drie kolommen', JSON.stringify(r));
    // een zevende mag ook niet via de code zelf
    r = await page.evaluate(() => { goProfiles(); openNewStar('profile'); return document.querySelector('.screen.active').id; });
    check(r === 'screen-profile', 'het maakscherm opent niet meer boven het maximum', r);
    await ctx.close();
  }

  /* ================= 3b · Driemaal tikken is één keer spelen =================
   * Een kind van vijf tikt niet één keer. Zonder grendel is dat twee keer
   * navigeren over elkaar heen, en in het slechtste geval de kaart van de ene
   * ster met de voortgang van de andere -- precies het soort fout dat pas opvalt
   * als een kind zegt "dit is mijn wereld niet".                               */
  {
    const { ctx, page } = await fresh();
    await makeStar(page, { name: 'Roos' });
    await makeStar(page, { name: 'Tijn' });
    await page.evaluate(() => goProfiles());
    await page.waitForTimeout(150);
    // drie tikken in dezelfde taak: twee op de eigen tegel, één op die van de buur
    await page.evaluate(() => {
      const t = document.querySelectorAll('.ster-tegel');
      t[0].click(); t[0].click(); t[1].click();
    });
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => ({
      ster: cur, scherm: document.querySelector('.screen.active').id,
      actief: document.querySelectorAll('.screen.active').length,
      naam: cur ? db.profiles[cur].name : null,
    }));
    check(r.ster === 'p1' && r.naam === 'Roos' && r.scherm === 'screen-map' && r.actief === 1,
      'snel achter elkaar tikken opent één kaart, van de eerst aangetikte ster', JSON.stringify(r));
    // en na terugkeren mag er gewoon weer gekozen worden
    await page.evaluate(() => goProfiles());
    await page.waitForTimeout(150);
    await page.evaluate(() => document.querySelectorAll('.ster-tegel')[1].click());
    await page.waitForTimeout(500);
    const r2 = await page.evaluate(() => ({ ster: cur, scherm: document.querySelector('.screen.active').id }));
    check(r2.ster === 'p2' && r2.scherm === 'screen-map',
      'en daarna kan de andere ster gewoon gekozen worden', JSON.stringify(r2));
    await ctx.close();
  }

  /* ================= 3c · De tegel belooft wat de tik doet =================
   * De landing verzint geen voortgang: ze laat continueWorld() zien, dezelfde
   * grens waar goMap() zonder argument heen gaat. Positie (p.level) en
   * voltooiing zijn sinds fase 4A twee dingen, en de tegel hoort de tweede te
   * tonen.                                                                     */
  {
    const { ctx, page } = await fresh();
    await makeStar(page, { name: 'Fenna' });
    let r = await page.evaluate(() => {
      const p = db.profiles.p1;
      // wereld 1 helemaal uit, en in wereld 2 twee van de acht shows gedaan
      for (let l = WORLD_START[0]; l < WORLD_START[0] + WORLDS[0].levels; l++) p.stars[l] = 3;
      p.stars[WORLD_START[1]] = 2; p.stars[WORLD_START[1] + 1] = 1;
      p.level = WORLD_START[1] + 2;
      save(); goProfiles();
      const t = document.querySelector('.ster-tegel');
      return { grens: continueWorld(p), ico: t.querySelector('.st-ico').textContent,
               wereldIco: WORLDS[1].icon, breed: t.querySelector('.st-baan i').style.width,
               label: t.getAttribute('aria-label'), wereldNaam: WORLDS[1].name };
    });
    check(r.grens === 1 && r.ico === r.wereldIco, 'de tegel toont de wereld waar "verder" heen gaat', JSON.stringify(r));
    check(r.breed === '25%', 'en hoe ver ze in díe wereld is (2 van 8)', r.breed);
    check(r.label.indexOf('Fenna') >= 0 && r.label.indexOf(r.wereldNaam) >= 0,
      'en een schermlezer hoort hetzelfde in woorden', r.label);
    // en de tik komt daar ook echt uit
    await page.evaluate(() => document.querySelector('.ster-tegel').click());
    await page.waitForTimeout(600);
    r = await page.evaluate(() => ({
      scherm: document.querySelector('.screen.active').id,
      kop: document.getElementById('map-tournee-label').textContent,
      wereldNaam: WORLDS[1].name,
    }));
    check(r.scherm === 'screen-map' && r.kop.indexOf(r.wereldNaam) >= 0,
      'en de tik komt uit in precies die wereld', JSON.stringify(r));
    // alles uit: de toegift-stand laat de laatste wereld zien, met een volle streep
    r = await page.evaluate(() => {
      const p = db.profiles.p1;
      for (let i = 0; i < WORLD_AVAIL; i++)
        for (let l = WORLD_START[i]; l < WORLD_START[i] + WORLDS[i].levels; l++) p.stars[l] = 3;
      save(); goProfiles();
      const t = document.querySelector('.ster-tegel');
      return { alles: allWorldsDone(p), ico: t.querySelector('.st-ico').textContent,
               laatste: WORLDS[WORLD_AVAIL - 1].icon, breed: t.querySelector('.st-baan i').style.width };
    });
    check(r.alles && r.ico === r.laatste && r.breed === '100%',
      'is alles uit, dan staat de tegel op de toegiftwereld met een volle streep', JSON.stringify(r));
    await ctx.close();
  }

  /* ================= 4 · Dubbele naam wordt geweigerd ================= */
  {
    const { ctx, page } = await fresh();
    await makeStar(page, { name: 'Emma' });
    // Emma staat nu op haar eigen kaart; de "+" hangt aan de sterrenkeuze.
    await page.evaluate(() => goProfiles());
    await page.waitForTimeout(120);
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
      setKey: setKey, cur: cur, curBestaat: !cur || !!db.profiles[cur], nextKey: nextProfileKey(),
    }));
    check(asked, 'verwijderen vraagt eerst om bevestiging', 'geen venster');
    check(r.names.join(',') === 'Een,Drie', 'alleen de gekozen ster verdwijnt', r.names.join(','));
    /* cur is sinds "maken start het avontuur" gewoon de laatst gemaakte ster (p3),
       en dat mag: de regel is dat er nooit een ster geselecteerd blijft die er niet
       meer ís. Dat is precies wat hier bewaakt wordt. */
    check(r.setKey === 'p1' && r.cur !== 'p2' && r.curBestaat,
      'de selectie blijft niet op een verdwenen ster staan', `${r.setKey}/${r.cur}`);
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
        /* De randen van de eerste twee werelden plus het laatste level dat bestaat:
           de plekken waar een verkeerde deling zich verraadt. Uit WORLD_START
           gehaald, niet ingetikt -- een wereld erbij of een wereld van een andere
           lengte hoort deze zaak niet om te gooien. */
        grenzen: (() => {
          const w0 = WORLDS[0], w1 = WORLDS[1];
          return [1, w0.levels, w0.levels + 1, w0.levels + w1.levels,
                  w0.levels + w1.levels + 1, WORLD_LAST].map(naam);
        })(),
        /* Wat hier vastligt is de rekensom, niet wélke werelden er staan: de namen
           en de volgorde zijn van jou en mogen wijzigen zonder dat er een test
           omvalt. Daarom komt de verwachting uit WORLDS zelf, langs een ánder
           pad dan worldFor() -- die twee moeten hetzelfde zeggen. */
        grenzenVerwacht: (() => {
          const w0 = WORLDS[0], w1 = WORLDS[1];
          const uitStart = l => {
            let i = 0;
            for (let k = 0; k < WORLD_START.length; k++) if (l >= WORLD_START[k]) i = k;
            const w = WORLDS[i];
            return w.name + ' ' + (l - WORLD_START[i] + 1) + '/' + w.levels;
          };
          return [1, w0.levels, w0.levels + 1, w0.levels + w1.levels,
                  w0.levels + w1.levels + 1, WORLD_LAST].map(uitStart);
        })(),
        // FASE 4A: voorbij het laatste level is er geen wereld meer maar een
        // toegift -- worldFor klemt op de laatste show van de laatste wereld.
        staart: [WORLD_LAST + 1, WORLD_LAST + 9, WORLD_LAST + 52].map(naam),
        staartVerwacht: (() => { const w = WORLDS[WORLDS.length - 1]; return w.name + ' ' + w.levels + '/' + w.levels; })(),
        altijdIets: [0, -5, null, undefined, NaN].every(l => { const w = worldFor(l); return w && w.world && w.nr >= 1; }),
        rondes: [1, 12, 13, 24, 25, 36, 37].map(tourRound),
        eersteLevels: WORLDS.map((w, i) => WORLD_START[i]),
      };
    });
    check(r.grenzen.join(' | ') === r.grenzenVerwacht.join(' | '),
      'de wereldgrenzen liggen op de achtvouden',
      r.grenzen.join(' | ') + '  !=  ' + r.grenzenVerwacht.join(' | '));
    check(r.staart.every(n => n === r.staartVerwacht),
      'voorbij de laatste wereld verzint de app geen wereld meer',
      r.staart.join(' | ') + '  !=  ' + r.staartVerwacht);
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

  /* ================= 7d · De ster loopt ÓVER de weg =================
   * 7c legt vast dat de weg dóór de haltes loopt. Dit legt vast dat zíj over die weg
   * loopt, en dat het goud precies met haar meekomt.
   *
   * Ze huppelde namelijk in een rechte lijn van halte naar halte, terwijl de weg
   * bólt (ROAD_BOW, en in de studio buigt elk stuk apart om een rots heen). Ze
   * sneed de bochten dus af: gemeten over alle 42 stukken weg van de zes werelden
   * gemiddeld 23px naast de weg en op het ergste stuk 98px, op een telefoon van 390
   * breed -- bijna een hele halte. Het goud groeide ondertussen wél netjes langs de
   * weg, dus je zag twee bewegingen die hetzelfde moment vertellen en een andere weg
   * nemen.
   *
   * Twee helften. Eerst de baan zelf, over élk stuk weg van élke wereld -- dat is
   * waar een nieuwe of verlegde wereld hier omvalt. Daarna één echte reis, met de
   * twee animaties stilgezet en samen vooruitgespoeld: dat meet niet de bedoeling
   * maar het resultaat -- waar ze stáát en waar het goud stáát, op hetzelfde moment.
   *
   * Alles in schermpixels (getScreenCTM), net als 7c: wat een kind ziet, en niet wat
   * er in de padgegevens staat.                                                  */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => {
      const p = defaultProfile('Roos', 'dress_roze');
      p.level = 2; p.stars = { 1: 3 };
      localStorage.setItem('rekenPopsterren_v1',
        JSON.stringify({ sound: false, haptics: false, schemaV: 3, profiles: { p1: p } }));
    });
    await page.reload();
    await page.waitForTimeout(300);
    await page.evaluate(() => selectProfile('p1'));
    await page.waitForTimeout(500);

    // de maten van de reis komen uit de app, niet uit deze test
    const maat = await page.evaluate(() => ({
      stappen: REIS_STAPPEN, duur: REIS_DUUR, wacht: REIS_WACHT, easing: REIS_EASING,
    }));

    /* ---- 7d.1 · elk stuk weg van elke wereld ---- */
    const r = await page.evaluate(() => {
      const uit = [];
      WORLDS.forEach((w, wi) => {
        const wor = worldForIndex(wi);
        if (!wor || !worldReleased(w)) return;
        const nodes = worldNodes(wor);
        for (let k = 0; k + 1 < nodes.length; k++) {
          const van = wor.first + k, naar = van + 1;
          P().level = naar;
          showWorld(wi, van);                     // de tussenstand vóór de reis
          const map = document.getElementById('tour-map');
          const geo = growRoad(map, van, naar, REIS_DUUR, REIS_WACHT);
          const frames = geo && heroRoadFrames(map, geo);
          if (!geo || !frames) { uit.push({ wi, k, fout: 'geen baan' }); continue; }
          const svg = map.querySelector('.tour-road-svg');
          const M = svg.getScreenCTM();           // viewBox -> schermpixels
          const frame = map.querySelector('.world-frame');
          const sx = frame.clientWidth / VB_W, sy = frame.clientHeight / VB_H;
          const lengte = geo.tot - geo.van;
          const a = { x: vbx(nodes[k].x), y: vby(nodes[k].y) };
          const b = { x: vbx(nodes[k + 1].x), y: vby(nodes[k + 1].y) };
          let naast = 0, recht = 0, opHalte = [];
          frames.forEach(f => {
            const m = /translate\(calc\(-50% \+ (-?[\d.]+)px\), (-?[\d.]+)px\)/.exec(f.transform);
            if (!m) { naast = 1e9; return; }
            const x = geo.start.x + parseFloat(m[1]) / sx;   // terug in viewBox-eenheden
            const y = geo.start.y + parseFloat(m[2]) / sy;
            /* Káál vergelijken, zonder er iets uit te rekenen. Deze laag dráágt niets
               meer: het loopje zit een laag dieper (zie 7d-ter), juist zodat haar plek
               op de weg door niets anders meer beïnvloed kan worden. */
            const q = geo.pad.getPointAtLength(geo.van + lengte * f.offset);
            naast = Math.max(naast, Math.hypot(x - q.x, y - q.y) * M.a);
            if (f.offset === 0) opHalte.push(Math.hypot(x - a.x, y - a.y) * M.a);
            if (f.offset === 1) opHalte.push(Math.hypot(x - b.x, y - b.y) * M.a);
            // en waar de oude rechte lijn op ditzelfde punt gelopen zou hebben
            const lx = a.x + (b.x - a.x) * f.offset, ly = a.y + (b.y - a.y) * f.offset;
            recht = Math.max(recht, Math.hypot(q.x - lx, q.y - ly) * M.a);
          });
          uit.push({
            wi, k, stappen: frames.length,
            naast: +naast.toFixed(2), recht: +recht.toFixed(1),
            vertrek: +(opHalte[0] != null ? opHalte[0] : 99).toFixed(2),
            aankomst: +(opHalte[1] != null ? opHalte[1] : 99).toFixed(2),
          });
        }
      });
      return uit;
    });

    const fout = r.filter(x => x.fout);
    check(r.length === 42 && !fout.length,
      'elk stuk weg van elke wereld levert een baan op', JSON.stringify(fout).slice(0, 200));
    check(r.every(x => x.stappen === maat.stappen + 1),
      'de baan wordt over het hele stuk afgetast', JSON.stringify(r[0] || {}));
    const ergNaast = Math.max(...r.map(x => x.naast));
    check(ergNaast <= 2, 'haar baan valt op de weg en niet ernaast', 'ergste ' + ergNaast + 'px');
    check(r.every(x => x.vertrek <= 1 && x.aankomst <= 1),
      'ze vertrekt óp de oude halte en landt óp de nieuwe',
      JSON.stringify(r.filter(x => x.vertrek > 1 || x.aankomst > 1)).slice(0, 300));
    /* Zonder deze laatste zou 7d.1 ook slagen op een kaart waar elke bocht toevallig
       een rechte lijn is -- en dan bewijst hij niets. */
    const bocht = Math.max(...r.map(x => x.recht));
    check(bocht > 40, 'de weg bóóg ook echt, anders bewijst deze zaak niets',
      'grootste verschil met de rechte lijn: ' + bocht + 'px');

    /* ---- 7d.2 · één echte reis: loopt het goud met haar mee? ----
       Het bochtigste stuk van alle werelden (Junglewereld, van halte 7 naar 8).
       De twee animaties worden stilgezet en samen vooruitgespoeld, dus dit hangt
       niet aan een wachttijd. Gemeten wordt wat er in de opmaak stáát: haar eigen
       transform, en de dashoffset van het masker dat het goud opendoet. */
    await page.evaluate(() => {
      const p = P();
      p.level = 24;
      for (let l = 1; l <= 23; l++) p.stars[l] = 3;
      showWorld(2, 23);
      runTravel({ from: 23, to: 24 });
    });
    await page.waitForFunction(() => {
      const h = document.querySelector('.tour-stop[data-lvl="23"] .tour-hero');
      const rv = document.querySelector('#road-reveal path');
      return !!(h && rv && h.getAnimations().length && rv.getAnimations().length);
    }, null, { timeout: 6000 }).catch(() => {});

    const e2e = await page.evaluate(async () => {
      const map = document.getElementById('tour-map');
      const hero = map.querySelector('.tour-stop[data-lvl="23"] .tour-hero');
      const rv = map.querySelector('#road-reveal path');
      if (!hero || !rv || !hero.getAnimations().length || !rv.getAnimations().length)
        return { fout: 'de reis is niet begonnen' };
      const hA = hero.getAnimations().find(a => a.effect
        && a.effect.getKeyframes().some(k => k.transform));
      const rA = rv.getAnimations()[0];
      if (!hA) return { fout: 'de ster beweegt niet' };
      hA.pause(); rA.pause();
      const svg = map.querySelector('.tour-road-svg');
      const fg = svg.querySelector('.tour-road-fg');
      const frame = map.querySelector('.world-frame');
      const M = svg.getScreenCTM();
      const sx = frame.clientWidth / VB_W, sy = frame.clientHeight / VB_H;
      const tot = fg.getTotalLength();
      // waar halte 7 op dit pad ligt -- hetzelfde begin als growRoad gebruikt
      const nodes = worldNodes(worldForIndex(2));
      const pts = nodes.map(n => ({ x: vbx(n.x), y: vby(n.y) }));
      const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      svg.appendChild(probe);
      probe.setAttribute('d', roadD(pts, 7, WORLDS[2].curve));
      const van = probe.getTotalLength();
      probe.remove();
      const start = pts[6];

      const hT = hA.effect.getTiming(), rT = rA.effect.getTiming();
      const meet = [];
      for (let i = 0; i <= 10; i++) {
        const tijd = REIS_WACHT + REIS_DUUR * i / 10;
        hA.currentTime = tijd; rA.currentTime = tijd;
        await new Promise(res => requestAnimationFrame(res));
        // het goud: de leidende rand uit de dashoffset van het masker
        const gevuld = tot - parseFloat(getComputedStyle(rv).strokeDashoffset);
        const rand = fg.getPointAtLength(gevuld);
        // de ster: uit haar eigen transform (haar basis is translateX(-50%))
        const m = new DOMMatrix(getComputedStyle(hero).transform);
        const x = start.x + (m.m41 + hero.offsetWidth / 2) / sx;
        const y = start.y + m.m42 / sy;
        /* Recht tegen elkaar aan, zonder correctie: deze laag is kale weg. De
           voortgang ná de easing komt uit het goud zelf (dat loopt er lineair in
           mee), dus ook daarvoor hoeft niets over de easing aangenomen te worden. */
        const e = (gevuld - van) / (tot - van);
        meet.push({
          t: i / 10, e: +e.toFixed(3),
          af: +(Math.hypot(x - rand.x, y - rand.y) * M.a).toFixed(2),
        });
      }
      hA.cancel(); rA.cancel();
      return { meet, hT, rT, tot: +tot.toFixed(1), van: +van.toFixed(1) };
    });

    if (e2e.fout) check(false, 'de reisanimatie komt op gang', e2e.fout);
    else {
      const erg = Math.max(...e2e.meet.map(m => m.af));
      check(erg <= 3, 'het goud staat op elk moment op dezelfde plek als de ster',
        'ergste ' + erg + 'px  ' + JSON.stringify(e2e.meet));
      check(e2e.hT.duration === e2e.rT.duration && e2e.hT.delay === e2e.rT.delay
        && e2e.hT.easing === e2e.rT.easing
        && e2e.hT.duration === maat.duur && e2e.hT.delay === maat.wacht
        && e2e.hT.easing === maat.easing,
        'de ster en het goud delen duur, vertraging én easing',
        JSON.stringify([e2e.hT, e2e.rT, maat]));
      check(e2e.meet[0].e <= 0.001 && e2e.meet[10].e >= 0.999,
        'de reis begint op de oude halte en eindigt op de nieuwe',
        JSON.stringify([e2e.meet[0], e2e.meet[10]]));
    }
    await ctx.close();
  }

  /* ================= 7d-ter · Ze loopt, en ze tikt bij aankomst =================
   * Haar plek klopte tot op de pixel, maar er gebeurde verder niets met haar: een
   * pop die over een weg schuift leest als een pion op een bord. Er is nu een
   * loopje, en dat zit bewust één laag dieper dan de baan -- op .pas-laag, dezelfde
   * laag als de danspasjes. Dat is de hele afspraak van deze zaak:
   *
   *   de halte-laag (.tour-hero)   = káál de weg, niets erbij
   *   de tekening (.pas-laag)      = het loopje, en verder niets
   *
   * Zo kan het loopje nooit haar plek op de weg beïnvloeden. Ging het op de baan
   * zitten -- en daar zát het eerst, als REIS_VEER -- dan stapelen twee verticale
   * bewegingen zich op en drijft ze alsnog van het goud weg.
   *
   * Wat hier vastligt:
   *   1  de baan zelf draagt geen verticale extra meer (de keyframes op de
   *      halte-laag zijn exact de weg -- dat meet 7d.1/7d.2 al, hier wordt
   *      vastgelegd dat het loopje op een ándere laag staat)
   *   2  het loopje is klein: een paar pixels, niet een sprong
   *   3  het staat op niets bij vertrek én bij aankomst -- geen tikje in beeld
   *   4  het zijn een paar passen, geen trilling en geen één lange boog
   *   5  ze blijft rechtop: geen draaiing, geen zijwaartse verschuiving
   *   6  bij aankomst trilt het toestel één keer kort, en niet bij elke pas    */
  {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await cacheFonts(c);
    const page = await c.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) pageErrors.push('CONSOLE ' + m.text()); });
    await page.goto(APP_URL);
    await page.evaluate(() => {
      localStorage.clear();
      const p = defaultProfile('Roos', 'dress_roze');
      p.level = 2; p.stars = { 1: 3 };
      // trillen aan, geluid uit: buzz() en beep() kijken naar aparte schakelaars
      localStorage.setItem('rekenPopsterren_v1',
        JSON.stringify({ sound: false, haptics: true, schemaV: 3, profiles: { p1: p } }));
    });
    await page.reload();
    await page.waitForTimeout(300);
    await page.evaluate(() => selectProfile('p1'));
    await page.waitForTimeout(500);

    // elke trilling opvangen, met patroon en al
    await page.evaluate(() => {
      window.__buzz = [];
      Object.defineProperty(navigator, 'vibrate', {
        configurable: true, value: v => { window.__buzz.push(v); return true; },
      });
    });
    await page.evaluate(() => {
      const p = P();
      p.level = 24;
      for (let l = 1; l <= 23; l++) p.stars[l] = 3;
      showWorld(2, 23);
      runTravel({ from: 23, to: 24 });   // Junglewereld, het bochtigste stuk
    });
    await page.waitForFunction(() => {
      const h = document.querySelector('.tour-stop[data-lvl="23"] .tour-hero');
      const l = h && h.querySelector('.pas-laag');
      return !!(h && l && h.getAnimations().length && l.getAnimations().length);
    }, null, { timeout: 6000 }).catch(() => {});

    const loop = await page.evaluate(async () => {
      const map = document.getElementById('tour-map');
      const hero = map.querySelector('.tour-stop[data-lvl="23"] .tour-hero');
      const stap = hero && hero.querySelector('.pas-laag');
      if (!hero || !stap) return { fout: 'geen ster of geen paslaag' };
      const beweegt = el => el.getAnimations().find(a => a.effect
        && a.effect.getKeyframes().some(k => k.transform));
      const hA = beweegt(hero), sA = beweegt(stap);
      if (!hA || !sA) return { fout: `halte-laag=${!!hA} paslaag=${!!sA}` };
      hA.pause(); sA.pause();
      const hT = hA.effect.getTiming(), sT = sA.effect.getTiming();
      const meet = [];
      for (let i = 0; i <= 28; i++) {
        const tijd = REIS_WACHT + REIS_DUUR * i / 28;
        hA.currentTime = tijd; sA.currentTime = tijd;
        await new Promise(res => requestAnimationFrame(res));
        const m = new DOMMatrix(getComputedStyle(stap).transform);
        meet.push({
          op: +(-m.m42).toFixed(2),        // omhoog, in pixels
          zij: +m.m41.toFixed(2),          // opzij -- hoort nul te zijn
          scheef: +(m.b || 0).toFixed(4),  // draaiing -- hoort nul te zijn
          sx: +m.m11.toFixed(4), sy: +m.m22.toFixed(4),
        });
      }
      /* Het draaipunt uit de keyframes zelf, en niet uit getComputedStyle. Twee
         redenen, en allebei bijten ze: de opmaak lost het op naar pixels (je krijgt
         "48px 114px" terug en nooit "50% 95%"), en het loopje heeft geen fill, dus
         zodra het klaar is geldt het niet meer en krijg je de standaard 50% 50%
         terug -- van een animatie die het wél goed deed. De keyframes zijn de bron. */
      const kf = sA.effect.getKeyframes();
      const origin = kf.map(k => k.transformOrigin);
      /* finish() en geen cancel(): de reis moet hierna nog écht aankomen. Een
         cancel neemt anim.onfinish weg, en daarmee finish() -> vier() -> de tik en
         de hertekening; dan meet het stuk hieronder een reis die nooit aankwam. */
      hA.finish(); sA.finish();
      /* En wat het draaipunt móét doen: bij het uiterste kneepje mogen haar voeten
         niet van hun plek. Dat is de hele reden dat het bij 95% ligt en niet in het
         midden -- met 50% zou ze bij elke pas een halve rek omhoog kruipen. Nu de
         animatie klaar is staat er niets meer op deze laag, dus dit meet zuiver. */
      const rekMax = Math.max(...meet.map(m => m.sy));
      const svg = stap.querySelector('svg');
      const voor = svg.getBoundingClientRect().bottom;
      stap.style.transformOrigin = origin[0];
      stap.style.transform = `scale(${1 / rekMax}, ${rekMax})`;
      const voeten = Math.abs(svg.getBoundingClientRect().bottom - voor);
      stap.style.transform = ''; stap.style.transformOrigin = '';
      return { meet, hT, sT, origin, voeten: +voeten.toFixed(2) };
    });

    if (loop.fout) check(false, 'de ster loopt op een eigen laag', loop.fout);
    else {
      const op = loop.meet.map(m => m.op);
      check(loop.hT.duration === loop.sT.duration && loop.hT.delay === loop.sT.delay
        && loop.hT.easing === loop.sT.easing,
        'het loopje deelt duur, vertraging én easing met de baan',
        JSON.stringify([loop.hT, loop.sT]));
      const hoogste = Math.max(...op);
      check(hoogste > 2 && hoogste < 9,
        'het loopje is een paar pixels en geen sprong', hoogste + 'px');
      check(Math.min(...op) >= -0.01, 'ze veert omhoog en niet omlaag', Math.min(...op) + 'px');
      check(Math.abs(op[0]) < 0.01 && Math.abs(op[op.length - 1]) < 0.01,
        'het loopje staat op niets bij vertrek én bij aankomst',
        JSON.stringify([op[0], op[op.length - 1]]));
      // toppen tellen: een paar passen, geen trilling en geen één lange boog
      let toppen = 0;
      for (let i = 1; i + 1 < op.length; i++) if (op[i] > op[i - 1] && op[i] >= op[i + 1]) toppen++;
      check(toppen >= 2 && toppen <= 4, 'het zijn een paar passen', 'toppen: ' + toppen);
      check(loop.meet.every(m => Math.abs(m.zij) < 0.01 && Math.abs(m.scheef) < 0.001),
        'ze blijft rechtop en schuift niet opzij',
        JSON.stringify(loop.meet.filter(m => Math.abs(m.zij) >= 0.01 || Math.abs(m.scheef) >= 0.001).slice(0, 3)));
      const rek = loop.meet.reduce((m, x) => Math.max(m, Math.abs(x.sx - 1), Math.abs(x.sy - 1)), 0);
      check(rek > 0.002 && rek <= 0.03, 'het kneepje blijft onder de drie procent', rek.toFixed(4));
      check(loop.origin.length > 1 && loop.origin.every(o => o === '50% 95%'),
        'elk beeldje draait om hetzelfde punt: 50% 95%, net als de danspasjes',
        JSON.stringify(loop.origin.slice(0, 3)));
      check(loop.voeten < 0.5,
        'het kneepje laat haar voeten staan waar ze staan', loop.voeten + 'px');
    }

    // en dan de reis uitlopen: één korte tik bij aankomst, en verder niets
    await page.waitForTimeout(3200);
    const na = await page.evaluate(() => ({
      buzz: window.__buzz.slice(),
      opNieuw: (() => { const st = document.querySelector('.tour-stop[data-lvl="24"]');
        return !!st && !!st.querySelector('.tour-hero'); })(),
    }));
    const tikken = na.buzz.filter(v => typeof v === 'number');
    check(na.opNieuw, 'de reis is afgelopen en ze staat op de nieuwe halte', JSON.stringify(na));
    check(tikken.length === 1 && tikken[0] >= 8 && tikken[0] <= 15,
      'aankomst geeft precies één korte tik, niet één per pas', JSON.stringify(na.buzz));
    await c.close();
  }

  /* ========== 7d-quater · Geen trilmotor, of trillen uit ==========
   * buzz() is de enige plek waar de app aan navigator.vibrate komt, en hij kijkt
   * zelf naar db.haptics en naar of de browser het überhaupt kan. Dat is precies
   * wat een aankomsttik nodig heeft, en de reden om er geen tweede naast te zetten:
   * een eigen aanroep zou allebei die vangnetten missen én de tik van sndCoin
   * afbreken (navigator.vibrate begint opnieuw in plaats van erbij).             */
  {
    for (const [naam, haptics, motor] of [['trillen uit', false, true], ['geen trilmotor', true, false]]) {
      const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await cacheFonts(c);
      const page = await c.newPage();
      page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
      page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) pageErrors.push('CONSOLE ' + m.text()); });
      await page.goto(APP_URL);
      await page.evaluate(h => {
        localStorage.clear();
        const p = defaultProfile('Roos', 'dress_roze');
        p.level = 2; p.stars = { 1: 3 };
        localStorage.setItem('rekenPopsterren_v1',
          JSON.stringify({ sound: false, haptics: h, schemaV: 3, profiles: { p1: p } }));
      }, haptics);
      await page.reload();
      await page.waitForTimeout(300);
      await page.evaluate(() => selectProfile('p1'));
      await page.waitForTimeout(400);
      await page.evaluate(heeftMotor => {
        window.__buzz = [];
        if (heeftMotor) Object.defineProperty(navigator, 'vibrate',
          { configurable: true, value: v => { window.__buzz.push(v); return true; } });
        else { delete Navigator.prototype.vibrate; delete navigator.vibrate; }
      }, motor);
      const r = await page.evaluate(async () => {
        const p = P();
        p.level = 24;
        for (let l = 1; l <= 23; l++) p.stars[l] = 3;
        showWorld(2, 23);
        runTravel({ from: 23, to: 24 });
        await new Promise(res => setTimeout(res, 3200));
        const st = document.querySelector('.tour-stop[data-lvl="24"]');
        return { buzz: window.__buzz.slice(), aangekomen: !!st && !!st.querySelector('.tour-hero') };
      });
      check(r.buzz.length === 0 && r.aangekomen,
        `${naam}: de reis loopt gewoon af, er trilt niets`, JSON.stringify(r));
      await c.close();
    }
  }

  /* =========== 7d-quinquies · De kaart viert de sterren niet nog een keer ===========
   * Het eindscherm onthult de sterren, viert ze, en wacht tot het kind zelf op
   * "Verder op tournee" tikt. Daarna kwam de kaart op en gebeurde dat nog een keer:
   * dezelfde sterren landden onder de zojuist gespeelde halte (.net-af, een halve
   * seconde), er ging een trilling af, er viel een vonkje -- en pás daarna vertrok
   * ze. Opgemeten duurde het 1202ms voordat er iets bewoog, waarvan het grootste
   * deel een herhaling was van nieuws dat het kind al had weggetikt.
   *
   * Het eindscherm is het beloningsmoment; de kaart is het voortgangsmoment. Dus:
   * kaart op -> korte landing van het scherm zelf -> ze loopt.
   *
   * De grens van deze ingreep is waar het hier om draait, want "geen sterren meer
   * op de kaart" zou drie andere dingen kapotmaken. Alleen een level-up die binnen
   * dezelfde wereld doorreist slaat de landing over. Een show overdoen zonder dat
   * de voortgang opschuift moet hem houden (de kaart is dan de eerste plek waar de
   * nieuwe score staat), een wereldgrens heeft zijn eigen opbouw, en gewoon de
   * kaart openen heeft er sowieso niets mee te maken.                          */
  {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await cacheFonts(c);
    const page = await c.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) pageErrors.push('CONSOLE ' + m.text()); });
    await page.goto(APP_URL);
    await page.evaluate(() => {
      localStorage.clear();
      const p = defaultProfile('Roos', 'dress_roze');
      p.level = 2; p.stars = { 1: 3 };
      localStorage.setItem('rekenPopsterren_v1',
        JSON.stringify({ sound: false, haptics: true, schemaV: 3, profiles: { p1: p } }));
    });
    await page.reload();
    await page.waitForTimeout(300);
    await page.evaluate(() => selectProfile('p1'));
    await page.waitForTimeout(500);

    /* ---- 7d.5a · level-up binnen de wereld: geen landing, en meteen op pad ----
       De echte weg wordt nagelopen -- goMap(23), precies wat "Verder op tournee"
       aanroept -- en niet runTravel rechtstreeks: de sterrenlanding wordt in goMap
       overgeslagen, dus een test die runTravel zelf aanroept zou er langs kijken. */
    const reis = await page.evaluate(async () => {
      const log = [];
      let start = 0;
      const nu = () => performance.now() - start;
      Object.defineProperty(navigator, 'vibrate', {
        configurable: true, value: v => { log.push({ op: 'tril', t: nu(), v }); return true; },
      });
      const echt = window.sparkleAt;
      window.sparkleAt = (r, e) => { log.push({ op: 'vonk', t: nu(), v: (e || []).join('') }); return echt(r, e); };

      const p = P();
      p.level = 24;
      for (let l = 1; l <= 23; l++) p.stars[l] = 3;
      pendingTravel = { from: 23, to: 24 };   // Junglewereld, binnen dezelfde wereld
      naShowLvl = 23;
      viewWorldIdx = 2;

      start = performance.now();
      goMap(23);
      // vlak na de tekening: staat er een sterrenlanding op de kaart?
      const landtMeteen = !!document.querySelector('.tour-stop.net-af');
      // en staan de sterren er wél gewoon? (weghalen van de beat mag geen score wissen)
      const sterrenZichtbaar = document.querySelectorAll('.tour-stop[data-lvl="23"] .cs-vol').length;

      let landtOoit = landtMeteen, beweegtVanaf = null, aangekomen = null;
      await new Promise(res => {
        const kijk = () => {
          if (document.querySelector('.tour-stop.net-af')) landtOoit = true;
          const h = document.querySelector('.tour-stop[data-lvl="23"] .tour-hero');
          if (h && beweegtVanaf === null) {
            const a = h.getAnimations().find(x => x.effect
              && x.effect.getKeyframes().some(k => k.transform));
            if (a && a.startTime != null) beweegtVanaf = a.startTime + a.effect.getTiming().delay - start;
          }
          if (document.querySelector('.tour-stop[data-lvl="24"] .tour-hero') && aangekomen === null) aangekomen = nu();
          if (aangekomen !== null || nu() > 4000) return res();
          requestAnimationFrame(kijk);
        };
        requestAnimationFrame(kijk);
      });
      window.sparkleAt = echt;
      return {
        landtMeteen, landtOoit, sterrenZichtbaar,
        beweegtVanaf: beweegtVanaf === null ? null : Math.round(beweegtVanaf),
        aangekomen: aangekomen === null ? null : Math.round(aangekomen),
        // alles wat er vóór de eerste beweging gebeurde
        voorVertrek: log.filter(e => beweegtVanaf !== null && e.t < beweegtVanaf)
          .map(e => `${e.op}@${Math.round(e.t)}`),
        tikken: log.filter(e => e.op === 'tril').map(e => e.v),
        vonken: [...new Set(log.filter(e => e.op === 'vonk').map(e => e.v))],
        opkomstKlaar: MOTION.komNa + MOTION.kom,
      };
    });

    check(reis.landtMeteen === false && reis.landtOoit === false,
      'geen tweede sterrenlanding op de kaart bij een level-up', JSON.stringify(reis));
    check(reis.sterrenZichtbaar === 3,
      'de sterren staan er nog gewoon -- alleen de herhaling is weg', String(reis.sterrenZichtbaar));
    check(reis.voorVertrek.length === 0,
      'er trilt en vonkt niets vóór ze vertrekt', JSON.stringify(reis.voorVertrek));
    /* Promptheid, maar niet zo prompt dat ze vertrekt terwijl de kaart nog inzoomt:
       tussen het einde van de opkomst en haar eerste stap hoort een korte tel te
       zitten, geen moment om op te wachten. */
    check(reis.beweegtVanaf >= reis.opkomstKlaar && reis.beweegtVanaf <= 600,
      'ze vertrekt kort ná de opkomst van de kaart en niet veel later',
      `${reis.beweegtVanaf}ms, opkomst klaar op ${reis.opkomstKlaar}ms`);
    check(reis.tikken.length === 1 && reis.tikken[0] === 15,
      'de enige trilling van de hele reis is het tikje bij aankomst', JSON.stringify(reis.tikken));
    check(reis.vonken.length > 0 && reis.vonken.every(v => !/\u2b50/.test(v)),
      'het vonkenspoor draagt geen sterren -- die zijn op het eindscherm uitgedeeld',
      JSON.stringify(reis.vonken));
    check(reis.aangekomen !== null && reis.aangekomen < 2500,
      'en ze komt ook echt aan', JSON.stringify(reis.aangekomen));

    /* ---- 7d.5b · de drie stromen die dit NIET mogen merken ---- */
    const rand = await page.evaluate(async () => {
      const wacht = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
      const stil = () => document.getAnimations().forEach(a => a.cancel());
      const p = P();
      const uit = {};

      // een show overdoen: de voortgang schuift niet op, dus geen reis
      p.level = 24;
      for (let l = 1; l <= 23; l++) p.stars[l] = 3;
      pendingTravel = null;
      viewWorldIdx = 2;
      goMap(20);
      await wacht();
      uit.overdoen = !!document.querySelector('.tour-stop[data-lvl="20"].net-af');
      stil();

      // over een wereldgrens: eigen opbouw, eigen beat
      p.level = 25;
      for (let l = 1; l <= 24; l++) p.stars[l] = 3;
      pendingTravel = { from: 24, to: 25 };
      viewWorldIdx = 2;
      goMap(24);
      await wacht();
      uit.wereldgrens = !!document.querySelector('.tour-stop[data-lvl="24"].net-af');
      stopWereldReis();
      stil();

      // gewoon de kaart openen (tabbladbalk, terugknop, kleedkamer)
      pendingTravel = null;
      goMap();
      await wacht();
      uit.gewoonOpenen = !!document.querySelector('.tour-stop.net-af');
      stil();
      return uit;
    });
    check(rand.overdoen === true,
      'een show overdoen laat de sterren wél op de kaart landen', JSON.stringify(rand));
    check(rand.wereldgrens === true,
      'een wereldgrens houdt zijn eigen sterrenmoment', JSON.stringify(rand));
    check(rand.gewoonOpenen === false,
      'gewoon de kaart openen laat nog steeds niets landen', JSON.stringify(rand));
    await c.close();
  }

  /* ========== 7d-bis · Beperkte beweging landt meteen goed ==========
   * De reis is een beloning en geen bericht: met 'prefers-reduced-motion: reduce'
   * hoort er niets te huppelen en niets te groeien, maar wel exact dezelfde kaart
   * te staan als ná de reis -- de nieuwe halte open, de ster erop, het goud
   * doorgetrokken. Dat is de tak die runTravel via `still` neemt, en die is bij het
   * verleggen van de baan (7d) precies de tak die je per ongeluk kwijtraakt. */
  {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await cacheFonts(c);
    const page = await c.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    await page.goto(APP_URL);
    await page.evaluate(() => {
      localStorage.clear();
      const p = defaultProfile('Roos', 'dress_roze');
      p.level = 2; p.stars = { 1: 3 };
      localStorage.setItem('rekenPopsterren_v1',
        JSON.stringify({ sound: false, haptics: false, schemaV: 3, profiles: { p1: p } }));
    });
    await page.reload();
    await page.waitForTimeout(300);
    await page.evaluate(() => selectProfile('p1'));
    await page.waitForTimeout(400);

    const r = await page.evaluate(() => {
      const p = P();
      p.level = 24;
      for (let l = 1; l <= 23; l++) p.stars[l] = 3;
      showWorld(2, 23);
      runTravel({ from: 23, to: 24 });
      const map = document.getElementById('tour-map');
      const stop = map.querySelector('.tour-stop[data-lvl="24"]');
      return {
        stil: motionOff(),
        /* Alleen de reis telt hier. document.getAnimations() geeft ook de vonk
           naast haar hoofd en de confetti van de aankomst terug, en die horen bij
           een ander stuk van de app. */
        bewegend: [...map.querySelectorAll('.tour-hero')]
          .reduce((n, h) => n + h.getAnimations().length, 0),
        masker: !!map.querySelector('#road-reveal'),
        nieuweHalteOpen: !!stop && !stop.classList.contains('locked'),
        sterOpNieuweHalte: !!stop && !!stop.querySelector('.tour-hero'),
        goudTot: (() => {
          const fg = map.querySelector('.tour-road-fg');
          const nodes = worldNodes(worldForIndex(2));
          const pts = nodes.map(n => ({ x: vbx(n.x), y: vby(n.y) }));
          const eind = fg.getPointAtLength(fg.getTotalLength());
          return +Math.hypot(eind.x - pts[7].x, eind.y - pts[7].y).toFixed(1);
        })(),
      };
    });
    check(r.stil, 'de proef draait écht met beperkte beweging', JSON.stringify(r));
    check(r.bewegend === 0 && !r.masker,
      'met beperkte beweging huppelt en groeit er niets', JSON.stringify(r));
    check(r.nieuweHalteOpen && r.sterOpNieuweHalte && r.goudTot <= 1,
      'maar de kaart staat wel in precies de eindstand', JSON.stringify(r));
    await c.close();
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

  /* ========== 7e · Raakvlakken: groot genoeg, en van elkaar gescheiden ==========
   * Het raakvlak rond een halte is groter dan het medaillon zelf, en dat is met
   * opzet: op de kleinste telefoon is het medaillon maar 33px. Maar het mag niet zó
   * groot worden dat twee raakvlakken elkaar raken -- dan tikt een kind de verkeerde
   * halte aan, en dat merk je niet aan iets dat kapot gaat.
   *
   * Deze test mat eerder 0,135 x kaderbreedte -- de maat van .tour-stop::before --
   * en dát was het probleem: die schijf wás het raakvlak niet. De halte is een
   * <button> van 26cqw breed, en een knop vangt tikken over zijn héle vlak; de
   * schijf lag daar volledig binnenin en deed niets. De gemeten werkelijkheid op
   * 390x844 was 123x49px per halte, terwijl twee haltes op hun krapst 76px uit
   * elkaar liggen: naburige knoppen overlapten fors, en wie won hing af van de
   * DOM-volgorde. De test stond op groen omdat hij naar het verkeerde getal keek.
   *
   * Nu wordt het échte raakvlak gemeten, met elementFromPoint: vanaf het hart van
   * elke halte naar buiten lopen tot de tik niet meer bij díe halte hoort. Dat is
   * per definitie wat een kindervinger ook tegenkomt, en het kan niet meer stil
   * uiteenlopen met de CSS.
   *
   * Drie dingen liggen hier vast:
   *   - elk raakvlak is minstens 40px in beide richtingen (kindervinger)
   *   - het sterrentabje onder de halte opent dezelfde halte (het hóórt erbij)
   *   - twee raakvlakken overlappen elkaar niet -- gecontroleerd op álle werelden
   *     én op de standaardslinger, want dáár zit het krapste paar                */
  {
    for (const [naam, w, h] of [['kleine telefoon', 320, 568], ['iPhone 14', 390, 844],
                                ['21:9', 412, 961]]) {
      const c = await browser.newContext({ viewport: { width: w, height: h } });
      await cacheFonts(c);
      const page = await c.newPage();
      page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
      await page.goto(APP_URL + '&demo&star=p1&screen=map');
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => {
        const uit = { werelden: [], kleinste: Infinity, tabMis: [], overlap: [] };
        /* Elke geschreven wereld, plus één ronde op de standaardslinger: een
           wereld zónder eigen haltelijst valt terug op defaultNodes(), en dát is
           het krapste geval dat er bestaat. Vroeger leverde de oneindige staart
           die ronde vanzelf; die is er niet meer (fase 4A), dus halen we de
           haltes één keer weg bij de laatste wereld en zetten ze daarna terug. */
        const tot = WORLDS.length + 1;
        for (let wi = 0; wi < tot; wi++) {
          const slinger = wi >= WORLDS.length;
          const idx = Math.min(wi, WORLDS.length - 1);
          const bewaard = slinger ? { n: WORLDS[idx].nodes, c: WORLDS[idx].curve } : null;
          if (slinger) { delete WORLDS[idx].nodes; delete WORLDS[idx].curve; }
          const p = P(), first = WORLD_START[idx];
          p.level = first + 5;
          p.stars = {};
          [3, 3, 1, 2, 0].forEach((s, i) => { p.stars[first + i] = s; });
          viewWorldIdx = idx;
          renderMapTitle(p);
          renderTourMap(0);
          const naamW = worldForIndex(idx).world.id + (slinger ? ' (slinger)' : '');
          const stops = [...document.querySelectorAll('.tour-stop:not(.locked)')];
          const vakken = [];
          stops.forEach(s => {
            const d = s.querySelector('.dot').getBoundingClientRect();
            const cx = d.left + d.width / 2, cy = d.top + d.height / 2;
            /* Alleen haltes die écht in beeld staan zijn met elementFromPoint te
               meten. Op een toestel waar de kaart schuift staat een deel erbuiten,
               en dan meet je het venster en niet de halte. */
            if (cx < 4 || cx > innerWidth - 4 || cy < 60 || cy > innerHeight - 100) return;
            const raak = (x, y) => {
              const e = document.elementFromPoint(x, y);
              return !!(e && e.closest && e.closest('.tour-stop') === s);
            };
            if (!raak(cx, cy)) return;          // afgedekt door kop of balk
            let l = 0, rr = 0, t = 0, b = 0;
            while (l < 200 && raak(cx - l - 1, cy)) l++;
            while (rr < 200 && raak(cx + rr + 1, cy)) rr++;
            while (t < 200 && raak(cx, cy - t - 1)) t++;
            while (b < 200 && raak(cx, cy + b + 1)) b++;
            vakken.push({ lvl: s.dataset.lvl, br: l + rr, ho: t + b });
            uit.kleinste = Math.min(uit.kleinste, l + rr, t + b);
            // het sterrentabje hoort bij dezelfde halte
            const cs = s.querySelector('.cstars');
            if (cs) {
              const cr = cs.getBoundingClientRect();
              if (cr.bottom < innerHeight - 100 && !raak(cr.left + cr.width / 2, cr.top + cr.height / 2)) {
                uit.tabMis.push(naamW + ' halte ' + s.dataset.lvl);
              }
            }
          });
          /* Overlap niet met elementFromPoint maar met de omhullende rechthoek van
             het raakvlak: elementFromPoint zíet een overlap nooit -- daar wint er
             altijd precies één, en juist dát is het probleem dat we willen vangen. */
          const fr = document.querySelector('.world-frame').getBoundingClientRect();
          const cqw = fr.width / 100;
          const cs = getComputedStyle(document.querySelector('.tour-stop'), '::before');
          const bw = parseFloat(cs.width), bh = parseFloat(cs.height);
          const mids = [...document.querySelectorAll('.tour-stop')].map(s => {
            const d = s.querySelector('.dot').getBoundingClientRect();
            return { lvl: s.dataset.lvl, x: d.left + d.width / 2, y: d.top + d.height / 2 };
          });
          for (let i = 0; i < mids.length; i++) for (let j = i + 1; j < mids.length; j++) {
            if (Math.abs(mids[i].x - mids[j].x) < bw && Math.abs(mids[i].y - mids[j].y) < bh) {
              uit.overlap.push(naamW + ' ' + mids[i].lvl + '/' + mids[j].lvl);
            }
          }
          uit.werelden.push({ id: naamW, vakken: vakken.length, bw: Math.round(bw), bh: Math.round(bh), cqw: +cqw.toFixed(1) });
          if (slinger) { WORLDS[idx].nodes = bewaard.n; WORLDS[idx].curve = bewaard.c; }
        }
        return uit;
      });
      check(r.kleinste >= 40, 'het raakvlak blijft groot genoeg voor een kindervinger — ' + naam,
        'kleinste zijde ' + r.kleinste + 'px');
      check(r.overlap.length === 0, 'raakvlakken van twee haltes overlappen niet — ' + naam,
        r.overlap.join(', ') + ' (maat ' + JSON.stringify(r.werelden[0]) + ')');
      check(r.tabMis.length === 0, 'het sterrentabje opent dezelfde halte — ' + naam,
        r.tabMis.join(', '));
      await c.close();
    }
  }

  /* ========== 7e-kwart · De ster antwoordt, de halte blijft de knop ==========
   * Tik je op de ster, dan stuitert ze en gebeurt er verder niets (zie kaartTik).
   * Wat hier vastligt is dat die tik nooit een tik van een halte afpakt. Ze staat
   * ín de knop van haar halte, dus zonder zorg is ze een tweede speelknop.
   *   - binnen het raakvlak van élke open halte, in elke wereld, wint de halte:
   *     elementFromPoint komt daar nooit bij de ster uit
   *   - een tik op haar silhouet laat de kaart staan en geeft één stuiter; een
   *     tweede tik meteen erna begint hem niet opnieuw
   *   - tijdens een overgang doet ze niets, en de halte start daarna gewoon
   * Op de maat van een Pixel 10 staand, met aanraking. */
  {
    const c = await browser.newContext({ viewport: { width: 412, height: 923 }, hasTouch: true, isMobile: true });
    await cacheFonts(c);
    const page = await c.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    await page.goto(APP_URL + '&demo&star=p1&screen=map');
    await page.waitForTimeout(2500);   // opkomst en groet voorbij
    const gestolen = await page.evaluate(() => {
      const uit = [];
      for (let wi = 0; wi < WORLDS.length; wi++) {
        const p = P(), first = WORLD_START[wi];
        p.level = first + 3;
        p.stars = { [first]: 3, [first + 1]: 2, [first + 2]: 1 };
        viewWorldIdx = wi;
        renderMapTitle(p);
        renderTourMap(0);
        // het raakvlak zelf opmeten: wat de halte nu vangt als de ster níets vangt
        const uitzetten = document.createElement('style');
        uitzetten.textContent = '.tour-hero * { pointer-events: none !important; }';
        document.querySelectorAll('.tour-stop:not(.locked)').forEach(s => {
          const d = s.querySelector('.dot').getBoundingClientRect();
          const cx = d.left + d.width / 2, cy = d.top + d.height / 2;
          for (let x = cx - 40; x <= cx + 40; x += 2) for (let y = cy - 40; y <= cy + 40; y += 2) {
            if (y < 70 || y > innerHeight - 110) continue;
            const e = document.elementFromPoint(x, y);
            if (!e || !e.closest('.tour-hero')) continue;
            document.head.appendChild(uitzetten);
            const eronder = document.elementFromPoint(x, y);
            uitzetten.remove();
            if (eronder && eronder.closest('.tour-stop') === s) uit.push(`wereld ${wi + 1} halte ${s.dataset.lvl}`);
          }
        });
      }
      return [...new Set(uit)];
    });
    check(gestolen.length === 0, 'de ster pakt geen tik van het raakvlak van een halte af',
      gestolen.join(', '));

    // een bekende stand, rechtstreeks getekend: renderTourMap groet niet
    await page.evaluate(() => {
      const p = P(), first = WORLD_START[0];
      p.level = first + 3;
      p.stars = { [first]: 3, [first + 1]: 2, [first + 2]: 1 };
      viewWorldIdx = 0;
      renderMapTitle(p);
      renderTourMap(0);
    });
    await page.waitForTimeout(300);
    const punt = await page.evaluate(() => {
      const hr = document.querySelector('.tour-hero').getBoundingClientRect();
      const x = hr.left + hr.width / 2;
      for (let y = hr.top + hr.height * .45; y < hr.bottom; y++) {
        const e = document.elementFromPoint(x, y);
        if (e && e.closest('.tour-stop') && e.closest('.tour-hero')) return { x, y };
      }
      return null;
    });
    check(!!punt, 'haar silhouet neemt een tik aan', 'geen punt op de ster gevonden');
    if (punt) {
      const staat = () => page.evaluate(() => ({
        scherm: document.querySelector('.screen.active').id,
        pas: [...(document.querySelector('.tour-hero .pas-laag')?.getAnimations() || [])]
          .map(a => a.animationName + '@' + Math.round(a.currentTime)),
      }));
      await page.touchscreen.tap(punt.x, punt.y);
      await page.waitForTimeout(150);
      const een = await staat();
      await page.touchscreen.tap(punt.x, punt.y);
      await page.waitForTimeout(150);
      const twee = await staat();
      check(een.scherm === 'screen-map' && twee.scherm === 'screen-map',
        'een tik op de ster start geen show', JSON.stringify([een, twee]));
      check(een.pas.length === 1 && /^mvBounce@/.test(een.pas[0]),
        'een tik op de ster geeft één stuiter', JSON.stringify(een.pas));
      check(twee.pas.length === 1 && parseInt(twee.pas[0].split('@')[1], 10) > parseInt(een.pas[0].split('@')[1], 10),
        'een tweede tik meteen erna begint de stuiter niet opnieuw', JSON.stringify([een.pas, twee.pas]));
      await page.waitForTimeout(1000);
      await page.evaluate(() => { overgangBezig = true; });
      await page.touchscreen.tap(punt.x, punt.y);
      await page.waitForTimeout(150);
      const tijdens = await staat();
      await page.evaluate(() => { overgangBezig = false; });
      check(tijdens.pas.length === 0, 'tijdens een overgang doet de ster niets', JSON.stringify(tijdens));
      const dot = await page.evaluate(() => {
        const r = document.querySelector('.tour-stop.next .dot').getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      await page.touchscreen.tap(dot.x, dot.y);
      await page.waitForTimeout(900);
      check((await staat()).scherm === 'screen-game', 'de halte onder de ster start de show nog altijd');
    }
    await c.close();
  }

  /* ========== 7e-bis · Drie sterplekken, altijd ==========
   * 1/3 was één los sterretje onder een halte en 2/3 waren er twee: het verschil
   * tussen "bijna af" en "áf" moest je tellen. Dat is precies de reden om een show
   * nog eens te spelen, dus het hoort het snelst leesbare ding op de kaart te zijn.
   *
   * Wat hier vastligt: een gespeelde halte toont altijd drie plekken, precies zoveel
   * daarvan vol als er sterren verdiend zijn -- óók 0 van 3 -- en een halte waar nog
   * niets te scoren viel (op slot, of de show die nu aan de beurt is) toont er geen. */
  {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await cacheFonts(c);
    const page = await c.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    await page.goto(APP_URL + '&demo&star=p1&screen=map');
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const p = P(), first = WORLD_START[0];
      p.level = first + 5;
      p.stars = {};
      [3, 2, 1, 0, 3].forEach((s, i) => { p.stars[first + i] = s; });
      viewWorldIdx = 0;
      renderTourMap(0);
      return [...document.querySelectorAll('.tour-stop')].map(s => {
        const cs = s.querySelector('.cstars');
        return {
          lvl: Number(s.dataset.lvl) - first + 1,
          staat: s.classList.contains('locked') ? 'locked'
            : s.classList.contains('next') ? 'next'
            : s.classList.contains('perfect') ? 'perfect' : 'done',
          plekken: cs ? cs.children.length : 0,
          vol: cs ? cs.querySelectorAll('.cs-vol').length : 0,
          leeg: cs ? cs.querySelectorAll('.cs-leeg').length : 0,
        };
      });
    });
    const gespeeld = r.filter(x => x.lvl <= 5);
    check(gespeeld.every(x => x.plekken === 3),
      'elke gespeelde halte toont drie sterplekken', JSON.stringify(gespeeld));
    check(gespeeld.map(x => x.vol).join(',') === '3,2,1,0,3',
      'er staan precies zoveel volle sterren als er verdiend zijn', JSON.stringify(gespeeld.map(x => x.vol)));
    check(gespeeld.every(x => x.vol + x.leeg === 3),
      'wat niet verdiend is staat er als lege ster', JSON.stringify(gespeeld));
    check(r.filter(x => x.lvl > 5).every(x => x.plekken === 0),
      'een halte zonder score toont geen sterrenrij', JSON.stringify(r.filter(x => x.lvl > 5)));
    check(r[0].staat === 'perfect' && r[4].staat === 'perfect' && r[5].staat === 'next'
      && r[6].staat === 'locked',
      'de vier voortgangsstaten staan waar ze horen', JSON.stringify(r.map(x => x.staat)));
    await c.close();
  }

  /* ========== 7e-ter · Een halte op slot is dicht ==========
   * Een halte op slot was jarenlang half doorzichtig, en dat kostte precies de twee
   * dingen waarvoor een halte op de kaart staat. De tekening praatte erdoorheen (op
   * de Snoepwereld een lolly, op de IJswereld een waterval), en de gestippelde weg
   * liep er dwars doorheen -- dus een route die naar een bestemming hoort te leiden
   * liep er in plaats daarvan overheen.
   *
   * Dat is met opzet níet opgelost met een masker maar met een dekkende vulling: de
   * haltes liggen al bóven de weg-SVG, dus zodra de vulling dekt houdt de weg
   * vanzelf bij de ene rand op en gaat aan de andere kant verder. Dat is één regel
   * CSS, en dat is precies wat deze test bewaakt -- want "dekkend" is een van die
   * eigenschappen die je bij de volgende kleurronde ongemerkt weer kwijtraakt.
   *
   * Gemeten en niet aangenomen: knip het rondje uit een échte schermafdruk, en kijk
   * naar een ring binnen de vulling -- buiten het cijfer, binnen de rand. Twee
   * dingen moeten daar waar zijn:
   *   1. binnen één halte liggen de kleuren dicht bij elkaar (alleen het flauwe
   *      verloop van boven naar beneden); er ligt dus geen tekening en geen weg in
   *   2. álle haltes op slot, in álle werelden, hebben dezelfde kleur; de vulling
   *      hangt dus nergens meer af van wat eronder ligt
   * Ter ijking: met de half doorzichtige vulling van hiervóór was de spreiding
   * binnen één halte 34-65 en liepen de gemiddelden van rgb(52,45,98) tot
   * rgb(131,101,105) uiteen. */
  {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await cacheFonts(c);
    const page = await c.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    await page.goto(APP_URL + '&demo&star=p1&screen=map');
    await page.waitForTimeout(400);
    const gemeten = [];
    const aantal = await page.evaluate(() => WORLDS.length);
    for (let wi = 0; wi < aantal; wi++) {
      /* renderTourMap rechtstreeks en niet via goMap(): die laatste laat de
         wereldnaam over de kaart vallen, en zolang die vlag nog vervaagt meet je
         hem mee. */
      const vakken = await page.evaluate((wi) => {
        const p = P(), first = WORLD_START[wi];
        p.stars = {};
        for (let i = 0; i < wi; i++)
          for (let l = WORLD_START[i]; l < WORLD_START[i] + WORLDS[i].levels; l++) p.stars[l] = 3;
        for (let k = 0; k < 4; k++) p.stars[first + k] = 2;
        p.level = first + 4;
        viewWorldIdx = wi;
        renderMapTitle(p);
        renderTourMap(0);
        // zij staat op de huidige halte en is groter dan een halte: waar ze over een
        // halte op slot heen valt, meet je haar en niet de vulling
        const h = document.querySelector('.tour-hero');
        const hr = h ? h.getBoundingClientRect() : null;
        return [...document.querySelectorAll('.tour-stop.locked .dot')].map(d => {
          const r = d.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height,
            botst: !!hr && r.left < hr.right && r.right > hr.left && r.top < hr.bottom && r.bottom > hr.top };
        }).filter(r => !r.botst && r.y > 70 && r.y + r.h < 744 && r.x > 0 && r.x + r.w < 390);
      }, wi);
      for (const r of vakken.slice(0, 2)) {
        const beeld = await page.screenshot({ clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
        const m = await page.evaluate(async (src) => {
          const img = new Image();
          await new Promise(ok => { img.onload = ok; img.src = src; });
          const cv = document.createElement('canvas');
          cv.width = img.width; cv.height = img.height;
          const g = cv.getContext('2d');
          g.drawImage(img, 0, 0);
          const d = g.getImageData(0, 0, cv.width, cv.height).data;
          const cx = cv.width / 2, cy = cv.height / 2;
          const binnen = cv.width * 0.34, buiten = cv.width * 0.44;
          const px = [];
          for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
            const dx = x - cx, dy = y - cy, af = Math.hypot(dx, dy);
            if (af < binnen || af > buiten) continue;
            const i = (y * cv.width + x) * 4;
            px.push([d[i], d[i + 1], d[i + 2]]);
          }
          const gem = [0, 1, 2].map(j => px.reduce((s, q) => s + q[j], 0) / px.length);
          const afw = px.map(q => Math.max(...[0, 1, 2].map(j => Math.abs(q[j] - gem[j])))).sort((a, b) => a - b);
          return { gem: gem.map(v => Math.round(v)), spreiding: Math.round(afw[Math.floor(afw.length * 0.95)]) };
        }, 'data:image/png;base64,' + beeld.toString('base64'));
        gemeten.push({ wereld: wi + 1, ...m });
      }
    }
    const vuil = gemeten.filter(x => x.spreiding > 20);
    check(gemeten.length >= aantal, 'er viel in elke wereld een halte op slot te meten',
      gemeten.length + ' haltes voor ' + aantal + ' werelden');
    check(vuil.length === 0, 'er ligt geen tekening en geen weg binnen een halte op slot',
      JSON.stringify(vuil));
    const spreid = [0, 1, 2].map(j => {
      const w = gemeten.map(x => x.gem[j]);
      return Math.max(...w) - Math.min(...w);
    });
    check(Math.max(...spreid) <= 12, 'een halte op slot heeft in élke wereld dezelfde kleur',
      'spreiding per kanaal ' + JSON.stringify(spreid) + ' — ' + JSON.stringify(gemeten));
    await c.close();
  }

  /* ========== 7f · De zijsporen dekken geen halte af ==========
   * Over de kaart zweven twee knoppen die niet bij de route horen: het memory-spel
   * rechtsonder en (alleen als je in een ándere wereld kijkt) de weg terug midden
   * onderaan. Ze staan op vaste schermplekken, de haltes op percentages van de
   * tekening -- die twee stelsels schuiven onafhankelijk van elkaar, dus "het past
   * nu" is geen garantie dat het over een wereld verder nog past.
   *
   * Wat hier te garanderen viel, en wat niet. De navigatiebalk plus de veilige zone
   * laten onderaan een band van 14px (iPhone SE) tot 38px (Pixel) over. Elke knop
   * die daar zweeft is hoger dan die band, dus "helemaal vrij van elke halte" is op
   * een korte telefoon geometrisch onmogelijk zonder de haltes te verplaatsen of de
   * navigatie te verbouwen -- en dat hoort geen van beide bij een polijstslag.
   *
   * Wat wél altijd waar moet zijn, en wat deze test bewaakt:
   *   1. het hart van elke halte is vrij -- de halte blijft herkenbaar én tikbaar
   *   2. het hart van het sterrentabje is vrij -- de score blijft leesbaar
   *   3. de overlap met het zichtbare blokje blijft binnen een opgemeten marge
   *
   * FASE 7A -- de kaart wordt nu per wereld op scrollTop 0 gezet, en dát is het
   * hele verschil. Hiervoor deed deze test dat niet: de eerste opbouw bij het
   * laden schoof de kaart op een kort scherm 49px omhoog (renderTourMap zet de
   * halte waar je nu staat in beeld), en die 49px bleven staan terwijl de test
   * daarna wereld na wereld opnieuw tekende. Alles werd dus gemeten in een stand
   * die de app zelf nooit aanneemt als je erheen loopt -- en precies die 49px
   * verborgen dat op 320x568 het memoryknopje het hárt van halte 26 afdekte.
   * Nagelopen met elementFromPoint: een tik daarop startte het memoryspel. Nu
   * wordt gemeten waar de kaart écht tot stilstand komt.
   *
   * Sindsdien is het memoryknopje op een kort scherm zijn woord kwijt (zie
   * .mem-fab in index.html) en is de terug-pil daar een maatje kleiner. Stand na
   * die ingreep, opgemeten over alle werelden en de standaardslinger: 21:9 0%,
   * iPhone 14 2% (ijs halte 33 achter het memoryknopje), iPhone SE 17% (piraten
   * halte 26, hetzelfde knopje -- dáár is het scherm hoog genoeg om niet te
   * krimpen) en 320px 27%. Die laatste is de standaardslinger, die zijn eerste
   * halte precies middenonder zet, pal achter de terug-pil.
   *
   * Die marge van 30% komt dus uit de meting, niet uit een gevoel. Hij staat er
   * zodat een nieuwe wereld, een grotere knop of een ander toestel opvalt vóórdat
   * een kind een halte niet meer kan vinden.
   *
   * Punt 1 en 2 gelden hard voor elke geschréven wereld. Voor de standaardslinger
   * geldt alleen de marge: die zet halte 1 middenonder en de terug-pil staat daar
   * ook -- dat is niet op te lossen zonder de haltes te verplaatsen of de navigatie
   * te verbouwen, en het is bovendien een noodlayout die in de app alleen voorkomt
   * bij een wereld zonder eigen haltelijst.  */
  {
    const GRENS = 30;   // procent van het zichtbare blokje; zie hierboven
    for (const [naam, w, h] of [['kleine telefoon', 320, 568], ['iPhone SE', 375, 667],
                                ['iPhone 14', 390, 844], ['21:9', 412, 961]]) {
      const c = await browser.newContext({ viewport: { width: w, height: h } });
      await cacheFonts(c);
      const page = await c.newPage();
      page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
      // p2 speelt het telspoor: daar staat de memory-knop aan
      await page.goto(APP_URL + '&demo&star=p2&screen=map');
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => {
        const doos = el => { const q = el.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom]; };
        const snij = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]))
          * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
        const uit = { memZichtbaar: false, hart: [], tab: [], ergste: 0, ergsteWie: '-' };
        const fab = document.getElementById('mem-fab');
        uit.memZichtbaar = getComputedStyle(fab).display !== 'none';
        /* Op een kort scherm raakt de knop zijn woord kwijt (zie .mem-fab) -- maar
           nooit wat hij oplevert: dat is de belofte waarvoor het bedrag erop kwam
           te staan. Met de verkeerde selector (span i.p.v. > span) verdwijnt het
           getal mee en staat er "💎" zonder cijfer. */
        uit.memBedrag = /💎\s*\d+/.test(fab.innerText.replace(/\n/g, ' '));
        // één ronde extra op de standaardslinger -- zie 7e, hetzelfde recept
        const tot = WORLDS.length + 1;
        for (let wi = 0; wi < tot; wi++) {
          const slinger = wi >= WORLDS.length;
          const wx = Math.min(wi, WORLDS.length - 1);
          const bewaard = slinger ? { n: WORLDS[wx].nodes, c: WORLDS[wx].curve } : null;
          if (slinger) { delete WORLDS[wx].nodes; delete WORLDS[wx].curve; }
          const p = P(), first = WORLD_START[wx];
          p.level = first + 5;
          p.stars = {}; [3, 3, 1, 2, 0].forEach((s, i) => { p.stars[first + i] = s; });
          viewWorldIdx = wx; renderMapTitle(p); renderTourMap(0);
          /* Waar de kaart écht tot stilstand komt als je hierheen loopt. Zonder deze
             regel erft elke wereld de schuifstand van de vorige opbouw; zie de kop. */
          document.getElementById('tour-map').scrollTop = 0;
          const id = worldForIndex(wx).world.id + (slinger ? '(slinger)' : '');
          const wb = document.getElementById('world-back');
          const zij = [{ id: 'memory', box: doos(fab) }];
          // even doen alsof ze in een andere wereld speelt, zodat de weg terug er ook staat
          p.level = WORLD_START[(wx + 1) % WORLDS.length] + 1;
          renderMapTitle(p);
          if (!wb.hidden) zij.push({ id: 'terug', box: doos(wb) });
          p.level = first + 5; renderMapTitle(p);
          document.querySelectorAll('.tour-stop').forEach(s => {
            const d = doos(s.querySelector('.dot'));
            const cs = s.querySelector('.cstars');
            const zicht = cs
              ? [Math.min(d[0], doos(cs)[0]), d[1], Math.max(d[2], doos(cs)[2]), doos(cs)[3]]
              : d;
            const opp = (zicht[2] - zicht[0]) * (zicht[3] - zicht[1]);
            const punt = (box, x, y) => x > box[0] && x < box[2] && y > box[1] && y < box[3];
            zij.forEach(z => {
              if (!slinger && punt(z.box, (d[0] + d[2]) / 2, (d[1] + d[3]) / 2)) uit.hart.push(id + ' h' + s.dataset.lvl + ' <> ' + z.id);
              if (cs && !slinger) {
                const cr = doos(cs);
                if (punt(z.box, (cr[0] + cr[2]) / 2, (cr[1] + cr[3]) / 2)) uit.tab.push(id + ' h' + s.dataset.lvl + ' <> ' + z.id);
              }
              const pct = opp ? snij(z.box, zicht) / opp * 100 : 0;
              if (pct > uit.ergste) { uit.ergste = pct; uit.ergsteWie = id + ' h' + s.dataset.lvl + ' <> ' + z.id; }
            });
          });
          if (slinger) { WORLDS[wx].nodes = bewaard.n; WORLDS[wx].curve = bewaard.c; }
        }
        uit.ergste = Math.round(uit.ergste);
        return uit;
      });
      check(r.memZichtbaar, 'de memory-knop staat op de kaart van een telster — ' + naam, '');
      check(r.memBedrag, 'de memory-knop noemt wat hij oplevert, ook als het woord eraf valt — ' + naam, '');
      check(r.hart.length === 0, 'geen zwevende knop dekt het hart van een halte af — ' + naam,
        r.hart.join(', '));
      check(r.tab.length === 0, 'geen zwevende knop dekt een sterrentabje af — ' + naam,
        r.tab.join(', '));
      check(r.ergste <= GRENS, 'de overlap van een zwevende knop blijft binnen de marge — ' + naam,
        r.ergste + '% bij ' + r.ergsteWie + ' (marge ' + GRENS + '%)');
      await c.close();
    }
  }

  /* ========== 7g · De wereldtekening dekt het scherm, hoe je ook schuift ==========
   * FASE 7A. Op een kort scherm (max-height 620) stond onder het kader 48px lege
   * ruimte in het scrollvak. Schoof je naar beneden, dan schoof de wereld die 48px
   * het beeld uit en stond daar de achtergrond van de app: een egale roze-paarse
   * band onderaan, met een kaarsrechte rand waar de tekening ophield. In élke
   * wereld dezelfde kleur eronder -- want die kleur was <body>, niet de wereld.
   *
   * De regel die dat voorkomt is er één en hij geldt overal: .world-frame is nooit
   * lager dan het scrollvak, en er staat níéts onder het kader. Op élke schuifstand
   * is dus elke pixel van het scherm wereld.
   *
   * Gemeten op de twee uitersten van het schuifbereik, want daartussen kan het niet
   * misgaan: het kader is één blok dat alleen omhoog en omlaag gaat. De maten zijn
   * die waar iets ánders gebeurt -- 320x568 is het kortste scherm (daar viel het
   * gat), 390x844 de gewone telefoon, 768x1024 de tablet (daar schuift het kader
   * écht) en 844x390 de telefoon op zijn kant.                                    */
  {
    for (const [naam, w, h] of [['kleine telefoon', 320, 568], ['iPhone SE', 375, 553],
                                ['iPhone 14', 390, 844], ['21:9', 412, 915],
                                ['tablet staand', 768, 1024], ['telefoon liggend', 844, 390]]) {
      const c = await browser.newContext({ viewport: { width: w, height: h } });
      await cacheFonts(c);
      const page = await c.newPage();
      page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
      await page.goto(APP_URL + '&demo&star=p1&screen=map');
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => {
        const map = document.getElementById('tour-map');
        const gaten = [];
        for (let i = 0; i < WORLDS.length; i++) {
          const p = P(), first = WORLD_START[i];
          p.level = first + 5; p.stars = {};
          [3, 3, 1, 2, 0].forEach((s, n) => { p.stars[first + n] = s; });
          viewWorldIdx = i; renderMapTitle(p); renderTourMap(0);
          [0, map.scrollHeight].forEach(y => {
            map.scrollTop = y;
            const f = document.querySelector('.world-frame').getBoundingClientRect();
            /* In liggende stand is het kader met opzet een podium mét rand -- daar
               ligt de onscherpe wereld eronder (#screen-map::before/::after) en is
               "dekt het scherm" een andere vraag. Die stand slaan we hier over. */
            if (matchMedia('(min-aspect-ratio: 1/1) and (min-height: 600px)').matches) return;
            if (f.top > 0.5 || f.bottom < innerHeight - 0.5 || f.left > 0.5 || f.right < innerWidth - 0.5) {
              gaten.push(WORLDS[i].id + ' bij scroll ' + map.scrollTop + ': kader '
                + Math.round(f.top) + '-' + Math.round(f.bottom) + ' in ' + innerHeight);
            }
          });
        }
        return gaten;
      });
      check(r.length === 0, 'de wereldtekening dekt het scherm op elke schuifstand — ' + naam,
        r.join(' | '));
      await c.close();
    }
  }

  /* ========== 7h · De wereldpil is één knop, met een kindermaat ==========
   * De wereldnaam in de kop is de ingang naar de hele tournee (PS-11: sinds die
   * ronde met een eigen "Werelden"-cta-zone en chevron erachter). Drie dingen
   * moeten daarvoor waar zijn, en ze waren het alledrie niet altijd:
   *   1. de naam, de cta-zone én het chevrontje horen bij dezelfde knop -- een
   *      icoontje dat eruitziet als een knop en het niet is, is erger dan geen
   *      icoontje
   *   2. het raakvlak is minstens 44px hoog; de pil zelf is 34px, dus daar hoort
   *      een onzichtbaar vlakje omheen (FASE 7A -- .world-pick::before)
   *   3. de twee pillen ernaast blijven aanraakbaar: dat vlakje mag niets afpakken
   * Over alle werelden, want de naam bepaalt de breedte.                         */
  {
    for (const [naam, w, h] of [['kleine telefoon', 320, 568], ['iPhone 14', 390, 844],
                                ['21:9', 412, 915], ['tablet staand', 768, 1024]]) {
      const c = await browser.newContext({ viewport: { width: w, height: h } });
      await cacheFonts(c);
      const page = await c.newPage();
      page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
      await page.goto(APP_URL + '&demo&star=p1&screen=map');
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => {
        const uit = { kleinste: Infinity, ico: [], buren: [], wie: '-' };
        const pil = document.getElementById('map-tournee-label');
        for (let i = 0; i < WORLDS.length; i++) {
          viewWorldIdx = i; renderMapTitle(P());
          const d = pil.getBoundingClientRect();
          const cx = d.left + d.width / 2, cy = d.top + d.height / 2;
          const raak = (x, y) => {
            const e = document.elementFromPoint(x, y);
            return !!(e && e.closest && e.closest('#map-tournee-label'));
          };
          let t = 0, b = 0;
          while (t < 120 && raak(cx, cy - t - 1)) t++;
          while (b < 120 && raak(cx, cy + b + 1)) b++;
          if (t + b < uit.kleinste) { uit.kleinste = t + b; uit.wie = WORLDS[i].id; }
          // het chevrontje van de cta-zone hoort bij dezelfde knop als de naam
          const svg = pil.querySelector('.wp-chev');
          const sr = svg && svg.getBoundingClientRect();
          if (!sr || !raak(sr.left + sr.width / 2, sr.top + sr.height / 2)) uit.ico.push(WORLDS[i].id);
          // en de buren blijven van zichzelf
          [['.map-id-btn', document.querySelector('#screen-map .map-id-btn')],
           ['.diamond-badge', document.querySelector('#screen-map .diamond-badge')]].forEach(([nm, el]) => {
            const q = el.getBoundingClientRect();
            const e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
            if (!(e && e.closest && e.closest(nm))) uit.buren.push(WORLDS[i].id + ' ' + nm);
          });
        }
        return uit;
      });
      check(r.kleinste >= 44, 'het raakvlak van de wereldpil is minstens 44px hoog — ' + naam,
        r.kleinste + 'px bij ' + r.wie);
      check(r.ico.length === 0, 'het chevrontje opent dezelfde tournee als de naam — ' + naam,
        r.ico.join(', '));
      check(r.buren.length === 0, 'de wereldpil pakt geen tik af van het portret of de diamanten — ' + naam,
        r.buren.join(', '));
      // en hij doet ook echt wat hij belooft
      await page.click('#map-tournee-label');
      await page.waitForTimeout(500);
      const reis = await page.evaluate(() => !!document.querySelector('#screen-journey.active'));
      check(reis, 'een tik op de wereldpil opent de tournee — ' + naam, '');
      await c.close();
    }
  }

  /* ================= 7d · Perfecte werelden =================
   * Eén trofee per wereld, en het is gewoon een trofee -- geen tweede badgesysteem.
   * Wat hier vast moet liggen: dat de plank meegroeit met WORLDS, dat hij pas
   * aangaat bij drie sterren op élke show, en dat de trofee zijn eigen wereld kent
   * (daar tekent de kast het medaillon mee).
   *
   * Fase 5C haalde de tweede trofee per wereld weg -- "deze wereld uit" -- omdat
   * een uitgespeelde wereld al een spulletje oplevert. Dat is hier meteen de vraag
   * die eronder staat: een wereld met twee sterren per show levert géén trofee op
   * en legt er ook niets voor klaar.                                            */
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
      const plank = TROPHY_SHELVES.filter(sh => sh.key === 'perfect')[0];
      const q = P();
      // wereld 1 uit, maar met twee sterren per show: uit is niet perfect
      for (let l = 1; l <= 8; l++) q.stars[l] = 2;
      q.level = 9;
      const klaarUit = checkTrophies(q).map(t => t.id);
      const trofee = TROPHIES.filter(t => t.id === 'perfect-' + WORLDS[0].id)[0];
      const tweeSterren = trofee.has(q);
      for (let l = 1; l <= 8; l++) q.stars[l] = 3;
      const klaarPerfect = checkTrophies(q).map(t => t.id);
      return {
        plankNaam: plank.name,
        perWereld: plank.ids.length === WORLDS.length,
        ids: plank.ids.join(','),
        allemaalInTabel: plank.ids.every(id => TROPHIES.some(t => t.id === id)),
        geenBadgeMeer: !TROPHIES.some(t => t.id.indexOf('wereld-') === 0),
        geenBadgeKlaar: klaarUit.every(id => id.indexOf('wereld-') !== 0),
        tweeSterren,
        drieSterren: trofee.has(q),
        klaargelegd: klaarPerfect.indexOf('perfect-' + WORLDS[0].id) >= 0,
        kentZijnWereld: !!trofee.wereld && trofee.wereld.id === WORLDS[0].id,
        tweedeNogNiet: TROPHIES.filter(t => t.id === 'perfect-' + WORLDS[1].id)[0].has(q),
      };
    });
    check(r.perWereld, 'er is precies één perfecte-wereldtrofee per wereld', r.ids);
    check(r.allemaalInTabel, 'elke perfecte-wereldtrofee staat ook in de trofeetabel', r.ids);
    check(r.geenBadgeMeer, 'de losse "wereld uit"-badges staan niet meer in de kast', r.ids);
    check(r.geenBadgeKlaar, 'een wereld uitspelen legt geen badge meer klaar', r.ids);
    check(r.tweeSterren === false && r.drieSterren === true,
      'de trofee gaat pas aan bij drie sterren op elke show',
      'twee: ' + r.tweeSterren + ' drie: ' + r.drieSterren);
    check(r.klaargelegd, 'en dan ligt hij klaar om te openen', r.ids);
    check(r.kentZijnWereld, 'de trofee weet bij welke wereld hij hoort', r.ids);
    check(r.tweedeNogNiet === false, 'de trofee van de volgende wereld blijft dicht', String(r.tweedeNogNiet));
    await ctx.close();
  }

  /* ================= 7g · Fase 2: de fundering =================
   * Drie dingen die fase 2 heeft neergezet en die fase 3 (thema-schermen,
   * overgangen, wereldbeloningen) er kapot op kan maken zonder het te merken:
   *
   *   worldProgress()  de één plek die p.stars per wereld optelt. Elk scherm en
   *                    elke trofee leest hieruit; twee kopieën die uit elkaar lopen
   *                    is precies wat dit moet voorkomen.
   *   showWorld()      kop en kaart kijken samen naar dezelfde wereld. Waren vier
   *                    losse regels, en één vergeten regel laat de pil iets anders
   *                    noemen dan wat eronder staat.
   *   openOverlay()    elke zwevende laag draagt .rp-overlay en een _close, en
   *                    terug sluit de bóvenste. Vergeten = de Android-terugknop
   *                    springt door de laag heen naar het vorige scherm.
   *
   * En als vierde: een gepensioneerde trofee (Looks/Podiumbouwer) die nog in een
   * bestaande save staat mag niets breken -- de definities zijn weg, de id's niet. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => {
      const q = defaultProfile('Fien', 'dress_roze');
      // een save van vóór fase 1: twee trofeeën die niet meer bestaan, één die nog wel
      q.trophies = ['first', 'rockster', 'podiumbouwer'];
      q.readyTrophies = ['discodiva'];
      localStorage.setItem('rekenPopsterren_v1',
        JSON.stringify({ sound: true, haptics: true, schemaV: 3, profiles: { p1: q } }));
    });
    await page.reload();
    await page.waitForTimeout(300);
    await page.evaluate(() => selectProfile('p1'));
    await page.waitForTimeout(400);

    const r = await page.evaluate(() => {
      const q = P();
      const uit = {};

      // -- gepensioneerde trofeeën: bewaard, maar onzichtbaar --
      uit.behaaldBewaard = q.trophies.indexOf('rockster') >= 0 && q.trophies.indexOf('podiumbouwer') >= 0;
      uit.klaarOpgeruimd = q.readyTrophies.indexOf('discodiva') < 0;
      uit.geenDefinitie = !TROPHIES.some(t => t.id === 'rockster' || t.id === 'podiumbouwer');
      uit.nietGeteld = earnedActiveCount(q) === 1;   // alleen 'first' telt mee
      uit.nietOpEenPlank = !TROPHY_SHELVES.some(sh => sh.ids.some(id => id === 'rockster' || id === 'podiumbouwer'));

      // -- worldProgress: één bron voor wat een wereld waard is --
      const w1 = worldForIndex(0);
      q.stars = {};
      for (let l = w1.first; l < w1.first + w1.levels; l++) q.stars[l] = 3;
      q.stars[w1.first + 1] = 1;                     // één show op één ster
      const v = worldProgress(q, w1);
      uit.pgGespeeld = v.gespeeld === w1.levels;
      uit.pgPerfect = v.perfect === w1.levels - 1;
      uit.pgSterren = v.sterren === (w1.levels - 1) * 3 + 1;
      uit.pgMax = v.max === w1.levels * 3;
      uit.pgUit = v.uit === true && v.vol === false;
      // dezelfde vraag via de perfecte-wereldtrofee en via de oude sterrenteller
      const trofee = TROPHIES.filter(t => t.id === 'perfect-' + WORLDS[0].id)[0];
      uit.badgeVolgt = trofee.has(q) === v.vol;
      uit.tellerVolgt = worldProgress(q, w1).sterren === v.sterren;
      q.stars[w1.first + 1] = 3;
      uit.pgVol = worldProgress(q, w1).vol === true;

      // -- showWorld: kop en kaart wijzen naar dezelfde wereld --
      q.level = 1;
      const laatste = WORLDS.length - 1;
      showWorld(laatste);
      uit.idx = viewWorldIdx === laatste;
      uit.kop = document.getElementById('map-tournee-label').textContent
        .indexOf(WORLDS[laatste].name) >= 0;
      uit.haltes = document.querySelectorAll('.tour-stop').length === WORLDS[laatste].levels;
      uit.eersteHalte = Number(document.querySelector('.tour-stop').dataset.lvl) === WORLD_START[laatste];
      // en terug naar de eigen wereld via de gouden pil onderaan
      document.getElementById('world-back').onclick();
      uit.terug = viewWorldIdx === 0
        && document.getElementById('map-tournee-label').textContent.indexOf(WORLDS[0].name) >= 0;
      return uit;
    });

    check(r.behaaldBewaard, 'een behaalde Looks/Podium-trofee blijft in de save staan', JSON.stringify(r));
    check(r.klaarOpgeruimd, 'een gepensioneerde trofee blijft niet als "klaar" liggen', JSON.stringify(r));
    check(r.geenDefinitie, 'de gepensioneerde definities zijn uit de tabel', JSON.stringify(r));
    check(r.nietGeteld, 'een gepensioneerde trofee telt niet mee in de kastteller', JSON.stringify(r));
    check(r.nietOpEenPlank, 'geen enkele plank verwijst nog naar een gepensioneerde trofee', JSON.stringify(r));
    check(r.pgGespeeld && r.pgPerfect && r.pgSterren && r.pgMax && r.pgUit,
      'worldProgress telt gespeeld, perfect en sterren per wereld', JSON.stringify(r));
    check(r.badgeVolgt && r.tellerVolgt,
      'de perfecte-wereldtrofee en de sterrenteller lezen dezelfde bron', JSON.stringify(r));
    check(r.pgVol, 'drie sterren op elke show maakt de wereld vol', JSON.stringify(r));
    check(r.idx && r.kop && r.haltes && r.eersteHalte,
      'showWorld zet kop én kaart op dezelfde wereld', JSON.stringify(r));
    check(r.terug, 'de weg terug brengt kop en kaart samen terug', JSON.stringify(r));
    await ctx.close();
  }

  /* ========== 7h · Terug sluit de bóvenste zwevende laag ========== */
  {
    const { ctx, page } = await fresh();
    await page.goto(APP_URL + '&demo&star=p1&screen=tro');
    await page.waitForTimeout(400);
    const r = await page.evaluate(async () => {
      const wacht = ms => new Promise(res => setTimeout(res, ms));
      const uit = {};
      openCareer();                                   // laag 1
      await wacht(120);
      uit.eenLaag = document.querySelectorAll('.rp-overlay').length === 1;
      uit.heeftClose = typeof document.querySelector('.rp-overlay')._close === 'function';
      celebrateTrophy({ emoji: '\ud83c\udfc6', name: 'Test' });   // laag 2, er bovenop
      await wacht(120);
      uit.tweeLagen = document.querySelectorAll('.rp-overlay').length === 2;
      // terug hoort de bóvenste (de trofee) te pakken, niet de onderste
      uit.bovensteEerst = backTarget() === document.querySelector('.trophy-pop-overlay')._close;
      backTarget()();
      await wacht(450);
      uit.trofeeWeg = !document.querySelector('.trophy-pop-overlay');
      uit.ladderNog = !!document.querySelector('.career-overlay');
      uit.danDeLadder = backTarget() === document.querySelector('.career-overlay')._close;
      backTarget()();
      await wacht(400);
      uit.allesWeg = document.querySelectorAll('.rp-overlay').length === 0;
      uit.daarnaScherm = backTarget() === goMap;      // de kast zelf is nu aan de beurt
      return uit;
    });
    check(r.eenLaag && r.heeftClose, 'openOverlay hangt één laag op met een eigen sluiting', JSON.stringify(r));
    check(r.tweeLagen, 'twee lagen kunnen over elkaar staan', JSON.stringify(r));
    check(r.bovensteEerst && r.trofeeWeg && r.ladderNog,
      'terug sluit eerst de bovenste laag', JSON.stringify(r));
    check(r.danDeLadder && r.allesWeg, 'daarna pas de laag eronder', JSON.stringify(r));
    check(r.daarnaScherm, 'en pas als alles dicht is telt het scherm zelf mee', JSON.stringify(r));
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

  /* 11a · zonder keuze geen ster -- maar wél een antwoord op de tik
   *
   * FASE 6C. De knop staat nog steeds uit (grijs, en er komt geen ster van), maar
   * hij is geen <button disabled> meer: die krijgt in geen enkele browser een
   * click-gebeurtenis, en dus was Klaar de enige knop in de app waar tikken
   * letterlijk niets teruggaf -- precies op het moment dat een kind niet weet wat
   * er nog mist. Nu zegt de tik het: het veld dat aan de beurt is gaat kloppen
   * (.vraagt) en er staat één regel in beeld.
   *
   * De tik gaat hier met dispatchEvent en niet met page.click(): playwright
   * weigert een element met aria-disabled="true" aan te klikken, en dát is precies
   * de markering die dit gedrag draagt. */
  {
    const { ctx, page } = await fresh();
    await page.click('#btn-newstar');
    await page.waitForTimeout(150);
    await page.fill('#newstar-name', 'Zonder');
    const r = await page.evaluate(() => ({
      aria: document.getElementById('newstar-go').getAttribute('aria-disabled'),
      dood: document.getElementById('newstar-go').disabled,
      chips: document.querySelectorAll('#newstar-base .chip').length,
      gekozen: document.querySelectorAll('#newstar-base .chip.on').length,
    }));
    check(r.chips === 2, 'het formulier biedt twee basisfiguren', `chips=${r.chips}`);
    check(r.gekozen === 0, 'geen enkele basis staat voorgekozen', `aan=${r.gekozen}`);
    check(r.aria === 'true', 'met een naam maar zonder basis staat Klaar uit', `aria=${r.aria}`);
    check(!r.dood, 'maar hij is niet dood: de tik komt binnen', `disabled=${r.dood}`);
    const na = await page.evaluate(async () => {
      document.getElementById('newstar-go').click();
      await new Promise(r => setTimeout(r, 120));
      return {
        n: Object.keys(db.profiles).length,
        wijst: document.querySelectorAll('#newstar-base .chip.vraagt').length,
        naamWijst: document.getElementById('newstar-name').classList.contains('vraagt'),
        melding: document.getElementById('toast').textContent,
        opScherm: document.getElementById('screen-newstar').classList.contains('active'),
      };
    });
    check(na.n === 0 && na.opScherm, 'een geweigerde tik maakt geen ster', JSON.stringify(na));
    check(na.wijst === 2 && !na.naamWijst,
      'hij wijst de basiskeuze aan, niet de naam die al klopt', JSON.stringify(na));
    check(/wie je bent/i.test(na.melding), 'en zegt in één regel wat er gevraagd wordt', na.melding);
    // omgekeerd: basis gekozen, naam leeg -> dan wijst hij het naamveld aan
    await page.click('#newstar-base .chip[data-v="meisje"]');
    await page.fill('#newstar-name', '');
    const om = await page.evaluate(async () => {
      document.getElementById('newstar-go').click();
      await new Promise(r => setTimeout(r, 120));
      return {
        n: Object.keys(db.profiles).length,
        naamWijst: document.getElementById('newstar-name').classList.contains('vraagt'),
        basisWijst: document.querySelectorAll('#newstar-base .chip.vraagt').length,
        melding: document.getElementById('toast').textContent,
      };
    });
    check(om.n === 0 && om.naamWijst && om.basisWijst === 0,
      'zonder naam wijst hij het naamveld aan', JSON.stringify(om));
    check(/naam/i.test(om.melding), 'met een eigen regel erbij', om.melding);
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

  /* ================= De sterrenkeuze leeft =================
     Eén begroeting bij binnenkomst, en daarna af en toe één pop -- niet een rij
     tegels die een animatie draait. Wat hier vastligt is de dosering, want dát
     is het verschil tussen "iemand zegt hoi" en een schermbeveiliger:

       - bij binnenkomst groet iedereen, één keer, en daarna is het stil
       - hertekenen is geen binnenkomst (renderProfiles draait ook als er een
         ster bijkomt of wegvalt)
       - in de stilte beweegt er hoogstens één pop tegelijk, en nooit twee keer
         achter elkaar dezelfde
       - een tik wint het van een wachtend groetje
       - weglopen laat niets achter: geen timer, geen halve zwaai
       - zonder beweging gebeurt er niets, en staan de tegels er gewoon

     De rust staat in het echte spel op elf tot negentien seconden. Die worden
     hieronder kortgezet -- het gaat hier om de regels, niet om de klok. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => {
      const mk = (n, j) => { const q = defaultProfile(n, j); q.level = 3; q.stars = { 1: 3, 2: 2 }; return q; };
      db.profiles = { p1: mk('Roos', 'dress_roze'), p2: mk('Sem', 'dress_blauw'), p3: mk('Nina', 'dress_geel') };
      save();
    });
    await page.reload();
    await page.waitForTimeout(250);
    await page.evaluate(() => {
      // welk pasje doet elke pop op dit moment? '-' = ze staat gewoon
      window.__poppen = () => [...document.querySelectorAll('#profile-row .ster-tegel .avatar-holder')]
        .map(el => (el.className.match(/move-[a-z]+/) || ['-'])[0]);
      window.__volg = async (ms) => {
        const reeks = [];
        await new Promise(klaar => {
          const t0 = performance.now();
          const stap = () => {
            reeks.push(window.__poppen());
            if (performance.now() - t0 < ms) requestAnimationFrame(stap); else klaar();
          };
          requestAnimationFrame(stap);
        });
        return reeks;
      };
      window.__bewoog = reeks => reeks.some(r => r.some(x => x !== '-'));
      // de échte rusttijden, zodat een zaak die ze kortzet ze ook weer terug kan zetten
      window.__echteRust = { rustMin: LANDING.rustMin, rustMax: LANDING.rustMax };
    });

    const groet = await page.evaluate(async () => {
      goProfiles();
      const reeks = await window.__volg(2600);
      return {
        wie: [0, 1, 2].map(i => reeks.some(r => r[i] !== '-')),
        // elke pop begint op een ánder beeldje: de groet loopt door de rij
        starts: [0, 1, 2].map(i => reeks.findIndex(r => r[i] !== '-')),
        stilAanEind: reeks[reeks.length - 1].every(x => x === '-'),
      };
    });
    check(groet.wie.every(Boolean), 'bij binnenkomst groet elke ster één keer', JSON.stringify(groet));
    check(groet.starts[0] < groet.starts[1] && groet.starts[1] < groet.starts[2],
      'en ze doen het na elkaar, niet allemaal tegelijk', JSON.stringify(groet.starts));
    check(groet.stilAanEind, 'daarna is het stil -- de groet is geen lus', JSON.stringify(groet));

    const hertekend = await page.evaluate(async () => {
      renderProfiles();
      return window.__bewoog(await window.__volg(1800));
    });
    check(hertekend === false, 'de tegels opnieuw tekenen is geen nieuwe binnenkomst', String(hertekend));

    /* De stilte erna. Met korte rust gemeten, maar de regel die telt is dat er
       nooit twee poppen tegelijk bewegen -- en dat komt niet door de klok maar
       doordat de volgende stilte pas begint als het pasje uit is. */
    const rustig = await page.evaluate(async () => {
      LANDING.rustMin = 220; LANDING.rustMax = 380;
      goProfiles();
      await new Promise(r => setTimeout(r, 2400));   // de groet uitzitten
      const beurten = [], tegelijk = [];
      for (let i = 0; i < 150; i++) {
        await new Promise(r => setTimeout(r, 55));
        const aan = window.__poppen().map((x, n) => (x !== '-' ? n : -1)).filter(n => n >= 0);
        tegelijk.push(aan.length);
        if (aan.length && beurten[beurten.length - 1] !== aan[0]) beurten.push(aan[0]);
      }
      return { beurten, meerTegelijk: Math.max(...tegelijk) };
    });
    check(rustig.meerTegelijk <= 1, 'in de stilte beweegt er hoogstens één pop tegelijk',
      JSON.stringify(rustig));
    check(rustig.beurten.length >= 4 && rustig.beurten.every((b, i) => i === 0 || b !== rustig.beurten[i - 1]),
      'en nooit twee keer achter elkaar dezelfde', JSON.stringify(rustig.beurten));
    check(new Set(rustig.beurten).size > 1, 'het is ook niet steeds dezelfde ster',
      JSON.stringify(rustig.beurten));

    const tik = await page.evaluate(async () => {
      const kijk = async (ms) => {
        let gezien = 0;
        for (let i = 0; i < ms / 50; i++) {
          await new Promise(r => setTimeout(r, 50));
          if (document.querySelector('#profile-row .ster-tegel .avatar-holder.dancing')) gezien++;
        }
        return gezien;
      };
      LANDING.rustMin = 700; LANDING.rustMax = 750;
      goProfiles();
      await new Promise(r => setTimeout(r, 2200));
      const zonder = await kijk(1500);
      const tikken = () => document.getElementById('screen-profile')
        .dispatchEvent(new Event('pointerdown', { bubbles: true }));
      tikken();
      const bezig = setInterval(tikken, 300);
      const met = await kijk(1500);
      clearInterval(bezig);
      return { zonder, met };
    });
    check(tik.zonder > 0 && tik.met === 0, 'wie aan het kiezen is ziet geen pop bewegen',
      JSON.stringify(tik));

    /* ---- De sterretjes op de achtergrond ----
       Wat hier vastligt is de dosering, want die is het hele verschil tussen
       "sprankeling" en "een scherm dat stilstaat". Eerst hingen er twee vaste
       vonkjes aan het logo met elk een eeuwige animatie van 17 en 23 seconden;
       samen gaf dat er ongeveer één per acht seconden, met gaten van bijna tien
       seconden waarin er niets gebeurde. Vandaar dat er hier vooral op het
       grootste gat gelet wordt.

       Twintig seconden meten is genoeg: bij een sterretje per anderhalve tel
       zijn dat er een stuk of vijftien. */
    const sprankel = await page.evaluate(async () => {
      Object.assign(LANDING, window.__echteRust);
      goProfiles();
      await new Promise(r => setTimeout(r, 2600));    // de groet eerst uitzitten
      const vonken = [...document.querySelectorAll('.vonk-laag .vonk')];
      const rij = document.getElementById('profile-row').getBoundingClientRect();
      const raakt = (b, k) => !(b.right < k.left || b.left > k.right || b.bottom < k.top || b.top > k.bottom);
      const starts = [], tegelijk = [];
      let opTegel = 0, groot = 0, was = vonken.map(() => false);
      await new Promise(klaar => {
        const t0 = performance.now();
        const stap = () => {
          const t = performance.now() - t0;
          let aan = 0;
          vonken.forEach((v, i) => {
            const nu = v.classList.contains('aan');
            if (nu) aan++;
            if (nu && !was[i]) {
              starts.push(Math.round(t));
              if (raakt(v.getBoundingClientRect(), rij)) opTegel++;
              if (parseFloat(getComputedStyle(v).fontSize) >= 15) groot++;
            }
            was[i] = nu;
          });
          tegelijk.push(aan);
          if (t < 20000) requestAnimationFrame(stap); else klaar();
        };
        requestAnimationFrame(stap);
      });
      const gaten = starts.slice(1).map((t, i) => t - starts[i]);
      return { aantal: starts.length, grootsteGat: Math.max(...gaten),
               maxTegelijk: Math.max(...tegelijk), opTegel, groot,
               elementen: vonken.length };
    });
    check(sprankel.elementen === 3, 'er zijn drie sterretjes die hergebruikt worden',
      String(sprankel.elementen));
    check(sprankel.aantal >= 8, 'er sprankelt geregeld iets op de achtergrond',
      JSON.stringify(sprankel));
    check(sprankel.grootsteGat <= 3600, 'en nooit lang niets -- geen dood gat van tellen',
      JSON.stringify(sprankel));
    check(sprankel.maxTegelijk <= 3, 'maar nooit meer dan drie tegelijk',
      JSON.stringify(sprankel));
    check(sprankel.opTegel === 0, 'en nooit over een tegel heen: daar staan gezichten en namen',
      JSON.stringify(sprankel));
    check(sprankel.groot >= 1, 'de opvallende bij het logo komt op zijn eigen, tragere beurt',
      JSON.stringify(sprankel));

    const weg = await page.evaluate(async () => {
      goProfiles();
      await new Promise(r => setTimeout(r, 560));    // middenin de groet weglopen
      selectProfile('p1');
      await new Promise(r => setTimeout(r, 1400));
      return { timers: landingTimers.length, poppen: window.__poppen() };
    });
    check(weg.timers === 0 && weg.poppen.every(x => x === '-'),
      'weglopen laat geen timer en geen halve zwaai achter', JSON.stringify(weg));

    /* Zes keer snel in en uit hoort precies zoveel op te leveren als één keer
       binnenkomen. Dat wordt hier dan ook zo gemeten en niet tegen een vast
       getal: hoeveel lussen er lopen mag groeien (er kwamen sterretjes bij, en
       er kan later nog iets bij komen) -- wat niet mag groeien is het aantal
       kopieën ervan. */
    const snel = await page.evaluate(async () => {
      // de rust weer op zijn echte lengte: deze zaak gaat over de groet, en een
      // kortgezette stilte uit de vorige zaak zou er middenin vallen
      Object.assign(LANDING, window.__echteRust);
      const rustig = async () => {
        goProfiles();
        await new Promise(r => setTimeout(r, 2600));
        return landingTimers.length;
      };
      const eenmaal = await rustig();
      for (let i = 0; i < 6; i++) {
        goProfiles(); await new Promise(r => setTimeout(r, 80));
        selectProfile('p1'); await new Promise(r => setTimeout(r, 80));
      }
      const zesmaal = await rustig();
      return { eenmaal, zesmaal, poppen: window.__poppen() };
    });
    check(snel.zesmaal === snel.eenmaal && snel.poppen.every(x => x === '-'),
      'zes keer snel in en uit laat net zoveel lopen als één keer', JSON.stringify(snel));
    await ctx.close();
  }

  /* ---- en dit alles zonder beweging ---- */
  {
    const stilCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await cacheFonts(stilCtx);
    const st = await stilCtx.newPage();
    st.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    await st.goto(APP_URL);
    await st.evaluate(() => {
      localStorage.clear();
      const mk = (n, j) => { const q = defaultProfile(n, j); q.level = 3; q.stars = { 1: 3 }; return q; };
      db.profiles = { p1: mk('Roos', 'dress_roze'), p2: mk('Sem', 'dress_blauw') };
      save();
    });
    await st.goto(APP_URL);
    const stil = await st.evaluate(async () => {
      goProfiles();
      let bewoog = false;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 50));
        if (document.querySelector('#profile-row .ster-tegel .avatar-holder.dancing')) bewoog = true;
      }
      const pop = document.querySelector('#profile-row .ster-tegel .avatar-holder');
      return { bewoog, timers: landingTimers.length, klas: pop.className,
               tekening: !!pop.querySelector('svg'),
               vonkjes: document.querySelectorAll('.vonk-laag .vonk.aan').length,
               laag: getComputedStyle(document.querySelector('.vonk-laag')).display };
    });
    check(!stil.bewoog && stil.timers === 0,
      'zonder beweging wordt er niet gegroet en wacht er niets', JSON.stringify(stil));
    check(stil.klas === 'avatar-holder' && stil.tekening,
      'en de tegels staan er precies zoals ze horen te staan', JSON.stringify(stil));
    check(stil.vonkjes === 0 && stil.laag === 'none',
      'en er sprankelt niets op de achtergrond', JSON.stringify(stil));
    await stilCtx.close();
  }

  /* ================= Het spelogo komt binnen =================
     De intro bij het opstarten (zie "= Het spelogo komt binnen" in de app). Wat
     hier nagekeken wordt is niet hoe hij eruitziet maar wat hij níet mag: iets
     tegenhouden, de kop wegnemen, of blijven hangen. */
  {
    const staat = page => page.evaluate(() => {
      const kop = document.querySelector('#screen-profile .spellogo');
      const img = kop.querySelector('img'), cs = getComputedStyle(img);
      return { laag: !!document.querySelector('.logo-intro'), wacht: kop.classList.contains('intro-wacht'),
               loopt: !!logoIntroLoopt, alt: img.alt, zicht: cs.visibility, weer: cs.display,
               schoon: !img.style.transform && !img.style.maskImage && !img.style.webkitMaskImage };
    });
    const heel = s => !s.laag && !s.wacht && !s.loopt && s.schoon;

    // onder ?debug (dus in elke andere suite) speelt hij niet
    const c1 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await cacheFonts(c1);
    const p1 = await c1.newPage();
    await p1.goto(APP_URL);
    await p1.waitForTimeout(150);
    const zonder = await staat(p1);
    check(heel(zonder), 'onder ?debug speelt de logo-intro niet', JSON.stringify(zonder));

    // met &intro wel -- en de kop blijft een kop
    await p1.goto(APP_URL + '&intro');
    await p1.waitForTimeout(250);
    const bezig = await staat(p1);
    check(bezig.loopt && bezig.laag, 'met &intro speelt de logo-intro', JSON.stringify(bezig));
    check(bezig.alt === 'Rekensterren' && bezig.zicht === 'visible' && bezig.weer !== 'none',
      'tijdens de intro blijft het logo de kop, leesbaar voor een schermlezer', JSON.stringify(bezig));
    const vangt = await p1.evaluate(() => getComputedStyle(document.querySelector('.logo-intro')).pointerEvents);
    check(vangt === 'none', 'wat er beweegt vangt geen tikken', vangt);

    // een tik, waar dan ook, maakt hem af: het logo staat er meteen heel
    await p1.evaluate(() => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    const getikt = await staat(p1);
    check(heel(getikt), 'een tik maakt de logo-intro meteen af', JSON.stringify(getikt));

    // en wie niets doet, ziet hem vanzelf ophouden
    await p1.goto(APP_URL + '&intro');
    await p1.waitForTimeout(3200);   // de intro duurt ruim twee seconden, plus het laden
    const af = await staat(p1);
    check(heel(af), 'de logo-intro ruimt zichzelf op', JSON.stringify(af));

    // eerst het logo, dan de poppen: de eerste zwaai komt pas als de laatste
    // letter staat (ruim anderhalve seconde na het begin van de intro), niet
    // door de intro heen
    await p1.goto(APP_URL + '&demo&intro');
    const volgorde = await p1.evaluate(async () => {
      const t0 = performance.now();
      let intro = null, zwaai = null;
      await new Promise(klaar => {
        (function stap() {
          const t = performance.now() - t0;
          if (intro == null && document.querySelector('.logo-intro')) intro = Math.round(t);
          if (zwaai == null && document.querySelector('#profile-row .avatar-holder[class*="move-"]')) zwaai = Math.round(t);
          if (t < 4000) requestAnimationFrame(stap); else klaar();
        })();
      });
      return { intro, zwaai };
    });
    check(volgorde.intro != null && volgorde.zwaai != null && volgorde.zwaai - volgorde.intro >= 1400,
      'de poppen zwaaien pas als het logo staat', JSON.stringify(volgorde));
    await c1.close();

    // wie geen beweging wil, krijgt hem nooit -- ook niet met &intro
    const c2 = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await cacheFonts(c2);
    const p2 = await c2.newPage();
    await p2.goto(APP_URL + '&intro');
    await p2.waitForTimeout(150);
    const stil = await staat(p2);
    check(heel(stil), 'zonder beweging geen logo-intro', JSON.stringify(stil));
    await c2.close();
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
