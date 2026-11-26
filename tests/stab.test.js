suite('stab (stabilizer simulator)', () => {
  const P = QEC.Pauli, S = QEC.stab;
  const op = s => P.fromString(s);

  test('fresh state is |0…0⟩: every Z is certain +1, every X a coin toss', () => {
    const st = S.create(3);
    assert.equal(S.peek(st, op('ZII')), 1);
    assert.equal(S.peek(st, op('IZZ')), 1);
    assert.equal(S.peek(st, op('XII')), 0);
  });

  test('measuring a stabilizer is certain and changes nothing', () => {
    const st = S.create(2), rng = QEC.makeRng(1);
    S.apply(st, op('XI'));                       // |10⟩
    const r = S.measure(st, op('ZZ'), rng);
    assert.equal(r.random, false);
    assert.equal(r.outcome, -1);
    assert.equal(S.peek(st, op('ZI')), -1);
  });

  test('ZZ on |++⟩: random result, then both reads agree with it (Bell pair), XX stays +1', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = QEC.makeRng(seed), st = S.create(2);
      S.reset(st, 0, 'X', rng); S.reset(st, 1, 'X', rng);
      const m = S.measure(st, op('ZZ'), rng);
      assert.equal(m.random, true);
      assert.equal(S.peek(st, op('ZI')), 0, 'a single qubit is still a coin toss');
      assert.equal(S.peek(st, op('ZZ')), m.outcome);
      assert.equal(S.peek(st, op('XX')), 1);
      const a = S.measure(st, op('ZI'), rng).outcome, b = S.measure(st, op('IZ'), rng).outcome;
      assert.equal(a * b, m.outcome);
    }
  });

  test('XX on |++⟩ is certain +1: the question tells nothing new', () => {
    const rng = QEC.makeRng(3), st = S.create(2);
    S.reset(st, 0, 'X', rng); S.reset(st, 1, 'X', rng);
    assert.deepEqual(S.measure(st, op('XX'), rng), { outcome: 1, random: false });
  });

  test('anticommuting questions disturb each other: after ZZ, XI is random', () => {
    const rng = QEC.makeRng(4), st = S.create(2);
    S.reset(st, 0, 'X', rng); S.reset(st, 1, 'X', rng);
    S.measure(st, op('ZZ'), rng);
    assert.equal(S.peek(st, op('XI')), 0);
  });

  test('Y measurements keep their sign and make X and Z coin tosses', () => {
    const rng = QEC.makeRng(5), st = S.create(1);
    S.reset(st, 0, 'X', rng);
    const m = S.measure(st, op('Y'), rng);
    assert.equal(S.peek(st, op('Y')), m.outcome);
    assert.equal(S.peek(st, op('X')), 0);
    assert.equal(S.peek(st, op('Z')), 0);
  });

  test('reset gives |0⟩ or |+⟩ whatever the qubit held', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const rng = QEC.makeRng(seed), st = S.create(2);
      S.reset(st, 0, 'X', rng); S.reset(st, 1, 'X', rng);
      S.measure(st, op('ZZ'), rng);
      S.reset(st, 0, 'Z', rng);
      assert.equal(S.peek(st, op('ZI')), 1);
      S.reset(st, 1, 'X', rng);
      assert.equal(S.peek(st, op('IX')), 1);
    }
  });

  test('textbook CNOT: |10⟩ → |11⟩, |+0⟩ → Bell pair', () => {
    let st = S.create(2);
    S.apply(st, op('XI'));
    S.cnot(st, 0, 1);
    assert.equal(S.peek(st, op('IZ')), -1);
    st = S.create(2);
    S.h(st, 0);
    S.cnot(st, 0, 1);
    assert.equal(S.peek(st, op('ZZ')), 1);
    assert.equal(S.peek(st, op('XX')), 1);
    assert.equal(S.peek(st, op('ZI')), 0);
  });
});

suite('surgery: XOR recipe (lattice-surgery CNOT)', () => {
  const P = QEC.Pauli, S = QEC.stab, G = QEC.surgery;
  const op = s => P.fromString(s);   // qubits: c, h, t
  const recipe = [{ op: op('ZZI') }, { op: op('IXX') }, { read: 'Z' }];

  test('the recipe computes t XOR c on all four inputs, every run', () => {
    for (let seed = 1; seed <= 10; seed++) assert.ok(G.xorTest(recipe, QEC.makeRng(seed)).ok, 'seed ' + seed);
  });

  test('it is a real CNOT: on |+⟩|−⟩ it gives |−⟩|−⟩ (phase kickback), like the textbook gate', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const rng = QEC.makeRng(seed), st = S.create(3);
      S.reset(st, 0, 'X', rng);                         // c = |+⟩
      S.reset(st, 2, 'X', rng); S.apply(st, op('IIZ')); // t = |−⟩
      S.reset(st, 1, 'X', rng);                         // h = |+⟩
      const m1 = S.measure(st, op('ZZI'), rng).outcome < 0 ? 1 : 0;
      const m2 = S.measure(st, op('IXX'), rng).outcome < 0 ? 1 : 0;
      const m3 = S.measure(st, op('IZI'), rng).outcome < 0 ? 1 : 0;
      if (m1 ^ m3) S.apply(st, op('IIX'));
      if (m2) S.apply(st, op('ZII'));
      assert.equal(S.peek(st, op('XII')), -1);
      assert.equal(S.peek(st, op('IIX')), -1);
    }
  });

  test('and it entangles: on |+⟩|0⟩ it makes a Bell pair', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const rng = QEC.makeRng(seed), st = S.create(3);
      S.reset(st, 0, 'X', rng); S.reset(st, 1, 'X', rng);
      const m1 = S.measure(st, op('ZZI'), rng).outcome < 0 ? 1 : 0;
      const m2 = S.measure(st, op('IXX'), rng).outcome < 0 ? 1 : 0;
      const m3 = S.measure(st, op('IZI'), rng).outcome < 0 ? 1 : 0;
      if (m1 ^ m3) S.apply(st, op('IIX'));
      if (m2) S.apply(st, op('ZII'));
      assert.equal(S.peek(st, op('ZIZ')), 1);
      assert.equal(S.peek(st, op('XIX')), 1);
    }
  });

  test('wrong questions fail the test: Z(h)·Z(t) instead of X(h)·X(t)', () => {
    const wrong = [{ op: op('ZZI') }, { op: op('IZZ') }, { read: 'Z' }];
    const res = G.xorTest(wrong, QEC.makeRng(7));
    assert.equal(res.ok, false);
    // on 0s and 1s it looks fine, because the fix-up secretly reads c; only the pair input shows it
    assert.ok(res.rows.slice(0, 4).every(r => r.ok));
    assert.equal(res.rows[4].sameX, false);
  });

  test('reading c outright and flipping t is no CNOT either', () => {
    const peek = [{ op: op('ZZI') }, { read: 'Z' }];
    assert.equal(G.xorTest(peek, QEC.makeRng(9)).ok, false);
  });

  test('asking Z(c)·Z(h) twice is still a correct CNOT (the second answer is sure to match)', () => {
    const twice = [{ op: op('ZZI') }, { op: op('ZZI') }, { op: op('IXX') }, { read: 'Z' }];
    for (let seed = 1; seed <= 10; seed++) assert.ok(G.xorTest(twice, QEC.makeRng(seed)).ok, 'seed ' + seed);
  });

  test('the right questions in the wrong order fail too', () => {
    const swapped = [{ op: op('IXX') }, { op: op('ZZI') }, { read: 'Z' }];
    assert.equal(G.xorTest(swapped, QEC.makeRng(8)).ok, false);
  });
});
