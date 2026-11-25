// Chapter 4 (FROM ROW TO SQUARE): when can two checks be asked side by side?
//
// Asking a check nudges the qubits it asks. An X-check and a Z-check that share an ODD number of
// qubits anticommute: each time one is asked, the other's answer becomes a coin toss. With an even
// number shared (0 or 2) the nudges cancel and both answers stay steady. Two checks of the same
// type never clash. tests/checks.test.js checks this rule against the Pauli algebra.
(function (QEC) {
  'use strict';

  const shared = (a, b) => a.qubits.filter(q => b.qubits.includes(q)).length;
  const clash = (a, b) => a.type !== b.type && shared(a, b) % 2 === 1;

  // Chapter 4, level CLASH: a row of n qubits with Chapter 3's orange Z-checkers between all
  // neighbours, and one cyan X-checker the player may put into any gap.
  function clashRow(n) {
    const orange = [];
    for (let i = 0; i < n - 1; i++) orange.push({ type: 'Z', qubits: [i, i + 1] });
    const slots = orange.map(o => ({ type: 'X', qubits: o.qubits.slice() }));
    return { orange, slots };
  }

  // Chapter 4, level BUILD: four qubits in a square, numbered row by row (q1 q2 / q3 q4), so the
  // indices match QEC.codes.rotatedSurfaceCode(2). Each column has its own orange checker.
  function squareBuild() {
    return { n: 4, orange: [{ type: 'Z', qubits: [0, 2] }, { type: 'Z', qubits: [1, 3] }] };
  }

  // A cyan checker asking these qubits: which orange checkers does it clash with, and which qubits
  // does it leave without a phase check? ok = no clash and every qubit watched.
  function judgeCyan(build, qubits) {
    const cyan = { type: 'X', qubits };
    const clashes = build.orange.filter(o => clash(o, cyan));
    const unwatched = [];
    for (let q = 0; q < build.n; q++) if (!qubits.includes(q)) unwatched.push(q);
    return { cyan, clashes, unwatched, ok: clashes.length === 0 && unwatched.length === 0 };
  }

  QEC.checks = { shared, clash, clashRow, squareBuild, judgeCyan };
})(window.QEC = window.QEC || {});
