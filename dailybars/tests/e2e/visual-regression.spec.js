const { test, expect } = require('playwright/test');

const SUPABASE_REST = 'https://tilpgwoyyervbgdlucap.supabase.co/rest/v1/';
const SUPABASE_AUTH_USER = 'https://tilpgwoyyervbgdlucap.supabase.co/auth/v1/user';
const SUPABASE_STORAGE_KEY = 'sb-tilpgwoyyervbgdlucap-auth-token';

// Keep the visual suite independent of the live Supabase project. The QA session
// is intentionally the same deterministic account used by the functional tests.
async function installVisualFixtures(page, { delayReads = 0 } = {}) {
  await page.route(`${SUPABASE_REST}**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split('/').pop();

    if (delayReads && request.method() === 'GET') {
      await new Promise((resolve) => setTimeout(resolve, delayReads));
    }

    if (request.method() === 'GET') {
      const body = table === 'bars' || table === 'songs' || table === 'users' ? [] : [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': '0-0/*' },
        body: JSON.stringify(body),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function stabilize(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
      /* Toasts are transient feedback, not part of the editorial layout. */
      div[style*="z-index: 1000"] { display: none !important; }
    `,
  });
  await page.evaluate(() => document.fonts?.ready);
}

async function signInQa(page, options) {
  await installVisualFixtures(page, options);
  await page.goto('/index.html');
  await page.getByRole('button', { name: 'ENTER DEV QA ACCOUNT' }).click();
  await expect(page.getByText('DROP A BAR...')).toBeVisible();
  await stabilize(page);
}

async function signInRegularUser(page) {
  await installVisualFixtures(page);
  const authUser = {
    id: '00000000-0000-0000-0000-000000000020',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'member@example.com',
    user_metadata: { username: 'member' },
  };
  await page.route(SUPABASE_AUTH_USER, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(authUser),
    });
  });
  await page.addInitScript(({ storageKey, user }) => {
    localStorage.setItem(storageKey, JSON.stringify({
      access_token: 'visual-test-access-token',
      refresh_token: 'visual-test-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: 'bearer',
      user,
    }));
  }, { storageKey: SUPABASE_STORAGE_KEY, user: authUser });
  await page.goto('/index.html');
  await expect(page.getByText('DROP A BAR...')).toBeVisible();
  await stabilize(page);
}

async function openView(page, label) {
  await page.getByRole('button', { name: `Go to ${label}` }).click();
  await page.waitForTimeout(150);
  await stabilize(page);
}

const screenshotOptions = {
  fullPage: true,
  animations: 'disabled',
  caret: 'hide',
  scale: 'css',
  maxDiffPixelRatio: 0.01,
};

test.describe('editorial visual contract', () => {
  test('sign-in', async ({ page }) => {
    await installVisualFixtures(page);
    await page.goto('/index.html');
    await expect(page.getByRole('button', { name: 'SIGN IN' })).toBeVisible();
    await stabilize(page);
    await expect(page).toHaveScreenshot('sign-in.png', screenshotOptions);
  });

  test('sign-in focus state', async ({ page }) => {
    await installVisualFixtures(page);
    await page.goto('/index.html');
    const email = page.getByLabel('EMAIL');
    await email.focus();
    await stabilize(page);
    await expect(page).toHaveScreenshot('sign-in-focus.png', screenshotOptions);
  });

  for (const [label, file] of [
    ['FEED', 'feed-empty.png'],
    ['ARCHIVE', 'archive-empty.png'],
    ['FAVORITES', 'favorites-empty.png'],
    ['CRATES', 'crates-empty.png'],
    ['SCRATCH LAB', 'scratch-lab-qa.png'],
    ['SYNDICATE', 'syndicate-empty.png'],
  ]) {
    test(`${label.toLowerCase()} stable empty or gated state`, async ({ page }) => {
      await signInQa(page);
      await openView(page, label);
      await expect(page).toHaveScreenshot(file, screenshotOptions);
    });
  }

  test('offline banner', async ({ page }) => {
    await signInQa(page);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.getByRole('status')).toContainText('OFFLINE');
    await expect(page).toHaveScreenshot('feed-offline.png', screenshotOptions);
  });

  test('loading state', async ({ page }) => {
    await installVisualFixtures(page, { delayReads: 1200 });
    await page.goto('/index.html');
    await page.getByRole('button', { name: 'ENTER DEV QA ACCOUNT' }).click();
    await expect(page.getByText(/LOADING|DROP A BAR/).first()).toBeVisible();
    await stabilize(page);
    await expect(page).toHaveScreenshot('feed-loading.png', screenshotOptions);
  });

  test('premium prompt from non-QA Scratch Lab gate', async ({ page }) => {
    await signInRegularUser(page);
    await openView(page, 'SCRATCH LAB');
    await page.getByRole('button', { name: 'Unlock Premium' }).click();
    await expect(page.getByText('PREMIUM REQUIRED')).toBeVisible();
    await expect(page).toHaveScreenshot('premium-prompt.png', screenshotOptions);
  });
});