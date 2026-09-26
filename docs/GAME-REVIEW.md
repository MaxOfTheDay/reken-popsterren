# Rekensterren — whole-game review

*Written against `7ca7996` (2026-09-26). Nothing in here is implemented. Like the
other reviews in `docs/`, this is a snapshot: where it and the code disagree
later, the code wins. Code is referenced by function and section name, not by
line.*

**How this was made.** I played the game in Chromium at 412×920 with touch:

- a fresh first run and creating a star;
- a first show with deliberate mistakes, then a perfect show;
- the end screen, the map walk and claiming trophies;
- trying on and buying in the wardrobe, and the Werelden screen;
- finishing a world, a counting-mode show and the parent area.

I also looked at 920×412, 768×1024 and 1280×800, and traced the slow taps with the
CPU throttled 6×. For each moment I read the code path behind it, and I read the
earlier reviews so this one doesn't re-propose what was rejected on purpose.

**Limits:** headless Chromium only, no real device, and no sound or speech actually
heard.

---

## What is already strong

- **The map is the best screen in the game.** Six painted worlds, readable stop
  states, the star walking the route, the camera moving from world to world. Leave
  it alone.
- **A correct answer is a real cause-and-effect beat.** The number flies into the
  sum ("De som valt dicht"), diamonds fly to the counter, the venue brightens and
  the star dances. A child sees her answer finish the sum.
- **Counting mode really works without reading.** Every prompt is spoken, there
  are five- and ten-frames, and a second miss counts the right amount out loud. It
  is the best learning surface in the app.
- **The wardrobe:**
  - trying on in the mirror, and buying with one tap from the bar;
  - world treasures that are earned and never sold;
  - "👕 Pas je Notenkroontje", which leads from finishing a world straight to the
    new item.
- **Finishing a world** ("Wereld uit!" → treasure → "Doe aan") is one clear moment
  with a clear reward.
- **The engineering discipline:**
  - progress is derived and only `p.stars` is saved;
  - `save()` never throws;
  - 1,186 fast checks;
  - a written colour and type contract;
  - written principles for motion and sound.

  The earlier reviews were actually carried out, not just filed.

---

## The loop as it actually runs

**play** (8 questions, about 2 min; 5 in counting mode) → **feedback** after every
answer → **reward** (2–3 💎 an answer plus streak and gold bonuses; 1–3 ⭐ a show,
plus 5 💎 a star) → **progression** (the star walks to the next stop; a new world
every 8 shows; 6 worlds, 48 shows) → **choice** (the next stop, the wardrobe or
the trophies) → **play**.

| link | verdict |
|---|---|
| play | the beat is strong, but *what you do* stops changing after about show 10 (#3) |
| feedback | correct: excellent. Wrong, in math mode: a red button and a sentence (#1) |
| reward | 💎 are clear. ⭐ is harsh and mislabelled at the end of a show (#2) |
| progression | map and worlds: excellent. Star status: a dead end (#4) |
| choice | the next step is always obvious, but saved-up 💎 lead nowhere between visits (#6) |

**"I did something → something happened → I earned something → my game changed."**

The first three hold inside a show. The fourth holds for the *look*: the outfit,
the place on the map and the world painting all change. It does not hold for
*play*. From about show 10 to show 48 the questions are the same kind, so the game
changes around the child but not with her. That is the weakest link.

---

## The seven biggest opportunities

### 1. A mistake in math mode teaches nothing

**Observation.** On the first miss the child sees:

- a red button, and the text toast "Net iets te weinig — probeer een groter getal!
  👆" (`hintFor`);
- the question card wobbling;
- a 52 px grey 🎵 / 🎶 / 😅 dropping over the star's body (`slipNote`). At phone
  size it reads as a smudge.

The star keeps smiling, because `avatarSVG` draws exactly one face. There is no
picture of the sum: the ten-frames and dot groups exist, but only in counting mode
(`frameHTML`, `dotFrameHTML`, `takeAwayHTML`).

"Net iets" ("just a little") is also shown when the pick was 10 off (the wrong
options are ±1, ±2 and ±10).

A missed sum returns with 35 % probability on every question, and nothing keeps it
from coming straight back (`buildQuestion` → `pickWeak`). In my first show:

- question 1 was 7 + 3;
- questions 3, 5 and 6 were 3 + 7, with 5 and 6 back to back.

After the second miss the child has to read "tik om verder te gaan" ("tap to
continue").

**Why it matters.** The youngest math players, at 5 or 6, read numbers but not
sentences. For them a miss is now a red colour and a line they can't read. The
counting track shows how good this can be: a spoken hint, then the right amount
counted out loud.

**Recommendation.**

- After the first miss, show the sum as amounts under the card: two dot groups in
  the existing ten-frame renderer, or crossed-out dots for minus. Do this for
  answers up to 20; above that, show a small arrow on a number line.
- Replace the sentence with a picture hint: the number she tapped, with a big ↑ or
  ↓.
- Let the star react with an "oh!" face for about 600 ms, instead of the grey
  symbol falling over her.
- A missed sum comes back no sooner than two questions later, and at most once
  per show.
- After the second miss, show a big ▶ instead of text.

**Impact** High. **Effort / risk** Small–medium. The work sits in `submitAnswer`,
`hintFor`, `buildQuestion`, `avatarSVG` and `50-zaal.css`, and it reuses renderers
that counting mode already tests. The pedagogical risk is that the picture must
show the amounts, not the answer.

**Evidence** `= Spel`, `= Telmodus`, `= Avatar (SVG)`, and the first-show playthrough.

### 2. The end of a show says mixed things

**Observation.**

- **The star rule is harsh, and the two tracks differ.** In math mode 0 misses = 3
  ★, 1 miss = 2 ★, 2 or more = 1 ★ (`showStars`). A miss counts even when the retry
  was right.
  - My first show had 6 of 8 right first time. The result: one star, under "🎉 Show
    1 was geweldig!" and "Het publiek klapt hard voor je!".
  - Counting mode uses a first-try ratio instead.
  - A 10-question show is stricter than an 8-question show.
- **The second chip is diamonds, not stars.** It reads "⭐ +5", but that number is
  diamonds (`bonus = stars * 5` in `applyShowResult`). After a 3-star show it says
  "⭐ +15", which reads as fifteen stars, and the 💎 chip leaves those 15 out.
- **"EXTRA SHOW!" promises a show that never comes.** "🎆 EXTRA SHOW! 💎 +5 bonus"
  pops up mid-show when a hidden audience counter fills (`G.fan`); it happened in
  both of my first two shows. No extra show follows, yet a trophy is named after
  it.
- **The trophy pill undercounts.** Trophies that become ready *during* a show
  aren't counted: after my first show it said "Nieuwe trofee klaar!" with two
  ready.

**Why it matters.** This screen is where "I earned something" lands.

- A child who did well sees one gold star out of three, and "+5" next to a star.
- One star covers everything from two slips to nearly failing. So getting better,
  say from 5 slips to 2, looks exactly the same.

**Recommendation.**

- **One star rule for both tracks**, scaled to the length of the show:
  - 3 ★ stays "flawless", because that is what a perfect world means;
  - 2 ★ means up to about a quarter slipped;
  - 1 ★ is everything else.
- Show the stars only as stars. Show one 💎 total that includes the star bonus.
- Let the title and the cheer follow the result.
- **Fix the "EXTRA SHOW!" label.** Either:
  - rename it to something the child can *see* happen: "Toegift!", with the star
    taking a bow; or
  - drop the label and fold the +5 into the streak moment.
- Count trophies that became ready during the show in the pill.

**Impact** High. **Effort / risk** Small. The changes are in `showStars`,
`applyShowResult` and `endLevel`, which the `kern` suite covers. More shows will
end on 2 ★; stars already saved don't change.

**Evidence** The end screens after a show with slips and after a perfect show;
`= Spel`, `= Wereldbeloningen`.

### 3. Learning stops at show 10 of 48, and the worlds are the same maths

**Observation.**

- Difficulty is `t = 0.35 + lvl · 0.07 ± skill`, capped at 1 (`genTriple`).
- With the default setting "tot 20", the number range hits that ceiling around
  show 10, which is world 2, show 2.
- After that the only new things are:
  - "find the number" sums from show 25;
  - three-number sums from show 37;
  - and each of those only once the child has mastered the basics (`tourRound`,
    `planSpecials`).
- `ROUND_LEN = 12` doesn't line up with worlds of 8 shows, so a new kind of
  question can show up in the middle of a world.
- When it does, nothing introduces it: the "?" box simply moves to the middle.

**Why it matters.** To a child a new world promises something new. Today worlds 2
to 4 are the same sums with a different painting. Bridging ten (sums like 8 + 5),
the key step in sums up to 20, is left to chance.

**Recommendation.** Make each world one learning step, inside the ceiling the
parent set. For example:

1. up to 10;
2. up to 20 without bridging ten;
3. up to 20 with bridging;
4. find the missing number;
5. three numbers;
6. a mix.

Within each step, keep the adaptation to how the child is doing (`perf`) and keep
the mastery gates. The first time a new kind of question appears, show one worked
example.

This does not dress the maths up per world; that earlier decision stands. The
worlds keep the same look for their sums and differ in what they teach.

**Impact** High, over weeks of play. **Effort / risk** Medium–large:

- it changes the adaptive engine, and `maths.test.js` has to follow;
- the table of steps needs a teaching decision;
- saved games in the middle of the tour will jump to their world's step, so let
  `perf` ease them in.

**Evidence** `= Vragen maken`, `= Extra uitdagingen`, `tourRound`.

### 4. The star-status ladder leads nowhere at the top

**Observation.**

- `RANK_TIERS` sit at 12, 30, 60, 100, 150, 220 and 300 stars, and then every
  +100.
- A child can hold at most 48 × 3 = 144 stars, because replays keep the best
  result (`totalStarCount`).
- So Toursensatie, Platinaster, Wereldlegende and everything above them are out of
  reach for every star created after the endless tour was removed.
- A Radioster at 144 will hear "Nog 6 sterren" ("6 more stars") forever.
- DIAMANTEN.md counts 225 💎 of rank bonuses; only 75 can actually be earned.
- Apart from that, the rank is invisible except at the moment of a rank-up.

**Why it matters.** A ladder a child can never finish is a broken promise. It is
also the only system that rewards replaying for 3 ★ across the whole tour.

**Recommendation.**

- Rescale the tiers so they fit inside 144, with the top rank meaning every show
  perfect. Rank, perfect worlds and replaying then become one goal.
- Update `rankSeen` silently, so children who already have many stars don't get a
  burst of rank-ups at once.

**Impact** Medium. **Effort / risk** Small (the save migration is the only care
point).

**Evidence** `= Sterrencarrière`, the career-ladder overlay.

### 5. The stage, where the child spends most of her time, feels least like a game

**Observation.** During a question:

- the background is the world map blurred by 11 px (`applyVenue`,
  `VENUE_TERUGVAL`);
- the podium is a dark ellipse;
- the most prominent thing that moves is a yellow bar that drains over 12 seconds
  inside the white question card (`startSpot`). Counting mode shows it too, to 4-
  to 6-year-olds.

The audience the game is built around exists only as a hidden number (`G.fan`; see
"FASE 1: de publieksmeter is uit het spel gehaald"). On the map every world is a
real place; on the stage it is a blur.

**Why it matters.**

- A draining bar reads as "hurry!" to a young child, even though nothing goes
  wrong when it empties. It is also the most app-like element on the play screen.
- The crowd is the natural cause and effect ("I answered, they cheered") and the
  show's personality, and the game already keeps count of it.

**Recommendation.**

- **First, a small step:** move the spotlight out of the card and onto the stage.
  The actual cone of light over the star dims slowly, instead of a bar.
- **Later, when there is art:** a silhouette crowd per world that grows with
  `G.fan` and cheers on streaks. That also gives the "Toegift" from #2 a visible
  reason.
- The question card stays plain; the art contract forbids art behind it.

**Impact** Medium–high. **Effort / risk** The spotlight is small. The crowd is
medium–large and depends on art.

**Evidence** Show screens in both tracks; `= Spel`, `50-zaal.css`.

### 6. Diamonds have no goal between visits

**Observation.**

- The 💎 count goes up with every answer, and the wardrobe is a good place to
  spend it.
- Outside the wardrobe nothing connects the two. Nowhere in the game says "now you
  can buy it".
- The numbers: about 45 💎 a show, against 78 paid items worth 4,555 💎 in total.
- After one show a child can already afford most items under 80 💎. So early on
  the choice is wide, and later the goal is out of sight.

**Why it matters.** "I'm saving for the mermaid dress" is the most natural goal a
6- to 8-year-old sets for herself. It would give each show a purpose beyond the
next stop.

**Recommendation.**

- Let the child mark one item as her wish in the wardrobe: a heart on the card.
- Its thumbnail sits in the 💎 badge on the map, inside a ring that fills up.
- The end screen shows the ring filling.
- When it is full, the end screen says "Je kunt je … kopen!" ("You can buy your …
  now!"), with a button that goes straight to it.
- No new currency, no numbers to read, one item at a time.

Removing "nog 13 ⭐ tot Clubster" was right: that was a counter nobody chose. This
is the child's own goal, and that is the difference.

**Impact** Medium–high. **Effort / risk** Medium: a profile field, the wardrobe
card, the badge and the end screen.

**Evidence** `= Kleedkamer`, `docs/DIAMANTEN.md`.

### 7. The two most-used screen changes are slow on a slow device

**Observation.** With the CPU slowed 6×:

| tap | time to the next paint (6×) | unthrottled |
|---|---|---|
| an answer | 90–145 ms | – |
| a map stop | 370–410 ms | 112 ms |
| "Verder op tournee" | 340–440 ms | 104 ms |

- The time goes to layout, not JavaScript.
- It is not the blur: switching off every `filter` and `backdrop-filter` changed
  nothing.
- The biggest single cost is a forced layout in `renderQuestion`
  (`void kaart.offsetWidth`, used to restart the `.vers` animation). It takes
  127 ms at 6×, inside the tap handler.
- `navMee` forces two smaller ones, in `enterLevel` and `kaartVertrek`.
- Eleven of these `void …offsetWidth` restarts are left in the code.

**Why it matters.** The target is an old tablet in a living room. At around 400 ms
between tap and response, a child taps again.

**Recommendation.** Apply the fix that commits 5872ba3 and 42337a7 already used
elsewhere: start `.vers` with its own animation object, or in the next frame,
instead of forcing a reflow. Do the same in `navMee`. Then measure on a real slow
device before doing anything more.

**Impact** Medium. **Effort / risk** Small.

**Evidence** Traces made for this review.

---

## Smaller things worth fixing

- **Level 49 bug.** The wardrobe's "Speel" button calls `startLevel(P().level)`.
  When every world is done, `p.level` is 49, so this starts a show labelled
  "Toverwereld 8/8" that saves `p.stars[49]`. That is the phase-4A bug again, and
  it will show up as an already-played show 1 once world 7 ships.
- **Phone in landscape.** The map zooms in to two or three stops and the header
  fades. `manifest.json` allows any orientation. Either lock the installed app to
  portrait, or give the map the desktop's upright column.
- **First run.**
  - The toast says "Jouw eerste show begint!" ("your first show starts!"), but
    nothing starts until the child taps stop 1.
  - The start screen shows "Al een back-up? …" to a child.
- **Fractions.** The rule "een kind van vijf leest geen breuk" ("a five-year-old
  doesn't read fractions") missed three places:
  - the Werelden card (⭐ 13/24);
  - trophy progress ("8 / 25 sommen");
  - the career ladder (13/30).
- **The beer microphone.** `mic_pintje` (a beer glass, with a "Schol!" easter egg)
  is a family joke. The game now runs on a public domain with visitor analytics,
  so decide on purpose whether it stays.

---

## The eight lenses, briefly

**Child experience by age.**

| age | what works | where it breaks |
|---|---|---|
| 5 | counting mode, the spoken prompts, dressing up, the map | the draining bar; in math mode, every hint is a sentence |
| 6 | first sums, the flying number, walking the map | a miss gives no picture; 1 ★ under "was geweldig!" |
| 7 | the sweet spot: reads the hints, plans outfits | "⭐ +15" confuses; from world 2 on, the same sums |
| 8 | trophies, the ladder, perfect worlds | "tot 20" is too easy after show 10 unless a parent raises it |

The tap targets are generous: answer buttons are 174 × 77 at 412 wide, and it is
always obvious what to do next. The gaps are feedback after a mistake, and reasons
to come back after about ten shows.

**Progression and economy.** It is mostly *one* system, with loose ends:

- **One chain:** stars → world done → treasure → wardrobe → star on stage.
- **A healthy second loop:** 💎 → wardrobe.
- **Loose ends:**
  - star status leads nowhere (#4);
  - "EXTRA SHOW!" is a phantom (#2);
  - earning has no goal between visits (#6).
- **Trophies** are honour only, and that is fine: the 18 are well chosen.
- **The perfect-world goal** is the replay engine, but the strict star rule
  throttles it (#2).

**Visual language.** Consistent.

- The tokens, the type scale and the gold/cyan contract hold across every screen.
- The map fills the current stop with gold. That is a documented dialect (the gold
  play button), not a slip. Keep it.
- The least coherent places:
  - the stage and the end screen: a panel on a blurred map (#5);
  - finishing a world stacks the "Wereld uit!" panel on top of the end card;
  - the trophies are flat emoji next to the drawn world treasures (D11, half
    done).
- Don't restyle anything else.

**Motion.** One correct answer fires eight channels at once:

1. sound;
2. vibration;
3. the button turning green;
4. the number flying into the sum;
5. diamonds flying to the counter;
6. a praise card with text;
7. a dance;
8. the venue brightening.

The praise card's text ("Super! 🌟", seven variants) repeats what the other seven
already say, and a young child can't read it. Keep the card for streaks, gold
questions and toegift only; those moments will stand out more.

Replace the grey slip-note (#1). Otherwise the motion review's line still holds:
no more celebrations, idle loops or per-world motion.

**Sound and haptics.** A coherent vocabulary: named cues, a retry that sounds
different from a miss, and silences that are intended. Nothing important is
missing.

- New features should reuse existing cues: a soft tap when the dot picture
  appears, and the `streak` cue for the crowd.
- The star landing on the map is still silent. It is fine to give it a cue (the
  audio review's best remaining candidate).
- Don't add music.

**Content and replay.**

- World identity is strong on the map and absent on the stage.
- After show 10 there is little variety in the questions (#3).
- The wardrobe holds about two tours' worth of diamonds. That is enough.
- Perfect worlds are the right long-term goal.

**Technical.** Solid.

- **Speed:** the one issue is #7.
- **Fragile state:**
  - the level-49 path;
  - the fifteen map-state flags in `17-kaartstand.js` are complex but documented
    — don't refactor them.
- **PWA and offline:** good. The shell is network-first with a 4-second fallback,
  and the art is cache-first.
- **Saving:**
  - robust: `.broken` sidecar, idempotent `migrate`;
  - not ready for sync: profiles are called `p1…p6`, and a restore replaces the
    whole database.

---

## A — Do next

1. **Mistakes that teach** (#1), together with the `renderQuestion` reflow from
   #7, since that function is being touched anyway.
2. **The end of a show** (#2), the rescaled star status (#4) and the level-49 fix.
3. **The spotlight as light instead of a bar** (the first half of #5).
4. **One worked example** when a new kind of question first appears (the first cut
   of #3).
5. The small fixes above.

## B — Worth planning

1. **Worlds as learning steps** (#3). This needs a teaching decision on the table
   of steps.
2. **A visible crowd and a venue per world** (#5). This depends on art.
3. **The wish item** (#6).
4. **A speed pass on a real slow device.**
5. **If syncing is ever wanted:** give profiles stable, globally unique ids and a
   per-profile `updatedAt` *now*, so a merge is possible later.

## C — Interesting, but probably don't do yet

- **Speech in math mode.** Picture scaffolds first; counting mode already serves
  children who can't read yet.
- **Music or background sound.** The synthesised sounds are coherent, and music on
  a family tablet mostly gets muted.
- **Daily streaks, chests, battle passes, energy.** No.
- **Trophies that pay diamonds, or more trophies.**
- **Stripping comments and the world studio from the shipped `index.html`.** It
  would save about 250 KB gzipped, once. That clashes with "the shipped file is
  the documentation", and the service worker caches it after the first visit
  anyway.
- **Different mechanics or maths themes per world.**
- **A parent gate.** Deleting and restoring are already behind confirmation
  dialogs, and this is a family app.
- **A mute button during play.** The device volume does that.
- **More motion.**

---

## Next three slices

### Slice 1 — Een fout wordt een hulpje (a mistake becomes help)

**What's in**

- In math mode, after the first miss, the sum as a picture of amounts under the
  card. It reuses the counting-mode renderers; up to 20 as a picture, above 20 as
  a number-line arrow.
- A picture hint instead of the sentence: the tapped number with ↑ or ↓.
- The "oh!" face: class hooks on the eyes and mouth in `avatarSVG`, plus a second
  mouth. It replaces the grey slip-note.
- The missed sum comes back at least two questions later, at most once per show.
- A ▶ instead of "tik om verder te gaan".
- The forced reflow in `renderQuestion`.

**What's out** Speech in math mode, the star rules, new kinds of question, and
counting mode (it already works).

**Why first** It happens in every show. It is the learning heart of the game. It
stays inside `submitAnswer`, `hintFor`, `buildQuestion`, `renderQuestion` and
`avatarSVG`, and it reuses renderers that are already tested.

**Impact** High, both for the child's understanding and for the fun: a mistake
turns into a moment.

**Risk** Low–medium.

- The picture must show the amounts, not give away the answer.
- `avatarSVG` draws the star everywhere, so run `npm run test:sterren`,
  `npm run test:rekenen` and `npm run shots`.

### Slice 2 — Het eindscherm klopt (the end screen adds up)

**What's in**

- One star rule for both tracks, scaled to the length of the show, with 3 ★ still
  meaning flawless.
- Stars shown as stars, one 💎 total, and a title that follows the result.
- An honest toegift: something the child can see happen, or no label at all.
- In-show trophies counted in the pill.
- `RANK_TIERS` rescaled to 144, with a silent `rankSeen` migration.
- The level-49 fix.

**What's out** A new currency, the wish item, rewards on trophies, and any new
celebration.

**Why second** It is small and stays inside the tested core (`showStars`,
`applyShowResult`, `checkRankUp`, and the `kern` suite). It also reads better once
mistakes feel fair: a wider 2 ★ band means more when a slip has taught something.

**Impact** High for "I earned something".

**Risk** Low–medium:

- More shows will end on 2 ★.
- Existing saves need a one-time rank migration.
- DIAMANTEN.md's rank income needs updating.

### Slice 3 — Elke wereld leert iets nieuws (every world teaches something new; first cut)

**What's in**

- Tie the difficulty to the world index, inside the parent's ceiling. The ramp now
  depends on the show number and stops rising at show 10; per world, it keeps
  going.
- Align `tourRound` with world borders, so a new kind of question starts at a
  world's show 1.
- A one-time "Nieuw!" worked example for each new kind of question.
- The world's step shown as an icon on the Werelden card ("10", "20", "?"), not as
  text.
- Adaptation (`perf`) and mastery gates stay, so no child gets stuck.

**What's out** Dressing up the maths per world, new modes, and new art.

**Why third** It has the biggest long-term effect on replay. But it needs a
teaching decision on the table of steps, and it touches the adaptive engine. It
lands best on top of feedback that is already fair.

**Impact** High, over weeks: each new world brings something new to do.

**Risk** Medium:

- the adaptive engine and `maths.test.js` change;
- saved games in the middle of the tour jump to their world's step, so let `perf`
  ease them in;
- "tot 20" changes meaning, from a working range to a ceiling.
