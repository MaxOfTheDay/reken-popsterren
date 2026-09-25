# Promo

Het promofilmpje en het bewegende logo van Rekensterren. Staat los van het spel:
niets hieronder wordt door `index.html` of `sw.js` geladen.

| bestand | wat |
|---|---|
| `rekensterren-promo.mp4` | het filmpje, 26 s, 1920×1080, zonder geluid |
| `rekensterren-logo.mp4` | alleen het logo: het merkteken dat het spelogo wordt (de eerste 8,5 s) |
| `in-app-intro.mp4` | opname van de korte logo-intro zoals hij ín het spel speelt (zie "= Het spelogo komt binnen" in `src/20-app.js`); de intro zelf staat in de app, niet hier |
| `poster.jpg` | de eindkaart als stilstaand beeld |
| `promo.html` | de bron. Open hem in een browser en hij speelt in een lus |
| `render.js` | maakt er beeld voor beeld een mp4 van |
| `opname.js` | neemt de schermen op uit het echte spel, met Marie, Anna en Clara als voorbeeldsterren |
| `beelden/` | die schermen (390×844) en `werelden.js`, de lijst werelden van dit moment |

Opnieuw maken, na een wijziging in `promo.html`:

```sh
node promo/render.js               # -> rekensterren-promo.mp4
node promo/render.js logo 0 8.5     # -> rekensterren-logo.mp4
```

Nodig: Playwright (zoals voor `npm test`) en een ffmpeg met libx264; staat die
niet op het pad, zet dan `FFMPEG=/pad/naar/ffmpeg`.

Het spel veranderd, of een wereld erbij? Eerst opnieuw opnemen, dan renderen:

```sh
node promo/opname.js               # -> beelden/*.jpg en beelden/werelden.js
```

Het filmpje noemt nergens een aantal werelden. De achtergronden lopen de lijst
in `werelden.js` af, dus een nieuwe wereld komt vanzelf mee.

Wie `prefers-reduced-motion` aan heeft staan, krijgt in `promo.html` de
eindkaart als stilstaand beeld in plaats van het filmpje.
