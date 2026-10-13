// Monte Carlo: how often does a code + decoder fail at physical error rate p?
// Noise model ("code capacity"): every data qubit independently gets an X error with probability p,
// checks are measured perfectly. Simple on purpose — real thresholds with noisy checks are lower (~1%).
(function (QEC) {
  'use strict';
  const P = QEC.Pauli, D = QEC.decoder;

  function sampleError(code, p, rng, type = 'X') {
    const err = P.identity(code.n);
    for (let q = 0; q < code.n; q++) if (rng() < p) P.applyAt(err, q, type);
    return err;
  }

  // One full round: noise → syndrome → decoder → outcome.
  function shot(code, p, rng, decode = D.matchingDecode) {
    const err = sampleError(code, p, rng);
    const syn = D.syndrome(code, err);
    const corr = decode(code, syn);
    return { err, syn, corr, status: D.residualStatus(code, err, corr) };
  }

  function logicalErrorRate(code, p, shots, rng, decode = D.matchingDecode) {
    let fails = 0;
    for (let i = 0; i < shots; i++) if (shot(code, p, rng, decode).status !== 'ok') fails++;
    return { fails, shots, rate: fails / shots };
  }

  QEC.sim = { sampleError, shot, logicalErrorRate };
})(window.QEC = window.QEC || {});
