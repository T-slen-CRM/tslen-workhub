#!/usr/bin/env bash
set -euo pipefail
if [ "${MODE:-}" != "DEV" ]; then
  npm run migration:run
fi
exec node dist/main.js
