# Testen

Het spel is één bestand (`index.html`) zonder bouwstap. De tests zijn dat ook zo
veel mogelijk: gewone Node-scripts, geen testframework, geen configuratie. Er
staan twee soorten naast elkaar.

| soort | draait in | wat het bewijst | kosten |
|---|---|---|---|
| **keuring** (`inhoud`, `kern`, `saves`, `kleedkamer`) | Node, zonder browser | de regels en de tabellen: voortgang, beloningen, opslag, catalogus, configuratie | ± 2 seconden, geen installatie |
| **browsertests** (de rest) | echte Chromium via Playwright | wat een kind ziet en tikt: schermen, animaties, spelverloop | enkele minuten, vereist `npm install` |

## Draaien

```sh
npm run check      # alleen de snelle keuring -- geen browser, geen npm install nodig
npm test           # alles: eerst de keuring, daarna de browsertests
```

Losse suites:

```sh
npm run test:inhoud      # kloppen de werelden, spullen en trofeeën nog?
npm run test:kern        # voortgang, uitgespeeld, perfect, beloningen
npm run test:saves       # bestaande saves, heropenen, meerdere kinderen
npm run test:kleedkamer  # de catalogus en de volgorde in het rek
npm run test:tellen      # ... en de bestaande browsersuites, ongewijzigd
npm run test:rekenen
npm run test:sterren
npm run test:ouder       # het ouderdeel: instellingen, wissen, back-up
npm run test:rondgang
npm run test:voortgang
npm run test:reis
npm run test:beloning
npm run test:studio      # de wereldstudio (?debug&mapedit)
```

`npm run check` heeft geen `node_modules` nodig: het draait op kaal Node. Wie
alleen aan de voortgang, de beloningen of de opslag komt, heeft daar genoeg aan.
Wie aan een scherm komt draait `npm test`.

Elke suite stopt met afsluitcode 1 als er iets fout is en print dan per zaak hoeveel
controles er omvielen, met de eerste fouten eronder.

## Wat waar getest wordt

### `test/inhoud.test.js` — de inhoudskeuring

Leest de tabellen één keer in en loopt ze na. Dit is de enige suite die geen spel
draait. Ze vangt de fouten die stil zijn: een wereld die naar een spulletje wijst
dat niet bestaat deelt gewoon niets uit, een beloning met een prijs erbij staat
ineens in de winkel, en een wereld met acht haltes maar `levels: 10` gooit zijn
handgezette kaart weg en slingert er een standaardweg overheen. Geen van drieën
geeft een foutmelding.

- **werelden** — unieke, nette id's; een naam, een icoon en een geheel aantal
  shows; `released` is weggelaten of een echte boolean; de levelnummering loopt
  aaneengesloten door; er staat geen uitgebrachte wereld achter een dichte
  (dan zou hij onbereikbaar zijn); evenveel haltes als shows en één stuurpunt
  minder dan haltes; `LEGACY_TOUR_END` staat nog op 48.
- **tekeningen** — wat een wereld bij `art` noemt staat ook echt op schijf.
- **beloningen** — elke wereld deelt een bestaand spulletje uit, geen twee
  werelden hetzelfde, en precies de beloningen hebben géén prijs (een prijsloos
  winkelitem zou gratis zijn; een beloning mét prijs zou te koop staan).
- **de zes id's in omloop** — `acc_wereld_muziek`, `_snoep`, `_jungle`,
  `_piraten`, `_ijs`, `_tover` bestaan, hebben geen prijs, hangen aan een wereld
  en hebben hun eigen tekening. Ze staan met naam en toenaam in de test: een id
  hernoemen betekent dat het spulletje verdwijnt bij iedereen die het verdiend
  had, en dat hoort een bewuste daad te zijn. `acc_tovenaarshoed` (de winkelhoed
  uit fase 4D.2) mag niet terugkomen, want `migrate()` ruimt die id op.
- **spullen** — unieke id's, bestaande categorieën, gehele prijzen vanaf nul, en
  alles wat een verse ster meekrijgt bestaat en zit in de juiste categorie.
- **trofeeën** — unieke id's, elke trofee hangt op precies één plank, elke
  plank-id bestaat, gepensioneerde trofeeën staan niet terug in de kast, en per
  wereld hangen er een wereldbadge en een perfecte-wereldtrofee. Elke `has()` en
  `progress()` wordt één keer echt aangeroepen met een leeg en een volgespeeld
  profiel -- een trofee die naar een verdwenen teller wijst valt hier om in plaats
  van in de kast van een kind.
- **de app zelf** — wat de service worker meeneemt staat ook op schijf (een
  naam die niet bestaat laat `addAll()` mislukken en dan installeert de service
  worker helemaal niet), de cache heeft een versienummer, en het manifest wijst
  naar bestaande iconen.

### `test/kern.test.js` — de voortgangsregels

Fase 4A en 4D, rechtstreeks door de functies heen: `worldDone`, `frontierWorld`,
`continueWorld`, `allWorldsDone`, `worldProgress`, `grantWorldRewards`.

- verse ster, halverwege, en alles uit (de toegift: geen grens, "verder" wijst
  naar de laatste échte wereld, en er wordt geen zevende wereld verzonnen);
- er komt later een wereld bij -- die is leeg, wordt de nieuwe grens, en de oude
  voortgang blijft staan; twee werelden tegelijk erbij slaat de tweede niet over;
- terugbladeren en vooruitkijken veranderen geen voortgang;
- **uit is uit**: voltooiing mag niet af te leiden zijn uit de positie, uit "al
  gezien", uit de sterren van de oude staart, of uit het overspelen van de laatste
  wereld; nul sterren is geen gespeelde show;
- een nog niet uitgebrachte wereld bestaat niet voor een kind -- ook niet met
  sterren erin -- en is gewoon uit zodra hij opengaat;
- **perfect** is elke show op drie sterren, niet eerder, en een behaalde trofee
  gaat nooit meer weg (ook niet als de teller later iets anders zegt);
- **beloningen**: uitspelen geeft het spulletje, perfect maken de trofee, allebei
  precies één keer -- ook na overspelen, na het vangnet, en na heropenen;
- werelden hoeven geen acht shows te zijn (vijf en twaalf doen hetzelfde);
- de trofeeplanken groeien mee met de werelden zonder dubbele kaartjes.

### `test/saves.test.js` — bestaande bestanden

Draait op de handgeschreven saves in `test/saves.js`: bestanden in de vorm die de
app vroeger schreef, met de velden die er toen nog niet waren bewust weggelaten.

- een leeg toestel, net begonnen, halverwege;
- **het oude einde van de content**: elf shows in de oude oneindige staart gaan
  één keer opzij naar `tourStars`, blijven meetellen, en geven hun levelnummers
  terug;
- **en dan een wereld erbij**: hetzelfde bestand, maar geopend in een versie waar
  wereld 7 al ín zit -- de wereld hoort leeg te zijn en de nieuwe grens;
- van vóór de beloningen: zes spulletjes en twee perfecte-wereldtrofeeën komen er
  stil bij, en een tweede keer openen deelt niets dubbel uit;
- **twee kinderen op één toestel**: niets erft over, spelen met de een laat de
  ander byte voor byte onaangeroerd (ook na heropenen), een derde ster raakt de
  twee bestaande niet, en allebei de profielen worden bij het openen bijgewerkt;
- de eenmalige Clara-inhaalslag gebeurt precies één keer;
- een onleesbaar bestand geeft een verse start én blijft bewaard onder
  `rekenPopsterren_v1.broken` -- er wordt niet overheen geschreven;
- **de rondreis**: openen, bewaren en opnieuw openen komt tot rust -- de tweede en
  derde keer geven exact hetzelfde bestand en dezelfde afgeleide voortgang.

### `test/ouder.test.js` — het ouderdeel

Een browsersuite (fase 5D). `profiles.test.js` gaat over sterren *maken* en
*verwijderen*; deze gaat over alles wat er daarna in `👨‍👩‍👧 Voor ouders` gebeurt.
Het risico zit hier niet in het rekenen maar in de eigendom van gegevens: één
instelling die per ongeluk op `db` in plaats van op het profiel schrijft, of een
reset die de oefeninstellingen meesleept, merkt een ouder pas als haar kind
vastloopt.

- **geluid en trillen** — de twee schakelaars onder het tandwiel zetten `db.sound`
  en `db.haptics` om, zeggen in woorden én in `aria-checked` welke stand dat is,
  staan los van elkaar, en overleven een herstart;
- **oefeninstellingen zijn van één kind** — instellen bij Anna laat Bas byte voor
  byte staan, het paneel toont bij een wissel de waarden van het gekozen kind, van
  modus wisselen schakelt alleen dát kind om, en na heropenen klopt het nog;
- **de kiezer wisselt de context, niet de plek** — een ander kind kiezen laat je op
  hetzelfde onderdeel staan en andersom;
- **startfase en hoogste fase** — een start boven het plafond duwt het plafond mee
  omhoog, een plafond onder de start trekt de start mee omlaag, de zichtbare band
  (`.chip.bereik`) loopt in béide rijen precies van start tot plafond, en cijfers
  uitzetten beperkt het aanbod tot vijf fases zonder de gekozen bovengrens weg te
  gooien;
- **wissen** — de knop bestaat pas als de openklapper open is, vraagt dan nog een
  keer, noemt het kind bij naam, zegt wat er *blijft*, doet niets bij "nee", en
  laat na "ja" de naam, de plek in de rij én alle oefeninstellingen staan;
- **verwijderen** — zelfde grendel, en de vraag noemt de ster die verdwijnt;
- **back-up** — wat eruit komt bevat alle sterren plus de app-brede schakelaars;
  terugzetten vraagt eerst, verandert tot dat moment niets, en zet daarna precies
  de sterren, diamanten en instellingen uit het bestand terug. Tweemaal hetzelfde
  bestand geeft tweemaal hetzelfde resultaat;
- **een kapotte back-up** — onleesbaar, half, of leeg: een melding, en de opslag
  blijft onaangeraakt;
- **de plakkende kop** — krimpt bij scrollen en wordt bovenaan weer ruim, maar
  welk kind gekozen is, welk onderdeel je leest en de weg terug blijven alle drie
  in beeld;
- **een ster maken vanuit Beheer** — komt terug in Beheer, bij de nieuwe ster, en
  begint niet stilletjes háár spel; afbreken maakt niets.

Fase 5D.1 heeft er vier zaken bij gezet:

- **enkelvoud en meervoud** — één show is "1 show gespeeld" en niet "1 shows";
  nul is meervoud (dat is Nederlands), twee weer ook, en in de telmodus heet een
  som een vraag. Eén regel (`mv`), dus dit bewaakt de regel en niet de tekst;
- **de trofeeteller heeft één bron** — de noemer op Voortgang, de kop van de kast
  en `activeTrophies().length` zijn hetzelfde getal, en er staat geen tweede
  trofeelijst naast `TROPHIES`. Zonder deze controle lopen ze stil uit elkaar
  zodra er een wereld bijkomt (`rebuildWorldBadges` zet er dan een trofee bij);
- **de inschatting zonder percentage** — in het niveau-blok staat geen `%` en
  geen balk meer, wél waar het kind nú aan werkt, en `p.perf` staat nog gewoon in
  de opslag en beweegt nog gewoon mee met goede en foute antwoorden. Beide kanten
  liggen vast: de presentatie is veranderd, het algoritme niet;
- **drie weergavekeuzes op één regel** — op 390, 360 en 320px drie gelijke
  kolommen met elk woord op één regel en een raakvlak van minstens 44px; op een
  onmogelijk smal venster (280px) wikkelt de rij in plaats van de woorden.

### `test/kleedkamer.test.js` — de catalogus en het rek

De laag ónder wat een kind in de kleedkamer ziet: `ITEMS`, `CATS` en de volgorde
die `shopItems()` teruggeeft. Puur rekenwerk, dus zonder browser.

- elk spulletje is óf te koop (een gewoon, niet-negatief getal) óf te verdienen
  (helemaal geen prijs) -- nooit allebei en nooit geen van beide;
- de zes wereldbeloningen zijn precies wat `WORLDS` uitdeelt, en een aanroep van
  `confirmShopBuy` erop kost niets en levert niets;
- **geen lege categorie en geen categorie met één obscuur stuk**; podia staan niet
  meer in de winkel maar bestaan nog wel als decor;
- **een verse ster kan in élke categorie meteen iets kiezen** met wat ze meekrijgt;
- de volgorde in het rek is van jou → te koop (op prijs) → te verdienen, en een
  net gekocht spulletje blijft tijdens zijn "Nieuw!"-moment staan waar het kind
  het aantikte;
- een verdiende wereldbeloning schuift mee naar "van jou" en staat niet meer op
  slot achteraan;
- een oude save met podia houdt ze (en haar diamanten), maar ziet ze nergens in
  de winkel terug.

### `test/studio.test.js` — de wereldstudio

Een browsersuite over het gereedschap achter `?debug&mapedit` (zie
`docs/UITBREIDEN.md`). Wat hier vastligt is niet hoe het paneel eruitziet maar de
beloftes die het doet — en de belangrijkste daarvan gaat over de opslag van een
gezin:

- **een concept staat apart van het spel** — een half afgemaakte wereld leeft in
  `localStorage` onder een eigen sleutel en wordt alleen met `?debug` ingelezen,
  dus hij kan nooit bij een kind terechtkomen;
- **een naam is genoeg** — het id, het pad van de tekening en de twee trofeeën
  rollen daaruit; je hoeft niets over de binnenkant te weten;
- **de beloning hoort bij de wereld**, en een verwijzing naar een spulletje dat
  niet bestaat wordt gezien;
- **slepen verandert die ene wereld** en niets anders;
- **de standen zijn de échte standen** van het spel (`p.stars`, `p.level`), geen
  nagemaakte studioplaatjes;
- **de controle loopt álle werelden na** en zegt erbij waar je het oplost.

## Hoe de keuring werkt

`test/app.js` knipt het `<script>`-blok uit `index.html` en draait het in een
`vm`-context met een nagebootste browser eromheen. Er wordt niets nagebouwd en
niets gekopieerd: het is dezelfde code die een kind draait, inclusief `load()`,
`migrate()` en `save()`. Een app-instantie kost ± 25 ms, dus elke zaak krijgt een
verse.

```js
const { laadApp, heropen } = require('./app');

const app = laadApp();                        // verse opslag
const app = laadApp({ opslag: {...} });       // met een bestaand bestand erin
const na  = heropen(app);                     // afsluiten en morgen weer openen

app.WORLDS, app.frontierWorld(p), app.grantWorldRewards(p, i)   // gewoon de functies
app.opslag()        // de localStorage van deze sessie
app.run('code')     // iets in de app draaien (voor let-variabelen zoals cur)
```

De nabootsing is met opzet krenterig: alleen de browser-globals in de lijst
`BROWSER` bestaan. Gaat `index.html` morgen iets anders gebruiken, dan komt er een
`ReferenceError` en niet stilletjes een doe-niets-object -- dan moet `test/app.js`
bijgewerkt worden, in plaats van dat de tests iets anders meten dan ze denken.

De keuring raakt bewust geen enkel scherm aan. Wat een kind ziet -- de kaart, de
reis, de kleedkamer, het wereldfeest, de studio -- blijft het terrein van de
browsersuites. Daardoor is er ook geen overlap: aan `index.html` verandert hier
niets, en aan de keuring verandert niets als er een tekening of een kleur anders
wordt.

## Controleren of de tests écht iets vangen

Een suite die altijd groen is, is geen vangnet. `test/app.js` leest daarom
`RP_INDEX` uit: zet een kopie van `index.html` met één bewust gebroken regel neer
en draai de keuring ertegen.

```sh
cp index.html /tmp/kapot.html
# ... breek er één regel in ...
RP_INDEX=/tmp/kapot.html npm run check      # hoort nu te falen
```

Bij het schrijven is dat met twaalf ingrepen gedaan; elke ingreep werd door
minstens één suite opgemerkt:

| ingreep | opgemerkt door |
|---|---|
| `worldDone` leidt voltooiing weer uit de positie af | kern, saves |
| `frontierWorld` geeft de laatste wereld i.p.v. -1 als alles uit is | kern, saves |
| `grantWorldRewards` deelt het spulletje elke keer opnieuw uit | kern, saves |
| perfect al bij één show op drie sterren | kern |
| de staartopruiming loopt mee met `WORLD_LAST` i.p.v. `LEGACY_TOUR_END` | saves |
| `awardTrophy` kent een trofee twee keer toe | kern, saves |
| een wereld wijst naar een beloning met een typefout | kern, saves, inhoud |
| een beloning krijgt een prijs | inhoud, kleedkamer |
| de bezit-groep valt uit de volgorde van het rek | kleedkamer |
| `levels` en het aantal haltes lopen uit de pas | kern, saves, inhoud |
| een uitgebrachte wereld achter een dichte | kern, saves, inhoud |
| bij het openen wordt maar één profiel bijgewerkt | saves |
| `P()` geeft altijd het eerste profiel | saves |
| een oefeninstelling schrijft op `db` i.p.v. op het profiel | ouderdeel |
| wissen neemt de oefeninstellingen mee | ouderdeel |
| de zichtbare fase-band loopt niet van start tot plafond | ouderdeel |
| een teller staat weer vast in het meervoud | ouderdeel |
| de trofeenoemer komt uit een tweede lijstje | ouderdeel |
| het percentage komt terug bij de niveau-inschatting | ouderdeel |
| de weergavekeuzes vallen weer over twee regels | ouderdeel |

## Wat er bij het schrijven opviel

Twee dingen die geen fout zijn maar wel het opschrijven waard, zodat ze later niet
per ongeluk "gerepareerd" worden:

- **Een profiel zonder `equipped` of `stars` laat `migrate()` omvallen.** `load()`
  vangt dat op zoals elk onleesbaar bestand: de tekst blijft staan onder
  `rekenPopsterren_v1.broken` en de app begint leeg. Er gaat dus niets verloren,
  maar de andere kinderen op hetzelfde toestel verdwijnen wél uit beeld tot iemand
  dat bestand terugzet. Zo'n profiel heeft de app zelf nooit geschreven -- het kan
  alleen uit een met de hand bewerkte back-up komen. Het gedrag van vandaag ligt
  vast in `saves.test.js` zaak J; het beter opvangen (per profiel in plaats van
  per bestand) zou een wijziging in `load()`/`migrate()` zijn en is bewust niet in
  deze ronde gedaan.
- **De tekeningcontrole kijkt maar één kant op:** wat een wereld bij `art` noemt
  moet op schijf staan, niet andersom. Een los bestand in `assets/world/` dat bij
  geen enkele wereld hoort valt dus nergens uit. Er lagen er twee
  (`regenboog-map.webp` en `wereld7-map.webp`); ze zijn in fase 6A weggehaald,
  want het waren byte voor byte kopieën van `snoep-map.webp` -- plaatshouders die
  een naam bezet hielden, geen tekeningen die op een wereld wachtten. Leg een
  volgende kandidaat neer in `incoming/` (zie `npm run preview`) in plaats van in
  `assets/`, dan kan hij ook niet stilletjes blijven liggen. Wat een echte
  wereldtekening moet zijn staat in `docs/WORLD-ART-BRIEF.md`.

## Als er iets omvalt

De uitslag noemt de zaak (`A`, `B`, ...) en daaronder de losse controles die
omvielen, met de gemeten waarde erachter. De letters staan met omschrijving in de
kop van elk testbestand.

Een gebroken controle is een vraag, geen verbod: als een regel bewúst verandert,
verandert de test mee -- maar dan wel als losse, zichtbare stap in dezelfde commit.
