/* One shared desktop column. Existing controls remain in their original DOM. */
(function () {
  'use strict';
  let nav, context = '', selected = 'main', collapsed = false;
  let stepHome, filmFullscreen = false, fullscreenLayersOpen = false, fullscreenObjectsOpen = false, layerToggle, objectToggle;
  const byId = id => document.getElementById(id);
  function placeStepButton(inSidebar) {
    const button = byId('btn-edit-add-step'), actions = byId('tt692-film-actions-bottom');
    if (!button) return;
    if (inSidebar && actions) {
      if (!stepHome) { stepHome = document.createComment('Original position of New step'); button.before(stepHome); }
      if (button.parentNode !== actions) actions.insertBefore(button, byId('tt692-info'));
    } else if (stepHome?.parentNode && button.parentNode !== stepHome.parentNode) {
      stepHome.after(button);
    }
  }
  const setVar = (key, value) => {
    if (document.body.style.getPropertyValue(key) !== value) document.body.style.setProperty(key, value);
  };
  function choose(value) {
    if (value === 'collapse') collapsed = !collapsed;
    else { selected = value; collapsed = false; }
    layout();
  }
  let boardPanel, boardControls, boardActive = false, boardObjects = false, boardLayers = false;
  const panelHomes = new Map(), boardButtons = {};
  function boardFullscreenLayout() {
    const active = document.body.classList.contains('fullscreen-portrait') &&
      document.querySelector('.tab.on')?.dataset.panel === 'saves';
    if (active !== boardActive) { boardObjects = false; boardLayers = false; }
    const leaving = boardActive && !active;
    boardActive = active;
    if (!boardPanel) {
      boardPanel = document.createElement('aside'); boardPanel.id = 'tt-board-panel';
      boardPanel.setAttribute('aria-label', 'Objekt och lager');
      boardPanel.innerHTML = '<header><strong>Verktyg</strong><button type="button" data-section="close" aria-label="Stäng verktygspanelen">×</button></header>' +
        ['objects','layers'].map((key,i) => `<section data-part="${key}"><button type="button" data-section="${key}" aria-expanded="false">${i?'Lager':'Objekt'} <span aria-hidden="true">▸</span></button><div data-content="${key}"></div></section>`).join('');
      document.body.appendChild(boardPanel);
      boardControls = document.createElement('nav'); boardControls.id = 'tt-board-controls';
      boardControls.setAttribute('aria-label', 'Fullskärmens paneler');
      document.body.appendChild(boardControls);
      for (const key of ['objects','layers']) {
        const b = document.createElement('button'); b.id = 'tt-board-'+key; b.type='button'; b.className='ls-btn';
        b.textContent=key==='objects'?'Objekt':''; b.dataset.section=key;
        if(key==='layers')b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7l9-4 9 4-9 4-9-4zm0 5l9 4 9-4M3 17l9 4 9-4" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>Lager</span>';
        b.setAttribute('aria-label',key==='objects'?'Objekt':'Lager');
        b.setAttribute('aria-controls','tt-board-panel');
        boardButtons[key]=b;
        boardControls.appendChild(b);
        b.addEventListener('click', toggleBoardSection);
      }
      boardPanel.addEventListener('click',toggleBoardSection);
    }
    function toggleBoardSection(event) {
      const key=event.target.closest('[data-section]')?.dataset.section;
      if (!key) return;
      event.preventDefault(); event.stopPropagation();
      if(key==='close') {boardObjects=false;boardLayers=false;}
      if(key==='objects')boardObjects=!boardObjects;
      if(key==='layers')boardLayers=!boardLayers;
      boardFullscreenLayout();
    }
    document.body.classList.toggle('tt-board-fullscreen',active);
    const open=active&&(boardObjects||boardLayers);
    document.body.classList.toggle('tt-board-panel-open',!!open);
    boardPanel.hidden=!open;
    boardControls.hidden=!active;
    for(const [key,id,expanded] of [['objects','tt-objects-menu',boardObjects],['layers','tt616-layer-panel',boardLayers]]) {
      const button=boardButtons[key];
      if(button.parentNode!==boardControls)boardControls.appendChild(button);
      if(button) {button.hidden=!active;button.setAttribute('aria-expanded',String(active&&expanded));}
      const section=boardPanel.querySelector(`[data-part="${key}"]`);
      section.classList.toggle('expanded',expanded);
      const heading=section.querySelector('button'); heading.setAttribute('aria-expanded',String(expanded));
      heading.querySelector('span').textContent=expanded?'▾':'▸';
      const element=byId(id);
      if(active&&element) {
        if(!panelHomes.has(element)) {const home=document.createComment('Panel home');element.before(home);panelHomes.set(element,home);}
        const container=section.querySelector('[data-content]');if(element.parentNode!==container)container.appendChild(element);
        const details=key==='objects'?element:element.querySelector('details');
        if(key==='layers'&&details&&!details.querySelector('summary')) {
          const summary=document.createElement('summary');summary.dataset.sharedHeading='true';summary.hidden=true;summary.textContent='Lager';details.prepend(summary);
        }
        if(details)details.open=true;
      }
    }
    if(active||leaving) {
      document.body.classList.toggle('tt642-layer-panel-mobile-open',active&&boardLayers);
      window.__tt821WantedIpadLayerOpen=active&&boardLayers;
    }
    if(leaving) for(const [element,home] of panelHomes) {if(home.parentNode)home.after(element);element.querySelector('summary[data-shared-heading]')?.remove();if(element.id==='tt-objects-menu')element.open=false;}
    if(!active)return;
    const below=innerWidth<650;
    document.body.classList.toggle('tt-board-panel-below',below);
    const reserve=open?(below?Math.min(340,Math.round(innerHeight*.42)):300):0;
    const width=Math.max(100,innerWidth-64-(below?0:reserve));
    const top=below?112:64;
    setVar('--tt-board-top',top+'px');
    const height=Math.max(100,innerHeight-top-16-(below?reserve:0));
    const rotated=document.body.classList.contains('landscape')||document.body.classList.contains('tt523-fs-rotated-desktop');
    const svgWidth=(rotated?Math.min(height,width*2/3):Math.min(width,height*2/3))-4;
    setVar('--tt-board-reserve',reserve+'px');setVar('--tt-board-svg-width',svgWidth+'px');
    setVar('--tt-board-rotation',rotated?(document.body.classList.contains('landscape')?'-90deg':'90deg'):'0deg');
  }
  function fullscreenLayout() {
    const active = document.body.classList.contains('fullscreen-portrait') &&
      (document.body.classList.contains('v66-taktik-fs') ||
       document.body.classList.contains('tt743-mobile-taktikfilm-fullscreen') ||
       (document.querySelector('.tab.on')?.dataset.panel === 'taktik' && typeof isEditingTaktik !== 'undefined' && isEditingTaktik));
    const leavingFullscreen = filmFullscreen && !active;
    if (active !== filmFullscreen) {
      fullscreenLayersOpen = false; fullscreenObjectsOpen = false;
      // Do not carry an expanded overlay into the mobile editor.
      const menu = byId('tt-objects-menu');
      if (menu) menu.open = false;
    }
    // Mobile layer contents and touch handlers use the existing open state too.
    // Keep it in step with the fullscreen icon, including closing on exit.
    if (active || leavingFullscreen) {
      const mobileOpen = active && fullscreenLayersOpen && matchMedia('(pointer:coarse)').matches;
      document.body.classList.toggle('tt642-layer-panel-mobile-open', mobileOpen);
      window.__tt821WantedIpadLayerOpen = mobileOpen;
    }
    filmFullscreen = active;
    document.body.classList.toggle('tt-film-fs-panels', active);
    document.body.classList.toggle('tt-film-fs-layers-open', active && fullscreenLayersOpen);
    document.body.classList.toggle('tt-film-fs-objects-open', active && fullscreenObjectsOpen);
    if (!layerToggle) {
      layerToggle = document.createElement('button');
      layerToggle.id = 'tt-film-fs-layers';
      layerToggle.type = 'button';
      layerToggle.className = 'ls-btn';
      layerToggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7l9-4 9 4-9 4-9-4zm0 5l9 4 9-4M3 17l9 4 9-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
      layerToggle.setAttribute('aria-controls', 'tt616-layer-panel');
      layerToggle.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation();
        fullscreenLayersOpen = !fullscreenLayersOpen;
        fullscreenObjectsOpen = false;
        fullscreenLayout();
      });
    }
    if (!objectToggle) {
      objectToggle = document.createElement('button');
      objectToggle.id = 'tt-film-fs-objects';
      objectToggle.type = 'button';
      objectToggle.className = 'ls-btn';
      objectToggle.textContent = '⚽';
      objectToggle.setAttribute('aria-controls', 'tt-objects-menu');
      objectToggle.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation();
        fullscreenObjectsOpen = !fullscreenObjectsOpen;
        fullscreenLayersOpen = false;
        fullscreenLayout();
      });
    }
    const toolbar = byId('fs-top-tools');
    if (toolbar && objectToggle.parentNode !== toolbar) toolbar.appendChild(objectToggle);
    objectToggle.hidden = !active;
    objectToggle.title = fullscreenObjectsOpen ? 'Stäng objekt' : 'Öppna objekt';
    objectToggle.setAttribute('aria-label', objectToggle.title);
    objectToggle.setAttribute('aria-expanded', String(active && fullscreenObjectsOpen));
    if (active && fullscreenObjectsOpen && byId('tt-objects-menu')) byId('tt-objects-menu').open = true;
    if (toolbar && layerToggle.parentNode !== toolbar) toolbar.appendChild(layerToggle);
    layerToggle.hidden = !active;
    layerToggle.title = fullscreenLayersOpen ? 'Stäng lager' : 'Öppna lager';
    layerToggle.setAttribute('aria-label', layerToggle.title);
    layerToggle.setAttribute('aria-expanded', String(active && fullscreenLayersOpen));
    if (active && fullscreenLayersOpen) {
      const details = byId('tt616-layer-panel')?.querySelector('details');
      if (details && !details.open) details.open = true;
    }
  }
  // Match lineup uses the existing bench and pitch; no match data is changed.
  function lineupLayout() {
    const active = document.querySelector('.tab.on')?.dataset.panel === 'formations' &&
      typeof matchRoster !== 'undefined' && matchRoster.length > 0 &&
      byId('bench-bar')?.classList.contains('active') && !document.body.classList.contains('fullscreen-portrait');
    document.body.classList.toggle('tt-lineup-layout', !!active);
    if (!active) return;
    const side = innerWidth >= 1100 && matchMedia('(pointer:fine)').matches;
    document.body.classList.toggle('tt-lineup-side', side);
    const top = Math.max(8, byId('topbar').getBoundingClientRect().bottom + 8);
    const benchHeight = Math.min(220, Math.round(innerHeight * 0.27));
    setVar('--tt-lineup-top', top + 'px');
    setVar('--tt-lineup-bench-height', benchHeight + 'px');
    const width = innerWidth - (side ? 320 : 24);
    const height = innerHeight - top - (side ? 16 : benchHeight + 24);
    const viewBox = byId('pitch-svg').viewBox.baseVal;
    const ratio = viewBox.height / viewBox.width || 0.75;
    const rotated = document.body.classList.contains('landscape') && !document.body.classList.contains('desktop');
    const svgWidth = Math.max(1, (rotated ? Math.min(height, width / ratio) : Math.min(width, height / ratio)) - 4);
    setVar('--tt-lineup-pitch-width', svgWidth + 'px');
    setVar('--tt-lineup-pitch-height', svgWidth * ratio + 'px');
    setVar('--tt-lineup-rotation', rotated ? '-90deg' : '0deg');
  }
  function layout() {
    if (!nav) return false;
    fullscreenLayout();
    boardFullscreenLayout();
    lineupLayout();
    const panel = document.querySelector('.tab.on')?.dataset.panel;
    const editing = panel === 'taktik' && typeof isEditingTaktik !== 'undefined' && isEditingTaktik;
    const active = (panel === 'saves' || editing) && innerWidth >= 1024 && matchMedia('(pointer:fine)').matches
      && !document.body.classList.contains('fullscreen-portrait');
    nav.hidden = !active;
    document.body.classList.toggle('tt-workspace', active);
    if (!active) {
      document.body.classList.remove('tt-workspace-film', 'tt-workspace-collapsed');
      context = '';
      placeStepButton(false);
      return false;
    }
    placeStepButton(editing);
    const nextContext = editing ? 'film' : 'board';
    if (context !== nextContext) { context = nextContext; selected = 'main'; collapsed = false; }
    document.body.classList.toggle('tt-workspace-film', editing);
    document.body.classList.toggle('tt-workspace-collapsed', collapsed);
    document.body.classList.remove('tt-objects-docked');
    if (document.body.dataset.workspaceTab !== selected) document.body.dataset.workspaceTab = selected;
    const header = byId(editing ? 'taktikbar' : 'topbar');
    const top = Math.max(editing ? 112 : 160, (header?.getBoundingClientRect().bottom || 0) + 8);
    setVar('--tt-workspace-top', top + 'px');
    setVar('--tt-workspace-left', collapsed ? '8px' : '288px');
    const objectMenu = byId('tt-objects-menu');
    if (objectMenu) {
      objectMenu.classList.remove('docked');
      objectMenu.open = !collapsed;
    }
    nav.querySelector('[data-workspace="main"]').textContent = editing ? 'Steg' : 'Tavlor';
    for (const button of nav.querySelectorAll('[role="tab"]')) {
      button.setAttribute('aria-selected', String(!collapsed && selected === button.dataset.workspace));
    }
    const toggle = nav.querySelector('[data-workspace="collapse"]');
    toggle.textContent = collapsed ? '▸' : '◂';
    toggle.setAttribute('aria-label', collapsed ? 'Öppna sidopanel' : 'Fäll ihop sidopanel');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    const layers = byId('tt616-layer-panel')?.querySelector('details');
    if (selected === 'layers' && layers && !layers.open) layers.open = true;
    return true;
  }
  function init() {
    nav = document.createElement('nav');
    nav.id = 'tt-workspace-tabs'; nav.hidden = true;
    nav.setAttribute('aria-label', 'Arbetsyta');
    nav.innerHTML = `<div role="tablist" aria-label="Sidopanel">
      <button type="button" role="tab" data-workspace="main">Tavlor</button>
      <button type="button" role="tab" data-workspace="objects" aria-controls="tt-objects-menu">Objekt</button>
      <button type="button" role="tab" data-workspace="layers" aria-controls="tt616-layer-panel">Lager</button>
      </div><button type="button" data-workspace="collapse" aria-label="Fäll ihop sidopanel">◂</button>`;
    document.body.appendChild(nav);
    nav.addEventListener('click', event => {
      const button = event.target.closest('[data-workspace]');
      if (button) { event.preventDefault(); choose(button.dataset.workspace); }
    });
    // The Object heading also collapses the shared panel.
    document.addEventListener('click', event => {
      if (!event.target.closest('#tt-objects-menu > summary')) return;
      if (filmFullscreen) {
        event.preventDefault();
        fullscreenObjectsOpen = false;
        byId('tt-objects-menu').open = false;
        fullscreenLayout();
      } else if (document.body.classList.contains('tt-workspace')) {
        event.preventDefault(); choose('collapse');
      }
    }, true);
    // App fullscreen is a body class, not necessarily browser fullscreen.
    const viewState=()=>['fullscreen-portrait','landscape','tt523-fs-rotated-desktop'].map(c=>document.body.classList.contains(c)).join(':');
    let wasFullscreen = viewState();
    new MutationObserver(() => {
      const next = viewState();
      if (next !== wasFullscreen) { wasFullscreen = next; layout(); }
    }).observe(document.body, {attributes:true, attributeFilter:['class']});
    const lineupObserver = new MutationObserver(lineupLayout);
    for (const element of [byId('bench-bar'), byId('pitch-svg'), ...document.querySelectorAll('.tab')]) {
      if (element) lineupObserver.observe(element, {attributes:true, attributeFilter:['class','viewBox']});
    }
    window.addEventListener('resize',layout);
    layout();
  }
  window.TTWorkspace = { layout, choose };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
