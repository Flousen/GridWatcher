suite('chapter 4 puzzles (chains)', () => {
  const P = QEC.Pauli, D = QEC.decoder, C = QEC.chains;
  const code = QEC.codes.rotatedSurfaceCode(C.d), N = code.n;
  const err = cells => P.on(N, C.qubits(cells), 'X');
  const lit = e => code.stabs.filter((s, k) => D.syndrome(code, e)[k]);
  const name = cells => cells.map(([r, c]) => `(${r},${c})`).join('');

  // Every puzzle is an X glitch: only orange Z-tiles may ever light up.
  const all = [...C.single, ...C.pair, ...C.run, ...C.edge, ...C.shortWins, ...C.longWins];
  test('only Z-checks light up', () => {
    for (const cells of all) assert.ok(lit(err(cells)).every(s => s.type === 'Z'), name(cells));
  });

  // "Solvable": the shortest fix has exactly as many flips as there are glitches, and it works.
  function shortestIsRight(cells, nLit) {
    const e = err(cells), corr = D.matchingDecode(code, D.syndrome(code, e));
    assert.equal(lit(e).length, nLit, `lit tiles ${name(cells)}`);
    assert.equal(P.weight(corr), cells.length, `fewest flips ${name(cells)}`);
    assert.equal(D.residualStatus(code, e, corr), 'ok', name(cells));
  }

  test('single: 2 lit tiles, shared by exactly the glitched qubit', () => {
    for (const cells of C.single) {
      shortestIsRight(cells, 2);
      const [a, b] = lit(err(cells));
      const shared = a.qubits.filter(q => b.qubits.includes(q));
      assert.deepEqual(shared, C.qubits(cells), name(cells));
    }
  });

  test('pair: the tile between them stays dark, 2 ends light', () => {
    for (const cells of C.pair) shortestIsRight(cells, 2);
  });

  test('run of three: still 2 lit tiles, no shorter fix', () => {
    for (const cells of C.run) shortestIsRight(cells, 2);
  });

  test('edge: 1 lit tile; the long fix to the far edge is a logical error', () => {
    for (const cells of C.edge) {
      shortestIsRight(cells, 1);
      const [[r, c]] = cells;
      const longFix = P.on(N, Array.from({ length: C.d }, (_, i) => i * C.d + c).filter(q => q !== r * C.d + c), 'X');
      const e = err(cells);
      assert.deepEqual(D.syndrome(code, longFix), D.syndrome(code, e), `same tiles ${name(cells)}`);
      assert.equal(D.residualStatus(code, e, longFix), 'logical', name(cells));
    }
  });

  test('short wins: 2 glitches off an edge are fixed by the fewest flips', () => {
    for (const cells of C.shortWins) shortestIsRight(cells, 1);
  });

  test('long wins: 3 glitches off an edge fool even the best decoder', () => {
    for (const cells of C.longWins) {
      const e = err(cells), corr = D.matchingDecode(code, D.syndrome(code, e));
      assert.equal(lit(e).length, 1, name(cells));
      assert.less(P.weight(corr), cells.length, name(cells));
      assert.equal(D.residualStatus(code, e, corr), 'logical', name(cells));
    }
  });
});
