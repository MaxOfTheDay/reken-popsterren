# Promo

Het promofilmpje en het bewegende logo van Rekensterren. Staat los van het spel:
niets hieronder wordt door `index.html` geladen, en `sw.js` laat de filmpjes met
rust. Alleen de over-pagina (`over/index.html`) toont het promofilmpje en zijn
poster -- staand op een smal scherm, liggend op een breed.

| bestand | wat |
|---|---|
| `rekensterren-promo.mp4` | het filmpje, ± 20 s, 60 beelden per seconde, zonder geluid. De webversie: 1280×720, ± 3 MB |
| `rekensterren-promo-staand.mp4` | hetzelfde filmpje staand, 720×1280, ± 3,4 MB: wat de over-pagina op een telefoon toont |
| `*-hoog.mp4` | de scherpe versies op volle maat (1920×1080 en 1080×1920), om op sociale media te posten. **Niet in git** -- `render.js` maakt ze, bewaar ze zelf |
| `rekensterren-logo.mp4` | alleen het logo: het merkteken dat het spelogo wordt (de eerste 3,3 s) |
| `in-app-intro.mp4` | opname van de korte logo-intro zoals hij ín het spel speelt (zie "= Het spelogo komt binnen" in `src/20-app.js`); de intro zelf staat in de app, niet hier |
| `poster.jpg`, `poster-staand.jpg` | de eindkaart als stilstaand beeld, liggend en staand |
| `promo.html` | de bron. Open hem in een browser en hij speelt in een lus |
| `render.js` | maakt er beeld voor beeld een mp4 van |
| `opname.js` | neemt de schermen op uit het echte spel, met Marie, Anna en Clara als voorbeeldsterren |
| `beelden/` | die schermen (390×844) en `werelden.js`, de lijst werelden van dit moment |

Opnieuw maken, na een wijziging in `promo.html`:

```sh
node promo/render.js               # -> rekensterren-promo.mp4
node promo/render.js promo-staand  # -> rekensterren-promo-staand.mp4 (promo.html?staand)
node promo/render.js logo 0 3.3     # -> rekensterren-logo.mp4
```

De posters zijn het laatste beeld: de eindkaart, die in de opname blijft staan
(in de lus in de browser vervaagt hij):
`ffmpeg -sseof -0.1 -i rekensterren-promo-staand-hoog.mp4 -frames:v 1 -q:v 4 poster-staand.jpg`.

Wat het filmpje over het rekenen zegt, moet kloppen met het spel (zie SCHERMEN
in `promo.html`). De twee schermen uit het ouderdeel neemt `opname.js` op met
een Marie die plus, min en maal tot 20 oefent en een paar lastige sommen heeft.

Nodig: Playwright (zoals voor `npm test`) en een ffmpeg met libx264; staat die
niet op het pad, zet dan `FFMPEG=/pad/naar/ffmpeg`.

Het logo in het filmpje is `assets/branding/logo-lagen.webp`: het spelogo in
veertien lagen (de R, elke letter los, de ster en de zwaai), geknipt uit de meester met `npm run lagen` (zie `test/lagen.js`). De
losse lagen op volle maat staan in `assets/branding/source/lagen/`.

Het spel veranderd, of een wereld erbij? Eerst opnieuw opnemen, dan renderen:

```sh
node promo/opname.js               # -> beelden/*.jpg en beelden/werelden.js
```

Het filmpje noemt nergens een aantal werelden. De achtergronden lopen de lijst
in `werelden.js` af, dus een nieuwe wereld komt vanzelf mee.

Wie `prefers-reduced-motion` aan heeft staan, krijgt in `promo.html` de
eindkaart als stilstaand beeld in plaats van het filmpje.
