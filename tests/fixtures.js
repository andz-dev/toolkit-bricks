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
  { name: 'setup whose bricks do not connect', contains: 'do not connect',
    mutate: c => { c.recipes[0].bricks = ['github-copilot', 'edge']; } }
];

function build(list) {
  return list.map(f => { const c = clone(); f.mutate(c); return Object.assign({}, f, { catalog: c }); });
}

module.exports = { demo, clone, invalid: build(invalid), warnings: build(warnings) };
