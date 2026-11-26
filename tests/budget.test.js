suite('budget (cost and failure of a plan)', () => {
  const B = QEC.budget;

  test('Litinski Eq. 11: 164 tiles × 1.1·10⁹ steps at p = 10⁻⁴ → 19.8% at d = 11, 0.2% at d = 13', () => {
    const f11 = B.litinskiFail(164, 11e8, 1e-4, 11), f13 = B.litinskiFail(164, 11e8, 1e-4, 13);
    assert.ok(Math.abs(f11 - 0.198) < 0.001, String(f11));
    assert.ok(Math.abs(f13 - 0.0023) < 0.0001, String(f13));
  });

  test('a plan fails if any tile-step does; X and Z chains both count', () => {
    assert.ok(Math.abs(B.tileStep(0.01) - 0.0199) < 1e-12);
    assert.ok(Math.abs(B.runFail(0.5, 2) - 0.75) < 1e-12);
    assert.equal(B.runFail(0, 1000), 0);
  });

  test('extend keeps measured rates and divides by the same factor per +2 in d', () => {
    const e = B.extend({ 3: 1e-2, 5: 1e-3, 7: 1e-4 });
    assert.ok(Math.abs(e.factor - 10) < 1e-9);
    assert.equal(e.rate(5), 1e-3);
    assert.ok(Math.abs(e.rate(11) - 1e-6) < 1e-15);
    assert.ok(e.measured(7) && !e.measured(9));
  });

  test('extend copes with a measured zero at d = 7', () => {
    const e = B.extend({ 3: 4e-3, 5: 4e-4, 7: 0 });
    assert.ok(e.rate(7) > 0 && e.rate(9) < e.rate(7));
  });

  test('above threshold no d helps: the factor stays 1, smallestSafe finds nothing', () => {
    const e = B.extend({ 3: 0.2, 5: 0.25, 7: 0.3 });
    assert.equal(e.factor, 1);
    assert.equal(B.smallestSafe(e.rate, 48, 0.01, [3, 5, 7, 9, 11, 13]), null);
  });

  test('below threshold a 1000× longer plan needs only a few more sizes', () => {
    // rates like the player measures at p = 1% in the Chapter 6 model
    const e = B.extend({ 3: 2e-3, 5: 3e-4, 7: 5e-5 });
    const ds = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25];
    const d1 = B.smallestSafe(e.rate, 16, 0.01, ds), d2 = B.smallestSafe(e.rate, 16000, 0.01, ds);
    assert.ok(d1 <= 7, String(d1));
    assert.ok(d2 > d1 && d2 <= d1 + 10, `${d1} → ${d2}`);
  });

  test('physical qubits: 2d² per tile', () => {
    assert.equal(B.physicalQubits(16, 7), 1568);
  });

  test('factories: 6 magic states from one factory take 67 steps, from two 35', () => {
    assert.equal(B.factoryRun(6, 1).steps, 67);
    assert.equal(B.factoryRun(6, 2).steps, 35);
    assert.deepEqual(B.factoryRun(6, 2).used, [12, 13, 23, 24, 34, 35]);
    assert.equal(B.factoryRun(6, 6).steps, 17);
  });

  test('more factories are never slower; the fewest that finish 6 T gates in under 40 steps is 2', () => {
    for (let f = 1; f < 8; f++) assert.ok(B.factoryRun(6, f + 1).steps <= B.factoryRun(6, f).steps, `f = ${f}`);
    assert.equal(B.fewestFactories(6, 40), 2);
    assert.equal(B.fewestFactories(6, 70), 1);
    assert.equal(B.fewestFactories(6, 5), null, 'six T gates take at least six steps');
  });
});
