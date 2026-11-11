/*
 * Robuust: wat een kind van zes met de app doet, en waar die niet van mag omvallen.
 *
 * Kinderen tikken snel, dubbel, en midden in een overgang. De andere suites
 * spelen netjes: één tik, wachten, nakijken. Deze niet. De zaken:
 *
 *   A  de tik komt eerst. Een knop die van scherm wisselt, wisselt een beeldje
 *      ná de tik (naTik), nooit binnen de tik zelf. Anders staat een trage
 *      tablet een paar honderd ms stil voordat de tik getekend wordt -- bij echte
 *      spelers (Cloudflare) waren dat de traagste tikken van de app. Gemeten
 *      zonder klok: show() noteert of hij loopt terwijl er een tik wordt
 *      afgehandeld (window.event). Elke zichtbare knop op elk scherm, plus het
 *      Stoppen?-venster.
 *      En in diezelfde tik: niet meten wat je net veranderd hebt. Een maat
 *      lezen (getBoundingClientRect, offsetHeight ...) nadat de tik al iets in
 *      de pagina schreef, dwingt de browser het hele scherm midden in de tik op
 *      te maken; daarna doet hij het bij het tekenen nog eens. In de kast kostte
 *      dat een tik 120 ms op een trage tablet. Meet vóór je schrijft, of na de
 *      verf (naOpbouw), of laat een ResizeObserver het zeggen. Gemeten met een
 *      MutationObserver: staat er iets in zijn wachtrij op het moment van meten,
 *      dan is er sinds het begin van de tik geschreven. offsetWidth telt niet:
 *      dat is het gewone "void el.offsetWidth" om een animatie opnieuw te
 *      starten, en dat raakt alleen de stijl van dat ene element.
 *   B  wie vertrekt, neemt geen tikken meer aan. Een scherm dat wegvalt is
 *      inert (schermInert). Concreet: haar portret op de kaart en meteen een
 *      halte -- dat startte een show zonder ster en gaf een fout.
 *   C  tikstormen: een paar rondes van willekeurige tikken met af en toe
 *      "terug", met een vast zaadje zodat een fout terug te spelen is. Geen
 *      enkele fout, en na afloop staat er precies één scherm, geen sluier
 *      zonder melding, geen overgang die blijft hangen.
 *   D  offline na het allereerste bezoek: de tekeningen die het spel bij dat
 *      bezoek al ophaalde (vóór de service worker meekeek) staan in de voorraad,
 *      dus zonder net staat haar kaart er met tekening. Over een echte lokale
 *      server, want vanaf file:// draait geen service worker.
 *   E  geen zware waas onder wat beweegt. Een CSS-filter met blur op een laag zo
 *      groot als het venster rekent de browser bij élk beeldje opnieuw uit zodra
 *      er iets overheen beweegt -- en de pop wiegt altijd. De kleedkamer haalde
 *      met blur(8px) over de hele kamer 25 beeldjes per seconde (CPU zes keer
 *      vertraagd), zonder 60; de kleine waas van de zaal en van de kaart naast
 *      een liggend scherm (2,5 tot 5px) kostte gemeten niets. Dus: geen blur van
 *      WAAS_MAX px of meer op iets dat meer dan een derde van het venster beslaat.
 *      Wil je zo'n waas, teken hem dan in de tekening zelf (zie --kleed-tekening).
 *   F  snel tikken telt. Een antwoord hoort zijn tik via knopTik (= Antwoordtik),
 *      en dat tikken we na met echte aanrakingen op het cijferblok en de
 *      antwoordknoppen: een vinger die bij het loslaten 20 px rolt, twee vingers
 *      die elkaar overlappen (allebei tellen, in de volgorde van neerkomen), een
 *      tik in de kier, lang vasthouden -- en wie ver wegschuift, breekt af. Met
 *      click ging de rol en de overlap verloren (de overlap zelfs voor allebei).
 *   H  een scherm in rust doet niets. Wie op een scherm blijft staan zonder te
 *      tikken, hoort de processor niet bezig te houden: geen scherm dat elk
 *      beeldje opnieuw getekend wordt, geen animatie op iets dat je niet ziet,
 *      geen setInterval dat doortikt. Dat was in zes snelheidsrondes steeds
 *      dezelfde oorzaak van een trage oude tablet en een warme batterij: een waas
 *      die elk beeldje opnieuw rekende, een vaste achtergrond die bij elke scroll
 *      hertekende, kastanimaties buiten beeld, een knippertimer op elk scherm, een
 *      spotlight-interval. Geteld en niet getimed (hoeveel keer er getekend wordt
 *      in RUST_DUUR), dus het hangt niet af van hoe snel de machine is.
 *      Wegen van een wiegende pop of stof kost niets: dat zijn eigen lagen die
 *      alleen verschuiven. Wat wél telt is een stuk dat ín een tekening beweegt
 *      (haar knikkende hoofd in de SVG): dan wordt de hele pop elk beeldje
 *      opnieuw getekend. Een scherm waar dat met reden mag, staat in RUST_MAG.
 *
 * Draaien:
 *   npm run test:robuust      (of: npm test voor alle suites)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { launch, cacheFonts, APP_URL } = require('./browser');
const { check, klaar } = require('./meld')('robuust');

const TELEFOON = { width: 390, height: 844 };
const TABLET = { width: 800, height: 1280 };
const KNOPPEN = 'button, [onclick], .tour-stop, .item-card, .trophy-card, .ster-tegel';
// Wat iets wist, deelt, de pagina verlaat of een bestand opent, tikken we niet aan.
/* Wie met reden meet na een wijziging. somVult en vakNaar: de som valt dicht --
   het getal vliegt van de knop naar het vakje, en waar het vakje uitkomt weet je
   pas als het getal erin staat (meten, schrijven, meten). */
const MEET_MAG = /^(somVult|vakNaar)$/;
const WAAS_MAX = 6;   // px blur; zie zaak E
/* Zaak H: hoe vaak een scherm in rust mag tekenen, per seconde. Een
   compositoranimatie (wiegen, stof) tekent niet; een scherm dat stilstaat tekent
   een paar keer bij toeval. Wat elk beeldje tekent, zit rond de 60. */
const RUST_TEKEN_MAX = 10;
const RUST_DUUR = 2000;
/* Schermen waar het mag, met de reden. Haar hoofd knikt en haar staart zwaait
   ín de SVG (knik, slinger in 30-onderdelen.css), en een SVG kan geen eigen
   lagen hebben: de hele pop wordt dan elk beeldje getekend. Hier staat ze
   centraal, dus dat is de prijs. Komt er een scherm bij, dan is dat een
   keuze, geen vergissing. */
const RUST_MAG = {
  game: 'de pop knikt tijdens de show (knik + slinger tekenen de hele SVG)',
  end: 'de pop knikt op het eindscherm',
  dress: 'de pop knikt in de spiegel van de kleedkamer',
};
const NIET = /set-reset|set-delete|delete|wis|import|export|backup|deel|kopieer|installeer|oz-|set-over|set-mail|over-hint|naarOver|app-knop|alsapp|speel-als|set-beginscherm/i;

(async () => {
  const browser = await launch();
  const fouten = [];
  async function nieuw(maat, opties) {
    const ctx = await browser.newContext(Object.assign({ viewport: maat || TELEFOON, hasTouch: true, isMobile: true }, opties || {}));
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    page.on('pageerror', e => fouten.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET|ERR_INTERNET_DISCONNECTED/.test(m.text())) fouten.push('CONSOLE ' + m.text()); });
    return { ctx, page };
  }
  async function tik(page, h) {
    const b = h && await h.boundingBox();
    if (!b) return false;
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    return true;
  }

  /* ---- A · de tik komt eerst ---- */
  {
    const { ctx, page } = await nieuw(TABLET);
    const STANDEN = [
      ['profile', ''], ['map', '&screen=map'], ['reis', '&screen=reis'], ['game', '&screen=game'],
      ['stoppen?', '&screen=game', () => { G.idx = 1; askQuit(); }],
      ['end', '&screen=end'], ['dress', '&screen=dress'], ['tro', '&screen=tro'],
      ['ouder', '&screen=ouder'], ['ouders', '&screen=ouders'],
    ];
    for (const [naam, scherm, klaarzetten] of STANDEN) {
      const url = APP_URL + '&demo' + (scherm ? '&star=p1' + scherm : '');
      const zet = async () => {
        await page.goto(url);
        await page.waitForTimeout(900);
        if (klaarzetten) { await page.evaluate(klaarzetten); await page.waitForTimeout(400); }
        await page.evaluate(() => {
          window.__inTik = []; window.__meet = [];
          const TIK = /^(click|pointerdown|pointerup|touchstart|touchend|mousedown|mouseup|keydown)$/;
          const mo = new MutationObserver(() => {});
          mo.observe(document, { subtree: true, attributes: true, childList: true, characterData: true });
          for (const t of ['click', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'keydown'])
            addEventListener(t, () => mo.takeRecords(), true);
          const meld = maat => {
            const e = window.event;
            if (!e || !TIK.test(e.type) || !mo.takeRecords().length) return;
            const wie = (new Error().stack || '').split('\n').slice(3, 6).map(r => (r.match(/at (?:\w+\.)?([\w$]+) /) || [])[1]).filter(Boolean);
            window.__meet.push({ maat, wie });
          };
          if (!window.__meetAan) {
            window.__meetAan = true;
            for (const m of ['getBoundingClientRect', 'getClientRects']) {
              const o = Element.prototype[m];
              Element.prototype[m] = function () { meld(m); return o.apply(this, arguments); };
            }
            for (const [proto, namen] of [[HTMLElement.prototype, ['offsetHeight', 'offsetTop', 'offsetLeft']],
              [Element.prototype, ['clientWidth', 'clientHeight', 'scrollHeight', 'scrollWidth']]]) {
              for (const n of namen) {
                const d = Object.getOwnPropertyDescriptor(proto, n);
                Object.defineProperty(proto, n, Object.assign({}, d, { get() { meld(n); return d.get.call(this); } }));
              }
            }
          }
          const echt = window.show;
          window.show = function (id) {
            const e = window.event;
            if (e && /^(click|pointerdown|pointerup|touchstart|touchend|mousedown|mouseup|keydown)$/.test(e.type)) window.__inTik.push(id);
            return echt.apply(this, arguments);
          };
        });
        return page.evaluate(([sel, niet]) => {
          const re = new RegExp(niet, 'i');
          let i = 0;
          return [...document.querySelectorAll(sel)].filter(b => {
            const r = b.getBoundingClientRect();
            if (r.width < 4 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
            if (b.closest('a[href]')) return false;
            if (re.test((b.id || '') + ' ' + (b.className || '') + ' ' + (b.getAttribute('onclick') || ''))) return false;
            const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return e && (e === b || b.contains(e));
          }).map(b => { b.dataset.robuust = ++i; return (b.id || String(b.className).split(' ')[0] || b.tagName) + ' "' + (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 18) + '"'; });
        }, [KNOPPEN, NIET.source]);
      };
      let knoppen = await zet();
      const totaal = knoppen.length;
      check(totaal > 0, 'A · er staan knoppen om te tikken op ' + naam, 'geen gevonden');
      let vers = true;
      for (let i = 1; i <= totaal; i++) {
        if (!vers) { await zet(); vers = true; }
        const voor = await page.evaluate(() => (document.querySelector('.screen.active') || {}).id + '|' + document.querySelectorAll('.modal-bg.open, .rp-overlay').length);
        if (!await tik(page, await page.$(`[data-robuust="${i}"]`))) continue;
        await page.waitForTimeout(120);
        const r = await page.evaluate(() => ({ inTik: window.__inTik.slice(), meet: window.__meet.slice(),
          na: (document.querySelector('.screen.active') || {}).id + '|' + document.querySelectorAll('.modal-bg.open, .rp-overlay').length }));
        check(!r.inTik.length, 'A · geen schermwissel binnen de tik zelf (naTik)', `${naam}: ${knoppen[i - 1]} -> ${r.inTik.join(',')}`);
        const meet = r.meet.filter(m => !m.wie.some(w => MEET_MAG.test(w)));
        check(!meet.length, 'A · in de tik niet meten wat de tik net veranderde', `${naam}: ${knoppen[i - 1]} -> ${meet.map(m => m.maat + ' in ' + m.wie.join(' < ')).join(' | ')}`);
        if (r.na !== voor) vers = false;
        await page.evaluate(() => { window.__inTik.length = 0; window.__meet.length = 0; });
      }
    }
    await ctx.close();
  }

  /* ---- B · wie vertrekt, neemt geen tikken meer aan ---- */
  {
    const { ctx, page } = await nieuw();
    for (const wacht of [0, 60, 150]) {
      await page.goto(APP_URL + '&demo&star=p1');
      await page.waitForTimeout(900);
      const voor = fouten.length;
      const halte = await page.evaluate(() => { const s = document.querySelector('.tour-stop.done'); const r = s.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      await tik(page, await page.$('#map-portrait'));
      await page.waitForTimeout(wacht);
      const r0 = await page.evaluate(({ x, y }) => {
        const kaart = document.getElementById('screen-map');
        return { weg: kaart.classList.contains('wegvallend'), inert: kaart.inert, raak: !!(document.elementFromPoint(x, y) || { closest() {} }).closest('.tour-stop') };
      }, halte);
      await page.touchscreen.tap(halte.x, halte.y);
      await page.waitForTimeout(900);
      const r = await page.evaluate(() => ({ scherm: document.querySelector('.screen.active').id, inert: document.getElementById('screen-map').inert }));
      if (r0.weg) check(r0.inert && !r0.raak, 'B · een wegvallende kaart is inert: de haltes nemen geen tik meer aan', `${wacht} ms: ${JSON.stringify(r0)}`);
      check(fouten.length === voor, 'B · portret en meteen een halte: geen fout', `${wacht} ms: ${fouten.slice(voor).join(' | ')}`);
      check(r.scherm === 'screen-profile', 'B · en je staat gewoon op de sterrenkeuze', `${wacht} ms: ${JSON.stringify(r)}`);
      check(r.inert === false, 'B · na de overgang is de kaart weer gewoon tikbaar', `${wacht} ms: ${JSON.stringify(r)}`);
    }
    await ctx.close();
  }

  /* ---- C · tikstormen ---- */
  {
    const { ctx, page } = await nieuw();
    let zaad = 7;
    const rnd = () => { zaad = (zaad * 16807) % 2147483647; return zaad / 2147483647; };
    for (let ronde = 0; ronde < 6; ronde++) {
      await page.goto(APP_URL + '&demo&star=' + (ronde % 2 ? 'p2' : 'p1'));
      await page.waitForTimeout(900);
      const voor = fouten.length, spoor = [];
      for (let i = 0; i < 50; i++) {
        const doelen = await page.evaluate(([sel, niet]) => {
          const re = new RegExp(niet, 'i');
          return [...document.querySelectorAll(sel + ', .choice-btn, #tap-veil')].filter(b => {
            const r = b.getBoundingClientRect();
            if (r.width < 4 || r.bottom < 0 || r.top > innerHeight) return false;
            if (b.closest('a[href]') || re.test((b.id || '') + ' ' + (b.className || '') + ' ' + (b.getAttribute('onclick') || '') + ' ' + (b.textContent || ''))) return false;
            const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return e && (e === b || b.contains(e));
          }).map(b => { const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, b.id || String(b.className).split(' ')[0]]; });
        }, [KNOPPEN, NIET.source]);
        if (doelen.length) {
          const [x, y, naam] = doelen[Math.floor(rnd() * doelen.length)];
          spoor.push(naam);
          await page.touchscreen.tap(x, y);
        }
        await page.waitForTimeout(Math.floor(rnd() * 220));
        if (rnd() < 0.05) { spoor.push('terug'); await page.evaluate(() => history.back()); }
      }
      await page.waitForTimeout(3500);
      const s = await page.evaluate(() => {
        const veil = document.getElementById('tap-veil'), toast = document.getElementById('toast');
        return {
          schermen: [...document.querySelectorAll('.screen.active')].map(x => x.id),
          sluier: veil.style.display === 'block' && toast.style.display === 'none',
          blijft: [overgangBezig, !!vluchtOp, !!wereldReisOp].some(Boolean),
          wegvallend: document.querySelectorAll('.screen.wegvallend').length,
          inert: [...document.querySelectorAll('.screen.active')].some(x => x.inert),
        };
      });
      const waar = `ronde ${ronde}, laatste tikken: ${spoor.slice(-8).join(' > ')}`;
      check(fouten.length === voor, 'C · een tikstorm geeft geen enkele fout', `${waar}: ${fouten.slice(voor).join(' | ')}`);
      check(s.schermen.length === 1 && !s.inert, 'C · na een storm staat er precies één scherm, en dat neemt tikken aan', `${waar}: ${JSON.stringify(s)}`);
      check(!s.sluier && !s.blijft && !s.wegvallend, 'C · geen sluier zonder melding en geen overgang die blijft hangen', `${waar}: ${JSON.stringify(s)}`);
    }
    await ctx.close();
  }

  /* ---- D · offline na het allereerste bezoek ---- */
  {
    const wortel = path.resolve(__dirname, '..');
    const SOORT = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp',
      '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
    const server = http.createServer((req, res) => {
      const pad = path.join(wortel, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
      if (!pad.startsWith(wortel)) { res.writeHead(403); return res.end(); }
      fs.readFile(pad, (e, data) => {
        if (e) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'content-type': SOORT[path.extname(pad)] || 'application/octet-stream', 'cache-control': 'no-cache' });
        res.end(data);
      });
    });
    await new Promise(ok => server.listen(0, '127.0.0.1', ok));
    const URL0 = `http://127.0.0.1:${server.address().port}/index.html?debug&demo&star=p1`;
    const { ctx, page } = await nieuw(TELEFOON, { serviceWorkers: 'allow' });
    const mis = [];
    page.on('requestfailed', r => { if (/\/assets\//.test(r.url())) mis.push(r.url().split('/assets/')[1]); });
    await page.goto(URL0);
    // wachten tot de worker er is en het bericht met de getoonde tekeningen verwerkt heeft
    const kaartArt = await page.evaluate(() => worldFor(P().level).world.art);
    /* Een lus in de pagina en geen waitForFunction: die neemt de belofte van een
       async functie al voor "ja". Ruim, want op een drukke machine komt het bericht
       pas na naDeRust aan. */
    const binnen = await page.evaluate(async art => {
      const sleutel = new URL(art, location.href).href;
      for (let i = 0; i < 100; i++) {
        const c = await caches.open('rekenpop-art-2').catch(() => null);
        if (c && await c.match(sleutel)) return true;
        await new Promise(r => setTimeout(r, 200));
      }
      return false;
    }, kaartArt);
    check(binnen, 'D · de kaart van haar wereld komt na het eerste bezoek in de voorraad', kaartArt);
    await ctx.setOffline(true);
    await page.reload();
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => ({
      scherm: (document.querySelector('.screen.active') || {}).id,
      kapot: [...document.images].filter(i => i.complete && i.src && i.naturalWidth === 0).map(i => i.src.split('/').pop()),
    }));
    check(r.scherm === 'screen-map', 'D · offline na het eerste bezoek start het spel op haar kaart', JSON.stringify(r));
    check(!mis.length && !r.kapot.length, 'D · en elke tekening die het eerste bezoek al toonde staat er (uit de voorraad)',
      JSON.stringify({ mis, kapot: r.kapot }));
    await ctx.close();
    server.close();
  }

  /* ---- E · geen zware waas onder wat beweegt ---- */
  for (const maat of [TELEFOON, { width: 1280, height: 800 }]) {
    const { ctx, page } = await nieuw(maat);
    for (const scherm of ['map', 'reis', 'game', 'end', 'dress', 'tro', 'ouders']) {
      await page.goto(APP_URL + '&demo&star=p1&wereld=5&stand=halverwege&screen=' + scherm);
      await page.waitForTimeout(900);
      const zwaar = await page.evaluate(max => {
        const uit = [], venster = innerWidth * innerHeight;
        for (const el of document.querySelectorAll('body *')) {
          const scherm = el.closest('.screen');
          if (scherm && !scherm.classList.contains('active')) continue;   // de andere schermen staan er wel, maar niet in beeld
          for (const ps of [null, '::before', '::after']) {
            const cs = getComputedStyle(el, ps);
            if ((ps && cs.content === 'none') || cs.display === 'none' || cs.visibility === 'hidden') continue;
            const px = Math.max(0, ...[...cs.filter.matchAll(/blur\(([\d.]+)px\)/g)].map(m => +m[1]));
            if (px < max) continue;
            // een pseudo-element meten kan niet: een vaste neemt het venster, een andere zijn ouder
            const vast = cs.position === 'fixed', r = el.getBoundingClientRect();
            const w = vast ? innerWidth : Math.min(r.width, innerWidth), h = vast ? innerHeight : Math.min(r.height, innerHeight);
            const zichtbaar = vast || el.getClientRects().length > 0;
            if (zichtbaar && w * h > venster / 3) uit.push(`${el.id || String(el.className).split(' ')[0] || el.tagName}${ps || ''} blur(${px}px)`);
          }
        }
        return uit;
      }, WAAS_MAX);
      check(!zwaar.length, `E · geen blur van ${WAAS_MAX}px of meer over een groot deel van het scherm`, `${scherm} ${maat.width}x${maat.height}: ${zwaar.join(', ')}`);
    }
    await ctx.close();
  }

  /* ---- F · snel tikken telt ---- */
  {
    const { ctx, page } = await nieuw();
    const cdp = await ctx.newCDPSession(page);
    const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id })) });
    const W = ms => page.waitForTimeout(ms);
    for (const mode of ['typ', 'kies']) {
      await page.goto(APP_URL + '&demo&star=p1');
      await page.waitForTimeout(900);
      await page.evaluate(m => {
        const s = P().settings; s.track = 'math'; s.ops = ['+']; s.themas = []; s.modus = 'vrij'; s.mode = m; s.perLevel = 50;
        startLevel(P().level);
      }, mode);
      await page.waitForTimeout(1500);
      const sel = mode === 'typ' ? '.num-btn' : '.choice-btn';
      // wat er telt, zonder dat de show verder gaat
      const knop = await page.evaluate(sel => {
        window.__tel = [];
        window.numpadPress = n => __tel.push(n);
        window.submitAnswer = (v, b) => __tel.push(b ? b.textContent.trim() : String(v));
        return [...document.querySelectorAll(sel)].slice(0, 2).map(b => {
          const r = b.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, rechts: r.right, w: r.width, t: b.textContent.trim() };
        });
      }, sel);
      const [a, b] = knop;
      const kier = (a.rechts + (b.x - b.w / 2)) / 2;
      const zaken = [
        ['een gewone tik', [a.t], async () => { await T('touchStart', [[a.x, a.y, 1]]); await W(40); await T('touchEnd', []); }],
        ['de vinger rolt 20 px bij het loslaten', [a.t], async () => {
          await T('touchStart', [[a.x, a.y, 1]]);
          for (let i = 1; i <= 4; i++) await T('touchMove', [[a.x + 5 * i, a.y, 1]]);
          await T('touchEnd', []);
        }],
        ['twee vingers overlappen (de tweede laat eerst los)', [a.t, b.t], async () => {
          await T('touchStart', [[a.x, a.y, 1]]); await W(30);
          await T('touchStart', [[a.x, a.y, 1], [b.x, b.y, 2]]); await W(30);
          await T('touchEnd', [[a.x, a.y, 1]]); await W(30);
          await T('touchEnd', []);
        }],
        ['een tik in de kier', null, async () => { await T('touchStart', [[kier, a.y, 1]]); await T('touchEnd', []); }],
        ['lang vasthouden', [a.t], async () => { await T('touchStart', [[a.x, a.y, 1]]); await W(800); await T('touchEnd', []); }],
        ['ver wegschuiven breekt af', [], async () => {
          await T('touchStart', [[a.x, a.y, 1]]);
          for (let i = 1; i <= 4; i++) await T('touchMove', [[a.x, a.y - 30 * i, 1]]);
          await T('touchEnd', []);
        }],
      ];
      for (const [naam, verwacht, doe] of zaken) {
        await page.evaluate(() => { __tel.length = 0; });
        await doe();
        await W(300);
        const tel = await page.evaluate(() => __tel.slice());
        const goed = verwacht ? JSON.stringify(tel) === JSON.stringify(verwacht) : tel.length === 1 && (tel[0] === a.t || tel[0] === b.t);
        check(goed, `F · ${naam} (${mode})`, `telde ${JSON.stringify(tel)}, verwacht ${JSON.stringify(verwacht || [a.t + ' of ' + b.t])}`);
      }
      // het toetsenbord: Enter op een knop is een click zonder aanraking, en telt één keer
      await page.evaluate(() => { __tel.length = 0; });
      await page.evaluate(sel => document.querySelector(sel).click(), sel);
      check(JSON.stringify(await page.evaluate(() => __tel.slice())) === JSON.stringify([a.t]), `F · een click zonder aanraking (toetsenbord) telt één keer (${mode})`, '');
    }
    await ctx.close();
  }

  /* ---- H · een scherm in rust doet niets ---- */
  {
    const { ctx, page } = await nieuw();
    // elke setInterval die nog loopt, bijhouden
    await ctx.addInitScript(() => {
      const aan = new Set(), si = setInterval, ci = clearInterval;
      window.__intervallen = aan;
      window.setInterval = function (f, t, ...r) { const id = si.call(this, f, t, ...r); aan.add(id); return id; };
      window.clearInterval = function (id) { aan.delete(id); return ci.call(this, id); };
    });
    const SCHERMEN = [['profile', ''], ['map', '&screen=map'], ['game', '&screen=game'], ['end', '&screen=end'],
      ['dress', '&screen=dress'], ['tro', '&screen=tro'], ['reis', '&screen=reis'], ['ouders', '&screen=ouders']];
    for (const [naam, scherm] of SCHERMEN) {
      await page.goto(APP_URL + '&demo' + (scherm ? '&star=p1' + scherm : ''));
      await page.waitForTimeout(3500);   // de aankomst, een feestje, een eerste vraag: voorbij
      await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] });
      // Een zichtbaar tabblad maakt elk beeldje; headless doet dat alleen als iemand
      // erom vraagt. Zonder deze lus tekent een knikkende pop hier nul keer.
      await page.evaluate(duur => new Promise(klaar => {
        const t0 = performance.now();
        (function beeld() { if (performance.now() - t0 < duur) requestAnimationFrame(beeld); else klaar(); })();
      }), RUST_DUUR);
      const spoor = JSON.parse((await browser.stopTracing()).toString());
      const ev = spoor.traceEvents || spoor;
      const hoofd = ev.find(e => e.name === 'thread_name' && e.args.name === 'CrRendererMain'
        && ev.some(x => x.pid === e.pid && x.tid === e.tid && x.name === 'Paint'));
      const keer = hoofd ? ev.filter(e => e.pid === hoofd.pid && e.tid === hoofd.tid && e.name === 'Paint' && e.ph === 'X').length : 0;
      const perSec = Math.round(keer * 1000 / RUST_DUUR);
      if (RUST_MAG[naam]) check(true, `H · ${naam} tekent in rust ${perSec}x per seconde (mag: ${RUST_MAG[naam]})`, '');
      else check(perSec <= RUST_TEKEN_MAX, `H · ${naam} in rust tekent niet elk beeldje opnieuw`, `${perSec}x per seconde, de grens is ${RUST_TEKEN_MAX}`);
      const stil = await page.evaluate(() => {
        const onzichtbaar = [];
        for (const a of document.getAnimations()) {
          if (a.playState !== 'running' || !a.effect || !a.effect.target) continue;
          const t = a.effect.target, r = t.getBoundingClientRect();
          const weg = !t.isConnected || r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > innerHeight
            || r.right < 0 || r.left > innerWidth || (t.checkVisibility && !t.checkVisibility({ visibilityProperty: true }));
          if (weg) onzichtbaar.push((a.animationName || 'waapi') + ' op ' + (t.id || String(t.className && t.className.baseVal != null ? t.className.baseVal : t.className).split(' ')[0] || t.tagName));
        }
        return { onzichtbaar, intervallen: window.__intervallen ? window.__intervallen.size : 0 };
      });
      check(!stil.onzichtbaar.length, `H · ${naam}: geen animatie op iets dat je niet ziet`, stil.onzichtbaar.slice(0, 5).join(' | '));
      check(!stil.intervallen, `H · ${naam}: geen setInterval dat doortikt`, `${stil.intervallen} lopen er`);
    }
    await ctx.close();
  }

  check(!fouten.length, 'geen javascript-fouten', fouten.slice(0, 5).join(' | '));
  await browser.close();
  klaar();
})().catch(e => { console.error(e); process.exit(1); });
