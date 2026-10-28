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
 *   E  een show springt niet: de kaart, het antwoordvak en zij staan bij elke
 *      vraag op dezelfde plek, ook als typen (cijferblok) en kiezen (vier
 *      knoppen) elkaar afwisselen -- een som typ je, een klok of een dag kies
 *      je altijd. Vóór de speeltest van oktober 2026 schoof de kaart op een
 *      telefoon bij elke wissel 86px op, en kromp zij mee (zie antwoordOpMaat).
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
async function zaakE(browser, [w, h]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true });
  await cacheFonts(ctx);
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', e => fouten.push(e.message));
  await page.goto(APP_URL + '&demo&star=p1&screen=map');
  await rust(page);
  for (const mode of ['typ', 'mix']) {
    const r = await page.evaluate(async mode => {
      await document.fonts.ready;
      const s = P().settings;
      s.themas = ['rekenen', 'geld', 'klok', 'kalender']; s.mode = mode; s.modus = 'vrij';
      s.kiesGeld = GELDPAD.map(r => r.id); s.kiesKlok = KLOKPAD.map(r => r.id); s.kiesKalender = KALENDERPAD.map(r => r.id);
      startLevel(P().level);
      // offsetTop en offsetHeight: de vraag komt binnen met een transform, en die telt hier niet
      const plek = el => { let y = 0; for (let e = el; e; e = e.offsetParent) y += e.offsetTop; return y; };
      const uit = [];
      for (let i = 0; i < G.total; i++) {
        G.idx = i; renderQuestion();
        const q = G.qs[i];
        uit.push({ vraag: q.kind + (q.vorm || q.soort ? '/' + (q.vorm || q.soort) : '') + (G.mode === 'typ' ? ' typ' : ' kies'),
          kaart: plek($('question-card')), vak: plek($('answer-area')), zij: plek($('game-avatar-inner')), zijHoog: $('game-avatar-inner').offsetHeight });
      }
      return uit;
    }, mode);
    for (const k of ['kaart', 'vak', 'zij', 'zijHoog']) {
      const v = r.map(x => x[k]), span = Math.max(...v) - Math.min(...v);
      /* SPRONG: een paar pixels afronding op een drukke machine is geen sprong (liggend
         schoof zij er 2 à 3 onder npm test); de sprong uit de speeltest was 35 tot 86 */
      check(span <= SPRONG, 'E · een show springt niet',
        `${w}x${h}, ${mode}: ${k} verspringt ${span}px over ${r.map(x => `${x.vraag} ${x[k]}`).join(', ')}`);
    }
  }
  check(!fouten.length, 'E · een show springt niet', `${w}x${h}: ${fouten.join(' | ')}`);
  await ctx.close();
}

(async () => {
  const browser = await launch();
  await Promise.all([[390, 844], [320, 568], [844, 390], [1024, 768]].map(m => zaakE(browser, m)));
  const rij = [...MATEN];
  await Promise.all([zaakC(browser), ...Array.from({ length: TEGELIJK }, async () => {
    for (let m; (m = rij.shift());) await perMaat(browser, m);
  })]);

  await browser.close();
  klaar();
})().catch(e => { console.error(e); process.exit(1); });
