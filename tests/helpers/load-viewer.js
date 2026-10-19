'use strict';
// Loads viewer/index.html in jsdom with a fake layout, so tests can check geometry
// (direction of cables and trains) without a real browser.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const viewerPath = path.join(__dirname, '..', '..', 'viewer', 'index.html');
const readViewerHtml = () => fs.readFileSync(viewerPath, 'utf8');

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

function loadViewer(opts) {
  const o = opts || {};
  const html = o.mutateHtml ? o.mutateHtml(readViewerHtml()) : readViewerHtml();
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
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

module.exports = { loadViewer, readViewerHtml, pathPoints, viewerPath };
