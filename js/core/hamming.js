// Logic of the Chapter 1 puzzle (classical syndromes), kept separate from drawing so it can be tested.
(function (QEC) {
  'use strict';

  // Which sensors fire when this node glitches? conns: Map sensorId → Set of nodeIds.
  function alarmPattern(conns, nodeId) {
    const triggered = [];
    for (const [sid, nodes] of conns) if (nodes.has(nodeId)) triggered.push(sid);
    triggered.sort((a, b) => a - b);
    return { nodeId, triggered, key: triggered.join(',') };
  }

  // First problem in the list of patterns, or null if every node is uniquely identifiable.
  //   { n1, n2: -1, isolated: true }  node n1 fires no sensor
  //   { n1, n2 }                       nodes n1 and n2 share a pattern
  function findCollision(results) {
    const seen = new Map();
    for (const r of results) {
      if (r.key === '') return { n1: r.nodeId, n2: -1, isolated: true };
      if (seen.has(r.key)) return { n1: seen.get(r.key), n2: r.nodeId };
      seen.set(r.key, r.nodeId);
    }
    return null;
  }

  // Decoding: which nodes would ring exactly these sensors? With a valid wiring (no collision)
  // every non-empty alarm names exactly one node — that is what the puzzle buys you.
  function locate(conns, nodeIds, fired) {
    const key = [...fired].sort((a, b) => a - b).join(',');
    return nodeIds.filter(id => alarmPattern(conns, id).key === key);
  }

  QEC.hamming = { alarmPattern, findCollision, locate };
})(window.QEC = window.QEC || {});
