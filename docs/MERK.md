# Het merk

Kort: **er is één meester per merkbeeld, de app laadt hem nooit, en één commando
maakt alles wat de app wél laadt.**

```
assets/branding/source/        de meesters — blijven zoals ze zijn
  wordmark.webp   2000×667     "Rekensterren", doorzichtig
  mark.webp       1254×1254    de compacte R-ster, doorzichtig
  appicon.webp    1254×1254    het vierkante paarse app-icoon

npm run merk                   maakt hieruit:

assets/branding/wordmark.webp  1080×360   het spelogo op de sterrenkeuze
assets/branding/mark.webp      512×512    het merkteken — ligt klaar, nog niet in gebruik
icon-192.png                   192×192    favicon, apple-touch-icon, manifest
icon-512.png                   512×512    manifest, purpose "any"
icon-maskable-512.png          512×512    manifest, purpose "maskable"
```

De tabel die dit bepaalt staat in `test/merk.js` (`AFGELEID`) — daar staat per
bestand ook wáárom die maat, die kwaliteit en die uitsnede.

## Een merkbeeld vervangen

1. Zet het nieuwe beeld over de meester heen in `assets/branding/source/`,
   met dezelfde naam. Groot en scherp mag: dit bestand gaat de app niet in.
2. `npm run merk`
3. `npm run check` — de keuring (zaak I in `test/inhoud.test.js`) kijkt na dat
   elke afgeleide er is, klein genoeg blijft, en dat er nergens in de app een
   meester wordt opgehaald.
4. Kijken: `npm run preview`, en het startscherm op een telefoonmaat.

Zet er nooit een meester rechtstreeks in de opmaak, ook niet "even voor de
scherpte": dat is precies wat stap 3 tegenhoudt.

## Waar het gebruikt wordt

| bestand | waar |
|---|---|
| `assets/branding/wordmark.webp` | `<h1 class="spellogo">` op de sterrenkeuze — het enige merkbeeld dat in beeld komt |
| `assets/branding/mark.webp` | nergens. Het ligt klaar voor een splash of een klein gebrand vlak; het staat niet overal in de app omdat het bestaat |
| `icon-192.png` | `<link rel="icon">`, `<link rel="apple-touch-icon">`, manifest |
| `icon-512.png`, `icon-maskable-512.png` | manifest |

## Twee dingen die makkelijk misgaan

**Maskeerbaar is niet hetzelfde als vierkant.** Een Android-launcher knipt uit
het maskeerbare icoon zelf een cirkel, een vierkant of een squircle, en alles
buiten de middelste 80% kan wegvallen. Daarom is `icon-maskable-512.png` een
eigen bestand met een eigen uitsnede (6,5% van elke kant eraf, zodat het paars
van rand tot rand loopt) en draagt `icon-512.png` alleen `purpose: "any"`.
Eén icoon dat "any maskable" tegelijk is, is altijd voor één van de twee fout.

**De iconen staan in de wortel, niet onder `assets/`.** Dat is geen slordigheid:
`sw.js` behandelt álles onder `/assets/` als tekening (voorraad-eerst, in een
cache die niet met een uitgave meegaat), en de iconen horen bij de schil. Zie
`docs/LADEN.md`.

## Wat de studio ermee doet

Het tabblad **Beelden** van de wereldstudio (`?debug&mapedit`) heeft onderaan een
vak *Merk*: de naam uit het manifest, en per meester welke bestanden eruit rollen
en wat ze wegen. **Alleen kijken.** Er valt niets te slepen, en dat is met opzet
— een merkbeeld is geen bestand maar een keten van één meester naar vijf
afgeleiden in twee formaten. Wie daar één schakel zou overschrijven houdt vier
bestanden over die nog bij de oude meester horen. De weg loopt dus via de twee
stappen hierboven.
