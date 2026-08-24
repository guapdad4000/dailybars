# Daily Raps on Replit

Daily Raps serves its compiled PWA and same-origin Node API from `dailybars/`.

## Run

Use the **Start application** workflow. It creates the browser build and starts
the combined static/API server on port 5000:

```bash
cd dailybars && DAILYBARS_ENVIRONMENT=development npm run build && DAILYBARS_ENVIRONMENT=development node server/server.mjs
```

The Replit PostgreSQL database is the canonical source for application data and
XP accounting. The retained external Supabase service is used only for Auth,
managed audio storage, and the existing AI function. `DATABASE_URL`,
`DAILYBARS_SUPABASE_URL`, and `DAILYBARS_SUPABASE_ANON_KEY` are server-side
configuration; never put service-role credentials in browser config. Production
schema changes are applied by Replit Publish after its database-diff review.

Native Capacitor dependencies are retained for iOS/Android builds but are not needed for the Replit web preview.

## QA access

On the Replit preview, use **ENTER DEV QA ACCOUNT** on the sign-in screen. This creates a local-only QA session for the `qa` user and does not require a password or Supabase account. The control is hidden on non-development hosts.