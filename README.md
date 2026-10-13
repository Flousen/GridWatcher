# Grid Watcher

Learn quantum error correction by playing. Five short browser chapters, one idea each, explained in bite-sized steps.

**[Play it →](https://flousen.github.io/GridWatcher/)**

## Learning path

| # | Chapter | The one idea | You play… |
|---|---------|--------------|-----------|
| 1 | Glitch Puzzle | A *syndrome* pinpoints an error without reading the data | Wire sensors so every node has a unique alarm pattern (Hamming codes) |
| 2 | Two Kinds of Glitch | Qubits suffer bit flips (X), phase flips (Z) and both (Y) — and can't be peeked at | Undo glitches on a qubit arrow; measure and watch it collapse |
| 3 | Ask, Don't Look | Parity checks locate errors; a code's *distance* limits how many | Fix hidden errors in the repetition code using only the checkers |
| 4 | Surface Code | X- and Z-checks on a grid; degeneracy; logical errors | Decode a distance-3 surface code by hand |
| 5 | Threshold Lab | Below the threshold, bigger codes win; above it, they lose | Run Monte Carlo sweeps for d = 3, 5, 7 and find the crossing |
| 6 | *Game of Surface Codes* | Lattice surgery with patches as tiles (Litinski 2019) | coming next |

Progress is stored in the browser (`localStorage`); if storage is blocked the game simply forgets.

## Run it

No build, no dependencies. Open `index.html` in a browser — double-clicking works (all scripts are classic `<script>` tags), or serve the folder:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Tests

The physics and puzzle logic lives in `js/core/` and is tested independently from the drawing code.

- **Browser:** open `tests.html` — green means everything passes.
- **Terminal:** `scripts/run-tests.sh` (needs `gjs`, GNOME's JavaScript shell, preinstalled on most Linux desktops).

What's covered: Pauli algebra; Hamming puzzle checks; the repetition code; rotated surface codes for d = 3, 5, 7 (check counts and weights, commutation, logical operators, every single error detected, degeneracy, logical errors); decoders (lookup table, greedy and exact minimum-weight matching — including "corrects every error on ≤ (d−1)/2 qubits" checked exhaustively); and the threshold simulation (bigger codes win at low noise and lose at high noise).

`scripts/shot.sh` and `scripts/shot-play.sh` take headless-Firefox screenshots of a page (optionally after running some JS in it) for visual checks.

## Layout

```
index.html                 learning map
ch1-hamming.html … ch5-threshold.html
css/theme.css              shared neon theme
js/core/                   pure logic, tested: rng, pauli, codes, decoder, sim, hamming
js/ui/                     bites (step-by-step explanations), progress, canvas + surface drawing
tests.html, tests/         test runner (browser + gjs) and test files
ideen/                     earlier prototypes (Quantum Defender, surface code demo)
```

## The physics, honestly

Errors are tracked as Pauli operators in binary (x, z) form — exactly how real QEC software does it, not an analogy. Chapter 2's arrow is the X–Z plane of the Bloch sphere, where X, Z and Y act as mirrors and a half turn. Chapter 5 uses the *code-capacity* noise model (independent bit flips, perfect checks) and an exact minimum-weight matching decoder for small numbers of lit checks (greedy beyond that), giving a threshold of about 10%; with realistic noisy checks it is about 1%, which the game says.

Based in part on D. Litinski, *A Game of Surface Codes: Large-Scale Quantum Computing with Lattice Surgery*, Quantum 3, 128 (2019).
