# Demo profile

Public sample data. Texts and most ratings are placeholders. Only the installation rating of the browser-checks setup (3 of 5) was set deliberately. Do not put real company information here.

## Topic profiles (schema 1.2, checked against vendor documentation on 2026-10-19)

One self-contained profile per topic. Ratings are proposals and status values are illustrative.

| File | Topic |
|---|---|
| `profile-n8n.json` | n8n on Docker or Node.js, with model endpoints, MCP servers, PostgreSQL and pgvector |
| `profile-agent-skills.json` | Agent skills, their scripts, and the agent harness they run inside |
| `profile-agent-harness.json` | The agent harness and its components: instructions, skills, MCP, subagents, workflows, hooks |
| `profile-postgresql.json` | PostgreSQL as database and, with pgvector, as vector store |
| `profile-sqlite.json` | SQLite as database and, with sqlite-vec, as local vector store |

Validate with `npm run validate -- profiles/demo/profile-*.json`.
