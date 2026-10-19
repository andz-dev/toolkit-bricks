'use strict';
const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { loadViewer, readViewerSources, pathPoints } = require('./helpers/load-viewer.js');

let v;
afterEach(() => { if (v) { v.close(); v = null; } });

const PAGE1 = 'browser-automation/browser-checks-without-code';
const PAGE2 = 'browser-automation/copilot-with-own-mcp-server';
// Opens the viewer on a use case page (default: the first of the browser topic). Pass page: '' for the dashboard.
async function open(opts) {
  const o = Object.assign({}, opts);
  const page = o.page === undefined ? PAGE1 : o.page;
  if (!o.url) o.url = 'file:///viewer/index.html' + (page ? '#/' + page : '');
  v = await loadViewer(o); await v.settle(); return v;
}
async function pick(id) { v.click(`#board .brick[data-id="${id}"]`); await v.settle(); }
async function layerOn() { v.click('.tog'); await v.settle(); }
const text = el => el.textContent.replace(/\s+/g, ' ').trim();
const h3s = () => v.$$('#detail h3').map(text);

describe('main board: connections', () => {
  it('V-1: shows bricks and connections only, no infrastructure', async () => {
    await open();
    assert.equal(v.$$('#board .brick').length, 3);
    assert.equal(v.$$('#board .lnode').length, 0);
    for (const word of ['VS Code', 'Node.js', 'Python', 'Desktop OS']) assert.ok(!text(v.$('#board')).includes(word), word + ' must not be on the board');
  });

  it('V-2: users sit above providers and cables run from the user down to the provider', async () => {
    await open();
    const rowOf = id => v.$$('#rows .row').findIndex(r => r.querySelector(`[data-id="${id}"]`));
    const edges = v.$$('#wires .edge');
    assert.equal(edges.length, 2);
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
    assert.equal(chips.length, 2);
    for (const c of chips) assert.ok(c.querySelector('svg'));
    assert.deepEqual(chips.map(text).sort(), ['Browser', 'MCP']);
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

  it('V-6: selecting a brick dims the unrelated ones', async () => {
    await open();
    await pick('github-copilot');
    const dim = id => v.$(`#board .brick[data-id="${id}"]`).classList.contains('dim');
    assert.equal(dim('edge'), true);
    assert.equal(dim('playwright-mcp'), false);
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
    await open({ page: PAGE2 });
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

  it('T-1: a use case page explains why, what, how and gives an example', async () => {
    await open();
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
    const rating = v.$('#detail .usecase .rating');
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
    const css = readViewerSources().css;
    assert.match(css, /@media \(prefers-color-scheme: dark\)\{:root:not\(\[data-theme="light"\]\)/);
    assert.match(css, /:root\[data-theme="dark"\]\{/);
  });

  it('U-2: with reduced motion there are no pulses, dashes or trains', async () => {
    await open({ reducedMotion: true });
    assert.equal(v.$$('#wires animateMotion').length, 0);
    await pick('playwright-mcp');
    await layerOn();
    assert.equal(v.$$('#detail animateMotion').length, 0);
    assert.match(readViewerSources().css, /prefers-reduced-motion:reduce\)\{\.flow\{animation:none\}/);
  });

  it('U-3: side gutters use at least 16px and respect safe areas (static check; look at it in a browser too)', () => {
    const { css, html } = readViewerSources();
    assert.match(css, /padding-left:max\(16px,env\(safe-area-inset-left/);
    assert.match(css, /padding-right:max\(16px,env\(safe-area-inset-right/);
    assert.match(html, /name="viewport"|claude:viewport-fit-sides/);
  });

  it('U-4: no scripts or styles from outside except web fonts, and no modules or imports', () => {
    const { html, js, core } = readViewerSources();
    const refs = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map(m => m[1]);
    const external = refs.filter(r => /^(https?:)?\/\//.test(r));
    assert.ok(external.length > 0 && external.every(r => r.startsWith('https://fonts.googleapis.com/')), 'external: ' + external);
    assert.ok(!/<script[^>]+type="module"/.test(html));
    assert.ok(!/\bimport\s*\(|^\s*import\s.+\sfrom\s/m.test(js + core));
  });

  it('U-5: there is no file-open button, no drop zone and no query parameter loader', async () => {
    await open();
    assert.equal(v.$$('input[type="file"]').length, 0);
    assert.ok(!/open catalog/i.test(text(v.document.body)));
    assert.ok(!/dragover|dropzone|\?catalog=/i.test(readViewerSources().all));
  });

  const demoPkg = () => {
    const dir = require('path').join(__dirname, '..', 'profiles', 'demo');
    const collection = JSON.parse(require('fs').readFileSync(require('path').join(dir, 'collection.json'), 'utf8'));
    const profiles = {};
    for (const t of collection.topics) profiles[t.file] = JSON.parse(require('fs').readFileSync(require('path').join(dir, t.file), 'utf8'));
    return { collection, profiles };
  };
  const serve = (pkg, asked) => async url => {
    if (asked) asked.push(url);
    const data = url === 'collection.json' ? pkg.collection : pkg.profiles[url];
    return data ? { ok: true, json: async () => data } : { ok: false, json: async () => ({}) };
  };

  it('N-9: when served, it loads collection.json and then every profile it lists', async () => {
    const asked = [];
    const pkg = demoPkg();
    pkg.collection.title = 'Served package';
    await open({ page: '', url: 'http://localhost:8080/index.html', fetch: serve(pkg, asked) });
    assert.equal(asked[0], 'collection.json');
    assert.deepEqual(asked.slice(1).sort(), pkg.collection.topics.map(t => t.file).sort());
    assert.equal(text(v.$('#title')), 'Served package');
    assert.equal(v.$$('#dash .box').length, 12);
  });

  it('N-9: without a collection.json it falls back to the demo package built into the page', async () => {
    await open({ page: '', url: 'http://localhost:8080/index.html', fetch: async () => ({ ok: false, json: async () => ({}) }) });
    assert.equal(text(v.$('#title')), 'AI and automation toolkit');
    assert.equal(v.$$('#dash .box').length, 12);
  });

  it('U-5: there is nothing to open a file with; the page works from file:// with the built-in package', async () => {
    await open({ page: '' });
    assert.equal(v.$$('#dash .box').length, 12);
  });

  it('U-6: a served profile with another version is left out with a message, the others are shown', async () => {
    const pkg = demoPkg();
    pkg.profiles['catalog.json'].schemaVersion = '1.2';
    await open({ page: '', url: 'http://localhost:8080/index.html', fetch: serve(pkg) });
    assert.match(text(v.$('#notice')), /catalog\.json was not loaded/);
    assert.match(text(v.$('#notice')), /schemaVersion is "1\.2"/);
    assert.equal(v.$$('#dash .box').length, 10);
  });

  it('U-6: when no served profile is valid, the built-in demo is shown instead', async () => {
    const pkg = demoPkg();
    for (const f of Object.keys(pkg.profiles)) pkg.profiles[f].schemaVersion = '1.2';
    await open({ page: '', url: 'http://localhost:8080/index.html', fetch: serve(pkg) });
    assert.match(text(v.$('#notice')), /No topic could be loaded/);
    assert.equal(v.$$('#dash .box').length, 12);
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
    check('the use case of the page');
    for (const pg of [PAGE2, 'n8n/n8n-document-search']) {
      v.close();
      await open({ page: pg });
      check('the page ' + pg);
      for (const id of v.$$('#board .brick').map(b => b.dataset.id)) { await pick(id); check(pg + ' brick ' + id); }
    }
    v.close();
    await open({ page: '' });
    assert.ok(!/\b(null|undefined|NaN)\b/.test(text(v.$('#dash'))), 'placeholder text on the dashboard');
  });
});

// Changes the catalogue built into the page, so a test can try relations the demo does not have.
const withCatalog = fn => html => html.replace(/(id="package-data">\n)([\s\S]*?)(\n<\/script>)/, (_, a, json, b) => {
  const pkg = JSON.parse(json);
  fn(pkg.profiles['catalog.json'], pkg);
  return a + JSON.stringify(pkg, null, 2) + b;
});

describe('research', () => {
  it('R-2: a brick shows its research with the verified date, source links and open points', async () => {
    await open();
    await pick('edge');
    assert.ok(h3s().includes('Research'));
    const sec = v.$('#detail .research');
    assert.match(text(sec), /Checked on 2026-10-19/);
    assert.match(text(sec), /Chromebooks are not supported/);
    const link = sec.querySelector('li a');
    assert.equal(link.getAttribute('target'), '_blank');
    assert.match(link.getAttribute('href'), /^https:\/\/learn\.microsoft\.com\//);
    await pick('edge');
    await pick('github-copilot');
    assert.ok(!h3s().includes('Research'), 'no block, no section');
  });

  it('R-2: a platform shows its open points and who can answer them', async () => {
    await open();
    await pick('playwright-mcp');
    await layerOn();
    v.click('#detail .lnode[data-id="nodejs"]');
    await v.settle();
    assert.match(text(v.$('#detail .research')), /Who can answer: Profile owner/);
  });

  it('R-2: the start screen shows the research of the whole profile', async () => {
    await open();
    assert.match(text(v.$('#detail .research')), /Playwright MCP/);
  });

  it('R-2: a use case page can show its own research', async () => {
    await open({ mutateHtml: withCatalog(c => { c.recipes[0].research = { verifiedOn: '2026-10-19', facts: [{ text: 'A fact about the setup.' }] }; }) });
    assert.match(text(v.$('#detail .usecase .research')), /A fact about the setup\./);
  });

  it('R-3: bricks with research carry a marker on the board, bricks without do not', async () => {
    await open();
    const marked = v.$$('#board .brick').filter(b => b.querySelector('.rmark')).map(b => b.dataset.id).sort();
    assert.deepEqual(marked, ['edge', 'playwright-mcp']);
    assert.match(v.$('#board .brick[data-id="edge"]').getAttribute('aria-label'), /has research/);
  });

  it('R-4: only http and https links are shown, and they open safely', async () => {
    await open({ mutateHtml: withCatalog(c => {
      c.bricks.find(b => b.id === 'edge').research.sources.push({ label: 'Bad link', url: 'javascript:alert(1)' });
      c.bricks.find(b => b.id === 'edge').research.facts[0].source = { label: 'Bad fact link', url: 'data:text/html,x' };
    }) });
    await pick('edge');
    const anchors = v.$$('#detail a');
    assert.ok(anchors.length > 0);
    for (const a of anchors) {
      assert.match(a.getAttribute('href'), /^https?:\/\//);
      assert.match(a.getAttribute('rel'), /noopener/);
      assert.equal(a.getAttribute('target'), '_blank');
    }
    assert.ok(!/Bad link|Bad fact link/.test(text(v.$('#detail'))));
  });
});

describe('relations between bricks and platforms', () => {
  it('I-3: something that runs inside a brick reads "running inside"', async () => {
    await open({ page: PAGE2, mutateHtml: withCatalog(c => { c.bricks.find(b => b.id === 'custom-mcp-server').runsOn = ['playwright-mcp']; }) });
    await pick('custom-mcp-server');
    await layerOn();
    const chips = v.$$('#detail .chip.rel').map(text);
    assert.equal(chips.filter(c => c === 'running inside').length, 1, 'exactly one hop is inside a brick');
    assert.ok(chips.includes('running on'), 'the chain continues on a platform');
    assert.match(text(v.$('#detail')), /Playwright MCP\s*running inside/);
    v.click('#detail .lnode[data-id="playwright-mcp"]');
    await v.settle();
    assert.ok(h3s().includes('Running inside it'));
    assert.match(text(v.$('#detail')), /Custom MCP server/);
  });

  it('I-8: requirements are marked "needs" in the layer and listed under "Also needs"', async () => {
    await open({ mutateHtml: withCatalog(c => { c.bricks.find(b => b.id === 'edge').requires = ['nodejs']; }) });
    await pick('edge');
    await layerOn();
    const chips = v.$$('#detail .chip.rel').map(text).sort();
    assert.deepEqual(chips, ['needs', 'running on', 'running on']); // needs Node.js; Edge and Node.js run on the OS
    assert.ok(h3s().includes('Also needs'));
    assert.match(text(v.$('#detail')), /Node\.js\s*needs/);
  });
});

describe('dashboard and use case pages', () => {
  const fs2 = require('fs');
  const path2 = require('path');
  const demoDir = path2.join(__dirname, '..', 'profiles', 'demo');
  const collection = JSON.parse(fs2.readFileSync(path2.join(demoDir, 'collection.json'), 'utf8'));
  const expected = [];
  for (const t of collection.topics) {
    const p = JSON.parse(fs2.readFileSync(path2.join(demoDir, t.file), 'utf8'));
    for (const r of p.recipes) expected.push({ topic: t.id, id: r.id, title: r.title, bricks: r.bricks.length, topicTitle: p.meta.title });
  }
  const hash = () => v.window.location.hash;
  const key = e => `#/${e.topic}/${e.id}`;
  const press = (k, target) => (target || v.document).dispatchEvent(new v.window.KeyboardEvent('keydown', { key: k, bubbles: true }));

  it('N-1: opens on a dashboard with one clickable box per use case, grouped by topic', async () => {
    await open({ page: '' });
    assert.equal(v.$$('#dash .topic').length, collection.topics.length);
    assert.equal(v.$$('#dash .box').length, expected.length);
    assert.ok(v.$('#page').hidden && v.$('#pagenav').hidden);
    for (const b of v.$$('#dash .box')) assert.equal(b.tagName, 'A', 'the whole box is a link');
    assert.equal(v.$$('#dash .topic')[0].querySelectorAll('.box').length, 3);
  });

  it('N-2: every use case has its own link; back/forward, bookmarks and shared links work', async () => {
    await open({ page: '' });
    assert.deepEqual(v.$$('#dash .box').map(b => b.getAttribute('href')), expected.map(key));
    v.click('#dash .box:nth-child(2)');
    await v.settle();
    assert.equal(hash(), key(expected[1]));
    assert.equal(text(v.$('#title')), expected[1].title);
    v.window.location.hash = key(expected[4]);
    await v.settle();
    assert.equal(text(v.$('#title')), expected[4].title);
    v.window.location.hash = '#/nothing/here';
    await v.settle();
    assert.ok(!v.$('#dash').hidden, 'an unknown link shows the dashboard');
    v.close();
    await open({ page: expected[6].topic + '/' + expected[6].id });
    assert.equal(text(v.$('#title')), expected[6].title, 'a shared link opens the page directly');
  });

  it('N-3: the bar shows Back, Home and Next with the titles of the neighbours, and wraps around', async () => {
    await open({ page: expected[0].topic + '/' + expected[0].id });
    const bar = () => ({ prev: text(v.$('#pagenav .prev .nm')), next: text(v.$('#pagenav .next .nm')), home: v.$('#pagenav .home') });
    assert.equal(bar().prev, expected[expected.length - 1].title);
    assert.equal(bar().next, expected[1].title);
    assert.ok(bar().home);
    assert.equal(v.$('#pagenav .prev').getAttribute('href'), key(expected[expected.length - 1]));
    v.click('#pagenav .prev');
    await v.settle();
    assert.equal(text(v.$('#title')), expected[expected.length - 1].title);
    assert.equal(bar().next, expected[0].title);
  });

  it('N-4: Home opens the dashboard; arrow keys go back and next unless a text field has focus', async () => {
    await open({ page: expected[1].topic + '/' + expected[1].id });
    press('ArrowRight');
    await v.settle();
    assert.equal(text(v.$('#title')), expected[2].title);
    press('ArrowLeft');
    press('ArrowLeft');
    await v.settle();
    assert.equal(text(v.$('#title')), expected[0].title);
    const input = v.document.createElement('input');
    v.document.body.append(input);
    press('ArrowRight', input);
    await v.settle();
    assert.equal(text(v.$('#title')), expected[0].title, 'ignored inside a text field');
    v.click('#pagenav .home');
    await v.settle();
    assert.ok(!v.$('#dash').hidden && v.$('#pagenav').hidden);
    assert.equal(hash(), '#/');
  });

  it('N-5: navigation uses icons together with text, accessible names and a position', async () => {
    await open({ page: expected[2].topic + '/' + expected[2].id });
    for (const sel of ['.prev', '.home', '.next']) {
      const a = v.$('#pagenav ' + sel);
      assert.ok(a.querySelector('svg'), sel + ' has an icon');
      assert.ok(text(a).length > 0 && a.getAttribute('aria-label').length > 0, sel + ' has text and a name');
    }
    assert.match(v.$('#pagenav .home').getAttribute('aria-label'), /^Home/);
    assert.equal(text(v.$('#pagenav .pos')), `3 of ${expected.length}`);
  });

  it('N-6: a use case page shows only its bricks; other use cases using a brick are linked', async () => {
    await open();
    assert.equal(v.$$('#board .brick').length, 3);
    assert.ok(!v.$('#board .brick[data-id="custom-mcp-server"]'));
    await pick('github-copilot');
    const sec = v.$$('#detail .sec').find(s => text(s.querySelector('h3')) === 'Also used in');
    assert.ok(sec, 'an Also used in section');
    const a = sec.querySelector('a');
    assert.equal(a.getAttribute('href'), '#/' + PAGE2);
    v.click('#detail a.plink');
    await v.settle();
    assert.equal(v.$$('#board .brick').length, 2);
    assert.equal(text(v.$('#title')), 'Copilot with your own MCP server');
    assert.equal(text(v.$('#detail h2')), 'Pick a brick', 'selection is cleared on a new page');
  });

  it('N-7: page order follows collection.json, then the recipes of each profile', async () => {
    await open({ page: expected[0].topic + '/' + expected[0].id });
    const seen = [];
    for (let i = 0; i < expected.length; i++) {
      seen.push(hash());
      v.click('#pagenav .next');
      await v.settle();
    }
    assert.deepEqual(seen, expected.map(key));
    assert.equal(hash(), key(expected[0]), 'wrapped around');
    const boxTitles = (await (async () => { v.click('#pagenav .home'); await v.settle(); return v.$$('#dash .btitle').map(text); })());
    assert.deepEqual(boxTitles, expected.map(e => e.title), 'a use case in two profiles shows twice');
  });

  it('N-8: a box shows icon, title, topic, installation and usage stars and the bricks involved', async () => {
    await open({ page: '' });
    const boxes = v.$$('#dash .box');
    boxes.forEach((b, i) => {
      assert.ok(b.querySelector('.ibox svg'), 'icon');
      assert.equal(text(b.querySelector('.btitle')), expected[i].title);
      assert.equal(text(b.querySelector('.btopic')), expected[i].topicTitle);
      assert.equal(b.querySelectorAll('.stars').length, 2);
      assert.deepEqual(b.querySelectorAll('.effl').length, 2);
      assert.equal(b.querySelectorAll('.mini span').length, expected[i].bricks);
    });
  });
});
