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
 *   D  de volgorde         -> van jou · te koop · te verdienen
 *   E  net gekocht         -> blijft staan waar het kind het aantikte
 *   F  verdiende beloning  -> hoort bij "van jou" en niet meer bij "te verdienen"
 *   G  oude saves          -> podia blijven bestaan, maar niet in de winkel
 *
 * Draaien:
 *   npm run test:kleedkamer      (of: npm test voor alle suites)
 */
const { laadApp } = require('./app');
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

/* ---- D · De volgorde in het rek. Drie groepen, en die volgorde is het antwoord
   op "wat heb ik, en wat kan ik kiezen?". Binnen een groep loopt de prijs op. --- */
zaak('D · de volgorde', () => {
  const { app, p } = verseSter();
  p.owned.push('dress_disco');   // duur, maar van haar: hoort dus bóven de koopjes
  const lijst = rek(app, 'dress');
  const groep = id => p.owned.includes(id) ? 0 : (app.isBeloning(id) ? 2 : 1);
  const groepen = lijst.map(groep);
  check(groepen.join() === groepen.slice().sort().join(),
    'D · eerst van jou, dan te koop, dan te verdienen', JSON.stringify(lijst));
  check(lijst.indexOf('dress_disco') < lijst.indexOf('dress_geel'),
    'D · een duur stuk dat al van je is staat bóven een goedkoop koopje', JSON.stringify(lijst));
  const koop = lijst.filter(id => groep(id) === 1).map(id => app.item(id).price);
  check(koop.join() === koop.slice().sort((a, b) => a - b).join(),
    'D · en binnen de koopjes loopt de prijs op', JSON.stringify(koop));
  // De zes beloningen staan bij elkaar achteraan, in de volgorde van de werelden.
  const acc = rek(app, 'acc');
  const staart = acc.slice(-app.WORLDS.filter(w => w.beloning).length);
  check(staart.join() === app.WORLDS.map(w => w.beloning).filter(Boolean).join(),
    'D · de wereldbeloningen sluiten de rij, op wereldvolgorde', JSON.stringify(staart));
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
  check(erna.indexOf('dress_rood') < erna.indexOf('dress_geel'),
    'E · en daarna staat het bij haar eigen spullen', JSON.stringify(erna));
});

/* ---- F · Een verdiende wereldbeloning. Zodra ze hem heeft is het gewoon een van
   haar spullen: bovenaan bij de rest, en niet meer op slot achteraan. --------- */
zaak('F · een verdiende beloning', () => {
  const { app, p } = verseSter();
  p.owned.push('acc_wereld_jungle');
  const lijst = rek(app, 'acc');
  check(lijst.indexOf('acc_wereld_jungle') === 0,
    'F · hij staat bij haar eigen spullen, niet meer achteraan', JSON.stringify(lijst));
  const nog = lijst.slice(-5);
  check(nog.every(id => app.isBeloning(id) && !p.owned.includes(id)),
    'F · en wat ze nog niet heeft sluit de rij', JSON.stringify(nog));
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

klaar();
