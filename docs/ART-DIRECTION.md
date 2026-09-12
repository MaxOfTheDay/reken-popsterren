# Reken Popsterren — Visual Asset & Art Direction Audit

> **Scope:** an audit and an executable plan. **No application code is changed by this
> document.** Every line number below points at `index.html` as of
> `1cf3a92`, so the recommendations can be applied directly afterwards.
>
> **Method:** read the full source (7 185 lines: CSS 14–2050, markup 2052–2337,
> JS 2337–7183), then ran the build in Chromium via `test/browser.js` and walked every
> screen and both tracks at **390×844**, **320×568** and **1024×768** with a seeded
> two-child save (one `math` star at city 6, one `count` star at city 2).

---

## 0. The one-paragraph version

Reken Popsterren has a *genuinely good* game idea and almost no art. Its entire visual
world is made of three materials: **CSS gradients** (55 linear + 17 radial + 86
box-shadows), **one hand-written parametric SVG paper doll** (`avatarSVG`, line 3338),
and **152 distinct platform emoji**. The emoji are the problem. They are drawn by
Apple, Google and Microsoft in three different styles, at three different optical
weights, and they are what the child sees in place of *cities, venues, trophies, pets,
instruments, accessories, stage decoration, card backs and confetti*. The app does not
look "assembled" because of its design tokens — the token file is unusually
disciplined. It looks assembled because **the art direction is outsourced to whichever
phone it is running on.**

The single highest-value intervention is not "add pictures". It is: **give every screen
a floor, a horizon and a light source, and make the venue grow as the child's rank
grows.** Five asset families do that. Everything else can wait.

---

## 1. What the child actually experiences

### 1.1 Architecture facts that constrain every recommendation

| Fact | Where | Consequence for assets |
|---|---|---|
| Single 416 KB `index.html`, **no build step** | root | No bundler, no image pipeline. Assets must be plain files referenced by relative URL, or inline SVG strings. |
| Offline-first PWA, **network-first** SW | `sw.js`, `CACHE = 'rekenpop-v27'`, `ASSETS` = 5 entries | Every new file **must** be added to `ASSETS` and `CACHE` bumped, or the app silently stops being offline-complete. Network-first also means images re-fetch on every load. |
| Only existing binaries: `icon-192.png`, `icon-512.png` | root | There is no `assets/` folder yet. We define it. |
| Uses `container-type` / `cqw`, `aspect-ratio`, `backdrop-filter`, `mask-image` | lines 837, 908, 1123 | Baseline is already Chrome 105+ / Safari 16+ / Firefox 110+. **WebP is safe everywhere. AVIF is safe except Safari 16.0–16.3.** |
| Screens are `display:none` / `.active` toggles | `show()`, line 3440 | CSS `background-image` on a hidden screen **is not fetched** by any engine. This gives us lazy loading for free — no `IntersectionObserver`, no `loading="lazy"` plumbing. |
| One stage-painting function used by 5 screens | `applyStage(el, p)`, line 3423 | A single injection point for all venue art. Mirror it with `applyScene()`. |

### 1.2 Screen inventory, as seen

**Profielkeuze** (`#screen-profile`, markup 2056, `renderProfiles` 3471) — title, 1–6
avatar cards in a `.stage-frame`, dashed "+" button. Four drifting `☁️` emoji in
`.map-sky`. **~45 % of the phone is empty gradient.** The cards themselves are the best
composed thing in the app: real avatar, real stage colour, two corner marks.

**Kaart / wereldtournee** (`#screen-map`, 2077, `renderTourMap` 3793) — *this is the
hub, and it is the weakest screen.* The "world tour map" is 3–4 flat circles on a wavy
gold SVG stroke, each circle containing a **food emoji** (🧇 Brussels, 🥐 Paris, 🌷
Amsterdam, 🍕 Rome, 🥘 Madrid). The avatar stands on the current stop; the `Speel!`
pill hangs below it. `.map-ground` (line 570) is a 300 px stack of five radial gradients
meant to read as footlights — against the magenta `--bg-3` at the bottom of the body
gradient **it is essentially invisible**. Measured at 390×844: meaningful content
occupies ~330 px of 844 (39 %). At **1024×768 it drops to ~28 %** — three quarters of a
tablet is flat purple. There is no world, no horizon, no ground, no city. The road
floats.

**Spel / de show** (`#screen-game`, 2145, `startLevel` 5200) — header, then **~250 px
of empty purple**, then a 175×147 `.show-stage` which is a CSS gradient plus three
corner emoji from `item.deco` (e.g. `['🏰','✨','👑']`), then the white question card
(excellent — high contrast, huge type, clear `.q-blank`), then answer tiles. **The core
fantasy of the product — *you are performing a show* — has no audience, no venue, no
lights and no stage.** The word "show" carries it alone. `.fan-row` (the audience
enthusiasm meter that `updateFan` drives on every single answer, line 5230) is a 12 px
pink bar with a 👏 next to it.

**Eindscherm** (`#screen-end`, 2222, `endLevel` 5682) — the emotional payoff of the
whole loop. It is a translucent white-glass card floating in the gradient. `confetti(40)`
(line 5819) drops 40 **26 px emoji** at `z-index: 90`; `.result-card` has no stacking
context, so **the confetti falls in front of the card and makes the headline literally
unreadable** — in the captured run, "Foutloos — het publiek gaat uit zijn dak!" is
obscured by five overlapping 🎉/⭐/💎. That is a bug, and its fix is a z-index, not an
asset.

**Kleedkamer** (`#screen-dress`, 2247, `renderShop` 6045) — sticky header with the live
avatar, one scrolling category row, then a 2-up grid on flat purple. Of the **95 items**:

| Category | Items | Drawn SVG | Platform emoji |
|---|---:|---:|---:|
| dress | 14 | 14 | 0 |
| hair | 12 | 12 | 0 |
| shoes | 9 | 9 | 0 |
| mic | 9 | 7 | 2 |
| **stage (venues)** | **12** | 12 (a 46×40 gradient chip) | 0 |
| instrument | 9 | 0 | 9 |
| acc | 12 | 0 | 12 |
| pet | 18 | 0 | 18 |

The **venues are the worst offender**: a child saves 150 💎 for `stage_vulkaan` and is
shown a 46×40 brown rounded rectangle with a 🌋 in it. The most expensive, most
world-defining purchases in the game have the smallest, vaguest art.

**Looks** (`renderLookGoals`, 6135) — 13 themed outfits ("Rockster", "Zeemeermin",
"Vuurshow", "Regenboogster") presented as a name plus four greyed-out 24 px thumbnails.
**The fantasy is never pictured.** This is a save-toward goal with no image of the goal.

**Trofeeënkast** (`#screen-trophies`, 2206, `renderShelves` 3969) — **45 trophies, all
36 px platform emoji**, on shelves. 🎫 🎤 🗺️ ✈️ 🌍 🔢 🧮 💥 ✏️ 🎓 …

**Memory** (`#screen-memory`, 2117, `startMemory` 4817) — the card back is a `🎤`
emoji on a purple gradient. The faces are counting objects (also emoji).

**Ouderdeel** (`#screen-settings`, 2268) and **Nieuwe ster** (`#screen-newstar`, 2288) —
white paper cards, one chip component, one icon tile, restrained type ramp. **These are
the best-designed screens in the product.** They need nothing.

**Overlays** — `career-overlay` (3619), `trophy-pop-overlay` (4128), `rankup-overlay`
(4173), two modals. All well-built, all emoji-fronted (`.rankup-badge` is a 94 px
platform emoji).

**Transitions** — there are none. `show()` (3440) toggles `display`. Every screen
change is a hard cut.

### 1.3 The emoji inventory

**152 distinct emoji, 340 occurrences.** For reference, this is the complete set the app
currently depends on the operating system to draw:

> 🌈🌋🌍🌙🌞🌟🌫🌴🌷🌸🌺🌼🌿🍎🍓🍕🍺🍻🎀🎁🎆🎇🎈🎉🎊🎓🎖🎛🎡🎤🎧🎩🎪🎫🎭🎮🎯🎲🎵🎶🎷🎸🎹🎺🎻🎼🏆🏖🏙🏟🏰🐈🐉🐘🐚🐞🐟🐠🐢🐧🐨🐫🐬🐰🐱🐳🐶🐹🐼🐾🐿…

Three consequences worth stating plainly:

1. **Cross-platform inconsistency is total.** The app looks materially different on iOS,
   Android and Windows. No art direction survives that.
2. **Optical weight is uncontrolled.** 🌷 (a thin stem) and 🗽 (a dense figure) sit in
   identical 70 px medallions and read as completely different visual weights.
3. **Semantic drift.** `🥐` means Paris, `🥘` means Madrid, `🍕` means Rome. These are
   *food*, not *places*. A child learns "the pizza city", not "Rome".

---

## 2. Asset opportunity audit

Classification key — **Impact**: High / Medium / Low · **Role**: Hero background,
Environment, Character, Decorative layer, Reward, UI illustration, Texture, Icon,
Foreground prop · **Reuse**: Global / Per section / Per city / Per level / Per state /
One-off · **Rec**: Generate · Keep procedural · Use iconography · Leave minimal.

### 2.1 Where imagery adds the most

| # | Screen / state | Current | Opportunity | Impact | Role | Reuse | Recommendation |
|---|---|---|---|---|---|---|---|
| 1 | **Show screen backdrop** (`#screen-game`) | 250 px empty purple + 175 px CSS-gradient "stage" + 3 emoji | An actual venue behind the avatar: stage floor, back wall, light rig, crowd silhouettes | **High** | Environment | Per state (3 rank tiers) | **Generate** |
| 2 | **Tour map horizon** (`#screen-map`) | Invisible `.map-ground` gradient, flat purple void | Illustrated dusk horizon + ground plane the road sits *on* | **High** | Hero background | Global | **Generate** |
| 3 | **Crowd / audience layer** bound to `G.fan` | 12 px pink bar | Silhouette crowd + phone lights whose opacity/rise tracks `G.fan` | **High** | Decorative layer | Global | **Generate** |
| 4 | **City identity** (12 cities) | Food emoji in a 70 px circle | 12 landmark silhouettes, one design language | **High** | Icon | Per city | **Generate (SVG set)** |
| 5 | **End / reward screen backdrop** | Glass card in a void; confetti covers the text | Celebration scene: stage seen from the wings, lights up, confetti *behind* the card | **High** | Hero background | Global | **Generate** |
| 6 | **Stage (venue) item thumbnails** (12) | 46×40 gradient chip + 1 emoji | Real venue vignettes at purchase size | **Medium–High** | UI illustration | Per item | **Generate (Phase 2)** |
| 7 | **Looks posters** (13 themed outfits) | 4 greyed mini-thumbs | A poster/card showing the assembled look as a fantasy | **Medium–High** | Reward | Per item | **Generate (Phase 2)** |
| 8 | **Memory card back** | 🎤 emoji on gradient | One designed card back (backstage-pass motif) | **Medium** | UI illustration | One-off | **Generate** — cheapest win in the app |
| 9 | **Dressing-room environment** | Flat dark purple | Mirror-bulb arc + clothing-rail silhouette at the sticky-header edge | **Medium** | Environment | Global | **Generate (Phase 2)** |
| 10 | **Travel moment** (`runTravel`, 3891) | Avatar hops along the road | Boarding-pass / stamp card wipe between cities | **Medium** | UI illustration | Global | **Generate (Phase 3)** |
| 11 | **Pre-show venue reveal** | *Screen does not exist* | 1.2 s "tonight: Rome" venue card between `Speel!` and Q1 | **Medium** | Hero background | Per city | **Generate (Phase 3)** — reuses #1 + #4 |
| 12 | **Rank-up celebration** (`rankUpCelebrate`, 4173) | 94 px platform emoji + emoji sparks | 8 rank badges as a designed set | **Medium** | Reward | Per state | **Generate (Phase 3)** |
| 13 | **Trophy icons** (45) | 36 px platform emoji | One designed collectible set | **Medium** | Icon | Per item | **Generate (Phase 3, SVG)** — 45 is a real project |
| 14 | **Pets / instruments / accessories** (39 items) | Platform emoji | Drawn props matching the avatar's SVG line | **Medium** | Foreground prop | Per item | **Generate (Phase 3, SVG)** — or leave; see §2.2 |
| 15 | **Sky layer** (map + profile) | 4–7 drifting ☁️/✈️ emoji | Soft painted cloud bands + one parallax plane | **Medium** | Texture | Global | **Generate** |
| 16 | **Profile-select backdrop** | Empty gradient | Soft backstage curtain at the bottom edge only | **Low–Medium** | Atmosphere | Global | **Generate (Phase 2)** |
| 17 | **Background grain** | None; visible banding on the 8-bit gradients | 2–3 % luminance noise tile | **Low** | Texture | Global | **Generate** — 4 KB, fixes real banding |
| 18 | **Empty state: no stars yet** | Handled in copy only | — | **Low** | — | One-off | **Leave minimal** — the "+" button is already the only thing on screen |

### 2.2 Where images must **not** go

These are as important as the list above.

| Screen / element | Why no imagery |
|---|---|
| **`.question-card`** (line 694) and everything inside it | It is the one place in the app where a child reads a number. White card, `--purple-shadow` ink, ~15:1 contrast, 42–62 px type. Any texture, tint or illustration here trades pedagogy for decoration. **Keep procedural forever.** |
| **Answer tiles** (`.choice-btn`, `.num-btn`, `.count-tile`) | Same reason, plus `.count-tile` uses `container-type: inline-size` and `cqw` units (line 837) — a background image would fight the container-query sizing of the ten-frames and dot-frames inside. |
| **Counting-mode aids** (`.cframe`, `.dframe`, `.tf-cell`, `.df-dot`) | These are teaching instruments. They must be flat, high-contrast and boring. |
| **Ouderdeel / `#screen-settings`** and **`#screen-newstar`** | Parent-facing, white-paper theme, deliberately calm. This is the *correct* answer for an admin surface. Adding art here would make the app feel less premium, not more. |
| **`.modal`, `.gear-menu`** | Functional, momentary, small. |
| **`.hub-sticky` header interior** | Already a `backdrop-filter: blur(8px)` glass bar over whatever is behind it. Art *behind* it is fine; art *in* it is noise. |
| **Memory card faces** | The face is the puzzle content (a quantity). Decorating it defeats the game. |
| **Behind the trophy grid** | 45 cards on a busy backdrop is unreadable at 124 px per card. Keep the shelves on near-neutral. |

---

## 3. Art direction

### 3.1 The concept

> **"Toy theatre at blue hour."**
>
> A warm, hand-painted little world where the sun has just gone down, the house lights
> are up, and everything is lit from the stage. Premium and cinematic in its *lighting*
> and *restraint*, childlike in its *shapes*. Closer to a modern animated short's
> background department than to educational clip-art or a candy-coloured mobile
> free-to-play game.

The existing palette — aubergine `#3d0a58` → violet `#7b2ff7` → magenta `#f107a3`, gold
for reward, cyan for selection — is **already a committed night-concert palette and
should be kept.** The error is not the colours. The error is that the palette is applied
as *wallpaper*: one flat full-screen gradient behind everything, so nothing has a floor,
nothing has a horizon, and every element floats. **The direction is to convert that
gradient from wallpaper into air.**

### 3.2 Ten principles

1. **Every screen has a floor.** Nothing floats in colour. Even "atmospheric" screens get
   a horizon line or a ground plane in the bottom third.
2. **The light always comes from the stage.** Warm amber from low and behind; violet in
   shadow. This one rule alone makes independently generated assets look related.
3. **Soft-toy geometry.** Chunky, rounded, generous. No sharp corners, no spikes, no
   thin lines. It rhymes with the avatar's round head and the `--r-sm/md/lg` scale.
4. **Shapes, not outlines.** Solid forms, one soft gradient, one soft shadow. No line
   art, no cel-shading, no hatching.
5. **The child is the only character.** Generated art contains **no people** except
   anonymous crowd silhouettes — round heads, no faces, no hands. The SVG avatar stays
   the sole protagonist.
6. **Art lives at the edges.** The centre of every screen belongs to numbers and
   buttons. Compose outward.
7. **Places, not props.** A city is 3–5 silhouette shapes and a light, not a landmark
   photograph and not a snack.
8. **Sparkle is earned.** Confetti, stars and bloom appear at reward moments only. Never
   ambient. (Today ✨ is wallpaper on four screens.)
9. **Every asset must survive a 55 % dark scrim** and still read. If it only works at
   full brightness, it is the wrong asset.
10. **No text, ever, in artwork.** Not a letter, not a numeral, not a sign, not a logo.

### 3.3 Illustration style specification

| Axis | Specification |
|---|---|
| **Realism** | Stylised 2D, painterly-clean. Roughly: animated-feature *background painting*. Not vector clip-art, not flat "Corporate Memphis", not 3D render, not photoreal. |
| **Shape language** | Chunky and rounded. Minimum radius on any silhouette corner ≈ 4 % of its own width. Wide, stable bases; nothing top-heavy. |
| **Texture** | Fine even film grain, 2–3 % luminance, on **backgrounds only**. Never on props, characters or UI-adjacent art. Grain exists to kill 8-bit gradient banding, which is visible today on `body`. |
| **Lighting** | One low warm key (amber `#FFC23D` → `#FF8F00`) from behind/below the subject. Violet ambient fill. Rim light on foreground props. Soft bloom around emitters only. **No lens flare. No god-rays crossing the frame centre.** |
| **Depth** | Exactly three planes. Far: blurred 10–16 px, ≤ 25 % contrast. Mid: sharp, the subject. Near: blurred 4–8 px, cropped by the frame edge. |
| **Perspective** | Eye level, straight on, ~35–50 mm equivalent. Horizon at **62 %** frame height. No tilt, no bird's-eye, no worm's-eye. |
| **Detailing** | Falls off hard with distance. Near plane: ≤ 3 details. Mid: ≤ 6. Far: silhouette only. |
| **Characters** | None generated. Crowds = flat violet silhouettes, ellipse heads, no features. |
| **Environments** | Theatrical rather than literal. Suggest the place with mass and light; do not document it. |

### 3.4 Colour system

**Verdict: keep the identity, simplify the bottom, and change what the gradient is *for*.**

| Role | Token(s) | Keep / change |
|---|---|---|
| Dominant dark | `--bg-1 #3d0a58` | **Keep.** This is the brand. |
| Dominant mid | `--bg-2 #7b2ff7` | **Keep.** |
| Bottom of gradient | `--bg-3 #f107a3` (magenta) | **Change — this is the one colour decision I would revisit.** Magenta at the *bottom* of every screen puts the hottest, highest-value colour under the child's thumbs, and it is exactly why `.map-ground`'s warm footlight (line 570) disappears. Demote magenta to a **glow accent** (`--bg-glow-pink` already exists) and let backgrounds resolve downward into a **warm amber-to-aubergine horizon**. This costs one gradient stop and recovers the entire footlight idea. |
| Reward / CTA | `--gold-cta-top #ffc23d`, `--gold-cta-bottom #ff8f00`, `--gold-accent #ffd740` | **Keep, and protect.** Artwork may contain *amber light*; artwork must not contain *gold objects*. Gold stays the CTA's alone. |
| Selection | `--blue-fill-top #38bdf8` | **Keep.** Artwork uses a desaturated teal-cyan only as a far-distance sky note. |
| Reading surfaces | `--c-white`, `--paper-tint #faf6ff` | **Keep and never put art behind them.** |

**The governing rule:**

> **Artwork supplies *value*. UI supplies *saturation*.**
> Backgrounds live in the **15–45 % lightness** band at **≤ 45 % saturation**. The
> saturated gold CTA, cyan selection and white question card then pop off them
> automatically, with no per-screen tuning.

The current UX review's finding that "gold means eleven different things" is real, and
art makes it worse unless this rule is enforced from asset one.

### 3.5 Lighting language

**Stage light at blue hour**, everywhere, no exceptions:

- **Key:** low, warm, from behind/below the horizon or from an off-frame stage rig.
- **Fill:** violet ambient, never neutral grey.
- **Rim:** a thin warm edge on anything in the near plane.
- **Bloom:** soft, small radius, around actual light sources only.
- **Beams:** at most one *pair* of spotlight cones per image, angled inward from the top
  corners, never crossing the centre 40 % of the frame.
- **Time of day:** always dusk. No daylight scenes, even for "travel". A daytime asset
  in this set would be instantly, obviously foreign.

### 3.6 Motifs, each with a job

Motifs earn their place by *meaning something*, not by decorating.

| Motif | Assigned job | Where it may appear |
|---|---|---|
| **Spotlight cones** | "A show is happening" | Show backdrop, pre-show card, finale |
| **Crowd silhouettes + phone lights** | "People came" — scales with `G.fan` and rank | Show backdrop, finale |
| **Confetti + streamers** | "You won" | End screen, trophy pop, rank-up only |
| **Travel stamps / boarding pass / ticket stub** | "You moved on" | Travel wipe, memory card back, pre-show card |
| **Stars ⭐** | *Currency.* | Never decorative in artwork. The UI owns this shape. |
| **Soft cloud bands** | "Air / distance" | Map sky, profile sky |
| **Warm horizon glow** | "There is a world out there" | Every environment |
| **Retired: free-floating ✨ sparkles** | — | Currently wallpaper on 4 screens. Stop. |

---

## 4. Background strategy

Backgrounds are the highest-value category, and the riskiest. The system below is what
makes them safe.

### 4.1 Four recipes

| Recipe | What it is | Use when |
|---|---|---|
| **A — Full scene** | Illustrated environment, art carries the screen | The screen's *job* is to be looked at: map, end/finale |
| **B — Edge scene** | Art in the top and/or bottom band; the centre is near-empty | The screen's job is to be *read*: the show screen |
| **C — Atmosphere** | Gradient + one soft glow + grain + a faint horizon; no objects | Content-dense screens: dressing room, trophies, profile select |
| **D — Nothing** | The existing flat surfaces | Parent area, new star, modals, question card |

### 4.2 Per-screen verdict

| Screen | Recipe | Recommendation | Rationale |
|---|---|---|---|
| **Profielkeuze** | C | Atmospheric gradient + soft curtain/horizon at the bottom edge, painted clouds replacing `☁️` | Cards are already the anchor; don't compete with 1–6 avatars |
| **Kaart / wereldtournee** | **A** | **Fully illustrated horizon strip + sky**, road sits *on* the ground plane | 60–70 % of the hub is empty. Biggest single jump in perceived quality available. |
| **City selection** | — | *There is no separate screen* — the map **is** the city selector. Improve the map; do not add a screen. |
| **Maths gameplay** | **B** | **Edge-heavy venue band** behind and around `.show-stage` (top ~45 %); bottom 55 % stays near-neutral gradient | The sum and answers occupy the bottom. Nothing painterly may go there. |
| **Pre-show / venue** | A | *Create it* — 1.2 s card between `Speel!` and Q1. Reuses the venue + city assets. | Currently `startLevel` cuts straight to a question. The "arriving at the venue" beat is free drama. |
| **Post-show / rewards** | **A** | **Fully illustrated celebration scene**, confetti moved *behind* the card | The loop's payoff has no art and a readability bug |
| **Kleedkamer** | C | Softly illustrated: mirror-bulb arc + rail silhouette behind the sticky header only; grid stays flat | 95 items at 130 px need a calm field |
| **Trofeeënkast** | C→D | **Almost neutral.** Optional: a thin wood-shelf edge under each `.shelf-title` | 45 cards; the cards are the content |
| **Memory** | D + one asset | Neutral field, but a real **card back** | The back is the only thing on screen 90 % of the time |
| **Profile / onboarding forms** | **D** | **Leave intentionally minimal** | Best-designed screens in the app |

### 4.3 Keeping the maths readable — the contract

Four mechanisms, all in CSS, none baked into the images:

**1. Safe-zone contract (enforced at generation time).**
Every full-screen asset must keep its **central 60 % width × 45 % height**
detail-free: no shape edges, local contrast ≤ 8 %, lightness held in the 20–35 % band.
For the show screen's edge-band asset the safe zone is the **bottom 55 %** of the frame.

**2. Three overlay tokens, added to `:root` (line 15).** Overlays in CSS means one image
can serve a bright "showcase" state and a dim "focus" state, and means we can re-tune
readability without regenerating art.

```css
/* proposed additions to :root */
--scrim-vignette: radial-gradient(115% 86% at 50% 50%, transparent 40%, rgba(24,4,44,.55) 100%);
--scrim-focus:    radial-gradient(120% 70% at 50% 66%, rgba(20,4,40,.74), rgba(20,4,40,.30) 58%, transparent 82%);
--scrim-floor:    linear-gradient(180deg, transparent 0, rgba(24,4,44,.62) 55%);
```

**3. One `.scene` layer**, replacing the ad-hoc per-screen gradient stacks:

```css
.scene {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background-image: var(--scene-scrim, var(--scrim-vignette)), var(--scene-img);
  background-size: cover, cover;
  background-position: 50% 100%, 50% 100%;   /* anchor the floor, crop the sky */
}
```

`background-position: 50% 100%` (or `object-position: 50% 100%` for `<img>`) is the
important detail: **the horizon must never drift** as the viewport changes aspect ratio.
Anchor the ground, let the sky crop.

**4. Vertical-space guard.** At `max-height: 700px` the show screen already compresses
`.show-stage` to 145×122 (line 985) and `.question-card` to 30–44 px type. The venue art
must **lose height, not the maths**:

```css
@media (max-height: 700px) {
  #screen-game .scene { background-size: auto 48%; background-position: 50% 0; }
}
```

At **320×568** — the tightest supported case, and it is genuinely tight — the venue band
degrades to recipe **C** (atmosphere only). Verified against the captured 320-wide run:
there is no spare vertical room there at all.

**5. Fallback.** Every `.scene` sits **on top of** the existing `body` gradient, so a
missing, slow or unsupported image degrades to exactly today's app. No flash, no blank.

---

## 5. Thinking as a game: art that reinforces the loop

The existing loop is:

> practise maths → perform a show → earn ⭐ + 💎 → travel to the next city → climb the
> star rank → buy a better venue and better clothes → repeat

The app already computes everything needed to make that loop *visible*. Nothing below
requires new game state.

### 5.1 The single best idea in this document: **venues that grow with rank**

`starRank(total)` (line 2726) already returns a continuous rank index across eight named
tiers (`RANK_TIERS`, line 2712): Straatartiest → Lokale ster → Clubster → Stadsster →
Radioster → Toursensatie → Platinaster → Wereldlegende. Today that ladder is **a number
in a pill**.

Bind the show backdrop to it — **three assets**:

| Venue tier | Rank idx | Rank names | What the child sees |
|---|---|---|---|
| **1 — Straathoek / kleine club** | 0–2 | Straatartiest, Lokale ster, Clubster | Low ceiling, ~20 crowd silhouettes, two warm practical lights, brick-ish back wall |
| **2 — Theater** | 3–5 | Stadsster, Radioster, Toursensatie | Proscenium, balcony, ~80 silhouettes, a real light rig, curtain edges |
| **3 — Stadion** | 6+ | Platinaster, Wereldlegende | Huge dark bowl, a sea of phone lights, screens (blank, no text), sky visible above |

Three images. Zero new mechanics. And it converts the *entire* star economy — which is
currently abstract — into something the child watches happen. When they cross 60 ⭐ and
walk out into a theatre instead of a club, the rank ladder finally means something.

### 5.2 Crowd layer driven by `G.fan`

`updateFan()` (line 5230) runs on **every answer**. It currently moves a 12 px bar.
Add one transparent crowd-lights layer over the venue and drive it from the same
function:

```js
// inside updateFan(), alongside the existing fill.style.width
crowd.style.setProperty('--fan', G.fan / 100);   // → opacity + translateY of the lights layer
```

One asset. Every correct answer visibly makes the crowd light up. This is the closest
thing to "juice" the app can buy for 40 KB.

### 5.3 Cities that are places

Replace the 12 food emoji (`CITIES`, line 2525) with **12 landmark silhouettes** in one
design language. Add one field — `art` — beside the existing `flag`, keeping `flag` as
the fallback. They then serve three places at once: the map medallion, the far plane of
the pre-show card, and the travel stamp.

### 5.4 Deliberately *not* recommended

| Idea | Why not |
|---|---|
| A unique full background per city (12 × 3 rank tiers = 36 assets) | Unmaintainable, ~4 MB, and the child sees each one ~8 times. Landmark silhouettes give 80 % of the identity for 5 % of the cost. |
| Costume-reactive backdrops | 95 items × 12 venues. Combinatorial. The avatar already carries the costume. |
| Animated / video backgrounds | Kills the 320×568 device, kills battery, kills the offline budget, and `prefers-reduced-motion` handling would have to be rebuilt. The app currently gates all 52 keyframe animations correctly — don't undo that. |
| Replacing the SVG avatar with generated character art | **The avatar is the one thing that is already right.** It is parametric across 95 items × 2 bases × 6 patterns × rainbow gradients (line 3338). No image set can do that. Any generated character art would be a regression. |

---

## 6. Consistency requirements

These are the rules that make independently generated assets belong to one game.

### 6.1 Hard specifications

| Requirement | Rule |
|---|---|
| **Aspect ratios** | Full-screen scene **9:16**. Edge band **8:3**. Venue band **12:7**. Square tile **1:1**. Look poster **3:4**. Icon **1:1**. No other ratios. |
| **Camera** | Eye level, straight on, zero tilt, ~35–50 mm. Horizon at **62 %** ± 3 %. |
| **Visual density** | Far plane ≤ 5 distinguishable shapes. Mid ≤ 3. Near ≤ 2. Total ≤ 10. |
| **Safe zone** | Central 60 % × 45 % (or bottom 55 % for edge bands): no shape edges, local contrast ≤ 8 %, lightness 20–35 %. |
| **Lighting** | Single low warm key + violet ambient + optional single beam pair. Always dusk. |
| **Palette** | `#3D0A58` / `#7B2FF7` for shadow and air; `#FFC23D` / `#FF8F00` for light; one distant `#38BDF8` note; magenta as glow only. |
| **Texture** | 2–3 % film grain, backgrounds only. |
| **Character proportions** | Crowd silhouettes: head ≈ ⅕ of body height, ellipse, no features, no limbs below the shoulder line. |
| **Line / shading** | No outlines. Soft airbrushed gradients. No cel bands, no hatching, no halftone. |
| **Environment perspective** | One-point or flat-on. Never two-point. Never isometric. |
| **Saturation** | Backgrounds ≤ 45 % S. Foreground props ≤ 70 % S. |
| **Contrast** | Brightest-to-darkest region within the safe zone ≤ 6:1. Whole-image ≤ 14:1. |
| **Cropping** | Compose so a **3:4 centre crop** (tablet) and a **9:16 crop** (phone) both work. Nothing important within **12 %** of the left or right edge. |
| **Edge treatment** | Bottom edge may be dark and solid. Top edge fades. Left/right edges non-committal. No frames, no borders, no rounded corners baked in. |

### 6.2 Never appears unless explicitly requested

- Text of any kind — letters, numbers, signs, marquees, banners with writing, subtitles
- UI elements — buttons, bars, icons, cursors, frames, device mockups
- Logos, brands, trademarks, band names, real venue names
- Human faces, hands, or any identifiable person (crowd silhouettes only)
- Photographic or photorealistic rendering; stock-photo lighting; depth-of-field bokeh
  balls
- 3D-render look, plastic speculars, ray-traced reflections
- Heavy black outlines, comic line art, sketch or pencil texture
- Busy patterns, fine repeating detail, or high contrast anywhere in the safe zone
- Pure black `#000` or pure white `#FFF` fields
- Baked vignettes, baked gradients-to-transparent, baked drop shadows (CSS does these)
- Watermarks, signatures, borders
- Daylight, midday sun, blue sky
- A second art style in the same set

---

## 7. Technical implementation

Deliberately small. This repo has no build step and should not gain one.

### 7.1 Two pipelines, chosen per asset type

**Pipeline A — raster (`.webp`) for painterly assets.** Backgrounds, venues, crowd
layers, posters. These are gradients, bloom and soft blur; WebP at q≈72 compresses them
extremely well (60–90 KB at 1600 px wide is realistic).

**Pipeline B — vector (`.svg`) for flat assets.** City landmarks, trophy icons, card
backs, item thumbnails. This is the right answer *for this repo specifically*, because:

- the app already **is** an SVG app (`avatarSVG` 3338, `OUTFIT_THUMBS` 5877,
  `itemThumb` 5959) — there is an existing idiom to match;
- SVG inlines into the single `index.html`, so there is no extra HTTP request, no
  offline-cache entry and no flash;
- 1–3 KB each, infinitely scalable, **no `@2x`/DPI problem at all**;
- and it fixes the cross-platform emoji problem completely.

**Format decision:** **WebP everywhere for raster.** Add AVIF via `<picture>` **only**
for the two full-screen heroes, where the byte saving is worth the second file. (The app
already requires Chrome 105+ / Safari 16+ for container queries, so WebP is
unconditionally safe; AVIF is safe except Safari 16.0–16.3, hence the fallback.)
**PNG only** where a raster asset needs alpha and is small (crowd-lights layer). No JPEG.

### 7.2 Folder structure and naming

```
assets/
  bg/
    venue-club.webp          venue-theater.webp      venue-stadium.webp
    map-horizon.webp         map-sky.webp
    finale.webp
    dressing-room.webp                               # Phase 2
  prop/
    crowd-lights.png                                 # alpha
    grain.png                                        # 4 KB, tiled
  city/
    cities.svg                                       # one symbol sprite, 12 <symbol>s
  look/
    look-rockster.webp  …                            # Phase 2
```

**Naming:** `<area>-<subject>[-<variant>][@<width>].<ext>`, lowercase, hyphens.
`bg/venue-theater@1600.webp`. Width suffix **only** where a 2× file exists.

### 7.3 Sizes, DPI, budget

| Asset class | Ship | `srcset` |
|---|---|---|
| Full-screen hero (map, finale) | `@1080` and `@2160` | `sizes="100vw"` |
| Venue band | `@1200` and `@2400` | `sizes="100vw"` |
| Crowd / prop overlay | `@1600` only (alpha, blurred, tolerant) | — |
| Look poster | `@768` only | — |
| Grain tile | 128×128, tiled | — |
| SVG | n/a | n/a |

Ship **1× and 2× only.** Three DPI tiers is over-engineering for painterly, blurred art.

**Budget: Phase 1 total ≤ 400 KB.** The app is 416 KB today. Doubling it for a PWA that
caches once is acceptable; tripling it is not. Cap any single background at **120 KB**.

### 7.4 Loading

**Lazy loading is free here.** Screens are `display:none` until `.active` (`show()`,
line 3440), and **no browser fetches a `background-image` inside a `display:none`
subtree.** So a CSS-driven `.scene` on `#screen-game` simply does not download until the
child starts a show. No `IntersectionObserver`, no `loading="lazy"`, no code.

**Preload exactly one thing** — the map horizon, because `#screen-map` is the hub and is
reached immediately after profile selection:

```html
<link rel="preload" as="image" href="assets/bg/map-horizon.webp" fetchpriority="high">
```

### 7.5 Service worker — the step that will be forgotten

`sw.js` is **network-first** with a cache fallback and a fixed 5-entry `ASSETS` list.
Two required changes:

1. **Add every new file to `ASSETS` and bump `CACHE`** (`'rekenpop-v27'` → `v28`).
   Without this the app is no longer offline-complete on first run, which is a
   regression against a core PWA promise.
2. **Serve `assets/` cache-first.** Network-first means every background re-fetches on
   every load, and on a slow connection the child watches the art appear late, every
   time. One conditional:

```js
// in the fetch handler
if (new URL(e.request.url).pathname.includes('/assets/')) {
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
  return;
}
```

### 7.6 Three reusable constructs — and no more

**1. `applyScene(screenEl, sceneId)`** — deliberately shaped like the existing
`applyStage(el, p)` (line 3423), and placed next to it, so it reads as the same idea:

```js
const SCENES = {
  map:    'assets/bg/map-horizon.webp',
  finale: 'assets/bg/finale.webp',
  dress:  'assets/bg/dressing-room.webp',
};
function applyScene(el, sceneId) {
  const url = SCENES[sceneId];
  el.style.setProperty('--scene-img', url ? `url(${url})` : 'none');
}
```

**2. `VENUES`, a 3-row table beside `RANK_TIERS`** (line 2712), keyed by rank index:

```js
const VENUES = [
  { min: 0, id: 'club',    img: 'assets/bg/venue-club.webp' },
  { min: 3, id: 'theater', img: 'assets/bg/venue-theater.webp' },
  { min: 6, id: 'stadium', img: 'assets/bg/venue-stadium.webp' },
];
function venueFor(p) { const i = starRank(totalStarCount(p)).idx;
  return VENUES.filter(v => i >= v.min).pop(); }
```

**3. One extra field on `CITIES`** (line 2525) — `art: 'brussel'`, resolving to
`<use href="assets/city/cities.svg#brussel">`, with the existing `flag` kept as the
fallback. Backwards compatible; no migration.

### 7.7 Explicitly do **not** build

An asset manager · a sprite compiler · a CDN · a theming engine · art-direction
breakpoints beyond the two named above · a background preloader queue · runtime image
processing · a CSS-in-JS layer.

---

## 8. Asset Opportunity Map

### 8.1 Full map

| Screen / experience | Current situation | Opportunity | Proposed asset | Impact | Priority | Notes |
|---|---|---|---|---|---|---|
| Show screen (`#screen-game`) | 250 px void + gradient "stage" + 3 emoji | Make "the show" a place | `bg/venue-{club,theater,stadium}.webp` | **High** | **P1** | Keyed to `starRank().idx`; recipe **B** |
| Tour map (`#screen-map`) | Road floats in 60–70 % empty purple | Give the world a ground and a sky | `bg/map-horizon.webp` + `bg/map-sky.webp` | **High** | **P1** | Replaces invisible `.map-ground` (line 570) |
| Audience feedback | 12 px pink bar (`updateFan`, 5230) | Correct answers light up a crowd | `prop/crowd-lights.png` (alpha) | **High** | **P1** | Drive `--fan` from the existing function |
| City identity ×12 | Food emoji in medallions | Places, not snacks | `city/cities.svg` (12 `<symbol>`) | **High** | **P1** | Also feeds pre-show card + travel stamp |
| End / reward | Glass card in void; **confetti covers the headline** | Give the payoff a stage | `bg/finale.webp` | **High** | **P1** | Also fix `z-index` of `.confetti-bit` (line 2046) |
| Memory card back | 🎤 emoji on gradient | One designed back | inline SVG (backstage-pass motif) | Medium | **P1** | ~2 KB; cheapest win in the app |
| Gradient banding | Visible on `body` | Kill it | `prop/grain.png` 128², tiled | Low | **P1** | 4 KB; rides along with the scrim tokens |
| Stage/venue items ×12 | 46×40 gradient chip + emoji | Show what 150 💎 buys | 12 venue vignettes, 512² WebP | Med-High | **P2** | `itemThumb`, line 5959 |
| Looks ×13 | 4 greyed mini-thumbs | Picture the fantasy | 13 posters, 768×1024 | Med-High | **P2** | `renderLookGoals`, line 6135 |
| Dressing room | Flat dark purple | Make it a room | `bg/dressing-room.webp` | Medium | **P2** | Recipe **C**, header edge only |
| Pre-show reveal | *Does not exist* | "Tonight: Rome" beat | composition of P1 assets | Medium | **P2** | ~30 lines in `startLevel` (5200) |
| Profile select | Empty gradient + ☁️ emoji | Backstage curtain edge | reuse `bg/map-sky.webp` + curtain band | Low-Med | **P2** | Recipe **C** |
| Travel moment | Avatar hops (`runTravel`, 3891) | A journey, not a hop | boarding-pass wipe, inline SVG | Medium | **P3** | |
| Rank badges ×8 | 94 px platform emoji | A designed ladder | 8 SVG badges | Medium | **P3** | `RANK_TIERS` 2712, `rankUpCelebrate` 4173 |
| Trophies ×45 | 36 px platform emoji | One collectible set | 45 SVG icons | Medium | **P3** | Real project; do as one set or not at all |
| Pets / instruments / acc ×39 | Platform emoji | Match the avatar's SVG line | 39 SVG props | Medium | **P3** | The UX review's open "D11" item |
| Trophy shelves | Flat glass panels | Wood-shelf edge | 1 SVG shelf lip | Low | **P3** | |
| Confetti ×7 emoji | Platform emoji | Designed confetti | 6 SVG shapes | Low | **P3** | Colour-only; keep the physics |
| **Question card** | White, 15:1, huge type | — | **none** | — | **Never** | Protect it |
| **Answer tiles / counting aids** | Flat, high contrast | — | **none** | — | **Never** | `cqw`-driven; art would break sizing |
| **Ouderdeel / Nieuwe ster** | White paper cards | — | **none** | — | **Never** | Best screens in the app |

### 8.2 Top 5 highest-value assets

**1 — The venue set (3 backdrops).**
The child spends the overwhelming majority of their time on `#screen-game`, and that
screen currently asserts "you are performing a show" with a 175 px gradient rectangle
and three corner emoji. Three images make the claim true. Crucially, keying them to
`starRank()` also makes the **eight-tier rank ladder** — today just a number in a pill —
into something the child can *see*. Highest value per asset in the entire product.

**2 — The tour horizon + sky (2 images).**
`#screen-map` is the hub: it is the first screen after profile select, the destination of
the bottom nav, and where every session starts and ends. It is also 60 % empty on a phone
and ~72 % empty on a tablet. Two images turn a road floating in colour into a world the
road runs through. It is the largest *perceived quality* jump available for the least
integration work — one `.scene` div, no logic.

**3 — The crowd-lights layer (1 alpha image).**
`updateFan()` already fires on every single answer. Binding one asset to it means every
correct sum visibly changes the world. This is the only cheap way to give the maths
*consequence*, and it retroactively gives meaning to the fan meter, the encore mechanic
and the `👏` reward chip — three systems that are currently invisible to a child.

**4 — The 12-city landmark set (1 SVG sprite).**
Fixes the semantic problem (🥐 is not Paris, it is a croissant), the cross-platform
problem (the map looks different on every OS), and the optical-weight problem (🌷 vs 🗽)
in one ~12 KB file. It is also the asset with the most reuse: map medallions, pre-show
card, travel stamps, and eventually the trophy shelf.

**5 — The finale backdrop (1 image) + the confetti z-index fix.**
This is the emotional payoff of the entire loop, and right now it is a translucent card
in a void **with a readability bug on top of it** — 40 emoji at `z-index: 90` fall in
front of `.result-card` and obscure the headline. One image and one z-index turn the
weakest reward moment in the app into its strongest.

---

## 9. Phased implementation plan

### Phase 1 — Maximum visual improvement

**5 asset families · 20 files · ~330 KB · complexity: Low–Medium · impact: Very High**

| Family | Files | What | Why now |
|---|---|---|---|
| **F1 Venue set** | 3 × WebP (1200×700) | club / theater / stadium | Turns "show" into a place; makes the rank ladder visible |
| **F2 Tour world** | 2 × WebP (1600×600 + 1600×900) | horizon band + cloud sky | The hub is the emptiest screen in the app |
| **F3 Crowd layer** | 1 × PNG alpha (1600×400) | silhouettes + phone lights | Binds to `updateFan()`; gives maths consequence |
| **F4 Finale** | 1 × WebP (1080×1920) | celebration backdrop | Fixes the weakest reward moment |
| **F5 City set** | 1 × SVG sprite (12 symbols) | landmark silhouettes | Kills the cross-platform emoji problem where it hurts most |
| *(rider)* | `grain.png` 4 KB + `card-back` inline SVG | banding fix + memory back | Trivial, ship with the rest |

**Implementation complexity:** `applyScene()` (~12 lines), `VENUES` table (~8 lines),
one `.scene` CSS rule, three `:root` scrim tokens, `CITIES.art` field, `sw.js` `ASSETS`
+ cache-first branch, `.confetti-bit` z-index. **No refactor. No new screen.**

**Expected impact:** the three screens a child sees most — map, show, end — go from
"floating UI on a gradient" to "a game". This is the phase that decides whether the app
reads as premium.

### Phase 2 — Build the visual world

**~30 files · complexity: Medium · impact: High**

- **12 venue item vignettes** (512²) — so the most expensive purchases look worth buying
- **13 look posters** (768×1024) — so the save-toward goal has a picture
- **Dressing-room scene** (1 WebP) — mirror bulbs + rail at the header edge
- **Pre-show venue card** — new 1.2 s beat in `startLevel`, composed from F1 + F5
- **Profile-select curtain band** (1 WebP)
- **8 rank badges** (SVG) — replace the 94 px platform emoji in `rankUpCelebrate`

**Why:** Phase 1 makes the *journey* look designed; Phase 2 makes the *economy* look
designed. Every one of these sits on a screen where the child is deciding what to spend
diamonds on, and right now those decisions are made against emoji.

### Phase 3 — Polish

**~90 small files · complexity: Medium-High (volume, not difficulty) · impact: Medium**

- **45 trophy icons** (SVG set) — the biggest single set; do it as one commissioned set
  or not at all. Half a set is worse than none.
- **39 pet / instrument / accessory props** (SVG) — closes the UX review's open "D11"
- **Travel wipe** (boarding pass / stamp)
- **Screen transitions** — there are none today; a 180 ms cross-fade in `show()` costs
  nothing and is the cheapest "premium" signal available
- **6 confetti shapes** (SVG) — replace the 7 platform emoji, keep the physics
- **Per-city sky tints** — one hue-rotate value per city, not new art
- **Trophy shelf lip**

---

## 10. Image-generation briefs

## 10.1 Reken Popsterren Master Art Style Prompt

> **Paste this block at the start of every Reken Popsterren image prompt.** Do not edit
> it per asset — put asset differences in the section that follows it. Keeping this
> prefix byte-identical across prompts is what makes independently generated images look
> like one game.

```
REKEN POPSTERREN — MASTER ART STYLE

Children's game illustration in the style of modern animated-film background painting.
Stylised 2D and painterly but clean: soft airbrushed gradients over simple chunky
shapes. No outlines, no line art, no cel-shading, no hatching. Rounded, generous,
toy-like geometry — nothing sharp, spiky or top-heavy. Exactly three depth planes: a
blurred far plane, a sharp mid plane, and a softly blurred near plane cropped by the
frame edge. Camera at eye level, straight on, no tilt, 35mm feel, horizon roughly 62%
down the frame.

Lighting is warm stage light at blue hour: a single low amber-gold key from behind and
below the subject, deep violet ambient shadow, soft bloom around light sources only. No
lens flare and no light beams crossing the centre of the frame.

Palette: deep aubergine #3D0A58 and violet #7B2FF7 for shadow and air; warm amber
#FFC23D and #FF8F00 for light; one cool cyan #38BDF8 note in the far distance; magenta
only as a faint glow, never a field. Keep the whole image in the middle value range —
no pure black, no pure white, low saturation in the background. Fine even film grain
over the image.

Mood: magical, calm, premium, joyful. Not chaotic, not candy-coloured, not cartoon-loud.

ABSOLUTELY NOT: text, letters, numbers, signs, logos, watermarks, signatures; UI
elements, buttons, frames, borders, device mockups; human faces, hands or identifiable
people; photorealism, photography, 3D render, plastic speculars; heavy black outlines,
comic line art, sketch texture; busy repeating detail; daylight or blue sky.
```

---

### Brief 1 — `venue-theater.webp` (the style-defining asset)

| Field | Value |
|---|---|
| **Asset name** | `assets/bg/venue-theater.webp` |
| **Purpose** | Make the show screen an actual venue, and make the middle rank tier feel like a step up from a club |
| **Where used** | `#screen-game` `.game-arena` (markup 2157) as `--scene-img`, recipe **B**; served by `venueFor(p)` when `starRank().idx` is 3–5 |
| **Composition** | Wide, symmetrical, straight on. A proscenium theatre seen from just behind the performer's position. Stage floor across the bottom third, catching warm light. A shallow balcony arc in the upper third. Two curtain masses cropped at the left and right edges. Crowd silhouettes fill the middle band, heads only, no faces. Light rig suggested along the top edge as soft warm shapes, not fixtures. |
| **Visual description** | Dusk-lit, intimate, slightly grand. The room reads as *full* but calm. Warm amber pool on the stage floor fading to violet at the walls; the crowd is a single flat violet silhouette mass with a scattering of tiny warm points among it. The balcony rail is one soft arc, no detail. Depth: curtains near (blurred), crowd + balcony mid (sharp), back wall far (blurred). |
| **Required safe UI area** | **Bottom 55 % of the frame must be near-empty and low contrast** — the sum card, spotlight bar and four answer tiles sit there. Also keep the **top-centre 60 % × 20 %** quiet: the sticky header and progress bar overlap it. |
| **Perspective** | Eye level, one-point, dead centre, horizon at 62 % |
| **Lighting** | Warm amber key from the stage front-bottom, violet ambient, soft top bloom from the rig, no beams crossing the centre |
| **Colour direction** | `#3D0A58` walls and crowd, `#7B2FF7` ambient, `#FFC23D`→`#FF8F00` stage pool, a single `#38BDF8` cool note high on the back wall |
| **Aspect ratio** | 12:7 |
| **Output resolution** | 1200×700 (ship `@2400` as 2400×1400) |
| **Transparent background** | **No** |
| **Consistency reference** | This is the **canonical asset**. Generate it first; every later asset is matched to it. |
| **Things to avoid** | Seat rows (reads as stripes at 175 px), spotlight cones crossing centre, any faces, curtain tassels or fringe detail, gold objects (gold is the CTA's), text on any screen or banner, warm light in the bottom third |

**Prompt:**

```
[MASTER ART STYLE]

Subject: the interior of a small warm theatre at blue hour, seen straight on from the
front of the stage looking out into the room. A wide empty wooden stage floor runs
across the bottom third, lit by a broad warm amber pool. Behind and above it, a calm
audience rendered only as a single flat deep-violet silhouette mass of rounded
shoulders and featureless oval heads, with a light scattering of tiny warm glowing
points among them. A shallow balcony arc crosses the upper third as one soft
unornamented shape. Heavy stage curtains hang in the extreme left and right edges,
close to camera and softly out of focus. Along the very top edge, the suggestion of a
lighting rig as soft warm glowing shapes rather than visible fixtures.

Composition requirement: the entire lower 55% of the image must stay almost empty,
smooth, dark and very low contrast — an unbroken calm field with no shapes, edges or
highlights. Keep the top-centre area quiet as well. Put all visual interest in the
middle band and at the left and right edges.

Mood: an intimate room that is full but hushed, the moment before the first note.
```

---

### Brief 2 — `venue-club.webp` and `venue-stadium.webp` (the tier siblings)

| Field | Value |
|---|---|
| **Asset name** | `assets/bg/venue-club.webp`, `assets/bg/venue-stadium.webp` |
| **Purpose** | Make rank progression physically visible: the room gets bigger as the child's star rank climbs |
| **Where used** | Same slot as Brief 1, selected by `venueFor(p)` at `starRank().idx` 0–2 and 6+ |
| **Composition** | Identical camera, identical horizon, identical safe zone to Brief 1. **Only the room changes.** Club: low ceiling, close back wall, ~20 silhouettes, two warm practical lamps. Stadium: vast dark bowl, distant tiers, a sea of small warm points, open dusk sky above the rim. |
| **Visual description** | The three must read as *the same world at three scales*. Same warm pool on the same stage floor; what changes is how far away the back wall is and how many points of light there are. |
| **Required safe UI area** | Identical to Brief 1: bottom 55 % near-empty; top-centre 60 % × 20 % quiet |
| **Perspective / Lighting / Colour** | Identical to Brief 1 in every respect |
| **Aspect ratio / Resolution** | 12:7 · 1200×700 (`@2400`) |
| **Transparent background** | No |
| **Consistency reference** | `venue-theater.webp`. Generate these **after** it and match its value range, key angle and grain. |
| **Things to avoid** | Changing the camera height or horizon between tiers · stage lighting that gets *cooler* as it scales up · stadium floodlights pointing at camera · any structure in the bottom 55 % |

**Prompt — club (tier 1):**

```
[MASTER ART STYLE]

Subject: the inside of a small warm basement music club at blue hour, seen straight on
from the front of a low stage looking out into the room. A narrow wooden stage floor
across the bottom third under a broad warm amber pool. A close, low back wall of soft
dark brick only a short distance behind the audience. About twenty people rendered as a
single flat deep-violet silhouette mass of rounded shoulders and featureless oval
heads, standing close together. Two small warm practical lamps glow on the side walls.
A low ceiling crosses the top edge as a soft dark band.

Composition requirement: the entire lower 55% of the image must stay almost empty,
smooth, dark and very low contrast — an unbroken calm field with no shapes, edges or
highlights. Keep the top-centre area quiet as well.

Mood: small, warm, close, the first gig. Match the value range, key-light angle and
grain of the theatre image exactly.
```

**Prompt — stadium (tier 3):**

```
[MASTER ART STYLE]

Subject: a vast open-air stadium at blue hour, seen straight on from the front of the
stage looking out into the bowl. A broad stage floor across the bottom third under a
wide warm amber pool. Beyond it the ground falls away into an enormous dark violet bowl
of tiered seating, far away and softly out of focus, filled edge to edge with a sea of
thousands of tiny warm points of light. Above the rim of the bowl, an open dusk sky in
deep aubergine and violet with one cool cyan note near the horizon. Huge blank dark
display panels flank the upper left and right edges, completely empty with no images or
text on them.

Composition requirement: the entire lower 55% of the image must stay almost empty,
smooth, dark and very low contrast — an unbroken calm field with no shapes, edges or
highlights. Keep the top-centre area quiet as well.

Mood: enormous, awestruck, but still warm and calm rather than harsh. Match the value
range, key-light angle and grain of the theatre image exactly.
```

---

### Brief 3 — `map-horizon.webp` + `map-sky.webp`

| Field | Value |
|---|---|
| **Asset name** | `assets/bg/map-horizon.webp`, `assets/bg/map-sky.webp` |
| **Purpose** | Give the tour map a world. Replace the invisible `.map-ground` gradient stack (line 570) and the seven drifting `☁️`/`✈️` emoji in `.map-sky` (line 589) |
| **Where used** | `#screen-map` — horizon anchored to `background-position: 50% 100%`; sky on the existing `.map-sky-inner`, which already receives a `translateX` parallax from `updateParallax` (line 3591) |
| **Composition** | **Horizon:** a continuous, horizontally tileable dusk landscape band — soft rolling ground, distant hills, a warm glow along the whole horizon line as if a stage were just over it. Art occupies the **bottom 55 %**; the top fades to nothing. **Sky:** three soft, widely separated cloud bands on transparency, nothing else. |
| **Visual description** | Warm and inviting, not scenic. The ground is a *stage* the road walks across, not a countryside. No buildings, no roads, no landmarks — the 12 city medallions supply the places. The horizon glow is the same amber as the venue key light, so the map and the show feel lit by the same sun. |
| **Required safe UI area** | Nothing meaningful in the **central 60 % × 45 %** (the road, medallions, avatar and `Speel!` pill live there). Nothing within **12 % of the left or right edge** — the map scrolls horizontally and those edges get masked by `.hscroll-fade` (line 1133). |
| **Perspective** | Eye level, flat-on, horizon at 62 % |
| **Lighting** | Broad warm amber glow rising from the horizon into violet air; darkest at the very bottom edge |
| **Colour direction** | `#3D0A58` ground, `#7B2FF7` air, `#FFC23D`/`#FF8F00` horizon glow, one `#38BDF8` band high in the sky |
| **Aspect ratio** | Horizon **8:3** · Sky **16:9** |
| **Output resolution** | Horizon 1600×600 (`@3200`) · Sky 1600×900 |
| **Transparent background** | Horizon: **No** (top fades to transparent — export PNG-alpha or WebP-alpha). Sky: **Yes** |
| **Consistency reference** | `venue-theater.webp` — same amber, same violet, same grain |
| **Things to avoid** | Buildings, city skylines, roads, paths, trees with detail, a visible sun or moon disc, anything that tiles visibly, anything in the horizontal centre |

**Prompt — horizon:**

```
[MASTER ART STYLE]

Subject: a wide, calm, empty dusk landscape band — soft rolling ground in deep
aubergine running left to right across the frame, with low distant hills behind it, and
a broad warm amber glow lying along the entire horizon line as though an enormous stage
were lit just beyond it. Above the horizon, deep violet air. No buildings, no
structures, no roads, no paths, no trees, no sun or moon.

Composition requirement: all content in the lower 55% of the frame. The upper 45% fades
smoothly to fully transparent. The horizontal centre of the image must stay completely
plain and featureless. Keep the far left and far right edges non-committal so the image
can be scrolled and masked. The band must repeat seamlessly left to right.

Mood: the quiet, warm, open world a tour travels across.
```

**Prompt — sky:**

```
[MASTER ART STYLE]

Subject: three soft, wide, very low-contrast cloud bands floating at different heights
on a fully transparent background. Nothing else in the frame. The clouds are simple,
rounded, slightly flattened masses in dusty violet with a faint warm amber edge along
their undersides, as if lit from far below. Very soft edges, no definition, no
billowing detail.

Composition requirement: keep the bands widely separated with large empty gaps between
them, and keep the centre of the frame almost clear. Fully transparent background — no
sky colour, no gradient, no ground.

Mood: distant, weightless, barely there.
```

---

### Brief 4 — `crowd-lights.png`

| Field | Value |
|---|---|
| **Asset name** | `assets/prop/crowd-lights.png` |
| **Purpose** | Make every correct answer visibly change the world. Bound to `G.fan` in `updateFan()` (line 5230), which already fires on every submitted answer |
| **Where used** | A layer above the venue backdrop on `#screen-game`; its `opacity` and a small `translateY` are driven from `--fan` |
| **Composition** | A wide, shallow horizontal strip. Lower half: a flat silhouette band of rounded heads and shoulders at slightly varied heights. Upper half: a scatter of small warm glowing points rising out of the crowd, densest at the bottom, thinning upward. Fully transparent everywhere else. |
| **Visual description** | The lights read as held-up phones or lighters without being either. Warm, soft, bloomed. The silhouette band is a single flat colour, no internal detail. |
| **Required safe UI area** | Its own top 30 % must be sparse — at low `--fan` only the crowd band shows, and the strip sits behind the sticky header |
| **Perspective** | Flat-on, no perspective, no vanishing point |
| **Lighting** | Self-lit points only; the silhouette receives no light |
| **Colour direction** | Silhouette `#3D0A58` at ~85 % opacity; points `#FFC23D` with soft bloom |
| **Aspect ratio** | 4:1 |
| **Output resolution** | 1600×400 |
| **Transparent background** | **Yes** — PNG with alpha |
| **Consistency reference** | The crowd in `venue-theater.webp`: same silhouette colour, same head proportion (head ≈ ⅕ body height) |
| **Things to avoid** | Faces, hair, arms, recognisable phones, lighters or flames, any warm light on the silhouette itself, an even grid of points, opaque background |

**Prompt:**

```
[MASTER ART STYLE]

Subject: a wide shallow horizontal strip on a fully transparent background. Across the
lower half, a flat unlit silhouette band of a crowd — rounded shoulders and smooth
featureless oval heads at slightly varying heights, all one solid deep-aubergine
colour, with no faces, no hair, no arms and no internal detail at all. Rising out of
this band into the upper half, a soft irregular scatter of small warm amber points of
light with gentle bloom, densest just above the heads and thinning out toward the top.

Composition requirement: fully transparent background, no sky, no ground, no frame.
Keep the upper third sparse. Scatter the lights irregularly — never in rows, a grid or
an even pattern. The silhouette band itself must stay completely unlit and flat.

Mood: a warm room quietly lighting up.
```

---

### Brief 5 — `finale.webp`

| Field | Value |
|---|---|
| **Asset name** | `assets/bg/finale.webp` |
| **Purpose** | Give the loop's payoff a stage. Today `#screen-end` is a translucent glass card in a void, with 40 emoji falling in front of the headline |
| **Where used** | Full-bleed behind `#screen-end`, recipe **A**, under `.result-card` (line 1523) with `--scrim-focus` on top |
| **Composition** | The stage seen from the wings, three-quarters filled with light. A wide warm pool centre-low. Two soft spotlight cones angled inward from the upper corners, **stopping well short of the centre**. Confetti and streamer shapes drifting in the upper third and along the left and right edges. Crowd silhouettes as a low band at the very bottom edge, backlit. |
| **Visual description** | Triumphant and warm rather than loud. The centre of the frame is the brightest *value* but the emptiest *content* — a glowing, detail-free field the result card sits on. |
| **Required safe UI area** | **Central 60 % × 55 %** must be a smooth glowing field with no shapes: the result card, three stars, three earn chips, the milestone pill and two buttons all stack there |
| **Perspective** | Eye level, straight on, horizon at 62 % |
| **Lighting** | Strong warm key from the stage, bloom, violet edges; brightest in the centre, darkest at the corners |
| **Colour direction** | `#FFC23D`/`#FF8F00` centre glow, `#7B2FF7` mid, `#3D0A58` corners; confetti in violet, cyan and warm white — **no gold confetti** (gold is the CTA's) |
| **Aspect ratio** | 9:16 |
| **Output resolution** | 1080×1920 (`@2160`) |
| **Transparent background** | No |
| **Consistency reference** | `venue-theater.webp` — same room language, now lit up and celebrating |
| **Things to avoid** | Confetti in the centre (the app's own CSS confetti goes there, once its z-index is fixed), beams crossing the centre, gold objects, any text on banners or screens, faces, fireworks with visible trails |

**Prompt:**

```
[MASTER ART STYLE]

Subject: a theatre stage at the end of a show, lit up and celebrating, seen straight on
from the wings. A broad warm amber pool of light fills the centre of the frame and
glows outward, fading to violet at the edges and deep aubergine in the corners. Two
soft spotlight cones angle inward from the upper left and upper right corners but stop
well short of the middle. Confetti flakes and thin streamer ribbons drift through the
upper third and down along the far left and far right edges, in violet, cool cyan and
warm white. Along the very bottom edge, a low backlit silhouette band of a crowd —
rounded featureless heads only.

Composition requirement: the central 60% width by 55% height of the image must be a
smooth, empty, glowing field with no shapes, no confetti, no beams and no edges in it
at all — completely plain. Put every element in the upper third, the lower edge, and
the left and right margins.

Mood: warm triumph. Joyful and grand, but calm and premium rather than loud.
```

---

### Brief 6 — `cities.svg` (12-symbol landmark set)

| Field | Value |
|---|---|
| **Asset name** | `assets/city/cities.svg` — one file, twelve `<symbol id="…">` |
| **Purpose** | Replace the food emoji (`CITIES`, line 2525) so a city is a *place*, and so the map renders identically on every OS |
| **Where used** | `.tour-stop .dot` (line 1171, 70 px / 90 px / 58 px across breakpoints), `.city-mark` on profile cards (line 240, 30 px), and later the pre-show card and travel stamp |
| **Composition** | Each symbol: one centred landmark silhouette in a 100×100 viewBox, optically balanced so all twelve carry the **same visual weight** — this is the specific failure of the current emoji (🌷 vs 🗽). Flat, single-colour, no interior detail. |
| **Visual description** | Amsterdam = canal house gable row · Brussels = Atomium spheres · Paris = tower · London = wheel · Berlin = TV tower · Rome = arched aqueduct/colosseum arc · Madrid = arched gateway · New York = three tapering towers · Rio = hilltop figure as an abstract cross-form on a peak · Cairo = pyramid pair · Tokyo = tiered tower · Sydney = shell arcs. |
| **Required safe UI area** | 8 % padding inside the viewBox on all sides; the medallion crops to a circle |
| **Perspective** | Flat-on elevation, no perspective |
| **Lighting** | None — these are silhouettes. The medallion behind them supplies the gradient. |
| **Colour direction** | `currentColor`, single fill. Inherits `--purple-shadow` when locked, `--ink-on-gold` when the medallion is gold. **One fill only — no gradients.** |
| **Aspect ratio** | 1:1 |
| **Output resolution** | Vector, 100×100 viewBox |
| **Transparent background** | **Yes** |
| **Consistency reference** | Each other. Generate all twelve **in one image** as a sheet, then trace, so weight and stroke-mass are matched by construction. |
| **Things to avoid** | Perspective, interior windows or detail, ground lines, people, vehicles, text, national flags or colours, mixing detailed and simple landmarks in one set, any silhouette thinner than ~6 % of the viewBox at its narrowest |

**Prompt (generate as one sheet, then trace to SVG):**

```
[MASTER ART STYLE]
— override for this asset only: ignore the lighting, depth, grain and palette rules.
This asset is flat silhouettes, not a painting.

Subject: a clean reference sheet of twelve city landmark silhouettes arranged in a
3-by-4 grid on a plain white background. Each silhouette is solid black, completely
flat, with no interior detail, no windows, no texture, no shading, no gradient and no
outline. Each is drawn as a straight-on flat elevation with no perspective, centred in
its own square cell with even margins.

The twelve, in order: a row of stepped canal-house gables; a cluster of connected
spheres on thin struts; a tall tapering lattice tower; a large ferris wheel; a slim
tower with a sphere near its top; a curved tier of stone arches; a wide triumphal
gateway arch; three tapering skyscrapers of different heights; a small abstract
cross-shaped figure standing on a rounded peak; two pyramids of different sizes; a
tiered pagoda tower; a fan of overlapping curved shells.

Critical requirement: all twelve must have the same visual weight and the same
apparent mass — no silhouette may look noticeably thinner, lighter, denser or heavier
than the others. Keep every shape chunky and readable when shrunk to the size of a
thumbnail; nothing thin, spindly or wiry. No text, no labels, no numbers, no borders
around the cells.
```

---

## 11. Recommendation

### Recommended direction

**Keep the palette. Stop using it as wallpaper. Give every screen a floor, a horizon and
a light source — and make the venue grow with the child's star rank.**

Reken Popsterren does not need to look different. It needs to look *lit*. Its identity —
aubergine to violet, gold for reward, a round-headed SVG paper doll — is already
distinctive and already consistent. What is missing is that nothing in it stands on
anything. The road floats, the stage floats, the reward card floats, and the gaps between
them are filled with the same flat gradient on every screen.

Five asset families fix that, and one of them — the three venue tiers keyed to
`starRank()` — does something no amount of UI polish could: it makes a number the child
cannot read into a room the child can see. That is the difference between "an app with a
tour theme" and "a game about becoming a pop star".

The second thing I would insist on is **restraint about emoji.** There are 152 of them.
Replacing them one at a time, in ad-hoc batches, is how an app ends up with *four*
illustration languages instead of two. Replace them **in complete sets or not at all**:
the 12 cities (Phase 1), the 12 venues and 8 ranks (Phase 2), the 45 trophies and 39
props (Phase 3). A half-converted trophy cabinet looks worse than a fully emoji one.

### Do first — the first three assets to generate

1. **`venue-theater.webp`** — the canonical asset. Generate it, drop it behind
   `.game-arena` with `--scrim-focus` on top, and look at the show screen at 390×844 and
   320×568. **Everything else in this plan is matched to this one image.** If the style
   is wrong, it is wrong here first and cheapest.
2. **`map-horizon.webp`** — the biggest perceived-quality jump per unit of work, on the
   screen every session starts and ends on. It also proves the "anchor the floor, crop
   the sky" positioning rule across phone and tablet aspect ratios.
3. **`crowd-lights.png`** — proves the *dynamic* half of the system: one asset bound to
   `updateFan()`, which already runs on every answer. If this feels good, the venue tiers
   are worth building; if it does not, stop at two backgrounds and re-plan.

Generate these three, integrate them, look at the app, **then** commit to the remaining
seventeen Phase 1 files.

### Do later

- **Venue item vignettes and look posters** (Phase 2) — high value, but they only pay off
  once the venue art exists to make the purchases meaningful.
- **The 45-trophy set** — genuinely valuable and genuinely a project. Do it when there is
  appetite for one commissioned set, not as a trickle.
- **Pre-show venue card** — lovely, and nearly free *after* Briefs 1–2 and 6 exist.
- **Screen transitions** — 180 ms cross-fade in `show()` (line 3440). Costs nothing, reads
  as premium, but is invisible until the screens themselves are worth fading between.
- **The 39 pet/instrument/accessory props** — the UX review's open "D11" item. Worth
  doing, worth doing last.

### Avoid

| Tempting idea | Why it makes the game worse |
|---|---|
| **A unique background per city** | 12 cities × 3 rank tiers = 36 assets, several MB, each seen ~8 times. The landmark silhouettes give the identity for 5 % of the cost. |
| **Illustrating behind the question card** | The one place a child reads a number. Non-negotiable. |
| **Replacing the SVG avatar with generated art** | It is parametric across 95 items × 2 bases × 6 patterns. Generated character art cannot be. This would be the single most damaging change available. |
| **Animated or video backgrounds** | Kills the 320×568 device, kills battery, blows the offline budget, and would undo the app's currently-correct `prefers-reduced-motion` gating across 52 animations. |
| **Adding art to the parent area** | It is the best-designed part of the app *because* it is restrained. |
| **Baking vignettes, scrims or gradients into the images** | Then readability can only be retuned by regenerating art. Keep them in CSS. |
| **More confetti, or bigger confetti** | The end screen's problem is not too little confetti — it is that 40 emoji at `z-index: 90` land in front of `.result-card` and cover the headline. That is a z-index fix, not an asset. |
| **A three-tier DPI ladder, an asset manager, a sprite build step** | This is a single-file app with no build. Two DPI tiers and plain relative URLs are the right amount of engineering. |
| **Replacing emoji one at a time as you feel like it** | Produces four illustration languages instead of two. Sets, or nothing. |

### Implementation sequence

1. **Prepare the ground (no art yet).** Add the three scrim tokens to `:root` (line 15),
   add the `.scene` rule, add `applyScene()` next to `applyStage()` (line 3423), create
   `assets/`, add the `assets/` cache-first branch to `sw.js`, bump `CACHE` to `v28`. Fix
   `.confetti-bit`'s z-index (line 2046) so it falls behind `.result-card`. **Ship this —
   it is an improvement on its own and it de-risks everything after it.**
2. **Generate `venue-theater.webp`** using the Master Art Style Prompt + Brief 1.
3. **Review it against the contract** before integrating: safe zone empty? bottom 55 %
   low contrast? no text, no faces, no gold objects? survives a 55 % scrim?
4. **Integrate it** behind `.game-arena` and **validate in the real app** at 390×844,
   320×568 and 1024×768 — and specifically check that `@media (max-height: 700px)`
   shrinks the *art*, not the sum.
5. **Decide.** If the show screen now feels like a show, the style is locked. If not,
   regenerate from step 2 — one asset in, not nine.
6. **Generate `map-horizon.webp` + `map-sky.webp`** (Brief 3), matched to the locked
   style. Integrate, delete the `☁️`/`✈️` emoji spans from `#screen-map` (markup 2079)
   and the `.map-ground` gradient stack (line 570). Validate at all three viewports plus
   a horizontal scroll of the tour.
7. **Generate `crowd-lights.png`** (Brief 4). Wire `--fan` in `updateFan()` (line 5230).
   Validate by playing a full 8-question show and watching the crowd fill.
8. **Generate the two venue siblings** (Brief 2), matched to `venue-theater.webp`. Add
   the `VENUES` table beside `RANK_TIERS` (line 2712) and `venueFor(p)`. Validate by
   forcing each rank tier in the console.
9. **Generate `cities.svg`** (Brief 6) as one sheet, trace to twelve symbols, add
   `CITIES[].art` (line 2525) keeping `flag` as fallback. Validate every medallion at
   58 px, 70 px and 90 px, and the 30 px `.city-mark` on profile cards.
10. **Generate `finale.webp`** (Brief 5). Validate that the headline, three stars, three
    earn chips, the milestone pill and both buttons all read over it — this screen has the
    most stacked UI of any in the app.
11. **Measure.** Total added bytes ≤ 400 KB; first paint on the map unchanged; every
    asset in `sw.js` `ASSETS`; app still fully playable offline after one visit; all three
    viewports clean. **Then** open Phase 2.
