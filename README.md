# toolkit-bricks

Interactive brick-style catalogue of our AI and automation tools: how they connect, what they run on, and how hard they are to install and use.

Managers and developers read the same catalogue. Each tool is a **brick**. Bricks plug into each other through **studs** (connection types), and an optional **infrastructure layer** shows what each brick runs on. Every entry explains **why**, **what** and **how**, and rates **installation** and **usage** difficulty from 1 to 5 stars.

## Parts

| Part | Folder | Status |
|---|---|---|
| Viewer: read-only catalogue in vanilla HTML/CSS/JS, dark and light theme | `viewer/` | working |
| Schema: the contract between editor and viewer (version 1.2) | `schema/` | working |
| Profile template: brief for an agent that collects tools and metadata | `docs/profile-template.md` | working |
| Editor: extend the catalogue, define connections, export a profile | `editor/` | planned |

## Quick start

Open `viewer/index.html` in a browser. It shows the demo profile built into the page. When the page is served from a web server, it loads a `catalog.json` placed next to it instead.

```bash
cd viewer && python3 -m http.server 8080
```

## Profiles: demo and private

A **profile** is one catalogue file that follows `schema/catalog.schema.json`.

- `profiles/demo/` holds public demo data. It is safe to publish.
- `profiles/private/` holds real company data. Its content is **git-ignored**. Do not commit it.

To create a real profile, give `docs/profile-template.md` to an agent that can research your tools, and save the result in `profiles/private/`.

## Design

The rules this project follows are in [`docs/DESIGN.md`](docs/DESIGN.md). Each rule has an ID so changes and tests can refer to it.

## License

[MIT](LICENSE)
