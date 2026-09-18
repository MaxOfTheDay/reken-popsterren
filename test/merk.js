/*
 * Het merk: van meester naar bestand dat de app laadt.
 *
 *   npm run merk        -> schrijft de afgeleiden en zegt wat ze wegen
 *
 * Er zijn drie merkbeelden, en van elk één meester. Die meesters staan in
 * assets/branding/source/ en worden nooit aangeraakt: ze zijn de bron, ze zijn
 * groot, en ze gaan de app niet in. Wat de app wél laadt zijn de afgeleiden
 * hieronder -- op de maat waarop ze getoond worden, en geen pixel groter.
 *
 *   source/wordmark.webp  ->  assets/branding/wordmark.webp   het spelogo
 *   source/mark.webp      ->  assets/branding/mark.webp       de compacte R-ster
 *   source/appicon.webp   ->  icon-192.png, icon-512.png      het app-icoon
 *                             icon-maskable-512.png           idem, voor een launcher
 *
 * De iconen staan met opzet in de wortel en niet onder assets/: de servicewerker
 * behandelt álles onder /assets/ als tekening (voorraad-eerst, eigen cachenaam die
 * niet met een uitgave meegaat) en de iconen horen bij de schil. Zie sw.js.
 *
 * Omzetten gebeurt in een canvas in Chromium -- dezelfde weg die de wereldstudio
 * voor een wereldtekening gebruikt (zie verwerkBeeld in index.html). Dat scheelt
 * een beeldbibliotheek in een project dat met opzet geen bouwstap heeft: de enige
 * afhankelijkheid is de browser die de tests toch al starten.
 *
 * Er wordt NOOIT bijgesneden en nooit vervormd: de hoogte volgt uit de verhouding
 * van de meester. De enige uitzondering is het maskeerbare icoon, en die staat
 * hieronder uitgelegd.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const WORTEL = path.resolve(__dirname, '..');
const BRON = path.join(WORTEL, 'assets', 'branding', 'source');

/* merk   -- welk merkbeeld dit is. Drie meesters, vijf bestanden: de naam bindt
             ze bij elkaar, en de studio groepeert er zijn Merk-vak op.
   breed  -- de breedte van het afgeleide bestand; de hoogte volgt uit de meester.
   kwal   -- alleen voor webp (een palet-png kent geen kwaliteitsknop, zie onder).
   inzoom -- alleen het maskeerbare icoon: hoeveel er aan élke kant van de meester
             wegvalt voordat hij het vierkant vult.

   Waarom 1080 voor het logo: het staat op een telefoon op hooguit ~360 CSS-pixels
   breed, en drie keer dat is scherp genoeg voor het dichtste scherm dat er is.
   Groter is alleen meer bytes over de telefoondata van een gezin.

   Waarom 0.92 en niet zuiniger: dit is een logo met een verloop en een gloed, en
   daar zijn blokjes in een egaal vlak meteen te zien. De wereldtekeningen staan op
   0.82 -- die hebben ruis en detail om het in te verstoppen, een logo niet. */
const AFGELEID = [
  { bron: 'wordmark.webp', uit: 'assets/branding/wordmark.webp', breed: 1080, type: 'webp', kwal: 0.92,
    merk: 'Spelogo', wat: 'het spelogo op de sterrenkeuze' },
  { bron: 'mark.webp', uit: 'assets/branding/mark.webp', breed: 512, type: 'webp', kwal: 0.92,
    merk: 'Merkteken (R-ster)', wat: 'de compacte R-ster -- ligt klaar, nog nergens in gebruik' },
  { bron: 'appicon.webp', uit: 'icon-192.png', breed: 192, type: 'png',
    merk: 'App-icoon', wat: 'favicon, apple-touch-icon en het kleine manifest-icoon' },
  { bron: 'appicon.webp', uit: 'icon-512.png', breed: 512, type: 'png',
    merk: 'App-icoon', wat: 'het manifest-icoon (purpose any)' },
  /* Maskeerbaar: een launcher mag hier zelf een cirkel, een vierkant of een
     squircle uit knippen, en alles buiten de middelste 80% kan wegvallen. De
     R-ster van de meester reikt tot 64% van de ingeschreven cirkel -- die zit dus
     ruim binnen die veilige zone en hoeft niet verkleind te worden.

     Wat er wél moet: de meester heeft een dun zwart randje (~2,6%) en zwarte
     hoeken om zijn afgeronde vierkant heen. Onder een launchermasker blijft dat
     als een donkere kus langs de rand staan. Vandaar 6,5% eraf aan elke kant --
     net voorbij het punt waar de afronding van de meester ophoudt. Het zwart is
     weg, het paars loopt van rand tot rand, en de R-ster schuift daarmee naar 74%
     van de cirkel: nog altijd binnen de veilige 80%. */
  { bron: 'appicon.webp', uit: 'icon-maskable-512.png', breed: 512, type: 'png', inzoom: 0.065,
    merk: 'App-icoon', wat: 'het manifest-icoon (purpose maskable)' },
];

/* ---- Een png met een palet ------------------------------------------------
   Waarom dit hier staat en we niet gewoon canvas.toBlob('image/png') gebruiken:
   dat levert voor dit icoon 462 kB op, tegen 15 kB voor het vlakke icoon dat het
   vervangt. Het is een geschilderd beeld met een verloop, wolken en honderd
   sterretjes -- verliesloze RGBA comprimeert daar nauwelijks op. En deze
   bestanden staan in de ASSETS-lijst van de servicewerker: elk eerste bezoek
   betaalt ze, offline-first betekent hier ook meteen-binnenhalen.

   Met 256 kleuren uit het beeld zelf (mediaancut) wordt het 56 kB, en op
   icoonmaat is er geen verschil te zien. Bewust zónder dithering: dat kost 91 kB
   én het ziet er slechter uit -- de ruis die banding moet verbergen is op 512
   pixels zichtbaarder dan de banding zelf.

   Alleen voor ondoorzichtige beelden. Een png met alfa valt terug op de browser
   (zie schrijf); de twee merkbeelden mét doorzichtigheid zijn webp, dus in de
   praktijk komt dat niet voor.                                              */
function mediaanCut(px, n) {
  const idx = new Uint32Array(px.length / 3);
  for (let i = 0; i < idx.length; i++) idx[i] = i;
  // Per doos: waar loopt hij van waar tot waar, en langs welke as is hij het langst?
  function meet(b) {
    const r = [255, 0, 255, 0, 255, 0];
    for (let i = b.i0; i < b.i1; i++) {
      const p = idx[i] * 3;
      for (let k = 0; k < 3; k++) {
        const v = px[p + k];
        if (v < r[k * 2]) r[k * 2] = v;
        if (v > r[k * 2 + 1]) r[k * 2 + 1] = v;
      }
    }
    const sp = [r[1] - r[0], r[3] - r[2], r[5] - r[4]];
    b.span = Math.max(sp[0], sp[1], sp[2]);
    b.as = sp.indexOf(b.span);
    return b;
  }
  const dozen = [meet({ i0: 0, i1: px.length / 3 })];
  while (dozen.length < n) {
    // altijd de doos met de grootste kleurspreiding doormidden: die scheelt het meest
    let bi = -1, best = -1;
    for (let i = 0; i < dozen.length; i++) {
      const b = dozen[i];
      if (b.i1 - b.i0 > 1 && b.span > best) { best = b.span; bi = i; }
    }
    if (bi < 0) break;
    const b = dozen[bi], k = b.as;
    const gesorteerd = Array.from(idx.subarray(b.i0, b.i1)).sort((a, c) => px[a * 3 + k] - px[c * 3 + k]);
    idx.set(gesorteerd, b.i0);
    const mid = (b.i0 + b.i1) >> 1;
    dozen.splice(bi, 1, meet({ i0: b.i0, i1: mid }), meet({ i0: mid, i1: b.i1 }));
  }
  return dozen.map(b => {
    let r = 0, g = 0, bl = 0;
    for (let i = b.i0; i < b.i1; i++) { const p = idx[i] * 3; r += px[p]; g += px[p + 1]; bl += px[p + 2]; }
    const n = b.i1 - b.i0;
    return [Math.round(r / n), Math.round(g / n), Math.round(bl / n)];
  });
}

const CRC_TABEL = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function png(breed, hoog, indexen, palet) {
  // elke regel krijgt een filterbyte 0 ervoor: geen filter, want een palet-index
  // is geen getal om verschillen van te nemen
  const rij = breed + 1;
  const ruw = Buffer.alloc(rij * hoog);
  for (let y = 0; y < hoog; y++) indexen.copy(ruw, y * rij + 1, y * breed, (y + 1) * breed);
  function crc(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = CRC_TABEL[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  }
  function blok(soort, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const kop = Buffer.concat([Buffer.from(soort, 'latin1'), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(kop));
    return Buffer.concat([len, kop, c]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breed, 0); ihdr.writeUInt32BE(hoog, 4);
  ihdr[8] = 8;   // 8 bits per index
  ihdr[9] = 3;   // kleursoort 3 = palet
  const plte = Buffer.alloc(palet.length * 3);
  palet.forEach((c, i) => { plte[i * 3] = c[0]; plte[i * 3 + 1] = c[1]; plte[i * 3 + 2] = c[2]; });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    blok('IHDR', ihdr), blok('PLTE', plte),
    blok('IDAT', zlib.deflateSync(ruw, { level: 9 })),
    blok('IEND', Buffer.alloc(0)),
  ]);
}
function naarPalet(rgba, breed, hoog) {
  const n = breed * hoog;
  for (let i = 0; i < n; i++) if (rgba[i * 4 + 3] !== 255) return null;   // alfa: laat de browser het doen
  const px = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) { px[i * 3] = rgba[i * 4]; px[i * 3 + 1] = rgba[i * 4 + 1]; px[i * 3 + 2] = rgba[i * 4 + 2]; }
  const palet = mediaanCut(px, 256);
  const ind = Buffer.alloc(n);
  for (let i = 0; i < n; i++) {
    const r = px[i * 3], g = px[i * 3 + 1], b = px[i * 3 + 2];
    let bi = 0, bd = Infinity;
    for (let k = 0; k < palet.length; k++) {
      const p = palet[k];
      const d = (p[0] - r) * (p[0] - r) + (p[1] - g) * (p[1] - g) + (p[2] - b) * (p[2] - b);
      if (d < bd) { bd = d; bi = k; }
    }
    ind[i] = bi;
  }
  return png(breed, hoog, ind, palet);
}

/* ---- Het omzetwerk zelf ---------------------------------------------------
   Staat als tekst in de pagina en niet als Node-code: een canvas bestaat alleen
   in de browser. Terug komen de maten plus óf een kant-en-klaar bestand (webp)
   óf de kale pixels (png, die hierboven een palet krijgen). */
async function teken(pagina, uri, breed, type, kwal, inzoom) {
  return pagina.evaluate(async ({ uri, breed, type, kwal, inzoom }) => {
    const img = await new Promise((ja, nee) => {
      const i = new Image();
      i.onload = () => ja(i);
      i.onerror = () => nee(new Error('kon de meester niet inlezen'));
      i.src = uri;
    });
    const bw = img.naturalWidth, bh = img.naturalHeight, z = inzoom || 0;
    // het stuk van de meester dat we overnemen: alles, tenzij er ingezoomd wordt
    const sx = bw * z, sy = bh * z, sw = bw * (1 - 2 * z), sh = bh * (1 - 2 * z);
    const c = document.createElement('canvas');
    c.width = breed;
    c.height = Math.round(breed * sh / sw);     // de verhouding van de meester, nooit vervormd
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    if (type === 'png') {
      return { maat: [c.width, c.height], rgba: [...g.getImageData(0, 0, c.width, c.height).data] };
    }
    const blob = await new Promise(r => c.toBlob(r, 'image/webp', kwal));
    return { maat: [c.width, c.height], bytes: [...new Uint8Array(await blob.arrayBuffer())] };
  }, { uri, breed, type, kwal, inzoom });
}

/* Wat er van de iconen op schijf ligt, en hoe zwaar. De wandeling die de studio
   over assets/ doet (test/werelden.js) ziet ze niet: de iconen staan met opzet in
   de wortel. Op naam en niet op een lijstje -- icon-*.png in de wortel is de
   afspraak, en de tabel hierboven maakt ze volgens diezelfde afspraak. */
function iconenOpSchijf(uit) {
  for (const naam of fs.readdirSync(WORTEL)) {
    if (!/^icon-.*\.png$/.test(naam)) continue;
    uit[naam] = Math.round(fs.statSync(path.join(WORTEL, naam)).size / 1024);
  }
  return uit;
}

/* De tabel is ook van buiten te lezen: de wereldstudio toont in het Beelden-tabblad
   welke merkbestanden er vandaag zijn, en die lijst hoort niet op twee plekken te
   staan (zie test/preview.js, window.__MERK). Alleen omzetten start een browser --
   vandaar dat require('./browser.js') hieronder staat en niet bovenaan. */
module.exports = { AFGELEID, BRON, WORTEL, iconenOpSchijf };

if (require.main !== module) return;

(async () => {
  const { launch } = require('./browser.js');
  const browser = await launch();
  const pagina = await (await browser.newContext()).newPage();
  await pagina.goto('about:blank');
  let stuk = 0;
  for (const d of AFGELEID) {
    const doel = path.join(WORTEL, d.uit);
    try {
      const uri = 'data:image/webp;base64,' + fs.readFileSync(path.join(BRON, d.bron)).toString('base64');
      const r = await teken(pagina, uri, d.breed, d.type, d.kwal, d.inzoom);
      let buf;
      if (d.type === 'png') {
        const rgba = Uint8Array.from(r.rgba);
        buf = naarPalet(rgba, r.maat[0], r.maat[1]);
        if (!buf) throw new Error('doorzichtigheid in een png — palet kan niet, maak er webp van');
      } else {
        buf = Buffer.from(r.bytes);
      }
      fs.mkdirSync(path.dirname(doel), { recursive: true });
      fs.writeFileSync(doel, buf);
      console.log(d.uit.padEnd(32) + r.maat.join('×').padEnd(10)
        + (Math.round(buf.length / 1024) + ' kB').padStart(7) + '   ' + d.wat);
    } catch (e) {
      stuk++;
      console.log(d.uit.padEnd(32) + 'MISLUKT: ' + e.message);
    }
  }
  await browser.close();
  process.exit(stuk ? 1 : 0);
})();
