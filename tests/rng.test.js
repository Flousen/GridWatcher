suite('shuffle bag', () => {
  const rng = () => QEC.makeRng(12345);

  test('every item appears once per pass before any repeats', () => {
    const draw = rng().bag(['X', 'Z', 'Y']);
    for (let pass = 0; pass < 50; pass++) {
      const got = [draw(), draw(), draw()].sort();
      assert.deepEqual(got, ['X', 'Y', 'Z'], `pass ${pass}`);
    }
  });

  test('never hands out the same item twice in a row', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const draw = QEC.makeRng(seed).bag(['X', 'Z', 'Y']);
      let prev = null;
      for (let i = 0; i < 60; i++) {
        const v = draw();
        assert.ok(v !== prev, `seed ${seed}, draw ${i}: ${v} repeated`);
        prev = v;
      }
    }
  });

  test('a single-item bag just keeps handing out that item', () => {
    const draw = rng().bag(['X']);
    assert.deepEqual([draw(), draw(), draw()], ['X', 'X', 'X']);
  });

  test('bagInt covers 0..n-1', () => {
    const draw = rng().bagInt(3);
    assert.deepEqual([draw(), draw(), draw()].sort(), [0, 1, 2]);
  });
});
