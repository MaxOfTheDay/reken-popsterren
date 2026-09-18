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
| `test/` | de keuringen en de browsertests (zie `docs/TESTEN.md`) |
| `docs/` | de achtergrond: waaróm iets is zoals het is |

## Draaien

```
open index.html                # het spel, zonder meer
npm install                    # alleen nodig voor de browsertests
npm run check                  # de keuringen (Node, ± 2 seconden)
npm test                       # alles, inclusief echte Chromium (minuten)
npm run preview                # http://localhost:8099 — de app over http
```

`npm run preview` is ook de weg naar de **wereldstudio**: die staat op
`?debug&mapedit`, of via de knop *Studio* rechtsonder op de voorbeeldpagina.
Daar maak je werelden op de echte kaart en schrijf je het `WORLDS`-blok terug
naar `index.html`. Zie `docs/UITBREIDEN.md`.

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
| een wereld, spulletje of trofee wilt toevoegen | `docs/UITBREIDEN.md` |
| tests wilt draaien of begrijpen | `docs/TESTEN.md` |
| aan het laden, de cache of het bijwerken komt | `docs/LADEN.md` |
| een wereldtekening laat maken | `docs/WORLD-ART-BRIEF.md` |
| aan de prijzen of de economie komt | `docs/DIAMANTEN.md` |
| wilt weten waarom de voortgang zo werkt | `docs/PROGRESSION-REVIEW.md` |
| aan het uiterlijk werkt | `docs/ART-PLAN.md`, `docs/ART-DIRECTION.md` |

De documenten in `docs/` zijn grotendeels *plandocumenten uit een bepaalde
fase*: ze leggen uit waarom er iets is besloten, niet wat er vandaag staat.
Waar plan en code uit elkaar lopen wint de code. `UITBREIDEN.md`, `TESTEN.md` en
`LADEN.md` zijn de drie die wél bijgehouden worden als handleiding.
