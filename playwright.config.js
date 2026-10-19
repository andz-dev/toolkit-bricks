'use strict';
const { defineConfig } = require('@playwright/test');

const port = 4173;

module.exports = defineConfig({
  testDir: 'tests/visual',
  testMatch: '**/*.spec.js',
  outputDir: 'test-results',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  fullyParallel: true,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: 'chromium',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: `node scripts/serve.js ${port}`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: !process.env.CI
  }
});
