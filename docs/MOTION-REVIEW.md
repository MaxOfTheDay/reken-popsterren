# Motion & Micro-interaction Review

*Audit of the motion currently in `index.html`. Nothing here is implemented — this is
the map before the roadworks. Line numbers are from the commit this was written
against and will drift; the function and class names won't.*

---

## 1. The current motion system, in one page

There are **three motion layers** in the app, and only one of them was designed as a
system.

**Layer A — the spatial layer (designed, documented, engineered).**
`MOTION` (`index.html:10668`), `VLUCHT` (`:10879`) and `WERELDREIS` (`:10312`) define a
screen-to-screen language for exactly four screens: **Kaart, Zaal (spel), Eindscherm,
Werelden (reis)**. Every animation in this layer is transform/opacity only, has an
explicit cleanup function, a `setTimeout` safety net on top of `animation.onfinish`, a
re-entry lock (`overgangBezig`, `terugBezig`, `wereldReisOp`, `vluchtOp`), and a
`motionOff()` fallback that lands on the same state without moving. The `wereldVlucht`
even pre-computes 25 keyframes so the clip and the artwork can't drift apart on a slow
main thread. This layer is genuinely good and should be the model for everything else.

**Layer B — the celebration/personality layer (grown, not designed).**
Confetti, avatar dances, sparkles, flying diamonds, flying badges, praise and toast
cards, and four full-screen ceremony overlays. Roughly forty hard-coded durations, no
shared tokens, no shared lock, and sequencing done by `setTimeout` offsets that were
each correct in isolation. This is where every problem in section 3 lives.

**Layer C — press feedback (unowned).**
Eighteen components each pick their own `transition: transform <n>` between 70 ms and
240 ms. Two of the eighteen read the `--t-tik` token.

The three layers share no vocabulary. Layer A reads `MOTION.kom`; layer B writes
`{ duration: 620 }`; layer C writes `.07s`. The app is not short of motion — it is
short of *one* motion.

---

## 2. Inventory

`blocks` = blocks input while it runs. `ack` = needs a tap to dismiss.
`RM` = correctly honours `prefers-reduced-motion`.

### A. Navigation / orientation

| # | Screen / component | Trigger | What moves | Timing | blocks | ack | shot | RM |
|---|---|---|---|---|---|---|---|---|
| A1 | any `.screen` (`:976`) | screen becomes active | opacity 0→1 | 180 ms ease | no | no | repeat | ✅ |
| A2 | first paint (`body.start`, `:993`) | app boot | — (fade suppressed) | 0 | no | no | once | n/a |
| A3 | `schermWeg` (`:10794`) | leaving map/zaal/eind/reis | whole screen `scale(1.07)` in, or `scale(.96) translateY(10px)` out; opacity→0 | 140 ms, `MOTION.in` for transform / `MOTION.uit` for opacity | yes (lock) | no | repeat | ✅ |
| A4 | `enterLevel` (`:11221`) | tap a tour stop | zaal `scale(1.06)→1` about the tapped point | 190 ms after 110 ms delay | yes (`pointer-events:none`) | no | repeat | ✅ |
| A5 | `kaartKomtOp` (`:11302`) | map becomes visible | map `scale(1.06)→1` (from a show) or `scale(1.03)→1` (tab/back) | 190 ms (+110 ms delay only with a focus point) | no | no | repeat | ✅ |
| A6 | `navMee` (`:10826`) | any map↔zaal transition | nav bar opacity, matched to the screen it belongs to | 140 / 190 ms | no | no | repeat | ✅ |
| A7 | `wereldVlucht` (`:11087`) | Werelden ↔ Kaart | world art scales between full-screen and its card; 25 pre-computed frames, separate radius track | 340 ms + 80 ms crossfade | yes, 340 ms | no | repeat | ✅ |
| A8 | `globeVlucht` (`:11159`) | same | the 🌍 glyph flies between the two headers | 340 ms | no | no | repeat | ✅ |
| A9 | `wereldCamera` (`:10384`) | world arrows, back pill, world reveal, world change | cloned shadow layer slides a full screen height; camera climbs | 340 ms (browsing) / 900 ms (reveal) + 1160 ms frame settle | yes (`pointer-events:none` + lock) | no | repeat | ✅ |
| A10 | `kopMeeMetCamera` (`:10361`) | with A9 | world label 9 px + opacity .2→1 | 220 ms, 40 ms delay | no | no | repeat | ✅ |
| A11 | `openReis` non-flight path (`:12126`) | Werelden from a non-map screen | reis `scale(1.09)→1` | 190 ms / 110 ms delay | no | no | repeat | ✅ |
| A12 | `reisNaarWereld` (`:12271`) | pick a world on Werelden | A7 + local detail fade-in (90 ms) + route fade-out (90 ms) | 420 ms total | yes | no | repeat | ✅ |

### B. Feedback (answer & tap)

| # | Component | Trigger | What moves | Timing | blocks | RM |
|---|---|---|---|---|---|---|
| B1 | `.btn` (`:1009`) | press | `translateY(4px)` + lip collapse | 80 ms | no | — |
| B2 | `.tour-stop .stop-body` (`:3649`) | press | `scale(.88)` in, spring out | 90 ms in / 240 ms out, `cubic-bezier(.34,1.56,.64,1)` | no | ✅ |
| B3 | 16 other pressables | press | `scale`/`translate` | 70 / 100 / 120 / 140 / 150 ms — see §3.7 | no | partial |
| B4 | `tapRipple` (`:14993`) | tap a stop, tap a world card | expanding ring from the tap point | 500 ms | no | ✅ |
| B5 | `.choice-btn.good` / `.count-tile.good` (`:2810`) | correct answer | `goodPop` + `goodRing` | 500 / 550 ms | no | ✅ |
| B6 | `zaalJuicht` (`:14586`) | correct answer | venue lights up one beat | 220 ms in, held 380 ms | no | ✅ |
| B7 | `flyDiamonds` (`:15620`) | correct answer, purchase | 2–3 💎 arc to the counter + badge pulse | 620–840 ms + 340 ms | no | ❌ |
| B8 | `showPraise` (`:14698`) | correct answer and ~8 other events | `praisePop` card | 900 ms | no | ❌ |
| B9 | `dance()` (`:14624`) | every correct answer | avatar plays one of 6 moves | 950 ms | no | ❌ |
| B10 | `.wobble` (`:3052`) | wrong answer | question card shakes | 420 ms | no | ✅ |
| B11 | `loseHeart` (`:14593`) | second miss | hearts `shake`, then text swap | 400 ms + swap at 900 ms | no | ❌ |
| B12 | `slipNote` (`:3064`) | wrong answer | 🎵 floats away | 1600 ms | no | ❌ |
| B13 | `.mem-inner` / `memSnap` / `memShake` (`:2888`) | memory card flip | 3D flip, snap, shake | 350 / 420 / 400 ms | no | ✅ |
| B14 | `cpop` / `cfade` / `df-dot` (`:2695`) | counting objects appear/disappear | pop in, fade out | 400 / 500 ms | no | ✅ |
| B15 | `vraagIn` (`:2589`) | new question card | 7 px rise + fade | 140 ms | no | ✅ |
| B16 | `slot-nee` (`:4574`) | tap a locked world | seal shakes its head | 500 ms | no | ✅ |
| B17 | `vraagt` (`:6902`) | incomplete new-star form | field ring pulses | 1150 ms × 2 | no | ✅ |
| B18 | `.saved-pill` (`:6461`) | settings saved | pill fades in, held | 250 ms, held 1400 ms | no | — |

### C. Celebration / reward

| # | Component | Trigger | What moves | Timing | blocks | ack | shot | RM |
|---|---|---|---|---|---|---|---|---|
| C1 | `renderEndStars` (`:14941`) | show finished | 3 stars pop one by one, each with a rising tone | 420 / 720 / 1020 ms, 480 ms each | no | no | once | ✅ |
| C2 | 3/3 star burst (`:14969`) | 3 stars | `confettiBurst(26)` from the star row + row pulse | at 1160 ms | no | no | once | ✅ |
| C3 | `confetti(40)` (`:14901`) | show finished | 40 emoji fall the full screen | 1.8–3.4 s each, 4.5 s lifetime | no | no | once | ❌ |
| C4 | `finaleDance(6)` (`:14902`) | show finished | avatar cycles all six moves | 6 × 620 = **3720 ms** | no | no | once | ❌ |
| C5 | `rankUpCelebrate` (`:13092`) | new star rank | full-screen overlay, 16 radiating sparks, badge pop, two rising labels | opens at 650 ms, auto-closes at 2200 ms, chains next at +320 ms | yes (overlay) | tap or timer | once | ✅ |
| C6 | `wereldFeest` (`:13141`) | world finished / perfect | full-screen overlay, rows rise, `confettiBurst(30)` | opens at 650 ms, auto-closes at 3100 ms (6000 ms with the *Doe aan* button) | yes (overlay) | tap or timer | once | ✅ |
| C7 | `celebrateTrophy` (`:13047`) | child opens a ready trophy | chest shakes → bursts, rays spin, ring expands, emoji reveals then bobs, `confettiBurst(30)` **plus 5 more every 1100 ms until dismissed** | 480 ms suspense, then open-ended | yes | **yes** | once/trophy | ✅ |
| C8 | `claimShimmer` (`:5501`) | after C7 | gold sweep over the claimed card | 900 ms | no | no | once | ✅ |
| C9 | `flyBadge` (`:12709`) | world finished | world icon arcs to the Trofeeën tab, coin sound at 900 ms | 1100 ms | no | no | once | ❌ |
| C10 | `.net-af` star landing (`:3961`) | first map draw after a show | star tab drops in, three stars land | 100/185/270 ms delay, 280 ms each | no | no | once | ✅ |
| C11 | `starRevealBeat` (`:11350`) | before any travel | *nothing* — a deliberate 550 ms + 200 ms pause | 750 ms | yes (gates travel) | no | once | ✅ |
| C12 | `runTravel` walk (`:13430`) | level-up inside a world | avatar follows the road itself to the next stop (`heroRoadFrames`, sampled off the same path with `getPointAtLength`); gold road grows with her, from the same length; light three-step spring; sparkle every 280 ms; haptic pattern | `REIS_DUUR` 1400 ms after `REIS_WACHT` 400 ms | yes (map locked) | no | once | ✅ |
| C13 | `runTravel` arrival (`:12755`) | end of C12 | next stop dot pops, coin, `confetti(14)`, praise | 450 ms | no | no | once | partial |
| C14 | `runWorldChange` (`:12673`) | level-up across a world border | C9 → C10/C11 → 560 ms silence → A9 (900 ms) → `confetti(26)` + praise | ≈ 3.3 s chain | yes | no | once | ✅ |
| C15 | `runWorldReveal` (`:11478`) | a world released since last play | A9 (900 ms) → coin + `confetti(26)` + praise | ≈ 1.2 s | yes | no | once | ✅ |
| C16 | encore / golden question (`:14506`) | in-show milestones | `confetti(24)` / `confetti(10)` + praise, longer pause before next question | 1400 ms hold | no | no | repeat | ❌ |
| C17 | `koopVonken` (`:15595`) | purchase | 6 sparks fan up from the card | 620 ms | no | no | repeat | ✅ |
| C18 | `boughtPop` + shimmer (`:6010`) | purchase | card pops, gold sweep | 500 / 620 ms | no | no | repeat | ✅ |
| C19 | `statusPop` + `readyPulse` (`:6108`) | purchase | "Nieuw!" pill pops then pulses once | 320 + 1400 ms | no | no | repeat | ✅ |
| C20 | `finishMemory` (`:13948`) | memory set complete | `confetti(28)` + `flyDiamonds` | — | no | yes (panel) | repeat | ❌ |
| C21 | `bumpPintjeTaps` (`:14658`) | easter egg, 5 taps | 10 staggered sparkles + praise | 700 ms | no | no | repeat | ✅ |

### D. Character / personality

| # | Component | Trigger | What moves | Timing | shot | RM |
|---|---|---|---|---|---|---|
| D1 | `.avatar-holder.idle` (`:1769`) | always, every avatar | 2.5° sway | 2.6 s, infinite | ambient | ✅ |
| D2 | star-picker wave (`:9895`) | `renderProfiles()` | each star waves once, staggered | 350 + i·130 ms, 950 ms each | per render | ✅ |
| D3 | `tapDance` (`:14635`) | tap the avatar | one random move + sparkle + sound | 950 ms | repeat | ❌ |
| D4 | `dance` on equip/buy (`:15730`, `:15703`) | dress up / purchase | one move | 950 ms | repeat | ❌ |
| D5 | `dance('end-avatar')` (`:13213`) | *Doe aan* in the world party | one move | 950 ms | once | ❌ |

**D2 is the only view-entry personality moment in the entire app.**

### E. Ambient / decorative (all infinite)

| # | Component | Where | Timing | RM |
|---|---|---|---|---|
| E1 | `lights` on `.stage::after` (`:1755`) | zaal, eindscherm, kleedkamer | 3.5 s alternate | ❌ |
| E2 | `drift` clouds / planes (`:2130`) | map sky, reis mist | 58–112 s | ✅ |
| E3 | `heroVonk` (`:4175`) | sparkle beside the star on the map | 6.5 s | ✅ |
| E4 | `stopSpot` (`:3877`) | spotlight under the next stop | 2.8 s | ✅ |
| E5 | `reisGloed` (`:4708`) | current world card on Werelden — **animates `box-shadow`** | 3.4 s alternate | ✅ |
| E6 | `goldGlow` (`:3075`) | golden question card — **animates `box-shadow`** | 1 s alternate | ❌ |
| E7 | `shineSweep` + `giftWiggle` (`:5420`, `:5443`) | ready trophy card | 2.6 / 2.2 s | ✅ |
| E8 | `readyPulse` (`:5258`) | *Open trofee* pill | 1.4 s | ✅ |
| E9 | `beloningKlop` (`:5305`) | gold milestone pill on the end screen | 2.4 s | ✅ |
| E10 | `earwiggle` (`:2669`) | listen button, count mode | 1.4 s | ✅ |
| E11 | `chestShake` / `emojiBob` / `raysSpin` (`:5460`) | trophy pop | 0.5 / 2.6 / 10 s | ✅ |
| E12 | `wpHintKnipoog` (`:3484`) | globe pill, **once per session** (`wpHintKlaar`, `:10497`) | 900 ms after 600 ms | ✅ |

### F. State change

| # | Component | Trigger | What moves | Timing | RM |
|---|---|---|---|---|---|
| F1 | `#screen-trophies .gescrold` (`:4956`) | scroll past 4 px | header `padding` + background + shadow; `.kast-telling` `max-height`/`margin`/`padding`; `.kt-vul` `width` | 220 ms | ✅ |
| F2 | `#screen-settings .gescrold` (`:6334`) | scroll past 4 px | header `padding`, `font-size`, `width`, `height`, `margin` on five elements | 220 ms | ✅ |
| F3 | `#screen-map .screen-header` (`:1882`) | star passes behind the header (`kopOpzij`) | opacity | 300 ms | ✅ |
| F4 | `gearPop` (`:1671`) | gear menu opens | scale + rise | 160 ms | ❌ |
| F5 | `.segbar > span` (`:2255`) | memory progress | background colour | 250 ms | — |
| F6 | `.spotlight-bar` (`:2302`) | `startSpot` interval | width, linear | 100 ms | — |
| F7 | `.reis-terug.aan` (`:4801`) | scrolled away on Werelden | opacity + rise | 200 ms | ✅ |
| F8 | `popFade` / `popIn` (`:2030`, `:2054`) | career ladder, trophy pop, rank-up, world party | backdrop fade + panel spring | 250 / 400 ms | ✅ |
| F9 | `telNaar` (`:15562`) | **kleedkamer purchase only** | diamond counter counts down | 520 ms | ✅ |

---

## 3. What's wrong

### 3.1 Celebrations play *behind* celebrations — the worst moment is the one that gets hidden

`endLevel` (`:14812`) starts, in the same turn:

- `confetti(40)` — falls for up to 4.5 s
- `finaleDance('end-avatar', 6)` — **3720 ms** of dancing
- `renderEndStars(stars)` — stars land at **420 / 720 / 1020 ms**, 3-star cannon at **1160 ms**

…and then schedules the overlay:

```js
if (rankUp) setTimeout(() => rankUpCelebrate(rankUp.rank, naFeest), 650);
else if (naFeest) setTimeout(naFeest, 650);
```

**650 ms is before star two.** When a show earns a rank-up or finishes a world, the
child watches stars two and three — and the three-star confetti cannon — land *behind*
a full-screen overlay. The rarer and more earned the moment, the more of it is
covered. This is the single clearest defect in the audit, and it is a one-number fix.

### 3.2 One level completion can fire five separate particle systems

Worst realistic case — last show of a world, three stars, rank-up:

| moment | particles |
|---|---|
| end screen | `confetti(40)` |
| 3/3 stars | `confettiBurst(26)` |
| rank-up | 16 `rankup-spark` |
| world party | `confettiBurst(30)` |
| map arrival after travel | `confetti(26)` |

≈ **140 animated nodes across ~12 seconds**, plus `flyBadge`, plus the sparkle trail
during the hop (one node every 280 ms for 1.85 s), plus the travel haptics. Each piece
was judged well on its own; the stack was never looked at as one event.

### 3.3 Four particle implementations for one idea

- `confetti(n)` (`:14977`) — falls from the top, 1.8–3.4 s, removed at 4.5 s
- `confettiBurst(cx,cy,n,hero)` (`:15003`) — radiates from a point, 950 ms
- `sparkle()` / `sparkleAt()` (`:14647`) — a single `.confetti-bit`, 1.2 s
- `koopVonken()` (`:15595`) — `confettiBurst` re-implemented inline with a narrow fan

Three of the four use the same `.confetti-bit` / `.burst-bit` CSS with different
inline parameters. This should be one function with a shape argument.

### 3.4 `prefers-reduced-motion` has real holes — and the rest of the app is meticulous about it

The CSS carries **29** reduce rules and the JS has `motionOff()` guards nearly
everywhere. These are the misses:

| Not honoured | Where | Effect for a reduced-motion child |
|---|---|---|
| `confetti()` / `.confetti-bit` / `fall` | `:14977`, `:7016` | 40 emoji fall the screen after every show; 24–28 more on encores and memory |
| `.avatar-holder.move-*` (6 keyframes) | `:1776–1781` | `dance()`, `tapDance()`, `finaleDance()` all run; 3.7 s of dancing on the end screen |
| `flyDiamonds` | `:15620` | diamonds arc on every correct answer |
| `flyBadge` | `:12709` | badge arcs to the tab bar |
| `lights` on `.stage::after` | `:1755` | runs forever on the active screen |
| `goldGlow` | `:3075` | `box-shadow` animation, forever, on the golden question |
| `praisePop`, `toastIn`, `shake`, `slipNote`, `gearPop` | `:2997`, `:3022`, `:3044`, `:3064`, `:1671` | small but constant |

`sparkle()` inherits the `confetti()` hole via `.confetti-bit`.

### 3.5 The documented motion ladder no longer matches the code

Both `:root` (`:780–795`) and the `MOTION` header (`:10652`) state the ladder as:

> `tik 70 · snel 220 · nav 320 · reis 380`

`MOTION` defines **no `nav` and no `reis`**. A screen change is `weg 140 + komNa 110 +
kom 190 = 300 ms`; a world flight is `VLUCHT.duur 340 + kruis 80 = 420 ms`. Two comment
blocks that explicitly instruct the reader to keep them in sync have drifted from the
code they describe. Fix the comments, not the numbers — 300/420 are the measured,
deliberate values.

### 3.6 Fourteen easing curves, most of them near-duplicates

```
arrive:    .2,.8,.3,1   .32,.78,.24,1   .2,.8,.25,1   .33,.72,.25,1
overshoot: .34,1.56,.64,1   .2,1.5,.4,1   .2,1.4,.4,1   .2,1.3,.4,1
           .2,.86,.3,1.3   .2,.86,.3,1.2   .22,1.1,.4,1
depart:    .5,0,.75,0   .55,0,.2,1
other:     .15,.6,.3,1
```

Four "arrive" curves differ by hundredths and are indistinguishable at these
durations. Seven overshoot curves exist despite `MOTION.plop` being documented as *"de
enige overshoot"*. On top of that, raw `ease` / `ease-out` / `ease-in-out` / `linear`
appear in a dozen WAAPI calls (`renderEndStars`, `flyBadge`, `flyDiamonds`, `growRoad`,
the arrival dot pop).

`VLUCHT.baan` genuinely earns its own curve — the comment explains why, and it's
right. The other three "arrive" variants do not.

### 3.7 Press feedback has eight different durations

| duration | components |
|---|---|
| 70 ms (`--t-tik`) | `.choice-btn`, `.gear-item` |
| 70 ms (literal) | `.count-tile`, `.trophy-card`, `.item-card`, `.chip`, `.tab-btn`, `.schat-entry`, `.add-tegel` |
| 80 ms | `.btn` |
| 100 ms | `.nav-item` |
| 120 ms | `.map-id-btn`, `.reis-plaats`, `.reis-halte.vol::after`, `#btn-gear .gear-ico` |
| 140 ms | `.ster-tegel`, `.spiegel` |
| 150 ms | `.shuffle-btn`, `.segmented button` |
| 90 ms in / 240 ms out | `.tour-stop .stop-body` |

Two of eighteen read the token. Seven of the eight values are within noise of each
other, so this isn't visible as inconsistency — it's visible as *nothing in particular*,
which is the same problem. `.tour-stop` is the deliberate exception (a place on a map,
not a button) and should stay.

### 3.8 Screen transitions cover 4 of the 10 screens

```css
#screen-map.wegvallend, #screen-game.wegvallend, #screen-end.wegvallend,
#screen-journey.wegvallend { ... }         /* :2623 */
#screen-map.komt-op, #screen-game.komt-op, #screen-end.komt-op,
#screen-journey.komt-op { animation: none; }
```

**Kleedkamer, Trofeeën, Instellingen, Memory, Nieuwe ster and the star picker have no
enter or exit motion at all.** They get the bare 180 ms `screenIn` opacity fade, and
the outgoing screen is removed on the same frame it loses `.active`.

Concretely, from the tab bar:

- **Kaart → Kleedkamer**: the map disappears instantly; the kleedkamer fades up from
  the app background. A cross-fade against nothing.
- **Kleedkamer → Kaart**: `goMap()` with no argument calls `kaartKomtOp(null)`
  (`:11460`), so the map zooms 1.03 → 1 with *no* fade — while the kleedkamer vanishes
  on frame one. The two directions don't match, and neither reads as a place change.

The tab bar is the most-used navigation in the app and it is the least considered.
This is also the clearest case of *motion tied to specific screens instead of reusable
behaviour*: `schermWeg()` and `kaartKomtOp()` are already screen-agnostic functions;
only the CSS class list and the call sites are hard-wired to four ids.

### 3.9 The map has no view-entry moment — anywhere

`.tour-hero` renders as `<div class="avatar-holder idle">` (`:12426`) and nothing else
ever touches it except `runTravel`'s hop. There is no arrival gesture on any path into
the map. The map is the home screen, the star lives there, and she does nothing when
you walk in. The user's hypothesis is correct: this is the gap.

### 3.10 `renderTourMap` rebuilds the whole map on every draw

`map.innerHTML = ''` (`:12360`), then the frame, the road SVG, every stop and the hero
are recreated. Consequences:

1. The `sway` animation restarts from frame 0 on **every** map draw — including every
   world-arrow press, the mid-travel intermediate state, and both halves of a world
   reveal. A subtle but real jitter.
2. Any personality gesture attached to `renderTourMap` would fire on *all* of those.
   **A view-entry gesture must be attached to navigation intent, not to rendering.**
   `goMap()` (`:11359`) is the right seam — it already knows which of the three cases
   it is in (see §6).

### 3.11 Two timing chains kept in sync by comment

`starRevealBeat` (`:11350`) recomputes the CSS star-landing schedule in JS:

```js
const STAP = .085, LAND = .28;
const landt = Math.round((.1 + (st - 1) * STAP + LAND) * 1000);
```

against `.1s` / `.185s` / `.27s` and `sterLandt .28s` in the CSS (`:3969–3973`). They
currently agree exactly, and the comment says *"verander je de één, meet dan de ander
na"*. It is the one place in the app where editing a CSS number silently breaks a JS
number.

`runWorldChange` (`:12673`) then chains: `flyBadge` → `starRevealBeat` (750 ms) →
`WERELDREIS.beat` (560 ms) → `wereldCamera` (900 ms) → frame settle (1160 ms) →
`confetti` + praise. The lock is handed between three owners mid-chain
(`wereldReisOp = wachten` → `null` → `wereldCamera`'s own). It is carefully guarded and
it works — but it is the most fragile thing in the file, and it is worth knowing that
before touching it.

### 3.12 Scroll-driven header collapse animates layout properties

- `#screen-trophies .hub-sticky` animates `padding`; `.kast-telling` animates
  `max-height`, `margin-top`, `padding`; `.kt-vul` animates `width`.
- `#screen-settings` animates `font-size`, `width`, `height` and `margin` across the
  header, the portrait, the icon buttons and the sub-tabs.

Each threshold crossing is ~220 ms of main-thread relayout *during a scroll*. The
threshold is a single `scrollTop > 4` with no hysteresis (`kastScroll` `:12820`,
`ouderScroll` `:16424`), so a thumb resting near 4 px can flip it repeatedly. On a
Pixel 10 this is survivable; on the old living-room tablet the README targets it is
the most expensive motion in the app.

### 3.13 Infinite `box-shadow` animations

`goldGlow` (`:3075`) and `reisGloed` (`:4708`) animate `box-shadow` forever.
`box-shadow` cannot be composited; both are paint-bound and repaint their element
every frame for as long as their screen is mounted. `reisGloed` sits on the largest
card on the Werelden screen. Both are visually right — they just want to be `opacity`
on a pseudo-element instead.

### 3.14 The diamond counter and the flying diamonds disagree

`telNaar()` (`:15562`) is a proper eased count-up with a reduced-motion fallback. It is
used in **exactly one place**: `shop-diamonds` after a purchase (`:15676`).

Everywhere else the counter snaps:

```js
$('game-diamonds').textContent = p.diamonds;          // :14501, t = 0
flyDiamonds(btnEl || $('question-card'), $('game-diamonds'), q.gold ? 3 : 2);
                                                      //        arrives at t ≈ 620 ms
```

The number changes **before** the diamonds that are supposedly carrying it have left
the button. Same at `end-diamonds` (`:14921`), `mem-diamonds` (`:13853`, `:13939`,
`:13953`), `map-diamonds`, `reis-diamonds`, `trophy-diamonds`. A finished mechanism is
sitting unused six feet away.

### 3.15 Smaller notes

- **`confetti()` leaks across screens.** Bits are appended to `#confetti-layer`
  (outside `#app`) and live 4.5 s on a `setTimeout`, so they keep falling over whatever
  screen the child navigated to. `.burst-bit` carries `will-change`; `.confetti-bit`
  does not, despite there being up to 40 of them.
- **`.wp-hint` is once per *session*, not once per entry** (`wpHintKlaar`, `:10497`).
  The instinct is exactly right; the scope is the one thing to revisit.
- **`world-back` appears with `hidden`** (`:10526`), a hard cut, while its sibling
  `.reis-terug` has a proper `.aan` transition (`:4801`). Two pills, same job, two
  behaviours.
- **`enterLevel` gives three responses to one finger**: `tapRipple`, a `.dot` scale
  1 → 1.22 → 1.05 over 240 ms, and the `.tour-stop:active` press. Defensible (press is
  on pointer-down, the other two on click) but worth watching.
- **`celebrateTrophy` sparkles forever** — `setInterval(…, 1100)` emitting 5 particles
  until the child dismisses the overlay (`:13075`). It is the only unbounded animation
  in the app. It's also the one moment the child opened deliberately, so it's the one
  place that can justify it.

---

## 4. Missing opportunities

Ranked by *felt improvement ÷ risk*.

1. **A view-entry gesture for the star on the map.** The single biggest "the world is
   alive" win available, and the app already has the vocabulary (`move-wave`,
   `move-bounce`) and the precedent (star picker, `:9895`). See §6 for the trigger rule
   — the rule matters more than the animation.
2. **Enter/exit motion for the tab-bar screens.** Reuse `schermWeg()` + a generic
   `schermKomtOp()`; extend the `.wegvallend` / `.komt-op` selector lists. Turns three
   hard cuts into the same language the map already speaks.
3. **Use `telNaar` for every diamond counter.** The mechanism exists, is
   reduced-motion-aware, and currently contradicts `flyDiamonds` on every correct
   answer. Delay it to the diamonds' arrival (~600 ms) and the two finally tell the
   same story.
4. **`world-back` should enter and leave like `.reis-terug`.** Ten lines of CSS.
5. **Hearts.** `loseHeart` swaps `❤️❤️💔` → `❤️❤️🤍` as a raw text write at 900 ms.
   A short cross-fade on the changed glyph would make the loss readable instead of
   merely noticed.
6. **The kleedkamer regroup.** After the "Nieuw!" beat, `renderShop()` rebuilds the
   grid at 1800 ms and the card teleports to the owned group; only the *scroll* is
   smooth (`:15701`). This is the most jarring un-animated state change left.

Explicitly **not** recommended: more celebration, more idle loops, per-world motion
variants, or any motion on the end screen. The end screen is already the densest
moment in the app.

---

## 5. Proposed motion language

Six patterns. No framework, no new abstraction layer — one tokens block and six
documented call shapes.

### 5.1 The ladder (corrected, and made true)

```
tik    70 ms   a press. Must stay under reaction time.
snel  220 ms   feedback: the answer to what the child just did.
nav   300 ms   a screen change  (weg 140 + komNa 110 + kom 190 — already true)
reis  420 ms   map ↔ world card  (duur 340 + kruis 80 — already true)
vier  900 ms   a reward moment that is allowed to be seen
```

`nav` and `reis` are not new numbers — they are the numbers `MOTION.totaal` and
`VLUCHT.duur + VLUCHT.kruis` already produce. Naming them makes the two comment blocks
honest again and gives layer B something to read.

### 5.2 The curves — three, plus one justified exception

```js
uit:  'cubic-bezier(.2,.8,.3,1)'     // arrives: quick release, soft landing  (= --ease-uit)
in:   'cubic-bezier(.5,0,.75,0)'     // departs: soft release, quick away
plop: 'cubic-bezier(.2,1.3,.4,1)'    // the only overshoot: "yes, this one"
baan: VLUCHT.baan                    // the world flight only — see the comment at :10900
```

Retire `WERELDREIS.uit` (`.32,.78,.24,1`) and `WERELDREIS.na` (`.2,.8,.25,1`) into
`uit`. Retire the six CSS overshoots into `plop`, with one exception:
`.tour-stop .stop-body`'s `1.56` is a deliberately bigger spring for the one control
that is a *place* and not a button — keep it, and say so in the comment.

### 5.3 The six patterns

| Pattern | Use | Duration | Easing | Strength |
|---|---|---|---|---|
| **tap feedback** | any pressable | `--t-tik` (70 ms) in, 70 ms out | linear-ish, no spring | `scale(.96)` or `translateY(4px)` — one or the other, never both |
| **screen enter/exit** | every screen, all ten | `nav` (140 out / 190 in, 110 delay) | `in` for exit transform, `uit` for exit opacity and for the entry | entry `scale(1.06 → 1)` never below 1; exit `scale(1.07)` inward or `scale(.96) translateY(10px)` outward |
| **character gesture** | avatar personality | 950 ms (existing `move-*`) | per keyframe | one move, once, never chained except `finaleDance` |
| **progress / travel** | the hop, `growRoad`, `flyDiamonds`, `flyBadge` | 620–1400 ms | `ease-in-out` → standardise on `uit` | movement carries meaning; never decorative |
| **reward celebration** | stars, overlays, particles | `vier` (900 ms) per beat, beats sequenced not stacked | `plop` for the arrival, `uit` for everything else | **one particle emission per event** |
| **state reveal** | header collapse, counters, pills appearing | `--t-snel` (220 ms) | `uit` | opacity and transform only — no `max-height`, `width`, `font-size` |

### 5.4 One rule that covers most of the above

> **One event, one celebration; one finger, one response; one property class per
> animation (transform + opacity, or nothing).**

---

## 6. Trigger rules

### 6.1 The two categories, and how to keep them apart

The seam already exists. `goMap(vanLvl)` (`:11359`) computes, in its first eight lines,
exactly the three cases that matter:

```js
const uitShow  = (typeof vanLvl === 'number' && vanLvl > 0);  // came from a show
const travel   = pendingTravel;                               // a level-up is pending
const gekozen  = reisDoel;                                    // came from Werelden
const onthul   = …;                                           // a world was released
```

So:

| Entry path | `uitShow` | `travel` / `onthul` | `gekozen` | Category | Gesture? |
|---|---|---|---|---|---|
| End screen → *Verder op tournee* | ✅ | maybe | — | **event/reward** | **no** |
| End screen → ← / Android back (`goMapNaShow`) | ✅ | maybe | — | **event/reward** | **no** |
| Tab bar → Kaart | — | — | — | **view entry** | **yes** |
| Back from Kleedkamer (`dressBack`) | — | — | — | **view entry** | **yes** |
| Back from Trofeeën (`backTarget`) | — | — | — | **view entry** | **yes** |
| Star picker → `selectProfile` | — | — | — | **view entry** | **yes** (but see 6.3) |
| Werelden → pick a world (`reisNaarWereld`) | — | — | ✅ | navigation | **no** — `wereldVlucht` already owns this |
| World arrows / back pill (`navigeerNaarWereld`) | never reaches `goMap` | — | — | navigation | **no** |
| A world was released since last play (`onthul`) | — | ✅ | — | **event/reward** | **no** |
| `renderTourMap` re-draw for any other reason | — | — | — | neither | **no** |

**The rule, stated once:**

> The map's personality gesture fires when `goMap()` is entered with **no level, no
> pending travel, no world reveal and no chosen world** — i.e. the child simply walked
> in. It never fires from `renderTourMap`, `showWorld`, or `wereldCamera`.

This validates the user's proposed rules and tightens two of them:

- ✅ *"completing a level → star ack → map → avatar travels; no greeting"* — correct,
  and `uitShow` alone is enough to detect it. Note it must also cover `onthul`, which
  is a reward arrival that does **not** come from a show (`:11434`) — the user's list
  didn't have this case.
- ✅ *"normal navigation to the map from another screen"* — correct.
- ✅ *"returning from Kleedkamer/Trofeeën"* — correct; both land in `goMap()` with no
  arguments.
- ⚠️ *"opening/re-entering the map without a progression event"* — correct **except**
  the Werelden → world-pick path, which reaches `goMap()` with `reisDoel` set. That
  path already has a 420 ms world flight; a wave on top of it would be a second
  arrival for one action. Guard on `gekozen == null`.
- ✅ *"repeated re-renders while already on the map must NOT retrigger"* — correct, and
  §3.10 shows exactly why: `renderTourMap` runs far more often than the child arrives.

### 6.2 Rapid back-and-forth

Tab switches are deliberately *not* locked (`goMap`'s `terugBezig` guard only covers
the show exit, `:11367`) — and that is right, because a lock there can strand a child
on a screen with no way out. So the gesture needs its own suppression rather than a
navigation lock:

> Skip the gesture if the map was last entered less than ~2.5 s ago.

One module-level timestamp, no state machine, no persistence. A child tapping
Kaart / Kleedkamer / Kaart gets one wave, not three.

### 6.3 Star picker → map

`selectProfile` → `goMap()` qualifies as a view entry. But the star picker *just*
waved at the child (`renderProfiles`, D2) ~400 ms earlier. Two waves in under a second
is one wave too many. Either suppress the map gesture on this one path, or — better —
drop the picker wave in favour of the map wave, since the map is where the character
actually lives and the picker is a chooser, not a place.

### 6.4 The full trigger table for everything else

| Should | Applies to |
|---|---|
| **always run** | tap feedback, screen enter/exit, `vraagIn`, question-card `wobble` |
| **only on view entry** | the map character gesture; header collapse initial state |
| **only after a user action** | `tapRipple`, `tapDance`, `koopVonken`, `boughtPop`, `celebrateTrophy`, `slot-nee` |
| **only once, ever / per session** | `wpHintKnipoog` (session), `wereldFeest`, `rankUpCelebrate`, `runWorldReveal`, `.net-af` (per show), `t.to > WORLD_LAST` finale |
| **must not run after another celebration** | the map gesture (after `uitShow`/`travel`/`onthul`); `confetti()` when a `confettiBurst` already fired for the same event; a second overlay before the first has closed (already handled — `naFeest`, `:13119`) |
| **skipped on rapid re-navigation** | the map gesture (§6.2) |
| **never retriggered by a re-render** | the map gesture; `sway` (currently restarts on every `renderTourMap`) |

---

## 7. Implementation slices

### Fix now

*Status: slices 1, 2 and 5 landed together as "Motion slice 1" (PS-48, PS-49, PS-52).
Sections 3.1, 3.4 and 3.5 describe the state before that change. Slices 3 and 4 are
still open.*

| # | What | Why | Where | Risk |
|---|---|---|---|---|
| 1 | Delay the post-show overlay until the star ceremony has finished (≈1500 ms, 1750 ms with the 3/3 burst) instead of 650 ms | Stars 2–3 and the three-star cannon currently play behind a full-screen overlay (§3.1) | `endLevel` `:14935` | trivial — two numbers |
| 2 | Add `motionOff()` to `confetti()`, `dance()`, `tapDance()`, `finaleDance()`, `flyDiamonds()`, `flyBadge()`; add CSS reduce rules for `.confetti-bit`, `.avatar-holder.move-*`, `lights`, `goldGlow`, `praisePop`, `toastIn`, `shake`, `slipNote`, `gearPop` | The only accessibility correctness gap in an otherwise meticulous file (§3.4) | `:14977`, `:14624`, `:14635`, `:14678`, `:15620`, `:12709`; one new reduce block | low |
| 3 | The map view-entry gesture, with the trigger rule from §6 | The stated goal; the map is the home screen and the character does nothing there (§3.9) | new helper called from `goMap` `:11359`, gated on `!uitShow && !travel && !onthul && gekozen == null` + a 2.5 s cooldown | low — one new call site, no existing timing touched |
| 4 | Extend `.wegvallend` / `.komt-op` to the remaining screens and give the tab bar a real enter/exit | Three of the four hub screens have no transition; the two directions don't match (§3.8) | `:2623–2628`, `goMap` `:11460`, `openKleedkamer`/`resumeKleedkamer` `:15144`, `openTrophies`/`resumeTrophies` `:12805` | medium — new call sites, but reuses proven functions |
| 5 | Correct the two motion-ladder comments to the numbers the code actually uses | Both blocks instruct the reader to keep them in sync and both are wrong (§3.5) | `:780–795`, `:10652` | none |

### Nice polish

| # | What | Where |
|---|---|---|
| 6 | Route every diamond counter through `telNaar`, delayed to the `flyDiamonds` arrival | `:14501`, `:14921`, `:13853/:13939/:13953`, `:11373`, `:11837`, `:12877` |
| 7 | Collapse the four particle functions into one with a shape argument (`fall` / `burst` / `fan` / `single`) | `:14977`, `:15003`, `:14647`, `:15595` |
| 8 | Standardise press feedback on `--t-tik`, keeping `.tour-stop` as the documented exception | 18 rules across the stylesheet |
| 9 | Retire `WERELDREIS.uit` / `WERELDREIS.na` into `MOTION.uit`; retire the six CSS overshoots into `MOTION.plop` | `:10312`, various |
| 10 | Move `goldGlow` and `reisGloed` off `box-shadow` onto an `opacity` pseudo-element | `:3075`, `:4708` |
| 11 | `world-back` gets an `.aan` transition like `.reis-terug` | `:3499`, `:10526` |
| 12 | Cross-fade the changed heart glyph instead of a raw text swap | `:14593` |
| 13 | Add hysteresis to the `gescrold` threshold (on at >8, off at <2) and move the settings header collapse off `font-size`/`width`/`height` | `:12820`, `:16424`, `:6334` |
| 14 | Add `will-change: transform` to `.confetti-bit`; cap concurrent confetti | `:7016`, `:14977` |

### Leave alone

- **`MOTION` / `VLUCHT` / `wereldVlucht` / `wereldCamera` and their locks.** The best
  code in the file. The 25-frame pre-computation, the separate radius track, the
  triple cleanup and the `oorsprongPct` clamp all exist because someone measured a real
  failure. Do not "simplify" any of it.
- **`VLUCHT.baan`.** The one justified custom curve; the comment explains why `uit`
  doesn't work over that distance.
- **`starRevealBeat` + `runWorldChange`.** Fragile, but correct, guarded, and
  covered by `test/vlucht.test.js` and `test/reis.test.js`. Touch only if §3.11's
  CSS/JS duplication is actually being changed — and re-measure both sides if so.
- **`.tour-stop`'s 90 ms in / 240 ms out spring.** A deliberate, documented exception.
- **`celebrateTrophy`'s open-ended sparkle.** The one ceremony the child chose to
  open; it's allowed to wait for her.
- **`starRevealBeat`'s deliberate 750 ms of nothing.** The best motion decision in the
  app is the one that decided *not* to animate.
- **The end screen's celebration content.** It does not need more; it needs its beats
  sequenced (slice 1).

---

## 8. Files and components affected

Everything is in `index.html`. By region:

**Stylesheet**

| Lines | Region | Slices |
|---|---|---|
| `780–795` | `:root` motion tokens | 5, 9 |
| `976–993` | `screenIn`, `body.start` | 4 |
| `1004–1012` | `.btn` press | 8 |
| `1755–1781` | `lights`, `sway`, the six `move-*` | 2 |
| `2030–2095` | overlay `popFade` / `popIn` | 1 |
| `2623–2631` | `.wegvallend` / `.komt-op` selector lists | **4** |
| `2996–3080` | `praisePop`, `toastIn`, `shake`, `wobble`, `slipNote`, `goldGlow` | 2, 10 |
| `3499–3532` | `.world-back` | 11 |
| `3649–3655` | `.tour-stop .stop-body` | leave alone |
| `3961–3973` | `.net-af` star landing (mirrored in JS) | leave alone |
| `4574–4581`, `4693–4708` | `slot-nee`, `reisGloed` | 10 |
| `4815–4842` | the two central reduce blocks | **2** |
| `4885–4977` | trophies header collapse | 13 |
| `5437–5512` | trophy ceremony + its reduce block | leave alone |
| `6334–6372` | settings header collapse | 13 |
| `7016–7018` | `.confetti-bit` / `fall` | **2**, 14 |

**Script**

| Lines | Function | Slices |
|---|---|---|
| `9855–9905` | `renderProfiles` — the only existing view-entry gesture | 3 (§6.3) |
| `10158–10175` | `showWorld` | 3 (must *not* be the seam) |
| `10312–10455` | `WERELDREIS`, `wereldCamera` | 9 |
| `10497–10537` | `renderMapTitle`, `wpHintKlaar` | 3 (precedent), 11 |
| `10652–10736` | the `MOTION` block and its comment | **5** |
| `10794–10850` | `schermWeg`, `navMee` | **4** |
| `11087–11210` | `wereldVlucht`, `globeVlucht` | leave alone |
| `11221–11313` | `enterLevel`, `kaartTerugZoom`, `kaartKomtOp` | 4 |
| `11350–11356` | `starRevealBeat` | leave alone |
| `11359–11470` | **`goMap`** — the seam for the view-entry rule | **3**, 4, 6 |
| `12344–12500` | `renderTourMap` | 3 (must *not* be the seam) |
| `12673–12800` | `runWorldChange`, `flyBadge`, `runTravel` | 2, 6 |
| `12805–12840` | `openTrophies` / `resumeTrophies` | 4 |
| `13047–13230` | `celebrateTrophy`, `rankUpCelebrate`, `wereldFeest` | 1 |
| `14490–14600` | `submitAnswer`, `zaalJuicht`, `loseHeart` | 6, 12 |
| `14624–14691` | `dance`, `tapDance`, `sparkle`, `finaleDance` | **2**, 7 |
| `14812–14990` | `endLevel`, `renderEndStars`, `confetti` | **1**, **2**, 6, 7 |
| `14993–15025` | `tapRipple`, `confettiBurst` | 7 |
| `15144–15200` | kleedkamer openers | 4 |
| `15557–15645` | `telNaar`, `koopVonken`, `flyDiamonds` | **6**, 7 |
| `12820`, `16424` | `kastScroll`, `ouderScroll` | 13 |

**Tests that will need re-running / extending**

- `test/vlucht.test.js` — asserts the world flight's six promises, including the
  reduced-motion path. Slice 4 touches adjacent CSS; re-run.
- `test/reis.test.js`, `test/rondgang.test.js` — screen navigation paths. Slices 3 & 4.
- `test/beloning.test.js` — reward flow ordering. Slice 1.
- `test/kern.test.js`, `test/inhoud.test.js` — reference `prefers-reduced-motion`
  coverage; slice 2 should add assertions here so the holes can't come back.
- `npm run shots` / `test/scene.js` — visual capture; useful before/after slices 1–4.

---

## Appendix — numbers worth keeping in one place

```
tik    70 ms    --t-tik            press
snel  220 ms    --t-snel           feedback, state reveal
nav   300 ms    MOTION.totaal      screen change  (weg 140 + komNa 110 + kom 190)
reis  420 ms    VLUCHT.duur+kruis  map ↔ world card  (340 + 80)
vier  900 ms                       one reward beat

detail  90 ms   VLUCHT.detail      local chrome during a flight
reveal 240 ms   VLUCHT.reveal      surrounding route during a flight
snel   340 ms   WERELDREIS.snel    world → world, browsing
onthul 900 ms   WERELDREIS.onthul  world → world, first opening
beat   560 ms   WERELDREIS.beat    the silence before the climb
kort   160 ms   WERELDREIS.kort    reduced-motion world change
```

```
uit   cubic-bezier(.2,.8,.3,1)    arrives   (= --ease-uit)
in    cubic-bezier(.5,0,.75,0)    departs
plop  cubic-bezier(.2,1.3,.4,1)   the only overshoot
baan  cubic-bezier(.33,.72,.25,1) the world flight only
```
