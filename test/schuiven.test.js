/*
 * Schuiven: een scherm schuift precies zo ver als er iets te zien valt.
 *
 * Elk scherm is een scrollvak (overflow-y: auto op .screen), en dat is goed:
 * past het niet, dan schuif je. Maar het vak schuift ook als het maar een paar
 * pixels te hoog is, en dan voelt de app onder je vinger los: je duwt een
 * kleedkamer waar alles in past omhoog de lege lade in, of een hele kaart schuift
 * 46px op en toont een donkere band. Niets breekt, dus geen andere test ziet het.
 * En het omgekeerde kan ook: een rek dat juist níet schuift terwijl de onderste
 * rij nog onder de navigatie staat.
 *
 * Hoe er gemeten wordt. Per scrollvak: hoe ver schuift het, en hoe ver móét het,
 * zodat het onderste echte ding (een kaartje, een knop, een tekst) 8px boven de
 * navigatiebalk -- of de onderrand -- uitkomt. Plakkende en vaste lagen tellen
 * niet mee, en de witruimte binnen een vak ook niet: alleen bladeren.
 *
 *   A  niemand schuift meer dan SPELING verder dan nodig
 *      (vóór oktober 2026: de kleedkamer 82 te ver, ook met de lade dicht; de
 *      kaart op een liggende tablet 46; het lege beginscherm liggend 24)
 *   B  het rek van de kleedkamer en de kast zijn tot onderaan te schuiven
 *      (vóór oktober 2026: liggend breed bleef de onderste rij van het rek
 *      onder de navigatie, het raster werd op schermhoogte afgekapt)
 *   C  de ruimte onder de balken (--onder-vrij, zie 35-schermen.js) groeit
 *      zodra een balk opengaat, en krimpt pas bij een andere lade of een ander
 *      scherm -- niet bij het dichtgaan, want dan sprong het rek wie onderaan
 *      stond een stuk omlaag. Ook voor de balk van de kast.
 *   D  een scherm dat geen lijst is (.lijst, zie .screen in 10-basis) past op
 *      elke maat: zo'n scherm schuift niet, dus wat niet past valt weg
 *   E  een show springt niet: zij, de bovenkant van de kaart en de onderkant
 *      van de knoppen staan bij elke vraag op dezelfde plek, ook als typen
 *      (cijferblok), kiezen (vier of twee knoppen) en tikken (de getallenlijn)
 *      elkaar afwisselen, en in elke fase van de telmodus. Vóór de speeltest
 *      van oktober 2026 schoof de kaart op een telefoon bij elke wissel 86px
 *      op en kromp zij mee; in de telmodus sprong zij tot eind oktober 2026 nog
 *      83px. En staand staat er geen lege band in het antwoordvak: wat de
 *      vraag niet nodig heeft gaat naar de knoppen of de kaart (zie vakVullen).
 *   F  elk antwoord past: voor elk thema (uit THEMAS, dus een nieuw thema doet
 *      vanzelf mee) en de telmodus, elke stap, kiezen en typen, staan de kaart
 *      en elke knop van het antwoord helemaal in beeld. Vóór oktober 2026 vielen
 *      liggend met een getallenlijn, klok of kalender de antwoorden 85 tot 125px
 *      onder het scherm -- die van de sommen in dezelfde show ook. Elke fase van
 *      de telmodus doet apart mee, en het scherm zelf mag niet schuiven: de
 *      tegels stonden binnen beeld terwijl de zaal op een hoge telefoon nog 24px
 *      opschoof (zie zaalPast).
 *      En meteen drie dingen die je pas ziet als je de vraag écht speelt: een
 *      som is even hoog met het vraagteken als met het antwoord erin (vóór
 *      oktober 2026 brak "400 + 500 = 900" pas als de 900 erin viel, en sprong
 *      zij omhoog); een telsom staat op één regel en past in zijn kaart; en de
 *      klokjes bij "zoek de klok" zijn geen postzegels (KLOK_ZOEK_MIN). Elke
 *      telsom (vorm, teken, paar) loopt het apart af, niet alleen wat het lot
 *      trekt. Bij een gouden vraag houdt de kaart zijn breedte (liggend nam de gouden regel
 *      er 50px van af, en stak een telsom eruit).
 *   Z  haar gezicht blijft vrij: op een gewone hoge telefoon valt de hint (de
 *      🤔, "half 3 ↷") niet op haar hoofd, ook niet als zij hoog staat (de
 *      telmodus, een show met de klok of de kalender). Zie zaalPast.
 *
 * Draaien:  npm run test:schuiven
 */
const { launch, cacheFonts, rust, APP_URL } = require('./browser');
const { check, klaar } = require('./meld')('schuiven');

/* Hoeveel lucht een vak onder zijn laatste ding mag houden, bovenop de 8 die
   "nodig" al meetelt. Ruim genoeg voor de binnenrand van een kaartje en de lucht
   van een paneel (de kast houdt er zo'n 36), krap genoeg voor een vergeten balk. */
const SPELING = 44;

const MATEN = [[320, 568], [390, 844], [412, 915], [640, 360], [844, 390], [1024, 768], [1180, 820]];
/* Alle maten tegelijk, elk in een eigen context van dezelfde browser: geen
   gedeelde opslag, geen gedeelde maat, dus ze zitten elkaar niet in de weg. De
   suite wacht vooral op schermen die binnenkomen (de kaart doet er ruim twee
   seconden over), en dat wachten kan naast elkaar -- het rekenwerk zelf is een
   halve minuut, ook op een CI-machine met vier kernen. */
const TEGELIJK = MATEN.length;
const KIJK = '&demo&star=p1&wereld=4&diamanten=60&stand=halverwege';
const SCHERMEN = [
  ['beginscherm', '&demo&screen=profile'],
  ['leeg beginscherm', '&screen=profile'],
  ['kaart', KIJK + '&screen=map'],
  ['show', KIJK + '&screen=game'],
  ['eindscherm', KIJK + '&screen=end'],
  ['kast', KIJK + '&screen=tro'],
  ['ouderdeel', KIJK + '&screen=ouder'],
  ['kleedkamer', KIJK + '&screen=dress'],
  ['reis', KIJK + '&screen=reis'],
  ['tellen', '&demo&star=p2&screen=map'],
  ['telshow', '&demo&star=p2&screen=game'],
  ['niet gelukt', KIJK + '&screen=game', 'G.stars = 0; endLevel(false)'],
  ['memory', '&demo&star=p2&screen=map', 'startMemory()'],
  ['nieuwe ster', KIJK + '&screen=map', 'openNewStar()'],
];

/* Elk scrollvak dat schuift, met wat het schuift en wat het moet. */
const meet = page => page.evaluate(() => {
  const zicht = el => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
  const actief = document.querySelector('.screen.active');
  // de bovenkant van wat er onderaan vast staat (de navigatie, de lade)
  let balk = innerHeight;
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' || !zicht(el) || el.closest('.screen:not(.active)')) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 20 || r.width < 100 || r.top < innerHeight * 0.6 || r.top >= innerHeight) continue;
    if (cs.pointerEvents === 'none' && !el.querySelector('button')) continue;
    balk = Math.min(balk, r.top);
  }
  const uit = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (!/auto|scroll/.test(cs.overflowY) || el.offsetParent === null && el !== actief) continue;
    const schuift = el.scrollHeight - el.clientHeight;
    if (schuift <= 0) continue;
    const vak = el.getBoundingClientRect();
    let onder = el === actief ? Math.min(vak.bottom, balk) : vak.bottom;
    // een voet die onderaan plakt (Klaar! op het maakformulier) is ook een balk
    for (const c of el.querySelectorAll('*')) {
      const ccs = getComputedStyle(c);
      if (ccs.position === 'sticky' && ccs.bottom !== 'auto' && zicht(c)) onder = Math.min(onder, c.getBoundingClientRect().top);
    }
    let laagst = -1e9;
    for (const c of el.querySelectorAll('*')) {
      const blad = !c.childElementCount || /^(svg|img|button)$/i.test(c.tagName) || c.matches('.item-card,.trophy-card');
      if (!blad || (c.closest('svg') && c.tagName.toLowerCase() !== 'svg')) continue;
      const ccs = getComputedStyle(c);
      if (ccs.position === 'fixed' || ccs.position === 'sticky' || !zicht(c)) continue;
      if (c.offsetParent === null && c.tagName.toLowerCase() !== 'svg') continue;
      const r = c.getBoundingClientRect();
      if (r.height < 2 || r.width < 2) continue;
      laagst = Math.max(laagst, r.bottom + el.scrollTop);
    }
    uit.push({ vak: el.id ? '#' + el.id : el.className, schuift, nodig: Math.max(0, Math.round(laagst - onder + 8)) });
  }
  return uit;
});

const tabs = page => page.locator('#screen-dress .tab-btn');

async function perMaat(browser, [w, h]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true });
  await cacheFonts(ctx);
  for (const [naam, param, js] of SCHERMEN) {
    const page = await ctx.newPage();
    const fouten = [];
    page.on('pageerror', e => fouten.push(e.message));
    await page.goto(APP_URL + param);
    await rust(page);
    if (js) { await page.evaluate(js); await rust(page); }
    // het eindscherm bouwt in getimede stappen op, die ziet rust niet aankomen
    if (naam === 'eindscherm') await rust(page, { minstens: 1300 });
    // ---- D · wat geen lijst is, past ----
    const past = await page.evaluate(() => {
      const s = document.querySelector('.screen.active');
      return { id: s.id, lijst: s.classList.contains('lijst'), weg: s.scrollHeight - s.clientHeight };
    });
    if (!past.lijst) check(past.weg <= 1, 'D · een beeldscherm past',
      `${naam} op ${w}x${h}: #${past.id} is ${past.weg}px te hoog en wordt afgeknipt`);
    // de kleedkamer per lade: elke categorie is een ander rek
    const laden = naam === 'kleedkamer' ? await tabs(page).count() : 1;
    for (let i = 0; i < laden; i++) {
      if (naam === 'kleedkamer') { await tabs(page).nth(i).click(); await rust(page); }
      const wie = `${naam}${laden > 1 ? ' lade ' + (i + 1) : ''} op ${w}x${h}`;
      for (const v of await meet(page)) {
        check(v.schuift - v.nodig <= SPELING, 'A · niet verder dan nodig',
          `${wie}: ${v.vak} schuift ${v.schuift}, nodig ${v.nodig}`);
        if (naam === 'kleedkamer' || naam === 'kast')
          check(v.schuift + 8 >= v.nodig, 'B · tot onderaan te schuiven',
            `${wie}: ${v.vak} schuift ${v.schuift}, nodig ${v.nodig}`);
      }
    }
    check(!fouten.length, 'A · niet verder dan nodig', `${naam} op ${w}x${h}: ${fouten.join(' | ')}`);
    await page.close();
  }
  await ctx.close();
}


// ---- C · de ruimte onder de balken groeit meteen en krimpt pas later ----
async function zaakC(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await cacheFonts(ctx);
  const page = await ctx.newPage();
  await page.goto(APP_URL + KIJK + '&screen=dress');
  await rust(page);
  const stand = id => page.evaluate(id => {
    const s = document.getElementById(id);
    return { vrij: parseFloat(s.style.getPropertyValue('--onder-vrij')) || 0,
             hoog: s.scrollHeight, top: s.scrollTop };
  }, id);
  const dicht = await stand('screen-dress');
  check(dicht.vrij > 0 && dicht.vrij < 120, 'C · de ruimte onder de balken',
    'met de lade dicht hoort er alleen de navigatie onder: ' + JSON.stringify(dicht));
  // een spulletje dat nog niet van haar is: de lade gaat open
  await page.evaluate(() => {
    [...document.querySelectorAll('#item-grid .item-card')]
      .find(c => c.dataset.item && !P().owned.includes(c.dataset.item)).click();
  });
  await rust(page);
  const open = await stand('screen-dress');
  check(open.vrij > dicht.vrij + 40 && open.hoog > dicht.hoog, 'C · de ruimte onder de balken',
    'lade open maar het rek kreeg er geen ruimte bij: ' + JSON.stringify({ dicht, open }));
  // helemaal onderaan, en dan de lade dicht (niets meer passen)
  await page.evaluate(() => { document.getElementById('screen-dress').scrollTop = 1e5; });
  await rust(page);
  const onder = await stand('screen-dress');
  await page.evaluate(() => stopPassen());
  await rust(page);
  const terug = await stand('screen-dress');
  check(terug.top === onder.top, 'C · de ruimte onder de balken',
    `de lade ging dicht en het rek sprong: ${onder.top} -> ${terug.top}`);
  await tabs(page).nth(0).click();
  await rust(page);
  const ander = await stand('screen-dress');
  check(ander.vrij === dicht.vrij, 'C · de ruimte onder de balken',
    `een andere lade houdt de ruimte voor de dichte lade vast: ${ander.vrij} tegen ${dicht.vrij}`);
  // de kast: een getikte trofee opent zijn balk, en die krijgt ook ruimte
  await page.goto(APP_URL + KIJK + '&screen=tro');
  await rust(page);
  const kastDicht = await stand('screen-trophies');
  await page.evaluate(() => {
    const k = [...document.querySelectorAll('#trophy-shelves .trophy-card')].pop();
    k.click();
  });
  await rust(page);
  const kastOpen = await page.evaluate(() => document.getElementById('kast-bar').style.display);
  const kastNa = await stand('screen-trophies');
  check(kastOpen === 'none' || kastNa.vrij > kastDicht.vrij + 30, 'C · de ruimte onder de balken',
    'de balk van de kast ging open zonder ruimte eronder: ' + JSON.stringify({ kastDicht, kastNa }));
  await ctx.close();
}

// ---- E · een show springt niet ----
const SPRONG = 4;
// lucht in het antwoordvak, staand, boven de knoppen: meer is een lege band
const VAK_LUCHT = 12;
async function zaakE(browser, [w, h]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true });
  await cacheFonts(ctx);
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', e => fouten.push(e.message));
  await page.goto(APP_URL + '&demo&star=p1&screen=map');
  await rust(page);
  /* Alle drie de manieren van antwoorden, met elk thema en al zijn stappen (uit THEMAS en
     LADDERS: een nieuw thema doet vanzelf mee), en elke fase van de telmodus. Kiezen stond
     er eerst niet bij, "want dat zijn altijd vier knoppen" -- tot de getallenlijn een lijn
     en Afronden twee knoppen gaf. */
  const shows = ['kies', 'typ', 'mix'].map(mode => ({ naam: mode, mode }))
    .concat(Array.from({ length: 12 }, (_, i) => ({ naam: 'tellen fase ' + (i + 1), fase: i + 1 })));
  for (const show of shows) {
    const r = await page.evaluate(async show => {
      await document.fonts.ready;
      const s = P().settings;
      if (show.fase) { s.track = 'count'; s.modus = 'pad'; s.numerals = true; s.stage = s.stageMax = show.fase; P().countTrack.stage = show.fase; }
      else {
        s.track = 'math'; s.ops = ['+', '-']; s.themas = THEMAS.filter(t => !t.ops).map(t => t.id); s.mode = show.mode; s.modus = 'vrij';
        Object.values(LADDERS).forEach(L => { if (L.kies) s[L.kies] = L.pad.map(r => r.id); });
      }
      s.perLevel = 12;
      startLevel(P().level);
      // offsetTop en offsetHeight: de vraag komt binnen met een transform, en die telt hier niet
      const plek = el => { let y = 0; for (let e = el; e; e = e.offsetParent) y += e.offsetTop; return y; };
      const a = $('answer-area'), naast = () => getComputedStyle(a.parentNode).flexDirection === 'row';
      /* Het vak: zijn onderkant, waar de duim is. Liggend staat het naast de kaart, in het midden. */
      const vakPlek = () => Math.round(plek(a) + a.offsetHeight / (naast() ? 2 : 1));
      const uit = [];
      for (let i = 0; i < G.total; i++) {
        G.idx = i; renderQuestion();
        const q = G.qs[i];
        const knoppen = [...a.querySelectorAll('button, .gl-vlak')].filter(b => b.offsetHeight);
        const boven = knoppen.length ? Math.min(...knoppen.map(plek)) - plek(a) : 0;
        uit.push({ vraag: q.kind + (q.vorm || q.soort || q.ctype ? '/' + (q.vorm || q.soort || q.ctype) : '') + ' ' + G.mode,
          kaart: plek($('question-card')), vak: vakPlek(), zij: plek($('game-avatar-inner')), zijHoog: $('game-avatar-inner').offsetHeight,
          lucht: naast() ? 0 : boven });
      }
      return uit;
    }, show);
    for (const k of ['kaart', 'vak', 'zij', 'zijHoog']) {
      const v = r.map(x => x[k]), span = Math.max(...v) - Math.min(...v);
      /* SPRONG: een paar pixels afronding op een drukke machine is geen sprong (liggend
         schoof zij er 2 à 3 onder npm test); de sprong uit de speeltest was 35 tot 86 */
      check(span <= SPRONG, 'E · een show springt niet',
        `${w}x${h}, ${show.naam}: ${k} verspringt ${span}px over ${r.map(x => `${x.vraag} ${x[k]}`).join(', ')}`);
    }
    const band = r.filter(x => x.lucht > VAK_LUCHT);
    check(!band.length, 'E · een show springt niet',
      `${w}x${h}, ${show.naam}: een lege band boven de knoppen: ${band.map(x => `${x.vraag} ${x.lucht}px`).join(', ')}`);
  }
  check(!fouten.length, 'E · een show springt niet', `${w}x${h}: ${fouten.join(' | ')}`);
  await ctx.close();
}

// ---- F · elk antwoord past ----
// een klokje om te zoeken: kleiner was het 45 à 64px, op een knop onder een lege kaart
const KLOK_ZOEK_MIN = 84;
const PAS_MATEN = [[320, 568], [390, 844], [568, 320], [667, 375], [844, 390], [1024, 768]];
async function zaakF(browser, [w, h]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true });
  await cacheFonts(ctx);
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', e => fouten.push(e.message));
  await page.goto(APP_URL + '&demo&star=p1&screen=map');
  await rust(page);
  const r = await page.evaluate(async KLOK_ZOEK_MIN => {
    await document.fonts.ready;
    const s = P().settings, uit = [];
    // een thema alleen, met al zijn stappen: dan komt elke vorm in één show langs
    const zetten = THEMAS.map(t => [t.id, () => {
      s.track = 'math'; s.modus = 'vrij';
      s.ops = t.ops ? t.ops.slice() : []; s.themas = t.ops ? [] : [t.id];
      if (t.id === 'rekenen') s.kies = padRijen(s).rijen.map(r => r.id);
      if (LADDERS[t.id] && LADDERS[t.id].kies) s[LADDERS[t.id].kies] = LADDERS[t.id].pad.map(r => r.id);
    }]).concat([['tellen', () => { s.track = 'count'; s.modus = 'pad'; }]])
      // elke fase van de telmodus apart, met dingen en met stippen: het leerpad
      // alleen kwam nooit voorbij fase 1, en de tegels van fase 2 schoven het scherm op
      .concat(Array.from({ length: COUNT_STAGE_MAX }, (_, i) => ['objects', 'dots'].map(repr => [`tellen ${i + 1} ${repr}`, () => {
        s.track = 'count'; s.modus = 'vrij'; s.kiesFasen = [i + 1]; s.repr = repr;
      }])).flat());
    // offsetTop en niet getBoundingClientRect: de vraag komt binnen met een transform (zie zaak E)
    const binnen = el => {
      let x = 0, y = 0; for (let e = el; e; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
      return el.offsetWidth && x >= -1 && y >= -1 && x + el.offsetWidth <= innerWidth + 1 && y + el.offsetHeight <= innerHeight + 1;
    };
    /* en het scherm zelf schuift niet: de arena met zijn rand eronder past (zie
       zaalPast). Een paar pixels mag: op 320 breed is zij met een getallenlijn al
       zo klein als ze wordt (ZAAL_MIN), en dan schuift het 6px -- dat voel je
       niet. Wat je wel voelt, de 24px van de telmodus, valt erbuiten. */
    const sg = $('screen-game'), arena = sg.querySelector('.game-arena');
    const schuift = () => {
      let y = 0; for (let e = arena; e; e = e.offsetParent) y += e.offsetTop;
      return y + arena.offsetHeight + (parseFloat(getComputedStyle(sg).paddingBottom) || 0) > sg.clientHeight + 8 ? [{ id: 'scherm schuift' }] : [];
    };
    // een telsom: één regel, en binnen zijn kaart
    const telsomNa = naam => {
      const som = $('question-text').querySelector('.sum-eq');
      if (!som) return;
      // gebroken is: een stuk begint pas onder een ander stuk. Niet "de tops
      // verschillen" -- de stukken staan op hun grondlijn, en een groep van
      // 70px hoog naast een "=" van 43 begint vanzelf lager (fase 9 tot 12)
      const kaart = $('question-card').getBoundingClientRect();
      const raam = [...som.querySelectorAll('.dframe, .cgroup')].map(d => d.getBoundingClientRect());
      const stukken = [...som.children].filter(c => c.offsetHeight);
      if (Math.max(...stukken.map(c => c.offsetTop)) >= Math.min(...stukken.map(c => c.offsetTop + c.offsetHeight))) uit.push(`${naam}: de telsom breekt`);
      if (raam.some(r => r.left < kaart.left - 1 || r.right > kaart.right + 1)) uit.push(`${naam}: een stippenraam of groepje steekt uit de kaart`);
    };
    for (const [k, zet] of zetten) for (const mode of ['kies', 'typ']) {
      zet(); s.mode = mode; s.perLevel = 12;
      if (s.track === 'count' && mode === 'typ') continue;   // tellen kent alleen tegels
      startLevel(P().level);
      for (let i = 0; i < G.total; i++) {
        G.idx = i; renderQuestion();
        const q = G.qs[i], weg = [$('question-card'), ...$('answer-area').querySelectorAll('button:not(.gl-raak), .gl-vlak')].filter(el => !binnen(el)).concat(schuift());
        const naam = `${k}/${mode}/${q.rij || q.soort || q.kind}${q.tik ? '·tik' : ''}${G.count ? '·fase ' + countLiveStage(P()) + ' ' + (q.type || '') : ''}`;
        if (weg.length) uit.push(`${naam}: ${weg.map(el => el.id || el.className.split(' ')[0]).slice(0, 2).join(',')}`);
        // met het antwoord erin even hoog (zie drawQuestion)
        const vak = SOM_SOORTEN.includes(q.kind) && $('question-text').querySelector('.q-blank');
        if (vak) {
          const voor = $('question-card').offsetHeight, was = vak.textContent;
          vak.textContent = toonAntwoord(q, q.ans);
          const na = $('question-card').offsetHeight;
          vak.textContent = was;
          if (na !== voor) uit.push(`${naam} ${q.tmpl || ''}: kaart ${voor} -> ${na} met het antwoord`);
        }
        telsomNa(naam);
        // elke vraag kan de gouden zijn: zijn regel staat in beeld en neemt de kaart
        // geen breedte af (liggend stond hij mee in de rij, en was de kaart 50px
        // smaller). Op elke vraag nagebootst, niet alleen op de ene die het lot koos.
        {
          const b = $('gold-banner'), t = b.textContent;
          b.textContent = ''; goudPlek(); const zonder = $('question-card').offsetWidth;
          b.textContent = '🌟 3× 💎 🌟'; goudPlek(); const met = $('question-card').offsetWidth;
          if (met !== zonder) uit.push(`${naam}: gouden vraag, kaart ${zonder} -> ${met}`);
          if (!binnen(b)) uit.push(`${naam}: gold-banner`);
          b.textContent = t; goudPlek();
        }
        // de klok zoeken: echte klokjes
        const klokje = q.kind === 'klok' && q.vorm === 'zoek' && $('answer-area').querySelector('.choice-btn');
        if (klokje && klokje.offsetHeight < KLOK_ZOEK_MIN) uit.push(`${naam}: zoek-klokje ${klokje.offsetHeight}px`);
      }
    }
    /* En elke telsom zelf, niet alleen wat het lot trekt: "3 + 3" brak op 320
       breed maar kwam in één show van twaalf vragen maar af en toe langs, en
       dan was deze zaak de ene keer groen en de andere rood. Dus elke vorm, elk
       teken en elk paar, op de kaart van een gewone telvraag. */
    zetten.find(([k]) => k === 'tellen 9 objects')[1]();
    startLevel(P().level); G.idx = 0; renderQuestion();
    const basis = G.qs[0], emoji = (basis.card && basis.card.emoji) || '🐢';
    for (const style of ['sym', 'dots', 'written']) for (const repr of ['objects', 'dots']) for (const op of ['+', '-'])
      for (let a = 1; a <= (style === 'sym' ? 6 : 10); a++) for (let b = 1; b <= (style === 'sym' ? 5 : 10); b++) {
        if (op === '-' ? b >= a : style === 'sym' && a > 5) continue;
        G.qs[0] = { ...basis, card: { kind: 'sum', style, op, a, b, c: op === '-' ? a - b : a + b, emoji, repr, support: 'full', cap: 10 } };
        G.idx = 0; renderQuestion();
        telsomNa(`telsom ${style}/${repr} ${a} ${op} ${b}`);
      }
    return [...new Set(uit)];
  }, KLOK_ZOEK_MIN);
  check(!r.length, 'F · elk antwoord past', `${w}x${h}: ${r.slice(0, 8).join(' | ')}${r.length > 8 ? ` (+${r.length - 8})` : ''}`);
  check(!fouten.length, 'F · elk antwoord past', `${w}x${h}: ${fouten.join(' | ')}`);
  await ctx.close();
}

// ---- Z · haar gezicht blijft vrij ----
// De hoge telefoons: daar is plaats, en daar viel de pil op haar gezicht. Op een
// kleine telefoon krimpt zij maar tot GEZICHT_KRIMP (zie zaalPast), en is er geen plaats.
async function zaakZ(browser, [w, h]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true });
  await cacheFonts(ctx);
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', e => fouten.push(e.message));
  await page.goto(APP_URL + '&demo&star=p1&screen=map');
  await rust(page);
  const shows = [
    ['tellen', () => { const s = P().settings; s.track = 'count'; s.modus = 'pad'; s.numerals = true; s.stage = s.stageMax = 10; P().countTrack.stage = 10; }],
    ['klok', () => { const s = P().settings; s.track = 'math'; s.modus = 'vrij'; s.ops = []; s.themas = ['klok']; s.kiesKlok = ['kwartier']; s.mode = 'kies'; }],
    ['kalender', () => { const s = P().settings; s.track = 'math'; s.modus = 'vrij'; s.ops = []; s.themas = ['kalender']; s.kiesKalender = ['blad']; s.mode = 'kies'; }],
  ];
  const uit = [];
  for (const [naam, zet] of shows) {
    await page.evaluate(zet => { (0, eval)(`(${zet})`)(); P().settings.perLevel = 6; startLevel(P().level); }, zet.toString());
    await page.waitForTimeout(1500);   // de zaal komt binnen met een transform: wachten tot hij staat
    // de hoogste pil (de 🤔), zoals eersteMisser hem toont
    const r = await page.evaluate(() => {
      showToast('🤔', null, null, 'teken');
      const t = $('toast').getBoundingClientRect(), hoofd = document.querySelector('#show-stage .av-hoofd').getBoundingClientRect();
      hideToast();
      return [Math.round(t.bottom), Math.round(hoofd.top + hoofd.height * HAAR)];   // haar haar mag eronder, haar ogen niet
    });
    if (r[0] > r[1] + 2) uit.push(`${naam}: de pil eindigt op ${r[0]}, haar ogen staan op ${r[1]}`);
  }
  check(!uit.length, 'Z · haar gezicht blijft vrij', `${w}x${h}: ${uit.join(' | ')}`);
  check(!fouten.length, 'Z · haar gezicht blijft vrij', `${w}x${h}: ${fouten.join(' | ')}`);
  await ctx.close();
}

(async () => {
  const browser = await launch();
  await Promise.all([[390, 844], [414, 896], [430, 932]].map(m => zaakZ(browser, m)));
  await Promise.all(PAS_MATEN.map(m => zaakF(browser, m)));
  await Promise.all([[390, 844], [320, 568], [430, 932], [844, 390], [1024, 768], [820, 1180]].map(m => zaakE(browser, m)));
  const rij = [...MATEN];
  await Promise.all([zaakC(browser), ...Array.from({ length: TEGELIJK }, async () => {
    for (let m; (m = rij.shift());) await perMaat(browser, m);
  })]);

  await browser.close();
  klaar();
})().catch(e => { console.error(e); process.exit(1); });
