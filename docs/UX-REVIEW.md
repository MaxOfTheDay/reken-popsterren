# Reken Popsterren — UI/UX review

> **Status:** all three phases of the plan in section G are implemented.
> Where the implementation deviates from what is written below, the reason is
> recorded in the commit that made the change:
> * the profile card carries the city as an **icon badge on the stage frame**, not
>   a chip under the name — a `🌷 Amsterdam` pill (~118px) does not fit a card that
>   is 92–126px wide on a phone;
> * the radius scale landed on **10 / 16 / 24 / pill** rather than the illustrative
>   8 / 14 / 22, to sit on the app's existing centre of gravity instead of
>   restyling it;
> * the dressing-room header came down to **277px** (from 407), not the 260 the
>   plan named — the last 17px would have had to come out of the avatar, which is
>   the thing that screen exists to show;
> * phase 3's "wordless task glyph" for counting mode turned out to be needed on
>   exactly one of the fourteen question types. Thirteen already show the task in
>   the picture; the one that does not (`listen`) is unanswerable without sound,
>   so the fix was to stop generating it when there is no speech, rather than to
>   add a glyph to thirteen cards that do not need one;
> * "star cost on locked stops" was dropped: cities unlock by finishing the
>   previous one, so there is no star cost to display. Inventing one would have
>   changed the mechanics the review asks to preserve;
> * D11 ("one illustration language") is **half done**. All 95 items now share one
>   thumbnail zone, baseline and shadow, so the grid reads as one system. The
>   remaining half — drawing the 21 accessory and instrument items that are still
>   emoji — is real illustration work and has not been attempted.
>
> **Later change, outside this review:** the settings screen has since been
> reworked into a parent area (`👨‍👩‍👧 Voor ouders`) with an identity row for
> choosing a child and three sections — `Voortgang | Oefenen | Beheer`. The
> screen-by-screen notes on "Instellingen" in section C therefore describe the
> screen as it was reviewed, not as it is now.

Senior UI/UX + game-UX review of the app as it stands (single-file PWA, `index.html`).
Reviewed by walking the live build in Chromium at 320 / 360 / 375 / 390 / 412 / 430 px
wide and at 1024×768, across every screen, in both tracks (rekenmodus and telmodus).

All measurements below are from the running app at **390 × 844** (iPhone 14/15 class)
unless stated otherwise.

---

## A. Overall assessment

**What already works**

- **The core metaphor is genuinely good and coherent.** Tour map → city → show →
  stars → dressing room is one story, not five features. The horizontal road with the
  avatar physically standing on the current stop, and the `Speel!` bubble with a caret
  pointing at that stop, is the single strongest idea in the product: it answers
  "where am I" and "what do I do" in one glance, without reading.
- **The parent-facing screens are the best-designed part of the app.** White paper
  cards, one chip component, one icon-tile, consistent type ramp, clear primary vs
  secondary cards. It is more systematically designed than anything the child sees.
- **The craft under the surface is real.** The token file documents WCAG contrast
  decisions, every one of the 52 keyframe animations is gated behind
  `prefers-reduced-motion`, focus-visible rings are app-wide, horizontal scrollers get
  directional fade masks. This is not a careless codebase. It is an *over-full* one.
- **Counting mode (telmodus) is a real second design, not a skin.** Ten-frames, dot
  frames, count-along, crossing-out for subtraction — the pedagogy is thought through.

**The main weaknesses**

- **Hierarchy by emptiness, not by weight.** The three main child screens spend
  40–60 % of the phone on empty gradient while the primary content sits small in the
  middle. On the map, the meaningful content (city medallion + name + Speel) occupies
  ~170 px of 844 (20 %). In the show, the gaps between header/avatar/sum/answers total
  ~340 px (40 %), and the *decorative* avatar stage (147 px tall) is physically larger
  than the *primary* sum card (99 px tall). Nothing is wrong on these screens; nothing
  is anchored either.
- **Gold means at least eleven different things.** Primary CTA, completed road, current
  stop, active nav tab, active category tab, active settings segment, equipped item,
  reward chip, rank pill, trophy-ready card, and the spotlight countdown bar are all
  gold. When everything important is gold, gold stops meaning "this one".
- **The token system has drifted into a collection.** 14 gold tokens, 10 purple, 22
  glass tints, 8 named radius tokens **plus** 13 hard-coded literals — **17 distinct
  corner radii** in one app, 61 `linear-gradient`s, 11 `radial-gradient`s, 86
  `box-shadow`s, 16 of them gold glows. Each was a defensible local decision. Together
  they are exactly why the app reads "assembled" rather than "designed".
- **One row, two meanings.** The show header puts 3 hearts and 8 progress dots in a
  single row of near-identical circles. The two things a child most needs to read —
  how many mistakes are left, how far through the show am I — are the hardest things
  on the screen to parse.
- **The reward screen is the busiest screen in the app.** Up to six stacked pills and
  banners in four colours, wrapping raggedly (1 chip / 2 chips / 1 chip), with the
  primary CTA pushed to or below the fold on a standard phone.
- **The dressing room is 48 % chrome.** The sticky header runs 0 → 407 px: title row,
  avatar stage, Spullen/Looks segmented control, and 8 category tabs in two rows —
  before a single item is visible. Two of the eight tab labels are truncated
  ("Schoe…", "Microf…", "Acces…").
- **A real layout bug at the most common phone widths.** On the player-select screen
  the `Speel!` pill is *wider than its own card* at 390 px (+20 px), 412 px (+13 px)
  and 430 px (+8 px). The shrink breakpoint is `max-width: 380px`, which is exactly
  one notch too narrow — it protects 320–375 px devices and misses every modern phone.

**The biggest opportunities**

1. **Restraint, not addition.** Almost every improvement below is a subtraction:
   fewer golds, fewer chips, fewer gradients, fewer floating layers, fewer words.
2. **Reclaim the empty space** so each screen has one obvious visual anchor instead of
   a small correct thing floating in a large void.
3. **Six reusable rules** (one CTA, one card, one active state, one locked state, one
   reward chip, one radius scale) would fix most of the inconsistency in one pass,
   because the same six patterns recur on every screen.

---

## B. Top improvements

| # | Improvement | Why | Impact | Effort |
|---|---|---|---|---|
| 1 | **Reserve gold for "play / reward". Move active-navigation to blue.** Nav tabs, category tabs and settings segments stop being gold; they use the existing `--blue-*` selection language already used by "previewing this item". | Kills the biggest source of visual noise in one change. Gold instantly regains its meaning: gold = the thing to tap to play, or a thing you earned. | High | Small |
| 2 | **One primary CTA per screen.** Player select currently shows *three* pulsing gold `Speel!` buttons; the map shows a pulsing `Speel!` and a gold Memory FAB; the end screen shows a gold banner, a gold rank pill and a gold CTA. | Three equal CTAs = no CTA. A child scans for the one gold thing; give them exactly one. | High | Small |
| 3 | **Fix the `Speel!` overflow on player select** (breakpoint at 430 px, not 380 px) **and remove the per-card CTA entirely** — the whole card is already the button. | A CTA that visibly breaks out of its own card is the single most "unfinished" thing in the app, and it happens on the first screen, on the most common devices. | High | Small |
| 4 | **Split lives from progress in the show header.** Hearts stay a row of hearts on the left of the title; question progress becomes a single slim segmented bar (not 8 dots) directly under the header. | Two different systems currently share one visual language in one row. Separating them costs nothing and makes both readable at a glance. | High | Small |
| 5 | **Rebuild the end screen as one reward block.** One row of exactly three chips (💎 earned · ⭐ stars · 👏 audience), rank-up and trophy promoted into a single "milestone" slot above the CTA, and the whole card sized to fit 844 px without scrolling. | This is the emotional payoff screen and currently it's the most cluttered one, with the CTA off-screen. | High | Medium |
| 6 | **Give the map an anchor.** Pull the route up against the header, let the road art bleed into the space below it, and cap the empty band. | 60 % of the home screen is currently empty gradient; the route reads as a thin strip floating in a void rather than as a world. | High | Medium |
| 7 | **Halve the dressing-room header.** Move the 8 categories into one scrollable row of icon-only chips (label appears only for the active chip), and drop the Spullen/Looks segmented control into the same row as the avatar. | 48 % of the screen is chrome before the first item; the truncated labels ("Microf…") are worse than either icon-only or full-word. | High | Medium |
| 8 | **One radius scale, one shadow scale, one gradient rule.** 4 radii (8 / 14 / 22 / pill), 3 elevations, and "gradients only on pressable surfaces". | 17 distinct corner radii and 86 shadows is the mechanical cause of the "generated" feeling. Fixing it is mostly find-and-replace. | High | Medium |
| 9 | **The trophy "ready" state must keep the trophy's identity.** Today every claimable trophy becomes an identical gold card reading "Open trofee!" with its real name demoted to a subtitle — five of them in a row look like one thing repeated. | Turns the most rewarding screen from a wall of duplicates into a shelf of distinct prizes. | Medium | Small |
| 10 | **Make the 🔊 replay button a real control in counting mode.** Currently 26 × 26 px at 45 % opacity, tucked in the card's right edge. | For a pre-reader the spoken prompt *is* the question. The one control that repeats it should be the second-most prominent element on the screen, not the least. | High | Small |
| 11 | **One back affordance.** `←` for "go back", `✕` only for "stop the show". Today the end screen and Memory both use `✕` to mean "back to map". | Two glyphs currently carry three meanings; a child learns the wrong association ("✕ = leave" vs "✕ = quit, are you sure?"). | Medium | Small |
| 12 | **Screen title = where you are.** On the map the header title is the *rank* ("Lokale ster"); on every other screen it is the place ("Kleedkamer", "Trofeeënkast", "New York"). Put the city/tour label there and let rank live in the career strip below it. | Restores one consistent rule for the most-repeated component in the app. | Medium | Small |

---

## C. Screen-by-screen review

### C1. Player select (`#screen-profile`)

**What works**
- Three avatars side by side, always visible without scrolling, each visually distinct
  by dress colour. The wave-greeting animation on entry is charming and cheap.
- Choosing a player is a single tap anywhere on the card.

**What feels off**
- **The `Speel!` pill overflows its card** at 390 / 412 / 430 px (measured +20 / +13 /
  +8 px). It visibly breaks the card outline on the first screen of the app.
- **Three identical pulsing gold CTAs.** There is no primary; the eye has nowhere to
  land. The CTA also duplicates the card tap — the card *is* the button.
- **The star chip is a scoreboard between siblings.** Two of three cards read `⭐ 0`.
  For a new player the first thing the app shows is an empty score next to a sibling's
  17. The code comments say the card should "tell the story, not be a scoreboard" —
  the star chip is the last remnant of the scoreboard.
- **~380 px of vertical void** below the cards; the composition is bottom-heavy with
  a large dead band under it.
- The settings gear sits top-right on the child's very first screen, at 34 × 34 px.

**Recommended changes**
- Remove `.speel-pill` from the profile card. Replace it with nothing — or, if the
  affordance is needed, a small `▶` glyph inside the avatar frame's bottom-right
  corner, in the same gold, at chip size.
- Replace `⭐ 17` with a *story* line: the current city, e.g. `🗽 New York` (and for a
  new player `🧇 Brussel` rather than `⭐ 0`). Same size, same chip, no comparison.
- Move the card row up so title → subtitle → cards sit as one group in the upper two
  thirds; let the cloud layer own the space below instead of nothing.
- **Before → after:** *three gold buttons, two zeros and a big empty band* → *three
  portraits with the city each girl is in, one clear "these are the three players"
  group, and no button competing with the card it sits inside.*

---

### C2. Map / world tour (`#screen-map`) — the home screen

**What works**
- The road-through-the-medallions with a gold "travelled" segment over a dim "still to
  discover" segment is excellent and instantly readable without text.
- The hero standing on the current stop, with a contact shadow, plus the `Speel!`
  bubble with a caret attached to that stop, is exactly the right way to bind a control
  to the thing it controls.
- Locked stops are desaturated with a padlock — unambiguous.

**What feels off**
- **The screen is 60 % empty.** Measured: sticky header 0–99, stop medallions 398–507,
  nav 762–834. That's 121 px of void above the route, 127 px below it, and only ~170 px
  of actual content in an 844 px screen.
- **The header title is the rank, not the place.** Every other screen puts *where you
  are* in `.header-title`. Here it says "Lokale ster". Meanwhile the career strip below
  it repeats the same progress as `17/30 ⭐ status ›` plus a bar.
- **Three currencies compete in the top 160 px:** total stars, rank progress bar, and
  diamonds. A child needs none of them to decide what to do next.
- **Ragged labels.** Because the road waves, each stop sits at a different y, and only
  *played* stops carry a star row — so city names land on three different baselines
  and the `Speel!` bubble collides with the neighbouring city's label ("Rio").
- **A second gold CTA.** The Memory FAB is gold, bottom-right, in its own floating
  layer above the nav — visually the same promise as `Speel!`.
- Toast notifications ("🎉 Welkom in Rio!") land over the hero and the route.

**Recommended changes**
- Anchor the route: reduce the void above (route starts ~140 px under the header) and
  let the road path continue past the last visible stop into the lower band instead of
  ending in nothing. Consider a low horizon/skyline silhouette in the bottom 120 px so
  the empty space is *the world*, not absence.
- `header-title` → `🎤 Tournee 1` (or the current city). Move the rank name into the
  career strip: `⭐ Lokale ster · 17/30` above the bar. One place, one time.
- Give every stop the same 3-star row (unearned stars dim) so the labels align.
- Demote the Memory FAB: same size, but the secondary "soft" treatment (glass + white
  border), not gold. It is a side dish, not the meal.
- Dock map toasts under the sticky header (the game screen already has `.toast.docked`
  for exactly this reason — reuse it).

---

### C3. The show — maths mode (`#screen-game`)

**What works**
- The white sum card is correctly the brightest, highest-contrast object on the screen,
  and the dashed `▢` for the unknown is a genuinely good teaching device — it works
  identically for `3 + 4 = ▢` and `3 + ▢ = 7`.
- Four large answer buttons with a real press-lip; excellent tap targets.
- The spotlight countdown living *inside* the sum card rather than as a separate timer
  bar is the right call (it reads as bonus, not as "hurry").

**What feels off**
- **Lives and progress share one row of circles.** `❤️❤️🤍 ● ● ● ○ ○ ○ ○ ○` — eleven
  similar circles, two meanings, no separation.
- **The decoration is bigger than the content.** Avatar stage 147 px tall vs sum card
  99 px. Measured gaps: 104 px above the stage, 100 px between stage and sum, 96 px
  below the answers — ~340 px of the 844 px screen is empty.
- **The fan meter is an unexplained gauge.** A tall empty tube with a dimmed 👏 above
  it. At the start of a show it is 0 % — a mysterious empty pill next to the avatar.
  Nothing connects it to the "publiek" reward the child later sees on the end screen.
- The spotlight bar is bright gold and full-width — the second-most eye-catching thing
  on the screen is a timer.
- The 34 × 34 px `✕` is below the 44 px minimum for a child's finger, and it is the
  only destructive control on the screen.

**Recommended changes**
- Header row 2 becomes: hearts on the left, one **slim segmented progress bar** on the
  right (segments = questions, filled = done, outlined = current). Two shapes, two
  meanings.
- Close the vertical gaps: pull the sum card up so avatar → sum → answers read as one
  column with even ~24 px rhythm, and let the bottom edge of the answers sit ~24 px
  from the bottom. On tall screens grow the *sum card*, not the avatar.
- Attach the fan meter to the avatar frame — as a thin bar along the bottom edge of the
  stage with the 👏 at its right end — so it reads as "the crowd, at your show" rather
  than as a separate widget. Give it a first-run label once ("👏 publiek").
- Soften the spotlight bar to a thin gold hairline at the card's bottom edge.
- `✕` to 44 × 44 px.

---

### C4. The show — counting mode (telmodus)

**What works**
- One object type per question, ten-frames for 6–10, count-along popping, crossing-out
  for subtraction: all sound, all reading-free.
- Answer tiles show quantities, not numerals — correct for the audience.

**What feels off**
- **The 🔊 replay is 26 × 26 px at 45 % opacity**, tucked against the card's right edge
  — far below the 44 px minimum, and it is the *only* way to hear the question again.
  For a pre-reader the spoken prompt is the entire instruction.
- The question card shows only an object (an apple) — the *task* ("how many?", "which
  is more?") exists purely in audio. If the child mis-hears, taps away, or plays with
  sound off, the screen is unanswerable and gives no way back in.
- Same lives/progress ambiguity as maths mode.

**Recommended changes**
- Promote replay to a real button: 48 × 48 px, full opacity, gold-outlined circle,
  placed *under* the question card, centred — the second-most prominent control after
  the answers. Keep the current ear-wiggle animation on it.
- Add a persistent, wordless task glyph in the card's top-left corner that survives the
  audio: e.g. `❓⬤⬤` for "how many", `⚖️` for "which is more". One small icon, always
  present, no reading.

---

### C5. Result screen (`#screen-end`)

**What works**
- Stars popping in one by one, each with a rising tone, is the right ceremony.
- The city name in the header ties the result to the show that produced it.

**What feels off**
- **Six competing reward elements**, in four colour languages: `💎 +22 verdiend` (blue),
  `⭐ +10 sterrenbonus` (yellow), `👏 +2 publiek` (pink), `⭐ Lokale ster! +10 💎`
  (solid gold pill), `🎁 Nieuwe trofee klaar!` (gold banner), then the gold CTA.
- **Ragged wrapping.** The chips wrap 1 / 2 / 1 with no alignment.
- **The primary CTA is at or below the fold** at 390 × 844 — the secondary
  "👗 Kleedkamer" button is cut off entirely.
- **Two sentences of prose** ("Het publiek juicht en danst mee!" + "Je deed 6
  danspasjes in deze show!") on a screen a 5-year-old should read in one look.
- Confetti falls across the title and makes it briefly unreadable.
- The header uses `✕` for "back to map" — elsewhere `✕` means "quit, are you sure?".

**Recommended changes**
- One fixed row of exactly **three** chips, always the same three, always in the same
  order and same width: `💎 +22 · ⭐ +10 · 👏 +2`. Never wraps, never reorders.
- One **milestone slot** below it that shows at most one thing, in priority order:
  rank-up > new trophy > "nog 13 ⭐ tot Clubster". Same gold pill component either way.
- Delete the dance-count subline (it competes with the star ceremony and means nothing
  to progression). Keep one short praise line.
- Size the card to fit 844 px: stage 140 px, stars 44 px, three chips, milestone, CTA.
- Header glyph `←`.
- **Before → after:** *a stack of six coloured pills that wraps unevenly and pushes the
  button off-screen* → *stars, one line of praise, one row of three identical chips,
  one milestone, one gold button — all above the fold.*

---

### C6. Trophy cabinet (`#screen-trophies`)

**What works**
- Shelves with per-shelf counters is the right structure for 45 trophies.
- The progress bar on each in-progress card, with `Nog 2 steden`, is concrete and
  motivating.
- The state ladder (fresh / busy / almost / locked / done) is genuinely well thought out
  and documented in the code.

**What feels off**
- **The "ready" state erases the trophy's identity.** Every claimable trophy becomes an
  identical gold card whose headline is `Open trofee!` with the real name demoted to a
  grey subtitle, and the trophy's own emoji replaced by 🎁. Five in a row look like one
  thing accidentally repeated.
- The ready card is also the only card in the app with a *different card shape and
  fill* rather than a state applied to the standard card.
- Header counter and shelf counters can disagree (`5 van 45 verzameld` above
  `0 van 5`), because one counts claimed and the other counts claimed-per-shelf while
  ready ones sit in neither bucket.
- Six states × the shine sweep, gift wiggle, tap ripple, chest burst, rays, ring,
  confetti cannon and post-claim shimmer is a lot of motion for one card type.

**Recommended changes**
- Ready = the **normal card** with the trophy's own emoji and name, plus a gold border,
  a gold "🎁 Open!" pill in the bottom slot where the progress bar would be, and the
  existing shine sweep. Same shape, same size, same headline slot as every other card.
- Keep the chest-burst celebration on *open* — that moment has earned its animation.
  Drop either the rays or the ring (both do "radiance" simultaneously).
- Make the header counter and the shelf counters count the same thing.

---

### C7. Dressing room (`#screen-dress`)

**What works**
- Try-it-on-then-buy in one place, with the avatar always visible above, is the right
  model. The dress bar naming the selected item and its price is clear.
- Looks (complete outfits) as a second mode is a good long-term goal structure.

**What feels off**
- **48 % chrome.** Sticky header 0 → 407 px; grid starts at 419 px; nav at 762 px; the
  dress bar takes another ~60 px when active. Usable browsing window ≈ 280–340 px.
- **Three simultaneous gold "active" layers**: the Spullen/Looks segment, the category
  tab, and the bottom nav item — all gold, stacked vertically within 300 px.
- **Truncated labels**: "Schoe…", "Microf…", "Acces…" — emoji plus a cut-off word is
  worse than either alone.
- **Four card states visible at once** in one grid: price chip (gold text), `Van jou`
  (grey), `Aan` (solid gold), blue selection ring. Plus a `Nieuw!` pulsing gold pill.
- **Three illustration languages in one grid**: drawn SVG garments, plain emoji
  (accessories, pets, instruments), and a coloured ball with an emoji inside (stages).
- The 🎲 shuffle button carries three concentric treatments (2 px border + 3 px glass
  ring + shadow lip) and floats over the stage's rounded corner.
- **Looks view gives no sense of proximity.** Every unowned piece is dimmed with no
  price and no counter, so a screen of Looks reads as identical grey panels with no
  answer to "how close am I / what does this cost".
- One Look ("OH-elle!") includes a beer-mug piece — off-theme for the audience, and it
  is the only piece whose emoji reads as an adult object.

**Recommended changes**
- Collapse the header: put the Spullen/Looks control **beside** the avatar (right of
  the stage), and make categories **one horizontally scrolling row of icon-only chips**
  where only the active chip shows its word. Target: header ≤ 260 px.
- Only the bottom nav keeps gold. Category chips and the Spullen/Looks segment use the
  blue selection language.
- One status slot per card with exactly one value: price / `Van jou` / `Aan`. Drop the
  separate blue *ring* for "previewing" — the item is already on the avatar above,
  which is a far stronger signal; keep only a subtle blue border.
- Unify thumbnails: draw the missing categories, or render *all* thumbnails as an emoji
  on the same neutral disc. Do not mix.
- Shuffle button: one border, one shadow, moved out of the stage's corner to sit beside
  the Spullen/Looks control.
- Looks cards: add the same bottom slot the trophy cards use — `3/4 · nog 18 💎`.

---

### C8. Memory (`#screen-memory`)

**What works**
- Reading-free by construction (match equal quantities), square cards, satisfying
  flip / shake / snap feedback, and no bottom nav — correctly framed as an activity.

**What feels off**
- The card back is the `🎴` emoji, which renders as an unrecognisable red/grey glyph on
  many platforms — it should be a brand mark, not a font-dependent emoji.
- No progress at all: no pairs-found counter, no "how many left". The show screen has a
  progress row; this activity has none.
- ~430 px of dead space above and below a 6-card grid.

**Recommended changes**
- Card back: the app's own microphone or star mark on the existing purple gradient.
- Add the same slim segmented progress bar used in the show (segments = pairs) to the
  sticky header. One component, two places.
- Centre the grid in the available space and let it grow — the cards can be 30 % larger.

---

### C9. Career ladder overlay

**What works**
- One continuous list, past dimmed, current marked `NU`, next tier expanded with a bar.
  Restrained and readable — this is one of the better-designed pieces in the app.

**What feels off**
- **Nine rows of rank names a child cannot read**, seven of which are meaningless
  ("Platinaster", "Toursensatie") and dimmed to 36 % opacity.
- `17/30 ⭐ · nog 13` states the same fact twice.
- It is a **third modal language**: white `.modal` (quit/confirm), gold-bordered purple
  `.career-panel`, and gold-bordered purple `.trophy-pop` — all different.
- Title `JOUW STER-STATUS` is uppercase-tracked, a type treatment used nowhere else.

**Recommended changes**
- Show **five rows**: previous, current, next, and two ahead, plus a `…` row. Everything
  beyond that is noise for the audience.
- Drop `· nog 13` (the `17/30` already says it).
- Pick one overlay component: purple panel + gold border for celebration/status, white
  card for parent decisions. Career and trophy-pop should share one shell.

---

### C10. Parent settings (`#screen-settings`)

**What works**
- The most systematic screen set in the app. White cards, one icon tile, one chip, one
  segmented control, clear primary/secondary card distinction, autosave with a quiet
  confirmation pill instead of a Save button. This is the standard the child screens
  should be measured against.

**What feels off**
- Six stat tiles use six different accent colours with **no semantic meaning** —
  decorative colour where the rest of this screen is disciplined.
- The card-head icons are emoji (🧸 🎓 🎮 📊) inside a designed tile — the one place the
  paper theme borrows the child theme's language.
- Profile switcher and Voortgang/Instellen both use gold-active, inside a purple sticky
  header, on a paper-themed screen — the only gold on the screen.

**Recommended changes**
- One accent colour for all stat tiles (or two: purple for "activity", green for
  "accuracy"). Remove the rest.
- Keep the emoji, but treat them consistently — they are fine here, they just shouldn't
  be the only place a designed tile wraps an emoji.

---

## D. Design-system cleanup

Eight rules. Each one is a single decision applied everywhere.

**D1 — One primary CTA.** Gold gradient, pill or 18 px radius, purple text, 5 px press
lip. Exactly one per screen. Everything currently gold-and-not-a-play-action loses gold:
nav tabs, category tabs, settings segments, the Memory FAB, and the spotlight bar.

**D2 — One secondary CTA.** The existing `.btn.soft` (glass fill, 1.5 px white border,
3 px lip). Used for "Kleedkamer", "Kaart", "Nog een keer", Memory. Delete `.btn.gray`
and `.btn.ghost` as separate ideas — gray becomes soft; ghost becomes soft.

**D3 — One card.** `background: var(--glass-white-13)`, `border: 2px solid
var(--glass-white-30)`, `radius: 14px`. Trophy cards, item cards, look cards and shelf
panels all already approximate this — make it literal. **States are borders and one
bottom slot, never a different shape or a different fill gradient.**

**D4 — One selected/active state.** Blue: `border-color: var(--blue-text)` + a 3 px
`rgba(56,189,248,.22)` ring. Used for nav, tabs, segments, and item preview. Gold is
never "selected"; gold is "earned" or "play".

**D5 — One earned/equipped state.** Gold: `border-color: var(--gold-accent)`,
`background: rgba(255,214,90,.10)`, no glow. Used for equipped items, completed cities,
achieved ladder rungs, claimed trophies. (This already exists — it just needs to stop
competing with D4 and D1.)

**D6 — One locked state.** Desaturate + 45 % opacity + the padlock badge. One
treatment; today locked cities use a grey gradient fill while locked trophies use a
dark fill and a corner badge, and unowned Look pieces use plain opacity.

**D7 — One reward chip.** `.earn-chip`: pill, dark glass, emoji + value. **Three
variants only** — 💎 diamonds, ⭐ stars, 👏 audience. The `rank` and `nextrank` variants
become the separate *milestone pill* (D8), not chips in the same row.

**D8 — One milestone pill.** The existing `.gold-pill` (gold gradient, pulsing, tappable)
for rank-up, trophy-ready and next-rank alike. **At most one on screen at a time.**

**D9 — One radius scale, one elevation scale.**
`--r-sm: 8px` (chips, small controls) · `--r-md: 14px` (cards, tiles) · `--r-lg: 22px`
(panels, sheets, sum card) · `--r-pill: 999px`.
Elevation: `--e-1` (resting card), `--e-2` (raised panel/sticky), `--e-3` (overlay).
This replaces 17 distinct radii (8 tokens + 13 literals) and 86 hand-written shadows.

**D10 — Gradient rule.** *A gradient means "you can press this."* Buttons, answer tiles,
medallions: yes. Cards, panels, headers, bars, badges: flat fill. This alone removes
roughly half of the 61 gradients.

**D11 — Illustration language.** Drawn SVG for anything worn by the avatar; emoji for
world/flavour (cities, categories, decoration). Never both for the same class of thing
(today: dresses are drawn, accessories are emoji, stages are emoji-in-a-disc).

---

## E. Game-UX / mechanics improvements

These do not change the economy — only how it is communicated.

- **E1 · Show the payoff before the show.** The current stop's `Speel!` bubble could
  carry the stars still available there (`Speel! ⭐⭐☆`). Today a child cannot tell from
  the map whether replaying Madrid is worth anything.
- **E2 · Make the fan meter legible.** Attach it to the avatar stage (see C3) and show
  the reward it is heading toward — a small `👏` chip that lights up at 25/50/75/100 %,
  matching the `+1 💎 per 25 %` rule the end screen reveals afterwards. Right now the
  child only learns what the meter did *after* the show.
- **E3 · One "next thing to do" on the map.** Rank strip, star count, diamond count and
  trophy dot all compete. Consider a single line under the career bar: `Nog 2 steden tot
  🏆 Wereldster` — the nearest concrete goal, chosen automatically, one at a time.
- **E4 · Make travel the reward.** The travel animation already exists and is lovely.
  Let it play *before* the map settles, with the road's gold segment extending as she
  moves — turn arrival into the celebration rather than the end screen doing all of it.
- **E5 · Memory needs a reason to exist.** It is a gold FAB with no stated reward and no
  progress. Show its payout on the button itself (`🎴 Memory · 💎 3`) and give the board
  a pairs-found bar (see C8).
- **E6 · Trophy discoverability.** The nav dot says "something new" but not what. On tap,
  scroll the cabinet to the ready card and let the shine sweep run once — the child is
  taken to the thing rather than left to hunt.
- **E7 · Locked cities should hint, not just refuse.** A locked stop could show the star
  cost to reach it in the same dim style, so the road ahead has a price rather than only
  a padlock.

---

## F. Remove / simplify

Ordered by how much noise each removal takes out.

| Remove / reduce | Where | Why |
|---|---|---|
| **The per-card `Speel!` button** | Player select | The card is already the button; three gold CTAs cancel each other out, and it overflows its card at 390–430 px. |
| **Gold on all navigation** (nav items, category tabs, settings segments, Spullen/Looks) | Everywhere | The single largest source of "everything is important". |
| **The `⭐ 0` star chip** | Player select | An empty scoreboard between siblings, on the first screen. |
| **The 8 question dots** | Show header | Replaced by one segmented bar; frees the row for hearts alone. |
| **`Je deed 6 danspasjes in deze show!`** | Result | Competes with the star ceremony; means nothing to progression. |
| **The `nextrank` chip** in the earn row | Result | Belongs in the single milestone slot, not in a row of currencies. |
| **The `Open trofee!` headline** | Trophy cabinet | Replaces the trophy's own name with the same words five times over. |
| **The blue "preview" ring** on item cards | Dressing room | The avatar above already shows the preview; the ring is a fourth state in a grid that has three. |
| **`· nog 13`** | Career ladder | `17/30` already says it. |
| **Four of the nine ladder rows** | Career ladder | Ranks 5 tiers away are unreadable noise for the audience. |
| **The extra glass ring on the 🎲 button** | Dressing room | Three concentric treatments for one 46 px control. |
| **Either the rays or the ring** in the trophy burst | Trophy open | Two simultaneous "radiance" effects. |
| **Five of the six stat-tile accent colours** | Parent progress | Decorative colour with no meaning, on the app's most disciplined screen. |
| **`.btn.gray` and `.btn.ghost`** as distinct components | Everywhere | Fold both into `.btn.soft`. |
| **~half the gradients** (61 → ~30) | Everywhere | Apply the "gradient = pressable" rule (D10). |
| **~10 of the 14 gold tokens** | Tokens | Keep: cta-top/bottom/shadow, accent, light, ink-on-gold. The rest are one-offs. |

Quieter, not gone:
- The spotlight countdown bar → a hairline at the card's bottom edge.
- The Memory FAB → secondary treatment.
- The `map-sky` clouds and planes → fine as-is; they are the one decorative layer that
  earns its place, because it is what makes the empty band feel like sky.

---

## G. Implementation plan

### Phase 1 — Quick consistency wins *(small, broad, independently shippable)*

1. Fix the player-select `Speel!` overflow: move the breakpoint to `max-width: 430px`
   **and** remove `.speel-pill` from `.profile-card` entirely.
2. Replace the profile star chip with the current-city chip.
3. Recolour active navigation from gold to blue: `.nav-item.active`, `.tab-btn.active`,
   `.segmented button.on`.
4. Demote the Memory FAB to `.btn.soft` styling.
5. One back glyph: `←` on the result screen and on Memory; `✕` reserved for "stop show".
6. Map header title → city / tour label; rank name into the career strip.
7. Drop `· nog 13` from the ladder; trim the ladder to 5 rows + `…`.
8. Delete the dance-count subline on the result screen.
9. Enlarge `.icon-btn` to 44 px and `.count-replay` to 48 px at full opacity.

*Nothing here touches layout structure; all of it is CSS and one-line string changes.*

### Phase 2 — Component & screen cleanup *(medium)*

1. **Token pass:** collapse to 4 radii and 3 elevations (D9); apply the gradient rule
   (D10); prune the gold tokens.
2. **Show header:** hearts + one segmented progress bar; reuse the same bar in Memory.
3. **Result screen:** fixed three-chip row + single milestone slot; refit to 844 px.
4. **Trophy ready state:** normal card + gold border + `🎁 Open!` in the bottom slot.
5. **Dressing room header:** icon-only scrolling category row, Spullen/Looks beside the
   avatar, target header ≤ 260 px; one status slot per item card.
6. **Map composition:** tighten the void above the route, extend the road into the lower
   band, give every stop a 3-star row.
7. **Show composition:** even vertical rhythm; sum card grows on tall screens, avatar
   does not; fan meter attached to the stage.

### Phase 3 — Optional polish *(nice-to-have, after the fundamentals)*

1. Counting mode: persistent wordless task glyph on the question card.
2. Map: low skyline silhouette in the bottom band; travel animation plays on arrival.
3. `Speel! ⭐⭐☆` on the map bubble; star cost shown on locked stops.
4. Memory: brand-mark card back; larger cards; payout shown on the FAB.
5. Unify the three overlay shells (quit/confirm, career, trophy-pop) into two.
6. Unify item thumbnails into one illustration language.
7. Parent progress: single accent colour for stat tiles.

---

## Guiding principle

Everything above is in service of one thing: the app should read as if **one designer
made every screen on the same afternoon**. Today it reads as a set of individually
careful decisions — the token comments prove how careful — that were each made in
isolation. The fix is not more polish. It is fewer golds, fewer radii, fewer gradients,
fewer chips, fewer words, and one clear thing to look at on every screen.

The personality stays: purple, glittery, popstar, playful. It just stops shouting all
at once.
