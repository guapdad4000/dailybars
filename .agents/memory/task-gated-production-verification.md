---
name: Task-gated production verification
description: How to stage releases that require live verification while their code is isolated in an active Replit task.
---

Replit Publish deploys the project's main version, not the isolated workspace of an active task. For releases that require production verification, merge a fail-closed build first and activate the customer-facing feature only from the main version after the live readiness checks pass.

**Why:** Repeated successful publishes during an active task redeployed the older main version, so production could not expose the task's readiness probe or release code.

**How to apply:** Keep all release and payment gates disabled when submitting the task for review. Apply the task changes to main, publish and verify the live prerequisites, then enable the gates together and perform the final production checks.