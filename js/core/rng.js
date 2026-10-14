// Seeded random numbers, so simulations and tests are reproducible.
(function (QEC) {
  'use strict';

  // mulberry32: tiny, fast, good enough for games and Monte Carlo demos.
  function makeRng(seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    const rng = function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    rng.int = n => Math.floor(rng() * n);
    rng.pick = arr => arr[rng.int(arr.length)];
    // k distinct indices out of 0..n-1
    rng.sample = (n, k) => {
      const idx = Array.from({ length: n }, (_, i) => i);
      for (let i = 0; i < k; i++) {
        const j = i + rng.int(n - i);
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      return idx.slice(0, k);
    };
    // Shuffle bag: hands out a shuffled copy of `items`, reshuffles when empty, and
    // never repeats across the seam. Independent draws clump — three X glitches in a
    // row is 1-in-9 and feels broken to a player who is meant to meet X, Z and Y.
    // Puzzles draw from a bag; the Monte-Carlo simulation must keep using plain rng.
    rng.bag = items => {
      const pool = items.slice();
      let queue = [], last;
      if (!pool.length) throw new Error('rng.bag: no items');
      return () => {
        if (!queue.length) {
          queue = pool.slice();
          for (let i = queue.length - 1; i > 0; i--) {
            const j = rng.int(i + 1);
            [queue[i], queue[j]] = [queue[j], queue[i]];
          }
          // queue is drawn from the back, so swap away a seam repeat
          if (queue.length > 1 && queue[queue.length - 1] === last) {
            [queue[0], queue[queue.length - 1]] = [queue[queue.length - 1], queue[0]];
          }
        }
        return (last = queue.pop());
      };
    };
    // Bag over 0..n-1, the usual "which qubit glitches this round?" case.
    rng.bagInt = n => rng.bag(Array.from({ length: n }, (_, i) => i));
    return rng;
  }

  QEC.makeRng = makeRng;
  QEC.randomSeed = () => (Math.random() * 4294967296) >>> 0;
})(window.QEC = window.QEC || {});
