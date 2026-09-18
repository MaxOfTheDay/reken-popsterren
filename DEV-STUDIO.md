# Dev Studio

Eén scherm, twee werkbladen, en een hoekje ernaast:

| | |
|---|---|
| **Testomgeving** | speel en controleer de game in een gekozen toestand |
| **Wereldstudio** | bouw en beheer de werelden |
| *App & merk* | het beeld dat bij de héle app hoort en bij geen wereld |

Links de bedieningen van het werkblad waar je in zit, rechts het échte spel op
telefoonmaat. Bovenin staat altijd welk werkblad aan staat en welke versie er
draait.

```
npm run studio
```

Dat is alles. De server start, haalt op de achtergrond de laatste git-informatie
op en opent <http://localhost:8099/studio>.

---

## 1. De eerste keer

Je hebt alleen **node 16 of nieuwer** nodig. Geen `npm install`, geen bouwstap —
de studio draait op de node die je al hebt, net als het spel zelf.

```
git clone https://github.com/MaxOfTheDay/reken-popsterren
cd reken-popsterren
npm run studio
```

`npm install` is er alleen voor de browsertests (`npm test`), niet voor de studio.

Is poort 8099 bezet, dan zegt de studio dat, met het alternatief erbij:

```
PORT=8100 npm run studio
```

## 2. Gewoon starten

```
npm run studio      de studio, en hij opent zelf een venster
npm run preview     hetzelfde, zonder venster (handig in een tweede terminal)
```

### Nog makkelijker: een icoontje op je bureaublad

```
npm run snelkoppeling
```

Eén keer. Daarna staat er **Rekensterren Studio** op je bureaublad: dubbelklik
en de server start én het venster gaat open. Draait er al een studio, dan opent
hij gewoon dat venster in plaats van te klagen.

Het icoontje weet waar jóúw kloon staat en welke node je hebt, dus:

* verplaats je de projectmap, of werk je node bij → `npm run snelkoppeling`
  opnieuw, en hij klopt weer;
* weggooien mag altijd; er gaat niets verloren.

De eerste keer:

* **macOS** — macOS kan zeggen dat het bestand van een onbekende maker is.
  Rechtermuisknop → *Open*, dan nog één keer op *Open*. Daarna nooit meer.
* **Linux** — zegt je bureaublad "niet vertrouwd", dan: rechtermuisknop →
  *Allow launching*.
* **Windows** — dubbelklikken is genoeg.

Sluit de studio met **Ctrl-C** in het venster dat erbij opengaat, of doe dat
venster gewoon dicht.

Rechtsboven staat altijd wat er draait:

```
main · a83f219 · gelijk
claude/wereld-7 · c91e220 · 3 nieuw op de verte
PR #42 · 8f1c0aa · 2 open wijzigingen
```

Die regel wordt elke halve minuut ververst, dus een `git checkout` in een andere
terminal valt vanzelf op.

**Op je telefoon** (zelfde wifi) staan de korte paden in de terminal:
`192.168.x.x:8099/t` is de kaart, `/t4` de kaart meteen in wereld 4, `/ts` de
wereldstudio.

## 3. Een andere tak of PR testen

In **Testomgeving → Huidige build**:

1. *Ophalen* — `git fetch --all --prune`. Raakt je werkmap niet aan.
2. Kies in de lijst: **Main**, een **open PR** (met titel), of een **tak**.
3. *Wissel*.

Een PR wordt met een losse kop uitgecheckt: kijken, niet doorwerken. Een tak
wordt gewoon uitgecheckt en zo nodig eerst lokaal aangemaakt.

**Staat er werk open in je werkmap, dan weigert de wissel.** De studio doet nooit
een reset, een stash of een force — leg eerst vast en wissel daarna.

Zonder verbinding met GitHub blijven de PR-titels weg en werkt de rest gewoon;
er staat dan bij waaróm. Een `GITHUB_TOKEN` in je omgeving verhoogt de
bezoeklimiet van GitHub.

## 4. Terug naar de laatste main

Knop **Naar main** (of kies *Main* en *Wissel*). Dat is
`git checkout main` plus een fast-forward naar `origin/main`.

Loopt je eigen tak achter, dan werkt **Bijwerken** hem bij — ook alleen
fast-forward. Lopen tak en verte uiteen, dan zegt de studio dat: samenvoegen is
een keuze en hoort niet achter een knopje.

---

## De twee werkbladen, in het kort

### Testomgeving — "breng me naar deze stand"

| onderdeel | waarvoor |
|---|---|
| **Huidige build** | welke bron er draait (main, tak of PR), de commit, of main nieuwer is, of er hier iets openstaat, en wanneer er voor het laatst is opgehaald. *Ophalen · Bijwerken · Naar main*, en de lijst om mee te wisselen. Wat alleen git-detail is staat onder *Details*. |
| **Testscenario** | de stand waarin je het spel wilt zien. Boven de snelkeuzes (nieuwe speler, alles uitgespeeld, geen diamanten, volle kleedkamer, trofeeënkast); eronder vijf velden waarmee je hem zelf samenstelt: speler, wereld, stand, scherm, diamanten. Ze stellen allebei dezelfde vlaggen samen — er wordt hier niets nagebouwd. |
| **Toestel** | Pixel 10 voorop, dan de maten die elk een ándere rand van de opmaak bepalen, en *Eigen maat* als je iets anders zoekt. Daarnaast drie schakelaars: randen, raster, animaties uit. De échte toestelmaat staat altijd boven het kijkvak, met daarnaast hoe hard hij voor je ogen is opgeblazen. |
| **Gereedschap** | herladen, opslag/cache/servicewerker van het kijkvak leegmaken, het spel zonder vlaggen, en de servicewerker aanzetten om de bijwerkstroom van de PWA na te kijken. |

### Wereldstudio — "laat deze wereld zien en klopt hij"

Links de wereldlijst (icoon, naam, volgorde, en een bolletje dat zegt of er iets
aan mankeert), rechts die ene wereld in vier groepen:

| groep | waarvoor |
|---|---|
| **Wereld** | naam, icoon, volgorde, id. *Bewerken in het kijkvak* opent de wereldstudio ín de app (`?debug&mapedit`): daar zet je haltes, buig je de weg, kies je kleuren en een beloning. |
| **Tekening** | de wereldkaart als beeldkaartje: voorbeeld, maat, verhouding, bestandsmaat met de aanbevolen begroting ernaast, en vervangen door te slepen of te tikken. |
| **Voortgang** | shows, wanneer de wereld opengaat, beloning, trofee, haltes — en de standen om hem in te bekijken (net begonnen, halverwege, bijna uit, perfect, op slot). Dat zijn dezelfde standen als in de Testomgeving; er is geen tweede standenmachine. |
| **Controles** | wat er niet klopt: een ontbrekend bestand, een beloning die niet bestaat, een tekening die te zwaar is. *Keuringen draaien* doet de vier snelle controles van `npm run check`. |

### App & merk

Alles wat bij de héle app hoort en bij geen wereld:

| | |
|---|---|
| **Schermtekeningen** | het startscherm, de kleedkamer, de trofeeënkast |
| **Merk** | het spelogo, het merkteken, het app-icoon |

Hetzelfde beeldkaartje als bij een wereldtekening — voorbeeld, maat, verhouding,
bestandsmaat met de begroting ernaast — met twee verschillen die er echt toe doen:

* een **schermtekening** is één bestand. Vervangen is het bestand vervangen, klaar.
* een **merkbeeld** is een kéten. Er is één meester in `assets/branding/source/`
  en daar rollen de bestanden uit die de app laadt. Vervang je er een, dan
  vervangt de studio de méester en draait daarna `npm run merk` voor je. Lukt dat
  niet (geen browser, dus nog geen `npm install`), dan zegt hij dat en blijft de
  meester gewoon staan.

### Kiezen is nog niet vervangen

Een bestand kiezen maakt er een **kandidaat** van. Er gaat dan nog niets naar
schijf:

1. je kiest een bestand (slepen of tikken);
2. de studio springt naar het échte scherm waar die tekening hoort, met de
   kandidaat erachter — de echte kop, de echte kaartjes, de echte navigatiebalk,
   op telefoonmaat, met dezelfde uitsnede en dezelfde sluier als in het spel;
3. het kaartje zegt *Niet opgeslagen* en noemt de maat, de verhouding en wat er
   aan mankeert;
4. **Gebruik deze** zet hem vast, **Annuleer** laat geen spoor na.

Waarom dat voorbeeld op het échte scherm het punt is: de winkeltegels en de
trofeekaartjes zijn doorschijnend en licht-op-donker. Of een tekening werkt hangt
dus niet af van de tekening maar van wat er overheen staat, en dat zie je pas als
het er werkelijk overheen staat.

### De kleedkamer en de trofeeënkast

Die twee lenen de gedeelde schil totdat er een tekening ligt. Het kaartje zegt
daarom twee dingen apart:

* **Nog geen tekening / Opgeslagen / Gewijzigd** — staat het bestand er, en wijkt
  het af van wat er in het spel staat;
* **In gebruik / Niet in gebruik** — gebruikt het spel hem ook werkelijk.

Het pad staat in `SCHERMKUNST` in `index.html`, en dát is wat de app leest — geen
lijstje dat alleen de studio kent. *Zet uit* haalt de tekening uit het spel zonder
het bestand weg te gooien: de kleedkamer staat dan weer op de gedeelde schil,
precies zoals hij eruitzag.

### Vervangen, en "vastzetten"

Twee verschillende dingen, en de studio houdt ze uit elkaar:

* **een beeld vervangen** schrijft naar je wérkmap, en dat werkt gewoon zolang
  `npm run studio` (of `npm run preview`) draait. Het is daarna een gewone
  wijziging in git: je ziet hem terug als *Gewijzigd* bovenin.
* **het `WORLDS`-blok terugschrijven** naar `index.html` — dát is de stap die
  alléén met die server kan. Zonder server valt de wereldstudio terug op
  Kopieer-en-plak.

### Open werk

Staat er iets open in je werkmap, dan weigert elke wissel — de studio ruimt nooit
iets op zonder dat jij het zegt. Onder *Huidige build* staat dan wát er openstaat,
met drie uitwegen:

| | |
|---|---|
| **Opzij zetten** | `git stash`. Niets raakt kwijt; *Haal terug* zet het terug. |
| **Vastleggen** | lokaal, met een bericht. Sta je op main, dan komt er eerst een tak onder — main blijft waar hij stond. Er wordt niet gepusht. |
| **Terugdraaien** | deze bestanden terug naar wat er in het spel staat. Het enige dat werk wégdoet, dus in twee stappen: de eerste klik laat alleen zien wát er zou verdwijnen. |

Alles in het kijkvak draait op `?debug&demo`, en dat **grendelt de opslag**: geen
enkele knop hier kan de voortgang van een echt kind raken. De enige uitzondering
is *Gewoon spel* — die draait het spel zonder vlaggen en schrijft dus wél weg,
maar naar de opslag van `localhost`, niet naar die van een geïnstalleerde app.
*Kijkvak leegmaken* veegt die weer leeg.

Een wereld toevoegen doe je in de wereldstudio: naam geven, tekening erop,
kleuren accepteren, haltes zetten, beloning kiezen, standen doorlopen, *Zet in
het spel*. Zie `docs/UITBREIDEN.md`.
