'use strict';
// Broken and borderline catalogues, derived from the demo profile by small mutations.
// Because they derive from the demo, they stay in sync when the demo changes.
const demo = require('../profiles/demo/catalog.json');
const clone = () => JSON.parse(JSON.stringify(demo));
const brick = (c, id) => c.bricks.find(b => b.id === id);

// rejectedBy: which checks must reject the file. 'schema' = JSON Schema, 'core' = shared validator.
// contains: text the core validator's error message must include (when 'core' rejects).
const invalid = [
  { name: 'old schema version 1.1', rule: 'U-6', rejectedBy: ['schema', 'core'], contains: 'schemaVersion',
    mutate: c => { c.schemaVersion = '1.1'; } },
  { name: 'previous schema version 1.2', rule: 'U-6', rejectedBy: ['schema', 'core'], contains: 'schemaVersion',
    mutate: c => { c.schemaVersion = '1.2'; } },
  { name: 'stars out of range', rule: 'T-3', rejectedBy: ['schema', 'core'], contains: 'whole number from 1 to 5',
    mutate: c => { brick(c, 'edge').difficulty.usage.stars = 6; } },
  { name: 'rating without reason', rule: 'T-3', rejectedBy: ['schema', 'core'], contains: 'needs a reason',
    mutate: c => { delete brick(c, 'edge').difficulty.usage.why; } },
  { name: 'missing how', rule: 'T-1', rejectedBy: ['schema', 'core'], contains: 'list of steps',
    mutate: c => { delete brick(c, 'edge').how; } },
  { name: 'empty how', rule: 'T-2', rejectedBy: ['schema', 'core'], contains: 'list of steps',
    mutate: c => { brick(c, 'edge').how = []; } },
  { name: 'missing why', rule: 'T-1', rejectedBy: ['schema', 'core'], contains: 'why is missing',
    mutate: c => { delete brick(c, 'edge').why; } },
  { name: 'old manager/developer text', rule: 'C-4', rejectedBy: ['schema'],
    mutate: c => { brick(c, 'edge').description = { manager: 'x', developer: 'y' }; } },
  { name: 'id not a lowercase slug', rule: 'D-2', rejectedBy: ['schema', 'core'], contains: 'valid id',
    mutate: c => { brick(c, 'edge').id = 'Edge_Browser'; c.recipes[0].bricks[2] = 'Edge_Browser'; } },
  { name: 'duplicate brick id', rule: 'D-2', rejectedBy: ['core'], contains: 'Duplicate brick id',
    mutate: c => { c.bricks.push(JSON.parse(JSON.stringify(brick(c, 'edge')))); } },
  { name: 'id used by brick and platform', rule: 'D-2', rejectedBy: ['core'], contains: 'both a brick and a platform',
    mutate: c => { c.platforms[0].id = 'edge'; c.bricks.find(b => b.id === 'github-copilot').runsOn = ['edge']; } },
  { name: 'unknown stud', rule: 'D-3', rejectedBy: ['core'], contains: 'unknown stud',
    mutate: c => { brick(c, 'edge').provides = ['nope']; } },
  { name: 'unknown platform in brick', rule: 'D-3', rejectedBy: ['core'], contains: 'unknown platform',
    mutate: c => { brick(c, 'edge').runsOn = ['nope']; } },
  { name: 'unknown platform in platform', rule: 'D-3', rejectedBy: ['core'], contains: 'unknown platform',
    mutate: c => { c.platforms.find(p => p.id === 'nodejs').runsOn = ['nope']; } },
  { name: 'platforms run on each other in a loop', rule: 'I-4', rejectedBy: ['core'], contains: 'loop',
    mutate: c => { c.platforms.find(p => p.id === 'desktop-os').runsOn = ['nodejs']; } },
  { name: 'recipe with unknown brick', rule: 'D-3', rejectedBy: ['core'], contains: 'unknown brick',
    mutate: c => { c.recipes[0].bricks.push('nope'); } },
  { name: 'unknown platform kind', rule: 'I-3', rejectedBy: ['schema', 'core'], contains: 'unknown kind',
    mutate: c => { c.platforms[0].kind = 'spaceship'; } },
  { name: 'research without a verified date', rule: 'R-1', rejectedBy: ['schema', 'core'], contains: 'verifiedOn',
    mutate: c => { delete brick(c, 'edge').research.verifiedOn; } },
  { name: 'research with an impossible date', rule: 'R-1', rejectedBy: ['core'], contains: 'verifiedOn',
    mutate: c => { brick(c, 'edge').research.verifiedOn = '2026-02-31'; } },
  { name: 'research with nothing in it', rule: 'R-1', rejectedBy: ['schema', 'core'], contains: 'at least one',
    mutate: c => { brick(c, 'edge').research = { verifiedOn: '2026-10-19' }; } },
  { name: 'fact without text', rule: 'R-1', rejectedBy: ['schema', 'core'], contains: 'needs text',
    mutate: c => { brick(c, 'edge').research.facts[0] = { source: brick(c, 'edge').research.facts[0].source }; } },
  { name: 'source without url', rule: 'R-1', rejectedBy: ['schema', 'core'], contains: 'needs a label and a url',
    mutate: c => { c.research.sources[0] = { label: 'No link' }; } },
  { name: 'requires names an unknown id', rule: 'I-8', rejectedBy: ['core'], contains: 'requires uses unknown',
    mutate: c => { brick(c, 'edge').requires = ['nope']; } },
  { name: 'bricks that require each other', rule: 'I-4', rejectedBy: ['core'], contains: 'loop',
    mutate: c => { brick(c, 'edge').requires = ['playwright-mcp']; brick(c, 'playwright-mcp').requires = ['edge']; } },
  { name: 'a requires and a runsOn that close a loop', rule: 'I-4', rejectedBy: ['core'], contains: 'loop',
    mutate: c => { brick(c, 'edge').requires = ['playwright-mcp']; brick(c, 'playwright-mcp').runsOn = ['edge']; } },
  { name: 'brick that runs on itself', rule: 'I-4', rejectedBy: ['core'], contains: 'loop',
    mutate: c => { brick(c, 'edge').runsOn = ['edge']; } },
  { name: 'unknown category', rule: 'D-3', rejectedBy: ['schema', 'core'], contains: 'unknown category',
    mutate: c => { brick(c, 'edge').category = 'gadget'; } },
  { name: 'no bricks', rule: 'D-3', rejectedBy: ['schema', 'core'], contains: 'no bricks',
    mutate: c => { c.bricks = []; c.recipes = []; } }
];

// Valid files that must load but produce a warning (design rule D-5).
const warnings = [
  { name: 'unused stud', contains: 'not used by any brick',
    mutate: c => { c.studs.push({ id: 'spare', label: 'Spare' }); } },
  { name: 'unused platform', contains: 'Platform "docker" is not used',
    mutate: c => { c.platforms.push({ id: 'docker', label: 'Docker', kind: 'container', summary: 'Container runtime.' }); } },
  { name: 'brick without infrastructure', contains: 'has no infrastructure',
    mutate: c => { delete brick(c, 'edge').runsOn; } },
  { name: 'source link that is not http or https', contains: 'not http or https',
    mutate: c => { c.research.sources[0].url = 'ftp://example.org/file'; } },
  { name: 'setup whose bricks do not connect', contains: 'do not connect',
    mutate: c => { c.recipes[0].bricks = ['github-copilot', 'edge']; } }
];

function build(list) {
  return list.map(f => { const c = clone(); f.mutate(c); return Object.assign({}, f, { catalog: c }); });
}

// Collections (design rule D-6)
const collection = require('../profiles/demo/collection.json');
const cclone = () => JSON.parse(JSON.stringify(collection));
const invalidCollections = [
  { name: 'wrong collection version', rejectedBy: ['schema', 'core'], contains: 'schemaVersion', mutate: m => { m.schemaVersion = '2.0'; } },
  { name: 'no topics', rejectedBy: ['schema', 'core'], contains: 'at least one topic', mutate: m => { m.topics = []; } },
  { name: 'duplicate topic id', rejectedBy: ['core'], contains: 'Duplicate topic id', mutate: m => { m.topics[1].id = m.topics[0].id; } },
  { name: 'duplicate topic file', rejectedBy: ['core'], contains: 'Duplicate topic file', mutate: m => { m.topics[1].file = m.topics[0].file; } },
  { name: 'file name with a path', rejectedBy: ['schema', 'core'], contains: 'without a path', mutate: m => { m.topics[0].file = '../secret.json'; } },
  { name: 'file that is not json', rejectedBy: ['schema', 'core'], contains: 'without a path', mutate: m => { m.topics[0].file = 'profile.txt'; } },
  { name: 'topic id that is not a slug', rejectedBy: ['schema', 'core'], contains: 'valid id', mutate: m => { m.topics[0].id = 'My Topic'; } }
].map(f => { const m = cclone(); f.mutate(m); return Object.assign({}, f, { collection: m }); });

module.exports = { demo, clone, invalid: build(invalid), warnings: build(warnings), collection, invalidCollections };
