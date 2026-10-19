# Design rules

These rules describe what the project must do. Each has an ID. Commits name the IDs they touch, and tests will refer to them.

**Changing a rule:** edit the rule here first, then change the code. Do not let the code drift away from this file.

## Concept

| ID | Rule |
|---|---|
| C-1 | `catalog.json` (a profile that follows `schema/catalog.schema.json`) is the only contract between editor and viewer. They share no other state. |
| C-2 | A **brick** is a tool. A **stud** is a connection type. A **platform** is infrastructure. A **recipe** is a combination of bricks that achieves a result. Users call a recipe a **use case**. |
| C-3 | Brick A uses brick B when A `accepts` a stud that B `provides`. |
| C-4 | One catalogue serves managers and developers. There are no separate manager and developer texts. |

## Viewer: connections

| ID | Rule |
|---|---|
| V-1 | The main board shows bricks and their connections only. Infrastructure is not drawn on it. |
| V-2 | Cables run from the brick that uses a capability to the brick that offers it, top to bottom. |
| V-3 | An animation (pulse and dashes) moves along each cable in the direction of communication, from user to provider. |
| V-4 | Connections are drawn with plug and bolt icons. Each stud has its own colour and a label chip. |
| V-5 | A click on a brick (icon box and label) opens its details on the right. On narrow screens the details open below. |
| V-6 | Selecting a brick dims everything unrelated. Selecting a setup highlights its bricks. |

## Viewer: infrastructure

| ID | Rule |
|---|---|
| I-1 | Infrastructure is an optional explanation layer inside the details panel. It is switched on with the "Infrastructure layer" toggle. |
| I-2 | In the layer the foundation is at the bottom. Trains run upward, from what carries to what is carried. |
| I-3 | Wording: something that runs inside a brick, or inside a platform of kind `host-app`, reads "running inside" (Copilot inside VS Code, pgvector inside PostgreSQL). Everything on any other platform reads "running on" (Playwright MCP on Node.js, Edge on the operating system). A mandatory requirement reads "needs". |
| I-4 | `runsOn` lists alternatives: one of them is enough. It may name platforms or bricks. `requires` lists mandatory items: all are needed. Together they have no cycles. |
| I-5 | A click on any item in the layer opens its details. A Back button returns to the previous item. |
| I-6 | `variants` (Windows, macOS, Linux) are display only. They never branch the graph. |
| I-7 | For a brick the layer shows everything it needs, down to the foundation. For a platform it also shows what runs directly on it. |
| I-8 | Mandatory requirements (`requires`) are drawn in the layer like `runsOn`, marked "needs", and listed under "Also needs" in the details. |

## Viewer: content

| ID | Rule |
|---|---|
| T-1 | Every brick, setup and (where given) platform explains **why**, **what** and **how**. |
| T-2 | **How** is an ordered list of steps. |
| T-3 | Difficulty has two ratings, **installation** and **usage**. Each is 1 to 5 stars and has a written reason. More stars means harder. |
| T-4 | Text is plain language. No marketing words, no unexplained jargon. |

## Viewer: behaviour and look

| ID | Rule |
|---|---|
| U-1 | Dark and light theme. The default follows the system. A toggle overrides it and the choice is remembered, with storage wrapped in try/catch. |
| U-2 | Reduced motion is respected: no pulses and no dash animation. |
| U-3 | Works at phone width. 16px side gutters. No horizontal page scroll. |
| U-4 | Plain HTML, CSS and JS files. No framework, no bundler, no runtime dependencies. Web fonts are the only external resource. |
| U-5 | The viewer has no file-open button. It loads `catalog.json` next to the page when served, otherwise it uses the demo profile built into the page. |
| U-6 | The viewer reads schema version 1.3 only. It shows a clear error for anything else and never renders a half-valid catalogue. |
| U-7 | Controls are keyboard reachable and have accessible names. Escape closes the details. |
| U-8 | The viewer never shows placeholder text such as "null" or "undefined", whichever optional fields a brick, platform or setup leaves out. |
| U-9 | The `viewer/` folder is self-contained: it runs from any static web server and from `file://`, loads only files next to it, and needs no build step. |
| U-10 | `npm run build` produces one self-contained HTML file with the same behaviour, for places that need a single file (a published Claude artifact, an email attachment). |

## Research

| ID | Rule |
|---|---|
| R-1 | The profile, a brick, a platform and a use case can each carry an optional `research` block: a `verifiedOn` date plus facts (each with a source link), open points (each with an owner) and sources. |
| R-2 | The details panel shows a Research section whenever the selected item has a block. The start screen shows the profile's block. Facts show the verified date and their source. Open points show who can answer them. |
| R-3 | A brick on the board shows a small marker when it has research, so readers see where verified facts exist. |
| R-4 | Only http and https links are shown. They open in a new tab with `rel="noopener noreferrer"`. |

## Data and schema

| ID | Rule |
|---|---|
| D-1 | Public demo data lives in `profiles/demo/`. Real company data lives in `profiles/private/` and is git-ignored. |
| D-6 | `collection.json` (schema `schema/collection.schema.json`) lists the topics of a package: id, profile file name, icon. Files are named without paths. The collection and every profile it lists must validate. |
| D-2 | IDs are permanent lowercase slugs. They are unique across bricks and platforms. |
| D-3 | Rules the schema cannot express (references, uniqueness, no cycles) are checked in code, with one shared validator for editor, viewer and tests. |
| D-4 | A schema change that breaks old files raises the version. The viewer states which version it reads. |
| D-5 | Warnings (unused studs or platforms, unconnected setups, bricks without infrastructure) never block loading. |

## Planned: dashboard and use-case pages

Not built yet. These rules move into the sections above, with tests, when the pages are built. The coverage test ignores this section. When they move, U-5, V-1 and V-5 change as noted.

| ID | Rule |
|---|---|
| N-1 | The viewer opens on a dashboard: a grid of boxes, one per use case, grouped by topic. A whole box is clickable. |
| N-2 | Every use case is its own page with its own link (`#/<topic>/<use-case>`). Browser back and forward, bookmarks and shared links work. |
| N-3 | Every use case page has a fixed bar with Back, Home and Next. Back and Next show the title of the previous and next use case, like a carousel, and wrap around at the ends. |
| N-4 | Home opens the dashboard. The left and right arrow keys go back and next unless a text field has focus. |
| N-5 | Navigation uses icons together with text (house, chevrons, grid), accessible names, and a position such as "3 of 10". |
| N-6 | A use case page shows only the bricks of that use case on its board. Other use cases that use a brick are listed in its details as links. (Changes V-1 and V-5.) |
| N-7 | Page order follows `collection.json`: topics in order, then the use cases of each profile in the order of its `recipes`. A use case that appears in two profiles appears twice. |
| N-8 | A dashboard box shows an icon, the title, the topic, installation and usage stars, and the bricks involved. |
| N-9 | The viewer loads `collection.json` next to the page and then every profile it lists. When served without one, or opened from `file://`, it uses the demo package built into the page. (Replaces U-5.) |

## Guardrails

| Check | Command | What it protects |
|---|---|---|
| Tests per rule | `npm test` | Every rule above is named at the start of a test (`V-2: ...`) or listed with a reason in `tests/manual-rules.json`. A rule without either fails `tests/rules.test.js`. |
| Profile validation | `npm run validate -- <file.json>` | Schema plus the shared cross-reference rules (D-3). Use it on every profile an agent delivers. |
| Browser tests | `npm run test:visual` | Real Chromium: geometry, motion direction (pulses down, trains up), overflow, contrast and screenshots in light and dark at desktop and phone width. Screenshots go to `test-results/screens/`. |
| Sync | `npm run sync` | Copies `shared/catalog-core.js` to `viewer/catalog-core.js` and embeds `profiles/demo/catalog.json` into `viewer/index.html`. A test fails when they differ. |
| Single file | `npm run build` | Writes `dist/toolkit-bricks.html` (ignored by git). |
| CI | `.github/workflows/test.yml` | Runs `npm test` on every push and pull request. |

Rules that are only checked by eye: C-1, C-2, T-4 (see `tests/manual-rules.json`). jsdom (`npm test`) has no real layout. Geometry, motion and contrast are checked in Chromium by `npm run test:visual`.

## Version history

| Schema | Change |
|---|---|
| 1.0 | Bricks, studs, recipes |
| 1.1 | Platforms and `runsOn` |
| 1.2 | Why, what, how and difficulty ratings replace the manager/developer texts. Not compatible with 1.0 and 1.1. |
| 1.3 | Research blocks. `runsOn` may name bricks. New `requires` for mandatory items. Categories `agent-component`, `skill`, `database`. Optional use-case `icon`. Not compatible with 1.2. |

| Collection | Change |
|---|---|
| 1.0 | Manifest that lists topics (id, file, icon). |
