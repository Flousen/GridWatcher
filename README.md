# Grid Watcher

Learn quantum error correction by playing. Seven short browser chapters, one idea each, explained in bite-sized steps.

**[Play it →](https://flousen.github.io/GridWatcher/)**

## Learning path

| # | Chapter | The one idea | You play… |
|---|---------|--------------|-----------|
| 1 | Glitch Puzzle | A *syndrome* pinpoints an error without reading the data | Learn the controls step by step, wire sensors to a row of nodes so every node has a unique alarm pattern (Hamming codes), use each wiring to locate glitches from the alarm alone, then say how many nodes three sensors could tell apart |
| 2 | Two Kinds of Glitch | Qubits suffer bit flips (X), phase flips (Z) and both (Y) — and can't be peeked at | Undo X, Z and Y glitches on a qubit arrow and practise as long as you like (predict what Z and Y do to \|0⟩ first); then a mixed level where only one-move fixes count; measure until both answers have shown up, then try (and fail) to undo the collapse |
| 3 | Ask, Don't Look | Parity checks locate errors; a code's *distance* limits how many | Fix hidden errors in the repetition code using only the checkers, until an unannounced pair of glitches fools you; then pick the smallest code that is sure to survive a spec of up to 1–3 glitches |
| 4 | From Row to Square | Phase flips need their own checks; X- and Z-checks may share 0 or 2 qubits, never 1, so both kinds only fit on a grid | Fix Z glitches with phase checkers on Chapter 3's row; predict, then see two checkers that share one qubit turn each other into coin tosses; in a 2×2 square, find the one cyan checker that clashes with nothing (all four qubits); play that square, the smallest surface code, which spots every single glitch but cannot fix it (distance 2) |
| 5 | Surface Code | X- and Z-checks on a grid; degeneracy; logical errors | Decode a distance-3 surface code by hand (left click = X, right click = Z, both = Y); try both fixes of a degenerate glitch; with two glitches, score against a minimum-weight decoder |
| 6 | Threshold Lab | Below the threshold, bigger codes win; above it, they lose | Roll single shots and count the glitched qubits (≈ n·p), compare sizes at the same p with 100-shot batches, bet which distance wins at low and high p, run Monte Carlo sweeps for d = 3, 5, 7, find the crossing, and advise two labs |
| 7 | Game of Surface Codes | You compute with protected qubits by asking parity questions between them (*lattice surgery*), and every question costs tiles and time steps | Zoom out from a Chapter 5 patch to a tile whose edges carry its X and Z; glue two tiles and see their reads agree (entanglement); join many edges with one hallway in 1 step; place the helper tile that makes a CNOT from two glues, tested on all inputs; trade tiles against steps (turn or widen) and design your own layout; pick the smallest code distance that keeps your plan safe, from your own Chapter 6 model. Bonus: a magic state and the factories that set the pace |

Progress is stored in the browser (`localStorage`); if storage is blocked the game simply forgets.

**Learning log.** Predictions, short check questions and in-game decisions record the player's *first* answer (right or wrong) in the same browser storage. The map shows it under *Your learning log*, with a button to copy it as text — useful as embedded assessment in playtests. Nothing is ever sent anywhere; sharing it is the player's choice.

## Run it

No build, no dependencies. Open `index.html` in a browser — double-clicking works (all scripts are classic `<script>` tags), or serve the folder:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Tests

The physics and puzzle logic lives in `js/core/` and is tested independently from the drawing code.

- **Browser:** open `tests.html` — green means everything passes.
- **Terminal:** `scripts/run-tests.sh` (needs `gjs`, GNOME's JavaScript shell, preinstalled on most Linux desktops).

What's covered: Pauli algebra; Hamming puzzle checks; the repetition code; rotated surface codes for d = 3, 5, 7 (check counts and weights, commutation, logical operators, every single error detected, degeneracy, which single errors have a syndrome of their own, logical errors); decoders (lookup table, greedy and exact minimum-weight matching — including "corrects every error on ≤ (d−1)/2 qubits" checked exhaustively); the repetition code's distance limit behind Chapter 3's PICK A SIZE (every error on ≤ ⌊(n−1)/2⌋ qubits fixed, every heavier one a logical error); locating a glitch from a Hamming wiring, and a wire cap that never refuses a valid wiring; Chapter 4's claims (the clash rule matches the Pauli algebra, no cyan slot on a row is clash-free, all four qubits is the only clash-free cyan checker in the square, the phase row, and the square: every single glitch lights a tile but no one-flip fix is sure, distance 2); the threshold simulation (bigger codes win at low noise and lose at high noise); and Chapter 7: a stabilizer simulator (Bell pairs after a Z·Z measurement, certain and random outcomes), the lattice-surgery board (edge types, glue, hallways of any length, the Y rule, moves, turns, widening, costs, questions that may or may not share a step), the CNOT recipe (XOR on all inputs and an entangled pair on the in-between input; plans that secretly read c fail), every job of every level reachable within its stated cost, and the cost model (Litinski's Eq. 11 reproduced, factories).

`scripts/shot.sh` and `scripts/shot-play.sh` take headless-Firefox screenshots of a page (optionally after running some JS in it) for visual checks.

## Layout

```
index.html                 learning map
ch1-hamming.html … ch7-surgery.html     (ch4-chains, ch4-surface, ch5-threshold: redirects for old links)
css/theme.css              shared neon theme
js/core/                   pure logic, tested: rng, pauli, codes, decoder, sim, hamming, checks (Chapter 4's clash rule),
                           stab, tiles, surgery, budget (Chapter 7: stabilizer simulator, board rules, levels, costs)
js/ui/                     bites (step-by-step explanations), progress, canvas + surface drawing
tests.html, tests/         test runner (browser + gjs) and test files
```

## The physics, honestly

Errors are tracked as Pauli operators in binary (x, z) form — exactly how real QEC software does it, not an analogy. Chapter 2's arrow is the X–Z plane of the Bloch sphere, where X, Z and Y act as mirrors and a half turn. Chapter 6 uses the *code-capacity* noise model (independent bit flips, perfect checks) and an exact minimum-weight matching decoder for small numbers of lit checks (greedy beyond that), giving a threshold of about 10%; with realistic noisy checks it is about 1%, which the game says.

Chapter 7 simulates the protected qubits exactly, at the logical level, with a stabilizer tableau (the same bits-per-qubit trick that makes such circuits easy for normal computers; magic states break it, which the bonus level says). Its rules and costs follow Litinski. Simplified and said in the game: a turn is one action, Y needs a widened patch, each patch answers one question per step, fix-ups after random outcomes are done by software, and level 6 uses Chapter 6's perfect-check model (one round of checks per step, a measured trend extended beyond d = 7) rather than realistic noisy checks.

Based in part on D. Litinski, *A Game of Surface Codes: Large-Scale Quantum Computing with Lattice Surgery*, Quantum 3, 128 (2019).
