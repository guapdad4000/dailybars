---
name: Visual regression baselines
description: How to handle visual snapshots when reconciling an upstream UI change.
---

Refresh visual baselines only after comparing the failed image with the current rendered UI and confirming the difference is intentional.

**Why:** Upstream reconciliation can change a complete surface, such as authentication copy and branding, while leaving functional behavior correct; blindly accepting snapshots can hide regressions.

**How to apply:** Run the visual suite normally first, inspect representative diffs, refresh only the reviewed intentional changes, then rerun in normal comparison mode.