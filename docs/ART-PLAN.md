# Reken Popsterren — art plan (working doc)

The short version. Rationale, alternatives considered and measurements live in
`ART-DIRECTION.md`; you should not need to read it to use this.

Reference for the target look: the game-screen mockup (venue full-bleed, avatar standing
in a light pool, no panel behind her).

---

## 1. Style

**Simple structure, rich light.** Build each scene from 5–8 big rounded shapes, then let
the lighting carry the richness. Detail belongs in the light, not in the objects.

- **Room:** deep violet / aubergine. **Light:** warm amber, low, from the stage.
- **Crowd:** flat silhouettes, rounded heads, no faces, no detail.
- **Soft painted gradients**, no outlines, no photoreal, no 3D, no visible texture.
- **Lower 45–55 % of the frame stays calm and dark** — the sum and answer tiles go there.
- **Never any text, letters, numbers, signage or logos.**
- Gold and cyan belong to the UI. Artwork may contain amber *light*, never gold *objects*.

Two checks before accepting anything:

1. **At 180 px wide, is it still good?** If it falls apart, it is too detailed.
2. **Is the bottom half quiet enough to read a sum on?**

---

## 2. Assets to generate

Only these. Everything else in the app stays CSS or emoji for now.

| # | Asset | Size to request | Delivered as | When |
|---|---|---|---|---|
| 1 | `venue-theater` | 1536×1024 | 1200×700 WebP | ✅ done |
| 2 | `map-horizon` | 1536×1024 | 1600×600 WebP | **next** |
| 3 | `map-sky` | 1536×1024 | 1600×900 WebP | next |
| 4 | `venue-club` | 1536×1024 | 1200×700 WebP | with 5 |
| 5 | `venue-stadium` | 1536×1024 | 1200×700 WebP | with 4 |
| 6 | `finale` | 1024×1536 | 1080×1920 WebP | with 4+5 |
| 7 | `cities` ×12 | 1024×1536 sheet | traced to one SVG | later |

Budget: **≤ 120 KB per image**, ≤ 400 KB for 2+3 together.

---

## 3. Generating with an OpenAI model

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
Big rounded forms, few of them. Deep violet and aubergine room, warm amber stage
light, soft glow around the lights. Calm, magical, premium. Clearly illustrated,
not photorealistic, not 3D, no outlines.

SCENE — <the 5–8 shapes, named in order, and nothing else>

RULES — Keep the lower half of the image dark, smooth and almost empty. No text,
no letters, no numbers, no signage, no logos, no watermarks. No faces. No gold
objects. No people other than featureless crowd silhouettes.
```

### Next two prompts, ready to use

**`map-horizon`** — size `1536x1024`

```
STYLE — Children's game illustration, simple 2D shapes with soft painted gradients.
Big rounded forms, few of them. Deep violet and aubergine, warm amber light, soft
glow. Calm, magical, premium. Clearly illustrated, not photorealistic, not 3D, no
outlines.

SCENE — A wide, calm, almost empty dusk landscape. Two or three broad rounded hills
in deep aubergine, layered one behind the other across the frame, each a single
smooth shape with no texture on it. A broad warm amber glow lies along the whole
horizon line, as if a huge stage were lit just beyond the hills. Above it, deep
violet air. Nothing else at all — no buildings, no roads, no trees, no sun or moon,
nothing standing on the ground.

RULES — Keep the lower half dark, smooth and almost empty, and keep the middle of
the image plain. The upper half is flat empty violet. No text, no letters, no
signage, no logos. No people. No gold objects.
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

The black background is deliberate: it composites with `mix-blend-mode: screen`, so
black disappears and no cut-out step is needed.

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

---

## 5. Implementation steps

Each step ships on its own and leaves the app coherent.

1. **Plumbing, no art.** Create `assets/bg/`. Add a `.scene` background layer + the dark
   scrim as CSS tokens. In `sw.js`: serve `assets/` cache-first and bump `CACHE`.
2. **Map.** Drop in `map-horizon` + `map-sky`. Apply to the four hub screens (map, profile
   picker, dressing room, trophies). Delete the ☁️/✈️ emoji spans and the `.map-ground`
   gradient stack. Check all three viewports. **Ship.**
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

## 6. Tools

```
npm run shots -- <label>    # all screens, three viewports, into shots/<label>/
npm run try -- <image>      # a candidate behind the real screen + the 180px test
npm test                    # 34 / 74 / 78 checks
```

Debug switches: `?debug&demo&star=p1&stage=stage_vulkaan&screen=game`
