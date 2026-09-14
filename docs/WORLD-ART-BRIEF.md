# Reken Popsterren — world art brief

What a world map has to be drawn around, and why. Every number here was measured in
Chromium at **390 × 844** (the design target) against the app as of the commit that
added this file; §8 says how to re-measure after a layout change.

The point of this document: **code is cheap to change, a drawing is not.** Everything
below is geometry the artwork cannot absorb later. Anything *not* listed here — where the
stops sit, how the road bends, the world's colours — is set after the drawing exists,
in the world studio (`npm run preview` → Wereldstudio), so don't try to get it right
while drawing.

---

## 1. The canvas

**1080 × 2160 px, WebP.** Portrait 1:2.

The map is drawn **cover**, not contain: it fills the screen edge to edge and whatever
sticks out is cropped. The aspect was chosen so the crop stays small on the phones this
is actually played on:

| screen | frame the art is drawn into | cropped |
|---|---|---|
| 390 × 844 (iPhone 14) | 422 × 844 | 7.6% horizontally, 3.8% per side |
| 412 × 915 (Pixel) | 457 × 915 | 9.9% horizontally, 5% per side |
| 320 × 568 (small) | 320 × 640 | nothing horizontally; scrolls 72px |
| 768 × 1024 (tablet) | 768 × 1536 | nothing horizontally; scrolls 512px |

Taller art (9:16) would crop *more* horizontally on tall phones; shorter art would leave
coloured bands. 1:2 is the middle.

At 390 × 844 the art is displayed at **2.56 art px per CSS px**, so 1080 px of art is
about 1266 device px on a 3× phone — a 17% upscale. For a painted illustration that is
invisible. If you want headroom anyway, **1290 × 2580** works identically and costs
roughly +40% file size (budget: ~110 kB per world at quality 0.82, × 6 worlds).

The studio converts and crops for you — drop any source size on the *Wereldkaart* row in
the **Beelden** tab and it writes `assets/world/<id>-map.webp` at the right size, cover-
cropped, centred, and bumps the service-worker cache.

---

## 2. The safe zone

Two pieces of app chrome lie **on top** of the drawing, opaque:

| | height | as % of the screen | in art px |
|---|---|---|---|
| top bar (avatar · world name · diamonds) | 66 px | 7.8% | 169 |
| bottom nav (Kaart / Kleedkamer / Trofeeën) | 82 px | 9.7% | 210 |

A third thing is not chrome but takes room: **the star (the player's avatar) stands above
her current stop**, 173 × 215 art px, so a stop near the top needs clear sky above it or
her head goes behind the bar.

That gives the contract:

> **Stop centres live inside x 8–92%, y 21–84%.**
> In art pixels: **x 86 … 994, y 454 … 1814.**

The dashed green box in the world studio (`?debug&mapedit` → **raster**) is exactly this
rectangle — draw against that, not against these numbers.

Everything outside the box is still seen (it is the world, not padding) — it just must not
carry anything the player has to *reach*.

---

## 3. What the drawing has to provide

Eight stops per world, evenly spread down the safe zone:

| | CSS px @ 390 | art px |
|---|---|---|
| stop medallion (the numbered circle) | 52 | **130** |
| medallion + its three stars | 71 | 182 |
| vertical rhythm between stops | 76 | **194** |
| the star standing on a stop | 67 × 84 | **173 × 215** |

So, concretely:

1. A **landing** at each stop — a ledge, a plateau, a clearing — of at least **170 art px**
   across, so the medallion sits *on* something instead of floating over a waterfall.
2. About **215 art px of quiet above each landing**, where she stands. Don't put a detail
   there you'd miss.
3. A **route** connecting the landings that reads bottom-left to top-right and back: a
   path, stepping stones, a bridge. The app draws its own dashed road over it, so the
   painted route only has to be *plausible*, not exact — but the two should not disagree.
4. Something at the top worth arriving at. The last stop of a world is the world's finale.

The ledges do not have to be at the exact stop positions: the studio moves the stops onto
your art afterwards, and bends each piece of road around obstacles with its own control
point. Rhythm and size matter; precise coordinates don't.

---

## 4. What the app puts on top of your drawing

Plan the value range around these, because they are painted over the art and cannot move
behind it:

- **Stop medallions** — dark purple fill, white numeral, 0.55cqw light ring. Locked ones
  are grey. The current one is solid gold.
- **Three stars** under each medallion — gold when earned, translucent grey when not. The
  grey ones are the weakest element on the screen; on a busy, bright background they turn
  to mush.
- **The dashed road** — one colour per world (`weg` in the studio, `--w-road`), default
  white at 42%. On a bright world set it to something dark; that field exists precisely
  because white roads vanish on lava and ice.
- **The star**, a flat vector doll in bright colours.

The practical rule: **keep the corridor the route runs through mid-to-dark, and save the
bright values for the edges.** A fire world can be blazing along the sides as long as the
ledges themselves are rock. That is what the reference mockup does.

---

## 5. What is *not* fixed by this document

Decide these after the drawing exists — in the studio, in minutes:

- where each stop sits, and how the road bends between them
- the four world colours (road, sky, depth, glow)
- the world's name and icon
- which world comes in which order

And two things that are deliberately **not** in the art:

- **The world's name.** Put an emblem in the drawing if you like — a carved sign, a banner,
  a crest — but not the word, or the world can never be renamed without redrawing it.
- **Anything numbered.** The stop numbers are drawn by the app.

---

## 6. Before you commission a drawing

- [ ] The world has an identity that survives at thumbnail size (ice, jungle, fire…).
- [ ] It reads bottom-to-top: the player climbs.
- [ ] Eight landings, ~194 art px apart, at least 170 px across, inside x 86–994 /
      y 454–1814.
- [ ] Quiet sky above each landing (215 px).
- [ ] The corridor is mid-to-dark; bright values live at the edges.
- [ ] Nothing that must be *seen* in the top 169 px or the bottom 210 px.

## 7. After you drop it in

In the studio (`npm run preview` → Wereldstudio):

- [ ] **Beelden** → drag the file onto *Wereldkaart*. It converts, crops and saves.
- [ ] **Werelden** → drag the eight stops onto the landings, drag the green diamonds to
      bend the road around obstacles.
- [ ] Set **weg** to a colour that survives this world.
- [ ] **Toestel** → check `telefoon staand`, `kleine telefoon` and `tablet staand`.
      The first must fit in one screen with nothing behind the bars.
- [ ] **Voorbeeld** → open the set in real windows and look at it once at true size.
- [ ] **Publiceren** → *Zet in het spel*, then commit, then publish.

---

## 8. How these numbers were produced

All of it from the running app, not from the stylesheet:

```js
// heights of the two bars, and whether a stop is behind one
const kop = document.querySelector('#screen-map .hub-sticky').getBoundingClientRect();
const nav = document.querySelector('.main-nav').getBoundingClientRect();
[...document.querySelectorAll('.tour-stop')].filter(s =>
  s.getBoundingClientRect().top < kop.bottom ||
  s.getBoundingClientRect().bottom > nav.top);

// is a button actually reachable, or is something on top of it?
const r = el.getBoundingClientRect();
document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);

// art px per CSS px
const f = document.querySelector('.world-frame').getBoundingClientRect();
1080 / f.width;
```

Re-run these after any change to the top bar, the bottom nav, the medallion size or the
star's size — those four are the only things that move the safe zone. If one of them
changes, update §2 and §3 here *and* `.me-safe` in `startMapEdit()`, which draws the box
in the studio; they are two copies of the same contract and drifting apart would be worse
than having no document.

---

## 9. Still open

- The six world names and their order. The ids in `WORLDS` (`ijs`, `regenboog`, `jungle`,
  `muziek`, `vuur`, `ruimte`) are placeholders and appear in filenames
  (`assets/world/<id>-map.webp`), so settling them before the first drawing saves a rename.
- Whether 1080 × 2160 or 1290 × 2580 (see §1).
