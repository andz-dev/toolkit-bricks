'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const core = require('../shared/catalog-core.js');
const { makeSchemaValidator, makeCollectionValidator, schema, checkProfile, checkCollection } = require('../scripts/validate-profile.js');
const { demo, invalid, warnings, collection, invalidCollections } = require('./fixtures.js');

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

describe('package (design rule D-6)', () => {
  const dir = path.join(root, 'profiles', 'demo');
  const profiles = collection.topics.map(t => ({ topic: t, data: JSON.parse(fs.readFileSync(path.join(dir, t.file), 'utf8')) }));

  it('D-6: the demo collection validates and lists files that exist', () => {
    const r = checkCollection(collection, makeCollectionValidator());
    assert.deepEqual([r.schemaErrors, r.errors], [[], []]);
    for (const t of collection.topics) assert.ok(fs.existsSync(path.join(dir, t.file)), t.file);
  });

  it('D-6: every profile in the collection validates without errors', () => {
    for (const { topic, data } of profiles) {
      const r = checkProfile(data, validateSchema);
      assert.deepEqual([topic.file, r.schemaErrors, r.errors], [topic.file, [], []]);
    }
  });

  it('D-6: no profile file in the demo folder is missing from the collection', () => {
    const listed = new Set(collection.topics.map(t => t.file));
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'collection.json');
    assert.deepEqual(files.filter(f => !listed.has(f)), []);
  });

  it('N-7 groundwork: the package has more than one use case to page through', () => {
    const total = profiles.reduce((n, p) => n + p.data.recipes.length, 0);
    assert.ok(total >= 5);
  });

  for (const f of invalidCollections) {
    it(`D-6: rejects a collection with ${f.name}`, () => {
      const v = makeCollectionValidator();
      if (f.rejectedBy.includes('schema')) assert.equal(v(f.collection), false);
      const r = core.validateCollection(f.collection);
      if (f.rejectedBy.includes('core')) assert.ok(r.er.some(m => m.includes(f.contains)), `expected "${f.contains}", got ${r.er.join(' | ')}`);
    });
  }
});

describe('relations and research in the demo package', () => {
  const load = f => JSON.parse(fs.readFileSync(path.join(root, 'profiles', 'demo', f), 'utf8'));

  it('I-4: a brick can run inside another brick (pgvector inside PostgreSQL)', () => {
    const g = core.buildGraph(load('profile-postgresql.json'));
    assert.ok(g.runs.some(e => e.from === 'pgvector' && e.to === 'postgresql' && e.kind === 'runsOn'));
    assert.ok(g.byId.has('postgresql') && !g.platById.has('postgresql'));
  });

  it('I-8: a mandatory requirement is its own kind of edge (skill script needs its skill)', () => {
    const g = core.buildGraph(load('profile-agent-skills.json'));
    assert.ok(g.runs.some(e => e.from === 'skill-script' && e.to === 'agent-skill' && e.kind === 'requires'));
  });

  it('R-1: every profile in the package carries research with a verified date', () => {
    for (const t of collection.topics) {
      const c = load(t.file);
      assert.match(c.research.verifiedOn, /^\d{4}-\d{2}-\d{2}$/, t.file);
      assert.ok((c.research.sources || []).length > 0, t.file + ' lists sources');
    }
  });

  it('R-4: every research link in the demo package is http or https', () => {
    const urls = [];
    const walk = n => { if (n && typeof n === 'object') { if (typeof n.url === 'string') urls.push(n.url); Object.values(n).forEach(walk); } };
    collection.topics.forEach(t => walk(load(t.file)));
    assert.ok(urls.length > 20);
    assert.deepEqual(urls.filter(u => !/^https?:\/\//.test(u)), []);
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
    const schemaTable = design.split('| Schema | Change |')[1].split('| Collection | Change |')[0];
    const rows = [...schemaTable.matchAll(/^\| (\d+\.\d+) \|/gm)].map(m => m[1]);
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

  it('D-3: the viewer has no private copy of the validator, and its shared core is an exact copy', () => {
    const js = fs.readFileSync(path.join(root, 'viewer', 'viewer.js'), 'utf8');
    assert.ok(!/function validate\(/.test(js) && !/function buildGraph\(/.test(js));
    assert.equal(fs.readFileSync(path.join(root, 'viewer', 'catalog-core.js'), 'utf8'), fs.readFileSync(path.join(root, 'shared', 'catalog-core.js'), 'utf8'));
  });

  it('D-3: generated parts of the viewer are in sync (npm run sync)', () => {
    const r = spawnSync(process.execPath, ['scripts/sync.js', '--check'], { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
  });

  it('N-9: the demo package built into the viewer equals profiles/demo (collection and every profile)', () => {
    const html = fs.readFileSync(path.join(root, 'viewer', 'index.html'), 'utf8');
    const m = html.match(/id="package-data">([\s\S]*?)<\/script>/);
    const dir = path.join(root, 'profiles', 'demo');
    const collection = JSON.parse(fs.readFileSync(path.join(dir, 'collection.json'), 'utf8'));
    const profiles = {};
    for (const t of collection.topics) profiles[t.file] = JSON.parse(fs.readFileSync(path.join(dir, t.file), 'utf8'));
    assert.deepEqual(JSON.parse(m[1]), { collection, profiles });
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
