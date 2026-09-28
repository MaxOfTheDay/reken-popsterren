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
 *   rekensterren-<naam>.mp4        de webversie voor de over-pagina: 720p, zodat
 *                                  hij op een telefoon met mobiele data vlot laadt.
 *                                  Deze staat wel in git en wordt uitgeleverd.
 * Allebei 60 beelden per seconde: bij 30 hakte de draaiende ster zichtbaar, dus
 * de webversie wint zijn kilobytes op de maat en niet op het aantal beelden.
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
const WEB_CRF = '23';

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
    '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-tune', 'animation',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', HOOG], { stdio: ['pipe', 'inherit', 'inherit'] });

  const tot = totArg != null ? +totArg : await page.evaluate(() => window.DUUR);
  const eerste = Math.round(+van * FPS), laatste = Math.round(tot * FPS);
  for (let f = eerste; f < laatste; f++) {
    await page.evaluate(async t => {
      render(t);
      await Promise.all([...document.images].map(i => i.complete ? 0 : i.decode().catch(() => 0)));
    }, f / FPS);
    const beeld = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(beeld)) await new Promise(ok => ff.stdin.once('drain', ok));
    if (f % FPS === 0) process.stdout.write('.');
  }
  ff.stdin.end();
  await new Promise(ok => ff.on('close', ok));
  await browser.close();
  // de webversie: twee derde van de maat (1280x720 of 720x1280)
  const web = spawn(FFMPEG, ['-loglevel', 'error', '-y', '-i', HOOG, '-vf', `scale=${W * 2 / 3}:${H * 2 / 3}:flags=lanczos`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', WEB_CRF, '-tune', 'animation',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  await new Promise(ok => web.on('close', ok));
  console.log(`\n${laatste - eerste} beelden -> ${HOOG}\n  webversie -> ${OUT}`);
  if (fouten.length) { console.log('Fouten in de pagina:\n  ' + fouten.join('\n  ')); process.exitCode = 1; }
})();
