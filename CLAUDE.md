# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

Rekensterren is een reken- en teloefenspel voor kinderen van ± 5 tot 8. Het
wordt uitgeleverd als één bestand zonder bibliotheek, dat je opent en dat het
dan doet — ook vanaf `file://`. De code schrijf je in `src/` en `npm run bouw`
zet hem erin. `README.md` legt uit wát het spel is en noemt de vijf begrippen
(wereld, show, ster, grens, diamant); dit bestand gaat over hóe je eraan werkt
zonder iets stuk te maken.

## Draaien en testen

```sh
npm run studio     # de gewone manier van werken — http://localhost:8099/studio
npm run bouw       # src/ -> het stijl- en scriptblok van index.html. Na élke wijziging
npm run check      # de keuring: ± 2 seconden, kaal Node, géén npm install nodig
npm test           # alles, inclusief echte Chromium — minuten, vereist npm install
open index.html    # het spel zelf, zonder meer
```

**`npm run check` is de poort waar élke wijziging doorheen moet** (1.186
controles in vier Node-suites: `inhoud`, `kern`, `saves`, `kleedkamer`, op kaal
Node). `npm test` doet die vier en daarna nog twaalf, waarvan de meeste een
echte Chromium starten — `hub` is de uitzondering en draait ook op kaal Node.
Eén suite draaien gaat met `npm run test:<naam>`, bijvoorbeeld
`npm run test:reis`; de hele lijst staat in `docs/TESTEN.md` en `package.json`.

Raak je aan het uiterlijk, draai dan ook `npm run shots` (schermafdrukken om
mee te vergelijken) of `npm run achtergrondproef`.

## De harde regels

Dit zijn de valkuilen die je niet aan de code ziet. Vier ervan zijn ooit
omgevallen; regel 0 is er om te voorkomen dat er een vijfde bijkomt.

0. **Code én stijlblad staan in `src/`, niet in `index.html`.** De blokken
   `<style>` en `<script>` daar zijn het resultaat van `npm run bouw` — bewerk je
   ze met de hand, dan is je wijziging weg zodra er voor iets anders gebouwd
   wordt. `npm run check` vergelijkt ze en zegt meteen wélk blok is afgedreven en
   op welke regel (zaak H). De markup tussen `<body>` en `</body>` is wél gewoon
   van jou; die staat niet in `src/`.
   De bronbestanden worden op naam gesorteerd achter elkaar geplakt, zonder iets
   ertussen — dus de cijfers in de naam zíjn de leesvolgorde, en elk bestand
   eindigt op een regeleinde.
   **Die volgorde is dragend en niet cosmetisch.** Functies worden gehesen en
   mogen dus overal staan, maar een `const` of `let` op het hoogste niveau niet:
   wie die leest vóórdat zijn regel gedraaid heeft, krijgt een ReferenceError en
   een lege pagina. Zo horen `10-feestjes.js` en `15-kaart-en-weg.js` vóór
   `20-app.js`: `stilStaan` leest `MOVE_CLASSES` en `goMap` leest
   `pendingTravel`, en allebei gebeurt al bij het opstarten. Zet je zo'n bestand
   erachter, dan valt de pagina meteen om met "Cannot access ... before
   initialization" — voor allebei nagemeten in een echte browser.
   **`npm run check` ziet dit soort fouten niet** — die keuring draait met een
   nagebootst scherm waar geen pop in zit, en komt dan vrolijk op 1186/1186 uit
   terwijl de pagina in een browser meteen omvalt. Verander je de volgorde of
   verplaats je een `const`, draai dan óók een browsersuite
   (`npm run test:sterren` is de kortste die het beginscherm echt opbouwt).
   **Bij de CSS is de volgorde de cascade.** In het hele stijlblad staan drie
   `!important`, dus vrijwel élke voorrang komt uit "wie staat er later". Een
   stuk verhangen is daar geen opruiming maar een wijziging in het uiterlijk, en
   hij is stil: er breekt niets, er ziet alleen iets er anders uit. `bouw.js`
   kijkt per CSS-bestand of de accolades kloppen en of het commentaar dichtgaat,
   zodat een knip midden in een regel of een uitleg niet door kan glippen — maar
   wát je verhangt, kan hij niet weten.
1. **Er is precies één kále `<script>`, ook in commentaar — en elke afsluiting
   hoort bij een opening.** `test/app.js` knipt de app uit het gebouwde
   `index.html` vanaf `indexOf('<script>')` tot de eerste `</script>` erna en
   draait hem in een `vm`; `inhoud.test.js` zaak H kijkt het na. Schrijf het in
   proza als "scriptblok" — staat de kale vorm er een tweede keer, dan vallen
   álle Node-suites om met een syntaxfout op een regel Nederlandse tekst. Een
   scripttag mét attributen mag er wél bij: onderin `<body>` staat er één (zie
   regel 2). Daarom wordt er niet meer op de láátste afsluiting geknipt, en is
   het vangnet nu dat de aantallen openingen en afsluitingen gelijk zijn.
   (De tests draaien dus tegen het uitgeleverde bestand en niet
   tegen `src/` — dat is met opzet: ze horen te meten wat een kind draait.)
2. **Het spel moet blijven draaien vanaf `file://`.** De browsertests openen
   `file://…/index.html?debug` (zie `test/browser.js`). **Dus geen
   `<script type="module">` waar het spel op leunt**: ES-modules worden met CORS
   opgehaald en een `file://`-herkomst is ondoorzichtig, dus dat mislukt.
   Klassieke `<script>` en `<link rel="stylesheet">` kunnen wel.
   De ene uitzondering staat vlak vóór `</body>`: het meetscriptje van
   **Cloudflare Web Analytics**, een `<script type="module" src="…">` naar
   buiten. Het spel leunt er niet op — mislukt het, dan draait alles gewoon
   door — maar het is wél het enige stuk pagina dat zonder net omvalt, en het
   laat dan een `Failed to load resource` in de console achter. De suites
   rekenen élke consolefout aan als een fout in de pagina, dus vangt
   `cacheFonts` in `test/browser.js` die ene aanvraag af met een leeg antwoord.
   Zet er niets bij dat het spel zelf nodig heeft.
3. **Twee blokken in `src/` worden door een machine geschreven — bewerk ze niet
   met de hand.** `WORLDS` staat tussen `/* WERELDEN-BEGIN` en
   `/* WERELDEN-EINDE */`, `SCHERMKUNST` tussen `/* SCHERMKUNST-BEGIN` en
   `/* SCHERMKUNST-EINDE */`. De wereldstudio (`?debug&mapedit`) stuurt ze naar
   `test/preview.js`, die ze vervangt in het bronbestand waar de markering staat
   en daarna bouwt. Zie `docs/UITBREIDEN.md`. Let op: *Bewaar* schrijft het blok
   opnieuw uit de gegevens, dus handgeschreven commentaar erbinnen overleeft dat
   niet — zet een toelichting bóven `WERELDEN-BEGIN`, want dat stuk blijft staan.
4. **`src/00-vh-lock.js` moet het eerste bronbestand blijven.** Het legt de
   vensterhoogte vast vóór de Android-statusbalk wegvaagt, en alles wat erna komt
   rekent erop. Het volgnummer 00 is wat dat garandeert — geen afspraak maar de
   sorteervolgorde.

Verder: **geen framework, geen bundler, geen TypeScript, geen bibliotheek.** De
app moet het doen op een oude tablet in een woonkamer, zonder net. Alles wat het
spel nodig heeft ligt naast `index.html` (ook het lettertype staat in
`assets/font/`); houd dat zo. Er gaat bij een gewone start nog precies één
verzoek naar buiten en dat is het meetscriptje uit regel 2 — niets van het spel
wacht erop, dus zonder net mist er niets dan een telling. Het ouderaccount
(`src/18-ouderaccount.js`) praat alleen met Supabase als een ouder daar zelf om
vraagt: inloggen, afmelden, of het ouderdeel openen met een verlopen sessie.
In de browser staan alléén de projectURL en de `sb_publishable_`-sleutel; een
secret/service-role-sleutel of het Google client secret hoort nooit in deze
repo.

## Waar de dingen staan

`index.html` telt ruim twintigduizend regels, maar **43% daarvan is
commentaar**. De code eronder is klein: ± 2.800 CSS-regels en ± 5.900 regels
app-JavaScript. Waar het staat, en waarop je het vindt:

| zoek op | wat |
|---|---|
| `src/00-vh-lock.js` | de vensterhoogte vastleggen. Moet als eerste draaien — vandaar het volgnummer |
| `src/10-feestjes.js` | de **gedeelde feestjes**: `motionOff`, toast, praise, confetti, sparkle, danspasjes, confirm/notice. Wat élk scherm mag gebruiken om te zeggen dat er iets gebeurd is |
| `src/15-kaart-en-weg.js` | de **vormleer van de wereldkaart**: haltes, de weg erlangs, het streeppatroon, `ZONE`, `showWorld`. Rekent in procenten van de tekening en kent geen scherm. De kaart, de reis én de wereldstudio leunen erop |
| `src/17-kaartstand.js` | de **kaartstand**: vijftien namen die zeggen waar de kaart naar kijkt (`viewWorldIdx`), wat de eerstvolgende opbouw moet doen (`pendingTravel`, `reisDoel`, `kaartFocus`, `netAf`) en wat er nu loopt (`overgangBezig`, `vluchtOp`, `wereldReisOp`). Begin hier als je aan een overgang werkt |
| `src/18-ouderaccount.js` | het **ouderaccount**: inloggen met Google via Supabase Auth, voor de ouder alleen, en de kaart "Cloudback-up" in Beheer. Een eigen `fetch`-clientje (PKCE), geen supabase-js. Raakt `db` en de saves nergens aan en heeft twee eigen `localStorage`-sleutels. Staat vóór `20-app.js` omdat `?debug&screen=ouder` de kaart al bij het opstarten tekent |
| `src/20-app.js` | **het spel.** Hier schrijf je meestal. Bovenaan staat de inhoudsopgave van alle secties |
| `src/90-wereldstudio.js` | de **wereldstudio** — alleen bereikbaar met `?debug&mapedit`. Ruim een vijfde van de JavaScript, en het gewone spel raakt het nooit aan. Sla het over tenzij je er expliciet aan werkt |
| `src/99-servicewerker.js` | het aanmelden van `sw.js` en het doorgeven van de tekeningenlijst |
| `src/css/*.css` | **het stijlblad**, in dertien stukken (zie hieronder) |
| `<body` | de tien schermen als markup, in `index.html` zelf, allemaal tegelijk aanwezig; `.screen.active` bepaalt wat je ziet |
| `<style>` / `<script>` | het resultaat van de bouw. Lees het gerust, bewerk het niet |

Het stijlblad, in leesvolgorde — en die volgorde is de cascade, dus verhang er
niets zonder reden:

| bestand | wat erin staat |
|---|---|
| `00-afspraak.css` | `@font-face` en **DE AFSPRAAK**: kleur, letter, vlakken, beweging, plus de reset. Lees dit vóórdat je een kleur of een maat kiest |
| `10-basis.css` | de letterladder, de twee soorten scherm, de sterrenkeuze, het spelogo |
| `20-schil.css` | de schil buiten de werelden om, het vak waar een gebruiksscherm in staat, de schermtekeningen |
| `30-onderdelen.css` | de sterrentegel, het tandwielmenu, het podium en de danspasjes |
| `40-kaart.css` | home, de wereldkaart met zijn topbalk en vaste navigatie, de carrière-ladder |
| `50-zaal.css` | de zaal en de show: telmodus, stippenraam, memory, de wereldtournee, de camera |
| `55-haltes.css` | de haltes op de kaart en het sterrentabje |
| `60-reis.css` | de hele tournee: baan, route, bestemmingen, de vijf standen, de mist |
| `65-kast.css` | de trofeeënkast en de drie standen van een trofee |
| `70-feest.css` | de feestjes: claim, ster-status, wereldfeest, trofee, het eindscherm |
| `75-kleedkamer.css` | de kleedkamer, de spiegel, de wereldschatten |
| `80-ouderdeel.css` | het ouderdeel: dashboard, fasekiezer, maakformulier, statistiek, modal |
| `90-stilstand.css` | wie geen beweging wil |

**Navigeren doe je op sectienaam, niet op regelnummer.** Zoek op bijvoorbeeld
`= Telmodus` of `= De hele tournee`; het stijlblad heeft dezelfde soort koppen.
Staat er nog maar één bronbestand op je zoekterm, dan weet je meteen ook in welk
stuk je zit.

En zet hier geen regelnummers neer. In dit bestand stond eerst een tabel met
vier regelbereiken erin; alle vier waren nog dezelfde dag verlopen, omdat er
negen commits in main bij kwamen. Dat is precies waar de inhoudsopgave in
`index.html` al voor waarschuwt — "die verouderen meteen". Een zoekterm
verjaart niet.

### Waar je voorzichtig moet zijn

* **`goMap`** lost zes elkaar uitsluitende manieren van aankomen op: uit een
  show, een reis, een onthulling, de tabbalk, een herhaalde tik, of gewoon
  "verder". Hij leest dat nu in drie stappen, en die staan elk apart:
  `kaartOpdracht` zegt wat er moet gebeuren (en maakt de vier briefjes op),
  `kaartVertrek` laat het vorige scherm weggaan, en de staart van `goMap` zelf
  doet de aankomst. **De volgorde van die drie is betekenisvol**, en `goMap`
  is de enige plek waar je dat ziet — `kaartVertrek` moet vóór het verbruiken
  van `tourMapVoltooi` staan, want ze lezen allebei `kaartFocus` en wie eerst
  is wint. Wat de vlaggen zelf betekenen staat in `src/17-kaartstand.js`.
* **De overgangen** (`= Bewegingstaal`, `= De reis`, `= Wereld naar wereld`)
  zijn op enkele beeldjes afgeregeld. Verplaats er niets zonder het op een
  telefoon te bekijken; headless ziet dit soort fouten niet.
* **Duren staan in JavaScript, niet twee keer.** `--t-tik` en `--t-snel` in
  `:root` zijn de twee korte; de twee lange worden uitgerekend in
  `MOTION.totaal` en `VLUCHT.totaal`. Schrijf een duur nooit in een commentaar
  over — dat is eerder uit de pas gaan lopen.

### Waar je met een gerust hart aan werkt

Deze delen zijn zuiver en goed afgebakend; raak wat eromheen zit niet aan:

* **de voortgang** (`= De voortgang, afgeleid`) — `worldDone`, `frontierWorld`,
  `continueWorld` en hun buren. De regel: **alleen `p.stars` wordt bewaard,
  al het andere wordt eruit afgeleid.** Sla nooit "wereld is uit" op.
* **de opslag** (`= Opslag`) — `load`/`save`/`migrate`. `save()` gooit nooit,
  een onleesbaar bestand gaat opzij naar `<sleutel>.broken`. Laat dat staan.
* **de tabellen** — `ITEMS`, `WORLDS`, `TROPHIES`, `RANK_TIERS`. Er bij zetten
  gaat volgens `docs/UITBREIDEN.md`, en `npm run test:inhoud` kijkt het na.
* **`sw.js`** — 170 regels, twee voorraden. De schil is netwerk-eerst, dus voor
  een gewone uitgave hoeft `CACHE` niet omhoog. `ART_CACHE` gaat alléén omhoog
  als er een nieuwe of gewijzigde tekening onder `assets/` komt.

## Verder lezen

`README.md` wijst per onderwerp de weg. De drie die als handleiding worden
bijgehouden zijn `docs/UITBREIDEN.md` (een wereld, spulletje of trofee erbij),
`docs/TESTEN.md` en `docs/LADEN.md`. De rest van `docs/` zijn plandocumenten uit
een bepaalde fase: ze zeggen waarom iets besloten is, niet wat er vandaag staat.
**Waar plan en code uit elkaar lopen wint de code.**

Het commentaar in `index.html` is de belangrijkste documentatie die er is en het
wordt bijgehouden. Haal het niet weg om regels te besparen, en laat een uitleg
niet achter bij code die je verandert.
