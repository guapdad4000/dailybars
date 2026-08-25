import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const sourceUrl = new URL('../supabase/functions/dailybars-ai/index.ts', import.meta.url);
const sourcePath = fileURLToPath(sourceUrl);
const source = await fs.readFile(sourcePath, 'utf8');

const bundle = await build({
  bundle: true,
  format: 'esm',
  platform: 'browser',
  plugins: [{
    name: 'supabase-edge-test-stub',
    setup(builder) {
      builder.onResolve(
        { filter: /^https:\/\/esm\.sh\/@supabase\/supabase-js@2$/ },
        () => ({ path: 'supabase-js', namespace: 'test-stub' }),
      );
      builder.onLoad(
        { filter: /.*/, namespace: 'test-stub' },
        () => ({
          contents: `
            export const createClient = () => ({
              auth: {
                getUser: async () => ({
                  data: { user: { id: 'edge-function-test-user' } },
                  error: null
                })
              }
            });
          `,
          loader: 'js',
        }),
      );
    },
  }],
  stdin: {
    contents: source,
    loader: 'ts',
    resolveDir: path.dirname(sourcePath),
    sourcefile: sourcePath,
  },
  write: false,
});

const environment = {
  DAILYBARS_AI_PROXY_SECRET: 'edge-function-test-secret',
  SUPABASE_ANON_KEY: 'edge-function-test-anon-key',
  SUPABASE_URL: 'https://example.supabase.co',
};
const previousDeno = globalThis.Deno;
let handler;

globalThis.Deno = {
  env: {
    get(key) {
      return environment[key];
    },
  },
  serve(candidate) {
    handler = candidate;
  },
};

try {
  const encoded = Buffer.from(bundle.outputFiles[0].text).toString('base64');
  await import(`data:text/javascript;base64,${encoded}`);
  assert.equal(typeof handler, 'function', 'Edge Function must register a Deno.serve handler.');

  const preflight = await handler(new Request('https://edge.test', { method: 'OPTIONS' }));
  assert.equal(preflight.status, 200);
  assert.match(
    preflight.headers.get('access-control-allow-headers') || '',
    /x-dailybars-proxy-secret/i,
  );

  const unsupported = await handler(new Request('https://edge.test', { method: 'GET' }));
  assert.equal(unsupported.status, 405);

  const missingSecret = await handler(new Request('https://edge.test', {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-user-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ prompt: 'Write one bar.' }),
  }));
  assert.equal(missingSecret.status, 403);

  const missingAuth = await handler(new Request('https://edge.test', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-dailybars-proxy-secret': environment.DAILYBARS_AI_PROXY_SECRET,
    },
    body: JSON.stringify({ prompt: 'Write one bar.' }),
  }));
  assert.equal(missingAuth.status, 401);

  const noProvider = await handler(new Request('https://edge.test', {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-user-token',
      'content-type': 'application/json',
      'x-dailybars-proxy-secret': environment.DAILYBARS_AI_PROXY_SECRET,
    },
    body: JSON.stringify({ prompt: 'Write one bar.' }),
  }));
  assert.equal(noProvider.status, 501);

  console.log('Edge Function smoke test passed: handler and security gates are valid.');
} finally {
  if (previousDeno === undefined) delete globalThis.Deno;
  else globalThis.Deno = previousDeno;
}