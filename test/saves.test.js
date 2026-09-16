/*
 * Bestaande saves: openen, bijwerken, bewaren, en twee kinderen op één toestel.
 *
 * Een kind dat in maart begon heeft een bestand op haar telefoon staan dat de app
 * van vandaag nooit geschreven zou hebben. Wat hier vastligt is dat zo'n bestand
 * gewoon opengaat: geen verloren voortgang, geen wereld die ineens uitgespeeld
 * lijkt, geen dubbele beloningen, en geen enkel veld van het ene kind dat bij het
 * andere terechtkomt.
 *
 * De bestanden zelf staan in saves.js -- met de hand geschreven, in de vorm van
 * toen. Zie de kop daar voor waarom ze bewust onvolledig zijn.
 *
 * De zaken:
 *   A  nog nooit gespeeld            -> leeg, en er wordt nog niets bewaard
 *   B  net begonnen / halverwege     -> alles blijft precies staan
 *   C  het oude einde van de content -> de staart wordt één keer opgeruimd
 *   D  ...en dan een wereld erbij    -> die is leeg, ook voor dit bestand
 *   E  van vóór de beloningen        -> stil bijgeschreven, precies één keer
 *   F  had de beloningen al          -> er komt niets dubbel bij
 *   G  twee sterren op één toestel   -> gescheiden, en dat blijft zo
 *   H  van vóór het schemaV-stempel  -> de eenmalige inhaalslag, één keer
 *   I  onleesbaar bestand            -> apart bewaard, niets stilletjes weg
 *   J  velden weg uit een profiel    -> valt niet om / gaat niet verloren
 *   K  rondreis                      -> bewaren en heropenen verandert niets meer
 *
 * Draaien:
 *   npm run test:saves      (of: npm test voor alle suites)
 */
const { laadApp, heropen } = require('./app');
const F = require('./saves');
const { check, zaak, klaar } = require('./meld')('saves');

const kopie = x => JSON.parse(JSON.stringify(x));
const accs = q => (q.owned || []).filter(id => id.indexOf('acc_wereld_') === 0).sort();
const perfects = q => (q.trophies || []).filter(id => id.indexOf('perfect-') === 0).sort();

/* ================= A · Nog nooit gespeeld ================= */
zaak('A', () => {
  const app = laadApp({ opslag: F.geenSave() });
  check(Object.keys(app.db.profiles).length === 0, 'A · een leeg toestel begint zonder sterren',
    JSON.stringify(Object.keys(app.db.profiles)));
  check(app.db.schemaV === app.SCHEMA_V && app.db.sound === true, 'A · met de standaardinstellingen',
    JSON.stringify(app.db));
  check(app.bestand() === null, 'A · en er wordt nog niets weggeschreven', JSON.stringify(app.opslag()));
});

/* ================= B · Net begonnen en halverwege =================
   Het gewone geval, en het geval dat op de meeste toestellen staat. Er mag niets
   aan veranderen behalve de velden die er nog niet waren. */
zaak('B', () => {
  const begin = laadApp({ opslag: F.beginner() });
  const b = begin.db.profiles.p1;
  check(b.name === 'Noor' && b.diamonds === 55 && b.level === 4, 'B · naam, diamanten en positie blijven staan',
    JSON.stringify([b.name, b.diamonds, b.level]));
  check(JSON.stringify(b.stars) === JSON.stringify({ 1: 2, 2: 2, 3: 2 }), 'B · en de sterren precies zoals ze waren',
    JSON.stringify(b.stars));
  check(begin.frontierWorld(b) === 0 && !begin.worldDone(b, 0), 'B · drie shows is geen uitgespeelde wereld',
    [begin.frontierWorld(b), begin.worldDone(b, 0)].join('/'));
  check(accs(b).length === 0, 'B · en er valt nog niets te verdienen', JSON.stringify(accs(b)));

  const half = laadApp({ opslag: F.halverwege() });
  const h = half.db.profiles.p1;
  check(half.totalStarCount(h) === 8 * 3 + 8 * 2 + 3 * 2, 'B · halverwege: het sterrentotaal klopt',
    half.totalStarCount(h));
  check(half.frontierWorld(h) === 2 && half.continueWorld(h) === 2, 'B · de derde wereld is de grens',
    half.frontierWorld(h));
  check(half.worldDone(h, 0) && half.worldDone(h, 1) && !half.worldDone(h, 2),
    'B · twee werelden uit, de derde niet', JSON.stringify(half.WORLDS.map((w, i) => half.worldDone(h, i))));
  check(['first', 'rookie3', 'city5'].every(t => h.trophies.includes(t)), 'B · behaalde trofeeën blijven behaald',
    JSON.stringify(h.trophies));
  check(accs(h).join() === 'acc_wereld_muziek,acc_wereld_snoep', 'B · en de twee verdiende spulletjes staan er',
    JSON.stringify(accs(h)));
});

/* ================= C · Het oude einde van de content =================
   Elf shows in de oude oneindige staart, op levelnummers die straks van wereld 7
   zijn. Ze gaan één keer opzij (tourStars), blijven meetellen, en geven hun
   nummers terug. */
zaak('C', () => {
  const app = laadApp({ opslag: F.oudEindeVanDeContent() });
  const q = app.db.profiles.p1;
  check(Object.keys(q.stars).length === 48, 'C · er blijven 48 echte levels over', Object.keys(q.stars).length);
  check(Object.keys(q.tourStars).length === 11, 'C · en elf staartshows gaan apart', Object.keys(q.tourStars).length);
  check(app.totalStarCount(q) === 48 * 2 + 11 * 3, 'C · zonder dat er één ster verdwijnt', app.totalStarCount(q));
  check(app.playedCount(q) === 59, 'C · en zonder dat er één show verdwijnt', app.playedCount(q));
  check(q.level === app.LEGACY_TOUR_END + 1, 'C · de positie wordt teruggezet naar het einde van de tournee', q.level);
  check(app.allWorldsDone(q) && app.frontierWorld(q) === -1, 'C · alles wat er is, is uit',
    [app.allWorldsDone(q), app.frontierWorld(q)].join('/'));
  check(app.continueWorld(q) === 5, 'C · "verder" is de toegift op de laatste wereld', app.continueWorld(q));
  // en een tweede keer openen doet er niets meer aan
  app.save();
  const weer = heropen(app);
  const w = weer.db.profiles.p1;
  check(Object.keys(w.stars).length === 48 && Object.keys(w.tourStars).length === 11,
    'C · een tweede keer openen ruimt niet nóg een keer op',
    [Object.keys(w.stars).length, Object.keys(w.tourStars).length].join('/'));
  check(weer.totalStarCount(w) === app.totalStarCount(q), 'C · met hetzelfde sterrentotaal', weer.totalStarCount(w));
});

/* ================= D · ...en dan komt er een wereld bij =================
   Hetzelfde bestand, maar nu opent het kind een versie van de app waar wereld 7
   al ín zit. Dit is het geval waar de hele opruiming voor bestaat: de app moet de
   staart opruimen vóórdat die wereld zijn levelnummers opeist. De wereld wordt
   daarom hier al toegevoegd en het bestand pas daarna ingelezen -- precies de
   volgorde van een echte ochtend na een update. */
zaak('D', () => {
  const app = laadApp();   // nog niets in de opslag
  app.WORLDS.push({ id: 'test7', name: 'Testwereld', icon: '🧪', levels: 8, beloning: 'acc_wereld_muziek' });
  app.rebuildWorldStarts();
  app.rebuildWorldBadges();
  check(app.WORLD_START[6] === 49 && app.WORLD_LAST === 56,
    'D · de nieuwe wereld begint op 49 -- waar de staart stond', [app.WORLD_START[6], app.WORLD_LAST].join('/'));
  // ...en dan pas gaat het oude bestand open
  const ruw = F.oudEindeVanDeContent()[F.LS_KEY];
  app.run('localStorage.setItem(LS_KEY, ' + JSON.stringify(ruw) + '); load();');
  const q = app.db.profiles.p1;
  check(!app.worldDone(q, 6), 'D · de nieuwe wereld is niet uitgespeeld', app.worldDone(q, 6));
  check(app.worldProgress(q, app.worldForIndex(6)).gespeeld === 0, 'D · er staat geen enkele show in',
    JSON.stringify(app.worldProgress(q, app.worldForIndex(6))));
  check(app.frontierWorld(q) === 6 && app.continueWorld(q) === 6, 'D · hij is de nieuwe grens',
    [app.frontierWorld(q), app.continueWorld(q)].join('/'));
  check([0, 1, 2, 3, 4, 5].every(i => app.worldDone(q, i)), 'D · de oude zes blijven uitgespeeld',
    JSON.stringify([0, 1, 2, 3, 4, 5].map(i => app.worldDone(q, i))));
  check(Object.keys(q.tourStars).length === 11 && Object.keys(q.stars).length === 48,
    'D · de staartsterren gaan opzij en bezetten geen levels van de nieuwe wereld',
    [Object.keys(q.tourStars).length, Object.keys(q.stars).length].join('/'));
  check(app.totalStarCount(q) === 48 * 2 + 11 * 3, 'D · en er gaat geen ster verloren', app.totalStarCount(q));
  check(q.level === app.LEGACY_TOUR_END + 1, 'D · de positie blijft aan het oude einde staan', q.level);
  check(accs(q).length === 6, 'D · er komt geen zevende spulletje bij van een lege wereld', JSON.stringify(accs(q)));
  // en de wereld blijft leeg tot ze hem écht speelt
  for (let l = 49; l <= 56; l++) q.stars[l] = 2;
  check(app.worldDone(q, 6) && app.allWorldsDone(q), 'D · pas als ze hem speelt is hij uit',
    [app.worldDone(q, 6), app.allWorldsDone(q)].join('/'));
});

/* ================= E · Van vóór de beloningen =================
   Zes werelden uit, waarvan twee perfect, en geen enkele beloning in het bestand.
   Die horen er stil bij te komen -- en precies één keer. */
zaak('E', () => {
  const app = laadApp({ opslag: F.allesUitZonderBeloningen() });
  const q = app.db.profiles.p1;
  check(accs(q).length === 6 && new Set(accs(q)).size === 6, 'E · alle zes de spulletjes staan in de kleedkamer',
    JSON.stringify(accs(q)));
  check(perfects(q).join() === 'perfect-muziek,perfect-snoep',
    'E · en precies de twee perfecte werelden geven een trofee', JSON.stringify(perfects(q)));
  check(q.trophies.includes('worldtour') && q.trophies.includes('sums250'),
    'E · de oude trofeeën blijven staan', JSON.stringify(q.trophies));
  check(app.boughtCount(q) === 0, 'E · en niets ervan telt als gekocht', app.boughtCount(q));
  // nog eens openen: niets dubbel
  app.save();
  const weer = heropen(app);
  const w = weer.db.profiles.p1;
  check(accs(w).length === 6 && perfects(w).length === 2, 'E · een tweede keer openen deelt niets dubbel uit',
    JSON.stringify([accs(w).length, perfects(w).length]));
  check(w.owned.length === q.owned.length && w.trophies.length === q.trophies.length,
    'E · ook niet in de rest van de kast', JSON.stringify([w.owned.length, q.owned.length]));
});

/* ================= F · Had de beloningen al ================= */
zaak('F', () => {
  const app = laadApp({ opslag: F.metBeloningen() });
  const q = app.db.profiles.p1;
  check(q.owned.filter(id => id === 'acc_wereld_muziek').length === 1, 'F · het spulletje staat er precies één keer',
    JSON.stringify(q.owned));
  check(q.trophies.filter(id => id === 'perfect-muziek').length === 1, 'F · en de trofee ook',
    JSON.stringify(q.trophies));
  check(q.equipped.acc === 'acc_wereld_muziek', 'F · en ze heeft hem nog op', q.equipped.acc);
  check(accs(q).length === 1 && app.frontierWorld(q) === 1, 'F · met de voortgang ongemoeid',
    [accs(q).length, app.frontierWorld(q)].join('/'));
});

/* ================= G · Twee sterren op één toestel =================
   Het hele punt van meerdere profielen: wat de een doet komt niet bij de ander
   terecht -- niet bij het openen, niet bij het spelen, en niet bij het bewaren. */
zaak('G', () => {
  const app = laadApp({ opslag: F.tweeSterren() });
  const a = app.db.profiles.p1, b = app.db.profiles.p2;
  check(a.name === 'Aya' && b.name === 'Bram', 'G · allebei de sterren staan er', [a.name, b.name].join('/'));
  check(app.worldDone(a, 0) && !app.worldDone(b, 0), 'G · alleen de een heeft de Muziekwereld uit',
    [app.worldDone(a, 0), app.worldDone(b, 0)].join('/'));
  check(accs(a).length === 1 && accs(b).length === 0, 'G · en alleen zij heeft het kroontje',
    JSON.stringify([accs(a), accs(b)]));
  check(perfects(a).length === 1 && perfects(b).length === 0, 'G · de trofee erft niet over',
    JSON.stringify([perfects(a), perfects(b)]));
  check(app.frontierWorld(a) === 1 && app.frontierWorld(b) === 0, 'G · ieder staat op haar eigen grens',
    [app.frontierWorld(a), app.frontierWorld(b)].join('/'));
  check(a.diamonds !== b.diamonds && a.diamonds === 150 && b.diamonds === 35, 'G · en op haar eigen diamanten',
    [a.diamonds, b.diamonds].join('/'));
  // Het bijwerken bij het openen gaat over álle profielen, niet alleen over het
  // profiel dat het laatst gespeeld heeft.
  ['tourStars', 'worldsSeen', 'readyTrophies', 'stats', 'countTrack', 'settings'].forEach(veld => {
    check(a[veld] != null && b[veld] != null, `G · allebei de profielen worden bijgewerkt (${veld})`,
      JSON.stringify([a[veld], b[veld]]));
  });
  // En "wie speelt er nu" wijst naar het juiste kind.
  app.zetSpeler('p2');
  check(app.P() === b && app.P() !== a, 'G · de gekozen ster is de ster die speelt', app.P() && app.P().name);
  app.zetSpeler('p1');
  check(app.P() === a, 'G · en andersom net zo', app.P() && app.P().name);

  // de ander gaat spelen: het bestand van de eerste mag daar niet van bewegen
  const aVoor = kopie(a);
  app.zetSpeler('p2');
  for (let l = 1; l <= 8; l++) b.stars[l] = 3;
  app.grantWorldRewards(b, 0);
  app.markWorldSeen(b, 1);
  app.save();
  check(JSON.stringify(app.db.profiles.p1) === JSON.stringify(aVoor), 'G · spelen met de een laat de ander onaangeroerd',
    'p1 is veranderd');
  check(accs(b).length === 1 && perfects(b).length === 1, 'G · en de ander verdient nu haar eigen beloningen',
    JSON.stringify([accs(b), perfects(b)]));
  check(a.owned !== b.owned && a.stars !== b.stars, 'G · ze delen geen enkele lijst',
    'zelfde object in twee profielen');

  // en na afsluiten en opnieuw openen staat het er nog steeds zo bij
  const na = heropen(app);
  const a2 = na.db.profiles.p1, b2 = na.db.profiles.p2;
  check(JSON.stringify(a2) === JSON.stringify(aVoor), 'G · ook na heropenen is de eerste onveranderd',
    'p1 is veranderd na heropenen');
  check(na.worldDone(b2, 0) && b2.owned.filter(id => id === 'acc_wereld_muziek').length === 1,
    'G · en de tweede houdt precies één keer wat ze verdiend heeft', JSON.stringify(b2.owned));
  check(na.profileKeys().join() === 'p1,p2', 'G · in dezelfde volgorde als ervoor', na.profileKeys().join());

  // een derde ster erbij raakt de twee die er al staan niet
  na.db.profiles[na.nextProfileKey()] = na.defaultProfile('Cato', 'dress_geel');
  na.save();
  const drie = heropen(na);
  check(JSON.stringify(drie.db.profiles.p1) === JSON.stringify(aVoor), 'G · een nieuwe ster raakt de bestaande niet',
    'p1 is veranderd door een nieuwe ster');
  check(drie.frontierWorld(drie.db.profiles.p3) === 0 && accs(drie.db.profiles.p3).length === 0,
    'G · en begint zelf gewoon bij nul', JSON.stringify(accs(drie.db.profiles.p3)));
});

/* ================= H · Van vóór het schemaV-stempel =================
   De eenmalige inhaalslag voor bestanden die Clara misten. Precies één keer: wie
   haar daarna verwijdert, houdt haar verwijderd. */
zaak('H', () => {
  const app = laadApp({ opslag: F.zonderSchemaV() });
  const namen = Object.values(app.db.profiles).map(p => p.name).sort();
  check(namen.join() === 'Clara,Els', 'H · Clara komt er één keer bij', namen.join());
  check(app.db.schemaV === app.SCHEMA_V, 'H · en het stempel wordt gezet', app.db.schemaV);
  check(Object.keys(app.db.profiles.p1.stars).length === 4, 'H · zonder aan het bestaande profiel te komen',
    JSON.stringify(app.db.profiles.p1.stars));
  app.save();
  // de ouder verwijdert Clara weer
  const na = heropen(app);
  delete na.db.profiles.p3;
  na.save();
  const weer = heropen(na);
  check(!weer.db.profiles.p3, 'H · en na het verwijderen komt ze niet terug',
    JSON.stringify(Object.keys(weer.db.profiles)));
});

/* ================= I · Onleesbaar bestand =================
   Wat er ook misgaat: het oude bestand blijft staan. Een verse start die stilletjes
   over een kapotte back-up heen schrijft is het enige echt onherstelbare dat deze
   app kan doen. */
zaak('I', () => {
  const app = laadApp({ opslag: F.kapot() });
  check(Object.keys(app.db.profiles).length === 0, 'I · een onleesbaar bestand geeft een verse start',
    JSON.stringify(Object.keys(app.db.profiles)));
  const bewaard = app.opslag()[F.LS_KEY + '.broken'];
  check(typeof bewaard === 'string' && bewaard.length > 0, 'I · en het oude bestand wordt apart bewaard', bewaard);
  check(bewaard === F.kapot()[F.LS_KEY], 'I · precies zoals het was', bewaard);
  check(app.opslag()[F.LS_KEY] === F.kapot()[F.LS_KEY], 'I · er wordt ook niet overheen geschreven',
    app.opslag()[F.LS_KEY]);
});

/* ================= J · Velden weg uit een profiel ================= */
zaak('J', () => {
  // wat migrate zelf aanvult: gewoon doorspelen
  const app = laadApp({ opslag: F.halfKapot() });
  const q = app.db.profiles.p1;
  check(!!q && Object.keys(q.stars).length === 4, 'J · een profiel zonder lijstjes houdt zijn sterren',
    JSON.stringify(q && q.stars));
  check(Array.isArray(q.owned) && Array.isArray(q.trophies) && !!q.settings,
    'J · en krijgt de ontbrekende velden erbij', JSON.stringify([q.owned, q.trophies]));
  check(app.frontierWorld(q) === 0 && q.diamonds === 70, 'J · met voortgang en diamanten intact',
    [app.frontierWorld(q), q.diamonds].join('/'));

  /* En een profiel waar méér uit weg is dan migrate aankan (hier: geen equipped).
     Zo'n bestand heeft de app nooit geschreven. Wat hier vastligt is niet dat het
     werkt, maar dat het bestand blijft bestaan: het gaat naar .broken en niet de
     prullenbak. Zie de kop van saves.js en het verslag in docs/TESTEN.md. */
  const stuk = laadApp({ opslag: F.zonderKernvelden() });
  check(Object.keys(stuk.db.profiles).length === 0, 'J · een profiel zonder kernvelden geeft een verse start',
    JSON.stringify(Object.keys(stuk.db.profiles)));
  check(stuk.opslag()[F.LS_KEY + '.broken'] === F.zonderKernvelden()[F.LS_KEY],
    'J · maar het bestand zelf blijft ongeschonden bewaard', JSON.stringify(stuk.opslag()));
});

/* ================= K · De rondreis =================
   stand -> bewaren -> opnieuw openen -> afgeleide voortgang. Na de eerste keer
   openen (waar de bijwerkingen gebeuren) mag er nooit meer iets veranderen: twee
   keer openen geeft exact hetzelfde bestand. */
zaak('K', () => {
  for (const naam of ['beginner', 'halverwege', 'oudEindeVanDeContent', 'allesUitZonderBeloningen',
                      'metBeloningen', 'tweeSterren']) {
    const eerste = laadApp({ opslag: F[naam]() });
    eerste.save();
    const tweede = heropen(eerste);
    tweede.save();
    const derde = heropen(tweede);
    check(JSON.stringify(tweede.db) === JSON.stringify(derde.db),
      'K · ' + naam + ': openen en bewaren komt tot rust', 'tweede en derde keer verschillen');
    // en de afgeleide voortgang komt er hetzelfde uit
    for (const key of Object.keys(tweede.db.profiles)) {
      const x = tweede.db.profiles[key], y = derde.db.profiles[key];
      const af = (app, p) => [app.frontierWorld(p), app.continueWorld(p), app.allWorldsDone(p),
                              app.totalStarCount(p), app.doneWorldCount(p), app.perfectCount(p),
                              app.playedCount(p), app.boughtCount(p),
                              app.WORLDS.map((w, i) => app.worldDone(p, i)).join('')].join('|');
      check(af(tweede, x) === af(derde, y), 'K · ' + naam + ': de voortgang van ' + x.name + ' blijft gelijk',
        af(tweede, x) + ' <> ' + af(derde, y));
      check(JSON.stringify(x.stars) === JSON.stringify(y.stars) &&
            JSON.stringify(x.owned) === JSON.stringify(y.owned) &&
            JSON.stringify(x.trophies) === JSON.stringify(y.trophies),
        'K · ' + naam + ': sterren, spullen en trofeeën van ' + x.name + ' blijven gelijk', x.name);
    }
  }
  // en de gewone instellingen reizen mee
  const app = laadApp({ opslag: F.tweeSterren() });
  app.db.sound = false; app.db.haptics = false;
  app.save();
  const na = heropen(app);
  check(na.db.sound === false && na.db.haptics === false, 'K · geluid en trillen blijven staan',
    JSON.stringify([na.db.sound, na.db.haptics]));
  check(na.db.schemaV === app.SCHEMA_V, 'K · en het schema-stempel blijft staan', na.db.schemaV);
});

klaar();
