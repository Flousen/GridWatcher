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

  // Pauli corrections straight from the pointer, no tool to pick first.
  //   Mouse: left click = X, right click (or Ctrl+click on a Mac) = Z; Y is both on the same qubit (Y = X·Z).
  //   Touch: each tap steps the qubit's correction through Z → X → Y → none. The choice shows as a
  //   preview and takes effect after a short pause, so the tiles don't flicker while you tap.
  //   If a level allows only one kind, a tap applies it at once (there is nothing to cycle through).
  // A press counts only if it starts and ends on the same qubit, like a normal click.
  //
  //   const input = QEC.ui.pauliInput(canvas, {
  //     hit,       // point → qubit index or -1
  //     enabled,   // () → may the player act right now?
  //     allowed,   // () → which of 'X', 'Z' this level allows
  //     current,   // q → the correction on q now: 'I' | 'X' | 'Y' | 'Z'
  //     onApply,   // (q, 'X' | 'Z') → multiply onto q's correction (mouse)
  //     onSet,     // (q, letter) → set q's correction to exactly this (touch)
  //   });
  //   input.pending   // { q, letter, t0, ms } while a touch choice is waiting, else null — draw it
  //   input.commit()  // apply a waiting choice now (call before CHECK / HINT)
  //   input.cancel()  // forget it (call when a new round starts)
  const PRIMARY = 'X', SECONDARY = 'Z', TOUCH_CYCLE = ['Z', 'X', 'Y'], SETTLE_MS = 700;
  QEC.ui.pauliInput = (canvas, { hit, enabled = () => true, allowed = () => ['X', 'Z'], current, onApply, onSet }) => {
    const presses = new Map();   // pointerId → qubit pressed
    let pending = null;          // { q, letter, t0, ms, timer }
    const at = e => hit(QEC.ui.pointer(canvas, e));

    function cancel() { if (pending) clearTimeout(pending.timer); pending = null; }
    function commit() {
      if (!pending) return;
      const { q, letter } = pending;
      cancel();
      if (enabled() && letter !== current(q)) { onSet(q, letter); QEC.ui.fx.tick(); }
    }
    function cycle() {
      const ok = allowed();
      return ['I', ...TOUCH_CYCLE.filter(l => (l === 'Y' ? ok.includes('X') && ok.includes('Z') : ok.includes(l)))];
    }
    function tap(q) {
      if (pending && pending.q !== q) commit();
      if (!enabled()) return;
      const cyc = cycle();
      if (cyc.length < 2) return;
      const from = pending ? pending.letter : current(q);
      const letter = cyc[(cyc.indexOf(from) + 1) % cyc.length];   // unknown state → starts over at 'I'
      if (cyc.length === 2) { cancel(); onSet(q, letter); QEC.ui.fx.tick(); return; }
      if (pending) clearTimeout(pending.timer);
      pending = { q, letter, t0: performance.now(), ms: SETTLE_MS, timer: setTimeout(commit, SETTLE_MS) };
    }

    canvas.style.touchAction = 'manipulation';
    canvas.style.userSelect = 'none';
    canvas.style.webkitTouchCallout = 'none';
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('pointerdown', e => {
      presses.delete(e.pointerId);
      if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
      const q = at(e);
      if (q >= 0) presses.set(e.pointerId, q);
    });
    // a finger that slides off its qubit gives up the tap (touch pointers stay captured, so no pointerleave)
    canvas.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' && presses.has(e.pointerId) && at(e) !== presses.get(e.pointerId)) presses.delete(e.pointerId);
    });
    canvas.addEventListener('pointerup', e => {
      const q = presses.get(e.pointerId);
      presses.delete(e.pointerId);
      if (q === undefined || at(e) !== q) return;
      if (e.pointerType !== 'mouse') return tap(q);
      commit();
      if (enabled()) onApply(q, e.button === 2 || e.ctrlKey ? SECONDARY : PRIMARY);
    });
    canvas.addEventListener('pointercancel', e => presses.delete(e.pointerId));

    return { get pending() { return pending; }, commit, cancel };
  };

  // Draw a waiting touch choice on a qubit: dashed badge plus a ring that runs down until it takes effect.
  QEC.ui.drawPending = (ctx, x, y, r, pend, t, colors) => {
    const col = colors[pend.letter] || '#7fa8c0';
    const left = Math.max(0, 1 - (t - pend.t0) / pend.ms);
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    QEC.ui.glow(ctx, col, 10);
    ctx.beginPath(); ctx.arc(x, y, r + 7, -Math.PI / 2, -Math.PI / 2 + left * 2 * Math.PI); ctx.stroke();
    QEC.ui.noGlow(ctx);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.setLineDash([4, 3]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
    QEC.ui.text(ctx, pend.letter === 'I' ? '–' : pend.letter, x, y + 1, { font: 'bold 14px Courier New', color: col });
  };

  // Feedback on right and wrong moves, the same everywhere:
  //   good  – the board glows green, short buzz
  //   bad   – the board glows red and shakes, double buzz
  //   nudge – "not yet": a small twitch, tiny buzz
  //   tick  – a touch correction just took effect
  // Buzzing needs a phone/browser with navigator.vibrate (Android: yes, iPhone Safari: no) and is
  // silently skipped elsewhere. The shake is left out for players who ask for reduced motion (see theme.css).
  function buzz(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* not allowed here */ }
  }
  function flash(el, cls) {
    if (!el) return;
    el.classList.remove('fx-good', 'fx-bad', 'fx-nudge');
    void el.offsetWidth;          // restart the CSS animation even if the same class comes twice
    el.classList.add(cls);
  }
  QEC.ui.fx = {
    good(el) { flash(el, 'fx-good'); buzz(35); },
    bad(el) { flash(el, 'fx-bad'); buzz([60, 40, 60]); },
    nudge(el) { flash(el, 'fx-nudge'); buzz(15); },
    tick() { buzz(8); },
  };

  // requestAnimationFrame loop that hands the draw function the current time.
  QEC.ui.loop = draw => {
    let id = null;
    const tick = t => { draw(t); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  };
})(window.QEC = window.QEC || {});
