suite('hamming puzzle', () => {
  const H = QEC.hamming;
  const wiring = obj => new Map(Object.entries(obj).map(([s, ns]) => [Number(s), new Set(ns)]));
  const check = (conns, nodeCount) =>
    H.findCollision(Array.from({ length: nodeCount }, (_, i) => H.alarmPattern(conns, i)));

  test('alarm pattern lists the sensors wired to a node, sorted', () => {
    const conns = wiring({ 2: [0], 0: [0, 1] });
    assert.deepEqual(H.alarmPattern(conns, 0).triggered, [0, 2]);
    assert.equal(H.alarmPattern(conns, 0).key, '0,2');
  });

  test('level 1 solution: 3 nodes, patterns {S1}, {S2}, {S1+S2}', () => {
    assert.equal(check(wiring({ 0: [0, 2], 1: [1, 2] }), 3), null);
  });

  test('two nodes with the same pattern → collision', () => {
    assert.deepEqual(check(wiring({ 0: [0, 1], 1: [2] }), 3), { n1: 0, n2: 1 });
  });

  test('a node without sensors → isolated', () => {
    assert.deepEqual(check(wiring({ 0: [0], 1: [1] }), 3), { n1: 2, n2: -1, isolated: true });
  });

  test('Hamming(7,4): node i wired to sensor b iff bit b of (i+1) is set', () => {
    const w = {};
    for (let b = 0; b < 3; b++) w[b] = [0, 1, 2, 3, 4, 5, 6].filter(i => ((i + 1) >> b) & 1);
    assert.equal(check(wiring(w), 7), null);
  });

  test('locate: with a valid wiring every node\'s alarm names exactly that node', () => {
    const w = {};
    for (let b = 0; b < 3; b++) w[b] = [0, 1, 2, 3, 4, 5, 6].filter(i => ((i + 1) >> b) & 1);
    const conns = wiring(w), ids = [0, 1, 2, 3, 4, 5, 6];
    for (const id of ids) assert.deepEqual(H.locate(conns, ids, H.alarmPattern(conns, id).triggered), [id], `node ${id}`);
  });

  test('locate: a collision leaves the alarm ambiguous', () => {
    const conns = wiring({ 0: [0, 1], 1: [2] });
    assert.deepEqual(H.locate(conns, [0, 1, 2], [0]), [0, 1]);
  });

  test('wire cap never refuses a wiring with distinct syndromes (2–4 sensors)', () => {
    // Worst case for sensor b: every non-zero syndrome with bit b set is used.
    for (let k = 2; k <= 4; k++) {
      for (let b = 0; b < k; b++) {
        let ones = 0;
        for (let s = 1; s < 2 ** k; s++) if ((s >> b) & 1) ones++;
        assert.ok(ones <= H.maxWires(k), `${k} sensors, sensor ${b + 1}: ${ones} wires > cap ${H.maxWires(k)}`);
      }
    }
  });

  test('Quad Signal plan from the review fits: six weight-2 + 0111, 1011, 1101', () => {
    const plan = [0b0011, 0b0101, 0b0110, 0b1001, 0b1010, 0b1100, 0b0111, 0b1011, 0b1101];
    for (let b = 0; b < 4; b++) {
      const ones = plan.filter(s => (s >> b) & 1).length;
      assert.ok(ones <= H.maxWires(4), `sensor ${b + 1}: ${ones}`);
    }
  });
});
