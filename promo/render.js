/*
 * Maakt van promo/promo.html een mp4, beeld voor beeld.
 *
 *   node promo/render.js                 -> promo/rekensterren-promo.mp4 (heel het filmpje)
 *   node promo/render.js logo 0 8        -> promo/rekensterren-logo.mp4  (alleen het logo)
 *   node promo/render.js promo-staand    -> promo/rekensterren-promo-staand.mp4 (staand)
 *
 * Elke keer komen er twee bestanden uit:
 *   rekensterren-<naam>-hoog.mp4   volle maat (1920x1080 of 1080x1920), scherp: om
 *                                  te posten op sociale media. Staat NIET in git
 *                                  (.gitignore) -- bewaar hem zelf.
 *   rekensterren-<naam>.mp4        de webversie voor de over-pagina: dezelfde maat,
 *                                  sterker samengeperst, onder de 4,5 MB die
 *                                  inhoud zaak M toelaat (telefoondata van een
 *                                  ouder). Volle maat bij een hogere crf is
 *                                  scherper dan 720p bij een lage: op een telefoon
 *                                  (3x zo veel pixels per punt) was 720p wazig.
 *                                  Deze staat wel in git en wordt uitgeleverd.
 * Allebei 60 beelden per seconde: bij 30 hakte de draaiende ster zichtbaar.
 * De beelden gaan als png naar ffmpeg, niet als jpeg: anders werd elk beeld twee
 * keer samengeperst, en dat zag je als blokjes in het donkere paars. aq-mode=3
 * geeft de donkere verlopen meer bits, tegen strepen in de lucht.
 *
 * Een naam met "staand" erin geeft het staande filmpje: promo.html?staand, voor
 * telefoons en verhalen/status op sociale media.
 *
 * promo.html tekent alles als functie van de tijd (render(t)), dus hier wordt
 * niet gefilmd maar per beeld een tijdstip gezet en een schermafdruk gemaakt.
 * Zo haperen er geen beeldjes, hoe traag de machine ook is.
 *
 * Nodig: Playwright (zoals voor de browsertests) en een ffmpeg met libx264.
 * Staat ffmpeg niet op het pad, wijs hem dan aan met FFMPEG=/pad/naar/ffmpeg.
 */
const path = require('path');
const { spawn } = require('child_process');
const { launch } = require('../test/browser.js');

// zonder 'tot' loopt hij tot het eind: DUUR uit promo.html
const [naam = 'promo', van = '0', totArg] = process.argv.slice(2);
// 60 beelden per seconde: bij 30 hakte de draaiende ster zichtbaar
const FPS = +process.env.FPS || 60;
const OUT = path.join(__dirname, `rekensterren-${naam}.mp4`);
const HOOG = path.join(__dirname, `rekensterren-${naam}-hoog.mp4`);
const STAAND = /staand/.test(naam);
const [W, H] = STAAND ? [1080, 1920] : [1920, 1080];
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const WEB_CRF = '27';
const HOOG_CRF = '14';
const X264 = 'aq-mode=3';

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const fouten = [];
  page.on('pageerror', e => fouten.push(e.message));
  await page.goto('file://' + path.join(__dirname, 'promo.html') + '?opname' + (STAAND ? '&staand' : ''));
  // alle beelden en werelden vooraf laden, anders mist er een frame bij het wisselen
  await page.evaluate(async () => {
    await document.fonts.ready;
    const srcs = [...document.querySelectorAll('img')].map(i => i.src)
      .concat(SCHERMEN.map(s => `beelden/${s.img}.jpg`).concat(['beelden/02-kaart.jpg']))
      .concat((window.WERELDEN || []).map(w => '../' + w.art))
      .concat(['../assets/branding/logo-lagen.webp']);   // het logo in lagen staat als achtergrond, niet als <img>
    window.__vast = await Promise.all(srcs.map(s => new Promise(ok => {
      const im = new Image(); im.onload = im.onerror = () => ok(im); im.src = s;
    })));
  });

  const ff = spawn(FFMPEG, ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS),
    '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', HOOG_CRF, '-tune', 'animation', '-x264-params', X264,
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', HOOG], { stdio: ['pipe', 'inherit', 'inherit'] });

  const tot = totArg != null ? +totArg : await page.evaluate(() => window.DUUR);
  const eerste = Math.round(+van * FPS), laatste = Math.round(tot * FPS);
  for (let f = eerste; f < laatste; f++) {
    await page.evaluate(async t => {
      render(t);
      await Promise.all([...document.images].map(i => i.complete ? 0 : i.decode().catch(() => 0)));
    }, f / FPS);
    const beeld = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(beeld)) await new Promise(ok => ff.stdin.once('drain', ok));
    if (f % FPS === 0) process.stdout.write('.');
  }
  ff.stdin.end();
  await new Promise(ok => ff.on('close', ok));
  await browser.close();
  // de webversie: volle maat, sterker samengeperst dan de hoge
  const web = spawn(FFMPEG, ['-loglevel', 'error', '-y', '-i', HOOG,
    '-c:v', 'libx264', '-preset', 'veryslow', '-crf', WEB_CRF, '-tune', 'animation', '-x264-params', X264,
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  await new Promise(ok => web.on('close', ok));
  console.log(`\n${laatste - eerste} beelden -> ${HOOG}\n  webversie -> ${OUT}`);
  if (fouten.length) { console.log('Fouten in de pagina:\n  ' + fouten.join('\n  ')); process.exitCode = 1; }
})();
