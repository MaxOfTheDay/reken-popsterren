/*
 * Beeldverschil: welke schermen ziet een kind anders na deze wijziging?
 *
 *   node test/beeldverschil.js shots/voor shots/na shots/verschil
 *
 * Waarom: in het stijlblad is de volgorde de cascade (CLAUDE.md regel 0). Een
 * regel verhangen of een maat bijzetten breekt niets en geen enkele test valt
 * om -- er ziet alleen iets er anders uit, op een scherm waar niemand keek. Dit
 * legt de opnames van test/shots.js (voor en na, allebei met --vast) naast
 * elkaar en zegt welke schermen veranderd zijn, en hoeveel.
 *
 * Het blokkeert niets: een verandering die je bedoelde is goed. Het maakt een
 * verandering die niemand bedoelde zichtbaar. In verschil/ komt per veranderd
 * scherm één beeld: voor | na | het verschil in rood. Op GitHub staat de lijst
 * in de samenvatting van de job en de beelden in het artefact "beeldverschil"
 * (zie .github/workflows/keuring.yml).
 *
 * Vergeleken in Chromium zelf (canvas, getImageData): geen pngjs of pixelmatch
 * erbij -- de enige afhankelijkheid blijft Playwright, die er voor de tests al is.
 */
const fs = require('fs');
const path = require('path');
const { launch } = require('./browser.js');

// Een pixel telt als anders boven deze kanaalafwijking (van 255): kleiner is
// afronding in het tekenen (verloop, de rand van een letter), geen wijziging.
const DREMPEL = 40;
// Een scherm telt als veranderd boven dit deel van zijn pixels. Met --vast
// verschillen twee opnames van hetzelfde bestand op 0; dit vangt het laatste
// beetje ruis (een animatie die net op een ander beeldje stond).
const DEEL = 0.002;

const [voorDir, naDir, uitDir] = process.argv.slice(2).map(d => d && path.resolve(d));
if (!voorDir || !naDir || !uitDir) {
  console.log('gebruik: node test/beeldverschil.js <voor> <na> <uit>');
  process.exit(2);
}

const lijst = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).filter(f => f.endsWith('.png')).sort() : [];

(async () => {
  const voor = new Set(lijst(voorDir)), na = lijst(naDir);
  fs.mkdirSync(uitDir, { recursive: true });
  const browser = await launch();
  const page = await browser.newPage();
  await page.setContent('<canvas id="c"></canvas>');
  const uitslag = [];
  for (const f of na) {
    if (!voor.has(f)) { uitslag.push({ f, nieuw: true }); continue; }
    const data = p => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
    const r = await page.evaluate(async ({ a, b, DREMPEL }) => {
      const laad = src => new Promise((ok, mis) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mis; i.src = src; });
      const [ia, ib] = await Promise.all([laad(a), laad(b)]);
      const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
      const pix = img => { const c = new OffscreenCanvas(w, h), x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
      const pa = pix(ia), pb = pix(ib);
      const c = document.getElementById('c'); c.width = w * 3; c.height = h;
      const x = c.getContext('2d');
      x.drawImage(ia, 0, 0); x.drawImage(ib, w, 0);
      const d = x.createImageData(w, h);
      let anders = 0;
      for (let i = 0; i < pa.length; i += 4) {
        const v = Math.max(Math.abs(pa[i] - pb[i]), Math.abs(pa[i + 1] - pb[i + 1]), Math.abs(pa[i + 2] - pb[i + 2]));
        const grijs = (pb[i] + pb[i + 1] + pb[i + 2]) / 9;   // het nieuwe beeld, gedimd, als ondergrond
        if (v > DREMPEL) { anders++; d.data.set([255, 40, 70, 255], i); }
        else d.data.set([grijs, grijs, grijs, 255], i);
      }
      x.putImageData(d, w * 2, 0);
      return { deel: anders / (w * h), beeld: anders ? c.toDataURL('image/png') : null };
    }, { a: data(path.join(voorDir, f)), b: data(path.join(naDir, f)), DREMPEL });
    uitslag.push({ f, deel: r.deel });
    if (r.deel > DEEL) {
      const doel = path.join(uitDir, f);
      fs.mkdirSync(path.dirname(doel), { recursive: true });
      fs.writeFileSync(doel, Buffer.from(r.beeld.split(',')[1], 'base64'));
    }
  }
  for (const f of voor) if (!na.includes(f)) uitslag.push({ f, weg: true });
  await browser.close();

  const veranderd = uitslag.filter(u => u.nieuw || u.weg || u.deel > DEEL);
  const pct = d => (d * 100).toFixed(d < 0.01 ? 2 : 1) + '%';
  const regels = veranderd.length
    ? ['| scherm | verschil |', '|---|---|', ...veranderd.map(u => `| ${u.f.replace(/\.png$/, '')} | ${u.nieuw ? 'nieuw scherm' : u.weg ? 'scherm weg' : pct(u.deel)} |`)]
    : ['Geen enkel scherm ziet er anders uit.'];
  const tekst = [`### Beeldverschil: ${veranderd.length} van ${uitslag.length} schermen anders`, '', ...regels, '',
    veranderd.length ? 'Voor, na en het verschil (rood) staan in het artefact **beeldverschil**. Klopt elk veranderd scherm met wat deze PR wil? Dan is het goed.' : ''].join('\n');
  fs.writeFileSync(path.join(uitDir, 'samenvatting.md'), tekst + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, tekst + '\n');
  console.log(tekst);
})().catch(e => { console.error(e); process.exit(1); });
