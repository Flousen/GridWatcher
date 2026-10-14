suite('repetition code', () => {
  const P = QEC.Pauli, D = QEC.decoder;
  const code = QEC.codes.repetitionCode(3);

  test('3 qubits, 2 Z-checks', () => {
    assert.equal(code.n, 3);
    assert.equal(code.stabs.length, 2);
    assert.ok(code.stabs.every(s => s.type === 'Z'));
  });

  test('every single X error has its own syndrome', () => {
    const keys = [0, 1, 2].map(q => D.syndrome(code, P.on(3, [q], 'X')).join(''));
    assert.deepEqual(keys, ['10', '11', '01']);
  });

  test('decoder fixes any single X error', () => {
    for (let q = 0; q < 3; q++) {
      const err = P.on(3, [q], 'X');
      assert.equal(D.residualStatus(code, err, D.lookupDecode(code, D.syndrome(code, err))), 'ok', `qubit ${q}`);
      assert.equal(D.residualStatus(code, err, D.greedyDecode(code, D.syndrome(code, err))), 'ok', `greedy qubit ${q}`);
    }
  });

  test('two X errors fool the decoder → logical error', () => {
    const err = P.on(3, [0, 1], 'X');
    assert.equal(D.residualStatus(code, err, D.lookupDecode(code, D.syndrome(code, err))), 'logical');
  });

  test('a Z error is invisible and flips the logical phase', () => {
    const err = P.on(3, [1], 'Z');
    assert.ok(D.isZero(D.syndrome(code, err)));
    assert.equal(D.residualStatus(code, err, P.identity(3)), 'logical');
  });

  test('XXX (flipping everything) is a logical operator', () => {
    assert.equal(D.residualStatus(code, P.fromString('XXX'), P.identity(3)), 'logical');
  });
});

for (const d of [3, 5, 7]) {
  suite(`surface code d=${d}`, () => {
    const P = QEC.Pauli, D = QEC.decoder;
    const code = QEC.codes.rotatedSurfaceCode(d);
    const n = d * d;

    test('d² data qubits, (d²−1)/2 checks of each type', () => {
      assert.equal(code.n, n);
      assert.equal(code.stabs.filter(s => s.type === 'X').length, (n - 1) / 2);
      assert.equal(code.stabs.filter(s => s.type === 'Z').length, (n - 1) / 2);
    });

    test('every check has weight 2 or 4', () => {
      assert.ok(code.stabs.every(s => s.qubits.length === 2 || s.qubits.length === 4));
    });

    test('all checks commute with each other', () => {
      for (const a of code.stabPaulis) for (const b of code.stabPaulis) assert.ok(P.commutes(a, b));
    });

    test('logical X and Z commute with all checks', () => {
      for (const s of code.stabPaulis) {
        assert.ok(P.commutes(s, code.logicalX), 'X_L');
        assert.ok(P.commutes(s, code.logicalZ), 'Z_L');
      }
    });

    test('logical X and Z anticommute (they really act on the stored qubit)', () => {
      assert.equal(P.commutes(code.logicalX, code.logicalZ), false);
    });

    test('every qubit is in 1 or 2 checks of each type', () => {
      for (let q = 0; q < n; q++) {
        for (const t of ['X', 'Z']) {
          const k = code.stabs.filter(s => s.type === t && s.qubits.includes(q)).length;
          assert.ok(k === 1 || k === 2, `qubit ${q}, type ${t}: ${k}`);
        }
      }
    });

    test('every single X, Y or Z error lights up at least one check', () => {
      for (let q = 0; q < n; q++) for (const t of ['X', 'Y', 'Z']) {
        assert.ok(!D.isZero(D.syndrome(code, P.on(n, [q], t))), `${t}${q}`);
      }
    });

    test('greedy decoder fixes every single error', () => {
      for (let q = 0; q < n; q++) for (const t of ['X', 'Y', 'Z']) {
        const err = P.on(n, [q], t);
        assert.equal(D.residualStatus(code, err, D.greedyDecode(code, D.syndrome(code, err))), 'ok', `${t}${q}`);
      }
    });

    test('error × check is harmless (degeneracy)', () => {
      const err = P.on(n, [0], 'X');
      for (const s of code.stabPaulis) assert.equal(D.residualStatus(code, err, P.compose(err, s)), 'ok');
    });

    test('correction = error × logical → logical error', () => {
      const err = P.on(n, [0], 'X');
      assert.equal(D.residualStatus(code, err, P.compose(err, code.logicalX)), 'logical');
      assert.equal(D.residualStatus(code, err, P.compose(err, code.logicalZ)), 'logical');
    });

    test('both decoders always clear the syndrome', () => {
      const rng = QEC.makeRng(d);
      for (let i = 0; i < 200; i++) {
        const err = QEC.sim.sampleError(code, 0.15, rng);
        const syn = D.syndrome(code, err);
        for (const dec of [D.greedyDecode, D.matchingDecode]) {
          assert.ok(D.residualStatus(code, err, dec(code, syn)) !== 'syndrome', `sample ${i}: ${P.toString(err)}`);
        }
      }
    });

    test('matching decoder is minimal: correction never heavier than the real error', () => {
      const rng = QEC.makeRng(100 + d);
      for (let i = 0; i < 500; i++) {
        const err = QEC.sim.sampleError(code, 0.08, rng);
        const corr = D.matchingDecode(code, D.syndrome(code, err));
        assert.ok(P.weight(corr) <= P.weight(err), `sample ${i}`);
      }
    });

    // The promise of distance d: every error on up to (d−1)/2 qubits gets fixed.
    const t = (d - 1) / 2;
    for (const type of ['X', 'Z']) {
      test(`matching decoder fixes every ${type} error on ≤ ${t} qubits`, () => {
        const visit = (start, chosen) => {
          if (chosen.length) {
            const err = P.on(n, chosen, type);
            const status = D.residualStatus(code, err, D.matchingDecode(code, D.syndrome(code, err)));
            assert.equal(status, 'ok', `${type} on ${chosen}`);
          }
          if (chosen.length === t) return;
          for (let q = start; q < n; q++) visit(q + 1, [...chosen, q]);
        };
        visit(0, []);
      });
    }
  });
}

suite('surface code d=3 lookup decoder', () => {
  const P = QEC.Pauli, D = QEC.decoder;
  const code = QEC.codes.rotatedSurfaceCode(3);

  test('fixes every single X, Y, Z error', () => {
    for (let q = 0; q < 9; q++) for (const t of ['X', 'Y', 'Z']) {
      const err = P.on(9, [q], t);
      assert.equal(D.residualStatus(code, err, D.lookupDecode(code, D.syndrome(code, err))), 'ok', `${t}${q}`);
    }
  });

  test('some pair of errors defeats even the optimal decoder (distance 3)', () => {
    let failures = 0;
    for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) {
      const err = P.on(9, [a, b], 'X');
      if (D.residualStatus(code, err, D.lookupDecode(code, D.syndrome(code, err))) === 'logical') failures++;
    }
    assert.ok(failures > 0);
  });

  // Chapter 4 tells a player who hit a logical error to add a column of X (or a row of Z)
  // on top of their fix. That advice has to actually land on the other valid correction.
  test('adding the logical operator repairs any logical error', () => {
    const types = ['X', 'Y', 'Z'];
    let checked = 0;
    for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++)
      for (const ta of types) for (const tb of types) {
        const err = P.applyAt(P.on(9, [a], ta), b, tb);
        const corr = D.lookupDecode(code, D.syndrome(code, err));
        if (D.residualStatus(code, err, corr) !== 'logical') continue;
        const r = P.compose(err, corr);
        let fixed = P.compose(corr, P.identity(9));
        if (!P.commutes(r, code.logicalZ)) fixed = P.compose(fixed, code.logicalX);
        if (!P.commutes(r, code.logicalX)) fixed = P.compose(fixed, code.logicalZ);
        assert.equal(D.residualStatus(code, err, fixed), 'ok', `${ta}${a} ${tb}${b}`);
        checked++;
      }
    assert.ok(checked > 0, 'no logical errors found to repair');
  });
});
