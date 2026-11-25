// Remembers which chapters and levels are done, plus a small learning log (see note()).
// Nothing is ever sent anywhere. Browser storage can be missing (private mode,
// blocked cookies), so every access is wrapped and the game simply forgets in that case.
(function (QEC) {
  'use strict';
  const KEY = 'gridwatcher.progress.v1';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function write(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* storage unavailable */ }
  }

  QEC.progress = {
    isDone(chapter) { return !!(read()[chapter] || {}).done; },
    markDone(chapter) {
      const p = read();
      p[chapter] = { ...(p[chapter] || {}), done: true };
      write(p);
    },
    // Highest level index reached in a chapter (0-based).
    level(chapter) { return (read()[chapter] || {}).level || 0; },
    reachLevel(chapter, i) {
      const p = read();
      const c = p[chapter] || {};
      if ((c.level || 0) < i) { p[chapter] = { ...c, level: i }; write(p); }
    },
    // Learning log (embedded assessment): the FIRST outcome of each prediction, check question or
    // decision, e.g. note('ch2', 'z-on-0', { kind: 'predict', ok: false }). Later attempts never
    // overwrite it — the first try is what tells whether the idea landed. Stays in this browser.
    note(chapter, key, entry) {
      const p = read();
      const c = p[chapter] || {};
      const log = c.log || {};
      if (key in log) return;
      log[key] = entry;
      p[chapter] = { ...c, log };
      write(p);
    },
    log(chapter) { return (read()[chapter] || {}).log || {}; },
    all() { return read(); },
    reset() { write({}); },
  };
})(window.QEC = window.QEC || {});
