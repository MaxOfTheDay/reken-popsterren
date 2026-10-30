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
 *   ZB de foutmelder                    -> een kort briefje zonder iets persoonlijks, en stil vanaf file://
 *   ZC de stem                          -> zegt woorden, geen emoji of tekens
 *   ZE oefenen                          -> elke instelling één bediening, in de kaart waar hij hoort
 *   ZF leerpad                          -> naam en voorbeeld van elke stap kloppen met de gekozen sommen
 *   ZG onomkeerbaar                     -> elke rode ja-knop gaat door gevaarVraag, met Weg en Terug
 *   ZH past het niveau                  -> alleen de shows op de stap van nu, en de namen van het pad
 *   TW toasts                           -> elke toast gaat vanzelf weg, behalve wie op een tik of het volgende antwoord wacht
 *   VS kapotte instellingen             -> een bewerkte back-up laat de app niet bevriezen, de voortgang blijft
 *   VV kapotte voortgang                -> diamanten, sterren en level weer getallen binnen de regels
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

/* ================= Q · Het leerpad =================
   Eén ladder (LEERPAD), en ze gaat een rij verder als ze hem kan, niet als de
   wereld om is (zie "Het leerpad" in de app). Wat hier vastligt is de kant
   zonder browser: welke rijen op haar pad staan, wanneer ze verder gaat, wat er
   gebeurt als de ouder het pad onder haar verandert, en wat er met een save
   gebeurt die nog een leerstap per wereld had. */
const padNamen = (app, s) => app.padRijen(s).rijen.map(r => r.naam).join();
const instVan = (app, over) => ({ ...app.defaultProfile('Pad', 'dress_roze', {}).settings, ...over });
zaak('Q', () => {
  const { app, p } = verseSter('Pad');
  const nu = () => app.padNu(p);
  check(nu() === 'tot10' && p.pad === null, 'Q · een verse ster begint vooraan', nu());
  check(padNamen(app, p.settings) === 'Tot 10,Tot 20,Over het tiental,Zoek het getal,Drie getallen',
    'Q · + − tot 20: de rijen in de volgorde van school', padNamen(app, p.settings));
  check(app.padRijen(p.settings).later.map(r => r.naam).join() === 'Getallen bouwen tot 100,Tientallen,Tot 100,Over het tiental tot 100',
    'Q · onder de lijn staat alleen het volgende blok', app.padRijen(p.settings).later.map(r => r.naam).join());

  // beheersing: minstens drie shows, de laatste twee met drie sterren
  app.padNa(p, 3); app.padNa(p, 3);
  check(nu() === 'tot10', 'Q · twee keer drie sterren is nog te vroeg', nu());
  app.padNa(p, 3);
  check(nu() === 'tot20' && p.pad.klaar.join() === 'tot10', 'Q · na drie shows met drie sterren: de volgende rij', JSON.stringify(p.pad));
  [3, 2, 3].forEach(n => app.padNa(p, n));
  check(nu() === 'tot20', 'Q · twee sterren ertussen: de reeks begint opnieuw', JSON.stringify(p.pad));
  app.padNa(p, 3);
  check(nu() === 'brug20', 'Q · en twee op rij daarna is genoeg', JSON.stringify(p.pad));
  for (let i = 0; i < 3 * app.PAD_MAX_SHOWS; i++) app.padNa(p, i % 2);
  check(nu() === 'brug20' && p.pad.shows === 0, 'Q · mislukt of één ster telt niet: wie strandt, schuift niet door naar zwaardere sommen', JSON.stringify(p.pad));
  for (let i = 0; i < app.PAD_MAX_SHOWS - 1; i++) app.padNa(p, app.PAD_TELT);
  check(nu() === 'brug20', 'Q · wie het moeilijk heeft blijft op de rij', JSON.stringify(p.pad));
  app.padNa(p, app.PAD_TELT);
  check(nu() === 'zoek', `Q · maar na ${app.PAD_MAX_SHOWS} shows met ${app.PAD_TELT} sterren toch verder: nooit trager dan een wereld`, nu());
  for (let i = 0; i < 6; i++) app.padNa(p, 3);
  check(nu() === 'alles' && app.padNa(p, 3) === false, 'Q · voorbij de laatste rij: alles door elkaar', nu());

  // het pad verandert onder haar
  p.settings.ops.push('x');
  check(nu() === 'alles' && app.ladderNu(p, 'tafels') === 'tafels2510', 'Q · × erbij: de rekenladder blijft waar ze was, de tafels beginnen op hun eigen ladder', `${nu()} ${app.ladderNu(p, 'tafels')}`);
  p.settings.missNum = false;
  check(nu() === 'alles', 'Q · een uitgevinkte rij speelt ze niet', nu());
  p.settings.missNum = true;
  app.grensOmhoog(p.settings, 100);
  check(nu() === 'bouwen100', 'Q · de lijn zakt: de nieuwe getallen zijn haar volgende rij, en eerst bouwt ze ze', nu());

  const tien = verseSter('Tien');
  tien.p.settings.max = 10;
  tien.p.pad = { rij: 'alles', shows: 0, goed: 0, klaar: ['tot10', 'zoek', 'drie'] };
  check(tien.app.padNu(tien.p) === 'alles', 'Q · tot 10 helemaal door', tien.app.padNu(tien.p));
  tien.app.grensOmhoog(tien.p.settings, 20);
  check(tien.app.padNu(tien.p) === 'tot20', 'Q · tot 20 erbij: Tot 20 komt op zijn plek, vóór wat ze al deed', tien.app.padNu(tien.p));
  tien.p.settings.ops.push('x');
  check(!tien.app.vraagInst(tien.p).ops.includes('x') && tien.app.vraagInst(tien.p).missNum,
    'Q · wat ze al kon blijft meedoen als ze terug moet (en × is van de tafels, niet van deze ladder)', JSON.stringify(tien.app.vraagInst(tien.p)));

  // vanaf
  const v = verseSter('Vanaf');
  v.p.settings.padVanaf = 'zoek';
  check(v.app.padNu(v.p) === 'zoek', 'Q · vanaf: het spel begint minstens daar', v.app.padNu(v.p));
  v.p.settings.max = 10; v.p.settings.padVanaf = 'brug20';
  check(v.app.padNu(v.p) === 'zoek', 'Q · vanaf op een rij die niet meer op het pad staat: de eerste erna', v.app.padNu(v.p));
  v.p.settings.padVanaf = 'tot100';
  check(v.app.padNu(v.p) === 'drie', 'Q · vanaf onder de lijn: de laatste rij, nooit voorbij tot', v.app.padNu(v.p));

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

/* Q2 · Van leerstap naar rij. Een save van vóór het leerpad had een stap per
   wereld (1 tot 6, met "vanaf" als startStap). Na het openen staat ze op een
   rij die minstens speelt wat haar stap speelde -- nooit makkelijker -- en
   houdt ze al haar sterren. Voor élke combinatie van instellingen. */
const oudeStand = (s, stap) => {          // wat een oude stap speelde (LEERSTAPPEN, zoals het was)
  const plusMin = s.ops.includes('+') || s.ops.includes('-');
  return { bereik: stap === 1 ? Math.max(10, Math.round(s.max * 0.5)) : s.max,
           brug: plusMin && s.max > 10 && stap >= 3, zoek: stap >= 4, drie: stap >= 5, alles: stap >= 6 };
};
zaak('Q2', () => {
  const fouten = [];
  let n = 0;
  const app = laadApp();
  const opsSets = [];
  for (let m = 1; m < 16; m++) opsSets.push(['+', '-', 'x', ':'].filter((_, i) => m & (1 << i)));
  for (const ops of opsSets) for (const max of [10, 20, 100]) for (let stap = 1; stap <= 6; stap++) {
    n++;
    const s = instVan(app, { ops, max });
    const rij = app.padUitOudeStap(s, stap);
    const waar = `${ops.join('')} tot ${max} stap ${stap} -> ${rij}`;
    const oud = oudeStand(s, stap);
    if (oud.alles) { if (rij !== 'alles') fouten.push('stap 6 is alles: ' + waar); continue; }
    if (rij === 'alles') continue;               // voorbij alles is nooit makkelijker
    const st = app.padStand(s, rij);
    const plusMin = ops.includes('+') || ops.includes('-');
    if (plusMin && st.max < oud.bereik) fouten.push('kleinere getallen: ' + waar);
    if (oud.brug && st.brug === 'nee') fouten.push('zonder over het tiental: ' + waar);
    const speel = app.padRijen(s).rijen.map(r => r.id);
    if (oud.zoek && speel.includes('zoek') && !st.missNum) fouten.push('zonder zoek het getal: ' + waar);
    if (oud.drie && speel.includes('drie') && !st.chain3) fouten.push('zonder drie getallen: ' + waar);
  }
  check(!fouten.length, `Q2 · ${n} oude standen: nooit makkelijker dan ze gewend was`, fouten.slice(0, 6).join(' | '));

  // een echte save: wereld 1 en 2 uit, tot 20, vanaf stap 2
  const { app: oudApp, p: oud } = verseSter('Oud');
  for (let l = 1; l <= oudApp.WORLD_START[2] - 1; l++) oud.stars[l] = 3;
  delete oud.pad; delete oud.settings.padVanaf; oud.settings.startStap = 2;
  const sterren = JSON.stringify(oud.stars);
  oudApp.save();
  const q = heropen(oudApp).db.profiles.p1;
  check(q.pad && q.pad.rij === 'brug20' && q.pad.klaar.join() === 'tot10,tot20',
    'Q2 · wereld 3 was over het tiental: dat is haar rij, de rijen ervoor zijn gehaald', JSON.stringify(q.pad));
  check(q.settings.padVanaf === 'tot20' && !('startStap' in q.settings), 'Q2 · vanaf gaat mee, startStap is weg', JSON.stringify(q.settings));
  check(JSON.stringify(q.stars) === sterren, 'Q2 · de sterren blijven precies wat ze waren', '');
  const nogEens = heropen(heropen(oudApp)).db.profiles.p1;
  check(JSON.stringify(nogEens.pad) === JSON.stringify(q.pad), 'Q2 · een tweede keer openen verandert niets meer', JSON.stringify(nogEens.pad));

  // een ster die alle werelden uit heeft: alles door elkaar
  const { app: verApp, p: ver } = verseSter('Ver');
  for (let l = 1; l <= verApp.WORLD_LAST; l++) ver.stars[l] = 3;
  delete ver.pad;
  verApp.save();
  const v = heropen(verApp).db.profiles.p1;
  check(heropen(verApp).padNu(v) === 'alles', 'Q2 · voorbij de oude stappen: alles door elkaar', JSON.stringify(v.pad));
  // een verse oude ster: vooraan, en een telster heeft nog geen pad
  const { app: nulApp, p: nul } = verseSter('Nul');
  delete nul.pad; nul.settings.track = 'count';
  nulApp.save();
  check(heropen(nulApp).db.profiles.p1.pad === null, 'Q2 · een telster begint zonder pad', '');
});

/* Q3 · Getallen bouwen (zie genBouwen): tientallen en eenheden, vóór er tot
   honderd gerekend wordt. Elke vraag klopt, de knoppen zijn goed, en de rij
   speelt de sommen nog op het oude bereik. En wie op "tot 50" stond (dat blok
   is er niet meer) gaat naar 100, met wennen, en begint hier. */
zaak('Q3', () => {
  const { app, p } = verseSter('Bouw');
  const fouten = [], soorten = {};
  for (let i = 0; i < 600; i++) {
    const q = app.genBouwen();
    soorten[q.soort] = (soorten[q.soort] || 0) + 1;
    const g = (q.tmpl.match(/\d+/g) || []).map(Number);
    const waar = `${q.soort}: ${q.tmpl} -> ${q.ans}`;
    const klopt = q.soort === 'blokken' ? q.ans === 10 * g[0] + g[1]
      : q.soort === 'tiental' ? 10 * q.ans + g[1] === g[0]
      : g[0] === g[1] + q.ans;
    if (!klopt) fouten.push('klopt niet: ' + waar);
    if (Math.max(q.ans, ...g) > 99) fouten.push('boven de honderd: ' + waar);
    if ((q.html.match(/@/g) || []).length !== 1 || (q.tmpl.match(/@/g) || []).length !== 1) fouten.push('niet één vakje: ' + waar);
    const grens = app.keuzeGrens(q, p.settings);
    const c = app.makeChoices(q, grens);
    if (c.length !== 4 || new Set(c).size !== 4 || c.filter(v => v === q.ans).length !== 1 || c.some(v => v < 0 || v > Math.max(grens, q.ans)))
      fouten.push(`knoppen ${c}: ` + waar);
  }
  check(!fouten.length, 'Q3 · 600 vragen: ze kloppen, blijven onder de honderd, en hebben vier goede knoppen', fouten.slice(0, 5).join(' | '));
  check(Object.keys(soorten).sort().join() === 'blokken,splits,tiental', 'Q3 · alle drie de soorten komen voor', JSON.stringify(soorten));

  p.settings.max = 100;
  const op = id => app.padStand(p.settings, id);
  check(op('bouwen100').max === 20 && op('bouwen100').bouwen === 'vaak' && op('bouwen100').brug === 'vrij',
    'Q3 · op Getallen bouwen: de sommen blijven tot 20, het bouwen is het nieuwe', JSON.stringify(op('bouwen100')));
  check(op('tientallen').bouwen === 'soms' && op('tientallen').max === 100 && op('brug20').bouwen === null,
    'Q3 · daarna komt het af en toe terug, en ervoor nooit', JSON.stringify([op('tientallen'), op('brug20').bouwen]));
  p.pad = { rij: 'bouwen100', shows: 0, goed: 0, klaar: ['tot10', 'tot20', 'brug20', 'zoek', 'drie'] };
  let bouw = 0;
  for (let i = 0; i < 200; i++) if (app.buildQuestion(p, 1, null).kind === 'bouw') bouw++;
  check(bouw > 60 && bouw < 140, 'Q3 · op zijn rij is ongeveer de helft getallen bouwen', `${bouw}/200`);

  // een save op "tot 50", van na het leerpad
  const { app: oudApp, p: oud } = verseSter('Vijftig');
  oud.settings.max = 50; oud.settings.padVanaf = 'tot50';
  oud.pad = { rij: 'tot50', shows: 2, goed: 1, klaar: ['tot10', 'tot20', 'brug20', 'zoek', 'drie', 'tot50'] };
  oudApp.save();
  const na = heropen(oudApp);
  const q = na.db.profiles.p1;
  check(q.settings.max === 100 && q.settings.wennen > 0, 'Q3 · tot 50 wordt tot 100, en ze went eraan', JSON.stringify(q.settings));
  check(q.settings.padVanaf === 'bouwen100' && !q.pad.klaar.includes('tot50') && na.padNu(q) === 'bouwen100',
    'Q3 · ze begint het blok tot honderd met Getallen bouwen', JSON.stringify(q.pad));
});

/* ================= Q5 · Het blok tot 1000 =================
   Het derde leerjaar: getallen bouwen met honderdtallen, en rekenen in hele
   tientallen en honderdtallen. Elke vraag één getal, te typen, met keuzes op
   dezelfde maat -- 461 naast 460 streep je weg zonder te rekenen. */
zaak('Q5', () => {
  const { app, p } = verseSter('Duizend');
  const fouten = [], soorten = {};
  for (let i = 0; i < 600; i++) {
    const q = app.genBouwen(1000);
    soorten[q.soort] = (soorten[q.soort] || 0) + 1;
    const g = (q.tmpl.match(/\d+/g) || []).map(Number);
    const waar = `${q.soort}: ${q.tmpl} -> ${q.ans}`;
    const klopt = q.soort === 'blokken' ? q.ans === 100 * g[0] + 10 * g[1] + g[2]
      : q.soort === 'tiental' ? 100 * q.ans + 10 * g[1] + g[2] === g[0]
      : g[0] === g.slice(1).reduce((a, b) => a + b, 0) + q.ans;
    if (!klopt) fouten.push('klopt niet: ' + waar);
    if (q.ans > 999 || (q.html.match(/@/g) || []).length !== 1) fouten.push('vakje of te groot: ' + waar);
    const grens = app.keuzeGrens(q, p.settings);
    const c = app.makeChoices(q, grens);
    if (c.length !== 4 || new Set(c).size !== 4 || c.filter(v => v === q.ans).length !== 1 || c.some(v => v < 0 || v > 999))
      fouten.push(`knoppen ${c}: ` + waar);
  }
  check(!fouten.length, 'Q5 · 600 bouwvragen tot 1000 kloppen, met vier goede knoppen', fouten.slice(0, 5).join(' | '));
  check(Object.keys(soorten).sort().join() === 'blokken,splits,tiental', 'Q5 · alle drie de soorten komen voor', JSON.stringify(soorten));

  p.settings.max = 1000;
  const op = id => app.padStand(p.settings, id);
  check(op('bouwen1000').max === 100 && op('bouwen1000').bouwen === 'vaak' && op('bouwen1000').bouwTot === 1000,
    'Q5 · op Getallen bouwen tot 1000: de sommen blijven tot 100', JSON.stringify(op('bouwen1000')));
  check(op('tot1000').bouwen === 'soms' && op('tot1000').bouwTot === 1000 && op('tientallen').bouwTot === 100,
    'Q5 · daarna komt het grootste blok af en toe terug', JSON.stringify([op('tot1000'), op('tientallen')]));
  const s = { ...p.settings, ...op('honderdtallen') };
  let honderd = 0, maat = [];
  for (let k = 0; k < 300; k++) {
    const tr = app.genTriple(s, 1, 0.5, k % 2 ? '+' : '-');
    if ([tr.a, tr.b, tr.c].every(v => v % 100 === 0)) honderd++;
    if ([tr.a, tr.b, tr.c].some(v => v % 10)) maat.push(`${tr.a} ${tr.sym} ${tr.b}`);
    const q = { tmpl: `${tr.a} ${tr.sym} ${tr.b} = @`, ans: tr.c, op: tr.op };
    const c = app.makeChoices(q, app.keuzeGrens(q, s));
    if (c.some(v => v % 10)) maat.push(`keuzes ${c} bij ${q.tmpl}`);
  }
  check(!maat.length, 'Q5 · tot 1000 in hele tientallen, en de keuzes ook', maat.slice(0, 4).join(' | '));
  check(honderd > 120, 'Q5 · op Honderdtallen is het meer dan de helft hele honderdtallen', `${honderd}/300`);
  const ketting = app.genChain({ ...p.settings, ...op('tot1000') }, 1, 0.5);
  check(/^\d*0 \+ \d*0 \+ \d*0 = @$/.test(ketting.tmpl) && ketting.ans <= 1000, 'Q5 · drie getallen tot 1000: ook in tientallen', ketting.tmpl);
  // het gouden "Nieuw" (vraagIsNieuw) hangt boven de vraag die het nieuwe laat zien
  const nieuw = app.run('vraagIsNieuw');
  const som = (tmpl, ans, brug) => ({ tmpl, ans, op: '+', kind: 'classic', brug });
  check(nieuw(app.genBouwen(1000), 'bouwen1000') && !nieuw(app.genBouwen(100), 'bouwen1000')
    && nieuw(som('300 + 400 = @', 700), 'honderdtallen') && !nieuw(som('340 + 400 = @', 740), 'honderdtallen')
    && nieuw(som('460 + 320 = @', 780), 'tot1000') && !nieuw(som('46 + 32 = @', 78), 'tot1000')
    && nieuw(som('380 + 50 = @', 430, true), 'brug1000')
    && !nieuw(som('38 + 5 = @', 43, true), 'brug1000'),
    'Q5 · "Nieuw" staat boven de vraag van de nieuwe rij: platen, honderdtallen, getallen boven de honderd, over het honderdtal', '');
  let over = 0;
  for (let k = 0; k < 200; k++) if (app.genQuestion({ ...p.settings, ...op('brug1000'), ops: ['+'] }, 1, 0.5).brug) over++;
  check(over > 40, 'Q5 · op Over het honderdtal gaat een flink deel erover (en telt als brug)', `${over}/200`);
  // Zelf kiezen: elke rij tot 1000 speelt precies zichzelf
  const kies = id => { const k = { ...p.settings, modus: 'vrij', ops: ['+', '-'], kies: [id] }; return app.kiesInst(k); };
  const uitKies = (id, n) => Array.from({ length: n }, () => app.run('kiesVraag')(kies(id), 1, 0.5, []));
  check(uitKies('honderdtallen', 60).every(q => (q.tmpl.match(/\d+/g) || []).every(v => v % 100 === 0)),
    'Q5 · Zelf kiezen, alleen Honderdtallen: alles hele honderdtallen', '');
  check(uitKies('bouwen1000', 30).every(q => q.kind === 'bouw' && q.grens === 999), 'Q5 · Zelf kiezen, Getallen bouwen tot 1000: met platen', '');
  check(uitKies('brug1000', 60).every(q => q.brug), 'Q5 · Zelf kiezen, alleen Over het honderdtal: altijd erover', JSON.stringify(uitKies('brug1000', 60).filter(q => !q.brug).slice(0, 3)));
});

/* ================= Q4 · De lijn "tot" is een rij =================
   Net als op de faseladder van tellen: "tot" staat onder een rij, ook midden
   in een blok, en de grens van de getallen is het blok van die rij. Eerst was
   "tot" alleen een getal (10, 20, 100): dan kon de lijn niet op Tientallen
   staan, en kwam je van 20 nooit meer terug op 10. */
zaak('Q4', () => {
  const { app, p } = verseSter('Lijn');
  const s = p.settings;
  const namen = () => app.padRijen(s).rijen.map(r => r.id).join();
  const rij = id => app.LEERPAD.find(r => r.id === id);
  s.max = 100;
  app.padTotOp(s, rij('tientallen'));
  check(s.max === 100 && s.padTot === 'tientallen' && namen().endsWith('bouwen100,tientallen')
    && app.padRijen(s).later.map(r => r.id).join().startsWith('tot100,brug100,bouwen1000'),
    'Q4 · "tot" op Tientallen: tot honderd, maar Tot 100 en Over het tiental staan nog grijs', namen());
  const alles = app.padStand(s, 'alles');
  check(alles.max === 100 && alles.tientallen, 'Q4 · en door elkaar blijven het hele tientallen', JSON.stringify(alles));
  app.padTotOp(s, rij('tot10'));
  check(s.max === 10 && s.padTot === 'tot10' && namen() === 'tot10', 'Q4 · terug naar tot 10 kan', namen());
  app.padTotOp(s, rij('drie'));
  check(s.max === 10 && s.padTot === null && namen() === 'tot10,zoek,drie', 'Q4 · tot 10 staan de vormen vlak onder Tot 10', namen());
  app.padTotOp(s, rij('tot20'));
  check(s.max === 20 && s.padTot === null && namen() === 'tot10,tot20,brug20,zoek,drie' && s.wennen > 0,
    'Q4 · zakt de lijn, dan valt er niets af wat ze al had: tot 10 speelde ze zoek en drie getallen al', namen());
  app.padTotOp(s, rij('drie'));
  check(s.max === 20 && s.padTot === null && s.wennen > 0, 'Q4 · op het eind van het blok is het gewoon het blok, en het wennen loopt door', JSON.stringify(s));
  app.grensOmhoog(s, 100);
  check(s.padTot === null && s.max === 100, 'Q4 · de tip (grensOmhoog) geeft het hele volgende blok', JSON.stringify(s));
  s.padTot = 'tot50';
  app.save();
  const na = heropen(app).db.profiles.p1;
  check(na.settings.padTot === null, 'Q4 · een "tot" op een rij die er niet meer is, wordt het eind van het blok', JSON.stringify(na.settings));
});

/* ================= R · De tip om de getallengrens hoger te zetten =================
   Na de laatste leerstap worden de sommen niet vanzelf moeilijker. Het spel zet de
   grens niet zelf hoger (dat is van de ouder), maar zegt in Voortgang wanneer het
   tijd lijkt: genoeg drie-sterrenshows voorbij de laatste stap. */
zaak('R', () => {
  const { app, p } = verseSter('Tip');
  const tip = () => app.run('grensTip(P())');
  const vanaf = app.run('GRENS_OUD_VANAF');
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
  check(JSON.stringify(tip()) === JSON.stringify({ soort: 'grens', naar: 100 }), 'R · zelf typen bij "tot 20": de tip zegt 100 (geen tussenstop 50, zoals op school)', JSON.stringify(tip()));
  // de ouder zet hem om: de tip telt opnieuw, op de nieuwe grens
  p.settings.max = 100;
  p.settings.grensTipBasis = app.run('grensDrieSterren(P())');
  check(tip() === null, 'R · net omgezet naar 100: geen tip meer', JSON.stringify(tip()));
  for (let l = eerste + n; l < eerste + 2 * n; l++) p.stars[l] = 3;
  check(JSON.stringify(tip()) === JSON.stringify({ soort: 'grens', naar: 1000 }), 'R · na nieuwe drie-sterrenshows bij "tot 100": de tip zegt 1000', JSON.stringify(tip()));
  p.settings.max = 1000;
  p.settings.grensTipBasis = app.run('grensDrieSterren(P())');
  for (let l = eerste + 2 * n; l < eerste + 3 * n; l++) p.stars[l] = 3;
  check(tip() === null, 'R · ook na nieuwe drie-sterrenshows: bij "tot 1000" is er niets hogers (dat is het vierde leerjaar)', JSON.stringify(tip()));
  p.settings.max = 20;
  p.settings.track = 'count';
  check(tip() === null, 'R · in de telmodus geen getallengrens, dus geen tip', JSON.stringify(tip()));
});

/* R2 · De grenstip na de laatste wereld. Hij telde haltes met drie sterren
   (hoogstens 48), dus wie overal drie sterren had kreeg één tip en daarna nooit
   meer. Nu telt elke gespeelde show met drie sterren, overdoen inbegrepen. */
zaak('R2', () => {
  const { app, p } = verseSter('Toegift');
  const tip = () => app.run('grensTip(P())');
  const n = app.run('GRENS_TIP_SHOWS');
  for (let l = 1; l <= app.WORLD_LAST; l++) p.stars[l] = 3;
  p.level = app.WORLD_LAST + 1;
  check(JSON.stringify(tip()) === JSON.stringify({ soort: 'mode', naar: 'mix' }), 'R2 · een oude save zonder teller: de haltes tellen als beginpunt', JSON.stringify(tip()));
  check(!('grensDrie' in p), 'R2 · en er wordt niets weggeschreven zolang er niet gespeeld is', JSON.stringify(p.grensDrie));
  p.settings.mode = 'mix';
  p.settings.grensTipBasis = app.run('grensDrieSterren(P())');
  check(tip() === null, 'R2 · net omgezet: het tellen begint opnieuw', JSON.stringify(tip()));
  const alles = { rij: 'alles', shows: 0, goed: 0, klaar: app.LEERPAD.map(r => r.id) };
  p.pad = alles;
  for (let i = 0; i < n - 1; i++) app.run('telGrensDrie(P(), 3)');
  app.run('telGrensDrie(P(), 2)');
  p.pad = null;
  app.run('telGrensDrie(P(), 3)');
  p.pad = alles;
  check(tip() === null, 'R2 · twee sterren, of een show op een rij van het leerpad, telt niet', JSON.stringify(tip()));
  app.run('telGrensDrie(P(), 3)');
  check(JSON.stringify(tip()) === JSON.stringify({ soort: 'mode', naar: 'typ' }), 'R2 · overgespeelde shows met drie sterren geven de volgende tip', JSON.stringify(tip()));
  check(p.grensDrie === 48 + n, 'R2 · de teller loopt verder vanaf de oude telling', p.grensDrie);
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
  // een oude save met "cijfers uit": die schakelaar is weg, "tot" staat nu op fase 5
  p.settings.numerals = false; p.settings.stageMax = MAX; app.migrate(p);
  check(p.settings.numerals === true && p.settings.stageMax === 5 && app.countMaxStage(p.settings) === 5,
    'S · cijfers uit wordt "tot" fase 5: ze speelt precies hetzelfde', JSON.stringify(p.settings));
  for (let i = 0; i < n; i++) show(5, 3);
  check(tip() === 'fase', 'S · en vast op fase 5 is de volgende stap gewoon de volgende fase', String(tip()));
  app.run('telTip(P())').doe(p); app.telPlafondOpnieuw(p);
  check(p.settings.stageMax === 6, 'S · de knop zet "tot" op de cijfers', p.settings.stageMax);
  p.settings.stageMax = MAX; app.telPlafondOpnieuw(p);
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
  check(s.track === 'math' && s.max === 10 && s.ops.join() === '+,-' && s.mode === 'kies' && !('voorlezen' in s),
    'S · naar rekenen: plus en min tot 10, kiezen, zonder stem', JSON.stringify(s));
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
  check(app.stemAan(p) === false, 'S · de rekenmodus zwijgt, ook net na de overstap', '');
  // de oude schakelaar Voorlezen verdwijnt bij het laden
  s.voorlezen = true; app.migrate(p);
  check(!('voorlezen' in s) && app.stemAan(p) === false, 'S · een oude Voorlezen aan geeft geen stem meer', JSON.stringify(s));
  // memory is er alleen voor een telkind (zie memoryAan)
  check(app.run('memoryAan')(p) === false, 'S · een rekenkind krijgt geen memory-knop', '');
  s.track = 'count';
  check(app.run('memoryAan')(p) === true, 'S · een telkind wel', '');
  s.memory = false;
  check(app.run('memoryAan')(p) === false, 'S · tenzij de ouder hem uitzette', '');
  s.track = 'math'; s.memory = true;
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
  // rekenen: de rij waar padNa haar naartoe schoof, met naam en voorbeeld
  const m = app.db.profiles.p2 = app.defaultProfile('Reken', 'dress_roze', {});
  app.normalizeProfiles();
  check(app.groeiMoment(m, {}, 0, null) === null, 'W · niet doorgeschoven: niets', JSON.stringify(m.gezien));
  const zoek = app.groeiMoment(m, {}, 0, 'zoek');
  check(zoek && /Zoek het getal/.test(zoek.pil) && zoek.pil.includes('▢') && zoek.id === 'zoek', 'W · een nieuwe rij: zijn naam en voorbeeld', JSON.stringify(zoek));
  check(app.groeiMoment(m, {}, 0, 'zoek') === null, 'W · de tweede keer niet meer', '');
  check(app.groeiMoment(m, {}, 0, 'alles') === null, 'W · voorbij de laatste rij is geen nieuwe stap', '');
  // de grens alleen is geen nieuws: zo stond er "tot 100" bij een kind op Tot 10
  m.settings.max = 100;
  check(app.groeiMoment(m, {}, 0, null) === null, 'W · een hogere grens alleen: niets (pas als de rij er is)', JSON.stringify(m.gezien));
  // elke rij van het leerpad kan zijn moment krijgen, en elke fase van de telmodus
  const alle = app.defaultProfile('Alle', 'dress_roze', {});
  alle.settings.ops = ['+', '-', 'x', ':']; alle.settings.max = 1000;
  const ids = app.padRijen(alle.settings).rijen.map(r => r.id);
  const zonder = ids.filter(id => { const g = app.groeiMoment(alle, {}, 0, id); return !g || !g.pil.includes(app.LEERPAD[app.PAD_IDX[id]].naam); });
  check(ids.length === app.LEERPAD.length && !zonder.length, 'W · elke rij van LEERPAD heeft een "Nieuw"', zonder.join() || ids.join());
  const tafelZonder = app.TAFELPAD.filter(r => { const g = app.groeiMoment(alle, {}, 0, r.id); return !g || !g.pil.includes(r.naam); });
  check(!tafelZonder.length, 'W · en elke rij van de tafelladder', tafelZonder.map(r => r.id).join());
  const tel = app.defaultProfile('Tel', 'dress_roze', app.COUNT_OPTS);
  const fases = [];
  for (let st = 2; st <= app.COUNT_STAGE_MAX; st++) { tel.countTrack.stage = st; const g = app.groeiMoment(tel, { count: true }, st - 1); if (!g || /undefined/.test(g.pil)) fases.push(st); }
  check(!fases.length, 'W · elke fase van de telmodus heeft een "Nieuw"', fases.join());
  // de eerste vraag die het nieuwe laat zien (vraagIsNieuw)
  const V = (tmpl, ans, op, kind, brug) => ({ tmpl, ans, op, kind, brug });
  check(app.vraagIsNieuw(V('8 + 5 = @', 13, '+', 'classic', true), 'brug20') && !app.vraagIsNieuw(V('4 + 3 = @', 7, '+', 'classic', false), 'brug20'),
    'W · over het tiental: alleen een som die erover gaat', '');
  check(app.vraagIsNieuw(V('12 + 5 = @', 17, '+', 'classic', false), 'tot20') && !app.vraagIsNieuw(V('3 + 4 = @', 7, '+', 'classic', false), 'tot20'),
    'W · tot 20: alleen een som boven de tien', '');
  check(app.vraagIsNieuw(V('40 + 30 = @', 70, '+', 'classic', false), 'tientallen') && !app.vraagIsNieuw(V('41 + 30 = @', 71, '+', 'classic', false), 'tientallen'),
    'W · tientallen: hele tientallen', '');
  check(app.vraagIsNieuw(V('3 + @ = 7', 4, '+', 'missing'), 'zoek') && app.vraagIsNieuw({ kind: 'bouw', op: 'bouw', tmpl: '4T 5E = @', ans: 45 }, 'bouwen100')
    && app.vraagIsNieuw(V('7 × 5 = @', 35, 'x', 'classic'), 'tafels2510') && !app.vraagIsNieuw(V('7 + 5 = @', 12, '+', 'classic'), 'tafels2510')
    && app.vraagIsNieuw(V('28 : 4 = @', 7, ':', 'classic'), 'tafels34') && !app.vraagIsNieuw(V('7 × 5 = @', 35, 'x', 'classic'), 'tafels34'),
    'W · zoek, bouwen, tafels: hun eigen soort vraag (een tafel: een tafel van die rij)', '');
  // een oude save die zoek-het-getal al kent, krijgt geen "Nieuw!" meer
  const oud = app.defaultProfile('Oud', 'dress_roze', {});
  delete oud.gezien; oud.opTrack = { '+': { n: 40, acc: 0.9, paused: false, unlockStap: 4, fast: 0.5 } };
  app.migrate(oud);
  check(app.groeiMoment(oud, { missShown: 1 }, 0) === null, 'W · een oude ster die het al kende: geen nieuws', JSON.stringify(oud.gezien));
});

zaak('X', () => {
  const { app } = verseSter('Wennen');
  const s = { max: 20 };
  check(app.moeilijkheid(0.5, s) === 1, 'X · zonder wennen: het hele bereik', String(app.moeilijkheid(0.5, s)));
  app.grensOmhoog(s, 50);
  check(s.max === 50 && s.wennen === app.WEN_SHOWS, 'X · de grens omhoog: wennen begint', JSON.stringify(s));
  const eerst = app.moeilijkheid(0.5, s);
  check(Math.abs(eerst - 0.6) < 1e-9, 'X · de eerste show op de nieuwe grens: ongeveer dertig van de vijftig', String(eerst));
  let vorige = eerst, stijgt = true;
  while (s.wennen > 0) { s.wennen--; const t = app.moeilijkheid(0.5, s); if (t < vorige) stijgt = false; vorige = t; }
  check(stijgt && vorige === 1, 'X · en het plafond klimt zonder terug te vallen naar het hele bereik', String(vorige));
  app.grensOmhoog(s, 50); app.grensOmhoog(s, 20);
  check(s.wennen === 0, 'X · omlaag hoeft niet te wennen', JSON.stringify(s));
  check(app.moeilijkheid(0.5) === 1, 'X · zonder instellingen: het hele bereik', '');
});

zaak('Y', () => {
  const { app, p } = verseSter('Accent');
  const w = i => app.WORLD_START[i];
  check([0, 1, 2, 3].every(i => app.wereldAccent(w(i), 'tot20') === null), 'Y · op een rij van het leerpad: geen accent, de rij is het nieuwe', '');
  const reeks = [0, 1, 2, 3, 4, 5].map(i => app.wereldAccent(w(i), 'alles'));
  check(new Set(reeks.slice(0, 3)).size === 3 && reeks.slice(0, 3).join() === reeks.slice(3).join(),
    'Y · voorbij de laatste rij: om de beurt gewoon, zoek het getal, drie getallen', JSON.stringify(reeks));
  // alles vrij: in een zoek-wereld zijn alle speciale vragen zoek-het-getal
  p.opTrack = { '+': { n: 40, acc: 0.95, paused: false, fast: 0.6 }, '-': { n: 40, acc: 0.95, paused: false, fast: 0.6 } };
  p.chainTrack = { seen: 20, acc: 0.95, paused: false, rung: 2, hot: 3 };
  p.missRamp = { rung: 1, hot: 0 };
  p.pad = { rij: 'alles', shows: 0, goed: 0, klaar: app.LEERPAD.map(r => r.id) };
  const soorten = accent => {
    const t = new Set();
    for (let i = 0; i < 60; i++) Object.values(app.planSpecials(p, app.vraagInst(p), 8, accent, 3)).forEach(x => t.add(x.type));
    return [...t].sort().join(',');
  };
  check(soorten('miss') === 'miss', 'Y · een zoek-wereld: alleen zoek het getal', soorten('miss'));
  check(soorten('chain') === 'chain', 'Y · een drie-getallen-wereld: alleen drie getallen', soorten('chain'));
  check(soorten(null) === 'chain,miss', 'Y · een gewone wereld: allebei', soorten(null));
  // nog niet op haar pad: dan komen ze niet, hoe goed ze ook rekent
  p.pad = null;
  check(soorten(null) === '', 'Y · op Tot 10 nog geen zoek het getal of drie getallen', soorten(null));
  p.pad = { rij: 'zoek', shows: 0, goed: 0, klaar: ['tot10', 'tot20', 'brug20'] };
  check(soorten(null) === 'miss', 'Y · op Zoek het getal: wel dat, nog geen drie getallen', soorten(null));
  // uitgevinkt: dan geen accent, gewoon wat er wél kan
  p.pad = { rij: 'alles', shows: 0, goed: 0, klaar: app.LEERPAD.map(r => r.id) };
  p.settings.missNum = false;
  check(soorten('miss') === 'chain', 'Y · zoek het getal uit: de zoek-wereld speelt gewoon', soorten('miss'));
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


/* ZB · De foutmelder (src/05-foutmelder.js). Het briefje heeft precies vijf velden
   en niets dat naar een kind wijst; onder de tests (file://) staat hij uit. */
zaak('ZB', () => {
  const { app } = verseSter('Lotte');
  const b = app.run("foutBriefje('TypeError: x is undefined\\nen meer', 'https://www.rekensterren.be/index.html?debug#a', 812, 9)");
  check(JSON.stringify(Object.keys(b)) === '["wat","waar","versie","scherm","toestel"]', 'ZB · vijf velden, niet meer', JSON.stringify(Object.keys(b)));
  check(b.wat === 'TypeError: x is undefined' && b.waar === 'index.html:812:9', 'ZB · eerste regel van de melding, bestand zonder zoekdeel', JSON.stringify(b));
  check(JSON.stringify(b).indexOf('Lotte') === -1, 'ZB · de naam van de ster gaat niet mee', JSON.stringify(b));
  const lang = app.run("foutBriefje('x'.repeat(500), '', 0, 0)");
  check(lang.wat.length === 120 && lang.waar === '', 'ZB · lange melding ingekort, geen plek zonder regel', lang.wat.length + ' ' + lang.waar);
  check(app.run('foutMeldenMag()') === false, 'ZB · vanaf file:// meldt hij niets', '');
});

zaak('ZC', () => {
  const { app } = verseSter();
  const z = app.spreekbaar;
  check(z('nog 2 shows met ⭐⭐⭐') === 'nog 2 shows met drie sterren', 'ZC · een rij sterren wordt "drie sterren"', z('nog 2 shows met ⭐⭐⭐'));
  check(z('🔒 Nog niet') === 'Nog niet', 'ZC · een emoji valt weg', z('🔒 Nog niet'));
  check(z('Joepie! Je hebt de trofee Sterrenhit · Brons!') === 'Joepie! Je hebt de trofee Sterrenhit, Brons!', 'ZC · het middenpuntje wordt een adempauze', z('Joepie! Je hebt de trofee Sterrenhit · Brons!'));
  check(z('Zilver · nog 4 sommen') === 'Zilver, nog 4 sommen', 'ZC · metaal en voortgang', z('Zilver · nog 4 sommen'));
  check(z('Ja, één! Knap gedaan!') === 'Ja, één! Knap gedaan!', 'ZC · gewone zinnen blijven zoals ze zijn', z('Ja, één! Knap gedaan!'));
  check(z('🗺️ ❤️‍🔥') === '', 'ZC · alleen emoji is niets om te zeggen', JSON.stringify(z('🗺️ ❤️‍🔥')));
});

zaak('ZD', () => {
  // Een ouder zet alleen de tafels van 3, 6 en 9 aan, terwijl er van vroeger nog
  // een gemiste 8 × 2 bewaard staat. Die mag niet meer terugkomen: niet als
  // herhaling, niet als onderhoud en niet in memory.
  const { app } = verseSter('Tafels');
  const p = app.db.profiles.p1 = app.defaultProfile('Tafels', 'dress_roze', {});
  app.normalizeProfiles();
  p.settings.ops = ['x']; p.settings.tables = [3, 6, 9];
  p.weak = {
    '8 × 2 = @': { ans: 16, op: 'x', w: 6 },
    '4 × 6 = @': { ans: 24, op: 'x', w: 2 },
    '3 + 4 = @': { ans: 7, op: '+', w: 6 },
  };
  p.learned = { '7 × 5 = @': { ans: 35, op: 'x', iv: 18, due: 0 } };
  p.stats.correct = 999;
  const gezien = new Set();
  for (let i = 0; i < 200; i++) { const q = app.pickWeak(p, p.settings); if (q) gezien.add(q.tmpl); }
  check(gezien.size === 1 && gezien.has('4 × 6 = @'), 'ZD · herhaling: alleen tafels die aanstaan', JSON.stringify([...gezien]));
  check(app.pickRefresh(p, p.settings) === null, 'ZD · onderhoud: een tafel die uitstaat komt niet langs', '');
  const mem = app.memSomDeck(p).cards.filter(c => c.som).map(c => c.som);
  check(!mem.includes('8 × 2') && !mem.includes('3 + 4'), 'ZD · memory: geen zwakke som die niet meer past', JSON.stringify(mem));
  // de aangetikte tafels zijn die van Zelf kiezen; op het leerpad zegt de tafelladder welke
  p.settings.modus = 'vrij';
  const vragen = [];
  for (let i = 0; i < 300; i++) vragen.push(app.buildQuestion(p, app.WORLD_START[5]).tmpl);
  // de tafel is het tweede getal, ook bij zoek-het-getal ("4 × @ = 12" is er geen)
  const vreemd = vragen.filter(t => / × \d+ = @$/.test(t) && ![3, 6, 9].includes(Number(t.match(/\d+/g)[1])));
  check(vreemd.length === 0, 'ZD · in een show: geen enkele tafel buiten 3, 6 en 9', JSON.stringify(vreemd.slice(0, 5)));
  delete p.settings.modus; p.weak = {}; p.learned = {};
  const ladder = [];
  for (let i = 0; i < 300; i++) ladder.push(app.buildQuestion(p, app.WORLD_START[5]).tmpl);
  const buiten = ladder.filter(t => ![2, 5, 10].includes(Number(t.match(/\d+/g)[1])));
  check(buiten.length === 0, 'ZD · op het leerpad: de tafels van haar rij (2, 5 en 10), niet die van Zelf kiezen', JSON.stringify(buiten.slice(0, 5)));
  // plus en min: een verlaagde grens geldt ook voor wat al bewaard stond
  p.settings.ops = ['+', '-']; p.settings.max = 10;
  p.weak = { '15 − 8 = @': { ans: 7, op: '-', w: 6 }, '6 + 3 = @': { ans: 9, op: '+', w: 2 } };
  const pm = new Set();
  for (let i = 0; i < 200; i++) { const q = app.pickWeak(p, p.settings); if (q) pm.add(q.tmpl); }
  check(pm.size === 1 && pm.has('6 + 3 = @'), 'ZD · min: 15 − 8 valt buiten "tot 10", ook al is het antwoord 7', JSON.stringify([...pm]));
});

/* ================= ZE · Oefenen: één bediening per instelling =================
   Oefenen is een kaart per thema dat aan staat en dan een voor de show (bij
   tellen wat · pad · show), en OEFEN_INSTELLINGEN zegt welke instelling in
   welke kaart staat. Hier stond eerst een kaart waar alles in belandde wat
   nergens anders paste, en dan kreeg een instelling er stilletjes een tweede
   bediening bij (de extra's als schakelaar én als leerpadstap, "Cijfers" naast
   de lijn "tot"). Dit valt om zodra dat weer gebeurt. */
zaak('ZE', () => {
  const app = laadApp();
  const kaarten = app.run('OEFEN_INSTELLINGEN');
  // alles wat kan staat er, in de volgorde van de tegels (een nieuw thema doet vanzelf mee)
  const gevallen = [
    ['math', { ops: ['+', '-', 'x', ':'], max: 20, themas: app.PLAATJE.slice() }, JSON.stringify(app.THEMAS.map(t => t.id).concat('show'))],
    ['math', { ops: ['+', '-', 'x', ':'], max: 20 }, '["rekenen","tafels","show"]'],   // geld staat standaard uit
    ['math', { ops: ['+', '-'], max: 10, missNum: false }, '["rekenen","show"]'],      // en met minder
    ['math', { ops: [':'] }, '["tafels","show"]'],
    ['count', { track: 'count' }, '["wat","pad","show"]'],
  ];
  for (const [track, opts, volgorde] of gevallen) {
    const s = app.defaultProfile('Roos', 'dress_roze', opts).settings;
    const groepen = app.run('oefenGroups')(s, '', null);
    check(JSON.stringify(groepen.map(g => g.kaart)) === volgorde,
      `ZE · ${track} ${JSON.stringify(opts)}: een kaart per thema dat aan staat, altijd in dezelfde volgorde`, JSON.stringify(groepen.map(g => g.kaart)));
    const gezien = {};
    for (const g of groepen) for (const [, k] of g.html.matchAll(/data-instelling="(\w+)"/g)) (gezien[k] = gezien[k] || []).push(g.kaart);
    const dubbel = Object.entries(gezien).filter(([, ks]) => ks.length > 1);
    check(!dubbel.length, `ZE · ${track}: geen instelling met twee bedieningen`, JSON.stringify(dubbel));
    const fout = Object.entries(gezien).filter(([k, ks]) => !(kaarten[track][ks[0]] || []).includes(k));
    check(!fout.length, `ZE · ${track}: elke bediening staat in de kaart die OEFEN_INSTELLINGEN zegt`, JSON.stringify(fout));
    if (opts.themas || track === 'count') {
      /* De ladders wisselen met de modus (Leerpad of Zelf kiezen): samen
         hebben ze elke instelling, en elk alleen de zijne. */
      const vrij = app.run('oefenGroups')({ ...s, modus: 'vrij' }, '', null);
      for (const g of vrij) for (const [, k] of g.html.matchAll(/data-instelling="(\w+)"/g)) (gezien[k] = gezien[k] || []).push(g.kaart);
      const alle = Object.values(kaarten[track]).flat();
      const mist = alle.filter(k => !gezien[k]);
      check(!mist.length, `ZE · ${track}: met alles aan heeft elke instelling een bediening (leerpad + zelf kiezen)`, JSON.stringify(mist));
      const kaart = track === 'count' ? 'pad' : 'rekenen';
      const pad = groepen.find(g => g.kaart === kaart).html, kies = vrij.find(g => g.kaart === kaart).html;
      check(/data-instelling="(padVanaf|stage)"/.test(pad) && !/data-instelling="kies/.test(pad)
        && /data-instelling="kies/.test(kies) && !/data-instelling="(padVanaf|stage)"/.test(kies),
        `ZE · ${track}: het leerpad heeft zijn lijnen, Zelf kiezen zijn vinkjes, nooit allebei`, '');
      if (track === 'math') {
        const t = groepen.find(g => g.kaart === 'tafels').html, tv = vrij.find(g => g.kaart === 'tafels').html;
        check(/data-instelling="tafelLijn"/.test(t) && !/data-instelling="tables"/.test(t)
          && /data-instelling="tables"/.test(tv) && !/data-instelling="tafelLijn"/.test(tv),
          'ZE · tafels: op het leerpad de tafelladder, bij Zelf kiezen "Tafels van", nooit allebei', '');
        for (const [k, { lijn, kies }] of app.PLAATJE.map(k => [k, app.LADDERS[k]])) {
          const l = groepen.find(g => g.kaart === k).html, v = vrij.find(g => g.kaart === k).html;
          check(l.includes(`data-instelling="${lijn}"`) && !l.includes(`data-instelling="${kies}"`)
            && v.includes(`data-instelling="${kies}"`) && !v.includes(`data-instelling="${lijn}"`),
            `ZE · ${k}: op het leerpad de ladder, bij Zelf kiezen de vinkjes, nooit allebei`, '');
        }
      }
    }
  }
});

/* ================= ZF · Het leerpad zegt wat het speelt =================
   Elke rij (zie LEERPAD, padRijen) noemt wat hij brengt en toont een voorbeeld
   uit wat de ouder koos. Over alle combinaties van bewerkingen, grenzen en een
   paar tafelsets:
     * de rijen staan in de volgorde van de tabel, en de lijn "tot" snijdt
       alleen rijen met grotere getallen af, nooit een vorm (tafels, zoek ...);
     * in een voorbeeld staat geen teken dat niet gekozen is, geen getal boven
       het bereik van de rij, en het gaat over het tiental precies op de rijen
       "Over het tiental";
     * een × of ÷ gebruikt een tafel die aan staat;
     * DE BELOFTE: wat de vraagmaker op een rij maakt blijft binnen zijn bereik,
       gaat niet over het tiental vóór die rij er is, en brengt geen tafels
       vóór de rij Tafels. Een nieuwe rij in LEERPAD wordt hier dus meteen
       nagemeten;
     * de tafels zijn altijd heel. */
zaak('ZF', () => {
  const { app } = verseSter('Pad');
  const teken = { '+': '+', '−': '-', '×': 'x', ':': ':' };
  const opsSets = [];
  for (let m = 1; m < 16; m++) opsSets.push(['+', '-', 'x', ':'].filter((_, i) => m & (1 << i)));
  let n = 0, beloofd = 0;
  const fouten = [], beloftes = [];
  for (const ops of opsSets) for (const max of [10, 20, 100, 1000]) for (const tables of [[2, 5, 10], [7], [3, 8]]) {
    const s = instVan(app, { ops, max, tables });
    const { rijen, later } = app.padRijen(s);
    const plusMin = ops.includes('+') || ops.includes('-');
    // de volgorde is die van de tabel, en de lijn "tot" snijdt alleen getallen af
    const plekken = rijen.concat(later).map(r => app.PAD_IDX[r.id]);
    if (rijen.some((r, i) => i && plekken[i] < plekken[i - 1])) fouten.push(`volgorde: ${ops.join('')} tot ${max}`);
    const vormen = app.LEERPAD.filter(r => r.soort === 'vorm').map(r => r.id);
    const metVorm = app.padRijen({ ...s, max: 100 }).rijen.filter(r => vormen.includes(r.id)).map(r => r.id).join();
    if (rijen.filter(r => vormen.includes(r.id)).map(r => r.id).join() !== metVorm) fouten.push(`de grens snijdt een vorm af: ${ops.join('')} tot ${max}`);
    if (!plusMin && (later.length || rijen.some(r => r.soort === 'bereik'))) fouten.push(`getallen zonder + −: ${ops.join('')}`);
    rijen.concat(later).forEach((st, i, alle) => {
      n++;
      const waar = `${ops.join('')} tot ${max} tafels ${tables} · ${st.naam} "${st.vb}"`;
      if (i && alle[i - 1].naam === st.naam) fouten.push('dubbele naam: ' + waar);
      if (!st.vb) return fouten.push('geen voorbeeld: ' + waar);
      const tekens = (st.vb.match(/[+−×:]/g) || []).map(t => teken[t]);
      if (tekens.some(t => !ops.includes(t))) fouten.push('teken niet gekozen: ' + waar);
      const getallen = (st.vb.match(/\d+/g) || []).map(Number);
      const grens = st.soort === 'bereik' ? st.bereik : max;
      if (/[+−]/.test(st.vb) && !st.vb.includes('▢') && st.id !== 'drie') {
        const [a, op, b] = st.vb.split(' ');
        const uit = op === '+' ? +a + +b : +a - +b;
        if (Math.max(...getallen, uit) > grens) fouten.push('boven het bereik: ' + waar);
        // tot 1000 in hele tientallen: over het honderdtal is daar over het tiental, een maat groter
        const m = grens > 100 ? 10 : 1;
        const over = op === '+' ? (+a / m % 10) + (+b / m % 10) > 10 : (uit / m % 10) + (+b / m % 10) > 10;
        if (over !== (st.brug === 'vaak')) fouten.push('over het tiental klopt niet: ' + waar);
      }
      if (/[×:]/.test(st.vb)) {
        const tafel = st.vb.includes('▢') ? getallen[1] / getallen[0] : getallen[1];
        if (!tables.includes(tafel)) fouten.push('tafel staat uit: ' + waar);
      }
    });
    /* DE BELOFTE VAN ELKE RIJ: wat de vraagmaker op die rij maakt, past bij wat
       de rij zegt. Plus en min binnen zijn bereik, niet over het tiental vóór
       de rij die dat brengt, alleen tekens die al op het pad staan. */
    if (tables.length !== 3) continue;
    for (const r of rijen) {
      const st = app.padStand(s, r.id);
      for (let k = 0; k < 60; k++) {
        beloofd++;
        const op = st.ops[k % st.ops.length];
        const t = app.genTriple({ ...s, ...st }, 1, k % 3 / 2, op);
        const waar = `${ops.join('')} tot ${max} · ${r.naam}: ${t.a} ${t.sym} ${t.b} = ${t.c}`;
        if (!ops.includes(op)) beloftes.push('teken niet gekozen: ' + waar);
        if ((op === '+' || op === '-') && Math.max(t.a, t.b, t.c) > st.max) beloftes.push('boven het bereik: ' + waar);
        const m = st.max > 100 ? 10 : 1;   // tot 1000: in hele tientallen (zie genTriple)
        if ((op === '+' || op === '-') && [t.a, t.b, t.c].some(v => v % m)) beloftes.push('tot 1000 niet in hele tientallen: ' + waar);
        if ((op === '+' || op === '-') && st.brug === 'nee' && app.run('overTiental')(t.a / m, t.b / m, t.c / m, op)) beloftes.push('over het tiental te vroeg: ' + waar);
      }
      if (st.ops.includes('x') || st.ops.includes(':')) beloftes.push(`tafels op de rekenladder: ${ops.join('')} ${r.naam}`);
    }
  }
  check(!fouten.length, `ZF · ${n} rijen: volgorde, naam en voorbeeld kloppen met de gekozen sommen`, fouten.slice(0, 6).join(' | '));
  check(!beloftes.length, `ZF · ${beloofd} sommen: elke rij maakt wat hij belooft`, beloftes.slice(0, 6).join(' | '));
  // tot 10: geen Tot 20 of Over het tiental, wel de vormen
  check(padNamen(app, instVan(app, { ops: ['+', '-'], max: 10 })) === 'Tot 10,Zoek het getal,Drie getallen',
    'ZF · tot 10: Tot 10, en de vormen blijven boven de lijn', padNamen(app, instVan(app, { ops: ['+', '-'], max: 10 })));
  const maal = app.padRijen(instVan(app, { ops: ['x'], tables: [8] })).rijen;
  check(!maal.length, 'ZF · alleen ×: geen rekenladder (de tafels zijn een eigen thema)', maal.map(st => st.naam).join());
  const alles = padNamen(app, instVan(app, { ops: ['+', '-', 'x', ':'], max: 100 }));
  check(alles === 'Tot 10,Tot 20,Over het tiental,Zoek het getal,Drie getallen,Getallen bouwen tot 100,Tientallen,Tot 100,Over het tiental tot 100',
    'ZF · alles aan tot 100: de hele ladder in de volgorde van school', alles);
  const duizend = padNamen(app, instVan(app, { ops: ['+', '-'], max: 1000 }));
  check(duizend.endsWith('Tot 100,Over het tiental tot 100,Getallen bouwen tot 1000,Honderdtallen,Tot 1000,Over het honderdtal'),
    'ZF · tot 1000: het blok van het derde leerjaar komt erachter', duizend);
  // de tafels zijn heel vanaf de eerste show, ook voor een kind dat worstelt
  const s = instVan(app, { ops: ['x', ':'], tables: [7] });
  const factoren = new Set();
  for (let k = 0; k < 400; k++) {
    const t = app.genTriple(s, 1, 0, k % 2 ? 'x' : ':');
    factoren.add(t.op === 'x' ? t.a : t.c);
  }
  check(factoren.size === 10 && Math.max(...factoren) === 10, 'ZF · zwak kind: de tafel loopt van × 1 tot × 10', [...factoren].sort((a, b) => a - b).join());
});

/* ================= ZG · Onomkeerbaar: één vraag, één vorm ================= */
/* Wissen, verwijderen en terugzetten schreven hun venster elk met de hand, en
   liepen daardoor uiteen. Nu gaat alles wat iets weggooit door gevaarVraag
   (70-ouderdeel). showConfirm tekent de rode ja-knop, dus wie hem ergens anders
   rechtstreeks aanroept, maakt een vierde eigen venster -- zonder Weg/Blijft,
   zonder back-upregel en zonder Terug. */
zaak('ZG', () => {
  const bron = harnas.appScript();
  const plekken = [];
  const re = /\bshowConfirm\(/g;
  let m;
  while ((m = re.exec(bron))) {
    const voor = bron.slice(0, m.index);
    const fn = [...voor.matchAll(/function\s+([\w$]+)\s*\(/g)].pop();
    plekken.push(/function\s*$/.test(voor) ? 'definitie' : fn ? fn[1] : '?');
  }
  const los = plekken.filter(n => n !== 'definitie' && n !== 'gevaarVraag');
  check(plekken.includes('gevaarVraag') && !los.length,
    'ZG · showConfirm wordt alleen vanuit gevaarVraag aangeroepen', los.join(', '));

  const { app } = verseSter('Weg');
  const run = app.run;
  check(run('opsomming')(['Sem']) === 'Sem' && run('opsomming')(['Sem', 'Noor']) === 'Sem en Noor'
    && run('opsomming')(['Sem', 'Noor', 'Lina']) === 'Sem, Noor en Lina', 'ZG · opsomming: "Sem, Noor en Lina"', '');
});

/* ================= ZH · Past het niveau? =================
   Het label (vgStand, op het overzicht van de sterren) zegt hoe de stap van NU past. Twee
   valkuilen houdt deze zaak dicht:
     - de shows van de vorige stap tellen niet mee. Het pad schuift door zodra
       ze een rij kan, en dan waren de laatste tien bijna allemaal makkelijker:
       "gaat vlot" boven de stap die ze net lastig vindt.
     - de tellers sinds het begin (p.stats, p.stars) veranderen het label niet;
       die staan in Meer cijfers.
   En de rij met wat al kan noemt de stappen zoals de ladder in de open kaart
   (padRijen, COUNT_STAGE_LABELS), niet "Stap 1–3" of "Fase 1–2". Op de
   themakaart zelf staat geen label meer; haar rij loopt vol (metVul, rijDeel). */
zaak('ZH', () => {
  const { app, p } = verseSter('Niveau');
  const stand = () => app.run('vgStand(db.profiles.p1)');
  const show = (sterren, n) => { for (let i = 0; i < (n || 1); i++) app.onthoudUitkomst(p, sterren, app.run('stapSleutel(db.profiles.p1)')); };
  check(stand() === 'nieuw', 'ZH · zonder shows: net begonnen', stand());
  show(3);
  check(stand() === 'stap', 'ZH · één show op deze stap is nog te weinig: nieuwe stap', stand());
  show(3, 4);
  check(stand() === 'vlot', 'ZH · alles drie sterren op deze stap: gaat vlot', stand());
  // ze schuift door naar de volgende rij: de oude shows tellen niet meer
  p.pad = { klaar: ['tot10'], rij: 'tot20', shows: 0, goed: 0 };
  check(app.run('padNu(db.profiles.p1)') === 'tot20', 'ZH · (opzet) ze staat op Tot 20', app.run('padNu(db.profiles.p1)'));
  check(stand() === 'stap', 'ZH · na een stap verder: geen "gaat vlot" uit de vorige stap', stand());
  show(0, 2);
  check(stand() === 'pittig', 'ZH · twee mislukte op de nieuwe stap: even pittig, ook na vijf keer drie sterren', stand());
  // tellers sinds het begin veranderen het label niet
  const voor = stand();
  p.stats = { correct: 999, wrong: 0 }; p.stars = { 1: 3, 2: 3, 3: 3 };
  check(stand() === voor, 'ZH · p.stats en p.stars veranderen het label niet', stand());
  // de rij met wat al kan: de namen van de ladder
  p.pad = { klaar: ['tot10', 'tot20', 'brug20'], rij: 'zoek', shows: 0, goed: 0 };
  p.settings.max = 20;
  const html = app.run('rekenLadderHtml(db.profiles.p1)');
  const namen = app.run('padRijen(db.profiles.p1.settings).rijen.slice(0, 3).map(r => r.naam)');
  check(html.includes(`${namen[0]} … ${namen[2]}`) && !/Stap 1/.test(html),
    'ZH · wat al kan heet zoals op de ladder ("Tot 10 … Over het tiental")', namen.join(', '));
  check(!/vg-tag/.test(html) && !/vg-balk/.test(html) && (html.match(/--vul:/g) || []).length === 1,
    'ZH · op de themakaart geen label en geen balkje: alleen haar rij loopt vol', '');
  // haar rij loopt alleen vol: een mindere show maakt hem niet leger (rijDeel leest shows en vragen, niet de reeks)
  const deel = t => app.run('rijDeel')(t);
  check(deel({ shows: 2, goed: 2, vragen: 12 }) === deel({ shows: 2, goed: 0, vragen: 12 }) && deel({ shows: 3, goed: 0, vragen: 18 }) > deel({ shows: 2, goed: 2, vragen: 12 })
    && deel({ shows: 99, vragen: 99 }) === 1,
    'ZH · de volle rij telt goede shows op deze rij, niet de drie-sterrenreeks', '');
  /* Bij een mix krijgt een thema maar een paar vragen per show, en gaat ze na
     acht shows nog niet door (rijVerder: ook PAD_MAX_VRAGEN). Dan mag de rij
     niet vol staan; en "nog N shows" telt dat mee. Op de grens zelf is hij wél
     vol, en dan zegt rijVerder ook dat ze verder mag. */
  check(deel({ shows: 8, vragen: 8 }) < 1 && deel({ shows: 8, vragen: 16 }) === 1 && deel({ shows: 16, vragen: 8 }) === 1,
    'ZH · bij weinig vragen per show staat de rij na acht shows nog niet vol', JSON.stringify([deel({ shows: 8, vragen: 8 })]));
  const rv = t => app.run('rijVerder')(Object.assign({ goed: 0, reeks: [1, 0, 1, 0, 1, 0] }, t), 2, []);
  check(!rv({ shows: 7, vragen: 8 }) && rv({ shows: 7, vragen: 16 }) && rv({ shows: 15, vragen: 8 }),
    'ZH · (en dat is ook wat rijVerder doet: de rij is vol precies als ze verder mag)', '');
  const nog = t => app.run('showsNog')(t);
  check(nog({ shows: 3, vragen: 15 }) === 5 && nog({ shows: 4, vragen: 4 }) === 12 && nog(null) === 8,
    'ZH · nog N shows: wat er aan shows ontbreekt, of aan vragen in haar tempo', JSON.stringify([nog({ shows: 3, vragen: 15 }), nog({ shows: 4, vragen: 4 }), nog(null)]));
  p.settings.track = 'count';
  p.countTrack = { stage: 4, rung: 0, streak: 0, seen: 0, acc: 0.5 };
  const tel = app.run('rekenLadderHtml(db.profiles.p1)');
  check(tel.includes('Tellen 1–3 … Meer / minder') && !/Fase 1/.test(tel),
    'ZH · ook bij tellen: de namen van de fases', (tel.match(/fl-rij klaar[\s\S]*?<\/div>/) || [''])[0].replace(/<[^>]+>/g, ' '));
});

/* ================= ZI · Zelf kiezen: precies wat er aangevinkt staat =================
   Naast het leerpad (dat zelf doorschuift) kan een ouder zeggen wat er gespeeld
   wordt (s.modus 'vrij', zie zelfGekozen in 55-vragen). Elke vraag komt dan uit
   één aangevinkte rij, met de regels van die rij alleen -- en niets schuift
   door: geen tip, en bij "gaat vlot" zegt het label "Klaar voor meer" en staat
   de volgende rij er op de themakaart bij met "↑ Erbij" (zelfErbij). */
zaak('ZI', () => {
  const { app, p } = verseSter('Kies');
  const s = p.settings;
  p.weak = {}; p.learned = {};
  // zoals een show ze bouwt: een thema per vraag (themaPlan), met de vraagmaker van dat thema
  const vragen = (n) => {
    n = n || 150;
    const g = { idx: 0, qs: [], themaPlan: app.themaPlan(s, n), insts: Object.fromEntries(app.themasAan(s).map(k => [k, app.themaInst(p, k)])) };
    return Array.from({ length: n }, (_, i) => { g.idx = i; return (g.qs[i] = app.buildQuestion(p, 1, g)); });
  };
  const getallen = q => (q.tmpl.match(/\d+/g) || []).map(Number);
  s.modus = 'vrij'; s.ops = ['+', '-']; s.max = 10;
  check(app.zelfGekozen(s) && !app.zelfGekozen({ ...s, modus: undefined }), 'ZI · modus vrij is Zelf kiezen, zonder modus het leerpad (oude saves)', '');
  check(app.kiesRijen(s).map(r => r.id).join() === 'tot10,tot20,brug20,zoek,drie,bouwen100,tientallen,tot100,brug100,bouwen1000,honderdtallen,tot1000,brug1000',
    'ZI · aan te vinken: alle + − rijen, ook boven de grens van het leerpad', app.kiesRijen(s).map(r => r.id).join());
  s.kies = ['brug20'];
  let qs = vragen();
  check(qs.every(q => q.kind === 'classic' && q.brug && Math.max(...getallen(q), q.ans) <= 20),
    'ZI · alleen Over het tiental: elke som gaat over het tiental, tot 20', qs.filter(q => !q.brug).slice(0, 3).map(q => q.tmpl).join(' | '));
  s.kies = ['tientallen'];
  qs = vragen();
  check(qs.every(q => getallen(q).every(n => n % 10 === 0)), 'ZI · alleen Tientallen: hele tientallen', qs.filter(q => getallen(q).some(n => n % 10)).slice(0, 3).map(q => q.tmpl).join(' | '));
  s.kies = ['zoek'];
  check(vragen().every(q => q.kind === 'missing'), 'ZI · alleen Zoek het getal: elke vraag zoekt het getal (zonder op beheersing te wachten)', '');
  s.kies = ['bouwen100'];
  check(vragen().every(q => q.kind === 'bouw'), 'ZI · alleen Getallen bouwen: elke vraag bouwt', '');
  s.kies = ['tot10']; s.ops = ['+', 'x']; s.tables = [3];
  qs = vragen();
  const pm = qs.filter(q => q.op === '+'), keer = qs.filter(q => q.op === 'x');
  check(pm.length === keer.length && pm.every(q => q.ans <= 10) && keer.every(q => getallen(q)[1] === 3) && qs.every(q => q.op === '+' || q.op === 'x'),
    'ZI · het thema Tafels speelt mee, even vaak als de aangevinkte + rij', `${pm.length} plus, ${keer.length} keer`);
  check(Object.keys(app.planSpecials(p, app.vraagInst(p), 8, null, -1)).length === 0, 'ZI · geen ingeroosterde extra vragen: wat er speelt is wat er aanstaat', '');
  // niets schuift door, en geen tip
  s.ops = ['+', '-'];
  for (let i = 0; i < 6; i++) app.onthoudUitkomst(p, 3, app.run('stapSleutel(db.profiles.p1)'));
  check(app.run('vgStand(db.profiles.p1)') === 'meer' && app.run('grensTip(db.profiles.p1)') === null,
    'ZI · gaat het vlot: "Klaar voor meer", zonder tip die een lijn verzet', app.run('vgStand(db.profiles.p1)'));
  const erbij = app.run('zelfErbij(db.profiles.p1)');
  check(erbij && erbij.k === 'rekenen' && erbij.naam === 'Tot 20' && /erbij-ja/.test(app.run('zelfLadderHtml(db.profiles.p1, "rekenen")')),
    'ZI · gaat het vlot: de volgende rij staat erbij, met "↑ Erbij"', erbij && erbij.naam);
  erbij.doe();
  check(s.kies.join() === 'tot10,tot20' && app.run('vgStand(db.profiles.p1)') !== 'meer' && !app.run('zelfErbij(db.profiles.p1)'),
    'ZI · ↑ Erbij vinkt hem aan, en het label begint opnieuw', s.kies.join());
  const html = app.run('zelfLadderHtml(db.profiles.p1, "rekenen")');
  check(/Tot 10/.test(html) && /Tot 20/.test(html) && !/niveau-bezig/.test(html),
    'ZI · de themakaart: wat er aangevinkt staat, zonder "hier"', '');
  // naar Zelf kiezen: de rij waar ze op het leerpad is staat al aan
  delete s.modus; s.max = 20; s.kies = undefined;
  p.pad = { klaar: ['tot10', 'tot20'], rij: 'brug20', shows: 0, goed: 0 };
  check(app.kiesStart(p).join() === 'brug20', 'ZI · start: de rij waar ze nu is', app.kiesStart(p).join());
  p.pad = { klaar: ['tot10', 'tot20', 'brug20', 'zoek', 'drie'], rij: 'alles', shows: 0, goed: 0 };
  check(app.kiesStart(p).join() === 'drie', 'ZI · start op Alles door elkaar: de laatste + − rij die ze had', app.kiesStart(p).join());
  // tellen: elke vraag uit een aangevinkte fase, en de fase schuift niet
  const t = app.defaultProfile('Tel', 'dress_roze', app.COUNT_OPTS);
  t.settings.modus = 'vrij'; t.settings.kiesFasen = [3, 7];
  const fases = new Set(Array.from({ length: 80 }, () => app.telFase(t)));
  check([...fases].sort().join() === '3,7', 'ZI · tellen: elke vraag uit een aangevinkte fase', [...fases].join());
  check(app.run('stapSleutel')({ settings: t.settings }) !== app.run('stapSleutel')({ settings: { ...t.settings, kiesFasen: [3] }, countTrack: t.countTrack }),
    'ZI · tellen: een andere keuze is een andere stap', '');
});

/* ================= TH · Thema's: elk zijn ladder, samen één show =================
   Rekenen en Tafels zijn twee thema's (zie THEMAS in 55-vragen), elk met een
   eigen ladder en een eigen plek erop. Wat hier vast moet blijven:
     * aan of uit zit in s.ops, het laatste thema kan niet uit, en wat een
       ouder uitzette komt terug zoals het was (s.opsRust);
     * een show wisselt de thema's af, evenveel vragen elk;
     * elk thema schuift door op zijn eigen vragen (themaSterren);
     * de tafelladder speelt de tafels van haar rij, en wat ervoor kwam;
     * Zelf kiezen gaat om de beurt: elke aangevinkte rij en elke tafel komt
       in een show langs;
     * een save van vóór de thema's verliest niets. */
zaak('TH', () => {
  const { app, p } = verseSter('Thema');
  const s = p.settings;
  check(app.themasAan(s).join() === 'rekenen', 'TH · een verse ster: alleen rekenen', app.themasAan(s).join());
  check(app.themaZet(s, 'rekenen', false) === false && app.themasAan(s).join() === 'rekenen', 'TH · het laatste thema kan niet uit', JSON.stringify(s.ops));
  app.themaZet(s, 'tafels', true);
  check(s.ops.join() === '+,-,x', 'TH · tafels aan: ×, de eerste van zijn twee', s.ops.join());
  s.ops.push(':');
  app.themaZet(s, 'tafels', false); app.themaZet(s, 'tafels', true);
  check(s.ops.includes('x') && s.ops.includes(':'), 'TH · uit en weer aan: × en ÷ zoals de ouder ze had', s.ops.join());
  s.ops = s.ops.filter(o => o !== '-');
  app.themaZet(s, 'rekenen', false); app.themaZet(s, 'rekenen', true);
  check(s.ops.includes('+') && !s.ops.includes('-'), 'TH · rekenen terug: alleen +, zoals het stond', s.ops.join());
  s.ops = ['+', '-', 'x'];

  // de show: om de beurt, evenveel elk
  const plan = app.themaPlan(s, 8);
  check(plan.join() === 'rekenen,tafels,rekenen,tafels,rekenen,tafels,rekenen,tafels', 'TH · een show van acht: om de beurt', plan.join());
  check(app.themaPlan(s, 5).filter(k => k === 'rekenen').length === 3, 'TH · een oneven show: de extra vraag voor wie eerst staat', app.themaPlan(s, 5).join());
  check(app.themaPlan({ ops: ['x'] }, 5).every(k => k === 'tafels'), 'TH · één thema: elke vraag', '');

  // de sterren van een thema: alleen zijn eigen vragen
  const g = { themaPlan: plan, qs: plan.map(() => ({})), uitslag: ['goed', 'mis', 'goed', 'hint', 'goed', 'goed', 'goed', 'goed'] };
  check(app.themaSterren(g, 'rekenen') === 3 && app.themaSterren(g, 'tafels') === 1, 'TH · twee missers bij de tafels: de sommen houden hun drie sterren, de tafels krijgen er één',
    `${app.themaSterren(g, 'rekenen')} ${app.themaSterren(g, 'tafels')}`);
  {
    const kort = (uitslag) => app.themaSterren({ qs: uitslag.map(() => ({})), themaPlan: uitslag.map((u, i) => i < 6 ? 'rekenen' : 'geld'), uitslag: uitslag.map(u => u || 'goed') }, 'geld');
    const g2 = [0, 0, 0, 0, 0, 0];
    check(kort([...g2, 'goed', 'goed']) === 3 && kort([...g2, 'mis', 'goed']) === 2 && kort([...g2, 'hint', 'goed']) === 2 && kort([...g2, 'mis', 'mis']) === 1,
      'TH · twee geldvragen: 2 goed 3 sterren, 1 mis 2 sterren (telt mee), 2 mis 1 ster', '');
    check(app.themaSterren({ qs: [{}, {}], themaPlan: ['rekenen', 'klok'], uitslag: ['goed', 'mis'] }, 'klok') === 1, 'TH · één klokvraag gemist: 1 ster', '');
  }

  // de tafelladder: haar rij en wat ervoor kwam
  check(app.ladderNu(p, 'tafels') === 'tafels2510', 'TH · tafels beginnen bij 2, 5 en 10', app.ladderNu(p, 'tafels'));
  let inst = app.tafelInst(p);
  check(inst.tables.join() === '2,5,10' && inst.ops.join() === 'x', 'TH · op die rij: alleen die tafels, en alleen ×', JSON.stringify(inst.tables));
  for (let i = 0; i < 3; i++) app.ladderNa(p, 'tafels', 3);
  check(app.ladderNu(p, 'tafels') === 'tafels34' && p.tafels.klaar.join() === 'tafels2510', 'TH · drie shows met drie sterren: de volgende rij', JSON.stringify(p.tafels));
  inst = app.tafelInst(p);
  const getrokken = Array.from({ length: 400 }, () => app.genTriple(inst, 1, 0.5, 'x').b);
  const nieuw = getrokken.filter(b => b === 3 || b === 4).length / getrokken.length;
  check(getrokken.every(b => [2, 3, 4, 5, 10].includes(b)) && nieuw > 0.55, 'TH · op 3 en 4: de nieuwe het meest, 2, 5 en 10 komen nog terug', `${Math.round(nieuw * 100)}% nieuw`);
  s.tafelLijn = { tot: 'tafels34' };
  for (let i = 0; i < 3; i++) app.ladderNa(p, 'tafels', 3);
  check(app.ladderNu(p, 'tafels') === 'alles' && app.tafelInst(p).tables.join() === '2,5,10,3,4', 'TH · voorbij de lijn "tot": alles tot daar door elkaar', app.tafelInst(p).tables.join());
  check(app.vraagInst(p).ops.join() === '+,-', 'TH · de rekenladder speelt geen tafels', app.vraagInst(p).ops.join());

  // Zelf kiezen: om de beurt
  s.modus = 'vrij'; s.tables = [3, 6, 7, 9]; s.kies = ['tot10', 'brug20', 'tientallen'];
  for (let show = 0; show < 20; show++) {
    const ti = app.tafelInst(p), ki = app.vraagInst(p);
    const tafels = Array.from({ length: 4 }, () => app.genTriple(ti, 1, 0.5, 'x').b);
    if (tafels.slice().sort().join() !== '3,6,7,9') { check(false, 'TH · Zelf kiezen: vier tafelvragen, vier verschillende tafels', tafels.join()); break; }
    const rijen = [];
    for (let i = 0; i < 6; i++) rijen.push(app.beurt(ki, 'vrijStapel', ki.vrij).id);
    if (['tot10', 'brug20', 'tientallen'].some(id => rijen.filter(r => r === id).length !== 2)) { check(false, 'TH · Zelf kiezen: zes vragen, elke rij twee keer', rijen.join()); break; }
    if (show === 19) check(true, 'TH · Zelf kiezen: de tafels en de rijen gaan om de beurt', '');
  }
  delete s.modus;

  // een save van vóór de thema's
  const oud = app.defaultProfile('Oud', 'dress_roze', { ops: ['+', '-', 'x'], tables: [2, 3, 4, 5, 10] });
  oud.pad = { klaar: ['tot10', 'tot20', 'brug20', 'tafels', 'delen'], rij: 'zoek', shows: 1, goed: 0 };
  oud.settings.padTot = 'tafels';
  app.migrate(oud);
  check(oud.tafels && oud.tafels.klaar.join() === 'tafels2510,tafels34' && app.ladderNu(oud, 'tafels') === 'tafels69',
    'TH · oude save die de tafels haalde: de rijen waarvan ze alle tafels speelde zijn klaar', JSON.stringify(oud.tafels));
  check(oud.pad.klaar.join() === 'tot10,tot20,brug20' && app.padNu(oud) === 'alles' && oud.settings.padTot === 'brug20',
    'TH · "tot" op Tafels wordt de rij ervoor: op de rekenladder speelt ze wat ze speelde, alles tot de lijn', `${oud.pad.klaar} ${app.padNu(oud)} ${oud.settings.padTot}`);
  const op = app.defaultProfile('Op', 'dress_roze', { ops: ['+', 'x'] });
  op.pad = { klaar: ['tot10'], rij: 'tafels', shows: 2, goed: 1 };
  op.settings.padVanaf = 'delen';
  app.migrate(op);
  check(op.pad.rij === null && op.settings.padVanaf === 'zoek' && !op.tafels, 'TH · stond ze óp Tafels: haar volgende rij, en "vanaf" schuift mee', JSON.stringify(op.pad));
});

/* ================= GE · Geld als thema =================
   Geld staat standaard uit, krijgt er twee in een show van acht (nooit de
   eerste vraag), en groeit op zijn eigen ladder. Elke rij oefent zijn eigen
   nieuwe ding: briefjes heeft een briefje, centen heeft centen en is altijd
   kiezen. */
zaak('GE', () => {
  const { app, p } = verseSter('Geld');
  const s = p.settings;
  check(!app.themaAan(s, 'geld') && !('themas' in s), 'GE · een verse ster: geen geld, en geen nieuw veld', JSON.stringify(s.themas));
  app.themaZet(s, 'geld', true);
  check(s.themas.join() === 'geld' && app.themasAan(s).join() === 'rekenen,geld', 'GE · geld aan: het staat in s.themas', JSON.stringify(s.themas));
  let plan = app.themaPlan(s, 8);
  check(plan.filter(k => k === 'geld').length === 2 && plan[0] === 'rekenen' && plan.length === 8, 'GE · een show van acht: twee geldvragen, nooit de eerste', plan.join());
  check(app.themaPlan(s, 5).filter(k => k === 'geld').length === 1, 'GE · een show van vijf: één', app.themaPlan(s, 5).join());
  s.ops.push('x');
  plan = app.themaPlan(s, 8);
  check(plan.filter(k => k === 'geld').length === 2 && plan.filter(k => k === 'rekenen').length === 3 && plan.filter(k => k === 'tafels').length === 3,
    'GE · met tafels erbij: 3 sommen, 3 tafels, 2 geld', plan.join());
  check(plan.every((k, i) => i === 0 || k !== plan[i - 1]), 'GE · nooit twee keer hetzelfde thema na elkaar', plan.join());
  s.ops = ['+', '-'];
  app.themaZet(s, 'rekenen', false);
  check(app.themasAan(s).join() === 'geld' && app.themaPlan(s, 8).every(k => k === 'geld'), 'GE · alleen geld: elke vraag', JSON.stringify(s.ops));
  app.themaZet(s, 'rekenen', true);

  // elke rij oefent wat hij belooft
  const som = q => q.tmpl.replace(/^\w+ /, '').replace(' = @', '').split(' + ').map(Number);
  const rij = id => app.GELDPAD.find(r => r.id === id);
  const fout = {};
  for (let i = 0; i < 300; i++) for (const r of app.GELDPAD) {
    const q = app.genGeld(r), w = (fout[r.id] = fout[r.id] || []);
    if (r.terug) {
      const [briefje, prijs] = q.tmpl.replace('terug ', '').replace(' = @', '').split(' - ').map(Number);
      if (q.ans !== briefje - prijs || q.ans < 1 || q.kiezen) w.push(q.tmpl);
      continue;
    }
    const st = som(q), totaal = st.reduce((a, b) => a + b, 0), cent = r.centen ? totaal : totaal * 100;
    if (q.ans !== totaal) w.push('ans ' + q.tmpl);
    if (cent > r.tot) w.push('te groot ' + q.tmpl);
    if (r.briefje && Math.max(...st) < 5) w.push('geen briefje ' + q.tmpl);
    if (r.centen && (cent % 100 === 0 || !q.kiezen)) w.push('geen centen ' + q.tmpl);
    if (!r.centen && q.kiezen) w.push('kiezen ' + q.tmpl);
    if (!q.html.includes('geld-stuk')) w.push('geen munten ' + q.tmpl);
  }
  const mis = Object.entries(fout).filter(([, w]) => w.length);
  check(!mis.length, 'GE · elke rij: binnen zijn bedrag, briefjes met een briefje, centen met centen en altijd kiezen, teruggeven klopt', JSON.stringify(mis.map(([k, w]) => [k, w.slice(0, 2)])));
  check(app.euro(500) === '€5' && app.euro(170) === '€1,70' && app.euro(1005) === '€10,05', 'GE · bedragen in Belgische vorm', `${app.euro(500)} ${app.euro(170)} ${app.euro(1005)}`);
  const cq = app.genGeld(rij('centen'));
  check(app.toonAntwoord(cq, 170) === '1,70' && app.toonKeuze(cq, 170) === '€1,70' && app.toonKeuze(app.genGeld(rij('munten10')), 5) === '€5',
    'GE · op de knop €1,70 en €5, in het vakje 1,70', `${app.toonAntwoord(cq, 170)} ${app.toonKeuze(cq, 170)}`);
  let keuzeFout = 0;
  for (let i = 0; i < 200; i++) {
    const q = app.genGeld(app.GELDPAD[i % app.GELDPAD.length]);
    const k = app.makeChoices(q, app.keuzeGrens(q, s, 1));
    if (!k.includes(q.ans) || new Set(k).size !== 4 || k.some(v => v < q.min) || (q.centen && k.some(v => v % 10))) keuzeFout++;
  }
  check(!keuzeFout, 'GE · de keuzes: het antwoord ertussen, vier verschillende, nooit €0, centen in stappen van tien', String(keuzeFout));
  // de foute keuzes: fouten die een kind met geld echt maakt (zie genGeld)
  let geteld = 0, vergeten = 0, bovenAcht = 0;
  for (let i = 0; i < 400; i++) {
    const q = app.genGeld(rij('munten10')), st = som(q), k = app.makeChoices(q, app.keuzeGrens(q, s, 1));
    if (st.length !== q.ans && k.includes(st.length)) geteld++;
    if (k.includes(q.ans - st[st.length - 1])) vergeten++;
    if (q.ans > 8) bovenAcht++;
  }
  check(geteld > 40 && vergeten > 40, 'GE · bij de keuzes zit vaak "geteld i.p.v. opgeteld" of "één vergeten"', `${geteld} ${vergeten} /400`);
  check(bovenAcht > 10, 'GE · munten tot €10 komt ook boven €8', `${bovenAcht}/400`);
  const tq = app.genGeld(rij('terug'));
  check(/geld-prijs[^]*q?@?[^]*geld-stuk briefje/.test(tq.html.replace('@', 'q@')) && tq.html.includes('geld-aanvul') && !/[\u{1F300}-\u{1FAFF}]/u.test(tq.html),
    'GE · teruggeven als aanvullen: kaartje + € ? = briefje, zonder emoji', tq.html.slice(0, 60));

  // de ladder
  check(app.ladderNu(p, 'geld') === 'munten10', 'GE · geld begint bij munten tot €10', app.ladderNu(p, 'geld'));
  for (let i = 0; i < 3; i++) app.ladderNa(p, 'geld', 3);
  check(app.ladderNu(p, 'geld') === 'briefjes20' && p.geld.klaar.join() === 'munten10', 'GE · drie shows met drie sterren: briefjes', JSON.stringify(p.geld));
  const gi = app.rijenInst(p, 'geld');
  const rijen = Array.from({ length: 400 }, () => app.rijenVraag(gi, []).rij);
  const nieuw = rijen.filter(r => r === 'briefjes20').length / rijen.length;
  check(rijen.every(r => r === 'munten10' || r === 'briefjes20') && nieuw > 0.65, 'GE · op briefjes: de nieuwe het meest, munten komen nog terug', `${Math.round(nieuw * 100)}% nieuw`);
  check(app.ladderNu(p, 'tafels') === 'tafels2510' && !p.tafels, 'GE · de geldladder raakt de tafels niet', JSON.stringify(p.tafels));

  // Zelf kiezen: de rij waar ze was staat al aan, en de rijen gaan om de beurt
  s.modus = 'vrij';
  app.rijenKiesStart(s, p);
  check(s.kiesGeld.join() === 'briefjes20', 'GE · naar Zelf kiezen: haar rij staat al aangevinkt', JSON.stringify(s.kiesGeld));
  s.kiesGeld = ['centen', 'terug'];
  const vi = app.rijenInst(p, 'geld'), twee = Array.from({ length: 4 }, () => app.rijenVraag(vi, []).rij);
  check(twee.filter(r => r === 'centen').length === 2, 'GE · Zelf kiezen: om de beurt', twee.join());
  delete s.modus;

  // wissen houdt geld aan
  const opnieuw = app.defaultProfile('Geld', 'dress_roze', { ...s });
  check(app.themaAan(opnieuw.settings, 'geld') && opnieuw.settings.kiesGeld.join() === 'centen,terug', 'GE · opnieuw beginnen houdt geld en de vinkjes', JSON.stringify(opnieuw.settings.themas));
});

/* ================= KL · De klok als thema =================
   De tijd in woorden zoals een Vlaams kind hem zegt, vier keuzes op de maat
   van de rij, lezen en zoeken om de beurt, altijd kiezen. */
zaak('KL', () => {
  const { app, p } = verseSter('Klok');
  const s = p.settings;
  const woorden = { 0: '12 uur', 180: '3 uur', 210: 'half 4', 195: 'kwart over 3', 225: 'kwart voor 4', 190: '10 over 3',
    200: '20 over 3', 205: '25 over 3', 215: '25 voor 4', 220: '20 voor 4', 230: '10 voor 4', 250: '10 over 4', 690: 'half 12', 715: '5 voor 12', 30: 'half 1' };
  const mis = Object.entries(woorden).filter(([t, w]) => app.klokWoorden(Number(t)) !== w).map(([t, w]) => `${t}: ${app.klokWoorden(Number(t))} (niet ${w})`);
  check(!mis.length, 'KL · de tijd in woorden: 3 uur, half 4, kwart voor 4, 20 over 3 (nooit "voor half")', mis.join('; '));
  const viaHalf = Array.from({ length: 144 }, (_, i) => app.klokWoorden(i * 5)).filter(w => /(voor|over) half/.test(w));
  check(!viaHalf.length, 'KL · geen enkele tijd via half ("10 voor half 4", "5 over half 4")', viaHalf.join('; '));
  check(app.klokDigitaal(155 + 720) === '14:35' && app.klokDigitaal(65 + 720) === '13:05', 'KL · 24 uur: 14:35', app.klokDigitaal(875));

  const fout = {};
  for (let i = 0; i < 300; i++) for (const r of app.KLOKPAD) for (const vorm of ['lees', 'zoek']) {
    const q = app.genKlok(r, vorm), w = (fout[r.id] = fout[r.id] || []);
    // de 24 uur lezen rekent op de hele dag: het antwoord is de namiddag of de avond (zie klokDag)
    const dag = r.uur24 && vorm === 'lees', [lo, hi] = dag ? [780, 1440] : [r.uur24 ? 60 : 0, 720];
    if (q.ans % r.stap || q.ans < lo || q.ans >= hi) w.push('tijd ' + q.ans);
    if (q.keuzes.length !== 4 || new Set(q.keuzes).size !== 4 || !q.keuzes.includes(q.ans)) w.push('keuzes ' + q.keuzes);
    if (q.keuzes.some(v => v % r.stap || v < 60 * r.uur24 || v >= (dag ? 1440 : 720))) w.push('maat ' + q.keuzes);
    if (dag && !q.keuzes.includes(q.ans - 720)) w.push('de 12 vergeten ontbreekt ' + q.keuzes);
    if (dag && new Set(q.keuzes.map(app.klokDigitaal)).size !== 4) w.push('dubbel ' + q.keuzes);
    if (!q.kiezen) w.push('typen');
    if (vorm === 'lees' && (!q.html.includes('@') || !q.html.includes('<svg') || (dag && !q.html.includes('klok-dagdeel')))) w.push('lees ' + q.html.slice(0, 40));
    if (vorm === 'zoek' && q.html.includes('@')) w.push('zoek met vakje');
  }
  const kapot = Object.entries(fout).filter(([, w]) => w.length);
  check(!kapot.length, 'KL · elke rij: een tijd op zijn maat, vier verschillende keuzes op dezelfde maat, altijd kiezen', JSON.stringify(kapot.map(([k, w]) => [k, w.slice(0, 2)])));
  // de echte fout bij halve uren: half 4 gelezen als half 3 komt geregeld voor
  const half = Array.from({ length: 200 }, () => app.genKlok(app.KLOKPAD[1], 'lees')).filter(q => q.keuzes.includes((q.ans + 660) % 720)).length;
  check(half > 60, 'KL · halve uren: het uur ervoor zit er vaak bij (half 4 als half 3)', `${half}/200`);
  const q = app.genKlok(app.KLOKPAD[2], 'zoek');
  check(app.makeChoices(q, 0).slice().sort().join() === q.keuzes.slice().sort().join(), 'KL · de knoppen zijn de keuzes van de vraag', '');
  check(app.toonKeuze(q, q.ans).includes('<svg') && app.toonKeuze({ ...q, vorm: 'lees' }, 210).includes('half 4') && app.toonAntwoord(q, 210) === 'half 4',
    'KL · zoeken: klokjes op de knoppen; lezen: woorden', '');
  // de hint na een misser: later of vroeger, langs de kortste weg rond de klok (zie klokHint)
  const lq = app.genKlok(app.KLOKPAD[1], 'lees');
  const h = (ans, val, q = lq) => app.hintVoor({ ...q, ans }, val);
  check(h(210, 150).pijl === 'later' && h(150, 210).pijl === 'vroeger' && h(60, 660).pijl === 'later' && h(660, 60).pijl === 'vroeger',
    'KL · hint: half 4 na half 3 is later, 1 uur na 11 uur ook (rond de klok)', [h(210, 150).pijl, h(60, 660).pijl].join());
  check(h(210, 150).woorden === 'Later dan half 3' && app.hintTeken(lq, 150).includes('<svg') && app.hintTeken({ ...lq, vorm: 'zoek' }, 150) === 'half 3',
    'KL · hint: wat ze tikte in de andere vorm (woorden gekozen: een klokje; klokje gekozen: woorden)', h(210, 150).woorden);
  const dq = app.genKlok(app.KLOKPAD[4], 'lees');
  check(app.hintVoor(dq, dq.ans - 720).pijl === 'later' && app.toonAntwoord(dq, 860) === '14:20' && app.toonKeuze(dq, 860).includes('14:20'),
    'KL · 24 uur lezen: 2:20 i.p.v. 14:20 is te vroeg, en de knoppen zijn digitaal', app.toonAntwoord(dq, 860));

  // in de show
  app.themaZet(s, 'geld', true); app.themaZet(s, 'klok', true);
  const plan = app.themaPlan(s, 8);
  check(plan.filter(k => k === 'klok').length === 2 && plan.filter(k => k === 'geld').length === 2 && plan.filter(k => k === 'rekenen').length === 4 && plan[0] === 'rekenen',
    'KL · rekenen, geld en klok: 4 sommen, 2 geld, 2 klok, en de eerste is een som', plan.join());
  check(app.ladderNu(p, 'klok') === 'uren', 'KL · de klok begint bij hele uren', app.ladderNu(p, 'klok'));
  const ki = app.rijenInst(p, 'klok'), vormen = Array.from({ length: 6 }, () => app.rijenVraag(ki, []).vorm);
  check(vormen.every((v, i) => !i || v !== vormen[i - 1]), 'KL · lezen en zoeken om de beurt', vormen.join());
  check(Array.from({ length: 50 }, () => app.rijenVraag(ki, []).rij).every(r => r === 'uren'), 'KL · op hele uren: alleen hele uren', '');
});

/* ================= KA · De kalender als thema =================
   Elke vorm van elke rij: het antwoord tussen vier verschillende keuzes, en
   het klopt met de echte kalender. En de ladder groeit: een kind dat het kan
   klimt alle zeven rijen op, rij na rij, nooit een vraag van een rij die ze
   nog niet had, en de eerste vraag van een nieuwe rij is "Nieuw". */
zaak('KA', () => {
  const { app, p } = verseSter('Kalender');
  const s = p.settings, jaar = new Date().getFullYear();
  check(!app.themaAan(s, 'kalender'), 'KA · een verse ster: de kalender staat uit', JSON.stringify(s.themas));
  const mis = [];
  for (const r of app.KALENDERPAD) for (const v of ['lees', 'zoek']) for (let i = 0; i < 200; i++) {
    const q = app.genKalender(r, v), knop = app.makeChoices(q, app.keuzeGrens(q, s, 1));   // de knoppen zoals het spel ze legt
    if (q.rij !== r.id || !q.html.includes('@')) mis.push(`${r.id}/${v} vorm`);
    if (!knop.includes(q.ans) || knop.length !== 4 || new Set(knop).size !== 4) mis.push(`${r.id}/${v} keuzes ${knop}`);
    if (q.soort !== 'getal' && !q.kiezen) mis.push(`${r.id}/${v} een woord moet kiezen`);
    if (knop.some(k => !app.toonAntwoord(q, k))) mis.push(`${r.id}/${v} lege knop`);
  }
  check(!mis.length, 'KA · elke rij, elke vorm: het antwoord tussen vier verschillende keuzes, woorden altijd kiezen', [...new Set(mis)].slice(0, 3).join(' | '));
  /* het antwoord staat nooit al in de vraag: niet zijn woord, en bij een seizoen niet zijn teken -- dat
     staat op de antwoordknop, en dan zocht ze plaatje bij plaatje (🌷 bij de lente-dingen, uit de speeltest) */
  const verklapt = [];
  const woordVan = q => ({ dag: app.DAGEN, maand: app.MAANDEN }[q.soort] || [])[q.ans];
  for (const r of app.KALENDERPAD) for (const v of ['lees', 'zoek']) for (let i = 0; i < 200; i++) {
    const q = app.genKalender(r, v), w = woordVan(q);
    if (q.soort === 'seizoen' && (q.html.includes(app.SEIZOENEN[q.ans].teken) || q.html.includes(app.SEIZOENEN[q.ans].naam))) verklapt.push(`${q.tmpl}: ${app.SEIZOENEN[q.ans].teken}`);
    if (w && new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(q.html)) verklapt.push(`${q.tmpl}: ${w}`);
  }
  check(!verklapt.length && app.SEIZOENEN.every(z => app.SEIZOENEN.every(y => !y.dingen.includes(z.teken))),
    'KA · het antwoord staat nooit al in de vraag: geen woord, geen seizoensteken, en geen ding is een teken', [...new Set(verklapt)].slice(0, 3).join(' | '));
  // dagen tellen: de tel loopt langs de pijl, en de laatste tel staat op het vakje (zie kalBrug)
  const tel = [];
  for (const [r, v] of [[0, 'lees'], [0, 'zoek'], [2, 'lees'], [2, 'zoek']]) for (let i = 0; i < 60; i++) {
    const q = app.genKalender(app.KALENDERPAD[r], v), n = Math.abs(+q.tmpl.split(' ').pop());
    const rondjes = (q.html.match(/<span class="kal-tel-rij">(.*?)<\/span>/) || [, ''])[1].match(/<i>/g) || [];
    const opVak = (q.html.match(/kal-tel" aria-hidden="true">(\d+)</) || [])[1];
    if (q.html.includes('⭐') || rondjes.length !== Math.max(0, n - 1) || (n > 1 ? +opVak !== n : opVak)) tel.push(`${q.tmpl}: ${rondjes.length} + ${opVak}`);
  }
  check(!tel.length, 'KA · dagen tellen: 1 tot n−1 langs de pijl, n op het vakje, en geen ⭐', tel.slice(0, 3).join(' | '));
  let fout = 0;
  for (let i = 0; i < 200; i++) {
    let q = app.genKalender(app.KALENDERPAD[5], 'lees'), [, , m, d] = q.tmpl.split(' ').map(Number);
    if (q.ans !== (new Date(jaar, m, d).getDay() + 6) % 7) fout++;
    q = app.genKalender(app.KALENDERPAD[6], 'lees'); [, , m, d] = q.tmpl.split(' ').map(Number);
    if (app.toonAntwoord(q, q.ans) !== `${d}/${m + 1}`) fout++;
    q = app.genKalender(app.KALENDERPAD[0], i % 2 ? 'lees' : 'zoek'); const [, , nu, st] = q.tmpl.split(' ').map(Number);
    if (q.ans !== ((nu + st) % 7 + 7) % 7 || !q.html.includes(['eergisteren', 'gisteren', '', 'morgen', 'overmorgen'][st + 2])) fout++;
  }
  check(!fout, 'KA · klopt met de echte kalender: de dag van een datum, 28/10, morgen en eergisteren', String(fout));
  // de hint: later of vroeger rond de week, niets bij 28/10, meer of minder bij een aantal
  const dq = { kind: 'kalender', soort: 'dag', ans: 0 }, h = app.hintVoor(dq, 6);
  check(h.pijl === 'later' && app.hintVoor({ ...dq, ans: 5 }, 6).pijl === 'vroeger' && !app.hintVoor({ kind: 'kalender', soort: 'notatie', ans: 2810 }, 1028)
    && app.hintVoor({ kind: 'kalender', soort: 'getal', ans: 14 }, 7).pijl === 'op',
    'KA · de hint: zondag → maandag is later (de kortste weg), 28/10 alleen 🤔, een aantal meer of minder', JSON.stringify(h));

  // de ladder groeit: drie goede shows per rij, met rekenen erbij
  app.themaZet(s, 'kalender', true);
  check(app.themaPlan(s, 8).filter(k => k === 'kalender').length === 2, 'KA · een show van acht met rekenen: twee kalendervragen', app.themaPlan(s, 8).join());
  const pad = [], buiten = [], nieuw = [];
  let shows = 0;
  while (app.ladderNu(p, 'kalender') !== 'alles' && shows < 60) {
    shows++;
    const nu = app.ladderNu(p, 'kalender'), mag = new Set(app.ladderSpeelt(p, 'kalender').rijen.map(r => r.id));
    const inst = app.rijenInst(p, 'kalender'), qs = Array.from({ length: 8 }, () => app.rijenVraag(inst, []));
    qs.filter(q => !mag.has(q.rij)).forEach(q => buiten.push(q.rij));
    const eerste = qs.find(q => q.rij === nu);
    if (pad.length && pad[pad.length - 1].verder && eerste) nieuw.push(app.vraagIsNieuw(eerste, nu));
    pad.push({ nu, verder: app.ladderNa(p, 'kalender', 3) });
  }
  const per = app.KALENDERPAD.map(r => pad.filter(x => x.nu === r.id).length);
  check(app.ladderNu(p, 'kalender') === 'alles' && per.every(n => n === 3), 'KA · drie goede shows per rij: alle zeven rijen, één voor één, tot alles door elkaar', per.join(' '));
  check(!buiten.length, 'KA · nooit een vraag van een rij die ze nog niet had', buiten.slice(0, 3).join());
  check(nieuw.length === 6 && nieuw.every(Boolean), 'KA · de eerste vraag van een nieuwe rij is "Nieuw"', nieuw.join());

  // de lijnen en Zelf kiezen
  const { app: a2, p: p2 } = verseSter('Lijnen'), s2 = p2.settings;
  a2.themaZet(s2, 'kalender', true);
  s2.kalLijn = { vanaf: 'maanden', tot: 'blad' };
  check(a2.ladderNu(p2, 'kalender') === 'maanden', 'KA · "vanaf Maanden": daar begint ze', a2.ladderNu(p2, 'kalender'));
  for (let i = 0; i < 9; i++) a2.ladderNa(p2, 'kalender', 3);
  const gemengd = new Set(Array.from({ length: 300 }, () => a2.rijenVraag(a2.rijenInst(p2, 'kalender'), []).rij));
  check(a2.ladderNu(p2, 'kalender') === 'alles' && !gemengd.has('datum'), 'KA · "tot Kalenderblad": daarna door elkaar, zonder De datum', [...gemengd].join());
  s2.modus = 'vrij'; s2.kiesKalender = ['seizoen', 'blad'];
  const vi = a2.rijenInst(p2, 'kalender'), vier = Array.from({ length: 4 }, () => a2.rijenVraag(vi, []).rij);
  check(vier.filter(r => r === 'seizoen').length === 2 && vier.every(r => r === 'seizoen' || r === 'blad'), 'KA · Zelf kiezen: de aangevinkte rijen, om de beurt', vier.join());
});

/* ================= GL · De getallenlijn als thema =================
   Elke vorm van elke rij: het antwoord ligt op de lijn die ze ziet, op een
   streepje, en de keuzes zijn verschillend. Een tik telt voor het streepje
   het dichtst erbij. En de ladder groeit zoals die van de kalender. */
zaak('GL', () => {
  const { app, p } = verseSter('Lijn');
  const s = p.settings;
  check(!app.themaAan(s, 'lijn'), 'GL · een verse ster: de getallenlijn staat uit', JSON.stringify(s.themas));
  check(app.THEMAS.map(t => t.id).join() === 'rekenen,tafels,lijn,geld,klok,kalender', 'GL · de tegels: de getallen bovenaan, de getallenlijn na rekenen en tafels', app.THEMAS.map(t => t.id).join());
  const mis = [];
  for (const r of app.LIJNPAD) for (const v of ['lees', 'zoek']) for (let i = 0; i < 300; i++) {
    const q = app.genLijn(r, v), naam = `${r.id}/${v} ${q.tmpl}`;
    if (q.rij !== r.id || q.kind !== 'lijn') mis.push(naam + ' soort');
    if (q.tik) {
      const [van, tot, stap] = q.bereik;
      if (q.ans <= van || q.ans >= tot || (q.ans - van) % stap) mis.push(naam + ' niet op een streepje');
      if (!q.html.includes(`>${q.ans}<`) || q.html.includes('@')) mis.push(naam + ' het getal staat er niet');
    } else if (!q.html.includes('@')) mis.push(naam + ' geen vakje');
    if (q.keuzes && (!q.keuzes.includes(q.ans) || new Set(q.keuzes).size !== q.keuzes.length || q.keuzes.length < 2)) mis.push(naam + ' keuzes ' + q.keuzes);
    if (q.min != null && (q.ans < q.min || q.ans > q.grens)) mis.push(naam + ' buiten de lijn');
    // altijd vier knoppen (Afronden: twee), ook als het antwoord naast het eind van de lijn ligt
    if (q.keuzes && q.keuzes.length !== (q.knop === 'twee' ? 2 : 4)) mis.push(naam + ' ' + q.keuzes.length + ' keuzes');
    // over het tiental springen: de 10 staat er altijd bij
    if (r.sprong && !/<text x="[\d.]+" y="76">10<\/text>/.test(q.html)) mis.push(naam + ' zonder 10');
  }
  check(!mis.length, 'GL · elke rij, elke vorm: het antwoord op de lijn, op een streepje, verschillende keuzes', [...new Set(mis)].slice(0, 3).join(' | '));
  // de echte getallen: een sprong over 10 gaat in twee keer via 10, afronden naar het dichtste tiental of honderdtal
  const fout = [];
  let vijf = 0, drie = 0;
  for (let i = 0; i < 300; i++) {
    let q = app.genLijn(app.LIJNPAD[1], 'lees'); const [, , a, d] = q.tmpl.split(' ').map(Number), bogen = q.html.split('class="boog"').length - 1;
    if (q.ans !== a + d || bogen !== (a < 10 && a + d > 10 ? 2 : 1)) fout.push(`${q.tmpl}: ${q.ans}, ${bogen} bogen`);
    q = app.genLijn(app.LIJNPAD[5], 'lees'); const n = +q.tmpl.split(' ').pop(), maat = q.keuzes[1] - q.keuzes[0];
    if (q.ans !== Math.floor((n + maat / 2) / maat) * maat || !q.keuzes.includes(q.ans) || ![10, 100].includes(maat)) fout.push(`${q.tmpl}: ${q.ans}`);
    vijf += n % 10 === 5 ? 1 : 0; drie += n > 100 ? 1 : 0;
  }
  check(!fout.length && vijf > 5 && drie > 60, `GL · klopt: 8 + 5 gaat via 10 in twee sprongen, 47 ≈ 50, 45 ≈ 50 (een 5 naar boven, zoals op school), en ook 347 ≈ 350 en 370 ≈ 400 (${vijf} vijven, ${drie} van drie cijfers op 300)`, fout.slice(0, 3).join(' | '));
  // een tik telt voor het dichtste streepje, ook net ernaast en buiten de lijn
  const tq = { bereik: [300, 500, 10, 100] }, b = 320, x = v => (16 + (v - 300) / 200 * 288) / 320 * b;
  check(app.lijnRaak(tq, x(370), b) === 370 && app.lijnRaak(tq, x(370) + 3, b) === 370 && app.lijnRaak(tq, x(374), b) === 370 && app.lijnRaak(tq, x(376), b) === 380
    && app.lijnRaak(tq, 0, b) === 300 && app.lijnRaak(tq, b, b) === 500, 'GL · een tik telt voor het dichtste streepje, en nooit buiten de lijn', '');

  // de ladder groeit: drie goede shows per rij, met rekenen erbij
  app.themaZet(s, 'lijn', true);
  check(app.themaPlan(s, 8).filter(k => k === 'lijn').length === 2, 'GL · een show van acht met rekenen: twee lijnvragen', app.themaPlan(s, 8).join());
  const pad = [], buiten = [], nieuw = [];
  let shows = 0;
  while (app.ladderNu(p, 'lijn') !== 'alles' && shows < 60) {
    shows++;
    const nu = app.ladderNu(p, 'lijn'), mag = new Set(app.ladderSpeelt(p, 'lijn').rijen.map(r => r.id));
    const inst = app.rijenInst(p, 'lijn'), qs = Array.from({ length: 8 }, () => app.rijenVraag(inst, []));
    qs.filter(q => !mag.has(q.rij)).forEach(q => buiten.push(q.rij));
    const eerste = qs.find(q => q.rij === nu);
    if (pad.length && pad[pad.length - 1].verder && eerste) nieuw.push(app.vraagIsNieuw(eerste, nu));
    pad.push({ nu, verder: app.ladderNa(p, 'lijn', 3) });
  }
  const per = app.LIJNPAD.map(r => pad.filter(x => x.nu === r.id).length);
  check(app.ladderNu(p, 'lijn') === 'alles' && per.every(n => n === 3), 'GL · drie goede shows per rij: alle zes rijen, één voor één, tot alles door elkaar', per.join(' '));
  check(!buiten.length, 'GL · nooit een vraag van een rij die ze nog niet had', buiten.slice(0, 3).join());
  check(nieuw.length === 5 && nieuw.every(Boolean), 'GL · de eerste vraag van een nieuwe rij is "Nieuw"', nieuw.join());
  s.modus = 'vrij'; s.kiesLijn = ['lijn20', 'afronden'];
  const vi = app.rijenInst(p, 'lijn'), vier = Array.from({ length: 4 }, () => app.rijenVraag(vi, []).rij);
  check(vier.filter(r => r === 'lijn20').length === 2 && vier.every(r => r === 'lijn20' || r === 'afronden'), 'GL · Zelf kiezen: de aangevinkte rijen, om de beurt', vier.join());
});

/* ================= SO · Elke combinatie van thema's start een show =================
   Een show met alleen geld of alleen de klok startte niet: de speciale vragen
   lazen s.ops van de geldvraagmaker (zie showOpzet). Hier wordt een show
   opgezet en uitgespeeld tot de laatste vraag, op het leerpad en bij Zelf
   kiezen, in een lange en een korte show, met elk thema alleen, elk paar, en
   alles aan -- een thema dat er straks bij komt, valt hier meteen mee. Elke
   vraag hoort bij het thema dat themaPlan haar gaf: een plaatje maakt zijn
   eigen soort (q.kind = zijn id), een som-thema een som.
   Niet elke combinatie: dat waren er 2^n, en met zes thema's al 3,5 seconde
   van de keuring, die bij elk thema verdubbelde. Wat misging zat telkens in
   één thema alleen (geen som om speciale vragen op te zetten) of in twee die
   elkaar raakten; drie of meer voegen niets toe dat alles-aan niet al ziet. */
function themaCombinaties(ids) {
  const uit = ids.map(k => [k]);
  ids.forEach((a, i) => ids.slice(i + 1).forEach(b => uit.push([a, b])));
  if (ids.length > 2) uit.push(ids.slice());
  return uit;
}
zaak('SO', () => {
  const ids = laadApp().THEMAS.map(t => t.id), kapot = [];
  for (const aan of themaCombinaties(ids)) for (const modus of ['pad', 'vrij']) for (const perLevel of [8, 5]) {
    const { app, p } = verseSter('Combi');
    const s = p.settings;
    s.modus = modus; s.perLevel = perLevel;
    aan.forEach(k => app.themaZet(s, k, true));
    ids.filter(k => !aan.includes(k)).forEach(k => app.themaZet(s, k, false));
    const naam = `${aan.join('+')} ${modus} ${perLevel}`;
    if (app.themasAan(s).join() !== aan.join()) { kapot.push(naam + ': thema\'s ' + app.themasAan(s).join()); continue; }
    try {
      const o = app.showOpzet(p, 1, -1);
      const g = { themaPlan: o.vragenPlan, insts: o.insts, qs: [], idx: 0, herhaald: new Set() };
      for (; g.idx < perLevel; g.idx++) {
        const sp = o.plan[g.idx];
        const q = sp ? (sp.type === 'miss' ? app.genMissing(o.inst, 1, p.perf, sp.op) : app.genChain(o.inst, 1, p.perf)) : app.buildQuestion(p, 1, g);
        if (!q || q.ans == null || !q.tmpl) throw new Error('vraag ' + g.idx + ' leeg');
        const thema = o.vragenPlan[g.idx], wil = app.PLAATJE.includes(thema) ? thema : 'som';
        if ((app.PLAATJE.includes(q.kind) ? q.kind : 'som') !== wil) throw new Error(`vraag ${g.idx}: ${thema} gaf ${q.tmpl}`);
        g.qs.push(q);
      }
    } catch (e) { kapot.push(naam + ': ' + e.message); }
  }
  check(!kapot.length, 'SO · elk thema alleen, elk paar en alles aan (leerpad en Zelf kiezen, 8 en 5 vragen) zet een show op en speelt hem uit', kapot.slice(0, 4).join('; '));
});

/* ================= TR · Het themaregister =================
   Elk thema is één object in THEMAS (zie "= Het themaregister" in
   55-vragen.js), en de rest van de code leest het daar. Wat hier wordt
   nagekeken, ging vroeger stil mis als iemand een van de vijftien plekken
   vergat: een nieuw thema kreeg geldvragen (rijenVraag viel terug op genGeld),
   een cijferblok onder zijn plaatje, of een kaart die versprong omdat het vak
   zijn plaatjes niet kende. Een thema erbij hoort hier vanzelf bij, en wat het
   mist staat in de uitslag. */
zaak('TR', () => {
  const { app, p } = verseSter('Register');
  const mis = [], ids = new Set(), sleutels = {}, rijIds = new Set(app.LEERPAD.map(r => r.id)), ops = new Set();
  const nodig = (t, veld, ok) => { if (!ok) mis.push(`${t.id}: ${veld}`); };
  const uniek = (soort, v, t) => { const k = soort + ':' + v; if (sleutels[k]) mis.push(`${t.id}: ${soort} ${v} ook bij ${sleutels[k]}`); sleutels[k] = t.id; };
  for (const t of app.THEMAS) {
    nodig(t, 'id', typeof t.id === 'string' && /^[a-z]+$/.test(t.id) && !ids.has(t.id));
    ids.add(t.id);
    nodig(t, 'naam', typeof t.naam === 'string' && t.naam.length > 0);
    nodig(t, 'icoon', typeof t.icoon === 'function' && /^<svg[^>]*thema-ico/.test(t.icoon(30)) && t.icoon(30).includes('width="30"'));
    nodig(t, 'ops of plaatje (precies een van de twee)', !!t.ops !== !!t.plaatje);
    if (t.ops) {
      nodig(t, 'ops', Array.isArray(t.ops) && t.ops.length && t.ops.every(o => ['+', '-', 'x', ':'].includes(o) && !ops.has(o)));
      t.ops.forEach(o => ops.add(o));
    }
    const L = t.ladder;
    if (L) {
      nodig(t, 'ladder.pad', Array.isArray(L.pad) && L.pad.length && L.pad.every(r => r.id && r.naam));
      for (const r of L.pad || []) { if (rijIds.has(r.id)) mis.push(`${t.id}: rij-id ${r.id} bestaat al (de ladders zoeken een rij op zijn id)`); rijIds.add(r.id); }
      nodig(t, 'ladder.lijn/stand/id/eind', ['lijn', 'stand', 'id', 'eind'].every(k => typeof L[k] === 'string' && L[k]));
      nodig(t, 'ladder.vb', typeof L.vb === 'function' && L.pad.every(r => typeof L.vb(r, p.settings) === 'string'));
      nodig(t, 'ladder.lijn in een verse ster', p.settings[L.lijn] && typeof p.settings[L.lijn] === 'object');
      uniek('lijn', L.lijn, t); uniek('stand', L.stand, t); uniek('id', L.id, t);
      if (L.kies) uniek('kies', L.kies, t);
    }
    if (!t.plaatje) continue;
    nodig(t, 'een ladder met kies', L && typeof L.kies === 'string');
    nodig(t, 'gen', typeof t.gen === 'function');
    nodig(t, 'proeven', typeof t.proeven === 'function');
    nodig(t, 'teken', typeof t.teken === 'string' && t.teken.length > 0);
    nodig(t, 'een id dat geen soort som is', !['classic', 'missing', 'chain', 'bouw'].includes(t.id));
    nodig(t, 'staat uit bij een verse ster', !app.themaAan(p.settings, t.id));
    for (const k of ['toonAntwoord', 'toonKeuze', 'aria', 'hint', 'hintTeken']) if (k in t) nodig(t, k, typeof t[k] === 'function');
    if (!L || typeof t.gen !== 'function') continue;
    for (const r of L.pad) for (const vorm of ['lees', 'zoek']) for (let i = 0; i < 20; i++) {
      const q = t.gen(r, vorm), naam = `${t.id} ${r.id} ${vorm}`;
      if (!q || q.kind !== t.id || q.rij !== r.id) { mis.push(`${naam}: q.kind ${q && q.kind}, q.rij ${q && q.rij} (moet ${t.id}, ${r.id})`); break; }
      if (!Number.isInteger(q.ans) || typeof q.tmpl !== 'string' || typeof q.html !== 'string') { mis.push(`${naam}: ans, tmpl of html ontbreekt (${q.tmpl})`); break; }
      if (!q.tik) {
        const k = app.makeChoices(q, app.keuzeGrens(q, p.settings, 1));
        if (!k.includes(q.ans)) { mis.push(`${naam}: het antwoord staat niet bij de knoppen (${k})`); break; }
        const fout = k.find(v => v !== q.ans), h = app.hintVoor(q, fout);
        if (h !== null && !(h && h.pijl && h.woorden)) { mis.push(`${naam}: hint ${JSON.stringify(h)}`); break; }
        if (k.some(v => !String(app.toonKeuze(q, v)).length || !String(app.toonAntwoord(q, v)).length)) { mis.push(`${naam}: een knop zonder tekst`); break; }
      }
    }
    // het vaste vak: elke rij geeft zijn proeven, en het zijn kaarten (html)
    const pr = typeof t.proeven === 'function' ? t.proeven({ rijen: L.pad }) : [];
    nodig(t, 'proeven: minstens een kaart per rij', typeof t.proeven !== 'function' || Array.isArray(pr) && pr.length >= L.pad.length && pr.every(h => typeof h === 'string' && h.length));
    // aan: dan staat hij in de show, als plaatje (altijd kiezen), en krijgt hij vragen
    const s = verseSter('Aan').p.settings;
    app.themaZet(s, t.id, true);
    nodig(t, 'komt in een show van acht', app.themaPlan(s, 8).includes(t.id) && app.PLAATJE.includes(t.id));
  }
  check(!mis.length, 'TR · elk thema in het register is compleet, maakt zijn eigen soort vraag met het antwoord bij de knoppen, en komt in een show', mis.slice(0, 6).join(' | '));
  check(Object.keys(app.LADDERS).join() === app.THEMAS.filter(t => t.ladder).map(t => t.id).join()
    && app.PLAATJE.join() === app.THEMAS.filter(t => t.plaatje).map(t => t.id).join(),
  'TR · LADDERS en PLAATJE komen uit het register, in de volgorde van de tegels', Object.keys(app.LADDERS).join() + ' / ' + app.PLAATJE.join());
});

/* KZ · De knoppen van élke rij van élk thema, zoals het spel ze legt
   (makeChoices met keuzeGrens). Een vraagmaker die zijn eigen lijstje maakte
   had het antwoord altijd op dezelfde plek (bij de weken altijd het derde
   getal van klein naar groot), bij de tafels was het antwoord het enige getal
   uit de tafel, en op Tot 10 was een derde van de plussommen "= 10". Een
   nieuwe rij of een nieuw thema valt hier vanzelf onder.
     · vier verschillende knoppen (afronden: twee) met het antwoord erbij;
     · waar de knoppen getallen zijn: het antwoord even vaak het kleinste, het
       grootste of ertussen (elke plek 10% tot 40%) -- woorden, dagen en
       klokjes hebben geen volgorde die je ziet, die tellen hier niet;
     · de sommen: geen antwoord in meer dan 20% van de vragen;
     · de tafels: het antwoord is zelden het enige getal uit de tafel. */
zaak('KZ', () => {
  const { app, p } = verseSter('Knop');
  const N = 1500, mis = [];
  const meet = (naam, maak, getallen, som) => {
    const plek = [0, 0, 0, 0], ans = {}, enige = { n: 0 };
    for (let i = 0; i < N; i++) {
      const { q, s } = maak();
      if (q.tik) continue;
      const k = app.makeChoices(q, app.keuzeGrens(q, s, 1)), wil = q.knop === 'twee' ? 2 : 4;
      if (k.length !== wil || new Set(k).size !== wil || !k.includes(q.ans)) { mis.push(`${naam}: ${q.tmpl} -> ${k}`); return; }
      plek[k.slice().sort((a, b) => a - b).indexOf(q.ans)]++;
      ans[q.ans] = (ans[q.ans] || 0) + 1;
      if (q.op === 'x') { const b = +q.tmpl.match(/\d+/g)[1]; if (k.filter(v => v % b === 0).length === 1) enige.n++; }
    }
    const n = plek.reduce((a, b) => a + b, 0);
    if (getallen && n && plek.some(v => v / n < 0.1 || v / n > 0.4)) mis.push(`${naam}: plek ${plek.map(v => Math.round(100 * v / n)).join('/')}`);
    const top = Math.max(...Object.values(ans));
    if (som && n && top / n > 0.2) mis.push(`${naam}: één antwoord in ${Math.round(100 * top / n)}%`);
    if (n && enige.n / n > 0.3) mis.push(`${naam}: het enige uit de tafel in ${Math.round(100 * enige.n / n)}%`);
  };
  // rekenen: elke rij van tot 1000, met haar vragen zoals de show ze bouwt
  p.settings.max = 1000;
  for (const [i, r] of app.LEERPAD.entries()) {
    p.pad = { klaar: app.LEERPAD.slice(0, i).map(x => x.id) };
    const s = app.vraagInst(p);
    const g = () => ({ idx: 3, qs: [], herhaald: new Set(), themaPlan: Array(8).fill('rekenen'), insts: { rekenen: s } });
    meet('rekenen ' + r.id, () => ({ s, q: r.id === 'zoek' ? app.genMissing(s, 1, 0.5, Math.random() < 0.5 ? '+' : '-') : r.id === 'drie' ? app.genChain(s, 1, 0.5) : app.buildQuestion(p, 1, g()) }), true, r.id !== 'drie');
  }
  p.pad = null;
  // de tafels: × en ÷, elke rij
  for (const ops of [['x'], [':']]) for (const [i, r] of app.TAFELPAD.entries()) {
    const t = verseSter('Tafel').p; t.settings.ops = ops; t.tafels = { klaar: app.TAFELPAD.slice(0, i).map(x => x.id) };
    const s = app.themaInst(t, 'tafels');
    meet(`tafels ${ops} ${r.id}`, () => ({ s, q: app.buildQuestion(t, 1, { idx: 3, qs: [], herhaald: new Set(), themaPlan: Array(8).fill('tafels'), insts: { tafels: s } }) }), true, false);
  }
  // elk plaatje (geld, de klok, ...): elke rij, elke vorm. Getallen zijn de knoppen als
  // het thema ze niet zelf toont (toonKeuze), of als de vraag zegt dat het een getal is
  for (const k of app.PLAATJE) for (const r of app.LADDERS[k].pad) for (const v of ['lees', 'zoek']) {
    const gen = app.THEMA[k].gen, q0 = gen(r, v);
    const getallen = !q0.keuzes && (k === 'geld' || !app.THEMA[k].toonKeuze || q0.soort === 'getal');
    meet(`${k} ${r.id} ${v}`, () => ({ s: p.settings, q: gen(r, v) }), getallen && q0.knop !== 'twee', false);
  }
  check(!mis.length, 'KZ · elke rij van elk thema: vier verschillende knoppen met het antwoord, op een gelote plek, geen antwoord dat overheerst, en bij de tafels niet het enige uit de tafel', mis.slice(0, 5).join(' | '));
  // B4: in welk seizoen valt deze maand -- nooit een maand waarin het seizoen wisselt
  const grens = [2, 5, 8, 11].map(m => app.MAANDEN[m]);
  const wissel = Array.from({ length: 400 }, () => app.genKalender(app.KALENDERPAD[3], 'zoek')).filter(q => grens.some(m => q.html.includes('>' + m + '<')));
  check(!wissel.length, 'KZ · "in welk seizoen?" vraagt nooit maart, juni, september of december (de lente begint op 21 maart)', wissel.slice(0, 2).map(q => q.tmpl).join());
  // somPaar: elk paar even vaak, en een 1 half zo vaak -- op Tot 10 geen derde meer "= 10" of "− 1"
  const paren = Array.from({ length: 20000 }, () => app.somPaar(10, true));
  const tien = paren.filter(([x, y]) => x + y === 10).length / paren.length, een = paren.filter(([x, y]) => x === 1 || y === 1).length / paren.length;
  check(paren.every(([x, y]) => x >= 1 && y >= 1 && x + y <= 10) && tien < 0.25 && een < 0.3, `KZ · tot 10: ${Math.round(100 * tien)}% "= 10" en ${Math.round(100 * een)}% met een 1 (eerst allebei een derde)`, '');
  // zoek het getal: het ontbrekende getal is niet meer meestal klein
  p.settings.max = 20; p.pad = { klaar: ['tot10', 'tot20', 'brug20'] };
  const zs = app.vraagInst(p), klein = Array.from({ length: 4000 }, () => app.genMissing(zs, 1, 0.9, '+')).filter(q => q.ans <= 4).length / 4000;
  check(klein < 0.3, `KZ · zoek het getal tot 20: het ontbrekende getal is 1 tot 4 in ${Math.round(100 * klein)}% (eerst 45%)`, '');
});

/* RV · Een rij is pas gehaald met genoeg vragen van die rij (rijVerder). Shows
   alleen zeiden te weinig: met zes thema's aan kreeg een thema één vraag per
   show, en was een rij gehaald na twee of drie vragen. */
zaak('RV', () => {
  const { app, p } = verseSter('Rij');
  app.themaZet(p.settings, 'kalender', true);
  const nu = () => app.ladderNu(p, 'kalender');
  // één vraag per show, en elke keer goed: drie shows is niet genoeg meer
  for (let i = 0; i < 3; i++) app.ladderNa(p, 'kalender', 3, [true]);
  check(nu() === 'morgen', 'RV · drie goede shows met elk één vraag van de rij: nog niet gehaald', nu());
  let shows = 3;
  while (nu() === 'morgen' && shows < 40) { app.ladderNa(p, 'kalender', 3, [true]); shows++; }
  check(shows === app.PAD_MIN_VRAGEN, `RV · gehaald na ${app.PAD_MIN_VRAGEN} goede vragen van de rij (${shows} shows)`, String(shows));
  // twee missers in de laatste zes: wacht; de weg "toch" komt na genoeg vragen
  const q = verseSter('Mis'), mp = q.p; q.app.themaZet(mp.settings, 'kalender', true);
  for (let i = 0; i < 12; i++) q.app.ladderNa(mp, 'kalender', 3, [i % 3 !== 0]);
  check(q.app.ladderNu(mp, 'kalender') === 'morgen', 'RV · één op drie mis in de vragen van de rij: nog niet gehaald, ook niet na twaalf shows', JSON.stringify(mp.kalender));
  for (let i = 0; i < 6; i++) q.app.ladderNa(mp, 'kalender', 2, [i % 3 !== 0]);
  check(q.app.ladderNu(mp, 'kalender') === 'seizoen', `RV · maar na ${q.app.PAD_MAX_VRAGEN} vragen en ${q.app.PAD_MAX_SHOWS} shows toch verder`, JSON.stringify(mp.kalender));
  // met alleen rekenen (acht vragen per show) verandert er niets: drie shows, de laatste twee foutloos
  const r = verseSter('Reken'), rp = r.p;
  [3, 3, 3].forEach(() => r.app.padNa(rp, 3, Array(5).fill(true)));
  check(r.app.padNu(rp) === 'tot20', 'RV · alleen rekenen: na drie foutloze shows door, zoals altijd', r.app.padNu(rp));
  // de antwoorden: alleen de vragen van dat thema die het nieuwe van de rij laten zien
  const g = { themaPlan: ['rekenen', 'kalender', 'rekenen'], uitslag: ['goed', 'hint', 'goed'],
    qs: [{ kind: 'classic', op: '+', tmpl: '13 + 4 = @', ans: 17 }, { kind: 'kalender', rij: 'morgen' }, { kind: 'classic', op: '+', tmpl: '3 + 4 = @', ans: 7 }] };
  check(r.app.rijAntwoorden(g, 'rekenen', 'tot20').join() === 'true' && r.app.rijAntwoorden(g, 'kalender', 'morgen').join() === 'false',
    'RV · rijAntwoorden telt per thema alleen het nieuwe van de rij (13 + 4 op Tot 20, niet 3 + 4)', '');
  // op de rij Zoek het getal zelf: drie plekken voor zoek het getal, ook als het nog niet "beheerst" is
  const z = verseSter('Zoek'), zp = z.p;
  zp.pad = { klaar: ['tot10', 'tot20', 'brug20'] };
  const plan = z.app.planSpecials(zp, z.app.vraagInst(zp), 8, null, -1, [], 'zoek');
  check(Object.values(plan).filter(x => x.type === 'miss').length === 3, 'RV · op de rij Zoek het getal: drie vragen zoek het getal per show', JSON.stringify(plan));
});

/* ZW · Bij Zelf kiezen komt een gemiste som alleen terug als hij past bij een
   aangevinkte rij -- niet "4 − 1" in een show van alleen Over het honderdtal.
   Op het leerpad blijft het zoals het was: alles tot de grens mag terugkomen. */
zaak('ZW', () => {
  const { app, p } = verseSter('Zwak');
  const s = p.settings;
  s.max = 1000; s.modus = 'vrij'; s.kies = ['brug100'];
  const zwak = { '4 − 1 = @': { ans: 3, op: '-', w: 6 }, '47 + 25 = @': { ans: 72, op: '+', w: 6 }, '40 + 30 = @': { ans: 70, op: '+', w: 6 } };
  const mag = inst => Object.keys(zwak).filter(k => app.pastNog(k, zwak[k], inst)).join();
  check(mag(app.vraagInst(p)) === '47 + 25 = @', 'ZW · Zelf kiezen, alleen Over het honderdtal: alleen 47 + 25 komt terug, niet 4 − 1 of 40 + 30', mag(app.vraagInst(p)));
  s.kies = ['tot10', 'tientallen'];
  check(mag(app.vraagInst(p)) === '4 − 1 = @,40 + 30 = @', 'ZW · met Tot 10 en Tientallen aangevinkt: 4 − 1 en 40 + 30 wel', mag(app.vraagInst(p)));
  s.modus = 'pad'; s.max = 100; p.pad = { klaar: app.LEERPAD.slice(0, 8).map(r => r.id) };
  check(mag(app.vraagInst(p)) === Object.keys(zwak).join(), 'ZW · op het leerpad mag alles tot de grens terugkomen, zoals altijd', mag(app.vraagInst(p)));
});

/* TW · Een toast gaat vanzelf weg. showToast plant dat zelf in (zie DE REGEL in
   10-feestjes.js); de enige die blijven staan wachten op een tik (onTap) of zijn
   de hint bij een misser, die de show bij het volgende antwoord weghaalt. Zo kan
   geen aanroeper het meer vergeten -- "✓ Munten tot €10 · daar was Marie" bleef
   op Oefeningen staan omdat er één toastWeg ontbrak. Daarom ook: toastWeg wordt
   buiten 10-feestjes.js nergens aangeroepen. */
zaak('TW', () => {
  const fs = require('fs'), path = require('path');
  const app = laadApp();
  // de klokjes van de app vasthouden, en "minder beweging" aan: dan is weg meteen weg (geen fade)
  app.run(`(() => { const els = {};
    document.getElementById = id => els[id] || (els[id] = document.createElement('div'));
    globalThis.__klokjes = [];
    setTimeout = (f, ms) => { __klokjes.push(f); return __klokjes.length; };
    matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  })()`);
  const na = code => app.run(`(() => { __klokjes = []; hideToast(); ${code};
    const aan = document.getElementById('toast').style.display;
    for (let i = 0; i < 20 && __klokjes.length; i++) __klokjes.splice(0).forEach(f => f());
    return aan + '>' + document.getElementById('toast').style.display; })()`);
  const gevallen = {
    'gewone toast':        [`showToast('✓ Munten tot €10 · daar was Marie')`, 'flex>none'],
    'met een tweede regel': [`showToast('⚠️', null, 'Spelen kan wel')`, 'flex>none'],
    'goud, eigen duur':    [`showToast('🎪', null, null, 'goud', 1900)`, 'flex>none'],
    'met Terug':           [`meldMetTerug('✓ Weg', () => {})`, 'flex>none'],
    'wacht op een tik':    [`showToast('👉', () => {}, null, 'teken')`, 'flex>flex'],
    'hint bij een misser': [`showToast('🤔', null, null, 'teken')`, 'flex>flex'],
  };
  const fout = Object.entries(gevallen).map(([naam, [code, moet]]) => [naam, na(code), moet]).filter(([, is, moet]) => is !== moet);
  check(!fout.length, 'TW · elke toast gaat vanzelf weg, behalve wie op een tik of het volgende antwoord wacht', JSON.stringify(fout));
  // een tweede toast mag niet weg door het klokje van de eerste
  const twee = app.run(`(() => { __klokjes = []; showToast('een'); const oud = __klokjes.splice(0);
    showToast('twee'); oud.forEach(f => f()); return document.getElementById('toast').style.display; })()`);
  check(twee === 'flex', 'TW · het klokje van een vorige toast haalt de volgende niet weg', twee);
  const src = path.join(__dirname, '..', 'src');
  const los = fs.readdirSync(src).filter(f => f.endsWith('.js') && f !== '10-feestjes.js')
    .filter(f => /\btoastWeg\s*\(/.test(fs.readFileSync(path.join(src, f), 'utf8')));
  check(!los.length, 'TW · toastWeg wordt alleen door showToast zelf aangeroepen (geef een duur mee aan showToast)', los.join(', '));
});

/* VS -- een back-up of overgezette save met kapotte instellingen. Zonder één
   thema dat aan stond bevroor de app bij de eerste tik op een halte (themaPlan
   draaide eindeloos rond); daarom kijkt deze zaak eerst of de instellingen
   hersteld zijn, en speelt hij de show pas als dat zo is -- anders hangt de
   suite in plaats van dat hij faalt. */
zaak('VS', () => {
  const app = laadApp();
  const kapot = {
    'geen bewerking':      p => { p.settings.ops = []; },
    'onbekende bewerking': p => { p.settings.ops = ['^']; },
    'ops geen lijst':      p => { p.settings.ops = '+'; },
    'grens als tekst':     p => { p.settings.max = 'veel'; },
    'onbekende modus':     p => { p.settings.mode = 'zing'; },
    'geen tafels':         p => { p.settings.tables = []; },
    'lege zwakke som':     p => { p.weak = { '3 + 4 = @': null }; p.learned = { '5 + 5 = @': 7 }; },
    'thema\'s geen lijst': p => { p.settings.ops = []; p.settings.themas = 'geld'; },
  };
  for (const [naam, maak] of Object.entries(kapot)) {
    const p = app.defaultProfile('Vs', 'dress_roze');
    p.stars = { 1: 3, 2: 2 }; p.level = 3; p.diamonds = 77;
    maak(p);
    app.migrate(p);
    const s = p.settings;
    const heel = app.themasAan(s).length > 0 && s.max > 0 && ['kies', 'mix', 'typ'].includes(s.mode) && s.tables.length > 0;
    check(heel, `VS · ${naam}: de instellingen zijn weer bruikbaar`, JSON.stringify(s).slice(0, 160));
    check(p.diamonds === 77 && p.level === 3 && p.stars[1] === 3 && p.stars[2] === 2, `VS · ${naam}: de voortgang blijft staan`, JSON.stringify([p.diamonds, p.level, p.stars]));
    if (!heel) continue;
    app.db.profiles.p1 = p; app.zetSpeler('p1');
    let fout = '';
    try {
      const { vragenPlan, insts } = app.showOpzet(p, 3, -1);
      const g = { idx: 0, qs: [], herhaald: new Set(), themaPlan: vragenPlan, insts };
      for (let i = 0; i < vragenPlan.length; i++) {
        g.idx = i; const q = app.buildQuestion(p, 3, g); g.qs[i] = q;
        if (!Number.isFinite(q.ans) || /NaN|undefined/.test(q.tmpl)) fout = q.tmpl + ' = ' + q.ans;
      }
    } catch (e) { fout = e.message; }
    check(!fout, `VS · ${naam}: een show bouwt gewone vragen`, fout);
  }
  // een geldige instelling blijft precies staan
  const p = app.defaultProfile('Vs', 'dress_roze', { ops: ['x'], max: 1000, mode: 'mix', themas: ['geld'] });
  p.settings.perLevel = 12;
  const voor = JSON.stringify(p.settings);
  app.migrate(p);
  const na = JSON.parse(JSON.stringify(p.settings));
  check(['ops', 'max', 'mode', 'themas', 'perLevel', 'tables'].every(k => JSON.stringify(na[k]) === JSON.stringify(JSON.parse(voor)[k])),
    'VS · een geldige instelling blijft precies staan', JSON.stringify(na).slice(0, 200));
});

zaak('VV', () => {
  const app = laadApp();
  const geval = (maak) => { const p = app.defaultProfile('Vv', 'dress_roze'); p.stars = { 1: 3, 2: 2 }; p.level = 3; p.diamonds = 77; maak(p); app.migrate(p); return p; };
  let p = geval(p => { p.diamonds = '50'; });
  check(p.diamonds === 50, 'VV · diamanten als tekst worden een getal', JSON.stringify(p.diamonds));
  p.diamonds += 3;
  check(p.diamonds === 53, 'VV · en verdienen telt op in plaats van te plakken', JSON.stringify(p.diamonds));
  check(geval(p => { p.diamonds = -20; }).diamonds === 0, 'VV · negatieve diamanten worden 0');
  check(geval(p => { p.diamonds = null; }).diamonds === 0, 'VV · geen diamanten wordt 0');
  check(geval(p => { p.diamonds = 12.7; }).diamonds === 12, 'VV · diamanten zijn heel');
  p = geval(p => { p.stars = { 1: 7, 2: '3', 3: -1, 4: 'veel', 5: null }; });
  check(JSON.stringify(p.stars) === JSON.stringify({ 1: 3, 2: 3, 3: 0 }), 'VV · sterren 0 t/m 3, onleesbare weg', JSON.stringify(p.stars));
  check(geval(p => { p.level = 0; }).level === 1, 'VV · level 0 wordt 1');
  check(geval(p => { p.level = '4'; }).level === 4, 'VV · level als tekst wordt een getal');
  // geen bovengrens: een oudere app-versie mag voortgang van een nieuwere niet inkorten
  p = geval(p => { p.tourStars = {}; p.level = 9999; p.stars[9000] = 2; });
  check(p.level === 9999 && p.stars[9000] === 2, 'VV · geen bovengrens op level of sterren', JSON.stringify([p.level, p.stars[9000]]));
  // een gezonde voortgang blijft precies staan
  p = geval(() => {});
  check(p.diamonds === 77 && p.level === 3 && JSON.stringify(p.stars) === JSON.stringify({ 1: 3, 2: 2 }), 'VV · een gezonde voortgang blijft precies staan');
});

/* ================= PT · Goed per thema =================
   Elk antwoord telt bij het thema van zijn vraag (telThema, het plan van de
   show), met dezelfde maat als stats.correct en stats.wrong. Tellen telt niet
   mee, en een show zonder plan is rekenen. */
zaak('PT', () => {
  const { app, p } = verseSter('Thema');
  app.run("G = { count: false, themaPlan: ['rekenen', 'klok', 'rekenen'], idx: 0 }");
  app.telThema(p, true);
  app.run('G.idx = 1'); app.telThema(p, false); app.telThema(p, true);
  app.run('G.idx = 2'); app.telThema(p, true);
  check(JSON.stringify(p.stats.thema) === '{"rekenen":[2,0],"klok":[1,1]}', 'PT · elk antwoord bij het thema van zijn vraag', JSON.stringify(p.stats.thema));
  app.run('G = { count: true, idx: 0 }'); app.telThema(p, true);
  app.run('G = { count: false, idx: 0 }'); app.telThema(p, false);
  check(JSON.stringify(p.stats.thema) === '{"rekenen":[2,1],"klok":[1,1]}', 'PT · tellen telt niet, zonder plan is het rekenen', JSON.stringify(p.stats.thema));
});

/* ================= KS · De klok blijft heel =================
   Een svg knipt alles wat buiten zijn viewBox valt, en zonder iets te zeggen:
   het lichte randje van de klok was een boog om een punt boven het midden, en
   zijn top werd op elk scherm recht afgesneden. Hier elke vorm van elke klok
   nagerekend, met de halve streepdikte erbij: een cirkel, een lijn of een boog
   (de hele cirkel waar hij op ligt -- ruim, maar een randje dat daarbuiten wil
   hoort niet op een klok) blijft binnen 0..100. Wat er op het scherm toch nog
   geknipt wordt, ziet schuiven zaak G. */
zaak('KS', () => {
  const { app } = verseSter('Klokrand');
  const getal = (tag, n) => { const m = tag.match(new RegExp(`\\s${n}="([-\\d.]+)"`)); return m ? +m[1] : 0; };
  const uit = new Set();
  for (const maat of [26, 70, 90, 132]) for (const kaal of [false, true]) for (let t = 0; t < 720; t += 5) {
    const svg = app.klokSvg(t, maat, kaal);
    if (!/viewBox="0 0 100 100"/.test(svg)) uit.add('geen viewBox 0 0 100 100: ' + svg.slice(0, 80));
    for (const [tag] of svg.matchAll(/<(circle|line|path)\b[^>]*>/g)) {
      const sw = /stroke="/.test(tag) ? getal(tag, 'stroke-width') / 2 : 0;
      let vak;
      if (tag.startsWith('<circle')) {
        const cx = getal(tag, 'cx'), cy = getal(tag, 'cy'), r = getal(tag, 'r') + sw;
        vak = [cx - r, cy - r, cx + r, cy + r];
      } else if (tag.startsWith('<line')) {
        const x = [getal(tag, 'x1'), getal(tag, 'x2')], y = [getal(tag, 'y1'), getal(tag, 'y2')];
        vak = [Math.min(...x) - sw, Math.min(...y) - sw, Math.max(...x) + sw, Math.max(...y) + sw];
      } else {
        // M x1 y1 A r r 0 groot zin x2 y2: het middelpunt uit de twee eindpunten
        const m = tag.match(/d="M\s*([-\d.]+)[\s,]+([-\d.]+)\s*A\s*([-\d.]+)[\s,]+[-\d.]+[\s,]+[-\d.]+[\s,]+([01])[\s,]*([01])[\s,]*([-\d.]+)[\s,]+([-\d.]+)\s*"/);
        if (!m) { uit.add('een pad dat KS niet kan narekenen: ' + tag.slice(0, 90)); continue; }
        const [x1, y1, r, groot, zin, x2, y2] = m.slice(1).map(Number);
        const half = Math.hypot(x2 - x1, y2 - y1) / 2, h = Math.sqrt(Math.max(0, r * r - half * half));
        const ux = -(y2 - y1) / (2 * half), uy = (x2 - x1) / (2 * half), kant = groot === zin ? -1 : 1;
        const cx = (x1 + x2) / 2 + kant * h * ux, cy = (y1 + y2) / 2 + kant * h * uy, R = r + sw;
        vak = [cx - R, cy - R, cx + R, cy + R];
      }
      if (vak[0] < -0.01 || vak[1] < -0.01 || vak[2] > 100.01 || vak[3] > 100.01) uit.add(`${maat}px${kaal ? ' kaal' : ''}: ${tag.slice(0, 90)} reikt tot ${vak.map(v => v.toFixed(1)).join(',')}`);
    }
  }
  check(!uit.size, 'KS · elke vorm van de klok blijft binnen zijn tekening', [...uit].slice(0, 4).join(' | '));
});

/* KM · KLAAR VOOR MEER BLIJFT, EN ELKE STAP KRIJGT ZIJN PIL. In de speeltest
   (270 shows) verdween "Klaar voor meer" bij tellen en Zelf kiezen na één
   mindere show, en kregen stappen die samen met een andere omhoog gingen nooit
   een pil. Zie klaarVoorMeer (70-ouderdeel) en groeiMoment (60-spel). */
zaak('KM', () => {
  const { app, p } = verseSter('Meer');
  const klaar = q => app.run('klaarVoorMeer')(q);
  // tellen: zes topshows op de laatste fase, dan één mindere -- de tip blijft
  const t = app.db.profiles.p2 = app.defaultProfile('Tel', 'dress_roze', app.COUNT_OPTS);
  app.normalizeProfiles();
  const top = app.countMaxStage(t.settings);
  Object.assign(t.countTrack, { stage: top, rung: app.countTopRung(top) });
  for (let i = 0; i < app.run('GRENS_TIP_SHOWS'); i++) app.telPlafondTel(t, 3);
  check(klaar(t), 'KM · tellen: zes topshows op het plafond geven "Klaar voor meer"', JSON.stringify(t.countTrack));
  t.countTrack.rung = 0; app.telPlafondTel(t, 2);
  check(klaar(t), 'KM · tellen: na een mindere show (een trapje terug) blijft hij staan', JSON.stringify(t.countTrack));
  app.telPlafondTel(t, 3);
  check(t.countTrack.plafond === app.run('GRENS_TIP_SHOWS'), 'KM · tellen: een topshow lager op de trap telt niet mee', String(t.countTrack.plafond));
  // Zelf kiezen: eens vlot, blijft vlot -- tot er iets bij komt
  const s = p.settings; s.modus = 'vrij'; s.kies = ['tot10'];
  p.stap = { id: app.run('stapSleutel')(p), n: 6, meer: 1 }; p.recent = [3, 3, 2, 2, 2, 3];
  check(klaar(p), 'KM · Zelf kiezen: na een vlotte reeks blijft "Klaar voor meer" ook na mindere shows', JSON.stringify(p.stap));
  s.kies = ['tot10', 'tot20'];
  check(!klaar(p), 'KM · Zelf kiezen: een vinkje erbij is een nieuwe stap, dan is hij weg', app.run('stapSleutel')(p));
  // twee ladders tegelijk omhoog: de tweede krijgt zijn pil een show later
  const r = app.db.profiles.p3 = app.defaultProfile('Twee', 'dress_roze', {});
  app.normalizeProfiles();
  app.themaZet(r.settings, 'geld', true);
  r.pad = { klaar: ['tot10'], rij: 'tot20', shows: 0, goed: 0, vragen: 0, reeks: [] };
  r.geld = { klaar: ['munten10'], rij: 'briefjes20', shows: 0, goed: 0, vragen: 0, reeks: [] };
  const een = app.groeiMoment(r, {}, 0, 'tot20'), twee = app.groeiMoment(r, {}, 0, null), drie = app.groeiMoment(r, {}, 0, null);
  check(een && een.id === 'tot20' && twee && twee.id === 'briefjes20' && /Briefjes/.test(twee.pil) && drie === null,
    'KM · twee stappen in één show: de eerste nu, de tweede de show erna, en dan niets meer', JSON.stringify([een, twee, drie].map(g => g && g.id)));
  r.klok = { klaar: ['uren'], rij: app.ladderNu(r, 'klok'), shows: 3 };
  app.themaZet(r.settings, 'klok', true);
  check(app.groeiMoment(r, {}, 0, null) === null, 'KM · een rij waar ze al shows op speelde, is geen nieuws meer', JSON.stringify(r.gezien));
  // de antwoordstap die het leerpad zelf zet
  const typ = app.groeiMoment(r, {}, 0, null, 'typ');
  check(typ && typ.id === 'antwoord-typ' && /Zelf typen/.test(typ.pil) && typ.rij === false, 'KM · de antwoordstap krijgt zijn eigen pil', JSON.stringify(typ));
  check(app.groeiMoment(r, {}, 0, null, 'typ') === null, 'KM · en die maar één keer', '');
  // een verse ster op haar eerste rij: niets
  const vers = app.defaultProfile('Vers', 'dress_roze', {});
  app.themaZet(vers.settings, 'tafels', true);
  check(app.groeiMoment(vers, {}, 0, null) === null, 'KM · de eerste rij van een thema is geen groei', JSON.stringify(vers.gezien));
});

klaar();
