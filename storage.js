// Denna fil ska laddas FÖRE app.js i index.html.
// Den innehåller lagring/Supabase/export-liknande funktioner.

// ===== Storage, Supabase och mappar (utbrutet från app.js) =====

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

// ===== Enkel profil / lagkod (förbereder appen för flera lag och användare) =====
function getUserProfile(){
  try{
    var raw=localStorage.getItem("tt_profile_v1");
    if(raw){var p=JSON.parse(raw);if(p&&p.ownerId&&p.teamId)return p;}
  }catch(e){}
  return null;
}
function normalizeTeamCode(v){return String(v||"").trim().toUpperCase().replace(/\s+/g,"-");}
function makeLocalId(prefix){return prefix+"_"+Math.random().toString(36).slice(2)+Date.now().toString(36);}
function saveUserProfile(ownerName,teamCode){
  ownerName=String(ownerName||"").trim()||"Tränare";
  teamCode=normalizeTeamCode(teamCode)||"MITT-LAG";
  var old=getUserProfile()||{};
  var p={
    ownerId:old.ownerId||makeLocalId("user"),
    ownerName:ownerName,
    teamId:teamCode,
    teamCode:teamCode,
    teamName:teamCode
  };
  localStorage.setItem("tt_profile_v1",JSON.stringify(p));
  return p;
}
function ensureUserProfile(showDialog){
  var p=getUserProfile();
  if(p&&!showDialog)return p;
  var name=prompt("Ditt namn",p&&p.ownerName?p.ownerName:"");
  if(name===null&&p)return p;
  var team=prompt("Lagkod / lagnamn",p&&p.teamCode?p.teamCode:"");
  if(team===null&&p)return p;
  return saveUserProfile(name,team);
}
function getSaveMeta(){
  var p=ensureUserProfile(false)||saveUserProfile("Tränare","MITT-LAG");
  return {
    ownerId:p.ownerId,
    ownerName:p.ownerName,
    teamId:p.teamId,
    teamCode:p.teamCode,
    sharedWithTeam:false,
    teamCanEdit:false,
    updatedAt:new Date().toISOString()
  };
}
function getUpdateMeta(){return {updatedAt:new Date().toISOString()};}
function renderProfileButton(){
  var bar=document.getElementById("topbar");
  if(!bar||document.getElementById("btn-profile-team"))return;
  var p=getUserProfile();
  var btn=document.createElement("button");
  btn.id="btn-profile-team";
  btn.className="btn";
  btn.style.cssText="font-size:0.68rem;color:#4ae8e8;border-color:#4ae8e8";
  btn.textContent=p?("👤 "+p.ownerName+" · "+p.teamCode):"👤 Profil";
  btn.title="Profil och lagkod";
  btn.addEventListener("click",function(){
    var np=ensureUserProfile(true);
    if(np)btn.textContent="👤 "+np.ownerName+" · "+np.teamCode;
    showToast("Profil sparad");
  });
  var firstRow=bar.querySelector("div");
  if(firstRow)firstRow.appendChild(btn);else bar.appendChild(btn);
}


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


function buildState(){return{format:format,homeColor:homeColor,awayColor:awayColor,displayMode:displayMode,players:players.map(function(p){return{id:p.id,team:p.team,number:p.number,name:p.name,x:p.x,y:p.y};}),ball:{x:ball.x,y:ball.y},arrows:arrows.map(function(a){return{id:a.id,x1:a.x1,y1:a.y1,x2:a.x2,y2:a.y2};}),labels:labels.map(function(l){return{id:l.id,x:l.x,y:l.y,text:l.text,size:l.size};})};}


function applyState(s){format=s.format||11;homeColor=s.homeColor||"#e8c84a";awayColor=s.awayColor||"#e84a4a";displayMode=s.displayMode||"number";document.getElementById("fmt-sel").value=String(format);players=(s.players||[]).map(function(p){return{id:p.id,team:p.team,number:p.number,name:p.name||"",x:p.x,y:p.y};});ball=s.ball||{x:W/2,y:H/2};arrows=(s.arrows||[]).map(function(a){return{id:a.id,x1:a.x1,y1:a.y1,x2:a.x2,y2:a.y2};});labels=(s.labels||[]).map(function(l){return{id:l.id,x:l.x,y:l.y,text:l.text,size:l.size||13};});buildFormationBtns();render();}


function updateSaveButtons(){var hasActive=activeFormationId&&activeFormationName;var btn=document.getElementById("btn-save-over");if(btn){btn.style.display=hasActive?"":"none";btn.textContent="\u2665 Spara"+(activeFormationName?" \u201e"+activeFormationName+"\u201c":"");}}


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
document.getElementById("btn-save-over").addEventListener("click",function(){if(!activeFormationId)return;cloudStatus("Sparar...","#7aaa88");fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+activeFormationId,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify(Object.assign({data:buildState()},getUpdateMeta()))}).then(function(r){return r.json();}).then(function(){cloudStatus("\u2705 Sparat: "+activeFormationName,"#4ae87a");showToast("Sparat!");cloudLoadSaves();}).catch(function(err){cloudStatus("\u274c Fel: "+err.message,"#e84a4a");});});
document.getElementById("btn-new-folder").addEventListener("click",function(){document.getElementById("new-folder-inp").value="";document.getElementById("modal-new-folder").classList.remove("hidden");setTimeout(function(){document.getElementById("new-folder-inp").focus();},100);});
document.getElementById("new-folder-cancel").addEventListener("click",function(){document.getElementById("modal-new-folder").classList.add("hidden");});
document.getElementById("new-folder-ok").addEventListener("click",function(){var name=document.getElementById("new-folder-inp").value.trim();if(name){if(pendingFolderTarget==="taktik"){var fullName=pendingFolderParent?pendingFolderParent+"/"+name:name;if(taktikFolders.indexOf(fullName)===-1)taktikFolders.push(fullName);pendingFolderParent=null;renderTaktikList();}else{if(folders.indexOf(name)===-1)folders.push(name);updateFolderSelect();var sel=document.getElementById("folder-select");if(sel)sel.value=name;if(pendingMoveAfterCreate&&movingId){cloudMoveToFolder(movingId,name);movingId=null;pendingMoveAfterCreate=false;}renderSavesList();}}document.getElementById("modal-new-folder").classList.add("hidden");});
document.getElementById("new-folder-inp").addEventListener("keydown",function(e){if(e.key==="Enter")document.getElementById("new-folder-ok").click();});


function cloudSaveWithName(name){cloudStatus("Sparar...","#7aaa88");var folderSel=document.getElementById("folder-select");var folder=folderSel?folderSel.value:"Allm\u00e4nt";var body=JSON.stringify(Object.assign({name:name,data:buildState(),type:"uppstallning",folder:folder},getSaveMeta()));fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{method:"POST",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:body}).then(function(r){return r.text();}).then(function(text){try{var data=JSON.parse(text);if(Array.isArray(data)&&data[0]&&data[0].id){cloudStatus("\u2705 Sparat: "+name,"#4ae87a");showToast("Sparat!");cloudLoadSaves();}else cloudStatus("\u274c Fel: "+text.substring(0,80),"#e84a4a");}catch(e){cloudStatus("\u274c Parse-fel: "+e.message,"#e84a4a");}}).catch(function(err){cloudStatus("\u274c Fel: "+err.message,"#e84a4a");}); }


function cloudLoadSaves(){cloudStatus("Laddar...","#7aaa88");fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.uppstallning&order=folder.asc,id.desc",{headers:supaHeaders()}).then(function(r){return r.json();}).then(function(data){if(Array.isArray(data)){savedFormations=data.filter(function(row){return row.type==="uppstallning";}).map(function(row){return{id:row.id,name:row.name,state:row.data,folder:row.folder||"Allm\u00e4nt"};});var seen={};folders=["Allm\u00e4nt"];for(var i=0;i<savedFormations.length;i++){var f=savedFormations[i].folder;if(f&&!seen[f]){seen[f]=true;if(f!=="Allm\u00e4nt")folders.push(f);}}cloudStatus(data.length+" uppst\u00e4llningar \u2705","#4ae87a");showToast(data.length+" uppst\u00e4llningar laddade");renderSavesList();updateFolderSelect();}else cloudStatus("\u274c Fel","#e84a4a");}).catch(function(err){cloudStatus("\u274c Fel: "+err.message,"#e84a4a");}); }


function cloudDelete(id){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+id,{method:"DELETE",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"})}).then(function(){cloudLoadSaves();showToast("Raderat!");}).catch(function(err){cloudStatus("\u274c Raderingsfel: "+err.message,"#e84a4a");});}


function cloudSaveTaktik(tk){
  if(!tk)return;
  if(!tk.steps||tk.steps.length<2){
    showToast("Lägg till minst ett steg innan du sparar filmen",false);
    cloudStatus("⚠️ Minst ett steg krävs för att spara taktikfilm","#e8c84a");
    return;
  }
  if(!tk.folder)tk.folder="Taktik";
  delete tk._isDraft;
  function patchExisting(id){
    tk.dbId=id;
    return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+id,{
      method:"PATCH",
      headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
      body:JSON.stringify({name:tk.name,data:tk,type:"taktikfilm",folder:tk.folder})
    }).then(function(r){return r.json();}).then(function(){
      cloudStatus("✅ Film uppdaterad: "+tk.name,"#4ae87a");
      showToast("Film sparad!");
      setTimeout(function(){cloudLoadTaktik();},500);
    });
  }
  if(tk.dbId){
    patchExisting(tk.dbId).catch(function(err){cloudStatus("❌ Fel: "+err.message,"#e84a4a");});
    return;
  }
  // Skydd mot dubbla poster: om en film med samma namn redan finns i molnet, uppdatera den istället för att POST:a en ny.
  var safeName=String(tk.name||"").replace(/"/g,'\\"');
  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.taktikfilm&name=eq."+encodeURIComponent(tk.name)+"&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(existing){
      if(Array.isArray(existing)&&existing[0]&&existing[0].id){return patchExisting(existing[0].id);}
      var body=JSON.stringify(Object.assign({name:tk.name,data:tk,type:"taktikfilm",folder:tk.folder},getSaveMeta()));
      return fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{
        method:"POST",
        headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),
        body:body
      }).then(function(r){return r.json();}).then(function(data){
        if(data&&data[0]&&data[0].id){
          tk.dbId=data[0].id;
          cloudStatus("✅ Film sparad: "+tk.name,"#4ae87a");
          showToast("Film sparad!");
          setTimeout(function(){cloudLoadTaktik();},500);
        }else cloudStatus("❌ Fel","#e84a4a");
      });
    })
    .catch(function(err){cloudStatus("❌ Anslutningsfel: "+err.message,"#e84a4a");});
}

function cloudLoadTaktik(){
  fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.taktikfilm&order=id.desc",{headers:supaHeaders()})
    .then(function(r){return r.json();})
    .then(function(data){
      if(Array.isArray(data)){
        var byName={};
        data.filter(function(row){return row.type==="taktikfilm";}).forEach(function(row){
          var tk=row.data||{};
          if(!tk.steps||tk.steps.length<2)return; // dölj gamla tomma/start-only dubbletter
          tk.dbId=row.id;
          if(!tk.folder)tk.folder=row.folder||"Taktik";
          var key=(row.name||tk.name||"").trim().toLowerCase();
          if(!key)key="id:"+row.id;
          // order=id.desc gör att första posten oftast är nyast. Behåll den.
          if(!byName[key])byName[key]=tk;
        });
        taktikFilmer=Object.keys(byName).map(function(k){return byName[k];});
        var tfseen={};taktikFolders=["Taktik","Träning"];tfseen["Taktik"]=true;tfseen["Träning"]=true;
        taktikFilmer.forEach(function(tk){if(tk.folder&&!tfseen[tk.folder]){tfseen[tk.folder]=true;taktikFolders.push(tk.folder);}});
        renderTaktikList();
        cloudStatus(taktikFilmer.length+" taktikfilmer laddade","#4ae87a");
        showToast(taktikFilmer.length+" filmer laddade");
      }
    }).catch(function(){});
}

function saveTrupp(){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.trupp",{headers:supaHeaders()}).then(function(r){return r.json();}).then(function(data){if(data&&data[0]){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?id=eq."+data[0].id,{method:"PATCH",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify({data:{trupp:trupp}})});}else{fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE,{method:"POST",headers:Object.assign({},supaHeaders(),{"Prefer":"return=representation"}),body:JSON.stringify(Object.assign({name:"trupp",data:{trupp:trupp},type:"trupp",folder:"Allm\u00e4nt"},getSaveMeta()))});} });}


function loadTrupp(){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.trupp",{headers:supaHeaders()}).then(function(r){return r.json();}).then(function(data){if(data&&data[0]&&data[0].data&&data[0].data.trupp)trupp=data[0].data.trupp;renderTruppList();}).catch(function(){});}


function loadMatcher(){fetch(SUPA_URL+"/rest/v1/"+SUPA_TABLE+"?type=eq.match&order=updatedAt.desc",{headers:supaHeaders()}).then(function(r){return r.json();}).then(function(data){if(data&&Array.isArray(data)){var seen={};matcher=[];data.forEach(function(row){var m=row.data||{};m.dbId=row.id;var hasPlayers=(m.startade&&m.startade.length)||(m.avbytare&&m.avbytare.length);var hasLineups=(m.uppstallningar&&m.uppstallningar.length);if(!m.datum||!m.motstand||(!hasPlayers&&!hasLineups))return;var key=String(row.id);if(!seen[key]){seen[key]=true;matcher.push(m);}});}if(typeof renderStatistik==="function")renderStatistik();if(typeof renderSparadeMatcherList==="function")renderSparadeMatcherList();}).catch(function(){});}


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
