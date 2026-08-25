# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dailybars.spec.js >> crate lifecycle, recovery, and collaboration >> does not overwrite a dirty draft when a collaborator saves remotely
- Location: tests/e2e/dailybars.spec.js:515:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Save track' })
    - locator resolved to <button disabled aria-busy="false" aria-label="Save track">SAVE</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    56 × waiting for element to be visible, enabled and stable
       - element is not enabled
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - button "Close Track Editor" [ref=e2] [cursor=pointer]
  - button "Open track collaboration" [ref=e6] [cursor=pointer]
  - button "Export track as PDF" [ref=e13] [cursor=pointer]
  - button "Save track" [disabled] [ref=e18]: SAVE
  - status [ref=e19]: COLLABORATOR UPDATE WAITING — YOUR DRAFT WAS NOT OVERWRITTEN
  - alert [ref=e20]:
    - generic [ref=e21]: COLLABORATOR UPDATE WAITING
    - paragraph [ref=e22]: Your unsaved work is still intact. Load the collaborator’s saved version, or explicitly keep your draft and overwrite it on the next save.
    - generic [ref=e23]:
      - button "LOAD REMOTE" [ref=e24] [cursor=pointer]
      - button "KEEP MY DRAFT" [active] [ref=e25] [cursor=pointer]
  - banner [ref=e26]:
    - generic [ref=e29]:
      - img [ref=e32] [cursor=pointer]:
        - generic [ref=e47]:
          - generic [ref=e51]: "55"
          - generic [ref=e52]: "70"
          - generic [ref=e53]: "100"
          - generic [ref=e54]: "130"
          - generic [ref=e55]: "160"
          - generic [ref=e56]: KILOCYCLES
        - generic [ref=e57]: VOLUME
        - generic [ref=e61]: TUNING
        - generic [ref=e65]: TONE
        - generic [ref=e68]: BAND
        - generic [ref=e71]: MAGIC EYE
      - generic: OPEN BEAT LOCKER
    - textbox "TRACK TITLE" [ref=e81]: My Local Draft
  - generic [ref=e82]:
    - generic [ref=e83]: ADD COVER ART
    - generic [ref=e91]:
      - button "SESSION DETAILS Dial in the credits and cadence" [ref=e92] [cursor=pointer]:
        - generic [ref=e97]:
          - generic [ref=e98]: SESSION DETAILS
          - generic [ref=e99]: Dial in the credits and cadence
      - generic [ref=e104]:
        - generic [ref=e105]:
          - text: STUDIO
          - textbox "E.g. OAKLAND HQ" [ref=e106]
        - generic [ref=e107]:
          - text: PRODUCER
          - textbox "E.g. GUAPDAD" [ref=e108]
        - generic [ref=e109]:
          - text: OTHER ARTISTS
          - textbox "E.g. FEATURED VOCALS" [ref=e110]
        - generic [ref=e111]:
          - text: KEY
          - textbox "E.g. B MINOR" [ref=e112]
        - generic [ref=e113]:
          - text: BPM
          - spinbutton "E.g. 92" [ref=e114]
    - generic [ref=e115]: ADD BLOCKS TO START
  - generic [ref=e116]:
    - generic [ref=e117]:
      - generic [ref=e118]: YOUR INPUT
      - generic [ref=e119]:
        - button [ref=e120] [cursor=pointer]
        - button [ref=e125] [cursor=pointer]
        - button [ref=e131] [cursor=pointer]
        - button [ref=e135] [cursor=pointer]
        - button [ref=e139] [cursor=pointer]
        - button [ref=e145] [cursor=pointer]
        - button [ref=e150] [cursor=pointer]
    - generic [ref=e153]:
      - generic [ref=e154]: AI ASSIST
      - generic [ref=e155]:
        - button "✦ NEXT BARS" [ref=e156] [cursor=pointer]
        - button "HOOK" [ref=e157] [cursor=pointer]
        - button "BRIDGE" [ref=e158] [cursor=pointer]
        - button "FREESTYLE" [ref=e159] [cursor=pointer]
```

# Test source

```ts
  436 |     await expect(page.getByText('TRACK SAVED')).toBeVisible();
  437 |     expect(state.songs[0].title).toBe('Unsaved Town Draft');
  438 |   });
  439 | 
  440 |   test('adds a bar idempotently and reports an already-added retry', async ({ page }) => {
  441 |     const bar = makeBar({ id: 'bar-source-1', text: 'Do not duplicate this bar' });
  442 |     const state = await startQaSession(page, { bars: [bar], songs: [makeSong()] });
  443 |     const barCard = page.locator('article').filter({ hasText: bar.text });
  444 |     const addButton = barCard.getByRole('button', { name: 'CRATE', exact: true });
  445 | 
  446 |     await addButton.click();
  447 |     let dialog = page.getByRole('dialog', { name: 'ADD TO CRATE' });
  448 |     await dialog.getByRole('button', { name: /Town Draft/ }).click();
  449 |     await dialog.getByRole('button', { name: 'CONFIRM INSERT' }).click();
  450 |     await expect(dialog.getByText('ADDED TO CRATE')).toBeVisible();
  451 |     await expect(dialog).toBeHidden();
  452 | 
  453 |     await addButton.click();
  454 |     dialog = page.getByRole('dialog', { name: 'ADD TO CRATE' });
  455 |     await dialog.getByRole('button', { name: /Town Draft/ }).click();
  456 |     await dialog.getByRole('button', { name: 'CONFIRM INSERT' }).click();
  457 |     await expect(dialog.getByText('ALREADY IN THIS CRATE')).toBeVisible();
  458 |     expect(state.songs[0].blocks.filter((block) => block.sourceBarId === bar.id)).toHaveLength(1);
  459 |   });
  460 | 
  461 |   test('server limit error explains deletion and deleting frees the next slot', async ({ page }) => {
  462 |     const state = await startQaSession(page, {
  463 |       songs: [
  464 |         makeSong({ id: 'song-1', title: 'One' }),
  465 |         makeSong({ id: 'song-2', title: 'Two' }),
  466 |         makeSong({ id: 'song-3', title: 'Three' }),
  467 |       ],
  468 |       enforceCrateLimit: true,
  469 |     });
  470 |     await page.getByRole('button', { name: 'Go to CRATES' }).click();
  471 |     await page.getByRole('button', { name: 'START NEW SONG' }).click();
  472 |     await expect(page.getByText(/used all 3 free crate slots/i)).toBeVisible();
  473 |     await page.getByRole('button', { name: 'CLOSE', exact: true }).click();
  474 | 
  475 |     await page.getByRole('button', { name: 'Delete One crate' }).click();
  476 |     await page.getByRole('dialog', { name: 'DELETE THIS CRATE?' }).getByRole('button', { name: 'DELETE', exact: true }).click();
  477 |     expect(state.songs).toHaveLength(2);
  478 |     await page.getByRole('button', { name: 'START NEW SONG' }).click();
  479 |     await expect(page.getByPlaceholder('TRACK TITLE')).toBeVisible();
  480 |     expect(state.songs).toHaveLength(3);
  481 |   });
  482 | 
  483 |   test('persists media, metadata, block ordering, and playback across reopen', async ({ page }) => {
  484 |     const state = await startQaSession(page, {
  485 |       songs: [makeSong({
  486 |         title: 'Media Crate',
  487 |         cover_image: 'data:image/png;base64,AAAA',
  488 |         beat_url: 'https://example.test/beat.mp3',
  489 |         video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  490 |         studio: 'Oakland HQ',
  491 |         producer: 'Town Producer',
  492 |         other_artists: 'Guest Voice',
  493 |         key: 'B MINOR',
  494 |         bpm: 92,
  495 |         blocks: [
  496 |           { id: 'text-1', type: 'text', label: 'VERSE', content: 'First verse' },
  497 |           { id: 'audio-1', type: 'audio', content: 'data:audio/webm;base64,AAAA' },
  498 |         ],
  499 |       })],
  500 |     });
  501 |     await page.getByRole('button', { name: 'Go to CRATES' }).click();
  502 |     await page.getByRole('button', { name: 'Open crate Media Crate' }).click();
  503 |     await expect(page.getByAltText('Cover')).toBeVisible();
  504 |     await expect(page.locator('audio[src="https://example.test/beat.mp3"]')).toHaveCount(1);
  505 |     await expect(page.locator('iframe[src*="youtube.com/embed"]')).toBeVisible();
  506 |     await expect(page.getByPlaceholder('E.g. OAKLAND HQ')).toHaveValue('Oakland HQ');
  507 |     await page.getByRole('button', { name: 'Move VERSE block down' }).click();
  508 |     await page.getByRole('button', { name: 'Save track' }).click();
  509 |     await page.getByRole('button', { name: 'Close Track Editor' }).click();
  510 |     await page.getByRole('button', { name: 'Open crate Media Crate' }).click();
  511 |     expect(state.songs[0].blocks.map((block) => block.id)).toEqual(['audio-1', 'text-1']);
  512 |     await expect(page.getByRole('textbox', { name: 'VERSE lyrics' })).toHaveValue('First verse');
  513 |   });
  514 | 
  515 |   test('does not overwrite a dirty draft when a collaborator saves remotely', async ({ page }) => {
  516 |     await page.addInitScript(() => {
  517 |       window.__DAILYBARS_CRATE_POLL_MS__ = 100;
  518 |     });
  519 |     const state = await startQaSession(page, { songs: [makeSong()] });
  520 |     await page.getByRole('button', { name: 'Go to CRATES' }).click();
  521 |     await page.getByRole('button', { name: 'Open crate Town Draft' }).click();
  522 |     const title = page.getByPlaceholder('TRACK TITLE');
  523 |     await title.fill('My Local Draft');
  524 | 
  525 |     state.songs[0] = {
  526 |       ...state.songs[0],
  527 |       title: 'Remote Collaborator Draft',
  528 |       updated_at: '2026-08-24T12:01:00.000Z',
  529 |       updated_by: 'other-user',
  530 |       updated_by_username: 'town-collaborator',
  531 |     };
  532 |     const conflict = page.getByRole('alert').filter({ hasText: 'COLLABORATOR UPDATE WAITING' });
  533 |     await expect(conflict).toBeVisible();
  534 |     await expect(title).toHaveValue('My Local Draft');
  535 |     await conflict.getByRole('button', { name: 'KEEP MY DRAFT' }).click();
> 536 |     await page.getByRole('button', { name: 'Save track' }).click();
      |                                                            ^ Error: locator.click: Test timeout of 30000ms exceeded.
  537 |     await expect(page.getByText('TRACK SAVED')).toBeVisible();
  538 |     expect(state.songs[0].title).toBe('My Local Draft');
  539 |   });
  540 | 
  541 |   test('uses a server-generated invite and accepts it for the signed-in recipient', async ({ page }) => {
  542 |     const ownerState = await startQaSession(page, { songs: [makeSong()] });
  543 |     await page.getByRole('button', { name: 'Go to CRATES' }).click();
  544 |     await page.getByRole('button', { name: 'Open crate Town Draft' }).click();
  545 |     await page.getByRole('button', { name: 'Open track collaboration' }).click();
  546 |     await page.getByRole('button', { name: 'GENERATE INVITE LINK' }).click();
  547 |     await expect(page.getByRole('dialog', { name: 'COLLABORATE' }).locator('input[readonly]')).toHaveValue(
  548 |       'http://127.0.0.1:5001?collab=server-generated-invite-token'
  549 |     );
  550 |     const inviteWrite = ownerState.writes.find((write) =>
  551 |       write.method === 'POST' && write.table === 'collaborators' && write.body?.songId
  552 |     );
  553 |     expect(inviteWrite.body).toEqual({ songId: 'song-1' });
  554 | 
  555 |     const recipient = await page.context().browser().newPage();
  556 |     const recipientState = await installApiMock(recipient, {
  557 |       songs: [makeSong({ title: 'Shared Town Draft' })],
  558 |     });
  559 |     await recipient.goto('/index.html?collab=server-generated-invite-token');
  560 |     await recipient.getByRole('button', { name: 'ENTER DEV QA ACCOUNT' }).click();
  561 |     await expect(recipient.getByPlaceholder('TRACK TITLE')).toHaveValue('Shared Town Draft');
  562 |     await expect(recipient).not.toHaveURL(/collab=/);
  563 |     expect(recipientState.writes.some((write) =>
  564 |       write.method === 'POST' &&
  565 |       write.table === 'collaborators' &&
  566 |       write.body?.token === 'server-generated-invite-token'
  567 |     )).toBe(true);
  568 |     await recipient.close();
  569 |   });
  570 | 
  571 |   test('server version conflict preserves both the local draft and the remote save', async ({ page }) => {
  572 |     const state = await startQaSession(page, { songs: [makeSong()] });
  573 |     await page.getByRole('button', { name: 'Go to CRATES' }).click();
  574 |     await page.getByRole('button', { name: 'Open crate Town Draft' }).click();
  575 |     const title = page.getByPlaceholder('TRACK TITLE');
  576 |     await title.fill('Unsaved Local Race');
  577 |     state.songs[0] = {
  578 |       ...state.songs[0],
  579 |       title: 'Remote Save Won First',
  580 |       updated_at: '2026-08-24T12:01:00.000Z',
  581 |       updated_by: 'other-user',
  582 |       updated_by_username: 'town-collaborator',
  583 |     };
  584 | 
  585 |     await page.getByRole('button', { name: 'Save track' }).click();
  586 |     const conflict = page.getByRole('alert').filter({ hasText: 'COLLABORATOR UPDATE WAITING' });
  587 |     await expect(conflict).toBeVisible();
  588 |     await expect(title).toHaveValue('Unsaved Local Race');
  589 |     expect(state.songs[0].title).toBe('Remote Save Won First');
  590 |     await conflict.getByRole('button', { name: 'LOAD REMOTE' }).click();
  591 |     await expect(title).toHaveValue('Remote Save Won First');
  592 |   });
  593 | 
  594 |   test('shows retryable crate load failure without pretending it is empty', async ({ page }) => {
  595 |     const state = await startQaSession(page, { failSongsLoad: true });
  596 |     await page.getByRole('button', { name: 'Go to CRATES' }).click();
  597 |     await expect(page.getByRole('alert')).toContainText('CRATES COULD NOT LOAD');
  598 |     await expect(page.getByText('NO NEWS IS GOOD NEWS')).toBeHidden();
  599 |     state.failSongsLoad = false;
  600 |     await page.getByRole('button', { name: 'TRY AGAIN' }).click();
  601 |     await expect(page.getByRole('alert')).toHaveCount(0);
  602 |   });
  603 | });
  604 | 
  605 | test.describe('writing intelligence', () => {
  606 |   test('highlights live sound groups and replaces only the selected word', async ({ page }) => {
  607 |     await installWordAssistMock(page);
  608 |     await startQaSession(page);
  609 |     await page.getByText('DROP A BAR...').click();
  610 |     const editor = page.getByLabel('Quick bar draft');
  611 |     await editor.fill('night light glow');
  612 | 
  613 |     const highlights = page.locator('.rhyme-textarea-mirror .rhyme-highlight');
  614 |     await expect(highlights).toHaveCount(2);
  615 |     await expect(page.getByText('HEURISTIC SOUND GROUPS')).toBeVisible();
  616 | 
  617 |     await editor.evaluate((element) => {
  618 |       element.focus();
  619 |       element.setSelectionRange(6, 11);
  620 |     });
  621 |     await page.keyboard.press('Alt+r');
  622 |     const popup = page.getByRole('dialog', { name: /WORD ASSIST/i });
  623 |     await expect(popup).toBeVisible();
  624 |     await expect(popup.getByText('EXACT RHYMES')).toBeVisible();
  625 |     await expect(popup.getByText('NEAR / SLANT RHYMES')).toBeVisible();
  626 |     await popup.getByRole('button', { name: 'Use bright as exact rhyme' }).click();
  627 |     await expect(editor).toHaveValue('night bright glow');
  628 |     await expect(editor).toBeFocused();
  629 |     const staleReplacement = await page.evaluate(() => (
  630 |       window.DailyBarsApp.applySuggestionToText(
  631 |         'night changed glow',
  632 |         'bright',
  633 |         { start: 6, end: 11 },
  634 |         'light'
  635 |       )
  636 |     ));
```