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
    if (document.body.classList.contains('tt-board-editor')) {
      if(value==='objects'){boardObjects=!boardObjects;editorFiles=false;}
      if(value==='layers'){boardLayers=!boardLayers;editorFiles=false;}
      if(value==='main'){editorFiles=!editorFiles;boardObjects=false;boardLayers=false;}
      if(value==='collapse'){editorFiles=false;boardObjects=false;boardLayers=false;}
      layout();return;
    }
    if (value === 'collapse') collapsed = !collapsed;
    else { collapsed = selected === value && !collapsed; selected = value; }
    layout();
  }
  let editorDraw = true, editorDrawButton, editorFiles = true, boardContext = '';
  let boardPanel, boardControls, boardActive = false, boardDraw = false, boardObjects = false, boardLayers = false;
  const panelHomes = new Map(), boardButtons = {};
  function boardFullscreenLayout() {
    const fullscreen = document.body.classList.contains('fullscreen-portrait');
    const active = document.querySelector('.tab.on')?.dataset.panel === 'saves';
    const nextContext = active ? (fullscreen ? 'fullscreen' : 'editor') : '';
    if(nextContext!==boardContext){boardObjects=false;boardLayers=false;boardDraw=false;editorFiles=true;boardContext=nextContext;}
    document.body.classList.toggle('tt-board-editor',active&&!fullscreen);
    if (active !== boardActive) { boardDraw = false; boardObjects = false; boardLayers = false; }
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
      for (const key of ['draw','objects','layers']) {
        const b = document.createElement('button'); b.id = 'tt-board-'+key; b.type='button'; b.className='ls-btn';
        b.textContent=key==='draw'?'Ritverktyg':key==='objects'?'Objekt':''; b.dataset.section=key;
        if(key==='layers')b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7l9-4 9 4-9 4-9-4zm0 5l9 4 9-4M3 17l9 4 9-4" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>Lager</span>';
        b.setAttribute('aria-label',key==='draw'?'Ritverktyg':key==='objects'?'Objekt':'Lager');
        b.setAttribute('aria-controls',key==='draw'?'fs-top-tools':'tt-board-panel');
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
      if(key==='draw')boardDraw=!boardDraw;
      if(key==='objects')boardObjects=!boardObjects;
      if(key==='layers')boardLayers=!boardLayers;
      layout();
    }
    document.body.classList.toggle('tt-board-fullscreen',active&&fullscreen);
    document.body.classList.toggle('tt-board-draw-open',active&&boardDraw);
    boardButtons.draw.setAttribute('aria-expanded',String(active&&boardDraw));
    const open=active&&(boardObjects||boardLayers);
    document.body.classList.toggle('tt-board-panel-open',!!open);
    boardPanel.hidden=!open;
    boardControls.hidden=!(active&&fullscreen);
    const exitButton=byId('fs-restore-btn');
    if(active&&fullscreen&&exitButton){
      if(!exitButton.dataset.originalText)exitButton.dataset.originalText=exitButton.textContent;
      exitButton.textContent='⤢';exitButton.title='Lämna helskärm';exitButton.setAttribute('aria-label','Lämna helskärm');
    }else if(exitButton?.dataset.originalText){exitButton.textContent=exitButton.dataset.originalText;exitButton.removeAttribute('aria-label');exitButton.removeAttribute('title');}
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
    if(!active||!fullscreen)return;
    const touch = matchMedia('(pointer:coarse)').matches;
    const viewport = window.visualViewport;
    const screenWidth = touch && viewport ? viewport.width : innerWidth;
    const screenHeight = touch && viewport ? viewport.height : innerHeight;
    if(touch) {
      setVar('--tt-vv-top', (viewport?.offsetTop || 0) + 'px');
      setVar('--tt-vv-left', (viewport?.offsetLeft || 0) + 'px');
      setVar('--tt-vv-right', Math.max(0,innerWidth-screenWidth-(viewport?.offsetLeft||0)) + 'px');
      setVar('--tt-vv-bottom', Math.max(0,innerHeight-screenHeight-(viewport?.offsetTop||0)) + 'px');
    }
    const below=screenWidth<650;
    document.body.classList.toggle('tt-board-panel-below',below);
    const reserve=open?(below?Math.min(340,Math.round(screenHeight*.42)):300):0;
    const controlsRect=boardControls.getBoundingClientRect();
    const toolsRect=byId('fs-top-tools')?.getBoundingClientRect();
    const top=Math.max(controlsRect.bottom,boardDraw?(toolsRect?.bottom||0):0)+8;
    const safeLeft=touch ? parseFloat(getComputedStyle(boardControls).getPropertyValue('--tt-safe-left'))||0 : 0;
    const safeRight=touch ? parseFloat(getComputedStyle(boardControls).getPropertyValue('--tt-safe-right'))||0 : 0;
    const safeBottom=touch ? parseFloat(getComputedStyle(boardControls).getPropertyValue('--tt-safe-bottom'))||0 : 0;
    setVar('--tt-board-bottom', (touch ? Math.max(16,innerHeight-screenHeight-(viewport?.offsetTop||0)+safeBottom+8) : 16) + 'px');
    const width=Math.max(100,screenWidth-64-safeLeft-safeRight-(below?0:reserve));
    setVar('--tt-board-top',top+'px');
    const bottom=parseFloat(document.body.style.getPropertyValue('--tt-board-bottom'))||16;
    const height=Math.max(100,innerHeight-top-bottom-(below?reserve:0));
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
  function editorDrawingLayout() {
    const active = !document.body.classList.contains('fullscreen-portrait') &&
      ['saves','formations'].includes(document.querySelector('.tab.on')?.dataset.panel) &&
      !(typeof matchRoster !== 'undefined' && matchRoster.length);
    if(!editorDrawButton){
      editorDrawButton=document.createElement('button');editorDrawButton.type='button';
      editorDrawButton.id='tt-editor-draw';editorDrawButton.className='btn';editorDrawButton.textContent='Ritverktyg';
      editorDrawButton.addEventListener('click',()=>{editorDraw=!editorDraw;layout();window.tt964PlaceBoardDrawOptions?.();});
      byId('topbar')?.firstElementChild?.appendChild(editorDrawButton);
    }
    const tabRow=document.querySelector('.tab[data-panel="saves"]')?.parentElement;
    if(!document.body.classList.contains('tt-board-editor') && matchMedia('(pointer:coarse)').matches && tabRow && editorDrawButton.parentElement!==tabRow)tabRow.prepend(editorDrawButton);
    if(!document.body.classList.contains('tt-board-editor') && !matchMedia('(pointer:coarse)').matches && editorDrawButton.parentElement===nav)byId('topbar')?.firstElementChild?.appendChild(editorDrawButton);
    editorDrawButton.hidden=!active;
    editorDrawButton.setAttribute('aria-expanded',String(active&&editorDraw));
    document.body.classList.toggle('tt-editor-draw-closed',active&&!editorDraw);
    if(!active)return;
    for(const row of document.querySelectorAll('.tt248-tavla-rita-row,.tt238-rita-scrollbar,#tt252-ipad-rita-row')) {
      if(row.parentElement?.classList.contains('tt-editor-draw-host') || row.closest('#fs-top-tools,#taktikbar'))continue;
      const host=document.createElement('div');host.className='tt-editor-draw-host';
      row.before(host);host.appendChild(row);
    }
  }
  function editorBoardLayout() {
    if(!document.body.classList.contains('tt-board-editor'))return false;
    document.body.classList.remove('tt-workspace','tt-workspace-film','tt-workspace-collapsed','tt-objects-docked');
    placeStepButton(false);context='';nav.hidden=false;byId('tt-objects-menu')?.classList.remove('docked');
    if(editorDrawButton.parentNode!==nav)nav.prepend(editorDrawButton);
    let fullscreenButton=byId('tt-editor-fullscreen');
    if(!fullscreenButton){
      fullscreenButton=document.createElement('button');fullscreenButton.id='tt-editor-fullscreen';fullscreenButton.type='button';
      fullscreenButton.textContent='⤢';fullscreenButton.title='Öppna helskärm';fullscreenButton.setAttribute('aria-label','Öppna helskärm');
      fullscreenButton.addEventListener('click',()=>byId('btn-fs-topbar')?.click());nav.appendChild(fullscreenButton);
    }
    nav.querySelector('[data-workspace="main"]').textContent='Tavlor';
    for(const button of nav.querySelectorAll('[role="tab"]')){
      const key=button.dataset.workspace;
      button.setAttribute('aria-selected',String(key==='main'?editorFiles:key==='objects'?boardObjects:boardLayers));
    }
    document.body.classList.toggle('tt-editor-files-open',editorFiles);
    const headerBottom=Math.max(byId('topbar').getBoundingClientRect().bottom,...Array.from(document.querySelectorAll('#topbar .tab[data-panel]')).map(el=>{const r=el.getBoundingClientRect();return r.width&&r.height?r.bottom:0;}));
    setVar('--tt-editor-menu-top',Math.max(8,headerBottom+6)+'px');
    const top=nav.getBoundingClientRect().bottom+8;
    const below=innerWidth<650;
    document.body.classList.toggle('tt-board-panel-below',below);
    const open=editorFiles||boardObjects||boardLayers;
    const reserve=open?(below?Math.min(340,Math.round(innerHeight*.38)):300):0;
    setVar('--tt-board-reserve',reserve+'px');setVar('--tt-board-top',top+'px');
    const style=getComputedStyle(document.body);
    const safe=side=>parseFloat(style.getPropertyValue('--tt-safe-'+side))||0;
    const bottom=Math.max(16,safe('bottom')+8);
    setVar('--tt-board-bottom',bottom+'px');
    const width=Math.max(100,innerWidth-32-safe('left')-safe('right')-(below?0:reserve));
    const height=Math.max(100,innerHeight-top-bottom-(below?reserve:0));
    const vb=byId('pitch-svg').viewBox.baseVal;const ratio=vb.height/vb.width||1.5;
    const rotated=document.body.classList.contains('landscape');
    const size=Math.max(1,(rotated?Math.min(height,width/ratio):Math.min(width,height/ratio))-4);
    setVar('--tt-editor-svg-width',size+'px');setVar('--tt-editor-svg-height',size*ratio+'px');
    setVar('--tt-editor-rotation',rotated?'-90deg':'0deg');
    return true;
  }
  function layout() {
    if (!nav) return false;
    fullscreenLayout();
    boardFullscreenLayout();
    lineupLayout();
    editorDrawingLayout();
    if(editorBoardLayout())return true;
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
    const top = Math.max(editing ? 112 : (editorDraw ? 160 : 80), (header?.getBoundingClientRect().bottom || 0) + 8);
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
    const headerObserver = new ResizeObserver(layout);
    [byId('topbar'),document.querySelector('.tab')?.parentElement].filter(Boolean).forEach(el=>headerObserver.observe(el));
    const tabObserver = new MutationObserver(layout);
    document.querySelectorAll('.tab').forEach(tab=>tabObserver.observe(tab,{attributes:true,attributeFilter:['class']}));
    window.visualViewport?.addEventListener('resize',layout);
    window.visualViewport?.addEventListener('scroll',layout);
    window.addEventListener('resize',layout);
    layout();
  }
  window.TTWorkspace = { layout, choose, drawControlsHidden: () =>
    (document.body.classList.contains('tt-board-fullscreen') && !boardDraw) || document.body.classList.contains('tt-editor-draw-closed') };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
