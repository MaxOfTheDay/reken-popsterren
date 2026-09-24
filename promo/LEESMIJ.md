# Promo

Het promofilmpje en het bewegende logo van Rekensterren. Staat los van het spel:
niets hieronder wordt door `index.html` of `sw.js` geladen.

| bestand | wat |
|---|---|
| `rekensterren-promo.mp4` | het filmpje, 26 s, 1920×1080, zonder geluid |
| `rekensterren-logo.mp4` | alleen het logo: het merkteken dat het spelogo wordt (de eerste 8,5 s) |
| `poster.jpg` | de eindkaart als stilstaand beeld |
| `promo.html` | de bron. Open hem in een browser en hij speelt in een lus |
| `render.js` | maakt er beeld voor beeld een mp4 van |
| `beelden/` | de schermen uit het echte spel (`npm run shots`, 390×844) |

Opnieuw maken, na een wijziging in `promo.html`:

```sh
node promo/render.js               # -> rekensterren-promo.mp4
node promo/render.js logo 0 8.5     # -> rekensterren-logo.mp4
```

Nodig: Playwright (zoals voor `npm test`) en een ffmpeg met libx264; staat die
niet op het pad, zet dan `FFMPEG=/pad/naar/ffmpeg`.

Het spel veranderd? Draai `npm run shots -- promo` en zet de nieuwe schermen als
jpg in `beelden/`.
