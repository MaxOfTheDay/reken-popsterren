/*
 * De beelden die bij de héle app horen, en niet bij één wereld.
 *
 * Het startscherm, het spelogo, het merkteken en het app-icoon zijn van de app
 * zelf. Ze stonden verspreid: de tekening in scene.js, het merk in merk.js, de
 * iconen in de wortel. Wie ze wilde nakijken moest weten in welke map hij moest
 * zoeken -- en wie ze in de studio wilde tonen moest die drie lijsten opnieuw aan
 * elkaar knopen. Dat is wat hier één keer gebeurt.
 *
 * Er wordt niets nieuws bedacht: scene.SLOTS zegt welke tekeningen er zijn en hoe
 * groot ze horen te worden, merk.AFGELEID zegt welke meester welke bestanden
 * oplevert, en de schijf zegt wat er werkelijk ligt. Dit bestand zet die drie naast
 * elkaar in één lijst waar de Dev Studio kaartjes van maakt.
 *
 *   const { overzicht } = require('./beelden');
 *   overzicht().assets[0].label        // 'Startscherm'
 *
 * Twee soorten, en het verschil is niet cosmetisch:
 *
 *   los     één bestand op één pad. Vervangen is het bestand vervangen, klaar.
 *           (het startscherm, en elke wereldtekening)
 *   keten   één meester in assets/branding/source/ waar meerdere bestanden uit
 *           rollen. Vervangen is de méester vervangen en daarna de afgeleiden
 *           opnieuw laten maken (npm run merk). Wie hier één afgeleide zou
 *           overschrijven, krijgt een logo dat niet meer bij zijn eigen meester
 *           hoort en drie bestanden die nog wél kloppen.
 */
const fs = require('fs');
const path = require('path');
const scene = require('./scene.js');
const merk = require('./merk.js');
const { assetsOpSchijf } = require('./werelden.js');

const ROOT = path.resolve(__dirname, '..');

/* Welke paden mag de studio beschrijven? Dezelfde lijst waar test/preview.js zijn
   schrijfrechten op baseert -- één afspraak, twee lezers. Alles wat hier niet
   in staat is voor de studio niet meer dan tekst op het scherm. */
const SCHRIJFBAAR = [
  /^assets\/world\/[a-z0-9-]+-map\.webp$/,
  /^assets\/bg\/landing\.webp$/,
  /^assets\/branding\/source\/(wordmark|mark|appicon)\.webp$/,
];
const magSchrijven = p => SCHRIJFBAAR.some(re => re.test(p));

function kb(schijf, pad) {
  return Object.prototype.hasOwnProperty.call(schijf, pad) ? schijf[pad] : null;
}

/* De globale beelden, op volgorde van "hoe vaak kijk je ernaar".
   De wereldtekeningen staan hier bewust níét bij: die horen bij een wereld, en
   de studio toont ze in de Wereldstudio naast die wereld. */
function overzicht(opties) {
  opties = opties || {};
  const schijf = opties.schijf || merk.iconenOpSchijf(assetsOpSchijf('assets', {}));
  const assets = [];

  // 1 -- het startscherm: één tekening, één pad
  const d = scene.SLOTS.landing;
  assets.push({
    id: 'landing', soort: 'los', groep: 'Achtergrond', label: d.label,
    uitleg: 'de tekening achter "wie speelt er vandaag"',
    pad: d.pad, kb: kb(schijf, d.pad), lever: d.lever, budget: d.budget || null,
    schrijfbaar: magSchrijven(d.pad),
    scherm: 'profile',
  });

  // 2 -- het merk: per meester één kaart, met de bestanden die eruit rollen
  const perMeester = [];
  merk.AFGELEID.forEach(a => {
    const bron = 'assets/branding/source/' + a.bron;
    let kaart = perMeester.filter(x => x.meester === bron)[0];
    if (!kaart) {
      kaart = {
        id: 'merk-' + a.bron.replace(/\.[a-z0-9]+$/, ''), soort: 'keten', groep: 'Merk',
        label: a.merk, uitleg: a.wat,
        meester: bron, meesterKb: kb(schijf, bron),
        pad: a.uit,                         // het bestand dat de kaart laat zien
        kb: kb(schijf, a.uit), lever: [a.breed, null], budget: a.budget || null,
        schrijfbaar: magSchrijven(bron),
        scherm: 'profile',
        afgeleiden: [],
      };
      perMeester.push(kaart);
    }
    kaart.afgeleiden.push({ pad: a.uit, kb: kb(schijf, a.uit), breed: a.breed, budget: a.budget || null });
  });
  perMeester.forEach(k => assets.push(k));

  return { assets, schijf };
}

/* Alles wat een wereldtekening is, in dezelfde vorm als hierboven. De Wereldstudio
   tekent er hetzelfde kaartje mee, en dat is de hele reden dat dit hier staat:
   één kaartje voor één beeld, waar dat beeld ook bij hoort. */
function wereldAsset(wereld, schijf) {
  const d = scene.SLOTS.world;
  const pad = d.pad.replace('{wereld}', wereld.id);
  return {
    id: 'world-' + wereld.id, soort: 'los', groep: 'Wereld', label: 'Wereldkaart',
    uitleg: 'de tekening onder de route, van rand tot rand',
    pad, kb: kb(schijf || {}, pad), lever: d.lever, budget: d.budget || null,
    schrijfbaar: magSchrijven(pad), scherm: 'map',
  };
}

module.exports = { overzicht, wereldAsset, SCHRIJFBAAR, magSchrijven, ROOT };
