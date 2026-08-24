import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import net from 'node:net';

async function getPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

const port = await getPort();
const server = spawn('sh', ['-c', 'npm run db:setup && node server/server.mjs'], {
  stdio: 'ignore',
  detached: true,
  env: { ...process.env, PORT: String(port), DAILYBARS_ENVIRONMENT: 'development' }
});

const shutdown = () => {
  try {
    process.kill(-server.pid);
  } catch {
    server.kill();
  }
};

try {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (!url.includes('fonts.googleapis.com') && !url.includes('fonts.gstatic.com')) {
      errors.push(`request failed: ${url}`);
    }
  });
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=/DAILY RAPS|SIGN IN|ARTIST/i', { timeout: 15000 });
  const health = await page.request.get(`http://127.0.0.1:${port}/api/health`);
  if (!health.ok()) throw new Error(`Native API health check failed: ${health.status()}`);
  const profile = await page.request.get(`http://127.0.0.1:${port}/api/me`, { headers: { 'X-DailyBars-QA': 'true' } });
  if (!profile.ok() || !(await profile.json()).id) throw new Error('Native authenticated profile check failed.');
  const protectedTable = await page.request.get(`http://127.0.0.1:${port}/api/revenuecat_customers`, { headers: { 'X-DailyBars-QA': 'true' } });
  if (protectedTable.status() !== 404) throw new Error('Sensitive telemetry table must not be exposed by the generic API.');
  await page.waitForTimeout(500);
  await browser.close();
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Smoke test passed: production bundle renders the auth screen.');
} finally {
  shutdown();
}
