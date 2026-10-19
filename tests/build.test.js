'use strict';
const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { loadViewer, viewerDir } = require('./helpers/load-viewer.js');

const root = path.join(__dirname, '..');
let v;
afterEach(() => { if (v) { v.close(); v = null; } });

describe('viewer folder', () => {
  it('U-9: loads only files that exist next to the page', () => {
    const html = fs.readFileSync(path.join(viewerDir, 'index.html'), 'utf8');
    const local = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map(m => m[1]).filter(r => !/^(https?:)?\/\//.test(r));
    assert.deepEqual(local.sort(), ['catalog-core.js', 'viewer.css', 'viewer.js']);
    for (const f of local) assert.ok(fs.existsSync(path.join(viewerDir, f)), f + ' is missing');
    assert.ok(!local.some(f => f.includes('..') || f.startsWith('/')), 'no paths outside the folder');
  });

  it('U-9: works from file:// with the split files', async () => {
    v = await loadViewer({ url: 'file:///viewer/index.html#/browser-automation/browser-checks-without-code' });
    await v.settle();
    assert.equal(v.$$('#board .brick').length, 3);
    assert.deepEqual(v.errors, []);
  });
});

describe('single-file build', () => {
  const out = path.join(os.tmpdir(), 'tb-single-' + process.pid + '.html');
  it('U-10: produces one file with no local references and the same behaviour', async () => {
    const r = spawnSync(process.execPath, ['scripts/build-single.js', out], { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    try {
      const html = fs.readFileSync(out, 'utf8');
      assert.ok(!/<script[^>]+\ssrc=/.test(html), 'no script files');
      assert.ok(!/<link[^>]+href="(?!https:\/\/fonts\.googleapis\.com)/.test(html), 'no stylesheet files');
      assert.ok(html.includes('window.CatalogCore') && html.includes('function renderBoard'));
      v = await loadViewer({ htmlPath: out });
      await v.settle();
      assert.equal(v.$$('#dash .box').length, 12);
      v.click('#dash .topic:last-child .box:last-child');
      await v.settle();
      assert.equal(v.$$('#board .brick').length, 2);
      v.window.location.hash = '#/browser-automation/browser-checks-without-code';
      await v.settle();
      assert.equal(v.$$('#board .brick').length, 3);
      v.click('#board .brick[data-id="playwright-mcp"]');
      await v.settle();
      assert.equal(v.$('#detail h2').textContent, 'Playwright MCP');
      assert.deepEqual(v.errors, []);
    } finally { fs.rmSync(out, { force: true }); }
  });
});
