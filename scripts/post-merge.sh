#!/usr/bin/env bash
set -euo pipefail

# Apply the checked-in native schema to the development database. Production
# schema changes are handled only by Replit's Publish flow.
test -f dailybars/index.html
test -f dailybars/js/app-views.js
npm --prefix dailybars run db:setup

echo "Native database schema is ready for workflow reconciliation."