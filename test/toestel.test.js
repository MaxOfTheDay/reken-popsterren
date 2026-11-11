/*
 * Toestel: wat het toestel stil laat mislukken, moet je zien of horen.
 *
 * Het spel leunt op dingen die het niet zelf in de hand heeft: de stem van het
 * toestel, de geluidsuitgang, de opslag, de voorraad voor zonder net, het scherm
 * wakker houden. Elk daarvan kan weigeren zonder één fout te gooien -- de
 * spraakdienst van Android die zwijgt terwijl Sonos de uitvoer vasthoudt, een
 * browser die niets laat bewaren -- en dan lijkt het spel stuk terwijl elke
 * andere suite slaagt. Hier wordt elk van die gedragingen nagebootst in een echte
 * Chromium, en per rij gecontroleerd dat:
 *   - het spel niet omvalt (geen javascript-fout), en
 *   - er een teken is: iets in beeld (de 🔇, een toast, een rij bij Voor ouders),
 *     een briefje voor de foutmelder (de zondagrapportage), of allebei.
 *
 * DE TABEL IS DE REGEL. Bovenaan staat elke toestelfunctie die het spel kan
 * gebruiken (TOESTEL), met de rij(en) van deze suite die haar weigering
 * nabootsen. Gebruikt src/ een functie uit die lijst zonder rij, dan valt deze
 * suite om nog vóór er een browser start: wie iets nieuws van het toestel vraagt,
 * zet hier eerst neer wat er gebeurt als het toestel nee zegt. Een functie die
 * stil mag mislukken (trillen: het toestel beslist) krijgt een rij die alleen
 * nakijkt dat er niets omvalt -- en zegt in `stil` waarom dat goed is.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { launch, cacheFonts, APP_URL } = require('./browser');

const WORTEL = path.resolve(__dirname, '..');
const counts = {};
const fails = [];
function check(ok, label, detail) {
  counts[label] = counts[label] || { pass: 0, fail: 0 };
  if (ok) counts[label].pass++;
  else { counts[label].fail++; if (fails.length < 40) fails.push(`${label}: ${detail}`); }
}

/* ---- De lijst: toestelfunctie -> de rijen die haar weigering nabootsen ---- */
const TOESTEL = [
  { naam: 'spraak',         zoek: /speechSynthesis/,                 rijen: ['stem weigert', 'stem begint niet', 'geen spraak'] },
  { naam: 'geluid',         zoek: /AudioContext/,                    rijen: ['klank blijft liggen'] },
  { naam: 'opslag',         zoek: /localStorage/,                    rijen: ['opslag dicht'] },
  { naam: 'sessieopslag',   zoek: /sessionStorage/,                  rijen: ['opslag dicht'] },
  { naam: 'voorraad',       zoek: /serviceWorker/,                   rijen: ['voorraad geweigerd'] },
  { naam: 'wakker houden',  zoek: /wakeLock/,                        rijen: ['wakker geweigerd'] },
  { naam: 'trillen',        zoek: /navigator\.vibrate/,              rijen: ['geen trilmotor'] },
  { naam: 'klembord',       zoek: /navigator\.clipboard/,            rijen: ['geen klembord of delen'] },
  { naam: 'delen',          zoek: /navigator\.share/,                rijen: ['geen klembord of delen'] },
  { naam: 'opslag houden',  zoek: /navigator\.storage/,              rijen: ['opslag dicht'] },
  // nog niet gebruikt; staat hier zodat de eerste die het gebruikt een rij moet maken
  { naam: 'indexeddb',      zoek: /indexedDB/,                       rijen: [] },
  { naam: 'meldingen',      zoek: /\bNotification\b/,                rijen: [] },
  { naam: 'camera/micro',   zoek: /getUserMedia/,                    rijen: [] },
  { naam: 'volledig scherm', zoek: /requestFullscreen/,              rijen: [] },
  { naam: 'draaien',        zoek: /orientation\.lock/,               rijen: [] },
  { naam: 'plaats',         zoek: /geolocation/,                     rijen: [] },
  { naam: 'spraakherkenning', zoek: /SpeechRecognition/,             rijen: [] },
  { naam: 'geluidssessie',  zoek: /navigator\.audioSession/,         rijen: [] },
];

/* ---- Zaak A: elke gebruikte toestelfunctie heeft een rij (kaal Node) ---- */
const RIJEN = {};   // naam -> async functie(browser), hieronder gevuld
const bron = fs.readdirSync(path.join(WORTEL, 'src'))
  .filter(n => n.endsWith('.js') && !n.startsWith('90-'))   // de wereldstudio draait nooit bij een kind
  .map(n => ({ n, tekst: fs.readFileSync(path.join(WORTEL, 'src', n), 'utf8') }));
const gebruikt = new Set();
for (const t of TOESTEL) {
  const waar = bron.filter(b => t.zoek.test(b.tekst)).map(b => b.n);
  if (!waar.length) continue;
  gebruikt.add(t.naam);
  check(t.rijen.length > 0, 'A: elke toestelfunctie die het spel gebruikt heeft een rij',
    `${t.naam} staat in ${waar.join(', ')} maar heeft geen rij in test/toestel.test.js -- wat ziet een kind als het toestel nee zegt?`);
}

/* ---- Hulp ---- */
const VOLG = () => {
  // de foutmelder staat onder ?debug uit; hier lezen we mee wat hij zou sturen
  window.__meld = [];
  window.meldFout = m => { window.__meld.push(String(m)); };
};
const TELSTER = () => {
  db.sound = true;
  db.profiles.t1 = defaultProfile('Telster', 'dress_roze', { ...COUNT_OPTS, hair: 'hair_blond' });
  db.profiles.t1.order = 0;
  const p = db.profiles.t1;
  p.settings.track = 'count';
  p.settings.stage = 1; p.settings.stageMax = COUNT_STAGE_MAX; p.settings.qmax = 10;
  save(); renderProfiles(); selectProfile('t1');
};
async function pagina(browser, init, url) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true });
  const pg = await ctx.newPage();
  await cacheFonts(pg);
  const fouten = [];
  pg.on('pageerror', e => fouten.push(e.message));
  await pg.addInitScript(VOLG);
  if (init) await pg.addInitScript(init);
  await pg.goto(url || APP_URL);
  await pg.waitForTimeout(400);
  await pg.evaluate(VOLG);   // na het laden nog eens: meldFout is dan de echte
  return { ctx, pg, fouten };
}
async function tik(pg, sel) {
  const b = await pg.locator(sel).boundingBox();
  await pg.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
}
async function telShow(pg) {
  await pg.evaluate(TELSTER);
  await pg.waitForTimeout(250);
  await tik(pg, '.tour-stop.next');
  await pg.waitForFunction(() => typeof G !== 'undefined' && G && G.count && G.qs[G.idx], null, { timeout: 5000 });
}
const stand = pg => pg.evaluate(() => ({
  knop: $('btn-replay').textContent, meld: window.__meld,
  notice: $('confirm-modal').classList.contains('open') ? $('confirm-body').textContent : null,
}));
function geenFout(label, fouten) { check(fouten.length === 0, label + ': geen javascript-fout', fouten.join(' | ')); }

/* ---- De rijen ---- */

RIJEN['stem weigert'] = async browser => {
  const { ctx, pg, fouten } = await pagina(browser, () => {
    document.addEventListener('DOMContentLoaded', () => {
      speechSynthesis.speak = u => setTimeout(() => u.onerror && u.onerror({ error: 'synthesis-failed' }), 30);
    });
  });
  await telShow(pg);
  await pg.waitForTimeout(800);
  const s = await stand(pg);
  check(s.knop === '🔇', 'stem weigert: de 🔊 wordt een 🔇', JSON.stringify(s));
  check(s.meld.some(m => /^stem: synthesis-failed/.test(m)), 'stem weigert: briefje voor de foutmelder', JSON.stringify(s.meld));
  geenFout('stem weigert', fouten);
  await ctx.close();
};

RIJEN['stem begint niet'] = async browser => {
  // neemt de zin aan, en dan niets: geen begin, geen einde, geen fout
  const { ctx, pg, fouten } = await pagina(browser, () => {
    document.addEventListener('DOMContentLoaded', () => { speechSynthesis.speak = () => {}; });
  });
  await telShow(pg);
  await pg.waitForTimeout(1500);
  check((await stand(pg)).knop === '🔊', 'stem begint niet: één trage zin geeft nog geen 🔇', '');
  await tik(pg, '#btn-replay');   // tweede zin
  await pg.waitForTimeout(4600);
  const s = await stand(pg);
  check(s.knop === '🔇', 'stem begint niet: na twee zinnen zonder begin een 🔇', JSON.stringify(s));
  check(s.meld.includes('stem: begint niet'), 'stem begint niet: briefje voor de foutmelder', JSON.stringify(s.meld));
  // en begint er toch weer een zin, dan staat de 🔊 terug
  await pg.evaluate(() => {
    speechSynthesis.speak = u => setTimeout(() => u.onstart && u.onstart(), 10);
    closeConfirmModal(); leesVraagOpnieuw();
  });
  await pg.waitForTimeout(200);
  check((await stand(pg)).knop === '🔊', 'stem begint niet: een zin die begint zet de 🔊 terug', '');
  geenFout('stem begint niet', fouten);
  await ctx.close();
};

RIJEN['geen spraak'] = async browser => {
  const { ctx, pg, fouten } = await pagina(browser, () => {
    delete Window.prototype.speechSynthesis; delete window.speechSynthesis;
  });
  await telShow(pg);
  await pg.waitForTimeout(1500);   // de show is open en de vraag staat (zoals bij 'stem begint niet')
  let s = await stand(pg);
  check(s.knop === '🔇', 'geen spraak: meteen een 🔇 in plaats van een 🔊 die niets doet', JSON.stringify(s));
  check(s.meld.includes('stem: geen spraak'), 'geen spraak: briefje voor de foutmelder', JSON.stringify(s.meld));
  await tik(pg, '#btn-replay');
  await pg.waitForTimeout(300);
  s = await stand(pg);
  check(/browser/.test(s.notice || ''), 'geen spraak: de 🔇 zegt dat het aan de browser ligt', JSON.stringify(s));
  geenFout('geen spraak', fouten);
  await ctx.close();
};

RIJEN['klank blijft liggen'] = async browser => {
  // de context staat na elke tik nog stil: resume lukt "wel", maar er gebeurt niets
  const { ctx, pg, fouten } = await pagina(browser, () => {
    AudioContext.prototype.resume = function () { return Promise.resolve(); };
    Object.defineProperty(AudioContext.prototype, 'state', { get() { return 'suspended'; }, configurable: true });
    window.__contexten = 0;
    const Echt = window.AudioContext;
    window.AudioContext = function () { window.__contexten++; return new Echt(); };
  });
  await pg.evaluate(TELSTER);
  await pg.evaluate(() => audioBus());
  await tik(pg, '.tour-stop.next');
  await pg.waitForTimeout(1300);
  const eerst = await pg.evaluate(() => window.__contexten);
  check(eerst >= 2, 'klank blijft liggen: na een tik één keer een nieuwe context', 'contexten: ' + eerst);
  await pg.touchscreen.tap(20, 400);
  await pg.waitForTimeout(1300);
  const s = await pg.evaluate(() => ({ meld: window.__meld, n: window.__contexten }));
  check(s.meld.some(m => /^klank: /.test(m)), 'klank blijft liggen: blijft ook de nieuwe liggen, dan een briefje', JSON.stringify(s));
  check(s.n === eerst, 'klank blijft liggen: niet bij elke tik weer een nieuwe', JSON.stringify(s));
  geenFout('klank blijft liggen', fouten);
  await ctx.close();
};

RIJEN['opslag dicht'] = async browser => {
  // Safari "Blokkeer alle cookies", Chrome "Sites mogen geen gegevens opslaan"
  const dicht = () => {
    const nee = { get() { throw new DOMException('The operation is insecure.', 'SecurityError'); } };
    Object.defineProperty(window, 'localStorage', nee);
    Object.defineProperty(window, 'sessionStorage', nee);
  };
  const { ctx, pg, fouten } = await pagina(browser, dicht, APP_URL.replace('?debug', '?debug&geen'));
  check(await pg.evaluate(() => !!document.querySelector('.screen.active')), 'opslag dicht: het spel start', '');
  await pg.evaluate(() => { db.profiles.t1 = defaultProfile('Mila', 'dress_roze', COUNT_OPTS); db.profiles.t1.order = 0; save(); renderProfiles(); });
  await pg.waitForTimeout(200);
  const s = await pg.evaluate(() => ({ toast: $('toast').innerText, meld: window.__meld }));
  check(/Opslaan lukt niet/.test(s.toast), 'opslag dicht: een toast in beeld', JSON.stringify(s));
  check(s.meld.some(m => /^opslag: SecurityError/.test(m)), 'opslag dicht: briefje voor de foutmelder', JSON.stringify(s.meld));
  const rij = await pg.evaluate(() => appWideCardsHtml());
  check(/bewaart niets/.test(rij), 'opslag dicht: Voor ouders zegt het (toestelkaart)', rij.slice(0, 200));
  geenFout('opslag dicht', fouten);
  await ctx.close();
  // en met een opslag die het doet, staat die rij er niet
  const g = await pagina(browser);
  check(!/bewaart niets/.test(await g.pg.evaluate(() => appWideCardsHtml())), 'opslag dicht: geen rij als de opslag het doet', '');
  await g.ctx.close();
};

RIJEN['voorraad geweigerd'] = async browser => {
  // De service worker meldt zich alleen aan buiten file://, dus hier over http.
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain' };
  const srv = http.createServer((req, res) => {
    const p = path.join(WORTEL, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(WORTEL) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  const url = `http://127.0.0.1:${srv.address().port}/index.html?debug`;
  const { ctx, pg, fouten } = await pagina(browser, () => {
    // na een tikje, zoals een echte weigering: dan leest de test al mee (VOLG)
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => new Promise((ja, nee) => setTimeout(() => nee(new Error('Rejected')), 600));
  }, url);
  await pg.waitForTimeout(900);
  const meld = await pg.evaluate(() => window.__meld);
  check(meld.some(m => /^sw: .*Rejected/.test(m)), 'voorraad geweigerd: briefje voor de foutmelder (geen onopgevangen belofte)', JSON.stringify(meld));
  geenFout('voorraad geweigerd', fouten);
  await ctx.close();
  srv.close();
};

RIJEN['wakker geweigerd'] = async browser => {
  // batterijbesparing: het scherm mag dimmen, het spel speelt door
  const { ctx, pg, fouten } = await pagina(browser, () => {
    if (navigator.wakeLock) navigator.wakeLock.request = () => Promise.reject(new DOMException('nee', 'NotAllowedError'));
  });
  await telShow(pg);
  check(true, 'wakker geweigerd: de show start', '');
  geenFout('wakker geweigerd', fouten);
  await ctx.close();
};

RIJEN['geen trilmotor'] = async browser => {
  // stil: het toestel beslist (zie buzz). Alleen: niets valt om.
  const { ctx, pg, fouten } = await pagina(browser, () => {
    delete Navigator.prototype.vibrate;
  });
  await telShow(pg);
  await pg.evaluate(() => playSfx('answer.correct'));
  geenFout('geen trilmotor', fouten);
  await ctx.close();
};

RIJEN['geen klembord of delen'] = async browser => {
  // ingebouwde browsers van apps: geen navigator.share, en een klembord dat weigert
  const { ctx, pg, fouten } = await pagina(browser, () => {
    delete Navigator.prototype.share; delete Navigator.prototype.canShare;
    if (navigator.clipboard) navigator.clipboard.writeText = () => Promise.reject(new DOMException('nee', 'NotAllowedError'));
  });
  await pg.evaluate(TELSTER);
  await pg.evaluate(() => { try { openSettings(); } catch (e) { /* geen paneel: dan niets */ } });
  await pg.waitForTimeout(300);
  await pg.evaluate(() => { const b = document.getElementById('set-backup'); if (b) b.click(); });
  await pg.waitForTimeout(500);
  geenFout('geen klembord of delen', fouten);
  await ctx.close();
};

(async () => {
  const nodig = new Set();
  for (const t of TOESTEL) if (gebruikt.has(t.naam)) t.rijen.forEach(r => nodig.add(r));
  for (const r of nodig) check(!!RIJEN[r], 'A: elke rij uit de lijst bestaat', `rij "${r}" staat in TOESTEL maar niet in RIJEN`);

  const kaal = Object.values(counts).some(c => c.fail);
  if (!kaal) {
    const browser = await launch();
    for (const naam of Object.keys(RIJEN)) {
      try { await RIJEN[naam](browser); }
      catch (e) { check(false, naam + ': de rij liep tot het eind', e.message.split('\n')[0]); }
    }
    await browser.close();
  }

  const names = Object.keys(counts).sort();
  let failed = 0;
  for (const n of names) {
    const c = counts[n];
    if (c.fail) failed++;
    console.log(`${c.fail ? 'FAIL' : ' ok '}  ${n}  (${c.pass} ok${c.fail ? ', ' + c.fail + ' fout' : ''})`);
  }
  if (fails.length) {
    console.log('\nEerste fouten:');
    for (const f of fails) console.log('  - ' + f);
  }
  console.log(`\ntoestel: ${names.length - failed}/${names.length} controles geslaagd.`);
  process.exit(failed ? 1 : 0);
})();
