/* Opt-in timing and linked transitions. Legacy films keep their old animator. */
(function () {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  let auto = false, running = null, queued = false;
  const timing = step => ['speed','together'].includes(step?.motionTiming) ? step.motionTiming : 'legacy';
  const pos = (step, id) => tt146GetPos(step, id);
  const length = pts => tt146PathLen(pts);

  // Pure timeline builder: distance is measured along the complete drawn path.
  function plan(steps, from, end, baseMs) {
    const snapshots = steps.map((s,i) => tt146ApplyMovementEndpoints(tt146SafeStep(clone(s),i)));
    const tracks = new Map(), boundaries = [];
    let boundary = 0;
    for (let i = from + 1; i <= end; i++) {
      const a = snapshots[i-1], b = snapshots[i], map = tt146MovementMap(b);
      const motions = tt146AllIds(a,b).map(id => {
        const start = pos(a,id), finish = pos(b,id);
        if (!start || !finish) return null;
        const path = map[String(id)]?.pts;
        // Join the real previous position to a path if its first point differs.
        const pts = path ? [start, ...path] : [start,finish];
        return {id:String(id),pts,distance:length(pts)};
      }).filter(Boolean);
      const together = timing(b) === 'together';
      const longest = Math.max(0,...motions.map(m => m.distance));
      const stageDuration = together || !longest ? baseMs : longest * baseMs / 150;
      for (const m of motions) {
        let track = tracks.get(m.id);
        if (!track) { track = []; tracks.set(m.id,track); }
        const previous = track.at(-1);
        const start = together ? boundary : (previous?.end ?? boundary);
        const duration = together || m.distance === 0 ? stageDuration : m.distance * baseMs / 150;
        track.push({...m,start,end:start+duration});
      }
      boundary = Math.max(boundary + (motions.length ? 0 : stageDuration), ...[...tracks.values()].map(t=>t.at(-1).end));
      boundaries.push({index:i,time:boundary});
    }
    return {snapshots,tracks,boundaries,duration:boundary,from,end};
  }
  function sample(timeline, elapsed) {
    const result = {};
    for (const [id,track] of timeline.tracks) {
      const segment = track.find(s=>elapsed < s.end) || track.at(-1);
      const fraction = segment.end === segment.start ? 1 : Math.max(0,Math.min(1,(elapsed-segment.start)/(segment.end-segment.start)));
      result[id] = tt146PathPos(segment.pts,fraction);
    }
    return result;
  }
  function finish(run,index) {
    if (running !== run) return;
    running = null;
    if (animFrame) cancelAnimationFrame(animFrame);
    tt146Animating = false; tt145Animating = false;
    if (!playback || playback.tk !== run.tk) { schedule(); return; }
    playback.animating = false; playback.stepIndex = index; editingStepIdx = index;
    restoreSnap(clone(run.timeline.snapshots[index])); render();
    updatePlaybar(); tt76RenderStepList(run.tk); tt76UpdateCounters();
    schedule();
  }
  function stop() {
    // Stop at a complete stored step, never save a visual intermediate position.
    if (running) finish(running,running.complete);
  }
  function animate(from,target) {
    const tk = tt146CurrentTk();
    if (!tk?.steps || target !== from+1) return false;
    let end = target;
    if (auto) while (end < tk.steps.length-1 && tk.steps[end].linkNext === true) end++;
    if (end === target && timing(tk.steps[target]) === 'legacy') return false;
    tt304InitSpeedControls();
    const timeline = plan(tk.steps,from,end,tt304NormalizeSpeed(tt304PlaybackSpeedMs));
    if (animFrame) cancelAnimationFrame(animFrame);
    if (!playback) playback = {tk,stepIndex:from,animating:false};
    playback.tk = tk; playback.stepIndex = from; playback.animating = true;
    editingStepIdx = from; tt146Animating = true; tt145Animating = true;
    const run = {tk,timeline,complete:from,visual:from,start:performance.now()};
    running = run;
    restoreSnap(clone(timeline.snapshots[from])); render(); schedule();
    function frame(now) {
      if (running !== run) return;
      if (!playback || playback.tk !== tk) { stop(); return; }
      const elapsed = now-run.start;
      for (const b of timeline.boundaries) if (elapsed >= b.time) run.complete = b.index;
      if (elapsed >= timeline.duration) { finish(run,end); return; }
      if (run.visual !== run.complete) {
        restoreSnap(clone(timeline.snapshots[run.complete])); run.visual = run.complete;
      }
      for (const [id,p] of Object.entries(sample(timeline,elapsed))) tt146SetVisual(id,p);
      render();
      animFrame = requestAnimationFrame(frame);
    }
    animFrame = requestAnimationFrame(frame);
    return true;
  }
  function autoNext(index) {
    auto = true;
    try { tt147GoToStep(index,true); } finally { auto = false; }
  }
  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(()=>{queued=false;sync();});
  }
  function sync() {
    const list = document.getElementById('edit-taktik-steps'), tk = tt146CurrentTk();
    if (!list || !tk?.steps) return;
    const disabled = !!playback?.animating || tt76IsReadOnly(tk) || tt76IsPresentation();
    for (const row of list.querySelectorAll('.row[data-idx]')) {
      const index = Number(row.dataset.idx), step = tk.steps[index];
      if (!step || !index) continue;
      let controls = row.nextElementSibling;
      if (!controls?.classList.contains('tt-motion-controls')) {
        controls = document.createElement('div'); controls.className = 'tt-motion-controls';
        controls.innerHTML = `<label>Rörelsetid <select aria-label="Rörelsetid steg ${index}"><option value="legacy">Befintlig uppspelning</option><option value="speed">Samma fart</option><option value="together">Framme samtidigt</option></select></label><button type="button"></button>`;
        row.after(controls);
        controls.addEventListener('click',e=>e.stopPropagation());
        controls.querySelector('select').addEventListener('change', e=>update(index,'motionTiming',e.target.value));
        controls.querySelector('button').addEventListener('click',()=>{
          const current = tt146CurrentTk()?.steps[index];
          if (current) update(index,'linkNext',current.linkNext !== true);
        });
      }
      const select = controls.querySelector('select'), button = controls.querySelector('button');
      if (select.value !== timing(step)) select.value = timing(step);
      select.disabled = disabled;
      button.hidden = index === tk.steps.length-1;
      button.disabled = disabled;
      const text = step.linkNext ? '🔗 Länkad till nästa steg' : 'Länka till nästa steg';
      if (button.textContent !== text) button.textContent = text;
      const pressed = String(step.linkNext === true);
      if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed',pressed);
      controls.dataset.step = String(index);
    }
  }
  function update(index,key,value) {
    const tk = tt146CurrentTk();
    if (!tk?.steps[index] || playback?.animating || tt76IsReadOnly(tk) || tt76IsPresentation()) return;
    tt76SaveCurrentStep({allowAutoCreate:false}); saveTaktikUndo();
    const step = tk.steps[index];
    if (value === 'legacy' || value === false) delete step[key]; else step[key] = value;
    tt76MarkDirty(); sync();
  }
  function init() {
    const list = document.getElementById('edit-taktik-steps');
    if (list) new MutationObserver(schedule).observe(list,{childList:true});
    let library = document.body.classList.contains('tt-v82-taktik-library');
    new MutationObserver(()=>{
      const next = document.body.classList.contains('tt-v82-taktik-library');
      if (next !== library) {library=next;if(next)stop();schedule();}
    }).observe(document.body,{attributes:true,attributeFilter:['class']});
    sync();
  }
  window.TTMotion = {plan,sample,animate,autoNext,stop,sync};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
