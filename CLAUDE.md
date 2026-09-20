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
npm run bouw       # src/ -> het scriptblok van index.html. Draai dit na élke codewijziging
npm run check      # de keuring: ± 2 seconden, kaal Node, géén npm install nodig
npm test           # alles, inclusief echte Chromium — minuten, vereist npm install
open index.html    # het spel zelf, zonder meer
```

**`npm run check` is de poort waar élke wijziging doorheen moet** (1.185
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

0. **De code staat in `src/`, niet in `index.html`.** Het scriptblok daar is het
   resultaat van `npm run bouw` — bewerk je het met de hand, dan is je wijziging
   weg zodra er voor iets anders gebouwd wordt. `npm run check` vergelijkt de
   twee en zegt het meteen (zaak H). Het stijlblad en de markup in `index.html`
   zijn wél gewoon van jou; die staan niet in `src/`.
   De bronbestanden worden op naam gesorteerd achter elkaar geplakt, zonder iets
   ertussen — dus de cijfers in de naam zíjn de leesvolgorde, en elk bestand
   eindigt op een regeleinde.
1. **Er is precies één `<script>`-blok en precies één `</script>`, ook in
   commentaar.** `test/app.js` knipt de app uit het gebouwde `index.html` met
   `indexOf('<script>')` en draait hem in een `vm`; `inhoud.test.js` zaak H kijkt
   het na. Staat het woord er een tweede keer, dan vallen álle Node-suites om met
   een syntaxfout op een regel Nederlandse tekst. Schrijf het in proza als
   "scriptblok". (De tests draaien dus tegen het uitgeleverde bestand en niet
   tegen `src/` — dat is met opzet: ze horen te meten wat een kind draait.)
2. **Het spel moet blijven draaien vanaf `file://`.** De browsertests openen
   `file://…/index.html?debug` (zie `test/browser.js`). **Dus geen
   `<script type="module">`**: ES-modules worden met CORS opgehaald en een
   `file://`-herkomst is ondoorzichtig, dus dat mislukt. Klassieke `<script>` en
   `<link rel="stylesheet">` kunnen wel.
3. **Twee blokken in `src/` worden door een machine geschreven — bewerk ze niet
   met de hand.** `WORLDS` staat tussen `/* WERELDEN-BEGIN` en
   `/* WERELDEN-EINDE */`, `SCHERMKUNST` tussen `/* SCHERMKUNST-BEGIN` en
   `/* SCHERMKUNST-EINDE */`. De wereldstudio (`?debug&mapedit`) stuurt ze naar
   `test/preview.js`, die ze vervangt in het bronbestand waar de markering staat
   en daarna bouwt. Zie `docs/UITBREIDEN.md`. Let op: *Bewaar* schrijft het blok
   opnieuw uit de gegevens, dus handgeschreven commentaar erbinnen overleeft dat
   niet — zet een toelichting bóven `WERELDEN-BEGIN`, want dat stuk blijft staan.
4. **Het scriptje bovenaan het scriptblok (`--vh-lock` / `--vh-drift`) moet de
   eerste uitvoerende regel blijven.** Het legt de vensterhoogte vast vóór de
   Android-statusbalk wegvaagt; alles wat erna komt rekent erop.

Verder: **geen framework, geen bundler, geen TypeScript, geen bibliotheek.** De
app moet het doen op een oude tablet in een woonkamer, zonder net. Er gaat bij
een gewone start géén enkel verzoek naar buiten (ook het lettertype staat in
`assets/font/`); houd dat zo.

## Waar de dingen staan

`index.html` telt ruim twintigduizend regels, maar **43% daarvan is
commentaar**. De code eronder is klein: ± 2.800 CSS-regels en ± 5.900 regels
app-JavaScript. Waar het staat, en waarop je het vindt:

| zoek op | wat |
|---|---|
| `src/00-app.js` | **het spel.** Hier schrijf je. Bovenaan staat de inhoudsopgave van alle secties |
| `src/90-wereldstudio.js` | de **wereldstudio** — alleen bereikbaar met `?debug&mapedit`. Ruim een vijfde van de JavaScript, en het gewone spel raakt het nooit aan. Sla het over tenzij je er expliciet aan werkt |
| `src/99-servicewerker.js` | het aanmelden van `sw.js` en het doorgeven van de tekeningenlijst |
| `<style>` | het stijlblad, in `index.html` zelf. Begint met **DE AFSPRAAK** — kleur, letter, vlakken, beweging. Lees dat blok vóórdat je een kleur of een maat kiest |
| `<body` | de tien schermen als markup, in `index.html` zelf, allemaal tegelijk aanwezig; `.screen.active` bepaalt wat je ziet |
| `<script>` het scriptblok | het resultaat van de bouw. Lees het gerust, bewerk het niet |

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

* **`goMap`** lost zes elkaar uitsluitende manieren van aankomen op (uit een
  show, een reis, een onthulling, de tabbalk, een herhaalde tik) en verbruikt
  daarbij een handvol losse vlaggen (`pendingTravel`, `reisDoel`, `kaartFocus`,
  `netAf`, `tourMapVoltooi`, `terugBezig`). De volgorde van de regels is
  betekenisvol en staat als commentaar uitgelegd — lees het vóór je er iets
  tussen zet.
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
