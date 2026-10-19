'use strict';
// Loads viewer/index.html in jsdom with a fake layout, so tests can check geometry
// (direction of cables and trains) without a real browser.
const fs = require('fs');
const path = require('path');
const { JSDOM, ResourceLoader } = require('jsdom');

const viewerDir = path.join(__dirname, '..', '..', 'viewer');
const viewerPath = path.join(viewerDir, 'index.html');
const readViewerHtml = () => fs.readFileSync(viewerPath, 'utf8');
// The viewer is split into files; checks on source text read them separately or together.
const readViewerSources = () => {
  const html = readViewerHtml();
  const css = fs.readFileSync(path.join(viewerDir, 'viewer.css'), 'utf8');
  const js = fs.readFileSync(path.join(viewerDir, 'viewer.js'), 'utf8');
  const core = fs.readFileSync(path.join(viewerDir, 'catalog-core.js'), 'utf8');
  return { html, css, js, core, all: [html, css, js, core].join('\n') };
};

// Serves files next to the page from disk; web fonts are skipped (no network in tests).
class LocalLoader extends ResourceLoader {
  constructor(dir) { super(); this.dir = dir; }
  fetch(url) {
    if (/^https?:\/\/fonts\.(googleapis|gstatic)\.com/.test(url)) return null;
    const name = new URL(url).pathname.split('/').pop();
    return fs.promises.readFile(path.join(this.dir, name));
  }
}

function indexIn(el, selector) {
  return [...el.parentElement.children].indexOf(el);
}

// Fake layout: rows are stacked top to bottom, items sit side by side. Nothing else needs real sizes.
function installLayout(w) {
  const box = (x, y, width, height) => ({ x, y, left: x, top: y, width, height, right: x + width, bottom: y + height });
  w.Element.prototype.getBoundingClientRect = function () {
    if (this.matches('.lnode')) {
      const row = indexIn(this.closest('.lrow'));
      return box(indexIn(this) * 140, row * 100, 120, 40);
    }
    if (this.matches('.brick')) {
      return box(indexIn(this) * 160, indexIn(this.closest('.row')) * 200, 136, 100);
    }
    if (this.matches('.port')) {
      const b = this.closest('.brick').getBoundingClientRect();
      const top = this.parentElement.classList.contains('top');
      return box(b.left + 60 + indexIn(this) * 24, top ? b.top : b.bottom, 14, 14);
    }
    if (this.matches('#board')) return box(0, 0, 1000, 1000);
    if (this.matches('.layer')) return box(0, 0, 400, 600);
    return box(0, 0, 0, 0);
  };
  w.SVGElement.prototype.getTotalLength = () => 100;
  w.SVGElement.prototype.getPointAtLength = () => ({ x: 1, y: 1 });
}

async function loadViewer(opts) {
  const o = opts || {};
  const source = o.htmlPath || viewerPath;
  const raw = fs.readFileSync(source, 'utf8');
  const html = o.mutateHtml ? o.mutateHtml(raw) : raw;
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: new LocalLoader(path.dirname(source)),
    url: o.url || 'file:///viewer/index.html',
    pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = q => ({
        matches: !!o.reducedMotion && /reduce/.test(q),
        media: q, addEventListener() {}, removeEventListener() {}
      });
      if (o.fetch) w.fetch = o.fetch;
      w.ResizeObserver = class { observe() {} disconnect() {} };
      w.Element.prototype.scrollIntoView = function () {};
      installLayout(w);
      w.addEventListener('error', e => errors.push(e.message));
    }
  });
  const w = dom.window;
  const d = w.document;
  await new Promise(res => (d.readyState === 'complete' ? res() : w.addEventListener('load', res)));
  const settle = () => new Promise(r => setTimeout(r, 80));
  return {
    window: w, document: d, errors, settle,
    $: s => d.querySelector(s),
    $$: s => [...d.querySelectorAll(s)],
    click(selector) {
      const el = d.querySelector(selector);
      if (!el) throw new Error('Nothing to click: ' + selector);
      el.click();
    },
    close: () => w.close()
  };
}

// All numbers in an SVG path "M x y C ..." as [x, y] pairs.
function pathPoints(d) {
  const n = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const pts = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
  return pts;
}

module.exports = { loadViewer, readViewerHtml, readViewerSources, pathPoints, viewerPath, viewerDir };
