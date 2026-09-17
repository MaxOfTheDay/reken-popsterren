# Uitbreiden

Hoe je er een wereld, een spulletje of een trofee bij zet — en wat er dan
níet bijgewerkt hoeft te worden. Kort gehouden met opzet: het uitgebreide
"waarom" staat als commentaar bij de code zelf, en alles hieronder verwijst
naar de naam die je daar moet zoeken.

Eén regel geldt overal: **gebruikte id's zijn voor altijd.** Een wereld-id, een
item-id en een trofee-id staan in de opslag van kinderen die er al mee gespeeld
hebben. Hernoemen betekent kwijtraken. De naam die eróp staat mag altijd
veranderen; het id niet.

---

## Een wereld erbij

De korte versie: **één regel in `WORLDS`, één tekening, en één spulletje.**
Er is geen tweede lijst.

1. **Maak de tekening.** Formaat en compositie staan in
   `docs/WORLD-ART-BRIEF.md`. Leg hem neer als
   `assets/world/<wereld-id>-map.webp` (dat pad komt uit `wereldArtPad`).
   Begroting: ongeveer 125 kB — de keuring waarschuwt boven 200 kB.
2. **Zet de wereld in `WORLDS`**, achteraan, tussen de markeringen
   `WERELDEN-BEGIN` en `WERELDEN-EINDE` in `index.html`:

   ```js
   {
     id: 'regenboog', name: 'Regenboogwereld', icon: '🌈', levels: 8,
     beloning: 'acc_wereld_regenboog',
     art: 'assets/world/regenboog-map.webp',
     theme: { sky: '#…', deep: '#…', glow: '#…', road: '#…' },
     nodes: [ … ], curve: [ … ],
   }
   ```

   `nodes` (één per show) en `curve` (één minder) zet je niet met de hand: die
   komen uit de **wereldstudio** (`npm run preview`, dan de knop *Studio*, of
   `?debug&mapedit`). Daar sleep je de haltes op de richels van de tekening en
   schrijft *Bewaar* het blok hierboven terug in `index.html`. Laat je ze weg,
   dan slingert `defaultNodes()` er een route doorheen — speelbaar, maar niet
   mooi.

   Optioneel: `venue: { dim: .56 }` als de tekening te licht is voor de zaal,
   en `released: false` om de wereld wél te schrijven maar nog niet uit te
   brengen.
3. **Maak het beloningsspulletje** (zie hieronder) en verwijs ernaar met
   `beloning`.
4. **Draai `npm run check`.** `inhoud.test.js` kijkt na of het pad bestaat, of
   het spulletje bestaat, of het gratis is, of het nog niet aan een andere
   wereld hangt, en of het aantal haltes bij het aantal shows past.

Wat **vanzelf** meekomt, zonder dat je er iets voor doet:

| | |
|---|---|
| levelnummers | `rebuildWorldStarts()` rekent `WORLD_START`/`LAST`/`AVAIL` opnieuw uit |
| de kaart | `worldFor()` / `worldForIndex()` vinden de wereld bij een level |
| de sfeer | `theme` wordt CSS-variabelen (`applyWorldTheme`) — nooit een `if` per wereld |
| de voortgang | `worldDone()` / `frontierWorld()` tellen hem mee |
| de reis | `reisPlaatsen()` rijgt hem erbij zodra hij binnen de horizon valt |
| de zaal | `venue`, of anders `VENUE_TERUGVAL` (de kaart zelf) |
| de perfecte-wereldtrofee | `rebuildWorldBadges()` maakt `perfect-<id>` aan en hangt hem op de plank |
| de tests | elke zaak die over werelden gaat telt uit `WORLDS`, niet uit een getal |
| het laden | de tekening komt binnen als die wereld in beeld komt of bijna in beeld is — het opstarten wordt er geen byte zwaarder van |
| de cache | de service worker kent geen werelden; de nieuwe tekening komt erin bij het eerste bezoek en er hoeft geen versienummer omhoog |

Wat er over het laden te weten valt staat in `docs/LADEN.md`; de korte versie is
dat je er niets voor hoeft te doen. Wél: vervang je een bestáánde tekening onder
dezelfde naam, dan moet `ART_CACHE` in `sw.js` omhoog, anders blijven spelers de
oude zien.

**Achteraan bijplakken mag altijd. Ertussen schuiven of korter maken niet.**
Levels lopen dóór de werelden heen, dus een wereld op plek 3 inkorten
hernummert alles daarna — en dan verhuizen de sterren van een kind naar een
andere wereld. De studio waarschuwt daarvoor (`wereldControle`), maar de
waarschuwing blokkeert niets: let er zelf op.

---

## Een spulletje erbij

Alles wat een popster kan dragen staat in `ITEMS` in `index.html`. Categorieën
staan in `CATS`.

**Een gewoon winkelstuk** is één regel:

```js
{ id: 'pet_egel', cat: 'pet', name: 'Egeltje', price: 45, emoji: '🦔' },
```

Vormen die er al zijn: `color` (haar/kleren/schoenen/microfoons kleuren een
bestaande tekening), `pattern` (een patroon op de kleren), `emoji` (het
spulletje wórdt dat emoji), `spot: 'zij' | 'top'` voor accessoires.

**Een wereldbeloning** verschilt op drie punten, en alle drie zijn ze een regel:

1. **Geen `price`.** Dat is wat "niet te koop" betekent — `isBeloning()` leest
   het aan `WORLDS` af en de kleedkamer zet hem op slot tot de wereld uit is.
   Zet er wél een prijs bij en de winkel verkoopt hem gewoon.
2. **Een eigen tekening**, geen emoji: `draw()` voor op de paspop en `thumb()`
   voor het vakje in de kleedkamer.

   ```js
   { id: 'acc_wereld_regenboog', cat: 'acc', name: 'Regenboogkroon',
     full: 'Regenboogkroon', emoji: '🌈',
     draw:  () => artRegenboogkroon(),
     thumb: () => beloningThumb('72 9 56 45', artRegenboogkroon()) },
   ```

   `artX()` geeft losse SVG-vormen terug in de 200×250-ruimte van de paspop.
   Het hoofd staat daar op (100, 72) met straal 32, en **alles moet boven
   y = 94 blijven** — daar beginnen de kleren. De vier getallen in `thumb` zijn
   de `viewBox` die er strak omheen snijdt. Het `emoji` blijft staan: dat is de
   confetti van het wereldfeest en het teken vóór de naam in de balk.
3. **De wereld verwijst ernaar** met `beloning: '<item-id>'`.

`beloning.test.js` zaak I meet de tekening na: inline SVG zonder verwijzing
naar buiten, dezelfde tekening op beide basissen, boven de nek, en in dezelfde
maatfamilie als de andere beloningen.

---

## Een trofee erbij

Zelden nodig — de kast is in fase 5C met opzet uitgedund van 42 naar 18
kaartjes, en de regel eronder is: *een trofee mag alleen bestaan als hij iets
viert waar een kind trots op is.* Een teller die vanzelf oploopt is dat niet.

Moet het toch:

1. Een regel in `TROPHIES`: `{ id, emoji, name, desc, has: p => … }`, plus een
   `progress: p => trophyProgress(nu, doel, 'label')` als het getal zélf iets
   zegt ("82 / 100 sommen"). Voor iets wat één keer gebeurt géén `progress` —
   "0 / 1" is geen voortgang.
2. Het id bij een plank in `TROPHY_SHELVES`. Er zijn er vier en dat blijven er
   vier; een plank met één kaartje is geen plank.
3. Is het label van `progress` nieuw, dan één regel in
   `TROPHY_UNIT_SINGULAR` — anders staat er "Nog 1 sommen". `inhoud.test.js`
   valt om als dat vergeten wordt.

**Een perfecte-wereldtrofee hoef je nooit te maken.** `rebuildWorldBadges()`
legt er per wereld één aan, op `perfect-<wereld-id>`, met dezelfde voorwaarde
voor elke wereld (overal drie sterren). Er komt géén tweede trofee voor
"uitgespeeld": die mijlpaal geeft het spulletje uit `beloning`.

**Een trofee weghalen doe je niet door de regel te wissen** maar door het id in
`RETIRED_TROPHIES` te zetten. Kinderen die hem behaald hebben houden hem dan in
hun opslag staan; hij telt alleen niet meer mee en is niet meer te zien. Zie
`isRetiredTrophy()`.

---

## Hoe de voortgang werkt

Vijf begrippen die vroeger één getal waren. Ze staan bij elkaar in `index.html`
onder *De voortgang, afgeleid*.

```
p.stars   { level -> 1|2|3 }   DE OPSLAG. Meer wordt er over voortgang niet bewaard.
p.level   het eerstvolgende optreden, 1 .. WORLD_LAST + 1
   ↓
worldProgress(p, w)   gespeeld / perfect / sterren / max / uit / vol
worldDone(p, i)       elke show van deze wereld één keer gedaan
frontierWorld(p)      de eerste uitgebrachte wereld die nog niet uit is, of -1
allWorldsDone(p)      geen grens meer -> toegift-stand
continueWorld(p)      waar "verder" heen gaat: de grens, of anders de laatste
```

De regel waar het om draait: **een wereld is nooit uit omdat hij vóór je
huidige positie ligt.** Hij is uit omdat elk van zijn shows gespeeld is. Positie
en voltooiing zijn twee dingen, en één getal kan er maar één zijn.

Daardoor is een wereld die er later bij komt vanzelf leeg, is hij vanzelf de
nieuwe grens, en hoeft er niets gemigreerd te worden.

Drie standen die op elkaar lijken en het niet zijn:

| | |
|---|---|
| **geschreven** | staat in `WORLDS` |
| **uitgebracht** | mag gespeeld worden (`released`, zie `worldReleased`) |
| **te zien** | staat op de reis (`laatsteZichtbareWereld`: `REIS_VOORUIT` = 3 vooruit) |

## Hoe de opslag werkt

Alles staat onder één sleutel (`rekenPopsterren_v1`) als één `db` met
`db.profiles` erin. `load()` leest, `migrate(p)` vult per profiel de velden aan
die er nog niet zijn, en `save()` schrijft weg.

`migrate()` is met opzet **niet** een reeks eenmalige stappen met een
versienummer, maar een lijst regels die elke keer opnieuw mogen draaien en de
tweede keer niets meer doen. Zo hoort het te blijven: dan is een teruggezette
back-up van vóór een fase gewoon een save die nog een keer langs dezelfde regels
gaat, en hoeft niemand ooit iets te migreren of te wissen.

Wat er bewust blijft staan in oude saves: gepensioneerde trofee-id's,
`stage_*`-podia die niet meer te koop zijn, en de sterren van de oude oneindige
staart (`p.tourStars`). Ze kosten niets en ze zijn verdiend.

---

## Navigatie en terug

Er is één URL en één history-entry. Schermen staan niet in de history: de
spelstaat leeft alleen in het geheugen, dus een teruggehaald "spel"-scherm zou
kapot zijn. In plaats daarvan staat er één **wachtpost**-entry op de history,
en alleen zolang "terug" ook echt iets betekent (`syncBackGuard`). Wat een druk
betekent wordt bij élke druk opnieuw afgelezen uit wat er nú op het scherm
staat — `backTarget()` — dus er is geen tweede stapel die uit de pas kan lopen
met de zichtbare ✕/←-knoppen.

Android-terug, browser-terug en Escape doen alle drie precies hetzelfde, en
precies hetzelfde als de knop die op dat scherm zichtbaar is:

| waar je bent | terug gaat naar | zelfde als |
|---|---|---|
| modal open (stoppen / bevestigen) | modal dicht, scherm blijft | de ✕ / *Annuleer* |
| zwevende laag (trofee, rang, ladder) | bovenste laag dicht | tik ernaast |
| tandwielmenu open | menu dicht | tik ernaast |
| Show (`screen-game`) | stoppen-vraag — of meteen de kaart als er nog niets gespeeld is | de ✕ |
| Eindscherm | de kaart, op de halte die net gespeeld is | *Verder op tournee* |
| Memory | de kaart | de ← |
| Kleedkamer | de kaart — of de kast, als je daarvandaan kwam | de ← |
| Trofeeënkast | de kaart | de ← |
| Reis | de wereldkaart waar je vandaan kwam | de ← |
| Wereldkaart | het sterrenkeuzescherm | de ← |
| Ouderdeel | het sterrenkeuzescherm (en bewaart) | de ← |
| Nieuwe ster | het keuzescherm, of het ouderdeel als je daarvandaan kwam | de ← |
| Sterrenkeuze | dit is de bodem: de browser/PWA handelt het af | — |

Op de bodem verlaat terug dus de app. Dat is bewust: één druk vanaf het
keuzescherm is hetzelfde als een spel afsluiten, en overal daarboven brengt
terug je precies één laag omhoog.
