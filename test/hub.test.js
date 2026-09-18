/*
 * De ontwikkelstudio (npm run studio): de pagina die zegt wat er draait.
 *
 * Wat hier vastligt is niet hoe het paneel eruitziet -- dat is werk voor de ogen
 * -- maar de vier beloftes die de studio doet, en precies die vier zijn de reden
 * dat hij bestaat:
 *
 *   A  elke knop levert een URL op die het spel ook wérkelijk begrijpt
 *   B  en die URL zet het spel in de stand die op de knop staat
 *   C  de regel bovenin zegt eerlijk wat er draait (tak, commit, open werk)
 *   D  het wereldoverzicht komt uit het spel zelf, niet uit een tweede lijst
 *   F  de snelkoppeling op het bureaublad start deze kloon, met deze node
 *   G  er zijn twee werkbladen en één hoekje, en ze heten overal hetzelfde
 *   H  de globale beelden komen uit scene.js en merk.js, niet uit een derde lijst
 *
 * De reden voor A: een knop met een vlag die index.html niet kent doet niets, en
 * dat merk je pas als je staat te kijken naar een scherm dat er anders uitziet
 * dan je dacht. Dat is erger dan geen knop.
 *
 * Draaien:  npm run test:hub
 */
const fs = require('fs');
const path = require('path');
const { check, zaak, klaar } = require('./meld')('hub');
const { laadApp } = require('./app');
const scenario = require('./scenario');
const versie = require('./versie');
const werelden = require('./werelden');
const hub = require('./hub');
const snelkoppeling = require('./snelkoppeling');

const INDEX = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

/* Een verse app met één ster erin, en dan de kijkstand erop. Dit is precies wat
   ?debug&demo&star=p1&wereld=n&stand=x doet, alleen zonder de schermen -- die
   hebben een browser nodig en zeggen niets over de vraag die hier op tafel ligt. */
function spel(params) {
  const app = laadApp();
  app.run('db.profiles.p1 = defaultProfile("Test", "dress_roze", {}); cur = "p1";');
  if (params.wereld || params.stand) {
    app.run('zetKijkstand(' + (Number(params.wereld) || 1) + ', '
      + JSON.stringify(params.stand || 'vers') + ')');
  }
  if (params.diamanten != null) app.run('P().diamonds = ' + Number(params.diamanten));
  return app;
}
const zoekNaar = u => Object.fromEntries(new URLSearchParams(u.split('?')[1]).entries());

// ---- A: elke vlag bestaat in het spel ------------------------------------
zaak('A · de vlaggen bestaan', () => {
  /* Welke vlaggen leest index.html? Ze staan allemaal in het debugblok als
     dbg.get('x') of dbg.has('x'). Dat is de enige lijst die telt: wat daar niet
     in staat wordt genegeerd, hoe mooi de knop ook heet. */
  const kent = new Set();
  INDEX.replace(/dbg\.(?:get|has)\('([a-z]+)'\)/g, (_, n) => kent.add(n));
  ['debug', 'demo', 'mapedit', 'nieuw', 'sw'].forEach(v => kent.add(v));   // vlaggen zonder dbg.get
  check(kent.has('stand'), 'A · index.html kent &stand', [...kent].join(','));
  check(kent.has('diamanten'), 'A · index.html kent &diamanten', [...kent].join(','));
  check(kent.has('wereld') && kent.has('screen') && kent.has('star'),
    'A · en de vlaggen die er al waren', [...kent].join(','));

  scenario.VOORKEUZES.forEach(v => {
    check(v.plek === 'wereld' || v.plek === 'algemeen',
      'A · "' + v.label + '" weet waar hij hoort', String(v.plek));
    const q = zoekNaar(scenario.url(scenario.vul(v, 2)));
    Object.keys(q).forEach(naam => {
      check(kent.has(naam), 'A · "' + v.label + '" gebruikt alleen vlaggen die bestaan',
        naam + ' in ' + scenario.url(scenario.vul(v, 2)));
    });
  });

  // de schermnamen moeten in de go-tabel staan, anders opent de knop de kaart
  const tabel = INDEX.slice(INDEX.indexOf('const go = {'), INDEX.indexOf('const go = {') + 420);
  scenario.SCHERMEN.forEach(s =>
    check(new RegExp('(^|[{ ,\\n])' + s.id + ':').test(tabel), 'A · scherm "' + s.id + '" bestaat', tabel.slice(0, 120)));

  // de standen moeten in zetKijkstand voorkomen
  const fn = INDEX.slice(INDEX.indexOf('function zetKijkstand'), INDEX.indexOf('function fitVenster'));
  scenario.STANDEN.forEach(s =>
    check(fn.indexOf("'" + s.id + "'") >= 0, 'A · stand "' + s.id + '" bestaat in zetKijkstand', s.id));
});

// ---- B: de stand is echt die stand ---------------------------------------
zaak('B · standen zetten wat ze beloven', () => {
  const w = 3;
  const g = st => {
    const app = spel({ wereld: w, stand: st });
    const p = app.db.profiles.p1;
    return { app, p, v: app.worldProgress(p, app.worldForIndex(w - 1)) };
  };
  const vers = g('vers');
  check(vers.v.gespeeld === 0 && vers.p.level === vers.app.WORLD_START[w - 1],
    'B · vers: hier nog niets, halte 1 aan de beurt', JSON.stringify(vers.v) + ' level ' + vers.p.level);
  check(vers.app.worldDone(vers.p, w - 2) === true,
    'B · vers: en alles ervóór is wél uit', String(vers.app.worldDone(vers.p, w - 2)));

  const slot = g('slot');
  check(slot.app.frontierWorld(slot.p) === w - 2,
    'B · slot: de grens ligt vóór deze wereld, dus hij is dicht', String(slot.app.frontierWorld(slot.p)));

  const half = g('halverwege');
  check(half.v.gespeeld === 3, 'B · halverwege: drie shows gedaan', String(half.v.gespeeld));

  const bijna = g('bijna');
  check(bijna.v.gespeeld === bijna.v.levels - 1 && !bijna.v.uit,
    'B · bijna: alles op één show na', JSON.stringify(bijna.v));
  check(bijna.p.level === bijna.app.WORLD_START[w - 1] + bijna.v.levels - 1,
    'B · bijna: en die laatste show staat klaar', String(bijna.p.level));

  const uit = g('uit');
  check(uit.v.uit && !uit.v.vol, 'B · uit: elke show gedaan, niet overal drie sterren', JSON.stringify(uit.v));

  const perfect = g('perfect');
  check(perfect.v.vol && perfect.v.perfect === perfect.v.levels,
    'B · perfect: overal drie sterren', JSON.stringify(perfect.v));

  const alles = spel({ stand: 'alles' });
  check(alles.allWorldsDone(alles.db.profiles.p1),
    'B · alles: er is geen grens meer — toegift', String(alles.frontierWorld(alles.db.profiles.p1)));
  check(alles.db.profiles.p1.level === alles.WORLD_LAST + 1,
    'B · alles: en het level staat voorbij de laatste show', String(alles.db.profiles.p1.level));

  const arm = spel({ wereld: 1, stand: 'vers', diamanten: 0 });
  check(arm.db.profiles.p1.diamonds === 0, 'B · diamanten=0 doet wat het zegt',
    String(arm.db.profiles.p1.diamonds));

  /* De laatste wereld mag nooit buiten de rij vallen: "wereld 99" hoort op de
     laatste uitgebrachte te klemmen en niet om te vallen. Dat is wat er gebeurt
     als iemand een URL uit een oud bericht plakt nadat er een wereld weg is. */
  const ver = spel({ wereld: 99, stand: 'perfect' });
  check(ver.db.profiles.p1.level <= ver.WORLD_LAST + 1,
    'B · een wereldnummer buiten de rij klemt netjes', String(ver.db.profiles.p1.level));
});

// ---- B2: geen enkele kijkstand slaat iets op -----------------------------
zaak('B · kijken kost nooit een save', () => {
  scenario.VOORKEUZES.forEach(v => {
    const p = scenario.vul(v, 3);
    const app = spel(p);
    app.run('save()');
    check(app.bestand() === null, 'B · "' + v.label + '" schrijft niets weg',
      JSON.stringify(app.opslag()).slice(0, 120));
  });
});

// ---- C: de versieregel ---------------------------------------------------
zaak('C · de versieregel', () => {
  const f = versie.feiten();
  check(f.git === true, 'C · dit is een git-map', JSON.stringify(f).slice(0, 120));
  check(/^[0-9a-f]{7,}$/.test(f.sha || ''), 'C · er staat een commit bij', String(f.sha));
  check(f.samenvatting.indexOf(f.sha) >= 0, 'C · en die staat in de regel', f.samenvatting);

  // de regel zelf is een zuivere functie; dit zijn de vier standen die tellen
  const s = versie.samenvatting;
  check(s({ naam: 'main', sha: 'a83f219', vuil: 0, voor: 0, achter: 0, upstream: 'origin/main' })
    === 'main · a83f219 · gelijk', 'C · gelijk aan de verte',
    s({ naam: 'main', sha: 'a83f219', vuil: 0, voor: 0, achter: 0, upstream: 'origin/main' }));
  check(/3 nieuw op de verte/.test(s({ naam: 'main', sha: 'a', vuil: 0, voor: 0, achter: 3, upstream: 'o' })),
    'C · achterlopen wordt gezegd', s({ naam: 'main', sha: 'a', vuil: 0, voor: 0, achter: 3, upstream: 'o' }));
  check(/2 open wijzigingen/.test(s({ naam: 'x', sha: 'b', vuil: 2, upstream: 'o' })),
    'C · open werk gaat vóór alles', s({ naam: 'x', sha: 'b', vuil: 2, upstream: 'o' }));
  check(/alleen hier/.test(s({ naam: 'x', sha: 'b', vuil: 0, upstream: null })),
    'C · een tak zonder verte zegt dat', s({ naam: 'x', sha: 'b', vuil: 0, upstream: null }));

});

// ---- D: het wereldoverzicht komt uit het spel ----------------------------
zaak('D · het wereldoverzicht', () => {
  const app = laadApp();
  const o = werelden.overzicht({ app });
  check(o.werelden.length === app.WORLDS.length, 'D · evenveel werelden als in WORLDS',
    o.werelden.length + ' vs ' + app.WORLDS.length);
  o.werelden.forEach((w, i) => {
    const echt = app.WORLDS[i], wl = app.worldForIndex(i);
    check(w.id === echt.id && w.naam === echt.name, 'D · naam en id komen uit WORLDS', w.id);
    check(w.eerste === wl.first && w.levels === wl.levels,
      'D · de shownummers komen uit worldForIndex', w.eerste + '/' + w.levels);
    check(w.trofee === 'perfect-' + echt.id, 'D · en de trofee volgt het id', w.trofee);
    check(w.beloningErIs === !!(echt.beloning && app.item(echt.beloning)),
      'D · een beloning die niet bestaat wordt gezien', String(w.beloningErIs));
  });
  check(o.laatsteLevel === app.WORLD_LAST, 'D · het laatste level klopt', String(o.laatsteLevel));

  /* En het overzicht ziet een echte fout. Zonder deze controle zou "0 fouten"
     ook kunnen betekenen dat er niet gekeken wordt. */
  app.run("WORLDS[1].beloning = 'bestaat_echt_niet';");
  const stuk = werelden.overzicht({ app });
  check(stuk.fouten > 0 && stuk.werelden[1].fouten > 0,
    'D · een kapotte beloning is een fout, bij die wereld', JSON.stringify(stuk.werelden[1].punten));
  app.run("WORLDS[1].beloning = 'acc_wereld_snoep';");

  // een ontbrekend bestand wordt gezien zodra we weten wat er ligt
  const zonder = werelden.overzicht({ app, schijf: { 'assets/bg/landing.webp': 40 } });
  check(zonder.fouten > 0, 'D · een kaart die niet op schijf staat is een fout', String(zonder.fouten));
});

// ---- de pagina zelf ------------------------------------------------------
zaak('E · de pagina', () => {
  const p = hub.pagina({ adres: 'http://localhost:8099', lan: '192.168.1.2:8099' });
  scenario.VOORKEUZES.forEach(v =>
    check(p.indexOf(v.label) >= 0, 'E · "' + v.label + '" staat op de pagina', v.label));
  scenario.TOESTELLEN.forEach(t =>
    check(p.indexOf(t.label) >= 0, 'E · toestel "' + t.label + '" staat erop', t.label));
  check(p.indexOf('<script src') < 0 && p.indexOf('cdn.') < 0,
    'E · geen enkele bibliotheek van buiten', 'er wordt iets ingeladen');
  check(/<script>[\s\S]*<\/script>\s*<\/body>/.test(p), 'E · één pagina, script onderin', 'anders');

  /* De pagina heeft haar eigen kopie van bouw()/vul() -- negen regels, zodat er
     geen tweede bestand mee hoeft. Dan moeten die twee wél hetzelfde doen als
     test/scenario.js, anders klopt alles hierboven en de pagina niet. */
  const bouw = new Function('p', p.slice(p.indexOf('function bouw(p)')).match(/function bouw\(p\) \{[\s\S]*?\n\}/)[0]
    .replace('function bouw(p) {', '') .replace(/\}$/, ''));
  const vul = new Function('v', 'nr', p.slice(p.indexOf('function vul(v, nr)')).match(/function vul\(v, nr\) \{[\s\S]*?\n\}/)[0]
    .replace('function vul(v, nr) {', '').replace(/\}$/, ''));
  scenario.VOORKEUZES.forEach(v => {
    const a = bouw(vul(v, 4));
    const b = scenario.url(scenario.vul(v, 4));
    check(a === b, 'E · de pagina bouwt dezelfde URL als scenario.js voor "' + v.label + '"', a + ' vs ' + b);
  });
});

/* ---- G: twee werkbladen, één hoekje --------------------------------------
   De hele informatie-indeling van de studio staat of valt hiermee: wie de pagina
   opent moet zonder lezen zien dat er twee bezigheden zijn. Dat is geen opmaak
   maar een afspraak, en hij hoort dus vast te liggen -- inclusief de zin die bij
   elk werkblad hoort, want een naam zonder die zin is een raadseltje.

   En de woordenlijst. Acht woorden voor acht standen; wie er een negende bij
   verzint (of "dirty" laat staan) maakt de studio moeilijker te lezen zonder het
   te merken. */
zaak('G · de werkbladen en de woorden', () => {
  const p = hub.pagina({ adres: 'http://localhost:8099', lan: '192.168.1.2:8099' });
  [['test', 'Testomgeving', 'Speel en controleer de game in een gekozen toestand'],
   ['wereld', 'Wereldstudio', 'Bouw en beheer de werelden']].forEach(([id, naam, wat]) => {
    check(new RegExp('data-blad="' + id + '"').test(p), 'G · werkblad "' + naam + '" bestaat', id);
    check(p.indexOf(naam) >= 0, 'G · en het heet ' + naam, naam);
    check(p.indexOf(wat) >= 0, 'G · met de zin die erbij hoort', wat);
  });
  check(p.indexOf('App &amp; merk') >= 0 || p.indexOf('App & merk') >= 0,
    'G · en er is een hoekje voor de app zelf', 'App & merk');
  /* Het hoekje is bewust géén derde werkblad in de kiezer: twee bezigheden en een
     voorraadkast, niet drie applicaties. */
  const kiezer = p.slice(p.indexOf('<nav class="kiezer">'), p.indexOf('</nav>'));
  check((kiezer.match(/data-blad=/g) || []).length === 2,
    'G · de kiezer draagt er twee, niet drie', kiezer.replace(/\s+/g, ' '));

  ['Opgeslagen', 'Niet opgeslagen', 'Gewijzigd', 'Waarschuwing', 'Fout',
   'Opgehaald', 'Up-to-date', 'Main is nieuwer'].forEach(w =>
    check(p.indexOf("'" + w + "'") >= 0, 'G · het woord "' + w + '" staat in de lijst', w));
  /* Ontwikkelaarstaal die in de knoppen niets te zoeken heeft. De techniek mag in
     een tooltip of onder Details staan -- daar hoort ze ook. */
  const knoppen = (p.match(/>[^<>{}]{2,40}</g) || []).join('|');
  ['dirty', 'stale', 'detached', 'HEAD~'].forEach(w =>
    check(knoppen.toLowerCase().indexOf(w.toLowerCase()) < 0,
      'G · geen "' + w + '" in wat je leest', w));
});

/* ---- H: de globale beelden ----------------------------------------------
   Het startscherm, het logo, het merkteken en het icoon staan in drie bestanden
   beschreven (scene.js, merk.js, de wortel). De studio hoort ze te tónen zonder
   er een vierde lijst bij te verzinnen -- dat is precies het soort kopie dat op
   een dag iets anders zegt dan de rest. */
zaak('H · de globale beelden', () => {
  const beelden = require('./beelden');
  const o = beelden.overzicht();
  const paden = o.assets.map(a => a.pad);
  check(paden.indexOf(scenePad()) >= 0, 'H · het startscherm komt uit scene.js', paden.join(', '));
  function scenePad() { return require('./scene').SLOTS.landing.pad; }

  const merk = require('./merk');
  const merken = [...new Set(merk.AFGELEID.map(d => d.merk))];
  merken.forEach(m => check(o.assets.some(a => a.label === m),
    'H · "' + m + '" staat erbij', o.assets.map(a => a.label).join(', ')));
  const alleUit = merk.AFGELEID.map(d => d.uit).sort();
  const inLijst = o.assets.filter(a => a.afgeleiden)
    .reduce((u, a) => u.concat(a.afgeleiden.map(d => d.pad)), []).sort();
  check(alleUit.join('|') === inLijst.join('|'),
    'H · elk afgeleid bestand hangt aan zijn meester', inLijst.join(', '));

  o.assets.forEach(a => {
    check(!!a.label && !!a.pad && !!a.groep, 'H · "' + a.id + '" is compleet', JSON.stringify(a).slice(0, 120));
    check(a.soort !== 'keten' || (a.meester && a.afgeleiden.length),
      'H · een keten heeft een meester én afgeleiden', a.id);
    check(a.budget == null || a.budget > 0, 'H · de begroting is een getal in kB', String(a.budget));
  });

  /* Wat de studio mag schrijven en wat niet. Dit is de enige lijst die telt, en
     hij hoort eng te zijn: alles erbuiten is voor de studio alleen tekst. */
  ['assets/bg/landing.webp', 'assets/world/ijs-map.webp',
   'assets/branding/source/appicon.webp'].forEach(f =>
    check(beelden.magSchrijven(f), 'H · ' + f + ' mag vervangen worden', f));
  ['index.html', 'sw.js', 'package.json', '../buiten.webp', 'assets/font/OFL.txt',
   'assets/branding/wordmark.webp'].forEach(f =>
    check(!beelden.magSchrijven(f), 'H · ' + f + ' mag dat niet', f));
});

// ---- F: de snelkoppeling ------------------------------------------------
zaak('F · de snelkoppeling', () => {
  /* Wat hier fout kan gaan is dom en stil: een snelkoppeling die naar een
     andere kloon wijst, of die stukloopt omdat er een spatie in het pad staat
     ("C:\\Users\\Voor Naam\\..."). Je merkt het pas bij het dubbelklikken, en
     dan weet je niet of de studio stuk is of de snelkoppeling. */
  const metSpatie = { root: '/pad met spatie/reken-popsterren', node: '/usr/local/bin node/node' };
  for (const plat of ['darwin', 'win32', 'linux']) {
    const s = snelkoppeling.maak(plat);
    check(s.naam.indexOf('Rekensterren Studio') === 0, 'F · ' + plat + ' · heeft een leesbare naam', s.naam);
    check(s.inhoud.indexOf(snelkoppeling.ROOT) >= 0, 'F · ' + plat + ' · wijst naar déze kloon', s.naam);
    check(s.inhoud.indexOf(process.execPath) >= 0, 'F · ' + plat + ' · met de node die dit draait', s.naam);
    check(/preview\.js/.test(s.inhoud) && /--open/.test(s.inhoud),
      'F · ' + plat + ' · start de server en opent het venster', s.naam);
    /* Een terugval op gewoon "node" als dat pad er ooit niet meer is. Alleen in
       de twee scriptjes: een .desktop-bestand heeft geen tak voor "anders dit"
       (zie de kop van test/snelkoppeling.js). */
    if (plat !== 'linux') {
      check(/\bnode\b/.test(s.inhoud.replace(process.execPath, '')),
        'F · ' + plat + ' · met een terugval op gewoon "node"', s.naam);
    }

    const sp = snelkoppeling.maak(plat, metSpatie);
    const regels = sp.inhoud.split(/\r?\n/).filter(r => r.indexOf(metSpatie.root) >= 0);
    // elk pad met een spatie erin staat tussen aanhalingstekens -- behalve in de
    // velden van een .desktop-bestand die geen opdrachtregel zijn (Path=, Icon=)
    const losse = regels.filter(r => !/^(Path|Icon)=/.test(r))
      .filter(r => !new RegExp('"[^"]*' + metSpatie.root.replace(/[/]/g, '\\/') + '[^"]*"').test(r));
    check(losse.length === 0, 'F · ' + plat + ' · een spatie in het pad breekt niets', losse.join(' | '));
  }
  // en de .desktop is een geldig bureaubladbestand
  const linux = snelkoppeling.maak('linux');
  check(linux.inhoud.indexOf('[Desktop Entry]') === 0, 'F · linux · begint met [Desktop Entry]',
    linux.inhoud.slice(0, 40));
  check(/\nTerminal=true/.test(linux.inhoud), 'F · linux · in een terminal, zodat Ctrl-C hem stopt', 'nee');
});

/* Wisselen mag nooit werk weggooien. Dat is de belangrijkste belofte van de hele
   studio, dus hij wordt op de échte werkmap nagekeken: staat er iets open, dan
   hóórt de wissel te weigeren en niets aan te raken. Is de map schoon, dan blijft
   deze controle achterwege -- er wordt hier niets uitgecheckt om iets te bewijzen,
   want dat zou je eigen werkmap verzetten terwijl je alleen de tests draaide. */
(async () => {
  const f = versie.feiten();
  if (f.vuil) {
    const r = await versie.wissel('main');
    check(r.ok === false && /wijziging/.test(r.tekst),
      'C · met open werk weigert een wissel', JSON.stringify(r));
    const na = versie.feiten();
    check(na.sha === f.sha && na.tak === f.tak,
      'C · en er is niets verzet', na.tak + ' ' + na.sha);
  }
  const mis = await versie.wissel('tak-die-niet-bestaat-xyz');
  check(mis.ok === false, 'C · een bron die niet bestaat is een nette weigering', JSON.stringify(mis));
  klaar();
})();
