// Chapter 4 tells the player things about checks that must hold exactly. Check each one.
suite('chapter 4: checks side by side', () => {
  const P = QEC.Pauli, K = QEC.checks;
  const pauli = (n, s) => P.on(n, s.qubits, s.type);

  test('clash rule = the Pauli algebra (anticommuting checks)', () => {
    const n = 4, sets = [];
    for (let m = 1; m < 1 << n; m++) {
      const qs = [];
      for (let q = 0; q < n; q++) if ((m >> q) & 1) qs.push(q);
      sets.push(qs);
    }
    for (const a of sets) for (const b of sets) for (const ta of ['X', 'Z']) for (const tb of ['X', 'Z']) {
      const A = { type: ta, qubits: a }, B = { type: tb, qubits: b };
      assert.equal(K.clash(A, B), !P.commutes(pauli(n, A), pauli(n, B)), `${ta}${a} vs ${tb}${b}`);
    }
  });

  test('a row of 3: each cyan slot shares 2 qubits with one orange checker and clashes with the other', () => {
    const { orange, slots } = K.clashRow(3);
    assert.equal(slots.length, 2);
    for (const s of slots) {
      assert.deepEqual(orange.map(o => K.shared(o, s)).sort(), [1, 2]);
      assert.equal(orange.filter(o => K.clash(o, s)).length, 1);
    }
  });

  test('longer rows have no clash-free cyan slot either', () => {
    for (const n of [3, 4, 5, 7]) {
      const { orange, slots } = K.clashRow(n);
      for (const s of slots) assert.ok(orange.some(o => K.clash(o, s)), `n=${n} slot ${s.qubits}`);
    }
  });

  test('no two tiles clash in the square (d=2) or the 3×3 patch', () => {
    for (const d of [2, 3]) {
      const code = QEC.codes.rotatedSurfaceCode(d);
      for (const a of code.stabs) for (const b of code.stabs) {
        assert.ok(!K.clash(a, b), `d=${d}`);
        if (a.type !== b.type) assert.ok([0, 2].includes(K.shared(a, b)), `d=${d}: shares 0 or 2`);
      }
    }
  });
});

// Level BUILD: "no clash and every qubit watched" has exactly one answer, and it is the square's tile.
suite('chapter 4: building the square', () => {
  const K = QEC.checks, B = K.squareBuild();
  const code = QEC.codes.rotatedSurfaceCode(2);
  const subsets = [];
  for (let m = 0; m < 16; m++) subsets.push([0, 1, 2, 3].filter(q => (m >> q) & 1));

  test('the orange checkers are the square\'s Z-checks', () => {
    const z = code.stabs.filter(s => s.type === 'Z').map(s => s.qubits.slice().sort().join());
    assert.deepEqual(B.orange.map(o => o.qubits.join()).sort(), z.sort());
  });

  test('the start (top row, like the row before) clashes with both orange checkers', () => {
    assert.equal(K.judgeCyan(B, [0, 1]).clashes.length, 2);
  });

  test('only "all four" is clash-free and watches every qubit, and it is the square\'s X-check', () => {
    const ok = subsets.filter(qs => K.judgeCyan(B, qs).ok);
    assert.deepEqual(ok, [[0, 1, 2, 3]]);
    assert.deepEqual(code.stabs.find(s => s.type === 'X').qubits.slice().sort(), [0, 1, 2, 3]);
  });

  test('a column alone is calm but leaves the other column unwatched', () => {
    const j = K.judgeCyan(B, [0, 2]);
    assert.equal(j.clashes.length, 0);
    assert.deepEqual(j.unwatched, [1, 3]);
  });
});

suite('chapter 4: phase row', () => {
  const P = QEC.Pauli, D = QEC.decoder;
  const code = QEC.codes.repetitionCode(3, 'X');

  test('cyan X-checks only', () => assert.ok(code.stabs.every(s => s.type === 'X')));

  test('every single Z glitch lights its own pattern and the fewest flips fix it', () => {
    const keys = [0, 1, 2].map(q => D.syndrome(code, P.on(3, [q], 'Z')).join(''));
    assert.deepEqual(keys, ['10', '11', '01']);
    for (let q = 0; q < 3; q++) {
      const err = P.on(3, [q], 'Z');
      assert.equal(D.residualStatus(code, err, D.matchingDecode(code, D.syndrome(code, err))), 'ok');
    }
  });

  test('an X glitch slips through and damages the stored qubit', () => {
    const err = P.on(3, [1], 'X');
    assert.ok(D.isZero(D.syndrome(code, err)));
    assert.equal(D.residualStatus(code, err, P.identity(3)), 'logical');
  });

  test('ZZZ is the logical operator', () => {
    assert.equal(D.residualStatus(code, P.fromString('ZZZ'), P.identity(3)), 'logical');
  });
});

// Level SQUARE: "every single glitch lights a tile, but nothing on the board says which qubit;
// no strategy wins every round". Distance 2.
suite('chapter 4: the square (surface code d=2)', () => {
  const P = QEC.Pauli, D = QEC.decoder;
  const code = QEC.codes.rotatedSurfaceCode(2), n = code.n;
  const key = e => D.syndrome(code, e).join('');

  test('4 qubits: 2 orange edge checkers of weight 2, 1 cyan tile on all four', () => {
    assert.equal(n, 4);
    assert.deepEqual(code.stabs.map(s => `${s.type}${s.qubits.length}`).sort(), ['X4', 'Z2', 'Z2']);
    assert.equal(code.distance, 2);
  });

  test('logicals commute with the checks and anticommute with each other', () => {
    for (const s of code.stabPaulis) assert.ok(P.commutes(s, code.logicalX) && P.commutes(s, code.logicalZ));
    assert.equal(P.commutes(code.logicalX, code.logicalZ), false);
  });

  test('every single X, Y or Z glitch lights a tile', () => {
    for (let q = 0; q < n; q++) for (const t of ['X', 'Y', 'Z']) assert.ok(!D.isZero(D.syndrome(code, P.on(n, [q], t))), `${t}${q}`);
  });

  test('X glitch: 2 one-flip fixes fit the tiles, 1 right, 1 a logical error', () => {
    for (let q = 0; q < n; q++) {
      const err = P.on(n, [q], 'X');
      const fits = [0, 1, 2, 3].filter(f => key(P.on(n, [f], 'X')) === key(err));
      assert.equal(fits.length, 2, `X${q}`);
      assert.deepEqual(fits.map(f => D.residualStatus(code, err, P.on(n, [f], 'X'))).sort(), ['logical', 'ok']);
    }
  });

  test('Z glitch: all 4 one-flip fixes fit; same column is fine, the other column is a logical error', () => {
    for (let q = 0; q < n; q++) {
      const err = P.on(n, [q], 'Z');
      for (let f = 0; f < n; f++) {
        const fix = P.on(n, [f], 'Z');
        assert.equal(key(fix), key(err));
        const sameColumn = code.data[f].c === code.data[q].c;
        assert.equal(D.residualStatus(code, err, fix), sameColumn ? 'ok' : 'logical', `Z${q} fixed by Z${f}`);
        // the harmless case is the orange checker on that column, asked as a whole
        if (sameColumn && f !== q) assert.ok(code.stabPaulis.some(s => P.equal(s, P.compose(err, fix))));
      }
    }
  });

  test('X glitch + wrong fix = a column (top to bottom); Z glitch + wrong fix = a row (left to right)', () => {
    const col = q => code.data[q].c, row = q => code.data[q].r;
    for (let q = 0; q < n; q++) for (let f = 0; f < n; f++) {
      const rx = P.compose(P.on(n, [q], 'X'), P.on(n, [f], 'X'));
      if (f !== q && col(f) === col(q)) assert.equal(P.commutes(rx, code.logicalZ), false, 'X column flips the stored bit');
      const rz = P.compose(P.on(n, [q], 'Z'), P.on(n, [f], 'Z'));
      if (row(f) === row(q) && f !== q) assert.equal(P.commutes(rz, code.logicalX), false, 'Z row flips the stored phase');
    }
  });
});
