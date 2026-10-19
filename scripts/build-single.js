'use strict';
// Builds one self-contained HTML file from the viewer folder (for places that need a single file,
// such as a published Claude artifact or an email attachment).
// Usage: node scripts/build-single.js [outFile]     default: dist/toolkit-bricks.html
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const viewer = path.join(root, 'viewer');
const out = path.resolve(process.argv[2] || path.join(root, 'dist', 'toolkit-bricks.html'));

let html = fs.readFileSync(path.join(viewer, 'index.html'), 'utf8');
const file = name => fs.readFileSync(path.join(viewer, name), 'utf8');
// Inline text can contain "</script" or "</style" only by mistake; refuse rather than produce a broken page.
const safe = (name, text, closing) => {
  if (text.toLowerCase().includes(closing)) throw new Error(name + ' contains "' + closing + '" and cannot be inlined');
  return text;
};

let count = 0;
html = html.replace(/<link rel="stylesheet" href="([^":]+\.css)">/g, (_, name) => { count++; return '<style>\n' + safe(name, file(name), '</style') + '</style>'; });
html = html.replace(/<script src="([^":]+\.js)"><\/script>/g, (_, name) => { count++; return '<script>\n' + safe(name, file(name), '</script') + '</script>'; });
if (count !== 3) throw new Error('expected to inline 1 stylesheet and 2 scripts, inlined ' + count);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('wrote ' + path.relative(root, out) + ' (' + Math.round(html.length / 1024) + ' kB)');
