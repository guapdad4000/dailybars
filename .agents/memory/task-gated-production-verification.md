---
name: Task-gated production verification
description: How to stage releases that require live verification while their code is isolated in an active Replit task.
---

Replit Publish deploys the project's main version, not the isolated workspace of an active task. For releases that require production verification, merge a fail-closed build first and activate the customer-facing feature only from the main version after the live readiness checks pass.

**Why:** Repeated successful publishes during an active task redeployed the older main version, so production could not expose the task's readiness probe or release code.

**How to apply:** Keep all release and payment gates disabled when submitting the task for review. Apply the task changes to main, publish and verify the live prerequisites, then enable the gates together and perform the final production checks.

For build-time release flags, a successful publish and values shown in project-level production variables are not proof that the deployment received them. Treat the publicly served configuration as authoritative.

**Why:** Paired flags reported as enabled in project configuration, followed by a successful publish, still produced a live bundle with both flags disabled.

**How to apply:** Configure build-time flags in the deployment's Publish settings, then fetch the public generated configuration before creating any Checkout session. If it does not show the paired enabled state, restore both flags to false immediately.

An isolated task workspace cannot synchronize its commits directly into the project-main Repl: the main remote is readable through refreshed Publish refs, but non-interactive push is denied.

**Why:** Merging the latest project-main Publish history into the task branch succeeded, while the subsequent authenticated fast-forward push to the main Repl was rejected by the platform boundary.

**How to apply:** Finish and validate the implementation fail-closed, move it through Ready and Apply changes to main, then perform production activation and live verification from the main version as a separate release step.

When billing is enabled, StripeSync migrations, managed-webhook setup, and backfill run before the HTTP server begins listening. Replit may report transient health-check failures during that startup window even when the deployment becomes healthy.

**Why:** The first activated production start took several seconds to finish StripeSync initialization, producing temporary 500 health checks before the server logged that it was listening; steady-state health and logs were clean afterward.

**How to apply:** Evaluate billing deployments after the server-listening log appears. Treat errors after that point as actionable, but do not roll back solely because of pre-listen health-check retries when the deployment subsequently becomes healthy.