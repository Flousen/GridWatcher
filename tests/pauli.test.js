suite('pauli', () => {
  const P = QEC.Pauli;

  test('X·X = I', () => {
    assert.equal(P.toString(P.compose(P.fromString('X'), P.fromString('X'))), 'I');
  });

  test('X·Z = Y (up to phase)', () => {
    assert.equal(P.toString(P.compose(P.fromString('X'), P.fromString('Z'))), 'Y');
  });

  test('X and Z anticommute', () => {
    assert.equal(P.commutes(P.fromString('X'), P.fromString('Z')), false);
  });

  test('Y anticommutes with X and Z, commutes with itself', () => {
    const Y = P.fromString('Y');
    assert.equal(P.commutes(Y, P.fromString('X')), false);
    assert.equal(P.commutes(Y, P.fromString('Z')), false);
    assert.equal(P.commutes(Y, Y), true);
  });

  test('XX and ZZ commute (two clashes)', () => {
    assert.equal(P.commutes(P.fromString('XX'), P.fromString('ZZ')), true);
  });

  test('on() and applyAt() build the expected operator', () => {
    const p = P.on(4, [1, 3], 'Z');
    assert.equal(P.toString(p), 'IZIZ');
    P.applyAt(p, 1, 'X');
    assert.equal(P.toString(p), 'IYIZ');
    assert.equal(P.weight(p), 2);
  });
});

suite('rng', () => {
  test('same seed → same sequence', () => {
    const a = QEC.makeRng(42), b = QEC.makeRng(42);
    for (let i = 0; i < 5; i++) assert.equal(a(), b());
  });

  test('sample() returns distinct indices in range', () => {
    const r = QEC.makeRng(1);
    const s = r.sample(9, 4);
    assert.equal(new Set(s).size, 4);
    assert.ok(s.every(i => i >= 0 && i < 9));
  });
});
