/*
 * Wereldbeloningen (fase 4D.1): wat krijg je als een wereld uit is, en wat als
 * hij perfect is?
 *
 * De afspraak is klein en moet klein blijven:
 *   wereld uit       -> het spulletje uit WORLDS.beloning, in de kleedkamer
 *   perfecte wereld  -> de trofee 'perfect-<wereld>', in de kast
 * en allebei precies één keer, hoe vaak een kind die wereld ook overspeelt.
 *
 * Wat hier vastligt zijn de gevallen waarin dat mis kan gaan:
 *   A  wereld uitspelen              -> één spulletje, geen perfecte-wereldtrofee
 *   B  daarna alles naar drie sterren -> de trofee erbij, geen tweede spulletje
 *   C  in één keer perfect uitspelen  -> één feestje met beide regels
 *   D  nog eens overspelen            -> niets erbij, geen feestje
 *   E  een save van vóór deze fase    -> alles stil met terugwerkende kracht
 *   F  twee sterren op één toestel    -> ieder haar eigen beloningen
 *   G  het schattenvak                -> te verdienen, niet te koop, nog geheim
 *   H  een wereld erbij               -> één regel configuratie, verder niets
 *   K  de onthulling                  -> één keer, met een knop om 'm aan te doen
 *   L  het teken op de kaart          -> één fonkeling, en alleen zolang er iets ligt
 *
 * Draaien:
 *   npm run test:beloning     (of: npm test voor alle suites)
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

  // Elke zaak begint met een schone opslag: de beloningen van de ene zaak mogen
  // nooit in de volgende opduiken.
  async function fresh(seed) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET/.test(m.text())) pageErrors.push('CONSOLE ' + m.text()); });
    await page.goto(APP_URL);
    await page.evaluate(() => localStorage.clear());
    if (seed) await page.evaluate(seed);
    await page.reload();
    await page.waitForTimeout(250);
    await page.evaluate(() => {
      /* Een show écht spelen en afsluiten -- dezelfde weg als een kind: startLevel
         zet G klaar, het aantal missers bepaalt de sterren (0 -> 3, 1 -> 2), en
         endLevel doet de rest. Bewust niet p.stars met de hand vullen: juist de
         overgang "was nog niet uit -> is nu uit" is wat hier getest wordt.

         De ster-status wordt uitgezet (rankSeen hoog): die heeft zijn eigen groot
         moment dat vóór het wereldfeest komt, en dan zou elke zaak op de klok van
         díe animatie moeten wachten i.p.v. op wat ze test. Zaak C kijkt apart of
         die twee elkaar netjes opvolgen.
         (Het feestje zelf komt 650 ms na endLevel -- zie endLevel.) */
      window.__speel = async (lvl, sterren) => {
        P().rankSeen = 99;
        startLevel(lvl);
        G.misses = sterren >= 3 ? 0 : sterren === 2 ? 1 : 2;
        endLevel(true);
        await new Promise(r => setTimeout(r, 900));
      };
      window.__speelWereld = async (i, sterren) => {
        const w = worldForIndex(i);
        for (let l = w.first; l < w.first + w.levels; l++) {
          await window.__speel(l, sterren);
          window.__sluitFeest();
        }
      };
      // Het feestje wegtikken, zoals een kind doet.
      window.__sluitFeest = () => {
        document.querySelectorAll('.wereld-feest-overlay').forEach(o => o._close && o._close());
      };
      // Wat er nú op het scherm staat aan wereldfeest.
      window.__feest = () => {
        const ov = document.querySelector('.wereld-feest-overlay:not(.closing)');
        if (!ov) return null;
        return {
          kop: ov.querySelector('.wf-kop').textContent,
          rijen: [...ov.querySelectorAll('.wf-rij b')].map(b => b.textContent),
          lagen: document.querySelectorAll('.wereld-feest-overlay:not(.closing)').length,
        };
      };
      window.__stand = (key) => {
        const q = key ? db.profiles[key] : P();
        return {
          spullen: q.owned.filter(id => isBeloning(id)),
          perfect: q.trophies.filter(id => id.indexOf(PERFECT_BADGE) === 0),
          perfectKlaar: (q.readyTrophies || []).filter(id => id.indexOf(PERFECT_BADGE) === 0),
          badges: q.trophies.filter(id => id.indexOf(WERELD_BADGE) === 0),
          gekocht: boughtCount(q),
        };
      };
    });
    return { ctx, page };
  }
  // Eén ster maken en kiezen -- elke zaak begint daarmee.
  async function nieuweSter(page) {
    await page.evaluate(() => {
      db.profiles.p1 = defaultProfile('Testster', 'dress_roze');
      db.profiles.p1.order = 0;
      save();
      selectProfile('p1');
    });
    await page.waitForTimeout(200);
  }

  /* ---- A · Een wereld uitspelen geeft één spulletje ----------------------
     Acht shows op twee sterren: de wereld is uit, dus het spulletje is van haar.
     Perfect is hij niet, dus die trofee hoort er niet te zijn. */
  {
    const { ctx, page } = await fresh();
    await nieuweSter(page);
    const w = worldForIndexInfo => 0;
    // de eerste zeven shows: nog niets te vieren
    await page.evaluate(async () => {
      const w = worldForIndex(0);
      for (let l = w.first; l < w.first + w.levels - 1; l++) { await window.__speel(l, 2); window.__sluitFeest(); }
    });
    let r = await page.evaluate(() => ({ ...window.__stand(), feest: window.__feest() }));
    check(r.spullen.length === 0 && !r.feest,
      'A · zeven van de acht shows levert nog niets op', JSON.stringify(r));
    // en dan de achtste
    r = await page.evaluate(async () => {
      const w = worldForIndex(0);
      await window.__speel(w.first + w.levels - 1, 2);
      return { ...window.__stand(), feest: window.__feest() };
    });
    check(r.spullen.join() === 'acc_wereld_muziek',
      'A · de laatste show maakt de wereld uit en geeft het spulletje', JSON.stringify(r));
    check(r.feest && r.feest.kop === 'Wereld uit!' && r.feest.rijen.join() === 'Nieuwe wereldschat!' && r.feest.lagen === 1,
      'A · met één feestje, en dat gaat over de wereldschat', JSON.stringify(r.feest));
    check(r.perfect.length === 0 && r.perfectKlaar.length === 0,
      'A · twee sterren is geen perfecte wereld', JSON.stringify(r));
    check(r.gekocht === 0,
      'A · en een verdiend spulletje telt niet als gekocht', JSON.stringify(r));
    /* FASE 6C · van het feestje naar het spulletje.
     *
     * Het feestje laat de tekening en de naam één keer zien en sluit zichzelf.
     * Daarna ligt het spulletje in de kleedkamer -- in de zesde lade, achter een
     * rij die opzij geschoven moet worden. Wie hem wilde zien moest raden waar.
     * Daarom wijst de tweede knop van het eindscherm ná zo'n show naar dát
     * spulletje: de juiste lade open, het stuk gekozen, en de pop draagt het al.
     * Eén show later is het gewoon weer "Kleedkamer" -- zie zaak D. */
    const weg = await page.evaluate(async () => {
      window.__sluitFeest();
      const alt = document.getElementById('btn-end-alt');
      const label = alt.textContent;
      alt.click();
      await new Promise(r => setTimeout(r, 200));
      const kaart = document.querySelector('.item-card[data-item="acc_wereld_muziek"]');
      return {
        label,
        scherm: (document.querySelector('.screen.active') || {}).id,
        lade: shopCat, schatVak: shopCat === SCHAT_CAT, gekozen: shopSelectedId,
        gekozenKaart: !!(kaart && kaart.classList.contains('selected')),
        balk: document.getElementById('dress-bar').textContent.replace(/\s+/g, ' ').trim(),
        popDraagt: avatarSVG(previewProfile(P(), item('acc_wereld_muziek')), 100)
          .includes(item('acc_wereld_muziek').draw('meisje', 1)),
        naam: item('acc_wereld_muziek').name,
      };
    });
    // geen vaste tekst in de test: de naam komt uit ITEMS, net als op het feestje
    check(weg.label.indexOf(weg.naam) >= 0,
      'A · de tweede knop noemt het spulletje zelf', `${weg.label} (naam: ${weg.naam})`);
    check(weg.scherm === 'screen-dress' && weg.schatVak && weg.gekozen === 'acc_wereld_muziek' && weg.gekozenKaart,
      'A · en brengt je rechtstreeks naar het schattenvak, met het kaartje gekozen', JSON.stringify(weg));
    check(/Doe aan/.test(weg.balk) && weg.popDraagt,
      'A · de balk zegt "Doe aan" en de pop draagt het al', JSON.stringify(weg));
    // het spulletje gedraagt zich als elk ander kledingstuk
    const aan = await page.evaluate(() => {
      window.__sluitFeest();
      equipShopItem('acc_wereld_muziek');
      // niet op het emoji maar op de tekening zelf: sinds fase 4D.2 brengt het
      // item zijn eigen SVG mee, en die hoort ongewijzigd in de pop te staan
      return { aan: P().equipped.acc, pop: avatarSVG(P(), 100).includes(item('acc_wereld_muziek').draw('meisje', 1)) };
    });
    check(aan.aan === 'acc_wereld_muziek' && aan.pop,
      'A · je kan het gewoon aandoen, en dan staat het op de pop', JSON.stringify(aan));
    // en het overleeft een herlaadbeurt
    await page.reload();
    await page.waitForTimeout(300);
    const na = await page.evaluate(() => ({
      spullen: db.profiles.p1.owned.filter(id => isBeloning(id)),
      aan: db.profiles.p1.equipped.acc,
      feest: document.querySelectorAll('.wereld-feest-overlay').length,
    }));
    check(na.spullen.join() === 'acc_wereld_muziek' && na.aan === 'acc_wereld_muziek' && na.feest === 0,
      'A · en het blijft van haar na opnieuw openen -- zonder feestje', JSON.stringify(na));
    await ctx.close();
  }

  /* ---- B · Daarna alles naar drie sterren -------------------------------
     De wereld was al uit (spulletje binnen). Nu wordt hij perfect, en dát geeft
     de trofee -- en geen tweede spulletje. */
  {
    const { ctx, page } = await fresh();
    await nieuweSter(page);
    await page.evaluate(() => window.__speelWereld(0, 2));
    let r = await page.evaluate(() => window.__stand());
    check(r.spullen.length === 1 && r.perfect.length === 0, 'B · vooraf: wel uit, niet perfect', JSON.stringify(r));
    // alle acht overdoen op drie sterren; alleen de láátste maakt hem perfect
    r = await page.evaluate(async () => {
      const w = worldForIndex(0);
      const onderweg = [];
      for (let l = w.first; l < w.first + w.levels; l++) {
        await window.__speel(l, 3);
        onderweg.push(window.__feest());
        window.__sluitFeest();
      }
      return { ...window.__stand(), onderweg };
    });
    check(r.perfect.join() === 'perfect-muziek',
      'B · de laatste ontbrekende ster geeft de perfecte-wereldtrofee', JSON.stringify(r.perfect));
    check(r.onderweg.filter(f => f).length === 1 && r.onderweg[7]
      && r.onderweg[7].kop === 'Perfecte wereld!' && r.onderweg[7].rijen.join() === 'Nieuwe trofee!',
      'B · precies één feestje, bij de show die hem perfect maakt', JSON.stringify(r.onderweg));
    check(r.spullen.join() === 'acc_wereld_muziek',
      'B · en geen tweede spulletje voor perfect', JSON.stringify(r.spullen));
    check(r.perfectKlaar.length === 0,
      'B · de trofee ligt niet óók nog als cadeautje in de kast', JSON.stringify(r.perfectKlaar));
    await ctx.close();
  }

  /* ---- C · In één keer perfect: één feestje, twee regels -----------------
     De laatste show maakt de wereld tegelijk uit én perfect. Dat hoort één
     scherm te zijn en geen twee achter elkaar. */
  {
    const { ctx, page } = await fresh();
    await nieuweSter(page);
    const r = await page.evaluate(async () => {
      const w = worldForIndex(0);
      for (let l = w.first; l < w.first + w.levels - 1; l++) { await window.__speel(l, 3); window.__sluitFeest(); }
      await window.__speel(w.first + w.levels - 1, 3);
      return { ...window.__stand(), feest: window.__feest() };
    });
    check(r.feest && r.feest.lagen === 1 && r.feest.kop === 'Wereld uit!'
      && r.feest.rijen.join() === 'Nieuwe wereldschat!,Perfecte wereld!',
      'C · uit én perfect is één feestje met twee regels', JSON.stringify(r.feest));
    check(r.spullen.join() === 'acc_wereld_muziek' && r.perfect.join() === 'perfect-muziek',
      'C · en allebei de beloningen staan er echt', JSON.stringify(r));
    /* En als de ster-status tegelijk stijgt: eerst die, dan het wereldfeest --
       nooit over elkaar heen. */
    const volgorde = await page.evaluate(async () => {
      window.__sluitFeest();
      const q = P();
      const w = worldForIndex(1);
      for (let l = w.first; l < w.first + w.levels - 1; l++) { await window.__speel(l, 3); window.__sluitFeest(); }
      q.rankSeen = 0;   // de rang weer aanzetten voor de laatste show
      startLevel(w.first + w.levels - 1);
      G.misses = 0;
      endLevel(true);
      await new Promise(r2 => setTimeout(r2, 900));
      const tussen = { rang: !!document.querySelector('.rankup-overlay:not(.closing)'), feest: !!window.__feest() };
      await new Promise(r2 => setTimeout(r2, 3000));
      const daarna = { rang: !!document.querySelector('.rankup-overlay:not(.closing)'), feest: !!window.__feest() };
      return { tussen, daarna };
    });
    check(volgorde.tussen.rang && !volgorde.tussen.feest && !volgorde.daarna.rang && volgorde.daarna.feest,
      'C · een rang-stijging gaat vóór, het wereldfeest komt erna', JSON.stringify(volgorde));
    await ctx.close();
  }

  /* ---- D · Nog eens overspelen geeft niets ------------------------------ */
  {
    const { ctx, page } = await fresh();
    await nieuweSter(page);
    await page.evaluate(() => window.__speelWereld(0, 3));
    const voor = await page.evaluate(() => ({ ...window.__stand(), owned: P().owned.length }));
    const r = await page.evaluate(async () => {
      const w = worldForIndex(0);
      const feestjes = [];
      // de hele wereld nog twee keer, inclusief de laatste show
      for (let ronde = 0; ronde < 2; ronde++) {
        for (let l = w.first; l < w.first + w.levels; l++) {
          await window.__speel(l, 3);
          if (window.__feest()) feestjes.push(l);
          window.__sluitFeest();
        }
      }
      return { ...window.__stand(), owned: P().owned.length, feestjes };
    });
    check(r.feestjes.length === 0, 'D · een uitgespeelde wereld overspelen viert niets opnieuw', JSON.stringify(r.feestjes));
    check(r.owned === voor.owned && r.spullen.join() === voor.spullen.join(),
      'D · en levert geen tweede exemplaar van het spulletje op', JSON.stringify({ voor: voor.owned, na: r.owned }));
    check(r.perfect.join() === voor.perfect.join() && r.perfect.length === 1,
      'D · en ook geen tweede trofee', JSON.stringify(r.perfect));
    // FASE 6C: de wegwijzer naar het nieuwe spulletje hoort ook weg te zijn. Hij
    // hangt aan hetzelfde feestje, dus zonder feestje is het gewoon "Kleedkamer".
    const alt = await page.evaluate(() => ({
      label: document.getElementById('btn-end-alt').textContent,
      naam: item('acc_wereld_muziek').name,
    }));
    check(alt.label.indexOf('Kleedkamer') >= 0 && alt.label.indexOf(alt.naam) < 0,
      'D · en de tweede knop is weer gewoon de kleedkamer', JSON.stringify(alt));
    await ctx.close();
  }

  /* ---- E · Een save van vóór deze fase ----------------------------------
     Drie werelden uit, de eerste daarvan perfect -- gespeeld toen beloningen nog
     niet bestonden. Bij het openen hoort ze te vinden wat ze verdiend heeft,
     zonder ook maar één feestje te moeten wegtikken. */
  {
    const { ctx, page } = await fresh(() => {
      // Zo zag een profiel eruit vóór fase 4D.1: sterren en trofeeën, en verder niets.
      const p = { name: 'Oudje', base: 'meisje', diamonds: 40, level: 25, order: 0,
        stars: {}, tourStars: {}, worldsSeen: ['muziek', 'snoep', 'jungle'],
        owned: ['hair_blond', 'dress_roze', 'dress_paars', 'shoes_roze', 'stage_disco'], freebies: 5,
        equipped: { hair: 'hair_blond', dress: 'dress_roze', shoes: 'shoes_roze', mic: null, instrument: null, acc: null, pet: null, stage: 'stage_disco' },
        trophies: ['first', 'rookie3', 'perfecttour'], readyTrophies: [], goldHits: 0, encores: 0,
        stats: { correct: 40, wrong: 5 } };
      for (let l = 1; l <= 8; l++) p.stars[l] = 3;     // wereld 1: perfect
      for (let l = 9; l <= 24; l++) p.stars[l] = 2;    // wereld 2 en 3: uit, niet perfect
      localStorage.setItem('rekenPopsterren_v1', JSON.stringify({ sound: true, haptics: true, schemaV: 2, profiles: { p1: p } }));
    });
    await page.evaluate(() => selectProfile('p1'));
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({
      ...window.__stand(),
      lagen: document.querySelectorAll('.rp-overlay').length,
      oud: P().trophies.includes('perfecttour'),
      gepensioneerd: isRetiredTrophy('perfecttour'),
    }));
    check(r.spullen.join() === 'acc_wereld_muziek,acc_wereld_snoep,acc_wereld_jungle',
      'E · de drie uitgespeelde werelden geven hun spulletje alsnog', JSON.stringify(r.spullen));
    check(r.lagen === 0, 'E · en dat gebeurt stil -- geen rij feestjes bij het opstarten', JSON.stringify(r));
    check(r.perfect.join() === 'perfect-muziek',
      'E · de perfecte wereld van toen telt gewoon mee', JSON.stringify(r));
    check(r.oud && r.gepensioneerd,
      'E · de oude "Perfecte wereld"-trofee blijft staan, maar met pensioen', JSON.stringify(r));
    check(r.gekocht === 0, 'E · en niets ervan telt als gekocht', JSON.stringify(r));
    // nog eens openen verandert er niets meer aan
    await page.reload();
    await page.waitForTimeout(300);
    const weer = await page.evaluate(() => ({
      spullen: db.profiles.p1.owned.filter(id => isBeloning(id)),
      owned: db.profiles.p1.owned.length,
      perfect: db.profiles.p1.trophies.filter(id => id.indexOf('perfect-') === 0),
    }));
    check(weer.spullen.length === 3 && weer.owned === 8 && weer.perfect.length === 1,
      'E · en een tweede keer openen deelt niets nog eens uit', JSON.stringify(weer));
    await ctx.close();
  }

  /* ---- F · Twee sterren op één toestel ---------------------------------- */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => {
      db.profiles.p1 = defaultProfile('Een', 'dress_roze'); db.profiles.p1.order = 0;
      db.profiles.p2 = defaultProfile('Twee', 'dress_blauw'); db.profiles.p2.order = 1;
      save();
      selectProfile('p1');
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__speelWereld(0, 3));
    await page.evaluate(() => selectProfile('p2'));
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => ({ een: window.__stand('p1'), twee: window.__stand('p2') }));
    check(r.een.spullen.length === 1 && r.een.perfect.length === 1,
      'F · de ene ster heeft haar beloningen', JSON.stringify(r.een));
    check(r.twee.spullen.length === 0 && r.twee.perfect.length === 0 && r.twee.perfectKlaar.length === 0,
      'F · en de andere heeft ze niet', JSON.stringify(r.twee));
    await ctx.close();
  }

  /* ---- G · Het schattenvak: te verdienen, niet te koop, en nog geheim -----
     FASE 6E. De beloningen lagen achteraan in de accessoirelade, op slot, tussen
     de prijzen -- en daarmee lazen ze als winkelwaar die toevallig niet te koop
     is. Nu hebben ze een eigen vak ("✨ Wereldschatten · 0 / 6") en is wat er te
     zien valt precies: er ligt iets, bij die wereld, en je krijgt het door te
     spelen. Wát het is blijft tot het feestje. */
  {
    const { ctx, page } = await fresh();
    await nieuweSter(page);
    const r = await page.evaluate(async () => {
      P().diamonds = 9999;
      openKleedkamer();
      await new Promise(res => setTimeout(res, 250));
      const ingang = document.getElementById('schat-entry');
      const accLade = [...document.querySelectorAll('.item-card')].map(c => c.dataset.item);
      openKleedkamerCat('acc');
      await new Promise(res => setTimeout(res, 150));
      const inAcc = [...document.querySelectorAll('.item-card')].map(c => c.dataset.item);
      // en dan het vak zelf open
      ingang.click();
      await new Promise(res => setTimeout(res, 250));
      const kaart = document.querySelector('.item-card[data-item="acc_wereld_muziek"]');
      kaart.click();
      await new Promise(res => setTimeout(res, 150));
      const balk = document.getElementById('dress-bar').textContent;
      // en zelfs als iemand de koopweg rechtstreeks aanroept
      confirmShopBuy('acc_wereld_muziek');
      return {
        ingangTekst: ingang.textContent.replace(/\s+/g, ' ').trim(),
        ingangZichtbaar: ingang.style.display !== 'none',
        accLade, inAcc,
        opSlot: kaart.classList.contains('teverdienen'),
        schatKaart: kaart.classList.contains('schat-kaart'),
        status: kaart.querySelector('.item-status').textContent.trim(),
        // het raadsel en niet de tekening: geen SVG op het kaartje van een schat
        // die nog niet van haar is
        raadsel: !!kaart.querySelector('.schat-raadsel'),
        tekening: !!kaart.querySelector('.item-thumb svg'),
        naamOpKaart: kaart.querySelector('.item-name').textContent,
        itemNaam: item('acc_wereld_muziek').name,
        /* De pop verklapt hem ook niet bij een tik. Niet op de HTML vergeleken
           (avatarSVG geeft elke pop zijn eigen id-achtervoegsel, dus die verschilt
           altijd) maar op het enige dat telt: staat de tekening van dit spulletje
           erin of niet. Een koopstuk hóórt daar wél in te komen -- dat is de
           etalage -- en dat staat er als tegenproef bij. */
        popDraagtSchat: document.getElementById('shop-avatar').innerHTML
          .includes(item('acc_wereld_muziek').draw('meisje', 1)),
        knop: !!document.querySelector('#db-buy'),
        balk,
        heeft: P().owned.includes('acc_wereld_muziek'),
        diamanten: P().diamonds,
        beloningen: WORLDS.map(w => w.beloning).filter(id => !!item(id)),
        volgorde: [...document.querySelectorAll('.item-card')].map(c => c.dataset.item),
        popPastKoopstuk: await (async () => {
          openKleedkamerCat('acc');
          await new Promise(res => setTimeout(res, 150));
          document.querySelector('.item-card[data-item="acc_feesthoed"]').click();
          await new Promise(res => setTimeout(res, 150));
          return document.getElementById('shop-avatar').innerHTML.includes('🎉');
        })(),
      };
    });
    check(r.ingangZichtbaar && /Wereldschatten/.test(r.ingangTekst) && /0 \/ 6/.test(r.ingangTekst),
      'G · de kleedkamer heeft een schattenvak met een teller erop', JSON.stringify(r.ingangTekst));
    check(!r.accLade.some(id => /acc_wereld_/.test(id)) && !r.inAcc.some(id => /acc_wereld_/.test(id)),
      'G · en de gewone laden staan er niet meer vol mee', JSON.stringify(r.inAcc));
    check(r.volgorde.join() === r.beloningen.join(),
      'G · het vak toont precies de wereldschatten, in wereldvolgorde',
      JSON.stringify({ vak: r.volgorde, hoort: r.beloningen }));
    check(r.opSlot && r.schatKaart && r.status === '🔒 Speel uit',
      'G · een nog niet verdiende schat staat op slot', JSON.stringify(r));
    check(r.raadsel && !r.tekening && r.naamOpKaart === 'Muziekwereld' && r.naamOpKaart !== r.itemNaam,
      'G · en verklapt zichzelf niet: een raadsel met de naam van zijn wereld', JSON.stringify(r));
    check(!r.popDraagtSchat && r.popPastKoopstuk,
      'G · de pop past hem niet even -- een koopstuk wél', JSON.stringify(r));
    check(!r.knop && /Speel Muziekwereld uit/.test(r.balk) && !/💎/.test(r.balk)
      && r.balk.indexOf(r.itemNaam) < 0,
      'G · de balk zegt hoe je hem haalt -- geen prijs, geen koopknop, geen naam', JSON.stringify(r.balk));
    check(!r.heeft && r.diamanten === 9999,
      'G · en kopen kan ook niet langs de knop om', JSON.stringify(r));
    /* Verdiend hoort hij gewoon bij haar spullen: in het vak volledig te zien, én
       in zijn eigen lade, want dáár kiest een kind wat ze aandoet. */
    const na = await page.evaluate(async () => {
      P().owned.push('acc_wereld_muziek');
      renderShop();
      await new Promise(res => setTimeout(res, 150));
      const kaart = document.querySelector('.item-card[data-item="acc_wereld_muziek"]');
      const teller = document.getElementById('schat-entry').textContent.replace(/\s+/g, ' ').trim();
      kaart.click();
      await new Promise(res => setTimeout(res, 150));
      const balk = document.getElementById('dress-bar').textContent;
      openKleedkamerCat('acc');
      await new Promise(res => setTimeout(res, 150));
      const inAcc = [...document.querySelectorAll('.item-card')].map(c => c.dataset.item);
      return {
        teller, balk, inAcc,
        tekening: !!kaart.querySelector('.item-thumb svg'),
        raadsel: !!kaart.querySelector('.schat-raadsel'),
        naamOpKaart: kaart.querySelector('.item-name').textContent,
        wereldteken: !!kaart.querySelector('.item-wereld'),
      };
    });
    check(/1 \/ 6/.test(na.teller), 'G · de teller loopt mee', JSON.stringify(na.teller));
    check(na.tekening && !na.raadsel && na.naamOpKaart === 'Notenkroontje' && na.wereldteken,
      'G · een verdiende schat laat zich zien, met het teken van zijn wereld', JSON.stringify(na));
    check(/Doe aan/.test(na.balk) && !/💎/.test(na.balk),
      'G · en is meteen aan te doen, nog altijd zonder prijs', JSON.stringify(na.balk));
    check(na.inAcc.filter(id => /acc_wereld_/.test(id)).join() === 'acc_wereld_muziek',
      'G · in haar eigen lade staat alleen de schat die ze verdiend heeft', JSON.stringify(na.inAcc));
    await ctx.close();
  }

  /* ---- H · Een wereld erbij ---------------------------------------------
     Eén regel in WORLDS, met één veld voor de beloning. Er hoort verder niets
     bijgewerkt te hoeven worden -- geen lijst, geen trofee met de hand. */
  {
    const { ctx, page } = await fresh();
    await nieuweSter(page);
    const r = await page.evaluate(async () => {
      ITEMS.push({ id: 'acc_wereld_test', cat: 'acc', name: 'Testhoedje', emoji: '🧪', spot: 'top' });
      const bestaand = WORLDS.length;
      WORLDS.push({ id: 'testwereld', name: 'Testwereld', icon: '🧪', levels: 2, beloning: 'acc_wereld_test' });
      rebuildWorldStarts();
      rebuildWorldBadges();
      const w = worldForIndex(bestaand);
      // alle bestaande werelden even wegspelen zodat de nieuwe bereikbaar is
      for (let i = 0; i < bestaand; i++) {
        const v = worldForIndex(i);
        for (let l = v.first; l < v.first + v.levels; l++) P().stars[l] = 2;
      }
      P().level = w.first;
      save();
      const trofee = !!TROPHIES.find(t => t.id === 'perfect-testwereld');
      for (let l = w.first; l < w.first + w.levels; l++) { await window.__speel(l, 3); if (l < w.first + w.levels - 1) window.__sluitFeest(); }
      return { trofee, ...window.__stand(), feest: window.__feest() };
    });
    check(r.trofee, 'H · een nieuwe wereld krijgt vanzelf zijn perfecte-wereldtrofee', JSON.stringify(r.trofee));
    check(r.spullen.includes('acc_wereld_test') && r.perfect.includes('perfect-testwereld'),
      'H · en deelt bij het uitspelen gewoon uit wat er geconfigureerd staat',
      JSON.stringify({ spullen: r.spullen, perfect: r.perfect }));
    check(r.feest && r.feest.rijen.join() === 'Nieuwe wereldschat!,Perfecte wereld!',
      'H · met hetzelfde feestje als elke andere wereld', JSON.stringify(r.feest));
    await ctx.close();
  }

  /* ---- I · De tekeningen (fase 4D.2) ------------------------------------
     Eén echte tekening per beloning. Wat hier vastligt is niet hoe ze
     erútzien -- dat is smaak en dat mag veranderen -- maar de afspraken die de
     rest van de app erop maakt: er is een tekening, hij staat in het vakje van
     de kleedkamer, hij is voor beide basissen hetzelfde, hij blijft boven de
     kleren, en er hangt nog steeds geen prijskaartje aan. */
  {
    const { ctx, page } = await fresh();
    await nieuweSter(page);
    const r = await page.evaluate(() => {
      // Elke wereld die een spulletje uitdeelt, en alleen die: een wereld zonder
      // beloning werkt (zie grantWorldRewards) en hoort deze zaak niet om te gooien.
      const ids = WORLDS.map(w => w.beloning).filter(id => !!id);
      const uit = { ids, mist: [], geenSvg: [], metPrijs: [], basisVerschil: [], teLaag: [], extern: [], maten: {} };
      const p = P();
      ids.forEach(id => {
        const it = item(id);
        if (!it || typeof it.draw !== 'function' || typeof it.thumb !== 'function') { uit.mist.push(id); return; }
        const meisje = it.draw('meisje', 1), jongen = it.draw('jongen', 1);
        if (meisje !== jongen) uit.basisVerschil.push(id);
        if (!/^\s*<(path|circle|line|g|ellipse|svg)/.test(meisje)) uit.geenSvg.push(id);
        if (it.price !== undefined) uit.metPrijs.push(id);
        // geen enkele verwijzing naar buiten: geen plaatje, geen url(), geen klasse
        if (/<image|url\(|class=/.test(meisje + it.thumb('meisje'))) uit.extern.push(id);
        /* Waar staat het ding echt? Niet uit de tekst geraden maar opgemeten:
           het stukje SVG in dezelfde 200x250-ruimte zetten als de pop en de
           browser zijn eigen omhullende laten geven. Dat is meteen de enige
           maat die telt -- y = 94 is de nek, en alles daaronder valt onder de
           kleren; boven y = 0 is buiten beeld. */
        const doos = document.createElement('div');
        doos.style.cssText = 'position:absolute;left:-9999px;top:0;width:400px';
        doos.innerHTML = `<svg viewBox="0 0 200 250" width="400">${meisje}</svg>`;
        document.body.appendChild(doos);
        const b = doos.querySelector('svg').getBBox();
        doos.remove();
        uit.maten[id] = [b.x, b.y, b.width, b.height].map(n => Math.round(n * 10) / 10);
        if (b.y + b.height > 94 || b.y < -2) uit.teLaag.push(id);
      });
      // en ze komen ook echt allemaal op de pop terecht, op allebei de basissen
      uit.opDePop = ['meisje', 'jongen'].map(b => {
        const q = { ...p, base: b, equipped: { ...p.equipped } };
        return ids.filter(id => {
          q.equipped.acc = id;
          return avatarSVG(q, 100).includes(item(id).draw(b, 1));
        }).length;
      });
      /* Het miniatuur in de kleedkamer is de tekening en niet meer het emoji. Ze
         moet ze wél eerst verdiend hebben: een schat die nog op slot staat toont
         met opzet het raadsel en niet zijn tekening (fase 6E, zie zaak G). */
      ids.forEach(id => { if (!p.owned.includes(id)) p.owned.push(id); });
      openKleedkamerItem(ids[0]);
      uit.kaartjes = ids.filter(id => {
        const k = document.querySelector(`.item-card[data-item="${id}"] .item-thumb svg`);
        return !!k;
      }).length;
      return uit;
    });
    check(r.ids.length > 0 && r.mist.length === 0,
      'I · elke wereldbeloning heeft een eigen tekening en miniatuur',
      JSON.stringify({ n: r.ids.length, mist: r.mist }));
    check(r.geenSvg.length === 0 && r.extern.length === 0,
      'I · en dat is inline SVG zonder verwijzing naar buiten', JSON.stringify([r.geenSvg, r.extern]));
    check(r.basisVerschil.length === 0,
      'I · één tekening voor beide basissen', JSON.stringify(r.basisVerschil));
    check(r.teLaag.length === 0,
      'I · en geen enkele zakt onder de nek (y = 94), waar de kleren beginnen', JSON.stringify(r.maten));
    /* Eén familie, en dat is hier een maat en geen mening: geen enkele beloning
       mag twee keer zo hoog of twee keer zo breed zijn als een andere, anders
       staat er één spulletje de rest te overschreeuwen. */
    const h = r.ids.map(id => r.maten[id] && r.maten[id][3]).filter(n => n);
    const br = r.ids.map(id => r.maten[id] && r.maten[id][2]).filter(n => n);
    check(h.length === r.ids.length && Math.max(...h) / Math.min(...h) < 2
       && br.length === r.ids.length && Math.max(...br) / Math.min(...br) < 3,
      'I · en ze zijn onderling in verhouding: één set, geen uitschieter', JSON.stringify(r.maten));
    check(r.metPrijs.length === 0,
      'I · nog steeds geen prijs: het blijven beloningen en geen koopwaar', JSON.stringify(r.metPrijs));
    check(r.opDePop.join() === [r.ids.length, r.ids.length].join(),
      'I · en ze staan allemaal op allebei de paspoppen', JSON.stringify(r.opDePop));
    check(r.kaartjes === r.ids.length,
      'I · de kleedkamer toont de tekening op de kaartjes, niet het emoji',
      JSON.stringify({ kaartjes: r.kaartjes, hoort: r.ids.length }));
    await ctx.close();
  }

  /* ---- J · Nog maar één tovenaarshoed (fase 4D.2) ------------------------
     acc_tovenaarshoed stond voor 85 diamanten in de kleedkamer en is weg: hij
     was dezelfde hoed als de beloning van de Toverwereld, en daarmee was die
     beloning niets waard voor wie de winkelversie al had.

     Getest wordt niet dat hij weg is (dat is één regel in ITEMS) maar wat er
     gebeurt met een save waar hij écht in zat: hij hoort uit owned te
     verdwijnen, hij hoort af te gaan, en de rest van die save hoort niemand
     aan te raken. */
  {
    const { ctx, page } = await fresh(() => {
      // een save van vóór deze versie: de winkelhoed gekocht én aan
      const key = 'rekenPopsterren_v1';
      const db = JSON.parse(localStorage.getItem(key) || '{"profiles":{}}');
      db.profiles = db.profiles || {};
      db.profiles.oud = {
        name: 'Oudster', base: 'meisje', order: 0, level: 1, stars: {}, diamonds: 40,
        owned: ['dress_roze', 'hair_blond', 'shoes_roze', 'acc_tovenaarshoed', 'acc_kroon'],
        equipped: { dress: 'dress_roze', hair: 'hair_blond', shoes: 'shoes_roze', acc: 'acc_tovenaarshoed', mic: null, pet: null, instrument: null },
        trophies: [], readyTrophies: [],
      };
      localStorage.setItem(key, JSON.stringify(db));
    });
    const r = await page.evaluate(() => {
      selectProfile('oud');
      const q = db.profiles.oud;
      return {
        bestaatNog: !!item('acc_tovenaarshoed'),
        teKoop: ITEMS.filter(i => i.cat === 'acc' && i.price != null && /tovenaar/i.test(i.name)).length,
        owned: q.owned,
        acc: q.equipped.acc,
        diamanten: q.diamonds,
        // de pop valt er niet over en tekent gewoon geen accessoire meer
        pop: avatarSVG(q, 100).indexOf('<svg') === 0,
        // en er is nog precies één tovenaarshoed in het spel: de beloning
        hoeden: ITEMS.filter(i => i.draw && i.draw('meisje', 1) === artToverhoed()).map(i => i.id),
      };
    });
    check(!r.bestaatNog && r.teKoop === 0,
      'J · de tovenaarshoed uit de winkel bestaat niet meer', JSON.stringify(r));
    check(r.hoeden.join() === 'acc_wereld_tover',
      'J · en er is er nog precies één: die van de Toverwereld', JSON.stringify(r.hoeden));
    check(!r.owned.includes('acc_tovenaarshoed') && r.acc === null,
      'J · een oude save raakt hem kwijt uit de kast én van de kop', JSON.stringify(r));
    check(r.owned.join() === 'dress_roze,hair_blond,shoes_roze,acc_kroon' && r.diamanten === 40,
      'J · en verder blijft die save precies zoals hij was -- ook de diamanten', JSON.stringify(r));
    check(r.pop, 'J · en de pop tekent gewoon door, zonder accessoire', JSON.stringify(r.pop));
    // en het opruimen overleeft een herlaadbeurt (en doet de tweede keer niets)
    await page.reload();
    await page.waitForTimeout(300);
    const na = await page.evaluate(() => ({
      owned: db.profiles.oud.owned, acc: db.profiles.oud.equipped.acc,
    }));
    check(!na.owned.includes('acc_tovenaarshoed') && na.acc === null,
      'J · en na opnieuw openen blijft het opgeruimd', JSON.stringify(na));
    await ctx.close();
  }

  /* ---- K · De onthulling (fase 6E) ---------------------------------------
     Het feestje was al het moment waarop een wereldschat zich laat zien. Wat
     erbij is gekomen is de knop eronder: aandoen, meteen, op de plek waar het
     kind naar zit te kijken. Wat hier vastligt is dat die knop doet wat hij
     zegt, dat hij er alleen staat als er écht iets nieuws is, en dat hij niet
     terugkomt bij elke volgende keer dat dezelfde wereld uitgespeeld wordt. */
  {
    const { ctx, page } = await fresh();
    await nieuweSter(page);
    const r = await page.evaluate(async () => {
      const w = worldForIndex(0);
      for (let l = w.first; l < w.first + w.levels - 1; l++) { await window.__speel(l, 2); window.__sluitFeest(); }
      await window.__speel(w.first + w.levels - 1, 2);
      const ov = document.querySelector('.wereld-feest-overlay:not(.closing)');
      const knop = ov && ov.querySelector('.wf-aan');
      const voor = P().equipped.acc;
      const popVoor = document.getElementById('end-avatar').innerHTML;
      if (knop) knop.click();
      await new Promise(res => setTimeout(res, 400));
      return {
        knop: !!knop,
        voor, na: P().equipped.acc,
        dicht: !document.querySelector('.wereld-feest-overlay:not(.closing)'),
        /* De pop op het eindscherm is opnieuw getekend (het is niet meer dezelfde
           opmaak) en tekent nu de schat. Niet op de innerHTML vergeleken: de
           browser schrijft SVG die hij terugleest anders op (<path/> wordt
           <path></path>), dus dat vergelijkt opmaakstijl en geen inhoud. */
        popHertekend: document.getElementById('end-avatar').innerHTML !== popVoor,
        popDraagt: avatarSVG(P(), 150).includes(item('acc_wereld_muziek').draw('meisje', 1)),
      };
    });
    check(r.knop, 'K · bij een nieuwe wereldschat staat er een Aandoen-knop', JSON.stringify(r));
    check(r.voor === null && r.na === 'acc_wereld_muziek',
      'K · en één tik doet hem aan', JSON.stringify(r));
    check(r.dicht && r.popHertekend && r.popDraagt,
      'K · de laag gaat dicht en de pop op het eindscherm draagt hem al', JSON.stringify(r));
    /* Dezelfde wereld nog eens uitspelen: geen feestje, dus ook geen knop. Een
       kind hoort dit één keer per wereld tegen te komen en niet elke keer weg te
       moeten tikken. */
    const weer = await page.evaluate(async () => {
      const w = worldForIndex(0);
      await window.__speel(w.first + w.levels - 1, 3);
      return { feest: !!window.__feest(), knop: !!document.querySelector('.wf-aan') };
    });
    check(!weer.feest && !weer.knop,
      'K · en een tweede keer uitspelen viert niets en vraagt niets', JSON.stringify(weer));
    /* De laag met knop houdt niemand vast: wie niets doet is hem na een paar
       tellen vanzelf kwijt, want eronder ligt "Verder op tournee" en daar wilde
       het kind toch al heen. */
    const vanzelf = await page.evaluate(async () => {
      const w = worldForIndex(1);
      for (let l = w.first; l < w.first + w.levels - 1; l++) { await window.__speel(l, 2); window.__sluitFeest(); }
      await window.__speel(w.first + w.levels - 1, 2);
      const meteen = { feest: !!window.__feest(), knop: !!document.querySelector('.wf-aan') };
      await new Promise(res => setTimeout(res, 6400));
      return { ...meteen, weg: !window.__feest(), aan: P().equipped.acc };
    });
    check(vanzelf.feest && vanzelf.knop && vanzelf.weg,
      'K · en de laag met knop sluit ook zichzelf als er niets gebeurt', JSON.stringify(vanzelf));
    check(vanzelf.aan === 'acc_wereld_muziek',
      'K · zonder iets aan te doen wat ze niet gekozen heeft', JSON.stringify(vanzelf.aan));
    /* Een perfecte wereld zonder nieuwe schat viert wél, maar zonder knop -- er
       valt niets aan te doen -- en sluit zichzelf zoals altijd. */
    const perfect = await page.evaluate(async () => {
      const w = worldForIndex(0);
      const laatste = w.first + w.levels - 2;   // de show die hem perfect máákt
      for (let l = w.first; l < laatste; l++) { await window.__speel(l, 3); window.__sluitFeest(); }
      await window.__speel(laatste, 3);
      const nu = { feest: window.__feest(), knop: !!document.querySelector('.wf-aan') };
      await new Promise(res => setTimeout(res, 3400));
      return { ...nu, dichtVanzelf: !window.__feest() };
    });
    check(perfect.feest && perfect.feest.rijen.join() === 'Nieuwe trofee!' && !perfect.knop && perfect.dichtVanzelf,
      'K · een feestje zonder nieuwe schat heeft geen knop en sluit zichzelf', JSON.stringify(perfect));
    // en wat ze aanhad blijft aan na opnieuw openen
    await page.reload();
    await page.waitForTimeout(300);
    const bewaard = await page.evaluate(() => db.profiles.p1.equipped.acc);
    check(bewaard === 'acc_wereld_muziek', 'K · en dat aandoen overleeft opnieuw openen', String(bewaard));
    await ctx.close();
  }

  /* ---- L · Het teken op de kaart (fase 6E) --------------------------------
     Bij de laatste halte van een wereld staat een fonkeling zolang de schat van
     die wereld nog te halen is. Eén teken, op één halte, en weg zodra ze hem
     heeft -- de kaart heeft in fase 6D juist zijn slotjes verloren omdat een
     vierde signaal per halte drukte werd. */
  {
    const { ctx, page } = await fresh();
    await nieuweSter(page);
    const voor = await page.evaluate(async () => {
      goMap(1);
      await new Promise(res => setTimeout(res, 400));
      const haltes = [...document.querySelectorAll('.tour-stop')];
      return {
        haltes: haltes.length,
        met: haltes.map((b, i) => b.querySelector('.stop-schat') ? i : -1).filter(i => i >= 0),
      };
    });
    check(voor.haltes > 0 && voor.met.join() === String(voor.haltes - 1),
      'L · precies één fonkeling, bij de laatste halte', JSON.stringify(voor));
    const na = await page.evaluate(async () => {
      P().owned.push('acc_wereld_muziek');
      goMap(1);
      await new Promise(res => setTimeout(res, 400));
      return [...document.querySelectorAll('.stop-schat')].length;
    });
    check(na === 0, 'L · en hij is weg zodra de schat van haar is', String(na));
    await ctx.close();
  }

  /* ---- Uitslag ---- */
  check(pageErrors.length === 0, 'geen fouten in de pagina', pageErrors.slice(0, 5).join(' | '));
  await browser.close();

  const namen = Object.keys(counts).sort();
  let ok = 0, nok = 0;
  for (const n of namen) {
    const c = counts[n];
    ok += c.pass; nok += c.fail;
    console.log(`${c.fail ? 'FOUT ' : ' ok  '}  ${n}  (${c.pass} ok${c.fail ? ', ' + c.fail + ' fout' : ''})`);
  }
  if (fails.length) { console.log('\nEerste fouten:'); fails.forEach(f => console.log('  - ' + f)); }
  console.log(`\n${ok}/${ok + nok} controles geslaagd.`);
  process.exit(nok ? 1 : 0);
})();
