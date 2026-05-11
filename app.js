window.onerror = function(msg,src,line,col,err){
  var t=document.getElementById("toast-msg");
  var detail="FEL rad "+line+": "+msg+(err&&err.stack?" | "+err.stack.split("\n")[1]:"");
  if(t){t.textContent=detail;t.style.background="#e84a4a";t.style.color="#fff";t.style.display="block";t.style.opacity="1";t.style.zIndex="9999";t.style.position="fixed";t.style.top="20px";t.style.left="10px";t.style.right="10px";t.style.bottom="auto";t.style.borderRadius="8px";t.style.padding="12px 16px";t.style.fontSize="0.75rem";t.style.maxWidth="100%";}
  else{var d=document.createElement("div");d.style.cssText="position:fixed;top:0;left:0;right:0;background:#e84a4a;color:#fff;padding:12px;font-family:monospace;font-size:12px;z-index:99999";d.textContent=detail;document.body.appendChild(d);}
  console.error("FEL rad "+line+":",msg,err);
  return true;
};
window.addEventListener("unhandledrejection",function(e){
  var msg=e.reason&&e.reason.message?e.reason.message:String(e.reason);
  var stack=e.reason&&e.reason.stack?e.reason.stack:"";
  var lines=stack.split("\\n");
  var detail="Promise: "+msg+(lines[1]?" | "+lines[1]:"");
  var t=document.getElementById("toast-msg");
  if(t){t.textContent=detail;t.style.background="#e84a4a";t.style.color="#fff";t.style.display="block";t.style.opacity="1";t.style.zIndex="9999";t.style.position="fixed";t.style.top="20px";t.style.left="10px";t.style.right="10px";t.style.borderRadius="8px";t.style.padding="12px 16px";t.style.fontSize="0.75rem";t.style.maxWidth="100%";}
  console.error("Promise error:",e.reason);
});

var W=400,H=600,format=11,homeColor="#cc2200",awayColor="#002288",displayMode="number";
var players=[],ball={x:W/2,y:H/2};
var arrows=[],labels=[],arrowStart=null,arrowCurrent=null;
var selectedId=null,mode="move",pendingLabelPt=null,labelSize=13;
var undoStack=[],idCounter=0,panelOpen=true,halfMode=0;
var savedFormations=[],taktikFilmer=[],activeTaktik=null,playback=null;
var animFrame=null,animSpeed=600,dragging=null;
var folders=["Allm\u00e4nt"],currentFolder="Alla";
var taktikFolders=["Taktik","Tr\u00e4ning"],currentTaktikFolder="Alla",taktikSearch="";
var freehandPaths=[],zones=[],movementPaths=[];
var activeFormationId=null,activeFormationName=null;
var trupp=[];
var matchRoster=[];
var matchGoals={home:0,away:0};
var matchNameSize=11;
var matchAssignments={};
var assigningPlayerId=null;
var matcher=[];
var matchSelections={};
var showKorridorer=false;
var showArrowNumbers=false;
var taktikUndoStack=[],taktikRedoStack=[];
var copiedStep=null;
var editingArrowId=null;
var arrowWidth=3;
var playerColors={};
var arrowColor="#ffdd44",arrowType="solid";
var freehandColor="#ffdd44",freehandWidth=4;
var zoneShapeType="rect",zoneColor="rgba(232,76,76,0.25)";
var freehandDrawing=false,freehandCurrent=null;
var movementCurrent=null;
var zoneStart=null,zonePreview=null;
var editingTaktikIdx=null,mergingTaktikIdx=null,isEditingTaktik=false;
var daylightMode=false;

var FORMATIONS={
  11:["4-4-2","4-3-3","3-5-2","4-2-3-1","5-3-2","3-4-3"],
  9:["3-3-2","4-3-1","3-2-3","2-4-2","3-1-3-1","3-4-1"],
  7:["3-2-1","2-3-1","3-1-2"],
  5:["2-2","1-2-1","2-1-1"]
};

var SUPA_URL="https://hpwpsmjswvpuzykxjvhd.supabase.co";
var SUPA_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwd3BzbWpzd3ZwdXp5a3hqdmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MDMzODAsImV4cCI6MjA5MzA3OTM4MH0.RKkWz-KzWxn7F3_ShnW7DVUMy4Unt7T52wP1EmgmCp0";
var SUPA_TABLE="saves";

function supaHeaders(){return{"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY};}

var _toastTimer=null;
function showToast(msg,ok){
  var el=document.getElementById("toast-msg");
  if(!el)return;
  el.textContent=msg;
  el.style.background=ok===false?"#e84a4a":"#4ae87a";
  el.style.color=ok===false?"#fff":"#0a1a0d";
  el.classList.add("show");
  if(_toastTimer)clearTimeout(_toastTimer);
  _toastTimer=setTimeout(function(){el.classList.remove("show");},2200);
}
function cloudStatus(msg,color){var el=document.getElementById("cloud-status");if(el){el.textContent=msg;el.style.color=color||"#7aaa88";}}

function updateFolderSelect(){
  var sel=document.getElementById("folder-select");
  if(!sel)return;
  var cur=sel.value||"Allm\u00e4nt";
  sel.innerHTML="";
  for(var i=0;i<folders.length;i++){
    var opt=document.createElement("option");
    opt.value=folders[i];opt.textContent=folders[i];
    if(folders[i]===cur)opt.selected=true;
    sel.appendChild(opt);
  }
}

var movingId=null,renamingFolder=null,searchQuery="";
var pendingFolderTarget="saves",pendingFolderParent=null,deletingFolder=null,deletingFolderTarget=null;

document.getElementById("saves-search").addEventListener("input",function(e){searchQuery=e.target.value.toLowerCase();renderSavesList();});

function renderSavesList(){
  var list=document.getElementById("saves-list");list.innerHTML="";
  var folderCounts={"Alla":savedFormations.length};
  for(var i=0;i<savedFormations.length;i++){var f=savedFormations[i].folder||"Allm\u00e4nt";folderCounts[f]=(folderCounts[f]||0)+1;}
  var filterRow=document.createElement("div");filterRow.style.cssText="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;width:100%";
  var allFolders=["Alla"];var seen2={};
  for(var i=0;i<savedFormations.length;i++){var f=savedFormations[i].folder||"Allm\u00e4nt";if(!seen2[f]){seen2[f]=true;allFolders.push(f);}}
  for(var i=0;i<folders.length;i++){if(!seen2[folders[i]]&&folders[i]!=="Alla"){seen2[folders[i]]=true;allFolders.push(folders[i]);}}
  for(var i=0;i<allFolders.length;i++){
    (function(f){
      var wrap=document.createElement("div");wrap.style.cssText="display:flex;align-items:center;gap:1px;margin-bottom:2px";
      var fb=document.createElement("button");fb.className="tab"+(currentFolder===f?" on":"");fb.textContent=f+" ("+(folderCounts[f]||0)+")";fb.style.fontSize="0.62rem";fb.style.padding="2px 6px";
      fb.addEventListener("click",function(){currentFolder=f;renderSavesList();});
      wrap.appendChild(fb);
      if(f!=="Alla"){
        var rnBtn=document.createElement("button");rnBtn.style.cssText="font-size:0.6rem;padding:2px 4px;background:#111a14;color:#7aaa88;border:1px solid #2d4a35;border-left:none;cursor:pointer";rnBtn.textContent="\u270f";rnBtn.title="Byt namn";rnBtn.addEventListener("click",function(e){e.stopPropagation();openRenameFolder(f);});wrap.appendChild(rnBtn);
        var delBtn=document.createElement("button");delBtn.style.cssText="font-size:0.6rem;padding:2px 4px;background:#111a14;color:#e84a4a;border:1px solid #2d4a35;border-left:none;border-radius:0 4px 4px 0;cursor:pointer";delBtn.textContent="\u00d7";delBtn.title="Radera mapp";
        delBtn.addEventListener("click",function(e){e.stopPropagation();var count=folderCounts[f]||0;if(count===0){if(!confirm("Radera mappen \""+f+"\"?"))return;folders=folders.filter(function(x){return x!==f;});if(currentFolder===f)currentFolder="Alla";renderSavesList();}else{openDeleteFolderConfirm(f,"saves");}});
        wrap.appendChild(delBtn);
      }
      filterRow.appendChild(wrap);
    })(allFolders[i]);
  }
  var addBtn=document.createElement("button");addBtn.style.cssText="font-size:0.62rem;padding:2px 8px;background:#111a14;color:#4ae87a;border:1px solid #4ae87a;border-radius:4px;cursor:pointer";addBtn.textContent="+ Mapp";
  addBtn.addEventListener("click",function(){pendingFolderTarget="saves";document.getElementById("new-folder-inp").value="";document.getElementById("modal-new-folder").classList.remove("hidden");setTimeout(function(){document.getElementById("new-folder-inp").focus();},100);});
  filterRow.appendChild(addBtn);list.appendChild(filterRow);
  var filtered=savedFormations.filter(function(s){var inFolder=currentFolder==="Alla"||(s.folder||"Allm\u00e4nt")===currentFolder;var inSearch=!searchQuery||s.name.toLowerCase().indexOf(searchQuery)>=0;return inFolder&&inSearch;});
  if(!filtered.length){var empty=document.createElement("span");empty.style.cssText="color:#7aaa88;font-size:0.8rem";empty.textContent=searchQuery?"Inga tr\u00e4ffar":"Inga uppst\u00e4llningar"+(currentFolder!=="Alla"?" i denna mapp":"");list.appendChild(empty);return;}
  var sorted=filtered.slice().sort(function(a,b){return a.name.localeCompare(b.name,"sv");});
  for(var i=0;i<sorted.length;i++){
    (function(s){var row=document.createElement("div");row.className="row";var nm=document.createElement("span");nm.className="row-name";nm.textContent=s.name;var fl=document.createElement("span");fl.className="row-sub";fl.textContent=s.folder||"Allm\u00e4nt";var ld=document.createElement("button");ld.className="sa load";ld.textContent="Ladda";var toTk=document.createElement("button");toTk.className="sa";toTk.style.cssText="color:#4ae8e8;border-color:#4ae8e8";toTk.textContent="Till taktik";var mv=document.createElement("button");mv.className="sa";mv.style.cssText="color:#e8c84a;border-color:#e8c84a";mv.textContent="\u21c6 Flytta";var dl=document.createElement("button");dl.className="sa del";dl.textContent="\u00d7";ld.addEventListener("click",function(){applyState(JSON.parse(JSON.stringify(s.state)));activeFormationId=s.id;activeFormationName=s.name;updateSaveButtons();});toTk.addEventListener("click",function(){sendSavedFormationToTaktik(s);});mv.addEventListener("click",function(){openMoveFolder(s);});dl.addEventListener("click",function(){if(!confirm("Radera utgångsläget \""+(s.name||"utan namn")+"\"?"))return;if(s.id)cloudDelete(s.id);else{savedFormations=savedFormations.filter(function(x){return x.id!==s.id;});renderSavesList();}});row.appendChild(nm);row.appendChild(fl);row.appendChild(mv);row.appendChild(ld);row.appendChild(toTk);row.appendChild(dl);list.appendChild(row);})(sorted[i]);
  }
}

function openMoveFolder(s){
  movingId=s.id;var container=document.getElementById("move-folder-list");container.innerHTML="";var allF=[];var seen3={};
  for(var i=0;i<savedFormations.length;i++){var f=savedFormations[i].folder||"Allm\u00e4nt";if(!seen3[f]){seen3[f]=true;allF.push(f);}}
  for(var i=0;i<folders.length;i++){if(!seen3[folders[i]]){allF.push(folders[i]);}}
  allF.forEach(function(f){var btn=document.createElement("button");btn.className="btn"+((s.folder||"Allm\u00e4nt")===f?" on":"");btn.textContent=f;btn.style.cssText="width:100%;text-align:left;margin-bottom:2px";btn.addEventListener("click",function(){cloudMoveToFolder(movingId,f);document.getElementById("modal-move-folder").classList.add("hidden");movingId=null;});container.appendChild(btn);});
  var newBtn=document.createElement("button");newBtn.className="btn";newBtn.textContent="+ Ny mapp";newBtn.style.cssText="width:100%;margin-top:4px;color:#4ae87a;border-color:#4ae87a";newBtn.addEventListener("click",function(){document.getElementById("modal-move-folder").classList.add("hidden");document.getElementById("new-folder-inp").value="";document.getElementById("modal-new-folder").classList.remove("hidden");setTimeout(function(){document.getElementById("new-folder-inp").focus();},100);pendingMoveAfterCreate=true;});
  container.appendChild(newBtn);document.getElementById("modal-move-folder").classList.remove("hidden");
}

var pendingMoveAfterCreate=false;var renamingOldFolder=null;
function openRenameFolder(f){renamingOldFolder=f;document.getElementById("rename-folder-inp").value=f;document.getElementById("modal-rename-folder").classList.remove("hidden");setTimeout(function(){document.getElementById("rename-folder-inp").focus();},100);}
document.getElementById("rename-folder-cancel").addEventListener("click",function(){document.getElementById("modal-rename-folder").classList.add("hidden");renamingOldFolder=null;});
function openRenameTaktikFolder(f){renamingOldFolder=f;renamingOldFolder_type="taktik";document.getElementById("rename-folder-inp").value=f;document.getElementById("modal-rename-folder").classList.remove("hidden");setTimeout(function(){document.getElementById("rename-folder-inp").focus();},100);}
function openDeleteFolderConfirm(f,type){deletingFolder=f;deletingFolderTarget=type;document.getElementById("delete-folder-name").textContent=f;document.getElementById("modal-delete-folder").classList.remove("hidden");}
document.getElementById("delete-folder-cancel").addEventListener("click",function(){document.getElementById("modal-delete-folder").classList.add("hidden");deletingFolder=null;deletingFolderTarget=null;});
document.getElementById("delete-folder-move").addEventListener("click",function(){
  document.getElementById("modal-delete-folder").classList.add("hidden");if(!deletingFolder)return;
  if(deletingFolderTarget==="saves"){var ids=savedFormations.filter(function(s){return(s.folder||"Allm\u00e4nt")===deletingFolder;}).map(function(s){return s.id;});ids.forEach(function(id){if(id)cloudMoveToFolder(id,"Allm\u00e4nt");});folders=folders.filter(function(x){return x!==deletingFolder;});if(currentFolder===deletingFolder)currentFolder="Alla";setTimeout(function(){cloudLoadSaves();},500);}
  else{var toUpdate=taktikFilmer.filter(function(tk){return(tk.folder||"Allm\u00e4nt")===deletingFolder;});toUpdate.forEach(function(tk){tk.folder="Allm\u00e4nt";if(tk.dbId)fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({folder:"Allm\u00e4nt"})});});taktikFolders=taktikFolders.filter(function(x){return x!==deletingFolder;});if(currentTaktikFolder===deletingFolder)currentTaktikFolder="Alla";renderTaktikList();}
  deletingFolder=null;deletingFolderTarget=null;
});
document.getElementById("delete-folder-all").addEventListener("click",function(){
  document.getElementById("modal-delete-folder").classList.add("hidden");if(!deletingFolder)return;
  if(deletingFolderTarget==="saves"){var toDelete=savedFormations.filter(function(s){return(s.folder||"Allm\u00e4nt")===deletingFolder;});toDelete.forEach(function(s){if(s.id)fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+s.id,{method:"DELETE",headers:supaHeaders()});});folders=folders.filter(function(x){return x!==deletingFolder;});if(currentFolder===deletingFolder)currentFolder="Alla";setTimeout(function(){cloudLoadSaves();},500);}
  else{var toDelete=taktikFilmer.filter(function(tk){return(tk.folder||"Allm\u00e4nt")===deletingFolder;});toDelete.forEach(function(tk){if(tk.dbId)fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{method:"DELETE",headers:supaHeaders()});});taktikFolders=taktikFolders.filter(function(x){return x!==deletingFolder;});if(currentTaktikFolder===deletingFolder)currentTaktikFolder="Alla";setTimeout(function(){cloudLoadTaktik();},500);}
  deletingFolder=null;deletingFolderTarget=null;
});
var renamingOldFolder_type="saves";
document.getElementById("rename-folder-ok").addEventListener("click",function(){
  var newName=document.getElementById("rename-folder-inp").value.trim();if(!newName||!renamingOldFolder)return;
  document.getElementById("modal-rename-folder").classList.add("hidden");
  if(renamingOldFolder_type==="taktik"){var toUpdate=taktikFilmer.filter(function(tk){return(tk.folder||"Allm\u00e4nt")===renamingOldFolder;});toUpdate.forEach(function(tk){tk.folder=newName;if(tk.dbId)fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({folder:newName})});});for(var i=0;i<taktikFolders.length;i++){if(taktikFolders[i]===renamingOldFolder){taktikFolders[i]=newName;break;}}if(currentTaktikFolder===renamingOldFolder)currentTaktikFolder=newName;renderTaktikList();}
  else{cloudRenameFolder(renamingOldFolder,newName);}
  renamingOldFolder=null;
});
document.getElementById("rename-folder-inp").addEventListener("keydown",function(e){if(e.key==="Enter")document.getElementById("rename-folder-ok").click();});
document.getElementById("move-folder-cancel").addEventListener("click",function(){document.getElementById("modal-move-folder").classList.add("hidden");movingId=null;});

function cloudMoveToFolder(id,folder){cloudStatus("Flyttar...","#7aaa88");fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+id,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({folder:folder})}).then(function(r){return r.json();}).then(function(){cloudStatus("\u2705 Flyttad","#4ae87a");showToast("Uppst\u00e4llning flyttad!");cloudLoadSaves();}).catch(function(err){cloudStatus("\u274c Fel: "+err.message,"#e84a4a");});}
function cloudRenameFolder(oldName,newName){cloudStatus("Byter namn...","#7aaa88");fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?folder=eq."+encodeURIComponent(oldName),{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({folder:newName})}).then(function(){for(var i=0;i<folders.length;i++){if(folders[i]===oldName){folders[i]=newName;break;}}if(currentFolder===oldName)currentFolder=newName;cloudStatus("\u2705 Namnbyte klart","#4ae87a");showToast("Namn bytt!");cloudLoadSaves();}).catch(function(err){cloudStatus("\u274c Fel: "+err.message,"#e84a4a");});}

var svg=document.getElementById("pitch-svg");

/* === Startup-safe tool functions === */
function svgPt(cx,cy){
  var r=svg.getBoundingClientRect();
  var vb=svg.getAttribute("viewBox")||("0 0 "+W+" "+H);
  var vbParts=vb.split(" ").map(Number);
  var vbX=vbParts[0],vbY=vbParts[1],vbW=vbParts[2],vbH=vbParts[3];
  if(document.body.classList.contains("landscape")&&!document.body.classList.contains("desktop")){
    // Mobile landscape: SVG is rotated -90deg, remap coordinates
    var normX=(cx-r.left)/r.width;
    var normY=(cy-r.top)/r.height;
    return{x:vbX+normY*vbW, y:vbY+(1-normX)*vbH};
  }
  return{x:vbX+(cx-r.left)/r.width*vbW, y:vbY+(cy-r.top)/r.height*vbH};
}

function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}

function moveDrag(nx,ny){nx=clamp(nx,10,W-10);ny=clamp(ny,10,H-10);if(!dragging)return;if(dragging.type==="ball"){ball.x=nx;ball.y=ny;var bg=svg.querySelector(".ball-token");if(bg){var t=bg.querySelector("text"),h=bg.querySelector("circle");if(t){t.setAttribute("x",nx);t.setAttribute("y",ny);}if(h){h.setAttribute("cx",nx);h.setAttribute("cy",ny);}}}else if(dragging.type==="player"){for(var i=0;i<players.length;i++)if(players[i].id===dragging.id){players[i].x=nx;players[i].y=ny;break;}var g=svg.querySelector(".player-token[data-id='"+dragging.id+"']");if(g){var c=g.querySelector("circle"),t=g.querySelector("text");if(c){c.setAttribute("cx",nx);c.setAttribute("cy",ny);}if(t){t.setAttribute("x",nx);t.setAttribute("y",ny);}}}else if(dragging.type==="label"){for(var i=0;i<labels.length;i++)if(labels[i].id===dragging.id){labels[i].x=nx;labels[i].y=ny;break;}}}

function onTM(ev){ev.preventDefault();var pt=svgPt(ev.touches[0].clientX,ev.touches[0].clientY);if(dragging)moveDrag(pt.x+(dragging.ox||0),pt.y+(dragging.oy||0));if(mode==="arrow"&&arrowStart){arrowCurrent=pt;render();}if(mode==="freehand"&&freehandDrawing&&freehandCurrent){freehandCurrent.pts.push(pt);renderFreehandPreview();}if(mode==="zone"&&zoneStart){zonePreview=pt;renderZonePreview();}}

function onTE(ev){if(mode==="arrow"&&arrowStart&&ev.changedTouches){var pt=svgPt(ev.changedTouches[0].clientX,ev.changedTouches[0].clientY);var dx=pt.x-arrowStart.x,dy=pt.y-arrowStart.y;if(dx*dx+dy*dy>100)arrows.push({id:"arr"+(idCounter++),x1:arrowStart.x,y1:arrowStart.y,x2:pt.x,y2:pt.y,color:arrowColor,atype:arrowType,width:arrowWidth});arrowStart=null;arrowCurrent=null;}if(mode==="freehand"&&freehandDrawing&&freehandCurrent){if(freehandCurrent.pts.length>2)freehandPaths.push(freehandCurrent);freehandCurrent=null;freehandDrawing=false;}if(mode==="zone"&&zoneStart&&zonePreview){finalizeZone();zoneStart=null;zonePreview=null;}dragging=null;window.removeEventListener("touchmove",onTM);window.removeEventListener("touchend",onTE);render();}

function onMM(ev){var pt=svgPt(ev.clientX,ev.clientY);if(dragging)moveDrag(pt.x+(dragging.ox||0),pt.y+(dragging.oy||0));if(mode==="arrow"&&arrowStart){arrowCurrent=pt;render();}if(mode==="freehand"&&freehandDrawing&&freehandCurrent){freehandCurrent.pts.push(pt);renderFreehandPreview();}if(mode==="zone"&&zoneStart){zonePreview=pt;renderZonePreview();}}

function onMU(ev){if(mode==="arrow"&&arrowStart){var pt=svgPt(ev.clientX,ev.clientY);var dx=pt.x-arrowStart.x,dy=pt.y-arrowStart.y;if(dx*dx+dy*dy>100)arrows.push({id:"arr"+(idCounter++),x1:arrowStart.x,y1:arrowStart.y,x2:pt.x,y2:pt.y,color:arrowColor,atype:arrowType,width:arrowWidth});arrowStart=null;arrowCurrent=null;}if(mode==="freehand"&&freehandDrawing&&freehandCurrent){if(freehandCurrent.pts.length>2)freehandPaths.push(freehandCurrent);freehandCurrent=null;freehandDrawing=false;}if(mode==="zone"&&zoneStart&&zonePreview){finalizeZone();zoneStart=null;zonePreview=null;}dragging=null;window.removeEventListener("mousemove",onMM);window.removeEventListener("mouseup",onMU);render();}
var _delHappened=false;
svg.addEventListener("touchstart",function(ev){if(mode==="arrow"){ev.preventDefault();arrowStart=svgPt(ev.touches[0].clientX,ev.touches[0].clientY);saveUndo();window.addEventListener("touchmove",onTM,{passive:false});window.addEventListener("touchend",onTE);return;}if(mode==="text"){var pt=svgPt(ev.touches[0].clientX,ev.touches[0].clientY);pendingLabelPt=pt;setMode("move");openTextModal();return;}if(mode==="freehand"){ev.preventDefault();saveUndo();freehandDrawing=true;freehandCurrent={id:"fp"+(idCounter++),pts:[svgPt(ev.touches[0].clientX,ev.touches[0].clientY)],color:freehandColor,width:freehandWidth};window.addEventListener("touchmove",onTM,{passive:false});window.addEventListener("touchend",onTE);return;}if(mode==="zone"){ev.preventDefault();saveUndo();zoneStart=svgPt(ev.touches[0].clientX,ev.touches[0].clientY);window.addEventListener("touchmove",onTM,{passive:false});window.addEventListener("touchend",onTE);return;}if(!_delHappened){selectedId=null;render();}_delHappened=false;},{passive:false});
svg.addEventListener("mousedown",function(ev){if(mode==="arrow"){arrowStart=svgPt(ev.clientX,ev.clientY);saveUndo();window.addEventListener("mousemove",onMM);window.addEventListener("mouseup",onMU);return;}if(mode==="text"){var pt=svgPt(ev.clientX,ev.clientY);pendingLabelPt=pt;setMode("move");openTextModal();return;}if(mode==="freehand"){saveUndo();freehandDrawing=true;freehandCurrent={id:"fp"+(idCounter++),pts:[svgPt(ev.clientX,ev.clientY)],color:freehandColor,width:freehandWidth};window.addEventListener("mousemove",onMM);window.addEventListener("mouseup",onMU);return;}if(mode==="zone"){saveUndo();zoneStart=svgPt(ev.clientX,ev.clientY);window.addEventListener("mousemove",onMM);window.addEventListener("mouseup",onMU);return;}selectedId=null;render();});

function setMode(m){
  mode=m;
  var ids={
    "btn-arrow":"arrow",
    "btn-text":"text",
    "btn-freehand":"freehand",
    "btn-zone":"zone",
    "btn-movement":"movement"
  };
  Object.keys(ids).forEach(function(id){
    var b=document.getElementById(id);
    if(b)b.classList.toggle("on",m===ids[id]);
  });

  render();

  svg.style.cursor=m==="arrow"||m==="freehand"||m==="zone"?"crosshair":m==="text"?"text":"default";

  var badge=document.getElementById("mode-badge");
  var ao=document.getElementById("arrow-options");
  var zo=document.getElementById("zone-options");
  var fo=document.getElementById("freehand-options");
  if(ao)ao.style.display=m==="arrow"?"flex":"none";
  if(zo)zo.style.display=m==="zone"?"flex":"none";
  if(fo)fo.style.display=m==="freehand"?"flex":"none";

  if(badge){
    if(m==="arrow"){badge.style.display="block";badge.style.background="#2a4a8a";badge.style.color="#9ac4ff";badge.textContent="Dra för att rita pil";}
    else if(m==="text"){badge.style.display="block";badge.style.background="#4ae87a";badge.style.color="#0a1a0d";badge.textContent="Tryck på planen";}
    else if(m==="freehand"){badge.style.display="block";badge.style.background="#8b4ae8";badge.style.color="#fff";badge.textContent="Rita fritt";}
    else if(m==="zone"){badge.style.display="block";badge.style.background="#e87a4a";badge.style.color="#fff";badge.textContent="Dra för att rita zon";}
    else if(m==="movement"){badge.style.display="block";badge.style.background="#cc2200";badge.style.color="#fff";badge.textContent="Tryck på spelare och rita rörelsebana";}
    else badge.style.display="none";
  }

  if(typeof syncFullscreenToolButtons==="function")syncFullscreenToolButtons();
}
/* === End startup-safe tool functions === */



function renderKorridorer(){
  var old=svg.querySelectorAll(".korridor-g");for(var i=0;i<old.length;i++)old[i].remove();if(!showKorridorer)return;
  var ns="http://www.w3.org/2000/svg";var W2=400,H2=600;
  var cols=[{x:0,w:72,label:"Yttre korridor",fill:"rgba(74,232,232,0.10)",stroke:"rgba(74,232,232,0.35)"},{x:72,w:72,label:"Inre korridor",fill:"rgba(160,120,255,0.10)",stroke:"rgba(160,120,255,0.35)"},{x:144,w:112,label:"Central korridor",fill:"rgba(74,232,122,0.10)",stroke:"rgba(74,232,122,0.35)"},{x:256,w:72,label:"Inre korridor",fill:"rgba(160,120,255,0.10)",stroke:"rgba(160,120,255,0.35)"},{x:328,w:72,label:"Yttre korridor",fill:"rgba(74,232,232,0.10)",stroke:"rgba(74,232,232,0.35)"}];
  for(var i=0;i<cols.length;i++){var c=cols[i];var g=document.createElementNS(ns,"g");g.setAttribute("class","korridor-g");g.style.pointerEvents="none";var r=document.createElementNS(ns,"rect");r.setAttribute("x",c.x);r.setAttribute("y",0);r.setAttribute("width",c.w);r.setAttribute("height",H2);r.setAttribute("fill",c.fill);r.setAttribute("stroke",c.stroke);r.setAttribute("stroke-width","1");g.appendChild(r);var t=document.createElementNS(ns,"text");t.setAttribute("x",c.x+c.w/2);t.setAttribute("y",14);t.setAttribute("text-anchor","middle");t.setAttribute("fill",c.stroke.replace("0.35","0.9"));t.setAttribute("font-size","8");t.setAttribute("font-family","Arial Narrow, Arial, sans-serif");t.setAttribute("font-weight","700");t.setAttribute("letter-spacing","0.3");t.textContent=c.label;g.appendChild(t);var t2=t.cloneNode(true);t2.setAttribute("y",H2-5);g.appendChild(t2);var firstPlayer=svg.querySelector(".player-token");if(firstPlayer&&firstPlayer.parentNode===svg)svg.insertBefore(g,firstPlayer);else svg.appendChild(g);}
}

function drawPitch(){
  svg.innerHTML="";var ns="http://www.w3.org/2000/svg";
  function el(tag,attrs){var e=document.createElementNS(ns,tag);for(var k in attrs)e.setAttribute(k,attrs[k]);return e;}
  var defs=document.createElementNS(ns,"defs");
  var arrowColors=["#ffdd44","#e84a4a","#4ae8e8","#4ae87a","#fff"];
  for(var aci=0;aci<arrowColors.length;aci++){(function(col){var m=document.createElementNS(ns,"marker");m.setAttribute("id","arrowhead-"+col.replace("#",""));m.setAttribute("markerWidth","8");m.setAttribute("markerHeight","6");m.setAttribute("refX","8");m.setAttribute("refY","3");m.setAttribute("orient","auto");var poly2=document.createElementNS(ns,"polygon");poly2.setAttribute("points","0 0, 8 3, 0 6");poly2.setAttribute("fill",col);m.appendChild(poly2);defs.appendChild(m);})(arrowColors[aci]);}
  svg.appendChild(defs);
  var c=daylightMode?["#c8e6c8","#b8dbb8"]:["#1e5c35","#226640"];for(var i=0;i<10;i++)svg.appendChild(el("rect",{x:0,y:i*60,width:W,height:60,fill:c[i%2]}));
  var lineCol=daylightMode?"rgba(0,0,0,0.6)":"rgba(255,255,255,0.55)";var S={stroke:lineCol,"stroke-width":"1.5",fill:"none"};
  function se(tag,a){var m={};for(var k in S)m[k]=S[k];for(var k in a)m[k]=a[k];return el(tag,m);}
  svg.appendChild(se("rect",{x:20,y:20,width:360,height:560}));svg.appendChild(se("line",{x1:20,y1:300,x2:380,y2:300}));
  svg.appendChild(se("circle",{cx:200,cy:300,r:46}));svg.appendChild(el("circle",{cx:200,cy:300,r:3,fill:lineCol}));
  svg.appendChild(se("rect",{x:98,y:20,width:204,height:88}));svg.appendChild(se("rect",{x:138,y:20,width:124,height:44}));
  svg.appendChild(se("rect",{x:98,y:492,width:204,height:88}));svg.appendChild(se("rect",{x:138,y:536,width:124,height:44}));
  svg.appendChild(el("circle",{cx:200,cy:132,r:3,fill:lineCol}));svg.appendChild(el("circle",{cx:200,cy:468,r:3,fill:lineCol}));
  svg.appendChild(se("path",{d:"M155,108 A50,50 0 0,1 245,108"}));svg.appendChild(se("path",{d:"M155,492 A50,50 0 0,0 245,492"}));
  svg.appendChild(se("rect",{x:158,y:8,width:84,height:14}));svg.appendChild(se("rect",{x:158,y:578,width:84,height:14}));
  var corners=[[20,20,0,90],[380,20,90,180],[380,580,180,270],[20,580,270,360]];
  for(var ci=0;ci<corners.length;ci++){var cx=corners[ci][0],cy=corners[ci][1],s1=corners[ci][2]*Math.PI/180,e1=corners[ci][3]*Math.PI/180,r=10;svg.appendChild(se("path",{d:"M"+(cx+r*Math.cos(s1))+","+(cy+r*Math.sin(s1))+" A"+r+","+r+" 0 0,1 "+(cx+r*Math.cos(e1))+","+(cy+r*Math.sin(e1))}));}
}

function updateViewBox(){
  if(halfMode===1)svg.setAttribute("viewBox","0 280 400 320");
  else if(halfMode===2)svg.setAttribute("viewBox","0 0 400 320");
  else svg.setAttribute("viewBox","0 0 400 600");
}


// Resample path to evenly-spaced points for consistent animation speed
function resamplePath(pts, numPts){
  if(!pts||pts.length<2)return pts;
  // Calculate total length
  var totalLen=0;
  var segLens=[];
  for(var i=1;i<pts.length;i++){
    var dx=pts[i].x-pts[i-1].x,dy=pts[i].y-pts[i-1].y;
    var l=Math.sqrt(dx*dx+dy*dy);
    segLens.push(l);
    totalLen+=l;
  }
  if(totalLen<1)return pts;
  // Resample to numPts evenly spaced points
  var result=[{x:pts[0].x,y:pts[0].y}];
  var step=totalLen/(numPts-1);
  var traveled=0,segIdx=0,segTraveled=0;
  for(var n=1;n<numPts-1;n++){
    var target2=n*step;
    while(segIdx<segLens.length&&traveled+segLens[segIdx]<target2){
      traveled+=segLens[segIdx];segTraveled=0;segIdx++;
    }
    if(segIdx>=segLens.length)break;
    var rem=target2-traveled;
    var t2=segLens[segIdx]>0?rem/segLens[segIdx]:0;
    result.push({
      x:pts[segIdx].x+(pts[segIdx+1].x-pts[segIdx].x)*t2,
      y:pts[segIdx].y+(pts[segIdx+1].y-pts[segIdx].y)*t2
    });
  }
  result.push({x:pts[pts.length-1].x,y:pts[pts.length-1].y});
  return result;
}
function render(){
  // Clear movement paths when leaving edit mode
  if(editingTaktikIdx===null){movementPaths=[];}
  var old=svg.querySelectorAll(".player-token,.ball-token,.arrow-g,.label-g,.preview-arrow,.del-g,.zone-g,.freehand-g,.zone-preview,.freehand-preview,.korridor-g,.mv-path-g,.mv-preview");for(var i=0;i<old.length;i++)old[i].remove();
  renderKorridorer();
  var ns="http://www.w3.org/2000/svg";
  var ns2="http://www.w3.org/2000/svg";
  for(var i=0;i<zones.length;i++){(function(z){var g=document.createElementNS(ns2,"g");g.setAttribute("class","zone-g");var shape;if(z.type==="circle"){shape=document.createElementNS(ns2,"ellipse");shape.setAttribute("cx",z.x);shape.setAttribute("cy",z.y);shape.setAttribute("rx",z.r||50);shape.setAttribute("ry",z.r||50);}else{shape=document.createElementNS(ns2,"rect");shape.setAttribute("x",z.x);shape.setAttribute("y",z.y);shape.setAttribute("width",z.w||80);shape.setAttribute("height",z.h||80);shape.setAttribute("rx","4");}shape.setAttribute("fill",z.color||"rgba(232,76,76,0.25)");shape.setAttribute("stroke",z.color.replace(/,[0-9.]+\)/,",0.8)").replace("rgba","rgba"));shape.setAttribute("stroke-width","1.5");var hit=document.createElementNS(ns2,"rect");if(z.type==="circle"){hit.setAttribute("x",z.x-(z.r||50));hit.setAttribute("y",z.y-(z.r||50));hit.setAttribute("width",(z.r||50)*2);hit.setAttribute("height",(z.r||50)*2);}else{hit.setAttribute("x",z.x);hit.setAttribute("y",z.y);hit.setAttribute("width",z.w||80);hit.setAttribute("height",z.h||80);}hit.setAttribute("class","zone-hit");g.appendChild(shape);g.appendChild(hit);svg.appendChild(g);function selZone(ev){ev.stopPropagation();selectedId=z.id;render();}hit.addEventListener("touchstart",function(ev){ev.preventDefault();selZone(ev);},{passive:false});hit.addEventListener("mousedown",selZone);if(selectedId===z.id){var cx2=z.type==="circle"?z.x:z.x+(z.w||80)/2;var cy2=z.type==="circle"?z.y-(z.r||50)-6:z.y-6;var dg=document.createElementNS(ns2,"g");dg.setAttribute("class","del-g");dg.style.cursor="pointer";var dc=document.createElementNS(ns2,"circle");dc.setAttribute("class","del-circ");dc.setAttribute("cx",cx2);dc.setAttribute("cy",cy2);dc.setAttribute("r",9);var dt=document.createElementNS(ns2,"text");dt.setAttribute("class","del-txt");dt.setAttribute("x",cx2);dt.setAttribute("y",cy2);dt.textContent="\u00d7";dg.appendChild(dc);dg.appendChild(dt);g.appendChild(dg);function delZone(ev){ev.stopPropagation();ev.preventDefault();saveUndo();zones=zones.filter(function(x){return x.id!==z.id;});selectedId=null;render();}dg.addEventListener("touchstart",delZone,{passive:false});dg.addEventListener("mousedown",delZone);}})(zones[i]);}
  for(var i=0;i<freehandPaths.length;i++){(function(fp){if(!fp.pts||fp.pts.length<2)return;var g=document.createElementNS(ns2,"g");g.setAttribute("class","freehand-g");var d="M"+fp.pts[0].x+","+fp.pts[0].y;for(var pi=1;pi<fp.pts.length;pi++)d+=" L"+fp.pts[pi].x+","+fp.pts[pi].y;var path=document.createElementNS(ns2,"path");path.setAttribute("class","freehand-path");path.setAttribute("d",d);path.setAttribute("stroke",fp.color||"#ffdd44");path.setAttribute("stroke-width",fp.width||4);var hit=document.createElementNS(ns2,"path");hit.setAttribute("class","freehand-hit");hit.setAttribute("d",d);hit.setAttribute("stroke-width","24");hit.setAttribute("stroke-linecap","round");g.appendChild(path);g.appendChild(hit);svg.appendChild(g);function selFP(ev){ev.stopPropagation();selectedId=fp.id;render();}hit.addEventListener("touchstart",function(ev){ev.preventDefault();selFP(ev);},{passive:false});hit.addEventListener("mousedown",selFP);if(selectedId===fp.id){var mx=fp.pts[Math.floor(fp.pts.length/2)].x;var my=fp.pts[Math.floor(fp.pts.length/2)].y;var dg=document.createElementNS(ns2,"g");dg.setAttribute("class","del-g");dg.style.cursor="pointer";var dc=document.createElementNS(ns2,"circle");dc.setAttribute("class","del-circ");dc.setAttribute("cx",mx);dc.setAttribute("cy",my-12);dc.setAttribute("r",9);var dt=document.createElementNS(ns2,"text");dt.setAttribute("class","del-txt");dt.setAttribute("x",mx);dt.setAttribute("y",my-12);dt.textContent="\u00d7";dg.appendChild(dc);dg.appendChild(dt);g.appendChild(dg);function delFP(ev){_delHappened=true;ev.stopPropagation();ev.preventDefault();saveUndo();freehandPaths=freehandPaths.filter(function(x){return x.id!==fp.id;});selectedId=null;render();}dg.addEventListener("touchstart",delFP,{passive:false});dg.addEventListener("mousedown",delFP);}})(freehandPaths[i]);}
  for(var i=0;i<arrows.length;i++){(function(a){var g=document.createElementNS(ns,"g");g.setAttribute("class","arrow-g");var vis=document.createElementNS(ns,"line");vis.setAttribute("class","arrow-vis");vis.setAttribute("x1",a.x1);vis.setAttribute("y1",a.y1);vis.setAttribute("x2",a.x2);vis.setAttribute("y2",a.y2);var ac=a.color||"#ffdd44";vis.setAttribute("marker-end","url(#arrowhead-"+ac.replace("#","")+")");vis.style.stroke=ac;vis.style.strokeWidth=a.width||3;if((a.atype||"solid")==="dashed"){vis.style.strokeDasharray=(a.width||3)*3+" "+(a.width||3)*2;}else{vis.style.strokeDasharray="none";}var hit=document.createElementNS(ns,"line");hit.setAttribute("class","arrow-hit");hit.setAttribute("x1",a.x1);hit.setAttribute("y1",a.y1);hit.setAttribute("x2",a.x2);hit.setAttribute("y2",a.y2);g.appendChild(vis);g.appendChild(hit);if(showArrowNumbers){var mx=(a.x1+a.x2)/2,my=(a.y1+a.y2)/2;var ac2=a.color||"#ffdd44";var nbg=document.createElementNS(ns,"circle");nbg.setAttribute("cx",mx);nbg.setAttribute("cy",my);nbg.setAttribute("r",9);nbg.setAttribute("fill","#111a14");nbg.setAttribute("stroke",ac2);nbg.setAttribute("stroke-width","1.5");var ntxt=document.createElementNS(ns,"text");ntxt.setAttribute("x",mx);ntxt.setAttribute("y",my);ntxt.setAttribute("text-anchor","middle");ntxt.setAttribute("dominant-baseline","central");ntxt.setAttribute("fill",ac2);ntxt.setAttribute("font-size","10");ntxt.setAttribute("font-weight","700");ntxt.setAttribute("font-family","Arial Narrow,Arial,sans-serif");ntxt.textContent=String(i+1);g.appendChild(nbg);g.appendChild(ntxt);}svg.appendChild(g);function selectArrow(ev){ev.stopPropagation();selectedId=a.id;render();}hit.addEventListener("touchstart",function(ev){ev.preventDefault();selectArrow(ev);},{passive:false});hit.addEventListener("mousedown",selectArrow);if(selectedId===a.id){var mx=(a.x1+a.x2)/2,my=(a.y1+a.y2)/2;var dg=document.createElementNS(ns,"g");dg.setAttribute("class","del-g");dg.style.cursor="pointer";var dc=document.createElementNS(ns,"circle");dc.setAttribute("class","del-circ");dc.setAttribute("cx",mx);dc.setAttribute("cy",my);dc.setAttribute("r",11);var dt=document.createElementNS(ns,"text");dt.setAttribute("class","del-txt");dt.setAttribute("x",mx);dt.setAttribute("y",my);dt.textContent="\u00d7";dg.appendChild(dc);dg.appendChild(dt);g.appendChild(dg);function delArrow(ev){_delHappened=true;ev.stopPropagation();ev.preventDefault();saveUndo();arrows=arrows.filter(function(x){return x.id!==a.id;});selectedId=null;render();}dg.addEventListener("touchstart",delArrow,{passive:false});dg.addEventListener("mousedown",delArrow);}})(arrows[i]);}
  if(mode==="arrow"&&arrowStart&&arrowCurrent){var pg=document.createElementNS(ns,"line");pg.setAttribute("class","preview-arrow");pg.setAttribute("x1",arrowStart.x);pg.setAttribute("y1",arrowStart.y);pg.setAttribute("x2",arrowCurrent.x);pg.setAttribute("y2",arrowCurrent.y);pg.setAttribute("stroke-width","3");pg.setAttribute("stroke-dasharray","6 4");pg.setAttribute("stroke-linecap","round");pg.setAttribute("fill","none");pg.setAttribute("marker-end","url(#arrowhead-"+(arrowColor||"#ffdd44").replace("#","")+")");pg.setAttribute("stroke",arrowColor||"#ffdd44");pg.style.pointerEvents="none";svg.appendChild(pg);}
  for(var i=0;i<labels.length;i++){(function(l){var fs=l.size||13,tw=l.text.length*(fs*0.55)+12,th=fs+10;var g=document.createElementNS(ns,"g");g.setAttribute("class","label-g pitch-label");g.dataset.lid=l.id;var bg=document.createElementNS(ns,"rect");bg.setAttribute("class","pitch-label-bg");bg.setAttribute("rx","4");bg.setAttribute("x",l.x-tw/2);bg.setAttribute("y",l.y-th/2);bg.setAttribute("width",tw);bg.setAttribute("height",th);var tx=document.createElementNS(ns,"text");tx.setAttribute("class","pitch-label-txt");tx.setAttribute("x",l.x);tx.setAttribute("y",l.y);tx.setAttribute("font-size",fs);tx.textContent=l.text;g.appendChild(bg);g.appendChild(tx);svg.appendChild(g);if(selectedId===l.id){var dg=document.createElementNS(ns,"g");dg.setAttribute("class","del-g");dg.style.cursor="pointer";var dc=document.createElementNS(ns,"circle");dc.setAttribute("class","del-circ");dc.setAttribute("cx",l.x+tw/2-2);dc.setAttribute("cy",l.y-th/2-2);dc.setAttribute("r",9);var dt=document.createElementNS(ns,"text");dt.setAttribute("class","del-txt");dt.setAttribute("x",l.x+tw/2-2);dt.setAttribute("y",l.y-th/2-2);dt.textContent="\u00d7";dg.appendChild(dc);dg.appendChild(dt);g.appendChild(dg);function delLabel(ev){_delHappened=true;ev.stopPropagation();ev.preventDefault();saveUndo();labels=labels.filter(function(x){return x.id!==l.id;});selectedId=null;render();}dg.addEventListener("touchstart",delLabel,{passive:false});dg.addEventListener("mousedown",delLabel);}function startLabelDrag(cx,cy){if(mode!=="move")return;dragging={type:"label",id:l.id,ox:l.x-cx,oy:l.y-cy};}g.addEventListener("touchstart",function(ev){ev.stopPropagation();var pt=svgPt(ev.touches[0].clientX,ev.touches[0].clientY);var _dragMoved=false;selectedId=l.id;startLabelDrag(pt.x,pt.y);function _onTM2(ev2){ev2.preventDefault();_dragMoved=true;onTM(ev2);}function _onTE2(){window.removeEventListener("touchmove",_onTM2);window.removeEventListener("touchend",_onTE2);if(!_dragMoved){setTimeout(function(){if(selectedId===l.id){openEditLabel(l);selectedId=null;render();}},80);}else{dragging=null;render();}}window.addEventListener("touchmove",_onTM2,{passive:false});window.addEventListener("touchend",_onTE2);},{passive:false});g.addEventListener("mousedown",function(ev){ev.stopPropagation();var pt=svgPt(ev.clientX,ev.clientY);var _dragMoved=false;selectedId=l.id;startLabelDrag(pt.x,pt.y);function _onMM2(ev2){_dragMoved=true;onMM(ev2);}function _onMU2(){window.removeEventListener("mousemove",_onMM2);window.removeEventListener("mouseup",_onMU2);if(!_dragMoved){setTimeout(function(){if(selectedId===l.id){openEditLabel(l);selectedId=null;render();}},80);}else{dragging=null;render();}}window.addEventListener("mousemove",_onMM2);window.addEventListener("mouseup",_onMU2);});})(labels[i]);}
  for(var i=0;i<players.length;i++){(function(p){var g=document.createElementNS(ns,"g");g.setAttribute("class","player-token");g.setAttribute("data-id",p.id);var c=document.createElementNS(ns,"circle");c.setAttribute("cx",p.x);c.setAttribute("cy",p.y);c.setAttribute("r",16);var dHome=daylightMode?"#cc2200":homeColor;var dAway=daylightMode?"#002288":awayColor;c.setAttribute("fill",playerColors[p.id]||(p.team==="home"?dHome:dAway));c.setAttribute("stroke",daylightMode?"rgba(0,0,0,0.4)":"#fff");c.setAttribute("stroke-width","2");var t=document.createElementNS(ns,"text");t.setAttribute("class","token-text");t.setAttribute("x",p.x);t.setAttribute("y",p.y);t.setAttribute("fill","#fff");if(document.body.classList.contains("landscape")&&!document.body.classList.contains("desktop"))t.setAttribute("transform","rotate(90,"+p.x+","+p.y+")");t.textContent=tokenLabel(p);g.appendChild(c);g.appendChild(t);if(matchRoster.length&&p.team==="home"&&p.name){var ns4="http://www.w3.org/2000/svg";var nl=document.createElementNS(ns4,"text");nl.setAttribute("x",p.x);nl.setAttribute("y",p.y+26);nl.setAttribute("text-anchor","middle");nl.setAttribute("dominant-baseline","central");nl.setAttribute("fill",daylightMode?"#111":"#fff");nl.setAttribute("font-size",matchNameSize);nl.setAttribute("font-weight","700");nl.setAttribute("font-family","Arial Narrow, Arial, sans-serif");nl.setAttribute("stroke",daylightMode?"rgba(255,255,255,0.85)":"rgba(0,0,0,0.85)");nl.setAttribute("stroke-width","1.5");nl.setAttribute("paint-order","stroke");nl.textContent=p.name;if(document.body.classList.contains("landscape")&&!document.body.classList.contains("desktop"))nl.setAttribute("transform","rotate(90,"+p.x+","+(p.y+26)+")");g.appendChild(nl);}svg.appendChild(g);
  g.addEventListener("touchstart",function(ev){ev.preventDefault();ev.stopPropagation();var now=Date.now();if(matchRoster.length&&p.team==="home"){
      var _assignMoved=false;var _assignStartX=ev.touches[0].clientX;var _assignStartY=ev.touches[0].clientY;
      var _lpTimer=setTimeout(function(){_lpTimer=null;window.removeEventListener("touchmove",_onTMassign);window.removeEventListener("touchend",_onTEassign);if(_benchDragEl){_benchDragEl.remove();_benchDragEl=null;}openPlayerPicker(p.id);},400);
      function _onTMassign(ev2){
        ev2.preventDefault();
        var dx2=ev2.touches[0].clientX-_assignStartX,dy2=ev2.touches[0].clientY-_assignStartY;
        if(!_assignMoved&&dx2*dx2+dy2*dy2>100){
          if(_lpTimer){clearTimeout(_lpTimer);_lpTimer=null;}
          _assignMoved=true;
          if(matchAssignments[p.id]){var sp2=matchRoster.find(function(x){return x.id===matchAssignments[p.id];});if(sp2){if(_benchDragEl)_benchDragEl.remove();_benchDragEl=document.createElement("div");_benchDragEl.style.cssText="position:fixed;z-index:9999;pointer-events:none;background:#4ae87a;color:#0a1a0d;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:0.8rem;transform:translate(-50%,-50%)";_benchDragEl.textContent="#"+sp2.nr;document.body.appendChild(_benchDragEl);}}
        }
        if(_assignMoved){if(_benchDragEl){_benchDragEl.style.left=ev2.touches[0].clientX+"px";_benchDragEl.style.top=ev2.touches[0].clientY+"px";}highlightNearestPlayer(ev2.touches[0].clientX,ev2.touches[0].clientY);}
      }
      function _onTEassign(ev2){
        window.removeEventListener("touchmove",_onTMassign);window.removeEventListener("touchend",_onTEassign);
        if(_benchDragEl){_benchDragEl.remove();_benchDragEl=null;}clearPlayerHighlights();
        if(_lpTimer){clearTimeout(_lpTimer);_lpTimer=null;}
        if(_assignMoved&&ev2.changedTouches.length){
          var dropX=ev2.changedTouches[0].clientX,dropY=ev2.changedTouches[0].clientY;
          var benchBar=document.getElementById("bench-bar");
          var benchRect=benchBar?benchBar.getBoundingClientRect():null;
          var droppedOnBench=benchRect&&dropX>=benchRect.left&&dropX<=benchRect.right&&dropY>=benchRect.top&&dropY<=benchRect.bottom;
          if(droppedOnBench){
            // Clear this player's assignment → back to bench
            delete matchAssignments[p.id];
            var srcP2=players.find(function(x){return x.id===p.id;});
            if(srcP2){srcP2.number=0;srcP2.name="";}
            render();renderBench();showToast("Spelare återlagd till avbytare!");
          } else {
            var targetPid=findNearestHomePitchPlayer(dropX,dropY,50);
            if(targetPid&&targetPid!==p.id){
              var srcTid=matchAssignments[p.id]||null,tgtTid=matchAssignments[targetPid]||null;
              if(srcTid)matchAssignments[targetPid]=srcTid;else delete matchAssignments[targetPid];
              if(tgtTid)matchAssignments[p.id]=tgtTid;else delete matchAssignments[p.id];
              var srcSp=srcTid?matchRoster.find(function(x){return x.id===srcTid;}):null;
              var tgtSp2=tgtTid?matchRoster.find(function(x){return x.id===tgtTid;}):null;
              var srcP=players.find(function(x){return x.id===p.id;});
              var tgtP=players.find(function(x){return x.id===targetPid;});
              if(srcP){srcP.number=tgtSp2?tgtSp2.nr:0;srcP.name=tgtSp2?tgtSp2.namn:"";}
              if(tgtP){tgtP.number=srcSp?srcSp.nr:0;tgtP.name=srcSp?srcSp.namn:"";}
              render();renderBench();showToast("Spelare bytte plats!");
            }
          }
        }
      }
      window.addEventListener("touchmove",_onTMassign,{passive:false});window.addEventListener("touchend",_onTEassign);
      return;}if(mode==="movement"){
      ev.preventDefault();
      movementCurrent={id:"mv"+(idCounter++),playerId:p.id,pts:[{x:p.x,y:p.y}]};
      saveUndo();
      function _mvA(ev2){ev2.preventDefault();if(movementCurrent)movementCurrent.pts.push(svgPt(ev2.touches[0].clientX,ev2.touches[0].clientY));renderMovementPreview();}
      function _mvAEnd(){
        window.removeEventListener("touchmove",_mvA);window.removeEventListener("touchend",_mvAEnd);
        if(movementCurrent&&movementCurrent.pts.length>3){movementCurrent.pts=resamplePath(movementCurrent.pts,30);movementPaths.push(movementCurrent);}
        movementCurrent=null;render();
      }
      window.addEventListener("touchmove",_mvA,{passive:false});window.addEventListener("touchend",_mvAEnd);return;
    }
    if(_lastTap.id===p.id&&now-_lastTap.time<400){_lastTap={id:null,time:0};openPlayerColor(p.id);return;}_lastTap={id:p.id,time:now};if(mode!=="move")return;saveUndo();var pt=svgPt(ev.touches[0].clientX,ev.touches[0].clientY);dragging={type:"player",id:p.id,ox:p.x-pt.x,oy:p.y-pt.y};window.addEventListener("touchmove",onTM,{passive:false});window.addEventListener("touchend",onTE);},{passive:false});
  g.addEventListener("mousedown",function(ev){ev.stopPropagation();if(mode!=="move")return;saveUndo();var pt=svgPt(ev.clientX,ev.clientY);dragging={type:"player",id:p.id,ox:p.x-pt.x,oy:p.y-pt.y};window.addEventListener("mousemove",onMM);window.addEventListener("mouseup",onMU);});})(players[i]);}
  // Draw movement paths - only when movement mode active
  if(mode==="movement"){
    for(var mi=0;mi<movementPaths.length;mi++){
      var mp=movementPaths[mi];
      if(!mp.pts||mp.pts.length<2)continue;
      var g=document.createElementNS(ns,"g");
      g.setAttribute("class","mv-path-g");
      var d="M"+mp.pts[0].x+","+mp.pts[0].y;
      for(var pi=1;pi<mp.pts.length;pi++)d+=" L"+mp.pts[pi].x+","+mp.pts[pi].y;
      var line=document.createElementNS(ns,"path");
      line.setAttribute("d",d);
      line.setAttribute("stroke","#cc2200");
      line.setAttribute("stroke-width","1.5");
      line.setAttribute("stroke-dasharray","7 3");
      line.setAttribute("fill","none");
      line.setAttribute("stroke-linecap","round");
      var last=mp.pts[mp.pts.length-1];
      var prev=mp.pts[Math.max(0,mp.pts.length-4)];
      var ang=Math.atan2(last.y-prev.y,last.x-prev.x);
      var al=9;
      var arrow=document.createElementNS(ns,"path");
      arrow.setAttribute("d","M"+(last.x-al*Math.cos(ang-0.4))+","+(last.y-al*Math.sin(ang-0.4))+" L"+last.x+","+last.y+" L"+(last.x-al*Math.cos(ang+0.4))+","+(last.y-al*Math.sin(ang+0.4)));
      arrow.setAttribute("stroke","#cc2200");
      arrow.setAttribute("stroke-width","1.5");
      arrow.setAttribute("fill","none");
      var hit=document.createElementNS(ns,"path");
      hit.setAttribute("d",d);
      hit.setAttribute("stroke","transparent");
      hit.setAttribute("stroke-width","18");
      hit.setAttribute("fill","none");
      hit.style.cursor="pointer";
      g.appendChild(line);g.appendChild(arrow);g.appendChild(hit);
      // Add delete button if selected
      if(selectedId===mp.id){
        var mid2=Math.floor(mp.pts.length/2);
        var mx=mp.pts[mid2].x;
        var my=mp.pts[mid2].y-14;
        var dg=document.createElementNS(ns,"g");
        dg.style.cursor="pointer";
        var dc=document.createElementNS(ns,"circle");
        dc.setAttribute("class","del-circ");dc.setAttribute("cx",mx);dc.setAttribute("cy",my);dc.setAttribute("r",12);
        var dt=document.createElementNS(ns,"text");
        dt.setAttribute("class","del-txt");dt.setAttribute("x",mx);dt.setAttribute("y",my);dt.textContent="\u00d7";
        dg.appendChild(dc);dg.appendChild(dt);g.appendChild(dg);
        (function(mpId,dgEl){
          dgEl.addEventListener("touchstart",function(ev){ev.stopPropagation();ev.preventDefault();},{ passive:false});
          dgEl.addEventListener("touchend",function(ev){ev.stopPropagation();ev.preventDefault();_delHappened=true;saveUndo();movementPaths=movementPaths.filter(function(x){return x.id!==mpId;});selectedId=null;render();});
          dgEl.addEventListener("mousedown",function(ev){ev.stopPropagation();ev.preventDefault();_delHappened=true;saveUndo();movementPaths=movementPaths.filter(function(x){return x.id!==mpId;});selectedId=null;render();});
        }(mp.id, dg));
      }
      svg.appendChild(g);
      // Hit area: select without re-rendering (so delete button touchend works)
      (function(mpId, gEl){
        hit.addEventListener("touchstart",function(ev){
          ev.preventDefault();ev.stopPropagation();_delHappened=true;
          selectedId=mpId;
          // Add delete button directly without re-render
          var mid3=Math.floor(mp.pts.length/2);
          var mx3=mp.pts[mid3].x, my3=mp.pts[mid3].y-14;
          // Remove any existing del button on this g
          var existing=gEl.querySelector(".del-circ");
          if(existing&&existing.parentNode)existing.parentNode.remove();
          var dg2=document.createElementNS(ns,"g");dg2.style.cursor="pointer";
          var dc2=document.createElementNS(ns,"circle");
          dc2.setAttribute("class","del-circ");dc2.setAttribute("cx",mx3);dc2.setAttribute("cy",my3);dc2.setAttribute("r",12);
          var dt2=document.createElementNS(ns,"text");
          dt2.setAttribute("class","del-txt");dt2.setAttribute("x",mx3);dt2.setAttribute("y",my3);dt2.textContent="\u00d7";
          dg2.appendChild(dc2);dg2.appendChild(dt2);gEl.appendChild(dg2);
          dg2.addEventListener("touchstart",function(ev2){ev2.stopPropagation();ev2.preventDefault();},{passive:false});
          dg2.addEventListener("touchend",function(ev2){ev2.stopPropagation();ev2.preventDefault();_delHappened=true;saveUndo();movementPaths=movementPaths.filter(function(x){return x.id!==mpId;});selectedId=null;render();});
        },{passive:false});
        hit.addEventListener("mousedown",function(ev){ev.stopPropagation();_delHappened=true;selectedId=mpId;render();});
      }(mp.id, g));
    }
  }

  var bg=document.createElementNS(ns,"g");bg.setAttribute("class","ball-token");var bhit=document.createElementNS(ns,"circle");bhit.setAttribute("cx",ball.x);bhit.setAttribute("cy",ball.y);bhit.setAttribute("r",18);bhit.setAttribute("fill","transparent");var bt=document.createElementNS(ns,"text");bt.setAttribute("class","ball-text");bt.setAttribute("x",ball.x);bt.setAttribute("y",ball.y);bt.textContent="\u26bd";bg.appendChild(bhit);bg.appendChild(bt);svg.appendChild(bg);
  bg.addEventListener("touchstart",function(ev){
  ev.preventDefault();ev.stopPropagation();
  if(mode==="movement"){
    movementCurrent={id:"mv"+(idCounter++),playerId:"ball",pts:[{x:ball.x,y:ball.y}]};
    saveUndo();
    function _mvB(ev2){ev2.preventDefault();if(movementCurrent)movementCurrent.pts.push(svgPt(ev2.touches[0].clientX,ev2.touches[0].clientY));renderMovementPreview();}
    function _mvBEnd(){
      window.removeEventListener("touchmove",_mvB);window.removeEventListener("touchend",_mvBEnd);
      if(movementCurrent&&movementCurrent.pts.length>3){movementCurrent.pts=resamplePath(movementCurrent.pts,30);movementPaths.push(movementCurrent);}
      movementCurrent=null;render();
    }
    window.addEventListener("touchmove",_mvB,{passive:false});window.addEventListener("touchend",_mvBEnd);return;
  }
  if(mode!=="move")return;
  saveUndo();var pt=svgPt(ev.touches[0].clientX,ev.touches[0].clientY);dragging={type:"ball",ox:ball.x-pt.x,oy:ball.y-pt.y};
  window.addEventListener("touchmove",onTM,{passive:false});window.addEventListener("touchend",onTE);
},{passive:false});
  bg.addEventListener("mousedown",function(ev){ev.stopPropagation();if(mode!=="move")return;saveUndo();var pt=svgPt(ev.clientX,ev.clientY);dragging={type:"ball",ox:ball.x-pt.x,oy:ball.y-pt.y};window.addEventListener("mousemove",onMM);window.addEventListener("mouseup",onMU);});
}


function getPositions(f,team){var rows=f.split("-").map(Number),isHome=team==="home",yMin=isHome?330:40,yMax=isHome?560:270,allRows=[1].concat(rows),total=allRows.length,pos=[];for(var ri=0;ri<allRows.length;ri++){var count=allRows[ri],frac=isHome?1-(ri/(total-1)):ri/(total-1),y=yMin+frac*(yMax-yMin);for(var ci=0;ci<count;ci++){var xFrac=count===1?0.5:ci/(count-1);pos.push({x:40+xFrac*(W-80),y:y});}}return pos;}
function initPlayers(f){f=f||"4-4-2";var parts=f.split("-"),total=1;for(var i=0;i<parts.length;i++)total+=parseInt(parts[i]);var hp=getPositions(f,"home"),ap=getPositions(f,"away"),oldH=players.filter(function(p){return p.team==="home";}),oldA=players.filter(function(p){return p.team==="away";});players=[];for(var i=0;i<Math.min(total,hp.length);i++)players.push({id:"h"+i,team:"home",number:(oldH[i]?oldH[i].number:i+1),name:(oldH[i]?oldH[i].name:""),x:hp[i].x,y:hp[i].y});for(var i=0;i<Math.min(total,ap.length);i++)players.push({id:"a"+i,team:"away",number:(oldA[i]?oldA[i].number:i+1),name:(oldA[i]?oldA[i].name:""),x:ap[i].x,y:ap[i].y});ball={x:W/2,y:H/2};}
function tokenLabel(p){if(matchRoster.length&&p.team==="home")return p.number||"";if(displayMode==="name")return p.name||p.number;if(displayMode==="both")return(p.name?p.name+" ":"")+p.number;return p.number;}
function saveTaktikUndo(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];taktikUndoStack.push(JSON.parse(JSON.stringify(tk.steps)));if(taktikUndoStack.length>30)taktikUndoStack.shift();taktikRedoStack=[];}
function taktikUndo(){if(!taktikUndoStack.length||editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];taktikRedoStack.push(JSON.parse(JSON.stringify(tk.steps)));tk.steps=taktikUndoStack.pop();editingStepIdx=Math.min(editingStepIdx,tk.steps.length-1);updateEditStepUI();showToast("\u00e5ngrat!");}
function taktikRedo(){if(!taktikRedoStack.length||editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];taktikUndoStack.push(JSON.parse(JSON.stringify(tk.steps)));tk.steps=taktikRedoStack.pop();editingStepIdx=Math.min(editingStepIdx,tk.steps.length-1);updateEditStepUI();showToast("Gjort om!");}
function saveUndo(){undoStack.push(currentSnap());if(undoStack.length>30)undoStack.shift();}
function doUndo(){if(!undoStack.length)return;restoreSnap(undoStack.pop());render();}
function currentSnap(){return{players:players.map(function(p){return{id:p.id,team:p.team,number:p.number,name:p.name,x:p.x,y:p.y};}),ball:{x:ball.x,y:ball.y},arrows:arrows.map(function(a){return{id:a.id,x1:a.x1,y1:a.y1,x2:a.x2,y2:a.y2,color:a.color,atype:a.atype,width:a.width||3};}),labels:labels.map(function(l){return{id:l.id,x:l.x,y:l.y,text:l.text,size:l.size};}),freehandPaths:freehandPaths.map(function(f){return{id:f.id,pts:f.pts.slice(),color:f.color,width:f.width};}),zones:zones.map(function(z){return{id:z.id,type:z.type,x:z.x,y:z.y,w:z.w,h:z.h,r:z.r,color:z.color};}),movementPaths:movementPaths.map(function(m){return{id:m.id,playerId:m.playerId,pts:m.pts.slice()};})};}
function restoreSnap(snap){players=snap.players.map(function(p){return{id:p.id,team:p.team,number:p.number,name:p.name||"",x:p.x,y:p.y};});ball={x:snap.ball.x,y:snap.ball.y};arrows=(snap.arrows||[]).map(function(a){return{id:a.id,x1:a.x1,y1:a.y1,x2:a.x2,y2:a.y2,color:a.color||"#ffdd44",atype:a.atype||"solid",width:a.width||3};});labels=(snap.labels||[]).map(function(l){return{id:l.id,x:l.x,y:l.y,text:l.text,size:l.size||13};});freehandPaths=(snap.freehandPaths||[]).map(function(f){return{id:f.id,pts:f.pts.slice(),color:f.color||"#ffdd44",width:f.width||4};});zones=(snap.zones||[]).map(function(z){return{id:z.id,type:z.type||"rect",x:z.x,y:z.y,w:z.w,h:z.h,r:z.r,color:z.color||"rgba(232,76,76,0.25)"};});movementPaths=(snap.movementPaths||[]).map(function(m){return{id:m.id,playerId:m.playerId,pts:m.pts.slice()};});}
function renderMovementPreview(){
  var old=svg.querySelectorAll(".mv-preview");for(var i=0;i<old.length;i++)old[i].remove();
  if(!movementCurrent||movementCurrent.pts.length<2)return;
  var d="M"+movementCurrent.pts[0].x+","+movementCurrent.pts[0].y;
  for(var i=1;i<movementCurrent.pts.length;i++)d+=" L"+movementCurrent.pts[i].x+","+movementCurrent.pts[i].y;
  var p=document.createElementNS("http://www.w3.org/2000/svg","path");
  p.setAttribute("class","mv-preview");p.setAttribute("d",d);p.setAttribute("stroke","#cc2200");
  p.setAttribute("stroke-width","1.5");p.setAttribute("stroke-dasharray","7 3");p.setAttribute("fill","none");p.style.pointerEvents="none";
  svg.appendChild(p);
}
function renderFreehandPreview(){var old=svg.querySelectorAll(".freehand-preview");for(var i=0;i<old.length;i++)old[i].remove();if(!freehandCurrent||freehandCurrent.pts.length<2)return;var ns3="http://www.w3.org/2000/svg";var d="M"+freehandCurrent.pts[0].x+","+freehandCurrent.pts[0].y;for(var i=1;i<freehandCurrent.pts.length;i++)d+=" L"+freehandCurrent.pts[i].x+","+freehandCurrent.pts[i].y;var path=document.createElementNS(ns3,"path");path.setAttribute("class","freehand-preview freehand-path");path.setAttribute("d",d);path.setAttribute("stroke",freehandColor);path.setAttribute("stroke-width",freehandWidth);path.style.pointerEvents="none";svg.appendChild(path);}
function renderZonePreview(){var old=svg.querySelectorAll(".zone-preview");for(var i=0;i<old.length;i++)old[i].remove();if(!zoneStart||!zonePreview)return;var ns3="http://www.w3.org/2000/svg";var shape=buildZoneShape(zoneStart,zonePreview,true);shape.setAttribute("class","zone-preview");shape.style.pointerEvents="none";svg.appendChild(shape);}
function buildZoneShape(start,end,preview){var ns3="http://www.w3.org/2000/svg";var col=zoneColor;if(zoneShapeType==="circle"){var el=document.createElementNS(ns3,"ellipse");var cx=(start.x+end.x)/2,cy=(start.y+end.y)/2;var rx=Math.abs(end.x-start.x)/2,ry=Math.abs(end.y-start.y)/2;el.setAttribute("cx",cx);el.setAttribute("cy",cy);el.setAttribute("rx",rx);el.setAttribute("ry",ry);el.setAttribute("fill",col);el.setAttribute("stroke",col.replace(/,[0-9.]+\)/,",0.8)"));el.setAttribute("stroke-width","1.5");if(!preview)el._zdata={type:"circle",x:cx,y:cy,r:Math.max(rx,ry),color:col};return el;}else{var x=Math.min(start.x,end.x),y=Math.min(start.y,end.y);var w=Math.abs(end.x-start.x),h=Math.abs(end.y-start.y);var r=document.createElementNS(ns3,"rect");r.setAttribute("x",x);r.setAttribute("y",y);r.setAttribute("width",w);r.setAttribute("height",h);r.setAttribute("rx","3");r.setAttribute("fill",col);r.setAttribute("stroke",col.replace(/,[0-9.]+\)/,",0.8)"));r.setAttribute("stroke-width","1.5");if(!preview)r._zdata={type:"rect",x:x,y:y,w:w,h:h,color:col};return r;}}
function finalizeZone(){if(!zoneStart||!zonePreview)return;var dx=zonePreview.x-zoneStart.x,dy=zonePreview.y-zoneStart.y;if(Math.abs(dx)<10&&Math.abs(dy)<10)return;var zd;if(zoneShapeType==="circle"){var cx=(zoneStart.x+zonePreview.x)/2,cy=(zoneStart.y+zonePreview.y)/2;var rx=Math.abs(dx)/2,ry=Math.abs(dy)/2;zd={id:"zone"+(idCounter++),type:"circle",x:cx,y:cy,r:Math.max(rx,ry),w:rx*2,h:ry*2,color:zoneColor};}else{var x=Math.min(zoneStart.x,zonePreview.x),y=Math.min(zoneStart.y,zonePreview.y);zd={id:"zone"+(idCounter++),type:"rect",x:x,y:y,w:Math.abs(dx),h:Math.abs(dy),color:zoneColor};}zones.push(zd);}
function buildFormationBtns(){
  var c=document.getElementById("formation-btns");c.innerHTML="";
  var list=FORMATIONS[format]||FORMATIONS[11];
  for(var i=0;i<list.length;i++){(function(f){
    var b=document.createElement("button");b.className="btn";b.textContent=f;b.style.flexShrink="0";
    if(f===_defaultFormation&&format===_defaultFormat)b.style.borderColor="#ffdd44";
    b.addEventListener("click",function(){
      document.querySelectorAll("#formation-btns .btn").forEach(function(x){x.classList.remove("on");});
      b.classList.add("on");
      initPlayers(f);
      if(matchRoster.length){matchAssignments={};players.filter(function(p){return p.team==="home";}).forEach(function(p){p.name="";p.number=0;});renderBench();}
      render();
      var star=document.getElementById("btn-set-default");
      if(star)star.textContent=f===_defaultFormation&&format===_defaultFormat?"\u2605":"\u2606";
    });
    c.appendChild(b);
  })(list[i]);}
  // Star button for default
  var star=document.createElement("button");
  star.id="btn-set-default";star.className="btn";
  star.style.cssText="flex-shrink:0;font-size:1rem;padding:4px 8px;color:#ffdd44;border-color:#2d4a35";
  var curActive=document.querySelector("#formation-btns .btn.on");
  var curF=curActive?curActive.textContent:(list[0]||"");
  star.textContent=curF===_defaultFormation&&format===_defaultFormat?"\u2605":"\u2606";
  star.title="S\u00e4tt som standardformation";
  star.addEventListener("click",function(){
    var ab=document.querySelector("#formation-btns .btn.on");
    if(!ab||ab.id==="btn-set-default")return;
    setDefaultFormation(format,ab.textContent);
    // Update all buttons border
    document.querySelectorAll("#formation-btns .btn").forEach(function(x){x.style.borderColor="";});
    ab.style.borderColor="#ffdd44";
    star.textContent="\u2605";
  });
  c.appendChild(star);
  // Select default formation if available, else first
  var matched=null;
  document.querySelectorAll("#formation-btns .btn").forEach(function(b){
    if(b.id==="btn-set-default")return;
    if(b.textContent===_defaultFormation&&format===_defaultFormat)matched=b;
  });
  if(matched)matched.classList.add("on");
  else if(c.firstChild&&c.firstChild.id!=="btn-set-default")c.firstChild.classList.add("on");
}
function openSetup(){document.getElementById("home-color").value=homeColor;document.getElementById("away-color").value=awayColor;document.querySelectorAll("[data-dm]").forEach(function(b){b.classList.toggle("on",b.getAttribute("data-dm")===displayMode);});buildSetupTeam("home");buildSetupTeam("away");document.getElementById("modal-setup").classList.remove("hidden");}
function buildSetupTeam(team){var c=document.getElementById("setup-"+team),tp=players.filter(function(p){return p.team===team;}),color=team==="home"?homeColor:awayColor;var html="<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:8px\"><span class='dot' id='dot-"+team+"' style=\"background:"+color+"\"><\/span><span style=\"font-size:0.78rem;color:#7aaa88;text-transform:uppercase;letter-spacing:0.5px;flex:1\">"+(team==="home"?"Hemmalag":"Bortalag")+"<\/span><button class='btn' onclick='removePlayer(\""+team+"\")' style=\"padding:3px 9px\">&#8722;<\/button><span style=\"font-weight:900;font-size:1rem;color:#4ae87a;min-width:20px;text-align:center\">"+tp.length+"<\/span><button class='btn' onclick='addPlayer(\""+team+"\")' style=\"padding:3px 9px\">+<\/button><\/div><div class='num-grid'>";for(var i=0;i<tp.length;i++){var p=tp[i];html+="<div class='num-cell'><span>"+(i===0?"MV":"#"+i)+"<\/span><input type='number' data-pid='"+p.id+"' value='"+p.number+"' min='1' max='99'><input type='text' data-name='"+p.id+"' value='"+p.name+"' placeholder='Namn' style=\"background:#111a14;color:#edf5ee;border:1px solid #2d4a35;border-radius:4px;padding:3px 5px;font-size:0.78rem;width:100%\"><\/div>";}html+="<\/div>";c.innerHTML=html;}
function addPlayer(team){var tp=players.filter(function(p){return p.team===team;});if(tp.length>=11)return;players.push({id:team[0]+"x"+Date.now(),team:team,number:tp.length+1,name:"",x:W/2+(Math.random()-0.5)*80,y:team==="home"?430:170});buildSetupTeam(team);render();}
function removePlayer(team){var tp=players.filter(function(p){return p.team===team;});if(tp.length<=0)return;var last=tp[tp.length-1];players=players.filter(function(p){return p.id!==last.id;});buildSetupTeam(team);render();}
document.getElementById("btn-setup").addEventListener("click",openSetup);
document.getElementById("setup-cancel").addEventListener("click",function(){document.getElementById("modal-setup").classList.add("hidden");});
document.getElementById("setup-apply").addEventListener("click",function(){homeColor=document.getElementById("home-color").value;awayColor=document.getElementById("away-color").value;document.querySelectorAll("#modal-setup .num-cell input[data-pid]").forEach(function(inp){var p=players.find(function(x){return x.id===inp.getAttribute("data-pid");});if(p)p.number=parseInt(inp.value)||p.number;});document.querySelectorAll("#modal-setup .num-cell input[data-name]").forEach(function(inp){var p=players.find(function(x){return x.id===inp.getAttribute("data-name");});if(p)p.name=inp.value.trim();});document.getElementById("modal-setup").classList.add("hidden");render();});
document.querySelectorAll("[data-dm]").forEach(function(b){b.addEventListener("click",function(){displayMode=b.getAttribute("data-dm");document.querySelectorAll("[data-dm]").forEach(function(x){x.classList.toggle("on",x===b);});render();});});
document.getElementById("home-color").addEventListener("input",function(e){var d=document.getElementById("dot-home");if(d)d.style.background=e.target.value;});
document.getElementById("away-color").addEventListener("input",function(e){var d=document.getElementById("dot-away");if(d)d.style.background=e.target.value;});
function openTextModal(){document.getElementById("text-inp").value="";document.getElementById("modal-text").classList.remove("hidden");setTimeout(function(){document.getElementById("text-inp").focus();},100);}
document.querySelectorAll("#size-btns [data-sz]").forEach(function(b){b.addEventListener("click",function(){labelSize=parseInt(b.getAttribute("data-sz"));document.querySelectorAll("#size-btns [data-sz]").forEach(function(x){x.classList.toggle("on",x===b);});});});
document.getElementById("text-cancel").addEventListener("click",function(){document.getElementById("modal-text").classList.add("hidden");pendingLabelPt=null;});
document.getElementById("text-ok").addEventListener("click",function(){var txt=document.getElementById("text-inp").value.trim();if(txt&&pendingLabelPt){saveUndo();labels.push({id:"lbl"+(idCounter++),x:pendingLabelPt.x,y:pendingLabelPt.y,text:txt,size:labelSize});}document.getElementById("modal-text").classList.add("hidden");pendingLabelPt=null;render();});
document.getElementById("text-inp").addEventListener("keydown",function(e){if(e.key==="Enter")document.getElementById("text-ok").click();});
var editLabelId=null;
function openEditLabel(l){editLabelId=l.id;document.getElementById("edit-text-inp").value=l.text;var sz=l.size||13;document.querySelectorAll("#edit-size-btns [data-sz]").forEach(function(b){b.classList.toggle("on",parseInt(b.getAttribute("data-sz"))===sz);});document.getElementById("modal-edit-text").classList.remove("hidden");setTimeout(function(){document.getElementById("edit-text-inp").focus();},100);}
document.querySelectorAll("#edit-size-btns [data-sz]").forEach(function(b){b.addEventListener("click",function(){document.querySelectorAll("#edit-size-btns [data-sz]").forEach(function(x){x.classList.toggle("on",x===b);});});});
document.getElementById("edit-text-cancel").addEventListener("click",function(){document.getElementById("modal-edit-text").classList.add("hidden");editLabelId=null;});
document.getElementById("edit-text-ok").addEventListener("click",function(){if(editLabelId){var txt=document.getElementById("edit-text-inp").value.trim();var sz=parseInt(document.querySelector("#edit-size-btns .on").getAttribute("data-sz"))||13;labels=labels.map(function(l){return l.id===editLabelId?{id:l.id,x:l.x,y:l.y,text:txt||l.text,size:sz}:l;});}document.getElementById("modal-edit-text").classList.add("hidden");editLabelId=null;render();});
document.getElementById("edit-text-del").addEventListener("click",function(){if(editLabelId){saveUndo();labels=labels.filter(function(l){return l.id!==editLabelId;});}document.getElementById("modal-edit-text").classList.add("hidden");editLabelId=null;render();});
document.getElementById("edit-text-inp").addEventListener("keydown",function(e){if(e.key==="Enter")document.getElementById("edit-text-ok").click();});
document.getElementById("btn-undo").addEventListener("click",doUndo);
function getCurrentFormationForReset(){
  var active=document.querySelector("#formation-btns .btn.on");
  if(active&&active.textContent)return active.textContent;
  if(typeof _defaultFormation!=="undefined"&&_defaultFormation)return _defaultFormation;
  return "4-4-2";
}
function clearCoachboardToFormation(){
  saveUndo();
  initPlayers(getCurrentFormationForReset());
  ball={x:W/2,y:H/2};
  arrows=[];labels=[];freehandPaths=[];zones=[];movementPaths=[];
  selectedId=null;arrowStart=null;arrowCurrent=null;freehandCurrent=null;zoneStart=null;zonePreview=null;movementCurrent=null;
  if(typeof setMode==="function")setMode("move");
  render();
  showToast("Tavlan rensad och spelarna återställda!");
}
document.getElementById("btn-reset").addEventListener("click",function(){clearCoachboardToFormation();});
// Återställ aktuell arbetsyta till markerad standardformation
function resetCurrentWorkspaceToDefault(){
  var key=typeof workspaceKeyFromPanel==="function"?workspaceKeyFromPanel(activeWorkspacePanel||"formations"):"formation";
  if(typeof resetWorkspaceForKey==="function"){
    resetWorkspaceForKey(key);
    if(typeof workspaceStates!=="undefined")workspaceStates[key]=captureWorkspaceState();
  }else{
    format=typeof _defaultFormat!=="undefined"?_defaultFormat:11;
    var fmtSel=document.getElementById("fmt-sel");if(fmtSel)fmtSel.value=String(format);
    if(typeof buildFormationBtns==="function")buildFormationBtns();
    initPlayers(typeof _defaultFormation!=="undefined"?_defaultFormation:"4-4-2");
    arrows=[];labels=[];freehandPaths=[];zones=[];movementPaths=[];selectedId=null;
    render();
  }
  showToast("Återställt till standardformation");
}
(function(){
  var oldBtn=document.getElementById("btn-standard-reset");if(oldBtn)return;
  var ref=document.getElementById("btn-reset");if(!ref||!ref.parentNode)return;
  var b=document.createElement("button");
  b.className="btn";
  b.id="btn-standard-reset";
  b.title="Återställ aktuell arbetsyta till din standardformation";
  b.textContent="↺ Standard";
  b.addEventListener("click",resetCurrentWorkspaceToDefault);
  ref.parentNode.insertBefore(b,ref.nextSibling);
})();
var clearBtn=document.createElement("button");clearBtn.className="btn";clearBtn.title="Rensa ritningar och återställ flyttade spelare";clearBtn.textContent="Rensa";clearBtn.addEventListener("click",function(){clearCoachboardToFormation();});
document.getElementById("btn-freehand").parentNode.insertBefore(clearBtn,document.getElementById("btn-freehand"));
document.getElementById("fmt-sel").addEventListener("change",function(e){format=parseInt(e.target.value);buildFormationBtns();initPlayers((FORMATIONS[format]||FORMATIONS[11])[0]);render();});
document.getElementById("btn-half").addEventListener("click",function(){halfMode=(halfMode+1)%3;var lbl=["\u00bd Plan","\u00bd Borta","Hel"];document.getElementById("btn-half").innerHTML=lbl[halfMode];updateViewBox();});
document.getElementById("btn-panel").addEventListener("click",function(){panelOpen=!panelOpen;document.getElementById("bottompanel").classList.toggle("hidden",!panelOpen);document.getElementById("btn-panel").textContent=panelOpen?"\u25bc":"\u25b2";document.getElementById("panel-show-btn").classList.toggle("visible",!panelOpen);});
document.getElementById("panel-show-btn").addEventListener("click",function(){panelOpen=true;document.getElementById("bottompanel").classList.remove("hidden");document.getElementById("btn-panel").textContent="\u25bc";document.getElementById("panel-show-btn").classList.remove("visible");});
var topbarOpen=true;
(function(){
  var btn=document.getElementById("btn-topbar-toggle");
  if(!btn)return;

  btn.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();

    topbarOpen=!topbarOpen;

    var tb=document.getElementById("topbar");
    if(!tb)return;

    var topRow=tb.children[0];
    var tabRow=tb.children[1];

    if(topbarOpen){
      if(topRow){
        topRow.style.display="flex";
        Array.prototype.forEach.call(topRow.children,function(ch){ch.style.display="";});
      }
      if(tabRow)tabRow.style.display="flex";
      tb.style.minHeight="";
      tb.style.padding="";
      btn.innerHTML="▲";
      btn.title="Minimera menyn";
    }else{
      if(topRow){
        topRow.style.display="flex";
        Array.prototype.forEach.call(topRow.children,function(ch){
          ch.style.display=(ch.id==="btn-topbar-toggle")?"":"none";
        });
      }
      if(tabRow)tabRow.style.display="none";
      tb.style.minHeight="30px";
      tb.style.padding="2px 6px";
      btn.innerHTML="▼";
      btn.title="Visa menyn";
      btn.style.display="";
      btn.style.position="relative";
      btn.style.zIndex="999";
    }
  },true);
})();
document.getElementById("taktik-search").addEventListener("input",function(e){taktikSearch=e.target.value;renderTaktikList();});
// ===== Arbetsytor per huvudflik =====
// Första versionen: separerar framför allt Lag från Taktik/Formation,
// så att laguppställningar inte "följer med" in i andra funktioner.
var activeWorkspacePanel="formations";
var workspaceStates={};

function workspaceKeyFromPanel(panel){
  if(panel==="lag")return "lag";
  if(panel==="taktik")return "taktik";
  if(panel==="saves")return "saves";
  return "formation";
}
function cloneObj(obj){return JSON.parse(JSON.stringify(obj));}
function captureWorkspaceState(){
  return {
    format:format,
    halfMode:halfMode,
    snap:currentSnap(),
    matchRoster:cloneObj(matchRoster||[]),
    matchAssignments:cloneObj(matchAssignments||{}),
    matchGoals:cloneObj(matchGoals||{home:0,away:0}),
    matchVariants:cloneObj(typeof matchVariants!=="undefined"?matchVariants:[]),
    activeVariantIdx:typeof activeVariantIdx!=="undefined"?activeVariantIdx:0,
    activeFormationId:activeFormationId,
    activeFormationName:activeFormationName
  };
}
function resetWorkspaceForKey(key){
  if(playback)stopPlayback();
  if(animFrame)cancelAnimationFrame(animFrame);
  playback=null;activeTaktik=null;editingTaktikIdx=null;editingStepIdx=0;isEditingTaktik=false;
  arrows=[];labels=[];freehandPaths=[];zones=[];movementPaths=[];selectedId=null;undoStack=[];
  matchRoster=[];matchAssignments={};matchVariants=[];activeVariantIdx=0;matchGoals={home:0,away:0};window._editingMatchId=null;
  activeFormationId=null;activeFormationName=null;
  format=_defaultFormat||11;
  var fmt=document.getElementById("fmt-sel");if(fmt)fmt.value=String(format);
  buildFormationBtns();
  initPlayers(_defaultFormation||"4-4-2");
  halfMode=key==="lag"?1:0;
  updateViewBox();
  var bench=document.getElementById("bench-bar");if(bench)bench.classList.toggle("active",key==="lag"&&matchRoster.length>0);
  var goal=document.getElementById("goal-overlay");if(goal)goal.style.display="none";
  if(typeof updateGoalDisplay==="function")updateGoalDisplay();
  if(typeof renderBench==="function")renderBench();
  if(typeof updateSaveButtons==="function")updateSaveButtons();
  render();
}
function restoreWorkspaceState(state,key){
  if(!state){resetWorkspaceForKey(key);return;}
  format=state.format||_defaultFormat||11;
  var fmt=document.getElementById("fmt-sel");if(fmt)fmt.value=String(format);
  buildFormationBtns();
  restoreSnap(state.snap||currentSnap());
  matchRoster=cloneObj(state.matchRoster||[]);
  matchAssignments=cloneObj(state.matchAssignments||{});
  matchGoals=cloneObj(state.matchGoals||{home:0,away:0});
  matchVariants=cloneObj(state.matchVariants||[]);
  activeVariantIdx=state.activeVariantIdx||0;
  activeFormationId=state.activeFormationId||null;
  activeFormationName=state.activeFormationName||null;
  halfMode=typeof state.halfMode==="number"?state.halfMode:(key==="lag"?1:0);
  updateViewBox();
  var bench=document.getElementById("bench-bar");if(bench)bench.classList.toggle("active",key==="lag"&&matchRoster.length>0);
  var goal=document.getElementById("goal-overlay");if(goal)goal.style.display=key==="lag"&&matchRoster.length?"flex":"none";
  if(typeof updateGoalDisplay==="function")updateGoalDisplay();
  if(typeof renderBench==="function")renderBench();
  if(typeof updateVariantUI==="function")updateVariantUI();
  if(typeof updateSaveButtons==="function")updateSaveButtons();
  render();
}
function switchWorkspacePanel(nextPanel){
  var prevKey=workspaceKeyFromPanel(activeWorkspacePanel);
  workspaceStates[prevKey]=captureWorkspaceState();
  var nextKey=workspaceKeyFromPanel(nextPanel);
  activeWorkspacePanel=nextPanel;
  restoreWorkspaceState(workspaceStates[nextKey],nextKey);
}

// ===== Koppla sparade utgångslägen till taktik =====
function workspaceFromSavedFormation(saved){
  var st=cloneObj(saved.state||{});
  return {
    format:st.format||format||11,
    halfMode:0,
    snap:{
      players:cloneObj(st.players||[]),
      ball:cloneObj(st.ball||{x:W/2,y:H/2}),
      arrows:cloneObj(st.arrows||[]),
      labels:cloneObj(st.labels||[]),
      freehandPaths:cloneObj(st.freehandPaths||[]),
      zones:cloneObj(st.zones||[]),
      movementPaths:[]
    },
    matchRoster:[],
    matchAssignments:{},
    matchGoals:{home:0,away:0},
    matchVariants:[],
    activeVariantIdx:0,
    activeFormationId:null,
    activeFormationName:null,
    sourceFormationName:saved.name||"Utgångsläge"
  };
}
function openPanelByName(panelName){
  var tab=document.querySelector('.tab[data-panel="'+panelName+'"]');
  if(tab)tab.click();
}
function sendSavedFormationToTaktik(saved){
  var currentKey=workspaceKeyFromPanel(activeWorkspacePanel);
  workspaceStates[currentKey]=captureWorkspaceState();
  workspaceStates.taktik=workspaceFromSavedFormation(saved);
  if(currentKey==="taktik"){
    restoreWorkspaceState(workspaceStates.taktik,"taktik");
    if(playback)stopPlayback();
    renderTaktikList();
  }else{
    openPanelByName("taktik");
  }
  showToast("Utgångsläge kopierat till taktik: "+(saved.name||"Namnlös"));
}
function openTaktikImportStartModal(){
  var old=document.getElementById("modal-taktik-import-start");
  if(old)old.remove();
  var modal=document.createElement("div");
  modal.id="modal-taktik-import-start";
  modal.className="modal";
  var box=document.createElement("div");
  box.className="modal-box";
  box.style.maxHeight="80vh";
  box.style.overflow="auto";
  var title=document.createElement("h2");
  title.textContent="Hämta utgångsläge till taktik";
  box.appendChild(title);
  if(!savedFormations.length){
    var empty=document.createElement("p");
    empty.style.color="#7aaa88";
    empty.textContent="Inga sparade utgångslägen hittades.";
    box.appendChild(empty);
  }else{
    var list=document.createElement("div");
    list.style.display="flex";
    list.style.flexDirection="column";
    list.style.gap="4px";
    savedFormations.slice().sort(function(a,b){return a.name.localeCompare(b.name,"sv");}).forEach(function(s){
      var row=document.createElement("div");
      row.className="row";
      var name=document.createElement("span");
      name.className="row-name";
      name.textContent=s.name;
      var sub=document.createElement("span");
      sub.className="row-sub";
      sub.textContent=s.folder||"Allmänt";
      var btn=document.createElement("button");
      btn.className="sa play";
      btn.textContent="Hämta";
      btn.addEventListener("click",function(){modal.remove();sendSavedFormationToTaktik(s);});
      row.appendChild(name);row.appendChild(sub);row.appendChild(btn);list.appendChild(row);
    });
    box.appendChild(list);
  }
  var close=document.createElement("button");
  close.className="btn";
  close.textContent="Stäng";
  close.style.marginTop="10px";
  close.addEventListener("click",function(){modal.remove();});
  box.appendChild(close);
  modal.appendChild(box);
  document.body.appendChild(modal);
}
function ensureTaktikImportButton(){
  var newBtn=document.getElementById("btn-new-taktik");
  if(!newBtn||document.getElementById("btn-import-start-taktik"))return;
  var btn=document.createElement("button");
  btn.className="btn";
  btn.id="btn-import-start-taktik";
  btn.textContent="Hämta utgångsläge";
  btn.style.color="#e8c84a";
  btn.style.borderColor="#e8c84a";
  btn.addEventListener("click",openTaktikImportStartModal);
  newBtn.parentNode.insertBefore(btn,newBtn.nextSibling);
}

document.querySelectorAll(".tab").forEach(function(tab){tab.addEventListener("click",function(){
  if(mode==="movement")setMode("move");
  movementPaths=[];selectedId=null;
  var name=tab.getAttribute("data-panel");
  if(!name)return;
  switchWorkspacePanel(name);
  document.querySelectorAll(".tab").forEach(function(t){t.classList.toggle("on",t===tab);});
  document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.id==="panel-"+name);});
  if(name==="saves")renderSavesList();
  if(name==="lag"){
    halfMode=1;updateViewBox();
  }else{
    document.getElementById("bottompanel").classList.remove("expanded");
  }
  if(name==="taktik"){
    if(playback)renderPlayStepList();else renderTaktikList();
  }
});});
function startRecording(name){activeTaktik={name:name,steps:[currentSnap()]};document.getElementById("rec-badge").style.display="block";document.getElementById("rec-ui").style.display="block";document.getElementById("no-rec-ui").style.display="none";document.getElementById("rec-name-lbl").textContent="\u25cf "+name;renderRecSteps();}
document.getElementById("btn-add-step").addEventListener("click",function(){if(!activeTaktik)return;activeTaktik.steps.push(currentSnap());renderRecSteps();});
document.getElementById("btn-stop-rec").addEventListener("click",function(){
  if(!activeTaktik||!activeTaktik.steps||activeTaktik.steps.length<2){
    showToast("Lägg till minst ett steg innan du sparar filmen",false);
    return;
  }
  var newFilm={
    name:activeTaktik.name,
    folder:"Taktik",
    steps:JSON.parse(JSON.stringify(activeTaktik.steps))
  };
  activeTaktik=null;
  document.getElementById("rec-badge").style.display="none";
  document.getElementById("rec-ui").style.display="none";
  document.getElementById("no-rec-ui").style.display="block";
  cloudSaveTaktik(newFilm);
});
function renderRecSteps(){var list=document.getElementById("rec-steps-list");list.innerHTML="";if(!activeTaktik)return;for(var i=0;i<activeTaktik.steps.length;i++){(function(idx){var row=document.createElement("div");row.className="row";var num=document.createElement("span");num.style.cssText="font-weight:900;font-size:0.85rem;color:#4ae87a;min-width:20px";num.textContent=idx===0?"\u25ba":String(idx);var lbl=document.createElement("span");lbl.className="row-name";lbl.textContent=activeTaktik.steps[idx]&&activeTaktik.steps[idx].label?activeTaktik.steps[idx].label:(idx===0?"Startl\u00e4ge":"Steg "+idx);var jmp=document.createElement("button");jmp.className="sa jump";jmp.textContent="Hoppa";jmp.addEventListener("click",function(){restoreSnap(activeTaktik.steps[idx]);render();});var upd=document.createElement("button");upd.className="sa save2";upd.textContent="Spara";upd.addEventListener("click",function(){activeTaktik.steps[idx]=currentSnap();});row.appendChild(num);row.appendChild(lbl);row.appendChild(jmp);row.appendChild(upd);if(idx>0){var del=document.createElement("button");del.className="sa del";del.textContent="\u00d7";del.addEventListener("click",function(){activeTaktik.steps.splice(idx,1);renderRecSteps();});row.appendChild(del);}list.appendChild(row);})(i);}}
function renderTaktikList(){
  var filterDiv=document.getElementById("taktik-folder-filter");
  if(filterDiv){
    filterDiv.innerHTML="";
    var tfCounts={"Alla":taktikFilmer.length};
    for(var i=0;i<taktikFilmer.length;i++){var f=taktikFilmer[i].folder||"Taktik";tfCounts[f]=(tfCounts[f]||0)+1;}
    // Build all folders list
    var tfAll=["Alla"];var tfseen={};
    var rootFolders=["Taktik","Tr\u00e4ning"];
    rootFolders.forEach(function(r){if(!tfseen[r]){tfseen[r]=true;tfAll.push(r);}});
    for(var i=0;i<taktikFilmer.length;i++){var f=taktikFilmer[i].folder||"Taktik";if(!tfseen[f]){tfseen[f]=true;tfAll.push(f);}}
    for(var i=0;i<taktikFolders.length;i++){if(!tfseen[taktikFolders[i]]){tfseen[taktikFolders[i]]=true;tfAll.push(taktikFolders[i]);}}
    // Sort: roots first, then sub by parent
    tfAll.sort(function(a,b){if(a==="Alla")return -1;if(b==="Alla")return 1;return a.localeCompare(b,"sv");});
    for(var i=0;i<tfAll.length;i++){(function(f){
      var isRoot=f==="Alla"||rootFolders.indexOf(f)>=0;
      var depth=f==="Alla"?0:(f.split("/").length-1);
      var wrap=document.createElement("div");wrap.style.cssText="display:flex;align-items:center;gap:1px;margin-bottom:2px;margin-left:"+(depth*12)+"px";
      var fb=document.createElement("button");
      fb.className="tab"+(currentTaktikFolder===f?" on":"");
      fb.textContent=(depth>0?"\u2514 ":"")+f.split("/").pop()+" ("+(tfCounts[f]||0)+")";
      fb.style.fontSize="0.62rem";fb.style.padding="2px 6px";
      fb.addEventListener("click",function(){currentTaktikFolder=f;renderTaktikList();});
      wrap.appendChild(fb);
      if(f!=="Alla"){
        // Add subfolder button
        var subBtn=document.createElement("button");
        subBtn.style.cssText="font-size:0.6rem;padding:2px 4px;background:#111a14;color:#4ae87a;border:1px solid #2d4a35;border-left:none;cursor:pointer";
        subBtn.textContent="+";subBtn.title="Ny undermapp";
        subBtn.addEventListener("click",function(e){e.stopPropagation();pendingFolderParent=f;pendingFolderTarget="taktik";document.getElementById("new-folder-inp").value="";document.getElementById("modal-new-folder").classList.remove("hidden");setTimeout(function(){document.getElementById("new-folder-inp").focus();},100);});
        wrap.appendChild(subBtn);
        if(!isRoot){
          var rnBtn=document.createElement("button");
          rnBtn.style.cssText="font-size:0.6rem;padding:2px 4px;background:#111a14;color:#7aaa88;border:1px solid #2d4a35;border-left:none;cursor:pointer";
          rnBtn.textContent="\u270f";rnBtn.title="Byt namn";
          rnBtn.addEventListener("click",function(e){e.stopPropagation();openRenameTaktikFolder(f);});
          wrap.appendChild(rnBtn);
          var delBtn=document.createElement("button");
          delBtn.style.cssText="font-size:0.6rem;padding:2px 4px;background:#111a14;color:#e84a4a;border:1px solid #2d4a35;border-left:none;border-radius:0 4px 4px 0;cursor:pointer";
          delBtn.textContent="\u00d7";delBtn.title="Radera mapp";
          delBtn.addEventListener("click",function(e){e.stopPropagation();var count=tfCounts[f]||0;if(count===0){if(!confirm("Radera mappen \""+f+"\"?"))return;taktikFolders=taktikFolders.filter(function(x){return x!==f;});if(currentTaktikFolder===f)currentTaktikFolder="Alla";renderTaktikList();}else{openDeleteFolderConfirm(f,"taktik");}});
          wrap.appendChild(delBtn);
        }
      }
      filterDiv.appendChild(wrap);
    })(tfAll[i]);}
  }
  var list=document.getElementById("taktik-list");list.innerHTML="";var q=taktikSearch.toLowerCase();
  var favorites_=typeof favorites!=="undefined"?favorites:{};
  taktikFilmer.sort(function(a,b){var af=a.dbId&&favorites_[a.dbId]?1:0;var bf=b.dbId&&favorites_[b.dbId]?1:0;return bf-af;});
  var filtered=taktikFilmer.filter(function(tk){var inFolder=currentTaktikFolder==="Alla"||(tk.folder||"Taktik")===currentTaktikFolder;var inSearch=!q||tk.name.toLowerCase().indexOf(q)>=0;return inFolder&&inSearch;});
  if(!filtered.length){list.innerHTML="<span style=\"color:#7aaa88;font-size:0.8rem\">"+(taktikSearch?"Inga tr\u00e4ffar":"Inga taktikfilmer sparade")+"<\/span>";return;}
  for(var i=0;i<filtered.length;i++){
    (function(tk){
      var idx=taktikFilmer.indexOf(tk);
      var row=document.createElement("div");
      row.className="row";
      row.style.gap="3px";

      var nm=document.createElement("span");
      nm.className="row-name";
      nm.textContent=tk.name;

      var fl=document.createElement("span");
      fl.className="row-sub";
      fl.textContent=(tk.folder||"Allmänt")+" · "+(tk.steps.length-1)+" steg";

      function iconBtn(txt,title,color){
        var b=document.createElement("button");
        b.className="sa";
        b.textContent=txt;
        b.title=title;
        b.setAttribute("aria-label",title);
        b.style.cssText="min-width:24px;padding:2px 5px;font-size:0.72rem;line-height:1.1"+(color?";color:"+color+";border-color:"+color:"");
        return b;
      }

      var fav=document.createElement("button");
      fav.className="star-btn "+(tk.dbId&&favorites_[tk.dbId]?"on":"off");
      fav.innerHTML="&#9733;";
      fav.title="Favorit";
      fav.addEventListener("click",function(e){e.stopPropagation();if(tk.dbId)toggleFavorite(tk.dbId);});

      var pb=iconBtn("✎","Redigera","#4ae87a");
      pb.className+=" play";
      pb.addEventListener("click",function(){startPlayback(idx);});

      var dup=iconBtn("⧉","Kopiera","#4ae8e8");
      dup.addEventListener("click",function(){duplicateTaktik(idx);});

      var mg=iconBtn("⋓","Sammanfoga","#a78bfa");
      mg.addEventListener("click",function(){openMergeTaktik(idx);});

      var sh=iconBtn("⤴","Dela","#7aaa88");
      sh.addEventListener("click",function(){openShareTaktik(tk);});

      var mvTk=iconBtn("⇆","Flytta till mapp","#e8c84a");
      mvTk.addEventListener("click",function(){openMoveTaktikFolder(tk);});

      var dl=iconBtn("×","Radera","#e84a4a");
      dl.className+=" del";
      dl.addEventListener("click",function(){if(!confirm("Radera taktikfilmen \""+(tk.name||"utan namn")+"\"?"))return;if(tk.dbId){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{method:"DELETE",headers:supaHeaders()}).then(function(){cloudLoadTaktik();showToast("Taktik raderad!");});}else{taktikFilmer.splice(idx,1);renderTaktikList();showToast("Taktik raderad!");}});

      row.appendChild(nm);
      row.appendChild(fl);
      row.appendChild(fav);
      row.appendChild(pb);
      row.appendChild(dup);
      row.appendChild(mg);
      row.appendChild(sh);
      row.appendChild(mvTk);
      row.appendChild(dl);
      list.appendChild(row);
    })(filtered[i]);
  }

}
var editingStepIdx=0;
function openEditTaktik(idx){editingTaktikIdx=idx;editingStepIdx=0;var tk=taktikFilmer[idx];if(tk.steps&&tk.steps[0])restoreSnap(tk.steps[0]);render();document.getElementById("no-rec-ui").style.display="none";document.getElementById("rec-ui").style.display="none";document.getElementById("edit-taktik-ui").style.display="block";document.getElementById("edit-taktik-title-lbl").textContent="\u270f "+tk.name;isEditingTaktik=true;updateEditStepUI();document.querySelectorAll(".tab").forEach(function(t){t.classList.toggle("on",t.getAttribute("data-panel")==="taktik");});document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.id==="panel-taktik");});}
function updateEditStepUI(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];if(!tk||!tk.steps)return;var s=tk.steps[editingStepIdx];movementPaths=(s.movementPaths||[]).map(function(m){return{id:m.id,playerId:m.playerId,pts:m.pts.slice()};});var total=tk.steps.length-1;document.getElementById("edit-step-counter").textContent=(editingStepIdx===0?"Start":"Steg "+editingStepIdx)+"/"+total;document.getElementById("edit-step-name-inp").value=s.label||(editingStepIdx===0?"Startl\u00e4ge":"Steg "+editingStepIdx);document.getElementById("btn-edit-step-prev").style.opacity=editingStepIdx>0?"1":"0.3";document.getElementById("btn-edit-step-next").style.opacity=editingStepIdx<total?"1":"0.3";document.getElementById("btn-edit-del-step").style.opacity=editingStepIdx>0?"1":"0.3";restoreSnap(s);render();renderEditSteps(tk);}
function exitEditTaktik(){movementPaths=[];selectedId=null;editingTaktikIdx=null;editingStepIdx=0;isEditingTaktik=false;document.getElementById("edit-taktik-ui").style.display="none";document.getElementById("no-rec-ui").style.display="block";renderTaktikList();}
function renderEditSteps(tk){var list=document.getElementById("edit-taktik-steps");list.innerHTML="";for(var i=0;i<tk.steps.length;i++){(function(idx){var s=tk.steps[idx];var row=document.createElement("div");row.className="row"+(idx===editingStepIdx?" on":"");row.draggable=true;row.dataset.idx=idx;row.style.cursor="grab";
      row.addEventListener("click",function(e){
        // Don't trigger on button clicks
        if(e.target.tagName==="BUTTON"||e.target.tagName==="INPUT")return;
        if(editingTaktikIdx===null)return;
        movementPaths=[];selectedId=null;
        editingStepIdx=idx;
        if(playback){animateToStep(idx);}
        else{updateEditStepUI();}
      });var num=document.createElement("span");num.style.cssText="font-weight:900;font-size:0.85rem;color:#4ae87a;min-width:20px";num.textContent=idx===0?"\u25ba":String(idx);var nameInp=document.createElement("input");nameInp.type="text";nameInp.value=s.label||(idx===0?"Startl\u00e4ge":"Steg "+idx);nameInp.style.cssText="flex:1;background:#111a14;color:#edf5ee;border:1px solid #2d4a35;border-radius:4px;padding:3px 6px;font-size:0.78rem";nameInp.addEventListener("change",function(){s.label=nameInp.value;});var del=document.createElement("button");del.className="sa del";del.textContent="\u00d7";del.style.display=idx===0?"none":"";del.addEventListener("click",function(){tk.steps.splice(idx,1);renderEditSteps(tk);});var up=document.createElement("button");up.className="sa";up.textContent="\u2191";up.style.display=idx<=1?"none":"";up.addEventListener("click",function(){if(idx>1){var tmp=tk.steps[idx];tk.steps[idx]=tk.steps[idx-1];tk.steps[idx-1]=tmp;renderEditSteps(tk);}});var dn=document.createElement("button");dn.className="sa";dn.textContent="\u2193";dn.style.display=idx===0||idx===tk.steps.length-1?"none":"";dn.addEventListener("click",function(){if(idx<tk.steps.length-1){var tmp=tk.steps[idx];tk.steps[idx]=tk.steps[idx+1];tk.steps[idx+1]=tmp;renderEditSteps(tk);}});row.appendChild(num);row.appendChild(nameInp);row.appendChild(up);row.appendChild(dn);row.appendChild(del);list.appendChild(row);})(i);}}

function saveCurrentTaktikStepAsFormation(){
  if(editingTaktikIdx===null){showToast("Öppna en taktikfilm först",false);return;}
  var tk=taktikFilmer[editingTaktikIdx];
  if(!tk){showToast("Ingen aktiv taktikfilm",false);return;}
  var stepLabel=editingStepIdx===0?"Start":"Steg "+editingStepIdx;
  var defaultName="Utgångsläge från "+tk.name+" – "+stepLabel;
  var name=window.prompt("Namn på nytt utgångsläge:",defaultName);
  if(name===null)return;
  name=(name||defaultName).trim()||defaultName;
  var snap=currentSnap();
  var data={
    format:format,
    homeColor:homeColor,
    awayColor:awayColor,
    displayMode:displayMode,
    players:cloneObj(snap.players||[]),
    ball:cloneObj(snap.ball||{x:W/2,y:H/2}),
    arrows:cloneObj(snap.arrows||[]),
    labels:cloneObj(snap.labels||[]),
    freehandPaths:cloneObj(snap.freehandPaths||[]),
    zones:cloneObj(snap.zones||[]),
    movementPaths:[]
  };
  cloudStatus("Sparar utgångsläge...","#7aaa88");
  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{method:"POST",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({name:name,data:data,type:"uppstallning",folder:"Allmänt"})})
    .then(function(r){return r.json();})
    .then(function(res){
      cloudStatus("✅ Utgångsläge sparat: "+name,"#4ae87a");
      showToast("Steget sparades som utgångsläge!");
      cloudLoadSaves();
    })
    .catch(function(err){cloudStatus("❌ Fel: "+err.message,"#e84a4a");showToast("Kunde inte spara utgångsläge",false);});
}
function ensureExportStepAsFormationButton(){
  var ref=document.getElementById("btn-edit-update-step2")||document.getElementById("btn-edit-update-step");
  if(!ref||document.getElementById("btn-export-step-formation"))return;
  var b=document.createElement("button");
  b.className="btn";
  b.id="btn-export-step-formation";
  b.textContent="⇩ Utgångsläge";
  b.title="Spara aktuellt taktiksteg som utgångsläge";
  b.style.cssText="padding:3px 7px;font-size:0.65rem;color:#e8c84a;border-color:#e8c84a";
  b.addEventListener("click",saveCurrentTaktikStepAsFormation);
  ref.parentNode.insertBefore(b,ref.nextSibling);
}
ensureExportStepAsFormationButton();

document.getElementById("btn-edit-taktik-exit").addEventListener("click",exitEditTaktik);
document.getElementById("btn-edit-taktik-save").addEventListener("click",function(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];if(tk.dbId){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({name:tk.name,data:tk,folder:tk.folder||"Allm\u00e4nt"})}).then(function(){cloudStatus("\u2705 Film sparad","#4ae87a");});}else cloudStatus("\u2705 Sparad lokalt","#4ae87a");});
document.getElementById("btn-edit-step-prev").addEventListener("click",function(){if(editingTaktikIdx===null||editingStepIdx<=0)return;editingStepIdx--;updateEditStepUI();});
document.getElementById("btn-edit-step-next").addEventListener("click",function(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];if(editingStepIdx>=tk.steps.length-1)return;editingStepIdx++;updateEditStepUI();});
document.getElementById("btn-edit-update-step").addEventListener("click",function(){document.getElementById("btn-edit-update-step2").click();});
document.getElementById("btn-edit-add-step").addEventListener("click",function(){if(editingTaktikIdx===null)return;saveTaktikUndo();var tk=taktikFilmer[editingTaktikIdx];var snap=currentSnap();tk.steps.splice(editingStepIdx+1,0,snap);editingStepIdx++;updateEditStepUI();});
document.getElementById("btn-edit-del-step").addEventListener("click",function(){if(editingTaktikIdx===null||editingStepIdx===0)return;saveTaktikUndo();var tk=taktikFilmer[editingTaktikIdx];tk.steps.splice(editingStepIdx,1);editingStepIdx=Math.min(editingStepIdx,tk.steps.length-1);updateEditStepUI();});
document.getElementById("btn-edit-taktik-meta").addEventListener("click",function(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];document.getElementById("edit-taktik-name-inp").value=tk.name;var sel=document.getElementById("edit-taktik-folder");sel.innerHTML="";var allTF=["Taktik","Tr\u00e4ning"];var tfSeen2={};allTF.forEach(function(x){tfSeen2[x]=true;});taktikFolders.forEach(function(f){if(!tfSeen2[f]){tfSeen2[f]=true;allTF.push(f);}});if(tk.folder&&!tfSeen2[tk.folder]){allTF.push(tk.folder);}allTF.sort(function(a,b){return a.localeCompare(b,"sv");});allTF.forEach(function(f){var o=document.createElement("option");o.value=f;o.textContent=f;if((tk.folder||"Taktik")===f)o.selected=true;sel.appendChild(o);});document.getElementById("modal-edit-taktik-meta").classList.remove("hidden");});
document.getElementById("edit-taktik-cancel").addEventListener("click",function(){document.getElementById("modal-edit-taktik-meta").classList.add("hidden");});
document.getElementById("edit-taktik-ok").addEventListener("click",function(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];tk.name=document.getElementById("edit-taktik-name-inp").value.trim()||tk.name;tk.folder=document.getElementById("edit-taktik-folder").value;if(tk.dbId){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({name:tk.name,data:tk,folder:tk.folder})}).then(function(){cloudStatus("\u2705 Film uppdaterad","#4ae87a");showToast("Film uppdaterad!");cloudLoadTaktik();});}else{cloudStatus("\u2705 Film uppdaterad (lokalt)","#4ae87a");showToast("Film uppdaterad!");renderTaktikList();}document.getElementById("modal-edit-taktik-meta").classList.add("hidden");document.getElementById("edit-taktik-title-lbl").textContent="\u270f "+tk.name;});
function duplicateTaktik(idx){
  var tk=taktikFilmer[idx];
  if(!tk||!tk.steps||tk.steps.length<2){showToast("Kan inte kopiera tom film",false);return;}
  var copy={
    name:"Kopia av "+tk.name,
    folder:tk.folder||"Allmänt",
    steps:JSON.parse(JSON.stringify(tk.steps))
  };
  cloudSaveTaktik(copy);
  cloudStatus("✅ Film kopieras","#4ae87a");
  showToast("Film kopieras!");
}
function openMergeTaktik(idx){mergingTaktikIdx=idx;document.getElementById("merge-base-name").textContent=taktikFilmer[idx].name;var list=document.getElementById("merge-taktik-list");list.innerHTML="";for(var i=0;i<taktikFilmer.length;i++){if(i===idx)continue;(function(i2){var tk2=taktikFilmer[i2];var row=document.createElement("div");row.className="row";row.style.cursor="pointer";var nm=document.createElement("span");nm.className="row-name";nm.textContent=tk2.name;var cnt=document.createElement("span");cnt.className="row-sub";cnt.textContent=(tk2.steps.length-1)+" steg";var btn=document.createElement("button");btn.className="sa play";btn.textContent="L\u00e4gg till";btn.addEventListener("click",function(){mergeTaktik(mergingTaktikIdx,i2);document.getElementById("modal-merge-taktik").classList.add("hidden");mergingTaktikIdx=null;});row.appendChild(nm);row.appendChild(cnt);row.appendChild(btn);list.appendChild(row);})(i);}document.getElementById("modal-merge-taktik").classList.remove("hidden");}
function mergeTaktik(idxA,idxB){var tkA=taktikFilmer[idxA],tkB=taktikFilmer[idxB];var merged={name:tkA.name+" + "+tkB.name,folder:tkA.folder||"Allm\u00e4nt",steps:JSON.parse(JSON.stringify(tkA.steps)).concat(JSON.parse(JSON.stringify(tkB.steps)).slice(1))};taktikFilmer.push(merged);cloudSaveTaktik(merged);cloudStatus("\u2705 Filmer sammanfogade","#4ae87a");showToast("Filmer sammanfogade!");}
document.getElementById("merge-taktik-cancel").addEventListener("click",function(){document.getElementById("modal-merge-taktik").classList.add("hidden");mergingTaktikIdx=null;});
document.getElementById("btn-new-taktik").addEventListener("click",function(){document.getElementById("taktik-name-inp").value="";document.getElementById("modal-new-taktik").classList.remove("hidden");setTimeout(function(){document.getElementById("taktik-name-inp").focus();},150);});
ensureTaktikImportButton();
document.getElementById("new-taktik-cancel").addEventListener("click",function(){document.getElementById("modal-new-taktik").classList.add("hidden");});
document.getElementById("new-taktik-ok").addEventListener("click",function(){
  var name=document.getElementById("taktik-name-inp").value.trim();if(!name)return;
  document.getElementById("modal-new-taktik").classList.add("hidden");
  var newFilm={name:name,folder:"Taktik",steps:[currentSnap()],_isDraft:true};
  taktikFilmer.push(newFilm);
  renderTaktikList();
  startPlayback(taktikFilmer.length-1);
  showToast("Utkast skapat – lägg till minst ett steg innan sparning");
});
function startPlayback(idx){movementPaths=[];selectedId=null;var tk=taktikFilmer[idx];if(!tk||!tk.steps||!tk.steps.length){cloudStatus("\u274c Ogiltig taktikfilm","#e84a4a");return;}if(animFrame)cancelAnimationFrame(animFrame);playback={tk:tk,stepIndex:0,animating:false};var s0=tk.steps[0];restoreSnap(s0);render();document.getElementById("taktikbar").style.display="flex";document.getElementById("taktikbar-title").textContent=tk.name;updatePlaybar();editingTaktikIdx=idx;editingStepIdx=0;isEditingTaktik=true;document.getElementById("no-rec-ui").style.display="none";document.getElementById("rec-ui").style.display="none";document.getElementById("edit-taktik-ui").style.display="block";document.getElementById("edit-taktik-title-lbl").textContent="\u270f "+tk.name;updateEditStepUI_silent();document.querySelectorAll(".tab").forEach(function(t){t.classList.toggle("on",t.getAttribute("data-panel")==="taktik");});document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.id==="panel-taktik");});}
function updateEditStepUI_silent(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];if(!tk||!tk.steps)return;var s=tk.steps[editingStepIdx];movementPaths=(s.movementPaths||[]).map(function(m){return{id:m.id,playerId:m.playerId,pts:m.pts.slice()};});var total=tk.steps.length-1;document.getElementById("edit-step-counter").textContent=(editingStepIdx===0?"Start":"Steg "+editingStepIdx)+"/"+total;document.getElementById("edit-step-name-inp").value=s.label||(editingStepIdx===0?"Startl\u00e4ge":"Steg "+editingStepIdx);document.getElementById("btn-edit-step-prev").style.opacity=editingStepIdx>0?"1":"0.3";document.getElementById("btn-edit-step-next").style.opacity=editingStepIdx<total?"1":"0.3";document.getElementById("btn-edit-del-step").style.opacity=editingStepIdx>0?"1":"0.3";renderEditSteps(tk);}
function stopPlayback(){if(animFrame)cancelAnimationFrame(animFrame);playback=null;movementPaths=[];selectedId=null;document.getElementById("taktikbar").style.display="none";document.getElementById("bottompanel").classList.remove("hidden");exitEditTaktik();render();}
document.getElementById("btn-stop-play").addEventListener("click",stopPlayback);

/* === v14: propagera manuella positionsändringar framåt i taktiksteg === */
function _posV14FromStep(step,id){
  if(!step)return null;
  if(id==="ball")return step.ball?{x:step.ball.x,y:step.ball.y}:null;
  var p=(step.players||[]).find(function(x){return x.id===id;});
  return p?{x:p.x,y:p.y}:null;
}
function _setPosV14(step,id,pos){
  if(!step||!pos)return;
  if(id==="ball"){
    if(!step.ball)step.ball={x:W/2,y:H/2};
    step.ball.x=pos.x;step.ball.y=pos.y;
    return;
  }
  var p=(step.players||[]).find(function(x){return x.id===id;});
  if(p){p.x=pos.x;p.y=pos.y;}
}
function _samePosV14(a,b){
  if(!a||!b)return false;
  var dx=(a.x||0)-(b.x||0),dy=(a.y||0)-(b.y||0);
  return dx*dx+dy*dy<1;
}
function _stepHasMovementForV14(step,id){
  return !!(step&&step.movementPaths&&step.movementPaths.some(function(mp){return mp.playerId===id;}));
}
function _propagatePositionChangeV14(tk,stepIdx,id,oldPos,newPos){
  if(!tk||!tk.steps||!oldPos||!newPos||_samePosV14(oldPos,newPos))return;

  for(var si=stepIdx+1;si<tk.steps.length;si++){
    var fs=tk.steps[si];if(!fs)continue;

    // Om ett senare steg själv har en rörelsebana för spelaren/bollen
    // betraktar vi det som en aktiv ny förändring och slutar där.
    if(_stepHasMovementForV14(fs,id))break;

    var cur=_posV14FromStep(fs,id);
    if(!cur)continue;

    // Skriv bara över steg som fortfarande låg kvar på gamla positionen.
    // Om positionen redan skiljer sig har tränaren sannolikt gjort en aktiv senare ändring.
    if(_samePosV14(cur,oldPos)){
      _setPosV14(fs,id,newPos);
    }else{
      break;
    }
  }
}
function propagateManualStepPositionsV14(tk,stepIdx,oldStep,newStep){
  if(!tk||!oldStep||!newStep)return;

  (newStep.players||[]).forEach(function(np){
    var op=(oldStep.players||[]).find(function(x){return x.id===np.id;});
    if(!op)return;
    _propagatePositionChangeV14(tk,stepIdx,np.id,{x:op.x,y:op.y},{x:np.x,y:np.y});
  });

  if(oldStep.ball&&newStep.ball){
    _propagatePositionChangeV14(tk,stepIdx,"ball",{x:oldStep.ball.x,y:oldStep.ball.y},{x:newStep.ball.x,y:newStep.ball.y});
  }
}
/* === slut v14 === */

document.getElementById("btn-edit-update-step2").addEventListener("click",function(){
  if(editingTaktikIdx===null)return;
  var tk=taktikFilmer[editingTaktikIdx];
  if(!tk||!tk.steps||!tk.steps[editingStepIdx])return;

  saveTaktikUndo();

  var oldStep=JSON.parse(JSON.stringify(tk.steps[editingStepIdx]));
  var snap=currentSnap();
  var lbl=document.getElementById("edit-step-name-inp").value.trim();
  if(lbl)snap.label=lbl;

  // 1. Manuell flytt: jämför gammalt steg med nytt sparat steg.
  //    Positionen förs framåt tills ett senare steg redan har en egen ändring.
  propagateManualStepPositionsV14(tk,editingStepIdx,oldStep,snap);

  // 2. Ritad rörelsebana: endpoint ska fortsatt skrivas framåt.
  if(snap.movementPaths&&snap.movementPaths.length){
    snap.movementPaths.forEach(function(mp){
      if(!mp.pts||!mp.pts.length)return;
      var ep=mp.pts[mp.pts.length-1];
      for(var si=editingStepIdx+1;si<tk.steps.length;si++){
        var fs=tk.steps[si];
        if(!fs)continue;
        if(_stepHasMovementForV14(fs,mp.playerId))break;
        var cur=_posV14FromStep(fs,mp.playerId);
        if(!cur)continue;
        _setPosV14(fs,mp.playerId,ep);
      }
    });
  }

  tk.steps[editingStepIdx]=snap;
  movementPaths=[];
  if(playback)playback.tk=taktikFilmer[editingTaktikIdx];

  showToast("Steg sparat!");
  cloudStatus("✅ Steg sparat","#4ae87a");
  renderEditSteps(tk);
});
document.getElementById("btn-taktikbar-save").addEventListener("click",function(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];if(tk.dbId){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({name:tk.name,data:tk,folder:tk.folder||"Allm\u00e4nt"})}).then(function(){showToast("Film sparad!");cloudStatus("\u2705 Film sparad","#4ae87a");});}else{showToast("Film sparad!");cloudStatus("\u2705 Sparad lokalt","#4ae87a");}});
document.getElementById("btn-first").addEventListener("click",function(){if(!playback||playback.animating)return;movementPaths=[];selectedId=null;editingStepIdx=0;playback.stepIndex=0;restoreSnap(taktikFilmer[editingTaktikIdx]?taktikFilmer[editingTaktikIdx].steps[0]:playback.tk.steps[0]);render();updatePlaybar();updateEditStepUI_silent();});
document.getElementById("btn-next").addEventListener("click",function(){if(!playback||playback.animating)return;if(playback.stepIndex>=playback.tk.steps.length-1)return;var idx=playback.stepIndex+1;editingStepIdx=idx;animateToStep(idx);updateEditStepUI_silent();});
document.getElementById("btn-prev").addEventListener("click",function(){if(!playback||playback.animating)return;if(playback.stepIndex<=0)return;var idx=playback.stepIndex-1;editingStepIdx=idx;animateToStep(idx);updateEditStepUI_silent();});
document.getElementById("play-speed").addEventListener("change",function(){animSpeed=parseInt(this.value);});
function updatePlaybar(){if(!playback)return;var cur=playback.stepIndex,total=playback.tk.steps.length-1;document.getElementById("taktikbar-title").textContent=playback.tk.name;document.getElementById("play-counter").textContent=cur===0?"Start":cur+"/"+total;document.getElementById("btn-prev").style.opacity=cur>0?"1":"0.3";document.getElementById("btn-next").style.opacity=cur<total?"1":"0.3";renderPlayStepList();updateLandscapeStrip();updateFsPortraitNav();}
function renderPlayStepList(){if(!playback)return;var list=document.getElementById("taktik-list");list.innerHTML="";var tk=playback.tk;for(var i=0;i<tk.steps.length;i++){(function(idx){var isCur=playback.stepIndex===idx;var row=document.createElement("div");row.className="row";row.style.borderColor=isCur?"#4ae87a":"#2d4a35";var num=document.createElement("span");num.style.cssText="font-weight:900;font-size:0.85rem;color:#4ae87a;min-width:20px";num.textContent=idx===0?"\u25ba":String(idx);var lbl=document.createElement("span");lbl.className="row-name";lbl.textContent=tk.steps[idx]&&tk.steps[idx].label?tk.steps[idx].label:(idx===0?"Startl\u00e4ge":"Steg "+idx);var jmp=document.createElement("button");jmp.className="sa "+(isCur?"save2":"jump");jmp.textContent=isCur?"Aktiv":"Hoppa";if(!isCur)jmp.addEventListener("click",function(){if(playback.animating)return;playback.stepIndex=idx;restoreSnap(tk.steps[idx]);render();updatePlaybar();});row.appendChild(num);row.appendChild(lbl);row.appendChild(jmp);list.appendChild(row);})(i);}}
function animateToStep(targetIdx){if(!playback)return;playback.animating=true;playback.stepIndex=targetIdx;updatePlaybar();var target=playback.tk.steps[targetIdx];var fromPlayers=players.map(function(p){return{id:p.id,x:p.x,y:p.y};});var fromBall={x:ball.x,y:ball.y};
  // Constant speed: measure path LENGTH along curves, not straight-line distance
  var _fromMvs=(targetIdx>0&&playback.tk.steps[targetIdx-1]&&playback.tk.steps[targetIdx-1].movementPaths)||[];
  function _pathLen(pts){var l=0;for(var _i=1;_i<pts.length;_i++){var _dx=pts[_i].x-pts[_i-1].x,_dy=pts[_i].y-pts[_i-1].y;l+=Math.sqrt(_dx*_dx+_dy*_dy);}return l;}
  var _maxLen=0;
  // Check movement path lengths
  for(var _mi=0;_mi<_fromMvs.length;_mi++){var _pl=_pathLen(_fromMvs[_mi].pts);if(_pl>_maxLen)_maxLen=_pl;}
  // If no movement paths, fall back to straight-line distances
  if(_maxLen===0){
    for(var _pi=0;_pi<fromPlayers.length;_pi++){
      var _fp=fromPlayers[_pi],_tp=null;
      for(var _j=0;_j<target.players.length;_j++)if(target.players[_j].id===_fp.id){_tp=target.players[_j];break;}
      if(_tp){var _d=Math.sqrt(Math.pow(_tp.x-_fp.x,2)+Math.pow(_tp.y-_fp.y,2));if(_d>_maxLen)_maxLen=_d;}
    }
    var _bd2=Math.sqrt(Math.pow(target.ball.x-fromBall.x,2)+Math.pow(target.ball.y-fromBall.y,2));
    if(_bd2>_maxLen)_maxLen=_bd2;
  }
  // Speed: animSpeed = time for 150px. Scale linearly with path length.
  var stepAnimSpeed=_maxLen>5?Math.round((_maxLen/150)*animSpeed):Math.round(animSpeed*0.3);
  var start=performance.now();function frame(now){var t=Math.min(1,(now-start)/stepAnimSpeed);var ease=t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;for(var i=0;i<players.length;i++){var fp=null,tp2=null;for(var j=0;j<fromPlayers.length;j++)if(fromPlayers[j].id===players[i].id){fp=fromPlayers[j];break;}for(var j=0;j<target.players.length;j++)if(target.players[j].id===players[i].id){tp2=target.players[j];break;}if(fp&&tp2){
          var mvPath=null;
          var fromStep=targetIdx>0?playback.tk.steps[targetIdx-1]:null;
          var fromMvs=(fromStep&&fromStep.movementPaths)||[];
          for(var k=0;k<fromMvs.length;k++){if(fromMvs[k].playerId===players[i].id){mvPath=fromMvs[k];break;}}
          if(mvPath&&mvPath.pts.length>1){
            // Per-player t: scale by this path's length vs maxLen
            var thisLen=_pathLen(mvPath.pts);
            var playerT=_maxLen>0?Math.min(1,t*(_maxLen/thisLen)):t;
            var playerEase=playerT<0.5?2*playerT*playerT:1-Math.pow(-2*playerT+2,2)/2;
            var nSeg=mvPath.pts.length-1;
            var pos=playerEase*nSeg;
            var seg=Math.min(Math.floor(pos),nSeg-1);
            players[i].x=mvPath.pts[seg].x+(mvPath.pts[seg+1].x-mvPath.pts[seg].x)*(pos-seg);
            players[i].y=mvPath.pts[seg].y+(mvPath.pts[seg+1].y-mvPath.pts[seg].y)*(pos-seg);
          } else {
            players[i].x=fp.x+(tp2.x-fp.x)*ease;
            players[i].y=fp.y+(tp2.y-fp.y)*ease;
          }
        }var g=svg.querySelector(".player-token[data-id='"+players[i].id+"']");if(g){var c=g.querySelector("circle"),tx=g.querySelector("text");if(c){c.setAttribute("cx",players[i].x);c.setAttribute("cy",players[i].y);}if(tx){tx.setAttribute("x",players[i].x);tx.setAttribute("y",players[i].y);if(document.body.classList.contains("landscape")&&!document.body.classList.contains("desktop"))tx.setAttribute("transform","rotate(90,"+players[i].x+","+players[i].y+")");else tx.removeAttribute("transform");}}}var ballMvPath=null;
      var fromStepB=targetIdx>0?playback.tk.steps[targetIdx-1]:null;
      var fromMvsB=(fromStepB&&fromStepB.movementPaths)||[];
      for(var kb=0;kb<fromMvsB.length;kb++){if(fromMvsB[kb].playerId==="ball"){ballMvPath=fromMvsB[kb];break;}}
      if(ballMvPath&&ballMvPath.pts.length>1){
        var bLen=_pathLen(ballMvPath.pts);
        var bT=_maxLen>0?Math.min(1,t*(_maxLen/bLen)):t;
        var bEase=bT<0.5?2*bT*bT:1-Math.pow(-2*bT+2,2)/2;
        var bSeg=ballMvPath.pts.length-1,bPos=bEase*bSeg,bS=Math.min(Math.floor(bPos),bSeg-1);
        ball.x=ballMvPath.pts[bS].x+(ballMvPath.pts[bS+1].x-ballMvPath.pts[bS].x)*(bPos-bS);
        ball.y=ballMvPath.pts[bS].y+(ballMvPath.pts[bS+1].y-ballMvPath.pts[bS].y)*(bPos-bS);
      } else {
        ball.x=fromBall.x+(target.ball.x-fromBall.x)*ease;
        ball.y=fromBall.y+(target.ball.y-fromBall.y)*ease;
      }var bg=svg.querySelector(".ball-token");if(bg){var bt=bg.querySelector("text"),bh=bg.querySelector("circle");if(bt){bt.setAttribute("x",ball.x);bt.setAttribute("y",ball.y);}if(bh){bh.setAttribute("cx",ball.x);bh.setAttribute("cy",ball.y);}}if(t<1){animFrame=requestAnimationFrame(frame);}else{
          var endMvs=(playback.tk.steps[targetIdx-1]&&playback.tk.steps[targetIdx-1].movementPaths)||[];
          if(endMvs.length){endMvs.forEach(function(mp){if(!mp.pts||!mp.pts.length)return;var ep=mp.pts[mp.pts.length-1];if(mp.playerId==="ball"){target.ball.x=ep.x;target.ball.y=ep.y;}else{var np=target.players.find(function(x){return x.id===mp.playerId;});if(np){np.x=ep.x;np.y=ep.y;}}});}
          restoreSnap(target);render();if(playback){playback.animating=false;var loopOn=document.getElementById("play-loop").checked;if(loopOn&&targetIdx>=playback.tk.steps.length-1){setTimeout(function(){if(!playback)return;restoreSnap(playback.tk.steps[0]);render();playback.stepIndex=0;updatePlaybar();setTimeout(function(){if(playback)animateToStep(1);},600);},800);}}}};animFrame=requestAnimationFrame(frame);}
function buildState(){return{format:format,homeColor:homeColor,awayColor:awayColor,displayMode:displayMode,players:players.map(function(p){return{id:p.id,team:p.team,number:p.number,name:p.name,x:p.x,y:p.y};}),ball:{x:ball.x,y:ball.y},arrows:arrows.map(function(a){return{id:a.id,x1:a.x1,y1:a.y1,x2:a.x2,y2:a.y2};}),labels:labels.map(function(l){return{id:l.id,x:l.x,y:l.y,text:l.text,size:l.size};})};}
function applyState(s){format=s.format||11;homeColor=s.homeColor||"#e8c84a";awayColor=s.awayColor||"#e84a4a";displayMode=s.displayMode||"number";document.getElementById("fmt-sel").value=String(format);players=(s.players||[]).map(function(p){return{id:p.id,team:p.team,number:p.number,name:p.name||"",x:p.x,y:p.y};});ball=s.ball||{x:W/2,y:H/2};arrows=(s.arrows||[]).map(function(a){return{id:a.id,x1:a.x1,y1:a.y1,x2:a.x2,y2:a.y2};});labels=(s.labels||[]).map(function(l){return{id:l.id,x:l.x,y:l.y,text:l.text,size:l.size||13};});buildFormationBtns();render();}
document.getElementById("btn-export").addEventListener("click",function(){var data={savedFormations:savedFormations,current:buildState()};var url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));var a=document.createElement("a");a.href=url;a.download="taktik.json";a.click();URL.revokeObjectURL(url);});
document.getElementById("btn-import-btn").addEventListener("click",function(){document.getElementById("btn-import").click();});
document.getElementById("btn-import").addEventListener("change",function(e){var file=e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){try{var data=JSON.parse(ev.target.result);if(data.savedFormations)savedFormations=data.savedFormations;if(data.current)applyState(data.current);renderSavesList();}catch(err){alert("Kunde inte l\u00e4sa filen.");}};reader.readAsText(file);e.target.value="";});
document.getElementById("btn-export-taktik").addEventListener("click",function(){var data={taktikFilmer:taktikFilmer};var url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));var a=document.createElement("a");a.href=url;a.download="taktikfilm.json";a.click();URL.revokeObjectURL(url);});
document.getElementById("btn-import-taktik-btn").addEventListener("click",function(){document.getElementById("btn-import-taktik").click();});
document.getElementById("btn-import-taktik").addEventListener("change",function(e){var file=e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){try{var data=JSON.parse(ev.target.result);if(data.taktikFilmer)taktikFilmer=data.taktikFilmer;renderTaktikList();}catch(err){alert("Kunde inte l\u00e4sa filen.");}};reader.readAsText(file);e.target.value="";});
/* v44: extra topbar-Spara som borttagen */
document.getElementById("btn-cloud-save").addEventListener("click",function(){var d=new Date();document.getElementById("save-name-inp").value="Uppst\u00e4llning "+d.getDate()+"/"+(d.getMonth()+1)+" "+d.getHours()+":"+("0"+d.getMinutes()).slice(-2);updateFolderSelect();document.getElementById("modal-savename").classList.remove("hidden");});
document.getElementById("btn-cloud-refresh").addEventListener("click",function(){cloudLoadSaves();cloudLoadTaktik();});
document.getElementById("savename-cancel").addEventListener("click",function(){document.getElementById("modal-savename").classList.add("hidden");});
document.getElementById("savename-ok").addEventListener("click",function(){var name=document.getElementById("save-name-inp").value.trim()||"Uppst\u00e4llning";document.getElementById("modal-savename").classList.add("hidden");cloudSaveWithName(name);});
function updateSaveButtons(){var hasActive=activeFormationId&&activeFormationName;var btn=document.getElementById("btn-save-over");if(btn){btn.style.display=hasActive?"":"none";btn.textContent="\uD83D\uDCBE Spara"+(activeFormationName?" \u201e"+activeFormationName+"\u201c":"");}}
document.getElementById("btn-save-over").addEventListener("click",function(){if(!activeFormationId)return;cloudStatus("Sparar...","#7aaa88");fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+activeFormationId,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({data:buildState()})}).then(function(r){return r.json();}).then(function(){cloudStatus("\u2705 Sparat: "+activeFormationName,"#4ae87a");showToast("Sparat!");cloudLoadSaves();}).catch(function(err){cloudStatus("\u274c Fel: "+err.message,"#e84a4a");});});
document.getElementById("btn-new-folder").addEventListener("click",function(){document.getElementById("new-folder-inp").value="";document.getElementById("modal-new-folder").classList.remove("hidden");setTimeout(function(){document.getElementById("new-folder-inp").focus();},100);});
document.getElementById("new-folder-cancel").addEventListener("click",function(){document.getElementById("modal-new-folder").classList.add("hidden");});
document.getElementById("new-folder-ok").addEventListener("click",function(){var name=document.getElementById("new-folder-inp").value.trim();if(name){if(pendingFolderTarget==="taktik"){var fullName=pendingFolderParent?pendingFolderParent+"/"+name:name;if(taktikFolders.indexOf(fullName)===-1)taktikFolders.push(fullName);pendingFolderParent=null;renderTaktikList();}else{if(folders.indexOf(name)===-1)folders.push(name);updateFolderSelect();var sel=document.getElementById("folder-select");if(sel)sel.value=name;if(pendingMoveAfterCreate&&movingId){cloudMoveToFolder(movingId,name);movingId=null;pendingMoveAfterCreate=false;}renderSavesList();}}document.getElementById("modal-new-folder").classList.add("hidden");});
document.getElementById("new-folder-inp").addEventListener("keydown",function(e){if(e.key==="Enter")document.getElementById("new-folder-ok").click();});
function cloudSaveWithName(name){cloudStatus("Sparar...","#7aaa88");var folderSel=document.getElementById("folder-select");var folder=folderSel?folderSel.value:"Allm\u00e4nt";var body=JSON.stringify({name:name,data:buildState(),type:"uppstallning",folder:folder});fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{method:"POST",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:body}).then(function(r){return r.text();}).then(function(text){try{var data=JSON.parse(text);if(Array.isArray(data)&&data[0]&&data[0].id){cloudStatus("\u2705 Sparat: "+name,"#4ae87a");showToast("Sparat!");cloudLoadSaves();}else cloudStatus("\u274c Fel: "+text.substring(0,80),"#e84a4a");}catch(e){cloudStatus("\u274c Parse-fel: "+e.message,"#e84a4a");}}).catch(function(err){cloudStatus("\u274c Fel: "+err.message,"#e84a4a");}); }
function cloudLoadSaves(){cloudStatus("Laddar...","#7aaa88");fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.uppstallning&order=folder.asc,id.desc",{headers:supaHeaders()}).then(function(r){return r.json();}).then(function(data){if(Array.isArray(data)){savedFormations=data.filter(function(row){return row.type==="uppstallning";}).map(function(row){return{id:row.id,name:row.name,state:row.data,folder:row.folder||"Allm\u00e4nt"};});var seen={};folders=["Allm\u00e4nt"];for(var i=0;i<savedFormations.length;i++){var f=savedFormations[i].folder;if(f&&!seen[f]){seen[f]=true;if(f!=="Allm\u00e4nt")folders.push(f);}}cloudStatus(data.length+" uppst\u00e4llningar \u2705","#4ae87a");showToast(data.length+" uppst\u00e4llningar laddade");renderSavesList();updateFolderSelect();}else cloudStatus("\u274c Fel","#e84a4a");}).catch(function(err){cloudStatus("\u274c Fel: "+err.message,"#e84a4a");}); }
function cloudDelete(id){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+id,{method:"DELETE",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"})}).then(function(){cloudLoadSaves();showToast("Raderat!");}).catch(function(err){cloudStatus("\u274c Raderingsfel: "+err.message,"#e84a4a");});}
function cloudSaveTaktik(tk){
  if(!tk)return;
  if(tk._readOnly || (typeof isReadOnlyFileV10==="function" && isReadOnlyFileV10(tk))){
    showToast("Filen är skrivskyddad. Kopiera den först.",false);
    return;
  }
  if(!tk.steps||tk.steps.length<2){
    showToast("Lägg till minst ett steg innan du sparar filmen",false);
    cloudStatus("⚠️ Minst ett steg krävs för att spara taktikfilm","#e8c84a");
    return;
  }
  if(!tk.folder)tk.folder="Taktik";
  delete tk._isDraft;

  function patchExisting(id){
    tk.dbId=id;
    var payload=(typeof addMetaToData==="function"?addMetaToData(tk):tk);
    return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+id,{
      method:"PATCH",
      headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
      body:JSON.stringify({name:tk.name,data:payload,type:"taktikfilm",folder:tk.folder})
    }).then(function(r){return r.json();}).then(function(){
      cloudStatus("✅ Film uppdaterad: "+tk.name,"#4ae87a");
      showToast("Film sparad!");
      setTimeout(function(){cloudLoadTaktik();},300);
    });
  }

  if(tk.dbId){
    patchExisting(tk.dbId).catch(function(err){cloudStatus("❌ Fel: "+err.message,"#e84a4a");showToast("Kunde inte spara film",false);});
    return;
  }

  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.taktikfilm&name=eq."+encodeURIComponent(tk.name)+"&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(existing){
      if(Array.isArray(existing)){
        var same=existing.find(function(row){
          var d=row.data||{};
          return row.id && d.steps && d.steps.length>=2;
        });
        if(same&&same.id)return patchExisting(same.id);
      }
      var payload=(typeof addMetaToData==="function"?addMetaToData(tk):tk);
      return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{
        method:"POST",
        headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
        body:JSON.stringify({name:tk.name,data:payload,type:"taktikfilm",folder:tk.folder})
      }).then(function(r){return r.json();}).then(function(data){
        if(data&&data[0]&&data[0].id){
          tk.dbId=data[0].id;
          cloudStatus("✅ Film sparad: "+tk.name,"#4ae87a");
          showToast("Film sparad!");
          setTimeout(function(){cloudLoadTaktik();},300);
        }else{
          var errMsg=(data&&data.message)?data.message:"Kunde inte spara film";
          cloudStatus("❌ "+errMsg,"#e84a4a");
          showToast(errMsg,false);
        }
      });
    })
    .catch(function(err){cloudStatus("❌ Anslutningsfel: "+err.message,"#e84a4a");showToast("Kunde inte spara film",false);});
}
function cloudLoadTaktik(){
  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.taktikfilm&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){
      if(!Array.isArray(data))return;
      var byKey={};
      data.filter(function(row){return row.type==="taktikfilm";}).forEach(function(row){
        var tk=row.data||{};
        if(!tk.steps||tk.steps.length<2)return;
        tk.dbId=row.id;
        if(!tk.folder)tk.folder=row.folder||"Taktik";
        var meta=tk._meta||{};
        var owner=meta.ownerId||"legacy";
        var key=owner+"::"+((row.name||tk.name||"").trim().toLowerCase()||("id:"+row.id));
        if(!byKey[key])byKey[key]=tk;
      });
      taktikFilmer=Object.keys(byKey).map(function(k){return byKey[k];});
      var tfseen={};taktikFolders=["Taktik","Träning"];tfseen["Taktik"]=true;tfseen["Träning"]=true;
      taktikFilmer.forEach(function(tk){if(tk.folder&&!tfseen[tk.folder]){tfseen[tk.folder]=true;taktikFolders.push(tk.folder);}});
      renderTaktikList();
      cloudStatus(taktikFilmer.length+" taktikfilmer laddade","#4ae87a");
    }).catch(function(err){cloudStatus("❌ Fel: "+err.message,"#e84a4a");});
}
document.getElementById("btn-copy-drawings").addEventListener("click",function(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];var nextIdx=editingStepIdx+1;if(nextIdx>=tk.steps.length){showToast("Inget n\u00e4sta steg");return;}saveTaktikUndo();var cur=tk.steps[editingStepIdx];var next=tk.steps[nextIdx];next.arrows=JSON.parse(JSON.stringify(cur.arrows||[]));next.labels=JSON.parse(JSON.stringify(cur.labels||[]));next.freehandPaths=JSON.parse(JSON.stringify(cur.freehandPaths||[]));next.zones=JSON.parse(JSON.stringify(cur.zones||[]));showToast("Ritningar kopierade till steg "+(nextIdx===0?"start":nextIdx)+"!");cloudStatus("\u2705 Ritningar kopierade","#4ae87a");});
document.getElementById("btn-copy-step").addEventListener("click",function(){if(editingTaktikIdx===null)return;copiedStep=JSON.parse(JSON.stringify(taktikFilmer[editingTaktikIdx].steps[editingStepIdx]));showToast("Steg kopierat!");document.getElementById("btn-paste-step").style.opacity="1";});
document.getElementById("btn-paste-step").addEventListener("click",function(){if(!copiedStep||editingTaktikIdx===null)return;saveTaktikUndo();var tk=taktikFilmer[editingTaktikIdx];var paste=JSON.parse(JSON.stringify(copiedStep));tk.steps.splice(editingStepIdx+1,0,paste);editingStepIdx++;updateEditStepUI();showToast("Steg inklistrat!");});
document.addEventListener("keydown",function(e){if((e.metaKey||e.ctrlKey)&&e.key==="z"&&!e.shiftKey&&editingTaktikIdx!==null){taktikUndo();}if((e.metaKey||e.ctrlKey)&&(e.key==="y"||(e.key==="z"&&e.shiftKey))&&editingTaktikIdx!==null){taktikRedo();}});
var favorites={};try{var _fav=localStorage.getItem("taktik_favorites");if(_fav)favorites=JSON.parse(_fav);}catch(e){}
var _defaultFormat=11,_defaultFormation="4-4-2";
try{var _df=localStorage.getItem("taktik_default_formation");if(_df){var _dfo=JSON.parse(_df);_defaultFormat=_dfo.format||11;_defaultFormation=_dfo.formation||"4-4-2";}}catch(e){}
function getDefaultFormat(){return _defaultFormat;}
function getDefaultFormation(){return _defaultFormation;}
function setDefaultFormation(fmt,formation){_defaultFormat=fmt;_defaultFormation=formation;try{localStorage.setItem("taktik_default_formation",JSON.stringify({format:fmt,formation:formation}));}catch(e){}showToast("\u2605 Standard: "+formation+" ("+fmt+"v"+fmt+") sparad!");}
function toggleFavorite(dbId){if(favorites[dbId])delete favorites[dbId];else favorites[dbId]=true;try{localStorage.setItem("taktik_favorites",JSON.stringify(favorites));}catch(e){}renderTaktikList();}
var _pendingColorPlayerId=null;
var _colorSwatches=["#ffdd44","#e84a4a","#4ae8e8","#4ae87a","#a78bfa","#f97316","#ffffff","#111111"];
function openPlayerColor(pid){_pendingColorPlayerId=pid;var cont=document.getElementById("player-color-swatches");cont.innerHTML="";_colorSwatches.forEach(function(c){var sw=document.createElement("button");sw.style.cssText="width:36px;height:36px;border-radius:50%;background:"+c+";border:3px solid "+(playerColors[pid]===c?"#4ae87a":"#2d4a35")+";cursor:pointer;margin:2px";sw.addEventListener("click",function(){playerColors[pid]=c;document.getElementById("modal-player-color").classList.add("hidden");render();showToast("F\u00e4rg \u00e4ndrad!");});cont.appendChild(sw);});document.getElementById("modal-player-color").classList.remove("hidden");}
document.getElementById("player-color-reset").addEventListener("click",function(){if(_pendingColorPlayerId)delete playerColors[_pendingColorPlayerId];document.getElementById("modal-player-color").classList.add("hidden");render();});
document.getElementById("player-color-close").addEventListener("click",function(){document.getElementById("modal-player-color").classList.add("hidden");});
var _lastTap={id:null,time:0};
document.getElementById("btn-backup").addEventListener("click",function(){document.getElementById("modal-backup").classList.remove("hidden");});
document.getElementById("backup-cancel").addEventListener("click",function(){document.getElementById("modal-backup").classList.add("hidden");});
document.getElementById("backup-download").addEventListener("click",function(){var data={savedFormations:savedFormations,taktikFilmer:taktikFilmer,exported:new Date().toISOString()};var blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download="taktiktavla-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(url);document.getElementById("modal-backup").classList.add("hidden");showToast("Backup nedladdad!");});
document.getElementById("bench-size-up").addEventListener("click",function(){matchNameSize=Math.min(20,matchNameSize+1);document.getElementById("bench-size-lbl").textContent=matchNameSize;render();});
document.getElementById("bench-size-down").addEventListener("click",function(){matchNameSize=Math.max(7,matchNameSize-1);document.getElementById("bench-size-lbl").textContent=matchNameSize;render();});
document.getElementById("bench-exit-btn").addEventListener("click",function(){matchRoster=[];matchAssignments={};matchVariants=[];activeVariantIdx=0;matchGoals={home:0,away:0};updateGoalDisplay();window._editingMatchId=null;halfMode=0;updateViewBox();players.filter(function(p){return p.team==="home";}).forEach(function(p){p.name="";p.number=0;});render();document.getElementById("bench-bar").classList.remove("active");var go2=document.getElementById("goal-overlay");if(go2)go2.style.display="none";showToast("Laguppst\u00e4llning avslutad");});
document.getElementById("bench-add-var").addEventListener("click",function(){
  // Save current state as new variant
  saveCurrentVariant();
  var newVariant={
    namn:"Uppst. "+(matchVariants.length+1),
    assignments:JSON.parse(JSON.stringify(matchAssignments)),
    playerStates:players.filter(function(p){return p.team==="home";}).map(function(p){return{id:p.id,number:p.number,name:p.name};})
  };
  matchVariants.push(newVariant);
  activeVariantIdx=matchVariants.length-1;
  // Reset assignments for new variant
  matchAssignments={};
  players.filter(function(p){return p.team==="home";}).forEach(function(p){p.name="";p.number=0;});
  render();renderBench();updateVariantUI();
  showToast("Ny variant skapad!");
});

function updateGoalDisplay(){
  var h=document.getElementById("bench-goal-home");
  var a=document.getElementById("bench-goal-away");
  if(h)h.textContent=matchGoals.home;
  if(a)a.textContent=matchGoals.away;
}
var bprev=document.getElementById("bench-prev-var");
var bnext=document.getElementById("bench-next-var");
var badd=document.getElementById("bench-add-var");
var bsave=document.getElementById("bench-save-btn");
var bclear=document.getElementById("bench-clear-btn");
bprev.addEventListener("click",function(){
  if(matchVariants.length===0||activeVariantIdx<=0)return;
  saveCurrentVariant();
  activeVariantIdx--;
  loadVariant(activeVariantIdx);
});
bnext.addEventListener("click",function(){
  if(matchVariants.length===0||activeVariantIdx>=matchVariants.length-1)return;
  saveCurrentVariant();
  activeVariantIdx++;
  loadVariant(activeVariantIdx);
});
function saveCurrentVariant(){
  if(matchVariants.length===0)return;
  matchVariants[activeVariantIdx].assignments=JSON.parse(JSON.stringify(matchAssignments));
  matchVariants[activeVariantIdx].format=format;
  var activeFormBtn=document.querySelector("#formation-btns .btn.on");
  matchVariants[activeVariantIdx].formation=activeFormBtn?activeFormBtn.textContent:"";
  matchVariants[activeVariantIdx].playerStates=players.map(function(p){return{id:p.id,team:p.team,number:p.number,name:p.name,x:p.x,y:p.y};});
}
function loadVariant(idx){
  var v=matchVariants[idx];
  if(!v)return;
  matchAssignments=JSON.parse(JSON.stringify(v.assignments||{}));
  // Restore format + formation if saved
  if(v.format&&v.format!==format){
    format=v.format;
    document.getElementById("fmt-sel").value=String(format);
    buildFormationBtns();
  }
  if(v.formation){
    var btns=document.querySelectorAll("#formation-btns .btn");
    for(var i=0;i<btns.length;i++){btns[i].classList.toggle("on",btns[i].textContent===v.formation);}
  }
  // Restore ALL player positions from saved state
  if(v.playerStates&&v.playerStates.length){
    players=v.playerStates.map(function(ps){return{id:ps.id,team:ps.team||( ps.id.indexOf("h")===0?"home":"away"),number:ps.number,name:ps.name||"",x:ps.x,y:ps.y};});
  } else {
    players.filter(function(p){return p.team==="home";}).forEach(function(p){p.number=0;p.name="";});
  }
  render();renderBench();updateVariantUI();
}
function updateVariantUI(){
  var lbl=document.getElementById("bench-var-label");
  var prev=bprev;
  var next=bnext;
  if(!lbl)return;
  var total=matchVariants.length||1;
  var cur=matchVariants.length===0?1:activeVariantIdx+1;
  lbl.textContent=matchVariants.length===0?"Uppst. 1/1":(matchVariants[activeVariantIdx].namn||("Uppst. "+cur))+"/"+total;
  if(prev)prev.style.opacity=activeVariantIdx>0?"1":"0.3";
  if(next)next.style.opacity=activeVariantIdx<matchVariants.length-1?"1":"0.3";
}
bclear.addEventListener("click",function(){
  matchAssignments={};
  players.filter(function(p){return p.team==="home";}).forEach(function(p){p.name="";p.number=0;});
  render();renderBench();
  showToast("Alla spelare \u00e5terlagda till avbytare");
});
(function(){
  var bcv=document.getElementById("bench-copy-var");
  var bpv=document.getElementById("bench-paste-var");
  if(!bcv||!bpv)return;
  bcv.addEventListener("click",function(){
  saveCurrentVariant();
  if(matchVariants.length===0){
    _copiedVariant={assignments:JSON.parse(JSON.stringify(matchAssignments)),playerStates:players.filter(function(p){return p.team==="home";}).map(function(p){return{id:p.id,team:p.team,number:p.number,name:p.name,x:p.x,y:p.y};})};
  } else {
    _copiedVariant=JSON.parse(JSON.stringify(matchVariants[activeVariantIdx]));
  }
  bpv.style.opacity="1";
  showToast("Uppst\u00e4llning kopierad!");
});
bpv.addEventListener("click",function(){
  if(!_copiedVariant)return;
  // If no variants yet, create one first
  if(matchVariants.length===0){
    matchVariants.push({namn:"Uppst. 1",format:format,formation:"",assignments:{},playerStates:[]});
    activeVariantIdx=0;
  }
  // Paste into current variant
  matchVariants[activeVariantIdx].assignments=JSON.parse(JSON.stringify(_copiedVariant.assignments||{}));
  matchVariants[activeVariantIdx].playerStates=JSON.parse(JSON.stringify(_copiedVariant.playerStates||[]));
  loadVariant(activeVariantIdx);
  showToast("Uppst\u00e4llning inklistrad!");
});
})();
(function(){
  var ghp=document.getElementById("bench-goal-home-plus");
  var ghm=document.getElementById("bench-goal-home-minus");
  var gap=document.getElementById("bench-goal-away-plus");
  var gam=document.getElementById("bench-goal-away-minus");
  if(ghp)ghp.addEventListener("click",function(){matchGoals.home++;updateGoalDisplay();});
  if(ghm)ghm.addEventListener("click",function(){if(matchGoals.home>0){matchGoals.home--;updateGoalDisplay();}});
  if(gap)gap.addEventListener("click",function(){matchGoals.away++;updateGoalDisplay();});
  if(gam)gam.addEventListener("click",function(){if(matchGoals.away>0){matchGoals.away--;updateGoalDisplay();}});
})();
bsave.addEventListener("click",function(){
  // Save current variant state then open match save dialog
  if(matchVariants.length===0&&Object.keys(matchAssignments).length>0){
    matchVariants=[{namn:"Uppst. 1",format:format,formation:(document.querySelector("#formation-btns .btn.on")||{}).textContent||"",assignments:JSON.parse(JSON.stringify(matchAssignments)),playerStates:players.map(function(p){return{id:p.id,team:p.team,number:p.number,name:p.name,x:p.x,y:p.y};})}];
    activeVariantIdx=0;
  } else if(matchVariants.length>0){
    saveCurrentVariant();
  }
  // Switch to match tab and trigger save
  document.querySelectorAll("[data-lag]").forEach(function(b){b.classList.toggle("on",b.getAttribute("data-lag")==="match");});
  document.getElementById("lag-trupp").style.display="none";
  document.getElementById("lag-match").style.display="";
  document.getElementById("lag-statistik").style.display="none";
  var lagSparade=document.getElementById("lag-sparade");if(lagSparade)lagSparade.style.display="none";
  document.getElementById("btn-spara-match").click();
});
var _draggingBenchPlayer=null;
var _benchDragEl=null;
var _copiedVariant=null;
var matchVariants=[]; // [{namn:"Uppst. 1", assignments:{}, playerStates:[{id,number,name}]}]
var activeVariantIdx=0;

function renderBench(){
  var bar=document.getElementById("bench-bar");var cont=document.getElementById("bench-players");
  if(!bar||!cont)return;
  if(!matchRoster.length){bar.classList.remove("active");return;}
  var assignedTids={};Object.values(matchAssignments).forEach(function(tid){assignedTids[tid]=true;});
  var bench=matchRoster.slice().sort(function(a,b){return a.namn.localeCompare(b.namn,"sv");}).filter(function(sp){return !assignedTids[sp.id];});
  cont.innerHTML="";
  bench.forEach(function(sp){
    var div=document.createElement("div");div.className="bench-player";
    div.style.cursor="grab";div.style.touchAction="none";
    var nr=document.createElement("span");nr.className="bench-nr";nr.textContent="#"+sp.nr;
    var nm=document.createElement("span");nm.className="bench-name";nm.textContent=sp.namn;
    div.appendChild(nr);div.appendChild(nm);cont.appendChild(div);
    div.addEventListener("touchstart",function(ev){
      ev.preventDefault();ev.stopPropagation();
      _draggingBenchPlayer=sp;
      // Create floating drag element
      if(_benchDragEl)_benchDragEl.remove();
      _benchDragEl=document.createElement("div");
      _benchDragEl.style.cssText="position:fixed;z-index:9999;pointer-events:none;background:#4ae87a;color:#0a1a0d;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:0.8rem;transform:translate(-50%,-50%)";
      _benchDragEl.textContent="#"+sp.nr;
      document.body.appendChild(_benchDragEl);
      var t=ev.touches[0];
      _benchDragEl.style.left=t.clientX+"px";_benchDragEl.style.top=t.clientY+"px";
      function onMove(ev2){
        ev2.preventDefault();
        var t2=ev2.touches[0];
        _benchDragEl.style.left=t2.clientX+"px";_benchDragEl.style.top=t2.clientY+"px";
        // Highlight nearest player circle
        highlightNearestPlayer(t2.clientX,t2.clientY);
      }
      function onEnd(ev2){
        window.removeEventListener("touchmove",onMove);
        window.removeEventListener("touchend",onEnd);
        if(_benchDragEl){_benchDragEl.remove();_benchDragEl=null;}
        clearPlayerHighlights();
        // Find nearest home player to drop on
        if(ev2.changedTouches.length){
          var t3=ev2.changedTouches[0];
          var pid=findNearestHomePitchPlayer(t3.clientX,t3.clientY,60);
          if(pid&&_draggingBenchPlayer){
            assignPlayerToPosition(pid,_draggingBenchPlayer.id);
            showToast("#"+_draggingBenchPlayer.nr+" "+_draggingBenchPlayer.namn+" placerad!");
          }
        }
        _draggingBenchPlayer=null;
      }
      window.addEventListener("touchmove",onMove,{passive:false});
      window.addEventListener("touchend",onEnd);
    },{passive:false});
  });
  bar.classList.toggle("active",matchRoster.length>0);
  var go=document.getElementById("goal-overlay");
  if(go)go.style.display=matchRoster.length>0?"flex":"none";
  updateVariantUI();
}

function highlightNearestPlayer(clientX,clientY){
  clearPlayerHighlights();
  var pid=findNearestHomePitchPlayer(clientX,clientY,50);
  if(pid){
    var el=svg.querySelector(".player-token[data-id='"+pid+"']");
    if(el){var c=el.querySelector("circle");if(c)c.setAttribute("stroke","#4ae87a");}
  }
}
function clearPlayerHighlights(){
  var tokens=svg.querySelectorAll(".player-token circle");
  for(var i=0;i<tokens.length;i++){tokens[i].setAttribute("stroke",daylightMode?"rgba(0,0,0,0.4)":"#fff");}
}
function findNearestHomePitchPlayer(clientX,clientY,maxDist){
  var pt=svgPt(clientX,clientY);
  // maxDist is in SVG units (0-400 x 0-600 space), use 50 as generous threshold
  var threshold=50*50;
  var best=null,bestDist=threshold;
  for(var i=0;i<players.length;i++){
    if(players[i].team!=="home")continue;
    var dx=players[i].x-pt.x,dy=players[i].y-pt.y;
    var dist=dx*dx+dy*dy;
    if(dist<bestDist){bestDist=dist;best=players[i].id;}
  }
  return best;
}
function getAssignedTruppIds(){var assigned={};Object.values(matchAssignments).forEach(function(tid){assigned[tid]=true;});return assigned;}
function openPlayerPicker(pitchPlayerId){if(!matchRoster.length)return;assigningPlayerId=pitchPlayerId;var assigned=getAssignedTruppIds();var list=document.getElementById("player-picker-list");list.innerHTML="";var available=matchRoster.slice().sort(function(a,b){return a.namn.localeCompare(b.namn,"sv");}).filter(function(sp){return !assigned[sp.id]||(matchAssignments[pitchPlayerId]===sp.id);});if(!available.length){list.innerHTML="<span style=\"color:#7aaa88;font-size:0.85rem\">Alla spelare placerade<\/span>";}available.forEach(function(sp){var isCurrent=matchAssignments[pitchPlayerId]===sp.id;var btn=document.createElement("button");btn.className="btn"+(isCurrent?" on":"");btn.style.cssText="width:100%;text-align:left;padding:8px 12px;font-size:0.85rem";btn.innerHTML="<b style=\"color:#4ae87a\">#"+sp.nr+"<\/b> "+sp.namn;btn.addEventListener("click",function(){assignPlayerToPosition(pitchPlayerId,sp.id);document.getElementById("modal-player-picker").classList.add("hidden");assigningPlayerId=null;});list.appendChild(btn);});document.getElementById("modal-player-picker").classList.remove("hidden");}
function assignPlayerToPosition(pitchPlayerId,truppId){Object.keys(matchAssignments).forEach(function(pid){if(matchAssignments[pid]===truppId&&pid!==pitchPlayerId)delete matchAssignments[pid];});matchAssignments[pitchPlayerId]=truppId;var sp=matchRoster.find(function(x){return x.id===truppId;});var p=players.find(function(x){return x.id===pitchPlayerId;});if(sp&&p){p.number=sp.nr;p.name=sp.namn;}render();renderBench();}
document.getElementById("player-picker-cancel").addEventListener("click",function(){document.getElementById("modal-player-picker").classList.add("hidden");assigningPlayerId=null;});
document.getElementById("player-picker-clear").addEventListener("click",function(){if(assigningPlayerId){delete matchAssignments[assigningPlayerId];var p=players.find(function(x){return x.id===assigningPlayerId;});if(p){p.number=0;p.name="";}render();renderBench();}document.getElementById("modal-player-picker").classList.add("hidden");assigningPlayerId=null;});
function openShareTaktik(tk){document.getElementById("share-link-inp").value="Genererar...";document.getElementById("share-status").textContent="";document.getElementById("modal-share").classList.remove("hidden");if(tk.dbId){var url=window.location.origin+window.location.pathname+"?share="+tk.dbId;document.getElementById("share-link-inp").value=url;document.getElementById("share-status").textContent="Permanent l\u00e4nk (l\u00e4sbar f\u00f6r alla med l\u00e4nken)";}else{document.getElementById("share-status").textContent="Spara filmen f\u00f6rst f\u00f6r att f\u00e5 en l\u00e4nk";document.getElementById("share-link-inp").value="";}}
document.getElementById("share-copy-btn").addEventListener("click",function(){var inp=document.getElementById("share-link-inp");if(!inp.value)return;inp.select();try{navigator.clipboard.writeText(inp.value).then(function(){showToast("L\u00e4nk kopierad!");});}catch(e){document.execCommand("copy");showToast("L\u00e4nk kopierad!");}});
document.getElementById("share-close-btn").addEventListener("click",function(){document.getElementById("modal-share").classList.add("hidden");});
try{document.querySelectorAll("[data-lag]").forEach(function(btn){btn.addEventListener("click",function(){var target=this.getAttribute("data-lag");document.querySelectorAll("[data-lag]").forEach(function(b){b.classList.toggle("on",b.getAttribute("data-lag")===target);});document.getElementById("lag-trupp").style.display=target==="trupp"?"":"none";document.getElementById("lag-match").style.display=target==="match"?"":"none";document.getElementById("lag-statistik").style.display=target==="statistik"?"":"none";var lagSparade=document.getElementById("lag-sparade");if(lagSparade)lagSparade.style.display=target==="sparade"?"":"none";if(target==="match")renderMatchTruppList();if(target==="statistik"){renderStatistik();document.getElementById("bottompanel").classList.add("expanded");}else if(target==="sparade"){renderSparadeMatcherList();document.getElementById("bottompanel").classList.add("expanded");}else{document.getElementById("bottompanel").classList.remove("expanded");}});});
function saveTrupp(){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.trupp",{headers:supaHeaders()}).then(function(r){return r.json();}).then(function(data){if(data&&data[0]){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+data[0].id,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({data:{trupp:trupp}})});}else{fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{method:"POST",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({name:"trupp",data:{trupp:trupp},type:"trupp",folder:"Allm\u00e4nt"})});} });}
function loadTrupp(){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.trupp",{headers:supaHeaders()}).then(function(r){return r.json();}).then(function(data){if(data&&data[0]&&data[0].data&&data[0].data.trupp)trupp=data[0].data.trupp;renderTruppList();}).catch(function(){});}
function loadMatcher(){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.match&order=name.desc",{headers:supaHeaders()}).then(function(r){return r.json();}).then(function(data){if(data&&Array.isArray(data))matcher=data.map(function(row){var m=row.data;m.dbId=row.id;return m;});renderStatistik();}).catch(function(){});}
function renderTruppList(){var list=document.getElementById("trupp-list");if(!list)return;list.innerHTML="";var sorted=trupp.slice().sort(function(a,b){var ca=getPlayerMatchCount(a.id),cb=getPlayerMatchCount(b.id);return ca-cb||a.namn.localeCompare(b.namn,"sv");});if(!sorted.length){list.innerHTML="<span style=\"color:#7aaa88;font-size:0.8rem\">Inga spelare i truppen<\/span>";return;}sorted.forEach(function(sp){var row=document.createElement("div");row.className="row";var nr=document.createElement("span");nr.style.cssText="font-weight:900;color:#4ae87a;min-width:24px;font-size:0.85rem";nr.textContent="#"+sp.nr;var nm=document.createElement("span");nm.className="row-name";nm.textContent=sp.namn;var ed=document.createElement("button");ed.className="sa";ed.style.cssText="color:#e8c84a;border-color:#e8c84a";ed.textContent="\u270f";var dl=document.createElement("button");dl.className="sa del";dl.textContent="\u00d7";ed.addEventListener("click",function(){document.getElementById("ny-spelare-nr").value=sp.nr;document.getElementById("ny-spelare-namn").value=sp.namn;trupp=trupp.filter(function(x){return x.id!==sp.id;});renderTruppList();saveTrupp();});dl.addEventListener("click",function(){trupp=trupp.filter(function(x){return x.id!==sp.id;});renderTruppList();saveTrupp();showToast(sp.namn+" borttagen");});row.appendChild(nr);row.appendChild(nm);row.appendChild(ed);row.appendChild(dl);list.appendChild(row);});}
document.getElementById("btn-add-trupp").addEventListener("click",function(){var nr=parseInt(document.getElementById("ny-spelare-nr").value)||0;var namn=document.getElementById("ny-spelare-namn").value.trim();if(!namn)return;trupp.push({id:"sp"+Date.now(),nr:nr,namn:namn});document.getElementById("ny-spelare-nr").value="";document.getElementById("ny-spelare-namn").value="";renderTruppList();saveTrupp();showToast(namn+" tillagd!");});
document.getElementById("ny-spelare-namn").addEventListener("keydown",function(e){if(e.key==="Enter")document.getElementById("btn-add-trupp").click();});
document.getElementById("btn-ny-match").addEventListener("click",function(){matchSelections={};var d=new Date();document.getElementById("match-datum").value=d.toISOString().slice(0,10);document.getElementById("match-motstand").value="";window._editingMatchId=null;renderMatchTruppList();showToast("Ny match!");});
function getPlayerMatchCount(truppId){var from=document.getElementById("stat-from")?document.getElementById("stat-from").value:"";var to=document.getElementById("stat-to")?document.getElementById("stat-to").value:"";return matcher.filter(function(m){if(from&&m.datum<from)return false;if(to&&m.datum>to)return false;return(m.startade||[]).indexOf(truppId)>=0||(m.avbytare||[]).indexOf(truppId)>=0;}).length;}
function renderMatchTruppList(){var list=document.getElementById("match-trupp-list");if(!list)return;list.innerHTML="";var nSelected=Object.values(matchSelections).filter(function(v){return v==="start";}).length;var counter=document.getElementById("match-counter");if(counter)counter.textContent=nSelected+" vald"+(nSelected===1?"":"a");var sorted=trupp.slice().sort(function(a,b){return(a.nr||0)-(b.nr||0);});if(!sorted.length){list.innerHTML="<span style=\"color:#7aaa88;font-size:0.8rem\">L\u00e4gg till spelare i truppen f\u00f6rst<\/span>";return;}sorted.forEach(function(sp){var sel=matchSelections[sp.id]||null;var row=document.createElement("div");row.className="row";row.style.padding="4px 8px";var nr=document.createElement("span");nr.style.cssText="font-weight:900;color:#4ae87a;min-width:24px;font-size:0.82rem";nr.textContent="#"+sp.nr;var nm=document.createElement("span");nm.style.cssText="flex:1;font-size:0.82rem";nm.textContent=sp.namn;var cnt=getPlayerMatchCount(sp.id);var cntEl=document.createElement("span");cntEl.style.cssText="font-size:0.68rem;color:#7aaa88;white-space:nowrap";cntEl.textContent=cnt+" mat.";var btnS=document.createElement("button");btnS.className="btn"+(sel==="start"?" on":"");btnS.style.cssText="padding:2px 7px;font-size:0.65rem";btnS.textContent="Start";btnS.addEventListener("click",function(){matchSelections[sp.id]=sel==="start"?null:"start";renderMatchTruppList();});row.appendChild(nr);row.appendChild(nm);row.appendChild(cntEl);row.appendChild(btnS);list.appendChild(row);});}
document.getElementById("btn-match-to-taktik").addEventListener("click",function(){var startade=trupp.filter(function(sp){return matchSelections[sp.id]==="start";});if(!startade.length){showToast("V\u00e4lj startspelare f\u00f6rst!");return;}matchRoster=startade.slice();
  matchAssignments={};
  matchVariants=[];
  activeVariantIdx=0;
  // Restore saved variants if editing an existing match
  var editingM=window._editingMatchId?matcher.find(function(x){return String(x.dbId)===String(window._editingMatchId);}):null;
  if(editingM&&editingM.uppstallningar&&editingM.uppstallningar.length){
    matchVariants=JSON.parse(JSON.stringify(editingM.uppstallningar));
    activeVariantIdx=0;
    var v0=matchVariants[0];
    matchAssignments=JSON.parse(JSON.stringify(v0.assignments||{}));
    if(v0.format&&v0.format!==format){
      format=v0.format;
      document.getElementById("fmt-sel").value=String(format);
      buildFormationBtns();
    }
    if(v0.formation){
      var fbtns=document.querySelectorAll("#formation-btns .btn");
      for(var fi=0;fi<fbtns.length;fi++){fbtns[fi].classList.toggle("on",fbtns[fi].textContent===v0.formation);}
    }
    if(v0.playerStates&&v0.playerStates.length){
      players=v0.playerStates.map(function(ps){return{id:ps.id,team:ps.team||(ps.id.indexOf("h")===0?"home":"away"),number:ps.number,name:ps.name||"",x:ps.x,y:ps.y};});
    } else {
      players.filter(function(p){return p.team==="home";}).forEach(function(p){p.name="";p.number=0;});
    }
  } else {
    players.filter(function(p){return p.team==="home";}).forEach(function(p){p.name="";p.number=0;});
  }
  // Show motståndare in bench-bar
  var motEl=document.getElementById("bench-motstand-lbl");
  if(motEl){var editM2=window._editingMatchId?matcher.find(function(x){return String(x.dbId)===String(window._editingMatchId);}):null;motEl.textContent=editM2?(editM2.datum+" vs "+editM2.motstand):document.getElementById("match-motstand").value||"";}
  document.querySelectorAll(".tab").forEach(function(t){t.classList.toggle("on",t.getAttribute("data-panel")==="formations");});
  document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.id==="panel-formations");});
  halfMode=1;updateViewBox();render();renderBench();
  showToast(matchVariants.length?"Uppst\u00e4llning laddad!":"Tryck p\u00e5 en position f\u00f6r att placera spelare!");});
document.getElementById("btn-spara-match").addEventListener("click",function(){var datum=document.getElementById("match-datum").value;var motstand=document.getElementById("match-motstand").value.trim();if(!datum){showToast("V\u00e4lj datum!");return;}var startade=trupp.filter(function(sp){return matchSelections[sp.id]==="start";}).map(function(sp){return sp.id;});var avbytare=trupp.filter(function(sp){return matchSelections[sp.id]==="avbytare";}).map(function(sp){return sp.id;});// Save current variant state before building match
if(matchVariants.length>0)saveCurrentVariant();
else if(Object.keys(matchAssignments).length>0){
  // Auto-save first variant
  matchVariants=[{namn:"Uppst. 1",assignments:JSON.parse(JSON.stringify(matchAssignments)),playerStates:players.filter(function(p){return p.team==="home";}).map(function(p){return{id:p.id,number:p.number,name:p.name};})}];
  activeVariantIdx=0;
}
var match={datum:datum,motstand:motstand||"Ok\u00e4nd",startade:startade,avbytare:avbytare,uppstallningar:JSON.parse(JSON.stringify(matchVariants)),mal_hemma:matchGoals.home,mal_borta:matchGoals.away};var editId=window._editingMatchId||null;if(editId){
  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+editId,{
    method:"PATCH",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify({
      name:datum+" "+match.motstand,
      data:(typeof addMetaToData==="function"?addMetaToData(match):match)
    })
  })
  .then(function(r){return r.json();})
  .then(function(data){
    match.dbId=editId;
    matcher=matcher.map(function(x){
      return String(x.dbId)===String(editId)?Object.assign({},match,{dbId:editId}):x;
    });
    matchSelections={};
    window._editingMatchId=null;
    renderMatchTruppList();
    renderStatistik();
    renderMatchHistory();
    showToast("Match uppdaterad!");
  })
  .catch(function(err){
    cloudStatus("❌ Fel: "+err.message,"#e84a4a");
    showToast("Kunde inte uppdatera match",false);
  });
}else{
  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{
    method:"POST",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify({
      name:datum+" "+match.motstand,
      data:(typeof addMetaToData==="function"?addMetaToData(match):match),
      type:"match",
      folder:"Allmänt"
    })
  })
  .then(function(r){return r.json();})
  .then(function(data){
    if(!data || !data[0] || !data[0].id){
      var errMsg=(data&&data.message)?data.message:"Matchen kunde inte sparas";
      showToast(errMsg,false);
      cloudStatus("❌ "+errMsg,"#e84a4a");
      return;
    }

    match.dbId=data[0].id;

    var idx=matcher.findIndex(function(x){
      return String(x.dbId)===String(match.dbId);
    });

    if(idx>=0)matcher[idx]=match;
    else matcher.push(match);

    matchSelections={};
    renderMatchTruppList();
    renderStatistik();
    renderMatchHistory();
    showToast("Match sparad: "+datum+" vs "+match.motstand);
  })
  .catch(function(err){
    cloudStatus("❌ Fel: "+err.message,"#e84a4a");
    showToast("Kunde inte spara match",false);
  });
}});
var statSelections={};
function renderStatistik(){var list=document.getElementById("stat-list");if(!list)return;var from=document.getElementById("stat-from").value;var to=document.getElementById("stat-to").value;var filtered=matcher.filter(function(m){if(from&&m.datum<from)return false;if(to&&m.datum>to)return false;return true;});var stats={};trupp.slice().sort(function(a,b){return a.namn.localeCompare(b.namn,"sv");}).forEach(function(sp){stats[sp.id]={id:sp.id,namn:sp.namn,nr:sp.nr,starter:0,inhopp:0};});filtered.forEach(function(m){(m.startade||[]).forEach(function(id){if(stats[id])stats[id].starter++;});(m.avbytare||[]).forEach(function(id){if(stats[id])stats[id].inhopp++;});});list.innerHTML="";if(!trupp.length){list.innerHTML="<span style=\"color:#7aaa88;font-size:0.8rem\">Inga spelare<\/span>";return;}var hdr=document.createElement("div");hdr.style.cssText="display:grid;grid-template-columns:24px 30px 1fr 40px 40px;gap:4px;padding:3px 8px;font-size:0.65rem;color:#7aaa88;font-weight:700;text-transform:uppercase;border-bottom:1px solid #2d4a35;margin-bottom:3px";hdr.innerHTML="<span><\/span><span>#<\/span><span>Spelare<\/span><span style=\"text-align:center\">Start<\/span><span style=\"text-align:center\">Tot<\/span>";list.appendChild(hdr);var sortedStats=Object.values(stats).sort(function(a,b){var totA=a.starter+a.inhopp,totB=b.starter+b.inhopp;return totB-totA||a.namn.localeCompare(b.namn,"sv");});sortedStats.forEach(function(sp){var row=document.createElement("div");row.style.cssText="display:grid;grid-template-columns:24px 30px 1fr 40px 40px;gap:4px;padding:5px 8px;font-size:0.78rem;border-bottom:1px solid #1a2e1f;cursor:pointer;align-items:center";if(statSelections[sp.id])row.style.background="rgba(74,232,122,0.1)";var chk=document.createElement("input");chk.type="checkbox";chk.checked=!!statSelections[sp.id];chk.style.cssText="width:15px;height:15px;accent-color:#4ae87a;cursor:pointer;flex-shrink:0";var nrEl=document.createElement("span");nrEl.style.color="#7aaa88";nrEl.textContent="#"+sp.nr;var nmEl=document.createElement("span");nmEl.textContent=sp.namn;var stEl=document.createElement("span");stEl.style.cssText="text-align:center;color:#4ae87a";stEl.textContent=sp.starter;var totEl=document.createElement("span");totEl.style.cssText="text-align:center;font-weight:700";totEl.textContent=(sp.starter+sp.inhopp);function toggleSel(){if(statSelections[sp.id])delete statSelections[sp.id];else statSelections[sp.id]=true;chk.checked=!!statSelections[sp.id];row.style.background=statSelections[sp.id]?"rgba(74,232,122,0.1)":"";renderStatActionBar();}chk.addEventListener("change",toggleSel);row.addEventListener("click",function(e){if(e.target!==chk)toggleSel();});row.appendChild(chk);row.appendChild(nrEl);row.appendChild(nmEl);row.appendChild(stEl);row.appendChild(totEl);list.appendChild(row);});renderStatActionBar();}
document.getElementById("btn-stat-filter").addEventListener("click",function(){
  statSelections={};
  try{localStorage.setItem("taktik_stat_from",document.getElementById("stat-from").value);localStorage.setItem("taktik_stat_to",document.getElementById("stat-to").value);}catch(e){}
  renderStatistik();
});
// Auto-save dates on change
document.getElementById("stat-from").addEventListener("change",function(){try{localStorage.setItem("taktik_stat_from",this.value);}catch(e){}});
document.getElementById("stat-to").addEventListener("change",function(){try{localStorage.setItem("taktik_stat_to",this.value);}catch(e){}});
function renderStatActionBar(){var bar=document.getElementById("stat-action-bar");if(!bar)return;var n=Object.keys(statSelections).length;bar.style.display=n>0?"flex":"none";var cnt=document.getElementById("stat-sel-count");if(cnt)cnt.textContent=n+" vald"+(n===1?"":"a");var sel=document.getElementById("stat-match-sel");if(sel){sel.innerHTML="";var opt0=document.createElement("option");opt0.value="";opt0.textContent="V\u00e4lj match...";sel.appendChild(opt0);var sorted=matcher.slice().sort(function(a,b){return b.datum.localeCompare(a.datum);});sorted.forEach(function(m){var o=document.createElement("option");o.value=m.dbId||("__local__"+m.datum+"_"+m.motstand);o.textContent=m.datum+" "+m.motstand;sel.appendChild(o);});}}
document.getElementById("btn-stat-clear-sel").addEventListener("click",function(){statSelections={};renderStatistik();});
document.getElementById("btn-stat-add-to-match").addEventListener("click",function(){var sel=document.getElementById("stat-match-sel");var dbId=sel?sel.value:"";if(!dbId){showToast("V\u00e4lj en match!");return;}var selectedIds=Object.keys(statSelections);if(!selectedIds.length){showToast("V\u00e4lj spelare!");return;}var m;if(dbId.indexOf("__local__")===0){var parts=dbId.replace("__local__","").split("_");var mDatum=parts[0],mMotstand=parts.slice(1).join("_");m=matcher.find(function(x){return x.datum===mDatum&&x.motstand===mMotstand;});}else{m=matcher.find(function(x){return String(x.dbId)===String(dbId);});}if(!m){showToast("Match ej hittad!");return;}selectedIds.forEach(function(id){if((m.startade||[]).indexOf(id)<0)m.startade.push(id);});fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+dbId,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({data:m})}).then(function(){statSelections={};renderStatistik();showToast(selectedIds.length+" spelare tillagda i "+m.datum+" "+m.motstand+"!");});});
document.getElementById("btn-stat-to-match").addEventListener("click",function(){var selectedIds=Object.keys(statSelections);matchSelections={};selectedIds.forEach(function(id){matchSelections[id]="start";});matchRoster=selectedIds.length?trupp.filter(function(sp){return statSelections[sp.id];}):[];matchAssignments={};players.filter(function(p){return p.team==="home";}).forEach(function(p){p.name="";p.number=0;});document.querySelectorAll("[data-lag]").forEach(function(b){b.classList.toggle("on",b.getAttribute("data-lag")==="match");});document.getElementById("lag-trupp").style.display="none";document.getElementById("lag-match").style.display="";document.getElementById("lag-statistik").style.display="none";document.getElementById("bottompanel").classList.remove("expanded");var d=new Date();document.getElementById("match-datum").value=d.toISOString().slice(0,10);document.getElementById("match-motstand").value="";window._editingMatchId=null;statSelections={};renderMatchTruppList();showToast(selectedIds.length?selectedIds.length+" spelare valda!":"Ny match skapad \u2013 l\u00e4gg till spelare");});
document.querySelectorAll("[data-stat]").forEach(function(btn){btn.addEventListener("click",function(){var target=this.getAttribute("data-stat");document.querySelectorAll("[data-stat]").forEach(function(b){b.classList.toggle("on",b.getAttribute("data-stat")===target);});document.getElementById("stat-spelare-view").style.display=target==="spelare"?"":"none";document.getElementById("stat-matcher-view").style.display=target==="matcher"?"":"none";if(target==="matcher")renderMatchHistory();});});
function renderMatchHistory(){var list=document.getElementById("match-history-list");if(!list)return;list.innerHTML="";var filtered=matcher.slice().sort(function(a,b){return b.datum.localeCompare(a.datum);});if(!filtered.length){list.innerHTML="<span style=\"color:#7aaa88;font-size:0.8rem\">Inga matcher i perioden<\/span>";return;}filtered.forEach(function(m){var row=document.createElement("div");row.className="row";row.style.flexWrap="wrap";var info=document.createElement("div");info.style.cssText="flex:1;min-width:0";var datum=document.createElement("span");datum.style.cssText="font-weight:700;font-size:0.82rem;color:#4ae87a";datum.textContent=m.datum;var mot=document.createElement("span");mot.className="row-sub";mot.style.marginLeft="6px";mot.textContent="vs "+m.motstand;var cnt=document.createElement("span");cnt.className="row-sub";cnt.style.display="block";cnt.textContent=(m.startade||[]).length+" startade"+(m.mal_hemma!==undefined?"  "+m.mal_hemma+"\u2013"+m.mal_borta:"");info.appendChild(datum);info.appendChild(mot);info.appendChild(cnt);var editBtn=document.createElement("button");editBtn.className="sa";editBtn.style.cssText="color:#e8c84a;border-color:#e8c84a";editBtn.textContent="\u270f";editBtn.addEventListener("click",function(){openEditMatch(m);});var delBtn=document.createElement("button");delBtn.className="sa del";delBtn.textContent="\u00d7";delBtn.addEventListener("click",function(){if(!confirm("Ta bort match "+m.datum+" vs "+m.motstand+"?"))return;if(m.dbId){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+m.dbId,{method:"DELETE",headers:supaHeaders()}).then(function(){matcher=matcher.filter(function(x){return x.dbId!==m.dbId;});renderMatchHistory();renderStatistik();showToast("Match borttagen!");});}else{matcher=matcher.filter(function(x){return x!==m;});renderMatchHistory();renderStatistik();showToast("Match borttagen!");}});row.appendChild(info);row.appendChild(editBtn);row.appendChild(delBtn);list.appendChild(row);});}
function openEditMatch(m){document.querySelectorAll("[data-lag]").forEach(function(b){b.classList.toggle("on",b.getAttribute("data-lag")==="match");});document.getElementById("lag-trupp").style.display="none";document.getElementById("lag-match").style.display="";document.getElementById("lag-statistik").style.display="none";document.getElementById("match-datum").value=m.datum;document.getElementById("match-motstand").value=m.motstand||"";matchSelections={};(m.startade||[]).forEach(function(id){matchSelections[id]="start";});renderMatchTruppList();window._editingMatchId=m.dbId||null;showToast("Redigerar match "+m.datum+" vs "+m.motstand);}
document.getElementById("btn-export-stat-csv").addEventListener("click",function(){var from=document.getElementById("stat-from").value,to=document.getElementById("stat-to").value;var filtered=matcher.filter(function(m){if(from&&m.datum<from)return false;if(to&&m.datum>to)return false;return true;});var stats={};trupp.slice().sort(function(a,b){return a.namn.localeCompare(b.namn,"sv");}).forEach(function(sp){stats[sp.id]={namn:sp.namn,nr:sp.nr,starter:0,inhopp:0};});filtered.forEach(function(m){(m.startade||[]).forEach(function(id){if(stats[id])stats[id].starter++;});(m.avbytare||[]).forEach(function(id){if(stats[id])stats[id].inhopp++;});});var rows=["#,Spelare,Starter,Totalt"];Object.values(stats).sort(function(a,b){return a.nr-b.nr;}).forEach(function(s){rows.push(s.nr+","+s.namn+","+s.starter+","+(s.starter+s.inhopp));});var blob=new Blob([rows.join("\n")],{type:"text/csv;charset=utf-8;"});var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download="spelarstatistik.csv";a.click();URL.revokeObjectURL(url);showToast("CSV exporterad!");});
document.getElementById("btn-export-stat-pdf").addEventListener("click",function(){var from=document.getElementById("stat-from").value,to=document.getElementById("stat-to").value;var filtered=matcher.filter(function(m){if(from&&m.datum<from)return false;if(to&&m.datum>to)return false;return true;});var stats={};trupp.slice().sort(function(a,b){return a.namn.localeCompare(b.namn,"sv");}).forEach(function(sp){stats[sp.id]={namn:sp.namn,nr:sp.nr,starter:0,inhopp:0};});filtered.forEach(function(m){(m.startade||[]).forEach(function(id){if(stats[id])stats[id].starter++;});(m.avbytare||[]).forEach(function(id){if(stats[id])stats[id].inhopp++;});});var rows=Object.values(stats).sort(function(a,b){return a.nr-b.nr;});var pdoc="<html><head><style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f0f0f0}<\/style><\/head><body><h2>Spelarstatistik<\/h2><p>"+(from?"Fr\u00e5n: "+from:"")+(to?" \u2013 Till: "+to:"")+" ("+filtered.length+" matcher)<\/p><table><tr><th>#<\/th><th>Spelare<\/th><th>Starter<\/th><th>Inhopp<\/th><th>Totalt<\/th><\/tr>";rows.forEach(function(s){pdoc+="<tr><td>"+s.nr+"<\/td><td>"+s.namn+"<\/td><td>"+s.starter+"<\/td><td>"+s.inhopp+"<\/td><td>"+(s.starter+s.inhopp)+"<\/td><\/tr>";});pdoc+="<\/table><\/body><\/html>";var w=window.open("","_blank");if(w){w.document.write(pdoc);w.document.close();w.print();}showToast("PDF \u00f6ppnad!");});
try{(function(){
  var d=new Date();var ds=d.toISOString().slice(0,10);
  var md=document.getElementById("match-datum");if(md)md.value=ds;
  // Load saved stat dates or use defaults
  var savedFrom=null,savedTo=null;
  try{savedFrom=localStorage.getItem("taktik_stat_from");savedTo=localStorage.getItem("taktik_stat_to");}catch(e){}
  var st=document.getElementById("stat-to");
  var sf=document.getElementById("stat-from");
  if(savedTo&&st)st.value=savedTo;
  else if(st)st.value=ds;
  if(savedFrom&&sf)sf.value=savedFrom;
  else if(sf){var y=new Date(d);y.setMonth(y.getMonth()-6);sf.value=y.toISOString().slice(0,10);}
})();}catch(e){console.error("Date IIFE error:",e);}
}catch(e){console.error("Lag JS error:",e);}
function renderSparadeMatcherList(){
  var list=document.getElementById("sparade-match-list");
  if(!list)return;list.innerHTML="";
  var sorted=matcher.slice().sort(function(a,b){return b.datum.localeCompare(a.datum);});
  if(!sorted.length){list.innerHTML="<span style='color:#7aaa88;font-size:0.8rem'>Inga sparade matcher<\/span>";return;}
  var inBenchMode=matchRoster.length>0;
  sorted.forEach(function(m){
    var row=document.createElement("div");row.className="row";row.style.flexWrap="wrap";
    var info=document.createElement("div");info.style.cssText="flex:1;min-width:0";
    var datum=document.createElement("span");datum.style.cssText="font-weight:700;font-size:0.82rem;color:#4ae87a";datum.textContent=m.datum;
    var mot=document.createElement("span");mot.className="row-sub";mot.style.marginLeft="6px";mot.textContent="vs "+m.motstand;
    var cnt=document.createElement("span");cnt.className="row-sub";cnt.style.display="block";cnt.textContent=(m.startade||[]).length+" startade"+(m.mal_hemma!==undefined?"  "+m.mal_hemma+"\u2013"+m.mal_borta:"");
    info.appendChild(datum);info.appendChild(mot);info.appendChild(cnt);
    row.appendChild(info);
    if(m.uppstallningar&&m.uppstallningar.length){
      var loadBtn=document.createElement("button");loadBtn.className="sa load";loadBtn.textContent="Ladda uppst.";
      loadBtn.addEventListener("click",function(){
        // Always reset and load fresh from this match
        matchRoster=trupp.filter(function(sp){return(m.startade||[]).indexOf(sp.id)>=0;});
        matchAssignments={};
        matchVariants=[];activeVariantIdx=0;
        matchGoals={home:m.mal_hemma||0,away:m.mal_borta||0};
        updateGoalDisplay();
        // Restore matchSelections so manual save also works
        matchSelections={};
        matchRoster.forEach(function(sp){matchSelections[sp.id]="start";});
        players.filter(function(p){return p.team==="home";}).forEach(function(p){p.name="";p.number=0;});
        window._editingMatchId=m.dbId||null;
        var motEl=document.getElementById("bench-motstand-lbl");
        if(motEl)motEl.textContent=m.datum+" vs "+m.motstand;
        if(m.uppstallningar&&m.uppstallningar.length){
          matchVariants=JSON.parse(JSON.stringify(m.uppstallningar));
          loadVariant(0);
        } else {
          // No saved lineup - use default formation
          var defF=getDefaultFormation();
          var fmt=getDefaultFormat();
          if(fmt!==format){format=fmt;document.getElementById("fmt-sel").value=String(format);buildFormationBtns();}
          var btns=document.querySelectorAll("#formation-btns .btn");
          for(var i=0;i<btns.length;i++){btns[i].classList.toggle("on",btns[i].textContent===defF);}
          initPlayers(defF);render();renderBench();updateVariantUI();
          showToast("Tom uppst\u00e4llning - placera spelare!");
        }
        halfMode=1;updateViewBox();
        document.getElementById("bench-bar").classList.add("active");
        document.querySelectorAll(".tab").forEach(function(t){t.classList.toggle("on",t.getAttribute("data-panel")==="formations");});
        document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.id==="panel-formations");});
        if(m.uppstallningar&&m.uppstallningar.length)showToast("Uppst\u00e4llning laddad: "+m.datum+" vs "+m.motstand);
      });
      row.appendChild(loadBtn);
    }
    var editBtn=document.createElement("button");editBtn.className="sa";editBtn.style.cssText="color:#e8c84a;border-color:#e8c84a";editBtn.textContent="\u270f";
    editBtn.addEventListener("click",function(){openEditMatch(m);});
    var delBtn=document.createElement("button");delBtn.className="sa del";delBtn.textContent="\u00d7";
    delBtn.addEventListener("click",function(){
      if(!confirm("Ta bort match "+m.datum+" vs "+m.motstand+"?"))return;
      if(m.dbId){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+m.dbId,{method:"DELETE",headers:supaHeaders()}).then(function(){matcher=matcher.filter(function(x){return x.dbId!==m.dbId;});renderSparadeMatcherList();renderStatistik();showToast("Match borttagen!");});}
      else{matcher=matcher.filter(function(x){return x!==m;});renderSparadeMatcherList();renderStatistik();showToast("Match borttagen!");}
    });
    row.appendChild(editBtn);row.appendChild(delBtn);
    list.appendChild(row);
  });
}
function openMoveTaktikFolder(tk){
  var container=document.getElementById("move-folder-list");
  container.innerHTML="";
  var allF=["Taktik","Tr\u00e4ning"];
  var seen={};allF.forEach(function(x){seen[x]=true;});
  taktikFolders.forEach(function(f){if(!seen[f]){seen[f]=true;allF.push(f);}});
  allF.sort(function(a,b){return a.localeCompare(b,"sv");});
  allF.forEach(function(f){
    var btn=document.createElement("button");
    btn.className="btn"+((tk.folder||"Taktik")===f?" on":"");
    btn.textContent=f;
    btn.style.cssText="width:100%;text-align:left;margin-bottom:2px;padding-left:"+(f.split("/").length*8)+"px";
    btn.addEventListener("click",function(){
      tk.folder=f;
      if(tk.dbId){
        fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({folder:f,data:tk})}).then(function(){showToast("Film flyttad till "+f+"!");renderTaktikList();});
      } else {renderTaktikList();}
      document.getElementById("modal-move-folder").classList.add("hidden");
    });
    container.appendChild(btn);
  });
  document.getElementById("modal-move-folder").classList.remove("hidden");
}

function checkShareLink(){var params=new URLSearchParams(window.location.search);var shareId=params.get("share");if(!shareId)return;fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+shareId,{headers:supaHeaders()}).then(function(r){return r.json();}).then(function(data){if(data&&data[0]){var tk=data[0].data;tk.dbId=data[0].id;taktikFilmer=[tk];renderTaktikList();startPlayback(0);showToast("Delade filmen: "+tk.name);}}).catch(function(){});}
function isFullscreenTaktikMode(){
  return !!(playback||isEditingTaktik||editingTaktikIdx!==null||document.querySelector('.tab.on[data-panel="taktik"]'));
}
function syncFullscreenToolButtons(){
  var map={"fs-tb-move":"move","fs-tb-arrow":"arrow","fs-tb-freehand":"freehand","fs-tb-zone":"zone","fs-tb-text":"text","fs-tb-movement":"movement"};
  Object.keys(map).forEach(function(id){
    var b=document.getElementById(id);
    if(!b)return;
    if(id==="fs-tb-movement")b.style.display=isFullscreenTaktikMode()?"":"none";
    b.classList.toggle("active",mode===map[id]);
  });
}
function setupFullscreenPortraitToolbar(){
  if(document.getElementById("fs-top-tools")){syncFullscreenToolButtons();return;}
  var nav=document.getElementById("fs-portrait-nav");
  if(!nav)return;
  var css=document.createElement("style");
  css.textContent="body.fullscreen-portrait #fs-top-tools{display:flex!important;position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 46px);transform:translateX(-50%);z-index:9999;gap:4px;background:rgba(17,26,20,.94);border:1px solid #2d4a35;border-radius:12px;padding:5px 7px;box-shadow:0 4px 16px rgba(0,0,0,.35);max-width:calc(100vw - 18px);overflow-x:auto}body:not(.fullscreen-portrait) #fs-top-tools{display:none!important}#fs-top-tools .ls-btn{flex:0 0 auto;min-width:34px;height:32px;padding:4px 7px!important;font-size:.85rem!important}body.fullscreen-portrait #fs-portrait-nav{justify-content:center}body.fullscreen-portrait #fs-step-label{min-width:48px}";
  document.head.appendChild(css);
  var topTools=document.createElement("div");
  topTools.id="fs-top-tools";
  var moveBtn=document.createElement("button");
  moveBtn.className="ls-btn";moveBtn.id="fs-tb-move";moveBtn.title="Flytta spelare/boll";moveBtn.textContent="✋";
  topTools.appendChild(moveBtn);
  ["fs-tb-arrow","fs-tb-freehand","fs-tb-zone","fs-tb-text","fs-tb-movement"].forEach(function(id){var b=document.getElementById(id);if(b)topTools.appendChild(b);});
  var fsClearBtn=document.createElement("button");
  fsClearBtn.className="ls-btn";fsClearBtn.id="fs-tb-clear";fsClearBtn.title="Rensa ritningar och återställ spelare";fsClearBtn.textContent="🧽";
  topTools.appendChild(fsClearBtn);
  document.body.appendChild(topTools);
  moveBtn.addEventListener("click",function(){setMode("move");syncFullscreenToolButtons();});
  fsClearBtn.addEventListener("click",function(){clearCoachboardToFormation();syncFullscreenToolButtons();});
  ["fs-tb-arrow","fs-tb-freehand","fs-tb-zone","fs-tb-text"].forEach(function(id){var b=document.getElementById(id);if(b)b.style.display="";});
  syncFullscreenToolButtons();
}
function enterFullscreenPortrait(){document.body.classList.add("fullscreen-portrait");setupFullscreenPortraitToolbar();syncFullscreenToolButtons();updateFsPortraitNav();}
function exitFullscreenPortrait(){document.body.classList.remove("fullscreen-portrait");}
function updateFsPortraitNav(){var label=document.getElementById("fs-step-label");var prev=document.getElementById("fs-prev-btn");var next=document.getElementById("fs-next-btn");var first=document.getElementById("fs-first-btn");if(!label)return;if(playback){var cur=playback.stepIndex,total=playback.tk.steps.length-1;label.textContent=(cur===0?"Start":cur+"/"+total);prev.disabled=cur<=0;next.disabled=cur>=total;first.disabled=cur===0;prev.classList.toggle("active",cur>0);next.classList.toggle("active",cur<total);}else{label.textContent="-";prev.disabled=true;next.disabled=true;first.disabled=true;}}
document.getElementById("fs-enter-btn").addEventListener("click",enterFullscreenPortrait);
document.getElementById("btn-fs-topbar").addEventListener("click",enterFullscreenPortrait);
document.getElementById("fs-restore-btn").addEventListener("click",exitFullscreenPortrait);
document.getElementById("fs-first-btn").addEventListener("click",function(){document.getElementById("btn-first").click();setTimeout(updateFsPortraitNav,100);});
document.getElementById("fs-prev-btn").addEventListener("click",function(){document.getElementById("btn-prev").click();setTimeout(updateFsPortraitNav,100);});
document.getElementById("fs-next-btn").addEventListener("click",function(){document.getElementById("btn-next").click();setTimeout(updateFsPortraitNav,100);});
document.getElementById("fs-day-btn").addEventListener("click",function(){document.getElementById("btn-daylight").click();this.classList.toggle("active",daylightMode);});
(function(){
  var fsMap={"fs-tb-arrow":"arrow","fs-tb-freehand":"freehand","fs-tb-zone":"zone","fs-tb-text":"text","fs-tb-movement":"movement"};
  Object.keys(fsMap).forEach(function(id){
    var el=document.getElementById(id);if(!el)return;
    el.addEventListener("click",function(){
      var m=fsMap[id];setMode(mode===m?"move":m);
      syncFullscreenToolButtons();
    });
  });
})();
(function(){
  var tbMap={"btn-tb-arrow":"arrow","btn-tb-freehand":"freehand","btn-tb-zone":"zone","btn-tb-text":"text","btn-tb-movement":"movement"};
  Object.keys(tbMap).forEach(function(id){
    var el=document.getElementById(id);if(!el)return;
    el.addEventListener("click",function(){
      var m=tbMap[id];setMode(mode===m?"move":m);
      Object.keys(tbMap).forEach(function(bid){var b=document.getElementById(bid);if(b)b.classList.toggle("on",mode===tbMap[bid]);});
    });
  });
})();
document.getElementById("ls-day-btn3").addEventListener("click",function(){daylightMode=!daylightMode;document.body.classList.toggle("daylight",daylightMode);document.getElementById("btn-daylight").innerHTML=daylightMode?"&#9790; Normal":"&#9728; Dag";drawPitch();render();});
var _manualLandscape=null;
var _isDesktop=navigator.maxTouchPoints===0;
if(_isDesktop)document.body.classList.add("desktop");

function handleOrientation(){
  var isLandscape;
  if(_isDesktop){
    // On desktop: use manual override if set, else default to portrait (false)
    isLandscape=_manualLandscape===null?false:_manualLandscape;
  } else {
    isLandscape=_manualLandscape!==null?_manualLandscape:window.innerWidth>window.innerHeight;
  }
  document.body.classList.toggle("landscape",isLandscape);
  if(isLandscape){updateLandscapeStrip();}
  var togBtn=document.getElementById("btn-orientation-toggle");
  if(togBtn){
    togBtn.style.display=_isDesktop?"":"none";
    togBtn.textContent=isLandscape?"\u2195":"\u21c4";
    togBtn.title=isLandscape?"V\u00e4xla till st\u00e5ende":"V\u00e4xla till liggande";
  }
}

document.getElementById("btn-orientation-toggle").addEventListener("click",function(){
  if(_manualLandscape===null){
    // Currently auto - force opposite of current
    _manualLandscape=!document.body.classList.contains("landscape");
  } else {
    _manualLandscape=!_manualLandscape;
  }
  handleOrientation();render();
  this.textContent=document.body.classList.contains("landscape")?"\u2195":"\u8645";
});
function updateLandscapeStrip(){var label=document.getElementById("ls-step-label");var label2=document.getElementById("ls-side-label");var prevBtn=document.getElementById("ls-prev-btn");var nextBtn=document.getElementById("ls-next-btn");var firstBtn=document.getElementById("ls-first-btn");if(!label)return;if(playback){var cur=playback.stepIndex,total=playback.tk.steps.length-1;label.textContent=playback.tk.name+"  "+(cur===0?"Start":cur+"/"+total);if(label2)label2.textContent=playback.tk.name;var hasPrev=cur>0,hasNext=cur<total;prevBtn.disabled=!hasPrev;nextBtn.disabled=!hasNext;firstBtn.disabled=cur===0;prevBtn.classList.toggle("active",hasPrev);nextBtn.classList.toggle("active",hasNext);}else{label.textContent="-";if(label2)label2.textContent="";prevBtn.disabled=true;nextBtn.disabled=true;firstBtn.disabled=true;prevBtn.classList.remove("active");nextBtn.classList.remove("active");}}
document.getElementById("ls-first-btn").addEventListener("click",function(){document.getElementById("btn-first").click();setTimeout(updateLandscapeStrip,100);});
document.getElementById("ls-prev-btn").addEventListener("click",function(){if(!playback||playback.animating)return;if(playback.stepIndex<=0)return;var idx=playback.stepIndex-1;editingStepIdx=idx;animateToStep(idx);updateEditStepUI_silent();setTimeout(updateLandscapeStrip,100);});
document.getElementById("ls-next-btn").addEventListener("click",function(){if(!playback||playback.animating)return;if(playback.stepIndex>=playback.tk.steps.length-1)return;var idx=playback.stepIndex+1;editingStepIdx=idx;animateToStep(idx);updateEditStepUI_silent();setTimeout(updateLandscapeStrip,100);});
document.getElementById("ls-speed-sel").addEventListener("change",function(){animSpeed=parseInt(this.value);document.getElementById("play-speed").value=this.value;});
document.getElementById("ls-loop").addEventListener("change",function(){document.getElementById("play-loop").checked=this.checked;});
var _orientTimer=null;
window.addEventListener("resize",function(){if(_orientTimer)clearTimeout(_orientTimer);_orientTimer=setTimeout(function(){handleOrientation();render();_orientTimer=null;},200);});
window.addEventListener("orientationchange",function(){if(_orientTimer)clearTimeout(_orientTimer);_orientTimer=setTimeout(function(){handleOrientation();render();_orientTimer=null;},350);});

// Init
drawPitch();
handleOrientation();
// Apply default format
if(_defaultFormat!==11){format=_defaultFormat;document.getElementById("fmt-sel").value=String(format);}
buildFormationBtns();
initPlayers(_defaultFormation);
render();
cloudLoadSaves();
cloudLoadTaktik();
loadTrupp();
loadMatcher();
checkShareLink();


/* === v10: Mina/Lagets + skrivskydd/kopiera === */
var saveScope = "mine";
var taktikScope = "mine";

function getProfileSafeV10(){
  try{
    if(typeof getUserProfile==="function"){
      var p=getUserProfile();
      if(p)return p;
    }
    var raw=localStorage.getItem("tt_profile_v1");
    return raw?JSON.parse(raw):null;
  }catch(e){return null;}
}
function fileMetaV10(obj){
  if(!obj)return {};
  if(obj._meta)return obj._meta;
  if(obj.meta)return obj.meta;
  if(obj.state&&obj.state._meta)return obj.state._meta;
  if(obj.data&&obj.data._meta)return obj.data._meta;
  return {};
}
function ownerNameV10(obj){
  var m=fileMetaV10(obj);
  return m.ownerName||"Okänd ägare";
}
function isMineV10(obj){
  var p=getProfileSafeV10();
  var m=fileMetaV10(obj);
  if(!p||!m.ownerId)return true; // äldre filer behandlas som mina tills de migreras
  return String(m.ownerId)===String(p.ownerId);
}
function isSameTeamSharedV10(obj){
  var p=getProfileSafeV10();
  var m=fileMetaV10(obj);
  if(!p||!m.teamId)return false;
  return String(m.teamId)===String(p.teamId) && !!m.sharedWithTeam && !isMineV10(obj);
}
function isFileVisibleInScopeV10(obj,scope){
  return scope==="team" ? isSameTeamSharedV10(obj) : isMineV10(obj);
}
function isReadOnlyFileV10(obj){
  var m=fileMetaV10(obj);
  return !isMineV10(obj) && !m.teamCanEdit;
}
function addScopeTabsV10(container,scope,setter){
  var row=document.createElement("div");
  row.style.cssText="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;width:100%";
  [["mine","Mina"],["team","Lagets"]].forEach(function(pair){
    var b=document.createElement("button");
    b.className="tab"+(scope===pair[0]?" on":"");
    b.textContent=pair[1];
    b.style.cssText="font-size:0.68rem;padding:3px 8px";
    b.addEventListener("click",function(){setter(pair[0]);});
    row.appendChild(b);
  });
  container.appendChild(row);
}
function updateShareMetaV10(data,share,canEdit){
  var d=JSON.parse(JSON.stringify(data||{}));
  var meta=d._meta||{};
  var p=getProfileSafeV10();
  if(p){
    meta.ownerId=meta.ownerId||p.ownerId;
    meta.ownerName=meta.ownerName||p.ownerName;
    meta.teamId=meta.teamId||p.teamId;
    meta.teamCode=meta.teamCode||p.teamCode;
  }
  meta.sharedWithTeam=!!share;
  meta.teamCanEdit=!!canEdit;
  meta.updatedAt=new Date().toISOString();
  d._meta=meta;
  return d;
}
function patchFormationShareV10(s,share){
  if(!s||!s.id)return;
  if(!isMineV10(s)){showToast("Du kan inte ändra delning på någon annans fil",false);return;}
  var newState=updateShareMetaV10(s.state,share,false);
  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+s.id,{
    method:"PATCH",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify({data:newState})
  }).then(function(){s.state=newState;showToast(share?"Delad med laget":"Inte längre delad");cloudLoadSaves();})
    .catch(function(err){showToast("Kunde inte ändra delning",false);cloudStatus("❌ "+err.message,"#e84a4a");});
}
function copyFormationToMineV10(s){
  if(!s)return;
  var p=getProfileSafeV10();
  var name="Kopia av "+(s.name||"utgångsläge");
  var state=JSON.parse(JSON.stringify(s.state||{}));
  if(typeof addMetaToData==="function")state=addMetaToData(state);
  else state=updateShareMetaV10(state,false,false);
  if(state._meta){state._meta.sharedWithTeam=false;state._meta.teamCanEdit=false;}
  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{
    method:"POST",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify({name:name,data:state,type:"uppstallning",folder:s.folder||"Allmänt"})
  }).then(function(r){return r.json();}).then(function(data){
    showToast("Kopia skapad i Mina filer");
    cloudLoadSaves();
  }).catch(function(err){showToast("Kunde inte kopiera",false);cloudStatus("❌ "+err.message,"#e84a4a");});
}
function patchTaktikShareV10(tk,share){
  if(!tk||!tk.dbId)return;
  if(!isMineV10(tk)){showToast("Du kan inte ändra delning på någon annans fil",false);return;}
  var newTk=updateShareMetaV10(tk,share,false);
  Object.keys(newTk).forEach(function(k){tk[k]=newTk[k];});
  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{
    method:"PATCH",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify({data:newTk})
  }).then(function(){showToast(share?"Film delad med laget":"Film inte längre delad");cloudLoadTaktik();})
    .catch(function(err){showToast("Kunde inte ändra delning",false);cloudStatus("❌ "+err.message,"#e84a4a");});
}
function copyTaktikToMineV10(tk){
  if(!tk)return;
  var copy=JSON.parse(JSON.stringify(tk));
  delete copy.dbId;
  delete copy._readOnly;
  copy.name="Kopia av "+(copy.name||"taktikfilm");
  if(copy._meta){delete copy._meta;}
  if(typeof addMetaToData==="function")copy=addMetaToData(copy);
  else copy=updateShareMetaV10(copy,false,false);
  if(copy._meta){copy._meta.sharedWithTeam=false;copy._meta.teamCanEdit=false;}
  if(typeof cloudSaveTaktik==="function")cloudSaveTaktik(copy);
  else showToast("Kunde inte kopiera film",false);
}

function renderSavesList(){
  var list=document.getElementById("saves-list");if(!list)return;list.innerHTML="";
  addScopeTabsV10(list,saveScope,function(v){saveScope=v;renderSavesList();});

  var visibleAll=savedFormations.filter(function(s){return isFileVisibleInScopeV10(s,saveScope);});
  var folderCounts={"Alla":visibleAll.length};
  for(var i=0;i<visibleAll.length;i++){var f=visibleAll[i].folder||"Allmänt";folderCounts[f]=(folderCounts[f]||0)+1;}

  var filterRow=document.createElement("div");filterRow.style.cssText="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;width:100%";
  var allFolders=["Alla"];var seen2={};
  for(var i=0;i<visibleAll.length;i++){var f=visibleAll[i].folder||"Allmänt";if(!seen2[f]){seen2[f]=true;allFolders.push(f);}}
  if(saveScope==="mine"){
    for(var i=0;i<folders.length;i++){if(!seen2[folders[i]]&&folders[i]!=="Alla"){seen2[folders[i]]=true;allFolders.push(folders[i]);}}
  }
  for(var i=0;i<allFolders.length;i++){
    (function(f){
      var wrap=document.createElement("div");wrap.style.cssText="display:flex;align-items:center;gap:1px;margin-bottom:2px";
      var fb=document.createElement("button");fb.className="tab"+(currentFolder===f?" on":"");fb.textContent=f+" ("+(folderCounts[f]||0)+")";fb.style.fontSize="0.62rem";fb.style.padding="2px 6px";
      fb.addEventListener("click",function(){currentFolder=f;renderSavesList();});
      wrap.appendChild(fb);
      if(f!=="Alla"&&saveScope==="mine"){
        var rnBtn=document.createElement("button");rnBtn.style.cssText="font-size:0.6rem;padding:2px 4px;background:#111a14;color:#7aaa88;border:1px solid #2d4a35;border-left:none;cursor:pointer";rnBtn.textContent="✏";rnBtn.title="Byt namn";rnBtn.addEventListener("click",function(e){e.stopPropagation();openRenameFolder(f);});wrap.appendChild(rnBtn);
        var delBtn=document.createElement("button");delBtn.style.cssText="font-size:0.6rem;padding:2px 4px;background:#111a14;color:#e84a4a;border:1px solid #2d4a35;border-left:none;border-radius:0 4px 4px 0;cursor:pointer";delBtn.textContent="×";delBtn.title="Radera mapp";
        delBtn.addEventListener("click",function(e){e.stopPropagation();var count=folderCounts[f]||0;if(count===0){if(!confirm("Radera mappen \""+f+"\"?"))return;folders=folders.filter(function(x){return x!==f;});if(currentFolder===f)currentFolder="Alla";renderSavesList();}else{openDeleteFolderConfirm(f,"saves");}});
        wrap.appendChild(delBtn);
      }
      filterRow.appendChild(wrap);
    })(allFolders[i]);
  }
  if(saveScope==="mine"){
    var addBtn=document.createElement("button");addBtn.style.cssText="font-size:0.62rem;padding:2px 8px;background:#111a14;color:#4ae87a;border:1px solid #4ae87a;border-radius:4px;cursor:pointer";addBtn.textContent="+ Mapp";
    addBtn.addEventListener("click",function(){pendingFolderTarget="saves";document.getElementById("new-folder-inp").value="";document.getElementById("modal-new-folder").classList.remove("hidden");setTimeout(function(){document.getElementById("new-folder-inp").focus();},100);});
    filterRow.appendChild(addBtn);
  }
  list.appendChild(filterRow);

  var filtered=visibleAll.filter(function(s){var inFolder=currentFolder==="Alla"||(s.folder||"Allmänt")===currentFolder;var inSearch=!searchQuery||s.name.toLowerCase().indexOf(searchQuery)>=0;return inFolder&&inSearch;});
  if(!filtered.length){var empty=document.createElement("span");empty.style.cssText="color:#7aaa88;font-size:0.8rem";empty.textContent=saveScope==="team"?"Inga delade lagfiler":"Inga uppställningar";list.appendChild(empty);return;}
  var sorted=filtered.slice().sort(function(a,b){return a.name.localeCompare(b.name,"sv");});
  for(var i=0;i<sorted.length;i++){
    (function(s){
      var mine=isMineV10(s), readOnly=isReadOnlyFileV10(s);
      var row=document.createElement("div");row.className="row";
      var nm=document.createElement("span");nm.className="row-name";nm.textContent=s.name;
      var fl=document.createElement("span");fl.className="row-sub";fl.textContent=(s.folder||"Allmänt")+(mine?"":" · "+ownerNameV10(s)+" · skrivskyddad");
      var ld=document.createElement("button");ld.className="sa load";ld.textContent=readOnly?"Öppna":"Ladda";
      ld.addEventListener("click",function(){
        applyState(JSON.parse(JSON.stringify(s.state)));
        activeFormationId=readOnly?null:s.id;
        activeFormationName=readOnly?null:s.name;
        updateSaveButtons();
        if(readOnly)showToast("Öppnad skrivskyddat – kopiera för att redigera");
      });

      row.appendChild(nm);row.appendChild(fl);

      if(mine){
        var share=document.createElement("button");share.className="sa";share.style.cssText="color:#4ae8e8;border-color:#4ae8e8";share.textContent=fileMetaV10(s).sharedWithTeam?"Dölj":"Dela";
        share.title=fileMetaV10(s).sharedWithTeam?"Sluta dela med laget":"Dela med laget";
        share.addEventListener("click",function(){patchFormationShareV10(s,!fileMetaV10(s).sharedWithTeam);});
        var toTk=document.createElement("button");toTk.className="sa";toTk.style.cssText="color:#4ae8e8;border-color:#4ae8e8";toTk.textContent="Till taktik";toTk.addEventListener("click",function(){sendSavedFormationToTaktik(s);});
        var mv=document.createElement("button");mv.className="sa";mv.style.cssText="color:#e8c84a;border-color:#e8c84a";mv.textContent="⇆ Flytta";mv.addEventListener("click",function(){openMoveFolder(s);});
        var dl=document.createElement("button");dl.className="sa del";dl.textContent="×";dl.addEventListener("click",function(){if(!confirm("Radera utgångsläget \""+(s.name||"utan namn")+"\"?"))return;if(s.id)cloudDelete(s.id);});
        row.appendChild(share);row.appendChild(mv);row.appendChild(ld);row.appendChild(toTk);row.appendChild(dl);
      }else{
        var cp=document.createElement("button");cp.className="sa";cp.style.cssText="color:#4ae8e8;border-color:#4ae8e8";cp.textContent="Kopiera";cp.addEventListener("click",function(){copyFormationToMineV10(s);});
        row.appendChild(ld);row.appendChild(cp);
      }
      list.appendChild(row);
    })(sorted[i]);
  }
}

function renderTaktikList(){
  var filterDiv=document.getElementById("taktik-folder-filter");
  if(filterDiv){
    filterDiv.innerHTML="";
    addScopeTabsV10(filterDiv,taktikScope,function(v){taktikScope=v;renderTaktikList();});
    var visibleAll=taktikFilmer.filter(function(tk){return isFileVisibleInScopeV10(tk,taktikScope);});
    var tfCounts={"Alla":visibleAll.length};
    for(var i=0;i<visibleAll.length;i++){var f=visibleAll[i].folder||"Taktik";tfCounts[f]=(tfCounts[f]||0)+1;}
    var tfAll=["Alla"];var tfseen={};var rootFolders=["Taktik","Träning"];
    if(taktikScope==="mine"){rootFolders.forEach(function(r){if(!tfseen[r]){tfseen[r]=true;tfAll.push(r);}});}
    for(var i=0;i<visibleAll.length;i++){var f=visibleAll[i].folder||"Taktik";if(!tfseen[f]){tfseen[f]=true;tfAll.push(f);}}
    if(taktikScope==="mine"){for(var i=0;i<taktikFolders.length;i++){if(!tfseen[taktikFolders[i]]){tfseen[taktikFolders[i]]=true;tfAll.push(taktikFolders[i]);}}}
    tfAll.sort(function(a,b){if(a==="Alla")return -1;if(b==="Alla")return 1;return a.localeCompare(b,"sv");});
    for(var i=0;i<tfAll.length;i++){(function(f){
      var isRoot=f==="Alla"||rootFolders.indexOf(f)>=0;
      var depth=f==="Alla"?0:(f.split("/").length-1);
      var wrap=document.createElement("div");wrap.style.cssText="display:flex;align-items:center;gap:1px;margin-bottom:2px;margin-left:"+(depth*12)+"px";
      var fb=document.createElement("button");fb.className="tab"+(currentTaktikFolder===f?" on":"");fb.textContent=(depth>0?"└ ":"")+f.split("/").pop()+" ("+(tfCounts[f]||0)+")";fb.style.fontSize="0.62rem";fb.style.padding="2px 6px";
      fb.addEventListener("click",function(){currentTaktikFolder=f;renderTaktikList();});
      wrap.appendChild(fb);
      if(f!=="Alla"&&taktikScope==="mine"){
        var subBtn=document.createElement("button");subBtn.style.cssText="font-size:0.6rem;padding:2px 4px;background:#111a14;color:#4ae87a;border:1px solid #2d4a35;border-left:none;cursor:pointer";subBtn.textContent="+";subBtn.title="Ny undermapp";
        subBtn.addEventListener("click",function(e){e.stopPropagation();pendingFolderParent=f;pendingFolderTarget="taktik";document.getElementById("new-folder-inp").value="";document.getElementById("modal-new-folder").classList.remove("hidden");setTimeout(function(){document.getElementById("new-folder-inp").focus();},100);});
        wrap.appendChild(subBtn);
        if(!isRoot){
          var rnBtn=document.createElement("button");rnBtn.style.cssText="font-size:0.6rem;padding:2px 4px;background:#111a14;color:#7aaa88;border:1px solid #2d4a35;border-left:none;cursor:pointer";rnBtn.textContent="✏";rnBtn.title="Byt namn";rnBtn.addEventListener("click",function(e){e.stopPropagation();openRenameTaktikFolder(f);});wrap.appendChild(rnBtn);
          var delBtn=document.createElement("button");delBtn.style.cssText="font-size:0.6rem;padding:2px 4px;background:#111a14;color:#e84a4a;border:1px solid #2d4a35;border-left:none;border-radius:0 4px 4px 0;cursor:pointer";delBtn.textContent="×";delBtn.title="Radera mapp";
          delBtn.addEventListener("click",function(e){e.stopPropagation();var count=tfCounts[f]||0;if(count===0){if(!confirm("Radera mappen \""+f+"\"?"))return;taktikFolders=taktikFolders.filter(function(x){return x!==f;});if(currentTaktikFolder===f)currentTaktikFolder="Alla";renderTaktikList();}else{openDeleteFolderConfirm(f,"taktik");}});
          wrap.appendChild(delBtn);
        }
      }
      filterDiv.appendChild(wrap);
    })(tfAll[i]);}
  }
  var list=document.getElementById("taktik-list");if(!list)return;list.innerHTML="";
  var q=taktikSearch.toLowerCase();
  var favorites_=typeof favorites!=="undefined"?favorites:{};
  var visible=taktikFilmer.filter(function(tk){return isFileVisibleInScopeV10(tk,taktikScope);});
  visible.sort(function(a,b){var af=a.dbId&&favorites_[a.dbId]?1:0;var bf=b.dbId&&favorites_[b.dbId]?1:0;return bf-af;});
  var filtered=visible.filter(function(tk){var inFolder=currentTaktikFolder==="Alla"||(tk.folder||"Taktik")===currentTaktikFolder;var inSearch=!q||tk.name.toLowerCase().indexOf(q)>=0;return inFolder&&inSearch;});
  if(!filtered.length){list.innerHTML="<span style=\"color:#7aaa88;font-size:0.8rem\">"+(taktikScope==="team"?"Inga delade lagfilmer":(taktikSearch?"Inga träffar":"Inga taktikfilmer sparade"))+"<\/span>";return;}
  for(var i=0;i<filtered.length;i++){
    (function(tk){
      var idx=taktikFilmer.indexOf(tk), mine=isMineV10(tk), readOnly=isReadOnlyFileV10(tk);
      tk._readOnly=readOnly;
      var row=document.createElement("div");row.className="row";row.style.gap="3px";
      var nm=document.createElement("span");nm.className="row-name";nm.textContent=tk.name;
      var fl=document.createElement("span");fl.className="row-sub";fl.textContent=(tk.folder||"Allmänt")+" · "+(tk.steps.length-1)+" steg"+(mine?"":" · "+ownerNameV10(tk)+" · skrivskyddad");
      function iconBtn(txt,title,color){var b=document.createElement("button");b.className="sa";b.textContent=txt;b.title=title;b.setAttribute("aria-label",title);b.style.cssText="min-width:24px;padding:2px 5px;font-size:0.72rem;line-height:1.1"+(color?";color:"+color+";border-color:"+color:"");return b;}
      var fav=document.createElement("button");fav.className="star-btn "+(tk.dbId&&favorites_[tk.dbId]?"on":"off");fav.innerHTML="&#9733;";fav.title="Favorit";fav.addEventListener("click",function(e){e.stopPropagation();if(tk.dbId&&mine)toggleFavorite(tk.dbId);});
      var pb=iconBtn(readOnly?"👁":"✎",readOnly?"Öppna skrivskyddat":"Redigera","#4ae87a");pb.className+=" play";pb.addEventListener("click",function(){startPlayback(idx);if(readOnly)showToast("Skrivskyddad – kopiera för att redigera");});
      var dup=iconBtn("⧉","Kopiera","#4ae8e8");dup.addEventListener("click",function(){mine?duplicateTaktik(idx):copyTaktikToMineV10(tk);});
      row.appendChild(nm);row.appendChild(fl);
      if(mine){
        var share=iconBtn(fileMetaV10(tk).sharedWithTeam?"🙈":"👥",fileMetaV10(tk).sharedWithTeam?"Sluta dela med laget":"Dela med laget","#4ae8e8");share.addEventListener("click",function(){patchTaktikShareV10(tk,!fileMetaV10(tk).sharedWithTeam);});
        var mg=iconBtn("⋓","Sammanfoga","#a78bfa");mg.addEventListener("click",function(){openMergeTaktik(idx);});
        var sh=iconBtn("⤴","Dela länk","#7aaa88");sh.addEventListener("click",function(){openShareTaktik(tk);});
        var mvTk=iconBtn("⇆","Flytta till mapp","#e8c84a");mvTk.addEventListener("click",function(){openMoveTaktikFolder(tk);});
        var dl=iconBtn("×","Radera","#e84a4a");dl.className+=" del";dl.addEventListener("click",function(){if(!confirm("Radera taktikfilmen \""+(tk.name||"utan namn")+"\"?"))return;deleteTaktik(idx);});
        row.appendChild(fav);row.appendChild(pb);row.appendChild(dup);row.appendChild(share);row.appendChild(mg);row.appendChild(sh);row.appendChild(mvTk);row.appendChild(dl);
      }else{
        row.appendChild(pb);row.appendChild(dup);
      }
      list.appendChild(row);
    })(filtered[i]);
  }
}
/* === slut v10 === */


/* === v11 stabilitetsfix: taktik/match single-source + deleteTaktik === */
function normalizeTaktikMetaV11(tk){
  if(!tk)return tk;
  if(typeof addMetaToData==="function")return addMetaToData(tk);
  return tk;
}
function isValidTaktikV11(tk){
  return !!(tk && tk.steps && tk.steps.length>=2);
}
function cloudSaveTaktik(tk){
  if(!tk)return;
  if(tk._readOnly || (typeof isReadOnlyFileV10==="function" && isReadOnlyFileV10(tk))){
    showToast("Filen är skrivskyddad. Kopiera den först.",false);
    return;
  }
  if(!isValidTaktikV11(tk)){
    showToast("Lägg till minst ett steg innan du sparar filmen",false);
    cloudStatus("⚠️ Minst ett steg krävs för att spara taktikfilm","#e8c84a");
    return;
  }
  if(!tk.folder)tk.folder="Taktik";
  delete tk._isDraft;

  function upsertLocal(savedId){
    if(savedId)tk.dbId=savedId;
    var idx=taktikFilmer.findIndex(function(x){
      return tk.dbId && x.dbId && String(x.dbId)===String(tk.dbId);
    });
    if(idx>=0)taktikFilmer[idx]=tk;
    else if(!taktikFilmer.some(function(x){return x===tk;}))taktikFilmer.push(tk);
  }

  function patchExisting(id){
    tk.dbId=id;
    return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+id,{
      method:"PATCH",
      headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
      body:JSON.stringify({name:tk.name,data:normalizeTaktikMetaV11(tk),type:"taktikfilm",folder:tk.folder})
    }).then(function(r){return r.json();}).then(function(){
      upsertLocal(id);
      cloudStatus("✅ Film uppdaterad: "+tk.name,"#4ae87a");
      showToast("Film sparad!");
      setTimeout(function(){cloudLoadTaktik();},400);
    });
  }

  if(tk.dbId){
    patchExisting(tk.dbId).catch(function(err){cloudStatus("❌ Fel: "+err.message,"#e84a4a");showToast("Kunde inte spara film",false);});
    return;
  }

  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.taktikfilm&name=eq."+encodeURIComponent(tk.name)+"&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(existing){
      if(Array.isArray(existing)){
        var same=existing.find(function(row){
          var data=row.data||{};
          return row.id && data.steps && data.steps.length>=2;
        });
        if(same&&same.id)return patchExisting(same.id);
      }
      return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{
        method:"POST",
        headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
        body:JSON.stringify({name:tk.name,data:normalizeTaktikMetaV11(tk),type:"taktikfilm",folder:tk.folder})
      }).then(function(r){return r.json();}).then(function(data){
        if(data&&data[0]&&data[0].id){
          upsertLocal(data[0].id);
          cloudStatus("✅ Film sparad: "+tk.name,"#4ae87a");
          showToast("Film sparad!");
          setTimeout(function(){cloudLoadTaktik();},400);
        }else{
          var errMsg=(data&&data.message)?data.message:"Kunde inte spara film";
          cloudStatus("❌ "+errMsg,"#e84a4a");
          showToast(errMsg,false);
        }
      });
    })
    .catch(function(err){cloudStatus("❌ Anslutningsfel: "+err.message,"#e84a4a");showToast("Kunde inte spara film",false);});
}
function cloudLoadTaktik(){
  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.taktikfilm&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){
      if(!Array.isArray(data))return;
      var byKey={};
      data.filter(function(row){return row.type==="taktikfilm";}).forEach(function(row){
        var tk=row.data||{};
        if(!isValidTaktikV11(tk))return; // göm 0-stegs/start-only-dubbletter
        tk.dbId=row.id;
        if(!tk.folder)tk.folder=row.folder||"Taktik";
        var meta=(typeof fileMetaStorageV10==="function"?fileMetaStorageV10(tk):(tk._meta||{}));
        tk._meta=meta;
        var owner=meta&&meta.ownerId?meta.ownerId:"legacy";
        var key=owner+"::"+((row.name||tk.name||"").trim().toLowerCase()||("id:"+row.id));
        if(!byKey[key])byKey[key]=tk; // order desc: behåll nyaste
      });
      taktikFilmer=Object.keys(byKey).map(function(k){return byKey[k];});
      var tfseen={};taktikFolders=["Taktik","Träning"];tfseen["Taktik"]=true;tfseen["Träning"]=true;
      taktikFilmer.forEach(function(tk){if(tk.folder&&!tfseen[tk.folder]){tfseen[tk.folder]=true;taktikFolders.push(tk.folder);}});
      if(typeof renderTaktikList==="function")renderTaktikList();
      cloudStatus(taktikFilmer.length+" taktikfilmer laddade","#4ae87a");
    }).catch(function(err){cloudStatus("❌ Fel: "+err.message,"#e84a4a");});
}
function deleteTaktik(idx){
  var tk=taktikFilmer[idx];
  if(!tk)return;
  if(tk._readOnly || (typeof isReadOnlyFileV10==="function" && isReadOnlyFileV10(tk))){
    showToast("Du kan inte radera någon annans fil",false);
    return;
  }
  function localRemove(){
    taktikFilmer.splice(idx,1);
    if(typeof renderTaktikList==="function")renderTaktikList();
  }
  if(tk.dbId){
    fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{
      method:"DELETE",
      headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"})
    }).then(function(){
      localRemove();
      showToast("Taktikfilm raderad!");
      setTimeout(function(){cloudLoadTaktik();},300);
    }).catch(function(err){cloudStatus("❌ Raderingsfel: "+err.message,"#e84a4a");showToast("Kunde inte radera",false);});
  }else{
    localRemove();
    showToast("Taktikfilm raderad!");
  }
}
function loadMatcher(){
  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.match&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){
      if(Array.isArray(data)){
        var seen={};matcher=[];
        data.forEach(function(row){
          var m=row.data||{};
          var hasPlayers=(m.startade&&m.startade.length)||(m.avbytare&&m.avbytare.length);
          var hasLineups=(m.uppstallningar&&m.uppstallningar.length);
          if(!m.datum||!m.motstand||(!hasPlayers&&!hasLineups))return; // göm tomma 0-matcher
          m.dbId=row.id;
          var key=String(row.id);
          if(!seen[key]){seen[key]=true;matcher.push(m);}
        });
      }
      if(typeof renderStatistik==="function")renderStatistik();
      if(typeof renderSparadeMatcherList==="function")renderSparadeMatcherList();
    }).catch(function(){});
}
/* === slut v11 === */

/* v12 delete final */

function deleteTaktik(idx){
  var tk=taktikFilmer[idx];
  if(!tk)return;
  if(tk._readOnly || (typeof isReadOnlyFileV10==="function" && isReadOnlyFileV10(tk))){
    showToast("Du kan inte radera någon annans fil",false);
    return;
  }
  if(tk.dbId){
    fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{
      method:"DELETE",
      headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"})
    }).then(function(){
      showToast("Taktikfilm raderad!");
      cloudLoadTaktik();
    }).catch(function(err){cloudStatus("❌ Raderingsfel: "+err.message,"#e84a4a");showToast("Kunde inte radera",false);});
  }else{
    taktikFilmer.splice(idx,1);
    renderTaktikList();
    showToast("Taktikfilm raderad!");
  }
}
window.deleteTaktik=deleteTaktik;

/* v12 match list final */

function dedupeMatcherV12(){
  var seen={};
  matcher=(matcher||[]).filter(function(m){
    var hasPlayers=(m.startade&&m.startade.length)||(m.avbytare&&m.avbytare.length);
    var hasLineups=(m.uppstallningar&&m.uppstallningar.length);
    if(!m.datum||!m.motstand||(!hasPlayers&&!hasLineups))return false;
    var key=m.dbId?("id:"+m.dbId):(m.datum+"::"+m.motstand);
    if(seen[key])return false;
    seen[key]=true;
    return true;
  });
}
var _renderSparadeMatcherListV12=typeof renderSparadeMatcherList==="function"?renderSparadeMatcherList:null;
if(_renderSparadeMatcherListV12){
  renderSparadeMatcherList=function(){
    dedupeMatcherV12();
    return _renderSparadeMatcherListV12.apply(this,arguments);
  };
}

/* === v13: ny taktikfilm ska inte molnsparas som 0-stegsfilm === */
var _cloudSaveTaktik_v13 = cloudSaveTaktik;
cloudSaveTaktik = function(tk){
  if(!tk || !tk.steps || tk.steps.length < 2){
    showToast("Lägg till minst ett steg innan du sparar filmen", false);
    cloudStatus("⚠️ Minst ett steg krävs för att spara taktikfilm", "#e8c84a");
    return;
  }
  return _cloudSaveTaktik_v13(tk);
};
function purgeEmptyLocalTaktikV13(){
  taktikFilmer=(taktikFilmer||[]).filter(function(tk){
    return tk && tk.steps && (tk._isDraft || tk.steps.length>=2);
  });
}
var _renderTaktikList_v13 = renderTaktikList;
renderTaktikList = function(){
  purgeEmptyLocalTaktikV13();
  return _renderTaktikList_v13.apply(this, arguments);
};
/* === slut v13 === */



/* === v15: stabila stegknappar + ren start för ny taktikfilm === */
function replaceBtnHandlerV15(id,handler){
  var old=document.getElementById(id);
  if(!old)return null;
  var neu=old.cloneNode(true);
  old.parentNode.replaceChild(neu,old);
  neu.addEventListener("click",handler);
  return neu;
}
function getCleanTaktikStartSnapV15(){
  // Ny taktikfilm ska inte ärva live-positioner från en nyss raderad/redigerad film.
  var f=(typeof getCurrentFormationForReset==="function")?getCurrentFormationForReset():"4-4-2";
  try{
    initPlayers(f);
  }catch(e){
    initPlayers("4-4-2");
  }
  ball={x:W/2,y:H/2};
  arrows=[];labels=[];freehandPaths=[];zones=[];movementPaths=[];
  selectedId=null;arrowStart=null;arrowCurrent=null;freehandCurrent=null;zoneStart=null;zonePreview=null;movementCurrent=null;
  setMode("move");
  render();
  return currentSnap();
}
function saveEditStepWithPropagationV15(){
  if(editingTaktikIdx===null)return;
  var tk=taktikFilmer[editingTaktikIdx];
  if(!tk||!tk.steps||!tk.steps[editingStepIdx])return;

  saveTaktikUndo();

  var oldStep=JSON.parse(JSON.stringify(tk.steps[editingStepIdx]));
  var snap=currentSnap();
  var lbl=document.getElementById("edit-step-name-inp").value.trim();
  if(lbl)snap.label=lbl;

  if(typeof propagateManualStepPositionsV14==="function"){
    propagateManualStepPositionsV14(tk,editingStepIdx,oldStep,snap);
  }

  if(snap.movementPaths&&snap.movementPaths.length){
    snap.movementPaths.forEach(function(mp){
      if(!mp.pts||!mp.pts.length)return;
      var ep=mp.pts[mp.pts.length-1];
      for(var si=editingStepIdx+1;si<tk.steps.length;si++){
        var fs=tk.steps[si];if(!fs)continue;
        if(typeof _stepHasMovementForV14==="function" && _stepHasMovementForV14(fs,mp.playerId))break;
        if(typeof _setPosV14==="function")_setPosV14(fs,mp.playerId,ep);
      }
    });
  }

  tk.steps[editingStepIdx]=snap;
  movementPaths=[];
  if(playback)playback.tk=tk;
  showToast("Steg sparat!");
  cloudStatus("✅ Steg sparat","#4ae87a");
  updateEditStepUI();
}
function initStableStepButtonsV15(){
  replaceBtnHandlerV15("btn-edit-step-prev",function(){
    if(editingTaktikIdx===null||editingStepIdx<=0)return;
    editingStepIdx--;
    updateEditStepUI();
  });
  replaceBtnHandlerV15("btn-edit-step-next",function(){
    if(editingTaktikIdx===null)return;
    var tk=taktikFilmer[editingTaktikIdx];
    if(!tk||editingStepIdx>=tk.steps.length-1)return;
    editingStepIdx++;
    updateEditStepUI();
  });
  replaceBtnHandlerV15("btn-edit-add-step",function(){
    if(editingTaktikIdx===null)return;
    var tk=taktikFilmer[editingTaktikIdx];
    if(!tk||!tk.steps)return;
    saveTaktikUndo();
    var snap=currentSnap();
    tk.steps.splice(editingStepIdx+1,0,snap);
    editingStepIdx++;
    updateEditStepUI();
  });
  replaceBtnHandlerV15("btn-edit-del-step",function(){
    if(editingTaktikIdx===null||editingStepIdx===0)return;
    var tk=taktikFilmer[editingTaktikIdx];
    if(!tk||!tk.steps)return;
    saveTaktikUndo();
    tk.steps.splice(editingStepIdx,1);
    editingStepIdx=Math.min(editingStepIdx,tk.steps.length-1);
    updateEditStepUI();
  });
  replaceBtnHandlerV15("btn-edit-update-step",function(){
    saveEditStepWithPropagationV15();
  });
  replaceBtnHandlerV15("btn-edit-update-step2",function(){
    saveEditStepWithPropagationV15();
  });
  replaceBtnHandlerV15("new-taktik-ok",function(){
    var name=document.getElementById("taktik-name-inp").value.trim();
    if(!name)return;
    document.getElementById("modal-new-taktik").classList.add("hidden");

    // Stoppa eventuell gammal film/redigering först.
    if(animFrame)cancelAnimationFrame(animFrame);
    playback=null;
    editingTaktikIdx=null;
    editingStepIdx=0;
    isEditingTaktik=false;
    activeTaktik=null;

    var cleanSnap=getCleanTaktikStartSnapV15();
    var newFilm={name:name,folder:"Taktik",steps:[cleanSnap],_isDraft:true};
    taktikFilmer.push(newFilm);
    renderTaktikList();
    startPlayback(taktikFilmer.length-1);
    showToast("Utkast skapat – lägg till minst ett steg innan sparning");
  });
}
initStableStepButtonsV15();
/* === slut v15 === */



/* === v16: autospara aktuellt steg lokalt vid stegbyte === */
var _autoSavingStepV16=false;

function autoSaveCurrentStepLocalV16(){
  if(_autoSavingStepV16)return;
  if(editingTaktikIdx===null)return;
  var tk=taktikFilmer[editingTaktikIdx];
  if(!tk||!tk.steps||!tk.steps[editingStepIdx])return;

  _autoSavingStepV16=true;
  try{
    var oldStep=JSON.parse(JSON.stringify(tk.steps[editingStepIdx]));
    var snap=currentSnap();
    var inp=document.getElementById("edit-step-name-inp");
    var lbl=inp?inp.value.trim():"";
    if(lbl)snap.label=lbl;

    // Behåll samma framåtlogik som manuell "Spara steg", men utan toast.
    if(typeof propagateManualStepPositionsV14==="function"){
      propagateManualStepPositionsV14(tk,editingStepIdx,oldStep,snap);
    }

    if(snap.movementPaths&&snap.movementPaths.length){
      snap.movementPaths.forEach(function(mp){
        if(!mp.pts||!mp.pts.length)return;
        var ep=mp.pts[mp.pts.length-1];
        for(var si=editingStepIdx+1;si<tk.steps.length;si++){
          var fs=tk.steps[si];if(!fs)continue;
          if(typeof _stepHasMovementForV14==="function" && _stepHasMovementForV14(fs,mp.playerId))break;
          if(typeof _setPosV14==="function")_setPosV14(fs,mp.playerId,ep);
        }
      });
    }

    tk.steps[editingStepIdx]=snap;
    if(playback)playback.tk=tk;
  }finally{
    _autoSavingStepV16=false;
  }
}

function goToEditStepV16(targetIdx){
  if(editingTaktikIdx===null)return;
  var tk=taktikFilmer[editingTaktikIdx];
  if(!tk||!tk.steps)return;
  if(targetIdx<0||targetIdx>=tk.steps.length)return;

  autoSaveCurrentStepLocalV16();
  movementPaths=[];
  selectedId=null;
  editingStepIdx=targetIdx;
  updateEditStepUI();
}

function initAutoSaveStepNavigationV16(){
  replaceBtnHandlerV15("btn-edit-step-prev",function(){
    if(editingTaktikIdx===null)return;
    goToEditStepV16(editingStepIdx-1);
  });

  replaceBtnHandlerV15("btn-edit-step-next",function(){
    if(editingTaktikIdx===null)return;
    goToEditStepV16(editingStepIdx+1);
  });

  replaceBtnHandlerV15("btn-edit-add-step",function(){
    if(editingTaktikIdx===null)return;
    var tk=taktikFilmer[editingTaktikIdx];
    if(!tk||!tk.steps)return;

    autoSaveCurrentStepLocalV16();
    saveTaktikUndo();

    var snap=currentSnap();
    var inp=document.getElementById("edit-step-name-inp");
    if(inp&&inp.value.trim())snap.label=inp.value.trim();

    tk.steps.splice(editingStepIdx+1,0,snap);
    editingStepIdx++;
    updateEditStepUI();
  });

  replaceBtnHandlerV15("btn-edit-del-step",function(){
    if(editingTaktikIdx===null||editingStepIdx===0)return;
    var tk=taktikFilmer[editingTaktikIdx];
    if(!tk||!tk.steps)return;

    saveTaktikUndo();
    tk.steps.splice(editingStepIdx,1);
    editingStepIdx=Math.min(editingStepIdx,tk.steps.length-1);
    updateEditStepUI();
  });

  replaceBtnHandlerV15("btn-edit-taktik-save",function(){
    if(editingTaktikIdx===null)return;
    autoSaveCurrentStepLocalV16();
    var tk=taktikFilmer[editingTaktikIdx];
    if(!tk)return;
    cloudSaveTaktik(tk);
  });
}

// Gör även klick på steglistans rader autosparande.
// Eftersom renderEditSteps bygger om listan varje gång wrappar vi funktionen.
var _renderEditSteps_v16 = renderEditSteps;
renderEditSteps = function(tk){
  _renderEditSteps_v16(tk);
  var list=document.getElementById("edit-taktik-steps");
  if(!list)return;
  Array.prototype.forEach.call(list.querySelectorAll(".row"),function(row){
    var idx=parseInt(row.dataset.idx,10);
    if(isNaN(idx))return;
    row.onclick=function(e){
      if(e.target.tagName==="BUTTON"||e.target.tagName==="INPUT")return;
      goToEditStepV16(idx);
    };
  });
};

initAutoSaveStepNavigationV16();
/* === slut v16 === */



/* === v17: osparade ändringar + tydlig sparbekräftelse === */
var taktikDirtyV17 = false;

function markTaktikDirtyV17(){
  taktikDirtyV17 = true;
}

function clearTaktikDirtyV17(){
  taktikDirtyV17 = false;
}

function showSavedConfirmationV17(msg){
  try{
    showToast(msg || "Film sparad!");
  }catch(e){}
  try{
    cloudStatus("✅ " + (msg || "Film sparad"), "#4ae87a");
  }catch(e){}
}

// Markera osparat vid autosave lokalt
var _autoSaveCurrentStepLocalV16_base = autoSaveCurrentStepLocalV16;
autoSaveCurrentStepLocalV16 = function(){
  var res = _autoSaveCurrentStepLocalV16_base.apply(this, arguments);
  if(editingTaktikIdx !== null){
    markTaktikDirtyV17();
  }
  return res;
};

// Markera osparat även vid manuellt steg-save
var _saveEditStepWithPropagationV15_base = saveEditStepWithPropagationV15;
saveEditStepWithPropagationV15 = function(){
  var res = _saveEditStepWithPropagationV15_base.apply(this, arguments);
  markTaktikDirtyV17();
  return res;
};

// När man faktiskt sparar filmen -> clean + tydlig grön feedback
var _cloudSaveTaktik_v17 = cloudSaveTaktik;
cloudSaveTaktik = function(tk){
  var result = _cloudSaveTaktik_v17.apply(this, arguments);

  Promise.resolve(result).then(function(){
    clearTaktikDirtyV17();
    showSavedConfirmationV17("Film sparad");
  }).catch(function(){});

  return result;
};

// Varning om man försöker lämna/redigera/stänga med osparat
function confirmDiscardUnsavedV17(){
  if(!taktikDirtyV17) return true;
  return confirm("Du har osparade ändringar i taktiken. Vill du lämna utan att spara?");
}

// Browser/app refresh
window.addEventListener("beforeunload", function(e){
  if(!taktikDirtyV17) return;
  e.preventDefault();
  e.returnValue = "";
});

// Stop playback / lämna editor
var _stopPlayback_v17 = stopPlayback;
stopPlayback = function(){
  if(!confirmDiscardUnsavedV17()) return;
  clearTaktikDirtyV17();
  return _stopPlayback_v17.apply(this, arguments);
};

// Panelbyte bort från taktik
document.querySelectorAll(".tab").forEach(function(tab){
  tab.addEventListener("click", function(e){
    var target = tab.getAttribute("data-panel");
    if(target !== "taktik" && isEditingTaktik && taktikDirtyV17){
      if(!confirmDiscardUnsavedV17()){
        e.stopImmediatePropagation();
        e.preventDefault();
        return false;
      }
      clearTaktikDirtyV17();
    }
  }, true);
});

/* === slut v17 === */



/* === v18: robust osparat-varning, Lagets-lista och dölj rörelse i fullscreen === */

// 1) Dirty-flagga ska sättas så fort planen ändras i taktikredigering.
function markTaktikDirtyV18(){
  if(editingTaktikIdx!==null || isEditingTaktik || playback){
    taktikDirtyV17=true;
  }
}
["touchend","mouseup"].forEach(function(evt){
  document.addEventListener(evt,function(){
    if(editingTaktikIdx!==null || isEditingTaktik)markTaktikDirtyV18();
  },true);
});

// Markera osparat vid stegoperationer
["btn-edit-add-step","btn-edit-del-step","btn-edit-update-step","btn-edit-update-step2"].forEach(function(id){
  var b=document.getElementById(id);
  if(b)b.addEventListener("click",function(){markTaktikDirtyV18();},true);
});

// 2) Bekräfta innan man lämnar taktikfilmen/editor.
function confirmUnsavedTaktikV18(){
  if(!taktikDirtyV17)return true;
  return confirm("Du har osparade ändringar i taktiken. Vill du lämna utan att spara?");
}

var _exitEditTaktik_v18 = exitEditTaktik;
exitEditTaktik = function(){
  if(!confirmUnsavedTaktikV18())return;
  taktikDirtyV17=false;
  return _exitEditTaktik_v18.apply(this,arguments);
};

var _stopPlayback_v18 = stopPlayback;
stopPlayback = function(){
  if(!confirmUnsavedTaktikV18())return;
  taktikDirtyV17=false;
  return _stopPlayback_v18.apply(this,arguments);
};

// Panelbyte bort från taktik: kör i capture så vi hinner stoppa gamla listenern.
document.querySelectorAll(".tab").forEach(function(tab){
  tab.addEventListener("click",function(e){
    var target=tab.getAttribute("data-panel");
    if(target && target!=="taktik" && (editingTaktikIdx!==null || isEditingTaktik || playback) && taktikDirtyV17){
      if(!confirmUnsavedTaktikV18()){
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }
      taktikDirtyV17=false;
    }
  },true);
});

// Vid riktig molnsparning: autospara aktuellt steg först, sedan rensa dirty när save-anropet gått iväg.
var _cloudSaveTaktik_v18=cloudSaveTaktik;
cloudSaveTaktik=function(tk){
  if(editingTaktikIdx!==null && typeof autoSaveCurrentStepLocalV16==="function"){
    autoSaveCurrentStepLocalV16();
  }
  var res=_cloudSaveTaktik_v18.apply(this,arguments);
  setTimeout(function(){
    taktikDirtyV17=false;
    showToast("Film sparad!");
    cloudStatus("✅ Film sparad","#4ae87a");
  },450);
  return res;
};

// 3) Delning: Lagets ska visa filer i samma lag även om shared-flaggan ligger i data._meta.
// Äldre v10 krävde sharedWithTeam; här normaliserar vi metadata och gör delning säkrare.
function sameTeamV18(obj){
  var p=getProfileSafeV10&&getProfileSafeV10();
  var m=fileMetaV10?fileMetaV10(obj):{};
  if(!p||!m)return false;
  return String(m.teamId||m.teamCode||"")===String(p.teamId||p.teamCode||"");
}
isSameTeamSharedV10=function(obj){
  var m=fileMetaV10?fileMetaV10(obj):{};
  return sameTeamV18(obj) && !isMineV10(obj) && !!m.sharedWithTeam;
};
function refreshAfterShareV18(){
  if(typeof cloudLoadSaves==="function")cloudLoadSaves();
  if(typeof cloudLoadTaktik==="function")cloudLoadTaktik();
}
var _patchFormationShareV10_v18=patchFormationShareV10;
patchFormationShareV10=function(s,share){
  if(!s||!s.id)return;
  if(!isMineV10(s)){showToast("Du kan inte ändra delning på någon annans fil",false);return;}
  var newState=updateShareMetaV10(s.state,share,false);
  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+s.id,{
    method:"PATCH",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify({data:newState})
  }).then(function(){
    s.state=newState;
    s._meta=newState._meta;
    showToast(share?"Delad med laget":"Inte längre delad");
    setTimeout(refreshAfterShareV18,300);
  }).catch(function(err){showToast("Kunde inte ändra delning",false);cloudStatus("❌ "+err.message,"#e84a4a");});
};
var _patchTaktikShareV10_v18=patchTaktikShareV10;
patchTaktikShareV10=function(tk,share){
  if(!tk||!tk.dbId)return;
  if(!isMineV10(tk)){showToast("Du kan inte ändra delning på någon annans fil",false);return;}
  var newTk=updateShareMetaV10(tk,share,false);
  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{
    method:"PATCH",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify({data:newTk})
  }).then(function(){
    Object.keys(newTk).forEach(function(k){tk[k]=newTk[k];});
    showToast(share?"Film delad med laget":"Film inte längre delad");
    setTimeout(refreshAfterShareV18,300);
  }).catch(function(err){showToast("Kunde inte ändra delning",false);cloudStatus("❌ "+err.message,"#e84a4a");});
};

// 4) Fullscreen: rörelseknappen ska inte visas i formations-/coachboard-fullscreen.
function hideMovementInFullscreenV18(){
  var b=document.getElementById("fs-tb-movement");
  if(b)b.style.display="none";
}
var _syncFullscreenToolButtons_v18=typeof syncFullscreenToolButtons==="function"?syncFullscreenToolButtons:null;
if(_syncFullscreenToolButtons_v18){
  syncFullscreenToolButtons=function(){
    _syncFullscreenToolButtons_v18.apply(this,arguments);
    hideMovementInFullscreenV18();
  };
}
var _enterFullscreenPortrait_v18=typeof enterFullscreenPortrait==="function"?enterFullscreenPortrait:null;
if(_enterFullscreenPortrait_v18){
  enterFullscreenPortrait=function(){
    var r=_enterFullscreenPortrait_v18.apply(this,arguments);
    hideMovementInFullscreenV18();
    return r;
  };
}
hideMovementInFullscreenV18();

/* === slut v18 === */



/* === v19: direkt fix för osparat-varning + Lagets visar delade filer === */

// Dirty ska sättas vid alla praktiska ändringar i taktikläget.
function markDirtyV19(){
  if(editingTaktikIdx!==null || isEditingTaktik || playback){
    taktikDirtyV17=true;
  }
}

// Viktigt: wrappern i v17/v18 missar ibland om steget inte autosparas.
// Här markerar vi dirty redan när användaren interagerar med planen i taktikläge.
["touchstart","touchmove","touchend","mousedown","mousemove","mouseup"].forEach(function(evt){
  var el=document.getElementById("pitch-svg");
  if(el)el.addEventListener(evt,function(){
    if(editingTaktikIdx!==null || isEditingTaktik || playback)markDirtyV19();
  },true);
});

// Markera dirty vid stegknappar och namnändringar.
["btn-edit-add-step","btn-edit-del-step","btn-edit-update-step","btn-edit-update-step2"].forEach(function(id){
  var b=document.getElementById(id);
  if(b)b.addEventListener("click",markDirtyV19,true);
});
var stepNameV19=document.getElementById("edit-step-name-inp");
if(stepNameV19)stepNameV19.addEventListener("input",markDirtyV19,true);

function confirmUnsavedV19(){
  if(!taktikDirtyV17)return true;
  return confirm("Du har osparade ändringar i taktiken. Vill du lämna utan att spara?");
}

// Ersätt faktiska knappar så gamla bundna listeners inte smiter förbi varningen.
function replaceClickV19(id,fn){
  var old=document.getElementById(id);
  if(!old)return;
  var neu=old.cloneNode(true);
  old.parentNode.replaceChild(neu,old);
  neu.addEventListener("click",fn);
  return neu;
}

replaceClickV19("btn-edit-taktik-exit",function(){
  if(!confirmUnsavedV19())return;
  taktikDirtyV17=false;
  if(typeof exitEditTaktik==="function"){
    // Kör originalbeteendet utan att ny wrapper stoppar igen.
    movementPaths=[];selectedId=null;editingTaktikIdx=null;editingStepIdx=0;isEditingTaktik=false;
    var ui=document.getElementById("edit-taktik-ui");if(ui)ui.style.display="none";
    var no=document.getElementById("no-rec-ui");if(no)no.style.display="block";
    if(typeof renderTaktikList==="function")renderTaktikList();
  }
});

replaceClickV19("btn-stop-play",function(){
  if(!confirmUnsavedV19())return;
  taktikDirtyV17=false;
  if(animFrame)cancelAnimationFrame(animFrame);
  playback=null;movementPaths=[];selectedId=null;
  var tb=document.getElementById("taktikbar");if(tb)tb.style.display="none";
  var bp=document.getElementById("bottompanel");if(bp)bp.classList.remove("hidden");
  movementPaths=[];selectedId=null;editingTaktikIdx=null;editingStepIdx=0;isEditingTaktik=false;
  var ui=document.getElementById("edit-taktik-ui");if(ui)ui.style.display="none";
  var no=document.getElementById("no-rec-ui");if(no)no.style.display="block";
  if(typeof renderTaktikList==="function")renderTaktikList();
  if(typeof render==="function")render();
});

// Fånga panelbyte på säkrare nivå.
document.addEventListener("click",function(e){
  var tab=e.target.closest&&e.target.closest(".tab");
  if(!tab)return;
  var target=tab.getAttribute("data-panel");
  if(target && target!=="taktik" && (editingTaktikIdx!==null || isEditingTaktik || playback) && taktikDirtyV17){
    if(!confirmUnsavedV19()){
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
    taktikDirtyV17=false;
  }
},true);

// När riktig molnsparning görs: autospara aktuellt steg och rensa dirty med bekräftelse.
var _cloudSaveTaktik_v19=cloudSaveTaktik;
cloudSaveTaktik=function(tk){
  if(editingTaktikIdx!==null && typeof autoSaveCurrentStepLocalV16==="function"){
    autoSaveCurrentStepLocalV16();
  }
  var res=_cloudSaveTaktik_v19.apply(this,arguments);
  setTimeout(function(){
    taktikDirtyV17=false;
    showToast("Film sparad!");
    cloudStatus("✅ Film sparad","#4ae87a");
  },600);
  return res;
};

// Lagets: visa alla filer i samma lag som är markerade sharedWithTeam,
// även dina egna. Det gör att man kan funktionstesta med bara en användare.
function isSameTeamSharedV19(obj){
  var p=getProfileSafeV10&&getProfileSafeV10();
  var m=fileMetaV10?fileMetaV10(obj):{};
  if(!p||!m)return false;
  var fileTeam=String(m.teamId||m.teamCode||"");
  var myTeam=String(p.teamId||p.teamCode||"");
  return !!m.sharedWithTeam && fileTeam && myTeam && fileTeam===myTeam;
}
isSameTeamSharedV10=isSameTeamSharedV19;
isFileVisibleInScopeV10=function(obj,scope){
  return scope==="team" ? isSameTeamSharedV19(obj) : isMineV10(obj);
};

// Rendera om listor efter att filtren ändrats.
if(typeof renderTaktikList==="function")renderTaktikList();
if(typeof renderSavesList==="function")renderSavesList();

/* === slut v19 === */



/* === v20: spara ska rensa osparat-flaggan på riktigt === */
var suppressDirtyV20=false;

function markDirtyV20Safe(){
  if(suppressDirtyV20)return;
  if(editingTaktikIdx!==null || isEditingTaktik || playback){
    taktikDirtyV17=true;
  }
}

// Ersätt dirty-markering på planen med en säkrare variant.
// Obs: gamla listeners finns kvar, men suppressDirtyV20 stoppar effekten runt sparning.
["touchstart","touchmove","touchend","mousedown","mousemove","mouseup"].forEach(function(evt){
  var el=document.getElementById("pitch-svg");
  if(el)el.addEventListener(evt,markDirtyV20Safe,true);
});

function saveCurrentTaktikFileV20(){
  if(editingTaktikIdx===null)return;
  suppressDirtyV20=true;
  try{
    if(typeof autoSaveCurrentStepLocalV16==="function"){
      autoSaveCurrentStepLocalV16();
    }
    var tk=taktikFilmer[editingTaktikIdx];
    if(!tk)return;
    cloudSaveTaktik(tk);
    taktikDirtyV17=false;
    showToast("Film sparad!");
    cloudStatus("✅ Film sparad","#4ae87a");
    setTimeout(function(){
      taktikDirtyV17=false;
      suppressDirtyV20=false;
    },900);
  }catch(e){
    suppressDirtyV20=false;
    throw e;
  }
}

// Byt ut själva spara-knappen så den inte går via gammal handler som kan sätta dirty igen.
if(typeof replaceClickV19==="function"){
  replaceClickV19("btn-edit-taktik-save",saveCurrentTaktikFileV20);
}else if(typeof replaceBtnHandlerV15==="function"){
  replaceBtnHandlerV15("btn-edit-taktik-save",saveCurrentTaktikFileV20);
}

// Justera confirm så den alltid respekterar senaste clean-state.
confirmUnsavedV19=function(){
  if(!taktikDirtyV17)return true;
  return confirm("Du har osparade ändringar i taktiken. Vill du lämna utan att spara?");
};

/* === slut v20 === */



/* === v21: osparat-varning baserad på faktisk ändring, inte dirty-flagga === */
var savedTaktikSnapshotV21 = null;

function normalizeTaktikForCompareV21(tk){
  if(!tk)return "";
  try{
    var c=JSON.parse(JSON.stringify(tk));
    delete c._readOnly;
    delete c._isDraft;
    delete c._meta;
    delete c.dbId;
    return JSON.stringify(c);
  }catch(e){
    return "";
  }
}

function currentEditingTaktikV21(){
  if(editingTaktikIdx===null)return null;
  return taktikFilmer && taktikFilmer[editingTaktikIdx] ? taktikFilmer[editingTaktikIdx] : null;
}

function refreshSavedSnapshotV21(){
  var tk=currentEditingTaktikV21();
  savedTaktikSnapshotV21 = normalizeTaktikForCompareV21(tk);
  taktikDirtyV17=false;
}

function hasUnsavedTaktikChangesV21(){
  var tk=currentEditingTaktikV21();
  if(!tk)return false;

  if(typeof autoSaveCurrentStepLocalV16==="function"){
    try{autoSaveCurrentStepLocalV16();}catch(e){}
  }

  var now=normalizeTaktikForCompareV21(tk);
  if(savedTaktikSnapshotV21===null){
    savedTaktikSnapshotV21=now;
    return false;
  }
  return now!==savedTaktikSnapshotV21;
}

function confirmUnsavedV21(){
  if(!hasUnsavedTaktikChangesV21())return true;
  return confirm("Du har osparade ändringar i taktiken. Vill du lämna utan att spara?");
}

// När man öppnar/startar en film: sätt baslinjen efter att aktuell film laddats.
var _startPlayback_v21 = startPlayback;
startPlayback = function(idx){
  var r=_startPlayback_v21.apply(this,arguments);
  setTimeout(refreshSavedSnapshotV21,80);
  return r;
};

// Spara-knappen: autospara aktuellt steg, molnspara filmen och sätt ny baslinje.
function saveCurrentTaktikFileV21(){
  if(editingTaktikIdx===null)return;
  if(typeof autoSaveCurrentStepLocalV16==="function"){
    autoSaveCurrentStepLocalV16();
  }
  var tk=currentEditingTaktikV21();
  if(!tk)return;
  cloudSaveTaktik(tk);
  setTimeout(function(){
    refreshSavedSnapshotV21();
    showToast("Film sparad!");
    cloudStatus("✅ Film sparad","#4ae87a");
  },700);
}

// Ersätt Spara-knappen igen, efter alla tidigare patchar.
if(typeof replaceClickV19==="function"){
  replaceClickV19("btn-edit-taktik-save",saveCurrentTaktikFileV21);
}else if(typeof replaceBtnHandlerV15==="function"){
  replaceBtnHandlerV15("btn-edit-taktik-save",saveCurrentTaktikFileV21);
}else{
  var saveBtnV21=document.getElementById("btn-edit-taktik-save");
  if(saveBtnV21)saveBtnV21.addEventListener("click",saveCurrentTaktikFileV21,true);
}

// Ersätt lämna/stopp så de använder faktisk jämförelse.
if(typeof replaceClickV19==="function"){
  replaceClickV19("btn-edit-taktik-exit",function(){
    if(!confirmUnsavedV21())return;
    savedTaktikSnapshotV21=null;
    taktikDirtyV17=false;
    movementPaths=[];selectedId=null;editingTaktikIdx=null;editingStepIdx=0;isEditingTaktik=false;
    var ui=document.getElementById("edit-taktik-ui");if(ui)ui.style.display="none";
    var no=document.getElementById("no-rec-ui");if(no)no.style.display="block";
    if(typeof renderTaktikList==="function")renderTaktikList();
  });
  replaceClickV19("btn-stop-play",function(){
    if(!confirmUnsavedV21())return;
    savedTaktikSnapshotV21=null;
    taktikDirtyV17=false;
    if(animFrame)cancelAnimationFrame(animFrame);
    playback=null;movementPaths=[];selectedId=null;
    var tb=document.getElementById("taktikbar");if(tb)tb.style.display="none";
    var bp=document.getElementById("bottompanel");if(bp)bp.classList.remove("hidden");
    editingTaktikIdx=null;editingStepIdx=0;isEditingTaktik=false;
    var ui=document.getElementById("edit-taktik-ui");if(ui)ui.style.display="none";
    var no=document.getElementById("no-rec-ui");if(no)no.style.display="block";
    if(typeof renderTaktikList==="function")renderTaktikList();
    if(typeof render==="function")render();
  });
}

// Panelbyte använder också faktisk jämförelse.
document.addEventListener("click",function(e){
  var tab=e.target.closest&&e.target.closest(".tab");
  if(!tab)return;
  var target=tab.getAttribute("data-panel");
  if(target && target!=="taktik" && (editingTaktikIdx!==null || isEditingTaktik || playback)){
    if(!confirmUnsavedV21()){
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
    savedTaktikSnapshotV21=null;
    taktikDirtyV17=false;
  }
},true);

window.addEventListener("beforeunload",function(e){
  if(!hasUnsavedTaktikChangesV21())return;
  e.preventDefault();
  e.returnValue="";
});

/* === slut v21 === */



/* === v22: ny taktikfilm får aldrig öppna fel/sorterad film === */
function startPlaybackByObjectV22(tk){
  if(!tk)return;
  var idx=taktikFilmer.indexOf(tk);
  if(idx<0){
    taktikFilmer.push(tk);
    idx=taktikFilmer.indexOf(tk);
  }
  startPlayback(idx);
  // Säkerställ att editorn verkligen pekar på exakt objektet vi skapade.
  editingTaktikIdx=taktikFilmer.indexOf(tk);
  playback={tk:tk,stepIndex:0,animating:false};
  editingStepIdx=0;
  isEditingTaktik=true;
  restoreSnap(tk.steps[0]);
  render();
  updateEditStepUI();
  if(typeof refreshSavedSnapshotV21==="function")setTimeout(refreshSavedSnapshotV21,80);
}

function createNewTaktikDraftV22(){
  var name=document.getElementById("taktik-name-inp").value.trim();
  if(!name)return;
  document.getElementById("modal-new-taktik").classList.add("hidden");

  if(animFrame)cancelAnimationFrame(animFrame);
  playback=null;
  editingTaktikIdx=null;
  editingStepIdx=0;
  isEditingTaktik=false;
  activeTaktik=null;

  var cleanSnap;
  if(typeof getCleanTaktikStartSnapV15==="function") cleanSnap=getCleanTaktikStartSnapV15();
  else cleanSnap=currentSnap();

  var newFilm={
    _draftUid:"draft_"+Date.now()+"_"+Math.random().toString(36).slice(2),
    name:name,
    folder:"Taktik",
    steps:[cleanSnap],
    _isDraft:true
  };

  taktikFilmer.push(newFilm);
  startPlaybackByObjectV22(newFilm);
  renderTaktikList();
  startPlaybackByObjectV22(newFilm);

  showToast("Utkast skapat – lägg till minst ett steg innan sparning");
}

// Byt ut ny-film-knappen sist, så gamla handlers inte kan öppna via fel index.
if(typeof replaceClickV19==="function"){
  replaceClickV19("new-taktik-ok",createNewTaktikDraftV22);
}else if(typeof replaceBtnHandlerV15==="function"){
  replaceBtnHandlerV15("new-taktik-ok",createNewTaktikDraftV22);
}else{
  var newOkV22=document.getElementById("new-taktik-ok");
  if(newOkV22){
    var cloneV22=newOkV22.cloneNode(true);
    newOkV22.parentNode.replaceChild(cloneV22,newOkV22);
    cloneV22.addEventListener("click",createNewTaktikDraftV22);
  }
}

// Säkrare render: utkast får ligga kvar men ska inte sorteras bort/ersättas.
var _renderTaktikList_v22 = renderTaktikList;
renderTaktikList = function(){
  var activeObj=(editingTaktikIdx!==null&&taktikFilmer[editingTaktikIdx])?taktikFilmer[editingTaktikIdx]:null;
  var res=_renderTaktikList_v22.apply(this,arguments);
  if(activeObj && activeObj._draftUid){
    var idx=taktikFilmer.indexOf(activeObj);
    if(idx>=0)editingTaktikIdx=idx;
  }
  return res;
};
/* === slut v22 === */



/* === v23: en enda källa för osparat-varning efter sparning === */
var lastTaktikSaveAtV23 = 0;

function forceCleanTaktikV23(){
  if(typeof autoSaveCurrentStepLocalV16==="function"){
    try{autoSaveCurrentStepLocalV16();}catch(e){}
  }
  if(typeof refreshSavedSnapshotV21==="function"){
    try{refreshSavedSnapshotV21();}catch(e){}
  }else if(typeof normalizeTaktikForCompareV21==="function" && typeof currentEditingTaktikV21==="function"){
    savedTaktikSnapshotV21=normalizeTaktikForCompareV21(currentEditingTaktikV21());
  }
  taktikDirtyV17=false;
  lastTaktikSaveAtV23=Date.now();
}

function hasUnsavedTaktikChangesV23(){
  // Skydd mot gamla listeners som sätter dirty precis efter spara-klick.
  if(Date.now()-lastTaktikSaveAtV23 < 2500)return false;

  if(typeof hasUnsavedTaktikChangesV21==="function"){
    return hasUnsavedTaktikChangesV21();
  }

  return !!taktikDirtyV17;
}

function confirmUnsavedUnifiedV23(){
  if(!hasUnsavedTaktikChangesV23())return true;
  return confirm("Du har osparade ändringar i taktiken. Vill du lämna utan att spara?");
}

// Tvinga ALLA tidigare confirm-funktioner att använda samma logik.
confirmUnsavedV21 = confirmUnsavedUnifiedV23;
confirmUnsavedV19 = confirmUnsavedUnifiedV23;
confirmUnsavedTaktikV18 = confirmUnsavedUnifiedV23;
confirmDiscardUnsavedV17 = confirmUnsavedUnifiedV23;

// Spara-knappen: sätt ren baslinje direkt, inte först efter timeout.
function saveCurrentTaktikFileV23(){
  if(editingTaktikIdx===null)return;
  if(typeof autoSaveCurrentStepLocalV16==="function"){
    autoSaveCurrentStepLocalV16();
  }
  var tk=(typeof currentEditingTaktikV21==="function")?currentEditingTaktikV21():taktikFilmer[editingTaktikIdx];
  if(!tk)return;

  // Baslinje sätts innan/vid save så gamla dirty-events inte kan ge falsk varning.
  if(typeof normalizeTaktikForCompareV21==="function"){
    savedTaktikSnapshotV21=normalizeTaktikForCompareV21(tk);
  }
  taktikDirtyV17=false;
  lastTaktikSaveAtV23=Date.now();

  cloudSaveTaktik(tk);

  setTimeout(function(){
    forceCleanTaktikV23();
    showToast("Film sparad!");
    cloudStatus("✅ Film sparad","#4ae87a");
  },400);
}

// Byt ut sparknappen igen, sist i filen.
if(typeof replaceClickV19==="function"){
  replaceClickV19("btn-edit-taktik-save",saveCurrentTaktikFileV23);
}else if(typeof replaceBtnHandlerV15==="function"){
  replaceBtnHandlerV15("btn-edit-taktik-save",saveCurrentTaktikFileV23);
}else{
  var saveBtnV23=document.getElementById("btn-edit-taktik-save");
  if(saveBtnV23){
    var saveCloneV23=saveBtnV23.cloneNode(true);
    saveBtnV23.parentNode.replaceChild(saveCloneV23,saveBtnV23);
    saveCloneV23.addEventListener("click",saveCurrentTaktikFileV23);
  }
}

// Byt ut lämna/stopp igen så de säkert använder unified confirm.
function closeTaktikEditorV23(){
  savedTaktikSnapshotV21=null;
  taktikDirtyV17=false;
  movementPaths=[];selectedId=null;editingTaktikIdx=null;editingStepIdx=0;isEditingTaktik=false;
  playback=null;
  var ui=document.getElementById("edit-taktik-ui");if(ui)ui.style.display="none";
  var no=document.getElementById("no-rec-ui");if(no)no.style.display="block";
  var tb=document.getElementById("taktikbar");if(tb)tb.style.display="none";
  var bp=document.getElementById("bottompanel");if(bp)bp.classList.remove("hidden");
  if(typeof renderTaktikList==="function")renderTaktikList();
  if(typeof render==="function")render();
}

if(typeof replaceClickV19==="function"){
  replaceClickV19("btn-edit-taktik-exit",function(){
    if(!confirmUnsavedUnifiedV23())return;
    closeTaktikEditorV23();
  });
  replaceClickV19("btn-stop-play",function(){
    if(!confirmUnsavedUnifiedV23())return;
    if(animFrame)cancelAnimationFrame(animFrame);
    closeTaktikEditorV23();
  });
}

// Panelbyte: fånga efter den senaste logiken.
document.addEventListener("click",function(e){
  var tab=e.target.closest&&e.target.closest(".tab");
  if(!tab)return;
  var target=tab.getAttribute("data-panel");
  if(target && target!=="taktik" && (editingTaktikIdx!==null || isEditingTaktik || playback)){
    if(!confirmUnsavedUnifiedV23()){
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
    closeTaktikEditorV23();
  }
},true);

window.addEventListener("beforeunload",function(e){
  if(!hasUnsavedTaktikChangesV23())return;
  e.preventDefault();
  e.returnValue="";
});

/* === slut v23 === */



/* === v24: Lagets är alltid skrivskyddad vy === */
function isTeamScopeV24(){
  return (typeof taktikScope!=="undefined" && taktikScope==="team") ||
         (typeof saveScope!=="undefined" && saveScope==="team");
}
function markOpenedFromTeamV24(obj){
  if(obj){
    obj._openedFromTeam=true;
    obj._readOnly=true;
  }
  return obj;
}
function isReadOnlyTeamFileV24(obj){
  return !!(obj && (obj._readOnly || obj._openedFromTeam));
}

// Lagets-vyn ska vara en läsvy. Även egna delade filer ska öppnas skrivskyddat där.
var _isReadOnlyFileV10_v24 = typeof isReadOnlyFileV10==="function" ? isReadOnlyFileV10 : null;
isReadOnlyFileV10 = function(obj){
  if(isReadOnlyTeamFileV24(obj))return true;
  if(isTeamScopeV24() && fileMetaV10 && fileMetaV10(obj).sharedWithTeam)return true;
  return _isReadOnlyFileV10_v24 ? _isReadOnlyFileV10_v24(obj) : false;
};

// Spara aldrig över en fil som öppnats från Lagets.
var _cloudSaveTaktik_v24 = cloudSaveTaktik;
cloudSaveTaktik = function(tk){
  if(isReadOnlyTeamFileV24(tk)){
    showToast("Filen är skrivskyddad i Lagets. Kopiera den först.",false);
    cloudStatus("⚠️ Kopiera lagfilen för att redigera","#e8c84a");
    return;
  }
  return _cloudSaveTaktik_v24.apply(this,arguments);
};

// Om man delar/döljer från Lagets ska det blockeras. Delning styrs från Mina.
var _patchTaktikShareV10_v24 = patchTaktikShareV10;
patchTaktikShareV10 = function(tk,share){
  if(isTeamScopeV24() || isReadOnlyTeamFileV24(tk)){
    showToast("Delning ändras från Mina, inte från Lagets",false);
    return;
  }
  return _patchTaktikShareV10_v24.apply(this,arguments);
};

var _patchFormationShareV10_v24 = patchFormationShareV10;
patchFormationShareV10 = function(s,share){
  if(isTeamScopeV24() || isReadOnlyTeamFileV24(s)){
    showToast("Delning ändras från Mina, inte från Lagets",false);
    return;
  }
  return _patchFormationShareV10_v24.apply(this,arguments);
};

// Radering av taktik ska blockeras för Lagets.
var _deleteTaktik_v24 = deleteTaktik;
deleteTaktik = function(idx){
  var tk=taktikFilmer[idx];
  if(isTeamScopeV24() || isReadOnlyTeamFileV24(tk)){
    showToast("Du kan inte radera filer från Lagets",false);
    return;
  }
  return _deleteTaktik_v24.apply(this,arguments);
};
window.deleteTaktik=deleteTaktik;

// Radering av utgångslägen ska blockeras för Lagets.
var _cloudDelete_v24 = cloudDelete;
cloudDelete = function(id){
  if(isTeamScopeV24()){
    showToast("Du kan inte radera filer från Lagets",false);
    return;
  }
  return _cloudDelete_v24.apply(this,arguments);
};

// Rendera om taktiklistan så Lagets bara får Öppna/Kopiera, inte radera/dela/flytta.
var _renderTaktikList_v24 = renderTaktikList;
renderTaktikList = function(){
  _renderTaktikList_v24.apply(this,arguments);

  if(taktikScope!=="team")return;

  var list=document.getElementById("taktik-list");
  if(!list)return;

  // Markera synliga lagobjekt som readonly i minnet.
  (taktikFilmer||[]).forEach(function(tk){
    if(fileMetaV10 && fileMetaV10(tk).sharedWithTeam){
      markOpenedFromTeamV24(tk);
    }
  });

  // Dölj riskknappar i Lagets-vyn. Behåll öppna/kopiera.
  Array.prototype.forEach.call(list.querySelectorAll("button"),function(b){
    var title=(b.title||"").toLowerCase();
    var txt=(b.textContent||"").toLowerCase();
    if(title.indexOf("radera")>=0 || txt==="×" ||
       title.indexOf("flytta")>=0 ||
       title.indexOf("dela")>=0 ||
       title.indexOf("sluta dela")>=0 ||
       title.indexOf("sammanfoga")>=0){
      b.style.display="none";
      b.disabled=true;
    }
  });
};

// När man öppnar från Lagets, gör aktiv film readonly direkt.
var _startPlayback_v24 = startPlayback;
startPlayback = function(idx){
  var tk=taktikFilmer[idx];
  if(taktikScope==="team")markOpenedFromTeamV24(tk);
  return _startPlayback_v24.apply(this,arguments);
};

// Kopiera från Lagets ska skapa egen redigerbar kopia och inte ärva readonly/delning.
var _copyTaktikToMineV10_v24 = copyTaktikToMineV10;
copyTaktikToMineV10 = function(tk){
  if(!tk)return;
  var copy=JSON.parse(JSON.stringify(tk));
  delete copy.dbId;
  delete copy._readOnly;
  delete copy._openedFromTeam;
  delete copy._draftUid;
  copy.name="Kopia av "+(copy.name||"taktikfilm");
  if(copy._meta)delete copy._meta;
  if(typeof addMetaToData==="function")copy=addMetaToData(copy);
  if(copy._meta){
    copy._meta.sharedWithTeam=false;
    copy._meta.teamCanEdit=false;
  }
  cloudSaveTaktik(copy);
};

// Utgångslägen i Lagets: blockera delning/radering/flytt efter render.
var _renderSavesList_v24 = renderSavesList;
renderSavesList = function(){
  _renderSavesList_v24.apply(this,arguments);
  if(saveScope!=="team")return;

  (savedFormations||[]).forEach(function(s){
    if(fileMetaV10 && fileMetaV10(s).sharedWithTeam){
      markOpenedFromTeamV24(s);
    }
  });

  var list=document.getElementById("saves-list");
  if(!list)return;
  Array.prototype.forEach.call(list.querySelectorAll("button"),function(b){
    var title=(b.title||"").toLowerCase();
    var txt=(b.textContent||"").toLowerCase();
    if(title.indexOf("radera")>=0 || txt==="×" ||
       title.indexOf("flytta")>=0 ||
       title.indexOf("dela")>=0 ||
       title.indexOf("sluta dela")>=0 ||
       title.indexOf("till taktik")>=0){
      b.style.display="none";
      b.disabled=true;
    }
  });
};

if(typeof renderTaktikList==="function")renderTaktikList();
if(typeof renderSavesList==="function")renderSavesList();

/* === slut v24 === */


/* === v25: samma dela-UI för utgångslägen som taktik === */
function formationShareIconV25(s){
  try{
    var meta=(typeof fileMetaV10==="function")?fileMetaV10(s):((s&&s._meta)||{});
    return meta && meta.sharedWithTeam ? "👥" : "👤";
  }catch(e){
    return "👤";
  }
}

var _renderSavesList_v25 = renderSavesList;
renderSavesList = function(){
  _renderSavesList_v25.apply(this, arguments);

  var list=document.getElementById("saves-list");
  if(!list)return;

  // Lägg till/uppdatera delningsikon visuellt på samma sätt som i taktik.
  Array.prototype.forEach.call(list.querySelectorAll(".row"), function(row){
    try{
      var txt=row.textContent||"";
      var idxMatch=txt.match(/^\s*(\d+)/);
      var idx = idxMatch ? parseInt(idxMatch[1],10)-1 : null;

      // fallback: försök hitta dataset
      if((idx===null || isNaN(idx)) && row.dataset && row.dataset.idx){
        idx=parseInt(row.dataset.idx,10);
      }
      if(idx===null || isNaN(idx))return;

      var s=savedFormations && savedFormations[idx];
      if(!s)return;

      var existing=row.querySelector(".share-badge-v25");
      if(existing)existing.remove();

      var badge=document.createElement("span");
      badge.className="share-badge-v25";
      badge.style.marginLeft="6px";
      badge.style.fontSize="12px";
      badge.style.opacity="0.9";

      var meta=(typeof fileMetaV10==="function")?fileMetaV10(s):((s&&s._meta)||{});
      if(meta && meta.sharedWithTeam){
        badge.textContent="👥 Delad";
      }else{
        badge.textContent="";
      }

      // Lägg efter första label/text.
      var first=row.querySelector("span,div");
      if(first && badge.textContent){
        first.appendChild(badge);
      }

      // Lagets = readonly markering
      if(typeof saveScope!=="undefined" && saveScope==="team"){
        row.style.opacity="0.96";
      }

    }catch(e){}
  });
};
/* === slut v25 === */



/* === v26: korrekt readonly/kopiera/dela-UI för utgångslägen === */
function clearTeamReadonlyFlagsV26(obj){
  if(!obj)return obj;
  if(typeof saveScope!=="undefined" && saveScope==="mine"){
    delete obj._readOnly;
    delete obj._openedFromTeam;
  }
  return obj;
}

function isFormationReadonlyV26(s){
  if(!s)return false;
  if(typeof saveScope!=="undefined" && saveScope==="team")return true;
  return !!(s._readOnly||s._openedFromTeam);
}

function copyFormationToMineV26(s){
  if(!s)return;
  var name="Kopia av "+(s.name||"utgångsläge");
  var state=JSON.parse(JSON.stringify(s.state||{}));
  delete state._readOnly;
  delete state._openedFromTeam;
  delete state._draftUid;
  if(state._meta)delete state._meta;

  if(typeof addMetaToData==="function")state=addMetaToData(state);
  else if(typeof updateShareMetaV10==="function")state=updateShareMetaV10(state,false,false);

  if(state._meta){
    state._meta.sharedWithTeam=false;
    state._meta.teamCanEdit=false;
  }

  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{
    method:"POST",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify({name:name,data:state,type:"uppstallning",folder:s.folder||"Allmänt"})
  }).then(function(r){return r.json();}).then(function(){
    showToast("Kopia skapad i Mina");
    saveScope="mine";
    cloudLoadSaves();
  }).catch(function(err){
    showToast("Kunde inte kopiera",false);
    cloudStatus("❌ "+err.message,"#e84a4a");
  });
}

copyFormationToMineV10 = copyFormationToMineV26;

function patchFormationShareV26(s,share){
  if(!s||!s.id)return;
  if(typeof saveScope!=="undefined" && saveScope==="team"){
    showToast("Delning ändras från Mina, inte från Lagets",false);
    return;
  }
  clearTeamReadonlyFlagsV26(s);
  var newState=typeof updateShareMetaV10==="function" ? updateShareMetaV10(s.state,share,false) : JSON.parse(JSON.stringify(s.state||{}));
  if(newState._meta){
    newState._meta.sharedWithTeam=!!share;
    newState._meta.teamCanEdit=false;
  }
  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+s.id,{
    method:"PATCH",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify({data:newState})
  }).then(function(){
    s.state=newState;
    s._meta=newState._meta||{};
    delete s._readOnly;
    delete s._openedFromTeam;
    showToast(share?"Delad med laget":"Inte längre delad");
    cloudLoadSaves();
  }).catch(function(err){
    showToast("Kunde inte ändra delning",false);
    cloudStatus("❌ "+err.message,"#e84a4a");
  });
}
patchFormationShareV10 = patchFormationShareV26;

function renderSavesListV26(){
  var list=document.getElementById("saves-list");if(!list)return;list.innerHTML="";

  if(typeof addScopeTabsV10==="function"){
    addScopeTabsV10(list,saveScope,function(v){saveScope=v;renderSavesList();});
  }

  var visibleAll=(savedFormations||[]).filter(function(s){
    if(saveScope==="team"){
      var m=typeof fileMetaV10==="function"?fileMetaV10(s):((s&&s._meta)||{});
      return !!(m&&m.sharedWithTeam);
    }
    clearTeamReadonlyFlagsV26(s);
    return typeof isMineV10==="function" ? isMineV10(s) : true;
  });

  var folderCounts={"Alla":visibleAll.length};
  visibleAll.forEach(function(s){var f=s.folder||"Allmänt";folderCounts[f]=(folderCounts[f]||0)+1;});

  var filterRow=document.createElement("div");
  filterRow.style.cssText="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;width:100%";
  var allFolders=["Alla"];var seen2={};
  visibleAll.forEach(function(s){var f=s.folder||"Allmänt";if(!seen2[f]){seen2[f]=true;allFolders.push(f);}});
  if(saveScope==="mine"){
    (folders||[]).forEach(function(f){if(!seen2[f]&&f!=="Alla"){seen2[f]=true;allFolders.push(f);}});
  }

  allFolders.forEach(function(f){
    var wrap=document.createElement("div");wrap.style.cssText="display:flex;align-items:center;gap:1px;margin-bottom:2px";
    var fb=document.createElement("button");
    fb.className="tab"+(currentFolder===f?" on":"");
    fb.textContent=f+" ("+(folderCounts[f]||0)+")";
    fb.style.fontSize="0.62rem";fb.style.padding="2px 6px";
    fb.addEventListener("click",function(){currentFolder=f;renderSavesList();});
    wrap.appendChild(fb);

    if(f!=="Alla"&&saveScope==="mine"){
      var rnBtn=document.createElement("button");
      rnBtn.style.cssText="font-size:0.6rem;padding:2px 4px;background:#111a14;color:#7aaa88;border:1px solid #2d4a35;border-left:none;cursor:pointer";
      rnBtn.textContent="✏";rnBtn.title="Byt namn";
      rnBtn.addEventListener("click",function(e){e.stopPropagation();openRenameFolder(f);});
      wrap.appendChild(rnBtn);

      var delBtn=document.createElement("button");
      delBtn.style.cssText="font-size:0.6rem;padding:2px 4px;background:#111a14;color:#e84a4a;border:1px solid #2d4a35;border-left:none;border-radius:0 4px 4px 0;cursor:pointer";
      delBtn.textContent="×";delBtn.title="Radera mapp";
      delBtn.addEventListener("click",function(e){
        e.stopPropagation();
        var count=folderCounts[f]||0;
        if(count===0){
          if(!confirm("Radera mappen \""+f+"\"?"))return;
          folders=folders.filter(function(x){return x!==f;});
          if(currentFolder===f)currentFolder="Alla";
          renderSavesList();
        }else{
          openDeleteFolderConfirm(f,"saves");
        }
      });
      wrap.appendChild(delBtn);
    }
    filterRow.appendChild(wrap);
  });

  if(saveScope==="mine"){
    var addBtn=document.createElement("button");
    addBtn.style.cssText="font-size:0.62rem;padding:2px 8px;background:#111a14;color:#4ae87a;border:1px solid #4ae87a;border-radius:4px;cursor:pointer";
    addBtn.textContent="+ Mapp";
    addBtn.addEventListener("click",function(){
      pendingFolderTarget="saves";
      document.getElementById("new-folder-inp").value="";
      document.getElementById("modal-new-folder").classList.remove("hidden");
      setTimeout(function(){document.getElementById("new-folder-inp").focus();},100);
    });
    filterRow.appendChild(addBtn);
  }

  list.appendChild(filterRow);

  var filtered=visibleAll.filter(function(s){
    var inFolder=currentFolder==="Alla"||(s.folder||"Allmänt")===currentFolder;
    var inSearch=!searchQuery||String(s.name||"").toLowerCase().indexOf(searchQuery)>=0;
    return inFolder&&inSearch;
  });

  if(!filtered.length){
    var empty=document.createElement("span");
    empty.style.cssText="color:#7aaa88;font-size:0.8rem";
    empty.textContent=saveScope==="team"?"Inga delade utgångslägen":"Inga uppställningar";
    list.appendChild(empty);
    return;
  }

  filtered.slice().sort(function(a,b){return String(a.name||"").localeCompare(String(b.name||""),"sv");}).forEach(function(s){
    var meta=typeof fileMetaV10==="function"?fileMetaV10(s):((s&&s._meta)||{});
    var readonly=saveScope==="team";
    if(readonly){
      s._readOnly=true;
      s._openedFromTeam=true;
    }else{
      clearTeamReadonlyFlagsV26(s);
    }

    var row=document.createElement("div");row.className="row";row.style.gap="3px";
    var nm=document.createElement("span");nm.className="row-name";nm.textContent=s.name||"Namnlös";
    var fl=document.createElement("span");fl.className="row-sub";
    fl.textContent=(s.folder||"Allmänt")+(readonly?" · skrivskyddad":"");

    function iconBtn(txt,title,color){
      var b=document.createElement("button");
      b.className="sa";
      b.textContent=txt;
      b.title=title;
      b.setAttribute("aria-label",title);
      b.style.cssText="min-width:24px;padding:2px 5px;font-size:0.72rem;line-height:1.1"+(color?";color:"+color+";border-color:"+color:"");
      return b;
    }

    var ld=iconBtn(readonly?"👁":"Ladda",readonly?"Öppna skrivskyddat":"Ladda","#4ae87a");
    ld.addEventListener("click",function(){
      if(readonly){
        s._readOnly=true;s._openedFromTeam=true;
      }else{
        clearTeamReadonlyFlagsV26(s);
      }
      applyState(JSON.parse(JSON.stringify(s.state)));
      activeFormationId=readonly?null:s.id;
      activeFormationName=readonly?null:s.name;
      updateSaveButtons();
      if(readonly)showToast("Öppnad skrivskyddat – kopiera för att redigera");
    });

    row.appendChild(nm);row.appendChild(fl);

    if(readonly){
      var cp=iconBtn("⧉","Kopiera till Mina","#4ae8e8");
      cp.addEventListener("click",function(){copyFormationToMineV26(s);});
      row.appendChild(ld);row.appendChild(cp);
    }else{
      var share=iconBtn(meta&&meta.sharedWithTeam?"🙈":"👥",meta&&meta.sharedWithTeam?"Sluta dela med laget":"Dela med laget","#4ae8e8");
      share.addEventListener("click",function(){patchFormationShareV26(s,!(meta&&meta.sharedWithTeam));});

      var toTk=iconBtn("↗","Till taktik","#4ae8e8");
      toTk.addEventListener("click",function(){sendSavedFormationToTaktik(s);});

      var mv=iconBtn("⇆","Flytta till mapp","#e8c84a");
      mv.addEventListener("click",function(){openMoveFolder(s);});

      var dl=iconBtn("×","Radera","#e84a4a");
      dl.className+=" del";
      dl.addEventListener("click",function(){
        if(!confirm("Radera utgångsläget \""+(s.name||"utan namn")+"\"?"))return;
        if(s.id)cloudDelete(s.id);
      });

      row.appendChild(share);row.appendChild(ld);row.appendChild(toTk);row.appendChild(mv);row.appendChild(dl);
    }

    list.appendChild(row);
  });
}

renderSavesList = renderSavesListV26;
if(typeof renderSavesList==="function")renderSavesList();

/* === slut v26 === */



/* === v27: single-source för utgångslägen, stoppa dubbla filer === */
function formationMetaV27(state){
  return (state&&state._meta) ? state._meta : {};
}
function formationOwnerKeyV27(state){
  var m=formationMetaV27(state);
  return m.ownerId || "legacy";
}
function formationDedupeKeyV27(row){
  var st=row.data||{};
  var owner=formationOwnerKeyV27(st);
  var name=String(row.name||"").trim().toLowerCase();
  var folder=String(row.folder||"Allmänt").trim().toLowerCase();
  return owner+"::"+folder+"::"+name;
}
function normalizeFormationRowV27(row){
  var st=row.data||{};
  return {
    id:row.id,
    name:row.name,
    state:st,
    folder:row.folder||"Allmänt",
    _meta:st._meta||{}
  };
}
function cloudLoadSaves(){
  cloudStatus("Laddar...","#7aaa88");
  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.uppstallning&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){
      if(!Array.isArray(data)){cloudStatus("❌ Fel","#e84a4a");return;}

      var byKey={};
      data.filter(function(row){return row.type==="uppstallning";}).forEach(function(row){
        if(!row.name)return;
        var key=formationDedupeKeyV27(row);
        // order id.desc -> behåll nyaste raden för samma ägare+mapp+namn
        if(!byKey[key])byKey[key]=normalizeFormationRowV27(row);
      });

      savedFormations=Object.keys(byKey).map(function(k){return byKey[k];});

      var seen={};folders=["Allmänt"];
      savedFormations.forEach(function(s){
        var f=s.folder||"Allmänt";
        if(f&&!seen[f]){
          seen[f]=true;
          if(f!=="Allmänt")folders.push(f);
        }
      });

      cloudStatus(savedFormations.length+" uppställningar ✅","#4ae87a");
      renderSavesList();
      updateFolderSelect();
    })
    .catch(function(err){cloudStatus("❌ Fel: "+err.message,"#e84a4a");});
}

function cloudSaveWithName(name){
  name=String(name||"").trim();
  if(!name){showToast("Skriv ett namn först",false);return;}

  cloudStatus("Sparar...","#7aaa88");
  var folderSel=document.getElementById("folder-select");
  var folder=folderSel?folderSel.value:"Allmänt";
  var state=(typeof addMetaToData==="function")?addMetaToData(buildState()):buildState();

  function patchExisting(id){
    return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+id,{
      method:"PATCH",
      headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
      body:JSON.stringify({name:name,data:state,type:"uppstallning",folder:folder})
    }).then(function(r){return r.json();}).then(function(data){
      cloudStatus("✅ Sparat: "+name,"#4ae87a");
      showToast("Sparat!");
      cloudLoadSaves();
    });
  }

  // Om aktivt utgångsläge redan har id: uppdatera samma rad.
  if(typeof activeFormationId!=="undefined" && activeFormationId){
    patchExisting(activeFormationId).catch(function(err){
      cloudStatus("❌ Fel: "+err.message,"#e84a4a");
      showToast("Kunde inte spara",false);
    });
    return;
  }

  // Annars leta efter samma namn + mapp + ägare och uppdatera nyaste i stället för POST.
  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.uppstallning&name=eq."+encodeURIComponent(name)+"&folder=eq."+encodeURIComponent(folder)+"&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(existing){
      var owner=formationOwnerKeyV27(state);
      if(Array.isArray(existing)){
        var same=existing.find(function(row){
          return formationOwnerKeyV27(row.data||{})===owner;
        });
        if(same&&same.id)return patchExisting(same.id);
      }

      return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{
        method:"POST",
        headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
        body:JSON.stringify({name:name,data:state,type:"uppstallning",folder:folder})
      }).then(function(r){return r.json();}).then(function(data){
        if(data&&data[0]&&data[0].id){
          activeFormationId=data[0].id;
          activeFormationName=name;
          cloudStatus("✅ Sparat: "+name,"#4ae87a");
          showToast("Sparat!");
          cloudLoadSaves();
        }else{
          var errMsg=(data&&data.message)?data.message:"Kunde inte spara";
          cloudStatus("❌ "+errMsg,"#e84a4a");
          showToast(errMsg,false);
        }
      });
    })
    .catch(function(err){
      cloudStatus("❌ Fel: "+err.message,"#e84a4a");
      showToast("Kunde inte spara",false);
    });
}

// Kopiera från Lagets ska skapa en ny egen rad men aldrig lägga lokal dublett.
function copyFormationToMineV26(s){
  if(!s)return;
  var name="Kopia av "+(s.name||"utgångsläge");
  var state=JSON.parse(JSON.stringify(s.state||{}));
  delete state._readOnly;
  delete state._openedFromTeam;
  delete state._draftUid;
  if(state._meta)delete state._meta;

  if(typeof addMetaToData==="function")state=addMetaToData(state);
  else if(typeof updateShareMetaV10==="function")state=updateShareMetaV10(state,false,false);

  if(state._meta){
    state._meta.sharedWithTeam=false;
    state._meta.teamCanEdit=false;
  }

  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{
    method:"POST",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify({name:name,data:state,type:"uppstallning",folder:s.folder||"Allmänt"})
  }).then(function(r){return r.json();}).then(function(data){
    showToast("Kopia skapad i Mina");
    saveScope="mine";
    currentFolder="Alla";
    cloudLoadSaves();
  }).catch(function(err){
    showToast("Kunde inte kopiera",false);
    cloudStatus("❌ "+err.message,"#e84a4a");
  });
}
copyFormationToMineV10=copyFormationToMineV26;

if(typeof cloudLoadSaves==="function")cloudLoadSaves();
/* === slut v27 === */



/* === v37: btn-cloud-refresh är Ny uppställning, ingen extra knapp === */
function newFormationFromStandardV37(){
  // Samma visuella reset som Standard
  if(typeof resetCurrentWorkspaceToDefault==="function"){
    resetCurrentWorkspaceToDefault();
  }else if(typeof clearCoachboardToFormation==="function"){
    clearCoachboardToFormation();
  }

  // Men lämna aktiv fil så nästa sparning blir en ny uppställning.
  activeFormationId=null;
  activeFormationName=null;

  // Se till att workspace-state inte återkopplar till den gamla filen.
  try{
    var key=(typeof workspaceKeyFromPanel==="function")
      ? workspaceKeyFromPanel(activeWorkspacePanel||"formations")
      : "formation";

    if(typeof workspaceStates!=="undefined" && typeof captureWorkspaceState==="function"){
      var st=captureWorkspaceState();
      st.activeFormationId=null;
      st.activeFormationName=null;

      workspaceStates[key]=JSON.parse(JSON.stringify(st));
      workspaceStates.formation=JSON.parse(JSON.stringify(st));
      workspaceStates.saves=JSON.parse(JSON.stringify(st));
    }
  }catch(e){}

  if(typeof updateSaveButtons==="function")updateSaveButtons();

  showToast("Ny uppställning – nästa sparning skapar ny fil");
  cloudStatus("Ny uppställning. Spara som ny fil när du är klar.","#7aaa88");
}

function bindNewFormationButtonV37(){
  var old=document.getElementById("btn-cloud-refresh");
  if(!old)return;

  var btn=old.cloneNode(true);
  btn.id="btn-cloud-refresh";
  btn.textContent="Ny";
  btn.title="Ny uppställning";
  btn.setAttribute("aria-label","Ny uppställning");
  btn.style.color="#4ae8e8";
  btn.style.borderColor="#4ae8e8";

  old.parentNode.replaceChild(btn,old);

  btn.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    newFormationFromStandardV37();
    return false;
  },true);
}

bindNewFormationButtonV37();
/* === slut v37 === */


/* === v44 safety: ta bort gamla dublettknappar om browsern cacheat dem === */
function cleanupTopbarDuplicatesV44(){
  var extra=document.getElementById("btn-save-as-topbar");
  if(extra)extra.remove();

  ["btn-new-formation-v28","btn-new-formation-v30","btn-new-formation-v31","btn-new-formation-v32","btn-new-formation-v33","btn-new-formation-bottom-v34"].forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.remove();
  });
}
cleanupTopbarDuplicatesV44();
setTimeout(cleanupTopbarDuplicatesV44,200);
/* === slut v44 === */


/* v45 app hard cleanup */
(function(){
  function v45Cleanup(){
    var extra=document.getElementById("btn-save-as-topbar");
    if(extra)extra.remove();
  }
  v45Cleanup();
  setTimeout(v45Cleanup,300);
})();


/* === v50: utgångsläge skapar ny taktikfilm direkt === */
function openNewTaktikFromSavedFormationModalV50(saved){
  if(!saved)return;

  var old=document.getElementById("modal-new-taktik-from-formation-v50");
  if(old)old.remove();

  var modal=document.createElement("div");
  modal.id="modal-new-taktik-from-formation-v50";
  modal.className="modal";

  var box=document.createElement("div");
  box.className="modal-box";

  var h=document.createElement("h2");
  h.textContent="Ny taktikfilm från utgångsläge";
  box.appendChild(h);

  var p=document.createElement("p");
  p.style.cssText="font-size:0.78rem;color:#7aaa88;line-height:1.35;margin:4px 0 10px";
  p.textContent="Utgångsläget blir startsteget i en ny film. Du kommer direkt in i redigeringsläget.";
  box.appendChild(p);

  var inp=document.createElement("input");
  inp.type="text";
  inp.id="taktik-from-formation-name-v50";
  inp.placeholder="Namn på film";
  inp.value=(saved.name? saved.name+" – taktik" : "Ny taktikfilm");
  inp.style.cssText="width:100%;box-sizing:border-box;margin-bottom:8px";
  box.appendChild(inp);

  var row=document.createElement("div");
  row.style.cssText="display:flex;gap:6px;justify-content:flex-end";

  var cancel=document.createElement("button");
  cancel.className="btn";
  cancel.textContent="Avbryt";
  cancel.addEventListener("click",function(){modal.remove();});

  var ok=document.createElement("button");
  ok.className="btn on";
  ok.textContent="Skapa film";
  ok.addEventListener("click",function(){
    var name=inp.value.trim();
    if(!name)return;
    modal.remove();
    createTaktikFilmFromSavedFormationV50(saved,name);
  });

  row.appendChild(cancel);
  row.appendChild(ok);
  box.appendChild(row);

  modal.appendChild(box);
  document.body.appendChild(modal);

  setTimeout(function(){inp.focus();inp.select();},80);
}

function createTaktikFilmFromSavedFormationV50(saved,name){
  try{
    var currentKey=workspaceKeyFromPanel(activeWorkspacePanel);
    workspaceStates[currentKey]=captureWorkspaceState();
  }catch(e){}

  if(playback && typeof stopPlayback==="function"){
    try{stopPlayback();}catch(e){}
  }

  var ws=workspaceFromSavedFormation(saved);
  format=ws.format||format||11;
  var fmtSel=document.getElementById("fmt-sel");
  if(fmtSel)fmtSel.value=String(format);
  halfMode=0;
  if(typeof updateViewBox==="function")updateViewBox();

  var snap=JSON.parse(JSON.stringify(ws.snap));
  snap.movementPaths=[];

  var newFilm={
    name:name,
    folder:"Taktik",
    steps:[snap],
    _isDraft:true,
    _sourceFormationName:saved.name||"Utgångsläge"
  };

  taktikFilmer.push(newFilm);
  var idx=taktikFilmer.length-1;

  try{
    workspaceStates.taktik=ws;
    workspaceStates.taktik.snap=snap;
  }catch(e){}

  openPanelByName("taktik");
  renderTaktikList();
  startPlayback(idx);

  showToast("Ny film skapad från utgångsläge");
  cloudStatus("Utkast: "+name+" – lägg till steg och spara filmen","#7aaa88");
}

// Viktigt: alla befintliga knappar som anropar sendSavedFormationToTaktik
// ska nu öppna filmnamnsrutan i stället för att bara kopiera läget till taktikytan.
sendSavedFormationToTaktik=function(saved){
  openNewTaktikFromSavedFormationModalV50(saved);
};

// Gör knappen tydligare.
(function(){
  function relabelImportButtonsV50(){
    var b=document.getElementById("btn-import-start-taktik");
    if(b){
      b.textContent="Ny film från utgångsläge";
      b.title="Välj ett utgångsläge och skapa en ny taktikfilm";
    }

    // I listan med utgångslägen heter gamla knappen "Till taktik".
    // Den får behålla samma funktion men bättre text när listan renderas om.
    var savesList=document.getElementById("saves-list");
    if(savesList){
      Array.prototype.slice.call(savesList.querySelectorAll("button")).forEach(function(btn){
        if((btn.textContent||"").trim()==="Till taktik"){
          btn.textContent="Ny film";
          btn.title="Skapa ny taktikfilm från detta utgångsläge";
        }
      });
    }
  }

  var oldRenderSaves=renderSavesList;
  renderSavesList=function(){
    var res=oldRenderSaves.apply(this,arguments);
    relabelImportButtonsV50();
    return res;
  };

  var oldRenderTaktik=renderTaktikList;
  renderTaktikList=function(){
    var res=oldRenderTaktik.apply(this,arguments);
    relabelImportButtonsV50();
    return res;
  };

  setTimeout(relabelImportButtonsV50,300);
})();
/* === slut v50 === */


/* === v51: säker molnsparning + listor ska inte tömmas === */
function keyTaktikV51(tk){
  return tk&&tk.dbId ? "id:"+tk.dbId : "name:"+String((tk&&tk.name)||"").trim().toLowerCase()+"|"+String((tk&&tk.folder)||"Taktik");
}
function keyFormationV51(s){
  return s&&s.id ? "id:"+s.id : "name:"+String((s&&s.name)||"").trim().toLowerCase()+"|"+String((s&&s.folder)||"Allmänt");
}
function mergeTaktikListsV51(oldList,newList){
  var by={};
  (oldList||[]).forEach(function(tk){by[keyTaktikV51(tk)]=tk;});
  (newList||[]).forEach(function(tk){by[keyTaktikV51(tk)]=tk;});
  return Object.keys(by).map(function(k){return by[k];});
}
function mergeFormationListsV51(oldList,newList){
  var by={};
  (oldList||[]).forEach(function(s){by[keyFormationV51(s)]=s;});
  (newList||[]).forEach(function(s){by[keyFormationV51(s)]=s;});
  return Object.keys(by).map(function(k){return by[k];});
}

// Hindra att en misslyckad/tom reload rensar gamla filmer eller utgångslägen i UI.
var _cloudLoadTaktik_v51=cloudLoadTaktik;
cloudLoadTaktik=function(){
  var before=(taktikFilmer||[]).slice();
  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.taktikfilm&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){
      if(!Array.isArray(data)){
        cloudStatus("❌ Kunde inte läsa taktikfilmer","#e84a4a");
        return;
      }

      var loaded=[];
      var byKey={};
      data.filter(function(row){return row.type==="taktikfilm";}).forEach(function(row){
        var tk=row.data||{};
        if(!tk.steps||tk.steps.length<2)return;
        tk.dbId=row.id;
        if(!tk.folder)tk.folder=row.folder||"Taktik";
        var meta=tk._meta||{};
        var owner=meta.ownerId||"legacy";
        var key=owner+"::"+((row.name||tk.name||"").trim().toLowerCase()||("id:"+row.id));
        if(!byKey[key])byKey[key]=tk;
      });
      loaded=Object.keys(byKey).map(function(k){return byKey[k];});

      taktikFilmer=mergeTaktikListsV51(before,loaded);

      var tfseen={};taktikFolders=["Taktik","Träning"];tfseen["Taktik"]=true;tfseen["Träning"]=true;
      taktikFilmer.forEach(function(tk){if(tk.folder&&!tfseen[tk.folder]){tfseen[tk.folder]=true;taktikFolders.push(tk.folder);}});
      renderTaktikList();
      cloudStatus(taktikFilmer.length+" taktikfilmer laddade","#4ae87a");
    })
    .catch(function(err){
      taktikFilmer=before;
      renderTaktikList();
      cloudStatus("❌ Fel: "+err.message,"#e84a4a");
    });
};

var _cloudLoadSaves_v51=cloudLoadSaves;
cloudLoadSaves=function(){
  var before=(savedFormations||[]).slice();
  cloudStatus("Laddar...","#7aaa88");
  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.uppstallning&order=folder.asc,id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){
      if(!Array.isArray(data)){
        savedFormations=before;
        cloudStatus("❌ Kunde inte läsa utgångslägen","#e84a4a");
        return;
      }

      var loaded=data.filter(function(row){return row.type==="uppstallning";}).map(function(row){
        return {id:row.id,name:row.name,state:row.data,folder:row.folder||"Allmänt"};
      });

      savedFormations=mergeFormationListsV51(before,loaded);

      var seen={};folders=["Allmänt"];
      for(var i=0;i<savedFormations.length;i++){
        var f=savedFormations[i].folder;
        if(f&&!seen[f]){seen[f]=true;if(f!=="Allmänt")folders.push(f);}
      }
      cloudStatus(savedFormations.length+" uppställningar ✅","#4ae87a");
      renderSavesList();
      updateFolderSelect();
    })
    .catch(function(err){
      savedFormations=before;
      renderSavesList();
      cloudStatus("❌ Fel: "+err.message,"#e84a4a");
    });
};

// Spara-knappen i redigeringsläget ska alltid använda cloudSaveTaktik,
// även för nya filmer från utgångsläge. Den gamla knappen sparade nya utkast bara lokalt.
(function(){
  var btn=document.getElementById("btn-edit-taktik-save");
  if(!btn)return;
  var clone=btn.cloneNode(true);
  btn.parentNode.replaceChild(clone,btn);

  clone.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if(editingTaktikIdx===null)return;
    if(typeof autoSaveCurrentStepLocalV16==="function")autoSaveCurrentStepLocalV16();

    var tk=taktikFilmer[editingTaktikIdx];
    if(!tk)return;

    if(!tk.steps||tk.steps.length<2){
      showToast("Lägg till minst ett steg innan du sparar filmen",false);
      cloudStatus("⚠️ Minst ett steg krävs för att spara taktikfilm","#e8c84a");
      return false;
    }

    cloudSaveTaktik(tk);
    return false;
  },true);
})();
/* === slut v51 === */


/* === v52: legacy-filer utan användardata visas och kan migreras === */

// Gamla filer saknar _meta. De ska inte försvinna bara för att en profil/ett lag finns.
// De betraktas som "mina äldre filer" tills användaren sparar om dem.
function isLegacyFileV52(obj){
  if(!obj)return false;
  var m=null;
  try{
    if(typeof fileMetaV10==="function")m=fileMetaV10(obj);
  }catch(e){}
  if(!m){
    if(obj.state && obj.state._meta)m=obj.state._meta;
    else if(obj.data && obj.data._meta)m=obj.data._meta;
    else if(obj._meta)m=obj._meta;
  }
  return !(m && (m.ownerId || m.ownerName || m.teamId || m.teamCode));
}

if(typeof isMineV10==="function"){
  var _isMineV10_v52=isMineV10;
  isMineV10=function(obj){
    if(isLegacyFileV52(obj))return true;
    return _isMineV10_v52.apply(this,arguments);
  };
}

if(typeof isSameTeamSharedV10==="function"){
  var _isSameTeamSharedV10_v52=isSameTeamSharedV10;
  isSameTeamSharedV10=function(obj){
    if(isLegacyFileV52(obj))return false;
    return _isSameTeamSharedV10_v52.apply(this,arguments);
  };
}

if(typeof isReadOnlyFileV10==="function"){
  var _isReadOnlyFileV10_v52=isReadOnlyFileV10;
  isReadOnlyFileV10=function(obj){
    if(isLegacyFileV52(obj))return false;
    return _isReadOnlyFileV10_v52.apply(this,arguments);
  };
}

// Lägg tydlig men diskret markering på legacy-filer i listorna.
function addLegacyLabelV52(row,obj){
  if(!row || !isLegacyFileV52(obj))return;
  if(row.querySelector && row.querySelector(".legacy-v52"))return;
  var tag=document.createElement("span");
  tag.className="legacy-v52";
  tag.textContent="Äldre";
  tag.title="Gammal fil utan användardata. Spara om den för att göra den till din.";
  tag.style.cssText="font-size:0.58rem;color:#e8c84a;border:1px solid #5a4a18;border-radius:999px;padding:1px 5px;margin-left:4px;white-space:nowrap";
  var name=row.querySelector(".row-name") || row.firstChild;
  if(name && name.parentNode)name.parentNode.insertBefore(tag,name.nextSibling);
}

(function(){
  if(typeof renderSavesList==="function"){
    var _renderSavesList_v52=renderSavesList;
    renderSavesList=function(){
      var res=_renderSavesList_v52.apply(this,arguments);
      setTimeout(function(){
        var rows=document.querySelectorAll("#saves-list .row");
        for(var i=0;i<rows.length && i<savedFormations.length;i++){
          var nameEl=rows[i].querySelector(".row-name");
          if(!nameEl)continue;
          var nm=(nameEl.textContent||"").trim();
          var obj=(savedFormations||[]).find(function(s){return String(s.name||"").trim()===nm;});
          if(obj)addLegacyLabelV52(rows[i],obj);
        }
      },0);
      return res;
    };
  }

  if(typeof renderTaktikList==="function"){
    var _renderTaktikList_v52=renderTaktikList;
    renderTaktikList=function(){
      var res=_renderTaktikList_v52.apply(this,arguments);
      setTimeout(function(){
        var rows=document.querySelectorAll("#taktik-list .row");
        Array.prototype.slice.call(rows).forEach(function(row){
          var nameEl=row.querySelector(".row-name");
          if(!nameEl)return;
          var nm=(nameEl.textContent||"").trim();
          var obj=(taktikFilmer||[]).find(function(t){return String(t.name||"").trim()===nm;});
          if(obj)addLegacyLabelV52(row,obj);
        });
      },0);
      return res;
    };
  }
})();

// När en gammal fil sparas ska den få aktuell användardata.
// addMetaToData finns redan i användarsystemet; här tvingar vi in metadata på legacy-objekt innan save.
function migrateLegacyTaktikBeforeSaveV52(tk){
  if(!tk || !isLegacyFileV52(tk))return tk;
  if(typeof addMetaToData==="function"){
    var migrated=addMetaToData(tk);
    Object.keys(migrated||{}).forEach(function(k){tk[k]=migrated[k];});
  }
  return tk;
}

function migrateLegacyFormationStateBeforeSaveV52(state){
  if(!state)return state;
  if(typeof addMetaToData==="function"){
    return addMetaToData(state);
  }
  return state;
}

if(typeof cloudSaveTaktik==="function"){
  var _cloudSaveTaktik_v52=cloudSaveTaktik;
  cloudSaveTaktik=function(tk){
    migrateLegacyTaktikBeforeSaveV52(tk);
    return _cloudSaveTaktik_v52.apply(this,arguments);
  };
}

// Fixa sparning av utgångslägen så även "Spara som" sätter metadata på nya/gamla lägen.
if(typeof cloudSave==="function"){
  var _cloudSave_v52=cloudSave;
  cloudSave=function(name){
    // Om befintlig buildState används längre ner behöver vi låta originalet köra,
    // men först säkerställer vi att buildState får metadata via wrappern nedan.
    return _cloudSave_v52.apply(this,arguments);
  };
}

if(typeof buildState==="function"){
  var _buildState_v52=buildState;
  buildState=function(){
    var st=_buildState_v52.apply(this,arguments);
    return migrateLegacyFormationStateBeforeSaveV52(st);
  };
}

// Tvinga omritning/laddning efter att patchen är aktiv.
setTimeout(function(){
  try{ if(typeof renderSavesList==="function")renderSavesList(); }catch(e){}
  try{ if(typeof renderTaktikList==="function")renderTaktikList(); }catch(e){}
},400);

/* === slut v52 === */


/* === v53: samlad buggfix legacy/listor/ritval/fullscreen/dag/korridor/pilnummer === */

// 1) Legacy-filer: v52 var för försiktig när _meta saknades men fileMetaV10 returnerade {}.
// Den här versionen räknar tom metadata som legacy.
function isLegacyFileV53(obj){
  if(!obj)return false;
  var m={};
  try{
    if(typeof fileMetaV10==="function")m=fileMetaV10(obj)||{};
  }catch(e){m={};}
  if(obj.state && obj.state._meta)m=obj.state._meta;
  if(obj.data && obj.data._meta)m=obj.data._meta;
  if(obj._meta)m=obj._meta;
  return !(m && (m.ownerId || m.ownerName || m.teamId || m.teamCode));
}

if(typeof isMineV10==="function"){
  var _isMineV10_v53=isMineV10;
  isMineV10=function(obj){
    if(isLegacyFileV53(obj))return true;
    return _isMineV10_v53.apply(this,arguments);
  };
}
if(typeof isSameTeamSharedV10==="function"){
  var _isSameTeamSharedV10_v53=isSameTeamSharedV10;
  isSameTeamSharedV10=function(obj){
    if(isLegacyFileV53(obj))return false;
    return _isSameTeamSharedV10_v53.apply(this,arguments);
  };
}
if(typeof isReadOnlyFileV10==="function"){
  var _isReadOnlyFileV10_v53=isReadOnlyFileV10;
  isReadOnlyFileV10=function(obj){
    if(isLegacyFileV53(obj))return false;
    return _isReadOnlyFileV10_v53.apply(this,arguments);
  };
}
if(typeof isFileVisibleInScopeV10==="function"){
  var _isFileVisibleInScopeV10_v53=isFileVisibleInScopeV10;
  isFileVisibleInScopeV10=function(obj,scope){
    if(scope==="mine" && isLegacyFileV53(obj))return true;
    if(scope==="team" && isLegacyFileV53(obj))return false;
    return _isFileVisibleInScopeV10_v53.apply(this,arguments);
  };
}

function normalizeLegacyFormationRowV53(row){
  var s={id:row.id,name:row.name,state:row.data,folder:row.folder||"Allmänt"};
  if(isLegacyFileV53(s))s._legacyV53=true;
  return s;
}
function normalizeLegacyTaktikRowV53(row){
  var tk=row.data||{};
  tk.dbId=row.id;
  if(!tk.folder)tk.folder=row.folder||"Taktik";
  if(isLegacyFileV53(tk))tk._legacyV53=true;
  return tk;
}
function legacyKeyV53(prefix,obj){
  return prefix+":"+(obj.dbId||obj.id||((obj.name||"")+"|"+(obj.folder||"")));
}

// Ladda alla gamla filer igen och låt tom metadata synas under Mina.
cloudLoadSaves=function(){
  var before=(savedFormations||[]).slice();
  cloudStatus("Laddar...","#7aaa88");
  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.uppstallning&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){
      if(!Array.isArray(data)){savedFormations=before;renderSavesList();cloudStatus("❌ Kunde inte läsa utgångslägen","#e84a4a");return;}

      var by={};
      before.forEach(function(s){by[legacyKeyV53("s",s)]=s;});
      data.filter(function(row){return row.type==="uppstallning";}).forEach(function(row){
        if(!row.name)return;
        var s=normalizeLegacyFormationRowV53(row);
        by[legacyKeyV53("s",s)]=s;
      });
      savedFormations=Object.keys(by).map(function(k){return by[k];});

      var seen={};folders=["Allmänt"];
      savedFormations.forEach(function(s){
        var f=s.folder||"Allmänt";
        if(f&&!seen[f]){seen[f]=true;if(f!=="Allmänt")folders.push(f);}
      });
      renderSavesList();updateFolderSelect();
      cloudStatus(savedFormations.length+" uppställningar ✅","#4ae87a");
    })
    .catch(function(err){savedFormations=before;renderSavesList();cloudStatus("❌ Fel: "+err.message,"#e84a4a");});
};

cloudLoadTaktik=function(){
  var before=(taktikFilmer||[]).slice();
  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.taktikfilm&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){
      if(!Array.isArray(data)){taktikFilmer=before;renderTaktikList();cloudStatus("❌ Kunde inte läsa taktikfilmer","#e84a4a");return;}

      var by={};
      before.forEach(function(tk){by[legacyKeyV53("t",tk)]=tk;});
      data.filter(function(row){return row.type==="taktikfilm";}).forEach(function(row){
        var tk=row.data||{};
        if(!tk.steps || tk.steps.length<2)return;
        tk=normalizeLegacyTaktikRowV53(row);
        by[legacyKeyV53("t",tk)]=tk;
      });
      taktikFilmer=Object.keys(by).map(function(k){return by[k];});

      var tfseen={};taktikFolders=["Taktik","Träning"];tfseen["Taktik"]=true;tfseen["Träning"]=true;
      taktikFilmer.forEach(function(tk){var f=tk.folder||"Taktik";if(f&&!tfseen[f]){tfseen[f]=true;taktikFolders.push(f);}});
      renderTaktikList();
      cloudStatus(taktikFilmer.length+" taktikfilmer laddade","#4ae87a");
    })
    .catch(function(err){taktikFilmer=before;renderTaktikList();cloudStatus("❌ Fel: "+err.message,"#e84a4a");});
};

function markLegacyRowsV53(){
  function tag(row){
    if(!row || row.querySelector(".legacy-v53"))return;
    var t=document.createElement("span");
    t.className="legacy-v53";
    t.textContent="Äldre";
    t.title="Gammal fil utan användardata. Spara om den för att göra den till din.";
    t.style.cssText="font-size:0.58rem;color:#e8c84a;border:1px solid #5a4a18;border-radius:999px;padding:1px 5px;margin-left:4px;white-space:nowrap";
    var n=row.querySelector(".row-name")||row.firstChild;
    if(n&&n.parentNode)n.parentNode.insertBefore(t,n.nextSibling);
  }
  Array.prototype.slice.call(document.querySelectorAll("#saves-list .row")).forEach(function(row){
    var nm=row.querySelector(".row-name"); if(!nm)return;
    var obj=(savedFormations||[]).find(function(s){return String(s.name||"").trim()===String(nm.textContent||"").trim();});
    if(obj && isLegacyFileV53(obj))tag(row);
  });
  Array.prototype.slice.call(document.querySelectorAll("#taktik-list .row")).forEach(function(row){
    var nm=row.querySelector(".row-name"); if(!nm)return;
    var obj=(taktikFilmer||[]).find(function(t){return String(t.name||"").trim()===String(nm.textContent||"").trim();});
    if(obj && isLegacyFileV53(obj))tag(row);
  });
}

if(typeof renderSavesList==="function"){
  var _renderSavesList_v53=renderSavesList;
  renderSavesList=function(){var r=_renderSavesList_v53.apply(this,arguments);setTimeout(markLegacyRowsV53,0);return r;};
}
if(typeof renderTaktikList==="function"){
  var _renderTaktikList_v53=renderTaktikList;
  renderTaktikList=function(){var r=_renderTaktikList_v53.apply(this,arguments);setTimeout(markLegacyRowsV53,0);return r;};
}

// 2,6,8) Bind ritval, dagsläge, korridorer och pilnummer. Dessa saknade stabila listeners.
function setDaylightV53(on){
  daylightMode=!!on;
  document.body.classList.toggle("daylight",daylightMode);
  var b=document.getElementById("btn-daylight");
  if(b){
    b.innerHTML=daylightMode?"☾ Normal":"☀ Dag";
    b.classList.toggle("on",daylightMode);
  }
  var fs=document.getElementById("fs-day-btn");
  if(fs)fs.classList.toggle("active",daylightMode);
  if(typeof drawPitch==="function")drawPitch();
  if(typeof render==="function")render();
}
function bindInputV53(id,fn){
  var el=document.getElementById(id);
  if(!el || el.dataset.v53Bound)return;
  el.dataset.v53Bound="1";
  ["input","change"].forEach(function(ev){
    el.addEventListener(ev,function(){fn(el.value,el.checked);},true);
  });
}
function bindButtonV53(id,fn){
  var el=document.getElementById(id);
  if(!el || el.dataset.v53Bound)return;
  el.dataset.v53Bound="1";
  el.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();fn(e);return false;},true);
}
function bindControlsV53(){
  bindInputV53("arrow-color-sel",function(v){arrowColor=v;});
  bindInputV53("arrow-type-sel",function(v){arrowType=v;});
  bindInputV53("arrow-width-sel",function(v){arrowWidth=parseInt(v,10)||3;});
  bindInputV53("freehand-color-sel",function(v){freehandColor=v;});
  bindInputV53("freehand-width-sel",function(v){freehandWidth=parseInt(v,10)||4;});
  bindInputV53("zone-shape-sel",function(v){zoneShapeType=v;});
  bindInputV53("zone-color-sel",function(v){zoneColor=v;});

  bindInputV53("chk-korridorer",function(v,checked){showKorridorer=!!checked;render();});
  bindInputV53("chk-arrow-numbers",function(v,checked){showArrowNumbers=!!checked;render();});

  // Ersätt eventuell gammal click som inte längre biter.
  var day=document.getElementById("btn-daylight");
  if(day && !day.dataset.v53HardBound){
    var clone=day.cloneNode(true);
    day.parentNode.replaceChild(clone,day);
    clone.dataset.v53HardBound="1";
    clone.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();setDaylightV53(!daylightMode);return false;},true);
  }
  var fsday=document.getElementById("fs-day-btn");
  if(fsday && !fsday.dataset.v53HardBound){
    var clone2=fsday.cloneNode(true);
    fsday.parentNode.replaceChild(clone2,fsday);
    clone2.dataset.v53HardBound="1";
    clone2.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();setDaylightV53(!daylightMode);return false;},true);
  }
}
bindControlsV53();
setTimeout(bindControlsV53,300);
setTimeout(bindControlsV53,1200);

// 7) Korridorer: ta bort texten upptill, behåll bara längst ner.
var _renderKorridorer_v53 = typeof renderKorridorer==="function" ? renderKorridorer : null;
renderKorridorer=function(){
  var old=svg.querySelectorAll(".korridor-g");for(var i=0;i<old.length;i++)old[i].remove();
  if(!showKorridorer)return;
  var ns="http://www.w3.org/2000/svg", H2=600;
  var cols=[
    {x:0,w:72,label:"Yttre korridor",fill:"rgba(74,232,232,0.10)",stroke:"rgba(74,232,232,0.35)"},
    {x:72,w:72,label:"Inre korridor",fill:"rgba(160,120,255,0.10)",stroke:"rgba(160,120,255,0.35)"},
    {x:144,w:112,label:"Central korridor",fill:"rgba(74,232,122,0.10)",stroke:"rgba(74,232,122,0.35)"},
    {x:256,w:72,label:"Inre korridor",fill:"rgba(160,120,255,0.10)",stroke:"rgba(160,120,255,0.35)"},
    {x:328,w:72,label:"Yttre korridor",fill:"rgba(74,232,232,0.10)",stroke:"rgba(74,232,232,0.35)"}
  ];
  cols.forEach(function(c){
    var g=document.createElementNS(ns,"g");g.setAttribute("class","korridor-g");g.style.pointerEvents="none";
    var r=document.createElementNS(ns,"rect");
    r.setAttribute("x",c.x);r.setAttribute("y",0);r.setAttribute("width",c.w);r.setAttribute("height",H2);
    r.setAttribute("fill",c.fill);r.setAttribute("stroke",c.stroke);r.setAttribute("stroke-width","1");
    g.appendChild(r);
    var t=document.createElementNS(ns,"text");
    t.setAttribute("x",c.x+c.w/2);t.setAttribute("y",H2-6);
    t.setAttribute("text-anchor","middle");t.setAttribute("fill",c.stroke.replace("0.35","0.9"));
    t.setAttribute("font-size","8");t.setAttribute("font-family","Arial Narrow, Arial, sans-serif");
    t.setAttribute("font-weight","700");t.setAttribute("letter-spacing","0.3");
    t.textContent=c.label;
    g.appendChild(t);
    var firstPlayer=svg.querySelector(".player-token,.ball-token,.arrow-g,.label-g,.zone-g,.freehand-g,.mv-path-g");
    svg.insertBefore(g,firstPlayer||svg.firstChild);
  });
};

// 3) Panelbyte: töm/neutralisera matchvisning när man lämnar Lag/Matcher så listan inte ligger kvar.
function clearMatchOverlayV53(){
  ["sparade-matcher-list","match-trupp-list","statistik-list","statistik-content"].forEach(function(id){
    var el=document.getElementById(id);
    if(el && !document.querySelector('.tab.on[data-panel="lag"]')){
      el.innerHTML="";
    }
  });
  var bench=document.getElementById("bench-bar");
  if(bench && !document.querySelector('.tab.on[data-panel="lag"]')){
    bench.style.display="none";
  }
  var goal=document.getElementById("goal-overlay");
  if(goal && !document.querySelector('.tab.on[data-panel="lag"]')){
    goal.style.display="none";
  }
}
document.querySelectorAll(".tab").forEach(function(tab){
  if(tab.dataset.v53PanelBound)return;
  tab.dataset.v53PanelBound="1";
  tab.addEventListener("click",function(){
    setTimeout(function(){
      document.querySelectorAll(".panel").forEach(function(p){
        p.style.display=p.classList.contains("on")?"":"none";
      });
      clearMatchOverlayV53();
    },0);
  },true);
});

// 4,5) Fullscreen: flytta verktyg till vänster, aktivera nedre knappar, göm taktikpilar i formation.
function updateFullscreenModeV53(){
  var isTk=!!(playback||isEditingTaktik||editingTaktikIdx!==null||document.querySelector('.tab.on[data-panel="taktik"]'));
  document.body.classList.toggle("v53-taktik-fs",isTk);
  ["fs-first-btn","fs-prev-btn","fs-next-btn","fs-step-label"].forEach(function(id){
    var el=document.getElementById(id);if(el)el.style.display=isTk?"":"none";
  });
  var mv=document.getElementById("fs-tb-movement");
  if(mv)mv.style.display=isTk?"":"none";
}
var _syncFullscreenToolButtons_v53=typeof syncFullscreenToolButtons==="function"?syncFullscreenToolButtons:null;
syncFullscreenToolButtons=function(){
  updateFullscreenModeV53();
  if(_syncFullscreenToolButtons_v53)_syncFullscreenToolButtons_v53.apply(this,arguments);
  updateFullscreenModeV53();
};

// Nedre knappar: säkerställ att dagsläge funkar även efter clone/ersättning.
["ls-day-btn3","fs-day-btn"].forEach(function(id){
  var b=document.getElementById(id);
  if(b && !b.dataset.v53DayBound){
    b.dataset.v53DayBound="1";
    b.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();setDaylightV53(!daylightMode);return false;},true);
  }
});

setInterval(function(){
  try{updateFullscreenModeV53();}catch(e){}
},600);

// Kör första laddning igen med nya legacy-regler.
setTimeout(function(){
  try{cloudLoadSaves();}catch(e){}
  try{cloudLoadTaktik();}catch(e){}
  try{renderSavesList();renderTaktikList();}catch(e){}
  try{bindControlsV53();}catch(e){}
},500);

/* === slut v53 === */


/* === v55-safe: återställ klickbar app + små säkra fixar === */

// 1) Legacy: gör bara synlighetslogiken säkrare. Ingen bred select=*-hämtning här.
function isLegacyFileV55(obj){
  if(!obj)return false;
  var m={};
  try{
    if(typeof fileMetaV10==="function")m=fileMetaV10(obj)||{};
  }catch(e){m={};}
  if(obj.state && obj.state._meta)m=obj.state._meta;
  if(obj.data && obj.data._meta)m=obj.data._meta;
  if(obj._meta)m=obj._meta;
  return !(m && (m.ownerId || m.ownerName || m.teamId || m.teamCode));
}
if(typeof isMineV10==="function"){
  var _isMineV10_v55=isMineV10;
  isMineV10=function(obj){
    if(isLegacyFileV55(obj))return true;
    return _isMineV10_v55.apply(this,arguments);
  };
}
if(typeof isSameTeamSharedV10==="function"){
  var _isSameTeamSharedV10_v55=isSameTeamSharedV10;
  isSameTeamSharedV10=function(obj){
    if(isLegacyFileV55(obj))return false;
    return _isSameTeamSharedV10_v55.apply(this,arguments);
  };
}
if(typeof isReadOnlyFileV10==="function"){
  var _isReadOnlyFileV10_v55=isReadOnlyFileV10;
  isReadOnlyFileV10=function(obj){
    if(isLegacyFileV55(obj))return false;
    return _isReadOnlyFileV10_v55.apply(this,arguments);
  };
}
if(typeof isFileVisibleInScopeV10==="function"){
  var _isFileVisibleInScopeV10_v55=isFileVisibleInScopeV10;
  isFileVisibleInScopeV10=function(obj,scope){
    if(scope==="mine" && isLegacyFileV55(obj))return true;
    if(scope==="team" && isLegacyFileV55(obj))return false;
    return _isFileVisibleInScopeV10_v55.apply(this,arguments);
  };
}

function markLegacyRowsV55(){
  function tag(row){
    if(!row || row.querySelector(".legacy-v55,.legacy-v54,.legacy-v53,.legacy-v52"))return;
    var t=document.createElement("span");
    t.className="legacy-v55";
    t.textContent="Äldre";
    t.style.cssText="font-size:0.58rem;color:#e8c84a;border:1px solid #5a4a18;border-radius:999px;padding:1px 5px;margin-left:4px;white-space:nowrap";
    var n=row.querySelector(".row-name")||row.firstChild;
    if(n&&n.parentNode)n.parentNode.insertBefore(t,n.nextSibling);
  }
  Array.prototype.slice.call(document.querySelectorAll("#saves-list .row")).forEach(function(row){
    var nm=row.querySelector(".row-name"); if(!nm)return;
    var obj=(savedFormations||[]).find(function(s){return String(s.name||"").trim()===String(nm.textContent||"").trim();});
    if(obj && isLegacyFileV55(obj))tag(row);
  });
  Array.prototype.slice.call(document.querySelectorAll("#taktik-list .row")).forEach(function(row){
    var nm=row.querySelector(".row-name"); if(!nm)return;
    var obj=(taktikFilmer||[]).find(function(t){return String(t.name||"").trim()===String(nm.textContent||"").trim();});
    if(obj && isLegacyFileV55(obj))tag(row);
  });
}
if(typeof renderSavesList==="function"){
  var _renderSavesList_v55=renderSavesList;
  renderSavesList=function(){var r=_renderSavesList_v55.apply(this,arguments);setTimeout(markLegacyRowsV55,0);return r;};
}
if(typeof renderTaktikList==="function"){
  var _renderTaktikList_v55=renderTaktikList;
  renderTaktikList=function(){var r=_renderTaktikList_v55.apply(this,arguments);setTimeout(markLegacyRowsV55,0);return r;};
}

// 2) Sparade matcher: använd rätt id och dölj/töm endast när man lämnar huvudfliken Lag.
function hideSavedMatchesWhenLeavingLagV55(){
  var lagActive=!!document.querySelector('.tab.on[data-panel="lag"]');
  if(!lagActive){
    var lagSparade=document.getElementById("lag-sparade");
    if(lagSparade)lagSparade.style.display="none";
    var list=document.getElementById("sparade-match-list");
    if(list)list.innerHTML="";
    var bp=document.getElementById("bottompanel");
    if(bp)bp.classList.remove("expanded");
  }
}
document.querySelectorAll(".tab").forEach(function(tab){
  if(tab.dataset.v55PanelBound)return;
  tab.dataset.v55PanelBound="1";
  tab.addEventListener("click",function(){
    setTimeout(hideSavedMatchesWhenLeavingLagV55,0);
  },true);
});
if(typeof renderSparadeMatcherList==="function"){
  var _renderSparadeMatcherList_v55=renderSparadeMatcherList;
  renderSparadeMatcherList=function(){
    if(!document.querySelector('.tab.on[data-panel="lag"]')){
      var l=document.getElementById("sparade-match-list");
      if(l)l.innerHTML="";
      return;
    }
    return _renderSparadeMatcherList_v55.apply(this,arguments);
  };
}

// 3) Fullscreen dagsläge: flytta upp knappen och bind med capture, utan att ersätta noder.
function setDaylightV55(on){
  daylightMode=!!on;
  document.body.classList.toggle("daylight",daylightMode);
  var top=document.getElementById("btn-daylight");
  if(top){
    top.innerHTML=daylightMode?"☾ Normal":"☀ Dag";
    top.classList.toggle("on",daylightMode);
  }
  ["fs-day-btn","ls-day-btn3"].forEach(function(id){
    var b=document.getElementById(id);
    if(b){
      b.innerHTML=daylightMode?"☾":"☀";
      b.classList.toggle("active",daylightMode);
      b.title=daylightMode?"Normal vy":"Dagsljus";
    }
  });
  if(typeof drawPitch==="function")drawPitch();
  if(typeof render==="function")render();
}
function setupFullscreenDayV55(){
  var day=document.getElementById("fs-day-btn");
  var bar=document.getElementById("fs-portrait-nav");
  if(day&&bar){
    day.classList.add("v55-top-day");
    var after=document.getElementById("fs-tb-text") || document.getElementById("fs-tb-zone") || document.getElementById("fs-tb-freehand") || document.getElementById("fs-tb-arrow");
    if(after && after.nextSibling!==day){
      bar.insertBefore(day, after.nextSibling);
    }
    if(!day.dataset.v55Bound){
      day.dataset.v55Bound="1";
      day.addEventListener("click",function(e){
        e.preventDefault();e.stopPropagation();
        setDaylightV55(!daylightMode);
        return false;
      },true);
    }
  }
  var low=document.getElementById("ls-day-btn3");
  if(low && !low.dataset.v55Bound){
    low.dataset.v55Bound="1";
    low.addEventListener("click",function(e){
      e.preventDefault();e.stopPropagation();
      setDaylightV55(!daylightMode);
      return false;
    },true);
  }
}
setupFullscreenDayV55();
setTimeout(setupFullscreenDayV55,300);
setTimeout(setupFullscreenDayV55,1200);

var _syncFullscreenToolButtons_v55=typeof syncFullscreenToolButtons==="function"?syncFullscreenToolButtons:null;
if(_syncFullscreenToolButtons_v55){
  syncFullscreenToolButtons=function(){
    _syncFullscreenToolButtons_v55.apply(this,arguments);
    setupFullscreenDayV55();
  };
}

setTimeout(function(){
  try{hideSavedMatchesWhenLeavingLagV55();}catch(e){}
  try{renderSavesList();}catch(e){}
  try{renderTaktikList();}catch(e){}
},600);

/* === slut v55-safe === */


/* === v56-adopt: manuell märkning av äldre filer i databasen ===
   Säker idé:
   - körs bara när tränaren trycker på knappen
   - ändrar bara rader som saknar data._meta
   - taktik/utgångslägen får ownerId och team
   - matcher får teamId/teamCode och blir laggemensamma
*/

function getProfileV56(){
  try{
    if(typeof ensureUserProfile==="function"){
      return ensureUserProfile(false);
    }
    if(typeof getUserProfile==="function"){
      return getUserProfile();
    }
    var raw=localStorage.getItem("tt_profile_v1");
    return raw?JSON.parse(raw):null;
  }catch(e){return null;}
}

function metaMissingV56(data,kind){
  var m=(data&&data._meta)||{};
  if(kind==="match"){
    return !(m.teamId || m.teamCode);
  }
  return !(m.ownerId || m.ownerName || m.teamId || m.teamCode);
}

function makeMetaV56(kind,p){
  var now=new Date().toISOString();
  if(kind==="match"){
    return {
      teamId:p.teamId,
      teamCode:p.teamCode,
      teamName:p.teamName||p.teamCode,
      createdBy:p.ownerName,
      updatedAt:now
    };
  }
  return {
    ownerId:p.ownerId,
    ownerName:p.ownerName,
    teamId:p.teamId,
    teamCode:p.teamCode,
    sharedWithTeam:false,
    teamCanEdit:false,
    updatedAt:now
  };
}

function typeToKindV56(type){
  if(type==="uppstallning")return "formation";
  if(type==="taktikfilm")return "taktik";
  if(type==="match")return "match";
  return null;
}

function fetchRowsByTypeV56(type){
  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq."+encodeURIComponent(type)+"&select=*",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){return Array.isArray(data)?data:[];});
}

function patchRowMetaV56(row,p){
  var kind=typeToKindV56(row.type);
  if(!kind || !row || !row.id)return Promise.resolve({skipped:true});
  var oldData=JSON.parse(JSON.stringify(row.data||{}));
  if(!metaMissingV56(oldData,kind))return Promise.resolve({skipped:true});

  oldData._meta=Object.assign({}, oldData._meta||{}, makeMetaV56(kind,p));

  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+row.id,{
    method:"PATCH",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify({data:oldData})
  }).then(function(r){
    if(!r.ok)throw new Error("Kunde inte uppdatera rad "+row.id);
    return r.json();
  }).then(function(){
    return {updated:true,type:row.type,id:row.id,name:row.name||oldData.name||""};
  });
}

function scanLegacyRowsV56(){
  return Promise.all([
    fetchRowsByTypeV56("uppstallning"),
    fetchRowsByTypeV56("taktikfilm"),
    fetchRowsByTypeV56("match")
  ]).then(function(groups){
    var rows=[].concat(groups[0]||[],groups[1]||[],groups[2]||[]);
    return rows.filter(function(row){
      var kind=typeToKindV56(row.type);
      return kind && metaMissingV56(row.data||{},kind);
    });
  });
}

function runAdoptLegacyFilesV56(){
  var p=getProfileV56();
  if(!p || !p.ownerId || !p.teamId){
    showToast("Fyll i profil och lag först",false);
    if(typeof ensureUserProfile==="function")ensureUserProfile(true);
    return;
  }

  cloudStatus("Söker äldre filer...","#7aaa88");
  scanLegacyRowsV56().then(function(rows){
    if(!rows.length){
      showToast("Inga äldre omärkta filer hittades");
      cloudStatus("✅ Inga äldre filer att märka","#4ae87a");
      return;
    }

    var counts={uppstallning:0,taktikfilm:0,match:0};
    rows.forEach(function(r){counts[r.type]=(counts[r.type]||0)+1;});

    var msg="Jag hittade omärkta äldre filer:\n\n"+
      "Utgångslägen: "+counts.uppstallning+"\n"+
      "Taktikfilmer: "+counts.taktikfilm+"\n"+
      "Matcher: "+counts.match+"\n\n"+
      "De märks med:\n"+
      p.ownerName+" · "+p.teamCode+"\n\n"+
      "Utgångslägen/taktik blir dina filer. Matcher blir lagets filer.\n\n"+
      "Vill du fortsätta?";

    if(!confirm(msg)){
      cloudStatus("Avbrutet","#7aaa88");
      return;
    }

    cloudStatus("Märker äldre filer...","#e8c84a");
    var done=0, failed=0;
    var chain=Promise.resolve();

    rows.forEach(function(row){
      chain=chain.then(function(){
        return patchRowMetaV56(row,p)
          .then(function(res){if(res.updated)done++;})
          .catch(function(err){failed++;console.error(err);});
      });
    });

    return chain.then(function(){
      var text="Märkning klar: "+done+" uppdaterade"+(failed?(", "+failed+" fel"):"");
      showToast(text, failed?false:true);
      cloudStatus((failed?"⚠️ ":"✅ ")+text, failed?"#e8c84a":"#4ae87a");

      // Ladda om listorna efter märkning.
      try{cloudLoadSaves();}catch(e){}
      try{cloudLoadTaktik();}catch(e){}
      try{loadMatcher();}catch(e){}
    });
  }).catch(function(err){
    showToast("Kunde inte söka äldre filer",false);
    cloudStatus("❌ "+err.message,"#e84a4a");
  });
}

function addAdoptLegacyButtonV56(){
  var topbar=document.getElementById("topbar");
  if(!topbar || document.getElementById("btn-adopt-legacy-v56"))return;
  var row=document.getElementById("v48-topbar-open-row") || topbar.querySelector("div") || topbar;

  var btn=document.createElement("button");
  btn.id="btn-adopt-legacy-v56";
  btn.className="btn";
  btn.textContent="🔧 Äldre";
  btn.title="Märk gamla omärkta filer med din profil/lag";
  btn.style.cssText="font-size:0.68rem;color:#e8c84a;border-color:#e8c84a";
  btn.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();
    runAdoptLegacyFilesV56();
    return false;
  },true);

  row.appendChild(btn);
}

addAdoptLegacyButtonV56();
setTimeout(addAdoptLegacyButtonV56,300);
setTimeout(addAdoptLegacyButtonV56,1200);

/* === slut v56-adopt === */


/* === v57-adopt-broad: hitta gamla filer även om type/folder/name saknas ===
   v56 sökte bara rader med type=uppstallning/taktikfilm/match.
   v57 söker ALLA rader när man trycker på 🔧 Äldre, klassar dem efter data-innehåll,
   och sätter både data._meta och korrekt top-level type/folder/name vid behov.
   Detta körs fortfarande inte vid vanlig uppstart.
*/

function getProfileV57(){
  try{
    if(typeof ensureUserProfile==="function")return ensureUserProfile(false);
    if(typeof getUserProfile==="function")return getUserProfile();
    var raw=localStorage.getItem("tt_profile_v1");
    return raw?JSON.parse(raw):null;
  }catch(e){return null;}
}

function metaV57(data){
  return (data&&data._meta)||{};
}

function classifyRowV57(row){
  if(!row)return null;
  var d=row.data||{};
  var t=row.type||"";

  if(t==="taktikfilm" || (Array.isArray(d.steps) && d.steps.length>=2)){
    return "taktikfilm";
  }

  if(t==="uppstallning"){
    return "uppstallning";
  }

  // Utgångslägen kan se lite olika ut i äldre versioner.
  // Vanliga tecken: players-array, ball, arrows/freehand/zones, format, formation.
  if(
    (Array.isArray(d.players) && !Array.isArray(d.steps)) ||
    (d.ball && !Array.isArray(d.steps)) ||
    (d.formation && !Array.isArray(d.steps)) ||
    (d.format && !Array.isArray(d.steps) && !d.trupp)
  ){
    return "uppstallning";
  }

  if(t==="match"){
    return "match";
  }

  // Matchrader kan sakna type men har datum/motstånd/startade.
  if(d.datum && (d.motstand || d.motstånd || d.opponent || Array.isArray(d.startade))){
    return "match";
  }

  return null;
}

function rowNeedsAdoptV57(row,kind){
  var d=row.data||{};
  var m=metaV57(d);

  // Om type saknas/fel ska den fixas även om meta redan finns.
  if(row.type!==kind)return true;

  // Om folder/name saknas på filer som ska visas i listor ska de fixas.
  if((kind==="uppstallning" || kind==="taktikfilm") && !row.name && !d.name)return true;
  if((kind==="uppstallning" || kind==="taktikfilm") && !row.folder && !d.folder)return true;

  if(kind==="match"){
    return !(m.teamId || m.teamCode);
  }

  return !(m.ownerId || m.ownerName || m.teamId || m.teamCode);
}

function makeMetaV57(kind,p){
  var now=new Date().toISOString();
  if(kind==="match"){
    return {
      teamId:p.teamId,
      teamCode:p.teamCode,
      teamName:p.teamName||p.teamCode,
      createdBy:p.ownerName,
      updatedAt:now
    };
  }
  return {
    ownerId:p.ownerId,
    ownerName:p.ownerName,
    teamId:p.teamId,
    teamCode:p.teamCode,
    sharedWithTeam:false,
    teamCanEdit:false,
    updatedAt:now
  };
}

function defaultNameV57(row,kind,d){
  if(row.name)return row.name;
  if(d.name)return d.name;
  if(kind==="taktikfilm")return "Äldre taktikfilm "+row.id;
  if(kind==="uppstallning")return "Äldre utgångsläge "+row.id;
  if(kind==="match")return (d.datum||"Match")+" "+(d.motstand||d.motstånd||"");
  return "Äldre fil "+row.id;
}

function defaultFolderV57(row,kind,d){
  if(row.folder)return row.folder;
  if(d.folder)return d.folder;
  if(kind==="taktikfilm")return "Taktik";
  return "Allmänt";
}

function patchAdoptRowV57(row,kind,p){
  var d=JSON.parse(JSON.stringify(row.data||{}));
  var oldMeta=d._meta||{};
  d._meta=Object.assign({}, oldMeta, makeMetaV57(kind,p));

  var body={data:d,type:kind};

  if(kind==="uppstallning" || kind==="taktikfilm"){
    body.name=defaultNameV57(row,kind,d);
    body.folder=defaultFolderV57(row,kind,d);
  }else if(kind==="match"){
    body.name=defaultNameV57(row,kind,d);
    body.folder=row.folder||"Matcher";
  }

  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+row.id,{
    method:"PATCH",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify(body)
  }).then(function(r){
    if(!r.ok)throw new Error("Kunde inte uppdatera rad "+row.id);
    return r.json();
  }).then(function(){
    return {updated:true,type:kind,id:row.id,name:body.name};
  });
}

function scanAllRowsForAdoptionV57(){
  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?select=*&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){
      if(!Array.isArray(data))return [];
      return data.map(function(row){
        var kind=classifyRowV57(row);
        return {row:row,kind:kind};
      }).filter(function(x){
        return x.kind && rowNeedsAdoptV57(x.row,x.kind);
      });
    });
}

function runAdoptLegacyFilesV57(){
  var p=getProfileV57();
  if(!p || !p.ownerId || !p.teamId){
    showToast("Fyll i profil och lag först",false);
    if(typeof ensureUserProfile==="function")ensureUserProfile(true);
    return;
  }

  cloudStatus("Söker äldre filer brett...","#7aaa88");

  scanAllRowsForAdoptionV57().then(function(items){
    if(!items.length){
      showToast("Inga äldre omärkta filer hittades");
      cloudStatus("✅ Inga äldre filer att märka","#4ae87a");
      return;
    }

    var counts={uppstallning:0,taktikfilm:0,match:0};
    items.forEach(function(x){counts[x.kind]=(counts[x.kind]||0)+1;});

    var msg="Jag hittade äldre/omärkta rader att fixa:\n\n"+
      "Utgångslägen: "+counts.uppstallning+"\n"+
      "Taktikfilmer: "+counts.taktikfilm+"\n"+
      "Matcher: "+counts.match+"\n\n"+
      "Jag sätter också rätt typ/folder/namn om det saknas.\n\n"+
      "De märks med:\n"+p.ownerName+" · "+p.teamCode+"\n\n"+
      "Vill du fortsätta?";

    if(!confirm(msg)){
      cloudStatus("Avbrutet","#7aaa88");
      return;
    }

    cloudStatus("Märker äldre filer...","#e8c84a");

    var done=0, failed=0;
    var chain=Promise.resolve();

    items.forEach(function(item){
      chain=chain.then(function(){
        return patchAdoptRowV57(item.row,item.kind,p)
          .then(function(){done++;})
          .catch(function(err){failed++;console.error(err);});
      });
    });

    return chain.then(function(){
      var text="Märkning klar: "+done+" uppdaterade"+(failed?(", "+failed+" fel"):"");
      showToast(text, failed?false:true);
      cloudStatus((failed?"⚠️ ":"✅ ")+text, failed?"#e8c84a":"#4ae87a");

      // Ladda om allt efter att top-level type/folder/name nu är korrigerat.
      setTimeout(function(){
        try{cloudLoadSaves();}catch(e){}
        try{cloudLoadTaktik();}catch(e){}
        try{loadMatcher();}catch(e){}
        try{renderSavesList();}catch(e){}
        try{renderTaktikList();}catch(e){}
      },500);
    });
  }).catch(function(err){
    showToast("Kunde inte söka äldre filer",false);
    cloudStatus("❌ "+err.message,"#e84a4a");
  });
}

// Byt funktion på befintliga 🔧 Äldre-knappen från v56 till bredare v57-variant.
function rebindAdoptLegacyButtonV57(){
  var btn=document.getElementById("btn-adopt-legacy-v56");
  if(!btn)return;
  btn.textContent="🔧 Äldre+";
  btn.title="Hitta och märk gamla filer även om typ/folder saknas";
  if(btn.dataset.v57Bound)return;
  var clone=btn.cloneNode(true);
  btn.parentNode.replaceChild(clone,btn);
  clone.id="btn-adopt-legacy-v56";
  clone.dataset.v57Bound="1";
  clone.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();
    runAdoptLegacyFilesV57();
    return false;
  },true);
}

rebindAdoptLegacyButtonV57();
setTimeout(rebindAdoptLegacyButtonV57,300);
setTimeout(rebindAdoptLegacyButtonV57,1200);

/* === slut v57-adopt-broad === */


/* === v58-claim: ta över märkta men osynliga gamla filer ===
   Problem efter v56/v57:
   - raderna kan ha fått _meta
   - då hittas de inte längre som omärkta
   - men de kan vara märkta med annat ownerId än nuvarande profil
   Lösning:
   - knapp "🔧 Ta över"
   - söker ALLA taktik/uppställningar
   - föreslår rader som inte syns som Mina för aktuell profil
   - patchar ownerId/ownerName/teamId/teamCode till aktuell profil
   - matcher patchas till aktuellt team om de har annat/saknat team
*/

function profileV58(){
  try{
    if(typeof ensureUserProfile==="function")return ensureUserProfile(false);
    if(typeof getUserProfile==="function")return getUserProfile();
    var raw=localStorage.getItem("tt_profile_v1");
    return raw?JSON.parse(raw):null;
  }catch(e){return null;}
}

function metaV58(d){
  return (d&&d._meta)||{};
}

function isTaktikRowV58(row){
  var d=row.data||{};
  return row.type==="taktikfilm" || (Array.isArray(d.steps) && d.steps.length>=2);
}

function isFormationRowV58(row){
  var d=row.data||{};
  if(row.type==="uppstallning")return true;
  if(row.type==="taktikfilm" || row.type==="match" || row.type==="trupp")return false;
  return !!(
    (Array.isArray(d.players) && !Array.isArray(d.steps)) ||
    (d.ball && !Array.isArray(d.steps)) ||
    (d.formation && !Array.isArray(d.steps)) ||
    (d.format && !Array.isArray(d.steps) && !d.trupp)
  );
}

function isMatchRowV58(row){
  var d=row.data||{};
  return row.type==="match" || !!(d.datum && (d.motstand || d.motstånd || Array.isArray(d.startade)));
}

function kindV58(row){
  if(isTaktikRowV58(row))return "taktikfilm";
  if(isFormationRowV58(row))return "uppstallning";
  if(isMatchRowV58(row))return "match";
  return null;
}

function nameV58(row,kind){
  var d=row.data||{};
  if(row.name)return row.name;
  if(d.name)return d.name;
  if(kind==="taktikfilm")return "Äldre taktikfilm "+row.id;
  if(kind==="uppstallning")return "Äldre utgångsläge "+row.id;
  if(kind==="match")return (d.datum||"Match")+" "+(d.motstand||d.motstånd||"");
  return "Fil "+row.id;
}

function folderV58(row,kind){
  var d=row.data||{};
  if(row.folder)return row.folder;
  if(d.folder)return d.folder;
  if(kind==="taktikfilm")return "Taktik";
  if(kind==="match")return "Matcher";
  return "Allmänt";
}

function isVisibleAsMineV58(row,p,kind){
  var m=metaV58(row.data||{});
  if(kind==="match"){
    return String(m.teamId||m.teamCode||"")===String(p.teamId||p.teamCode||"");
  }
  return String(m.ownerId||"")===String(p.ownerId||"");
}

function needsClaimV58(row,p,kind){
  var d=row.data||{};
  var m=metaV58(d);

  if(kind==="match"){
    // Matcher ska tillhöra laget, inte person. Ta över om team saknas eller är annat.
    return String(m.teamId||m.teamCode||"")!==String(p.teamId||p.teamCode||"") || row.type!=="match";
  }

  // Taktik/utgångsläge: ta över om ownerId saknas/är annat eller om type/folder/name saknas.
  if(String(m.ownerId||"")!==String(p.ownerId||""))return true;
  if(row.type!==kind)return true;
  if(!row.name && !d.name)return true;
  if(!row.folder && !d.folder)return true;
  return false;
}

function patchClaimV58(row,p,kind){
  var d=JSON.parse(JSON.stringify(row.data||{}));
  var m=d._meta||{};
  var now=new Date().toISOString();

  if(kind==="match"){
    m.teamId=p.teamId;
    m.teamCode=p.teamCode;
    m.teamName=p.teamName||p.teamCode;
    m.updatedAt=now;
    if(!m.createdBy)m.createdBy=p.ownerName;
  }else{
    m.ownerId=p.ownerId;
    m.ownerName=p.ownerName;
    m.teamId=p.teamId;
    m.teamCode=p.teamCode;
    if(typeof m.sharedWithTeam==="undefined")m.sharedWithTeam=false;
    if(typeof m.teamCanEdit==="undefined")m.teamCanEdit=false;
    m.updatedAt=now;
  }

  d._meta=m;

  var body={
    data:d,
    type:kind,
    name:nameV58(row,kind),
    folder:folderV58(row,kind)
  };

  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+row.id,{
    method:"PATCH",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify(body)
  }).then(function(r){
    if(!r.ok)throw new Error("Kunde inte ta över rad "+row.id);
    return r.json();
  });
}

function fetchAllRowsV58(){
  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?select=*&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){return Array.isArray(data)?data:[];});
}

function runClaimInvisibleV58(){
  var p=profileV58();
  if(!p || !p.ownerId || !p.teamId){
    showToast("Fyll i profil och lag först",false);
    if(typeof ensureUserProfile==="function")ensureUserProfile(true);
    return;
  }

  cloudStatus("Söker märkta men osynliga filer...","#7aaa88");

  fetchAllRowsV58().then(function(rows){
    var items=[];
    rows.forEach(function(row){
      var kind=kindV58(row);
      if(!kind)return;
      if(needsClaimV58(row,p,kind)){
        items.push({row:row,kind:kind});
      }
    });

    if(!items.length){
      showToast("Inga filer att ta över hittades");
      cloudStatus("✅ Inga osynliga filer hittades","#4ae87a");
      return;
    }

    var counts={uppstallning:0,taktikfilm:0,match:0};
    items.forEach(function(x){counts[x.kind]=(counts[x.kind]||0)+1;});

    var preview=items.slice(0,8).map(function(x){
      var m=metaV58(x.row.data||{});
      return "• "+nameV58(x.row,x.kind)+" ("+x.kind+", ägare: "+(m.ownerName||m.ownerId||"saknas")+")";
    }).join("\n");

    var msg="Jag hittade filer som kan vara märkta men inte kopplade till din nuvarande profil/lag:\n\n"+
      "Utgångslägen: "+counts.uppstallning+"\n"+
      "Taktikfilmer: "+counts.taktikfilm+"\n"+
      "Matcher: "+counts.match+"\n\n"+
      "Exempel:\n"+preview+(items.length>8?"\n…":"")+"\n\n"+
      "Jag kommer koppla dem till:\n"+
      p.ownerName+" · "+p.teamCode+"\n\n"+
      "Fortsätta?";

    if(!confirm(msg)){
      cloudStatus("Avbrutet","#7aaa88");
      return;
    }

    cloudStatus("Tar över filer...","#e8c84a");
    var done=0,failed=0;
    var chain=Promise.resolve();

    items.forEach(function(item){
      chain=chain.then(function(){
        return patchClaimV58(item.row,p,item.kind)
          .then(function(){done++;})
          .catch(function(err){failed++;console.error(err);});
      });
    });

    return chain.then(function(){
      var text="Klart: "+done+" filer kopplade"+(failed?(", "+failed+" fel"):"");
      showToast(text, failed?false:true);
      cloudStatus((failed?"⚠️ ":"✅ ")+text, failed?"#e8c84a":"#4ae87a");

      setTimeout(function(){
        try{cloudLoadSaves();}catch(e){}
        try{cloudLoadTaktik();}catch(e){}
        try{loadMatcher();}catch(e){}
        try{renderSavesList();}catch(e){}
        try{renderTaktikList();}catch(e){}
      },500);
    });
  }).catch(function(err){
    showToast("Kunde inte söka filer",false);
    cloudStatus("❌ "+err.message,"#e84a4a");
  });
}

function addClaimButtonV58(){
  var topbar=document.getElementById("topbar");
  if(!topbar || document.getElementById("btn-claim-invisible-v58"))return;
  var row=document.getElementById("v48-topbar-open-row") || topbar.querySelector("div") || topbar;

  var btn=document.createElement("button");
  btn.id="btn-claim-invisible-v58";
  btn.className="btn";
  btn.textContent="🔧 Ta över";
  btn.title="Koppla redan märkta men osynliga filer till min profil/lag";
  btn.style.cssText="font-size:0.68rem;color:#ffb86b;border-color:#ffb86b";
  btn.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();
    runClaimInvisibleV58();
    return false;
  },true);

  row.appendChild(btn);
}

addClaimButtonV58();
setTimeout(addClaimButtonV58,300);
setTimeout(addClaimButtonV58,1200);

/* === slut v58-claim === */


/* === v59-cleanup: ta bort engångsverktyg och säkra profilknapp ===
   Nu när gamla filer är adopterade ska Äldre+/Ta över inte ligga kvar.
   Nya filer får metadata via addMetaToData/getFileMeta.
*/

function removeLegacyAdminButtonsV59(){
  ["btn-adopt-legacy-v56","btn-claim-invisible-v58"].forEach(function(id){
    var b=document.getElementById(id);
    if(b && b.parentNode)b.parentNode.removeChild(b);
  });

  // Fånga även om tidigare patchar hinner skapa om knapparna via setTimeout.
  Array.prototype.slice.call(document.querySelectorAll("button")).forEach(function(b){
    var txt=(b.textContent||"").trim();
    if(txt==="🔧 Äldre" || txt==="🔧 Äldre+" || txt==="🔧 Ta över"){
      if(b.parentNode)b.parentNode.removeChild(b);
    }
  });
}

function profileV59(){
  try{
    if(typeof getUserProfile==="function"){
      var p=getUserProfile();
      if(p)return p;
    }
    var raw=localStorage.getItem("tt_profile_v1");
    return raw?JSON.parse(raw):null;
  }catch(e){return null;}
}

function ensureProfileV59(showDialog){
  try{
    if(typeof ensureUserProfile==="function")return ensureUserProfile(!!showDialog);
  }catch(e){}
  var p=profileV59();
  if(p&&!showDialog)return p;

  var name=prompt("Ditt namn",p&&p.ownerName?p.ownerName:"");
  if(name===null&&p)return p;
  var team=prompt("Lagkod / lagnamn",p&&p.teamCode?p.teamCode:"");
  if(team===null&&p)return p;

  name=String(name||"").trim()||"Tränare";
  team=String(team||"").trim().toUpperCase().replace(/\s+/g,"-")||"MITT-LAG";
  var old=p||{};
  var np={
    ownerId:old.ownerId||("user_"+Math.random().toString(36).slice(2)+Date.now().toString(36)),
    ownerName:name,
    teamId:team,
    teamCode:team,
    teamName:team
  };
  localStorage.setItem("tt_profile_v1",JSON.stringify(np));
  return np;
}

function addStableProfileButtonV59(){
  var topbar=document.getElementById("topbar");
  if(!topbar)return;

  // Om gamla profilknappen finns, använd den. Annars skapa ny.
  var btn=document.getElementById("btn-profile-team") || document.getElementById("btn-profile-v59");
  if(!btn){
    btn=document.createElement("button");
    btn.id="btn-profile-v59";
    btn.className="btn";
    btn.title="Profil och lagkod";
    btn.style.cssText="font-size:0.68rem;color:#4ae8e8;border-color:#4ae8e8";
    btn.addEventListener("click",function(e){
      e.preventDefault();
      e.stopPropagation();
      var p=ensureProfileV59(true);
      updateProfileButtonV59(p);
      if(typeof showToast==="function")showToast("Profil sparad");
      return false;
    },true);

    var row=document.getElementById("v48-topbar-open-row") || topbar.querySelector("div") || topbar;
    row.appendChild(btn);
  }else if(!btn.dataset.v59Bound){
    btn.dataset.v59Bound="1";
    btn.addEventListener("click",function(e){
      e.preventDefault();
      e.stopPropagation();
      var p=ensureProfileV59(true);
      updateProfileButtonV59(p);
      if(typeof showToast==="function")showToast("Profil sparad");
      return false;
    },true);
  }

  updateProfileButtonV59(profileV59());
}

function updateProfileButtonV59(p){
  var btn=document.getElementById("btn-profile-team") || document.getElementById("btn-profile-v59");
  if(!btn)return;
  if(p && p.ownerName && p.teamCode){
    btn.textContent="👤 "+p.ownerName+" · "+p.teamCode;
  }else{
    btn.textContent="👤 Profil";
  }
  btn.style.display="";
  btn.style.visibility="";
  btn.style.pointerEvents="";
}

// Kör flera gånger eftersom äldre patchar också lägger knappar med setTimeout.
removeLegacyAdminButtonsV59();
addStableProfileButtonV59();

setTimeout(function(){
  removeLegacyAdminButtonsV59();
  addStableProfileButtonV59();
},300);

setTimeout(function(){
  removeLegacyAdminButtonsV59();
  addStableProfileButtonV59();
},1300);

setInterval(function(){
  removeLegacyAdminButtonsV59();
},2500);

/* === slut v59-cleanup === */


/* === v60-fullscreen-fix: dagsljus upp + stoppa v55-fel + flytta valmenyer === */

function setDaylightV60(on){
  try{
    daylightMode=!!on;
    document.body.classList.toggle("daylight",daylightMode);

    var top=document.getElementById("btn-daylight");
    if(top){
      top.innerHTML=daylightMode?"☾ Normal":"☀ Dag";
      top.classList.toggle("on",daylightMode);
    }

    ["fs-day-btn","ls-day-btn3"].forEach(function(id){
      var b=document.getElementById(id);
      if(!b)return;
      b.innerHTML=daylightMode?"☾":"☀";
      b.classList.toggle("active",daylightMode);
      b.classList.toggle("on",daylightMode);
      b.title=daylightMode?"Normal vy":"Dagsljus";
    });

    if(typeof drawPitch==="function")drawPitch();
    if(typeof render==="function")render();
  }catch(err){
    console.error("setDaylightV60",err);
    try{showToast("Kunde inte växla dagsläge",false);}catch(e){}
  }
}

/* Gamla eventlisteners från v55 anropar namnet setDaylightV55.
   Gör den till en säker alias så felkoden vid fullscreen försvinner. */
setDaylightV55=setDaylightV60;

function setupFullscreenDayV60(){
  try{
    var day=document.getElementById("fs-day-btn");
    if(!day)return;

    // Viktigt: flytta in i övre verktygsraden, inte i nedre nav.
    var topTools=document.getElementById("fs-top-tools");
    if(topTools){
      day.classList.add("v60-top-day");
      day.classList.remove("v55-top-day");

      var after=document.getElementById("fs-tb-text") ||
                document.getElementById("fs-tb-zone") ||
                document.getElementById("fs-tb-freehand") ||
                document.getElementById("fs-tb-arrow") ||
                document.getElementById("fs-tb-move");

      if(after && after.parentNode===topTools){
        if(after.nextSibling!==day)topTools.insertBefore(day,after.nextSibling);
      }else if(day.parentNode!==topTools){
        topTools.appendChild(day);
      }
    }

    if(!day.dataset.v60Bound){
      day.dataset.v60Bound="1";
      day.addEventListener("click",function(e){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation)e.stopImmediatePropagation();
        setDaylightV60(!daylightMode);
        return false;
      },true);
    }

    var low=document.getElementById("ls-day-btn3");
    if(low)low.style.display="none";
  }catch(err){
    console.error("setupFullscreenDayV60",err);
  }
}

/* Den gamla setupFullscreenDayV55 körs från äldre wrappers. Låt den peka på den säkra versionen. */
setupFullscreenDayV55=setupFullscreenDayV60;

function moveFullscreenOptionMenusV60(){
  try{
    ["arrow-options","zone-options","freehand-options"].forEach(function(id){
      var el=document.getElementById(id);
      if(!el)return;
      if(document.body.classList.contains("fullscreen-portrait")){
        el.style.right="86px";
        el.style.left="auto";
        el.style.top="calc(env(safe-area-inset-top,0px) + 8px)";
        el.style.zIndex="10002";
        el.style.maxWidth="calc(100vw - 112px)";
      }else{
        // Låt normalläget fortsätta som tidigare.
        el.style.right="";
        el.style.left="";
        el.style.top="";
        el.style.zIndex="";
        el.style.maxWidth="";
      }
    });
  }catch(err){console.error("moveFullscreenOptionMenusV60",err);}
}

setupFullscreenDayV60();
moveFullscreenOptionMenusV60();
setTimeout(function(){setupFullscreenDayV60();moveFullscreenOptionMenusV60();},250);
setTimeout(function(){setupFullscreenDayV60();moveFullscreenOptionMenusV60();},1000);

var _syncFullscreenToolButtons_v60=typeof syncFullscreenToolButtons==="function"?syncFullscreenToolButtons:null;
if(_syncFullscreenToolButtons_v60){
  syncFullscreenToolButtons=function(){
    _syncFullscreenToolButtons_v60.apply(this,arguments);
    setupFullscreenDayV60();
    moveFullscreenOptionMenusV60();
  };
}

var _enterFullscreenPortrait_v60=typeof enterFullscreenPortrait==="function"?enterFullscreenPortrait:null;
if(_enterFullscreenPortrait_v60){
  enterFullscreenPortrait=function(){
    _enterFullscreenPortrait_v60.apply(this,arguments);
    setTimeout(function(){setupFullscreenDayV60();moveFullscreenOptionMenusV60();},0);
    setTimeout(function(){setupFullscreenDayV60();moveFullscreenOptionMenusV60();},250);
  };
}

["btn-arrow","btn-freehand","btn-zone","fs-tb-arrow","fs-tb-freehand","fs-tb-zone"].forEach(function(id){
  var b=document.getElementById(id);
  if(b && !b.dataset.v60OptionMove){
    b.dataset.v60OptionMove="1";
    b.addEventListener("click",function(){
      setTimeout(moveFullscreenOptionMenusV60,0);
      setTimeout(moveFullscreenOptionMenusV60,150);
    },true);
  }
});

window.addEventListener("resize",function(){setTimeout(moveFullscreenOptionMenusV60,50);});

/* === slut v60-fullscreen-fix === */


/* === v61-profile-row: flytta profilknappen till tabbraden bredvid Lag === */

function profileV61(){
  try{
    if(typeof getUserProfile==="function"){
      var p=getUserProfile();
      if(p)return p;
    }
    var raw=localStorage.getItem("tt_profile_v1");
    return raw?JSON.parse(raw):null;
  }catch(e){return null;}
}

function ensureProfileV61(showDialog){
  try{
    if(typeof ensureUserProfile==="function")return ensureUserProfile(!!showDialog);
  }catch(e){}
  var p=profileV61();
  if(p&&!showDialog)return p;

  var name=prompt("Ditt namn",p&&p.ownerName?p.ownerName:"");
  if(name===null&&p)return p;
  var team=prompt("Lagkod / lagnamn",p&&p.teamCode?p.teamCode:"");
  if(team===null&&p)return p;

  name=String(name||"").trim()||"Tränare";
  team=String(team||"").trim().toUpperCase().replace(/\s+/g,"-")||"MITT-LAG";
  var old=p||{};
  var np={
    ownerId:old.ownerId||("user_"+Math.random().toString(36).slice(2)+Date.now().toString(36)),
    ownerName:name,
    teamId:team,
    teamCode:team,
    teamName:team
  };
  localStorage.setItem("tt_profile_v1",JSON.stringify(np));
  return np;
}

function updateProfileButtonV61(p){
  var btn=document.getElementById("btn-profile-team") || document.getElementById("btn-profile-v59") || document.getElementById("btn-profile-v61");
  if(!btn)return;
  if(p && p.ownerName && p.teamCode){
    btn.textContent="👤 "+p.ownerName+" · "+p.teamCode;
  }else{
    btn.textContent="👤 Profil";
  }
}

function moveProfileButtonToTabRowV61(){
  var topbar=document.getElementById("topbar");
  if(!topbar)return;

  // Hitta raden där Formation/Utgångsläge/Taktik/Lag ligger.
  var lagTab=document.querySelector('.tab[data-panel="lag"]');
  var tabRow=lagTab ? lagTab.parentNode : null;
  if(!tabRow)return;

  var btn=document.getElementById("btn-profile-team") || document.getElementById("btn-profile-v59") || document.getElementById("btn-profile-v61");

  if(!btn){
    btn=document.createElement("button");
    btn.id="btn-profile-v61";
    btn.className="tab v61-profile-tab";
    btn.title="Profil och lagkod";
  }

  // Gör knappen tabblik men utan att påverka panelval.
  btn.classList.remove("btn");
  btn.classList.add("tab");
  btn.classList.add("v61-profile-tab");
  btn.removeAttribute("data-panel");
  btn.style.fontSize="0.68rem";
  btn.style.padding="3px 9px";
  btn.style.color="#4ae8e8";
  btn.style.borderColor="#4ae8e8";
  btn.style.marginLeft="4px";
  btn.style.whiteSpace="nowrap";
  btn.style.display="";
  btn.style.visibility="";
  btn.style.pointerEvents="";

  if(!btn.dataset.v61Bound){
    btn.dataset.v61Bound="1";
    btn.addEventListener("click",function(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      var p=ensureProfileV61(true);
      updateProfileButtonV61(p);
      if(typeof showToast==="function")showToast("Profil sparad");
      return false;
    },true);
  }

  // Lägg precis efter Lag-knappen.
  if(lagTab.nextSibling!==btn){
    tabRow.insertBefore(btn,lagTab.nextSibling);
  }

  updateProfileButtonV61(profileV61());
}

// Kör efter äldre profilkod så vi flyttar knappen även om den skapas sent.
moveProfileButtonToTabRowV61();
setTimeout(moveProfileButtonToTabRowV61,250);
setTimeout(moveProfileButtonToTabRowV61,1000);
setTimeout(moveProfileButtonToTabRowV61,1800);

/* === slut v61-profile-row === */


/* === v62-fullscreen-corrections: dagsljus klickbar + ta bort bottenrest + visa färgval === */

function setDaylightV62(on){
  try{
    daylightMode=!!on;
    document.body.classList.toggle("daylight", daylightMode);

    var top=document.getElementById("btn-daylight");
    if(top){
      top.innerHTML=daylightMode ? "☾ Normal" : "☀ Dag";
      top.classList.toggle("on", daylightMode);
    }

    var fs=document.getElementById("fs-day-btn");
    if(fs){
      fs.innerHTML=daylightMode ? "☾" : "☀";
      fs.classList.toggle("active", daylightMode);
      fs.classList.toggle("on", daylightMode);
      fs.title=daylightMode ? "Normal vy" : "Dagsljus";
    }

    var low=document.getElementById("ls-day-btn3");
    if(low){
      low.innerHTML=daylightMode ? "☾" : "☀";
      low.classList.toggle("active", daylightMode);
      low.style.display="none";
    }

    if(typeof drawPitch==="function")drawPitch();
    if(typeof render==="function")render();
  }catch(err){
    console.error("setDaylightV62", err);
    try{showToast("Kunde inte växla dagsläge", false);}catch(e){}
  }
}

// Alla gamla namn pekar på samma säkra funktion.
setDaylightV55=setDaylightV62;
setDaylightV60=setDaylightV62;

function removeFullscreenDayRemainderV62(){
  try{
    var low=document.getElementById("ls-day-btn3");
    if(low){
      low.style.display="none";
      low.style.visibility="hidden";
      low.style.width="0";
      low.style.minWidth="0";
      low.style.padding="0";
      low.style.margin="0";
      low.style.border="0";
    }

    // Dölj den lilla separatorn som låg bredvid gamla solknappen i nedre fullscreen-nav.
    var nav=document.getElementById("fs-portrait-nav");
    if(nav){
      Array.prototype.slice.call(nav.children).forEach(function(ch){
        if(ch.tagName==="SPAN" && String(ch.getAttribute("style")||"").indexOf("width:1px")!==-1){
          ch.id="fs-day-old-spacer";
          ch.style.display="none";
          ch.style.visibility="hidden";
          ch.style.width="0";
          ch.style.minWidth="0";
          ch.style.margin="0";
          ch.style.padding="0";
        }
      });
    }
  }catch(err){console.error("removeFullscreenDayRemainderV62",err);}
}

function setupFullscreenDayV62(){
  try{
    var day=document.getElementById("fs-day-btn");
    if(!day)return;

    var topTools=document.getElementById("fs-top-tools");
    if(topTools){
      day.classList.add("v62-top-day");
      day.classList.remove("v55-top-day","v60-top-day");

      var after=document.getElementById("fs-tb-text") ||
                document.getElementById("fs-tb-zone") ||
                document.getElementById("fs-tb-freehand") ||
                document.getElementById("fs-tb-arrow") ||
                document.getElementById("fs-tb-move");

      if(after && after.parentNode===topTools){
        if(after.nextSibling!==day)topTools.insertBefore(day, after.nextSibling);
      }else if(day.parentNode!==topTools){
        topTools.appendChild(day);
      }
    }

    // Byt ut noden en gång för att rensa gamla trasiga v55/v60-lyssnare.
    if(!day.dataset.v62Fresh){
      var fresh=day.cloneNode(true);
      fresh.dataset.v62Fresh="1";
      fresh.classList.add("v62-top-day");
      day.parentNode.replaceChild(fresh, day);
      day=fresh;
    }

    if(!day.dataset.v62Bound){
      day.dataset.v62Bound="1";
      day.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation)e.stopImmediatePropagation();
        setDaylightV62(!daylightMode);
        return false;
      }, true);

      day.onclick=function(e){
        if(e){e.preventDefault();e.stopPropagation();}
        setDaylightV62(!daylightMode);
        return false;
      };
    }

    removeFullscreenDayRemainderV62();
  }catch(err){console.error("setupFullscreenDayV62",err);}
}

// Låt gamla wrappers anropa nya versionen.
setupFullscreenDayV55=setupFullscreenDayV62;
setupFullscreenDayV60=setupFullscreenDayV62;

function moveFullscreenOptionMenusV62(){
  try{
    var inFs=document.body.classList.contains("fullscreen-portrait");
    ["arrow-options","zone-options","freehand-options"].forEach(function(id){
      var el=document.getElementById(id);
      if(!el)return;
      if(inFs){
        el.style.position="fixed";
        el.style.top="calc(env(safe-area-inset-top,0px) + 42px)";
        el.style.right="92px";
        el.style.left="auto";
        el.style.zIndex="10010";
        el.style.maxWidth="min(270px, calc(100vw - 112px))";
        el.style.overflowX="auto";
      }else{
        // Återställ bara positioneringen när man lämnar fullscreen.
        el.style.position="";
        el.style.top="";
        el.style.right="";
        el.style.left="";
        el.style.zIndex="";
        el.style.maxWidth="";
        el.style.overflowX="";
      }
    });
  }catch(err){console.error("moveFullscreenOptionMenusV62",err);}
}

setupFullscreenDayV62();
moveFullscreenOptionMenusV62();

setTimeout(function(){setupFullscreenDayV62();moveFullscreenOptionMenusV62();},100);
setTimeout(function(){setupFullscreenDayV62();moveFullscreenOptionMenusV62();},400);
setTimeout(function(){setupFullscreenDayV62();moveFullscreenOptionMenusV62();},1200);

var _syncFullscreenToolButtons_v62=typeof syncFullscreenToolButtons==="function"?syncFullscreenToolButtons:null;
if(_syncFullscreenToolButtons_v62){
  syncFullscreenToolButtons=function(){
    _syncFullscreenToolButtons_v62.apply(this, arguments);
    setupFullscreenDayV62();
    moveFullscreenOptionMenusV62();
  };
}

var _enterFullscreenPortrait_v62=typeof enterFullscreenPortrait==="function"?enterFullscreenPortrait:null;
if(_enterFullscreenPortrait_v62){
  enterFullscreenPortrait=function(){
    _enterFullscreenPortrait_v62.apply(this, arguments);
    setTimeout(function(){setupFullscreenDayV62();moveFullscreenOptionMenusV62();},0);
    setTimeout(function(){setupFullscreenDayV62();moveFullscreenOptionMenusV62();},250);
  };
}

var _exitFullscreenPortrait_v62=typeof exitFullscreenPortrait==="function"?exitFullscreenPortrait:null;
if(_exitFullscreenPortrait_v62){
  exitFullscreenPortrait=function(){
    _exitFullscreenPortrait_v62.apply(this, arguments);
    setTimeout(moveFullscreenOptionMenusV62,0);
  };
}

// När man väljer ritverktyg ska valmenyn flyttas efter att den blivit synlig.
["btn-arrow","btn-freehand","btn-zone","fs-tb-arrow","fs-tb-freehand","fs-tb-zone"].forEach(function(id){
  var b=document.getElementById(id);
  if(b && !b.dataset.v62OptionMove){
    b.dataset.v62OptionMove="1";
    b.addEventListener("click", function(){
      setTimeout(moveFullscreenOptionMenusV62,0);
      setTimeout(moveFullscreenOptionMenusV62,120);
    }, true);
  }
});

window.addEventListener("resize", function(){
  setTimeout(function(){setupFullscreenDayV62();moveFullscreenOptionMenusV62();},60);
});

/* === slut v62-fullscreen-corrections === */


/* === v63-options-restore: återställ färg/linje i normalläge === */

function placeDrawOptionsV63(){
  try{
    var inFs=document.body.classList.contains("fullscreen-portrait");
    ["arrow-options","zone-options","freehand-options"].forEach(function(id){
      var el=document.getElementById(id);
      if(!el)return;

      if(inFs){
        el.style.position="fixed";
        el.style.top="calc(env(safe-area-inset-top,0px) + 42px)";
        el.style.right="92px";
        el.style.left="auto";
        el.style.zIndex="10010";
        el.style.maxWidth="min(270px, calc(100vw - 112px))";
        el.style.overflowX="auto";
      }else{
        // Viktigt: återställ till originalplatsen i vanlig vy.
        el.style.position="absolute";
        el.style.top="8px";
        el.style.right="8px";
        el.style.left="auto";
        el.style.zIndex=(id==="arrow-options") ? "5" : "6";
        el.style.maxWidth="";
        el.style.overflowX="";
      }
    });
  }catch(err){console.error("placeDrawOptionsV63",err);}
}

// Ersätt v62-funktionen så äldre wrappers också använder rätt återställning.
moveFullscreenOptionMenusV62=placeDrawOptionsV63;
moveFullscreenOptionMenusV60=placeDrawOptionsV63;

placeDrawOptionsV63();
setTimeout(placeDrawOptionsV63,100);
setTimeout(placeDrawOptionsV63,500);
setTimeout(placeDrawOptionsV63,1200);

["btn-arrow","btn-freehand","btn-zone","fs-tb-arrow","fs-tb-freehand","fs-tb-zone"].forEach(function(id){
  var b=document.getElementById(id);
  if(b && !b.dataset.v63OptionPlace){
    b.dataset.v63OptionPlace="1";
    b.addEventListener("click",function(){
      setTimeout(placeDrawOptionsV63,0);
      setTimeout(placeDrawOptionsV63,120);
    },true);
  }
});

window.addEventListener("resize",function(){
  setTimeout(placeDrawOptionsV63,60);
});

/* === slut v63-options-restore === */


/* === v64-list-ui-fix: optioner upp, ta bort blink, dedupe + direkt radering === */

var deletedFormationIdsV64 = {};
var deletedTaktikIdsV64 = {};

function killLegacyAdminButtonsV64(){
  try{
    ["btn-adopt-legacy-v56","btn-claim-invisible-v58"].forEach(function(id){
      var b=document.getElementById(id);
      if(b){
        b.style.display="none";
        b.style.visibility="hidden";
        b.style.pointerEvents="none";
        if(b.parentNode)b.parentNode.removeChild(b);
      }
    });
    Array.prototype.slice.call(document.querySelectorAll("button")).forEach(function(b){
      var txt=(b.textContent||"").trim();
      if(txt==="🔧 Äldre" || txt==="🔧 Äldre+" || txt==="🔧 Ta över"){
        b.style.display="none";
        if(b.parentNode)b.parentNode.removeChild(b);
      }
    });
  }catch(e){}
}

// Stoppa gamla setTimeout-funktioner från att kunna skapa knapparna igen.
addAdoptLegacyButtonV56=function(){killLegacyAdminButtonsV64();};
rebindAdoptLegacyButtonV57=function(){killLegacyAdminButtonsV64();};
addClaimButtonV58=function(){killLegacyAdminButtonsV64();};

killLegacyAdminButtonsV64();
setTimeout(killLegacyAdminButtonsV64,50);
setTimeout(killLegacyAdminButtonsV64,300);
setTimeout(killLegacyAdminButtonsV64,1300);

try{
  var obsV64=new MutationObserver(killLegacyAdminButtonsV64);
  obsV64.observe(document.body,{childList:true,subtree:true});
}catch(e){}

function profileV64(){
  try{
    if(typeof getProfileSafeV10==="function")return getProfileSafeV10();
    if(typeof getUserProfile==="function")return getUserProfile();
    var raw=localStorage.getItem("tt_profile_v1");
    return raw?JSON.parse(raw):null;
  }catch(e){return null;}
}
function metaV64(obj){
  try{
    if(typeof fileMetaV10==="function")return fileMetaV10(obj)||{};
  }catch(e){}
  if(obj&&obj._meta)return obj._meta;
  if(obj&&obj.state&&obj.state._meta)return obj.state._meta;
  if(obj&&obj.data&&obj.data._meta)return obj.data._meta;
  return {};
}
function isVisibleSaveV64(s){
  try{
    if(typeof isFileVisibleInScopeV10==="function")return isFileVisibleInScopeV10(s, typeof saveScope!=="undefined"?saveScope:"mine");
  }catch(e){}
  return true;
}
function isVisibleTaktikV64(tk){
  try{
    if(typeof isFileVisibleInScopeV10==="function")return isFileVisibleInScopeV10(tk, typeof taktikScope!=="undefined"?taktikScope:"mine");
  }catch(e){}
  return true;
}
function saveKeyV64(s){
  if(s&&s.id)return "id:"+s.id;
  var m=metaV64(s);
  var owner=m.ownerId||"legacy";
  return "name:"+owner+"|"+String((s&&s.name)||"").trim().toLowerCase()+"|"+String((s&&s.folder)||"Allmänt");
}
function taktikKeyV64(tk){
  if(tk&&tk.dbId)return "id:"+tk.dbId;
  var m=metaV64(tk);
  var owner=m.ownerId||"legacy";
  return "name:"+owner+"|"+String((tk&&tk.name)||"").trim().toLowerCase()+"|"+String((tk&&tk.folder)||"Taktik");
}
function dedupeSavesV64(list){
  var by={}, order=[];
  (list||[]).forEach(function(s){
    if(!s)return;
    if(s.id && deletedFormationIdsV64[String(s.id)])return;
    var k=saveKeyV64(s);
    if(!by[k])order.push(k);
    by[k]=s;
  });
  return order.map(function(k){return by[k];});
}
function dedupeTaktikV64(list){
  var by={}, order=[];
  (list||[]).forEach(function(tk){
    if(!tk)return;
    if(tk.dbId && deletedTaktikIdsV64[String(tk.dbId)])return;
    var k=taktikKeyV64(tk);
    if(!by[k])order.push(k);
    by[k]=tk;
  });
  return order.map(function(k){return by[k];});
}
function rebuildFoldersV64(){
  var seen={};folders=["Allmänt"];
  (savedFormations||[]).forEach(function(s){
    var f=s.folder||"Allmänt";
    if(f&&!seen[f]){seen[f]=true;if(f!=="Allmänt")folders.push(f);}
  });
  var tfseen={};taktikFolders=["Taktik","Träning"];tfseen["Taktik"]=true;tfseen["Träning"]=true;
  (taktikFilmer||[]).forEach(function(tk){
    var f=tk.folder||"Taktik";
    if(f&&!tfseen[f]){tfseen[f]=true;taktikFolders.push(f);}
  });
}

cloudLoadSaves=function(){
  cloudStatus("Laddar...","#7aaa88");
  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.uppstallning&order=folder.asc,id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){
      if(!Array.isArray(data)){cloudStatus("❌ Kunde inte läsa utgångslägen","#e84a4a");return;}
      var loaded=data.filter(function(row){return row.type==="uppstallning";}).map(function(row){
        return {id:row.id,name:row.name,state:row.data,folder:row.folder||"Allmänt"};
      }).filter(function(s){return !s.id || !deletedFormationIdsV64[String(s.id)];})
        .filter(isVisibleSaveV64);

      savedFormations=dedupeSavesV64(loaded);
      rebuildFoldersV64();
      renderSavesList();
      updateFolderSelect();
      cloudStatus(savedFormations.length+" uppställningar ✅","#4ae87a");
    }).catch(function(err){
      cloudStatus("❌ Fel: "+err.message,"#e84a4a");
    });
};

cloudLoadTaktik=function(){
  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.taktikfilm&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){
      if(!Array.isArray(data)){cloudStatus("❌ Kunde inte läsa taktikfilmer","#e84a4a");return;}
      var loaded=[];
      data.filter(function(row){return row.type==="taktikfilm";}).forEach(function(row){
        var tk=row.data||{};
        if(!tk.steps||tk.steps.length<2)return;
        tk.dbId=row.id;
        if(!tk.folder)tk.folder=row.folder||"Taktik";
        if(deletedTaktikIdsV64[String(tk.dbId)])return;
        if(!isVisibleTaktikV64(tk))return;
        loaded.push(tk);
      });
      taktikFilmer=dedupeTaktikV64(loaded);
      rebuildFoldersV64();
      renderTaktikList();
      cloudStatus(taktikFilmer.length+" taktikfilmer laddade","#4ae87a");
    }).catch(function(err){
      cloudStatus("❌ Fel: "+err.message,"#e84a4a");
    });
};

cloudDelete=function(id){
  if(id)deletedFormationIdsV64[String(id)]=true;
  savedFormations=(savedFormations||[]).filter(function(s){return String(s.id)!==String(id);});
  savedFormations=dedupeSavesV64(savedFormations);
  rebuildFoldersV64();
  renderSavesList();
  updateFolderSelect();

  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+id,{
    method:"DELETE",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"})
  }).then(function(){
    showToast("Raderat!");
    setTimeout(cloudLoadSaves,250);
  }).catch(function(err){
    delete deletedFormationIdsV64[String(id)];
    cloudStatus("❌ Raderingsfel: "+err.message,"#e84a4a");
    showToast("Kunde inte radera",false);
    cloudLoadSaves();
  });
};

function deleteTaktik(idx){
  var tk=taktikFilmer[idx];
  if(!tk)return;
  if(tk._readOnly || (typeof isReadOnlyFileV10==="function" && isReadOnlyFileV10(tk))){
    showToast("Du kan inte radera någon annans fil",false);
    return;
  }
  var id=tk.dbId;
  if(id)deletedTaktikIdsV64[String(id)]=true;

  taktikFilmer=(taktikFilmer||[]).filter(function(x,i){
    if(id)return String(x.dbId)!==String(id);
    return i!==idx;
  });
  taktikFilmer=dedupeTaktikV64(taktikFilmer);
  rebuildFoldersV64();
  renderTaktikList();

  if(id){
    fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+id,{
      method:"DELETE",
      headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"})
    }).then(function(){
      showToast("Taktikfilm raderad!");
      setTimeout(cloudLoadTaktik,250);
    }).catch(function(err){
      delete deletedTaktikIdsV64[String(id)];
      cloudStatus("❌ Raderingsfel: "+err.message,"#e84a4a");
      showToast("Kunde inte radera",false);
      cloudLoadTaktik();
    });
  }else{
    showToast("Taktikfilm raderad!");
  }
}
window.deleteTaktik=deleteTaktik;

// Säkra att render alltid kör dedupe först, ifall gamla wrappers har lagt in dubbletter.
if(typeof renderSavesList==="function"){
  var _renderSavesList_v64=renderSavesList;
  renderSavesList=function(){
    savedFormations=dedupeSavesV64(savedFormations||[]);
    return _renderSavesList_v64.apply(this,arguments);
  };
}
if(typeof renderTaktikList==="function"){
  var _renderTaktikList_v64=renderTaktikList;
  renderTaktikList=function(){
    taktikFilmer=dedupeTaktikV64(taktikFilmer||[]);
    return _renderTaktikList_v64.apply(this,arguments);
  };
}

function placeDrawOptionsV64(){
  try{
    var inFs=document.body.classList.contains("fullscreen-portrait");
    ["arrow-options","zone-options","freehand-options"].forEach(function(id){
      var el=document.getElementById(id);
      if(!el)return;
      if(inFs){
        el.style.position="fixed";
        el.style.top="calc(env(safe-area-inset-top,0px) + 8px)";
        el.style.right="calc(env(safe-area-inset-right,0px) + 92px)";
        el.style.left="auto";
        el.style.zIndex="10020";
        el.style.maxWidth="min(270px, calc(100vw - 118px))";
        el.style.overflowX="auto";
      }else{
        el.style.position="absolute";
        el.style.top="8px";
        el.style.right="8px";
        el.style.left="auto";
        el.style.zIndex=(id==="arrow-options")?"5":"6";
        el.style.maxWidth="";
        el.style.overflowX="";
      }
    });
  }catch(err){console.error("placeDrawOptionsV64",err);}
}
placeDrawOptionsV63=placeDrawOptionsV64;
moveFullscreenOptionMenusV62=placeDrawOptionsV64;
moveFullscreenOptionMenusV60=placeDrawOptionsV64;

placeDrawOptionsV64();
setTimeout(placeDrawOptionsV64,100);
setTimeout(placeDrawOptionsV64,500);

["btn-arrow","btn-freehand","btn-zone","fs-tb-arrow","fs-tb-freehand","fs-tb-zone"].forEach(function(id){
  var b=document.getElementById(id);
  if(b && !b.dataset.v64OptionPlace){
    b.dataset.v64OptionPlace="1";
    b.addEventListener("click",function(){
      setTimeout(placeDrawOptionsV64,0);
      setTimeout(placeDrawOptionsV64,120);
    },true);
  }
});

setTimeout(function(){
  try{savedFormations=dedupeSavesV64(savedFormations||[]);renderSavesList();}catch(e){}
  try{taktikFilmer=dedupeTaktikV64(taktikFilmer||[]);renderTaktikList();}catch(e){}
},700);

/* === slut v64-list-ui-fix === */


/* === v65-black-color-options: lägg till svart i alla ritfärgval === */

function addBlackDrawOptionsV65(){
  try{
    function addOption(selId,value,label){
      var sel=document.getElementById(selId);
      if(!sel)return;
      var exists=false;
      Array.prototype.slice.call(sel.options||[]).forEach(function(o){
        if(String(o.value).toLowerCase()===String(value).toLowerCase())exists=true;
      });
      if(exists)return;
      var opt=document.createElement("option");
      opt.value=value;
      opt.textContent=label;
      sel.appendChild(opt);
    }

    addOption("arrow-color-sel","#000","■ Svart");
    addOption("freehand-color-sel","#000","■ Svart");
    addOption("zone-color-sel","rgba(0,0,0,0.25)","■ Svart");
  }catch(e){console.error("addBlackDrawOptionsV65",e);}
}

addBlackDrawOptionsV65();
setTimeout(addBlackDrawOptionsV65,300);
setTimeout(addBlackDrawOptionsV65,1200);

/* === slut v65-black-color-options === */


/* === v66-fullscreen-bottombar: ta bort gamla bottenbaren i formationsläge === */

function isTaktikFullscreenV66(){
  try{
    if(typeof playback!=="undefined" && playback)return true;
    if(typeof isEditingTaktik!=="undefined" && isEditingTaktik)return true;
    if(typeof editingTaktikIdx!=="undefined" && editingTaktikIdx!==null)return true;
    var active=document.querySelector('.tab.on[data-panel="taktik"]');
    return !!active;
  }catch(e){return false;}
}

function updateFullscreenBottomBarV66(){
  try{
    var isFs=document.body.classList.contains("fullscreen-portrait");
    var isTk=isTaktikFullscreenV66();

    document.body.classList.toggle("v66-taktik-fs", !!(isFs && isTk));

    var nav=document.getElementById("fs-portrait-nav");
    var prevSide=document.getElementById("ls-prev-side");
    var nextSide=document.getElementById("ls-next-side");
    var oldDay=document.getElementById("ls-day-btn3");

    if(oldDay){
      oldDay.style.display="none";
      oldDay.style.visibility="hidden";
      oldDay.style.width="0";
      oldDay.style.minWidth="0";
      oldDay.style.height="0";
      oldDay.style.padding="0";
      oldDay.style.margin="0";
      oldDay.style.border="0";
    }

    if(!isFs)return;

    if(!isTk){
      [nav,prevSide,nextSide].forEach(function(el){
        if(!el)return;
        el.style.display="none";
        el.style.visibility="hidden";
        el.style.pointerEvents="none";
        el.style.height="0";
        el.style.minHeight="0";
        el.style.padding="0";
        el.style.margin="0";
        el.style.border="0";
        el.style.background="transparent";
        el.style.boxShadow="none";
      });
    }else{
      if(nav){
        nav.style.display="";
        nav.style.visibility="";
        nav.style.pointerEvents="";
        nav.style.height="";
        nav.style.minHeight="";
        nav.style.padding="";
        nav.style.margin="";
        nav.style.border="";
        nav.style.background="";
        nav.style.boxShadow="";
      }
    }
  }catch(err){console.error("updateFullscreenBottomBarV66",err);}
}

updateFullscreenBottomBarV66();
setTimeout(updateFullscreenBottomBarV66,100);
setTimeout(updateFullscreenBottomBarV66,500);
setTimeout(updateFullscreenBottomBarV66,1200);

var _syncFullscreenToolButtons_v66=typeof syncFullscreenToolButtons==="function"?syncFullscreenToolButtons:null;
if(_syncFullscreenToolButtons_v66){
  syncFullscreenToolButtons=function(){
    _syncFullscreenToolButtons_v66.apply(this,arguments);
    updateFullscreenBottomBarV66();
  };
}

var _enterFullscreenPortrait_v66=typeof enterFullscreenPortrait==="function"?enterFullscreenPortrait:null;
if(_enterFullscreenPortrait_v66){
  enterFullscreenPortrait=function(){
    _enterFullscreenPortrait_v66.apply(this,arguments);
    setTimeout(updateFullscreenBottomBarV66,0);
    setTimeout(updateFullscreenBottomBarV66,250);
  };
}

var _exitFullscreenPortrait_v66=typeof exitFullscreenPortrait==="function"?exitFullscreenPortrait:null;
if(_exitFullscreenPortrait_v66){
  exitFullscreenPortrait=function(){
    _exitFullscreenPortrait_v66.apply(this,arguments);
    setTimeout(updateFullscreenBottomBarV66,0);
  };
}

document.querySelectorAll(".tab").forEach(function(tab){
  if(tab.dataset.v66BottomBound)return;
  tab.dataset.v66BottomBound="1";
  tab.addEventListener("click",function(){
    setTimeout(updateFullscreenBottomBarV66,0);
    setTimeout(updateFullscreenBottomBarV66,250);
  },true);
});

/* === slut v66-fullscreen-bottombar === */


/* === v67-dedupe-unsaved: hårdare dedupe utgångslägen + sparat nollställer varning === */

function metaForV67(obj){
  try{
    if(typeof fileMetaV10==="function")return fileMetaV10(obj)||{};
  }catch(e){}
  if(obj&&obj._meta)return obj._meta;
  if(obj&&obj.state&&obj.state._meta)return obj.state._meta;
  if(obj&&obj.data&&obj.data._meta)return obj.data._meta;
  return {};
}

function normalizeNameV67(s){
  return String(s||"").trim().toLowerCase().replace(/\s+/g," ");
}

function normalizeFolderV67(s, fallback){
  return String(s||fallback||"Allmänt").trim().toLowerCase().replace(/\s+/g," ");
}

function formationContentSignatureV67(s){
  try{
    var st=s&&s.state?s.state:(s&&s.data?s.data:null);
    if(!st)return "";
    var c=JSON.parse(JSON.stringify(st));
    delete c._meta;
    delete c.meta;
    // Grov men stabil signatur: tillräckligt för gamla dubletter.
    return JSON.stringify(c);
  }catch(e){return "";}
}

function saveDedupeKeyV67(s){
  if(!s)return "empty";
  var m=metaForV67(s);
  var owner=m.ownerId||m.ownerName||"legacy";
  var name=normalizeNameV67(s.name);
  var folder=normalizeFolderV67(s.folder,"Allmänt");
  var sig=formationContentSignatureV67(s);

  // För utgångslägen vill vi inte visa samma fil två gånger bara för att den fått nytt id vid migrering.
  // Namn+mapp+ägare räcker i normalfallet. Om namn saknas använder vi innehållet.
  if(name)return "nf:"+owner+"|"+folder+"|"+name;
  if(sig)return "sig:"+owner+"|"+folder+"|"+sig;
  if(s.id)return "id:"+s.id;
  return "unknown:"+Math.random();
}

function dedupeFormationsHardV67(list){
  var by={}, order=[];
  (list||[]).forEach(function(s){
    if(!s)return;
    if(typeof deletedFormationIdsV64!=="undefined" && s.id && deletedFormationIdsV64[String(s.id)])return;

    var k=saveDedupeKeyV67(s);

    // Behåll nyaste/id-högsta raden om två har samma namn+mapp.
    if(!by[k]){
      by[k]=s;
      order.push(k);
    }else{
      var old=by[k];
      var oldId=parseInt(old.id||0,10)||0;
      var newId=parseInt(s.id||0,10)||0;
      if(newId>=oldId)by[k]=s;
    }
  });
  return order.map(function(k){return by[k];});
}

// Koppla in hårdare dedupe där tidigare v64 använde mildare dedupe.
dedupeSavesV64=dedupeFormationsHardV67;

function rebuildFormationFoldersV67(){
  var seen={};folders=["Allmänt"];
  (savedFormations||[]).forEach(function(s){
    var f=s.folder||"Allmänt";
    if(f&&!seen[f]){seen[f]=true;if(f!=="Allmänt")folders.push(f);}
  });
  try{updateFolderSelect();}catch(e){}
}

var _renderSavesList_v67 = typeof renderSavesList==="function" ? renderSavesList : null;
if(_renderSavesList_v67){
  renderSavesList=function(){
    savedFormations=dedupeFormationsHardV67(savedFormations||[]);
    rebuildFormationFoldersV67();
    return _renderSavesList_v67.apply(this,arguments);
  };
}

var _cloudLoadSaves_v67_base = typeof cloudLoadSaves==="function" ? cloudLoadSaves : null;
cloudLoadSaves=function(){
  cloudStatus("Laddar...","#7aaa88");
  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.uppstallning&order=folder.asc,id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){
      if(!Array.isArray(data)){
        cloudStatus("❌ Kunde inte läsa utgångslägen","#e84a4a");
        return;
      }
      var loaded=data.filter(function(row){return row.type==="uppstallning";}).map(function(row){
        return {id:row.id,name:row.name,state:row.data,folder:row.folder||"Allmänt"};
      }).filter(function(s){
        return !(typeof deletedFormationIdsV64!=="undefined" && s.id && deletedFormationIdsV64[String(s.id)]);
      }).filter(function(s){
        try{
          if(typeof isFileVisibleInScopeV10==="function")return isFileVisibleInScopeV10(s, typeof saveScope!=="undefined"?saveScope:"mine");
        }catch(e){}
        return true;
      });

      savedFormations=dedupeFormationsHardV67(loaded);
      rebuildFormationFoldersV67();
      renderSavesList();
      cloudStatus(savedFormations.length+" uppställningar ✅","#4ae87a");
    }).catch(function(err){
      cloudStatus("❌ Fel: "+err.message,"#e84a4a");
    });
};

// Rensa ev. redan laddade dubbletter utan att behöva starta om.
setTimeout(function(){
  try{
    savedFormations=dedupeFormationsHardV67(savedFormations||[]);
    rebuildFormationFoldersV67();
    renderSavesList();
  }catch(e){}
},300);

// --- Osparat-varningen: nollställ baslinje direkt efter faktisk sparning ---
function normalizeTaktikForCompareV67(tk){
  try{
    var c=JSON.parse(JSON.stringify(tk||{}));
    delete c._readOnly;
    delete c._isDraft;
    delete c._meta;
    delete c.meta;
    delete c.updatedAt;
    delete c.createdAt;
    delete c.dbId;
    return JSON.stringify(c);
  }catch(e){return "";}
}

function currentEditingTaktikV67(){
  try{
    if(editingTaktikIdx===null || typeof editingTaktikIdx==="undefined")return null;
    return taktikFilmer && taktikFilmer[editingTaktikIdx] ? taktikFilmer[editingTaktikIdx] : null;
  }catch(e){return null;}
}

function markTaktikSavedCleanV67(tk){
  try{
    if(typeof autoSaveCurrentStepLocalV16==="function" && editingTaktikIdx!==null){
      autoSaveCurrentStepLocalV16();
    }
  }catch(e){}
  var cur=tk || currentEditingTaktikV67();
  try{
    if(typeof savedTaktikSnapshotV21!=="undefined"){
      savedTaktikSnapshotV21=normalizeTaktikForCompareV67(cur);
    }
  }catch(e){}
  try{taktikDirtyV17=false;}catch(e){}
  try{window.taktikDirtyV17=false;}catch(e){}
}

var _cloudSaveTaktik_v67 = typeof cloudSaveTaktik==="function" ? cloudSaveTaktik : null;
if(_cloudSaveTaktik_v67){
  cloudSaveTaktik=function(tk){
    var res=_cloudSaveTaktik_v67.apply(this,arguments);

    // Sätt clean direkt så inte användaren får varning efter att ha tryckt spara.
    // Om sparningen skulle misslyckas sätts dirty tillbaka i catch.
    markTaktikSavedCleanV67(tk);

    Promise.resolve(res).then(function(){
      markTaktikSavedCleanV67(tk);
    }).catch(function(){
      try{taktikDirtyV17=true;}catch(e){}
    });

    setTimeout(function(){markTaktikSavedCleanV67(tk);},300);
    setTimeout(function(){markTaktikSavedCleanV67(tk);},900);
    return res;
  };
}

function saveCurrentTaktikFileV67(){
  if(editingTaktikIdx===null)return;
  try{
    if(typeof autoSaveCurrentStepLocalV16==="function")autoSaveCurrentStepLocalV16();
  }catch(e){}
  var tk=currentEditingTaktikV67();
  if(!tk)return;
  cloudSaveTaktik(tk);
  markTaktikSavedCleanV67(tk);
  showToast("Film sparad!");
  cloudStatus("✅ Film sparad","#4ae87a");
}

function bindSaveButtonV67(){
  var btn=document.getElementById("btn-edit-taktik-save");
  if(!btn || btn.dataset.v67Bound)return;
  var clone=btn.cloneNode(true);
  clone.dataset.v67Bound="1";
  btn.parentNode.replaceChild(clone,btn);
  clone.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    saveCurrentTaktikFileV67();
    return false;
  },true);
}
bindSaveButtonV67();
setTimeout(bindSaveButtonV67,500);
setTimeout(bindSaveButtonV67,1500);

// Gör jämförelsefunktionen mer tolerant om den gamla v21-funktionen används vid exit.
hasUnsavedTaktikChangesV21=function(){
  var tk=currentEditingTaktikV67();
  if(!tk)return false;
  try{
    if(typeof autoSaveCurrentStepLocalV16==="function")autoSaveCurrentStepLocalV16();
  }catch(e){}
  var now=normalizeTaktikForCompareV67(tk);
  if(typeof savedTaktikSnapshotV21==="undefined" || savedTaktikSnapshotV21===null){
    savedTaktikSnapshotV21=now;
    return false;
  }
  return now!==savedTaktikSnapshotV21;
};

/* === slut v67-dedupe-unsaved === */


/* === v68-owner-permissions: ägare får radera/ändra delning även från Lagets ===
   Problemet var att äldre logik tolkade "Lagets"-vyn som någon annans fil.
   Nu avgörs behörighet bara av metadata: ownerId/ownerName mot aktuell profil.
*/

function profileV68(){
  try{
    if(typeof getProfileSafeV10==="function")return getProfileSafeV10();
    if(typeof getUserProfile==="function")return getUserProfile();
    var raw=localStorage.getItem("tt_profile_v1");
    return raw?JSON.parse(raw):null;
  }catch(e){return null;}
}

function metaV68(obj){
  try{
    if(typeof fileMetaV10==="function")return fileMetaV10(obj)||{};
  }catch(e){}
  if(obj&&obj._meta)return obj._meta;
  if(obj&&obj.meta)return obj.meta;
  if(obj&&obj.state&&obj.state._meta)return obj.state._meta;
  if(obj&&obj.data&&obj.data._meta)return obj.data._meta;
  return {};
}

function isOwnerV68(obj){
  var p=profileV68();
  var m=metaV68(obj);

  // Gamla filer utan ägare räknas som mina.
  if(!m.ownerId && !m.ownerName)return true;
  if(!p)return true;

  if(m.ownerId && p.ownerId && String(m.ownerId)===String(p.ownerId))return true;
  if(m.ownerName && p.ownerName && String(m.ownerName).trim().toLowerCase()===String(p.ownerName).trim().toLowerCase())return true;

  return false;
}

function isSameTeamSharedV68(obj){
  var p=profileV68();
  var m=metaV68(obj);
  if(!p||!m.teamId)return false;
  return String(m.teamId)===String(p.teamId) && !!m.sharedWithTeam && !isOwnerV68(obj);
}

// Ersätt v10-behörigheten globalt.
isMineV10=isOwnerV68;
isSameTeamSharedV10=isSameTeamSharedV68;
isFileVisibleInScopeV10=function(obj,scope){
  if(scope==="team"){
    var m=metaV68(obj);
    var p=profileV68();
    if(!p||!m.teamId)return false;
    // Lagets visar delade filer från laget, även mina egna delade.
    return String(m.teamId)===String(p.teamId) && !!m.sharedWithTeam;
  }
  return isOwnerV68(obj);
};
isReadOnlyFileV10=function(obj){
  var m=metaV68(obj);
  return !isOwnerV68(obj) && !m.teamCanEdit;
};

function updateShareMetaV68(data,share,canEdit){
  var d=JSON.parse(JSON.stringify(data||{}));
  var meta=d._meta||{};
  var p=profileV68();
  if(p){
    // Om filen redan har ägare: behåll den. Om den saknar ägare: sätt aktuell profil.
    meta.ownerId=meta.ownerId||p.ownerId;
    meta.ownerName=meta.ownerName||p.ownerName;
    meta.teamId=meta.teamId||p.teamId;
    meta.teamCode=meta.teamCode||p.teamCode;
    meta.teamName=meta.teamName||p.teamName||p.teamCode;
  }
  meta.sharedWithTeam=!!share;
  meta.teamCanEdit=!!canEdit;
  meta.updatedAt=new Date().toISOString();
  d._meta=meta;
  return d;
}
updateShareMetaV10=updateShareMetaV68;

patchFormationShareV10=function(s,share){
  if(!s||!s.id)return;
  if(!isOwnerV68(s)){
    showToast("Du kan bara ändra delning på filer du äger",false);
    return;
  }

  var newState=updateShareMetaV68(s.state,share,false);

  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+s.id,{
    method:"PATCH",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify({data:newState})
  }).then(function(){
    s.state=newState;
    showToast(share?"Delad med laget":"Inte längre delad");

    // Om man står i Lagets och slutar dela ska filen försvinna därifrån direkt.
    if(typeof saveScope!=="undefined" && saveScope==="team" && !share){
      savedFormations=(savedFormations||[]).filter(function(x){return String(x.id)!==String(s.id);});
    }

    if(typeof renderSavesList==="function")renderSavesList();
    setTimeout(function(){try{cloudLoadSaves();}catch(e){}},250);
  }).catch(function(err){
    showToast("Kunde inte ändra delning",false);
    cloudStatus("❌ "+err.message,"#e84a4a");
  });
};

patchTaktikShareV10=function(tk,share){
  if(!tk||!tk.dbId)return;
  if(!isOwnerV68(tk)){
    showToast("Du kan bara ändra delning på filer du äger",false);
    return;
  }

  var newTk=updateShareMetaV68(tk,share,false);
  Object.keys(newTk).forEach(function(k){tk[k]=newTk[k];});

  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{
    method:"PATCH",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify({data:newTk})
  }).then(function(){
    showToast(share?"Film delad med laget":"Film inte längre delad");

    // Om man står i Lagets och slutar dela ska filmen försvinna därifrån direkt.
    if(typeof taktikScope!=="undefined" && taktikScope==="team" && !share){
      taktikFilmer=(taktikFilmer||[]).filter(function(x){return String(x.dbId)!==String(tk.dbId);});
    }

    if(typeof renderTaktikList==="function")renderTaktikList();
    setTimeout(function(){try{cloudLoadTaktik();}catch(e){}},250);
  }).catch(function(err){
    showToast("Kunde inte ändra delning",false);
    cloudStatus("❌ "+err.message,"#e84a4a");
  });
};

// Ägare får radera även om filen visas under Lagets.
var _cloudDelete_v68_base = typeof cloudDelete==="function" ? cloudDelete : null;
cloudDelete=function(id){
  var s=(savedFormations||[]).find(function(x){return String(x.id)===String(id);});
  if(s && !isOwnerV68(s)){
    showToast("Du kan inte radera någon annans fil",false);
    return;
  }

  if(typeof deletedFormationIdsV64!=="undefined" && id)deletedFormationIdsV64[String(id)]=true;

  savedFormations=(savedFormations||[]).filter(function(x){return String(x.id)!==String(id);});
  try{if(typeof dedupeSavesV64==="function")savedFormations=dedupeSavesV64(savedFormations);}catch(e){}
  try{renderSavesList();}catch(e){}
  try{updateFolderSelect();}catch(e){}

  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+id,{
    method:"DELETE",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"})
  }).then(function(){
    showToast("Raderat!");
    setTimeout(function(){try{cloudLoadSaves();}catch(e){}},250);
  }).catch(function(err){
    if(typeof deletedFormationIdsV64!=="undefined")delete deletedFormationIdsV64[String(id)];
    cloudStatus("❌ Raderingsfel: "+err.message,"#e84a4a");
    showToast("Kunde inte radera",false);
    try{cloudLoadSaves();}catch(e){}
  });
};

deleteTaktik=function(idx){
  var tk=taktikFilmer[idx];
  if(!tk)return;

  if(!isOwnerV68(tk)){
    showToast("Du kan inte radera någon annans film",false);
    return;
  }

  var id=tk.dbId;
  if(id && typeof deletedTaktikIdsV64!=="undefined")deletedTaktikIdsV64[String(id)]=true;

  taktikFilmer=(taktikFilmer||[]).filter(function(x,i){
    if(id)return String(x.dbId)!==String(id);
    return i!==idx;
  });

  try{if(typeof dedupeTaktikV64==="function")taktikFilmer=dedupeTaktikV64(taktikFilmer);}catch(e){}
  try{renderTaktikList();}catch(e){}

  if(id){
    fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+id,{
      method:"DELETE",
      headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"})
    }).then(function(){
      showToast("Taktikfilm raderad!");
      setTimeout(function(){try{cloudLoadTaktik();}catch(e){}},250);
    }).catch(function(err){
      if(typeof deletedTaktikIdsV64!=="undefined")delete deletedTaktikIdsV64[String(id)];
      cloudStatus("❌ Raderingsfel: "+err.message,"#e84a4a");
      showToast("Kunde inte radera",false);
      try{cloudLoadTaktik();}catch(e){}
    });
  }else{
    showToast("Taktikfilm raderad!");
  }
};
window.deleteTaktik=deleteTaktik;

// Tvinga omrendering så knapparna Dela/Dölj/Radera visas även i Lagets för egna filer.
setTimeout(function(){
  try{renderSavesList();}catch(e){}
  try{renderTaktikList();}catch(e){}
},300);

/* === slut v68-owner-permissions === */


/* === v69-taktik-editor-clean: rensa taktikknappar + autospara + rätt stegnamn === */

function stepDefaultLabelV69(idx){
  return idx===0 ? "Startläge" : "Steg "+idx;
}

function isAutoStepLabelV69(label){
  var s=String(label||"").trim();
  return !s || s==="Start" || s==="Startläge" || /^Steg\s+\d+$/i.test(s);
}

function normalizeTaktikStepLabelsV69(tk){
  if(!tk||!Array.isArray(tk.steps))return;
  for(var i=0;i<tk.steps.length;i++){
    if(!tk.steps[i])continue;
    if(i===0){
      if(isAutoStepLabelV69(tk.steps[i].label))tk.steps[i].label="Startläge";
    }else{
      if(isAutoStepLabelV69(tk.steps[i].label))tk.steps[i].label="Steg "+i;
    }
  }
}

function currentEditingTaktikV69(){
  try{
    if(editingTaktikIdx===null || typeof editingTaktikIdx==="undefined")return null;
    return taktikFilmer && taktikFilmer[editingTaktikIdx] ? taktikFilmer[editingTaktikIdx] : null;
  }catch(e){return null;}
}

function autoSaveStepQuietV69(){
  try{
    if(editingTaktikIdx===null)return;
    var tk=currentEditingTaktikV69();
    if(!tk||!tk.steps||!tk.steps[editingStepIdx])return;
    if(typeof autoSaveCurrentStepLocalV16==="function"){
      autoSaveCurrentStepLocalV16();
    }else{
      var snap=currentSnap();
      var inp=document.getElementById("edit-step-name-inp");
      var lbl=inp?inp.value.trim():"";
      if(lbl)snap.label=lbl;
      tk.steps[editingStepIdx]=snap;
    }
    normalizeTaktikStepLabelsV69(tk);
  }catch(e){console.error("autoSaveStepQuietV69",e);}
}

function goToStepV69(targetIdx){
  var tk=currentEditingTaktikV69();
  if(!tk||!tk.steps)return;
  if(targetIdx<0||targetIdx>=tk.steps.length)return;
  autoSaveStepQuietV69();
  movementPaths=[];
  selectedId=null;
  editingStepIdx=targetIdx;
  updateEditStepUI();
}

function saveWholeFilmV69(){
  var tk=currentEditingTaktikV69();
  if(!tk)return;
  autoSaveStepQuietV69();
  normalizeTaktikStepLabelsV69(tk);
  cloudSaveTaktik(tk);
  try{
    if(typeof markTaktikSavedCleanV67==="function")markTaktikSavedCleanV67(tk);
  }catch(e){}
  try{
    taktikDirtyV17=false;
  }catch(e){}
  showToast("Film sparad!");
  cloudStatus("✅ Film sparad","#4ae87a");
}

function cleanTaktikEditorUiV69(){
  var ui=document.getElementById("edit-taktik-ui");
  if(!ui)return;
  ui.classList.add("v69-clean");

  var add=document.getElementById("btn-edit-add-step");
  if(add){
    add.textContent="+ Nytt steg";
    add.title="Lägg till nytt steg";
  }

  var saveStep=document.getElementById("btn-edit-update-step");
  if(saveStep){
    saveStep.style.display="none";
    saveStep.title="Steget autosparas internt";
  }
  var saveStep2=document.getElementById("btn-edit-update-step2");
  if(saveStep2){
    saveStep2.style.display="none";
    saveStep2.title="Steget autosparas internt";
  }

  var row=add?add.parentNode:null;
  if(row)row.classList.add("v69-step-main-row");
}

function bindTaktikEditorButtonsV69(){
  function replace(id,handler){
    var old=document.getElementById(id);
    if(!old)return null;
    if(old.dataset.v69Bound)return old;
    var neu=old.cloneNode(true);
    neu.dataset.v69Bound="1";
    old.parentNode.replaceChild(neu,old);
    neu.addEventListener("click",function(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      handler(e);
      return false;
    },true);
    return neu;
  }

  replace("btn-edit-step-prev",function(){
    goToStepV69(editingStepIdx-1);
  });

  replace("btn-edit-step-next",function(){
    goToStepV69(editingStepIdx+1);
  });

  replace("btn-edit-add-step",function(){
    var tk=currentEditingTaktikV69();
    if(!tk||!tk.steps)return;

    autoSaveStepQuietV69();
    if(typeof saveTaktikUndo==="function")saveTaktikUndo();

    var snap=currentSnap();
    delete snap.label; // nya steg ska namnges efter sin position, inte ärva Startläge
    tk.steps.splice(editingStepIdx+1,0,snap);
    editingStepIdx++;
    normalizeTaktikStepLabelsV69(tk);
    updateEditStepUI();
  });

  replace("btn-edit-del-step",function(){
    var tk=currentEditingTaktikV69();
    if(!tk||!tk.steps||editingStepIdx===0)return;

    if(typeof saveTaktikUndo==="function")saveTaktikUndo();
    tk.steps.splice(editingStepIdx,1);
    editingStepIdx=Math.min(editingStepIdx,tk.steps.length-1);
    normalizeTaktikStepLabelsV69(tk);
    updateEditStepUI();
  });

  // Spara steg-knappar finns kvar i DOM men gör bara tyst autosave om gammal kod skulle klicka dem.
  replace("btn-edit-update-step",function(){
    autoSaveStepQuietV69();
    showToast("Steget autosparades internt");
  });
  replace("btn-edit-update-step2",function(){
    autoSaveStepQuietV69();
    showToast("Steget autosparades internt");
  });

  replace("btn-edit-taktik-save",function(){
    saveWholeFilmV69();
  });
}

var _updateEditStepUI_v69 = typeof updateEditStepUI==="function" ? updateEditStepUI : null;
if(_updateEditStepUI_v69){
  updateEditStepUI=function(){
    var tk=currentEditingTaktikV69();
    if(tk)normalizeTaktikStepLabelsV69(tk);

    var r=_updateEditStepUI_v69.apply(this,arguments);

    tk=currentEditingTaktikV69();
    if(tk&&tk.steps&&tk.steps[editingStepIdx]){
      var inp=document.getElementById("edit-step-name-inp");
      var lbl=tk.steps[editingStepIdx].label || stepDefaultLabelV69(editingStepIdx);
      if(inp && isAutoStepLabelV69(inp.value))inp.value=lbl;

      var c=document.getElementById("edit-step-counter");
      if(c)c.textContent=editingStepIdx===0 ? "Start" : (editingStepIdx+"/"+Math.max(0,tk.steps.length-1));
    }

    cleanTaktikEditorUiV69();
    bindTaktikEditorButtonsV69();
    return r;
  };
}

var _renderEditSteps_v69 = typeof renderEditSteps==="function" ? renderEditSteps : null;
if(_renderEditSteps_v69){
  renderEditSteps=function(tk){
    normalizeTaktikStepLabelsV69(tk);
    var r=_renderEditSteps_v69.apply(this,arguments);

    var list=document.getElementById("edit-taktik-steps");
    if(list){
      Array.prototype.slice.call(list.querySelectorAll(".row")).forEach(function(row){
        var idx=parseInt(row.dataset.idx,10);
        if(isNaN(idx))return;

        var inp=row.querySelector("input");
        if(inp){
          var step=tk&&tk.steps?tk.steps[idx]:null;
          inp.value=(step&&step.label)||stepDefaultLabelV69(idx);
          if(!inp.dataset.v69LabelBound){
            inp.dataset.v69LabelBound="1";
            inp.addEventListener("input",function(){
              if(tk&&tk.steps&&tk.steps[idx]){
                var val=inp.value.trim();
                tk.steps[idx].label=val || stepDefaultLabelV69(idx);
              }
            },true);
          }
        }

        row.onclick=function(e){
          if(e.target.tagName==="BUTTON"||e.target.tagName==="INPUT")return;
          goToStepV69(idx);
        };
      });
    }

    cleanTaktikEditorUiV69();
    return r;
  };
}

var _openEditTaktik_v69 = typeof openEditTaktik==="function" ? openEditTaktik : null;
if(_openEditTaktik_v69){
  openEditTaktik=function(idx){
    var tk=taktikFilmer && taktikFilmer[idx] ? taktikFilmer[idx] : null;
    normalizeTaktikStepLabelsV69(tk);
    var r=_openEditTaktik_v69.apply(this,arguments);
    cleanTaktikEditorUiV69();
    bindTaktikEditorButtonsV69();
    return r;
  };
}

var _startPlayback_v69 = typeof startPlayback==="function" ? startPlayback : null;
if(_startPlayback_v69){
  startPlayback=function(idx){
    var tk=taktikFilmer && taktikFilmer[idx] ? taktikFilmer[idx] : null;
    normalizeTaktikStepLabelsV69(tk);
    var r=_startPlayback_v69.apply(this,arguments);
    cleanTaktikEditorUiV69();
    bindTaktikEditorButtonsV69();
    return r;
  };
}

cleanTaktikEditorUiV69();
bindTaktikEditorButtonsV69();
setTimeout(function(){
  cleanTaktikEditorUiV69();
  bindTaktikEditorButtonsV69();
  try{
    var tk=currentEditingTaktikV69();
    if(tk){normalizeTaktikStepLabelsV69(tk);updateEditStepUI();}
  }catch(e){}
},500);

/* === slut v69-taktik-editor-clean === */


/* === v70-movement-autostep: rörelse autosparas + sista steg skapar nytt + sparvarning fix === */

function currentTaktikV70(){
  try{
    if(editingTaktikIdx===null || typeof editingTaktikIdx==="undefined")return null;
    return taktikFilmer && taktikFilmer[editingTaktikIdx] ? taktikFilmer[editingTaktikIdx] : null;
  }catch(e){return null;}
}

function cloneV70(o){
  try{return JSON.parse(JSON.stringify(o));}catch(e){return o;}
}

function labelV70(i){
  return i===0 ? "Startläge" : "Steg "+i;
}

function isAutoLabelV70(x){
  var s=String(x||"").trim();
  return !s || s==="Start" || s==="Startläge" || /^Steg\s+\d+$/i.test(s);
}

function normalizeStepLabelsV70(tk){
  if(!tk||!Array.isArray(tk.steps))return;
  tk.steps.forEach(function(st,i){
    if(!st)return;
    if(isAutoLabelV70(st.label))st.label=labelV70(i);
  });
}

function ensureNextStepV70(reason){
  var tk=currentTaktikV70();
  if(!tk||!tk.steps)return false;
  if(editingStepIdx < tk.steps.length-1)return false;

  var snap=currentSnap();
  snap.label=labelV70(tk.steps.length);

  // Nästa steg ska vara samma läge som nuvarande slutläge.
  // Rörelsebanor hör till föregående steg, inte nya målläge-steget.
  snap.movementPaths=[];
  tk.steps.push(snap);
  normalizeStepLabelsV70(tk);

  if(playback)playback.tk=tk;
  try{showToast(reason || "Nytt steg skapades automatiskt");}catch(e){}
  return true;
}

function applyMovementEndpointsV70(tk,stepIdx,snap){
  if(!tk||!tk.steps||!snap||!Array.isArray(snap.movementPaths))return;

  snap.movementPaths.forEach(function(mp){
    if(!mp||!mp.pts||!mp.pts.length||!mp.playerId)return;
    var ep=mp.pts[mp.pts.length-1];

    // Om rörelsen ligger på sista steget behöver vi ett målsteg.
    if(stepIdx>=tk.steps.length-1){
      var newSnap=cloneV70(snap);
      newSnap.movementPaths=[];
      newSnap.label=labelV70(tk.steps.length);
      if(typeof _setPosV14==="function"){
        _setPosV14(newSnap,mp.playerId,ep);
      }else if(newSnap.players){
        var p=(newSnap.players||[]).find(function(x){return x.id===mp.playerId;});
        if(p){p.x=ep.x;p.y=ep.y;}
      }
      tk.steps.push(newSnap);
    }

    // Skriv endpointen framåt tills nästa aktiva förändring.
    for(var si=stepIdx+1;si<tk.steps.length;si++){
      var fs=tk.steps[si];
      if(!fs)continue;
      if(typeof _stepHasMovementForV14==="function" && _stepHasMovementForV14(fs,mp.playerId))break;
      if(typeof _setPosV14==="function"){
        _setPosV14(fs,mp.playerId,ep);
      }else if(fs.players){
        var p2=(fs.players||[]).find(function(x){return x.id===mp.playerId;});
        if(p2){p2.x=ep.x;p2.y=ep.y;}
      }
    }
  });

  normalizeStepLabelsV70(tk);
}

function saveCurrentStepV70(opts){
  opts=opts||{};
  var tk=currentTaktikV70();
  if(!tk||!tk.steps||!tk.steps[editingStepIdx])return false;

  var oldStep=cloneV70(tk.steps[editingStepIdx]);
  var snap=currentSnap();
  var inp=document.getElementById("edit-step-name-inp");
  var lbl=inp?inp.value.trim():"";
  if(lbl)snap.label=lbl;
  else if(isAutoLabelV70(snap.label))snap.label=labelV70(editingStepIdx);

  // Viktigt: rörelsebanor från skärmen ska sparas i steget.
  snap.movementPaths=(movementPaths||[]).map(function(m){
    return {id:m.id,playerId:m.playerId,pts:(m.pts||[]).map(function(p){return{x:p.x,y:p.y};})};
  });

  if(opts.autoCreateNext && editingStepIdx>=tk.steps.length-1){
    // Om man bara flyttat en spelare/boll på sista steget behöver appen ett nytt målsteg.
    // Om snap har rörelsebanor skapas målsteg i applyMovementEndpointsV70 nedan.
    if(!snap.movementPaths || !snap.movementPaths.length){
      var next=cloneV70(snap);
      next.movementPaths=[];
      next.label=labelV70(tk.steps.length);
      tk.steps.push(next);
    }
  }

  try{
    if(typeof propagateManualStepPositionsV14==="function"){
      propagateManualStepPositionsV14(tk,editingStepIdx,oldStep,snap);
    }
  }catch(e){}

  tk.steps[editingStepIdx]=snap;
  applyMovementEndpointsV70(tk,editingStepIdx,snap);

  if(playback)playback.tk=tk;
  normalizeStepLabelsV70(tk);
  return true;
}

function goToStepV70(targetIdx){
  var tk=currentTaktikV70();
  if(!tk||!tk.steps)return;

  saveCurrentStepV70({autoCreateNext:false});

  // Om användaren trycker framåt från sista steget efter en ändring/rörelse,
  // skapa ett steg och gå dit.
  if(targetIdx>=tk.steps.length){
    ensureNextStepV70("Nytt steg skapades automatiskt");
  }

  targetIdx=Math.max(0,Math.min(targetIdx,tk.steps.length-1));
  movementPaths=[];
  selectedId=null;
  editingStepIdx=targetIdx;

  if(playback){
    playback.stepIndex=targetIdx;
    restoreSnap(tk.steps[targetIdx]);
    render();
    if(typeof updatePlaybar==="function")updatePlaybar();
    if(typeof updateLandscapeStrip==="function")updateLandscapeStrip();
    if(typeof updateFsPortraitNav==="function")updateFsPortraitNav();
    if(typeof updateEditStepUI_silent==="function")updateEditStepUI_silent();
    else updateEditStepUI();
  }else{
    updateEditStepUI();
  }
}

function saveFilmV70(){
  var tk=currentTaktikV70();
  if(!tk)return;

  saveCurrentStepV70({autoCreateNext:false});
  normalizeStepLabelsV70(tk);

  try{cloudSaveTaktik(tk);}catch(e){console.error(e);}

  // Extra hård clean-state eftersom äldre v17/v18/v21 wrappers kan ligga kvar.
  try{taktikDirtyV17=false;}catch(e){}
  try{window.taktikDirtyV17=false;}catch(e){}
  try{
    if(typeof savedTaktikSnapshotV21!=="undefined"){
      savedTaktikSnapshotV21=(typeof normalizeTaktikForCompareV67==="function")
        ? normalizeTaktikForCompareV67(tk)
        : JSON.stringify(tk);
    }
  }catch(e){}
  try{if(typeof markTaktikSavedCleanV67==="function")markTaktikSavedCleanV67(tk);}catch(e){}

  setTimeout(function(){
    try{taktikDirtyV17=false;}catch(e){}
    try{
      if(typeof savedTaktikSnapshotV21!=="undefined"){
        savedTaktikSnapshotV21=(typeof normalizeTaktikForCompareV67==="function")
          ? normalizeTaktikForCompareV67(tk)
          : JSON.stringify(tk);
      }
    }catch(e){}
  },500);

  showToast("Film sparad!");
  cloudStatus("✅ Film sparad","#4ae87a");
}

function bindV70(id,handler){
  var old=document.getElementById(id);
  if(!old)return;
  var neu=old.cloneNode(true);
  neu.dataset.v70Bound="1";
  old.parentNode.replaceChild(neu,old);
  neu.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    handler(e);
    return false;
  },true);
}

function bindTaktikControlsV70(){
  bindV70("btn-edit-step-prev",function(){goToStepV70(editingStepIdx-1);});
  bindV70("btn-edit-step-next",function(){goToStepV70(editingStepIdx+1);});
  bindV70("btn-edit-add-step",function(){
    var tk=currentTaktikV70();
    if(!tk||!tk.steps)return;
    saveCurrentStepV70({autoCreateNext:false});
    if(typeof saveTaktikUndo==="function")saveTaktikUndo();

    var snap=currentSnap();
    snap.label=labelV70(editingStepIdx+1);
    snap.movementPaths=[];
    tk.steps.splice(editingStepIdx+1,0,snap);
    editingStepIdx++;
    normalizeStepLabelsV70(tk);
    updateEditStepUI();
  });
  bindV70("btn-edit-del-step",function(){
    var tk=currentTaktikV70();
    if(!tk||!tk.steps||editingStepIdx===0)return;
    if(typeof saveTaktikUndo==="function")saveTaktikUndo();
    tk.steps.splice(editingStepIdx,1);
    editingStepIdx=Math.min(editingStepIdx,tk.steps.length-1);
    normalizeStepLabelsV70(tk);
    updateEditStepUI();
  });
  bindV70("btn-edit-taktik-save",saveFilmV70);

  // De övre knapparna i taktikbaren behöver också autospara innan de byter steg.
  bindV70("btn-first",function(){goToStepV70(0);});
  bindV70("btn-prev",function(){goToStepV70(editingStepIdx-1);});
  bindV70("btn-next",function(){goToStepV70(editingStepIdx+1);});

  // Spara-steg-knapparna är dolda men om något gammalt anropar dem ska de autospara tyst.
  bindV70("btn-edit-update-step",function(){
    saveCurrentStepV70({autoCreateNext:true});
    updateEditStepUI();
  });
  bindV70("btn-edit-update-step2",function(){
    saveCurrentStepV70({autoCreateNext:true});
    updateEditStepUI();
  });
}

var _updateEditStepUI_v70=typeof updateEditStepUI==="function"?updateEditStepUI:null;
if(_updateEditStepUI_v70){
  updateEditStepUI=function(){
    var tk=currentTaktikV70();
    normalizeStepLabelsV70(tk);
    var r=_updateEditStepUI_v70.apply(this,arguments);
    tk=currentTaktikV70();
    if(tk&&tk.steps&&tk.steps[editingStepIdx]){
      var inp=document.getElementById("edit-step-name-inp");
      if(inp && isAutoLabelV70(inp.value))inp.value=tk.steps[editingStepIdx].label||labelV70(editingStepIdx);
      var c=document.getElementById("edit-step-counter");
      if(c)c.textContent=editingStepIdx===0 ? "Start" : (editingStepIdx+"/"+Math.max(0,tk.steps.length-1));
    }
    setTimeout(bindTaktikControlsV70,0);
    return r;
  };
}

var _updateEditStepUI_silent_v70=typeof updateEditStepUI_silent==="function"?updateEditStepUI_silent:null;
if(_updateEditStepUI_silent_v70){
  updateEditStepUI_silent=function(){
    var tk=currentTaktikV70();
    normalizeStepLabelsV70(tk);
    var r=_updateEditStepUI_silent_v70.apply(this,arguments);
    setTimeout(bindTaktikControlsV70,0);
    return r;
  };
}

var _renderEditSteps_v70=typeof renderEditSteps==="function"?renderEditSteps:null;
if(_renderEditSteps_v70){
  renderEditSteps=function(tk){
    normalizeStepLabelsV70(tk);
    var r=_renderEditSteps_v70.apply(this,arguments);
    var list=document.getElementById("edit-taktik-steps");
    if(list){
      Array.prototype.slice.call(list.querySelectorAll(".row")).forEach(function(row){
        var idx=parseInt(row.dataset.idx,10);
        if(isNaN(idx))return;
        row.onclick=function(e){
          if(e.target.tagName==="BUTTON"||e.target.tagName==="INPUT")return;
          goToStepV70(idx);
        };
      });
    }
    return r;
  };
}

// Om man ritar/flyttar i sista steget: skapa målsteg strax efter interaktionen,
// så nästa knapp och uppspelning har något att gå till.
function maybeAutoCreateAfterEditV70(){
  if(editingTaktikIdx===null)return;
  var tk=currentTaktikV70();
  if(!tk||!tk.steps||editingStepIdx<tk.steps.length-1)return;
  // Vänta tills touch/mouseup hunnit lägga in rörelsebanan i movementPaths.
  setTimeout(function(){
    if(editingTaktikIdx===null)return;
    var tk2=currentTaktikV70();
    if(!tk2||editingStepIdx<tk2.steps.length-1)return;
    saveCurrentStepV70({autoCreateNext:true});
    updateEditStepUI();
  },80);
}

["mouseup","touchend"].forEach(function(evt){
  document.addEventListener(evt,function(){
    if(editingTaktikIdx!==null)maybeAutoCreateAfterEditV70();
  },true);
});

// Jämförelse för osparat ska använda samma normalisering efter v70.
hasUnsavedTaktikChangesV21=function(){
  var tk=currentTaktikV70();
  if(!tk)return false;
  saveCurrentStepV70({autoCreateNext:false});
  var now;
  try{
    now=(typeof normalizeTaktikForCompareV67==="function") ? normalizeTaktikForCompareV67(tk) : JSON.stringify(tk);
  }catch(e){now="";}
  if(typeof savedTaktikSnapshotV21==="undefined" || savedTaktikSnapshotV21===null){
    savedTaktikSnapshotV21=now;
    return false;
  }
  return now!==savedTaktikSnapshotV21;
};

bindTaktikControlsV70();
setTimeout(bindTaktikControlsV70,500);
setTimeout(bindTaktikControlsV70,1500);

/* === slut v70-movement-autostep === */


/* === v71-edit-vs-present: vanlig vy autosparar, fullscreen är tillfällig presentation === */

function isFullscreenPresentV71(){
  return document.body.classList.contains("fullscreen-portrait") ||
         document.body.classList.contains("landscape");
}

function currentTaktikV71(){
  try{
    if(editingTaktikIdx===null || typeof editingTaktikIdx==="undefined")return null;
    return taktikFilmer && taktikFilmer[editingTaktikIdx] ? taktikFilmer[editingTaktikIdx] : null;
  }catch(e){return null;}
}

function hideMovementInFullscreenV71(){
  try{
    var ids=["fs-tb-movement"];
    ids.forEach(function(id){
      var b=document.getElementById(id);
      if(!b)return;
      if(isFullscreenPresentV71()){
        b.style.display="none";
        b.style.visibility="hidden";
        b.style.pointerEvents="none";
        if(mode==="movement")setMode("move");
      }else{
        b.style.visibility="";
        b.style.pointerEvents="";
      }
    });
  }catch(e){}
}

function autosaveCurrentEditStepV71(reason){
  try{
    if(editingTaktikIdx===null)return;
    if(isFullscreenPresentV71())return; // presentationsritning ska inte lagras i filmen

    var tk=currentTaktikV71();
    if(!tk||!tk.steps||!tk.steps[editingStepIdx])return;

    if(typeof saveCurrentStepV70==="function"){
      saveCurrentStepV70({autoCreateNext:true});
    }else if(typeof autoSaveCurrentStepLocalV16==="function"){
      autoSaveCurrentStepLocalV16();
    }else{
      var snap=currentSnap();
      var inp=document.getElementById("edit-step-name-inp");
      var lbl=inp?inp.value.trim():"";
      if(lbl)snap.label=lbl;
      tk.steps[editingStepIdx]=snap;
    }

    if(typeof normalizeStepLabelsV70==="function")normalizeStepLabelsV70(tk);
    else if(typeof normalizeStepLabelsV69==="function")normalizeStepLabelsV69(tk);

    if(playback)playback.tk=tk;
    try{taktikDirtyV17=true;}catch(e){}
  }catch(err){
    console.error("autosaveCurrentEditStepV71",err);
  }
}

var _autosaveTimerV71=null;
function scheduleAutosaveV71(reason){
  if(editingTaktikIdx===null)return;
  if(isFullscreenPresentV71())return;
  if(_autosaveTimerV71)clearTimeout(_autosaveTimerV71);
  _autosaveTimerV71=setTimeout(function(){
    autosaveCurrentEditStepV71(reason);
  },120);
}

// Allt man ritar/flyttar i vanlig vy ska fastna i aktuellt steg.
// Fullscreen lämnas helt utanför.
["mouseup","touchend"].forEach(function(evt){
  document.addEventListener(evt,function(e){
    if(editingTaktikIdx===null)return;
    if(isFullscreenPresentV71())return;
    scheduleAutosaveV71(evt);
  },true);
});

// Textmodaler, radera-knappar, färg/linjeval och liknande fångas via klick/change.
document.addEventListener("click",function(e){
  if(editingTaktikIdx===null)return;
  if(isFullscreenPresentV71())return;
  var t=e.target;
  if(!t)return;
  var id=t.id||"";
  var txt=(t.textContent||"").trim();
  if(
    id.indexOf("text")>=0 ||
    id.indexOf("label")>=0 ||
    id.indexOf("modal")>=0 ||
    id.indexOf("ok")>=0 ||
    txt==="×" ||
    txt==="✕" ||
    txt==="Radera"
  ){
    scheduleAutosaveV71("click");
  }
},true);

document.addEventListener("change",function(e){
  if(editingTaktikIdx===null)return;
  if(isFullscreenPresentV71())return;
  scheduleAutosaveV71("change");
},true);

// Ersätt stegbyte: vanlig vy sparar först, fullscreen/presentation sparar inte utan återställer steg och rensar tillfälliga ritningar.
function goToStepV71(targetIdx){
  var tk=currentTaktikV71();
  if(!tk||!tk.steps)return;

  if(isFullscreenPresentV71()){
    targetIdx=Math.max(0,Math.min(targetIdx,tk.steps.length-1));
    movementPaths=[];
    selectedId=null;
    editingStepIdx=targetIdx;

    if(playback){
      playback.stepIndex=targetIdx;
      restoreSnap(tk.steps[targetIdx]); // detta rensar tillfälliga fullscreen-ritningar
      render();
      if(typeof updatePlaybar==="function")updatePlaybar();
      if(typeof updateLandscapeStrip==="function")updateLandscapeStrip();
      if(typeof updateFsPortraitNav==="function")updateFsPortraitNav();
      if(typeof updateEditStepUI_silent==="function")updateEditStepUI_silent();
    }else{
      restoreSnap(tk.steps[targetIdx]);
      render();
      if(typeof updateEditStepUI==="function")updateEditStepUI();
    }
    return;
  }

  // Vanlig redigeringsvy: spara allt internt innan stegbyte.
  autosaveCurrentEditStepV71("stepchange");

  if(typeof goToStepV70==="function"){
    goToStepV70(targetIdx);
    return;
  }

  targetIdx=Math.max(0,Math.min(targetIdx,tk.steps.length-1));
  movementPaths=[];
  selectedId=null;
  editingStepIdx=targetIdx;
  if(typeof updateEditStepUI==="function")updateEditStepUI();
}

goToStepV70=goToStepV71;
goToStepV69=goToStepV71;
goToEditStepV16=goToStepV71;

// V70:s auto-skapande efter ritning ska bara gälla vanlig redigeringsvy.
maybeAutoCreateAfterEditV70=function(){
  if(editingTaktikIdx===null)return;
  if(isFullscreenPresentV71())return;
  var tk=currentTaktikV71();
  if(!tk||!tk.steps||editingStepIdx<tk.steps.length-1)return;

  setTimeout(function(){
    if(editingTaktikIdx===null || isFullscreenPresentV71())return;
    var tk2=currentTaktikV71();
    if(!tk2||editingStepIdx<tk2.steps.length-1)return;
    if(typeof saveCurrentStepV70==="function")saveCurrentStepV70({autoCreateNext:true});
    if(typeof updateEditStepUI==="function")updateEditStepUI();
  },90);
};

// Spara film: gör en sista intern autosave bara i vanlig vy, därefter nollställs varningen.
function saveFilmV71(){
  var tk=currentTaktikV71();
  if(!tk)return;

  if(!isFullscreenPresentV71()){
    autosaveCurrentEditStepV71("savefilm");
  }

  tk=currentTaktikV71();
  try{
    if(typeof normalizeStepLabelsV70==="function")normalizeStepLabelsV70(tk);
    if(typeof cloudSaveTaktik==="function")cloudSaveTaktik(tk);
  }catch(e){console.error(e);}

  try{taktikDirtyV17=false;}catch(e){}
  try{window.taktikDirtyV17=false;}catch(e){}
  try{
    if(typeof savedTaktikSnapshotV21!=="undefined"){
      savedTaktikSnapshotV21=(typeof normalizeTaktikForCompareV67==="function")
        ? normalizeTaktikForCompareV67(tk)
        : JSON.stringify(tk);
    }
  }catch(e){}
  try{if(typeof markTaktikSavedCleanV67==="function")markTaktikSavedCleanV67(tk);}catch(e){}

  setTimeout(function(){
    try{taktikDirtyV17=false;}catch(e){}
    try{
      if(typeof savedTaktikSnapshotV21!=="undefined"){
        savedTaktikSnapshotV21=(typeof normalizeTaktikForCompareV67==="function")
          ? normalizeTaktikForCompareV67(tk)
          : JSON.stringify(tk);
      }
    }catch(e){}
  },600);

  showToast("Film sparad!");
  cloudStatus("✅ Film sparad","#4ae87a");
}
saveFilmV70=saveFilmV71;
saveWholeFilmV69=saveFilmV71;

function bindV71(id,handler){
  var old=document.getElementById(id);
  if(!old)return;
  var neu=old.cloneNode(true);
  neu.dataset.v71Bound="1";
  old.parentNode.replaceChild(neu,old);
  neu.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    handler(e);
    return false;
  },true);
}

function bindControlsV71(){
  bindV71("btn-edit-step-prev",function(){goToStepV71(editingStepIdx-1);});
  bindV71("btn-edit-step-next",function(){goToStepV71(editingStepIdx+1);});

  bindV71("btn-first",function(){goToStepV71(0);});
  bindV71("btn-prev",function(){goToStepV71(editingStepIdx-1);});
  bindV71("btn-next",function(){goToStepV71(editingStepIdx+1);});

  bindV71("fs-first-btn",function(){goToStepV71(0);});
  bindV71("fs-prev-btn",function(){goToStepV71(editingStepIdx-1);});
  bindV71("fs-next-btn",function(){goToStepV71(editingStepIdx+1);});

  bindV71("ls-first-btn",function(){goToStepV71(0);});
  bindV71("ls-prev-btn",function(){goToStepV71(editingStepIdx-1);});
  bindV71("ls-next-btn",function(){goToStepV71(editingStepIdx+1);});

  bindV71("btn-edit-taktik-save",saveFilmV71);

  // Dold spara-steg får endast göra intern autosave i vanlig vy.
  bindV71("btn-edit-update-step",function(){
    autosaveCurrentEditStepV71("hidden-save-step");
    if(typeof updateEditStepUI==="function")updateEditStepUI();
  });
  bindV71("btn-edit-update-step2",function(){
    autosaveCurrentEditStepV71("hidden-save-step");
    if(typeof updateEditStepUI==="function")updateEditStepUI();
  });
}

var _syncFullscreenToolButtons_v71=typeof syncFullscreenToolButtons==="function"?syncFullscreenToolButtons:null;
if(_syncFullscreenToolButtons_v71){
  syncFullscreenToolButtons=function(){
    _syncFullscreenToolButtons_v71.apply(this,arguments);
    hideMovementInFullscreenV71();
  };
}

var _enterFullscreenPortrait_v71=typeof enterFullscreenPortrait==="function"?enterFullscreenPortrait:null;
if(_enterFullscreenPortrait_v71){
  enterFullscreenPortrait=function(){
    _enterFullscreenPortrait_v71.apply(this,arguments);
    hideMovementInFullscreenV71();
    setMode(mode==="movement"?"move":mode);
    setTimeout(bindControlsV71,0);
  };
}

var _exitFullscreenPortrait_v71=typeof exitFullscreenPortrait==="function"?exitFullscreenPortrait:null;
if(_exitFullscreenPortrait_v71){
  exitFullscreenPortrait=function(){
    _exitFullscreenPortrait_v71.apply(this,arguments);
    hideMovementInFullscreenV71();
    setTimeout(bindControlsV71,0);
  };
}

// Om användaren råkar välja rörelse och sedan går fullscreen: gå till flytta.
var _setMode_v71=typeof setMode==="function"?setMode:null;
if(_setMode_v71){
  setMode=function(m){
    if(isFullscreenPresentV71() && m==="movement")m="move";
    var r=_setMode_v71.apply(this,arguments.length?[m]:arguments);
    hideMovementInFullscreenV71();
    return r;
  };
}

// Osparat-kontrollen ska inte räkna presentationsritningar i fullscreen som filmändringar.
hasUnsavedTaktikChangesV21=function(){
  var tk=currentTaktikV71();
  if(!tk)return false;

  if(!isFullscreenPresentV71()){
    autosaveCurrentEditStepV71("compare");
  }

  var now="";
  try{
    now=(typeof normalizeTaktikForCompareV67==="function") ? normalizeTaktikForCompareV67(tk) : JSON.stringify(tk);
  }catch(e){}

  if(typeof savedTaktikSnapshotV21==="undefined" || savedTaktikSnapshotV21===null){
    savedTaktikSnapshotV21=now;
    return false;
  }
  return now!==savedTaktikSnapshotV21;
};

bindControlsV71();
hideMovementInFullscreenV71();
setTimeout(function(){bindControlsV71();hideMovementInFullscreenV71();},500);
setTimeout(function(){bindControlsV71();hideMovementInFullscreenV71();},1500);

/* === slut v71-edit-vs-present === */


/* === v72-fix-gotostep-recursion: stoppa rundgång i stegbläddring === */

function currentTaktikV72(){
  try{
    if(editingTaktikIdx===null || typeof editingTaktikIdx==="undefined")return null;
    return taktikFilmer && taktikFilmer[editingTaktikIdx] ? taktikFilmer[editingTaktikIdx] : null;
  }catch(e){return null;}
}

function isFullscreenPresentV72(){
  return document.body.classList.contains("fullscreen-portrait") ||
         document.body.classList.contains("landscape");
}

function normalizeLabelsV72(tk){
  try{
    if(typeof normalizeStepLabelsV70==="function")normalizeStepLabelsV70(tk);
    else if(typeof normalizeStepLabelsV69==="function")normalizeStepLabelsV69(tk);
  }catch(e){}
}

function saveStepBeforeNavV72(){
  if(editingTaktikIdx===null)return;
  if(isFullscreenPresentV72())return; // presentationsläge ska inte ändra filmen

  try{
    if(typeof saveCurrentStepV70==="function"){
      saveCurrentStepV70({autoCreateNext:false});
    }else if(typeof autoSaveCurrentStepLocalV16==="function"){
      autoSaveCurrentStepLocalV16();
    }else{
      var tk=currentTaktikV72();
      if(tk&&tk.steps&&tk.steps[editingStepIdx]){
        var snap=currentSnap();
        var inp=document.getElementById("edit-step-name-inp");
        var lbl=inp?inp.value.trim():"";
        if(lbl)snap.label=lbl;
        tk.steps[editingStepIdx]=snap;
      }
    }
  }catch(e){console.error("saveStepBeforeNavV72",e);}
}

function restoreStepUiV72(tk,targetIdx){
  movementPaths=[];
  selectedId=null;
  editingStepIdx=targetIdx;

  if(playback){
    playback.tk=tk;
    playback.stepIndex=targetIdx;
  }

  restoreSnap(tk.steps[targetIdx]);
  render();

  try{if(typeof updatePlaybar==="function")updatePlaybar();}catch(e){}
  try{if(typeof updateLandscapeStrip==="function")updateLandscapeStrip();}catch(e){}
  try{if(typeof updateFsPortraitNav==="function")updateFsPortraitNav();}catch(e){}

  try{
    if(typeof updateEditStepUI_silent==="function")updateEditStepUI_silent();
    else if(typeof updateEditStepUI==="function")updateEditStepUI();
  }catch(e){}
}

function goToStepV72(targetIdx){
  var tk=currentTaktikV72();
  if(!tk||!tk.steps||!tk.steps.length)return;

  saveStepBeforeNavV72();
  normalizeLabelsV72(tk);

  // I vanlig vy: om man trycker framåt förbi sista steget efter ändring,
  // skapa ett nytt steg utan att anropa gamla goToStep-funktioner.
  if(!isFullscreenPresentV72() && targetIdx>=tk.steps.length){
    try{
      if(typeof ensureNextStepV70==="function"){
        ensureNextStepV70("Nytt steg skapades automatiskt");
      }else{
        var snap=currentSnap();
        snap.movementPaths=[];
        snap.label="Steg "+tk.steps.length;
        tk.steps.push(snap);
      }
    }catch(e){}
  }

  targetIdx=Math.max(0,Math.min(targetIdx,tk.steps.length-1));
  restoreStepUiV72(tk,targetIdx);
}

// Ersätt alla alias med den rekursionssäkra versionen.
goToStepV71=goToStepV72;
goToStepV70=goToStepV72;
goToStepV69=goToStepV72;
goToEditStepV16=goToStepV72;

function bindStepBtnV72(id,handler){
  var old=document.getElementById(id);
  if(!old)return;
  var neu=old.cloneNode(true);
  neu.dataset.v72Bound="1";
  old.parentNode.replaceChild(neu,old);
  neu.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    handler();
    return false;
  },true);
}

function bindControlsV72(){
  bindStepBtnV72("btn-edit-step-prev",function(){goToStepV72(editingStepIdx-1);});
  bindStepBtnV72("btn-edit-step-next",function(){goToStepV72(editingStepIdx+1);});

  bindStepBtnV72("btn-first",function(){goToStepV72(0);});
  bindStepBtnV72("btn-prev",function(){goToStepV72(editingStepIdx-1);});
  bindStepBtnV72("btn-next",function(){goToStepV72(editingStepIdx+1);});

  bindStepBtnV72("fs-first-btn",function(){goToStepV72(0);});
  bindStepBtnV72("fs-prev-btn",function(){goToStepV72(editingStepIdx-1);});
  bindStepBtnV72("fs-next-btn",function(){goToStepV72(editingStepIdx+1);});

  bindStepBtnV72("ls-first-btn",function(){goToStepV72(0);});
  bindStepBtnV72("ls-prev-btn",function(){goToStepV72(editingStepIdx-1);});
  bindStepBtnV72("ls-next-btn",function(){goToStepV72(editingStepIdx+1);});
}

bindControlsV72();
setTimeout(bindControlsV72,300);
setTimeout(bindControlsV72,1200);

/* === slut v72-fix-gotostep-recursion === */


/* === v73-step-nav-animation: korrekt stegvisare, mindre autosteg, animerade pilar === */

function currentTaktikV73(){
  try{
    if(editingTaktikIdx===null || typeof editingTaktikIdx==="undefined")return null;
    return taktikFilmer && taktikFilmer[editingTaktikIdx] ? taktikFilmer[editingTaktikIdx] : null;
  }catch(e){return null;}
}

function isPresentModeV73(){
  return document.body.classList.contains("fullscreen-portrait") ||
         document.body.classList.contains("landscape");
}

function cloneV73(o){
  try{return JSON.parse(JSON.stringify(o));}catch(e){return o;}
}

function labelV73(i){
  return i===0 ? "Startläge" : "Steg "+i;
}

function isAutoLabelV73(x){
  var s=String(x||"").trim();
  return !s || s==="Start" || s==="Startläge" || /^Steg\s+\d+$/i.test(s);
}

function normalizeLabelsV73(tk){
  if(!tk||!Array.isArray(tk.steps))return;
  tk.steps.forEach(function(st,i){
    if(!st)return;
    if(isAutoLabelV73(st.label))st.label=labelV73(i);
  });
}

function stepTotalV73(tk){
  return Math.max(0, ((tk&&tk.steps)?tk.steps.length:1)-1);
}

function updateAllStepLabelsV73(){
  var tk=currentTaktikV73();
  if(!tk||!tk.steps)return;
  normalizeLabelsV73(tk);
  var total=stepTotalV73(tk);
  var cur=editingStepIdx||0;

  var editCounter=document.getElementById("edit-step-counter");
  if(editCounter)editCounter.textContent=cur===0 ? "Start" : (cur+"/"+total);

  var playCounter=document.getElementById("play-counter");
  if(playCounter)playCounter.textContent=cur===0 ? "Start" : (cur+"/"+total);

  var fsLabel=document.getElementById("fs-step-label");
  if(fsLabel)fsLabel.textContent=cur===0 ? "Start" : (cur+"/"+total);

  var lsLabel=document.getElementById("ls-step-label");
  if(lsLabel)lsLabel.textContent=(tk.name||"")+"  "+(cur===0 ? "Start" : (cur+"/"+total));

  var lsSide=document.getElementById("ls-side-label");
  if(lsSide)lsSide.textContent=tk.name||"";

  ["btn-prev","btn-edit-step-prev","fs-prev-btn","ls-prev-btn"].forEach(function(id){
    var b=document.getElementById(id); if(b){b.disabled=cur<=0;b.style.opacity=cur>0?"1":"0.3";}
  });
  ["btn-next","btn-edit-step-next","fs-next-btn","ls-next-btn"].forEach(function(id){
    var b=document.getElementById(id); if(b){b.disabled=cur>=total;b.style.opacity=cur<total?"1":"0.3";}
  });
  ["btn-first","fs-first-btn","ls-first-btn"].forEach(function(id){
    var b=document.getElementById(id); if(b){b.disabled=cur<=0;b.style.opacity=cur>0?"1":"0.3";}
  });
}

function posMapV73(step){
  var map={};
  if(!step)return map;
  (step.players||[]).forEach(function(p){
    map[p.id]={x:p.x,y:p.y};
  });
  if(step.ball)map.ball={x:step.ball.x,y:step.ball.y};
  return map;
}

function positionsChangedV73(a,b){
  var ma=posMapV73(a), mb=posMapV73(b);
  var keys={};
  Object.keys(ma).forEach(function(k){keys[k]=true;});
  Object.keys(mb).forEach(function(k){keys[k]=true;});
  return Object.keys(keys).some(function(k){
    if(!ma[k]||!mb[k])return true;
    var dx=(ma[k].x||0)-(mb[k].x||0);
    var dy=(ma[k].y||0)-(mb[k].y||0);
    return dx*dx+dy*dy>1;
  });
}

function movementChangedV73(oldStep,snap){
  var oldCount=(oldStep&&oldStep.movementPaths?oldStep.movementPaths.length:0);
  var newCount=(snap&&snap.movementPaths?snap.movementPaths.length:0);
  if(newCount!==oldCount)return true;
  try{
    return JSON.stringify(oldStep&&oldStep.movementPaths||[])!==JSON.stringify(snap&&snap.movementPaths||[]);
  }catch(e){return newCount>0;}
}

function setPosInStepV73(step,id,pos){
  if(!step||!pos)return;
  if(id==="ball"){
    if(!step.ball)step.ball={x:pos.x,y:pos.y};
    step.ball.x=pos.x;step.ball.y=pos.y;
    return;
  }
  var p=(step.players||[]).find(function(x){return x.id===id;});
  if(p){p.x=pos.x;p.y=pos.y;}
}

function applyMovementEndpointsToNextV73(tk,idx,snap){
  if(!tk||!snap||!Array.isArray(snap.movementPaths))return;
  snap.movementPaths.forEach(function(mp){
    if(!mp||!mp.playerId||!mp.pts||!mp.pts.length)return;
    var ep=mp.pts[mp.pts.length-1];

    if(idx>=tk.steps.length-1){
      var next=cloneV73(snap);
      next.movementPaths=[];
      next.label=labelV73(tk.steps.length);
      setPosInStepV73(next,mp.playerId,ep);
      tk.steps.push(next);
    }

    for(var si=idx+1;si<tk.steps.length;si++){
      var fs=tk.steps[si];
      if(!fs)continue;
      if(typeof _stepHasMovementForV14==="function" && _stepHasMovementForV14(fs,mp.playerId))break;
      setPosInStepV73(fs,mp.playerId,ep);
    }
  });
}

function saveCurrentStepV73(opts){
  opts=opts||{};
  if(editingTaktikIdx===null)return {created:false};
  if(isPresentModeV73())return {created:false};

  var tk=currentTaktikV73();
  if(!tk||!tk.steps||!tk.steps[editingStepIdx])return {created:false};

  var oldStep=cloneV73(tk.steps[editingStepIdx]);
  var snap=currentSnap();
  var inp=document.getElementById("edit-step-name-inp");
  var lbl=inp?inp.value.trim():"";
  if(lbl)snap.label=lbl;
  else if(isAutoLabelV73(snap.label))snap.label=labelV73(editingStepIdx);

  snap.movementPaths=(movementPaths||[]).map(function(m){
    return {id:m.id,playerId:m.playerId,pts:(m.pts||[]).map(function(p){return{x:p.x,y:p.y};})};
  });

  var isLast=editingStepIdx>=tk.steps.length-1;
  var posChanged=positionsChangedV73(oldStep,snap);
  var movChanged=movementChangedV73(oldStep,snap);
  var created=false;

  if(isLast && opts.allowAutoCreate && posChanged && !movChanged){
    // Manuell flytt på sista steget:
    // behåll gamla sista steget som startbild, skapa nytt steg med den nya positionen och gå dit.
    var newStep=cloneV73(snap);
    newStep.movementPaths=[];
    newStep.label=labelV73(tk.steps.length);
    tk.steps[editingStepIdx]=oldStep;
    tk.steps.push(newStep);
    editingStepIdx=tk.steps.length-1;
    created=true;
  }else{
    try{
      if(typeof propagateManualStepPositionsV14==="function"){
        propagateManualStepPositionsV14(tk,editingStepIdx,oldStep,snap);
      }
    }catch(e){}
    tk.steps[editingStepIdx]=snap;

    if(movChanged){
      applyMovementEndpointsToNextV73(tk,editingStepIdx,snap);
      created=isLast && tk.steps.length>editingStepIdx+1;
    }
  }

  normalizeLabelsV73(tk);
  if(playback)playback.tk=tk;
  try{taktikDirtyV17=true;}catch(e){}
  updateAllStepLabelsV73();
  return {created:created};
}

// Stoppa v70/v71:s för aggressiva autosteg vid varje mouseup/touchend.
maybeAutoCreateAfterEditV70=function(){};

function autosaveAfterEditV73(){
  if(editingTaktikIdx===null)return;
  if(isPresentModeV73())return;
  setTimeout(function(){
    var res=saveCurrentStepV73({allowAutoCreate:true});
    if(res&&res.created){
      // Vid manuell flytt på sista steget hamnar man i det nya steget.
      restoreSnap(currentTaktikV73().steps[editingStepIdx]);
      render();
    }
    if(typeof updateEditStepUI==="function")updateEditStepUI();
    updateAllStepLabelsV73();
  },90);
}

["mouseup","touchend"].forEach(function(evt){
  document.addEventListener(evt,function(){
    autosaveAfterEditV73();
  },true);
});

function jumpToStepNoAnimV73(targetIdx){
  var tk=currentTaktikV73();
  if(!tk||!tk.steps)return;
  targetIdx=Math.max(0,Math.min(targetIdx,tk.steps.length-1));
  movementPaths=[];
  selectedId=null;
  editingStepIdx=targetIdx;
  if(playback)playback.stepIndex=targetIdx;
  restoreSnap(tk.steps[targetIdx]);
  render();
  if(typeof updateEditStepUI_silent==="function")updateEditStepUI_silent();
  else if(typeof updateEditStepUI==="function")updateEditStepUI();
  updateAllStepLabelsV73();
}

function animateOrJumpV73(targetIdx){
  var tk=currentTaktikV73();
  if(!tk||!tk.steps)return;
  targetIdx=Math.max(0,Math.min(targetIdx,tk.steps.length-1));
  if(targetIdx===editingStepIdx){
    updateAllStepLabelsV73();
    return;
  }

  movementPaths=[];
  selectedId=null;

  if(playback && typeof animateToStep==="function"){
    editingStepIdx=targetIdx;
    playback.tk=tk;
    animateToStep(targetIdx);
    setTimeout(updateAllStepLabelsV73,40);
    setTimeout(updateAllStepLabelsV73,250);
  }else{
    jumpToStepNoAnimV73(targetIdx);
  }
}

function goToStepV73(targetIdx, opts){
  opts=opts||{};
  var tk=currentTaktikV73();
  if(!tk||!tk.steps)return;

  if(!isPresentModeV73()){
    saveCurrentStepV73({allowAutoCreate:false});
  }

  normalizeLabelsV73(tk);
  targetIdx=Math.max(0,Math.min(targetIdx,tk.steps.length-1));

  if(opts.animate===false){
    jumpToStepNoAnimV73(targetIdx);
  }else{
    animateOrJumpV73(targetIdx);
  }
}

goToStepV72=goToStepV73;
goToStepV71=goToStepV73;
goToStepV70=goToStepV73;
goToStepV69=goToStepV73;
goToEditStepV16=function(idx){goToStepV73(idx,{animate:false});};

function bindBtnV73(id,handler){
  var old=document.getElementById(id);
  if(!old)return;
  var neu=old.cloneNode(true);
  neu.dataset.v73Bound="1";
  old.parentNode.replaceChild(neu,old);
  neu.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    handler();
    return false;
  },true);
}

function bindControlsV73(){
  bindBtnV73("btn-edit-step-prev",function(){goToStepV73(editingStepIdx-1,{animate:false});});
  bindBtnV73("btn-edit-step-next",function(){goToStepV73(editingStepIdx+1,{animate:false});});

  // Övre pilarna ska animera, även i helskärm.
  bindBtnV73("btn-first",function(){goToStepV73(0,{animate:true});});
  bindBtnV73("btn-prev",function(){goToStepV73(editingStepIdx-1,{animate:true});});
  bindBtnV73("btn-next",function(){goToStepV73(editingStepIdx+1,{animate:true});});

  bindBtnV73("fs-first-btn",function(){goToStepV73(0,{animate:true});});
  bindBtnV73("fs-prev-btn",function(){goToStepV73(editingStepIdx-1,{animate:true});});
  bindBtnV73("fs-next-btn",function(){goToStepV73(editingStepIdx+1,{animate:true});});

  bindBtnV73("ls-first-btn",function(){goToStepV73(0,{animate:true});});
  bindBtnV73("ls-prev-btn",function(){goToStepV73(editingStepIdx-1,{animate:true});});
  bindBtnV73("ls-next-btn",function(){goToStepV73(editingStepIdx+1,{animate:true});});

  bindBtnV73("btn-edit-add-step",function(){
    var tk=currentTaktikV73();
    if(!tk||!tk.steps)return;
    saveCurrentStepV73({allowAutoCreate:false});
    var snap=currentSnap();
    snap.movementPaths=[];
    snap.label=labelV73(editingStepIdx+1);
    tk.steps.splice(editingStepIdx+1,0,snap);
    editingStepIdx++;
    normalizeLabelsV73(tk);
    restoreSnap(tk.steps[editingStepIdx]);
    render();
    if(typeof updateEditStepUI==="function")updateEditStepUI();
    updateAllStepLabelsV73();
  });
}

var _updateEditStepUI_v73=typeof updateEditStepUI==="function"?updateEditStepUI:null;
if(_updateEditStepUI_v73){
  updateEditStepUI=function(){
    var tk=currentTaktikV73();
    normalizeLabelsV73(tk);
    var r=_updateEditStepUI_v73.apply(this,arguments);
    updateAllStepLabelsV73();
    setTimeout(bindControlsV73,0);
    return r;
  };
}

var _updateEditStepUI_silent_v73=typeof updateEditStepUI_silent==="function"?updateEditStepUI_silent:null;
if(_updateEditStepUI_silent_v73){
  updateEditStepUI_silent=function(){
    var tk=currentTaktikV73();
    normalizeLabelsV73(tk);
    var r=_updateEditStepUI_silent_v73.apply(this,arguments);
    updateAllStepLabelsV73();
    setTimeout(bindControlsV73,0);
    return r;
  };
}

var _updatePlaybar_v73=typeof updatePlaybar==="function"?updatePlaybar:null;
if(_updatePlaybar_v73){
  updatePlaybar=function(){
    var r=_updatePlaybar_v73.apply(this,arguments);
    updateAllStepLabelsV73();
    return r;
  };
}

var _renderEditSteps_v73=typeof renderEditSteps==="function"?renderEditSteps:null;
if(_renderEditSteps_v73){
  renderEditSteps=function(tk){
    normalizeLabelsV73(tk);
    var r=_renderEditSteps_v73.apply(this,arguments);
    var list=document.getElementById("edit-taktik-steps");
    if(list){
      Array.prototype.slice.call(list.querySelectorAll(".row")).forEach(function(row){
        var idx=parseInt(row.dataset.idx,10);
        if(isNaN(idx))return;
        row.onclick=function(e){
          if(e.target.tagName==="BUTTON"||e.target.tagName==="INPUT")return;
          goToStepV73(idx,{animate:false});
        };
      });
    }
    return r;
  };
}

bindControlsV73();
setTimeout(function(){bindControlsV73();updateAllStepLabelsV73();},300);
setTimeout(function(){bindControlsV73();updateAllStepLabelsV73();},1200);

/* === slut v73-step-nav-animation === */


/* === v74-final-taktik-fixes: rensa fullscreen, skrivskydd, clean save, autosteg bara efter planändring === */

var v74CanvasEditArmed=false;
var v74LastCanvasEditAt=0;
var v74LastSaveAt=0;

function currentTaktikV74(){
  try{
    if(editingTaktikIdx===null || typeof editingTaktikIdx==="undefined")return null;
    return taktikFilmer && taktikFilmer[editingTaktikIdx] ? taktikFilmer[editingTaktikIdx] : null;
  }catch(e){return null;}
}

function isPresentModeV74(){
  return document.body.classList.contains("fullscreen-portrait") ||
         document.body.classList.contains("landscape");
}

function isReadOnlyTaktikV74(tk){
  try{
    if(!tk)tk=currentTaktikV74();
    if(!tk)return false;
    if(tk._readOnly)return true;
    if(typeof isReadOnlyFileV10==="function")return !!isReadOnlyFileV10(tk);
  }catch(e){}
  return false;
}

function updateReadonlyUiV74(tk){
  tk=tk||currentTaktikV74();
  var ro=isReadOnlyTaktikV74(tk);
  document.body.classList.toggle("v74-readonly-taktik",!!ro);
  try{
    var inp=document.getElementById("edit-step-name-inp");
    if(inp)inp.disabled=!!ro;
  }catch(e){}
  if(ro && mode==="movement"){
    try{setMode("move");}catch(e){}
  }
}

function cloneV74(o){
  try{return JSON.parse(JSON.stringify(o));}catch(e){return o;}
}

function labelV74(i){
  return i===0 ? "Startläge" : "Steg "+i;
}

function isAutoLabelV74(x){
  var s=String(x||"").trim();
  return !s || s==="Start" || s==="Startläge" || /^Steg\s+\d+$/i.test(s);
}

function normalizeLabelsV74(tk){
  if(!tk||!Array.isArray(tk.steps))return;
  tk.steps.forEach(function(st,i){
    if(!st)return;
    if(isAutoLabelV74(st.label))st.label=labelV74(i);
  });
}

function posMapV74(step){
  var map={};
  if(!step)return map;
  (step.players||[]).forEach(function(p){map[p.id]={x:p.x,y:p.y};});
  if(step.ball)map.ball={x:step.ball.x,y:step.ball.y};
  return map;
}

function positionsChangedV74(a,b){
  var ma=posMapV74(a), mb=posMapV74(b), keys={};
  Object.keys(ma).forEach(function(k){keys[k]=true;});
  Object.keys(mb).forEach(function(k){keys[k]=true;});
  return Object.keys(keys).some(function(k){
    if(!ma[k]||!mb[k])return true;
    var dx=(ma[k].x||0)-(mb[k].x||0), dy=(ma[k].y||0)-(mb[k].y||0);
    return dx*dx+dy*dy>1;
  });
}

function movementChangedV74(oldStep,snap){
  try{
    return JSON.stringify((oldStep&&oldStep.movementPaths)||[])!==JSON.stringify((snap&&snap.movementPaths)||[]);
  }catch(e){
    return ((snap&&snap.movementPaths)||[]).length!==((oldStep&&oldStep.movementPaths)||[]).length;
  }
}

function setPosV74(step,id,pos){
  if(!step||!pos)return;
  if(id==="ball"){
    if(!step.ball)step.ball={x:pos.x,y:pos.y};
    step.ball.x=pos.x;step.ball.y=pos.y;
    return;
  }
  var p=(step.players||[]).find(function(x){return x.id===id;});
  if(p){p.x=pos.x;p.y=pos.y;}
}

function applyMovementEndpointsV74(tk,idx,snap,allowCreate){
  if(!tk||!snap||!Array.isArray(snap.movementPaths))return false;
  var created=false;

  snap.movementPaths.forEach(function(mp){
    if(!mp||!mp.playerId||!mp.pts||!mp.pts.length)return;
    var ep=mp.pts[mp.pts.length-1];

    if(idx>=tk.steps.length-1 && allowCreate){
      var next=cloneV74(snap);
      next.movementPaths=[];
      next.label=labelV74(tk.steps.length);
      setPosV74(next,mp.playerId,ep);
      tk.steps.push(next);
      created=true;
    }

    for(var si=idx+1;si<tk.steps.length;si++){
      var fs=tk.steps[si]; if(!fs)continue;
      try{
        if(typeof _stepHasMovementForV14==="function" && _stepHasMovementForV14(fs,mp.playerId))break;
      }catch(e){}
      setPosV74(fs,mp.playerId,ep);
    }
  });

  return created;
}

function markCanvasEditV74(){
  if(editingTaktikIdx===null)return;
  if(isPresentModeV74())return;
  if(isReadOnlyTaktikV74())return;
  v74CanvasEditArmed=true;
  v74LastCanvasEditAt=Date.now();
}

(function(){
  var pitch=document.getElementById("pitch-svg");
  if(pitch && !pitch.dataset.v74CanvasWatch){
    pitch.dataset.v74CanvasWatch="1";
    ["mousedown","touchstart"].forEach(function(evt){
      pitch.addEventListener(evt,markCanvasEditV74,true);
    });
  }
})();

function saveCurrentStepV74(opts){
  opts=opts||{};
  if(editingTaktikIdx===null)return {created:false};
  if(isPresentModeV74())return {created:false};
  if(isReadOnlyTaktikV74())return {created:false};

  var tk=currentTaktikV74();
  if(!tk||!tk.steps||!tk.steps[editingStepIdx])return {created:false};

  var allowAutoCreate=!!opts.allowAutoCreate && v74CanvasEditArmed && (Date.now()-v74LastCanvasEditAt<2500);
  var oldStep=cloneV74(tk.steps[editingStepIdx]);
  var snap=currentSnap();

  var inp=document.getElementById("edit-step-name-inp");
  var lbl=inp?inp.value.trim():"";
  if(lbl)snap.label=lbl;
  else if(isAutoLabelV74(snap.label))snap.label=labelV74(editingStepIdx);

  snap.movementPaths=(movementPaths||[]).map(function(m){
    return {id:m.id,playerId:m.playerId,pts:(m.pts||[]).map(function(p){return{x:p.x,y:p.y};})};
  });

  var isLast=editingStepIdx>=tk.steps.length-1;
  var posChanged=positionsChangedV74(oldStep,snap);
  var movChanged=movementChangedV74(oldStep,snap);
  var created=false;

  if(isLast && allowAutoCreate && posChanged && !movChanged){
    // Manuell flytt på sista steget: skapa nytt målsteg, men lämna gamla steget som startbild.
    var newStep=cloneV74(snap);
    newStep.movementPaths=[];
    newStep.label=labelV74(tk.steps.length);
    tk.steps[editingStepIdx]=oldStep;
    tk.steps.push(newStep);
    editingStepIdx=tk.steps.length-1;
    created=true;
  }else{
    try{
      if(typeof propagateManualStepPositionsV14==="function"){
        propagateManualStepPositionsV14(tk,editingStepIdx,oldStep,snap);
      }
    }catch(e){}
    tk.steps[editingStepIdx]=snap;
    if(movChanged){
      created=applyMovementEndpointsV74(tk,editingStepIdx,snap,isLast && allowAutoCreate);
    }
  }

  normalizeLabelsV74(tk);
  if(playback)playback.tk=tk;
  try{taktikDirtyV17=true;}catch(e){}

  v74CanvasEditArmed=false;
  updateReadonlyUiV74(tk);
  return {created:created};
}

// Ersätt tidigare save-funktioner så gammal mouseup-logik inte kan skapa steg utan riktig planändring.
saveCurrentStepV73=saveCurrentStepV74;
saveCurrentStepV70=saveCurrentStepV74;

// Stoppa äldre aggressiv autosteg-funktion.
maybeAutoCreateAfterEditV70=function(){};

function clearFullscreenDrawingsOnlyV74(){
  arrows=[];
  labels=[];
  freehandPaths=[];
  zones=[];
  movementPaths=[];
  selectedId=null;
  arrowStart=null;arrowCurrent=null;
  freehandCurrent=null;freehandDrawing=false;
  zoneStart=null;zonePreview=null;
  movementCurrent=null;
  render();
  try{showToast("Tillfälliga ritningar rensade");}catch(e){}
}

function bindFullscreenClearV74(){
  var b=document.getElementById("fs-tb-clear");
  if(!b || b.dataset.v74ClearBound)return;
  var clone=b.cloneNode(true);
  clone.dataset.v74ClearBound="1";
  b.parentNode.replaceChild(clone,b);
  clone.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();

    if(isPresentModeV74()){
      clearFullscreenDrawingsOnlyV74();
    }else if(typeof clearCoachboardToFormation==="function"){
      clearCoachboardToFormation();
    }else{
      clearFullscreenDrawingsOnlyV74();
    }
    return false;
  },true);
}

var _setupFullscreenPortraitToolbar_v74=typeof setupFullscreenPortraitToolbar==="function"?setupFullscreenPortraitToolbar:null;
if(_setupFullscreenPortraitToolbar_v74){
  setupFullscreenPortraitToolbar=function(){
    var r=_setupFullscreenPortraitToolbar_v74.apply(this,arguments);
    bindFullscreenClearV74();
    updateReadonlyUiV74();
    return r;
  };
}

var _enterFullscreenPortrait_v74=typeof enterFullscreenPortrait==="function"?enterFullscreenPortrait:null;
if(_enterFullscreenPortrait_v74){
  enterFullscreenPortrait=function(){
    var r=_enterFullscreenPortrait_v74.apply(this,arguments);
    bindFullscreenClearV74();
    updateReadonlyUiV74();
    return r;
  };
}

function normalizeForSavedV74(tk){
  try{
    if(typeof normalizeTaktikForCompareV67==="function")return normalizeTaktikForCompareV67(tk);
    if(typeof normalizeTaktikForCompareV21==="function")return normalizeTaktikForCompareV21(tk);
    var c=cloneV74(tk||{});
    delete c._readOnly;delete c._isDraft;delete c._meta;delete c.meta;delete c.dbId;
    return JSON.stringify(c);
  }catch(e){return "";}
}

function forceCleanV74(tk){
  tk=tk||currentTaktikV74();
  try{savedTaktikSnapshotV21=normalizeForSavedV74(tk);}catch(e){}
  try{taktikDirtyV17=false;}catch(e){}
  try{window.taktikDirtyV17=false;}catch(e){}
  try{lastTaktikSaveAtV23=Date.now();}catch(e){}
  v74LastSaveAt=Date.now();
}

function saveFilmV74(){
  var tk=currentTaktikV74();
  if(!tk)return;
  if(isReadOnlyTaktikV74(tk)){
    showToast("Filen är skrivskyddad. Kopiera den först.",false);
    return;
  }

  saveCurrentStepV74({allowAutoCreate:false});
  tk=currentTaktikV74();
  normalizeLabelsV74(tk);
  forceCleanV74(tk);

  try{cloudSaveTaktik(tk);}catch(e){console.error(e);}
  forceCleanV74(tk);

  setTimeout(function(){forceCleanV74(tk);},300);
  setTimeout(function(){forceCleanV74(tk);},1000);
  setTimeout(function(){forceCleanV74(tk);},2500);

  showToast("Film sparad!");
  cloudStatus("✅ Film sparad","#4ae87a");
}

saveFilmV73=saveFilmV74;
saveFilmV71=saveFilmV74;
saveFilmV70=saveFilmV74;
saveWholeFilmV69=saveFilmV74;
saveCurrentTaktikFileV67=saveFilmV74;
saveCurrentTaktikFileV20=saveFilmV74;
saveCurrentTaktikFileV21=saveFilmV74;
saveCurrentTaktikFileV23=saveFilmV74;

hasUnsavedTaktikChangesV21=function(){
  var tk=currentTaktikV74();
  if(!tk)return false;
  if(isReadOnlyTaktikV74(tk))return false;
  if(Date.now()-v74LastSaveAt<5000)return false;

  if(!isPresentModeV74()){
    saveCurrentStepV74({allowAutoCreate:false});
  }

  var now=normalizeForSavedV74(tk);
  if(typeof savedTaktikSnapshotV21==="undefined" || savedTaktikSnapshotV21===null){
    savedTaktikSnapshotV21=now;
    return false;
  }
  return now!==savedTaktikSnapshotV21;
};

function confirmCleanV74(){
  if(!hasUnsavedTaktikChangesV21())return true;
  return confirm("Du har osparade ändringar i taktiken. Vill du lämna utan att spara?");
}
confirmUnsavedV21=confirmCleanV74;
confirmUnsavedV19=confirmCleanV74;
confirmUnsavedTaktikV18=confirmCleanV74;
confirmDiscardUnsavedV17=confirmCleanV74;
confirmUnsavedUnifiedV23=confirmCleanV74;

function bindBtnV74(id,handler){
  var old=document.getElementById(id);
  if(!old)return;
  var neu=old.cloneNode(true);
  neu.dataset.v74Bound="1";
  old.parentNode.replaceChild(neu,old);
  neu.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    handler(e);
    return false;
  },true);
}

function bindCoreButtonsV74(){
  bindBtnV74("btn-edit-taktik-save",saveFilmV74);
  bindBtnV74("btn-edit-taktik-exit",function(){
    if(!confirmCleanV74())return;
    forceCleanV74();
    if(typeof exitEditTaktik==="function"){
      movementPaths=[];selectedId=null;editingTaktikIdx=null;editingStepIdx=0;isEditingTaktik=false;
      document.body.classList.remove("v74-readonly-taktik");
      var ui=document.getElementById("edit-taktik-ui");if(ui)ui.style.display="none";
      var no=document.getElementById("no-rec-ui");if(no)no.style.display="block";
      if(typeof renderTaktikList==="function")renderTaktikList();
    }
  });
  bindBtnV74("btn-stop-play",function(){
    if(!confirmCleanV74())return;
    forceCleanV74();
    if(animFrame)cancelAnimationFrame(animFrame);
    playback=null;movementPaths=[];selectedId=null;
    document.body.classList.remove("v74-readonly-taktik");
    var tb=document.getElementById("taktikbar");if(tb)tb.style.display="none";
    var bp=document.getElementById("bottompanel");if(bp)bp.classList.remove("hidden");
    if(typeof exitEditTaktik==="function"){
      movementPaths=[];selectedId=null;editingTaktikIdx=null;editingStepIdx=0;isEditingTaktik=false;
      var ui=document.getElementById("edit-taktik-ui");if(ui)ui.style.display="none";
      var no=document.getElementById("no-rec-ui");if(no)no.style.display="block";
      if(typeof renderTaktikList==="function")renderTaktikList();
    }
    render();
  });
}

var _startPlayback_v74=typeof startPlayback==="function"?startPlayback:null;
if(_startPlayback_v74){
  startPlayback=function(idx){
    var tk=taktikFilmer && taktikFilmer[idx] ? taktikFilmer[idx] : null;
    var ro=isReadOnlyTaktikV74(tk);
    if(tk)tk._readOnly=!!ro;

    var r=_startPlayback_v74.apply(this,arguments);

    tk=currentTaktikV74()||tk;
    updateReadonlyUiV74(tk);

    if(ro){
      forceCleanV74(tk);
      try{showToast("Öppnad skrivskyddat – kopiera för att redigera");}catch(e){}
    }else{
      forceCleanV74(tk);
    }

    bindCoreButtonsV74();
    bindFullscreenClearV74();
    return r;
  };
}

var _updateEditStepUI_v74=typeof updateEditStepUI==="function"?updateEditStepUI:null;
if(_updateEditStepUI_v74){
  updateEditStepUI=function(){
    var r=_updateEditStepUI_v74.apply(this,arguments);
    updateReadonlyUiV74();
    bindCoreButtonsV74();
    return r;
  };
}

var _updateEditStepUI_silent_v74=typeof updateEditStepUI_silent==="function"?updateEditStepUI_silent:null;
if(_updateEditStepUI_silent_v74){
  updateEditStepUI_silent=function(){
    var r=_updateEditStepUI_silent_v74.apply(this,arguments);
    updateReadonlyUiV74();
    bindCoreButtonsV74();
    return r;
  };
}

bindCoreButtonsV74();
setTimeout(function(){bindCoreButtonsV74();bindFullscreenClearV74();updateReadonlyUiV74();},300);
setTimeout(function(){bindCoreButtonsV74();bindFullscreenClearV74();updateReadonlyUiV74();},1200);

/* === slut v74-final-taktik-fixes === */


/* === v75-movement-safe-step: säkra stegstruktur + spara rörelse som hel bana === */

function currentTaktikV75(){
  try{
    if(editingTaktikIdx===null || typeof editingTaktikIdx==="undefined")return null;
    return taktikFilmer && taktikFilmer[editingTaktikIdx] ? taktikFilmer[editingTaktikIdx] : null;
  }catch(e){return null;}
}

function cloneV75(o){
  try{return JSON.parse(JSON.stringify(o));}catch(e){return o;}
}

function labelV75(i){
  return i===0 ? "Startläge" : "Steg "+i;
}

function isAutoLabelV75(x){
  var s=String(x||"").trim();
  return !s || s==="Start" || s==="Startläge" || /^Steg\s+\d+$/i.test(s);
}

function ensureArrayV75(x){
  return Array.isArray(x) ? x : [];
}

function normalizeMovementV75(list){
  return ensureArrayV75(list).map(function(m){
    if(!m)return null;
    var pts=ensureArrayV75(m.pts).map(function(p){
      return {x:Number(p.x)||0,y:Number(p.y)||0};
    }).filter(function(p){return isFinite(p.x)&&isFinite(p.y);});

    // Behåll rörelsen som EN bana, inte flera steg.
    return {
      id:m.id || ("mv"+(idCounter++)),
      playerId:m.playerId,
      pts:pts
    };
  }).filter(function(m){
    return m && m.playerId && m.pts && m.pts.length>=2;
  });
}

function safeStepV75(step,idx){
  step=step||{};
  if(!Array.isArray(step.players)){
    step.players=cloneV75(players||[]);
  }
  if(!step.ball){
    step.ball=cloneV75(ball||{x:W/2,y:H/2});
  }
  step.arrows=ensureArrayV75(step.arrows);
  step.labels=ensureArrayV75(step.labels);
  step.freehandPaths=ensureArrayV75(step.freehandPaths);
  step.zones=ensureArrayV75(step.zones);
  step.movementPaths=normalizeMovementV75(step.movementPaths||step.movementpaths||[]);
  if(isAutoLabelV75(step.label))step.label=labelV75(idx||0);
  return step;
}

function normalizeTaktikV75(tk){
  if(!tk)return tk;
  if(!Array.isArray(tk.steps))tk.steps=[];
  if(!tk.steps.length)tk.steps=[currentSnap()];
  for(var i=0;i<tk.steps.length;i++){
    tk.steps[i]=safeStepV75(tk.steps[i],i);
  }
  return tk;
}

function isPresentModeV75(){
  return document.body.classList.contains("fullscreen-portrait") ||
         document.body.classList.contains("landscape");
}

function isReadonlyV75(){
  try{
    var tk=currentTaktikV75();
    if(!tk)return false;
    if(typeof isReadOnlyTaktikV74==="function")return !!isReadOnlyTaktikV74(tk);
    if(typeof isReadOnlyFileV10==="function")return !!isReadOnlyFileV10(tk);
  }catch(e){}
  return false;
}

function posChangedV75(a,b){
  a=safeStepV75(cloneV75(a),0);
  b=safeStepV75(cloneV75(b),0);
  var mapA={},mapB={};
  (a.players||[]).forEach(function(p){mapA[p.id]={x:p.x,y:p.y};});
  (b.players||[]).forEach(function(p){mapB[p.id]={x:p.x,y:p.y};});
  if(a.ball)mapA.ball={x:a.ball.x,y:a.ball.y};
  if(b.ball)mapB.ball={x:b.ball.x,y:b.ball.y};
  var keys={};
  Object.keys(mapA).forEach(function(k){keys[k]=true;});
  Object.keys(mapB).forEach(function(k){keys[k]=true;});
  return Object.keys(keys).some(function(k){
    if(!mapA[k]||!mapB[k])return true;
    var dx=(mapA[k].x||0)-(mapB[k].x||0),dy=(mapA[k].y||0)-(mapB[k].y||0);
    return dx*dx+dy*dy>1;
  });
}

function movementChangedV75(a,b){
  try{
    return JSON.stringify(normalizeMovementV75((a&&a.movementPaths)||[])) !==
           JSON.stringify(normalizeMovementV75((b&&b.movementPaths)||[]));
  }catch(e){return false;}
}

function setPosV75(step,id,pos){
  if(!step||!pos)return;
  if(id==="ball"){
    if(!step.ball)step.ball={x:pos.x,y:pos.y};
    step.ball.x=pos.x;step.ball.y=pos.y;
    return;
  }
  var p=(step.players||[]).find(function(x){return x.id===id;});
  if(p){p.x=pos.x;p.y=pos.y;}
}

function applyMovementEndpointV75(tk,idx,snap,allowCreate){
  var created=false;
  var mvs=normalizeMovementV75(snap.movementPaths);
  snap.movementPaths=mvs;

  mvs.forEach(function(mp){
    var ep=mp.pts[mp.pts.length-1];

    if(idx>=tk.steps.length-1 && allowCreate){
      // Skapa ETT målsteg. Själva rörelsebanan ligger kvar i föregående steg som en hel bana.
      var next=cloneV75(snap);
      next.movementPaths=[];
      next.label=labelV75(tk.steps.length);
      setPosV75(next,mp.playerId,ep);
      tk.steps.push(safeStepV75(next,tk.steps.length));
      created=true;
    }

    for(var si=idx+1;si<tk.steps.length;si++){
      var fs=safeStepV75(tk.steps[si],si);
      try{
        if(typeof _stepHasMovementForV14==="function" && _stepHasMovementForV14(fs,mp.playerId))break;
      }catch(e){}
      setPosV75(fs,mp.playerId,ep);
      tk.steps[si]=fs;
    }
  });

  return created;
}

function getVisibleMovementPathsV75(){
  // currentSnap ska normalt innehålla movementPaths, men läs även den globala listan
  // eftersom rörelsebanan annars kan tappas precis efter ritning.
  return normalizeMovementV75(movementPaths||[]);
}

function saveCurrentStepV75(opts){
  opts=opts||{};
  if(editingTaktikIdx===null)return {created:false};
  if(isPresentModeV75())return {created:false};
  if(isReadonlyV75())return {created:false};

  var tk=normalizeTaktikV75(currentTaktikV75());
  if(!tk||!tk.steps||!tk.steps[editingStepIdx])return {created:false};

  var oldStep=cloneV75(tk.steps[editingStepIdx]);
  var snap=safeStepV75(currentSnap(),editingStepIdx);
  var inp=document.getElementById("edit-step-name-inp");
  var lbl=inp?inp.value.trim():"";
  if(lbl)snap.label=lbl;

  // Viktig fix: rörelsebanor sparas explicit som en lista av hela banor.
  snap.movementPaths=getVisibleMovementPathsV75();

  var isLast=editingStepIdx>=tk.steps.length-1;
  var allowCreate=!!opts.allowAutoCreate && (typeof v74CanvasEditArmed==="undefined" || v74CanvasEditArmed===true);
  var created=false;
  var pChanged=posChangedV75(oldStep,snap);
  var mChanged=movementChangedV75(oldStep,snap);

  if(isLast && allowCreate && pChanged && !mChanged){
    // Manuell flytt på sista steget: lägg till ETT målsteg.
    var newStep=safeStepV75(cloneV75(snap),tk.steps.length);
    newStep.movementPaths=[];
    tk.steps[editingStepIdx]=oldStep;
    tk.steps.push(newStep);
    editingStepIdx=tk.steps.length-1;
    created=true;
  }else{
    try{
      if(typeof propagateManualStepPositionsV14==="function" && !mChanged){
        propagateManualStepPositionsV14(tk,editingStepIdx,oldStep,snap);
      }
    }catch(e){}
    tk.steps[editingStepIdx]=snap;
    if(mChanged){
      created=applyMovementEndpointV75(tk,editingStepIdx,snap,isLast && allowCreate);
    }
  }

  normalizeTaktikV75(tk);
  if(playback)playback.tk=tk;
  try{if(typeof v74CanvasEditArmed!=="undefined")v74CanvasEditArmed=false;}catch(e){}
  try{taktikDirtyV17=true;}catch(e){}
  return {created:created};
}

// Ersätt alla tidigare save-funktioner för steg.
saveCurrentStepV75=saveCurrentStepV75;
saveCurrentStepV74=saveCurrentStepV75;
saveCurrentStepV73=saveCurrentStepV75;
saveCurrentStepV70=saveCurrentStepV75;

function setStepUiV75(targetIdx,animate){
  var tk=normalizeTaktikV75(currentTaktikV75());
  if(!tk||!tk.steps)return;
  targetIdx=Math.max(0,Math.min(targetIdx,tk.steps.length-1));

  if(!isPresentModeV75() && !isReadonlyV75()){
    saveCurrentStepV75({allowAutoCreate:false});
  }

  editingStepIdx=targetIdx;
  movementPaths=[];
  selectedId=null;

  if(playback)playback.tk=tk;

  if(animate && playback && typeof animateToStep==="function"){
    playback.stepIndex=targetIdx;
    animateToStep(targetIdx);
  }else{
    if(playback)playback.stepIndex=targetIdx;
    restoreSnap(safeStepV75(tk.steps[targetIdx],targetIdx));
    render();
  }

  try{
    if(typeof updateEditStepUI_silent==="function")updateEditStepUI_silent();
    else if(typeof updateEditStepUI==="function")updateEditStepUI();
  }catch(e){}
}

goToStepV75=function(idx,opts){setStepUiV75(idx,!(opts&&opts.animate===false));};
goToStepV74=goToStepV75;
goToStepV73=goToStepV75;
goToStepV72=goToStepV75;
goToStepV71=goToStepV75;
goToStepV70=goToStepV75;
goToEditStepV16=function(idx){goToStepV75(idx,{animate:false});};

function safeUpdateUiV75(silent){
  var tk=normalizeTaktikV75(currentTaktikV75());
  if(!tk||!tk.steps)return;

  if(editingStepIdx<0)editingStepIdx=0;
  if(editingStepIdx>=tk.steps.length)editingStepIdx=tk.steps.length-1;

  var s=safeStepV75(tk.steps[editingStepIdx],editingStepIdx);
  tk.steps[editingStepIdx]=s;

  movementPaths=normalizeMovementV75(s.movementPaths).map(function(m){
    return {id:m.id,playerId:m.playerId,pts:m.pts.map(function(p){return{x:p.x,y:p.y};})};
  });

  var total=tk.steps.length-1;
  var c=document.getElementById("edit-step-counter");
  if(c)c.textContent=editingStepIdx===0?"Start":(editingStepIdx+"/"+total);

  var inp=document.getElementById("edit-step-name-inp");
  if(inp)inp.value=s.label||labelV75(editingStepIdx);

  ["btn-edit-step-prev","btn-prev","fs-prev-btn","ls-prev-btn"].forEach(function(id){
    var b=document.getElementById(id);if(b){b.disabled=editingStepIdx<=0;b.style.opacity=editingStepIdx>0?"1":"0.3";}
  });
  ["btn-edit-step-next","btn-next","fs-next-btn","ls-next-btn"].forEach(function(id){
    var b=document.getElementById(id);if(b){b.disabled=editingStepIdx>=total;b.style.opacity=editingStepIdx<total?"1":"0.3";}
  });

  if(!silent){
    restoreSnap(s);
    render();
  }
  try{renderEditSteps(tk);}catch(e){}
}

updateEditStepUI=function(){safeUpdateUiV75(false);};
updateEditStepUI_silent=function(){safeUpdateUiV75(true);};

var _startPlayback_v75=typeof startPlayback==="function"?startPlayback:null;
if(_startPlayback_v75){
  startPlayback=function(idx){
    var tk=taktikFilmer && taktikFilmer[idx] ? taktikFilmer[idx] : null;
    normalizeTaktikV75(tk);
    return _startPlayback_v75.apply(this,arguments);
  };
}

function bindV75(id,handler){
  var old=document.getElementById(id);
  if(!old)return;
  var neu=old.cloneNode(true);
  neu.dataset.v75Bound="1";
  old.parentNode.replaceChild(neu,old);
  neu.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    handler(e);
    return false;
  },true);
}

function bindControlsV75(){
  bindV75("btn-edit-step-prev",function(){goToStepV75(editingStepIdx-1,{animate:false});});
  bindV75("btn-edit-step-next",function(){goToStepV75(editingStepIdx+1,{animate:false});});
  bindV75("btn-prev",function(){goToStepV75(editingStepIdx-1,{animate:true});});
  bindV75("btn-next",function(){goToStepV75(editingStepIdx+1,{animate:true});});
  bindV75("btn-first",function(){goToStepV75(0,{animate:true});});
  bindV75("fs-prev-btn",function(){goToStepV75(editingStepIdx-1,{animate:true});});
  bindV75("fs-next-btn",function(){goToStepV75(editingStepIdx+1,{animate:true});});
  bindV75("fs-first-btn",function(){goToStepV75(0,{animate:true});});
}

bindControlsV75();
setTimeout(bindControlsV75,500);
setTimeout(bindControlsV75,1500);

/* === slut v75-movement-safe-step === */


/* === v76-clean-taktik-core: samlad kärna för taktikläge ===
   Mål:
   - En väg för stegbyte
   - En väg för intern stegautosave
   - En väg för filmsparning
   - Fullscreen/landscape = presentationsläge med tillfälliga ritningar
   - Vanlig vy = redigeringsläge
   - Skrivskydd styrs från ett ställe
*/

var ttV76 = {
  savedSnapshot: null,
  activeIdx: null,
  readonly: false,
  lastSaveAt: 0,
  lastEditAt: 0,
  pointerArmed: false,
  suppressDirty: false,
  binding: false
};

function tt76Clone(o){
  try{return JSON.parse(JSON.stringify(o));}catch(e){return o;}
}

function tt76IsPresentation(){
  return document.body.classList.contains("fullscreen-portrait") ||
         document.body.classList.contains("landscape");
}

function tt76Current(){
  try{
    if(editingTaktikIdx===null || typeof editingTaktikIdx==="undefined")return null;
    return taktikFilmer && taktikFilmer[editingTaktikIdx] ? taktikFilmer[editingTaktikIdx] : null;
  }catch(e){return null;}
}

function tt76Label(i){
  return i===0 ? "Startläge" : "Steg "+i;
}

function tt76IsAutoLabel(v){
  var s=String(v||"").trim();
  return !s || s==="Start" || s==="Startläge" || /^Steg\s+\d+$/i.test(s);
}

function tt76Array(x){
  return Array.isArray(x) ? x : [];
}

function tt76NormalizeMovement(list){
  return tt76Array(list).map(function(m){
    if(!m)return null;
    var pts=tt76Array(m.pts).map(function(p){
      return {x:Number(p&&p.x)||0,y:Number(p&&p.y)||0};
    }).filter(function(p){return isFinite(p.x)&&isFinite(p.y);});
    if(!m.playerId || pts.length<2)return null;
    return {
      id:m.id || ("mv"+(idCounter++)),
      playerId:m.playerId,
      pts:pts
    };
  }).filter(Boolean);
}

function tt76SafeStep(step,idx){
  step=step||{};
  if(!Array.isArray(step.players)){
    step.players=tt76Clone(players||[]);
  }
  if(!step.ball){
    step.ball=tt76Clone(ball||{x:W/2,y:H/2});
  }
  step.arrows=tt76Array(step.arrows);
  step.labels=tt76Array(step.labels);
  step.freehandPaths=tt76Array(step.freehandPaths);
  step.zones=tt76Array(step.zones);
  step.movementPaths=tt76NormalizeMovement(step.movementPaths || step.movementpaths || []);
  if(tt76IsAutoLabel(step.label))step.label=tt76Label(idx||0);
  return step;
}

function tt76NormalizeFilm(tk){
  if(!tk)return tk;
  if(!Array.isArray(tk.steps))tk.steps=[];
  if(!tk.steps.length){
    var s=currentSnap();
    s.label="Startläge";
    tk.steps=[s];
  }
  for(var i=0;i<tk.steps.length;i++){
    tk.steps[i]=tt76SafeStep(tk.steps[i],i);
  }
  return tk;
}

function tt76IsOwner(tk){
  try{
    if(typeof isMineV10==="function")return !!isMineV10(tk);
  }catch(e){}
  try{
    if(typeof isOwnerV68==="function")return !!isOwnerV68(tk);
  }catch(e){}
  return true;
}

function tt76IsReadOnly(tk){
  tk=tk||tt76Current();
  if(!tk)return false;
  if(tk._readOnly)return true;
  try{
    if(typeof isReadOnlyFileV10==="function")return !!isReadOnlyFileV10(tk);
  }catch(e){}
  return !tt76IsOwner(tk);
}

function tt76UpdateReadOnlyUi(){
  var tk=tt76Current();
  var ro=tt76IsReadOnly(tk);
  ttV76.readonly=ro;
  document.body.classList.toggle("tt-v76-readonly",!!ro);
  var inp=document.getElementById("edit-step-name-inp");
  if(inp)inp.disabled=!!ro;
  if(ro && mode==="movement"){
    try{setMode("move");}catch(e){}
  }
}

function tt76Snapshot(){
  var s=currentSnap();
  // currentSnap brukar fånga movementPaths, men sätt explicit för säkerhets skull.
  s.movementPaths=tt76NormalizeMovement(movementPaths||[]);
  var inp=document.getElementById("edit-step-name-inp");
  var lbl=inp?inp.value.trim():"";
  if(lbl)s.label=lbl;
  return tt76SafeStep(s,editingStepIdx||0);
}

function tt76SetPos(step,id,pos){
  if(!step||!pos)return;
  if(id==="ball"){
    if(!step.ball)step.ball={x:pos.x,y:pos.y};
    step.ball.x=pos.x;step.ball.y=pos.y;
    return;
  }
  var p=(step.players||[]).find(function(x){return x.id===id;});
  if(p){p.x=pos.x;p.y=pos.y;}
}

function tt76PosMap(step){
  var m={};
  step=tt76SafeStep(tt76Clone(step||{}),0);
  (step.players||[]).forEach(function(p){m[p.id]={x:p.x,y:p.y};});
  if(step.ball)m.ball={x:step.ball.x,y:step.ball.y};
  return m;
}

function tt76PositionsChanged(a,b){
  var ma=tt76PosMap(a),mb=tt76PosMap(b),keys={};
  Object.keys(ma).forEach(function(k){keys[k]=true;});
  Object.keys(mb).forEach(function(k){keys[k]=true;});
  return Object.keys(keys).some(function(k){
    if(!ma[k]||!mb[k])return true;
    var dx=(ma[k].x||0)-(mb[k].x||0);
    var dy=(ma[k].y||0)-(mb[k].y||0);
    return dx*dx+dy*dy>1;
  });
}

function tt76MovementChanged(a,b){
  try{
    return JSON.stringify(tt76NormalizeMovement((a&&a.movementPaths)||[])) !==
           JSON.stringify(tt76NormalizeMovement((b&&b.movementPaths)||[]));
  }catch(e){return false;}
}

function tt76ApplyMovementEndpoints(tk,idx,snap,allowCreate){
  var created=false;
  snap.movementPaths=tt76NormalizeMovement(snap.movementPaths);
  snap.movementPaths.forEach(function(mp){
    var ep=mp.pts[mp.pts.length-1];

    if(idx>=tk.steps.length-1 && allowCreate){
      var next=tt76SafeStep(tt76Clone(snap),tk.steps.length);
      next.movementPaths=[];
      next.label=tt76Label(tk.steps.length);
      tt76SetPos(next,mp.playerId,ep);
      tk.steps.push(next);
      created=true;
    }

    for(var si=idx+1;si<tk.steps.length;si++){
      var fs=tt76SafeStep(tk.steps[si],si);
      if(fs.movementPaths && fs.movementPaths.some(function(x){return x.playerId===mp.playerId;}))break;
      tt76SetPos(fs,mp.playerId,ep);
      tk.steps[si]=fs;
    }
  });
  return created;
}

function tt76MarkDirty(){
  if(ttV76.suppressDirty)return;
  try{taktikDirtyV17=true;}catch(e){}
}

function tt76SaveCurrentStep(opts){
  opts=opts||{};
  var tk=tt76NormalizeFilm(tt76Current());
  if(!tk||editingStepIdx===null || typeof editingStepIdx==="undefined")return {created:false};
  if(tt76IsPresentation())return {created:false};
  if(tt76IsReadOnly(tk))return {created:false};

  if(editingStepIdx<0)editingStepIdx=0;
  if(editingStepIdx>=tk.steps.length)editingStepIdx=tk.steps.length-1;

  var oldStep=tt76SafeStep(tt76Clone(tk.steps[editingStepIdx]),editingStepIdx);
  var snap=tt76Snapshot();

  if(tt76IsAutoLabel(snap.label))snap.label=tt76Label(editingStepIdx);

  var isLast=editingStepIdx>=tk.steps.length-1;
  var allowCreate=!!opts.allowAutoCreate && ttV76.pointerArmed && (Date.now()-ttV76.lastEditAt<2500);
  var posChanged=tt76PositionsChanged(oldStep,snap);
  var movChanged=tt76MovementChanged(oldStep,snap);
  var created=false;

  if(isLast && allowCreate && posChanged && !movChanged){
    // Flytt på sista steget: gamla steget är start, nytt steg är mål.
    var newStep=tt76SafeStep(tt76Clone(snap),tk.steps.length);
    newStep.movementPaths=[];
    newStep.label=tt76Label(tk.steps.length);
    tk.steps[editingStepIdx]=oldStep;
    tk.steps.push(newStep);
    editingStepIdx=tk.steps.length-1;
    created=true;
  }else{
    tk.steps[editingStepIdx]=snap;
    if(movChanged){
      created=tt76ApplyMovementEndpoints(tk,editingStepIdx,snap,isLast && allowCreate);
    }
  }

  ttV76.pointerArmed=false;
  tt76NormalizeFilm(tk);
  if(playback)playback.tk=tk;
  tt76MarkDirty();
  return {created:created};
}

function tt76UpdateCounters(){
  var tk=tt76NormalizeFilm(tt76Current());
  if(!tk||!tk.steps)return;
  var total=Math.max(0,tk.steps.length-1);
  var cur=Math.max(0,Math.min(editingStepIdx||0,total));

  var text=cur===0?"Start":cur+"/"+total;
  var edit=document.getElementById("edit-step-counter");
  if(edit)edit.textContent=text;
  var play=document.getElementById("play-counter");
  if(play)play.textContent=text;
  var fs=document.getElementById("fs-step-label");
  if(fs)fs.textContent=text;
  var ls=document.getElementById("ls-step-label");
  if(ls)ls.textContent=(tk.name||"")+"  "+text;
  var side=document.getElementById("ls-side-label");
  if(side)side.textContent=tk.name||"";

  ["btn-prev","btn-edit-step-prev","fs-prev-btn","ls-prev-btn","btn-first","fs-first-btn","ls-first-btn"].forEach(function(id){
    var b=document.getElementById(id);
    if(b){b.disabled=cur<=0;b.style.opacity=cur>0?"1":"0.3";}
  });
  ["btn-next","btn-edit-step-next","fs-next-btn","ls-next-btn"].forEach(function(id){
    var b=document.getElementById(id);
    if(b){b.disabled=cur>=total;b.style.opacity=cur<total?"1":"0.3";}
  });
}

function tt76RenderStepList(tk){
  tk=tt76NormalizeFilm(tk||tt76Current());
  var list=document.getElementById("edit-taktik-steps");
  if(!list||!tk)return;
  list.innerHTML="";
  for(var i=0;i<tk.steps.length;i++){
    (function(idx){
      var s=tt76SafeStep(tk.steps[idx],idx);
      var row=document.createElement("div");
      row.className="row"+(idx===editingStepIdx?" on":"");
      row.dataset.idx=idx;
      row.style.cursor="pointer";

      var num=document.createElement("span");
      num.style.cssText="font-weight:900;font-size:0.85rem;color:#4ae87a;min-width:20px";
      num.textContent=idx===0?"►":String(idx);

      var name=document.createElement("input");
      name.type="text";
      name.value=s.label||tt76Label(idx);
      name.disabled=tt76IsReadOnly(tk);
      name.style.cssText="flex:1;background:#111a14;color:#edf5ee;border:1px solid #2d4a35;border-radius:4px;padding:3px 6px;font-size:0.78rem";
      name.addEventListener("input",function(){
        if(tt76IsReadOnly(tk))return;
        s.label=name.value.trim()||tt76Label(idx);
        tt76MarkDirty();
      },true);

      var del=document.createElement("button");
      del.className="sa del";
      del.textContent="×";
      del.style.display=(idx===0||tt76IsReadOnly(tk))?"none":"";
      del.addEventListener("click",function(e){
        e.stopPropagation();
        if(tt76IsReadOnly(tk))return;
        tk.steps.splice(idx,1);
        editingStepIdx=Math.max(0,Math.min(editingStepIdx,tk.steps.length-1));
        tt76NormalizeFilm(tk);
        tt76LoadStep(editingStepIdx,{animate:false,skipSave:true});
        tt76MarkDirty();
      },true);

      row.addEventListener("click",function(e){
        if(e.target.tagName==="BUTTON"||e.target.tagName==="INPUT")return;
        tt76LoadStep(idx,{animate:false});
      },true);

      row.appendChild(num);
      row.appendChild(name);
      row.appendChild(del);
      list.appendChild(row);
    })(i);
  }
}

function tt76LoadStep(targetIdx,opts){
  opts=opts||{};
  var tk=tt76NormalizeFilm(tt76Current());
  if(!tk||!tk.steps)return;

  if(!opts.skipSave && !tt76IsPresentation() && !tt76IsReadOnly(tk)){
    tt76SaveCurrentStep({allowAutoCreate:false});
  }

  tt76NormalizeFilm(tk);
  targetIdx=Math.max(0,Math.min(targetIdx,tk.steps.length-1));
  var oldIdx=editingStepIdx;
  editingStepIdx=targetIdx;
  selectedId=null;
  movementPaths=[];

  if(playback){
    playback.tk=tk;
    playback.stepIndex=targetIdx;
  }

  if(opts.animate && playback && typeof animateToStep==="function" && oldIdx!==targetIdx){
    animateToStep(targetIdx);
  }else{
    restoreSnap(tt76SafeStep(tk.steps[targetIdx],targetIdx));
    render();
    if(playback && typeof updatePlaybar==="function"){
      try{updatePlaybar();}catch(e){}
    }
  }

  var inp=document.getElementById("edit-step-name-inp");
  if(inp)inp.value=tk.steps[targetIdx].label||tt76Label(targetIdx);

  tt76RenderStepList(tk);
  tt76UpdateCounters();
  tt76UpdateReadOnlyUi();
}

function tt76UpdateEditUI(){
  var tk=tt76NormalizeFilm(tt76Current());
  if(!tk)return;
  if(editingStepIdx<0)editingStepIdx=0;
  if(editingStepIdx>=tk.steps.length)editingStepIdx=tk.steps.length-1;
  var s=tt76SafeStep(tk.steps[editingStepIdx],editingStepIdx);
  movementPaths=tt76NormalizeMovement(s.movementPaths).map(function(m){
    return {id:m.id,playerId:m.playerId,pts:m.pts.map(function(p){return{x:p.x,y:p.y};})};
  });
  var inp=document.getElementById("edit-step-name-inp");
  if(inp)inp.value=s.label||tt76Label(editingStepIdx);
  tt76RenderStepList(tk);
  tt76UpdateCounters();
  tt76UpdateReadOnlyUi();
}

updateEditStepUI=function(){
  var tk=tt76NormalizeFilm(tt76Current());
  if(!tk)return;
  restoreSnap(tt76SafeStep(tk.steps[editingStepIdx],editingStepIdx));
  render();
  tt76UpdateEditUI();
};

updateEditStepUI_silent=function(){
  tt76UpdateEditUI();
};

renderEditSteps=function(tk){
  tt76RenderStepList(tk||tt76Current());
};

function tt76NormalizeForCompare(tk){
  try{
    var c=tt76Clone(tt76NormalizeFilm(tt76Clone(tk||{})));
    delete c._readOnly;delete c._isDraft;delete c._meta;delete c.meta;delete c.dbId;
    return JSON.stringify(c);
  }catch(e){return "";}
}

function tt76ForceClean(tk){
  tk=tk||tt76Current();
  ttV76.savedSnapshot=tt76NormalizeForCompare(tk);
  try{savedTaktikSnapshotV21=ttV76.savedSnapshot;}catch(e){}
  try{taktikDirtyV17=false;}catch(e){}
  try{window.taktikDirtyV17=false;}catch(e){}
  ttV76.lastSaveAt=Date.now();
}

function tt76HasUnsaved(){
  var tk=tt76Current();
  if(!tk)return false;
  if(tt76IsReadOnly(tk))return false;
  if(Date.now()-ttV76.lastSaveAt<4000)return false;
  if(!tt76IsPresentation()){
    tt76SaveCurrentStep({allowAutoCreate:false});
  }
  var now=tt76NormalizeForCompare(tk);
  if(ttV76.savedSnapshot===null){
    ttV76.savedSnapshot=now;
    return false;
  }
  return now!==ttV76.savedSnapshot;
}

hasUnsavedTaktikChangesV21=tt76HasUnsaved;
confirmUnsavedV21=function(){
  if(!tt76HasUnsaved())return true;
  return confirm("Du har osparade ändringar i taktiken. Vill du lämna utan att spara?");
};
confirmUnsavedV19=confirmUnsavedV21;
confirmUnsavedTaktikV18=confirmUnsavedV21;
confirmDiscardUnsavedV17=confirmUnsavedV21;
confirmUnsavedUnifiedV23=confirmUnsavedV21;

function tt76SaveFilm(){
  var tk=tt76NormalizeFilm(tt76Current());
  if(!tk)return;
  if(tt76IsReadOnly(tk)){
    showToast("Filen är skrivskyddad. Kopiera den först.",false);
    return;
  }
  tt76SaveCurrentStep({allowAutoCreate:false});
  tk=tt76NormalizeFilm(tt76Current());
  tt76ForceClean(tk);
  try{cloudSaveTaktik(tk);}catch(e){console.error(e);}
  tt76ForceClean(tk);
  setTimeout(function(){tt76ForceClean(tk);},300);
  setTimeout(function(){tt76ForceClean(tk);},1200);
  showToast("Film sparad!");
  cloudStatus("✅ Film sparad","#4ae87a");
}

saveFilmV74=tt76SaveFilm;
saveFilmV73=tt76SaveFilm;
saveFilmV71=tt76SaveFilm;
saveFilmV70=tt76SaveFilm;
saveWholeFilmV69=tt76SaveFilm;
saveCurrentTaktikFileV67=tt76SaveFilm;
saveCurrentTaktikFileV20=tt76SaveFilm;
saveCurrentTaktikFileV21=tt76SaveFilm;
saveCurrentTaktikFileV23=tt76SaveFilm;

function tt76ClearPresentationDrawings(){
  arrows=[];
  labels=[];
  freehandPaths=[];
  zones=[];
  movementPaths=[];
  selectedId=null;
  arrowStart=null;arrowCurrent=null;
  freehandCurrent=null;freehandDrawing=false;
  zoneStart=null;zonePreview=null;
  movementCurrent=null;
  render();
  showToast("Tillfälliga ritningar rensade");
}

function tt76BindButton(id,handler){
  var old=document.getElementById(id);
  if(!old)return;
  var neu=old.cloneNode(true);
  neu.dataset.v76Bound="1";
  old.parentNode.replaceChild(neu,old);
  neu.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    handler(e);
    return false;
  },true);
}

function tt76BindControls(){
  if(ttV76.binding)return;
  ttV76.binding=true;
  try{
    tt76BindButton("btn-edit-step-prev",function(){tt76LoadStep((editingStepIdx||0)-1,{animate:false});});
    tt76BindButton("btn-edit-step-next",function(){tt76LoadStep((editingStepIdx||0)+1,{animate:false});});

    tt76BindButton("btn-prev",function(){tt76LoadStep((editingStepIdx||0)-1,{animate:true});});
    tt76BindButton("btn-next",function(){tt76LoadStep((editingStepIdx||0)+1,{animate:true});});
    tt76BindButton("btn-first",function(){tt76LoadStep(0,{animate:true});});

    tt76BindButton("fs-prev-btn",function(){tt76LoadStep((editingStepIdx||0)-1,{animate:true});});
    tt76BindButton("fs-next-btn",function(){tt76LoadStep((editingStepIdx||0)+1,{animate:true});});
    tt76BindButton("fs-first-btn",function(){tt76LoadStep(0,{animate:true});});

    tt76BindButton("ls-prev-btn",function(){tt76LoadStep((editingStepIdx||0)-1,{animate:true});});
    tt76BindButton("ls-next-btn",function(){tt76LoadStep((editingStepIdx||0)+1,{animate:true});});
    tt76BindButton("ls-first-btn",function(){tt76LoadStep(0,{animate:true});});

    tt76BindButton("btn-edit-add-step",function(){
      var tk=tt76NormalizeFilm(tt76Current());
      if(!tk||tt76IsReadOnly(tk))return;
      tt76SaveCurrentStep({allowAutoCreate:false});
      var snap=tt76Snapshot();
      snap.movementPaths=[];
      snap.label=tt76Label((editingStepIdx||0)+1);
      tk.steps.splice((editingStepIdx||0)+1,0,snap);
      editingStepIdx++;
      tt76NormalizeFilm(tk);
      tt76LoadStep(editingStepIdx,{animate:false,skipSave:true});
      tt76MarkDirty();
    });

    tt76BindButton("btn-edit-del-step",function(){
      var tk=tt76NormalizeFilm(tt76Current());
      if(!tk||tt76IsReadOnly(tk)||editingStepIdx===0)return;
      tk.steps.splice(editingStepIdx,1);
      editingStepIdx=Math.max(0,Math.min(editingStepIdx,tk.steps.length-1));
      tt76NormalizeFilm(tk);
      tt76LoadStep(editingStepIdx,{animate:false,skipSave:true});
      tt76MarkDirty();
    });

    tt76BindButton("btn-edit-taktik-save",tt76SaveFilm);

    tt76BindButton("btn-edit-taktik-exit",function(){
      if(!confirmUnsavedV21())return;
      tt76ForceClean();
      movementPaths=[];selectedId=null;editingTaktikIdx=null;editingStepIdx=0;isEditingTaktik=false;
      document.body.classList.remove("tt-v76-readonly");
      var ui=document.getElementById("edit-taktik-ui");if(ui)ui.style.display="none";
      var no=document.getElementById("no-rec-ui");if(no)no.style.display="block";
      if(typeof renderTaktikList==="function")renderTaktikList();
    });

    tt76BindButton("btn-stop-play",function(){
      if(!confirmUnsavedV21())return;
      tt76ForceClean();
      if(animFrame)cancelAnimationFrame(animFrame);
      playback=null;movementPaths=[];selectedId=null;
      document.body.classList.remove("tt-v76-readonly");
      var tb=document.getElementById("taktikbar");if(tb)tb.style.display="none";
      var bp=document.getElementById("bottompanel");if(bp)bp.classList.remove("hidden");
      editingTaktikIdx=null;editingStepIdx=0;isEditingTaktik=false;
      var ui=document.getElementById("edit-taktik-ui");if(ui)ui.style.display="none";
      var no=document.getElementById("no-rec-ui");if(no)no.style.display="block";
      render();
      if(typeof renderTaktikList==="function")renderTaktikList();
    });

    var clear=document.getElementById("fs-tb-clear");
    if(clear){
      tt76BindButton("fs-tb-clear",function(){
        if(tt76IsPresentation())tt76ClearPresentationDrawings();
        else if(typeof clearCoachboardToFormation==="function")clearCoachboardToFormation();
        else tt76ClearPresentationDrawings();
      });
    }
  }finally{
    ttV76.binding=false;
  }
}

// Stoppa äldre aggressiva autostegs-hooks.
maybeAutoCreateAfterEditV70=function(){};
goToStepV75=function(idx,opts){tt76LoadStep(idx,{animate:!(opts&&opts.animate===false)});};
goToStepV74=goToStepV75;
goToStepV73=goToStepV75;
goToStepV72=goToStepV75;
goToStepV71=goToStepV75;
goToStepV70=goToStepV75;
goToStepV69=goToStepV75;
goToEditStepV16=function(idx){tt76LoadStep(idx,{animate:false});};

var _tt76_startPlayback_base=typeof startPlayback==="function"?startPlayback:null;
if(_tt76_startPlayback_base){
  startPlayback=function(idx){
    var tk=taktikFilmer && taktikFilmer[idx] ? taktikFilmer[idx] : null;
    tt76NormalizeFilm(tk);
    var ro=tt76IsReadOnly(tk);
    if(tk)tk._readOnly=!!ro;

    var r=_tt76_startPlayback_base.apply(this,arguments);

    editingTaktikIdx=idx;
    editingStepIdx=0;
    tt76NormalizeFilm(tt76Current());
    tt76ForceClean(tt76Current());
    tt76UpdateReadOnlyUi();
    tt76RenderStepList(tt76Current());
    tt76UpdateCounters();
    tt76BindControls();

    if(ro)showToast("Öppnad skrivskyddat – kopiera för att redigera");
    return r;
  };
}

var _tt76_setupFs_base=typeof setupFullscreenPortraitToolbar==="function"?setupFullscreenPortraitToolbar:null;
if(_tt76_setupFs_base){
  setupFullscreenPortraitToolbar=function(){
    var r=_tt76_setupFs_base.apply(this,arguments);
    tt76BindControls();
    var mv=document.getElementById("fs-tb-movement");
    if(mv)mv.style.display="none";
    return r;
  };
}

var _tt76_setMode_base=typeof setMode==="function"?setMode:null;
if(_tt76_setMode_base){
  setMode=function(m){
    if(tt76IsPresentation() && m==="movement")m="move";
    if(tt76IsReadOnly(tt76Current()) && m==="movement")m="move";
    var r=_tt76_setMode_base.apply(this,[m]);
    return r;
  };
}

(function(){
  var pitch=document.getElementById("pitch-svg");
  if(pitch && !pitch.dataset.ttV76Pointer){
    pitch.dataset.ttV76Pointer="1";
    ["mousedown","touchstart"].forEach(function(evt){
      pitch.addEventListener(evt,function(){
        if(editingTaktikIdx===null)return;
        if(tt76IsPresentation())return;
        if(tt76IsReadOnly(tt76Current()))return;
        ttV76.pointerArmed=true;
        ttV76.lastEditAt=Date.now();
      },true);
    });
    ["mouseup","touchend"].forEach(function(evt){
      pitch.addEventListener(evt,function(){
        if(editingTaktikIdx===null)return;
        if(tt76IsPresentation())return;
        if(tt76IsReadOnly(tt76Current()))return;
        setTimeout(function(){
          var res=tt76SaveCurrentStep({allowAutoCreate:true});
          if(res && res.created){
            tt76LoadStep(editingStepIdx,{animate:false,skipSave:true});
          }else{
            tt76UpdateEditUI();
          }
        },120);
      },true);
    });
  }
})();

tt76BindControls();
setTimeout(tt76BindControls,500);
setTimeout(tt76BindControls,1500);

/* === slut v76-clean-taktik-core === */


/* === v78-safe-copy-display-fix: smal fix för öga + kopiering till Mina ===
   Byggd från v76 clean. Ersätter inte renderlogiken brett.
   Problem: efter kopiering från Lagets kunde vyn stå kvar i Lagets/filterläge,
   så Mina såg tomt ut tills appen startades om.
*/

function tt78Meta(obj){
  try{
    if(typeof fileMetaV10==="function")return fileMetaV10(obj)||{};
  }catch(e){}
  return (obj&&obj._meta)||{};
}

function tt78IsMine(obj){
  try{
    if(typeof isMineV10==="function")return !!isMineV10(obj);
  }catch(e){}
  try{
    if(typeof tt76IsOwner==="function")return !!tt76IsOwner(obj);
  }catch(e){}
  var m=tt78Meta(obj);
  if(!m.ownerId&&!m.ownerName)return true;
  return false;
}

function tt78IsReadonly(obj){
  try{
    if(typeof tt76IsReadOnly==="function")return !!tt76IsReadOnly(obj);
  }catch(e){}
  try{
    if(typeof isReadOnlyFileV10==="function")return !!isReadOnlyFileV10(obj);
  }catch(e){}
  return !tt78IsMine(obj);
}

function tt78AfterCopyShowMine(){
  try{taktikScope="mine";}catch(e){}
  try{currentTaktikFolder="Alla";}catch(e){}
  try{
    var search=document.getElementById("taktik-search");
    if(search)search.value="";
    taktikSearch="";
  }catch(e){}
  try{renderTaktikList();}catch(e){}
}

function tt78PrepareCopyAsMine(tk){
  var copy=JSON.parse(JSON.stringify(tk||{}));
  delete copy.dbId;
  delete copy.id;
  delete copy._readOnly;
  delete copy._isDraft;
  copy.name="Kopia av "+(copy.name||"taktikfilm");
  copy.folder=copy.folder||"Taktik";

  // Kopian ska bli min egen och inte delad.
  if(copy._meta)delete copy._meta;
  if(typeof addMetaToData==="function"){
    copy=addMetaToData(copy);
  }else if(typeof updateShareMetaV10==="function"){
    copy=updateShareMetaV10(copy,false,false);
  }

  if(copy._meta){
    copy._meta.sharedWithTeam=false;
    copy._meta.teamCanEdit=false;
    copy._meta.updatedAt=new Date().toISOString();
  }

  return copy;
}

function tt78CopyTaktikToMine(tk){
  if(!tk||!tk.steps||tk.steps.length<2){
    showToast("Kan inte kopiera tom film",false);
    return;
  }

  var copy=tt78PrepareCopyAsMine(tk);

  // Lägg in lokalt direkt så användaren ser den utan app-omstart.
  taktikFilmer=(taktikFilmer||[]).concat([copy]);
  tt78AfterCopyShowMine();

  try{
    cloudSaveTaktik(copy);
  }catch(e){
    console.error(e);
    showToast("Kunde inte kopiera film",false);
    return;
  }

  showToast("Kopia skapad i Mina");

  // Ladda om i Mina-läge. Viktigt: sätt scope före cloudLoadTaktik,
  // eftersom befintlig loader filtrerar efter aktiv flik.
  setTimeout(function(){
    tt78AfterCopyShowMine();
    try{cloudLoadTaktik();}catch(e){}
  },700);
}

copyTaktikToMineV10=tt78CopyTaktikToMine;
duplicateTaktik=function(idx){
  var tk=(taktikFilmer||[])[idx];
  tt78CopyTaktikToMine(tk);
};

function tt78PatchReadonlyEyeIcons(){
  try{
    var rows=document.querySelectorAll("#taktik-list .row");
    Array.prototype.slice.call(rows).forEach(function(row){
      var nm=row.querySelector(".row-name");
      if(!nm)return;
      var name=String(nm.textContent||"").trim();

      var candidates=(taktikFilmer||[]).filter(function(tk){
        return String(tk.name||"").trim()===name;
      });
      var tk=candidates.find(function(x){return tt78IsReadonly(x);}) || candidates[0];
      if(!tk||!tt78IsReadonly(tk))return;

      var buttons=Array.prototype.slice.call(row.querySelectorAll("button.sa"));
      var play=buttons.find(function(b){
        return b.classList.contains("play") || b.textContent==="✎" || b.title==="Redigera";
      });
      if(!play)return;

      play.textContent="👁";
      play.title="Visa";
      play.setAttribute("aria-label","Visa");
      play.style.color="#7aaa88";
      play.style.borderColor="#7aaa88";
    });
  }catch(e){}
}

if(typeof renderTaktikList==="function"){
  var _renderTaktikList_v78=renderTaktikList;
  renderTaktikList=function(){
    var r=_renderTaktikList_v78.apply(this,arguments);
    setTimeout(tt78PatchReadonlyEyeIcons,0);
    return r;
  };
}

setTimeout(tt78PatchReadonlyEyeIcons,300);

/* === slut v78-safe-copy-display-fix === */


/* === v79-direct-copy-to-mine: kopia från Lagets gör riktig ny POST till Mina === */

function tt79CopyMetaToMine(data){
  var copy=JSON.parse(JSON.stringify(data||{}));

  delete copy.dbId;
  delete copy.id;
  delete copy._readOnly;
  delete copy._isDraft;

  // Tvinga ny ägare/ny metadata för kopian.
  delete copy._meta;
  delete copy.meta;

  if(typeof addMetaToData==="function"){
    copy=addMetaToData(copy);
  }else if(typeof updateShareMetaV10==="function"){
    copy=updateShareMetaV10(copy,false,false);
  }

  if(!copy._meta)copy._meta={};
  var p=null;
  try{
    if(typeof getProfileSafeV10==="function")p=getProfileSafeV10();
    else if(typeof getUserProfile==="function")p=getUserProfile();
  }catch(e){}

  if(p){
    copy._meta.ownerId=p.ownerId;
    copy._meta.ownerName=p.ownerName;
    copy._meta.teamId=p.teamId;
    copy._meta.teamCode=p.teamCode;
    copy._meta.teamName=p.teamName||p.teamCode;
  }

  copy._meta.sharedWithTeam=false;
  copy._meta.teamCanEdit=false;
  copy._meta.updatedAt=new Date().toISOString();

  return copy;
}

function tt79ShowMineAndReload(){
  try{taktikScope="mine";}catch(e){}
  try{currentTaktikFolder="Alla";}catch(e){}
  try{taktikSearch="";}catch(e){}
  try{
    var inp=document.getElementById("taktik-search");
    if(inp)inp.value="";
  }catch(e){}
  try{renderTaktikList();}catch(e){}
  setTimeout(function(){
    try{cloudLoadTaktik();}catch(e){}
  },500);
}

function tt79CopyTaktikToMine(tk){
  if(!tk||!tk.steps||tk.steps.length<2){
    showToast("Kan inte kopiera tom film",false);
    return;
  }

  var copy=tt79CopyMetaToMine(tk);
  copy.name="Kopia av "+(tk.name||"taktikfilm");
  copy.folder=copy.folder||tk.folder||"Taktik";
  if(typeof tt76NormalizeFilm==="function")tt76NormalizeFilm(copy);

  cloudStatus("Skapar kopia...","#7aaa88");

  // Viktigt: använd INTE cloudSaveTaktik här.
  // Den vanliga sparfunktionen kan tolka källfilen/namn/dbId/readOnly fel.
  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{
    method:"POST",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify({
      name:copy.name,
      data:copy,
      type:"taktikfilm",
      folder:copy.folder
    })
  })
  .then(function(r){return r.json();})
  .then(function(data){
    if(data&&data[0]&&data[0].id){
      copy.dbId=data[0].id;
      taktikFilmer=(taktikFilmer||[]).concat([copy]);
      showToast("Kopia skapad i Mina");
      cloudStatus("✅ Kopia skapad","#4ae87a");
      tt79ShowMineAndReload();
    }else{
      var msg=(data&&data.message)?data.message:"Kunde inte skapa kopia";
      showToast(msg,false);
      cloudStatus("❌ "+msg,"#e84a4a");
    }
  })
  .catch(function(err){
    showToast("Kunde inte kopiera film",false);
    cloudStatus("❌ "+err.message,"#e84a4a");
  });
}

copyTaktikToMineV10=tt79CopyTaktikToMine;
duplicateTaktik=function(idx){
  var tk=(taktikFilmer||[])[idx];
  tt79CopyTaktikToMine(tk);
};

// Säkra att kopieringsknappen i listan använder rätt objekt även om listan är filtrerad.
function tt79RebindCopyButtons(){
  try{
    var rows=document.querySelectorAll("#taktik-list .row");
    Array.prototype.slice.call(rows).forEach(function(row){
      var nm=row.querySelector(".row-name");
      if(!nm)return;
      var name=String(nm.textContent||"").trim();
      var tk=(taktikFilmer||[]).find(function(x){
        return String(x.name||"").trim()===name;
      });
      if(!tk)return;

      var buttons=Array.prototype.slice.call(row.querySelectorAll("button.sa"));
      var copyBtn=buttons.find(function(b){
        return b.textContent==="⧉" || b.title==="Kopiera";
      });
      if(!copyBtn || copyBtn.dataset.v79CopyBound)return;

      var clone=copyBtn.cloneNode(true);
      clone.dataset.v79CopyBound="1";
      copyBtn.parentNode.replaceChild(clone,copyBtn);
      clone.addEventListener("click",function(e){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation)e.stopImmediatePropagation();
        tt79CopyTaktikToMine(tk);
        return false;
      },true);
    });
  }catch(e){}
}

if(typeof renderTaktikList==="function"){
  var _renderTaktikList_v79=renderTaktikList;
  renderTaktikList=function(){
    var r=_renderTaktikList_v79.apply(this,arguments);
    setTimeout(function(){
      try{if(typeof tt78PatchReadonlyEyeIcons==="function")tt78PatchReadonlyEyeIcons();}catch(e){}
      tt79RebindCopyButtons();
    },0);
    return r;
  };
}

setTimeout(tt79RebindCopyButtons,300);

/* === slut v79-direct-copy-to-mine === */


/* === v82-taktik-library-safe: dölj bara planen i taktikens menyläge ===
   Byggd från v79. Ingen v80/v81-kod.
*/

function tt82OnTaktikPanel(){
  try{
    var p=document.getElementById("panel-taktik");
    return !!(p && p.classList.contains("on"));
  }catch(e){return false;}
}

function tt82InTaktikFilm(){
  try{
    if(editingTaktikIdx!==null && typeof editingTaktikIdx!=="undefined")return true;
  }catch(e){}
  try{if(isEditingTaktik)return true;}catch(e){}
  try{if(playback && playback.tk)return true;}catch(e){}
  return false;
}

function tt82ApplyLibraryMode(){
  var on=tt82OnTaktikPanel() && !tt82InTaktikFilm() &&
         !document.body.classList.contains("fullscreen-portrait") &&
         !document.body.classList.contains("landscape");
  document.body.classList.toggle("tt-v82-taktik-library",!!on);
}

function tt82EnterFilmMode(){
  document.body.classList.remove("tt-v82-taktik-library");
}

function tt82ReturnToTaktikMenu(){
  try{if(animFrame)cancelAnimationFrame(animFrame);}catch(e){}
  try{playback=null;}catch(e){}
  try{editingTaktikIdx=null;}catch(e){}
  try{editingStepIdx=0;}catch(e){}
  try{isEditingTaktik=false;}catch(e){}
  try{movementPaths=[];}catch(e){}
  try{selectedId=null;}catch(e){}
  try{arrows=[];labels=[];freehandPaths=[];zones=[];}catch(e){}
  try{tt76ForceClean();}catch(e){}

  var tb=document.getElementById("taktikbar");
  if(tb)tb.style.display="none";
  var edit=document.getElementById("edit-taktik-ui");
  if(edit)edit.style.display="none";
  var rec=document.getElementById("rec-ui");
  if(rec)rec.style.display="none";
  var no=document.getElementById("no-rec-ui");
  if(no)no.style.display="block";
  var bp=document.getElementById("bottompanel");
  if(bp)bp.classList.remove("hidden");

  try{
    document.querySelectorAll(".tab").forEach(function(t){
      t.classList.toggle("on",t.getAttribute("data-panel")==="taktik");
    });
    document.querySelectorAll(".panel").forEach(function(p){
      p.classList.toggle("on",p.id==="panel-taktik");
    });
  }catch(e){}

  try{renderTaktikList();}catch(e){}
  setTimeout(tt82ApplyLibraryMode,0);
}

var _tt82_startPlayback_base=typeof startPlayback==="function"?startPlayback:null;
if(_tt82_startPlayback_base){
  startPlayback=function(){
    tt82EnterFilmMode();
    var r=_tt82_startPlayback_base.apply(this,arguments);
    setTimeout(tt82ApplyLibraryMode,0);
    return r;
  };
}

var _tt82_openEditTaktik_base=typeof openEditTaktik==="function"?openEditTaktik:null;
if(_tt82_openEditTaktik_base){
  openEditTaktik=function(){
    tt82EnterFilmMode();
    var r=_tt82_openEditTaktik_base.apply(this,arguments);
    setTimeout(tt82ApplyLibraryMode,0);
    return r;
  };
}

if(typeof stopPlayback==="function"){
  stopPlayback=function(){
    if(typeof confirmUnsavedV21==="function" && !confirmUnsavedV21())return;
    tt82ReturnToTaktikMenu();
  };
}

if(typeof exitEditTaktik==="function"){
  exitEditTaktik=function(){
    if(typeof confirmUnsavedV21==="function" && !confirmUnsavedV21())return;
    tt82ReturnToTaktikMenu();
  };
}

function tt82BindExitButtons(){
  ["btn-stop-play","btn-edit-taktik-exit"].forEach(function(id){
    var old=document.getElementById(id);
    if(!old || old.dataset.tt82ExitBound)return;
    var neu=old.cloneNode(true);
    neu.dataset.tt82ExitBound="1";
    old.parentNode.replaceChild(neu,old);
    neu.addEventListener("click",function(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      if(typeof confirmUnsavedV21==="function" && !confirmUnsavedV21())return false;
      tt82ReturnToTaktikMenu();
      return false;
    },true);
  });
}

if(typeof renderTaktikList==="function"){
  var _renderTaktikList_v82=renderTaktikList;
  renderTaktikList=function(){
    var r=_renderTaktikList_v82.apply(this,arguments);
    setTimeout(function(){
      try{if(typeof tt78PatchReadonlyEyeIcons==="function")tt78PatchReadonlyEyeIcons();}catch(e){}
      try{if(typeof tt79RebindCopyButtons==="function")tt79RebindCopyButtons();}catch(e){}
      tt82BindExitButtons();
      tt82ApplyLibraryMode();
    },0);
    return r;
  };
}

document.addEventListener("click",function(e){
  try{
    var tab=e.target.closest && e.target.closest(".tab");
    if(tab){
      setTimeout(tt82ApplyLibraryMode,80);
    }
  }catch(err){}
},true);

["btn-new-taktik","new-taktik-ok"].forEach(function(id){
  var b=document.getElementById(id);
  if(b && !b.dataset.tt82EnterBound){
    b.dataset.tt82EnterBound="1";
    b.addEventListener("click",function(){tt82EnterFilmMode();},true);
  }
});

tt82BindExitButtons();
setTimeout(tt82ApplyLibraryMode,500);
setTimeout(tt82BindExitButtons,800);
setTimeout(tt82ApplyLibraryMode,1500);

/* === slut v82-taktik-library-safe === */


/* === v85-hide-duplicate-save-exit: ta bort dubbla spara/avsluta i stegpanelen === */

function tt85HideDuplicateSaveExit(){
  ["btn-edit-taktik-save","btn-edit-taktik-exit"].forEach(function(id){
    var b=document.getElementById(id);
    if(b){
      b.style.display="none";
      b.style.visibility="hidden";
      b.style.pointerEvents="none";
      b.setAttribute("aria-hidden","true");
      b.tabIndex=-1;
    }
  });
}

// Säkerställ att de övre knapparna i taktikbaren är de som används.
// btn-stop-play/krysset ska tillbaka till taktikmenyn. I v82 fungerar biblioteksläget
// när man klickar Taktik-fliken; här återanvänder vi samma väg efter krysset.
function tt85CloseViaTopCross(){
  if(typeof confirmUnsavedV21==="function" && !confirmUnsavedV21())return;

  try{if(animFrame)cancelAnimationFrame(animFrame);}catch(e){}
  try{playback=null;}catch(e){}
  try{editingTaktikIdx=null;}catch(e){}
  try{editingStepIdx=0;}catch(e){}
  try{isEditingTaktik=false;}catch(e){}
  try{selectedId=null;}catch(e){}
  try{movementPaths=[];arrows=[];labels=[];freehandPaths=[];zones=[];}catch(e){}
  try{tt76ForceClean();}catch(e){}

  var tb=document.getElementById("taktikbar");
  if(tb)tb.style.display="none";

  var edit=document.getElementById("edit-taktik-ui");
  if(edit)edit.style.display="none";

  var rec=document.getElementById("rec-ui");
  if(rec)rec.style.display="none";

  var no=document.getElementById("no-rec-ui");
  if(no)no.style.display="block";

  var bp=document.getElementById("bottompanel");
  if(bp)bp.classList.remove("hidden");

  try{
    document.querySelectorAll(".tab").forEach(function(t){
      t.classList.toggle("on",t.getAttribute("data-panel")==="taktik");
    });
    document.querySelectorAll(".panel").forEach(function(p){
      p.classList.toggle("on",p.id==="panel-taktik");
    });
  }catch(e){}

  try{renderTaktikList();}catch(e){}
  try{
    if(typeof tt82ApplyLibraryMode==="function")tt82ApplyLibraryMode();
  }catch(e){}
  setTimeout(function(){
    try{
      document.body.classList.add("tt-v82-taktik-library");
      var p=document.getElementById("pitch-wrapper");
      if(p)p.style.display="none";
    }catch(e){}
  },80);
}

function tt85BindTopButtons(){
  // Övre kryssknappen
  var stop=document.getElementById("btn-stop-play");
  if(stop && stop.dataset.tt85Bound!=="1"){
    var n=stop.cloneNode(true);
    n.dataset.tt85Bound="1";
    stop.parentNode.replaceChild(n,stop);
    n.addEventListener("click",function(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      tt85CloseViaTopCross();
      return false;
    },true);
  }

  // Övre disketten/spara i taktikbaren ska använda v76/v79:s sparflöde.
  var save=document.getElementById("btn-edit-taktik-save-top") || document.getElementById("btn-save-film") || document.getElementById("btn-edit-taktik-save");
  // OBS: btn-edit-taktik-save är dold i stegpanelen. Om ingen separat toppdiskett har id här
  // lämnar vi befintlig toppknapp orörd.
}

if(typeof renderTaktikList==="function"){
  var _renderTaktikList_v85=renderTaktikList;
  renderTaktikList=function(){
    var r=_renderTaktikList_v85.apply(this,arguments);
    setTimeout(function(){
      tt85HideDuplicateSaveExit();
      tt85BindTopButtons();
      try{if(typeof tt78PatchReadonlyEyeIcons==="function")tt78PatchReadonlyEyeIcons();}catch(e){}
      try{if(typeof tt79RebindCopyButtons==="function")tt79RebindCopyButtons();}catch(e){}
    },0);
    return r;
  };
}

tt85HideDuplicateSaveExit();
tt85BindTopButtons();
setTimeout(tt85HideDuplicateSaveExit,500);
setTimeout(tt85BindTopButtons,500);
setTimeout(tt85HideDuplicateSaveExit,1500);
setTimeout(tt85BindTopButtons,1500);

/* === slut v85-hide-duplicate-save-exit === */


/* === v86-exit-button-save-state: Avsluta-knapp + ingen falsk varning efter sparning === */

function tt86CurrentTaktik(){
  try{
    if(editingTaktikIdx===null || typeof editingTaktikIdx==="undefined")return null;
    return taktikFilmer && taktikFilmer[editingTaktikIdx] ? taktikFilmer[editingTaktikIdx] : null;
  }catch(e){return null;}
}

function tt86Clone(o){
  try{return JSON.parse(JSON.stringify(o));}catch(e){return o;}
}

function tt86NormalizeForSaved(tk){
  try{
    var c=tt86Clone(tk||{});
    if(typeof tt76NormalizeFilm==="function")tt76NormalizeFilm(c);
    delete c._readOnly;
    delete c._isDraft;
    delete c.dbId;
    delete c.id;
    delete c.meta;
    delete c._saving;
    // Behåll _meta inte i jämförelsen, eftersom updatedAt ändras vid sparning.
    delete c._meta;
    return JSON.stringify(c);
  }catch(e){
    return "";
  }
}

function tt86MarkCleanNow(tk){
  tk=tk||tt86CurrentTaktik();
  try{
    if(!tk)return;
    if(!ttV76)window.ttV76={};
  }catch(e){}

  try{
    if(typeof tt76ForceClean==="function")tt76ForceClean(tk);
  }catch(e){}

  try{
    ttV76.savedSnapshot=tt86NormalizeForSaved(tk);
    ttV76.lastSaveAt=Date.now();
  }catch(e){}

  try{savedTaktikSnapshotV21=tt86NormalizeForSaved(tk);}catch(e){}
  try{taktikDirtyV17=false;}catch(e){}
  try{window.taktikDirtyV17=false;}catch(e){}
}

function tt86HasUnsaved(){
  var tk=tt86CurrentTaktik();
  if(!tk)return false;
  try{
    if(typeof tt76IsReadOnly==="function" && tt76IsReadOnly(tk))return false;
  }catch(e){}
  try{
    if(ttV76 && ttV76.lastSaveAt && Date.now()-ttV76.lastSaveAt<5000)return false;
  }catch(e){}

  // Säker autosave till aktuellt steg innan jämförelse, men utan att skapa nya steg.
  try{
    if(typeof tt76SaveCurrentStep==="function")tt76SaveCurrentStep({allowAutoCreate:false});
    else if(typeof saveCurrentStepV75==="function")saveCurrentStepV75({allowAutoCreate:false});
  }catch(e){}

  var now=tt86NormalizeForSaved(tk);
  var saved="";
  try{saved=ttV76&&ttV76.savedSnapshot?ttV76.savedSnapshot:"";}catch(e){}
  if(!saved){
    try{saved=savedTaktikSnapshotV21||"";}catch(e){}
  }
  if(!saved){
    tt86MarkCleanNow(tk);
    return false;
  }
  return now!==saved;
}

hasUnsavedTaktikChangesV21=tt86HasUnsaved;
confirmUnsavedV21=function(){
  if(!tt86HasUnsaved())return true;
  return confirm("Du har osparade ändringar i taktiken. Vill du lämna utan att spara?");
};
confirmUnsavedV19=confirmUnsavedV21;
confirmUnsavedTaktikV18=confirmUnsavedV21;
confirmDiscardUnsavedV17=confirmUnsavedV21;
confirmUnsavedUnifiedV23=confirmUnsavedV21;

function tt86ExitToLibraryNoFalseWarning(){
  if(!confirmUnsavedV21())return;

  try{tt86MarkCleanNow(tt86CurrentTaktik());}catch(e){}

  // Återanvänd bästa befintliga biblioteksväg.
  try{
    if(typeof tt85CloseViaTopCross==="function"){
      tt85CloseViaTopCross();
    }else if(typeof tt82ReturnToTaktikMenu==="function"){
      tt82ReturnToTaktikMenu();
    }
  }catch(e){}

  // Säkerställ slutläge även om äldre kod återställer display.
  [0,80,250].forEach(function(ms){
    setTimeout(function(){
      try{playback=null;}catch(e){}
      try{editingTaktikIdx=null;}catch(e){}
      try{editingStepIdx=0;}catch(e){}
      try{isEditingTaktik=false;}catch(e){}
      try{document.body.classList.add("tt-v82-taktik-library");}catch(e){}
      var tb=document.getElementById("taktikbar");if(tb)tb.style.display="none";
      var edit=document.getElementById("edit-taktik-ui");if(edit)edit.style.display="none";
      var no=document.getElementById("no-rec-ui");if(no)no.style.display="block";
      var p=document.getElementById("pitch-wrapper");if(p)p.style.display="none";
      try{renderTaktikList();}catch(e){}
    },ms);
  });
}

function tt86RestyleExitButton(){
  var b=document.getElementById("btn-stop-play");
  if(!b)return;
  b.textContent="Avsluta";
  b.title="Avsluta filmen";
  b.setAttribute("aria-label","Avsluta filmen");
  b.classList.add("tt-v86-exit-btn");
}

function tt86BindExitButton(){
  var old=document.getElementById("btn-stop-play");
  if(!old)return;

  // Ändra även om den redan är bunden.
  old.textContent="Avsluta";
  old.title="Avsluta filmen";
  old.setAttribute("aria-label","Avsluta filmen");
  old.classList.add("tt-v86-exit-btn");

  if(old.dataset.tt86ExitBound==="1")return;

  var neu=old.cloneNode(true);
  neu.dataset.tt86ExitBound="1";
  neu.textContent="Avsluta";
  neu.title="Avsluta filmen";
  neu.setAttribute("aria-label","Avsluta filmen");
  neu.classList.add("tt-v86-exit-btn");
  old.parentNode.replaceChild(neu,old);

  neu.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    tt86ExitToLibraryNoFalseWarning();
    return false;
  },true);
}

// Hooka sparning så clean-snapshot uppdateras efter lyckad spara.
var _tt86_saveFilmV74=typeof saveFilmV74==="function"?saveFilmV74:null;
if(_tt86_saveFilmV74){
  saveFilmV74=function(){
    var tk=tt86CurrentTaktik();
    var r=_tt86_saveFilmV74.apply(this,arguments);
    setTimeout(function(){tt86MarkCleanNow(tk||tt86CurrentTaktik());},300);
    setTimeout(function(){tt86MarkCleanNow(tk||tt86CurrentTaktik());},1200);
    return r;
  };
}

if(typeof tt76SaveFilm==="function"){
  var _tt86_tt76SaveFilm=tt76SaveFilm;
  tt76SaveFilm=function(){
    var tk=tt86CurrentTaktik();
    var r=_tt86_tt76SaveFilm.apply(this,arguments);
    setTimeout(function(){tt86MarkCleanNow(tk||tt86CurrentTaktik());},300);
    setTimeout(function(){tt86MarkCleanNow(tk||tt86CurrentTaktik());},1200);
    return r;
  };
}

if(typeof cloudSaveTaktik==="function"){
  var _tt86_cloudSaveTaktik=cloudSaveTaktik;
  cloudSaveTaktik=function(tk){
    var r=_tt86_cloudSaveTaktik.apply(this,arguments);
    setTimeout(function(){tt86MarkCleanNow(tk||tt86CurrentTaktik());},800);
    setTimeout(function(){tt86MarkCleanNow(tk||tt86CurrentTaktik());},1600);
    return r;
  };
}

if(typeof startPlayback==="function"){
  var _tt86_startPlayback=startPlayback;
  startPlayback=function(){
    var r=_tt86_startPlayback.apply(this,arguments);
    setTimeout(tt86BindExitButton,0);
    setTimeout(function(){tt86MarkCleanNow(tt86CurrentTaktik());},300);
    return r;
  };
}

if(typeof renderTaktikList==="function"){
  var _renderTaktikList_v86=renderTaktikList;
  renderTaktikList=function(){
    var r=_renderTaktikList_v86.apply(this,arguments);
    setTimeout(function(){
      tt86BindExitButton();
      tt86RestyleExitButton();
      try{if(typeof tt78PatchReadonlyEyeIcons==="function")tt78PatchReadonlyEyeIcons();}catch(e){}
      try{if(typeof tt79RebindCopyButtons==="function")tt79RebindCopyButtons();}catch(e){}
    },0);
    return r;
  };
}

tt86BindExitButton();
tt86RestyleExitButton();
setTimeout(tt86BindExitButton,500);
setTimeout(tt86RestyleExitButton,500);
setTimeout(tt86BindExitButton,1500);

/* === slut v86-exit-button-save-state === */


/* === v88-exit-white-accurate-dirty: vit Avsluta + varna bara vid ändring efter sparning === */

var tt88SavedSnapshot = "";
var tt88DirtyAfterSave = false;
var tt88SavingNow = false;

function tt88Clone(o){
  try{return JSON.parse(JSON.stringify(o));}catch(e){return o;}
}

function tt88CurrentFilm(){
  try{
    if(editingTaktikIdx===null || typeof editingTaktikIdx==="undefined")return null;
    return taktikFilmer && taktikFilmer[editingTaktikIdx] ? taktikFilmer[editingTaktikIdx] : null;
  }catch(e){return null;}
}

function tt88SafeSaveCurrentStep(){
  try{
    if(typeof tt76SaveCurrentStep==="function"){
      tt76SaveCurrentStep({allowAutoCreate:false});
      return;
    }
  }catch(e){}
  try{
    if(typeof saveCurrentStepV75==="function"){
      saveCurrentStepV75({allowAutoCreate:false});
      return;
    }
  }catch(e){}
}

function tt88NormalizeFilm(tk){
  try{
    var c=tt88Clone(tk||{});
    if(typeof tt76NormalizeFilm==="function")tt76NormalizeFilm(c);

    // Saker som inte ska räknas som innehållsändring.
    delete c.dbId;
    delete c.id;
    delete c._readOnly;
    delete c._isDraft;
    delete c._saving;
    delete c._dirty;
    delete c.meta;

    // updatedAt/ägarmeta kan ändras vid save utan att själva filmen ändrats.
    delete c._meta;

    return JSON.stringify(c);
  }catch(e){
    return "";
  }
}

function tt88CaptureSavedSnapshot(){
  var tk=tt88CurrentFilm();
  if(!tk)return;
  tt88SafeSaveCurrentStep();
  tt88SavedSnapshot=tt88NormalizeFilm(tk);
  tt88DirtyAfterSave=false;

  try{taktikDirtyV17=false;}catch(e){}
  try{window.taktikDirtyV17=false;}catch(e){}
  try{
    if(typeof tt76ForceClean==="function")tt76ForceClean(tk);
  }catch(e){}
  try{
    if(typeof tt86MarkCleanNow==="function")tt86MarkCleanNow(tk);
  }catch(e){}
}

function tt88MarkDirty(reason){
  if(tt88SavingNow)return;
  if(!tt88CurrentFilm())return;
  tt88DirtyAfterSave=true;
}

function tt88HasUnsaved(){
  var tk=tt88CurrentFilm();
  if(!tk)return false;

  try{
    if(typeof tt76IsReadOnly==="function" && tt76IsReadOnly(tk))return false;
  }catch(e){}

  tt88SafeSaveCurrentStep();

  var now=tt88NormalizeFilm(tk);

  if(!tt88SavedSnapshot){
    tt88SavedSnapshot=now;
    tt88DirtyAfterSave=false;
    return false;
  }

  if(now!==tt88SavedSnapshot)return true;
  if(tt88DirtyAfterSave)return true;
  return false;
}

confirmUnsavedV21=function(){
  if(!tt88HasUnsaved())return true;
  return confirm("Du har osparade ändringar i taktiken. Vill du lämna utan att spara?");
};
confirmUnsavedV19=confirmUnsavedV21;
confirmUnsavedTaktikV18=confirmUnsavedV21;
confirmDiscardUnsavedV17=confirmUnsavedV21;
confirmUnsavedUnifiedV23=confirmUnsavedV21;
hasUnsavedTaktikChangesV21=tt88HasUnsaved;

function tt88AfterSave(){
  tt88SavingNow=true;
  [100,500,1200,2200].forEach(function(ms){
    setTimeout(function(){
      tt88CaptureSavedSnapshot();
      if(ms===2200)tt88SavingNow=false;
    },ms);
  });
}

// Hooka spara-flöden utan långt frikort.
// När save är klar uppdateras bara snapshoten.
if(typeof cloudSaveTaktik==="function" && !cloudSaveTaktik._tt88Wrapped){
  var _tt88_cloudSaveTaktik=cloudSaveTaktik;
  cloudSaveTaktik=function(){
    var r=_tt88_cloudSaveTaktik.apply(this,arguments);
    tt88AfterSave();
    return r;
  };
  cloudSaveTaktik._tt88Wrapped=true;
}

["saveFilmV74","saveFilmV73","saveFilmV71","saveFilmV70","saveWholeFilmV69","saveCurrentTaktikFileV67","saveCurrentTaktikFileV20","saveCurrentTaktikFileV21","saveCurrentTaktikFileV23"].forEach(function(fn){
  try{
    if(typeof window!=="undefined" && typeof window[fn]==="function" && !window[fn]._tt88Wrapped){
      var old=window[fn];
      window[fn]=function(){
        var r=old.apply(this,arguments);
        tt88AfterSave();
        return r;
      };
      window[fn]._tt88Wrapped=true;
    }
  }catch(e){}
});

function tt88BindSaveButtons(){
  var possible=[
    "btn-edit-taktik-save-top",
    "btn-save-film",
    "btn-edit-taktik-save",
    "btn-save-taktik",
    "btn-save-current-taktik",
    "btn-top-save",
    "btn-save-as-topbar"
  ];

  possible.forEach(function(id){
    var b=document.getElementById(id);
    if(b && b.dataset.tt88SaveBound!=="1"){
      b.dataset.tt88SaveBound="1";
      b.addEventListener("click",function(){
        tt88AfterSave();
      },true);
    }
  });

  var tb=document.getElementById("taktikbar");
  if(tb){
    Array.prototype.slice.call(tb.querySelectorAll("button")).forEach(function(b){
      var txt=String(b.textContent||"");
      var title=String(b.title||"");
      var aria=String(b.getAttribute("aria-label")||"");
      var isSave=txt.indexOf("💾")>=0 || txt.indexOf("💾")>=0 ||
                 txt.toLowerCase().indexOf("spara")>=0 ||
                 title.toLowerCase().indexOf("spara")>=0 ||
                 aria.toLowerCase().indexOf("spara")>=0;
      if(isSave && b.dataset.tt88SaveBound!=="1"){
        b.dataset.tt88SaveBound="1";
        b.addEventListener("click",function(){tt88AfterSave();},true);
      }
    });
  }
}

function tt88BindDirtySignals(){
  if(document.body.dataset.tt88DirtyBound==="1")return;
  document.body.dataset.tt88DirtyBound="1";

  var pitch=document.getElementById("pitch-svg") || document.getElementById("pitch-wrapper") || document;
  ["pointerdown","mousedown","touchstart"].forEach(function(ev){
    pitch.addEventListener(ev,function(){
      // Pitch-interaktioner är potentiella ändringar.
      tt88MarkDirty(ev);
    },true);
  });

  document.addEventListener("input",function(e){
    try{
      if(e.target && e.target.closest && e.target.closest("#edit-taktik-ui,#taktikbar")){
        tt88MarkDirty("input");
      }
    }catch(err){}
  },true);

  document.addEventListener("change",function(e){
    try{
      if(e.target && e.target.closest && e.target.closest("#edit-taktik-ui,#taktikbar")){
        tt88MarkDirty("change");
      }
    }catch(err){}
  },true);

  document.addEventListener("click",function(e){
    try{
      var t=e.target;
      if(!t || !t.closest)return;
      if(t.closest("#btn-add-step,#btn-delete-step,#btn-edit-step-prev,#btn-edit-step-next,#btn-movement,#btn-arrow,#btn-freehand,#btn-zone,#btn-text")){
        tt88MarkDirty("button");
      }
    }catch(err){}
  },true);
}

function tt88StyleExitButton(){
  var b=document.getElementById("btn-stop-play");
  if(!b)return;
  b.textContent="Avsluta";
  b.title="Avsluta filmen";
  b.setAttribute("aria-label","Avsluta filmen");
  b.classList.add("tt-v86-exit-btn");
  b.classList.add("tt-v88-exit-btn");
  b.style.color="#edf5ee";
  b.style.borderColor="#edf5ee";
}

function tt88ExitToLibrary(){
  if(!confirmUnsavedV21())return;

  try{
    if(typeof tt85CloseViaTopCross==="function"){
      tt85CloseViaTopCross();
    }else if(typeof tt82ReturnToTaktikMenu==="function"){
      tt82ReturnToTaktikMenu();
    }
  }catch(e){}

  [0,80,250].forEach(function(ms){
    setTimeout(function(){
      try{playback=null;}catch(e){}
      try{editingTaktikIdx=null;}catch(e){}
      try{editingStepIdx=0;}catch(e){}
      try{isEditingTaktik=false;}catch(e){}
      try{document.body.classList.add("tt-v82-taktik-library");}catch(e){}
      var p=document.getElementById("pitch-wrapper");if(p)p.style.display="none";
      var tb=document.getElementById("taktikbar");if(tb)tb.style.display="none";
      var no=document.getElementById("no-rec-ui");if(no)no.style.display="block";
      try{renderTaktikList();}catch(e){}
    },ms);
  });
}

function tt88BindExitButton(){
  var old=document.getElementById("btn-stop-play");
  if(!old)return;

  tt88StyleExitButton();
  if(old.dataset.tt88ExitBound==="1")return;

  var neu=old.cloneNode(true);
  neu.dataset.tt88ExitBound="1";
  old.parentNode.replaceChild(neu,old);

  neu.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    tt88ExitToLibrary();
    return false;
  },true);

  tt88StyleExitButton();
}

if(typeof startPlayback==="function" && !startPlayback._tt88Wrapped){
  var _tt88_startPlayback=startPlayback;
  startPlayback=function(){
    var r=_tt88_startPlayback.apply(this,arguments);
    setTimeout(function(){
      tt88CaptureSavedSnapshot();
      tt88BindSaveButtons();
      tt88BindExitButton();
      tt88StyleExitButton();
    },300);
    return r;
  };
  startPlayback._tt88Wrapped=true;
}

if(typeof openEditTaktik==="function" && !openEditTaktik._tt88Wrapped){
  var _tt88_openEditTaktik=openEditTaktik;
  openEditTaktik=function(){
    var r=_tt88_openEditTaktik.apply(this,arguments);
    setTimeout(function(){
      tt88CaptureSavedSnapshot();
      tt88BindSaveButtons();
      tt88BindExitButton();
      tt88StyleExitButton();
    },300);
    return r;
  };
  openEditTaktik._tt88Wrapped=true;
}

if(typeof renderTaktikList==="function" && !renderTaktikList._tt88Wrapped){
  var _renderTaktikList_v88=renderTaktikList;
  renderTaktikList=function(){
    var r=_renderTaktikList_v88.apply(this,arguments);
    setTimeout(function(){
      tt88BindSaveButtons();
      tt88BindExitButton();
      tt88StyleExitButton();
      try{if(typeof tt78PatchReadonlyEyeIcons==="function")tt78PatchReadonlyEyeIcons();}catch(e){}
      try{if(typeof tt79RebindCopyButtons==="function")tt79RebindCopyButtons();}catch(e){}
    },0);
    return r;
  };
  renderTaktikList._tt88Wrapped=true;
}

tt88BindDirtySignals();
tt88BindSaveButtons();
tt88BindExitButton();
tt88StyleExitButton();
setTimeout(function(){
  tt88BindSaveButtons();
  tt88BindExitButton();
  tt88StyleExitButton();
},500);
setTimeout(function(){
  tt88BindSaveButtons();
  tt88BindExitButton();
  tt88StyleExitButton();
},1500);

/* === slut v88-exit-white-accurate-dirty === */


/* === v89-modern-meta-on-save: nya sparningar ska inte hamna som "Äldre" ===
   Orsak: vissa sparvägar via övre disketten kan spara filmen utan komplett _meta.
   Då klassas den som legacy/äldre i listan. Här normaliseras metadata före save.
*/

function tt89GetProfile(){
  try{
    if(typeof getProfileSafeV10==="function")return getProfileSafeV10();
  }catch(e){}
  try{
    if(typeof getUserProfile==="function")return getUserProfile();
  }catch(e){}
  try{
    var raw=localStorage.getItem("tt_profile_v1");
    return raw?JSON.parse(raw):null;
  }catch(e){}
  return null;
}

function tt89EnsureModernMeta(tk){
  if(!tk || typeof tk!=="object")return tk;

  try{
    if(typeof addMetaToData==="function"){
      tk=addMetaToData(tk) || tk;
    }
  }catch(e){}

  var p=tt89GetProfile();

  if(!tk._meta || typeof tk._meta!=="object")tk._meta={};

  // Om äldre meta ligger på data.meta flytta över viktiga fält.
  try{
    if(tk.meta && typeof tk.meta==="object"){
      Object.keys(tk.meta).forEach(function(k){
        if(typeof tk._meta[k]==="undefined")tk._meta[k]=tk.meta[k];
      });
    }
  }catch(e){}

  if(p){
    tk._meta.ownerId = tk._meta.ownerId || p.ownerId || p.id || p.userId || "local-owner";
    tk._meta.ownerName = tk._meta.ownerName || p.ownerName || p.name || "Tränare";
    tk._meta.teamId = tk._meta.teamId || p.teamId || p.teamCode || "default-team";
    tk._meta.teamCode = tk._meta.teamCode || p.teamCode || p.teamId || "LAG";
    tk._meta.teamName = tk._meta.teamName || p.teamName || p.teamCode || tk._meta.teamCode;
  }else{
    tk._meta.ownerId = tk._meta.ownerId || "local-owner";
    tk._meta.ownerName = tk._meta.ownerName || "Tränare";
    tk._meta.teamId = tk._meta.teamId || "default-team";
    tk._meta.teamCode = tk._meta.teamCode || "LAG";
    tk._meta.teamName = tk._meta.teamName || tk._meta.teamCode;
  }

  if(typeof tk._meta.sharedWithTeam==="undefined")tk._meta.sharedWithTeam=false;
  if(typeof tk._meta.teamCanEdit==="undefined")tk._meta.teamCanEdit=false;
  tk._meta.updatedAt = new Date().toISOString();

  // Markör som gör att listan inte ska tolka den som legacy.
  tk._meta.schemaVersion = tk._meta.schemaVersion || 2;
  tk._meta.kind = tk._meta.kind || "taktikfilm";

  return tk;
}

function tt89CurrentFilm(){
  try{
    if(editingTaktikIdx===null || typeof editingTaktikIdx==="undefined")return null;
    return taktikFilmer && taktikFilmer[editingTaktikIdx] ? taktikFilmer[editingTaktikIdx] : null;
  }catch(e){return null;}
}

function tt89EnsureCurrentBeforeSave(){
  var tk=tt89CurrentFilm();
  if(tk)tt89EnsureModernMeta(tk);
  return tk;
}

// Wrap cloudSaveTaktik så alla taktikfilmer får _meta innan databas-save.
if(typeof cloudSaveTaktik==="function" && !cloudSaveTaktik._tt89Wrapped){
  var _tt89_cloudSaveTaktik=cloudSaveTaktik;
  cloudSaveTaktik=function(tk){
    tk = tk || tt89EnsureCurrentBeforeSave();
    if(tk)tt89EnsureModernMeta(tk);
    return _tt89_cloudSaveTaktik.apply(this,arguments);
  };
  cloudSaveTaktik._tt89Wrapped=true;
}

// Wrap kända sparfunktioner.
["saveFilmV74","saveFilmV73","saveFilmV71","saveFilmV70","saveWholeFilmV69","saveCurrentTaktikFileV67","saveCurrentTaktikFileV20","saveCurrentTaktikFileV21","saveCurrentTaktikFileV23","tt76SaveFilm"].forEach(function(fn){
  try{
    if(typeof window!=="undefined" && typeof window[fn]==="function" && !window[fn]._tt89Wrapped){
      var old=window[fn];
      window[fn]=function(){
        tt89EnsureCurrentBeforeSave();
        return old.apply(this,arguments);
      };
      window[fn]._tt89Wrapped=true;
    }
  }catch(e){}
});

// Extra skydd: om den övre sparknappen klickas, lägg meta precis innan äldre handler kör.
function tt89BindSaveMetaGuard(){
  var candidates=["btn-edit-taktik-save-top","btn-save-film","btn-save-taktik","btn-save-current-taktik","btn-top-save","btn-save-as-topbar"];
  candidates.forEach(function(id){
    var b=document.getElementById(id);
    if(b && b.dataset.tt89MetaGuard!=="1"){
      b.dataset.tt89MetaGuard="1";
      b.addEventListener("click",function(){
        tt89EnsureCurrentBeforeSave();
      },true);
    }
  });

  var tb=document.getElementById("taktikbar");
  if(tb){
    Array.prototype.slice.call(tb.querySelectorAll("button")).forEach(function(b){
      var txt=String(b.textContent||"");
      var title=String(b.title||"");
      var aria=String(b.getAttribute("aria-label")||"");
      var isSave=txt.indexOf("💾")>=0 ||
                 txt.toLowerCase().indexOf("spara")>=0 ||
                 title.toLowerCase().indexOf("spara")>=0 ||
                 aria.toLowerCase().indexOf("spara")>=0;
      if(isSave && b.dataset.tt89MetaGuard!=="1"){
        b.dataset.tt89MetaGuard="1";
        b.addEventListener("click",function(){
          tt89EnsureCurrentBeforeSave();
        },true);
      }
    });
  }
}

// Om listan redan innehåller nya filmer utan meta från tidigare test,
// reparera dem i minnet när listan renderas. Nästa sparning gör dem permanenta.
function tt89RepairLoadedTaktikList(){
  try{
    (taktikFilmer||[]).forEach(function(tk){
      if(!tk)return;
      var m=tk._meta || tk.meta;
      var missing=!m || !m.ownerId || !m.teamId;
      if(missing)tt89EnsureModernMeta(tk);
    });
  }catch(e){}
}

if(typeof renderTaktikList==="function" && !renderTaktikList._tt89Wrapped){
  var _renderTaktikList_v89=renderTaktikList;
  renderTaktikList=function(){
    tt89RepairLoadedTaktikList();
    var r=_renderTaktikList_v89.apply(this,arguments);
    setTimeout(function(){
      tt89BindSaveMetaGuard();
      try{if(typeof tt88BindExitButton==="function")tt88BindExitButton();}catch(e){}
      try{if(typeof tt88StyleExitButton==="function")tt88StyleExitButton();}catch(e){}
      try{if(typeof tt78PatchReadonlyEyeIcons==="function")tt78PatchReadonlyEyeIcons();}catch(e){}
      try{if(typeof tt79RebindCopyButtons==="function")tt79RebindCopyButtons();}catch(e){}
    },0);
    return r;
  };
  renderTaktikList._tt89Wrapped=true;
}

tt89BindSaveMetaGuard();
tt89RepairLoadedTaktikList();
setTimeout(tt89BindSaveMetaGuard,500);
setTimeout(tt89BindSaveMetaGuard,1500);

/* === slut v89-modern-meta-on-save === */


/* === v90-fix-false-legacy-label: stoppa felaktig "Äldre"-märkning på nya taktikfilmer ===
   Den gula "Äldre"-brickan kommer från gamla markLegacyRowsV53/V55.
   Nya filmer ska räknas som moderna om de har, eller kan få, _meta via aktuell profil.
*/

function tt90Profile(){
  try{
    if(typeof getProfileSafeV10==="function"){
      var p=getProfileSafeV10();
      if(p)return p;
    }
  }catch(e){}
  try{
    if(typeof getUserProfile==="function"){
      var p2=getUserProfile();
      if(p2)return p2;
    }
  }catch(e){}
  try{
    if(typeof ensureUserProfile==="function"){
      var p3=ensureUserProfile(false);
      if(p3)return p3;
    }
  }catch(e){}
  return null;
}

function tt90IsTaktikFilm(obj){
  return !!(obj && obj.steps && obj.steps.length>=2);
}

function tt90EnsureMetaInPlace(obj){
  if(!obj || typeof obj!=="object")return obj;

  // Uppställningar har ofta metadata i state; taktikfilmer direkt på objektet.
  var target = obj.state && !obj.steps ? obj.state : obj;

  if(!target._meta || typeof target._meta!=="object")target._meta={};

  var p=tt90Profile();
  if(!p){
    // Sista skyddet: gör ändå filen modern lokalt, så den inte felmärks.
    p={ownerId:"local-owner",ownerName:"Tränare",teamId:"MITT-LAG",teamCode:"MITT-LAG",teamName:"MITT-LAG"};
  }

  target._meta.ownerId = target._meta.ownerId || p.ownerId || "local-owner";
  target._meta.ownerName = target._meta.ownerName || p.ownerName || "Tränare";
  target._meta.teamId = target._meta.teamId || p.teamId || p.teamCode || "MITT-LAG";
  target._meta.teamCode = target._meta.teamCode || p.teamCode || p.teamId || "MITT-LAG";
  target._meta.teamName = target._meta.teamName || p.teamName || target._meta.teamCode;
  if(typeof target._meta.sharedWithTeam==="undefined")target._meta.sharedWithTeam=false;
  if(typeof target._meta.teamCanEdit==="undefined")target._meta.teamCanEdit=false;
  target._meta.updatedAt = target._meta.updatedAt || new Date().toISOString();
  target._meta.schemaVersion = target._meta.schemaVersion || 2;
  target._meta.kind = target._meta.kind || (tt90IsTaktikFilm(target)?"taktikfilm":"file");

  // spegla upp så äldre fileMetaV10 också hittar den
  if(obj!==target)obj._meta = target._meta;
  else obj._meta = target._meta;

  delete obj._legacyV53;
  delete obj._legacyV55;
  delete target._legacyV53;
  delete target._legacyV55;

  return obj;
}

function tt90MetaLooksModern(obj){
  if(!obj)return false;
  var m={};
  try{
    if(typeof fileMetaV10==="function")m=fileMetaV10(obj)||{};
  }catch(e){m={};}

  if(obj.state && obj.state._meta)m=obj.state._meta;
  if(obj.data && obj.data._meta)m=obj.data._meta;
  if(obj._meta)m=obj._meta;

  return !!(m && (m.ownerId || m.ownerName || m.teamId || m.teamCode));
}

function tt90IsLegacy(obj){
  if(!obj)return false;

  // Taktikfilmer som finns i Mina ska moderniseras automatiskt.
  // De ska inte få "Äldre"-bricka bara för att de skapats via ny sparknapp.
  if(tt90IsTaktikFilm(obj)){
    tt90EnsureMetaInPlace(obj);
    return !tt90MetaLooksModern(obj);
  }

  // För andra objekt: behåll legacy om metadata verkligen saknas.
  return !tt90MetaLooksModern(obj);
}

// Överstyr de gamla legacy-testerna som markLegacyRowsV53/V55 använder.
isLegacyFileV53 = tt90IsLegacy;
isLegacyFileV55 = tt90IsLegacy;

function tt90RepairAllLoaded(){
  try{
    (taktikFilmer||[]).forEach(function(tk){
      if(tt90IsTaktikFilm(tk))tt90EnsureMetaInPlace(tk);
    });
  }catch(e){}
}

function tt90RemoveWrongLegacyBadges(){
  try{
    Array.prototype.slice.call(document.querySelectorAll("#taktik-list .row")).forEach(function(row){
      var nm=row.querySelector(".row-name");
      if(!nm)return;
      var name=String(nm.textContent||"").trim();
      var tk=(taktikFilmer||[]).find(function(t){return String(t.name||"").trim()===name;});
      if(!tk)return;

      // Modernisera först, kontrollera sedan.
      tt90EnsureMetaInPlace(tk);

      if(!tt90IsLegacy(tk)){
        Array.prototype.slice.call(row.querySelectorAll(".legacy-v55,.legacy-v54,.legacy-v53,.legacy-v52")).forEach(function(b){
          b.parentNode.removeChild(b);
        });
      }
    });
  }catch(e){}
}

// Intercepta fetch mot Supabase-sparning av taktikfilm.
// Detta fångar även äldre sparknappar som gör fetch direkt i stället för cloudSaveTaktik.
if(typeof window!=="undefined" && window.fetch && !window.fetch._tt90Wrapped){
  var _tt90_fetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    try{
      var url=String(input&&input.url?input.url:input||"");
      if(init && init.body && url.indexOf(SUPA_TABLE)>=0){
        var body=JSON.parse(init.body);
        if(body && body.type==="taktikfilm" && body.data && body.data.steps && body.data.steps.length>=2){
          tt90EnsureMetaInPlace(body.data);
          if(!body.folder)body.folder=body.data.folder||"Taktik";
          body.data.folder=body.data.folder||body.folder||"Taktik";
          init=Object.assign({},init,{body:JSON.stringify(body)});
        }
      }
    }catch(e){}
    return _tt90_fetch(input,init);
  };
  window.fetch._tt90Wrapped=true;
}

// Gör även cloudSave-vägen explicit.
if(typeof cloudSaveTaktik==="function" && !cloudSaveTaktik._tt90Wrapped){
  var _tt90_cloudSaveTaktik=cloudSaveTaktik;
  cloudSaveTaktik=function(tk){
    if(!tk){
      try{
        if(editingTaktikIdx!==null && typeof editingTaktikIdx!=="undefined"){
          tk=taktikFilmer&&taktikFilmer[editingTaktikIdx];
        }
      }catch(e){}
    }
    if(tk)tt90EnsureMetaInPlace(tk);
    return _tt90_cloudSaveTaktik.apply(this,arguments);
  };
  cloudSaveTaktik._tt90Wrapped=true;
}

if(typeof renderTaktikList==="function" && !renderTaktikList._tt90Wrapped){
  var _renderTaktikList_v90=renderTaktikList;
  renderTaktikList=function(){
    tt90RepairAllLoaded();
    var r=_renderTaktikList_v90.apply(this,arguments);
    setTimeout(function(){
      tt90RepairAllLoaded();
      tt90RemoveWrongLegacyBadges();
      try{if(typeof tt88BindExitButton==="function")tt88BindExitButton();}catch(e){}
      try{if(typeof tt88StyleExitButton==="function")tt88StyleExitButton();}catch(e){}
      try{if(typeof tt79RebindCopyButtons==="function")tt79RebindCopyButtons();}catch(e){}
    },0);
    setTimeout(tt90RemoveWrongLegacyBadges,60);
    setTimeout(tt90RemoveWrongLegacyBadges,250);
    return r;
  };
  renderTaktikList._tt90Wrapped=true;
}

// Om gamla markLegacyRows kör efter oss via timeout: städa bort felmärkningen igen.
setInterval(function(){
  try{tt90RemoveWrongLegacyBadges();}catch(e){}
},1200);

tt90RepairAllLoaded();
setTimeout(function(){
  tt90RepairAllLoaded();
  tt90RemoveWrongLegacyBadges();
  try{renderTaktikList();}catch(e){}
},600);

/* === slut v90-fix-false-legacy-label === */


/* === v91-new-film-from-formation-taktik-modal: öppna "ny film från utgångsläge" i Taktik ===
   Buggen: knappen i Taktik öppnade/visade rutan i Utgångsläge-fliken.
   Fix: fånga klicket, håll Taktik-panelen aktiv och visa en egen enkel modal/lista.
*/

function tt91ActivateTaktikPanel(){
  try{
    document.querySelectorAll(".tab").forEach(function(t){
      t.classList.toggle("on",t.getAttribute("data-panel")==="taktik");
    });
    document.querySelectorAll(".panel").forEach(function(p){
      p.classList.toggle("on",p.id==="panel-taktik");
    });
  }catch(e){}
  try{document.body.classList.add("tt-v82-taktik-library");}catch(e){}
  var no=document.getElementById("no-rec-ui"); if(no)no.style.display="block";
  var edit=document.getElementById("edit-taktik-ui"); if(edit)edit.style.display="none";
  var rec=document.getElementById("rec-ui"); if(rec)rec.style.display="none";
}

function tt91CloseFormationPicker(){
  var old=document.getElementById("tt91-formation-picker");
  if(old)old.remove();
}

function tt91SavedFormationName(s){
  return String((s && s.name) || "Utgångsläge");
}

function tt91SavedFormationFolder(s){
  return String((s && s.folder) || "Allmänt");
}

function tt91SnapFromSavedFormation(s){
  if(!s)return null;
  var st=s.state || s.data || s;
  // sparade uppställningar brukar ligga som state med players/ball/arrows...
  return {
    players: JSON.parse(JSON.stringify(st.players || [])),
    ball: JSON.parse(JSON.stringify(st.ball || {x:W/2,y:H/2})),
    arrows: JSON.parse(JSON.stringify(st.arrows || [])),
    labels: JSON.parse(JSON.stringify(st.labels || [])),
    freehandPaths: JSON.parse(JSON.stringify(st.freehandPaths || [])),
    zones: JSON.parse(JSON.stringify(st.zones || [])),
    movementPaths: []
  };
}

function tt91CreateFilmFromFormation(s){
  if(!s){
    showToast("Kunde inte läsa utgångsläget",false);
    return;
  }

  var snap=tt91SnapFromSavedFormation(s);
  if(!snap || !snap.players || !snap.players.length){
    showToast("Utgångsläget saknar spelare",false);
    return;
  }

  var baseName=tt91SavedFormationName(s);
  var film={
    name:"Film från "+baseName,
    folder:"Taktik",
    steps:[
      {name:"Startläge",snap:JSON.parse(JSON.stringify(snap))},
      {name:"Steg 1",snap:JSON.parse(JSON.stringify(snap))}
    ]
  };

  try{
    if(typeof tt90EnsureMetaInPlace==="function")tt90EnsureMetaInPlace(film);
    else if(typeof tt89EnsureModernMeta==="function")tt89EnsureModernMeta(film);
    else if(typeof addMetaToData==="function")film=addMetaToData(film);
  }catch(e){}

  try{
    taktikFilmer=(taktikFilmer||[]).concat([film]);
    editingTaktikIdx=taktikFilmer.length-1;
    editingStepIdx=0;
    isEditingTaktik=true;
    playback=null;
  }catch(e){}

  try{tt91CloseFormationPicker();}catch(e){}
  try{document.body.classList.remove("tt-v82-taktik-library");}catch(e){}
  var pitch=document.getElementById("pitch-wrapper");
  if(pitch)pitch.style.display="";

  try{
    if(typeof restoreSnap==="function")restoreSnap(JSON.parse(JSON.stringify(snap)));
    else{
      players=JSON.parse(JSON.stringify(snap.players||[]));
      ball=JSON.parse(JSON.stringify(snap.ball||{x:W/2,y:H/2}));
      arrows=JSON.parse(JSON.stringify(snap.arrows||[]));
      labels=JSON.parse(JSON.stringify(snap.labels||[]));
      freehandPaths=JSON.parse(JSON.stringify(snap.freehandPaths||[]));
      zones=JSON.parse(JSON.stringify(snap.zones||[]));
      movementPaths=[];
    }
  }catch(e){}

  var no=document.getElementById("no-rec-ui"); if(no)no.style.display="none";
  var rec=document.getElementById("rec-ui"); if(rec)rec.style.display="none";
  var edit=document.getElementById("edit-taktik-ui"); if(edit)edit.style.display="block";
  var tb=document.getElementById("taktikbar"); if(tb)tb.style.display="flex";

  try{
    if(document.getElementById("edit-taktik-title-lbl"))document.getElementById("edit-taktik-title-lbl").textContent="✏ "+film.name;
    if(document.getElementById("taktikbar-title"))document.getElementById("taktikbar-title").textContent=film.name;
    if(typeof renderEditSteps==="function")renderEditSteps();
    if(typeof updateEditStepUI==="function")updateEditStepUI();
    if(typeof tt76LoadStep==="function")tt76LoadStep(0);
    if(typeof render==="function")render();
    if(typeof tt88CaptureSavedSnapshot==="function")tt88CaptureSavedSnapshot();
  }catch(e){}

  showToast("Ny film skapad från utgångsläge");
}

function tt91OpenFormationPickerInTaktik(){
  tt91ActivateTaktikPanel();
  tt91CloseFormationPicker();

  var modal=document.createElement("div");
  modal.id="tt91-formation-picker";
  modal.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:14px;box-sizing:border-box";

  var box=document.createElement("div");
  box.style.cssText="width:min(520px,96vw);max-height:80vh;overflow:auto;background:#111a14;border:1px solid #2d4a35;border-radius:12px;padding:12px;box-shadow:0 18px 50px rgba(0,0,0,.45);box-sizing:border-box";

  var top=document.createElement("div");
  top.style.cssText="display:flex;align-items:center;gap:8px;margin-bottom:10px";

  var title=document.createElement("div");
  title.textContent="Ny film från utgångsläge";
  title.style.cssText="font-weight:900;color:#edf5ee;font-size:1rem;flex:1";

  var close=document.createElement("button");
  close.className="btn";
  close.textContent="Stäng";
  close.addEventListener("click",function(){tt91CloseFormationPicker();});

  top.appendChild(title);
  top.appendChild(close);
  box.appendChild(top);

  var hint=document.createElement("div");
  hint.textContent="Välj ett sparat utgångsläge. Filmen skapas i Taktik och sparas först när du trycker Spara.";
  hint.style.cssText="font-size:.76rem;color:#7aaa88;margin-bottom:10px;line-height:1.3";
  box.appendChild(hint);

  var list=document.createElement("div");
  list.style.cssText="display:flex;flex-direction:column;gap:6px";

  var items=(savedFormations||[]).slice().sort(function(a,b){
    return tt91SavedFormationName(a).localeCompare(tt91SavedFormationName(b),"sv");
  });

  if(!items.length){
    var empty=document.createElement("div");
    empty.textContent="Inga sparade utgångslägen hittades.";
    empty.style.cssText="color:#7aaa88;font-size:.85rem;padding:12px;border:1px dashed #2d4a35;border-radius:8px";
    list.appendChild(empty);
  }else{
    items.forEach(function(s){
      var row=document.createElement("button");
      row.type="button";
      row.style.cssText="display:flex;align-items:center;gap:8px;text-align:left;background:#17251b;border:1px solid #2d4a35;border-radius:8px;color:#edf5ee;padding:8px;cursor:pointer;width:100%;box-sizing:border-box";
      var txt=document.createElement("span");
      txt.style.cssText="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0";
      var name=document.createElement("span");
      name.textContent=tt91SavedFormationName(s);
      name.style.cssText="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
      var sub=document.createElement("span");
      sub.textContent=tt91SavedFormationFolder(s);
      sub.style.cssText="font-size:.72rem;color:#7aaa88";
      txt.appendChild(name);
      txt.appendChild(sub);
      var go=document.createElement("span");
      go.textContent="Skapa";
      go.style.cssText="font-size:.72rem;color:#4ae87a;border:1px solid #4ae87a;border-radius:999px;padding:3px 7px";
      row.appendChild(txt);
      row.appendChild(go);
      row.addEventListener("click",function(e){
        e.preventDefault();
        e.stopPropagation();
        tt91CreateFilmFromFormation(s);
      });
      list.appendChild(row);
    });
  }

  box.appendChild(list);
  modal.appendChild(box);
  modal.addEventListener("click",function(e){
    if(e.target===modal)tt91CloseFormationPicker();
  });

  document.body.appendChild(modal);
}

function tt91BindNewFilmFromFormationButtons(){
  var candidates=[];
  try{
    document.querySelectorAll("button").forEach(function(b){
      var txt=String(b.textContent||"").toLowerCase();
      var title=String(b.title||"").toLowerCase();
      var id=String(b.id||"").toLowerCase();
      if(
        (txt.indexOf("ny film")>=0 && (txt.indexOf("utgång")>=0 || txt.indexOf("uppställ")>=0)) ||
        (title.indexOf("ny film")>=0 && (title.indexOf("utgång")>=0 || title.indexOf("uppställ")>=0)) ||
        id.indexOf("from-formation")>=0 ||
        id.indexOf("formation-to-taktik")>=0 ||
        id.indexOf("new-taktik-from")>=0
      ){
        candidates.push(b);
      }
    });
  }catch(e){}

  candidates.forEach(function(b){
    if(b.dataset.tt91Bound==="1")return;
    b.dataset.tt91Bound="1";
    b.addEventListener("click",function(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      tt91OpenFormationPickerInTaktik();
      return false;
    },true);
  });
}

if(typeof renderTaktikList==="function" && !renderTaktikList._tt91Wrapped){
  var _renderTaktikList_v91=renderTaktikList;
  renderTaktikList=function(){
    var r=_renderTaktikList_v91.apply(this,arguments);
    setTimeout(function(){
      tt91BindNewFilmFromFormationButtons();
      try{if(typeof tt90RemoveWrongLegacyBadges==="function")tt90RemoveWrongLegacyBadges();}catch(e){}
      try{if(typeof tt88BindExitButton==="function")tt88BindExitButton();}catch(e){}
      try{if(typeof tt88StyleExitButton==="function")tt88StyleExitButton();}catch(e){}
      try{if(typeof tt79RebindCopyButtons==="function")tt79RebindCopyButtons();}catch(e){}
    },0);
    return r;
  };
  renderTaktikList._tt91Wrapped=true;
}

document.addEventListener("click",function(e){
  try{
    var b=e.target.closest && e.target.closest("button");
    if(!b)return;
    var txt=String(b.textContent||"").toLowerCase();
    var title=String(b.title||"").toLowerCase();
    if((txt.indexOf("ny film")>=0 && (txt.indexOf("utgång")>=0 || txt.indexOf("uppställ")>=0)) ||
       (title.indexOf("ny film")>=0 && (title.indexOf("utgång")>=0 || title.indexOf("uppställ")>=0))){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      tt91OpenFormationPickerInTaktik();
      return false;
    }
  }catch(err){}
},true);

tt91BindNewFilmFromFormationButtons();
setTimeout(tt91BindNewFilmFromFormationButtons,500);
setTimeout(tt91BindNewFilmFromFormationButtons,1500);

/* === slut v91-new-film-from-formation-taktik-modal === */


/* === v92-team-share-cross-device: delade taktikfilmer ska synas på andra enheter ===
   Buggen: delning kunde synas lokalt i Lagets men inte på annan tränare/enhet.
   Fix:
   - säkra att delning PATCH:as till Supabase med data._meta.sharedWithTeam=true
   - säkra att cloudLoadTaktik laddar alla relevanta taktikfilmer och klientfiltrerar rätt
   - jämför teamId/teamCode normaliserat
*/

function tt92NormTeam(v){
  return String(v||"").trim().toUpperCase().replace(/\s+/g,"-");
}

function tt92Profile(){
  try{ if(typeof getProfileSafeV10==="function"){var p=getProfileSafeV10(); if(p)return p;} }catch(e){}
  try{ if(typeof getUserProfile==="function"){var p2=getUserProfile(); if(p2)return p2;} }catch(e){}
  try{ var raw=localStorage.getItem("tt_profile_v1"); return raw?JSON.parse(raw):null; }catch(e){}
  return null;
}

function tt92Meta(obj){
  if(!obj)return {};
  if(obj._meta)return obj._meta;
  if(obj.meta)return obj.meta;
  if(obj.state && obj.state._meta)return obj.state._meta;
  if(obj.data && obj.data._meta)return obj.data._meta;
  return {};
}

function tt92EnsureOwnerMeta(tk){
  if(!tk || typeof tk!=="object")return tk;
  var p=tt92Profile();
  if(typeof tt90EnsureMetaInPlace==="function"){
    try{tt90EnsureMetaInPlace(tk);}catch(e){}
  }else if(typeof tt89EnsureModernMeta==="function"){
    try{tt89EnsureModernMeta(tk);}catch(e){}
  }
  if(!tk._meta)tk._meta={};
  if(p){
    tk._meta.ownerId=tk._meta.ownerId||p.ownerId||"local-owner";
    tk._meta.ownerName=tk._meta.ownerName||p.ownerName||"Tränare";
    tk._meta.teamId=tk._meta.teamId||p.teamId||p.teamCode||"MITT-LAG";
    tk._meta.teamCode=tk._meta.teamCode||p.teamCode||p.teamId||"MITT-LAG";
    tk._meta.teamName=tk._meta.teamName||p.teamName||tk._meta.teamCode;
  }
  return tk;
}

function tt92IsMine(obj){
  var p=tt92Profile();
  var m=tt92Meta(obj);
  if(!p || !m || !m.ownerId)return true;
  return String(m.ownerId)===String(p.ownerId);
}

function tt92SameTeam(obj){
  var p=tt92Profile();
  var m=tt92Meta(obj);
  if(!p || !m)return false;
  var pt=tt92NormTeam(p.teamId||p.teamCode);
  var mt=tt92NormTeam(m.teamId||m.teamCode);
  return !!pt && !!mt && pt===mt;
}

function tt92IsSharedToMyTeam(obj){
  var m=tt92Meta(obj);
  return tt92SameTeam(obj) && !!m.sharedWithTeam && !tt92IsMine(obj);
}

isMineV10=tt92IsMine;
isSameTeamSharedV10=tt92IsSharedToMyTeam;
isFileVisibleInScopeV10=function(obj,scope){
  if(scope==="team")return tt92IsSharedToMyTeam(obj);
  return tt92IsMine(obj);
};
isReadOnlyFileV10=function(obj){
  var m=tt92Meta(obj);
  return !tt92IsMine(obj) && !m.teamCanEdit;
};

function tt92ApplyShareMeta(tk,share,canEdit){
  tk=tt92EnsureOwnerMeta(tk);
  if(!tk._meta)tk._meta={};
  tk._meta.sharedWithTeam=!!share;
  tk._meta.teamCanEdit=!!canEdit;
  tk._meta.updatedAt=new Date().toISOString();
  tk._meta.schemaVersion=tk._meta.schemaVersion||2;
  tk._meta.kind="taktikfilm";
  return tk;
}

patchTaktikShareV10=function(tk,share){
  if(!tk || !tk.dbId){
    showToast("Spara filmen innan du delar den",false);
    return;
  }
  if(!tt92IsMine(tk)){
    showToast("Du kan inte ändra delning på någon annans fil",false);
    return;
  }

  var newTk=JSON.parse(JSON.stringify(tk));
  tt92ApplyShareMeta(newTk,share,false);

  cloudStatus(share?"Delar med laget...":"Tar bort delning...","#7aaa88");

  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{
    method:"PATCH",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify({
      name:newTk.name,
      data:newTk,
      type:"taktikfilm",
      folder:newTk.folder||tk.folder||"Taktik"
    })
  })
  .then(function(r){return r.json();})
  .then(function(data){
    Object.keys(newTk).forEach(function(k){tk[k]=newTk[k];});
    showToast(share?"Film delad med laget":"Film inte längre delad");
    cloudStatus(share?"✅ Delad med laget":"✅ Delning borttagen","#4ae87a");
    setTimeout(function(){try{cloudLoadTaktik();}catch(e){}},350);
  })
  .catch(function(err){
    showToast("Kunde inte ändra delning",false);
    cloudStatus("❌ "+err.message,"#e84a4a");
  });
};

function tt92DedupeLoadedTaktik(list){
  var by={};
  (list||[]).forEach(function(tk){
    if(!tk || !tk.steps || tk.steps.length<2)return;
    var key=tk.dbId ? "id:"+tk.dbId : "local:"+String(tk.name||"").trim().toLowerCase()+"|"+String(tk.folder||"Taktik");
    by[key]=tk;
  });
  return Object.keys(by).map(function(k){return by[k];});
}

function tt92RebuildTaktikFolders(){
  try{
    var seen={};taktikFolders=["Taktik","Träning"];seen["Taktik"]=true;seen["Träning"]=true;
    (taktikFilmer||[]).forEach(function(tk){
      var f=tk.folder||"Taktik";
      if(f&&!seen[f]){seen[f]=true;taktikFolders.push(f);}
    });
  }catch(e){}
}

cloudLoadTaktik=function(){
  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.taktikfilm&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){
      if(!Array.isArray(data)){
        cloudStatus("❌ Kunde inte läsa taktikfilmer","#e84a4a");
        return;
      }

      var loaded=[];
      data.filter(function(row){return row.type==="taktikfilm";}).forEach(function(row){
        var tk=row.data||{};
        if(!tk.steps || tk.steps.length<2)return;
        tk.dbId=row.id;
        tk.name=tk.name||row.name||"Namnlös film";
        tk.folder=tk.folder||row.folder||"Taktik";

        // Viktigt: äldre rows kan ha meta i data men sakna top-level-spår.
        if(!tk._meta && row.data && row.data._meta)tk._meta=row.data._meta;

        // Ladda in både mina och lagets delade. Själva fliken filtrerar sedan.
        if(tt92IsMine(tk) || tt92IsSharedToMyTeam(tk)){
          loaded.push(tk);
        }
      });

      taktikFilmer=tt92DedupeLoadedTaktik(loaded);
      tt92RebuildTaktikFolders();

      try{renderTaktikList();}catch(e){}
      cloudStatus(taktikFilmer.length+" taktikfilmer laddade","#4ae87a");
    })
    .catch(function(err){
      cloudStatus("❌ Fel: "+err.message,"#e84a4a");
    });
};

// Gör delningsknapparna extra robusta efter render.
function tt92RebindShareButtons(){
  try{
    var rows=document.querySelectorAll("#taktik-list .row");
    Array.prototype.slice.call(rows).forEach(function(row){
      var nm=row.querySelector(".row-name"); if(!nm)return;
      var name=String(nm.textContent||"").trim();
      var tk=(taktikFilmer||[]).find(function(x){return String(x.name||"").trim()===name;});
      if(!tk || !tt92IsMine(tk))return;

      var buttons=Array.prototype.slice.call(row.querySelectorAll("button.sa"));
      var shareBtn=buttons.find(function(b){
        var title=String(b.title||"").toLowerCase();
        var txt=String(b.textContent||"");
        return title.indexOf("dela")>=0 || title.indexOf("sluta dela")>=0 || txt.indexOf("👥")>=0 || txt.indexOf("🙈")>=0;
      });
      if(!shareBtn || shareBtn.dataset.tt92ShareBound==="1")return;

      var clone=shareBtn.cloneNode(true);
      clone.dataset.tt92ShareBound="1";
      shareBtn.parentNode.replaceChild(clone,shareBtn);
      clone.addEventListener("click",function(e){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation)e.stopImmediatePropagation();
        patchTaktikShareV10(tk,!tt92Meta(tk).sharedWithTeam);
        return false;
      },true);
    });
  }catch(e){}
}

if(typeof renderTaktikList==="function" && !renderTaktikList._tt92Wrapped){
  var _renderTaktikList_v92=renderTaktikList;
  renderTaktikList=function(){
    var r=_renderTaktikList_v92.apply(this,arguments);
    setTimeout(function(){
      tt92RebindShareButtons();
      try{if(typeof tt90RemoveWrongLegacyBadges==="function")tt90RemoveWrongLegacyBadges();}catch(e){}
      try{if(typeof tt88BindExitButton==="function")tt88BindExitButton();}catch(e){}
      try{if(typeof tt88StyleExitButton==="function")tt88StyleExitButton();}catch(e){}
      try{if(typeof tt79RebindCopyButtons==="function")tt79RebindCopyButtons();}catch(e){}
      try{if(typeof tt91BindNewFilmFromFormationButtons==="function")tt91BindNewFilmFromFormationButtons();}catch(e){}
    },0);
    return r;
  };
  renderTaktikList._tt92Wrapped=true;
}

setTimeout(function(){
  try{cloudLoadTaktik();}catch(e){}
},700);

/* === slut v92-team-share-cross-device === */


/* === v93-formation-share-cross-device: delade utgångslägen ska synas på andra enheter ===
   Motsvarande v92, men för Utgångslägen/Uppställningar.
*/

function ff93NormTeam(v){
  return String(v||"").trim().toUpperCase().replace(/\s+/g,"-");
}

function ff93Profile(){
  try{ if(typeof getProfileSafeV10==="function"){var p=getProfileSafeV10(); if(p)return p;} }catch(e){}
  try{ if(typeof getUserProfile==="function"){var p2=getUserProfile(); if(p2)return p2;} }catch(e){}
  try{ var raw=localStorage.getItem("tt_profile_v1"); return raw?JSON.parse(raw):null; }catch(e){}
  return null;
}

function ff93State(s){
  if(!s)return {};
  return s.state || s.data || s;
}

function ff93Meta(s){
  if(!s)return {};
  if(s._meta)return s._meta;
  if(s.state && s.state._meta)return s.state._meta;
  if(s.data && s.data._meta)return s.data._meta;
  return {};
}

function ff93EnsureMetaInPlace(s){
  if(!s || typeof s!=="object")return s;
  var p=ff93Profile();
  if(!p){
    p={ownerId:"local-owner",ownerName:"Tränare",teamId:"MITT-LAG",teamCode:"MITT-LAG",teamName:"MITT-LAG"};
  }

  var st=ff93State(s);
  if(!st._meta || typeof st._meta!=="object")st._meta={};

  st._meta.ownerId = st._meta.ownerId || p.ownerId || "local-owner";
  st._meta.ownerName = st._meta.ownerName || p.ownerName || "Tränare";
  st._meta.teamId = st._meta.teamId || p.teamId || p.teamCode || "MITT-LAG";
  st._meta.teamCode = st._meta.teamCode || p.teamCode || p.teamId || "MITT-LAG";
  st._meta.teamName = st._meta.teamName || p.teamName || st._meta.teamCode;
  if(typeof st._meta.sharedWithTeam==="undefined")st._meta.sharedWithTeam=false;
  if(typeof st._meta.teamCanEdit==="undefined")st._meta.teamCanEdit=false;
  st._meta.updatedAt = st._meta.updatedAt || new Date().toISOString();
  st._meta.schemaVersion = st._meta.schemaVersion || 2;
  st._meta.kind = "uppstallning";

  s._meta = st._meta;
  if(s.state)s.state=st;
  else if(s.data)s.data=st;
  else s.state=st;

  delete s._legacyV53;
  delete s._legacyV55;

  return s;
}

function ff93IsMine(s){
  var p=ff93Profile();
  var m=ff93Meta(s);
  if(!p || !m || !m.ownerId)return true;
  return String(m.ownerId)===String(p.ownerId);
}

function ff93SameTeam(s){
  var p=ff93Profile();
  var m=ff93Meta(s);
  if(!p || !m)return false;
  var pt=ff93NormTeam(p.teamId||p.teamCode);
  var mt=ff93NormTeam(m.teamId||m.teamCode);
  return !!pt && !!mt && pt===mt;
}

function ff93SharedToMyTeam(s){
  var m=ff93Meta(s);
  return ff93SameTeam(s) && !!m.sharedWithTeam && !ff93IsMine(s);
}

function ff93VisibleInScope(s,scope){
  return scope==="team" ? ff93SharedToMyTeam(s) : ff93IsMine(s);
}

isMineV10=function(obj){
  if(obj && obj.steps && typeof tt92IsMine==="function")return tt92IsMine(obj);
  return ff93IsMine(obj);
};
isSameTeamSharedV10=function(obj){
  if(obj && obj.steps && typeof tt92IsSharedToMyTeam==="function")return tt92IsSharedToMyTeam(obj);
  return ff93SharedToMyTeam(obj);
};
isFileVisibleInScopeV10=function(obj,scope){
  if(obj && obj.steps && typeof tt92IsSharedToMyTeam==="function"){
    return scope==="team" ? tt92IsSharedToMyTeam(obj) : tt92IsMine(obj);
  }
  return ff93VisibleInScope(obj,scope);
};
isReadOnlyFileV10=function(obj){
  if(obj && obj.steps && typeof tt92IsMine==="function"){
    var mt=(typeof tt92Meta==="function"?tt92Meta(obj):{});
    return !tt92IsMine(obj) && !mt.teamCanEdit;
  }
  var m=ff93Meta(obj);
  return !ff93IsMine(obj) && !m.teamCanEdit;
};

function ff93ApplyShareMeta(s,share,canEdit){
  ff93EnsureMetaInPlace(s);
  var st=ff93State(s);
  st._meta.sharedWithTeam=!!share;
  st._meta.teamCanEdit=!!canEdit;
  st._meta.updatedAt=new Date().toISOString();
  st._meta.schemaVersion=st._meta.schemaVersion||2;
  st._meta.kind="uppstallning";
  s._meta=st._meta;
  if(s.state)s.state=st;
  else s.state=st;
  return s;
}

patchFormationShareV10=function(s,share){
  if(!s || !s.id){
    showToast("Spara utgångsläget innan du delar det",false);
    return;
  }
  if(!ff93IsMine(s)){
    showToast("Du kan inte ändra delning på någon annans fil",false);
    return;
  }

  var copy=JSON.parse(JSON.stringify(s));
  ff93ApplyShareMeta(copy,share,false);
  var data=ff93State(copy);

  cloudStatus(share?"Delar utgångsläge med laget...":"Tar bort delning...","#7aaa88");

  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+s.id,{
    method:"PATCH",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify({
      name:copy.name,
      data:data,
      type:"uppstallning",
      folder:copy.folder||"Allmänt"
    })
  })
  .then(function(r){return r.json();})
  .then(function(){
    s.state=data;
    s._meta=data._meta;
    showToast(share?"Utgångsläge delat med laget":"Utgångsläge inte längre delat");
    cloudStatus(share?"✅ Delat med laget":"✅ Delning borttagen","#4ae87a");
    setTimeout(function(){try{cloudLoadSaves();}catch(e){}},350);
  })
  .catch(function(err){
    showToast("Kunde inte ändra delning",false);
    cloudStatus("❌ "+err.message,"#e84a4a");
  });
};

patchFormationShareV26=patchFormationShareV10;
patchFormationShareV68=patchFormationShareV10;

function ff93NormalizeLoadedFormation(row){
  var s={
    id:row.id,
    name:row.name || (row.data && row.data.name) || "Namnlöst utgångsläge",
    state:row.data || {},
    folder:row.folder || (row.data && row.data.folder) || "Allmänt"
  };
  if(s.state && s.state._meta)s._meta=s.state._meta;
  return s;
}

function ff93DedupeSaves(list){
  var by={};
  (list||[]).forEach(function(s){
    if(!s)return;
    var key=s.id ? "id:"+s.id : "local:"+String(s.name||"").trim().toLowerCase()+"|"+String(s.folder||"Allmänt");
    by[key]=s;
  });
  return Object.keys(by).map(function(k){return by[k];});
}

function ff93RebuildFolders(){
  try{
    var seen={};folders=["Allmänt"];seen["Allmänt"]=true;
    (savedFormations||[]).forEach(function(s){
      var f=s.folder||"Allmänt";
      if(f&&!seen[f]){seen[f]=true;folders.push(f);}
    });
    if(typeof updateFolderSelect==="function")updateFolderSelect();
  }catch(e){}
}

cloudLoadSaves=function(){
  cloudStatus("Laddar...","#7aaa88");
  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.uppstallning&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){
      if(!Array.isArray(data)){
        cloudStatus("❌ Kunde inte läsa utgångslägen","#e84a4a");
        return;
      }

      var loaded=[];
      data.filter(function(row){return row.type==="uppstallning";}).forEach(function(row){
        if(!row.name && !(row.data && row.data.players))return;
        var s=ff93NormalizeLoadedFormation(row);
        if(ff93IsMine(s) || ff93SharedToMyTeam(s)){
          loaded.push(s);
        }
      });

      savedFormations=ff93DedupeSaves(loaded);
      ff93RebuildFolders();

      try{renderSavesList();}catch(e){}
      cloudStatus(savedFormations.length+" utgångslägen laddade ✅","#4ae87a");
    })
    .catch(function(err){
      cloudStatus("❌ Fel: "+err.message,"#e84a4a");
    });
};

function ff93CopyFormationToMine(s){
  if(!s){
    showToast("Kunde inte kopiera utgångsläge",false);
    return;
  }

  var srcState=ff93State(s);
  var copyState=JSON.parse(JSON.stringify(srcState||{}));
  delete copyState._meta;

  var p=ff93Profile() || {ownerId:"local-owner",ownerName:"Tränare",teamId:"MITT-LAG",teamCode:"MITT-LAG",teamName:"MITT-LAG"};
  copyState._meta={
    ownerId:p.ownerId,
    ownerName:p.ownerName,
    teamId:p.teamId||p.teamCode,
    teamCode:p.teamCode||p.teamId,
    teamName:p.teamName||p.teamCode||p.teamId,
    sharedWithTeam:false,
    teamCanEdit:false,
    updatedAt:new Date().toISOString(),
    schemaVersion:2,
    kind:"uppstallning"
  };

  var name="Kopia av "+(s.name||"utgångsläge");
  var folder=s.folder||"Allmänt";

  cloudStatus("Skapar kopia...","#7aaa88");

  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{
    method:"POST",
    headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
    body:JSON.stringify({
      name:name,
      data:copyState,
      type:"uppstallning",
      folder:folder
    })
  })
  .then(function(r){return r.json();})
  .then(function(data){
    if(data && data[0] && data[0].id){
      savedFormations=(savedFormations||[]).concat([{
        id:data[0].id,
        name:name,
        state:copyState,
        folder:folder,
        _meta:copyState._meta
      }]);
      try{saveScope="mine";}catch(e){}
      try{currentFolder="Alla";}catch(e){}
      showToast("Kopia skapad i Mina");
      cloudStatus("✅ Kopia skapad","#4ae87a");
      setTimeout(function(){try{cloudLoadSaves();}catch(e){}},350);
    }else{
      var msg=(data&&data.message)?data.message:"Kunde inte skapa kopia";
      showToast(msg,false);
      cloudStatus("❌ "+msg,"#e84a4a");
    }
  })
  .catch(function(err){
    showToast("Kunde inte kopiera utgångsläge",false);
    cloudStatus("❌ "+err.message,"#e84a4a");
  });
}

function ff93RebindFormationButtons(){
  try{
    var rows=document.querySelectorAll("#saves-list .row");
    Array.prototype.slice.call(rows).forEach(function(row){
      var nm=row.querySelector(".row-name"); if(!nm)return;
      var name=String(nm.textContent||"").trim();
      var s=(savedFormations||[]).find(function(x){return String(x.name||"").trim()===name;});
      if(!s)return;

      var mine=ff93IsMine(s);
      var buttons=Array.prototype.slice.call(row.querySelectorAll("button.sa"));

      if(mine){
        var shareBtn=buttons.find(function(b){
          var title=String(b.title||"").toLowerCase();
          var txt=String(b.textContent||"");
          return title.indexOf("dela")>=0 || title.indexOf("sluta dela")>=0 || txt.indexOf("👥")>=0 || txt.indexOf("🙈")>=0;
        });
        if(shareBtn && shareBtn.dataset.ff93ShareBound!=="1"){
          var clone=shareBtn.cloneNode(true);
          clone.dataset.ff93ShareBound="1";
          shareBtn.parentNode.replaceChild(clone,shareBtn);
          clone.addEventListener("click",function(e){
            e.preventDefault();
            e.stopPropagation();
            if(e.stopImmediatePropagation)e.stopImmediatePropagation();
            patchFormationShareV10(s,!ff93Meta(s).sharedWithTeam);
            return false;
          },true);
        }
      }

      if(!mine){
        var copyBtn=buttons.find(function(b){
          var title=String(b.title||"").toLowerCase();
          var txt=String(b.textContent||"");
          return title.indexOf("kopiera")>=0 || txt.indexOf("⧉")>=0 || txt.toLowerCase().indexOf("kopiera")>=0;
        });
        if(copyBtn && copyBtn.dataset.ff93CopyBound!=="1"){
          var c=copyBtn.cloneNode(true);
          c.dataset.ff93CopyBound="1";
          copyBtn.parentNode.replaceChild(c,copyBtn);
          c.addEventListener("click",function(e){
            e.preventDefault();
            e.stopPropagation();
            if(e.stopImmediatePropagation)e.stopImmediatePropagation();
            ff93CopyFormationToMine(s);
            return false;
          },true);
        }
      }
    });
  }catch(e){}
}

if(typeof renderSavesList==="function" && !renderSavesList._ff93Wrapped){
  var _renderSavesList_v93=renderSavesList;
  renderSavesList=function(){
    var r=_renderSavesList_v93.apply(this,arguments);
    setTimeout(function(){
      ff93RebindFormationButtons();
      try{if(typeof tt90RemoveWrongLegacyBadges==="function")tt90RemoveWrongLegacyBadges();}catch(e){}
    },0);
    setTimeout(ff93RebindFormationButtons,120);
    return r;
  };
  renderSavesList._ff93Wrapped=true;
}

setTimeout(function(){
  try{cloudLoadSaves();}catch(e){}
},700);

/* === slut v93-formation-share-cross-device === */


/* === v94-formation-owner-mine-and-team-label: ägaren behåller i Mina + ägare visas i Lagets === */

function ff94Norm(v){
  return String(v||"").trim().toUpperCase().replace(/\s+/g,"-");
}

function ff94Profile(){
  try{ if(typeof ff93Profile==="function"){var p=ff93Profile(); if(p)return p;} }catch(e){}
  try{ if(typeof getProfileSafeV10==="function"){var p2=getProfileSafeV10(); if(p2)return p2;} }catch(e){}
  try{ if(typeof getUserProfile==="function"){var p3=getUserProfile(); if(p3)return p3;} }catch(e){}
  try{ var raw=localStorage.getItem("tt_profile_v1"); return raw?JSON.parse(raw):null; }catch(e){}
  return null;
}

function ff94State(s){
  if(typeof ff93State==="function")return ff93State(s);
  return s && (s.state || s.data || s) || {};
}

function ff94Meta(s){
  if(typeof ff93Meta==="function")return ff93Meta(s);
  if(!s)return {};
  if(s._meta)return s._meta;
  if(s.state && s.state._meta)return s.state._meta;
  if(s.data && s.data._meta)return s.data._meta;
  return {};
}

function ff94OwnerName(s){
  var m=ff94Meta(s);
  return m.ownerName || "Okänd ägare";
}

function ff94IsFormation(obj){
  if(!obj || obj.steps)return false;
  var st=ff94State(obj);
  return !!(st && (st.players || st.ball || st.arrows || st.labels || st.zones || obj.state));
}

function ff94IsMineFormation(s){
  var p=ff94Profile();
  var m=ff94Meta(s);
  if(!p || !m || !m.ownerId)return true;
  return String(m.ownerId)===String(p.ownerId);
}

function ff94SameTeamFormation(s){
  var p=ff94Profile();
  var m=ff94Meta(s);
  if(!p || !m)return false;
  var pt=ff94Norm(p.teamId||p.teamCode);
  var mt=ff94Norm(m.teamId||m.teamCode);
  return !!pt && !!mt && pt===mt;
}

function ff94SharedToMyTeamFormation(s){
  var m=ff94Meta(s);
  return ff94SameTeamFormation(s) && !!m.sharedWithTeam && !ff94IsMineFormation(s);
}

// Ägarens delade filer ska fortfarande räknas som Mina.
// Andras delade filer ska bara visas i Lagets.
function ff94FormationVisible(s,scope){
  if(scope==="team")return ff94SharedToMyTeamFormation(s);
  return ff94IsMineFormation(s);
}

// Behåll v92-taktiklogiken för taktikfilmer, men använd ny formationslogik för utgångslägen.
isMineV10=function(obj){
  if(obj && obj.steps && typeof tt92IsMine==="function")return tt92IsMine(obj);
  if(ff94IsFormation(obj))return ff94IsMineFormation(obj);
  return ff94IsMineFormation(obj);
};
isSameTeamSharedV10=function(obj){
  if(obj && obj.steps && typeof tt92IsSharedToMyTeam==="function")return tt92IsSharedToMyTeam(obj);
  if(ff94IsFormation(obj))return ff94SharedToMyTeamFormation(obj);
  return ff94SharedToMyTeamFormation(obj);
};
isFileVisibleInScopeV10=function(obj,scope){
  if(obj && obj.steps && typeof tt92IsSharedToMyTeam==="function"){
    return scope==="team" ? tt92IsSharedToMyTeam(obj) : tt92IsMine(obj);
  }
  return ff94FormationVisible(obj,scope);
};
isReadOnlyFileV10=function(obj){
  if(obj && obj.steps && typeof tt92IsMine==="function"){
    var mt=(typeof tt92Meta==="function"?tt92Meta(obj):{});
    return !tt92IsMine(obj) && !mt.teamCanEdit;
  }
  var m=ff94Meta(obj);
  return !ff94IsMineFormation(obj) && !m.teamCanEdit;
};

// Ladda alla egna + andras delade från samma lag.
// Viktigt: egna delade ska vara kvar i savedFormations, annars kan de försvinna ur Mina.
cloudLoadSaves=function(){
  cloudStatus("Laddar...","#7aaa88");
  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.uppstallning&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){
      if(!Array.isArray(data)){
        cloudStatus("❌ Kunde inte läsa utgångslägen","#e84a4a");
        return;
      }

      var loaded=[];
      data.filter(function(row){return row.type==="uppstallning";}).forEach(function(row){
        if(!row.name && !(row.data && row.data.players))return;

        var s;
        if(typeof ff93NormalizeLoadedFormation==="function"){
          s=ff93NormalizeLoadedFormation(row);
        }else{
          s={id:row.id,name:row.name||"Namnlöst utgångsläge",state:row.data||{},folder:row.folder||"Allmänt"};
          if(s.state && s.state._meta)s._meta=s.state._meta;
        }

        if(ff94IsMineFormation(s) || ff94SharedToMyTeamFormation(s)){
          loaded.push(s);
        }
      });

      if(typeof ff93DedupeSaves==="function")savedFormations=ff93DedupeSaves(loaded);
      else{
        var by={};
        loaded.forEach(function(s){by[s.id?"id:"+s.id:String(s.name||"")]=s;});
        savedFormations=Object.keys(by).map(function(k){return by[k];});
      }

      if(typeof ff93RebuildFolders==="function")ff93RebuildFolders();
      else if(typeof updateFolderSelect==="function")updateFolderSelect();

      try{renderSavesList();}catch(e){}
      cloudStatus(savedFormations.length+" utgångslägen laddade ✅","#4ae87a");
    })
    .catch(function(err){
      cloudStatus("❌ Fel: "+err.message,"#e84a4a");
    });
};

function ff94PatchTeamRows(){
  try{
    if(typeof saveScope!=="undefined" && saveScope!=="team")return;

    Array.prototype.slice.call(document.querySelectorAll("#saves-list .row")).forEach(function(row){
      var nm=row.querySelector(".row-name");
      var sub=row.querySelector(".row-sub");
      if(!nm || !sub)return;

      var name=String(nm.textContent||"").trim();
      var s=(savedFormations||[]).find(function(x){return String(x.name||"").trim()===name;});
      if(!s)return;

      var mine=ff94IsMineFormation(s);
      if(mine)return;

      var folder=s.folder||"Allmänt";
      var owner=ff94OwnerName(s);
      var wanted=folder+" · "+owner+" · skrivskyddad";
      sub.textContent=wanted;
    });
  }catch(e){}
}

function ff94EnsureMineScopeAfterShare(){
  // När ägaren delar från Mina ska appen inte hoppa bort från Mina visuellt.
  try{
    if(typeof saveScope!=="undefined" && saveScope!=="team"){
      saveScope="mine";
    }
  }catch(e){}
}

if(typeof patchFormationShareV10==="function" && !patchFormationShareV10._ff94Wrapped){
  var _patchFormationShareV10_ff94=patchFormationShareV10;
  patchFormationShareV10=function(s,share){
    ff94EnsureMineScopeAfterShare();
    var r=_patchFormationShareV10_ff94.apply(this,arguments);
    setTimeout(function(){
      ff94EnsureMineScopeAfterShare();
      try{cloudLoadSaves();}catch(e){}
    },500);
    return r;
  };
  patchFormationShareV10._ff94Wrapped=true;
  patchFormationShareV26=patchFormationShareV10;
  patchFormationShareV68=patchFormationShareV10;
}

if(typeof renderSavesList==="function" && !renderSavesList._ff94Wrapped){
  var _renderSavesList_v94=renderSavesList;
  renderSavesList=function(){
    var r=_renderSavesList_v94.apply(this,arguments);
    setTimeout(function(){
      ff94PatchTeamRows();
      try{if(typeof ff93RebindFormationButtons==="function")ff93RebindFormationButtons();}catch(e){}
      try{if(typeof tt90RemoveWrongLegacyBadges==="function")tt90RemoveWrongLegacyBadges();}catch(e){}
    },0);
    setTimeout(ff94PatchTeamRows,120);
    setTimeout(ff94PatchTeamRows,350);
    return r;
  };
  renderSavesList._ff94Wrapped=true;
}

setTimeout(function(){
  try{cloudLoadSaves();}catch(e){}
},700);

/* === slut v94-formation-owner-mine-and-team-label === */


/* === v95-formation-ownername-fallback: gamla utgångslägen med gammalt ownerId ska visas i Mina ===
   Bakgrund:
   Äldre utgångslägen kan ha ownerId från en tidigare lokal profil.
   Då syns de i Lagets eftersom team/shared stämmer, men inte i Mina eftersom ownerId inte matchar.
   Fix:
   - För utgångslägen räknas filen som min om ownerId matchar
   - eller om ownerName + teamCode/teamId matchar aktuell profil
   - eller om ownerId saknas men ownerName/team matchar.
*/

function ff95CleanName(v){
  return String(v||"").trim().toLowerCase();
}

function ff95NormTeam(v){
  return String(v||"").trim().toUpperCase().replace(/\s+/g,"-");
}

function ff95Profile(){
  try{ if(typeof ff94Profile==="function"){var p=ff94Profile(); if(p)return p;} }catch(e){}
  try{ if(typeof ff93Profile==="function"){var p2=ff93Profile(); if(p2)return p2;} }catch(e){}
  try{ if(typeof getProfileSafeV10==="function"){var p3=getProfileSafeV10(); if(p3)return p3;} }catch(e){}
  try{ if(typeof getUserProfile==="function"){var p4=getUserProfile(); if(p4)return p4;} }catch(e){}
  try{ var raw=localStorage.getItem("tt_profile_v1"); return raw?JSON.parse(raw):null; }catch(e){}
  return null;
}

function ff95Meta(s){
  if(typeof ff94Meta==="function")return ff94Meta(s);
  if(typeof ff93Meta==="function")return ff93Meta(s);
  if(!s)return {};
  if(s._meta)return s._meta;
  if(s.state && s.state._meta)return s.state._meta;
  if(s.data && s.data._meta)return s.data._meta;
  return {};
}

function ff95State(s){
  if(typeof ff94State==="function")return ff94State(s);
  if(typeof ff93State==="function")return ff93State(s);
  return s && (s.state || s.data || s) || {};
}

function ff95IsFormation(obj){
  if(!obj || obj.steps)return false;
  var st=ff95State(obj);
  return !!(st && (st.players || st.ball || st.arrows || st.labels || st.zones || obj.state || obj.data));
}

function ff95SameTeamFormation(s){
  var p=ff95Profile();
  var m=ff95Meta(s);
  if(!p || !m)return false;
  var pt=ff95NormTeam(p.teamId||p.teamCode);
  var mt=ff95NormTeam(m.teamId||m.teamCode);
  return !!pt && !!mt && pt===mt;
}

function ff95IsMineFormation(s){
  var p=ff95Profile();
  var m=ff95Meta(s);

  // Gamla lokala filer utan metadata ska fortfarande betraktas som mina.
  if(!m || (!m.ownerId && !m.ownerName))return true;
  if(!p)return true;

  // Primär modern jämförelse.
  if(m.ownerId && p.ownerId && String(m.ownerId)===String(p.ownerId))return true;

  // Viktig fallback för äldre utgångslägen:
  // samma ägarnamn + samma lag = min fil, även om ownerId skapats om.
  var sameName = !!m.ownerName && !!p.ownerName && ff95CleanName(m.ownerName)===ff95CleanName(p.ownerName);
  var sameTeam = ff95SameTeamFormation(s);

  if(sameName && sameTeam)return true;

  return false;
}

function ff95SharedToMyTeamFormation(s){
  var m=ff95Meta(s);
  return ff95SameTeamFormation(s) && !!m.sharedWithTeam && !ff95IsMineFormation(s);
}

function ff95FormationVisible(s,scope){
  if(scope==="team")return ff95SharedToMyTeamFormation(s);
  return ff95IsMineFormation(s);
}

// Sätt om globala behörighetsfunktioner, men lämna taktikfilmer till v92.
isMineV10=function(obj){
  if(obj && obj.steps && typeof tt92IsMine==="function")return tt92IsMine(obj);
  if(ff95IsFormation(obj))return ff95IsMineFormation(obj);
  return ff95IsMineFormation(obj);
};

isSameTeamSharedV10=function(obj){
  if(obj && obj.steps && typeof tt92IsSharedToMyTeam==="function")return tt92IsSharedToMyTeam(obj);
  if(ff95IsFormation(obj))return ff95SharedToMyTeamFormation(obj);
  return ff95SharedToMyTeamFormation(obj);
};

isFileVisibleInScopeV10=function(obj,scope){
  if(obj && obj.steps && typeof tt92IsSharedToMyTeam==="function"){
    return scope==="team" ? tt92IsSharedToMyTeam(obj) : tt92IsMine(obj);
  }
  return ff95FormationVisible(obj,scope);
};

isReadOnlyFileV10=function(obj){
  if(obj && obj.steps && typeof tt92IsMine==="function"){
    var mt=(typeof tt92Meta==="function"?tt92Meta(obj):{});
    return !tt92IsMine(obj) && !mt.teamCanEdit;
  }
  var m=ff95Meta(obj);
  return !ff95IsMineFormation(obj) && !m.teamCanEdit;
};

// Ladda egna + andras delade igen med den mer toleranta ägarlogiken.
cloudLoadSaves=function(){
  cloudStatus("Laddar...","#7aaa88");
  return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.uppstallning&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){
      if(!Array.isArray(data)){
        cloudStatus("❌ Kunde inte läsa utgångslägen","#e84a4a");
        return;
      }

      var loaded=[];
      data.filter(function(row){return row.type==="uppstallning";}).forEach(function(row){
        if(!row.name && !(row.data && row.data.players))return;

        var s;
        if(typeof ff93NormalizeLoadedFormation==="function"){
          s=ff93NormalizeLoadedFormation(row);
        }else{
          s={id:row.id,name:row.name||"Namnlöst utgångsläge",state:row.data||{},folder:row.folder||"Allmänt"};
          if(s.state && s.state._meta)s._meta=s.state._meta;
        }

        if(ff95IsMineFormation(s) || ff95SharedToMyTeamFormation(s)){
          loaded.push(s);
        }
      });

      if(typeof ff93DedupeSaves==="function")savedFormations=ff93DedupeSaves(loaded);
      else{
        var by={};
        loaded.forEach(function(s){by[s.id?"id:"+s.id:String(s.name||"")]=s;});
        savedFormations=Object.keys(by).map(function(k){return by[k];});
      }

      if(typeof ff93RebuildFolders==="function")ff93RebuildFolders();
      else if(typeof updateFolderSelect==="function")updateFolderSelect();

      try{renderSavesList();}catch(e){}
      cloudStatus(savedFormations.length+" utgångslägen laddade ✅","#4ae87a");
    })
    .catch(function(err){
      cloudStatus("❌ Fel: "+err.message,"#e84a4a");
    });
};

function ff95PatchTeamLabels(){
  try{
    if(typeof saveScope!=="undefined" && saveScope!=="team")return;

    Array.prototype.slice.call(document.querySelectorAll("#saves-list .row")).forEach(function(row){
      var nm=row.querySelector(".row-name");
      var sub=row.querySelector(".row-sub");
      if(!nm || !sub)return;

      var name=String(nm.textContent||"").trim();
      var s=(savedFormations||[]).find(function(x){return String(x.name||"").trim()===name;});
      if(!s)return;

      if(ff95IsMineFormation(s))return;

      var folder=s.folder||"Allmänt";
      var m=ff95Meta(s);
      var owner=m.ownerName||"Okänd ägare";
      sub.textContent=folder+" · "+owner+" · skrivskyddad";
    });
  }catch(e){}
}

if(typeof renderSavesList==="function" && !renderSavesList._ff95Wrapped){
  var _renderSavesList_v95=renderSavesList;
  renderSavesList=function(){
    var r=_renderSavesList_v95.apply(this,arguments);
    setTimeout(function(){
      ff95PatchTeamLabels();
      try{if(typeof ff93RebindFormationButtons==="function")ff93RebindFormationButtons();}catch(e){}
      try{if(typeof ff94PatchTeamRows==="function")ff94PatchTeamRows();}catch(e){}
    },0);
    setTimeout(ff95PatchTeamLabels,120);
    setTimeout(ff95PatchTeamLabels,350);
    return r;
  };
  renderSavesList._ff95Wrapped=true;
}

setTimeout(function(){
  try{cloudLoadSaves();}catch(e){}
},700);

/* === slut v95-formation-ownername-fallback === */


/* === v98-formation-compact-css-only: försiktig layoutkompaktning för Utgångslägen ===
   Viktigt: flyttar inte Mina/Lagets, duplicerar inga kontroller.
*/

function ui98FormationPanel(){
  return document.getElementById("panel-saves") ||
         document.getElementById("panel-uppstallning") ||
         document.getElementById("panel-start") ||
         null;
}

function ui98SavesList(panel){
  if(!panel)return null;
  return panel.querySelector("#saves-list") || document.getElementById("saves-list");
}

function ui98LooksLoadedInfo(txt){
  txt=String(txt||"").trim().toLowerCase();
  return /^(\d+\s+)?(utgångslägen|uppställningar)\s+laddade/.test(txt) ||
         /^(\d+\s+)?(utgångslägen|uppställningar)\s+laddade\s*✅?$/.test(txt);
}

function ui98HideLoadedInfo(panel){
  if(!panel)return;
  try{
    Array.prototype.slice.call(panel.querySelectorAll("div,span,p,small")).forEach(function(el){
      var txt=String(el.textContent||"").trim();
      if(txt && ui98LooksLoadedInfo(txt)){
        el.classList.add("tt98-hide-loaded-info");
      }
    });
  }catch(e){}
}

function ui98IsFolderButton(btn){
  if(!btn)return false;
  var txt=String(btn.textContent||"").trim();
  var title=String(btn.title||"").toLowerCase();
  var cls=String(btn.className||"").toLowerCase();
  if(!txt)return false;
  if(txt==="Mina" || txt==="Lagets")return false;
  if(title.indexOf("dela")>=0 || title.indexOf("kopiera")>=0 || title.indexOf("radera")>=0 || title.indexOf("flytta")>=0)return false;
  if(cls.indexOf("sa")>=0)return false; // filradsknappar
  if(txt.length>28)return false;
  return true;
}

function ui98MarkFolderRow(panel,list){
  if(!panel || !list)return;

  // Rensa bara v98-markeringar inom denna panel.
  try{
    Array.prototype.slice.call(panel.querySelectorAll(".tt98-folder-row")).forEach(function(el){
      el.classList.remove("tt98-folder-row");
    });
  }catch(e){}

  var listTop=0;
  try{listTop=list.getBoundingClientRect().top;}catch(e){}

  var candidates=[];
  Array.prototype.slice.call(panel.children).forEach(function(el){
    if(el===list)return;
    if(el.id==="saves-list")return;

    var buttons=Array.prototype.slice.call(el.querySelectorAll("button")).filter(ui98IsFolderButton);
    if(buttons.length<2)return;

    var txt=String(el.textContent||"");
    if(txt.indexOf("Mina")>=0 && txt.indexOf("Lagets")>=0)return;

    var r={top:0,height:0};
    try{r=el.getBoundingClientRect();}catch(e){}
    if(listTop && r.top>listTop)return;
    if(r.height>95)return;

    // Kandidat ska ligga nära ovanför listan, inte uppe i global nav.
    candidates.push({el:el,dist:Math.abs(listTop-r.top)});
  });

  if(candidates.length){
    candidates.sort(function(a,b){return a.dist-b.dist;});
    candidates[0].el.classList.add("tt98-folder-row");
  }
}

function ui98Apply(){
  var panel=ui98FormationPanel();
  if(!panel)return;

  var list=ui98SavesList(panel);
  if(!list)return;

  panel.classList.add("tt-v98-formation-compact");
  ui98HideLoadedInfo(panel);
  ui98MarkFolderRow(panel,list);
}

if(typeof renderSavesList==="function" && !renderSavesList._ui98Wrapped){
  var _renderSavesList_v98=renderSavesList;
  renderSavesList=function(){
    var r=_renderSavesList_v98.apply(this,arguments);
    setTimeout(function(){
      ui98Apply();
      try{if(typeof ff95PatchTeamLabels==="function")ff95PatchTeamLabels();}catch(e){}
      try{if(typeof ff93RebindFormationButtons==="function")ff93RebindFormationButtons();}catch(e){}
    },0);
    setTimeout(ui98Apply,150);
    return r;
  };
  renderSavesList._ui98Wrapped=true;
}

document.addEventListener("click",function(e){
  try{
    var tab=e.target.closest && e.target.closest(".tab");
    if(tab){
      var p=tab.getAttribute("data-panel")||"";
      if(p==="saves" || p==="uppstallning" || p==="start"){
        setTimeout(ui98Apply,100);
      }
    }
  }catch(err){}
},true);

setTimeout(ui98Apply,700);
setTimeout(ui98Apply,1600);

/* === slut v98-formation-compact-css-only === */


/* === v99-formation-top-align-icons: toppjustera Utgångslägen + ikonknappar === */

function ui99FormationPanel(){
  return document.getElementById("panel-saves") ||
         document.getElementById("panel-uppstallning") ||
         document.getElementById("panel-start") ||
         null;
}

function ui99List(panel){
  return panel ? (panel.querySelector("#saves-list") || document.getElementById("saves-list")) : null;
}

function ui99ShortenFormationButtons(panel){
  if(!panel)return;
  var list=ui99List(panel);
  if(!list)return;

  try{
    Array.prototype.slice.call(list.querySelectorAll("button.sa")).forEach(function(b){
      var txt=String(b.textContent||"").trim().toLowerCase();
      var title=String(b.title||"").trim();

      // Sätt title innan texten kortas om title saknas.
      if(!title && b.textContent)b.title=String(b.textContent||"").trim();

      if(txt==="ladda" || txt==="öppna" || txt==="oppna" || txt==="visa"){
        b.textContent="↙";
        b.title=b.title||"Ladda";
      }else if(txt.indexOf("till taktik")>=0 || txt==="taktik"){
        b.textContent="↗";
        b.title=b.title||"Till taktik";
      }else if(txt.indexOf("kopiera")>=0 || txt==="copy"){
        b.textContent="⧉";
        b.title=b.title||"Kopiera";
      }else if(txt.indexOf("flytta")>=0){
        b.textContent="⇆";
        b.title=b.title||"Flytta";
      }else if(txt.indexOf("dela")>=0 || txt.indexOf("laget")>=0){
        b.textContent="👥";
        b.title=b.title||"Dela med laget";
      }else if(txt.indexOf("sluta")>=0 || txt.indexOf("dölj")>=0){
        b.textContent="🙈";
        b.title=b.title||"Sluta dela";
      }else if(txt==="×" || txt==="x" || txt.indexOf("radera")>=0){
        b.textContent="×";
        b.title=b.title||"Radera";
      }
    });
  }catch(e){}
}

function ui99TopAlign(){
  var panel=ui99FormationPanel();
  if(!panel)return;
  panel.classList.add("tt-v99-formation-top");

  var bp=document.getElementById("bottompanel");
  if(bp && panel.classList.contains("on")){
    bp.style.alignItems="flex-start";
    bp.style.justifyContent="flex-start";
    bp.style.alignContent="flex-start";
    bp.style.paddingTop="0";
  }

  var list=ui99List(panel);
  if(list){
    list.style.overflowY="auto";
    list.style.webkitOverflowScrolling="touch";
  }

  ui99ShortenFormationButtons(panel);

  try{
    if(typeof ui98Apply==="function")ui98Apply();
    if(typeof ff95PatchTeamLabels==="function")ff95PatchTeamLabels();
    if(typeof ff93RebindFormationButtons==="function")ff93RebindFormationButtons();
  }catch(e){}
}

if(typeof renderSavesList==="function" && !renderSavesList._ui99Wrapped){
  var _renderSavesList_v99=renderSavesList;
  renderSavesList=function(){
    var r=_renderSavesList_v99.apply(this,arguments);
    setTimeout(ui99TopAlign,0);
    setTimeout(ui99TopAlign,120);
    setTimeout(ui99TopAlign,350);
    return r;
  };
  renderSavesList._ui99Wrapped=true;
}

document.addEventListener("click",function(e){
  try{
    var tab=e.target.closest && e.target.closest(".tab");
    if(tab){
      var p=tab.getAttribute("data-panel")||"";
      if(p==="saves" || p==="uppstallning" || p==="start"){
        setTimeout(ui99TopAlign,80);
        setTimeout(ui99TopAlign,250);
      }
    }
  }catch(err){}
},true);

setTimeout(ui99TopAlign,700);
setTimeout(ui99TopAlign,1600);

/* === slut v99-formation-top-align-icons === */


/* === v101-match-save-editor-fix: bevara startmarkeringar efter spara + dölj matchlistan vid redigering === */

function tt101Clone(obj){
  try{return JSON.parse(JSON.stringify(obj||{}));}catch(e){return obj;}
}

function tt101CurrentMatchSelections(){
  var out={};
  try{
    Object.keys(matchSelections||{}).forEach(function(id){
      if(matchSelections[id])out[id]=matchSelections[id];
    });
  }catch(e){}
  return out;
}

function tt101RestoreSelections(sel){
  try{
    matchSelections=tt101Clone(sel||{});
    if(typeof renderMatchTruppList==="function")renderMatchTruppList();
  }catch(e){}
}

function tt101SetMatchEditorActive(active){
  try{
    document.body.classList.toggle("tt101-match-editor-active",!!active);
  }catch(e){}

  var saved=document.getElementById("lag-sparade");
  if(saved && active){
    saved.style.display="none";
  }
}

function tt101HideSavedMatchesInEditor(){
  try{
    var lm=document.getElementById("lag-match");
    var isMatchVisible=lm && lm.style.display!=="none";
    if(isMatchVisible || window._editingMatchId){
      tt101SetMatchEditorActive(true);
    }
  }catch(e){}
}

function tt101ShowSavedMatchesList(){
  try{document.body.classList.remove("tt101-match-editor-active");}catch(e){}
  var saved=document.getElementById("lag-sparade");
  if(saved)saved.style.display="";
}

function tt101SyncMatchCounter(){
  try{
    var n=Object.keys(matchSelections||{}).filter(function(id){return matchSelections[id];}).length;
    var el=document.getElementById("match-counter");
    if(el)el.textContent=n+" vald"+(n===1?"":"a");
  }catch(e){}
}

function tt101BuildMatchFromCurrentUI(){
  var datum=document.getElementById("match-datum").value;
  var motstand=document.getElementById("match-motstand").value.trim();
  if(!datum){
    showToast("Välj datum!");
    return null;
  }

  var startade=trupp.filter(function(sp){return matchSelections[sp.id]==="start";}).map(function(sp){return sp.id;});
  var avbytare=trupp.filter(function(sp){return matchSelections[sp.id]==="avbytare";}).map(function(sp){return sp.id;});

  // Spara aktuell laguppställningsvariant innan matchen byggs.
  try{
    if(matchVariants.length>0 && typeof saveCurrentVariant==="function")saveCurrentVariant();
    else if(Object.keys(matchAssignments||{}).length>0){
      matchVariants=[{
        namn:"Uppst. 1",
        assignments:tt101Clone(matchAssignments),
        playerStates:players.filter(function(p){return p.team==="home";}).map(function(p){
          return {id:p.id,number:p.number,name:p.name,x:p.x,y:p.y};
        })
      }];
      activeVariantIdx=0;
    }
  }catch(e){}

  return {
    datum:datum,
    motstand:motstand||"Okänd",
    startade:startade,
    avbytare:avbytare,
    uppstallningar:tt101Clone(matchVariants||[]),
    mal_hemma:matchGoals&&typeof matchGoals.home!=="undefined"?matchGoals.home:0,
    mal_borta:matchGoals&&typeof matchGoals.away!=="undefined"?matchGoals.away:0
  };
}

function tt101SaveMatchPreserveUI(){
  var beforeSel=tt101CurrentMatchSelections();
  var match=tt101BuildMatchFromCurrentUI();
  if(!match)return;

  var editId=window._editingMatchId||null;
  var payloadData=(typeof addMetaToData==="function"?addMetaToData(match):match);

  function afterSaved(dbId,label){
    match.dbId=dbId;
    window._editingMatchId=dbId;

    var savedMatch=Object.assign({},match,{dbId:dbId});
    var idx=matcher.findIndex(function(x){return String(x.dbId)===String(dbId);});
    if(idx>=0)matcher[idx]=savedMatch;
    else matcher.push(savedMatch);

    // Viktigt: återställ markeringarna direkt efter save.
    matchSelections=beforeSel;
    tt101SyncMatchCounter();
    if(typeof renderMatchTruppList==="function")renderMatchTruppList();
    tt101RestoreSelections(beforeSel);

    if(typeof renderStatistik==="function")renderStatistik();
    if(typeof renderMatchHistory==="function")renderMatchHistory();
    if(typeof renderSparadeMatcherList==="function")renderSparadeMatcherList();

    tt101SetMatchEditorActive(true);
    showToast(label);
  }

  if(editId){
    fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+editId,{
      method:"PATCH",
      headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
      body:JSON.stringify({
        name:match.datum+" "+match.motstand,
        data:payloadData,
        type:"match",
        folder:"Allmänt"
      })
    })
    .then(function(r){return r.json();})
    .then(function(){afterSaved(editId,"Match uppdaterad!");})
    .catch(function(err){
      cloudStatus("❌ Fel: "+err.message,"#e84a4a");
      showToast("Kunde inte uppdatera match",false);
      tt101RestoreSelections(beforeSel);
    });
  }else{
    fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{
      method:"POST",
      headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
      body:JSON.stringify({
        name:match.datum+" "+match.motstand,
        data:payloadData,
        type:"match",
        folder:"Allmänt"
      })
    })
    .then(function(r){return r.json();})
    .then(function(data){
      if(!data || !data[0] || !data[0].id){
        var errMsg=(data&&data.message)?data.message:"Matchen kunde inte sparas";
        showToast(errMsg,false);
        cloudStatus("❌ "+errMsg,"#e84a4a");
        tt101RestoreSelections(beforeSel);
        return;
      }
      afterSaved(data[0].id,"Match sparad: "+match.datum+" vs "+match.motstand);
    })
    .catch(function(err){
      cloudStatus("❌ Fel: "+err.message,"#e84a4a");
      showToast("Kunde inte spara match",false);
      tt101RestoreSelections(beforeSel);
    });
  }
}

// Stoppa gamla spara-lyssnaren som nollställde matchSelections efter save.
(function(){
  var btn=document.getElementById("btn-spara-match");
  if(btn && !btn.dataset.tt101SaveBound){
    btn.dataset.tt101SaveBound="1";
    btn.addEventListener("click",function(e){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      tt101SaveMatchPreserveUI();
      return false;
    },true);
  }
})();

// När match öppnas från sparade matcher: dölj själva listan.
if(typeof openEditMatch==="function" && !openEditMatch._tt101Wrapped){
  var _openEditMatch_tt101=openEditMatch;
  openEditMatch=function(m){
    var r=_openEditMatch_tt101.apply(this,arguments);
    setTimeout(function(){
      tt101SetMatchEditorActive(true);
      var saved=document.getElementById("lag-sparade");
      if(saved)saved.style.display="none";
    },0);
    return r;
  };
  openEditMatch._tt101Wrapped=true;
}

// När man trycker Laguppställning för match: dölj sparade matchlistan också.
(function(){
  var b=document.getElementById("btn-match-to-taktik");
  if(b && !b.dataset.tt101HideSavedBound){
    b.dataset.tt101HideSavedBound="1";
    b.addEventListener("click",function(){
      setTimeout(function(){tt101SetMatchEditorActive(true);},0);
    },true);
  }
})();

// När Sparade matcher-fliken väljs ska listan visas igen.
document.addEventListener("click",function(e){
  try{
    var btn=e.target.closest && e.target.closest("[data-lag]");
    if(!btn)return;
    var target=btn.getAttribute("data-lag");
    if(target==="sparade"){
      window._editingMatchId=window._editingMatchId||null;
      setTimeout(function(){
        tt101ShowSavedMatchesList();
        if(typeof renderSparadeMatcherList==="function")renderSparadeMatcherList();
      },0);
    }else if(target==="match"){
      setTimeout(tt101HideSavedMatchesInEditor,0);
    }
  }catch(err){}
},true);

if(typeof renderSparadeMatcherList==="function" && !renderSparadeMatcherList._tt101Wrapped){
  var _renderSparadeMatcherList_tt101=renderSparadeMatcherList;
  renderSparadeMatcherList=function(){
    var r=_renderSparadeMatcherList_tt101.apply(this,arguments);
    setTimeout(tt101HideSavedMatchesInEditor,0);
    return r;
  };
  renderSparadeMatcherList._tt101Wrapped=true;
}

setTimeout(tt101HideSavedMatchesInEditor,800);

/* === slut v101-match-save-editor-fix === */


/* === v102-match-list-user-button-fix: sparade matcher visas igen + kompakt användarknapp === */

function tt102ShowSavedMatches(){
  try{document.body.classList.remove("tt101-match-editor-active");}catch(e){}
  var saved=document.getElementById("lag-sparade");
  var match=document.getElementById("lag-match");
  var truppEl=document.getElementById("lag-trupp");
  var stat=document.getElementById("lag-statistik");

  if(saved)saved.style.display="";
  if(match)match.style.display="none";
  if(truppEl)truppEl.style.display="none";
  if(stat)stat.style.display="none";

  try{
    document.querySelectorAll("[data-lag]").forEach(function(b){
      b.classList.toggle("on",b.getAttribute("data-lag")==="sparade");
    });
  }catch(e){}

  setTimeout(function(){
    try{if(typeof loadMatcher==="function")loadMatcher();}catch(e){}
    try{if(typeof renderSparadeMatcherList==="function")renderSparadeMatcherList();}catch(e){}
    var list=document.getElementById("sparade-match-list");
    if(list){
      list.style.display="";
      list.style.visibility="visible";
      list.style.maxHeight="240px";
      list.style.overflowY="auto";
    }
    if(saved)saved.style.display="";
  },120);
}

document.addEventListener("click",function(e){
  try{
    var b=e.target.closest && e.target.closest("[data-lag]");
    if(!b)return;
    if(b.getAttribute("data-lag")==="sparade"){
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      tt102ShowSavedMatches();
      return false;
    }
  }catch(err){}
},true);

if(typeof renderSparadeMatcherList==="function" && !renderSparadeMatcherList._tt102Wrapped){
  var _renderSparadeMatcherList_tt102=renderSparadeMatcherList;
  renderSparadeMatcherList=function(){
    var r=_renderSparadeMatcherList_tt102.apply(this,arguments);
    setTimeout(function(){
      var active=false;
      try{
        active=Array.prototype.slice.call(document.querySelectorAll("[data-lag]")).some(function(b){
          return b.getAttribute("data-lag")==="sparade" && b.classList.contains("on");
        });
      }catch(e){}
      if(active){
        document.body.classList.remove("tt101-match-editor-active");
        var saved=document.getElementById("lag-sparade");
        if(saved)saved.style.display="";
      }
    },0);
    return r;
  };
  renderSparadeMatcherList._tt102Wrapped=true;
}

if(typeof tt101SaveMatchPreserveUI==="function" && !tt101SaveMatchPreserveUI._tt102Wrapped){
  var _tt101SaveMatchPreserveUI_v102=tt101SaveMatchPreserveUI;
  tt101SaveMatchPreserveUI=function(){
    var r=_tt101SaveMatchPreserveUI_v102.apply(this,arguments);
    setTimeout(function(){try{if(typeof loadMatcher==="function")loadMatcher();}catch(e){}},700);
    return r;
  };
  tt101SaveMatchPreserveUI._tt102Wrapped=true;
}

function tt102GetProfile(){
  try{if(typeof getUserProfile==="function"){var p=getUserProfile(); if(p)return p;}}catch(e){}
  try{if(typeof getProfileSafeV10==="function"){var p2=getProfileSafeV10(); if(p2)return p2;}}catch(e){}
  try{var raw=localStorage.getItem("tt_profile_v1"); return raw?JSON.parse(raw):null;}catch(e){}
  return null;
}

function tt102SaveProfile(name,team){
  name=String(name||"").trim()||"Tränare";
  team=String(team||"").trim()||"MITT-LAG";
  try{
    if(typeof saveUserProfile==="function"){
      return saveUserProfile(name,team);
    }
  }catch(e){}
  var old=tt102GetProfile()||{};
  var code=team.toUpperCase().replace(/\s+/g,"-");
  var p={
    ownerId:old.ownerId || ("user_"+Math.random().toString(36).slice(2,10)),
    ownerName:name,
    teamId:code,
    teamCode:code,
    teamName:code
  };
  localStorage.setItem("tt_profile_v1",JSON.stringify(p));
  return p;
}

function tt102OpenProfileModal(){
  var old=document.getElementById("tt102-profile-modal");
  if(old)old.remove();

  var p=tt102GetProfile()||{};
  var modal=document.createElement("div");
  modal.id="tt102-profile-modal";

  var box=document.createElement("div");
  box.className="tt102-box";

  var h=document.createElement("h2");
  h.textContent="Profil och lag";
  box.appendChild(h);

  var lab1=document.createElement("label");
  lab1.textContent="Tränarnamn";
  var name=document.createElement("input");
  name.value=p.ownerName||"";

  var lab2=document.createElement("label");
  lab2.textContent="Lagkod / lagnamn";
  var team=document.createElement("input");
  team.value=p.teamCode||p.teamId||"";

  box.appendChild(lab1);box.appendChild(name);
  box.appendChild(lab2);box.appendChild(team);

  var info=document.createElement("div");
  info.style.cssText="font-size:.72rem;color:#7aaa88;line-height:1.3;margin-top:8px";
  info.textContent="Samma lagkod används för att dela taktik, utgångslägen och matcher mellan tränare.";
  box.appendChild(info);

  var actions=document.createElement("div");
  actions.className="tt102-actions";

  var cancel=document.createElement("button");
  cancel.className="btn";
  cancel.textContent="Stäng";
  cancel.addEventListener("click",function(){modal.remove();});

  var save=document.createElement("button");
  save.className="btn on";
  save.textContent="Spara";
  save.addEventListener("click",function(){
    tt102SaveProfile(name.value,team.value);
    modal.remove();
    tt102CompactUserButton();
    try{if(typeof cloudLoadSaves==="function")cloudLoadSaves();}catch(e){}
    try{if(typeof cloudLoadTaktik==="function")cloudLoadTaktik();}catch(e){}
    try{if(typeof loadMatcher==="function")loadMatcher();}catch(e){}
    showToast("Profil sparad");
  });

  actions.appendChild(cancel);
  actions.appendChild(save);
  box.appendChild(actions);
  modal.appendChild(box);
  modal.addEventListener("click",function(e){if(e.target===modal)modal.remove();});
  document.body.appendChild(modal);
  setTimeout(function(){name.focus();},80);
}

function tt102LooksLikeProfileButton(b){
  if(!b)return false;
  var id=String(b.id||"").toLowerCase();
  var title=String(b.title||"").toLowerCase();
  var txt=String(b.textContent||"").trim();
  if(id.indexOf("profile")>=0 || id.indexOf("profil")>=0 || id.indexOf("user")>=0 || id.indexOf("konto")>=0)return true;
  if(title.indexOf("profil")>=0 || title.indexOf("använd")>=0 || title.indexOf("user")>=0 || title.indexOf("konto")>=0)return true;
  var p=tt102GetProfile();
  if(p && p.ownerName && txt.indexOf(p.ownerName)>=0)return true;
  if(p && p.teamCode && txt.indexOf(p.teamCode)>=0)return true;
  return false;
}

function tt102CompactUserButton(){
  var top=document.getElementById("topbar") || document.querySelector(".topbar");
  if(!top)return;
  var candidates=[];
  try{
    Array.prototype.slice.call(top.querySelectorAll("button")).forEach(function(b){
      if(tt102LooksLikeProfileButton(b))candidates.push(b);
    });
  }catch(e){}

  if(!candidates.length){
    var b=document.createElement("button");
    b.className="btn tt102-profile-btn";
    b.id="tt102-profile-btn";
    b.title="Profil och lag";
    b.textContent="👤";
    top.appendChild(b);
    candidates.push(b);
  }

  candidates.forEach(function(b){
    b.classList.add("tt102-profile-btn");
    if(window.innerWidth<=760)b.classList.add("tt102-user-icon-only");
    else b.classList.remove("tt102-user-icon-only");
    b.title="Profil och lag";
    if(!b.dataset.tt102ProfileBound){
      b.dataset.tt102ProfileBound="1";
      b.addEventListener("click",function(e){
        e.preventDefault();
        e.stopPropagation();
        if(e.stopImmediatePropagation)e.stopImmediatePropagation();
        tt102OpenProfileModal();
        return false;
      },true);
    }
  });
}

window.addEventListener("resize",function(){setTimeout(tt102CompactUserButton,80);});
setTimeout(tt102CompactUserButton,500);
setTimeout(tt102CompactUserButton,1600);

/* === slut v102-match-list-user-button-fix === */


/* === v103-desktop-player-drag-fix: spelare prioriteras framför boll på desktop ===
   Problem: på dator kan bollens SVG-lager hamna ovanpå en spelare, så musdrag flyttar bollen.
   Fix: fånga mousedown tidigt. Om klickpunkten ligger på/vid en spelare startas spelardrag,
   även om det översta SVG-objektet råkar vara bollen.
*/

function tt103Dist2(a,b,c,d){
  var dx=a-c,dy=b-d;
  return dx*dx+dy*dy;
}

function tt103NearestPlayerAt(pt,radius){
  radius=radius||22;
  var best=null,bestD=radius*radius;
  try{
    (players||[]).forEach(function(p){
      var d=tt103Dist2(pt.x,pt.y,p.x,p.y);
      if(d<=bestD){
        best=p;
        bestD=d;
      }
    });
  }catch(e){}
  return best;
}

function tt103IsBallTarget(target){
  try{
    return !!(target && target.closest && target.closest(".ball-token"));
  }catch(e){return false;}
}

function tt103IsPlayerTarget(target){
  try{
    return !!(target && target.closest && target.closest(".player-token"));
  }catch(e){return false;}
}

function tt103FindNearestHomePitchPlayerFromClient(cx,cy,exceptId){
  try{
    var pt=svgPt(cx,cy);
    var best=null,bestD=50*50;
    (players||[]).forEach(function(p){
      if(p.team!=="home")return;
      if(exceptId && p.id===exceptId)return;
      var d=tt103Dist2(pt.x,pt.y,p.x,p.y);
      if(d<bestD){
        best=p.id;
        bestD=d;
      }
    });
    return best;
  }catch(e){return null;}
}

function tt103SwapAssignments(srcPid,targetPid){
  if(!srcPid || !targetPid || srcPid===targetPid)return false;
  try{
    var srcTid=matchAssignments[srcPid]||null;
    var tgtTid=matchAssignments[targetPid]||null;

    if(srcTid)matchAssignments[targetPid]=srcTid;
    else delete matchAssignments[targetPid];

    if(tgtTid)matchAssignments[srcPid]=tgtTid;
    else delete matchAssignments[srcPid];

    var srcSp=srcTid?matchRoster.find(function(x){return x.id===srcTid;}):null;
    var tgtSp=tgtTid?matchRoster.find(function(x){return x.id===tgtTid;}):null;
    var srcP=players.find(function(x){return x.id===srcPid;});
    var tgtP=players.find(function(x){return x.id===targetPid;});

    if(srcP){srcP.number=tgtSp?tgtSp.nr:0;srcP.name=tgtSp?tgtSp.namn:"";}
    if(tgtP){tgtP.number=srcSp?srcSp.nr:0;tgtP.name=srcSp?srcSp.namn:"";}

    if(typeof render==="function")render();
    if(typeof renderBench==="function")renderBench();
    showToast("Spelare bytte plats!");
    return true;
  }catch(e){return false;}
}

function tt103ReturnAssignedPlayerToBench(pid){
  try{
    if(!pid || !matchAssignments[pid])return false;
    delete matchAssignments[pid];
    var p=players.find(function(x){return x.id===pid;});
    if(p){p.number=0;p.name="";}
    if(typeof render==="function")render();
    if(typeof renderBench==="function")renderBench();
    showToast("Spelare återlagd till avbytare!");
    return true;
  }catch(e){return false;}
}

function tt103StartDesktopPlayerDrag(ev,p){
  if(!p || mode!=="move")return false;

  ev.preventDefault();
  ev.stopPropagation();
  if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();

  try{if(typeof saveUndo==="function")saveUndo();}catch(e){}
  selectedId=p.id;

  var startX=ev.clientX,startY=ev.clientY;
  var moved=false;

  // I matchläge med placerade hemmaspelare: desktop ska kunna byta plats/åter till bänk som touch gör.
  if((matchRoster||[]).length && p.team==="home"){
    var ghost=null;

    function makeGhost(){
      if(ghost || !matchAssignments[p.id])return;
      var sp=matchRoster.find(function(x){return x.id===matchAssignments[p.id];});
      if(!sp)return;
      ghost=document.createElement("div");
      ghost.style.cssText="position:fixed;z-index:9999;pointer-events:none;background:#4ae87a;color:#0a1a0d;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:0.8rem;transform:translate(-50%,-50%)";
      ghost.textContent="#"+sp.nr;
      document.body.appendChild(ghost);
    }

    function mm(e2){
      var dx=e2.clientX-startX,dy=e2.clientY-startY;
      if(!moved && dx*dx+dy*dy>64){
        moved=true;
        makeGhost();
      }
      if(moved && ghost){
        ghost.style.left=e2.clientX+"px";
        ghost.style.top=e2.clientY+"px";
      }
      try{if(typeof highlightNearestPlayer==="function")highlightNearestPlayer(e2.clientX,e2.clientY);}catch(e){}
    }

    function mu(e2){
      window.removeEventListener("mousemove",mm,true);
      window.removeEventListener("mouseup",mu,true);
      if(ghost){ghost.remove();ghost=null;}
      try{if(typeof clearPlayerHighlights==="function")clearPlayerHighlights();}catch(e){}

      if(!moved){
        // Klick utan drag: behåll normal logik så man kan välja spelare via modal.
        try{if(typeof openPlayerPicker==="function")openPlayerPicker(p.id);}catch(e){}
        return;
      }

      var benchBar=document.getElementById("bench-bar");
      var br=benchBar?benchBar.getBoundingClientRect():null;
      var droppedOnBench=br && e2.clientX>=br.left && e2.clientX<=br.right && e2.clientY>=br.top && e2.clientY<=br.bottom;
      if(droppedOnBench){
        tt103ReturnAssignedPlayerToBench(p.id);
        return;
      }

      var targetPid=null;
      try{
        if(typeof findNearestHomePitchPlayer==="function")targetPid=findNearestHomePitchPlayer(e2.clientX,e2.clientY,50);
      }catch(e){}
      if(!targetPid)targetPid=tt103FindNearestHomePitchPlayerFromClient(e2.clientX,e2.clientY,p.id);

      if(targetPid && targetPid!==p.id){
        tt103SwapAssignments(p.id,targetPid);
      }
    }

    window.addEventListener("mousemove",mm,true);
    window.addEventListener("mouseup",mu,true);
    return true;
  }

  // Vanligt utgångsläge/taktik: flytta själva spelartoken.
  var pt=svgPt(ev.clientX,ev.clientY);
  dragging={type:"player",id:p.id,ox:p.x-pt.x,oy:p.y-pt.y};

  function mm2(e2){onMM(e2);}
  function mu2(e2){
    window.removeEventListener("mousemove",mm2,true);
    window.removeEventListener("mouseup",mu2,true);
    onMU(e2);
  }

  window.addEventListener("mousemove",mm2,true);
  window.addEventListener("mouseup",mu2,true);
  return true;
}

function tt103InstallDesktopPlayerPriority(){
  var s=document.getElementById("pitch-svg");
  if(!s || s.dataset.tt103DesktopDrag)return;
  s.dataset.tt103DesktopDrag="1";

  s.addEventListener("mousedown",function(ev){
    try{
      if(ev.button!==0)return;
      if(mode!=="move")return;

      var pt=svgPt(ev.clientX,ev.clientY);
      var p=null;

      // Om klicket redan är på spelare: använd den.
      var pg=ev.target && ev.target.closest ? ev.target.closest(".player-token") : null;
      if(pg){
        var id=pg.getAttribute("data-id");
        p=(players||[]).find(function(x){return x.id===id;})||null;
      }

      // Om klicket är på bollen men en spelare ligger under/nära: välj spelaren i stället.
      if(!p && tt103IsBallTarget(ev.target)){
        p=tt103NearestPlayerAt(pt,24);
      }

      // Extra tolerans: om man klickar väldigt nära spelare, prioritera spelaren framför plan/boll.
      if(!p && !tt103IsPlayerTarget(ev.target)){
        p=tt103NearestPlayerAt(pt,18);
      }

      if(p){
        tt103StartDesktopPlayerDrag(ev,p);
      }
    }catch(err){}
  },true);
}

tt103InstallDesktopPlayerPriority();
setTimeout(tt103InstallDesktopPlayerPriority,800);
setTimeout(tt103InstallDesktopPlayerPriority,1800);

/* === slut v103-desktop-player-drag-fix === */


/* === v104-desktop-bench-drag-fix: dra avbytare från bänk till plan på dator === */

function tt104BenchPlayerFromElement(el){
  try{
    var txt=String(el.textContent||"").trim();
    var nrMatch=txt.match(/#\s*(\d+)/);
    var nr=nrMatch?String(nrMatch[1]):"";
    var name=txt.replace(/#\s*\d+/,"").trim();

    var candidates=(matchRoster||[]).filter(function(sp){
      var assigned=false;
      try{assigned=Object.values(matchAssignments||{}).indexOf(sp.id)>=0;}catch(e){}
      return !assigned;
    });

    if(nr){
      var byNr=candidates.find(function(sp){return String(sp.nr)===nr;});
      if(byNr)return byNr;
    }
    if(name){
      var low=name.toLowerCase();
      var byName=candidates.find(function(sp){return String(sp.namn||"").toLowerCase()===low;});
      if(byName)return byName;
    }
  }catch(e){}
  return null;
}

function tt104MakeGhost(sp,x,y){
  var ghost=document.createElement("div");
  ghost.style.cssText="position:fixed;z-index:9999;pointer-events:none;background:#4ae87a;color:#0a1a0d;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:0.8rem;transform:translate(-50%,-50%)";
  ghost.textContent="#"+sp.nr;
  ghost.style.left=x+"px";
  ghost.style.top=y+"px";
  document.body.appendChild(ghost);
  return ghost;
}

function tt104FindDropPitchPlayer(cx,cy){
  var pid=null;
  try{
    if(typeof findNearestHomePitchPlayer==="function")pid=findNearestHomePitchPlayer(cx,cy,65);
  }catch(e){}
  if(pid)return pid;

  try{
    var pt=svgPt(cx,cy);
    var best=null,bestD=65*65;
    (players||[]).forEach(function(p){
      if(p.team!=="home")return;
      var dx=pt.x-p.x,dy=pt.y-p.y,d=dx*dx+dy*dy;
      if(d<bestD){best=p.id;bestD=d;}
    });
    return best;
  }catch(e){}
  return null;
}

function tt104AssignBenchToPitch(sp,pid){
  if(!sp || !pid)return false;
  try{
    assignPlayerToPosition(pid,sp.id);
    showToast("#"+sp.nr+" in på planen");
    return true;
  }catch(e){}

  try{
    Object.keys(matchAssignments||{}).forEach(function(k){
      if(matchAssignments[k]===sp.id)delete matchAssignments[k];
    });
    matchAssignments[pid]=sp.id;
    var p=players.find(function(x){return x.id===pid;});
    if(p){p.number=sp.nr;p.name=sp.namn;}
    if(typeof render==="function")render();
    if(typeof renderBench==="function")renderBench();
    showToast("#"+sp.nr+" in på planen");
    return true;
  }catch(e){}
  return false;
}

function tt104StartBenchMouseDrag(ev,el,sp){
  if(!sp)return false;
  ev.preventDefault();
  ev.stopPropagation();
  if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();

  var startX=ev.clientX,startY=ev.clientY;
  var moved=false;
  var ghost=null;

  function mm(e2){
    var dx=e2.clientX-startX,dy=e2.clientY-startY;
    if(!moved && dx*dx+dy*dy>36){
      moved=true;
      ghost=tt104MakeGhost(sp,e2.clientX,e2.clientY);
    }
    if(moved && ghost){
      ghost.style.left=e2.clientX+"px";
      ghost.style.top=e2.clientY+"px";
      try{if(typeof highlightNearestPlayer==="function")highlightNearestPlayer(e2.clientX,e2.clientY);}catch(e){}
    }
  }

  function mu(e2){
    window.removeEventListener("mousemove",mm,true);
    window.removeEventListener("mouseup",mu,true);
    if(ghost){ghost.remove();ghost=null;}
    try{if(typeof clearPlayerHighlights==="function")clearPlayerHighlights();}catch(e){}

    if(!moved){
      // Klick på avbytare: gör inget, så vi inte råkar placera fel.
      return;
    }

    var pid=tt104FindDropPitchPlayer(e2.clientX,e2.clientY);
    if(pid){
      tt104AssignBenchToPitch(sp,pid);
    }else{
      showToast("Släpp på en position på planen",false);
    }
  }

  window.addEventListener("mousemove",mm,true);
  window.addEventListener("mouseup",mu,true);
  return true;
}

function tt104InstallBenchDesktopDrag(){
  var bar=document.getElementById("bench-bar");
  if(!bar || bar.dataset.tt104BenchDrag)return;
  bar.dataset.tt104BenchDrag="1";

  bar.addEventListener("mousedown",function(ev){
    try{
      if(ev.button!==0)return;
      var el=ev.target.closest && ev.target.closest(".bench-player");
      if(!el)return;
      var sp=tt104BenchPlayerFromElement(el);
      if(!sp)return;
      tt104StartBenchMouseDrag(ev,el,sp);
    }catch(e){}
  },true);
}

tt104InstallBenchDesktopDrag();
setTimeout(tt104InstallBenchDesktopDrag,800);
setTimeout(tt104InstallBenchDesktopDrag,1800);

if(typeof renderBench==="function" && !renderBench._tt104Wrapped){
  var _renderBench_tt104=renderBench;
  renderBench=function(){
    var r=_renderBench_tt104.apply(this,arguments);
    setTimeout(tt104InstallBenchDesktopDrag,0);
    return r;
  };
  renderBench._tt104Wrapped=true;
}

/* === slut v104-desktop-bench-drag-fix === */


/* === v105-bench-player-id-fix: rätt avbytare vid desktop-drag + tyst placering === */

function tt105BenchList(){
  try{
    var assignedTids={};
    Object.values(matchAssignments||{}).forEach(function(tid){assignedTids[tid]=true;});
    return (matchRoster||[]).slice()
      .sort(function(a,b){return String(a.namn||"").localeCompare(String(b.namn||""),"sv");})
      .filter(function(sp){return !assignedTids[sp.id];});
  }catch(e){return [];}
}

function tt105TagBenchPlayers(){
  try{
    var cont=document.getElementById("bench-players");
    if(!cont)return;
    var bench=tt105BenchList();
    Array.prototype.slice.call(cont.querySelectorAll(".bench-player")).forEach(function(el,idx){
      var sp=bench[idx];
      if(sp){
        el.dataset.playerId=sp.id;
        el.dataset.nr=sp.nr;
        el.dataset.name=sp.namn||"";
        el.title="#"+sp.nr+" "+(sp.namn||"");
      }
    });
  }catch(e){}
}

function tt105BenchPlayerFromElement(el){
  if(!el)return null;

  try{
    var pid=el.dataset.playerId;
    if(pid){
      var exact=(matchRoster||[]).find(function(sp){return String(sp.id)===String(pid);});
      if(exact)return exact;
    }
  }catch(e){}

  // Fallback: använd positionen i bänklistan, inte texten. Text kan ge fel vid liknande namn/nummer.
  try{
    var cont=document.getElementById("bench-players");
    var nodes=Array.prototype.slice.call(cont.querySelectorAll(".bench-player"));
    var idx=nodes.indexOf(el);
    if(idx>=0){
      var bench=tt105BenchList();
      if(bench[idx])return bench[idx];
    }
  }catch(e){}

  // Sista fallback: gamla texttolkningen från v104, men helst används aldrig denna.
  try{
    if(typeof tt104BenchPlayerFromElement==="function"){
      return tt104BenchPlayerFromElement(el);
    }
  }catch(e){}

  return null;
}

function tt105FindDropPitchPlayer(cx,cy){
  try{
    if(typeof tt104FindDropPitchPlayer==="function"){
      var pid=tt104FindDropPitchPlayer(cx,cy);
      if(pid)return pid;
    }
  }catch(e){}

  try{
    var pt=svgPt(cx,cy);
    var best=null,bestD=65*65;
    (players||[]).forEach(function(p){
      if(p.team!=="home")return;
      var dx=pt.x-p.x,dy=pt.y-p.y,d=dx*dx+dy*dy;
      if(d<bestD){best=p.id;bestD=d;}
    });
    return best;
  }catch(e){return null;}
}

function tt105AssignBenchToPitchSilent(sp,pid){
  if(!sp || !pid)return false;

  try{
    // Gör samma sak som assignPlayerToPosition men utan toast.
    Object.keys(matchAssignments||{}).forEach(function(k){
      if(matchAssignments[k]===sp.id && k!==pid)delete matchAssignments[k];
    });
    matchAssignments[pid]=sp.id;

    var p=players.find(function(x){return x.id===pid;});
    if(p){
      p.number=sp.nr;
      p.name=sp.namn;
    }

    if(typeof render==="function")render();
    if(typeof renderBench==="function")renderBench();
    return true;
  }catch(e){}

  return false;
}

function tt105MakeGhost(sp,x,y){
  var ghost=document.createElement("div");
  ghost.style.cssText="position:fixed;z-index:9999;pointer-events:none;background:#4ae87a;color:#0a1a0d;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:0.8rem;transform:translate(-50%,-50%)";
  ghost.textContent="#"+sp.nr;
  ghost.style.left=x+"px";
  ghost.style.top=y+"px";
  document.body.appendChild(ghost);
  return ghost;
}

function tt105StartBenchMouseDrag(ev,el,sp){
  if(!sp)return false;

  ev.preventDefault();
  ev.stopPropagation();
  if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();

  var startX=ev.clientX,startY=ev.clientY;
  var moved=false;
  var ghost=null;

  function mm(e2){
    var dx=e2.clientX-startX,dy=e2.clientY-startY;
    if(!moved && dx*dx+dy*dy>36){
      moved=true;
      ghost=tt105MakeGhost(sp,e2.clientX,e2.clientY);
    }
    if(moved && ghost){
      ghost.style.left=e2.clientX+"px";
      ghost.style.top=e2.clientY+"px";
      try{if(typeof highlightNearestPlayer==="function")highlightNearestPlayer(e2.clientX,e2.clientY);}catch(e){}
    }
  }

  function mu(e2){
    window.removeEventListener("mousemove",mm,true);
    window.removeEventListener("mouseup",mu,true);
    if(ghost){ghost.remove();ghost=null;}
    try{if(typeof clearPlayerHighlights==="function")clearPlayerHighlights();}catch(e){}

    if(!moved)return;

    var pid=tt105FindDropPitchPlayer(e2.clientX,e2.clientY);
    if(pid){
      tt105AssignBenchToPitchSilent(sp,pid);
    }
  }

  window.addEventListener("mousemove",mm,true);
  window.addEventListener("mouseup",mu,true);
  return true;
}

function tt105InstallBenchDrag(){
  var bar=document.getElementById("bench-bar");
  if(!bar)return;

  // Byt ut v104-hanteraren genom att fånga tidigare och stoppa allt.
  if(!bar.dataset.tt105BenchDrag){
    bar.dataset.tt105BenchDrag="1";
    bar.addEventListener("mousedown",function(ev){
      try{
        if(ev.button!==0)return;
        var el=ev.target.closest && ev.target.closest(".bench-player");
        if(!el)return;
        var sp=tt105BenchPlayerFromElement(el);
        if(!sp)return;
        tt105StartBenchMouseDrag(ev,el,sp);
        return false;
      }catch(e){}
    },true);
  }

  tt105TagBenchPlayers();
}

if(typeof renderBench==="function" && !renderBench._tt105Wrapped){
  var _renderBench_tt105=renderBench;
  renderBench=function(){
    var r=_renderBench_tt105.apply(this,arguments);
    setTimeout(tt105TagBenchPlayers,0);
    setTimeout(tt105InstallBenchDrag,0);
    return r;
  };
  renderBench._tt105Wrapped=true;
}

tt105InstallBenchDrag();
setTimeout(tt105InstallBenchDrag,500);
setTimeout(tt105InstallBenchDrag,1500);

/* === slut v105-bench-player-id-fix === */
