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
  await page.addInitScript(() => {
    const staleUser = { id: 'legacy-user', username: 'legacy', email: 'legacy@example.com' };
    localStorage.setItem('dailybars_session', JSON.stringify({
      user: staleUser,
      expiresAt: Date.now() + 60_000
    }));
    localStorage.setItem('guap_user', JSON.stringify(staleUser));
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (!url.includes('fonts.googleapis.com') && !url.includes('fonts.gstatic.com')) {
      errors.push(`request failed: ${url}`);
    }
  });
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=/DAILY RAPS|SIGN IN|ARTIST|CUSTOMER ACCESS/i', { timeout: 15000 });
  const health = await page.request.get(`http://127.0.0.1:${port}/api/health`);
  if (!health.ok()) throw new Error(`Native API health check failed: ${health.status()}`);
  const profile = await page.request.get(`http://127.0.0.1:${port}/api/me`, { headers: { 'X-DailyBars-QA': 'true' } });
  if (!profile.ok() || !(await profile.json()).id) throw new Error('Native authenticated profile check failed.');
  const protectedTable = await page.request.get(`http://127.0.0.1:${port}/api/revenuecat_customers`, { headers: { 'X-DailyBars-QA': 'true' } });
  if (protectedTable.status() !== 404) throw new Error('Sensitive telemetry table must not be exposed by the generic API.');
  await page.waitForTimeout(500);
  const accessGate = page.getByText('CUSTOMER ACCESS IS NOT YET ENABLED FOR THIS RELEASE.');
  if (await accessGate.count()) {
    if (await page.getByRole('button', { name: 'SIGN IN' }).count()) {
      throw new Error('Production release gate exposed the customer sign-in control.');
    }
    const persistedSession = await page.evaluate(() => ({
      current: localStorage.getItem('dailybars_session'),
      legacy: localStorage.getItem('guap_user')
    }));
    if (persistedSession.current || persistedSession.legacy) {
      throw new Error('Production release gate retained a persisted customer identity.');
    }
  }
  await browser.close();
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Smoke test passed: production bundle renders its customer-access gate.');
} finally {
  shutdown();
}
