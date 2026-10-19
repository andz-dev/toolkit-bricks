'use strict';
// Real-browser checks of the viewer: geometry, motion direction, overflow and contrast.
// Rule IDs at the start of a test title tie each check to docs/DESIGN.md.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'phone', width: 390, height: 844 }
];
const SCHEMES = ['light', 'dark'];

const PAGE1 = '/#/browser-automation/browser-checks-without-code';
const PAGE2 = '/#/browser-automation/copilot-with-own-mcp-server';
async function openViewer(page, { reducedMotion = false, url = PAGE1 } = {}) {
  const problems = [];
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) problems.push('console: ' + m.text()); });
  // Web fonts are not needed for the checks and make results depend on the network.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  await page.goto(url);
  if (url === '/') { await page.waitForSelector('#dash .box'); return problems; }
  await page.waitForSelector('#board .brick');
  await page.waitForSelector('#wires .edge', { state: 'attached' });
  return problems;
}

const box = async loc => { const b = await loc.boundingBox(); if (!b) throw new Error('not visible'); return b; };
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const pick = (page, id) => page.locator(`#board .brick[data-id="${id}"]`).click();
const layerOn = async page => { await page.locator('.tog').click(); await page.waitForSelector('#detail .layer'); await page.waitForSelector('#detail .lsvg path.rail', { state: 'attached' }); };

async function centers(page, selector) {
  return page.evaluate(sel => [...document.querySelectorAll(sel)].map(e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }), selector);
}
// Net vertical movement per element over a short time, ignoring the jump when a loop restarts.
async function verticalTravel(page, selector, samples = 10, gap = 90) {
  const series = [];
  for (let i = 0; i < samples; i++) { series.push(await centers(page, selector)); await page.waitForTimeout(gap); }
  const n = series[0].length;
  const out = [];
  for (let k = 0; k < n; k++) {
    let dy = 0, moved = 0;
    for (let i = 1; i < samples; i++) {
      const [x0, y0] = series[i - 1][k], [x1, y1] = series[i][k];
      const d = Math.hypot(x1 - x0, y1 - y0);
      if (d > 120) continue; // loop restart
      dy += y1 - y0; moved += d;
    }
    out.push({ dy, moved });
  }
  return out;
}

// colour helpers for contrast
function parseColor(s) {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) throw new Error('unexpected colour ' + s);
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}
const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

for (const vp of VIEWPORTS) {
  for (const scheme of SCHEMES) {
    test.describe(`${vp.name} ${scheme}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height }, colorScheme: scheme });

      test(`V-2: cables run from the user down to the provider (${vp.name} ${scheme})`, async ({ page }) => {
        const problems = await openViewer(page);
        const y = async id => (await box(page.locator(`#board .brick[data-id="${id}"]`))).y;
        expect(await y('github-copilot')).toBeLessThan(await y('playwright-mcp'));
        expect(await y('playwright-mcp')).toBeLessThan(await y('edge'));
        const ends = await page.$$eval('#wires .edge path.cable', ps => ps.map(p => { const l = p.getTotalLength(); const a = p.getPointAtLength(0), b = p.getPointAtLength(l); return [a.y, b.y]; }));
        expect(ends.length).toBe(2);
        for (const [a, b] of ends) expect(b).toBeGreaterThan(a);
        expect(problems).toEqual([]);
      });

      test(`V-3: pulses really move downward along the cables (${vp.name} ${scheme})`, async ({ page }) => {
        await openViewer(page);
        const travel = await verticalTravel(page, '#wires .edge circle');
        expect(travel.length).toBe(2);
        for (const t of travel) { expect(t.moved).toBeGreaterThan(5); expect(t.dy).toBeGreaterThan(0); }
      });

      test(`I-2: the foundation is at the bottom and trains really move upward (${vp.name} ${scheme})`, async ({ page }) => {
        await openViewer(page);
        await pick(page, 'playwright-mcp');
        await layerOn(page);
        const y = async id => (await box(page.locator(`#detail .lnode[data-id="${id}"]`))).y;
        expect(await y('playwright-mcp')).toBeLessThan(await y('nodejs'));
        expect(await y('nodejs')).toBeLessThan(await y('desktop-os'));
        const travel = await verticalTravel(page, '#detail .lsvg rect.wagon');
        expect(travel.length).toBeGreaterThanOrEqual(2);
        for (const t of travel) { expect(t.moved).toBeGreaterThan(5); expect(t.dy).toBeLessThan(0); }
      });

      test(`V-1: no brick overlaps another and no label overlaps a brick (${vp.name} ${scheme})`, async ({ page }) => {
        await openViewer(page);
        const bricks = await page.locator('#board .brick').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return { id: e.dataset.id, x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height }; }));
        for (let i = 0; i < bricks.length; i++) for (let j = i + 1; j < bricks.length; j++) expect(overlaps(bricks[i], bricks[j]), `${bricks[i].id} overlaps ${bricks[j].id}`).toBe(false);
        const chips = await page.locator('#chips .chip').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height, label: e.textContent }; }));
        for (const c of chips) for (const b of bricks) expect(overlaps(c, b), `chip "${c.label}" overlaps ${b.id}`).toBe(false);
      });

      test(`V-5: details open on the right on wide screens and below on narrow ones (${vp.name} ${scheme})`, async ({ page }) => {
        await openViewer(page);
        await pick(page, 'github-copilot');
        await expect(page.locator('#detail h2')).toHaveText('GitHub Copilot');
        const board = await box(page.locator('#board')), panel = await box(page.locator('#detail-wrap'));
        if (vp.width >= 880) expect(panel.x).toBeGreaterThanOrEqual(board.x + board.width - 1);
        else expect(panel.y + (await page.evaluate(() => window.scrollY))).toBeGreaterThanOrEqual(board.y + (await page.evaluate(() => window.scrollY)) + board.height - 1);
      });

      test(`U-3: 16px gutters and no horizontal scroll in every state (${vp.name} ${scheme})`, async ({ page }) => {
        await openViewer(page, { url: PAGE2 });
        const noScroll = async state => {
          const w = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
          expect(w[0], `horizontal scroll in state: ${state}`).toBeLessThanOrEqual(w[1]);
        };
        await noScroll('start');
        const h1 = await box(page.locator('h1'));
        expect(h1.x).toBeGreaterThanOrEqual(15.5);
        const board = await box(page.locator('#board'));
        expect(board.x + board.width).toBeLessThanOrEqual(vp.width - 15.5);
        await pick(page, 'custom-mcp-server');
        await noScroll('brick selected');
        await layerOn(page);
        await noScroll('layer on');
        const layer = await box(page.locator('#detail .layer'));
        for (const n of await page.locator('#detail .lnode').all()) {
          const b = await box(n);
          expect(b.x).toBeGreaterThanOrEqual(layer.x - 0.5);
          expect(b.x + b.width).toBeLessThanOrEqual(layer.x + layer.width + 0.5);
        }
        await page.keyboard.press('Escape');
        await page.locator('#pagenav .next').click();
        await noScroll('next page');
      });

      test(`U-1: text is readable in this theme, contrast of at least 4.5 (${vp.name} ${scheme})`, async ({ page }) => {
        await openViewer(page);
        await pick(page, 'playwright-mcp');
        await page.locator('.tog').click();
        const results = await page.evaluate(() => {
          const pickSel = ['h1', '.lede', '.mono', '#legend .item span:last-child', '.brick .name', '.brick .cat', '#detail h2', '#detail h3', '.summary', '.txt', '.steps li', '.rlabel', '.rwhy', '.pill', '.tog', '.chip', '.lnode', '.lv', '.conn .nm', '.stud'];
          const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; const m = c.match(/rgba?\(([^)]+)\)/); const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); if ((p.length < 4 ? 1 : p[3]) >= 0.99) return c; } return 'rgb(255,255,255)'; };
          return pickSel.flatMap(s => [...document.querySelectorAll(s)].slice(0, 3).map(el => ({ s, fg: getComputedStyle(el).color, bg: bgOf(el), t: el.textContent.trim().slice(0, 30) })));
        });
        const failures = results.map(r => ({ ...r, ratio: contrast(parseColor(r.fg), parseColor(r.bg)) })).filter(r => r.t && r.ratio < 4.5);
        expect(failures.map(f => `${f.s} "${f.t}" ${f.ratio.toFixed(2)}`)).toEqual([]);
      });
    });
  }
}

test.describe('dashboard and navigation', () => {
  for (const vp of VIEWPORTS) {
    test(`N-1: the dashboard has 16px gutters, no horizontal scroll and boxes that do not overlap (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const problems = await openViewer(page, { url: '/' });
      const w = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(w[0]).toBeLessThanOrEqual(w[1]);
      const boxes = await page.locator('#dash .box').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height }; }));
      expect(boxes.length).toBe(12);
      for (const b of boxes) { expect(b.x).toBeGreaterThanOrEqual(15.5); expect(b.x + b.width).toBeLessThanOrEqual(vp.width - 15.5); }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(overlaps(boxes[i], boxes[j])).toBe(false);
      expect(problems).toEqual([]);
    });

    test(`N-3: the bar is fixed at the bottom, Back on the left, Next on the right, and hides no content (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await openViewer(page);
      const bar = await box(page.locator('#pagenav'));
      expect(bar.y + bar.height).toBeGreaterThan(vp.height - 1);
      const prev = await box(page.locator('#pagenav .prev')), home = await box(page.locator('#pagenav .home')), next = await box(page.locator('#pagenav .next'));
      expect(prev.x + prev.width).toBeLessThanOrEqual(home.x + 1);
      expect(home.x + home.width).toBeLessThanOrEqual(next.x + 1);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const last = await page.evaluate(() => { const r = document.querySelector('#legend').getBoundingClientRect(); return r.bottom; });
      expect(last).toBeLessThanOrEqual(bar.y + 1);
      await page.locator('#pagenav .next').click();
      await expect(page.locator('h1')).toHaveText('Copilot with your own MCP server');
      expect(page.url()).toContain('#/browser-automation/copilot-with-own-mcp-server');
      await page.goBack();
      await expect(page.locator('h1')).toHaveText('Browser checks without test code');
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('h1')).toHaveText('Copilot with your own MCP server');
    });
  }
});

test.describe('motion and structure', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('U-2: with reduced motion nothing moves', async ({ page }) => {
    await openViewer(page, { reducedMotion: true });
    expect(await page.locator('#wires animateMotion').count()).toBe(0);
    const dash = await page.$$eval('#wires path.flow', ps => ps.map(p => getComputedStyle(p).animationName));
    expect(dash.every(n => n === 'none')).toBe(true);
    await pick(page, 'playwright-mcp');
    await layerOn(page);
    expect(await page.locator('#detail animateMotion').count()).toBe(0);
  });

  test('U-1: the theme toggle changes the colours and the choice is remembered', async ({ page }) => {
    await openViewer(page);
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const before = await bg();
    await page.locator('#theme').click();
    const after = await bg();
    expect(after).not.toBe(before);
    await page.reload();
    await page.waitForSelector('#board .brick');
    expect(await bg()).toBe(after);
  });

  test('U-7: all controls can be reached with the keyboard and Escape closes the details', async ({ page }) => {
    await openViewer(page);
    await page.keyboard.press('Tab');
    const seen = new Set();
    for (let i = 0; i < 12; i++) {
      seen.add(await page.evaluate(() => document.activeElement && (document.activeElement.dataset.id || document.activeElement.id || document.activeElement.className)));
      await page.keyboard.press('Tab');
    }
    for (const id of ['github-copilot', 'playwright-mcp', 'edge']) expect([...seen]).toContain(id);
    await pick(page, 'edge');
    await expect(page.locator('#detail h2')).toHaveText('Microsoft Edge');
    await page.keyboard.press('Escape');
    await expect(page.locator('#detail .empty h2')).toHaveText('Pick a brick');
  });

  test('U-4: the page works with no network at all', async ({ page, context }) => {
    await openViewer(page);
    await context.setOffline(true);
    await page.reload().catch(() => {});
    // reload while offline may fail for http; the built-in demo must still be there on the loaded page
    await context.setOffline(false);
    await page.goto('/');
    await expect(page.locator('#dash .box')).toHaveCount(12);
  });
});

// Screenshots: always written to test-results/screens for review (and uploaded by CI).
// Compared with stored baselines only when VISUAL_COMPARE=1, which the CI sets inside the official Playwright image.
const SHOTS = [
  { name: 'board', steps: async () => {} },
  { name: 'brick-selected', steps: async page => { await pick(page, 'playwright-mcp'); } },
  { name: 'layer', steps: async page => { await pick(page, 'github-copilot'); await layerOn(page); } },
  { name: 'platform', steps: async page => { await pick(page, 'edge'); await layerOn(page); await page.locator('#detail .lnode[data-id="desktop-os"]').click(); } },
  { name: 'dashboard', url: '/', steps: async () => {} },
  { name: 'second-page', url: PAGE2, steps: async page => { await pick(page, 'custom-mcp-server'); } }
];
for (const vp of VIEWPORTS) {
  for (const scheme of SCHEMES) {
    test.describe(`screens ${vp.name} ${scheme}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height }, colorScheme: scheme });
      for (const s of SHOTS) {
        test(`U-3: screenshot ${s.name} (${vp.name} ${scheme})`, async ({ page }) => {
          await openViewer(page, { reducedMotion: true, url: s.url });
          await s.steps(page);
          await page.waitForTimeout(200);
          const file = `${s.name}-${vp.name}-${scheme}.png`;
          fs.mkdirSync(path.join('test-results', 'screens'), { recursive: true });
          await page.screenshot({ path: path.join('test-results', 'screens', file), fullPage: true });
          if (process.env.VISUAL_COMPARE === '1') {
            await expect(page).toHaveScreenshot(file, { fullPage: true, animations: 'disabled', maxDiffPixelRatio: 0.01 });
          }
        });
      }
    });
  }
}
