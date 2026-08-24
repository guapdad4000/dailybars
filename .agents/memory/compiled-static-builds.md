---
name: Compiled static builds
description: Scope isolation needed when compiling multiple classic JavaScript files for a static page.
---

Compiled classic scripts must be isolated per file when source files share top-level const or let names. A Babel JSX transform alone does not provide module scope.

**Why:** Browsers share the top-level lexical environment across classic script tags, so duplicate declarations can stop later scripts and leave the app blank.

**How to apply:** Keep cross-file APIs on window, wrap each generated file in an IIFE, and load generated files in their dependency order.