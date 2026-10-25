# Map view: concept and proposed rules

Status: **draft**. Nothing here is a design rule yet. The rules live in `docs/DESIGN.md`; when a map rule below is accepted, it moves there with a test (see `AGENTS.md`). The IDs below are proposals and are not accepted by the commit-msg hook.

Prototype: `prototypes/map-view/` (open `index.html`, no build step). State of the work, known issues and next steps: [`HANDOFF-MAP-VIEW.md`](HANDOFF-MAP-VIEW.md).

## Idea

The breadboard shows one use case at a time. The map shows the whole toolkit as one small railway world, in the spirit of cosy rail puzzle games such as Station to Station: an isometric landscape, buildings that stand for tools and infrastructure, and trains that run between them. The world reads as a network of supply chains: who needs what, and who delivers it.

The map is a second view over the same catalogue. It reads the same `collection.json` and profiles (C-1). It is a guided diorama, not a game: people explore and select, they do not build track.

## Metaphor

| Catalogue | On the map | Why |
|---|---|---|
| Use case (recipe) | **City** | Cities need goods. A use case needs capabilities. |
| Brick (tool) | **Industry** | An industry produces something others use, as a tool provides a stud. |
| Platform (infrastructure) | **Depot** | Depots house and service the trains. Platforms carry and run the tools. |
| Stud (connection type) | **Train colour** | Each stud keeps its colour from `--stud-0` to `--stud-5` (L-4). |
| Edge "A uses B" (C-3) | **Track** from A to B | Tracks are shared where routes run together, like a real network. |
| Request and result | **Empty train out, loaded train back** | The train leaves the user empty (the request, same direction as V-3) and comes back loaded (the result). |
| Topic | **Region** | Each topic is its own area of the world. |
| Installation difficulty | **Rough land** around a city | More stars, more rocks and hills to cross. |
| `planned` / `restricted` | Scaffolding / red signal | Not built in the draft yet. |

## Proposed rules

### Map: structure

| ID | Rule |
|---|---|
| M-1 | Every use case is one city, every brick is one industry per region, every platform is one depot per region. A brick that appears in several use cases of a topic is still one industry. |
| M-2 | A track joins brick A to brick B when both are in one use case and A `accepts` a stud B `provides` (C-3 limited to shared use cases, as on the board). |
| M-3 | A city has a passenger line to each brick of its use case that no other brick of that use case depends on (the entry bricks). |
| M-4 | Layout is computed from the graph: depots at the back, then industries layered by depth (deepest providers nearest the depots), cities at the front. No coordinates in the profile in the first version, so the schema does not change. |
| M-5 | Routes avoid buildings and prefer existing track, so shared corridors appear. |

### Map: motion and interaction

| ID | Rule |
|---|---|
| M-6 | Each track carries a train in the colour of its stud. It leaves the user empty and returns loaded. Passenger lines use a neutral train. |
| M-7 | Reduced motion (U-2) stops all trains and smoke. Trains wait at their stations. |
| M-8 | A click on a city, industry or depot selects it and opens its details (V-5 content). Selecting a city lights up its whole supply chain and dims the rest (V-6). |
| M-9 | Drag pans, the wheel and the +/− buttons zoom toward the pointer, and "Fit" shows the whole world. The view never leaves the map. |
| M-10 | The panel lists every city and industry as buttons, so the map is fully usable with the keyboard and a screen reader (U-7). Escape clears the selection. |
| M-11 | Service lines (dashed) from depots to what runs on them are an optional layer, switched like the infrastructure layer (I-1). |

### Art: one style sheet

| ID | Rule |
|---|---|
| A-1 | Projection: 2:1 dimetric. One tile is 64 × 32 px at zoom 1. Heights are multiples of 4 px (one voxel step). |
| A-2 | Light comes from the top left. Faces: top 100 %, left 86 %, right 68 % of the base colour. Never another order. |
| A-3 | Every colour is a token in the map's token block, light and dark sets complete (as L-1 to L-3). Dark theme is night: darker land, lit windows, train headlights. |
| A-4 | Silhouettes carry meaning: industries are factories (database: silos, ai-assistant: tower, agent-component and skill: workshops), depots are long engine sheds with arched doors, cities are clusters of houses with a station. |
| A-5 | A city has one house per brick of its use case, so bigger supply chains make bigger towns. |
| A-6 | Labels are flat plates in screen space, never scaled with zoom. Cities always show a label; industries show one from zoom 0.9 or when part of the selection; labels never overlap. |
| A-7 | Original art only. No assets, names or likenesses from existing games. |

## Open decisions

1. **Train direction.** The breadboard animates user → provider (V-3). The map uses a round trip: out empty (request), back loaded (result). Accept the round trip, or keep one direction?
2. **Map hints in the schema.** Auto-layout is enough for the demo. Real catalogues may want pinned positions or a biome per topic. That is a schema change (D-4).
3. **Where the map lives.** A third page type in the viewer (`#/map`), or its own page next to the viewer. Either way it must follow U-4 and U-9.
4. **Canvas tests.** jsdom cannot see canvas drawing. Map rules would be tested through the computed layout (pure functions) and Playwright screenshots.

## Agent skills for this work

Vendored in `.claude/skills/` (Claude Code reads them; VS Code Copilot reads `.claude/skills/` too). Start with `toolkit-map-view`, which routes to the others. See `.claude/skills/README.md` for sources and licences.
