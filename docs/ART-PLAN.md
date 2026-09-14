# Reken Popsterren — art plan (working doc)

The short version. Rationale, alternatives considered and measurements live in
`ART-DIRECTION.md`; you should not need to read it to use this.

Reference for the target look: the game-screen mockup (venue full-bleed, avatar standing
in a light pool, no panel behind her).

---

## 1. Style

**Simple structure, rich light.** Build each scene from 5–8 big rounded shapes, then let
the lighting carry the richness. Detail belongs in the light, not in the objects.

**Constant** — this is what makes the set a set:

- **The light.** Warm amber, low, coming from the stage toward the viewer.
- **The gradient of energy.** Bright and alive along the top, deep and quiet along the
  bottom. That is simply how a lit stage looks, and it hands us the legibility for free.
- **Soft painted gradients.** No outlines, no photoreal, no 3D, no visible texture.
- **Crowd:** flat silhouettes, rounded heads, no faces, no detail.
- **Never any text**, letters, numbers, signage or logos.
- Gold and cyan belong to the UI. Artwork may carry amber *light*, never gold *objects*.

**Variable** — this is what keeps a dozen scenes from looking like one room:

- **The room's hue.** Club deep violet, theatre warm aubergine, stadium midnight blue.
  Same lighting logic, different room. Locking every image to one aubergine would make
  arriving at the stadium feel like nothing happened — and would sit oddly beside the
  twelve bright podiums the game already sells (Strandfeest, Winterwonderland,
  Regenboogland).

The feeling to aim for is **the second before the music starts**. Not calm, not noisy:
something is about to happen. Put that in the top third, where nothing competes with it
— two or three soft beams crossing the air, a little drifting sparkle. It costs no
legibility, because everything below is reserved anyway.

Three checks before accepting anything:

1. **At 180 px wide, is it still good?** If it falls apart, it is too detailed.
2. **Is the bottom half quiet enough to read a sum on?**
3. **Would a six-year-old want to be in there?** Merely tasteful is a fail.

---

## 2. Assets to generate

Only these. Everything else in the app stays CSS or emoji for now.

| # | Asset | Request | Crop to | Deliver | When |
|---|---|---|---|---|---|
| 1 | `venue-theater` | 1536×1024 | 1536×896 | 1200×700 WebP | ✅ done |
| 2 | `landing` | 1024×1536 | — | 1024×1536 WebP | **next** |
| 3 | `map-horizon` | 1536×1024 | bottom 1536×576 | 1536×576 WebP | after 2 |
| ~~4~~ | ~~`map-sky`~~ | — | — | — | **dropped, see below** |
| 5 | `venue-club` | 1536×1024 | 1536×896 | 1200×700 WebP | with 6 |
| 6 | `venue-stadium` | 1536×1024 | 1536×896 | 1200×700 WebP | with 5 |
| 7 | `finale` | 1024×1536 | — | 1024×1536 WebP | with 5+6 |
| 8 | `cities` ×12 | 1024×1536 sheet | — | traced to one SVG | later |

**Why the landing screen jumped the queue.** It is the most-seen screen in the game and
the one with the most empty room: measured at 390×844, its title, question, cards and
button occupy 25–73%, leaving the top and bottom quarters completely free. The horizon
was going to cover it, but the horizon puts its art in the **bottom 55%** — the opposite
layout — so it would have painted through the cards and left the free top quarter empty.
If only two images are ever added to this game, they should be the theatre and this one.

Delivery sizes were corrected so that **nothing is ever upscaled**: the earlier table
asked for a 1600×600 horizon and a 1080×1920 finale, both larger than anything
`gpt-image-1` returns. Enlarging a generated image to meet a spec adds bytes and
softness and buys nothing.

Budget: **≤ 120 KB per image**, ≤ 400 KB for 2+3 together.

**`map-sky` is dropped.** Rendered side by side, the map with and without a cloud layer
is indistinguishable. Made strong enough to see, the clouds read as brown smudges on the
violet instead of as sky — because alpha compositing *darkens*, while the original spec
("dusty violet") was written for a screen blend that turned out not to work at all. It
was also the most fragile asset in the set: black background, alpha baking, parallax
slack, tiling. Most machinery, least return.

What the upper half actually wanted was **light, not objects** — the style doc's own rule.
`scene.js` now paints a soft warm haze rising off the horizon into the violet: one
gradient, no image, and it does visibly more than the cloud plate did. The seven drifting
`☁️`/`✈️` emoji stay where they are and keep providing the motion for free.

**The horizon must tile left-to-right.** They now drift with the map as it scrolls —
the horizon at 18 %, the sky at 6 % — and repeat, so there is no edge to run out of at
any scroll distance. This asks nothing extra of you: the safe-zone rule already keeps the
outer 12 % of each image empty, and empty edges are exactly what makes a repeat
invisible. Details in `ART-DIRECTION.md` Brief 3.

---

## 3. Generating with an OpenAI model

> **Copy the prompts from `docs/beeldpakket.html`** (published at
> <https://claude.ai/code/artifact/b57f5563-20c9-4f4a-809d-198593ecef53>). Every asset
> there carries one self-contained prompt — style, scene and exclusions in a single
> block with a copy button — plus its sizes and the checks to run afterwards. The prose
> below explains *why* the prompts are shaped that way; you do not need it to use them.

Practical differences from other tools:

- **No aspect-ratio flag.** You choose `size`. `gpt-image-1` supports `1024x1024`,
  `1536x1024` (landscape) and `1024x1536` (portrait). Pick from the table above.
- **No negative-prompt field.** Exclusions go in the prose, as a final sentence. It
  follows them reasonably well — better than most.
- **It drifts toward adding text.** Say "no text, no letters, no signage, no logos"
  explicitly, and check every output for it.
- **It follows long, specific prose well.** Describe the shapes you want, in order.
- Generate **3–4 per asset**, pick one, then crop / resize / encode to WebP.

### Prompt shape

Same three blocks every time, so the set stays consistent:

```
STYLE — Children's game illustration, simple 2D shapes with soft painted gradients.
Big rounded forms, few of them. A <ROOM HUE> room lit by warm amber stage light from
below, soft glow around the lights. Bright and alive along the top of the frame, deep
and quiet along the bottom. The excited moment just before the music starts. Clearly
illustrated, not photorealistic, not 3D, no outlines.

SCENE — <the 5–8 shapes, named in order, and nothing else>. Then, in the upper
third only: <two or three soft light beams, a little drifting sparkle>.

RULES — Keep the lower half of the image dark, smooth and almost empty. No text,
no letters, no numbers, no signage, no logos, no watermarks. No faces. No gold
objects. No people other than featureless crowd silhouettes.
```

`<ROOM HUE>` is the one thing that changes per image — deep violet for the club, warm
aubergine for the theatre, midnight blue for the stadium. The rest stays word for word,
and that repetition is what holds the set together.

Two prompt prefixes exist and they are not rivals. The three blocks above are the short
one, written for a chat-style OpenAI request, and it is the one to use day to day. The
long `MASTER ART STYLE` block in `ART-DIRECTION.md` §12.1 says the same thing with the
edge cases spelled out; reach for it only when a generation keeps drifting and you need
to argue with it in more words. Both were updated together — if you ever find them
disagreeing, §12.1 is canonical.

### Next two prompts, ready to use

**`map-horizon`** — size `1536x1024`

```
STYLE — Children's game illustration, simple 2D shapes with soft painted gradients.
Big rounded forms, few of them. Deep violet air over warm amber light, soft glow.
Bright and alive along the top of the frame, deep and quiet along the bottom. The
excited moment just before the music starts. Clearly illustrated, not photorealistic,
not 3D, no outlines.

SCENE — A wide, almost empty dusk landscape. Two or three broad rounded hills in
deep aubergine, layered one behind the other across the frame, each a single smooth
shape with no texture on it. A broad warm amber glow lies along the whole horizon
line, as if a huge stage were lit just beyond the hills, and it lifts up into the
violet air above. High in that air, a scatter of tiny soft drifting sparkles. Nothing
else at all — no buildings, no roads, no trees, no sun or moon, nothing standing on
the ground.

RULES — Keep the lower half dark, smooth and almost empty, and keep the middle of
the image plain. No text, no letters, no signage, no logos. No people. No gold
objects.
```

**`map-sky`** — size `1536x1024`

```
STYLE — Children's game illustration, simple 2D shapes with soft painted gradients.
Soft, calm, barely there.

SCENE — Three soft, wide, very low-contrast cloud bands at different heights, on a
pure solid black background. Simple rounded flattened shapes in dusty violet with a
faint warm amber edge underneath, as if lit from far below. Very soft edges, no
detail. Wide empty gaps between the bands, and the centre of the frame nearly clear.

RULES — The background is flat pure black (#000000) everywhere the clouds are not.
No sky colour, no gradient, no ground, no text, no logos.
```

The black background is deliberate, but not because of a blend trick — it is simply the
easiest thing to ask a generator for. **The tooling converts that black into an alpha
channel on import** (darker pixel → more transparent), so what you save is an ordinary
transparent WebP.

The original plan was `mix-blend-mode: screen`, which would have made black vanish for
free. It does not work here: `#app` carries `position: relative; z-index: 1`
(`index.html:159`, added in Phase 0 so it sits above the grain and confetti layers) and
that creates a stacking context. The body gradient is painted **outside** it, so there is
nothing inside `#app` for the sky to blend with and the black stayed black — a black bar
across the top of the map. Baking the alpha at import removes the dependency on stacking
contexts altogether.

### The prompts after these

Club, stadium, finale and the city set are written out in full in `ART-DIRECTION.md`
§12, Briefs 2, 5 and 6 — kept in one place rather than copied here, because the last
time prompts lived in two places they drifted apart without anyone noticing. Club and
stadium already carry their own room hue and their own top-third beams.

---

## 4. Podium vs venue

| Screen | What shows |
|---|---|
| **Show (gameplay)** | **Venue only.** `.show-stage` dissolves — no frame, no podium, no props. |
| **End screen** | Unchanged. It is a portrait card of your star; the frame and podium stay. |
| **Dressing room, profile card, new star** | Unchanged. |

Venue is chosen by rank, not by purchase:

| `starRank().idx` | Venue |
|---|---|
| 0–2 | club |
| 3–5 | theatre |
| 6+ | stadium |

The podium stays a purchase; you see it on four screens out of five, just not underneath
the sums. No data changes, no renames.

Worth considering later, not now: rank 0 is called **Straatartiest**, so the first venue
could be a street corner at dusk rather than a club — small, humble, one lamp. It would
make the climb to the stadium land harder. Costs one more image; decide after the first
three are in.

---

## 5. Implementation steps

Each step ships on its own and leaves the app coherent.

1. **Plumbing, no art.** Create `assets/bg/`. Add a `.scene` background layer + the dark
   scrim as CSS tokens. In `sw.js`: serve `assets/` cache-first and bump `CACHE`.
2. **Map.** Drop in `map-horizon` + `map-sky`. Apply to the **map and the star picker**
   only. Delete the ☁️/✈️ emoji spans and the `.map-ground` gradient stack. Check all
   three viewports. **Ship.**

   *Not* the dressing room or the trophy cabinet, though an earlier version of this line
   said all four hub screens. Two reasons, both visible the moment you try it: those two
   are **rooms** — a wardrobe and a display cabinet — so a landscape behind them reads as
   a mistake; and their shop tiles and trophy cards are **translucent**, drawn against a
   flat gradient, so artwork shows straight through the cards. Anything behind those
   screens needs opaque cards first (§9.4) and its own backstage asset second.
3. **Show screen.** Add the venue layer behind `#screen-game`. Dissolve `.show-stage`
   (border, background, `::after` lights, `.deco` all off). Add a soft light pool under
   the avatar for grounding. Move the crowd meter into the sticky header — it is sized to
   the old frame and floats loose without it. **Ship.**
4. **Venue tiers.** Add club + stadium, pick by `starRank().idx`. Test each tier with
   `?debug&demo&star=p1&screen=game`. **Ship.**
5. **Finale.** Add `finale` behind `#screen-end`. Check the headline, stars, chips, pill
   and both buttons still read. **Ship.**
6. **Cities.** Twelve landmark silhouettes as one SVG sprite; replace the food emoji.
   **Ship.**

Later, in whole sets only: dressing-room scene, look posters, trophy icons, props.

---

## 6. Trying an asset out

### The easy way: the studio

```bash
npm run preview
```

Then open `http://localhost:8099/?debug&demo&star=p1&screen=map&mapedit` and **drag your
generated image onto the Beelden panel**. That is the whole workflow — it converts the
image to WebP at the right size, writes it into `assets/`, and bumps the service-worker
cache so devices that visited before actually see the new picture.

- **Any source size works.** The image is cover-cropped to the target and resized, so a
  generator's 1024×1024 or 900×600 is fine as long as the composition survives a crop.
  Never distorted.
- **Two targets today** — the world map (1080×2160) and the home screen (1024×1536).
  Pick one in the dropdown. More appear as the app grows something that renders them.
- **Quality** is a dropdown; the panel reports the resulting kB so you can keep an eye on
  the budget (§7.3 of ART-DIRECTION: ≤ 120 kB per background).
- **Voorbeeld** opens the real game in a true window at `staand · klein · liggend ·
  tablet`, or two side by side. A real window, not a scaled box: the landscape fallback
  keys off the viewport, so only a real one tells the truth.
- Nothing reaches a child until you press **⇪ Zet in het spel** and then commit. A draft
  lives in `localStorage` and is only read with `?debug`.

Dropping an image straight onto the panel replaces the older `incoming/` + filename-routing
flow for these two slots. `incoming/` still works for the slots the studio does not cover
yet — see `npm run try` below.

> **Superseded.** There used to be a second tool, `proefstudio.html`: a generated copy of
> the whole app with its own drop zone, for use without Node or a terminal. It has been
> retired. Every reason it existed is now covered elsewhere — you need a clone to work on
> the art anyway, the preview server never writes to `index.html` unless you ask it to, and
> a 500 kB copy of the app committed to the repo went stale the moment the app changed.
> One studio, one place to fix things.

### If you want the terminal version instead

**Node.js, and a terminal. That is the whole list** — no VS Code, no editor at all, no
`npm install`.

```
git clone https://github.com/MaxOfTheDay/reken-popsterren
cd reken-popsterren
git checkout claude/reken-popsterren-asset-audit-k9xtsv
node test/preview.js
```

Then open the address it prints. `npm run preview` does exactly the same thing; `npm` is
just spelling `node test/preview.js` differently.

The preview server uses only Node's own built-in modules, so it runs against a bare Node
install with no dependencies fetched at all — verified by running it in a folder holding
nothing but `index.html` and the two scripts. `npm install` buys you exactly one thing:
`npm run try`, which drives a headless browser through Playwright (a few hundred MB). If
you only ever want to look at the app, you never need it.

Dropping images in `incoming/` is a normal folder operation — Finder, Explorer, drag and
drop. Nothing needs to be "imported".

An editor is worth having only when you want to read or change code. If you already like
VS Code, its built-in terminal saves you a window; that is the entire benefit here.

### The mechanism

You generate somewhere else, then drop the file here. Nothing to configure, nothing to
import, and nothing lands in the app until you decide it should.

```
incoming/            <- drop generated images here (gitignored)
```

**The filename decides where it goes.** Name it and the tools place it:

| Name it | Lands on |
|---|---|
| `venue-theater.webp`, `venue-club.webp`, `venue-stadium.webp` | the show screen, behind gameplay |
| `landing.webp` | the first screen — who is performing today |
| `map-horizon.webp` | the tour map |
| `map-sky.webp` | the map's sky layer, blended with `screen` |
| `finale.webp` | the end screen |

Then pick one of two ways to look at it:

```
npm run preview     the real app in your browser, with the candidate behind it
npm run try         screenshots of every affected screen, three sizes, plus checks
```

**`npm run preview`** opens `http://localhost:8099`. It is the actual game — click
through it, play a round, buy a podium. A small **kandidaat** chip in the corner expands
into two switches: *kunstwerk aan* (off = instant before/after) and *donkere sluier* (off
= what the scrim is doing for you). Drop a new file in `incoming/` and refresh; no
restart. The service worker is deliberately disabled here, or you would be looking at a
cached copy of your previous attempt and concluding the new one changed nothing.

**`npm run try`** is the batch version for judging rather than playing. It writes
`shots/try/index.html` — open that one file and you get every affected screen at 390,
320 and 1024, each with and without the scrim, side by side. Plus a `keuring-*.png` per
image carrying the three checks from §1: the zone overlay (bottom 55 % must stay quiet,
top third may live), the 180 px thumbnail test, and a desaturated flattening test.

Judge on those, not on the image at full size on its own. An image that looks superb in
a viewer and dies under a scrim behind a sum card is the single most common failure, and
it is invisible until you put it where it will actually live.

Approved files move to `assets/bg/`; that is the step that makes them part of the app.
Everything in `incoming/` and `shots/` is ignored by git, so a rejected generation leaves
no trace.

---

## 7. Other tools

```
npm run shots -- <label>    every screen, three viewports, into shots/<label>/
npm test                    34 / 74 / 78 checks
```

Debug switches: `?debug&demo&star=p1&stage=stage_vulkaan&screen=game`

`demo` seeds two example stars in memory only — it never calls `save()`, so a real
family's data on the same device is untouched.
