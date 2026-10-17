# Dev Studio

De studio is er voor één ding: **een wereld maken en hem online zetten.** Wat je
daar niet voor nodig hebt staat onder **⋯ Meer**.

| | |
|---|---|
| **Werelden** | de lijst met alle werelden: bewerken, testen, publiceren |
| **Testen** | het spel in een gekozen stand zetten |
| *⋯ Meer* | versies en takken, losse git-stappen, gereedschap, het beeld van de app |

Bovenin staat altijd welke versie er draait, met één knop **⟳ Nieuwste versie**.

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
Publiceren draait die wél, om rechtstreeks naar main te kunnen. Ontbreekt
playwright, dan gaat Publiceren via een PR (zie hieronder).

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

Eén keer. Daarna staat er één icoontje op je bureaublad: **Rekensterren Studio**.
Dubbelklik en hij haalt eerst het nieuwste op, vraagt waarheen, start de server en
opent het venster. Draait er al een studio, dan opent hij gewoon dat venster in
plaats van te klagen.

Dat ophalen zit erin omdat "even de laatste main bekijken" anders drie handelingen
is die je vergeet — en dan kijk je naar de studio van vorige week en zoek je
waarom je wijziging er niet in zit. Hij vraagt het:

```
  Je staat op claude/landing-nieuw.
  Waarheen? Enter = de laatste main · h = blijf hier · of een PR-nummer:
```

**Enter** voor iets nieuws (een nieuwe wereld begin je op de laatste main).
**h** is een volwaardig antwoord: hij haalt dan wél op (dat houdt de bronnenlijst
bij en raakt je werkmap niet aan) maar wisselt niets. Zit je midden in je eigen
werk, dan is dat het antwoord.

Er stonden er vroeger twee, met een tweede die alleen startte wat er stond; dat
doet **h** nu. Heb je die nog, dan haalt `npm run snelkoppeling` hem weg.

Hij gooit nog steeds niets weg: staat er werk open in je werkmap, dan weigert de
wissel met een uitleg en start de studio op wat er stond, zodat je het in
*Open werk* kunt oplossen. En draait er al een studio, dan wisselt hij niets en
opent hij gewoon dát venster — want dan is "laat me de studio zien" wat je
bedoelde, en die staat er al.

Zelf een vaste bron in een eigen snelkoppeling? Dat is dezelfde vlag:

```
node test/preview.js --open --naar=main      de laatste main
node test/preview.js --open --naar=156       PR #156 (losse kop: kijken)
node test/preview.js --open --naar=een-tak   die tak
node test/preview.js --open --naar=vraag     vraagt het bij het starten
node test/preview.js --open                  zoals altijd: wat er staat
```

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

## 3. De nieuwste versie

**⟳ Nieuwste versie** haalt op en zet de studio op de laatste main. Staat er nog
werk open dat niet gepubliceerd is, dan weigert hij en zegt hij waarom; de studio
doet nooit een reset, een stash of een force. Sta je op een tak die al helemaal
in main zit (een wereld die net gepubliceerd is), dan gaat hij gewoon terug naar
main.

Een andere tak of een PR bekijken kan nog steeds, onder **⋯ Meer → Versie**.
Een PR wordt met een losse kop uitgecheckt: kijken, niet doorwerken.

---

## Werelden

Eén regel per wereld, met één label:

| label | betekent |
|---|---|
| **Live** | staat op main en kinderen kunnen hem spelen |
| **Niet uitgebracht** | staat op main, maar kinderen komen er nog niet in |
| **Niet gepubliceerd** | veranderd (in je concept of je werkmap), nog niet op main |
| **Wacht op merge** | gepusht naar een tak, nog niet op main |
| **Probleem** | iets houdt publiceren tegen; *Bewerken* opent de stap die het oplost |

Er wordt niets extra's voor bewaard: de studio leidt het af uit je concept, je
werkmap en `origin/main`.

**+ Nieuwe wereld** haalt eerst zelf de nieuwste versie op. Staat er nog een
nieuwe wereld die niet op main is, dan kan het niet, met één regel waarom: de
levels van twee nieuwe werelden zouden botsen. Eén wereld tegelijk.

### Een wereld bewerken: vier stappen

Links de échte kaart, rechts een smal paneel met alleen de stap waar je bent.

1. **Kaart** — icoon, naam en de tekening. Sleep een beeld op het vak; de studio
   snijdt en verkleint hem, en zet de kleuren en de zaal er zelf bij.
   *✨ Prompt voor de tekening* kopieert een prompt voor een beeldgenerator.
2. **Haltes** — sleep de acht rondjes en de groene ruitjes op de kaart. Als je
   loslaat rekent de studio de kleur van de weg opnieuw uit, want die hangt af
   van waar de weg loopt.
3. **Schat** — emoji, naam, de SVG (plakken of een `.svg` erop slepen), hoger en
   groter. Hij staat meteen op de pop. *✨ Prompt voor de schat* is voor Claude of
   ChatGPT, want een schat is SVG.
4. **Publiceren** — wat er nog mis is, met een link naar de stap die het
   oplost. Kijk nog één keer naar de kaart en de schat, en druk op
   **🚀 Publiceer**.

**Kleuren en zaal** zijn automatisch. De zaal is de wazige tekening achter de
sommen in een show; hoe lichter de tekening, hoe donkerder de laag erover. Wil je
er toch aan draaien: stap 1, *Kleuren & zaal*.

### Publiceren: één knop

🚀 Publiceer doet alles achter elkaar en zegt onderweg waar hij is:

1. de wereld op **uitgebracht** zetten en opslaan in `src/`;
2. de keuring (`npm run check`);
3. vastleggen op een eigen tak (`studio/<naam>-<datum>`) en pushen;
4. **alle tests** draaien, samenvoegen met main en main pushen;
5. de studio staat dan op de nieuwste main, klaar voor de volgende wereld.

Is de wereld al live, dan vraagt hij eerst of je de wijziging echt wilt
publiceren: hij staat binnen een paar minuten op de tablets.

Faalt er iets, dan stopt hij daar en zegt hij wat. Er komt niets half op main.
Ontbreekt playwright (`npm install` + `npx playwright install chromium`), dan
stopt hij na stap 3: de wereld staat dan als **Wacht op merge** op GitHub, en je
zegt "go" tegen Claude.

### Testen

Een wereld in een stand zetten (op slot, net begonnen, halverwege, uit,
perfect), de eerste of laatste show spelen, de reis erheen. Daaronder *Zelf
samenstellen*: speler, wereld, stand, scherm, diamanten. Alles draait op
`?debug&demo`, en dat **grendelt de opslag**: niets hier raakt de voortgang van
een echt kind.

**Op je telefoon** (zelfde wifi) staan de korte paden in de terminal:
`192.168.x.x:8099/t` is de kaart, `/t4` de kaart meteen in wereld 4.

---

## ⋯ Meer

Wat je zelden nodig hebt, maar wat er nog gewoon is.

| | |
|---|---|
| **Versie** | welke bron er draait, ophalen, bijwerken, wisselen naar een tak of PR |
| **Open werk** | opzij zetten (`git stash`), lokaal vastleggen, terugdraaien |
| **Losse stappen naar main** | de oude weg: opslaan, vastleggen, push voor een PR |
| **Gereedschap** | herladen, opslag en servicewerker van het kijkvak leegmaken |
| **App & merk** | de schermtekeningen en het logo, het merkteken, het app-icoon |

In de editor zelf heeft ⋯ Meer ook nog: het kijkvak met toestelmaat en stand,
de lijst van alle werelden, id en bestandspad, en kopieer/plak van het blok.

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

### Vervangen, en "opslaan"

Twee verschillende dingen, en de studio houdt ze uit elkaar:

* **een beeld vervangen** schrijft meteen naar je wérkmap, en dat werkt gewoon
  zolang `npm run studio` (of `npm run preview`) draait. Het is daarna een gewone
  wijziging in git: je ziet hem terug onder *⋯ Meer → Open werk*. Vervang je een beeld
  dat al vastgelegd is, dan gaat `ART_CACHE` in `sw.js` één keer omhoog, zodat
  telefoons die hem al hadden de nieuwe krijgen. Een nieuw bestand heeft dat niet
  nodig — ook niet als je het vóór het vastleggen nog eens vervangt: het staat
  op geen enkele telefoon.
* **het concept opslaan** (het `WORLDS`-blok in `src/`) — dát is de stap die
  alléén met die server kan. Zonder server valt de wereldstudio terug op
  kopieer-en-plak (*⋯ Meer* in de editor).

### Open werk

Staat er iets open in je werkmap, dan weigert elke wissel — de studio ruimt nooit
iets op zonder dat jij het zegt. Onder *⋯ Meer* staat dan wát er openstaat,
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

Een wereld toevoegen: *+ Nieuwe wereld*, tekening erop, haltes zetten, schat
maken, *🚀 Publiceer*. Zie hierboven, en `docs/UITBREIDEN.md`.
