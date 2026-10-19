'use strict';
// Copies the block between @core markers from shared/catalog-core.js into viewer/index.html.
// Usage: node scripts/sync-core.js [--check]   (--check only reports drift and exits 1)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const corePath = path.join(root, 'shared', 'catalog-core.js');
const htmlPath = path.join(root, 'viewer', 'index.html');
const re = /\/\* @core:begin \*\/[\s\S]*?\/\* @core:end \*\//;

const core = fs.readFileSync(corePath, 'utf8').match(re);
if (!core) { console.error('No @core block in shared/catalog-core.js'); process.exit(2); }
const html = fs.readFileSync(htmlPath, 'utf8');
if (!re.test(html)) { console.error('No @core block in viewer/index.html'); process.exit(2); }
const next = html.replace(re, () => core[0]);

if (process.argv.includes('--check')) {
  if (next !== html) { console.error('viewer/index.html is out of sync with shared/catalog-core.js. Run: npm run sync'); process.exit(1); }
  console.log('in sync');
} else {
  fs.writeFileSync(htmlPath, next);
  console.log(next === html ? 'already in sync' : 'viewer/index.html updated');
}
