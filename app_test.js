/* === v676 TEST – Taktikfilm ritval en ägare ===
   Bas: v668 layoutbas enligt överlämningen.
   Problem efter v675: ritvalen hoppade mellan tre ägare:
   - pitch-wrapper/gammal planposition
   - v667-slotten i Taktikfilm-raden
   - v674-inline direkt efter aktiv ritknapp
   Mål:
   - Taktikfilm desktop-layout får en enda ägare för ritvalen.
   - Ingen MutationObserver, ingen setInterval.
   - Produktion/Supabase rörs inte.
*/
(function(){
  'use strict';

  if(window.__tt676TaktikfilmRitvalEnAgareFixInstalled)return;
  window.__tt676TaktikfilmRitvalEnAgareFixInstalled=true;

  /*
    Viktigt: app_test.js laddas före de sena inline-blocken i index_test.html.
    Därför kan vi stoppa de kända konkurrerande ägarna innan de installerar
    egna flyttare/listeners/wrappers.
  */
  window.__tt667TaktikDesktopLayoutPutsInstalled=true;
  window.__tt668TaktikDesktopLayoutFixInstalled=true;
  window.__tt674TaktikfilmRitvalInToolbarInstalled=true;

  var optionIds=['arrow-options','freehand-options','zone-options'];

  function isDesktop(){
    try{return !!(window.matchMedia && window.matchMedia('(min-width:1024px) and (pointer:fine)').matches);}
    catch(e){return false;}
  }

  function isTaktikEditor(){
    try{
      if(!isDesktop())return false;
      if(!document.body || document.body.classList.contains('fullscreen-portrait'))return false;
      var tab=document.querySelector('.tab.on[data-panel="taktik"]');
      var edit=document.getElementById('edit-taktik-ui');
      var bar=document.getElementById('taktikbar');
      var editVisible=!!(edit && getComputedStyle(edit).display!=='none');
      var barVisible=!!(bar && getComputedStyle(bar).display!=='none');
      return !!(tab && editVisible && barVisible);
    }catch(e){return false;}
  }

  function active(){
    try{
      return !!(document.body && document.body.classList &&
        document.body.classList.contains('tt666-taktik-desktop-layout') &&
        !document.body.classList.contains('fullscreen-portrait') &&
        isDesktop());
    }catch(e){return false;}
  }

  function ensureStyle(){
    if(document.getElementById('tt676-taktikfilm-ritval-en-agare-css'))return;
    var st=document.createElement('style');
    st.id='tt676-taktikfilm-ritval-en-agare-css';
    st.textContent=[
      'span[style*="font-size:0.6rem"][style*="letter-spacing"]::after{content:"676 TEST"!important}',
      '@media (min-width:1024px) and (pointer:fine){',
      '  body.tt666-taktik-desktop-layout:not(.fullscreen-portrait) #tt667-draw-options-slot{display:none!important;visibility:hidden!important;pointer-events:none!important;width:0!important;min-width:0!important;margin:0!important;padding:0!important;overflow:hidden!important}',
      '  body.tt666-taktik-desktop-layout:not(.fullscreen-portrait) #arrow-options,',
      '  body.tt666-taktik-desktop-layout:not(.fullscreen-portrait) #zone-options,',
      '  body.tt666-taktik-desktop-layout:not(.fullscreen-portrait) #freehand-options{',
      '    position:fixed!important;',
      '    left:var(--tt676-options-left, 430px)!important;',
      '    top:var(--tt676-options-top, 82px)!important;',
      '    right:auto!important;',
      '    bottom:auto!important;',
      '    transform:none!important;',
      '    z-index:190!important;',
      '    max-width:min(560px, calc(100vw - var(--tt676-options-left, 430px) - 18px))!important;',
      '    overflow-x:auto!important;',
      '    overflow-y:hidden!important;',
      '    background:rgba(17,26,20,.96)!important;',
      '    border:1px solid rgba(74,232,122,.32)!important;',
      '    border-radius:8px!important;',
      '    padding:2px 4px!important;',
      '    box-shadow:0 6px 18px rgba(0,0,0,.28)!important;',
      '    gap:4px!important;',
      '    align-items:center!important;',
      '    white-space:nowrap!important;',
      '  }',
      '  body.tt666-taktik-desktop-layout:not(.fullscreen-portrait) #arrow-options.tt674-taktik-options,',
      '  body.tt666-taktik-desktop-layout:not(.fullscreen-portrait) #zone-options.tt674-taktik-options,',
      '  body.tt666-taktik-desktop-layout:not(.fullscreen-portrait) #freehand-options.tt674-taktik-options{',
      '    position:fixed!important;',
      '    left:var(--tt676-options-left, 430px)!important;',
      '    top:var(--tt676-options-top, 82px)!important;',
      '    right:auto!important;',
      '    transform:none!important;',
      '    flex:initial!important;',
      '    margin:0!important;',
      '  }',
      '  body.tt666-taktik-desktop-layout:not(.fullscreen-portrait) #arrow-options select,',
      '  body.tt666-taktik-desktop-layout:not(.fullscreen-portrait) #zone-options select,',
      '  body.tt666-taktik-desktop-layout:not(.fullscreen-portrait) #freehand-options select{',
      '    max-width:118px!important;',
      '    height:26px!important;',
      '    min-height:26px!important;',
      '    padding:2px 5px!important;',
      '    font-size:.66rem!important;',
      '  }',
      '  body.tt666-taktik-desktop-layout:not(.fullscreen-portrait) #arrow-options button,',
      '  body.tt666-taktik-desktop-layout:not(.fullscreen-portrait) #zone-options button,',
      '  body.tt666-taktik-desktop-layout:not(.fullscreen-portrait) #freehand-options button{',
      '    height:26px!important;',
      '    min-height:26px!important;',
      '    padding:2px 6px!important;',
      '    font-size:.65rem!important;',
      '    white-space:nowrap!important;',
      '  }',
      '  body.tt666-taktik-desktop-layout:not(.fullscreen-portrait) #tt668-taktik-fs-btn{',
      '    display:inline-flex!important;',
      '    align-items:center!important;',
      '    justify-content:center!important;',
      '    padding:3px 7px!important;',
      '    font-size:.65rem!important;',
      '    color:#4ae87a!important;',
      '    border-color:#4ae87a!important;',
      '    white-space:nowrap!important;',
      '  }',
      '}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function setVersion(){
    try{document.title='Taktiktavla TEST v676 ritval en ägare';}catch(e){}
    try{
      document.querySelectorAll('span[style*="font-size:0.6rem"][style*="letter-spacing"]').forEach(function(s){
        s.textContent='676 TEST';
      });
    }catch(e){}
  }

  function ownBodyClass(){
    try{
      if(!document.body || !document.body.classList)return;
      document.body.classList.toggle('tt666-taktik-desktop-layout', isTaktikEditor());
    }catch(e){}
  }

  function ensureLayerPanelOpen(){
    try{
      if(!active())return;
      var details=document.querySelector('#tt616-layer-panel details');
      if(details)details.setAttribute('open','');
    }catch(e){}
  }

  function returnOptionsToPitch(){
    try{
      if(!active())return;
      var pitch=document.getElementById('pitch-wrapper');
      if(!pitch)return;
      optionIds.forEach(function(id){
        var el=document.getElementById(id);
        if(!el)return;
        el.classList.remove('tt674-taktik-options');
        if(el.parentNode!==pitch)pitch.appendChild(el);
      });
      var slot=document.getElementById('tt667-draw-options-slot');
      if(slot)slot.style.display='none';
    }catch(e){}
  }

  function positionOptions(){
    try{
      if(!active())return;
      var bar=document.getElementById('taktikbar');
      if(!bar || !bar.children || !bar.children[1])return;
      var row=bar.children[1];
      var anchor=document.getElementById('btn-tb-movement') ||
                 document.getElementById('btn-tb-text') ||
                 document.getElementById('btn-tb-zone') ||
                 row.lastElementChild;
      var rr=row.getBoundingClientRect();
      var ar=anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : rr;

      var left=Math.round(Math.max(ar.right+8, rr.left+220, 8));
      var top=Math.round(Math.max(rr.top+1, 6));

      if(left>window.innerWidth-160)left=Math.max(8, Math.round(rr.left+220));
      document.documentElement.style.setProperty('--tt676-options-left', left+'px');
      document.documentElement.style.setProperty('--tt676-options-top', top+'px');
    }catch(e){}
  }

  function ensureFullscreenButton(){
    try{
      var bar=document.getElementById('taktikbar');
      if(!bar)return;
      var row=bar.children && bar.children[0];
      if(!row)return;

      var btn=document.getElementById('tt668-taktik-fs-btn');
      if(!btn){
        btn=document.createElement('button');
        btn.className='btn';
        btn.id='tt668-taktik-fs-btn';
        btn.type='button';
        btn.title='Helskärm';
        btn.textContent='⛶ Fullskärm';
        btn.addEventListener('click',function(ev){
          ev.preventDefault();
          ev.stopPropagation();
          try{
            if(typeof window.enterFullscreenPortrait==='function')window.enterFullscreenPortrait();
            else if(typeof enterFullscreenPortrait==='function')enterFullscreenPortrait();
            else {
              var old=document.getElementById('btn-fs-topbar') || document.getElementById('fs-enter-btn');
              if(old)old.click();
            }
          }catch(e){}
        },{passive:false});
      }

      if(btn.parentNode!==row){
        var before=document.getElementById('btn-edit-update-step2') ||
                   document.getElementById('btn-taktikbar-save') ||
                   document.getElementById('btn-stop-play') ||
                   null;
        if(before && before.parentNode===row)row.insertBefore(btn,before);
        else row.appendChild(btn);
      }
      btn.style.display=active()?'inline-flex':'none';
    }catch(e){}
  }

  function apply(){
    ensureStyle();
    setVersion();
    ownBodyClass();
    ensureLayerPanelOpen();
    returnOptionsToPitch();
    positionOptions();
    ensureFullscreenButton();
  }

  var rafPending=false;
  function schedule(){
    if(rafPending)return;
    rafPending=true;
    requestAnimationFrame(function(){
      rafPending=false;
      apply();
    });
  }

  function init(){
    apply();

    /*
      En enda kontrollerad händelseuppsättning för v676.
      Ingen MutationObserver, ingen setInterval och inga upprepade timeoutkedjor.
    */
    ['click','touchend','keyup','resize','orientationchange'].forEach(function(evt){
      window.addEventListener(evt,schedule,true);
    });

    var oldSetMode=typeof window.setMode==='function'?window.setMode:(typeof setMode==='function'?setMode:null);
    if(oldSetMode && !oldSetMode.__tt676Wrapped){
      var wrapped=function(){
        var res=oldSetMode.apply(this,arguments);
        schedule();
        return res;
      };
      wrapped.__tt676Wrapped=true;
      try{window.setMode=wrapped; setMode=wrapped;}catch(e){}
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  window.addEventListener('load',schedule,{once:true});
})();
