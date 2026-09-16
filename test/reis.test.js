/*
 * De hele tournee (fase 4B): de reis boven de werelden uit.
 *
 * Wat hier vastligt is niet hoe het eruitziet -- dat is werk voor de ogen en voor
 * `npm run shots` -- maar de vier beloftes die de reis doet:
 *
 *   1  hij toont de voortgang, en hij bepáált hem nooit. Elke stand komt uit fase
 *      4A; een bestemming kiezen is kijken, geen vooruitgang.
 *   2  hij loopt van beneden naar boven, en de ster staat op de plek waar "verder"
 *      heen gaat -- ook in de toegift-stand, als alles uit is.
 *   3  hij verklapt niets: een wereld die nog niet uitgebracht is heeft hier geen
 *      naam, geen kleur en geen tekening die opgehaald wordt.
 *   4  hij groeit mee. Een zevende wereld is één regel in WORLDS en verder niets:
 *      een bestemming erbij, een stap hoger, en geen enkel getal dat verhuist.
 *
 * Draaien:
 *   npm run test:reis          (of: npm test voor alle suites)
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

  // Elke zaak begint schoon: de werelden worden per zaak anders gezet (released,
  // en in zaak G komt er zelfs een wereld bij), en dat mag nooit doorlekken.
  async function fresh(maat) {
    const ctx = await browser.newContext({ viewport: maat || { width: 390, height: 844 } });
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
      // werelden uitspelen zoals een kind dat doet: elke show één keer, met sterren
      window.__speel = (n, sterren) => {
        const q = db.profiles.p1;
        for (let i = 0; i < n; i++) {
          const w = WORLDS[i];
          for (let l = WORLD_START[i]; l < WORLD_START[i] + w.levels; l++) q.stars[l] = sterren == null ? 2 : sterren;
        }
        q.level = n < WORLD_START.length ? WORLD_START[n] : WORLD_LAST + 1;
      };
      window.__breng = n => {
        WORLDS.forEach((w, i) => { if (i < n) delete w.released; else w.released = false; });
        rebuildWorldStarts();
      };
      // de stand van de reis, zoals hij op het scherm staat
      window.__reis = () => {
        const haltes = [...document.querySelectorAll('.reis-halte')].map(b => {
          const r = b.getBoundingClientRect();
          return {
            w: Number(b.dataset.w), klas: b.className, aan: !b.disabled,
            naam: (b.querySelector('.rn-tekst') || {}).textContent || null,
            zegel: !!b.querySelector('.reis-zegel:not(.slot)'), ster: !!b.querySelector('.reis-pop'),
            glans: !!b.querySelector('.reis-glans'),
            slot: !!b.querySelector('.reis-zegel.slot'), art: !!b.querySelector('.reis-art'),
            teller: (b.querySelector('.reis-sterren') || {}).textContent || null,
            top: Math.round(r.top), midden: Math.round(r.top + r.height / 2),
            breed: Math.round(r.width), hoog: Math.round(r.height),
          };
        });
        const sch = document.getElementById('screen-journey');
        return {
          haltes, scrollTop: Math.round(sch.scrollTop), venster: sch.clientHeight,
          baan: Math.round(document.getElementById('reis-track').getBoundingClientRect().height),
          vervolg: !!document.querySelector('.reis-vervolg'),
          goud: !!document.querySelector('.reis-weg-gelopen'),
          terug: document.getElementById('reis-terug').classList.contains('aan'),
          actief: sch.classList.contains('active'),
        };
      };
      window.__stand = () => ({
        level: P().level, grens: frontierWorld(P()), verder: continueWorld(P()),
        sterren: totalStarCount(P()), kijkt: viewWorldIdx,
        uit: WORLDS.map((w, i) => worldDone(P(), i)),
      });
    });
    return { ctx, page };
  }
  const open = async page => {
    await page.evaluate(() => { selectProfile('p1'); });
    await page.waitForTimeout(400);
    await page.evaluate(() => openReis());
    await page.waitForTimeout(500);
  };

  /* ================= A · De baan =================
     De bestemmingen staan in reisvolgorde en de reis loopt van beneden naar boven:
     wereld 1 staat lager op het scherm dan wereld 4.

     Niet élke geschreven wereld staat erop. Een verse ster staat bij wereld 1 en
     kijkt drie bestemmingen vooruit (REIS_VOORUIT), dus er staan er vier. Wat
     daarboven ligt zegt de mist, en die telt niet hoeveel het er zijn -- zie
     laatsteZichtbareWereld(). */
  {
    const { ctx, page } = await fresh();
    await open(page);
    const r = await page.evaluate(() => ({ ...__reis(), n: WORLDS.length, vooruit: REIS_VOORUIT }));
    check(r.actief, 'A · de tournee gaat open', JSON.stringify(r.actief));
    check(r.haltes.length === 1 + r.vooruit && r.n > r.haltes.length,
      'A · je ziet waar je bent plus een paar bestemmingen vooruit, niet alles',
      `${r.haltes.length} van ${r.n}`);
    check(r.vervolg, 'A · en bovenaan staat dat er nog meer ligt', '');
    check(r.haltes.every((h, i) => h.w === i), 'A · in reisvolgorde', JSON.stringify(r.haltes.map(h => h.w)));
    const omhoog = r.haltes.every((h, i) => i === 0 || h.midden < r.haltes[i - 1].midden);
    check(omhoog, 'A · en van beneden naar boven', JSON.stringify(r.haltes.map(h => h.midden)));
    check(r.goud, 'A · met een gouden spoor tot waar ze is', '');
    // raakvlak: elke bestemming is met een vinger te raken (44px is de ondergrens)
    check(r.haltes.every(h => h.breed >= 44 && h.hoog >= 44),
      'A · elke bestemming is groot genoeg voor een vinger',
      JSON.stringify(r.haltes.map(h => h.breed + 'x' + h.hoog)));
    await ctx.close();
  }

  /* ================= B · De vier standen =================
     Een verse ster: wereld 1 is waar ze is, de drie erboven zijn uitgebracht maar
     nog niet aan de beurt, en alles daarbóven staat er niet -- of het nu uitgebracht
     is (wereld 5) of niet (wereld 6). Een kind ziet dus nergens een vraagteken en
     nergens een naam van iets waar het nog niet mag komen. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => __breng(5));     // wereld 6 nog niet uitgebracht
    await open(page);
    const r = await page.evaluate(() => ({ ...__reis(), tekst: document.getElementById('reis-track').textContent }));
    const nu = r.haltes.filter(h => /\bnu\b/.test(h.klas));
    check(nu.length === 1 && nu[0].w === 0, 'B · precies één bestemming is "hier ben je"', JSON.stringify(nu.map(h => h.w)));
    check(nu[0].ster && r.haltes.filter(h => h.ster).length === 1,
      'B · en alleen daar staat de ster', JSON.stringify(r.haltes.map(h => h.ster)));
    check(r.haltes.filter(h => h.zegel).length === 0, 'B · niets uitgespeeld, dus geen zegel', '');
    const verder = r.haltes.filter(h => /verder/.test(h.klas));
    check(verder.length === 3 && verder.every(h => h.slot && !h.aan),
      'B · wat nog niet aan de beurt is heeft een slot en doet niets', JSON.stringify(verder.map(h => h.w)));
    check(r.haltes.every(h => h.w <= 3),
      'B · voorbij de horizon staat er niets -- ook geen vraagteken in de mist',
      JSON.stringify(r.haltes.map(h => h.w)));
    check(r.tekst.indexOf('Toverwereld') < 0 && r.tekst.indexOf('IJswereld') < 0,
      'B · en hun namen staan nergens op het scherm', r.tekst.slice(0, 120));
    check(r.vervolg, 'B · bovenaan staat wél dat er nog meer ligt', '');
    /* De tekening van een wereld op slot blijft staan -- gedimd, maar zichtbaar:
       "ik zie de piratenwereld daarboven" is precies waarom een kind doorspeelt. */
    check(r.haltes.filter(h => h.art).length === r.haltes.length,
      'B · ook een wereld op slot toont zijn tekening',
      JSON.stringify(r.haltes.map(h => h.art)));
    check(verder.every(h => !h.teller) && nu[0].teller,
      'B · en een teller staat alleen waar er iets te tellen valt',
      JSON.stringify(r.haltes.map(h => h.teller)));
    await ctx.close();
  }

  /* ================= B2 · De horizon schuift mee =================
     Wat je vooruit ziet hangt aan waar je bent, niet aan hoeveel werelden er
     geschreven zijn. Twee werelden verder betekent twee bestemmingen meer onder je
     én de horizon twee hoger -- tot hij het einde van wat uitgebracht is raakt, en
     dan verdwijnt ook de belofte bovenaan, want er ligt niets meer voorbij.

     Dit is de zaak die ertoe doet als de tournee groeit: bij dertig werelden hoort
     dit scherm niet dertig kaartjes te tonen. */
  {
    const { ctx, page } = await fresh();
    await open(page);
    const vers = await page.evaluate(() => __reis());
    check(vers.haltes.length === 4 && vers.vervolg,
      'B2 · een verse ster ziet vier bestemmingen, en dat er meer ligt',
      JSON.stringify({ n: vers.haltes.length, meer: vers.vervolg }));
    const twee = await page.evaluate(async () => {
      const wacht = ms => new Promise(res => setTimeout(res, ms));
      __speel(2);                                  // wereld 1 en 2 uit
      renderReis(); await wacht(200);
      return __reis();
    });
    check(twee.haltes.length === 6 && twee.haltes.filter(h => h.zegel).length === 2,
      'B2 · twee werelden uit: twee zegels eronder, en de horizon schuift mee',
      JSON.stringify({ n: twee.haltes.length, zegels: twee.haltes.filter(h => h.zegel).length }));
    check(!twee.vervolg,
      'B2 · en nu de horizon het einde raakt, belooft de mist niets meer', JSON.stringify(twee.vervolg));
    /* Een tournee die twee keer zo lang is verandert daar niets aan: de horizon
       hangt aan het kind, niet aan de lijst. */
    const lang = await page.evaluate(async () => {
      const wacht = ms => new Promise(res => setTimeout(res, ms));
      for (let i = 0; i < 6; i++) {
        WORLDS.push({ id: 'proef' + i, name: 'Proefwereld ' + i, icon: '🎪', levels: 8,
          theme: { sky: '#2b5f8a', deep: '#0d1f33', glow: '#4f88a8', road: '#cfe3f2' } });
      }
      rebuildWorldStarts(); rebuildWorldBadges();
      renderReis(); await wacht(200);
      return { ...__reis(), n: WORLDS.length };
    });
    check(lang.n === 12 && lang.haltes.length === 6,
      'B2 · twaalf werelden geschreven, nog steeds zes bestemmingen op het scherm',
      JSON.stringify({ geschreven: lang.n, getoond: lang.haltes.length }));
    check(lang.vervolg,
      'B2 · en bovenaan staat weer dat er meer ligt', JSON.stringify(lang.vervolg));
    await ctx.close();
  }

  /* ================= C · Kiezen is kijken =================
     Twee werelden uit, de derde half: de grens is de derde. Terug naar de eerste
     mag, en dan hoort er precies niets aan de voortgang te verschuiven. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => {
      __speel(2);
      const q = db.profiles.p1;
      for (let l = WORLD_START[2]; l < WORLD_START[2] + 3; l++) q.stars[l] = 2;
      q.level = WORLD_START[2] + 3;
    });
    await open(page);
    const voor = await page.evaluate(() => __stand());
    const r = await page.evaluate(() => __reis());
    const nu = r.haltes.filter(h => /\bnu\b/.test(h.klas))[0];
    check(nu && nu.w === 2, 'C · de grens van fase 4A is de huidige bestemming', JSON.stringify(nu && nu.w));
    check(r.haltes.filter(h => h.zegel).map(h => h.w).join() === '0,1',
      'C · de twee uitgespeelde werelden dragen een zegel', JSON.stringify(r.haltes.map(h => h.zegel)));
    /* De teller komt uit dezelfde bron als de wereldbadge in de kast. Hij hoort dus
       exact te zeggen wat worldStars() zegt -- geen los getal op het scherm. */
    const echt = await page.evaluate(() => WORLDS.map((w, i) => {
      const v = worldStars(P(), worldForIndex(i));
      return v.got + '/' + v.max;
    }));
    check(r.haltes.slice(0, 3).every(h => (h.teller || '').indexOf(echt[h.w]) >= 0),
      'C · de sterrenteller zegt wat de voortgang zegt',
      JSON.stringify([r.haltes.map(h => h.teller), echt]));
    check(r.haltes[0].aan && r.haltes[1].aan && r.haltes[2].aan && !r.haltes[3].aan,
      'C · alles t/m de grens is te bezoeken, daarna niet', JSON.stringify(r.haltes.map(h => h.aan)));

    await page.click('.reis-halte[data-w="0"]');
    await page.waitForTimeout(700);
    const na = await page.evaluate(() => ({ ...__stand(), kaart: document.getElementById('screen-map').classList.contains('active'),
      kop: document.getElementById('map-tournee-label').textContent }));
    check(na.kaart && na.kijkt === 0 && /Muziekwereld/.test(na.kop),
      'C · een bestemming kiezen opent die échte wereldkaart', JSON.stringify(na));
    check(na.level === voor.level && na.grens === voor.grens && na.verder === voor.verder
      && na.sterren === voor.sterren && na.uit.join() === voor.uit.join(),
      'C · en raakt de voortgang met geen vinger aan', JSON.stringify({ voor, na }));

    // en de weg terug: de tournee weer openen en sluiten komt uit waar je was
    await page.evaluate(() => openReis());
    await page.waitForTimeout(450);
    await page.evaluate(() => reisSluit());
    await page.waitForTimeout(700);
    const terug = await page.evaluate(() => ({ ...__stand(), kaart: document.getElementById('screen-map').classList.contains('active') }));
    check(terug.kaart && terug.kijkt === 0 && terug.level === voor.level,
      'C · sluiten brengt je terug op de kaart waar je vandaan kwam', JSON.stringify(terug));

    /* En hoe die kaart binnenkomt. Hij hoort vanaf zijn eerste beeldje
       ondoorzichtig én zo groot als het venster te zijn: alleen de reis erbovenop
       doft weg. Stond de kaart kleiner (dat was zo: scale(.94) translateY(10px)),
       dan zag je hem als een kaartje midden in beeld met een rand van de reis
       eromheen, en dan groeien tot hij paste -- op de wereldkaart viel dat het
       meest op aan de weg, die eerst kleiner stond en daarna op zijn plek schoof. */
    await page.evaluate(() => openReis());
    await page.waitForTimeout(600);
    const komst = await page.evaluate(async () => {
      const kaart = document.getElementById('screen-map');
      const reis = document.getElementById('screen-journey');
      const op = el => +getComputedStyle(el).opacity;
      const dekt = el => {
        const b = el.getBoundingClientRect();
        return b.left <= 0.5 && b.top <= 0.5
          && b.right >= innerWidth - 0.5 && b.bottom >= innerHeight - 0.5;
      };
      const m = [];
      document.querySelector('.reis-halte[data-w="1"]').click();
      for (let i = 0; i < 30; i++) {
        m.push({ k: op(kaart), r: op(reis), maat: dekt(kaart) });
        await new Promise(res => requestAnimationFrame(res));
      }
      return {
        dekkend: m.every(x => Math.max(x.k, x.r) > 0.999),
        kaartVol: m.every(x => x.k > 0.999),
        kaartDekt: m.every(x => x.maat),
        reisWeg: m.some(x => x.r < 0.05),
      };
    });
    check(komst.dekkend && komst.reisWeg,
      'C · een bestemming kiezen laat op geen enkel beeldje iets doorschemeren', JSON.stringify(komst));
    check(komst.kaartVol && komst.kaartDekt,
      'C · de kaart komt ondoorzichtig op en is nooit kleiner dan het venster', JSON.stringify(komst));
    await ctx.close();
  }

  /* ================= C2 · Vol tegen uitgespeeld =================
     Twee werelden uit: de eerste op alle sterren, de tweede niet. Dat verschil is
     de hele reden dat de teller er staat, en het hoort zonder te lezen te zien te
     zijn: één zegel per kaart, en alleen de volle wereld krijgt de gouden rand. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => {
      const q = db.profiles.p1;
      for (let l = WORLD_START[0]; l < WORLD_START[0] + WORLDS[0].levels; l++) q.stars[l] = 3;
      for (let l = WORLD_START[1]; l < WORLD_START[1] + WORLDS[1].levels; l++) q.stars[l] = 2;
      q.level = WORLD_START[2];
    });
    await open(page);
    const r = await page.evaluate(() => ({ ...__reis(),
      vol: WORLDS.map((w, i) => worldAvailable(i) && worldProgress(P(), worldForIndex(i)).vol) }));
    check(r.vol[0] && !r.vol[1], 'C2 · de eerste wereld is vol, de tweede niet', JSON.stringify(r.vol));
    check(/\bvol\b/.test(r.haltes[0].klas) && !/\bvol\b/.test(r.haltes[1].klas),
      'C2 · en dat staat zo op de kaart', JSON.stringify(r.haltes.slice(0, 2).map(h => h.klas)));
    /* De volle wereld draagt geen badge maar een glinstering; de uitgespeelde een
       stil vinkje. Dat onderscheid is de hele reden dat er geen tweede gouden schijf
       op de kaart ligt: een schijfje leest als een knop, een glans niet. */
    check(r.haltes[0].glans && !r.haltes[0].zegel,
      'C2 · de volle wereld glinstert en draagt geen badge', JSON.stringify(r.haltes[0]));
    check(r.haltes[1].zegel && !r.haltes[1].glans,
      'C2 · de uitgespeelde wereld draagt het vinkje', JSON.stringify(r.haltes[1]));
    // nooit twee tekens op één kaart
    const tekens = await page.evaluate(() =>
      [...document.querySelectorAll('.reis-halte')].map(el => el.querySelectorAll('.reis-zegel, .reis-glans').length));
    check(tekens.every(z => z <= 1), 'C2 · en nooit meer dan één teken per bestemming', JSON.stringify(tekens));
    const rand = await page.evaluate(() => [0, 1].map(i => {
      const el = document.querySelector(`.reis-halte[data-w="${i}"] .reis-plaats`);
      return getComputedStyle(el).boxShadow.indexOf('inset') >= 0;
    }));
    check(rand[0] && !rand[1], 'C2 · alleen de volle wereld draagt de gouden rand', JSON.stringify(rand));
    check((r.haltes[0].teller || '').indexOf('24/24') >= 0,
      'C2 · en zijn teller staat vol', JSON.stringify(r.haltes[0].teller));
    await ctx.close();
  }

  /* ================= D · Waar de reis opengaat =================
     Niet onderaan. Wie vier werelden verder is hoort zichzelf meteen te zien, met
     een stuk gereisde weg eronder en de volgende bestemming erboven. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => __speel(4));
    await open(page);
    const r = await page.evaluate(() => __reis());
    const nu = r.haltes.filter(h => /\bnu\b/.test(h.klas))[0];
    check(r.scrollTop > 0, 'D · de reis opent niet onderaan', String(r.scrollTop));
    check(nu && nu.midden > 0 && nu.midden < r.venster,
      'D · de huidige bestemming staat in beeld', JSON.stringify(nu && nu.midden) + ' / ' + r.venster);
    check(nu && nu.midden > r.venster * 0.4,
      'D · met de afgelegde reis eronder', JSON.stringify(nu && nu.midden) + ' / ' + r.venster);
    const boven = r.haltes.filter(h => h.w === 5)[0];
    check(boven && boven.midden < (nu || {}).midden,
      'D · en een glimp van wat er nog komt erboven', JSON.stringify(boven && boven.midden));
    await ctx.close();
  }

  /* ================= E · Alles uit: de toegift =================
     Geen grens meer. De laatste wereld blijft de plek waar ze staat, er komt géén
     verzonnen wereld bij, en bovenaan zegt de mist dat het doorgaat. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => __speel(WORLDS.length));
    await open(page);
    const r = await page.evaluate(() => ({ ...__reis(), ...__stand(), allesUit: allWorldsDone(P()), n: WORLDS.length }));
    check(r.allesUit && r.grens === -1, 'E · alles is uit', JSON.stringify({ grens: r.grens }));
    check(r.haltes.length === r.n, 'E · er komt geen verzonnen bestemming bij', String(r.haltes.length));
    const nu = r.haltes.filter(h => /\bnu\b/.test(h.klas));
    check(nu.length === 1 && nu[0].w === r.n - 1 && nu[0].zegel,
      'E · de ster staat op de laatste wereld, uitgespeeld en al', JSON.stringify(nu));
    check(r.haltes.every(h => h.zegel), 'E · en alles eronder draagt een zegel', JSON.stringify(r.haltes.map(h => h.zegel)));
    check(r.vervolg, 'E · bovenaan staat dat het verhaal doorgaat', '');
    await ctx.close();
  }

  /* ================= F · Er komt een wereld bij =================
     Eén regel in WORLDS. De reis hoort er een bestemming bij te krijgen en één stap
     hoger te worden -- en verder niets: geen verhuisde sterren, geen ander midden,
     geen herontwerp. */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => __speel(6));
    await open(page);
    const voor = await page.evaluate(() => ({ ...__reis(), ...__stand() }));
    const na = await page.evaluate(async () => {
      const wacht = ms => new Promise(res => setTimeout(res, ms));
      WORLDS.push({ id: 'proef', name: 'Proefwereld', icon: '🎪', levels: 8,
        theme: { sky: '#2b5f8a', deep: '#0d1f33', glow: '#4f88a8', road: '#cfe3f2' } });
      rebuildWorldStarts();
      rebuildWorldBadges();
      renderReis();
      await wacht(120);
      return { ...__reis(), ...__stand() };
    });
    check(na.haltes.length === voor.haltes.length + 1,
      'F · een zevende wereld is een bestemming erbij', `${voor.haltes.length} -> ${na.haltes.length}`);
    check(na.baan > voor.baan, 'F · en de baan wordt hoger', `${voor.baan} -> ${na.baan}`);
    check(na.sterren === voor.sterren && na.uit.slice(0, 6).join() === voor.uit.slice(0, 6).join(),
      'F · zonder dat er één ster verhuist', JSON.stringify({ voor: voor.sterren, na: na.sterren }));
    const nu = na.haltes.filter(h => /\bnu\b/.test(h.klas));
    check(na.grens === 6 && nu.length === 1 && nu[0].w === 6,
      'F · de nieuwe wereld is meteen de nieuwe grens', JSON.stringify({ grens: na.grens, nu: nu.map(h => h.w) }));
    // een wereld zonder tekening valt terug op zijn eigen kleuren en blijft speelbaar
    check(!nu[0].art && nu[0].naam === 'Proefwereld',
      'F · een wereld zonder tekening draagt zichzelf', JSON.stringify(nu[0]));
    await ctx.close();
  }

  /* ================= F2 · Terug naar waar je bent =================
     Wegscrollen mag -- daar is een kaart voor. Maar wie zichzelf uit beeld heeft
     gescrold hoort één knopje te krijgen om terug te komen, en zolang ze in beeld
     staat hoort dat knopje er niet te zijn. */
  {
    /* Vijf werelden uit: zij staat bovenaan een baan die ruim langer is dan het
       venster, dus helemaal naar beneden scrollen zet haar écht uit beeld. (Een
       verse ster ziet sinds de horizon maar vier bestemmingen, en die baan is te
       kort om jezelf mee kwijt te raken.) */
    const { ctx, page } = await fresh();
    await page.evaluate(() => __speel(5));
    await open(page);
    const r = await page.evaluate(async () => {
      const wacht = ms => new Promise(res => setTimeout(res, ms));
      const sch = document.getElementById('screen-journey');
      const knop = document.getElementById('reis-terug');
      const bij = knop.classList.contains('aan');
      sch.scrollTop = sch.scrollHeight;        // helemaal omlaag, terug naar wereld 1
      await wacht(120);
      const weg = knop.classList.contains('aan');
      const teken = knop.textContent;
      knop.click();
      await wacht(900);                        // hij glijdt terug
      const r2 = document.querySelector('.reis-halte.nu').getBoundingClientRect();
      const s2 = sch.getBoundingClientRect();
      return { bij, weg, teken, terug: !knop.classList.contains('aan'),
               inBeeld: r2.top > s2.top && r2.bottom < s2.bottom };
    });
    check(!r.bij, 'F2 · staat ze in beeld, dan is er geen knopje', JSON.stringify(r.bij));
    check(r.weg && r.teken === '\u2191', 'F2 · ver weg gescrold verschijnt het, met de goede richting', JSON.stringify(r));
    check(r.inBeeld && r.terug, 'F2 · en het brengt haar terug in beeld', JSON.stringify(r));
    await ctx.close();
  }

  /* ================= G · Op een kleine telefoon =================
     De reis schuift verticaal en nóóit zijwaarts, en niets hangt half buiten beeld. */
  {
    const { ctx, page } = await fresh({ width: 320, height: 568 });
    await page.evaluate(() => __speel(3));
    await open(page);
    const r = await page.evaluate(() => {
      const sch = document.getElementById('screen-journey');
      const breedte = sch.clientWidth;
      const uit = [...document.querySelectorAll('.reis-halte')].map(el => {
        const b = el.getBoundingClientRect();
        return { links: Math.round(b.left), rechts: Math.round(b.right) };
      });
      return { breedte, uit, zijwaarts: sch.scrollWidth > sch.clientWidth + 1,
        body: document.body.scrollWidth > innerWidth + 1,
        verticaal: sch.scrollHeight > sch.clientHeight + 4 };
    });
    check(!r.zijwaarts && !r.body, 'G · er valt niets zijwaarts te schuiven', JSON.stringify(r.zijwaarts));
    check(r.verticaal, 'G · wél verticaal', String(r.verticaal));
    check(r.uit.every(b => b.links >= -1 && b.rechts <= r.breedte + 1),
      'G · en niets hangt buiten het scherm', JSON.stringify(r.uit.filter(b => b.links < -1 || b.rechts > r.breedte + 1)));

    /* De ster staat óp haar bestemming en steekt daarbij boven de tekening uit --
       precies de kant op waar de volgende bestemming ligt. Op de kleinste telefoon
       is de stap het krapst, dus als die twee elkaar ooit raken, dan hier. Dat is
       ook waar --reis-stap zijn ondergrens vandaan komt: die is uit deze maten
       opgeteld, niet gekozen. */
    const botsing = await page.evaluate(() => {
      const pop = document.querySelector('.reis-pop');
      if (!pop) return 'geen ster';
      const s = pop.getBoundingClientRect();
      const eigen = pop.closest('.reis-halte');
      return [...document.querySelectorAll('.reis-halte')].filter(el => el !== eigen).filter(el => {
        const n = el.getBoundingClientRect();
        return s.left < n.right && s.right > n.left && s.top < n.bottom && s.bottom > n.top;
      }).map(el => (el.querySelector('.rn-tekst') || {}).textContent || '?');
    });
    check(Array.isArray(botsing) && !botsing.length,
      'G · en de ster loopt door geen enkele andere bestemming heen', JSON.stringify(botsing));
    await ctx.close();
  }

  /* ================= H · De randen van het scherm =================
     Twee dingen die alleen aan de uiterste standen van de schuif te zien zijn, en
     allebei het soort fout dat je pas op een echt toestel opmerkt:

       boven  de kaart schuift onder de kop door, en een wereldnaam mag daar niet
              half leesbaar achter blijven hangen
       onder  helemaal naar beneden gescrold moet de ónderste wereld vrij van de
              navigatiebalk staan -- anders is er een wereld die je nooit helemaal
              ziet                                                                 */
  {
    const { ctx, page } = await fresh();
    await page.evaluate(() => __speel(3));
    await open(page);
    const r = await page.evaluate(async () => {
      const wacht = ms => new Promise(res => setTimeout(res, ms));
      const sch = document.getElementById('screen-journey');
      const kop = sch.querySelector('.hub-sticky');
      const sluier = getComputedStyle(kop, '::before');
      const k = kop.getBoundingClientRect();
      // de sluier moet voorbij de onderrand van de kop doorlopen én daar dekkend zijn
      const hoog = parseFloat(sluier.height) || 0;
      const dekt = (sluier.backgroundImage.match(/rgb\(18,\s*8,\s*32\)/g) || []).length;

      sch.scrollTop = sch.scrollHeight;               // helemaal naar beneden
      await wacht(160);
      const kaarten = [...document.querySelectorAll('.reis-halte')];
      const onderste = kaarten[0].getBoundingClientRect();
      const balk = document.getElementById('main-nav').getBoundingClientRect();

      sch.scrollTop = 0;                              // en helemaal naar boven
      await wacht(160);
      const bovenste = kaarten[kaarten.length - 1].getBoundingClientRect();
      return { hoog, kopHoog: k.height, dekt,
               vrij: Math.round(balk.top - onderste.bottom),
               bovenVrij: Math.round(bovenste.top - k.bottom) };
    });
    check(r.hoog >= r.kopHoog + 40 && r.dekt >= 2,
      'H · de sluier onder de kop loopt door en dekt écht', JSON.stringify(r));
    check(r.vrij >= 8, 'H · onderaan staat de laatste wereld vrij van de balk', JSON.stringify(r.vrij));
    check(r.bovenVrij >= 0, 'H · bovenaan staat de eerste wereld vrij van de kop', JSON.stringify(r.bovenVrij));
    await ctx.close();
  }

  await browser.close();

  const labels = Object.keys(counts).sort();
  let pass = 0, fail = 0;
  labels.forEach(l => { pass += counts[l].pass; fail += counts[l].fail; });
  labels.forEach(l => {
    const c = counts[l];
    console.log(` ${c.fail ? 'FOUT  ' : 'ok    '} ${l}  (${c.pass} ok${c.fail ? ', ' + c.fail + ' fout' : ''})`);
  });
  if (pageErrors.length) {
    console.log('\nFouten in de pagina (' + pageErrors.length + '):');
    [...new Set(pageErrors)].slice(0, 10).forEach(e => console.log('  ' + e));
  }
  if (fails.length) {
    console.log('\nDetails:');
    fails.forEach(f => console.log('  ' + f));
  }
  console.log(`\n${pass}/${pass + fail} controles geslaagd.`);
  if (fail || pageErrors.length) process.exitCode = 1;
})();
