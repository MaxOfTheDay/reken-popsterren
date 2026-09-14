# Reken Popsterren — progression review (world-based model)

Planning document. Nothing in the app is changed by this file.

Scope: evaluate moving from *cities + accumulated stars* to a *world → levels → next
world* progression, and turn it into the smallest coherent set of changes that makes the
app feel like a polished game for ages 5–8.

Line references are to `index.html` at the time of writing and will drift; search for the
function name instead.

---

## A. Current-state observations

### A1. The shape of the app

One file, no build step. `index.html` is CSS (14–2191), markup (2192–2479), JS
(2480–7389). Nine screens, all present in the DOM, toggled by `show(id)` adding
`.active`. Tests are Playwright suites (`test/counting.test.js`, `maths.test.js`,
`profiles.test.js`) plus screenshot/preview harnesses (`npm run shots`, `preview`, `try`)
and a `?debug&demo&screen=…` switchboard at the bottom of the file. That debug harness is
the single most useful thing for the work proposed here — it can drop straight onto any
screen with a seeded profile.

### A2. The progression model, precisely

It is much simpler than it looks from the UI, and it is already close to what you want:

| Concept | Where it lives | Shape |
|---|---|---|
| Where am I | `p.level` | integer, 1…∞, never wraps |
| How well did I do level *n* | `p.stars[n]` | 0–3, **best-of** |
| Which city is level *n* | `cityFor(lvl)` | `CITIES[(lvl-1) % 12]` + `ronde` |
| Career rank | `starRank(totalStarCount(p))` | 8 tiers + open-ended `⭐N` |
| Badges | `TROPHIES` / `TROPHY_SHELVES` | ~40 defs, 7 shelves, claim ceremony |

Unlocking is one line: a stop is playable when `l <= p.level`. Completion is two lines in
`endLevel()`:

```js
p.stars[lvl] = Math.max(p.stars[lvl] || 0, stars);
if (lvl === p.level) { p.level++; pendingTravel = { from: lvl, to: p.level }; }
```

**Total coupling to the city/level concept is ~20 lines across a dozen functions** (`grep -n
"cityFor(\|CITIES\b\|p\.level\|\.stars\["`). That is the most important finding in this
review: a world layer is a *presentational regrouping of an integer*, not a rewrite.

### A3. Things you already have that section 4 asks for

- **Stars are already best-of, not cumulative.** `Math.max` in `endLevel`. Replaying
  Madrid and doing better already replaces the old result; the global total already means
  "sum of best results". Nothing in the data model needs to change for §4.
- **Replay already works.** Every open stop is a live button (`renderTourMap`:
  `b.onclick = () => startLevel(l)`), including completed ones.
- **Every stop already shows a 3-star row**, with missing stars dimmed
  (`starRowHTML`). The invitation-to-replay language from §5 is *half built*.

So §4 is almost entirely a **communication** problem, not a mechanics problem. That is
good news and it changes the rollout order (see H).

### A4. The map

`.tour-map` is a horizontal scroller; `.tour-track` is a flex row of `.tour-stop`
buttons, each offset vertically by `waveY(i)` (a sine) to make the path meander. The road
is an SVG Catmull-Rom curve drawn *through measured DOM rects* of each `.dot`
(`updateRoad`), with a gold travelled segment, a dim untravelled one, and a fading tail
past the last node. Only levels `1 … p.level + 3` are rendered. `centerStop()` centres the
current stop on open. `runTravel()` hops the avatar to the new city while `growRoad()`
extends the gold along the same path.

This is genuinely good work and it is the strongest game-feel asset in the app. It is also
where the risk lives: the geometry is measured, not declared.

### A5. Header and navigation

`.screen-header` is a consistent 3-column grid used by six screens: left slot, centred
title, right slot (always the 💎 pill). On the map a second row is stacked under it —
`.career-strip` — showing rank name, `n/m ⭐` and a progress bar. A fixed bottom nav
(Kaart / Kleedkamer / Trofeeën) appears on the three hub screens. A floating ⚙️ exists
**only on the profile-select screen**; during actual play there is no settings access at
all.

Top ~160 px of the map therefore carries: avatar, name, "🎤 Tournee 1", diamonds, rank
name, star counter, and a progress bar. The existing `docs/UX-REVIEW.md` §C2 already flags
this as three competing currencies; I agree, and the world model gives a clean reason to
resolve it.

### A6. Stage, applause, assets

- `applyStage(el, p)` paints `el.style.background = item.bg` (a CSS gradient) and drops
  three emoji `.deco` into the corners. The stage is driven by `p.equipped.stage` — a
  **purchased cosmetic** (12 items, 0–150 💎, the priciest things in the shop).
- The applause meter is `G.fan` (0–100), stepped in `submitAnswer`, rendered by
  `updateFan()` as a 12 px bar welded to the bottom of the stage frame. 100 % = encore
  (+3 💎, with a `flyDiamonds` animation); leftover pays +1 💎 per 25 % in `endLevel`.
  The mechanic is sound and the reward is real.
- Assets on disk: `assets/bg/landing.webp`, and that is all. `docs/ART-DIRECTION.md`
  already specifies a full pipeline (folder layout, naming, 1×/2× only, ≤ 400 KB phase
  budget, `applyScene()` shaped like `applyStage()`, and a warning that bumping
  `sw.js`'s `CACHE` constant is the step that will be forgotten). §13 of your brief is
  largely already answered by that document; this review should extend it, not restate it.

### A7. What is worth keeping (explicitly)

Keep, do not rebuild: `p.level` + `p.stars` as the progression data; the best-of star
rule; the road/meander/travel animation; the trophy cabinet and its claim ceremony; the
`.screen-header` grid; the fan meter mechanic; `applyStage`'s shape as the template for
any new "paint this element from data" helper; the adaptive maths engine and everything
it touches; the debug/demo harness.

---

## B. Assessment of the world concept

### B1. What is strong

**The core instinct is right.** "Tournee 2" is a weak chapter marker: it is the same
twelve cities again with a bigger number, and a five-year-old cannot perceive that as
progress. Worlds give what is actually missing — *novelty at a boundary*. A new sky, a new
crowd, a new badge, roughly every week of play.

**"Travelling through worlds" beats "accumulating stars" for this age.** A journey is
spatial and concrete. A running total is abstract, and worse, it is a number that siblings
compare. The app's own player-select screen already made this choice once, deliberately —
the card shows *where she is on tour*, not her star count, with a comment explaining why.
The world model is that same principle applied to the whole app.

**It is unusually cheap here.** Because levels are procedurally generated, a "world" costs
no level design — it is a label, a palette, and a boundary celebration over an integer you
already store.

### B2. What I would change

**1. Keep the global star total. Demote it, don't delete it.**

§4 asks whether a global star counter is still useful. It is load-bearing in ways that are
not visible from the UI: `RANK_TIERS` / `starRank` / `checkRankUp` pay **diamond bonuses**
on every rank-up (10 → 60 💎), and six trophies read `totalStarCount` or `perfectCount`.
Diamonds fund the Kleedkamer, which is the app's real long-term motivator. Cut the star
total and you quietly defund the shop.

The right move is exactly what you suspected but one notch less radical: **remove
`.career-strip` from the map**, which is the noisiest element on the home screen and
duplicates the title. Rank keeps living (a) on the end screen's milestone slot, where it
already earns a gold pill and a celebration, and (b) behind the avatar tap. The child
stops being shown a scoreboard on the home screen; the economy stays intact.

**2. 8–12 levels per world is too long at the start. Make world 1 short.**

Levels here are not authored content — every level is the same generator at a different
difficulty. So world length is purely a *pacing* decision: how often does a child deserve
a big moment? At ~8 questions per show and 2–4 shows per sitting, 10 levels is roughly a
week. That is defensible for world 3, but it means a new player may never see a world
completion at all, and the entire reward structure you are building stays invisible to
them.

Recommendation: **world 1 = 6 levels, later worlds 8**, delivered as a per-world `levels`
field with a prefix sum (about ten lines) rather than a constant. Same code cost, no
future migration when you want to retune pacing.

**3. A single continuous map across all worlds is the wrong call. One world = one map.**

This is my main disagreement with §2. Three reasons, two of them specific to this codebase:

- The road geometry is **measured from DOM rects**, not declared. Today that costs 11
  measurements. A continuous all-worlds map means 60–80 nodes measured on every open, on a
  320 px phone — exactly the "fragile coordinate-heavy layout" your constraints forbid.
- **"Where am I?" degrades.** With sixty nodes on one strip the child must scroll to find
  themselves. Candy Crush survives this because its map *is* the content and it aggressively
  auto-centres; it also never shows more than a screen of future.
- **A long corridor of padlocks is demotivating**, not exciting, at five. It reads as "look
  how much you can't do."

Instead: **one world, one screen.** The "worlds fade into one another" feeling you
described is worth keeping, but it belongs to the *transition* between worlds rather than
to a single long map — see §E7, which gets you the continuity at a fraction of the cost.

It also answers §8 for free: the final authored world simply ends without a next one to
slide into, and says so.

> **Superseded in part.** An earlier draft of this section also argued for keeping the map
> *horizontal and scrolling*. A mockup of a painted vertical map changed that conclusion —
> once the path is part of the artwork, node positions are percentages of an image rather
> than rects measured at runtime, and the fragility objection disappears. §E1 carries the
> revised reasoning. The argument against a *continuous all-worlds* map, above, still
> stands.

**4. Do not build a world-selection screen.**

It is a second navigation surface for a child whose only real intent is "continue". Defer
it. When you do want world revisiting, make it the **badge shelf** in the existing trophy
cabinet (tap a world badge → jump to that world's map), not a new screen.

**5. World badges: do not build a badge system. You already have one.**

§6 and §7 mostly dissolve. `TROPHIES` + `TROPHY_SHELVES` is already a badge system with a
claim ceremony, a shine sweep, a "ready" state, a nav dot, and an end-screen hook (`🎁
Nieuwe trofee klaar!` gold pill, which already fires from `endLevel`). A world badge *is*
a trophy: `{ id, emoji, name, has: p => worldDone(p, id) }`. Add one shelf, `🌍 Werelden`,
generated from the world table. Zero new UI, zero new persistence, and the end-of-world
payoff is already wired.

On states: **one badge, two visual states.** Earned = you finished the world. A ⭐ ring on
the same card = every level in it is 3-starred. Two separate badges per world would double
the shelf and double the vocabulary a five-year-old has to hold. Avoid "visited" as a
state entirely — it is not an achievement.

**6. The world theme will collide with purchased stages. This is the sharpest risk and it
is not in your list.**

Today the show background is the child's *bought* podium: Winterwonderland, Vulkaan,
Jungle, Regenboogland — 90–150 💎 items, the top of the shop. If Ice World also forces an
icy show background, either the purchase is overridden (the diamond economy's biggest
prizes become pointless) or the world theme is invisible on the screen where the child
spends most of their time.

Resolution, and `docs/ART-DIRECTION.md` §9.1–9.2 argues for the same split on independent
grounds: **the world owns the venue, the child owns the podium.** §G2 works out how, and
the answer turns out to cost no new art at all: the podium item's existing gradient moves
from filling the whole frame to filling a plinth she stands on.

- *Venue* (world): the room — back wall, crowd, lights, air, colour temperature.
- *Podium* (purchase): the platform she stands on and its decorations.

Ice World changes the room; her Volcano podium still stands in it. Both economies survive,
and §11 falls out for free: the applause meter's world flavour is simply the venue's crowd
layer reacting to `--fan`.

**7. Do not theme the maths.**

Worth stating as a rule because it will be tempting: no ice-themed questions, no
per-world question types, no world-gated operations. The pedagogy is one adaptive engine
(`perf`, `weak`, `learned`, `opTrack`, `countTrack`) with parent settings on top and three
test suites around it. Worlds are scenery. The moment a world changes what is asked, the
parent settings stop meaning anything.

### B3. What I would avoid

| Avoid | Why |
|---|---|
| Per-world level *content* (`levels: [...]` with authored questions) | There is no authored level content; the generator is the content. It would fork the pedagogy per world. |
| A world map showing all worlds at once | Measured geometry, lost position, a wall of padlocks. |
| Variable mechanics per world (ice slides, fire timers…) | Your own constraint, and it would multiply the test surface by N. |
| Replacing trophies with a parallel badge system | Duplicate ceremony, duplicate persistence, duplicate nav dot. |
| A world picker screen in v1 | Second navigation surface, no demand yet. |
| Deleting `totalStarCount` | Silently defunds the diamond economy. |

---

## C. Recommended target experience

Concrete, single pass through the loop. Dutch strings are the ones the child sees.

**Opening the app.** Unchanged: the drawn landing screen, her star card, tap to enter.
Her card's corner mark becomes the *world* icon (❄️) instead of the city food emoji — one
line in `renderProfiles`.

**Seeing the map.** The whole world is on screen at once — no scrolling, ever. A painted
icy landscape with a path climbing it, six medallions along the path, and a stage with a
crowd at the summit. The header reads

```
        ❄️ IJSWERELD
     Level 4 / 6    ⭐ 11 / 18
```

with her avatar left and a tappable 💎 right. No rank bar, no global star total. Below her
on the path: three finished nodes, one of them glowing gold because it is perfect. Her own
avatar stands on node 4 under a pulsing gold medallion with the **Speel!** bubble. Above
her: two padlocked nodes and the summit stage she is climbing toward.

**Selecting a level.** She taps her own node, or any earlier one. Nothing new — this is
`startLevel(l)` as it works today.

**Playing.** The show. Behind her podium, the *venue* is now icy: a cold back wall, a
crowd silhouette lit in pale blue. Every correct answer brightens the crowd — the same
`G.fan` value, now driving the crowd lights as well as the bar. The bar can eventually
shrink to a thin rim; the crowd is the meter.

**Receiving stars.** The existing star ceremony, unchanged — it is already the best moment
in the app. One addition: if this replay *improved* her result, the line under the stars
says so warmly (`Beter dan vorige keer! ⭐⭐⭐`) instead of the generic praise.

**Returning to the map.** Her avatar climbs to node 5 and the path's gold grows with her —
the existing `runTravel` + `growRoad`, following a curve painted into the artwork. If she
just made node 4 perfect, node 4 is now visibly gold and sparkling below her, and the world
counter ticks: `⭐ 14 / 18`.

**Completing a world.** Finishing the last level plays the ordinary end screen, then the
five beats of §E7: she climbs the final stretch to the summit stage, the Ice badge rises
off it and flies to the 🏆 in the nav, and then the whole icy map slides up and out of the
top while Rainbow World rises in from the bottom.

**Entering the next world.** Rainbow World settles, node 1 pulses gold with **Speel!**, her
avatar stands on it, and `🌈 REGENBOOGWERELD` fades across the screen and away. A quiet
chevron below node 1 takes her back down to Ice World whenever she wants to perfect an old
level.

If she never perfects anything, nothing above nags her. The only pressure is that some
nodes shine and others do not.

---

## D. Proposed information architecture

```
Map  (home)
 ├── header: [avatar] ── WORLD NAME / Level x / y ── [💎]
 │      avatar  → profile sheet: switch star · sound · haptics · Voor ouders
 │      💎      → Kleedkamer (shop)
 ├── map: this world's 6-8 nodes, all on one screen
 └── bottom nav: 🗺️ Kaart · 👕 Kleedkamer · 🏆 Trofeeën
                                              └── shelves, incl. 🌍 Werelden (badges)
Show (level)
 └── header: [✕] ── small world name ── [💎, not tappable]
```

| Element | Lives where | Rule |
|---|---|---|
| **Map** | home, always the default screen | shows one world at a time, auto-centred on the current node |
| **Header** | shared `.screen-header` grid, unchanged structure | contents change per screen, structure never does |
| **Profile** | behind the avatar tap on the map | switch star, and the settings that currently float in the corner ⚙️ |
| **Settings** | inside the profile sheet → "Voor ouders" | removes `#corner-btns` entirely; also *adds* access during play, which does not exist today |
| **Shop** | Kleedkamer, bottom nav **and** the 💎 chip | 💎 is a button on map / end / trophies, inert during a show |
| **Looks** | one card at the top of the Kleedkamer grid, for *this world's* look only | the full thirteen live in the cabinet — see §G3 |
| **Podium** | a purchased plinth she stands on, inside the world's venue | §G2 — the world owns the room, she owns the platform |
| **Diamonds** | header right slot, all screens | during a show it is earning feedback (`flyDiamonds` lands there), not navigation — so visible, not tappable |
| **Stars** | on the nodes, and on the end screen | never as a global counter in the header; the world counter (`⭐ 11/18`) is the only aggregate a child sees |
| **Badges** | trophy cabinet, `🌍 Werelden` shelf | one per world, two visual states (earned / all-perfect) |
| **Collections** | the cabinet, and only the cabinet | trophies, world badges and looks share one home, visited by choice |
| **Rank** | end screen milestone + profile sheet | keeps paying diamonds; stops occupying the home screen |

Net effect on the map's top band: seven pieces of information become three.

---

## E. World-map UX

### E1. Direction: vertical, painted, one screen per world

An earlier draft of this review argued for keeping the map horizontal and scrolling. **A
mockup settled it the other way, and the mockup is right.** What changed the calculus is
not taste, it is one structural fact:

> When the path is part of the painting, node positions become percentages of an image
> instead of rects measured from the DOM at runtime.

The fragility I warned about was a variable-length flex track whose road is re-measured on
every open. Normalised coordinates on a fixed image are the opposite of that: they are
stable under any resize, any DPI, any font setting, and they need no measurement pass at
all. The objection does not survive the change in technique.

And a map that does not scroll is a better answer to the age group than any scroller:

- The child never scrolls to find themselves. Position, next action and destination are
  all in the first frame, permanently.
- There is one obvious thing to tap, and it is always visible.
- The composition can carry meaning. In the mockup the last node is a **stage with a
  crowd at the summit** — the world's destination is literally the show. That is the
  app's own identity doing the work the progression system needs, which no abstract
  node-on-a-line can do.

What survives from the earlier reasoning, unchanged: **no continuous all-worlds map.** One
world per screen, and the mockup agrees.

### E2. How many levels actually fit

The mockup shows ten. On a phone that is too many, and the arithmetic is not close.

On a 390 × 844 phone, minus the header (~96 px) and the bottom nav (~84 px), the map area
is roughly **664 px**:

| Levels | Band per node | Node diameter | Verdict |
|---|---|---|---|
| 6 | 110 px | 56 px | comfortable, room for stars and breathing space |
| 8 | 83 px | 46 px | fine — at the limit |
| 10 | 66 px | 40 px | under the 44 px tap minimum; numbers and stars get small |

**Eight is the ceiling, six is comfortable.** This is the same answer §B2 reached on pacing
grounds — a short first world so the badge arrives inside the first sessions. Two
independent lines of reasoning landing on the same number is worth trusting.

### E3. Sizing: fit the art, extend with tokens

The mockup is 1024 × 1536 (1 : 1.5). That is wider, relative to its height, than the space
it has to live in — a phone's *map area* is 390 × 664, or **1 : 1.70**.

**Author map art at ≈ 1 : 1.7 — 1080 × 1840** and it fills a phone edge to edge.

Then one sizing rule, everywhere:

> `contain`, centred, with the remaining gutters painted from the world's
> `--w-sky` / `--w-ground` tokens.

| Device | Result |
|---|---|
| Phone portrait | art nearly full-bleed, small gutters top and bottom |
| Tall phone | slightly larger gutters, art still fills the width |
| Tablet | art centred, generous themed gutters at the sides |
| Landscape phone | art a centred column, wide themed gutters — still one screen, still no scrolling |

The gutters cost nothing, because the tokens that fill them already exist for every world.

**Why not `cover`.** It is more immersive and it never shows a gutter, but it crops — about
10 % off the sides of a phone (tolerable) and about **31 % off the top and bottom of a
tablet**, which eats the first and last nodes. Surviving that needs a safe-zone convention
plus a max-crop clamp, which is more machinery than the gutters are worth. Use `contain`;
revisit only if the gutters actually look bad in practice.

### E4. Wireframe

```
┌──────────────────────────────┐
│ ‹   🔥 VUURWERELD      💎 12 │  back · world · diamonds · avatar
│        Level 7 / 8    ⭐18/24 │
├──────────────────────────────┤
│ ░░ a hint of the next world ░│  ← token gradient, ~6% of the height
│               ╭────╮         │
│          ╭────┤  8 │ 🎪      │  the summit: a stage with a crowd
│          │    ╰────╯ ☆☆☆     │
│      ╭───┴╮                  │
│      │  7 │  ← current       │
│      ╰────╯  Speel!  ☆☆☆     │
│   ╭────╮      🧍 her avatar  │
│   │  6 │ ★★☆                 │
│   ╰────╯                     │
│          ╭────╮              │
│          │  5 │ ★★★  ← glows │
│          ╰────╯    (mastered)│
│   ╭────╮                     │
│   │  4 │ ★★★ ← glows         │
│   ╰────╯                     │
│            ⋮                 │
│      ╭────╮                  │
│      │  1 │ ★★☆              │
│      ╰────╯                  │
│      ⌄  terug naar IJswereld │  quiet chevron, never a CTA
├──────────────────────────────┤
│   🗺️ Kaart  👕 Kleedkamer 🏆 │
└──────────────────────────────┘
```

The path climbs. That direction matters — see E7.

### E5. Node states

Five states. Positions come from the world pack; everything else is shared CSS.

| State | Treatment |
|---|---|
| Locked | grey medallion, 🔒, dim label, three dim stars |
| Current | gold medallion, pulse ring, the avatar standing on it, **Speel!** |
| Done, 1–2 ★ | purple medallion with a gold rim, earned stars bright, missing stars dim |
| **Mastered, 3 ★** | medallion becomes warm gold with a slow sparkle — one CSS class |
| **Summit** | the last node, drawn into the artwork as a stage; same states, bigger |

Note there is no gateway *node* any more. The one-screen model replaces it with a
transition (E7) and a token gradient at the top edge of the map.

### E6. The replay invitation (§5)

Unchanged by the switch to one screen, and slightly strengthened by it: because the whole
world is visible at once, the child sees **all** the dull nodes next to all the glowing
ones, in one glance, without scrolling. Set-completion pressure with no failure language
anywhere.

1. The mastered glow.
2. A small world counter `⭐ 18 / 24` beside the level count — an aggregate the child can
   actually finish, unlike a global total.
3. At 24/24 the whole path glows gold once and the world badge gains its ⭐ ring.

Explicitly not: red, "!", counts of what is missing, notifications, or any second call to
action competing with **Speel!**

### E7. World transitions

The one-screen model gives up the "path bleeds into the next world" idea — there is no
scroll to walk into. Replace it with a better trade:

> **Take the continuity from the transition, not from the map.**

Five beats. Only one is new code.

1. **The summit show.** The last level plays normally and ends on the existing end screen.
2. **Back to the map, still in this world.** The avatar walks the final path segment to
   the summit node; its stars fill. This is `runTravel` + `growRoad`, now following a
   curve baked into the art instead of a measured one.
3. **The badge.** It rises off the summit stage and flies to the 🏆 nav icon.
   `flyDiamonds(fromEl, toEl, n)` already performs exactly this motion — same function,
   different payload. The world's payoff lands *on the map*, where the journey happened.
4. **The world change — the only new animation.** The finished world slides up and out of
   the top; the next world slides in from the bottom. Roughly twenty lines of
   `element.animate()`, gated on `prefers-reduced-motion`.

   Preferred over a camera pull-back or cross-fade for three reasons: it reuses the
   direction the art already establishes (paths climb); the avatar exits at the top and
   re-enters at the bottom on node 1, so the motion is continuous in one direction and
   eight separate screens read as **one long climb**; and it needs no per-world transition
   assets at all — which lets "optional transition assets" be struck from the pack spec.
5. **Arrival.** The new world settles, node 1 pulses gold with **Speel!**, the avatar
   stands on it, and a short title card (`❄️ IJSWERELD`) fades over and out — `showPraise`
   already does this.

Two supporting details:

- **The whisper of what is next.** Rather than painting a hint of ice into the top of the
  fire artwork — which would couple world *N*'s art to world *N+1*'s identity and break
  pack independence — overlay a gradient across the top ~6 % of the map using the *next*
  world's `--w-sky`. Same effect, about three lines, zero art coupling.
- **Going back.** A quiet chevron below node 1 runs the same transition downward, and
  tapping a world badge in the cabinet jumps straight there. Discoverable, never a CTA:
  it must not compete with **Speel!**

### E8. What the artwork has to guarantee

Because the path is now painted, the art carries a contract:

- **A flat, readable landing place under every node.** A medallion on a busy diagonal is
  unreadable at 46 px.
- **A safe zone.** Keep every node inside the middle ~86 % of the image, so a future switch
  to `cover`, or an unusual aspect ratio, never clips one.
- **The summit reads as a venue.** It is the world's destination and the app's identity.
- **Contrast under the nodes.** The map must not fight the gold "current" medallion or the
  **Speel!** bubble; this is the same readability contract `docs/ART-DIRECTION.md` §4.3
  already imposes on the question card.

---

## F. World-pack architecture

### F1. Critique of the proposed schema

The sketch in §12 mixes three different lifetimes in one object — progression (`levels`),
presentation (`colors`, `mapAssets`, `stageAssets`, `effects`) and reward (`badge`) — and
`levels` as an array implies authored level content that does not exist. Separate the
mechanic from the dressing and it gets smaller.

### F2. Proposed shape

```js
/* ================= Werelden ================= */
// Eén wereld = een stuk van de tournee (een aantal levels) + een sfeer.
// De mechaniek (sterren, ontgrendelen, moeilijkheid) staat hier NIET in:
// die is voor elke wereld gelijk.
const WORLDS = [
  {
    id: 'ijs',
    name: 'IJswereld',
    icon: '❄️',
    levels: 6,                       // wereld 1 is kort: de eerste badge moet snel komen
    nodes: ['❄️','⛄','🧊','🐧','🏔️','🎿'],   // per-halte icoon (valt terug op icon)
    theme: {                          // → CSS custom properties, geen if/else
      sky:    '#bfe6ff',
      deep:   '#0e2a52',
      accent: '#8be9ff',
      road:   '#e8f6ff',
      glow:   'rgba(160,220,255,.42)',
    },
    art: {                            // allemaal optioneel; zonder art werkt de wereld
      map:   'assets/world/ijs-map.webp',
      venue: 'assets/world/ijs-venue.webp',
      crowd: 'assets/world/ijs-crowd.png',
    },
    badge: { emoji: '🏔️', name: 'IJsster' },
  },
  // … regenboog, jungle, vuur, muziek
];
```

Derived once at load, never stored in a save:

```js
// prefix-sommen: level → wereld, en wereld → eerste level
const WORLD_AT = [];   // WORLD_AT[lvl] = index in WORLDS
function worldFor(lvl) { … }   // -> { world, idx, first, last, nInWorld }
function worldDone(p, id) { … }
function worldStars(p, id) { … }   // { got, max } voor de ⭐ 11/18-teller
```

`worldFor(lvl)` is a **drop-in replacement for `cityFor(lvl)`** at all of its call sites.

### F3. The rule that makes §12 enforceable

Theme values are written once, as CSS custom properties, onto the screen root:

```js
function applyWorldTheme(el, w) {
  for (const [k, v] of Object.entries(w.theme)) el.style.setProperty('--w-' + k, v);
}
```

Every themed component then reads `var(--w-sky)`, `var(--w-accent)` and so on. **No
component ever learns a world id.** That is the mechanism that prevents `if (world ===
'ice')` from spreading — not discipline, but the absence of any place to put it.

`applyWorldTheme` is deliberately shaped like the existing `applyStage(el, p)` and should
sit next to it, for the same reason `docs/ART-DIRECTION.md` proposes `applyScene` there.

### F4. Global mechanics vs world presentation

| Global — shared by every world, never in `WORLDS` | World presentation — only in `WORLDS` |
|---|---|
| `p.level`, `p.stars`, unlocking rule | sky / ground / road colours |
| star scoring (3/2/1 thresholds) | node icons |
| best-of replay rule | map background art |
| applause mechanic (`G.fan`, encore, +💎/25 %) | venue art and crowd tint |
| diamond payouts, rank ladder, trophies | badge emoji and name |
| the entire maths/counting engine | transition colours |
| parent settings | decorative motifs |

If a change needs a row from the left column to vary per world, it is the wrong change.

### F5. Badges, generated

```js
// Wereldbadges worden uit WORLDS afgeleid en in de kast gezet: een nieuwe
// wereld levert automatisch een nieuwe trofee op, zonder extra code.
WORLDS.forEach(w => TROPHIES.push({
  id: 'world_' + w.id, emoji: w.badge.emoji, name: w.badge.name,
  desc: w.name + ' uitgespeeld',
  has: p => worldDone(p, w.id),
  progress: p => trophyProgress(…),
}));
TROPHY_SHELVES.unshift({ name: '🌍 Werelden', ids: WORLDS.map(w => 'world_' + w.id) });
```

Adding a world adds its badge, its shelf entry, its map theme and its venue with no other
edit. That is the §12 goal, concretely.

### F6. Applause presentation (§11)

One component, N configurations, no bespoke logic:

```js
// in updateFan(), naast de bestaande fill.style.width
crowd.style.setProperty('--fan', G.fan / 100);
```

```css
.crowd {                                   /* één laag, in élke wereld dezelfde */
  opacity: calc(.25 + var(--fan) * .75);
  filter: saturate(calc(.6 + var(--fan) * .8))
          drop-shadow(0 0 calc(var(--fan) * 22px) var(--w-accent));
}
```

Ice World glows cold blue because `--w-accent` is cold blue. Fire World glows orange for
the same reason, with no fire-specific code. This is worth the work: it converts a UI
progress bar into the thing the meter is *about* (the crowd), and the child sees the
consequence of each correct answer in the world rather than in a widget.

Cheaper variant if the art is not ready: skip the crowd image entirely and tint the venue's
existing gradient and the meter's fill from `--w-accent`. Roughly 90 % of the perceived
integration for an hour's work, and it is the same code path once art arrives.

### F7. Asset-pack specification (§13)

The vertical painted map (§E) changes this section's most important rule. An earlier draft
said a world must be presentable from theme tokens alone, with art as pure enhancement.
**That is no longer true for the map**: the path, the ledges and the summit venue *are* the
artwork. No painting, no world.

That is an acceptable trade for how much the painted map gives back, but it has to be
planned for, because it makes world packs art-blocked rather than config-only.

Per world, in priority order:

| # | Item | Form | Required | Notes |
|---|---|---|---|---|
| 1 | theme tokens (5 colours) | JS/CSS vars | **yes** | drive gutters, transitions, crowd tint, node rims |
| 2 | **map artwork** | raster `.webp`, ≈ 1080 × 1840 | **yes** | carries the path, the ledges and the summit |
| 3 | **node coordinates** | 6–8 `{x, y}` percentage pairs | **yes** | authored against the artwork (F8) |
| 4 | badge | emoji, later an SVG symbol | **yes** | shown at ~44 px in the cabinet |
| 5 | venue backdrop | raster `.webp` | no | falls back to a tinted house venue |
| 6 | crowd layer | raster `.png`, alpha, blurred | no | driven by `--fan` |
| 7 | world look | 3 existing item ids | no | see §G3 — no new art at all |
| ~~8~~ | ~~transition assets~~ | — | **never** | the slide in §E7 needs none |

**The budget problem, and the fix.** Eight worlds × (map + venue) is sixteen paintings. At
150–250 KB each that is roughly 2 MB, against `docs/ART-DIRECTION.md`'s 400 KB phase budget
and 120 KB per-image cap. Two mitigations, both nearly free:

- **Precache only world 1.** `sw.js`'s `ASSETS` array is the precache list, but its fetch
  handler already serves anything under `/assets/` cache-first and *writes misses into the
  cache*. So later worlds cache themselves on first visit and are offline from then on.
  This is a one-line change to an array, and the mechanism already ships.
- **Ship one generic fallback map.** A neutral path over neutral terrain that any
  un-painted world borrows and recolours from its tokens. A new world can then ship as
  configuration and receive its painting later — which is what keeps §8's "adding a world
  is cheap" honest now that art is mandatory.

Raster only for atmosphere (map, venue, crowd). CSS gradients for anything that must stay
crisp at any size. SVG only for symbols reused at several sizes. Never generate unique art
for a node, a star or a piece of UI chrome. Naming and DPI follow `ART-DIRECTION.md`
§7.2–7.3 — do not invent a second convention. Add `assets/world/<id>-<part>.webp`.

**A "Create a Pirate World pack" request then means exactly:** an id, a Dutch name, a level
count (6–8), five theme colours, a badge emoji and name, three item ids for its world look,
one map painting at 1080 × 1840 honouring §E8, its node coordinates, and optionally a venue
and crowd layer.

### F8. Authoring: a calibrator, not an editor

Of everything in a pack, exactly one thing is hard to author by hand: **node coordinates
that land on the ledges the painting provides.** Everything else is typing five hex values
and a name.

So: **do not build a world-pack editor.** Dragging nodes, persisting JSON, previewing
venues and picking colours is a real piece of software — plausibly more code than the world
system itself — for a task performed maybe eight times, at ten minutes each.

Build a calibrator instead, inside the `?debug` switchboard that already exists at the
bottom of `index.html` (it already does `&demo`, `&star=`, `&stage=`, `&screen=`):

```
?debug&mapedit   →  percentage grid over the map artwork
                    drag the nodes
                    prints a paste-ready coordinate array to the console
```

You paste the array into `WORLDS`. No persistence, no file I/O, no UI chrome, no build
step — roughly 80 lines, inside a block that ships to nobody. The repository already has
this pattern in `npm run try` and `npm run preview`: dev-only harnesses for trying out
art, driven by one shared table in `test/scene.js`. The map calibrator belongs in that
family. (A third harness, `proefstudio.html`, was retired once the studio covered it.)

Two things deliberately left out:

- **The venue background.** It has no coordinates — it is a full-bleed image behind the
  podium. There is nothing to calibrate.
- **Colours.** Five hex values, iterated faster in the file than through a picker.

And do not build it for the first world. Eyeballing eight percentages by hand is genuinely
faster than writing the tool. Build it when starting world 2, at the moment you notice you
are doing it a second time.

---

## G. Looks, podiums and the collection budget

### G1. The real problem: seven collections, about to become eight

Before fixing either looks or podiums, name what is actually wrong. A child in this app is
currently invited to collect:

| # | Collection | Where it is shown |
|---|---|---|
| 1 | stars per level | map nodes, end screen |
| 2 | a global star total | the career strip, on the home screen |
| 3 | diamonds | every header |
| 4 | ~95 items | Kleedkamer |
| 5 | 13 looks | Kleedkamer, first tab |
| 6 | ~40 trophies | cabinet, plus a nav dot |
| 7 | 8 career ranks | career strip and overlay |

Worlds and world badges would make **eight**. The feeling that looks are "a bit too
present" is a correct reading of a real problem, but looks are a symptom rather than the
disease: nothing has ever been demoted, so every system that was ever added is still
shouting at the same volume.

The fix is a hierarchy, not a deletion. Nothing below is removed from the app; things are
moved out of the places where a child is trying to decide what to do next.

| Tier | What | Visible where |
|---|---|---|
| **Primary** | worlds and levels — the journey | the map, always |
| **Secondary** | stars per level, and the world's `⭐ n/m` | the map nodes and the world counter |
| **Currency** | diamonds — one, spent in one place | header chip, tappable to the shop |
| **Rewards** | items she wears | Kleedkamer |
| **Collections** | trophies, world badges, looks | the cabinet, visited by choice |
| **Retired from the surface** | career rank, the looks tab | rank keeps paying diamonds silently; looks move (G3) |

Three things are ever visible during play: where I am, how well I did, what I can spend.

### G2. Podiums: keep the data, change where it paints

**The collision.** `applyStage(el, p)` paints the *entire* stage frame from
`p.equipped.stage` — `el.style.background = item.bg`, plus three emoji in the corners. If
the world now supplies a painted venue, the podium item has nothing left to paint. It is
the sharpest conflict in the whole plan, because the stage category holds the most
expensive items in the shop (up to 150 💎) and appears in eight of the thirteen look sets.

**The fix is a one-line semantic change, not new art.** The item already carries exactly
the two things a platform needs: a gradient (`bg`) and three props (`deco`). Move them:

| | Today | Proposed |
|---|---|---|
| `item.bg` | fills the whole stage frame | fills a **plinth** at the bottom of the frame |
| `item.deco` | three emoji stuck in the frame corners | props standing on and beside the plinth |
| the room behind | the same gradient | the **world's venue** |

```js
// applyStage wordt applyPodium: dezelfde data, een andere plek.
// De wereld schildert de zaal (applyVenue); het gekochte podium is
// de verhoging waar ze óp staat.
function applyPodium(el, p) {
  const st = itemOr(p.equipped.stage, 'stage_disco');
  el.style.setProperty('--podium-fill', st.bg);
  // st.deco: rekwisieten op/naast de verhoging i.p.v. hoekstickers
}
```

Zero new assets, no migration, no refunds, and the result is *better* for the child: her
150 💎 volcano podium becomes an object she visibly stands on — a dark slab with a molten
rim — instead of wallpaper behind her. An owned object reads as a possession in a way a
background never does.

Two details worth getting right:

- **Make the plinth generous.** This changes the appearance of something she paid for. A
  real lit plinth at roughly 18–22 % of the frame height reads as an upgrade; a thin strip
  reads as a downgrade.
- **`.stage` appears on four screens** — the show, the end screen, the Kleedkamer and the
  profile card. The show and end screen get the current world's venue. The **Kleedkamer
  should also use the current world's venue** — she is backstage at this world's show,
  which is free, coherent, and makes the world visible where she spends her diamonds. The
  profile card, which has no world context on screen, can keep a neutral house venue.

Unaffected: the `podiumbouwer` trophy and `COLLECTION_CAT.podiumbouwer` count *owned* stage
items and keep working untouched.

### G3. Looks: stop running them as a parallel collection

**What a look actually is.** Not an item — a *named bundle* of items that already exist in
the shop (`THEME_SETS`, thirteen of them), serving two real jobs: a savings goal, and a
discovery aid that drags the child across categories she would otherwise never open. Both
jobs are good. The **presentation** is the problem: `renderShop` puts the ✨ Looks chip
first in the tab strip, ahead of all eight clothing categories, and the view behind it is a
thirteen-card grid — a second collection screen competing with the cabinet, which already
has a `✨ Thema-looks` shelf holding the same thirteen.

**The opportunity nobody has spent yet.** Worlds and looks are already the same vocabulary:

| Look that exists today | World it obviously belongs to |
|---|---|
| Winter | Ice World |
| Vuurshow | Fire World |
| Jungle | Jungle World |
| Ruimteheld | Space World |
| Regenboogster | Rainbow World |
| Prinses | Castle World |

Six of the thirteen map onto plausible worlds with no new content at all.

**The proposal: a look is what you wear *to* a world.**

- Each world names **one** look. It is surfaced only while you are in that world.
- In the Kleedkamer the ✨ Looks tab disappears. In its place, one card at the top of the
  item grid: `Deze wereld: 🔥 Vuurshow · 2 / 3`, with its pieces. Tapping a missing piece
  jumps to it — `openLookInKleedkamer` and `lookPieceTap` already do this.
- The full thirteen live in the **cabinet**, where collections belong, on the shelf they
  already have.
- Looks with no world — Rockster, Magicus, FestivalDJ, Discodiva, Thuismatch, Diamantster —
  stay cabinet-only. Do not force a one-to-one mapping; six world looks and seven free ones
  is fine.
- **Drop the `stage` piece from world looks.** The look should be about *her*; the world is
  about the room. It also shortens a world look to three pieces, which suits a nudge rather
  than a grind.
- **The reward for wearing it is cosmetic plus one acknowledgement**, never a mechanical
  advantage: a warmer crowd, some sparkle, and a single line the first time
  (`Je past precies bij deze wereld! 🔥`). A child who prefers her own outfit must never be
  playing at a disadvantage.

This is the demotion you asked for and it costs nothing: one chip removed, one card added,
and looks stop being a rival collection and become an expression of where you are.

**Critical implementation note.** Define world looks as a **separate, shorter list** that
references the same item ids. Do **not** mutate `THEME_SETS` — `comboOn` / `comboOwned`
drive thirteen trophies, so editing those sets would silently move save-visible progress
for existing players.

### G4. What the Kleedkamer looks like afterwards

```
before                          after
┌──────────────────────────┐    ┌──────────────────────────┐
│ [avatar on podium]       │    │ [avatar on podium,       │
│                          │    │  in this world's venue]  │
│ ✨Looks 👕 👟 💇 🎤 🎸 …  │    │ 👕 👟 💇 🎤 🎸 🎀 🐾 🎪  │
│  ▲ first, a 13-card grid │    │                          │
│                          │    │ ┌──────────────────────┐ │
│ [item grid]              │    │ │ Deze wereld: 🔥      │ │
│                          │    │ │ Vuurshow    2 / 3    │ │
│                          │    │ └──────────────────────┘ │
│                          │    │ [item grid]              │
└──────────────────────────┘    └──────────────────────────┘
```

And the cabinet gains one shelf while keeping the one it has:

```
🌍 Werelden        ← new: one badge per world
✨ Thema-looks     ← unchanged: all 13
🎤 Tournee · 🧮 Rekenkracht · ⭐ Shows & sterren · …
```

### G5. If you would rather cut than demote

Removing looks entirely is defensible but I would not: they are the only thing giving
ninety-five items a reason to be bought *in combination*, and without them the Kleedkamer
is a flat catalogue with no goals. The machinery is also built, tested and working.

If you do want to cut, the cheap version is: **delete the shop tab, keep the cabinet
shelf, touch no data.** That removes the presence you object to, keeps thirteen collection
goals for the child who wants them, and is a handful of lines in `renderShop`. The
world-look card from G3 can be added later, or never.

---

## H. Edge cases

**Replaying old levels.** Already correct. Verify only that the map re-renders node state
after returning (it does: `goMap()` re-renders).

**Improving stars.** `Math.max` already. The one new behaviour worth adding: detect
improvement in `endLevel` (compare against the pre-write value) so the end screen can
congratulate it. Cheap and it is the entire emotional payoff of §5.

**Not improving on a replay.** Say nothing. Do not show "je vorige resultaat was beter".

**Reaching the end of authored worlds.** `worldFor(lvl)` must never return `undefined`.
Recommended: a final **"Sterrentournee"** pseudo-world, entered after the last authored
world — neutral/celebratory theme, keeps counting levels, keeps paying stars, diamonds,
rank-ups and trophies exactly as before, and its summit reads `✨ Binnenkort meer
werelden!` rather than sliding into a next world. This is the simplest option that satisfies your
constraint: it is not a live-service system, it is a `filter/pop`-style fallback in one
function, and it makes appending a real world later a pure data change. Avoid a repeatable
challenge mode, rotating levels, or a mastery meta-layer — each is a new mechanic to test
and explain.

**Adding a future world.** Append to `WORLDS`; bump `CACHE` in `sw.js`. `p.level` is
untouched, so a child mid-endless-tail moves into the new world at its correct position —
but note: **appending a world shifts the endless tail's boundary, not any child's level
number.** A child at level 40 who was in the tail is now in the new world. That is the
desired behaviour, and it is only safe because level numbers never get renumbered. Never
insert a world in the middle or change an existing world's `levels` count after release —
that *would* renumber, and a child's completed levels would silently move to different
worlds.

**Partially completed worlds.** Nothing special: nodes carry their own star state, the
world counter aggregates, the badge is `has()`-derived and simply returns false.

**Saves from the existing version.** No migration is required — `p.level` and `p.stars`
keep their exact meaning. But a child at level 27 will *retroactively* qualify for the
first worlds' badges. Follow the precedent already set in `migrate()` for `readyTrophies`
("no sudden wall of Klaar! for old saves"): award those badges **silently into
`p.trophies`** on first load rather than queueing three claim ceremonies.

**⚠ The `ronde` trap — the most likely silent bug in this whole project.**
`planSpecials(p, s, total, cityFor(lvl).ronde, goldIdx)` uses `ronde` as a pedagogical
clock: `opReady` gates "zoek-het-getal" at `round >= 3`, `chainReady` gates "drie getallen"
at `round >= 4` *and* at least two rounds after the `+` unlock. With 12-city rounds those
land near levels 25 and 37. If `ronde` is casually replaced by "world index" with 6–8 level
worlds, they arrive around level 13–17 instead — a real change in when a six-year-old is
first shown `3 + ▢ = 7`, made invisibly, with `test/maths.test.js` as the only thing likely
to catch it. **Keep `tourRound(lvl) = floor((lvl-1)/12)+1` as its own function, independent
of world layout**, and change its tuning only deliberately.

**`CITIES.length` leaks.** `perfectCities()` loops `1..CITIES.length`; the `worldtour` and
`perfecttour` trophies compare against it. If `CITIES` goes away these silently become
"the first 12 levels" forever. Redefine both in world terms (e.g. "every level of world 1
perfect") or retire them in favour of world badges.

**Orientation changes.** There is **no `resize` or `orientationchange` handler anywhere in
the app.** The road is measured once at render, so rotating the device today leaves the SVG
path detached from the medallions until the next `goMap()`. This is a pre-existing bug that
a themed, more prominent map will make much more visible. Fix it with one debounced
listener calling `updateRoad` + `updateParallax` + re-centre — this should land early,
ideally in the same iteration that touches the map.

**Aspect ratios the artwork was not drawn for.** The `contain` + themed-gutter rule (§E3)
means a node can never be cropped, on any screen, which is the whole reason to prefer it
over `cover`. What *can* happen is large gutters — a landscape phone shows the map as a
centred column. Verify a world still reads as that world when roughly half of what is on
screen is gutter rather than painting; if it does not, the theme tokens are wrong, not the
layout.

**A world whose artwork is not finished.** Art is now mandatory for the map (§F7), so a
world can be configured before it can be played. The generic fallback map exists for
exactly this: a new world ships as configuration, borrows the fallback, recolours it from
its tokens, and receives its painting later. Never let `WORLDS` contain an entry whose map
resolves to nothing.

**Node coordinates against the wrong painting.** Coordinates are percentages tied to one
image. Replacing a world's artwork without re-running the calibrator (§F8) silently moves
every node off its ledge. Treat map art and coordinates as one versioned unit; they change
together or not at all.

**Very small screens (320×568).** Node width is already stepped down at `max-width:390`.
The new header must not regress this: "IJSWERELD" over "Level 4 / 6" is two short lines and
fits; a single line with both would not. Keep world names short — that is a content rule
for world packs, worth writing into the spec.

**Missing assets.** Mandated by F7: tokens alone must produce a complete world. A missing
`.webp` degrades to the gradient, never to a blank panel. Also: any new asset must be added
to `sw.js`'s `ASSETS` **and** `CACHE` bumped, or offline users get a half-themed world.

**Content updates generally.** The world table is code, not save data, so nothing in
localStorage can ever reference a world that no longer exists. Keep it that way — never
persist a world id into a profile.

---

## I. Incremental rollout plan

Nine iterations, each independently shippable and independently abandonable. This reorders
your suggested sequence for one reason: **§4 and §5 need no world system at all**, so they
should ship first and teach you whether children replay before you commit to worlds.

---

### Iteration 0 — Mastery and replay language on the existing map

- **Goal:** make "I could make that one perfect" real, with zero architectural change.
- **Player sees:** 3-star stops glow gold and sparkle gently; an improved replay is
  congratulated on the end screen; a small `⭐ n/m` counter appears for the visible stretch.
- **Under the hood:** one CSS class, one condition in `renderTourMap`, one comparison in
  `endLevel`. No data change.
- **Risk:** very low. Worst case the glow is too subtle or too loud — a CSS tweak.
- **Deliberately unchanged:** cities, map structure, header, stars data, everything else.
- **Validate:** `npm test`; `npm run shots`; then watch a child — *do they go back?* If
  they don't even with the glow, the whole mastery half of the plan is worth less and you
  should know that before iteration 4.

### Iteration 1 — World layer over levels (invisible)

- **Goal:** introduce `WORLDS` / `worldFor()` as a pure regrouping.
- **Player sees:** almost nothing — the map header says `❄️ IJSWERELD` instead of `🎤
  Tournee 1`. Nodes, cities and unlocking are untouched.
- **Under the hood:** `WORLDS` table with the existing 12 cities regrouped into 2 worlds,
  prefix sums, `worldFor()` replacing `cityFor()` at its call sites, **`tourRound()`
  split out and left alone.**
- **Risk:** the `ronde` trap (see G). Mitigate by making `tourRound` a separate function in
  the same commit and asserting it in the maths suite.
- **Deliberately unchanged:** the map layout, star model, trophies, header structure.
- **Validate:** all three suites must pass untouched — that is the whole point of this
  iteration. Plus a manual check that a save at level 27 still starts at level 27.

### Iteration 2 — Map becomes world-scoped and stops scrolling

- **Goal:** one world per screen, all of it visible at once.
- **Player sees:** the map holds only this world's 6–8 nodes, all on screen, no scrolling;
  `Level 4 / 6` under the world name; the world star counter.
- **Under the hood:** `renderTourMap` bounds its loop by the world; nodes move from a flex
  track to absolute percentage positions over a fixed-aspect map box; the measured-rect road
  is replaced by a path that is either painted (once art exists) or drawn from the same
  coordinates. **The missing resize/orientation handling stops mattering here** — that is a
  real benefit of dropping runtime measurement, not an afterthought.
- **Risk:** this is the iteration that touches the most existing map code at once. Keep the
  purple gradient background and use a placeholder path until iteration 3 brings artwork —
  do not change geometry and art in the same step.
- **Deliberately unchanged:** themes, stars, badges, header chrome beyond the title.
- **Validate:** shots at 320/390/tablet, portrait and landscape; confirm every node is
  visible and tappable at 320 px and in landscape.

### Iteration 3 — One prototype world, with its painting

- **Goal:** prove a world *feels* like a place.
- **Player sees:** Ice World's map is a painted icy climb with a stage at the summit; the
  gutters, node rims and the hint at the top edge are all its colours.
- **Under the hood:** `theme` tokens + `applyWorldTheme`; every map component switched to
  `var(--w-*)`; the first map painting at 1080 × 1840 with hand-placed coordinates; the
  venue/podium split introduced on the show screen with CSS gradients only.
- **Risk:** contrast. The app has an explicit readability contract
  (`docs/ART-DIRECTION.md` §4.3) — a pale world must not eat the white question card or
  the gold CTA. Treat `--w-*` as *background* tokens only; never let a world recolour a
  control.
- **Deliberately unchanged:** gold = reward, blue = selected. Worlds never touch those.
- **Validate:** shots of every screen in both worlds; check the Speel! bubble and the
  question card against each world's background.

### Iteration 4 — World completion and badges

- **Goal:** the boundary becomes an event.
- **Player sees:** finishing the last level gives the existing gold milestone pill, the
  climb to the summit stage, the badge flying to the cabinet, and the slide into the
  next world.
- **Under the hood:** badges generated from `WORLDS` into `TROPHIES` + a `🌍 Werelden`
  shelf; silent retroactive award for existing saves; the ⭐ ring for an all-perfect world.
- **Risk:** double celebration — the end screen, the badge ceremony and the travel
  animation firing at once. Sequence them; the existing code already staggers rank-up
  (`setTimeout(… , 650)`) and that pattern should be reused.
- **Deliberately unchanged:** the trophy cabinet's layout, ceremony and nav dot.
- **Validate:** `profiles.test.js` for the retroactive-award path; manually complete a
  world with a seeded `?debug&demo` profile.

### Iteration 5 — Compact header, diamonds as a button, settings behind the avatar

- **Goal:** take the map's top band from seven pieces of information to three.
- **Player sees:** no rank strip; world name + `Level x / y`; a tappable 💎; the ⚙️ corner
  button gone, its contents inside the avatar sheet — and now reachable during play.
- **Under the hood:** `.career-strip` removed from the map (rank survives on the end screen
  and in the sheet); `.diamond-badge` becomes a button on three screens; `#corner-btns` and
  `toggleGearMenu` move into the profile sheet.
- **Risk:** parents currently find settings via the corner ⚙️ on the profile screen. If it
  moves, they must be able to find it. Keep a ⚙️ affordance on the player-select screen too
  during a transition period.
- **Deliberately unchanged:** the `.screen-header` grid itself, and the bottom nav.
- **Validate:** `profiles.test.js` touches the settings route heavily — run it first.

### Iteration 6 — Themed venue, the podium as a plinth, and crowd applause

- **Goal:** the world reaches the screen where the child spends most of their time, without
  taking anything away from her.
- **Player sees:** an icy room behind her; her bought podium is now a lit plinth she stands
  *on*; the crowd lights up as she answers.
- **Under the hood:** `applyVenue` for the world and `applyPodium` (was `applyStage`) for
  the purchase — the item's `bg` moves from the frame to the plinth and its `deco` become
  props (§G2); one `.crowd` layer driven by `--fan` from the existing `updateFan()`; the
  Kleedkamer adopts the current world's venue.
- **Risk:** this visibly changes something the child paid up to 150 💎 for. Make the plinth
  generous (18–22 % of the frame height, lit rim). Also budget and offline: precache world 1
  only, let the rest cache on first visit, and **bump `CACHE` in `sw.js`.**
- **Deliberately unchanged:** the fan mechanic, the encore, the diamond payouts, every item
  the child owns, and the `podiumbouwer` trophy.
- **Validate:** measure total payload; test offline after a hard reload; put the volcano
  podium in three different worlds and confirm it still reads as hers.

### Iteration 7 — Demote looks, and give each world one

- **Goal:** take the Kleedkamer from two competing collections to one shop and one goal.
- **Player sees:** the ✨ Looks tab is gone; a single card at the top of the grid reads
  `Deze wereld: 🔥 Vuurshow · 2 / 3`; the full thirteen are still in the cabinet.
- **Under the hood:** remove the Looks chip from `renderShop`'s tab strip; a world-look card
  above the item grid reusing `openLookInKleedkamer` / `lookPieceTap`; a **separate**
  world-look list referencing existing item ids.
- **Risk:** mutating `THEME_SETS` would silently move save-visible trophy progress for
  thirteen trophies. Do not touch it — define world looks alongside it.
- **Deliberately unchanged:** every item, every price, the `✨ Thema-looks` shelf and all
  thirteen look trophies.
- **Validate:** a profile mid-way through several looks must show identical trophy progress
  before and after.

### Iteration 8 — World-pack spec, the calibrator, and worlds 2–3

- **Goal:** prove the pipeline by using it.
- **Player sees:** Rainbow World and Jungle World.
- **Under the hood:** ideally **zero new functions**, plus the `?debug&mapedit` calibrator
  (§F8) — which is worth building now, at the moment you are placing coordinates for the
  second time. If a new world needs code, the architecture failed and this is where you find
  out cheaply.
- **Risk:** discovering a world needs a code path. Budget for one round of generalisation.
- **Validate:** the diff for world 3 should be data + assets only.

### Iteration 9 — The endless tail

- **Goal:** the app never reads as "finished".
- **Player sees:** after the last world, a summit that says more is coming, and a
  continuing Sterrentournee.
- **Under the hood:** the `worldFor` fallback; a neutral theme; no new mechanics.
- **Validate:** seed a profile past the last authored level and confirm nothing throws,
  nothing is `undefined`, and stars/diamonds/trophies still work.

---

## J. First recommended experiment

**Build Iteration 0 and a hard-scoped version of Iteration 3, together, as one throwaway
prototype on a branch — and show it to a child.**

Concretely:

- Take levels 1–6 exactly as they are. Call them **IJswereld**. Hardcode it; no `WORLDS`
  table, no prefix sums, no migration, no transition — one world is enough to answer the
  question.
- One painted map at 1080 × 1840 with six hand-placed coordinates, `contain`-fitted with
  themed gutters. This is the one thing worth paying for up front: the painting *is* the
  hypothesis, and a token-only prototype cannot test it.
- Header: `❄️ IJSWERELD` / `Level 4 / 6`. Delete the career strip for the duration of the
  test.
- Give 3-star nodes the gold glow; add the `⭐ n / 18` world counter.
- Seed it through the existing `?debug&demo` harness so any state is one URL away.

**The uncertainty this resolves** is the one that everything else is built on, and it is
not a technical one: *does a five-to-eight-year-old actually read this as "I am travelling
through a world", and does the boundary feel like an event worth reaching?* Nothing in the
architecture answers that, and every iteration after 2 is expensive if the answer is no.

**What to watch for, in order:**

1. Can she say where she is, without reading? (Colour and icon, not the word "IJswereld".)
2. Does she point at the dull nodes, unprompted?
3. At the summit, does she ask what is next — or does she not notice it?
4. Does the cold palette make the question card or the **Speel!** button harder to find?

If 1 and 3 land, build the real thing in the order above. If only 2 lands, mastery is your
real motivator and worlds are decoration — ship Iteration 0 properly and scale the rest
back. If none land, the map is not the problem, and the money is better spent on the venue
and the crowd (Iteration 6), which is the only change on this list that touches the screen
where the child actually spends their time.

The prototype is a branch, one piece of art, a few hundred lines of CSS and two small
render changes. It should cost a day plus one painting, and it can be thrown away without
leaving anything behind.
