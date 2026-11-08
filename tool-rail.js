/* Stable desktop tool controls. Original option elements retain their handlers. */
(function(){
 'use strict';
 const byId=id=>document.getElementById(id);
 const paths={
  move:'M8 12V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v9c0 4-3 7-7 7h-1c-2 0-4-1-5-3l-4-6a2 2 0 0 1 3-2l2 2',
  arrow:'M5 19 19 5M7 5h12v12', freehand:'m4 16 12-12 4 4L8 20H4v-4ZM14 6l4 4',
  zone:'M4 5h16v14H4z',text:'M5 5h14M12 5v15M8 20h8',movement:'M4 19c0-12 14 0 14-14M13 5h5v5',
  undo:'M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12',clear:'m4 14 9-10 7 7-9 10H8l-4-4v-3ZM9 10l7 7M11 21h10',reset:'M5 8a8 8 0 1 1-1 8M5 3v5h5'};
 let rail,panel,content,heading,open=false,lastMode='',lastContext='',enabled=false,scheduled=false;
 const homes=new Map();
 const optionIds={arrow:'arrow-options',freehand:'freehand-options',zone:'zone-options'};
 const desktopMedia=matchMedia('(min-width:1024px) and (pointer:fine)');
 function active(){
  if(!desktopMedia.matches||document.body.classList.contains('fullscreen-portrait'))return false;
  const view=document.querySelector('.tab.on')?.dataset.panel;
  return view==='saves'||(view==='formations'&&!(window.matchRoster?.length))||(view==='taktik'&&window.isEditingTaktik);
 }
 const currentMode=()=>typeof mode==='string'?mode:'move';
 function inset(){return active()?64+(open?224:0):0;}
 function attr(el,key,value){value=String(value);if(el.getAttribute(key)!==value)el.setAttribute(key,value);}
 function layout(){
  if(!rail)return;
  const on=active(),context=document.querySelector('.tab.on')?.dataset.panel||'';
  if(context!==lastContext){open=false;lastContext=context;}
  const tool=currentMode();
  if(tool!==lastMode){open=tool in optionIds||tool==='text'||tool==='movement';lastMode=tool;}
  if(tool==='move')open=false;
  document.body.classList.toggle('tt-tool-rail-active',!!on);
  document.body.classList.toggle('tt-tool-options-open',!!on&&open);
  rail.hidden=!on;panel.hidden=!on||!open;
  if(!on){
   if(enabled)for(const [el,home] of homes)if(home.parentNode)home.after(el);
   enabled=false;return;
  }
  enabled=true;
  for(const id of Object.values(optionIds)){
   const el=byId(id);if(!el)continue;
   if(!homes.has(el)){const home=document.createComment('Drawing options home');el.before(home);homes.set(el,home);}
   if(el.parentNode!==content){el.style.removeProperty('display');content.appendChild(el);}
   el.classList.toggle('tt-rail-option-active',optionIds[tool]===id);
  }
  for(const button of rail.querySelectorAll('[data-tool]')){
   attr(button,'aria-pressed',button.dataset.tool===tool);
   if(button.dataset.tool in optionIds)attr(button,'aria-expanded',button.dataset.tool===tool&&open);
   button.hidden=button.dataset.tool==='movement'&&context!=='taktik';
  }
  const title=rail.querySelector(`[data-tool="${tool}"]`)?.getAttribute('aria-label')||'Verktyg';
  if(heading.textContent!==title)heading.textContent=title;
  const hint=byId('tt-tool-hint');hint.hidden=tool in optionIds;
  const text=tool==='text'?'Tryck på planen för att skriva text. Färg och storlek väljs i textrutan.':'Välj en spelare och rita rörelsebanan på planen.';
  if(hint.textContent!==text)hint.textContent=text;
  const top=document.body.classList.contains('tt-board-editor')?parseFloat(document.body.style.getPropertyValue('--tt-board-top')):parseFloat(document.body.style.getPropertyValue('--tt-workspace-top'))+46;
  const insetValue=inset()+'px';if(document.body.style.getPropertyValue('--tt-rail-inset')!==insetValue)document.body.style.setProperty('--tt-rail-inset',insetValue);
  const rect=byId('pitch-wrapper').getBoundingClientRect(),vb=byId('pitch-svg').viewBox.baseVal;
  const fit=Math.max(80,Math.min(rect.height,rect.width*vb.width/vb.height)-4)+'px';if(document.body.style.getPropertyValue('--tt-rail-film-size')!==fit)document.body.style.setProperty('--tt-rail-film-size',fit);
  const value=Math.max(80,top||140)+'px';if(rail.style.top!==value){rail.style.top=value;panel.style.top=value;}
 }
 function update(){layout();window.TTWorkspace?.layout();layout();}
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;update();});}
 function init(){
  rail=document.createElement('nav');rail.id='tt-tool-rail';rail.setAttribute('aria-label','Ritverktyg');rail.hidden=true;
  const names={move:'Handen',arrow:'Pil',freehand:'Frihandspenna',zone:'Former',text:'Text',movement:'Rörelsebana',undo:'Ångra',clear:'Rensa ritningar',reset:'Återställ spelare och boll'};
  for(const [key,name] of Object.entries(names)){
   const button=document.createElement('button');button.type='button';button.id='tt-tool-'+key;button.title=name;button.setAttribute('aria-label',name);
   button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+paths[key]+'"/></svg>';
   if(['undo','clear','reset'].includes(key))button.dataset.action=key;else button.dataset.tool=key;
   button.addEventListener('click',()=>{
    if(button.dataset.tool){
     if(currentMode()===key&&key!=='move')open=!open;
     else {setMode(key);open=key!=='move';lastMode=key;}
    }else{
     const film=window.isEditingTaktik&&document.querySelector('.tab.on')?.dataset.panel==='taktik';
     const ids=key==='undo'?(film?['btn-tb-undo']:['tt236-rita-undo']):key==='clear'?(film?['btn-tb-clear-drawings']:['tt236-rita-clear']):(film?['btn-tb-reset-start']:['tt236-rita-reset']);
     for(const id of ids){const b=byId(id);if(b){b.click();break;}}
    }
    update();
   });rail.appendChild(button);
  }
  panel=document.createElement('aside');panel.id='tt-tool-options';panel.hidden=true;panel.setAttribute('aria-label','Verktygsinställningar');
  const header=document.createElement('header');heading=document.createElement('strong');header.appendChild(heading);
  const close=document.createElement('button');close.type='button';close.textContent='×';close.title='Fäll undan inställningar';close.setAttribute('aria-label',close.title);close.onclick=()=>{open=false;update();};header.appendChild(close);
  content=document.createElement('div');content.id='tt-tool-options-content';const hint=document.createElement('p');hint.id='tt-tool-hint';content.appendChild(hint);panel.append(header,content);document.body.append(rail,panel);
  const labels={'arrow-color-sel':'Färg','arrow-type-sel':'Linjetyp','arrow-head-sel':'Pil eller linje','arrow-width-sel':'Tjocklek','freehand-color-sel':'Färg','freehand-width-sel':'Tjocklek','zone-shape-sel':'Form','zone-color-sel':'Färg','zone-fill-sel':'Fyllning'};
  for(const [id,label] of Object.entries(labels)){const el=byId(id);if(el){el.setAttribute('aria-label',label);const l=document.createElement('label');l.htmlFor=id;l.className='tt-rail-label';l.textContent=label;el.before(l);}}
  const old=setMode;window.setMode=setMode=function(){const result=old.apply(this,arguments);layout();window.TTWorkspace?.layout();return result;};
  let signature='';new MutationObserver(()=>{const next=[active(),document.body.classList.contains('tt-workspace-collapsed'),document.body.classList.contains('tt694-edit-landscape')].join(':');if(next!==signature){signature=next;schedule();}}).observe(document.body,{attributes:true,attributeFilter:['class']});
  for(const tab of document.querySelectorAll('.tab[data-panel]'))new MutationObserver(schedule).observe(tab,{attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',schedule);update();
 }
 window.TTToolRail={active,inset,layout};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
