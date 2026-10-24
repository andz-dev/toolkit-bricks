# Map view draft

An isometric railway map of the demo catalogue: use cases are cities, tools are industries, infrastructure is depots, connections are trains. Concept and proposed rules: [`docs/MAP-CONCEPT.md`](../../docs/MAP-CONCEPT.md).

Open `index.html` in a browser. No build step, no server needed.

| File | Purpose |
|---|---|
| `index.html` | Page structure |
| `map.css` | Colour and font tokens (day and night), page layout |
| `map.js` | Layout from the catalogue graph, track routing, drawing, interaction, panel |
| `data.js` | Generated copy of `profiles/demo`. Refresh with `node prototypes/map-view/embed-demo.js` |

This is a draft to capture the idea. It is not part of the viewer, its rules are not in `docs/DESIGN.md` yet, and `npm test` does not cover it. Checked by eye in Chrome at 1440 and 390 px width, light and dark.

Try: click a city to light up its supply chain, switch on "Service lines", switch to night.
