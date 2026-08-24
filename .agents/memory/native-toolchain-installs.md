---
name: Native toolchain installs
description: Guidance for running the static web app while its legacy native build dependencies are blocked.
---

For this project, keep the Replit web preview on a dependency-free static server when the legacy Capacitor 6 native toolchain cannot install under the package security policy.

**Why:** The older Capacitor CLI dependency chain requests a blocked vulnerable `tar` package. Updating it just to make the browser preview run would turn a small setup task into a native-stack migration.

**How to apply:** Use the configured static-server workflow for browser work. Treat an iOS/Android build request as a separate dependency-upgrade and native-build verification task.