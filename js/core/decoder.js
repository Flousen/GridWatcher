// Syndromes, outcome checks and two decoders.
//
// Surface and repetition codes are "CSS" codes: Z-checks only see the X part of an error and
// X-checks only see the Z part. So we decode the two parts separately, each on its own graph.
(function (QEC) {
  'use strict';
  const P = QEC.Pauli;

  // Which checks light up for this error? 1 = lit (the check anticommutes with the error).
  function syndrome(code, err) {
    return code.stabPaulis.map(s => (P.commutes(s, err) ? 0 : 1));
  }

  function isZero(syn) { return syn.every(v => v === 0); }

  // What happened after error + correction?
  //   'syndrome' – some check is still lit
  //   'logical'  – checks are quiet, but the stored information was flipped
  //   'ok'       – the leftover is harmless (nothing, or a product of checks)
  function residualStatus(code, err, corr) {
    const r = P.compose(err, corr);
    if (!isZero(syndrome(code, r))) return 'syndrome';
    if (!P.commutes(r, code.logicalX) || !P.commutes(r, code.logicalZ)) return 'logical';
    return 'ok';
  }

  // Checks of type T detect errors of type FIXES[T] and are corrected with that Pauli.
  const FIXES = { Z: 'X', X: 'Z' };

  // Matching graph for checks of one type: nodes are those checks plus one "boundary" node,
  // and every data qubit is an edge between the (one or two) checks it touches.
  function matchingGraph(code, type) {
    code._graphs = code._graphs || {};
    if (code._graphs[type]) return code._graphs[type];
    const ids = [];                       // local node id → global stab index
    code.stabs.forEach((s, k) => { if (s.type === type) ids.push(k); });
    const local = new Map(ids.map((k, i) => [k, i]));
    const B = ids.length;                 // boundary node
    const adj = Array.from({ length: B + 1 }, () => []);
    for (let q = 0; q < code.n; q++) {
      const touching = [];
      code.stabs.forEach((s, k) => { if (s.type === type && s.qubits.includes(q)) touching.push(local.get(k)); });
      if (touching.length === 0) continue;
      if (touching.length > 2) throw new Error('qubit in more than two checks of one type');
      const [a, b = B] = touching;
      adj[a].push({ to: b, q });
      adj[b].push({ to: a, q });
    }
    return (code._graphs[type] = { ids, B, adj });
  }

  function bfs(graph, src) {
    const dist = new Array(graph.adj.length).fill(Infinity);
    const prev = new Array(graph.adj.length).fill(null);  // {from, q}
    dist[src] = 0;
    const queue = [src];
    for (let h = 0; h < queue.length; h++) {
      const u = queue[h];
      for (const { to, q } of graph.adj[u]) {
        if (dist[to] === Infinity) { dist[to] = dist[u] + 1; prev[to] = { from: u, q }; queue.push(to); }
      }
    }
    return { dist, prev };
  }

  // Greedy matching: repeatedly pair up the two closest lit checks (or a lit check with the edge).
  // Simple and fast, but not always optimal.
  function greedyPairs(k, pairW, edgeW) {
    const cand = [];
    for (let a = 0; a < k; a++) {
      cand.push({ a, b: -1, w: edgeW[a] });
      for (let b = a + 1; b < k; b++) cand.push({ a, b, w: pairW[a][b] });
    }
    // On ties prefer pairing two checks: matching both to the edge would cost twice as much.
    cand.sort((u, v) => u.w - v.w || (u.b < 0) - (v.b < 0));
    const used = new Set(), out = [];
    for (const { a, b, w } of cand) {
      if (w === Infinity || used.has(a) || (b >= 0 && used.has(b))) continue;
      used.add(a);
      if (b >= 0) used.add(b);
      out.push([a, b]);
    }
    return out;
  }

  // Minimum-weight matching, exact, by dynamic programming over subsets of lit checks.
  // Cost grows like 2^k, so it is only used for up to MAX_EXACT lit checks.
  const MAX_EXACT = 14;
  function exactPairs(k, pairW, edgeW) {
    const full = (1 << k) - 1;
    const cost = new Float64Array(1 << k).fill(Infinity);
    const pick = new Int8Array(1 << k);
    cost[full] = 0;
    for (let mask = full - 1; mask >= 0; mask--) {
      let i = 0;
      while ((mask >> i) & 1) i++;
      const m1 = mask | (1 << i);
      let best = edgeW[i] + cost[m1], choice = -1;
      for (let j = i + 1; j < k; j++) {
        if ((mask >> j) & 1) continue;
        const c = pairW[i][j] + cost[m1 | (1 << j)];
        if (c < best) { best = c; choice = j; }
      }
      cost[mask] = best;
      pick[mask] = choice;
    }
    const out = [];
    for (let mask = 0; mask !== full;) {
      let i = 0;
      while ((mask >> i) & 1) i++;
      const j = pick[mask];
      out.push([i, j]);
      mask |= (1 << i) | (j >= 0 ? 1 << j : 0);
    }
    return out;
  }

  // Shared skeleton: find lit checks, measure distances, pair them up, flip qubits along the paths.
  function decodeWith(pairUp) {
    return function (code, syn) {
      const corr = P.identity(code.n);
      for (const type of ['Z', 'X']) {
        const g = matchingGraph(code, type);
        const defects = [];
        g.ids.forEach((k, i) => { if (syn[k]) defects.push(i); });
        if (!defects.length) continue;
        const trees = defects.map(d => bfs(g, d));
        const edgeW = trees.map(t => t.dist[g.B]);
        const pairW = trees.map(t => defects.map(d => t.dist[d]));
        const pairs = (pairUp === 'greedy' || defects.length > MAX_EXACT)
          ? greedyPairs(defects.length, pairW, edgeW)
          : exactPairs(defects.length, pairW, edgeW);
        for (const [a, b] of pairs) {
          const { prev } = trees[a];
          for (let v = b >= 0 ? defects[b] : g.B; prev[v]; v = prev[v].from) P.applyAt(corr, prev[v].q, FIXES[type]);
        }
      }
      return corr;
    };
  }

  const greedyDecode = decodeWith('greedy');
  const matchingDecode = decodeWith('exact');

  // Exact minimum-weight decoder by brute force. Only for small codes (n ≤ 16), e.g. d = 3.
  function lookupDecode(code, syn) {
    if (code.n > 16) throw new Error('lookup decoder is only for small codes');
    code._lookup = code._lookup || {};
    const corr = P.identity(code.n);
    for (const type of ['Z', 'X']) {
      const ks = [];
      code.stabs.forEach((s, k) => { if (s.type === type) ks.push(k); });
      if (!ks.length) continue;
      if (!code._lookup[type]) {
        const table = new Map();     // syndrome key → best qubit mask
        for (let mask = 0; mask < (1 << code.n); mask++) {
          let key = 0;
          ks.forEach((k, bit) => {
            let parity = 0;
            for (const q of code.stabs[k].qubits) parity ^= (mask >> q) & 1;
            key |= parity << bit;
          });
          const best = table.get(key);
          if (best === undefined || popcount(mask) < popcount(best)) table.set(key, mask);
        }
        code._lookup[type] = table;
      }
      let key = 0;
      ks.forEach((k, bit) => { key |= syn[k] << bit; });
      const mask = code._lookup[type].get(key) || 0;
      for (let q = 0; q < code.n; q++) if ((mask >> q) & 1) P.applyAt(corr, q, FIXES[type]);
    }
    return corr;
  }

  function popcount(m) { let c = 0; while (m) { c += m & 1; m >>>= 1; } return c; }

  QEC.decoder = { syndrome, isZero, residualStatus, matchingGraph, greedyDecode, matchingDecode, lookupDecode };
})(window.QEC = window.QEC || {});
