# toolkit-bricks: instructions for agents

This file is read by every coding agent used on this repo (Claude Code, Pi Coder and others). `CLAUDE.md` only imports it.

## Design rules come first

Read all of `docs/DESIGN.md` before changing the viewer, the schema or the editor. It is short. Every rule there has an ID (`V-2`, `L-1`, `D-4`).

- Name the rule IDs a change touches in the commit message. A commit that touches no rule says `Rules: none` on its own line. The commit-msg hook checks this.
- If a change contradicts a rule, change the rule first and say so.
- If two rules seem to conflict, stop and ask. Do not pick one.
- A new or changed design rule needs a test whose title starts with the rule ID (`it('V-2: ...')`), or an entry with a reason in `tests/manual-rules.json`. The test must fail when the behaviour breaks. A test that only carries the ID in its title does not count.

## Project rules

- `schema/catalog.schema.json` is the only contract between editor and viewer. Version changes follow `docs/DESIGN.md` (D-rules).
- Real company data goes to `profiles/private/` only. It is git-ignored. Never commit it, never paste it into issues or examples.
- `profiles/demo/` is public. Keep it free of real names, URLs and internal details.
- The viewer is plain HTML, CSS and JS files in `viewer/`. No frameworks, no bundler, no runtime dependencies. It runs as-is; `npm run build` only makes a single-file copy.
- Colours and fonts exist only as tokens at the top of `viewer/viewer.css` (L-1 to L-4). Never write a colour or a font name anywhere else.
- Texts for users are plain language, no marketing words.

## Working rules

- Run `npm install` once. It also switches on the git hooks in `.githooks/`.
- Run `npm test` before every commit. All tests must pass. The pre-commit hook runs it too. Never skip hooks with `--no-verify`.
- Changes to layout, motion, colour or contrast also need `npm run test:visual`.
- The validator and graph code live in `shared/catalog-core.js`. After editing it run `npm run sync`. Never edit `viewer/catalog-core.js` or the demo JSON block in `viewer/index.html` by hand; both are generated.
- New invalid or borderline catalogues go into `tests/fixtures.js`, derived from the demo profile.
- Validate every delivered profile with `npm run validate -- <file>` before treating it as done.

## Final message of every task

End with three short lines:

1. Rule IDs you checked or changed.
2. Commands you ran and whether they passed.
3. Anything you could not check (for example, no browser available for `npm run test:visual`).
