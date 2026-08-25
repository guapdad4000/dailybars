const { test, expect } = require('playwright/test');

const NATIVE_API = '**/api/**';

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

async function installApiMock(page, { bars = [], songs = [], failNextWrite = false, aiFailure = false } = {}) {
  const state = { bars: [...bars], songs: [...songs], writes: [], failNextWrite, aiFailure };

  await page.route(NATIVE_API, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const parts = url.pathname.split('/').filter(Boolean);
    const table = parts[1];
    const method = request.method();

    if (url.pathname === '/api/me') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        id: 'qa-user', username: 'qa', email: 'qa@dailybars.dev', xp: 0, level: 1, selected_trophies: []
      }) });
      return;
    }
    if (url.pathname === '/api/me/trophies') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    if (url.pathname === '/api/ai/generate' && method === 'POST') {
      state.writes.push({ method, table: 'ai', body: request.postDataJSON?.() });
      if (state.aiFailure) {
        await route.fulfill({
          status: 402,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Free accounts can use AI 3 times. Daily Raps Pro is required.' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ text: 'Generated test bars' }),
        });
      }
      return;
    }

    if (method === 'GET') {
      const body = table === 'bars' ? state.bars : table === 'songs' ? state.songs : [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: body }),
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
      if (method === 'POST' && table === 'songs') {
        const body = request.postDataJSON();
        const song = {
          id: `song-${state.songs.length + 1}`,
          title: body.title,
          username: body.username || 'qa',
          blocks: body.blocks || [],
          status: body.status || 'draft',
          created_at: '2026-08-24T12:00:00.000Z',
          updated_at: '2026-08-24T12:00:00.000Z',
        };
        state.songs.unshift(song);
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(song) });
        return;
      }

      if (method === 'PATCH' && table === 'bars') {
        const body = request.postDataJSON();
        const id = parts[2] || state.bars[0]?.id;
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

async function installWordAssistMock(page, initialMode = 'success') {
  const state = { mode: initialMode };
  await page.route('https://api.datamuse.com/words**', async (route) => {
    if (state.mode === 'error') {
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
      return;
    }
    if (state.mode === 'timeout') {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }).catch(() => {});
      return;
    }
    const url = new URL(route.request().url());
    const values = url.searchParams.has('rel_rhy')
      ? [{ word: 'bright' }, { word: 'flight' }]
      : url.searchParams.has('rel_nry')
        ? [{ word: 'alive' }]
        : [{ word: 'evening' }];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(values) });
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
      await page.getByRole('button', { name: `Go to ${view}` }).click();
    }
    await expect(page.getByText('DROP A BAR...')).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('development QA account can use Scratch Lab without premium', async ({ page }) => {
    await startQaSession(page);
    await page.getByRole('button', { name: 'Go to SCRATCH LAB' }).click();
    await expect(page.getByRole('heading', { name: 'SCRATCH LAB' })).toBeVisible();
    await expect(page.locator('.premium-gate')).toHaveCount(0);
  });
});

test.describe('bar creation, editing, and failure recovery', () => {
  test('creates and edits a bar, including rapid duplicate clicks', async ({ page }) => {
    const state = await startQaSession(page);
    await page.getByText('DROP A BAR...').click();
    const editor = page.locator('textarea').first();
    await editor.fill('First draft from the Town');

    await page.getByRole('button', { name: 'SAVE' }).dblclick();
    const savedBar = page.locator('article').filter({ hasText: 'First draft from the Town' });
    await expect(savedBar).toBeVisible();
    expect(state.writes.filter((write) => write.method === 'POST' && write.table === 'bars')).toHaveLength(1);

    await savedBar.locator('.inline-edit').focus();
    await page.keyboard.press('Enter');
    await page.locator('textarea').fill('Edited draft from the Town');
    await page.locator('textarea').press('Tab');
    await expect(page.locator('article').filter({ hasText: 'Edited draft from the Town' })).toBeVisible();
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
    await expect(page.locator('textarea').first()).toHaveValue('This save will fail');
    await expect(page.getByText('SAVE FAILED — DRAFT KEPT ON THIS DEVICE')).toBeVisible();
    await expect(page.getByRole('button', { name: 'SAVE BAR' })).toBeEnabled();
    expect(errors.filter((error) => error.startsWith('pageerror:'))).toEqual([]);
  });
});

test.describe('writing intelligence', () => {
  test('highlights live sound groups and replaces only the selected word', async ({ page }) => {
    await installWordAssistMock(page);
    await startQaSession(page);
    await page.getByText('DROP A BAR...').click();
    const editor = page.getByLabel('Quick bar draft');
    await editor.fill('night light glow');

    const highlights = page.locator('.rhyme-textarea-mirror .rhyme-highlight');
    await expect(highlights).toHaveCount(2);
    await expect(page.getByText('HEURISTIC SOUND GROUPS')).toBeVisible();

    await editor.evaluate((element) => {
      element.focus();
      element.setSelectionRange(6, 11);
    });
    await page.keyboard.press('Alt+r');
    const popup = page.getByRole('dialog', { name: /WORD ASSIST/i });
    await expect(popup).toBeVisible();
    await expect(popup.getByText('EXACT RHYMES')).toBeVisible();
    await expect(popup.getByText('NEAR / SLANT RHYMES')).toBeVisible();
    await popup.getByRole('button', { name: 'Use bright as exact rhyme' }).click();
    await expect(editor).toHaveValue('night bright glow');
    await expect(editor).toBeFocused();
    const staleReplacement = await page.evaluate(() => (
      window.DailyBarsApp.applySuggestionToText(
        'night changed glow',
        'bright',
        { start: 6, end: 11 },
        'light'
      )
    ));
    expect(staleReplacement).toMatchObject({ text: 'night changed glow', replaced: false });

    await editor.evaluate((element) => element.setSelectionRange(0, 5));
    await page.keyboard.press('Alt+r');
    await expect(popup).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(popup).toBeHidden();
    await expect(editor).toBeFocused();
  });

  test('distinguishes provider failure from an empty result and retries', async ({ page }) => {
    const wordAssist = await installWordAssistMock(page, 'error');
    await startQaSession(page);
    await page.getByText('DROP A BAR...').click();
    const editor = page.getByLabel('Quick bar draft');
    await editor.fill('night');
    await editor.evaluate((element) => element.setSelectionRange(0, 5));
    await page.keyboard.press('Alt+r');

    const popup = page.getByRole('dialog', { name: /WORD ASSIST/i });
    await expect(popup.getByText('COULDN’T REACH WORD ASSIST')).toBeVisible();
    await expect(popup.getByText('NO MATCHES FOUND')).toHaveCount(0);
    wordAssist.mode = 'success';
    await popup.getByRole('button', { name: 'TRY AGAIN' }).click();
    await expect(popup.getByText('EXACT RHYMES')).toBeVisible();
  });

  test('reports offline and timeout states without changing the draft', async ({ page, context }) => {
    await page.addInitScript(() => {
      window.__DAILYBARS_WORD_ASSIST_TIMEOUT_MS__ = 500;
    });
    const wordAssist = await installWordAssistMock(page);
    await startQaSession(page);
    await page.getByText('DROP A BAR...').click();
    const editor = page.getByLabel('Quick bar draft');
    await editor.fill('night');
    await editor.evaluate((element) => element.setSelectionRange(0, 5));

    await context.setOffline(true);
    await page.keyboard.press('Alt+r');
    let popup = page.getByRole('dialog', { name: /WORD ASSIST/i });
    await expect(popup.getByText('YOU’RE OFFLINE')).toBeVisible();
    await expect(editor).toHaveValue('night');

    await context.setOffline(false);
    wordAssist.mode = 'timeout';
    await popup.getByRole('button', { name: 'TRY AGAIN' }).click();
    await expect(popup.getByText('LOOKUP TIMED OUT')).toBeVisible();
    await expect(editor).toHaveValue('night');
  });

  test('preserves composed text while live highlighting updates', async ({ page }) => {
    await startQaSession(page);
    await page.getByText('DROP A BAR...').click();
    const editor = page.getByLabel('Quick bar draft');
    await editor.evaluate((element) => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      element.focus();
      element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '東京' }));
      setValue.call(element, '東京 night light');
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertCompositionText',
        data: '東京'
      }));
      element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '東京' }));
    });
    await expect(editor).toHaveValue('東京 night light');
    await expect(page.locator('.rhyme-textarea-mirror .rhyme-highlight')).toHaveCount(2);
  });

  test('mobile double-tap opens word assist', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Touch behavior is covered in the mobile project.');
    await installWordAssistMock(page);
    await startQaSession(page);
    await page.getByText('DROP A BAR...').click();
    const editor = page.getByLabel('Quick bar draft');
    await editor.fill('night');
    const box = await editor.boundingBox();
    await editor.evaluate((element) => element.setSelectionRange(0, 5));
    await page.touchscreen.tap(box.x + 24, box.y + 24);
    await page.touchscreen.tap(box.x + 24, box.y + 24);
    await expect(page.getByRole('dialog', { name: /WORD ASSIST/i })).toBeVisible();
  });

  test('surfaces the server AI limit without changing the draft', async ({ page }) => {
    const state = await startQaSession(page, { aiFailure: true });
    await page.getByText('DROP A BAR...').click();
    const editor = page.getByLabel('Quick bar draft');
    await editor.fill('Keep this exact draft');
    await page.getByRole('button', { name: /FREESTYLE/ }).click();
    await expect(page.getByText('AI LIMIT REACHED — YOUR DRAFT IS UNCHANGED')).toBeVisible();
    await expect(editor).toHaveValue('Keep this exact draft');
    expect(state.writes.filter((write) => write.table === 'ai')).toHaveLength(1);
  });

  test('uses the same exact replacement behavior in Track Editor', async ({ page }) => {
    await installWordAssistMock(page);
    await startQaSession(page);
    await page.getByRole('button', { name: 'Go to CRATES' }).click();
    await page.getByRole('button', { name: 'START NEW SONG' }).click();
    await expect(page.getByPlaceholder('TRACK TITLE')).toBeVisible();
    await page.getByRole('button', { name: 'VERSE', exact: true }).click();
    const editor = page.getByLabel('VERSE lyrics');
    await editor.fill('night light');
    await editor.evaluate((element) => {
      element.focus();
      element.setSelectionRange(6, 11);
    });
    await page.keyboard.press('Alt+r');
    const popup = page.getByRole('dialog', { name: /WORD ASSIST/i });
    await popup.getByRole('button', { name: 'Use bright as exact rhyme' }).click();
    await expect(editor).toHaveValue('night bright');
    await expect(editor).toBeFocused();
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
    await expect(profileTrigger).toBeFocused();
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

  test('Daily Drop recovers from a failed refresh without accepting an empty prompt', async ({ page }) => {
    await startQaSession(page);
    await page.evaluate(() => {
      let calls = 0;
      window.DailyDepositEngine.generatePrompt = () => {
        calls += 1;
        if (calls === 1) return Promise.reject(new Error('offline test'));
        return Promise.resolve({
          type: 'DAILY DEPOSIT',
          prompt: 'Write from the recovered connection.',
          challenge: 'Use resilience.',
          vocab: ['resilience'],
        });
      };
    });
    await page.getByRole('button', { name: 'Daily Drop - Get Inspired' }).click({ force: true });
    await page.getByRole('button', { name: /SHUFFLE/i }).click();
    await expect(page.getByText('COULDN’T MIX A PROMPT. TRY AGAIN.')).toBeVisible();
    await expect(page.getByRole('button', { name: /USE THIS/i })).toBeDisabled();
    await page.getByRole('button', { name: /TRY AGAIN/i }).click();
    await expect(page.getByText('Write from the recovered connection.')).toBeVisible();
    await expect(page.getByRole('button', { name: /USE THIS/i })).toBeEnabled();
  });

  test('Syndicate shows a retry state when its feed request rejects', async ({ page }) => {
    await startQaSession(page);
    await page.evaluate(() => {
      let calls = 0;
      window.DailyDepositEngine.getSyndicateFeed = () => {
        calls += 1;
        if (calls === 1) return Promise.reject(new Error('offline test'));
        return Promise.resolve([{
          id: 'recovered-post',
          prompt_text: 'Recovered community drop',
          author: 'qa',
          likes: 0,
          submission_type: 'PROMPT',
        }]);
      };
    });
    await page.getByRole('button', { name: 'Go to SYNDICATE' }).click();
    await expect(page.getByText('COULDN’T LOAD THE SYNDICATE.')).toBeVisible();
    await page.getByRole('button', { name: 'TRY AGAIN' }).click();
    await expect(page.getByText('Recovered community drop')).toBeVisible();
  });

  test('Escape closes the calendar and restores its trigger focus', async ({ page }) => {
    await startQaSession(page);
    await page.getByRole('button', { name: 'Go to CRATES' }).click();
    const calendarTrigger = page.getByRole('button', { name: 'Open calendar view' });
    await calendarTrigger.click();
    await expect(page.getByRole('dialog', { name: 'Song calendar' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Song calendar' })).toBeHidden();
    await expect(calendarTrigger).toBeFocused();
  });
});