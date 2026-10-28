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
  function fullscreenLayout() {
    const active = document.body.classList.contains('fullscreen-portrait') &&
      (document.body.classList.contains('v66-taktik-fs') ||
       document.body.classList.contains('tt743-mobile-taktikfilm-fullscreen') ||
       (document.querySelector('.tab.on')?.dataset.panel === 'taktik' && typeof isEditingTaktik !== 'undefined' && isEditingTaktik));
    if (active !== filmFullscreen) {
      fullscreenLayersOpen = false; fullscreenObjectsOpen = false;
      // Do not carry an expanded overlay into the mobile editor.
      const menu = byId('tt-objects-menu');
      if (menu) menu.open = false;
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
  function layout() {
    if (!nav) return false;
    fullscreenLayout();
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
    let wasFullscreen = document.body.classList.contains('fullscreen-portrait');
    new MutationObserver(() => {
      const next = document.body.classList.contains('fullscreen-portrait');
      if (next !== wasFullscreen) { wasFullscreen = next; layout(); }
    }).observe(document.body, {attributes:true, attributeFilter:['class']});
    layout();
  }
  window.TTWorkspace = { layout, choose };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
