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
    /* Alleen vrije wereldschatten: geen prijs, en niet al van een andere wereld. Een
       winkelspulletje kiezen haalde het stil uit de winkel, en de keuring viel daar
       pas bij het vastleggen op om. */
    const opties = await page.$$eval('#mf-beloning option', os => os.map(o => o.value));
    const aanbod = await page.evaluate(ids => ids.filter(Boolean).map(id => {
      const it = item(id), van = beloningWereld(id);
      return { id, prijs: it ? it.price : 'weg', van: van ? van.id : null };
    }), opties);
    check(aanbod.length >= 1 && aanbod.every(o => o.prijs == null && (!o.van || o.van === 'muziek')),
      'C · alleen vrije wereldschatten, geen winkelspulletjes', JSON.stringify(aanbod));
    check(opties.indexOf('') === 0, 'C · en "nog geen" staat bovenaan', JSON.stringify(opties));
    // de tovenaarshoed die er al is, blijft de beloning van de Toverwereld
    const tover = await page.evaluate(() =>
      (WORLDS.filter(w => w.id === 'tover')[0] || {}).beloning);
    check(tover === 'acc_wereld_tover', 'C · de Toverwereld deelt de tovenaarshoed uit', String(tover));
    // wisselen doet het, en het komt in WORLDS terecht
    await page.selectOption('#mf-beloning', '');
    await page.waitForTimeout(150);
    const na = await page.evaluate(() => WORLDS[0].beloning);
    check(na === undefined, 'C · de beloning weghalen werkt', String(na));
    await page.selectOption('#mf-beloning', 'acc_wereld_muziek');
    await page.waitForTimeout(150);
    check(await page.evaluate(() => WORLDS[0].beloning) === 'acc_wereld_muziek',
      'C · en terugzetten ook', 'niet terug');
    /* Een kapotte verwijzing blokkeert altijd. Géén beloning blokkeert in een
       wereld die kinderen spelen, en is "nog te doen" in een wereld die nog dicht
       is -- dezelfde regel als zaak C en K van test/inhoud.test.js. */
    const punten = await page.evaluate(() => {
      WORLDS[0].beloning = 'bestaat_niet';
      const stuk = wereldControle({}).filter(x => /bestaat_niet/.test(x.t));
      delete WORLDS[0].beloning;
      const leeg = wereldControle({}).filter(x => x.waar === 'beloning');
      WORLDS.push({ id: 'proef', name: 'Proef', icon: '🧪', levels: 8, released: false });
      rebuildWorldStarts();
      const dicht = wereldControle({}).filter(x => x.waar === 'beloning' && /Proef/.test(x.w));
      WORLDS.pop(); rebuildWorldStarts();
      WORLDS[0].beloning = 'acc_wereld_muziek';
      const winkel = (() => { WORLDS[0].beloning = 'acc_kroon';
        const u = wereldControle({}).filter(x => /winkel/.test(x.t));
        WORLDS[0].beloning = 'acc_wereld_muziek'; return u; })();
      const kort = x => ({ ernst: x.ernst, blokkeert: x.blokkeert });
      return { stuk: stuk.map(kort), leeg: leeg.map(kort), dicht: dicht.map(kort), winkel: winkel.map(kort) };
    });
    check(punten.stuk[0] && punten.stuk[0].blokkeert, 'C · een beloning die niet bestaat blokkeert', JSON.stringify(punten.stuk));
    check(punten.leeg[0] && punten.leeg[0].blokkeert, 'C · géén beloning in een uitgebrachte wereld blokkeert', JSON.stringify(punten.leeg));
    check(punten.dicht[0] && punten.dicht[0].ernst === 'fout' && !punten.dicht[0].blokkeert,
      'C · in een wereld die nog dicht is: nog te doen', JSON.stringify(punten.dicht));
    check(punten.winkel[0] && punten.winkel[0].blokkeert, 'C · een winkelspulletje als schat blokkeert', JSON.stringify(punten.winkel));
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

  /* ---- J: een globaal beeld heeft geen wereld nodig -----------------------
   * De regressie waar deze ronde mee begon.
   *
   * Het startscherm, het spelogo en het app-icoon horen bij de héle app. Je kijkt
   * ze na op het landingsscherm -- en daar is met opzet niemand aan het spelen:
   * goProfiles() laat `cur` los. Het paneel bleef wél open, en commit() tekende
   * daarna altijd de kaart opnieuw. De kaart vraagt renderMapTitle(P()), P() is
   * dan undefined, en dus stond er onderin het paneel:
   *
   *     Cannot read properties of undefined (reading 'level')
   *       — vastzetten kan alleen via npm run preview
   *
   * Twee dingen fout in één regel. De uitzondering, en de uitleg: het bestand wás
   * weggeschreven, en de melding wees naar de enige stap die wél gelukt was.
   *
   * Wat hier dus vastligt:
   *   1  op het landingsscherm, zonder ster, valt er niets om
   *   2  een globaal beeld vervangen lukt daar gewoon
   *   3  en de melding zegt dat het gelukt is, niet dat het aan preview ligt
   *
   * Over http en niet file://, want vervangen gaat langs de server. Dit servertje
   * schrijft niets: het serveert de map en beantwoordt POST /asset alsof het gelukt
   * is. Een test hoort geen bestanden in de werkmap te vervangen. */
  {
    const http = require('http');
    const fs = require('fs');
    const path = require('path');
    const scene = require('./scene.js');
    const WORTEL = path.resolve(__dirname, '..');
    const geschreven = [];

    const server = http.createServer((req, res) => {
      const pad = decodeURIComponent(req.url.split('?')[0]);
      if (req.method === 'POST' && pad === '/asset') {
        const naar = new URLSearchParams(req.url.split('?')[1] || '').get('to');
        req.on('data', () => {});
        req.on('end', () => {
          geschreven.push(naar);                       // alleen onthouden, nooit schrijven
          res.writeHead(200, { 'content-type': 'text/plain' });
          res.end(naar + ' — 42 kB · sw testcache');
        });
        return;
      }
      if (pad === '/' || pad === '/index.html') {
        /* Dezelfde vier vensterwaarden die test/preview.js inspuit: zonder __SLOTS
           kent het paneel alleen de wereldtekening, en dan valt er niets globaals
           na te kijken. */
        const html = fs.readFileSync(path.join(WORTEL, 'index.html'), 'utf8');
        const data = '<script>window.__SLOTS=' + JSON.stringify(scene.SLOTS, (k, v) =>
            v instanceof RegExp ? undefined : v)
          + ';window.__SCHERMEN=' + JSON.stringify(scene.SCHERMEN)
          + ';window.__INCOMING=[];window.__ASSETS={"assets/bg/landing.webp":76};'
          + 'window.__MERK=[];window.__GEWIJZIGD=[];<\/script>';
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(html.replace('</head>', data + '</head>'));
      }
      const veilig = path.join(WORTEL, path.normalize(pad).replace(/^(\.\.[/\\])+/, ''));
      if (!veilig.startsWith(WORTEL) || !fs.existsSync(veilig) || fs.statSync(veilig).isDirectory()) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        return res.end('niet gevonden');
      }
      /* Het type wél goed zetten: een sw.js als application/octet-stream weigert
         de browser te registreren, en dat is een fout in dit servertje die je
         anders in het paneel gaat zoeken. */
      const ext = path.extname(veilig).toLowerCase();
      res.writeHead(200, { 'content-type':
        ext === '.js' ? 'text/javascript' : ext === '.json' ? 'application/json'
        : ext === '.woff2' ? 'font/woff2'
        : scene.isImage(veilig) ? scene.mimeFor(veilig) : 'application/octet-stream' });
      fs.createReadStream(veilig).pipe(res);
    });
    await new Promise(ok => server.listen(0, '127.0.0.1', ok));
    const basis = 'http://127.0.0.1:' + server.address().port;

    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    const fout = [];
    page.on('pageerror', e => fout.push('PAGEERROR ' + e.message));
    page.on('console', m => {
      if (m.type() === 'error' && !/404|ERR_FILE_NOT_FOUND|ERR_CONNECTION_RESET/.test(m.text())) {
        fout.push('CONSOLE ' + m.text());
      }
    });
    await page.goto(basis + '/?debug&demo&star=p1&screen=map&mapedit');
    await page.waitForSelector('#studio');
    await page.waitForTimeout(500);

    // het Beelden-tabblad, en dan naar de landing -- precies de weg die je loopt
    // als je de startschermtekening wilt bekijken
    await page.evaluate(() => {
      [...document.querySelectorAll('#studio .st-tabs button')]
        .filter(b => b.dataset.tab === 'beelden')[0].click();
    });
    const erIs = await page.$('.st-slot[data-slot="landing"]');
    check(!!erIs, 'J · het startscherm staat in Beelden', String(!!erIs));

    await page.evaluate(() => goProfiles());
    await page.waitForTimeout(250);
    const zonderSter = await page.evaluate(() => ({
      cur: cur, scherm: (document.querySelector('.screen.active') || {}).id || null,
    }));
    check(zonderSter.cur === null && zonderSter.scherm === 'screen-profile',
      'J · het landingsscherm laat de ster los', JSON.stringify(zonderSter));
    check(!fout.length, 'J · en dat valt op zichzelf niet om', fout.slice(0, 2).join(' | '));

    // nu vervangen, zonder wereld- en levelcontext
    page.on('filechooser', fc => fc.setFiles(path.join(WORTEL, 'assets', 'bg', 'landing.webp')));
    await page.evaluate(() => document.querySelector('.st-slot[data-slot="landing"]').click());
    await page.waitForTimeout(2500);
    const uit = await page.evaluate(() => document.getElementById('st-out').textContent);

    check(!/reading '.?level'?/.test(uit) && !/undefined/.test(uit),
      "J · geen .level-uitzondering bij een globaal beeld", uit);
    check(!/npm run preview/.test(uit),
      'J · en geen onterechte verwijzing naar npm run preview', uit);
    check(/Gewijzigd/.test(uit) && /landing\.webp/.test(uit),
      'J · de vervanging wordt als gelukt gemeld', uit);
    check(geschreven.indexOf('assets/bg/landing.webp') >= 0,
      'J · en de server kreeg het juiste pad', geschreven.join(', '));
    check(!fout.length, 'J · de console blijft stil', fout.slice(0, 3).join(' | '));

    /* En andersom: het paneel is niet stuk gegaan. Terug naar een wereld moet
       gewoon werken -- anders ruil je een uitzondering in voor een dood paneel. */
    const terug = await page.evaluate(() => {
      try {
        goMap();
        return { ok: true, titel: (document.getElementById('map-tournee-label') || {}).textContent || '',
                 naam: (document.getElementById('mf-name') || {}).value || '' };
      } catch (e) { return { ok: false, fout: String(e && e.message || e) }; }
    });
    await page.waitForTimeout(400);
    check(terug.ok && terug.naam.length > 0, 'J · en de wereldstudio werkt daarna gewoon door',
      JSON.stringify(terug));
    check(!fout.length, 'J · nog steeds geen fouten', fout.slice(0, 3).join(' | '));

    await ctx.close();
    await new Promise(ok => server.close(ok));
  }

  /* ---- N: een nieuwe wereld, van naam tot proberen --------------------------
   * De weg die de Dev Studio neemt: &nieuw=<naam> in de URL. Wat vastligt:
   *   1  de wereld komt er één keer, achteraan, en nog niet uitgebracht
   *   2  herladen maakt er geen tweede van (de URL verliest &nieuw, en de naam
   *      staat al in het concept)
   *   3  geen valse "het bestand staat er niet" bij een wereld zonder tekening
   *   4  proberen opent déze wereld, ook al is hij nog dicht
   *   5  zonder schat en geen vrije meer: het vak om er zelf een te tekenen staat open
   *   6  "✕ weg" haalt een nieuwe wereld weer uit het concept, in twee tikken */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    await page.goto(APP_URL + '&demo&star=p1&screen=map&mapedit&nieuw=Regenboogwereld');
    await page.waitForSelector('#studio');
    await page.waitForTimeout(500);
    const na = await page.evaluate(() => ({
      n: WORLDS.length, laatste: WORLDS[WORLDS.length - 1], kijk: viewWorldIdx,
      vink: document.getElementById('mf-released').checked,
      tekening: document.getElementById('st-art-let').textContent,
      aanzet: !document.getElementById('st-schat').hidden && document.getElementById('st-schat').open,
      zoek: location.search,
    }));
    check(na.laatste.name === 'Regenboogwereld' && na.laatste.id === 'regenboog' && na.kijk === na.n - 1,
      'N · de nieuwe wereld staat achteraan, en is gekozen', JSON.stringify(na));
    check(na.laatste.released === false && na.vink === false, 'N · en is nog niet uitgebracht', JSON.stringify(na.laatste));
    check(!/staat er niet/.test(na.tekening), 'N · geen valse melding over een ontbrekend bestand', na.tekening);
    check(na.aanzet, 'N · geen vrije schat: het tekenvak staat open', String(na.aanzet));
    check(na.zoek.indexOf('nieuw') < 0 && /wereld=7/.test(na.zoek), 'N · &nieuw is uit de URL, de wereld erin', na.zoek);
    await page.reload();
    await page.waitForSelector('#studio');
    await page.waitForTimeout(400);
    check(await page.evaluate(() => WORLDS.filter(w => w.name === 'Regenboogwereld').length) === 1,
      'N · herladen maakt er geen tweede van', 'dubbel');
    // proberen: de URL van het venster, zonder echt een venster te openen
    const url = await page.evaluate(() => {
      let u = null;
      window.open = x => { u = x; return {}; };
      document.getElementById('st-vscherm').value = 'game:bijna';
      document.getElementById('st-venster').click();
      return u;
    });
    check(/wereld=7/.test(url) && /onuitgebracht/.test(url) && /stand=bijna/.test(url) && /screen=game/.test(url),
      'N · proberen opent déze wereld, ook nog dicht', String(url));
    // de wereld ook echt spelen, in het echte spel
    const spel = await ctx.newPage();
    await spel.goto(APP_URL + '&demo&star=p1&wereld=7&stand=vers&screen=game&onuitgebracht');
    await spel.waitForTimeout(700);
    const inSpel = await spel.evaluate(() => ({ w: worldFor(P().level).world.name,
      scherm: (document.querySelector('.screen.active') || {}).id }));
    check(inSpel.w === 'Regenboogwereld' && inSpel.scherm === 'screen-game',
      'N · en in het spel speel je hem, met het concept erin', JSON.stringify(inSpel));
    const kaal = await ctx.newPage();
    await kaal.goto(APP_URL + '&demo&star=p1&wereld=7&stand=vers&screen=game');
    await kaal.waitForTimeout(700);
    check(await kaal.evaluate(() => worldFor(P().level).world.name) !== 'Regenboogwereld',
      'N · zonder &onuitgebracht blijft hij dicht, zoals voor een kind', 'toch open');
    // weg, in twee tikken
    await page.click('#st-weg');
    const tussen = await page.evaluate(() => WORLDS.length);
    await page.click('#st-weg');
    await page.waitForTimeout(200);
    const eind = await page.evaluate(() => ({ n: WORLDS.length,
      concept: localStorage.getItem('rekenPopsterren_wereldconcept') }));
    check(tussen === 7 && eind.n === 6, 'N · ✕ weg vraagt eerst, en haalt hem dan weg', tussen + ' -> ' + eind.n);
    check(eind.concept === null, 'N · en dan is er geen concept meer', String(eind.concept).slice(0, 60));
    await ctx.close();
  }

  /* ---- P: een wereldschat zonder code ---------------------------------------
   * De weg van een AI naar een schat: plakken, schoonmaken, op het hoofd zetten,
   * keuren, en dan is het een gewoon spulletje. Wat vastligt:
   *   1  alles wat niet mag gaat eruit, en dat wordt gezegd -- een script, een
   *      onload, een stijlblok, een klasse; een verloop wordt zijn eerste kleur
   *   2  het resultaat staat op het hoofd en in de maatfamilie van de andere zes:
   *      boven de nek, hoogte binnen een factor 2, breedte binnen een factor 3 --
   *      de regels van zaak I in test/beloning.test.js
   *   3  "Maak dit de schat" zet hem bij de wereld (w.schat + beloning), en dan is
   *      hij een spulletje dat niet in de winkel staat, met een miniatuur
   *   4  de keuring en het blok voor het project zijn het ermee eens
   *   5  wie de tekening om de studio heen met iets gevaarlijks vult, wordt
   *      tegengehouden: het blokkeert, en het komt niet in ITEMS */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    const dialogen = [];
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    page.on('dialog', d => { dialogen.push(d.message()); d.dismiss(); });
    await page.goto(APP_URL + '&demo&star=p1&screen=map&mapedit&nieuw=Regenboogwereld');
    await page.waitForSelector('#studio');
    await page.waitForTimeout(500);
    const vies = 'Hier is je schat!\n```svg\n'
      + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" onload="alert(1)">'
      + '<defs><linearGradient id="v"><stop offset="0" stop-color="#ff5c8a"/></linearGradient></defs>'
      + '<script>alert(2)</script><style>.a{fill:red}</style>'
      + '<g stroke="#7b1fa2" stroke-width="10" stroke-linejoin="round">'
      + '<path class="a" d="M60 380 L120 140 L200 300 L256 90 L312 300 L392 140 L452 380 Z" style="fill:#ffd54f"/>'
      + '<path d="M60 380 Q256 330 452 380" fill="url(#v)"/>'
      + '<circle cx="256" cy="90" r="28" fill="#e91e63"/></g></svg>\n```';
    await page.fill('#sc-svg', vies);
    await page.waitForTimeout(500);
    await page.fill('#sc-naam', 'Regenboogkroon');
    await page.waitForTimeout(150);
    const proef = await page.evaluate(() => ({
      let: document.getElementById('sc-let').innerText,
      knop: document.getElementById('sc-gebruik').disabled,
      poppen: document.querySelectorAll('#sc-vb svg').length,
    }));
    check(/script/.test(proef.let) && /onload/.test(proef.let) && /style/.test(proef.let) && /class/.test(proef.let),
      'P · wat niet mag gaat eruit, en dat wordt gezegd', proef.let);
    check(proef.poppen >= 3 && proef.knop === false, 'P · hij staat op beide poppen en in het miniatuur, en mag erin',
      JSON.stringify(proef));
    await page.click('#sc-gebruik');
    await page.waitForTimeout(300);
    const na = await page.evaluate(() => {
      const w = WORLDS[WORLDS.length - 1], it = item(w.beloning);
      const meet = svg => {
        const d = document.createElement('div');
        d.innerHTML = '<svg viewBox="0 0 200 250" width="400">' + svg + '</svg>';
        document.body.appendChild(d);
        const b = d.querySelector('svg').getBBox(); d.remove();
        return { y: b.y, h: b.height, w: b.width };
      };
      const alle = WORLDS.filter(x => x.beloning && item(x.beloning)).map(x => meet(item(x.beloning).draw('meisje', 1)));
      const hs = alle.map(m => m.h), bs = alle.map(m => m.w);
      return {
        beloning: w.beloning, naam: w.schat && w.schat.naam, svg: w.schat && w.schat.svg,
        uitWereld: it && it.uitWereld, prijs: it && it.price, schat: isBeloning(w.beloning),
        miniatuur: it ? it.thumb('meisje').indexOf('<svg viewBox="' + w.schat.view + '"') === 0 : false,
        onder: meet(it.draw('meisje', 1)), familie: [Math.max(...hs) / Math.min(...hs), Math.max(...bs) / Math.min(...bs)],
        fouten: schatFouten(w.schat), blok: wereldControle({}).filter(p => p.blokkeert).map(p => p.t),
        bron: /schat: \{/.test(worldsSource()),
      };
    });
    check(na.beloning === 'acc_wereld_regenboog' && na.naam === 'Regenboogkroon' && na.uitWereld === 'regenboog',
      'P · de schat staat bij de wereld, en is een spulletje van die wereld', JSON.stringify(na).slice(0, 200));
    check(!/script|onload|class=|style=|url\(/i.test(na.svg) && /fill="#ff5c8a"/.test(na.svg),
      'P · schoon opgeslagen, en het verloop is zijn eerste kleur', String(na.svg).slice(0, 200));
    check(na.schat && na.prijs === undefined && na.miniatuur, 'P · niet te koop, met een miniatuur', JSON.stringify(na));
    check(na.onder.y >= -2 && na.onder.y + na.onder.h <= 94, 'P · boven de nek, op de pop', JSON.stringify(na.onder));
    check(na.familie[0] < 2 && na.familie[1] < 3, 'P · en in de maatfamilie van de andere schatten', JSON.stringify(na.familie));
    check(!na.fouten.length && !na.blok.length && na.bron, 'P · de keuring en het blok zijn het ermee eens',
      JSON.stringify([na.fouten, na.blok, na.bron]));
    check(!dialogen.length, 'P · en er heeft niets uit de SVG gedraaid', dialogen.join(' | '));
    const gevaar = await page.evaluate(() => {
      const w = WORLDS[WORLDS.length - 1];
      w.schat = Object.assign({}, w.schat, { svg: '<g><path d="M0 0"/></g><script>alert(3)</script>' });
      rebuildWereldschatten();
      const r = { blok: wereldControle({}).filter(p => p.blokkeert && /script|niet mag/.test(p.t)).length,
                  inItems: !!item(w.beloning) };
      return r;
    });
    check(gevaar.blok > 0 && !gevaar.inItems, 'P · een script om de studio heen: het blokkeert en komt niet in het spel',
      JSON.stringify(gevaar));
    await ctx.close();
  }

  /* ---- O: een oud concept draait niets terug --------------------------------
   * Een concept overleeft een git pull. Het werd blind over WORLDS gelegd, en dan
   * zag je -- en schreef "Opslaan" -- de wereld van vorige week. Nu staat de basis
   * erbij, en gaat alleen wat jíj veranderde over het spel heen. */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    page.on('pageerror', e => pageErrors.push('PAGEERROR ' + e.message));
    await page.goto(APP_URL + '&demo&star=p1&screen=map');
    await page.evaluate(() => {
      const basis = JSON.parse(JSON.stringify(WORLDS_SHIPPED));
      basis[0].theme.road = '#000000';                 // zo stond het "vorige week"
      const concept = JSON.parse(JSON.stringify(basis));
      concept[1].name = 'Mijn Snoep';                  // jouw wijziging
      localStorage.setItem('rekenPopsterren_wereldconcept', JSON.stringify(concept));
      localStorage.setItem('rekenPopsterren_wereldconcept_basis', JSON.stringify(basis));
    });
    await page.goto(APP_URL + '&demo&star=p1&screen=map&mapedit');
    await page.waitForSelector('#studio');
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({
      road: WORLDS[0].theme.road, echt: WORLDS_SHIPPED[0].theme.road, snoep: WORLDS[1].name,
      melding: document.getElementById('st-concept').hidden ? '' : document.getElementById('st-concept').textContent,
    }));
    check(r.road === r.echt, 'O · wat je niet aanraakte is zoals het nu in het spel staat', JSON.stringify(r));
    check(r.snoep === 'Mijn Snoep', 'O · wat je wél veranderde blijft staan', r.snoep);
    check(/oudere versie/.test(r.melding), 'O · en het paneel zegt dat het concept is bijgewerkt', r.melding);
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
