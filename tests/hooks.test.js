'use strict';
// The commit-msg check and the hook files that call it (AGENTS.md, "Working rules").
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { check, ruleIds } = require('../scripts/check-commit-msg.js');

const root = path.join(__dirname, '..');
const known = new Set(['V-2', 'L-1', 'D-4']);

describe('commit message check', () => {
  it('accepts a message that names a known rule', () => {
    assert.deepEqual(check('Fix cable direction\n\nV-2: cables run top to bottom.', known), []);
  });

  it('accepts several rule IDs in the subject', () => {
    assert.deepEqual(check('Move colours to tokens (L-1, V-2)', known), []);
  });

  it('accepts "Rules: none"', () => {
    assert.deepEqual(check('Fix typo in README\n\nRules: none', known), []);
  });

  it('rejects a message without a rule ID', () => {
    assert.equal(check('Make it nicer', known).length, 1);
  });

  it('rejects an unknown rule ID', () => {
    const p = check('Change thing (Z-9)', known);
    assert.ok(p.some(x => x.includes('Z-9')));
  });

  it('rejects an empty message and ignores comment lines', () => {
    assert.equal(check('', known).length, 1);
    assert.equal(check('# V-2 only in a comment\n', known).length, 1);
  });

  it('does not treat words like UTF-8 as rule IDs', () => {
    assert.deepEqual(check('Read files as UTF-8 (D-4)', known), []);
  });

  it('lets merge, revert and fixup commits through', () => {
    for (const m of ['Merge branch main', 'Revert "Make it nicer"', 'fixup! Make it nicer']) assert.deepEqual(check(m, known), [], m);
  });

  it('reads the real rule IDs from docs/DESIGN.md', () => {
    const ids = ruleIds();
    for (const id of ['V-2', 'L-1', 'D-4']) assert.ok(ids.has(id), id);
  });
});

describe('git hook files', () => {
  it('pre-commit runs npm test and commit-msg runs the message check', () => {
    const pre = fs.readFileSync(path.join(root, '.githooks', 'pre-commit'), 'utf8');
    const msg = fs.readFileSync(path.join(root, '.githooks', 'commit-msg'), 'utf8');
    assert.match(pre, /^#!\/bin\/sh/);
    assert.match(pre, /npm test/);
    assert.match(msg, /^#!\/bin\/sh/);
    assert.match(msg, /scripts\/check-commit-msg\.js "\$1"/);
  });

  it('package.json switches the hooks on after npm install', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    assert.equal(pkg.scripts.prepare, 'node scripts/install-hooks.js');
  });
});
