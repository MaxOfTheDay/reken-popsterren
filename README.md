# Rekensterren

Een reken- en teloefenspel voor kinderen van ongeveer 5 tot 8. Elk kind maakt
haar eigen ster, speelt shows in een reeks werelden, en verdient daarmee
sterren, diamanten, kleren en trofeeën.

Het is één bestand — `index.html` — met de HTML, de CSS en de JavaScript erin.
**Er is geen bouwstap en geen bibliotheek.** Je opent het bestand en het spel
draait. Dat is met opzet: de app moet het doen op een oude tablet in een
woonkamer, zonder server, zonder netwerk en zonder update-ritueel.

| bestand | wat het is |
|---|---|
| `index.html` | het hele spel: stijlblad, schermen, spellogica, wereldstudio |
| `sw.js` | service worker — offline spelen na het eerste bezoek |
| `manifest.json` | PWA-gegevens (naam, iconen, kleuren) |
| `assets/world/*.webp` | de wereldtekeningen |
| `assets/font/` | het lettertype (Fredoka) en zijn licentie. De app haalt niets van buiten |
| `assets/branding/` | het merk: het spelogo en het merkteken. De meesters staan in `source/`, de app laadt de afgeleiden ernaast (`npm run merk`) |
| `icon-*.png` | de app-iconen, ook uit `npm run merk` |
| `test/` | de keuringen, de browsertests én de Dev Studio (zie `docs/TESTEN.md`) |
| `DEV-STUDIO.md` | starten, takken en PR's testen, werelden nakijken |
| `docs/` | de achtergrond: waaróm iets is zoals het is |

## Draaien

```
npm run studio                 # de Dev Studio — http://localhost:8099/studio
npm run snelkoppeling          # zet er een icoontje voor op je bureaublad
open index.html                # het spel, zonder meer
npm install                    # alleen nodig voor de browsertests
npm run check                  # de keuringen (Node, ± 2 seconden)
npm test                       # alles, inclusief echte Chromium (minuten)
npm run preview                # dezelfde server, zonder zelf een venster te openen
npm run merk                   # de merkbestanden opnieuw uit hun meesters
npm run achtergrondproef       # houdt de voorgrond het als de tekening verandert?
```

**`npm run studio` is de gewone manier van werken.** Eén scherm met links de
bedieningen en rechts het échte spel op telefoonmaat, met twee werkbladen:
**Testomgeving** (welke tak of PR er draait, het spel in een stand zetten zonder
ernaartoe te spelen, toestelmaten) en **Wereldstudio** (alle werelden met hun
tekening, gegevens en gebreken). Daarnaast een hoekje **App & merk** voor het
beeld dat bij de héle app hoort: startscherm, spelogo, merkteken, app-icoon.
Zie **`DEV-STUDIO.md`** — dat is kort.

Daarbinnen zit de **wereldstudio** (`?debug&mapedit`, of de knop *Open
wereldstudio*): daar maak je werelden op de echte kaart en schrijf je het
`WORLDS`-blok terug naar `index.html`. Zie `docs/UITBREIDEN.md`.

## De vijf begrippen

Wie iets aan het spel verandert heeft aan deze vijf genoeg om zich te
oriënteren; de rest staat als commentaar bij de code zelf.

* **Wereld** — een stuk van de reis met een eigen tekening en sfeer.
  Alles wat de app over een wereld weet staat in `WORLDS` in `index.html`.
* **Show (level)** — één optreden. Levels lopen dóór de werelden heen: `p.level`
  is één getal van 1 tot `WORLD_LAST + 1`.
* **Ster** — wat een show opleverde (1, 2 of 3). `p.stars[level]`. Dít is de
  opslag; "welke wereld is uit" wordt eruit **afgeleid** en nooit bewaard.
* **Grens (frontier)** — de eerste uitgebrachte wereld die nog niet uit is.
  Ook afgeleid (`frontierWorld`). Is er geen meer, dan is het toegift-stand.
* **Diamant** — de munt van de kleedkamer. Verdien je met spelen, geef je uit
  aan spulletjes. Zie `docs/DIAMANTEN.md`.

## Waar dingen staan in `index.html`

Bovenaan het `<script>`-blok staat een inhoudsopgave. Zoek op de sectienaam
(bijvoorbeeld `= Telmodus` of `= Werelden`) om ergens te komen; regelnummers
staan er bewust niet bij, want die verouderen meteen.

## Verder lezen

| als je... | lees dan |
|---|---|
| de studio wilt starten of een PR wilt testen | `DEV-STUDIO.md` |
| een wereld, spulletje of trofee wilt toevoegen | `docs/UITBREIDEN.md` |
| tests wilt draaien of begrijpen | `docs/TESTEN.md` |
| aan het laden, de cache of het bijwerken komt | `docs/LADEN.md` |
| een wereldtekening laat maken | `docs/WORLD-ART-BRIEF.md` |
| aan de prijzen of de economie komt | `docs/DIAMANTEN.md` |
| wilt weten waarom de voortgang zo werkt | `docs/PROGRESSION-REVIEW.md` |
| aan kleur of letter komt | het blok **DE AFSPRAAK** bovenaan het stijlblad in `index.html`, en `docs/UITBREIDEN.md` |
| aan het uiterlijk werkt | `docs/ART-PLAN.md`, `docs/ART-DIRECTION.md` |
| het logo of het app-icoon vervangt | `docs/MERK.md` |

De documenten in `docs/` zijn grotendeels *plandocumenten uit een bepaalde
fase*: ze leggen uit waarom er iets is besloten, niet wat er vandaag staat.
Waar plan en code uit elkaar lopen wint de code. `UITBREIDEN.md`, `TESTEN.md` en
`LADEN.md` zijn de drie die wél bijgehouden worden als handleiding.
