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
 *   G  Podia                          -> de schat is het slot op zijn podium
 *   H  een wereld erbij               -> één regel configuratie, verder niets
 *   K  de onthulling                  -> één keer, met een knop om 'm aan te doen
 *   L  het teken op de kaart          -> één fonkeling, en alleen zolang er iets ligt
 *   M  beperkte beweging             -> hetzelfde eindscherm, zonder de vertoning
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
  async function fresh(seed, opties) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 } }, opties || {}));
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

         Het feestje komt pas als de sterrenceremonie van het eindscherm
         uitgespeeld is (naSterren, zie endLevel) -- ruim anderhalve seconde, en
         niet meer de 650 ms van vroeger. Dat is te lang om na élke show af te
         wachten: de zaken hieronder spelen tientallen shows. Dus wordt er alleen
         gewacht als er iets te vieren ís, en dat is precies te zien aan de
         beloningen die deze show heeft opgeleverd -- want dát is waar het
         feestje over gaat. */
      window.__speel = async (lvl, sterren) => {
        const telt = () => {
          const q = P();
          return [q.owned.filter(id => isBeloning(id)).length,
                  q.trophies.filter(id => id.indexOf(PERFECT_BADGE) === 0).length,
                  (q.readyTrophies || []).filter(id => id.indexOf(PERFECT_BADGE) === 0).length].join();
        };
        const voor = telt();
        startLevel(lvl);
        // 1 ster: alles gehaperd (zie showStars -- tot 45% haperingen is het er twee)
        G.misses = sterren >= 3 ? 0 : sterren === 2 ? 1 : G.total;
        endLevel(true);
        await new Promise(r => setTimeout(r, 400));
        await new Promise(r => setTimeout(r, telt() === voor ? 200 : 1600));
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
          // wat er gekregen is: de regel onder de prijs, en de gouden regel voor perfect
          rijen: [...ov.querySelectorAll('.wf-tekst b, .wf-goud')].map(b => b.textContent.replace('⭐ ', '')),
          // de som van het podium van die wereld (✓ of prijs per stuk), als het nog niet af is
          podium: [...ov.querySelectorAll('.wf-som .item-status')].map(r => r.textContent),
          // de prijs zelf: het podium met de schat erop
          prijs: (e => e ? e.className : null)(ov.querySelector('.wf-prijs .wereldprijs')),
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
          stage: q.equipped.stage,
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
    /* De schat is het eerste stuk van het podium van die wereld (zie "= Podia").
       Het feestje toont de prijs van de wereld (bleek: nog niet af) en de som
       eronder: de schat met een vinkje, de twee stukken met hun prijs. Ze blijft
       staan waar ze stond. */
    check(r.feest && r.feest.podium.join() === '✓,💎 130,💎 80' && r.stage === 'stage_disco'
      && /wereldprijs/.test(r.feest.prijs) && !/geheim|\baf\b|goud/.test(r.feest.prijs),
      'A · met de prijs van de wereld en de som van zijn podium', JSON.stringify([r.feest, r.stage]));
    check(r.perfect.length === 0 && r.perfectKlaar.length === 0,
      'A · twee sterren is geen perfecte wereld', JSON.stringify(r));
    check(r.gekocht === 0,
      'A · en een verdiend spulletje telt niet als gekocht', JSON.stringify(r));
    /* FASE 6C · van het feestje naar het spulletje.
     *
     * Het feestje laat de tekening en de naam één keer zien en sluit zichzelf.
     * Daarna ligt het spulletje in de kleedkamer -- in de zesde lade, achter een
     * rij die opzij geschoven moet worden. Wie hem wilde zien moest raden waar.
     * Daarom wees de tweede knop van het eindscherm ná zo'n show naar dát
     * spulletje: de juiste lade open en het stuk meteen áán. Nu wijst hij naar
     * het podium van die wereld (zie hieronder). (Het was "gekozen,
     * met een balk die 'Doe aan' zei". Sinds tikken op iets van jezelf het
     * gewoon aandoet is die tussenstap er niet meer -- op het kaartje niet en
     * hier dus ook niet.) Eén show later is het gewoon weer "Kleedkamer" -- zie
     * zaak D. */
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
        lade: shopCat, gekozen: shopSelectedId,
        aan: P().equipped.acc,
        aanKaart: !!(kaart && kaart.classList.contains('equipped')),
        balk: document.getElementById('dress-bar').textContent.replace(/\s+/g, ' ').trim(),
        ladeDicht: getComputedStyle(document.getElementById('dress-bar')).display === 'none',
        // en nu op de échte pop en niet op een voorbeeld: previewProfile zette het
        // spulletje er zelf in, dus die zei "ja" of het nu aanstond of niet
        popDraagt: avatarSVG(P(), 100).includes(item('acc_wereld_muziek').draw('meisje', 1)),
        naam: item('acc_wereld_muziek').name,
      };
    });
    /* Sinds de prijs van een wereld wijst die knop niet meer naar de hoed in
       Accessoires maar naar het podium waar hij bij hoort: Podia open, dat podium
       gekozen, en in de lade eronder de stukken die nog moeten. */
    check(/podium/.test(weg.label),
      'A · de tweede knop gaat naar je podium', weg.label);
    check(weg.scherm === 'screen-dress' && weg.lade === 'stage' && weg.gekozen === 'stage_arena' && !weg.ladeDicht,
      'A · en opent Podia met het podium van die wereld gekozen', JSON.stringify(weg));
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
      && r.onderweg[7].kop === 'Perfecte wereld!' && r.onderweg[7].rijen.join() === 'Overal drie sterren' && /\bgoud\b/.test(r.onderweg[7].prijs || ''),
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
    check(r.feest && /\bgoud\b/.test(r.feest.prijs || ''),
      'C · en de prijs staat in goud', JSON.stringify(r.feest));
    check(r.spullen.join() === 'acc_wereld_muziek' && r.perfect.join() === 'perfect-muziek',
      'C · en allebei de beloningen staan er echt', JSON.stringify(r));
    await ctx.close();
  }

  /* ---- C2 · De schat maakt het podium af ---------------------------------
     Heeft ze de twee winkelstukken van de Muziekpodium al, dan is de schat het
     laatste stuk: "Nieuw podium!" en ze staat er meteen op -- in de opslag en
     op het eindscherm eronder. Het podium zelf komt niet in p.owned: van jou
     zijn is afgeleid (zie "= Podia"). */
  {
    const { ctx, page } = await fresh();
    await nieuweSter(page);
    const r = await page.evaluate(async () => {
      P().owned.push('instr_dj', 'dress_disco'); save();
      const w = worldForIndex(0);
      for (let l = w.first; l < w.first + w.levels - 1; l++) { await window.__speel(l, 2); window.__sluitFeest(); }
      await window.__speel(w.first + w.levels - 1, 2);
      return { ...window.__stand(), feest: window.__feest(), eigen: P().owned.includes('stage_arena'),
        schijf: !!document.querySelector('#end-stage .stage-podium .podium') };
    });
    check(r.feest && r.feest.rijen.join() === 'Nieuw podium!' && r.feest.podium.length === 0
      && /\baf\b/.test(r.feest.prijs || ''),
      'C2 · de schat die het podium afmaakt zegt "Nieuw podium!"', JSON.stringify(r.feest));
    check(r.stage === 'stage_arena' && !r.eigen && r.schijf,
      'C2 · en ze staat er meteen op, ook op het eindscherm', JSON.stringify(r));
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

  /* ---- G · Podia: de schat is het slot op zijn podium ------------------
     Een schat die je nog niet hebt ligt niet in een lade (dan is het winkelwaar
     die toevallig niet te koop is) maar op zijn podium, als 🔒. Wat er te zien
     valt is precies: dit podium hoort bij die wereld, je krijgt het stuk door te
     spelen, en de rest koop je. Wát de schat is blijft tot het feestje -- in de
     lade onderaan staat hij als silhouet. */
  {
    const { ctx, page } = await fresh();
    await nieuweSter(page);
    const r = await page.evaluate(async () => {
      P().diamonds = 9999;
      openKleedkamer();
      await new Promise(res => setTimeout(res, 250));
      const laden = () => [...document.querySelectorAll('#shop-tabs .tab-btn')].map(c => c.getAttribute('aria-label') + (c.classList.contains('active') ? '*' : ''));
      const chips = laden();
      openKleedkamerCat('acc');
      await new Promise(res => setTimeout(res, 150));
      const inAcc = [...document.querySelectorAll('.item-card')].map(c => c.dataset.item);
      // de snelkoppeling: een tik op het podium in de spiegel opent Podia
      document.getElementById('shop-podium').click();
      await new Promise(res => setTimeout(res, 250));
      const lade = shopCat;
      const chipsPodia = laden();
      const rijStaat = getComputedStyle(document.getElementById('shop-tabs-wrap')).display !== 'none';
      const kaart = document.querySelector('.item-card[data-item="stage_arena"]');
      const status = kaart.querySelector('.item-status').textContent.trim();
      kaart.click();
      await new Promise(res => setTimeout(res, 150));
      const balk = document.getElementById('dress-bar');
      const stukken = [...balk.querySelectorAll('.mini-kaart')].map(k => ({
        id: k.dataset.stuk, tag: k.querySelector('.item-status').textContent.trim(), slot: k.classList.contains('op-slot') }));
      const speel = !!document.getElementById('db-speel');
      const koop = !!document.getElementById('db-buy');
      // het slotje: een bubbeltje met het wereldteken
      balk.querySelector('.mini-kaart.op-slot').click();
      await new Promise(res => setTimeout(res, 100));
      const bel = document.querySelector('.slot-bel');
      const belTekst = bel ? bel.textContent : '';
      if (bel) bel.remove();
      // en zelfs als iemand de koopweg rechtstreeks aanroept
      confirmShopBuy('stage_arena');
      confirmShopBuy('acc_wereld_muziek');
      return {
        chips, chipsPodia, rijStaat, inAcc, lade, status, stukken, speel, koop, belTekst,
        balkNoemtSchat: balk.textContent.indexOf(item('acc_wereld_muziek').name) >= 0,
        heeft: P().owned.includes('acc_wereld_muziek'),
        staat: P().equipped.stage,
        diamanten: P().diamonds,
        volgorde: [...document.querySelectorAll('.item-card:not(.horizon-mist)')].map(c => c.dataset.item),
        hoort: zichtbarePodia(P()).map(st => st.id),
        mist: document.querySelectorAll('.item-card.horizon-mist').length,
        wereldtekens: document.querySelectorAll('.item-wereld').length,
      };
    });
    check(r.chips.join() === 'Kapsels,Accessoires,Kleren*,Schoenen,Microfoons,Muziek,Dieren,Podia',
      'G · de laden staan van top tot teen, Podia (de vloer) als achtste; de kleedkamer opent in Kleren', JSON.stringify(r.chips));
    check(r.chipsPodia[7] === 'Podia*' && r.chipsPodia.filter(c => c.endsWith('*')).length === 1 && r.rijStaat,
      'G · in Podia licht 🎪 op en blijft de balk staan', JSON.stringify([r.chipsPodia, r.rijStaat]));
    check(!r.inAcc.some(id => /acc_wereld_/.test(id)),
      'G · de gewone laden staan niet vol met schatten op slot', JSON.stringify(r.inAcc));
    check(r.lade === 'stage', 'G · een tik op het podium in de spiegel opent Podia', JSON.stringify(r.lade));
    check(r.volgorde.join() === r.hoort.join() && r.mist === 1,
      'G · de lade toont de podia tot de horizon, met één mistkaartje erachter', JSON.stringify(r));
    check(r.status === '🔒', 'G · een podium zonder zijn schat staat op slot', JSON.stringify(r.status));
    check(r.stukken.length === 3 && r.stukken[0].id === 'acc_wereld_muziek' && r.stukken[0].slot && r.stukken[0].tag === '🔒'
      && r.stukken.slice(1).every(s => /💎/.test(s.tag)),
      'G · de lade onderaan: de schat op slot, de twee andere met hun prijs', JSON.stringify(r.stukken));
    check(r.speel && !r.koop && !r.balkNoemtSchat,
      'G · één knop: Speel -- geen koopknop, en de naam van de schat blijft geheim', JSON.stringify(r));
    check(/🎵/.test(r.belTekst) && /🔓/.test(r.belTekst),
      'G · het slotje zegt met het wereldteken waar je hem haalt', JSON.stringify(r.belTekst));
    check(!r.heeft && r.staat === 'stage_disco' && r.diamanten === 9999,
      'G · en kopen kan ook niet langs de knop om', JSON.stringify(r));
    check(r.wereldtekens === 0, 'G · geen wereldteken meer in de hoek van een kaartje', JSON.stringify(r.wereldtekens));
    /* Een podium van een wereld verder vooruit (binnen de horizon, nog op slot op
       de reis): zien en passen mag, maar het brengt je niet naar die wereld. Het
       slotje zegt wat de reis zegt, en Speel opent de kaart waar ze nu staat --
       zonder die verre wereld op "al gezien" te zetten. */
    const ver = await page.evaluate(async () => {
      const st = zichtbarePodia(P()).filter(s => podiumWereldIdx(s) > 0).pop();
      const wi = podiumWereldIdx(st);
      document.querySelector(`.item-card[data-item="${st.id}"]`).click();
      await new Promise(res => setTimeout(res, 150));
      document.querySelector('#dress-bar .mini-kaart.op-slot').click();
      await new Promise(res => setTimeout(res, 100));
      const bel = !!document.querySelector('.slot-bel');
      const toast = document.getElementById('toast').textContent;
      document.getElementById('db-speel').click();
      await new Promise(res => setTimeout(res, 600));
      return { wi, bel, toast, kijk: viewWorldIdx, gezien: worldSeen(P(), wi),
               kaart: document.getElementById('screen-map').classList.contains('active') };
    });
    check(ver.wi > 0 && !ver.bel && /Speel eerst/.test(ver.toast),
      'G · een podium verder vooruit: het slotje zegt "speel eerst" en wijst geen wereld aan', JSON.stringify(ver));
    check(ver.kaart && ver.kijk === 0 && !ver.gezien,
      'G · en Speel opent de kaart waar ze nu staat, niet die verre wereld', JSON.stringify(ver));
    await page.evaluate(() => { openKleedkamer(); openPodia(); });
    await new Promise(res => setTimeout(res, 250));
    /* Verdiend: de schat staat bij haar spullen, het slot gaat eraf, en het
       kaartje wordt een verzamelkaart: geen bedrag maar de drie stukken, waarvan
       de schat er al een is. Aantikken kiest meteen het eerste stuk dat ontbreekt;
       twee keer kopen en ze staat erop. */
    const na = await page.evaluate(async () => {
      P().owned.push('acc_wereld_muziek');
      renderShop();
      await new Promise(res => setTimeout(res, 150));
      const kaart = document.querySelector('.item-card[data-item="stage_arena"]');
      const tag = kaart.querySelector('.item-status');
      const voor = { set: tag.classList.contains('set-rij'), vakjes: tag.querySelectorAll('.sv').length,
        heb: [...tag.querySelectorAll('.sv')].map(v => v.classList.contains('heb') ? 1 : 0).join(''), tekst: tag.textContent.trim() };
      const prijs = item('instr_dj').price + item('dress_disco').price;
      kaart.click();
      await new Promise(res => setTimeout(res, 150));
      const knop = document.getElementById('db-buy');
      const knopTekst = knop ? knop.textContent : '';
      knop.click();
      await new Promise(res => setTimeout(res, 2200));
      document.getElementById('db-buy').click();
      await new Promise(res => setTimeout(res, 2200));
      const na = document.querySelector('.item-card[data-item="stage_arena"]');
      return {
        voor, prijs, knopTekst, djPrijs: item('instr_dj').price,
        staat: P().equipped.stage,
        stukken: ['instr_dj', 'dress_disco'].every(id => P().owned.includes(id)),
        diamanten: P().diamonds,
        aan: na.classList.contains('equipped'), tag: na.querySelector('.item-status').textContent.trim(),
        spiegel: document.getElementById('shop-podium').dataset.podium,
      };
    });
    check(na.voor.set && na.voor.vakjes === 3 && na.voor.heb === '100' && na.voor.tekst.indexOf('💎') < 0,
      'G · met de schat toont het kaartje de set (de schat erin), geen bedrag', JSON.stringify(na.voor));
    check(/Koop/.test(na.knopTekst) && na.knopTekst.indexOf(String(na.djPrijs)) >= 0,
      'G · aantikken kiest het eerste stuk dat ontbreekt, met één knop voor dat stuk', JSON.stringify(na.knopTekst));
    check(na.stukken && na.staat === 'stage_arena' && na.diamanten === 9999 - na.prijs && na.aan && na.tag === '✓'
      && na.spiegel === 'stage_arena',
      'G · kopen: de stukken zijn van haar, ze staat erop, ook in de spiegel', JSON.stringify(na));
    await ctx.close();
  }

  /* ---- G2 · De stukken één voor één, zonder Podia uit -------------------
     De stukjes in de podiumbalk doen wat een kaartje in het rek doet: kiezen
     (blauw) en passen, één tik = aan als het van haar is. Kopen kan per stuk,
     het podium blijft gekozen, en de keuze schuift door naar het volgende stuk
     dat nog ontbreekt. Het laatste stuk maakt het podium af. */
  {
    const { ctx, page } = await fresh();
    await nieuweSter(page);
    const r = await page.evaluate(async () => {
      const wacht = ms => new Promise(res => setTimeout(res, ms));
      const p = P(); p.diamonds = 9999; p.owned.push('acc_wereld_muziek'); save();
      openKleedkamer(); await wacht(250);
      openPodia(); await wacht(150);
      document.querySelector('.item-card[data-item="stage_arena"]').click(); await wacht(150);
      const balk = () => document.getElementById('dress-bar');
      const tegel = id => balk().querySelector(`.mini-kaart[data-stuk="${id}"]`);
      const stand = () => ({ lade: shopCat, gekozen: shopSelectedId, knop: (document.getElementById('db-buy') || {}).textContent || '',
        tegels: [...balk().querySelectorAll('.mini-kaart')].map(k => k.dataset.stuk + ':' + ['selected', 'equipped', 'owned'].filter(c => k.classList.contains(c)).join('+')) });
      const begin = stand();
      // het gekozen stuk nog eens aantikken: dan gaat de balk over het hele podium
      tegel('instr_dj').click(); await wacht(100);
      const heel = stand();
      tegel('instr_dj').click(); await wacht(100);
      const gekozen = { ...stand(), pop: document.getElementById('shop-avatar').innerHTML.length > 0 };
      document.getElementById('db-buy').click(); await wacht(2200);
      const naKoop = { ...stand(), dj: P().owned.includes('instr_dj'), aan: P().equipped.instrument };
      tegel('acc_wereld_muziek').click(); await wacht(100);
      const schatAan = { ...stand(), acc: P().equipped.acc };
      document.getElementById('db-buy').click(); await wacht(2200);
      return { begin, heel, gekozen, naKoop, schatAan, podium: P().equipped.stage, balkWeg: balk().style.display === 'none',
        diamanten: P().diamonds, prijs: item('instr_dj').price + item('dress_disco').price, djPrijs: item('instr_dj').price };
    });
    check(r.begin.knop.indexOf(String(r.djPrijs)) >= 0 && r.begin.tegels.join() === 'acc_wereld_muziek:owned,instr_dj:selected,dress_disco:',
      'G2 · een podium aantikken: het eerste stuk dat ontbreekt staat al gekozen', JSON.stringify(r.begin));
    check(r.heel.knop.indexOf(String(r.prijs)) >= 0 && r.heel.tegels.join() === 'acc_wereld_muziek:owned,instr_dj:,dress_disco:',
      'G2 · dat stuk weer uitzetten: de knop gaat over het hele podium', JSON.stringify(r.heel));
    check(r.gekozen.lade === 'stage' && r.gekozen.gekozen === 'stage_arena' && r.gekozen.tegels[1] === 'instr_dj:selected'
      && /Koop/.test(r.gekozen.knop) && r.gekozen.knop.indexOf(String(r.djPrijs)) >= 0,
      'G2 · een stuk aantikken kiest dat stuk, en de knop gaat over dat stuk', JSON.stringify(r.gekozen));
    check(r.naKoop.dj && r.naKoop.aan === 'instr_dj' && r.naKoop.lade === 'stage' && r.naKoop.gekozen === 'stage_arena'
      && r.naKoop.tegels.join() === 'acc_wereld_muziek:owned,instr_dj:equipped,dress_disco:selected',
      'G2 · na de koop blijft ze in Podia, het stuk is aan, en de keuze schuift door', JSON.stringify(r.naKoop));
    check(r.schatAan.acc === 'acc_wereld_muziek' && r.schatAan.tegels[0] === 'acc_wereld_muziek:equipped' && r.schatAan.gekozen === 'stage_arena',
      'G2 · een stuk dat van haar is: één tik doet het aan, zoals in het rek', JSON.stringify(r.schatAan));
    check(r.podium === 'stage_arena' && r.balkWeg && r.diamanten === 9999 - r.prijs,
      'G2 · het laatste stuk maakt het podium af, en ze staat erop', JSON.stringify(r));
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
      // wat er geschreven staat eerst uitbrengen: achter een dichte wereld zou de
      // testwereld ook dicht blijven (uitbrengen gaat op volgorde)
      WORLDS.forEach(w => { delete w.released; });
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
      const uit = { ids, mist: [], geenSvg: [], metPrijs: [], basisVerschil: [], teLaag: [], extern: [], maten: {}, buitenUitsnede: [] };
      // dezelfde lijst als schatFouten: een tekening die de keuring doorlaat, laat deze zaak ook door
      const begin = new RegExp('^\\s*<(svg|' + SCHAT_VORMEN.join('|') + ')\\b');
      const p = P();
      ids.forEach(id => {
        const it = item(id);
        if (!it || typeof it.draw !== 'function' || typeof it.thumb !== 'function') { uit.mist.push(id); return; }
        const meisje = it.draw('meisje', 1), jongen = it.draw('jongen', 1);
        if (meisje !== jongen) uit.basisVerschil.push(id);
        if (!begin.test(meisje)) uit.geenSvg.push(id);
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
        /* De uitsnede van het miniatuur past om de tekening heen. Dat is niet alleen
           netjes: npm run check meet de maatfamilie op die uitsnede (schatMaatFouten),
           omdat Node niet kan tekenen. Liegt een uitsnede, dan liegt die keuring --
           en dat hoort hier op te vallen, waar wél gemeten wordt. */
        const u = schatUitsnede(it);
        if (!u || b.x < u[0] - 0.5 || b.y < u[1] - 0.5 || b.x + b.width > u[0] + u[2] + 0.5
            || b.y + b.height > u[1] + u[3] + 0.5) uit.buitenUitsnede.push(id + ' ' + JSON.stringify(u));
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
         met opzet niet in een lade maar als slotje op zijn podium (zie zaak G). */
      ids.forEach(id => { if (!p.owned.includes(id)) p.owned.push(id); });
      openKleedkamerItem(ids[0]);
      // de tekeningen hierboven gelden voor elke wereld, ook een dichte (die wil je
      // nagekeken hebben vóór hij uitgaat); in de kleedkamer staan alleen de
      // schatten van de uitgebrachte
      uit.zichtbaar = WORLDS.filter((w, i) => w.beloning && worldAvailable(i)).map(w => w.beloning);
      uit.kaartjes = uit.zichtbaar.filter(id => {
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
    check(r.buitenUitsnede.length === 0,
      'I · de uitsnede van elk miniatuur past om zijn tekening heen (daar meet npm run check op)',
      JSON.stringify({ buiten: r.buitenUitsnede, maten: r.maten }));
    check(r.opDePop.join() === [r.ids.length, r.ids.length].join(),
      'I · en ze staan allemaal op allebei de paspoppen', JSON.stringify(r.opDePop));
    check(r.kaartjes === r.zichtbaar.length && r.kaartjes > 0,
      'I · de kleedkamer toont de tekening op de kaartjes, niet het emoji',
      JSON.stringify({ kaartjes: r.kaartjes, hoort: r.zichtbaar.length }));
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
    check(perfect.feest && perfect.feest.rijen.join() === 'Overal drie sterren' && !perfect.knop && perfect.dichtVanzelf,
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
    /* Alleen vlak voor het eind: bij haltes 1 tot 7 is de kaart rustig, en pas als
       de volgende show die van de laatste halte is, staat de prijs erbij. */
    const begin = await page.evaluate(async () => {
      goMap(1);
      await new Promise(res => setTimeout(res, 400));
      return document.querySelectorAll('.stop-schat').length;
    });
    check(begin === 0, 'L · aan het begin van een wereld staat er nog geen prijs op de kaart', String(begin));
    const voor = await page.evaluate(async () => {
      P().level = WORLD_START[0] + WORLDS[0].levels - 1;
      goMap(1);
      await new Promise(res => setTimeout(res, 400));
      const haltes = [...document.querySelectorAll('.tour-stop')];
      return {
        haltes: haltes.length,
        met: haltes.map((b, i) => b.querySelector('.stop-schat') ? i : -1).filter(i => i >= 0),
      };
    });
    check(voor.haltes > 0 && voor.met.join() === String(voor.haltes - 1),
      'L · vóór de laatste show: precies één prijs, bij de laatste halte', JSON.stringify(voor));
    const na = await page.evaluate(async () => {
      P().owned.push('acc_wereld_muziek');
      goMap(1);
      await new Promise(res => setTimeout(res, 400));
      return [...document.querySelectorAll('.stop-schat')].length;
    });
    check(na === 0, 'L · en hij is weg zodra de schat van haar is', String(na));
    await ctx.close();
  }

  /* ---- M · Wie geen beweging vraagt -------------------------------------
     prefers-reduced-motion verandert hóe een scherm zijn stand bereikt, niet
     wélke stand dat is. De JS-kant daarvan ligt vast in kern.test.js zaak N;
     hier staat wat een kind écht ziet, want in de CSS zit een val die je pas
     in een browser tegenkomt.

     Die val: sommige animaties zijn het enige dat hun element ooit zichtbaar
     maakt. De juichkaart staat op opacity 0 en wordt door praisePop opgehaald;
     de toast net zo. Ze allemaal netjes op
     `animation: none` zetten is dan geen rust maar verlies -- dan verdwijnt de
     kaart mét de diamanten erin, en de toast die vertelt wat het juiste
     antwoord was. Vandaar dat hier niet gemeten wordt of er iets uit staat,
     maar of het er nog stáát. Het "oh!" van de pop bij een misser hoort daar
     ook bij: het gezicht is een uitdrukking en blijft, alleen het ineenkrimpen
     valt weg. */
  {
    const { ctx, page } = await fresh(null, { reducedMotion: 'reduce' });
    await nieuweSter(page);
    // een hele wereld foutloos uitspelen: het drukste moment dat de app kent
    const r = await page.evaluate(async () => {
      const w = worldForIndex(0);
      for (let l = w.first; l < w.first + w.levels; l++) await window.__speel(l, 3);
      const pop = document.getElementById('end-avatar');
      const sterren = [...document.querySelectorAll('#end-stars span')];
      return {
        deeltjes: document.querySelectorAll('.confetti-bit, .burst-bit, .fly-dia, .fly-badge, .tap-ripple').length,
        sterren: sterren.length,
        helder: sterren.filter(x => !x.classList.contains('dim') && +getComputedStyle(x).opacity > .95).length,
        popKlas: pop.className,
        popBeweegt: getComputedStyle(pop).animationName,
        lampen: getComputedStyle(document.getElementById('end-stage'), '::after').animationName,
        feest: !!window.__feest(),
        spullen: P().owned.filter(id => isBeloning(id)),
      };
    });
    check(r.deeltjes === 0, 'M · er dwarrelt, vliegt en spat niets', String(r.deeltjes));
    check(r.sterren === 3 && r.helder === 3,
      'M · en de drie verdiende sterren staan er gewoon, alle drie', JSON.stringify(r));
    check(/\bidle\b/.test(r.popKlas) && !/move-|dancing/.test(r.popKlas) && r.popBeweegt === 'none',
      'M · de pop staat rechtop stil en niet halverwege een sprong', `${r.popKlas} / ${r.popBeweegt}`);
    check(r.lampen === 'none', 'M · de podiumlampen ademen niet', r.lampen);
    check(r.feest && r.spullen.join() === 'acc_wereld_muziek',
      'M · en de wereldschat wordt gewoon uitgereikt, met feestje', JSON.stringify(r));

    // De kaarten die iets te zeggen hebben: die horen er te staan, niet te gaan.
    const kaarten = await page.evaluate(async () => {
      showPraise('Goed zo, je had het!', '💎 +2');
      showToast('Het juiste antwoord was 7');
      // de pop in de zaal, en haar "oh!" bij een misser (zie oepsGezicht)
      const pop = document.getElementById('game-avatar-inner');
      pop.innerHTML = pasLaag(avatarSVG(P(), 168));
      oepsGezicht();
      await new Promise(res => setTimeout(res, 300));
      const zicht = id => {
        const st = getComputedStyle(document.getElementById(id));
        return { op: +st.opacity, tonen: st.display, vorm: st.transform };
      };
      // een los stukje met alleen die klasse erop: wat zou dít doen?
      const meet = klas => {
        const d = document.createElement('div');
        d.className = klas;
        document.body.appendChild(d);
        const naam = getComputedStyle(d).animationName;
        d.remove();
        return naam;
      };
      const laag = pop.querySelector('.pas-laag');
      const oeps = { mond: +getComputedStyle(pop.querySelector('.av-mond-o')).opacity,
                     lach: +getComputedStyle(pop.querySelector('.av-mond')).opacity,
                     schrik: getComputedStyle(laag).animationName };
      return { praise: zicht('praise'), toast: zicht('toast'), oeps,
               gouden: meet('question-card golden'), schud: meet('shake') };
    });
    const schaal = +(/matrix\(([-\d.]+)/.exec(kaarten.praise.vorm) || [0, 0])[1];
    check(kaarten.praise.op > .9 && Math.abs(schaal - 1) < .02,
      'M · de juichkaart met de diamanten erin staat er, en op ware grootte', JSON.stringify(kaarten.praise));
    check(kaarten.toast.op > .9 && kaarten.toast.tonen === 'flex',
      'M · de toast vertelt nog steeds wat het juiste antwoord was', JSON.stringify(kaarten.toast));
    check(kaarten.oeps.mond === 1 && kaarten.oeps.lach === 0 && kaarten.oeps.schrik === 'none',
      'M · bij een misser zegt haar gezicht "oh!", zonder dat ze ineenkrimpt', JSON.stringify(kaarten.oeps));
    check(kaarten.gouden === 'none', 'M · de gouden vraag blijft goud maar ademt niet', kaarten.gouden);
    check(kaarten.schud === 'none', 'M · en de hartjes schudden niet', kaarten.schud);
    await ctx.close();
  }

  /* ---- N · Het eindscherm past, ook op een telefoon op zijn kant ----
   * Het eindscherm hoort zonder scrollen in beeld te staan (zie .result-card in
   * 70-feest.css). Staand klopte dat al; liggend stond "Verder op tournee" onder
   * de rand. Gemeten op de demo-ster, met drie nieuwe trofeeën in de gouden pil:
   * de langste kaart die er is. Geslaagd én mislukt. */
  for (const [w, h] of [[844, 390], [667, 375], [568, 320], [320, 568], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    for (const gelukt of [true, false]) {
      await page.goto(APP_URL + '&demo&star=p1');
      await page.waitForFunction(() => typeof selectProfile === 'function');
      await page.evaluate(ok => { selectProfile('p1'); startLevel(6); G.stars = ok ? 3 : 0; endLevel(ok); }, gelukt);
      await page.waitForTimeout(3300);
      const r = await page.evaluate(() => {
        const s = document.getElementById('screen-end');
        const knoppen = ['btn-end-next', 'btn-end-alt'].map(id => document.getElementById(id).getBoundingClientRect());
        return { teVeel: s.scrollHeight - s.clientHeight, onder: Math.max(...knoppen.map(k => k.bottom)), h: innerHeight };
      });
      check(r.teVeel <= 1 && r.onder <= r.h,
        `N · het eindscherm past zonder scrollen op ${w}x${h} (${gelukt ? 'geslaagd' : 'mislukt'})`, JSON.stringify(r));
    }
    await ctx.close();
  }

  /* ---- O · Het eindscherm luistert pas als je de knoppen ziet ----
   * "Kleedkamer" staat waar tijdens de show de bovenste rij antwoorden stond.
   * Een tik daar vlak na het laatste antwoord opende de kleedkamer, en dan zag
   * een kind haar sterren niet (zie eindWacht). Een echte vinger, geen click(). */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    await page.goto(APP_URL + '&demo&star=p1');
    await page.waitForFunction(() => typeof selectProfile === 'function');
    await page.evaluate(() => { selectProfile('p1'); startLevel(6); G.stars = 3; endLevel(true); });
    const midden = await page.evaluate(() => {
      const r = document.getElementById('btn-end-alt').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await page.waitForTimeout(250);
    await page.touchscreen.tap(midden.x, midden.y);
    await page.waitForTimeout(400);
    const vroeg = await page.evaluate(() => document.querySelector('.screen.active').id);
    check(vroeg === 'screen-end', 'O · een tik op een onzichtbare knop doet niets', vroeg);
    await page.waitForFunction(() => !document.querySelector('#screen-end .end-actions').classList.contains('wacht'));
    await page.touchscreen.tap(midden.x, midden.y);
    await page.waitForTimeout(600);
    const laat = await page.evaluate(() => document.querySelector('.screen.active').id);
    check(laat === 'screen-dress', 'O · en zodra ze er staan werkt dezelfde tik wel', laat);
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
