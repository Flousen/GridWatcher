// Minimal test runner, no dependencies. Works in the browser (tests.html) and in gjs (tests/run-cli.js).
(function (G) {
  'use strict';

  const tests = [];
  let currentSuite = '';

  function suite(name, fn) { currentSuite = name; fn(); currentSuite = ''; }
  function test(name, fn) { tests.push({ suite: currentSuite, name, fn }); }

  function fmt(v) {
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }

  class AssertionError extends Error {}

  const assert = {
    ok(v, msg) { if (!v) throw new AssertionError(msg || `expected truthy, got ${fmt(v)}`); },
    equal(a, b, msg) {
      if (a !== b) throw new AssertionError(`${msg ? msg + ': ' : ''}expected ${fmt(b)}, got ${fmt(a)}`);
    },
    deepEqual(a, b, msg) {
      if (fmt(a) !== fmt(b)) throw new AssertionError(`${msg ? msg + ': ' : ''}expected ${fmt(b)}, got ${fmt(a)}`);
    },
    less(a, b, msg) {
      if (!(a < b)) throw new AssertionError(`${msg ? msg + ': ' : ''}expected ${fmt(a)} < ${fmt(b)}`);
    },
  };

  function run() {
    const results = [];
    for (const t of tests) {
      try { t.fn(); results.push({ ...t, pass: true }); }
      catch (e) { results.push({ ...t, pass: false, error: e && e.message ? e.message : String(e) }); }
    }
    return results;
  }

  G.suite = suite;
  G.test = test;
  G.assert = assert;
  G.TestRunner = { run };
})(typeof window !== 'undefined' ? window : globalThis);
