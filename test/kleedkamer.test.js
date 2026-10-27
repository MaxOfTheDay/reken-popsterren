/*
 * De kleedkamer en de diamanteneconomie, zonder browser.
 *
 * Wat een kind ziet -- de pop, de kaartjes, de balk -- staat in de browsersuites
 * (rondgang.test.js en beloning.test.js). Hier staat de laag eronder: de catalogus
 * en de volgorde waarin het rek zijn spulletjes neerzet. Dat is puur rekenwerk op
 * ITEMS, CATS en p.owned, en het is precies de laag waar een stille fout het
 * langst onopgemerkt blijft -- een prijs die per ongeluk op een wereldbeloning
 * belandt, een categorie die leegloopt, een startster die in geen enkele
 * categorie iets kan kopen.
 *
 * De zaken:
 *   A  de catalogus        -> elk spulletje is óf te koop óf te verdienen
 *   B  de categorieën      -> geen lege, geen categorie met één obscuur stuk
 *   C  de eerste keuze     -> een verse ster kan meteen ergens iets kiezen
 *   D  de volgorde         -> van jou eerst, dan de koopjes op prijs
 *   E  net gekocht         -> blijft staan waar het kind het aantikte
 *   F  verdiende beloning  -> hoort bij "van jou", en een niet-verdiende nergens
 *   G  oude saves          -> podia blijven bestaan, maar niet in de winkel
 *   H  Podia               -> drie stukken per wereld, en van jou is afgeleid
 *
 * Draaien:
 *   npm run test:kleedkamer      (of: npm test voor alle suites)
 */
/* Het spel zoals een kind het heeft: alleen de uitgebrachte werelden. Een wereld
   die al in WORLDS staat maar nog dicht is (released:false) hoort hier niet bij --
   zie alleenUitgebracht in test/app.js. */
const harnas = require('./app');
const laadApp = o => harnas.laadApp(Object.assign({ alleenUitgebracht: true }, o));
const heropen = harnas.heropen;
const { check, zaak, klaar } = require('./meld')('kleedkamer');

/* ---- gereedschap ---- */

function verseSter(naam) {
  const app = laadApp();
  app.db.profiles.p1 = app.defaultProfile(naam || 'Roos', 'dress_roze');
  app.zetSpeler('p1');
  app.normalizeProfiles();
  return { app, p: app.db.profiles.p1 };
}

// De volgorde waarin het rek een categorie neerzet, als lijst met id's. Gaat door
// shopItems() heen -- dezelfde functie die renderShop gebruikt, dus dit meet wat
// een kind echt te zien krijgt en niet een nagebouwde sortering.
function rek(app, cat) {
  return app.run(`shopCat = ${JSON.stringify(cat)}; shopItems(P()).map(i => i.id)`);
}
// Idem, maar met een spulletje dat nét gekocht is (het "Nieuw!"-moment loopt nog).
function rekNaAankoop(app, cat, id) {
  return app.run(`shopCat = ${JSON.stringify(cat)}; shopJustBoughtId = ${JSON.stringify(id)};`
    + ` const r = shopItems(P()).map(i => i.id); shopJustBoughtId = null; r`);
}
const winkelCats = app => app.CATS.map(c => c.id);
const vanCat = (app, cat) => app.ITEMS.filter(i => i.cat === cat);

/* ---- A · De catalogus: te koop óf te verdienen, nooit allebei en nooit geen van
   beide. Een spulletje zonder prijs dat géén wereldbeloning is, is onbereikbaar;
   een wereldbeloning mét prijs is te koop, en dan is de wereld uitspelen ineens
   de dure weg naar hetzelfde ding. -------------------------------------------- */
zaak('A · de catalogus', () => {
  const { app } = verseSter();
  const zonderPrijs = [], beloningMetPrijs = [], rareP = [];
  for (const it of app.ITEMS) {
    const beloning = app.isBeloning(it.id);
    if (beloning && it.price != null) beloningMetPrijs.push(it.id);
    if (!beloning && typeof it.price !== 'number') zonderPrijs.push(it.id);
    if (!beloning && (it.price < 0 || !Number.isFinite(it.price))) rareP.push(it.id);
  }
  check(beloningMetPrijs.length === 0,
    'A · een wereldbeloning heeft geen prijs', JSON.stringify(beloningMetPrijs));
  check(zonderPrijs.length === 0,
    'A · al het andere heeft er wél een', JSON.stringify(zonderPrijs));
  check(rareP.length === 0,
    'A · en dat is een gewoon, niet-negatief getal', JSON.stringify(rareP));
  // De zes van de werelden, en niet meer dan zes: elk wereld-id komt uit WORLDS.
  const beloningen = app.ITEMS.filter(i => app.isBeloning(i.id)).map(i => i.id);
  const uitWerelden = app.WORLDS.map(w => w.beloning).filter(Boolean);
  check(beloningen.length === uitWerelden.length && beloningen.every(id => uitWerelden.includes(id)),
    'A · de beloningen zijn precies wat de werelden uitdelen', JSON.stringify([beloningen, uitWerelden]));
});

/* ---- B · De categorieën. Elke tab in de kleedkamer moet iets te kiézen geven:
   een lege tab is een dood spoor, en een tab met één stuk is een tab die er niet
   hoort te zijn. Drie is de ondergrens waarop "kiezen" nog iets betekent. ------ */
zaak('B · de categorieën', () => {
  const { app } = verseSter();
  const leeg = [], mager = [];
  for (const cat of winkelCats(app)) {
    const alles = vanCat(app, cat);
    const koopbaar = alles.filter(i => !app.isBeloning(i.id));
    if (!alles.length) leeg.push(cat);
    else if (koopbaar.length < 3) mager.push(cat + ':' + koopbaar.length);
  }
  check(leeg.length === 0, 'B · geen lege categorie', JSON.stringify(leeg));
  check(mager.length === 0, 'B · en overal valt er echt te kiezen', JSON.stringify(mager));
  // Podia zijn sinds fase 1 geen koopbare categorie meer. De items blijven
  // bestaan (ze zijn nog altijd het decor), maar er hoort geen tab naar te wijzen.
  check(!winkelCats(app).includes('stage'),
    'B · podia staan niet meer in de winkel', JSON.stringify(winkelCats(app)));
  check(vanCat(app, 'stage').length > 0,
    'B · maar ze bestaan nog wel als decor', String(vanCat(app, 'stage').length));
});

/* ---- C · De eerste keuze. Een verse ster krijgt diamanten mee; in élke
   categorie hoort daar iets voor te vinden te zijn. Anders staat een kind voor
   een rij prijzen die allemaal te hoog zijn -- en dat is precies het gevoel dat
   de diamanten juist níét moeten geven. ---------------------------------------- */
zaak('C · de eerste keuze', () => {
  const { app, p } = verseSter();
  const start = p.diamonds;
  const teDuur = [];
  for (const cat of winkelCats(app)) {
    const prijzen = vanCat(app, cat).filter(i => !app.isBeloning(i.id)).map(i => i.price);
    if (Math.min(...prijzen) > start) teDuur.push(cat + ':' + Math.min(...prijzen));
  }
  check(start > 0, 'C · een verse ster begint met diamanten', String(start));
  check(teDuur.length === 0,
    'C · en kan in elke categorie meteen iets kiezen', JSON.stringify([start, teDuur]));
});

/* ---- D · De volgorde in het rek. Twee groepen, en die volgorde is het antwoord
   op "wat heb ik, en wat kan ik kiezen?". Binnen een groep loopt de prijs op. --- */
zaak('D · de volgorde', () => {
  // dress_oranje is het goedkoopste koopje: de vijf startkleuren zijn van haar
  const { app, p } = verseSter();
  p.owned.push('dress_disco');   // duur, maar van haar: hoort dus bóven de koopjes
  const lijst = rek(app, 'dress');
  const groep = id => p.owned.includes(id) ? 0 : 1;
  const groepen = lijst.map(groep);
  check(groepen.join() === groepen.slice().sort().join(),
    'D · eerst van jou, dan te koop', JSON.stringify(lijst));
  check(lijst.indexOf('dress_disco') < lijst.indexOf('dress_oranje'),
    'D · een duur stuk dat al van je is staat bóven een goedkoop koopje', JSON.stringify(lijst));
  const koop = lijst.filter(id => groep(id) === 1).map(id => app.item(id).price);
  check(koop.join() === koop.slice().sort((a, b) => a - b).join(),
    'D · en binnen de koopjes loopt de prijs op', JSON.stringify(koop));
  /* En de wereldschatten liggen er niet meer tussen (fase 6E). Ze stonden achteraan
     in de accessoirelade, op slot, tussen de prijzen -- precies de plek waar ze
     lazen als winkelwaar die toevallig niet te koop is. Wat je nog niet verdiend
     hebt hoort in het schattenvak, en nergens anders. */
  const acc = rek(app, 'acc');
  check(!acc.some(id => app.isBeloning(id)),
    'D · een nog niet verdiende wereldschat ligt niet in de gewone lade', JSON.stringify(acc));
});

/* ---- E · Net gekocht. Het spulletje verhuist pas naar de bezit-groep als het
   "Nieuw!"-moment voorbij is: anders springt het onder de vinger van het kind
   vandaan, precies op het moment dat het zijn aankoop wil zien. --------------- */
zaak('E · net gekocht', () => {
  const { app, p } = verseSter();
  const voor = rek(app, 'dress');
  p.owned.push('dress_rood');
  const tijdens = rekNaAankoop(app, 'dress', 'dress_rood');
  const erna = rek(app, 'dress');
  check(tijdens.join() === voor.join(),
    'E · tijdens het feestje staat alles nog waar het stond', JSON.stringify([voor, tijdens]));
  check(erna.indexOf('dress_rood') < erna.indexOf('dress_oranje'),
    'E · en daarna staat het bij haar eigen spullen', JSON.stringify(erna));
});

/* ---- F · Een verdiende wereldbeloning. Zodra ze hem heeft is het gewoon een van
   haar spullen: bovenaan bij de rest, en niet meer op slot achteraan. --------- */
zaak('F · een verdiende beloning', () => {
  const { app, p } = verseSter();
  p.owned.push('acc_wereld_jungle');
  const lijst = rek(app, 'acc');
  const eersteKoop = lijst.findIndex(id => !p.owned.includes(id));
  check(lijst.includes('acc_wereld_jungle') && lijst.indexOf('acc_wereld_jungle') < eersteKoop,
    'F · hij staat bij haar eigen spullen, bóven de koopjes', JSON.stringify(lijst));
  check(lijst.filter(id => app.isBeloning(id)).join() === 'acc_wereld_jungle',
    'F · en hij is de enige schat in die lade: de rest is nog geheim', JSON.stringify(lijst));
  // Blijft onverkoopbaar, ook als iemand de koopweg rechtstreeks aanroept.
  const { app: app2, p: p2 } = verseSter();
  p2.diamonds = 9999;
  app2.run('confirmShopBuy("acc_wereld_tover")');
  check(!p2.owned.includes('acc_wereld_tover') && p2.diamonds === 9999,
    'F · en een beloning blijft onverkoopbaar', JSON.stringify([p2.diamonds, p2.owned.length]));
});

/* ---- G · Een oude save. Wie ooit een podium kocht houdt het (het is nog altijd
   haar decor), maar het komt niet terug in de winkel -- en het rek van de
   categorieën die er wél zijn blijft gewoon kloppen. -------------------------- */
zaak('G · een oude save', () => {
  const { app, p } = verseSter();
  p.owned.push('stage_vulkaan', 'stage_ruimte');
  p.equipped.stage = 'stage_vulkaan';
  p.diamonds = 500;
  const diaVoor = p.diamonds;
  for (const cat of winkelCats(app)) {
    const lijst = rek(app, cat);
    check(lijst.every(id => app.item(id).cat === cat),
      'G · elke tab toont alleen zijn eigen spullen', cat + ' · ' + JSON.stringify(lijst));
    check(!lijst.some(id => app.item(id).cat === 'stage'),
      'G · en nergens een podium', cat + ' · ' + JSON.stringify(lijst));
  }
  check(p.equipped.stage === 'stage_vulkaan' && p.diamonds === diaVoor,
    'G · haar podium en haar diamanten blijven', JSON.stringify([p.equipped.stage, p.diamonds]));
});

/* ---- H · Podia. Elke wereld heeft een podium met drie stukken: de schat van die
   wereld en twee spulletjes uit de winkel. Heb je ze alle drie, dan is het podium
   van jou. Wat hier vastligt is dat dat afgeleid is -- uit ITEMS, WORLDS en
   p.owned, en nergens anders -- en dat de lade dezelfde horizon houdt als de reis.
   Hoe het eruitziet staat in beloning.test.js. ---------------------------------- */
zaak('H · Podia', () => {
  const { app, p } = verseSter();
  const podia = app.ITEMS.filter(i => i.cat === 'stage' && i.wereld);
  // elke uitgebrachte wereld met een schat heeft precies één podium
  for (let i = 0; i < app.WORLD_AVAIL; i++) {
    const w = app.WORLDS[i];
    if (!w.beloning || !app.item(w.beloning)) continue;
    const van = podia.filter(st => st.wereld === w.id);
    check(van.length === 1, 'H · elke wereld heeft één podium', w.id + ' · ' + JSON.stringify(van.map(x => x.id)));
  }
  // drie stukken, elk in een eigen plek, de schat in de hoed, geen spulletje in twee podia
  const gezien = new Map();
  for (const st of podia) {
    const stukken = app.podiumStukken(st);
    const plekken = stukken.map(it => it.cat);
    check(stukken.length === 3 && new Set(plekken).size === 3 && plekken[0] === 'acc' && app.isBeloning(stukken[0].id),
      'H · drie stukken in drie plekken, de schat voorop', st.id + ' · ' + JSON.stringify(stukken.map(x => x.id)));
    check(stukken.slice(1).every(it => typeof it.price === 'number'),
      'H · de twee andere stukken zijn te koop', st.id);
    stukken.forEach(it => {
      check(!gezien.has(it.id), 'H · een spulletje hoort bij hoogstens één podium', it.id + ' · ' + gezien.get(it.id) + ' + ' + st.id);
      gezien.set(it.id, st.id);
    });
    check(Array.isArray(st.vloer) && st.vloer.length === 4 && !!st.patroon,
      'H · elk podium heeft zijn vier kleuren en een patroon', st.id);
  }
  /* De lade houdt op bij de horizon, dezelfde als die van de reis: voor een verse
     ster wereld 1 plus REIS_VOORUIT, op wereldvolgorde, en alles op slot. */
  const horizon = app.laatsteZichtbareWereld(p);
  const zicht = app.WORLDS.map((w, i) => (i <= horizon && i < app.WORLD_AVAIL) ? podia.find(st => st.wereld === w.id) : null)
    .filter(Boolean).map(st => st.id);
  const lade = rek(app, app.PODIA_CAT);
  check(lade.join() === zicht.join() && lade.length < podia.length,
    'H · de lade toont de podia tot aan de horizon, op wereldvolgorde', JSON.stringify([lade, zicht]));
  check(lade.every(id => app.tagStand(app.item(id), p) === 'slot'),
    'H · een verse ster: alles nog op slot', JSON.stringify(lade.map(id => app.tagStand(app.item(id), p))));
  // de schat erbij: het podium kost wat er nog ontbreekt
  const jungle = app.item('stage_jungle');
  p.owned.push('acc_wereld_jungle');
  check(!app.podiumOpSlot(p, jungle) && app.podiumPrijs(p, jungle) === app.item('pet_aap').price + app.item('instr_drums').price,
    'H · met de schat kost het podium de twee andere stukken samen', JSON.stringify(app.podiumPrijs(p, jungle)));
  p.owned.push('pet_aap');
  check(app.podiumPrijs(p, jungle) === app.item('instr_drums').price && !app.podiumVanJou(p, jungle),
    'H · één stuk erbij, en de prijs zakt', JSON.stringify(app.podiumPrijs(p, jungle)));
  // kopen = de ontbrekende stukken kopen, en erop gaan staan
  p.diamonds = 500;
  app.run('confirmShopBuy("stage_jungle")');
  check(p.owned.includes('instr_drums') && !p.owned.includes('stage_jungle') && app.podiumVanJou(p, jungle)
    && p.equipped.stage === 'stage_jungle' && p.diamonds === 500 - app.item('instr_drums').price,
    'H · een podium kopen koopt de stukken, en ze staat erop',
    JSON.stringify([p.diamonds, p.equipped.stage, p.owned.slice(-3)]));
  app.run('shopJustBoughtId = null');   // het "Nieuw!"-moment is voorbij
  check(rek(app, app.PODIA_CAT)[0] === 'stage_jungle',
    'H · en het staat bovenaan, bij haar eigen spullen', JSON.stringify(rek(app, app.PODIA_CAT)));
  // dragen telt niet, bezitten wel: het aapje uit, het podium blijft
  p.equipped.pet = null;
  check(app.podiumVanJou(p, jungle), 'H · een stuk uitdoen kost haar het podium niet', '');
  // eraf stappen = terug op Disco
  app.run('unequipShopItem("stage")');
  check(p.equipped.stage === 'stage_disco', 'H · van een podium afstappen = Disco', JSON.stringify(p.equipped.stage));
  // zonder schat valt er niets te kopen, ook niet rechtstreeks
  const { app: app2, p: p2 } = verseSter();
  p2.diamonds = 9999;
  app2.run('confirmShopBuy("stage_vulkaan")');
  check(p2.diamonds === 9999 && p2.equipped.stage === 'stage_disco',
    'H · een podium zonder zijn schat is niet te koop', JSON.stringify([p2.diamonds, p2.equipped.stage]));
  // een schat die je niet hebt brengt je naar zijn podium
  check(app2.podiumVan('acc_wereld_vuur').id === 'stage_vulkaan' && app2.podiumVan('pet_draak').id === 'stage_vulkaan',
    'H · elk stuk weet bij welk podium het hoort', '');
});

/* ---- I · Mijn wens. Eén id in p.wens, en verder niets: wat de pil op de kaart
   toont wordt eruit afgeleid (wensItem). Wat er niet meer klopt hoort bij het
   openen te verdwijnen in plaats van een pil te laten wijzen naar iets dat je al
   hebt -- of naar een wereldschat, die nooit te koop is. ---------------------- */
zaak('I · mijn wens', () => {
  const { app, p } = verseSter();
  check(app.run('wensItem(P())') === null, 'I · een verse ster heeft geen wens', '');
  app.run(`P().wens = 'pet_draak'`);
  check(app.run('wensItem(P()) && wensItem(P()).id') === 'pet_draak', 'I · een wens is het spulletje zelf', '');
  const kleed = app.run(`wensTekenHTML(item('dress_geel'))`);
  check(app.run(`wensTekenHTML(item('pet_draak'))`) === '🐉' && /wens-tek/.test(kleed) && /<svg/.test(kleed),
    'I · de pil toont het emoji, of anders de tekening van het spulletje zelf', kleed.slice(0, 80));
  // al van jou: dan is het geen wens meer, ook zonder dat er iets opgeruimd is
  p.owned.push('pet_draak');
  check(app.run('wensItem(P())') === null, 'I · wat al van jou is, is geen wens', '');
  // bij het openen ruimt migrate op wat niet meer klopt, en laat een goede wens staan
  const proef = (wens, bezit) => {
    const { app: a, p: q } = verseSter();
    q.wens = wens; if (bezit) q.owned.push(wens);
    a.save();
    return heropen(a).db.profiles.p1.wens;
  };
  check(proef('pet_trex') === 'pet_trex', 'I · een goede wens overleeft het openen', '');
  check(proef('pet_bestaatniet') === undefined, 'I · een wens die niet bestaat gaat eruit', '');
  check(proef('pet_trex', true) === undefined, 'I · een wens die al van jou is gaat eruit', '');
  check(proef('acc_wereld_muziek') === undefined, 'I · een wereldschat kan geen wens zijn', '');
});

klaar();
