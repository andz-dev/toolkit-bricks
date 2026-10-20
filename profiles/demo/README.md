# Demo package

Public sample data, schema 1.3. Do not put real company information here (design rule D-1).

`collection.json` lists the topics in the order the viewer shows them. Each topic is one self-contained profile. Texts and ratings are proposals and status values are illustrative. Facts in the `research` blocks were checked against vendor documentation on 2026-10-19.

| File | Topic |
|---|---|
| `collection.json` | The package: order, ids and icons of the topics |
| `profile-automation-agents-data.json` | n8n, agent skills, the agent harness and its components, PostgreSQL with pgvector, SQLite with sqlite-vec. Nine use cases. |
| `catalog.json` | Browser automation with GitHub Copilot, Playwright MCP and Edge. Two use cases; only the installation rating of the first (3 of 5) was set deliberately. |

Validate the whole package with `npm run validate -- profiles/demo/collection.json`.
