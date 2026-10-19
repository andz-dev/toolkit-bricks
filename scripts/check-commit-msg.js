'use strict';
// Commit message check (AGENTS.md): a message names at least one design rule ID from
// docs/DESIGN.md, or says `Rules: none` on its own line. Unknown IDs are rejected so typos show up.
// Used by .githooks/commit-msg. Usage: node scripts/check-commit-msg.js <message-file>
const fs = require('fs');
const path = require('path');

function ruleIds() {
  const design = fs.readFileSync(path.join(__dirname, '..', 'docs', 'DESIGN.md'), 'utf8');
  return new Set([...design.matchAll(/^\| ([A-Z]-\d+) \|/gm)].map(m => m[1]));
}

// Returns an array of problems. An empty array means the message is fine.
function check(message, known = ruleIds()) {
  const lines = message.split(/\r?\n/).filter(l => !l.startsWith('#'));
  const text = lines.join('\n');
  const first = (lines.find(l => l.trim()) || '').trim();

  if (!first) return ['The commit message is empty.'];
  if (/^(Merge |Revert |fixup! |squash! |amend! )/.test(first)) return [];

  const mentioned = [...text.matchAll(/(?<![\w-])([A-Z]-\d+)(?![\w-])/g)].map(m => m[1]);
  const unknown = [...new Set(mentioned.filter(id => !known.has(id)))];
  const none = lines.some(l => /^Rules:\s*none\s*$/i.test(l.trim()));

  const problems = [];
  if (unknown.length) problems.push(`Unknown rule ID: ${unknown.join(', ')}. IDs are listed in docs/DESIGN.md.`);
  if (!none && !mentioned.some(id => known.has(id))) {
    problems.push('Name the design rule IDs this change touches (for example "V-2, L-1"), or add the line "Rules: none".');
  }
  return problems;
}

module.exports = { check, ruleIds };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node scripts/check-commit-msg.js <message-file>');
    process.exit(2);
  }
  const problems = check(fs.readFileSync(file, 'utf8'));
  if (problems.length) {
    console.error('commit-msg: ' + problems.join('\ncommit-msg: '));
    process.exit(1);
  }
}
