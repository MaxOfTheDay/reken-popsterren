/*
 * De inhoudskeuring: kloppen de werelden, de spullen en de trofeeën nog?
 *
 * Dit is geen gedragstest maar een controle op de tabellen zelf. De meeste
 * inhoudsfouten zijn stil: een wereld die naar een spulletje wijst dat niet
 * bestaat deelt gewoon niets uit, een beloning met een prijs erbij staat ineens
 * in de winkel, en een wereld met acht haltes maar levels: 10 gooit zijn
 * handgezette kaart weg en tekent er een standaardslinger overheen. Geen van
 * drieën geeft een foutmelding; alle drie merk je pas als een kind het tegenkomt.
 *
 * Hier draait dus geen spel: de tabellen worden één keer ingelezen en nagelopen.
 * Dat kost een halve seconde en hoort daarom vooraan in npm test.
 *
 * De keuringen:
 *   A  werelden          -- id's, lengtes, haltes, levelnummering, uitbrengen
 *   B  wereldtekeningen  -- wat een wereld noemt, staat ook op schijf
 *   C  beloningen        -- elke wereld deelt een bestaand, uniek, gratis spulletje uit
 *   D  de zes bekende    -- de beloning-id's die nu in omloop zijn, stuk voor stuk
 *   E  spullen           -- id's, categorieën, prijzen, en wat een verse ster krijgt
 *   F  trofeeën          -- id's, planken, en de twee per wereld
 *   G  de app zelf       -- wat de service worker meeneemt, staat er ook
 *
 * Draaien:
 *   npm run test:inhoud      (of: npm test voor alle suites)
 */
const fs = require('fs');
const path = require('path');
const { laadApp } = require('./app');
const { check, zaak, klaar } = require('./meld')('inhoud');

const WORTEL = path.resolve(__dirname, '..');
const app = laadApp();
const { WORLDS, ITEMS, TROPHIES, TROPHY_SHELVES, CATS } = app;

// Een id dat veilig door een trofee-id, een CSS-klasse en een bestandsnaam heen
// komt. De wereldbadges plakken er 'wereld-' en 'perfect-' voor; een spatie of een
// hoofdletter daarin is later niet meer te repareren zonder behaalde trofeeën
// kwijt te raken.
const NET_ID = /^[a-z0-9][a-z0-9_-]*$/;
const dubbel = lijst => lijst.filter((x, i) => lijst.indexOf(x) !== i);

/* ================= A · De werelden ================= */
zaak('A', () => {
  check(WORLDS.length > 0, 'A · er is minstens één wereld', WORLDS.length);
  const ids = WORLDS.map(w => w.id);
  check(dubbel(ids).length === 0, 'A · geen twee werelden met hetzelfde id', JSON.stringify(dubbel(ids)));
  WORLDS.forEach((w, i) => {
    const waar = `wereld ${i} (${w.id})`;
    check(typeof w.id === 'string' && NET_ID.test(w.id), `A · ${waar}: een net id`, JSON.stringify(w.id));
    check(typeof w.name === 'string' && w.name.trim().length > 0, `A · ${waar}: heeft een naam`, JSON.stringify(w.name));
    check(typeof w.icon === 'string' && w.icon.length > 0, `A · ${waar}: heeft een icoon`, JSON.stringify(w.icon));
    check(Number.isInteger(w.levels) && w.levels > 0, `A · ${waar}: een geheel aantal shows`, JSON.stringify(w.levels));
    check(!('released' in w) || typeof w.released === 'boolean',
      `A · ${waar}: released is weggelaten of een echte boolean`, JSON.stringify(w.released));
    check(!('theme' in w) || (w.theme && typeof w.theme === 'object'), `A · ${waar}: theme is een kaartje`, JSON.stringify(w.theme));
    check(!('venue' in w) || (w.venue && typeof w.venue === 'object'), `A · ${waar}: venue is een kaartje`, JSON.stringify(w.venue));
    // De haltes: net zoveel als er shows zijn. Staat er een ander aantal, dan
    // negeert worldNodes() de hele lijst en slingert de weg zichzelf -- stil, en
    // precies het handwerk kwijt waar de wereldstudio voor bestaat.
    if (w.nodes) {
      check(Array.isArray(w.nodes) && w.nodes.length === w.levels,
        `A · ${waar}: evenveel haltes als shows`, `${w.nodes && w.nodes.length} haltes, ${w.levels} shows`);
      check((w.nodes || []).every(n => n && typeof n.x === 'number' && typeof n.y === 'number' &&
              n.x >= 0 && n.x <= 100 && n.y >= 0 && n.y <= 100),
        `A · ${waar}: elke halte staat op de kaart`, JSON.stringify(w.nodes));
    }
    // De stuurpunten liggen tússen de haltes: eentje minder dan er haltes zijn.
    if (w.curve) {
      check(Array.isArray(w.curve) && w.nodes && w.curve.length === w.nodes.length - 1,
        `A · ${waar}: één stuurpunt minder dan haltes`, `${w.curve && w.curve.length} stuurpunten`);
    }
  });
  // De levelnummering: aaneengesloten, in volgorde, en met de echte lengtes.
  let n = 1;
  WORLDS.forEach((w, i) => {
    check(app.WORLD_START[i] === n, `A · wereld ${i} (${w.id}) begint op het juiste level`,
      `${app.WORLD_START[i]} i.p.v. ${n}`);
    n += w.levels;
  });
  // Uitgebracht is een aaneengesloten kop: staat er één dicht, dan is alles
  // daarna óók dicht. Een open wereld achter een dichte zou onbereikbaar zijn.
  const dicht = WORLDS.findIndex(w => !app.worldReleased(w));
  check(dicht < 0 || WORLDS.slice(dicht).every(w => !app.worldReleased(w)),
    'A · geen uitgebrachte wereld achter een dichte', 'er staat een gat in de tournee');
  check(app.WORLD_AVAIL >= 1 && app.WORLD_AVAIL <= WORLDS.length, 'A · er is minstens één speelbare wereld',
    app.WORLD_AVAIL);
  check(app.WORLD_LAST === app.WORLD_START[app.WORLD_AVAIL - 1] + WORLDS[app.WORLD_AVAIL - 1].levels - 1,
    'A · het laatste level is het einde van de laatste open wereld', app.WORLD_LAST);
  // Een historisch getal dat niet met de tournee mee mag groeien (zie migrate).
  check(app.LEGACY_TOUR_END === 48, 'A · het einde van de oude staart staat nog op 48', app.LEGACY_TOUR_END);
});

/* ================= B · De wereldtekeningen ================= */
zaak('B', () => {
  WORLDS.forEach((w, i) => {
    if (!('art' in w)) return;   // mag weg: dan tekent de app de reservekaart
    const waar = `wereld ${i} (${w.id})`;
    check(typeof w.art === 'string' && w.art.indexOf('assets/') === 0, `B · ${waar}: de tekening staat in assets/`,
      JSON.stringify(w.art));
    check(fs.existsSync(path.join(WORTEL, w.art)), `B · ${waar}: en die tekening bestaat ook echt`, w.art);
  });
});

/* ================= C · De beloningen =================
   Eén regel configuratie per wereld, en daar hangt alles aan: het spulletje dat
   een kind krijgt, de kleedkamer die het als "te verdienen" toont, en de winkel
   die het juist níét mag verkopen. */
zaak('C', () => {
  const beloningen = WORLDS.filter(w => 'beloning' in w);
  check(beloningen.length === WORLDS.length, 'C · elke wereld deelt een spulletje uit',
    JSON.stringify(WORLDS.filter(w => !('beloning' in w)).map(w => w.id)));
  const ids = beloningen.map(w => w.beloning);
  check(dubbel(ids).length === 0, 'C · geen twee werelden die hetzelfde spulletje uitdelen', JSON.stringify(dubbel(ids)));
  beloningen.forEach(w => {
    const it = app.item(w.beloning);
    check(!!it, `C · ${w.id}: het beloningsitem bestaat`, JSON.stringify(w.beloning));
    if (!it) return;
    check(app.beloningItem(w) === it, `C · ${w.id}: en de app vindt hem ook`, JSON.stringify(w.beloning));
    check(it.price == null, `C · ${w.id}: een beloning heeft geen prijs`, JSON.stringify(it.price));
    check(app.isBeloning(it.id), `C · ${w.id}: dus hij staat niet in de winkel`, it.id);
    check(app.beloningWereld(it.id) === w, `C · ${w.id}: en hoort bij precies deze wereld`, it.id);
  });
  // Andersom: alles wat geen prijs heeft is een beloning, en niets anders. Een
  // gewoon winkelitem zonder prijs zou gratis zijn; een beloning mét prijs zou
  // ineens te koop staan.
  const prijsloos = ITEMS.filter(i => i.price == null).map(i => i.id).sort();
  check(prijsloos.join() === ids.slice().sort().join(),
    'C · precies de beloningen hebben geen prijs, en niets anders',
    JSON.stringify({ prijsloos, beloningen: ids }));
});

/* ================= D · De zes id's die nu in omloop zijn =================
   Deze staan in de kleedkamer van kinderen die ze verdiend hebben. Een id
   hernoemen betekent: het spulletje verdwijnt bij iedereen die het had. Daarom
   staan ze hier met naam en toenaam -- niet om ze te bevriezen, maar zodat het
   hernoemen een bewuste daad is en geen typefout. */
zaak('D', () => {
  const BEKEND = ['acc_wereld_muziek', 'acc_wereld_snoep', 'acc_wereld_jungle',
                  'acc_wereld_piraten', 'acc_wereld_ijs', 'acc_wereld_tover'];
  BEKEND.forEach(id => {
    const it = app.item(id);
    check(!!it, `D · ${id} bestaat nog`, 'weg uit ITEMS');
    if (!it) return;
    check(it.price == null, `D · ${id} is te verdienen en niet te koop`, JSON.stringify(it.price));
    const w = app.beloningWereld(id);
    check(!!w, `D · ${id} hangt aan een wereld`, 'geen wereld verwijst er nog naar');
    check(typeof it.name === 'string' && it.name.length > 0, `D · ${id} heeft een naam`, JSON.stringify(it.name));
    check(typeof it.draw === 'function' && typeof it.thumb === 'function',
      `D · ${id} heeft zijn eigen tekening`, JSON.stringify(Object.keys(it)));
  });
  // De winkelhoed die in fase 4D.2 is weggehaald: die id mag niet terugkomen,
  // want migrate() gooit hem uit elke kleedkamer (zie daar).
  check(!app.item('acc_tovenaarshoed'), 'D · de oude winkel-tovenaarshoed is en blijft weg',
    'acc_tovenaarshoed staat weer in ITEMS terwijl migrate() hem opruimt');
});

/* ================= E · De spullen ================= */
zaak('E', () => {
  const ids = ITEMS.map(i => i.id);
  check(dubbel(ids).length === 0, 'E · geen twee spullen met hetzelfde id', JSON.stringify(dubbel(ids)));
  const catIds = CATS.map(c => c.id).concat(['stage']);   // podia zijn geen winkelcategorie meer
  ITEMS.forEach(it => {
    check(NET_ID.test(String(it.id)), `E · ${it.id}: een net id`, JSON.stringify(it.id));
    check(catIds.includes(it.cat), `E · ${it.id}: een bestaande categorie`, JSON.stringify(it.cat));
    check(typeof it.name === 'string' && it.name.length > 0, `E · ${it.id}: heeft een naam`, JSON.stringify(it.name));
    if (it.price != null) {
      check(Number.isInteger(it.price) && it.price >= 0, `E · ${it.id}: een gehele prijs vanaf nul`, JSON.stringify(it.price));
    }
  });
  // Wat een verse ster meekrijgt moet bestaan -- anders staat ze met lege handen
  // of, erger, met een aangetrokken spookitem.
  const vers = app.defaultProfile('Keuring', 'dress_roze');
  vers.owned.forEach(id => check(!!app.item(id), `E · startspullen: ${id} bestaat`, id));
  Object.entries(vers.equipped).forEach(([cat, id]) => {
    if (!id) return;
    const it = app.item(id);
    check(!!it, `E · startkleding: ${id} bestaat`, id);
    check(!it || it.cat === cat, `E · startkleding: ${id} zit in de juiste categorie`, `${it && it.cat} i.p.v. ${cat}`);
  });
  app.START_HAIR.concat(app.START_DRESS).forEach(id =>
    check(!!app.item(id), `E · keuzelijst bij het maken: ${id} bestaat`, id));
  check(vers.owned.every(id => !app.isBeloning(id)), 'E · en een verse ster krijgt geen beloning cadeau',
    JSON.stringify(vers.owned.filter(id => app.isBeloning(id))));
  check(app.boughtCount(vers) === 0, 'E · "spulletjes gekocht" begint op nul', app.boughtCount(vers));
  // De collectietrofeeën wijzen naar echte categorieën en echte trofeeën.
  Object.entries(app.COLLECTION_CAT).forEach(([trof, cat]) => {
    check(TROPHIES.some(t => t.id === trof), `E · collectietrofee ${trof} bestaat`, trof);
    check(CATS.some(c => c.id === cat), `E · collectietrofee ${trof} wijst naar categorie ${cat}`, cat);
    check(ITEMS.some(i => i.cat === cat), `E · en er zijn spullen in ${cat}`, cat);
  });
});

/* ================= F · De trofeeën ================= */
zaak('F', () => {
  const ids = TROPHIES.map(t => t.id);
  check(dubbel(ids).length === 0, 'F · geen twee trofeeën met hetzelfde id', JSON.stringify(dubbel(ids)));
  TROPHIES.forEach(t => {
    check(NET_ID.test(String(t.id)), `F · ${t.id}: een net id`, JSON.stringify(t.id));
    check(typeof t.name === 'string' && t.name.length > 0, `F · ${t.id}: heeft een naam`, JSON.stringify(t.name));
    check(typeof t.desc === 'string' && t.desc.length > 0, `F · ${t.id}: heeft een omschrijving`, JSON.stringify(t.desc));
    check(typeof t.emoji === 'string' && t.emoji.length > 0, `F · ${t.id}: heeft een plaatje`, JSON.stringify(t.emoji));
    check(typeof t.has === 'function', `F · ${t.id}: weet wanneer hij behaald is`, typeof t.has);
  });
  // Elke trofee hangt aan precies één plank, en elke plank-id bestaat.
  const opPlank = TROPHY_SHELVES.reduce((a, s) => a.concat(s.ids), []);
  check(dubbel(opPlank).length === 0, 'F · geen trofee die op twee planken hangt', JSON.stringify(dubbel(opPlank)));
  check(opPlank.every(id => ids.includes(id)), 'F · elke plank-id hoort bij een echte trofee',
    JSON.stringify(opPlank.filter(id => !ids.includes(id))));
  check(TROPHIES.every(t => opPlank.includes(t.id)), 'F · en elke trofee hangt ergens',
    JSON.stringify(TROPHIES.filter(t => !opPlank.includes(t.id)).map(t => t.id)));
  // Gepensioneerde trofeeën staan niet meer in de kast (hun id's blijven wél
  // bestaan voor kinderen die ze behaald hebben -- zie RETIRED_TROPHIES).
  const pensioen = Array.from(app.RETIRED_TROPHIES).filter(id => ids.includes(id));
  check(pensioen.length === 0, 'F · geen gepensioneerde trofee terug in de kast', JSON.stringify(pensioen));
  // Twee per wereld, op hun eigen plank.
  const plank = key => (TROPHY_SHELVES.filter(s => s.key === key)[0] || { ids: [] }).ids;
  WORLDS.forEach(w => {
    check(ids.includes(app.WERELD_BADGE + w.id), `F · ${w.id}: er is een wereldbadge`, app.WERELD_BADGE + w.id);
    check(ids.includes(app.PERFECT_BADGE + w.id), `F · ${w.id}: er is een perfecte-wereldtrofee`, app.PERFECT_BADGE + w.id);
    check(plank('werelden').includes(app.WERELD_BADGE + w.id), `F · ${w.id}: de badge hangt op de wereldplank`, w.id);
    check(plank('perfect').includes(app.PERFECT_BADGE + w.id), `F · ${w.id}: en de trofee op de perfecte plank`, w.id);
  });
  /* En dan de lakmoesproef: elke has() en progress() een keer echt aanroepen, met
     een leeg profiel en met een volgespeeld profiel. Een trofee die naar een
     verdwenen item of een verdwenen teller wijst valt hier om -- in het spel zou
     hij pas omvallen op het moment dat een kind de kast opent. */
  const leeg = app.defaultProfile('Leeg', 'dress_roze');
  const vol = app.defaultProfile('Vol', 'dress_roze');
  vol.diamonds = 9999; vol.goldHits = 999; vol.encores = 999;
  vol.stats = { correct: 5000, wrong: 10 };
  for (let l = 1; l <= app.WORLD_LAST; l++) vol.stars[l] = 3;
  ITEMS.forEach(i => { if (!vol.owned.includes(i.id)) vol.owned.push(i.id); });
  TROPHIES.forEach(t => {
    try {
      check(t.has(leeg) === false, `F · ${t.id}: een verse ster heeft hem nog niet`, String(t.has(leeg)));
      check(typeof t.has(vol) === 'boolean', `F · ${t.id}: has() geeft ja of nee`, typeof t.has(vol));
      const pr = t.progress ? t.progress(vol) : null;
      if (pr) check(typeof pr.pct === 'number' && pr.pct >= 0 && pr.pct <= 100 && typeof pr.label === 'string',
        `F · ${t.id}: progress() geeft een leesbare stand`, JSON.stringify(pr));
    } catch (e) {
      check(false, `F · ${t.id}: has()/progress() valt niet om`, e && e.message);
    }
  });
  // Wie alles op drie sterren heeft, heeft alle wereldbadges en alle perfecte
  // werelden -- dat zijn precies de trofeeën die uit worldProgress komen.
  WORLDS.forEach((w, i) => {
    if (!app.worldAvailable(i)) return;   // een dichte wereld heeft in dit profiel geen sterren
    const badge = id => TROPHIES.filter(t => t.id === id)[0];
    check(badge(app.WERELD_BADGE + w.id).has(vol) === true, `F · ${w.id}: de badge van een volgespeelde wereld`, 'niet behaald');
    check(badge(app.PERFECT_BADGE + w.id).has(vol) === true, `F · ${w.id}: en de perfecte-wereldtrofee`, 'niet behaald');
  });
});

/* ================= G · De app zelf =================
   De service worker neemt een handvol bestanden mee voor offline. Staat daar een
   naam bij die niet bestaat, dan mislukt addAll() en installeert de service worker
   helemaal niet -- en dan is er geen offline spel meer, zonder één foutmelding in
   het spel zelf. */
zaak('G', () => {
  const sw = fs.readFileSync(path.join(WORTEL, 'sw.js'), 'utf8');
  const m = sw.match(/const ASSETS = \[([^\]]*)\]/);
  check(!!m, 'G · de service worker heeft een ASSETS-lijst', 'niet gevonden');
  if (!m) return;
  const lijst = m[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  lijst.forEach(p => {
    if (p === './') return;   // de map zelf
    check(fs.existsSync(path.join(WORTEL, p)), `G · ${p} staat ook echt op schijf`, p);
  });
  const cache = sw.match(/const CACHE = '([^']+)'/);
  check(!!cache && /-v\d+$/.test(cache[1]), 'G · en de cache heeft een versienummer', cache && cache[1]);
  // Het manifest wijst naar bestaande iconen.
  const man = JSON.parse(fs.readFileSync(path.join(WORTEL, 'manifest.json'), 'utf8'));
  man.icons.forEach(ic => check(fs.existsSync(path.join(WORTEL, ic.src)), `G · icoon ${ic.src} bestaat`, ic.src));
});

klaar();
