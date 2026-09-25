/*
 * Maakt van promo/promo.html een mp4, beeld voor beeld.
 *
 *   node promo/render.js                 -> promo/rekensterren-promo.mp4 (25 s)
 *   node promo/render.js logo 0 8        -> promo/rekensterren-logo.mp4  (alleen het logo)
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

const [naam = 'promo', van = '0', tot = '26'] = process.argv.slice(2);
const FPS = 30;
const OUT = path.join(__dirname, `rekensterren-${naam}.mp4`);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const fouten = [];
  page.on('pageerror', e => fouten.push(e.message));
  await page.goto('file://' + path.join(__dirname, 'promo.html') + '?opname');
  // alle beelden en werelden vooraf laden, anders mist er een frame bij het wisselen
  await page.evaluate(async () => {
    await document.fonts.ready;
    const srcs = [...document.querySelectorAll('img')].map(i => i.src)
      .concat(['01-profielkeuze', '02-kaart', '04-show-rekenen', '05-einde', '06-kleedkamer', '02b-tournee'].map(n => `beelden/${n}.jpg`))
      .concat((window.WERELDEN || []).map(w => '../' + w.art))
      .concat(['../assets/branding/logo-lagen.webp']);   // het logo in lagen staat als achtergrond, niet als <img>
    window.__vast = await Promise.all(srcs.map(s => new Promise(ok => {
      const im = new Image(); im.onload = im.onerror = () => ok(im); im.src = s;
    })));
  });

  const ff = spawn(FFMPEG, ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS),
    '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-tune', 'animation',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });

  const eerste = Math.round(+van * FPS), laatste = Math.round(+tot * FPS);
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
  console.log(`\n${laatste - eerste} beelden -> ${OUT}`);
  if (fouten.length) { console.log('Fouten in de pagina:\n  ' + fouten.join('\n  ')); process.exitCode = 1; }
})();
