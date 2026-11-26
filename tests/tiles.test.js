suite('tiles (lattice-surgery board)', () => {
  const P = QEC.Pauli, T = QEC.tiles, G = QEC.surgery;
  const k = T.key;
  const plan = ({ hall = [], joins = [], glues = [] }) => ({ hall: new Set(hall), joins: new Set(joins), glues: new Set(glues) });
  const opStr = m => P.toString(m.op);

  test('a square patch has Z, X, Z, X boundaries around it', () => {
    const b = T.create({ w: 2, h: 2, nq: 1 });
    const p = T.place(b, { label: 'q1', q: 0, c: 0, r: 0 }).patch;
    assert.deepEqual(T.segsOf(p).map(s => s.side + s.type + s.bnd), ['TZ0', 'RX1', 'BZ2', 'LX3']);
  });

  test('a wide patch: long side Z, the mixed side shows Z then X, still four boundaries', () => {
    const b = T.create({ w: 3, h: 2, nq: 1 });
    const p = T.place(b, { label: 'q1', q: 0, c: 0, r: 0, wide: true, mixed: 'B' }).patch;
    const segs = T.segsOf(p);
    assert.equal(segs.length, 6);
    assert.deepEqual(segs.filter(s => s.side === 'B').map(s => s.type), ['X', 'Z']);
    assert.equal(new Set(segs.map(s => s.bnd)).size, 4);
    assert.ok(segs.every(s => (s.bnd % 2 === 0) === (s.type === 'Z')), 'boundaries alternate Z, X, Z, X');
  });

  test('glue across a border measures the edge types that face each other', () => {
    const b = T.create({ w: 2, h: 2, nq: 2 });
    T.place(b, { label: 'q1', q: 0, c: 0, r: 0, fresh: false });
    T.place(b, { label: 'q2', q: 1, c: 0, r: 1, fresh: false });
    T.place(b, { label: 'q3', q: 1, c: 1, r: 0, fresh: false });
    const zz = T.measurements(b, plan({ glues: [T.glueAt(b, T.segAt(b, 0, 0, 'B'))] }));
    assert.equal(opStr(zz.ms[0]), 'ZZ');
    const xx = T.measurements(b, plan({ glues: [T.glueAt(b, T.segAt(b, 0, 0, 'R'))] }));
    assert.equal(opStr(xx.ms[0]), 'XX');
  });

  test('the same border gives the same key from either side', () => {
    const b = T.create({ w: 2, h: 1, nq: 2 });
    T.place(b, { label: 'q1', q: 0, c: 0, r: 0 });
    T.place(b, { label: 'q2', q: 1, c: 1, r: 0 });
    assert.equal(T.glueAt(b, T.segAt(b, 0, 0, 'R')), T.glueAt(b, T.segAt(b, 1, 0, 'L')));
  });

  test('a hallway costs 1 step whatever its length, and its tiles count', () => {
    const b = G.board('hallway');
    const r = T.measurements(b, plan({ hall: [k(0, 1), k(1, 1), k(2, 1), k(3, 1), k(4, 1)], joins: ['0,0,B', '4,0,B'] }));
    assert.ok(r.ok, r.why);
    assert.equal(opStr(r.ms[0]), 'ZIZI');
    const before = T.tiles(b);
    T.book(b, r.ms);
    assert.equal(b.steps, 1);
    assert.equal(T.tiles(b), before + 5);
  });

  test('two pieces of hallway are two questions; a piece that joins nothing is refused', () => {
    const b = G.board('hallway');
    const two = T.measurements(b, plan({ hall: [k(0, 1), k(4, 1)], joins: ['0,0,B', '4,0,B'] }));
    assert.equal(two.ms.length, 2);
    const idle = T.measurements(b, plan({ hall: [k(0, 1), k(2, 0)], joins: ['0,0,B'] }));
    assert.equal(idle.ok, false);
    assert.deepEqual(idle.mark.cells, [k(2, 0)]);
  });

  test('a joined edge must touch the hallway; hallways run over free tiles only', () => {
    const b = G.board('hallway');
    assert.equal(T.measurements(b, plan({ hall: [k(0, 1)], joins: ['0,0,B', '4,0,B'] })).ok, false);
    assert.equal(T.measurements(b, plan({ hall: [k(0, 0)], joins: [] })).ok, false);
  });

  test('both edges of a square patch (corner) are refused: Y needs a widened patch', () => {
    const b = T.create({ w: 2, h: 2, nq: 1 });
    T.place(b, { label: 'q1', q: 0, c: 0, r: 0, fresh: false });
    const r = T.measurements(b, plan({ hall: [k(1, 0), k(1, 1), k(0, 1)], joins: ['0,0,R', '0,0,B'] }));
    assert.equal(r.ok, false);
    assert.ok(/widen/.test(r.why));
  });

  test('two different Z boundaries of one patch are refused', () => {
    const b = T.create({ w: 3, h: 3, nq: 1 });
    T.place(b, { label: 'q1', q: 0, c: 1, r: 1, fresh: false });
    const ring = [k(0, 0), k(1, 0), k(2, 0), k(2, 1), k(2, 2), k(1, 2)];
    assert.equal(T.measurements(b, plan({ hall: ring, joins: ['1,1,T', '1,1,B'] })).ok, false);
  });

  test('questions that clash cannot share a step; neither can two questions on one patch', () => {
    const b = G.board('xor');
    T.place(b, { label: 'h', q: 1, c: 0, r: 1 });
    const g1 = T.glueAt(b, T.segAt(b, 0, 0, 'B')), g2 = T.glueAt(b, T.segAt(b, 0, 1, 'R'));
    const r = T.measurements(b, plan({ glues: [g1, g2] }));
    assert.equal(r.ok, false);
    assert.ok(/disturb/.test(r.why));
    const c = G.board('compact');
    const twice = T.measurements(c, plan({ hall: [k(0, 1), k(1, 1)], joins: ['0,0,B', '1,0,B'], glues: [T.glueAt(c, T.segAt(c, 2, 0, 'R'))] }));
    assert.equal(twice.ok, true, 'Z1·Z2 and X3·X4 on separate patches may share a step');
    const shared = T.measurements(c, plan({ hall: [k(0, 1), k(1, 1)], joins: ['0,0,B', '1,0,B'], glues: [T.glueAt(c, T.segAt(c, 1, 0, 'R'))] }));
    assert.equal(shared.ok, false);
  });

  test('move: 1 step over free tiles, never onto the lane, never through patches', () => {
    const b = G.board('glue');
    const q2 = T.byLabel(b, 'q2');
    assert.ok(T.move(b, q2.id, 0, 1).ok);
    assert.equal(b.steps, 1);
    const c = G.board('compact');
    assert.equal(T.move(c, T.byLabel(c, 'q1').id, 0, 1).ok, false);
    const boxed = T.create({ w: 3, h: 1, nq: 2 });
    T.place(boxed, { label: 'a', q: 0, c: 0, r: 0, fresh: false });
    T.place(boxed, { label: 'b', q: 1, c: 1, r: 0, fresh: false });
    assert.equal(T.move(boxed, 1, 2, 0).ok, false);
  });

  test('turn: 3 steps and a free neighbour; free for a fresh patch', () => {
    const c = G.board('compact');
    const q2 = T.byLabel(c, 'q2');
    const r = T.turn(c, q2.id);
    assert.ok(r.ok);
    assert.equal(c.steps, 3);
    assert.equal(r.helper, k(1, 1));
    assert.equal(T.segAt(c, 1, 0, 'B').type, 'X');
    const f = T.create({ w: 1, h: 1, nq: 1 });
    T.place(f, { label: 'q1', q: 0, c: 0, r: 0 });
    assert.ok(T.turn(f, 1).ok, 'a fresh patch turns without a free neighbour');
    assert.equal(f.steps, 0);
  });

  test('a fresh patch put somewhere else leaves no used tile behind', () => {
    const b = G.board('free');
    const p = T.place(b, { label: 'q1', q: 0, c: 0, r: 0 }).patch;
    T.move(b, p.id, 3, 3);
    assert.equal(T.tiles(b), 1);
    assert.equal(b.steps, 0);
  });

  test('widen opens the side that has room, so both edges face it', () => {
    const b = G.board('hallway');
    T.widen(b, T.byLabel(b, 'q2').id, 'R');
    const q2 = T.byLabel(b, 'q2');
    assert.equal(q2.mixed, 'T');
    assert.deepEqual(T.segsOf(q2).filter(s => s.side === 'T').sort((a, z) => a.c - z.c).map(s => s.type), ['X', 'Z']);
  });

  test('opText writes Z₁·X₃ and Z(c)·Z(h)', () => {
    assert.equal(T.opText(P.fromString('ZIX'), q => ['q1', 'q2', 'q3'][q]), 'Z₁·X₃');
    assert.equal(T.opText(P.fromString('ZZI'), q => ['c', 'h', 't'][q]), 'Z(c)·Z(h)');
  });
});

suite('surgery: every job can be done, within its stated cost', () => {
  const P = QEC.Pauli, T = QEC.tiles, G = QEC.surgery;
  const k = T.key;
  const run = (b, p) => {
    const r = T.measurements(b, { hall: new Set(p.hall || []), joins: new Set(p.joins || []), glues: new Set(p.glues || []) });
    if (!r.ok) throw new Error(r.why);
    T.book(b, r.ms);
    return r.ms.map(m => P.toString(m.op));
  };
  const glue = (b, c, r, side) => T.glueAt(b, T.segAt(b, c, r, side));

  test('GLUE: move q2 under q1, glue: Z₁·Z₂ in 1 move + 1 step', () => {
    const b = G.board('glue');
    T.move(b, T.byLabel(b, 'q2').id, 0, 1);
    assert.deepEqual(run(b, { glues: [glue(b, 0, 0, 'B')] }), G.JOBS.glue);
  });

  test('GLUE: next to q1 the X edges face each other, so that glue asks X₁·X₂', () => {
    const b = G.board('glue');
    T.move(b, T.byLabel(b, 'q2').id, 1, 0);
    assert.deepEqual(run(b, { glues: [glue(b, 0, 0, 'R')] }), ['XX']);
  });

  test('HALLWAY: all four jobs, one step each', () => {
    const b = G.board('hallway'), row = [0, 1, 2, 3, 4].map(c => k(c, 1));
    assert.deepEqual(run(b, { hall: row, joins: ['0,0,B', '4,0,B'] }), [G.JOBS.hallway[0]]);
    assert.deepEqual(run(b, { hall: row, joins: ['0,0,B', '4,0,B', '2,2,T'] }), [G.JOBS.hallway[1]]);
    assert.deepEqual(run(b, { hall: row, joins: ['0,2,T', '4,0,B'] }), [G.JOBS.hallway[2]]);
    T.widen(b, T.byLabel(b, 'q2').id, 'R');
    assert.deepEqual(run(b, { hall: [k(0, 1), k(1, 1)], joins: ['0,2,T', '1,2,T'] }), [G.JOBS.hallway[3]]);
  });

  test('XOR: h in the corner makes the recipe work: 2 steps, 3 tiles, passes the test', () => {
    const b = G.board('xor');
    T.place(b, { label: 'h', q: 1, c: 0, r: 1 });
    const done = [];
    for (const g of [glue(b, 0, 0, 'B'), glue(b, 0, 1, 'R')]) {
      const r = T.measurements(b, { glues: new Set([g]) });
      assert.ok(r.ok, r.why);
      T.book(b, r.ms);
      done.push({ op: r.ms[0].op });
    }
    assert.deepEqual(done.map(d => P.toString(d.op)), ['ZZI', 'IXX']);
    assert.equal(b.steps, 2);
    assert.equal(T.tiles(b), 3);
    assert.ok(G.xorTest([...done, { read: 'Z' }], QEC.makeRng(1)).ok);
  });

  test('XOR: h placed anywhere else cannot glue both questions', () => {
    for (const [c, r] of [[1, 0], [2, 0], [2, 1]]) {
      for (const tb of ['Z', 'X']) {
        const b = G.board('xor');
        T.place(b, { label: 'h', q: 1, c, r, tb });
        const ops = T.borders(b).map(x => {
          const m = T.measurements(b, { glues: new Set([x.key]) });
          return P.toString(m.ms[0].op);
        });
        assert.ok(!(ops.includes('ZZI') && ops.includes('IXX')), `h at ${c},${r} (${tb})`);
      }
    }
  });

  test('TILES OR STEPS, compact: turn q2, then one hallway: 6 tiles × 4 steps', () => {
    const b = G.board('compact');
    T.turn(b, T.byLabel(b, 'q2').id);
    assert.deepEqual(run(b, { hall: [k(1, 1), k(2, 1)], joins: ['1,0,B', '2,0,B'] }), G.JOBS.compact);
    assert.equal(b.steps, 4);
    assert.equal(T.tiles(b), 6);
  });

  test('TILES OR STEPS, compact: without a turn no hallway reaches X₂', () => {
    const b = G.board('compact');
    const segs = T.segsOf(T.byLabel(b, 'q2')).filter(s => s.type === 'X');
    assert.ok(segs.every(s => !T.isFree(b, s.c + T.STEP[s.side][0], s.r + T.STEP[s.side][1])), 'its X edges face its neighbours');
  });

  test('TILES OR STEPS, wide: one hallway, 10 tiles × 1 step', () => {
    const b = G.board('wide');
    assert.deepEqual(run(b, { hall: [k(3, 1), k(4, 1)], joins: ['3,0,B', '4,0,B'] }), G.JOBS.wide);
    assert.equal(b.steps, 1);
    assert.equal(T.tiles(b), 10);
  });

  test('TILES OR STEPS, free round: the par plan (8 tiles × 2 steps) does all three jobs', () => {
    const b = G.board('free');
    G.FREE_LABELS.forEach((label, q) => T.place(b, { label, q, c: q, r: 0 }));
    const first = run(b, { hall: [k(0, 1), k(1, 1)], joins: ['0,0,B', '1,0,B'], glues: [glue(b, 2, 0, 'R')] });
    const second = run(b, { hall: [0, 1, 2, 3].map(c => k(c, 1)), joins: ['0,0,B', '1,0,B', '2,0,B', '3,0,B'] });
    assert.deepEqual([...first, ...second].sort(), G.JOBS.free.slice().sort());
    assert.equal(T.tiles(b), G.PAR.free.tiles);
    assert.equal(b.steps, G.PAR.free.steps);
  });

  test('the free round\'s jobs commute, so any order (or two at once) is a correct plan', () => {
    const ops = G.JOBS.free.map(s => P.fromString(s));
    for (const a of ops) for (const c of ops) assert.ok(P.commutes(a, c));
  });

  test('MAGIC: a hallway joins q1\'s and the magic tile\'s Z edges in 1 step', () => {
    const b = G.board('magic');
    assert.deepEqual(run(b, { hall: [k(0, 1), k(1, 1), k(2, 1)], joins: ['0,0,B', '2,0,B'] }), G.JOBS.magic);
  });
});
