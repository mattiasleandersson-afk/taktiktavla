/* Shared object controls. Uses the existing canvas, snapshots and film editor. */
(function () {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const ns = 'http://www.w3.org/2000/svg';
  let removal = null;
  let pendingRemoval = null;
  let menu;
  let scheduled = false;
  const undoFilms = new WeakMap();

  function panelName() { return document.querySelector('.tab.on')?.dataset.panel; }
  function film() {
    if (panelName() !== 'taktik' || !isEditingTaktik || editingTaktikIdx === null) return null;
    return taktikFilmer[editingTaktikIdx] || null;
  }
  function editable() {
    const tk = film();
    return !playback?.animating && (!tk || (!tt76IsReadOnly(tk) && !tt76IsPresentation()));
  }
  function extraBalls(step) { return (step.tacticObjects || []).filter(o => o.type === 'ball'); }
  function propagate(tk, idx, before, after) {
    const removed = new Set();
    function membership(key, oldList, newList, step) {
      const oldIds = new Set(oldList.map(p => p.id));
      const newIds = new Set(newList.map(p => p.id));
      oldList.forEach(p => { if (!newIds.has(p.id)) removed.add(p.id); });
      step[key] = (step[key] || []).filter(p => !removed.has(p.id));
      newList.forEach(p => {
        if (!oldIds.has(p.id) && !step[key].some(q => q.id === p.id)) step[key].push(clone(p));
      });
    }
    for (let i = idx + 1; i < tk.steps.length; i++) {
      const step = tk.steps[i];
      membership('players', before.players || [], after.players || [], step);
      membership('tacticObjects', extraBalls(before), extraBalls(after), step);
      if ((before.ballVisible !== false) !== (after.ballVisible !== false)) {
        step.ballVisible = after.ballVisible !== false;
        if (step.ballVisible) step.ball = clone(after.ball);
        else removed.add('ball');
      }
      step.movementPaths = (step.movementPaths || []).filter(m => !removed.has(m.playerId));
    }
  }
  function change(fn) {
    if (!editable()) return;
    const tk = film();
    // Save existing canvas work before capturing the undo boundary.
    if (tk) tt76SaveCurrentStep({ allowAutoCreate: false });
    saveUndo();
    if (tk) {
      undoFilms.set(undoStack[undoStack.length - 1], { tk, idx: editingStepIdx, steps: clone(tk.steps) });
      saveTaktikUndo();
    }
    fn();
    selectedId = null;
    if (tk) tt76SaveCurrentStep({ allowAutoCreate: false });
    render();
    sync();
  }
  function appendPlayer(team) {
    const members = players.filter(p => p.team === team);
    const used = new Set(members.map(p => Number(p.number)));
    let number = 1;
    while (used.has(number)) number++;
    players.push({ id: team[0] + '-' + crypto.randomUUID(), team, number, name: '',
      x: 160 + (members.length % 5) * 20, y: team === 'home' ? 430 : 170 });
  }
  function addPlayer(team) {
    if (!['home', 'away'].includes(team)) return;
    change(() => { appendPlayer(team); buildSetupTeam(team); });
  }
  function setPlayerCount(team, count) {
    if (!['home', 'away'].includes(team) || !Number.isSafeInteger(count) || count < 0 || count > 1000 || !editable()) return;
    const members = players.filter(p => p.team === team);
    if (members.length === count) return;
    removal = null;
    setMode('move');
    // One edit/undo boundary for the whole batch, including future film steps.
    change(() => {
      if (count < members.length) {
        const removed = new Set(members.slice().sort((a,b) => Number(b.number) - Number(a.number))
          .slice(0, members.length - count).map(p => p.id));
        players = players.filter(p => !removed.has(p.id));
        movementPaths = movementPaths.filter(m => !removed.has(m.playerId));
        removed.forEach(id => { delete matchAssignments[id]; });
      } else {
        for (let i = members.length; i < count; i++) appendPlayer(team);
      }
      buildSetupTeam(team);
    });
  }
  function removePlayerId(id) {
    change(() => {
      players = players.filter(p => p.id !== id);
      movementPaths = movementPaths.filter(m => m.playerId !== id);
      delete matchAssignments[id];
    });
  }
  function removeLastPlayer(team) {
    const p = players.filter(p => p.team === team).at(-1);
    if (p) removePlayerId(p.id);
  }
  function addBall() {
    if (typeof tt634BlockIfActiveLayerLocked === 'function' && tt634BlockIfActiveLayerLocked()) return;
    change(() => {
      if (!ballVisible) { ballVisible = true; ball = { x: W / 2, y: H / 2 }; return; }
      const n = (window.tacticObjects || []).filter(o => o.type === 'ball').length;
      const o = { id: 'ball-' + crypto.randomUUID(), type: 'ball', size: 0.75,
        x: 130 + (n % 6) * 28, y: 260 + (Math.floor(n / 6) % 6) * 28 };
      tt631MarkObjectLayer(o);
      window.tacticObjects.push(o);
    });
  }
  function removeBall(id) {
    change(() => {
      if (id === 'ball') ballVisible = false;
      else {
        const list = window.tacticObjects;
        const i = list.findIndex(o => o.id === id && o.type === 'ball');
        if (i >= 0) list.splice(i, 1);
      }
      movementPaths = movementPaths.filter(m => m.playerId !== id);
    });
  }
  function chooseRemoval(kind) {
    if (!editable()) return;
    setMode('move');
    removal = removal === kind ? null : kind;
    sync();
  }
  // Intercept only deliberate removal, before canvas drag and selection handlers.
  window.addEventListener('pointerdown', event => {
    if (!removal || !editable() || !event.target.closest('#pitch-svg')) return;
    const player = event.target.closest('.player-token');
    const object = event.target.closest('[data-object-type="ball"]');
    const primary = event.target.closest('.ball-token');
    const p = player && players.find(p => p.id === player.dataset.id);
    if (removal === 'ball' ? !(object || primary) : !p || p.team !== removal) return;
    event.preventDefault(); event.stopImmediatePropagation();
    pendingRemoval = { kind: removal, id: primary ? 'ball' : object ? object.dataset.id : p.id };
  }, { capture: true, passive: false });
  function finishRemoval(event) {
    if (!pendingRemoval) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const item = pendingRemoval; pendingRemoval = null;
    if (item.kind === 'ball') removeBall(item.id); else removePlayerId(item.id);
  }
  window.addEventListener('click', finishRemoval, true);
  // Existing canvas touch handlers suppress synthesized clicks. Complete a tap
  // on pointerup instead, and keep the legacy touch drag handler out of this gesture.
  window.addEventListener('touchstart', event => {
    if (pendingRemoval) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, { capture: true, passive: false });
  window.addEventListener('pointerup', event => {
    if (event.pointerType !== 'mouse') finishRemoval(event);
  }, { capture: true, passive: false });
  window.addEventListener('pointercancel', () => { pendingRemoval = null; });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') { removal = null; sync(); } });

  function visualKey() { return film() ? 'tt425_taktikfilm_' : 'tt404_tavla_'; }
  function setAppearance(key, value) {
    localStorage.setItem(visualKey() + key, value);
    render(); sync();
  }
  function appearance() {
    if (!['saves', 'formations', 'taktik'].includes(panelName())) return;
    const jersey = localStorage.getItem(visualKey() + 'symbol') === 'jersey';
    const names = localStorage.getItem(visualKey() + 'names') !== 'off';
    document.body.classList.toggle('tt-objects-jersey', jersey);
    document.body.classList.add('tt-objects-appearance');
    document.querySelectorAll('#pitch-svg .player-token').forEach(g => {
      const p = players.find(p => p.id === g.dataset.id);
      if (!p) return;
      let shape = g.querySelector('.tt-objects-shirt');
      if (jersey) {
        if (!shape) {
          shape = document.createElementNS(ns, 'path'); shape.classList.add('tt-objects-shirt');
          shape.setAttribute('pointer-events', 'none');
          g.insertBefore(shape, g.querySelector('.token-text'));
        }
        shape.setAttribute('d', `M ${p.x-18} ${p.y-12} L ${p.x-9} ${p.y-22} L ${p.x-3} ${p.y-16} L ${p.x+3} ${p.y-16} L ${p.x+9} ${p.y-22} L ${p.x+18} ${p.y-12} L ${p.x+13} ${p.y-3} L ${p.x+10} ${p.y-6} L ${p.x+10} ${p.y+18} L ${p.x-10} ${p.y+18} L ${p.x-10} ${p.y-6} L ${p.x-13} ${p.y-3} Z`);
        shape.setAttribute('fill', g.querySelector('circle')?.getAttribute('fill') || homeColor);
        shape.setAttribute('stroke', '#fff'); shape.setAttribute('stroke-width', '2');
      } else if (shape) shape.remove();
      let name = g.querySelector('.tt-objects-name');
      if (names && p.name) {
        if (!name) { name = document.createElementNS(ns, 'text'); name.classList.add('tt-objects-name'); g.appendChild(name); }
        name.textContent = p.name; name.setAttribute('x', p.x); name.setAttribute('y', p.y + 31);
      } else if (name) name.remove();
    });
  }
  function layout() {
    if (window.TTWorkspace?.layout()) return;
    const pitch = document.querySelector('#pitch-wrapper');
    if (!pitch || menu.hidden) { document.body.classList.remove('tt-objects-docked'); return; }
    const r = pitch.getBoundingClientRect();
    const leftPanel = film() ? document.querySelector('#edit-taktik-steps') : document.querySelector('.panel.on');
    const lr = leftPanel?.getBoundingClientRect();
    const left = lr && lr.width && lr.right < r.right - 440 ? lr.right + 10 : 10;
    const docked = innerWidth >= 1200 && !document.body.classList.contains('fullscreen-portrait') && r.right - left >= 440;
    const wasDocked = menu.classList.contains('docked');
    menu.classList.toggle('docked', docked);
    document.body.classList.toggle('tt-objects-docked', docked);
    if (docked) {
      if (!wasDocked) menu.open = true;
      const pitchLeft = (left + 200) + 'px';
      if (document.body.style.getPropertyValue('--tt-objects-pitch-left') !== pitchLeft) document.body.style.setProperty('--tt-objects-pitch-left', pitchLeft);
      const top = Math.max(120, r.top);
      menu.style.right = 'auto'; menu.style.left = left + 'px'; menu.style.top = top + 'px';
      menu.style.maxHeight = Math.max(100, innerHeight - top - 10) + 'px';
    } else {
      if (wasDocked) menu.open = false;
      menu.style.left = 'auto'; menu.style.right = '10px'; menu.style.top = 'auto';
      menu.style.removeProperty('max-height');
    }
  }
  function sync() {
    if (!menu) return;
    window.TTMotion?.sync();
    const active = ['saves', 'formations'].includes(panelName()) || !!film();
    menu.hidden = !active;
    if (!active) {
      removal = null;
      document.body.classList.remove('tt-objects-appearance', 'tt-objects-jersey', 'tt-objects-docked');
      window.TTWorkspace?.layout();
      return;
    }
    menu.querySelector('fieldset').disabled = !editable();
    for (const team of ['home','away']) {
      const count = players.filter(p => p.team === team).length;
      const input = menu.querySelector(`[data-count="${team}"]`);
      if (document.activeElement !== input) input.value = count;
      menu.querySelector(`[data-remove="${team}"]`).disabled = !count;
    }
    const count = Number(ballVisible) + (window.tacticObjects || []).filter(o => o.type === 'ball').length;
    menu.querySelector('[data-count="ball"]').textContent = count;
    menu.querySelector('[data-remove="ball"]').disabled = !count;
    if (removal && menu.querySelector(`[data-remove="${removal}"]`).disabled) removal = null;
    menu.querySelector('[role="status"]').textContent = removal
      ? 'Tryck på ' + (removal === 'ball' ? 'bollarna' : removal === 'home' ? 'medspelarna' : 'motspelarna') + ' som ska tas bort. Fortsätt med flera. Minus igen, Flytta eller Esc avslutar.'
      : film() ? 'Tillägg och borttagning gäller även kommande steg.' : '';
    menu.querySelectorAll('[data-remove]').forEach(b => b.setAttribute('aria-pressed', String(removal === b.dataset.remove)));
    menu.querySelector('#tt-objects-symbol').value = localStorage.getItem(visualKey() + 'symbol') || 'circle';
    menu.querySelector('#tt-objects-names').checked = localStorage.getItem(visualKey() + 'names') !== 'off';
    const select = menu.querySelector('#tt-objects-formation');
    if (select.dataset.format !== String(format)) {
      select.replaceChildren(new Option('Välj formation…', ''));
      (FORMATIONS[format] || FORMATIONS[11]).forEach(f => select.add(new Option(f, f)));
      select.dataset.format = String(format);
    }
    layout();
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; sync(); }, 0);
  }
  function init() {
    menu = document.createElement('details'); menu.id = 'tt-objects-menu';
    menu.innerHTML = `<summary>Objekt</summary><fieldset>
      <legend>Spelare och lag</legend>
      ${[['home','Medspelare'],['away','Motspelare']].map(([team,name]) => `<div class="tt-objects-row"><span>${name}</span><button type="button" data-remove="${team}" aria-label="Ta bort ${name.toLowerCase()}">−</button><input type="number" min="0" max="1000" step="1" inputmode="numeric" data-count="${team}" aria-label="Antal ${name.toLowerCase()}" title="Antal ${name.toLowerCase()} (0–1000). Enter eller lämna rutan för att ändra."><button type="button" data-add="${team}" aria-label="Lägg till ${name.toLowerCase()}">+</button></div>`).join('')}
      <label>Formation <select id="tt-objects-formation"></select></label>
      <button type="button" id="tt-objects-lineup">Laguppställning / namn</button>
      <label>Spelarsymbol <select id="tt-objects-symbol"><option value="circle">Cirkel</option><option value="jersey">Tröja</option></select></label>
      <label><input type="checkbox" id="tt-objects-names"> Visa namn</label>
      <hr><div class="tt-objects-row"><span>⚽ Bollar</span><button type="button" data-remove="ball" aria-label="Ta bort boll">−</button><output data-count="ball"></output><button type="button" data-add="ball" aria-label="Lägg till boll">+</button></div>
      <div class="tt-objects-row"><button type="button" data-tool="cone">🔺 Kon</button><button type="button" data-tool="pole">▌ Pinne</button></div>
      <button type="button" id="tt-objects-move">Flytta / avsluta verktyg</button>
      <p role="status"></p></fieldset>`;
    document.body.appendChild(menu);
    menu.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      if (b.dataset.add) { removal = null; setMode('move'); b.dataset.add === 'ball' ? addBall() : addPlayer(b.dataset.add); }
      if (b.dataset.remove) chooseRemoval(b.dataset.remove);
      if (b.dataset.tool) { removal = null; ttSelectObjectTool(b.dataset.tool); }
      if (b.id === 'tt-objects-lineup') openSetup();
      if (b.id === 'tt-objects-move') { removal = null; setMode('move'); sync(); }
    });
    menu.querySelectorAll('input[data-count]').forEach(input => {
      const reset = () => { input.value = players.filter(p => p.team === input.dataset.count).length; };
      input.addEventListener('change', () => {
        const value = input.value.trim();
        if (!/^\d+$/.test(value) || !input.validity.valid) {
          reset();
          showToast('Skriv ett helt antal mellan 0 och 1000', false);
          return;
        }
        setPlayerCount(input.dataset.count, Number(value));
        reset();
      });
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.preventDefault(); event.stopPropagation();
          if (event.key === 'Escape') reset();
          input.blur();
        }
      });
      input.addEventListener('blur', reset);
    });
    menu.querySelector('#tt-objects-symbol').addEventListener('change', e => setAppearance('symbol', e.target.value));
    menu.querySelector('#tt-objects-names').addEventListener('change', e => setAppearance('names', e.target.checked ? 'on' : 'off'));
    menu.querySelector('#tt-objects-formation').addEventListener('change', e => {
      if (!e.target.value) return;
      change(() => {
        for (const team of ['home','away']) {
          const positions = getPositions(e.target.value, team);
          players.filter(p => p.team === team).forEach((p,i) => { if (positions[i]) Object.assign(p, positions[i]); });
        }
      });
    });
    window.addEventListener('resize', schedule);
    document.addEventListener('click', schedule, true);
    const tabs = document.querySelectorAll('.tab');
    const observer = new MutationObserver(schedule);
    tabs.forEach(tab => observer.observe(tab, { attributes: true, attributeFilter: ['class'] }));
    // Exit handlers can stop the click before our listener and do not change
    // the selected tab. Observe the actual library/editor transition instead.
    let inLibrary = document.body.classList.contains('tt-v82-taktik-library');
    const libraryObserver = new MutationObserver(() => {
      const next = document.body.classList.contains('tt-v82-taktik-library');
      if (next !== inLibrary) { inLibrary = next; sync(); }
    });
    libraryObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    render(); sync();
  }
  const originalRender = render;
  render = function () { const result = originalRender.apply(this, arguments); appearance(); schedule(); return result; };
  const originalMoveDrag = moveDrag;
  moveDrag = function () {
    const result = originalMoveDrag.apply(this, arguments);
    if (dragging?.type === 'player') appearance();
    return result;
  };
  const originalUndo = doUndo;
  doUndo = function () {
    const record = undoFilms.get(undoStack.at(-1));
    if (record && record.tk === film() && record.idx === editingStepIdx) {
      record.tk.steps = clone(record.steps);
      if (playback) playback.tk = record.tk;
    }
    return originalUndo.apply(this, arguments);
  };
  window.TTObjects = { addPlayer, removeLastPlayer, removeBall, propagate };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
