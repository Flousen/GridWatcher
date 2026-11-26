// Chapter 7's puzzles: the boards each level starts from, the jobs, and the XOR (CNOT) recipe test.
// Kept out of the page so the tests can check that every job can be done within its budget.
(function (QEC) {
  'use strict';
  const P = QEC.Pauli, T = QEC.tiles, S = QEC.stab;

  // Boards. Patches: [label, column, row, type of top/bottom edges, extra options].
  // Qubit numbers follow the order of the list.
  const BOARDS = {
    // Level 2: q2 must be moved so that its Z edge touches q1's Z edge.
    glue: { w: 3, h: 2, patches: [['q1', 0, 0, 'Z'], ['q2', 2, 1, 'Z']] },
    // Level 3: tiles too far apart to glue; one row of free tiles between them.
    hallway: { w: 5, h: 3, patches: [['q1', 0, 0, 'Z'], ['q2', 0, 2, 'X'], ['q3', 4, 0, 'Z'], ['q4', 2, 2, 'Z']] },
    // Level 4: control c and target t stay put; the player places the helper h.
    // Qubits: c = 0, h = 1 (placed by the player), t = 2.
    xor: { w: 3, h: 2, nq: 3, patches: [['c', 0, 0, 'Z'], ['t', 1, 1, 'Z', { q: 2 }]] },
    // Level 5: a compact row over a reserved hallway lane, the same with wide patches, then a free board.
    compact: { w: 4, h: 2, lane: [[0, 1], [1, 1], [2, 1], [3, 1]], patches: [['q1', 0, 0, 'Z'], ['q2', 1, 0, 'Z'], ['q3', 2, 0, 'Z'], ['q4', 3, 0, 'Z']] },
    wide: {
      w: 8, h: 2, lane: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1]],
      patches: [['q1', 0, 0, 'Z', { wide: true }], ['q2', 2, 0, 'Z', { wide: true }], ['q3', 4, 0, 'Z', { wide: true }], ['q4', 6, 0, 'Z', { wide: true }]],
    },
    free: { w: 5, h: 4, nq: 4, patches: [] },
    // Bonus: one data qubit and one magic state.
    magic: { w: 3, h: 2, patches: [['q1', 0, 0, 'Z'], ['m', 2, 0, 'Z', { kind: 'magic' }]] },
  };

  function board(name) {
    const def = BOARDS[name];
    const b = T.create({ w: def.w, h: def.h, lane: def.lane || [], nq: def.nq || def.patches.length });
    def.patches.forEach(([label, c, r, tb, extra = {}], q) => {
      const res = T.place(b, { label, q, c, r, tb, fresh: false, ...extra });
      if (!res.ok) throw new Error('surgery: bad board ' + name);
    });
    return b;
  }

  // Jobs as operators: 'IXZI' = X on q2 and Z on q3.
  const JOBS = {
    glue: ['ZZ'],
    hallway: ['ZIZI', 'ZIZZ', 'IXZI', 'IYII'],
    compact: ['IXZI'],
    wide: ['IXZI'],
    free: ['ZZII', 'IIXX', 'ZZZZ'],   // these three commute, so any order works, even two at once
    magic: ['ZZ'],
  };
  // Best tiles × steps we found for the free round (see the tests). A player may beat it.
  const PAR = { free: { tiles: 8, steps: 2 } };

  // The labels the free round hands out, in order.
  const FREE_LABELS = ['q1', 'q2', 'q3', 'q4'];

  // ── XOR from two parity checks (lattice-surgery CNOT, Horsman et al. 2012) ──
  // Recipe: helper h in |+⟩ → measure Z(c)·Z(h) → measure X(h)·X(t) → read h in Z, then the
  // software fix-ups: X on t if the Z(c)·Z(h) result and the read differ, Z on c if X(h)·X(t) was −1.
  // `plan` is what the player actually did, in order: { op } for each measurement (over c, h, t),
  // and { read: 'Z' | 'X' } when h is read. The fix-ups use the last result of each recipe question,
  // found by what was asked, not by position, so an extra or repeated question does not shift them.
  // A recipe question that was never asked counts as +1.
  // The test also needs an in-between input: on plain 0s and 1s, a plan that secretly reads c
  // (Z(c)·Z(h), then read h) and flips t to match would pass, too. A real CNOT must not look:
  // c = |+⟩, t = 0 has to come out as an entangled pair, equal in Z and equal in X.
  const C = 0, H = 1, TT = 2;
  const ZZ = P.on(3, [C, H], 'Z'), XX = P.on(3, [H, TT], 'X');   // the recipe's two questions
  function xorTrial(plan, input, rng) {
    const st = S.create(3);
    if (input === 'pair') S.reset(st, C, 'X', rng);
    else {
      if (input.c) S.apply(st, P.on(3, [C], 'X'));
      if (input.t) S.apply(st, P.on(3, [TT], 'X'));
    }
    S.reset(st, H, 'X', rng);
    let m1 = 0, m2 = 0, readBit = 0;
    for (const s of plan) {
      if (s.op) {
        const b = S.measure(st, s.op, rng).outcome < 0 ? 1 : 0;
        if (P.equal(s.op, ZZ)) m1 = b;
        else if (P.equal(s.op, XX)) m2 = b;
      } else if (s.read) readBit = S.measure(st, P.on(3, [H], s.read), rng).outcome < 0 ? 1 : 0;
    }
    if (m1 ^ readBit) S.apply(st, P.on(3, [TT], 'X'));
    if (m2) S.apply(st, P.on(3, [C], 'Z'));
    const val = q => { const v = S.peek(st, P.on(3, [q], 'Z')); return v === 0 ? null : v > 0 ? 0 : 1; };
    const same = t => S.peek(st, P.on(3, [C, TT], t)) === 1;
    return { c: val(C), t: val(TT), sameZ: same('Z'), sameX: same('X') };
  }

  // The four inputs and the pair input, each a few times (coin tosses show up as differing runs).
  // Rows { c, t, outs: [t after each run], ok }, then { pair: true, ok }; ok = all rows pass.
  function xorTest(plan, rng, runs = 4) {
    const rows = [];
    for (const c of [0, 1]) {
      for (const t of [0, 1]) {
        const outs = [];
        let ok = true;
        for (let k = 0; k < runs; k++) {
          const r = xorTrial(plan, { c, t }, rng);
          outs.push(r.t);
          if (r.t !== (c ^ t) || r.c !== c) ok = false;
        }
        rows.push({ c, t, outs, ok });
      }
    }
    let pairOk = true, sameZ = true, sameX = true;
    for (let k = 0; k < runs; k++) {
      const r = xorTrial(plan, 'pair', rng);
      sameZ = sameZ && r.sameZ; sameX = sameX && r.sameX;
      pairOk = pairOk && r.sameZ && r.sameX;
    }
    rows.push({ pair: true, sameZ, sameX, ok: pairOk });
    return { rows, ok: rows.every(r => r.ok) };
  }

  QEC.surgery = { BOARDS, JOBS, PAR, FREE_LABELS, board, xorTrial, xorTest };
})(window.QEC = window.QEC || {});
