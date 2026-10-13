#!/usr/bin/env bash
# Screenshot a page after running some JS in it (to inspect mid-game states):
#   scripts/shot-play.sh ch3-repetition.html "bites.advance(); glitch();" [WIDTH,HEIGHT]
# Makes a temporary copy next to the page (so relative paths keep working) and removes it afterwards.
set -euo pipefail
cd "$(dirname "$0")/.."
page="$1"; js="$2"; size="${3:-1200,900}"
tmp=".shot-$(basename "$page")"
python3 - "$page" "$tmp" "$js" <<'PY'
import sys
src, dst, js = sys.argv[1:4]
s = open(src).read()
inj = "<style>*{transition:none!important;animation:none!important}</style><script>try {" + js + "} catch (e) { document.body.insertAdjacentText('afterbegin', 'SHOT ERROR: ' + e); }</script>\n</body>"
catcher = "<script>window.__errs = []; addEventListener('error', e => __errs.push(e.message + ' @' + e.lineno));</script>"
report = "<script>setTimeout(() => { if (__errs.length) document.body.insertAdjacentHTML('afterbegin', '<pre style=\"background:#600;color:#fff;padding:8px\">JS ERRORS: ' + __errs.join('\\n') + '</pre>'); }, 0);</script>"
s = s.replace("<head>", "<head>" + catcher, 1)
open(dst, 'w').write(s.replace("</body>", inj.replace("</body>", report + "</body>")))
PY
out="$(scripts/shot.sh "$tmp" "$size" "$HOME/snap/firefox/common/gw-shot/play-$(basename "$page" .html).png")"
rm -f "$tmp"
echo "$out"
