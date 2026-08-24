const { test, expect } = require('@playwright/test');

const SUPABASE_REST = 'https://tilpgwoyyervbgdlucap.supabase.co/rest/v1/';

function makeBar(overrides = {}) {
  return {
    id: 'bar-1',
    username: 'qa',
    text: 'Oakland sunlight on the page',
    tags: [],
    is_favorite: false,
    created_at: '2026-08-24T12:00:00.000Z',
    ...overrides,
  };
}

async function installApiMock(page, { bars = [], failNextWrite = false } = {}) {
  const state = { bars: [...bars], writes: [], failNextWrite };

  await page.route(`${SUPABASE_REST}**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split('/').pop();
    const method = request.method();

    if (method === 'POST' && table === 'rpc') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }

    if (method === 'GET') {
      const body = table === 'bars' ? state.bars : [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': `0-${Math.max(0, body.length - 1)}/*` },
        body: JSON.stringify(body),
      });
      return;
    }

    if (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
      state.writes.push({ method, table, body: request.postDataJSON?.() });
      if (state.failNextWrite) {
        state.failNextWrite = false;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'temporary test outage' }),
        });
        return;
      }

      if (method === 'POST' && table === 'bars') {
        const body = request.postDataJSON();
        const bar = makeBar({
          id: `bar-${state.bars.length + 1}`,
          text: body.text,
          username: body.username || 'qa',
          tags: body.tags || [],
        });
        state.bars.unshift(bar);
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(bar) });
        return;
      }

      if (method === 'PATCH' && table === 'bars') {
        const body = request.postDataJSON();
        const id = url.searchParams.get('id') || state.bars[0]?.id;
        const index = state.bars.findIndex((bar) => bar.id === id);
        const updated = { ...(state.bars[index] || makeBar({ id })), ...body };
        if (index >= 0) state.bars[index] = updated;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updated) });
        return;
      }

      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  return state;
}

async function startQaSession(page, options) {
  const state = await installApiMock(page, options);
  await page.goto('/index.html');
  await page.getByRole('button', { name: 'ENTER DEV QA ACCOUNT' }).click();
  await expect(page.getByText('DROP A BAR...')).toBeVisible();
  return state;
}

function captureBrowserErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

test.describe('authentication and navigation', () => {
  test('sign in QA session persists and create-account validation advances safely', async ({ page }) => {
    await installApiMock(page);
    await page.goto('/index.html');
    await expect(page.getByRole('button', { name: 'ENTER DEV QA ACCOUNT' })).toBeVisible();

    await page.getByRole('button', { name: 'CREATE ACCOUNT' }).click();
    await page.getByRole('button', { name: 'CONTINUE →' }).click();
    await expect(page.getByText('VALID EMAIL REQUIRED')).toBeVisible();

    await page.getByLabel('EMAIL ADDRESS').fill('qa-new@example.com');
    await page.getByRole('button', { name: 'CONTINUE →' }).click();
    await expect(page.getByLabel('ARTIST NAME')).toBeVisible();
    await expect(page.getByLabel('CREATE PASSWORD')).toBeVisible();

    await page.getByRole('button', { name: 'SIGN IN' }).click();
    await page.getByRole('button', { name: 'ENTER DEV QA ACCOUNT' }).click();
    await expect(page.getByText('DROP A BAR...')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.dailybars_session).user.username)).toBe('qa');
  });

  test('all primary views navigate without an exception', async ({ page }) => {
    const errors = captureBrowserErrors(page);
    await startQaSession(page);
    for (const view of ['ARCHIVE', 'FAVORITES', 'CRATES', 'SCRATCH LAB', 'SYNDICATE', 'FEED']) {
      await page.getByText(view, { exact: true }).first().click();
    }
    await expect(page.getByText('DROP A BAR...')).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('bar creation, editing, and failure recovery', () => {
  test('creates and edits a bar, including rapid duplicate clicks', async ({ page }) => {
    const state = await startQaSession(page);
    await page.getByText('DROP A BAR...').click();
    const editor = page.locator('textarea').first();
    await editor.fill('First draft from the Town');

    await page.getByRole('button', { name: 'SAVE' }).dblclick();
    await expect(page.getByText('First draft from the Town')).toBeVisible();
    expect(state.writes.filter((write) => write.method === 'POST' && write.table === 'bars')).toHaveLength(1);

    await page.getByText('First draft from the Town').click();
    await page.getByText('First draft from the Town').click();
    await page.locator('textarea').fill('Edited draft from the Town');
    await page.getByRole('button', { name: 'SAVE' }).click();
    await expect(page.getByText('Edited draft from the Town')).toBeVisible();
    expect(state.writes.filter((write) => write.method === 'PATCH' && write.table === 'bars')).toHaveLength(1);
  });

  test('keeps the app usable after a failed save and does not duplicate the request', async ({ page }) => {
    const errors = captureBrowserErrors(page);
    const state = await startQaSession(page, { failNextWrite: true });
    await page.getByText('DROP A BAR...').click();
    await page.locator('textarea').first().fill('This save will fail');
    await page.getByRole('button', { name: 'SAVE' }).dblclick();
    await expect(page.getByText('NO BARS YET')).toBeVisible();
    expect(state.writes.filter((write) => write.method === 'POST' && write.table === 'bars')).toHaveLength(1);
    await expect(page.getByText('DROP A BAR...')).toBeVisible();
    expect(errors.filter((error) => error.startsWith('pageerror:'))).toEqual([]);
  });
});

test.describe('modal and mobile keyboard paths', () => {
  test('Escape closes the profile modal and restores focus', async ({ page }) => {
    await startQaSession(page);
    const profileTrigger = page.locator('#cassette-svg');
    await profileTrigger.click();
    await expect(page.getByText('LOGOUT')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('LOGOUT')).toBeHidden();
  });

  test('mobile keyboard input and tag entry work without losing the editor', async ({ page }) => {
    await startQaSession(page);
    await page.getByText('DROP A BAR...').click();
    const editor = page.locator('textarea').first();
    await editor.focus();
    await page.keyboard.type('Mobile draft');
    const tagInput = page.getByPlaceholder('ADD TAG');
    if (await tagInput.count()) {
      await tagInput.fill('mobile');
      await tagInput.press('Enter');
      await expect(page.getByText('#mobile')).toBeVisible();
    }
    await expect(editor).toHaveValue('Mobile draft');
  });
});