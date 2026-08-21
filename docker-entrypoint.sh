#!/usr/bin/env bash
set -euo pipefail
npm run migration:run
exec node dist/main.js
