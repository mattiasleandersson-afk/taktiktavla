// Taktikfilmer, steg, playback och animationer
// Flyttad ur app.js för att göra huvudfilen mindre och lättare att felsöka.

function saveTaktikUndo(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];taktikUndoStack.push(JSON.parse(JSON.stringify(tk.steps)));if(taktikUndoStack.length>30)taktikUndoStack.shift();taktikRedoStack=[];}
function taktikUndo(){if(!taktikUndoStack.length||editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];taktikRedoStack.push(JSON.parse(JSON.stringify(tk.steps)));tk.steps=taktikUndoStack.pop();editingStepIdx=Math.min(editingStepIdx,tk.steps.length-1);updateEditStepUI();showToast("\u00e5ngrat!");}
function taktikRedo(){if(!taktikRedoStack.length||editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];taktikUndoStack.push(JSON.parse(JSON.stringify(tk.steps)));tk.steps=taktikRedoStack.pop();editingStepIdx=Math.min(editingStepIdx,tk.steps.length-1);updateEditStepUI();showToast("Gjort om!");}
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
document.getElementById("btn-copy-drawings").addEventListener("click",function(){if(editingTaktikIdx===null)return;var tk=taktikFilmer[editingTaktikIdx];var nextIdx=editingStepIdx+1;if(nextIdx>=tk.steps.length){showToast("Inget n\u00e4sta steg");return;}saveTaktikUndo();var cur=tk.steps[editingStepIdx];var next=tk.steps[nextIdx];next.arrows=JSON.parse(JSON.stringify(cur.arrows||[]));next.labels=JSON.parse(JSON.stringify(cur.labels||[]));next.freehandPaths=JSON.parse(JSON.stringify(cur.freehandPaths||[]));next.zones=JSON.parse(JSON.stringify(cur.zones||[]));showToast("Ritningar kopierade till steg "+(nextIdx===0?"start":nextIdx)+"!");cloudStatus("\u2705 Ritningar kopierade","#4ae87a");});
document.getElementById("btn-copy-step").addEventListener("click",function(){if(editingTaktikIdx===null)return;copiedStep=JSON.parse(JSON.stringify(taktikFilmer[editingTaktikIdx].steps[editingStepIdx]));showToast("Steg kopierat!");document.getElementById("btn-paste-step").style.opacity="1";});
document.getElementById("btn-paste-step").addEventListener("click",function(){if(!copiedStep||editingTaktikIdx===null)return;saveTaktikUndo();var tk=taktikFilmer[editingTaktikIdx];var paste=JSON.parse(JSON.stringify(copiedStep));tk.steps.splice(editingStepIdx+1,0,paste);editingStepIdx++;updateEditStepUI();showToast("Steg inklistrat!");});
document.addEventListener("keydown",function(e){if((e.metaKey||e.ctrlKey)&&e.key==="z"&&!e.shiftKey&&editingTaktikIdx!==null){taktikUndo();}if((e.metaKey||e.ctrlKey)&&(e.key==="y"||(e.key==="z"&&e.shiftKey))&&editingTaktikIdx!==null){taktikRedo();}});
