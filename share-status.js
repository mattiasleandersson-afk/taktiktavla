/* Read confirmed team shares for list indicators; never write sharing data. */
(function(){
 'use strict';
 const states={board:{},film:{}}, timers={}, pending={};
 const config={board:['formation_team_shares','formation_id'],film:['taktikfilm_team_shares','taktikfilm_id']};
 function paint(){
  document.querySelectorAll('[data-share-kind][data-share-id]').forEach(row=>{
   const kind=row.dataset.shareKind,id=row.dataset.shareId,state=states[kind][id];
   row.querySelectorAll('button').forEach(button=>{
    const label=(button.title||'')+' '+(button.getAttribute('aria-label')||'');
    if(!button.dataset.ttShareIndicator && !button.dataset.tt569ShareModal && !button.dataset.tt371TaktikShareModal && !/vilka lag|lagdelning|dela med laget|sluta dela/i.test(label))return;
    button.dataset.ttShareIndicator='true';
    const title=(state===true?'Delad med lag':state===false?'Inte delad med lag':'Delningsstatus ej bekräftad')+' – hantera lagdelning';
    const text=state===true?'👥✓':state===false?'👥':'👥?';
    if(button.textContent!==text)button.textContent=text;
    if(button.title!==title)button.title=title;
    if(button.getAttribute('aria-label')!==title)button.setAttribute('aria-label',title);
    if(button.dataset.shared!==String(state))button.dataset.shared=String(state);
   });
  });
 }
 function refresh(kind){
  if(!config[kind])return;
  clearTimeout(timers[kind]);timers[kind]=setTimeout(async()=>{
   if(pending[kind]){refresh(kind);return;}
   const ids=[...new Set([...document.querySelectorAll(`[data-share-kind="${kind}"]`)].map(row=>row.dataset.shareId).filter(id=>/^\d+$/.test(id)))];
   if(!ids.length)return;
   pending[kind]=true;
   try{
    const [table,key]=config[kind];
    const params=new URLSearchParams({select:key+',team_code',[key]:'in.('+ids.join(',')+')'});
    const response=await fetch(SUPA_URL+'/rest/v1/'+table+'?'+params,{headers:supaHeaders()});
    if(!response.ok)throw Error('Share status unavailable');
    const rows=await response.json();if(!Array.isArray(rows))throw Error('Invalid share response');
    for(const id of ids)states[kind][id]=rows.some(row=>String(row[key])===id);
   }catch{for(const id of ids)delete states[kind][id];}
   finally{pending[kind]=false;paint();}
  },100);
 }
 function attach(row,kind,item){
  if(!config[kind])return;const id=kind==='board'?item.id:item.dbId;if(id==null)return;
  // Bind on the stable row before its icon can be painted. Legacy delayed button
  // rebinding must not leave a brief window where clicking toggles old sharing flags.
  if(kind==='board')row.addEventListener('click',event=>{
   const button=event.target.closest('button[data-tt-share-indicator]');
   const open=window.tt364OpenFormationShareModal||window.tt367OpenFormationShareModal;
   if(!button||!row.contains(button)||!open)return;
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();open(item);
  },true);
  row.dataset.shareKind=kind;row.dataset.shareId=id;refresh(kind);
 }
 function init(){
  const observer=new MutationObserver(paint);
  for(const id of ['saves-list','taktik-list']){const list=document.getElementById(id);if(list)observer.observe(list,{childList:true,subtree:true,attributes:true,attributeFilter:['title','aria-label']});}
  const style=document.createElement('style');style.textContent='button[data-tt-share-indicator]{white-space:nowrap!important;min-width:30px!important}button[data-shared="true"]{background:#214b35!important;color:#a0ffc1!important;border-color:#4ae87a!important}';document.head.appendChild(style);
 }
 window.TTShareStatus={attach,refresh};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
