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
    return rng;
  }

  QEC.makeRng = makeRng;
  QEC.randomSeed = () => (Math.random() * 4294967296) >>> 0;
})(window.QEC = window.QEC || {});
