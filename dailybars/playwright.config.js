const { defineConfig, devices } = require('playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['line']] : 'line',
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:5001',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'DAILYBARS_ENVIRONMENT=development npm run build && python3 -m http.server 5001 --bind 127.0.0.1 --directory dist',
    cwd: '.',
    url: 'http://127.0.0.1:5001/index.html',
    reuseExistingServer: false,
    timeout: 45_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
});