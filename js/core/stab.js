// A small stabilizer simulator for Chapter 7, at the level of whole (logical) qubits.
//
// The state of n qubits is stored as n "stabilizers": Pauli products the state is a +1 (or −1)
// eigenstate of, like Z for |0⟩ and X for |+⟩. Measuring a Pauli product then needs no 2ⁿ
// amplitudes, only bit operations (Aaronson & Gottesman 2004). This is why the game can show real
// lattice-surgery outcomes, and why it cannot follow magic states: they are not stabilizer states.
//
//   const s = QEC.stab.create(3);                  // |000⟩
//   QEC.stab.reset(s, 1, 'X', rng);                // qubit 1 → |+⟩
//   QEC.stab.measure(s, QEC.Pauli.fromString('ZZI'), rng)   // → { outcome: +1 | -1, random: bool }
//
// Paulis use the binary (x, z) form of QEC.Pauli; both bits set means Y.
(function (QEC) {
  'use strict';
  const P = QEC.Pauli;

  // Power of i picked up when Pauli letter (x1, z1) is multiplied from the left onto (x2, z2).
  function g(x1, z1, x2, z2) {
    if (!x1 && !z1) return 0;
    if (x1 && z1) return z2 - x2;
    if (x1) return z2 * (2 * x2 - 1);
    return x2 * (1 - 2 * z2);
  }

  // a · b for two commuting signed Paulis { x, z, s } (s = 1 means a minus sign). Returns a new one.
  function mul(a, b) {
    let e = 2 * a.s + 2 * b.s;
    for (let j = 0; j < a.x.length; j++) e += g(a.x[j], a.z[j], b.x[j], b.z[j]);
    e = ((e % 4) + 4) % 4;
    if (e !== 0 && e !== 2) throw new Error('stab: product of anticommuting Paulis');
    return { x: a.x.map((v, j) => v ^ b.x[j]), z: a.z.map((v, j) => v ^ b.z[j]), s: e / 2 };
  }

  function create(n) {
    const gens = [];
    for (let k = 0; k < n; k++) gens.push({ ...P.on(n, [k], 'Z'), s: 0 });
    return { n, gens };
  }

  function clone(st) {
    return { n: st.n, gens: st.gens.map(r => ({ x: r.x.slice(), z: r.z.slice(), s: r.s })) };
  }

  // Express p as a product of the generators (it must commute with all of them, and the state is
  // pure, so it does up to a sign). Returns that product, with its sign.
  function inGroup(st, p) {
    const n = st.n;
    // Gaussian elimination over the 2n bits, remembering which generators each row combines.
    const rows = st.gens.map((r, k) => ({ bits: r.x.concat(r.z), mask: [k] }));
    const target = { bits: p.x.concat(p.z), mask: [] };
    const used = new Array(n).fill(false);
    for (let col = 0; col < 2 * n; col++) {
      const piv = rows.findIndex((r, k) => !used[k] && r.bits[col]);
      if (piv < 0) continue;
      used[piv] = true;
      const xor = (a, b) => {
        a.bits = a.bits.map((v, j) => v ^ b.bits[j]);
        const m = new Set(a.mask);
        for (const k of b.mask) { if (m.has(k)) m.delete(k); else m.add(k); }
        a.mask = [...m];
      };
      rows.forEach((r, k) => { if (k !== piv && r.bits[col]) xor(r, rows[piv]); });
      if (target.bits[col]) xor(target, rows[piv]);
    }
    if (target.bits.some(Boolean)) throw new Error('stab: operator is not in the stabilizer group');
    let prod = { x: new Array(n).fill(0), z: new Array(n).fill(0), s: 0 };
    for (const k of target.mask) prod = mul(st.gens[k], prod);
    return prod;
  }

  // What would measuring p give, without doing it? +1, −1, or 0 for "a coin toss".
  function peek(st, p) {
    if (st.gens.some(r => !P.commutes(r, p))) return 0;
    return inGroup(st, p).s ? -1 : 1;
  }

  // Measure the Pauli product p (sign +). Random outcomes come from rng.
  function measure(st, p, rng) {
    const k = st.gens.findIndex(r => !P.commutes(r, p));
    if (k < 0) return { outcome: inGroup(st, p).s ? -1 : 1, random: false };
    for (let j = 0; j < st.n; j++) {
      if (j !== k && !P.commutes(st.gens[j], p)) st.gens[j] = mul(st.gens[j], st.gens[k]);
    }
    const s = rng() < 0.5 ? 0 : 1;
    st.gens[k] = { x: p.x.slice(), z: p.z.slice(), s };
    return { outcome: s ? -1 : 1, random: true };
  }

  // Apply the Pauli p to the state (a fix-up, or a glitch): flips the sign of every stabilizer
  // that anticommutes with it.
  function apply(st, p) {
    for (const r of st.gens) if (!P.commutes(r, p)) r.s ^= 1;
  }

  // Put qubit q into |0⟩ (basis 'Z') or |+⟩ (basis 'X'), whatever it held before:
  // measure it, then undo a −1 outcome. That is how a real chip reuses a qubit, too.
  function reset(st, q, basis, rng) {
    const n = st.n;
    const m = P.on(n, [q], basis);
    if (measure(st, m, rng).outcome < 0) apply(st, P.on(n, [q], basis === 'Z' ? 'X' : 'Z'));
  }

  // Textbook gates, used by the tests to check the lattice-surgery recipes against the real thing.
  function h(st, q) {
    for (const r of st.gens) {
      r.s ^= r.x[q] & r.z[q];
      [r.x[q], r.z[q]] = [r.z[q], r.x[q]];
    }
  }
  function cnot(st, a, b) {
    for (const r of st.gens) {
      r.s ^= r.x[a] & r.z[b] & (r.x[b] ^ r.z[a] ^ 1);
      r.x[b] ^= r.x[a];
      r.z[a] ^= r.z[b];
    }
  }

  QEC.stab = { create, clone, measure, peek, apply, reset, h, cnot, mul };
})(window.QEC = window.QEC || {});
