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
 *   H  het ene bestand    -- de vorm waar de rest op staat: commentaar dat
 *                           dichtgaat, één scriptblok, en tekeningen van een
 *                           verstandig formaat
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
  /* FASE 5C -- de kast is uitgedund en mag niet stilletjes weer volgroeien.
     Hier stond een bovengrens ("hoogstens 24 actieve trofeeën"), en die was fout
     gedacht: elke wereld die erbij komt levert terecht een perfecte-wereldtrofee
     op, dus met genoeg werelden zou een kerngezonde kast deze controle omduwen.
     Zo'n test leert je op den duur alleen het getal op te hogen.

     Dus geen totaal meer, maar de vórm van de kast:
       - het vaste deel (alles wat niet uit WORLDS komt) blijft op VASTE_KAST;
       - er is precies één actieve perfecte wereld per wereld in WORLDS;
       - en samen zijn dat álle actieve trofeeën -- er hangt niets buiten die twee.
     Een wereld erbij verandert alleen het tweede getal, en dat mag. Een trofee die
     iemand er "even bij" zet valt hier onmiddellijk uit, hoeveel werelden er ook
     zijn. */
  const VASTE_KAST = 12;
  const actief = app.activeTrophies();
  const vast = actief.filter(t => !t.perfect);
  const perfect = actief.filter(t => t.perfect);
  check(vast.length === VASTE_KAST, `F · het vaste deel van de kast blijft op ${VASTE_KAST} trofeeën`,
    vast.length + ': ' + JSON.stringify(vast.map(t => t.id)));
  check(perfect.length === WORLDS.length, 'F · en precies één perfecte wereld per wereld',
    perfect.length + ' bij ' + WORLDS.length + ' werelden');
  check(actief.length === vast.length + WORLDS.length, 'F · samen is dat de hele kast, er hangt niets buiten',
    actief.length);
  check(perfect.every(t => t.id.indexOf(app.PERFECT_BADGE) === 0),
    'F · en een perfecte wereld is te herkennen aan zijn id',
    JSON.stringify(perfect.filter(t => t.id.indexOf(app.PERFECT_BADGE) !== 0).map(t => t.id)));
  check(TROPHY_SHELVES.length === 4, 'F · en er zijn vier planken', TROPHY_SHELVES.length);
  /* "Nog 1 sommen" is geen zin. unitText() zet een voortgangslabel in het
     enkelvoud via TROPHY_UNIT_SINGULAR, en dat is een tabel die per trofee
     bijgewerkt moet worden -- precies het soort regel dat vergeten wordt. Dus:
     elk label dat een actieve trofee werkelijk teruggeeft moet bij één stuk iets
     ánders opleveren dan bij twee. Geldt vanzelf ook voor een trofee die er
     later bij komt. */
  const meervoud = new Set();
  actief.forEach(t => { if (t.progress) { try { meervoud.add(t.progress(app.defaultProfile('Enk', 'dress_roze')).label); } catch (e) { /* zie de lakmoesproef hieronder */ } } });
  meervoud.forEach(label => check(app.unitText(label, 1) !== app.unitText(label, 2),
    `F · "${label}" heeft een enkelvoud voor "Nog 1 ..."`,
    'unitText geeft twee keer "' + app.unitText(label, 1) + '" -- vul TROPHY_UNIT_SINGULAR aan'));
  // Een plank met één kaartje is geen plank; elke plank moet er minstens twee hebben.
  TROPHY_SHELVES.forEach(sh => check(sh.ids.filter(id => !app.isRetiredTrophy(id)).length >= 2,
    `F · plank ${sh.key} heeft meer dan één trofee`, sh.ids.length));
  // Eén per wereld, op de perfecte plank -- en géén wereldbadge meer.
  const plank = key => (TROPHY_SHELVES.filter(s => s.key === key)[0] || { ids: [] }).ids;
  WORLDS.forEach(w => {
    check(ids.includes(app.PERFECT_BADGE + w.id), `F · ${w.id}: er is een perfecte-wereldtrofee`, app.PERFECT_BADGE + w.id);
    check(!ids.includes(app.WERELD_BADGE + w.id), `F · ${w.id}: en géén losse wereldbadge meer`, app.WERELD_BADGE + w.id);
    check(app.isRetiredTrophy(app.WERELD_BADGE + w.id), `F · ${w.id}: de oude badge geldt als gepensioneerd`, w.id);
    check(plank('perfect').includes(app.PERFECT_BADGE + w.id), `F · ${w.id}: en de trofee op de perfecte plank`, w.id);
    const t = TROPHIES.filter(x => x.id === app.PERFECT_BADGE + w.id)[0];
    check(t && t.wereld === w, `F · ${w.id}: de trofee kent zijn eigen wereld (voor het medaillon)`, w.id);
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
    check(badge(app.PERFECT_BADGE + w.id).has(vol) === true, `F · ${w.id}: de perfecte-wereldtrofee van een volgespeelde wereld`, 'niet behaald');
  });
  /* Wie alles op drie sterren heeft en alles gekocht heeft, heeft de hele kast --
     en dat is precies waar de kastteller op staat. Valt dit om, dan is er een
     trofee bijgekomen die niemand kan halen. */
  check(app.earnedActiveCount({ trophies: actief.map(t => t.id) }) === actief.length,
    'F · de kastteller telt precies de actieve trofeeën', app.earnedActiveCount({ trophies: actief.map(t => t.id) }));
  const oudeSave = { trophies: actief.map(t => t.id).concat(Array.from(app.RETIRED_TROPHIES)).concat(['wereld-muziek']) };
  check(app.earnedActiveCount(oudeSave) === actief.length,
    'F · en gepensioneerde id\'s uit een oude save tellen niet mee', app.earnedActiveCount(oudeSave));
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
  /* FASE 6B -- geen enkele wereldtekening in de vooraf-lijst. Die lijst wordt bij
     het installeren in één keer opgehaald; staat er een wereld in, dan betaalt élk
     kind bij élke uitgave voor élke wereld, ook de werelden waar het nooit komt.
     En het is precies het soort regel dat er per ongeluk bij komt als er een
     wereld wordt toegevoegd. */
  check(!lijst.some(p => p.includes('/assets/')),
    'G · en er staat geen wereldtekening in de vooraf-lijst', lijst.filter(p => p.includes('/assets/')).join(', '));
  /* En de service worker weet niet wélke werelden er zijn. Zodra daar een id of
     een pad in staat is er een tweede plek die bij elke nieuwe wereld bijgewerkt
     moet worden -- en die wordt vergeten. */
  const noemtWereld = WORLDS.map(w => w.id).filter(id => new RegExp("['\"/]" + id + "[-'\"./]").test(sw));
  check(!noemtWereld.length, 'G · en hij noemt geen enkele wereld bij naam', noemtWereld.join(', '));
  /* Elke voorraad die hij aanmaakt moet ook op de bewaarlijst staan. Staat hij er
     niet bij, dan gooit activate() hem bij elke nieuwe versie meteen weer weg --
     stil, en je merkt het alleen aan verkeer dat je niet ziet. */
  const namen = [...sw.matchAll(/^const ([A-Z_]*CACHE) = '([^']+)'/gm)].map(m => m[1]);
  const houd = (sw.match(/const HUIDIG = \[([^\]]*)\]/) || [, ''])[1];
  namen.forEach(n => check(houd.includes(n), `G · ${n} staat op de bewaarlijst van activate`, houd.trim()));
  check(namen.length >= 2, 'G · en er zijn er minstens twee (schil en tekeningen)', namen.join(', '));
  // Het manifest wijst naar bestaande iconen.
  const man = JSON.parse(fs.readFileSync(path.join(WORTEL, 'manifest.json'), 'utf8'));
  man.icons.forEach(ic => check(fs.existsSync(path.join(WORTEL, ic.src)), `G · icoon ${ic.src} bestaat`, ic.src));
  /* De naam die het kind ziet staat op drie plekken: de tabtitel, de kop van het
     keuzescherm en het manifest. Lopen die uit elkaar, dan heet de app op de
     telefoon anders dan in het spel -- en dat merk je pas na het installeren. */
  const NAAM = 'Rekensterren';
  const indexBron = process.env.RP_INDEX ? path.resolve(process.env.RP_INDEX) : path.join(WORTEL, 'index.html');
  const indexHtml = fs.readFileSync(indexBron, 'utf8');
  const titel = (indexHtml.match(/<title>([^<]*)<\/title>/) || [, ''])[1];
  /* De kop van het keuzescherm is een tekening geworden (assets/branding/), dus de
     naam staat daar in de alt. Dát is waar deze controle over gaat: de naam die een
     kind ziet -- en een schermlezer voorleest -- hoort dezelfde te zijn. */
  const kop = (indexHtml.match(/<h1 class="spellogo">[\s\S]*?alt="([^"]*)"/) || [, ''])[1];
  check(titel.includes(NAAM), `G · de tabtitel noemt ${NAAM}`, titel);
  check(kop.trim() === NAAM, `G · de kop van het keuzescherm is ${NAAM}`, kop);
  check(man.name === NAAM, `G · het manifest heet ${NAAM}`, man.name);
  check(man.short_name === NAAM, `G · en de korte naam ook`, man.short_name);
  /* Een andere start_url of scope maakt voor een geïnstalleerde app een níéuwe
     app: de oude blijft als dood icoon op het beginscherm staan. Een hernoeming
     hoort daar nooit aan te komen. */
  check(man.start_url === './' && man.scope === './',
    'G · start_url en scope blijven ./ (dezelfde geïnstalleerde app)', `${man.start_url} / ${man.scope}`);
});

/* ================= H · Het ene bestand =================
   index.html is het spel, het stijlblad en de code in één. Dat is met opzet, maar
   het betekent ook dat één verkeerd teken drie dingen tegelijk kan slopen zónder
   dat er ergens een foutmelding komt. Deze drie zijn in fase 6B allemaal een keer
   echt misgegaan bij het schrijven van die fase zelf. */
zaak('H', () => {
  // Dezelfde regel als in app.js: met RP_INDEX kijkt de keuring naar een ander
  // bestand, en deze zaak hoort dan naar dát bestand te kijken en niet naar het
  // spel ernaast (zie docs/TESTEN.md over het nameten van de keuring zelf).
  const bron = process.env.RP_INDEX ? path.resolve(process.env.RP_INDEX) : path.join(WORTEL, 'index.html');
  const html = fs.readFileSync(bron, 'utf8');

  /* 1. Commentaar dat dichtgaat.
     Een /* ... *\/ waarin per ongeluk een tweede *\/ staat sluit hálverwege af.
     De rest van die uitleg wordt dan CSS, en de browser gooit alles weg tot hij
     weer iets herkent -- inclusief de regel die eronder stond. Geen console, geen
     melding, alleen een regel die er wel staat en niets doet. */
  const stijl = html.slice(html.indexOf('<style>') + 7, html.indexOf('</style>'));
  let i = 0, open = false, scheef = null, regel = 1;
  while (i < stijl.length && !scheef) {
    if (stijl[i] === '\n') regel++;
    if (!open && stijl.startsWith('/*', i)) { open = true; i += 2; continue; }
    if (!open && stijl.startsWith('*/', i)) { scheef = 'losse */ op regel ' + regel; break; }
    if (open && stijl.startsWith('*/', i)) { open = false; i += 2; continue; }
    if (open && stijl.startsWith('/*', i)) { scheef = '/* binnen commentaar op regel ' + regel; break; }
    i++;
  }
  check(!scheef && !open, 'H · het commentaar in het stijlblad gaat overal weer dicht',
    scheef || 'een /* gaat nooit meer dicht');

  /* 2. Eén scriptblok.
     test/app.js knipt de code eruit met indexOf('<script>') en lastIndexOf. Staat
     dat woord ergens anders -- ook in een opmerking -- dan knipt hij op de
     verkeerde plek en vallen álle node-suites om met een syntaxfout die niets met
     het spel te maken heeft. */
  const tel = (naald) => html.split(naald).length - 1;
  check(tel('<script>') === 1, 'H · er is precies één <' + 'script>', tel('<script>'));
  check(tel('</' + 'script>') === 1, 'H · en precies één afsluiting', tel('</' + 'script>'));

  /* 2b. En dat blok komt uit src/.
     Sinds de bouw (test/bouw.js) is src/ de bron en is het scriptblok in
     index.html het resultaat. Die twee kunnen uit elkaar lopen op precies één
     manier: iemand bewerkt het scriptblok rechtstreeks. Dat werkt -- het spel
     draait er gewoon op -- en het is weg zodra er voor iets anders gebouwd
     wordt. Een wijziging die het een dag later zonder melding begeeft is het
     ergste soort, dus staat de controle hier en niet in de bouw: `npm run check`
     draai je sowieso, `npm run bouw` alleen als je eraan denkt.

     Niet met RP_INDEX: dan kijkt de keuring naar een nagemaakt bestand dat
     helemaal niet uit deze src/ hoeft te komen (zie docs/TESTEN.md). */
  if (!process.env.RP_INDEX) {
    const mis = require('./bouw').achterstand();
    check(!mis, 'H · het scriptblok komt uit src/ (draai `npm run bouw`)', mis || '');
  }

  /* 3. Tekeningen van een verstandig formaat.
     Geen begroting (die staat bij B, per wereld) maar een vangrail: een bestand
     dat per ongeluk tien keer zo groot wordt, en twee tekeningen die byte voor
     byte hetzelfde zijn. Dat laatste is in fase 6A twee keer gevonden -- kopieën
     van de Snoepwereld die als een eigen wereld in de lijst stonden. */
  /* 3b. De letterladder blijft een ladder.
     Sinds het kleur- en letterstelsel komt élke lettermaat die woorden zet uit
     zeven tokens (zie §5 van de afspraak bovenaan het blad). Wat dit bewaakt is
     niet de ladder zelf maar de manier waarop hij vorige keer verdween: er stonden
     vijfenzeventig maten in het blad, en de helft daarvan was een halve pixel --
     12.5 naast 13, 14.5 naast 15, 16.5 naast 17. Niemand kiest zoiets bewust; het
     ontstaat door één regel te kopiëren en er een tikje aan te draaien tot het
     "goed" staat. Een halve pixel is op geen enkel toestel te zien, dus wie er een
     schrijft heeft in werkelijkheid geen maat gekozen maar een maat vermeden.

     De regel is daarom scherp en makkelijk te volgen: hele pixels, of een token. */
  const LADDER = ['--tx-mini', '--tx-klein', '--tx-label', '--tx-body',
                  '--tx-sub', '--tx-kop', '--tx-groot'];
  LADDER.forEach(t => check(new RegExp(t + ':\\s*\\d+px').test(stijl),
    `H · de letterladder heeft ${t}`, t));
  const halve = [...stijl.matchAll(/font-size:\s*(\d+\.\d+px)/g)].map(m => m[1]);
  check(!halve.length, 'H · geen enkele lettermaat is een halve pixel', halve.join(', '));
  const uitLadder = [...stijl.matchAll(/font-size:\s*var\((--tx-[a-z-]+)\)/g)].map(m => m[1]);
  check(uitLadder.length > 100, 'H · en de ladder wordt ook echt gelezen', uitLadder.length);

  /* 3c. Goud betekent nog iets.
     "Verdiend" stond ooit met eenenveertig verschillende gouden drietallen in het
     blad -- allemaal net naast elkaar, en daarmee betekende goud niets meer. Nu
     zijn er vijf warme gronden met elk een eigen rol (--goud-rgb, --goud-glans-rgb,
     --goud-gloed-rgb, --warm-licht-rgb, --voetlicht-rgb). Deze controle laat ruimte
     voor een handvol echte uitzonderingen en slaat aan zodra het er weer een
     verzameling wordt. Vandaag staan er twee: twee warme bijna-witten die bij wit
     horen en niet bij goud. De grens ligt op vijf, zodat er ruimte is voor een
     echte uitzondering en hij aanslaat ruim voordat het er weer veertig zijn. */
  const gouden = new Set([...stijl.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)]
    .filter(m => +m[1] >= 250 && +m[2] >= 140 && +m[2] <= 250 && +m[3] <= 210)
    .map(m => m.slice(1, 4).join(',')));
  check(gouden.size <= 5, 'H · goud wordt met een handvol gronden geschreven, niet met veertig',
    gouden.size + ': ' + [...gouden].join(' / '));

  /* 3d. De letter komt van de eigen schijf.
     De app moet het doen op een tablet zonder net. Een <link> naar Google is dan
     geen lettertype maar een gok -- en het is meteen het enige verzoek dat deze app
     naar buiten zou doen. Zie de noot bij @font-face bovenaan het blad. */
  const buiten = [...html.matchAll(/(?:href|src)\s*=\s*["']([^"']*fonts\.g[^"']*)["']/g)].map(m => m[1]);
  check(!buiten.length, 'H · de app haalt geen lettertype van buiten', buiten.join(', '));
  const gezichten = [...stijl.matchAll(/@font-face[\s\S]*?src:\s*url\('([^']+)'\)/g)].map(m => m[1]);
  check(gezichten.length >= 1, 'H · en er is minstens één eigen @font-face', gezichten.join(', '));
  gezichten.forEach(f => {
    check(fs.existsSync(path.join(WORTEL, f)), `H · ${f} staat ook echt op schijf`, f);
    if (!fs.existsSync(path.join(WORTEL, f))) return;
    const kb = Math.round(fs.statSync(path.join(WORTEL, f)).size / 1024);
    check(kb < 80, `H · ${f} blijft klein genoeg om mee te sturen`, kb + ' kB');
  });
  /* En de licentie ligt ernaast. Fredoka staat onder de SIL Open Font License, en
     die vraagt om precies één ding: dat de tekst meereist met het bestand. */
  check(fs.existsSync(path.join(WORTEL, 'assets', 'font', 'OFL.txt')),
    'H · de licentie van het lettertype ligt bij het lettertype', 'assets/font/OFL.txt');

  const crypto = require('crypto');
  const map = path.join(WORTEL, 'assets', 'world');
  const bestanden = fs.existsSync(map) ? fs.readdirSync(map).filter(f => /\.(webp|png|jpe?g|avif)$/i.test(f)) : [];
  check(bestanden.length > 0, 'H · er liggen wereldtekeningen', bestanden.length);
  const hashes = {};
  bestanden.forEach(f => {
    const buf = fs.readFileSync(path.join(map, f));
    const kb = Math.round(buf.length / 1024);
    check(kb < 700, `H · ${f} is niet buitensporig groot`, kb + ' kB');
    check(kb > 20, `H · ${f} is geen lege plaatshouder`, kb + ' kB');
    const h = crypto.createHash('sha1').update(buf).digest('hex');
    check(!hashes[h], `H · ${f} is niet dezelfde tekening als een andere`, hashes[h] || '');
    hashes[h] = f;
  });
});

/* ================= I · Het merk =================
   Drie merkbeelden, elk met één meester in assets/branding/source/ en een stel
   afgeleiden die de app écht laadt. De meesters zijn groot en verliesloos bedoeld;
   ze staan in de map om een nieuwe afgeleide van te kunnen maken, niet om over de
   telefoondata van een gezin te gaan.

   Waar dat misgaat, gaat het stil mis: iemand zet het pad van een meester in de
   opmaak omdat dat de scherpste is, en niemand ziet het -- het beeld klopt, alleen
   het laden duurt drie keer zo lang. Vandaar deze zaak. */
zaak('I', () => {
  const merk = require('./merk.js');
  const lees = f => fs.readFileSync(path.join(WORTEL, f), 'utf8');
  const bron = process.env.RP_INDEX ? fs.readFileSync(path.resolve(process.env.RP_INDEX), 'utf8')
    : lees('index.html');
  const runtime = bron + lees('sw.js') + lees('manifest.json');

  merk.AFGELEID.forEach(d => {
    const meester = path.join(merk.BRON, d.bron);
    check(fs.existsSync(meester), `I · de meester ${d.bron} ligt er`, d.bron);
    const uit = path.join(WORTEL, d.uit);
    check(fs.existsSync(uit), `I · en ${d.uit} is ervan gemaakt (npm run merk)`, d.uit);
    if (!fs.existsSync(uit)) return;
    const kb = Math.round(fs.statSync(uit).size / 1024);
    check(kb < 250, `I · ${d.uit} blijft klein genoeg om te laden`, kb + ' kB');
    check(kb > 3, `I · ${d.uit} is geen lege plaatshouder`, kb + ' kB');
  });

  /* Alles wat de app óphaalt: elke src=, href= en url() in index.html, plus de
     iconen uit het manifest en de vooraf-lijst van de service worker. Op de
     áánvraag kijken en niet op het voorkomen van de tekst, want het pad van een
     meester mag best in een opmerking of in de studio-uitleg staan -- alleen niet
     in een regel die hem binnenhaalt. */
  const gevraagd = [
    ...[...runtime.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)].map(m => m[1]),
    ...[...runtime.matchAll(/url\(\s*["']?([^"')]+)/g)].map(m => m[1]),
    ...[...lees('sw.js').match(/const ASSETS = \[([^\]]*)\]/)[1]
         .split(',').map(x => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)],
  ];
  const meesters = gevraagd.filter(u => u.includes('branding/source'));
  check(!meesters.length, 'I · geen enkele meester wordt door de app opgehaald', meesters.join(', '));

  /* En wat de app wél ophaalt bestaat. Een spelogo dat 404't laat het startscherm
     met een lege regel achter waar de naam van het spel hoort te staan. */
  const genoemd = [...new Set(gevraagd.filter(u => u.startsWith('assets/branding/')))];
  check(genoemd.length > 0, 'I · de app haalt tenminste één merkbestand op', genoemd.join(', '));
  genoemd.forEach(f => check(fs.existsSync(path.join(WORTEL, f)),
    `I · ${f} staat ook echt op schijf`, f));

  /* Het manifest-icoon: één maskeerbaar en minstens één gewoon. Een icoon dat
     álletwee is (purpose "any maskable") wordt op een Android-launcher bijgesneden
     én in een browsertab ongesneden getoond -- één van die twee is dan fout. */
  const man = JSON.parse(lees('manifest.json'));
  const maskeer = man.icons.filter(i => (i.purpose || '').split(/\s+/).includes('maskable'));
  const gewoon = man.icons.filter(i => (i.purpose || 'any').split(/\s+/).includes('any'));
  check(maskeer.length === 1, 'I · het manifest heeft precies één maskeerbaar icoon',
    maskeer.map(i => i.src).join(', '));
  check(gewoon.length >= 1 && !gewoon.some(i => maskeer.includes(i)),
    'I · en de gewone iconen zijn andere bestanden', gewoon.map(i => i.src).join(', '));
  check(man.icons.some(i => i.sizes === '192x192') && man.icons.some(i => i.sizes === '512x512'),
    'I · met 192 en 512 erbij', man.icons.map(i => i.sizes).join(', '));
  /* Het favicon en het iOS-icoon wijzen naar een bestand dat er is. iOS kijkt niet
     in het manifest, dus die regel is de enige die daar iets over zegt. */
  [...bron.matchAll(/<link rel="(?:apple-touch-)?icon" href="([^"]+)"/g)].forEach(m =>
    check(fs.existsSync(path.join(WORTEL, m[1])), `I · ${m[1]} uit de <head> bestaat`, m[1]));
});

klaar();
