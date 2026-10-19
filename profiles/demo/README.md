# Demo package

Public sample data, schema 1.3. Do not put real company information here (design rule D-1).

`collection.json` lists the topics in the order the viewer shows them. Each topic is one self-contained profile. Texts and ratings are proposals and status values are illustrative. Facts in the `research` blocks were checked against vendor documentation on 2026-10-19.

| File | Topic |
|---|---|
| `collection.json` | The package: order, ids and icons of the topics |
| `profile-n8n.json` | n8n on Docker or Node.js, with model endpoints, MCP servers, PostgreSQL and pgvector |
| `profile-agent-skills.json` | Agent skills, their scripts, and the agent harness they run inside |
| `profile-agent-harness.json` | The agent harness and its components: instructions, skills, MCP, subagents, workflows, hooks |
| `profile-postgresql.json` | PostgreSQL as database and, with pgvector, as vector store |
| `profile-sqlite.json` | SQLite as database and, with sqlite-vec, as local vector store |
| `catalog.json` | Browser automation with GitHub Copilot, Playwright MCP and Edge. Two use cases; only the installation rating of the first (3 of 5) was set deliberately. |

Validate the whole package with `npm run validate -- profiles/demo/collection.json`.
