/*
 * Het spelogo in lagen: uit de meester geknipt, niet opnieuw getekend.
 *
 *   npm run lagen      -> assets/branding/source/lagen/*.png   (de meesters, 2000x667)
 *                         assets/branding/logo-lagen.webp       (wat de app laadt)
 *
 * De logo-intro (zie "= Het spelogo komt binnen" in src/20-app.js) en het
 * promofilmpje bouwen het logo op uit zijn delen: de R blijft staan, de ster
 * springt naar zijn plek, de letters en de zwaai komen erbij. Daarvoor moeten die
 * delen los bestaan -- en ze moeten precies op het origineel passen, anders
 * verspringt er iets op het moment dat het echte logo het overneemt. Vandaar
 * knippen uit source/wordmark.webp in plaats van een tekenprogramma: elke pixel
 * komt uit de meester en staat op zijn eigen plek.
 *
 * DE LAGEN, en ze overlappen niet: elke pixel van de meester hoort bij precies
 * één laag. Op elkaar gelegd zijn ze dus het origineel, en dat wordt hieronder
 * ook nagerekend.
 *
 *   r                       de R
 *   e1 k e2 n1              de gele letters erna, elk los
 *   s t e3 r1 r2 e4 n2      de witte letters, elk los; de t zonder de ster
 *   ster                    de grote ster met zijn drie spatjes
 *   zwaai                   alles wat overblijft: de zwaai, de sterretjes, de glinsters
 *
 * Elke letter los, zodat ze één voor één kunnen opploppen. Het blad dat de app
 * laadt is geen stapel van veertien volle lagen maar een compact blad met alleen
 * de rechthoek om elk deel. Waar elk stuk staat -- in het logo en in het blad --
 * zet dit script in een tabel (LOGO_DELEN) die de app en het filmpje gebruiken. Die tabel staat met de
 * hand in src/20-app.js en promo/promo.html; dit script kijkt of hij daar nog
 * klopt en zegt anders welke regel er moet staan.
 *
 * HOE ER GEKNIPT WORDT. Elke letter heeft een vulling (geel of wit) met een
 * donkere rand eromheen, en tussen twee letters zit altijd rand. De vullingen
 * worden gevonden als samenhangende vlakken en op hun plek herkend (KERNEN). Een
 * pixel daarbuiten gaat naar de dichtstbijzijnde kern, zolang hij binnen de
 * randdikte ligt (RAND); verder weg is het zwaai. Een gesloten gat in een letter
 * -- de binnenkant van de R, het oog van de e -- blijft bij die letter, ook als
 * het verder van de vulling af ligt dan RAND.
 *
 * Komt er een nieuwe meester, dan kunnen de vlakken anders liggen: kijk dan naar
 * wat dit script zegt over de kernen, en naar source/lagen/controle.png.
 */
const fs = require('fs');
const path = require('path');
const { launch } = require('./browser.js');

const WORTEL = path.resolve(__dirname, '..');
const BRON = path.join(WORTEL, 'assets', 'branding', 'source', 'wordmark.webp');
const MEESTERS = path.join(WORTEL, 'assets', 'branding', 'source', 'lagen');
const UIT = path.join(WORTEL, 'assets', 'branding', 'logo-lagen.webp');
const LETTERS = ['r', 'e1', 'k', 'e2', 'n1', 's', 't', 'e3', 'r1', 'r2', 'e4', 'n2'];
const LAGEN = [...LETTERS, 'ster', 'zwaai'];            // ook de volgorde in logo-lagen.webp
const BREED = 1080;                                         // zoals assets/branding/wordmark.webp
const KWAL = 0.92;                                          // idem (zie test/merk.js)
const RAND = 24;                                            // randdikte, in pixels van de meester

/* Welk vlak bij welke laag hoort: op kleur (geel/wit), maat en waar zijn midden
   ligt, in pixels van de 2000 brede meester. Alles wat hier niet onder valt is
   zwaai. */
const KERNEN = [
  { laag: 'r',    kleur: 'geel', min: 20000, x: [0, 450],     y: [0, 667] },
  { laag: 'e1',   kleur: 'geel', min: 5000,  x: [450, 580],   y: [0, 667] },
  { laag: 'k',    kleur: 'geel', min: 5000,  x: [580, 715],   y: [0, 667] },
  { laag: 'e2',   kleur: 'geel', min: 5000,  x: [715, 840],   y: [0, 667] },
  { laag: 'n1',   kleur: 'geel', min: 5000,  x: [840, 980],   y: [0, 667] },
  { laag: 'ster', kleur: 'geel', min: 5000,  x: [980, 1260],  y: [0, 260] },
  { laag: 'ster', kleur: 'geel', min: 500,   x: [990, 1240],  y: [0, 170] },   // de spatjes
  { laag: 's',    kleur: 'wit',  min: 5000,  x: [970, 1105],  y: [300, 667] },
  { laag: 't',    kleur: 'wit',  min: 5000,  x: [1105, 1200], y: [300, 667] },
  { laag: 'e3',   kleur: 'wit',  min: 5000,  x: [1200, 1318], y: [300, 667] },
  { laag: 'r1',   kleur: 'wit',  min: 5000,  x: [1318, 1420], y: [300, 667] },
  { laag: 'r2',   kleur: 'wit',  min: 5000,  x: [1420, 1520], y: [300, 667] },
  { laag: 'e4',   kleur: 'wit',  min: 5000,  x: [1520, 1640], y: [300, 667] },
  { laag: 'n2',   kleur: 'wit',  min: 5000,  x: [1640, 2000], y: [300, 667] },
];

function naarBestand(dataUrl, pad) {
  fs.mkdirSync(path.dirname(pad), { recursive: true });
  fs.writeFileSync(pad, Buffer.from(dataUrl.split(',')[1], 'base64'));
  return Math.round(fs.statSync(pad).size / 1024);
}

(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  const bron = 'data:image/webp;base64,' + fs.readFileSync(BRON).toString('base64');

  const uit = await page.evaluate(async ({ bron, LAGEN, KERNEN, RAND, BREED, KWAL }) => {
    const im = new Image(); im.src = bron; await im.decode();
    const W = im.width, H = im.height, N = W * H;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d'); cx.drawImage(im, 0, 0);
    const px = cx.getImageData(0, 0, W, H).data;

    // 1. de vullingen: geel (R, eken, ster) en wit (sterren)
    const soort = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const r = px[4 * i], g = px[4 * i + 1], b = px[4 * i + 2];
      if (px[4 * i + 3] < 128) continue;
      if (r > 170 && g > 100 && b < 150 && r > b + 60) soort[i] = 1;
      else if (r > 185 && g > 165 && b > 170) soort[i] = 2;
    }
    // 2. samenhangende vlakken, en welke daarvan een kern zijn
    const vlak = new Int32Array(N).fill(-1), vlakken = [];
    for (let i = 0; i < N; i++) {
      if (!soort[i] || vlak[i] >= 0) continue;
      const id = vlakken.length, stapel = [i]; vlak[i] = id;
      let n = 0, sx = 0, sy = 0;
      while (stapel.length) {
        const j = stapel.pop(), x = j % W, y = (j - x) / W;
        n++; sx += x; sy += y;
        if (x > 0 && soort[j - 1] === soort[i] && vlak[j - 1] < 0) { vlak[j - 1] = id; stapel.push(j - 1); }
        if (x < W - 1 && soort[j + 1] === soort[i] && vlak[j + 1] < 0) { vlak[j + 1] = id; stapel.push(j + 1); }
        if (y > 0 && soort[j - W] === soort[i] && vlak[j - W] < 0) { vlak[j - W] = id; stapel.push(j - W); }
        if (y < H - 1 && soort[j + W] === soort[i] && vlak[j + W] < 0) { vlak[j + W] = id; stapel.push(j + W); }
      }
      vlakken.push({ soort: soort[i] === 1 ? 'geel' : 'wit', n, x: sx / n, y: sy / n });
    }
    const kernVan = vlakken.map(v => {
      const k = KERNEN.find(k => k.kleur === v.soort && v.n >= k.min &&
        v.x >= k.x[0] && v.x < k.x[1] && v.y >= k.y[0] && v.y < k.y[1]);
      return k ? LAGEN.indexOf(k.laag) : -1;
    });
    const kernen = LAGEN.map((l, i) => kernVan.filter(k => k === i).length);

    // 3. elke pixel naar de dichtstbijzijnde kern (chamfer 3-4, twee rondes)
    const ZW = LAGEN.indexOf('zwaai');
    const afst = new Float32Array(N).fill(1e9), laag = new Int8Array(N).fill(ZW);
    for (let i = 0; i < N; i++) if (vlak[i] >= 0 && kernVan[vlak[i]] >= 0) { afst[i] = 0; laag[i] = kernVan[vlak[i]]; }
    const stap = (i, j, w) => { if (afst[j] + w < afst[i]) { afst[i] = afst[j] + w; laag[i] = laag[j]; } };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (x > 0) stap(i, i - 1, 1);
      if (y > 0) { stap(i, i - W, 1); if (x > 0) stap(i, i - W - 1, 1.414); if (x < W - 1) stap(i, i - W + 1, 1.414); }
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      if (x < W - 1) stap(i, i + 1, 1);
      if (y < H - 1) { stap(i, i + W, 1); if (x < W - 1) stap(i, i + W + 1, 1.414); if (x > 0) stap(i, i + W - 1, 1.414); }
    }
    for (let i = 0; i < N; i++) if (afst[i] > RAND || px[4 * i + 3] === 0) laag[i] = ZW;

    // 4. gesloten gaten blijven bij hun letter: een stuk zwaai dat alleen aan
    //    één letter grenst (en niet aan de rand van het beeld of aan leegte)
    const gezien = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (laag[i] !== ZW || gezien[i] || px[4 * i + 3] === 0) continue;
      const stuk = [], stapel = [i], buren = new Set(); gezien[i] = 1;
      let open = false;
      while (stapel.length) {
        const j = stapel.pop(), x = j % W, y = (j - x) / W;
        stuk.push(j);
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) open = true;
        for (const q of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, y > 0 ? j - W : -1, y < H - 1 ? j + W : -1]) {
          if (q < 0) continue;
          if (px[4 * q + 3] === 0) { open = true; continue; }
          if (laag[q] === ZW) { if (!gezien[q]) { gezien[q] = 1; stapel.push(q); } }
          else buren.add(laag[q]);
        }
      }
      if (!open && buren.size === 1 && stuk.length < 20000) { const l = [...buren][0]; stuk.forEach(j => { laag[j] = l; }); }
    }

    // 5. de lagen zelf, de controle, en het blad voor de app
    const meesters = {}, aantal = {}, vak = {};
    const sch = BREED / W;
    for (let l = 0; l < LAGEN.length; l++) {
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (let i = 0; i < N; i++) if (laag[i] === l && px[4 * i + 3] > 40) {
        const x = i % W, y = (i - x) / W;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      vak[LAGEN[l]] = [x0, y0, x1 + 1, y1 + 1].map(v => Math.round(v * sch));
    }
    for (let l = 0; l < LAGEN.length; l++) {
      const d = cx.createImageData(W, H);
      let n = 0;
      for (let i = 0; i < N; i++) if (laag[i] === l) { n++; for (let k = 0; k < 4; k++) d.data[4 * i + k] = px[4 * i + k]; }
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      c.getContext('2d').putImageData(d, 0, 0);
      meesters[LAGEN[l]] = c; aantal[LAGEN[l]] = n;
    }
    // op elkaar gelegd moet het origineel eruit komen, pixel voor pixel
    const samen = document.createElement('canvas'); samen.width = W; samen.height = H;
    const sc = samen.getContext('2d');
    LAGEN.forEach(l => sc.drawImage(meesters[l], 0, 0));
    const terug = sc.getImageData(0, 0, W, H).data;
    let verschil = 0;
    for (let i = 0; i < 4 * N; i++) verschil = Math.max(verschil, Math.abs(terug[i] - px[i]));
    // een controlebeeld: elke laag in zijn eigen kleur over een donker origineel
    const KLEUR = LAGEN.map((l, i) => l === 'zwaai' ? [150, 70, 200] : l === 'ster' ? [255, 200, 0]
      : [[255, 60, 60], [60, 200, 60], [60, 140, 255], [255, 120, 200]][i % 4]);
    const ctl = cx.createImageData(W, H);
    for (let i = 0; i < N; i++) {
      const c = KLEUR[laag[i]], a = px[4 * i + 3] / 255;
      for (let k = 0; k < 3; k++) ctl.data[4 * i + k] = (px[4 * i + k] * .45 + c[k] * .55) * a;
      ctl.data[4 * i + 3] = 255;
    }
    const cc = document.createElement('canvas'); cc.width = W; cc.height = H;
    cc.getContext('2d').putImageData(ctl, 0, 0);
    /* Het blad voor de app. Elke laag wordt eerst op volle logomaat verkleind
       (1080 breed, zoals wordmark.webp), en dan gaat alleen de rechthoek waar
       echt iets staat het blad in -- pixel voor pixel, niet nog eens geschaald.
       Veertien volle lagen onder elkaar was 1080x5040: 22 MB zodra de browser
       het uitpakt, op een oude tablet te veel en te traag om op te wachten.
       Tussen twee stukken blijft TUSSEN pixels leeg, zodat een browser die het
       blad schaalt nooit de rand van de buurman meeneemt. */
    const h = Math.round(BREED * H / W), TUSSEN = 2;
    const stukken = LAGEN.map(l => {
      const c = document.createElement('canvas'); c.width = BREED; c.height = h;
      const cc2 = c.getContext('2d'); cc2.imageSmoothingQuality = 'high';
      cc2.drawImage(meesters[l], 0, 0, BREED, h);
      const d = cc2.getImageData(0, 0, BREED, h).data;
      let x0 = BREED, y0 = h, x1 = 0, y1 = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < BREED; x++) if (d[4 * (y * BREED + x) + 3]) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      return { l, c, x0, y0, x1: x1 + 1, y1: y1 + 1, w: x1 + 1 - x0, hh: y1 + 1 - y0 };
    });
    // op planken, de hoogste eerst
    let px0 = 0, py0 = 0, plank = 0;
    [...stukken].sort((a, b) => b.hh - a.hh).forEach(s => {
      if (px0 + s.w > BREED) { py0 += plank + TUSSEN; px0 = 0; plank = 0; }
      s.ax = px0; s.ay = py0; px0 += s.w + TUSSEN; plank = Math.max(plank, s.hh);
    });
    const blad = document.createElement('canvas'); blad.width = BREED; blad.height = py0 + plank;
    const bc = blad.getContext('2d');
    stukken.forEach(s => bc.drawImage(s.c, s.x0, s.y0, s.w, s.hh, s.ax, s.ay, s.w, s.hh));
    // en terug: de stukken op hun plek moeten precies de verkleinde lagen zijn
    const heel = document.createElement('canvas'); heel.width = BREED; heel.height = h;
    const terugC = document.createElement('canvas'); terugC.width = BREED; terugC.height = h;
    stukken.forEach(s => {
      heel.getContext('2d').drawImage(s.c, 0, 0);
      terugC.getContext('2d').drawImage(blad, s.ax, s.ay, s.w, s.hh, s.x0, s.y0, s.w, s.hh);
    });
    const hd = heel.getContext('2d').getImageData(0, 0, BREED, h).data, td = terugC.getContext('2d').getImageData(0, 0, BREED, h).data;
    let bladVerschil = 0;
    for (let i = 0; i < hd.length; i++) bladVerschil = Math.max(bladVerschil, Math.abs(hd[i] - td[i]));
    const delen = stukken.map(s => [s.l, s.x0, s.y0, s.x1, s.y1, s.ax, s.ay]);
    return {
      W, H, h, kernen, aantal, verschil, vak, delen, bladVerschil, bladMaat: [blad.width, blad.height],
      meesters: Object.fromEntries(LAGEN.map(l => [l, meesters[l].toDataURL('image/png')])),
      controle: cc.toDataURL('image/png'),
      blad: blad.toDataURL('image/webp', KWAL),
    };
  }, { bron, LAGEN, KERNEN, RAND, BREED, KWAL });
  await browser.close();

  console.log(`meester ${uit.W}x${uit.H}`);
  LAGEN.forEach((l, i) => {
    const kb = naarBestand(uit.meesters[l], path.join(MEESTERS, l + '.png'));
    console.log(`  ${l.padEnd(8)} ${String(uit.kernen[i]).padStart(2)} kern(en)  ${String(uit.aantal[l]).padStart(8)} px  ${kb} kB`);
  });
  naarBestand(uit.controle, path.join(MEESTERS, 'controle.png'));
  const kb = naarBestand(uit.blad, UIT);
  console.log(`blad ${uit.bladMaat.join('x')} (${LAGEN.length} stukken, uitgepakt ${(uit.bladMaat[0] * uit.bladMaat[1] * 4 / 1e6).toFixed(1)} MB) -> ${path.relative(WORTEL, UIT)}  ${kb} kB`);
  console.log(`de stukken terug op hun plek: grootste afwijking ${uit.bladVerschil} (van 255)`);
  if (uit.bladVerschil > 0) { console.log('FOUT: het blad geeft de lagen niet precies terug'); process.exitCode = 1; }
  console.log(`op elkaar gelegd: grootste afwijking van het origineel ${uit.verschil} (van 255)`);
  const zonderKern = LAGEN.filter((l, i) => l !== 'zwaai' && !uit.kernen[i]);
  if (uit.verschil > 0 || zonderKern.length) {
    console.log('FOUT: ' + (zonderKern.length ? 'geen kern voor ' + zonderKern.join(', ') : 'de lagen zijn samen niet het origineel'));
    process.exitCode = 1;
  }
  // oude meesters van lagen die niet meer bestaan opruimen
  for (const f of fs.readdirSync(MEESTERS)) {
    if (f.endsWith('.png') && f !== 'controle.png' && !LAGEN.includes(f.slice(0, -4))) fs.unlinkSync(path.join(MEESTERS, f));
  }
  // de tabel die de app en het filmpje gebruiken: de maat van het blad, en per laag
  // [naam, x0, y0, x1, y1, bx, by] -- waar hij in het logo staat, en waar in het blad
  const regel = 'const LOGO_DELEN = ' + JSON.stringify({ blad: uit.bladMaat, delen: uit.delen }) + ';';
  for (const bestand of ['src/20-app.js', 'promo/promo.html']) {
    const tekst = fs.readFileSync(path.join(WORTEL, bestand), 'utf8');
    if (tekst.includes(regel)) console.log(`${bestand}: LOGO_DELEN klopt`);
    else { console.log(`FOUT: ${bestand} heeft niet de LOGO_DELEN van dit blad. Zet deze regel erin:\n${regel}`); process.exitCode = 1; }
  }
})();
