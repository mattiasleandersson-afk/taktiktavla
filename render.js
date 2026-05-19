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

function drawingObjectPointerEvents(){
  return mode === "move" ? "auto" : "none";
}
function applyDrawingObjectHitMode(el){
  if(el)el.style.pointerEvents = drawingObjectPointerEvents();
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
  for(var i=0;i<zones.length;i++){(function(z){var g=document.createElementNS(ns2,"g");g.setAttribute("class","zone-g");applyDrawingObjectHitMode(g);var shape;if(z.type==="circle"){shape=document.createElementNS(ns2,"ellipse");shape.setAttribute("cx",z.x);shape.setAttribute("cy",z.y);shape.setAttribute("rx",z.r||50);shape.setAttribute("ry",z.r||50);}else{shape=document.createElementNS(ns2,"rect");shape.setAttribute("x",z.x);shape.setAttribute("y",z.y);shape.setAttribute("width",z.w||80);shape.setAttribute("height",z.h||80);shape.setAttribute("rx","4");}shape.setAttribute("fill",z.color||"rgba(232,76,76,0.25)");shape.setAttribute("stroke",z.color.replace(/,[0-9.]+\)/,",0.8)").replace("rgba","rgba"));shape.setAttribute("stroke-width","1.5");var hit=document.createElementNS(ns2,"rect");if(z.type==="circle"){hit.setAttribute("x",z.x-(z.r||50));hit.setAttribute("y",z.y-(z.r||50));hit.setAttribute("width",(z.r||50)*2);hit.setAttribute("height",(z.r||50)*2);}else{hit.setAttribute("x",z.x);hit.setAttribute("y",z.y);hit.setAttribute("width",z.w||80);hit.setAttribute("height",z.h||80);}hit.setAttribute("class","zone-hit");g.appendChild(shape);g.appendChild(hit);svg.appendChild(g);function selZone(ev){ev.stopPropagation();selectedId=z.id;render();}hit.addEventListener("touchstart",function(ev){ev.preventDefault();selZone(ev);},{passive:false});hit.addEventListener("mousedown",selZone);if(selectedId===z.id){var cx2=z.type==="circle"?z.x:z.x+(z.w||80)/2;var cy2=z.type==="circle"?z.y-(z.r||50)-6:z.y-6;var dg=document.createElementNS(ns2,"g");dg.setAttribute("class","del-g");dg.style.cursor="pointer";var dc=document.createElementNS(ns2,"circle");dc.setAttribute("class","del-circ");dc.setAttribute("cx",cx2);dc.setAttribute("cy",cy2);dc.setAttribute("r",9);var dt=document.createElementNS(ns2,"text");dt.setAttribute("class","del-txt");dt.setAttribute("x",cx2);dt.setAttribute("y",cy2);dt.textContent="\u00d7";dg.appendChild(dc);dg.appendChild(dt);g.appendChild(dg);function delZone(ev){ev.stopPropagation();ev.preventDefault();saveUndo();zones=zones.filter(function(x){return x.id!==z.id;});selectedId=null;render();}dg.addEventListener("touchstart",delZone,{passive:false});dg.addEventListener("mousedown",delZone);}})(zones[i]);}
  for(var i=0;i<freehandPaths.length;i++){(function(fp){if(!fp.pts||fp.pts.length<2)return;var g=document.createElementNS(ns2,"g");g.setAttribute("class","freehand-g");applyDrawingObjectHitMode(g);var d="M"+fp.pts[0].x+","+fp.pts[0].y;for(var pi=1;pi<fp.pts.length;pi++)d+=" L"+fp.pts[pi].x+","+fp.pts[pi].y;var path=document.createElementNS(ns2,"path");path.setAttribute("class","freehand-path");path.setAttribute("d",d);path.setAttribute("stroke",fp.color||"#ffdd44");path.setAttribute("stroke-width",fp.width||4);var hit=document.createElementNS(ns2,"path");hit.setAttribute("class","freehand-hit");hit.setAttribute("d",d);hit.setAttribute("stroke-width","24");hit.setAttribute("stroke-linecap","round");g.appendChild(path);g.appendChild(hit);svg.appendChild(g);function selFP(ev){ev.stopPropagation();selectedId=fp.id;render();}hit.addEventListener("touchstart",function(ev){ev.preventDefault();selFP(ev);},{passive:false});hit.addEventListener("mousedown",selFP);if(selectedId===fp.id){var mx=fp.pts[Math.floor(fp.pts.length/2)].x;var my=fp.pts[Math.floor(fp.pts.length/2)].y;var dg=document.createElementNS(ns2,"g");dg.setAttribute("class","del-g");dg.style.cursor="pointer";var dc=document.createElementNS(ns2,"circle");dc.setAttribute("class","del-circ");dc.setAttribute("cx",mx);dc.setAttribute("cy",my-12);dc.setAttribute("r",9);var dt=document.createElementNS(ns2,"text");dt.setAttribute("class","del-txt");dt.setAttribute("x",mx);dt.setAttribute("y",my-12);dt.textContent="\u00d7";dg.appendChild(dc);dg.appendChild(dt);g.appendChild(dg);function delFP(ev){_delHappened=true;ev.stopPropagation();ev.preventDefault();saveUndo();freehandPaths=freehandPaths.filter(function(x){return x.id!==fp.id;});selectedId=null;render();}dg.addEventListener("touchstart",delFP,{passive:false});dg.addEventListener("mousedown",delFP);}})(freehandPaths[i]);}
  for(var i=0;i<arrows.length;i++){(function(a){var g=document.createElementNS(ns,"g");g.setAttribute("class","arrow-g");applyDrawingObjectHitMode(g);var vis=document.createElementNS(ns,"line");vis.setAttribute("class","arrow-vis");vis.setAttribute("x1",a.x1);vis.setAttribute("y1",a.y1);vis.setAttribute("x2",a.x2);vis.setAttribute("y2",a.y2);var ac=a.color||"#ffdd44";vis.setAttribute("marker-end","url(#arrowhead-"+ac.replace("#","")+")");vis.style.stroke=ac;vis.style.strokeWidth=a.width||3;if((a.atype||"solid")==="dashed"){vis.style.strokeDasharray=(a.width||3)*3+" "+(a.width||3)*2;}else{vis.style.strokeDasharray="none";}var hit=document.createElementNS(ns,"line");hit.setAttribute("class","arrow-hit");hit.setAttribute("x1",a.x1);hit.setAttribute("y1",a.y1);hit.setAttribute("x2",a.x2);hit.setAttribute("y2",a.y2);g.appendChild(vis);g.appendChild(hit);if(showArrowNumbers){var mx=(a.x1+a.x2)/2,my=(a.y1+a.y2)/2;var ac2=a.color||"#ffdd44";var nbg=document.createElementNS(ns,"circle");nbg.setAttribute("cx",mx);nbg.setAttribute("cy",my);nbg.setAttribute("r",9);nbg.setAttribute("fill","#111a14");nbg.setAttribute("stroke",ac2);nbg.setAttribute("stroke-width","1.5");var ntxt=document.createElementNS(ns,"text");ntxt.setAttribute("x",mx);ntxt.setAttribute("y",my);ntxt.setAttribute("text-anchor","middle");ntxt.setAttribute("dominant-baseline","central");ntxt.setAttribute("fill",ac2);ntxt.setAttribute("font-size","10");ntxt.setAttribute("font-weight","700");ntxt.setAttribute("font-family","Arial Narrow,Arial,sans-serif");ntxt.textContent=String(i+1);g.appendChild(nbg);g.appendChild(ntxt);}svg.appendChild(g);function selectArrow(ev){ev.stopPropagation();selectedId=a.id;render();}hit.addEventListener("touchstart",function(ev){ev.preventDefault();selectArrow(ev);},{passive:false});hit.addEventListener("mousedown",selectArrow);if(selectedId===a.id){var mx=(a.x1+a.x2)/2,my=(a.y1+a.y2)/2;var dg=document.createElementNS(ns,"g");dg.setAttribute("class","del-g");dg.style.cursor="pointer";var dc=document.createElementNS(ns,"circle");dc.setAttribute("class","del-circ");dc.setAttribute("cx",mx);dc.setAttribute("cy",my);dc.setAttribute("r",11);var dt=document.createElementNS(ns,"text");dt.setAttribute("class","del-txt");dt.setAttribute("x",mx);dt.setAttribute("y",my);dt.textContent="\u00d7";dg.appendChild(dc);dg.appendChild(dt);g.appendChild(dg);function delArrow(ev){_delHappened=true;ev.stopPropagation();ev.preventDefault();saveUndo();arrows=arrows.filter(function(x){return x.id!==a.id;});selectedId=null;render();}dg.addEventListener("touchstart",delArrow,{passive:false});dg.addEventListener("mousedown",delArrow);}})(arrows[i]);}
  if(mode==="arrow"&&arrowStart&&arrowCurrent){var pg=document.createElementNS(ns,"line");pg.setAttribute("class","preview-arrow");pg.setAttribute("x1",arrowStart.x);pg.setAttribute("y1",arrowStart.y);pg.setAttribute("x2",arrowCurrent.x);pg.setAttribute("y2",arrowCurrent.y);pg.setAttribute("stroke-width","3");pg.setAttribute("stroke-dasharray","6 4");pg.setAttribute("stroke-linecap","round");pg.setAttribute("fill","none");pg.setAttribute("marker-end","url(#arrowhead-"+(arrowColor||"#ffdd44").replace("#","")+")");pg.setAttribute("stroke",arrowColor||"#ffdd44");pg.style.pointerEvents="none";svg.appendChild(pg);}
  for(var i=0;i<labels.length;i++){(function(l){var fs=l.size||13,tw=l.text.length*(fs*0.55)+12,th=fs+10;var g=document.createElementNS(ns,"g");g.setAttribute("class","label-g pitch-label");applyDrawingObjectHitMode(g);g.dataset.lid=l.id;var bg=document.createElementNS(ns,"rect");bg.setAttribute("class","pitch-label-bg");bg.setAttribute("rx","4");bg.setAttribute("x",l.x-tw/2);bg.setAttribute("y",l.y-th/2);bg.setAttribute("width",tw);bg.setAttribute("height",th);var tx=document.createElementNS(ns,"text");tx.setAttribute("class","pitch-label-txt");tx.setAttribute("x",l.x);tx.setAttribute("y",l.y);tx.setAttribute("font-size",fs);tx.textContent=l.text;g.appendChild(bg);g.appendChild(tx);svg.appendChild(g);if(selectedId===l.id){var dg=document.createElementNS(ns,"g");dg.setAttribute("class","del-g");dg.style.cursor="pointer";var dc=document.createElementNS(ns,"circle");dc.setAttribute("class","del-circ");dc.setAttribute("cx",l.x+tw/2-2);dc.setAttribute("cy",l.y-th/2-2);dc.setAttribute("r",9);var dt=document.createElementNS(ns,"text");dt.setAttribute("class","del-txt");dt.setAttribute("x",l.x+tw/2-2);dt.setAttribute("y",l.y-th/2-2);dt.textContent="\u00d7";dg.appendChild(dc);dg.appendChild(dt);g.appendChild(dg);function delLabel(ev){_delHappened=true;ev.stopPropagation();ev.preventDefault();saveUndo();labels=labels.filter(function(x){return x.id!==l.id;});selectedId=null;render();}dg.addEventListener("touchstart",delLabel,{passive:false});dg.addEventListener("mousedown",delLabel);}function startLabelDrag(cx,cy){if(mode!=="move")return;dragging={type:"label",id:l.id,ox:l.x-cx,oy:l.y-cy};}g.addEventListener("touchstart",function(ev){ev.stopPropagation();var pt=svgPt(ev.touches[0].clientX,ev.touches[0].clientY);var _dragMoved=false;selectedId=l.id;startLabelDrag(pt.x,pt.y);function _onTM2(ev2){ev2.preventDefault();_dragMoved=true;onTM(ev2);}function _onTE2(){window.removeEventListener("touchmove",_onTM2);window.removeEventListener("touchend",_onTE2);if(!_dragMoved){setTimeout(function(){if(selectedId===l.id){openEditLabel(l);selectedId=null;render();}},80);}else{dragging=null;render();}}window.addEventListener("touchmove",_onTM2,{passive:false});window.addEventListener("touchend",_onTE2);},{passive:false});g.addEventListener("mousedown",function(ev){ev.stopPropagation();var pt=svgPt(ev.clientX,ev.clientY);var _dragMoved=false;selectedId=l.id;startLabelDrag(pt.x,pt.y);function _onMM2(ev2){_dragMoved=true;onMM(ev2);}function _onMU2(){window.removeEventListener("mousemove",_onMM2);window.removeEventListener("mouseup",_onMU2);if(!_dragMoved){setTimeout(function(){if(selectedId===l.id){openEditLabel(l);selectedId=null;render();}},80);}else{dragging=null;render();}}window.addEventListener("mousemove",_onMM2);window.addEventListener("mouseup",_onMU2);});})(labels[i]);}
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
