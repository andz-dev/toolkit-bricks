/* Toolkit railway: draft map view. Plain JS, no dependencies.
   Layout and routing are pure functions of the catalogue (M-4, M-5). Drawing reads every colour
   from the CSS tokens in map.css (A-3). Concept and proposed rules: docs/MAP-CONCEPT.md. */
(function () {
'use strict';

var PKG = window.MAP_PACKAGE;
var HW = 32, HH = 16;                       // half tile: 64 x 32 px at zoom 1 (A-1)
var DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
var CAR_GAP = 0.62, SPEED = 2.4, DWELL = 1.4;
var CAT_TOKEN = { 'ai-assistant': 'ind-ai', automation: 'ind-automation', connector: 'ind-connector', browser: 'ind-browser',
  data: 'ind-data', database: 'ind-data', 'agent-component': 'ind-agent', skill: 'ind-skill', other: 'ind-other' };
var CAT_SHAPE = { 'ai-assistant': 'tower', automation: 'factory', connector: 'relay', browser: 'dome',
  data: 'silo', database: 'silo', 'agent-component': 'workshop', skill: 'workshop', other: 'factory' };
var CAT_WORD = { 'ai-assistant': 'AI assistant', automation: 'Automation', connector: 'Connector', browser: 'Browser', data: 'Data',
  database: 'Database', 'agent-component': 'Agent component', skill: 'Skill', other: 'Other' };
var TOKENS = ['sky', 'grass-1', 'grass-2', 'grass-3', 'grass-edge', 'water', 'water-hi', 'sand', 'rock', 'soil',
  'tree-1', 'tree-2', 'tree-3', 'trunk', 'ballast', 'rail', 'tie', 'wall-1', 'wall-2', 'roof-1', 'roof-2', 'roof-3',
  'shed-wall', 'shed-roof', 'door', 'window', 'glass', 'platform', 'steel', 'smoke',
  'ind-ai', 'ind-automation', 'ind-connector', 'ind-browser', 'ind-data', 'ind-agent', 'ind-skill', 'ind-other',
  'passenger', 'cargo', 'headlight', 'label-bg', 'label-fg', 'label-line', 'hover', 'region', 'muted', 'accent',
  'stud-0', 'stud-1', 'stud-2', 'stud-3', 'stud-4', 'stud-5'];

/* ---------------- small helpers ---------------- */
function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rnd(x, y, salt) { return hash(salt + ':' + x + ',' + y) / 4294967296; }
function smooth(t) { return t * t * (3 - 2 * t); }
function noise(x, y, scale, salt) {
  var fx = x / scale, fy = y / scale, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0);
  var a = rnd(x0, y0, salt), b = rnd(x0 + 1, y0, salt), c = rnd(x0, y0 + 1, salt), d = rnd(x0 + 1, y0 + 1, salt);
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function mean(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : NaN; }

/* ---------------- model and layout (pure) ---------------- */
function buildRegion(cat, topic, ri) {
  var R = { id: topic.id, title: (cat.meta && cat.meta.title) || topic.id, cat: cat, ri: ri, edges: [], studIndex: {} };
  cat.studs.forEach(function (s, i) { R.studIndex[s.id] = i; });
  var bricks = {}; cat.bricks.forEach(function (b) { bricks[b.id] = b; });
  R.bricks = bricks;
  R.platforms = {}; (cat.platforms || []).forEach(function (p) { R.platforms[p.id] = p; });

  // M-2: edges between bricks that share a use case
  var seen = {};
  cat.recipes.forEach(function (rc) {
    rc.bricks.forEach(function (a) { rc.bricks.forEach(function (b) {
      if (a === b || !bricks[a] || !bricks[b]) return;
      (bricks[a].accepts || []).forEach(function (s) {
        if ((bricks[b].provides || []).indexOf(s) < 0) return;
        var k = a + '>' + b + '>' + s;
        if (!seen[k]) { seen[k] = { from: a, to: b, stud: s, recipes: [] }; R.edges.push(seen[k]); }
        if (seen[k].recipes.indexOf(rc.id) < 0) seen[k].recipes.push(rc.id);
      });
    }); });
  });

  // depth: users near the cities (0), providers further back
  var depth = {}; cat.bricks.forEach(function (b) { depth[b.id] = 0; });
  for (var it = 0; it < 30; it++) {
    var changed = false;
    R.edges.forEach(function (e) { if (depth[e.to] < depth[e.from] + 1 && depth[e.from] < 12) { depth[e.to] = depth[e.from] + 1; changed = true; } });
    if (!changed) break;
  }
  var D = 0; cat.bricks.forEach(function (b) { D = Math.max(D, depth[b.id]); });
  var layers = []; for (var d = 0; d <= D; d++) layers.push([]);
  cat.bricks.forEach(function (b) { layers[depth[b.id]].push(b.id); });

  var nDepots = (cat.platforms || []).length;
  var maxLayer = Math.max.apply(null, layers.map(function (l) { return l.length; }));
  var W0 = Math.max(5 * maxLayer, 4 * cat.recipes.length + 1, 5 * nDepots, 14);
  R.w = W0; R.D = D;

  var cx = {};   // centre x of every placed brick
  function neighbours(id, dir) {
    return R.edges.filter(function (e) { return dir === 'users' ? e.to === id : e.from === id; })
      .map(function (e) { return dir === 'users' ? e.from : e.to; });
  }
  function coRecipe(id) {
    var out = [];
    cat.recipes.forEach(function (rc) { if (rc.bricks.indexOf(id) >= 0) rc.bricks.forEach(function (o) { if (o !== id && cx[o] != null) out.push(o); }); });
    return out;
  }
  function place(ids, desired, w, spacing) {
    var order = ids.map(function (id, i) { return { id: id, want: isNaN(desired[i]) ? W0 / 2 : desired[i], i: i }; })
      .sort(function (a, b) { return a.want - b.want || a.i - b.i; });
    var xs = [];
    order.forEach(function (o, i) { xs[i] = Math.max(Math.round(o.want - w / 2), i ? xs[i - 1] + spacing : 0); });
    for (var i = order.length - 1; i >= 0; i--) xs[i] = Math.min(xs[i], i === order.length - 1 ? W0 - w : xs[i + 1] - spacing);
    for (i = 0; i < order.length; i++) xs[i] = Math.max(xs[i], i ? xs[i - 1] + spacing : 0);
    var res = {}; order.forEach(function (o, i) { res[o.id] = { x: xs[i], rank: i }; });
    return res;
  }
  function layerY(d) { return 5 + (D - d) * 6; }

  // depth 0 evenly, then deeper layers by the mean of their users, then two refinement sweeps
  var p0 = place(layers[0], layers[0].map(function (_, i) { return (W0 - layers[0].length * 5) / 2 + i * 5 + 2.5; }), 2, 5);
  layers[0].forEach(function (id) { cx[id] = p0[id].x + 1; });
  function placeLayer(d, sources) {
    var ids = layers[d];
    var want = ids.map(function (id) {
      var n = sources(id).filter(function (o) { return cx[o] != null; }).map(function (o) { return cx[o]; });
      if (!n.length) n = coRecipe(id).map(function (o) { return cx[o]; });
      return n.length ? mean(n) : (cx[id] != null ? cx[id] : NaN);
    });
    var p = place(ids, want, 2, 5);
    ids.forEach(function (id) { cx[id] = p[id].x + 1; });
  }
  for (d = 1; d <= D; d++) placeLayer(d, function (id) { return neighbours(id, 'users'); });
  for (var pass = 0; pass < 2; pass++) {
    for (d = D - 1; d >= 0; d--) placeLayer(d, function (id) { return neighbours(id, 'users').concat(neighbours(id, 'providers')); });
    for (d = 1; d <= D; d++) placeLayer(d, function (id) { return neighbours(id, 'users').concat(neighbours(id, 'providers')); });
  }

  R.inds = cat.bricks.map(function (b) {
    return { kind: 'industry', id: 'i:' + R.id + ':' + b.id, ref: b.id, brick: b, region: R, x: cx[b.id] - 1, y: layerY(depth[b.id]), w: 2, d: 2,
      shape: CAT_SHAPE[b.category] || 'factory', tone: CAT_TOKEN[b.category] || 'ind-other' };
  });

  // M-3, A-5: cities in two staggered rows at the front
  var yC = 10 + 6 * D;
  var pc = place(cat.recipes.map(function (r) { return r.id; }), cat.recipes.map(function (r) {
    return mean(r.bricks.filter(function (b) { return cx[b] != null; }).map(function (b) { return cx[b]; }));
  }), 3, 4);
  R.cities = cat.recipes.map(function (r) {
    var p = pc[r.id];
    return { kind: 'city', id: 'c:' + R.id + ':' + r.id, ref: r.id, recipe: r, region: R, x: p.x, y: yC + (p.rank % 2) * 4, w: 3, d: 3 };
  });

  // depots at the back, above what runs on them
  var plats = cat.platforms || [];
  function hosted(pid) {
    return cat.bricks.filter(function (b) { return (b.runsOn || []).indexOf(pid) >= 0 || (b.requires || []).indexOf(pid) >= 0; });
  }
  var pd = place(plats.map(function (p) { return p.id; }), plats.map(function (p) {
    return mean(hosted(p.id).map(function (b) { return cx[b.id]; }));
  }), 3, 5);
  R.depots = plats.map(function (p) {
    return { kind: 'depot', id: 'd:' + R.id + ':' + p.id, ref: p.id, platform: p, region: R, x: pd[p.id].x, y: 0, w: 3, d: 2,
      hosts: hosted(p.id).map(function (b) { return b.id; }) };
  });
  R.h = yC + 7;
  return R;
}

function buildWorld(pkg) {
  var M = 3, GAP = 8, regions = [], ox = M, H = 0;
  pkg.collection.topics.forEach(function (t, i) {
    var R = buildRegion(pkg.profiles[t.file], t, i);
    R.ox = ox; R.oy = M; ox += R.w + GAP; H = Math.max(H, R.h); regions.push(R);
  });
  var W = ox - GAP + M; H += 2 * M;
  var G = { W: W, H: H, regions: regions, buildings: [], lines: [], trains: [], decor: [],
    occ: new Int32Array(W * H), near: new Uint8Array(W * H), water: new Uint8Array(W * H), sand: new Uint8Array(W * H),
    track: new Uint8Array(W * H), conn: new Uint8Array(W * H), tileLines: {} };
  function idx(x, y) { return y * W + x; }
  G.idx = idx;

  regions.forEach(function (R) {
    R.inds.concat(R.cities, R.depots).forEach(function (b) { b.x += R.ox; b.y += R.oy; G.buildings.push(b); });
  });
  G.buildings.forEach(function (b, bi) {
    for (var y = b.y - 1; y <= b.y + b.d; y++) for (var x = b.x - 1; x <= b.x + b.w; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.d) G.occ[idx(x, y)] = bi + 1; else G.near[idx(x, y)] = 1;
    }
    b.back = { x: b.x + Math.floor(b.w / 2), y: b.y - 1 };
    b.front = { x: b.x + Math.floor(b.w / 2), y: b.y + b.d };
  });

  // a river between regions, with sandy banks
  regions.slice(1).forEach(function (R) {
    var c = R.ox - GAP / 2;
    for (var y = 0; y < H; y++) {
      var off = Math.round((noise(c, y, 6, 'river') - 0.5) * 3);
      for (var dx = -1; dx <= 0; dx++) G.water[idx(c + off + dx, y)] = 1;
      G.sand[idx(c + off - 2, y)] = 1; G.sand[idx(c + off + 1, y)] = 1;
    }
  });

  // anchors are free to route through
  G.buildings.forEach(function (b) { [b.back, b.front].forEach(function (a) { G.near[idx(a.x, a.y)] = 0; }); });

  var byKey = {}; G.buildings.forEach(function (b) { byKey[b.id] = b; });
  function ind(R, id) { return byKey['i:' + R.id + ':' + id]; }

  // M-2: one track per pair of bricks, one train per stud
  regions.forEach(function (R) {
    var pairs = {};
    R.edges.forEach(function (e) {
      var k = e.from + '>' + e.to;
      if (!pairs[k]) pairs[k] = { type: 'freight', region: R, a: ind(R, e.from), b: ind(R, e.to), studs: [], recipes: [] };
      pairs[k].studs.push(e.stud);
      e.recipes.forEach(function (r) { if (pairs[k].recipes.indexOf(r) < 0) pairs[k].recipes.push(r); });
    });
    Object.keys(pairs).forEach(function (k) { G.lines.push(pairs[k]); });
    // M-3: passenger line from each city to its entry bricks
    R.cities.forEach(function (c) {
      var rb = c.recipe.bricks;
      rb.filter(function (b) {
        return !R.edges.some(function (e) { return e.to === b && rb.indexOf(e.from) >= 0 && e.recipes.indexOf(c.ref) >= 0; });
      }).forEach(function (b) {
        if (ind(R, b)) G.lines.push({ type: 'passenger', region: R, a: c, b: ind(R, b), studs: [], recipes: [c.ref] });
      });
    });
  });

  G.lines.forEach(function (l) { l.len0 = Math.abs(l.a.back.x - l.b.front.x) + Math.abs(l.a.back.y - l.b.front.y); });
  var order = G.lines.slice().sort(function (p, q) { return p.len0 - q.len0; });
  order.forEach(function (l) {
    l.path = route(G, l.a.back, l.b.front) || [l.a.back, l.b.front];
    var p = l.path, li = G.lines.indexOf(l);
    for (var i = 0; i < p.length; i++) {
      var k = idx(p[i].x, p[i].y); G.track[k] = 1;
      (G.tileLines[k] = G.tileLines[k] || []).push(li);
      if (i > 0) link(G, p[i - 1], p[i]);
    }
    G.conn[idx(p[0].x, p[0].y)] |= 2;                     // into the user, +y
    G.conn[idx(p[p.length - 1].x, p[p.length - 1].y)] |= 8; // into the provider, -y
    l.poly = smoothPath(p);
  });

  // trains (M-6)
  G.lines.forEach(function (l, li) {
    if (l.type === 'passenger') G.trains.push({ line: li, tone: 'passenger', cars: 2, phase: rnd(li, 0, 'ph') * 9 });
    else l.studs.forEach(function (s, si) {
      G.trains.push({ line: li, tone: 'stud-' + ((l.region.studIndex[s] || 0) % 6), cars: 2, phase: rnd(li, si, 'ph') * 9 + si * 2.7 });
    });
  });

  placeDecor(G);
  return G;
}

function link(G, a, b) {
  for (var d = 0; d < 4; d++) {
    if (a.x + DIRS[d][0] === b.x && a.y + DIRS[d][1] === b.y) {
      G.conn[G.idx(a.x, a.y)] |= 1 << d; G.conn[G.idx(b.x, b.y)] |= 1 << ((d + 2) % 4);
    }
  }
}

// A* on tiles, preferring existing track and few turns (M-5)
function route(G, s, e) {
  var W = G.W, H = G.H, N = W * H * 5;
  var g = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
  var heap = [];
  function push(f, st) { heap.push([f, st]); var i = heap.length - 1; while (i > 0) { var p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; var t = heap[p]; heap[p] = heap[i]; heap[i] = t; i = p; } }
  function pop() {
    var top = heap[0], last = heap.pop();
    if (heap.length) { heap[0] = last; var i = 0; for (;;) { var l = 2 * i + 1, r = l + 1, m = i;
      if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
      if (m === i) break; var t = heap[m]; heap[m] = heap[i]; heap[i] = t; i = m; } }
    return top;
  }
  function hcost(x, y) { return (Math.abs(x - e.x) + Math.abs(y - e.y)) * 0.45; }
  var s0 = (s.y * W + s.x) * 5 + 4; g[s0] = 0; push(hcost(s.x, s.y), s0);
  while (heap.length) {
    var cur = pop()[1], tile = (cur / 5) | 0, d0 = cur % 5, x = tile % W, y = (tile / W) | 0;
    if (x === e.x && y === e.y) {
      var out = []; for (var c = cur; c >= 0; c = prev[c]) { var t2 = (c / 5) | 0; out.push({ x: t2 % W, y: (t2 / W) | 0 }); }
      return out.reverse();
    }
    for (var d = 0; d < 4; d++) {
      var nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      var k = ny * W + nx;
      if ((G.occ[k] || G.water[k]) && !(nx === e.x && ny === e.y)) continue;
      var cost = (G.track[k] ? 0.45 : 1) + (G.near[k] ? 1.6 : 0) + (d0 !== 4 && d0 !== d ? 0.7 : 0);
      var ns = k * 5 + d, ng = g[cur] + cost;
      if (ng < g[ns]) { g[ns] = ng; prev[ns] = cur; push(ng + hcost(nx, ny), ns); }
    }
  }
  return null;
}

// a dense polyline through tile centres, rounded at corners, from the user's building edge to the provider's
function smoothPath(p) {
  var P = [{ x: p[0].x + 0.5, y: p[0].y + 1 }];
  p.forEach(function (t) { P.push({ x: t.x + 0.5, y: t.y + 0.5 }); });
  P.push({ x: p[p.length - 1].x + 0.5, y: p[p.length - 1].y });
  var pts = [P[0]];
  for (var i = 1; i < P.length - 1; i++) {
    var a = { x: (P[i - 1].x + P[i].x) / 2, y: (P[i - 1].y + P[i].y) / 2 }, b = { x: (P[i].x + P[i + 1].x) / 2, y: (P[i].y + P[i + 1].y) / 2 };
    for (var k = 0; k <= 6; k++) {
      var t = k / 6, u = 1 - t;
      pts.push({ x: u * u * a.x + 2 * u * t * P[i].x + t * t * b.x, y: u * u * a.y + 2 * u * t * P[i].y + t * t * b.y });
    }
  }
  pts.push(P[P.length - 1]);
  var cum = [0];
  for (i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts: pts, cum: cum, len: cum[cum.length - 1] };
}
function along(poly, s) {
  s = Math.max(0, Math.min(poly.len, s));
  var lo = 0, hi = poly.cum.length - 1;
  while (hi - lo > 1) { var m = (lo + hi) >> 1; if (poly.cum[m] <= s) lo = m; else hi = m; }
  var a = poly.pts[lo], b = poly.pts[hi], seg = poly.cum[hi] - poly.cum[lo] || 1, t = (s - poly.cum[lo]) / seg;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, tx: (b.x - a.x) / seg, ty: (b.y - a.y) / seg };
}

function placeDecor(G) {
  var W = G.W, H = G.H;
  function free(x, y) { var k = y * W + x; return x >= 0 && y >= 0 && x < W && y < H && !G.occ[k] && !G.near[k] && !G.track[k] && !G.water[k] && !G.taken[k]; }
  G.taken = new Uint8Array(W * H);
  G.townArea = new Uint8Array(W * H);   // keep a clearing around towns
  G.buildings.forEach(function (b) { if (b.kind !== 'city') return;
    for (var yy = b.y - 3; yy <= b.y + b.d + 2; yy++) for (var xx = b.x - 3; xx <= b.x + b.w + 2; xx++) if (xx >= 0 && yy >= 0 && xx < W && yy < H) G.townArea[yy * W + xx] = 1; });
  // A-4 / M-1: rough land around cities with hard installation (rocks and hills)
  G.regions.forEach(function (R) {
    R.cities.forEach(function (c) {
      var stars = (c.recipe.difficulty && c.recipe.difficulty.installation.stars) || 1, n = Math.max(0, stars - 2) * 2;
      for (var i = 0, tries = 0; i < n && tries < 120; tries++) {
        var ang = rnd(tries, i, c.id) * Math.PI * 2, rad = 2.5 + rnd(i, tries, c.id + 'r') * 3.5;
        var x = Math.round(c.x + 1 + Math.cos(ang) * rad), y = Math.round(c.y + 1 + Math.sin(ang) * rad);
        if (!free(x, y)) continue;
        G.taken[y * W + x] = 1; i++;
        G.decor.push({ kind: stars >= 4 && i % 3 === 0 ? 'hill' : 'rock', x: x, y: y, v: rnd(x, y, 'rk') });
      }
    });
  });
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
    if (!free(x, y)) continue;
    var edge = Math.min(x, y, W - 1 - x, H - 1 - y), n = noise(x, y, 5, 'forest');
    var p = edge < 2 ? 0.75 : edge < 4 ? 0.3 : (n > 0.64 ? 0.55 : n > 0.54 ? 0.08 : 0.01);
    if (G.townArea[y * W + x]) p = Math.min(p, 0.04);
    if (rnd(x, y, 'tree') < p) { G.decor.push({ kind: 'tree', x: x, y: y, v: rnd(x, y, 'tv') }); G.taken[y * W + x] = 1; }
  }
}

/* ---------------- drawing ---------------- */
var canvas = document.getElementById('map'), ctx = canvas.getContext('2d');
var PAL = {}, SH = {}, NIGHT = false, FONT_D = 'sans-serif', FONT_M = 'monospace';
var G = buildWorld(PKG);
var cam = { x: 0, y: 0, z: 1 }, view = { w: 0, h: 0, dpr: 1 };
var state = { sel: null, hover: null, service: false, hl: null };
var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
var paths = null, trackPaths = null, needDraw = true;

function readPalette() {
  var cs = getComputedStyle(document.documentElement);
  TOKENS.forEach(function (t) {
    var m = /^#([0-9a-f]{6})$/i.exec(cs.getPropertyValue('--' + t).trim()), n = m ? parseInt(m[1], 16) : 0x808080;
    PAL[t] = [n >> 16 & 255, n >> 8 & 255, n & 255];
  });
  NIGHT = cs.getPropertyValue('--night').trim() === '1';
  FONT_D = cs.getPropertyValue('--font-display').trim() || FONT_D;
  FONT_M = cs.getPropertyValue('--font-mono').trim() || FONT_M;
  SH = {}; needDraw = true;
}
// A-2: one shading model for every face
function col(t, f, a) {
  var key = t + '|' + f + '|' + a; if (SH[key]) return SH[key];
  var c = PAL[t] || [128, 128, 128]; f = f == null ? 1 : f;
  var r = Math.min(255, Math.round(c[0] * f)), g = Math.min(255, Math.round(c[1] * f)), b = Math.min(255, Math.round(c[2] * f));
  return (SH[key] = a == null ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')');
}
var F_TOP = 1, F_LEFT = 0.86, F_RIGHT = 0.68;

function iso(gx, gy, z) { return [(gx - gy) * HW, (gx + gy) * HH - (z || 0)]; }
function fillPoly(pts, style) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fillStyle = style; ctx.fill();
}
function box(x, y, w, d, z0, h, t, edge) {
  var z1 = z0 + h;
  fillPoly([iso(x, y + d, z0), iso(x + w, y + d, z0), iso(x + w, y + d, z1), iso(x, y + d, z1)], col(t, F_LEFT));
  fillPoly([iso(x + w, y, z0), iso(x + w, y + d, z0), iso(x + w, y + d, z1), iso(x + w, y, z1)], col(t, F_RIGHT));
  fillPoly([iso(x, y, z1), iso(x + w, y, z1), iso(x + w, y + d, z1), iso(x, y + d, z1)], col(t, F_TOP));
  if (edge !== false) {
    ctx.strokeStyle = col(t, 0.5, 0.35); ctx.lineWidth = 0.7; ctx.beginPath();
    var a = iso(x, y + d, z1), b = iso(x + w, y + d, z1), c = iso(x + w, y, z1), e = iso(x + w, y + d, z0);
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.moveTo(b[0], b[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
  }
}
function roofX(x, y, w, d, z, r, t, wall) {   // ridge along x
  var ym = y + d / 2;
  fillPoly([iso(x, y, z), iso(x + w, y, z), iso(x + w, ym, z + r), iso(x, ym, z + r)], col(t, 1.08));
  fillPoly([iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, ym, z + r), iso(x, ym, z + r)], col(t, 0.88));
  fillPoly([iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, ym, z + r)], col(wall, F_RIGHT));
}
function roofY(x, y, w, d, z, r, t, wall) {   // ridge along y
  var xm = x + w / 2;
  fillPoly([iso(x, y, z), iso(xm, y, z + r), iso(xm, y + d, z + r), iso(x, y + d, z)], col(t, 1.0));
  fillPoly([iso(xm, y, z + r), iso(x + w, y, z), iso(x + w, y + d, z), iso(xm, y + d, z + r)], col(t, 0.74));
  fillPoly([iso(x, y + d, z), iso(x + w, y + d, z), iso(xm, y + d, z + r)], col(wall, F_LEFT));
}
function winL(x, y, d, u0, u1, z0, z1, t) { fillPoly([iso(x + u0, y + d, z0), iso(x + u1, y + d, z0), iso(x + u1, y + d, z1), iso(x + u0, y + d, z1)], col(t, NIGHT ? 1 : 0.9)); }
function winR(x, y, w, u0, u1, z0, z1, t) { fillPoly([iso(x + w, y + u0, z0), iso(x + w, y + u1, z0), iso(x + w, y + u1, z1), iso(x + w, y + u0, z1)], col(t, NIGHT ? 0.85 : 0.72)); }
function cylinder(cx, cy, r, z0, h, t) {
  var c = iso(cx, cy, z0), rx = r * HW * 1.4142, ry = r * HH * 1.4142;
  var gr = ctx.createLinearGradient(c[0] - rx, 0, c[0] + rx, 0);
  gr.addColorStop(0, col(t, 0.96)); gr.addColorStop(0.45, col(t, 0.84)); gr.addColorStop(1, col(t, 0.6));
  ctx.beginPath(); ctx.moveTo(c[0] - rx, c[1] - h); ctx.lineTo(c[0] - rx, c[1]);
  ctx.ellipse(c[0], c[1], rx, ry, 0, Math.PI, 0, true); ctx.lineTo(c[0] + rx, c[1] - h); ctx.closePath();
  ctx.fillStyle = gr; ctx.fill();
  ctx.beginPath(); ctx.ellipse(c[0], c[1] - h, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = col(t, 1.1); ctx.fill();
  ctx.strokeStyle = col(t, 0.55, 0.5); ctx.lineWidth = 0.8; ctx.stroke();
}
function dome(cx, cy, r, z0, h, t) {
  var c = iso(cx, cy, z0), rx = r * HW * 1.4142, ry = r * HH * 1.4142;
  var gr = ctx.createLinearGradient(c[0] - rx, 0, c[0] + rx, 0);
  gr.addColorStop(0, col(t, 1.05)); gr.addColorStop(0.5, col(t, 0.9)); gr.addColorStop(1, col(t, 0.62));
  ctx.beginPath(); ctx.moveTo(c[0] - rx, c[1]);
  ctx.bezierCurveTo(c[0] - rx, c[1] - h * 1.3, c[0] + rx, c[1] - h * 1.3, c[0] + rx, c[1]);
  ctx.ellipse(c[0], c[1], rx, ry, 0, 0, Math.PI, false); ctx.closePath(); ctx.fillStyle = gr; ctx.fill();
}
function smoke(gx, gy, z, t, seed, amount) {
  if (reduce.matches) return;
  var base = iso(gx, gy, z);
  for (var i = 0; i < amount; i++) {
    var age = ((t / 2200) + i / amount + seed) % 1;
    ctx.beginPath(); ctx.arc(base[0] + age * 10 + Math.sin(age * 6 + seed * 9) * 2, base[1] - age * 30, 2.5 + age * 5, 0, Math.PI * 2);
    ctx.fillStyle = col('smoke', 1, (1 - age) * 0.55); ctx.fill();
  }
}
function blink(gx, gy, z, t, seed) {
  var on = reduce.matches || ((t / 900 + seed) % 1) < 0.5;
  if (!on) return; var p = iso(gx, gy, z);
  ctx.beginPath(); ctx.arc(p[0], p[1], 2.2, 0, Math.PI * 2); ctx.fillStyle = col('hover'); ctx.fill();
}

/* buildings: A-4 silhouettes */
function drawIndustry(b, t) {
  var x = b.x, y = b.y, tone = b.tone, s = hash(b.id) / 4294967296;
  switch (b.shape) {
    case 'tower':
      box(x + 0.25, y + 0.25, 1.5, 1.5, 0, 8, 'wall-2');
      box(x + 0.5, y + 0.5, 1, 1, 8, 30, tone);
      for (var k = 0; k < 3; k++) { winL(x + 0.5, y + 0.5, 1, 0.15, 0.4, 14 + k * 8, 18 + k * 8, 'window'); winL(x + 0.5, y + 0.5, 1, 0.6, 0.85, 14 + k * 8, 18 + k * 8, 'window'); winR(x + 0.5, y + 0.5, 1, 0.3, 0.7, 14 + k * 8, 18 + k * 8, 'window'); }
      box(x + 0.45, y + 0.45, 1.1, 1.1, 38, 8, 'glass');
      box(x + 0.5, y + 0.5, 1, 1, 46, 3, tone);
      var a0 = iso(x + 1, y + 1, 49), a1 = iso(x + 1, y + 1, 64);
      ctx.strokeStyle = col('steel'); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke();
      blink(x + 1, y + 1, 65, t, s);
      return 66;
    case 'silo':
      box(x + 0.15, y + 1.2, 0.8, 0.65, 0, 12, 'wall-2'); roofX(x + 0.15, y + 1.2, 0.8, 0.65, 12, 5, 'shed-roof', 'wall-2');
      var silos = [[x + 0.6, y + 0.55, 30], [x + 1.45, y + 0.6, 26], [x + 1.45, y + 1.45, 22]];
      silos.forEach(function (c) { cylinder(c[0], c[1], 0.36, 0, c[2], tone); });
      return 40;
    case 'dome':
      box(x + 0.2, y + 0.3, 1.6, 1.4, 0, 14, 'wall-1');
      winL(x + 0.2, y + 0.3, 1.4, 0.2, 0.55, 4, 10, 'window'); winL(x + 0.2, y + 0.3, 1.4, 0.9, 1.3, 4, 10, 'window');
      winR(x + 0.2, y + 0.3, 1.6, 0.3, 0.7, 4, 10, 'window'); winR(x + 0.2, y + 0.3, 1.6, 0.9, 1.2, 4, 10, 'window');
      box(x + 0.2, y + 0.3, 1.6, 1.4, 14, 3, tone);
      dome(x + 1, y + 1, 0.55, 17, 22, tone);
      return 42;
    case 'relay':
      box(x + 0.25, y + 0.35, 1.5, 1.4, 0, 13, tone);
      winL(x + 0.25, y + 0.35, 1.4, 0.25, 0.65, 4, 9, 'window'); winL(x + 0.25, y + 0.35, 1.4, 0.9, 1.3, 4, 9, 'window');
      box(x + 1.25, y + 0.5, 0.16, 0.16, 13, 30, 'steel', false);
      var dc = iso(x + 1.33, y + 0.58, 40);
      ctx.beginPath(); ctx.ellipse(dc[0] - 6, dc[1], 7, 4, -0.5, 0, Math.PI * 2); ctx.fillStyle = col('wall-1', 0.95); ctx.fill();
      ctx.strokeStyle = col('steel', 0.8); ctx.lineWidth = 1; ctx.stroke();
      blink(x + 1.33, y + 0.58, 45, t, s);
      return 46;
    case 'workshop':
      box(x + 0.2, y + 0.3, 1.5, 1.2, 0, 12, tone);
      winL(x + 0.2, y + 0.3, 1.2, 0.2, 0.55, 3, 8, 'window'); winL(x + 0.2, y + 0.3, 1.2, 0.85, 1.3, 0, 9, 'door');
      winR(x + 0.2, y + 0.3, 1.5, 0.35, 0.8, 3, 8, 'window');
      roofY(x + 0.2, y + 0.3, 1.5, 1.2, 12, 10, 'shed-roof', tone);
      box(x + 1.45, y + 1.55, 0.3, 0.3, 0, 6, 'soil'); box(x + 1.05, y + 1.6, 0.28, 0.28, 0, 5, 'soil');
      box(x + 0.4, y + 0.35, 0.2, 0.2, 18, 9, 'roof-1', false); smoke(x + 0.5, y + 0.45, 27, t, s, 4);
      return 30;
    default: // factory with saw-tooth roof and a chimney
      box(x + 0.15, y + 0.35, 1.7, 1.4, 0, 18, tone);
      for (k = 0; k < 4; k++) winL(x + 0.15, y + 0.35, 1.4, 0.12 + k * 0.4, 0.35 + k * 0.4, 5, 12, 'window');
      winR(x + 0.15, y + 0.35, 1.7, 0.3, 0.6, 5, 12, 'window'); winR(x + 0.15, y + 0.35, 1.7, 0.85, 1.15, 5, 12, 'window');
      var tw = 1.7 / 3, y0 = y + 0.35, y1 = y + 1.75;
      for (k = 0; k < 3; k++) {
        var x0 = x + 0.15 + k * tw;
        fillPoly([iso(x0, y0, 18), iso(x0, y1, 18), iso(x0 + tw, y1, 26), iso(x0 + tw, y0, 26)], col('shed-roof', 0.98));
        fillPoly([iso(x0 + tw, y0, 18), iso(x0 + tw, y1, 18), iso(x0 + tw, y1, 26), iso(x0 + tw, y0, 26)], col('glass', NIGHT ? 0.9 : 0.75));
        fillPoly([iso(x0, y1, 18), iso(x0 + tw, y1, 18), iso(x0 + tw, y1, 26)], col(tone, F_LEFT));
      }
      box(x + 0.25, y + 0.45, 0.3, 0.3, 18, 24, 'roof-1');
      smoke(x + 0.4, y + 0.6, 42, t, s, 5);
      return 46;
  }
}
function drawDepot(b) {
  var x = b.x, y = b.y;
  box(x + 0.15, y + 0.25, 2.7, 1.55, 0, 16, 'shed-wall');
  [[0.3, 0.8], [1.1, 1.6], [1.9, 2.4]].forEach(function (u) {
    var a = iso(x + 0.15 + u[0], y + 1.8, 0), bb = iso(x + 0.15 + u[1], y + 1.8, 0), top = iso(x + 0.15 + (u[0] + u[1]) / 2, y + 1.8, 13);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0], a[1] - 9); ctx.quadraticCurveTo(top[0] - 6, top[1] - 2, top[0], top[1]);
    ctx.quadraticCurveTo(top[0] + 6, top[1] + 2, bb[0], bb[1] - 9); ctx.lineTo(bb[0], bb[1]); ctx.closePath();
    ctx.fillStyle = col('door', NIGHT ? 1.4 : 1); ctx.fill();
  });
  winR(x + 0.15, y + 0.25, 2.7, 0.35, 0.75, 7, 12, 'window'); winR(x + 0.15, y + 0.25, 2.7, 0.95, 1.3, 7, 12, 'window');
  roofX(x + 0.15, y + 0.25, 2.7, 1.55, 16, 9, 'shed-roof', 'shed-wall');
  box(x + 0.9, y + 0.9, 0.9, 0.2, 22, 4, 'shed-roof', false);
  return 30;
}
function drawStation(c) {
  var x = c.x, y = c.y;
  box(x + 0.25, y + 0.3, 2.5, 0.5, 0, 3, 'platform');
  box(x + 0.6, y + 0.4, 0.06, 0.06, 3, 9, 'steel', false); box(x + 2.3, y + 0.4, 0.06, 0.06, 3, 9, 'steel', false);
  box(x + 0.5, y + 0.3, 1.95, 0.45, 12, 2, 'shed-roof');
  return 16;
}
var HOUSE_CELLS = [[1, 1], [0, 1], [2, 1], [1, 2], [0, 2], [2, 2]];
function drawHouse(hx, hy, v, i) {
  var wall = v < 0.5 ? 'wall-1' : 'wall-2', roof = ['roof-1', 'roof-2', 'roof-3'][Math.floor(v * 3) % 3], h = 9 + Math.round(v * 2) * 4;
  var x = hx + 0.17, y = hy + 0.2, w = 0.66, d = 0.6;
  box(x, y, w, d, 0, h, wall);
  winL(x, y, d, 0.12, 0.28, h - 7, h - 3, 'window'); winL(x, y, d, 0.4, 0.56, 0, 6, 'door');
  winR(x, y, w, 0.2, 0.38, h - 7, h - 3, 'window');
  if (i % 2) roofY(x, y, w, d, h, 9, roof, wall); else roofX(x, y, w, d, h, 9, roof, wall);
  return h + 9;
}
function drawTree(o) {
  var x = o.x + 0.35 + o.v * 0.2, y = o.y + 0.35 + (1 - o.v) * 0.2, tone = ['tree-1', 'tree-2', 'tree-3'][Math.floor(o.v * 3)];
  box(x + 0.12, y + 0.12, 0.08, 0.08, 0, 5, 'trunk', false);
  if (o.v > 0.45) { box(x, y, 0.32, 0.32, 5, 10, tone); box(x + 0.07, y + 0.07, 0.18, 0.18, 15, 8, tone); }
  else { box(x - 0.03, y - 0.03, 0.38, 0.38, 5, 13, tone); }
}
function drawRock(o) {
  if (o.kind === 'hill') {
    box(o.x + 0.05, o.y + 0.05, 0.9, 0.9, 0, 6, 'grass-edge'); box(o.x + 0.2, o.y + 0.2, 0.6, 0.6, 6, 6, 'grass-2'); box(o.x + 0.35, o.y + 0.35, 0.3, 0.3, 12, 5, 'rock');
  } else {
    box(o.x + 0.2, o.y + 0.3, 0.35, 0.3, 0, 5 + o.v * 4, 'rock'); box(o.x + 0.55, o.y + 0.5, 0.22, 0.2, 0, 3, 'rock');
  }
}
function drawTrain(tr, t) {
  var l = G.lines[tr.line], poly = l.poly, n = tr.cars, span = n * CAR_GAP;
  var travel = Math.max(0.01, poly.len - span), T = 2 * (travel / SPEED + DWELL);
  var u = reduce.matches ? 0 : ((t / 1000 + tr.phase) % T + T) % T, s, loaded, fwd;
  if (u < DWELL) { s = 0; loaded = false; fwd = 1; }
  else if (u < DWELL + travel / SPEED) { s = (u - DWELL) * SPEED; loaded = false; fwd = 1; }
  else if (u < 2 * DWELL + travel / SPEED) { s = travel; loaded = true; fwd = -1; }
  else { s = travel - (u - 2 * DWELL - travel / SPEED) * SPEED; loaded = true; fwd = -1; }
  var parts = [];
  for (var i = 0; i <= n; i++) parts.push(along(poly, s + span - i * CAR_GAP));   // part 0 is the loco, nearest the provider
  return parts.map(function (p, i) {
    return { key: p.x + p.y + 0.02, draw: function () {
      var horiz = Math.abs(p.tx) >= Math.abs(p.ty), L = i ? 0.46 : 0.5, Wd = 0.3;
      var w = horiz ? L : Wd, d = horiz ? Wd : L, x = p.x - w / 2, y = p.y - d / 2;
      if (i === 0) {
        box(x, y, w, d, 1, 8, tr.tone);
        var bx = horiz ? x + (p.tx > 0 ? 0 : w * 0.55) : x, by = horiz ? y : y + (p.ty > 0 ? 0 : d * 0.55);
        box(bx, by, horiz ? w * 0.45 : w, horiz ? d : d * 0.45, 9, 5, tr.tone);
        if (NIGHT && fwd === 1) {
          var hp = iso(p.x + p.tx * 0.3, p.y + p.ty * 0.3, 5);
          var gl = ctx.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], 16);
          gl.addColorStop(0, col('headlight', 1, 0.7)); gl.addColorStop(1, col('headlight', 1, 0));
          ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(hp[0], hp[1], 16, 0, Math.PI * 2); ctx.fill();
        }
        if (u > DWELL && u < DWELL + travel / SPEED || u > 2 * DWELL + travel / SPEED) smoke(p.x, p.y, 15, t, tr.phase, 3);
      } else if (tr.tone === 'passenger') {
        box(x, y, w, d, 1, 8, 'passenger');
        if (horiz) winL(x, y, d, 0.08, w - 0.08, 4, 7, 'window'); else winR(x, y, w, 0.08, d - 0.08, 4, 7, 'window');
      } else {
        box(x, y, w, d, 1, 4, 'steel');
        if (loaded) box(x + 0.05, y + 0.05, w - 0.1, d - 0.1, 5, 4, tr.tone === 'passenger' ? 'cargo' : tr.tone);
      }
    } };
  });
}

/* static ground and tracks, built once per layout / selection */
function buildGround() {
  paths = { base: new Path2D(), 'grass-2': new Path2D(), 'grass-3': new Path2D(), water: new Path2D(), sand: new Path2D(), ripple: new Path2D() };
  var c0 = iso(0, 0), c1 = iso(G.W, 0), c2 = iso(G.W, G.H), c3 = iso(0, G.H);
  paths.base.moveTo(c0[0], c0[1]); paths.base.lineTo(c1[0], c1[1]); paths.base.lineTo(c2[0], c2[1]); paths.base.lineTo(c3[0], c3[1]); paths.base.closePath();
  for (var y = 0; y < G.H; y++) for (var x = 0; x < G.W; x++) {
    var k = G.idx(x, y), v = rnd(x, y, 'g'), target = G.water[k] ? 'water' : G.sand[k] ? 'sand' : v < 0.33 ? 'grass-2' : v < 0.55 ? 'grass-3' : null;
    if (!target) continue;
    var a = iso(x, y), b = iso(x + 1, y), c = iso(x + 1, y + 1), d = iso(x, y + 1), p = paths[target];
    p.moveTo(a[0], a[1]); p.lineTo(b[0], b[1]); p.lineTo(c[0], c[1]); p.lineTo(d[0], d[1]); p.closePath();
    if (target === 'water' && v < 0.5) { var m = iso(x + 0.3, y + 0.5); paths.ripple.moveTo(m[0], m[1]); paths.ripple.lineTo(m[0] + 10, m[1] + 1); }
  }
}
function tileSegments(p, x, y, bits) {
  var ds = []; for (var i = 0; i < 4; i++) if (bits & (1 << i)) ds.push(i);
  var cx = x + 0.5, cy = y + 0.5, C = iso(cx, cy);
  function mid(d) { return iso(cx + DIRS[d][0] * 0.5, cy + DIRS[d][1] * 0.5); }
  if (ds.length === 2 && (ds[0] + ds[1]) % 2 === 1) { var A = mid(ds[0]), B = mid(ds[1]); p.moveTo(A[0], A[1]); p.quadraticCurveTo(C[0], C[1], B[0], B[1]); }
  else if (ds.length === 2) { A = mid(ds[0]); B = mid(ds[1]); p.moveTo(A[0], A[1]); p.lineTo(B[0], B[1]); }
  else ds.forEach(function (d) { var M = mid(d); p.moveTo(C[0], C[1]); p.lineTo(M[0], M[1]); });
}
function buildTracks() {
  trackPaths = { lit: new Path2D(), dim: new Path2D() };
  for (var y = 0; y < G.H; y++) for (var x = 0; x < G.W; x++) {
    var k = G.idx(x, y); if (!G.conn[k]) continue;
    var lit = !state.hl || (G.tileLines[k] || []).some(function (li) { return state.hl.lines[li]; });
    tileSegments(lit ? trackPaths.lit : trackPaths.dim, x, y, G.conn[k]);
  }
}
function strokeTracks(p, alpha) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  ctx.strokeStyle = col('ballast'); ctx.lineWidth = 12; ctx.stroke(p);
  ctx.setLineDash([2.2, 3.4]); ctx.strokeStyle = col('tie'); ctx.lineWidth = 10; ctx.stroke(p); ctx.setLineDash([]);
  ctx.strokeStyle = col('rail'); ctx.lineWidth = 6.5; ctx.stroke(p);
  ctx.strokeStyle = col('ballast', 0.92); ctx.lineWidth = 3.6; ctx.stroke(p);
  ctx.restore();
}

/* highlight (M-8) */
function computeHL(sel) {
  if (!sel) return null;
  var b = sel, hl = { bld: {}, lines: {}, service: {} };
  hl.bld[b.id] = 1;
  var R = b.region;
  if (b.kind === 'city') {
    b.recipe.bricks.forEach(function (id) { hl.bld['i:' + R.id + ':' + id] = 1; });
    G.lines.forEach(function (l, li) { if (l.region === R && l.recipes.indexOf(b.ref) >= 0) hl.lines[li] = 1; });
  } else if (b.kind === 'industry') {
    G.lines.forEach(function (l, li) { if (l.a === b || l.b === b) { hl.lines[li] = 1; hl.bld[l.a.id] = 1; hl.bld[l.b.id] = 1; } });
    R.cities.forEach(function (c) { if (c.recipe.bricks.indexOf(b.ref) >= 0) hl.bld[c.id] = 1; });
  } else {
    b.hosts.forEach(function (id) { hl.bld['i:' + R.id + ':' + id] = 1; });
    R.depots.forEach(function (d) { if ((d.platform.runsOn || []).indexOf(b.ref) >= 0) hl.bld[d.id] = 1; });
    hl.service[b.id] = 1;
  }
  return hl;
}
function select(b, focus) {
  state.sel = b; state.hl = computeHL(b); buildTracks(); renderPanel(); needDraw = true;
  if (b && focus) flyTo(b);
}

/* frame */
function bheight(b) { return b.kind === 'city' ? 26 : b.kind === 'depot' ? 30 : 50; }
function frame(t) {
  var dpr = view.dpr, z = cam.z;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = col('sky'); ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (view.w / 2 - cam.x * z), dpr * (view.h / 2 - cam.y * z));

  // diorama slab
  var L0 = iso(0, G.H), L1 = iso(G.W, G.H), R0 = iso(G.W, 0);
  fillPoly([L0, L1, [L1[0], L1[1] + 28], [L0[0], L0[1] + 28]], col('soil', F_LEFT));
  fillPoly([L1, R0, [R0[0], R0[1] + 28], [L1[0], L1[1] + 28]], col('soil', F_RIGHT));
  fillPoly([L0, L1, [L1[0], L1[1] + 5], [L0[0], L0[1] + 5]], col('grass-edge', F_LEFT));
  fillPoly([L1, R0, [R0[0], R0[1] + 5], [L1[0], L1[1] + 5]], col('grass-edge', F_RIGHT));
  ctx.fillStyle = col('grass-1'); ctx.fill(paths.base);
  ctx.fillStyle = col('grass-2'); ctx.fill(paths['grass-2']);
  ctx.fillStyle = col('grass-3'); ctx.fill(paths['grass-3']);
  ctx.fillStyle = col('sand'); ctx.fill(paths.sand);
  ctx.fillStyle = col('water'); ctx.fill(paths.water);
  ctx.strokeStyle = col('water-hi'); ctx.lineWidth = 1.5; ctx.stroke(paths.ripple);

  strokeTracks(trackPaths.dim, state.hl ? 0.3 : 1);
  strokeTracks(trackPaths.lit, 1);

  // service lines (M-11)
  G.buildings.forEach(function (b) {
    if (b.kind !== 'depot' || !(state.service || (state.hl && state.hl.service[b.id]))) return;
    var from = iso(b.x + 1.5, b.y + 2, 0);
    ctx.save(); ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.strokeStyle = col('muted', 1, state.hl && !state.hl.service[b.id] ? 0.25 : 0.9);
    b.hosts.forEach(function (id) {
      var ib = G.buildings.find(function (o) { return o.id === 'i:' + b.region.id + ':' + id; });
      if (!ib) return; var to = iso(ib.x + 1, ib.y, 0);
      ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(to[0], to[1]); ctx.stroke();
    });
    ctx.restore();
  });

  // hover and selection footprints
  [state.hover, state.sel].forEach(function (b, i) {
    if (!b) return;
    var pts = [iso(b.x - 0.1, b.y - 0.1), iso(b.x + b.w + 0.1, b.y - 0.1), iso(b.x + b.w + 0.1, b.y + b.d + 0.1), iso(b.x - 0.1, b.y + b.d + 0.1)];
    if (i === 1) fillPoly(pts, col('hover', 1, 0.28));
    ctx.beginPath(); pts.forEach(function (p, j) { j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.closePath();
    ctx.strokeStyle = col('hover'); ctx.lineWidth = 2.5 / Math.max(0.6, cam.z); ctx.stroke();
  });

  // objects, depth sorted (depth-sorting-occlusion: anchor = front tile)
  var items = [];
  G.decor.forEach(function (o) { items.push({ key: o.x + o.y + 1, b: null, draw: function () { o.kind === 'tree' ? drawTree(o) : drawRock(o); } }); });
  G.buildings.forEach(function (b) {
    if (b.kind === 'city') {
      items.push({ key: b.x + b.y + 2.9, b: b, draw: function () { drawStation(b); } });
      var n = Math.max(2, Math.min(6, b.recipe.bricks.length));
      HOUSE_CELLS.forEach(function (c, i) {
        var hx = b.x + c[0], hy = b.y + c[1];
        items.push({ key: hx + hy + 1, b: b, draw: function () {
          if (i < n) drawHouse(hx, hy, rnd(hx, hy, 'house'), i); else drawTree({ x: hx, y: hy, v: rnd(hx, hy, 'ct') });
        } });
      });
    } else items.push({ key: b.x + b.w + b.y + b.d - 1, b: b, draw: function (tt) { return b.kind === 'depot' ? drawDepot(b) : drawIndustry(b, tt); } });
  });
  G.trains.forEach(function (tr) {
    var dimT = state.hl && !state.hl.lines[tr.line];
    drawTrain(tr, t).forEach(function (p) { p.dimTrain = dimT; items.push(p); });
  });
  items.sort(function (a, b) { return a.key - b.key; });
  items.forEach(function (it) {
    var dim = it.dimTrain || (state.hl && it.b && !state.hl.bld[it.b.id]);
    if (dim) ctx.globalAlpha = 0.32;
    it.draw(t);
    if (dim) ctx.globalAlpha = 1;
  });

  drawLabels();
}

/* labels: flat plates in screen space, no overlap (A-6) */
function toScreen(p) { return [(p[0] - cam.x) * cam.z + view.w / 2, (p[1] - cam.y) * cam.z + view.h / 2]; }
function drawLabels() {
  var dpr = view.dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  var placed = [];
  function plate(text, sx, sy, dot, big, mono) {
    ctx.font = (mono ? '500 11px ' + FONT_M : '600 ' + (big ? 15 : 13) + 'px ' + FONT_D);
    var label = mono ? text.toUpperCase() : text, w = Math.min(ctx.measureText(label).width, 180) + (dot ? 27 : 15), h = big ? 24 : 21;
    var r = { x: sx - w / 2, y: sy - h, w: w, h: h };
    if (r.x > view.w || r.y > view.h || r.x + r.w < 0 || r.y + r.h < 0) return;
    if (placed.some(function (q) { return r.x < q.x + q.w + 3 && q.x < r.x + r.w + 3 && r.y < q.y + q.h + 2 && q.y < r.y + r.h + 2; })) return;
    placed.push(r);
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(r.x, r.y, r.w, r.h, 6) : ctx.rect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = col('label-bg', 1, 0.94); ctx.fill(); ctx.strokeStyle = col('label-line'); ctx.lineWidth = 1; ctx.stroke();
    if (dot) { ctx.beginPath(); ctx.arc(r.x + 11, r.y + h / 2, 4, 0, Math.PI * 2); ctx.fillStyle = col(dot); ctx.fill(); }
    ctx.fillStyle = col(mono ? 'muted' : 'label-fg'); ctx.textBaseline = 'middle';
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w - 4, r.h); ctx.clip();
    ctx.fillText(label, r.x + (dot ? 19 : 7), r.y + h / 2 + 0.5); ctx.restore();
  }
  var list = G.buildings.map(function (b) {
    var lit = state.hl && state.hl.bld[b.id], pr = b === state.sel ? 0 : lit ? 1 : b.kind === 'city' ? 2 : b.kind === 'industry' ? 3 : 4;
    var show = pr <= 2 || (b.kind === 'industry' && cam.z >= 0.9 && !state.hl) || (b.kind === 'depot' && (state.service || cam.z >= 1.1) && !state.hl);
    return { b: b, pr: pr, show: show };
  }).filter(function (o) { return o.show; }).sort(function (a, b) { return a.pr - b.pr; });
  list.forEach(function (o) {
    var b = o.b, s = toScreen(iso(b.x + b.w / 2, b.y + b.d / 2, bheight(b) + 6));
    var text = b.kind === 'city' ? b.recipe.title : b.kind === 'industry' ? b.brick.name : b.platform.label;
    plate(text, s[0], s[1], b.kind === 'city' ? 'accent' : b.kind === 'industry' ? b.tone : 'shed-roof', b === state.sel);
  });
  G.regions.forEach(function (R) {
    var s = toScreen(iso(R.ox + R.w / 2, R.oy - 2.2, 0));
    plate(R.title, s[0], s[1], null, false, true);
  });
}

/* camera (camera-pan-zoom-controls, tile-picking-interaction) */
function worldBounds() {
  var l = iso(0, G.H)[0], r = iso(G.W, 0)[0], t = iso(0, 0)[1] - 70, b = iso(G.W, G.H)[1] + 30;
  return { l: l, r: r, t: t, b: b };
}
function minZoom() { var B = worldBounds(); return Math.min(0.3, Math.min(view.w / (B.r - B.l), view.h / (B.b - B.t)) * 0.98); }
function clampCam() {
  var B = worldBounds();
  cam.z = Math.max(minZoom(), Math.min(2.6, cam.z));
  cam.x = Math.max(B.l, Math.min(B.r, cam.x)); cam.y = Math.max(B.t, Math.min(B.b, cam.y));
}
function fit(animate) {
  var B = worldBounds(), z = Math.min(view.w / (B.r - B.l), view.h / (B.b - B.t)) * 0.98;
  var target = { x: (B.l + B.r) / 2, y: (B.t + B.b) / 2, z: z };
  if (animate) tween(target); else { cam.x = target.x; cam.y = target.y; cam.z = target.z; clampCam(); needDraw = true; }
}
var tw = null;
function tween(target) {
  if (reduce.matches) { cam.x = target.x; cam.y = target.y; cam.z = target.z; clampCam(); needDraw = true; return; }
  tw = { from: { x: cam.x, y: cam.y, z: cam.z }, to: target, t0: performance.now(), dur: 450 };
}
function flyTo(b) {
  var c = iso(b.x + b.w / 2, b.y + b.d / 2, 10);
  tween({ x: c[0], y: c[1], z: Math.max(cam.z, 1.05) });
}
function screenToWorld(sx, sy) { return [(sx - view.w / 2) / cam.z + cam.x, (sy - view.h / 2) / cam.z + cam.y]; }
function zoomAt(sx, sy, factor) {
  var before = screenToWorld(sx, sy);
  cam.z = Math.max(minZoom(), Math.min(2.6, cam.z * factor));
  cam.x = before[0] - (sx - view.w / 2) / cam.z; cam.y = before[1] - (sy - view.h / 2) / cam.z;
  clampCam(); needDraw = true;
}
function hull(points) {
  points.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
  var lo = [], up = [];
  points.forEach(function (p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
  points.slice().reverse().forEach(function (p) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); });
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
G.buildings.forEach(function (b) {
  var h = bheight(b), pts = [];
  [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(function (c) { pts.push(iso(b.x + c[0] * b.w, b.y + c[1] * b.d, 0)); pts.push(iso(b.x + c[0] * b.w, b.y + c[1] * b.d, h)); });
  b.hit = hull(pts);
});
function inside(poly, x, y) {
  for (var c = false, i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if ((poly[i][1] > y) !== (poly[j][1] > y) && x < (poly[j][0] - poly[i][0]) * (y - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0]) c = !c;
  }
  return c;
}
function pick(sx, sy) {
  var w = screenToWorld(sx, sy);
  var hits = G.buildings.filter(function (b) { return inside(b.hit, w[0], w[1]); });
  hits.sort(function (a, b) { return (b.x + b.w + b.y + b.d) - (a.x + a.w + a.y + a.d); });
  return hits[0] || null;
}

/* pointer input */
var pointers = {}, drag = null, pinch = null;
canvas.addEventListener('pointerdown', function (e) {
  canvas.setPointerCapture(e.pointerId); pointers[e.pointerId] = { x: e.offsetX, y: e.offsetY };
  var ids = Object.keys(pointers);
  if (ids.length === 2) {
    var a = pointers[ids[0]], b = pointers[ids[1]];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: cam.z }; drag = null;
  } else drag = { x: e.offsetX, y: e.offsetY, cx: cam.x, cy: cam.y, moved: false };
});
canvas.addEventListener('pointermove', function (e) {
  if (pointers[e.pointerId]) pointers[e.pointerId] = { x: e.offsetX, y: e.offsetY };
  var ids = Object.keys(pointers);
  if (pinch && ids.length === 2) {
    var a = pointers[ids[0]], b = pointers[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
    zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, (pinch.z * d / pinch.d) / cam.z); return;
  }
  if (drag) {
    var dx = e.offsetX - drag.x, dy = e.offsetY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) { drag.moved = true; canvas.classList.add('dragging'); }
    if (drag.moved) { cam.x = drag.cx - dx / cam.z; cam.y = drag.cy - dy / cam.z; clampCam(); needDraw = true; }
    return;
  }
  var h = pick(e.offsetX, e.offsetY);
  if (h !== state.hover) { state.hover = h; canvas.classList.toggle('over', !!h); needDraw = true; }
});
function endPointer(e) {
  delete pointers[e.pointerId];
  if (Object.keys(pointers).length < 2) pinch = null;
  if (drag && !drag.moved && e.type === 'pointerup') { var b = pick(e.offsetX, e.offsetY); select(b && b === state.sel ? null : b, false); }
  drag = null; canvas.classList.remove('dragging');
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', function () { if (state.hover) { state.hover = null; needDraw = true; } });
canvas.addEventListener('wheel', function (e) { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
canvas.addEventListener('keydown', function (e) {
  var step = 60 / cam.z, k = e.key;
  if (k === 'ArrowLeft') cam.x -= step; else if (k === 'ArrowRight') cam.x += step;
  else if (k === 'ArrowUp') cam.y -= step; else if (k === 'ArrowDown') cam.y += step;
  else if (k === '+' || k === '=') zoomAt(view.w / 2, view.h / 2, 1.25);
  else if (k === '-') zoomAt(view.w / 2, view.h / 2, 0.8);
  else return;
  e.preventDefault(); clampCam(); needDraw = true;
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.sel) select(null); });

/* toolbar */
document.getElementById('zoom-in').onclick = function () { zoomAt(view.w / 2, view.h / 2, 1.3); };
document.getElementById('zoom-out').onclick = function () { zoomAt(view.w / 2, view.h / 2, 1 / 1.3); };
document.getElementById('fit').onclick = function () { fit(true); };
var svcBtn = document.getElementById('service');
svcBtn.onclick = function () { state.service = !state.service; svcBtn.setAttribute('aria-pressed', String(state.service)); needDraw = true; };
document.getElementById('theme').onclick = function () {
  var dark = NIGHT ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', dark);
  try { localStorage.setItem('toolkit-map-theme', dark); } catch (err) { /* storage can be unavailable */ }
  readPalette();
};
try { var saved = localStorage.getItem('toolkit-map-theme'); if (saved) document.documentElement.setAttribute('data-theme', saved); } catch (err) { /* ignore */ }

/* panel (M-10) */
var panel = document.getElementById('panel');
function stars(n) { return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }
function pickBtn(b, text) { return '<button class="pick" data-b="' + esc(b.id) + '">' + esc(text) + '</button>'; }
function nameOf(b) { return b.kind === 'city' ? b.recipe.title : b.kind === 'industry' ? b.brick.name : b.platform.label; }
function studChip(R, s) {
  var i = (R.studIndex[s] || 0) % 6, st = R.cat.studs.find(function (x) { return x.id === s; });
  return '<span class="sw sw-' + i + '"><i></i>' + esc(st ? st.label : s) + '</span>';
}
function textBlock(o) {
  var h = '';
  if (o.why) h += '<h3>Why</h3><p>' + esc(o.why) + '</p>';
  if (o.what) h += '<h3>What</h3><p>' + esc(o.what) + '</p>';
  if (o.how && o.how.length) h += '<h3>How</h3><ol>' + o.how.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
  if (o.example) h += '<h3>Example</h3><p>' + esc(o.example) + '</p>';
  if (o.difficulty) h += '<h3>Difficulty</h3><div class="diff">' + ['installation', 'usage'].map(function (k) {
    var r = o.difficulty[k]; return r ? '<div><span class="lbl">' + (k === 'installation' ? 'Installation' : 'Usage') + '</span><span class="stars" aria-label="' + r.stars + ' of 5">' + stars(r.stars) + '</span></div><p class="muted">' + esc(r.why) + '</p>' : '';
  }).join('') + '</div>';
  return h;
}
function find(R, kind, ref) { return G.buildings.find(function (b) { return b.kind === kind && b.region === R && b.ref === ref; }); }
var KEY_SVG = {
  city: '<svg viewBox="0 0 30 30" width="30" height="30"><path d="M4 26V15l6-5 6 5v11z" fill="var(--wall-1)" stroke="var(--muted)"/><path d="M16 26V12l5-4 5 4v14z" fill="var(--wall-2)" stroke="var(--muted)"/><path d="M3 15l7-6 7 6" fill="none" stroke="var(--roof-1)" stroke-width="2"/></svg>',
  industry: '<svg viewBox="0 0 30 30" width="30" height="30"><path d="M3 27V14l6 4v-4l6 4v-4l6 4V6h4v21z" fill="var(--ind-automation)" stroke="var(--muted)"/></svg>',
  depot: '<svg viewBox="0 0 30 30" width="30" height="30"><path d="M3 27V13l12-7 12 7v14z" fill="var(--shed-wall)" stroke="var(--muted)"/><path d="M8 27v-7a3 3 0 0 1 6 0v7M17 27v-7a3 3 0 0 1 6 0v7" fill="var(--door)"/></svg>',
  train: '<svg viewBox="0 0 30 30" width="30" height="30"><rect x="2" y="12" width="10" height="8" rx="1" fill="var(--stud-1)"/><rect x="14" y="14" width="7" height="6" fill="var(--steel)"/><rect x="22" y="14" width="7" height="6" fill="var(--steel)"/><rect x="23" y="11" width="5" height="3" fill="var(--stud-1)"/></svg>'
};
function renderPanel() {
  var b = state.sel, h = '';
  if (!b) {
    h += '<p class="chip">How to read the map</p><h2>' + esc(PKG.collection.title) + '</h2><p class="muted">' + esc(PKG.collection.description) + '</p>';
    h += '<div class="key">' + KEY_SVG.city + '<div><strong>Cities are use cases</strong>A city has one house per tool it needs. Its station connects it to those tools.</div>'
      + KEY_SVG.industry + '<div><strong>Industries are tools</strong>The building shape shows the kind: tower for AI assistants, silos for databases, workshops for agent parts.</div>'
      + KEY_SVG.depot + '<div><strong>Depots are infrastructure</strong>What the tools run on. Switch on "Service lines" to see which tool uses which depot.</div>'
      + KEY_SVG.train + '<div><strong>Trains are connections</strong>A train leaves the tool that asks empty and comes back loaded from the tool that provides. Its colour is the connection type.</div></div>';
    h += '<p class="muted">Rocks and hills around a city mean a harder installation.</p>';
    G.regions.forEach(function (R) {
      h += '<h3>' + esc(R.title) + '</h3><div class="swatches">' + R.cat.studs.filter(function (s) { return R.edges.some(function (e) { return e.stud === s.id; }); })
        .map(function (s) { return studChip(R, s.id); }).join('') + '<span class="sw sw-p"><i></i>Passenger line</span></div>';
      h += '<p class="region-h">Cities</p><div class="list">' + R.cities.map(function (c) { return pickBtn(c, c.recipe.title); }).join('') + '</div>';
      h += '<p class="region-h">Industries</p><div class="list">' + R.inds.map(function (c) { return pickBtn(c, c.brick.name); }).join('') + '</div>';
    });
  } else {
    var R = b.region;
    h += '<button class="close" id="clear" aria-label="Clear selection (Escape)">Close</button>';
    if (b.kind === 'city') {
      var r = b.recipe;
      h += '<p class="chip">City · use case · ' + esc(R.title) + '</p><h2>' + esc(r.title) + '</h2>';
      h += '<h3>Supplied by</h3><div class="list">' + r.bricks.map(function (id) { var i = find(R, 'industry', id); return i ? pickBtn(i, i.brick.name) : ''; }).join('') + '</div>';
      var studs = {}; R.edges.forEach(function (e) { if (e.recipes.indexOf(r.id) >= 0) studs[e.stud] = 1; });
      if (Object.keys(studs).length) h += '<div class="swatches">' + Object.keys(studs).map(function (s) { return studChip(R, s); }).join('') + '</div>';
      h += textBlock(r);
    } else if (b.kind === 'industry') {
      var br = b.brick;
      h += '<p class="chip">Industry · ' + esc(CAT_WORD[br.category] || br.category) + ' · ' + esc(R.title) + '</p><h2>' + esc(br.name) + '</h2>';
      if (br.summary) h += '<p>' + esc(br.summary) + '</p>';
      if ((br.provides || []).length) h += '<h3>Delivers</h3><div class="swatches">' + br.provides.map(function (s) { return studChip(R, s); }).join('') + '</div>';
      if ((br.accepts || []).length) h += '<h3>Takes in</h3><div class="swatches">' + br.accepts.map(function (s) { return studChip(R, s); }).join('') + '</div>';
      var cities = R.cities.filter(function (c) { return c.recipe.bricks.indexOf(br.id) >= 0; });
      if (cities.length) h += '<h3>Supplies these cities</h3><div class="list">' + cities.map(function (c) { return pickBtn(c, c.recipe.title); }).join('') + '</div>';
      var on = (br.runsOn || []).concat(br.requires || []).map(function (id) { return find(R, 'depot', id) || find(R, 'industry', id); }).filter(Boolean);
      if (on.length) h += '<h3>Runs on or needs</h3><div class="list">' + on.map(function (o) { return pickBtn(o, nameOf(o)); }).join('') + '</div>';
      h += textBlock(br);
    } else {
      var p = b.platform;
      h += '<p class="chip">Depot · infrastructure · ' + esc(R.title) + '</p><h2>' + esc(p.label) + '</h2>';
      if (p.summary) h += '<p>' + esc(p.summary) + '</p>';
      if (b.hosts.length) h += '<h3>Runs here</h3><div class="list">' + b.hosts.map(function (id) { var i = find(R, 'industry', id); return i ? pickBtn(i, i.brick.name) : ''; }).join('') + '</div>';
      var under = (p.runsOn || []).map(function (id) { return find(R, 'depot', id); }).filter(Boolean);
      if (under.length) h += '<h3>Runs on</h3><div class="list">' + under.map(function (o) { return pickBtn(o, nameOf(o)); }).join('') + '</div>';
      h += textBlock(p);
    }
  }
  panel.innerHTML = h;
  panel.querySelectorAll('.pick').forEach(function (el) {
    el.onclick = function () { select(G.buildings.find(function (o) { return o.id === el.getAttribute('data-b'); }), true); };
  });
  var clr = document.getElementById('clear'); if (clr) clr.onclick = function () { select(null); };
  if (b) panel.scrollTop = 0;
}

/* loop */
function resize() {
  var r = canvas.getBoundingClientRect(); view.dpr = Math.min(2, window.devicePixelRatio || 1);
  var first = !view.w;
  view.w = r.width; view.h = r.height;
  canvas.width = Math.round(r.width * view.dpr); canvas.height = Math.round(r.height * view.dpr);
  if (first) fit(false); else clampCam();
  needDraw = true;
}
function loop(now) {
  if (tw) {
    var k = Math.min(1, (now - tw.t0) / tw.dur), e = 1 - Math.pow(1 - k, 3);
    cam.x = tw.from.x + (tw.to.x - tw.from.x) * e; cam.y = tw.from.y + (tw.to.y - tw.from.y) * e; cam.z = tw.from.z + (tw.to.z - tw.from.z) * e;
    clampCam(); needDraw = true; if (k >= 1) tw = null;
  }
  if (needDraw || !reduce.matches) { frame(now); needDraw = false; }
  requestAnimationFrame(loop);
}

readPalette(); buildGround(); buildTracks(); renderPanel();
window.addEventListener('resize', resize);
if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readPalette);
if (reduce.addEventListener) reduce.addEventListener('change', function () { needDraw = true; });
document.getElementById('title').textContent = 'Toolkit railway';
resize();
requestAnimationFrame(loop);
window.__map = { G: G, cam: cam, select: select, state: state };   // for tests and debugging
})();
