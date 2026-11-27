// Bites: explanations in small pieces, one at a time.
//
//   const bites = new QEC.ui.Bites(document.getElementById('bites'));
//   bites.play([
//     'Plain text bite — the player clicks NEXT.',
//     { t: 'A bite that waits for the game.', wait: 'flip', hint: 'click a qubit' },
//   ], () => { /* all bites seen */ });
//   bites.notify('flip');     // game reports an event; advances if the current bite waits for it
//   bites.feedback('Nope!');  // short reaction under the current bite, replaced by the next one
//
// A bite can also ask a question; the player must pick an answer before going on (and before the
// game opens up, so a prediction really comes before the outcome):
//     { t: 'What will Z do to |0⟩?', ask: ['Flip it', 'Nothing'], answer: 1, id: 'z-on-0',
//       kind: 'predict' | 'check',         // predict: neutral reply, the game shows the truth next
//       reply: (pick, ok) => 'html' }     // optional; default reply depends on kind
//   `answer` may be a function pick → bool (e.g. judged against simulated data).
//   With bites.logAs = 'ch2' the FIRST answer goes to the local learning log (QEC.progress.note).
//   A prediction is settled once the game has shown the outcome: when the player finishes the next
//   `wait` bite (or the one named by `reveal: 'evt'`), the next bite opens with "✓ / ✗ you predicted…".
//   `reveal: false` when the chapter judges the prediction itself (e.g. against random data or the
//   player's own plan). Then the chapter also writes the learning-log entry once it knows the result.
//
// Bite text is HTML written by us (never user input).
(function (QEC) {
  'use strict';
  QEC.ui = QEC.ui || {};

  class Bites {
    constructor(el, title = 'BRIEFING') {
      this.el = el;
      this.title = title;
      this.list = [];
      this.i = 0;
      this.onEnd = null;
      this.fb = null;
      this.actions = null;
      this.onChange = null;   // called after every re-render, e.g. to enable/disable game buttons
      this.logAs = null;      // chapter id for the learning log, see ask bites above
    }

    play(list, onEnd) {
      // copies, so an answered question is fresh again when the level is replayed
      this.list = list.map(b => (typeof b === 'string' ? { t: b } : { ...b }));
      this.i = 0;
      this.onEnd = onEnd || null;
      this.fb = null;
      this.actions = null;
      this.render();
      this.fireShow();
    }

    // The player picked option i of the current question.
    answer(i) {
      const cur = this.list[this.i];
      if (!cur || !cur.ask || cur.picked !== undefined) return;
      const ok = typeof cur.answer === 'function' ? !!cur.answer(i) : i === cur.answer;
      const kind = cur.kind || 'check';
      cur.picked = i;
      cur.pick = kind === 'predict' ? 'pick' : ok ? 'pick right' : 'pick wrong';
      if (this.logAs && QEC.progress && cur.id && cur.reveal !== false) QEC.progress.note(this.logAs, cur.id, { kind, ok });
      const right = typeof cur.answer === 'number' ? cur.ask[cur.answer] : null;
      this.fb = cur.reply ? cur.reply(i, ok)
        : kind === 'predict' ? 'Noted. You\'ll soon see whether you were right.'
        : ok ? '✓ Right.' : `✗ Not quite${right ? ` — it is <b>${right}</b>` : ''}.`;
      if (cur.onAnswer) cur.onAnswer(i, ok);
      this.render();
    }

    // True while the player may play: a bite waits for an action, or all bites have been read.
    get open() {
      return this.waiting !== null || this.i >= this.list.length;
    }

    get done() { return this.i >= this.list.length; }

    get waiting() {
      const cur = this.list[this.i];
      return cur ? cur.wait || null : null;
    }

    notify(evt) {
      if (this.waiting && this.waiting === evt) this.advance();
    }

    advance() {
      if (this.i >= this.list.length) return;
      const left = this.list[this.i];
      this.i++;
      this.fb = null;
      if (left.wait) this.settlePredictions(left.wait);
      this.render();
      if (this.i >= this.list.length) { if (this.onEnd) this.onEnd(); }
      else this.fireShow();
    }

    // The game just showed an outcome (a `wait` bite was done). Settle the predictions it answers:
    // colour the old pick and open the next bite with the verdict, so nobody has to work it out alone.
    settlePredictions(evt) {
      const lines = [];
      for (let k = 0; k < this.i; k++) {
        const b = this.list[k];
        if (b.kind !== 'predict' || b.picked === undefined || b.settled || typeof b.answer !== 'number') continue;
        if (b.reveal === false || (b.reveal && b.reveal !== evt)) continue;
        b.settled = true;
        const ok = b.picked === b.answer;
        b.pick = ok ? 'pick right' : 'pick wrong';
        lines.push(ok
          ? `<div class="ask-verdict right">✓ You predicted <em>${b.ask[b.picked]}</em>. Right!</div>`
          : `<div class="ask-verdict wrong">✗ You predicted <em>${b.ask[b.picked]}</em>. The answer: <b>${b.ask[b.answer]}</b>.</div>`);
      }
      if (!lines.length) return;
      const next = this.list[this.i];
      if (next) next.verdict = (next.verdict || '') + lines.join('');
      else this.fb = lines.join('');
    }

    fireShow() {
      const cur = this.list[this.i];
      if (cur && cur.onShow) cur.onShow();
    }

    feedback(html) {
      this.fb = html;
      this.render();
    }

    // Append a closing bite with buttons, e.g. "NEXT LEVEL →".
    finish(html, actions) {
      if (this.fb) this.list.push({ t: this.fb, fb: true });   // keep the last reaction visible
      this.list.push({ t: html, final: true });
      this.i = this.list.length - 1;
      this.fb = null;
      this.actions = actions;
      this.render();
    }

    render() {
      const el = this.el;
      // Scroll only for something new: a new current bite, or a new reaction while the player is
      // following along at the bottom. A player who scrolled up to re-read stays where they are.
      const keep = el.scrollTop, following = el.scrollTop >= el.scrollHeight - el.clientHeight - 24;
      const newBite = this.i !== this.shownI || this.list !== this.shownList;
      const newFb = this.fb && this.fb !== this.shownFb;
      this.shownI = this.i; this.shownList = this.list; this.shownFb = this.fb;
      el.innerHTML = '';
      const h = document.createElement('div');
      h.className = 'bites-title';
      h.textContent = '// ' + this.title + ' //';
      el.appendChild(h);

      const last = Math.min(this.i, this.list.length - 1);
      for (let k = 0; k <= last; k++) {
        const b = document.createElement('div');
        b.className = 'bite' + (k === this.i ? ' current' : '') + (this.list[k].fb ? ' feedback' : '');
        const it = this.list[k];
        b.innerHTML = (it.verdict || '') + it.t + (it.pick ? `<div class="ask-${it.pick}">▸ ${it.ask[it.picked]}</div>` : '');
        el.appendChild(b);
      }

      if (this.fb) {
        const f = document.createElement('div');
        f.className = 'bite current feedback';
        f.innerHTML = this.fb;
        el.appendChild(f);
      }

      const cur = this.list[this.i];
      if (cur) this.renderActions(cur);
      if (newBite) this.scrollToCurrent('first');
      else if (newFb && following) this.scrollToCurrent('last');
      else el.scrollTop = keep;
      if (this.onChange) this.onChange();
    }

    // When the briefing scrolls inside its box (wide screens, see theme.css), show the current
    // bite ('first') or the newest reaction ('last') and the buttons below. If they don't fit
    // together, the start of that text wins.
    scrollToCurrent(which) {
      const el = this.el;
      if (el.scrollHeight <= el.clientHeight) return;
      const cur = el.querySelectorAll('.bite.current');
      const target = cur.length ? cur[which === 'last' ? cur.length - 1 : 0] : el.lastElementChild;
      const top = target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 8;
      el.scrollTop = Math.min(top, el.scrollHeight - el.clientHeight);
    }

    renderActions(cur) {
      const el = this.el;
      const row = document.createElement('div');
      row.className = 'bite-actions';
      if (cur.ask && cur.picked === undefined) {
        row.classList.add('ask');
        cur.ask.forEach((label, i) => {
          const btn = document.createElement('button');
          btn.className = 'btn ask-opt';
          btn.innerHTML = label;
          btn.onclick = () => this.answer(i);
          row.appendChild(btn);
        });
      } else if (cur.final && this.actions) {
        for (const a of this.actions) {
          const btn = document.createElement('button');
          btn.className = 'btn ' + (a.cls ?? 'next');   // cls: '' = a quiet button
          btn.textContent = a.label;
          btn.onclick = a.onClick;
          row.appendChild(btn);
        }
      } else if (cur.wait) {
        const w = document.createElement('span');
        w.className = 'bite-wait';
        w.textContent = '▸ ' + (cur.hint || 'your move');
        row.appendChild(w);
      } else {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = this.i === this.list.length - 1 ? "LET'S GO" : 'NEXT →';
        btn.onclick = () => this.advance();
        row.appendChild(btn);
      }
      el.appendChild(row);
    }
  }

  QEC.ui.Bites = Bites;

  // Level chips in the top bar + progress bookkeeping for one chapter.
  //   const ch = QEC.ui.chapter({ id: 'ch3', el, levels: ['3 QUBITS', ...], start: i => {...} });
  //   ch.complete(i)  // level i solved: unlock the next one (and mark the chapter done after the last)
  // Optional `core: n`: only the first n levels make the chapter done; the levels after them are
  // optional extras whose chips stay hidden until reached (Chapter 1's challenges).
  QEC.ui.chapter = function ({ id, el, levels, start, core = levels.length }) {
    // A chapter marked done has reached at least its core count, even if no level was stored
    // (Chapter 1 before it had levels saved only { done: true }).
    const reachedLevel = () => {
      const lv = QEC.progress.level(id);
      return QEC.progress.isDone(id) ? Math.max(lv, core) : lv;
    };
    // Resume at the last core level; a player who already solved an extra resumes at the next extra.
    const r0 = reachedLevel();
    let current = r0 > core ? Math.min(r0, levels.length - 1) : Math.min(r0, core - 1);

    function render() {
      const reached = reachedLevel();
      const allDone = QEC.progress.isDone(id);
      el.innerHTML = '';
      levels.forEach((name, i) => {
        const extra = i >= core;
        if (extra && i > reached && i !== current) return;
        const b = document.createElement('button');
        const done = (allDone && !extra) || i < reached;
        b.className = 'lvl-chip' + (i === current ? ' current' : done ? ' done' : i <= reached ? ' open' : '');
        b.textContent = `${i + 1} ${name}`;
        if (i <= reached || (allDone && !extra)) b.onclick = () => go(i);
        el.appendChild(b);
      });
    }

    function go(i) {
      current = i;
      render();
      start(i);
    }

    function complete(i) {
      QEC.progress.reachLevel(id, i + 1);
      if (i === core - 1) QEC.progress.markDone(id);
      render();
    }

    return {
      go, complete,
      get current() { return current; },
      isLast: i => i === levels.length - 1,
      begin() { go(current); },
    };
  };
})(window.QEC = window.QEC || {});
