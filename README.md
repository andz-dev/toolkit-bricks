# toolkit-bricks

Interactive brick-style catalogue of our AI and automation tools: how they connect, what they run on, and how hard they are to install and use.

Managers and developers read the same catalogue. Each tool is a **brick**. Bricks plug into each other through **studs** (connection types), and an optional **infrastructure layer** shows what each brick runs on. Every entry explains **why**, **what** and **how**, and rates **installation** and **usage** difficulty from 1 to 5 stars.

## Parts

| Part | Folder | Status |
|---|---|---|
| Viewer: read-only catalogue in plain HTML, CSS and JS files, dark and light theme | `viewer/` | working |
| Schema: the contract between editor and viewer (version 1.2) | `schema/` | working |
| Profile template: brief for an agent that collects tools and metadata | `docs/profile-template.md` | working |
| Editor: extend the catalogue, define connections, export a profile | `editor/` | planned |

## Quick start

Open `viewer/index.html` in a browser. It needs no build step and opens on a dashboard with the demo package built into the page: one box per use case, grouped by topic. Every use case is its own page (`#/<topic>/<use-case>`) with Back, Home and Next buttons that show the neighbouring use cases. When the folder is served from a web server, the viewer loads a `collection.json` placed next to the page, and every profile it lists, instead.

```bash
npm run serve                 # http://127.0.0.1:4173/
npm run build                 # one self-contained file: dist/toolkit-bricks.html
```

| File in `viewer/` | Purpose |
|---|---|
| `index.html` | Page structure and the built-in demo profile |
| `viewer.css` | Styles, light and dark theme |
| `viewer.js` | Rendering and interaction |
| `catalog-core.js` | Validation and graph building, copied from `shared/` |

## Profiles: demo and private

A **profile** is one catalogue file that follows `schema/catalog.schema.json`.

- `profiles/demo/` holds public demo data. It is safe to publish.
- `profiles/private/` holds real company data. Its content is **git-ignored**. Do not commit it.

To create a real profile, give `docs/profile-template.md` to an agent that can research your tools, and save the result in `profiles/private/`.

## Development

```bash
npm install
npm test                      # rule-by-rule tests for viewer, schema and fixtures
npm run validate -- profiles/demo/catalog.json
npm run test:visual           # real-browser checks and screenshots (Playwright)
npm run sync                  # after editing shared/catalog-core.js or the demo profile
```

## Design

The rules this project follows are in [`docs/DESIGN.md`](docs/DESIGN.md). Each rule has an ID so changes and tests can refer to it.

## License

[MIT](LICENSE)
