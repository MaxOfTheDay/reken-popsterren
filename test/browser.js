/*
 * Gedeelde browser-start voor de tests.
 *
 * Werkt zowel met de volledige 'playwright' (installeert zelf een browser) als met
 * 'playwright-core' plus een bestaande Chrome/Chromium. Zet CHROME=/pad/naar/chrome
 * om een eigen browser te forceren.
 */
const fs = require('fs');
const path = require('path');

let pw;
try { pw = require('playwright'); }
catch (e) { pw = require('playwright-core'); }

// Vaste plek in de ontwikkelomgeving; bestaat die niet, dan kiest playwright zelf.
const FALLBACK = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

function exePath() {
  if (process.env.CHROME) return process.env.CHROME;
  if (fs.existsSync(FALLBACK)) return FALLBACK;
  return null;   // playwright gebruikt zijn eigen meegeleverde browser
}

async function launch() {
  const exe = exePath();
  return pw.chromium.launch(exe ? { executablePath: exe } : {});
}

/*
 * VANGNET, geen noodzaak meer. De app haalt haar letter sinds het kleur- en
 * letterstelsel uit assets/font/ en niet meer van fonts.googleapis.com: er gaat
 * bij een gewone start geen enkel verzoek meer naar buiten, en deze route vangt
 * dus niets meer af.
 *
 * Hij blijft staan omdat hij de dag waarop iemand die <link> terugzet meteen
 * onschadelijk maakt. Wat er dán weer zou gebeuren, en waarvoor dit ooit
 * geschreven is: een stijlblad in de <head> blokkeert het scriptblok eronder en
 * daarmee DOMContentLoaded, zodat élke page.goto() op een trage verbinding tien
 * seconden of meer kost -- en de sterren-test maakt een verse context per zaak.
 *
 * Een mislukte aanvraag wordt bewust béántwoord met een leeg bestand en niet
 * afgebroken: route.abort() zet "Failed to load resource" in de console, en de
 * suites rekenen elke consolefout aan als een fout in de pagina.
 */
const fontCache = new Map();
const EMPTY = { status: 200, headers: { 'content-type': 'text/css' }, body: '' };
async function cacheFonts(target) {
  await target.route('**://fonts.g*/**', async route => {
    const url = route.request().url();
    if (fontCache.has(url)) return route.fulfill(fontCache.get(url));
    let hit = EMPTY;
    try {
      const res = await route.fetch();
      hit = { status: res.status(), headers: res.headers(), body: await res.body() };
    } catch (e) { /* geen net: leeg antwoord, reservelettertype */ }
    fontCache.set(url, hit);
    await route.fulfill(hit);
  });
}

// file://-URL van de app, met ?debug zodat window.__game beschikbaar is.
const APP_URL = 'file://' + path.resolve(__dirname, '..', 'index.html') + '?debug';

module.exports = { launch, cacheFonts, APP_URL };
