#!/usr/bin/env bash
# Screenshot a page with headless Firefox:  scripts/shot.sh ch3-repetition.html [WIDTH,HEIGHT] [OUT.png]
# Output goes to ~/snap/firefox/common (a folder the Firefox snap is allowed to write to).
set -euo pipefail
cd "$(dirname "$0")/.."
page="${1:?page}"; size="${2:-1200,900}"
dir="$HOME/snap/firefox/common/gw-shot"; mkdir -p "$dir/prof"
out="${3:-$dir/$(basename "${page%%[?#]*}" .html).png}"
timeout 60 firefox --headless --no-remote --profile "$dir/prof" --window-size="$size" \
  --screenshot "$out" "file://$PWD/$page" >/dev/null 2>&1
echo "$out"
