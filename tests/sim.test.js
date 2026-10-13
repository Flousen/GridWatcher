suite('threshold simulation', () => {
  const S = QEC.sim, C = QEC.codes;
  const d3 = C.rotatedSurfaceCode(3), d5 = C.rotatedSurfaceCode(5);

  test('p = 0 never fails', () => {
    assert.equal(S.logicalErrorRate(d5, 0, 200, QEC.makeRng(1)).fails, 0);
  });

  test('low noise (p = 0.02): bigger code is better', () => {
    const r3 = S.logicalErrorRate(d3, 0.02, 4000, QEC.makeRng(7)).rate;
    const r5 = S.logicalErrorRate(d5, 0.02, 4000, QEC.makeRng(7)).rate;
    assert.less(r5, r3, `d5=${r5} d3=${r3}`);
  });

  test('high noise (p = 0.2): bigger code is worse', () => {
    const r3 = S.logicalErrorRate(d3, 0.2, 4000, QEC.makeRng(7)).rate;
    const r5 = S.logicalErrorRate(d5, 0.2, 4000, QEC.makeRng(7)).rate;
    assert.less(r3, r5, `d3=${r3} d5=${r5}`);
  });
});
