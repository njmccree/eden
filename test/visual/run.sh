#!/usr/bin/env bash
# Headless screenshot QA. Skips (exit 0) when playwright or its browser is
# missing so run-all.sh stays usable on machines without a browser install.
# Pass --require to fail instead of skip.
set -euo pipefail
cd "$(dirname "$0")/../.."

REQUIRE=0
[ "${1:-}" = "--require" ] && REQUIRE=1

skip() {
  echo "-- visual: SKIPPED ($1)"
  [ "$REQUIRE" = 1 ] && exit 1
  exit 0
}

NODE_PATH="$(npm root -g 2>/dev/null || true)"
export NODE_PATH
node -e "require('playwright')" 2>/dev/null || skip "playwright not installed"
node -e "
const {chromium}=require('playwright');
if(!require('fs').existsSync(chromium.executablePath()))process.exit(1);
" 2>/dev/null || skip "chromium not installed for this playwright version"

[ -f dist/eden.html ] || ./build.sh
exec node test/visual/shots.mjs
