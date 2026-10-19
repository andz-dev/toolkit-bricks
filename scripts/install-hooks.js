'use strict';
// Points git at .githooks/ so every agent and person who runs `npm install` gets the same hooks.
// Does nothing outside a git checkout (for example in a downloaded archive).
const { execFileSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
try {
  execFileSync('git', ['rev-parse', '--git-dir'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: root, stdio: 'ignore' });
  console.log('git hooks: using .githooks/ (pre-commit runs npm test, commit-msg checks rule IDs)');
} catch (e) {
  console.log('git hooks: not a git checkout, skipped');
}
