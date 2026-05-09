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
        delBtn.addEventListener("click",function(e){e.stopPropagation();var count=folderCounts[f]||0;if(count===0){folders=folders.filter(function(x){return x!==f;});if(currentFolder===f)currentFolder="Alla";renderSavesList();}else{openDeleteFolderConfirm(f,"saves");}});
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
    (function(s){var row=document.createElement("div");row.className="row";var nm=document.createElement("span");nm.className="row-name";nm.textContent=s.name;var fl=document.createElement("span");fl.className="row-sub";fl.textContent=s.folder||"Allm\u00e4nt";var ld=document.createElement("button");ld.className="sa load";ld.textContent="Ladda";var mv=document.createElement("button");mv.className="sa";mv.style.cssText="color:#e8c84a;border-color:#e8c84a";mv.textContent="\u21c6 Flytta";var dl=document.createElement("button");dl.className="sa del";dl.textContent="\u00d7";ld.addEventListener("click",function(){applyState(JSON.parse(JSON.stringify(s.state)));activeFormationId=s.id;activeFormationName=s.name;updateSaveButtons();});mv.addEventListener("click",function(){openMoveFolder(s);});dl.addEventListener("click",function(){if(s.id)cloudDelete(s.id);else{savedFormations=savedFormations.filter(function(x){return x.id!==s.id;});renderSavesList();}});row.appendChild(nm);row.appendChild(fl);row.appendChild(mv);row.appendChild(ld);row.appendChild(dl);list.appendChild(row);})(sorted[i]);
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
document.getElementById("btn-reset").addEventListener("click",function(){initPlayers(document.querySelector("#formation-btns .on")?document.querySelector("#formation-btns .on").textContent:"4-4-2");arrows=[];labels=[];freehandPaths=[];zones=[];render();});
var clearBtn=document.createElement("button");clearBtn.className="btn";clearBtn.title="Rensa pilar, frihand och zoner";clearBtn.textContent="Rensa";clearBtn.addEventListener("click",function(){saveUndo();arrows=[];labels=[];freehandPaths=[];zones=[];render();showToast("Ritningar rensade!");});
document.getElementById("btn-freehand").parentNode.insertBefore(clearBtn,document.getElementById("btn-freehand"));
document.getElementById("fmt-sel").addEventListener("change",function(e){format=parseInt(e.target.value);buildFormationBtns();initPlayers((FORMATIONS[format]||FORMATIONS[11])[0]);render();});
document.getElementById("btn-half").addEventListener("click",function(){halfMode=(halfMode+1)%3;var lbl=["\u00bd Plan","\u00bd Borta","Hel"];document.getElementById("btn-half").innerHTML=lbl[halfMode];updateViewBox();});
document.getElementById("btn-panel").addEventListener("click",function(){panelOpen=!panelOpen;document.getElementById("bottompanel").classList.toggle("hidden",!panelOpen);document.getElementById("btn-panel").textContent=panelOpen?"\u25bc":"\u25b2";document.getElementById("panel-show-btn").classList.toggle("visible",!panelOpen);});
document.getElementById("panel-show-btn").addEventListener("click",function(){panelOpen=true;document.getElementById("bottompanel").classList.remove("hidden");document.getElementById("btn-panel").textContent="\u25bc";document.getElementById("panel-show-btn").classList.remove("visible");});
var topbarOpen=true;
document.getElementById("btn-topbar-toggle").addEventListener("click",function(){topbarOpen=!topbarOpen;var tb=document.getElementById("topbar");var btn=document.getElementById("btn-topbar-toggle");var children=tb.children;for(var i=0;i<children.length;i++){if(children[i]!==btn)children[i].style.display=topbarOpen?"":"none";}btn.innerHTML=topbarOpen?"\u25b2":"\u25bc";btn.title=topbarOpen?"Minimera menyn":"Visa menyn";});
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
document.getElementById("btn-stop-rec").addEventListener("click",function(){if(!activeTaktik||activeTaktik.steps.length<2)return;var newFilm={name:activeTaktik.name,steps:activeTaktik.steps};taktikFilmer.push(newFilm);cloudSaveTaktik(newFilm);activeTaktik=null;document.getElementById("rec-badge").style.display="none";document.getElementById("rec-ui").style.display="none";document.getElementById("no-rec-ui").style.display="block";renderTaktikList();});
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
          delBtn.addEventListener("click",function(e){e.stopPropagation();var count=tfCounts[f]||0;if(count===0){taktikFolders=taktikFolders.filter(function(x){return x!==f;});if(currentTaktikFolder===f)currentTaktikFolder="Alla";renderTaktikList();}else{openDeleteFolderConfirm(f,"taktik");}});
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
  for(var i=0;i<filtered.length;i++){(function(tk){var idx=taktikFilmer.indexOf(tk);var row=document.createElement("div");row.className="row";var nm=document.createElement("span");nm.className="row-name";nm.textContent=tk.name;var fl=document.createElement("span");fl.className="row-sub";fl.textContent=(tk.folder||"Allm\u00e4nt")+" \u00b7 "+(tk.steps.length-1)+" steg";var fav=document.createElement("button");fav.className="star-btn "+(tk.dbId&&favorites_[tk.dbId]?"on":"off");fav.innerHTML="&#9733;";fav.addEventListener("click",function(e){e.stopPropagation();if(tk.dbId)toggleFavorite(tk.dbId);});var pb=document.createElement("button");pb.className="sa play";pb.textContent="\u270f Redigera";pb.addEventListener("click",function(){startPlayback(idx);});var dup=document.createElement("button");dup.className="sa";dup.style.cssText="color:#4ae8e8;border-color:#4ae8e8";dup.textContent="Kopiera";dup.addEventListener("click",function(){duplicateTaktik(idx);});var newFromStart=document.createElement("button");newFromStart.className="sa";newFromStart.style.cssText="color:#e8c84a;border-color:#e8c84a";newFromStart.textContent="Fr\u00e5n start";newFromStart.title="Ny film med bara startl\u00e4get";newFromStart.addEventListener("click",function(){var copy={name:"Ny fr\u00e5n: "+tk.name,folder:tk.folder||"Allm\u00e4nt",steps:[JSON.parse(JSON.stringify(tk.steps[0]))]};taktikFilmer.push(copy);cloudSaveTaktik(copy);renderTaktikList();showToast("Ny film skapad!");});var mg=document.createElement("button");mg.className="sa";mg.style.cssText="color:#a78bfa;border-color:#a78bfa";mg.textContent="\u22d3";mg.title="Sammanfoga";mg.addEventListener("click",function(){openMergeTaktik(idx);});var sh=document.createElement("button");sh.className="sa";sh.style.cssText="color:#7aaa88;border-color:#7aaa88";sh.textContent="\u29c9";sh.title="Dela";sh.addEventListener("click",function(){openShareTaktik(tk);});var dl=document.createElement("button");dl.className="sa del";dl.textContent="\u00d7";dl.addEventListener("click",function(){if(tk.dbId){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{method:"DELETE",headers:supaHeaders()}).then(function(){cloudLoadTaktik();});}else{taktikFilmer.splice(idx,1);renderTaktikList();}});var mvTk=document.createElement("button");mvTk.className="sa";mvTk.style.cssText="color:#e8c84a;border-color:#e8c84a";mvTk.textContent="\u21c6";mvTk.title="Flytta till mapp";
      mvTk.addEventListener("click",function(){openMoveTaktikFolder(tk);});
      row.appendChild(nm);row.appendChild(fl);row.appendChild(fav);row.appendChild(pb);row.appendChild(dup);row.appendChild(newFromStart);row.appendChild(mg);row.appendChild(sh);row.appendChild(mvTk);row.appendChild(dl);list.appendChild(row);})(filtered[i]);}

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
function duplicateTaktik(idx){var tk=taktikFilmer[idx];var copy={name:"Kopia av "+tk.name,folder:tk.folder||"Allm\u00e4nt",steps:JSON.parse(JSON.stringify(tk.steps))};taktikFilmer.push(copy);renderTaktikList();cloudSaveTaktik(copy);cloudStatus("\u2705 Film kopierad","#4ae87a");showToast("Film kopierad!");setTimeout(function(){cloudLoadTaktik();},1200);}
function openMergeTaktik(idx){mergingTaktikIdx=idx;document.getElementById("merge-base-name").textContent=taktikFilmer[idx].name;var list=document.getElementById("merge-taktik-list");list.innerHTML="";for(var i=0;i<taktikFilmer.length;i++){if(i===idx)continue;(function(i2){var tk2=taktikFilmer[i2];var row=document.createElement("div");row.className="row";row.style.cursor="pointer";var nm=document.createElement("span");nm.className="row-name";nm.textContent=tk2.name;var cnt=document.createElement("span");cnt.className="row-sub";cnt.textContent=(tk2.steps.length-1)+" steg";var btn=document.createElement("button");btn.className="sa play";btn.textContent="L\u00e4gg till";btn.addEventListener("click",function(){mergeTaktik(mergingTaktikIdx,i2);document.getElementById("modal-merge-taktik").classList.add("hidden");mergingTaktikIdx=null;});row.appendChild(nm);row.appendChild(cnt);row.appendChild(btn);list.appendChild(row);})(i);}document.getElementById("modal-merge-taktik").classList.remove("hidden");}
function mergeTaktik(idxA,idxB){var tkA=taktikFilmer[idxA],tkB=taktikFilmer[idxB];var merged={name:tkA.name+" + "+tkB.name,folder:tkA.folder||"Allm\u00e4nt",steps:JSON.parse(JSON.stringify(tkA.steps)).concat(JSON.parse(JSON.stringify(tkB.steps)).slice(1))};taktikFilmer.push(merged);cloudSaveTaktik(merged);cloudStatus("\u2705 Filmer sammanfogade","#4ae87a");showToast("Filmer sammanfogade!");}
document.getElementById("merge-taktik-cancel").addEventListener("click",function(){document.getElementById("modal-merge-taktik").classList.add("hidden");mergingTaktikIdx=null;});
document.getElementById("btn-new-taktik").addEventListener("click",function(){document.getElementById("taktik-name-inp").value="";document.getElementById("modal-new-taktik").classList.remove("hidden");setTimeout(function(){document.getElementById("taktik-name-inp").focus();},150);});
document.getElementById("new-taktik-cancel").addEventListener("click",function(){document.getElementById("modal-new-taktik").classList.add("hidden");});
document.getElementById("new-taktik-ok").addEventListener("click",function(){
  var name=document.getElementById("taktik-name-inp").value.trim();if(!name)return;
  document.getElementById("modal-new-taktik").classList.add("hidden");
  var newFilm={name:name,folder:"Taktik",steps:[currentSnap()]};
  taktikFilmer.push(newFilm);cloudSaveTaktik(newFilm);
  startPlayback(taktikFilmer.length-1);
});
function startPlayback(idx){movementPaths=[];selectedId=null;var tk=taktikFilmer[idx];if(!tk||!tk.steps||!tk.steps.length){cloudStatus("\u274c Ogiltig taktikfilm","#e84a4a");return;}if(animFrame)cancelAnimationFrame(animFrame);playback={tk:tk,stepIndex:0,animating:false};var s0=tk.steps[0];restoreSnap(s0);render();document.getElementById("taktikbar").style.display="flex";document.getElementById("taktikbar-title").textContent=tk.name;updatePlaybar();editingTaktikIdx=idx;editingStepIdx=0;isEditingTaktik=true;document.getElementById("no-rec-ui").style.display="none";document.getElementById("rec-ui").style.display="none";document.getElementById("edit-taktik-ui").style.display="block";document.getElementById("edit-taktik-title-lbl").textContent="\u270f "+tk.name;updateEditStepUI_silent();document.querySelectorAll(".tab").forEach(function(t){t.classList.toggle("on",t.getAttribute("data-panel")==="taktik");});document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.id==="panel-taktik");});}
function updateEditStepUI_silent(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];if(!tk||!tk.steps)return;var s=tk.steps[editingStepIdx];movementPaths=(s.movementPaths||[]).map(function(m){return{id:m.id,playerId:m.playerId,pts:m.pts.slice()};});var total=tk.steps.length-1;document.getElementById("edit-step-counter").textContent=(editingStepIdx===0?"Start":"Steg "+editingStepIdx)+"/"+total;document.getElementById("edit-step-name-inp").value=s.label||(editingStepIdx===0?"Startl\u00e4ge":"Steg "+editingStepIdx);document.getElementById("btn-edit-step-prev").style.opacity=editingStepIdx>0?"1":"0.3";document.getElementById("btn-edit-step-next").style.opacity=editingStepIdx<total?"1":"0.3";document.getElementById("btn-edit-del-step").style.opacity=editingStepIdx>0?"1":"0.3";renderEditSteps(tk);}
function stopPlayback(){if(animFrame)cancelAnimationFrame(animFrame);playback=null;movementPaths=[];selectedId=null;document.getElementById("taktikbar").style.display="none";document.getElementById("bottompanel").classList.remove("hidden");exitEditTaktik();render();}
document.getElementById("btn-stop-play").addEventListener("click",stopPlayback);
document.getElementById("btn-edit-update-step2").addEventListener("click",function(){
  if(editingTaktikIdx===null)return;
  var tk=taktikFilmer[editingTaktikIdx];
  var snap=currentSnap();
  var lbl=document.getElementById("edit-step-name-inp").value.trim();if(lbl)snap.label=lbl;
  // Update ALL future step positions to movement path endpoints
  if(snap.movementPaths&&snap.movementPaths.length){
    snap.movementPaths.forEach(function(mp){
      if(!mp.pts||!mp.pts.length)return;
      var ep=mp.pts[mp.pts.length-1];
      for(var si=editingStepIdx+1;si<tk.steps.length;si++){
        var fs=tk.steps[si];
        if(!fs)continue;
        if(mp.playerId==="ball"){fs.ball.x=ep.x;fs.ball.y=ep.y;}
        else{var np=fs.players.find(function(x){return x.id===mp.playerId;});if(np){np.x=ep.x;np.y=ep.y;}}
      }
    });
  }
  // Keep movement paths in snap for animation, clear live drawing state
  movementPaths=[];
  saveTaktikUndo();tk.steps[editingStepIdx]=snap;
  if(playback)playback.tk=taktikFilmer[editingTaktikIdx];
  showToast("Steg sparat!");cloudStatus("\u2705 Steg sparat","#4ae87a");renderEditSteps(tk);
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
var saveBtn=document.createElement("button");saveBtn.className="btn";saveBtn.textContent="Spara som";saveBtn.id="btn-save-as-topbar";saveBtn.style.marginLeft="2px";saveBtn.addEventListener("click",function(){var d=new Date();document.getElementById("save-name-inp").value="Uppst\u00e4llning "+d.getDate()+"/"+(d.getMonth()+1)+" "+d.getHours()+":"+("0"+d.getMinutes()).slice(-2);updateFolderSelect();document.getElementById("modal-savename").classList.remove("hidden");});
document.getElementById("btn-half").parentNode.insertBefore(saveBtn,document.getElementById("btn-half"));
document.getElementById("btn-cloud-save").addEventListener("click",function(){var d=new Date();document.getElementById("save-name-inp").value="Uppst\u00e4llning "+d.getDate()+"/"+(d.getMonth()+1)+" "+d.getHours()+":"+("0"+d.getMinutes()).slice(-2);updateFolderSelect();document.getElementById("modal-savename").classList.remove("hidden");});
document.getElementById("btn-cloud-refresh").addEventListener("click",function(){cloudLoadSaves();cloudLoadTaktik();});
document.getElementById("savename-cancel").addEventListener("click",function(){document.getElementById("modal-savename").classList.add("hidden");});
document.getElementById("savename-ok").addEventListener("click",function(){var name=document.getElementById("save-name-inp").value.trim()||"Uppst\u00e4llning";document.getElementById("modal-savename").classList.add("hidden");cloudSaveWithName(name);});
function updateSaveButtons(){var hasActive=activeFormationId&&activeFormationName;var btn=document.getElementById("btn-save-over");if(btn){btn.style.display=hasActive?"":"none";btn.textContent="\u2665 Spara"+(activeFormationName?" \u201e"+activeFormationName+"\u201c":"");}}
document.getElementById("btn-save-over").addEventListener("click",function(){if(!activeFormationId)return;cloudStatus("Sparar...","#7aaa88");fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+activeFormationId,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({data:buildState()})}).then(function(r){return r.json();}).then(function(){cloudStatus("\u2705 Sparat: "+activeFormationName,"#4ae87a");showToast("Sparat!");cloudLoadSaves();}).catch(function(err){cloudStatus("\u274c Fel: "+err.message,"#e84a4a");});});
document.getElementById("btn-new-folder").addEventListener("click",function(){document.getElementById("new-folder-inp").value="";document.getElementById("modal-new-folder").classList.remove("hidden");setTimeout(function(){document.getElementById("new-folder-inp").focus();},100);});
document.getElementById("new-folder-cancel").addEventListener("click",function(){document.getElementById("modal-new-folder").classList.add("hidden");});
document.getElementById("new-folder-ok").addEventListener("click",function(){var name=document.getElementById("new-folder-inp").value.trim();if(name){if(pendingFolderTarget==="taktik"){var fullName=pendingFolderParent?pendingFolderParent+"/"+name:name;if(taktikFolders.indexOf(fullName)===-1)taktikFolders.push(fullName);pendingFolderParent=null;renderTaktikList();}else{if(folders.indexOf(name)===-1)folders.push(name);updateFolderSelect();var sel=document.getElementById("folder-select");if(sel)sel.value=name;if(pendingMoveAfterCreate&&movingId){cloudMoveToFolder(movingId,name);movingId=null;pendingMoveAfterCreate=false;}renderSavesList();}}document.getElementById("modal-new-folder").classList.add("hidden");});
document.getElementById("new-folder-inp").addEventListener("keydown",function(e){if(e.key==="Enter")document.getElementById("new-folder-ok").click();});
function cloudSaveWithName(name){cloudStatus("Sparar...","#7aaa88");var folderSel=document.getElementById("folder-select");var folder=folderSel?folderSel.value:"Allm\u00e4nt";var body=JSON.stringify({name:name,data:buildState(),type:"uppstallning",folder:folder});fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{method:"POST",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:body}).then(function(r){return r.text();}).then(function(text){try{var data=JSON.parse(text);if(Array.isArray(data)&&data[0]&&data[0].id){cloudStatus("\u2705 Sparat: "+name,"#4ae87a");showToast("Sparat!");cloudLoadSaves();}else cloudStatus("\u274c Fel: "+text.substring(0,80),"#e84a4a");}catch(e){cloudStatus("\u274c Parse-fel: "+e.message,"#e84a4a");}}).catch(function(err){cloudStatus("\u274c Fel: "+err.message,"#e84a4a");}); }
function cloudLoadSaves(){cloudStatus("Laddar...","#7aaa88");fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.uppstallning&order=folder.asc,id.desc",{headers:supaHeaders()}).then(function(r){return r.json();}).then(function(data){if(Array.isArray(data)){savedFormations=data.filter(function(row){return row.type==="uppstallning";}).map(function(row){return{id:row.id,name:row.name,state:row.data,folder:row.folder||"Allm\u00e4nt"};});var seen={};folders=["Allm\u00e4nt"];for(var i=0;i<savedFormations.length;i++){var f=savedFormations[i].folder;if(f&&!seen[f]){seen[f]=true;if(f!=="Allm\u00e4nt")folders.push(f);}}cloudStatus(data.length+" uppst\u00e4llningar \u2705","#4ae87a");showToast(data.length+" uppst\u00e4llningar laddade");renderSavesList();updateFolderSelect();}else cloudStatus("\u274c Fel","#e84a4a");}).catch(function(err){cloudStatus("\u274c Fel: "+err.message,"#e84a4a");}); }
function cloudDelete(id){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+id,{method:"DELETE",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"})}).then(function(){cloudLoadSaves();showToast("Raderat!");}).catch(function(err){cloudStatus("\u274c Raderingsfel: "+err.message,"#e84a4a");});}
function cloudSaveTaktik(tk){if(!tk.folder)tk.folder="Taktik";var body=JSON.stringify({name:tk.name,data:tk,type:"taktikfilm",folder:tk.folder});fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{method:"POST",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:body}).then(function(r){return r.json();}).then(function(data){if(data&&data[0]&&data[0].id){tk.dbId=data[0].id;cloudStatus("\u2705 Film sparad: "+tk.name,"#4ae87a");showToast("Film sparad!");}else cloudStatus("\u274c Fel","#e84a4a");}).catch(function(){cloudStatus("\u274c Anslutningsfel","#e84a4a");});}
function cloudLoadTaktik(){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.taktikfilm&order=id.desc",{headers:supaHeaders()}).then(function(r){return r.json();}).then(function(data){if(Array.isArray(data)){taktikFilmer=data.filter(function(row){return row.type==="taktikfilm";}).map(function(row){var tk=row.data;tk.dbId=row.id;if(!tk.folder)tk.folder="Taktik";return tk;});var tfseen={};taktikFolders=["Taktik","Tr\u00e4ning"];tfseen["Taktik"]=true;tfseen["Tr\u00e4ning"]=true;taktikFilmer.forEach(function(tk){if(tk.folder&&!tfseen[tk.folder]){tfseen[tk.folder]=true;taktikFolders.push(tk.folder);}});renderTaktikList();cloudStatus(data.length+" taktikfilmer laddade","#4ae87a");showToast(data.length+" filmer laddade");}}).catch(function(){});}
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
var match={datum:datum,motstand:motstand||"Ok\u00e4nd",startade:startade,avbytare:avbytare,uppstallningar:JSON.parse(JSON.stringify(matchVariants)),mal_hemma:matchGoals.home,mal_borta:matchGoals.away};var editId=window._editingMatchId||null;if(editId){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+editId,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({name:datum+" "+match.motstand,data:match})}).then(function(){matcher=matcher.map(function(x){return x.dbId===editId?Object.assign({},match,{dbId:editId}):x;});matchSelections={};window._editingMatchId=null;renderMatchTruppList();renderStatistik();showToast("Match uppdaterad!");});}else{fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{method:"POST",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({name:datum+" "+match.motstand,data:match,type:"match",folder:"Allm\u00e4nt"})}).then(function(r){return r.json();}).then(function(data){if(data&&data[0])match.dbId=data[0].id;matcher.push(match);matchSelections={};renderMatchTruppList();renderStatistik();renderMatchHistory();showToast("Match sparad: "+datum+" vs "+match.motstand);}).catch(function(err){cloudStatus("\u274c Fel: "+err.message,"#e84a4a");matcher.push(match);renderMatchTruppList();renderStatistik();showToast("Match sparad lokalt");});}});
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
function enterFullscreenPortrait(){document.body.classList.add("fullscreen-portrait");updateFsPortraitNav();}
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
      Object.keys(fsMap).forEach(function(bid){var b=document.getElementById(bid);if(b)b.classList.toggle("active",mode===fsMap[bid]);});
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
