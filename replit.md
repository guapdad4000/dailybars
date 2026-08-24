# Daily Raps on Replit

The imported app is a static PWA located in `dailybars/`.

## Run

Use the **Start application** workflow. It serves the app from `dailybars/` on port 5000:

```bash
cd dailybars && python3 -m http.server 5000 --bind 0.0.0.0
```

The browser app loads its UI libraries from CDNs. It connects to the project’s existing external Supabase service for account and data-sync features; those features require that service to be reachable.

Native Capacitor dependencies are retained for iOS/Android builds but are not needed for the Replit web preview.