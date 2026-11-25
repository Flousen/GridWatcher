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
      const mark = kind === 'predict' ? 'pick' : ok ? 'pick right' : 'pick wrong';
      cur.t += `<div class="ask-${mark}">▸ ${cur.ask[i]}</div>`;
      if (this.logAs && QEC.progress && cur.id) QEC.progress.note(this.logAs, cur.id, { kind, ok });
      const right = typeof cur.answer === 'number' ? cur.ask[cur.answer] : null;
      this.fb = cur.reply ? cur.reply(i, ok)
        : kind === 'predict' ? 'Noted. Let\'s find out.'
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
      this.i++;
      this.fb = null;
      this.render();
      if (this.i >= this.list.length) { if (this.onEnd) this.onEnd(); }
      else this.fireShow();
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
      el.innerHTML = '';
      const h = document.createElement('div');
      h.className = 'bites-title';
      h.textContent = '// ' + this.title + ' //';
      el.appendChild(h);

      const last = Math.min(this.i, this.list.length - 1);
      for (let k = 0; k <= last; k++) {
        const b = document.createElement('div');
        b.className = 'bite' + (k === this.i ? ' current' : '') + (this.list[k].fb ? ' feedback' : '');
        b.innerHTML = this.list[k].t;
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
      if (this.onChange) this.onChange();
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
    let current = Math.min(QEC.progress.level(id), core - 1);

    function render() {
      const reached = QEC.progress.level(id);
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
