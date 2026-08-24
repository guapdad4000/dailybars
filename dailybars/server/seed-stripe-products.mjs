import { getStripeClient } from './stripe-client.mjs';

const LOOKUP_KEY = 'dailybars_pro_monthly';

async function seed() {
  const stripe = await getStripeClient();
  const existing = await stripe.prices.list({ lookup_keys: [LOOKUP_KEY], active: true, limit: 10 });
  if (existing.data.length) {
    console.log(`Daily Raps Pro price already exists: ${existing.data[0].id}`);
    return;
  }

  const product = await stripe.products.create({
    name: 'Daily Raps Pro',
    description: 'Unlimited creative tools, crates, and persistent beat uploads.',
    metadata: { dailybars_plan: 'pro_monthly' },
  });
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: 999,
    recurring: { interval: 'month' },
    lookup_key: LOOKUP_KEY,
    metadata: { dailybars_plan: 'pro_monthly' },
  });
  console.log(`Created Daily Raps Pro: ${product.id} / ${price.id}`);
}

seed().catch((error) => {
  console.error('Unable to seed the Daily Raps Pro product:', error.message);
  process.exitCode = 1;
});