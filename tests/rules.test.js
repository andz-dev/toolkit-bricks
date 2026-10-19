'use strict';
// Every design rule in docs/DESIGN.md must be named by at least one test, or be listed
// in tests/manual-rules.json with a reason. Tests may only name rules that exist.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const design = fs.readFileSync(path.join(dir, '..', 'docs', 'DESIGN.md'), 'utf8');
const ruleIds = [...design.matchAll(/^\| ([A-Z]-\d+) \|/gm)].map(m => m[1]);
const manual = JSON.parse(fs.readFileSync(path.join(dir, 'manual-rules.json'), 'utf8'));

const testedIds = new Set();
for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.test.js') && n !== 'rules.test.js')) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  // rule IDs that start a test title, for example it('V-2: ...')
  for (const m of src.matchAll(/\bit\(\s*[`'"]([A-Z]-\d+):/g)) testedIds.add(m[1]);
}
// fixture rule tags are used as test titles in schema.test.js
const fixtures = require('./fixtures.js');
fixtures.invalid.forEach(f => testedIds.add(f.rule));

describe('design rules are covered', () => {
  it('there are design rules to cover', () => assert.ok(ruleIds.length >= 30));

  it('rule IDs are unique', () => assert.equal(new Set(ruleIds).size, ruleIds.length));

  for (const id of ruleIds) {
    it(`${id} has a test or a documented manual check`, () => {
      assert.ok(testedIds.has(id) || manual[id], `${id} is in docs/DESIGN.md but no test starts with "${id}:" and it is not in tests/manual-rules.json`);
    });
  }

  it('tests only name rules that exist', () => {
    const unknown = [...testedIds].filter(id => !ruleIds.includes(id));
    assert.deepEqual(unknown, []);
  });

  it('manual rules exist, have a reason, and are not also tested', () => {
    for (const [id, reason] of Object.entries(manual)) {
      assert.ok(ruleIds.includes(id), `${id} is not a rule`);
      assert.ok(reason.length > 10, `${id} needs a reason`);
      assert.ok(!testedIds.has(id), `${id} now has a test; remove it from manual-rules.json`);
    }
  });
});
