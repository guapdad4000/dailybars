import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT || 5000);
const isDevelopment = process.env.DAILYBARS_ENVIRONMENT !== 'production';
const supabaseUrl = process.env.DAILYBARS_SUPABASE_URL || '';
const supabaseAnonKey = process.env.DAILYBARS_SUPABASE_ANON_KEY || '';
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
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

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
  send(res, status, { error: error.message || 'Request failed' });
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
  if (pathname === '/api/health') return send(res, 200, { ok: true, database: true });
  const user = await authenticate(req);
  const parts = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const resource = parts[0];
  const id = parts[1];
  if (!resource) return send(res, 404, { error: 'API route not found.' });

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
      await client.query(`INSERT INTO song_collaborators (song_id, invite_token, created_by, expires_at) VALUES ($1,$2,$3,$4) ON CONFLICT (invite_token) DO UPDATE SET expires_at = EXCLUDED.expires_at`, [body.songId, String(body.token), user.id, body.expiresAt]);
      return send(res, 201, { success: true });
    } finally { client.release(); }
  }
  if (resource === 'collaborators' && parts[1] === 'join' && req.method === 'POST') {
    const body = await parseBody(req);
    const invite = (await pool.query(`SELECT * FROM song_collaborators WHERE invite_token = $1 AND expires_at > now()`, [String(body.token)])).rows[0];
    if (!invite) throw new HttpError(404, 'Invalid or expired invite link.');
    await pool.query(`INSERT INTO song_collaborators (song_id, user_id, username, role, accepted_at) VALUES ($1,$2,$3,'editor',now()) ON CONFLICT (song_id, user_id) DO NOTHING`, [invite.song_id, user.id, user.username]);
    return send(res, 200, { songId: invite.song_id });
  }
  if (resource === 'collaborators' && parts[1] && req.method === 'GET') {
    requireUuid(parts[1], 'song id');
    const permitted = await pool.query(`SELECT 1 FROM songs s WHERE s.id = $1 AND (s.user_id = $2 OR EXISTS (SELECT 1 FROM song_collaborators sc WHERE sc.song_id = s.id AND sc.user_id = $2))`, [parts[1], user.id]);
    if (!permitted.rowCount) throw new HttpError(403, 'You do not have access to this song.');
    const { rows } = await pool.query(`SELECT user_id, username, role, created_at FROM song_collaborators WHERE song_id = $1 AND user_id IS NOT NULL`, [parts[1]]);
    return send(res, 200, rows);
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
    const body = await parseBody(req);
    const telemetryKey = user.auth_user_id || user.id;
    const { rows } = await pool.query(`
      INSERT INTO premium_usage (user_key, user_id, username, ai_uses, last_ai_use)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (user_key) DO UPDATE SET ai_uses = EXCLUDED.ai_uses, last_ai_use = EXCLUDED.last_ai_use, updated_at = now()
      RETURNING *
    `, [telemetryKey, user.id, user.username, Number(body.ai_uses) || 0, body.last_ai_use || null]);
    return send(res, 200, rows[0]);
  }

  const table = resource;
  if (!/^[a-z_]+$/.test(table) || (!publicTables.has(table) && !ownedTables.has(table) && table !== 'users')) {
    throw new HttpError(404, 'Unknown API resource.');
  }
  if (table === 'users' && req.method !== 'GET') throw new HttpError(403, 'User balances can only be changed by server operations.');
  if (req.method === 'GET') {
    const values = [];
    const conditions = [];
    if (table === 'users') { conditions.push('id = $1'); values.push(user.id); }
    else if (ownedTables.has(table)) {
      if (table === 'bars' || table === 'songs') { conditions.push('(user_id = $1 OR (user_id IS NULL AND lower(username) = lower($2)))'); values.push(user.id, user.username); }
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
    try {
      const existing = await userOwns(client, table, id, user);
      if (!existing && table !== 'community_submissions') throw new HttpError(404, 'Record not found.');
      if (table === 'community_submissions' && existing?.user_id !== user.id) throw new HttpError(403, 'You do not own this post.');
      const data = mapInput(table, await parseBody(req));
      if (table === 'bars' || table === 'songs') delete data.user_id;
      return send(res, 200, await updateRow(client, table, id, data));
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
    if (url.pathname.startsWith('/api/')) await routeApi(req, res, url.pathname, url);
    else await serveStatic(req, res, url.pathname);
  } catch (error) { errorResponse(res, error); }
});

server.listen(port, '0.0.0.0', () => console.log(`Daily Raps web/API server listening on ${port}`));
const shutdown = async () => { await pool.end(); server.close(() => process.exit(0)); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);