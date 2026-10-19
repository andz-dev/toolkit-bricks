'use strict';
const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { loadViewer, readViewerHtml, pathPoints } = require('./helpers/load-viewer.js');

let v;
afterEach(() => { if (v) { v.close(); v = null; } });

async function open(opts) { v = loadViewer(opts); await v.settle(); return v; }
async function pick(id) { v.click(`#board .brick[data-id="${id}"]`); await v.settle(); }
async function layerOn() { v.click('.tog'); await v.settle(); }
const text = el => el.textContent.replace(/\s+/g, ' ').trim();
const h3s = () => v.$$('#detail h3').map(text);

describe('main board: connections', () => {
  it('V-1: shows bricks and connections only, no infrastructure', async () => {
    await open();
    assert.equal(v.$$('#board .brick').length, 4);
    assert.equal(v.$$('#board .lnode').length, 0);
    for (const word of ['VS Code', 'Node.js', 'Python', 'Desktop OS']) assert.ok(!text(v.$('#board')).includes(word), word + ' must not be on the board');
  });

  it('V-2: users sit above providers and cables run from the user down to the provider', async () => {
    await open();
    const rowOf = id => v.$$('#rows .row').findIndex(r => r.querySelector(`[data-id="${id}"]`));
    const edges = v.$$('#wires .edge');
    assert.equal(edges.length, 3);
    for (const e of edges) {
      assert.ok(rowOf(e.dataset.from) < rowOf(e.dataset.to), `${e.dataset.from} must be above ${e.dataset.to}`);
      const pts = pathPoints(e.querySelector('path.cable').getAttribute('d'));
      assert.ok(pts[0][1] < pts[pts.length - 1][1], 'cable must end lower than it starts');
    }
  });

  it('V-3: every cable has an animation in the direction of the cable', async () => {
    await open();
    for (const e of v.$$('#wires .edge')) {
      assert.ok(e.querySelector('path.flow'), 'dash animation');
      const m = e.querySelector('animateMotion');
      assert.ok(m, 'pulse');
      assert.equal(m.getAttribute('path'), e.querySelector('path.cable').getAttribute('d'));
    }
  });

  it('V-4: each connection has a plug icon and a stud label, and every stud is in the legend', async () => {
    await open();
    const chips = v.$$('#chips .chip');
    assert.equal(chips.length, 3);
    for (const c of chips) assert.ok(c.querySelector('svg'));
    assert.deepEqual(chips.map(text).sort(), ['Browser', 'MCP', 'MCP']);
    const legend = text(v.$('#legend'));
    for (const s of ['MCP', 'Browser', 'Workflow']) assert.ok(legend.includes(s));
  });

  it('V-5: a click on a brick opens its details', async () => {
    await open();
    assert.equal(text(v.$('#detail h2')), 'Pick a brick');
    await pick('github-copilot');
    assert.equal(text(v.$('#detail h2')), 'GitHub Copilot');
    assert.equal(v.$('#board .brick[data-id="github-copilot"]').getAttribute('aria-pressed'), 'true');
    assert.ok(v.$('#detail-wrap').contains(v.$('#detail')));
  });

  it('V-6: selecting a brick dims the unrelated ones; selecting a setup highlights its bricks', async () => {
    await open();
    await pick('github-copilot');
    const dim = id => v.$(`#board .brick[data-id="${id}"]`).classList.contains('dim');
    assert.equal(dim('edge'), true);
    assert.equal(dim('playwright-mcp'), false);
    assert.equal(dim('custom-mcp-server'), false);
    v.click('.recipe-head');
    await v.settle();
    for (const id of ['github-copilot', 'playwright-mcp', 'edge']) assert.ok(v.$(`#board .brick[data-id="${id}"]`).classList.contains('inrecipe'));
    assert.ok(!v.$('#board .brick[data-id="custom-mcp-server"]').classList.contains('inrecipe'));
  });
});

describe('infrastructure layer', () => {
  it('I-1: is an optional layer in the details panel, off by default', async () => {
    await open();
    await pick('playwright-mcp');
    const tog = v.$('.tog');
    assert.equal(tog.getAttribute('aria-pressed'), 'false');
    assert.equal(v.$$('#detail .layer').length, 0);
    await layerOn();
    assert.equal(v.$('.tog').getAttribute('aria-pressed'), 'true');
    assert.equal(v.$$('#detail .layer').length, 1);
    assert.equal(v.$$('#board .layer').length, 0);
  });

  it('I-2: the foundation is at the bottom and trains run upward', async () => {
    await open();
    await pick('playwright-mcp');
    await layerOn();
    const rows = v.$$('#detail .lrow');
    assert.ok(rows[0].querySelector('[data-id="playwright-mcp"]'));
    assert.ok(rows[rows.length - 1].querySelector('[data-id="desktop-os"]'));
    const wagons = v.$$('#detail .lsvg animateMotion');
    assert.ok(wagons.length >= 2);
    for (const w of wagons) {
      const pts = pathPoints(w.getAttribute('path'));
      assert.ok(pts[0][1] > pts[pts.length - 1][1], 'a train must start low and end high');
    }
  });

  it('I-3: host apps read "running inside", everything else "running on"', async () => {
    await open();
    await pick('github-copilot');
    await layerOn();
    let chips = v.$$('#detail .chip.rel').map(text);
    assert.deepEqual(chips.sort(), ['running inside', 'running on']);
    const where = text(v.$('#detail'));
    assert.match(where, /VS Code\s*running inside/);
    await pick('playwright-mcp');
    chips = v.$$('#detail .chip.rel').map(text);
    assert.ok(chips.length > 0 && chips.every(t => t === 'running on'));
    await pick('edge');
    assert.ok(v.$$('#detail .chip.rel').map(text).every(t => t === 'running on'));
  });

  it('I-4: alternatives sit side by side and are marked with "or"', async () => {
    await open();
    await pick('custom-mcp-server');
    await layerOn();
    const row = v.$$('#detail .lrow').find(r => r.querySelector('[data-id="nodejs"]'));
    assert.ok(row.querySelector('[data-id="python"]'));
    const chips = v.$$('#detail .chip.rel').map(text);
    assert.ok(chips.includes('or') && chips.includes('running on'));
  });

  it('I-5: a click on a layer item opens its details, and Back returns', async () => {
    await open();
    await pick('playwright-mcp');
    await layerOn();
    v.click('#detail .lnode[data-id="nodejs"]');
    await v.settle();
    assert.equal(text(v.$('#detail h2')), 'Node.js');
    assert.equal(text(v.$('.back')), 'Back to Playwright MCP');
    assert.equal(v.$$('#detail .layer').length, 1, 'the layer stays on');
    v.click('.back');
    await v.settle();
    assert.equal(text(v.$('#detail h2')), 'Playwright MCP');
  });

  it('I-6: variants are shown as text and add no nodes', async () => {
    await open();
    await pick('edge');
    await layerOn();
    assert.equal(v.$$('#detail .lnode').length, 2);
    assert.equal(text(v.$('#detail .lnode[data-id="desktop-os"] .lv')), 'Windows · macOS · Linux');
  });

  it('I-7: a brick shows everything it needs; a platform also shows what runs directly on it', async () => {
    await open();
    await pick('playwright-mcp');
    await layerOn();
    assert.deepEqual(v.$$('#detail .lnode').map(n => n.dataset.id).sort(), ['desktop-os', 'nodejs', 'playwright-mcp']);
    v.click('#detail .lnode[data-id="desktop-os"]');
    await v.settle();
    assert.deepEqual(v.$$('#detail .lnode').map(n => n.dataset.id).sort(), ['desktop-os', 'edge', 'nodejs', 'python', 'vs-code']);
  });
});

describe('content', () => {
  it('T-1: bricks and platforms explain why, what and how', async () => {
    await open();
    await pick('github-copilot');
    for (const h of ['Why', 'What', 'How']) assert.ok(h3s().includes(h), h);
    v.close();
    await open();
    await pick('playwright-mcp');
    v.click('#detail .conn');
    await v.settle();
    assert.equal(text(v.$('#detail h2')), 'Node.js');
    for (const h of ['Why', 'What', 'How']) assert.ok(h3s().includes(h), h);
  });

  it('T-1: setups explain why, what and how when opened', async () => {
    await open();
    v.click('.recipe-head');
    await v.settle();
    for (const h of ['Why', 'What', 'How', 'Example']) assert.ok(h3s().includes(h), h);
  });

  it('T-2: how is an ordered list with one item per step', async () => {
    await open();
    await pick('github-copilot');
    const steps = v.$$('#detail ol.steps li');
    assert.equal(steps.length, 3);
  });

  it('T-3: installation and usage are rated with stars and a reason', async () => {
    await open();
    await pick('playwright-mcp');
    const ratings = v.$$('#detail .rating');
    assert.deepEqual(ratings.map(r => text(r.querySelector('.rlabel'))), ['Installation', 'Usage']);
    assert.equal(ratings[0].querySelector('.stars').getAttribute('aria-label'), '3 of 5 stars');
    assert.equal(ratings[0].querySelectorAll('svg.on').length, 3);
    assert.equal(ratings[0].querySelectorAll('svg').length, 5);
    assert.match(text(ratings[0].querySelector('.rwhy')), /connected by hand/);
  });

  it('T-3: the browser-checks setup is 3 of 5 for installation because of the manual connection', async () => {
    await open();
    v.click('.recipe-head');
    await v.settle();
    const rating = v.$('#detail .recipe .rating');
    assert.equal(rating.querySelector('.stars').getAttribute('aria-label'), '3 of 5 stars');
    assert.match(text(rating.querySelector('.rwhy')), /manual connection of all tools/);
  });

  it('C-4: there is one explanation, no manager and developer split', async () => {
    await open();
    await pick('github-copilot');
    assert.ok(!/\b(Manager|Developer)\b/.test(text(v.$('#detail-wrap'))));
    assert.equal(v.$$('.seg, [role="tablist"]').length, 0);
  });
});

describe('behaviour and look', () => {
  it('U-1: the theme toggle switches between dark and light and survives blocked storage', async () => {
    await open();
    const root = v.document.documentElement;
    v.click('#theme');
    assert.equal(root.getAttribute('data-theme'), 'dark');
    v.click('#theme');
    assert.equal(root.getAttribute('data-theme'), 'light');
    assert.deepEqual(v.errors, []);
  });

  it('U-1: both themes define the colour tokens', () => {
    const html = readViewerHtml();
    assert.match(html, /@media \(prefers-color-scheme: dark\)\{:root:not\(\[data-theme="light"\]\)/);
    assert.match(html, /:root\[data-theme="dark"\]\{/);
  });

  it('U-2: with reduced motion there are no pulses, dashes or trains', async () => {
    await open({ reducedMotion: true });
    assert.equal(v.$$('#wires animateMotion').length, 0);
    await pick('playwright-mcp');
    await layerOn();
    assert.equal(v.$$('#detail animateMotion').length, 0);
    assert.match(readViewerHtml(), /prefers-reduced-motion:reduce\)\{\.flow\{animation:none\}/);
  });

  it('U-3: side gutters use at least 16px and respect safe areas (static check; look at it in a browser too)', () => {
    const html = readViewerHtml();
    assert.match(html, /padding-left:max\(16px,env\(safe-area-inset-left/);
    assert.match(html, /padding-right:max\(16px,env\(safe-area-inset-right/);
    assert.match(html, /name="viewport"|claude:viewport-fit-sides/);
  });

  it('U-4: no scripts or styles from outside except web fonts', () => {
    const html = readViewerHtml();
    assert.ok(!/<script[^>]+\ssrc=/i.test(html));
    const links = [...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map(m => m[1]);
    assert.ok(links.length > 0 && links.every(h => h.startsWith('https://fonts.googleapis.com/')));
    assert.ok(!/\bimport\s*\(|\bimport\s+.+\sfrom\s/.test(html));
  });

  it('U-5: there is no file-open button, no drop zone and no query parameter loader', async () => {
    await open();
    assert.equal(v.$$('input[type="file"]').length, 0);
    assert.ok(!/open catalog/i.test(text(v.document.body)));
    assert.ok(!/dragover|dropzone|\?catalog=/i.test(readViewerHtml()));
  });

  it('U-5: when served, it loads catalog.json next to the page', async () => {
    const asked = [];
    const served = JSON.parse(JSON.stringify(require('../profiles/demo/catalog.json')));
    served.meta.title = 'Served catalogue';
    await open({
      url: 'http://localhost:8080/index.html',
      fetch: async url => { asked.push(url); return { ok: true, json: async () => served }; }
    });
    assert.deepEqual(asked, ['catalog.json']);
    assert.equal(text(v.$('#title')), 'Served catalogue');
  });

  it('U-5: when catalog.json is missing, it falls back to the built-in demo', async () => {
    await open({ url: 'http://localhost:8080/index.html', fetch: async () => ({ ok: false, json: async () => ({}) }) });
    assert.equal(text(v.$('#title')), 'Our AI and automation toolkit');
    assert.equal(v.$$('#board .brick').length, 4);
  });

  it('U-6: a served catalog.json with another version is refused, and the demo is shown instead', async () => {
    const bad = JSON.parse(JSON.stringify(require('../profiles/demo/catalog.json')));
    bad.schemaVersion = '1.1';
    await open({ url: 'http://localhost:8080/index.html', fetch: async () => ({ ok: true, json: async () => bad }) });
    assert.match(text(v.$('#notice')), /schemaVersion is "1\.1"/);
    assert.equal(v.$$('#board .brick').length, 4);
  });

  it('U-6: a catalogue with another schema version is refused with a clear message', async () => {
    await open({ mutateHtml: h => h.replace('"schemaVersion": "1.2"', '"schemaVersion": "1.1"') });
    assert.equal(v.$$('#board .brick').length, 0);
    assert.match(text(v.$('#notice')), /schemaVersion is "1\.1"/);
    assert.match(text(v.$('#notice')), /reads "1\.2"/);
  });

  it('U-7: every button has a name, and Escape closes the details', async () => {
    await open();
    await pick('playwright-mcp');
    await layerOn();
    for (const b of v.$$('button')) {
      const name = (b.getAttribute('aria-label') || text(b));
      assert.ok(name.length > 0, 'a button has no accessible name: ' + b.outerHTML.slice(0, 80));
    }
    v.document.dispatchEvent(new v.window.KeyboardEvent('keydown', { key: 'Escape' }));
    await v.settle();
    assert.equal(text(v.$('#detail h2')), 'Pick a brick');
  });
});

describe('placeholder text', () => {
  it('U-8: no screen shows "null" or "undefined", for any brick, platform or setup', async () => {
    await open();
    const ids = v.$$('#board .brick').map(b => b.dataset.id);
    const check = (what) => {
      const t = text(v.$('#detail-wrap'));
      assert.ok(!/\b(null|undefined|NaN)\b/.test(t), `placeholder text on ${what}: ${t.match(/.{0,30}\b(null|undefined|NaN)\b.{0,10}/)}`);
    };
    check('the start screen');
    for (const id of ids) {
      await pick(id);
      check('brick ' + id);
      if (!v.$('.tog[aria-pressed="true"]')) await layerOn();
      check('layer of ' + id);
      const nodes = v.$$('#detail .lnode').map(n => n.dataset.id).filter(n => n !== id);
      for (const n of nodes) {
        if (!v.$(`#detail .lnode[data-id="${n}"]`)) await pick(id);
        v.click(`#detail .lnode[data-id="${n}"]`);
        await v.settle();
        check('platform ' + n);
      }
      v.click('.close');
      await v.settle();
    }
    v.click('.recipe-head');
    await v.settle();
    check('an opened setup');
  });
});
