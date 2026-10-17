/*
 * De kop van de wereldkaart: portretje, wereldpil, 💎-pil. Drie dingen naast
 * elkaar op één regel, en de vraag is altijd dezelfde: passen ze?
 *
 * Waar dit over gaat. De wereldpil hoorde bij te weinig ruimte zijn naam met een
 * ellips in te korten (.wp-here-naam). Dat deed hij nooit: een grid-item met
 * justify-self: center krijgt de breedte van zijn eigen inhoud, en dan liep de
 * pil aan twee kanten over zijn buren heen. Onderwaterwereld schoof zo op een
 * gewone iPhone met de globe onder de 💎-pil, en met een wens erbij (de pil
 * wordt dan breder) gebeurde het bij bijna elke wereld. Een gewone test zag het
 * niet, want die speelt in Muziekwereld met dertig diamanten.
 *
 *   A  op elke maat, met de langste naam, veel diamanten en een wens: niets overlapt
 *   B  en de kop zegt de korte naam ("Onderwater"), met de volle in het label
 *   C  liggend op een telefoon dimt de kop maar half, en alleen als je ster er echt achter staat
 *
 * Draaien:  npm run test:kop
 */
const { launch, cacheFonts, APP_URL } = require('./browser');
const { check, klaar } = require('./meld')('kop');

// Van de kleinste telefoon tot een liggende tablet. De smalle maten zijn waar
// het misging; de brede staan erbij omdat de kop daar een kolom krijgt.
const MATEN = [[320, 568], [360, 640], [390, 844], [430, 932], [768, 1024], [1024, 768]];

async function zetKaart(page, { wereld, diamanten, wens }) {
  return page.evaluate(async ({ wereld, diamanten, wens }) => {
    const wi = wereld === 'langst'
      ? WORLDS.reduce((a, w, i) => (w.name.length > WORLDS[a].name.length ? i : a), 0) : wereld;
    const p = P();
    p.stars = {};
    const st = WORLD_START[wi];
    for (let l = 1; l < st + 2; l++) p.stars[l] = 2;
    p.level = st + 2;
    p.diamonds = diamanten;
    if (wens) p.wens = 'pet_draak'; else delete p.wens;
    save(); goMap();
    await new Promise(r => setTimeout(r, 900));
    const R = s => document.querySelector('#screen-map ' + s).getBoundingClientRect();
    const port = R('.map-id-btn'), pil = R('.world-pick'), dia = R('.diamond-badge'), cta = R('.wp-cta');
    const naast = (a, b) => a.right <= b.left + 0.5;   // a staat volledig links van b
    return {
      wi,
      portPil: naast(port, pil), pilDia: naast(pil, dia), ctaInPil: cta.right <= pil.right + 0.5,
      inBeeld: dia.right <= innerWidth + 0.5,
      maten: [port, pil, dia].map(b => `${Math.round(b.left)}-${Math.round(b.right)}`).join(' | '),
    };
  }, { wereld, diamanten, wens });
}

(async () => {
  const browser = await launch();
  const fouten = [];

  /* ---- A · niets overlapt ---- */
  for (const [w, h] of MATEN) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    page.on('pageerror', e => fouten.push(e.message));
    await page.goto(APP_URL + '&demo&star=p1');
    await page.waitForTimeout(400);
    for (const geval of [
      { wereld: 'langst', diamanten: 30, wens: false },
      { wereld: 'langst', diamanten: 1250, wens: false },
      { wereld: 'langst', diamanten: 9999, wens: true },
      { wereld: 0, diamanten: 12345, wens: true },
    ]) {
      const r = await zetKaart(page, geval);
      const wat = `${w}×${h} · ${geval.wereld === 'langst' ? 'langste naam' : 'wereld ' + geval.wereld}`
        + ` · ${geval.diamanten} 💎${geval.wens ? ' · met wens' : ''}`;
      check(r.portPil && r.pilDia && r.ctaInPil && r.inBeeld, `A · ${wat}: portretje, wereldpil en 💎-pil raken elkaar niet`, r.maten);
    }
    await ctx.close();
  }

  /* ---- B · de korte naam ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    page.on('pageerror', e => fouten.push(e.message));
    await page.goto(APP_URL + '&demo&star=p1');
    await page.waitForTimeout(400);
    await zetKaart(page, { wereld: 'langst', diamanten: 30, wens: false });
    const r = await page.evaluate(() => {
      const w = WORLDS[WORLDS.reduce((a, x, i) => (x.name.length > WORLDS[a].name.length ? i : a), 0)];
      const pil = document.getElementById('map-tournee-label');
      const naam = pil.querySelector('.wp-here-naam');
      return { vol: w.name, kort: korteNaam(w), tekst: naam.textContent, label: pil.getAttribute('aria-label'),
               afgekapt: naam.scrollWidth > naam.clientWidth + 1,
               raar: korteNaam({ name: 'Wereld' }), anders: korteNaam({ name: 'Het Bos' }) };
    });
    check(r.tekst === r.kort && !/wereld$/i.test(r.tekst), 'B · de kop zegt de naam zonder "wereld"', `${r.tekst} (${r.vol})`);
    check(r.label.indexOf(r.vol) === 0, 'B · en het label voor een schermlezer houdt de volle naam', r.label);
    check(!r.afgekapt, 'B · op een gewone telefoon past de langste naam voluit', r.tekst);
    check(r.raar === 'Wereld' && r.anders === 'Het Bos', 'B · een naam die anders eindigt, of niets overhoudt, blijft staan',
      `${r.raar} / ${r.anders}`);
    await ctx.close();
  }

  /* ---- C · liggend dimt de kop maar half, en alleen als het klopt ---- */
  {
    const ctx = await browser.newContext({ viewport: { width: 740, height: 360 } });
    await cacheFonts(ctx);
    const page = await ctx.newPage();
    page.on('pageerror', e => fouten.push(e.message));
    await page.goto(APP_URL + '&demo&star=p1');
    await page.waitForTimeout(400);
    const r = await page.evaluate(async () => {
      const p = P(); p.stars = { 1: 2, 2: 2 }; p.level = 3; save(); goMap();
      await new Promise(res => setTimeout(res, 1500));
      const s = document.getElementById('screen-map');
      const stand = () => ({ dim: s.classList.contains('ster-bij-kop'),
        op: +getComputedStyle(s.querySelector('.screen-header')).opacity });
      const thuis = stand();
      navigeerNaarWereld(3);
      await new Promise(res => setTimeout(res, 2200));
      return { thuis, elders: stand() };
    });
    check(!r.thuis.dim || r.thuis.op >= 0.5, 'C · liggend blijft een gedimde kop leesbaar', JSON.stringify(r.thuis));
    check(!r.elders.dim && r.elders.op === 1, 'C · in een wereld waar je ster niet staat dimt er niets', JSON.stringify(r.elders));
    await ctx.close();
  }

  check(fouten.length === 0, 'geen javascript-fouten', fouten.join(' | '));
  await browser.close();
  klaar();
})();
