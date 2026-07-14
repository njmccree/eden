#!/bin/bash
# SessionStart hook (Claude Code on the web): build + fast checks so every
# remote session starts from a known-green tree. The playwright visual stage
# is NOT run here (slow; test/visual/run.sh auto-skips when unavailable) —
# we only report whether it's usable. Never download browsers in this hook.
set -uo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

LOG="$(mktemp)"
if ./build.sh >"$LOG" 2>&1 \
   && node test/parse-check.mjs >>"$LOG" 2>&1 \
   && node test/sim-ch3-traverse.mjs >>"$LOG" 2>&1 \
   && node test/sim-ch4-balance.mjs >>"$LOG" 2>&1 \
   && node test/sim-archive-fuzz.mjs >>"$LOG" 2>&1; then
  echo "eden: $(head -1 "$LOG") — parse-check + 3 balance sims green"
else
  echo "eden: STARTUP CHECKS FAILED — tree is not green, output follows:"
  cat "$LOG"
fi

if NODE_PATH="$(npm root -g 2>/dev/null || true)" node -e "
const {chromium}=require('playwright');
process.exit(require('fs').existsSync(chromium.executablePath())?0:1);
" 2>/dev/null; then
  echo "eden: visual QA available (playwright + chromium)"
else
  echo "eden: visual QA unavailable — test/visual/run.sh will auto-skip"
fi

exit 0
