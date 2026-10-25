# Handoff: isometric railway map view

Branch: `map-view-draft`. Dates: 2026-10-24 to 2026-10-25. Status: **first draft, direction confirmed, needs fine-tuning.**

The requester reviewed the draft and said it goes in the right direction but needs fine-tuning. Nothing here is merged into `main`, nothing is part of the viewer, and none of the new rules are in `docs/DESIGN.md` yet.

## 1. Read first

| File | What it holds |
|---|---|
| `AGENTS.md` | Repo rules. Still apply in full. |
| `docs/DESIGN.md` | The accepted rules. The map must not break them. |
| `docs/MAP-CONCEPT.md` | The idea, the metaphor and the **proposed** rules M-1 to M-11 and A-1 to A-7. |
| `.claude/skills/toolkit-map-view/SKILL.md` | Project skill. Routes to the vendored isometric skills. Load it before map work. |
| `.claude/skills/README.md` | Where the vendored skills come from, licence, how to update them. |
| `prototypes/map-view/README.md` | How to open and regenerate the draft. |

## 2. Goal

The current viewer is a technical catalogue: one use case per page, bricks on a breadboard, cables between them. The requester wants a second view where **trains and tracks** are the focus of the connections, in the spirit of the cosy rail puzzle game Station to Station: an isometric landscape where trains run and things feel connected. The aim is a "factory" picture of the toolkit, with three kinds of building:

| Catalogue | Map |
|---|---|
| Use case (recipe) | City |
| Brick (tool) | Industry |
| Platform (infrastructure) | Depot |
| Stud (connection type) | Train colour |
| Edge "A uses B" | Track from A to B |
| Topic | Region |

The requester also asked for agent skills that keep game design, map creation and design rules consistent. Those skills are now in the repo (section 4).

## 3. Decisions so far

| Decision | Made by | Where written |
|---|---|---|
| Map is a guided diorama over the same catalogue, not a game. People explore and select, they do not lay track. Follows the earlier "guided catalogue, no free building" decision. | Agent proposal, not contradicted | `MAP-CONCEPT.md`, Idea |
| Cities, industries and depots as the three building types, trains on tracks as connections. | Requester | `MAP-CONCEPT.md`, Metaphor |
| Canvas2D, plain JS, no library. Keeps U-4 and U-9 possible. three.js would need a rule change. | Agent | Section 5 below |
| Every shape is drawn in code from tokens. No image assets, no AI art pipeline, no assets from existing games. | Agent | A-3, A-7 |
| Layout comes from the catalogue graph. No coordinates in the profile yet, so no schema change. | Agent | M-4 |
| The draft lives in `prototypes/map-view/`, outside the viewer, so it cannot break viewer tests. | Agent | Section 5 below |
| Map and art rules stay proposals in `MAP-CONCEPT.md` until accepted. | Agent | `MAP-CONCEPT.md`, Status |

## 4. Agent skills in the repo

All under `.claude/skills/`. Claude Code reads that folder, and so does Copilot in VS Code.

**Project skill.** `toolkit-map-view` holds the project rules, a "which skill for which job" table, the reader's 30-second loop (look → act → feedback → understand), red flags and a checklist.

**Vendored, unchanged.** From [0xheycat/isometric-game-skills](https://github.com/0xheycat/isometric-game-skills), MIT, commit `df3d9a92027f1e852446b287f337ce9e0c5467ae`: `isometric-grid-math`, `canvas2d-isometric-renderer`, `depth-sorting-occlusion`, `tilemap-data-format`, `tile-picking-interaction`, `camera-pan-zoom-controls`, `isometric-art-direction`, `canvas-performance-optimization`. Before adding them, they were reviewed: plain Markdown and SVG diagrams only, no scripts.

**Looked at and not taken:**

| Source | Why not |
|---|---|
| The art-generation skills of the same repo (ComfyUI, sprites, terrain, atlas packing, cut-out cleanup) | The map draws everything in code. |
| `godot4-isometric-tilemap` | Not a Godot project. |
| agent-skills-hub `game-design` | Generic. Its useful part, the core loop, is in `toolkit-map-view`. |
| ityes22 `game-design-document` | Writes publisher-style GDD files. Too heavy for this. |
| gamedev-skills/awesome-gamedev-agent-skills | Engine skills (Godot, Unity, three.js and others). Worth another look only if the map goes 3D. |
| MengTo/Skills game-development (`build-game-map-editor`, `author-game-levels`) | Could not be read during research (site blocks automated access). Check by hand before the editor work. |
| almendili/skills `architecture-map` | An isometric repo map with buildings and flows. A good reference for ideas. No licence was visible, so nothing was copied. |

Do not edit vendored skills. Put project rules in `toolkit-map-view`.

## 5. What the draft is

`prototypes/map-view/`: open `index.html` from disk. It needs no server and no build.

| File | Content |
|---|---|
| `index.html` | Toolbar (zoom, Fit, Service lines, day/night), canvas, panel |
| `map.css` | Token blocks for day and night, then layout. Interface tokens are copied from `viewer/viewer.css`. World tokens are new. |
| `map.js` | Everything else, about 960 lines, one IIFE |
| `embed-demo.js` | Writes `data.js` from `profiles/demo`. Rerun after any demo profile change. |
| `data.js` | Generated. Do not edit. |

### How `map.js` works

| Part | Functions | Notes |
|---|---|---|
| Model per topic | `buildRegion` | Edges between bricks that share a recipe (M-2). Brick depth by relaxation, so users sit at depth 0. Industries are placed per depth layer by the mean x of their neighbours, with two refinement sweeps. Cities sit in two staggered rows at the front, depots in a row at the back. |
| World | `buildWorld` | Regions side by side along x, with a river between them. Occupancy and "near building" grids. One freight line per brick pair (one train per stud on it), and passenger lines from each city to its entry bricks (M-3). |
| Routing | `route`, `link`, `smoothPath`, `along` | A* on tiles. The state includes direction, so turns cost more. Existing track is cheaper (M-5) and tiles next to buildings cost more. Shorter lines are routed first. Paths are smoothed into a polyline for the trains. |
| Scenery | `placeDecor` | Rocks and hills around cities, more for higher installation stars. Forest by value noise, with a clearing around towns. All randomness is seeded by position, so the map is the same on every load. |
| Drawing | `box`, `roofX`, `roofY`, `cylinder`, `dome`, `drawIndustry`, `drawDepot`, `drawStation`, `drawHouse`, `drawTree`, `drawRock`, `drawTrain` | Light from the top left. Face factors are top 1, left 0.86, right 0.68 (A-2). Industry shape by category (A-4). |
| Frame | `buildGround`, `buildTracks`, `frame`, `drawLabels` | Ground and tracks are cached as `Path2D`. Objects are depth-sorted by anchor tile every frame. Labels are screen-space plates with overlap rejection (A-6). |
| Colours | `readPalette`, `col` | Reads every token from CSS through `getComputedStyle`. `map.js` has no colour literals. |
| Interaction | `pick`, `select`, `computeHL`, `fit`, `zoomAt`, `clampCam`, `minZoom`, `renderPanel` | Hit test on the convex hull of each building's box. Selecting a city lights its supply chain (M-8). The panel lists every city and industry as buttons (M-10). Escape clears the selection. |
| Debug | `window.__map` | Exposes `G`, `cam`, `select`, `state`. For tests and the console. |

Demo numbers: world 71 × 35 tiles, 38 buildings, 27 lines (all routed), 27 trains, 476 scenery objects.

## 6. Verified so far

Checked by eye in Chrome at 1440 × 900 and 390 × 844, light and dark, with a city selected and with nothing selected:

- No script errors.
- Every line found a route.
- No horizontal page scroll at 390 px.
- Selection dims everything outside the chain.
- The night palette reads.
- Labels do not overlap.

`npm test` passed (189/189) on every commit, but it does not cover the prototype.

Not checked:

- Real phone behaviour.
- Keyboard-only use beyond tab and Escape.
- Screen reader output.
- Performance on slow machines.
- Reduced motion in a real browser setting (the code path exists).
- The real fonts: Google Fonts was unreachable in the cloud session, so the screenshots used fallbacks.

## 7. Known issues: the fine-tuning list

Ordered by how much they hurt the picture. These are observations from the screenshots and the code, not requester feedback. Ask the requester which ones matter most to them before starting.

| # | Issue | Where | Idea |
|---|---|---|---|
| 1 | At "Fit" the world is a long thin diagonal with a lot of empty sky. Regions sit side by side along the x axis only, which in isometric runs diagonally. | `buildWorld` | Lay out regions in a grid over both axes, or give each region a square-ish footprint. |
| 2 | Long city names are cut off without an ellipsis (plates are capped at 180 px). | `drawLabels`, `plate` | Add an ellipsis, wrap to two lines, or use a short name. Never shrink the text (same spirit as the main viewer's label rule). |
| 3 | At "Fit" zoom, trains are too small to read as trains. | `drawTrain` | Scale trains slightly at low zoom, or draw a coloured glow under each. |
| 4 | Depots all look the same and sit in one row far from what they serve. Their labels show only from zoom 1.1. | `buildRegion` (depots), `drawDepot`, `drawLabels` | Vary the silhouette by platform kind (`os`, `runtime`, `container`, `host-app`). Pull depots closer to their industries. |
| 5 | The meaning of rocks and hills (installation difficulty) is not obvious. | `placeDecor`, panel key | Show it in the city details, or use a clearer sign such as a hill the track must climb. |
| 6 | Some lines take long detours around buildings. | `route` costs | Tune the near-building and turn costs. Consider a corridor between depth layers. |
| 7 | Bricks with no edge in any recipe (for example `harness-hook`) stand alone with no track. | Data and layout | Expected from the data. Decide whether to show them, mark them, or leave them out. |
| 8 | Everything is redrawn every frame, with no culling of off-screen objects. | `frame` | Follow `canvas-performance-optimization`: cache static scenery to an offscreen canvas and cull by the viewport. |
| 9 | `map.css` copies the viewer's interface tokens. Two copies can drift apart. | `map.css` | When the map moves into the viewer, use `viewer.css` tokens and add only the world tokens (L-1 to L-3). |
| 10 | `readPalette` only parses 6-digit hex tokens. | `readPalette` | Fine for now. Note it if tokens change format. |
| 11 | The phone layout gives the map 62vh, and labels at the edges get cut. | `map.css`, `drawLabels` | Clamp plates inside the canvas. |

## 8. Open decisions (requester)

Copied from `MAP-CONCEPT.md` so they are in one place:

1. **Train direction.** The draft runs a round trip: out empty (the request), back loaded (the result). V-3 says the animation runs from user to provider only. Accept the round trip as a map rule, or keep one direction?
2. **Map hints in the schema.** Optional positions or a biome per topic would need a schema version change (D-4). Auto-layout may be enough.
3. **Where the map lives.** A page in the viewer (`#/map`), or its own page. Either way U-4 and U-9 apply.
4. **Testing canvas rules.** jsdom cannot see canvas drawing. Proposal: move layout and routing into pure functions that the tests can call, and check the drawing with Playwright screenshots.

## 9. Next steps

| Order | Work | Done when |
|---|---|---|
| 1 | Agree the fine-tuning priorities (section 7) and the open decisions (section 8) with the requester. | Answers are written into `MAP-CONCEPT.md`. |
| 2 | Fix issues 1 to 4. | Fit shows a compact world. Labels are readable or end in an ellipsis. Trains are visible at Fit. Depots are recognisable. Checked at 1440 and 390 px, light and dark. |
| 3 | Split `map.js` into a pure layout module (model, layout, routing) and a renderer. Add tests for the layout: every edge has a line, every line has a route, no two buildings overlap, the result is the same on every run. | `npm test` covers the layout. |
| 4 | Move accepted M- and A-rules into `docs/DESIGN.md`, each with a test or an entry in `tests/manual-rules.json`. | `tests/rules.test.js` passes. The commit hook accepts the new IDs. |
| 5 | Decide the home of the map and integrate it, together with `npm run build` (U-10). | The map works from `file://` and in the single-file build. |

## 10. Traps

- **Commit messages.** `scripts/check-commit-msg.js` rejects unknown rule IDs. While M- and A-rules exist only in `MAP-CONCEPT.md`, a message that says `M-6` or `A-2` fails. Write `Rules: none`, and name the map rule in words.
- **Shallow clone.** The cloud session cloned with `--depth 1`, and only `main` was tracked. After pushing the branch, the local branch did not see its remote. Fix: `git config --add remote.origin.fetch '+refs/heads/map-view-draft:refs/remotes/origin/map-view-draft'`, then `git fetch origin`, then `git branch -u origin/map-view-draft`.
- **Playwright in the cloud session.** `npx playwright install chromium` was blocked. A Chrome for Testing build exists at `/opt/google/chrome/chrome` and works with `chromium.launch({ executablePath: '/opt/google/chrome/chrome' })`. `npm run test:visual` was not run.
- **Single-file copy.** For a quick preview, the draft was bundled into one HTML file by hand: CSS, `data.js` and `map.js` inlined, and `height:100vh` changed to `100%`. No script for that is committed. If it is needed again, add one next to `embed-demo.js` rather than repeating it by hand.
- **`data.js` goes stale.** It is a copy of `profiles/demo`. No test checks it. Rerun `node prototypes/map-view/embed-demo.js` after demo profile changes.

## 11. Session log

| When | What |
|---|---|
| 2026-10-24 | Idea from the requester: replace the catalogue look with trains, tracks, cities, industries and depots, isometric like Station to Station, a factory approach. Research for supporting skills. |
| 2026-10-24 | Research: Station to Station (voxel art, cosy rail puzzle, the world grows as you connect it). Isometric and game-design skill repos compared (section 4). Recommendation: Canvas2D, code-drawn voxel style, rules in the repo's own rule format. |
| 2026-10-24 | Requester: put the skills in the repo, then make a demo draft. Done in two commits: `4eab622` (skills and concept), `8050c3d` (draft). Branch pushed. |
| 2026-10-24 | Draft checked in Chrome. Fixes applied before commit: fewer rocks, a clearing around towns, wider label plates, a minimum zoom so Fit works on phones. |
| 2026-10-25 | Requester: right direction, needs fine-tuning. This handoff written. |

## 12. How to check

```sh
npm install
npm test
node prototypes/map-view/embed-demo.js   # only after demo profile changes
# then open prototypes/map-view/index.html in a browser
```
