// Chapter 7's board: protected qubits as tiles on a grid, and lattice surgery between them.
// The rules and costs follow D. Litinski, "A Game of Surface Codes" (Quantum 3, 128, 2019):
//
//   NEW patch on a free tile ........ 0 steps (a fresh patch may start in any orientation or width)
//   READ a patch in X or Z .......... 0 steps (the patch is gone afterwards)
//   GLUE two touching edges ......... 1 step  (two-patch measurement)
//   HALLWAY joining any edges ....... 1 step  (multi-patch measurement through ancilla tiles), any length
//   MOVE a patch over free tiles .... 1 step  (stretch, then shrink; free for a fresh patch)
//   WIDEN onto a free neighbour ..... 1 step  (afterwards one side shows both an X and a Z edge)
//   TURN a square patch ............. 3 steps (needs a free neighbour tile while it turns)
//
// Simplifications, said in the chapter: a turn is one action (Litinski: three small moves); Y needs
// a widened patch (both edges on one side); each patch answers at most one question per step; moves,
// turns and widenings take their own steps.
//
// Every edge of a patch is a "segment": one side of one of its tiles, with a type (X or Z) and the
// number of the boundary it belongs to (a patch has four boundaries: Z, X, Z, X around it).
// Joining a Z boundary to a measurement adds the patch's Z to the measured product, an X boundary
// its X, and both an X and a Z boundary its Y (= X and Z together).
(function (QEC) {
  'use strict';
  const P = QEC.Pauli;

  const STEP = { T: [0, -1], R: [1, 0], B: [0, 1], L: [-1, 0] };
  const OPP = { T: 'B', B: 'T', L: 'R', R: 'L' };
  const OTHER = { X: 'Z', Z: 'X' };
  const COST = { glue: 1, hall: 1, move: 1, widen: 1, turn: 3 };
  const key = (c, r) => c + ',' + r;
  const unkey = k => k.split(',').map(Number);
  const segKey = s => `${s.c},${s.r},${s.side}`;

  // ── Patches ──────────────────────────────────────────────────────────────
  // patch = { id, label, q, kind, c, r, wide, tb, mixed, fresh }
  //   q      index of the qubit it stores (in the stabilizer state)
  //   wide   false: one tile at (c, r); true: two tiles (c, r) and (c+1, r)
  //   tb     square: the type of its top and bottom edges; wide: the type of its long, unmixed side
  //   mixed  wide only: the side ('T' or 'B') that shows both an X and a Z edge
  //   fresh  made this step: may still be turned or widened for free
  function cellsOf(p) {
    return p.wide ? [{ c: p.c, r: p.r }, { c: p.c + 1, r: p.r }] : [{ c: p.c, r: p.r }];
  }

  function segsOf(p) {
    const { c, r, tb } = p, o = OTHER[tb];
    if (!p.wide) {
      return [
        { c, r, side: 'T', type: tb, bnd: 0 }, { c, r, side: 'R', type: o, bnd: 1 },
        { c, r, side: 'B', type: tb, bnd: 2 }, { c, r, side: 'L', type: o, bnd: 3 },
      ];
    }
    // Going round a wide patch: the long side (tb), the right end and the right half of the
    // mixed side (o), the left half of the mixed side (tb), the left end (o).
    const full = OPP[p.mixed], m = p.mixed;
    return [
      { c, r, side: full, type: tb, bnd: 0 }, { c: c + 1, r, side: full, type: tb, bnd: 0 },
      { c: c + 1, r, side: 'R', type: o, bnd: 1 }, { c: c + 1, r, side: m, type: o, bnd: 1 },
      { c, r, side: m, type: tb, bnd: 2 }, { c, r, side: 'L', type: o, bnd: 3 },
    ];
  }

  // ── Board ────────────────────────────────────────────────────────────────
  // lane: tiles reserved for hallways (patches may not stand there, but turns may borrow them).
  function create({ w, h, lane = [], nq = 8 }) {
    return { w, h, nq, lane: new Set(lane.map(([c, r]) => key(c, r))), patches: [], used: new Set(), steps: 0, nextId: 1 };
  }

  function clone(b) {
    return { ...b, lane: new Set(b.lane), used: new Set(b.used), patches: b.patches.map(p => ({ ...p })) };
  }

  const inside = (b, c, r) => c >= 0 && r >= 0 && c < b.w && r < b.h;
  function owner(b, c, r) {
    return b.patches.find(p => cellsOf(p).some(t => t.c === c && t.r === r)) || null;
  }
  const isFree = (b, c, r) => inside(b, c, r) && !owner(b, c, r);
  const patch = (b, id) => b.patches.find(p => p.id === id) || null;
  const byLabel = (b, label) => b.patches.find(p => p.label === label) || null;
  const tiles = b => b.used.size;

  function segAt(b, c, r, side) {
    const p = owner(b, c, r);
    return p ? segsOf(p).find(s => s.c === c && s.r === r && s.side === side) || null : null;
  }

  // Time passes: nothing is fresh any more.
  function tick(b, n) {
    b.steps += n;
    if (n > 0) for (const p of b.patches) p.fresh = false;
  }

  const fail = (why, mark = {}) => ({ ok: false, why, mark: { cells: [], segs: [], ...mark } });

  // Mark a patch's tiles as used. While it is fresh, remember which ones it added, so that a
  // fresh patch that is put somewhere else does not leave a used tile behind.
  function claim(b, p) {
    p.added = [];
    for (const t of cellsOf(p)) {
      const k = key(t.c, t.r);
      if (!b.used.has(k)) { b.used.add(k); p.added.push(k); }
    }
  }

  // NEW: a fresh patch on a free tile, 0 steps.
  // Patches a level starts with are not fresh (fresh: false): they were made long ago.
  function place(b, { label, q, c, r, tb = 'Z', kind = 'data', wide = false, mixed = 'B', fresh = true }) {
    const p = { id: b.nextId, label, q, kind, c, r, wide, tb, mixed, fresh };
    for (const t of cellsOf(p)) {
      if (!inside(b, t.c, t.r)) return fail('That is off the board.');
      if (owner(b, t.c, t.r)) return fail('That tile is taken.', { cells: [key(t.c, t.r)] });
      if (b.lane.has(key(t.c, t.r))) return fail('That tile is kept free for hallways.', { cells: [key(t.c, t.r)] });
    }
    b.nextId++;
    b.patches.push(p);
    claim(b, p);
    return { ok: true, patch: p, cost: 0 };
  }

  // READ (the measurement itself happens in the stabilizer state): the patch is gone, 0 steps.
  function remove(b, id) {
    const p = patch(b, id);
    if (p && p.fresh) for (const k of p.added || []) b.used.delete(k);   // never really there
    b.patches = b.patches.filter(p => p.id !== id);
    return { ok: true, cost: 0 };
  }

  // MOVE: stretch over free tiles to the new spot, then shrink, 1 step whatever the distance.
  // The tiles it stretches over count as used. Lane tiles may be crossed but not stood on.
  function move(b, id, c, r) {
    const p = patch(b, id);
    if (!p) return fail('No such patch.');
    if (p.c === c && p.r === r) return fail('It is already there.');
    const fits = (cc, rr) => cellsOf({ ...p, c: cc, r: rr }).every(t => inside(b, t.c, t.r) && (!owner(b, t.c, t.r) || owner(b, t.c, t.r) === p));
    if (!fits(c, r)) return fail('It does not fit there: the tiles must be free.', { cells: cellsOf({ ...p, c, r }).filter(t => inside(b, t.c, t.r)).map(t => key(t.c, t.r)) });
    if (cellsOf({ ...p, c, r }).some(t => b.lane.has(key(t.c, t.r)))) return fail('That tile is kept free for hallways.', { cells: cellsOf({ ...p, c, r }).map(t => key(t.c, t.r)) });
    // breadth-first search over positions, so the stretch goes the shortest way
    const prev = new Map([[key(p.c, p.r), null]]), queue = [[p.c, p.r]];
    while (queue.length) {
      const [cc, rr] = queue.shift();
      if (cc === c && rr === r) break;
      for (const [dc, dr] of Object.values(STEP)) {
        const k = key(cc + dc, rr + dr);
        if (!prev.has(k) && fits(cc + dc, rr + dr)) { prev.set(k, key(cc, rr)); queue.push([cc + dc, rr + dr]); }
      }
    }
    if (!prev.has(key(c, r))) return fail('No free path to that spot: a patch can only stretch over free tiles.');
    if (p.fresh) {   // a fresh patch may simply start at the new spot
      for (const k of p.added || []) b.used.delete(k);
      p.c = c; p.r = r;
      claim(b, p);
      return { ok: true, cost: 0 };
    }
    for (let k = key(c, r); k; k = prev.get(k)) {
      const [cc, rr] = unkey(k);
      for (const t of cellsOf({ ...p, c: cc, r: rr })) b.used.add(key(t.c, t.r));
    }
    p.c = c; p.r = r;
    tick(b, COST.move);
    return { ok: true, cost: COST.move };
  }

  // TURN a square patch: its X and Z edges swap places. 3 steps and a free neighbour tile,
  // except for a fresh patch, which may simply start the other way round.
  function turn(b, id) {
    const p = patch(b, id);
    if (!p) return fail('No such patch.');
    if (p.wide) return fail('Only one-tile patches turn here.');
    if (p.fresh) { p.tb = OTHER[p.tb]; return { ok: true, cost: 0 }; }
    const free = Object.values(STEP).map(([dc, dr]) => [p.c + dc, p.r + dr]).filter(([c, r]) => isFree(b, c, r));
    if (!free.length) return fail(`${p.label} needs one free neighbour tile to turn.`, { cells: [key(p.c, p.r)] });
    // borrow a tile the plan uses anyway if there is one
    free.sort((a, z) => b.used.has(key(...z)) - b.used.has(key(...a)));
    const helper = key(...free[0]);
    b.used.add(helper);
    p.tb = OTHER[p.tb];
    tick(b, COST.turn);
    return { ok: true, cost: COST.turn, helper };
  }

  // WIDEN a square patch onto its free left or right neighbour. Afterwards one side shows both an
  // X and a Z edge: the side with more free tiles next to it (the bottom, if that is a tie).
  function widen(b, id, dir) {
    const p = patch(b, id);
    if (!p) return fail('No such patch.');
    if (p.wide) return fail('It is already wide.');
    const nc = dir === 'L' ? p.c - 1 : p.c + 1;
    if (!isFree(b, nc, p.r)) return fail(`${p.label} needs a free tile on its ${dir === 'L' ? 'left' : 'right'} to widen.`, inside(b, nc, p.r) ? { cells: [key(nc, p.r)] } : {});
    if (b.lane.has(key(nc, p.r))) return fail('That tile is kept free for hallways.', { cells: [key(nc, p.r)] });
    const c0 = Math.min(p.c, nc);
    const room = side => [c0, c0 + 1].filter(c => isFree(b, c, p.r + STEP[side][1])).length;
    // the old top/bottom edges become the long side, so its type stays tb
    p.wide = true; p.c = c0; p.mixed = room('T') > room('B') ? 'T' : 'B';
    const nk = key(nc, p.r);
    if (!b.used.has(nk)) { b.used.add(nk); if (p.fresh) p.added.push(nk); }
    const cost = p.fresh ? 0 : COST.widen;
    tick(b, cost);
    return { ok: true, cost };
  }

  // ── Measurements ─────────────────────────────────────────────────────────
  // A border between two different patches, as the key of the segment on its left/top tile.
  function glueAt(b, s) {
    const [dc, dr] = STEP[s.side];
    const a = owner(b, s.c, s.r), o = owner(b, s.c + dc, s.r + dr);
    if (!a || !o || a === o) return null;
    return s.side === 'R' || s.side === 'B' ? segKey(s) : `${s.c + dc},${s.r + dr},${OPP[s.side]}`;
  }

  // Both segments of a border key.
  function borderSegs(b, k) {
    const [c, r, side] = k.split(',');
    const cc = Number(c), rr = Number(r), [dc, dr] = STEP[side];
    return [segAt(b, cc, rr, side), segAt(b, cc + dc, rr + dr, OPP[side])];
  }

  // All borders where two patches touch, with the edge types that face each other.
  function borders(b) {
    const out = [];
    for (const p of b.patches) {
      for (const s of segsOf(p)) {
        if (s.side !== 'R' && s.side !== 'B') continue;
        const k = glueAt(b, s);
        if (k) { const [, t] = borderSegs(b, k); out.push({ key: k, a: p, b: owner(b, t.c, t.r), ta: s.type, tb: t.type }); }
      }
    }
    return out;
  }

  // Turn the player's drawing into measurements, or say exactly what is wrong.
  //   plan = { hall: Set of tile keys, joins: Set of segment keys, glues: Set of border keys }
  // Each connected piece of hallway is one measurement (of every edge it joins), and so is each glue.
  // Returns { ok, ms: [{ kind, op, cells, segs, patches }] } or { ok: false, why, mark }.
  function measurements(b, { hall = new Set(), joins = new Set(), glues = new Set() }) {
    for (const k of hall) {
      const [c, r] = unkey(k);
      if (!inside(b, c, r) || owner(b, c, r)) return fail('A hallway can only run over free tiles.', { cells: [k] });
    }
    // connected pieces of hallway
    const piece = new Map(), pieces = [];
    for (const k of hall) {
      if (piece.has(k)) continue;
      const cells = [], stack = [k];
      piece.set(k, pieces.length);
      while (stack.length) {
        const cur = stack.pop(), [c, r] = unkey(cur);
        cells.push(cur);
        for (const [dc, dr] of Object.values(STEP)) {
          const n = key(c + dc, r + dr);
          if (hall.has(n) && !piece.has(n)) { piece.set(n, pieces.length); stack.push(n); }
        }
      }
      pieces.push({ kind: 'hall', cells, segs: [] });
    }
    for (const sk of joins) {
      const [c, r, side] = sk.split(','), cc = Number(c), rr = Number(r);
      const s = segAt(b, cc, rr, side);
      if (!s) return fail('That edge is gone.', { segs: [sk] });
      const [dc, dr] = STEP[side], t = key(cc + dc, rr + dr);
      if (!piece.has(t)) return fail(`That edge of ${owner(b, cc, rr).label} does not touch the hallway.`, { segs: [sk] });
      pieces[piece.get(t)].segs.push(s);
    }
    const empty = pieces.find(pc => !pc.segs.length);
    if (empty) return fail('This piece of hallway joins no edge. Tap the edges it should join, or clear it.', { cells: empty.cells });
    const ms = pieces.slice();
    for (const gk of glues) {
      const segs = borderSegs(b, gk);
      if (!segs[0] || !segs[1] || owner(b, segs[0].c, segs[0].r) === owner(b, segs[1].c, segs[1].r)) return fail('Those two edges no longer touch.', {});
      ms.push({ kind: 'glue', cells: [], segs, border: gk });
    }
    if (!ms.length) return fail('Nothing to run yet: glue two touching edges, or paint a hallway and join edges to it.');

    for (const m of ms) {
      const per = new Map();   // patch → { X: Set(bnd), Z: Set(bnd), segs }
      for (const s of m.segs) {
        const p = owner(b, s.c, s.r);
        if (!per.has(p)) per.set(p, { X: new Set(), Z: new Set(), segs: [] });
        const e = per.get(p);
        e[s.type].add(s.bnd);
        e.segs.push(s);
      }
      m.op = P.identity(b.nq);
      m.patches = [];
      for (const [p, e] of per) {
        const keys = e.segs.map(segKey);
        for (const t of ['X', 'Z']) {
          if (e[t].size > 1) return fail(`This joins two different ${t} edges of ${p.label}. Use one ${t} edge per qubit.`, { segs: keys });
        }
        if (e.X.size && e.Z.size && !(p.wide && e.segs.every(s => s.side === p.mixed))) {
          return fail(`To ask about both edges of ${p.label} at once (that is its Y), widen it first, so that both edges face the hallway on one side.`, { segs: keys });
        }
        P.applyAt(m.op, p.q, e.X.size && e.Z.size ? 'Y' : e.X.size ? 'X' : 'Z');
        m.patches.push(p);
      }
    }
    for (let i = 0; i < ms.length; i++) {
      for (let j = i + 1; j < ms.length; j++) {
        const mark = { cells: [...ms[i].cells, ...ms[j].cells], segs: [...ms[i].segs, ...ms[j].segs].map(segKey) };
        if (!P.commutes(ms[i].op, ms[j].op)) return fail('These two questions disturb each other, so they need separate steps.', mark);
        const both = ms[i].patches.find(p => ms[j].patches.includes(p));
        if (both) return fail(`${both.label} is in two questions at once. A patch answers one question per step.`, mark);
      }
    }
    return { ok: true, ms };
  }

  // Book a step of measurements: their hallway tiles count as used, the clock moves by 1.
  function book(b, ms) {
    for (const m of ms) for (const k of m.cells) b.used.add(k);
    tick(b, ms.length ? COST.hall : 0);
  }

  // "Z₁·X₃" for q-numbered patches, "Z(c)·X(t)" for named ones.
  const SUB = '₀₁₂₃₄₅₆₇₈₉';
  function opText(op, labelOf) {
    const parts = [];
    for (let q = 0; q < op.x.length; q++) {
      const l = P.get(op, q);
      if (l === 'I') continue;
      const name = labelOf(q) || `q${q + 1}`, m = /^q(\d+)$/.exec(name);
      parts.push(m ? l + [...m[1]].map(d => SUB[d]).join('') : `${l}(${name})`);
    }
    return parts.join('·') || '1';
  }

  QEC.tiles = {
    COST, STEP, OPP, key, unkey, segKey,
    create, clone, cellsOf, segsOf, inside, owner, isFree, patch, byLabel, segAt, tiles,
    place, remove, move, turn, widen, glueAt, borderSegs, borders, measurements, book, opText,
  };
})(window.QEC = window.QEC || {});
