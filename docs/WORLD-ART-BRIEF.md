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

**Generate portrait 9:16. The app stores 1215 × 2160 px WebP.**

9:16 because that is what image generators make natively. The alternative considered was
1:2 (1080 × 2160), and it is worse for one reason: the studio would crop 11% off the width
of every generated image at import, blind and centred, and on a tablet or desktop — where
the *full* art width is shown — those strips are gone for good. Matching the generator
means one crop instead of two.

It does not change what a phone player sees. The visible slice is set by the screen, not
by what the file stores: a 412 × 915 phone shows the middle 80% of the generated scene
either way.

The map is drawn **cover**: it fills the screen edge to edge and whatever sticks out is
cropped.

| screen | frame the art is drawn into | cropped |
|---|---|---|
| 390 × 844 (iPhone 14) | 475 × 844 | 17.9% horizontally, 8.9% per side |
| 412 × 915 (Pixel) | 515 × 915 | 20% horizontally, 10% per side |
| 320 × 568 (small) | 320 × 569 | nothing horizontally; scrolls 49px |
| 768 × 1024 (tablet) | 768 × 1365 | nothing horizontally; scrolls 341px |
| 1003 × 761 (browser) | 1003 × 1783 | nothing horizontally; scrolls 1022px |
| 1440 × 900 (wide) | 415 × 737 centred | the stage — see below |

A window that is **taller than wide** fills the screen the same way and scrolls vertically.
A window that is **wider than tall** (and at least 600 px high) becomes a centred portrait
stage instead: the map as large as the height allows, with the same drawing blurred and
darkened in the margins.

The switch used to need `width ≥ 1216px` as well, on a quality argument that did not hold —
the stage is smaller than the art either way, so nothing was ever upscaled. What it did
create was a band of landscape windows below 1216 px stuck in phone mode on a wide screen,
showing 42–51% of the map (a landscape tablet at 1024 × 768 showed 42%). The 600 px floor
is there because the frame cannot go below 340 px wide, which is 604 px tall: a phone held
sideways cannot fit that, so it keeps filling the screen.

At 390 × 844 the art is displayed at **2.56 art px per CSS px**, so 1215 px of art is about
1170 device px on a 3× phone — no upscale worth naming. Generate at **1215 × 2160 or
larger**; the studio downscales. If your generator caps at 1080 × 1920, say so — storing
1080 × 1920 is better than upscaling to 1215, and it is one constant (`ART_W`/`ART_H`).

Budget: ~125 kB per world at quality 0.82, so ~750 kB for six.

**One constant.** `ART_W` / `ART_H` in `index.html` drive three things that must never
drift apart: the frame's aspect ratio, the **viewBox of the road SVG**, and the size the
studio saves. Section 7c of `test/profiles.test.js` fails if they do — see §8 for why that
test exists.

The studio converts and crops for you — drop any source size on the *Wereldkaart* row in
the **Beelden** tab and it writes `assets/world/<id>-map.webp` at the right size, cover-
cropped, centred, and bumps the service-worker cache.

---

## 2. The safe zone

The drawing runs **edge to edge, unbroken**. There is no header panel. The top of the
screen carries three light things — the player's round portrait on the left (bare, no
container), the world name in the middle and the diamonds on the right (two translucent
pills). Everything between and behind them is your illustration.

| | occupies | as % of the screen | in art px |
|---|---|---|---|
| the three top elements | top 52 px, ~⅓ of the width | 6% | 158 |
| bottom nav (Kaart / Kleedkamer / Trofeeën) | 82 px, full width, translucent | 9.7% | 210 |

A third thing is not chrome but takes room: **the star (the player's avatar) stands above
her current stop**, 199 × 249 art px. She is the reason the top of the zone used to sit so
low — see "her band" below.

Measured across eight devices. Each edge is set by a different phone, and never by the
design target:

| edge | limit | set by | why |
|---|---|---|---|
| x | **18.5%** per side | 21:9 (412 × 961) | crops the most off the sides |
| y top | **13.97%** | small phone (320 × 568) | the header is a fixed 62 px, which is a bigger bite of a short screen; the top of the medallion has to clear it |
| y bottom | **82.3%** | iPhone SE (375 × 667) | an 82 px bar on a 667 px screen — and that map does not scroll, so nothing can be pulled out from under it |

Rounded inwards, that gives the contract:

> **Stop centres live inside x 19–81%, y 14–82%.**
> In art pixels: **x 231 … 984, y 302 … 1771.**

### Her band: y 14–25%

The top used to be 23%, and that was never the header — it was her. She stands *above* her
stop and is 13.3% of the map tall, and unlike the header that 13.3% is the same bite on
every device (the header is only 6.5–10.9%). She was most of the top margin.

So she is now allowed in front of the pills instead: **when she stands close enough to
touch the header, the header dims to 18%** and she is visible straight through it. It comes
back the moment she moves on. The three top elements stay exactly where they are and stay
tappable while dimmed — the ladder and the dressing room are reachable from the top stop
like anywhere else.

What is left is the requirement that the *medallion* stays clear of the header, because a
pill on top of it would steal the tap. That is the 14%.

Practically: **a stop between y 14% and 25% is fine.** It is where the finale of a world
belongs. The only consequence is that the world name and the diamond count go quiet while
she is standing there. The studio draws that band in gold, labelled *hier dimt de
bovenbalk*; the green box is the hard edge, the gold band is a note.

The dashed green box in the world studio (`?debug&mapedit` → **raster**) is exactly this
rectangle — draw against that, not against these numbers.

Everything outside the box is still seen (it is the world, not padding) — it just must not
carry anything the player has to *reach*.

The default sling (for a world with no drawing yet) still stops at y 25%: there is nothing
to gain by making an undrawn world dim its own header.

---

## 3. What the drawing has to provide

Eight stops per world, evenly spread down the safe zone:

| | CSS px @ 390 | art px |
|---|---|---|
| stop medallion (the numbered circle) | 49 | **125** |
| medallion + its earned stars | 59 | 151 |
| invisible tap area around a stop | 64 | 164 |
| vertical rhythm between stops | 69 | **176** |
| the star standing on a stop | 78 × 97 | **199 × 249** |

A stop's own block (151 art px) now fits inside the rhythm (176), so consecutive stops no
longer overlap vertically — the stars shrank to two thirds and unearned ones are gone
entirely. The route still has to swing left and right, but for a different reason: the
**tap** area is 164 art px wide, wider than the rhythm, so two stops directly above one
another would have overlapping targets. The closest pair in the default layout is 71 CSS px
apart against a 64 px target; section 7e of the test suite fails if that margin goes.

So, concretely:

1. A **landing** at each stop — a ledge, a plateau, a clearing — of at least **175 art px**
   across, so the medallion sits *on* something instead of floating over a waterfall.
2. About **250 art px of quiet above each landing**, where she stands. Don't put a detail
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
- **Earned stars** under each medallion, gold, small and tucked tight against it. A stop
  you have not finished shows *no* stars at all rather than empty placeholders, so on a
  fresh world the map carries nothing but numbers.
- **The dashed road** — one colour per world (`weg` in the studio, `--w-road`), default
  white at 42%. On a bright world set it to something dark; that field exists precisely
  because white roads vanish on lava and ice.
- **The star**, a flat vector doll in bright colours.
- **Three light things at the top** — a bare round portrait, and two translucent pills for
  the world name and the diamonds. They float over the drawing rather than sitting on a
  panel, so whatever is behind them still shows; keep anything you want *read* (a sign, a
  landmark) out from under them. The pill text carries its own dark halo, so a bright sky
  behind it is fine. They fade to 18% whenever the star stands against them (§2).

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
- [ ] Eight landings, ~176 art px apart, at least 175 px across, inside x 231–984 /
      y 302–1771. The top one may sit in her band (y 302–540) — see §2.
- [ ] Quiet sky above each landing (250 px).
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
1215 / f.width;   // ART_W
```

Re-run these after any change to the top bar, the bottom nav, the medallion size, the
star's size, or the art aspect — those five are the only things that move the safe zone.
If one changes, update §2 and §3 here; the studio box and the pre-publish check both read
`ZONE` in `index.html`, so those two follow by themselves. Section **7c-bis** of
`test/profiles.test.js` re-measures the top edge on five devices and fails if the number
in `ZONE` stops matching what the browser does.

### The bug this section exists for

The road is an SVG with a `viewBox`; the stops are positioned in **percentages of the
frame**. Those two coordinate systems only coincide when the viewBox has the same aspect
as the frame — and for a long time it did not: the viewBox was 1080 × 1840 while the frame
was 1:2. An SVG scales its viewBox with `preserveAspectRatio="xMidYMid meet"` by default,
so the road was squeezed uniformly into the middle 719 px of an 844 px frame and centred.

Measured deviation of the *rendered* road from the stop centres, before the fix:

| screen | stop 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| 390 × 844 | 42 px | 27 | 15 | 5 | 2 | 10 | 13 | 36 |
| 768 × 1024 | 77 px | 48 | 27 | 8 | 4 | 19 | 23 | 66 |

Worst at the ends, near zero in the middle — the signature of a compressed middle section.

It hid for so long because the obvious check passes: the path **data** goes through the
stop coordinates exactly (0.0–0.2 viewBox units). Only the rendering is wrong. Any test of
this has to go through `getScreenCTM()`, not `getPointAtLength()` alone. Section 7c does.

---

## 9. The six worlds

Settled. The order is the order a player climbs them:

| # | name | id | file | icon | the look, until it is drawn |
|---|---|---|---|---|---|
| 1 | Muziekwereld | `muziek` | `assets/world/muziek-map.webp` | 🎵 | violet, hot-pink footlight |
| 2 | Snoepwereld | `snoep` | `assets/world/snoep-map.webp` | 🍭 | raspberry, mint path |
| 3 | Junglewereld | `jungle` | `assets/world/jungle-map.webp` | 🌴 | canopy green, pale leaf path |
| 4 | Piratenwereld | `piraten` | `assets/world/piraten-map.webp` | 🏴‍☠️ | night sea, rope-sand path |
| 5 | IJswereld | `ijs` | `assets/world/ijs-map.webp` | ❄️ | cold blue, pale ice path |
| 6 | Toverwereld | `tover` | `assets/world/tover-map.webp` | 🪄 | near-black midnight, lilac path |

Each world carries four colours in `WORLDS` (`theme: { sky, deep, glow, road }`). Until a
drawing exists **those colours are the world** — without them all six fall back to the same
purple and "another world" is a word rather than a place.

They are **six-digit hex, never rgba**: the studio edits them with `<input type="color">`,
which only understands `#rrggbb`. An rgba value comes back from that field as `#000000` and
gets written over on the first edit. The CSS defaults *are* translucent (road 42%, glow
34%), so the values stored per world are what those defaults look like once composited over
the background — which is why `road` is a muted tint rather than white.

**Re-check `road` when each drawing lands.** The stored colour is tuned against the flat
gradient; a bright drawing can swallow it. That is the field §7's checklist is about.

## 10. Still open

- Whether 1215 × 2160 is the right storage size for your generator, or whether it caps
  lower (see §1). One constant either way.
