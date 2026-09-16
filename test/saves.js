/*
 * Saves zoals ze in het echt op een toestel staan -- met de hand geschreven, in de
 * vorm die de app van vroeger schreef.
 *
 * Waarom niet gewoon een verse app laten opslaan: dan test je de app van vandaag
 * tegen de app van vandaag. Wat hier moet blijven werken is juist het bestand van
 * een kind dat in maart is begonnen: dat mist velden die er nu bij horen, staat
 * op levelnummers die intussen iets anders betekenen, en kent geen enkele
 * beloning. Een handgeschreven kaartje is dan het enige eerlijke uitgangspunt.
 *
 * Elke bouwer geeft een localStorage-kaartje terug, klaar om in laadApp({opslag})
 * te gooien. Ze bouwen elke keer een verse kopie: een test mag erin krassen.
 *
 * De velden die hier ONTBREKEN zijn net zo belangrijk als de velden die er staan:
 *   geen tourStars   -> migrate() mag de oude staart één keer opruimen
 *   geen worldsSeen  -> migrate() mag de al bekeken werelden invullen
 *   geen schemaV     -> normalizeProfiles() mag de eenmalige Clara-inhaalslag doen
 *   geen readyTrophies / stats / countTrack / freebies / base ...
 * Vul ze dus niet "voor de netheid" aan -- dan test dit bestand niets meer.
 */
const LS_KEY = 'rekenPopsterren_v1';

// Sterren zetten op level van..t/m, inclusief. Twee sterren is de gewone uitslag
// van een gespeelde show; drie is perfect.
function sterren(van, tot, waarde) {
  const s = {};
  for (let l = van; l <= tot; l++) s[l] = waarde == null ? 2 : waarde;
  return s;
}
const OUD_EQUIPPED = { hair: 'hair_blond', dress: 'dress_roze', mic: null, stage: 'stage_disco' };
const OUDE_INSTELLINGEN = { ops: ['+', '-'], max: 20, tables: [2, 5, 10], mode: 'kies', perLevel: 8 };

// Een profiel zoals de app het vóór alle latere fases wegschreef: geen trofee-
// lijstjes, geen tourStars, geen worldsSeen, geen stats.
function oudProfiel(naam, extra) {
  return Object.assign({
    name: naam,
    diamonds: 40,
    level: 1,
    stars: {},
    owned: ['hair_blond', 'dress_roze', 'dress_paars', 'shoes_roze', 'stage_disco'],
    equipped: Object.assign({}, OUD_EQUIPPED),
    settings: Object.assign({}, OUDE_INSTELLINGEN),
  }, extra || {});
}

function opslag(db) { return { [LS_KEY]: JSON.stringify(db) }; }
function isDb(profielen, extra) {
  return Object.assign({ sound: true, haptics: true, schemaV: 2, profiles: profielen }, extra || {});
}

const FIXTURES = {
  // 1 · Nog nooit gespeeld: er staat helemaal niets in de opslag.
  geenSave: () => ({}),

  // 2 · Net begonnen: drie shows van de eerste wereld gespeeld.
  beginner: () => opslag(isDb({
    p1: oudProfiel('Noor', { level: 4, diamonds: 55, stars: sterren(1, 3, 2) }),
  })),

  // 3 · Halverwege: twee werelden uit, de derde half. Dit is de stand waar de
  //     meeste toestellen in de praktijk in staan.
  halverwege: () => opslag(isDb({
    p1: oudProfiel('Fien', {
      level: 20, diamonds: 210,
      stars: Object.assign(sterren(1, 8, 3), sterren(9, 16, 2), sterren(17, 19, 2)),
      trophies: ['first', 'rookie3', 'city5'],
    }),
  })),

  // 4 · Aan het oude einde van de content. Dit is de gevaarlijkste van allemaal:
  //     dit kind heeft 48 levels uit én elf shows in de oude oneindige staart
  //     (level 49 t/m 59) staan, op levelnummers die een nieuwe wereld 7 straks
  //     opeist. Zonder de opruiming in migrate() zou die wereld deels uitgespeeld
  //     lijken zonder dat er ooit een show van gedraaid is.
  oudEindeVanDeContent: () => opslag(isDb({
    p1: oudProfiel('Sanne', {
      level: 60, diamonds: 640,
      stars: Object.assign(sterren(1, 48, 2), sterren(49, 59, 3)),
      trophies: ['first', 'rookie3', 'city5', 'city10', 'worldtour'],
      goldHits: 12, encores: 4,
    }),
  }, { schemaV: 2 })),

  // 5 · Ver gevorderd, alles uit, en van vóór de beloningen: zes werelden
  //     uitgespeeld, wereld 1 en 2 zelfs perfect -- maar geen enkel spulletje en
  //     geen enkele perfect-trofee in het bestand. Die horen er bij het openen
  //     stil bij te komen.
  allesUitZonderBeloningen: () => opslag(isDb({
    p1: oudProfiel('Lotte', {
      level: 49, diamonds: 900,
      stars: Object.assign(sterren(1, 16, 3), sterren(17, 48, 2)),
      trophies: ['first', 'rookie3', 'city5', 'city10', 'worldtour', 'sums250'],
      goldHits: 20, encores: 9,
    }),
  })),

  // 6 · Een bestand dat de beloningen al heeft: één wereld uit, met het spulletje
  //     in de kleedkamer, en die wereld is ook perfect met de trofee erbij. Er
  //     mag bij het openen niets dubbel bijkomen.
  metBeloningen: () => opslag(isDb({
    p1: Object.assign(oudProfiel('Mila', {
      level: 9, diamonds: 120,
      stars: sterren(1, 8, 3),
      trophies: ['first', 'rookie3', 'perfect-muziek'],
      readyTrophies: [],
      tourStars: {}, worldsSeen: ['muziek'],
      freebies: 5, base: 'meisje', stats: { correct: 80, wrong: 6 },
    }), {
      owned: ['hair_blond', 'dress_roze', 'dress_paars', 'shoes_roze', 'stage_disco', 'acc_wereld_muziek'],
      equipped: { hair: 'hair_blond', dress: 'dress_roze', shoes: 'shoes_roze', mic: null,
                  instrument: null, acc: 'acc_wereld_muziek', pet: null, stage: 'stage_disco' },
    }),
  })),

  // 7 · Twee kinderen op één toestel, met heel verschillende standen. p1 heeft de
  //     Muziekwereld uit (en het kroontje), p2 is net begonnen.
  tweeSterren: () => opslag(isDb({
    p1: Object.assign(oudProfiel('Aya', {
      level: 9, diamonds: 150, order: 0,
      stars: sterren(1, 8, 3),
      trophies: ['first', 'rookie3', 'perfect-muziek'],
      tourStars: {}, worldsSeen: ['muziek'],
    }), {
      owned: ['hair_blond', 'dress_roze', 'dress_paars', 'shoes_roze', 'stage_disco', 'acc_wereld_muziek'],
    }),
    p2: oudProfiel('Bram', { level: 2, diamonds: 35, order: 1, stars: sterren(1, 1, 1) }),
  })),

  // 8 · Van vóór het schemaV-stempel: hier hoort de eenmalige Clara-inhaalslag
  //     te gebeuren (zie normalizeProfiles) -- precies één keer.
  zonderSchemaV: () => ({
    [LS_KEY]: JSON.stringify({
      sound: true, haptics: true,
      profiles: { p1: oudProfiel('Els', { level: 5, stars: sterren(1, 4, 2) }) },
    }),
  }),

  // 9 · Onleesbaar bestand. Hoort te eindigen als een verse start, met het oude
  //     bestand apart bewaard onder LS_KEY + '.broken'.
  kapot: () => ({ [LS_KEY]: '{"profiles": {"p1": {na' }),

  // 10 · Half kapot maar leesbaar: een bestand waar velden uit weggevallen zijn
  //      die migrate() zelf hoort aan te vullen (owned, trophies, instellingen).
  //      De sterren staan er nog, en die horen te blijven staan.
  halfKapot: () => ({
    [LS_KEY]: JSON.stringify({
      profiles: {
        p1: { name: 'Zo\u00eb', level: 5, diamonds: 70, stars: sterren(1, 4, 2),
              equipped: Object.assign({}, OUD_EQUIPPED) },
      },
    }),
  }),

  // 11 · Een profiel zonder de velden waar migrate() wél op rekent (hier: geen
  //      equipped). Zo'n bestand heeft de app nooit geschreven; het kan alleen uit
  //      een met de hand bewerkte back-up komen. Wat hier vastligt is niet dat het
  //      werkt, maar dat er niets verloren gaat: het onleesbare bestand blijft
  //      apart bewaard onder LS_KEY + '.broken'. Zie de zaak in saves.test.js.
  zonderKernvelden: () => ({
    [LS_KEY]: JSON.stringify({
      profiles: { p1: { name: 'Tess', level: 3, stars: sterren(1, 2, 2) } },
    }),
  }),

};

module.exports = Object.assign({ LS_KEY, sterren, oudProfiel, opslag, isDb }, FIXTURES);
