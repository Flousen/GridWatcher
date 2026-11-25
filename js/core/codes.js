// Stabilizer codes used in the chapters.
//
// A code is a plain object:
//   n         number of data qubits
//   data[i]   {r, c}           grid position of data qubit i
//   stabs[k]  {type, qubits, r, c}
//             type 'Z' = a Z-check: it lights up when an odd number of its qubits carry an X (bit-flip) part
//             type 'X' = an X-check: it lights up for an odd number of Z (phase-flip) parts
//             (r, c) is where to draw it, in the same units as the data grid
//   logicals  {X: [qubits], Z: [qubits]}  supports of the logical X and Z operators
(function (QEC) {
  'use strict';
  const P = QEC.Pauli;

  function finish(code) {
    code.stabPaulis = code.stabs.map(s => P.on(code.n, s.qubits, s.type));
    code.logicalX = P.on(code.n, code.logicals.X, 'X');
    code.logicalZ = P.on(code.n, code.logicals.Z, 'Z');
    return code;
  }

  // n qubits in a row, checks between neighbours. type 'Z' (the default): Z⊗Z checks that catch
  // X errors only (Chapter 3). type 'X': X⊗X checks that catch Z errors only (Chapter 4's phase row).
  // The logical operator the checks cannot see runs along the whole row.
  function repetitionCode(n, type = 'Z') {
    const data = Array.from({ length: n }, (_, i) => ({ r: 0, c: i }));
    const stabs = [];
    for (let i = 0; i < n - 1; i++) stabs.push({ type, qubits: [i, i + 1], r: 0, c: i + 0.5 });
    const all = data.map((_, i) => i), other = type === 'Z' ? 'X' : 'Z';
    return finish({
      name: `repetition-${n}${type === 'Z' ? '' : '-' + type}`, n, distance: n, data, stabs,
      logicals: { [other]: all, [type]: [0] },
    });
  }

  // Rotated surface code of distance d (odd d in Chapters 5 and 6; d = 2 is Chapter 4's square).
  // Data qubits sit on a d×d grid. Checks sit on the corners (i, j) between them, 0 ≤ i, j ≤ d,
  // touching the (up to) 4 surrounding qubits. Their type follows a checkerboard.
  // On the top/bottom edges only X-checks survive (weight 2), on the left/right edges only Z-checks.
  function rotatedSurfaceCode(d) {
    const n = d * d;
    const idx = (r, c) => r * d + c;
    const data = [];
    for (let r = 0; r < d; r++) for (let c = 0; c < d; c++) data.push({ r, c });

    const stabs = [];
    for (let i = 0; i <= d; i++) {
      for (let j = 0; j <= d; j++) {
        const type = (i + j) % 2 === 0 ? 'X' : 'Z';
        const topBottom = i === 0 || i === d;
        const leftRight = j === 0 || j === d;
        if (topBottom && leftRight) continue;           // corners
        if (topBottom && type !== 'X') continue;
        if (leftRight && type !== 'Z') continue;
        const qubits = [];
        for (const [r, c] of [[i - 1, j - 1], [i - 1, j], [i, j - 1], [i, j]]) {
          if (r >= 0 && r < d && c >= 0 && c < d) qubits.push(idx(r, c));
        }
        // draw position: the corner between the qubits (r, c are in qubit-grid units)
        stabs.push({ type, qubits, r: i - 0.5, c: j - 0.5 });
      }
    }

    // Logical X: a column of X's, running between the two edges without Z-checks (top ↔ bottom).
    // Logical Z: a row of Z's, running between the two edges without X-checks (left ↔ right).
    const column = Array.from({ length: d }, (_, r) => idx(r, 0));
    const row = Array.from({ length: d }, (_, c) => idx(0, c));
    return finish({
      name: `surface-${d}`, n, distance: d, data, stabs,
      logicals: { X: column, Z: row },
    });
  }

  // How many errors is a code of distance d SURE to undo, with a fewest-flips decoder? ⌊(d−1)/2⌋.
  // More than that can always pass for a lighter error, and then the fix completes a logical error.
  const correctable = d => Math.floor((d - 1) / 2);
  // The smallest distance that is sure to undo k errors.
  const distanceFor = k => 2 * k + 1;

  QEC.codes = { repetitionCode, rotatedSurfaceCode, correctable, distanceFor };
})(window.QEC = window.QEC || {});
