'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const core = require('../shared/catalog-core.js');
const { makeSchemaValidator, schema, checkProfile } = require('../scripts/validate-profile.js');
const { demo, invalid, warnings } = require('./fixtures.js');

const root = path.join(__dirname, '..');
const validateSchema = makeSchemaValidator();

describe('demo profile', () => {
  it('D-3: passes the JSON Schema and the shared validator without errors or warnings', () => {
    const r = checkProfile(demo, validateSchema);
    assert.deepEqual(r.schemaErrors, []);
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.warnings, []);
  });

  it('C-3: bricks connect when one accepts a stud that another provides, user to provider', () => {
    const pairs = core.buildGraph(demo).edges.map(e => e.from + '>' + e.to + ':' + e.stud).sort();
    assert.deepEqual(pairs, [
      'github-copilot>custom-mcp-server:mcp',
      'github-copilot>playwright-mcp:mcp',
      'playwright-mcp>edge:browser'
    ]);
  });

  it('I-4: runsOn entries are alternatives and the graph has one edge per alternative', () => {
    const runs = core.buildGraph(demo).runs.filter(e => e.from === 'custom-mcp-server');
    assert.deepEqual(runs.map(e => e.to + ':' + e.altIndex), ['nodejs:0', 'python:1']);
  });
});

describe('invalid catalogues are rejected', () => {
  for (const f of invalid) {
    it(`${f.rule}: ${f.name}`, () => {
      if (f.rejectedBy.includes('schema')) {
        assert.equal(validateSchema(f.catalog), false, 'the JSON Schema should reject this file');
      }
      if (f.rejectedBy.includes('core')) {
        const r = core.validate(f.catalog);
        assert.ok(r.er.length > 0, 'the shared validator should report an error');
        assert.ok(r.er.some(m => m.includes(f.contains)), `expected an error containing "${f.contains}", got: ${r.er.join(' | ')}`);
      }
    });
  }
});

describe('warnings never block loading', () => {
  for (const f of warnings) {
    it(`D-5: ${f.name}`, () => {
      const r = core.validate(f.catalog);
      assert.deepEqual(r.er, [], 'no errors expected');
      assert.ok(r.wa.some(m => m.includes(f.contains)), `expected a warning containing "${f.contains}", got: ${r.wa.join(' | ')}`);
    });
  }
});

describe('schema and versions', () => {
  it('C-4: the schema has no separate manager and developer texts', () => {
    assert.ok(!JSON.stringify(schema).match(/"(manager|developer)"/));
  });

  it('D-4: schema version, validator version and version history agree', () => {
    const design = fs.readFileSync(path.join(root, 'docs', 'DESIGN.md'), 'utf8');
    const rows = [...design.matchAll(/^\| (\d+\.\d+) \|/gm)].map(m => m[1]);
    assert.equal(schema.properties.schemaVersion.const, core.VERSION);
    assert.equal(rows[rows.length - 1], core.VERSION, 'the last row of the version history must be the current version');
  });

  it('D-1: real data stays out of the repository', () => {
    const ignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
    assert.match(ignore, /^profiles\/private\/\*$/m);
    assert.match(ignore, /^!profiles\/private\/README\.md$/m);
    const g = spawnSync('git', ['ls-files', 'profiles/private'], { cwd: root, encoding: 'utf8' });
    if (g.status === 0) assert.deepEqual(g.stdout.split('\n').filter(f => f && f !== 'profiles/private/README.md'), [], 'private files must never be tracked');
  });

  it('D-3: the viewer has no private copy of the validator', () => {
    const html = fs.readFileSync(path.join(root, 'viewer', 'index.html'), 'utf8')
      .replace(/\/\* @core:begin \*\/[\s\S]*?\/\* @core:end \*\//, '');
    assert.ok(!/function validate\(/.test(html) && !/function buildGraph\(/.test(html));
  });

  it('D-3: the viewer copy of the shared core is in sync', () => {
    const r = spawnSync(process.execPath, ['scripts/sync-core.js', '--check'], { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
  });

  it('U-5: the demo profile built into the viewer equals profiles/demo/catalog.json', () => {
    const html = fs.readFileSync(path.join(root, 'viewer', 'index.html'), 'utf8');
    const m = html.match(/id="catalog-data">([\s\S]*?)<\/script>/);
    assert.deepEqual(JSON.parse(m[1]), demo);
  });

  it('D-3: the command line validator passes the demo and fails a broken file', () => {
    const ok = spawnSync(process.execPath, ['scripts/validate-profile.js', 'profiles/demo/catalog.json'], { cwd: root });
    assert.equal(ok.status, 0);
    const tmp = path.join(require('os').tmpdir(), 'tb-broken-' + process.pid + '.json');
    fs.writeFileSync(tmp, JSON.stringify(invalid[0].catalog));
    try {
      const bad = spawnSync(process.execPath, ['scripts/validate-profile.js', tmp], { cwd: root });
      assert.equal(bad.status, 1);
    } finally { fs.unlinkSync(tmp); }
  });
});
