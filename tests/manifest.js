// Files loaded by both tests.html and tests/run-cli.js, in order. Paths are relative to the repo root.
window.TEST_MANIFEST = {
  sources: [
    'js/core/rng.js',
    'js/core/pauli.js',
    'js/core/codes.js',
    'js/core/decoder.js',
    'js/core/sim.js',
    'js/core/hamming.js',
  ],
  tests: [
    'tests/rng.test.js',
    'tests/pauli.test.js',
    'tests/codes.test.js',
    'tests/sim.test.js',
    'tests/hamming.test.js',
  ],
};
