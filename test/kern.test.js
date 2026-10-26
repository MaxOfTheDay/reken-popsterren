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
 *   N  beperkte beweging                -> dezelfde uitkomst, zonder de reis erheen
 *   O  het geluid                       -> een tabel op naam, en stil is stil
 *   P  sterren (ster-status met pensioen) -> één regel, en geen rangvelden meer
 *   Q  de leerstap                      -> een wereld is een stap, en oude saves volgen
 *   R  de grenstip                      -> pas na genoeg drie sterren, eerst typen dan de grens, en opnieuw na een keuze
 *   S  de telmodus-tip                  -> tegen het plafond aan: verder groeien, of naar rekenen
 *   T  de telmodus-klim                 -> foutloos mag sneller, de cijfers niet; terug pas na twee missers
 *   U  fase 12 (tot 20)                 -> wie "alles" had krijgt hem erbij, één keer
 *   V  de laatste shows                 -> tien uitkomsten, en wat Voortgang erover zegt
 *   W  gegroeid                         -> "Nieuw!" bij een fase hoger, een nieuwe vraagsoort, grotere getallen
 *   X  wennen aan een hogere grens      -> het plafond klimt in acht shows van 0.6 naar 1
 *   Y  het accent per wereld            -> na de laatste leerstap om de beurt zoek / drie / gewoon
 *   Z  de antwoordknoppen               -> binnen de grens, één echte fout, en het middelste kiezen loont niet
 *
 * Draaien:
 *   npm run test:kern      (of: npm test voor alle suites)
 */
/* Het spel zoals een kind het heeft: alleen de uitgebrachte werelden. Een wereld
   die al in WORLDS staat maar nog dicht is (released:false) hoort hier niet bij --
   zie alleenUitgebracht in test/app.js. */
const harnas = require('./app');
const laadApp = o => harnas.laadApp(Object.assign({ alleenUitgebracht: true }, o));
const { heropen } = harnas;
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
  // (deze suite laadt alleen wat uitgebracht is, dus hier is geschreven = uitgebracht;
  // wat er met een dichte wereld gebeurt staat onderaan deze zaak)
  check(plank('perfect').ids.length === app.WORLDS.length,
    'L · één perfecte-wereldtrofee per uitgebrachte wereld',
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
  check(vast.length === 27,   // 12 -> 18 -> 27 in oktober 2026, zie inhoud.test.js zaak F
    'L · het vaste deel van de kast groeit niet mee', vast.length);
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
  /* Een wereld die al geschreven is maar nog dicht (released:false): géén kaartje.
     Zo gaat een nieuwe wereld naar main zonder dat hij in de kast van elk kind
     opduikt, met naam en icoon, als belofte die niemand kan inlossen. Gaat hij
     uit, dan hangt hij er de volgende keer gewoon bij. */
  const metZeven = plank('perfect').ids.length;
  const dicht = wereldErbij(app, 'test8', { released: false });
  check(!badge('perfect-test8') && plank('perfect').ids.length === metZeven
    && app.activeTrophies().length === actief.length,
    'L · een dichte wereld erbij geeft (nog) geen kaartje', plank('perfect').ids.join());
  delete app.WORLDS[dicht].released;
  app.rebuildWorldStarts(); app.rebuildWorldBadges();
  check(!!badge('perfect-test8') && plank('perfect').ids.length === metZeven + 1,
    'L · en uitgebracht wél', plank('perfect').ids.join());
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

/* ================= N · Beperkte beweging =================
   prefers-reduced-motion is in dit bestand geen schakelaar die alles uitzet maar
   een afspraak: de uitkomst blijft, de weg ernaartoe niet. Dít is de JS-kant
   daarvan -- de functies die zélf iets in de body neerzetten of een danspasje op
   de pop plakken. Die kan geen enkele CSS-regel nog tegenhouden zodra ze gelopen
   hebben, dus ze moeten het zelf weten.

   Elke controle wordt twee keer gedaan: één keer met beweging en één keer
   zonder. Dat is met opzet -- een grendel die altijd dichtzit ziet er in een
   test precies zo uit als een grendel die werkt, en dan zou een stille app die
   ook zonder de voorkeur niets meer viert hier gewoon groen blijven.

   Wat een kind ziet staan (de juichkaart, de toast, de gouden vraag, de lampen)
   ligt in de CSS en hoort dus in een echte browser gemeten te worden: dat is
   zaak M in beloning.test.js. */

// Een app die denkt dat de gebruiker wel/geen beweging wil, met een pop die een
// echte klassenlijst bijhoudt en een teller op alles wat er in de body bijkomt.
// Meer dan dat heeft geen van deze functies van een scherm nodig.
function metBeweging(aan) {
  const app = laadApp();
  app.run(`window.matchMedia = () => ({ matches: ${aan ? 'false' : 'true'},
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });`);
  app.run(`
    globalThis.__gemaakt = 0;
    globalThis.__pop = (() => {
      const set = new Set(['idle']);
      return {
        klassen: () => [...set].sort().join(' '),
        classList: {
          add: (...k) => k.forEach(x => set.add(x)),
          remove: (...k) => k.forEach(x => set.delete(x)),
          contains: k => set.has(k),
          toggle: (k, aan) => (aan == null ? (set.has(k) ? set.delete(k) : set.add(k)) : (aan ? set.add(k) : set.delete(k))),
        },
        style: { setProperty() {}, removeProperty() {} },
        animate: () => ({ cancel() {}, finished: Promise.resolve() }),
        getBoundingClientRect: () => ({ left: 10, top: 10, width: 40, height: 40, right: 50, bottom: 50 }),
        closest: () => null, appendChild: k => k, remove() {},
        get offsetWidth() { return 0; },
      };
    })();
    const __maak = document.createElement;
    document.createElement = function (t) { globalThis.__gemaakt++; return __maak.call(document, t); };
    document.getElementById = () => globalThis.__pop;
  `);
  // hoeveel losse dingen zet dit stukje app in de body?
  app.telt = code => app.run(`__gemaakt = 0; ${code}; __gemaakt;`);
  app.klassen = () => app.run('__pop.klassen()');
  return app;
}

zaak('N', () => {
  for (const aan of [true, false]) {
    const app = metBeweging(aan);
    const wat = aan ? 'gewoon' : 'stil';
    check(app.run('motionOff()') === !aan, `N · ${wat} · motionOff leest de voorkeur`, String(app.run('motionOff()')));

    /* Feest en beloning: de vier plekken waar de app zelf stukjes in de body
       legt. Bij beperkte beweging komt er niets -- en dat mag, want wat ze
       vieren of afleveren staat er zonder hen ook: de sterren, de juichtekst,
       de teller die al bijgeschreven is. */
    const deeltjes = {
      'confetti van het eindscherm': ['confetti(30)', 30],
      'het confetti-kanon': ['confettiBurst(50, 50, 8)', 8],
      'een los sterretje': ['sparkleAt({ left: 0, top: 0, width: 10, height: 10 })', 1],
      'de diamanten naar de teller': ['flyDiamonds(__pop, __pop, 3)', 3],
      'de wereldbadge omhoog': ["flyBadge(__pop, __pop, '🌍')", 1],
    };
    for (const naam of Object.keys(deeltjes)) {
      const [code, hoeveel] = deeltjes[naam];
      const n = app.telt(code);
      check(n === (aan ? hoeveel : 0), `N · ${wat} · ${naam}`, `${n} i.p.v. ${aan ? hoeveel : 0}`);
    }

    /* De pop. Een pasje is karakter bij iets dat al gezegd is, dus bij beperkte
       beweging blijft ze staan -- maar wél in de stand waar ze anders ook in
       eindigt ('idle'), en niet halverwege een sprong. */
    const dansen = ["dance('game-avatar-inner')", "tapDance('end-avatar')", "finaleDance('end-avatar', 6)"];
    for (const code of dansen) {
      app.run(`__pop.classList.remove(...MOVE_CLASSES); __pop.classList.remove('dancing'); __pop.classList.add('idle'); ${code};`);
      const k = app.klassen();
      if (aan) check(/\bdancing\b/.test(k) && /\bmove-/.test(k), `N · ${wat} · ${code} danst`, k);
      else check(k === 'idle', `N · ${wat} · ${code} laat haar rechtop staan`, k);
    }

    /* De sterrenceremonie van het eindscherm is een tijdstip geworden en geen
       los getal, want er wacht iets op: een rang of een wereldfeest mag er pas
       overheen als de sterren gevallen zijn (zie endLevel). */
    const cer = app.run('STERCEREMONIE');
    const derde = cer.eerste + 2 * cer.tussen + cer.land;
    check(cer.totaal >= derde, 'N · de ceremonie duurt tot de derde ster stilstaat', `${cer.totaal} < ${derde}`);
    check(cer.totaal >= cer.knal + cer.puls, 'N · en tot het kanon van foutloos uitgevallen is',
      `${cer.totaal} < ${cer.knal + cer.puls}`);
    const wacht = app.run('naSterren()');
    check(wacht === (aan ? cer.totaal : cer.stil), `N · ${wat} · zolang houdt het eindscherm het scherm`, String(wacht));
    if (!aan) check(cer.stil < derde, 'N · stil wacht niet op een ceremonie die er niet is', String(cer.stil));
  }
});

/* ================= O · Geluid =================
   Niet hóé het klinkt -- dat hoort een mens op een toestel te beoordelen en
   headless Chromium heeft geen luidspreker. Wél de twee harde eisen eronder, en
   die zijn allebei ooit een echte manier geweest om dit stuk stuk te maken:

     1. playSfx() gooit nooit. AudioContext gooit in deze keuringen met opzet
        (zie test/app.js), en playSfx wordt aangeroepen midden in submitAnswer:
        een exception die ontsnapt breekt de beurt af én neemt alle vier de
        Node-suites mee.
     2. "Geluid uit" is echt uit. Geen context, geen knoop, niets -- en dus ook
        niets dat een browser als "deze pagina wil geluid maken" kan lezen.

   Daarnaast een paar eigenschappen van de tabel zelf die je met het oog niet
   ziet maar die wel bedoeld zijn: de aanzet-helling, de plek van de hoofdkraan,
   de herhaalrem, en de twee tijden waar de sterrenceremonie op staat. */

// Een doe-alsof-WebAudio in een verse app: telt contexten, oscillatoren en alles
// wat er aan een versterking gevraagd wordt. Geeft ook de app terug.
function metGeluid() {
  const app = laadApp();
  app.run(`
    window.__au = { ctx: 0, osc: [], gains: [], hervat: 0 };
    window.AudioContext = function () {
      window.__au.ctx++;
      const self = this;
      this.currentTime = 0;
      this.state = 'running';
      this.destination = { wat: 'luidspreker' };
      this.resume = () => { window.__au.hervat++; };
      this.createOscillator = () => {
        const o = { type: '', frequency: { value: 0 }, uit: null,
                    connect(t) { o.uit = t; }, start(t) { o.t0 = t; }, stop(t) { o.t1 = t; } };
        window.__au.osc.push(o); return o;
      };
      this.createGain = () => {
        const beurten = [];
        const g = { uit: null, connect(t) { g.uit = t; }, beurten,
          gain: { value: 0,
            setValueAtTime(v, t) { beurten.push(['zet', v, t]); return this; },
            linearRampToValueAtTime(v, t) { beurten.push(['recht', v, t]); return this; },
            exponentialRampToValueAtTime(v, t) { beurten.push(['exp', v, t]); return this; },
            cancelScheduledValues(t) { beurten.push(['wis', t]); return this; } } };
        window.__au.gains.push(g); return g;
      };
    };
    window.webkitAudioContext = window.AudioContext;
    actx = null; bus = null; audioStuk = false;
    db.sound = true; db.haptics = true;
  `);
  return app;
}
const geluidsStand = app => app.run('window.__au');
// De rem laat hetzelfde klankje niet twee keer binnen HERHAALREM ms door; voor een
// test die er twee achter elkaar wil is dat een hindernis en geen onderwerp.
const remLos = app => app.run('for (const k in klankTijd) delete klankTijd[k];');

zaak('O', () => {
  /* ---- de tabel zelf ---- */
  const app0 = laadApp();
  const sfx = app0.run('SFX');
  const namen = Object.keys(sfx);
  check(namen.length >= 13, 'O · er staat een tabel met klankjes op naam', String(namen.length));
  /* De drie die als laatste bijkwamen. Ze staan hier bij naam omdat een naam die
     stilletjes verdwijnt geen fout geeft -- playSfx() slikt een onbekende naam, en
     dat moet ook, maar dan merkt niemand het meer. */
  for (const naam of ['travel.depart', 'world.unlock', 'equip'])
    check(!!sfx[naam], `O · ${naam} staat in de tabel`, '');
  for (const naam of namen) {
    const def = sfx[naam];
    const ok = Array.isArray(def.noten) && def.noten.length > 0
      && def.noten.every(n => Array.isArray(n) && n.length === 5 && n[1] > 0 && n[2] >= 0 && n[4] > 0);
    check(ok, `O · ${naam} is een rij nette noten`, JSON.stringify(def.noten));
    // Een noot zonder eigen toon (0) hoort zijn toon ergens vandaan te krijgen.
    const losseNul = def.noten.some(n => !n[0]) && !def.ladder && !def.keuze;
    check(!losseNul, `O · ${naam} laat geen noot zonder toon staan`, JSON.stringify(def.noten));
  }

  /* De kast: één klokje in vier metalen, en een tok voor wat nog moet komen. Dat
     ze verschillend klinken is hier het onderwerp -- een medaille die meegroeit
     hoort je te vertellen in welk metaal hij nu is. De boventonen (boven) liggen
     altijd op of boven de grondtoon, zodat de ondergrens hieronder ook voor hen
     geldt. */
  const kastKlanken = ['kast.brons', 'kast.klink', 'kast.goud', 'kast.diamant'];
  for (const naam of kastKlanken.concat('kast.tok'))
    check(!!sfx[naam], `O · ${naam} staat in de tabel`, '');
  const kastVorm = naam => JSON.stringify([sfx[naam].noten, sfx[naam].boven]);
  check(new Set(kastKlanken.map(kastVorm)).size === kastKlanken.length,
    'O · elk metaal in de kast klinkt anders', '');
  for (const naam of namen) {
    const boven = sfx[naam].boven;
    if (!boven) continue;
    const ok = sfx[naam].ladder && boven.every(b => Array.isArray(b) && b.length === 5 && b[0] >= 1 && b[1] > 0 && b[2] >= 0 && b[4] > 0);
    check(ok, `O · ${naam}: de boventonen liggen boven een toon uit de ladder`, JSON.stringify(boven));
  }

  /* De laagste toon in de hele app. Een tabletluidspreker begint ruim boven de
     311 Hz die hier ooit stond, dus daar bleef van de zachtste helft van
     'answer.retry' niets over. Dit is de grens die dat tegenhoudt. */
  let laagste = Infinity, waar = '';
  for (const naam of namen) {
    for (const n of sfx[naam].noten) {
      const tonen = n[0] ? [n[0]] : (sfx[naam].ladder || sfx[naam].keuze || []);
      for (const t of tonen) if (t < laagste) { laagste = t; waar = naam; }
    }
  }
  check(laagste >= 380, 'O · geen enkele toon zakt onder de band van een tabletluidspreker',
    `${laagste} Hz in ${waar}`);

  /* De twee missers zijn twee klankjes. Dit is de splitsing waar het in deze
     ronde om begonnen is: "probeer nog eens" en "je bent een hartje kwijt"
     klonken tot nu toe precies hetzelfde. */
  check(JSON.stringify(sfx['answer.retry'].noten) !== JSON.stringify(sfx['answer.miss'].noten),
    'O · de eerste en de tweede misser klinken niet hetzelfde', '');
  check(JSON.stringify(sfx['show.complete'].noten) !== JSON.stringify(sfx['celebrate.major'].noten),
    'O · einde show en een zeldzame top klinken niet hetzelfde', '');
  check(JSON.stringify(sfx['diamond'].noten) !== JSON.stringify(sfx['travel.arrive'].noten),
    'O · aankomen klinkt niet als betalen', '');

  /* De drie laatste namen, en de vorm die ze bedoeld zijn te hebben. Dit zijn
     uitspraken uit de tabel zelf -- hóé het klinkt hoort een mens op een toestel
     te beoordelen, maar dát vertrek onder aankomst ligt is een getal. */
  const toppen = naam => sfx[naam].noten.map(n => n[0]);
  const hoogste = naam => Math.max(...toppen(naam));

  // Weg en aan zijn één beweging: laag vertrekken, hoog aankomen.
  check(hoogste('travel.depart') < hoogste('travel.arrive'),
    'O · vertrekken ligt onder aankomen', `${hoogste('travel.depart')} vs ${hoogste('travel.arrive')}`);
  const duur = naam => Math.max(...sfx[naam].noten.map(n => n[1] + n[2]));
  check(duur('travel.depart') < duur('travel.arrive'),
    'O · en het is korter: een vertrek is een aanzet, geen gebeurtenis', '');
  /* Geen tril bij vertrekken, en dat is geen vergetelheid maar de afspraak uit
     runTravel: de enige trilling van de reis is de tik van aankomen. Zonder deze
     controle sluipt er ooit een tweede in, en die wordt niet eens gevoeld --
     navigator.vibrate() breekt een lopende trilling af in plaats van erbij te doen. */
  check(sfx['travel.depart'].tril == null, 'O · vertrekken trilt niet: de reis heeft één tik',
    JSON.stringify(sfx['travel.depart'].tril));
  check(sfx['travel.arrive'].tril != null, 'O · en dat is die van aankomen', '');

  /* Een wereld die opengaat mag niet klinken als het begin van een wereld die uit
     is: 'celebrate.major' opent met 523 en daarom staat deze in D. */
  check(toppen('world.unlock')[0] !== toppen('celebrate.major')[0],
    'O · een wereld die opengaat begint niet op dezelfde noot als een wereld die uit is',
    `${toppen('world.unlock')[0]} vs ${toppen('celebrate.major')[0]}`);
  check(JSON.stringify(sfx['world.unlock'].noten) !== JSON.stringify(sfx['travel.arrive'].noten),
    'O · en ook niet als aankomen op de volgende halte', '');

  /* Iets aandoen zakt, een tik klettert. Dat is het hele verschil tussen "het zit"
     en "ik heb je gehoord", en het is te meten: equip ligt onder beide tikken. */
  const tikHoog = Math.max(hoogste('tap'), ...(sfx['tap.blij'].keuze || []));
  check(hoogste('equip') < tikHoog, 'O · iets aandoen ligt onder de tikken',
    `${hoogste('equip')} vs ${tikHoog}`);
  check(sfx['equip'].tril != null, 'O · en de tril van de verrassingsoutfit is meeverhuisd, niet weg',
    JSON.stringify(sfx['equip'].tril));

  /* Einde show moet uit zijn vóórdat de eerste ster landt, anders speelt de
     ceremonie er weer onderdoor -- dat was de hele reden om hem in te korten. */
  const einde = Math.max(...sfx['show.complete'].noten.map(n => n[1] + n[2])) * 1000;
  const eerste = app0.run('STERCEREMONIE').eerste;
  check(einde < eerste, 'O · einde show is uit voordat de eerste ster landt',
    `${Math.round(einde)}ms >= ${eerste}ms`);
  /* En zonder beweging ook: dan staan de sterren er meteen, maar hun tonen komen
     nog -- op een snellere klok, die evengoed na einde show hoort te beginnen. */
  const stilEerste = app0.run('STERCEREMONIE').stilEerste;
  check(einde < stilEerste, 'O · ook de stille sterrentonen wachten tot einde show uit is',
    `${Math.round(einde)}ms >= ${stilEerste}ms`);

  /* ---- trillen ---- */
  /* Goed, de vriendelijke misser en het hartje kwijt voelen als drie dingen: een
     tik, niets, een dubbele tik. De misser trilde 35ms tegen 30ms voor goed, en
     in de hand is dat dezelfde zoem. */
  check(sfx['answer.retry'].tril == null, 'O · de vriendelijke misser trilt niet',
    JSON.stringify(sfx['answer.retry'].tril));
  check(sfx['answer.correct'].tril != null && Array.isArray(sfx['answer.miss'].tril),
    'O · goed trilt, en het hartje kwijt is een patroon', '');
  check(JSON.stringify(sfx['show.complete'].tril) !== JSON.stringify(sfx['celebrate.major'].tril),
    'O · einde show en een zeldzame top voelen ook niet hetzelfde', '');
  /* Elke trilling komt uit de tabel. Een losse buzz() vlak na een klankje breekt
     diens trilling af, en dan voelt één gebeurtenis op elke plek anders. Alleen
     alleen playSfx mag hem aanroepen. */
  const losseBuzz = (harnas.appScript().match(/\bbuzz\([^)]*\)/g) || [])
    .filter(b => b !== 'buzz(pattern)' && b !== 'buzz(def.tril)');
  check(losseBuzz.length === 0, 'O · er trilt niets buiten de klankjestabel om', losseBuzz.join(' '));

  /* ---- 1 · playSfx gooit nooit ---- */
  // Deze app heeft de gooiende AudioContext uit test/app.js, en dat is het punt.
  for (const naam of namen) {
    let stuk = null;
    try { app0.run(`playSfx(${JSON.stringify(naam)}, { i: 1 })`); } catch (e) { stuk = e.message; }
    check(stuk === null, `O · ${naam} overleeft een browser zonder geluid`, String(stuk));
  }
  let stuk = null;
  try { app0.run("playSfx('bestaat.niet'); playSfx();"); } catch (e) { stuk = e.message; }
  check(stuk === null, 'O · en een naam die niet bestaat ook', String(stuk));

  /* ---- 2 · stil is echt stil ---- */
  const stilApp = metGeluid();
  stilApp.run('db.sound = false;');
  for (const naam of namen) stilApp.run(`playSfx(${JSON.stringify(naam)})`);
  const na = geluidsStand(stilApp);
  check(na.ctx === 0 && na.osc.length === 0 && na.gains.length === 0,
    'O · met geluid uit wordt er geen context en geen knoop gemaakt',
    `ctx=${na.ctx} osc=${na.osc.length} gains=${na.gains.length}`);

  /* ---- de bus ---- */
  const app = metGeluid();
  app.run("playSfx('tap')");
  let st = geluidsStand(app);
  check(st.ctx === 1, 'O · de context wordt één keer gemaakt', String(st.ctx));
  // gains[0] is de hoofdkraan: die gaat naar de luidspreker, de rest naar de kraan.
  const kraan = st.gains[0];
  check(kraan.uit && kraan.uit.wat === 'luidspreker', 'O · de hoofdkraan hangt aan de luidspreker', '');
  check(st.gains.slice(1).every(g => g.uit === kraan) && st.osc.every(o => o.uit && o.uit !== kraan),
    'O · en elke noot gaat via de kraan naar buiten en niet erómheen', '');

  remLos(app);
  app.run("playSfx('celebrate.major')");
  st = geluidsStand(app);
  check(st.ctx === 1, 'O · en daarna niet nog een keer', String(st.ctx));
  const groot = sfx['celebrate.major'].noten.length;
  check(st.osc.length === 1 + groot, `O · een klankje van ${groot} noten maakt er ${groot}`,
    String(st.osc.length - 1));

  /* De aanzet: elke noot begint op bijna-nul en loopt in een rechte helling naar
     zijn hoogte. Zonder die helling springt de versterking in één sample van nul
     naar vol, en dat hoor je als een klikje vóór het klankje. */
  const notenKranen = st.gains.slice(1);
  const netjes = notenKranen.every(g => {
    const b = g.beurten;
    return b.length === 3 && b[0][0] === 'zet' && b[0][1] < 0.01
      && b[1][0] === 'recht' && b[1][1] > b[0][1] && b[1][2] > b[0][2]
      && b[2][0] === 'exp' && b[2][2] > b[1][2];
  });
  check(netjes, 'O · elke noot heeft een aanzet en een staart, geen sprong',
    JSON.stringify(notenKranen[0] && notenKranen[0].beurten));

  /* ---- de herhaalrem ---- */
  const rem = metGeluid();
  rem.run("playSfx('tap'); playSfx('tap'); playSfx('tap');");
  const na3 = geluidsStand(rem);
  check(na3.osc.length === 1, 'O · drie tikken in hetzelfde beeldje zijn één tik en geen ratel',
    String(na3.osc.length));
  rem.run("playSfx('answer.correct');");
  check(geluidsStand(rem).osc.length === 1 + sfx['answer.correct'].noten.length,
    'O · maar een ánder klankje komt er meteen naast', '');

  /* ---- geluid uitzetten middenin ---- */
  /* Een noot die al ingepland staat kun je niet meer tegenhouden: o.start() is
     definitief. De kraan dichtdraaien kan wél, en dat is waar hij voor is. */
  const uit = metGeluid();
  uit.run("playSfx('celebrate.major'); toggleSound();");
  const kraanBeurten = geluidsStand(uit).gains[0].beurten;
  const naarNul = kraanBeurten.some(b => b[0] === 'recht' && b[1] === 0);
  check(uit.run('db.sound') === false && naarNul,
    'O · geluid uit draait de kraan dicht, ook als er nog iets loopt', JSON.stringify(kraanBeurten));
  uit.run('toggleSound();');
  const weerOpen = geluidsStand(uit).gains[0].beurten.some(b => b[0] === 'recht' && b[1] === uit.run('BUS_OPEN'));
  check(uit.run('db.sound') === true && weerOpen, 'O · en weer aan doet hem weer open', '');

  /* ---- een context die stil ligt ---- */
  /* Dit is de stilste manier waarop dit stuk kapot kan: de context wordt
     opgeschort (schermvergrendeling, een telefoontje, het beleid van de browser),
     neemt daarna elke noot netjes aan, en er komt niets meer uit. Geen fout, geen
     melding -- het tandwiel blijft "Aan" zeggen tot iemand herlaadt. */
  const slaap = metGeluid();
  slaap.run("playSfx('tap'); actx.state = 'suspended'; audioWakker();");
  check(geluidsStand(slaap).hervat === 1, 'O · een stilgelegde context wordt wakker gemaakt',
    String(geluidsStand(slaap).hervat));
  slaap.run("actx.state = 'running'; audioWakker();");
  check(geluidsStand(slaap).hervat === 1, 'O · en eentje die al loopt wordt met rust gelaten',
    String(geluidsStand(slaap).hervat));

  /* ---- trillen staat los van geluid ---- */
  /* buzz() is de enige plek die aan de trilmotor komt (zie profiles.test.js).
     Wat hier vastligt is de kant die daar niet
     staat: een klankje trilt ook als het gelüid uit staat. */
  const tril = metGeluid();
  tril.run(`
    window.__tril = [];
    navigator.vibrate = p => { window.__tril.push(p); return true; };
    db.sound = false; db.haptics = true;
    playSfx('answer.miss');
  `);
  check(tril.run('window.__tril').length === 1 && geluidsStand(tril).ctx === 0,
    'O · stil met trillen aan trilt wél en klinkt niet', JSON.stringify(tril.run('window.__tril')));
});

/* ================= P · Sterren (en de ster-status die er niet meer is) =========
   Hoeveel sterren een show waard is. De rekenmodus gaf eens één ster vanaf twee
   haperingen (onder "was geweldig!"). Hier liep ook de ladder van de ster-status
   op; die is in oktober 2026 met pensioen gegaan, en wat er nu nagekeken wordt is
   dat hij ook echt weg is -- uit de code én uit oude saves. */
zaak('P', () => {
  const app = laadApp();
  const ster = (total, misses, count) => app.run(`showStars(${JSON.stringify({ total, misses, count: !!count })})`);

  // 3 is foutloos, en alleen foutloos -- in allebei de modi en bij elke lengte
  for (const n of [5, 8, 10]) for (const telmodus of [false, true]) {
    check(ster(n, 0, telmodus) === 3, `P · ${n} vragen foutloos is drie sterren (${telmodus ? 'tellen' : 'rekenen'})`, '');
    check(ster(n, 1, telmodus) === 2, `P · en één hapering is er geen drie meer (${telmodus ? 'tellen' : 'rekenen'})`,
      String(ster(n, 1, telmodus)));
  }
  // twee sterren tot en met 45% haperingen, daarna één
  const grens = { 5: 2, 8: 3, 10: 4 };
  for (const n of [5, 8, 10]) {
    check(ster(n, grens[n]) === 2 && ster(n, grens[n] + 1) === 1,
      `P · bij ${n} vragen: tot ${grens[n]} haperingen twee sterren, daarna één`,
      `${ster(n, grens[n])} / ${ster(n, grens[n] + 1)}`);
  }
  // zes van de acht in één keer goed: dat was één ster, onder "was geweldig!"
  check(ster(8, 2) === 2, 'P · zes van de acht in één keer goed is twee sterren', String(ster(8, 2)));
  // één regel: de modus maakt niet uit
  let zelfde = true;
  for (const n of [5, 8, 10]) for (let m = 0; m <= n; m++) if (ster(n, m, false) !== ster(n, m, true)) zelfde = false;
  check(zelfde, 'P · rekenen en tellen tellen hetzelfde', '');

  /* ---- de ster-status is met pensioen ---- */
  // Er is geen ladder meer, en dus ook geen rang die ergens diamanten uitdeelt.
  check(app.run('typeof RANK_TIERS') === 'undefined' && app.run('typeof checkRankUp') === 'undefined',
    'P · er is geen ster-status meer', '');
  // een nieuwe ster draagt zijn velden niet meer
  const { p: vers } = verseSter('Nieuw');
  check(!('rankSeen' in vers) && !('rangVersie' in vers), 'P · een nieuwe ster heeft geen rangvelden',
    JSON.stringify([vers.rankSeen, vers.rangVersie]));
  // een oude save raakt ze bij het openen kwijt, en houdt verder alles
  const { app: oudApp, p: oud } = verseSter('Oud');
  for (let l = 1; l <= 34; l++) oud.stars[l] = 3;
  oud.level = 35; oud.rankSeen = 4; oud.rangVersie = 2; oud.diamonds = 321;
  oudApp.save();
  const na = heropen(oudApp);
  const q = na.db.profiles.p1;
  check(!('rankSeen' in q) && !('rangVersie' in q) && q.diamonds === 321 && na.totalStarCount(q) === 102,
    'P · een oude save verliest zijn rangvelden en verder niets', JSON.stringify([q.rankSeen, q.rangVersie, q.diamonds]));
});

/* ================= Q · De leerstap =================
   Elke wereld is een stap in het rekenen (zie "De leerstap" in de app). Wat hier
   vastligt is de kant zonder browser: welke stap bij welke show hoort, en wat er
   met een save gebeurt die nog in rondes van twaalf rekende. */
zaak('Q', () => {
  const app = laadApp();
  const stap = l => app.run(`leerStap(${l})`);
  check([1, 8, 9, 16, 17, 24, 25, 32, 33, 40, 41, 48].map(stap).join(',') === '1,1,2,2,3,3,4,4,5,5,6,6',
    'Q · elke wereld van acht shows is één stap', [1, 8, 9, 16, 17, 24, 25, 32, 33, 40, 41, 48].map(stap).join(','));
  check(stap(24) < app.run('STAP_ZOEK') && stap(25) === app.run('STAP_ZOEK'),
    'Q · zoek-het-getal begint op show 25, net als met de oude klok', '');
  check(stap(app.WORLD_LAST) >= app.run('STAP_DRIE'),
    'Q · drie getallen valt binnen de tournee (het wachtte op show 49)', String(stap(app.WORLD_LAST)));
  // een wereld erbij krijgt de laatste stap: alles
  const erbij = laadApp();
  const i = wereldErbij(erbij, 'test7');
  check(erbij.run(`stapVan(${erbij.WORLD_START[i]})`) === erbij.run('LEERSTAPPEN[LEERSTAPPEN.length - 1]'),
    'Q · een wereld die later bijkomt krijgt de laatste stap', '');

  /* ---- een save uit de tijd van de rondes ---- */
  const { app: oudApp, p: oud } = verseSter('Oud');
  oud.opTrack = { '+': { n: 40, acc: 0.95, paused: false, unlockRound: 3, fast: 0.8 },
                  '-': { n: 12, acc: 0.8, paused: false, unlockRound: null, fast: 0.5 } };
  oudApp.save();
  const na = heropen(oudApp);
  const q = na.db.profiles.p1;
  check(q.opTrack['+'].unlockStap === 4 && !('unlockRound' in q.opTrack['+']),
    'Q · ronde 3 wordt stap 4 (show 25 = wereld 4), en het oude veld is weg', JSON.stringify(q.opTrack['+']));
  check(q.opTrack['-'].unlockStap == null && !('unlockRound' in q.opTrack['-']),
    'Q · een bewerking die nog niet los was blijft dat', JSON.stringify(q.opTrack['-']));
  const nogEens = heropen(na).db.profiles.p1;
  check(JSON.stringify(nogEens.opTrack) === JSON.stringify(q.opTrack),
    'Q · en een tweede keer openen verandert niets meer', '');
});

/* ================= R · De tip om de getallengrens hoger te zetten =================
   Na de laatste leerstap worden de sommen niet vanzelf moeilijker. Het spel zet de
   grens niet zelf hoger (dat is van de ouder), maar zegt in Voortgang wanneer het
   tijd lijkt: genoeg drie-sterrenshows voorbij de laatste stap. */
zaak('R', () => {
  const { app, p } = verseSter('Tip');
  const tip = () => app.run('grensTip(P())');
  const vanaf = app.run('LEERSTAPPEN.length - 1');
  const eerste = app.WORLD_START[vanaf];
  const n = app.run('GRENS_TIP_SHOWS');
  check(tip() === null, 'R · een verse ster krijgt geen tip', JSON.stringify(tip()));
  // alles vóór de laatste stap met drie sterren: nog geen tip
  for (let l = 1; l < eerste; l++) p.stars[l] = 3;
  check(tip() === null, 'R · drie sterren vóór de laatste leerstap tellen niet mee', JSON.stringify(tip()));
  for (let l = eerste; l < eerste + n - 1; l++) p.stars[l] = 3;
  check(tip() === null, 'R · één show te weinig: nog geen tip', JSON.stringify(tip()));
  p.stars[eerste + n - 1] = 2;
  check(tip() === null, 'R · twee sterren telt niet als beheerst', JSON.stringify(tip()));
  p.stars[eerste + n - 1] = 3;
  // G1: eerst het antwoorden (kiezen -> afwisselen -> typen), dan pas de getallen
  check(JSON.stringify(tip()) === JSON.stringify({ soort: 'mode', naar: 'mix' }), 'R · bij kiezen uit 4: eerst afwisselen', JSON.stringify(tip()));
  p.settings.mode = 'mix';
  p.settings.grensTipBasis = app.run('grensDrieSterren(P())');
  check(tip() === null, 'R · net omgezet: het tellen begint opnieuw', JSON.stringify(tip()));
  p.settings.grensTipBasis -= n;
  check(JSON.stringify(tip()) === JSON.stringify({ soort: 'mode', naar: 'typ' }), 'R · bij afwisselen: dan zelf typen', JSON.stringify(tip()));
  p.settings.mode = 'typ';
  check(JSON.stringify(tip()) === JSON.stringify({ soort: 'grens', naar: 50 }), 'R · zelf typen bij "tot 20": de tip zegt 50', JSON.stringify(tip()));
  // de ouder zet hem om: de tip telt opnieuw, op de nieuwe grens
  p.settings.max = 50;
  p.settings.grensTipBasis = app.run('grensDrieSterren(P())');
  check(tip() === null, 'R · net omgezet naar 50: niet meteen de vraag of het 100 moet', JSON.stringify(tip()));
  for (let l = eerste + n; l < eerste + 2 * n; l++) p.stars[l] = 3;
  check(JSON.stringify(tip()) === JSON.stringify({ soort: 'grens', naar: 100 }), 'R · na nieuwe drie-sterrenshows bij "tot 50": 100', JSON.stringify(tip()));
  p.settings.max = 100;
  check(tip() === null, 'R · bij "tot 100" is er niets hogers', JSON.stringify(tip()));
  p.settings.max = 20;
  p.settings.track = 'count';
  check(tip() === null, 'R · in de telmodus geen getallengrens, dus geen tip', JSON.stringify(tip()));
});

zaak('S', () => {
  const { app } = verseSter('Tel');
  const p = app.db.profiles.p1 = app.defaultProfile('Tel', 'dress_roze', app.COUNT_OPTS);
  app.normalizeProfiles();
  const tip = () => { const t = app.run('telTip(P())'); return t && t.soort; };
  const n = app.run('GRENS_TIP_SHOWS');
  const MAX = app.COUNT_STAGE_MAX;
  // een show op fase st, top-trap, met zoveel sterren -- zoals endLevel hem afsluit
  const show = (st, sterren) => {
    p.countTrack.stage = st;
    p.countTrack.rung = app.countTopRung(st);
    app.telPlafondTel(p, sterren);
  };
  check(tip() === null, 'S · een verse telster krijgt geen tip', String(tip()));
  // het plafond dat de ouder koos: fase 4
  p.settings.stageMax = 4;
  for (let i = 0; i < n - 1; i++) show(4, 3);
  check(tip() === null, 'S · één show te weinig: nog geen tip', String(tip()));
  show(4, 2);
  check(tip() === null, 'S · twee sterren telt niet mee', String(tip()));
  show(4, 3);
  check(tip() === 'fase', 'S · genoeg drie sterren op de hoogste fase: verder groeien', String(tip()));
  app.run('telTip(P())').doe(p); app.telPlafondOpnieuw(p);
  check(p.settings.stageMax === 5 && tip() === null, 'S · de knop zet het plafond één fase hoger en telt opnieuw', p.settings.stageMax);
  // niet op de hoogste fase: telt niet
  for (let i = 0; i < n; i++) show(3, 3);
  check(tip() === null, 'S · onder het plafond spelen telt niet', String(tip()));
  // cijfers uit: na fase 5 is de volgende stap de cijfers
  p.settings.numerals = false; p.settings.stageMax = MAX;
  for (let i = 0; i < n; i++) show(5, 3);
  check(tip() === 'cijfers', 'S · cijfers uit en vast op fase 5: de tip zet de cijfers aan', String(tip()));
  app.run('telTip(P())').doe(p); app.telPlafondOpnieuw(p);
  check(p.settings.numerals === true && app.countMaxStage(p.settings) === MAX, 'S · cijfers aan, het bereik is weer heel', app.countMaxStage(p.settings));
  // de laatste fase met kleine hoeveelheden: eerst de hoeveelheden
  p.settings.qmax = 8;
  for (let i = 0; i < n; i++) show(MAX, 3);
  check(tip() === 'qmax', 'S · laatste fase tot 8: eerst de hoeveelheden groter', String(tip()));
  app.run('telTip(P())').doe(p); app.telPlafondOpnieuw(p);
  for (let i = 0; i < n; i++) show(MAX, 3);
  check(tip() === 'rekenen', 'S · laatste fase, alles open: naar rekenen', String(tip()));
  const sterrenVoor = JSON.stringify(p.stars);
  app.run('telTip(P())').doe(p);
  const s = p.settings;
  check(s.track === 'math' && s.max === 10 && s.ops.join() === '+,-' && s.mode === 'kies' && s.voorlezen === true,
    'S · naar rekenen: plus en min tot 10, kiezen, en de stem leest mee', JSON.stringify(s));
  check(JSON.stringify(p.stars) === sterrenVoor, 'S · de sterren blijven staan', JSON.stringify(p.stars));
  check(app.run('grensTip(P())') === null, 'S · en de grenstip begint daar opnieuw te tellen', JSON.stringify(app.run('grensTip(P())')));
  check(tip() === null, 'S · in de rekenmodus geen telmodus-tip', String(tip()));
  // de som als zin, voor Voorlezen
  check(app.somZin({ tmpl: '7 + 3 = @' }) === 'zeven plus drie is hoeveel?', 'S · een som wordt een zin', app.somZin({ tmpl: '7 + 3 = @' }));
  check(app.somZin({ tmpl: '12 − @ = 4' }) === '12 min hoeveel is vier?', 'S · min, en boven tien het cijfer', app.somZin({ tmpl: '12 − @ = 4' }));
  check(app.somZin({ tmpl: '3 × 4 = @' }) === 'drie maal vier is hoeveel?', 'S · × is maal, zoals op een Vlaamse school', app.somZin({ tmpl: '3 × 4 = @' }));
  // de stem: Vlaams eerst, dan Nederlands, dan elke nl-stem
  const stem = lijst => app.run('_voices = ' + JSON.stringify(lijst.map(lang => ({ lang }))) + '; (nlVoice() || {}).lang || null');
  check(stem(['en-US', 'nl-NL', 'nl-BE']) === 'nl-BE', 'S · een Vlaamse stem gaat voor', stem(['en-US', 'nl-NL', 'nl-BE']));
  check(stem(['nl_BE', 'nl-NL']) === 'nl_BE', 'S · ook als het toestel nl_BE schrijft', stem(['nl_BE', 'nl-NL']));
  check(stem(['en-US', 'nl-NL']) === 'nl-NL', 'S · zonder Vlaamse stem wordt het Nederlands', stem(['en-US', 'nl-NL']));
  check(stem(['en-US']) === null, 'S · en zonder Nederlandstalige stem geen stem', String(stem(['en-US'])));
  check(app.stemAan(p) === true, 'S · met Voorlezen aan mag de stem in de rekenmodus', '');
  s.voorlezen = false;
  check(app.stemAan(p) === false, 'S · zonder Voorlezen zwijgt de rekenmodus zoals altijd', '');
});

zaak('T', () => {
  const { app } = verseSter('Klim');
  const p = app.db.profiles.p1 = app.defaultProfile('Klim', 'dress_roze', app.COUNT_OPTS);
  app.normalizeProfiles();
  const na = (stand, success, foutloos) => {
    p.countTrack = Object.assign({ streak: 0 }, stand);
    app.advanceCountStage(p, success, foutloos);
    return p.countTrack.stage;
  };
  check(na({ stage: 2, rung: 1, seen: 5, acc: 0.7 }, true, true) === 3, 'T · één foutloze show bijna bovenaan de fase: door', JSON.stringify(p.countTrack));
  check(na({ stage: 2, rung: 1, seen: 5, acc: 0.7 }, true, false) === 2, 'T · niet foutloos: het gewone minimum geldt', JSON.stringify(p.countTrack));
  check(na({ stage: 2, rung: 0, seen: 5, acc: 0.7 }, true, true) === 2, 'T · foutloos maar onderaan de fase: nog niet', JSON.stringify(p.countTrack));
  check(na({ stage: 6, rung: 2, seen: 10, acc: 0.95 }, true, true) === 6, 'T · de cijfers: tien vragen is te weinig, ook foutloos', JSON.stringify(p.countTrack));
  check(na({ stage: 6, rung: 2, seen: 12, acc: 0.9 }, true, false) === 7, 'T · de cijfers na twaalf goede vragen: door', JSON.stringify(p.countTrack));
  check(na({ stage: 3, rung: 2, seen: 8, acc: 0.9 }, true, false) === 4, 'T · het gewone pad werkt zoals altijd', JSON.stringify(p.countTrack));
  // G5: één mislukte show is een slechte middag, twee op rij is een teken
  check(na({ stage: 3, rung: 2, seen: 8, acc: 0.6 }, false, false) === 3, 'T · één mislukte show: de fase blijft', JSON.stringify(p.countTrack));
  check(na({ stage: 3, rung: 2, seen: 8, acc: 0.6, mislukt: 1 }, false, false) === 2, 'T · twee mislukte shows op rij: een fase terug', JSON.stringify(p.countTrack));
  check(p.countTrack.mislukt === 0, 'T · en daarna begint het tellen opnieuw', JSON.stringify(p.countTrack));
  check(na({ stage: 3, rung: 2, seen: 8, acc: 0.6, mislukt: 1 }, true, false) === 3 && p.countTrack.mislukt === 0,
    'T · een gelukte show ertussen wist de teller', JSON.stringify(p.countTrack));
  check(na({ stage: 3, rung: 2, seen: 8, acc: 0.4 }, false, false) === 2, 'T · echt lage nauwkeurigheid: meteen terug', JSON.stringify(p.countTrack));
});

zaak('U', () => {
  const { app } = verseSter('Twintig');
  const MAX = app.COUNT_STAGE_MAX;
  check(MAX === 12, 'U · er zijn twaalf fases', MAX);
  // een save van vóór fase 12: plafond op de oude laatste fase = "alles"
  const oud = app.defaultProfile('Oud', 'dress_roze', app.COUNT_OPTS);
  delete oud.settings.fasesBekend; oud.settings.stageMax = 11;
  app.migrate(oud);
  check(oud.settings.stageMax === 12 && oud.settings.fasesBekend === 12, 'U · een oude telster op "alles" groeit mee naar fase 12', JSON.stringify(oud.settings));
  // daarna kiest de ouder bewust 11: dat blijft staan, ook na nog een migratie
  oud.settings.stageMax = 11; app.migrate(oud);
  check(oud.settings.stageMax === 11, 'U · een bewust gekozen fase 11 blijft fase 11', oud.settings.stageMax);
  // een oude telster met een lager plafond houdt het
  const laag = app.defaultProfile('Laag', 'dress_roze', app.COUNT_OPTS);
  delete laag.settings.fasesBekend; laag.settings.stageMax = 7; app.migrate(laag);
  check(laag.settings.stageMax === 7, 'U · een lager plafond blijft staan', laag.settings.stageMax);
  // hoeveelheden onder de tien: fase 12 (tot twintig) hoort er dan niet bij
  const s = app.defaultProfile('Klein', 'dress_roze', app.COUNT_OPTS).settings;
  s.qmax = 8;
  check(app.countMaxStage(s) === 11, 'U · met hoeveelheden tot 8 stopt het bij fase 11', app.countMaxStage(s));
  s.qmax = 10;
  check(app.countMaxStage(s) === 12, 'U · tot 10: fase 12 mag', app.countMaxStage(s));
});

zaak('V', () => {
  const { app, p } = verseSter('Recent');
  check(Array.isArray(p.recent) && p.recent.length === 0, 'V · een verse ster heeft nog geen recente shows', JSON.stringify(p.recent));
  check(app.uitdagingStand(p) === null, 'V · zonder shows zegt de stand niets', '');
  for (let i = 0; i < 3; i++) app.onthoudUitkomst(p, 3);
  check(app.uitdagingStand(p) === null, 'V · drie shows is nog te weinig', '');
  app.onthoudUitkomst(p, 3);
  check(app.uitdagingStand(p).stand === 'vlot', 'V · alles drie sterren: vlot', JSON.stringify(app.uitdagingStand(p)));
  for (let i = 0; i < 20; i++) app.onthoudUitkomst(p, i % 2 ? 2 : 3);
  check(p.recent.length === app.RECENT_N, 'V · er blijven er maar tien bewaard', p.recent.length);
  check(app.uitdagingStand(p).stand === 'goed', 'V · een mengeling van twee en drie: goed', JSON.stringify(app.uitdagingStand(p)));
  app.onthoudUitkomst(p, 0); app.onthoudUitkomst(p, 0); app.onthoudUitkomst(p, 0);
  check(app.uitdagingStand(p).stand === 'pittig', 'V · drie mislukte shows: pittig', JSON.stringify(app.uitdagingStand(p)));
  // een oude save zonder het veld
  delete p.recent; app.migrate(p);
  check(app.uitdagingStand(p) === null, 'V · een oude save zonder recente shows: geen stand, geen fout', '');
  app.onthoudUitkomst(p, 2);
  check(p.recent.length === 1, 'V · en hij begint gewoon te tellen', JSON.stringify(p.recent));
});

zaak('W', () => {
  const { app } = verseSter('Groei');
  const p = app.db.profiles.p1 = app.defaultProfile('Groei', 'dress_roze', app.COUNT_OPTS);
  app.normalizeProfiles();
  // telmodus: alleen een fase omhoog is nieuws
  p.countTrack.stage = 4;
  check(app.groeiMoment(p, { count: true }, 3) !== null, 'W · een fase hoger: nieuw spel', '');
  check(app.groeiMoment(p, { count: true }, 4) === null, 'W · dezelfde fase: niets', '');
  check(app.groeiMoment(p, { count: true }, 5) === null, 'W · een fase terug: niets (dat hoeft het kind niet te horen)', '');
  // rekenen
  const m = app.db.profiles.p2 = app.defaultProfile('Reken', 'dress_roze', {});
  app.normalizeProfiles();
  check(app.groeiMoment(m, {}, 0) === null, 'W · de eerste show: de grens wordt stil onthouden', JSON.stringify(m.gezien));
  const zoek = app.groeiMoment(m, { missShown: 1 }, 0);
  check(zoek && /zoek het getal/.test(zoek.pil), 'W · de eerste zoek-het-getal is nieuw', JSON.stringify(zoek));
  check(app.groeiMoment(m, { missShown: 1 }, 0) === null, 'W · de tweede keer niet meer', '');
  m.settings.max = 50;
  const groter = app.groeiMoment(m, {}, 0);
  check(groter && /tot 50/.test(groter.pil), 'W · een hogere grens: grotere getallen', JSON.stringify(groter));
  m.settings.max = 20; app.groeiMoment(m, {}, 0); m.settings.max = 50;
  check(app.groeiMoment(m, {}, 0) === null, 'W · omlaag en weer omhoog is geen nieuws', JSON.stringify(m.gezien));
  // een oude save die zoek-het-getal al kent, krijgt geen "Nieuw!" meer
  const oud = app.defaultProfile('Oud', 'dress_roze', {});
  delete oud.gezien; oud.opTrack = { '+': { n: 40, acc: 0.9, paused: false, unlockStap: 4, fast: 0.5 } };
  app.migrate(oud);
  check(app.groeiMoment(oud, { missShown: 1 }, 0) === null, 'W · een oude ster die het al kende: geen nieuws', JSON.stringify(oud.gezien));
});

zaak('X', () => {
  const { app } = verseSter('Wennen');
  const s = { max: 20 };
  const lvl = app.WORLD_START[3];          // wereld 4: t staat daar op 1
  check(app.moeilijkheid(lvl, 0.5, s) === 1, 'X · zonder wennen: het hele bereik', String(app.moeilijkheid(lvl, 0.5, s)));
  app.grensOmhoog(s, 50);
  check(s.max === 50 && s.wennen === app.WEN_SHOWS, 'X · de grens omhoog: wennen begint', JSON.stringify(s));
  const eerst = app.moeilijkheid(lvl, 0.5, s);
  check(Math.abs(eerst - 0.6) < 1e-9, 'X · de eerste show op de nieuwe grens: ongeveer dertig van de vijftig', String(eerst));
  let vorige = eerst, stijgt = true;
  while (s.wennen > 0) { s.wennen--; const t = app.moeilijkheid(lvl, 0.5, s); if (t < vorige) stijgt = false; vorige = t; }
  check(stijgt && vorige === 1, 'X · en het plafond klimt zonder terug te vallen naar het hele bereik', String(vorige));
  app.grensOmhoog(s, 50); app.grensOmhoog(s, 20);
  check(s.wennen === 0, 'X · omlaag hoeft niet te wennen', JSON.stringify(s));
  check(app.moeilijkheid(lvl, 0.5) === 1, 'X · zonder instellingen (oude aanroep): zoals altijd', '');
});

zaak('Y', () => {
  const { app, p } = verseSter('Accent');
  const L = app.run('LEERSTAPPEN.length');
  check(app.wereldAccent(L - 1) === null && app.wereldAccent(L) === null, 'Y · tot en met de eerste "alles door elkaar": geen accent', '');
  check(app.wereldAccent(L + 1) === 'miss' && app.wereldAccent(L + 2) === 'chain' && app.wereldAccent(L + 3) === null,
    'Y · daarna om de beurt: zoek het getal, drie getallen, gewoon', '');
  // alles vrij: in een zoek-wereld zijn alle speciale vragen zoek-het-getal
  p.opTrack = { '+': { n: 40, acc: 0.95, paused: false, unlockStap: 4, fast: 0.6 }, '-': { n: 40, acc: 0.95, paused: false, unlockStap: 4, fast: 0.6 } };
  p.chainTrack = { seen: 20, acc: 0.95, paused: false, rung: 2, hot: 3 };
  p.missRamp = { rung: 1, hot: 0 };
  const soorten = stap => {
    const t = new Set();
    for (let i = 0; i < 60; i++) Object.values(app.planSpecials(p, p.settings, 8, stap, 3)).forEach(x => t.add(x.type));
    return [...t].sort().join(',');
  };
  check(soorten(L + 1) === 'miss', 'Y · een zoek-wereld: alleen zoek het getal', soorten(L + 1));
  check(soorten(L + 2) === 'chain', 'Y · een drie-getallen-wereld: alleen drie getallen', soorten(L + 2));
  check(soorten(L) === 'chain,miss', 'Y · een gewone wereld: allebei', soorten(L));
  // nog niet vrij: dan geen accent, gewoon wat er wél kan
  p.settings.missNum = false;
  check(soorten(L + 1) === 'chain', 'Y · zoek het getal uit: de zoek-wereld speelt gewoon', soorten(L + 1));
});

/* De vier knoppen moeten je laten rekenen (zie makeChoices). Gemeten met de
   gok die de oude knoppen beloonden: "neem het getal met de meeste buren", en
   bij gelijkspel het getal dat het dichtst bij het gemiddelde ligt. Dat was
   65%; blind gokken is 25%. */
zaak('Z', () => {
  const { app, p } = verseSter('Knoppen');
  const s = p.settings;
  const gok = c => {
    const buren = v => c.filter(w => w !== v && Math.abs(w - v) <= 2).length;
    const gem = c.reduce((a, b) => a + b, 0) / c.length;
    return c.slice().sort((x, y) => buren(y) - buren(x) || Math.abs(x - gem) - Math.abs(y - gem))[0];
  };
  for (const [max, lvl, naam] of [[20, 1, 'wereld 1, tot tien'], [20, 9, 'wereld 2, tot twintig'], [100, 41, 'tot honderd']]) {
    s.max = max; s.ops = ['+', '-']; s.wennen = 0;
    let raak = 0, buiten = 0, fout = 0, vier = 0, plaats = [0, 0, 0, 0];
    const N = 3000;
    for (let i = 0; i < N; i++) {
      const q = app.genQuestion(s, lvl, 0.5);
      const grens = app.keuzeGrens(q, s, lvl);
      const c = app.makeChoices(q, grens);
      if (c.length === 4 && new Set(c).size === 4 && c.filter(v => v === q.ans).length === 1) vier++;
      if (c.some(v => v < 0 || v > grens)) buiten++;
      if (gok(c) === q.ans) raak++;
      plaats[c.filter(v => v < q.ans).length]++;
      const getallen = q.tmpl.match(/\d+/g).map(Number);
      const echt = new Set(getallen.concat(getallen[0] + getallen[1], Math.abs(getallen[0] - getallen[1]), q.ans + 10, q.ans - 10));
      if (c.some(v => v !== q.ans && echt.has(v))) fout++;
    }
    check(vier === N, `Z · ${naam}: altijd vier verschillende knoppen, het antwoord één keer`, `${vier}/${N}`);
    check(buiten === 0, `Z · ${naam}: geen knop buiten de grens`, `${buiten}/${N}`);
    check(raak / N < 0.35, `Z · ${naam}: het middelste kiezen loont niet (was 65%)`, `${Math.round(raak / N * 100)}%`);
    check(fout / N > 0.8, `Z · ${naam}: bijna altijd één echte fout (verkeerd teken, een getal uit de som)`, `${Math.round(fout / N * 100)}%`);
    check(plaats.every(n => n > N * 0.12), `Z · ${naam}: het antwoord is even goed de kleinste als de grootste`, plaats.join(','));
  }
  // tafels: de grens is het volgende tiental, en er komt geen negatief getal
  s.ops = ['x']; s.tables = [2, 5, 10];
  let ok = true;
  for (let i = 0; i < 500; i++) {
    const q = app.genQuestion(s, 41, 0.5);
    const c = app.makeChoices(q, app.keuzeGrens(q, s, 41));
    if (c.length !== 4 || new Set(c).size !== 4 || c.some(v => v < 0)) ok = false;
  }
  check(ok, 'Z · tafels: vier verschillende knoppen, niets negatief', '');
});

/* ================= ZA · De nieuwe trofeeën (oktober 2026) =================
   De plank Nieuwe sommen telt per soort som hoe vaak hij goed was (p.leer), de
   medailles groeien mee uit wat er al in p.trophies staat, en de Wereldtournee
   heeft achter de mist een boog die tegen de zichtbare werelden telt. */
zaak('ZA', () => {
  const { app, p } = verseSter();
  check(p.leer && p.leer.brug === 0 && p.leer.zoek === 0 && p.leer.drie === 0, 'ZA · een verse ster begint met p.leer op nul', JSON.stringify(p.leer));
  const oud = app.defaultProfile('Oud', 'dress_roze'); delete oud.leer; app.migrate(oud);
  check(oud.leer && oud.leer.brug === 0, 'ZA · een oude save krijgt p.leer erbij', JSON.stringify(oud.leer));
  app.telLeer(p, { kind: 'missing' }); app.telLeer(p, { kind: 'chain' });
  app.telLeer(p, { kind: 'classic', brug: true }); app.telLeer(p, { kind: 'classic', brug: false });
  check(p.leer.zoek === 1 && p.leer.drie === 1 && p.leer.brug === 1, 'ZA · elke soort telt bij zijn eigen teller, een gewone som nergens', JSON.stringify(p.leer));
  // over het tiental: 8 + 5 wel, 12 + 5 niet (genQuestion zet q.brug)
  const s = Object.assign({}, p.settings, { ops: ['+'], max: 20 });
  let brug = 0, juist = 0;
  for (let i = 0; i < 300; i++) {
    const q = app.genQuestion(s, 17, 0.6);
    const [a, , b] = q.tmpl.split(' ').map(Number);
    if (q.brug) brug++;
    if (q.brug === ((a % 10) + (b % 10) > 10)) juist++;
  }
  check(juist === 300, 'ZA · q.brug klopt met de som', `${juist}/300`);
  // voor(): tot 10 is er geen brug, en in de telmodus geen sommen-trofeeën
  const t = id => app.TROPHIES.find(x => x.id === id);
  p.settings.max = 10;
  check(!t('leer-brug').voor(p), 'ZA · tot 10 staat Over de brug er niet', '');
  p.settings.max = 20;
  check(t('leer-brug').voor(p), 'ZA · tot 20 wel', '');
  const tel = app.defaultProfile('Tel', 'dress_roze', app.COUNT_OPTS);
  check(!t('leer-zoek').voor(tel) && t('leer-cijfers').voor(tel), 'ZA · in de telmodus de telstappen in plaats van de sommen', '');
  // de ladder: niveau uit p.trophies, de laagste klare trap eerst
  const reken = app.TROPHY_LADDERS.find(l => l.key === 'reken');
  p.trophies = ['sums25']; p.readyTrophies = ['sums100'];
  const st = app.ladderStand(reken, p);
  check(st.niveau === 1 && st.klaar && st.klaar.id === 'sums100' && st.volgende.id === 'sums500', 'ZA · ladder: brons in de kast, zilver klaar, goud is de volgende', JSON.stringify({ n: st.niveau, k: st.klaar && st.klaar.id, v: st.volgende && st.volgende.id }));
  /* Elke ladder heeft vier trappen, brons tot diamant, op volgorde: zonder de
     stipjes zegt alleen het metaal hoe ver je bent, en dan moet diamant overal de
     top zijn. Elke trap heeft een voortgang (de boog leest hem). */
  app.TROPHY_LADDERS.forEach(l => {
    const tr = l.ids.map(t);
    check(tr.length === 4 && tr.every((x, i) => x && x.trap === i && typeof x.progress === 'function'),
      `ZA · ${l.name}: vier trappen, brons tot diamant, elk met voortgang`, JSON.stringify(tr.map(x => x && x.trap)));
    const doelen = tr.map(x => x.progress(p).target);
    check(doelen.every((d, i) => !i || d >= doelen[i - 1]), `ZA · ${l.name}: elke trap vraagt minstens zoveel als de vorige`, JSON.stringify(doelen));
  });
  // een wereldnaam breekt vóór "wereld", niet midden in het woord (zie pwNaam)
  check(app.pwNaam('Onderwaterwereld') === 'Onderwater&shy;wereld' && app.pwNaam('Wereld') === 'Wereld',
    'ZA · perfecte wereld: zacht afbreekstreepje vóór "wereld"', app.pwNaam('Onderwaterwereld'));
  // Wereldtournee: behalve een lege boog achter de mist
  const wt = t('worldtour');
  const w = verseSter(), q = w.p;
  check(w.app.trophyBoog(wt, q, 'busy') === 0, 'ZA · Wereldtournee zonder uitgespeelde wereld: lege boog', w.app.trophyBoog(wt, q, 'busy'));
  speel(w.app, q, 0, { sterren: 2 });
  const wt2 = w.app.TROPHIES.find(x => x.id === 'worldtour');
  if (w.app.meerWereldenVooruit(q)) {
    const zicht = w.app.laatsteZichtbareWereld(q) + 1;
    check(w.app.trophyBoog(wt2, q, 'busy') === Math.round(100 / zicht),
      'ZA · achter de mist telt de boog tegen de werelden die ze ziet', w.app.trophyBoog(wt2, q, 'busy') + ' bij ' + zicht + ' zichtbaar');
  }
});

klaar();
