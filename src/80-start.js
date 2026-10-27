/* ================= Terug-navigatie (Android back / browser back) =================
   Er is maar één URL, dus normaal ook maar één history-entry: zonder deze laag
   zou de systeem-terugknop de app altijd meteen verlaten, ook middenin een show
   of met een overlay open. Schermen zelf in de history coderen kan niet zomaar:
   de spel-toestand (G/M) leeft alleen in het geheugen en wordt bij afsluiten op
   null gezet, dus een teruggehaald "spel"-scherm zou een kapotte staat tonen.
   In plaats daarvan is history hier puur een signaal: één wachtpost-entry, enkel
   aanwezig zolang terug ook echt iets betekent. Wát die druk betekent, wordt bij
   elke druk opnieuw afgelezen uit de bestaande app-status -- dezelfde variabelen
   die de zichtbare ✕/←-knoppen ook gebruiken, dus geen aparte "stack" die uit de
   pas kan lopen met wat er werkelijk op het scherm staat. */

// Kleedkamer-teruggids: zelfde bestemming voor het zichtbare kopje als voor Android-terug.
function dressBack() { (dressReturnTo === 'trophies' ? openTrophies : goMap)(); }

function backTarget() {
  // 1) een open modal/overlay/menu sluiten -- de onderliggende schermstatus blijft ongemoeid.
  //    (":not(.closing)" want de drie hieronder faden al enkele honderden ms uit; een druk
  //    tijdens die overgang moet niet nogmaals "sluiten", maar meteen de vólgende laag raken.)
  const modal = document.querySelector('.modal-bg.open');
  //    Het stopkaartje is de uitzondering: dáár is terug juist "ja, stoppen", dus
  //    geen wachtpost en de volgende druk verlaat de app (zie toonStopKaart).
  if (modal && $('stop-blijf')) return null;
  if (modal) return modal.id === 'quit-modal' ? closeQuitModal : closeConfirmModal;
  //    Alle zwevende lagen dragen '.rp-overlay' (zie openOverlay), dus één vraag
  //    volstaat. De láátste in de DOM is de bovenste op het scherm -- en dat is de
  //    laag die 'terug' hoort te sluiten. Hiervoor stond er een vaste volgorde
  //    (rang → ladder → trofee) die niets met de stapeling te maken had.
  const lagen = document.querySelectorAll('.rp-overlay:not(.closing)');
  if (lagen.length) return lagen[lagen.length - 1]._close;
  if ($('mem-done').style.display === 'flex') return exitMemory;
  // 2) het huidige scherm verlaten naar zijn eigen ouder -- exact dezelfde bestemming
  //    als de zichtbare ✕/←/tab-knop op dat scherm (nooit twee betekenissen van "terug").
  if ($('screen-game').classList.contains('active')) return askQuit;
  if ($('screen-end').classList.contains('active')) return goMapNaShow;
  if ($('screen-memory').classList.contains('active')) return vraagMemoryStop;
  if ($('screen-settings').classList.contains('active')) return ouderTerug;
  if ($('screen-newstar').classList.contains('active')) return closeNewStar;
  if ($('screen-dress').classList.contains('active')) return dressBack;
  if ($('screen-trophies').classList.contains('active')) return goMap;
  // de reis ligt boven de kaart: terug is één stap inzoomen, niet het spel uit
  if ($('screen-journey').classList.contains('active')) return reisSluit;
  /* Kijk je op de kaart in een andere wereld dan waar je speelt (een uitstapje via
     Werelden), dan is terug eerst: naar huis, precies wat de gouden ⟲-pil doet.
     Hier ging terug meteen naar de sterrenkeuze, en dat is het spel uit terwijl
     je net één stap opzij had gezet. */
  if ($('screen-map').classList.contains('active') && !$('world-back').hidden
      && $('world-back').onclick) return $('world-back').onclick;
  if ($('screen-map').classList.contains('active')) return goProfiles;
  // de sterrenkeuze is de bodem: eerst nog vragen of je echt wil stoppen
  if ($('screen-profile').classList.contains('active')) return toonStopKaart;
  return null;
}

/* Het stopkaartje: de laatste terug-druk, op de sterrenkeuze. Een webapp kan
   zichzelf niet sluiten -- window.close() mag niet en history kan er niet uit,
   zeker niet als geïnstalleerde app -- dus er is geen knop "Stoppen" die het
   ook echt doet. Wat wél kan: dit kaartje zet géén nieuwe wachtpost (backTarget
   geeft er null voor), dus de vólgende terug-druk verlaat de app zelf. Het
   kaartje zegt dat, en de gouden knop is de weg terug het spel in. */
function toonStopKaart() {
  $('confirm-title').textContent = '👋 Stoppen?';
  $('confirm-body').textContent = 'Druk nog eens op terug om te stoppen.';
  $('confirm-actions').innerHTML = `<button class="btn" id="stop-blijf">Doorspelen</button>`;
  $('stop-blijf').onclick = () => { sndClick(); closeConfirmModal(); };
  $('confirm-modal').classList.add('open');
  syncBackGuard();
}

/* Waarom terug na de eerste keer vooruit gaat in plaats van opnieuw te duwen:
   Chrome slaat bij de terugknop history-entries over die een pagina toevoegde
   "zonder tik van de speler" (de history manipulation intervention). En na een
   terug-druk van de systeemknop telt de vorige tik daarvoor niet meer mee, tot
   er een nieuwe komt (crbug.com/1248529, honor_sticky_activation_for_history_intervention
   in Chromium). Een pushState in de popstate maakte dus élke entry van deze
   pagina overslaanbaar: de eerste terug deed wat hij moest, de tweede sloeg de
   hele app over en sloot hem -- op welk scherm je ook stond. Desktop ziet dit
   niet, want daar is terug een toets of muisknop, en dat telt wél als tik.
   Daarom wordt de wachtpost maar één keer geduwd, bij een tik (een ster kiezen),
   en daarna hergebruikt: na een terug staat hij nog vóór ons in de history, en
   history.forward() stapt er weer op zonder iets nieuws toe te voegen -- dan
   valt er voor Chrome ook niets te markeren. guardVooruit zegt of hij daar ligt;
   dat is zo vanaf de eerste popstate tot de volgende pushState. */
let backGuardArmed = false, syncingBackGuard = false, backSyncQueued = false, guardVooruit = false;
// Zorgt dat er precies dan een "wachtpost"-entry op de history staat als backTarget()
// iets teruggeeft. Eén tussenstap (bv. een venster dat eerst dichtgaat en pas
// dáárna show() naar het echte scherm) kan tussentijds heel even "niks" laten
// lijken; history.back() is bovendien async terwijl pushState synchroon is, dus een
// directe her-bewapening zou daarmee kunnen botsen. Daarom pas ná de huidige batch
// synchrone DOM-wijzigingen checken (via microtask): alle syncBackGuard()-aanroepen
// in dezelfde beurt smelten zo samen tot één beslissing op de uiteindelijke status.
// Microtasks legen zich altijd vóór de vólgende popstate-taak, dus twee snelle
// druk-op-druk-keren kunnen elkaar hierdoor nooit inhalen.
function syncBackGuard() {
  if (backSyncQueued) return;
  backSyncQueued = true;
  queueMicrotask(() => {
    backSyncQueued = false;
    const want = !!backTarget();
    syncTerugWachter(want);
    if (want === backGuardArmed) return;
    if (want) {
      // Nog nooit getikt (net geopend)? Dan zou Chrome een nieuwe wachtpost meteen
      // als overslaanbaar markeren, en de eerste terug sloeg de app over zonder
      // stopkaartje. Dus wachten op de eerste tik -- de klik-luisteraar hieronder.
      const ua = navigator.userActivation;
      if (!guardVooruit && ua && !ua.hasBeenActive) return;   // de terugwachter vangt hem dan op
      if (guardVooruit) history.forward();                    // de oude wachtpost, zie hierboven
      else history.pushState({ rpGuard: 1 }, '');
      backGuardArmed = true;
    }
    else { syncingBackGuard = true; history.back(); }
  });
}
window.addEventListener('popstate', () => {
  // Weer óp de wachtpost: dat is onze eigen forward() die aankomt (of de
  // vooruitknop van een desktopbrowser). Er is niets gedrukt dat iets moet doen.
  if (history.state && history.state.rpGuard) { backGuardArmed = true; return; }
  backGuardArmed = false;                                       // onze entry is net verbruikt
  guardVooruit = true;                                          // ... maar hij ligt nog vóór ons
  if (syncingBackGuard) { syncingBackGuard = false; return; }    // wíj stuurden dit terug, niet de speler
  const act = backTarget();
  if (act) { act(); syncBackGuard(); }
});
// Na terugkeer uit de bfcache (bv. via Recents) kan de wachtpost-entry intussen
// alweer weg zijn -- lees de status dan opnieuw af i.p.v. hem zomaar aan te nemen.
window.addEventListener('pageshow', () => { backGuardArmed = !!(history.state && history.state.rpGuard); syncBackGuard(); });
/* De terugwachter: op Android vangt een CloseWatcher de terugknop, en de
   wachtpost hierboven is alleen nog het vangnet (desktop-terugknop, oudere
   browsers). Android vraagt eerst de CloseWatchers en raakt de history pas als
   er geen is -- dus zolang hij staat, beweegt de history bij terug helemaal niet.

   Waarom dat ertoe doet: Chrome op Android speelt bij elke terug-stap in de
   history zijn eigen veeg-animatie, met een schermafdruk van de entry waar je
   naartoe gaat. Onze wachtpost wisselt de hele tijd tussen twee entries op
   dezelfde URL, en die afdruk is van een vroeger moment in het spel: na een paar
   keer terug flitste er een oud scherm voorbij, met onze eigen overgang erover.
   Via de CloseWatcher is er geen navigatie, dus geen veeg en geen afdruk.

   Hij staat precies dan als backTarget() iets teruggeeft -- dezelfde vraag als
   voor de wachtpost -- en zet zich na elke druk opnieuw. Op de bodem (het
   stopkaartje) staat hij niet, en valt de volgende terug door naar de history:
   de app gaat dicht. Een pagina mag één CloseWatcher zetten zonder tik, dus ook
   een vers geopende app krijgt bij de eerste terug het stopkaartje.
   Alleen op een aanraakscherm: met een toetsenbord is Escape het sluitverzoek,
   en dat regelt de toetsluisteraar hieronder al (zonder stopkaartje). */
let terugWachter = null;
const kanTerugWachter = typeof CloseWatcher === 'function' && matchMedia('(pointer: coarse)').matches;
function syncTerugWachter(want) {
  if (!kanTerugWachter) return;
  if (!want) { if (terugWachter) { terugWachter.destroy(); terugWachter = null; } return; }
  if (terugWachter) return;
  try { terugWachter = new CloseWatcher(); } catch (e) { terugWachter = null; return; }
  terugWachter.onclose = () => {
    terugWachter = null;
    const act = backTarget();
    if (act) act();
    syncBackGuard();
  };
}
// De wachtpost die bij het opstarten nog niet mocht (zie syncBackGuard): bij elke
// tik opnieuw kijken. Kost niets als hij er al staat of niet hoeft.
document.addEventListener('click', syncBackGuard, true);
// Escape is dezelfde intentie als terug, ook zonder touchscherm. Behalve het
// stopkaartje: "druk nog eens op terug" zegt een toetsenbord niets.
// Staat de terugwachter, dan is Escape óók zijn sluitverzoek: niet twee keer doen.
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !terugWachter) { const act = backTarget(); if (act && act !== toonStopKaart) act(); } });

/* De schermtekeningen van de kleedkamer en de kast aanzetten, als er een is.
   Eén plek, en hij leest SCHERMKUNST -- er staat nergens anders een pad.

   Waarom een klasse en een variabele in plaats van een vast url() in het
   stijlblad: zolang er geen tekening is moet er ook niets opgevraagd worden. Een
   url() naar een bestand dat er niet is kost elk kind een mislukte aanvraag en
   laat de gedeelde schil vervallen -- twee schermen die platter zijn dan ze
   waren, voor een tekening die nog niet bestaat. Zie de regel bij
   #screen-dress.kunst.app-sfeer::before. */
function zetSchermkunst() {
  const waar = { dress: 'screen-dress', tro: 'screen-trophies' };
  Object.keys(waar).forEach(sleutel => {
    const el = $(waar[sleutel]);
    const pad = SCHERMKUNST && SCHERMKUNST[sleutel];
    if (!el) return;
    el.classList.toggle('kunst', !!pad);
    if (pad) el.style.setProperty('--kunst-scherm', 'url("' + pad + '")');
    else el.style.removeProperty('--kunst-scherm');
  });
}

/* ================= Start ================= */
load();
zetSchermkunst();
renderProfiles();
// Bij het opstarten staat dit scherm er al uit de opmaak, dus er komt geen
// goProfiles() langs om de begroeting aan te zwengelen. Brengt ?debug je meteen
// ergens anders heen, dan zet show() hem hieronder net zo goed weer stil.
landingLeeft();
// Alleen hier, bij het opstarten -- niet bij elke terugkeer naar dit scherm. Zie
// "= Het spelogo komt binnen".
logoIntro();
syncBackGuard();
// de ruimte onder de balken: meten voor het eerste scherm, en daarna bijhouden
onderVrijWaarnemen();
onderVrijOpnieuw();
/* ---- Ontwikkelaarsschakelaars (alleen met ?debug in de URL) ----
   Bestaat om twee redenen: de geautomatiseerde tests kijken via __game() in de
   lopende show mee, en wie aan het uiterlijk werkt moet élk scherm kunnen zien
   zonder eerst een half uur te spelen. In het gewone spel bestaat dit blok niet.

   ?debug            -- zet de schakelaars aan
   &demo             -- vult twee voorbeeldsterren (Lotte: rekenen, show 6 ·
                        Sem: tellen, show 2). ALLEEN in het geheugen: er wordt
                        niets opgeslagen, dus een echte familie-opslag op
                        hetzelfde toestel blijft ongemoeid.
   &star=p1|p2       -- welke voorbeeldster meteen geselecteerd wordt
   &intro            -- speel de logo-intro toch af (onder ?debug staat hij uit,
                        zie "= Het spelogo komt binnen"), en dan ook als de
                        pagina er te lang over deed
   &wereld=<n>       -- open meteen in wereld n (1 = de eerste). Zet een
                        samenhangende stand neer -- alles ervóór uitgespeeld --
                        en grendelt de opslag, dus ook op een echte ster wordt
                        er niets weggeschreven. Om een kaart of een overgang op
                        een telefoon te bekijken zonder er eerst naartoe te
                        spelen.
   &stand=<naam>     -- wát er in die wereld al gebeurd is. Zonder deze vlag is
                        dat 'vers'. Zie zetKijkstand hieronder voor de zes.
   &diamanten=<n>    -- de beurs op n zetten (koopstroom nakijken zonder sparen)
   &stage=<item-id>  -- forceer een podium (bv. stage_vulkaan)
   &screen=<naam>    -- spring meteen naar profile | map | reis | dress | tro |
                        game | end | ouder
   &nieuw[=<naam>]   -- samen met &mapedit: een wereld erbij. Met een naam maakt
                        hij hem meteen; zonder naam staat het veld klaar
   &mapedit          -- wereldstudio: een wereld maken en nakijken op de echte
                        kaart -- tekening, kleuren, beloning, haltes en weg --
                        en het blok terugschrijven naar WORLDS (zie
                        startMapEdit hieronder). Zet &onuitgebracht vanzelf aan
   &onuitgebracht    -- speel ook de werelden die nog op released:false staan
                        (zie PROEF_ONUITGEBRACHT). Zo probeer je een nieuwe
                        wereld in het echte spel voordat een kind hem ziet.
                        Grendelt de opslag, net als &wereld: sterren in een
                        wereld die nog niet uit is horen in geen enkele save
                        -- dat is precies de "al half uitgespeeld"-fout die
                        LEGACY_TOUR_END moest voorkomen                      */
if (location.search.indexOf('debug') !== -1) {
  const dbg = new URLSearchParams(location.search);
  /* Vóór het concept: dat bouwt de levelnummers opnieuw op en leest deze vlag.
     En de opslag op slot (demoStand). De studio en Probeer zetten zelf al &demo,
     maar wie de URL met de hand intikt op de ster van een echt kind, zou anders
     sterren op 49..56 bewaren -- in een wereld die voor haar nog niet bestaat, en
     die dan bij het uitbrengen al half uitgespeeld lijkt. */
  if (dbg.has('onuitgebracht') || dbg.has('mapedit')) {
    PROEF_ONUITGEBRACHT = true; demoStand = true;
    rebuildWorldStarts(); rebuildWorldBadges();
  }
  if (loadWorldDraft()) console.log('wereldconcept uit localStorage geladen (' + WORLDS.length + ' werelden)');
  window.__game = () => G;
  // een beeldscherm dat niet past, meldt zich in de console (zie schuifWacht)
  schuifWachtAan = true;
  addEventListener('resize', schuifWacht);
  window.__db = () => db;
  if (dbg.has('demo')) {
    // Geen save(): dit is een kijk-opstelling, geen opslag. Bij herladen wordt
    // ze gewoon opnieuw uit de URL opgebouwd. De grendel zit in save() zelf --
    // hier alleen "niets meer wegschrijven" zeggen was niet genoeg, want elke
    // kaart die opengaat schrijft via markWorldSeen vanzelf weg.
    demoStand = true;
    db.sound = false; db.haptics = false;
    const a = defaultProfile('Lotte', 'dress_roze', { hair: 'hair_blond' });
    a.order = 0; a.level = 6; a.diamonds = 240;
    a.stars = { 1: 3, 2: 3, 3: 2, 4: 3, 5: 2 };
    ['hair_regenboog', 'dress_disco', 'shoes_goud', 'mic_roze', 'stage_kasteel',
     'acc_kroon', 'pet_eenhoorn', 'instr_gitaar', 'stage_ruimte', 'stage_vulkaan',
     'dress_sterren', 'shoes_zwart', 'mic_goud'].forEach(id => a.owned.push(id));
    a.equipped = { hair: 'hair_regenboog', dress: 'dress_disco', shoes: 'shoes_goud',
      mic: 'mic_roze', stage: 'stage_kasteel', acc: 'acc_kroon',
      pet: 'pet_eenhoorn', instrument: 'instr_gitaar' };
    a.trophies = ['first', 'sums25', 'perfect1'];
    a.readyTrophies = ['gold5'];
    a.goldHits = 7; a.encores = 3;
    a.stats = { correct: 180, wrong: 22 };
    const c = defaultProfile('Sem', 'dress_blauw',
      { hair: 'hair_bruin', base: 'jongen', track: 'count', stage: 3 });
    c.order = 1; c.level = 2; c.diamonds = 35; c.stars = { 1: 2 };
    c.owned.push('mic_zilver'); c.equipped.mic = 'mic_zilver';
    c.trophies = ['first']; c.stats = { correct: 12, wrong: 4 };
    db.profiles = { p1: a, p2: c };
    renderProfiles();
  }
  const star = dbg.get('star');
  if (star && db.profiles[star]) {
    cur = star;
    /* &wereld=n -- meteen in wereld n staan.

       Hij zet een samenhángende stand neer en niet alleen een getal, en dat moet
       ook: "waar ben ik" wordt uit de sterren afgeleid en niet uit p.level (zie
       continueWorld). Een los opgehoogd level zou de kaart gewoon weer bij de
       grens openen -- dus gaan de werelden ervóór op vol en die erna leeg.
       worldsSeen gaat mee, anders begroet de kaart je bij het openen eenmalig met
       de onthulling van een nieuwe wereld (zie goMap) en kijk je naar een camera
       die klimt in plaats van naar wat je wilde zien.

       En hij grendelt de opslag: vanaf hier schrijft save() niets meer weg (zie
       demoStand), ook niet als dit toevallig de échte ster van een echt kind is.
       Kijken mag alles, veranderen niets -- een kijkvlag hoort nooit een save te
       kunnen kosten. */
    const wereld = Number(dbg.get('wereld'));
    const stand = dbg.get('stand');
    if (wereld >= 1 || stand) zetKijkstand(wereld >= 1 ? wereld : 1, stand || 'vers');
    const munten = dbg.get('diamanten');
    if (munten != null && munten !== '') { demoStand = true; P().diamonds = Math.max(0, Number(munten) || 0); }
    const forced = dbg.get('stage');
    if (forced && item(forced)) {
      if (!P().owned.includes(forced)) P().owned.push(forced);
      P().equipped.stage = forced;
    }
    const go = { map: goMap, dress: openKleedkamer, tro: openTrophies,
                 // ouder = de pagina van deze ster (met ▶); ouders = het overzicht
                 profile: goProfiles, ouder: () => { goMap(); openSettings(); setKey = cur; renderSettings(); },
                 ouders: () => { goMap(); openSettings(); },
                 reis: () => { goMap(); openReis(); },
                 game: () => startLevel(P().level),
                 end: () => { startLevel(P().level); endLevel(true); } };
    (go[dbg.get('screen')] || goMap)();
  }
  if (dbg.get('fit')) fitVenster(dbg.get('fit'));
  if (dbg.has('mapedit') && cur) laadStudio();
}
/* De wereldstudio staat niet in dit bestand maar ernaast, in studio.js (zie
   test/bouw.js, LOS): geen kind draait hem, dus hoeft geen tablet hem bij het
   opstarten te lezen. Hier wordt hij opgehaald als hij nodig is.

   Een klassiek script en geen module, zodat het ook vanaf file:// werkt. Geen
   tijdstempel erachter: npm run studio stuurt alles met no-store, en de service
   worker haalt de schil (en dus ook dit bestand) netwerk-eerst -- een stempel zou
   daar bij elke opening een nieuw item in de voorraad zetten. Staat hij er al
   (een tweede aanroep), dan meteen. */
function laadStudio() {
  if (typeof startMapEdit === 'function') { startMapEdit(); return; }
  const s = document.createElement('script');
  s.src = 'studio.js';
  s.onload = () => startMapEdit();
  s.onerror = () => console.error('[wereldstudio] studio.js kon niet geladen worden');
  document.head.appendChild(s);
}
/* ---- Kijkstanden (?debug&wereld=n&stand=...) --------------------------------
   Een spel in een representatieve stand zetten zónder ernaartoe te spelen. Dat
   is het halve werk bij het nakijken van een wereld: een kaart met alles op slot
   ziet er anders uit dan diezelfde kaart met overal drie sterren, en je hoort
   allebei te zien vóórdat een wereld naar main gaat.

   Er wordt hier níéts nagebouwd. De stand is p.stars en p.level, precies de twee
   dingen die het spel zelf opslaat; alles wat een scherm daarna toont (welke
   wereld open is, waar de pop staat, welke badge er hangt) leidt het spel er zelf
   uit af. Een kijkstand kan dus nooit iets tonen dat in een echt spel onmogelijk
   is -- en dat is de enige reden dat kijken hier iets waard is.

   De zes standen, allemaal ín wereld n:
     slot        de wereld ervóór is nog niet uit, dus deze is dicht
     vers        hier net aangekomen, halte 1 is aan de beurt
     halverwege  drie shows gedaan, de vierde is aan de beurt
     bijna       alles op één show na -- speel die uit voor de wereldovergang
     uit         elke show gespeeld, twee sterren
     perfect     elke show op drie sterren
   En één die over de hele reis gaat:
     alles       elke uitgebrachte wereld perfect (de toegift-stand)

   Bij drie van de zes (slot, uit, perfect) ligt de grens van de voortgang niet
   ín wereld n, en dan zou de kaart bij het openen ergens anders uitkomen -- op
   de wereld waar het kind "hoort" te zijn. Je wilde juist wereld n zien, in die
   stand. Daarom zetten die drie reisDoel: dezelfde weg die de Werelden-lijst
   gebruikt als je daar een wereld aantikt. Kijken, geen voortgang -- goMap
   verbruikt het bij het eerstvolgende openen en daarna is alles weer gewoon.

   De opslag gaat op slot (demoStand): kijken mag alles, veranderen niets. Ook op
   de échte ster van een echt kind wordt er hierna niets weggeschreven. */
function zetKijkstand(wereld, stand) {
  demoStand = true;
  const p = P();
  const laatste = WORLD_AVAIL - 1;
  const n = Math.max(0, Math.min(Math.round(wereld) - 1, laatste));
  p.stars = {};
  p.worldsSeen = [];
  const vul = (i, ster) => {
    for (let l = WORLD_START[i]; l < WORLD_START[i] + WORLDS[i].levels; l++) p.stars[l] = ster;
  };
  /* 'alles' is geen stand ín een wereld maar een stand van de reis: alles uit,
     overal drie sterren. Dan is er geen grens meer en speelt het spel toegift. */
  if (stand === 'alles') {
    for (let i = 0; i <= laatste; i++) { vul(i, 3); p.worldsSeen.push(WORLDS[i].id); }
    p.level = WORLD_LAST + 1;
    viewWorldIdx = null;
    return;
  }
  /* Op slot: de wereld ervóór moet juist níét uit zijn, anders staat deze open.
     In de eerste wereld valt er niets vóór; die is nooit op slot. */
  if (stand === 'slot' && n > 0) {
    for (let i = 0; i < n - 1; i++) vul(i, 3);
    const vorige = n - 1;
    for (let l = WORLD_START[vorige]; l < WORLD_START[vorige] + WORLDS[vorige].levels - 1; l++) p.stars[l] = 3;
    p.level = WORLD_START[vorige] + WORLDS[vorige].levels - 1;
    for (let i = 0; i <= vorige; i++) p.worldsSeen.push(WORLDS[i].id);
    viewWorldIdx = null;
    reisDoel = n;                           // laat wéér wereld n zien, nu op slot
    return;
  }
  // Alles vóór wereld n is uit; dat is de enige samenhangende manier om hier te staan.
  for (let i = 0; i < n; i++) vul(i, 3);
  for (let i = 0; i <= n; i++) p.worldsSeen.push(WORLDS[i].id);
  const eerste = WORLD_START[n], len = WORLDS[n].levels;
  if (stand === 'perfect' || stand === 'uit') {
    vul(n, stand === 'perfect' ? 3 : 2);
    p.level = eerste + len;
    reisDoel = n;                           // de grens ligt verderop; kijk hier
  } else if (stand === 'bijna') {
    for (let l = eerste; l < eerste + len - 1; l++) p.stars[l] = 3;
    p.level = eerste + len - 1;
  } else if (stand === 'halverwege') {
    const tot = Math.min(3, len - 1);
    for (let l = eerste; l < eerste + tot; l++) p.stars[l] = 2 + (l % 2);
    p.level = eerste + tot;
  } else {
    p.level = eerste;                       // 'vers', en de terugval voor een onbekende naam
  }
  viewWorldIdx = null;
}

/* Een voorbeeldvenster op ware toestelmaat. window.open zet de BUITENmaat, en een
   browser mag daar een minimum op leggen -- dan kijk je naar een venster dat breder
   is dan de telefoon die je wilde zien, en dus naar de verkeerde opmaak. Hier
   corrigeert het venster zichzelf met het verschil tussen buiten en binnen, en zegt
   een balkje onderaan wat de binnenmaat écht geworden is. */
function fitVenster(spec) {
  const w = Number(spec.split('x')[0]), h = Number(spec.split('x')[1]);
  if (!w || !h) return;
  const meld = () => {
    const klopt = innerWidth === w && innerHeight === h;
    let el = document.getElementById('fit-badge');
    if (!el) {
      el = document.createElement('div');
      el.id = 'fit-badge';
      el.style.cssText = 'position:fixed;left:50%;bottom:6px;transform:translateX(-50%);'
        + 'z-index:99999;padding:3px 9px;border-radius:99px;pointer-events:none;'
        + 'font:600 11px ui-monospace,monospace;';
      document.body.appendChild(el);
    }
    el.style.background = klopt ? 'rgba(20,80,45,.85)' : 'rgba(120,30,20,.9)';
    el.style.color = klopt ? '#b6ffd6' : '#ffd0c4';
    el.textContent = klopt ? innerWidth + ' x ' + innerHeight
      : 'gevraagd ' + w + 'x' + h + ' — werkelijk ' + innerWidth + 'x' + innerHeight;
  };
  try { resizeTo(w + (outerWidth - innerWidth), h + (outerHeight - innerHeight)); } catch (_) {}
  setTimeout(meld, 120);
  addEventListener('resize', () => setTimeout(meld, 60));
}

