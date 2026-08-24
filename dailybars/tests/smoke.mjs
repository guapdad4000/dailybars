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
const server = spawn('npx', ['serve', 'dist', '-l', String(port)], {
  stdio: 'ignore',
  detached: true
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
  await page.waitForTimeout(500);
  await browser.close();
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Smoke test passed: production bundle renders the auth screen.');
} finally {
  shutdown();
}
