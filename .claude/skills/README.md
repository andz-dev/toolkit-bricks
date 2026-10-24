# Agent skills in this repo

Claude Code loads skills from `.claude/skills/`. VS Code (GitHub Copilot) reads `.claude/skills/` as well.

## Project skill

| Skill | Purpose |
|---|---|
| `toolkit-map-view` | Entry point for the isometric railway map. Holds the project rules and routes to the skills below. |

## Vendored skills

Copied unchanged from [0xheycat/isometric-game-skills](https://github.com/0xheycat/isometric-game-skills) at commit `df3d9a92027f1e852446b287f337ce9e0c5467ae` (2026-10-24). MIT licence, see `LICENSE-isometric-game-skills`.

| Skill | Used for |
|---|---|
| `isometric-grid-math` | Grid ↔ screen transform and its inverse |
| `canvas2d-isometric-renderer` | Render loop: ground, then sorted objects |
| `depth-sorting-occlusion` | Draw order for buildings and trains |
| `tilemap-data-format` | JSON map format, if map hints enter the schema |
| `tile-picking-interaction` | Pointer to tile, hover and click |
| `camera-pan-zoom-controls` | Pan, zoom toward pointer, clamping |
| `isometric-art-direction` | Style sheet discipline |
| `canvas-performance-optimization` | Profiling, culling, caching static layers |

Not vendored on purpose: the art-generation skills (ComfyUI, sprite and terrain generation, atlas packing), because the map draws everything in code; the Godot skill; and generic game-design skills, whose useful part (the 30-second loop) is in `toolkit-map-view`.

Reviewed before adding: plain Markdown and SVG diagrams only, no scripts.

## Updating

Re-copy a skill folder from the source repo, update the commit above, and review the diff before committing. Do not edit vendored skills; put project rules in `toolkit-map-view` instead.
