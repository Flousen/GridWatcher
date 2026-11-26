// What a lattice-surgery plan costs in physical qubits, and how likely it is to fail.
//
// Chapter 7, level 6 uses the player's own Chapter 6 model ("code capacity": each qubit gets an X
// flip with probability p, checks are perfect). The player measures the logical error rate of one
// patch for d = 3, 5, 7 at one p; larger d extend that trend (each +2 in d divides the rate by the
// same factor, which is what the code does below threshold). Litinski's realistic formula is here too,
// for the numbers the chapter quotes from his paper.
(function (QEC) {
  'use strict';

  // One tile for one step fails if an X chain or a Z chain gets through. The sweep measures X;
  // the code treats Z the same way, so both count with the measured rate.
  const tileStep = pL => 1 - (1 - pL) * (1 - pL);

  // A plan of n tile-steps fails if any one of them does.
  const runFail = (q, n) => 1 - Math.pow(1 - q, n);

  // Rates for any odd d ≥ 3 from measured rates at 3, 5, 7: { 3: r3, 5: r5, 7: r7 }.
  // Returns d → rate, plus the factor per +2 in d. Measured values are used as they are.
  function extend(m) {
    let f = m[7] > 0 ? Math.sqrt(m[3] / m[7]) : m[5] > 0 ? m[3] / m[5] : 10;
    if (!(f > 1)) f = 1;   // above threshold: bigger patches do not help
    const last = m[7] > 0 ? 7 : m[5] > 0 ? 5 : 3;
    const rate = d => (d in m && (d <= last || m[d] > 0) ? m[d] : m[last] / Math.pow(f, (d - last) / 2));
    return { rate, factor: f, measured: d => d <= last };
  }

  // The smallest d in ds whose plan of n tile-steps fails at most `budget` of the time, or null.
  function smallestSafe(rate, n, budget, ds) {
    for (const d of ds) if (runFail(tileStep(rate(d)), n) <= budget) return d;
    return null;
  }

  // Physical qubits: d × d data qubits per tile, and about as many helper qubits for the checks
  // (Litinski counts twice the data qubits, too).
  const physicalQubits = (tiles, d) => tiles * 2 * d * d;

  // Litinski's Eq. 10–11 (after Fowler & Gidney), with realistic noisy checks (threshold ≈ 1%):
  // a tile fails per code cycle with 0.1·(100p)^((d+1)/2), and a step takes d code cycles.
  const litinskiPL = (p, d) => 0.1 * Math.pow(100 * p, (d + 1) / 2);
  const litinskiFail = (tiles, steps, p, d) => tiles * steps * d * litinskiPL(p, d);

  // Magic-state factories (bonus level): each makes one magic state every `period` steps
  // (Litinski's 15-to-1 block: 11 tiles, 11 steps). The program uses them one per step, in order.
  // Returns the step at which the last one is used, and when each was used.
  function factoryRun(count, factories, period = 11) {
    const used = [];
    let t = 0;
    for (let k = 0; k < count; k++) {
      const ready = Math.floor(k / factories + 1) * period;   // batch k/f is ready at the end of its period
      t = Math.max(t + 1, ready + 1);
      used.push(t);
    }
    return { steps: t, used };
  }

  // The fewest factories (up to max) that finish `count` magic states in fewer than `goal` steps,
  // or null. More factories never make the program slower, so the first one that fits is the answer.
  function fewestFactories(count, goal, max = 8, period = 11) {
    for (let f = 1; f <= max; f++) if (factoryRun(count, f, period).steps < goal) return f;
    return null;
  }

  QEC.budget = { tileStep, runFail, extend, smallestSafe, physicalQubits, litinskiPL, litinskiFail, factoryRun, fewestFactories };
})(window.QEC = window.QEC || {});
