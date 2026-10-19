'use strict';
// Rules L-1 to L-4 (docs/DESIGN.md, "Viewer: visual system"): colours, fonts and stud colours
// exist only as tokens at the top of viewer/viewer.css. These checks read the source text.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'viewer', 'viewer.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'viewer', 'viewer.js'), 'utf8');

const LIGHT = ':root{';
const DARK_MEDIA = '@media (prefers-color-scheme: dark){';
const DARK_ATTR = ':root[data-theme="dark"]{';

// Text between the braces of the block that starts at `start`, and the position where it ends.
function blockRange(src, start) {
  const from = src.indexOf(start);
  assert.ok(from >= 0, `token block "${start}" not found in viewer/viewer.css`);
  let depth = 0;
  let j = src.indexOf('{', from);
  const open = j;
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) break;
  }
  return { from, open, close: j };
}

function stripBlocks(src, starts) {
  const ranges = starts.map(s => blockRange(src, s)).sort((a, b) => b.from - a.from);
  let out = src;
  for (const r of ranges) out = out.slice(0, r.from) + out.slice(r.close + 1);
  return out;
}

function props(text) {
  return Object.fromEntries([...text.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)].map(m => [m[1], m[2].trim()]));
}

const body = r => css.slice(r.open + 1, r.close);
const light = props(body(blockRange(css, LIGHT)));
const mediaRange = blockRange(css, DARK_MEDIA);
const mediaText = body(mediaRange);
const inner = blockRange(mediaText, ':root:not([data-theme="light"]){');
const darkMedia = props(mediaText.slice(inner.open + 1, inner.close));
const darkAttr = props(body(blockRange(css, DARK_ATTR)));

const cssOutsideTokens = stripBlocks(css, [LIGHT, DARK_MEDIA, DARK_ATTR]);
const colourLiteral = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/;

describe('visual system tokens', () => {
  it('L-1: viewer.css has no colour values outside the token blocks', () => {
    const hit = cssOutsideTokens.match(colourLiteral);
    assert.equal(hit, null, `colour value "${hit && hit[0]}" outside the token blocks; add a token and use var(--name)`);
  });

  it('L-1: viewer.js has no colour values', () => {
    const hit = js.match(colourLiteral);
    assert.equal(hit, null, `colour value "${hit && hit[0]}" in viewer.js; use a token through var(--name)`);
  });

  it('L-1: the token blocks are not empty', () => {
    assert.ok(Object.keys(light).length > 20);
    assert.ok(Object.keys(darkAttr).length > 20);
  });

  it('L-2: every font-family outside the token blocks is a font token', () => {
    const decls = [...cssOutsideTokens.matchAll(/font-family\s*:\s*([^;}]+)/g)].map(m => m[1].trim());
    assert.ok(decls.length > 0, 'no font-family found; the check would prove nothing');
    for (const d of decls) assert.match(d, /^var\(--font-(display|body|mono)\)$/, `font-family "${d}" is not a font token`);
  });

  it('L-2: the three font tokens exist', () => {
    for (const k of ['--font-display', '--font-body', '--font-mono']) assert.ok(k in light, `${k} missing`);
  });

  it('L-3: every light colour token is defined in the dark set', () => {
    const missing = Object.keys(light).filter(k => !k.startsWith('--font') && !(k in darkAttr));
    assert.deepEqual(missing, []);
  });

  it('L-3: the two dark blocks hold identical values', () => {
    assert.deepEqual(darkMedia, darkAttr);
  });

  it('L-4: --stud-0 to --stud-5 exist in light and dark', () => {
    for (let i = 0; i < 6; i++) {
      assert.ok(`--stud-${i}` in light, `--stud-${i} missing in light`);
      assert.ok(`--stud-${i}` in darkAttr, `--stud-${i} missing in dark`);
    }
    assert.ok(!('--stud-6' in light), 'a seventh stud colour needs a rule change and a new modulus');
  });

  it('L-4: code takes stud colours by index, modulo 6, and only through --stud-N', () => {
    assert.match(js, /function studIndex\([^)]*\)\s*\{[\s\S]*?%\s*6\s*;?\s*\}/);
    const uses = [...js.matchAll(/var\(--stud-([^)]*)\)/g)];
    assert.ok(uses.length > 0, 'no stud colour use found; the check would prove nothing');
    const refsOutsideCss = [...js.matchAll(/--stud-(\d+)/g)];
    assert.equal(refsOutsideCss.length, 0, 'viewer.js must build the name from studIndex, not hardcode a number');
  });
});
