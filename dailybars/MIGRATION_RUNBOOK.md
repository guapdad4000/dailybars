# Native PostgreSQL migration runbook

Daily Raps application data lives in Replit PostgreSQL. Supabase Auth and
managed audio storage remain in place. Do not run a production cutover until an
operator has reviewed a source export and explicitly approved it.

## Prepare

1. Make a read-only backup/export from Supabase using the source project’s
   service-role credentials stored only as `SUPABASE_SOURCE_URL` and
   `SUPABASE_SOURCE_SERVICE_ROLE_KEY` Replit Secrets.
2. Apply `server/schema.sql` to development with `npm run db:setup`. Production
   schema changes must be reviewed and applied through Replit Publish; startup
   never performs production DDL.
3. Run `node server/migrate-supabase.mjs export migration-export.json`. Keep the
   export outside source control because it can contain user data.

## Import and verify

Run `node server/migrate-supabase.mjs import migration-export.json`, then
`node server/migrate-supabase.mjs verify migration-export.json`.

The importer preserves identifiers and is safe to rerun: each stable `id` is
upserted. Verification reports every source/target row count and duplicate
identifier. Before any traffic cutover, additionally spot-check foreign keys:
bars/songs/scratch sessions must have valid owners; layers must have sessions;
and user trophies, votes, reports, blocks, and collaborators must reference
existing parent rows.

## Cutover and rollback

Keep the source Supabase data read-only and retain the export during the
validation window. If verification, ownership checks, or user acceptance fails,
route the browser back to the prior static Supabase build and stop new native
writes. Do **not** merge data both ways. Fix the import, recreate the native
database from the reviewed source export, verify again, then obtain a fresh
operator approval before retrying cutover.