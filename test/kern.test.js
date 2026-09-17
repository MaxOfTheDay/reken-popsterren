/*
 * De kern van de voortgang, zonder browser.
 *
 * Wat hier vastligt is de rekenkundige kant van fase 4A en 4D: welke wereld is
 * uit, welke is de grens, wat is perfect, en wat krijg je ervoor. Diezelfde
 * regels worden in de browser óók aangeraakt (zie voortgang.test.js en
 * beloning.test.js) -- maar dáár via schermen, animaties en wachttijden. Hier
 * gaan ze rechtstreeks door de functies heen: honderden gevallen in een paar
 * tellen, zonder Chromium, zonder timing, en dus zonder "soms".
 *
 * De twee suites vullen elkaar aan en vervangen elkaar niet:
 *   voortgang/beloning  -- een kind speelt een show en ziet het resultaat
 *   kern (dit bestand)  -- de functies waar die schermen op staan
 *
 * De zaken:
 *   A  verse ster                       -> de eerste wereld is de grens
 *   B  halverwege                       -> de eerste onafgemaakte wereld
 *   C  alles uit                        -> geen grens, wél een toegift
 *   D  er komt later een wereld bij     -> leeg, en de nieuwe grens
 *   E  twee werelden tegelijk erbij     -> de eerste, en de tweede niet overslaan
 *   F  terugbladeren                    -> kijken verandert geen voortgang
 *   G  uit is uit                       -> nergens anders uit af te leiden
 *   H  nog niet uitgebracht             -> bestaat niet voor dit kind
 *   I  perfect                          -> alles op drie, en niet eerder
 *   J  beloningen                       -> één keer, en blijvend
 *   K  wereldlengtes                    -> een wereld hoeft geen acht shows te zijn
 *   L  de trofeeplanken                 -> groeien mee met de werelden
 *   M  trofeeën met pensioen           -> uit de kast, maar niet uit de save
 *
 * Draaien:
 *   npm run test:kern      (of: npm test voor alle suites)
 */
const { laadApp, heropen } = require('./app');
const { check, zaak, klaar } = require('./meld')('kern');

/* ---- gereedschap ---- */

// Een verse ster in een verse app. Precies wat een nieuw kind krijgt.
function verseSter(naam) {
  const app = laadApp();
  app.db.profiles.p1 = app.defaultProfile(naam || 'Roos', 'dress_roze');
  app.zetSpeler('p1');
  app.normalizeProfiles();
  return { app, p: app.db.profiles.p1 };
}

// Een wereld uitspelen door zijn sterren te zetten -- dat is wat endLevel doet en
// het is het énige wat een wereld uit maakt. `n` shows (standaard: alle).
function speel(app, p, i, opties) {
  opties = opties || {};
  const w = app.WORLDS[i], eerste = app.WORLD_START[i];
  const n = opties.shows == null ? w.levels : opties.shows;
  for (let k = 0; k < n; k++) p.stars[eerste + k] = opties.sterren == null ? 2 : opties.sterren;
  // De positie schuift mee, zoals in het spel: één voorbij wat er gespeeld is.
  p.level = Math.min(eerste + n, app.WORLD_LAST + 1);
}

// Een wereld achteraan bijzetten, zoals dat later echt gaat gebeuren. Bewust géén
// wereld 7 in index.html: dit is een testwereld, hij bestaat alleen hier.
function wereldErbij(app, id, opties) {
  opties = opties || {};
  app.WORLDS.push({
    id, name: 'Testwereld ' + id, icon: '🧪', levels: opties.levels || 8,
    beloning: opties.beloning, released: opties.released,
  });
  app.rebuildWorldStarts();
  app.rebuildWorldBadges();
  return app.WORLDS.length - 1;
}

// Alleen de eerste `n` werelden uitbrengen; de rest staat klaar maar is dicht.
function breng(app, n) {
  app.WORLDS.forEach((w, i) => { if (i < n) delete w.released; else w.released = false; });
  app.rebuildWorldStarts();
}

const uitLijst = (app, p) => app.WORLDS.map((w, i) => app.worldDone(p, i));
const kopie = x => JSON.parse(JSON.stringify(x));

/* ================= A · Verse ster =================
   Niets gespeeld: de eerste wereld is de grens, en er is niets uit. */
zaak('A', () => {
  const { app, p } = verseSter();
  check(app.frontierWorld(p) === 0, 'A · de grens is de eerste wereld', app.frontierWorld(p));
  check(app.continueWorld(p) === 0, 'A · "verder" wijst naar de eerste wereld', app.continueWorld(p));
  check(!app.allWorldsDone(p), 'A · dit is geen toegift-stand', app.allWorldsDone(p));
  check(uitLijst(app, p).every(x => !x), 'A · geen enkele wereld telt als uitgespeeld', JSON.stringify(uitLijst(app, p)));
  check(app.doneWorldCount(p) === 0 && app.totalStarCount(p) === 0 && app.playedCount(p) === 0,
    'A · alle tellers staan op nul', [app.doneWorldCount(p), app.totalStarCount(p), app.playedCount(p)].join('/'));
  check(app.hereLevel(p) === 1, 'A · en ze staat op level 1', app.hereLevel(p));
});

/* ================= B · Halverwege =================
   Twee werelden uit, de derde half. De grens is die derde -- en de werelden
   dáárna raken er niet stilletjes van in de uit-stand. */
zaak('B', () => {
  const { app, p } = verseSter();
  speel(app, p, 0); speel(app, p, 1);
  speel(app, p, 2, { shows: 3 });
  const uit = uitLijst(app, p);
  check(uit[0] && uit[1] && !uit[2], 'B · twee werelden uit, de derde niet', JSON.stringify(uit));
  check(uit.slice(3).every(x => !x), 'B · de werelden daarna raken niet vanzelf uit', JSON.stringify(uit));
  check(app.frontierWorld(p) === 2 && app.continueWorld(p) === 2, 'B · de derde wereld is de grens', app.frontierWorld(p));
  check(!app.allWorldsDone(p), 'B · en dat is geen toegift', app.allWorldsDone(p));
  const v = app.worldProgress(p, app.worldForIndex(2));
  check(v.gespeeld === 3 && !v.uit && !v.vol, 'B · de halve wereld telt drie shows', JSON.stringify(v));
});

/* ================= C · Alles uit: de toegift =================
   Er is niets meer te ontgrendelen. "Verder" wijst naar de laatste échte wereld,
   en er wordt geen zevende wereld uit de lucht gegrepen. */
zaak('C', () => {
  const { app, p } = verseSter();
  const laatste = app.WORLDS.length - 1;
  // De vorm van de tournee vóór er ook maar iets gespeeld is. Uitspelen mag daar
  // niets aan veranderen -- en dat is de vraag, niet of het er zes zijn.
  const vorm = [app.WORLDS.length, app.WORLD_AVAIL, app.WORLD_LAST].join('/');
  for (let i = 0; i < app.WORLDS.length; i++) speel(app, p, i);
  check(app.frontierWorld(p) === -1, 'C · er is geen grens meer', app.frontierWorld(p));
  check(app.allWorldsDone(p), 'C · alles wat er is, is uit', app.allWorldsDone(p));
  check(app.continueWorld(p) === laatste, 'C · "verder" wijst naar de laatste echte wereld', app.continueWorld(p));
  check([app.WORLDS.length, app.WORLD_AVAIL, app.WORLD_LAST].join('/') === vorm,
    'C · er komt geen wereld bij van het uitspelen zelf',
    [app.WORLDS.length, app.WORLD_AVAIL, app.WORLD_LAST].join('/'));
  check(app.doneWorldCount(p) === app.WORLD_AVAIL, 'C · de teller zegt: alles', app.doneWorldCount(p));
  // De toegift: dezelfde laatste wereld nog eens, beter. Er schuift niets vooruit.
  const voor = { grens: app.frontierWorld(p), verder: app.continueWorld(p), last: app.WORLD_LAST, n: app.WORLDS.length };
  speel(app, p, laatste, { sterren: 3 });
  p.encores = (p.encores || 0) + 1;
  const na = { grens: app.frontierWorld(p), verder: app.continueWorld(p), last: app.WORLD_LAST, n: app.WORLDS.length };
  check(JSON.stringify(voor) === JSON.stringify(na), 'C · een toegift schuift niets vooruit', JSON.stringify(na));
  check(app.hereLevel(p) <= app.WORLD_LAST, 'C · en de positie loopt niet voorbij het laatste level', app.hereLevel(p));
  check(uitLijst(app, p).every(x => x), 'C · en ze blijven allemaal uit', JSON.stringify(uitLijst(app, p)));
});

/* ================= D · Er komt later een wereld bij =================
   Dit is de zaak waar fase 4A voor bestond. Een kind heeft alles uit; dan komt er
   een echte wereld achteraan. Die hoort leeg te zijn, de nieuwe grens, en de oude
   voortgang hoort onaangeroerd te blijven. */
zaak('D', () => {
  const { app, p } = verseSter();
  for (let i = 0; i < app.WORLDS.length; i++) speel(app, p, i);
  const uitVoor = uitLijst(app, p);
  const sterrenVoor = app.totalStarCount(p);
  const oudAantal = app.WORLDS.length, oudLast = app.WORLD_LAST;
  const nieuw = wereldErbij(app, 'test7');
  check(nieuw === oudAantal && app.WORLD_START[nieuw] === oudLast + 1,
    'D · de nieuwe wereld begint op het eerste vrije level', app.WORLD_START[nieuw]);
  check(!app.worldDone(p, nieuw), 'D · de nieuwe wereld is niet vanzelf uitgespeeld', app.worldDone(p, nieuw));
  check(app.worldProgress(p, app.worldForIndex(nieuw)).gespeeld === 0, 'D · er staat geen enkele show in',
    JSON.stringify(app.worldProgress(p, app.worldForIndex(nieuw))));
  check(app.frontierWorld(p) === nieuw && app.continueWorld(p) === nieuw, 'D · en hij is de nieuwe grens', app.frontierWorld(p));
  check(!app.allWorldsDone(p), 'D · de toegift-stand is voorbij', app.allWorldsDone(p));
  check(uitLijst(app, p).slice(0, oudAantal).join() === uitVoor.join(), 'D · de oude werelden blijven uitgespeeld', JSON.stringify(uitLijst(app, p)));
  check(app.totalStarCount(p) === sterrenVoor, 'D · en er gaat geen ster verloren', app.totalStarCount(p));
  check(app.grantWorldRewards(p, nieuw).spul === null, 'D · en er valt nog niets te verdienen', 'wel iets gekregen');
});

/* ================= E · Twee werelden tegelijk erbij =================
   De eerste wordt de grens; de tweede blijft netjes wachten en wordt niet
   overgeslagen zodra de eerste uit is. */
zaak('E', () => {
  const { app, p } = verseSter();
  for (let i = 0; i < app.WORLDS.length; i++) speel(app, p, i);
  const oudAantal = app.WORLDS.length;
  const een = wereldErbij(app, 'test7');
  const twee = wereldErbij(app, 'test8');
  check(app.WORLD_AVAIL === oudAantal + 2, 'E · er zijn er nu twee meer beschikbaar', app.WORLD_AVAIL);
  check(app.frontierWorld(p) === een, 'E · de eerste nieuwe wereld is de grens', app.frontierWorld(p));
  check(!app.worldDone(p, twee), 'E · de tweede is niet uitgespeeld', app.worldDone(p, twee));
  speel(app, p, een);
  check(app.frontierWorld(p) === twee && app.continueWorld(p) === twee, 'E · daarna schuift de grens één op', app.frontierWorld(p));
  check(!app.allWorldsDone(p), 'E · en wordt de tweede niet overgeslagen', app.allWorldsDone(p));
  speel(app, p, twee);
  check(app.allWorldsDone(p) && app.continueWorld(p) === twee, 'E · pas als beide uit zijn is het weer toegift',
    [app.allWorldsDone(p), app.continueWorld(p)].join('/'));
});

/* ================= F · Terugbladeren =================
   Een kind mag op de kaart terug naar een oude wereld. Kijken is geen voortgang:
   niets gaat ervan uit, de grens verschuift niet, en "verder" blijft wijzen waar
   ze echt gebleven was. (Het bladeren zélf -- met de pijlen op de kaart -- staat
   in voortgang.test.js zaak E; hier gaat het om wat de cijfers ervan vinden.) */
zaak('F', () => {
  const { app, p } = verseSter();
  speel(app, p, 0); speel(app, p, 1);
  speel(app, p, 2, { shows: 2 });
  const voor = { uit: uitLijst(app, p), grens: app.frontierWorld(p), verder: app.continueWorld(p), sterren: app.totalStarCount(p) };
  // terugbladeren: de kaart zet de bekeken wereld en noteert hem als gezien
  app.markWorldSeen(p, 0);
  app.markWorldSeen(p, 1);
  const na = { uit: uitLijst(app, p), grens: app.frontierWorld(p), verder: app.continueWorld(p), sterren: app.totalStarCount(p) };
  check(JSON.stringify(voor) === JSON.stringify(na), 'F · gezien-noteren raakt de voortgang niet', JSON.stringify(na));
  check(p.worldsSeen.join() === 'muziek,snoep', 'F · maar staat wél genoteerd', p.worldsSeen.join());
  // vooruit kijken naar een wereld die nog niet aan de beurt is doet dat evenmin
  app.markWorldSeen(p, 3);
  check(!app.worldDone(p, 3) && app.frontierWorld(p) === 2, 'F · vooruitkijken maakt een wereld niet uit',
    [app.worldDone(p, 3), app.frontierWorld(p)].join('/'));
});

/* ================= G · Uit is uit =================
   De hele reden dat worldDone() bestaat: voltooiing mag nergens anders uit
   afgeleid worden. Elk van deze vier zou vroeger "uit" hebben gezegd. */
zaak('G', () => {
  // 1 · niet uit de positie
  {
    const { app, p } = verseSter();
    p.level = app.WORLD_LAST;             // helemaal achteraan, zonder ooit gespeeld te hebben
    check(uitLijst(app, p).every(x => !x), 'G · een hoge positie maakt geen wereld uit', JSON.stringify(uitLijst(app, p)));
    check(app.frontierWorld(p) === 0, 'G · de grens blijft de eerste wereld', app.frontierWorld(p));
  }
  // 2 · niet uit "al gezien"
  {
    const { app, p } = verseSter();
    app.WORLDS.forEach((w, i) => app.markWorldSeen(p, i));
    check(uitLijst(app, p).every(x => !x), 'G · een bekeken wereld is geen uitgespeelde wereld', JSON.stringify(uitLijst(app, p)));
  }
  // 3 · niet uit de sterren van de oude staart
  {
    const { app, p } = verseSter();
    for (let l = 49; l <= 60; l++) p.tourStars[l] = 3;
    check(uitLijst(app, p).every(x => !x), 'G · staartsterren maken geen wereld uit', JSON.stringify(uitLijst(app, p)));
    check(app.totalStarCount(p) === 36, 'G · ze tellen wél gewoon mee in het totaal', app.totalStarCount(p));
  }
  // 4 · niet uit het overspelen van de laatste wereld
  {
    const { app, p } = verseSter();
    for (let i = 0; i < app.WORLDS.length; i++) speel(app, p, i);
    const laatste = app.WORLDS.length - 1, eindLevel = app.WORLD_LAST;
    speel(app, p, laatste, { sterren: 3 });     // toegift op de laatste wereld
    speel(app, p, laatste, { sterren: 3 });
    const nieuw = wereldErbij(app, 'test7');
    check(!app.worldDone(p, nieuw), 'G · een toegift vult geen toekomstige wereld', app.worldDone(p, nieuw));
    check(Object.keys(p.stars).filter(l => Number(l) > eindLevel).length === 0,
      'G · en zet geen sterren op levels die nog niet bestaan', JSON.stringify(Object.keys(p.stars).slice(-3)));
  }
  // 5 · een ster van nul telt niet als gespeeld (kan alleen uit een bewerkte back-up komen)
  {
    const { app, p } = verseSter();
    speel(app, p, 0, { sterren: 0 });
    check(!app.worldDone(p, 0), 'G · nul sterren is geen gespeelde show', app.worldDone(p, 0));
    check(app.frontierWorld(p) === 0, 'G · dus de grens blijft staan', app.frontierWorld(p));
  }
  // 6 · één show te weinig is niet uit
  {
    const { app, p } = verseSter();
    speel(app, p, 0, { shows: 7, sterren: 3 });
    check(!app.worldDone(p, 0), 'G · zeven van de acht is niet uit', app.worldDone(p, 0));
    check(!app.worldProgress(p, app.worldForIndex(0)).vol, 'G · en al helemaal niet perfect',
      JSON.stringify(app.worldProgress(p, app.worldForIndex(0))));
  }
});

/* ================= H · Nog niet uitgebracht =================
   released:false houdt een wereld buiten het spel zonder zijn levelnummers vrij te
   geven. Hij bestaat niet voor dit kind: niet als grens, niet als "uit", en ook
   niet als iets dat de toegift-stand tegenhoudt. */
zaak('H', () => {
  const { app, p } = verseSter();
  breng(app, 3);
  check(app.WORLD_AVAIL === 3 && app.WORLD_LAST === 24, 'H · drie werelden open, tot en met level 24',
    [app.WORLD_AVAIL, app.WORLD_LAST].join('/'));
  check(app.WORLD_START[5] === 41, 'H · en de dichte werelden houden hun levelnummers', app.WORLD_START[5]);
  for (let i = 0; i < 3; i++) speel(app, p, i);
  check(app.allWorldsDone(p) && app.continueWorld(p) === 2, 'H · alles wat open is, is uit', app.continueWorld(p));
  check(!app.worldDone(p, 3) && !app.worldAvailable(3), 'H · wereld 4 bestaat niet voor dit kind',
    [app.worldDone(p, 3), app.worldAvailable(3)].join('/'));
  // sterren op een dichte wereld (bv. uit een testbestand) maken hem niet "uit"
  speel(app, p, 4, { sterren: 3 });
  check(!app.worldDone(p, 4), 'H · zelfs met sterren erin blijft een dichte wereld dicht', app.worldDone(p, 4));
  check(app.grantWorldRewards(p, 4).spul === null, 'H · en hij deelt niets uit', 'wel iets gekregen');
  // ...en zodra hij opengaat, is hij wél gewoon uit: de sterren waren echt
  breng(app, 5);
  check(app.worldDone(p, 4) && app.frontierWorld(p) === 3, 'H · opengaan verandert niets aan wat er al stond',
    [app.worldDone(p, 4), app.frontierWorld(p)].join('/'));
});

/* ================= I · Perfect =================
   Perfect is elke show van de wereld op drie sterren. Niet eerder, en het gaat
   nooit meer weg. */
zaak('I', () => {
  const { app, p } = verseSter();
  const w0 = () => app.worldProgress(p, app.worldForIndex(0));
  // niet alle shows gespeeld -> niet perfect
  speel(app, p, 0, { shows: 7, sterren: 3 });
  check(!w0().uit && !w0().vol, 'I · een halve wereld is niet perfect', JSON.stringify(w0()));
  check(app.grantWorldRewards(p, 0).perfect === null, 'I · en levert geen trofee op', JSON.stringify(p.trophies));
  // alles gespeeld, één show op twee sterren -> uit, niet perfect
  speel(app, p, 0, { sterren: 3 });
  p.stars[4] = 2;
  check(w0().uit && !w0().vol, 'I · alles gespeeld met één missertje is uit maar niet perfect', JSON.stringify(w0()));
  let g = app.grantWorldRewards(p, 0);
  check(g.spul && g.spul.id === 'acc_wereld_muziek' && g.perfect === null,
    'I · dat geeft het spulletje en niet de trofee', JSON.stringify([g.spul && g.spul.id, g.perfect]));
  // en dan die ene show overspelen op drie
  p.stars[4] = 3;
  check(w0().vol && w0().perfect === 8, 'I · alles op drie is perfect', JSON.stringify(w0()));
  g = app.grantWorldRewards(p, 0);
  check(g.perfect && g.perfect.id === 'perfect-muziek' && g.spul === null,
    'I · nu de trofee, en geen tweede spulletje', JSON.stringify([g.spul, g.perfect && g.perfect.id]));
  // overspelen met een mindere uitslag haalt de trofee niet weg
  p.stars[4] = 1;
  check(p.trophies.includes('perfect-muziek'), 'I · een behaalde trofee gaat nooit meer weg', JSON.stringify(p.trophies));
  check(!w0().vol, 'I · ook al zegt de teller nu iets anders', JSON.stringify(w0()));
  const na = app.grantWorldRewards(p, 0);
  check(na.spul === null && na.perfect === null, 'I · en er komt niets dubbel bij', JSON.stringify(na));
  // een dichte wereld verderop houdt perfect op een open wereld niet tegen
  const twee = verseSter('Perfectie');
  breng(twee.app, 2);
  speel(twee.app, twee.p, 0, { sterren: 3 });
  const gg = twee.app.grantWorldRewards(twee.p, 0);
  check(gg.perfect && gg.perfect.id === 'perfect-muziek',
    'I · wat verderop dichtstaat blokkeert perfect niet', JSON.stringify(gg.perfect && gg.perfect.id));
});

/* ================= J · Beloningen =================
   Wereld uit -> het spulletje. Perfect -> de trofee. Allebei precies één keer,
   hoe vaak er ook overgespeeld of heropend wordt. */
zaak('J', () => {
  // eerste keer uitspelen: één spulletje, geen trofee
  const { app, p } = verseSter();
  speel(app, p, 0);
  const eerste = app.grantWorldRewards(p, 0);
  check(eerste.spul && eerste.spul.id === 'acc_wereld_muziek', 'J · uitspelen geeft het spulletje van die wereld',
    JSON.stringify(eerste.spul && eerste.spul.id));
  check(eerste.perfect === null, 'J · en niet meteen de perfecte-wereldtrofee', JSON.stringify(eerste.perfect));
  check(p.owned.filter(id => id === 'acc_wereld_muziek').length === 1, 'J · precies één keer in de kleedkamer',
    JSON.stringify(p.owned));
  // overspelen geeft niets erbij
  speel(app, p, 0, { sterren: 3 });
  const nogmaals = app.grantWorldRewards(p, 0);
  check(nogmaals.spul === null, 'J · overspelen geeft geen tweede spulletje', JSON.stringify(nogmaals.spul));
  check(nogmaals.perfect && nogmaals.perfect.id === 'perfect-muziek', 'J · maar perfect maken wél de trofee',
    JSON.stringify(nogmaals.perfect && nogmaals.perfect.id));
  check(p.owned.filter(id => id === 'acc_wereld_muziek').length === 1 &&
        p.trophies.filter(id => id === 'perfect-muziek').length === 1,
    'J · en allebei blijft het bij één', JSON.stringify([p.owned, p.trophies]));
  // de tweede, derde, vierde keer vragen levert niets op
  app.grantWorldRewards(p, 0); app.grantHistoricRewards(p); app.grantHistoricRewards(p);
  check(p.owned.filter(id => id === 'acc_wereld_muziek').length === 1 &&
        p.trophies.filter(id => id === 'perfect-muziek').length === 1,
    'J · het vangnet deelt niet nog een keer uit', JSON.stringify([p.owned.length, p.trophies.length]));
  // afsluiten en opnieuw openen: alles staat er nog, en er komt niets bij
  app.save();
  const na = heropen(app);
  const q = na.db.profiles.p1;
  check(q.owned.filter(id => id === 'acc_wereld_muziek').length === 1, 'J · na heropenen nog precies één spulletje',
    JSON.stringify(q.owned.filter(id => id.indexOf('acc_wereld') === 0)));
  check(q.trophies.filter(id => id === 'perfect-muziek').length === 1, 'J · en precies één trofee',
    JSON.stringify(q.trophies));
  check(na.worldDone(q, 0) && na.frontierWorld(q) === 1, 'J · met de voortgang onaangetast',
    [na.worldDone(q, 0), na.frontierWorld(q)].join('/'));

  // in één klap uit én perfect: allebei, en allebei één keer
  const tegelijk = verseSter('Tegelijk');
  speel(tegelijk.app, tegelijk.p, 0, { sterren: 3 });
  const beide = tegelijk.app.grantWorldRewards(tegelijk.p, 0);
  check(beide.spul && beide.perfect, 'J · in één keer perfect uitspelen geeft allebei',
    JSON.stringify([beide.spul && beide.spul.id, beide.perfect && beide.perfect.id]));
  const weer = tegelijk.app.grantWorldRewards(tegelijk.p, 0);
  check(weer.spul === null && weer.perfect === null, 'J · en daarna niets meer', JSON.stringify(weer));

  // de laatste wereld perfect uitspelen: de toegift-stand verandert daar niets aan
  const eind = verseSter('Eind');
  for (let i = 0; i < eind.app.WORLDS.length; i++) speel(eind.app, eind.p, i, { sterren: 3 });
  eind.app.grantHistoricRewards(eind.p);
  /* Eén spulletje per wereld die er een uitdeelt, en één perfecte-wereldtrofee
     per wereld. Geteld uit WORLDS en niet uit een getal: een wereld erbij (met of
     zonder beloning) hoort deze zaak niet om te gooien. */
  const teVerdienen = eind.app.WORLDS.filter(w => eind.app.beloningItem(w)).length;
  const alleWerelden = eind.app.WORLDS.length;
  const spullen = eind.p.owned.filter(id => eind.app.isBeloning(id));
  const trofeeen = eind.p.trophies.filter(id => id.indexOf(eind.app.PERFECT_BADGE) === 0);
  check(spullen.length === teVerdienen && new Set(spullen).size === teVerdienen,
    'J · alles uit geeft elk spulletje dat er te verdienen valt', JSON.stringify(spullen));
  check(trofeeen.length === alleWerelden && new Set(trofeeen).size === alleWerelden,
    'J · en elke perfecte-wereldtrofee', JSON.stringify(trofeeen));
  eind.app.grantHistoricRewards(eind.p);
  check(eind.p.owned.filter(id => eind.app.isBeloning(id)).length === teVerdienen,
    'J · een tweede ronde deelt niets dubbel uit', eind.p.owned.length);
  // wat een wereld uitdeelt telt niet mee als "gekocht"
  check(eind.app.boughtCount(eind.p) === 0, 'J · en het is niet gekocht maar verdiend', eind.app.boughtCount(eind.p));

  // een wereld zonder (of met een onbekend) beloningsitem deelt niets uit en valt niet om
  const los = verseSter('Los');
  const zonder = wereldErbij(los.app, 'zonder', {});
  const onbekend = wereldErbij(los.app, 'onbekend', { beloning: 'acc_bestaat_niet' });
  speel(los.app, los.p, zonder); speel(los.app, los.p, onbekend);
  const gz = los.app.grantWorldRewards(los.p, zonder), go = los.app.grantWorldRewards(los.p, onbekend);
  check(gz.spul === null && go.spul === null, 'J · een wereld zonder geldig spulletje deelt niets uit',
    JSON.stringify([gz.spul, go.spul]));
  check(los.app.worldDone(los.p, zonder) && los.app.worldDone(los.p, onbekend),
    'J · maar telt gewoon als uitgespeeld', 'niet uit');
});

/* ================= K · Wereldlengtes =================
   Acht shows per wereld is een keuze, geen wet. Een wereld van vijf of twaalf
   shows moet op precies dezelfde manier uit en perfect kunnen raken. */
zaak('K', () => {
  const { app, p } = verseSter();
  for (let i = 0; i < app.WORLDS.length; i++) speel(app, p, i);
  const eindVoor = app.WORLD_LAST;
  const kort = wereldErbij(app, 'kort', { levels: 5 });
  const lang = wereldErbij(app, 'lang', { levels: 12 });
  check(app.WORLD_START[kort] === eindVoor + 1
     && app.WORLD_START[lang] === eindVoor + 1 + 5
     && app.WORLD_LAST === eindVoor + 5 + 12,
    'K · de levelnummers lopen door met de echte lengtes',
    [app.WORLD_START[kort], app.WORLD_START[lang], app.WORLD_LAST].join('/'));
  speel(app, p, kort, { shows: 4, sterren: 3 });
  check(!app.worldDone(p, kort), 'K · vier van de vijf is niet uit', app.worldDone(p, kort));
  speel(app, p, kort, { sterren: 3 });
  check(app.worldDone(p, kort) && app.worldProgress(p, app.worldForIndex(kort)).vol,
    'K · vijf van de vijf is uit én perfect', JSON.stringify(app.worldProgress(p, app.worldForIndex(kort))));
  check(app.frontierWorld(p) === lang, 'K · en de grens schuift naar de lange wereld', app.frontierWorld(p));
  speel(app, p, lang, { shows: 11, sterren: 3 });
  check(!app.worldDone(p, lang), 'K · elf van de twaalf is niet uit', app.worldDone(p, lang));
  speel(app, p, lang, { sterren: 3 });
  check(app.allWorldsDone(p), 'K · en daarna is alles weer uit', app.allWorldsDone(p));
});

/* ================= L · De trofeeplanken =================
   Per wereld hangt er één perfecte-wereldtrofee, uit WORLDS opgebouwd. Komt er een
   wereld bij, dan hangt hij er de volgende keer gewoon bij -- zonder dat er ook maar
   iets in een lijst hoeft. De "wereld uitgespeeld"-badge is sinds fase 5C met
   pensioen: die mijlpaal levert een spulletje op en geen tweede trofee. */
zaak('L', () => {
  const { app, p } = verseSter();
  const plank = key => app.TROPHY_SHELVES.filter(s => s.key === key)[0];
  check(plank('werelden') === undefined, 'L · er is geen wereldbadge-plank meer', 'nog aanwezig');
  check(plank('perfect').ids.length === app.WORLDS.length,
    'L · één perfecte-wereldtrofee per geschreven wereld',
    plank('perfect').ids.length + ' voor ' + app.WORLDS.length + ' werelden');
  check(app.TROPHIES.every(t => t.id.indexOf('wereld-') !== 0),
    'L · en geen enkele wereldbadge in de kast',
    JSON.stringify(app.TROPHIES.filter(t => t.id.indexOf('wereld-') === 0).map(t => t.id)));
  const badge = id => app.TROPHIES.filter(t => t.id === id)[0];
  const P0 = app.PERFECT_BADGE + app.WORLDS[0].id, P1 = app.PERFECT_BADGE + app.WORLDS[1].id;
  speel(app, p, 0, { sterren: 3 });
  check(badge(P0).has(p), 'L · en hij leest dezelfde teller als de rest', 'niet behaald');
  check(!badge(P1).has(p), 'L · alleen voor de wereld waar het over gaat', 'te veel behaald');
  const voorErbij = plank('perfect').ids.length;
  wereldErbij(app, 'test7');
  check(plank('perfect').ids.length === voorErbij + 1, 'L · een wereld erbij geeft een kaartje erbij',
    plank('perfect').ids.length);
  check(!!badge('perfect-test7') && !badge('perfect-test7').has(p),
    'L · leeg, zoals de wereld zelf', 'meteen behaald');
  check(badge('perfect-test7').wereld && badge('perfect-test7').wereld.id === 'test7',
    'L · en hij weet bij welke wereld hij hoort', JSON.stringify(badge('perfect-test7').wereld));
  /* De vorm van de kast blijft kloppen mét een wereld erbij. Dit is dezelfde regel
     die inhoud.test.js F bewaakt, maar dan ná een uitbreiding: het vaste deel staat
     stil, alleen het aantal perfecte werelden loopt mee met WORLDS. Een groeiend
     spel mag de kastcontrole dus nooit omduwen -- en een trofee die er ongemerkt
     bij komt valt hier alsnog uit. */
  const actief = app.activeTrophies();
  const vast = actief.filter(t => !t.perfect);
  const perfect = actief.filter(t => t.perfect);
  check(vast.length === 12, 'L · het vaste deel van de kast groeit niet mee', vast.length);
  check(perfect.length === app.WORLDS.length && perfect.length === voorErbij + 1,
    'L · en het perfecte deel precies wel', perfect.length + '/' + app.WORLDS.length);
  check(actief.length === vast.length + app.WORLDS.length,
    'L · samen is dat de hele kast', actief.length);
  check(app.TROPHIES.filter(t => t.id === P0).length === 1,
    'L · en de oude staan er niet dubbel bij', app.TROPHIES.filter(t => t.id === P0).length);
  // de kast legt de nieuwe trofeeën niet zomaar als "klaar" neer
  const klaarVoor = kopie(p.readyTrophies);
  app.checkTrophies(p);
  check(!p.readyTrophies.includes('perfect-test7'), 'L · een lege wereld ligt niet klaar om te openen',
    JSON.stringify(p.readyTrophies));
  check(klaarVoor.length <= p.readyTrophies.length, 'L · checkTrophies haalt niets weg', JSON.stringify(p.readyTrophies));
});

/* ================= M · Trofeeën met pensioen =================
   Fase 5C haalde 24 trofeeën uit de kast. Wie ze ooit behaald heeft, houdt ze in
   p.trophies staan -- er wordt niets opgeruimd, niets gemigreerd en niets
   afgepakt. Ze doen alleen niet meer mee: niet in de kast, niet in de teller, en
   ze komen ook niet opnieuw als cadeautje klaar te liggen. */
zaak('M', () => {
  const { app, p } = verseSter();
  const weg = ['rookie3', 'city5', 'city10', 'sums250', 'perfect3', 'toegift25',
               'stars15', 'stars30', 'rankstad', 'rich', 'diamond250', 'collector',
               'modekoningin', 'schoenenkast', 'haarstylist', 'orkest', 'dierenkoning',
               'kastvol', 'wereld-muziek'];
  weg.forEach(id => {
    check(app.isRetiredTrophy(id), `M · ${id} is met pensioen`, id);
    check(!app.TROPHIES.some(t => t.id === id), `M · ${id} staat niet meer in de kast`, id);
    check(!app.activeTrophies().some(t => t.id === id), `M · ${id} telt niet mee`, id);
  });
  // Een save van vóór fase 5C: alle oude id's erin, en een paar die nog gelden.
  p.trophies = weg.concat(['first', 'perfect-muziek']);
  p.readyTrophies = [];
  check(app.earnedActiveCount(p) === 2, 'M · een oude save telt alleen zijn actieve trofeeën',
    app.earnedActiveCount(p));
  const nieuw = app.checkTrophies(p);
  check(nieuw.every(t => !app.isRetiredTrophy(t.id)), 'M · en er komt geen gepensioneerde trofee terug',
    JSON.stringify(nieuw.map(t => t.id)));
  check(weg.every(id => p.trophies.includes(id)), 'M · de oude id\'s blijven gewoon in de save staan',
    JSON.stringify(weg.filter(id => !p.trophies.includes(id))));
  // Een wereld erbij mag geen wereldbadge opleveren, ook niet na een herbouw.
  wereldErbij(app, 'test8');
  check(app.isRetiredTrophy('wereld-test8'), 'M · ook de badge van een níeuwe wereld is met pensioen', 'test8');
  check(!app.TROPHIES.some(t => t.id === 'wereld-test8'), 'M · en hij wordt niet aangelegd', 'test8');
});

klaar();
