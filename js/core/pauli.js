// Pauli operators on n qubits, stored as two bit arrays (the "binary symplectic" form):
//   x[i] = 1  → operator has an X part on qubit i
//   z[i] = 1  → operator has a Z part on qubit i
//   both = 1  → Y (up to a global phase, which never matters for error correction)
// Tracking errors this way is exact, not an analogy: it's how real QEC software does it.
(function (QEC) {
  'use strict';

  const BITS = { I: [0, 0], X: [1, 0], Z: [0, 1], Y: [1, 1] };

  function identity(n) {
    return { x: new Array(n).fill(0), z: new Array(n).fill(0) };
  }

  // Pauli of a given type ('X' | 'Y' | 'Z') on a list of qubits.
  function on(n, qubits, type) {
    const p = identity(n);
    const [bx, bz] = BITS[type];
    for (const q of qubits) { p.x[q] = bx; p.z[q] = bz; }
    return p;
  }

  function fromString(s) {
    const p = identity(s.length);
    for (let i = 0; i < s.length; i++) [p.x[i], p.z[i]] = BITS[s[i]];
    return p;
  }

  function letter(x, z) { return x ? (z ? 'Y' : 'X') : (z ? 'Z' : 'I'); }

  function toString(p) {
    return p.x.map((x, i) => letter(x, p.z[i])).join('');
  }

  function get(p, i) { return letter(p.x[i], p.z[i]); }

  function clone(p) { return { x: p.x.slice(), z: p.z.slice() }; }

  // Product of two Paulis (phase dropped): bitwise XOR.
  function compose(a, b) {
    return { x: a.x.map((v, i) => v ^ b.x[i]), z: a.z.map((v, i) => v ^ b.z[i]) };
  }

  // Multiply a single-qubit Pauli onto qubit i, in place.
  function applyAt(p, i, type) {
    const [bx, bz] = BITS[type];
    p.x[i] ^= bx; p.z[i] ^= bz;
    return p;
  }

  // Two Paulis commute iff they "clash" (X meets Z) on an even number of qubits.
  function commutes(a, b) {
    let s = 0;
    for (let i = 0; i < a.x.length; i++) s ^= (a.x[i] & b.z[i]) ^ (a.z[i] & b.x[i]);
    return s === 0;
  }

  function weight(p) {
    let w = 0;
    for (let i = 0; i < p.x.length; i++) if (p.x[i] || p.z[i]) w++;
    return w;
  }

  function isIdentity(p) { return weight(p) === 0; }

  function equal(a, b) { return toString(a) === toString(b); }

  QEC.Pauli = { identity, on, fromString, toString, letter, get, clone, compose, applyAt, commutes, weight, isIdentity, equal };
})(window.QEC = window.QEC || {});
