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

> **Stale since FASE 4D–4F (world-map avatar visibility work).** The star's size and how
> deep she sinks into her stop changed twice since these numbers were measured, and
> `ZONE.y0` moved from 14 to 18 (`y0kop` from 25 to 28) to give her room again — see the
> comment above `const ZONE` in `index.html` for the current reasoning. The numbers below
> (199×249 art px, the y 14–25% band, "her band" section) describe the **old** measurement
> and need a fresh pass per §8 before they're trusted again; `ZONE` in the code and test
> 7c-bis are the current source of truth in the meantime.

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

### One soft spot at the bottom centre

The bottom edge was measured against the **navigation bar**. Two small controls float
*above* that bar and were never part of the sum: the memory button (bottom right, only on a
counting star) and the "⟲ back to your own world" pill (bottom centre, only while you are
looking at a world other than the one you play in). Both now sit flush against the nav and
have been slimmed down, but on a short screen (iPhone SE, 375 × 667) the band left between
y 82% and the bar is only about 14 px — less than either control is tall.

So: **y 82% holds for the tap target and the medallion, but a stop parked at the very
bottom centre can have its star tab clipped by the back pill on a short phone.** Keep the
last stop of a world's bottom row a little above y 80%, or off the centre line, and there
is nothing to think about. The default sling does exactly that (it now runs y 80 → 25
rather than 82 → 25). Section 7f of the test suite measures both controls against every
world and fails if either one covers a medallion's heart or a star tab.

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

The dashed green box in the world studio (`?debug&mapedit` → **veilige zone**) is exactly this
rectangle — draw against that, not against these numbers.

Everything outside the box is still seen (it is the world, not padding) — it just must not
carry anything the player has to *reach*.

The default sling (for a world with no drawing yet) still stops at y 25%: there is nothing
to gain by making an undrawn world dim its own header. Its vertical step (55% over seven
gaps = 13.97 cqw) is the tightest spacing in the game, and therefore the ceiling on how
tall a tap target may be — see §3.

---

## 3. What the drawing has to provide

Eight stops per world, evenly spread down the safe zone:

| | CSS px @ 390 | art px |
|---|---|---|
| stop medallion (the numbered circle) | 49 | **125** |
| medallion + its star tab | 60 | 153 |
| invisible tap area around a stop | 68 × 63 | **175 × 162** |
| vertical rhythm between stops | 66 | **170** |
| the star standing on a stop | 78 × 97 | **199 × 249** |

A stop's own block (153 art px) fits inside the rhythm (170), so consecutive stops do not
overlap vertically. The route still has to swing left and right, but for a different
reason: the **tap** area is 175 art px wide, wider than the rhythm, so two stops directly
above one another would have overlapping targets.

The tap area is the number to watch, and it is no longer a circle. A stop is a `<button>`,
and a button takes taps across its whole box — the old 64 px disc sat entirely inside that
box and did nothing, so neighbouring stops really overlapped by a wide margin and the DOM
order decided who won. The button now takes no taps at all; a single rectangle does, sized
to cover the medallion *and* the star tab beneath it, because the tab belongs to the same
stop and has to open the same show.

That rectangle can only be as big as the tightest pair of stops allows. Two targets overlap
as soon as |dx| < width **and** |dy| < height, and the tightest pair anywhere — over all six
written worlds and the default sling — is the sling itself: dx 4.03 cqw, dy 13.97 cqw. So
the height (13.3 cqw) is what sits against the wall, with 0.67 cqw to spare; the width
(14.4 cqw) runs up against snoep 6–7 (dx 14.50 cqw). **Do not place two stops closer than
about 14.5 cqw apart in either axis.** Section 7e of the test suite measures the real
targets with `elementFromPoint` — not these numbers — and fails if two of them touch or if
either side drops below 40 px on the smallest phone.

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
- **A star tab** under each *played* medallion: a dark plum pill, tucked behind the bottom
  of the circle, holding three star slots — gold for earned, pale and outlined for not.
  Always three, so 1/3, 2/3 and 3/3 are three silhouettes instead of something to count.
  A stop you have not played yet (locked, or the one you are on) shows no tab at all, so a
  fresh world still carries nothing but numbers. The tab brings its own dark backing, so it
  does not need help from the drawing.
- **The dashed road** — one colour per world (`weg` in the studio, `--w-road`), default
  white at 42%, with a dark plum under-stroke beneath the whole route (3 units peeking out
  each side). That under-stroke is what keeps the gold readable on sand, on a waterfall and
  on a bright sky, so `weg` no longer has to carry legibility on its own — pick it for the
  *mood* of the world and let the under-stroke do the work.
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
- [ ] Eight landings, ~170 art px apart, at least 175 px across, inside x 231–984 /
      y 302–1771. The top one may sit in her band (y 302–540) — see §2; keep the bottom
      one off the centre line or above y 1730 — see §2, "one soft spot".
- [ ] Quiet sky above each landing (250 px).
- [ ] The corridor is mid-to-dark; bright values live at the edges.
- [ ] Nothing that must be *seen* in the top 169 px or the bottom 210 px.

## 7. After you drop it in

In the studio (`npm run preview` → Wereldstudio):

- [ ] **Werelden → Tekening** → drag the file onto the artwork box. It converts, crops
      and saves, and reports the real dimensions and aspect ratio back. If you dropped the
      file in `incoming/` instead, it shows up there as *Nieuw* next to *Huidig* with one
      button: **Gebruik deze**.
- [ ] **Werelden → Haltes & weg** → drag the eight stops onto the landings, drag the green
      diamonds to bend the road around obstacles.
- [ ] **Kleuren** → *haal uit de tekening* proposes all four from the artwork (and picks a
      **weg** that measurably survives the darkest stretch of this world). Override freely;
      *↺ standaard* puts them back.
- [ ] **Beloning** → pick the cosmetic this world hands out, and *bekijk* it on the doll.
- [ ] **stand** (top of the panel) → walk through all five: `op slot`, `net begonnen`,
      `halverwege`, `uit`, `perfect`. `perfect` is the one that must feel like a reward.
- [ ] **toestel** → check `telefoon`, `kleine telefoon` and `tablet`. The first must fit in
      one screen with nothing behind the bars.
- [ ] **⧉** → open it in a real window at that size (Shift-click for all sizes side by
      side). A real window, not a scaled box: the landscape fallback keys off the viewport.
- [ ] **Publiceren** → *kijk alle werelden na*, then *Zet in het spel*, then commit, then
      publish.

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

**Where the two chrome numbers live.** The map's header height is set by `--rand` and
`--kop-gap` on `#screen-map` (10 px and 4 px, deliberately not the 12 px every other
screen uses), and the nav's width by `--balk-w` in `:root`. Those are the knobs §2's
top and bottom edges were measured against, so treat them as frozen while a world is
being painted. Everything else in the layout skeleton — the per-screen `--kolom` that
makes each header exactly as wide as its own content — is **width only** and cannot move
the safe zone.

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

## 11. The venue — a second drawing per world (phase 3.3: every world)

A world map is the place you *choose*. A venue is the place you *are* once you tapped a
stop. Phase 3.1 built that second view for one world as a reference; phase 3.3 turned it
into the way **every** world plays its shows. Same screen, same layout, same place for the
sum — only the light changes. Nothing about this needs new art to work.

### What the app does today

No world has to declare anything. `VENUE_TERUGVAL` in `index.html` holds the default:

```js
const VENUE_TERUGVAL = { art: null, zoom: 220, focus: '70% 14%', blur: 11, dim: .62, op: .96 };
```

A `venue:` key on a world overrides only the fields it names — three worlds currently set
nothing but `dim`, because their maps are the lightest and the darkest of the six.

`art: null` means **fall back to the world map drawing itself** (`venueArt()`). That is not
a placeholder standing in for a missing file — it is the cheapest correct answer available
right now:

* it is the same hand, the same palette and the same light as the map the child just
  left, so the two screens read as one world;
* the file is already decoded and already in the service-worker cache, because the map
  showed it two hundred milliseconds ago. **The venue costs zero extra bytes and zero
  extra requests.**

### Why the borrowed map never shows its edges

A map is a *portrait* drawing with a horizon, a coastline and buildings that stop at the
frame. Zoom into one and ask it to fill the screen and the cut lands somewhere visible —
on a landscape window a dead-straight coastline used to run right through the picture and
half a tent sat against the screen edge. The drawing read as **cropped**, not as a room
behind the performer.

Phase 3.3 fixes that by changing what the drawing is *for* rather than which crop it uses
(every crop has edges):

1. **`.venue-sfeer`** — a seamless gradient in the world's own `theme` colours, covering
   the whole screen. There is no image, so there is nothing to cut. Whatever happens
   above it, the screen is closed.
2. **`.venue-art`** — the borrowed map, blurred, at `opacity < 1`, and masked with a
   **radial gradient that fades to nothing in every direction**. The mask is in percentages
   of the element, so on any aspect ratio the screen edge lands in the transparent part of
   the oval. Where the crop falls stops mattering.
3. On landscape windows (`min-aspect-ratio: 1/1`) the same three knobs are turned further —
   more zoom, more blur, less opacity — because a wide, short slice of a portrait drawing is
   exactly where straight lines appear.

So the venue art is **atmosphere**; the room itself (beam, floor ledge, footlight, vignette)
is drawn in CSS and anchored to the avatar.

### If you want to draw a dedicated venue for a world

Then, and only then, these numbers matter:

| | |
|---|---|
| path | `assets/bg/venue-<wereld-id>.webp` (e.g. `venue-ijs.webp`) |
| format | WebP, quality ~0.82 |
| size | **1215 × 2160** (portrait 9:16, same as a world map — one constant, `ART_W`/`ART_H`) |
| budget | ~125 kB |
| settings to use | `venue: { art: 'assets/bg/venue-ijs.webp', zoom: 100, focus: '50% 50%', blur: 0, dim: 1, op: 1 },` |

What the drawing has to hold:

* **The top ~45 % is the room.** Back wall, light rig, crowd silhouettes, whatever says
  "a show happens here". This is the only part a child really sees.
* **The bottom ~55 % must be quiet.** Local contrast ≤ 8 %, no shape edges, value held
  low. The sum card and the answer buttons sit there and nothing may compete with them.
  The app lays its own floor gradient over this band, but it cannot rescue busy art.
* **Do not draw the stage the star stands on, the spotlight, or the footlight.** The app
  draws all three in CSS (`.venue-bundel`, `.venue-vloer`, `.venue-licht`), anchored to
  the avatar so they follow her on every screen size. A painted stage would sit at the
  wrong height the moment the layout changes.
* **Do not draw a performer.** The child's own star is the performer.
* **Bleed the edges into flat colour.** With `op: 1` and `blur: 0` the radial mask still
  applies, so the outer band of the drawing fades into `.venue-sfeer`. Keep the world's
  `theme.sky` / `theme.deep` hues out there and the seam stays invisible.

Adding the file is a one-line change to that world's `venue` plus one entry in `sw.js`'s
`ASSETS` and a bumped `CACHE` — same procedure as §7 for a map drawing. Worlds you have
not drawn a venue for keep the fallback; the two can coexist indefinitely.
