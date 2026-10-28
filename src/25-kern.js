/* ================= De voortgang, afgeleid ==================================
   FASE 4A. Vijf begrippen die vroeger één getal waren (p.level) en daardoor niet
   uit elkaar te houden waren. Ze staan hier bij elkaar omdat ze elkaars buren
   zijn, en ze bewaren geen van alle iets: alles komt uit p.stars en uit wat er
   in WORLDS staat. Wat er wél wordt opgeslagen is p.stars, en meer niet.

     worldAvailable(i)  bestaat deze wereld voor dit kind? (uitgebracht)
     worldDone(p, i)    heeft dit kind deze wereld écht uitgespeeld?
     frontierWorld(p)   de eerste beschikbare wereld die nog niet uit is, of -1
     allWorldsDone(p)   alles wat er nú is, is uit -> de toegift-stand
     continueWorld(p)   waar "verder" naartoe gaat: de grens, of anders de laatste

   De regel waar deze hele fase om draait: een wereld is NOOIT uit omdat hij
   vóór je huidige positie ligt. Hij is uit omdat elk van zijn shows gespeeld is.
   Positie en voltooiing zijn twee dingen, en één getal kan er maar één zijn. */
function worldAvailable(i) { return i >= 0 && i < WORLD_AVAIL; }
// Uitgespeeld = precies wat de wereldbadge al betekende: elke show één keer
// gedaan. Bewust niet aangescherpt naar sterren of perfectie -- dat is een
// andere vraag (worldProgress().vol) en die verandert deze fase niet.
function worldDone(p, i) {
  if (!worldAvailable(i)) return false;
  return worldProgress(p, worldForIndex(i)).uit;
}
// De grens van de voortgang: de eerste beschikbare wereld die nog niet uit is.
// -1 = er is er geen meer, alles is uit (zie allWorldsDone).
function frontierWorld(p) {
  for (let i = 0; i < WORLD_AVAIL; i++) if (!worldDone(p, i)) return i;
  return -1;
}
function allWorldsDone(p) { return frontierWorld(p) < 0; }
/* Waar "verder" heen gaat. Is er nog een wereld te doen, dan die. Is alles uit,
   dan de laatste uitgebrachte wereld -- niet als voortgang maar als toegift: daar
   valt nog te verbeteren, en er schuift niets vooruit. Komt er later een wereld
   bij, dan is die de volgende ochtend vanzelf de grens en wijst deze functie
   erheen, zonder dat er iets gemigreerd hoeft te worden. */
function continueWorld(p) {
  const f = frontierWorld(p);
  return f >= 0 ? f : Math.max(0, WORLD_AVAIL - 1);
}
/* ---- Hoe ver je vooruit kijkt ------------------------------------------------
   Zes standen, en ze zijn alle zes iets anders. Ze staan hier bij elkaar omdat ze
   makkelijk door elkaar te halen zijn, en omdat er precies één bij is die nieuw is:

     geschreven      staat in WORLDS                       WORLDS.length
     uitgebracht     mag gespeeld worden in deze versie    worldAvailable(i)
     uitgespeeld     dit kind heeft elke show gedaan       worldDone(p, i)
     hier            waar "verder" naartoe gaat            continueWorld(p)
     te zien         mag op de reis staan                  ZIE HIERONDER
     nog niet        geschreven maar niet uitgebracht      released: false

   "Te zien" is nieuw, en het is niet hetzelfde als "uitgebracht". Achteruit zie je
   álles: elke wereld die af is blijft staan, want daar ga je naartoe terug om
   sterren op te halen, en die rij ís de reis die je gelopen hebt. Vooruit zie je
   maar een paar bestemmingen.

   Waarom niet gewoon alles vooruit ook: met zes werelden viel dat niet op, maar de
   tournee groeit. Bij dertig werelden is "de reis" dan een kaart met vier plekken
   die van jou zijn en zesentwintig sloten erboven -- dat is geen belofte meer maar
   een inventaris, en een kind dat bij wereld drie staat heeft niets aan wereld
   zevenentwintig. Drie bestemmingen vooruit is genoeg om te zien waar je heen
   gaat; wat daarboven ligt zegt de mist (zie renderReis).

   Het scheelt meteen ook werk: elke bestemming die er niet staat haalt zijn
   tekening niet op. Zie de drie soorten spullen bij preloadArt.

   Een wereld die nog niet uitgebracht is komt hier sowieso niet voorbij -- de
   grens ligt op WORLD_AVAIL. Die stond er eerder wél, als vraagteken in de mist,
   en dat is precies wat een niet-uitgebrachte wereld niet hoort te doen:
   verklappen dat hij bestaat. */
const REIS_VOORUIT = 3;
function laatsteZichtbareWereld(p) {
  return Math.min(WORLD_AVAIL - 1, continueWorld(p) + REIS_VOORUIT);
}
// Ligt er nog meer voorbij wat er getekend staat? Alleen over uitgebrachte
// werelden: een wereld die nog niet uit is mag geen belofte doen.
function meerWereldenVooruit(p) { return laatsteZichtbareWereld(p) < WORLD_AVAIL - 1; }
/* De halte waar de ster staat. p.level is "de eerstvolgende show", en die loopt
   één voorbij het einde zodra alles uit is -- dan staat ze op de laatste halte
   die er wél is. Overal waar de kaart een ster neerzet of een halte goud maakt
   hoort dit getal, en niet p.level zelf. */
function hereLevel(p) { return Math.max(1, Math.min(p.level, WORLD_LAST)); }
/* Welke werelden dit kind al een keer in beeld heeft gehad. Het enige nieuwe dat
   er opgeslagen wórdt, en alleen omdat er geen andere manier is om één vraag te
   beantwoorden: is deze wereld nieuw vóór je? Bij het uitspelen van een wereld
   is dat nog uit de sprong af te leiden (zie runTravel), maar bij een wereld die
   maanden later wordt uitgebracht is er geen sprong -- het kind stond al stil.

   Op id en niet op nummer: een wereld hernoemen of er een tekening bij zetten mag
   nooit een onthulling opnieuw laten spelen, en een wereld met een ander id is
   een andere wereld. */
function worldSeen(p, i) {
  const w = WORLDS[i];
  return !!w && (p.worldsSeen || []).indexOf(w.id) >= 0;
}
function markWorldSeen(p, i) {
  const w = WORLDS[i];
  if (!w || worldSeen(p, i)) return;
  if (!p.worldsSeen) p.worldsSeen = [];
  p.worldsSeen.push(w.id);
  save();
}
/* ================= Wereldbeloningen (fase 4D.1) ============================
   Twee mijlpalen per wereld, en elk krijgt precies één ding:

     wereld uit        -> het spulletje uit WORLDS.beloning (de kleedkamer)
     perfecte wereld   -> de trofee 'perfect-<wereld>' (de kast)

   "Wereld uit" en "perfect" worden hier niet opnieuw uitgerekend: ze komen uit
   worldProgress(), dezelfde teller waar de kaart, de reis en de wereldbadge al op
   staan. Er komt dus geen tweede waarheid bij over wat af is.

   EN ER KOMT OOK GEEN VLAGGETJE BIJ dat zegt "deze beloning is al gegeven". Dat
   staat er namelijk al: het spulletje staat in p.owned en de trofee in p.trophies.
   Dát is het bewijs, en het is meteen het bewijs dat de kleedkamer en de kast
   toch al gebruiken. Een los 'beloond'-lijstje ernaast kan alleen maar uit de pas
   gaan lopen -- bijvoorbeeld als een back-up van vóór deze fase wordt teruggezet.

   Daardoor is uitdelen vanzelf één keer: heeft ze het al, dan gebeurt er niets.
   Een show overdoen, een wereld overdoen, de app opnieuw openen, een oude save --
   allemaal hetzelfde antwoord. */
// Het beloningsitem van een wereld, of null. Onbekend id = null: een wereld mag
// naar een spulletje wijzen dat (nog) niet bestaat zonder de app te breken.
function beloningItem(w) { return (w && w.beloning) ? (item(w.beloning) || null) : null; }
// Andersom: van welke wereld komt dit spulletje? Puur afgeleid uit WORLDS, zodat er
// geen tweede lijst is die bijgewerkt moet worden als er een wereld bijkomt.
// Geeft de wereld terug (niet de index): de kleedkamer wil de naam en het icoon.
function beloningWereld(itemId) { return WORLDS.filter(w => w.beloning === itemId)[0] || null; }
// Te koop of te verdienen? Alles wat een wereld uitdeelt staat níét in de winkel.
function isBeloning(itemId) { return !!beloningWereld(itemId); }
/* ---- De horizon: wat de kleedkamer en de kast vooruit laten zien -----------
   Dezelfde grens als de reis (laatsteZichtbareWereld): alles wat je hebt, plus
   een paar werelden vooruit, en daarboven één mistkaartje dat niet telt hoeveel
   er nog liggen. Bij elf werelden zag een kind in wereld twee tien vraagtekens in
   de kleedkamer en tien gedempte medaillons in de kast -- geen belofte meer maar
   een muur van wat ze níet heeft. De reis had die les al geleerd; nu Podia en de
   kast ook, en met hetzelfde getal, zodat de drie schermen dezelfde werelden
   laten zien.
   Wat al van jou is staat er altijd, waar het ook ligt -- de horizon verbergt
   alleen wat je nog niet hebt. */
function binnenHorizon(p, i) { return i <= laatsteZichtbareWereld(p); }
// Het mistkaartje achteraan een rij: geen getal, geen naam, alleen "er is meer".
function horizonMistHTML(tekst) {
  return `<span class="horizon-wolk" aria-hidden="true">☁️</span><div class="horizon-tekst">${tekst}</div>`;
}
/* ================= Podia =================
   Elke wereld heeft een podium, en het podium heeft drie stukken: de schat van
   die wereld (alleen te verdienen) en twee spulletjes uit de winkel (zie de
   stage-regels in ITEMS). Heb je ze alle drie, dan is het podium van jou en kun
   je erop gaan staan. Dat is de hele regel -- en het is de brug tussen spelen en
   sparen: de wereld geeft het stuk dat je niet kunt kopen, de diamanten doen de
   rest.

   VAN JOU IS AFGELEID, NIET BEWAARD. Net als de voortgang: er komt geen
   "podium verdiend" in de opslag, het staat elke keer opnieuw in p.owned. Wat wél
   bewaard wordt is waar ze op stáát (p.equipped.stage), en dat bestond al.
   Bezitten telt, dragen niet: wie het aapje weer uitdoet houdt haar podium.

   Twee uitzonderingen op "drie stukken", allebei omdat er al iets in p.owned
   staat: Disco (het podium van iedereen, waar je op terugvalt) en elk podium dat
   een kind vóór fase 1 nog gekocht heeft. Dat blijft van haar, ook zonder stukken
   -- er wordt nooit iets afgepakt. */
function podiumSchat(st) {
  const w = st && st.wereld ? WORLDS.find(x => x.id === st.wereld) : null;
  return w ? beloningItem(w) : null;
}
function podiumWereldIdx(st) { return st && st.wereld ? WORLDS.findIndex(w => w.id === st.wereld) : -1; }
// De drie stukken, schat voorop. Een onbekend id valt eruit (en test:inhoud zegt het).
function podiumStukken(st) {
  const schat = podiumSchat(st);
  return (schat ? [schat] : []).concat((st.stukken || []).map(item).filter(Boolean));
}
function podiumVanJou(p, st) {
  if (!st || st.cat !== 'stage') return false;
  const bezit = p.owned || [];
  if (st.id === 'stage_disco' || bezit.includes(st.id)) return true;
  const stukken = podiumStukken(st);
  return stukken.length === 3 && stukken.every(it => bezit.includes(it.id));
}
// Van jou, gewoon of als podium: de ene vraag die de kleedkamer per kaartje stelt.
function bezit(p, it) { return it.cat === 'stage' ? podiumVanJou(p, it) : (p.owned || []).includes(it.id); }
// Wat er nog ontbreekt, en wat dat samen kost. De schat heeft geen prijs.
function podiumRest(p, st) { return podiumStukken(st).filter(it => !(p.owned || []).includes(it.id)); }
function podiumPrijs(p, st) { return podiumRest(p, st).reduce((t, it) => t + (it.price || 0), 0); }
/* Het stuk dat als eerste aan de beurt is: wie een podium aantikt, krijgt dat stuk
   meteen gekozen in de balk, met één knop voor dat ene stuk. Geen keuze als de
   schat nog ontbreekt (dan is de knop 🗺️ Speel) of als het podium al van jou is. */
function volgendStuk(p, st) {
  if (!st || podiumVanJou(p, st) || podiumOpSlot(p, st)) return null;
  const s = podiumRest(p, st).find(x => tagStand(x, p) !== 'slot');
  return s ? s.id : null;
}
// Nog niet te halen met diamanten: de schat van de wereld ontbreekt.
function podiumOpSlot(p, st) {
  const schat = podiumSchat(st);
  return !!schat && !podiumVanJou(p, st) && !(p.owned || []).includes(schat.id);
}
/* Welke podia de lade laat zien: wat van jou is, plus de podia van de werelden
   tot de horizon -- dezelfde grens als de reis en de kast (binnenHorizon), zodat
   een kind in wereld twee geen rij van tien sloten ziet. Disco staat er niet
   tussen: dat is waar je op staat als je van een podium afstapt. Op de volgorde
   van de tournee; een oud gekocht podium zonder wereld komt achteraan. */
function zichtbarePodia(p) {
  const plek = st => { const i = podiumWereldIdx(st); return i < 0 ? 1e9 : i; };
  return ITEMS.filter(st => {
    if (st.cat !== 'stage' || st.id === 'stage_disco') return false;
    if (podiumVanJou(p, st)) return true;
    const i = podiumWereldIdx(st);
    return i >= 0 && worldAvailable(i) && !!podiumSchat(st) && binnenHorizon(p, i);
  }).sort((a, b) => plek(a) - plek(b));
}
// Liggen er voorbij de horizon nog wereldpodia? Dan komt er één mistkaartje achteraan.
function meerPodia(p) {
  return ITEMS.some(st => st.cat === 'stage' && worldAvailable(podiumWereldIdx(st))
    && !!podiumSchat(st) && !zichtbarePodia(p).includes(st));
}
// Bij welk podium hoort dit spulletje? (de schat óf een van de twee stukken)
function podiumVan(itemId) {
  return ITEMS.find(st => st.cat === 'stage' && podiumStukken(st).some(it => it.id === itemId)) || null;
}
/* Het podium zelf: één schijf, getekend uit zijn vier kleuren en één patroon (zie
   .podium in het stijlblad). Hetzelfde stukje opmaak op het kaartje, in de
   spiegel en -- straks -- onder haar voeten in de show. */
function podiumHTML(st) {
  const v = (st && st.vloer) || item('stage_disco').vloer;
  const patroon = (st && st.patroon) || 'parel';
  return `<div class="podium pod-${patroon}" style="--pt:${v[0]};--pm:${v[1]};--ps:${v[2]};--pr:${v[3]}" aria-hidden="true"></div>`;
}
/* ---- De prijs van een wereld ----------------------------------------------
   Een wereld deelde drie dingen uit, op drie plekken en onder drie namen: een
   hoed (de kleedkamer), een podium dat je met diamanten afmaakt (Podia) en een
   medaillon voor perfect (de kast). Voor een kind waren dat drie soorten prijs,
   en het wereldfeest zette ze alle drie onder elkaar.

   Nu is het één ding: HET PODIUM VAN DIE WERELD MET ZIJN SCHAT EROP, overal op
   dezelfde manier getekend. Het heeft vier standen, en ze lopen in de volgorde
   waarin een kind ze haalt:

     geheim   de schat als donker silhouet, het podium bleek   nog niets
     schat    de schat in kleur, het podium nog bleek          wereld uit
     af       het podium in kleur                              + de twee stukken
     goud     een gouden rand om het podium                    overal drie sterren

   Goud staat los van af: goud zegt hoe je speelde, kleur zegt wat je kocht. Een
   perfecte wereld waarvan de stukken nog niet gekocht zijn is dus een bleek
   podium met een gouden rand -- en dat klopt.

   Alles afgeleid, niets bewaard: de schat en de stukken staan in p.owned, perfect
   staat in p.stars. Dezelfde regel als de voortgang en de podia zelf. */
function wereldPodium(w) {
  return (w && ITEMS.find(st => st.cat === 'stage' && st.wereld === w.id)) || null;
}
// De standen als klassen: '' (geheim heeft er een), en af/goud komen erbij.
function wereldPrijsStand(p, i) {
  const w = WORLDS[i], st = wereldPodium(w), schat = beloningItem(w);
  const bezit = p.owned || [];
  /* Geheim tot de wereld uit is. Dat is hetzelfde moment waarop de schat in
     p.owned komt (grantWorldRewards), maar uit de sterren gelezen hoeft niemand
     te wachten tot die uitgedeeld is -- de kaart hertekent soms eerder. */
  const uit = worldAvailable(i) && worldProgress(p, worldForIndex(i)).uit;
  return {
    geheim: !schat || !(uit || bezit.includes(schat.id)),
    af: !!st && podiumVanJou(p, st),
    goud: worldAvailable(i) && worldProgress(p, worldForIndex(i)).vol,
  };
}
/* Het prijsje zelf: een podium (podiumHTML) met de miniatuur van de schat erop.
   Zonder podium of schat (een wereld die er nog geen heeft) is er geen prijs, en
   dan een lege string -- de plek die hem toont valt dan terug op wat er stond.
   maat = de breedte (een getal is pixels, een string mag ook cqw zijn); de rest schaalt mee (zie .wereldprijs). Een stand
   meegeven mag (de kast tekent een gewonnen trofee altijd in goud). */
function wereldPrijsHTML(p, i, maat, stand) {
  const w = WORLDS[i], st = wereldPodium(w), schat = beloningItem(w);
  if (!st || !schat) return '';
  const s = stand || wereldPrijsStand(p, i);
  const klas = 'wereldprijs' + (s.geheim ? ' geheim' : '') + (s.af ? ' af' : '') + (s.goud ? ' goud' : '');
  const beeld = schat.thumb ? schat.thumb(curBase()) : `<span class="thumb-emo">${schat.emoji || ''}</span>`;
  return `<span class="${klas}" style="--wp:${typeof maat === 'number' ? maat + 'px' : maat}" aria-hidden="true">${podiumHTML(st)}`
    + `<span class="wp-schat">${beeld}</span></span>`;
}
// De trofee-id van de perfecte wereld: op het wereld-id, dus een wereld hernoemen
// raakt een al behaalde trofee niet (alleen een gewijzigd id maakt een nieuwe).
const PERFECT_BADGE = 'perfect-';
/* Een trofee rechtstreeks toekennen, zonder de omweg langs 'klaar om te openen'.
   De gewone weg is checkTrophies -> readyTrophies -> het kind opent hem zelf in de
   kast, en die blijft voor álle andere trofeeën gelden. De perfecte wereld is de
   uitzondering, en met reden: die krijgt op het moment zelf zijn eigen onthulling
   (zie wereldFeest). Zou hij daarnáást ook nog als cadeautje in de kast liggen,
   dan is het twee keer dezelfde trofee -- één keer gevierd en één keer nog te
   openen. Geeft terug of er nu echt iets bijgekomen is. */
function awardTrophy(p, id) {
  if (!p.trophies) p.trophies = [];
  if (p.trophies.includes(id)) return false;
  p.readyTrophies = (p.readyTrophies || []).filter(x => x !== id);
  p.trophies.push(id);
  return true;
}
/* Wat deze wereld dit kind nú nog schuldig is. Deelt uit wat er te geven valt en
   zegt wat er bijgekomen is -- niet wat er al stond. Roep 'm gerust vaker aan:
   de tweede keer is hij leeg.

   Bewaart zelf niet. De aanroeper bepaalt wanneer er een save() volgt -- bij een
   show is dat de save() die er toch al staat, bij het inladen die van load(). */
function grantWorldRewards(p, i) {
  const uit = { spul: null, perfect: null };
  if (!worldAvailable(i)) return uit;
  if (!p.owned) p.owned = [];   // half-kapotte back-up: liever niets uitdelen dan omvallen
  const w = WORLDS[i];
  const v = worldProgress(p, worldForIndex(i));
  if (v.uit) {
    const it = beloningItem(w);
    if (it && !p.owned.includes(it.id)) { p.owned.push(it.id); uit.spul = it; }
  }
  if (v.vol) {
    const id = PERFECT_BADGE + w.id;
    if (awardTrophy(p, id)) uit.perfect = TROPHIES.find(t => t.id === id) || null;
  }
  return uit;
}
/* Alles wat dit kind al verdiend had voordat deze fase bestond. Draait bij het
   inladen (zie migrate) en is met opzet stil: wie vijf werelden uit heeft hoort
   vijf spulletjes in haar kleedkamer te vinden, en niet vijf feestjes op de rij
   af te moeten tikken voor ze weer mag spelen.

   Het is geen eenmalige migratie maar een vangnet dat elke keer draait, en dat is
   het hele idee: er is niets te migreren omdat er niets bijgehouden wordt. Gaat er
   ooit een feestje verloren (de app wordt tussen de show en de kaart door
   weggeklikt), dan staat het spulletje er de volgende ochtend alsnog. */
function grantHistoricRewards(p) {
  for (let i = 0; i < WORLD_AVAIL; i++) grantWorldRewards(p, i);
}

/* De perfecte werelden. Eén trofee per wereld, uit WORLDS opgebouwd: "overal drie
   sterren in deze wereld". Dit is de grootste prijs die het spel te geven heeft,
   en sinds fase 5C de enige wereldtrofee.

   Er hing hier tot fase 5C een tweede kaartje per wereld: de wereldbadge
   (wereld-<id>, "deze wereld uit"). Die is met pensioen omdat een uitgespeelde
   wereld al een eigen beloning heeft -- een echt spulletje voor de kleedkamer,
   uitgedeeld met een feestje (zie grantWorldRewards). Dezelfde mijlpaal twee keer
   belonen maakt geen van beide bijzonderder, en het zette bovendien twee keer
   dezelfde wereldnaam in de kast: een kind moest dan uitzoeken welke van de twee
   ze nu bedoelde. Nu is er per wereld één kaartje en één vraag. WERELD_BADGE
   blijft bestaan omdat behaalde badges nog in oude saves staan; isRetiredTrophy
   herkent ze aan dit voorvoegsel.

   Opnieuw opbouwen kan, want de studio mag werelden toevoegen of hernoemen.
   Behaalde trofeeën staan in p.trophies op id, dus een wereld hernoemen raakt een
   al behaalde trofee niet -- alleen een gewijzigd wereld-id maakt een nieuwe.

   De wereld zelf gaat als `wereld` mee op de trofee. De kast tekent de perfecte
   werelden als wereld-eigen medaillons (icoon + themakleuren, zie perfectCardHTML);
   zonder dit veld zou die kaart het wereld-id uit de trofee-id moeten terugpellen,
   en dan is er ineens een tweede plek die weet hoe zo'n id in elkaar zit.

   Alleen de uitgebrachte werelden (worldAvailable), en niet elke geschreven. Een
   wereld die al in WORLDS staat maar nog released:false is, hoort nergens te
   verklappen dat hij bestaat -- Podia en de reis doen dat al zo (zie
   zichtbarePodia, laatsteZichtbareWereld). Hier stond eerst WORLDS.forEach, en
   dan stond er zodra zo'n wereld naar main ging een "Zeewereld" in de kast van
   elk kind, en telde de kop "3 / 19" voor een kaartje dat niemand kan halen.
   Gaat hij uit, dan komt de kaart vanzelf mee: dit draait bij elk opstarten.
   Wie de vlag PROEF_ONUITGEBRACHT zet (de studio, Probeer) ziet hem wél -- die
   telt mee in WORLD_AVAIL, dus rebuildWorldBadges daarna opnieuw draaien. */
const WERELD_BADGE = 'wereld-';
function rebuildWorldBadges() {
  for (let i = TROPHIES.length - 1; i >= 0; i--) {
    const id = TROPHIES[i].id;
    if (id.indexOf(WERELD_BADGE) === 0 || id.indexOf(PERFECT_BADGE) === 0) TROPHIES.splice(i, 1);
  }
  const perfectIds = [];
  WORLDS.forEach((w, i) => {
    if (!worldAvailable(i)) return;
    const pid = PERFECT_BADGE + w.id;
    perfectIds.push(pid);
    TROPHIES.push({
      id: pid, emoji: w.icon || '🌍', name: w.name, desc: 'Overal drie sterren',
      wereld: w, index: i, perfect: true,   // index: voor de horizon (zie renderShelves)
      has: q => worldProgress(q, worldForIndex(i)).vol,
      ster: () => true,   // behaald = altijd de gouden rand: dát is wat perfect hier is
      progress: q => {
        const v = worldProgress(q, worldForIndex(i));
        return trophyProgress(v.perfect, v.levels, 'shows perfect');
      },
    });
  });
  const perfectPlank = TROPHY_SHELVES.filter(sh => sh.key === 'perfect')[0];
  if (perfectPlank) perfectPlank.ids = perfectIds;
}

/* De pedagogische klok stond hier: tourRound(), rondes van twaalf shows, los van
   de werelden. Hij is vervangen door de leerstap per wereld (zie "De leerstap"
   bij Vragen maken). Zoek-het-getal begint nog altijd op show 25 -- dat is show 1
   van wereld 4 -- dus wanneer een zesjarige voor het eerst "3 + ▢ = 7" ziet is
   niet veranderd. Drie getallen wél: die wachtten op ronde 5, en die begon bij
   show 49, één voorbij de laatste show. */

/* ================= Trofeeën =================
   FASE 5C -- de kast is uitgedund. Er stonden 42 trofeeën op acht planken, en dat
   was geen kast meer maar een lijst met alles wat het spel toevallig kon tellen:
   drie shows, vijf shows, tien shows, 12/30/60 sterren, 100 diamanten, 250
   diamanten, 10 spulletjes, 25 spulletjes, en per categorie nog een "koop ze
   allemaal". Wie zo'n lijst opent ziet werk liggen; wie een kast opent ziet wat
   ze gewonnen heeft.

   De regel die alles hier bepaalt: een trofee mag alleen bestaan als hij iets
   viert waar een kind trots op is. Een teller die vanzelf oploopt is dat niet.
   Concreet weggevallen (zie RETIRED_TROPHIES):
     - tussenstappen die niets toevoegen (3 shows, show 5, show 10, 250 sommen,
       3 perfecte shows, 25 keer applaus)
     - de zes "wereld uitgespeeld"-badges: een uitgespeelde wereld gééft al een
       spulletje en een feestje (zie grantWorldRewards). Twee keer dezelfde
       mijlpaal belonen maakt geen van beide bijzonderder. Perfect blijft.
     - de sterrentotalen 12/30/60: dat wás de ster-status-ladder (nu met pensioen),
       toen letterlijk dezelfde drempels met dezelfde namen. Een tweede kaartje
       ernaast voegt geen prestatie toe, alleen een tweede plek waar hetzelfde staat.
     - de twee diamantsaldo's: die leerden precies het verkeerde. Diamanten zijn
       er om uit te geven in de kleedkamer; een trofee voor "niet uitgegeven"
       straft het kind dat doet waar de munt voor is.
     - de vijf "alle kleren/schoenen/haarkleuren/instrumenten/dieren": die
       betekenen iets anders zodra er één item bijkomt, en ze waren in de
       praktijk een winkellijst. Er blijft één rustige verzamelmijlpaal over.
     - 'Kast vol!': zie RETIRED_TROPHIES.

   Wat blijft heeft een van deze vijf vormen: een eerste keer (die vergeet je
   nooit), een lange rekenweg (als medaille die meegroeit), iets nieuws dat je
   geleerd hebt, een perfecte wereld, of een rustige mijlpaal in de kleedkamer.
   Id's blijven ongewijzigd, dus wie een trofee al had houdt 'm.

   Over voortgang: `progress` is er alleen waar het getal zélf iets zegt
   ("82 / 100 sommen"). Trofeeën die één keer gebeuren (eerste show, eerste
   perfecte show) hebben er geen -- "0 / 1" is geen voortgang,
   dat is alleen de mededeling dat het nog niet gebeurd is. */
const TROPHIES = [
  // 🎤 Wat je meemaakt. In de kast staan ze in twee groepen, Eerste keer en Medailles (zie TROPHY_SHELVES)
  { id: 'first',      emoji: '🎫', name: 'Eerste optreden', desc: 'Je allereerste show',   has: p => playedCount(p) >= 1 },
  /* (Hier stond 'toegift', "Applaus!": de publieksmeter één keer vol. Met pensioen
     sinds oktober 2026 -- die meter loopt in bijna elke show vol, dus lag hij
     samen met Eerste optreden en Sterrenhit al na show 1 klaar: drie cadeautjes
     tegelijk, en dit was er geen prestatie. Het applaus zelf beloont al, met
     geluid en 5 💎. Zie RETIRED_TROPHIES.) */
  /* ⭐ Sterrenhit en 🌍 Wereldreiziger groeien mee (zie TROPHY_LADDERS), net als
     de rekenmedaille. Het waren losse trofeeën -- Sterrenhit (1 perfecte show),
     Platina plaat (10) en de Wereldtournee (alle werelden) -- en tussen de tiende
     perfecte show en de laatste wereld lag er maanden niets. Nu komt er onderweg
     elke paar werelden een metaal bij. perfect1, perfect10 en worldtour houden hun
     id, dus wie ze had, heeft nu brons, zilver of diamant. */
  { id: 'perfect1',   emoji: '⭐', name: 'Sterrenhit · Brons',   trap: 0, desc: 'Je eerste show met 3 sterren', has: p => perfectCount(p) >= 1, progress: p => trophyProgress(perfectCount(p), 1, 'perfecte shows') },
  { id: 'perfect10',  emoji: '⭐', name: 'Sterrenhit · Zilver',  trap: 1, desc: '10 shows met 3 sterren', has: p => perfectCount(p) >= 10, progress: p => trophyProgress(perfectCount(p), 10, 'perfecte shows') },
  { id: 'perfect25',  emoji: '⭐', name: 'Sterrenhit · Goud',    trap: 2, desc: '25 shows met 3 sterren', has: p => perfectCount(p) >= 25, progress: p => trophyProgress(perfectCount(p), 25, 'perfecte shows') },
  { id: 'perfect50',  emoji: '⭐', name: 'Sterrenhit · Diamant', trap: 3, desc: '50 shows met 3 sterren', has: p => perfectCount(p) >= 50, progress: p => trophyProgress(perfectCount(p), 50, 'perfecte shows') },
  /* De eerste drie trappen van de Wereldreiziger. Met min(): zijn er ooit minder
     werelden uitgebracht dan de drempel, dan ligt de trap op "allemaal" en is hij
     toch te halen. */
  { id: 'worlds3', emoji: '🌍', name: 'Wereldreiziger · Brons',  trap: 0, desc: '3 werelden uitgespeeld', has: p => doneWorldCount(p) >= Math.min(3, WORLD_AVAIL), progress: p => trophyProgress(doneWorldCount(p), Math.min(3, WORLD_AVAIL), 'werelden uit') },
  { id: 'worlds6', emoji: '🌍', name: 'Wereldreiziger · Zilver', trap: 1, desc: '6 werelden uitgespeeld', has: p => doneWorldCount(p) >= Math.min(6, WORLD_AVAIL), progress: p => trophyProgress(doneWorldCount(p), Math.min(6, WORLD_AVAIL), 'werelden uit') },
  { id: 'worlds9', emoji: '🌍', name: 'Wereldreiziger · Goud',   trap: 2, desc: '9 werelden uitgespeeld', has: p => doneWorldCount(p) >= Math.min(9, WORLD_AVAIL), progress: p => trophyProgress(doneWorldCount(p), Math.min(9, WORLD_AVAIL), 'werelden uit') },
  /* Was "alle 12 steden", daarna "elke geschreven wereld uitgespeeld", en nu
     elke uitgebrachte. De enige trofee die weer onwaar kan worden: komt er een
     wereld bij, dan is de tournee niet meer uit. Wat er dan gebeurt:
       - al geopend (p.trophies): blijft van haar. Een trofee wordt nooit
         ingetrokken -- ze wás de hele tournee rond, en dat blijft waar.
       - nog niet geopend (readyTrophies): gaat terug in de kast als "bezig", en
         ligt weer klaar zodra de nieuwe wereld ook uit is. Anders biedt de kast
         een kind "Alle werelden uitgespeeld — Open!" aan terwijl er net een
         wereld bij kwam die ze nog nooit gezien heeft. Zie het einde van migrate();
         telWerelden is de vlag die zegt dat deze trofee daaronder valt. */
  { id: 'worldtour',  emoji: '🌍', name: 'Wereldreiziger · Diamant', trap: 3, desc: 'Alle werelden uitgespeeld', telWerelden: true, has: p => allWorldsDone(p), progress: p => trophyProgress(doneWorldCount(p), WORLD_AVAIL, 'werelden uit') },
  /* 🧮 Rekenkracht — twee medailles die meegroeien (zie TROPHY_LADDERS). Elke trap
     is nog altijd een eigen trofee met een eigen id, een eigen 🎁 en een eigen
     plek in p.trophies: wie "Rekenritme" al had, heeft nu de bronzen
     rekenmedaille, zonder dat er in de save iets verandert. Alleen de kast
     tekent ze als één kaartje (zie ladderCard). `trap` is de plek op de ladder:
     0 brons, 1 zilver, 2 goud, 3 diamant. stats.correct telt elk goed antwoord. */
  { id: 'sums25',   emoji: '🧮', name: 'Rekenmedaille · Brons',   trap: 0, desc: '25 sommen goed',   has: p => p.stats.correct >= 25, progress: p => trophyProgress(p.stats.correct, 25, 'sommen goed') },
  { id: 'sums100',  emoji: '🧮', name: 'Rekenmedaille · Zilver',  trap: 1, desc: '100 sommen goed',  has: p => p.stats.correct >= 100, progress: p => trophyProgress(p.stats.correct, 100, 'sommen goed') },
  { id: 'sums500',  emoji: '🧮', name: 'Rekenmedaille · Goud',    trap: 2, desc: '500 sommen goed',  has: p => p.stats.correct >= 500, progress: p => trophyProgress(p.stats.correct, 500, 'sommen goed') },
  { id: 'sums1000', emoji: '🧮', name: 'Rekenmedaille · Diamant', trap: 3, desc: '1000 sommen goed', has: p => p.stats.correct >= 1000, progress: p => trophyProgress(p.stats.correct, 1000, 'sommen goed') },
  { id: 'gold5',    emoji: '🌟', name: 'Goudzoeker · Brons',  trap: 0, desc: '5 gouden vragen',  has: p => p.goldHits >= 5, progress: p => trophyProgress(p.goldHits, 5, 'gouden vragen goed') },
  { id: 'gold20',   emoji: '🌟', name: 'Goudzoeker · Zilver', trap: 1, desc: '20 gouden vragen', has: p => p.goldHits >= 20, progress: p => trophyProgress(p.goldHits, 20, 'gouden vragen goed') },
  // Nieuw in oktober 2026: de derde trap, zodat ook deze medaille tot goud groeit.
  // Een gouden vraag staat in ongeveer de helft van de shows; 50 is rond wereld 11.
  { id: 'gold50',   emoji: '🌟', name: 'Goudzoeker · Goud',   trap: 2, desc: '50 gouden vragen', has: p => p.goldHits >= 50, progress: p => trophyProgress(p.goldHits, 50, 'gouden vragen goed') },
  // en de vierde, zodat elke medaille die meegroeit vier trappen heeft en diamant overal de top is
  { id: 'gold100',  emoji: '🌟', name: 'Goudzoeker · Diamant', trap: 3, desc: '100 gouden vragen', has: p => p.goldHits >= 100, progress: p => trophyProgress(p.goldHits, 100, 'gouden vragen goed') },
  /* 💡 Nieuwe sommen — wat ze leert, gevierd. Elke wereld leert iets nieuws (zie
     "De leerstap"), en dát is de echte vooruitgang in het spel: over het tiental
     in wereld 3, zoek het getal in wereld 4, drie getallen in wereld 5. Tien
     keer goed is genoeg om te zeggen "dit kan je nu". De tellers staan in p.leer
     (zie telLeer) en tellen elk goed antwoord, ook na een hint.

     `voor` zegt of de trofee voor dit kind te halen ís met wat de ouder
     instelde: tot 10 gaat er niets over het tiental, en wie zoek-het-getal of
     drie getallen uitzette, krijgt die nooit. Een trofee die niet te halen is
     staat er niet (zie renderShelves) -- tenzij ze hem al heeft. In de telmodus
     staan er de twee grote stappen van het tellen in plaats van de sommen. */
  { id: 'leer-brug',   emoji: '🌉', name: 'Over de brug',   desc: '10 sommen over de tien goed',
    voor: p => !telModus(p) && p.settings.max > 10 && p.settings.ops.some(o => o === '+' || o === '-'),
    has: p => leerTel(p, 'brug') >= 10, progress: p => trophyProgress(leerTel(p, 'brug'), 10, 'sommen over de tien') },
  { id: 'leer-zoek',   emoji: '🔍', name: 'Speurneus',      desc: '10 keer het getal gevonden',
    voor: p => !telModus(p) && p.settings.missNum !== false && p.settings.ops.some(o => o === '+' || o === '-' || o === 'x'),
    has: p => leerTel(p, 'zoek') >= 10, progress: p => trophyProgress(leerTel(p, 'zoek'), 10, 'zoeksommen') },
  { id: 'leer-drie',   emoji: '🧩', name: 'Drie op een rij', desc: '10 sommen met drie getallen goed',
    voor: p => !telModus(p) && p.settings.chain3 !== false && p.settings.ops.includes('+'),
    has: p => leerTel(p, 'drie') >= 10, progress: p => trophyProgress(leerTel(p, 'drie'), 10, 'sommen met drie getallen') },
  // de telmodus: fase 6 is waar de cijfers komen, fase 9 de eerste sommen (zie countStageInfo)
  { id: 'leer-cijfers', emoji: '🔢', name: 'Cijferkenner',  desc: 'Je telt met cijfers',
    voor: p => telModus(p) && countMaxStage(p.settings) >= 6,
    has: p => telModus(p) && telFase(p) >= 6 },
  { id: 'leer-telsom', emoji: '➕', name: 'Eerste sommen',  desc: 'Je maakt je eerste sommen',
    voor: p => telModus(p) && countMaxStage(p.settings) >= 9,
    has: p => telModus(p) && telFase(p) >= 9 },
  /* 👕 Kleedkamer — de trofeeën die je ergens anders in de app verdient; `naar`
     is de lade die de knop in de balk opent (zie kastBalk). De plank heette
     Sterrenleven, en dat zei niet wat erop stond. */
  /* Verzamelaar groeit mee (zie TROPHY_LADDERS): 10, 25, 50, 100 spulletjes. Hij
     hield op bij 10 terwijl de winkel er ruim honderd heeft. shopper houdt zijn
     id en voorwaarde, dus wie hem al had heeft nu brons. boughtCount telt
     startspullen en wereldbeloningen niet mee. */
  { id: 'shopper',    emoji: '🛍️', name: 'Verzamelaar · Brons',   trap: 0, desc: '10 spulletjes gekocht',  naar: 'dress',
    has: p => boughtCount(p) >= 10, progress: p => trophyProgress(boughtCount(p), 10, 'spulletjes gekocht') },
  { id: 'shop25',     emoji: '🛍️', name: 'Verzamelaar · Zilver',  trap: 1, desc: '25 spulletjes gekocht',  naar: 'dress',
    has: p => boughtCount(p) >= 25, progress: p => trophyProgress(boughtCount(p), 25, 'spulletjes gekocht') },
  { id: 'shop50',     emoji: '🛍️', name: 'Verzamelaar · Goud',    trap: 2, desc: '50 spulletjes gekocht',  naar: 'dress',
    has: p => boughtCount(p) >= 50, progress: p => trophyProgress(boughtCount(p), 50, 'spulletjes gekocht') },
  { id: 'shop100',    emoji: '🛍️', name: 'Verzamelaar · Diamant', trap: 3, desc: '100 spulletjes gekocht', naar: 'dress',
    has: p => boughtCount(p) >= 100, progress: p => trophyProgress(boughtCount(p), 100, 'spulletjes gekocht') },
  // Je eerste eigen podium: alle drie de stukken van een podium van jou (het
  // Parelpodium waar iedereen op begint telt niet). Zie podiumVanJou.
  { id: 'eigenpodium', emoji: '🎪', name: 'Eigen podium', desc: 'Je eerste eigen podium', naar: 'stage',
    has: p => ITEMS.some(it => it.cat === 'stage' && it.id !== 'stage_disco' && podiumVanJou(p, it)) },
  // 🥇 Perfecte werelden — één per wereld, aangelegd door rebuildWorldBadges()
];
/* De medailles die meegroeien: per ladder de trappen van laag naar hoog, en de
   naam en het icoon van het kaartje dat ze samen zijn. Een ladder hangt op één
   plank, en zijn id's staan daar ook gewoon in `ids` (dus "elke trofee hangt
   ergens" blijft waar); renderShelves tekent ze als één kaartje.

   Waarom. Rekenkracht was zes tellers naast elkaar -- 25, 100, 500, 1000 sommen
   en 5, 20 gouden vragen -- en zo las de plank als een lijst getallen. "Mijn
   medaille is goud geworden" zegt meer dan "ik heb kaartje 3 van 4". */
const TRAP_NAMEN = ['Brons', 'Zilver', 'Goud', 'Diamant'];
/* Elke ladder heeft vier trappen, brons tot diamant: zo betekent diamant overal
   "de top", en zie je aan het metaal alleen al hoe ver je bent (de stipjes eronder
   zijn weg). `naar`: zie kastBalk. */
const TROPHY_LADDERS = [
  { key: 'hit',   emoji: '⭐', name: 'Sterrenhit',     ids: ['perfect1', 'perfect10', 'perfect25', 'perfect50'] },
  { key: 'reis',  emoji: '🌍', name: 'Wereldreiziger', ids: ['worlds3', 'worlds6', 'worlds9', 'worldtour'] },
  { key: 'reken', emoji: '🧮', name: 'Rekenmedaille',  ids: ['sums25', 'sums100', 'sums500', 'sums1000'] },
  { key: 'goud',  emoji: '🌟', name: 'Goudzoeker',     ids: ['gold5', 'gold20', 'gold50', 'gold100'] },
  { key: 'kast',  emoji: '🛍️', name: 'Verzamelaar',    ids: ['shopper', 'shop25', 'shop50', 'shop100'], naar: 'dress' },
];
/* De kast heeft vier groepen, en niet meer. Elke groep is één soort prestatie, zodat
   een kind aan de kop al ziet waar ze naar kijkt -- en zodat er geen groep is die
   bestaat omdat er nog trofeeën over waren.

   Oktober 2026: van vijf naar vier. Sinds Sterrenhit, Wereldreiziger en
   Verzamelaar meegroeien stonden er medailles die meegroeien op drie planken, en
   Rekenkracht en Kleedkamer hielden er elk twee over: halflege groepen. Nu staan
   alle vijf medailles samen (één rij metaal, één manier van lezen), en de twee
   eerste keren -- je eerste show, je eerste eigen podium -- samen eronder.

   De volgorde: eerst wat je verzamelt en meemaakt, dan wat je leert, en
   onderaan de grote prijzen. */
/* `ico` staat los van `name` sinds de kopregel van een groep uit drie cellen
   bestaat (icoon | naam + regeltje | stand). Stond het emoji nog vóór de naam in
   dezelfde string, dan zou het meeschuiven met de tekst en niet op één lijn staan
   met de iconen van de andere groepen -- en dat is nu juist wat de kolom rustig
   maakt. Een groep erbij heeft dus één veld meer, en verder niets. */
const TROPHY_SHELVES = [
  { key: 'medailles', ico: '🎖️', name: 'Medailles',      note: 'Medailles die meegroeien: brons, zilver, goud, diamant',
    ids: ['perfect1', 'perfect10', 'perfect25', 'perfect50', 'worlds3', 'worlds6', 'worlds9', 'worldtour',
          'sums25', 'sums100', 'sums500', 'sums1000', 'gold5', 'gold20', 'gold50', 'gold100',
          'shopper', 'shop25', 'shop50', 'shop100'] },
  { key: 'eerst',    ico: '🎤', name: 'Eerste keer',       note: 'De momenten die je je blijft herinneren',
    ids: ['first', 'eigenpodium'] },
  { key: 'leren',    ico: '💡', name: 'Nieuwe sommen',     note: 'Wat je nieuw geleerd hebt',
    ids: ['leer-brug', 'leer-zoek', 'leer-drie', 'leer-cijfers', 'leer-telsom'] },
  /* De grote prijzen. De lijst wordt gevuld door rebuildWorldBadges() -- de werelden
     staan in WORLDS en kunnen in de studio veranderen, dus hier hardcoderen zou
     meteen uit de pas lopen. De `key` is waar die functie deze plank aan herkent. */
  { key: 'perfect',  ico: '🥇', name: 'Perfecte werelden', note: 'Overal drie sterren: de grootste prijs van het spel',
    ids: [] },
];
/* Trofeeën met pensioen.
   Een kind dat zo'n trofee ooit behaald heeft, heeft die id nog in p.trophies
   staan. Die lijst blijft onaangeroerd (geen migratie, geen verlies); deze set
   zorgt alleen dat zo'n id niet meetelt in de kastteller, niet getekend wordt en
   niet als "klaar" blijft liggen. Zolang er saves in omloop zijn blijft deze
   lijst staan -- ook al staat er geen enkele definitie meer tegenover.

   Er is bewust géén opruimstap bij het inladen. Een id dat hier staat kost niets
   in een save, en een save die door een oudere versie van de app is gemaakt of
   teruggezet komt er zonder kleerscheuren doorheen. Wie een gepensioneerde trofee
   ooit behaald heeft raakt hem dus niet kwijt; hij is alleen niet meer te zien. */
const RETIRED_TROPHIES = new Set([
  // fase 1/2 -- looks en podia zijn uit het spel
  'podiumbouwer',
  'magicus', 'thuismatch', 'rockster', 'discodiva', 'prinses', 'ruimteheld',
  'winter', 'jungle', 'zeemeermin', 'regenboogster', 'diamantster', 'festivaldj', 'vuurshow',
  // fase 4D.1 -- opgegaan in de perfecte-wereldtrofee van wereld 1 ('perfect-muziek')
  'perfecttour',
  /* fase 5C -- de grote opschoning. Per regel: waarom weg.
     tussenstappen zonder eigen betekenis */
  'rookie3', 'city5', 'city10', 'sums250', 'perfect3', 'toegift25',
  // de sterrentotalen: dat is de ster-status-ladder, niet een tweede prijzenkast
  'stars15', 'stars30', 'rankstad',
  // diamantsaldo: beloonde het niet-uitgeven van de munt waar de kleedkamer op draait
  'rich', 'diamond250',
  // de lange winkelgrind; 'shopper' (10 spulletjes) blijft als enige koop-mijlpaal
  'collector',
  // oktober 2026 -- "Applaus!": de publieksmeter loopt in bijna elke show vol (zie TROPHIES)
  'toegift',
  // "koop alles uit deze categorie": betekent iets anders zodra er één item bijkomt
  'modekoningin', 'schoenenkast', 'haarstylist', 'orkest', 'dierenkoning',
  /* 'Kast vol!' -- alle andere trofeeën. Dat was geen voorwaarde maar een
     rekensom over de kast zelf: elke trofee die erbij kwam maakte hem zwaarder,
     elke trofee die met pensioen ging lichter, en hij moest de laatste in de
     tabel zijn omdat checkTrophies op volgorde toekent. Een prijs waarvan de
     prijsvraag verandert als je er een kaartje naast hangt is geen prijs.
     De zes perfecte werelden zijn nu het einddoel, en die vraag staat vast. */
  'kastvol',
]);
/* De zes "wereld uitgespeeld"-badges staan niet als losse id's hierboven: ze
   heten wereld-<wereldid> en er kan er altijd een bijkomen (de studio schrijft
   WORLDS). Op het voorvoegsel is daarom de enige stand die niet verloopt --
   een zevende wereld hoeft niet aan een lijstje toegevoegd te worden om níet
   terug te komen in de kast. */
function isRetiredTrophy(id) { return RETIRED_TROPHIES.has(id) || String(id).indexOf(WERELD_BADGE) === 0; }
// De zichtbare kast: alles behalve de gepensioneerde. Bewust een functie en geen
// vaste lijst -- rebuildWorldBadges() verandert TROPHIES nog nadat dit bestand is
// ingelezen (en de wereldstudio kan dat later nog eens doen).
function activeTrophies() { return TROPHIES.filter(t => !isRetiredTrophy(t.id)); }
// Hoeveel van de zichtbare kast dit kind al heeft. Gepensioneerde id's in p.trophies
// tellen niet mee -- dat is precies wat "met pensioen" betekent.
function earnedActiveCount(p) { return p.trophies.filter(id => !isRetiredTrophy(id)).length; }
rebuildWorldBadges();   // de perfecte werelden erbij, nu de tabel en de planken er staan
/* De sterren van de oude oneindige staart (zie migrate). Ze horen bij geen enkele
   wereld meer -- hun levelnummers zijn teruggegeven aan de werelden die daar ooit
   komen -- maar ze zijn wél verdiend, dus ze blijven meetellen in alles wat over
   de héle carrière gaat: het sterrentotaal en de shows-trofeeën. Voor een
   kind dat nooit zo ver kwam is dit een leeg kaartje en verandert er niets. */
function tourStarValues(p) { return Object.values(p.tourStars || {}); }
function allStarValues(p) { return Object.values(p.stars).concat(tourStarValues(p)); }
function playedCount(p) { return Object.keys(p.stars).length + tourStarValues(p).length; }
function perfectCount(p) { return allStarValues(p).filter(s => s === 3).length; }
// Number(): een save van een ander toestel (Overzetten) is alleen op zijn vorm
// gekeurd, niet op elke waarde -- een ster als tekst telt mee, maar plakt niet.
function totalStarCount(p) { return allStarValues(p).reduce((a, b) => a + (Number(b) || 0), 0); }
// Hoeveel beschikbare werelden dit kind echt uitgespeeld heeft (voor de teller op
// de Wereldtournee-trofee, en straks voor de wereldladder).
function doneWorldCount(p) { let n = 0; for (let i = 0; i < WORLD_AVAIL; i++) if (worldDone(p, i)) n++; return n; }
// Gratis startspullen tellen niet als "gekocht" -- en sinds fase 4D.1 de spulletjes
// die een wereld uitdeelt ook niet: die zijn verdiend, niet gekocht, en zouden de
// shop-trofeeën anders zes stuks cadeau doen.
function boughtCount(p) {
  return Math.max(0, p.owned.filter(id => !isBeloning(id)).length - (p.freebies || 5));
}
/* Voor de plank Nieuwe sommen. p.leer telt per nieuwe soort som hoe vaak hij
   goed was: brug (over het tiental, 8 + 5), zoek (3 + ▢ = 7) en drie
   (3 + 4 + 2). Er werd al bijgehouden hoe vaak zoek-het-getal en drie getallen
   gezien werden (opTrack, chainTrack), maar niet hoe vaak ze goed waren, en
   over het tiental helemaal niet. Een oude save heeft het veld niet en begint
   op nul: wat ze vóór oktober 2026 goed deed telt niet mee, maar tien keer
   is zo weer gehaald. */
function leerTel(p, soort) { return (p.leer && p.leer[soort]) || 0; }
function telLeer(p, q) {
  if (!p.leer) p.leer = { brug: 0, zoek: 0, drie: 0 };
  const soort = q.kind === 'missing' ? 'zoek' : q.kind === 'chain' ? 'drie' : q.brug ? 'brug' : null;
  if (soort) p.leer[soort] = (p.leer[soort] || 0) + 1;
}
function telModus(p) { return !!p.settings && p.settings.track === 'count'; }
// De fase waar de telmodus nu staat (zie countTrack; klimt mee met wat ze kan).
function telFase(p) { return (p.countTrack && p.countTrack.stage) || 1; }

/* ================= Sterrencarrière ================= */
/* MET PENSIOEN (oktober 2026). Hier stond een ster-status: acht rangen op het
   sterrentotaal (Straatartiest ... Wereldlegende), elk met een diamantbonus, een
   feestje na de show en een ladder om open te tikken. Hij is weg omdat hij een
   derde voortgangsmeter was naast de kaart en de trofeeënkast, en een die met
   elke nieuwe wereld opnieuw uitgerekt moest worden: de vaste rangen stopten op
   125 sterren, rond wereld zeven, en daarna kwam er vier werelden lang niets.
   De bonussen waren samen 225 💎 over de hele tournee, zo'n 5% van wat een kind
   verdient -- dat mist niemand (zie docs/DIAMANTEN.md).

   Oude saves dragen nog rankSeen en rangVersie; migrate() haalt ze eruit. */
function trophyProgress(value, target, label) {
  const now = Math.max(0, Math.min(value, target));
  return { now, target, label, pct: Math.round((now / target) * 100) };
}
// Kent nieuwe trofeeën toe; geeft de namen van nieuw behaalde terug.
// Legt trofeeën die de voorwaarde net halen 'klaar' (readyTrophies) zodat het
// kind ze zelf mag openen. Behaalde (geclaimde) blijven staan. Geeft de trofeeën
// terug die nét klaar zijn komen te liggen.
function checkTrophies(p) {
  if (!p.readyTrophies) p.readyTrophies = [];
  const nieuw = [];
  for (const t of TROPHIES) {
    if (isRetiredTrophy(t.id)) continue;   // uit het zicht = ook niet meer klaarleggen
    if (!p.trophies.includes(t.id) && !p.readyTrophies.includes(t.id) && t.has(p)) {
      p.readyTrophies.push(t.id);
      nieuw.push(t);
    }
  }
  return nieuw;
}

/* ================= Opslag ================= */
const LS_KEY = 'rekenPopsterren_v1';
// De telmodus-voorinstelling: lees-vrij, met een kortere ronde (5 vragen) die bij
// kleuters beter past. Dit is wat een ster krijgt die bij het maken "Leren tellen"
// kiest; anders start ze gewoon in de rekenmodus.
const COUNT_STAGE_MAX = 12;  // 12 fases: tellen → vergelijken → cijfers → redeneren → gesteunde sommen (tekens → cijfers+stippen → geschreven) → tot 20
const DEFAULT_PERLEVEL = 8;  // vragen per optreden in de rekenmodus (de telmodus heeft er 5, zie COUNT_OPTS)
const COUNT_OPTS = { track: 'count', stage: 1, stageMax: COUNT_STAGE_MAX, repr: 'objects', numerals: true, perLevel: 5, qmax: 10 };
// Wie je bent kies je bij het maken; wat je wordt koop je in de kleedkamer.
// Vandaar alleen de gewone kleuren hier -- de fantasiekleuren en de patronen
// blijven iets om naartoe te sparen.
const START_HAIR  = ['hair_blond', 'hair_bruin', 'hair_zwart', 'hair_wit', 'hair_rood'];
const START_DRESS = ['dress_roze', 'dress_paars', 'dress_geel', 'dress_blauw', 'dress_groen'];
const MAX_PROFILES = 6;
function defaultProfile(name, dress, opts) {
  opts = opts || {};
  // Gratis starthaar en -kleren zodat elke ster er meteen anders uitziet, zonder de
  // winkelprijs van die items te veranderen. freebies telt ze mee, dus
  // "spulletjes gekocht" begint gewoon op 0.
  /* Alle startkleuren uit het maakformulier horen erbij. Hier stonden alleen de
     standaardstukken plus wat er gekozen was, en dan verkocht de kleedkamer
     daarna voor 15 tot 24 diamanten wat op het formulier nog gratis te kiezen
     viel. Dit geldt alleen voor een nieuwe ster: een bestaande opslag wordt
     niet aangevuld (en zijn freebies blijven kloppen). */
  const hair = opts.hair || 'hair_blond';
  const owned = START_HAIR.concat(START_DRESS, ['shoes_roze', 'stage_disco']);
  if (dress && !owned.includes(dress)) owned.push(dress);
  if (hair && !owned.includes(hair)) owned.push(hair);
  return {
    name: name,
    // Welke basisfiguur getekend wordt (zie BASES). Gaat via opts en niet als
    // extra positie-argument: defaultProfile(name, kleren, opts) is de vorm waar
    // de drie testsuites op staan.
    base: BASES[opts.base] ? opts.base : DEFAULT_BASE,
    diamonds: 30,
    level: 1,
    stars: {},
    owned: owned,
    freebies: owned.length,   // aantal gratis startspullen (5, of 6 met bonusoutfit) — basis voor "gekocht"
    equipped: { hair: hair, dress: dress, shoes: 'shoes_roze', mic: null, instrument: null, acc: null, pet: null, stage: 'stage_disco' },
    // Wie ze is, los van wat ze nu toevallig draagt -- zodat "opnieuw beginnen"
    // haar teruggeeft zoals ze gemaakt is en niet als een blonde vreemde.
    // Bewust NIET bijgevuld in migrate(): bestaande profielen houden zo exact hun
    // oude gedrag via de || -ketens hieronder.
    startHair: hair, startDress: dress,
    // ---- Instellingen ----
    // track: 'math' = de gewone rekenshow · 'count' = de lees-vrije telmodus voor
    // kleuters (gesproken opdrachten, hoeveelheden i.p.v. cijfers). De telmodus
    // heeft eigen velden (stage-bereik, weergave, cijfers-aan/uit, kortere ronde).
    // opts mag élke instelling meegeven: dat is wat een wis-actie moet kunnen
    // bewaren (zie set-reset). De fallbacks zijn exact de oude vaste waarden.
    // .slice() op de lijstjes: anders deelt het verse profiel zijn array met het
    // profiel dat we net weggooien, en werken ze elkaar later bij.
    settings: {
      ops: opts.ops ? opts.ops.slice() : ['+', '-'],
      max: opts.max || 20,
      tables: opts.tables ? opts.tables.slice() : [2, 5, 10],
      mode: opts.mode || 'kies',
      perLevel: opts.perLevel || DEFAULT_PERLEVEL,
      missNum: opts.missNum !== false,
      chain3: opts.chain3 !== false,
      track: opts.track || 'math',
      stage: opts.stage || 1,                       // laagste (start)fase in de telmodus
      stageMax: opts.stageMax || COUNT_STAGE_MAX,   // hoogste toegestane fase
      fasesBekend: COUNT_STAGE_MAX,                 // hoeveel fases er waren toen stageMax gekozen werd (zie migrate)
      repr: opts.repr || 'objects',                 // antwoordweergave: 'objects' of 'dots'
      numerals: opts.numerals !== false,            // fase 6 (cijfers) toestaan
      qmax: opts.qmax || 10,                         // hoogste hoeveelheid waar het spel naartoe mag groeien (6/8/10)
      memory: opts.memory !== false,                // memory-spelletje op de kaart (standaard aan)
      padVanaf: opts.padVanaf || null,              // rekenmodus: de rij van het leerpad waar het spel minstens begint (zie padNu)
      padTot: null,                                 // en de rij waar de lijn "tot" onder staat; null = het eind van het blok (zie padRijen)
      tafelLijn: { ...opts.tafelLijn },             // de lijnen "vanaf" en "tot" op de tafelladder (zie TAFELPAD)
      geldLijn: { ...opts.geldLijn },
      klokLijn: { ...opts.klokLijn },               // en op de klokladder (zie KLOKPAD)               // hetzelfde op de geldladder (zie GELDPAD); geld zelf staat uit tot s.themas het noemt
      kalLijn: { ...opts.kalLijn },                 // en op de kalenderladder (zie KALENDERPAD)
      lijnLijn: { ...opts.lijnLijn },               // en op de getallenlijn (zie LIJNPAD)
      // de thema's zonder bewerkingen (zie THEMAS) en wat er bij Zelf kiezen aanstaat; alleen als ze er zijn
      ...(opts.themas ? { themas: opts.themas.slice() } : {}),
      ...(opts.kiesGeld ? { kiesGeld: opts.kiesGeld.slice() } : {}),
      ...(opts.kiesKlok ? { kiesKlok: opts.kiesKlok.slice() } : {}),
      ...(opts.kiesKalender ? { kiesKalender: opts.kiesKalender.slice() } : {}),
      ...(opts.kiesLijn ? { kiesLijn: opts.kiesLijn.slice() } : {}),
    },
    trophies: [], readyTrophies: [], goldHits: 0, encores: 0,
    // FASE 4A. tourStars blijft bij een verse ster voorgoed leeg -- het is de
    // bewaarplek voor sterren uit de oude oneindige staart (zie migrate).
    // worldsSeen vult zich vanzelf: de kaart zet er elke wereld in die ze opent.
    tourStars: {}, worldsSeen: [],
    perf: 0.5,  // lopende inschatting van vaardigheid (0..1), stuurt de moeilijkheid bij
    weak: {},   // zwakke sommen: "7 × 8 = @" -> { ans, op, w } om gericht te herhalen
    learned: {},// geoefende sommen in onderhoud: "7 × 8 = @" -> { ans, op, iv, due }
    // per-bewerking-beheersing (klaarheid extra uitdagingen) + frequentie-trappen
    opTrack: {},                                    // op -> { n, acc, paused, unlockStap }
    missRamp: { rung: 1, hot: 0 },                  // zoek-het-getal: 1 of 2 per optreden
    chainTrack: { seen: 0, acc: 0.5, paused: false, rung: 1, hot: 0 },  // drie getallen
    // telmodus: welke fase het kind nú speelt (klimt mee met de beheersing, binnen
    // het door de ouder toegestane bereik) + een lopende nauwkeurigheid voor die klim
    // rung = moeilijkheidstrap bínnen de fase (past bereik, afleiders, cijfersteun aan);
    // streak = juiste-op-rij in de show (stuurt de rung omhoog), reset bij een misser
    countTrack: { stage: opts.stage || 1, rung: 0, streak: 0, seen: 0, acc: 0.5 },
    stats: { correct: 0, wrong: 0 },  // voor het ouder-overzicht
    leer: { brug: 0, zoek: 0, drie: 0 },  // nieuwe soorten sommen goed, voor de kast (zie telLeer)
    recent: [],                       // de laatste shows: sterren, of 0 als hij mislukte (zie onthoudUitkomst)
    pad: null,                        // rekenmodus: waar ze op het leerpad staat (zie padNu, padNa)
    gezien: {}                        // welke groei het kind al gevierd heeft (zie groeiMoment)
  };
}
// Zorgt dat oudere opgeslagen profielen de nieuwe velden krijgen.
/* DE VORM VAN DE INSTELLINGEN, en van wat het spel eruit oefent. De app zelf
   schrijft dit nooit fout: het ouderdeel laat het laatste thema niet uit en
   kent alleen zijn eigen knoppen. Maar een back-upbestand of een overgezette
   save is tekst die onderweg met de hand bewerkt of half beschadigd kan zijn,
   en backupVormOk kijkt alleen of de grote stukken er zijn. Wat hier misliep
   was geen foutmelding maar een bevroren app: zonder één thema dat aan staat
   (s.ops leeg of onbekend, en geen s.themas) draaide themaPlan eindeloos rond
   bij de eerste tik op een halte, met s.max als tekst kwamen er "NaN + NaN"-
   sommen, en één lege zwakke som liet startLevel omvallen. Alleen wat kapot
   is gaat terug naar het begin; een geldige waarde blijft precies staan. De
   voortgang (sterren, diamanten) blijft buiten schot. kern.test.js zaak VS. */
const BEWERKINGEN = ['+', '-', 'x', ':'];
function instellingenHerstel(p) {
  const s = p.settings;
  s.ops = Array.isArray(s.ops) ? s.ops.filter(o => BEWERKINGEN.includes(o)) : [];
  if (s.themas != null && !Array.isArray(s.themas)) delete s.themas;
  if (!THEMAS.some(t => themaAan(s, t.id))) s.ops = ['+', '-'];
  if (!(Number(s.max) > 0)) s.max = 20;
  else s.max = Number(s.max);
  if (!Array.isArray(s.tables) || !s.tables.length) s.tables = [2, 5, 10];
  if (!['kies', 'mix', 'typ'].includes(s.mode)) s.mode = 'kies';
  if (!(Number(s.perLevel) > 0)) s.perLevel = DEFAULT_PERLEVEL;
  for (const lijst of ['weak', 'learned']) {
    if (!p[lijst] || typeof p[lijst] !== 'object') continue;
    for (const [k, e] of Object.entries(p[lijst])) if (!e || typeof e !== 'object') delete p[lijst][k];
  }
}
function migrate(p) {
  if (!p.trophies) p.trophies = [];
  // Bestaande spelers: alles wat al behaald is blijft 'behaald' (staat in trophies).
  // readyTrophies begint leeg; alleen echt nog-niet-geclaimde-maar-gehaalde trofeeën
  // komen daarna 'klaar' te liggen — geen plotse muur van "Klaar!" voor oude saves.
  if (!p.readyTrophies) p.readyTrophies = [];
  // FASE 1: lag er nog een trofee klaar die intussen met pensioen is (thema-look of
  // Podiumbouwer)? Die kaart staat niet meer in de kast, dus openen kan niet meer --
  // en zonder dit zou het rode stipje op het Trofeeën-tabblad eeuwig blijven staan.
  // Alleen uit het 'klaar'-lijstje; wat al behaald is (p.trophies) blijft onaangeroerd,
  // en komt een trofee ooit terug, dan legt checkTrophies hem gewoon opnieuw klaar.
  p.readyTrophies = p.readyTrophies.filter(id => !isRetiredTrophy(id));
  if (p.goldHits == null) p.goldHits = 0;
  if (p.encores == null) p.encores = 0;
  if (!p.leer) p.leer = { brug: 0, zoek: 0, drie: 0 };
  /* Een ster van vóór groeiMoment: wat ze al kende telt als gevierd, anders
     kreeg een kind dat al maanden zoek-het-getal speelt morgen "Nieuw!". De
     sleutels zijn de rij-ids van LEERPAD (zie groeiMoment). Een ouder veld
     "max" (de hoogste grens) mag blijven staan: niets leest het nog. */
  if (!p.gezien) p.gezien = {
    zoek: Object.values(p.opTrack || {}).some(t => t && t.unlockStap != null) ? 1 : 0,
    drie: (p.chainTrack && p.chainTrack.seen) ? 1 : 0,
  };
  /* ---- FASE 4A: de oneindige staart opruimen -------------------------------
     Tot en met fase 3 liep de tournee voorbij de laatste geschreven wereld gewoon
     door: level 49 en verder heetten "Sterrentournee" en waren geen echte wereld.
     Een kind kon daar sterren verdienen. Die sterren staan op levelnummers die
     later door een échte wereld opgeeist worden -- en dan zou wereld 7 bij het
     eerste openen al (deels) uitgespeeld lijken, zonder dat er ooit een show van
     gespeeld is. Precies de bug die deze fase wegneemt.

     Dus één keer, hier: die sterren gaan uit p.stars naar p.tourStars. Ze blijven
     staan (niets wordt weggegooid) en blijven meetellen in het sterrentotaal, de
     de shows-trofeeën -- zie allStarValues. Alleen hun levelnummers zijn
     vrij, en dat is het hele punt.

     LEGACY_TOUR_END is 48 en verandert nooit meer: het is het laatste level dat
     bestond op de dag dat de staart verdween, en dus geschiedenis. Het mag geen
     WORLD_LAST worden -- die groeit mee met elke nieuwe wereld, en dan zou deze
     lus bij een latere versie de échte sterren van wereld 7 alsnog opruimen.

     Het bestaan van p.tourStars is meteen de stempel: is het kaartje er, dan is
     dit profiel al langs deze regel geweest en blijft alles daarna met rust. */
  if (p.tourStars == null) {
    p.tourStars = {};
    for (const k of Object.keys(p.stars)) {
      const lvl = Number(k);
      if (!(lvl > LEGACY_TOUR_END)) continue;
      p.tourStars[k] = p.stars[k];
      delete p.stars[k];
    }
    // ...en de positie mee: één voorbij het laatste level dat bestaat is "alles
    // uit". Verder dan dat kon alleen de staart, en die is er niet meer.
    if (p.level > LEGACY_TOUR_END + 1) p.level = LEGACY_TOUR_END + 1;
  }
  /* Welke werelden al een keer in beeld zijn geweest (zie worldSeen). Een
     bestaand profiel heeft alles t/m de wereld waar het nu staat al gezien -- dus
     dat zetten we hier éénmalig neer, precies zoals readyTrophies dat doet: geen
     plotse rij onthullingen voor een save die gewoon verder wil spelen. */
  if (!p.worldsSeen) {
    p.worldsSeen = [];
    const tot = Math.min(WORLD_AVAIL - 1, worldFor(p.level).index);
    for (let i = 0; i <= tot; i++) if (WORLDS[i]) p.worldsSeen.push(WORLDS[i].id);
  }
  /* FASE 4D.1 -- de beloningen die dit kind al verdiend had. Wie drie werelden uit
     heeft hoort die drie spulletjes gewoon in haar kleedkamer te vinden, en wie er
     één perfect speelde die trofee in haar kast. Stil, en zonder ook maar iets te
     hoeven overspelen.

     Geen stempel, geen versienummer, geen eenmalige lus: dit mág elke keer draaien,
     want "al gegeven" staat in p.owned en p.trophies zelf (zie grantWorldRewards).
     Het is daarmee tegelijk het vangnet voor een feestje dat verloren ging doordat
     de app tussen de show en de kaart door dichtging. */
  grantHistoricRewards(p);
  // de ster-status is met pensioen (zie "= Sterrencarrière"): zijn twee velden weg
  delete p.rankSeen; delete p.rangVersie;
  // een wens die niet meer klopt (weg, al van jou, of geen prijs) gaat eruit
  if (p.wens != null) {
    const w = item(p.wens);
    if (!w || typeof w.price !== 'number' || (p.owned || []).includes(w.id)) delete p.wens;
  }
  if (p.perf == null) p.perf = 0.5;
  if (!p.weak) p.weak = {};
  // bestaande spelers beginnen met een lege onderhoudslijst; die vult zich vanzelf
  // zodra ze weer sommen goed maken (geen terugwerkende kracht)
  if (!p.learned) p.learned = {};
  /* oude zwakke-sleutels ("3 + 4") naar het nieuwe sjabloonformaat ("3 + 4 = @").
     Dit hing aan een else achter p.learned, en dan kreeg een heel oude save de
     omzetting pas bij de tweede keer laden. Elke keer mag: wat al een @ heeft,
     blijft zoals het is. */
  {
    const nw = {};
    for (const [k, e] of Object.entries(p.weak)) nw[k.includes('@') ? k : `${k} = @`] = e;
    p.weak = nw;
  }
  // extra uitdagingen: standaard aan (verschijnen toch pas na voldoende beheersing)
  if (!p.settings) p.settings = { ops: ['+', '-'], max: 20, tables: [2, 5, 10], mode: 'kies', perLevel: 8 };
  instellingenHerstel(p);
  if (p.settings.missNum == null) p.settings.missNum = true;
  if (p.settings.chain3 == null) p.settings.chain3 = true;
  if (!p.opTrack) p.opTrack = {};
  /* De stempel "sinds wanneer beheerst" telde in rondes van twaalf shows
     (unlockRound) en telt nu in werelden (unlockStap, zie "De leerstap"). Ronde 3
     begon op show 25 = wereld 4, ronde 4 op show 37 = wereld 5: een ronde is dus
     de stap erna. Zo komt drie-getallen voor een bestaand kind niet ineens in
     dezelfde wereld als zoek-het-getal. Eén keer, en daarna is het oude veld weg. */
  Object.values(p.opTrack).forEach(t => {
    if (t && t.unlockRound !== undefined) {
      if (t.unlockStap == null && t.unlockRound != null) t.unlockStap = t.unlockRound + 1;
      delete t.unlockRound;
    }
  });
  if (!p.missRamp) p.missRamp = { rung: 1, hot: 0 };
  if (!p.chainTrack) p.chainTrack = { seen: 0, acc: 0.5, paused: false, rung: 1, hot: 0 };
  // telmodus (lees-vrij): standaard uit (track 'math') voor bestaande profielen
  if (p.settings.track == null) p.settings.track = 'math';
  if (p.settings.stage == null) p.settings.stage = 1;
  if (p.settings.stageMax == null) p.settings.stageMax = COUNT_STAGE_MAX;
  // bestaande telprofielen mochten tot fase 6; til hun plafond op naar de nieuwe fases
  if (p.settings.track === 'count' && (p.settings.stageMax === 6 || p.settings.stageMax === 8)) p.settings.stageMax = COUNT_STAGE_MAX;
  /* Er kwam een fase bij (12, tot 20). Wie op de oude laatste fase stond, stond
     op "alles" -- die gaat mee naar de nieuwe. Eén keer: fasesBekend onthoudt
     hoeveel fases er toen waren, zodat een ouder die daarna bewust de oude
     laatste fase kiest die ook houdt. Saves van vóór dit veld kenden er elf. */
  const bekend = p.settings.fasesBekend || 11;
  if (bekend < COUNT_STAGE_MAX) {
    if (p.settings.stageMax === bekend) p.settings.stageMax = COUNT_STAGE_MAX;
    p.settings.fasesBekend = COUNT_STAGE_MAX;
  }
  if (p.settings.repr == null) p.settings.repr = 'objects';
  if (p.settings.numerals == null) p.settings.numerals = true;
  /* "Cijfers uit" was een eigen schakelaar, en deed wat de lijn "tot" op de
     faseladder ook doet: niet voorbij fase 5. Die schakelaar is weg; wie hem uit
     had krijgt "tot" op fase 5 (of lager, als die al lager stond) en speelt
     precies hetzelfde. Daarna staan de cijfers aan, en zegt alleen "tot" het. */
  if (p.settings.numerals === false) {
    p.settings.stageMax = Math.min(p.settings.stageMax || COUNT_STAGE_MAX, 5);
    p.settings.stage = Math.min(p.settings.stage || 1, p.settings.stageMax);
    p.settings.numerals = true;
  }
  if (p.settings.qmax == null) p.settings.qmax = 10;
  if (p.settings.memory == null) p.settings.memory = true;
  delete p.settings.voorlezen;   // de schakelaar Voorlezen bestaat niet meer (zie stemAan)
  /* ---- Het leerpad: van leerstap naar rij ----------------------------------
     Tot hier was een stap een wereld: de hoogste van haar wereld en "vanaf"
     (s.startStap, 1 tot 5), en voorbij stap 5 was het alles door elkaar. Nu
     staat ze op een rij van LEERPAD (p.pad). padUitOudeStap zoekt de rij die
     minstens speelt wat haar stap speelde: nooit makkelijker dan ze gewend
     was. Wat ervoor ligt telt als gehaald. "vanaf" gaat op dezelfde manier
     mee. Eén keer: daarna staat p.pad er (ook als null). Een telster heeft nog
     geen pad; dat begint als ze gaat rekenen (zie naarRekenen). */
  /* Tot 50 is geen blok meer (zie LEERPAD: tot 20, dan tot 100, zoals op
     school). Wie op 50 stond gaat naar 100, en went eraan zoals na de tip
     (grensOmhoog): de getallen groeien in een paar shows. Op het pad begint
     ze aan het blok tot honderd, met Getallen bouwen. De rij tot50 bestaat
     niet meer; wat ernaar wees, wijst nu naar die eerste rij. */
  if (p.settings.max === 50) grensOmhoog(p.settings, 100);
  if (p.settings.padVanaf === 'tot50') p.settings.padVanaf = 'bouwen100';
  /* Tafels en Delen waren twee rijen van LEERPAD; nu zijn ze een eigen thema
     met een eigen ladder (TAFELPAD, p.tafels). Wie Tafels al haalde, krijgt de
     rijen van de tafelladder waarvan ze alle tafels speelde (s.tables): met
     2, 5 en 10 de eerste, met alle tien de hele ladder. Stond "vanaf" of "tot"
     op een van de twee, dan schuift die naar de rij erna of ervoor; stond ze
     erop, dan telt ze op haar volgende rij opnieuw. */
  if (p.pad && Array.isArray(p.pad.klaar) && !p.tafels && p.pad.klaar.some(id => id === 'tafels' || id === 'delen')) {
    const t = p.settings.tables || [];
    p.tafels = { klaar: TAFELPAD.filter(r => r.tafels.every(v => t.includes(v))).map(r => r.id) };
  }
  if (p.pad && (p.pad.rij === 'tafels' || p.pad.rij === 'delen')) p.pad.rij = null;
  if (p.settings.padVanaf === 'tafels' || p.settings.padVanaf === 'delen') p.settings.padVanaf = 'zoek';
  if (p.settings.padTot === 'tafels' || p.settings.padTot === 'delen') p.settings.padTot = 'brug20';
  if (p.pad && Array.isArray(p.pad.klaar)) p.pad.klaar = p.pad.klaar.filter(id => id in PAD_IDX);
  if (!('pad' in p)) {
    const s = p.settings;
    p.pad = null;
    if (s.track !== 'count') {
      const stap = Math.min(6, Math.max(continueWorld(p) + 1, s.startStap || 1));
      const rij = stap > 1 ? padUitOudeStap(s, stap) : null;
      if (rij) p.pad = { rij, shows: 0, goed: 0, klaar: padRijen(s).rijen
        .filter(r => rij === 'alles' || PAD_IDX[r.id] < PAD_IDX[rij]).map(r => r.id) };
    }
    const vanaf = (s.startStap || 1) > 1 ? padUitOudeStap(s, s.startStap) : null;
    s.padVanaf = vanaf === 'alles' ? (padRijen(s).rijen.slice(-1)[0] || {}).id || null : vanaf;
  }
  if (p.settings.padVanaf === undefined) p.settings.padVanaf = null;
  // "tot" als rij kwam later: zonder staat de lijn waar hij altijd stond, aan het eind van het blok
  if (!(p.settings.padTot in PAD_IDX)) p.settings.padTot = null;
  delete p.settings.startStap;
  if (!p.countTrack) p.countTrack = { stage: p.settings.stage, rung: 0, streak: 0, seen: 0, acc: 0.5 };
  if (p.countTrack.rung == null) p.countTrack.rung = 0;
  if (p.countTrack.streak == null) p.countTrack.streak = 0;
  if (!p.stats) p.stats = { correct: 0, wrong: 0 };
  // gratis startspullen: 5 basis, +1 als deze ster de gratis bonusoutfit (dress_geel,
  // bv. Clara) heeft — zodat "spulletjes gekocht" niet 1 te hoog begint
  if (p.freebies == null) p.freebies = 5 + (p.owned && p.owned.includes('dress_geel') ? 1 : 0);
  // basisfiguur: elke ster van vóór de jongens-basis is een meisje en blijft er
  // precies zo uitzien -- de meisjes-basis tekent exact dezelfde vormen als toen
  if (!BASES[p.base]) p.base = DEFAULT_BASE;
  if (!('instrument' in p.equipped)) p.equipped.instrument = null;
  // schoenen-categorie: bestaande profielen krijgen de gratis roze schoenen aan
  if (!('shoes' in p.equipped)) {
    p.equipped.shoes = 'shoes_roze';
    if (!p.owned.includes('shoes_roze')) p.owned.push('shoes_roze');
  }
  /* ---- FASE 4D.2: nog maar één tovenaarshoed --------------------------------
     Er waren er twee: acc_tovenaarshoed voor 85 diamanten in de kleedkamer, en
     acc_wereld_tover als beloning van de Toverwereld. Sinds die laatste écht
     getekend is zijn het dezelfde hoed, en dan is de beloning niets meer waard
     voor wie de andere al kocht. De winkelhoed is daarom uit ITEMS gehaald.

     Wat hier gebeurt is het opruimen daarna, en niet meer dan dat: een id dat
     niet meer bestaat hoort niet in owned te blijven staan (het zou daar als
     spookitem voor altijd meetellen bij "spulletjes gekocht"), en al helemaal
     niet aan te staan -- avatarSVG vindt er geen item bij en tekent dan stil
     niets, wat er voor een kind uitziet als een hoed die zomaar verdwenen is.
     Nu gaat hij netjes af, en staat de kale kop er tenminste met reden.

     Eenmalig in de praktijk maar geschreven om elke keer te mogen draaien: de
     tweede keer vindt hij niets meer. Geen terugbetaling -- dat is een keuze,
     geen vergetelheid. En wie een trofee haalde met dit spulletje meegeteld
     houdt die gewoon: behaalde trofeeen worden nooit ingetrokken. */
  if (p.owned) p.owned = p.owned.filter(id => id !== 'acc_tovenaarshoed');
  if (p.equipped && p.equipped.acc === 'acc_tovenaarshoed') p.equipped.acc = null;
  /* Een trofee die klaarlag voor een tournee die intussen langer werd (zie
     worldtour). Alleen wat nog niet geopend is, en alleen de trofeeën met
     telWerelden: de andere gaan over tellers die nooit dalen, en waar ze dat
     wél doen (de tovenaarshoed hierboven) geldt dat een gehaalde trofee blijft.
     Hier en niet vooraan in migrate(): has() leest sterren, stats en owned, en
     die staan pas vanaf hier allemaal op hun plek. Elke keer, want een nieuwe
     wereld komt met een nieuwe versie en die opent altijd via load(). */
  p.readyTrophies = p.readyTrophies.filter(id => {
    const t = TROPHIES.find(x => x.id === id);
    return !(t && t.telWerelden) || t.has(p);
  });
}
/* ---- Lopende inschattingen ----------------------------------------------
   Vier tellers volgen hoe het gaat (p.perf, de nauwkeurigheid per bewerking, van
   de drie getallen en van de telmodus), en ze rekenen allemaal op dezelfde
   manier: een exponentieel voortschrijdend gemiddelde, waarin het nieuwste
   antwoord een vijfde weegt. Een goed antwoord is 1, goed bij de tweede poging
   (of niet snel) 0.85, fout 0. Op één plek, zodat bijstellen op één plek kan. */
function lopend(oud, doel) { return oud * 0.8 + doel * 0.2; }
function antwoordWaarde(correct, volledig) { return correct ? (volledig ? 1 : 0.85) : 0; }
/* De pauze van een vraagsoort, met hysterese: onder 0.70 gaat hij op pauze en
   pas vanaf 0.85 weer aan, zodat hij niet bij elk antwoord aan en uit springt. */
const PAUZE_ONDER = 0.70, PAUZE_UIT = 0.85;
function pauzeBij(t) {
  if (t.acc < PAUZE_ONDER) t.paused = true;
  else if (t.acc >= PAUZE_UIT) t.paused = false;
}
// Werkt de vaardigheidsinschatting bij na elk antwoord.
// Goed = omhoog (extra beloond bij snel binnen de spotlight), fout = omlaag.
function updatePerf(p, correct, fast) {
  p.perf = Math.max(0, Math.min(1, lopend(p.perf, antwoordWaarde(correct, fast))));
}
let db;
// LEGACY. Vaste weergavevolgorde voor saves van vóór het bewaarde order-veld:
// Clara kwam er als laatste bij en moest toch vooraan. Wordt één keer per profiel
// vastgelegd (op naam), daarna bewaard. Nieuwe sterren krijgen hun order expliciet
// van nextOrder() -- ze mogen hier niet doorheen, want een familie die haar kind
// "Anna" noemt zou anders order 1 krijgen en zo de rij binnenspringen.
const PROFILE_ORDER = { 'Clara': 0, 'Anna': 1, 'Marie': 2 };
function assignProfileOrder() {
  Object.values(db.profiles).forEach(p => {
    if (p.order == null) p.order = (PROFILE_ORDER[p.name] != null ? PROFILE_ORDER[p.name] : 90);
  });
}
// Eerstvolgende vrije sleutel. Gaten na een verwijdering worden hergebruikt: geen
// enkele sleutel overleeft een herlaadbeurt buiten db.profiles (cur en setKey staan
// alleen in het geheugen) en een import vervangt de hele verzameling.
function nextProfileKey() { for (let i = 1; ; i++) if (!db.profiles['p' + i]) return 'p' + i; }
// Nieuwe sterren sluiten achteraan aan. Math.max(-1) geeft -1 bij nul sterren, dus
// de eerste krijgt order 0; legacy-profielen in de 90-bak blijven ervóór staan.
// Een ster zonder plek (een save van vóór de volgorde) hoort in de 90-bak.
function plekVan(p) { return p.order == null ? 90 : p.order; }
function nextOrder() {
  return 1 + Math.max(-1, ...Object.values(db.profiles).map(plekVan));
}
// Sleutels in weergavevolgorde (order oplopend; gelijkspel op sleutel). Van deze
// db, of van een andere save (Overzetten toont die vóór hij erin staat).
function profileKeys(profielen) {
  const ps = profielen || db.profiles;
  return Object.keys(ps).sort((a, b) => plekVan(ps[a]) - plekVan(ps[b]) || (a < b ? -1 : 1));
}
// Eenmalige ophaalslag voor saves van vóór "maak je eigen ster": die konden Clara
// missen (ze kwam er later bij). Dat mag maar één keer gebeuren -- anders komt een
// ster die een ouder net verwijderd heeft bij de volgende start gewoon terug. De
// stempel reist mee in de back-up, dus een nieuw bestand raakt dit pad nooit meer
// en een oud bestand nog precies één keer. De lengte-controle is nodig omdat een
// lege db (verse installatie, of een back-up van een familie die iedereen wiste)
// anders alsnog Clara zou krijgen.
const SCHEMA_V = 2;
function normalizeProfiles() {
  if (db.schemaV == null) {
    if (Object.keys(db.profiles).length && !db.profiles.p3) {
      db.profiles.p3 = defaultProfile('Clara', 'dress_geel', COUNT_OPTS);
    }
    db.schemaV = SCHEMA_V;
  }
  assignProfileOrder();
}
function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(LS_KEY);
    opslagStand = raw;   // wat er stond toen wij keken -- zie save()
    if (raw) {
      db = JSON.parse(raw);
      if (typeof db.sound !== 'boolean') db.sound = true;
      if (typeof db.haptics !== 'boolean') db.haptics = true;
      // een half-kapotte db houdt wat ze nog heeft, i.p.v. hieronder te gooien
      if (!db.profiles || typeof db.profiles !== 'object') db.profiles = {};
      /* Elke ster apart. Vroeger ging dit in één forEach, en één ster waar migrate
         op stukliep gooide de hele db weg: het beginscherm leeg, alsof er nooit
         gespeeld was, en de eerste ster die een ouder daarna (geschrokken) maakte
         schreef over het hele bestand heen. Nu gaat alleen die ene ster opzij; de
         rest speelt gewoon door. */
      const opzij = [];
      for (const k of Object.keys(db.profiles)) {
        try { migrate(db.profiles[k]); }
        catch (e) { opzij.push(k); delete db.profiles[k]; }
      }
      normalizeProfiles();   // eenmalige legacy-ophaalslag + volgorde
      if (opzij.length) {
        /* Het hele bestand zoals het was naar .broken, net als hieronder, en nu
           níét bewaren: het origineel blijft ook onder LS_KEY staan tot er echt
           gespeeld wordt. Zo is er altijd een ongeschonden kopie om te herstellen. */
        try { localStorage.setItem(LS_KEY + '.broken', raw); } catch (e2) { /* vol of dicht */ }
        return;
      }
      save();
      return;
    }
  } catch (e) {
    // Een mislukte load ziet er vanaf nu precies uit als een eerste start (leeg
    // welkomscherm), dus bewaar het onleesbare bestand apart in plaats van het
    // straks stilletjes te overschrijven. Zonder dit is er achteraf niets meer
    // om naar te kijken.
    try { if (raw) localStorage.setItem(LS_KEY + '.broken', raw); } catch (e2) { /* vol of dicht */ }
  }
  // Verse start: nog geen sterren. Elke familie maakt haar eigen -- vroeger stonden
  // hier Clara, Anna en Marie, en die kreeg iedereen die de app opende cadeau.
  // Bewust geen save(): er valt nog niets te bewaren, en zo blijft een eventueel
  // onleesbaar bestand staan tot iemand er echt overheen schrijft.
  db = { sound: true, haptics: true, schemaV: SCHEMA_V, profiles: {} };
}
// Bewaren mag nooit het spel breken. localStorage kan gooien (privémodus, volle
// opslag, opslag uitgeschakeld); save() wordt middenin submitAnswer aangeroepen,
// dus een exception hier zou de rest van de beurt afbreken en het spel laten
// vastlopen op de vraag. Daarom: stil opvangen, één keer vriendelijk melden, en
// gewoon doorspelen (de voortgang van deze sessie blijft in het geheugen staan).
let saveFailed = false;
/* Kijkopstelling (?debug&demo) schrijft niets weg. Dat stond al als belofte bij
   de schakelaars onderaan -- "ALLEEN in het geheugen, een echte familie-opslag op
   hetzelfde toestel blijft ongemoeid" -- maar het stond nergens als regel. En het
   kostte niet veel: één keer de kaart openen roept markWorldSeen aan, die
   save() doet, en dan staan Lotte en Sem in de opslag van een echt gezin. De
   voorbeeldlinks op de voorbeeldpagina gaan allemaal langs de kaart.

   Alleen deze ene regel, en niet een tweede opslagpad: wat de app verder doet moet
   precies hetzelfde blijven, anders test de kijkopstelling iets anders dan er
   draait. */
let demoStand = false;
/* ---- Twee keer open ----------------------------------------------------------
   Elk geopend exemplaar van het spel houdt de hele db in zijn geheugen en schrijft
   hem bij elke save() in zijn geheel terug. Staat het spel twee keer open, dan
   schreef het oudste exemplaar bij zijn eerstvolgende antwoord zijn oude stand
   over alles heen wat het andere intussen verdiend had. Dat gebeurt gewoon: op
   Android delen de app op het beginscherm en een Chrome-tabblad dezelfde opslag,
   en een iPad haalt een Safari-tabblad van vorige week terug met de stand van
   vorige week erin.

   Dus onthouden we wat er stond toen wij het laatst lazen of schreven
   (opslagStand), en kijken vóór elke save() of dat nog zo is. Staat er iets
   anders, dan heeft een ander exemplaar geschreven: dan schrijven wij niet, maar
   laden we opnieuw -- en dus met de nieuwere stand. Wat dan verloren gaat is
   hooguit de show die in dít exemplaar bezig was; de nieuwere voortgang blijft
   altijd staan.

   Een lege opslag telt níét als "een ander schreef": dan heeft de browser hem
   gewist terwijl wij open stonden, en is wat er in het geheugen staat de enige
   kopie die nog bestaat. Die schrijven we dus gewoon terug.

   Bij terugkomen (tabblad weer in beeld, of uit de terug-cache van de browser)
   kijken we het ook al na, zodat het oude exemplaar meestal al bijgewerkt is
   vóór er één keer getikt wordt. Niet bij elke wijziging van de ander terwijl dit
   exemplaar in beeld is (het storage-event): dan zouden twee kinderen naast
   elkaar op één tablet elkaars scherm bij elk antwoord opnieuw laten laden. */
let opslagStand = null;
let opnieuwLaden = false;
function anderSchreef() {
  try {
    const nu = localStorage.getItem(LS_KEY);
    return nu !== null && nu !== opslagStand;
  } catch (e) { return false; }   // opslag dicht: dan schrijft er ook niemand anders
}
function laadNieuwere() {
  if (opnieuwLaden) return;
  opnieuwLaden = true;
  location.reload();
}
function opslagNagaan() {
  if (!demoStand && anderSchreef()) laadNieuwere();
}
function save() {
  if (demoStand || opnieuwLaden) return;
  try {
    if (anderSchreef()) { laadNieuwere(); return; }
    const tekst = JSON.stringify(db);
    localStorage.setItem(LS_KEY, tekst);
    opslagStand = tekst;
    saveFailed = false;
  } catch (e) {
    if (!saveFailed) {
      saveFailed = true;
      try {
        showToast('⚠️ Opslaan lukt niet', null, 'Spelen kan wel', null, 3000);
      } catch (e2) { /* UI nog niet klaar: stil doorgaan */ }
    }
  }
}

/* ---- De opslag laten vasthouden ---------------------------------------------
   localStorage is "best effort": onder druk mag een browser hem wissen, en Safari
   doet dat voor een site die een week of langer niet bezocht is en níét als app op
   het beginscherm staat. Dan zijn álle sterren weg, en dat is het ergste wat dit
   spel een kind kan aandoen. navigator.storage.persist() vraagt de browser om dat
   niet te doen.

   Chrome en Safari beslissen dat zelf en zonder vraag (op hoe vaak de site
   gebruikt wordt, of hij geïnstalleerd is). Firefox toont er wél een venster
   voor, en dat hoort niet voor een kind te verschijnen -- daar vragen we het dus
   alleen als er een ouder bij is (ouder = true, vanuit "Back-up maken").

   Eén keer per sessie, en stil: een nee of een browser die het niet kent is geen
   fout, dan blijft alles zoals het was. De back-up (exportData) blijft het echte
   vangnet. */
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') opslagNagaan(); });
window.addEventListener('pageshow', e => { if (e.persisted) opslagNagaan(); });

let opslagGevraagd = false;
function opslagVasthouden(ouder) {
  if (opslagGevraagd || demoStand) return;
  const st = navigator.storage;
  if (!st || !st.persist) return;
  if (!ouder && /Firefox\//.test(navigator.userAgent || '')) return;
  opslagGevraagd = true;
  try {
    Promise.resolve(st.persisted ? st.persisted() : false)
      .then(al => al || st.persist())
      .catch(() => {});
  } catch (e) { /* oude browser: niets aan de hand */ }
}

let cur = null;                 // huidige profielsleutel: 'p1' | 'p2'
const P = () => db.profiles[cur];

