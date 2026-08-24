#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../dailybars"

# Reconcile package.json/package-lock.json before any Node script imports a
# dependency introduced by the merge.
npm install --no-audit --no-fund --include=dev

DAILYBARS_ENVIRONMENT=development npm run db:setup
DAILYBARS_ENVIRONMENT=development npm run build

echo "Daily Raps dependencies, development schema, and build are ready."