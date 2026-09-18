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
   in staat is voor de studio niet meer dan tekst op het scherm.

   De lijst wordt afgeleid uit scene.SLOTS en niet met de hand bijgehouden. Dat is
   geen netheid maar een storing die we niet meer willen: een plek toevoegen in
   scene.js en het pad hier vergeten levert een studio op die een vervangknop toont
   die de server vervolgens weigert -- en dan zoek je de fout in de knop.

   Eng blijft eng. Alleen wat scene.js als doelpad noemt, alleen webp, en
   {wereld} wordt één nauwe klasse en geen jokerteken; index.html, sw.js en alles
   buiten assets/ komen er dus niet in. De merkmeesters staan er los bij: die
   staan niet in scene.js, want ze gaan de app niet in (zie merk.js). */
function pandNaarRegex(pad) {
  const stuk = pad.split('{wereld}').map(d => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp('^' + stuk.join('[a-z0-9-]+') + '$');
}
const SCHRIJFBAAR = Object.keys(scene.SLOTS)
  .map(k => scene.SLOTS[k].pad)
  .filter(pad => pad && /^assets\/[a-z0-9/{}-]+\.webp$/.test(pad))
  .map(pandNaarRegex)
  .concat([/^assets\/branding\/source\/(wordmark|mark|appicon)\.webp$/]);
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
  /* Welke schermtekeningen staan er áán in het spel? Dat is iets anders dan "ligt
     er een bestand": een tekening kan op schijf staan zonder dat index.html hem
     noemt, en dan ziet een kind hem niet. De studio hoort dat verschil te tonen,
     dus wordt het hier uit de app zelf gelezen -- niet uit een tweede lijstje. */
  let aan = opties.schermkunst;
  if (!aan) {
    try {
      delete require.cache[require.resolve('./app.js')];
      aan = require('./app.js').laadApp().SCHERMKUNST || {};
    } catch (e) { aan = {}; }
  }
  const assets = [];

  /* 1 -- de schermtekeningen: één bestand, één pad, één scherm.
     Ze komen uit scene.SLOTS en niet uit een lijstje hier: wie er een plek bij
     zet in scene.js krijgt hem vanzelf in de studio. `schermkunst` zegt of het
     pad ook nog in index.html aangezet moet worden (de kleedkamer en de kast);
     het startscherm staat daar al vast in het stijlblad. */
  ['landing', 'dress', 'tro'].forEach(sleutel => {
    const d = scene.SLOTS[sleutel];
    if (!d || !d.pad) return;
    assets.push({
      id: sleutel, soort: 'los', groep: 'Schermtekeningen', label: d.label,
      uitleg: d.waar,
      pad: d.pad, kb: kb(schijf, d.pad), lever: d.lever, budget: d.budget || null,
      schrijfbaar: magSchrijven(d.pad),
      scherm: d.screen,
      schermkunst: d.schermkunst || null,
      // null = deze plek staat niet aan/uit te zetten (het startscherm staat vast
      // in het stijlblad); true/false = het spel gebruikt hem wel/niet
      aan: d.schermkunst ? !!(aan && aan[d.schermkunst]) : null,
    });
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
