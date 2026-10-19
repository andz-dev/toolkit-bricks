# Design rules

These rules describe what the project must do. Each has an ID. Commits name the IDs they touch, and tests will refer to them.

**Changing a rule:** edit the rule here first, then change the code. Do not let the code drift away from this file.

## Concept

| ID | Rule |
|---|---|
| C-1 | `catalog.json` (a profile that follows `schema/catalog.schema.json`) is the only contract between editor and viewer. They share no other state. |
| C-2 | A **brick** is a tool. A **stud** is a connection type. A **platform** is infrastructure. A **recipe** is a combination of bricks that achieves a result. |
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
| I-3 | Wording: a platform of kind `host-app` reads "running inside" (Copilot inside VS Code). Every other kind reads "running on" (Playwright MCP on Node.js, Edge on the operating system). |
| I-4 | `runsOn` lists alternatives. One of them is enough. The platform graph has no cycles. |
| I-5 | A click on any item in the layer opens its details. A Back button returns to the previous item. |
| I-6 | `variants` (Windows, macOS, Linux) are display only. They never branch the graph. |
| I-7 | For a brick the layer shows everything it needs, down to the foundation. For a platform it also shows what runs directly on it. |

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
| U-4 | Vanilla HTML, CSS and JS. No framework, no build step, no runtime dependencies. Web fonts are the only external resource. |
| U-5 | The viewer has no file-open button. It loads `catalog.json` next to the page when served, otherwise it uses the demo profile built into the page. |
| U-6 | The viewer reads schema version 1.2 only. It shows a clear error for anything else and never renders a half-valid catalogue. |
| U-7 | Controls are keyboard reachable and have accessible names. Escape closes the details. |

## Data and schema

| ID | Rule |
|---|---|
| D-1 | Public demo data lives in `profiles/demo/`. Real company data lives in `profiles/private/` and is git-ignored. |
| D-2 | IDs are permanent lowercase slugs. They are unique across bricks and platforms. |
| D-3 | Rules the schema cannot express (references, uniqueness, no cycles) are checked in code, with one shared validator for editor, viewer and tests. |
| D-4 | A schema change that breaks old files raises the version. The viewer states which version it reads. |
| D-5 | Warnings (unused studs or platforms, unconnected setups, bricks without infrastructure) never block loading. |

## Guardrails

| Check | Command | What it protects |
|---|---|---|
| Tests per rule | `npm test` | Every rule above is named at the start of a test (`V-2: ...`) or listed with a reason in `tests/manual-rules.json`. A rule without either fails `tests/rules.test.js`. |
| Profile validation | `npm run validate -- <file.json>` | Schema plus the shared cross-reference rules (D-3). Use it on every profile an agent delivers. |
| Core sync | `npm run sync` | Copies `shared/catalog-core.js` into the viewer. A test fails when they differ. |
| CI | `.github/workflows/test.yml` | Runs `npm test` on every push and pull request. |

Rules that are only checked by eye: C-1, C-2, T-4 (see `tests/manual-rules.json`). Layout at real screen sizes is not covered by jsdom; check it in a browser until visual snapshots are added.

## Version history

| Schema | Change |
|---|---|
| 1.0 | Bricks, studs, recipes |
| 1.1 | Platforms and `runsOn` |
| 1.2 | Why, what, how and difficulty ratings replace the manager/developer texts. Not compatible with 1.0 and 1.1. |
