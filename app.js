window.onerror = function(msg,src,line,col,err){
  var t=byId("toast-msg");
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
  var t=byId("toast-msg");
  if(t){t.textContent=detail;t.style.background="#e84a4a";t.style.color="#fff";t.style.display="block";t.style.opacity="1";t.style.zIndex="9999";t.style.position="fixed";t.style.top="20px";t.style.left="10px";t.style.right="10px";t.style.borderRadius="8px";t.style.padding="12px 16px";t.style.fontSize="0.75rem";t.style.maxWidth="100%";}
  console.error("Promise error:",e.reason);
});

var W=400,H=600,format=11,homeColor="#cc2200",awayColor="#002288",displayMode="number";
// Centralt spel-state har flyttats till state.js
var arrowStart=null,arrowCurrent=null;
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

// Storage/Supabase/folder-kod har flyttats till storage.js

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
function setMode(m){mode=m;byId("btn-arrow").classList.toggle("on",m==="arrow");byId("btn-text").classList.toggle("on",m==="text");byId("btn-freehand").classList.toggle("on",m==="freehand");byId("btn-zone").classList.toggle("on",m==="zone");
  byId("btn-movement").classList.toggle("on",m==="movement");
  render();svg.style.cursor=m==="arrow"||m==="freehand"||m==="zone"?"crosshair":m==="text"?"text":"default";var badge=byId("mode-badge");var ao=byId("arrow-options");var zo=byId("zone-options");var fo=byId("freehand-options");if(ao)ao.style.display=m==="arrow"?"flex":"none";if(zo)zo.style.display=m==="zone"?"flex":"none";if(fo)fo.style.display=m==="freehand"?"flex":"none";if(m==="arrow"){badge.style.display="block";badge.style.background="#2a4a8a";badge.style.color="#9ac4ff";badge.textContent="Dra f\u00f6r att rita pil";}else if(m==="text"){badge.style.display="block";badge.style.background="#4ae87a";badge.style.color="#0a1a0d";badge.textContent="Tryck p\u00e5 planen";}else if(m==="freehand"){badge.style.display="block";badge.style.background="#8b4ae8";badge.style.color="#fff";badge.textContent="Rita fritt";}else if(m==="zone"){badge.style.display="block";badge.style.background="#e87a4a";badge.style.color="#fff";badge.textContent="Dra f\u00f6r att rita zon";}else if(m==="movement"){badge.style.display="block";badge.style.background="#cc2200";badge.style.color="#fff";badge.textContent="Tryck p\u00e5 spelare och rita r\u00f6relsebana";}else badge.style.display="none";}
function buildFormationBtns(){
  var c=byId("formation-btns");c.innerHTML="";
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
      var star=byId("btn-set-default");
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
function openSetup(){byId("home-color").value=homeColor;byId("away-color").value=awayColor;document.querySelectorAll("[data-dm]").forEach(function(b){b.classList.toggle("on",b.getAttribute("data-dm")===displayMode);});buildSetupTeam("home");buildSetupTeam("away");byId("modal-setup").classList.remove("hidden");}
function buildSetupTeam(team){var c=byId("setup-"+team),tp=players.filter(function(p){return p.team===team;}),color=team==="home"?homeColor:awayColor;var html="<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:8px\"><span class='dot' id='dot-"+team+"' style=\"background:"+color+"\"><\/span><span style=\"font-size:0.78rem;color:#7aaa88;text-transform:uppercase;letter-spacing:0.5px;flex:1\">"+(team==="home"?"Hemmalag":"Bortalag")+"<\/span><button class='btn' onclick='removePlayer(\""+team+"\")' style=\"padding:3px 9px\">&#8722;<\/button><span style=\"font-weight:900;font-size:1rem;color:#4ae87a;min-width:20px;text-align:center\">"+tp.length+"<\/span><button class='btn' onclick='addPlayer(\""+team+"\")' style=\"padding:3px 9px\">+<\/button><\/div><div class='num-grid'>";for(var i=0;i<tp.length;i++){var p=tp[i];html+="<div class='num-cell'><span>"+(i===0?"MV":"#"+i)+"<\/span><input type='number' data-pid='"+p.id+"' value='"+p.number+"' min='1' max='99'><input type='text' data-name='"+p.id+"' value='"+p.name+"' placeholder='Namn' style=\"background:#111a14;color:#edf5ee;border:1px solid #2d4a35;border-radius:4px;padding:3px 5px;font-size:0.78rem;width:100%\"><\/div>";}html+="<\/div>";c.innerHTML=html;}
function addPlayer(team){var tp=players.filter(function(p){return p.team===team;});if(tp.length>=11)return;players.push({id:team[0]+"x"+Date.now(),team:team,number:tp.length+1,name:"",x:W/2+(Math.random()-0.5)*80,y:team==="home"?430:170});buildSetupTeam(team);render();}
function removePlayer(team){var tp=players.filter(function(p){return p.team===team;});if(tp.length<=0)return;var last=tp[tp.length-1];players=players.filter(function(p){return p.id!==last.id;});buildSetupTeam(team);render();}
byId("btn-setup").addEventListener("click",openSetup);
byId("setup-cancel").addEventListener("click",function(){byId("modal-setup").classList.add("hidden");});
byId("setup-apply").addEventListener("click",function(){homeColor=byId("home-color").value;awayColor=byId("away-color").value;document.querySelectorAll("#modal-setup .num-cell input[data-pid]").forEach(function(inp){var p=players.find(function(x){return x.id===inp.getAttribute("data-pid");});if(p)p.number=parseInt(inp.value)||p.number;});document.querySelectorAll("#modal-setup .num-cell input[data-name]").forEach(function(inp){var p=players.find(function(x){return x.id===inp.getAttribute("data-name");});if(p)p.name=inp.value.trim();});byId("modal-setup").classList.add("hidden");render();});
document.querySelectorAll("[data-dm]").forEach(function(b){b.addEventListener("click",function(){displayMode=b.getAttribute("data-dm");document.querySelectorAll("[data-dm]").forEach(function(x){x.classList.toggle("on",x===b);});render();});});
byId("home-color").addEventListener("input",function(e){var d=byId("dot-home");if(d)d.style.background=e.target.value;});
byId("away-color").addEventListener("input",function(e){var d=byId("dot-away");if(d)d.style.background=e.target.value;});
function openTextModal(){byId("text-inp").value="";byId("modal-text").classList.remove("hidden");setTimeout(function(){byId("text-inp").focus();},100);}
document.querySelectorAll("#size-btns [data-sz]").forEach(function(b){b.addEventListener("click",function(){labelSize=parseInt(b.getAttribute("data-sz"));document.querySelectorAll("#size-btns [data-sz]").forEach(function(x){x.classList.toggle("on",x===b);});});});
byId("text-cancel").addEventListener("click",function(){byId("modal-text").classList.add("hidden");pendingLabelPt=null;});
byId("text-ok").addEventListener("click",function(){var txt=byId("text-inp").value.trim();if(txt&&pendingLabelPt){saveUndo();labels.push({id:"lbl"+(idCounter++),x:pendingLabelPt.x,y:pendingLabelPt.y,text:txt,size:labelSize});}byId("modal-text").classList.add("hidden");pendingLabelPt=null;render();});
byId("text-inp").addEventListener("keydown",function(e){if(e.key==="Enter")byId("text-ok").click();});
var editLabelId=null;
function openEditLabel(l){editLabelId=l.id;byId("edit-text-inp").value=l.text;var sz=l.size||13;document.querySelectorAll("#edit-size-btns [data-sz]").forEach(function(b){b.classList.toggle("on",parseInt(b.getAttribute("data-sz"))===sz);});byId("modal-edit-text").classList.remove("hidden");setTimeout(function(){byId("edit-text-inp").focus();},100);}
document.querySelectorAll("#edit-size-btns [data-sz]").forEach(function(b){b.addEventListener("click",function(){document.querySelectorAll("#edit-size-btns [data-sz]").forEach(function(x){x.classList.toggle("on",x===b);});});});
byId("edit-text-cancel").addEventListener("click",function(){byId("modal-edit-text").classList.add("hidden");editLabelId=null;});
byId("edit-text-ok").addEventListener("click",function(){if(editLabelId){var txt=byId("edit-text-inp").value.trim();var sz=parseInt(document.querySelector("#edit-size-btns .on").getAttribute("data-sz"))||13;labels=labels.map(function(l){return l.id===editLabelId?{id:l.id,x:l.x,y:l.y,text:txt||l.text,size:sz}:l;});}byId("modal-edit-text").classList.add("hidden");editLabelId=null;render();});
byId("edit-text-del").addEventListener("click",function(){if(editLabelId){saveUndo();labels=labels.filter(function(l){return l.id!==editLabelId;});}byId("modal-edit-text").classList.add("hidden");editLabelId=null;render();});
byId("edit-text-inp").addEventListener("keydown",function(e){if(e.key==="Enter")byId("edit-text-ok").click();});
byId("btn-arrow").addEventListener("click",function(){setMode(mode==="arrow"?"move":"arrow");});
byId("chk-korridorer").addEventListener("change",function(){showKorridorer=this.checked;render();});
byId("chk-arrow-numbers").addEventListener("change",function(){showArrowNumbers=this.checked;render();});
byId("btn-daylight").addEventListener("click",function(){daylightMode=!daylightMode;document.body.classList.toggle("daylight",daylightMode);this.innerHTML=daylightMode?"&#9790; Normal":"&#9728; Dag";this.style.color=daylightMode?"var(--accent)":"";this.style.borderColor=daylightMode?"var(--accent)":"";drawPitch();render();});
byId("btn-freehand").addEventListener("click",function(){setMode(mode==="freehand"?"move":"freehand");});
byId("btn-zone").addEventListener("click",function(){setMode(mode==="zone"?"move":"zone");});
byId("btn-movement").addEventListener("click",function(){setMode(mode==="movement"?"move":"movement");});
byId("arrow-color-sel").addEventListener("change",function(){arrowColor=this.value;});
byId("arrow-type-sel").addEventListener("change",function(){arrowType=this.value;});
byId("arrow-width-sel").addEventListener("change",function(){arrowWidth=parseInt(this.value);});
byId("freehand-color-sel").addEventListener("change",function(){freehandColor=this.value;});
byId("freehand-width-sel").addEventListener("change",function(){freehandWidth=parseInt(this.value);});
byId("zone-shape-sel").addEventListener("change",function(){zoneShapeType=this.value;});
byId("zone-color-sel").addEventListener("change",function(){zoneColor=this.value;});
byId("btn-text").addEventListener("click",function(){setMode(mode==="text"?"move":"text");});
byId("btn-undo").addEventListener("click",doUndo);
byId("btn-reset").addEventListener("click",function(){initPlayers(document.querySelector("#formation-btns .on")?document.querySelector("#formation-btns .on").textContent:"4-4-2");arrows=[];labels=[];freehandPaths=[];zones=[];render();});
var clearBtn=document.createElement("button");clearBtn.className="btn";clearBtn.title="Rensa pilar, frihand och zoner";clearBtn.textContent="Rensa";clearBtn.addEventListener("click",function(){saveUndo();arrows=[];labels=[];freehandPaths=[];zones=[];render();showToast("Ritningar rensade!");});
byId("btn-freehand").parentNode.insertBefore(clearBtn,byId("btn-freehand"));
byId("fmt-sel").addEventListener("change",function(e){format=parseInt(e.target.value);buildFormationBtns();initPlayers((FORMATIONS[format]||FORMATIONS[11])[0]);render();});
byId("btn-half").addEventListener("click",function(){halfMode=(halfMode+1)%3;var lbl=["\u00bd Plan","\u00bd Borta","Hel"];byId("btn-half").innerHTML=lbl[halfMode];updateViewBox();});
byId("btn-panel").addEventListener("click",function(){panelOpen=!panelOpen;byId("bottompanel").classList.toggle("hidden",!panelOpen);byId("btn-panel").textContent=panelOpen?"\u25bc":"\u25b2";byId("panel-show-btn").classList.toggle("visible",!panelOpen);});
byId("panel-show-btn").addEventListener("click",function(){panelOpen=true;byId("bottompanel").classList.remove("hidden");byId("btn-panel").textContent="\u25bc";byId("panel-show-btn").classList.remove("visible");});
var topbarOpen=true;
byId("btn-topbar-toggle").addEventListener("click",function(){topbarOpen=!topbarOpen;var tb=byId("topbar");var btn=byId("btn-topbar-toggle");var children=tb.children;for(var i=0;i<children.length;i++){if(children[i]!==btn)children[i].style.display=topbarOpen?"":"none";}btn.innerHTML=topbarOpen?"\u25b2":"\u25bc";btn.title=topbarOpen?"Minimera menyn":"Visa menyn";});
byId("taktik-search").addEventListener("input",function(e){taktikSearch=e.target.value;renderTaktikList();});
document.querySelectorAll(".tab").forEach(function(tab){tab.addEventListener("click",function(){if(mode==="movement")setMode("move");movementPaths=[];selectedId=null;var name=tab.getAttribute("data-panel");document.querySelectorAll(".tab").forEach(function(t){t.classList.toggle("on",t===tab);});document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.id==="panel-"+name);});if(name==="saves")renderSavesList();if(name==="lag"){
      // Reset to formation positions unless bench-bar is actively showing
      var benchActive=byId("bench-bar").classList.contains("active");
      if(!benchActive){
        matchRoster=[];matchAssignments={};matchVariants=[];activeVariantIdx=0;
        if(_defaultFormat!==format){format=_defaultFormat;byId("fmt-sel").value=String(format);buildFormationBtns();}
        var activeFormText=document.querySelector("#formation-btns .btn.on:not(.star-default)");
        initPlayers(activeFormText?activeFormText.textContent:_defaultFormation);
        render();
      }
      halfMode=1;updateViewBox();
    }else{byId("bottompanel").classList.remove("expanded");}if(name!=="lag"&&halfMode===1&&matchRoster.length===0){halfMode=0;updateViewBox();}if(name==="taktik"){if(playback)renderPlayStepList();else renderTaktikList();}});});
function startRecording(name){activeTaktik={name:name,steps:[currentSnap()]};byId("rec-badge").style.display="block";byId("rec-ui").style.display="block";byId("no-rec-ui").style.display="none";byId("rec-name-lbl").textContent="\u25cf "+name;renderRecSteps();}
byId("btn-add-step").addEventListener("click",function(){if(!activeTaktik)return;activeTaktik.steps.push(currentSnap());renderRecSteps();});
byId("btn-stop-rec").addEventListener("click",function(){if(!activeTaktik||activeTaktik.steps.length<2)return;var newFilm={name:activeTaktik.name,steps:activeTaktik.steps};taktikFilmer.push(newFilm);cloudSaveTaktik(newFilm);activeTaktik=null;byId("rec-badge").style.display="none";byId("rec-ui").style.display="none";byId("no-rec-ui").style.display="block";renderTaktikList();});
function renderRecSteps(){var list=byId("rec-steps-list");list.innerHTML="";if(!activeTaktik)return;for(var i=0;i<activeTaktik.steps.length;i++){(function(idx){var row=document.createElement("div");row.className="row";var num=document.createElement("span");num.style.cssText="font-weight:900;font-size:0.85rem;color:#4ae87a;min-width:20px";num.textContent=idx===0?"\u25ba":String(idx);var lbl=document.createElement("span");lbl.className="row-name";lbl.textContent=activeTaktik.steps[idx]&&activeTaktik.steps[idx].label?activeTaktik.steps[idx].label:(idx===0?"Startl\u00e4ge":"Steg "+idx);var jmp=document.createElement("button");jmp.className="sa jump";jmp.textContent="Hoppa";jmp.addEventListener("click",function(){restoreSnap(activeTaktik.steps[idx]);render();});var upd=document.createElement("button");upd.className="sa save2";upd.textContent="Spara";upd.addEventListener("click",function(){activeTaktik.steps[idx]=currentSnap();});row.appendChild(num);row.appendChild(lbl);row.appendChild(jmp);row.appendChild(upd);if(idx>0){var del=document.createElement("button");del.className="sa del";del.textContent="\u00d7";del.addEventListener("click",function(){activeTaktik.steps.splice(idx,1);renderRecSteps();});row.appendChild(del);}list.appendChild(row);})(i);}}
function renderTaktikList(){
  var filterDiv=byId("taktik-folder-filter");
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
        subBtn.addEventListener("click",function(e){e.stopPropagation();pendingFolderParent=f;pendingFolderTarget="taktik";byId("new-folder-inp").value="";byId("modal-new-folder").classList.remove("hidden");setTimeout(function(){byId("new-folder-inp").focus();},100);});
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
  var list=byId("taktik-list");list.innerHTML="";var q=taktikSearch.toLowerCase();
  var favorites_=typeof favorites!=="undefined"?favorites:{};
  taktikFilmer.sort(function(a,b){var af=a.dbId&&favorites_[a.dbId]?1:0;var bf=b.dbId&&favorites_[b.dbId]?1:0;return bf-af;});
  var filtered=taktikFilmer.filter(function(tk){var inFolder=currentTaktikFolder==="Alla"||(tk.folder||"Taktik")===currentTaktikFolder;var inSearch=!q||tk.name.toLowerCase().indexOf(q)>=0;return inFolder&&inSearch;});
  if(!filtered.length){list.innerHTML="<span style=\"color:#7aaa88;font-size:0.8rem\">"+(taktikSearch?"Inga tr\u00e4ffar":"Inga taktikfilmer sparade")+"<\/span>";return;}
  for(var i=0;i<filtered.length;i++){(function(tk){var idx=taktikFilmer.indexOf(tk);var row=document.createElement("div");row.className="row";var nm=document.createElement("span");nm.className="row-name";nm.textContent=tk.name;var fl=document.createElement("span");fl.className="row-sub";fl.textContent=(tk.folder||"Allm\u00e4nt")+" \u00b7 "+(tk.steps.length-1)+" steg";var fav=document.createElement("button");fav.className="star-btn "+(tk.dbId&&favorites_[tk.dbId]?"on":"off");fav.innerHTML="&#9733;";fav.addEventListener("click",function(e){e.stopPropagation();if(tk.dbId)toggleFavorite(tk.dbId);});var pb=document.createElement("button");pb.className="sa play";pb.textContent="\u270f Redigera";pb.addEventListener("click",function(){startPlayback(idx);});var dup=document.createElement("button");dup.className="sa";dup.style.cssText="color:#4ae8e8;border-color:#4ae8e8";dup.textContent="Kopiera";dup.addEventListener("click",function(){duplicateTaktik(idx);});var newFromStart=document.createElement("button");newFromStart.className="sa";newFromStart.style.cssText="color:#e8c84a;border-color:#e8c84a";newFromStart.textContent="Fr\u00e5n start";newFromStart.title="Ny film med bara startl\u00e4get";newFromStart.addEventListener("click",function(){var copy={name:"Ny fr\u00e5n: "+tk.name,folder:tk.folder||"Allm\u00e4nt",steps:[JSON.parse(JSON.stringify(tk.steps[0]))]};taktikFilmer.push(copy);cloudSaveTaktik(copy);renderTaktikList();showToast("Ny film skapad!");});var mg=document.createElement("button");mg.className="sa";mg.style.cssText="color:#a78bfa;border-color:#a78bfa";mg.textContent="\u22d3";mg.title="Sammanfoga";mg.addEventListener("click",function(){openMergeTaktik(idx);});var sh=document.createElement("button");sh.className="sa";sh.style.cssText="color:#7aaa88;border-color:#7aaa88";sh.textContent="\u29c9";sh.title="Dela";sh.addEventListener("click",function(){openShareTaktik(tk);});var dl=document.createElement("button");dl.className="sa del";dl.textContent="\u00d7";dl.addEventListener("click",function(){if(tk.dbId){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{method:"DELETE",headers:supaHeaders()}).then(function(){cloudLoadTaktik();});}else{taktikFilmer.splice(idx,1);renderTaktikList();}});var mvTk=document.createElement("button");mvTk.className="sa";mvTk.style.cssText="color:#e8c84a;border-color:#e8c84a";mvTk.textContent="\u21c6";mvTk.title="Flytta till mapp";
      mvTk.addEventListener("click",function(){openMoveTaktikFolder(tk);});
      row.appendChild(nm);row.appendChild(fl);row.appendChild(fav);row.appendChild(pb);row.appendChild(dup);row.appendChild(newFromStart);row.appendChild(mg);row.appendChild(sh);row.appendChild(mvTk);row.appendChild(dl);list.appendChild(row);})(filtered[i]);}

}
var editingStepIdx=0;
function openEditTaktik(idx){editingTaktikIdx=idx;editingStepIdx=0;var tk=taktikFilmer[idx];if(tk.steps&&tk.steps[0])restoreSnap(tk.steps[0]);render();byId("no-rec-ui").style.display="none";byId("rec-ui").style.display="none";byId("edit-taktik-ui").style.display="block";byId("edit-taktik-title-lbl").textContent="\u270f "+tk.name;isEditingTaktik=true;updateEditStepUI();document.querySelectorAll(".tab").forEach(function(t){t.classList.toggle("on",t.getAttribute("data-panel")==="taktik");});document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.id==="panel-taktik");});}
function updateEditStepUI(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];if(!tk||!tk.steps)return;var s=tk.steps[editingStepIdx];movementPaths=(s.movementPaths||[]).map(function(m){return{id:m.id,playerId:m.playerId,pts:m.pts.slice()};});var total=tk.steps.length-1;byId("edit-step-counter").textContent=(editingStepIdx===0?"Start":"Steg "+editingStepIdx)+"/"+total;byId("edit-step-name-inp").value=s.label||(editingStepIdx===0?"Startl\u00e4ge":"Steg "+editingStepIdx);byId("btn-edit-step-prev").style.opacity=editingStepIdx>0?"1":"0.3";byId("btn-edit-step-next").style.opacity=editingStepIdx<total?"1":"0.3";byId("btn-edit-del-step").style.opacity=editingStepIdx>0?"1":"0.3";restoreSnap(s);render();renderEditSteps(tk);}
function exitEditTaktik(){movementPaths=[];selectedId=null;editingTaktikIdx=null;editingStepIdx=0;isEditingTaktik=false;byId("edit-taktik-ui").style.display="none";byId("no-rec-ui").style.display="block";renderTaktikList();}
function renderEditSteps(tk){var list=byId("edit-taktik-steps");list.innerHTML="";for(var i=0;i<tk.steps.length;i++){(function(idx){var s=tk.steps[idx];var row=document.createElement("div");row.className="row"+(idx===editingStepIdx?" on":"");row.draggable=true;row.dataset.idx=idx;row.style.cursor="grab";
      row.addEventListener("click",function(e){
        // Don't trigger on button clicks
        if(e.target.tagName==="BUTTON"||e.target.tagName==="INPUT")return;
        if(editingTaktikIdx===null)return;
        movementPaths=[];selectedId=null;
        editingStepIdx=idx;
        if(playback){animateToStep(idx);}
        else{updateEditStepUI();}
      });var num=document.createElement("span");num.style.cssText="font-weight:900;font-size:0.85rem;color:#4ae87a;min-width:20px";num.textContent=idx===0?"\u25ba":String(idx);var nameInp=document.createElement("input");nameInp.type="text";nameInp.value=s.label||(idx===0?"Startl\u00e4ge":"Steg "+idx);nameInp.style.cssText="flex:1;background:#111a14;color:#edf5ee;border:1px solid #2d4a35;border-radius:4px;padding:3px 6px;font-size:0.78rem";nameInp.addEventListener("change",function(){s.label=nameInp.value;});var del=document.createElement("button");del.className="sa del";del.textContent="\u00d7";del.style.display=idx===0?"none":"";del.addEventListener("click",function(){tk.steps.splice(idx,1);renderEditSteps(tk);});var up=document.createElement("button");up.className="sa";up.textContent="\u2191";up.style.display=idx<=1?"none":"";up.addEventListener("click",function(){if(idx>1){var tmp=tk.steps[idx];tk.steps[idx]=tk.steps[idx-1];tk.steps[idx-1]=tmp;renderEditSteps(tk);}});var dn=document.createElement("button");dn.className="sa";dn.textContent="\u2193";dn.style.display=idx===0||idx===tk.steps.length-1?"none":"";dn.addEventListener("click",function(){if(idx<tk.steps.length-1){var tmp=tk.steps[idx];tk.steps[idx]=tk.steps[idx+1];tk.steps[idx+1]=tmp;renderEditSteps(tk);}});row.appendChild(num);row.appendChild(nameInp);row.appendChild(up);row.appendChild(dn);row.appendChild(del);list.appendChild(row);})(i);}}
byId("btn-edit-taktik-exit").addEventListener("click",exitEditTaktik);
byId("btn-edit-taktik-save").addEventListener("click",function(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];if(tk.dbId){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({name:tk.name,data:tk,folder:tk.folder||"Allm\u00e4nt"})}).then(function(){cloudStatus("\u2705 Film sparad","#4ae87a");});}else cloudStatus("\u2705 Sparad lokalt","#4ae87a");});
byId("btn-edit-step-prev").addEventListener("click",function(){if(editingTaktikIdx===null||editingStepIdx<=0)return;editingStepIdx--;updateEditStepUI();});
byId("btn-edit-step-next").addEventListener("click",function(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];if(editingStepIdx>=tk.steps.length-1)return;editingStepIdx++;updateEditStepUI();});
byId("btn-edit-update-step").addEventListener("click",function(){byId("btn-edit-update-step2").click();});
byId("btn-edit-add-step").addEventListener("click",function(){if(editingTaktikIdx===null)return;saveTaktikUndo();var tk=taktikFilmer[editingTaktikIdx];var snap=currentSnap();tk.steps.splice(editingStepIdx+1,0,snap);editingStepIdx++;updateEditStepUI();});
byId("btn-edit-del-step").addEventListener("click",function(){if(editingTaktikIdx===null||editingStepIdx===0)return;saveTaktikUndo();var tk=taktikFilmer[editingTaktikIdx];tk.steps.splice(editingStepIdx,1);editingStepIdx=Math.min(editingStepIdx,tk.steps.length-1);updateEditStepUI();});
byId("btn-edit-taktik-meta").addEventListener("click",function(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];byId("edit-taktik-name-inp").value=tk.name;var sel=byId("edit-taktik-folder");sel.innerHTML="";var allTF=["Taktik","Tr\u00e4ning"];var tfSeen2={};allTF.forEach(function(x){tfSeen2[x]=true;});taktikFolders.forEach(function(f){if(!tfSeen2[f]){tfSeen2[f]=true;allTF.push(f);}});if(tk.folder&&!tfSeen2[tk.folder]){allTF.push(tk.folder);}allTF.sort(function(a,b){return a.localeCompare(b,"sv");});allTF.forEach(function(f){var o=document.createElement("option");o.value=f;o.textContent=f;if((tk.folder||"Taktik")===f)o.selected=true;sel.appendChild(o);});byId("modal-edit-taktik-meta").classList.remove("hidden");});
byId("edit-taktik-cancel").addEventListener("click",function(){byId("modal-edit-taktik-meta").classList.add("hidden");});
byId("edit-taktik-ok").addEventListener("click",function(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];tk.name=byId("edit-taktik-name-inp").value.trim()||tk.name;tk.folder=byId("edit-taktik-folder").value;if(tk.dbId){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({name:tk.name,data:tk,folder:tk.folder})}).then(function(){cloudStatus("\u2705 Film uppdaterad","#4ae87a");showToast("Film uppdaterad!");cloudLoadTaktik();});}else{cloudStatus("\u2705 Film uppdaterad (lokalt)","#4ae87a");showToast("Film uppdaterad!");renderTaktikList();}byId("modal-edit-taktik-meta").classList.add("hidden");byId("edit-taktik-title-lbl").textContent="\u270f "+tk.name;});
function duplicateTaktik(idx){var tk=taktikFilmer[idx];var copy={name:"Kopia av "+tk.name,folder:tk.folder||"Allm\u00e4nt",steps:JSON.parse(JSON.stringify(tk.steps))};taktikFilmer.push(copy);renderTaktikList();cloudSaveTaktik(copy);cloudStatus("\u2705 Film kopierad","#4ae87a");showToast("Film kopierad!");setTimeout(function(){cloudLoadTaktik();},1200);}
function openMergeTaktik(idx){mergingTaktikIdx=idx;byId("merge-base-name").textContent=taktikFilmer[idx].name;var list=byId("merge-taktik-list");list.innerHTML="";for(var i=0;i<taktikFilmer.length;i++){if(i===idx)continue;(function(i2){var tk2=taktikFilmer[i2];var row=document.createElement("div");row.className="row";row.style.cursor="pointer";var nm=document.createElement("span");nm.className="row-name";nm.textContent=tk2.name;var cnt=document.createElement("span");cnt.className="row-sub";cnt.textContent=(tk2.steps.length-1)+" steg";var btn=document.createElement("button");btn.className="sa play";btn.textContent="L\u00e4gg till";btn.addEventListener("click",function(){mergeTaktik(mergingTaktikIdx,i2);byId("modal-merge-taktik").classList.add("hidden");mergingTaktikIdx=null;});row.appendChild(nm);row.appendChild(cnt);row.appendChild(btn);list.appendChild(row);})(i);}byId("modal-merge-taktik").classList.remove("hidden");}
function mergeTaktik(idxA,idxB){var tkA=taktikFilmer[idxA],tkB=taktikFilmer[idxB];var merged={name:tkA.name+" + "+tkB.name,folder:tkA.folder||"Allm\u00e4nt",steps:JSON.parse(JSON.stringify(tkA.steps)).concat(JSON.parse(JSON.stringify(tkB.steps)).slice(1))};taktikFilmer.push(merged);cloudSaveTaktik(merged);cloudStatus("\u2705 Filmer sammanfogade","#4ae87a");showToast("Filmer sammanfogade!");}
byId("merge-taktik-cancel").addEventListener("click",function(){byId("modal-merge-taktik").classList.add("hidden");mergingTaktikIdx=null;});
byId("btn-new-taktik").addEventListener("click",function(){byId("taktik-name-inp").value="";byId("modal-new-taktik").classList.remove("hidden");setTimeout(function(){byId("taktik-name-inp").focus();},150);});
byId("new-taktik-cancel").addEventListener("click",function(){byId("modal-new-taktik").classList.add("hidden");});
byId("new-taktik-ok").addEventListener("click",function(){
  var name=byId("taktik-name-inp").value.trim();if(!name)return;
  byId("modal-new-taktik").classList.add("hidden");
  var newFilm={name:name,folder:"Taktik",steps:[currentSnap()]};
  taktikFilmer.push(newFilm);cloudSaveTaktik(newFilm);
  startPlayback(taktikFilmer.length-1);
});
function startPlayback(idx){movementPaths=[];selectedId=null;var tk=taktikFilmer[idx];if(!tk||!tk.steps||!tk.steps.length){cloudStatus("\u274c Ogiltig taktikfilm","#e84a4a");return;}if(animFrame)cancelAnimationFrame(animFrame);playback={tk:tk,stepIndex:0,animating:false};var s0=tk.steps[0];restoreSnap(s0);render();byId("taktikbar").style.display="flex";byId("taktikbar-title").textContent=tk.name;updatePlaybar();editingTaktikIdx=idx;editingStepIdx=0;isEditingTaktik=true;byId("no-rec-ui").style.display="none";byId("rec-ui").style.display="none";byId("edit-taktik-ui").style.display="block";byId("edit-taktik-title-lbl").textContent="\u270f "+tk.name;updateEditStepUI_silent();document.querySelectorAll(".tab").forEach(function(t){t.classList.toggle("on",t.getAttribute("data-panel")==="taktik");});document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.id==="panel-taktik");});}
function updateEditStepUI_silent(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];if(!tk||!tk.steps)return;var s=tk.steps[editingStepIdx];movementPaths=(s.movementPaths||[]).map(function(m){return{id:m.id,playerId:m.playerId,pts:m.pts.slice()};});var total=tk.steps.length-1;byId("edit-step-counter").textContent=(editingStepIdx===0?"Start":"Steg "+editingStepIdx)+"/"+total;byId("edit-step-name-inp").value=s.label||(editingStepIdx===0?"Startl\u00e4ge":"Steg "+editingStepIdx);byId("btn-edit-step-prev").style.opacity=editingStepIdx>0?"1":"0.3";byId("btn-edit-step-next").style.opacity=editingStepIdx<total?"1":"0.3";byId("btn-edit-del-step").style.opacity=editingStepIdx>0?"1":"0.3";renderEditSteps(tk);}
function stopPlayback(){if(animFrame)cancelAnimationFrame(animFrame);playback=null;movementPaths=[];selectedId=null;byId("taktikbar").style.display="none";byId("bottompanel").classList.remove("hidden");exitEditTaktik();render();}
byId("btn-stop-play").addEventListener("click",stopPlayback);
byId("btn-edit-update-step2").addEventListener("click",function(){
  if(editingTaktikIdx===null)return;
  var tk=taktikFilmer[editingTaktikIdx];
  var snap=currentSnap();
  var lbl=byId("edit-step-name-inp").value.trim();if(lbl)snap.label=lbl;
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
byId("btn-taktikbar-save").addEventListener("click",function(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];if(tk.dbId){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+tk.dbId,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({name:tk.name,data:tk,folder:tk.folder||"Allm\u00e4nt"})}).then(function(){showToast("Film sparad!");cloudStatus("\u2705 Film sparad","#4ae87a");});}else{showToast("Film sparad!");cloudStatus("\u2705 Sparad lokalt","#4ae87a");}});
byId("btn-first").addEventListener("click",function(){if(!playback||playback.animating)return;movementPaths=[];selectedId=null;editingStepIdx=0;playback.stepIndex=0;restoreSnap(taktikFilmer[editingTaktikIdx]?taktikFilmer[editingTaktikIdx].steps[0]:playback.tk.steps[0]);render();updatePlaybar();updateEditStepUI_silent();});
byId("btn-next").addEventListener("click",function(){if(!playback||playback.animating)return;if(playback.stepIndex>=playback.tk.steps.length-1)return;var idx=playback.stepIndex+1;editingStepIdx=idx;animateToStep(idx);updateEditStepUI_silent();});
byId("btn-prev").addEventListener("click",function(){if(!playback||playback.animating)return;if(playback.stepIndex<=0)return;var idx=playback.stepIndex-1;editingStepIdx=idx;animateToStep(idx);updateEditStepUI_silent();});
byId("play-speed").addEventListener("change",function(){animSpeed=parseInt(this.value);});
function updatePlaybar(){if(!playback)return;var cur=playback.stepIndex,total=playback.tk.steps.length-1;byId("taktikbar-title").textContent=playback.tk.name;byId("play-counter").textContent=cur===0?"Start":cur+"/"+total;byId("btn-prev").style.opacity=cur>0?"1":"0.3";byId("btn-next").style.opacity=cur<total?"1":"0.3";renderPlayStepList();updateLandscapeStrip();updateFsPortraitNav();}
function renderPlayStepList(){if(!playback)return;var list=byId("taktik-list");list.innerHTML="";var tk=playback.tk;for(var i=0;i<tk.steps.length;i++){(function(idx){var isCur=playback.stepIndex===idx;var row=document.createElement("div");row.className="row";row.style.borderColor=isCur?"#4ae87a":"#2d4a35";var num=document.createElement("span");num.style.cssText="font-weight:900;font-size:0.85rem;color:#4ae87a;min-width:20px";num.textContent=idx===0?"\u25ba":String(idx);var lbl=document.createElement("span");lbl.className="row-name";lbl.textContent=tk.steps[idx]&&tk.steps[idx].label?tk.steps[idx].label:(idx===0?"Startl\u00e4ge":"Steg "+idx);var jmp=document.createElement("button");jmp.className="sa "+(isCur?"save2":"jump");jmp.textContent=isCur?"Aktiv":"Hoppa";if(!isCur)jmp.addEventListener("click",function(){if(playback.animating)return;playback.stepIndex=idx;restoreSnap(tk.steps[idx]);render();updatePlaybar();});row.appendChild(num);row.appendChild(lbl);row.appendChild(jmp);list.appendChild(row);})(i);}}
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
          restoreSnap(target);render();if(playback){playback.animating=false;var loopOn=byId("play-loop").checked;if(loopOn&&targetIdx>=playback.tk.steps.length-1){setTimeout(function(){if(!playback)return;restoreSnap(playback.tk.steps[0]);render();playback.stepIndex=0;updatePlaybar();setTimeout(function(){if(playback)animateToStep(1);},600);},800);}}}};animFrame=requestAnimationFrame(frame);}
// buildState har flyttats till storage.js
// applyState har flyttats till storage.js
byId("btn-export").addEventListener("click",function(){var data={savedFormations:savedFormations,current:buildState()};var url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));var a=document.createElement("a");a.href=url;a.download="taktik.json";a.click();URL.revokeObjectURL(url);});
byId("btn-import-btn").addEventListener("click",function(){byId("btn-import").click();});
byId("btn-import").addEventListener("change",function(e){var file=e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){try{var data=JSON.parse(ev.target.result);if(data.savedFormations)savedFormations=data.savedFormations;if(data.current)applyState(data.current);renderSavesList();}catch(err){alert("Kunde inte l\u00e4sa filen.");}};reader.readAsText(file);e.target.value="";});
byId("btn-export-taktik").addEventListener("click",function(){var data={taktikFilmer:taktikFilmer};var url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));var a=document.createElement("a");a.href=url;a.download="taktikfilm.json";a.click();URL.revokeObjectURL(url);});
byId("btn-import-taktik-btn").addEventListener("click",function(){byId("btn-import-taktik").click();});
byId("btn-import-taktik").addEventListener("change",function(e){var file=e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){try{var data=JSON.parse(ev.target.result);if(data.taktikFilmer)taktikFilmer=data.taktikFilmer;renderTaktikList();}catch(err){alert("Kunde inte l\u00e4sa filen.");}};reader.readAsText(file);e.target.value="";});
var saveBtn=document.createElement("button");saveBtn.className="btn";saveBtn.textContent="Spara som";saveBtn.id="btn-save-as-topbar";saveBtn.style.marginLeft="2px";saveBtn.addEventListener("click",function(){var d=new Date();byId("save-name-inp").value="Uppst\u00e4llning "+d.getDate()+"/"+(d.getMonth()+1)+" "+d.getHours()+":"+("0"+d.getMinutes()).slice(-2);updateFolderSelect();byId("modal-savename").classList.remove("hidden");});
byId("btn-half").parentNode.insertBefore(saveBtn,byId("btn-half"));
byId("btn-cloud-save").addEventListener("click",function(){var d=new Date();byId("save-name-inp").value="Uppst\u00e4llning "+d.getDate()+"/"+(d.getMonth()+1)+" "+d.getHours()+":"+("0"+d.getMinutes()).slice(-2);updateFolderSelect();byId("modal-savename").classList.remove("hidden");});
byId("btn-cloud-refresh").addEventListener("click",function(){cloudLoadSaves();cloudLoadTaktik();});
byId("savename-cancel").addEventListener("click",function(){byId("modal-savename").classList.add("hidden");});
byId("savename-ok").addEventListener("click",function(){var name=byId("save-name-inp").value.trim()||"Uppst\u00e4llning";byId("modal-savename").classList.add("hidden");cloudSaveWithName(name);});
// updateSaveButtons har flyttats till storage.js
byId("btn-save-over").addEventListener("click",function(){if(!activeFormationId)return;cloudStatus("Sparar...","#7aaa88");fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+activeFormationId,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({data:buildState()})}).then(function(r){return r.json();}).then(function(){cloudStatus("\u2705 Sparat: "+activeFormationName,"#4ae87a");showToast("Sparat!");cloudLoadSaves();}).catch(function(err){cloudStatus("\u274c Fel: "+err.message,"#e84a4a");});});
byId("btn-new-folder").addEventListener("click",function(){byId("new-folder-inp").value="";byId("modal-new-folder").classList.remove("hidden");setTimeout(function(){byId("new-folder-inp").focus();},100);});
byId("new-folder-cancel").addEventListener("click",function(){byId("modal-new-folder").classList.add("hidden");});
byId("new-folder-ok").addEventListener("click",function(){var name=byId("new-folder-inp").value.trim();if(name){if(pendingFolderTarget==="taktik"){var fullName=pendingFolderParent?pendingFolderParent+"/"+name:name;if(taktikFolders.indexOf(fullName)===-1)taktikFolders.push(fullName);pendingFolderParent=null;renderTaktikList();}else{if(folders.indexOf(name)===-1)folders.push(name);updateFolderSelect();var sel=byId("folder-select");if(sel)sel.value=name;if(pendingMoveAfterCreate&&movingId){cloudMoveToFolder(movingId,name);movingId=null;pendingMoveAfterCreate=false;}renderSavesList();}}byId("modal-new-folder").classList.add("hidden");});
byId("new-folder-inp").addEventListener("keydown",function(e){if(e.key==="Enter")byId("new-folder-ok").click();});
// cloudSaveWithName har flyttats till storage.js
// cloudLoadSaves har flyttats till storage.js
// cloudDelete har flyttats till storage.js
// cloudSaveTaktik har flyttats till storage.js
// cloudLoadTaktik har flyttats till storage.js
byId("btn-copy-drawings").addEventListener("click",function(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];var nextIdx=editingStepIdx+1;if(nextIdx>=tk.steps.length){showToast("Inget n\u00e4sta steg");return;}saveTaktikUndo();var cur=tk.steps[editingStepIdx];var next=tk.steps[nextIdx];next.arrows=JSON.parse(JSON.stringify(cur.arrows||[]));next.labels=JSON.parse(JSON.stringify(cur.labels||[]));next.freehandPaths=JSON.parse(JSON.stringify(cur.freehandPaths||[]));next.zones=JSON.parse(JSON.stringify(cur.zones||[]));showToast("Ritningar kopierade till steg "+(nextIdx===0?"start":nextIdx)+"!");cloudStatus("\u2705 Ritningar kopierade","#4ae87a");});
byId("btn-copy-step").addEventListener("click",function(){if(editingTaktikIdx===null)return;copiedStep=JSON.parse(JSON.stringify(taktikFilmer[editingTaktikIdx].steps[editingStepIdx]));showToast("Steg kopierat!");byId("btn-paste-step").style.opacity="1";});
byId("btn-paste-step").addEventListener("click",function(){if(!copiedStep||editingTaktikIdx===null)return;saveTaktikUndo();var tk=taktikFilmer[editingTaktikIdx];var paste=JSON.parse(JSON.stringify(copiedStep));tk.steps.splice(editingStepIdx+1,0,paste);editingStepIdx++;updateEditStepUI();showToast("Steg inklistrat!");});
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
function openPlayerColor(pid){_pendingColorPlayerId=pid;var cont=byId("player-color-swatches");cont.innerHTML="";_colorSwatches.forEach(function(c){var sw=document.createElement("button");sw.style.cssText="width:36px;height:36px;border-radius:50%;background:"+c+";border:3px solid "+(playerColors[pid]===c?"#4ae87a":"#2d4a35")+";cursor:pointer;margin:2px";sw.addEventListener("click",function(){playerColors[pid]=c;byId("modal-player-color").classList.add("hidden");render();showToast("F\u00e4rg \u00e4ndrad!");});cont.appendChild(sw);});byId("modal-player-color").classList.remove("hidden");}
byId("player-color-reset").addEventListener("click",function(){if(_pendingColorPlayerId)delete playerColors[_pendingColorPlayerId];byId("modal-player-color").classList.add("hidden");render();});
byId("player-color-close").addEventListener("click",function(){byId("modal-player-color").classList.add("hidden");});
var _lastTap={id:null,time:0};
byId("btn-backup").addEventListener("click",function(){byId("modal-backup").classList.remove("hidden");});
byId("backup-cancel").addEventListener("click",function(){byId("modal-backup").classList.add("hidden");});
byId("backup-download").addEventListener("click",function(){var data={savedFormations:savedFormations,taktikFilmer:taktikFilmer,exported:new Date().toISOString()};var blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download="taktiktavla-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(url);byId("modal-backup").classList.add("hidden");showToast("Backup nedladdad!");});
byId("bench-size-up").addEventListener("click",function(){matchNameSize=Math.min(20,matchNameSize+1);byId("bench-size-lbl").textContent=matchNameSize;render();});
byId("bench-size-down").addEventListener("click",function(){matchNameSize=Math.max(7,matchNameSize-1);byId("bench-size-lbl").textContent=matchNameSize;render();});
byId("bench-exit-btn").addEventListener("click",function(){matchRoster=[];matchAssignments={};matchVariants=[];activeVariantIdx=0;matchGoals={home:0,away:0};updateGoalDisplay();window._editingMatchId=null;halfMode=0;updateViewBox();players.filter(function(p){return p.team==="home";}).forEach(function(p){p.name="";p.number=0;});render();byId("bench-bar").classList.remove("active");var go2=byId("goal-overlay");if(go2)go2.style.display="none";showToast("Laguppst\u00e4llning avslutad");});
byId("bench-add-var").addEventListener("click",function(){
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
  var h=byId("bench-goal-home");
  var a=byId("bench-goal-away");
  if(h)h.textContent=matchGoals.home;
  if(a)a.textContent=matchGoals.away;
}
var bprev=byId("bench-prev-var");
var bnext=byId("bench-next-var");
var badd=byId("bench-add-var");
var bsave=byId("bench-save-btn");
var bclear=byId("bench-clear-btn");
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
    byId("fmt-sel").value=String(format);
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
  var lbl=byId("bench-var-label");
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
  var bcv=byId("bench-copy-var");
  var bpv=byId("bench-paste-var");
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
  var ghp=byId("bench-goal-home-plus");
  var ghm=byId("bench-goal-home-minus");
  var gap=byId("bench-goal-away-plus");
  var gam=byId("bench-goal-away-minus");
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
  byId("lag-trupp").style.display="none";
  byId("lag-match").style.display="";
  byId("lag-statistik").style.display="none";
  var lagSparade=byId("lag-sparade");if(lagSparade)lagSparade.style.display="none";
  byId("btn-spara-match").click();
});
var _draggingBenchPlayer=null;
var _benchDragEl=null;
var _copiedVariant=null;
var matchVariants=[]; // [{namn:"Uppst. 1", assignments:{}, playerStates:[{id,number,name}]}]
var activeVariantIdx=0;

function renderBench(){
  var bar=byId("bench-bar");var cont=byId("bench-players");
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
  var go=byId("goal-overlay");
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
function openPlayerPicker(pitchPlayerId){if(!matchRoster.length)return;assigningPlayerId=pitchPlayerId;var assigned=getAssignedTruppIds();var list=byId("player-picker-list");list.innerHTML="";var available=matchRoster.slice().sort(function(a,b){return a.namn.localeCompare(b.namn,"sv");}).filter(function(sp){return !assigned[sp.id]||(matchAssignments[pitchPlayerId]===sp.id);});if(!available.length){list.innerHTML="<span style=\"color:#7aaa88;font-size:0.85rem\">Alla spelare placerade<\/span>";}available.forEach(function(sp){var isCurrent=matchAssignments[pitchPlayerId]===sp.id;var btn=document.createElement("button");btn.className="btn"+(isCurrent?" on":"");btn.style.cssText="width:100%;text-align:left;padding:8px 12px;font-size:0.85rem";btn.innerHTML="<b style=\"color:#4ae87a\">#"+sp.nr+"<\/b> "+sp.namn;btn.addEventListener("click",function(){assignPlayerToPosition(pitchPlayerId,sp.id);byId("modal-player-picker").classList.add("hidden");assigningPlayerId=null;});list.appendChild(btn);});byId("modal-player-picker").classList.remove("hidden");}
function assignPlayerToPosition(pitchPlayerId,truppId){Object.keys(matchAssignments).forEach(function(pid){if(matchAssignments[pid]===truppId&&pid!==pitchPlayerId)delete matchAssignments[pid];});matchAssignments[pitchPlayerId]=truppId;var sp=matchRoster.find(function(x){return x.id===truppId;});var p=players.find(function(x){return x.id===pitchPlayerId;});if(sp&&p){p.number=sp.nr;p.name=sp.namn;}render();renderBench();}
byId("player-picker-cancel").addEventListener("click",function(){byId("modal-player-picker").classList.add("hidden");assigningPlayerId=null;});
byId("player-picker-clear").addEventListener("click",function(){if(assigningPlayerId){delete matchAssignments[assigningPlayerId];var p=players.find(function(x){return x.id===assigningPlayerId;});if(p){p.number=0;p.name="";}render();renderBench();}byId("modal-player-picker").classList.add("hidden");assigningPlayerId=null;});
function openShareTaktik(tk){byId("share-link-inp").value="Genererar...";byId("share-status").textContent="";byId("modal-share").classList.remove("hidden");if(tk.dbId){var url=window.location.origin+window.location.pathname+"?share="+tk.dbId;byId("share-link-inp").value=url;byId("share-status").textContent="Permanent l\u00e4nk (l\u00e4sbar f\u00f6r alla med l\u00e4nken)";}else{byId("share-status").textContent="Spara filmen f\u00f6rst f\u00f6r att f\u00e5 en l\u00e4nk";byId("share-link-inp").value="";}}
byId("share-copy-btn").addEventListener("click",function(){var inp=byId("share-link-inp");if(!inp.value)return;inp.select();try{navigator.clipboard.writeText(inp.value).then(function(){showToast("L\u00e4nk kopierad!");});}catch(e){document.execCommand("copy");showToast("L\u00e4nk kopierad!");}});
byId("share-close-btn").addEventListener("click",function(){byId("modal-share").classList.add("hidden");});
try{document.querySelectorAll("[data-lag]").forEach(function(btn){btn.addEventListener("click",function(){var target=this.getAttribute("data-lag");document.querySelectorAll("[data-lag]").forEach(function(b){b.classList.toggle("on",b.getAttribute("data-lag")===target);});byId("lag-trupp").style.display=target==="trupp"?"":"none";byId("lag-match").style.display=target==="match"?"":"none";byId("lag-statistik").style.display=target==="statistik"?"":"none";var lagSparade=byId("lag-sparade");if(lagSparade)lagSparade.style.display=target==="sparade"?"":"none";if(target==="match")renderMatchTruppList();if(target==="statistik"){renderStatistik();byId("bottompanel").classList.add("expanded");}else if(target==="sparade"){renderSparadeMatcherList();byId("bottompanel").classList.add("expanded");}else{byId("bottompanel").classList.remove("expanded");}});});
// saveTrupp har flyttats till storage.js
// loadTrupp har flyttats till storage.js
// loadMatcher har flyttats till storage.js
function renderTruppList(){var list=byId("trupp-list");if(!list)return;list.innerHTML="";var sorted=trupp.slice().sort(function(a,b){var ca=getPlayerMatchCount(a.id),cb=getPlayerMatchCount(b.id);return ca-cb||a.namn.localeCompare(b.namn,"sv");});if(!sorted.length){list.innerHTML="<span style=\"color:#7aaa88;font-size:0.8rem\">Inga spelare i truppen<\/span>";return;}sorted.forEach(function(sp){var row=document.createElement("div");row.className="row";var nr=document.createElement("span");nr.style.cssText="font-weight:900;color:#4ae87a;min-width:24px;font-size:0.85rem";nr.textContent="#"+sp.nr;var nm=document.createElement("span");nm.className="row-name";nm.textContent=sp.namn;var ed=document.createElement("button");ed.className="sa";ed.style.cssText="color:#e8c84a;border-color:#e8c84a";ed.textContent="\u270f";var dl=document.createElement("button");dl.className="sa del";dl.textContent="\u00d7";ed.addEventListener("click",function(){byId("ny-spelare-nr").value=sp.nr;byId("ny-spelare-namn").value=sp.namn;trupp=trupp.filter(function(x){return x.id!==sp.id;});renderTruppList();saveTrupp();});dl.addEventListener("click",function(){trupp=trupp.filter(function(x){return x.id!==sp.id;});renderTruppList();saveTrupp();showToast(sp.namn+" borttagen");});row.appendChild(nr);row.appendChild(nm);row.appendChild(ed);row.appendChild(dl);list.appendChild(row);});}
byId("btn-add-trupp").addEventListener("click",function(){var nr=parseInt(byId("ny-spelare-nr").value)||0;var namn=byId("ny-spelare-namn").value.trim();if(!namn)return;trupp.push({id:"sp"+Date.now(),nr:nr,namn:namn});byId("ny-spelare-nr").value="";byId("ny-spelare-namn").value="";renderTruppList();saveTrupp();showToast(namn+" tillagd!");});
byId("ny-spelare-namn").addEventListener("keydown",function(e){if(e.key==="Enter")byId("btn-add-trupp").click();});
byId("btn-ny-match").addEventListener("click",function(){matchSelections={};var d=new Date();byId("match-datum").value=d.toISOString().slice(0,10);byId("match-motstand").value="";window._editingMatchId=null;renderMatchTruppList();showToast("Ny match!");});
function getPlayerMatchCount(truppId){var from=byId("stat-from")?byId("stat-from").value:"";var to=byId("stat-to")?byId("stat-to").value:"";return matcher.filter(function(m){if(from&&m.datum<from)return false;if(to&&m.datum>to)return false;return(m.startade||[]).indexOf(truppId)>=0||(m.avbytare||[]).indexOf(truppId)>=0;}).length;}
function renderMatchTruppList(){var list=byId("match-trupp-list");if(!list)return;list.innerHTML="";var nSelected=Object.values(matchSelections).filter(function(v){return v==="start";}).length;var counter=byId("match-counter");if(counter)counter.textContent=nSelected+" vald"+(nSelected===1?"":"a");var sorted=trupp.slice().sort(function(a,b){return(a.nr||0)-(b.nr||0);});if(!sorted.length){list.innerHTML="<span style=\"color:#7aaa88;font-size:0.8rem\">L\u00e4gg till spelare i truppen f\u00f6rst<\/span>";return;}sorted.forEach(function(sp){var sel=matchSelections[sp.id]||null;var row=document.createElement("div");row.className="row";row.style.padding="4px 8px";var nr=document.createElement("span");nr.style.cssText="font-weight:900;color:#4ae87a;min-width:24px;font-size:0.82rem";nr.textContent="#"+sp.nr;var nm=document.createElement("span");nm.style.cssText="flex:1;font-size:0.82rem";nm.textContent=sp.namn;var cnt=getPlayerMatchCount(sp.id);var cntEl=document.createElement("span");cntEl.style.cssText="font-size:0.68rem;color:#7aaa88;white-space:nowrap";cntEl.textContent=cnt+" mat.";var btnS=document.createElement("button");btnS.className="btn"+(sel==="start"?" on":"");btnS.style.cssText="padding:2px 7px;font-size:0.65rem";btnS.textContent="Start";btnS.addEventListener("click",function(){matchSelections[sp.id]=sel==="start"?null:"start";renderMatchTruppList();});row.appendChild(nr);row.appendChild(nm);row.appendChild(cntEl);row.appendChild(btnS);list.appendChild(row);});}
byId("btn-match-to-taktik").addEventListener("click",function(){var startade=trupp.filter(function(sp){return matchSelections[sp.id]==="start";});if(!startade.length){showToast("V\u00e4lj startspelare f\u00f6rst!");return;}matchRoster=startade.slice();
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
      byId("fmt-sel").value=String(format);
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
  var motEl=byId("bench-motstand-lbl");
  if(motEl){var editM2=window._editingMatchId?matcher.find(function(x){return String(x.dbId)===String(window._editingMatchId);}):null;motEl.textContent=editM2?(editM2.datum+" vs "+editM2.motstand):byId("match-motstand").value||"";}
  document.querySelectorAll(".tab").forEach(function(t){t.classList.toggle("on",t.getAttribute("data-panel")==="formations");});
  document.querySelectorAll(".panel").forEach(function(p){p.classList.toggle("on",p.id==="panel-formations");});
  halfMode=1;updateViewBox();render();renderBench();
  showToast(matchVariants.length?"Uppst\u00e4llning laddad!":"Tryck p\u00e5 en position f\u00f6r att placera spelare!");});
byId("btn-spara-match").addEventListener("click",function(){var datum=byId("match-datum").value;var motstand=byId("match-motstand").value.trim();if(!datum){showToast("V\u00e4lj datum!");return;}var startade=trupp.filter(function(sp){return matchSelections[sp.id]==="start";}).map(function(sp){return sp.id;});var avbytare=trupp.filter(function(sp){return matchSelections[sp.id]==="avbytare";}).map(function(sp){return sp.id;});// Save current variant state before building match
if(matchVariants.length>0)saveCurrentVariant();
else if(Object.keys(matchAssignments).length>0){
  // Auto-save first variant
  matchVariants=[{namn:"Uppst. 1",assignments:JSON.parse(JSON.stringify(matchAssignments)),playerStates:players.filter(function(p){return p.team==="home";}).map(function(p){return{id:p.id,number:p.number,name:p.name};})}];
  activeVariantIdx=0;
}
var match={datum:datum,motstand:motstand||"Ok\u00e4nd",startade:startade,avbytare:avbytare,uppstallningar:JSON.parse(JSON.stringify(matchVariants)),mal_hemma:matchGoals.home,mal_borta:matchGoals.away};var editId=window._editingMatchId||null;if(editId){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+editId,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({name:datum+" "+match.motstand,data:match})}).then(function(){matcher=matcher.map(function(x){return x.dbId===editId?Object.assign({},match,{dbId:editId}):x;});matchSelections={};window._editingMatchId=null;renderMatchTruppList();renderStatistik();showToast("Match uppdaterad!");});}else{fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{method:"POST",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({name:datum+" "+match.motstand,data:match,type:"match",folder:"Allm\u00e4nt"})}).then(function(r){return r.json();}).then(function(data){if(data&&data[0])match.dbId=data[0].id;matcher.push(match);matchSelections={};renderMatchTruppList();renderStatistik();renderMatchHistory();showToast("Match sparad: "+datum+" vs "+match.motstand);}).catch(function(err){cloudStatus("\u274c Fel: "+err.message,"#e84a4a");matcher.push(match);renderMatchTruppList();renderStatistik();showToast("Match sparad lokalt");});}});
var statSelections={};
function renderStatistik(){var list=byId("stat-list");if(!list)return;var from=byId("stat-from").value;var to=byId("stat-to").value;var filtered=matcher.filter(function(m){if(from&&m.datum<from)return false;if(to&&m.datum>to)return false;return true;});var stats={};trupp.slice().sort(function(a,b){return a.namn.localeCompare(b.namn,"sv");}).forEach(function(sp){stats[sp.id]={id:sp.id,namn:sp.namn,nr:sp.nr,starter:0,inhopp:0};});filtered.forEach(function(m){(m.startade||[]).forEach(function(id){if(stats[id])stats[id].starter++;});(m.avbytare||[]).forEach(function(id){if(stats[id])stats[id].inhopp++;});});list.innerHTML="";if(!trupp.length){list.innerHTML="<span style=\"color:#7aaa88;font-size:0.8rem\">Inga spelare<\/span>";return;}var hdr=document.createElement("div");hdr.style.cssText="display:grid;grid-template-columns:24px 30px 1fr 40px 40px;gap:4px;padding:3px 8px;font-size:0.65rem;color:#7aaa88;font-weight:700;text-transform:uppercase;border-bottom:1px solid #2d4a35;margin-bottom:3px";hdr.innerHTML="<span><\/span><span>#<\/span><span>Spelare<\/span><span style=\"text-align:center\">Start<\/span><span style=\"text-align:center\">Tot<\/span>";list.appendChild(hdr);var sortedStats=Object.values(stats).sort(function(a,b){var totA=a.starter+a.inhopp,totB=b.starter+b.inhopp;return totB-totA||a.namn.localeCompare(b.namn,"sv");});sortedStats.forEach(function(sp){var row=document.createElement("div");row.style.cssText="display:grid;grid-template-columns:24px 30px 1fr 40px 40px;gap:4px;padding:5px 8px;font-size:0.78rem;border-bottom:1px solid #1a2e1f;cursor:pointer;align-items:center";if(statSelections[sp.id])row.style.background="rgba(74,232,122,0.1)";var chk=document.createElement("input");chk.type="checkbox";chk.checked=!!statSelections[sp.id];chk.style.cssText="width:15px;height:15px;accent-color:#4ae87a;cursor:pointer;flex-shrink:0";var nrEl=document.createElement("span");nrEl.style.color="#7aaa88";nrEl.textContent="#"+sp.nr;var nmEl=document.createElement("span");nmEl.textContent=sp.namn;var stEl=document.createElement("span");stEl.style.cssText="text-align:center;color:#4ae87a";stEl.textContent=sp.starter;var totEl=document.createElement("span");totEl.style.cssText="text-align:center;font-weight:700";totEl.textContent=(sp.starter+sp.inhopp);function toggleSel(){if(statSelections[sp.id])delete statSelections[sp.id];else statSelections[sp.id]=true;chk.checked=!!statSelections[sp.id];row.style.background=statSelections[sp.id]?"rgba(74,232,122,0.1)":"";renderStatActionBar();}chk.addEventListener("change",toggleSel);row.addEventListener("click",function(e){if(e.target!==chk)toggleSel();});row.appendChild(chk);row.appendChild(nrEl);row.appendChild(nmEl);row.appendChild(stEl);row.appendChild(totEl);list.appendChild(row);});renderStatActionBar();}
byId("btn-stat-filter").addEventListener("click",function(){
  statSelections={};
  try{localStorage.setItem("taktik_stat_from",byId("stat-from").value);localStorage.setItem("taktik_stat_to",byId("stat-to").value);}catch(e){}
  renderStatistik();
});
// Auto-save dates on change
byId("stat-from").addEventListener("change",function(){try{localStorage.setItem("taktik_stat_from",this.value);}catch(e){}});
byId("stat-to").addEventListener("change",function(){try{localStorage.setItem("taktik_stat_to",this.value);}catch(e){}});
function renderStatActionBar(){var bar=byId("stat-action-bar");if(!bar)return;var n=Object.keys(statSelections).length;bar.style.display=n>0?"flex":"none";var cnt=byId("stat-sel-count");if(cnt)cnt.textContent=n+" vald"+(n===1?"":"a");var sel=byId("stat-match-sel");if(sel){sel.innerHTML="";var opt0=document.createElement("option");opt0.value="";opt0.textContent="V\u00e4lj match...";sel.appendChild(opt0);var sorted=matcher.slice().sort(function(a,b){return b.datum.localeCompare(a.datum);});sorted.forEach(function(m){var o=document.createElement("option");o.value=m.dbId||("__local__"+m.datum+"_"+m.motstand);o.textContent=m.datum+" "+m.motstand;sel.appendChild(o);});}}
byId("btn-stat-clear-sel").addEventListener("click",function(){statSelections={};renderStatistik();});
byId("btn-stat-add-to-match").addEventListener("click",function(){var sel=byId("stat-match-sel");var dbId=sel?sel.value:"";if(!dbId){showToast("V\u00e4lj en match!");return;}var selectedIds=Object.keys(statSelections);if(!selectedIds.length){showToast("V\u00e4lj spelare!");return;}var m;if(dbId.indexOf("__local__")===0){var parts=dbId.replace("__local__","").split("_");var mDatum=parts[0],mMotstand=parts.slice(1).join("_");m=matcher.find(function(x){return x.datum===mDatum&&x.motstand===mMotstand;});}else{m=matcher.find(function(x){return String(x.dbId)===String(dbId);});}if(!m){showToast("Match ej hittad!");return;}selectedIds.forEach(function(id){if((m.startade||[]).indexOf(id)<0)m.startade.push(id);});fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+dbId,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({data:m})}).then(function(){statSelections={};renderStatistik();showToast(selectedIds.length+" spelare tillagda i "+m.datum+" "+m.motstand+"!");});});
byId("btn-stat-to-match").addEventListener("click",function(){var selectedIds=Object.keys(statSelections);matchSelections={};selectedIds.forEach(function(id){matchSelections[id]="start";});matchRoster=selectedIds.length?trupp.filter(function(sp){return statSelections[sp.id];}):[];matchAssignments={};players.filter(function(p){return p.team==="home";}).forEach(function(p){p.name="";p.number=0;});document.querySelectorAll("[data-lag]").forEach(function(b){b.classList.toggle("on",b.getAttribute("data-lag")==="match");});byId("lag-trupp").style.display="none";byId("lag-match").style.display="";byId("lag-statistik").style.display="none";byId("bottompanel").classList.remove("expanded");var d=new Date();byId("match-datum").value=d.toISOString().slice(0,10);byId("match-motstand").value="";window._editingMatchId=null;statSelections={};renderMatchTruppList();showToast(selectedIds.length?selectedIds.length+" spelare valda!":"Ny match skapad \u2013 l\u00e4gg till spelare");});
document.querySelectorAll("[data-stat]").forEach(function(btn){btn.addEventListener("click",function(){var target=this.getAttribute("data-stat");document.querySelectorAll("[data-stat]").forEach(function(b){b.classList.toggle("on",b.getAttribute("data-stat")===target);});byId("stat-spelare-view").style.display=target==="spelare"?"":"none";byId("stat-matcher-view").style.display=target==="matcher"?"":"none";if(target==="matcher")renderMatchHistory();});});
function renderMatchHistory(){var list=byId("match-history-list");if(!list)return;list.innerHTML="";var filtered=matcher.slice().sort(function(a,b){return b.datum.localeCompare(a.datum);});if(!filtered.length){list.innerHTML="<span style=\"color:#7aaa88;font-size:0.8rem\">Inga matcher i perioden<\/span>";return;}filtered.forEach(function(m){var row=document.createElement("div");row.className="row";row.style.flexWrap="wrap";var info=document.createElement("div");info.style.cssText="flex:1;min-width:0";var datum=document.createElement("span");datum.style.cssText="font-weight:700;font-size:0.82rem;color:#4ae87a";datum.textContent=m.datum;var mot=document.createElement("span");mot.className="row-sub";mot.style.marginLeft="6px";mot.textContent="vs "+m.motstand;var cnt=document.createElement("span");cnt.className="row-sub";cnt.style.display="block";cnt.textContent=(m.startade||[]).length+" startade"+(m.mal_hemma!==undefined?"  "+m.mal_hemma+"\u2013"+m.mal_borta:"");info.appendChild(datum);info.appendChild(mot);info.appendChild(cnt);var editBtn=document.createElement("button");editBtn.className="sa";editBtn.style.cssText="color:#e8c84a;border-color:#e8c84a";editBtn.textContent="\u270f";editBtn.addEventListener("click",function(){openEditMatch(m);});var delBtn=document.createElement("button");delBtn.className="sa del";delBtn.textContent="\u00d7";delBtn.addEventListener("click",function(){if(!confirm("Ta bort match "+m.datum+" vs "+m.motstand+"?"))return;if(m.dbId){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+m.dbId,{method:"DELETE",headers:supaHeaders()}).then(function(){matcher=matcher.filter(function(x){return x.dbId!==m.dbId;});renderMatchHistory();renderStatistik();showToast("Match borttagen!");});}else{matcher=matcher.filter(function(x){return x!==m;});renderMatchHistory();renderStatistik();showToast("Match borttagen!");}});row.appendChild(info);row.appendChild(editBtn);row.appendChild(delBtn);list.appendChild(row);});}
function openEditMatch(m){document.querySelectorAll("[data-lag]").forEach(function(b){b.classList.toggle("on",b.getAttribute("data-lag")==="match");});byId("lag-trupp").style.display="none";byId("lag-match").style.display="";byId("lag-statistik").style.display="none";byId("match-datum").value=m.datum;byId("match-motstand").value=m.motstand||"";matchSelections={};(m.startade||[]).forEach(function(id){matchSelections[id]="start";});renderMatchTruppList();window._editingMatchId=m.dbId||null;showToast("Redigerar match "+m.datum+" vs "+m.motstand);}
byId("btn-export-stat-csv").addEventListener("click",function(){var from=byId("stat-from").value,to=byId("stat-to").value;var filtered=matcher.filter(function(m){if(from&&m.datum<from)return false;if(to&&m.datum>to)return false;return true;});var stats={};trupp.slice().sort(function(a,b){return a.namn.localeCompare(b.namn,"sv");}).forEach(function(sp){stats[sp.id]={namn:sp.namn,nr:sp.nr,starter:0,inhopp:0};});filtered.forEach(function(m){(m.startade||[]).forEach(function(id){if(stats[id])stats[id].starter++;});(m.avbytare||[]).forEach(function(id){if(stats[id])stats[id].inhopp++;});});var rows=["#,Spelare,Starter,Totalt"];Object.values(stats).sort(function(a,b){return a.nr-b.nr;}).forEach(function(s){rows.push(s.nr+","+s.namn+","+s.starter+","+(s.starter+s.inhopp));});var blob=new Blob([rows.join("\n")],{type:"text/csv;charset=utf-8;"});var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download="spelarstatistik.csv";a.click();URL.revokeObjectURL(url);showToast("CSV exporterad!");});
byId("btn-export-stat-pdf").addEventListener("click",function(){var from=byId("stat-from").value,to=byId("stat-to").value;var filtered=matcher.filter(function(m){if(from&&m.datum<from)return false;if(to&&m.datum>to)return false;return true;});var stats={};trupp.slice().sort(function(a,b){return a.namn.localeCompare(b.namn,"sv");}).forEach(function(sp){stats[sp.id]={namn:sp.namn,nr:sp.nr,starter:0,inhopp:0};});filtered.forEach(function(m){(m.startade||[]).forEach(function(id){if(stats[id])stats[id].starter++;});(m.avbytare||[]).forEach(function(id){if(stats[id])stats[id].inhopp++;});});var rows=Object.values(stats).sort(function(a,b){return a.nr-b.nr;});var pdoc="<html><head><style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f0f0f0}<\/style><\/head><body><h2>Spelarstatistik<\/h2><p>"+(from?"Fr\u00e5n: "+from:"")+(to?" \u2013 Till: "+to:"")+" ("+filtered.length+" matcher)<\/p><table><tr><th>#<\/th><th>Spelare<\/th><th>Starter<\/th><th>Inhopp<\/th><th>Totalt<\/th><\/tr>";rows.forEach(function(s){pdoc+="<tr><td>"+s.nr+"<\/td><td>"+s.namn+"<\/td><td>"+s.starter+"<\/td><td>"+s.inhopp+"<\/td><td>"+(s.starter+s.inhopp)+"<\/td><\/tr>";});pdoc+="<\/table><\/body><\/html>";var w=window.open("","_blank");if(w){w.document.write(pdoc);w.document.close();w.print();}showToast("PDF \u00f6ppnad!");});
try{(function(){
  var d=new Date();var ds=d.toISOString().slice(0,10);
  var md=byId("match-datum");if(md)md.value=ds;
  // Load saved stat dates or use defaults
  var savedFrom=null,savedTo=null;
  try{savedFrom=localStorage.getItem("taktik_stat_from");savedTo=localStorage.getItem("taktik_stat_to");}catch(e){}
  var st=byId("stat-to");
  var sf=byId("stat-from");
  if(savedTo&&st)st.value=savedTo;
  else if(st)st.value=ds;
  if(savedFrom&&sf)sf.value=savedFrom;
  else if(sf){var y=new Date(d);y.setMonth(y.getMonth()-6);sf.value=y.toISOString().slice(0,10);}
})();}catch(e){console.error("Date IIFE error:",e);}
}catch(e){console.error("Lag JS error:",e);}
function renderSparadeMatcherList(){
  var list=byId("sparade-match-list");
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
        var motEl=byId("bench-motstand-lbl");
        if(motEl)motEl.textContent=m.datum+" vs "+m.motstand;
        if(m.uppstallningar&&m.uppstallningar.length){
          matchVariants=JSON.parse(JSON.stringify(m.uppstallningar));
          loadVariant(0);
        } else {
          // No saved lineup - use default formation
          var defF=getDefaultFormation();
          var fmt=getDefaultFormat();
          if(fmt!==format){format=fmt;byId("fmt-sel").value=String(format);buildFormationBtns();}
          var btns=document.querySelectorAll("#formation-btns .btn");
          for(var i=0;i<btns.length;i++){btns[i].classList.toggle("on",btns[i].textContent===defF);}
          initPlayers(defF);render();renderBench();updateVariantUI();
          showToast("Tom uppst\u00e4llning - placera spelare!");
        }
        halfMode=1;updateViewBox();
        byId("bench-bar").classList.add("active");
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
// openMoveTaktikFolder har flyttats till storage.js

// checkShareLink har flyttats till storage.js
function enterFullscreenPortrait(){document.body.classList.add("fullscreen-portrait");updateFsPortraitNav();}
function exitFullscreenPortrait(){document.body.classList.remove("fullscreen-portrait");}
function updateFsPortraitNav(){var label=byId("fs-step-label");var prev=byId("fs-prev-btn");var next=byId("fs-next-btn");var first=byId("fs-first-btn");if(!label)return;if(playback){var cur=playback.stepIndex,total=playback.tk.steps.length-1;label.textContent=(cur===0?"Start":cur+"/"+total);prev.disabled=cur<=0;next.disabled=cur>=total;first.disabled=cur===0;prev.classList.toggle("active",cur>0);next.classList.toggle("active",cur<total);}else{label.textContent="-";prev.disabled=true;next.disabled=true;first.disabled=true;}}
byId("fs-enter-btn").addEventListener("click",enterFullscreenPortrait);
byId("btn-fs-topbar").addEventListener("click",enterFullscreenPortrait);
byId("fs-restore-btn").addEventListener("click",exitFullscreenPortrait);
byId("fs-first-btn").addEventListener("click",function(){byId("btn-first").click();setTimeout(updateFsPortraitNav,100);});
byId("fs-prev-btn").addEventListener("click",function(){byId("btn-prev").click();setTimeout(updateFsPortraitNav,100);});
byId("fs-next-btn").addEventListener("click",function(){byId("btn-next").click();setTimeout(updateFsPortraitNav,100);});
byId("fs-day-btn").addEventListener("click",function(){byId("btn-daylight").click();this.classList.toggle("active",daylightMode);});
(function(){
  var fsMap={"fs-tb-arrow":"arrow","fs-tb-freehand":"freehand","fs-tb-zone":"zone","fs-tb-text":"text","fs-tb-movement":"movement"};
  Object.keys(fsMap).forEach(function(id){
    var el=byId(id);if(!el)return;
    el.addEventListener("click",function(){
      var m=fsMap[id];setMode(mode===m?"move":m);
      Object.keys(fsMap).forEach(function(bid){var b=byId(bid);if(b)b.classList.toggle("active",mode===fsMap[bid]);});
    });
  });
})();
(function(){
  var tbMap={"btn-tb-arrow":"arrow","btn-tb-freehand":"freehand","btn-tb-zone":"zone","btn-tb-text":"text","btn-tb-movement":"movement"};
  Object.keys(tbMap).forEach(function(id){
    var el=byId(id);if(!el)return;
    el.addEventListener("click",function(){
      var m=tbMap[id];setMode(mode===m?"move":m);
      Object.keys(tbMap).forEach(function(bid){var b=byId(bid);if(b)b.classList.toggle("on",mode===tbMap[bid]);});
    });
  });
})();
byId("ls-day-btn3").addEventListener("click",function(){daylightMode=!daylightMode;document.body.classList.toggle("daylight",daylightMode);byId("btn-daylight").innerHTML=daylightMode?"&#9790; Normal":"&#9728; Dag";drawPitch();render();});
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
  var togBtn=byId("btn-orientation-toggle");
  if(togBtn){
    togBtn.style.display=_isDesktop?"":"none";
    togBtn.textContent=isLandscape?"\u2195":"\u21c4";
    togBtn.title=isLandscape?"V\u00e4xla till st\u00e5ende":"V\u00e4xla till liggande";
  }
}

byId("btn-orientation-toggle").addEventListener("click",function(){
  if(_manualLandscape===null){
    // Currently auto - force opposite of current
    _manualLandscape=!document.body.classList.contains("landscape");
  } else {
    _manualLandscape=!_manualLandscape;
  }
  handleOrientation();render();
  this.textContent=document.body.classList.contains("landscape")?"\u2195":"\u8645";
});
function updateLandscapeStrip(){var label=byId("ls-step-label");var label2=byId("ls-side-label");var prevBtn=byId("ls-prev-btn");var nextBtn=byId("ls-next-btn");var firstBtn=byId("ls-first-btn");if(!label)return;if(playback){var cur=playback.stepIndex,total=playback.tk.steps.length-1;label.textContent=playback.tk.name+"  "+(cur===0?"Start":cur+"/"+total);if(label2)label2.textContent=playback.tk.name;var hasPrev=cur>0,hasNext=cur<total;prevBtn.disabled=!hasPrev;nextBtn.disabled=!hasNext;firstBtn.disabled=cur===0;prevBtn.classList.toggle("active",hasPrev);nextBtn.classList.toggle("active",hasNext);}else{label.textContent="-";if(label2)label2.textContent="";prevBtn.disabled=true;nextBtn.disabled=true;firstBtn.disabled=true;prevBtn.classList.remove("active");nextBtn.classList.remove("active");}}
byId("ls-first-btn").addEventListener("click",function(){byId("btn-first").click();setTimeout(updateLandscapeStrip,100);});
byId("ls-prev-btn").addEventListener("click",function(){if(!playback||playback.animating)return;if(playback.stepIndex<=0)return;var idx=playback.stepIndex-1;editingStepIdx=idx;animateToStep(idx);updateEditStepUI_silent();setTimeout(updateLandscapeStrip,100);});
byId("ls-next-btn").addEventListener("click",function(){if(!playback||playback.animating)return;if(playback.stepIndex>=playback.tk.steps.length-1)return;var idx=playback.stepIndex+1;editingStepIdx=idx;animateToStep(idx);updateEditStepUI_silent();setTimeout(updateLandscapeStrip,100);});
byId("ls-speed-sel").addEventListener("change",function(){animSpeed=parseInt(this.value);byId("play-speed").value=this.value;});
byId("ls-loop").addEventListener("change",function(){byId("play-loop").checked=this.checked;});
var _orientTimer=null;
window.addEventListener("resize",function(){if(_orientTimer)clearTimeout(_orientTimer);_orientTimer=setTimeout(function(){handleOrientation();render();_orientTimer=null;},200);});
window.addEventListener("orientationchange",function(){if(_orientTimer)clearTimeout(_orientTimer);_orientTimer=setTimeout(function(){handleOrientation();render();_orientTimer=null;},350);});

// Init
drawPitch();
handleOrientation();
// Apply default format
if(_defaultFormat!==11){format=_defaultFormat;byId("fmt-sel").value=String(format);}
buildFormationBtns();
initPlayers(_defaultFormation);
render();
cloudLoadSaves();
cloudLoadTaktik();
loadTrupp();
loadMatcher();
checkShareLink();
