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

// file://-URL van de app, met ?debug zodat window.__game beschikbaar is.
const APP_URL = 'file://' + path.resolve(__dirname, '..', 'index.html') + '?debug';

module.exports = { launch, APP_URL };
