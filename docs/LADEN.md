# Laden, cache en bijwerken

Wat er wanneer binnenkomt, wat de service worker bewaart, en wat een
geïnstalleerde speler merkt van een nieuwe versie. Eén bladzijde; de redenen
staan bij de code zelf (`index.html`, sectie *Wat er geladen wordt, en wanneer*,
en `sw.js`).

De vuistregel waar alles uit volgt:

> **Het aantal werelden groeit. Wat de app bij het opstarten doet, mag daar niet
> in meegroeien.**

## Wanneer komt wat binnen

| moment | wat er opgehaald wordt |
|---|---|
| opstarten, startscherm | **geen enkele wereldtekening** |
| een ster aanraken | de tekening van de wereld waar díe ster staat — één bestand, op pointerdown |
| de kaart opent | die wereld, plus hooguit één buurwereld die al open is |
| op de laatste twee shows van een wereld | de volgende wereld, vast alvast |
| de reis opent | alleen de bestemmingen in de buurt van het venster (`IntersectionObserver`, 60% marge) |
| een show beginnen | niets extra's — de zaal leent de wereldtekening (`VENUE_TERUGVAL`) |

Voorladen gaat altijd via `naDeRust()` (`requestIdleCallback`, 1200 ms
uiterlijk): een vooruitgehaald bestand mag nooit concurreren met de tekening die
er nú moet staan. `ART_GEHAALD` onthoudt wat er al aangevraagd is; een aanvraag
die mislukt wordt weer vergeten, zodat een wegvallend net niet betekent dat die
wereld deze sessie nooit meer probeert.

**Als er een wereld 7, 8 of 9 bij komt verandert hier niets.** Er staat nergens
een lus over `WORLDS` die een tekening aanraakt, en `sw.js` kent geen werelden.
Nagemeten met een kopie van `index.html` met acht werelden: exact hetzelfde
verkeer als met zes. `rondgang.test.js` zaak 12 houdt dat vast.

## Wachten hoeft niet: de wereld draagt zichzelf

Een wereldtekening is ~300 kB en 1215×2160. Hij komt daarom bínnen terwijl het
scherm er al staat, en niet ervoor. Dat mag, omdat `.world-frame` drie
achtergrondlagen heeft: de tekening bovenop, en daaronder het verloop in de
kleuren van de wereld zelf (`--w-sky`, `--w-deep`, `--w-glow`). Een laag die nog
niet te tekenen is, tekent niet — dan staat de laag eronder er.

Daar hoeft dus niets voor getimed te worden, en het is meteen de terugval voor
een wereld die (nog) geen tekening heeft of waarvan het bestand weg is: de kaart
is dan gewoon een wereld met lucht, gloed en horizon. Een wereld is speelbaar
vóórdat hij getekend is.

## De service worker: twee voorraden

| voorraad | wat erin zit | strategie | naam |
|---|---|---|---|
| schil | `index.html`, manifest, iconen | netwerk-eerst, met een grens van 4 s | `rekenpop-v45` — hoeft **niet** omhoog bij een gewone uitgave (zie hieronder) |
| tekeningen | alles onder `assets/` | cache-eerst | `rekenpop-art` — **blijft staan** |

Waarom gescheiden: een tekstwijziging in het spel hoort geen twee megabyte
tekeningen opnieuw over de telefoondata van een gezin te trekken. De tekeningen
veranderen vrijwel nooit.

Verder:

* Alleen een écht antwoord gaat de voorraad in (`resp.ok`, niet opaque). Een 404
  bewaren in een cache-eerst-voorraad betekent dat die wereld voorgoed stuk is.
* Bewaren gaat op het pad zonder `?…`, zodat `?debug` niet een tweede kopie maakt.
* De terugval op `index.html` geldt alleen voor een schermwissel — een mislukte
  aanvraag naar een plaatje hoort geen pagina met HTML terug te krijgen.
* Het lettertype van Google gaat langs de gewone weg; de browsercache doet dat
  werk al, en offline valt de tekst netjes terug (`display=swap`).
* Het spel stuurt na het opstarten één keer door welke tekeningen er vandaag
  bestaan; wat daar niet bij hoort gaat uit de voorraad. Zo blijft er niets van
  een verwijderde of hernoemde wereld achter.

### Wanneer moet `CACHE` omhoog?

`CACHE` (de schil) hoeft **niet** met de hand omhoog bij een gewone uitgave: hij
is netwerk-eerst, dus nieuwe code komt vanzelf binnen. Omhoog zetten is alleen
nodig als je zeker wilt weten dat alle oude schil-bestanden weg zijn.

`ART_CACHE` gaat omhoog als je een bestáánde tekening vervangt onder dezelfde
naam. Een níeuwe naam (een nieuwe wereld) hoeft niets: die staat nog nergens in
de voorraad.

## Wat een speler merkt van een nieuwe versie

De weg is: tak → PR → samenvoegen met `main` → GitHub Pages → browser.

1. De speler opent de app (tabblad of geïnstalleerde PWA).
2. `index.html` wordt van het net gehaald. Is er net iets uitgebracht, dan is dat
   meteen de nieuwe versie. GitHub Pages zet er zelf een korte houdbaarheid op
   (orde van minuten), dus vlak ná een uitrol kan het één keer de vorige zijn.
3. De browser kijkt ondertussen of `sw.js` veranderd is. Zo ja: installeren,
   `skipWaiting`, en bij het activeren gaan de voorraden weg die niet meer op de
   bewaarlijst staan.
4. Klaar. **Geen sitegegevens wissen, geen opnieuw installeren, geen hard
   verversen.**

Offline of op een net dat blijft hangen: na 4 seconden staat het spel er uit de
voorraad. Dat is met opzet een grens en geen oneindig geduld — een telefoon met
één streepje laat een `fetch` minutenlang openstaan, en dan kijkt een kind naar
een leeg scherm terwijl het hele spel op het toestel staat.

### Éénmalig bij de overgang naar twee voorraden

De oude voorraad heette `rekenpop-v44` en had de tekeningen erin. Die gaat weg
bij het activeren, dus de eerste keer komen de tekeningen van bezochte werelden
één keer opnieuw binnen. Daarna niet meer bij elke uitgave. Er is geen actie voor
nodig en er gaat geen voortgang verloren: de opslag van een speler staat in
`localStorage` en die raakt een service worker niet aan.

## Offline

| situatie | wat er gebeurt |
|---|---|
| app al een keer geopend | start en speelt gewoon — schermen, sommen, kleedkamer, trofeeën |
| een wereld waar ze eerder was | de tekening staat in de voorraad |
| een wereld waar ze nog nooit was | de kaart opent op de kleuren van die wereld; alles werkt, alleen de tekening ontbreekt tot er weer net is |
| nooit eerder geopend | geen app — er valt niets te bewaren wat er nog niet is |

## Venster, veilige zone en toetsenbord

* `html, body { height: 100% }`, niet `100vh`. Daardoor klopt de hoogte ook als
  de browserbalk in- of uitklapt. Nagemeten: van 844 naar 700 en terug, en
  liggend en weer staand, blijft de balk op 10 px van de onderrand en is er nooit
  zijwaartse scroll.
* De veilige zone onderaan loopt via `--veilig-onder`
  (`env(safe-area-inset-bottom)`) naar `--balk-ruimte`; elk scherm mét vaste
  navigatie telt daar zijn eigen lucht bij. Bovenaan staat niets: er is geen
  `viewport-fit=cover`, dus de browser kadert de veilige zones zelf af.
* Alles wat vast onderin staat (`.main-nav`, `.dress-bar`) hoort met `absolute`
  of met de `--balk-*`-maten te werken. **Let op:** `.main-nav` draagt een
  `transform` én een `backdrop-filter`, en allebei maken van de balk het
  inhoudsblok voor alles wat eronder `fixed` staat. Een `position: fixed` met
  `left: 0; right: 0` daarbinnen is dus níet schermbreed — dat was de donkere
  rechthoek rond de navigatie die in fase 6B is weggehaald.
* Enter in een naamveld betekent "klaar met dit veld": het toetsenbord gaat weg,
  en is het formulier af dan is het meteen dezelfde tik als op Klaar.

## Zelf nameten

```
npm run preview                     # http://localhost:8099 — de app over http
```

De service worker draait alleen over http(s), niet over `file://`. In de
ontwikkelaarsgereedschappen van Chrome:

* **Application → Service Workers** — welke versie er staat, *Offline* aanvinken
  om de terugval te zien.
* **Application → Cache Storage** — er horen er twee te staan, en er hoort geen
  wereldtekening in de schil te zitten.
* **Network → Throttling** — met *Slow 3G* zie je de wereldkleuren staan tot de
  tekening er is. Zo hoort het.

De geïnstalleerde stand test je door de app te installeren (menu → *App
installeren*) en hem daarna te openen met het net uit. Wat er anders is dan in
een tabblad: geen adresbalk (dus geen in- en uitklappende browserbalk) en
`display: fullscreen` uit het manifest.
