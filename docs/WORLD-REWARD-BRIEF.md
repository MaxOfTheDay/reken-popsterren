# World rewards — what to make for phase 4D.2

> **Status: shipped (phase 4D.2), presented as *Wereldschatten* since phase 6E.**
>
> Phase 6E changed nothing about the items, the ids or the unlock rule — it changed
> where they live. They used to sit at the tail of the Accessoires drawer, locked,
> between the prices, which made an earned thing read as shop stock that happens not
> to be for sale. They now have their own entry under the category strip
> (`✨ Wereldschatten · 3 / 6`, see `renderSchatEntry`) and their own view: earned
> ones drawn in full with their world's mark, unearned ones a question mark in that
> world's medallion, never a price and never a preview on the doll. An earned one
> also stays in its own drawer, because that is where a child picks what to wear.
> The reveal after the last show gained a *Doe aan* button, and the final stop on a
> world's map carries a small ✨ while its treasure is still out there. The data
> model below is untouched: `WORLDS[].beloning` and `p.owned`, and nothing else.
>
> **Status: shipped (phase 4D.2).** All six items now carry a real `draw()` and a
> `thumb()` in `ITEMS`; the ids never changed, so anyone who had already earned one
> simply sees the finished drawing. One concept changed along the way: Toverwereld
> does **not** get the Maanhoedje of §4 — it hands out the wizard hat that was
> already in the game. That hat used to *also* be on sale for 85 💎 as
> `acc_tovenaarshoed`; the shop copy has since been deleted, because owning it made
> the Toverwereld reward worthless. There is now exactly one wizard hat and you earn
> it. `migrate()` drops the dead id from old saves (no refund — a deliberate call).
> The rest of this brief is the reasoning it was built on, and still describes how
> a seventh world adds its reward.

Phase 4D.1 shipped the mechanics: finishing a world grants one wardrobe item, and making
every level three-star grants that world's `Perfecte werelden` trophy. Both already work,
persist and celebrate. What this brief covered is **how the six items look** — done in 4D.2.

This brief says exactly what "look" means here — and the first thing to know is that it is
**not an image file**.

---

## 1. The wardrobe has no image assets

Everything a doll wears is drawn in code. `avatarSVG()` emits one inline
`<svg viewBox="0 0 200 250">`, and an item contributes to it in one of three ways:

| how | example | what the item carries |
|---|---|---|
| a colour | `dress_blauw`, `hair_rood` | `color: '#29b6f6'` (or `'RAINBOW'`) |
| a pattern over a shape | `dress_sterren` | `pattern: 'stars'`, drawn from `PAT_JURK` / `PAT_SHIRT` |
| its own shape | `acc_kroon`, the six world rewards | a hand-written SVG path |

There is no `<image>`, no sprite sheet and no per-item PNG anywhere in the app. The only
raster files in the repo are world maps and the landing background (`assets/world/*.webp`,
`assets/bg/*.webp`), and they are backgrounds, not worn things.

**So the deliverable for 4D.2 is a short SVG snippet per item, not artwork to import.**
Nothing needs to be exported, sized, compressed, named or placed in `assets/`.

---

## 2. Head accessories, and why

The six rewards are `cat: 'acc'` — the head/face slot. That is a deliberate choice, and it
is the recommendation for every world that comes after:

1. **It works on both dolls for free.** The doll has two bases (`meisje`, `jongen`, see
   `BASES`) that differ in hair, torso and legs. The *head* is identical in both: a circle
   at **(100, 72) with r = 32**, with the hair drawn behind and in front of it. Anything
   sitting on or beside the head is drawn once and is correct on both. A top or a dress
   would need two versions — one for `torsoJurk`, one for `torsoShirt` — plus a matching
   entry in two pattern tables.
2. **It is the one slot with nothing riding on it.** `dress`, `hair` and `shoes` are
   always equipped (the doll is never naked), so a reward there would silently replace
   something the child chose. `acc` is optional and empty by default: a new item there can
   only add.
3. **It is the most readable at small sizes.** The doll is drawn at 80–150 px wide on the
   map, the end screen and the wardrobe. The head is the largest single feature; a mark on
   it survives that scale where a chest detail does not.
4. **It is cheap.** `acc_kroon` is one `<path>` and one `<circle>`.

The cost: `equipped.acc` holds **one** item, so wearing a Jungle wreath means not wearing
the Ice crown. That is fine — it is a wardrobe, and choosing is the point.

---

## 3. The drawing contract

Two optional functions on the item in `ITEMS`. Both already have their hook in the code;
adding them is the whole of 4D.2.

### `draw(base, uid) → string`

SVG markup, inserted into the doll's `viewBox="0 0 200 250"`, in the accessory layer
(after the head and the front hair, before the neck/arms/clothes).

- **Coordinate space** is that viewBox — `x` 0–200 left to right, `y` 0–250 top to bottom.
- **The head** is the circle `cx=100 cy=72 r=32`. The skull top is at `y ≈ 40`.
- **Free room above the head:** `y` 0 → 40, full width. Nothing is clipped up there — the
  wizard hat's tip used to sit at `y=0`. The six rewards deliberately stop between
  `y = 8` and `y = 20` so they read as one set, not because they have to.
- **Free room beside the head:** roughly `x` 40–70 and `x` 130–160 at `y` 40–70. The
  `spot: 'zij'` items sit at `(53, 54)`.
- **Do not go below `y = 94`** — that is the neck, and the clothes are drawn after you and
  will cover it.
- **Both bases share these anchors**, so one snippet is enough. `base` is passed in only
  if a shape wants to sit differently on the short hair (`jongen`) than on the pigtails
  (`meisje`); ignoring it is normal and correct.
- **`uid`** is the id suffix of this particular doll. Only needed if the item defines its
  own `<linearGradient>`: use `id="mine${uid}"`, because a dozen dolls can be on screen at
  once and duplicate ids would make them all share the first one's colours.
- **No external references.** No `<image>`, no `url(...)` to a file, no CSS classes, no
  `<style>`. Inline `fill`/`stroke` attributes only.
- **Style** follows the doll, not the world paintings: flat fills, one darker outline
  stroke where an edge needs to read (`stroke-width` 1.5–2), no gradients unless the item
  really is rainbow, no filters, no blur.

### `thumb(base) → string`

The picture on the wardrobe card, and (via `.wf-beeld`) in the world-completion reveal.
Optional: without it the card shows the item's `emoji`. All six rewards define one.

- It lands in a **52 px tall** box (`.item-thumb`). Return an `<svg>` with its own small
  viewBox, or any inline markup.
- The six rewards use `beloningThumb(view, art)`: the *same* `art...()` function as `draw()`,
  under a tight viewBox. One drawing, three places (doll, card, reveal) — no second version
  that can drift. Crop tight: the box is 52 px tall, so the viewBox decides how big the
  thing lands in it.
- Skip it if `draw()` already reads well small; the emoji fallback is not an embarrassment.

### What stays as it is

`id`, `cat`, `name`, `full`, and — important — **no `price`**. A world reward is not for
sale; `isBeloning()` derives that from `WORLDS[].beloning` and the wardrobe locks the card
accordingly. Adding a `price` would put it back in the shop.

**The ids must not change.** They are already in children's saves:

```
acc_wereld_muziek  acc_wereld_snoep  acc_wereld_jungle
acc_wereld_piraten acc_wereld_ijs    acc_wereld_tover
```

Replacing the emoji with a `draw()` on the same id means anyone who already earned it just
sees the finished version. No migration, no second item, no lost ownership.

---

## 4. The six concepts

Each concept is one silhouette a six-year-old can name at 96 px. All six are drawn;
the emoji on each item stays behind as the celebration confetti and as the prefix in
the wardrobe bar, not as its picture.

| World | Item (`name`) | Concept | Done |
|---|---|---|---|
| 🎵 Muziekwereld | Notenkroontje | A slim headband with three gold quaver notes standing up from it, like a tiara built out of music. | ✅ |
| 🍭 Snoepwereld | Lollyhoedje | A striped pink-and-white swirl lolly tucked upright beside the head, stick down into the hair. | ✅ |
| 🌴 Junglewereld | Bladerkrans | A ring of broad green leaves around the crown, one hibiscus flower off to one side. | ✅ |
| 🏴‍☠️ Piratenwereld | Piratenhoed | A black tricorn with a gold rim and a small cream skull on the front. | ✅ |
| ❄️ IJswereld | IJskroontje | A crown of pale blue ice shards, uneven heights, with a white glint. | ✅ |
| 🪄 Toverwereld | Tovenaarshoed | The wizard hat the game already had, seated 8 units lower (`TOVERHOED_PUNT`) so its tip lines up with the rest of the set. The 85 💎 shop copy is gone; this is the only one. | ✅ |

Each one is a *hat-shaped* thing on purpose: they then read as a set, they never collide
with the hair, and the child's own colour choices stay visible underneath.

A seventh world needs one more line in `ITEMS` and one `beloning:` field on the world.
Nothing else.

---

## 5. Checks before accepting one

1. At **96 px** (the doll on the map), can you tell what it is?
2. On **both bases** — pigtails and short hair — does it sit on the head rather than in
   front of it?
3. Against **all nine hair colours**, including `hair_wit` and `hair_regenboog`, does its
   own outline still separate it from the hair?
4. Does it stay inside `y` 0–90? Anything lower is about to be covered by the clothes.
5. In the wardrobe card and in the reward celebration (`.wf-beeld`), does it read at
   thumbnail size — or does it need a `thumb()`?

`npm test` covers the mechanics; for the looks use `npm run shots`, or open
`index.html?debug` and equip the six by hand.
