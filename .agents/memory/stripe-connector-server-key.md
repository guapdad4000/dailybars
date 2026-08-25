---
name: Stripe connection server credentials
description: Daily Raps Stripe connector behavior when the attached connection lacks server-side credentials.
---

The attached Stripe connector must expose a server `secret_key` through Replit’s connector API before Daily Raps billing can be seeded or enabled. A connection can report `healthy` and `added` while still returning no server settings, and `npm run stripe:seed` is the authoritative verification.

**Why:** The application deliberately refuses browser keys and standalone client configuration so Checkout, webhooks, and entitlement updates remain server-authoritative.

**How to apply:** Run `npm run stripe:seed` from `dailybars/` before publishing or setting the release flags. If it reports that the connected account lacks a server secret, reconfigure the exact attached Stripe/Integrated Payments connection; do not enable billing or substitute a publishable key.