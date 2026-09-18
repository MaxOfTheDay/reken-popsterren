/*
 * De wereldstudio (?debug&mapedit): het gereedschap waarmee een wereld gemaakt
 * en nagekeken wordt.
 *
 * Wat hier vastligt is niet hoe het paneel eruitziet -- dat is werk voor de ogen
 * -- maar de beloftes die het doet, en precies die beloftes zijn de reden dat de
 * studio bestaat:
 *
 *   A  hij blijft klein: drie bezigheden, drie tabbladen, en de kaart hiernaast
 *      is het voorbeeld (er is geen apart voorbeeld-tabblad meer)
 *   B  een naam is genoeg: het id, het pad van de tekening en de twee trofeeën
 *      rollen daaruit -- je hoeft niets over de binnenkant te weten
 *   C  de beloning van een wereld hoort bij die wereld, en een kapotte verwijzing
 *      wordt gezien
 *   D  slepen verandert die ene wereld en niets anders
 *   E  de standen zijn de échte standen van het spel (p.stars en p.level), geen
 *      nagemaakte studio-plaatjes
 *   F  de controle kijkt álle werelden na en zegt erbij wáár je het oplost
 *   G  hij bewaart een concept apart van het spel: een half afgemaakte wereld kan
 *      nooit bij een kind terechtkomen
 *   I  de standen en schermen waar de Dev Studio knoppen voor heeft, openen ook
 *      echt -- en schrijven niets weg
 *
 * Draaien:
 *   npm run test:studio        (of: npm test voor alle suites)
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

  async function studio() {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    page.on('console', m => {
      // de studio vraagt bestanden op die er (nog) niet zijn; dat is haar werk
      if (m.type() === 'error' && !/404|ERR_FILE_NOT_FOUND|ERR_CONNECTION_RESET/.test(m.text())) {
        pageErrors.push('CONSOLE ' + m.text());
      }
    });
    await page.goto(APP_URL + '&demo&star=p1&screen=map&mapedit');
    await page.waitForSelector('#studio');
    await page.waitForTimeout(400);
    return { ctx, page };
  }

  // ---- A: klein blijven ---------------------------------------------------
  {
    const { ctx, page } = await studio();
    const tabs = await page.$$eval('#studio .st-tabs button', bs => bs.map(b => b.textContent.trim()));
    check(tabs.length === 3, 'A · drie tabbladen', tabs.join(','));
    check(tabs.join(',') === 'Werelden,Beelden,Publiceren', 'A · en het zijn deze drie', tabs.join(','));
    check(!tabs.some(t => /voorbeeld/i.test(t)), 'A · geen apart voorbeeld-tabblad meer', tabs.join(','));
    // wat het voorbeeld-tabblad waard was staat nu boven de tabbladen, bij de kaart
    for (const id of ['st-toestel', 'st-stand', 'st-vscherm', 'st-venster']) {
      const waar = await page.evaluate(i => {
        const el = document.getElementById(i);
        return el ? (el.closest('.st-kijk') ? 'kijkvak' : 'elders') : 'weg';
      }, id);
      check(waar === 'kijkvak', 'A · ' + id + ' staat in het kijkvak', waar);
    }
    const maten = await page.$$eval('#st-toestel option', os => os.length);
    check(maten > 3 && maten < 10, 'A · een handvol toestelmaten, geen catalogus', String(maten));
    await ctx.close();
  }

  // ---- B: een naam is genoeg ---------------------------------------------
  {
    const { ctx, page } = await studio();
    const afgeleid = await page.evaluate(() => [
      wereldId('Muziekwereld'), wereldId('IJswereld'), wereldId('Wereld van Sem'),
      wereldId('Piratenwereld'), wereldId('  Café Wereld  '), wereldId('Wereld'),
    ]);
    check(afgeleid[0] === 'muziek', 'B · Muziekwereld -> muziek', afgeleid[0]);
    check(afgeleid[1] === 'ijs', 'B · IJswereld -> ijs', afgeleid[1]);
    check(afgeleid[2] === 'wereld-van-sem', 'B · spaties worden streepjes', afgeleid[2]);
    check(afgeleid[4] === 'cafe', 'B · accenten worden gewone letters', afgeleid[4]);
    check(afgeleid[5] === 'wereld', 'B · "Wereld" houdt zijn naam, want leeg is erger', afgeleid[5]);
    const pad = await page.evaluate(() => wereldArtPad('ijs'));
    check(pad === 'assets/world/ijs-map.webp', 'B · en het pad volgt uit het id', pad);
    // elke wereld in het spel heeft het id dat haar naam zou opleveren
    const klopt = await page.evaluate(() => WORLDS.map(w => w.id === wereldId(w.name)));
    check(klopt.every(Boolean), 'B · de bestaande werelden passen op dezelfde regel', JSON.stringify(klopt));
    // een dubbel id krijgt vanzelf een cijfer -- twee keer hetzelfde is een fout
    const vrij = await page.evaluate(() => [vrijWereldId('Muziekwereld'), vrijWereldId('Iets nieuws')]);
    check(vrij[0] === 'muziek-2', 'B · een bezet id wijkt uit', vrij[0]);
    check(vrij[1] === 'iets-nieuws', 'B · een vrij id blijft zoals het is', vrij[1]);
    // en het paneel toont het afgeleide zonder dat je het intikt
    const regel = await page.$eval('#mf-afgeleid', e => e.textContent);
    check(/muziek/.test(regel) && /assets\/world\/muziek-map\.webp/.test(regel),
      'B · het paneel laat zien wat eruit volgt', regel);
    check(/perfect-muziek/.test(regel) && !/wereld-muziek/.test(regel),
      'B · inclusief de perfecte-wereldtrofee, en die is er maar één', regel);
    await ctx.close();
  }

  // ---- C: de beloning hoort bij de wereld ---------------------------------
  {
    const { ctx, page } = await studio();
    const bel = await page.evaluate(() => ({
      naam: document.getElementById('st-bel-naam').textContent,
      id: document.getElementById('st-bel-uit').textContent,
      opties: document.getElementById('mf-beloning').options.length,
    }));
    check(bel.id === 'acc_wereld_muziek', 'C · de beloning van de wereld staat er', bel.id);
    check(bel.opties > 50, 'C · en je kunt er een ander spulletje van maken', String(bel.opties));
    // de tovenaarshoed die er al is, blijft de beloning van de Toverwereld
    const tover = await page.evaluate(() =>
      (WORLDS.filter(w => w.id === 'tover')[0] || {}).beloning);
    check(tover === 'acc_wereld_tover', 'C · de Toverwereld deelt de tovenaarshoed uit', String(tover));
    // wisselen doet het, en het komt in WORLDS terecht
    await page.selectOption('#mf-beloning', 'acc_kroon');
    await page.waitForTimeout(150);
    const na = await page.evaluate(() => WORLDS[0].beloning);
    check(na === 'acc_kroon', 'C · een andere beloning kiezen werkt', String(na));
    // een kapotte verwijzing wordt gezien, een ontbrekende alleen gemeld
    const punten = await page.evaluate(() => {
      WORLDS[0].beloning = 'bestaat_niet';
      const stuk = wereldControle({}).filter(x => /bestaat_niet/.test(x.t));
      delete WORLDS[0].beloning;
      const leeg = wereldControle({}).filter(x => x.waar === 'beloning');
      return { stuk: stuk.map(x => x.ernst), leeg: leeg.map(x => x.ernst) };
    });
    check(punten.stuk[0] === 'fout', 'C · een beloning die niet bestaat is een fout', JSON.stringify(punten.stuk));
    check(punten.leeg[0] === 'let op', 'C · géén beloning is een opmerking, geen fout', JSON.stringify(punten.leeg));
    const dubbel = await page.evaluate(() => {
      WORLDS[0].beloning = WORLDS[1].beloning;
      const uit = wereldControle({}).filter(x => x.waar === 'beloning' && x.ernst === 'fout').length;
      WORLDS[0].beloning = 'acc_wereld_muziek';
      return uit;
    });
    check(dubbel > 0, 'C · twee werelden met hetzelfde spulletje is een fout', String(dubbel));
    await ctx.close();
  }

  // ---- D: slepen raakt één wereld -----------------------------------------
  {
    const { ctx, page } = await studio();
    const voor = await page.evaluate(() => JSON.stringify(WORLDS.map(w => w.nodes)));
    const doos = await page.$eval('.tour-stop[data-lvl="1"]', el => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await page.mouse.move(doos.x, doos.y);
    await page.mouse.down();
    await page.mouse.move(doos.x + 30, doos.y - 40, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    const na = await page.evaluate(() => ({
      eerste: WORLDS[0].nodes[0],
      rest: JSON.stringify(WORLDS.slice(1).map(w => w.nodes)),
    }));
    const voorRest = JSON.parse(voor).slice(1);
    check(na.eerste.x !== 23.4 || na.eerste.y !== 79.3, 'D · slepen verzet de halte',
      JSON.stringify(na.eerste));
    check(na.rest === JSON.stringify(voorRest), 'D · en de andere werelden blijven staan', 'gewijzigd');
    // met de pijltjes fijn bijstellen, en Ctrl+Z neemt terug
    const x1 = await page.evaluate(() => WORLDS[0].nodes[0].x);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(120);
    const x2 = await page.evaluate(() => WORLDS[0].nodes[0].x);
    check(Math.abs(x2 - x1 - 0.2) < 0.001, 'D · de pijltjes verschuiven 0,2%', x1 + ' -> ' + x2);
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(120);
    const x3 = await page.evaluate(() => WORLDS[0].nodes[0].x);
    check(Math.abs(x3 - x1) < 0.001, 'D · en Ctrl+Z neemt dat terug', x2 + ' -> ' + x3);
    await ctx.close();
  }

  // ---- E: de standen zijn de echte standen --------------------------------
  {
    const { ctx, page } = await studio();
    const standen = await page.$$eval('#st-stand option', os => os.map(o => o.value));
    ['slot', 'vers', 'halverwege', 'uit', 'perfect'].forEach(v =>
      check(standen.includes(v), 'E · de stand "' + v + '" bestaat', standen.join(',')));
    // perfect = overal drie sterren in p.stars, precies wat het spel telt
    await page.selectOption('#st-stand', 'perfect');
    await page.waitForTimeout(350);
    const perfect = await page.evaluate(() => {
      const q = window.__db().profiles.p1;   // de studio draait op het demo-profiel
      const w = worldForIndex(0);
      return {
        sterren: Object.keys(q.stars).filter(l => +l >= w.first && +l < w.first + w.levels)
          .map(l => q.stars[l]),
        vol: worldProgress(q, w).vol,
        perfecteHaltes: document.querySelectorAll('.tour-stop.perfect').length,
      };
    });
    check(perfect.sterren.length === 8 && perfect.sterren.every(s => s === 3),
      'E · perfect zet er echt drie sterren op elke halte', JSON.stringify(perfect.sterren));
    check(perfect.vol === true, 'E · en het spel telt die wereld als vol', String(perfect.vol));
    check(perfect.perfecteHaltes === 8, 'E · de kaart tekent alle acht als perfect',
      String(perfect.perfecteHaltes));
    // op slot: geen enkele halte open, en de pop staat er niet
    await page.selectOption('#st-stand', 'slot');
    await page.waitForTimeout(350);
    const slot = await page.evaluate(() => ({
      open: document.querySelectorAll('.tour-stop:not(.locked)').length,
      sterren: Object.keys(window.__db().profiles.p1.stars).length,
    }));
    check(slot.sterren === 0, 'E · op slot is er in deze wereld niets gespeeld', String(slot.sterren));
    // en niets daarvan wordt bewaard: de studio schrijft geen speelvoortgang weg
    const bewaard = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('rekenPopsterren') || '{"profiles":{}}'));
    check(!bewaard.profiles || !bewaard.profiles.p1, 'E · en de standen worden nooit opgeslagen',
      JSON.stringify(Object.keys(bewaard.profiles || {})));
    await ctx.close();
  }

  // ---- F: de controle kijkt alles na --------------------------------------
  {
    const { ctx, page } = await studio();
    const schoon = await page.evaluate(() => wereldControle({}).filter(x => x.ernst === 'fout').length);
    check(schoon === 0, 'F · de werelden die er staan zijn allemaal in orde', String(schoon));
    const buiten = await page.evaluate(() => {
      const bewaar = JSON.stringify(WORLDS[3].nodes);
      WORLDS[3].nodes[2] = { x: 96, y: 50 };
      const uit = wereldControle({}).filter(x => /buiten de veilige zone/.test(x.t));
      WORLDS[3].nodes = JSON.parse(bewaar);
      return uit.map(x => ({ ernst: x.ernst, waar: x.waar, w: x.w }));
    });
    check(buiten.length === 1 && buiten[0].ernst === 'fout',
      'F · een halte buiten de zone in wereld 4 wordt gezien', JSON.stringify(buiten));
    check(buiten[0] && buiten[0].waar === 'haltes', 'F · en het punt zegt waar je het oplost',
      JSON.stringify(buiten));
    const volgorde = await page.evaluate(() => {
      const w = WORLDS.splice(2, 1)[0];
      WORLDS.splice(0, 0, w);
      const uit = wereldControle({}).filter(x => x.waar === 'lijst' && x.ernst === 'fout').length;
      WORLDS.splice(0, 1);
      WORLDS.splice(2, 0, w);
      return uit;
    });
    check(volgorde > 0, 'F · de volgorde omgooien is een fout, want sterren verhuizen mee',
      String(volgorde));
    // een ontbrekend bestand wordt alleen gemeld als er een bestandslijst is
    const zonderLijst = await page.evaluate(() =>
      wereldControle({}).filter(x => /bestand staat er niet/.test(x.t)).length);
    check(zonderLijst === 0, 'F · zonder bestandslijst wordt er niets over bestanden beweerd',
      String(zonderLijst));
    await ctx.close();
  }

  // ---- G: een concept is geen spel ----------------------------------------
  {
    const { ctx, page } = await studio();
    await page.evaluate(() => { WORLDS[0].name = 'Proefnaam'; saveWorldDraft(); });
    const concept = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('rekenPopsterren_wereldconcept'))[0].name);
    check(concept === 'Proefnaam', 'G · het concept staat apart in localStorage', concept);
    // zonder ?debug leest het spel dat concept niet -- dus een half afgemaakte
    // wereld kan nooit bij een kind terechtkomen
    const kaal = await ctx.newPage();
    await kaal.goto(APP_URL.replace('?debug', ''));
    await kaal.waitForTimeout(400);
    // WORLDS is niet van buitenaf leesbaar zonder ?debug; wat er op het scherm
    // staat wél -- en daar hoort een conceptnaam nooit in te staan
    const inSpel = await kaal.evaluate(() => document.body.innerHTML.indexOf('Proefnaam') >= 0);
    check(inSpel === false, 'G · en het gewone spel leest hem niet', String(inSpel));
    await ctx.close();
  }

  /* ---- H: een beeld telt mee als verandering ------------------------------
   * FASE 7A (PS-20). Een tekening gaat meteen naar schijf -- er is geen "nog niet
   * bewaard" voor een beeld, en dat is met opzet. Maar daardoor viel een beeld
   * buiten élke verandering die de studio meldde: "Wat verandert er" en het chipje
   * bovenin keken alleen naar het WORLDS-blok, en het pad in dat blok verandert
   * niet als je hetzelfde bestand vervángt. Wie de startschermachtergrond
   * verwisselde kreeg dus "gelijk aan het spel" te zien terwijl er een ander
   * bestand lag -- en dat gold net zo goed voor een wereldtekening op zijn eigen
   * pad. Precies het soort stilte waardoor je een bestand niet vastlegt.
   *
   * De lijst komt van de voorbeeldserver, die het aan git vraagt (gewijzigdeAssets
   * in test/preview.js). Hier wordt hij ingespoten zoals die server dat doet, zodat
   * deze controle geen server nodig heeft: wat getest wordt is de bedrading in de
   * studio, en dat is waar de bug zat.
   *
   * Vier standen, en de laatste is de reden dat de eerste erbij staat: niets
   * gewijzigd moet écht stil blijven, anders is het chipje waardeloos. */
  {
    const gevallen = [
      { naam: 'H · niets gewijzigd: stil', lijst: [], vuil: false, noem: [] },
      { naam: 'H · een beeld buiten de werelden telt mee', lijst: ['assets/bg/landing.webp'],
        vuil: true, noem: ['assets/bg/landing.webp'] },
      { naam: 'H · een wereldtekening telt net zo goed mee', lijst: ['assets/world/ijs-map.webp'],
        vuil: true, noem: ['assets/world/ijs-map.webp'] },
      { naam: 'H · twee beelden worden allebei genoemd',
        lijst: ['assets/bg/landing.webp', 'assets/world/ijs-map.webp'],
        vuil: true, noem: ['assets/bg/landing.webp', 'assets/world/ijs-map.webp'] },
    ];
    for (const g of gevallen) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await cacheFonts(ctx);
      const page = await ctx.newPage();
      page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
      await page.addInitScript(l => { window.__GEWIJZIGD = l; }, g.lijst);
      await page.goto(APP_URL + '&demo&star=p1&screen=map&mapedit');
      await page.waitForSelector('#studio');
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => {
        [...document.querySelectorAll('#studio .st-tabs button')]
          .filter(b => b.dataset.tab === 'spel')[0].click();
        return { chip: document.getElementById('st-status').textContent,
                 vuil: document.getElementById('st-status').className.indexOf('vuil') >= 0,
                 diff: document.getElementById('st-diff').textContent };
      });
      check(r.vuil === g.vuil, g.naam, JSON.stringify(r));
      check(g.noem.every(f => r.diff.indexOf(f) >= 0),
        g.naam + ' — en staat in "Wat verandert er"', r.diff.slice(0, 200));
      if (!g.vuil) {
        check(r.diff.indexOf('gewijzigd') < 0, g.naam + ' — geen valse melding', r.diff.slice(0, 200));
      } else {
        check(/\d+ niet doorgevoerd/.test(r.chip), g.naam + ' — het chipje telt ze', r.chip);
      }
      await ctx.close();
    }
  }
  /* En het bedrag klopt: een gewijzigde wereld plus een gewijzigd beeld is twee.
     Zonder dit zou "de beelden tellen mee" ook waar zijn als de werelden niet meer
     meetelden -- dat is één regel verschil in refreshStatus. De wereld wordt hier
     gewijzigd via het naamveld, dus langs dezelfde weg als met de hand. */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    await page.addInitScript(() => { window.__GEWIJZIGD = ['assets/bg/landing.webp']; });
    await page.goto(APP_URL + '&demo&star=p1&screen=map&mapedit');
    await page.waitForSelector('#studio');
    await page.waitForTimeout(400);
    await page.fill('#mf-name', 'Andere naam');
    await page.dispatchEvent('#mf-name', 'change');
    await page.waitForTimeout(300);
    const uit = await page.evaluate(() => {
      [...document.querySelectorAll('#studio .st-tabs button')]
        .filter(b => b.dataset.tab === 'spel')[0].click();
      return { chip: document.getElementById('st-status').textContent,
               diff: document.getElementById('st-diff').textContent };
    });
    check(/2 niet doorgevoerd/.test(uit.chip),
      'H · een wereld én een beeld tellen samen op', uit.chip);
    check(uit.diff.indexOf('Andere naam') >= 0 && uit.diff.indexOf('assets/bg/landing.webp') >= 0,
      'H · allebei staan ze in "Wat verandert er"', uit.diff.slice(0, 240));
    await ctx.close();
  }

  /* ---- I: elke knop van de Dev Studio komt ergens uit ---------------------
   * De studiopagina (test/hub.js) is een rij knoppen die niets anders doen dan
   * een URL openen. test/hub.test.js kijkt na of die URL's kloppen tegen wat
   * index.html leest, maar dat is papierwerk: het bewijst niet dat er ook echt
   * een scherm opengaat. Dat is wat hier gebeurt -- elke voorkeuze en elk
   * scherm één keer openen in een echte browser, en kijken of er een scherm
   * staat, of de console stil blijft, en of er niets is opgeslagen.
   *
   * Dat laatste is de belangrijkste: alles hier draait op ?debug&demo en dát
   * hoort de opslag te grendelen. Zou die grendel ooit wegvallen, dan zou een
   * middagje standen doorklikken de voortgang van een echt kind overschrijven.
   *
   * Over file://, want deze URL's hebben geen server nodig. */
  {
    const sc = require('./scenario.js');
    const basis = APP_URL.replace(/\?debug$/, '');
    const gevallen = [
      ...sc.VOORKEUZES.map(v => ({ naam: v.label, url: sc.url(sc.vul(v, 3), basis) })),
      ...sc.SCHERMEN.map(s => ({ naam: 'scherm ' + s.id,
        url: sc.url({ wereld: 3, stand: 'halverwege', screen: s.id }, basis) })),
    ];
    const ctx = await browser.newContext({ viewport: { width: 412, height: 920 } });
    await cacheFonts(ctx);
    for (const g of gevallen) {
      const page = await ctx.newPage();
      const fout = [];
      page.on('pageerror', e => fout.push(e.message));
      page.on('console', m => {
        if (m.type() === 'error' && !/404|ERR_FILE_NOT_FOUND|ERR_CONNECTION_RESET/.test(m.text())) {
          fout.push(m.text());
        }
      });
      await page.goto(g.url);
      await page.waitForTimeout(900);
      const st = await page.evaluate(() => ({
        scherm: (document.querySelector('.screen.active') || {}).id || null,
        bewaard: !!localStorage.getItem('rekenPopsterren'),
      }));
      check(!!st.scherm && !fout.length, 'I · "' + g.naam + '" opent een scherm',
        String(st.scherm) + ' ' + fout.slice(0, 2).join(' | '));
      check(st.bewaard === false, 'I · "' + g.naam + '" schrijft niets weg', String(st.bewaard));
      await page.close();
    }
    await ctx.close();
  }

  check(pageErrors.length === 0, 'geen fouten in de pagina', pageErrors.slice(0, 5).join(' | '));

  await browser.close();

  let pass = 0, fail = 0;
  Object.keys(counts).sort().forEach(k => {
    const c = counts[k];
    pass += c.pass; fail += c.fail;
    console.log(` ${c.fail ? 'FOUT ' : 'ok   '} ${k}  (${c.pass} ok${c.fail ? ', ' + c.fail + ' fout' : ''})`);
  });
  if (fails.length) { console.log('\n' + fails.join('\n')); }
  console.log(`\n${pass}/${pass + fail} controles geslaagd.`);
  process.exit(fail ? 1 : 0);
})();
