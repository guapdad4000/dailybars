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

function makeSong(overrides = {}) {
  return {
    id: 'song-1',
    username: 'qa',
    title: 'Town Draft',
    blocks: [],
    status: 'draft',
    cover_image: null,
    beat_url: '',
    video_url: '',
    studio: '',
    producer: '',
    other_artists: '',
    key: '',
    bpm: null,
    created_at: '2026-08-24T12:00:00.000Z',
    updated_at: '2026-08-24T12:00:00.000Z',
    updated_by: 'qa-user',
    updated_by_username: 'qa',
    ...overrides,
  };
}

async function installApiMock(page, {
  bars = [],
  songs = [],
  failNextWrite = false,
  aiFailure = false,
  enforceCrateLimit = false,
  failSongsLoad = false,
} = {}) {
  const state = {
    bars: [...bars],
    songs: [...songs],
    writes: [],
    failNextWrite,
    aiFailure,
    enforceCrateLimit,
    failSongsLoad,
  };

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
      if (table === 'songs' && parts[2]) {
        const song = state.songs.find((item) => item.id === parts[2]);
        await route.fulfill({
          status: song ? 200 : 404,
          contentType: 'application/json',
          body: JSON.stringify(song || { error: 'Crate not found.' }),
        });
        return;
      }
      if (table === 'songs' && state.failSongsLoad) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'temporary crate outage' }),
        });
        return;
      }
      if (table === 'collaborators') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
        return;
      }
      const body = table === 'bars' ? state.bars : table === 'songs' ? state.songs : [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: body }),
      });
      return;
    }

    if (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
      let writeBody = null;
      try {
        writeBody = request.postDataJSON();
      } catch {
        writeBody = request.postData();
      }
      state.writes.push({ method, table, body: writeBody });
      if (state.failNextWrite && (table === 'bars' || table === 'songs')) {
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
        if (parts[3] === 'append-bar') {
          const index = state.songs.findIndex((song) => song.id === parts[2]);
          const song = state.songs[index];
          const alreadyAdded = song.blocks.some((block) => block.sourceBarId === body.sourceBarId);
          if (!alreadyAdded) {
            song.blocks = [...song.blocks, ...body.blocks.map((block) => ({ ...block, sourceBarId: body.sourceBarId }))];
            song.updated_at = new Date(Date.parse(song.updated_at) + 1000).toISOString();
          }
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ song, alreadyAdded }),
          });
          return;
        }
        if (state.enforceCrateLimit && state.songs.length >= 3) {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Premium unlocks unlimited crates and beat uploads.' }),
          });
          return;
        }
        const song = makeSong({
          id: `song-${state.songs.length + 1}`,
          title: body.title,
          username: body.username || 'qa',
          blocks: body.blocks || [],
          status: body.status || 'draft',
          cover_image: body.cover_image || null,
          beat_url: body.beat_url || '',
          video_url: body.video_url || '',
          studio: body.studio || '',
          producer: body.producer || '',
          other_artists: body.other_artists || '',
          key: body.key || '',
          bpm: body.bpm ?? null,
        });
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
      if (method === 'PATCH' && table === 'songs') {
        const body = request.postDataJSON();
        const id = parts[2];
        const index = state.songs.findIndex((song) => song.id === id);
        const current = state.songs[index] || makeSong({ id });
        if (body.expected_updated_at && Date.parse(body.expected_updated_at) !== Date.parse(current.updated_at)) {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'This crate changed before your save completed.',
              code: 'CRATE_VERSION_CONFLICT',
              currentSong: current,
            }),
          });
          return;
        }
        const { expected_updated_at: _expectedUpdatedAt, ...changes } = body;
        const updated = {
          ...current,
          ...changes,
          updated_at: new Date(Date.parse(current.updated_at) + 1000).toISOString(),
          updated_by: 'qa-user',
          updated_by_username: 'qa',
        };
        if (index >= 0) state.songs[index] = updated;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updated) });
        return;
      }
      if (method === 'DELETE' && table === 'songs') {
        state.songs = state.songs.filter((song) => song.id !== parts[2]);
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
        return;
      }
      if (table === 'collaborators' && parts[2] === 'invite') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            token: 'server-generated-invite-token',
            expiresAt: '2026-08-31T12:00:00.000Z',
          }),
        });
        return;
      }
      if (table === 'collaborators' && parts[2] === 'join') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ songId: state.songs[0]?.id }),
        });
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

test.describe('crate lifecycle, recovery, and collaboration', () => {
  test('creates, renames, saves, reopens, duplicates, and deletes a crate', async ({ page }) => {
    const state = await startQaSession(page);
    await page.getByRole('button', { name: 'Go to CRATES' }).click();
    await page.getByRole('button', { name: 'START NEW SONG' }).click();

    await page.getByPlaceholder('TRACK TITLE').fill('Broadway Session');
    await page.getByRole('button', { name: 'VERSE', exact: true }).click();
    await page.getByLabel('VERSE lyrics').fill('Town business in the margins');
    await page.getByRole('button', { name: 'Save track' }).click();
    await expect(page.getByText('TRACK SAVED')).toBeVisible();
    await page.getByRole('button', { name: 'Close Track Editor' }).click();

    const crate = page.getByRole('button', { name: 'Open crate Broadway Session' });
    await expect(crate).toBeVisible();
    await crate.press('Enter');
    await expect(page.getByLabel('VERSE lyrics')).toHaveValue('Town business in the margins');
    await page.getByRole('button', { name: 'Close Track Editor' }).click();

    await page.getByRole('button', { name: 'Duplicate Broadway Session crate' }).click();
    await expect(page.getByText('CRATE DUPLICATED')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open crate Broadway Session — COPY' })).toBeVisible();

    await page.getByRole('button', { name: 'Delete Broadway Session — COPY crate' }).click();
    const dialog = page.getByRole('dialog', { name: 'DELETE THIS CRATE?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'DELETE', exact: true }).click();
    await expect(page.getByText('CRATE DELETED — ONE FREE SLOT IS NOW AVAILABLE')).toBeVisible();
    expect(state.songs).toHaveLength(1);
    expect(state.songs[0].title).toBe('Broadway Session');
  });

  test('keeps failed edits, warns on close, and succeeds on retry', async ({ page }) => {
    const state = await startQaSession(page, { songs: [makeSong()], failNextWrite: true });
    await page.getByRole('button', { name: 'Go to CRATES' }).click();
    await page.getByRole('button', { name: 'Open crate Town Draft' }).click();
    const title = page.getByPlaceholder('TRACK TITLE');
    await title.fill('Unsaved Town Draft');

    await page.getByRole('button', { name: 'Close Track Editor' }).click();
    const closeDialog = page.getByRole('dialog', { name: 'UNSAVED TRACK' });
    await expect(closeDialog).toBeVisible();
    await closeDialog.getByRole('button', { name: 'KEEP EDITING' }).click();
    await expect(title).toHaveValue('Unsaved Town Draft');

    await page.getByRole('button', { name: 'Save track' }).click();
    await expect(page.getByText('SAVE FAILED — YOUR TRACK IS STILL OPEN')).toBeVisible();
    await expect(title).toHaveValue('Unsaved Town Draft');
    await page.getByRole('button', { name: 'Save track' }).click();
    await expect(page.getByText('TRACK SAVED')).toBeVisible();
    expect(state.songs[0].title).toBe('Unsaved Town Draft');
  });

  test('adds a bar idempotently and reports an already-added retry', async ({ page }) => {
    const bar = makeBar({ id: 'bar-source-1', text: 'Do not duplicate this bar' });
    const state = await startQaSession(page, { bars: [bar], songs: [makeSong()] });
    const barCard = page.locator('article').filter({ hasText: bar.text });
    const addButton = barCard.getByRole('button', { name: 'CRATE', exact: true });

    await addButton.click();
    let dialog = page.getByRole('dialog', { name: 'ADD TO CRATE' });
    await dialog.getByRole('button', { name: /Town Draft/ }).click();
    await dialog.getByRole('button', { name: 'CONFIRM INSERT' }).click();
    await expect(dialog.getByText('ADDED TO CRATE')).toBeVisible();
    await expect(dialog).toBeHidden();

    await addButton.click();
    dialog = page.getByRole('dialog', { name: 'ADD TO CRATE' });
    await dialog.getByRole('button', { name: /Town Draft/ }).click();
    await dialog.getByRole('button', { name: 'CONFIRM INSERT' }).click();
    await expect(dialog.getByText('ALREADY IN THIS CRATE')).toBeVisible();
    expect(state.songs[0].blocks.filter((block) => block.sourceBarId === bar.id)).toHaveLength(1);
  });

  test('server limit error explains deletion and deleting frees the next slot', async ({ page }) => {
    const state = await startQaSession(page, {
      songs: [
        makeSong({ id: 'song-1', title: 'One' }),
        makeSong({ id: 'song-2', title: 'Two' }),
        makeSong({ id: 'song-3', title: 'Three' }),
      ],
      enforceCrateLimit: true,
    });
    await page.getByRole('button', { name: 'Go to CRATES' }).click();
    await page.getByRole('button', { name: 'START NEW SONG' }).click();
    await expect(page.getByText(/used all 3 free crate slots/i)).toBeVisible();
    await page.getByRole('button', { name: 'CLOSE', exact: true }).click();

    await page.getByRole('button', { name: 'Delete One crate' }).click();
    await page.getByRole('dialog', { name: 'DELETE THIS CRATE?' }).getByRole('button', { name: 'DELETE', exact: true }).click();
    expect(state.songs).toHaveLength(2);
    await page.getByRole('button', { name: 'START NEW SONG' }).click();
    await expect(page.getByPlaceholder('TRACK TITLE')).toBeVisible();
    expect(state.songs).toHaveLength(3);
  });

  test('persists media, metadata, block ordering, and playback across reopen', async ({ page }) => {
    const state = await startQaSession(page, {
      songs: [makeSong({
        title: 'Media Crate',
        cover_image: 'data:image/png;base64,AAAA',
        beat_url: 'https://example.test/beat.mp3',
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        studio: 'Oakland HQ',
        producer: 'Town Producer',
        other_artists: 'Guest Voice',
        key: 'B MINOR',
        bpm: 92,
        blocks: [
          { id: 'text-1', type: 'text', label: 'VERSE', content: 'First verse' },
          { id: 'audio-1', type: 'audio', content: 'data:audio/webm;base64,AAAA' },
        ],
      })],
    });
    await page.getByRole('button', { name: 'Go to CRATES' }).click();
    await page.getByRole('button', { name: 'Open crate Media Crate' }).click();
    await expect(page.getByAltText('Cover')).toBeVisible();
    await expect(page.locator('audio[src="https://example.test/beat.mp3"]')).toHaveCount(1);
    await expect(page.locator('iframe[src*="youtube.com/embed"]')).toBeVisible();
    await expect(page.getByPlaceholder('E.g. OAKLAND HQ')).toHaveValue('Oakland HQ');
    await page.getByRole('button', { name: 'Move VERSE block down' }).click();
    await page.getByRole('button', { name: 'Save track' }).click();
    await page.getByRole('button', { name: 'Close Track Editor' }).click();
    await page.getByRole('button', { name: 'Open crate Media Crate' }).click();
    expect(state.songs[0].blocks.map((block) => block.id)).toEqual(['audio-1', 'text-1']);
    await expect(page.getByRole('textbox', { name: 'VERSE lyrics' })).toHaveValue('First verse');
  });

  test('does not overwrite a dirty draft when a collaborator saves remotely', async ({ page }) => {
    await page.addInitScript(() => {
      window.__DAILYBARS_CRATE_POLL_MS__ = 100;
    });
    const state = await startQaSession(page, { songs: [makeSong()] });
    await page.getByRole('button', { name: 'Go to CRATES' }).click();
    await page.getByRole('button', { name: 'Open crate Town Draft' }).click();
    const title = page.getByPlaceholder('TRACK TITLE');
    await title.fill('My Local Draft');

    state.songs[0] = {
      ...state.songs[0],
      title: 'Remote Collaborator Draft',
      updated_at: '2026-08-24T12:01:00.000Z',
      updated_by: 'other-user',
      updated_by_username: 'town-collaborator',
    };
    const conflict = page.getByRole('alert').filter({ hasText: 'COLLABORATOR UPDATE WAITING' });
    await expect(conflict).toBeVisible();
    await expect(title).toHaveValue('My Local Draft');
    await conflict.getByRole('button', { name: 'KEEP MY DRAFT' }).click();
    await page.getByRole('button', { name: 'Save track' }).click();
    await expect(page.getByText('TRACK SAVED')).toBeVisible();
    expect(state.songs[0].title).toBe('My Local Draft');
  });

  test('uses a server-generated invite and accepts it for the signed-in recipient', async ({ page }) => {
    const ownerState = await startQaSession(page, { songs: [makeSong()] });
    await page.getByRole('button', { name: 'Go to CRATES' }).click();
    await page.getByRole('button', { name: 'Open crate Town Draft' }).click();
    await page.getByRole('button', { name: 'Open track collaboration' }).click();
    await page.getByRole('button', { name: 'GENERATE INVITE LINK' }).click();
    await expect(page.getByRole('dialog', { name: 'COLLABORATE' }).locator('input[readonly]')).toHaveValue(
      'http://127.0.0.1:5001?collab=server-generated-invite-token'
    );
    const inviteWrite = ownerState.writes.find((write) =>
      write.method === 'POST' && write.table === 'collaborators' && write.body?.songId
    );
    expect(inviteWrite.body).toEqual({ songId: 'song-1' });

    const recipient = await page.context().browser().newPage();
    const recipientState = await installApiMock(recipient, {
      songs: [makeSong({ title: 'Shared Town Draft' })],
    });
    await recipient.goto('/index.html?collab=server-generated-invite-token');
    await recipient.getByRole('button', { name: 'ENTER DEV QA ACCOUNT' }).click();
    await expect(recipient.getByPlaceholder('TRACK TITLE')).toHaveValue('Shared Town Draft');
    await expect(recipient).not.toHaveURL(/collab=/);
    expect(recipientState.writes.some((write) =>
      write.method === 'POST' &&
      write.table === 'collaborators' &&
      write.body?.token === 'server-generated-invite-token'
    )).toBe(true);
    await recipient.close();
  });

  test('server version conflict preserves both the local draft and the remote save', async ({ page }) => {
    const state = await startQaSession(page, { songs: [makeSong()] });
    await page.getByRole('button', { name: 'Go to CRATES' }).click();
    await page.getByRole('button', { name: 'Open crate Town Draft' }).click();
    const title = page.getByPlaceholder('TRACK TITLE');
    await title.fill('Unsaved Local Race');
    state.songs[0] = {
      ...state.songs[0],
      title: 'Remote Save Won First',
      updated_at: '2026-08-24T12:01:00.000Z',
      updated_by: 'other-user',
      updated_by_username: 'town-collaborator',
    };

    await page.getByRole('button', { name: 'Save track' }).click();
    const conflict = page.getByRole('alert').filter({ hasText: 'COLLABORATOR UPDATE WAITING' });
    await expect(conflict).toBeVisible();
    await expect(title).toHaveValue('Unsaved Local Race');
    expect(state.songs[0].title).toBe('Remote Save Won First');
    await conflict.getByRole('button', { name: 'LOAD REMOTE' }).click();
    await expect(title).toHaveValue('Remote Save Won First');
  });

  test('shows retryable crate load failure without pretending it is empty', async ({ page }) => {
    const state = await startQaSession(page, { failSongsLoad: true });
    await page.getByRole('button', { name: 'Go to CRATES' }).click();
    await expect(page.getByRole('alert')).toContainText('CRATES COULD NOT LOAD');
    await expect(page.getByText('NO NEWS IS GOOD NEWS')).toBeHidden();
    state.failSongsLoad = false;
    await page.getByRole('button', { name: 'TRY AGAIN' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
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