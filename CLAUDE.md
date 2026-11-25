# Grid Watcher

A browser game that teaches quantum error correction in six short chapters. Static HTML/JS: no build, no npm, no frameworks. See README.md for the learning path.

## Run and check

- Play: open `index.html` directly (file:// works) or `python3 -m http.server 8000`.
- Tests: `scripts/run-tests.sh` (gjs) or open `tests.html`. They must stay green, so state the count in the commit message ("Tests 86/86").
- Visual check: `scripts/shot.sh page.html [W,H]` takes a headless-Firefox screenshot. `scripts/shot-play.sh page.html "js…" [W,H]` runs JS in the page first (drive the level state, then screenshot) and prints any JS errors on the page. Use them after UI changes; tests do not cover `js/ui/` or the chapter pages.

## Code layout and rules

- All scripts are classic `<script>` tags that hang off one global namespace, `window.QEC` (IIFE per file, `'use strict'`). No ES modules, because they break file:// loading.
- `js/core/` holds pure logic with no DOM. Put anything that can be tested here (puzzle rules, decoders, caps and limits) and add tests in `tests/*.test.js`. A new file must be registered in `tests/manifest.js`.
- `js/ui/` holds shared UI: `bites.js` (briefing and level chips via `QEC.ui.chapter`), `progress.js` (localStorage), `canvas.js`, `surface.js`.
- Each chapter is one self-contained HTML file with its game code inline. Shared look lives in `css/theme.css` (colour tokens on `:root`). X = cyan, Z = orange, Y = purple, as in Litinski.
- `ch4-surface.html` and `ch5-threshold.html` are redirect stubs for old links, so leave them.

## Progress storage: keep it compatible

- Key `gridwatcher.progress.v1`. Chapter ids are storage keys, not file numbers: `ch1`, `ch2`, `ch3`, `chains`, `ch4` (= ch5-surface), `ch5` (= ch6-threshold). Never rename them.
- Saved progress from older versions must still resume correctly. Example: old ch1 saves have `{done:true}` and no `level`. When you change level counts or the chapter helper, think through what an existing save does.
- Storage may be missing (private mode), so every access stays wrapped.

## Teaching design (bites)

- Every chapter explains through `QEC.ui.Bites`: short steps, one idea each. Game input is live only while a bite `wait`s for an event (`bites.notify(evt)`) or all bites are read.
- Experience first, name second: a term (syndrome, Hamming code, distance…) is named after the player has done the thing.
- Predictions and check questions are `ask` bites with an `id`. The first answer goes to the local learning log, so keep ids stable.
- When input is locked, the board must look locked and say why. Never ignore a click silently.
- Every control needs a touch equivalent (no right-click on phones).
- Hints and tips must be true for every valid solution, not just the intended one. If the game has a limit (such as a wire cap), the limit must never refuse a correct plan.

## Writing style

- Player-facing text and comments are plain English: short sentences, no jargon before it is introduced. Physics must be honest (see README "The physics, honestly").
- Commit messages: an imperative subject, then a body that says what changed for the player and why.

