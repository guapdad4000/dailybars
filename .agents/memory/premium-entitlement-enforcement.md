---
name: Premium entitlement enforcement
description: Rules for keeping Daily Raps paid features secure across web billing, AI, and future native stores.
---

Web Daily Raps Pro is granted only from the application database after a signed Stripe webhook is processed. The server must enforce paid capabilities and free-tier quotas; browser state, local storage, Checkout redirects, and client telemetry are never authorization signals.

**Why:** A browser-only gate lets a free account call the same write APIs directly. A successful Checkout return is also not proof that a subscription is active.

**How to apply:** Keep crate, persistent-beat, Scratch Lab, and AI usage checks at authenticated server boundaries. AI providers must only be callable through the protected server-to-function path. Do not sell native RevenueCat access to these server-protected benefits until a verified RevenueCat server entitlement path is implemented.