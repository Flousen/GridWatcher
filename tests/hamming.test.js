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
});
