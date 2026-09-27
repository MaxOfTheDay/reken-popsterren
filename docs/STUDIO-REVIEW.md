# Rekensterren Studio — world-authoring review

> **Status:** slices 1–4 below are implemented. The "useful next" and "not worth
> it" lists are still open. This is a phase document: it records *why* the Studio
> works the way it does. Where it and the code disagree, the code wins. The
> maintained guides are `DEV-STUDIO.md` and `docs/UITBREIDEN.md`.

One use case drove this review: **create a new world → configure it → try it in
the real game → iterate → publish it.** Everything below is judged against that
journey, not against "is this a good admin panel".

---

## 1 · How it worked before this round

There are two studios, and they talk to each other through `localStorage` and a
local server:

| | where | what it did |
|---|---|---|
| **Dev Studio** | `test/hub.js`, served by `test/preview.js` at `/studio` | Build/branch tools, test scenarios, device frame, a *read-only* world overview (from `index.html` via `test/werelden.js`), art cards. |
| **In-app editor** | `src/90-wereldstudio.js`, `?debug&mapedit` | The only place a world is actually edited: name, icon, art, colours, reward, stops and road — on the real map. Keeps a **draft** in `localStorage`. |

**A world is one entry in `WORLDS`** (`src/20-app.js`, between `WERELDEN-BEGIN`
and `WERELDEN-EINDE`, machine-written): `id, name, icon, levels` plus optional
`released, beloning, art, theme{sky,deep,glow,road}, venue{dim,…}, nodes, curve`.
Everything else is derived (level numbers, perfect-world trophy, the trip, the
learning step, caching). "Levels/content" need no authoring: the questions come
from the learning step per world (`LEERSTAPPEN`); a new world gets step 6.

What still needed hand work: the **reward** (a `ITEMS` entry with SVG drawing code
— the one genuinely code-level asset) and, before this round, `venue` and
`released` (not in any UI).

**The journey, as traced in a real browser:**

1. Dev Studio → Wereldstudio → *+ Wereld* opened a **new tab** with a browser
   `prompt()`. The new world lived only in the draft; the Dev Studio list never
   showed it.
2. Art: drop on the editor's *Tekening* box (writes immediately), or the Dev
   Studio card (candidate → *Gebruik deze*), or `incoming/` — three paths.
   A brand-new world immediately showed a false *"het bestand staat er niet"*.
3. Reward: a dropdown of **all 100 items**. None were eligible for a new world;
   picking a shop item silently took it out of the shop and was only rejected
   minutes later by the test gate.
4. Try it: the editor's ⧉ window opened **without `&wereld=`** — i.e. on the
   demo star's world, not the one being made. The Dev Studio's show buttons
   didn't know draft worlds. Playing the new world meant hand-writing a URL.
5. *Zet in het spel* posted `worldsSource()` text; the server wrote it without
   validation (the editor's check "blocks nothing").
6. *Testen, vastleggen & pushen* ran **every** suite, browser ones included —
   impossible without `npm install`, and minutes long even with it.

## 2 · Friction points, by impact on the journey

1. **The draft could silently undo newer work.** It survived `git pull`/branch
   switches and was laid *wholesale* over `WORLDS` in every `?debug` page
   (Testomgeving included). Saving it wrote last week's worlds back over newer
   ones. Nothing indicated a draft was active.
2. **Studio and test gate disagreed on "done".** The editor called a missing
   reward a note; `npm run check` failed on it. A new world could not be saved
   and committed until someone wrote reward SVG code — and a released-false
   world (the documented way to stage one) broke `kern`, `saves` and
   `kleedkamer`, which assume every world is released.
3. **"Try it in the real game" didn't reach the world being made** (missing
   `&wereld=`; unreleased worlds unreachable; Dev Studio blind to drafts).
4. **Two disconnected studios.** "Edit in viewport" squeezed the editor into an
   800 px iframe (panel collapsed to the bottom, map a few cm tall). Two device
   pickers, two lists, no selection sync.
5. **No clear model of save/commit/publish.** *Zet in het spel* (writes source,
   not the game), *Vastleggen* (two different ones), *Publiceer* — with no view of
   where a change currently is.
6. **Replacing an existing map bumped the wrong cache.** The server bumped `CACHE`
   (the shell) instead of `ART_CACHE`; art is cache-first, so phones that had the
   old map kept it.
7. **`worldsSource()` dropped fields it didn't know.** Any future world property
   added by hand would vanish on the first Studio save.
8. Smaller: `prompt()` modals, false art warning, header controls overflowing
   the editor panel (the ▶ button was off-screen), no venue or release controls.

## 3 · Target workflow

```
+ Nieuwe wereld (name) ──► Bewerken (full width): art · colours · stops · venue · reward
        ▲                        │
        │                        ▼
        └──── Bewerken ◄── Probeer in het spel (phone size): states · first/last show · trip
                                 │
                                 ▼
             Klaar om uit te brengen?  blocks / to do before release / note
                                 │
                                 ▼
  1 Concept ──Opslaan──► 2 Project ──Vastleggen──► 3 Online ──Publiceren──► main
                                 │
                   "uitgebracht" checkbox when nothing is left to do
```

States exist only where they solve a real problem: *concept* (browser-only
work), *project/branch/main* (git, already real), and *released* — an existing
field that lets an unfinished world travel safely to main while its reward
drawing is still being made.

## 4 · Changes

### High value — done now

| change | problem solved | behaviour | impact / risk |
|---|---|---|---|
| **Draft with a basis + rebase** (`rebaseWorldDraft`) | 1 | The draft stores the shipped list it was built on. On load, only worlds *you* changed are laid over today's game; untouched worlds follow the project; a world changed on both sides is flagged. A draft equal to the project is deleted. | Game code, debug-only path. Pure function, tested in Node and browser. |
| **One validator = the gate** (`wereldControle` + `blokkeert`) | 2, 7 | Three severities: *blocks* (a child would notice now, or list-wide damage), *to do before release* (same fault in an unreleased world), *note*. New checks: priced reward, released world without reward, release gap, un-releasing a world children already play, icon/levels, venue range, non-hex colours. `inhoud` case K fails on exactly the blocking points. | Test C relaxed to *released* worlds — a deliberate policy change, aligned with the docs. |
| **Released-only harness mode** (`alleenUitgebracht`) | 2 | `kern`/`saves`/`kleedkamer` test the game as children have it, so a committed unreleased world no longer breaks `npm run check`. | Test-only; verified against a clone containing an unreleased, reward-less world. |
| **`&onuitgebracht` preview flag** | 3 | In `?debug` only, counts unreleased worlds as playable (memory only, never saved). The world workbench and the editor always use it; the Testomgeving never does. | Must be declared before `rebuildWorldStarts()` runs (rule 0) — it is. |
| **New world without modal** | 4, 8 | Inline name field in both studios; `&nieuw=<naam>` creates it once (idempotent on reload), appended, `released: false`. | — |
| **Draft-aware Dev Studio** | 3, 4 | Posts the draft to `/api/werelden`; the server applies it with the game's own `loadWorldDraft`. Draft worlds appear with *nieuw/concept* tags; a *✎ concept* chip shows in every workbench; list refreshes on `storage` events; editor → hub selection sync via `postMessage`. | — |
| **Edit ⇄ Try as two modes** | 3, 4 | *Bewerken* gives the editor the full width; *Probeer in het spel* shows the phone-size game with the draft, including unreleased worlds: map states, first show, last show (world celebration + reward), end screen, the trip. Editor's ▶ window now opens the edited world. | — |
| **Validated save** (`POST /api/concept`) | 1, 2, 5, 7 | The concept (not source text) goes to the server, which rebases it, runs `wereldControle`, refuses on blocking points, proof-reads `worldsSource()` (round-trip must be exact, see `blokTerug`), writes, builds, runs the fast check. Both studios use it; the old `/werelden` route is gone. | Single write path for worlds. |
| **Pipeline: Concept → Project → Online** | 5 | One panel shows where changes are and the single next action: *Opslaan*, *Vastleggen* (fast check first; branches off main automatically), *Publiceren* (two clicks; all tests). | Uses existing git endpoints. |
| **Commit gate = fast check; publish explains playwright** | 5 | Branch commits no longer need browsers; publishing says "run `npm install` once" up front instead of failing in a test tail. | — |
| **Correct art cache bump** | 6 | Replacing an existing asset bumps `ART_CACHE` once per change set (compared to `HEAD`); new files bump nothing. Cache clearing in the studio is prefix-based. | Fixes a real player-facing staleness bug. |
| **`worldsSource` keeps unknown fields; a no-op save is a no-op** | 7 | Unknown world keys are written as JSON; explicit `released: true` is kept; numbers keep the file's `.56` style. The three explanatory comments that lived *inside* the machine-written block (and would have been deleted by the first save) moved above `WERELDEN-BEGIN`. `hub` K pins that saving unchanged worlds leaves the block byte-identical. | Future world properties need no Studio change to survive a save. |
| **Editor controls** | 8 | *Uitgebracht* checkbox, venue darkness slider + "view in the show", reward list limited to free treasures with a copyable starter snippet for a new one, *✕ weg* for unsaved new worlds, grouped check list, header overflow fixed, no 404 probe for new worlds. | — |

### Useful next

* **Reward treasure without code.** The only step that still needs a developer.
  A small set of parametric crown/hat templates (shape + colours + emoji) could
  cover most new worlds. Worth it only if new worlds become frequent.
* **Move the editor out of the shipped bundle.** `src/90-wereldstudio.js` is ~20 %
  of the app's JavaScript and every child downloads it. It could be served as a
  separate classic script only under `?debug&mapedit`. Needs care with the
  "one scriptblok" rule and the Node harness.
* **One art upload path.** The hub card (candidate → *Gebruik deze*) and the
  editor drop zone (immediate write) do the same job two ways. Unify on the
  candidate flow.
* **Draft world reorder/removal of shipped worlds** stays deliberately
  impossible; if it's ever needed it should be a code change with a migration.

### Probably not worth it

* **Duplicate an existing world.** Nodes, road and colours are specific to the
  artwork; copying them to a new map produces something to undo, not a head
  start. The default slinger + *haal uit de tekening* is a better start.
* **Configurable level count per new world.** All worlds are 8; the field stays
  editable by hand in `WORLDS` for a new world, and the validator guards it.
* **A "Publish" that talks to GitHub directly** (auth, tokens, PRs). The local git
  pipeline already reaches `main`, and Pages deploys it.
* **A separate world schema file / JSON Schema.** `WORLDS` plus
  `wereldControle` *is* the schema, executed by the same code children run.

## 5 · Slices, as implemented

1. **Safe draft** — basis key, rebase, conflict reporting, auto-cleanup.
2. **One validator** — severities, new checks, inhoud K, released-only harness.
3. **Create → edit → try** — preview flag, inline creation, edit/try modes,
   draft-aware hub, correct preview window, editor controls.
4. **Save → commit → publish** — `/api/concept`, round-trip guard, pipeline
   panel, fast commit gate, art cache fix, `worldsSource` future-proofing.

Each slice ships with tests: `inhoud` K, `hub` K, `studio` C/N/O.

## 6 · The resulting workflow

1. `npm run studio` → **Wereldstudio** → **+ Nieuwe wereld** → type
   *Regenboogwereld* → **Maak**. The editor opens full width on the new world.
2. Drop the map on **Tekening**. Click **haal uit de tekening**. Drag stops onto
   the ledges. Set **Zaal · donkerte**. Pick a **wereldschat** — or copy the
   starter snippet if none is free.
3. **▶ Probeer in het spel**: step through the map states, play the **first** and
   **last show** on a Pixel-sized frame. **✎ Bewerken** to go back. Repeat.
4. Read **Klaar om uit te brengen?**. Red blocks saving; gold is "before release".
5. **1 · Concept → Opslaan in het project**. **2 · Project → Vastleggen…**
   (message, Enter). **3 · Online → Publiceren… → Ja, publiceer.** The world is on
   main — still closed to children.
6. When the reward exists and nothing is left to do: tick **uitgebracht**, then
   Opslaan → Vastleggen → Publiceren once more.

Before this round the same journey needed: a second tab and a modal, a
hand-written preview URL, code edits for venue and release, a reward that could
silently break the shop, a save with no validation, a commit that needed a full
browser test run, and luck that no stale draft was lying around.
