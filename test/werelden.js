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
 *   overzicht().werelden[0].punten      // [{ ernst, t, waar, blokkeert }, ...]
 *   overzicht({ concept, basis })       // hetzelfde, met het concept uit de studio erop
 *
 * Het concept: wat de wereldstudio in localStorage heeft staan (zie
 * WORLD_DRAFT_KEY en WORLD_DRAFT_BASIS_KEY in src/20-app.js). De studiopagina
 * stuurt het mee, en het wordt hier op precies dezelfde manier op het spel
 * gelegd als in de browser: loadWorldDraft() uit index.html, in de nagebootste
 * browser van test/app.js. Zo ziet het overzicht een nieuwe wereld al vóórdat hij
 * in index.html staat, en kijkt dezelfde wereldControle hem na.
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

/* Wat is er aan deze wereld anders dan in het spel? Eén woord per veld, net als
   "Wat verandert er" in de wereldstudio -- geen diff, wel genoeg om te weten of
   het klopt met wat je bedoelde. */
function watAnders(app, w, ship) {
  if (!ship) return ['nieuw'];
  const wat = [];
  const zelfde = (a, b) => app.sameWorld(a == null ? null : a, b == null ? null : b);
  if (ship.id !== w.id) wat.push('id');
  if (ship.name !== w.name) wat.push('naam');
  if (ship.icon !== w.icon) wat.push('icoon');
  if (ship.art !== w.art) wat.push('tekening');
  if (ship.beloning !== w.beloning) wat.push('beloning');
  if ((ship.released !== false) !== (w.released !== false)) wat.push(w.released === false ? 'dicht' : 'uitgebracht');
  if (!zelfde(ship.theme, w.theme)) wat.push('kleuren');
  if (!zelfde(ship.venue, w.venue)) wat.push('zaal');
  if (!zelfde(ship.schat, w.schat)) wat.push('schat');
  if (!zelfde(ship.nodes, w.nodes)) wat.push('haltes');
  if (!zelfde(ship.curve, w.curve)) wat.push('weg');
  if (!wat.length && !app.sameWorld(ship, w)) wat.push('gewijzigd');
  return wat;
}

function overzicht(opties) {
  opties = opties || {};
  let app = opties.app;
  let concept = null;
  if (!app && Array.isArray(opties.concept) && opties.concept.length) {
    const K = 'rekenPopsterren_wereldconcept';
    const opslag = { [K]: JSON.stringify(opties.concept) };
    if (Array.isArray(opties.basis)) opslag[K + '_basis'] = JSON.stringify(opties.basis);
    app = laadApp({ opslag });
    // dezelfde sleutel als het spel; staat hij er anders, dan meet dit niets
    if (app.WORLD_DRAFT_KEY !== K) throw new Error('WORLD_DRAFT_KEY is ' + app.WORLD_DRAFT_KEY);
    app.loadWorldDraft();
    concept = app.WORLD_DRAFT_INFO;
  }
  app = app || laadApp();
  const schijf = opties.schijf || assetsOpSchijf('assets');
  const punten = app.wereldControle(schijf);
  const open = app.uitgebrachtTot();

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
      // speelbaar voor een kind: uitgebracht én niet achter een dichte wereld
      speelbaar: i < open,
      venueDim: (w.venue && w.venue.dim != null) ? w.venue.dim : null,
      /* Staat deze wereld zo in index.html, of alleen in het concept? Op plek
         vergeleken, net als rebaseWorldDraft: de plek is de identiteit. */
      staat: !app.WORLDS_SHIPPED[i] ? 'nieuw'
        : app.sameWorld(app.WORLDS_SHIPPED[i], w) ? 'gelijk' : 'gewijzigd',
      anders: app.WORLDS_SHIPPED[i] && app.sameWorld(app.WORLDS_SHIPPED[i], w) ? []
        : watAnders(app, w, app.WORLDS_SHIPPED[i]),
      punten: mijn,
      fouten: mijn.filter(p => p.ernst === 'fout').length,
      letop: mijn.filter(p => p.ernst === 'let op').length,
      // blokkeert = een kind heeft er nu last van; tedoen = pas bij uitbrengen
      blokkeert: mijn.filter(p => p.blokkeert).length,
      tedoen: mijn.filter(p => p.ernst === 'fout' && !p.blokkeert).length,
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
    blokkeert: punten.filter(p => p.blokkeert).length,
    tedoen: punten.filter(p => p.ernst === 'fout' && !p.blokkeert).length,
    /* null zonder concept; anders welke werelden van jou zijn, of het concept op
       een oudere versie gebouwd was, en welke werelden óók in het spel veranderd
       zijn sinds je begon (die moet je nakijken). */
    concept: concept,
  };
}

/* Het blok dat "Opslaan" zou schrijven, en of er precies uitkomt wat erin ging.

   worldsSource() in src/20-app.js zet het blok in vorm. Gooit het daarbij ooit iets
   weg -- een veld dat het niet kent, een waarde die het anders schrijft -- dan is
   een wereld na opslaan stil een stukje kwijt, en dat merk je pas als een kind het
   mist. Dus wordt het blok eerst proefgelezen, los van alles, en vergeleken met de
   lijst waar het uit kwam. De haltes en stuurpunten staan in het blok op één
   decimaal (een sleep levert er twaalf); dat is afronden, geen verlies.

   Staat hier en niet in de server, zodat een test precies dezelfde proef kan
   doen (zie test/hub.test.js). */
function blokTerug(app) {
  const bron = app.worldsSource();
  let terug;
  try {
    terug = require('vm').runInNewContext('(' + bron.replace(/^const WORLDS = /, '').replace(/;\s*$/, '') + ')');
  } catch (e) {
    return { ok: false, bron, tekst: 'het blok dat eruit zou komen is geen geldige code: ' + e.message };
  }
  const rond = l => JSON.parse(JSON.stringify(l), (k, v) =>
    (k === 'x' || k === 'y') && typeof v === 'number' ? Number(v.toFixed(1)) : v);
  const ok = app.sameWorld(rond(terug), rond(app.WORLDS));
  return { ok, bron, tekst: ok ? '' : 'het blok zou niet precies teruggeven wat er in je concept staat, '
    + 'dus er zou iets stil verloren gaan. Dat is een fout in worldsSource (src/20-app.js).' };
}

module.exports = { overzicht, assetsOpSchijf, blokTerug };
