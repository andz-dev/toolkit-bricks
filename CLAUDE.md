# toolkit-bricks: instructions for agents

Read `docs/DESIGN.md` before changing the viewer, the schema or the editor. Every design rule there has an ID. Name the IDs a change touches in the commit message. If a change contradicts a rule, change the rule first and say so.

- `schema/catalog.schema.json` is the only contract between editor and viewer. Version changes follow `docs/DESIGN.md` (D-rules).
- Real company data goes to `profiles/private/` only. It is git-ignored. Never commit it, never paste it into issues or examples.
- `profiles/demo/` is public. Keep it free of real names, URLs and internal details.
- The viewer is vanilla HTML, CSS and JS. No frameworks, no build step, no runtime dependencies.
- Texts for users are plain language, no marketing words.
