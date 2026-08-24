---
name: Preview-only QA access
description: How to keep local and Replit-preview QA affordances inaccessible from published environments.
---

QA-only feature access must require both the existing preview-host check and the explicit QA-account identity.

**Why:** The static production build pipeline labels its bundle as production even when it is served through a local or Replit preview. Build environment alone cannot distinguish a safe QA preview from a published app.

**How to apply:** Reuse the hostname-based preview guard for any QA-only capability, then combine it with the QA user marker. Do not grant access based on the account marker alone, and do not use the static build environment label as the preview boundary.