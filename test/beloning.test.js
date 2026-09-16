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
 *   G  de kleedkamer                  -> te verdienen, niet te koop
 *   H  een wereld erbij               -> één regel configuratie, verder niets
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
    check(r.feest && r.feest.kop === 'Wereld uit!' && r.feest.rijen.join() === 'Nieuw!' && r.feest.lagen === 1,
      'A · met één feestje, en dat gaat over het spulletje', JSON.stringify(r.feest));
    check(r.perfect.length === 0 && r.perfectKlaar.length === 0,
      'A · twee sterren is geen perfecte wereld', JSON.stringify(r));
    check(r.gekocht === 0,
      'A · en een verdiend spulletje telt niet als gekocht', JSON.stringify(r));
    // het spulletje gedraagt zich als elk ander kledingstuk
    const aan = await page.evaluate(() => {
      window.__sluitFeest();
      equipShopItem('acc_wereld_muziek');
      return { aan: P().equipped.acc, pop: avatarSVG(P(), 100).includes('🎵') };
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
      && r.feest.rijen.join() === 'Nieuw!,Perfecte wereld!',
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

  /* ---- G · De kleedkamer: te verdienen, niet te koop -------------------- */
  {
    const { ctx, page } = await fresh();
    await nieuweSter(page);
    const r = await page.evaluate(async () => {
      P().diamonds = 9999;
      openKleedkamerCat('acc');
      await new Promise(res => setTimeout(res, 250));
      const kaart = document.querySelector('.item-card[data-item="acc_wereld_muziek"]');
      kaart.click();
      await new Promise(res => setTimeout(res, 150));
      const balk = document.getElementById('dress-bar').textContent;
      // en zelfs als iemand de koopweg rechtstreeks aanroept
      confirmShopBuy('acc_wereld_muziek');
      return {
        opSlot: kaart.classList.contains('teverdienen'),
        status: kaart.querySelector('.item-status').textContent.trim(),
        knop: !!document.querySelector('#db-buy'),
        balk,
        heeft: P().owned.includes('acc_wereld_muziek'),
        diamanten: P().diamonds,
        // staat wél in de kast, achteraan
        volgorde: [...document.querySelectorAll('.item-card')].map(c => c.dataset.item).slice(-6),
      };
    });
    check(r.opSlot && r.status.indexOf('🔒') === 0,
      'G · een nog niet verdiend spulletje staat op slot in de kleedkamer', JSON.stringify(r));
    check(!r.knop && /Speel Muziekwereld uit/.test(r.balk),
      'G · de balk zegt hoe je hem haalt, en biedt geen koopknop', JSON.stringify(r.balk));
    check(!r.heeft && r.diamanten === 9999,
      'G · en kopen kan ook niet langs de knop om', JSON.stringify(r));
    check(r.volgorde.join() === 'acc_wereld_muziek,acc_wereld_snoep,acc_wereld_jungle,acc_wereld_piraten,acc_wereld_ijs,acc_wereld_tover',
      'G · de zes beloningen staan bij elkaar, achteraan de categorie', JSON.stringify(r.volgorde));
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
      WORLDS.push({ id: 'testwereld', name: 'Testwereld', icon: '🧪', levels: 2, beloning: 'acc_wereld_test' });
      rebuildWorldStarts();
      rebuildWorldBadges();
      const w = worldForIndex(6);
      // de zes bestaande werelden even wegspelen zodat de nieuwe bereikbaar is
      for (let i = 0; i < 6; i++) {
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
      'H · en deelt bij het uitspelen gewoon uit wat er geconfigureerd staat', JSON.stringify(r));
    check(r.feest && r.feest.rijen.join() === 'Nieuw!,Perfecte wereld!',
      'H · met hetzelfde feestje als elke andere wereld', JSON.stringify(r.feest));
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
