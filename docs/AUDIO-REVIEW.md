# Audio Review

*Audit of the sound that was in the app when this was written, before any custom sound
design started. It names functions and sections, not line numbers, because those drift
(see `CLAUDE.md`).*

> **Status.** §1–§6 describe the app **as it was audited**, not as it is now. The slice
> in §7 has since been built: the bus, the attack ramp, `audioWakker`, the re-trigger
> gate, the `SFX` table with `playSfx`, and the five cues (`answer.miss`,
> `celebrate.major`, `travel.arrive`, `star.land`, `tap`). `beep()` is gone; the `snd*`
> functions are now aliases onto `playSfx`. `test/kern.test.js` zaak O pins the two hard
> requirements. **Where this document and the code disagree, the code wins** — read the
> `= Geluid` section of `src/20-app.js`. §8 is still the standing list of what not to do
> yet, and the deferred cues in §6 (`travel.depart`, `world.unlock`, `reward.claim`) are
> still deferred.

---

## 1. Executive finding

**There is already an audio system, and it is already centralised.** Every sound in
Rekensterren comes out of one 30-line block — the `= Geluid` section of
`src/20-app.js` — and every sound is synthesised live with WebAudio oscillators. There
are **no audio assets in the repository at all** (`assets/` holds six world maps, one
background, two fonts and three branding images, and nothing else). Nothing is
fetched, decoded, preloaded or cached. That is a genuinely good starting position and
it should be protected, not replaced.

The problem is not architecture. The problem is **vocabulary size and semantic
overload**:

- **8 distinct cues** (7 named `snd*` functions plus one inline tone in the star
  ceremony) carry roughly **70 call sites** across every screen in the app.
- `sndWin()` is the sound for **six different events**: end of show, trophy burst,
  rank-up, world party, memory set complete, and mid-show encore. The rarest moment in
  the game (finishing a world) and the ordinary moment (finishing any show) are
  acoustically identical.
- `sndCoin()` is the sound for **seven different events**: travel arrival, world
  reveal, world finished, all-worlds-finished, memory pair, shop purchase, and the
  beer easter egg. "You arrived somewhere" and "you spent money" are the same sound.
- `sndWrong()` fires for **both misses on a question** — the forgiving first miss
  (no heart lost, retry offered) and the final miss (heart lost, answer revealed) —
  and also for "not enough diamonds" in the shop.
- `sndClick()` covers **47 call sites**, which is correct: that one is doing its job.

Against that, the **progression loop is acoustically thin in exactly the places where
it should be richest**: the travel hop along the road is silent until the coin at the
end; the star landing on the map after a show (`.net-af`) is silent; the world camera
climb is silent; losing a heart is silent; putting on an item is a click; a surprise
outfit is haptic-only with no sound at all.

**A small central sound API is justified, but only barely, and for reasons other than
"centralisation".** The dispatch layer is already there. What is missing is four
mechanics that today have nowhere to live: a shared master gain, an attack ramp, a
re-trigger gate, and an `AudioContext` resume. Those are the argument for a table +
`playSfx(name)` — not tidiness.

**Recommended next slice:** keep WebAudio synthesis, keep zero assets, add the four
mechanics inside the existing `= Geluid` section, and re-voice **five** cues that
split overloaded meanings. No new source file, no new asset, no `sw.js` change, no new
setting. Details in §7.

---

## 2. Current audio inventory

### 2.1 The two primitives

| | Where | What it does |
|---|---|---|
| `beep(freq, dur, delay, type, vol)` | `= Geluid`, `src/20-app.js` | Lazily creates one shared `AudioContext`, then per call: one `OscillatorNode` + one `GainNode`, connected straight to `actx.destination`. Gain is `setValueAtTime(vol ?? 0.18)` then `exponentialRampToValueAtTime(0.001, t + dur)`. Oscillator starts at `currentTime + delay` and stops at `+ dur`. Whole body in `try/catch`; gated on `db.sound`. Default type `sine`. |
| `buzz(pattern)` | `= Trilfeedback (haptics)`, `src/20-app.js` | `navigator.vibrate(pattern)` in `try/catch`; gated on `db.haptics`. The only place the app touches the Vibration API — `test/profiles.test.js` asserts that. |

There is **no master gain node**, **no compressor or limiter**, **no voice cap**, **no
scheduler**, and **no `actx.resume()` anywhere in the codebase** (verified: `actx`
appears on five lines total, none of them `resume`, `suspend` or `state`).

### 2.2 The cue table

All frequencies in Hz, all durations in seconds. "Ends at" is the last sample of the
last note, measured from the call.

| Cue | Notes (freq / dur / delay / wave / gain) | Ends at | Haptic |
|---|---|---|---|
| `sndClick()` | 700 / .06 / 0 / triangle / .10 | 60 ms | `buzz(8)` |
| `sndGood()` | 523 / .14 / 0 · 659 / .14 / .11 · 784 / .22 / .22 — all sine, gain .18 | 440 ms | `buzz(30)` |
| `sndWrong()` | 392 / .15 / 0 / triangle / .09 · 311 / .22 / .12 / triangle / .08 | 340 ms | `buzz(35)` |
| `sndCoin()` | 988 / .08 / 0 / square / .08 · 1319 / .18 / .08 / square / .08 | 260 ms | `buzz(15)` |
| `sndWin()` | 523 · 659 · 784 · 1047 · 784 · 1047, each .18 at `i × .14`, sine, gain .18 | 880 ms | `buzz([0,45,60,45,60,90])` |
| `sndStreak()` | 880 · 1109 · 1319 each .10 at 0/.09/.18 · 1760 / .25 / .27 — sine, gain .18 | 520 ms | `buzz([0,25,35,25,35,55])` |
| `sndTap()` | one random of 784/880/988/1047/1175, .12, triangle, gain .12 | 120 ms | `buzz(12)` |
| *(inline)* star tone | `660 + i × 170` → 660 / 830 / 1000, each .20, triangle, gain .16, fired from `renderEndStars` at 420 / 720 / 1020 ms | per star | `buzz(20)` each |

Five further haptic patterns exist with **no sound attached**:
`buzz(20)` in `celebrateTrophy` (before `sndClick`), `buzz([0,40,60,40,90])` in the
trophy burst and world party, `buzz([0,50,80,50,100])` in `rankUpCelebrate`,
`buzz([0,20,60,20])` in `bumpPintjeTaps`, `buzz(20)` in `surpriseOutfit` (**the only
event in the app that is haptic-only — no sound at all**), and `buzz(20)` in
`toggleHaptics` as its own confirmation.

### 2.3 Every trigger, by cue

**`sndClick()` — 47 sites.** The universal confirm. Screens: star picker
(`kiesSter`), bottom nav (`navGo`), entering a show (`enterLevel`), numpad digits
(`numpadPress` — one per digit), quit modal (`askQuit`, `closeQuitModal`), replay
button (`replayPrompt`), memory (`startMemory`, `flipCard`, `exitMemory`), the career
ladder (`openCareer`), locked world seal (`slotWereld`), journey screen (`openReis`,
`reisNaarWereld`, `reisTerugNaarNu`), trophies (`tapTrophy` for the *naar*, *locked*
and ordinary cases; `celebrateTrophy` on open), world-party *Doe aan* button, dressing
room (category chips, card taps, `equipShopItem`, `toggleSchatten`), end screen (all
four buttons), new-star form (`openNewStar`, all chips, `wijsOntbrekende`), settings
(tab buttons, child picker, disclosure open), gear open (`toggleGearMenu`), and
`toggleSound` itself when switching sound back on.

**`sndGood()` — 2 sites**, both in `submitAnswer`: a first-try correct answer, and a
correct answer after one miss. These are the *only* two.

**`sndStreak()` — 2 sites**, both in `submitAnswer`: golden question, and three-in-a-row
bonus.

**`sndWrong()` — 2 sites**: the single wrong-answer branch of `submitAnswer` (fires on
**both** the first and the second miss — see §4.3), and `confirmShopBuy` when the child
cannot afford an item.

**`sndCoin()` — 7 sites**: travel arrival in `runTravel`; the all-worlds-finished
branch of `runTravel`; `runWorldReveal` (a world released since last play);
`flyBadge` at 900 ms into the 1100 ms arc (world finished, icon flies to the Trofeeën
tab); `onMemMatch` (memory pair found); `confirmShopBuy` (purchase confirmed);
`bumpPintjeTaps` (beer easter egg).

**`sndWin()` — 6 sites**: `endLevel` success; `rankUpCelebrate`; `wereldFeest`;
the `celebrateTrophy` burst; `finishMemory`; and the mid-show encore branch of
`submitAnswer`.

**`sndTap()` — 2 sites**: `tapDance` in `src/10-feestjes.js` (the only sound outside
`20-app.js`), and `tapTrophy` on an already-earned trophy.

**Inline star tone — 1 site**: `renderEndStars`, once per earned star.

### 2.4 Speech (a separate system)

`speak(text, opts)` uses `SpeechSynthesisUtterance` with `nl-NL`, rate 0.85, pitch
1.15, preferring a voice whose `lang` starts with `nl`. It is gated on **three**
conditions: `db.sound`, `'speechSynthesis' in window`, and
`p.settings.track === 'count'` — speech exists **only in counting mode**, including on
shared screens like the trophy party and rank ladder, which call `speak` but stay
silent for a maths-mode child.

Every `speak()` call begins with `speechSynthesis.cancel()`, so speech is strictly
monophonic and a new prompt always cuts the previous one. `test/counting.test.js`
asserts this ("geen na-ijlende telstem van een vórige vraag").

Call sites: the counting-mode prompt (`renderCountQuestion`, `animateDelta`),
count-along (`countAlong`, one utterance per object at 620 ms intervals),
`replayPrompt` (the 🔊 button), every branch of `countMissSpeak`, `countReveal`,
memory (`startMemory`, `flipCard`, `onMemMatch`, `finishMemory`), praise on a correct
counting answer, the trophy party, the world party, and the rank ladder.

`canSpeak()` (`db.sound && hasSpeech()`) feeds `countStageTypes()`, which removes the
`listen` question type when the device cannot talk — a listen question renders only
`👂` and is unanswerable without a voice. **This is the one place where audio is load-
bearing for gameplay, and it is already handled correctly.**

### 2.5 Settings and persistence

Two app-wide booleans on `db` (**not** per profile): `db.sound` and `db.haptics`, both
defaulting to `true`, both normalised in `load()`/`migrate`, both written through
`save()` to `localStorage` under `rekenPopsterren_v1`. Toggled from the gear menu
(`toggleSound`, `toggleHaptics`), which repaints label, icon and `aria-checked` via
`renderGearMenu`. The *Trillen* row hides itself when `'vibrate' in navigator` is
false. `toggleSound` calls `cancelSpeech()` when switching off and `sndClick()` when
switching on. `?debug&demo` forces both to `false`.

There is **no volume control**, **no separate speech/effects split**, and **no
per-world or per-screen audio state**.

`test/ouder.test.js` §A covers: default on, toggle flips `db.sound` + text +
`aria-checked`, sound and haptics are independent, and the choice survives a restart.
`test/ouder.test.js` also asserts `"sound": false` appears in the exported save file.

---

## 3. Current architecture

### 3.1 It is already centralised — genuinely

```
buzz(pattern) ──┐
                ├── sndClick / sndGood / sndWrong / sndCoin / sndWin / sndStreak / sndTap
beep(f,d,t,w,v)─┘        │
                         └── ~70 call sites, all of which call a named cue
```

Two exceptions to "all call sites use a named cue":

1. `renderEndStars` calls `beep()` **directly** with a computed frequency
   (`660 + i × 170`). This is the only raw `beep()` in feature code and the only
   pitched sequence in the app. It is also, arguably, the best sound in the game.
2. `src/10-feestjes.js` calls `sndTap()`. Because the build concatenates `src/` by
   filename order and `10-feestjes.js` sorts **before** `20-app.js`, this works only
   because `sndTap` is a hoisted `function` declaration and is never invoked at load
   time. (`sndClick` is a `const` arrow and would *not* survive being called from
   `10-feestjes.js` at startup — see `CLAUDE.md` rule 0.)

### 3.2 Duplication and coupling

- **No duplication of the synth.** There is exactly one oscillator factory. This is
  unusual and good — compare `docs/MOTION-REVIEW.md` §3.3, which found *four* particle
  implementations for one idea.
- **Sound and haptics are hard-coupled inside each cue.** `buzz()` is called from
  within the `snd*` bodies, never alongside them. Consequences: (a) the two toggles
  stay correctly independent, which is what `test/ouder.test.js` checks; but (b) a
  moment cannot have a haptic without the matching sound or vice versa — except where
  feature code calls `buzz()` separately, which is exactly what the five orphan
  patterns in §2.2 are working around. `runTravel` carries a five-line comment
  explaining that the arrival tick "is er, en hij zit in `sndCoin`" — the coupling is
  load-bearing enough to need documenting.
- **Meaning is coupled to the caller, not the cue.** `sndCoin` means seven things;
  which one you are hearing is decided at the call site. That is the overload in §1.
- **No coupling to screen state.** No cue knows which screen is active, whether a
  transition is running, or whether speech is in flight. `cancelSpeech()` is called
  from `quitGame`; **nothing ever cancels a scheduled beep.**

### 3.3 Would a small central sound API materially simplify this?

**Not for simplification — there is almost nothing to simplify.** Replacing seven
one-line functions with a table and a `playSfx(name)` dispatcher moves roughly the same
number of lines around and changes 70 call sites for no behavioural gain. On its own
that is churn, and `CLAUDE.md` is explicit that the comment layer around this code is
the documentation.

**Yes for four specific mechanics that currently have nowhere to live:**

1. A **shared master `GainNode`** — needed the moment more than one cue can sound at
   once (§5.4), and the only place a global trim or a future volume setting could
   attach.
2. An **attack ramp** — `setValueAtTime` at full gain produces an onset transient on
   every one of the ~70 call sites (§5.7). One ramp in one place fixes all of them.
3. A **per-cue re-trigger gate** — nothing debounces anything today (§5.5).
4. **`actx.resume()`** plus a `visibilitychange` hook (§5.1, §5.8).

Each of those is a property of *the bus*, not of a cue. A table keyed by semantic name
is then the cheap way to express them once. **That, and only that, is the argument for
the API.** It should be about 40 lines inside the existing `= Geluid` section — not a
new source file, because a new file changes the concatenation order and `CLAUDE.md`
rule 0 makes that a browser-only failure mode that `npm run check` cannot see.

---

## 4. UX findings

### 4.1 Classification of what exists

| Purpose | Cue | Verdict |
|---|---|---|
| Interaction feedback | `sndClick` (47 sites) | **Keep.** Short, quiet, consistent everywhere. The best-designed sound in the app. |
| Interaction feedback (playful) | `sndTap` (avatar tap, earned trophy) | **Keep.** Random pitch makes repeated tapping feel alive rather than nagging. |
| Correct answer | `sndGood` | **Keep, re-voice.** A rising major triad is right; the sine voice is thin on a tablet speaker. |
| Wrong answer | `sndWrong` | **Keep the intent, split the meaning.** The comment above it records a deliberate redesign away from a game-show buzzer, and that judgement was correct. But see §4.3. |
| Progression (streak) | `sndStreak` | **Keep.** Distinct, earned, rare enough not to wear out. |
| Progression (star landing) | inline tone in `renderEndStars` | **Promote.** Three rising tones locked to three landing stars is the single clearest piece of sound design in the app, and it is the only cue not in the vocabulary. |
| Reward / economy | `sndCoin` | **Split.** Seven meanings (§2.3). |
| Celebration | `sndWin` | **Split.** Six meanings (§2.3), covering both the most common and the rarest moments. |
| Character / personality | — | **Absent.** Nothing the star herself does makes a sound; `tapDance` uses the generic tap. |
| Navigation / travel | — | **Absent.** The journey has no departure sound; arrival borrows the coin. |

### 4.2 The main progression loop, moment by moment

This is where the audit matters most. Tracing one successful show end-to-end:

| # | Moment | Sound today | Reading |
|---|---|---|---|
| 1 | Tap a stop on the map (`enterLevel`) | `sndClick` | ✅ correct |
| 2 | Question appears | *silence* | ✅ correct — the show should not chirp at you |
| 3 | Correct answer (`submitAnswer`) | `sndGood` + `zaalJuicht` glow | ✅ correct |
| 4 | Golden question / 3-in-a-row | `sndStreak` + confetti | ✅ correct |
| 5 | Encore (100 % audience) | `sndWin` **(= end-of-show fanfare)** | ❌ the biggest in-show moment pre-plays the end-of-show sound |
| 6 | First miss (retry offered, no heart lost) | `sndWrong` | ⚠️ see §4.3 |
| 7 | Second miss (heart lost, answer shown) | `sndWrong` again, then `loseHeart()` | ❌ **losing a life is silent**; the two misses are acoustically identical |
| 8 | Show ends, success (`endLevel`) | `sndWin` + `confetti(40)` | ⚠️ correct in itself, but see 10–12 |
| 9 | Stars land (`renderEndStars`) | 660 / 830 / 1000 at 420 / 720 / 1020 ms | ✅ **the best moment in the app** — but it plays *on top of* `sndWin`, which is still sounding until 880 ms |
| 10 | Rank-up (`rankUpCelebrate`, at `naSterren()` ≈ 1580 ms) | `sndWin` **again** | ❌ identical to 8 |
| 11 | World party (`wereldFeest`, chained ≈ 320 ms after 10 closes) | `sndWin` **a third time** | ❌ identical to 8 and 10 |
| 12 | Back to the map (`goMap`) | `sndClick` | ✅ correct |
| 13 | Star tab drops in, three stars land (`.net-af`) | *silence* | ❌ a visual ceremony (C10 in `docs/MOTION-REVIEW.md`) with no sound, while its twin at 9 has the best sound |
| 14 | Star walks the road (`runTravel`, 1400 ms) | *silence*, sparkle every 280 ms | ❌ the longest single animation in the progression loop is silent |
| 15 | Arrival at the next stop | `sndCoin` + `confetti(14)` + praise | ❌ "you arrived" uses the "you spent money" sound |
| 16 | World border crossed (`runWorldChange`) | `flyBadge` → `sndCoin` at 900 ms; camera climb **silent**; then `sndCoin` again at `vier()` | ❌ the coin twice, ~3 s apart, for two different things, around a silent climb |
| 17 | New world revealed (`runWorldReveal`) | `sndCoin` | ❌ unlocking a world sounds like buying a hat |
| 18 | All worlds finished (once per save) | `sndCoin` + `confetti(26)` | ❌ the single rarest event in the game has the shop sound |

**In one sentence: the loop's two acoustic peaks (8 and 9) land on top of each other,
and everything after them either repeats one of eight sounds or is silent.**

### 4.3 The two-miss problem

`submitAnswer` has one wrong-answer branch. It fires `sndWrong()` unconditionally, then
splits: if `!G.retried`, the child keeps their heart and gets a hint; otherwise a heart
is lost, the answer is revealed, and `loseHeart()` runs (a 💔 plus a shake, no sound).

So a forgiving "not that one, try again" and a final "that cost you a life, here is the
answer" are **the same 340 ms sound**. The comment above `sndWrong` shows real care was
spent making the cue gentle; the cost of that care is that the consequential miss now
has no weight at all. This is the single most valuable split in the whole audit, and it
needs one new cue, not a framework.

### 4.4 Useful sounds worth keeping as-is

- `sndClick` and `sndTap`. Both short, both quiet, both used consistently.
- The `renderEndStars` tone sequence, pitch-locked to the landing animation.
- `sndStreak`. The only cue whose rarity matches its brightness.
- The **absence** of sound on `zaalJuicht`, `slipNote`, `showPraise`, `confetti`,
  `flyDiamonds`, `koopVonken`, `claimShimmer`, `tapRipple` and every screen
  transition. These are deliberate (`zaalJuicht` carries a comment saying so) and they
  are why the app is not exhausting. **Do not fill these.**

### 4.5 Weak, default-feeling or misapplied sounds

- **`sndCoin`'s square wave at 988/1319 Hz** is the most "8-bit default" sound in the
  app and it carries the most meanings. It is the first candidate for re-voicing.
- **`sndWrong`'s second note at 311 Hz.** Small tablet and phone speakers roll off
  steeply below ~500 Hz; on the target device (an old tablet in a living room) that
  note is largely inaudible, so the cue degrades to a single 392 Hz blip. The gentleness
  was designed for headphones the audience does not have.
- **`sndWin` at six sites.** Not weak in itself — overused to the point of meaning
  nothing more than "something good happened".
- **`surpriseOutfit`** fires `buzz(20)` and no sound at all. Either it is a moment or
  it is not; right now it is half of one.

### 4.6 Unnecessary sounds

- **`numpadPress` clicks per digit.** Typing `1`, `0`, `0` plays three clicks in under
  a second on an event that is not yet an answer. Defensible, but it is the densest
  sound in the app and the first place a re-trigger gate will be felt.
- **`sndClick` in `celebrateTrophy`** immediately before `buzz(20)` and ~480 ms before
  `sndWin()`. Three audio/haptic events for one "open the trophy" gesture.
- **`sndClick` on `ontoggle` of disclosure widgets** in the settings and new-star
  screens. Harmless, but these are parent-facing surfaces.

### 4.7 Important moments with no audio

Ranked by value:

1. **Losing a heart** (`loseHeart`) — the only real consequence in the game.
2. **Travel departure** (`runTravel`, start of the 1400 ms walk) — the longest
   animation in the progression loop.
3. **Star landing on the map** (`.net-af`) — a designed three-beat ceremony, silent.
4. **World camera climb** (`runWorldChange` / `wereldCamera`) — ~3.3 s of deliberate
   movement with a coin at each end and nothing between.
5. **Equipping an item** (`equipShopItem`) — currently a generic click; this is the
   payoff for the entire diamond economy.
6. **Show start** (`startLevel`) — the curtain going up gets the same click as a
   settings tab.

### 4.8 Where adding audio would be noise, not value

- Screen transitions (`show()`, `navGo` beyond the existing click), `vraagIn`,
  `kaartZegtHallo`. These are constant; a sound on each would be a metronome.
- Every particle system. `confetti`, `confettiBurst`, `sparkle`, `koopVonken`,
  `flyDiamonds` already ride on top of a cue; giving them their own would double every
  celebration.
- `zaalJuicht` — explicitly documented as "geen tweede confetti, geen extra geluid".
- The parent area (`openSettings`, statistics, the child picker), beyond the click that
  is already there.
- Ambient loops or background music of any kind. See §8.
- The counting-mode question card. Speech *is* the instruction there; an effect under
  it competes with the one sound that carries meaning.

---

## 5. Technical findings

### 5.1 Autoplay / first interaction

**Currently safe, by accident rather than design.** `actx` is created lazily inside
`beep()`, and the first `beep()` in any session is reachable only through a tap
(`kiesSter` on the star picker, or `navGo`/`enterLevel` afterwards) — those handlers
call `sndClick()` synchronously, so the context is constructed inside a user gesture
and starts in the `running` state.

**The gap:** there is no `actx.resume()` anywhere. If the context ever enters
`suspended` or (on iOS) `interrupted` — after a backgrounded PWA, an incoming call, or
a Chrome autoplay-policy suspension — every later `beep()` will schedule its oscillator
against a stopped clock, produce no sound, and **throw nothing**. `db.sound` still reads
`true`, the gear menu still says *Aan*, and the app is silently mute until reload. This
is the highest-severity technical finding and it costs three lines.

### 5.2 PWA and offline

No exposure today: nothing audio is fetched, so `sw.js` has nothing to cache and the
game is fully audible offline on first run.

**Forward-looking:** `sw.js` routes anything under `/assets/` into `ART_CACHE`
(cache-first, name deliberately pinned so a text release does not re-download megabytes).
If a future slice adds audio files under `assets/`, they inherit cache-first semantics
and **`ART_CACHE` must be bumped** — exactly the rule `CLAUDE.md` states for drawings.
A slice that stays on oscillators avoids this entirely.

### 5.3 Asset loading, preloading, replay latency

Not applicable, and that is the point. Synthesis means **zero bytes, zero requests,
zero decode, zero first-play latency, and identical behaviour on the first and
thousandth trigger** — which is precisely what "must work on an old tablet in a living
room with no net" asks for. `preloadArt` deals only with world drawings.

### 5.4 Simultaneous sounds

Unbounded. Every `beep()` creates a fresh oscillator wired directly to `destination`;
nothing counts voices and nothing sums into a controlled bus. Concrete worst case, at
the end of a flawless final show of a world:

- `t = 0` `sndWin()` — six sine notes running to 880 ms
- `t = 420 / 720 / 1020 ms` — three triangle star tones, 200 ms each, gain .16
- overlap at 420 ms and 720 ms: **two voices at .18 + .16 = .34 linear**
- `t ≈ 1580 ms` `rankUpCelebrate` → `sndWin()` again
- `t ≈ 2520 ms` `wereldFeest` → `sndWin()` a third time

Peak is about a third of full scale, so hard clipping is unlikely — but there is no
headroom management, no ducking, and no way to introduce either without a master node.
`docs/MOTION-REVIEW.md` §3.2 found the same stacking in the particle layer ("five
separate particle systems, ≈140 animated nodes across ~12 seconds"); **the audio layer
has the same defect and one fewer place to fix it.**

### 5.5 Rapid repeated taps

Nothing is debounced. Reachable today:

- `numpadPress` — one `sndClick` per digit.
- `flipCard` in memory — `sndClick` plus a `speak()` per card, and `speak()` cancels the
  previous utterance, so fast flipping produces clicks over a stuttering voice.
- Dressing-room cards, category chips, journey stops — each tap a click.
- `kiesSter` and `enterLevel` are protected, but by **gameplay locks** (`kiesBezig`,
  `overgangBezig`) that happen to sit before the sound, not by any audio gate.

### 5.6 Screen transitions while sound is playing

`beep()` schedules on the audio clock and is **uncancellable**. A `sndWin()` started by
`endLevel` continues through a `show('screen-map')` and, in principle, past a quit.
`quitGame` calls `cancelSpeech()` — speech has a stop, effects do not.

### 5.7 Envelope artefact

`g.gain.setValueAtTime(vol, t)` steps the gain instantly from 0 to full at note onset.
Every note in the app therefore begins with a discontinuity — audible as a faint click,
worst on the shortest and quietest cue (`sndClick`, 60 ms) and most noticeable on cheap
speakers, i.e. the target hardware. A 5–8 ms `linearRampToValueAtTime` attack removes it
everywhere at once. The release is fine: the exponential ramp reaches .001 (−60 dB)
before `o.stop()`.

### 5.8 Lifecycle, background and foreground

`keepAwake()` already listens on `visibilitychange` and `pointerdown` for the Wake Lock.
Audio has no equivalent. A returning PWA has a live wake lock and a possibly dead audio
context. The hook is already there to piggy-back on.

### 5.9 Phone and tablet speaker suitability

- **311 Hz** (`sndWrong`, second note) sits below the usable band of most tablet
  speakers — see §4.5.
- **1760 Hz** (`sndStreak`, last note) at gain .18 is the brightest thing in the app and
  the most likely to feel shrill at close range on a hard-walled living-room tablet.
- Sine waves carry poorly on small drivers; the triangle-voiced cues (`sndClick`,
  `sndTap`, `sndWrong`, star tones) read better at low volume than the sine-voiced ones
  (`sndGood`, `sndWin`).
- **On iPhone, WebAudio is muted by the hardware silent switch.** A parent with the
  ringer off hears nothing while the app insists sound is *Aan*. Worth knowing; not
  worth building around.

### 5.10 Mute and settings reachability

`db.sound` / `db.haptics` persist correctly and are covered by tests (§2.5). But
`show()` sets `$('corner-btns').style.display = onProfile ? 'flex' : 'none'` — **the
gear button, and therefore the only mute control, exists on the star-picker screen
only.** To silence the app mid-show a parent must quit to the star picker. On a device
whose hardware volume keys may be locked out, that is a real friction point, and it
belongs in the audio audit even though it is a navigation decision.

### 5.11 Test surface

- `test/app.js` makes `AudioContext` **throw** (`'geen geluid in de tests'`), so every
  Node suite exercises the `try/catch` in `beep()` on every call. Any rework must keep
  `beep()` (or its successor) total — a throw that escapes would take down all four
  `npm run check` suites. `speechSynthesis` is stubbed with a no-op `speak`/`cancel`.
- `test/counting.test.js` captures `window.__spoken` and asserts per stage and rung that
  something meaningful is spoken, that listen questions speak a number, that count words
  use "één" not "een", and that no stale utterance survives a question change.
- `test/ouder.test.js` §A covers both toggles end-to-end in a real browser.
- `test/profiles.test.js` asserts `buzz()` is the sole `navigator.vibrate` caller and
  that it reads `db.haptics` and device support.
- **Nothing asserts anything about effect sounds.** A re-voicing slice starts with no
  regression net on the cues themselves, which is an argument for keeping the first
  slice small and verifying on hardware.

---

## 6. Proposed sound vocabulary

Derived from the events this game actually has. **13 cues.** Semantic names, reusable
across screens — no screen-specific sounds. Names are suggestions; the split is the
point.

| # | Semantic event | Where it fires | UX purpose | Priority | Today |
|---|---|---|---|---|---|
| 1 | `tap` | every button, nav, chip, numpad digit, modal | interaction feedback | **high** | `sndClick` — keep, add attack ramp |
| 2 | `answer.correct` | `submitAnswer`, correct branch | correct feedback | **high** | `sndGood` — keep, re-voice |
| 3 | `answer.retry` | `submitAnswer`, **first** miss | gentle "not that one" | **high** | `sndWrong` — keep, lift the 311 Hz note |
| 4 | `answer.miss` | `submitAnswer`, **second** miss + `loseHeart` | consequence, a life gone | **high** | **none** (identical to 3) |
| 5 | `star.land` | `renderEndStars`, once per star, pitched by index | the result ceremony | **high** | inline `beep` — promote into the table |
| 6 | `show.complete` | `endLevel` success | show finished | **high** | `sndWin` — keep here, and **only** here |
| 7 | `celebrate.major` | `rankUpCelebrate`, `wereldFeest`, all-worlds-finished | the rare peaks | **high** | `sndWin` — must differ from 6 |
| 8 | `diamond` | `confirmShopBuy`, `onMemMatch`, fan bonus | economy: earned or spent | **medium** | `sndCoin` — keep here, re-voice off the square wave |
| 9 | `travel.arrive` | `runTravel` arrival, `runWorldChange` `vier()` | you got somewhere | **medium** | `sndCoin` — must differ from 8 |
| 10 | `travel.depart` | `runTravel`, start of the walk | the hop has begun | **medium** | **none** (silent) |
| 11 | `world.unlock` | `runWorldReveal`, world camera climb arrival | a place opened up | **medium** | `sndCoin` |
| 12 | `reward.claim` | `celebrateTrophy` burst, world-party *Doe aan*, `equipShopItem` | this is now yours | **medium** | `sndWin` / `sndClick` |
| 13 | `streak` | golden question, 3-in-a-row, encore | in-show momentum | **optional** | `sndStreak` — keep; move encore off `sndWin` onto this |

Deliberately **not** in the vocabulary: screen-transition sounds, per-world palettes, a
character voice, question-appear, particle sounds, ambient beds, memory-specific cues
(memory reuses 2/8/6), and a separate dressing-room family (reuses 1/8/12).

`sndTap`'s random-pitch behaviour should survive as a *variation* flag on `tap` when
fired from `tapDance`, not as a fourteenth entry.

---

## 7. Recommended next implementation slice

**Minimal audio foundation + 5 prototype cues.** The audit justifies this: the
foundation is four mechanics that have nowhere to live today (§3.3), and the five cues
are the splits that fix the progression loop's two worst collisions (§4.2, §4.3).

### 7.1 What should change

**A. The bus** — inside the existing `= Geluid` section of `src/20-app.js`, no new file:

1. One shared master `GainNode` between every oscillator and `destination`.
2. A 5–8 ms `linearRampToValueAtTime` attack in the note helper (§5.7).
3. `resumeAudio()` — call `actx.resume()` when `actx.state !== 'running'`, invoked from
   the existing `pointerdown` and `visibilitychange` listeners that `keepAwake()`
   already owns (§5.1, §5.8).
4. A per-cue re-trigger gate: ignore the same semantic name within ~60 ms (§5.5).

**B. A `SFX` table** keyed by semantic name, holding note lists, and a
`playSfx(name, opts)` dispatcher. Keep the `snd*` functions as thin aliases so the ~70
existing call sites keep working and the diff stays reviewable. Declare the table as a
`const` **inside `20-app.js`** — not a new `src/` file — so the concatenation order in
`CLAUDE.md` rule 0 is untouched.

**C. Five prototype cues**, in priority order:

1. **`answer.miss`** — new, fired at `loseHeart` on the second miss. `answer.retry`
   keeps the current gentle cue with its 311 Hz note raised into the speaker's band.
   *Biggest single UX gain in the audit.*
2. **`celebrate.major`** — new, distinct from `show.complete`. Point
   `rankUpCelebrate`, `wereldFeest` and the all-worlds branch at it. *Removes the
   triple-`sndWin`.*
3. **`travel.arrive`** — new, distinct from `diamond`. Point `runTravel` arrival and
   `runWorldChange`'s `vier()` at it, leaving `sndCoin` to mean money only.
4. **`star.land`** — move `renderEndStars`' inline `beep` into the table unchanged in
   pitch, and **trim `show.complete` so it has finished before the first star lands at
   420 ms** (currently it runs to 880 ms). *The one timing change in this slice.*
5. **`tap`** — same pitch and length, now through the ramped bus. Fixes the onset click
   on all 47 sites for free and is the best single test of the foundation.

### 7.2 What should explicitly NOT change

- **No audio assets.** Stay on oscillators. No `fetch`, no decode, no `assets/` entry,
  no `ART_CACHE` bump, no change to `sw.js`.
- **No change to `speak()`** or any speech call site. Counting mode is the one place
  where audio is load-bearing and it already works.
- **No change to `buzz()`, to any haptic pattern, or to the sound/haptic coupling.**
  `test/profiles.test.js` and `test/ouder.test.js` pin this behaviour.
- **No change to `db.sound` / `db.haptics` semantics**, no new setting, no volume
  slider, no speech/effects split, and no move of the gear button (§5.10 is real but it
  is a navigation decision for its own slice).
- **No new `src/` file** and no reordering of the existing ones.
- **No sound added to** `zaalJuicht`, `slipNote`, `showPraise`, any particle function,
  any screen transition, or the question-appear animation.
- **No ducking engine, no audio sprites, no preloader, no third-party library.**
- **No `index.html` hand-edits** — everything goes through `src/` + `npm run bouw`.

### 7.3 Acceptance criteria

1. `npm run check` stays at **1186/1186**, including `inhoud.test.js` zaak H (built
   blocks match `src/`).
2. `npm run test:ouder` passes unchanged — both toggles, independence, persistence.
3. `npm run test:tellen` passes unchanged — no speech behaviour moved.
4. `npm run test:sterren` passes unchanged — `buzz()` is still the only
   `navigator.vibrate` caller, and the start screen still builds in a real browser.
5. `playSfx()` is **total**: with `AudioContext` throwing (as `test/app.js` forces), no
   exception escapes. This is a hard requirement — an escaping throw takes down all
   four `check` suites.
6. Exactly one `<script>` and one `</script>` in the built `index.html`, in code and in
   prose (`CLAUDE.md` rule 1).
7. With `db.sound === false`, `playSfx()` creates no `AudioContext` and no nodes.
8. `show.complete` has fully decayed before `star.land` #1 at 420 ms.
9. `rankUpCelebrate` and `wereldFeest` no longer play the same cue as `endLevel`.
10. No more than **two** simultaneous voices in the worst-case end-of-show timeline.

### 7.4 Likely files and areas affected

| File | Change |
|---|---|
| `src/20-app.js`, `= Geluid` | the bus, the `SFX` table, `playSfx`, `resumeAudio`; `snd*` become aliases |
| `src/20-app.js`, `= Trilfeedback` | **untouched** |
| `src/20-app.js`, `submitAnswer` / `loseHeart` | the retry/miss split |
| `src/20-app.js`, `renderEndStars` | inline `beep` → `playSfx('star.land', {i})` |
| `src/20-app.js`, `endLevel` | `show.complete`, shortened |
| `src/20-app.js`, `rankUpCelebrate`, `wereldFeest`, `runTravel` all-worlds branch | `celebrate.major` |
| `src/20-app.js`, `runTravel`, `runWorldChange` | `travel.arrive` |
| `src/20-app.js`, `keepAwake` listeners | add `resumeAudio` |
| `index.html` | regenerated by `npm run bouw` only — never edited by hand |
| `docs/TESTEN.md` | one line if a test is added |

`src/10-feestjes.js` needs no change: `sndTap` stays a hoisted `function`. If `tap` ever
becomes a `const`, `10-feestjes.js` sorts *before* `20-app.js` and this breaks — a
browser-only failure `npm run check` cannot see (`CLAUDE.md` rule 0).

### 7.5 Real-device checks required

Headless tests cannot hear anything; every item below needs ears on hardware.

1. **Old Android tablet, living-room volume** — the target device. Is 311 Hz (or its
   replacement) audible? Is 1760 Hz shrill at arm's length?
2. **iPhone / iPad with the silent switch on** — confirm the app degrades quietly and
   nothing appears broken (§5.9).
3. **Background → foreground, installed PWA** — lock the screen mid-show, return, tap.
   Sound must come back. This is the `resume()` test and it is the whole point of the
   foundation.
4. **Incoming call or another app taking audio focus**, then return.
5. **Flawless final show of a world with a rank-up** — the full 8→11 stack from §4.2.
   Listen for collisions, not for correctness.
6. **Counting mode, fast play** — speech plus effects; confirm no stutter and no
   swamping of the spoken prompt.
7. **Rapid numpad entry** and **fast memory flipping** — the re-trigger gate.
8. **`?debug&demo`** — both flags off, app must be fully silent.
9. **Offline / airplane mode after install** — unchanged, but worth confirming once
   that no audio path introduced a request.
10. **Mute mid-show**, then unmute — confirm nothing scheduled keeps sounding after the
    toggle, and that the toggle's own `sndClick` returns.

---

## 8. Things explicitly not worth doing yet

| Not yet | Why |
|---|---|
| **Recorded or sampled audio assets** | Would add the first non-drawing asset class, pull `ART_CACHE` into the release cycle, introduce decode latency and a first-play gap, and cost bytes on a device chosen for having none. Oscillators have zero of those costs. Revisit only if synthesis is proven insufficient *after* the vocabulary is right. |
| **Background music or ambient beds** | The app is played in a living room, often next to other people, and sessions are short. Nothing in the audit suggests the app feels empty between cues; it suggests the cues are indistinct. |
| **Per-world sound palettes** | Six worlds × even three cues is eighteen sounds before the core thirteen are right. `zaalJuicht` carries the counter-argument in a comment: "een goed antwoord hoort overal hetzelfde te voelen." |
| **A volume slider** | No evidence of need; the device has hardware volume, and a slider is a third state in a settings surface deliberately kept to two rows. A master gain (§7.1) is where one would attach *if* it is ever wanted. |
| **Separate speech / effects toggles** | Today "sound off" correctly means silent, and `canSpeak()` already swaps out unanswerable listen questions. Splitting the switch creates a state where a counting-mode child has effects but no instructions. |
| **Audio sprites, a loader, a preload manifest** | All are solutions to asset problems this app does not have. |
| **A ducking / priority engine** | Two voices is the realistic worst case once §7.1 lands. Ordering the cues in time is cheaper and more legible than arbitrating them at runtime. |
| **A third-party audio library** | `CLAUDE.md`: "geen framework, geen bundler, geen TypeScript, geen bibliotheek." The whole synth is 12 lines. |
| **Moving the gear button off the star picker (§5.10)** | Real, but a navigation change with its own test surface (`show()`, `syncBackGuard`, `test/ouder.test.js`). It should not ride along inside an audio slice. |
| **Sound on the map arrival, travel departure, world climb, equip (§4.7 items 2–6)** | All genuinely missing, all worth doing — but *after* the five splits in §7.1 prove the foundation on hardware. Adding new moments and re-voicing old ones in one slice makes it impossible to tell which change helped. |
| **Tests that assert effect sounds** | `AudioContext` throws by design in the Node suites, and headless Chromium has no output. A test could only assert that `playSfx` was called with a name — worth it once the vocabulary has stopped moving, not before. |
