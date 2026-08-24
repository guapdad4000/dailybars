#!/usr/bin/env node
/**
 * Operator-only data migration tool. It never runs during application startup.
 * Supply source credentials through Replit Secrets:
 * SUPABASE_SOURCE_URL and SUPABASE_SOURCE_SERVICE_ROLE_KEY.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const tables = [
  'users', 'bars', 'songs', 'prompts_feelings', 'prompts_settings', 'prompts_objects', 'prompts_smells', 'prompts_vocab',
  'community_submissions', 'community_upvotes', 'community_reports', 'community_blocks',
  'scratch_sessions', 'scratch_layers', 'beats', 'song_collaborators', 'trophies', 'user_trophies',
  'revenuecat_customers', 'premium_usage', 'account_deletion_requests'
];
const promptTables = new Set(['prompts_feelings', 'prompts_settings', 'prompts_objects', 'prompts_smells', 'prompts_vocab']);
const optionalSourceTables = new Set([
  'community_submissions', 'community_upvotes', 'community_reports', 'community_blocks',
  'scratch_sessions', 'scratch_layers', 'beats', 'song_collaborators',
  'revenuecat_customers', 'premium_usage', 'account_deletion_requests'
]);
const [, , command, file = 'migration-export.json'] = process.argv;
const sourceUrl = process.env.SUPABASE_SOURCE_URL?.replace(/\/$/, '');
const sourceKey = process.env.SUPABASE_SOURCE_SERVICE_ROLE_KEY;
const normalizeRow = (table, source) => {
  const row = { ...source };
  if (table === 'songs') {
    row.other_artists = row.other_artists ?? row.otherArtists ?? '';
    delete row.otherArtists;
  }
  if (table === 'beats') {
    if (typeof row.tags === 'string') {
      try {
        const parsed = JSON.parse(row.tags);
        row.tags = Array.isArray(parsed) ? parsed : row.tags.split(',').map(value => value.trim()).filter(Boolean);
      } catch {
        row.tags = row.tags.split(',').map(value => value.trim()).filter(Boolean);
      }
    }
    if (row.embedded_year !== null && row.embedded_year !== undefined && row.embedded_year !== '') {
      const year = Number.parseInt(row.embedded_year, 10);
      row.embedded_year = Number.isInteger(year) ? year : null;
    }
  }
  return row;
};

const usage = () => {
  console.error('Usage: node server/migrate-supabase.mjs export|import|verify [file]');
  process.exit(1);
};
if (!['export', 'import', 'verify'].includes(command)) usage();

const sourceFetch = async (table, options = {}) => {
  if (!sourceUrl || !sourceKey) throw new Error('SUPABASE_SOURCE_URL and SUPABASE_SOURCE_SERVICE_ROLE_KEY must be set as Secrets.');
  const response = await fetch(`${sourceUrl}/rest/v1/${table}?select=*`, {
    ...options,
    headers: { apikey: sourceKey, Authorization: `Bearer ${sourceKey}`, ...(options.headers || {}) }
  });
  if (!response.ok) throw new Error(`Supabase export failed for ${table}: ${response.status} ${await response.text()}`);
  return response.json();
};

if (command === 'export') {
  const data = { exportedAt: new Date().toISOString(), tables: {} };
  for (const table of tables) {
    const rows = [];
    try {
      for (let start = 0;; start += 1000) {
        const page = await sourceFetch(table, { headers: { Range: `${start}-${start + 999}` } });
        rows.push(...page);
        if (page.length < 1000) break;
      }
    } catch (error) {
      if (!optionalSourceTables.has(table) || !/404|42P01|relation/i.test(error.message)) throw error;
      console.warn(`Optional legacy table ${table} is absent; exporting it as empty.`);
    }
    data.tables[table] = rows;
  }
  await fs.writeFile(path.resolve(file), `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  console.log(`Exported ${tables.reduce((count, table) => count + data.tables[table].length, 0)} rows to ${file}`);
  process.exit(0);
}

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be configured by Replit.');
const snapshot = JSON.parse(await fs.readFile(path.resolve(file), 'utf8'));
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } });

try {
  if (command === 'import') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const table of tables) {
        for (const sourceRow of snapshot.tables?.[table] || []) {
          const row = normalizeRow(table, sourceRow);
          const columns = Object.keys(row);
          if (!columns.length) continue;
          const quoted = columns.map(column => `"${column}"`).join(', ');
          const markers = columns.map((_, index) => `$${index + 1}`).join(', ');
          const updates = columns.filter(column => column !== 'id').map(column => `"${column}" = EXCLUDED."${column}"`).join(', ');
          const conflict = promptTables.has(table)
            ? 'ON CONFLICT (value) DO NOTHING'
            : `ON CONFLICT (id) DO UPDATE SET ${updates || 'id = EXCLUDED.id'}`;
          await client.query(`INSERT INTO "${table}" (${quoted}) VALUES (${markers}) ${conflict}`, columns.map(column => row[column]));
        }
      }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
    console.log(`Imported ${file}; rerun "verify" before changing traffic.`);
  } else {
    let failures = 0;
    for (const table of tables) {
      const expected = (snapshot.tables?.[table] || []).length;
      const actual = Number((await pool.query(`SELECT count(*)::int AS count FROM "${table}"`)).rows[0].count);
      const duplicate = Number((await pool.query(`SELECT count(*)::int AS count FROM (SELECT id FROM "${table}" GROUP BY id HAVING count(*) > 1) d`)).rows[0].count);
      console.log(`${table}: source=${expected} target=${actual} duplicate_ids=${duplicate}`);
      if (actual < expected || duplicate) failures++;
    }
    const relationships = {
      bars_without_owner: `SELECT count(*)::int AS count FROM bars b LEFT JOIN users u ON u.id = b.user_id WHERE b.user_id IS NOT NULL AND u.id IS NULL`,
      songs_without_owner: `SELECT count(*)::int AS count FROM songs s LEFT JOIN users u ON u.id = s.user_id WHERE s.user_id IS NOT NULL AND u.id IS NULL`,
      layers_without_session: `SELECT count(*)::int AS count FROM scratch_layers l LEFT JOIN scratch_sessions s ON s.id = l.session_id WHERE s.id IS NULL`,
      trophies_without_user: `SELECT count(*)::int AS count FROM user_trophies ut LEFT JOIN users u ON u.id = ut.user_id WHERE u.id IS NULL`,
      trophies_without_definition: `SELECT count(*)::int AS count FROM user_trophies ut LEFT JOIN trophies t ON t.id = ut.trophy_id WHERE t.id IS NULL`
    };
    for (const [name, sql] of Object.entries(relationships)) {
      const count = Number((await pool.query(sql)).rows[0].count);
      console.log(`${name}: ${count}`);
      if (count) failures++;
    }
    if (failures) process.exitCode = 2;
  }
} finally {
  await pool.end();
}