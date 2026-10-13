// Small helpers shared by all canvas boards.
(function (QEC) {
  'use strict';
  QEC.ui = QEC.ui || {};

  QEC.ui.glow = (ctx, col, blur) => { ctx.shadowColor = col; ctx.shadowBlur = blur; };
  QEC.ui.noGlow = ctx => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; };

  // Mouse/touch position in canvas pixels, even when CSS scales the canvas down.
  QEC.ui.pointer = (canvas, e) => {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - r.left) * (canvas.width / r.width),
      y: (src.clientY - r.top) * (canvas.height / r.height),
    };
  };

  QEC.ui.text = (ctx, str, x, y, { font = 'bold 13px Courier New', color = '#fff', align = 'center', base = 'middle' } = {}) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = base;
    ctx.fillText(str, x, y);
  };

  // requestAnimationFrame loop that hands the draw function the current time.
  QEC.ui.loop = draw => {
    let id = null;
    const tick = t => { draw(t); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  };
})(window.QEC = window.QEC || {});
