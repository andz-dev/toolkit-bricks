# Handoff: frontend improvements and catalogue delivery

## Current handoff: frontend review (2026-10-20)

**Next task:** implement the first four fixes below in small, verified increments. This section records a review and proposed work, not completed frontend changes. The earlier catalogue delivery is preserved below.

### Product and scope

Toolkit Bricks helps managers and developers understand how AI and automation tools connect, what they need to run, and how difficult a use case is. Keep the usable dashboard as the entry point, the breadboard diagrams as the distinctive visual element, and the existing plain HTML/CSS/JS architecture. No marketing hero, framework migration, schema change or editor implementation is part of this work.

### Evidence and limits

- Inspected the built `dist/toolkit-bricks.html` dashboard and `#/automation-agents-data/n8n-agent-with-mcp-tools` page in the integrated browser, at desktop and 390px width, across light and dark themes.
- At 390px, the "OpenAI-style API" and "MCP" cable labels overlap. The details panel begins about 817px below the document top; these are observations of this build, not permanent layout targets.
- The use-case legend includes connection types with no cable on the current board. `renderLegend()` collects every accepted/provided stud on visible bricks rather than the studs of visible edges.
- The populated use-case details are preceded by "Pick a brick", creating a misleading empty-state heading and duplicate hierarchy.
- `viewer/index.html` lacks a standard `name="viewport"` declaration. Actual phone behavior is not verified: resizing a desktop browser does not emulate a mobile layout viewport.
- Dashboard cards repeat the topic name, emphasize large yellow icons, and make tool names comparatively small. This is a design recommendation, not a functional failure.
- The full visual suite previously could not launch because its Playwright Chromium executable was missing. Integrated-browser inspection does not replace that suite. No screenshot files were saved into the repository during the review.

### Ordered implementation and acceptance checks

| Order | Work | Owning files/functions | Acceptance check |
| --- | --- | --- | --- |
| 1 | Prevent cable-label collisions using measured label bounds and placement that keeps each label associated with its cable. Do not hide labels or shrink text to fit. | `viewer/viewer.js`: `drawWires()`; `viewer/viewer.css`: `.chip`, board spacing | At 390px and desktop, cable labels neither overlap one another nor cover bricks or leave the board. Add a browser geometry regression for the n8n route; check all demo routes for regressions. Rules V-4, U-3. |
| 2 | Derive the legend from edges drawn for the current use case, retaining catalogue stud order and token-based colours. | `viewer/viewer.js`: `renderLegend()` | On the n8n MCP-tools route, show only the two drawn connection types. Navigation recalculates the legend; a board without edges has no unrelated legend entries. Add a focused viewer test. Rules V-1, N-6, L-4. |
| 3 | Remove the "Pick a brick" prompt above populated use-case details. Preserve the infrastructure control, use-case content, research and selection/close behavior. | `viewer/viewer.js`: `renderDetail()` | With no brick selected, the panel shows the use case directly. Selecting a brick shows its details; closing or Escape restores the use case. Update affected assertions rather than dropping behavioral coverage. Rules V-5, U-7. |
| 4 | Add the standard mobile viewport declaration without disabling zoom; preserve the custom viewport-fit metadata if still needed. | `viewer/index.html` | Both split-file and standalone builds carry `width=device-width, initial-scale=1`. Verify an emulated mobile browser at 390px and a smaller phone width, 16px gutters and no horizontal page scroll. Rule U-3. |
| 5 | Quiet dashboard chrome: reduce yellow icon emphasis, strengthen titles and tool names, and use readable sentence-case metadata. | `viewer/viewer.css`: `.box`, `.ibox`, `.btitle`, `.btopic`, `.effl`, `.mini` | Keep every N-8 field, whole-card links, visible focus, and legible light/dark states. Review desktop and phone screenshots. Rules N-1, N-8, U-7, L-1 to L-4. |
| 6 | Make mobile brick selection reveal its details reliably, while keeping details below the board. | `viewer/viewer.js`: selection handler and `renderDetail()`; related CSS | After selection, the selected heading is visible and not covered by fixed navigation. Avoid unsolicited scrolling on page load or redraw. Respect reduced motion and keyboard focus. Rules V-5, U-2, U-7. |

### Visual direction

Use an engineering workbench: spend visual emphasis on connected bricks and meaningful connection colours; keep surrounding controls restrained. Preserve Barlow Semi Condensed for titles and IBM Plex Sans for content. Reserve IBM Plex Mono for technical identifiers rather than every small label. Prefer sentence-case headings and zero tracking in revised typography.

The proposed light palette reuses existing tokens: paper `#FFFFFF`, canvas `#EDF0F4`, ink `#151A21`, muted `#566272`, signal amber `#F7B500`, connection cyan `#0B7F9E`. These are documentation examples, not permission to hard-code colours outside token blocks. Preserve all stud colours and dark-theme token parity (L-1 to L-4).

Keep content left aligned. Desktop remains board beside details; mobile remains board, concise relevant legend, then details. Retain the card grid and required metadata. A larger hero or broad palette overhaul would not address the observed usability problems.

### Execution and verification

1. Read `AGENTS.md`, all of `docs/DESIGN.md`, and the applicable test instructions before editing. Check the current working tree and preserve existing work. No frontend rule-text changes are planned; if an approach contradicts a rule, stop and resolve it first.
2. Reproduce each issue and write a focused regression in the existing test files. Use `tests/viewer.test.js` for content/state, `tests/build.test.js` for build output, and `tests/visual/viewer.spec.js` for real geometry. Run a new regression separately to establish its failure before applying the corresponding fix.
3. Implement one fix and immediately run its focused check. Do not combine unrelated styling changes into the first four functional fixes.
4. Run `npm test`, `npm run build` and `npm run test:visual`. Ensure the installed Playwright version has its required Chromium; report any installation or launch blocker rather than treating browser checks as passed.
5. Inspect dashboard and use-case screenshots at desktop and phone sizes in both themes, with reduced motion also checked. Verify keyboard navigation and selection/close behavior. Refresh the built HTML before reviewing it; never patch generated output directly.
6. Run `npm run sync` only when its inputs change or the sync check requires regeneration. Never hand-edit `viewer/catalog-core.js` or the embedded demo JSON. Validate any changed delivered profile with `npm run validate -- <file>`.

Last recorded checks from the preceding implementation: `npm test` passed 189 tests; sync, profile validation and build passed. The merged profile retains the known nonblocking warning that `openai-compatible-endpoint` has no infrastructure defined. These results predate the proposed frontend fixes and must not be claimed as their verification. No commit or push was requested for this follow-up.

---

## Previous handoff: topic profiles

Date: 2026-10-20. Status: schema 1.3 is implemented and the five profiles are merged into `profiles/demo/profile-automation-agents-data.json`. Sections 2 to 4 describe the original 1.2 delivery and are kept as history.

**Update.** Schema 1.3 closes the gaps in section 4. Under D-2 an id is a brick or a platform, never both, so hosts are bricks: `agent-harness`, PostgreSQL and SQLite are bricks that other bricks run inside. The merged `n8n` brick keeps the full `accepts` list, `sqlite` provides both `sql` and `sqlite-extension`, and the harness platform of the skills profile is gone. The five source files were removed; `collection.json` lists the merged profile and `catalog.json`.

## 1. Goal

Research five topics and describe each as a public profile that follows `docs/profile-template.md`. The profiles are demo data, so they live in `profiles/demo/` (design rule D-1). The requester also asked to find out whether schema 1.2 can express these topics, and to extend it if not.

The five topics:

1. n8n: a platform in itself, running in Docker on an OS. Low-code editor, OpenAI-compatible endpoints, databases, MCP.
2. Agent skills: no classic app. A description plus scripts and assets, run by an agent inside a harness.
3. The agent harness and its main components (skills, workflows and so on).
4. PostgreSQL as a database and as a store for embeddings.
5. SQLite, the same way.

## 2. What was delivered

| File | Content |
| --- | --- |
| `profiles/demo/profile-n8n.json` | n8n on Docker or Node.js, model endpoint, MCP server, PostgreSQL, SQLite, pgvector. 3 recipes. |
| `profiles/demo/profile-agent-skills.json` | Skill and skill script. The harness is a platform here. 1 recipe. |
| `profiles/demo/profile-agent-harness.json` | Harness brick plus instruction file, skill, script, MCP server, subagent, dynamic workflow, hook. 3 recipes. |
| `profiles/demo/profile-postgresql.json` | PostgreSQL, pgvector, n8n as example user. 2 recipes. |
| `profiles/demo/profile-sqlite.json` | SQLite, sqlite-vec, n8n as example user. 1 recipe. |
| `profiles/demo/README.md` | Lists the five files. |

All five pass `npm run validate -- profiles/demo/profile-*.json`. `npm test` passed (98 tests) before the commit. It was not re-run after the rebase onto the newer `origin/main`.

Expected validator warnings, all caused by the schema gap in section 4: `pgvector`, `sqlite-vec`, `openai-compatible-endpoint`, `instruction-file`, `agent-skill` (harness profile only), `subagent`, `harness-workflow` have no infrastructure defined.

## 3. How the topics were modelled in schema 1.2

- **Each file is self-contained.** Shared entities (Docker, Node.js, n8n, PostgreSQL and others) are repeated with identical text. The files were produced by a throw-away generator script that was not committed. The JSON files are now the source of truth. Edit them directly, and keep repeated entities identical.
- **Extensions use socket studs.** PostgreSQL provides `pg-extension`, and pgvector accepts it and provides `vector-search`. SQLite provides `sqlite-extension`, and sqlite-vec accepts it. In the viewer this draws a cable from the extension to its database.
- **Skills use two bricks.** The skill accepts `script`, and the skill script provides it and runs on Python or Node.js. This avoids the "or only" meaning of `runsOn`.
- **The harness has two shapes.** In `profile-agent-skills.json` it is a platform of kind `host-app`, so skills "run inside" it. In `profile-agent-harness.json` it is a brick that accepts `skill`, `mcp`, `subagent`, `workflow`, `instructions` and `hook`. Both use the id `agent-harness`, so the two files cannot be merged as they are.
- **n8n differs per file.** In the PostgreSQL and SQLite profiles its `accepts` list is cut down to `sql` (and `vector-search` for PostgreSQL). That keeps the viewer from drawing connections that do not exist, for example n8n to sqlite-vec.
- **Ratings and status values are proposals.** Stars were set by judgement from the verified facts. Status is `available` everywhere and only illustrative. The `meta.description` of each file says so.

## 4. Schema gaps (decision needed)

| # | Gap | Workaround used | Effect |
| --- | --- | --- | --- |
| 1 | A brick cannot be a platform or host other bricks. `runsOn` accepts only platform ids, and brick and platform ids must be unique. | Socket studs for extensions. Harness as platform in one file and as brick in another. | n8n cannot host workflows. Postgres cannot host pgvector. The harness cannot host skills in one catalogue. Validator warnings in section 2. |
| 2 | `runsOn` always means "or". There is no "needs all of these". | A skill is split into skill and script. | A brick that needs a harness and an interpreter cannot say so in one entry. |
| 3 | The `category` list (`ai-assistant`, `automation`, `browser`, `connector`, `data`, `other`) is too coarse. | `other` for skills, subagents, hooks and instruction files. | Weak grouping in the viewer. |

Proposed schema 1.3 (not started):

- Let `runsOn` reference brick ids as well as platform ids. Keep the no-cycle rule. This fixes gap 1 and lets one entity be both brick and platform.
- Add a field for mandatory requirements, for example `requires`, next to `runsOn`. This fixes gap 2.
- Add categories such as `agent-component` and `skill`.

This is a breaking change under D-4, so the version goes up and the old rule text must be changed first (see `CLAUDE.md`). It touches at least: `schema/catalog.schema.json`, `shared/catalog-core.js` (then `npm run sync`), `viewer/index.html`, `docs/DESIGN.md` (rules I-4, I-7, C-2, version history), `tests/` and the demo profile. New rules need tests whose titles start with the rule ID.

## 5. Open points to check

| Point | Who can answer |
| --- | --- |
| n8n docs do not list a base URL field for the OpenAI credential. A maintainer reply in [n8n issue 14431](https://github.com/n8n-io/n8n/issues/14431) says custom base URLs already work. | Check the credential form in your n8n version. |
| The MCP Client Tool page documents only an SSE endpoint. The MCP Server Trigger documents SSE and streamable HTTP. Check again before relying on streamable HTTP in the client. | n8n docs, n8n version in use. |
| Subagent, dynamic workflow and hook details come from Claude Code documentation only. Copilot is verified for skills only. | Check the Copilot documentation if the harness profile should cover it. |
| Whether n8n's embeddings sub-nodes work with your model endpoint was not checked. The document-search recipe only says "an embeddings model". | Test in your n8n version. |
| Real status values and difficulty ratings for your own company. | The owners of the real profile in `profiles/private/`. |

## 6. Verified facts (as of 2026-10-19)

- n8n: Docker image `n8nio/n8n`, data volume at `/home/node/.n8n`, port 5678. Docker Compose is the route for production. npm needs Node.js 20.19 to 24.x, is for local testing, and is deprecated from n8n 3.0. SQLite is the default database. PostgreSQL is supported, with `DB_TYPE=postgresdb`. Supported PostgreSQL versions are the latest two (17 and 18 as of July 2026) plus 16.
- Agent Skills: `SKILL.md` with required `name` (up to 64 characters, lowercase, digits, hyphens, matches the folder) and `description` (up to 1,024 characters). Optional `scripts/`, `references/`, `assets/`. Loaded in three steps: name and description, full instructions, then files on demand. Supported by many products. Use is not guaranteed even when a skill is found.
- Claude Code: skills live in `.claude/skills/` or `~/.claude/skills/`. Subagents live in `.claude/agents/`. Dynamic workflows run up to 16 agents at once and 1,000 per run. `CLAUDE.md` is the instruction file and `AGENTS.md` can be read in its place. VS Code reads skills from `.github/skills/`, `.claude/skills/` and `.agents/skills/`.
- PostgreSQL: version 18 is current (18.6), supported until 2030-11-14. 14 reaches end of life on 2026-11-12. An official Docker image exists. For version 18 the image volume is `/var/lib/postgresql`.
- pgvector 0.8.7: PostgreSQL 13 and later. Types `vector`, `halfvec`, `bit`, `sparsevec`. HNSW and IVFFlat indexes. Enable with `CREATE EXTENSION vector;` in each database.
- SQLite 3.54.1 (2026-10-16): in-process library, single file, public domain. Extension loading is off by default. FTS5 is not enabled in every build.
- sqlite-vec: pre-v1, so breaking changes are possible. `vec0` virtual tables. Bindings for Python, Node.js, Ruby, Go and Rust. Apache-2.0 and MIT.

## 7. Sources

- [n8n hosting options](https://docs.n8n.io/deploy/host-n8n)
- [n8n Docker](https://docs.n8n.io/hosting/installation/docker/)
- [n8n npm](https://docs.n8n.io/deploy/host-n8n/install-options/install-with-npm)
- [n8n databases](https://docs.n8n.io/deploy/host-n8n/configure-n8n/choose-n8ns-database)
- [n8n MCP Server Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcpTrigger/)
- [n8n MCP Client Tool](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp/)
- [n8n AI Agent node](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/)
- [n8n PGVector node](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.vectorstorepgvector/)
- [n8n OpenAI Chat Model](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatopenai/)
- [Agent Skills specification](https://agentskills.io/specification)
- [Agent Skills overview](https://agentskills.io/home)
- [Claude Code overview](https://code.claude.com/docs/en/overview)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Claude Code subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code workflows](https://code.claude.com/docs/en/workflows)
- [VS Code agent skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [MCP intro](https://modelcontextprotocol.io/docs/getting-started/intro)
- [PostgreSQL versioning](https://www.postgresql.org/support/versioning/)
- [PostgreSQL download](https://www.postgresql.org/download/)
- [Postgres Docker image](https://hub.docker.com/_/postgres)
- [pgvector](https://github.com/pgvector/pgvector)
- [SQLite home](https://www.sqlite.org/index.html)
- [SQLite about](https://www.sqlite.org/about.html)
- [SQLite loadable extensions](https://www.sqlite.org/loadext.html)
- [SQLite FTS5](https://www.sqlite.org/fts5.html)
- [sqlite-vec](https://github.com/asg017/sqlite-vec)

## 8. Next steps

1. Done: schema 1.3 (section 4).
2. Done: the five profiles are merged into one catalogue.
3. Resolve the open points in section 5.
4. Re-check version numbers and the n8n supported-PostgreSQL range before the next release, because PostgreSQL retires its oldest major version each November.

## 9. How to check the work

```sh
npm install
npm test
npm run validate -- profiles/demo/profile-automation-agents-data.json
```

Real company data still goes to `profiles/private/` only (D-1).
