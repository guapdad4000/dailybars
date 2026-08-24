# Daily Raps on Replit

The imported app is a static PWA located in `dailybars/`.

## Run

Use the **Start application** workflow. It creates the production browser build and serves `dailybars/dist/` on port 5000:

```bash
cd dailybars && npm run build && python3 -m http.server 5000 --bind 0.0.0.0 --directory dist
```

The production browser build bundles its UI libraries locally. It connects to the project’s existing external Supabase service for account and data-sync features; those features require that service to be reachable.

Native Capacitor dependencies are retained for iOS/Android builds but are not needed for the Replit web preview.

## QA access

On the Replit preview, use **ENTER DEV QA ACCOUNT** on the sign-in screen. This creates a local-only QA session for the `qa` user and does not require a password or Supabase account. The control is hidden on non-development hosts.