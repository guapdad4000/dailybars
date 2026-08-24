#!/usr/bin/env bash
set -euo pipefail

# The Replit preview is a static site served from dailybars/.
# Keep this hook fast and avoid the legacy Capacitor dependency path, which is
# not required for browser previews.
test -f dailybars/index.html
test -f dailybars/js/app-views.js

echo "Static preview is ready for workflow reconciliation."