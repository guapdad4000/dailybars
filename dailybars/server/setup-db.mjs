import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const root = path.dirname(fileURLToPath(import.meta.url));
const schema = await fs.readFile(path.join(root, 'schema.sql'), 'utf8');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to apply the development schema.');
}

const client = new Client({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
});
await client.connect();
try {
  await client.query(schema);
  console.log('Daily Raps canonical schema is ready.');
} finally {
  await client.end();
}