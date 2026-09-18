/*
 * De werelden, zoals ze erbij staan -- zonder browser.
 *
 * Dit is het overzicht waar de studio mee opent: welke werelden er zijn, in
 * welke volgorde, wat ze aan levels, tekening, zaal en beloning hebben, en wat
 * er niet klopt. Eén blik, geen JSON.
 *
 * Er wordt hier níéts nagerekend wat het spel zelf al weet. WORLDS, worldForIndex,
 * worldReleased, item() en wereldControle komen alle vijf uit index.html via
 * test/app.js -- dezelfde code die een kind draait. Zou dit een eigen begrip van
 * "wereld" hebben, dan zou het overzicht op een dag iets anders zeggen dan het
 * spel, en precies dán is een overzicht schadelijk in plaats van nuttig.
 *
 *   const { overzicht } = require('./werelden');
 *   overzicht().werelden[0].naam        // 'Muziekwereld'
 *   overzicht().werelden[0].punten      // [{ ernst, t, waar }, ...]
 */
const fs = require('fs');
const path = require('path');
const { laadApp } = require('./app');

const ROOT = path.resolve(__dirname, '..');

/* Welke bestanden liggen er werkelijk, en hoe groot? wereldControle gebruikt dit
   om "wijst naar een bestand dat er niet is" te kunnen zeggen. Zonder lijst slaat
   hij die controles over -- dus hier altijd meegeven, want op schijf kúnnen we
   kijken. */
function assetsOpSchijf(dir, uit) {
  uit = uit || {};
  const vol = path.join(ROOT, dir);
  if (!fs.existsSync(vol)) return uit;
  for (const naam of fs.readdirSync(vol)) {
    const f = path.join(vol, naam);
    if (fs.statSync(f).isDirectory()) assetsOpSchijf(path.join(dir, naam), uit);
    else uit[path.join(dir, naam).split(path.sep).join('/')] = Math.round(fs.statSync(f).size / 1024);
  }
  return uit;
}

/* De zaal van een wereld. Geen enkele wereld heeft nu een eigen zaaltekening --
   ze lenen allemaal hun kaart (VENUE_TERUGVAL) -- en dát is precies wat het
   overzicht hoort te zeggen, in plaats van een leeg vakje. */
function zaal(w) {
  const v = w.venue || {};
  if (v.art) return { eigen: true, tekst: v.art, pad: v.art };
  const bij = Object.keys(v).filter(k => k !== 'art');
  return { eigen: false, pad: w.art || null,
           tekst: 'leent de kaart' + (bij.length ? ' (' + bij.map(k => k + ' ' + v[k]).join(', ') + ')' : '') };
}

function overzicht(opties) {
  opties = opties || {};
  const app = opties.app || laadApp();
  const schijf = opties.schijf || assetsOpSchijf('assets');
  const punten = app.wereldControle(schijf);

  const werelden = app.WORLDS.map((w, i) => {
    const wl = app.worldForIndex(i);
    // wereldControle noemt een wereld "<icoon> <naam>"; op die sleutel matchen en
    // niet op "bevat de naam", anders erft een wereld de punten van een naamgenoot
    const sleutel = (w.icon || '') + ' ' + (w.name || w.id);
    const mijn = punten.filter(p => p.w === sleutel);
    const bel = w.beloning ? app.item(w.beloning) : null;
    return {
      nr: i + 1, id: w.id, naam: w.name, icoon: w.icon,
      levels: wl.levels, eerste: wl.first, laatste: wl.first + wl.levels - 1,
      uitgebracht: app.worldReleased(w),   // worldReleased krijgt de wereld, niet de index
      slotVan: i === 0 ? null : app.WORLDS[i - 1].name,   // deze gaat open zodra die uit is
      art: w.art || null,
      artKb: w.art ? (schijf[w.art] || null) : null,
      zaal: zaal(w),
      beloning: w.beloning || null,
      beloningNaam: bel ? (bel.full || bel.name) : null,
      beloningErIs: !!bel,
      trofee: 'perfect-' + w.id,
      haltes: (w.nodes || []).length,
      haltesEigen: !!w.nodes,
      stuurpunten: (w.curve || []).length,
      punten: mijn,
      fouten: mijn.filter(p => p.ernst === 'fout').length,
      letop: mijn.filter(p => p.ernst === 'let op').length,
    };
  });

  // Punten die over de lijst gaan en niet over één wereld (volgorde, aantal).
  const lijstPunten = punten.filter(p => p.waar === 'lijst');
  return {
    werelden,
    lijstPunten,
    laatsteLevel: app.WORLD_LAST,
    beschikbaar: app.WORLD_AVAIL,
    fouten: punten.filter(p => p.ernst === 'fout').length,
    letop: punten.filter(p => p.ernst === 'let op').length,
  };
}

module.exports = { overzicht, assetsOpSchijf };
