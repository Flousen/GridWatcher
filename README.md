# Grid Watcher: The Glitch Puzzle

A browser puzzle game about error detection — and secretly about the Hamming code.

**[Play it →](https://flousen.github.io/GridWatcher/)**

## The Puzzle

You monitor a network of **Data Nodes**. Any node can glitch. When it does, every **Sensor** wired to it fires an alarm. Your job: wire the sensors so each node produces a *unique* alarm pattern. That way, when alarms ring, you know exactly which node failed.

With *k* sensors you get 2ᵏ − 1 distinct non-empty patterns. The levels push you toward using all of them.

## Levels

| # | Title | Nodes | Sensors | Notes |
|---|-------|------:|-------:|-------|
| 1 | Binary Basics | 3 | 2 | All 3 patterns used |
| 2 | Pentagon Protocol | 5 | 3 | 5 of 7 patterns |
| 3 | Hamming Grid | 7 | 3 | All 7 — this *is* Hamming(7,4) |
| 4 | Quad Signal | 9 | 4 | 9 of 15 patterns |
| 5 | Dense Mesh | 12 | 4 | 12 of 15 patterns |
| 6 | Extended Hamming | 15 | 4 | All 15 — Hamming(15,11) |

## Controls

- **Click** empty space → place a Sensor (diamond)
- **Click** a Sensor → select it (glows yellow)
- **Click** a Node → connect/disconnect the selected Sensor
- One Sensor can connect to multiple Nodes
- **Right-click** a Sensor → remove it
- **TEST** → run the simulation

## The Math

The puzzle is a concrete model of **Hamming codes**. Each sensor corresponds to a parity-check bit. A node's alarm pattern is its *syndrome* — the unique binary fingerprint that identifies exactly which bit position failed. Level 3 reproduces Hamming(7,4); Level 6 reproduces Hamming(15,11).

## Tech

Single `index.html` file, no dependencies, vanilla Canvas 2D.
