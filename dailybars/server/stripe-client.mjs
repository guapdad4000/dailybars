import Stripe from 'stripe';
import { StripeSync, runMigrations } from 'stripe-replit-sync';

const connectionUrl = 'https://';

async function getStripeCredentials() {
  const environmentSecret = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (environmentSecret) return { secretKey: environmentSecret };

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const identity = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : '';

  if (!hostname || !identity) {
    throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY through Replit Secrets before enabling billing.');
  }

  const response = await fetch(
    `${connectionUrl}${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { accept: 'application/json', 'x-replit-token': identity },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) throw new Error(`Unable to load the Stripe connection (${response.status}).`);

  const data = await response.json();
  const settings = data.items?.[0]?.settings;
  if (!settings?.secret_key) {
    throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY through Replit Secrets before enabling billing.');
  }
  return { secretKey: settings.secret_key };
}

export async function getStripeClient() {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

export async function getStripeSync() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for Stripe synchronization.');
  const { secretKey } = await getStripeCredentials();
  return new StripeSync({
    poolConfig: { connectionString: process.env.DATABASE_URL },
    stripeSecretKey: secretKey,
  });
}

export async function initializeStripe(webhookUrl) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for Stripe synchronization.');
  await runMigrations({ databaseUrl: process.env.DATABASE_URL, schema: 'stripe' });
  const sync = await getStripeSync();
  await sync.findOrCreateManagedWebhook(webhookUrl);
  await sync.syncBackfill();
}
