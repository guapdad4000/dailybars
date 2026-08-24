import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';

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

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.join(root, 'images', 'screenshots');
await fs.mkdir(outDir, { recursive: true });

const demoUser = {
  id: '00000000-0000-4000-8000-000000000001',
  username: 'guap',
  email: 'demo@dailybars.local',
  xp: 880,
  level: 8,
  total_bars: 128,
  current_streak: 14
};

const now = new Date();
const demoBars = [
  {
    id: 'bar-001',
    username: 'guap',
    text: 'Oakland sunrise on the notebook spine\nCatalog heavy, every page got a pulse\nI turn a passing thought to proof of life\nThen bank another bar before lunch',
    tags: ['oakland', 'daily', 'catalog'],
    is_favorite: true,
    created_at: now.toISOString(),
    updated_at: now.toISOString()
  },
  {
    id: 'bar-002',
    username: 'guap',
    text: 'Voice memo smoke in the back of the lab\nScratch pad open while the drums talk back\nEvery rough take got a future attached',
    tags: ['studio', 'voice-note'],
    is_favorite: false,
    created_at: new Date(now.getTime() - 86400000).toISOString(),
    updated_at: new Date(now.getTime() - 86400000).toISOString()
  },
  {
    id: 'bar-003',
    username: 'guap',
    text: 'The archive looking like a crate wall\nIdeas stacked until the hook calls',
    tags: ['archive'],
    is_favorite: true,
    created_at: new Date(now.getTime() - 172800000).toISOString(),
    updated_at: new Date(now.getTime() - 172800000).toISOString()
  }
];

const demoSongs = [
  {
    id: 'song-001',
    username: 'guap',
    title: 'Daily Deposit',
    status: 'draft',
    blocks: [
      { id: 'block-001', type: 'verse', content: demoBars[0].text },
      { id: 'block-002', type: 'hook', content: 'Write it daily, stack it crazy, keep the cadence clean' }
    ],
    created_at: new Date(now.getTime() - 3600000).toISOString(),
    updated_at: now.toISOString()
  },
  {
    id: 'song-002',
    username: 'guap',
    title: 'Oakland Notebook',
    status: 'idea',
    blocks: [
      { id: 'block-003', type: 'verse', content: demoBars[1].text }
    ],
    created_at: new Date(now.getTime() - 259200000).toISOString(),
    updated_at: new Date(now.getTime() - 86400000).toISOString()
  }
];

const demoCommunity = [
  {
    id: 'post-001',
    author: 'guap',
    prompt_text: 'Write four bars about turning a voice note into a blueprint.',
    likes: 32,
    submission_type: 'PROMPT',
    created_at: now.toISOString()
  },
  {
    id: 'post-002',
    author: 'syndicate',
    prompt_text: 'Free game: make the first line feel like a camera pan.',
    likes: 21,
    submission_type: 'VERSE',
    created_at: new Date(now.getTime() - 7200000).toISOString()
  }
];

const promptRows = [{ id: 'prompt-001', value: 'Momentum' }, { id: 'prompt-002', value: 'Blueprint' }];

function tablePayload(table) {
  switch (table) {
    case 'users':
      return [demoUser];
    case 'bars':
      return demoBars;
    case 'songs':
      return demoSongs;
    case 'community_submissions':
      return demoCommunity;
    case 'community_upvotes':
    case 'community_blocks':
    case 'community_reports':
    case 'user_trophies':
    case 'revenuecat_customers':
    case 'premium_usage':
      return [];
    case 'prompts_feelings':
    case 'prompts_settings':
    case 'prompts_objects':
    case 'prompts_smells':
    case 'prompts_vocab':
      return promptRows;
    default:
      return [];
  }
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
  const context = await browser.newContext({
    viewport: { width: 1290, height: 2796 },
    deviceScaleFactor: 1,
    isMobile: true
  });
  const page = await context.newPage();
  await page.route('https://tilpgwoyyervbgdlucap.supabase.co/rest/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split('/').pop();
    const isRead = request.method() === 'GET' || request.method() === 'HEAD';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isRead ? tablePayload(table) : {})
    });
  });
  await page.addInitScript(() => {
    localStorage.setItem('dailybars_session', JSON.stringify({
      user: {
        id: '00000000-0000-4000-8000-000000000001',
        username: 'guap',
        email: 'demo@dailybars.local',
        xp: 880,
        level: 8,
        total_bars: 128
      },
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000),
      createdAt: Date.now()
    }));
  });
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (
    document.querySelector('.dailybars-shell, .swipe-container') ||
    /DAILY RAPS|FEED|ARCHIVE|CRATES/i.test(document.body.innerText || '')
  ), undefined, { timeout: 15000 });
  for (const [view, name] of [['feed', 'feed'], ['archive', 'archive'], ['crates', 'crates']]) {
    await page.evaluate((nextView) => {
      localStorage.setItem('dailybars_view', nextView);
      window.location.reload();
    }, view);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false });
  }
  await browser.close();
  console.log(`Screenshots written to ${outDir}`);
} finally {
  shutdown();
}
