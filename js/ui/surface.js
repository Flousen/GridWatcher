// Drawing a rotated surface code patch on a canvas (shared by Chapters 4 and 5).
(function (QEC) {
  'use strict';
  QEC.ui = QEC.ui || {};
  const COL = { X: '#00ccff', Z: '#ff8822', Y: '#cc88ff' };

  // Layout for a d×d patch in a W×W canvas. sp = spacing between qubits.
  function geometry(d, W, sp = (W - 20) / d) {
    const o = (W - (d - 1) * sp) / 2;
    return { sp, px: c => o + c * sp, py: r => o + r * sp };
  }

  // A check's tile: a square between 4 qubits, or a half-disc on the edge for weight 2.
  function tilePath(ctx, code, s, g) {
    const cx = g.px(s.c), cy = g.py(s.r), h = g.sp / 2;
    ctx.beginPath();
    if (s.qubits.length === 4) { ctx.rect(cx - h, cy - h, g.sp, g.sp); return; }
    const [a, b] = s.qubits.map(q => code.data[q]);
    const mx = (g.px(a.c) + g.px(b.c)) / 2, my = (g.py(a.r) + g.py(b.r)) / 2;
    if (a.r === b.r) {                               // horizontal pair: half-disc above or below
      const up = cy < my;
      ctx.arc(mx, my, h, up ? Math.PI : 0, up ? 2 * Math.PI : Math.PI);
    } else {                                         // vertical pair: half-disc left or right
      const left = cx < mx;
      ctx.arc(mx, my, h, left ? Math.PI / 2 : -Math.PI / 2, left ? 1.5 * Math.PI : Math.PI / 2);
    }
    ctx.closePath();
  }

  // All tiles; lit ones (syn[k] = 1) glow and pulse with time t.
  function drawTiles(ctx, code, g, syn, t) {
    const pulse = 0.6 + 0.4 * Math.sin(t * 0.006);
    code.stabs.forEach((s, k) => {
      const col = COL[s.type], lit = syn[k];
      ctx.save();
      tilePath(ctx, code, s, g);
      ctx.fillStyle = col;
      ctx.globalAlpha = lit ? 0.38 + 0.22 * pulse : 0.09;
      if (lit) QEC.ui.glow(ctx, col, 26 * pulse);
      ctx.fill();
      ctx.globalAlpha = lit ? 1 : 0.45;
      ctx.strokeStyle = col; ctx.lineWidth = lit ? 2.5 : 1.5;
      ctx.stroke();
      ctx.restore();
    });
  }

  QEC.ui.surface = { COL, geometry, tilePath, drawTiles };
})(window.QEC = window.QEC || {});
