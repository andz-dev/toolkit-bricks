'use strict';
// Keeps two generated pieces of the viewer in step with their sources:
//   1. viewer/catalog-core.js  = copy of shared/catalog-core.js
//   2. the demo package embedded in viewer/index.html = profiles/demo/collection.json plus every profile it lists
// Usage: node scripts/sync.js [--check]    (--check only reports drift and exits 1)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const check = process.argv.includes('--check');

const coreSrc = read('shared/catalog-core.js');
const collection = JSON.parse(read('profiles/demo/collection.json'));
const profiles = {};
for (const t of collection.topics) profiles[t.file] = JSON.parse(read('profiles/demo/' + t.file));
const demo = { collection, profiles };
const embedded = JSON.stringify(demo, null, 2).replace(/</g, '\\u003c');
const re = /(<script type="application\/json" id="package-data">\n)[\s\S]*?(\n<\/script>)/;

const html = read('viewer/index.html');
if (!re.test(html)) { console.error('viewer/index.html has no package-data block'); process.exit(2); }
const nextHtml = html.replace(re, (_, a, b) => a + embedded + b);
const targets = [
  ['viewer/catalog-core.js', coreSrc],
  ['viewer/index.html', nextHtml]
];

let drift = false;
for (const [file, content] of targets) {
  const current = fs.existsSync(path.join(root, file)) ? read(file) : null;
  if (current === content) continue;
  drift = true;
  if (check) console.error(file + ' is out of sync. Run: npm run sync');
  else { fs.writeFileSync(path.join(root, file), content); console.log('updated ' + file); }
}
if (check) { if (drift) process.exit(1); console.log('in sync'); }
else if (!drift) console.log('already in sync');
