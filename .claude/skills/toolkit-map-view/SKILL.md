---
name: toolkit-map-view
description: Use when designing, building or changing the isometric railway map view of toolkit-bricks (cities, industries, depots, tracks, trains), its layout, art style or interaction. Routes to the vendored isometric skills and holds the project-specific rules.
license: MIT
---

# Toolkit map view

## Overview

The map shows the toolkit catalogue as a small isometric railway world: use cases are **cities**, bricks are **industries**, platforms are **depots**, connections are **tracks** with **trains** in stud colours. It is a guided diorama over the same catalogue data (C-1), not a game.

The concept and the proposed rules (M-1 to M-11 for structure and interaction, A-1 to A-7 for art) are in `docs/MAP-CONCEPT.md`. Read it fully before changing anything. Accepted rules move to `docs/DESIGN.md` with tests; until then they are proposals.

## When to use

- Changing anything in `prototypes/map-view/` or a future map page in `viewer/`.
- Adding a new building type, track feature, train behaviour or landscape element.
- Deciding how a catalogue concept should appear on the map.

## Which skill for which job

| Job | Skill |
|---|---|
| Grid ↔ screen transform, picking maths | `isometric-grid-math` |
| Render loop: ground pass, then depth-sorted objects | `canvas2d-isometric-renderer` |
| Draw order of buildings and moving trains | `depth-sorting-occlusion` |
| Map data (if positions ever go into the profile) | `tilemap-data-format` |
| Click and hover on buildings | `tile-picking-interaction` |
| Pan, zoom toward pointer, clamping | `camera-pan-zoom-controls` |
| Style sheet discipline (light, palette, scale) | `isometric-art-direction` (our style sheet is the A-rules) |
| Frame drops, caching the static ground | `canvas-performance-optimization` |

The vendored skills come from a general isometric game toolkit. Ignore any step about AI image generation, sprite atlases or ComfyUI: this project draws every shape in code from tokens (A-3, A-7).

## Design loop

Every feature must pass the 30-second loop for a reader, not a player:

1. **Look**: the reader sees a city, an industry or a train.
2. **Act**: they click or hover it.
3. **Feedback**: its supply chain lights up and the panel explains why, what and how.
4. **Understand**: they can answer "what can I do with tool X" or "what does use case Y need".

If a feature adds motion or decoration but does not help step 4, leave it out.

## Process

1. Name the M- or A-rule the change touches. If none fits, write the proposal into `docs/MAP-CONCEPT.md` first.
2. Keep layout and routing as pure functions of the catalogue, so they can be tested without a canvas.
3. Draw every shape with the box and roof helpers. Shade faces only through the A-2 factors.
4. Read colours from CSS tokens. No colour literal in JS (L-1 applies to the map too).
5. Check light and dark theme, reduced motion, phone width (U-3) and keyboard use (M-10).
6. Before committing, run `npm test`. Commit messages follow `AGENTS.md` (rule IDs from `docs/DESIGN.md`, or `Rules: none` while map rules are only proposals).

## Red flags

- A new colour typed into JS or into a CSS rule outside the token blocks.
- A building whose silhouette does not say what kind of thing it is (A-4).
- Labels that scale with zoom or overlap (A-6).
- Positions tuned by hand in code instead of coming from the layout function (M-4).
- Copying art, names or screenshots from an existing game (A-7).

## Verification

- [ ] The change names its M- or A-rule.
- [ ] Light and dark theme both checked.
- [ ] Reduced motion stops trains and smoke.
- [ ] Everything on the map can also be reached from the panel with the keyboard.
- [ ] `npm test` passes.
