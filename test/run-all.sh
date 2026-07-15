#!/usr/bin/env bash
# Build, then run every check. Nonzero exit on any failure.
set -euo pipefail
cd "$(dirname "$0")/.."
./build.sh
for t in test/parse-check.mjs test/sim-ch3-traverse.mjs test/sim-ch4-balance.mjs test/sim-ch5-night.mjs test/sim-ch6-decide.mjs test/sim-ch6-race.mjs test/sim-archive-fuzz.mjs; do
  echo; echo "== $t"
  node "$t"
done
echo; echo "== test/visual (headless screenshots; skips if playwright absent)"
test/visual/run.sh
echo; echo "ALL CHECKS PASSED"
