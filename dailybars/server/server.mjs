import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { getStripeClient, getStripeSync, initializeStripe } from './stripe-client.mjs';

const { Pool } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT || 5000);
const isDevelopment = process.env.DAILYBARS_ENVIRONMENT !== 'production';
const supabaseUrl = process.env.DAILYBARS_SUPABASE_URL || '';
const supabaseAnonKey = process.env.DAILYBARS_SUPABASE_ANON_KEY || '';
const releaseEnabled = process.env.DAILYBARS_RELEASE_ENABLED === 'true';
const stripeEnabled = process.env.DAILYBARS_STRIPE_ENABLED === 'true';
const billingEnabled = releaseEnabled && stripeEnabled;
const stripePriceLookupKey = process.env.DAILYBARS_STRIPE_PRICE_LOOKUP_KEY || 'dailybars_pro_monthly';
const minimaxApiKey = process.env.MINIMAX_API_KEY || '';
const minimaxBaseUrl = String(process.env.DAILYBARS_MINIMAX_BASE_URL || 'https://api.minimax.io/v1').replace(/\/+$/, '');
const minimaxModel = process.env.DAILYBARS_MINIMAX_MODEL || 'MiniMax-M2';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

const tableColumns = {
  bars: ['text', 'tags', 'image_url', 'audio_url', 'is_favorite', 'ai_generated'],
  songs: ['title', 'blocks', 'status', 'is_favorite', 'cover_image', 'beat_url', 'video_url', 'studio', 'producer', 'other_artists', 'key', 'bpm'],
  community_submissions: ['prompt_text', 'submission_type'],
  community_reports: ['submission_id', 'reason'],
  community_blocks: ['blocked_author'],
  beats: ['song_id', 'filename', 'original_filename', 'file_size_bytes', 'mime_type', 'storage_path', 'public_url', 'title', 'artist', 'album', 'bpm', 'key', 'genre', 'mood', 'tags', 'duration_seconds', 'detected_bpm', 'detected_bpm_confidence', 'detected_key', 'detected_key_confidence', 'detected_energy', 'detected_danceability', 'waveform_data', 'embedded_title', 'embedded_artist', 'embedded_album', 'embedded_year', 'embedded_genre', 'analysis_status', 'analysis_completed_at'],
};
const publicTables = new Set([
  'prompts_feelings', 'prompts_settings', 'prompts_objects', 'prompts_smells',
  'prompts_vocab', 'trophies', 'community_submissions',
]);
const ownedTables = new Set(['bars', 'songs', 'beats', 'scratch_sessions', 'community_reports', 'community_blocks']);
const safeSorts = new Set(['created_at', 'updated_at', 'xp_cost', 'layer_number']);
const QA_ID = '00000000-0000-0000-0000-000000000015';

class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const generateWithMiniMax = async (prompt, systemPrompt) => {
  if (!minimaxApiKey) throw new HttpError(503, 'AI generation is not configured for this release.');
  let response;
  try {
    response = await fetch(`${minimaxBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${minimaxApiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: minimaxModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt ||
              "You are GUAPDAD 4000's AI assistant. Write bars with Oakland energy - witty, slick, confident. Just output the bars, no explanations.",
          },
          { role: 'user', content: prompt },
        ],
        stream: false,
        temperature: 0.85,
        max_tokens: 1200,
      }),
    });
  } catch (error) {
    console.error('[ai] MiniMax request failed:', error);
    throw new HttpError(503, 'AI generation is temporarily unavailable.');
  }

  const payload = await response.json().catch(() => ({}));
  const providerCode = Number(payload?.base_resp?.status_code || 0);
  if (!response.ok || providerCode !== 0) {
    console.warn('[ai] MiniMax rejected a generation request', {
      httpStatus: response.status,
      providerCode: providerCode || null,
      providerMessage: payload?.error?.message || payload?.base_resp?.status_msg || null,
    });
    throw new HttpError(503, 'AI generation is temporarily unavailable.');
  }

  const content = payload?.choices?.[0]?.message?.content;
  const text = typeof content === 'string'
    ? content.trim()
    : Array.isArray(content)
      ? content.map((part) => typeof part === 'string' ? part : part?.text || '').join('\n').trim()
      : '';
  if (!text) throw new HttpError(502, 'AI generation returned an empty response.');
  return text;
};

const send = (res, status, body, headers = {}) => {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(payload);
};

const errorResponse = (res, error) => {
  const status = error instanceof HttpError ? error.status : 500;
  if (status >= 500) console.error('[api]', error);
  send(res, status, {
    error: error.message || 'Request failed',
    ...(error instanceof HttpError && error.details ? error.details : {}),
  });
};

const withTransaction = async (operation) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const parseBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON.');
  }
};

const readRawBody = async (req, maxBytes = 1024 * 1024) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, 'Request body is too large.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

const requireStripeBilling = () => {
  if (!billingEnabled) throw new HttpError(503, 'Billing is not enabled for this release.');
};

const checkoutBaseUrl = (req) => {
  const configured = String(process.env.DAILYBARS_PUBLIC_URL || '').replace(/\/+$/, '');
  if (configured) {
    let parsed;
    try { parsed = new URL(configured); } catch { throw new HttpError(503, 'The configured checkout URL is invalid.'); }
    if (parsed.protocol !== 'https:') throw new HttpError(503, 'The checkout URL must use HTTPS.');
    return parsed.toString().replace(/\/+$/, '');
  }
  if (!isDevelopment || !isDevHost(req)) {
    throw new HttpError(503, 'Checkout return URLs are not configured for this release.');
  }
  const host = String(req.headers.host || '');
  const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
  return `${protocol}://${host}`;
};

const getDailyRapsPrice = async (stripe) => {
  const prices = await stripe.prices.list({ lookup_keys: [stripePriceLookupKey], active: true, limit: 10 });
  const price = prices.data.find((item) => item.active && item.currency === 'usd' &&
    item.unit_amount === 999 && item.recurring?.interval === 'month');
  if (!price) throw new HttpError(503, 'The Daily Raps Pro subscription is not configured yet.');
  return price;
};

const subscriptionPeriodEnd = (subscription) => {
  const value = subscription.current_period_end || subscription.items?.data?.[0]?.current_period_end;
  return value ? new Date(Number(value) * 1000) : null;
};

const locateSubscriptionUser = async (client, subscription) => {
  const metadataUserId = subscription.metadata?.dailybars_user_id;
  if (metadataUserId && /^[0-9a-f-]{36}$/i.test(metadataUserId)) {
    const { rows } = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [metadataUserId]);
    return rows[0] || null;
  }
  const { rows } = await client.query(`
    SELECT * FROM users
    WHERE stripe_subscription_id = $1 OR stripe_customer_id = $2
    ORDER BY stripe_subscription_id = $1 DESC
    LIMIT 1
    FOR UPDATE
  `, [subscription.id, String(subscription.customer || '')]);
  return rows[0] || null;
};

const applySubscription = async (client, event, subscription, expectedPrice) => {
  const usesExpectedPrice = subscription.items?.data?.some((item) => item.price?.id === expectedPrice.id);
  const user = await locateSubscriptionUser(client, subscription);
  if (!user) return;
  if (!usesExpectedPrice && user.stripe_subscription_id !== subscription.id) return;

  const eventAt = new Date(Number(event.created || 0) * 1000);
  const active = usesExpectedPrice && ['active', 'trialing'].includes(subscription.status);
  const premiumProtected = user.role === 'admin' || user.subscription_status === 'lifetime';
  const expiresAt = active ? subscriptionPeriodEnd(subscription) : null;
  const currentPriceId = subscription.items?.data?.[0]?.price?.id || null;
  await client.query(`
    UPDATE users
    SET stripe_customer_id = $2,
        stripe_subscription_id = $3,
        stripe_subscription_price_id = $4,
        stripe_subscription_updated_at = $5,
        stripe_checkout_session_id = NULL,
        stripe_checkout_session_created_at = NULL,
        role = CASE WHEN $6 THEN role WHEN $7 THEN 'premium' ELSE 'user' END,
        subscription_status = CASE WHEN $6 THEN subscription_status WHEN $7 THEN 'premium' ELSE 'free' END,
        subscription_expires_at = CASE WHEN $6 THEN subscription_expires_at WHEN $7 THEN $8 ELSE NULL END,
        updated_at = now()
    WHERE id = $1
      AND (stripe_subscription_updated_at IS NULL OR stripe_subscription_updated_at <= $5)
  `, [
    user.id,
    String(subscription.customer || ''),
    subscription.id,
    currentPriceId,
    eventAt,
    premiumProtected,
    active,
    expiresAt,
  ]);
};

const processStripeEvent = async (event, stripe) => {
  await withTransaction(async (client) => {
    const inserted = await client.query(`
      INSERT INTO stripe_webhook_events (event_id, event_type)
      VALUES ($1, $2)
      ON CONFLICT (event_id) DO NOTHING
      RETURNING event_id
    `, [event.id, event.type]);
    if (!inserted.rowCount) return;

    const expectedPrice = await getDailyRapsPrice(stripe);
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.mode !== 'subscription' || session.payment_status !== 'paid' ||
        !session.subscription || !session.metadata?.dailybars_user_id ||
        session.client_reference_id !== session.metadata.dailybars_user_id) {
        return;
      }
      const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
      await applySubscription(client, event, subscription, expectedPrice);
      return;
    }
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted') {
      await applySubscription(client, event, event.data.object, expectedPrice);
    }
  });
};

const handleStripeWebhook = async (req, res) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
  requireStripeBilling();
  const signature = req.headers['stripe-signature'];
  if (!signature || Array.isArray(signature)) throw new HttpError(400, 'Missing Stripe signature.');
  const payload = await readRawBody(req);
  const stripe = await getStripeClient();
  const sync = await getStripeSync();
  try {
    await sync.processWebhook(payload, signature);
  } catch {
    throw new HttpError(400, 'Invalid Stripe webhook signature.');
  }
  let event;
  try {
    event = JSON.parse(payload.toString('utf8'));
  } catch {
    throw new HttpError(400, 'Stripe webhook payload is invalid.');
  }
  if (!event?.id || !event?.type || !event?.data?.object) {
    throw new HttpError(400, 'Stripe webhook event is invalid.');
  }
  await processStripeEvent(event, stripe);
  return send(res, 200, { received: true });
};

const isDevHost = (req) => {
  const host = String(req.headers.host || '').split(':')[0].toLowerCase();
  const origin = String(req.headers.origin || '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.replit.dev') ||
    host.endsWith('.repl.co') || origin.includes('.replit.dev');
};

const ensureQaProfile = async () => {
  await pool.query(`
    INSERT INTO users (id, username, email, password, auth_user_id)
    VALUES ($1, 'qa', 'qa@dailybars.dev', NULL, NULL)
    ON CONFLICT (id) DO NOTHING
  `, [QA_ID]);
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [QA_ID]);
  return rows[0];
};

const profileForAuth = async (authUser) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let result = await client.query('SELECT * FROM users WHERE auth_user_id = $1 FOR UPDATE', [authUser.id]);
    if (!result.rows[0]) {
      const metadata = authUser.user_metadata || {};
      const base = String(metadata.username || authUser.email?.split('@')[0] || 'artist')
        .toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').slice(0, 24) || 'artist';
      let username = base;
      let suffix = 1;
      while ((await client.query('SELECT 1 FROM users WHERE username = $1', [username])).rowCount) {
        username = `${base.slice(0, 20)}_${suffix++}`;
      }
      result = await client.query(`
        INSERT INTO users (auth_user_id, username, email, last_login)
        VALUES ($1, $2, $3, now())
        RETURNING *
      `, [authUser.id, username, authUser.email || `${username}@unknown.invalid`]);
    } else {
      result = await client.query('UPDATE users SET last_login = now(), email = COALESCE($2, email), updated_at = now() WHERE id = $1 RETURNING *', [result.rows[0].id, authUser.email || null]);
    }
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const authenticate = async (req) => {
  if (isDevelopment && req.headers['x-dailybars-qa'] === 'true' && isDevHost(req)) {
    return ensureQaProfile();
  }
  const authorization = String(req.headers.authorization || '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token || !supabaseUrl || !supabaseAnonKey) {
    throw new HttpError(401, 'Sign in is required.');
  }
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey, authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new HttpError(401, 'Your sign-in session has expired.');
  const authUser = await response.json();
  if (!authUser?.id) throw new HttpError(401, 'Invalid sign-in session.');
  return profileForAuth(authUser);
};

const isPremiumUser = (user) => {
  if (isDevelopment && user.id === QA_ID) return true;
  if (user.role === 'admin' || user.subscription_status === 'lifetime') return true;
  if (user.role !== 'premium' || user.subscription_status !== 'premium') return false;
  return !user.subscription_expires_at || new Date(user.subscription_expires_at) > new Date();
};

const requirePremiumUser = (user) => {
  if (!isPremiumUser(user)) throw new HttpError(403, 'Daily Raps Pro is required for this feature.');
};

const requireFreeCrateAllowance = async (client, user) => {
  const lockedUser = await lockCurrentUser(client, user.id);
  if (isPremiumUser(lockedUser)) return lockedUser;
  const { rows } = await client.query(
    'SELECT count(*)::int AS count FROM songs WHERE user_id = $1',
    [lockedUser.id],
  );
  if (Number(rows[0]?.count || 0) >= 3) {
    throw new HttpError(403, 'Premium unlocks unlimited crates and beat uploads.');
  }
  return lockedUser;
};

const lockCurrentUser = async (client, userId) => {
  const { rows } = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
  if (!rows[0]) throw new HttpError(404, 'User profile not found.');
  return rows[0];
};

const reserveAiUse = async (user) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lockedUser = await lockCurrentUser(client, user.id);
    if (!isPremiumUser(lockedUser)) {
      const telemetryKey = lockedUser.auth_user_id || lockedUser.id;
      await client.query(`
        INSERT INTO premium_usage (user_key, user_id, username, ai_uses, last_ai_use)
        VALUES ($1, $2, $3, 0, NULL)
        ON CONFLICT (user_key) DO NOTHING
      `, [telemetryKey, lockedUser.id, lockedUser.username]);
      const usage = (await client.query('SELECT ai_uses FROM premium_usage WHERE user_key = $1 FOR UPDATE', [telemetryKey])).rows[0];
      if (Number(usage?.ai_uses || 0) >= 3) {
        throw new HttpError(403, 'Free accounts can use AI three times. Upgrade to Daily Raps Pro for unlimited AI.');
      }
      await client.query('UPDATE premium_usage SET ai_uses = ai_uses + 1, last_ai_use = now(), updated_at = now() WHERE user_key = $1', [telemetryKey]);
    }
    await client.query('COMMIT');
    return lockedUser;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const releaseReservedAiUse = async (user) => {
  if (isPremiumUser(user)) return;
  const telemetryKey = user.auth_user_id || user.id;
  await pool.query(`
    UPDATE premium_usage
    SET ai_uses = GREATEST(ai_uses - 1, 0), updated_at = now()
    WHERE user_key = $1
  `, [telemetryKey]);
};

const requireUuid = (value, label = 'id') => {
  if (!/^[0-9a-f-]{36}$/i.test(String(value || ''))) throw new HttpError(400, `Invalid ${label}.`);
  return value;
};

const userOwns = async (client, table, id, user) => {
  if (table === 'bars' || table === 'songs') {
    const { rows } = await client.query(`SELECT * FROM ${table} WHERE id = $1 AND (user_id = $2 OR (user_id IS NULL AND lower(username) = lower($3)))`, [id, user.id, user.username]);
    return rows[0];
  }
  const { rows } = await client.query(`SELECT * FROM ${table} WHERE id = $1 AND user_id = $2`, [id, user.id]);
  return rows[0];
};

const userCanAccessSong = async (client, id, user, { edit = false } = {}) => {
  const { rows } = await client.query(`
    SELECT s.*
    FROM songs s
    WHERE s.id = $1
      AND (
        s.user_id = $2
        OR (s.user_id IS NULL AND lower(s.username) = lower($3))
        OR EXISTS (
          SELECT 1
          FROM song_collaborators sc
          WHERE sc.song_id = s.id
            AND sc.user_id = $2
            AND sc.accepted_at IS NOT NULL
            AND ($4::boolean = false OR sc.role IN ('editor', 'owner'))
        )
      )
  `, [id, user.id, user.username, edit]);
  return rows[0];
};

const mapInput = (table, body) => {
  const allowed = tableColumns[table] || [];
  const result = {};
  for (const field of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, field)) result[field] = body[field];
    const camel = field.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    if (Object.prototype.hasOwnProperty.call(body, camel)) result[field] = body[camel];
  }
  return result;
};

const insertRow = async (client, table, input) => {
  const entries = Object.entries(input).filter(([, value]) => value !== undefined);
  if (!entries.length) throw new HttpError(400, 'No writable fields supplied.');
  const columns = entries.map(([key]) => `"${key}"`).join(', ');
  const values = entries.map(([,], index) => `$${index + 1}`).join(', ');
  const { rows } = await client.query(`INSERT INTO ${table} (${columns}) VALUES (${values}) RETURNING *`, entries.map(([, value]) => value));
  return rows[0];
};

const updateRow = async (client, table, id, input) => {
  const entries = Object.entries(input).filter(([, value]) => value !== undefined);
  if (!entries.length) throw new HttpError(400, 'No writable fields supplied.');
  const sets = entries.map(([key], index) => `"${key}" = $${index + 1}`).join(', ');
  const { rows } = await client.query(`UPDATE ${table} SET ${sets}, updated_at = now() WHERE id = $${entries.length + 1} RETURNING *`, [...entries.map(([, value]) => value), id]);
  if (!rows[0]) throw new HttpError(404, 'Record not found.');
  return rows[0];
};

const awardAchievements = async (client, userId, xp, totalBars, streak) => {
  const { rows: trophies } = await client.query(`
    SELECT id FROM trophies
    WHERE trophy_type = 'achievement' AND (
      (requirement_type = 'xp' AND requirement_value <= $1) OR
      (requirement_type = 'bars' AND requirement_value <= $2) OR
      (requirement_type = 'streak' AND requirement_value <= $3) OR
      (requirement_type = 'special' AND requirement_value = 0)
    )
  `, [xp, totalBars, streak]);
  for (const trophy of trophies) {
    await client.query(`
      INSERT INTO user_trophies (user_id, trophy_id, earned_via)
      VALUES ($1, $2, 'achievement')
      ON CONFLICT (user_id, trophy_id) DO NOTHING
    `, [userId, trophy.id]);
  }
};

const awardXp = async (client, userId, amount, reason, eventKey, metadata = {}) => {
  if (!Number.isInteger(amount) || amount <= 0) throw new HttpError(400, 'XP awards must be positive whole numbers.');
  if (!eventKey || String(eventKey).length > 160) throw new HttpError(400, 'A stable XP event key is required.');
  const { rows: users } = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
  const user = users[0];
  if (!user) throw new HttpError(404, 'User profile not found.');
  const existing = await client.query('SELECT * FROM xp_ledger WHERE user_id = $1 AND event_key = $2', [userId, eventKey]);
  if (existing.rows[0]) {
    if (existing.rows[0].amount !== amount) throw new HttpError(409, 'XP event key was already used with a different award.');
    return { user, alreadyApplied: true, ledger: existing.rows[0] };
  }
  const xp = user.xp + amount;
  const level = Math.floor(xp / 100) + 1;
  const { rows } = await client.query(`
    UPDATE users SET xp = $2, level = $3, updated_at = now() WHERE id = $1 RETURNING *
  `, [userId, xp, level]);
  const ledger = (await client.query(`
    INSERT INTO xp_ledger (user_id, event_key, amount, reason, balance_after, metadata)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `, [userId, eventKey, amount, reason || 'XP AWARD', xp, metadata])).rows[0];
  await awardAchievements(client, userId, xp, user.total_bars, user.current_streak);
  return { user: rows[0], alreadyApplied: false, ledger };
};

const updateActivity = async (client, userId) => {
  const { rows } = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
  const user = rows[0];
  if (!user) throw new HttpError(404, 'User profile not found.');
  const { rows: counts } = await client.query('SELECT COUNT(*)::int AS count FROM bars WHERE user_id = $1 OR (user_id IS NULL AND lower(username) = lower($2))', [userId, user.username]);
  const today = new Date().toISOString().slice(0, 10);
  let streak = user.current_streak;
  if (!user.last_activity_date) streak = 1;
  else if (String(user.last_activity_date).slice(0, 10) === today) streak = user.current_streak;
  else {
    const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
    streak = String(user.last_activity_date).slice(0, 10) === yesterday ? user.current_streak + 1 : 1;
  }
  const { rows: updated } = await client.query(`
    UPDATE users SET total_bars = $2, current_streak = $3, longest_streak = GREATEST(longest_streak, $3),
      last_activity_date = $4, updated_at = now() WHERE id = $1 RETURNING *
  `, [userId, counts[0].count, streak, today]);
  return updated[0];
};

const routeApi = async (req, res, pathname, url) => {
  if (pathname === '/api/health') {
    const { rows } = await pool.query(`
      SELECT COUNT(*)::int = 2 AS billing_schema_ready
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name IN (
          'stripe_checkout_session_id',
          'stripe_checkout_session_created_at'
        )
    `);
    return send(res, 200, {
      ok: true,
      database: true,
      billingSchemaReady: rows[0]?.billing_schema_ready === true,
    });
  }
  const user = await authenticate(req);
  const parts = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const resource = parts[0];
  const id = parts[1];
  if (!resource) return send(res, 404, { error: 'API route not found.' });

  if (resource === 'stripe' && parts[1] === 'checkout-session' && req.method === 'POST') {
    requireStripeBilling();
    const body = await parseBody(req);
    if (Object.keys(body).length) throw new HttpError(400, 'Checkout options are selected by the server.');
    const stripe = await getStripeClient();
    const price = await getDailyRapsPrice(stripe);
    const baseUrl = checkoutBaseUrl(req);
    const client = await pool.connect();
    let customerId;
    let attemptId;
    let pendingToken;
    try {
      await client.query('BEGIN');
      const lockedUser = await lockCurrentUser(client, user.id);
      if (isPremiumUser(lockedUser)) {
        throw new HttpError(409, 'This account already has Daily Raps Pro. Manage it in the billing portal.');
      }

      const pendingMatch = String(lockedUser.stripe_checkout_session_id || '')
        .match(/^pending:([0-9a-f-]{36})$/i);
      if (lockedUser.stripe_checkout_session_id && !pendingMatch) {
        try {
          const existingSession = await stripe.checkout.sessions.retrieve(lockedUser.stripe_checkout_session_id);
          if (existingSession.status === 'open' && existingSession.url) {
            await client.query('COMMIT');
            return send(res, 200, { url: existingSession.url });
          }
        } catch {
          // A stale or unavailable Checkout Session should not permanently block billing.
        }
      }

      customerId = lockedUser.stripe_customer_id;
      if (customerId) {
        const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
        const existingSubscription = subscriptions.data.find((subscription) =>
          ['active', 'trialing', 'past_due', 'unpaid'].includes(subscription.status) &&
          subscription.items?.data?.some((item) => item.price?.id === price.id),
        );
        if (existingSubscription) {
          await applySubscription(client, { created: Math.floor(Date.now() / 1000) }, existingSubscription, price);
          await client.query('COMMIT');
          return send(res, 409, { error: 'This account already has Daily Raps Pro. Manage it in the billing portal.' });
        }
      }

      const reusePendingAttempt = Boolean(pendingMatch);
      attemptId = reusePendingAttempt ? pendingMatch[1] : crypto.randomUUID();
      pendingToken = `pending:${attemptId}`;
      await client.query(`
        UPDATE users
        SET stripe_checkout_session_id = $2,
            stripe_checkout_session_created_at = CASE WHEN $3 THEN stripe_checkout_session_created_at ELSE now() END,
            updated_at = now()
        WHERE id = $1
      `, [lockedUser.id, pendingToken, reusePendingAttempt]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { dailybars_user_id: user.id },
      }, {
        idempotencyKey: `dailybars-customer-${user.id}`,
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id,
      mode: 'subscription',
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { dailybars_user_id: user.id, dailybars_checkout_attempt_id: attemptId },
      subscription_data: { metadata: { dailybars_user_id: user.id } },
      success_url: `${baseUrl}/?checkout=success`,
      cancel_url: `${baseUrl}/?checkout=cancel`,
    }, {
      idempotencyKey: `dailybars-checkout-${attemptId}`,
    });
    if (!session.url) throw new HttpError(502, 'Stripe did not return a checkout URL.');

    const persisted = await pool.query(`
      UPDATE users
      SET stripe_customer_id = $2,
          stripe_checkout_session_id = $3,
          stripe_checkout_session_created_at = now(),
          updated_at = now()
      WHERE id = $1
        AND stripe_checkout_session_id = $4
      RETURNING id
    `, [user.id, customerId, session.id, pendingToken]);
    if (!persisted.rowCount) {
      const current = await pool.query('SELECT stripe_checkout_session_id FROM users WHERE id = $1', [user.id]);
      if (current.rows[0]?.stripe_checkout_session_id !== session.id) {
        throw new HttpError(409, 'A newer checkout attempt is already in progress. Please try again.');
      }
    }
    return send(res, 200, { url: session.url });
  }

  if (resource === 'stripe' && parts[1] === 'billing-portal' && req.method === 'POST') {
    requireStripeBilling();
    const body = await parseBody(req);
    if (Object.keys(body).length) throw new HttpError(400, 'Portal options are selected by the server.');
    if (!user.stripe_customer_id) throw new HttpError(404, 'No Stripe subscription was found for this account.');
    const stripe = await getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: checkoutBaseUrl(req),
    });
    return send(res, 200, { url: session.url });
  }

  if (resource === 'ai' && parts[1] === 'generate' && req.method === 'POST') {
    const body = await parseBody(req);
    const prompt = String(body.prompt || '').trim();
    const systemPrompt = String(body.systemPrompt || '').trim();
    if (!prompt) throw new HttpError(400, 'Prompt required.');
    if (prompt.length > 12_000 || systemPrompt.length > 12_000) {
      throw new HttpError(400, 'AI prompts must be 12,000 characters or fewer.');
    }

    const reservedUser = await reserveAiUse(user);
    try {
      const text = await generateWithMiniMax(prompt, systemPrompt);
      return send(res, 200, { text });
    } catch (error) {
      await releaseReservedAiUse(reservedUser);
      throw error;
    }
  }

  if (resource === 'me' && parts[1] === 'trophies' && req.method === 'GET') {
    const { rows } = await pool.query('SELECT trophy_id FROM user_trophies WHERE user_id = $1 ORDER BY unlocked_at DESC', [user.id]);
    return send(res, 200, rows);
  }
  if (resource === 'me' && parts[1] === 'showcase' && req.method === 'PATCH') {
    const body = await parseBody(req);
    const selected = Array.isArray(body.selectedTrophies || body.selected_trophies) ? (body.selectedTrophies || body.selected_trophies).slice(0, 3) : [];
    for (const trophyId of selected) requireUuid(trophyId, 'trophy id');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const unlocked = await client.query('SELECT count(*)::int AS count FROM user_trophies WHERE user_id = $1 AND trophy_id = ANY($2::uuid[])', [user.id, selected]);
      if (unlocked.rows[0].count !== selected.length) throw new HttpError(403, 'Only unlocked trophies may be showcased.');
      const { rows } = await client.query('UPDATE users SET selected_trophies = $2, updated_at = now() WHERE id = $1 RETURNING *', [user.id, selected]);
      await client.query('COMMIT');
      return send(res, 200, rows[0]);
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  if (resource === 'me' && parts.length === 1 && req.method === 'GET') return send(res, 200, user);
  if (resource === 'xp' && parts[1] === 'award' && req.method === 'POST') {
    const body = await parseBody(req);
    const todayEventKey = `daily-check-in:${new Date().toISOString().slice(0, 10)}`;
    if (body.reason !== 'DAILY CHECK-IN' || Number(body.amount) !== 10 || body.eventKey !== todayEventKey) {
      throw new HttpError(403, 'XP is awarded only by validated server-side activity events.');
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (body.reason === 'DAILY CHECK-IN') await updateActivity(client, user.id);
      const result = await awardXp(client, user.id, Number(body.amount), body.reason, body.eventKey, body.metadata);
      await client.query('COMMIT');
      return send(res, 200, result);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  if (resource === 'trophies' && id && parts[2] === 'purchase' && req.method === 'POST') {
    requireUuid(id, 'trophy id');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const trophy = (await client.query('SELECT * FROM trophies WHERE id = $1 FOR UPDATE', [id])).rows[0];
      const lockedUser = (await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [user.id])).rows[0];
      if (!trophy) throw new HttpError(404, 'Trophy not found.');
      const existing = (await client.query('SELECT * FROM user_trophies WHERE user_id = $1 AND trophy_id = $2', [user.id, id])).rows[0];
      if (existing) { await client.query('COMMIT'); return send(res, 200, { alreadyUnlocked: true, user: lockedUser, trophy }); }
      if (trophy.trophy_type === 'achievement') throw new HttpError(400, 'Achievement trophies unlock from progress.');
      if (lockedUser.xp < trophy.xp_cost) throw new HttpError(409, 'Not enough XP for this trophy.');
      const xp = lockedUser.xp - trophy.xp_cost;
      const updatedUser = (await client.query('UPDATE users SET xp = $2, level = $3, updated_at = now() WHERE id = $1 RETURNING *', [user.id, xp, Math.floor(xp / 100) + 1])).rows[0];
      await client.query(`INSERT INTO user_trophies (user_id, trophy_id, earned_via) VALUES ($1, $2, 'purchase')`, [user.id, id]);
      await client.query(`INSERT INTO xp_ledger (user_id, event_key, amount, reason, balance_after, metadata) VALUES ($1, $2, $3, 'TROPHY PURCHASE', $4, $5)`, [user.id, `trophy:${id}`, -trophy.xp_cost, xp, { trophyId: id }]);
      await client.query('COMMIT');
      return send(res, 200, { success: true, user: updatedUser, trophy });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  if (resource === 'scratch-sessions' && req.method === 'GET') {
    if (id) {
      requireUuid(id, 'session id');
      const session = (await pool.query('SELECT * FROM scratch_sessions WHERE id = $1 AND user_id = $2', [id, user.id])).rows[0];
      if (!session) throw new HttpError(404, 'Session not found.');
      const layers = (await pool.query('SELECT * FROM scratch_layers WHERE session_id = $1 ORDER BY layer_number DESC', [id])).rows;
      return send(res, 200, { ...session, layers });
    }
    const { rows } = await pool.query('SELECT * FROM scratch_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [user.id]);
    return send(res, 200, rows);
  }
  if (resource === 'scratch-sessions' && req.method === 'POST') {
    const body = await parseBody(req);
    const sessionId = body.id ? requireUuid(body.id, 'session id') : undefined;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      requirePremiumUser(await lockCurrentUser(client, user.id));
      if (sessionId) {
        const existing = await client.query('SELECT id FROM scratch_sessions WHERE id = $1 AND user_id = $2 FOR UPDATE', [sessionId, user.id]);
        const existsAnywhere = await client.query('SELECT 1 FROM scratch_sessions WHERE id = $1', [sessionId]);
        if (!existing.rowCount && existsAnywhere.rowCount) throw new HttpError(403, 'You do not own this session.');
      }
      const session = (await client.query(`
        INSERT INTO scratch_sessions (id, user_id, username, title, beat_url, beat_title)
        VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, beat_url = EXCLUDED.beat_url, beat_title = EXCLUDED.beat_title, updated_at = now()
        RETURNING *
      `, [sessionId || null, user.id, user.username, body.title || 'Untitled Session', body.beatUrl || body.beat_url || null, body.beatTitle || body.beat_title || null])).rows[0];
      await client.query('DELETE FROM scratch_layers WHERE session_id = $1', [session.id]);
      for (const layer of Array.isArray(body.layers) ? body.layers : []) {
        await client.query(`
          INSERT INTO scratch_layers (session_id, layer_number, audio_url, waveform_data, volume, pan, muted, solo, duration_seconds, time_shift)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `, [session.id, layer.layer_number, layer.audio_url, layer.waveform_data || [], Number(layer.volume) || 80, Number(layer.pan) || 0, Boolean(layer.muted), Boolean(layer.solo), Number(layer.duration_seconds) || 0, Number(layer.time_shift) || 0]);
      }
      await client.query('COMMIT');
      return send(res, 200, session);
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  if (resource === 'community' && parts[1] === 'upvote' && req.method === 'POST') {
    const body = await parseBody(req);
    requireUuid(body.submissionId, 'submission id');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query('INSERT INTO community_upvotes (submission_id, user_id, username) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id', [body.submissionId, user.id, user.username]);
      if (!inserted.rowCount) {
        await client.query('ROLLBACK');
        return send(res, 200, { alreadyVoted: true });
      }
      const updated = (await client.query(`UPDATE community_submissions SET likes = likes + 1 WHERE id = $1 AND moderation_status = 'visible' RETURNING likes`, [body.submissionId])).rows[0];
      if (!updated) throw new HttpError(404, 'Submission not found.');
      const award = await awardXp(client, user.id, 10, 'UPVOTED PROMPT', `community-upvote:${body.submissionId}`, { submissionId: body.submissionId });
      await client.query('COMMIT');
      return send(res, 200, { success: true, newLikes: updated.likes, awardedXp: award.alreadyApplied ? 0 : 10, user: award.user });
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  if (resource === 'community' && parts[1] === 'upvotes' && parts[2] && req.method === 'GET') {
    requireUuid(parts[2], 'submission id');
    const { rowCount } = await pool.query('SELECT 1 FROM community_upvotes WHERE submission_id = $1 AND user_id = $2', [parts[2], user.id]);
    return send(res, 200, { hasUpvoted: Boolean(rowCount) });
  }
  if (resource === 'community' && parts[1] === 'report' && req.method === 'POST') {
    const body = await parseBody(req);
    requireUuid(body.submissionId, 'submission id');
    const result = await pool.query(`INSERT INTO community_reports (submission_id, reporter_id, reason) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *`, [body.submissionId, user.id, body.reason || 'inappropriate']);
    if (!result.rowCount) return send(res, 200, { alreadyReported: true });
    await pool.query(`UPDATE community_submissions SET reported_count = reported_count + 1, moderation_status = CASE WHEN reported_count + 1 >= 3 THEN 'reported' ELSE moderation_status END WHERE id = $1`, [body.submissionId]);
    return send(res, 200, { success: true, data: result.rows[0] });
  }
  if (resource === 'community' && parts[1] === 'block' && req.method === 'POST') {
    const body = await parseBody(req);
    const author = String(body.author || '').trim().toLowerCase();
    if (!author) throw new HttpError(400, 'Author is required.');
    const result = await pool.query(`INSERT INTO community_blocks (user_id, blocked_author) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *`, [user.id, author]);
    return send(res, 200, { success: true, alreadyBlocked: !result.rowCount, data: result.rows[0] });
  }
  if (resource === 'community' && parts[1] === 'blocks' && req.method === 'GET') {
    const { rows } = await pool.query('SELECT blocked_author FROM community_blocks WHERE user_id = $1', [user.id]);
    return send(res, 200, rows);
  }
  if (resource === 'collaborators' && parts[1] === 'invite' && req.method === 'POST') {
    const body = await parseBody(req);
    requireUuid(body.songId, 'song id');
    const client = await pool.connect();
    try {
      const song = await userOwns(client, 'songs', body.songId, user);
      if (!song) throw new HttpError(403, 'Only a song owner can invite collaborators.');
      const token = crypto.randomBytes(32).toString('base64url');
      const { rows } = await client.query(`
        INSERT INTO song_collaborators (song_id, invite_token, created_by, expires_at)
        VALUES ($1,$2,$3,now() + interval '7 days')
        RETURNING invite_token, expires_at
      `, [body.songId, token, user.id]);
      return send(res, 201, {
        success: true,
        token: rows[0].invite_token,
        expiresAt: rows[0].expires_at,
      });
    } finally { client.release(); }
  }
  if (resource === 'collaborators' && parts[1] === 'join' && req.method === 'POST') {
    const body = await parseBody(req);
    const invite = (await pool.query(`SELECT * FROM song_collaborators WHERE invite_token = $1 AND expires_at > now()`, [String(body.token)])).rows[0];
    if (!invite) throw new HttpError(404, 'Invalid or expired invite link.');
    await pool.query(`INSERT INTO song_collaborators (song_id, user_id, username, role, accepted_at) VALUES ($1,$2,$3,'editor',now()) ON CONFLICT (song_id, user_id) DO NOTHING`, [invite.song_id, user.id, user.username]);
    await pool.query(`UPDATE songs SET is_collaborative = true, collaborator_count = (SELECT count(*) FROM song_collaborators WHERE song_id = $1 AND user_id IS NOT NULL), updated_at = now() WHERE id = $1`, [invite.song_id]);
    return send(res, 200, { songId: invite.song_id });
  }
  if (resource === 'collaborators' && parts[2] === 'presence') {
    requireUuid(parts[1], 'song id');
    const permitted = await userCanAccessSong(pool, parts[1], user);
    if (!permitted) throw new HttpError(403, 'You do not have access to this song.');
    if (req.method === 'PUT') {
      await pool.query(`
        INSERT INTO song_presence (song_id, user_id, username, last_seen)
        VALUES ($1,$2,$3,now())
        ON CONFLICT (song_id, user_id)
        DO UPDATE SET username = EXCLUDED.username, last_seen = now()
      `, [parts[1], user.id, user.username]);
      return send(res, 200, { success: true });
    }
    if (req.method === 'DELETE') {
      await pool.query('DELETE FROM song_presence WHERE song_id = $1 AND user_id = $2', [parts[1], user.id]);
      return send(res, 200, { success: true });
    }
    if (req.method === 'GET') {
      const { rows } = await pool.query(`
        SELECT user_id, username, last_seen
        FROM song_presence
        WHERE song_id = $1 AND last_seen > now() - interval '45 seconds'
        ORDER BY last_seen DESC
      `, [parts[1]]);
      return send(res, 200, rows);
    }
  }
  if (resource === 'collaborators' && parts[1] && req.method === 'GET') {
    requireUuid(parts[1], 'song id');
    const permitted = await pool.query(`SELECT 1 FROM songs s WHERE s.id = $1 AND (s.user_id = $2 OR EXISTS (SELECT 1 FROM song_collaborators sc WHERE sc.song_id = s.id AND sc.user_id = $2))`, [parts[1], user.id]);
    if (!permitted.rowCount) throw new HttpError(403, 'You do not have access to this song.');
    const { rows } = await pool.query(`SELECT user_id, username, role, created_at FROM song_collaborators WHERE song_id = $1 AND user_id IS NOT NULL`, [parts[1]]);
    return send(res, 200, rows);
  }
  if (resource === 'songs' && parts[1] && parts[2] === 'append-bar' && req.method === 'POST') {
    requireUuid(parts[1], 'song id');
    const body = await parseBody(req);
    const sourceBarId = String(body.sourceBarId || '').trim();
    const blocks = Array.isArray(body.blocks) ? body.blocks : [];
    if (!sourceBarId || blocks.length === 0) throw new HttpError(400, 'A source bar and at least one block are required.');
    if (blocks.length > 3) throw new HttpError(400, 'A bar can add at most three blocks.');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const song = await userCanAccessSong(client, parts[1], user, { edit: true });
      if (!song) throw new HttpError(403, 'You do not have permission to edit this crate.');
      const locked = (await client.query('SELECT * FROM songs WHERE id = $1 FOR UPDATE', [parts[1]])).rows[0];
      const existingBlocks = Array.isArray(locked.blocks) ? locked.blocks : [];
      const alreadyAdded = existingBlocks.some((block) => block?.sourceBarId === sourceBarId);
      if (alreadyAdded) {
        await client.query('COMMIT');
        return send(res, 200, { song: locked, alreadyAdded: true });
      }
      const normalizedBlocks = blocks.map((block) => ({
        id: String(block?.id || crypto.randomUUID()),
        type: ['text', 'audio', 'image'].includes(block?.type) ? block.type : 'text',
        content: String(block?.content || ''),
        sourceBarId,
      })).filter((block) => block.content);
      if (!normalizedBlocks.length) throw new HttpError(400, 'The selected bar has no content to add.');
      const { rows } = await client.query(`
        UPDATE songs
        SET blocks = $2::jsonb, updated_by = $3, updated_by_username = $4, updated_at = now()
        WHERE id = $1
        RETURNING *
      `, [parts[1], JSON.stringify([...existingBlocks, ...normalizedBlocks]), user.id, user.username]);
      await client.query('COMMIT');
      return send(res, 200, { song: rows[0], alreadyAdded: false });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  if (resource === 'telemetry' && parts[1] === 'revenuecat' && req.method === 'PUT') {
    const body = await parseBody(req);
    const telemetryKey = user.auth_user_id || user.id;
    const { rows } = await pool.query(`
      INSERT INTO revenuecat_customers (user_key, user_id, username, app_user_id, entitlement_pro_active, entitlements, customer_info, environment, last_synced)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (user_key) DO UPDATE SET app_user_id = EXCLUDED.app_user_id, entitlement_pro_active = EXCLUDED.entitlement_pro_active,
        entitlements = EXCLUDED.entitlements, customer_info = EXCLUDED.customer_info, environment = EXCLUDED.environment, last_synced = EXCLUDED.last_synced, updated_at = now()
      RETURNING *
    `, [telemetryKey, user.id, user.username, body.app_user_id, Boolean(body.entitlement_pro_active), body.entitlements || {}, body.customer_info || null, body.environment || null, body.last_synced || new Date().toISOString()]);
    return send(res, 200, rows[0]);
  }
  if (resource === 'telemetry' && parts[1] === 'premium' && req.method === 'PUT') {
    throw new HttpError(403, 'Premium usage is managed by the server.');
  }
  const table = resource;
  if (!/^[a-z_]+$/.test(table) || (!publicTables.has(table) && !ownedTables.has(table) && table !== 'users')) {
    throw new HttpError(404, 'Unknown API resource.');
  }
  if (table === 'users' && req.method !== 'GET') throw new HttpError(403, 'User balances can only be changed by server operations.');
  if (req.method === 'GET') {
    if (table === 'songs' && id) {
      requireUuid(id);
      const song = await userCanAccessSong(pool, id, user);
      if (!song) throw new HttpError(404, 'Crate not found.');
      return send(res, 200, song);
    }
    const values = [];
    const conditions = [];
    if (table === 'users') { conditions.push('id = $1'); values.push(user.id); }
    else if (ownedTables.has(table)) {
      if (table === 'bars') { conditions.push('(user_id = $1 OR (user_id IS NULL AND lower(username) = lower($2)))'); values.push(user.id, user.username); }
      else if (table === 'songs') {
        conditions.push(`(
          user_id = $1
          OR (user_id IS NULL AND lower(username) = lower($2))
          OR EXISTS (
            SELECT 1 FROM song_collaborators sc
            WHERE sc.song_id = songs.id AND sc.user_id = $1 AND sc.accepted_at IS NOT NULL
          )
        )`);
        values.push(user.id, user.username);
      }
      else if (table !== 'community_submissions') { conditions.push('user_id = $1'); values.push(user.id); }
    } else if (table === 'community_submissions') conditions.push(`moderation_status = 'visible'`);
    for (const [field, value] of Object.entries(url.searchParams)) {
      if (field.startsWith('eq_') && /^[a-z_]+$/.test(field.slice(3)) && value !== '') { conditions.push(`"${field.slice(3)}" = $${values.length + 1}`); values.push(value); }
    }
    const sort = url.searchParams.get('sort') || '-created_at';
    const sortField = sort.replace(/^-/, '');
    const order = safeSorts.has(sortField) ? sortField : 'created_at';
    const direction = sort.startsWith('-') ? 'DESC' : 'ASC';
    const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get('limit') || 100)));
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`SELECT * FROM ${table} ${where} ORDER BY "${order}" ${direction} LIMIT ${limit}`, values);
    return send(res, 200, { data: rows });
  }
  if (req.method === 'POST') {
    const body = await parseBody(req);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (table === 'bars' || table === 'songs') {
        const data = mapInput(table, body);
        if (table === 'songs') {
          const lockedUser = await requireFreeCrateAllowance(client, user);
          if (data.beat_url) requirePremiumUser(lockedUser);
        }
        data.user_id = user.id;
        data.username = user.username;
        const row = await insertRow(client, table, data);
        let updatedUser = user;
        if (table === 'bars') {
          updatedUser = await updateActivity(client, user.id);
          await awardXp(client, user.id, 5, 'BAR WRITTEN', `bar:${row.id}:created`, { barId: row.id });
          await awardAchievements(client, user.id, updatedUser.xp, updatedUser.total_bars, updatedUser.current_streak);
        }
        await client.query('COMMIT');
        return send(res, 201, row);
      }
      if (table === 'community_submissions') {
        const data = mapInput(table, body);
        data.user_id = user.id; data.author = user.username; data.likes = 0;
        const row = await insertRow(client, table, data);
        await awardXp(client, user.id, 25, 'CONTRIBUTED TO FREE GAME', `community:${row.id}:created`, { submissionId: row.id });
        await client.query('COMMIT');
        return send(res, 201, row);
      }
      if (table === 'beats') {
        requirePremiumUser(await lockCurrentUser(client, user.id));
        const row = await insertRow(client, table, { ...mapInput(table, body), user_id: user.id });
        await client.query('COMMIT');
        return send(res, 201, row);
      }
      if (table === 'community_reports' || table === 'community_blocks') {
        const row = await insertRow(client, table, { ...mapInput(table, body), ...(table === 'community_reports' ? { reporter_id: user.id } : { user_id: user.id }) });
        await client.query('COMMIT');
        return send(res, 201, row);
      }
      throw new HttpError(403, 'This resource is read-only.');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  if ((req.method === 'PATCH' || req.method === 'PUT') && id) {
    requireUuid(id);
    const client = await pool.connect();
    let inTransaction = false;
    try {
      const body = await parseBody(req);
      if (table === 'songs') {
        await client.query('BEGIN');
        inTransaction = true;
      }
      const existing = table === 'songs'
        ? await userCanAccessSong(client, id, user, { edit: true })
        : await userOwns(client, table, id, user);
      if (!existing && table !== 'community_submissions') throw new HttpError(404, 'Record not found.');
      if (table === 'community_submissions' && existing?.user_id !== user.id) throw new HttpError(403, 'You do not own this post.');
      let lockedSong = existing;
      if (table === 'songs') {
        const expectedUpdatedAt = body.expectedUpdatedAt || body.expected_updated_at;
        if (!expectedUpdatedAt) {
          throw new HttpError(428, 'A current crate version is required before saving.');
        }
        lockedSong = (await client.query('SELECT * FROM songs WHERE id = $1 FOR UPDATE', [id])).rows[0];
        const expectedTime = Date.parse(expectedUpdatedAt);
        const currentTime = new Date(lockedSong.updated_at).getTime();
        if (!Number.isFinite(expectedTime)) throw new HttpError(400, 'The crate version is invalid.');
        if (expectedTime !== currentTime) {
          throw new HttpError(409, 'This crate changed before your save completed.', {
            code: 'CRATE_VERSION_CONFLICT',
            currentSong: lockedSong,
          });
        }
      }
      const data = mapInput(table, body);
      if (table === 'songs' && data.beat_url && data.beat_url !== existing.beat_url) {
        requirePremiumUser(await lockCurrentUser(client, user.id));
      }
      if (table === 'songs') {
        data.updated_by = user.id;
        data.updated_by_username = user.username;
      }
      if (table === 'bars' || table === 'songs') delete data.user_id;
      const updated = await updateRow(client, table, id, data);
      if (inTransaction) await client.query('COMMIT');
      return send(res, 200, updated);
    } catch (error) {
      if (inTransaction) await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  if (req.method === 'DELETE' && id) {
    requireUuid(id);
    const client = await pool.connect();
    try {
      const existing = await userOwns(client, table, id, user);
      if (!existing) throw new HttpError(404, 'Record not found.');
      await client.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      return send(res, 200, { success: true });
    } finally { client.release(); }
  }
  throw new HttpError(405, 'Method not allowed.');
};

const serveStatic = async (req, res, pathname) => {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const safe = path.normalize(requested).replace(/^(\.\.(\/|\\|$))+/, '');
  const file = path.join(dist, safe);
  if (!file.startsWith(dist)) return send(res, 403, { error: 'Forbidden.' });
  try {
    const body = await fs.readFile(file);
    const ext = path.extname(file);
    const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
    res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  } catch { send(res, 404, { error: 'Not found.' }); }
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/api/stripe/webhook') await handleStripeWebhook(req, res);
    else if (url.pathname.startsWith('/api/')) await routeApi(req, res, url.pathname, url);
    else await serveStatic(req, res, url.pathname);
  } catch (error) { errorResponse(res, error); }
});

if (billingEnabled) {
  const domain = String(process.env.REPLIT_DOMAINS || '').split(',')[0];
  if (!domain) throw new Error('REPLIT_DOMAINS is required to configure the Stripe webhook.');
  await initializeStripe(`https://${domain}/api/stripe/webhook`);
}

server.listen(port, '0.0.0.0', () => console.log(`Daily Raps web/API server listening on ${port}`));
const shutdown = async () => { await pool.end(); server.close(() => process.exit(0)); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);