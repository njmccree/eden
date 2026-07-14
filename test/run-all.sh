#!/usr/bin/env bash
# Build, then run every check. Nonzero exit on any failure.
set -euo pipefail
cd "$(dirname "$0")/.."
./build.sh
for t in test/parse-check.mjs test/sim-ch3-traverse.mjs test/sim-ch4-balance.mjs test/sim-archive-fuzz.mjs; do
  echo; echo "== $t"
  node "$t"
done
echo; echo "ALL CHECKS PASSED"
