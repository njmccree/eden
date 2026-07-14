#!/usr/bin/env bash
# Assemble Eden from ordered source parts into a single playable HTML file.
#   ./build.sh          build dist/eden.html
#   ./build.sh --bump   increment EDEN_BUILD patch version, then build
set -euo pipefail
export LC_ALL=C
cd "$(dirname "$0")"

if [[ "${1:-}" == "--bump" ]]; then
  f=src/parts/02-data.js
  v=$(grep -oE "EDEN_BUILD='[0-9]+\.[0-9]+\.[0-9]+'" "$f" | grep -oE "[0-9]+\.[0-9]+\.[0-9]+")
  IFS=. read -r a b c <<<"$v"
  nv="$a.$b.$((c+1))"
  sed -i.bak "s/EDEN_BUILD='$v'/EDEN_BUILD='$nv'/" "$f" && rm -f "$f.bak"
  echo "EDEN_BUILD $v -> $nv"
fi

parts=(src/parts/[0-9][0-9]-*)
[[ ${#parts[@]} -eq 7 ]] || { echo "expected 7 parts, found ${#parts[@]}" >&2; exit 1; }
mkdir -p dist
cat "${parts[@]}" src/tail.html > dist/eden.html
echo "built dist/eden.html ($(wc -l < dist/eden.html) lines, $(grep -oE "EDEN_BUILD='[^']+'" dist/eden.html | head -1))"
