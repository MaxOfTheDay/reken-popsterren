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

Instead: **the map shows the current world's nodes plus one gateway node** — the entrance
to the next world, rendered in the *next* world's colours, sitting at the end of the path
where the road currently fades out. You get the "worlds fade into one another" feeling you
described, at exactly one boundary at a time, which is the only boundary the child can act
on. Swiping past the gateway can walk into the next/previous world later; it is not needed
for v1.

This preserves `renderTourMap`'s current shape almost exactly (a bounded list of nodes and
a road through them) and gives a natural place to swap the background theme.

It also answers §8 for free: the final authored world simply ends with a "more coming"
node instead of a gateway.

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
grounds: **the world owns the venue, the child owns the podium.**

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

**Seeing the map.** The screen opens already centred on her node. The sky, ground glow and
road colour are the world's: Ice World is cold blue with a pale horizon. The header reads

```
        ❄️ IJSWERELD
          Level 4 / 6
```

with her avatar left and a tappable 💎 right. No rank bar, no star total. She sees roughly
three and a half nodes: the two she has finished behind her (one glowing gold because it
is perfect, one duller with two stars), her own avatar standing on node 4 with a pulsing
gold medallion and the **Speel!** bubble, and node 5 half-visible ahead under a padlock.

**Selecting a level.** She taps her own node, or any earlier one. Nothing new — this is
`startLevel(l)` as it works today.

**Playing.** The show. Behind her podium, the *venue* is now icy: a cold back wall, a
crowd silhouette lit in pale blue. Every correct answer brightens the crowd — the same
`G.fan` value, now driving the crowd lights as well as the bar. The bar can eventually
shrink to a thin rim; the crowd is the meter.

**Receiving stars.** The existing star ceremony, unchanged — it is already the best moment
in the app. One addition: if this replay *improved* her result, the line under the stars
says so warmly (`Beter dan vorige keer! ⭐⭐⭐`) instead of the generic praise.

**Returning to the map.** Her avatar hops to node 5, the road's gold grows with her — the
existing `runTravel` + `growRoad`, untouched. If she just made node 4 perfect, node 4 is
now visibly gold and sparkling behind her, and the small world counter near the world name
ticks: `⭐ 11 / 18`.

**Completing a world.** Finishing the last level of Ice World plays the ordinary end
screen, then one extra beat: the map opens, her avatar walks to the **gateway node** at the
end of the path, the ice fades into the next world's colours across the boundary, and the
Ice badge flies into the trophy cabinet (reusing the existing claim ceremony). The
milestone pill on the end screen already exists to carry this.

**Entering the next world.** The map is now Rainbow World, node 1 is the pulsing gold
"Speel!", and behind her the gateway back into Ice World remains — tappable, so perfecting
old levels is always one swipe away.

If she never perfects anything, nothing above nags her. The only pressure is that some
nodes shine and others do not.

---

## D. Proposed information architecture

```
Map  (home)
 ├── header: [avatar] ── WORLD NAME / Level x / y ── [💎]
 │      avatar  → profile sheet: switch star · sound · haptics · Voor ouders
 │      💎      → Kleedkamer (shop)
 ├── track: world nodes + gateway
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
| **Diamonds** | header right slot, all screens | during a show it is earning feedback (`flyDiamonds` lands there), not navigation — so visible, not tappable |
| **Stars** | on the nodes, and on the end screen | never as a global counter in the header; the world counter (`⭐ 11/18`) is the only aggregate a child sees |
| **Badges** | trophy cabinet, `🌍 Werelden` shelf | one per world, two visual states (earned / all-perfect) |
| **Rank** | end screen milestone + profile sheet | keeps paying diamonds; stops occupying the home screen |

Net effect on the map's top band: seven pieces of information become three.

---

## E. World-map UX

### E1. Direction: stay horizontal

§3 asks whether the path should scroll vertically. **No**, and not only from inertia:

1. Horizontal is the only axis that makes **landscape a free win**. The same flex row that
   shows 3–4 nodes in portrait shows 6–8 in landscape — "more of the journey", exactly what
   you asked for, with no second layout.
2. Vertical fights the sticky header and the fixed bottom nav for the same axis.
3. `centerStop`, `updateParallax`, `runTravel`, `growRoad`, `waveY` and the road SVG are all
   built horizontally. Changing axis is ~200 lines rewritten for zero child-visible gain.
4. Candy Crush is vertical because it is portrait-only with hundreds of levels on one map.
   Neither condition holds here.

### E2. Responsive behaviour

One DOM, one layout, three breakpoints that already exist (`max-height:700`,
`min-height:760`, `max-width:390` adjust node size and track padding). Add nothing
structural. `waveAmplitude()` already shrinks the meander on short viewports — that is the
landscape-phone case, already handled.

Visible context, by device:

```
portrait phone   ┆ ●──●──★──○ ┆         ~3.5 nodes, current centred
landscape phone  ┆ ●──●──●──★──○──○ ┆    ~6 nodes, most of a world
tablet           ┆ whole world + gateway ┆
```

Auto-centre the current node on open (already done) and after a travel (already done). Do
**not** auto-centre on every re-render — if a child has deliberately scrolled back to an
old level, snapping them forward is hostile.

### E3. Wireframe

```
┌──────────────────────────────────────────┐
│ (o) Lotte      ❄️ IJSWERELD        💎 240│   ← tappable avatar / tappable 💎
│                 Level 4 / 6              │
├──────────────────────────────────────────┤
│                                    ⭐11/18│   ← small world counter, right-aligned
│                                          │
│        ╭───────╮                         │
│        │  ▲    │  ← her avatar           │
│   ●────●───────●╌╌╌╌○╌╌╌╌◇               │
│  ⭐⭐⭐  ⭐⭐☆   Speel!  🔒    ▒▒          │
│  glow                            ↑       │
│                         gateway: next world's
│                         colours, road and sky
│                         start bleeding across
│                                          │
│   ░░░░░ world ground glow ░░░░░░░░░░░░   │
├──────────────────────────────────────────┤
│     🗺️ Kaart   👕 Kleedkamer  🏆 Trofeeën │
└──────────────────────────────────────────┘
```

### E4. Node states

Five states, four of which already have CSS:

| State | Treatment | Exists? |
|---|---|---|
| Locked | grey medallion, 🔒, dim label, three dim stars | yes |
| Current | gold medallion, pulse ring, avatar standing on it, **Speel!** bubble | yes |
| Done, 1–2 ★ | purple medallion with a gold rim, earned stars bright, missing stars dim | yes |
| **Mastered, 3 ★** | medallion becomes warm gold, a slow sparkle every few seconds, star row fully lit | **new — one CSS class** |
| **Gateway** | diamond/arch shape in the *next* world's accent colour, its icon showing | **new** |

### E5. The replay invitation (§5)

The strongest pull is not on the node, it is on the **set**. Three glowing nodes next to
two dull ones creates a "make them match" itch with no failure language anywhere. Support
it with exactly three things:

1. The mastered glow above.
2. The small world counter `⭐ 11 / 18` near the world name — an aggregate the child *can*
   complete, unlike a global total which never ends.
3. When a world reaches 18/18, the whole road glows gold once and the world badge gains its
   ⭐ ring. That is the "small world-level reward" §5 asks about, and it costs one class and
   one condition.

Explicitly not: red, "!", counters of what is missing, notifications, a "perfect it!"
call to action, or any second CTA competing with **Speel!**.

One warm touch worth having: on a replay that improves the result, say so on the end
screen. On a replay that does *not* improve it, say nothing about it at all — the old
result stands silently (`Math.max` already does this).

### E6. World transitions

At the boundary, three tokens cross-fade over roughly one node's width: sky colour, ground
glow colour, road colour. Because all three are CSS custom properties on the map root (see
F), the transition is a gradient between two token sets, not a bespoke animation per pair
of worlds. N worlds, one transition implementation.

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

Per world, in priority order. **Only the first row is required**; a world with nothing but
tokens must look finished, because the app is offline-first, image-budgeted, and you want
config-first worlds.

| # | Item | Form | Required | Notes |
|---|---|---|---|---|
| 1 | theme tokens (5 colours) | JS/CSS vars | **yes** | the whole world can ship on these alone |
| 2 | node icons | emoji, or one SVG sprite | **yes** | emoji is fine and renders everywhere |
| 3 | badge | emoji (later: SVG symbol) | **yes** | shown at ~44 px in the cabinet |
| 4 | venue backdrop | raster `.webp`, ≤ 120 KB, 1× + 2× | no | the biggest single upgrade |
| 5 | crowd layer | raster `.png` with alpha, blurred, 1× only | no | driven by `--fan` |
| 6 | map horizon | raster `.webp` | no | falls back to the existing gradient ground |
| 7 | decorative motifs | procedural / CSS | no | never a per-world code path |

Rules: raster only for atmosphere (venue, crowd, horizon). CSS gradients for anything that
must stay crisp at every size. SVG only for symbols reused at several sizes (badges,
node icons if they graduate from emoji). Never generate unique art for a node, a star, or
a UI chrome element.

Naming and budget follow `docs/ART-DIRECTION.md` §7.2–7.3 — do not invent a second
convention. Add `assets/world/<id>-<part>.webp`.

**A "Create a Pirate World pack" request then means exactly:** an id, a Dutch name, a level
count, 5 theme colours, N node emoji, a badge emoji + name, and optionally three images at
the named paths. Nothing else.

---

## G. Edge cases

**Replaying old levels.** Already correct. Verify only that the map re-renders node state
after returning (it does: `goMap()` re-renders).

**Improving stars.** `Math.max` already. The one new behaviour worth adding: detect
improvement in `endLevel` (compare against the pre-write value) so the end screen can
congratulate it. Cheap and it is the entire emotional payoff of §5.

**Not improving on a replay.** Say nothing. Do not show "je vorige resultaat was beter".

**Reaching the end of authored worlds.** `worldFor(lvl)` must never return `undefined`.
Recommended: a final **"Sterrentournee"** pseudo-world, entered after the last authored
world — neutral/celebratory theme, keeps counting levels, keeps paying stars, diamonds,
rank-ups and trophies exactly as before, and its gateway node reads `✨ Binnenkort meer
werelden!` rather than a padlock. This is the simplest option that satisfies your
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

## H. Incremental rollout plan

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

### Iteration 2 — Map becomes world-scoped

- **Goal:** one world per map screen, with a gateway.
- **Player sees:** the track holds only this world's nodes plus a gateway node at the end;
  `Level 4 / 6` under the world name; the world star counter.
- **Under the hood:** `renderTourMap` bounds its loop by the world instead of `p.level+3`;
  a gateway node type; **the orientation/resize fix lands here.**
- **Risk:** the road and travel animation assume a contiguous node list — travel across a
  world boundary is now a special case. Handle it as "the travel animation ends at the
  gateway, then the map re-renders into the next world", which is also the celebration beat
  from C.
- **Deliberately unchanged:** themes (still the current purple), stars, badges, header
  chrome beyond the title.
- **Validate:** shots at 320/390/tablet, portrait and landscape; rotate mid-map.

### Iteration 3 — One prototype world, tokens only

- **Goal:** prove a world *feels* like a place, with no new art.
- **Player sees:** Ice World's map is cold blue — sky, ground glow, road, node rims — and
  fades into the next world's colours across the gateway.
- **Under the hood:** `theme` tokens + `applyWorldTheme`; every map component switched to
  `var(--w-*)`; the venue/podium split introduced on the show screen with CSS gradients
  only.
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
  walk to the gateway, the world fading into the next, and a badge in the cabinet.
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

### Iteration 6 — Themed venue and crowd applause

- **Goal:** the world reaches the screen where the child spends most of their time.
- **Player sees:** an icy room behind her podium; the crowd lighting up as she answers.
- **Under the hood:** `applyVenue` alongside `applyStage`; one `.crowd` layer driven by
  `--fan` from the existing `updateFan()`; first real per-world images.
- **Risk:** budget and offline. Cap at ≤ 120 KB per image; add to `sw.js` `ASSETS`; **bump
  `CACHE`.**
- **Deliberately unchanged:** the fan mechanic, the encore, the diamond payouts, the
  purchased podium.
- **Validate:** measure total payload; test offline after a hard reload; confirm the
  purchased stage is still visibly the child's.

### Iteration 7 — World-pack spec, and worlds 2–3 as pure configuration

- **Goal:** prove the pipeline by using it.
- **Player sees:** Rainbow World and Jungle World.
- **Under the hood:** ideally **zero new functions.** If a new world needs code, the
  architecture failed and this is where you find out cheaply.
- **Risk:** discovering a world needs a code path. Budget for one round of generalisation.
- **Validate:** the diff for world 3 should be data + assets only.

### Iteration 8 — The endless tail

- **Goal:** the app never reads as "finished".
- **Player sees:** after the last world, a gateway that says more is coming, and a
  continuing Sterrentournee.
- **Under the hood:** the `worldFor` fallback; a neutral theme; no new mechanics.
- **Validate:** seed a profile past the last authored level and confirm nothing throws,
  nothing is `undefined`, and stars/diamonds/trophies still work.

---

## I. First recommended experiment

**Build Iteration 0 and a hard-scoped version of Iteration 3, together, as one throwaway
prototype on a branch — and show it to a child.**

Concretely:

- Take levels 1–6 exactly as they are. Call them **IJswereld**. Hardcode it; no `WORLDS`
  table, no prefix sums, no migration, no gateway logic beyond a static node at the end.
- Theme the map from five CSS variables: sky, ground glow, road, node rim, accent. No
  images at all.
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
3. At the gateway, does she ask what is next — or does she not notice it?
4. Does the cold palette make the question card or the **Speel!** button harder to find?

If 1 and 3 land, build the real thing in the order above. If only 2 lands, mastery is your
real motivator and worlds are decoration — ship Iteration 0 properly and scale the rest
back. If none land, the map is not the problem, and the money is better spent on the venue
and the crowd (Iteration 6), which is the only change on this list that touches the screen
where the child actually spends their time.

The prototype is a branch, a few hundred lines of CSS and two small render changes. It
should cost a day, and it can be thrown away without leaving anything behind.
