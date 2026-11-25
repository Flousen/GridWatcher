// Hand-picked puzzles for Chapter 4 (CHAINS): X glitches on a distance-5 surface code,
// where only the Z-checks are in play. Cells are [row, column] on the 5×5 grid.
//
// Levels run single → pair → longer chain → edge → "quiet but lost". Every set promises something
// about its syndrome and its shortest explanation;
// tests/chains.test.js checks each promise, because a puzzle whose "fewest flips" answer is wrong
// teaches the opposite of what it should.
(function (QEC) {
  'use strict';
  const d = 5;

  QEC.chains = {
    d,
    // One glitch inside the grid: exactly 2 tiles light up, and they share exactly this qubit.
    single: [[1, 1], [1, 2], [1, 3], [2, 1], [2, 2], [2, 3], [3, 1], [3, 2], [3, 3]].map(c => [c]),
    // Two neighbours: the tile between them sees both flips and stays dark; only the 2 ends light.
    pair: [
      [[1, 1], [1, 2]], [[1, 1], [2, 1]], [[1, 2], [1, 3]], [[1, 2], [2, 2]], [[1, 3], [2, 3]],
      [[2, 1], [2, 2]], [[2, 1], [3, 1]], [[2, 2], [2, 3]], [[2, 2], [3, 2]], [[2, 3], [3, 3]],
      [[3, 1], [3, 2]], [[3, 2], [3, 3]],
    ],
    // Three in a row: still only 2 lit tiles, and no fix with fewer than 3 flips exists.
    // (A bent chain like (1,1)(1,2)(2,2) would NOT do: it has a 1-flip explanation.)
    run: [[[1, 1], [1, 2], [1, 3]], [[2, 1], [2, 2], [2, 3]], [[3, 1], [3, 2], [3, 3]]],
    // Next to the top or bottom edge (which has no Z-checks): 1 lit tile, the chain runs off the edge.
    edge: [[0, 1], [0, 2], [0, 3], [4, 1], [4, 2], [4, 3]].map(c => [c]),
    // Two glitches hanging off an edge: 1 lit tile, and the fewest-flips fix is right.
    shortWins: [1, 2, 3].map(c => [[0, c], [1, c]]),
    // Three glitches hanging off an edge: 1 lit tile, and the fewest-flips fix (2 flips to the
    // far edge) completes a column — a logical error that even the best decoder makes.
    longWins: [1, 2, 3].map(c => [[0, c], [1, c], [2, c]]),
  };

  QEC.chains.qubits = cells => cells.map(([r, c]) => r * d + c);
})(window.QEC = window.QEC || {});
